/**
 * S-Gyver Assistant Background Service Worker
 * Coordinates between BigSeller, S-Gyver Web, and Supabase
 */

console.log('🌟 [S-Gyver Assistant] Background Worker Initialized');

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
            for (const tab of tabs) {
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_BIGSELLER_ORDERS' });
                    if (response && Array.isArray(response.orders) && response.orders.length > 0) {
                        combinedOrders = response.orders;
                        await chrome.storage.local.set({ lastExtractedOrders: combinedOrders });
                        break;
                    }
                } catch (tabErr) {
                    console.warn('Error querying tab:', tab.id, tabErr);
                }
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
