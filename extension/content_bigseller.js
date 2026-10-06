/**
 * S-Gyver Assistant Content Script for BigSeller
 * Extracts Order data & tokens from BigSeller (Account 1 & Account 2)
 */

console.log('🤖 [S-Gyver Assistant] Connected to BigSeller page');

// 1. Save Active Token & User info to Chrome Storage
function detectAndSaveSession() {
    try {
        const token = localStorage.getItem('token') || 
                      localStorage.getItem('_b_token') || 
                      sessionStorage.getItem('token');
                      
        const userInfo = localStorage.getItem('userInfo') || 
                         localStorage.getItem('user');

        if (token) {
            chrome.storage.local.set({ 
                lastBigSellerToken: token,
                lastBigSellerUser: userInfo ? JSON.parse(userInfo) : null,
                lastUpdated: Date.now()
            });
            console.log('🔑 [S-Gyver Assistant] BigSeller Session Token cached successfully');
        }
    } catch (e) {
        console.warn('Session detection warning:', e);
    }
}

// 2. Add Floating S-Gyver Quick Sync Button in BigSeller
function injectBigSellerFloatButton() {
    if (document.getElementById('sgyver-quick-sync-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'sgyver-quick-sync-btn';
    btn.innerHTML = `
        <div style="
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            background: linear-gradient(135deg, #4f46e5, #06b6d4);
            color: white;
            padding: 12px 20px;
            border-radius: 50px;
            box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
            font-family: sans-serif;
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
        ">
            <span>🚀</span>
            <span>ส่งออเดอร์เข้า S-Gyver (1-Click)</span>
        </div>
    `;

    btn.addEventListener('click', handleBigSellerExtractAndSend);
    btn.addEventListener('mouseenter', () => {
        btn.firstElementChild.style.transform = 'translateY(-3px) scale(1.03)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.firstElementChild.style.transform = 'translateY(0) scale(1)';
    });

    document.body.appendChild(btn);
}

// 3. Extract Order Table from Current BigSeller Screen
async function handleBigSellerExtractAndSend() {
    const btnText = document.querySelector('#sgyver-quick-sync-btn span:last-child');
    if (btnText) btnText.textContent = '⏳ กำลังสกัดออเดอร์...';

    try {
        const orders = extractOrdersFromDom();
        if (orders.length === 0) {
            alert('⚠️ ไม่พบรายการออเดอร์ในหน้านี้ กรุณาเปิดหน้า "คำสั่งซื้อ (Orders)" หรือ "รอจัดส่ง (To Ship)" ใน BigSeller ก่อนกดส่งครับ');
            if (btnText) btnText.textContent = '🚀 ส่งออเดอร์เข้า S-Gyver (1-Click)';
            return;
        }

        // 1. Save directly to Chrome Local Storage (Instant Bridge to S-Gyver Web)
        chrome.storage.local.set({ 
            lastExtractedOrders: orders,
            lastSyncTime: Date.now()
        }, () => {
            console.log('📦 [S-Gyver Assistant] Saved', orders.length, 'orders to chrome.storage.local');
        });

        // 2. Delegate Supabase Sync to Background Service Worker (Bypasses BigSeller CSP)
        chrome.runtime.sendMessage({ action: 'SYNC_ORDERS_TO_SUPABASE', orders: orders }, (res) => {
            console.log('[Supabase Background Sync Response]:', res);
        });

        // 3. UI Success Notification
        if (btnText) btnText.textContent = `✅ ส่งเข้า S-Gyver สำเร็จ ${orders.length} ออเดอร์!`;
        setTimeout(() => {
            if (btnText) btnText.textContent = '🚀 ส่งออเดอร์เข้า S-Gyver (1-Click)';
        }, 3500);

    } catch (err) {
        console.error('Extract error:', err);
        alert('เกิดข้อผิดพลาดในการดึงออเดอร์: ' + err.message);
        if (btnText) btnText.textContent = '🚀 ส่งออเดอร์เข้า S-Gyver (1-Click)';
    }
}

// 4. Precision DOM & Visual Element Parser for BigSeller Order Tables
function extractOrdersFromDom() {
    const extracted = [];
    const containers = findOrderContainers();

    containers.forEach((container) => {
        try {
            const parsed = parseOrderContainer(container);
            if (parsed) extracted.push(parsed);
        } catch (err) {
            console.warn('Error parsing container:', err);
        }
    });

    // Fallback: If containers didn't catch, parse using DOM rows
    if (extracted.length === 0) {
        const rows = Array.from(document.querySelectorAll('tr, .el-table__row, .ant-table-row'));
        rows.forEach(r => {
            const parsed = parseOrderContainer(r);
            if (parsed) extracted.push(parsed);
        });
    }

    // Deduplicate by order_id
    const unique = [];
    const seen = new Set();
    for (const item of extracted) {
        if (!seen.has(item.order_id)) {
            seen.add(item.order_id);
            unique.push(item);
        }
    }

    console.log('📦 [S-Gyver Assistant] Extracted', unique.length, 'orders with visual details');
    return unique;
}

function findOrderContainers() {
    // Look for all elements that contain '# BS' order prefix
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const bsNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.nodeValue && node.nodeValue.includes('# BS')) {
            bsNodes.push(node.parentElement);
        }
    }

    const orderBlocks = [];
    bsNodes.forEach(bsEl => {
        let curr = bsEl;
        let bestContainer = bsEl;
        for (let i = 0; i < 7; i++) {
            if (!curr || curr === document.body) break;
            const text = curr.innerText || '';
            if (text.match(/THB|\d{15,20}|\[[A-Z0-9]+\]/i)) {
                bestContainer = curr;
                if (curr.tagName === 'TABLE' || curr.tagName === 'TBODY' || (curr.className && String(curr.className).includes('order'))) {
                    break;
                }
            }
            curr = curr.parentElement;
        }
        if (bestContainer && !orderBlocks.includes(bestContainer)) {
            orderBlocks.push(bestContainer);
        }
    });

    return orderBlocks;
}

function parseOrderContainer(container) {
    if (!container) return null;
    const text = container.innerText || '';
    if (!text || text.length < 15) return null;

    // 1. Order ID (Shopee: 2\d{5}[A-Z0-9]{8,12}, TikTok: 58\d{16}, Lazada: 112\d{13}, or generic)
    const orderIdMatch = text.match(/(2\d{5}[A-Z0-9]{8,12}|58\d{16}|112\d{13}|\b[0-9]{15,20}\b)/);
    if (!orderIdMatch) return null;
    const orderId = orderIdMatch[1];

    // 2. Platform & Store Name (e.g. "TikTok: SD_TikTok", "Lazada: Home Artistic", "Shopee: whatever_glitters")
    let platform = 'Shopee';
    let shopName = 'Shopee Store';

    const storeMatch = text.match(/(TikTok|Lazada|Shopee)\s*:\s*([^\n\r\|]+)/i);
    if (storeMatch) {
        const rawP = storeMatch[1].toLowerCase();
        if (rawP.includes('tiktok')) platform = 'TikTok';
        else if (rawP.includes('lazada')) platform = 'Lazada';
        else platform = 'Shopee';
        shopName = storeMatch[2].trim();
    } else {
        const lower = text.toLowerCase();
        if (lower.includes('tiktok')) { platform = 'TikTok'; shopName = 'SD_TikTok'; }
        else if (lower.includes('lazada')) { platform = 'Lazada'; shopName = 'Home Artistic'; }
        else if (lower.includes('whatever_glitters')) { platform = 'Shopee'; shopName = 'whatever_glitters'; }
    }

    // 3. Tracking Number (inside brackets e.g. [TH265919702870Q] or [66771014369125] or [LEXPU0715830217])
    const trackingMatch = text.match(/\[([A-Z0-9]{8,25})\]/);
    const tracking = trackingMatch ? trackingMatch[1] : orderId;

    // 4. Carrier
    let carrier = 'Standard Delivery';
    if (text.includes('BEST Express') || text.includes('BEST')) carrier = 'BEST Express';
    else if (text.includes('LEX TH') || text.includes('Lazada-TH-LEX')) carrier = 'LEX TH';
    else if (text.includes('SPX Express') || text.includes('Shopee-TH-SPX') || text.includes('SPX')) carrier = 'SPX Express';
    else if (text.includes('Flash')) carrier = 'Flash Express';
    else if (text.includes('J&T')) carrier = 'J&T Express';
    else if (text.includes('Kerry') || text.includes('KEX')) carrier = 'KEX (Kerry)';

    // 5. Amount & Payment Method
    const amountMatch = text.match(/THB\s*([0-9,]+(\.[0-9]+)?)/i);
    const totalAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    const paymentMethod = text.includes('COD') ? 'COD' : 'Prepaid';

    // 6. Recipient Name & Province
    let recipientName = 'ลูกค้า ' + platform;
    let province = 'กรุงเทพฯ';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('อุตรดิตถ์') || line.includes('เชียงราย') || line.includes('อยุธยา') || 
            line.includes('ชลบุรี') || line.includes('สระบุรี') || line.includes('กรุงเทพ') ||
            line.includes('จังหวัด') || line.includes('Thailand') || line.includes('ไทย')) {
            province = line;
            if (i > 0 && lines[i-1].length < 40 && !lines[i-1].includes('THB') && !lines[i-1].includes('BS19')) {
                recipientName = lines[i-1];
            }
            break;
        }
    }

    // 7. Product Image & Product Title
    const imgs = Array.from(container.querySelectorAll('img')).filter(im => {
        const s = (im.getAttribute('src') || im.getAttribute('data-src') || '').toLowerCase();
        return s && !s.includes('icon') && !s.includes('logo') && !s.includes('avatar') && !s.includes('svg');
    });
    const productImg = imgs.length > 0 ? (imgs[0].getAttribute('src') || imgs[0].getAttribute('data-src') || '') : '';

    // Extract Product Title and Quantity
    let productName = 'สินค้าตามคำสั่งซื้อ';
    let qty = 1;
    const productMatch = text.match(/([^\n\r]{2,50})\s*(?:THB\s*[0-9,.]+)?\s*x\s*(\d+)/i);
    if (productMatch) {
        productName = productMatch[1].replace(/--/g, '').trim();
        qty = parseInt(productMatch[2], 10) || 1;
    } else {
        for (const line of lines) {
            if (line.includes('ต้นกล้า') || line.includes('กางเกง') || line.includes('S012001') || line.includes('Set') || line.includes('ที่นอน')) {
                productName = line;
                break;
            }
        }
    }

    // 8. Determine Order Status (NEW | READY_TO_SHIP | SHIPPED)
    let orderStatus = 'READY_TO_SHIP';
    const currentUrl = (window.location.href || '').toLowerCase();
    const rowText = text.toLowerCase();

    if (currentUrl.includes('allocate') || currentUrl.includes('neworder') || rowText.includes('ยังไม่ได้จัดสรร') || rowText.includes('คำสั่งซื้อใหม่') || rowText.includes('รอรับออเดอร์')) {
        orderStatus = 'NEW';
    } else if (currentUrl.includes('shipped') || currentUrl.includes('history') || rowText.includes('จัดส่งแล้ว') || rowText.includes('ส่งแล้ว')) {
        orderStatus = 'SHIPPED';
    } else {
        orderStatus = 'READY_TO_SHIP';
    }

    return {
        order_id: orderId,
        platform: platform,
        shop_name: shopName,
        recipient_name: recipientName,
        phone: '08X-XXX-XXXX',
        address: province,
        province: province,
        district: '-',
        zipcode: '-',
        carrier: carrier,
        tracking_number: tracking,
        total_items: qty,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        image_url: productImg,
        items: [{
            name: productName,
            variation: '',
            price: totalAmount,
            qty: qty,
            image_url: productImg,
            payment_method: paymentMethod
        }],
        status: orderStatus,
        updated_at: new Date().toISOString()
    };
}

// 5. Direct Supabase Delivery
async function sendOrdersToSupabase(orders) {
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

        const response = await fetch(`${SUPABASE_URL}/rest/v1/ecommerce_orders`, {
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

        return response.ok;
    } catch (e) {
        console.error('Supabase send failed:', e);
        return false;
    }
}

// Run on page load
setTimeout(() => {
    detectAndSaveSession();
    injectBigSellerFloatButton();
}, 1500);

// Auto-Sync Watcher: Automatically detects new orders every 30s and sends to S-Gyver
let lastSyncSignature = '';
setInterval(async () => {
    try {
        const orders = extractOrdersFromDom();
        if (orders.length > 0) {
            const currentSignature = orders.map(o => o.order_id).sort().join(',');
            if (currentSignature !== lastSyncSignature) {
                console.log('🔄 [Auto-Watcher] Detected order change, auto-syncing to Supabase...', orders.length);
                lastSyncSignature = currentSignature;
                await sendOrdersToSupabase(orders);
                chrome.storage.local.set({ lastExtractedOrders: orders });

                const btnText = document.querySelector('#sgyver-quick-sync-btn span:last-child');
                if (btnText) {
                    btnText.textContent = `⚡ ซิงค์อัตโนมัติแล้ว (${orders.length})`;
                    setTimeout(() => {
                        if (btnText) btnText.textContent = '🚀 ส่งออเดอร์เข้า S-Gyver (1-Click)';
                    }, 4000);
                }
            }
        }
    } catch (e) {
        console.warn('Auto-Watcher exception:', e);
    }
}, 30000); // Check every 30 seconds

// Listen to messages from background/S-Gyver
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING_BIGSELLER') {
        sendResponse({ status: 'connected', url: window.location.href });
    } else if (request.action === 'EXTRACT_BIGSELLER_ORDERS') {
        const orders = extractOrdersFromDom();
        sendResponse({ orders });
    }
});
