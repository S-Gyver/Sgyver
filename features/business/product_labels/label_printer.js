/**
 * ==============================================================================
 * 🏷️ S-Gyver Garment Product Label Studio - Frontend Application Engine
 * With Full Warehouse & Inventory Stock Management Integration
 * ==============================================================================
 */

// Application State
const AppState = {
    supabaseClient: null,
    supabaseUrl: '',
    supabaseKey: '',
    products: [],
    currentProduct: {
        sku: 'W1122',
        brand: 'Paperstudio (เปเปอร์สตูดิโอ)',
        product_type: 'เสื้อผ้าแฟชั่น',
        name: 'เสื้อผ้าแฟชั่น',
        variant: 'M L XL XXL',
        usage_info: 'สำหรับสวมใส่',
        care_instructions: 'ควรซักก่อนสวมใส่ / ห้ามใช้น้ำยาฟอกขาว / ควรรีดด้วยไฟปานกลาง / ควรแยกผ้าสีกับผ้าขาวก่อนซัก การซักด้วยเครื่อง อาจทำให้เนื้อผ้าเสียรูปทรง',
        manufacturer: 'ประเทศจีน',
        distributor: 'บริษัท เปเปอร์สตูดิโอ',
        distributor_address: '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160',
        price_text: 'ระบุ ณ จุดขาย',
        price: null,
        stock_quantity: 48,
        min_stock_alert: 5,
        warehouse_location: 'A-01'
    },
    labelSize: '57roll', // PeriPage A6 (57mm continuous roll)
    barcodeType: 'CODE128', // 'CODE128' or 'QR'
    scanMode: 'PRINT', // 'PRINT', 'IN', 'OUT'
    stats: {
        scannedToday: 0,
        printedToday: 0
    },
    tearFeedMm: parseInt(localStorage.getItem('sgyver_label_tear_feed') || '10', 10),
    isEditing: false,
    editId: null
};

// Audio Synthesizer (Web Audio API)
const SoundFx = {
    audioCtx: null,

    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
    },

    playSuccessBeep() {
        if (!document.getElementById('chkSoundFx')?.checked) return;
        try {
            this.init();
            if (!this.audioCtx) return;
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1760, ctx.currentTime); // High pleasant A6 beep
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } catch (_) {}
    },

    playStockInChime() {
        if (!document.getElementById('chkSoundFx')?.checked) return;
        try {
            this.init();
            if (!this.audioCtx) return;
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            // Two-tone rising chime (Inbound / Stock +1)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, ctx.currentTime);
            osc1.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
            gain1.gain.setValueAtTime(0.2, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start();
            osc1.stop(ctx.currentTime + 0.22);
        } catch (_) {}
    },

    playStockOutChime() {
        if (!document.getElementById('chkSoundFx')?.checked) return;
        try {
            this.init();
            if (!this.audioCtx) return;
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            // Two-tone falling tone (Outbound / Stock -1)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
            osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08); // G5
            gain1.gain.setValueAtTime(0.22, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start();
            osc1.stop(ctx.currentTime + 0.25);
        } catch (_) {}
    },

    playErrorBuzz() {
        if (!document.getElementById('chkSoundFx')?.checked) return;
        try {
            this.init();
            if (!this.audioCtx) return;
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.28);
        } catch (_) {}
    },

    playPrintChime() {
        if (!document.getElementById('chkSoundFx')?.checked) return;
        try {
            this.init();
            if (!this.audioCtx) return;
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (_) {}
    }
};

// ==============================================================================
// 1. SUPABASE CLIENT & CONFIGURATION
// ==============================================================================
function initSupabase() {
    const localUrl = localStorage.getItem('sgyver_label_sb_url');
    const localKey = localStorage.getItem('sgyver_label_sb_key');

    if (localUrl && localKey) {
        AppState.supabaseUrl = localUrl;
        AppState.supabaseKey = localKey;
    } else if (window.SUPABASE_URL && window.SUPABASE_KEY) {
        AppState.supabaseUrl = window.SUPABASE_URL;
        AppState.supabaseKey = window.SUPABASE_KEY;
    } else {
        // Fallback default
        AppState.supabaseUrl = 'https://igiihteeeprpcxxlldkd.supabase.co';
        AppState.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';
    }

    try {
        if (window.supabase) {
            AppState.supabaseClient = window.supabase.createClient(AppState.supabaseUrl, AppState.supabaseKey, {
                db: { schema: 'public' }
            });
            updateDbStatusBadge(true, 'เชื่อมต่อแล้ว');
        } else {
            updateDbStatusBadge(false, 'ไม่พบ Supabase Library');
        }
    } catch (err) {
        console.error('Failed to init Supabase:', err);
        updateDbStatusBadge(false, 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

function updateDbStatusBadge(isOnline, text) {
    const badge = document.getElementById('dbStatusBadge');
    const statusText = document.getElementById('dbStatusText');
    if (!badge || !statusText) return;

    if (isOnline) {
        badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium';
        statusText.innerHTML = text || 'Supabase เชื่อมต่อแล้ว';
    } else {
        badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium';
        statusText.innerHTML = text || 'Supabase ออฟไลน์';
    }
}

// ==============================================================================
// 2. PRODUCT & INVENTORY CRUD OPERATIONS (SECTION 1)
// ==============================================================================
async function loadProductsList() {
    if (!AppState.supabaseClient) return;

    const tbody = document.getElementById('productsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-slate-400">
                    <div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                    กำลังโหลดข้อมูลสินค้า & สต็อก...
                </td>
            </tr>
        `;
    }

    try {
        const { data, error } = await AppState.supabaseClient
            .from('product_labels')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(150);

        if (error) throw error;

        AppState.products = data || [];
        renderProductsTable(AppState.products);
        updateWarehouseMetrics(AppState.products);

        const countEl = document.getElementById('productCount');
        if (countEl) countEl.innerText = AppState.products.length;
    } catch (err) {
        console.warn('Load products failed:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-rose-500">
                        <i class="bi bi-exclamation-triangle-fill text-lg block mb-1"></i>
                        ยังไม่มีตาราง product_labels หรือไม่สามารถดึงข้อมูลได้<br>
                        <span class="text-[11px] text-slate-400">กรุณารันไฟล์ SQL Schema ใน Supabase Dashboard</span>
                    </td>
                </tr>
            `;
        }
    }
}

function updateWarehouseMetrics(items) {
    const metricSkus = document.getElementById('metricTotalSkus');
    const metricStock = document.getElementById('metricTotalStock');
    const metricLow = document.getElementById('metricLowStock');
    const metricValue = document.getElementById('metricTotalValue');

    if (!items || items.length === 0) {
        if (metricSkus) metricSkus.innerText = '0';
        if (metricStock) metricStock.innerText = '0';
        if (metricLow) metricLow.innerText = '0';
        if (metricValue) metricValue.innerText = '฿0';
        return;
    }

    let totalStock = 0;
    let lowCount = 0;
    let totalValue = 0;

    items.forEach(p => {
        const qty = parseInt(p.stock_quantity ?? 0, 10);
        const minAlert = parseInt(p.min_stock_alert ?? 5, 10);
        const price = parseFloat(p.price ?? 0);

        totalStock += qty;
        if (qty <= minAlert) {
            lowCount++;
        }
        totalValue += (qty * price);
    });

    if (metricSkus) metricSkus.innerText = items.length.toLocaleString('th-TH');
    if (metricStock) metricStock.innerText = totalStock.toLocaleString('th-TH');
    if (metricLow) metricLow.innerText = lowCount.toLocaleString('th-TH');
    if (metricValue) metricValue.innerText = '฿' + Math.round(totalValue).toLocaleString('th-TH');
}

function renderProductsTable(items) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-6 text-center text-slate-400">
                    <i class="bi bi-inbox text-2xl block mb-1"></i>
                    ยังไม่มีข้อมูลสินค้าในระบบ
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(p => {
        const stockQty = parseInt(p.stock_quantity ?? 0, 10);
        const minAlert = parseInt(p.min_stock_alert ?? 5, 10);

        // Badge color based on stock health
        let stockBadge = '';
        if (stockQty <= 0) {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> หมด
            </span>`;
        } else if (stockQty <= minAlert) {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> ${stockQty} ตัว (ใกล้หมด)
            </span>`;
        } else {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                ${stockQty} ตัว
            </span>`;
        }

        return `
        <tr class="hover:bg-slate-50 transition-colors group">
            <td class="py-2 px-2.5">
                <div class="font-mono font-bold text-blue-600 text-xs">${escapeHtml(p.sku)}</div>
                <div class="text-[10px] text-slate-400 font-mono">
                    <i class="bi bi-geo-alt"></i> ${escapeHtml(p.warehouse_location || 'A-1')}
                </div>
            </td>
            <td class="py-2 px-2">
                <div class="font-semibold text-slate-800 line-clamp-1 text-xs">${escapeHtml(p.name)}</div>
                <div class="text-[11px] text-slate-500">${escapeHtml(p.variant || '-')}</div>
            </td>
            <td class="py-2 px-2 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1">
                    <button type="button" onclick="handleQuickStockAdjust(${p.id}, -1)" 
                        class="w-5 h-5 rounded bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition-colors" title="ตัดสต็อก -1">
                        -
                    </button>
                    ${stockBadge}
                    <button type="button" onclick="handleQuickStockAdjust(${p.id}, 1)" 
                        class="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 flex items-center justify-center text-xs font-bold transition-colors" title="เพิ่มสต็อก +1">
                        +
                    </button>
                </div>
            </td>
            <td class="py-2 px-2 text-right font-mono font-semibold text-slate-800 whitespace-nowrap text-xs">
                ${p.price ? '฿' + Number(p.price).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
            </td>
            <td class="py-2 px-2 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1">
                    <button type="button" onclick="handlePreviewItem(${p.id})" 
                        class="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="ดูตัวอย่างฉลาก">
                        <i class="bi bi-eye-fill"></i>
                    </button>
                    <button type="button" onclick="handleEditItem(${p.id})" 
                        class="p-1 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors" title="แก้ไขข้อมูล">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" onclick="handleDeleteItem(${p.id})" 
                        class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors" title="ลบสินค้า">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function filterProductsTable() {
    const q = (document.getElementById('tableSearchInput')?.value || '').trim().toLowerCase();
    if (!q) {
        renderProductsTable(AppState.products);
        return;
    }

    const filtered = AppState.products.filter(p => {
        return (p.sku && p.sku.toLowerCase().includes(q)) ||
               (p.name && p.name.toLowerCase().includes(q)) ||
               (p.variant && p.variant.toLowerCase().includes(q)) ||
               (p.warehouse_location && p.warehouse_location.toLowerCase().includes(q)) ||
               (p.distributor && p.distributor.toLowerCase().includes(q));
    });

    renderProductsTable(filtered);
}

// 📦 Quick 1-click Inventory Increment/Decrement right from the table
async function handleQuickStockAdjust(id, delta) {
    const item = AppState.products.find(p => p.id === id);
    if (!item) return;

    const currentQty = parseInt(item.stock_quantity ?? 0, 10);
    const newQty = Math.max(0, currentQty + delta);

    // Optimistic UI update
    item.stock_quantity = newQty;
    renderProductsTable(AppState.products);
    updateWarehouseMetrics(AppState.products);

    if (delta > 0) {
        SoundFx.playStockInChime();
    } else {
        SoundFx.playStockOutChime();
    }

    try {
        const { error } = await AppState.supabaseClient
            .from('product_labels')
            .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        // Log transaction
        await AppState.supabaseClient
            .from('stock_transactions')
            .insert({
                product_id: item.id,
                sku: item.sku,
                type: delta > 0 ? 'IN' : 'OUT',
                quantity: Math.abs(delta),
                balance_after: newQty,
                note: delta > 0 ? 'รับเข้าเร็วผ่านปุ่มหน้าตาราง' : 'ตัดจ่ายเร็วผ่านปุ่มหน้าตาราง'
            });

    } catch (err) {
        console.error('Quick stock adjust error:', err);
        // Rollback
        item.stock_quantity = currentQty;
        renderProductsTable(AppState.products);
        updateWarehouseMetrics(AppState.products);
        alert('ไม่สามารถอัปเดตสต็อกได้: ' + (err.message || err));
    }
}

async function handleSaveProduct(event) {
    if (event) event.preventDefault();

    const sku = (document.getElementById('formSku')?.value || '').trim().toUpperCase();
    const brand = (document.getElementById('formBrand')?.value || '').trim();
    const product_type = (document.getElementById('formProductType')?.value || '').trim();
    const name = product_type || (document.getElementById('formBrand')?.value || '').trim() || 'เสื้อผ้าแฟชั่น';
    const variant = (document.getElementById('formVariant')?.value || '').trim();
    const usage_info = (document.getElementById('formUsage')?.value || '').trim();
    const care_instructions = (document.getElementById('formCare')?.value || '').trim();
    const manufacturer = (document.getElementById('formManufacturer')?.value || '').trim();
    const distributor = (document.getElementById('formDistributor')?.value || '').trim();
    const distributor_address = (document.getElementById('formDistributorAddress')?.value || '').trim();
    const isPriceAsSpecified = document.getElementById('chkPriceAsSpecified')?.checked;
    const priceVal = document.getElementById('formPrice')?.value;
    const price = (!isPriceAsSpecified && priceVal !== '') ? parseFloat(priceVal) : null;
    const price_text = isPriceAsSpecified ? 'ระบุ ณ จุดขาย' : (price !== null ? `฿${Number(price).toLocaleString('th-TH')} บาท` : 'ระบุ ณ จุดขาย');
    const stockVal = document.getElementById('formStock')?.value;
    const stock_quantity = stockVal !== '' ? parseInt(stockVal, 10) : 0;
    const minVal = document.getElementById('formMinStock')?.value;
    const min_stock_alert = minVal !== '' ? parseInt(minVal, 10) : 5;
    const warehouse_location = (document.getElementById('formLocation')?.value || 'A-01').trim().toUpperCase();

    if (!sku) {
        alert('กรุณากรอกรหัส SKU / บาร์โค้ด');
        return;
    }

    const submitBtn = document.getElementById('btnSubmitForm');
    const submitText = document.getElementById('btnSubmitText');
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.innerText = 'กำลังบันทึกข้อมูลและสต็อก...';

    const fullDistributor = distributor_address ? `${distributor} ${distributor_address}` : distributor;
    const payload = {
        sku,
        name,
        variant,
        price,
        stock_quantity,
        min_stock_alert,
        warehouse_location,
        distributor: fullDistributor,
        care_instructions,
        brand,
        product_type,
        usage_info,
        manufacturer,
        distributor_address,
        price_text,
        updated_at: new Date().toISOString()
    };

    try {
        let { data, error } = await AppState.supabaseClient
            .from('product_labels')
            .upsert(payload, { onConflict: 'sku' })
            .select();

        if (error) {
            // Fallback for existing database without extended columns
            const basicPayload = {
                sku,
                name,
                variant,
                price,
                stock_quantity,
                min_stock_alert,
                warehouse_location,
                distributor: fullDistributor,
                care_instructions,
                updated_at: new Date().toISOString()
            };
            const fallbackRes = await AppState.supabaseClient
                .from('product_labels')
                .upsert(basicPayload, { onConflict: 'sku' })
                .select();
            if (fallbackRes.error) throw fallbackRes.error;
            data = fallbackRes.data;
        }

        SoundFx.playSuccessBeep();

        const savedItem = (data && data[0]) ? data[0] : payload;
        selectProductForPreview(savedItem, true);

        await loadProductsList();
        alert('บันทึกข้อมูลสินค้าและอัปเดตสต็อกเรียบร้อยแล้ว');
    } catch (err) {
        console.error('Save product failed:', err);
        SoundFx.playErrorBuzz();
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || err.details || err));
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.innerText = 'บันทึกลง Supabase (Upsert)';
    }
}

function handlePreviewItem(id) {
    const item = AppState.products.find(p => p.id === id);
    if (!item) return;
    selectProductForPreview(item, true);
}

function handleEditItem(id) {
    const item = AppState.products.find(p => p.id === id);
    if (!item) return;

    AppState.isEditing = true;
    AppState.editId = item.id;

    if (document.getElementById('formSku')) document.getElementById('formSku').value = item.sku || '';
    if (document.getElementById('formBrand')) document.getElementById('formBrand').value = item.brand || 'Paperstudio (เปเปอร์สตูดิโอ)';
    if (document.getElementById('formProductType')) document.getElementById('formProductType').value = item.product_type || item.name || 'เสื้อผ้าแฟชั่น';
    if (document.getElementById('formVariant')) document.getElementById('formVariant').value = item.variant || 'M L XL XXL';
    if (document.getElementById('formUsage')) document.getElementById('formUsage').value = item.usage_info || 'สำหรับสวมใส่';
    if (document.getElementById('formCare')) document.getElementById('formCare').value = item.care_instructions || '';
    if (document.getElementById('formManufacturer')) document.getElementById('formManufacturer').value = item.manufacturer || 'ประเทศจีน';
    if (document.getElementById('formDistributor')) document.getElementById('formDistributor').value = item.distributor || 'บริษัท เปเปอร์สตูดิโอ';
    if (document.getElementById('formDistributorAddress')) document.getElementById('formDistributorAddress').value = item.distributor_address || '';

    const chkPrice = document.getElementById('chkPriceAsSpecified');
    const priceInput = document.getElementById('formPrice');
    const wrapper = document.getElementById('priceInputWrapper');
    if (item.price !== null && item.price !== undefined && item.price !== '' && !isNaN(item.price)) {
        if (chkPrice) chkPrice.checked = false;
        if (wrapper) wrapper.classList.remove('hidden');
        if (priceInput) priceInput.value = item.price;
    } else {
        if (chkPrice) chkPrice.checked = true;
        if (wrapper) wrapper.classList.add('hidden');
        if (priceInput) priceInput.value = '';
    }

    if (document.getElementById('formStock')) document.getElementById('formStock').value = item.stock_quantity ?? 0;
    if (document.getElementById('formMinStock')) document.getElementById('formMinStock').value = item.min_stock_alert ?? 5;
    if (document.getElementById('formLocation')) document.getElementById('formLocation').value = item.warehouse_location || 'A-01';

    const badge = document.getElementById('formModeBadge');
    if (badge) {
        badge.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200';
        badge.innerText = `โหมดแก้ไข: ${item.sku}`;
    }

    selectProductForPreview(item, false);

    document.getElementById('sectionForm')?.scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteItem(id) {
    const item = AppState.products.find(p => p.id === id);
    if (!item) return;

    if (!confirm(`ยืนยันการลบสินค้า SKU: "${item.sku}" ออกจากระบบและคลังสินค้าใช่หรือไม่?`)) return;

    try {
        const { error } = await AppState.supabaseClient
            .from('product_labels')
            .delete()
            .eq('id', id);

        if (error) throw error;

        SoundFx.playSuccessBeep();
        await loadProductsList();
    } catch (err) {
        console.error('Delete failed:', err);
        SoundFx.playErrorBuzz();
        alert('ไม่สามารถลบสินค้าได้: ' + (err.message || err));
    }
}

function resetProductForm() {
    AppState.isEditing = false;
    AppState.editId = null;

    document.getElementById('productForm')?.reset();
    document.getElementById('editProductId').value = '';
    if (document.getElementById('formSku')) document.getElementById('formSku').value = 'W1122';
    if (document.getElementById('formBrand')) document.getElementById('formBrand').value = 'Paperstudio (เปเปอร์สตูดิโอ)';
    if (document.getElementById('formProductType')) document.getElementById('formProductType').value = 'เสื้อผ้าแฟชั่น';
    if (document.getElementById('formVariant')) document.getElementById('formVariant').value = 'M L XL XXL';
    if (document.getElementById('formUsage')) document.getElementById('formUsage').value = 'สำหรับสวมใส่';
    if (document.getElementById('formCare')) document.getElementById('formCare').value = 'ควรซักก่อนสวมใส่ / ห้ามใช้น้ำยาฟอกขาว / ควรรีดด้วยไฟปานกลาง / ควรแยกผ้าสีกับผ้าขาวก่อนซัก การซักด้วยเครื่อง อาจทำให้เนื้อผ้าเสียรูปทรง';
    if (document.getElementById('formManufacturer')) document.getElementById('formManufacturer').value = 'ประเทศจีน';
    if (document.getElementById('formDistributor')) document.getElementById('formDistributor').value = 'บริษัท เปเปอร์สตูดิโอ';
    if (document.getElementById('formDistributorAddress')) document.getElementById('formDistributorAddress').value = '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160';

    const chkPrice = document.getElementById('chkPriceAsSpecified');
    if (chkPrice) chkPrice.checked = true;
    const wrapper = document.getElementById('priceInputWrapper');
    if (wrapper) wrapper.classList.add('hidden');
    const priceInput = document.getElementById('formPrice');
    if (priceInput) priceInput.value = '';

    if (document.getElementById('formStock')) document.getElementById('formStock').value = '48';
    if (document.getElementById('formMinStock')) document.getElementById('formMinStock').value = '5';
    if (document.getElementById('formLocation')) document.getElementById('formLocation').value = 'A-01';

    const badge = document.getElementById('formModeBadge');
    if (badge) {
        badge.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200';
        badge.innerText = 'โหมด: เพิ่มสินค้าใหม่';
    }

    onFormInputChange();
    refocusScanner();
}

function generateRandomSku() {
    const prefixes = ['W', 'TSH', 'POL', 'HD', 'JKT', 'PNT', 'DRS'];
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const generated = `${p}${randNum}`;
    const skuInput = document.getElementById('formSku');
    if (skuInput) {
        skuInput.value = generated;
        onFormInputChange();
    }
}

function setCarePreset(text) {
    const careInput = document.getElementById('formCare');
    if (careInput) {
        careInput.value = text;
        onFormInputChange();
    }
}

function setQuickInput(fieldId, value) {
    const el = document.getElementById(fieldId);
    if (el) {
        el.value = value;
        onFormInputChange();
    }
}

function togglePriceAsSpecified(checked) {
    const wrapper = document.getElementById('priceInputWrapper');
    const formPrice = document.getElementById('formPrice');
    if (wrapper) {
        if (checked) {
            wrapper.classList.add('hidden');
            if (formPrice) formPrice.value = '';
        } else {
            wrapper.classList.remove('hidden');
            if (formPrice && !formPrice.value) formPrice.value = '280';
        }
    }
    onFormInputChange();
}

function onFormInputChange() {
    const sku = (document.getElementById('formSku')?.value || '').trim() || 'W1122';
    const brand = (document.getElementById('formBrand')?.value || '').trim() || 'Paperstudio (เปเปอร์สตูดิโอ)';
    const product_type = (document.getElementById('formProductType')?.value || '').trim() || 'เสื้อผ้าแฟชั่น';
    const variant = (document.getElementById('formVariant')?.value || '').trim() || 'M L XL XXL';
    const usage_info = (document.getElementById('formUsage')?.value || '').trim() || 'สำหรับสวมใส่';
    const care_instructions = (document.getElementById('formCare')?.value || '').trim() || 'ควรซักก่อนสวมใส่ / ห้ามใช้น้ำยาฟอกขาว / ควรรีดด้วยไฟปานกลาง / ควรแยกผ้าสีกับผ้าขาวก่อนซัก การซักด้วยเครื่อง อาจทำให้เนื้อผ้าเสียรูปทรง';
    const manufacturer = (document.getElementById('formManufacturer')?.value || '').trim() || 'ประเทศจีน';
    const distributor = (document.getElementById('formDistributor')?.value || '').trim() || 'บริษัท เปเปอร์สตูดิโอ';
    const distributor_address = (document.getElementById('formDistributorAddress')?.value || '').trim() || '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160';
    const isPriceAsSpecified = document.getElementById('chkPriceAsSpecified')?.checked;
    const priceVal = document.getElementById('formPrice')?.value;
    const price = (!isPriceAsSpecified && priceVal !== '') ? parseFloat(priceVal) : null;
    const price_text = isPriceAsSpecified ? 'ระบุ ณ จุดขาย' : (price !== null ? `฿${Number(price).toLocaleString('th-TH')} บาท` : 'ระบุ ณ จุดขาย');
    const stockVal = document.getElementById('formStock')?.value;
    const stock_quantity = stockVal !== '' ? parseInt(stockVal, 10) : 48;
    const warehouse_location = (document.getElementById('formLocation')?.value || 'A-01').trim();

    AppState.currentProduct = {
        ...AppState.currentProduct,
        sku,
        brand,
        product_type,
        name: product_type,
        variant,
        usage_info,
        care_instructions,
        manufacturer,
        distributor,
        distributor_address,
        price,
        price_text,
        stock_quantity,
        warehouse_location
    };

    updateLabelPreview(AppState.currentProduct);
}

// ==============================================================================
// 3. QUICK SCANNER & OPERATION MODES (SECTION 2)
// ==============================================================================
function setScanMode(mode) {
    AppState.scanMode = mode;

    const btnPrint = document.getElementById('btnModePrint');
    const btnIn = document.getElementById('btnModeIn');
    const btnOut = document.getElementById('btnModeOut');

    const defaultClass = 'py-1 px-1.5 rounded-lg text-[10.5px] font-medium transition-all text-indigo-300 hover:text-white flex flex-col items-center gap-0.5';
    const activePrint = 'py-1 px-1.5 rounded-lg text-[10.5px] font-bold transition-all bg-blue-600 text-white shadow-sm flex flex-col items-center gap-0.5';
    const activeIn = 'py-1 px-1.5 rounded-lg text-[10.5px] font-bold transition-all bg-emerald-600 text-white shadow-sm flex flex-col items-center gap-0.5';
    const activeOut = 'py-1 px-1.5 rounded-lg text-[10.5px] font-bold transition-all bg-rose-600 text-white shadow-sm flex flex-col items-center gap-0.5';

    if (btnPrint) btnPrint.className = mode === 'PRINT' ? activePrint : defaultClass;
    if (btnIn) btnIn.className = mode === 'IN' ? activeIn : defaultClass;
    if (btnOut) btnOut.className = mode === 'OUT' ? activeOut : defaultClass;

    refocusScanner();
}

async function handleScannerKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = document.getElementById('scannerInput');
        if (!input) return;

        const rawCode = (input.value || '').trim().toUpperCase();
        if (!rawCode) return;

        await processBarcodeScan(rawCode);
    }
}

async function processBarcodeScan(sku) {
    const timestampEl = document.getElementById('scanTimestamp');
    const feedbackEl = document.getElementById('scanFeedbackContent');
    const input = document.getElementById('scannerInput');

    if (timestampEl) {
        timestampEl.innerText = new Date().toLocaleTimeString('th-TH');
    }

    if (feedbackEl) {
        feedbackEl.innerHTML = `
            <div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-sky-400 border-t-transparent mb-1"></div>
            <p class="text-xs text-sky-300">กำลังประมวลผล SKU: <span class="font-mono font-bold">${escapeHtml(sku)}</span>...</p>
        `;
    }

    try {
        // Query from Supabase
        const { data, error } = await AppState.supabaseClient
            .from('product_labels')
            .select('*')
            .eq('sku', sku)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            AppState.stats.scannedToday++;
            const statSuccessEl = document.getElementById('statSuccessCount');
            if (statSuccessEl) statSuccessEl.innerText = AppState.stats.scannedToday;

            // Handle based on current scan mode
            if (AppState.scanMode === 'IN') {
                // 📥 Inbound: Stock +1
                const newStock = (parseInt(data.stock_quantity ?? 0, 10)) + 1;
                data.stock_quantity = newStock;

                await AppState.supabaseClient
                    .from('product_labels')
                    .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
                    .eq('id', data.id);

                await AppState.supabaseClient
                    .from('stock_transactions')
                    .insert({
                        product_id: data.id,
                        sku: data.sku,
                        type: 'IN',
                        quantity: 1,
                        balance_after: newStock,
                        note: 'รับเข้าสต็อกผ่านการยิงสแกนด่วน (+1)'
                    });

                SoundFx.playStockInChime();

                if (feedbackEl) {
                    feedbackEl.innerHTML = `
                        <div class="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                            <i class="bi bi-box-arrow-in-down text-base"></i>
                            <span>รับเข้าสต็อกสำเร็จ (+1)</span>
                        </div>
                        <p class="text-xs text-white font-semibold line-clamp-1">${escapeHtml(data.name)}</p>
                        <p class="text-[11px] text-emerald-300 font-mono">สต็อกใหม่: ${newStock} ตัว (ชั้นวาง: ${data.warehouse_location || 'A-1'})</p>
                    `;
                }

                await loadProductsList();

            } else if (AppState.scanMode === 'OUT') {
                // 📤 Outbound: Stock -1
                const currentStock = parseInt(data.stock_quantity ?? 0, 10);
                if (currentStock <= 0) {
                    SoundFx.playErrorBuzz();
                    if (feedbackEl) {
                        feedbackEl.innerHTML = `
                            <div class="flex items-center justify-center gap-1.5 text-rose-400 font-bold text-xs mb-1">
                                <i class="bi bi-exclamation-octagon-fill text-base"></i>
                                <span>สินค้าหมดสต็อก! (Out of Stock)</span>
                            </div>
                            <p class="text-xs text-white">${escapeHtml(data.name)}</p>
                            <p class="text-[11px] text-rose-300 font-mono">ไม่สามารถตัดจ่ายได้เนื่องจากสต็อกคงเหลือ 0</p>
                        `;
                    }
                    if (input) input.select();
                    return;
                }

                const newStock = Math.max(0, currentStock - 1);
                data.stock_quantity = newStock;

                await AppState.supabaseClient
                    .from('product_labels')
                    .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
                    .eq('id', data.id);

                await AppState.supabaseClient
                    .from('stock_transactions')
                    .insert({
                        product_id: data.id,
                        sku: data.sku,
                        type: 'OUT',
                        quantity: 1,
                        balance_after: newStock,
                        note: 'ตัดจ่ายสต็อกผ่านการยิงสแกนด่วน (-1)'
                    });

                SoundFx.playStockOutChime();

                if (feedbackEl) {
                    feedbackEl.innerHTML = `
                        <div class="flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs mb-1">
                            <i class="bi bi-box-arrow-up text-base"></i>
                            <span>ตัดจ่ายสต็อกสำเร็จ (-1)</span>
                        </div>
                        <p class="text-xs text-white font-semibold line-clamp-1">${escapeHtml(data.name)}</p>
                        <p class="text-[11px] text-amber-300 font-mono">คงเหลือ: ${newStock} ตัว</p>
                    `;
                }

                await loadProductsList();

            } else {
                // 🖨️ Mode: Print Only
                SoundFx.playSuccessBeep();

                if (feedbackEl) {
                    feedbackEl.innerHTML = `
                        <div class="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                            <i class="bi bi-check-circle-fill text-base"></i>
                            <span>พบสินค้าสำเร็จ!</span>
                        </div>
                        <p class="text-xs text-white font-semibold line-clamp-1">${escapeHtml(data.name)}</p>
                        <p class="text-[11px] text-indigo-300 font-mono">${escapeHtml(data.sku)} • สต็อก: ${data.stock_quantity ?? 0} ตัว</p>
                    `;
                }
            }

            // Select and update preview immediately
            selectProductForPreview(data, true);

            // Auto-Print check (Runs in PRINT mode, and optionally in IN mode if ticked)
            const autoPrintChecked = document.getElementById('chkAutoPrint')?.checked;
            if (autoPrintChecked && AppState.scanMode !== 'OUT') {
                AppState.stats.printedToday++;
                const statPrintEl = document.getElementById('statPrintCount');
                if (statPrintEl) statPrintEl.innerText = AppState.stats.printedToday;

                SoundFx.playPrintChime();

                setTimeout(() => {
                    triggerManualPrint();
                }, 160);
            }

            // Clear input for next scan
            if (input) {
                input.value = '';
                refocusScanner();
            }
        } else {
            // Not Found
            SoundFx.playErrorBuzz();

            if (feedbackEl) {
                feedbackEl.innerHTML = `
                    <div class="flex items-center justify-center gap-1.5 text-rose-400 font-bold text-xs mb-1">
                        <i class="bi bi-x-circle-fill text-base"></i>
                        <span>ไม่พบรหัส SKU นี้ในระบบ!</span>
                    </div>
                    <p class="text-xs text-indigo-200">SKU: <span class="font-mono font-bold text-rose-300">${escapeHtml(sku)}</span></p>
                    <button type="button" onclick="populateNewItemFromScan('${escapeHtml(sku)}')" 
                        class="mt-1 text-[11px] text-sky-300 hover:text-white underline font-medium">
                        + คลิกเพื่อเพิ่มสินค้ารหัสนี้ลงคลัง
                    </button>
                `;
            }

            if (input) {
                input.select();
            }
        }
    } catch (err) {
        console.error('Scan query error:', err);
        SoundFx.playErrorBuzz();
        if (feedbackEl) {
            feedbackEl.innerHTML = `
                <div class="text-rose-400 font-bold text-xs mb-1">เกิดข้อผิดพลาดในการเชื่อมต่อ</div>
                <p class="text-[11px] text-indigo-300">${escapeHtml(err.message || 'ไม่สามารถติดต่อ Supabase ได้')}</p>
            `;
        }
    }
}

function populateNewItemFromScan(sku) {
    resetProductForm();
    const skuInput = document.getElementById('formSku');
    if (skuInput) {
        skuInput.value = sku;
        onFormInputChange();
    }
    document.getElementById('formName')?.focus();
}

function refocusScanner() {
    const keepFocus = document.getElementById('chkKeepFocus')?.checked;
    if (!keepFocus) return;

    // Do not steal focus if user is actively typing in form inputs or modals
    const activeEl = document.activeElement;
    const isModalOpen = !document.getElementById('supabaseModal')?.classList.contains('hidden') ||
                        !document.getElementById('batchPrintModal')?.classList.contains('hidden');

    if (isModalOpen) return;

    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.id !== 'scannerInput') {
        return;
    }

    const input = document.getElementById('scannerInput');
    if (input) {
        input.focus();
    }
}

document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.closest('input') || target.closest('textarea') || target.closest('button') || target.closest('select') || target.closest('a')) {
        return;
    }
    refocusScanner();
});

// ==============================================================================
// 4. LABEL PREVIEW & BARCODE/QR ENGINE (SECTION 3)
// ==============================================================================
function selectProductForPreview(item, updateFormIfEmpty = false) {
    AppState.currentProduct = { ...item };
    updateLabelPreview(AppState.currentProduct);

    if (updateFormIfEmpty && !AppState.isEditing) {
        if (document.getElementById('formSku')) document.getElementById('formSku').value = item.sku || '';
        if (document.getElementById('formBrand')) document.getElementById('formBrand').value = item.brand || 'Paperstudio (เปเปอร์สตูดิโอ)';
        if (document.getElementById('formProductType')) document.getElementById('formProductType').value = item.product_type || item.name || 'เสื้อผ้าแฟชั่น';
        if (document.getElementById('formVariant')) document.getElementById('formVariant').value = item.variant || 'M L XL XXL';
        if (document.getElementById('formUsage')) document.getElementById('formUsage').value = item.usage_info || 'สำหรับสวมใส่';
        if (document.getElementById('formCare')) document.getElementById('formCare').value = item.care_instructions || 'ควรซักก่อนสวมใส่ / ห้ามใช้น้ำยาฟอกขาว / ควรรีดด้วยไฟปานกลาง / ควรแยกผ้าสีกับผ้าขาวก่อนซัก การซักด้วยเครื่อง อาจทำให้เนื้อผ้าเสียรูปทรง';
        if (document.getElementById('formManufacturer')) document.getElementById('formManufacturer').value = item.manufacturer || 'ประเทศจีน';
        if (document.getElementById('formDistributor')) document.getElementById('formDistributor').value = item.distributor || 'บริษัท เปเปอร์สตูดิโอ';
        if (document.getElementById('formDistributorAddress')) document.getElementById('formDistributorAddress').value = item.distributor_address || '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160';

        const chkPrice = document.getElementById('chkPriceAsSpecified');
        const priceInput = document.getElementById('formPrice');
        const wrapper = document.getElementById('priceInputWrapper');
        if (item.price !== null && item.price !== undefined && item.price !== '' && !isNaN(item.price)) {
            if (chkPrice) chkPrice.checked = false;
            if (wrapper) wrapper.classList.remove('hidden');
            if (priceInput) priceInput.value = item.price;
        } else {
            if (chkPrice) chkPrice.checked = true;
            if (wrapper) wrapper.classList.add('hidden');
            if (priceInput) priceInput.value = '';
        }

        if (document.getElementById('formStock')) document.getElementById('formStock').value = item.stock_quantity ?? 48;
        if (document.getElementById('formMinStock')) document.getElementById('formMinStock').value = item.min_stock_alert ?? 5;
        if (document.getElementById('formLocation')) document.getElementById('formLocation').value = item.warehouse_location || 'A-01';
    }
}

function updateLabelPreview(product) {
    if (!product) return;

    const lblBrand = document.getElementById('lblBrand');
    const lblProductType = document.getElementById('lblProductType');
    const lblVariant = document.getElementById('lblVariant');
    const lblUsage = document.getElementById('lblUsage');
    const lblCare = document.getElementById('lblCare');
    const lblManufacturer = document.getElementById('lblManufacturer');
    const lblDistributor = document.getElementById('lblDistributor');
    const lblDistributorAddress = document.getElementById('lblDistributorAddress');
    const lblPriceText = document.getElementById('lblPriceText');
    const lblLocationText = document.getElementById('lblLocationText');
    const lblSkuText = document.getElementById('lblSkuText');

    if (lblBrand) lblBrand.innerText = product.brand || 'Paperstudio (เปเปอร์สตูดิโอ)';
    if (lblProductType) lblProductType.innerText = product.product_type || product.name || 'เสื้อผ้าแฟชั่น';
    if (lblVariant) lblVariant.innerText = product.variant || 'M L XL XXL';
    if (lblUsage) lblUsage.innerText = product.usage_info || 'สำหรับสวมใส่';
    if (lblCare) lblCare.innerText = product.care_instructions || '-';
    if (lblManufacturer) lblManufacturer.innerText = product.manufacturer || 'ประเทศจีน';
    if (lblDistributor) lblDistributor.innerText = product.distributor || 'บริษัท เปเปอร์สตูดิโอ';
    if (lblDistributorAddress) lblDistributorAddress.innerText = product.distributor_address || '';

    if (lblPriceText) {
        if (product.price !== null && product.price !== undefined && product.price !== '' && !isNaN(product.price)) {
            lblPriceText.innerText = '฿' + Number(product.price).toLocaleString('th-TH', { minimumFractionDigits: 0 }) + ' บาท';
        } else {
            lblPriceText.innerText = product.price_text || 'ระบุ ณ จุดขาย';
        }
    }
    if (lblLocationText) lblLocationText.innerText = product.warehouse_location || 'A-01';
    if (lblSkuText) lblSkuText.innerText = product.sku || '';

    // Render Barcode or QR
    renderBarcodeOrQr(product.sku || 'SAMPLE');
}

function renderBarcodeOrQr(codeText) {
    const barcodeSvg = document.getElementById('barcodeSvg');
    const qrcodeDiv = document.getElementById('qrcodeDiv');

    if (AppState.barcodeType === 'CODE128') {
        if (barcodeSvg) barcodeSvg.classList.remove('hidden');
        if (qrcodeDiv) qrcodeDiv.classList.add('hidden');

        try {
            const is57 = AppState.labelSize === '57roll';
            JsBarcode('#barcodeSvg', codeText, {
                format: 'CODE128',
                lineColor: '#000000',
                width: is57 ? 1.3 : 1.2,
                height: is57 ? 30 : 28,
                displayValue: false,
                margin: 0
            });
        } catch (err) {
            console.warn('JsBarcode render failed:', err);
        }
    } else {
        // QR Code mode
        if (barcodeSvg) barcodeSvg.classList.add('hidden');
        if (qrcodeDiv) {
            qrcodeDiv.classList.remove('hidden');
            qrcodeDiv.innerHTML = '';
            const size = AppState.labelSize === '57roll' ? 52 : 44;
            if (window.QRCode) {
                new QRCode(qrcodeDiv, {
                    text: codeText,
                    width: size,
                    height: size,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }
    }
}

function switchLabelSize(size) {
    AppState.labelSize = size;
    const body = document.body;
    const sticker = document.getElementById('printableLabel');
    const btn50x30 = document.getElementById('btnSize50x30');
    const btn57roll = document.getElementById('btnSize57roll');
    const btn70x50 = document.getElementById('btnSize70x50');
    const previewSizeLabel = document.getElementById('previewSizeLabel');

    body.classList.remove('label-size-50x30', 'label-size-57roll', 'label-size-70x50');
    if (sticker) sticker.classList.remove('size-50x30', 'size-57roll', 'size-70x50');

    const defaultBtnClass = 'px-2.5 py-1 rounded-md text-xs font-medium transition-all text-slate-600 hover:text-slate-900';
    const activeBtnClass = 'px-2.5 py-1 rounded-md text-xs font-medium transition-all bg-white text-blue-600 shadow-sm';

    if (btn50x30) btn50x30.className = defaultBtnClass;
    if (btn57roll) btn57roll.className = defaultBtnClass;
    if (btn70x50) btn70x50.className = defaultBtnClass;

    if (size === '50x30') {
        body.classList.add('label-size-50x30');
        if (sticker) sticker.classList.add('size-50x30');
        if (btn50x30) btn50x30.className = activeBtnClass;
        if (previewSizeLabel) previewSizeLabel.innerText = 'กระดาษความร้อน 50mm × 30mm';
    } else if (size === '57roll') {
        body.classList.add('label-size-57roll');
        if (sticker) sticker.classList.add('size-57roll');
        if (btn57roll) btn57roll.className = activeBtnClass;
        if (previewSizeLabel) previewSizeLabel.innerText = 'PeriPage A6 (กระดาษม้วน 57mm)';
    } else {
        body.classList.add('label-size-70x50');
        if (sticker) sticker.classList.add('size-70x50');
        if (btn70x50) btn70x50.className = activeBtnClass;
        if (previewSizeLabel) previewSizeLabel.innerText = 'กระดาษความร้อน 70mm × 50mm';
    }

    renderBarcodeOrQr(AppState.currentProduct.sku || 'SAMPLE');
}

function switchBarcodeType(type) {
    AppState.barcodeType = type;
    const btnBarcode = document.getElementById('btnTypeBarcode');
    const btnQR = document.getElementById('btnTypeQR');

    if (type === 'CODE128') {
        if (btnBarcode) btnBarcode.className = 'px-2 py-1 rounded-md text-xs font-medium transition-all bg-white text-blue-600 shadow-sm';
        if (btnQR) btnQR.className = 'px-2 py-1 rounded-md text-xs font-medium transition-all text-slate-600 hover:text-slate-900';
    } else {
        if (btnBarcode) btnBarcode.className = 'px-2 py-1 rounded-md text-xs font-medium transition-all text-slate-600 hover:text-slate-900';
        if (btnQR) btnQR.className = 'px-2 py-1 rounded-md text-xs font-medium transition-all bg-white text-blue-600 shadow-sm';
    }

    renderBarcodeOrQr(AppState.currentProduct.sku || 'SAMPLE');
}

// Tear Feed Spacer Management (สำหรับ PeriPage และเครื่องพิมพ์ความร้อนแบบม้วน)
function setTearFeed(mm) {
    mm = Math.max(0, Math.min(60, parseInt(mm, 10) || 10));
    AppState.tearFeedMm = mm;
    try {
        localStorage.setItem('sgyver_label_tear_feed', mm);
    } catch (e) {}
    updateTearFeedUI();
}

function adjustTearFeed(delta) {
    const current = AppState.tearFeedMm ?? 10;
    setTearFeed(current + delta);
}

function updateTearFeedUI() {
    const mm = AppState.tearFeedMm ?? 10;
    const display = document.getElementById('tearFeedDisplay');
    if (display) {
        display.innerText = `${mm} mm (${(mm / 10).toFixed(1)} cm)`;
    }
    [10, 15, 20, 25, 30].forEach(val => {
        const btn = document.getElementById(`btnFeed${val}`);
        if (btn) {
            if (mm === val) {
                btn.className = 'flex-1 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold shadow-sm';
            } else {
                btn.className = 'flex-1 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[11px] font-medium text-slate-700';
            }
        }
    });
}

// ==============================================================================
// 5. PRINT DISPATCH ENGINE (Isolated Iframe Print Engine)
// ==============================================================================
function printLabelsViaIsolatedIframe(stickersHtmlList) {
    let printIframe = document.getElementById('thermalPrintIframe');
    if (printIframe) {
        printIframe.remove();
    }
    printIframe = document.createElement('iframe');
    printIframe.id = 'thermalPrintIframe';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const pageSizeCss = AppState.labelSize === '70x50' ? '70mm 50mm' : (AppState.labelSize === '57roll' ? 'auto' : '50mm 30mm');
    const stickerClass = AppState.labelSize === '70x50' ? 'size-70x50' : (AppState.labelSize === '57roll' ? 'size-57roll' : 'size-50x30');
    const tearFeedMm = AppState.labelSize === '57roll' ? (AppState.tearFeedMm ?? 10) : 0;
    const isPrintCutGuide = document.getElementById('chkTearLine')?.checked ?? false;

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Label</title>
            <style>
                @page {
                    size: ${pageSizeCss};
                    margin: 0mm !important;
                }
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                html, body {
                    width: 100%;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .print-page-sticker {
                    background: #ffffff !important;
                    color: #000000 !important;
                    box-sizing: border-box !important;
                    page-break-inside: avoid !important;
                    margin: 0 auto !important;
                    overflow: visible !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-start !important;
                    border: none !important;
                }
                .print-page-sticker:not(:last-child) {
                    page-break-after: always !important;
                    break-after: page !important;
                }
                .size-50x30 {
                    width: 50mm !important;
                    height: 30mm !important;
                    max-width: 50mm !important;
                    max-height: 30mm !important;
                    padding: 1.5mm 2.2mm 1.2mm 2.2mm !important;
                }
                .size-57roll {
                    width: 57mm !important;
                    max-width: 57mm !important;
                    box-sizing: border-box !important;
                    padding: 2.5mm 5.5mm 0mm 5.5mm !important;
                    font-size: 6.2pt !important;
                    line-height: 1.28 !important;
                }
                .tear-feed-spacer {
                    width: 100% !important;
                    display: block !important;
                    clear: both !important;
                    box-sizing: border-box !important;
                    margin-top: 1mm !important;
                }
                .tear-feed-blank {
                    width: 100% !important;
                    display: block !important;
                    height: ${Math.max(1, tearFeedMm - 4)}mm !important;
                    min-height: ${Math.max(1, tearFeedMm - 4)}mm !important;
                }
                .tear-cut-guide {
                    width: 100% !important;
                    display: block !important;
                    border-top: 1px dashed #000000 !important;
                    text-align: center !important;
                    font-size: 5.5pt !important;
                    font-weight: 700 !important;
                    color: #000000 !important;
                    padding-top: 1mm !important;
                    padding-bottom: 1.5mm !important;
                    line-height: 1.2 !important;
                    letter-spacing: 0.5px !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                }
                .tear-micro-line {
                    width: 100% !important;
                    display: block !important;
                    border-bottom: 1px solid #000000 !important;
                    height: 1px !important;
                }
                .size-70x50 {
                    width: 70mm !important;
                    height: 50mm !important;
                    max-width: 70mm !important;
                    max-height: 50mm !important;
                    padding: 2.5mm 3.2mm 2.2mm 3.2mm !important;
                }
                .flex { display: flex !important; }
                .flex-col { flex-direction: column !important; }
                .items-center { align-items: center !important; }
                .justify-between { justify-content: space-between !important; }
                .justify-center { justify-content: center !important; }
                .gap-1 { gap: 4px !important; }
                .my-auto { margin-top: auto !important; margin-bottom: auto !important; }
                .w-full { width: 100% !important; }
                .hidden { display: none !important; }

                .sticker-field-lbl {
                    font-size: 5.5pt !important;
                    font-weight: 700 !important;
                    color: #000000 !important;
                    margin-right: 2px !important;
                    display: inline !important;
                }

                .sticker-line-item {
                    display: flex !important;
                    align-items: baseline !important;
                    min-width: 0 !important;
                }

                .sticker-title-wrap {
                    margin-top: 1px !important;
                    line-height: 1.15 !important;
                    display: flex !important;
                    align-items: baseline !important;
                    gap: 2px !important;
                }

                .sticker-title-wrap .sticker-field-lbl {
                    font-size: 6.8pt !important;
                    font-weight: 700 !important;
                    color: #000000 !important;
                    white-space: nowrap !important;
                }

                .sticker-distributor {
                    font-size: 5.5pt !important;
                    font-weight: 600 !important;
                    color: #000000 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    text-transform: uppercase !important;
                }
                .size-70x50 .sticker-distributor { font-size: 7.5pt !important; }

                .sticker-price-badge {
                    font-weight: 700 !important;
                    font-size: 7.5pt !important;
                    background: #000000 !important;
                    color: #ffffff !important;
                    padding: 0.5px 3.5px !important;
                    border-radius: 2px !important;
                    white-space: nowrap !important;
                    border: 0.5px solid #000000 !important;
                }
                .size-70x50 .sticker-price-badge { font-size: 10.5pt !important; padding: 1px 6px !important; }

                .sticker-title {
                    font-weight: 700 !important;
                    color: #000000 !important;
                    font-size: 7.5pt !important;
                    line-height: 1.15 !important;
                    margin-top: 1px !important;
                    display: -webkit-box !important;
                    -webkit-line-clamp: 2 !important;
                    -webkit-box-orient: vertical !important;
                    overflow: hidden !important;
                    word-break: break-word !important;
                }
                .size-57roll .sticker-title { font-size: 8pt !important; }
                .size-70x50 .sticker-title { font-size: 10pt !important; }

                .sticker-variant {
                    font-size: 6.5pt !important;
                    font-weight: 600 !important;
                    color: #000000 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .size-70x50 .sticker-variant { font-size: 9pt !important; }

                .sticker-barcode-wrapper {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    margin: 1px auto !important;
                    width: 100% !important;
                    overflow: hidden !important;
                }
                .sticker-barcode-wrapper svg {
                    display: block !important;
                    margin: 0 auto !important;
                    max-width: 100% !important;
                    height: 10.5mm !important;
                }
                .size-57roll .sticker-barcode-wrapper svg { height: 11.5mm !important; }
                .size-70x50 .sticker-barcode-wrapper svg { height: 18mm !important; }
                .sticker-barcode-wrapper img, .sticker-barcode-wrapper canvas {
                    max-width: 100% !important;
                    display: block !important;
                    margin: 0 auto !important;
                }

                .sticker-care {
                    font-size: 5pt !important;
                    color: #000000 !important;
                    line-height: 1.15 !important;
                    margin-top: 1px !important;
                    border-top: 0.5px dashed #000000 !important;
                    padding-top: 1px !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .size-57roll .sticker-care { font-size: 5.5pt !important; }
                .size-70x50 .sticker-care { font-size: 7pt !important; }

                /* Thai Garment Label Styles for Print */
                .sticker-line-brand {
                    font-size: 8pt !important;
                    line-height: 1.25 !important;
                    margin-bottom: 2px !important;
                }
                .sticker-line-brand .sticker-tag-lbl {
                    font-size: 8.5pt !important;
                    font-weight: 800 !important;
                }
                .sticker-val-brand {
                    font-size: 8.8pt !important;
                    font-weight: 800 !important;
                }
                .sticker-tag-lbl {
                    font-weight: 700 !important;
                    color: #000000 !important;
                    margin-right: 3px !important;
                    display: inline !important;
                }
                .sticker-val {
                    color: #000000 !important;
                    font-weight: 500 !important;
                    display: inline !important;
                }
                .sticker-line {
                    margin-bottom: 1.5px !important;
                    line-height: 1.25 !important;
                }
                .sticker-line-care {
                    margin-bottom: 2px !important;
                    line-height: 1.22 !important;
                    font-size: 5.8pt !important;
                    text-align: justify !important;
                }
                .sticker-line-distributor {
                    margin-bottom: 1.5px !important;
                    line-height: 1.22 !important;
                    font-size: 6pt !important;
                }
                .sticker-val-address {
                    font-size: 5.3pt !important;
                    line-height: 1.2 !important;
                    padding-left: 2px !important;
                    margin-top: 1px !important;
                }
                .sticker-line-price {
                    margin-top: 1.5px !important;
                    margin-bottom: 2px !important;
                    font-size: 7pt !important;
                }
                .sticker-barcode-section {
                    border-top: 0.5px dashed #000000 !important;
                    padding-top: 1.5px !important;
                    margin-top: 2px !important;
                }
                .size-57roll .sticker-barcode-wrapper svg {
                    height: 9.5mm !important;
                }
            </style>
        </head>
        <body>
            ${stickersHtmlList.map(html => `
                <div class="print-page-sticker ${stickerClass}">
                    ${html}
                    ${tearFeedMm > 0 ? `
                        <div class="tear-feed-spacer" style="height: ${tearFeedMm}mm !important; min-height: ${tearFeedMm}mm !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; box-sizing: border-box !important;">
                            <div class="tear-feed-blank" style="height: ${isPrintCutGuide ? Math.max(1, tearFeedMm - 4) : Math.max(1, tearFeedMm - 1)}mm !important;">&nbsp;</div>
                            ${isPrintCutGuide ? `
                                <div class="tear-cut-guide">- - - ✂ รอยฉีก (TEAR HERE) ✂ - - -</div>
                            ` : `
                                <div class="tear-feed-anchor" style="height: 1px !important; width: 100% !important; display: flex !important; justify-content: flex-end !important; line-height: 1px !important; font-size: 1px !important; overflow: hidden !important;">
                                    <span style="display: inline-block !important; width: 3px !important; height: 1px !important; background-color: #000000 !important;"></span>
                                </div>
                            `}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        try {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        } catch (e) {
            console.error('Print iframe error:', e);
            window.print();
        }
        setTimeout(() => {
            refocusScanner();
        }, 500);
    }, 250);
}

function triggerManualPrint() {
    const printableLabel = document.getElementById('printableLabel');
    if (!printableLabel) return;

    SoundFx.playPrintChime();
    printLabelsViaIsolatedIframe([printableLabel.innerHTML]);
}

function openBatchPrintModal() {
    const modal = document.getElementById('batchPrintModal');
    if (modal) modal.classList.remove('hidden');
}

function closeBatchPrintModal() {
    const modal = document.getElementById('batchPrintModal');
    if (modal) modal.classList.add('hidden');
    refocusScanner();
}

function adjustBatchCount(delta) {
    const input = document.getElementById('batchCountInput');
    if (!input) return;
    let val = parseInt(input.value || '1', 10) + delta;
    if (val < 1) val = 1;
    if (val > 200) val = 200;
    input.value = val;
}

function setBatchCount(count) {
    const input = document.getElementById('batchCountInput');
    if (input) input.value = count;
}

function executeBatchPrint() {
    const input = document.getElementById('batchCountInput');
    const count = parseInt(input?.value || '1', 10);
    closeBatchPrintModal();

    if (count <= 0) return;

    const printableLabel = document.getElementById('printableLabel');
    if (!printableLabel) return;

    SoundFx.playPrintChime();

    const list = [];
    for (let i = 0; i < count; i++) {
        list.push(printableLabel.innerHTML);
    }
    printLabelsViaIsolatedIframe(list);

    AppState.stats.printedToday += count;
    const statPrintEl = document.getElementById('statPrintCount');
    if (statPrintEl) statPrintEl.innerText = AppState.stats.printedToday;
}

function loadSampleClothingItem() {
    const samples = [
        {
            sku: 'TSH-WHT-M',
            name: 'เสื้อยืดคอกลม Premium Cotton 100%',
            variant: 'สีขาว / Size M',
            price: 290.00,
            stock_quantity: 48,
            min_stock_alert: 10,
            warehouse_location: 'A-01',
            distributor: 'บริษัท ซิกเนเจอร์ แอพพาเรล จำกัด',
            care_instructions: 'ซักเครื่องด้วยน้ำเย็น ห้ามใช้น้ำยาฟอกขาว รีดด้วยไฟปานกลาง'
        },
        {
            sku: 'POLO-NVY-XL',
            name: 'เสื้อโปโล Classic Dry-Tech ระบายอากาศ',
            variant: 'สีกรมท่า / Size XL',
            price: 450.00,
            stock_quantity: 25,
            min_stock_alert: 8,
            warehouse_location: 'B-04',
            distributor: 'บริษัท สยามการ์เม้นท์ เทรดดิ้ง จำกัด',
            care_instructions: 'แยกซักผ้าสีเข้ม ปั่นแห้งรอบต่ำ ห้ามซักแห้ง'
        },
        {
            sku: 'HD-GRY-F',
            name: 'เสื้อฮู้ดดี้ Oversized Fleece หนานุ่มพิเศษ',
            variant: 'สีเทาท็อปดราย / Free Size',
            price: 790.00,
            stock_quantity: 14,
            min_stock_alert: 5,
            warehouse_location: 'C-02',
            distributor: 'สตูดิโอ แฟชั่น ซัพพลาย',
            care_instructions: 'ซักมือหรือใส่ถุงซัก ตากในที่ร่ม ห้ามรีดทับลายพิมพ์'
        },
        {
            sku: 'TSH-BLK-L',
            name: 'เสื้อยืดคอกลม Premium Cotton 100%',
            variant: 'สีดำ / Size L',
            price: 290.00,
            stock_quantity: 3,
            min_stock_alert: 5,
            warehouse_location: 'A-02',
            distributor: 'บริษัท ซิกเนเจอร์ แอพพาเรล จำกัด',
            care_instructions: 'ซักเครื่องด้วยน้ำเย็น ห้ามใช้น้ำยาฟอกขาว รีดด้วยไฟปานกลาง'
        }
    ];

    const random = samples[Math.floor(Math.random() * samples.length)];
    selectProductForPreview(random, true);
}

// ==============================================================================
// 6. SUPABASE CONFIGURATION MODAL HANDLERS
// ==============================================================================
function openSupabaseModal() {
    const modal = document.getElementById('supabaseModal');
    const urlInput = document.getElementById('cfgSupabaseUrl');
    const keyInput = document.getElementById('cfgSupabaseKey');

    if (urlInput) urlInput.value = AppState.supabaseUrl || '';
    if (keyInput) keyInput.value = AppState.supabaseKey || '';

    if (modal) modal.classList.remove('hidden');
}

function closeSupabaseModal() {
    const modal = document.getElementById('supabaseModal');
    if (modal) modal.classList.add('hidden');
    refocusScanner();
}

function handleSaveSupabaseConfig(event) {
    if (event) event.preventDefault();

    const url = (document.getElementById('cfgSupabaseUrl')?.value || '').trim();
    const key = (document.getElementById('cfgSupabaseKey')?.value || '').trim();

    if (!url || !key) {
        alert('กรุณากรอกทั้ง SUPABASE_URL และ SUPABASE_ANON_KEY');
        return;
    }

    localStorage.setItem('sgyver_label_sb_url', url);
    localStorage.setItem('sgyver_label_sb_key', key);

    AppState.supabaseUrl = url;
    AppState.supabaseKey = key;

    initSupabase();
    loadProductsList();
    closeSupabaseModal();

    alert('บันทึกการตั้งค่าการเชื่อมต่อ Supabase เรียบร้อยแล้ว');
}

function resetToDefaultSupabase() {
    localStorage.removeItem('sgyver_label_sb_url');
    localStorage.removeItem('sgyver_label_sb_key');

    initSupabase();
    const urlInput = document.getElementById('cfgSupabaseUrl');
    const keyInput = document.getElementById('cfgSupabaseKey');

    if (urlInput) urlInput.value = AppState.supabaseUrl;
    if (keyInput) keyInput.value = AppState.supabaseKey;

    loadProductsList();
    alert('คืนค่าเริ่มต้น Supabase ของระบบ S-Gyver เรียบร้อยแล้ว');
}

async function testSupabaseConnectionUI() {
    const url = (document.getElementById('cfgSupabaseUrl')?.value || '').trim();
    const key = (document.getElementById('cfgSupabaseKey')?.value || '').trim();

    if (!url || !key) {
        alert('กรุณากรอกทั้ง URL และ Key ก่อนทดสอบ');
        return;
    }

    try {
        const testClient = window.supabase.createClient(url, key);
        const { count, error } = await testClient
            .from('product_labels')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        alert(`✅ การเชื่อมต่อสำเร็จ! พบตาราง product_labels (มีข้อมูลปัจจุบัน ${count ?? 0} รายการ)`);
    } catch (err) {
        alert(`❌ ไม่สามารถเชื่อมต่อได้: ${err.message || err}`);
    }
}

// Back to workspace button
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

// ==============================================================================
// 7. APP INITIALIZATION
// ==============================================================================
window.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    onFormInputChange();
    updateTearFeedUI();
    await loadProductsList();

    // Check if SKU is passed via URL query param (e.g. from Inventory app)
    const urlParams = new URLSearchParams(window.location.search);
    const skuParam = urlParams.get('sku');
    if (skuParam && AppState.products) {
        const found = AppState.products.find(p => p.sku && p.sku.toUpperCase() === skuParam.toUpperCase());
        if (found) {
            selectProductForPreview(found, true);
        }
    }

    setTimeout(() => {
        refocusScanner();
    }, 400);
});
