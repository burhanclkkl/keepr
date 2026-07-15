from flask import Blueprint, request, jsonify
from app.database import db
from app.utils.errors import server_error
from app.models.category import Category
from app.utils.auth_helpers import token_required

categories_bp = Blueprint('categories', __name__)

def check_category_editor_permission(category, user_id):
    # If the user is the owner of the category
    if category.user_id == user_id:
        return True
        
    # If the category is a subfolder, check permission on the parent
    if category.parent_id is not None:
        parent = db.session.get(Category, category.parent_id)
        if parent:
            return check_category_editor_permission(parent, user_id)
        return False
        
    # If the category is a root folder, check collaborator role
    from app.models.category_collaborator import CategoryCollaborator
    collab = CategoryCollaborator.query.filter_by(category_id=category.id, user_id=user_id).first()
    if collab and collab.role == 'editor':
        return True
        
    return False

@categories_bp.route('', methods=['GET'])
@token_required
def get_categories(current_user):
    """Retrieve all categories belonging to or shared with the authenticated user."""
    # 1. Owned categories
    owned_categories = db.session.execute(
        db.select(Category).filter_by(user_id=current_user.id).order_by(Category.created_at.asc())
    ).scalars().all()
    
    # 2. Shared categories (collaborations)
    from app.models.category_collaborator import CategoryCollaborator
    collaborations = CategoryCollaborator.query.filter_by(user_id=current_user.id).all()
    
    shared_category_ids = [collab.category_id for collab in collaborations if collab.category_rel]
    collab_role_map = {collab.category_id: collab.role for collab in collaborations if collab.category_rel}
    
    # Also find subcategories of shared categories
    shared_subcategories = []
    if shared_category_ids:
        shared_subcategories = db.session.execute(
            db.select(Category).filter(Category.parent_id.in_(shared_category_ids)).order_by(Category.created_at.asc())
        ).scalars().all()
    
    added_ids = set()
    result = []
    
    # Add owned categories
    for cat in owned_categories:
        if cat.id not in added_ids:
            d = cat.to_dict()
            d['collaborator_role'] = None
            result.append(d)
            added_ids.add(cat.id)
        
    # Add shared categories
    for collab in collaborations:
        if collab.category_rel and collab.category_rel.id not in added_ids:
            d = collab.category_rel.to_dict()
            d['collaborator_role'] = collab.role
            result.append(d)
            added_ids.add(collab.category_rel.id)
            
    # Add subcategories of shared categories
    for sub in shared_subcategories:
        if sub.id not in added_ids:
            d = sub.to_dict()
            d['collaborator_role'] = collab_role_map.get(sub.parent_id)
            result.append(d)
            added_ids.add(sub.id)
            
    return jsonify(result), 200

@categories_bp.route('', methods=['POST'])
@token_required
def create_category(current_user):
    """Create a new category for the authenticated user."""
    data = request.get_json() or {}
    name = data.get('name')
    icon = data.get('icon')
    parent_id = data.get('parent_id')
    
    if not name:
        return jsonify({'error': 'Kategori adı gereklidir.'}), 400
        
    if parent_id is not None:
        try:
            parent_id = int(parent_id)
        except ValueError:
            return jsonify({'error': 'Geçersiz üst kategori ID değeri.'}), 400
            
        parent = db.session.get(Category, parent_id)
        if not parent:
            return jsonify({'error': 'Üst kategori bulunamadı.'}), 404
            
        # Check permissions on the parent category: must be owner or editor
        if not check_category_editor_permission(parent, current_user.id):
            return jsonify({'error': 'Üst kategori bulunamadı veya bu işlem için yetkiniz yok.'}), 403
            
        # Gating: Pro/Team required to create subfolders (check the owner of the parent category)
        from app.utils.auth_helpers import check_tier_access
        from app.models.user import User
        owner = db.session.get(User, parent.user_id)
        if not owner or not check_tier_access(owner, min_tier='pro'):
            return jsonify({
                'code': 'PRO_REQUIRED',
                'feature': 'subfolders',
                'message': 'Alt klasör oluşturma özelliği yalnızca Keepr Pro ve Team üyelerine özeldir.'
            }), 403
            
        # Max Depth = 2
        if parent.parent_id is not None:
            return jsonify({'error': 'Maksimum klasör derinlik sınırına (2 seviye) ulaşıldı. Bir alt klasörün altına başka bir klasör eklenemez.'}), 400

    try:
        created_user_id = parent.user_id if parent_id is not None else current_user.id
        category = Category(name=name, icon=icon, user_id=created_user_id, parent_id=parent_id)
        db.session.add(category)
        db.session.commit()
        return jsonify(category.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return server_error('Kategori oluşturulurken bir hata oluştu.')

@categories_bp.route('/<int:category_id>', methods=['PUT'])
@token_required
def update_category(current_user, category_id):
    """Update a category's name, icon, or parent_id."""
    category = db.session.get(Category, category_id)
    if not category:
        return jsonify({'error': 'Kategori bulunamadı.'}), 404
        
    # Permission gating:
    # - If it's a subcategory (parent_id is not None), check if they are owner or editor of the parent
    # - If it's a root category, only the owner is allowed to edit it
    is_owner = (category.user_id == current_user.id)
    is_subfolder = (category.parent_id is not None)
    
    if is_subfolder:
        if not check_category_editor_permission(category, current_user.id):
            return jsonify({'error': 'Kategori bulunamadı veya bu işlem için yetkiniz yok.'}), 403
    else:
        if not is_owner:
            return jsonify({'error': 'Kategori bulunamadı veya bu işlem için yetkiniz yok.'}), 403
        
    data = request.get_json() or {}
    name = data.get('name')
    icon = data.get('icon')
    
    if name:
        category.name = name
    if icon is not None:
        category.icon = icon
        
    if 'parent_id' in data:
        parent_id = data.get('parent_id')
        if parent_id is not None:
            try:
                parent_id = int(parent_id)
            except ValueError:
                return jsonify({'error': 'Geçersiz üst kategori ID değeri.'}), 400
                
            if parent_id == category.id:
                return jsonify({'error': 'Bir kategori kendisinin alt klasörü olamaz.'}), 400
                
            parent = db.session.get(Category, parent_id)
            if not parent:
                return jsonify({'error': 'Üst kategori bulunamadı.'}), 404
                
            if not check_category_editor_permission(parent, current_user.id):
                return jsonify({'error': 'Üst kategori bulunamadı veya bu işlem için yetkiniz yok.'}), 403
                
            from app.utils.auth_helpers import check_tier_access
            from app.models.user import User
            owner = db.session.get(User, parent.user_id)
            if not owner or not check_tier_access(owner, min_tier='pro'):
                return jsonify({
                    'code': 'PRO_REQUIRED',
                    'feature': 'subfolders',
                    'message': 'Alt klasör oluşturma özelliği yalnızca Keepr Pro ve Team üyelerine özeldir.'
                }), 403
                
            if parent.parent_id is not None:
                return jsonify({'error': 'Maksimum klasör derinlik sınırına (2 seviye) ulaşıldı.'}), 400
                
            if category.subcategories:
                return jsonify({'error': 'Bu kategorinin alt klasörleri olduğundan, başka bir klasörün altına taşınamaz.'}), 400
        category.parent_id = parent_id
        
    try:
        db.session.commit()
        return jsonify(category.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return server_error('Kategori güncellenirken bir hata oluştu.')

@categories_bp.route('/<int:category_id>', methods=['DELETE'])
@token_required
def delete_category(current_user, category_id):
    """Delete a category. Keeps belonging to this category will have their category_id set to NULL."""
    category = db.session.get(Category, category_id)
    if not category:
        return jsonify({'error': 'Kategori bulunamadı.'}), 404
        
    # Permission gating:
    # - If it's a subcategory (parent_id is not None), check if they are owner or editor of the parent
    # - If it's a root category, only the owner is allowed to delete it
    is_owner = (category.user_id == current_user.id)
    is_subfolder = (category.parent_id is not None)
    
    if is_subfolder:
        if not check_category_editor_permission(category, current_user.id):
            return jsonify({'error': 'Kategori bulunamadı veya bu işlem için yetkiniz yok.'}), 403
    else:
        if not is_owner:
            return jsonify({'error': 'Kategori bulunamadı veya bu işlem için yetkiniz yok.'}), 403
        
    try:
        db.session.delete(category)
        db.session.commit()
        return jsonify({'message': 'Kategori başarıyla silindi. Bağlantılar silinmedi.'}), 200
    except Exception as e:
        db.session.rollback()
        return server_error('Kategori silinirken bir hata oluştu.')

@categories_bp.route('/<int:category_id>/share', methods=['POST'])
@token_required
def toggle_category_share(current_user, category_id):
    """Share or unshare a category. Must be the category owner. Subfolders cannot be shared directly."""
    category = db.session.get(Category, category_id)
    if not category or category.user_id != current_user.id:
        return jsonify({'error': 'Kategori bulunamadı veya bu işlem için yetkiniz yok.'}), 404
        
    if category.parent_id is not None:
        return jsonify({'error': 'Alt klasörler bağımsız olarak paylaşıma açılamaz. Lütfen üst klasörü paylaşın.'}), 400
        
    data = request.get_json() or {}
    is_public = data.get('is_public', False)
    
    if is_public:
        from app.utils.auth_helpers import check_tier_access
        if not check_tier_access(current_user, min_tier='team'):
            return jsonify({
                'code': 'TEAM_REQUIRED',
                'feature': 'share_category',
                'message': 'Klasör paylaşma özelliği yalnızca Keepr Team üyelerine özeldir.'
            }), 403
            
    try:
        if is_public:
            import secrets
            category.is_public = True
            if not category.share_slug:
                category.share_slug = secrets.token_urlsafe(16)
        else:
            category.is_public = False
            category.share_slug = None
            
        db.session.commit()
        return jsonify(category.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return server_error('Paylaşım ayarları kaydedilemedi.')

@categories_bp.route('/shared/<string:share_slug>', methods=['GET'])
def get_shared_category(share_slug):
    """Public endpoint to retrieve a shared category, its subcategories, and their keeps recursively using joinedload."""
    from sqlalchemy.orm import joinedload
    from app.models.user import User
    
    category = db.session.execute(
        db.select(Category)
        .filter_by(share_slug=share_slug, is_public=True)
        .options(joinedload(Category.keeps), joinedload(Category.subcategories).joinedload(Category.keeps))
    ).unique().scalar_one_or_none()
    
    if not category:
        return jsonify({'error': 'Paylaşılan koleksiyon bulunamadı veya yayından kaldırılmış.'}), 404
        
    if category.parent_id is not None:
        return jsonify({'error': 'Geçersiz paylaşım isteği.'}), 400
        
    user = db.session.get(User, category.user_id)
    username = user.username if user else "Bilinmeyen Kullanıcı"
    
    # Root keeps
    root_keeps = []
    for k in category.keeps:
        is_private = getattr(k, 'is_private', False)
        if not is_private:
            root_keeps.append(k.to_dict())
    root_keeps.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    # Subcategories keeps
    subcats_data = []
    for sub in category.subcategories:
        sub_keeps = []
        for k in sub.keeps:
            is_private = getattr(k, 'is_private', False)
            if not is_private:
                sub_keeps.append(k.to_dict())
        sub_keeps.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        subcats_data.append({
            'id': sub.id,
            'name': sub.name,
            'icon': sub.icon,
            'keeps': sub_keeps
        })
        
    subcats_data.sort(key=lambda x: x['name'].lower())
    
    return jsonify({
        'category': {
            'id': category.id,
            'name': category.name,
            'icon': category.icon,
            'username': username
        },
        'keeps': root_keeps,
        'subcategories': subcats_data
    }), 200
