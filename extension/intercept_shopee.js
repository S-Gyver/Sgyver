/**
 * ⚡ S-Gyver Shopee Network Interceptor
 * Injected into the Shopee Page Context at document_start
 * (Inspired by BigSeller Pro Architecture)
 * 
 * Automatically captures all Shopee internal API responses (PDP, Search, Variations)
 * with 0 latency, 0 separate requests, and 0% risk of 403 Forbidden!
 */

(function initShopeeInterceptor() {
    if (window.__sgyverInterceptorActive) return;
    window.__sgyverInterceptorActive = true;
    window.__sgyverPdpCache = window.__sgyverPdpCache || new Map();

    console.log('🛡️ [S-Gyver] Shopee In-Page Network Interceptor Active');

    function broadcastInterceptedData(type, payload, url) {
        try {
            window.dispatchEvent(new CustomEvent('SGYVER_SHOPEE_INTERCEPTED', {
                detail: {
                    type: type,
                    url: url,
                    data: payload,
                    timestamp: Date.now()
                }
            }));
            window.postMessage({
                source: 'SGYVER_PAGE_INTERCEPTOR',
                type: type,
                url: url,
                data: payload
            }, '*');
        } catch (e) {}
    }

    // 1. Hook window.fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            
            // 1.1 Product Detail Page (PDP) Endpoint
            if (url.includes('/api/v4/pdp/get_pc') || url.includes('/api/v4/pdp/get_rw') || url.includes('/api/v4/item/get')) {
                response.clone().json().then(json => {
                    if (json && (json.data || json.item)) {
                        const itemData = json.data || json.item;
                        const itemid = itemData.itemid || itemData.item_id;
                        if (itemid) {
                            window.__sgyverPdpCache.set(String(itemid), itemData);
                            try {
                                sessionStorage.setItem('sgyver_pdp_' + itemid, JSON.stringify(itemData));
                            } catch (e) {}
                        }
                        broadcastInterceptedData('PDP_DATA', itemData, url);
                    }
                }).catch(() => {});
            }

            // 1.2 Variation Price & Stock Selection Endpoint
            if (url.includes('/api/v4/pdp/get_pc_vsku') || url.includes('cart_panel/select_variation_pc')) {
                response.clone().json().then(json => {
                    if (json && json.data) {
                        broadcastInterceptedData('VARIATION_DATA', json.data, url);
                    }
                }).catch(() => {});
            }

            // 1.3 Search Items & Shop Items Endpoint
            if (url.includes('/api/v4/search/search_items') || url.includes('/api/v4/recommend/recommend')) {
                response.clone().json().then(json => {
                    if (json && (json.items || json.data)) {
                        broadcastInterceptedData('SEARCH_ITEMS_DATA', json.items || json.data, url);
                    }
                }).catch(() => {});
            }
        } catch (err) {}

        return response;
    };

    // 2. Hook XMLHttpRequest as fallback
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._sgyverUrl = url;
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            try {
                const url = this._sgyverUrl || '';
                if (url.includes('/api/v4/pdp/get_pc') || url.includes('/api/v4/item/get')) {
                    const json = JSON.parse(this.responseText);
                    if (json && (json.data || json.item)) {
                        const itemData = json.data || json.item;
                        broadcastInterceptedData('PDP_DATA', itemData, url);
                    }
                }
            } catch (e) {}
        });
        return origSend.apply(this, arguments);
    };
})();
