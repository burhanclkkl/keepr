import cloudscraper
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from app.utils.url_guard import assert_url_is_safe, safe_get, SafeUrlError

def extract_metadata(url):
    """
    Scrapes the URL to extract ONLY the Title.
    Description and Image URL are set to None as requested for high-density, minimal bookmarking.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    
    # Initialize default metadata
    metadata = {
      'title': None,
      'description': None
    }
    
    # Prepend scheme if missing (e.g. "google.com")
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url

    # Format and parse URL to set fallback title
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        metadata['title'] = domain
    except Exception:
        domain = "Bilinmeyen Bağlantı"
        metadata['title'] = domain

    # SSRF koruması: iç ağ/özel adresleri en baştan reddet.
    try:
        assert_url_is_safe(url)
    except SafeUrlError:
        # Güvenli olmayan URL için scraping yapma; yalnızca domain başlığı döner.
        return metadata

    # Fetch and extract title
    try:
        # Create a cloudscraper session to bypass bot protection
        scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'darwin',
                'desktop': True
            }
        )
        # Her yönlendirme adımında yeniden doğrulayan SSRF-güvenli GET.
        response = safe_get(scraper, url, headers=headers, timeout=5, max_redirects=5)
        if response.status_code == 200:
            # Auto-detect correct encoding (e.g. utf-8, windows-1254) for Turkish characters
            response.encoding = response.apparent_encoding
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Title Extraction (og:title -> twitter:title -> html title tag)
            og_title = soup.find('meta', property='og:title') or soup.find('meta', attrs={'name': 'og:title'})
            twitter_title = soup.find('meta', property='twitter:title') or soup.find('meta', attrs={'name': 'twitter:title'})
            html_title = soup.find('title')
            
            if og_title and og_title.get('content'):
                metadata['title'] = og_title.get('content').strip()
            elif twitter_title and twitter_title.get('content'):
                metadata['title'] = twitter_title.get('content').strip()
            elif html_title and html_title.string:
                metadata['title'] = html_title.string.strip()
    except Exception:
        # Fallback to domain title on error
        pass
        
    return metadata
