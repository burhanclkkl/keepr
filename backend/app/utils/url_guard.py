"""
SSRF koruması: Sunucu tarafında dış URL çekmeden önce hedefin güvenli
(genel internet, private/iç ağ değil) olduğunu doğrular.

Kullanım:
    from app.utils.url_guard import SafeUrlError, assert_url_is_safe, safe_get
"""
import ipaddress
import socket
from urllib.parse import urlparse

# İzin verilen şemalar
_ALLOWED_SCHEMES = {'http', 'https'}

# Reddedilecek hostname'ler (metadata servisleri vb.)
_BLOCKED_HOSTNAMES = {
    'localhost',
    'metadata.google.internal',
}


class SafeUrlError(Exception):
    """URL güvenli değilse (SSRF riski) fırlatılır."""
    pass


def _ip_is_forbidden(ip_str):
    """Bir IP adresinin private/iç/rezerve bir aralıkta olup olmadığını döndürür."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True  # Ayrıştırılamayan IP = güvenme
    # Loopback (127.0.0.0/8, ::1), private (RFC1918), link-local (169.254/fe80),
    # multicast, reserved, unspecified (0.0.0.0) — hepsi SSRF vektörü.
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def assert_url_is_safe(url):
    """
    URL güvenli değilse SafeUrlError fırlatır.

    Kontroller:
      1. Şema http/https olmalı.
      2. Hostname kara listede olmamalı.
      3. Hostname'in çözümlendiği TÜM IP'ler genel (public) olmalı.
         (DNS rebinding'e karşı bütün A/AAAA kayıtları denetlenir.)
    """
    parsed = urlparse(url)

    if parsed.scheme.lower() not in _ALLOWED_SCHEMES:
        raise SafeUrlError('Yalnızca http ve https bağlantılarına izin verilir.')

    hostname = parsed.hostname
    if not hostname:
        raise SafeUrlError('Geçersiz veya eksik alan adı.')

    if hostname.lower() in _BLOCKED_HOSTNAMES:
        raise SafeUrlError('Bu adres güvenlik nedeniyle engellendi.')

    # Hostname doğrudan bir IP olabilir — ya da DNS ile çözülür.
    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise SafeUrlError('Alan adı çözümlenemedi.')

    resolved_ips = {info[4][0] for info in addr_infos}
    if not resolved_ips:
        raise SafeUrlError('Alan adı için IP bulunamadı.')

    for ip_str in resolved_ips:
        if _ip_is_forbidden(ip_str):
            raise SafeUrlError('Bu adres iç ağ/özel bir kaynağa işaret ediyor.')

    return True


def safe_get(scraper, url, *, headers=None, timeout=5, max_redirects=5):
    """
    SSRF-güvenli GET. Her yönlendirme adımında hedefi yeniden doğrular
    (allow_redirects=False + manuel takip), böylece bir dış URL 302 ile
    iç adrese sıçrayamaz.

    `scraper`: requests-benzeri bir oturum (cloudscraper/requests).
    """
    current_url = url
    for _ in range(max_redirects + 1):
        assert_url_is_safe(current_url)
        response = scraper.get(
            current_url,
            headers=headers,
            timeout=timeout,
            allow_redirects=False,
        )
        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
            location = response.headers.get('Location')
            if not location:
                return response
            # Göreli yönlendirmeleri mutlak yap
            current_url = response.url and _resolve(response.url, location) or location
            continue
        return response

    raise SafeUrlError('Çok fazla yönlendirme.')


def _resolve(base, location):
    from urllib.parse import urljoin
    return urljoin(base, location)
