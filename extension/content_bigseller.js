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

        // Send to Supabase
        const success = await sendOrdersToSupabase(orders);
        if (success) {
            if (btnText) btnText.textContent = `✅ ส่งแล้ว ${orders.length} ออเดอร์!`;
            setTimeout(() => {
                if (btnText) btnText.textContent = '🚀 ส่งออเดอร์เข้า S-Gyver (1-Click)';
            }, 3000);
        } else {
            if (btnText) btnText.textContent = '❌ ส่งไม่สำเร็จ ลองอีกครั้ง';
        }
    } catch (err) {
        console.error('Extract error:', err);
        alert('เกิดข้อผิดพลาดในการดึงออเดอร์: ' + err.message);
        if (btnText) btnText.textContent = '🚀 ส่งออเดอร์เข้า S-Gyver (1-Click)';
    }
}

// 4. Precision DOM & Text Parser for BigSeller Order Tables
function extractOrdersFromDom() {
    const extracted = [];
    
    // Approach A: Parse by BigSeller Order Item Containers
    const containers = Array.from(document.querySelectorAll('table tbody tr, .el-table__body tr, .ant-table-row, div[class*="order"], tr'));
    containers.forEach((el) => {
        const text = el.innerText || '';
        if (text.includes('# BS') || text.match(/(2\d{5}[A-Z0-9]{8,12}|58\d{16}|112\d{13})/)) {
            const parsed = parseOrderBlock(text);
            if (parsed) extracted.push(parsed);
        }
    });

    // Approach B: Split whole page text by BigSeller order prefix '# BS'
    const fullText = document.body.innerText || '';
    const bsSections = fullText.split(/#\s*BS[0-9A-Z]+/i);
    if (bsSections.length > 1) {
        for (let i = 1; i < bsSections.length; i++) {
            const block = bsSections[i];
            const parsed = parseOrderBlock(block);
            if (parsed) extracted.push(parsed);
        }
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

    return unique;
}

function parseOrderBlock(text) {
    if (!text || text.length < 15) return null;

    // 1. Order ID (Shopee: 2\d{5}[A-Z0-9]{8,12}, TikTok: 58\d{16}, Lazada: 112\d{13}, or generic)
    const orderIdMatch = text.match(/(2\d{5}[A-Z0-9]{8,12}|58\d{16}|112\d{13}|\b[0-9]{15,20}\b)/);
    if (!orderIdMatch) return null;
    const orderId = orderIdMatch[1];

    // 2. Platform & Store Name (e.g. "TikTok: SD_TikTok", "Lazada: Home Artistic", "Shopee: whatever_glitters")
    let platform = 'Shopee';
    let shopName = 'Shopee ร้านค้า';

    const storeMatch = text.match(/(TikTok|Lazada|Shopee)\s*:\s*([^\n\r]+)/i);
    if (storeMatch) {
        const rawP = storeMatch[1].toLowerCase();
        if (rawP.includes('tiktok')) platform = 'TikTok';
        else if (rawP.includes('lazada')) platform = 'Lazada';
        else platform = 'Shopee';
        shopName = storeMatch[2].trim();
    } else {
        const lower = text.toLowerCase();
        if (lower.includes('tiktok')) { platform = 'TikTok'; shopName = 'TikTok Shop'; }
        else if (lower.includes('lazada')) { platform = 'Lazada'; shopName = 'Lazada Store'; }
    }

    // 3. Tracking Number (inside brackets e.g. [TH2659197028700] or [66771014369125] or [LEXPU0715830217])
    const trackingMatch = text.match(/\[([A-Z0-9]{8,25})\]/);
    const tracking = trackingMatch ? trackingMatch[1] : orderId;

    // 4. Carrier
    let carrier = 'Standard Delivery';
    const carrierMatch = text.match(/Buyer-designated Logistics:\s*([^\n\r]+)/i) ||
                         text.match(/(Shopee-TH-[^\n\r\[]+|TikTok-TH-[^\n\r\[]+|Lazada-TH-[^\n\r\[]+)/i);
    if (carrierMatch) {
        carrier = carrierMatch[1].replace(/\[.*\]/, '').trim();
    } else {
        const lower = text.toLowerCase();
        if (lower.includes('spx') || lower.includes('shopee xpress')) carrier = 'SPX Express';
        else if (lower.includes('best express')) carrier = 'BEST Express';
        else if (lower.includes('lex th') || lower.includes('lazada express')) carrier = 'LEX TH';
        else if (lower.includes('flash')) carrier = 'Flash Express';
        else if (lower.includes('j&t') || lower.includes('jnt')) carrier = 'J&T Express';
        else if (lower.includes('kerry')) carrier = 'KEX (Kerry)';
    }

    // 5. Amount
    const amountMatch = text.match(/THB\s*([0-9,]+(\.[0-9]+)?)/i);
    const totalAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // 6. Recipient & Province
    let recipientName = 'ลูกค้า ' + platform;
    let province = 'กรุงเทพฯ';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
        if (line.includes('จังหวัด') || line.includes('อุตรดิตถ์') || line.includes('เชียงราย') || line.includes('อยุธยา') || line.includes('Thailand') || line.includes('ไทย')) {
            province = line;
            break;
        }
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
        total_items: 1,
        total_amount: totalAmount,
        items: [{ name: 'สินค้าตามคำสั่งซื้อ', qty: 1, price: totalAmount }],
        status: 'READY_TO_SHIP',
        updated_at: new Date().toISOString()
    };
}

// 5. Direct Supabase Delivery
async function sendOrdersToSupabase(orders) {
    const SUPABASE_URL = 'https://igiihteeeprpcxxlldkd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ecommerce_orders`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(orders)
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

// Listen to messages from background/S-Gyver
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING_BIGSELLER') {
        sendResponse({ status: 'connected', url: window.location.href });
    } else if (request.action === 'EXTRACT_BIGSELLER_ORDERS') {
        const orders = extractOrdersFromDom();
        sendResponse({ orders });
    }
});
