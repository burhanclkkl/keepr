from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from urllib.parse import urlparse
from app.database import db
from app.models.keep import Keep
from app.models.category import Category
from app.utils.auth_helpers import token_required, check_pro_access
from app.utils.metadata_extractor import extract_metadata
from app.utils.audit import log_audit

keeps_bp = Blueprint('keeps', __name__)

@keeps_bp.route('', methods=['GET'])
@token_required
def get_keeps(current_user):
    """Retrieve all keeps for the authenticated user (including shared categories), supporting search and category filters."""
    category_id_raw = request.args.get('category_id')
    search_query = request.args.get('search', type=str)
    
    from app.models.category_collaborator import CategoryCollaborator
    shared_collabs = CategoryCollaborator.query.filter_by(user_id=current_user.id).all()
    shared_category_ids = [c.category_id for c in shared_collabs]
    
    if shared_category_ids:
        query = db.select(Keep).filter(
            or_(
                Keep.user_id == current_user.id,
                Keep.category_id.in_(shared_category_ids)
            )
        )
    else:
        query = db.select(Keep).filter_by(user_id=current_user.id)
    
    if category_id_raw == 'favorites':
        query = query.filter(Keep.is_favorite == True)
    elif category_id_raw is not None and category_id_raw != '':
        try:
            category_id = int(category_id_raw)
            query = query.filter(Keep.category_id == category_id)
        except ValueError:
            if category_id_raw == 'null' or category_id_raw == 'None':
                query = query.filter(Keep.category_id == None)
        
    if search_query:
        search_pattern = f"%{search_query}%"
        query = query.filter(
            or_(
                Keep.title.ilike(search_pattern),
                Keep.description.ilike(search_pattern),
                Keep.url.ilike(search_pattern)
            )
        )
        
    query = query.order_by(Keep.is_pinned.desc(), Keep.created_at.desc())
    
    keeps = db.session.execute(query).scalars().all()
    return jsonify([k.to_dict() for k in keeps]), 200

@keeps_bp.route('', methods=['POST'])
@token_required
def create_keep(current_user):
    """Create a new keep/bookmark, scraping its URL metadata if details are not provided manually."""
    data = request.get_json() or {}
    url = data.get('url')
    category_id = data.get('category_id')
    custom_title = data.get('title')
    custom_desc = data.get('description')
    
    if not url:
        return jsonify({'error': 'Bağlantı (url) alanı zorunludur.'}), 400
        
    # Standardize HTTP prefix
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
        
    # Validate URL structure
    try:
        parsed_url = urlparse(url)
        if not parsed_url.netloc or '.' not in parsed_url.netloc:
            return jsonify({'error': 'Geçersiz URL formatı.'}), 400
    except Exception:
        return jsonify({'error': 'Geçersiz URL formatı.'}), 400
        
    # Validate category if supplied
    if category_id:
        category = db.session.get(Category, category_id)
        if not category:
            return jsonify({'error': 'Geçersiz kategori.'}), 400
            
        is_owner = (category.user_id == current_user.id)
        from app.models.category_collaborator import CategoryCollaborator
        collab = CategoryCollaborator.query.filter_by(category_id=category_id, user_id=current_user.id).first()
        is_editor = (collab is not None and collab.role == 'editor')
        
        if not is_owner and not is_editor:
            if collab and collab.role == 'viewer':
                return jsonify({'error': 'Bu klasörde salt okunur (viewer) yetkiniz var. Bağlantı ekleyemezsiniz.'}), 403
            return jsonify({'error': 'Geçersiz kategori veya bu işlem için yetkiniz yok.'}), 400
            
    # Set/fetch metadata
    title = custom_title
    description = custom_desc
    
    # Scrape metadata if any crucial field is empty
    if not title or not description:
        extracted = extract_metadata(url)
        if not title:
            title = extracted.get('title') or url
        if not description:
            description = extracted.get('description')
            
    import re as _re
    _word_count = len(_re.findall(r'\w+', description or ''))
    _reading_time = max(1, round(_word_count / 200)) if description else None
    
    try:
        keep = Keep(
            url=url,
            title=title,
            description=description,
            category_id=category_id,
            user_id=current_user.id,
            reading_time_minutes=_reading_time
        )
        db.session.add(keep)
        db.session.commit()
        return jsonify(keep.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Bağlantı kaydedilirken hata oluştu: {str(e)}'}), 500

@keeps_bp.route('/<int:keep_id>', methods=['PUT'])
@token_required
def update_keep(current_user, keep_id):
    """Update an existing keep's title, description, image, or category."""
    keep = db.session.get(Keep, keep_id)
    if not keep:
        return jsonify({'error': 'Bağlantı bulunamadı.'}), 404
        
    is_owner = (keep.user_id == current_user.id)
    is_editor = False
    collab = None
    if keep.category_id:
        from app.models.category_collaborator import CategoryCollaborator
        collab = CategoryCollaborator.query.filter_by(category_id=keep.category_id, user_id=current_user.id).first()
        is_editor = (collab is not None and collab.role == 'editor')
        
    if not is_owner and not is_editor:
        if collab and collab.role == 'viewer':
            return jsonify({'error': 'Bu klasörde salt okunur (viewer) yetkiniz var. Bağlantıyı güncelleyemezsiniz.'}), 403
        return jsonify({'error': 'Bağlantı bulunamadı veya yetkiniz yok.'}), 404
        
    data = request.get_json() or {}
    title = data.get('title')
    description = data.get('description')
    
    if 'category_id' in data:
        cat_id = data.get('category_id')
        if cat_id is None or cat_id == 0 or cat_id == "":  # Support uncategorizing
            target_cat = None
        else:
            category = db.session.get(Category, cat_id)
            if not category:
                return jsonify({'error': 'Geçersiz kategori.'}), 400
                
            is_target_owner = (category.user_id == current_user.id)
            from app.models.category_collaborator import CategoryCollaborator
            target_collab = CategoryCollaborator.query.filter_by(category_id=cat_id, user_id=current_user.id).first()
            is_target_editor = (target_collab is not None and target_collab.role == 'editor')
            
            if not is_target_owner and not is_target_editor:
                return jsonify({'error': 'Hedef kategoride güncelleme yetkiniz yok.'}), 400
            target_cat = cat_id
            
        if keep.category_id != target_cat:
            log_audit(current_user.id, 'MOVE_CATEGORY', f"Keep ID {keep.id} moved to category {target_cat}")
            keep.category_id = target_cat
            
    if 'is_favorite' in data:
        is_fav = bool(data.get('is_favorite'))
        if keep.is_favorite != is_fav:
            if not check_pro_access(current_user):
                return jsonify({
                    'code': 'PRO_REQUIRED',
                    'feature': 'favorite',
                    'message': 'Favorileme özelliği yalnızca Keepr Pro kullanıcılarına özeldir.'
                }), 403
            log_audit(current_user.id, 'TOGGLE_FAVORITE', f"Keep ID {keep.id} favorite status set to {is_fav}")
            keep.is_favorite = is_fav
            
    if 'is_pinned' in data:
        is_pin = bool(data.get('is_pinned'))
        if keep.is_pinned != is_pin:
            if not check_pro_access(current_user):
                return jsonify({
                    'code': 'PRO_REQUIRED',
                    'feature': 'pin',
                    'message': 'Sabitleme özelliği yalnızca Keepr Pro kullanıcılarına özeldir.'
                }), 403
            log_audit(current_user.id, 'TOGGLE_PIN', f"Keep ID {keep.id} pin status set to {is_pin}")
            keep.is_pinned = is_pin
            
    if title is not None and keep.title != title:
        log_audit(current_user.id, 'UPDATE_KEEP_TITLE', f"Keep ID {keep.id} title changed")
        keep.title = title
    if description is not None and keep.description != description:
        log_audit(current_user.id, 'UPDATE_KEEP_DESCRIPTION', f"Keep ID {keep.id} description changed")
        keep.description = description
        
    try:
        db.session.commit()
        return jsonify(keep.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Bağlantı güncellenirken hata oluştu: {str(e)}'}), 500

@keeps_bp.route('/<int:keep_id>', methods=['DELETE'])
@token_required
def delete_keep(current_user, keep_id):
    """Delete a keep/bookmark."""
    keep = db.session.get(Keep, keep_id)
    if not keep:
        return jsonify({'error': 'Bağlantı bulunamadı.'}), 404
        
    is_owner = (keep.user_id == current_user.id)
    is_editor = False
    collab = None
    if keep.category_id:
        from app.models.category_collaborator import CategoryCollaborator
        collab = CategoryCollaborator.query.filter_by(category_id=keep.category_id, user_id=current_user.id).first()
        is_editor = (collab is not None and collab.role == 'editor')
        
    if not is_owner and not is_editor:
        if collab and collab.role == 'viewer':
            return jsonify({'error': 'Bu klasörde salt okunur (viewer) yetkiniz var. Bağlantıyı silemezsiniz.'}), 403
        return jsonify({'error': 'Bağlantı bulunamadı veya yetkiniz yok.'}), 404
        
    try:
        title = keep.title or keep.url
        db.session.delete(keep)
        db.session.commit()
        log_audit(current_user.id, 'DELETE_KEEP', f"Keep deleted: {title}")
        return jsonify({'message': 'Bağlantı başarıyla silindi.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Bağlantı silinirken hata oluştu: {str(e)}'}), 500

@keeps_bp.route('/bulk-delete', methods=['POST'])
@token_required
def bulk_delete_keeps(current_user):
    """Delete multiple keeps in a single transaction."""
    data = request.get_json() or {}
    keep_ids = data.get('ids', [])
    if not keep_ids:
        return jsonify({'error': 'Silinecek bağlantı kimlikleri belirtilmedi.'}), 400
        
    try:
        db.session.execute(
            db.delete(Keep).where(Keep.id.in_(keep_ids), Keep.user_id == current_user.id)
        )
        db.session.commit()
        log_audit(current_user.id, 'BULK_DELETE_KEEPS', f"{len(keep_ids)} keeps deleted")
        return jsonify({'message': f'{len(keep_ids)} bağlantı başarıyla silindi.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Toplu silme işlemi sırasında hata oluştu: {str(e)}'}), 500

@keeps_bp.route('/bulk-favorite', methods=['POST'])
@token_required
def bulk_favorite_keeps(current_user):
    """Favorite/unfavorite multiple keeps in a single transaction."""
    if not check_pro_access(current_user):
        return jsonify({
            'code': 'PRO_REQUIRED',
            'feature': 'favorite',
            'message': 'Toplu favorileme özelliği yalnızca Keepr Pro kullanıcılarına özeldir.'
        }), 403
        
    data = request.get_json() or {}
    keep_ids = data.get('ids', [])
    is_fav = bool(data.get('is_favorite', True))
    if not keep_ids:
        return jsonify({'error': 'Bağlantı kimlikleri belirtilmedi.'}), 400
        
    try:
        db.session.execute(
            db.update(Keep).where(Keep.id.in_(keep_ids), Keep.user_id == current_user.id).values(is_favorite=is_fav)
        )
        db.session.commit()
        
        action = 'BULK_ADD_FAVORITE' if is_fav else 'BULK_REMOVE_FAVORITE'
        log_audit(current_user.id, action, f"{len(keep_ids)} keeps favorite status set to {is_fav}")
        
        return jsonify({'message': f'{len(keep_ids)} bağlantının favori durumu güncellendi.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'İşlem sırasında hata oluştu: {str(e)}'}), 500

@keeps_bp.route('/bulk-pin', methods=['POST'])
@token_required
def bulk_pin_keeps(current_user):
    """Pin/unpin multiple keeps in a single transaction."""
    if not check_pro_access(current_user):
        return jsonify({
            'code': 'PRO_REQUIRED',
            'feature': 'pin',
            'message': 'Toplu sabitleme özelliği yalnızca Keepr Pro kullanıcılarına özeldir.'
        }), 403
        
    data = request.get_json() or {}
    keep_ids = data.get('ids', [])
    is_pin = bool(data.get('is_pinned', True))
    if not keep_ids:
        return jsonify({'error': 'Bağlantı kimlikleri belirtilmedi.'}), 400
        
    try:
        db.session.execute(
            db.update(Keep).where(Keep.id.in_(keep_ids), Keep.user_id == current_user.id).values(is_pinned=is_pin)
        )
        db.session.commit()
        
        action = 'BULK_ADD_PIN' if is_pin else 'BULK_REMOVE_PIN'
        log_audit(current_user.id, action, f"{len(keep_ids)} keeps pin status set to {is_pin}")
        
        return jsonify({'message': f'{len(keep_ids)} bağlantının sabitleme durumu güncellendi.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'İşlem sırasında hata oluştu: {str(e)}'}), 500

@keeps_bp.route('/bulk-move', methods=['POST'])
@token_required
def bulk_move_keeps(current_user):
    """Move multiple keeps to a category/folder in a single transaction."""
    data = request.get_json() or {}
    keep_ids = data.get('ids', [])
    category_id = data.get('category_id') # Can be None/null for uncategorizing
    
    if not keep_ids:
        return jsonify({'error': 'Bağlantı kimlikleri belirtilmedi.'}), 400
        
    # Validate category
    if category_id is not None and category_id != 0 and category_id != "":
        category = db.session.get(Category, category_id)
        if not category or category.user_id != current_user.id:
            return jsonify({'error': 'Geçersiz kategori.'}), 400
        cat_id = category_id
    else:
        cat_id = None
        
    try:
        db.session.execute(
            db.update(Keep).where(Keep.id.in_(keep_ids), Keep.user_id == current_user.id).values(category_id=cat_id)
        )
        db.session.commit()
        
        log_audit(current_user.id, 'BULK_MOVE_KEEPS', f"{len(keep_ids)} keeps moved to category {cat_id}")
        
        return jsonify({'message': f'{len(keep_ids)} bağlantı başarıyla taşındı.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'İşlem sırasında hata oluştu: {str(e)}'}), 500

@keeps_bp.route('/<int:keep_id>/reminder', methods=['POST'])
@token_required
def set_keep_reminder(current_user, keep_id):
    """Set or clear a reminder for a keep. Pro/Team only."""
    from app.utils.auth_helpers import check_tier_access
    
    if not check_tier_access(current_user, min_tier='pro'):
        return jsonify({
            'code': 'PRO_REQUIRED',
            'feature': 'reminder',
            'message': 'Alarm kurma özelliği yalnızca Keepr Pro kullanıcılarına özeldir.'
        }), 403
    
    keep = db.session.get(Keep, keep_id)
    if not keep or keep.user_id != current_user.id:
        return jsonify({'error': 'Bağlantı bulunamadı.'}), 404
    
    data = request.get_json() or {}
    reminder_at_str = data.get('reminder_at')
    
    if reminder_at_str is None:
        keep.reminder_at = None
        keep.is_reminder_sent = False
    else:
        from datetime import datetime
        try:
            dt = datetime.fromisoformat(reminder_at_str.replace('Z', '+00:00'))
            keep.reminder_at = dt
            keep.is_reminder_sent = False
        except (ValueError, AttributeError):
            return jsonify({'error': 'Geçersiz tarih formatı. ISO 8601 kullanın.'}), 400
    
    db.session.commit()
    return jsonify({'message': 'Alarm güncellendi.', 'keep': keep.to_dict()}), 200
