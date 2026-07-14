import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from app.database import db
from app.utils.errors import server_error
from app.models.category import Category
from app.models.category_collaborator import CategoryCollaborator
from app.models.invitation import Invitation
from app.models.user import User
from app.utils.auth_helpers import token_required, check_tier_access
from app.routes.auth import log_audit  # In case we need audit logging

collaborations_bp = Blueprint('collaborations', __name__)

@collaborations_bp.route('/invite', methods=['POST'])
@token_required
def create_invitation(current_user):
    """Create a collaboration invitation link. Team subscribers only."""
    if not check_tier_access(current_user, min_tier='team'):
        return jsonify({
            'code': 'TEAM_REQUIRED',
            'feature': 'collaborative_sharing',
            'message': 'Ortak çalışma davetiyesi oluşturabilmek için en az Keepr Team abonesi olmalısınız.'
        }), 403
        
    data = request.get_json() or {}
    category_id = data.get('category_id')
    role = data.get('role', 'viewer')
    
    if role not in ('viewer', 'editor'):
        role = 'viewer'
        
    if not category_id:
        return jsonify({'error': 'Kategori ID parametresi zorunludur.'}), 400
        
    category = db.session.get(Category, category_id)
    if not category or category.user_id != current_user.id:
        return jsonify({'error': 'Kategori bulunamadı veya bu işlem için yetkiniz yok.'}), 404
        
    # Prevent creating invitations for subfolders - only root folders can be shared/collaborated on
    if category.parent_id is not None:
        return jsonify({'error': 'Alt klasörler için doğrudan ortak daveti oluşturulamaz. Lütfen üst klasör için davet oluşturun.'}), 400

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=48)
    
    try:
        invitation = Invitation(
            category_id=category_id,
            inviter_id=current_user.id,
            token=token,
            role=role,
            expires_at=expires_at
        )
        db.session.add(invitation)
        db.session.commit()
        
        # Safe log_audit call
        try:
            log_audit(current_user.id, 'create_invitation', details=f"Created {role} invite for category {category.name}")
        except Exception:
            pass
            
        return jsonify(invitation.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return server_error('Davet linki oluşturulamadı.')

@collaborations_bp.route('/invite/<string:token>', methods=['GET'])
def get_invitation_details(token):
    """Get invitation details before accepting. Public endpoint."""
    invitation = Invitation.query.filter_by(token=token).first()
    if not invitation:
        return jsonify({'error': 'Davet bulunamadı.'}), 404
        
    if invitation.is_used or invitation.is_expired():
        return jsonify({
            'code': 'INVITATION_EXPIRED',
            'error': 'Bu davetiyenin geçerlilik süresi dolmuş veya zaten kullanılmış.'
        }), 410
        
    return jsonify(invitation.to_dict()), 200

@collaborations_bp.route('/invite/<string:token>/accept', methods=['POST'])
@token_required
def accept_invitation(current_user, token):
    """Accept invitation and become a collaborator of the category."""
    invitation = Invitation.query.filter_by(token=token).first()
    if not invitation:
        return jsonify({'error': 'Davet bulunamadı.'}), 404
        
    if invitation.is_used or invitation.is_expired():
        return jsonify({
            'code': 'INVITATION_EXPIRED',
            'error': 'Bu davetiyenin geçerlilik süresi dolmuş veya zaten kullanılmış.'
        }), 410
        
    # Cannot accept own invitation
    if invitation.inviter_id == current_user.id:
        return jsonify({'error': 'Kendi oluşturduğunuz daveti kabul edemezsiniz.'}), 400
        
    # Check if category owner
    category = db.session.get(Category, invitation.category_id)
    if not category or category.user_id == current_user.id:
        return jsonify({'error': 'Bu kategorinin zaten sahibisiniz.'}), 400
        
    # Check if already a collaborator
    existing = CategoryCollaborator.query.filter_by(
        category_id=invitation.category_id,
        user_id=current_user.id
    ).first()
    if existing:
        return jsonify({'error': 'Bu klasöre zaten katılmışsınız.'}), 400
        
    try:
        collaborator = CategoryCollaborator(
            category_id=invitation.category_id,
            user_id=current_user.id,
            role=invitation.role
        )
        invitation.is_used = True
        
        db.session.add(collaborator)
        db.session.commit()
        
        try:
            log_audit(current_user.id, 'accept_invitation', details=f"Joined category {category.name} as {invitation.role}")
        except Exception:
            pass
            
        return jsonify({
            'message': 'Davet başarıyla kabul edildi. Klasöre katıldınız.',
            'collaborator': collaborator.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return server_error('Davet kabul edilirken hata oluştu.')

@collaborations_bp.route('/collaborators/category/<int:category_id>', methods=['GET'])
@token_required
def get_category_collaborators(current_user, category_id):
    """List all collaborators for a category. User must be owner or collaborator."""
    category = db.session.get(Category, category_id)
    if not category:
        return jsonify({'error': 'Kategori bulunamadı.'}), 404
        
    # Check authorization
    is_owner = (category.user_id == current_user.id)
    is_collaborator = CategoryCollaborator.query.filter_by(
        category_id=category_id,
        user_id=current_user.id
    ).first() is not None
    
    if not is_owner and not is_collaborator:
        return jsonify({'error': 'Bu klasörün üyelerini görme yetkiniz yok.'}), 403
        
    collaborators = CategoryCollaborator.query.filter_by(category_id=category_id).all()
    return jsonify([c.to_dict() for c in collaborators]), 200

@collaborations_bp.route('/collaborators/<int:collaborator_id>', methods=['DELETE'])
@token_required
def remove_collaborator(current_user, collaborator_id):
    """Remove a collaborator from a category. Owner can remove anyone, collaborator can remove self."""
    collaborator = db.session.get(CategoryCollaborator, collaborator_id)
    if not collaborator:
        return jsonify({'error': 'Üye bulunamadı.'}), 404
        
    category = db.session.get(Category, collaborator.category_id)
    if not category:
        return jsonify({'error': 'Kategori bulunamadı.'}), 404
        
    is_owner = (category.user_id == current_user.id)
    is_self = (collaborator.user_id == current_user.id)
    
    if not is_owner and not is_self:
        return jsonify({'error': 'Bu üyeyi klasörden çıkarmak için yetkiniz yok.'}), 403
        
    try:
        db.session.delete(collaborator)
        db.session.commit()
        
        try:
            log_audit(current_user.id, 'remove_collaborator', details=f"Removed user {collaborator.user_id} from category {category.name}")
        except Exception:
            pass
            
        return jsonify({'message': 'Üye başarıyla çıkarıldı.'}), 200
    except Exception as e:
        db.session.rollback()
        return server_error('Üye çıkarılırken hata oluştu.')
