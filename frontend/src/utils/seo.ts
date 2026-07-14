/**
 * Hafif, bağımlılıksız SEO meta yardımcısı.
 * SPA'da sayfa/route değiştikçe <title>, meta description, canonical ve
 * OG başlık/açıklamasını günceller. (react-helmet gibi bir bağımlılık gerektirmez.)
 */

interface PageMeta {
  title: string;
  description?: string;
  canonical?: string;
}

function setMetaTag(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function setPageMeta({ title, description, canonical }: PageMeta): void {
  document.title = title;

  // OG başlık her zaman sayfa başlığıyla senkron
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);

  if (description) {
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  }

  if (canonical) {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonical);
  }
}
