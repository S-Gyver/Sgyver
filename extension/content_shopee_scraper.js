/**
 * ==============================================================================
 * 📦 S-Gyver BigSeller-Style Shopee Product Scraper & Duplicate Detector
 * Injected into Shopee Consumer Marketplace (shopee.co.th, *.shopee.co.th)
 * 
 * Features:
 * 1. Persistent Floating Hub Pill (Always visible confirmation that S-Gyver is active)
 * 2. Product Card Hover Button [ 📦 ดูดเข้า S-Gyver ] on all search/category/shop items
 * 3. Real-time Duplicate Badge [ ✅ ดูดแล้ว ⟳ ] with instant memory across pages
 * 4. Single Product Page Floating Dock with custom Rack (A-01) and Notes
 * 5. Bottom Batch Bar to scrape multiple products in 1-Click
 * 6. Direct Supabase Cloud Warehouse Sync & real-time broadcast to S-Gyver tabs
 * ==============================================================================
 */

console.log('🛍️ [S-Gyver] Shopee Consumer Marketplace Scraper Script Loaded');

// 1. All Top-Level State Variables (Declared at top to prevent TDZ issues)
const scrapedCache = new Map(); // itemid -> { time, name, sku }
const scrapedItemDetailsCache = new Map(); // itemid -> full product payload
let isScraperInitialized = false;
let scanDebounceTimer = null;
let keepAlivePort = null;
let lastBatchSig = '';

// Inject In-Page Network Interceptor (Hooks window.fetch on Shopee, BigSeller-style)
function injectShopeeInterceptor() {
    try {
        if (document.getElementById('sgyver-shopee-interceptor')) return;
        const script = document.createElement('script');
        script.id = 'sgyver-shopee-interceptor';
        script.src = chrome.runtime.getURL('intercept_shopee.js');
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
    } catch (e) {}
}
injectShopeeInterceptor();

// Listen for intercepted Shopee responses from page context
window.addEventListener('SGYVER_SHOPEE_INTERCEPTED', (e) => {
    if (!e.detail || !e.detail.data) return;
    const { type, data } = e.detail;
    if (type === 'PDP_DATA' && data) {
        const itemid = data.itemid || data.item_id;
        const shopid = data.shopid || data.shop_id;
        if (itemid) {
            const parsed = parseShopeeApiResponse(data, itemid, shopid);
            if (parsed && parsed.name) {
                scrapedItemDetailsCache.set(String(itemid), parsed);
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ action: 'REGISTER_SHOPEE_ITEM', itemid: String(itemid), product: parsed });
                }
            }
        }
    }
});

// 2. Keep-Alive connection to background script for Firefox MV3
function keepBackgroundAlive() {
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.connect) {
            keepAlivePort = chrome.runtime.connect({ name: 'sgyver-shopee-keepalive' });
            keepAlivePort.onDisconnect.addListener(() => {
                keepAlivePort = null;
                setTimeout(keepBackgroundAlive, 5000);
            });
        }
    } catch (e) {
        // Silently continue if runtime is busy
    }
}

// 3. Inject Ultra-Rich CSS Styles
function injectShopeeScraperStyles() {
    if (document.getElementById('sgyver-shopee-scraper-styles')) return;

    const style = document.createElement('style');
    style.id = 'sgyver-shopee-scraper-styles';
    style.textContent = `
        /* Product Card Decorator */
        .sgyver-card-wrapper {
            position: relative !important;
        }

        .sgyver-card-overlay {
            position: absolute !important;
            top: 6px !important;
            left: 6px !important;
            right: 6px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            pointer-events: auto !important;
            z-index: 2147483647 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Prompt', sans-serif !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        /* Scraped Status Badge [ ✅ ดูดแล้ว ] */
        .sgyver-badge-scraped {
            background: linear-gradient(135deg, #059669, #10b981) !important;
            color: #ffffff !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            padding: 4px 10px !important;
            border-radius: 20px !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35) !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            border: 2px solid #ffffff !important;
            user-select: none !important;
            cursor: pointer !important;
            backdrop-filter: blur(4px) !important;
            animation: sgyverBadgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .sgyver-badge-scraped:hover {
            transform: scale(1.06) !important;
            background: linear-gradient(135deg, #047857, #059669) !important;
        }
        .sgyver-badge-rescrape-btn {
            background: rgba(255, 255, 255, 0.35) !important;
            border: none !important;
            color: white !important;
            border-radius: 50% !important;
            width: 17px !important;
            height: 17px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 11px !important;
            cursor: pointer !important;
            margin-left: 2px !important;
            transition: transform 0.2s !important;
        }
        .sgyver-badge-rescrape-btn:hover {
            transform: rotate(180deg) !important;
            background: rgba(255, 255, 255, 0.6) !important;
        }

        /* Scrape Hover Button [ 📦 ดูดเข้า S-Gyver ] */
        .sgyver-btn-scrape-card {
            background: linear-gradient(135deg, #ea580c, #f97316) !important;
            color: #ffffff !important;
            font-size: 11.5px !important;
            font-weight: 800 !important;
            padding: 5px 12px !important;
            border-radius: 20px !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4) !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            border: 2px solid #ffffff !important;
            cursor: pointer !important;
            user-select: none !important;
            opacity: 1 !important;
            visibility: visible !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            margin-left: auto !important;
        }
        .sgyver-btn-scrape-card:hover {
            transform: translateY(-2px) scale(1.06) !important;
            box-shadow: 0 6px 20px rgba(234, 88, 12, 0.7) !important;
            background: linear-gradient(135deg, #c2410c, #ea580c) !important;
        }
        .sgyver-btn-scrape-card.loading {
            background: #64748b !important;
            cursor: wait !important;
            pointer-events: none !important;
        }

        /* Always-Visible Floating Hub Pill */
        #sgyver-shopee-floating-hub {
            position: fixed !important;
            bottom: 24px !important;
            right: 24px !important;
            z-index: 2147483647 !important;
            background: rgba(15, 23, 42, 0.95) !important;
            backdrop-filter: blur(12px) !important;
            color: #ffffff !important;
            padding: 10px 18px !important;
            border-radius: 50px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 0 2px rgba(16, 185, 129, 0.5) !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Prompt', sans-serif !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            user-select: none !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        #sgyver-shopee-floating-hub:hover {
            transform: translateY(-3px) scale(1.03) !important;
            box-shadow: 0 14px 35px rgba(0, 0, 0, 0.55), 0 0 0 2px rgba(16, 185, 129, 0.8) !important;
        }

        /* Bottom Batch Bar */
        #sgyver-shopee-batch-bar {
            position: fixed !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(15, 23, 42, 0.96) !important;
            backdrop-filter: blur(14px) !important;
            color: #ffffff !important;
            padding: 12px 24px !important;
            border-radius: 50px !important;
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45), 0 0 0 2px rgba(16, 185, 129, 0.5) !important;
            display: flex !important;
            align-items: center !important;
            gap: 14px !important;
            z-index: 2147483646 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Prompt', sans-serif !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            animation: sgyverSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .sgyver-batch-btn {
            background: linear-gradient(135deg, #059669, #10b981) !important;
            color: white !important;
            border: none !important;
            padding: 7px 16px !important;
            border-radius: 20px !important;
            font-weight: 700 !important;
            font-size: 12.5px !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35) !important;
            transition: transform 0.2s !important;
        }
        .sgyver-batch-btn:hover {
            transform: scale(1.05) !important;
        }

        .sgyver-batch-reset-btn {
            background: rgba(239, 68, 68, 0.2) !important;
            color: #fca5a5 !important;
            border: 1px solid rgba(239, 68, 68, 0.5) !important;
            padding: 7px 14px !important;
            border-radius: 20px !important;
            font-weight: 700 !important;
            font-size: 12px !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            transition: all 0.2s !important;
            user-select: none !important;
        }
        .sgyver-batch-reset-btn:hover {
            background: #ef4444 !important;
            color: #ffffff !important;
            transform: scale(1.05) !important;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4) !important;
        }

        /* Single Product Dock */
        #sgyver-shopee-detail-dock {
            position: fixed !important;
            top: 110px !important;
            right: 20px !important;
            z-index: 2147483647 !important;
            width: 310px !important;
            background: #ffffff !important;
            border-radius: 20px !important;
            box-shadow: 0 20px 45px rgba(0,0,0,0.22), 0 0 0 1px #e2e8f0 !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Prompt', sans-serif !important;
            animation: sgyverFadeIn 0.3s ease-out !important;
        }

        /* Toast Notifications */
        .sgyver-toast {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 2147483647 !important;
            background: rgba(15, 23, 42, 0.95) !important;
            backdrop-filter: blur(10px) !important;
            color: white !important;
            padding: 12px 18px !important;
            border-radius: 16px !important;
            box-shadow: 0 15px 35px rgba(0,0,0,0.3) !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            border-left: 4px solid #10b981 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Prompt', sans-serif !important;
            font-size: 13px !important;
            animation: sgyverSlideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        @keyframes sgyverBadgePop {
            0% { transform: scale(0.6); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sgyverSlideUp {
            0% { transform: translate(-50%, 40px); opacity: 0; }
            100% { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes sgyverSlideDown {
            0% { transform: translateY(-30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes sgyverFadeIn {
            0% { opacity: 0; transform: scale(0.96); }
            100% { opacity: 1; transform: scale(1); }
        }
    `;

    (document.head || document.documentElement).appendChild(style);
}

// 4. Synchronous Cache Loading (LocalStorage + Storage API)
function loadScrapedCache() {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sgyver_copied_')) {
                const id = k.replace('sgyver_copied_', '');
                if (!scrapedCache.has(id)) {
                    scrapedCache.set(id, { time: localStorage.getItem(k) });
                }
            }
        }
    } catch (e) {}

    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(null, (items) => {
                if (items) {
                    for (const k in items) {
                        if (k.startsWith('sgyver_copied_')) {
                            scrapedCache.set(k.replace('sgyver_copied_', ''), items[k]);
                        }
                    }
                    scanAndDecorateCards();
                    updateFloatingHub();
                }
            });
        }
    } catch (e) {}
}

// 5. Always-Visible Floating Hub Pill (Guarantees visible proof that S-Gyver is active)
function injectOrUpdateFloatingHub(detectedCount = 0) {
    let hub = document.getElementById('sgyver-shopee-floating-hub');
    if (!hub) {
        hub = document.createElement('div');
        hub.id = 'sgyver-shopee-floating-hub';
        document.body.appendChild(hub);
        
        hub.onclick = () => {
            runScanPass();
            showScraperToast(`🔍 สแกนหน้า Shopee อีกครั้ง: พบสินค้า ${document.querySelectorAll('.sgyver-card-wrapper').length} รายการ`);
        };
    }

    const scrapedCount = scrapedCache.size;
    const cardsOnPage = document.querySelectorAll('.sgyver-card-wrapper').length;

    hub.innerHTML = `
        <span style="font-size: 16px;">📦</span>
        <span style="color: #34d399;">●</span>
        <span>S-Gyver Scraper</span>
        <span style="background: rgba(255,255,255,0.18); font-size: 11px; padding: 2px 8px; border-radius: 12px;">
            ${cardsOnPage > 0 ? `${cardsOnPage} สินค้า` : 'พร้อมดูด'}
        </span>
        <button id="sgyver-hub-reset-btn" style="
            background: rgba(239, 68, 68, 0.25);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 14px;
            font-size: 10.5px;
            font-weight: 700;
            padding: 2px 8px;
            cursor: pointer;
            margin-left: 2px;
            transition: all 0.2s;
        " title="รีเซ็ตสถานะทั้งหมดเพื่อให้เริ่มดูดใหม่ได้">🔄 รีเซ็ต</button>
    `;

    const resetBtn = hub.querySelector('#sgyver-hub-reset-btn');
    if (resetBtn) {
        resetBtn.onclick = (e) => {
            e.stopPropagation();
            resetAllScrapedStatus();
        };
    }
}

function updateFloatingHub() {
    const cards = document.querySelectorAll('.sgyver-card-wrapper');
    injectOrUpdateFloatingHub(cards.length);
}

// 6. Extract Item & Shop ID from Any Shopee Link
function extractProductInfoFromLink(link) {
    if (!link) return null;
    const rawHref = link.getAttribute('href') || link.href || '';
    if (!rawHref) return null;

    let decodedHref = rawHref;
    try { decodedHref = decodeURIComponent(rawHref); } catch (e) {}

    // Pattern 1: -i.<shopid>.<itemid>
    let m = rawHref.match(/-i\.(\d+)\.(\d+)/) || decodedHref.match(/-i\.(\d+)\.(\d+)/);
    if (m) return { shopid: m[1], itemid: m[2] };

    // Pattern 2: /product/<shopid>/<itemid>
    m = rawHref.match(/\/product\/(\d+)\/(\d+)/) || decodedHref.match(/\/product\/(\d+)\/(\d+)/);
    if (m) return { shopid: m[1], itemid: m[2] };

    return null;
}

// 7. Find Card Container
function findProductCard(link) {
    return link.closest('[data-sq="item"]') || 
           link.closest('.shopee-search-item-result__item') || 
           link.closest('.col-xs-2-4') || 
           link.closest('div[class*="shopee-carousel__item"]') || 
           link.closest('div[class*="product-card"]') ||
           link.closest('li[class*="col-"]') ||
           link.parentElement ||
           link;
}

// 8. Scan & Decorate All Product Cards
function scanAndDecorateCards() {
    const anchors = document.querySelectorAll('a[href]:not([data-sgyver-proc])');
    if (anchors.length === 0) return;

    for (let i = 0; i < anchors.length; i++) {
        const link = anchors[i];
        link.setAttribute('data-sgyver-proc', '1');

        const info = extractProductInfoFromLink(link);
        if (!info) continue;

        const { shopid, itemid } = info;
        const card = findProductCard(link);
        if (!card) continue;

        if (card.dataset.sgyverDecorated === itemid) continue;
        card.dataset.sgyverDecorated = itemid;
        card.classList.add('sgyver-card-wrapper');

        let overlay = card.querySelector(':scope > .sgyver-card-overlay');
        const isScraped = scrapedCache.has(String(itemid));

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sgyver-card-overlay';
            card.insertBefore(overlay, card.firstChild);
        }

        renderCardOverlay(overlay, itemid, shopid, isScraped);

        // Make Shopee card draggable across split windows into S-Gyver Warehouse
        if (!card.dataset.sgyverDragBound) {
            card.dataset.sgyverDragBound = '1';
            card.setAttribute('draggable', 'true');

            // Robust pre-fetch rich details (all 15 images, variants, description) in page context
            const prefetchDetails = async () => {
                if (card._sgyverFullProduct || card._sgyverPrefetching) return;
                card._sgyverPrefetching = true;
                try {
                    const fullData = await fetchShopeeProductDetailsInPage(itemid, shopid);
                    if (fullData && fullData.name) {
                        card._sgyverFullProduct = fullData;
                        scrapedItemDetailsCache.set(String(itemid), fullData);
                        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                            chrome.runtime.sendMessage({ action: 'REGISTER_SHOPEE_ITEM', itemid: String(itemid), product: fullData });
                        }
                    }
                } catch (e) {} finally {
                    card._sgyverPrefetching = false;
                }
            };

            card.addEventListener('mouseenter', prefetchDetails);
            card.addEventListener('pointerenter', prefetchDetails);
            card.addEventListener('pointerdown', prefetchDetails);
            card.addEventListener('mousedown', prefetchDetails);

            card.addEventListener('dragstart', (e) => {
                prefetchDetails();
                const cached = scrapedItemDetailsCache.get(String(itemid));
                const prod = card._sgyverFullProduct || cached || parseShopeeCardDom(card, itemid, shopid) || {
                    itemid: String(itemid),
                    shopid: String(shopid),
                    sku: `SP_${itemid}`,
                    url: link.href || `https://shopee.co.th/product/${shopid}/${itemid}`,
                    name: card.querySelector('img')?.alt || `สินค้า Shopee (${itemid})`,
                    price: 0
                };

                prod.source = 'SGYVER_SHOPEE_IMPORT';
                const jsonStr = JSON.stringify(prod);

                e.dataTransfer.setData('application/json', jsonStr);
                e.dataTransfer.setData('text/plain', jsonStr);
                e.dataTransfer.setData('text/uri-list', prod.url);
                e.dataTransfer.effectAllowed = 'copy';

                // Save to local storage & broadcast to background immediately
                try {
                    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                        chrome.storage.local.set({ ['sgyver_dragged_' + itemid]: prod });
                    }
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                        chrome.runtime.sendMessage({ action: 'REGISTER_SHOPEE_ITEM', itemid: String(itemid), product: prod });
                    }
                } catch (err) {}

                card.style.opacity = '0.55';
                showScraperToast(`📦 กำลังลาก "${(prod.name || '').substring(0, 24)}..." ไปวางที่ S-Gyver`);
            });

            card.addEventListener('dragend', () => {
                card.style.opacity = '1';
            });
        }
    }
}

// 9. Render Card Overlay (Button or Scraped Badge)
function renderCardOverlay(overlay, itemid, shopid, isScraped) {
    const targetStatus = isScraped ? 'SCRAPED' : 'NOT_SCRAPED';
    if (overlay.dataset.status === targetStatus) return;

    overlay.dataset.status = targetStatus;
    overlay.dataset.itemid = itemid;
    overlay.dataset.shopid = shopid;

    const stopEvent = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    };

    if (isScraped) {
        const cacheData = scrapedCache.get(String(itemid));
        const timeStr = typeof cacheData === 'object' && cacheData.time ? cacheData.time : 'ก่อนหน้านี้';

        overlay.innerHTML = `
            <div class="sgyver-badge-scraped" title="เคยดูดเข้า S-Gyver แล้วเมื่อ: ${timeStr} (คลิกปุ่ม ⟳ เพื่อดูดซ้ำ)">
                <span>✅</span>
                <span>ดูดแล้ว</span>
                <button type="button" class="sgyver-badge-rescrape-btn" title="ดูดซ้ำอีกรอบ">⟳</button>
            </div>
        `;

        const rescrapeBtn = overlay.querySelector('.sgyver-badge-rescrape-btn');
        if (rescrapeBtn) {
            rescrapeBtn.addEventListener('click', (e) => {
                stopEvent(e);
                doScrapeItem(itemid, shopid, overlay, true);
            }, true);
            rescrapeBtn.addEventListener('mousedown', stopEvent, true);
            rescrapeBtn.addEventListener('pointerdown', stopEvent, true);
        }
    } else {
        overlay.innerHTML = `
            <div class="sgyver-btn-scrape-card" title="คลิกเพื่อดูดสินค้าชิ้นนี้เข้า S-Gyver Warehouse ทันที">
                <span>📦</span>
                <span>ดูดเข้า S-Gyver</span>
            </div>
        `;

        const btn = overlay.querySelector('.sgyver-btn-scrape-card');
        if (btn) {
            btn.addEventListener('click', (e) => {
                stopEvent(e);
                doScrapeItem(itemid, shopid, overlay, false);
            }, true);
            btn.addEventListener('mousedown', stopEvent, true);
            btn.addEventListener('pointerdown', stopEvent, true);
        }
    }
}

// 10. Core Scrape Action Engine
async function doScrapeItem(itemid, shopid, overlayEl, isRepeat = false) {
    const btn = overlayEl ? overlayEl.querySelector('.sgyver-btn-scrape-card, .sgyver-badge-scraped') : null;
    if (btn) {
        btn.classList.add('loading');
        btn.innerHTML = `<span>⏳</span><span>กำลังดูด...</span>`;
    }

    try {
        let productData = null;
        const isDetailPage = location.pathname.includes('-i.') || location.pathname.includes('/product/');

        // Priority 0: Instant Cache from Interceptor or Pre-fetch
        if (scrapedItemDetailsCache.has(String(itemid))) {
            const cached = scrapedItemDetailsCache.get(String(itemid));
            if (cached && cached.name && cached.images && cached.images.length > 0) {
                productData = Object.assign({}, cached);
            }
        }

        // Priority 1: If on product detail page, extract directly from DOM first (100% reliable)
        if (!productData && isDetailPage) {
            productData = parseShopeeDetailDom(itemid, shopid);
        }

        // Priority 2: Try Shopee internal API endpoints (/api/v4/pdp/get_pc and /api/v4/item/get)
        try {
            const res = await fetch(`/api/v4/pdp/get_pc?item_id=${itemid}&shop_id=${shopid}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'include'
            });
            if (res.ok) {
                const j = await res.json();
                if (j && (j.data || j.item)) {
                    const apiData = parseShopeeApiResponse(j.data || j.item, itemid, shopid);
                    if (apiData && apiData.name) {
                        productData = Object.assign(apiData, productData || {});
                    }
                }
            }
        } catch (apiErr1) {
            // Silently try second endpoint
        }

        if (!productData || !productData.price) {
            try {
                const res = await fetch(`/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`, {
                    headers: { 'Accept': 'application/json' },
                    credentials: 'include'
                });
                if (res.ok) {
                    const j = await res.json();
                    if (j && j.data) {
                        const apiData = parseShopeeApiResponse(j.data, itemid, shopid);
                        if (apiData && apiData.name) {
                            productData = Object.assign(apiData, productData || {});
                        }
                    }
                }
            } catch (apiErr2) {
                // Silently fallback to DOM
            }
        }

        // Priority 3: Fallback to card DOM if on search/category page
        if (!productData && overlayEl) {
            productData = parseShopeeCardDom(overlayEl.closest('.sgyver-card-wrapper'), itemid, shopid);
        }

        // Priority 4: Final fallback to detail DOM
        if (!productData || !productData.name) {
            productData = parseShopeeDetailDom(itemid, shopid);
        }

        if (!productData || !productData.name) {
            throw new Error('ไม่สามารถดึงข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง');
        }

        productData.source = 'SGYVER_SHOPEE_IMPORT';
        productData.extracted_at = new Date().toISOString();

        // Step 3: Save to Supabase Cloud directly via background service
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'SAVE_SCRAPED_PRODUCT_TO_SUPABASE', product: productData });
            chrome.runtime.sendMessage({ action: 'AUTO_BROADCAST_PRODUCT', product: productData });
        }

        // Step 4: Mark as scraped in memory & local storage
        const timestamp = new Date().toLocaleString('th-TH');
        const cacheEntry = { time: timestamp, name: productData.name, sku: productData.sku };
        scrapedCache.set(String(itemid), cacheEntry);

        try {
            localStorage.setItem('sgyver_copied_' + itemid, timestamp);
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const storeObj = {};
                storeObj['sgyver_copied_' + itemid] = cacheEntry;
                chrome.storage.local.set(storeObj);
            }
        } catch (e) {}

        // Step 5: Copy JSON to clipboard
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(JSON.stringify(productData, null, 2));
            }
        } catch (clipErr) {}

        // Step 6: Update DOM overlay to [ ✅ ดูดแล้ว ]
        if (overlayEl) {
            renderCardOverlay(overlayEl, itemid, shopid, true);
        }

        // Step 7: Update Batch Bar & Floating Hub
        updateBatchBar();
        updateFloatingHub();

        // Step 8: Show Toast Notification
        showScraperToast(`📦 ดูดสำเร็จ! "${productData.name.substring(0, 32)}..." เข้า S-Gyver แล้ว`);

        return true;
    } catch (err) {
        console.error('Error scraping item:', err);
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = `<span>⚠️</span><span>เกิดข้อผิดพลาด</span>`;
            setTimeout(() => {
                scanAndDecorateCards();
            }, 3000);
        }
        showScraperToast(`❌ ข้อผิดพลาด: ${err.message}`, true);
        return false;
    }
}

// 11. Parse Shopee Item API Response
function parseShopeeApiResponse(d, itemid, shopid) {
    const images = [];
    if (d.images && Array.isArray(d.images)) {
        d.images.forEach(hash => {
            images.push(`https://down-th.img.susercontent.com/file/${hash}`);
        });
    } else if (d.image) {
        images.push(`https://down-th.img.susercontent.com/file/${d.image}`);
    }

    let videoUrl = '';
    if (d.video_info_list && d.video_info_list[0] && d.video_info_list[0].default_format) {
        videoUrl = d.video_info_list[0].default_format.url || '';
    }

    let rawPrice = d.price || d.price_min || 0;
    if (rawPrice > 100000) rawPrice = rawPrice / 100000;

    let minPrice = (d.price_min > 100000) ? d.price_min / 100000 : (d.price_min || rawPrice);
    let maxPrice = (d.price_max > 100000) ? d.price_max / 100000 : (d.price_max || rawPrice);

    const variants = [];
    if (d.models && Array.isArray(d.models)) {
        d.models.forEach((m, idx) => {
            let mPrice = m.price || rawPrice;
            if (mPrice > 100000) mPrice = mPrice / 100000;
            variants.push({
                name: m.name || `ตัวเลือกที่ ${idx + 1}`,
                sku: (m.sku || `SP_${itemid}_${idx + 1}`).trim(),
                price: mPrice,
                stock: parseInt(m.normal_stock ?? m.stock ?? 10, 10),
                image_url: m.extinfo?.tier_index ? images[m.extinfo.tier_index[0]] || images[0] : images[0]
            });
        });
    }

    const categories = [];
    if (d.categories && Array.isArray(d.categories)) {
        d.categories.forEach(c => {
            if (c.display_name) categories.push(c.display_name);
        });
    }

    return {
        itemid: String(itemid),
        shopid: String(shopid),
        sku: `SP_${itemid}`,
        name: (d.name || '').trim(),
        price: rawPrice,
        price_min: minPrice,
        price_max: maxPrice,
        stock: parseInt(d.stock || 10, 10),
        images: images,
        image_url: images[0] || null,
        video_url: videoUrl,
        variants: variants,
        categories: categories,
        description: d.description || '',
        url: `https://shopee.co.th/product/${shopid}/${itemid}`,
        warehouse_location: 'A-01'
    };
}

// 11.1 Dedicated In-Page Shopee Product Fetcher (Runs with full page session & cookies)
async function fetchShopeeProductDetailsInPage(itemid, shopid) {
    if (!itemid) return null;
    let apiData = null;

    // 1. Try modern PDP endpoint (/api/v4/pdp/get_pc)
    try {
        const res = await fetch(`/api/v4/pdp/get_pc?item_id=${itemid}&shop_id=${shopid || ''}`, {
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        });
        if (res.ok) {
            const j = await res.json();
            if (j && (j.data || j.item)) {
                apiData = parseShopeeApiResponse(j.data || j.item, itemid, shopid);
            }
        }
    } catch (e) {}

    // 2. Try classic item/get endpoint (/api/v4/item/get)
    if (!apiData || !apiData.name) {
        try {
            const res = await fetch(`/api/v4/item/get?itemid=${itemid}&shopid=${shopid || ''}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'include'
            });
            if (res.ok) {
                const j = await res.json();
                if (j && j.data) {
                    apiData = parseShopeeApiResponse(j.data, itemid, shopid);
                }
            }
        } catch (e) {}
    }

    if (apiData && apiData.name) {
        scrapedItemDetailsCache.set(String(itemid), apiData);
        return apiData;
    }
    return null;
}

// Listen for background requests to fetch Shopee item via active tab page session
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'FETCH_ITEM_DETAILS_FROM_SHOPEE_PAGE') {
            const { itemid, shopid } = request;
            const cached = scrapedItemDetailsCache.get(String(itemid));
            if (cached && cached.name && cached.images && cached.images.length > 1) {
                sendResponse({ success: true, data: cached });
                return true;
            }
            fetchShopeeProductDetailsInPage(itemid, shopid).then(data => {
                if (data) {
                    sendResponse({ success: true, data });
                } else {
                    sendResponse({ success: false, error: 'Product not found on Shopee' });
                }
            }).catch(err => {
                sendResponse({ success: false, error: err.message });
            });
            return true;
        }
    });
}

// 12. Fallback: Parse Card from DOM
function parseShopeeCardDom(cardEl, itemid, shopid) {
    if (!cardEl) return null;

    // Use specific title selectors to avoid matching container text with price/sales count
    const titleEl = cardEl.querySelector('div[class*="line-clamp-2"], div[class*="line-clamp"], div[class*="title"], [data-sq="item"] div[class*="name"]');
    let name = titleEl ? titleEl.innerText.trim() : (cardEl.querySelector('img')?.alt || `สินค้า Shopee (${itemid})`);

    // Clean out trailing price / sold count / discount if leaked into title
    name = name
        .replace(/฿\s*[\d,.-]+.*$/i, '')
        .replace(/-\d+%.*$/, '')
        .replace(/\b\d+(\.\d+)?\s*(ขายแล้ว|sold).*$/i, '')
        .replace(/[\n\r\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const imgEl = cardEl.querySelector('img');
    let imgUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || '') : '';
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;

    const priceEl = cardEl.querySelector('span[class*="price"], div[class*="price"], .viox77, .truncate');
    let priceText = priceEl ? priceEl.innerText.replace(/[^0-9.]/g, '') : '0';
    let price = parseFloat(priceText) || 0;

    return {
        itemid: String(itemid),
        shopid: String(shopid),
        sku: `SP_${itemid}`,
        name: name,
        price: price,
        stock: 10,
        images: imgUrl ? [imgUrl] : [],
        image_url: imgUrl || null,
        variants: [],
        url: `https://shopee.co.th/product/${shopid}/${itemid}`,
        warehouse_location: 'A-01'
    };
}

// 12.1 Dedicated Parser for Shopee Single Product Page DOM (PDP)
function parseShopeeDetailDom(itemid, shopid) {
    // 1. Extract Name (Try Meta og:title -> H1 -> Title selectors -> document.title -> URL)
    let name = '';
    const metaTitle = document.querySelector('meta[property="og:title"]')?.content;
    if (metaTitle && !metaTitle.includes('Shopee Thailand |') && !metaTitle.includes('ช้อปปี้')) {
        name = metaTitle.replace(/\s*\|\s*Shopee.*$/i, '').trim();
    }

    if (!name) {
        const titleEl = document.querySelector(
            'div[class*="product-briefing"] h1, ' +
            'h1[class*="product"], ' +
            'h1, ' +
            'span[class*="WBVLpe"], ' +
            'div[class*="_44qnta"], ' +
            'div[class*="attM6q"], ' +
            'div[class*="V3e_vE"], ' +
            'div[class*="WBVLpe"], ' +
            'span[class*="product-title"]'
        );
        if (titleEl && titleEl.innerText) {
            name = titleEl.innerText.trim();
        }
    }

    if (!name && document.title) {
        name = document.title.replace(/\s*\|\s*Shopee.*$/i, '').replace(/Shopee\s*Thailand/i, '').trim();
    }

    if (!name) {
        try {
            const pathParts = decodeURIComponent(location.pathname).split('-i.')[0].split('/').filter(Boolean);
            if (pathParts.length > 0) {
                name = pathParts[pathParts.length - 1].replace(/-/g, ' ').trim();
            }
        } catch (e) {}
    }

    if (!name) name = `สินค้า Shopee (${itemid})`;

    // 2. Extract Price (Look for ฿ element or price selectors)
    let price = 0;
    const priceEls = document.querySelectorAll(
        'div[class*="product-briefing"] div[class*="price"], ' +
        'div[class*="pqTWkA"], ' +
        'div[class*="G27YHG"], ' +
        'div[class*="IZmjtf"], ' +
        'div[class*="_3n5NQx"], ' +
        'div[class*="product-price"], ' +
        'span[class*="price"]'
    );
    for (const el of priceEls) {
        const txt = el.innerText || '';
        if (txt.includes('฿') || /\d+/.test(txt)) {
            const clean = txt.replace(/[^0-9.]/g, '');
            const p = parseFloat(clean);
            if (p > 0) {
                price = p;
                break;
            }
        }
    }

    // Fallback: search all leaf elements inside briefing that contain ฿
    if (!price) {
        const briefingEls = document.querySelectorAll('div[class*="product-briefing"] *');
        for (const el of briefingEls) {
            if (el.children.length === 0 && (el.innerText || '').includes('฿')) {
                const clean = el.innerText.replace(/[^0-9.]/g, '');
                const p = parseFloat(clean);
                if (p > 0) {
                    price = p;
                    break;
                }
            }
        }
    }

    if (!price) {
        const ogPrice = document.querySelector('meta[property="product:price:amount"]')?.content;
        if (ogPrice) price = parseFloat(ogPrice) || 0;
    }

    // 3. Extract Images (Meta og:image + Gallery images)
    const images = [];
    const ogImg = document.querySelector('meta[property="og:image"]')?.content;
    if (ogImg) images.push(ogImg);

    const galleryImgs = document.querySelectorAll(
        'div[class*="product-briefing"] img, ' +
        'div[class*="page-product"] img, ' +
        'picture img, ' +
        'img[class*="pointer"]'
    );
    galleryImgs.forEach(img => {
        let src = img.src || img.getAttribute('data-src') || '';
        if (src.startsWith('//')) src = 'https:' + src;
        if (src && src.includes('susercontent.com') && !src.includes('avatar') && !images.includes(src)) {
            images.push(src);
        }
    });

    // 4. Extract Variations / Models
    const variants = [];
    const varButtons = document.querySelectorAll(
        'button[class*="product-variation"], ' +
        'button[aria-label], ' +
        'div[class*="product-variation"] button'
    );
    varButtons.forEach((btn, idx) => {
        const vName = btn.innerText?.trim() || btn.getAttribute('aria-label')?.trim() || '';
        if (vName && !vName.includes('฿') && vName.length < 50) {
            const btnImg = (btn && typeof btn.querySelector === 'function' ? btn.querySelector('img')?.src : null) || (images[idx] || images[0] || null);
            variants.push({
                name: vName,
                sku: `SP_${itemid}_${idx + 1}`,
                price: price,
                stock: 10,
                image_url: btnImg
            });
        }
    });

    // 5. Extract Custom Location & Note from Dock
    const rackInput = document.getElementById('sgyver-dock-rack-input');
    const noteInput = document.getElementById('sgyver-dock-note-input');
    const warehouse_location = rackInput?.value?.trim() || 'A-01';
    const location_comment = noteInput?.value?.trim() || '';

    return {
        itemid: String(itemid),
        shopid: String(shopid),
        sku: `SP_${itemid}`,
        name: name,
        price: price,
        stock: 10,
        images: images,
        image_url: images[0] || null,
        variants: variants,
        url: location.href || `https://shopee.co.th/product/${shopid}/${itemid}`,
        warehouse_location: warehouse_location,
        location_comment: location_comment
    };
}

// 13. Single Product Page Floating Dock
function checkAndInjectSingleProductDock() {
    const isProductPage = location.pathname.includes('-i.') || location.pathname.includes('/product/');
    if (!isProductPage) {
        const existing = document.getElementById('sgyver-shopee-detail-dock');
        if (existing) existing.remove();
        return;
    }

    let match = location.pathname.match(/-i\.(\d+)\.(\d+)/) || location.pathname.match(/\/product\/(\d+)\/(\d+)/);
    if (!match) {
        try {
            const dec = decodeURIComponent(location.pathname);
            match = dec.match(/-i\.(\d+)\.(\d+)/) || dec.match(/\/product\/(\d+)\/(\d+)/);
        } catch (e) {}
    }
    if (!match) return;

    const shopid = match[1];
    const itemid = match[2];

    let dock = document.getElementById('sgyver-shopee-detail-dock');
    if (!dock) {
        dock = document.createElement('div');
        dock.id = 'sgyver-shopee-detail-dock';
        document.body.appendChild(dock);
    }

    if (dock.dataset.currentId === itemid) return;
    dock.dataset.currentId = itemid;

    const isScraped = scrapedCache.has(String(itemid));
    const cached = scrapedCache.get(String(itemid));

    dock.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #059669, #0f766e);
            color: white;
            padding: 14px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        ">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">📦</span>
                <span style="font-weight: 700; font-size: 13.5px;">S-Gyver Scraper</span>
            </div>
            <button id="sgyver-dock-toggle-btn" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                border-radius: 6px;
                padding: 2px 7px;
                font-size: 11px;
                cursor: pointer;
            ">ซ่อน</button>
        </div>
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 12px;">
            <!-- Status Pill -->
            <div style="
                padding: 6px 12px;
                border-radius: 12px;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 6px;
                background: ${isScraped ? '#f0fdf4' : '#f8fafc'};
                color: ${isScraped ? '#166534' : '#64748b'};
                border: 1px solid ${isScraped ? '#bbf7d0' : '#e2e8f0'};
            ">
                <span>${isScraped ? '✅ เคยดูดเข้าคลังแล้ว' : '⚪ ยังไม่เคยดูดสินค้านี้'}</span>
                ${isScraped ? `<span style="font-size: 10px; opacity: 0.8; margin-left: auto;">${cached?.time || ''}</span>` : ''}
            </div>

            <!-- Custom Location / Rack -->
            <div>
                <label style="font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">📍 พิกัดชั้นวาง (Rack / Location):</label>
                <input id="sgyver-dock-rack-input" type="text" value="A-01" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 12px;
                    box-sizing: border-box;
                " />
            </div>

            <!-- Custom Note -->
            <div>
                <label style="font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">💬 หมายเหตุจุดเก็บ / คอมเมนต์:</label>
                <input id="sgyver-dock-note-input" type="text" placeholder="เช่น ชั้น 2 กล่องสีเขียว" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 12px;
                    box-sizing: border-box;
                " />
            </div>

            <!-- Big Scrape CTA -->
            <button id="sgyver-dock-scrape-btn" style="
                width: 100%;
                padding: 11px;
                background: ${isScraped ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #ea580c, #f97316)'};
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: transform 0.2s;
            ">
                <span>⚡</span>
                <span>${isScraped ? 'ดูดซ้ำเพื่ออัปเดตข้อมูล' : 'ดูดสินค้านี้เข้า S-Gyver ทันที'}</span>
            </button>
        </div>
    `;

    const toggleBtn = dock.querySelector('#sgyver-dock-toggle-btn');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            dock.style.display = dock.style.display === 'none' ? 'flex' : 'none';
        };
    }

    const scrapeBtn = dock.querySelector('#sgyver-dock-scrape-btn');
    if (scrapeBtn) {
        scrapeBtn.onclick = async () => {
            scrapeBtn.innerHTML = `<span>⏳</span><span>กำลังดูดข้อมูล...</span>`;
            scrapeBtn.style.opacity = '0.7';

            const rackVal = dock.querySelector('#sgyver-dock-rack-input')?.value || 'A-01';
            const noteVal = dock.querySelector('#sgyver-dock-note-input')?.value || '';

            const success = await doScrapeItem(itemid, shopid, null, isScraped);
            if (success) {
                dock.dataset.currentId = '';
                checkAndInjectSingleProductDock();
            } else {
                scrapeBtn.innerHTML = `<span>⚠️</span><span>ลองใหม่อีกครั้ง</span>`;
                scrapeBtn.style.opacity = '1';
            }
        };
    }
}

// 14. Bottom Batch Bar for Whole Page
function updateBatchBar() {
    const isProductPage = location.pathname.includes('-i.') || location.pathname.includes('/product/');
    if (isProductPage) {
        const bar = document.getElementById('sgyver-shopee-batch-bar');
        if (bar) bar.remove();
        lastBatchSig = '';
        return;
    }

    const cards = document.querySelectorAll('.sgyver-card-wrapper');
    if (cards.length < 2) {
        const bar = document.getElementById('sgyver-shopee-batch-bar');
        if (bar) bar.remove();
        lastBatchSig = '';
        return;
    }

    let total = cards.length;
    let scrapedCount = 0;
    const unscrapedItems = [];

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const overlay = card.querySelector('.sgyver-card-overlay');
        const itemid = overlay ? overlay.dataset.itemid : null;
        const shopid = overlay ? overlay.dataset.shopid : null;

        if (itemid && scrapedCache.has(String(itemid))) {
            scrapedCount++;
        } else if (itemid && shopid) {
            unscrapedItems.push({ itemid, shopid, overlay });
        }
    }

    const unscrapedCount = unscrapedItems.length;
    const currentSig = `${total}_${scrapedCount}_${unscrapedCount}`;
    if (currentSig === lastBatchSig) return;
    lastBatchSig = currentSig;

    let bar = document.getElementById('sgyver-shopee-batch-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'sgyver-shopee-batch-bar';
        document.body.appendChild(bar);
    }

    bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📦</span>
            <span style="color: #38bdf8; font-weight: 800;">S-Gyver Scraper:</span>
            <span>พบ <b>${total}</b> รายการ</span>
            <span style="color: #4ade80;">(✅ ดูดแล้ว ${scrapedCount})</span>
        </div>
        ${unscrapedCount > 0 ? `
            <button id="sgyver-batch-scrape-all-btn" class="sgyver-batch-btn" title="ดูดสินค้าทุกชิ้นในหน้านี้ พร้อมเลื่อนหน้าจอลงล่างอัตโนมัติ">
                <span>⚡</span>
                <span>ดูดทั้งหน้าอัตโนมัติ (Auto-Scroll)</span>
            </button>
            <button id="sgyver-batch-auto-pages-btn" class="sgyver-batch-btn" style="background: linear-gradient(135deg, #6366f1, #3b82f6) !important;" title="ดูดหน้านี้แล้วเปิดหน้าถัดไปอัตโนมัติ">
                <span>⏩</span>
                <span>ดูด + ไปหน้าถัดไปอัตโนมัติ</span>
            </button>
        ` : `
            <span style="color: #86efac; font-size: 12px; font-weight: 700;">🎉 ดูดครบทุกชิ้นในหน้านี้แล้ว!</span>
            <button id="sgyver-batch-auto-pages-btn" class="sgyver-batch-btn" style="background: linear-gradient(135deg, #6366f1, #3b82f6) !important;" title="ไปหน้าถัดไปเพื่อดูดต่อ">
                <span>⏩</span>
                <span>ไปหน้าถัดไป</span>
            </button>
        `}
        <button id="sgyver-batch-reset-btn" class="sgyver-batch-reset-btn" title="ล้างประวัติการดูดทั้งหมด เพื่อเริ่มดูดใหม่">
            <span>🔄</span>
            <span>รีเซ็ตเริ่มใหม่</span>
        </button>
        <button id="sgyver-batch-close-btn" style="
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 14px;
            cursor: pointer;
            padding: 2px 6px;
        ">✕</button>
    `;

    const closeBtn = bar.querySelector('#sgyver-batch-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => bar.remove();
    }

    const resetBtn = bar.querySelector('#sgyver-batch-reset-btn');
    if (resetBtn) {
        resetBtn.onclick = () => resetAllScrapedStatus();
    }

    let isAutoBatchRunning = false;

    async function runAutoBatchScrapeWithScroll(btnEl) {
        if (isAutoBatchRunning) {
            isAutoBatchRunning = false;
            btnEl.innerHTML = `<span>⏹️</span><span>หยุดการดูดแล้ว</span>`;
            return;
        }

        isAutoBatchRunning = true;
        let totalScrapedInSession = 0;
        let consecutiveEmptyPasses = 0;

        showScraperToast(`🚀 เริ่มระบบดูดสินค้าทั้งหน้าอัตโนมัติ (พร้อมเลื่อนจอให้อัตโนมัติ)...`);

        while (isAutoBatchRunning) {
            scanAndDecorateCards();
            const cards = Array.from(document.querySelectorAll('.sgyver-card-wrapper'));
            const pendingTargets = [];

            for (const card of cards) {
                const overlay = card.querySelector('.sgyver-card-overlay');
                const itemid = overlay?.dataset?.itemid;
                const shopid = overlay?.dataset?.shopid;
                if (itemid && !scrapedCache.has(String(itemid))) {
                    pendingTargets.push({ itemid, shopid, overlay, card });
                }
            }

            if (pendingTargets.length > 0) {
                consecutiveEmptyPasses = 0;
                for (const target of pendingTargets) {
                    if (!isAutoBatchRunning) break;
                    totalScrapedInSession++;
                    btnEl.innerHTML = `<span>⏳</span><span>กำลังดูด (${totalScrapedInSession} ชิ้น) [คลิกเพื่อหยุด]</span>`;
                    
                    target.card.style.outline = '3px solid #f97316';
                    target.card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                    await doScrapeItem(target.itemid, target.shopid, target.overlay, false);
                    target.card.style.outline = '';
                    await new Promise(r => setTimeout(r, 450));
                }
            } else {
                consecutiveEmptyPasses++;
            }

            const isAtBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 250);

            if (isAtBottom && consecutiveEmptyPasses >= 2) {
                break;
            }

            btnEl.innerHTML = `<span>📜</span><span>กำลังเลื่อนจอเพื่อโหลดสินค้าถัดไป...</span>`;
            window.scrollBy({ top: 800, behavior: 'smooth' });
            await new Promise(r => setTimeout(r, 1000));
            scanAndDecorateCards();
        }

        isAutoBatchRunning = false;
        btnEl.innerHTML = `<span>🎉</span><span>ดูดเสร็จสิ้น (${totalScrapedInSession} รายการ)</span>`;
        showScraperToast(`🎉 ดูดสินค้าครบถ้วนแล้วทั้งหมด ${totalScrapedInSession} รายการ!`);
        setTimeout(updateBatchBar, 2500);
    }

    const autoPagesBtn = bar.querySelector('#sgyver-batch-auto-pages-btn');
    if (autoPagesBtn) {
        autoPagesBtn.onclick = async () => {
            await runAutoBatchScrapeWithScroll(autoPagesBtn);

            // Click Next Page
            const nextBtn = document.querySelector(
                'button.shopee-icon-button--right, ' +
                'a.shopee-icon-button--right, ' +
                'button[class*="arrow-right"], ' +
                'a[class*="next-btn"], ' +
                'div[class*="pagination"] button:last-child, ' +
                'div[class*="mini-page-controller"] button:last-child'
            );

            if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('shopee-button-outline--disabled')) {
                autoPagesBtn.innerHTML = `<span>⏩</span><span>กำลังเปิดหน้าถัดไป...</span>`;
                nextBtn.click();
                showScraperToast('⏩ กำลังเปิดหน้าถัดไปเพื่อตรวจจับและดูดสินค้าต่อ...');
            } else {
                autoPagesBtn.innerHTML = `<span>🎉</span><span>ดูดครบทุกหน้าแล้ว!</span>`;
            }
        };
    }

    const batchBtn = bar.querySelector('#sgyver-batch-scrape-all-btn');
    if (batchBtn) {
        batchBtn.onclick = () => runAutoBatchScrapeWithScroll(batchBtn);
    }
}

// 15. Reset Scraped Status Function (Start Fresh)
async function resetAllScrapedStatus() {
    if (!confirm('ต้องการรีเซ็ตสถานะสินค้าทั้งหมดเป็น "ยังไม่ได้ดูด" ใช่หรือไม่?\n\n(ระบบจะล้างประวัติการดูด เพื่อให้คุณสามารถเริ่มกดดูดสินค้าใหม่ได้ทั้งหมดทันที)')) {
        return;
    }

    // 1. Clear in-memory cache
    scrapedCache.clear();

    // 2. Clear localStorage on Shopee
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sgyver_copied_')) {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    // 3. Clear chrome.storage.local
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'CLEAR_ALL_SCRAPED_ITEMS' });
        }
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(null, (items) => {
                const keys = Object.keys(items || {}).filter(k => k.startsWith('sgyver_copied_'));
                if (keys.length > 0) chrome.storage.local.remove(keys);
            });
        }
    } catch (e) {}

    // 4. Force re-render all card overlays on DOM
    const overlays = document.querySelectorAll('.sgyver-card-overlay');
    overlays.forEach(overlay => {
        const itemid = overlay.dataset.itemid;
        const shopid = overlay.dataset.shopid;
        overlay.dataset.status = ''; // Invalidate targetStatus to force re-render
        renderCardOverlay(overlay, itemid, shopid, false);
    });

    // 5. Force update single dock if open
    checkAndInjectSingleProductDock();

    // 6. Force update batch bar & floating hub
    lastBatchSig = '';
    updateBatchBar();
    updateFloatingHub();

    showScraperToast('🎉 รีเซ็ตสำเร็จ! สินค้าทั้งหมดกลับเป็นสถานะพร้อมดูดใหม่แล้ว');
}

// 16. Toast Notification System
function showScraperToast(message, isError = false) {
    let toast = document.createElement('div');
    toast.className = 'sgyver-toast';
    if (isError) toast.style.borderColor = '#ef4444';

    toast.innerHTML = `
        <div style="font-size: 20px;">${isError ? '⚠️' : '🎉'}</div>
        <div style="flex: 1; font-size: 12.5px; line-height: 1.4;">${message}</div>
        <button type="button" style="
            background: transparent;
            border: none;
            color: white;
            opacity: 0.7;
            cursor: pointer;
            font-size: 14px;
        ">✕</button>
    `;

    document.body.appendChild(toast);
    toast.querySelector('button').onclick = () => toast.remove();
    setTimeout(() => { if (toast && toast.parentNode) toast.remove(); }, 6000);
}

// 16. Consolidated Scan Pass
function runScanPass() {
    scanAndDecorateCards();
    checkAndInjectSingleProductDock();
    updateBatchBar();
    updateFloatingHub();
}

// 17. Master Initialization Function
function initConsumerShopeeScraper() {
    if (isScraperInitialized) return;
    isScraperInitialized = true;

    // Connect to background script
    keepBackgroundAlive();

    // Inject styles
    injectShopeeScraperStyles();

    // Load cached scraped IDs
    loadScrapedCache();

    // Inject permanent floating hub pill immediately
    injectOrUpdateFloatingHub();

    // Initial scans: staggered to handle React client-side hydration
    runScanPass();
    setTimeout(runScanPass, 400);
    setTimeout(runScanPass, 1200);
    setTimeout(runScanPass, 2500);
    setTimeout(runScanPass, 4500);

    // Optimized mutation observer
    function scheduleOptimizedScan(delay = 350) {
        if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
        scanDebounceTimer = setTimeout(() => {
            runScanPass();
        }, delay);
    }

    const observer = new MutationObserver((mutations) => {
        let hasShopeeMutation = false;
        for (let i = 0; i < mutations.length; i++) {
            const m = mutations[i];
            const target = m.target;
            if (target && target.nodeType === 1) {
                if (target.id && target.id.startsWith('sgyver-')) continue;
                if (target.classList && (
                    target.classList.contains('sgyver-card-overlay') || 
                    target.classList.contains('sgyver-card-wrapper') ||
                    target.classList.contains('sgyver-badge-scraped') ||
                    target.classList.contains('sgyver-btn-scrape-card') ||
                    target.classList.contains('sgyver-toast')
                )) {
                    continue;
                }
            }
            hasShopeeMutation = true;
            break;
        }

        if (hasShopeeMutation) {
            scheduleOptimizedScan(350);
        }
    });

    const rootTarget = document.documentElement || document.body;
    if (rootTarget) {
        observer.observe(rootTarget, { childList: true, subtree: true });
    }

    // Scroll listener for dynamic infinite-scroll pagination
    let scrollTimeout = null;
    window.addEventListener('scroll', () => {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                scrollTimeout = null;
                scheduleOptimizedScan(250);
            }, 600);
        }
    }, { passive: true });

    // Idle heartbeat (every 6 seconds)
    setInterval(() => {
        scheduleOptimizedScan(50);
    }, 6000);
}

// 18. Self-Bootstrapping Execution
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsumerShopeeScraper);
} else {
    initConsumerShopeeScraper();
}
