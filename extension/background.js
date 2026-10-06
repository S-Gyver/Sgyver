/**
 * S-Gyver Assistant Background Service Worker
 * Coordinates between BigSeller, S-Gyver Web, and Supabase
 */

console.log('🌟 [S-Gyver Assistant] Background Worker Initialized');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PULL_ORDERS_FROM_BIGSELLER') {
        handlePullOrders(sendResponse);
        return true; // Keep message channel open for asynchronous response
    } else if (request.action === 'SYNC_ORDERS_TO_SUPABASE') {
        syncToSupabase(request.orders).then(() => {
            sendResponse({ success: true });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }
});

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
            body: JSON.stringify(orders)
        });
        console.log('✅ [Background] Successfully synced orders to Supabase Cloud');
    } catch (e) {
        console.error('❌ [Background] Failed to sync to Supabase:', e);
    }
}
