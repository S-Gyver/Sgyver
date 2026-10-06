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
    // 1. Check for explicit table rows containing order IDs (Shopee, TikTok, Lazada)
    const rows = Array.from(document.querySelectorAll('tr, .order-item, .order-card, .el-table__row'));
    const orderRows = rows.filter(r => {
        const t = r.innerText || '';
        return t.match(/(2\d{5}[A-Z0-9]{8,12}|58\d{16}|112\d{13})/);
    });

    if (orderRows.length > 0) {
        return orderRows;
    }

    // 2. Fallback: Search for all elements that contain '# BS' order prefix
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
        const row = bsEl.closest('tr, .order-item, .order-card, tbody') || bsEl;
        const nextRow = row.nextElementSibling;
        if (nextRow && nextRow.innerText && nextRow.innerText.match(/(2\d{5}[A-Z0-9]{8,12}|58\d{16}|112\d{13})/)) {
            orderBlocks.push(nextRow);
        } else {
            orderBlocks.push(row);
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

    // 2. Platform & Store Name (Shopee 3 stores, TikTok: SD_TikTok, Lazada: Home Artistic)
    let platform = 'Shopee';
    let shopName = 'Shopee Store';

    // Gather full text including parent card or previous header row
    let fullSearchText = text;
    const orderCard = container.closest('.order-item, .order-card, .el-table, table, tbody, [class*="order"]') || container.parentElement;
    if (orderCard && orderCard !== container) {
        fullSearchText = (orderCard.innerText || '') + '\n' + fullSearchText;
    }
    if (container.previousElementSibling) {
        fullSearchText = (container.previousElementSibling.innerText || '') + '\n' + fullSearchText;
    }

    // Try regex for Platform: StoreName (handles :, ：, -, --, newlines)
    const storeMatch = fullSearchText.match(/(TikTok|Lazada|Shopee)\s*[:：\-\–]\s*([^\n\r\|<]+)/i) ||
                       fullSearchText.match(/(?:ร้านค้า|ร้าน)\s*[:：]\s*([^\n\r\|<]+)/i);

    if (storeMatch) {
        const rawP = (storeMatch[1] || '').toLowerCase();
        if (rawP.includes('tiktok')) platform = 'TikTok';
        else if (rawP.includes('lazada')) platform = 'Lazada';
        else platform = 'Shopee';

        let extractedName = (storeMatch[2] || '').trim();
        // Clean out trailing UI words like 'กำลังดำเนินการ', 'Paid', etc.
        extractedName = extractedName.split(/[\t\n\r]/)[0]
                                     .replace(/\s*(กำลังดำเนินการ|คำสั่งซื้อใหม่|จัดส่งแล้ว|รอดำเนินการ|Paid|Expire|Created).*$/i, '')
                                     .trim();
        if (extractedName && extractedName.length > 1 && !extractedName.includes('โลจิสติกส์')) {
            shopName = extractedName;
        }
    }

    // DOM Element lookup for store name / tooltip / title
    const searchRoot = orderCard || container;
    const storeDOMElements = Array.from(searchRoot.querySelectorAll('[class*="shop"], [class*="store"], [class*="account"], [title*="Shopee"], [title*="TikTok"], [title*="Lazada"]'));
    for (const el of storeDOMElements) {
        const titleOrText = (el.getAttribute('title') || el.innerText || '').trim();
        if (titleOrText && (titleOrText.includes('Shopee') || titleOrText.includes('TikTok') || titleOrText.includes('Lazada'))) {
            const m = titleOrText.match(/(?:TikTok|Lazada|Shopee)\s*[:：\-\–]?\s*([^\n\r\|<]+)/i);
            if (m && m[1].trim().length > 1) {
                shopName = m[1].trim();
                break;
            }
        }
    }

    // Exact store detection for the 5 active stores (Shopee x 3, TikTok x 1, Lazada x 1)
    const lower = fullSearchText.toLowerCase();
    if (lower.includes('whatever_glitters') || lower.includes('whatever')) {
        platform = 'Shopee';
        shopName = 'whatever_glitters';
    } else if (lower.includes('homeart1993') || lower.includes('homeart')) {
        platform = 'Shopee';
        shopName = 'homeart1993';
    } else if (lower.includes('s.design2022') || lower.includes('s.design') || lower.includes('sdesign')) {
        platform = 'Shopee';
        shopName = 's.design2022';
    } else if (lower.includes('sd_tiktok') || lower.includes('tiktok')) {
        platform = 'TikTok';
        shopName = 'SD_TikTok';
    } else if (lower.includes('home artistic') || lower.includes('lazada')) {
        platform = 'Lazada';
        shopName = 'Home Artistic';
    }

    // 3. Tracking Number (inside brackets e.g. [TH265919702870Q] or [66771014369125] or [LEXPU0715830217])
    const trackingMatch = text.match(/\[([A-Z0-9]{8,25})\]/) || fullSearchText.match(/\[([A-Z0-9]{8,25})\]/);
    const tracking = trackingMatch ? trackingMatch[1] : orderId;

    // 4. Carrier
    let carrier = 'Standard Delivery';
    if (fullSearchText.includes('BEST Express') || fullSearchText.includes('BEST')) carrier = 'BEST Express';
    else if (fullSearchText.includes('LEX TH') || fullSearchText.includes('Lazada-TH-LEX')) carrier = 'LEX TH';
    else if (fullSearchText.includes('SPX Express') || fullSearchText.includes('Shopee-TH-SPX') || fullSearchText.includes('SPX')) carrier = 'SPX Express';
    else if (fullSearchText.includes('Flash')) carrier = 'Flash Express';
    else if (fullSearchText.includes('J&T')) carrier = 'J&T Express';
    else if (fullSearchText.includes('Kerry') || fullSearchText.includes('KEX')) carrier = 'KEX (Kerry)';

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
            line.includes('น่าน') || line.includes('นนทบุรี') || line.includes('แพร่') ||
            line.includes('เชียงใหม่') || line.includes('ขอนแก่น') || line.includes('ภูเก็ต') ||
            line.includes('จังหวัด') || line.includes('Thailand') || line.includes('ไทย')) {
            province = line;
            if (i > 0 && lines[i-1].length < 40 && !lines[i-1].includes('THB') && !lines[i-1].includes('BS19')) {
                recipientName = lines[i-1];
            }
            break;
        }
    }

    // 7. Product Items Extraction
    // In BigSeller order tables, column 1 (index 1) is ALWAYS the Product Details column!
    const cells = Array.from(container.querySelectorAll('td, .el-table__cell'));
    let productCell = null;

    const imgs = Array.from(container.querySelectorAll('img')).filter(im => {
        const s = (im.getAttribute('src') || im.getAttribute('data-src') || '').toLowerCase();
        return s && !s.includes('icon') && !s.includes('logo') && !s.includes('avatar') && !s.includes('svg');
    });
    const defaultProductImg = imgs.length > 0 ? (imgs[0].getAttribute('src') || imgs[0].getAttribute('data-src') || '') : '';

    if (imgs.length > 0) {
        productCell = imgs[0].closest('td, .goods-info, .product-item, .el-table__cell, [class*="product"], [class*="goods"]') || imgs[0].parentElement?.parentElement;
    }

    if (!productCell && cells.length >= 4) {
        // cells[1] is Product Details in BigSeller table
        const c1Text = (cells[1].innerText || '');
        if (!c1Text.includes(orderId)) {
            productCell = cells[1];
        }
    }

    if (!productCell) {
        productCell = container.querySelector('[class*="goods"], [class*="product"], [class*="item-info"]');
    }

    const extractedItems = [];

    if (productCell) {
        // Find sub-items if multiple products exist in this cell
        let itemNodes = Array.from(productCell.querySelectorAll('.goods-item, .product-item, [class*="goods-info"], [class*="goods-row"], [class*="item-wrap"]'));
        if (itemNodes.length === 0) {
            const cellImgs = Array.from(productCell.querySelectorAll('img')).filter(im => {
                const s = (im.getAttribute('src') || im.getAttribute('data-src') || '').toLowerCase();
                return s && !s.includes('icon') && !s.includes('logo') && !s.includes('avatar') && !s.includes('svg');
            });
            if (cellImgs.length > 1) {
                itemNodes = cellImgs.map(img => img.closest('div, tr, li') || img.parentElement);
            } else {
                itemNodes = [productCell];
            }
        }

        itemNodes.forEach(itemEl => {
            // Thumbnail Image
            const itImg = itemEl.querySelector('img:not([src*="icon"]):not([src*="logo"]):not([src*="avatar"]):not([src*="svg"])');
            const itemImgUrl = itImg ? (itImg.getAttribute('src') || itImg.getAttribute('data-src') || '') : defaultProductImg;

            // Clone and strip all copy buttons, icons, action links
            let cleanCellText = '';
            try {
                const clone = itemEl.cloneNode(true);
                clone.querySelectorAll('button, a[class*="copy"], span[class*="copy"], div[class*="copy"], [class*="btn"], i, svg').forEach(el => el.remove());
                cleanCellText = (clone.innerText || '').trim();
            } catch (e) {
                cleanCellText = (itemEl.innerText || '').trim();
            }

            // Remove copy words
            cleanCellText = cleanCellText.replace(/\b(คัดลอก|Copy|copy|แก้ไข|ลบ|พิมพ์|ดูเพิ่มเติม|จัดการ)\b/g, '').trim();

            // Extract Quantity and Price: e.g. 'THB 60 x 8' or 'THB 65 x 1' or ' x 8'
            let itemQty = 1;
            let itemPrice = totalAmount;

            const priceQtyMatch = cleanCellText.match(/(?:THB|฿|\$)\s*([0-9,]+(?:\.[0-9]+)?)\s*[xX×*]\s*(\d{1,4})/i) ||
                                  cleanCellText.match(/[\s\r\n][xX×*]\s*(\d{1,4})\b/);
            if (priceQtyMatch) {
                if (priceQtyMatch.length >= 3 && priceQtyMatch[1]) {
                    itemPrice = parseFloat(priceQtyMatch[1].replace(/,/g, '')) || totalAmount;
                    itemQty = parseInt(priceQtyMatch[2], 10) || 1;
                } else if (priceQtyMatch[1]) {
                    itemQty = parseInt(priceQtyMatch[1], 10) || 1;
                }
            }

            // Sanity check to prevent order ID fragments
            if (itemQty > 10 && totalAmount > 0 && (totalAmount / itemQty) < 5) {
                itemQty = 1;
            }

            // Lines of text for Title and Variation
            const rawLines = cleanCellText.split(/[\r\n]+/)
                .map(l => l.replace(/\b(คัดลอก|Copy|copy)\b/g, '').trim())
                .filter(l => {
                    if (!l) return false;
                    if (/(?:THB|฿|\$)\s*[0-9,.]+\s*[xX×*]\s*\d+/i.test(l)) return false;
                    if (/^(?:THB|฿|\$)\s*[0-9,.]+/i.test(l)) return false;
                    if (/^(THB|฿|\$|[xX×*]\s*\d+|คัดลอก|copy)$/i.test(l)) return false;
                    if (/^(2\d{5}[A-Z0-9]+|58\d{15,}|112\d{13,})$/i.test(l)) return false;
                    if (/^\[?[A-Z0-9]{8,}\]?$/i.test(l)) return false;
                    if (l === orderId || l.includes(orderId)) return false;
                    return true;
                });

            const contentLines = rawLines.filter(l => l !== '--' && l !== '-');

            let itemName = '';
            let itemVariation = '';

            if (contentLines.length === 1) {
                itemName = contentLines[0];
            } else if (contentLines.length === 2) {
                if (contentLines[0] === contentLines[1]) {
                    itemName = contentLines[0];
                } else {
                    itemName = contentLines[0];
                    itemVariation = contentLines[1];
                }
            } else if (contentLines.length >= 3) {
                itemName = contentLines[0];
                itemVariation = contentLines.slice(1).join(' ');
            } else if (rawLines.length > 0) {
                itemName = rawLines[0];
            }

            // Check if there is an image badge/tag (e.g. 'Shorts S', 'Grey Set')
            const badgeEl = itemEl.querySelector('.sku-tag, .tag, .badge, [class*="badge"], [class*="tag"]');
            if (badgeEl && badgeEl.innerText && !itemVariation) {
                const bText = badgeEl.innerText.trim();
                if (bText && bText !== '--' && bText.length < 30) {
                    itemVariation = bText;
                }
            }

            // Cleanup dashes
            itemName = itemName.replace(/^--\s*/, '').replace(/\s*--$/, '').trim();
            itemVariation = itemVariation.replace(/^--\s*/, '').replace(/\s*--$/, '').trim();

            if (!itemName) {
                itemName = 'สินค้าตามคำสั่งซื้อ';
            }

            extractedItems.push({
                name: itemName,
                variation: itemVariation,
                price: itemPrice || totalAmount,
                qty: itemQty,
                image_url: itemImgUrl || defaultProductImg,
                payment_method: paymentMethod
            });
        });
    }

    if (extractedItems.length === 0) {
        extractedItems.push({
            name: 'สินค้าตามคำสั่งซื้อ',
            variation: '',
            price: totalAmount,
            qty: 1,
            image_url: defaultProductImg,
            payment_method: paymentMethod
        });
    }

    const totalQty = extractedItems.reduce((acc, it) => acc + (it.qty || 1), 0);

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
        total_items: totalQty,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        image_url: extractedItems[0].image_url || defaultProductImg,
        items: extractedItems,
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
