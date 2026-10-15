/**
 * ==============================================================================
 * 📦 S-Gyver Garment Inventory & Warehouse Studio - JavaScript Engine
 * ==============================================================================
 */

const InventoryApp = {
    supabaseClient: null,
    supabaseUrl: '',
    supabaseKey: '',
    products: [],
    activeTab: 'ALL', // 'ALL', 'INSTOCK', 'LOW', 'OUT'
    searchQuery: '',
    editingId: null
};

// ==============================================================================
// 1. SUPABASE INITIALIZATION
// ==============================================================================
function initSupabase() {
    const localUrl = localStorage.getItem('sgyver_label_sb_url');
    const localKey = localStorage.getItem('sgyver_label_sb_key');

    if (localUrl && localKey) {
        InventoryApp.supabaseUrl = localUrl;
        InventoryApp.supabaseKey = localKey;
    } else if (window.SUPABASE_URL && window.SUPABASE_KEY) {
        InventoryApp.supabaseUrl = window.SUPABASE_URL;
        InventoryApp.supabaseKey = window.SUPABASE_KEY;
    } else {
        InventoryApp.supabaseUrl = 'https://igiihteeeprpcxxlldkd.supabase.co';
        InventoryApp.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';
    }

    try {
        if (window.supabase) {
            InventoryApp.supabaseClient = window.supabase.createClient(InventoryApp.supabaseUrl, InventoryApp.supabaseKey, {
                db: { schema: 'public' }
            });
            updateDbStatus(true, 'เชื่อมต่อแล้ว');
        } else {
            updateDbStatus(false, 'ไม่พบ Supabase Library');
        }
    } catch (err) {
        console.error('Failed to init Supabase:', err);
        updateDbStatus(false, 'เชื่อมต่อไม่สำเร็จ');
    }
}

function updateDbStatus(isOnline, text) {
    const badge = document.getElementById('dbStatusBadge');
    const statusText = document.getElementById('dbStatusText');
    if (!badge || !statusText) return;

    if (isOnline) {
        badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium';
        statusText.innerText = text || 'Supabase เชื่อมต่อแล้ว';
    } else {
        badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium';
        statusText.innerText = text || 'Supabase ออฟไลน์';
    }
}

// ==============================================================================
// 2. MASTER INVENTORY DATA LOADING & METRICS
// ==============================================================================
async function loadInventory() {
    if (!InventoryApp.supabaseClient) return;

    const tbody = document.getElementById('inventoryTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-12 text-center text-slate-400">
                    <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mr-2"></div>
                    กำลังดึงข้อมูลคลังสินค้าจาก Supabase...
                </td>
            </tr>
        `;
    }

    try {
        const { data, error } = await InventoryApp.supabaseClient
            .from('product_labels')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        InventoryApp.products = data || [];
        calculateMetrics(InventoryApp.products);
        renderTable();
        populateMoveProductSelect();

    } catch (err) {
        console.error('Load inventory error:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-8 text-center text-rose-500">
                        <i class="bi bi-exclamation-triangle-fill text-2xl block mb-1"></i>
                        ไม่สามารถดึงข้อมูลคลังสินค้าได้: ${escapeHtml(err.message || err)}<br>
                        <span class="text-xs text-slate-400">กรุณาตรวจสอบการตั้งค่า URL/Key หรือ Schema ใน Supabase</span>
                    </td>
                </tr>
            `;
        }
    }
}

function calculateMetrics(items) {
    let totalStock = 0;
    let lowStockCount = 0;
    let outStockCount = 0;
    let totalVal = 0;

    items.forEach(p => {
        const qty = parseInt(p.stock_quantity ?? 0, 10);
        const minAlert = parseInt(p.min_stock_alert ?? 5, 10);
        const price = parseFloat(p.price ?? 0);

        totalStock += qty;
        totalVal += (qty * price);

        if (qty <= 0) {
            outStockCount++;
        } else if (qty <= minAlert) {
            lowStockCount++;
        }
    });

    // Update Top 4 Metric Cards
    document.getElementById('metricTotalSkus').innerText = items.length.toLocaleString('th-TH');
    document.getElementById('metricTotalStock').innerText = totalStock.toLocaleString('th-TH');
    document.getElementById('metricLowStock').innerText = lowStockCount.toLocaleString('th-TH');
    document.getElementById('metricTotalValue').innerText = '฿' + Math.round(totalVal).toLocaleString('th-TH');

    // Update Tab count badges
    document.getElementById('tabCountAll').innerText = items.length;
    document.getElementById('tabCountLow').innerText = lowStockCount;
    document.getElementById('tabCountOut').innerText = outStockCount;
}

function getFilteredProducts() {
    let list = [...InventoryApp.products];

    // Filter by Tab
    if (InventoryApp.activeTab === 'INSTOCK') {
        list = list.filter(p => {
            const qty = parseInt(p.stock_quantity ?? 0, 10);
            const minAlert = parseInt(p.min_stock_alert ?? 5, 10);
            return qty > minAlert;
        });
    } else if (InventoryApp.activeTab === 'LOW') {
        list = list.filter(p => {
            const qty = parseInt(p.stock_quantity ?? 0, 10);
            const minAlert = parseInt(p.min_stock_alert ?? 5, 10);
            return qty > 0 && qty <= minAlert;
        });
    } else if (InventoryApp.activeTab === 'OUT') {
        list = list.filter(p => parseInt(p.stock_quantity ?? 0, 10) <= 0);
    }

    // Filter by Search Query
    if (InventoryApp.searchQuery) {
        const q = InventoryApp.searchQuery.toLowerCase();
        list = list.filter(p => {
            return (p.sku && p.sku.toLowerCase().includes(q)) ||
                   (p.name && p.name.toLowerCase().includes(q)) ||
                   (p.variant && p.variant.toLowerCase().includes(q)) ||
                   (p.warehouse_location && p.warehouse_location.toLowerCase().includes(q)) ||
                   (p.distributor && p.distributor.toLowerCase().includes(q));
        });
    }

    return list;
}

function renderTable() {
    const tbody = document.getElementById('inventoryTableBody');
    const showingCount = document.getElementById('showingCount');
    if (!tbody) return;

    const items = getFilteredProducts();
    if (showingCount) showingCount.innerText = items.length;

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-12 text-center text-slate-400">
                    <i class="bi bi-inbox text-3xl block mb-2 text-slate-300"></i>
                    ไม่พบรายการสินค้าในเงื่อนไขที่เลือก
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(p => {
        const qty = parseInt(p.stock_quantity ?? 0, 10);
        const minAlert = parseInt(p.min_stock_alert ?? 5, 10);
        const price = parseFloat(p.price ?? 0);
        const totalValue = qty * price;

        let statusBadge = '';
        if (qty <= 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> หมดสต็อก
            </span>`;
        } else if (qty <= minAlert) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <i class="bi bi-exclamation-triangle-fill text-[10px]"></i> ${qty} ตัว (ใกล้หมด)
            </span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ${qty} ตัว
            </span>`;
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-blue-600">
                    <span class="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">${escapeHtml(p.sku)}</span>
                </td>
                <td class="py-3 px-3">
                    <div class="font-bold text-slate-900 line-clamp-1">${escapeHtml(p.name)}</div>
                    <div class="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>${escapeHtml(p.variant || '-')}</span>
                        ${p.distributor ? `<span class="text-slate-400">• ${escapeHtml(p.distributor)}</span>` : ''}
                    </div>
                </td>
                <td class="py-3 px-3 text-center">
                    <span class="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                        ${escapeHtml(p.warehouse_location || 'A-1')}
                    </span>
                </td>
                <td class="py-3 px-3 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="adjustStockDirect(${p.id}, -1)" 
                            class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition-colors" title="ตัดจ่าย -1">
                            -
                        </button>
                        ${statusBadge}
                        <button type="button" onclick="adjustStockDirect(${p.id}, 1)" 
                            class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 flex items-center justify-center text-xs font-bold transition-colors" title="รับเข้า +1">
                            +
                        </button>
                    </div>
                </td>
                <td class="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                    ${price > 0 ? '฿' + price.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                </td>
                <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                    ${totalValue > 0 ? '฿' + totalValue.toLocaleString('th-TH', { minimumFractionDigits: 0 }) : '-'}
                </td>
                <td class="py-3 px-4 text-center whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                        <!-- Direct Link to Print Label for this product -->
                        <a href="../product_labels/label_printer.html?sku=${encodeURIComponent(p.sku)}" 
                            class="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="สั่งพิมพ์ฉลากดวงนี้">
                            <i class="bi bi-printer-fill"></i>
                        </a>
                        <button type="button" onclick="editProductModal(${p.id})" 
                            class="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors" title="แก้ไขข้อมูล">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button type="button" onclick="deleteProduct(${p.id})" 
                            class="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors" title="ลบสินค้า">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterByTab(tab) {
    InventoryApp.activeTab = tab;

    const tabAll = document.getElementById('tabAll');
    const tabIn = document.getElementById('tabInStock');
    const tabLow = document.getElementById('tabLow');
    const tabOut = document.getElementById('tabOut');

    const defaultClass = 'px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap';
    const activeClass = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-emerald-600 text-white shadow-sm flex items-center gap-1.5 whitespace-nowrap';

    tabAll.className = tab === 'ALL' ? activeClass : defaultClass;
    tabIn.className = tab === 'INSTOCK' ? activeClass : defaultClass;
    tabLow.className = tab === 'LOW' ? activeClass : defaultClass;
    tabOut.className = tab === 'OUT' ? activeClass : defaultClass;

    renderTable();
}

function handleSearchInput() {
    InventoryApp.searchQuery = (document.getElementById('inventorySearch')?.value || '').trim();
    renderTable();
}

// ==============================================================================
// 3. QUICK STOCK ADJUSTMENT & INBOUND/OUTBOUND
// ==============================================================================
async function adjustStockDirect(id, delta) {
    const item = InventoryApp.products.find(p => p.id === id);
    if (!item) return;

    const currentQty = parseInt(item.stock_quantity ?? 0, 10);
    const newQty = Math.max(0, currentQty + delta);

    item.stock_quantity = newQty;
    calculateMetrics(InventoryApp.products);
    renderTable();

    try {
        await InventoryApp.supabaseClient
            .from('product_labels')
            .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', id);

        // Record history log
        await InventoryApp.supabaseClient
            .from('stock_transactions')
            .insert({
                product_id: item.id,
                sku: item.sku,
                type: delta > 0 ? 'IN' : 'OUT',
                quantity: Math.abs(delta),
                balance_after: newQty,
                note: delta > 0 ? 'รับเข้าด่วนผ่านหน้าคลังสินค้า (+1)' : 'ตัดจ่ายด่วนผ่านหน้าคลังสินค้า (-1)'
            });

    } catch (err) {
        console.error('Adjust stock error:', err);
        item.stock_quantity = currentQty;
        calculateMetrics(InventoryApp.products);
        renderTable();
        alert('เกิดข้อผิดพลาดในการอัปเดตสต็อก: ' + (err.message || err));
    }
}

function populateMoveProductSelect() {
    const select = document.getElementById('moveProductSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- เลือกสินค้า --</option>' +
        InventoryApp.products.map(p => `
            <option value="${p.id}">
                ${escapeHtml(p.sku)} - ${escapeHtml(p.name)} (${escapeHtml(p.variant || 'ไม่มีไซส์')}) [คงเหลือ: ${p.stock_quantity ?? 0}]
            </option>
        `).join('');
}

function openStockMovementModal() {
    const modal = document.getElementById('stockMovementModal');
    if (modal) modal.classList.remove('hidden');
}

function closeStockMovementModal() {
    const modal = document.getElementById('stockMovementModal');
    if (modal) modal.classList.add('hidden');
}

async function handleExecuteStockMovement(event) {
    if (event) event.preventDefault();

    const prodId = parseInt(document.getElementById('moveProductSelect')?.value, 10);
    const type = document.querySelector('input[name="moveType"]:checked')?.value || 'IN';
    const qty = parseInt(document.getElementById('moveQty')?.value, 10);
    const note = (document.getElementById('moveNote')?.value || '').trim();

    if (!prodId || isNaN(qty) || qty <= 0) {
        alert('กรุณาเลือกสินค้าและระบุจำนวนที่ถูกต้อง');
        return;
    }

    const item = InventoryApp.products.find(p => p.id === prodId);
    if (!item) return;

    const currentStock = parseInt(item.stock_quantity ?? 0, 10);
    let newStock = currentStock;

    if (type === 'IN') {
        newStock += qty;
    } else if (type === 'OUT') {
        if (currentStock < qty) {
            alert(`ไม่สามารถตัดจ่ายได้ เนื่องจากสต็อกคงเหลือ (${currentStock}) น้อยกว่าจำนวนที่เบิก (${qty})`);
            return;
        }
        newStock -= qty;
    } else if (type === 'ADJUST') {
        newStock = qty; // Direct adjustment
    }

    const submitBtn = document.getElementById('btnSubmitMovement');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const { error } = await InventoryApp.supabaseClient
            .from('product_labels')
            .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
            .eq('id', prodId);

        if (error) throw error;

        // Log transaction
        await InventoryApp.supabaseClient
            .from('stock_transactions')
            .insert({
                product_id: item.id,
                sku: item.sku,
                type: type,
                quantity: qty,
                balance_after: newStock,
                note: note || (type === 'IN' ? 'รับเข้าสต็อก' : (type === 'OUT' ? 'ตัดจ่ายสินค้า' : 'ปรับยอดสต็อก'))
            });

        closeStockMovementModal();
        await loadInventory();
        alert('บันทึกการเคลื่อนไหวสต็อกเรียบร้อยแล้ว');

    } catch (err) {
        console.error('Movement error:', err);
        alert('เกิดข้อผิดพลาด: ' + (err.message || err));
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// ==============================================================================
// 4. AUDIT HISTORY LOG MODAL
// ==============================================================================
async function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    const tbody = document.getElementById('historyTableBody');
    if (modal) modal.classList.remove('hidden');

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-400 font-sans">
                    <div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent mr-2"></div>
                    กำลังโหลดประวัติการรับเข้า-เบิกออก...
                </td>
            </tr>
        `;
    }

    try {
        const { data, error } = await InventoryApp.supabaseClient
            .from('stock_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-slate-400 font-sans">
                        ยังไม่มีประวัติการทำรายการสต็อก
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(t => {
            let typeBadge = '';
            if (t.type === 'IN') {
                typeBadge = `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">+ รับเข้า</span>`;
            } else if (t.type === 'OUT') {
                typeBadge = `<span class="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold">- ตัดจ่าย</span>`;
            } else {
                typeBadge = `<span class="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">ปรับยอด</span>`;
            }

            const dt = new Date(t.created_at);
            const timeStr = dt.toLocaleDateString('th-TH') + ' ' + dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">${timeStr}</td>
                    <td class="py-2.5 px-2 font-bold text-blue-600">${escapeHtml(t.sku)}</td>
                    <td class="py-2.5 px-2 text-center">${typeBadge}</td>
                    <td class="py-2.5 px-2 text-right font-bold text-slate-800">${t.quantity}</td>
                    <td class="py-2.5 px-2 text-right text-slate-600">${t.balance_after ?? '-'}</td>
                    <td class="py-2.5 px-3 text-slate-500 font-sans text-xs">${escapeHtml(t.note || '-')}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('History load error:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-6 text-center text-rose-500 font-sans">
                        ไม่สามารถดึงประวัติได้: ${escapeHtml(err.message || err)}
                    </td>
                </tr>
            `;
        }
    }
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.classList.add('hidden');
}

// ==============================================================================
// 5. PRODUCT ADD/EDIT MODAL
// ==============================================================================
function openProductModal() {
    InventoryApp.editingId = null;
    document.getElementById('modalProductTitle').innerText = 'เพิ่มสินค้าใหม่';
    document.getElementById('modalProdId').value = '';
    document.getElementById('modalSku').value = '';
    document.getElementById('modalName').value = '';
    document.getElementById('modalVariant').value = '';
    document.getElementById('modalPrice').value = '';
    document.getElementById('modalStock').value = '0';
    document.getElementById('modalMinAlert').value = '5';
    document.getElementById('modalLocation').value = 'A-01';
    document.getElementById('modalDistributor').value = 'บริษัท ซิกเนเจอร์ แอพพาเรล จำกัด';
    document.getElementById('modalCare').value = 'ซักเครื่องด้วยน้ำเย็น ห้ามใช้น้ำยาฟอกขาว รีดด้วยไฟปานกลาง';

    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('hidden');
}

function editProductModal(id) {
    const item = InventoryApp.products.find(p => p.id === id);
    if (!item) return;

    InventoryApp.editingId = id;
    document.getElementById('modalProductTitle').innerText = `แก้ไขสินค้า: ${item.sku}`;
    document.getElementById('modalProdId').value = item.id;
    document.getElementById('modalSku').value = item.sku || '';
    document.getElementById('modalName').value = item.name || '';
    document.getElementById('modalVariant').value = item.variant || '';
    document.getElementById('modalPrice').value = item.price !== null ? item.price : '';
    document.getElementById('modalStock').value = item.stock_quantity ?? 0;
    document.getElementById('modalMinAlert').value = item.min_stock_alert ?? 5;
    document.getElementById('modalLocation').value = item.warehouse_location || 'A-01';
    document.getElementById('modalDistributor').value = item.distributor || '';
    document.getElementById('modalCare').value = item.care_instructions || '';

    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('hidden');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.add('hidden');
}

function generateRandomSkuModal() {
    const prefixes = ['TSH', 'POL', 'HD', 'JKT', 'PNT', 'DRS', 'CAP'];
    const colors = ['WHT', 'BLK', 'NVY', 'GRY', 'RED', 'BLU', 'BEI'];
    const sizes = ['S', 'M', 'L', 'XL', '2XL', 'F'];

    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const s = sizes[Math.floor(Math.random() * sizes.length)];
    const randNum = Math.floor(100 + Math.random() * 900);

    document.getElementById('modalSku').value = `${p}-${c}-${s}-${randNum}`;
}

async function handleSaveProductModal(event) {
    if (event) event.preventDefault();

    const sku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase();
    const name = (document.getElementById('modalName')?.value || '').trim();
    const variant = (document.getElementById('modalVariant')?.value || '').trim();
    const priceVal = document.getElementById('modalPrice')?.value;
    const price = priceVal !== '' ? parseFloat(priceVal) : null;
    const stockVal = document.getElementById('modalStock')?.value;
    const stock_quantity = stockVal !== '' ? parseInt(stockVal, 10) : 0;
    const minVal = document.getElementById('modalMinAlert')?.value;
    const min_stock_alert = minVal !== '' ? parseInt(minVal, 10) : 5;
    const warehouse_location = (document.getElementById('modalLocation')?.value || 'A-1').trim().toUpperCase();
    const distributor = (document.getElementById('modalDistributor')?.value || '').trim();
    const care_instructions = (document.getElementById('modalCare')?.value || '').trim();

    if (!sku || !name) {
        alert('กรุณากรอกรหัส SKU และชื่อสินค้า');
        return;
    }

    const payload = {
        sku,
        name,
        variant,
        price,
        stock_quantity,
        min_stock_alert,
        warehouse_location,
        distributor,
        care_instructions,
        updated_at: new Date().toISOString()
    };

    const saveBtn = document.getElementById('btnSaveModalProd');
    if (saveBtn) saveBtn.disabled = true;

    try {
        const { error } = await InventoryApp.supabaseClient
            .from('product_labels')
            .upsert(payload, { onConflict: 'sku' });

        if (error) throw error;

        closeProductModal();
        await loadInventory();
        alert('บันทึกข้อมูลสินค้าเรียบร้อยแล้ว');

    } catch (err) {
        console.error('Save product modal error:', err);
        alert('ไม่สามารถบันทึกได้: ' + (err.message || err));
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function deleteProduct(id) {
    const item = InventoryApp.products.find(p => p.id === id);
    if (!item) return;

    if (!confirm(`ยืนยันการลบสินค้า SKU: "${item.sku}" ออกจากคลังใช่หรือไม่?`)) return;

    try {
        const { error } = await InventoryApp.supabaseClient
            .from('product_labels')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadInventory();
    } catch (err) {
        console.error('Delete error:', err);
        alert('ลบไม่สำเร็จ: ' + (err.message || err));
    }
}

// ==============================================================================
// 6. EXPORT TO CSV
// ==============================================================================
function exportInventoryToCSV() {
    if (!InventoryApp.products || InventoryApp.products.length === 0) {
        alert('ไม่มีข้อมูลสินค้าสำหรับส่งออก');
        return;
    }

    const headers = ['SKU', 'Product Name', 'Variant', 'Rack Location', 'Stock Quantity', 'Min Stock Alert', 'Price (THB)', 'Total Value (THB)', 'Distributor'];
    const rows = InventoryApp.products.map(p => {
        const qty = parseInt(p.stock_quantity ?? 0, 10);
        const price = parseFloat(p.price ?? 0);
        return [
            `"${p.sku || ''}"`,
            `"${(p.name || '').replace(/"/g, '""')}"`,
            `"${(p.variant || '').replace(/"/g, '""')}"`,
            `"${p.warehouse_location || ''}"`,
            qty,
            p.min_stock_alert ?? 5,
            price,
            qty * price,
            `"${(p.distributor || '').replace(/"/g, '""')}"`
        ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `garment_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==============================================================================
// 7. SETTINGS MODAL & WORKSPACE NAVIGATION
// ==============================================================================
function openSupabaseModal() {
    const modal = document.getElementById('supabaseModal');
    const urlInput = document.getElementById('cfgSupabaseUrl');
    const keyInput = document.getElementById('cfgSupabaseKey');

    if (urlInput) urlInput.value = InventoryApp.supabaseUrl;
    if (keyInput) keyInput.value = InventoryApp.supabaseKey;

    if (modal) modal.classList.remove('hidden');
}

function closeSupabaseModal() {
    const modal = document.getElementById('supabaseModal');
    if (modal) modal.classList.add('hidden');
}

function handleSaveSupabaseConfig(event) {
    if (event) event.preventDefault();
    const url = (document.getElementById('cfgSupabaseUrl')?.value || '').trim();
    const key = (document.getElementById('cfgSupabaseKey')?.value || '').trim();

    if (!url || !key) return;

    localStorage.setItem('sgyver_label_sb_url', url);
    localStorage.setItem('sgyver_label_sb_key', key);

    InventoryApp.supabaseUrl = url;
    InventoryApp.supabaseKey = key;

    initSupabase();
    loadInventory();
    closeSupabaseModal();
    alert('บันทึกการตั้งค่าแล้ว');
}

function handleBackToWorkspace() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'closeWorkspaceApp' }, '*');
    } else if (document.referrer && document.referrer.includes('my_workspace')) {
        window.location.href = document.referrer;
    } else {
        window.location.href = '../../../my_workspace.html';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    loadInventory();
});
