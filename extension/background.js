/**
 * S-Gyver Assistant Background Service Worker
 * Coordinates between BigSeller, S-Gyver Web, and Supabase
 */

console.log('🌟 [S-Gyver Assistant] Background Worker Initialized');

// Maintain active port connection with open tabs (prevents premature suspension in Firefox)
chrome.runtime.onConnect.addListener((port) => {
    // Keep alive channel
    port.onDisconnect.addListener(() => {
        // Disconnected
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PULL_ORDERS_FROM_BIGSELLER') {
        handlePullOrders(sendResponse);
        return true; // Keep message channel open for asynchronous response
    } else if (request.action === 'AUTO_BROADCAST_ORDERS') {
        broadcastOrdersToSgyver(request.orders);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'UPDATE_ORDER_STATUS') {
        broadcastStatusUpdateToSgyver(request.orderIds, request.status, request.platformStatus);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'SYNC_ORDERS_TO_SUPABASE') {
        syncToSupabase(request.orders).then(() => {
            sendResponse({ success: true });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    } else if (request.action === 'AUTO_BROADCAST_PRODUCT') {
        broadcastProductToSgyver(request.product);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'SAVE_SCRAPED_PRODUCT_TO_SUPABASE') {
        syncProductToSupabase(request.product).then((res) => {
            sendResponse({ success: true, data: res });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    } else if (request.action === 'GET_ALL_SCRAPED_ITEMS') {
        chrome.storage.local.get(null, (items) => {
            const map = {};
            for (const k in items) {
                if (k.startsWith('sgyver_copied_')) {
                    map[k.replace('sgyver_copied_', '')] = items[k];
                }
            }
            sendResponse({ success: true, items: map });
        });
        return true;
    } else if (request.action === 'CLEAR_ALL_SCRAPED_ITEMS') {
        chrome.storage.local.get(null, (items) => {
            const keysToRemove = [];
            for (const k in items) {
                if (k.startsWith('sgyver_copied_')) {
                    keysToRemove.push(k);
                }
            }
            if (keysToRemove.length > 0) {
                chrome.storage.local.remove(keysToRemove, () => {
                    sendResponse({ success: true, count: keysToRemove.length });
                });
            } else {
                sendResponse({ success: true, count: 0 });
            }
        });
        return true;
    } else if (request.action === 'REGISTER_SHOPEE_ITEM') {
        const { itemid, product } = request;
        if (itemid && product) {
            registeredShopeeItems.set(String(itemid), product);
        }
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'FETCH_SHOPEE_PRODUCT_FULL') {
        const { itemid, shopid } = request;
        // 1. Check in-memory registered items
        if (registeredShopeeItems.has(String(itemid))) {
            const cached = registeredShopeeItems.get(String(itemid));
            if (cached && cached.images && cached.images.length > 1) {
                sendResponse({ success: true, data: cached });
                return true;
            }
        }

        // 2. Query open Shopee tabs to fetch from page context (with valid session cookies)
        queryShopeeTabForDetails(itemid, shopid).then(data => {
            if (data && data.name) {
                registeredShopeeItems.set(String(itemid), data);
                sendResponse({ success: true, data: data });
            } else {
                // 3. Fallback to direct fetchShopeeFullItem
                fetchShopeeFullItem(itemid, shopid).then(fallbackData => {
                    sendResponse({ success: true, data: fallbackData });
                }).catch(err => {
                    sendResponse({ success: false, error: err.message });
                });
            }
        }).catch(() => {
            fetchShopeeFullItem(itemid, shopid).then(fallbackData => {
                sendResponse({ success: true, data: fallbackData });
            }).catch(err => {
                sendResponse({ success: false, error: err.message });
            });
        });
        return true;
    }
});

// Cache for products dragged/scraped from Shopee
const registeredShopeeItems = new Map();

// Helper: Query active Shopee tab to fetch item details directly inside Shopee's authenticated session
async function queryShopeeTabForDetails(itemid, shopid) {
    return new Promise((resolve) => {
        try {
            chrome.tabs.query({ url: ["*://*.shopee.co.th/*", "*://shopee.co.th/*"] }, (tabs) => {
                if (!tabs || tabs.length === 0) return resolve(null);
                let resolved = false;
                let pending = tabs.length;
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'FETCH_ITEM_DETAILS_FROM_SHOPEE_PAGE',
                        itemid,
                        shopid
                    }, (response) => {
                        pending--;
                        if (!resolved && response && response.success && response.data) {
                            resolved = true;
                            resolve(response.data);
                        } else if (pending === 0 && !resolved) {
                            resolve(null);
                        }
                    });
                });
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        resolve(null);
                    }
                }, 4000);
            });
        } catch (e) {
            resolve(null);
        }
    });
}

// Sniff and capture Shopee anti-bot headers (af-ac-enc-dat, x-api-source, etc.) - BigSeller Technique
let lastShopeeHeaders = {};
if (typeof chrome !== 'undefined' && chrome.webRequest && chrome.webRequest.onBeforeSendHeaders) {
    try {
        chrome.webRequest.onBeforeSendHeaders.addListener(
            (details) => {
                if (details.requestHeaders && details.requestHeaders.length) {
                    for (let i = 0; i < details.requestHeaders.length; i++) {
                        const h = details.requestHeaders[i];
                        const nameLower = h.name.toLowerCase();
                        if (nameLower === 'af-ac-enc-dat' || nameLower.startsWith('x-shopee') || nameLower === 'x-api-source' || nameLower === 'x-csrftoken') {
                            lastShopeeHeaders[h.name] = h.value;
                        }
                    }
                }
            },
            { urls: ["*://*.shopee.co.th/api/v4/*", "*://shopee.co.th/api/v4/*"] },
            ["requestHeaders"]
        );
    } catch (e) {}
}

async function fetchShopeeFullItem(itemid, shopid) {
    if (!itemid) throw new Error('Missing itemid');
    let data = null;

    const requestHeaders = Object.assign({
        'Accept': 'application/json',
        'Referer': 'https://shopee.co.th/',
        'X-Requested-With': 'XMLHttpRequest'
    }, lastShopeeHeaders);

    // 1. Try modern PDP endpoint
    try {
        const res = await fetch(`https://shopee.co.th/api/v4/pdp/get_pc?item_id=${itemid}&shop_id=${shopid || ''}`, {
            headers: requestHeaders,
            credentials: 'include'
        });
        if (res.ok) {
            const j = await res.json();
            if (j && (j.data || j.item)) data = j.data || j.item;
        }
    } catch (e) {}

    // 2. Try classic item/get endpoint
    if (!data) {
        try {
            const res = await fetch(`https://shopee.co.th/api/v4/item/get?itemid=${itemid}&shopid=${shopid || ''}`, {
                headers: requestHeaders,
                credentials: 'include'
            });
            if (res.ok) {
                const j = await res.json();
                if (j && j.data) data = j.data;
            }
        } catch (e) {}
    }

    if (!data) throw new Error('ไม่สามารถดึงข้อมูลสินค้าจาก Shopee API ได้');

    const images = [];
    if (data.images && Array.isArray(data.images)) {
        data.images.forEach(img => {
            images.push(img.startsWith('http') ? img : `https://down-th.img.susercontent.com/file/${img}`);
        });
    } else if (data.image) {
        images.push(data.image.startsWith('http') ? data.image : `https://down-th.img.susercontent.com/file/${data.image}`);
    }

    let videoUrl = '';
    if (data.video_info_list && data.video_info_list.length > 0) {
        const v = data.video_info_list[0];
        videoUrl = (v.default_format && v.default_format.url) || (v.formats && v.formats[0] && v.formats[0].url) || '';
    }

    let rawPrice = data.price || data.price_min || 0;
    if (rawPrice > 100000) rawPrice = rawPrice / 100000;

    let minPrice = (data.price_min > 100000) ? data.price_min / 100000 : (data.price_min || rawPrice);
    let maxPrice = (data.price_max > 100000) ? data.price_max / 100000 : (data.price_max || rawPrice);

    const variants = [];
    if (data.models && Array.isArray(data.models)) {
        data.models.forEach((m, idx) => {
            let mPrice = m.price ? (m.price / 100000) : rawPrice;
            let imgUrl = null;
            if (m.extinfo && Array.isArray(m.extinfo.tier_index) && data.tier_variations) {
                const t0 = m.extinfo.tier_index[0];
                const tier0 = data.tier_variations[0];
                if (tier0 && tier0.images && tier0.images[t0]) {
                    imgUrl = `https://down-th.img.susercontent.com/file/${tier0.images[t0]}`;
                }
            }
            variants.push({
                name: m.name || `ตัวเลือกที่ ${idx + 1}`,
                sku: (m.sku || m.model_sku || `SP_${itemid}_${idx + 1}`).trim(),
                price: mPrice,
                stock: (m.stock !== undefined) ? m.stock : (m.normal_stock || 10),
                image_url: imgUrl || images[0] || null
            });
        });
    }

    const categories = [];
    if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach(c => {
            if (c.display_name) categories.push(c.display_name);
        });
    }

    return {
        source: 'SGYVER_SHOPEE_IMPORT',
        version: '2.0',
        extracted_at: new Date().toISOString(),
        itemid: String(itemid),
        shopid: String(shopid || ''),
        sku: `SP_${itemid}`,
        name: (data.name || '').trim(),
        price: rawPrice,
        price_min: minPrice,
        price_max: maxPrice,
        stock: parseInt(data.stock || 10, 10),
        images: images.slice(0, 15),
        image_url: images[0] || null,
        video_url: videoUrl,
        description: data.description || '',
        variants: variants,
        categories: categories,
        url: `https://shopee.co.th/product/${shopid || '0'}/${itemid}`,
        warehouse_location: 'A-01'
    };
}

async function broadcastOrdersToSgyver(orders) {
    try {
        if (!Array.isArray(orders) || orders.length === 0) return;
        await chrome.storage.local.set({ lastExtractedOrders: orders });

        // Query tabs that have S-Gyver Studio open
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.url && (tab.url.includes('shopee_orders') || tab.url.includes('Sgyver') || tab.url.includes('s-gyver'))) {
                try {
                    chrome.tabs.sendMessage(tab.id, { action: 'AUTO_ORDER_UPDATE', orders: orders });
                } catch (e) {
                    // Ignore inactive tab errors
                }
            }
        }
    } catch (e) {
        console.error('Error broadcasting orders:', e);
    }
}

async function broadcastStatusUpdateToSgyver(orderIds, status, platformStatus) {
    try {
        if (!Array.isArray(orderIds) || orderIds.length === 0) return;

        // Also update cached orders in storage if present
        const stored = await chrome.storage.local.get(['lastExtractedOrders']);
        if (stored && Array.isArray(stored.lastExtractedOrders)) {
            stored.lastExtractedOrders.forEach(o => {
                if (orderIds.includes(o.order_id || o.orderId)) {
                    o.status = status;
                    if (platformStatus) o.platform_status = platformStatus;
                }
            });
            await chrome.storage.local.set({ lastExtractedOrders: stored.lastExtractedOrders });
        }

        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.url && (tab.url.includes('shopee_orders') || tab.url.includes('Sgyver') || tab.url.includes('s-gyver'))) {
                try {
                    chrome.tabs.sendMessage(tab.id, { 
                        action: 'AUTO_ORDER_STATUS_UPDATE', 
                        orderIds: orderIds, 
                        status: status, 
                        platformStatus: platformStatus 
                    });
                } catch (e) {}
            }
        }
    } catch (e) {
        console.error('Error broadcasting status update:', e);
    }
}

async function handlePullOrders(sendResponse) {
    try {
        // 1. Check if orders were recently extracted into Chrome Storage
        const stored = await chrome.storage.local.get(['lastExtractedOrders']);
        let combinedOrders = stored.lastExtractedOrders || [];

        // 2. Search for any open BigSeller tabs to extract fresh orders
        const tabs = await chrome.tabs.query({ url: '*://*.bigseller.com/*' });

        if (tabs.length > 0) {
            const allExtracted = [];
            const seenIds = new Set();
            for (const tab of tabs) {
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_BIGSELLER_ORDERS' });
                    if (response && Array.isArray(response.orders) && response.orders.length > 0) {
                        response.orders.forEach(o => {
                            const id = o.order_id || o.orderId;
                            if (id && !seenIds.has(id)) {
                                seenIds.add(id);
                                allExtracted.push(o);
                            }
                        });
                    }
                } catch (tabErr) {
                    console.warn('Error querying tab:', tab.id, tabErr);
                }
            }
            if (allExtracted.length > 0) {
                combinedOrders = allExtracted;
                await chrome.storage.local.set({ lastExtractedOrders: combinedOrders });
            }
        }

        if (combinedOrders.length === 0) {
            sendResponse({
                success: false,
                message: 'ไม่พบรายการออเดอร์ กรุณาเปิดหน้า "คำสั่งดำเนินการ" ใน BigSeller แล้วลองใหม่อีกครั้งครับ'
            });
            return;
        }

        // 3. Sync extracted orders to Supabase
        await syncToSupabase(combinedOrders);

        sendResponse({
            success: true,
            orders: combinedOrders,
            message: `ดึงสำเร็จ ${combinedOrders.length} ออเดอร์จาก BigSeller และบันทึกลงระบบแล้ว!`
        });
    } catch (err) {
        console.error('Pull orders exception:', err);
        sendResponse({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + err.message
        });
    }
}

async function syncToSupabase(orders) {
    const SUPABASE_URL = 'https://igiihteeeprpcxxlldkd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';

    try {
        const cleanPayload = orders.map(o => ({
            order_id: o.order_id,
            platform: o.platform,
            shop_name: o.shop_name,
            recipient_name: o.recipient_name,
            phone: o.phone,
            address: o.address,
            province: o.province,
            district: o.district,
            zipcode: o.zipcode,
            carrier: o.carrier,
            tracking_number: o.tracking_number,
            total_items: o.total_items,
            total_amount: o.total_amount,
            items: o.items,
            status: o.status || 'READY_TO_SHIP',
            updated_at: o.updated_at || new Date().toISOString()
        }));

        await fetch(`${SUPABASE_URL}/rest/v1/ecommerce_orders`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Accept-Profile': 'public',
                'Content-Profile': 'public',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(cleanPayload)
        });
        console.log('✅ [Background] Successfully synced orders to Supabase Cloud');
    } catch (e) {
        console.error('❌ [Background] Failed to sync to Supabase:', e);
    }
}

async function broadcastProductToSgyver(product) {
    try {
        if (!product) return;
        await chrome.storage.local.set({ lastScrapedProduct: product });

        // Query tabs that have S-Gyver Studio / Inventory open
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.url && (tab.url.includes('inventory') || tab.url.includes('product_labels') || tab.url.includes('sgyver') || tab.url.includes('s-gyver'))) {
                try {
                    chrome.tabs.sendMessage(tab.id, { action: 'AUTO_PRODUCT_UPDATE', product: product });
                } catch (e) {
                    // Ignore inactive tab
                }
            }
        }
    } catch (e) {
        console.error('Error broadcasting product:', e);
    }
}

async function syncProductToSupabase(product) {
    const SUPABASE_URL = 'https://igiihteeeprpcxxlldkd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';

    if (!product || !product.name) throw new Error('Invalid product payload');

    const sku = (product.sku || (product.itemid ? `SP_${product.itemid}` : `SP_${Date.now()}`)).trim();
    const payload = {
        sku: sku,
        name: (product.name || '').substring(0, 120),
        variant: product.variant || (product.models && product.models.length > 0 ? `${product.models.length} ตัวเลือก` : 'ค่าเริ่มต้น'),
        price: parseFloat(product.price || 0),
        stock_quantity: parseInt(product.stock || 10, 10),
        min_stock_alert: 5,
        warehouse_location: product.warehouse_location || product.location || 'A-01',
        image_url: product.image_url || (Array.isArray(product.images) && product.images[0]) || null,
        distributor: product.distributor || (product.shopid ? `Shopee Shop ${product.shopid}` : 'Shopee Scraper'),
        updated_at: new Date().toISOString()
    };

    // If extra columns exist in database:
    if (product.url) payload.product_url = product.url;
    if (product.location_comment) payload.location_comment = product.location_comment;
    if (product.location_photo) payload.location_photo = product.location_photo;

    // Use safe fetch with column pruning if needed
    const doUpsert = async (bodyObj) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/product_labels`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Accept-Profile': 'public',
                'Content-Profile': 'public',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(bodyObj)
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const errMsg = errJson.message || '';
            // If column does not exist in schema, prune it and retry
            const colMatch = errMsg.match(/column "?([a-zA-Z0-9_]+)"? of relation "product_labels" does not exist/i) ||
                             errMsg.match(/Could not find the '([a-zA-Z0-9_]+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] in bodyObj) {
                const pruned = { ...bodyObj };
                delete pruned[colMatch[1]];
                return doUpsert(pruned);
            }
            throw new Error(errMsg || `HTTP ${res.status}`);
        }
        return res;
    };

    return await doUpsert(payload);
}
