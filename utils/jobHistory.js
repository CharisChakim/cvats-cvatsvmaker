const MAX = { text: 3, url: 5, screenshot: 2 };
const KEYS = {
    text:       'cvats_jh_text',
    url:        'cvats_jh_url',
    screenshot: 'cvats_jh_screenshot',
};

export function getHistory(type) {
    try { return JSON.parse(sessionStorage.getItem(KEYS[type]) || '[]'); }
    catch { return []; }
}

export function addToHistory(type, item) {
    try {
        const prev = getHistory(type).filter(h => h.key !== item.key);
        sessionStorage.setItem(KEYS[type], JSON.stringify([item, ...prev].slice(0, MAX[type])));
    } catch {}
}
