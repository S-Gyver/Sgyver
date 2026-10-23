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
    }
});

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
