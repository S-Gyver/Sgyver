/**
 * S-GYVER PICK LIST & PRODUCT SALES SUMMARY
 * Standalone Page Controller
 * Aggregates all orders from Shopee, TikTok, Lazada into a consolidated picking list
 */

const STATE = {
    orders: [],
    checkedItemKeys: new Set(),
    activeScope: 'ready', // 'all' | 'ready' | 'new' | 'shipped'
    activePlatform: '',
    searchKeyword: ''
};

document.addEventListener('DOMContentLoaded', () => {
    loadOrdersFromStorage();
    loadCheckedState();
    applyFiltersAndRender();
});

function loadOrdersFromStorage() {
    try {
        const raw = localStorage.getItem('sgyver_shopee_orders');
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                STATE.orders = list;
            }
        }
    } catch (e) {
        console.error('Error loading orders:', e);
    }
}

function loadCheckedState() {
    try {
        const raw = sessionStorage.getItem('sgyver_picklist_checked');
        if (raw) {
            STATE.checkedItemKeys = new Set(JSON.parse(raw));
        }
    } catch (e) {}
}

function saveCheckedState() {
    try {
        sessionStorage.setItem('sgyver_picklist_checked', JSON.stringify(Array.from(STATE.checkedItemKeys)));
    } catch (e) {}
}

function getAggregatedItems() {
    const scope = document.getElementById('filter-scope')?.value || 'ready';
    const platform = document.getElementById('filter-platform')?.value || '';
    const search = (document.getElementById('filter-search')?.value || '').trim().toLowerCase();

    let targetOrders = STATE.orders;

    // Filter by order status scope
    if (scope === 'ready') {
        targetOrders = targetOrders.filter(o => o.status === 'READY_TO_SHIP');
    } else if (scope === 'new') {
        targetOrders = targetOrders.filter(o => o.status === 'NEW');
    } else if (scope === 'shipped') {
        targetOrders = targetOrders.filter(o => o.status === 'SHIPPED');
    }

    // Filter by platform
    if (platform) {
        targetOrders = targetOrders.filter(o => o.platform === platform || (o.shopName && o.shopName.includes(platform)));
    }

    const itemMap = new Map();
    const relatedOrderIds = new Set();

    targetOrders.forEach(order => {
        relatedOrderIds.add(order.orderId);
        let items = order.items;

        if (!Array.isArray(items) || items.length === 0) {
            items = [{
                name: order.productName || `สินค้าคำสั่งซื้อ #${order.orderId}`,
                variation: '',
                sku: '',
                qty: order.totalItemsCount || 1,
                price: order.totalAmount || 0,
                image_url: order.imageUrl || ''
            }];
        }

        items.forEach(it => {
            const name = (it.name || 'ไม่ระบุชื่อสินค้า').trim();
            const variation = (it.variation || '').trim();
            const sku = (it.sku || '').trim();
            const key = `${name}__${variation}__${sku}`;
            const qty = parseInt(it.qty, 10) || 1;
            const price = parseFloat(it.price) || 0;
            const img = it.image_url || it.imageUrl || order.imageUrl || '';
            const platformName = order.platform || 'Shopee';

            if (itemMap.has(key)) {
                const existing = itemMap.get(key);
                existing.totalQty += qty;
                existing.totalAmount += (price * qty);
                if (!existing.orderIds.includes(order.orderId)) {
                    existing.orderIds.push(order.orderId);
                }
                existing.platforms.add(platformName);
                if (!existing.img && img) existing.img = img;
            } else {
                itemMap.set(key, {
                    key,
                    name,
                    variation,
                    sku,
                    img,
                    unitPrice: price,
                    totalQty: qty,
                    totalAmount: price * qty,
                    orderIds: [order.orderId],
                    platforms: new Set([platformName])
                });
            }
        });
    });

    let list = Array.from(itemMap.values());

    // Search filter
    if (search) {
        list = list.filter(item => 
            item.name.toLowerCase().includes(search) ||
            item.variation.toLowerCase().includes(search) ||
            item.sku.toLowerCase().includes(search) ||
            item.orderIds.some(id => id.toLowerCase().includes(search))
        );
    }

    // Sort: items with highest totalQty first, then highest amount
    list.sort((a, b) => b.totalQty - a.totalQty || b.totalAmount - a.totalAmount);

    return {
        items: list,
        distinctOrdersCount: relatedOrderIds.size
    };
}

function applyFiltersAndRender() {
    const { items, distinctOrdersCount } = getAggregatedItems();

    // 1. Update Stat Cards
    const totalSkus = items.length;
    const totalQty = items.reduce((sum, it) => sum + it.totalQty, 0);
    const totalAmount = items.reduce((sum, it) => sum + it.totalAmount, 0);

    const elSkus = document.getElementById('stat-total-skus');
    const elQty = document.getElementById('stat-total-qty');
    const elAmt = document.getElementById('stat-total-amount');
    const elOrders = document.getElementById('stat-total-orders');
    const elBadge = document.getElementById('table-row-count-badge');

    if (elSkus) elSkus.textContent = totalSkus.toLocaleString();
    if (elQty) elQty.textContent = totalQty.toLocaleString();
    if (elAmt) elAmt.textContent = totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (elOrders) elOrders.textContent = distinctOrdersCount.toLocaleString();
    if (elBadge) elBadge.textContent = `${totalSkus} รายการสินค้า (${totalQty} ชิ้น)`;

    // 2. Render Table Body
    const tbody = document.getElementById('picklist-table-tbody');
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5 text-muted">
                    <div style="font-size: 3.5rem; margin-bottom: 12px;">📦</div>
                    <h5 class="fw-bold text-dark">ยังไม่พบรายการสินค้า</h5>
                    <p class="small text-muted mb-3">
                        ${STATE.orders.length === 0 
                            ? 'ยังไม่มีคำสั่งซื้อในระบบ กรุณากดปุ่ม <strong>"โหลดตัวอย่าง 5 ร้าน"</strong> เพื่อทดลองดูข้อมูล หรือกลับไปหน้าคำสั่งซื้อเพื่ออัปโหลดไฟล์ Excel ครับ' 
                            : 'ไม่มีสินค้าที่ตรงกับเงื่อนไขการกรองข้างต้น ลองเปลี่ยนตัวกรองเป็น "คำสั่งซื้อทั้งหมด" หรือล้างคำค้นหาดูครับ'}
                    </p>
                    ${STATE.orders.length === 0 ? `
                        <button class="btn btn-warning btn-sm px-3 fw-bold" onclick="loadDemoDataIfEmpty()">
                            <i class="bi bi-lightbulb-fill me-1"></i> โหลดตัวอย่าง 5 ร้านทันที
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map((it, idx) => {
        const isChecked = STATE.checkedItemKeys.has(it.key);
        const platformBadges = Array.from(it.platforms).map(p => {
            const badgeClass = p.toLowerCase() === 'shopee' ? 'bg-danger-subtle text-danger border border-danger-subtle' :
                               p.toLowerCase() === 'tiktok' ? 'bg-dark text-white' :
                               p.toLowerCase() === 'lazada' ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-secondary text-white';
            return `<span class="badge ${badgeClass} px-2 py-1" style="font-size: 0.74rem;">${p}</span>`;
        }).join(' ');

        const imgHtml = it.img ? `
            <div class="prod-thumb-box" onclick="openImageLightbox('${escapeHtml(it.img)}')" title="คลิกดูรูปขนาดใหญ่">
                <img src="${escapeHtml(it.img)}" alt="" loading="lazy">
            </div>
        ` : `
            <div class="prod-thumb-box" style="color: #94a3b8; font-size: 1.35rem;">
                📦
            </div>
        `;

        const orderChips = it.orderIds.slice(0, 4).map(id => `<span class="order-chip">${escapeHtml(id)}</span>`).join('');
        const moreOrders = it.orderIds.length > 4 ? `<span class="badge bg-light text-muted border" title="${it.orderIds.join(', ')}">+${it.orderIds.length - 4}</span>` : '';

        return `
            <tr id="row-${idx}" class="${isChecked ? 'row-picked' : ''}">
                <td class="text-center">
                    <input type="checkbox" class="form-check-input" style="cursor: pointer; width: 20px; height: 20px;" 
                           ${isChecked ? 'checked' : ''} 
                           onchange="togglePickItem(this, '${escapeHtml(it.key)}', 'row-${idx}')" 
                           title="ติ๊กเมื่อหยิบของชิ้นนี้เสร็จแล้ว">
                </td>
                <td class="text-center text-muted fw-bold">${idx + 1}</td>
                <td class="text-center">${imgHtml}</td>
                <td>
                    <div class="item-main-title fw-bold text-dark fs-6" style="line-height: 1.35;">${escapeHtml(it.name)}</div>
                    ${it.variation ? `<div class="small text-primary mt-1"><i class="bi bi-tag-fill me-1"></i>ตัวเลือก: <strong>${escapeHtml(it.variation)}</strong></div>` : ''}
                    ${it.sku ? `<div class="small text-muted font-monospace mt-1"><i class="bi bi-upc-scan me-1"></i>SKU: ${escapeHtml(it.sku)}</div>` : ''}
                </td>
                <td class="text-center">${platformBadges}</td>
                <td class="text-end text-muted font-monospace">${it.unitPrice > 0 ? it.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' ฿' : '—'}</td>
                <td class="text-center">
                    <div class="qty-badge-highlight item-pick-badge">
                        <i class="bi bi-box-seam"></i>
                        <span>${it.totalQty}</span>
                        <small style="font-size: 0.76rem; font-weight: normal;">ชิ้น</small>
                    </div>
                </td>
                <td class="text-end fw-bold text-dark font-monospace">${it.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</td>
                <td>
                    <div style="max-width: 240px;">
                        ${orderChips} ${moreOrders}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function togglePickItem(checkbox, key, rowId) {
    const row = document.getElementById(rowId);
    if (checkbox.checked) {
        STATE.checkedItemKeys.add(key);
        if (row) row.classList.add('row-picked');
    } else {
        STATE.checkedItemKeys.delete(key);
        if (row) row.classList.remove('row-picked');
    }
    saveCheckedState();
}

function resetAllCheckboxes() {
    STATE.checkedItemKeys.clear();
    saveCheckedState();
    applyFiltersAndRender();
    if (typeof showToast === 'function') {
        showToast('info', 'รีเซ็ตแล้ว', 'ล้างการติ๊กเช็คของทั้งหมดเรียบร้อยแล้ว', 2000);
    }
}

// ── PRINTABLE PICK LIST SHEET (A4) ──────────────────────────────────────────
function printPickList() {
    const { items } = getAggregatedItems();

    if (items.length === 0) {
        alert('ไม่พบรายการสินค้าที่จะพิมพ์');
        return;
    }

    const scope = document.getElementById('filter-scope')?.value || 'ready';
    const platform = document.getElementById('filter-platform')?.value || '';
    const totalQty = items.reduce((sum, it) => sum + it.totalQty, 0);
    const totalAmount = items.reduce((sum, it) => sum + it.totalAmount, 0);
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const rowsHtml = items.map((it, idx) => `
        <tr>
            <td style="text-align: center; width: 35px; border: 1px solid #000; padding: 6px;"><span style="display:inline-block; width:16px; height:16px; border:1.5px solid #000;"></span></td>
            <td style="text-align: center; width: 35px; border: 1px solid #000; padding: 6px;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 6px;">
                <div style="font-weight: bold; font-size: 13px;">${escapeHtml(it.name)}</div>
                ${it.variation ? `<div style="font-size: 11px; color: #333;">ตัวเลือก: <strong>${escapeHtml(it.variation)}</strong></div>` : ''}
                ${it.sku ? `<div style="font-size: 10px; color: #555;">SKU: ${escapeHtml(it.sku)}</div>` : ''}
            </td>
            <td style="text-align: center; border: 1px solid #000; padding: 6px; font-size: 11px;">${Array.from(it.platforms).join(', ')}</td>
            <td style="text-align: center; width: 85px; border: 1px solid #000; padding: 6px; font-size: 16px; font-weight: bold; background: #f3f4f6;">
                ${it.totalQty} ชิ้น
            </td>
            <td style="text-align: right; width: 85px; border: 1px solid #000; padding: 6px; font-size: 12px;">${it.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</td>
            <td style="border: 1px solid #000; padding: 6px; font-size: 10px; max-width: 150px; word-break: break-all;">${it.orderIds.join(', ')}</td>
        </tr>
    `).join('');

    const printWin = window.open('', '_blank', 'width=950,height=800');
    if (!printWin) {
        alert('กรุณาอนุญาตให้เบราว์เซอร์เปิด Pop-up เพื่อพิมพ์เอกสารครับ');
        return;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <title>ใบสรุปรายการหยิบสินค้า (Order Picking List)</title>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; color: #000; background: #fff; margin: 0; padding: 10px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
                .title { font-size: 18px; font-weight: bold; margin: 0; }
                .meta { font-size: 12px; color: #333; margin-top: 4px; }
                .stats-box { display: flex; gap: 15px; margin-bottom: 14px; font-size: 13px; }
                .stats-pill { background: #f3f4f6; border: 1px solid #000; padding: 6px 14px; border-radius: 4px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                th { background: #e5e7eb; border: 1px solid #000; padding: 8px 6px; font-size: 12px; text-align: center; }
                .footer { display: flex; justify-content: space-between; margin-top: 30px; font-size: 12px; }
                .sign-box { border-top: 1px dotted #000; width: 200px; text-align: center; padding-top: 6px; margin-top: 40px; }
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 15px; text-align: right;">
                <button onclick="window.print()" style="padding: 8px 20px; font-size: 14px; background: #0284c7; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">🖨️ สั่งพิมพ์เอกสาร (Print)</button>
                <button onclick="window.close()" style="padding: 8px 15px; font-size: 14px; background: #e2e8f0; color: #333; border: none; border-radius: 6px; cursor: pointer; margin-left: 8px;">ปิด</button>
            </div>
            <div class="header">
                <div>
                    <h1 class="title">📦 ใบสรุปรายการหยิบสินค้า (Order Picking List)</h1>
                    <div class="meta">ระบบ S-Gyver Shipping Studio | วันที่พิมพ์: ${dateStr}</div>
                </div>
                <div style="text-align: right; font-size: 12px;">
                    <div><strong>สถานะ:</strong> ${scope === 'ready' ? 'เฉพาะคำสั่งซื้อรอแพ็ค (Ready to Ship)' : scope === 'new' ? 'เฉพาะคำสั่งซื้อใหม่' : 'ทุกคำสั่งซื้อ'}</div>
                    ${platform ? `<div><strong>ช่องทาง:</strong> ${platform}</div>` : ''}
                </div>
            </div>

            <div class="stats-box">
                <div class="stats-pill">🏷️ รวม: ${items.length} รายการ (SKUs)</div>
                <div class="stats-pill" style="background: #ecfdf5; border-color: #059669; color: #047857;">📦 จำนวนชิ้นทั้งหมด: ${totalQty} ชิ้น</div>
                <div class="stats-pill">💰 มูลค่ารวม: ${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 35px;">เช็ค</th>
                        <th style="width: 35px;">#</th>
                        <th style="text-align: left;">ชื่อสินค้า / ตัวเลือก / SKU</th>
                        <th style="width: 80px;">ช่องทาง</th>
                        <th style="width: 85px;">จำนวนที่หยิบ</th>
                        <th style="width: 85px;">รวมเงิน</th>
                        <th>ออเดอร์ที่สั่ง</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="footer">
                <div class="sign-box">
                    ผู้จัดสินค้า (Picker)<br>วันที่: ..../..../........
                </div>
                <div class="sign-box">
                    ผู้ตรวจเช็ค & แพ็ค (Packer)<br>วันที่: ..../..../........
                </div>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() { window.print(); }, 300);
                };
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}

// ── COPY SUMMARY TEXT FOR LINE / CHAT ────────────────────────────────────────
function copyPickListText() {
    const { items } = getAggregatedItems();

    if (items.length === 0) {
        alert('ไม่มีรายการสินค้าที่จะคัดลอก');
        return;
    }

    const totalQty = items.reduce((sum, it) => sum + it.totalQty, 0);
    const totalAmount = items.reduce((sum, it) => sum + it.totalAmount, 0);
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH') + ' ' + now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let lines = [
        `📦 สรุปสินค้าที่ขายได้ (Pick List) - S-Gyver`,
        `📅 วันที่: ${dateStr}`,
        `═════════════════════════`
    ];

    items.forEach((it, idx) => {
        const variationPart = it.variation ? ` (${it.variation})` : '';
        lines.push(`${idx + 1}. [x${it.totalQty} ชิ้น] ${it.name}${variationPart}`);
    });

    lines.push(`═════════════════════════`);
    lines.push(`📊 รวมทั้งหมด: ${totalQty} ชิ้น (${items.length} รายการ)`);
    lines.push(`💰 ยอดขายรวม: ${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`);

    const fullText = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullText).then(() => {
            if (typeof showToast === 'function') {
                showToast('success', '📋 คัดลอกสำเร็จ!', `คัดลอกรายการสรุปสินค้า ${items.length} รายการเรียบร้อยแล้ว พร้อมส่งใน LINE ได้ทันที`, 3000);
            } else {
                alert('📋 คัดลอกรายการสรุปสินค้าลงคลิปบอร์ดเรียบร้อยแล้ว!');
            }
        }).catch(() => {
            prompt('คัดลอกข้อความด้านล่างนี้ได้เลยครับ:', fullText);
        });
    } else {
        prompt('คัดลอกข้อความด้านล่างนี้ได้เลยครับ:', fullText);
    }
}

// ── EXPORT CSV (EXCEL COMPATIBLE) ───────────────────────────────────────────
function exportPickListCsv() {
    const { items } = getAggregatedItems();

    if (items.length === 0) {
        alert('ไม่มีรายการสินค้าที่จะส่งออก');
        return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Thai Excel
    csvContent += 'ลำดับ,ชื่อสินค้า,ตัวเลือก,SKU,ราคาต่อชิ้น(บาท),จำนวนที่ขายได้(ชิ้น),ยอดเงินรวม(บาท),ช่องทางจำหน่าย,หมายเลขคำสั่งซื้อ\n';

    items.forEach((it, idx) => {
        const clean = str => `"${String(str || '').replace(/"/g, '""')}"`;
        const platforms = Array.from(it.platforms).join('; ');
        const orders = it.orderIds.join('; ');

        csvContent += [
            idx + 1,
            clean(it.name),
            clean(it.variation),
            clean(it.sku),
            it.unitPrice,
            it.totalQty,
            it.totalAmount,
            clean(platforms),
            clean(orders)
        ].join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nowStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `SGYVER_PickList_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') {
        showToast('success', '📥 ดาวน์โหลดสำเร็จ', `ส่งออกไฟล์ Excel/CSV สรุปรายการสินค้าเรียบร้อยแล้ว`, 2500);
    }
}

// ── LOAD DEMO DATA HELPER ──────────────────────────────────────────────────
function loadDemoDataIfEmpty() {
    const demoOrders = [
        {
            orderId: '261005SPX-01A',
            platform: 'Shopee',
            shopName: 'Shopee ร้าน 1 (Official)',
            recipientName: 'คุณสมชาย พัฒนกิจ',
            status: 'READY_TO_SHIP',
            totalAmount: 3200,
            imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'หุ่นยนต์แขนกล Arm Robot 4-DOF DIY Kit', variation: 'ครบชุดพร้อมบอร์ด ESP32', sku: 'ROBOT-4DOF-ESP32', price: 2900, qty: 1, image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150&auto=format&fit=crop&q=60' },
                { name: 'สายไฟจัมเปอร์แพ็ค 40 เส้น', variation: 'ตัวผู้-ตัวเมีย (M-F)', sku: 'WIRE-MF-40P', price: 150, qty: 2 }
            ]
        },
        {
            orderId: '261005SPX-02B',
            platform: 'Shopee',
            shopName: 'Shopee ร้าน 2 (STEM Toys)',
            recipientName: 'คุณวราภรณ์ สดใส',
            status: 'READY_TO_SHIP',
            totalAmount: 1780,
            imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'บอร์ดควบคุม ESP32 NodeMCU Type-C', variation: 'WiFi + Bluetooth 38 Pins', sku: 'ESP32-TYPC-38P', price: 890, qty: 2, image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=60' }
            ]
        },
        {
            orderId: '261005SPX-03C',
            platform: 'Shopee',
            shopName: 'Shopee ร้าน 3 (Gadget Hub)',
            recipientName: 'คุณกิตติศักดิ์ ชัยชนะ',
            status: 'READY_TO_SHIP',
            totalAmount: 950,
            items: [
                { name: 'โมดูลวัดระยะทาง Ultrasonic Sensor HC-SR04', variation: 'Standard 5V', sku: 'MOD-HCSR04', price: 95, qty: 10 }
            ]
        },
        {
            orderId: '261005TTK-01D',
            platform: 'TikTok',
            shopName: 'TikTok Shop (Creative Lab)',
            recipientName: 'คุณณัฐณิชา รุ่งเรือง',
            status: 'READY_TO_SHIP',
            totalAmount: 1450,
            imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'บอร์ดทดลอง Breadboard 830 รู พร้อมสายต่อ', variation: 'ชุดมาตรฐาน 830 Points', sku: 'BB-830-SET', price: 290, qty: 5, image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=60' }
            ]
        },
        {
            orderId: '261005LZD-01E',
            platform: 'Lazada',
            shopName: 'Lazada Mall (Official Store)',
            recipientName: 'คุณธนพล เมธาวี',
            status: 'READY_TO_SHIP',
            totalAmount: 2650,
            imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'บอร์ดควบคุม ESP32 NodeMCU Type-C', variation: 'WiFi + Bluetooth 38 Pins', sku: 'ESP32-TYPC-38P', price: 890, qty: 3, image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=60' }
            ]
        }
    ];

    STATE.orders = demoOrders;
    try {
        localStorage.setItem('sgyver_shopee_orders', JSON.stringify(demoOrders));
    } catch (e) {}

    applyFiltersAndRender();
    if (typeof showToast === 'function') {
        showToast('success', 'โหลดข้อมูลตัวอย่างแล้ว', 'โหลดตัวอย่างคำสั่งซื้อ 5 ร้านค้าสำเร็จ', 2500);
    }
}

// ── LIGHTBOX ────────────────────────────────────────────────────────────────
function openImageLightbox(url) {
    const modal = document.getElementById('productImageModal');
    const img = document.getElementById('lightboxImg');
    if (modal && img) {
        img.src = url;
        modal.style.display = 'flex';
    }
}

function closeImageLightbox() {
    const modal = document.getElementById('productImageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.applyFiltersAndRender = applyFiltersAndRender;
window.togglePickItem = togglePickItem;
window.resetAllCheckboxes = resetAllCheckboxes;
window.printPickList = printPickList;
window.copyPickListText = copyPickListText;
window.exportPickListCsv = exportPickListCsv;
window.loadDemoDataIfEmpty = loadDemoDataIfEmpty;
window.openImageLightbox = openImageLightbox;
window.closeImageLightbox = closeImageLightbox;
