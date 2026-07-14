"""
Merkezi hata yanıtı yardımcıları.

Amaç: Ham istisna metnini (DB/SQL iç detayları) kullanıcıya SIZDIRMAMAK.
Detay yalnızca sunucu log'una yazılır; kullanıcı generic bir mesaj alır.
"""
import logging
import traceback
from flask import jsonify

logger = logging.getLogger('keepr')


def server_error(user_message):
    """
    500 yanıtı döndürür. Aktif istisnanın tam traceback'ini sunucu log'una
    yazar ama kullanıcıya yalnızca `user_message` gösterir.
    """
    logger.error("%s\n%s", user_message, traceback.format_exc())
    return jsonify({'error': user_message}), 500
