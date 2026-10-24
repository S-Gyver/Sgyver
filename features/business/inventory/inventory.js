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
    viewMode: 'CARD', // 'CARD' (Shopee Card Grid), 'PARENT' (Shopee Grouped Table), or 'FLAT' (Flat Table)
    expandedParents: new Set(), // Keys of expanded parent products
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
        let allProducts = [];
        let from = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await InventoryApp.supabaseClient
                .from('product_labels')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allProducts = allProducts.concat(data);
                if (data.length < PAGE_SIZE) {
                    hasMore = false;
                } else {
                    from += PAGE_SIZE;
                }
            } else {
                hasMore = false;
            }
        }

        InventoryApp.products = allProducts.map(p => {
            const cachedParent = localStorage.getItem('sgyver_parent_sku_' + p.sku);
            if (cachedParent) p.parent_sku = cachedParent;
            const pKey = typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : (p.parent_sku || p.sku);
            p.parent_sku = pKey;
            const localImg = localStorage.getItem('sgyver_img_' + p.sku) || localStorage.getItem('sgyver_img_' + pKey);
            const localGallery = localStorage.getItem('sgyver_gallery_' + p.sku) || localStorage.getItem('sgyver_gallery_' + pKey);

            if (localGallery) {
                try {
                    const parsedG = JSON.parse(localGallery);
                    if (Array.isArray(parsedG) && parsedG.length > 0) {
                        p.images = parsedG;
                    }
                } catch(e) {}
            }

            if (localImg) {
                p.image_url = localImg;
            } else if (p.images && p.images.length > 0) {
                p.image_url = p.images[0];
            }

            if ((!p.images || p.images.length === 0) && p.image_url) {
                p.images = [p.image_url];
            }

            p.video_url = p.video_url || localStorage.getItem('sgyver_video_' + pKey) || localStorage.getItem('sgyver_video_' + p.sku) || '';
            p.product_url = p.product_url || localStorage.getItem('sgyver_product_url_' + pKey) || localStorage.getItem('sgyver_product_url_' + p.sku) || localStorage.getItem('sgyver_shopee_url_' + pKey) || localStorage.getItem('sgyver_shopee_url_' + p.sku) || '';
            p.item_id = p.item_id || localStorage.getItem('sgyver_item_id_' + pKey) || localStorage.getItem('sgyver_item_id_' + p.sku) || localStorage.getItem('sgyver_shopee_itemid_' + pKey) || localStorage.getItem('sgyver_shopee_itemid_' + p.sku) || '';
            p.location_note = p.location_note || localStorage.getItem('sgyver_loc_note_' + pKey) || localStorage.getItem('sgyver_loc_note_' + p.sku) || '';
            p.location_image = p.location_image || localStorage.getItem('sgyver_loc_img_' + pKey) || localStorage.getItem('sgyver_loc_img_' + p.sku) || '';

            return p;
        });

        // Merge from localStorage cache so recently added or offline products never disappear
        try {
            const cachedCustom = localStorage.getItem('sgyver_custom_products');
            if (cachedCustom) {
                const parsedCustom = JSON.parse(cachedCustom);
                if (Array.isArray(parsedCustom)) {
                    parsedCustom.forEach(cp => {
                        const exists = InventoryApp.products.find(p => (cp.id && p.id === cp.id) || (p.sku && p.sku.toUpperCase() === (cp.sku || '').toUpperCase()));
                        if (!exists) {
                            InventoryApp.products.push(cp);
                        } else {
                            if (!exists.product_url && cp.product_url) exists.product_url = cp.product_url;
                            if (!exists.item_id && cp.item_id) exists.item_id = cp.item_id;
                            if (!exists.location_note && cp.location_note) exists.location_note = cp.location_note;
                            if (!exists.location_image && cp.location_image) exists.location_image = cp.location_image;
                        }
                    });
                }
            }
        } catch(e) {
            console.warn('Error merging cached custom products:', e);
        }

        calculateMetrics(InventoryApp.products);
        renderTable();
        populateMoveProductSelect();

    } catch (err) {
        console.error('Load inventory error:', err);
        // Fallback to local cache so user's products are never lost on refresh!
        try {
            const cachedCustom = localStorage.getItem('sgyver_custom_products');
            if (cachedCustom) {
                const parsedCustom = JSON.parse(cachedCustom);
                if (Array.isArray(parsedCustom) && parsedCustom.length > 0) {
                    InventoryApp.products = parsedCustom;
                    calculateMetrics(InventoryApp.products);
                    renderTable();
                    populateMoveProductSelect();
                    return;
                }
            }
        } catch(e) {}

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

    // Update Shopee Tab Count Badges
    const inStockCount = items.length - outStockCount;
    const tabCountAll = document.getElementById('tabCountAll');
    const tabCountInStock = document.getElementById('tabCountInStock');
    const tabCountLow = document.getElementById('tabCountLow');
    const tabCountOut = document.getElementById('tabCountOut');

    if (tabCountAll) tabCountAll.innerText = items.length;
    if (tabCountInStock) tabCountInStock.innerText = inStockCount;
    if (tabCountLow) tabCountLow.innerText = lowStockCount;
    if (tabCountOut) tabCountOut.innerText = outStockCount;
}

function getFilteredProducts() {
    let list = [...InventoryApp.products];

    // Filter by Tab
    if (InventoryApp.activeTab === 'INSTOCK') {
        list = list.filter(p => parseInt(p.stock_quantity ?? 0, 10) > 0);
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

function switchViewMode(mode) {
    InventoryApp.viewMode = mode;
    const btnCard = document.getElementById('btnViewCard');
    const btnGrouped = document.getElementById('btnViewGrouped');
    const btnFlat = document.getElementById('btnViewFlat');
    const cardGridContainer = document.getElementById('shopeeCardGridContainer');
    const tableContainer = document.getElementById('inventoryTableContainer');

    const defaultBtnClass = 'px-2.5 py-1 rounded-lg font-medium transition-all text-slate-600 hover:text-slate-900 flex items-center gap-1.5';
    const activeBtnClass = 'px-2.5 py-1 rounded-lg font-bold transition-all bg-white text-[#ee4d2d] shadow-sm flex items-center gap-1.5';

    if (btnCard) btnCard.className = mode === 'CARD' ? activeBtnClass : defaultBtnClass;
    if (btnGrouped) btnGrouped.className = mode === 'PARENT' ? activeBtnClass : defaultBtnClass;
    if (btnFlat) btnFlat.className = mode === 'FLAT' ? activeBtnClass : defaultBtnClass;

    if (mode === 'CARD') {
        if (cardGridContainer) cardGridContainer.classList.remove('hidden');
        if (tableContainer) tableContainer.classList.add('hidden');
    } else {
        if (cardGridContainer) cardGridContainer.classList.add('hidden');
        if (tableContainer) tableContainer.classList.remove('hidden');
    }

    renderTable();
}

function getParentGroupKey(p) {
    if (!p) return 'OTHER';
    if (p.parent_sku && p.parent_sku.trim()) {
        return p.parent_sku.trim().toUpperCase();
    }
    const sku = (p.sku || '').trim().toUpperCase();
    if (!sku) return 'OTHER';

    // Check localStorage cache
    const cachedParent = localStorage.getItem('sgyver_parent_sku_' + sku);
    if (cachedParent && cachedParent.trim()) {
        return cachedParent.trim().toUpperCase();
    }

    // 1. Compound Shopee S-Gyver pattern: e.g. "WM-PNT-PAG-001-01" -> "WM-PNT-PAG-001"
    // Also matches "WM-PNT-PAG-001" -> "WM-PNT-PAG-001"
    const mComp = sku.match(/^([A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3,})(?:[-_][A-Z0-9]+)?$/i);
    if (mComp) {
        return mComp[1].toUpperCase();
    }

    // 2. Simple SKU with variant: e.g. "SET006-02" -> "SET006", "TOP072-01" -> "TOP072", "PNT006-01" -> "PNT006"
    const mSimple = sku.match(/^([A-Z0-9ก-๙]+)[-_]([0-9]{1,3}|[A-Z0-9]{1,4})$/i);
    if (mSimple) {
        return mSimple[1].toUpperCase();
    }

    // 3. Multi-hyphen fallback (remove last variant suffix e.g. "-01", "-BLK", "-S")
    const parts = sku.split(/[-_]/);
    if (parts.length > 2 && /^\d{1,3}$|^[A-Z]{1,4}$/.test(parts[parts.length - 1])) {
        return parts.slice(0, -1).join('-').toUpperCase();
    }

    // 4. Fallback from item name if name has product prefix e.g. "สินค้า SET006-01"
    const name = (p.name || '').trim();
    if (name && name !== '(ไม่มีชื่อสินค้าในไฟล์)') {
        const nameMatch = name.match(/^(?:สินค้า\s*)?([A-Z0-9ก-๙]+)[-_]([A-Z0-9ก-๙]+.*)$/i);
        if (nameMatch) {
            return nameMatch[1].toUpperCase();
        }
    }

    return sku || 'OTHER';
}

function getCleanParentTitle(rawName, parentSku) {
    let name = (rawName || '').trim();
    if (!name || name === '(ไม่มีชื่อสินค้าในไฟล์)' || name.startsWith('สินค้า SP_') || name.startsWith('สินค้า ROW_')) {
        return `สินค้าหลัก ${parentSku}`;
    }
    if (name.startsWith('สินค้า ') && (name.includes(parentSku + '-') || name.includes(parentSku + '_'))) {
        return `สินค้า ${parentSku}`;
    }
    return name;
}

function toggleParentExpand(parentKey) {
    if (InventoryApp.expandedParents.has(parentKey)) {
        InventoryApp.expandedParents.delete(parentKey);
    } else {
        InventoryApp.expandedParents.add(parentKey);
    }
    renderTable();
}

function toggleExpandAllParents() {
    const items = getFilteredProducts();
    const allKeys = new Set();
    items.forEach(p => allKeys.add(getParentGroupKey(p)));

    if (InventoryApp.expandedParents.size >= allKeys.size && allKeys.size > 0) {
        InventoryApp.expandedParents.clear();
    } else {
        InventoryApp.expandedParents = allKeys;
    }
    renderTable();
}

function printAllParentLabels(parentKey) {
    const items = InventoryApp.products.filter(p => getParentGroupKey(p) === parentKey);
    if (!items || items.length === 0) return;
    const firstSku = items[0].sku;
    window.location.href = `../product_labels/label_printer.html?sku=${encodeURIComponent(firstSku)}`;
}

// ==============================================================================
// 🧹 Auto-Detection & Cleanup for Shopee Seller Centre Marketing/Promo Banners
// ==============================================================================
function isJunkShopeeProduct(p) {
    if (!p) return false;
    const name = (typeof p === 'string' ? p : (p.name || p.title || '')).trim().toLowerCase();
    const price = typeof p === 'object' ? parseFloat(p.price || 0) : 0;

    const junkKeywords = [
        'seller ai assistant',
        'เพิ่มยอดขาย',
        'กระตุ้นการมองเห็น',
        'เพิ่มตารางขนาดสินค้า',
        'ตารางขนาดสินค้าเพื่อให้ ai',
        'ช่วยแนะนำขนาดที่เหมาะสม',
        'ตารางขนาดสินค้า',
        'ปลดล็อกฟีเจอร์ใหม่',
        'shopee seller',
        'ยกระดับด้วยแอป',
        'ศูนย์การเรียนรู้ผู้ขาย',
        'ผู้ช่วยผู้ขาย',
        'เครื่องมือการตลาด',
        'shopee ads',
        'shopee live',
        'โปรโมตสินค้า',
        'สร้างแคมเปญ'
    ];

    for (let i = 0; i < junkKeywords.length; i++) {
        if (name.includes(junkKeywords[i])) return true;
    }

    if (price === 0 && (name.includes('ai') || name.includes('ฟีเจอร์') || name.includes('แอพ') || name.includes('แอป') || name.includes('seller'))) {
        return true;
    }

    return false;
}

function detectJunkProducts() {
    if (!InventoryApp.products || !Array.isArray(InventoryApp.products)) return [];
    return InventoryApp.products.filter(p => isJunkShopeeProduct(p));
}

function renderJunkBanner() {
    let banner = document.getElementById('junkDetectedBanner');
    const junkItems = detectJunkProducts();
    if (junkItems.length === 0) {
        if (banner) banner.remove();
        return;
    }

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'junkDetectedBanner';
        banner.className = 'mb-4 p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-300';
        const container = document.getElementById('shopeeCardGridContainer') || document.querySelector('main');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(banner, container);
        }
    }

    const names = Array.from(new Set(junkItems.map(j => j.name || j.sku)));
    banner.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                <i class="bi bi-shield-exclamation"></i>
            </div>
            <div class="min-w-0">
                <div class="text-xs sm:text-sm font-bold text-rose-950 flex items-center gap-2">
                    <span>ตรวจพบป้ายโปรโมต Shopee Seller Centre (${junkItems.length} รายการ)</span>
                    <span class="text-[10px] bg-rose-200 text-rose-900 font-extrabold px-2 py-0.5 rounded-full">ไม่ใช่สินค้าจริง</span>
                </div>
                <p class="text-[11px] text-rose-800 mt-0.5 truncate max-w-xl">
                    ${names.slice(0, 3).map(n => escapeHtml(n)).join(', ')}${names.length > 3 ? ` และอื่นๆ รวม ${names.length} รายการ` : ''}
                </p>
            </div>
        </div>
        <button type="button" onclick="cleanAllJunkProducts()" 
            class="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shrink-0">
            <i class="bi bi-trash3-fill text-yellow-300"></i>
            <span>🧹 ลบรายการป้ายเหล่านี้ออกทันที (${junkItems.length})</span>
        </button>
    `;
}

async function cleanAllJunkProducts() {
    const junkItems = detectJunkProducts();
    if (junkItems.length === 0) {
        alert('ไม่พบรายการป้ายโฆษณาที่ตกค้างในคลังสินค้า');
        return;
    }

    if (!confirm(`ยืนยันการลบรายการป้ายโฆษณา Shopee Seller Centre ออกทั้งหมดจำนวน ${junkItems.length} รายการ?\n\n(รายการสินค้าจริงของคุณ เช่น เสื้อ กระโปรง กางเกง จะปลอดภัยไม่ถูกลบ)`)) {
        return;
    }

    const ids = junkItems.map(p => p.id).filter(Boolean);
    const skus = junkItems.map(p => p.sku).filter(Boolean);
    const parentKeys = Array.from(new Set(junkItems.map(p => getParentGroupKey(p))));

    try {
        if (InventoryApp.supabaseClient) {
            if (ids.length > 0) {
                const { error } = await InventoryApp.supabaseClient
                    .from('product_labels')
                    .delete()
                    .in('id', ids);
                if (error) {
                    console.warn('DB delete error, trying by sku:', error);
                    if (skus.length > 0) {
                        await InventoryApp.supabaseClient.from('product_labels').delete().in('sku', skus);
                    }
                }
            } else if (skus.length > 0) {
                await InventoryApp.supabaseClient.from('product_labels').delete().in('sku', skus);
            }
        }

        parentKeys.forEach(pk => {
            localStorage.removeItem('sgyver_img_' + pk);
            localStorage.removeItem('sgyver_gallery_' + pk);
            localStorage.removeItem('sgyver_cat_' + pk);
            localStorage.removeItem('sgyver_desc_' + pk);
            localStorage.removeItem('sgyver_parent_sku_' + pk);
        });
        skus.forEach(s => {
            localStorage.removeItem('sgyver_img_' + s);
            localStorage.removeItem('sgyver_gallery_' + s);
            localStorage.removeItem('sgyver_cat_' + s);
            localStorage.removeItem('sgyver_desc_' + s);
        });

        InventoryApp.products = InventoryApp.products.filter(p => !isJunkShopeeProduct(p));
        calculateMetrics(InventoryApp.products);
        renderTable();

        const banner = document.getElementById('junkDetectedBanner');
        if (banner) banner.remove();

        alert(`🎉 ลบรายการป้ายโฆษณา Shopee Seller Centre สำเร็จครบทั้ง ${junkItems.length} รายการ!\n\nคงเหลือเฉพาะสินค้าจริงในคลังสินค้าของคุณเรียบร้อยแล้วครับ`);
    } catch (err) {
        console.error('Error cleaning junk items:', err);
        alert('เกิดข้อผิดพลาดในการลบ: ' + (err.message || err));
    }
}

// ------------------------------------------------------------------------------
// 🔍 DUPLICATE PRODUCT & POST DETECTOR & MERGE ENGINE
// ------------------------------------------------------------------------------
function findExistingProductByNameOrUrl(title, url, images) {
    if (!title && !url && (!images || images.length === 0)) return null;
    const cleanTitle = (title || '').trim().toLowerCase();
    const products = InventoryApp.products || [];

    // 1. Exact or high-confidence title match
    if (cleanTitle && cleanTitle.length >= 3 && !cleanTitle.startsWith('สินค้า sp_') && !cleanTitle.startsWith('สินค้า row_')) {
        const found = products.find(p => {
            if (!p || !p.name) return false;
            if (isJunkShopeeProduct(p)) return false;
            const pName = p.name.trim().toLowerCase();
            if (pName === cleanTitle) return true;
            // Also match if one contains the other (when long enough to avoid false positives)
            if (cleanTitle.length > 15 && pName.length > 15) {
                if (cleanTitle.includes(pName) || pName.includes(cleanTitle)) return true;
            }
            return false;
        });
        if (found) return found;
    }

    // 2. Shopee URL or product URL match
    if (url) {
        const urlClean = url.split('?')[0].replace(/\/+$/, '');
        const found = products.find(p => {
            if (!p.product_url) return false;
            const pUrl = p.product_url.split('?')[0].replace(/\/+$/, '');
            return pUrl === urlClean;
        });
        if (found) return found;
    }

    // 3. Cover image URL match
    if (images && images.length > 0) {
        const firstImg = (images[0] || '').split('?')[0];
        if (firstImg && (firstImg.includes('susercontent.com') || firstImg.startsWith('http'))) {
            const found = products.find(p => {
                if (p.image_url && p.image_url.split('?')[0] === firstImg) return true;
                if (Array.isArray(p.images) && p.images.some(img => img && img.split('?')[0] === firstImg)) return true;
                return false;
            });
            if (found) return found;
        }
    }

    return null;
}

function detectDuplicatePosts() {
    return [];
}

function renderDuplicatePostsBanner() {
    const banner = document.getElementById('duplicateDetectedBanner');
    if (banner) banner.remove();
}

function cleanAndMergeAllDuplicatePosts() {}

// ------------------------------------------------------------------------------
// Master Table / Grid Router
// ------------------------------------------------------------------------------
function renderTable() {
    renderJunkBanner();
    renderDuplicatePostsBanner();
    const items = getFilteredProducts();

    if (InventoryApp.viewMode === 'CARD') {
        renderShopeeCardGrid(items);
    } else if (InventoryApp.viewMode === 'PARENT') {
        renderParentGroupedTable(items);
    } else {
        renderFlatTable(items);
    }
}

// ------------------------------------------------------------------------------
// 🎴 Shopee Card Grid View (การ์ดสินค้าหลัก Parent SKU - คลิกแล้วดู SKU ย่อยข้างใน)
// ------------------------------------------------------------------------------
function renderShopeeCardGrid(items) {
    const gridEl = document.getElementById('shopeeCardGrid');
    const showingCardCount = document.getElementById('showingCardCount');
    const headerTotalItems = document.getElementById('headerTotalItems');
    if (!gridEl) return;

    if (items.length === 0) {
        gridEl.innerHTML = `
            <div class="col-span-full py-16 text-center text-slate-400">
                <i class="bi bi-inbox text-4xl block mb-2 text-slate-300"></i>
                <div class="text-sm font-medium text-slate-600">ไม่พบรายการสินค้าในเงื่อนไขที่เลือก</div>
                <div class="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกแท็บ "ทั้งหมด"</div>
            </div>
        `;
        if (showingCardCount) showingCardCount.innerText = '0';
        if (headerTotalItems) headerTotalItems.innerText = '0';
        return;
    }

    // Group items strictly by Parent SKU
    const parentMap = new Map();
    items.forEach(p => {
        const key = getParentGroupKey(p);
        if (!parentMap.has(key)) {
            const rawParentSku = p.parent_sku || key;
            const cleanTitle = getCleanParentTitle(p.name, rawParentSku);
            parentMap.set(key, {
                key: key,
                parentSku: rawParentSku,
                name: cleanTitle,
                image_url: '',
                items: []
            });
        }
        parentMap.get(key).items.push(p);
    });

    const parentGroups = Array.from(parentMap.values());
    if (showingCardCount) showingCardCount.innerText = `${parentGroups.length.toLocaleString('th-TH')} สินค้าหลัก (${items.length.toLocaleString('th-TH')} SKU ย่อย)`;
    if (headerTotalItems) headerTotalItems.innerText = parentGroups.length.toLocaleString('th-TH');

    // Palettes for sleek Shopee cover placeholders
    const coverGradients = [
        'from-pink-100 via-rose-50 to-orange-100 text-rose-500',
        'from-amber-100 via-orange-50 to-yellow-100 text-amber-600',
        'from-emerald-100 via-teal-50 to-cyan-100 text-teal-600',
        'from-blue-100 via-indigo-50 to-sky-100 text-blue-600',
        'from-purple-100 via-violet-50 to-fuchsia-100 text-purple-600',
        'from-slate-100 via-gray-100 to-zinc-200 text-slate-600'
    ];

    const discountTags = ['27% ลด', '58% ลด', '47% ลด', '77% ลด', '40% ลด', '37% ลด', '15% ลด', '50% ลด'];

    gridEl.innerHTML = parentGroups.map((parent, idx) => {
        let totalStock = 0;
        let prices = [];

        parent.items.forEach(c => {
            const qty = parseInt(c.stock_quantity ?? 0, 10);
            const price = parseFloat(c.price ?? 0);
            totalStock += qty;
            if (price > 0) prices.push(price);
        });

        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        let priceText = '฿0';
        if (prices.length > 0) {
            priceText = minPrice === maxPrice
                ? '฿' + Math.round(minPrice).toLocaleString('th-TH')
                : `฿${Math.round(minPrice).toLocaleString('th-TH')} - ฿${Math.round(maxPrice).toLocaleString('th-TH')}`;
        }

        const gradientTheme = coverGradients[idx % coverGradients.length];
        const discountTag = discountTags[idx % discountTags.length];
        
        // Priority 1: First image from saved gallery (Image #1 is ALWAYS the cover)
        const cachedGallery = localStorage.getItem('sgyver_gallery_' + parent.parentSku) || localStorage.getItem('sgyver_gallery_' + parent.key);
        let firstFromGallery = '';
        let galleryArr = [];
        if (cachedGallery) {
            try {
                const arr = JSON.parse(cachedGallery);
                if (Array.isArray(arr) && arr.length > 0) {
                    galleryArr = arr.filter(Boolean);
                    if (galleryArr.length > 0) firstFromGallery = galleryArr[0];
                }
            } catch(e) {}
        }

        // Priority 2: Explicitly cached cover image for the parent model
        const cachedImg = localStorage.getItem('sgyver_img_' + parent.parentSku) || localStorage.getItem('sgyver_img_' + parent.key);

        // Priority 3: Check if child items have gallery images array
        let firstFromItemsImages = '';
        for (const item of parent.items) {
            if (Array.isArray(item.images) && item.images.length > 0 && item.images[0]) {
                firstFromItemsImages = item.images[0];
                break;
            }
        }

        // Priority 4: Fallback to variant image_url
        const coverImg = firstFromGallery || cachedImg || firstFromItemsImages || parent.items.find(x => x.image_url)?.image_url || '';
        const hasCustomImage = coverImg && (coverImg.startsWith('http') || coverImg.startsWith('data:image/'));

        // Distinct gallery count
        const allImages = new Set();
        if (coverImg) allImages.add(coverImg);
        galleryArr.forEach(u => allImages.add(u));
        parent.items.forEach(c => {
            if (c.image_url) allImages.add(c.image_url);
            if (Array.isArray(c.images)) c.images.forEach(u => allImages.add(u));
        });
        const galleryCount = allImages.size;

        // Shopee Origin URL detection
        const shopeeUrl = parent.items.find(x => x.product_url)?.product_url ||
                          localStorage.getItem('sgyver_product_url_' + parent.parentSku) ||
                          localStorage.getItem('sgyver_product_url_' + parent.key) ||
                          localStorage.getItem('sgyver_shopee_url_' + parent.parentSku) ||
                          localStorage.getItem('sgyver_shopee_url_' + parent.key) || '';

        // Location Info detection
        const hasLocationInfo = parent.items.some(x => x.location_image || x.location_note) ||
                                localStorage.getItem('sgyver_loc_img_' + parent.parentSku) ||
                                localStorage.getItem('sgyver_loc_img_' + parent.key) ||
                                localStorage.getItem('sgyver_loc_note_' + parent.parentSku) ||
                                localStorage.getItem('sgyver_loc_note_' + parent.key);

        return `
            <!-- Shopee Parent SKU Card (คลิกตรงไหนก็ได้เพื่อเปิดดู SKU ย่อยข้างใน) -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-visible shadow-sm hover:shadow-lg hover:border-[#ee4d2d] transition-all flex flex-col group relative cursor-pointer" 
                onclick="openShopeeVariationModal('${escapeHtml(parent.key)}')" 
                title="คลิกเพื่อดูตัวเลือก ${parent.items.length} SKU ย่อยของรุ่น ${escapeHtml(parent.parentSku)}">
                
                <!-- Top Cover Image Area -->
                <div class="relative aspect-square bg-gradient-to-br ${gradientTheme} overflow-hidden rounded-t-xl">
                    <!-- Checkbox Top-Left -->
                    <input type="checkbox" onclick="event.stopPropagation()" 
                        class="absolute top-2 left-2 rounded w-4 h-4 text-[#ee4d2d] focus:ring-[#ee4d2d] bg-white/90 border-slate-300 z-10 cursor-pointer shadow-sm">

                    <!-- Shopee Source Badge (Top-Left next to checkbox) -->
                    ${shopeeUrl ? `
                        <a href="${escapeHtml(shopeeUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"
                            class="absolute top-2 left-7 z-10 bg-[#ee4d2d] hover:bg-[#d73211] text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 transition-all hover:scale-105"
                            title="เปิดดูสินค้าต้นฉบับบน Shopee (เปิดแท็บใหม่)">
                            <i class="bi bi-shop"></i> Shopee
                        </a>
                    ` : ''}

                    <!-- Discount Badge Top-Right (like in Shopee screenshot) -->
                    <span class="absolute top-0 right-0 bg-[#ffd839] text-[#7a4b00] text-[10px] font-extrabold px-1.5 py-0.5 rounded-bl shadow-xs z-10 tracking-tight">
                        ${discountTag}
                    </span>

                    ${hasCustomImage ? `
                        <img src="${escapeHtml(coverImg)}" alt="${escapeHtml(parent.name)}" 
                            onclick="event.stopPropagation(); openImagePreview('${escapeHtml(coverImg)}', '${escapeHtml(parent.name)} (${escapeHtml(parent.parentSku)})')"
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer" title="คลิกดูรูปขนาดใหญ่ (Popup)">
                    ` : `
                        <div class="w-full h-full flex flex-col items-center justify-center p-3 text-center group-hover:scale-105 transition-transform duration-300 select-none">
                            <div class="w-12 h-12 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center text-2xl mb-1 backdrop-blur-xs">
                                👕
                            </div>
                            <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 bg-white/90 px-2 py-0.5 rounded-md shadow-xs">${escapeHtml(parent.parentSku)}</span>
                        </div>
                    `}

                    <!-- Location info badge (Bottom-Left) -->
                    ${hasLocationInfo ? `
                        <div class="absolute bottom-1.5 left-1.5 z-10 bg-emerald-700/85 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow" title="มีรูปหรือโน้ตพิกัดคลัง">
                            <i class="bi bi-geo-alt-fill text-amber-300 text-[9px]"></i> มีพิกัดคลัง
                        </div>
                    ` : ''}

                    <!-- Multi-Image Gallery Badge (if product has 2+ photos) -->
                    ${galleryCount > 1 ? `
                        <div class="absolute bottom-1.5 right-1.5 z-10 bg-slate-900/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow">
                            <i class="bi bi-images text-[9px] text-amber-300"></i> ${galleryCount} รูป
                        </div>
                    ` : ''}

                    <!-- Hover Quick Overlay -->
                    <div class="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="bg-[#ee4d2d] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                            <i class="bi bi-tag-fill"></i> ดู ${parent.items.length} SKU ย่อย
                        </span>
                    </div>
                </div>

                <!-- Card Body -->
                <div class="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                        <!-- Title (2 lines clamp like Shopee) -->
                        <h4 class="text-xs font-semibold text-slate-800 line-clamp-2 h-8 leading-tight group-hover:text-[#ee4d2d] transition-colors" 
                            title="${escapeHtml(parent.name)}">
                            ${escapeHtml(parent.name)}
                        </h4>

                        <!-- Parent SKU Badge & Variations Count -->
                        <div class="mt-1 flex items-center justify-between gap-1 text-[11px]">
                            <span class="font-mono font-bold text-[#ee4d2d] bg-orange-50 border border-orange-200 px-1.5 py-0.2 rounded text-[10.5px] truncate max-w-[170px]" title="Parent SKU: ${escapeHtml(parent.parentSku)}">
                                ${escapeHtml(parent.parentSku)}
                            </span>
                            <span class="text-[10px] font-bold text-orange-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full shrink-0">
                                ${parent.items.length} ตัวเลือก
                            </span>
                        </div>

                        <!-- Price with orange Tag icon -->
                        <div class="text-sm font-bold text-[#ee4d2d] mt-1.5 flex items-center gap-1 font-sans">
                            <span>${priceText}</span>
                            <span class="text-[11px]">🏷️</span>
                        </div>

                        <!-- Stock Info like Shopee -->
                        <div class="text-xs text-slate-600 mt-0.5 flex items-center justify-between">
                            <span>คลังรวม <span class="font-bold font-mono ${totalStock <= 0 ? 'text-rose-600' : 'text-slate-800'}">${totalStock.toLocaleString('th-TH')}</span> ชิ้น</span>
                        </div>
                    </div>

                    <!-- Metrics / Stats Row (Views, Likes, Sales like Shopee) -->
                    <div class="text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <span class="flex items-center gap-0.5"><i class="bi bi-eye text-[11px]"></i> ${(totalStock * 7 + 120).toLocaleString()}</span>
                        <span class="flex items-center gap-0.5"><i class="bi bi-heart text-[10px]"></i> ${(totalStock * 3 + 45).toLocaleString()}</span>
                        <span class="flex items-center gap-0.5"><i class="bi bi-bag-check text-[10px]"></i> ${(totalStock * 2 + 15).toLocaleString()}</span>
                    </div>
                </div>

                <!-- Bottom Action Bar (Edit, Print, Options) -->
                <div class="border-t border-slate-100 py-1.5 px-2 flex items-center justify-around text-slate-400 bg-slate-50/60 text-xs rounded-b-xl relative" onclick="event.stopPropagation()">
                    <button type="button" onclick="editProductModal(${parent.items[0]?.id})" 
                        class="p-1 hover:text-[#ee4d2d] transition-colors" title="แก้ไขสินค้า">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <span class="text-slate-200">|</span>
                    <button type="button" onclick="printAllParentLabels('${escapeHtml(parent.key)}')" 
                        class="p-1 hover:text-blue-600 transition-colors" title="พิมพ์ฉลากทุกตัวเลือก">
                        <i class="bi bi-printer"></i>
                    </button>
                    ${shopeeUrl ? `
                        <span class="text-slate-200">|</span>
                        <a href="${escapeHtml(shopeeUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"
                            class="p-1 text-[#ee4d2d] hover:text-[#d73211] transition-transform hover:scale-110 flex items-center font-bold"
                            title="เปิดดูสินค้าต้นฉบับบน Shopee (เปิดแท็บใหม่)">
                            <i class="bi bi-box-arrow-up-right"></i>
                        </a>
                    ` : ''}
                    <span class="text-slate-200">|</span>
                    <div class="relative inline-flex items-center">
                        <button type="button" onclick="toggleCardActionMenu(event, ${idx})" 
                            class="p-1 hover:text-[#ee4d2d] transition-colors font-bold flex items-center gap-0.5" title="ตัวเลือกเพิ่มเติม">
                            <i class="bi bi-three-dots"></i>
                        </button>

                        <!-- Mini Dropdown Popup -->
                        <div id="cardActionMenu_${idx}" onclick="event.stopPropagation()" class="hidden absolute right-0 bottom-full mb-1.5 w-38 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 divide-y divide-slate-100 text-xs">
                            ${shopeeUrl ? `
                                <a href="${escapeHtml(shopeeUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); closeAllCardActionMenus();"
                                    class="flex items-center gap-2 px-3 py-2 text-orange-600 hover:bg-orange-50 w-full text-left font-bold transition-colors cursor-pointer" title="เปิดดูบน Shopee">
                                    <i class="bi bi-shop text-orange-500 text-xs"></i>
                                    <span>เปิดบน Shopee</span>
                                </a>
                            ` : ''}
                            <button type="button" onclick="event.stopPropagation(); closeAllCardActionMenus(); openShopeeVariationModal('${escapeHtml(parent.key)}')" 
                                class="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 w-full text-left transition-colors font-medium cursor-pointer" title="ดูตัวเลือกย่อย">
                                <i class="bi bi-diagram-3 text-slate-500 text-xs"></i>
                                <span>ดูตัวเลือกย่อย</span>
                            </button>
                            <button type="button" onclick="event.stopPropagation(); closeAllCardActionMenus(); openDeleteConfirmModal('${escapeHtml(parent.key)}')" 
                                class="flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 w-full text-left font-bold transition-colors cursor-pointer" title="ลบสินค้านี้ออกจากคลัง">
                                <i class="bi bi-trash-fill text-rose-500 text-xs"></i>
                                <span>ลบสินค้า</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleCardActionMenu(e, idx) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const menu = document.getElementById(`cardActionMenu_${idx}`);
    const wasOpen = menu && !menu.classList.contains('hidden');
    closeAllCardActionMenus();
    if (menu && !wasOpen) {
        menu.classList.remove('hidden');
    }
}

function closeAllCardActionMenus() {
    document.querySelectorAll('[id^="cardActionMenu_"]').forEach(el => el.classList.add('hidden'));
}

if (!window._cardActionMenuListenerAttached) {
    document.addEventListener('click', closeAllCardActionMenus);
    window._cardActionMenuListenerAttached = true;
}

// ------------------------------------------------------------------------------
// 🗑️ Delete Product Management (Custom Modal + Supabase Cascade)
// ------------------------------------------------------------------------------
function openDeleteConfirmModal(parentKey) {
    closeAllCardActionMenus();
    const parentItems = InventoryApp.products.filter(p => {
        const k = typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : p.sku;
        return k === parentKey || p.parent_sku === parentKey || p.sku === parentKey || (p.sku && p.sku.startsWith(parentKey + '-')) || (p.sku && p.sku.startsWith(parentKey + '_'));
    });

    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) {
        executeDeleteParentProduct(parentKey);
        return;
    }

    const first = (parentItems && parentItems.length > 0) ? parentItems[0] : null;
    const parentSku = first ? (first.parent_sku || parentKey) : parentKey;
    const count = parentItems && parentItems.length > 0 ? parentItems.length : 1;
    const productName = first ? (first.name || `สินค้า ${parentSku}`) : `สินค้า ${parentSku}`;

    const elParentSku = document.getElementById('delModalParentSku');
    const elCount = document.getElementById('delModalCount');
    const elName = document.getElementById('delModalName');
    const btnConfirm = document.getElementById('btnConfirmDeleteProduct');

    if (elParentSku) elParentSku.innerText = parentSku;
    if (elCount) elCount.innerText = `${count.toLocaleString('th-TH')} รายการ`;
    if (elName) elName.innerText = productName;

    if (btnConfirm) {
        btnConfirm.onclick = async () => {
            btnConfirm.disabled = true;
            btnConfirm.innerHTML = `<div class="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1"></div> กำลังลบ...`;
            try {
                await executeDeleteParentProduct(parentKey);
            } finally {
                btnConfirm.disabled = false;
                btnConfirm.innerHTML = `<i class="bi bi-trash-fill"></i> <span>ยืนยันลบ</span>`;
                closeDeleteConfirmModal();
            }
        };
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function executeDeleteParentProduct(parentKey) {
    const parentItems = InventoryApp.products.filter(p => {
        const k = typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : p.sku;
        return k === parentKey || p.parent_sku === parentKey || p.sku === parentKey || (p.sku && p.sku.startsWith(parentKey + '-')) || (p.sku && p.sku.startsWith(parentKey + '_'));
    });

    const first = (parentItems && parentItems.length > 0) ? parentItems[0] : null;
    const parentSku = first ? (first.parent_sku || parentKey) : parentKey;

    try {
        const ids = parentItems.map(p => p.id).filter(Boolean);
        const skus = parentItems.map(p => p.sku).filter(Boolean);

        if (InventoryApp.supabaseClient) {
            if (ids.length > 0) {
                const { error } = await InventoryApp.supabaseClient
                    .from('product_labels')
                    .delete()
                    .in('id', ids);

                if (error) {
                    console.warn('Delete parent IDs DB notice:', error.message);
                    // Fallback delete by SKU
                    if (skus.length > 0) {
                        await InventoryApp.supabaseClient
                            .from('product_labels')
                            .delete()
                            .in('sku', skus);
                    }
                }
            } else if (skus.length > 0) {
                await InventoryApp.supabaseClient
                    .from('product_labels')
                    .delete()
                    .in('sku', skus);
            }
        }

        // Clean up localStorage keys
        localStorage.removeItem('sgyver_img_' + parentSku);
        localStorage.removeItem('sgyver_img_' + parentKey);
        localStorage.removeItem('sgyver_gallery_' + parentSku);
        localStorage.removeItem('sgyver_gallery_' + parentKey);
        localStorage.removeItem('sgyver_parent_sku_' + parentSku);
        localStorage.removeItem('sgyver_parent_sku_' + parentKey);
        localStorage.removeItem('sgyver_cat_' + parentSku);
        localStorage.removeItem('sgyver_cat_' + parentKey);
        localStorage.removeItem('sgyver_desc_' + parentSku);
        localStorage.removeItem('sgyver_desc_' + parentKey);
        localStorage.removeItem('sgyver_sizechart_' + parentSku);
        localStorage.removeItem('sgyver_sizechart_' + parentKey);
        localStorage.removeItem('sgyver_video_' + parentSku);
        localStorage.removeItem('sgyver_video_' + parentKey);

        parentItems.forEach(c => {
            if (c.sku) {
                localStorage.removeItem('sgyver_img_' + c.sku);
                localStorage.removeItem('sgyver_gallery_' + c.sku);
                localStorage.removeItem('sgyver_parent_sku_' + c.sku);
                localStorage.removeItem('sgyver_video_' + c.sku);
            }
        });

        // Update in-memory InventoryApp.products
        InventoryApp.products = InventoryApp.products.filter(p => {
            const k = typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : p.sku;
            const isMatch = k === parentKey || p.parent_sku === parentKey || p.sku === parentKey || (p.sku && p.sku.startsWith(parentKey + '-')) || (p.sku && p.sku.startsWith(parentKey + '_'));
            return !isMatch;
        });

        calculateMetrics(InventoryApp.products);
        renderTable();

        showToastNotification(`ลบสินค้า "${parentSku}" เรียบร้อยแล้ว`);
    } catch (err) {
        console.error('Delete parent product error:', err);
        showToastNotification('เกิดข้อผิดพลาดในการลบ: ' + (err.message || err), 'error');
    }
}

// Backward-compatibility alias
function deleteParentProduct(parentKey) {
    openDeleteConfirmModal(parentKey);
}

function showToastNotification(msg, type = 'success') {
    let toast = document.getElementById('globalToastNotification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToastNotification';
        document.body.appendChild(toast);
    }
    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 z-[99999] px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 transition-all duration-300 transform translate-y-4 opacity-0 ${
        isSuccess ? 'bg-slate-900 text-white border border-slate-700/80 shadow-slate-900/30' : 'bg-rose-600 text-white shadow-rose-600/30'
    }`;
    toast.innerHTML = isSuccess
        ? `<i class="bi bi-check-circle-fill text-emerald-400 text-base"></i> <span>${escapeHtml(msg)}</span>`
        : `<i class="bi bi-exclamation-triangle-fill text-amber-300 text-base"></i> <span>${escapeHtml(msg)}</span>`;

    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.style.transform = 'translateY(16px)';
        toast.style.opacity = '0';
    }, 3500);
}

// ------------------------------------------------------------------------------
// Shopee Variation Breakdown Modal (ดูและปรับสต็อกตัวเลือก สี/ไซส์)
// ------------------------------------------------------------------------------
function openShopeeVariationModal(parentKey) {
    const parentItems = InventoryApp.products.filter(p => getParentGroupKey(p) === parentKey);
    if (!parentItems || parentItems.length === 0) return;

    const modal = document.getElementById('shopeeVariationModal');
    const modalTitle = document.getElementById('varModalTitle');
    const modalParentSku = document.getElementById('varModalParentSku');
    const modalTotalStock = document.getElementById('varModalTotalStock');
    const tbody = document.getElementById('varModalTableBody');
    const printAllBtn = document.getElementById('varModalPrintAllBtn');

    const first = parentItems[0];
    const rawParentSku = first.parent_sku || parentKey;
    let totalStock = 0;
    parentItems.forEach(c => totalStock += parseInt(c.stock_quantity ?? 0, 10));

    if (modalTitle) modalTitle.innerText = first.name || `สินค้า ${rawParentSku}`;
    if (modalParentSku) modalParentSku.innerText = rawParentSku;
    if (modalTotalStock) modalTotalStock.innerText = `สต็อกรวม ${totalStock.toLocaleString('th-TH')} ชิ้น (${parentItems.length} ตัวเลือก)`;

    // Render Gallery Showcase if images exist
    const gallerySection = document.getElementById('varModalGallerySection');
    const galleryCountBadge = document.getElementById('varModalGalleryCount');
    const galleryStrip = document.getElementById('varModalGalleryStrip');

    let modalImagesArr = [];
    const cachedGallery = localStorage.getItem('sgyver_gallery_' + rawParentSku) || localStorage.getItem('sgyver_gallery_' + parentKey) || localStorage.getItem('sgyver_gallery_' + first.sku);
    if (cachedGallery) {
        try {
            const arr = JSON.parse(cachedGallery);
            if (Array.isArray(arr) && arr.length > 0) {
                modalImagesArr = arr.filter(Boolean);
            }
        } catch(e) {}
    }

    if (modalImagesArr.length === 0) {
        const modalImagesSet = new Set();
        const cachedCover = localStorage.getItem('sgyver_img_' + rawParentSku) || localStorage.getItem('sgyver_img_' + parentKey) || localStorage.getItem('sgyver_img_' + first.sku);
        if (cachedCover) modalImagesSet.add(cachedCover);
        parentItems.forEach(c => {
            if (c.image_url) modalImagesSet.add(c.image_url);
            if (Array.isArray(c.images)) c.images.forEach(u => modalImagesSet.add(u));
        });
        modalImagesArr = Array.from(modalImagesSet).filter(Boolean);
    }

    // Ensure cover is first (if no explicit cached gallery exists)
    const coverPhoto = localStorage.getItem('sgyver_img_' + rawParentSku) || localStorage.getItem('sgyver_img_' + parentKey) || localStorage.getItem('sgyver_img_' + first.sku);
    if (!cachedGallery && coverPhoto) {
        const cIdx = modalImagesArr.indexOf(coverPhoto);
        if (cIdx > 0) {
            modalImagesArr.splice(cIdx, 1);
            modalImagesArr.unshift(coverPhoto);
        } else if (cIdx === -1) {
            modalImagesArr.unshift(coverPhoto);
        }
    }

    if (gallerySection && galleryStrip) {
        if (modalImagesArr.length > 0) {
            gallerySection.classList.remove('hidden');
            if (galleryCountBadge) galleryCountBadge.innerText = `${modalImagesArr.length} รูป (รูปแรกคือรูปปก)`;
            window.currentDetailsImages = modalImagesArr;
            galleryStrip.innerHTML = modalImagesArr.map((url, idx) => {
                const isCover = idx === 0;
                return `
                    <div class="relative rounded-lg overflow-hidden border ${isCover ? 'border-amber-400 ring-2 ring-amber-300' : 'border-slate-200'} shrink-0 w-20 h-20 bg-white group cursor-pointer"
                        onclick="openImagePreview('${escapeHtml(url)}', 'รูปภาพสินค้า #${idx + 1} (${escapeHtml(first.name || first.sku)})', window.currentDetailsImages, ${idx})" title="คลิกดูรูปขนาดใหญ่ (Popup)">
                        ${isCover ? `
                            <span class="absolute top-0.5 left-0.5 bg-amber-500 text-white text-[8px] font-bold px-1 rounded shadow z-10">
                                รูปปก
                            </span>
                        ` : ''}
                        <img src="${escapeHtml(url)}" alt="รูป #${idx + 1}" class="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            onerror="this.onerror=null; this.src='https://placehold.co/100x100/f1f5f9/94a3b8?text=Error';">
                    </div>
                `;
            }).join('');
        } else {
            gallerySection.classList.add('hidden');
            galleryStrip.innerHTML = '';
        }
    }

    if (printAllBtn) {
        printAllBtn.onclick = () => {
            window.location.href = `../product_labels/label_printer.html?sku=${encodeURIComponent(first.sku)}`;
        };
    }

    const varShopeeBtn = document.getElementById('varModalShopeeBtn');
    const varShopeeUrl = parentItems.find(x => x.product_url)?.product_url ||
                         localStorage.getItem('sgyver_product_url_' + rawParentSku) ||
                         localStorage.getItem('sgyver_product_url_' + parentKey) ||
                         localStorage.getItem('sgyver_shopee_url_' + rawParentSku) ||
                         localStorage.getItem('sgyver_shopee_url_' + parentKey) ||
                         localStorage.getItem('sgyver_shopee_url_' + first.sku);
    if (varShopeeBtn) {
        if (varShopeeUrl) {
            varShopeeBtn.href = varShopeeUrl;
            varShopeeBtn.classList.remove('hidden');
            varShopeeBtn.classList.add('inline-flex');
        } else {
            varShopeeBtn.classList.add('hidden');
            varShopeeBtn.classList.remove('inline-flex');
        }
    }

    // Populate Warehouse Location Section (Comment & Shelf Photo)
    const varLocSection = document.getElementById('varModalLocationSection');
    const varLocNote = parentItems.find(x => x.location_note)?.location_note ||
                       localStorage.getItem('sgyver_loc_note_' + rawParentSku) ||
                       localStorage.getItem('sgyver_loc_note_' + parentKey) ||
                       localStorage.getItem('sgyver_loc_note_' + first.sku) || '';
    const varLocImg = parentItems.find(x => x.location_image)?.location_image ||
                      localStorage.getItem('sgyver_loc_img_' + rawParentSku) ||
                      localStorage.getItem('sgyver_loc_img_' + parentKey) ||
                      localStorage.getItem('sgyver_loc_img_' + first.sku) || '';

    if (varLocSection) {
        if (varLocNote || varLocImg) {
            varLocSection.classList.remove('hidden');
            const noteEl = document.getElementById('varModalLocationNote');
            if (noteEl) noteEl.innerText = varLocNote || '(ไม่มีคอมเมนต์ข้อความ มีเฉพาะรูปถ่ายจุดเก็บ)';
            const rackEl = document.getElementById('varModalLocationRackBadge');
            if (rackEl) rackEl.innerText = 'ชั้น: ' + (first.warehouse_location || 'A-01');

            const imgContainer = document.getElementById('varModalLocationImgContainer');
            const imgEl = document.getElementById('varModalLocationImg');
            if (varLocImg && imgContainer && imgEl) {
                imgContainer.classList.remove('hidden');
                imgEl.src = varLocImg;
                imgContainer.onclick = () => openImagePreview(varLocImg, `พิกัดจุดเก็บในคลัง: ${escapeHtml(rawParentSku)} (${escapeHtml(first.name || '')})`);
            } else if (imgContainer) {
                imgContainer.classList.add('hidden');
            }
        } else {
            varLocSection.classList.add('hidden');
        }
    }

    if (tbody) {
        tbody.innerHTML = parentItems.map(c => {
            const cQty = parseInt(c.stock_quantity ?? 0, 10);
            const cPrice = parseFloat(c.price ?? 0);
            const cMin = parseInt(c.min_stock_alert ?? 5, 10);

            let cBadge = '';
            if (cQty <= 0) {
                cBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">หมดสต็อก</span>`;
            } else if (cQty <= cMin) {
                cBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">${cQty} ชิ้น</span>`;
            } else {
                cBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">${cQty} ชิ้น</span>`;
            }

            const varImg = c.image_url || localStorage.getItem('sgyver_img_' + (c.sku || '')) || null;

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2.5 px-3 font-semibold text-slate-800">
                        <div class="flex items-center gap-2">
                            ${varImg ? `
                                <img src="${escapeHtml(varImg)}" alt="${escapeHtml(c.variant || '')}" 
                                    onclick="openImagePreview('${escapeHtml(varImg)}', 'ตัวเลือก: ${escapeHtml(c.variant || c.sku)} (${escapeHtml(first.name || '')})')"
                                    class="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:scale-105 transition-transform" 
                                    title="คลิกเพื่อดูรูปขนาดใหญ่ (Popup)">
                            ` : `
                                <div class="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 text-xs">
                                    <i class="bi bi-tag"></i>
                                </div>
                            `}
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-[#ee4d2d] border border-orange-200">
                                <i class="bi bi-tag-fill text-[10px]"></i>
                                ${escapeHtml(c.variant || 'ค่าเริ่มต้น')}
                            </span>
                        </div>
                    </td>
                    <td class="py-2.5 px-3 font-mono font-bold text-blue-600">
                        <span class="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs inline-block truncate max-w-[140px] align-middle" title="${escapeHtml(c.sku)}">${escapeHtml(c.sku)}</span>
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        <span class="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                            ${escapeHtml(c.warehouse_location || 'A-1')}
                        </span>
                    </td>
                    <td class="py-2.5 px-3 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="adjustStockDirect(${c.id}, -1); openShopeeVariationModal('${escapeHtml(parentKey)}');" 
                                class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition-colors" title="ตัดจ่าย -1">
                                -
                            </button>
                            ${cBadge}
                            <button type="button" onclick="adjustStockDirect(${c.id}, 1); openShopeeVariationModal('${escapeHtml(parentKey)}');" 
                                class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 flex items-center justify-center text-xs font-bold transition-colors" title="รับเข้า +1">
                                +
                            </button>
                        </div>
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        ${cPrice > 0 ? '฿' + cPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td class="py-2.5 px-3 text-center whitespace-nowrap">
                        <div class="inline-flex items-center gap-1">
                            <a href="../product_labels/label_printer.html?sku=${encodeURIComponent(c.sku)}" 
                                class="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="พิมพ์ฉลากบาร์โค้ดดวงนี้">
                                <i class="bi bi-printer-fill"></i>
                            </a>
                            <button type="button" onclick="closeShopeeVariationModal(); editProductModal(${c.id});" 
                                class="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors" title="แก้ไข">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button type="button" onclick="closeShopeeVariationModal(); deleteProduct(${c.id});" 
                                class="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors" title="ลบ">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (modal) modal.classList.remove('hidden');
}

function closeShopeeVariationModal() {
    const modal = document.getElementById('shopeeVariationModal');
    if (modal) modal.classList.add('hidden');
}

// ------------------------------------------------------------------------------
// Shopee Parent Grouped View (จัดกลุ่มสินค้าแม่ และกางดูตัวเลือก สี/ไซส์ ย่อย)
// ------------------------------------------------------------------------------
function renderParentGroupedTable(items, tbody, showingCount) {
    // 1. Update Table Header for Parent View
    const thead = document.getElementById('inventoryTableHeader');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th class="py-3 px-4 min-w-[280px]">สินค้าหลัก & Parent SKU</th>
                <th class="py-3 px-3 text-center w-28 whitespace-nowrap">ตัวเลือกย่อย</th>
                <th class="py-3 px-3 text-center w-32 whitespace-nowrap">คลังรวม (ชิ้น)</th>
                <th class="py-3 px-3 text-right w-32 whitespace-nowrap">ช่วงราคา</th>
                <th class="py-3 px-3 text-right w-32 whitespace-nowrap">มูลค่ารวม</th>
                <th class="py-3 px-4 text-center w-36 whitespace-nowrap">
                    <button type="button" onclick="toggleExpandAllParents()" 
                        class="text-[11px] font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-lg transition-colors inline-flex items-center gap-1" title="กางหรือยุบตัวเลือกสินค้าทั้งหมด">
                        <i class="bi bi-arrows-expand"></i>
                        <span id="expandAllLabel">${InventoryApp.expandedParents.size > 0 ? 'ยุบทั้งหมด' : 'กางทั้งหมด'}</span>
                    </button>
                </th>
            </tr>
        `;
    }

    if (items.length === 0) {
        if (showingCount) showingCount.innerText = '0 (0 สินค้าหลัก)';
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">
                    <i class="bi bi-inbox text-3xl block mb-2 text-slate-300"></i>
                    ไม่พบรายการสินค้าในเงื่อนไขที่เลือก
                </td>
            </tr>
        `;
        return;
    }

    // 2. Group items by Parent Key
    const parentMap = new Map();
    items.forEach(p => {
        const key = getParentGroupKey(p);
        if (!parentMap.has(key)) {
            const rawParentSku = p.parent_sku || key;
            parentMap.set(key, {
                key: key,
                parentSku: rawParentSku,
                name: p.name || `สินค้า ${rawParentSku}`,
                items: []
            });
        }
        parentMap.get(key).items.push(p);
    });

    const parentGroups = Array.from(parentMap.values());
    if (showingCount) {
        showingCount.innerText = `${items.length.toLocaleString('th-TH')} SKU (${parentGroups.length.toLocaleString('th-TH')} สินค้าหลัก)`;
    }

    // 3. Render Parent Rows & Child Variations
    let html = '';

    parentGroups.forEach(parent => {
        const isExpanded = InventoryApp.expandedParents.has(parent.key);
        let totalStock = 0;
        let totalVal = 0;
        let prices = [];

        parent.items.forEach(c => {
            const qty = parseInt(c.stock_quantity ?? 0, 10);
            const price = parseFloat(c.price ?? 0);
            totalStock += qty;
            totalVal += (qty * price);
            if (price > 0) prices.push(price);
        });

        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        let priceText = '-';
        if (prices.length > 0) {
            priceText = minPrice === maxPrice
                ? '฿' + minPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : `฿${minPrice.toFixed(0)} - ฿${maxPrice.toFixed(0)}`;
        }

        // Parent Stock Badge
        let stockBadge = '';
        if (totalStock <= 0) {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> หมดสต็อก
            </span>`;
        } else if (totalStock <= 5) {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <i class="bi bi-exclamation-triangle-fill text-[10px]"></i> ${totalStock} ชิ้น (ใกล้หมด)
            </span>`;
        } else {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ${totalStock.toLocaleString('th-TH')} ชิ้น
            </span>`;
        }

        const isAutoName = !parent.name || parent.name === '(ไม่มีชื่อสินค้าในไฟล์)';
        const displayTitle = isAutoName ? `สินค้า ${parent.parentSku}` : parent.name;

        // Render Parent Row
        html += `
            <tr class="hover:bg-orange-50/40 transition-colors border-t border-slate-200 group">
                <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                        <button type="button" onclick="toggleParentExpand('${escapeHtml(parent.key)}')" 
                            class="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-orange-100 hover:text-orange-600 text-slate-500 flex items-center justify-center text-xs transition-all shrink-0">
                            <i class="bi ${isExpanded ? 'bi-chevron-down text-orange-600 font-bold' : 'bi-chevron-right'}"></i>
                        </button>
                        <div class="w-9 h-9 rounded-xl bg-orange-100/70 border border-orange-200 text-orange-600 flex items-center justify-center font-bold text-base shrink-0">
                            <i class="bi bi-bag-check-fill"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-slate-900 line-clamp-1 flex items-center gap-2" title="${escapeHtml(displayTitle)}">
                                <span>${escapeHtml(displayTitle)}</span>
                            </div>
                            <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>Parent SKU: <span class="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.2 rounded">${escapeHtml(parent.parentSku)}</span></span>
                                ${parent.items[0]?.distributor ? `<span class="text-slate-400">• ${escapeHtml(parent.items[0].distributor)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-3 text-center">
                    <button type="button" onclick="toggleParentExpand('${escapeHtml(parent.key)}')" 
                        class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-700 border border-slate-200 transition-colors inline-flex items-center gap-1">
                        <span>${parent.items.length} ตัวเลือก</span>
                        <i class="bi ${isExpanded ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} text-[10px]"></i>
                    </button>
                </td>
                <td class="py-3 px-3 text-center whitespace-nowrap">
                    ${stockBadge}
                </td>
                <td class="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                    ${priceText}
                </td>
                <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                    ${totalVal > 0 ? '฿' + totalVal.toLocaleString('th-TH', { minimumFractionDigits: 0 }) : '-'}
                </td>
                <td class="py-3 px-4 text-center whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                        <button type="button" onclick="printAllParentLabels('${escapeHtml(parent.key)}')" 
                            class="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-xs font-medium transition-colors inline-flex items-center gap-1" title="สั่งพิมพ์ฉลากทุกตัวเลือกของรุ่นนี้">
                            <i class="bi bi-printer-fill"></i>
                            <span>พิมพ์ฉลาก</span>
                        </button>
                        <button type="button" onclick="toggleParentExpand('${escapeHtml(parent.key)}')" 
                            class="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs transition-colors">
                            ${isExpanded ? 'ซ่อน' : 'กางดู'}
                        </button>
                    </div>
                </td>
            </tr>
        `;

        // Render Child Variations if Expanded
        if (isExpanded) {
            html += `
                <tr class="bg-orange-50/20 border-b border-orange-200/60">
                    <td colspan="6" class="p-0">
                        <div class="px-6 py-3 space-y-2 bg-gradient-to-b from-orange-50/30 to-slate-50/50 border-l-4 border-orange-500">
                            <div class="text-[11px] font-bold text-orange-900 uppercase tracking-wider flex items-center justify-between mb-1.5">
                                <span class="flex items-center gap-1.5">
                                    <i class="bi bi-diagram-3-fill text-orange-600"></i>
                                    <span>ตัวเลือกสินค้า & สต็อกแยกย่อย (${parent.items.length} ตัวเลือก)</span>
                                </span>
                                <span class="text-slate-400 font-normal text-[10.5px]">ปรับสต็อกหรือพิมพ์ฉลากแยกตามสี/ไซส์ได้ทันที</span>
                            </div>

                            <div class="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                                <table class="w-full text-left text-xs">
                                    <thead class="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                                        <tr>
                                            <th class="py-2.5 px-3 min-w-[140px]">ตัวเลือก (สี / ไซส์)</th>
                                            <th class="py-2.5 px-3 min-w-[140px]">เลขอ้างอิง SKU ย่อย</th>
                                            <th class="py-2.5 px-3 text-center w-24">ชั้นวาง (Rack)</th>
                                            <th class="py-2.5 px-3 text-center w-36">สต็อกคงเหลือ</th>
                                            <th class="py-2.5 px-3 text-right w-28">ราคาขาย</th>
                                            <th class="py-2.5 px-3 text-center w-32">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 font-sans">
                                        ${parent.items.map(c => {
                                            const cQty = parseInt(c.stock_quantity ?? 0, 10);
                                            const cPrice = parseFloat(c.price ?? 0);
                                            const cMin = parseInt(c.min_stock_alert ?? 5, 10);

                                            let cBadge = '';
                                            if (cQty <= 0) {
                                                cBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">หมด</span>`;
                                            } else if (cQty <= cMin) {
                                                cBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">${cQty} ชิ้น</span>`;
                                            } else {
                                                cBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">${cQty} ชิ้น</span>`;
                                            }

                                            const varImg = c.image_url || localStorage.getItem('sgyver_img_' + (c.sku || '')) || null;

                                            return `
                                                <tr class="hover:bg-slate-50 transition-colors">
                                                    <td class="py-2.5 px-3 font-semibold text-slate-800">
                                                        <div class="flex items-center gap-2">
                                                            ${varImg ? `
                                                                <img src="${escapeHtml(varImg)}" alt="${escapeHtml(c.variant || '')}" 
                                                                    onclick="event.stopPropagation(); openImagePreview('${escapeHtml(varImg)}', 'ตัวเลือก: ${escapeHtml(c.variant || c.sku)}')"
                                                                    class="w-7 h-7 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:scale-105 transition-transform" 
                                                                    title="คลิกเพื่อดูรูปขนาดใหญ่ (Popup)">
                                                            ` : `
                                                                <div class="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 text-xs">
                                                                    <i class="bi bi-tag"></i>
                                                                </div>
                                                            `}
                                                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                                                <i class="bi bi-tag-fill text-[10px]"></i>
                                                                ${escapeHtml(c.variant || 'ค่าเริ่มต้น')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td class="py-2.5 px-3 font-mono font-bold text-blue-600">
                                                        <span class="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs inline-block truncate max-w-[140px] align-middle" title="${escapeHtml(c.sku)}">${escapeHtml(c.sku)}</span>
                                                    </td>
                                                    <td class="py-2.5 px-3 text-center">
                                                        <span class="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                                                            ${escapeHtml(c.warehouse_location || 'A-1')}
                                                        </span>
                                                    </td>
                                                    <td class="py-2.5 px-3 text-center whitespace-nowrap">
                                                        <div class="flex items-center justify-center gap-1.5">
                                                            <button type="button" onclick="adjustStockDirect(${c.id}, -1)" 
                                                                class="w-5 h-5 rounded bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition-colors" title="ตัดจ่าย -1">
                                                                -
                                                            </button>
                                                            ${cBadge}
                                                            <button type="button" onclick="adjustStockDirect(${c.id}, 1)" 
                                                                class="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 flex items-center justify-center text-xs font-bold transition-colors" title="รับเข้า +1">
                                                                +
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td class="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                                                        ${cPrice > 0 ? '฿' + cPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                                                    </td>
                                                    <td class="py-2.5 px-3 text-center whitespace-nowrap">
                                                        <div class="inline-flex items-center gap-1">
                                                            <a href="../product_labels/label_printer.html?sku=${encodeURIComponent(c.sku)}" 
                                                                class="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="พิมพ์ฉลากบาร์โค้ดดวงนี้">
                                                                <i class="bi bi-printer-fill"></i>
                                                            </a>
                                                            <button type="button" onclick="editProductModal(${c.id})" 
                                                                class="p-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors" title="แก้ไข">
                                                                <i class="bi bi-pencil-square"></i>
                                                            </button>
                                                            <button type="button" onclick="deleteProduct(${c.id})" 
                                                                class="p-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors" title="ลบ">
                                                                <i class="bi bi-trash-fill"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = html;
}

// ------------------------------------------------------------------------------
// Flat Table View (ตารางรวมทุก SKU ย่อย)
// ------------------------------------------------------------------------------
function renderFlatTable(items, tbody, showingCount) {
    // 1. Update Table Header for Flat View
    const thead = document.getElementById('inventoryTableHeader');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th class="py-3 px-4 w-36 whitespace-nowrap">รหัส SKU</th>
                <th class="py-3 px-3 min-w-[240px]">ชื่อสินค้า / ไซส์ & สี</th>
                <th class="py-3 px-3 text-center w-28 whitespace-nowrap">ชั้นวาง (Rack)</th>
                <th class="py-3 px-3 text-center w-36 whitespace-nowrap">สต็อกคงเหลือ</th>
                <th class="py-3 px-3 text-right w-28 whitespace-nowrap">ราคาขาย</th>
                <th class="py-3 px-3 text-right w-28 whitespace-nowrap">มูลค่ารวม</th>
                <th class="py-3 px-4 text-center w-28 whitespace-nowrap">จัดการ</th>
            </tr>
        `;
    }

    if (items.length === 0) {
        if (showingCount) showingCount.innerText = '0';
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

    if (showingCount) showingCount.innerText = items.length.toLocaleString('th-TH');

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

        const isAutoName = !p.name || p.name === '(ไม่มีชื่อสินค้าในไฟล์)';
        const displayTitle = isAutoName ? `สินค้า ${p.sku}` : p.name;
        const parentSku = p.parent_sku || (p.sku?.split(/[-_]/)[0] || '');

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                    <span class="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs truncate max-w-[130px] inline-block font-mono align-middle" title="${escapeHtml(p.sku)}">${escapeHtml(p.sku)}</span>
                </td>
                <td class="py-3 px-3">
                    <div class="font-bold text-slate-900 line-clamp-1 flex items-center gap-1.5" title="${escapeHtml(displayTitle)}">
                        <span>${escapeHtml(displayTitle)}</span>
                        ${isAutoName ? `
                            <button type="button" onclick="editProductModal(${p.id})" 
                                class="text-[10px] text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1 transition-colors font-sans font-normal shrink-0" title="คลิกเพื่อแก้ไขชื่อสินค้า">
                                <i class="bi bi-pencil-square"></i> แก้ไขชื่อ
                            </button>
                        ` : ''}
                    </div>
                    <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        ${p.variant ? `<span class="bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.2 rounded font-medium">${escapeHtml(p.variant)}</span>` : '<span class="text-slate-400">-</span>'}
                        ${parentSku ? `<span class="font-mono text-slate-400">แม่: ${escapeHtml(parentSku)}</span>` : ''}
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

// ------------------------------------------------------------------------------
// Export Shopee Mass Update Format (ส่งออกไฟล์สำหรับอัปเดต Shopee Seller Centre)
// ------------------------------------------------------------------------------
function exportShopeeMassUpdateCSV() {
    if (!InventoryApp.products || InventoryApp.products.length === 0) {
        alert('ไม่มีข้อมูลสินค้าในคลังสำหรับส่งออก');
        return;
    }

    const headers = [
        'รหัสสินค้า',
        'ชื่อสินค้า (ไม่บังคับ)',
        'เลขอ้างอิง Parent SKU (ไม่บังคับ)',
        'รหัสตัวเลือกสินค้า',
        'ชื่อตัวเลือกสินค้า (ไม่บังคับ)',
        'เลขอ้างอิง SKU (ไม่บังคับ)',
        'ราคาตั้งต้น (ไม่บังคับ)',
        'ราคาส่วนลด',
        'จำนวนคลัง'
    ];

    const rows = [headers];

    InventoryApp.products.forEach(p => {
        const parentSku = p.parent_sku || (p.sku?.split(/[-_]/)[0] || '');
        const variationSku = p.sku || '';
        const name = (p.name || '').replace(/[\r\n\t]/g, ' ');
        const variant = (p.variant || '').replace(/[\r\n\t]/g, ' ');
        const price = parseFloat(p.price || 0).toFixed(2);
        const stock = parseInt(p.stock_quantity ?? 0, 10);

        rows.push([
            p.item_id || '',
            `"${name.replace(/"/g, '""')}"`,
            `"${parentSku.replace(/"/g, '""')}"`,
            p.model_id || '',
            `"${variant.replace(/"/g, '""')}"`,
            `"${variationSku.replace(/"/g, '""')}"`,
            price,
            price,
            stock
        ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shopee_mass_update_stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function filterByTab(tab) {
    InventoryApp.activeTab = tab;

    const tabAll = document.getElementById('tabAll');
    const tabIn = document.getElementById('tabInStock');
    const tabLow = document.getElementById('tabLow');
    const tabOut = document.getElementById('tabOut');

    const defaultClass = 'py-3 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-900 transition-all font-sans whitespace-nowrap cursor-pointer';
    const activeClass = 'py-3 px-1 border-b-2 border-[#ee4d2d] text-[#ee4d2d] font-bold transition-all font-sans whitespace-nowrap cursor-pointer';

    if (tabAll) tabAll.className = tab === 'ALL' ? activeClass : defaultClass;
    if (tabIn) tabIn.className = tab === 'INSTOCK' ? activeClass : defaultClass;
    if (tabLow) tabLow.className = tab === 'LOW' ? activeClass : defaultClass;
    if (tabOut) tabOut.className = tab === 'OUT' ? activeClass : defaultClass;

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
// 5. PRODUCT ADD/EDIT MODAL (SINGLE & MULTI-VARIANT SHOPEE STYLE)
// ==============================================================================
InventoryApp.productModalMode = 'SINGLE'; // 'SINGLE' or 'VARIANTS'
InventoryApp.modalVariants = [];
InventoryApp.modalImages = [];

function switchShopeeTab(tabName) {
    const tabs = ['general', 'attributes', 'description', 'sales', 'shipping', 'others', 'location'];
    tabs.forEach(t => {
        const btn = document.getElementById(`shopeeTabBtn_${t}`);
        const pane = document.getElementById(`shopeeTabPane_${t}`);
        if (btn) {
            if (t === tabName) {
                btn.className = 'py-3 px-4 text-xs font-bold text-[#ee4d2d] border-b-2 border-[#ee4d2d] whitespace-nowrap transition-colors flex items-center gap-1.5';
            } else {
                btn.className = 'py-3 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300 whitespace-nowrap transition-colors flex items-center gap-1.5';
            }
        }
        if (pane) {
            if (t === tabName) {
                pane.classList.remove('hidden');
                if (tabName === 'location') {
                    checkModalProductUrlDuplicate();
                }
            } else {
                pane.classList.add('hidden');
            }
        }
    });
}

// ==============================================================================
// 5.5.1 TAB 7 HELPERS: URL & WAREHOUSE LOCATION (พิกัดจัดเก็บ & คอมเมนต์ & รูปถ่าย)
// ==============================================================================

function appendLocationChip(text) {
    const textarea = document.getElementById('modalLocationNote');
    if (!textarea) return;
    const current = textarea.value.trim();
    if (current) {
        textarea.value = current + ', ' + text;
    } else {
        textarea.value = text;
    }
    textarea.focus();
}

function handleLocationImageFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        setLocationImage(dataUrl);
    };
    reader.readAsDataURL(file);
}

function applyLocationImageUrlInput() {
    const input = document.getElementById('modalLocationImgUrlInput');
    const url = (input?.value || '').trim();
    if (!url) {
        alert('กรุณากรอกหรือวางลิงก์รูปภาพ');
        return;
    }
    setLocationImage(url);
    if (input) input.value = '';
}

function setLocationImage(url) {
    const hidden = document.getElementById('modalLocationImageUrl');
    const preview = document.getElementById('modalLocationImgPreview');
    const emptyBox = document.getElementById('modalLocationImgEmpty');
    const actions = document.getElementById('modalLocationImgActions');

    if (hidden) hidden.value = url || '';
    if (url) {
        if (preview) {
            preview.src = url;
            preview.classList.remove('hidden');
        }
        if (emptyBox) emptyBox.classList.add('hidden');
        if (actions) actions.classList.remove('hidden');
    } else {
        if (preview) {
            preview.src = '';
            preview.classList.add('hidden');
        }
        if (emptyBox) emptyBox.classList.remove('hidden');
        if (actions) actions.classList.add('hidden');
    }
}

function clearLocationImage() {
    setLocationImage('');
    const fileInput = document.getElementById('modalLocationImgFileInput');
    if (fileInput) fileInput.value = '';
}

function openCurrentLocationImgLarge() {
    const hidden = document.getElementById('modalLocationImageUrl');
    const url = hidden?.value;
    if (url) {
        openImagePreview(url, 'รูปถ่ายพิกัดจุดเก็บสินค้าในคลัง');
    }
}

async function pasteToModalProductUrl() {
    try {
        let text = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
            try { text = await navigator.clipboard.readText(); } catch(e){}
        }
        if (!text) {
            text = prompt('วาง URL สินค้าที่นี่:') || '';
        }
        text = (text || '').trim();
        if (text) {
            const input = document.getElementById('modalProductUrl');
            if (input) {
                input.value = text;
                checkModalProductUrlDuplicate();
            }
        }
    } catch (e) {
        const input = document.getElementById('modalProductUrl');
        if (input) input.focus();
    }
}

function openModalProductUrl() {
    const input = document.getElementById('modalProductUrl');
    const url = (input?.value || '').trim();
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    } else {
        alert('ยังไม่มี URL สินค้าให้เปิด');
    }
}

function checkModalProductUrlDuplicate() {
    const input = document.getElementById('modalProductUrl');
    const statusBox = document.getElementById('modalProductUrlStatus');
    if (!input || !statusBox) return;

    const url = (input.value || '').trim();
    if (!url) {
        statusBox.innerHTML = '';
        return;
    }

    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    const rawItemId = (url.match(/-i\.(\d+)\.(\d+)/)?.[2] || url.match(/\/product\/(\d+)\/(\d+)/)?.[2] || url.match(/[?&]item_?id=(\d+)/)?.[1]) || '';

    // Check duplicate in InventoryApp.products
    let match = null;
    if (Array.isArray(InventoryApp.products)) {
        match = InventoryApp.products.find(p => {
            const pKey = typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : (p.parent_sku || p.sku);
            const pUrl = (p.product_url || localStorage.getItem('sgyver_product_url_' + pKey) || localStorage.getItem('sgyver_product_url_' + p.sku) || localStorage.getItem('sgyver_shopee_url_' + pKey) || '').split('?')[0].replace(/\/+$/, '');
            const pItemId = p.item_id || localStorage.getItem('sgyver_item_id_' + pKey) || localStorage.getItem('sgyver_shopee_itemid_' + pKey) || '';

            if (rawItemId && pItemId && String(rawItemId) === String(pItemId)) return true;
            if (cleanUrl && pUrl && cleanUrl === pUrl) return true;
            return false;
        });
    }

    if (match) {
        const mKey = typeof getParentGroupKey === 'function' ? getParentGroupKey(match) : (match.parent_sku || match.sku);
        statusBox.innerHTML = `
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <i class="bi bi-exclamation-triangle-fill text-amber-600 text-sm shrink-0"></i>
                    <div>
                        <span class="font-bold">⚠️ เคยลงสินค้านี้ในคลังแล้ว!</span>
                        <span class="text-[11px] block text-amber-700">ตรงกับสินค้า SKU: <b>${escapeHtml(mKey)}</b> (${escapeHtml(match.name || '')})</span>
                    </div>
                </div>
                <button type="button" onclick="editProductModal(${match.id})" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10.5px] font-bold shrink-0 cursor-pointer">
                    เปิดดูสินค้าเดิม
                </button>
            </div>
        `;
    } else {
        statusBox.innerHTML = `
            <div class="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2 text-[11px]">
                <i class="bi bi-check-circle-fill text-emerald-600"></i>
                <span>✅ ลิงก์นี้ยังไม่เคยถูกบันทึกลงคลัง (สามารถบันทึกเป็นสินค้าใหม่ได้ทันที)</span>
            </div>
        `;
    }
}

function saveCustomProductsToLocalCache() {
    try {
        if (Array.isArray(InventoryApp.products)) {
            localStorage.setItem('sgyver_custom_products', JSON.stringify(InventoryApp.products));
        }
    } catch (e) {
        console.warn('saveCustomProductsToLocalCache warning:', e);
    }
}

// ==============================================================================
// 5.6 DISTRIBUTOR & CARE PRESET MANAGEMENT (คำที่ใช้บ่อย: ผู้จัดจำหน่าย และ คำแนะนำดูแลรักษา)
// ==============================================================================

const DEFAULT_DISTRIBUTOR_PRESETS = [
    { id: 'dist_1', name: 'บริษัท ซิกเนเจอร์ แอพพาเรล จำกัด', shortName: 'บ.ซิกเนเจอร์ แอพพาเรล' },
    { id: 'dist_2', name: 'Paperstudio (เปเปอร์สตูดิโอ)', shortName: 'Paperstudio' },
    { id: 'dist_3', name: 'S-Gyver Official Store', shortName: 'S-Gyver Official' },
    { id: 'dist_4', name: 'สินค้านำเข้า (Imported)', shortName: 'สินค้านำเข้า' },
    { id: 'dist_5', name: 'ผลิตในประเทศไทย (Made in Thailand)', shortName: '🇹🇭 ผลิตในไทย' }
];

const DEFAULT_CARE_PRESETS = [
    { id: 'care_1', title: '🫧 ซักเครื่องทั่วไป', text: 'ซักเครื่องด้วยน้ำเย็น ห้ามใช้น้ำยาฟอกขาว รีดด้วยไฟปานกลาง' },
    { id: 'care_2', title: '🧺 ซักมือ/ถนอมผ้า', text: 'ควรซักด้วยมือ แยกซักผ้าสีเข้ม ตากในที่ร่ม รีดด้วยไฟอ่อน' },
    { id: 'care_3', title: '✨ ผ้าเลื่อม/เมทัลลิค', text: 'ผ้าเลื่อม/เมทัลลิค: ซักมือเบาๆ ห้ามขยี้แรง ห้ามแช่น้ำนาน ห้ามรีดทับลายเลื่อม' },
    { id: 'care_4', title: '🏷️ ซักแห้งเท่านั้น', text: 'ห้ามใช้น้ำยาฟอกขาว ซักแห้งเท่านั้น ห้ามอบแห้ง' },
    { id: 'care_5', title: '🛍️ ใส่ถุงซักเครื่อง', text: 'ใส่ถุงถนอมผ้าก่อนซักเครื่อง ปั่นหมาดระดับต่ำ แขวนตากในที่ร่ม' }
];

function getDistributorPresets() {
    try {
        const stored = localStorage.getItem('sgyver_distributor_presets');
        if (stored !== null) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.map((item, idx) => ({
                    id: item.id || `dist_${idx}_${Date.now()}`,
                    name: item.name || '',
                    shortName: item.shortName || item.name || ''
                }));
            }
        }
    } catch (e) {}
    return DEFAULT_DISTRIBUTOR_PRESETS.map((item, idx) => ({
        ...item,
        id: item.id || `dist_${idx}`
    }));
}

function saveDistributorPresets(presets) {
    localStorage.setItem('sgyver_distributor_presets', JSON.stringify(presets));
    renderDistributorPresetChips();
}

function getCarePresets() {
    try {
        const stored = localStorage.getItem('sgyver_care_presets');
        if (stored !== null) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.map((item, idx) => ({
                    id: item.id || `care_${idx}_${Date.now()}`,
                    title: item.title || '',
                    text: item.text || ''
                }));
            }
        }
    } catch (e) {}
    return DEFAULT_CARE_PRESETS.map((item, idx) => ({
        ...item,
        id: item.id || `care_${idx}`
    }));
}

function saveCarePresets(presets) {
    localStorage.setItem('sgyver_care_presets', JSON.stringify(presets));
    renderCarePresetChips();
}

function renderDistributorPresetChips() {
    const container = document.getElementById('distributorPresetChips');
    if (!container) return;

    const presets = getDistributorPresets();
    const chipsHtml = presets.map((p, idx) => `
        <button type="button" onclick="selectDistributorPresetById('${p.id}', ${idx})" 
            title="${escapeHtml(p.name)}"
            class="px-2 py-0.5 bg-slate-100 hover:bg-orange-50 hover:text-[#ee4d2d] hover:border-orange-300 text-slate-600 rounded-lg text-[10px] border border-slate-200 transition-colors flex items-center gap-1 truncate max-w-[170px]">
            <i class="bi bi-building text-[9px]"></i>
            <span class="truncate">${escapeHtml(p.shortName || p.name)}</span>
        </button>
    `).join('');

    container.innerHTML = `
        ${chipsHtml}
        <button type="button" onclick="openManageDistributorModal()" title="เพิ่มหรือแก้ไขรายชื่อผู้จัดจำหน่าย / ผู้ผลิต"
            class="px-2 py-0.5 bg-white hover:bg-orange-50 text-slate-500 hover:text-[#ee4d2d] rounded-lg text-[10px] border border-dashed border-slate-300 hover:border-orange-400 transition-colors flex items-center font-medium">
            + เพิ่มเอง
        </button>
    `;
}

function renderCarePresetChips() {
    const container = document.getElementById('carePresetChips');
    if (!container) return;

    const presets = getCarePresets();
    const chipsHtml = presets.map((p, idx) => {
        const isHighlight = p.title.includes('เลื่อม') || p.title.includes('เมทัลลิค');
        return `
            <button type="button" onclick="selectCarePresetById('${p.id}', ${idx})" 
                title="${escapeHtml(p.text)}"
                class="px-2 py-0.5 ${isHighlight ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 hover:border-amber-400 border-amber-200 font-semibold' : 'bg-slate-100 hover:bg-orange-50 hover:text-[#ee4d2d] hover:border-orange-300 text-slate-600 border-slate-200'} rounded-lg text-[10px] border transition-colors flex items-center gap-1">
                <span>${escapeHtml(p.title)}</span>
            </button>
        `;
    }).join('');

    container.innerHTML = `
        ${chipsHtml}
        <button type="button" onclick="openManageCarePresetModal()" title="เพิ่มหรือแก้ไขหัวข้อและคำแนะนำการดูแลรักษา"
            class="px-2 py-0.5 bg-white hover:bg-orange-50 text-slate-500 hover:text-[#ee4d2d] rounded-lg text-[10px] border border-dashed border-slate-300 hover:border-orange-400 transition-colors flex items-center font-medium">
            + เพิ่มเอง
        </button>
    `;
}

function selectDistributorPresetById(id, idx) {
    const presets = getDistributorPresets();
    let item = presets.find(p => p.id === id);
    if (!item && typeof idx === 'number' && presets[idx]) {
        item = presets[idx];
    }
    if (item && item.name) {
        setDistributorPreset(item.name);
    }
}

function selectCarePresetById(id, idx) {
    const presets = getCarePresets();
    let item = presets.find(p => p.id === id);
    if (!item && typeof idx === 'number' && presets[idx]) {
        item = presets[idx];
    }
    if (item && item.text) {
        setCarePreset(item.text);
    }
}

function setDistributorPreset(text) {
    if (!text) return;
    const input = document.getElementById('modalDistributor');
    if (input) {
        input.value = text.trim();
        input.focus();
    }
}

function setCarePreset(text, append = false) {
    if (!text) return;
    const textarea = document.getElementById('modalCare');
    if (!textarea) return;
    const clean = text.trim();
    if (!clean) return;
    if (append && textarea.value.trim()) {
        textarea.value = textarea.value.trim() + '\n' + clean;
    } else {
        textarea.value = clean;
    }
    textarea.focus();
}

// ----------------------------------------------------
// Manage Distributor Modal
// ----------------------------------------------------
let editingDistributorId = null;

function openManageDistributorModal() {
    const modal = document.getElementById('manageDistributorModal');
    if (!modal) return;
    resetDistributorModalForm();
    renderManageDistributorList();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeManageDistributorModal() {
    const modal = document.getElementById('manageDistributorModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    resetDistributorModalForm();
}

function resetDistributorModalForm() {
    editingDistributorId = null;
    const inputName = document.getElementById('inputDistributorPresetName');
    const inputShort = document.getElementById('inputDistributorPresetShort');
    const btnSubmit = document.getElementById('btnSubmitDistributorPreset');
    const formTitle = document.getElementById('distributorPresetFormTitle');

    if (inputName) inputName.value = '';
    if (inputShort) inputShort.value = '';
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-plus-lg"></i> <span>บันทึกชื่อผู้จัดจำหน่าย</span>';
    if (formTitle) formTitle.textContent = 'เพิ่มผู้จัดจำหน่าย/ผู้ผลิตใหม่:';
}

function saveDistributorPresetItem() {
    const inputName = document.getElementById('inputDistributorPresetName');
    const inputShort = document.getElementById('inputDistributorPresetShort');
    const name = (inputName?.value || '').trim();
    if (!name) {
        alert('กรุณากรอกชื่อผู้จัดจำหน่าย / ผู้ผลิต');
        inputName?.focus();
        return;
    }
    const shortName = (inputShort?.value || '').trim() || name.slice(0, 15);

    const presets = getDistributorPresets();
    if (editingDistributorId) {
        const item = presets.find(p => p.id === editingDistributorId);
        if (item) {
            item.name = name;
            item.shortName = shortName;
        }
    } else {
        presets.push({
            id: 'dist_' + Date.now(),
            name,
            shortName
        });
    }

    saveDistributorPresets(presets);
    resetDistributorModalForm();
    renderManageDistributorList();
}

function editDistributorPresetItem(id, idx) {
    const presets = getDistributorPresets();
    let item = null;
    if (id && id !== 'undefined') {
        item = presets.find(p => p.id === id);
    }
    if (!item && typeof idx === 'number' && idx >= 0 && idx < presets.length) {
        item = presets[idx];
    }
    if (!item && id) {
        item = presets.find(p => p.name === id || p.shortName === id);
    }
    if (!item) return;

    editingDistributorId = item.id;
    const inputName = document.getElementById('inputDistributorPresetName');
    const inputShort = document.getElementById('inputDistributorPresetShort');
    const btnSubmit = document.getElementById('btnSubmitDistributorPreset');
    const formTitle = document.getElementById('distributorPresetFormTitle');

    if (inputName) inputName.value = item.name || '';
    if (inputShort) inputShort.value = item.shortName || item.name || '';
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-check-lg"></i> <span>บันทึกการแก้ไข</span>';
    if (formTitle) formTitle.textContent = 'แก้ไขชื่อผู้จัดจำหน่าย:';
    inputName?.focus();
}

function deleteDistributorPresetItem(id, idx) {
    let presets = getDistributorPresets();
    let targetIndex = -1;
    if (id && id !== 'undefined') {
        targetIndex = presets.findIndex(p => p.id === id);
    }
    if (targetIndex === -1 && typeof idx === 'number' && idx >= 0 && idx < presets.length) {
        targetIndex = idx;
    }
    if (targetIndex === -1 && id) {
        targetIndex = presets.findIndex(p => p.name === id || p.shortName === id);
    }
    if (targetIndex === -1) return;

    presets.splice(targetIndex, 1);
    saveDistributorPresets(presets);
    renderManageDistributorList();
    resetDistributorModalForm();
}

function renderManageDistributorList() {
    const listEl = document.getElementById('manageDistributorList');
    const countEl = document.getElementById('manageDistributorCount');
    if (!listEl) return;

    const presets = getDistributorPresets();
    if (countEl) countEl.textContent = `${presets.length} รายการ`;

    if (presets.length === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">ยังไม่มีรายการผู้จัดจำหน่าย</div>`;
        return;
    }

    listEl.innerHTML = presets.map((p, idx) => `
        <div class="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-all border border-slate-200/80 group">
            <div class="min-w-0 flex-1 pr-2">
                <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="text-[9px] bg-orange-100 text-[#ee4d2d] font-bold px-1.5 py-0.2 rounded border border-orange-200 shrink-0">
                        ปุ่ม: ${escapeHtml(p.shortName || p.name)}
                    </span>
                </div>
                <div class="text-xs font-semibold text-slate-800 truncate" title="${escapeHtml(p.name)}">
                    ${escapeHtml(p.name)}
                </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="editDistributorPresetItem('${p.id}', ${idx})" title="แก้ไข"
                    class="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white flex items-center justify-center transition-colors shadow-2xs">
                    <i class="bi bi-pencil"></i>
                </button>
                <button type="button" onclick="deleteDistributorPresetItem('${p.id}', ${idx})" title="ลบ"
                    class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white flex items-center justify-center transition-colors shadow-2xs">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ----------------------------------------------------
// Manage Care Preset Modal
// ----------------------------------------------------
let editingCarePresetId = null;

function openManageCarePresetModal() {
    const modal = document.getElementById('manageCarePresetModal');
    if (!modal) return;
    resetCareModalForm();
    renderManageCareList();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeManageCarePresetModal() {
    const modal = document.getElementById('manageCarePresetModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    resetCareModalForm();
}

function resetCareModalForm() {
    editingCarePresetId = null;
    const inputTitle = document.getElementById('inputCarePresetTitle');
    const inputText = document.getElementById('inputCarePresetText');
    const btnSubmit = document.getElementById('btnSubmitCarePreset');
    const formTitle = document.getElementById('carePresetFormTitle');

    if (inputTitle) inputTitle.value = '';
    if (inputText) inputText.value = '';
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-plus-lg"></i> <span>บันทึกคำแนะนำการดูแล</span>';
    if (formTitle) formTitle.textContent = 'เพิ่มคำแนะนำการดูแลรักษาใหม่:';
}

function saveCarePresetItem() {
    const inputTitle = document.getElementById('inputCarePresetTitle');
    const inputText = document.getElementById('inputCarePresetText');
    const title = (inputTitle?.value || '').trim();
    const text = (inputText?.value || '').trim();

    if (!title) {
        alert('กรุณากรอกชื่อหัวข้อที่จะแสดงบนปุ่มด้านหน้า');
        inputTitle?.focus();
        return;
    }
    if (!text) {
        alert('กรุณากรอกรายละเอียดคำแนะนำการดูแลรักษา');
        inputText?.focus();
        return;
    }

    const presets = getCarePresets();
    if (editingCarePresetId) {
        const item = presets.find(p => p.id === editingCarePresetId);
        if (item) {
            item.title = title;
            item.text = text;
        }
    } else {
        presets.push({
            id: 'care_' + Date.now(),
            title,
            text
        });
    }

    saveCarePresets(presets);
    resetCareModalForm();
    renderManageCareList();
}

function editCarePresetItem(id, idx) {
    const presets = getCarePresets();
    let item = null;
    if (id && id !== 'undefined') {
        item = presets.find(p => p.id === id);
    }
    if (!item && typeof idx === 'number' && idx >= 0 && idx < presets.length) {
        item = presets[idx];
    }
    if (!item && id) {
        item = presets.find(p => p.title === id);
    }
    if (!item) return;

    editingCarePresetId = item.id;
    const inputTitle = document.getElementById('inputCarePresetTitle');
    const inputText = document.getElementById('inputCarePresetText');
    const btnSubmit = document.getElementById('btnSubmitCarePreset');
    const formTitle = document.getElementById('carePresetFormTitle');

    if (inputTitle) inputTitle.value = item.title || '';
    if (inputText) inputText.value = item.text || '';
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-check-lg"></i> <span>บันทึกการแก้ไข</span>';
    if (formTitle) formTitle.textContent = 'แก้ไขคำแนะนำการดูแลรักษา:';
    inputTitle?.focus();
}

function deleteCarePresetItem(id, idx) {
    let presets = getCarePresets();
    let targetIndex = -1;
    if (id && id !== 'undefined') {
        targetIndex = presets.findIndex(p => p.id === id);
    }
    if (targetIndex === -1 && typeof idx === 'number' && idx >= 0 && idx < presets.length) {
        targetIndex = idx;
    }
    if (targetIndex === -1 && id) {
        targetIndex = presets.findIndex(p => p.title === id);
    }
    if (targetIndex === -1) return;

    presets.splice(targetIndex, 1);
    saveCarePresets(presets);
    renderManageCareList();
    resetCareModalForm();
}

function renderManageCareList() {
    const listEl = document.getElementById('manageCareList');
    const countEl = document.getElementById('manageCareCount');
    if (!listEl) return;

    const presets = getCarePresets();
    if (countEl) countEl.textContent = `${presets.length} รายการ`;

    if (presets.length === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">ยังไม่มีรายการคำแนะนำการดูแล</div>`;
        return;
    }

    listEl.innerHTML = presets.map((p, idx) => `
        <div class="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-all border border-slate-200/80 space-y-1.5 group">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px] font-semibold">
                        ${escapeHtml(p.title)}
                    </span>
                </span>
                <div class="flex items-center gap-1">
                    <button type="button" onclick="editCarePresetItem('${p.id}', ${idx})" title="แก้ไข"
                        class="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white flex items-center justify-center transition-colors shadow-2xs">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" onclick="deleteCarePresetItem('${p.id}', ${idx})" title="ลบ"
                        class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white flex items-center justify-center transition-colors shadow-2xs">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <p class="text-[11px] text-slate-600 line-clamp-2 leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-100 font-mono">
                ${escapeHtml(p.text)}
            </p>
        </div>
    `).join('');
}

function switchProductModalMode(mode) {
    InventoryApp.productModalMode = mode;
    const btnSingle = document.getElementById('btnModeSingle');
    const btnVariants = document.getElementById('btnModeVariants');
    const secSingle = document.getElementById('sectionSingleProduct');
    const secVariants = document.getElementById('sectionVariantsProduct');
    const labelSku = document.getElementById('labelModalSku');
    const hintSku = document.getElementById('hintModalSku');
    const inputSku = document.getElementById('modalSku');

    if (mode === 'SINGLE') {
        if (btnSingle) {
            btnSingle.className = 'py-1.5 px-3 text-xs font-semibold rounded-lg bg-white text-[#ee4d2d] shadow-xs transition-all flex items-center gap-1.5';
        }
        if (btnVariants) {
            btnVariants.className = 'py-1.5 px-3 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5';
        }
        if (secSingle) secSingle.classList.remove('hidden');
        if (secVariants) secVariants.classList.add('hidden');
        if (labelSku) labelSku.innerHTML = '<span class="text-rose-500 font-bold">*</span> รหัส SKU / บาร์โค้ด';
        if (hintSku) hintSku.classList.add('hidden');
        if (inputSku) inputSku.placeholder = 'เช่น TSH-WHT-M หรือ HNK003';
        const saveBtn = document.getElementById('btnSaveModalProd');
        if (saveBtn) saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
    } else {
        if (btnSingle) {
            btnSingle.className = 'py-1.5 px-3 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5';
        }
        if (btnVariants) {
            btnVariants.className = 'py-1.5 px-3 text-xs font-semibold rounded-lg bg-white text-[#ee4d2d] shadow-xs transition-all flex items-center gap-1.5';
        }
        if (secSingle) secSingle.classList.add('hidden');
        if (secVariants) secVariants.classList.remove('hidden');
        if (labelSku) labelSku.innerHTML = '<span class="text-rose-500 font-bold">*</span> รหัสสินค้าหลัก (Parent SKU)';
        if (hintSku) hintSku.classList.remove('hidden');
        if (inputSku) inputSku.placeholder = 'เช่น PNT006 หรือ TSH001';

        // If no variants yet, seed with 2 starter rows based on parent SKU ONLY when creating a new product
        if ((!InventoryApp.modalVariants || InventoryApp.modalVariants.length === 0) && !InventoryApp.editingId) {
            const pSku = (inputSku?.value || '').trim().toUpperCase() || 'PNT006';
            const curPriceVal = document.getElementById('modalPrice')?.value;
            const curPrice = curPriceVal !== '' ? parseFloat(curPriceVal) : 290;
            const curRack = (document.getElementById('modalLocation')?.value || 'A-01').trim().toUpperCase();
            InventoryApp.modalVariants = [
                { variant: 'เงิน', sku: `${pSku}-01`, price: curPrice, stock_quantity: 5, min_stock_alert: 5, warehouse_location: curRack, image_url: null },
                { variant: 'ทอง', sku: `${pSku}-02`, price: curPrice, stock_quantity: 5, min_stock_alert: 5, warehouse_location: curRack, image_url: null }
            ];
        }
        renderModalVariantsTable();
    }
}

function handleParentSkuInputChange() {
    if (InventoryApp.productModalMode !== 'VARIANTS') return;
    const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase();
    if (!parentSku) return;

    if (InventoryApp.modalVariants && InventoryApp.modalVariants.length > 0) {
        InventoryApp.modalVariants.forEach((v, idx) => {
            const oldSku = (v.sku || '').trim().toUpperCase();
            let suffix = '';
            if (oldSku && oldSku.startsWith(parentSku + '-')) {
                suffix = oldSku.slice(parentSku.length + 1);
            } else {
                const lastDashIdx = oldSku.lastIndexOf('-');
                if (lastDashIdx !== -1) {
                    const tail = oldSku.substring(lastDashIdx + 1);
                    if (/^\d+$/.test(tail)) {
                        suffix = String(idx + 1).padStart(tail.length >= 2 ? tail.length : 2, '0');
                    } else {
                        suffix = tail;
                    }
                } else {
                    suffix = String(idx + 1).padStart(2, '0');
                }
            }
            v.sku = `${parentSku}-${suffix}`;
        });
        renderModalVariantsTable();
    }
}

// ==============================================================================
// 5.1 SKU SEQUENCE TRACKER & DUPLICATE PREVENTER
// ==============================================================================
function inspectSkuPrefix(query) {
    if (!query || typeof query !== 'string') return null;
    const clean = query.trim().toUpperCase();
    if (!clean) return null;

    // Detect base prefix candidate: e.g. "WM-PNT-PAG" from "WM-PNT-PAG-001", "PNT" from "PNT006"
    let prefixCandidate = clean;
    let separator = '-';

    const matchTrailingNum = clean.match(/^(.*?)([-_]?)(\d+)$/);
    if (matchTrailingNum && matchTrailingNum[1]) {
        prefixCandidate = matchTrailingNum[1].replace(/[-_]+$/, '');
        separator = matchTrailingNum[2] || '-';
    } else {
        prefixCandidate = clean.replace(/[-_]+$/, '');
        separator = '-';
    }

    const allItems = InventoryApp.products || [];
    const matchingSkus = new Set();
    const matchingParents = new Set();

    // Exact match item if any (check sku, parent_sku, or parentGroupKey)
    // If editing, exclude items belonging to the current editing item's parent group
    const editingItem = InventoryApp.editingId ? allItems.find(p => p.id === InventoryApp.editingId) : null;
    const editingParentKey = editingItem ? ((typeof getParentGroupKey === 'function' ? getParentGroupKey(editingItem) : editingItem.sku) || '').trim().toUpperCase() : null;

    const exactMatch = allItems.find(p => {
        if (editingParentKey) {
            const pGroup = (typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : p.sku || '').trim().toUpperCase();
            if (pGroup === editingParentKey) return false;
        }
        const sku = (p.sku || '').trim().toUpperCase();
        const pSku = (p.parent_sku || '').trim().toUpperCase();
        const pKey = (typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : '').trim().toUpperCase();

        return sku === clean || pSku === clean || pKey === clean || sku.startsWith(clean + '-');
    });

    const escaped = prefixCandidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Matches "WM-PNT-PAG-001" or "WM-PNT-PAG-001-01"
    const prefixRegex = new RegExp(`^${escaped}([-_]?)(\\d+)(?:[-_][0-9A-Z]+)?$`, 'i');

    let maxNumber = 0;
    let numDigits = 3;
    let detectedSeparator = separator || '-';

    allItems.forEach(p => {
        const sku = (p.sku || '').trim().toUpperCase();
        const pSku = (p.parent_sku || '').trim().toUpperCase();
        const pKey = (typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : sku).trim().toUpperCase();
        
        let matched = false;
        [sku, pSku, pKey].forEach(val => {
            if (!val) return;
            const m = val.match(prefixRegex);
            if (m) {
                if (val === sku) matchingSkus.add(sku);
                if (val === pKey || val === pSku) matchingParents.add(val);
                matched = true;
                if (m[1]) detectedSeparator = m[1];
                const num = parseInt(m[2], 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                    numDigits = Math.max(numDigits, m[2].length);
                }
            }
        });

        if (!matched && (sku.startsWith(prefixCandidate) || pKey.startsWith(prefixCandidate))) {
            matchingSkus.add(sku);
        }
    });

    const nextNumber = maxNumber > 0 ? maxNumber + 1 : 1;
    const nextSku = `${prefixCandidate}${detectedSeparator}${String(nextNumber).padStart(numDigits, '0')}`;

    return {
        rawQuery: clean,
        prefixCandidate,
        exactMatch,
        matchingSkus: Array.from(matchingSkus).sort(),
        matchingParents: Array.from(matchingParents).sort(),
        maxNumber,
        nextNumber,
        nextSku
    };
}

// ==============================================================================
// 5.2 SMART VARIANT APPEND / MERGE ENGINE
// ==============================================================================
function normalizeVariantTitle(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().replace(/[\s\-_#.,()[\]{}]+/g, '').trim();
}

function analyzeVariantMergeStatus(parentSku, modalVariants) {
    if (!parentSku) return null;
    const cleanParent = parentSku.trim().toUpperCase();
    const allItems = InventoryApp.products || [];

    // Find all items in inventory belonging to this Parent SKU
    const existingItems = allItems.filter(p => {
        const ps = (p.parent_sku || '').trim().toUpperCase();
        const pk = (typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : '').trim().toUpperCase();
        const s = (p.sku || '').trim().toUpperCase();
        return ps === cleanParent || pk === cleanParent || s === cleanParent || s.startsWith(cleanParent + '-');
    });

    if (existingItems.length === 0) {
        return {
            hasExisting: false,
            parentSku: cleanParent,
            existingItems: [],
            maxExistingSuffix: 0,
            newVariants: modalVariants || [],
            duplicateVariants: []
        };
    }

    // Determine highest sequence suffix in existing items (e.g. WM-PNT-PAG-001-05 -> 5)
    let maxExistingSuffix = 0;
    existingItems.forEach(item => {
        const sku = (item.sku || '').trim().toUpperCase();
        const m = sku.match(/[-_](\d+)$/);
        if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num > maxExistingSuffix) {
                maxExistingSuffix = num;
            }
        }
    });

    const existingNames = new Set(existingItems.map(i => normalizeVariantTitle(i.variant)));
    const existingSkus = new Set(existingItems.map(i => (i.sku || '').trim().toUpperCase()));

    const newVariants = [];
    const duplicateVariants = [];

    (modalVariants || []).forEach(v => {
        const norm = normalizeVariantTitle(v.variant);
        const sku = (v.sku || '').trim().toUpperCase();
        if ((norm && existingNames.has(norm)) || (sku && existingSkus.has(sku))) {
            duplicateVariants.push(v);
        } else {
            newVariants.push(v);
        }
    });

    return {
        hasExisting: true,
        parentSku: cleanParent,
        existingItems,
        maxExistingSuffix,
        newVariants,
        duplicateVariants
    };
}

function applyOnlyNewVariantsMerge(parentSku) {
    const cleanParent = (parentSku || document.getElementById('modalSku')?.value || '').trim().toUpperCase();
    if (!cleanParent) return;

    const mergeStatus = analyzeVariantMergeStatus(cleanParent, InventoryApp.modalVariants);
    if (!mergeStatus || !mergeStatus.hasExisting) {
        alert('ไม่พบข้อมูลสินค้าเดิมในระบบ');
        return;
    }

    if (mergeStatus.newVariants.length === 0) {
        alert(`ตัวเลือกทั้งหมดมีอยู่ในคลังแล้ว (${mergeStatus.existingItems.length} รายการ) ไม่มีตัวเลือกใหม่ที่ต้องเพิ่ม`);
        return;
    }

    // Assign sequential SKUs for new variants starting from maxExistingSuffix + 1
    let nextSuffix = mergeStatus.maxExistingSuffix + 1;
    mergeStatus.newVariants.forEach(v => {
        const suffix = String(nextSuffix).padStart(2, '0');
        v.sku = `${cleanParent}-${suffix}`;
        v.isMergedNew = true; // Mark as newly appended
        nextSuffix++;
    });

    // Replace modal variants with ONLY the new variants!
    InventoryApp.modalVariants = mergeStatus.newVariants;
    InventoryApp.isMergingVariants = true;
    InventoryApp.mergingParentSku = cleanParent;

    // Pre-fill existing product info if current name is generic or empty
    const existing = mergeStatus.existingItems[0];
    if (existing) {
        const nameInput = document.getElementById('modalName');
        if (nameInput && (!nameInput.value.trim() || nameInput.value.startsWith('สินค้า SP_') || nameInput.value.startsWith('สินค้า ROW_'))) {
            nameInput.value = existing.name || '';
            const charCount = document.getElementById('modalNameCharCount');
            if (charCount) charCount.innerText = `${nameInput.value.length}/120`;
        }
        if (existing.product_type) {
            const dispCat = document.getElementById('displayModalCategory');
            if (dispCat) dispCat.textContent = existing.product_type;
            const modalCat = document.getElementById('modalCategory');
            if (modalCat) modalCat.value = existing.product_type;
        }
    }

    // Update SKU input UI
    const input = document.getElementById('modalSku');
    if (input) {
        input.value = cleanParent;
        input.classList.remove('border-rose-400', 'bg-rose-50/20');
        input.classList.add('border-emerald-400');
    }
    const badge = document.getElementById('skuCheckStatusBadge');
    if (badge) {
        badge.className = 'text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200';
        badge.innerHTML = `<i class="bi bi-plus-circle-fill"></i> เพิ่มเฉพาะตัวเลือกใหม่ (+${mergeStatus.newVariants.length})`;
        badge.classList.remove('hidden');
    }
    const icon = document.getElementById('modalSkuStateIcon');
    if (icon) icon.innerHTML = '<i class="bi bi-check-circle-fill text-emerald-500"></i>';

    const tracker = document.getElementById('skuTrackerPanel');
    if (tracker) {
        tracker.innerHTML = `
            <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <span class="flex items-center gap-1.5 font-bold">
                    <i class="bi bi-check-circle-fill text-emerald-600"></i> พร้อมบันทึกตัวเลือกใหม่ ${mergeStatus.newVariants.length} รายการ (ตัดรายการซ้ำเดิม ${mergeStatus.duplicateVariants.length} รายการออกแล้ว)
                </span>
                <span class="text-[11px] font-mono text-emerald-700 font-bold">
                    ${mergeStatus.newVariants[0].sku} ${mergeStatus.newVariants.length > 1 ? `... ${mergeStatus.newVariants[mergeStatus.newVariants.length - 1].sku}` : ''}
                </span>
            </div>
        `;
    }

    renderModalVariantsTable();
    updateVariantMergeBanner();
    switchShopeeModalTab('variations');
}

function updateVariantMergeBanner() {
    const banner = document.getElementById('variantMergeBannerContainer');
    if (!banner) return;

    const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase();
    if (!parentSku || InventoryApp.productModalMode !== 'VARIANTS') {
        banner.classList.add('hidden');
        return;
    }

    if (InventoryApp.isMergingVariants) {
        banner.innerHTML = `
            <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div class="flex items-center gap-2 text-emerald-900">
                    <span class="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        <i class="bi bi-check-lg"></i>
                    </span>
                    <div>
                        <span class="font-bold">โหมดเพิ่มตัวเลือกใหม่:</span>
                        <span>กำลังจะเพิ่ม <strong>${InventoryApp.modalVariants.length} ตัวเลือกใหม่</strong> เข้าสู่สินค้าหลัก <strong>${escapeHtml(parentSku)}</strong></span>
                        <span class="text-[11px] text-emerald-700 block">• ข้อมูลและสต็อกของตัวเลือกเดิมในคลังจะไม่ถูกแตะต้องหรือเขียนทับ</span>
                    </div>
                </div>
                <button type="button" onclick="cancelVariantMergeMode()"
                    class="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 bg-white border border-slate-200 rounded-lg hover:border-rose-200 transition-colors">
                    ยกเลิกโหมดนี้
                </button>
            </div>
        `;
        banner.classList.remove('hidden');
        return;
    }

    const mergeStatus = analyzeVariantMergeStatus(parentSku, InventoryApp.modalVariants);
    if (mergeStatus && mergeStatus.hasExisting && mergeStatus.newVariants.length > 0) {
        if (mergeStatus.duplicateVariants.length > 0) {
            banner.innerHTML = `
                <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div class="flex items-center gap-2 text-indigo-950">
                        <span class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            <i class="bi bi-magic"></i>
                        </span>
                        <div>
                            <span class="font-bold">พบสินค้าเดิมในคลัง:</span>
                            <span>มีตัวเลือกใหม่ <strong>${mergeStatus.newVariants.length} รายการ</strong> และตัวเลือกที่ซ้ำกับคลังเดิม <strong>${mergeStatus.duplicateVariants.length} รายการ</strong></span>
                        </div>
                    </div>
                    <button type="button" onclick="applyOnlyNewVariantsMerge('${parentSku}')"
                        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
                        <i class="bi bi-funnel-fill"></i> ตัดตัวเลือกที่ซ้ำออก เหลือเฉพาะ ${mergeStatus.newVariants.length} ตัวเลือกใหม่
                    </button>
                </div>
            `;
            banner.classList.remove('hidden');
        } else {
            banner.innerHTML = `
                <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div class="flex items-center gap-2 text-indigo-950">
                        <span class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            <i class="bi bi-node-plus-fill"></i>
                        </span>
                        <div>
                            <span class="font-bold">ตรวจพบสินค้าหลักเดิม (${escapeHtml(parentSku)}):</span>
                            <span>ทุกตัวเลือก (${mergeStatus.newVariants.length} รายการ) เป็นตัวเลือกใหม่ สามารถเพิ่มเข้าสินค้าเดิมได้ทันที</span>
                        </div>
                    </div>
                    <button type="button" onclick="applyOnlyNewVariantsMerge('${parentSku}')"
                        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
                        <i class="bi bi-check-circle-fill"></i> รันรหัส SKU ต่อท้ายและเตรียมบันทึก
                    </button>
                </div>
            `;
            banner.classList.remove('hidden');
        }
    } else {
        banner.classList.add('hidden');
    }
}

function cancelVariantMergeMode() {
    InventoryApp.isMergingVariants = false;
    InventoryApp.mergingParentSku = null;
    const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase();
    onModalSkuInput(parentSku);
    updateVariantMergeBanner();
}

function onModalNameInput(val) {
    const alertBox = document.getElementById('modalNameDuplicateAlert');
    if (alertBox) alertBox.classList.add('hidden');
}

function useExistingParentSkuInModal(parentSku) {}

function onModalSkuInput(val) {
    handleParentSkuInputChange();

    const tracker = document.getElementById('skuTrackerPanel');
    const badge = document.getElementById('skuCheckStatusBadge');
    const icon = document.getElementById('modalSkuStateIcon');
    const input = document.getElementById('modalSku');
    if (!tracker) return;

    const trimmed = (val || '').trim().toUpperCase();
    if (!trimmed || trimmed.length < 2) {
        tracker.classList.add('hidden');
        if (badge) badge.classList.add('hidden');
        if (icon) icon.innerHTML = '';
        if (input) {
            input.classList.remove('border-rose-400', 'border-emerald-400', 'bg-rose-50/20');
        }
        return;
    }

    const info = inspectSkuPrefix(trimmed);
    if (!info) return;

    tracker.classList.remove('hidden');

    if (info.exactMatch) {
        // EXACT DUPLICATE DETECTED: Check if there are new variants vs existing
        const mergeStatus = analyzeVariantMergeStatus(trimmed, InventoryApp.modalVariants);

        if (mergeStatus && mergeStatus.newVariants.length > 0) {
            // SMART APPEND CASE: Product exists, but incoming data has NEW variants!
            if (input) {
                input.classList.remove('border-rose-400', 'bg-rose-50/20');
                input.classList.add('border-indigo-400');
            }
            if (icon) icon.innerHTML = '<i class="bi bi-magic text-indigo-600"></i>';
            if (badge) {
                badge.className = 'text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200';
                badge.innerText = `พบ ${mergeStatus.newVariants.length} ตัวเลือกใหม่`;
                badge.classList.remove('hidden');
            }

            tracker.innerHTML = `
                <div class="p-3 bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-emerald-50/90 border border-indigo-200 rounded-xl space-y-2 mb-2 shadow-xs">
                    <div class="flex items-start gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-sm shadow-xs">
                            <i class="bi bi-node-plus-fill"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-xs font-bold text-indigo-950 font-kanit">พบสินค้าหลักเดิม: ${escapeHtml(info.exactMatch.name || 'ไม่มีชื่อ')}</span>
                                <span class="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded font-mono border border-indigo-200">${trimmed}</span>
                            </div>
                            <p class="text-[11px] text-slate-600 mt-0.5">
                                ในคลังมีอยู่แล้ว <strong>${mergeStatus.existingItems.length} ตัวเลือก</strong> 
                                • ตรวจพบตัวเลือกใหม่ที่ยังไม่มีในคลัง <strong class="text-emerald-700">${mergeStatus.newVariants.length} รายการ</strong>!
                            </p>
                        </div>
                    </div>

                    <!-- Chips of new variants -->
                    <div class="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                        <span class="text-emerald-800 font-semibold flex items-center gap-1">
                            <i class="bi bi-stars text-emerald-600"></i> ตัวเลือกใหม่:
                        </span>
                        ${mergeStatus.newVariants.map(v => `
                            <span class="px-2 py-0.5 bg-emerald-100/90 text-emerald-800 border border-emerald-300 rounded-md font-bold text-[10px]">
                                + ${escapeHtml(v.variant)}
                            </span>
                        `).join('')}
                        ${mergeStatus.duplicateVariants.length > 0 ? `
                            <span class="text-slate-400 text-[10px] ml-1">(มีซ้ำเดิม ${mergeStatus.duplicateVariants.length} รายการ)</span>
                        ` : ''}
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100">
                        <button type="button" onclick="applyOnlyNewVariantsMerge('${trimmed}')"
                            class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
                            <i class="bi bi-plus-circle-fill"></i> นำเข้าเฉพาะตัวเลือกใหม่ (+${mergeStatus.newVariants.length} รายการ) ไม่ลงตัวเลือกซ้ำ
                        </button>
                        <button type="button" onclick="useSuggestedSkuInModal('${info.nextSku}')"
                            class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors">
                            เปลี่ยนเป็นรหัสใหม่ (${info.nextSku})
                        </button>
                    </div>
                </div>
            `;
        } else {
            // STRICT DUPLICATE: All variants are duplicates or single mode
            if (input) {
                input.classList.add('border-rose-400', 'bg-rose-50/20');
                input.classList.remove('border-emerald-400', 'border-indigo-400');
            }
            if (icon) icon.innerHTML = '<i class="bi bi-exclamation-circle-fill text-rose-500"></i>';
            if (badge) {
                badge.className = 'text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200';
                badge.innerText = 'รหัสนี้มีในคลังแล้ว';
                badge.classList.remove('hidden');
            }

            tracker.innerHTML = `
                <div class="flex items-start gap-2 text-rose-700 bg-rose-50/70 p-2.5 rounded-xl border border-rose-200 mb-2">
                    <i class="bi bi-exclamation-triangle-fill text-rose-500 text-sm mt-0.5"></i>
                    <div class="flex-1">
                        <p class="font-bold">รหัส "${trimmed}" มีอยู่ในคลังแล้ว!</p>
                        <p class="text-[11px] text-rose-600 mt-0.5">
                            สินค้าเดิม: <strong>${escapeHtml(info.exactMatch.name || 'ไม่มีชื่อ')}</strong>
                            ${info.exactMatch.variant ? `(${info.exactMatch.variant})` : ''} 
                            • สต็อก: ${info.exactMatch.stock_quantity ?? 0} ชิ้น
                        </p>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-1">
                    <span class="text-slate-600 text-[11px]">✨ แนะนำให้ใช้รหัสใหม่ถัดไป:</span>
                    <button type="button" onclick="useSuggestedSkuInModal('${info.nextSku}')"
                        class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-mono font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95">
                        <i class="bi bi-arrow-right-circle"></i> ใช้รหัส ${info.nextSku}
                    </button>
                </div>
            `;
        }
    } else {
        // AVAILABLE SKU
        if (input) {
            input.classList.remove('border-rose-400', 'bg-rose-50/20');
            input.classList.add('border-emerald-400');
        }
        if (icon) icon.innerHTML = '<i class="bi bi-check-circle-fill text-emerald-500"></i>';
        if (badge) {
            badge.className = 'text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200';
            badge.innerText = 'รหัสนี้ว่าง ใช้ได้';
            badge.classList.remove('hidden');
        }

        const totalInGroup = info.matchingSkus.length;
        let recentPills = '';
        if (info.matchingSkus.length > 0) {
            const displaySkus = info.matchingSkus.slice(-8);
            recentPills = `
                <div class="mt-2 pt-2 border-t border-slate-200/70">
                    <span class="text-[10px] text-slate-500 block mb-1">รหัสในหมวด "${info.prefixCandidate}" ที่ใช้อยู่ (${totalInGroup} รายการ):</span>
                    <div class="flex flex-wrap gap-1">
                        ${displaySkus.map(s => `<span class="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 font-mono text-[10px] rounded">${s}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        tracker.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <span class="font-bold text-slate-800">หมวด "${info.prefixCandidate}"</span>
                    <span class="text-slate-500 ml-1.5">• มีแล้ว ${totalInGroup} รายการ ${info.maxNumber > 0 ? `(ล่าสุดเบอร์ ${info.maxNumber})` : '(เป็นหมวดใหม่)'}</span>
                </div>
                ${info.nextSku !== trimmed ? `
                    <button type="button" onclick="useSuggestedSkuInModal('${info.nextSku}')"
                        class="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg font-mono font-bold text-[11px] shadow-xs flex items-center gap-1">
                        ✨ รหัสถัดไป: ${info.nextSku}
                    </button>
                ` : '<span class="text-emerald-600 font-bold text-[11px]">✨ รหัสนี้เป็นลำดับถัดไปที่ถูกต้อง</span>'}
            </div>
            ${recentPills}
        `;
    }
}

function useSuggestedSkuInModal(sku) {
    const input = document.getElementById('modalSku');
    if (!input) return;
    input.value = sku;
    onModalSkuInput(sku);
    handleParentSkuInputChange();
}

// Standalone SKU Checker Modal
function openSkuCheckerModal(prefill) {
    const modal = document.getElementById('skuCheckerModal');
    const input = document.getElementById('skuCheckerInput');
    const popularContainer = document.getElementById('skuCheckerPopularPrefixes');

    // Extract top prefixes from inventory
    if (popularContainer && InventoryApp.products) {
        const prefixCounts = {};
        InventoryApp.products.forEach(p => {
            const sku = (p.sku || '').toUpperCase();
            const m = sku.match(/^([A-Z0-9ก-๙]{2,})/i);
            if (m) {
                const pfx = m[1].slice(0, 4);
                prefixCounts[pfx] = (prefixCounts[pfx] || 0) + 1;
            }
        });

        const sortedPrefixes = Object.entries(prefixCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7)
            .map(([pfx]) => pfx);

        popularContainer.innerHTML = `
            <span class="text-slate-500">หมวดที่พบบ่อย:</span>
            ${sortedPrefixes.map(pfx => `
                <button type="button" onclick="document.getElementById('skuCheckerInput').value='${pfx}'; onSkuCheckerSearch('${pfx}');"
                    class="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-slate-700 font-mono font-medium transition-colors">
                    ${pfx}
                </button>
            `).join('')}
        `;
    }

    if (modal) modal.classList.remove('hidden');
    if (input) {
        input.value = prefill || 'BAG';
        onSkuCheckerSearch(input.value);
        input.focus();
        input.select();
    }
}

function closeSkuCheckerModal() {
    const modal = document.getElementById('skuCheckerModal');
    if (modal) modal.classList.add('hidden');
}

function onSkuCheckerSearch(query) {
    const res = document.getElementById('skuCheckerResults');
    if (!res) return;

    const trimmed = (query || '').trim().toUpperCase();
    if (!trimmed) {
        res.innerHTML = `
            <div class="py-10 text-center text-slate-400 text-xs">
                พิมพ์คำนำหน้า SKU เช่น <strong>BAG</strong>, <strong>TSH</strong>, <strong>SET</strong> เพื่อตรวจสอบลำดับ
            </div>
        `;
        return;
    }

    const info = inspectSkuPrefix(trimmed);
    if (!info) return;

    res.innerHTML = `
        <div class="p-3.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100 rounded-xl">
            <div class="flex items-center justify-between mb-2">
                <div>
                    <span class="text-xs text-indigo-900 font-bold">หมวดหมู่: <span class="font-mono text-sm">${info.prefixCandidate}</span></span>
                    <span class="text-[11px] text-indigo-600 ml-2">มีสินค้าแล้ว ${info.matchingSkus.length} รายการ</span>
                </div>
                <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200">
                    เบอร์ล่าสุด: ${info.maxNumber > 0 ? info.maxNumber : 'ยังไม่มี'}
                </span>
            </div>

            <div class="flex items-center justify-between bg-white p-2.5 rounded-lg border border-indigo-200/70 shadow-sm mt-2">
                <div>
                    <span class="text-[11px] text-slate-500 block">✨ แนะนำรหัสใหม่ถัดไป (ไม่ซ้ำ):</span>
                    <span class="font-mono font-black text-base text-emerald-700">${info.nextSku}</span>
                </div>
                <button type="button" onclick="closeSkuCheckerModal(); openProductModal(); useSuggestedSkuInModal('${info.nextSku}');"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95">
                    <i class="bi bi-plus-circle-fill"></i> ใช้รหัสนี้เพิ่มสินค้า
                </button>
            </div>
        </div>

        <div class="border border-slate-200 rounded-xl overflow-hidden mt-3">
            <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>รายการรหัสในหมวดนี้ (${info.matchingSkus.length})</span>
                <span class="text-[10px] text-slate-400">เรียงตามตัวเลข</span>
            </div>
            <div class="max-h-[180px] overflow-y-auto divide-y divide-slate-100 text-xs">
                ${info.matchingSkus.length === 0 ? `
                    <div class="p-4 text-center text-slate-400 text-xs">ยังไม่มีรหัสขึ้นต้นด้วย "${info.prefixCandidate}" สามารถเริ่มใช้เบอร์ 1 ได้เลย</div>
                ` : info.matchingSkus.map(s => {
                    const item = (InventoryApp.products || []).find(p => (p.sku || '').toUpperCase() === s);
                    return `
                        <div class="px-3 py-2 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                            <div class="flex items-center gap-2">
                                <span class="font-mono font-bold text-slate-900">${s}</span>
                                <span class="text-slate-500 truncate max-w-[200px] text-[11px]">${item ? escapeHtml(item.name || '') : ''}</span>
                            </div>
                            <span class="font-mono text-[11px] text-slate-400">สต็อก: ${item ? (item.stock_quantity ?? 0) : 0}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function addModalVariantRow(customData) {
    const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase() || 'ITEM';
    const nextIdx = (InventoryApp.modalVariants ? InventoryApp.modalVariants.length : 0) + 1;
    const suffix = String(nextIdx).padStart(2, '0');
    
    const curPriceVal = document.getElementById('batchVarPrice')?.value || document.getElementById('modalPrice')?.value;
    const curPrice = curPriceVal !== '' && curPriceVal !== undefined ? parseFloat(curPriceVal) : 290;
    const curStockVal = document.getElementById('batchVarStock')?.value;
    const curStock = curStockVal !== '' && curStockVal !== undefined ? parseInt(curStockVal, 10) : 0;
    const curRack = (document.getElementById('batchVarRack')?.value || document.getElementById('modalLocation')?.value || 'A-01').trim().toUpperCase();

    const newRow = customData || {
        variant: `ตัวเลือกที่ ${nextIdx}`,
        sku: `${parentSku}-${suffix}`,
        price: curPrice,
        stock_quantity: curStock,
        min_stock_alert: 5,
        warehouse_location: curRack,
        image_url: null
    };

    if (!InventoryApp.modalVariants) InventoryApp.modalVariants = [];
    InventoryApp.modalVariants.push(newRow);
    renderModalVariantsTable();
}

function removeModalVariantRow(index) {
    if (!InventoryApp.modalVariants) return;
    InventoryApp.modalVariants.splice(index, 1);
    if (InventoryApp.modalVariants.length === 0) {
        addModalVariantRow();
    } else {
        renderModalVariantsTable();
    }
}

function updateModalVariantField(index, field, value) {
    if (!InventoryApp.modalVariants || !InventoryApp.modalVariants[index]) return;
    InventoryApp.modalVariants[index][field] = value;
    
    // Update summary badge if stock changed
    if (field === 'stock_quantity') {
        const badge = document.getElementById('variantSummaryBadge');
        if (badge) {
            let totalStock = 0;
            InventoryApp.modalVariants.forEach(v => totalStock += parseInt(v.stock_quantity ?? 0, 10));
            badge.innerText = `${InventoryApp.modalVariants.length} ตัวเลือก (สต็อกรวม ${totalStock.toLocaleString()} ชิ้น)`;
        }
    }

    if (field === 'variant') {
        updateVariantMergeBanner();
        const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase();
        if (parentSku) onModalSkuInput(parentSku);
    }
}

function renderModalVariantsTable() {
    const tbody = document.getElementById('modalVariantsTableBody');
    const badge = document.getElementById('variantSummaryBadge');
    const chipsContainer = document.getElementById('shopeeOptionsChipsContainer');
    if (!tbody) return;

    if (!InventoryApp.modalVariants || InventoryApp.modalVariants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-slate-400 text-xs">
                    ยังไม่มีตัวเลือกสินค้า กดปุ่ม <strong>"+ เพิ่มตัวเลือก"</strong> หรือเลือกเทมเพลตด่วนด้านบนเพื่อเริ่มสร้าง
                </td>
            </tr>
        `;
        if (badge) badge.innerText = '0 ตัวเลือก';
        if (chipsContainer) chipsContainer.innerHTML = '<span class="text-xs text-slate-400 py-1">ยังไม่มีตัวเลือก</span>';
        const saveBtn = document.getElementById('btnSaveModalProd');
        if (saveBtn) saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
        return;
    }

    // Render Option Chips (ตัวเลือกสินค้า 1)
    if (chipsContainer) {
        chipsContainer.innerHTML = InventoryApp.modalVariants.map((v, idx) => `
            <div class="flex items-center justify-between p-2 rounded-xl border ${v.isMergedNew ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white'} hover:border-orange-300 transition-colors shadow-2xs">
                <div class="flex items-center gap-2 overflow-hidden flex-1">
                    <div onclick="openVariantImagePicker(${idx})" class="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0 cursor-pointer flex items-center justify-center hover:border-[#ee4d2d] transition-colors" title="คลิกเปลี่ยนรูปตัวเลือกนี้">
                        ${v.image_url ? `<img src="${escapeHtml(v.image_url)}" class="w-full h-full object-cover">` : `<i class="bi bi-camera text-slate-400 text-xs"></i>`}
                    </div>
                    <div class="flex items-center gap-1.5 flex-1 min-w-0">
                        <input type="text" value="${escapeHtml(v.variant || '')}" 
                            onchange="updateModalVariantField(${idx}, 'variant', this.value)"
                            placeholder="ชื่อตัวเลือก"
                            class="w-full text-xs font-semibold text-slate-800 outline-none border-b border-transparent focus:border-[#ee4d2d] bg-transparent">
                        ${v.isMergedNew ? `
                            <span class="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 shrink-0">
                                🆕 ใหม่
                            </span>
                        ` : ''}
                    </div>
                </div>
                <button type="button" onclick="removeModalVariantRow(${idx})" class="text-slate-400 hover:text-rose-600 p-1 transition-colors ml-1" title="ลบตัวเลือกนี้">
                    <i class="bi bi-trash text-xs"></i>
                </button>
            </div>
        `).join('');
    }

    let totalStock = 0;
    tbody.innerHTML = InventoryApp.modalVariants.map((v, idx) => {
        const qty = parseInt(v.stock_quantity ?? 0, 10);
        totalStock += qty;
        return `
            <tr class="hover:bg-slate-50/70 transition-colors ${v.isMergedNew ? 'bg-emerald-50/30' : ''}">
                <td class="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
                <td class="py-2 px-3">
                    <div class="flex items-center gap-2.5">
                        <div class="relative inline-flex items-center justify-center shrink-0">
                            ${v.image_url ? `
                                <div onclick="openVariantImagePicker(${idx})" class="w-10 h-10 rounded-lg overflow-hidden border-2 ${v.isMergedNew ? 'border-emerald-500' : 'border-[#ee4d2d]'} cursor-pointer group relative shadow-2xs bg-white shrink-0" title="คลิกเปลี่ยนรูปตัวเลือกนี้">
                                    <img src="${escapeHtml(v.image_url)}" alt="รูปตัวเลือก" class="w-full h-full object-cover">
                                    <div class="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                                        <i class="bi bi-pencil-fill"></i>
                                    </div>
                                </div>
                            ` : `
                                <button type="button" onclick="openVariantImagePicker(${idx})" title="เพิ่มรูปสำหรับตัวเลือกนี้"
                                    class="w-10 h-10 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#ee4d2d] hover:bg-orange-50/70 text-slate-400 hover:text-[#ee4d2d] flex flex-col items-center justify-center transition-all cursor-pointer shrink-0">
                                    <i class="bi bi-camera text-xs"></i>
                                    <span class="text-[8px] font-bold leading-none mt-0.5 text-slate-500">+รูป</span>
                                </button>
                            `}
                        </div>
                        <div class="flex-1 min-w-[120px]">
                            <div class="flex items-center gap-1.5">
                                <input type="text" value="${escapeHtml(v.variant || '')}" 
                                    placeholder="เช่น เงิน หรือ Size M"
                                    onchange="updateModalVariantField(${idx}, 'variant', this.value)"
                                    class="w-full px-2.5 py-1.5 text-xs font-semibold border ${v.isMergedNew ? 'border-emerald-300 bg-white' : 'border-slate-200'} rounded-lg outline-none focus:ring-1 focus:ring-[#ee4d2d]">
                                ${v.isMergedNew ? `
                                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap shadow-2xs inline-flex items-center gap-1 shrink-0">
                                        <i class="bi bi-stars text-emerald-600"></i> ใหม่
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="py-2 px-3">
                    <input type="text" value="${escapeHtml(v.sku || '')}" 
                        placeholder="เช่น PNT006-01"
                        onchange="updateModalVariantField(${idx}, 'sku', this.value.toUpperCase().trim())"
                        class="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase border ${v.isMergedNew ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900' : 'border-slate-200'} rounded-lg outline-none focus:ring-1 focus:ring-[#ee4d2d]">
                </td>
                <td class="py-2 px-2.5">
                    <div class="relative">
                        <span class="absolute left-2 top-1.5 text-xs text-slate-400 font-mono">฿</span>
                        <input type="number" step="0.01" min="0" value="${v.price !== null && v.price !== undefined ? v.price : ''}" 
                            placeholder="290.00"
                            onchange="updateModalVariantField(${idx}, 'price', this.value)"
                            class="w-full pl-5 pr-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#ee4d2d]">
                    </div>
                </td>
                <td class="py-2 px-2.5">
                    <input type="number" min="0" value="${v.stock_quantity ?? 0}" 
                        placeholder="0"
                        onchange="updateModalVariantField(${idx}, 'stock_quantity', this.value)"
                        class="w-full px-2 py-1.5 text-xs font-mono font-bold border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#ee4d2d]">
                </td>
                <td class="py-2 px-2.5">
                    <input type="text" value="${escapeHtml(v.warehouse_location || 'A-01')}" 
                        placeholder="A-01"
                        onchange="updateModalVariantField(${idx}, 'warehouse_location', this.value.toUpperCase().trim())"
                        class="w-full px-2 py-1.5 text-xs font-mono uppercase border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#ee4d2d]">
                </td>
                <td class="py-2 px-2 text-center">
                    <button type="button" onclick="removeModalVariantRow(${idx})" 
                        title="ลบตัวเลือกนี้"
                        class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-colors">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (badge) badge.innerText = `${InventoryApp.modalVariants.length} ตัวเลือก (สต็อกรวม ${totalStock.toLocaleString()} ชิ้น)`;
    const saveBtn = document.getElementById('btnSaveModalProd');
    if (saveBtn) {
        if (InventoryApp.isMergingVariants) {
            saveBtn.innerHTML = `<i class="bi bi-node-plus-fill text-sm"></i> <span>เพิ่มตัวเลือกใหม่ (${InventoryApp.modalVariants.length}) เข้าคลัง</span>`;
        } else {
            saveBtn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกสินค้าพร้อมตัวเลือกย่อย (${InventoryApp.modalVariants.length})</span>`;
        }
    }
    updateVariantMergeBanner();
}

function addShopeeOptionFromInput() {
    const input = document.getElementById('newShopeeOptionInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    
    const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase() || 'PNT006';
    const nextIdx = (InventoryApp.modalVariants ? InventoryApp.modalVariants.length : 0) + 1;
    const suffix = String(nextIdx).padStart(2, '0');
    const curPriceVal = document.getElementById('batchVarPrice')?.value || document.getElementById('modalPrice')?.value;
    const curPrice = curPriceVal !== '' && curPriceVal !== undefined ? parseFloat(curPriceVal) : 290;
    const curStockVal = document.getElementById('batchVarStock')?.value;
    const curStock = curStockVal !== '' && curStockVal !== undefined ? parseInt(curStockVal, 10) : 5;
    const curRack = (document.getElementById('batchVarRack')?.value || document.getElementById('modalLocation')?.value || 'A-01').trim().toUpperCase();

    if (!InventoryApp.modalVariants) InventoryApp.modalVariants = [];
    InventoryApp.modalVariants.push({
        variant: val,
        sku: `${parentSku}-${suffix}`,
        price: curPrice,
        stock_quantity: curStock,
        min_stock_alert: 5,
        warehouse_location: curRack,
        image_url: null
    });

    input.value = '';
    renderModalVariantsTable();
}

function applyShopeeColorPreset() {
    const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase() || 'PNT006';
    const curPriceVal = document.getElementById('batchVarPrice')?.value || document.getElementById('modalPrice')?.value;
    const curPrice = curPriceVal !== '' && curPriceVal !== undefined ? parseFloat(curPriceVal) : 700;
    const curStockVal = document.getElementById('batchVarStock')?.value;
    const curStock = curStockVal !== '' && curStockVal !== undefined ? parseInt(curStockVal, 10) : 5;
    const curRack = (document.getElementById('batchVarRack')?.value || document.getElementById('modalLocation')?.value || 'A-01').trim().toUpperCase();

    const colors = [
        { name: 'เงิน', skuSuffix: '01', price: 700, stock: 5 },
        { name: 'ทอง', skuSuffix: '02', price: 700, stock: 5 },
        { name: 'ดำ', skuSuffix: '03', price: 700, stock: 5 },
        { name: 'ผ้าผูกเอวเลื่อมเงิน', skuSuffix: '04', price: 600, stock: 2 },
        { name: 'ผ้าผูกเอวเลื่อมทอง', skuSuffix: '05', price: 600, stock: 2 },
        { name: 'ผ้าผูกเอวเลื่อมดำ', skuSuffix: '06', price: 600, stock: 2 }
    ];

    InventoryApp.modalVariants = colors.map(c => ({
        variant: c.name,
        sku: `${parentSku}-${c.skuSuffix}`,
        price: c.price || curPrice,
        stock_quantity: c.stock !== undefined ? c.stock : curStock,
        min_stock_alert: 5,
        warehouse_location: curRack,
        image_url: null
    }));

    renderModalVariantsTable();
}

function applyBatchToModalVariants() {
    const priceVal = document.getElementById('batchVarPrice')?.value;
    const stockVal = document.getElementById('batchVarStock')?.value;
    const rackVal = document.getElementById('batchVarRack')?.value;

    if (!InventoryApp.modalVariants || InventoryApp.modalVariants.length === 0) {
        alert('กรุณาเพิ่มตัวเลือกสินค้าก่อน');
        return;
    }

    InventoryApp.modalVariants.forEach(v => {
        if (priceVal !== undefined && priceVal !== '') v.price = parseFloat(priceVal);
        if (stockVal !== undefined && stockVal !== '') v.stock_quantity = parseInt(stockVal, 10);
        if (rackVal !== undefined && rackVal.trim() !== '') v.warehouse_location = rackVal.trim().toUpperCase();
    });

    renderModalVariantsTable();
}

function applyVariantPreset(preset) {
    const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase() || 'ITEM';
    const curPriceVal = document.getElementById('batchVarPrice')?.value || document.getElementById('modalPrice')?.value;
    const curPrice = curPriceVal !== '' && curPriceVal !== undefined ? parseFloat(curPriceVal) : 290;
    const curStockVal = document.getElementById('batchVarStock')?.value;
    const curStock = curStockVal !== '' && curStockVal !== undefined ? parseInt(curStockVal, 10) : 0;
    const curRack = (document.getElementById('batchVarRack')?.value || document.getElementById('modalLocation')?.value || 'A-01').trim().toUpperCase();

    if (preset === 'SIZES') {
        const sizes = ['Size S', 'Size M', 'Size L', 'Size XL'];
        InventoryApp.modalVariants = sizes.map((sz, i) => ({
            variant: sz,
            sku: `${parentSku}-${sz.replace('Size ', '').toUpperCase()}`,
            price: curPrice,
            stock_quantity: curStock,
            min_stock_alert: 5,
            warehouse_location: curRack,
            image_url: null
        }));
    } else if (preset === 'NUMBERS') {
        const nums = ['01', '02', '03', '04'];
        InventoryApp.modalVariants = nums.map(n => ({
            variant: `เบอร์ ${n}`,
            sku: `${parentSku}-${n}`,
            price: curPrice,
            stock_quantity: curStock,
            min_stock_alert: 5,
            warehouse_location: curRack,
            image_url: null
        }));
    }
    renderModalVariantsTable();
}

// ==============================================================================
// 5.2 PRODUCT CATEGORY MANAGEMENT (หมวดหมู่สินค้า)
// ==============================================================================
// ==============================================================================
// 5.2 PRODUCT CATEGORY TREE MANAGEMENT (ระบบหมวดหมู่แบบ Shopee 3 ระดับ พร้อมบาร์โค้ด & SKU)
// ==============================================================================
const DEFAULT_CATEGORY_TREE = [
    {
        name: 'เสื้อผ้าผู้หญิง',
        code: 'WM',
        children: [
            {
                name: 'กางเกง',
                code: 'PNT',
                children: [
                    { name: 'เลกกิ้ง', code: 'PAG' },
                    { name: 'กางเกงขายาว', code: 'LNG' },
                    { name: 'กางเกงยีนส์', code: 'JNS' },
                    { name: 'กางเกงสกินนี่', code: 'SKN' },
                    { name: 'กางเกงวอร์ม / ลำลอง', code: 'JOG' },
                    { name: 'อื่นๆ', code: 'OTH' }
                ]
            },
            {
                name: 'เสื้อ',
                code: 'TOP',
                children: [
                    { name: 'เสื้อยืด', code: 'TSH' },
                    { name: 'เสื้อเชิ้ต', code: 'SHT' },
                    { name: 'เสื้อสายเดี่ยว / เกาะอก', code: 'CROP' },
                    { name: 'เสื้อเบลาส์', code: 'BLS' },
                    { name: 'อื่นๆ', code: 'OTH' }
                ]
            },
            {
                name: 'กางเกงขาสั้น',
                code: 'SHT',
                children: [
                    { name: 'ขาสั้นลำลอง', code: 'CAS' },
                    { name: 'ขาสั้นยีนส์', code: 'JNS' },
                    { name: 'อื่นๆ', code: 'OTH' }
                ]
            },
            {
                name: 'กระโปรง',
                code: 'SKT',
                children: [
                    { name: 'กระโปรงสั้น', code: 'MINI' },
                    { name: 'กระโปรงยาว', code: 'MAXI' },
                    { name: 'กระโปรงยีนส์', code: 'JNS' }
                ]
            },
            {
                name: 'ผ้ายีนส์',
                code: 'DEN',
                children: [
                    { name: 'แจ็คเก็ตยีนส์', code: 'JKT' },
                    { name: 'กางเกงยีนส์', code: 'JNS' }
                ]
            },
            {
                name: 'เดรส',
                code: 'DRS',
                children: [
                    { name: 'มินิเดรส', code: 'MINI' },
                    { name: 'แม็กซี่เดรส', code: 'MAXI' },
                    { name: 'ชุดเซ็ตเดรส', code: 'SET' }
                ]
            },
            {
                name: 'ชุดเจ้าสาว / ออกงาน',
                code: 'EVN',
                children: [
                    { name: 'ชุดราตรี', code: 'GOW' },
                    { name: 'ชุดเพื่อนเจ้าสาว', code: 'BRD' }
                ]
            },
            {
                name: 'จั๊มสูท, จั๊มสูทขาสั้น, เอี๊ยม',
                code: 'JMP',
                children: [
                    { name: 'จั๊มสูทขายาว', code: 'LNG' },
                    { name: 'จั๊มสูทขาสั้น', code: 'SHT' },
                    { name: 'เอี๊ยม', code: 'OVR' }
                ]
            },
            {
                name: 'แจ็คเก็ตและเสื้อโค้ท เสื้อกั๊ก',
                code: 'JKT',
                children: [
                    { name: 'เสื้อกั๊ก', code: 'VST' },
                    { name: 'แจ็คเก็ต', code: 'JKT' },
                    { name: 'เสื้อฮู้ด', code: 'HD' }
                ]
            },
            {
                name: 'เสื้อสเวตเตอร์และคาร์ดิแกน',
                code: 'SWT',
                children: [
                    { name: 'คาร์ดิแกน', code: 'CRD' },
                    { name: 'สเวตเตอร์', code: 'SWT' }
                ]
            }
        ]
    },
    {
        name: 'เสื้อผ้าผู้ชาย',
        code: 'MEN',
        children: [
            {
                name: 'เสื้อยืด (T-Shirt)',
                code: 'TSH',
                children: [
                    { name: 'คอกลม', code: 'RND' },
                    { name: 'คอวี', code: 'VNK' },
                    { name: 'โอเวอร์ไซส์', code: 'OVS' }
                ]
            },
            {
                name: 'เสื้อโปโล (Polo)',
                code: 'POL',
                children: [
                    { name: 'โปโลแขนสั้น', code: 'SHT' },
                    { name: 'โปโลแขนยาว', code: 'LNG' }
                ]
            },
            {
                name: 'กางเกงผู้ชาย',
                code: 'PNT',
                children: [
                    { name: 'สแล็ค', code: 'SLC' },
                    { name: 'ยีนส์', code: 'JNS' },
                    { name: 'คาร์โก้', code: 'CRG' }
                ]
            }
        ]
    },
    {
        name: 'กระเป๋าและสัมภาระ',
        code: 'BAG',
        children: [
            {
                name: 'กระเป๋าแฟชั่น',
                code: 'FSH',
                children: [
                    { name: 'กระเป๋าสะพายข้าง', code: 'CSB' },
                    { name: 'กระเป๋าถือ', code: 'HND' },
                    { name: 'กระเป๋าผ้า (Tote)', code: 'TOT' }
                ]
            },
            {
                name: 'เป้สะพายหลัง',
                code: 'BCK',
                children: [
                    { name: 'เป้ใส่โน้ตบุ๊ก', code: 'LPT' },
                    { name: 'เป้แฟชั่น', code: 'FSH' }
                ]
            }
        ]
    },
    {
        name: 'รองเท้า',
        code: 'SHOE',
        children: [
            {
                name: 'รองเท้าสตรี',
                code: 'WMN',
                children: [
                    { name: 'ส้นสูง', code: 'HEL' },
                    { name: 'รองเท้าแตะ', code: 'SLP' },
                    { name: 'ผ้าใบสตรี', code: 'SNK' }
                ]
            },
            {
                name: 'รองเท้าบุรุษ',
                code: 'MEN',
                children: [
                    { name: 'รองเท้าหนัง/คัทชู', code: 'LTH' },
                    { name: 'ผ้าใบสนีกเกอร์', code: 'SNK' }
                ]
            }
        ]
    },
    {
        name: 'เครื่องประดับ & หมวก',
        code: 'ACC',
        children: [
            {
                name: 'แว่นตา & แว่นกันแดด (Eyewear)',
                code: 'EYE',
                children: [
                    { name: 'แว่นกันแดด', code: 'SUN' },
                    { name: 'แว่นสายตา/กรองแสง', code: 'OPT' },
                    { name: 'แว่นแฟชั่น', code: 'FSH' }
                ]
            },
            {
                name: 'หมวก (Headwear)',
                code: 'CAP',
                children: [
                    { name: 'หมวกแก๊ป', code: 'GAP' },
                    { name: 'หมวกบักเก็ต', code: 'BKT' },
                    { name: 'หมวกไหมพรม', code: 'BNI' }
                ]
            },
            {
                name: 'เครื่องประดับแฟชั่น',
                code: 'JWL',
                children: [
                    { name: 'สร้อยคอ', code: 'NCK' },
                    { name: 'ต่างหู', code: 'EAR' },
                    { name: 'กำไล/สร้อยข้อมือ', code: 'BRC' }
                ]
            }
        ]
    },
    {
        name: 'สินค้าทั่วไป (General)',
        code: 'GEN',
        children: [
            {
                name: 'ของใช้ทั่วไป',
                code: 'MSC',
                children: [
                    { name: 'มาตรฐาน', code: 'STD' }
                ]
            }
        ]
    }
];

function getStoredCategoryTree() {
    try {
        const raw = localStorage.getItem('sgyver_category_tree');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                let hasMigrated = false;
                // 1. Ensure 'เลกกิ้ง' has code 'PAG'
                parsed.forEach(l1 => {
                    l1.children?.forEach(l2 => {
                        l2.children?.forEach(l3 => {
                            if (l3.name === 'เลกกิ้ง' && l3.code === 'RAG') {
                                l3.code = 'PAG';
                                hasMigrated = true;
                            }
                        });
                    });
                });
                // 2. Ensure 'ACC' has 'แว่นตา & แว่นกันแดด (Eyewear)' (EYE)
                const accCat = parsed.find(l1 => l1.code === 'ACC' || (l1.name && l1.name.includes('เครื่องประดับ')));
                if (accCat && Array.isArray(accCat.children)) {
                    const hasEye = accCat.children.some(l2 => l2.code === 'EYE' || (l2.name && l2.name.includes('แว่น')));
                    if (!hasEye) {
                        accCat.children.unshift({
                            name: 'แว่นตา & แว่นกันแดด (Eyewear)',
                            code: 'EYE',
                            children: [
                                { name: 'แว่นกันแดด', code: 'SUN' },
                                { name: 'แว่นสายตา/กรองแสง', code: 'OPT' },
                                { name: 'แว่นแฟชั่น', code: 'FSH' }
                            ]
                        });
                        hasMigrated = true;
                    }
                }
                if (hasMigrated) {
                    saveStoredCategoryTree(parsed);
                }
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to parse category tree from localStorage:', e);
    }
    return DEFAULT_CATEGORY_TREE;
}

async function saveStoredCategoryTree(tree) {
    try {
        localStorage.setItem('sgyver_category_tree', JSON.stringify(tree));
        if (InventoryApp.supabaseClient) {
            const { error } = await InventoryApp.supabaseClient
                .from('product_categories')
                .upsert({
                    id: 'category_tree',
                    tree: tree,
                    updated_at: new Date().toISOString()
                });
            if (error) console.warn('Supabase product_categories sync notice:', error.message);
        }
    } catch (e) {
        console.warn('saveStoredCategoryTree error:', e);
    }
}

async function loadCategoryTreeFromSupabase() {
    if (!InventoryApp.supabaseClient) return;
    try {
        const { data, error } = await InventoryApp.supabaseClient
            .from('product_categories')
            .select('tree')
            .eq('id', 'category_tree')
            .maybeSingle();

        if (data && Array.isArray(data.tree) && data.tree.length > 0) {
            localStorage.setItem('sgyver_category_tree', JSON.stringify(data.tree));
            if (typeof populateModalCategories === 'function') {
                populateModalCategories();
            }
        } else if (!error) {
            // First time seeding to Supabase if table is empty
            const currentTree = getStoredCategoryTree();
            await InventoryApp.supabaseClient
                .from('product_categories')
                .upsert({
                    id: 'category_tree',
                    tree: currentTree,
                    updated_at: new Date().toISOString()
                });
        }
    } catch (e) {
        console.warn('loadCategoryTreeFromSupabase notice:', e);
    }
}

// Helper to construct Barcode / SKU from all selected category level codes
// e.g. Level 1: WM, Level 2: PNT, Level 3: PAG -> WM-PNT-PAG-001
function getSuggestedSkuForCategoryTree(l1, l2, l3) {
    const codes = [];
    if (l1?.code) codes.push(l1.code.trim().toUpperCase());
    if (l2?.code) codes.push(l2.code.trim().toUpperCase());
    if (l3?.code) codes.push(l3.code.trim().toUpperCase());

    const basePrefix = codes.length > 0 ? codes.join('-') : 'GEN';

    // Find highest sequence from existing products matching this prefix
    let maxSeq = 0;
    const products = InventoryApp.products || [];
    const escaped = basePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Matches "WM-PNT-PAG-001", "WM-PNT-PAG-001-01", "WM-PNT-PAG-001-BLK", etc.
    const prefixPattern = new RegExp(`^${escaped}-([0-9]+)(?:[-_][0-9A-Z]+)?$`, 'i');

    products.forEach(p => {
        const sku = (p.sku || '').trim().toUpperCase();
        const pSku = (p.parent_sku || '').trim().toUpperCase();
        const pKey = (typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : '').trim().toUpperCase();

        [sku, pSku, pKey].forEach(val => {
            if (!val) return;
            const match = val.match(prefixPattern);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxSeq) {
                    maxSeq = num;
                }
            }
        });
    });

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return {
        prefix: basePrefix,
        suggestedSku: `${basePrefix}-${nextSeq}`
    };
}

// Active selection state in modal
InventoryApp.catTreeState = {
    l1Idx: 0,
    l2Idx: 0,
    l3Idx: 0
};

function openCategoryManagerModal() {
    const modal = document.getElementById('categoryManagerModal');
    if (!modal) return;

    // Clear search
    clearCategoryTreeSearch();

    // Try to pre-select based on current category in form
    const currentCat = (document.getElementById('modalCategory')?.value || document.getElementById('displayModalCategory')?.textContent || '').trim();
    const tree = getStoredCategoryTree();

    let matched = false;
    if (currentCat) {
        for (let i = 0; i < tree.length; i++) {
            const l1 = tree[i];
            if (!l1.children) continue;
            for (let j = 0; j < l1.children.length; j++) {
                const l2 = l1.children[j];
                if (!l2.children) continue;
                for (let k = 0; k < l2.children.length; k++) {
                    const l3 = l2.children[k];
                    const fullPath = `${l1.name} > ${l2.name} > ${l3.name}`;
                    if (fullPath === currentCat || currentCat.includes(l3.name) || currentCat.includes(l2.name)) {
                        InventoryApp.catTreeState = { l1Idx: i, l2Idx: j, l3Idx: k };
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
            if (matched) break;
        }
    }

    if (!matched) {
        // Default to เสื้อผ้าผู้หญิง > กางเกง > เลกกิ้ง
        InventoryApp.catTreeState = { l1Idx: 0, l2Idx: 0, l3Idx: 0 };
    }

    renderCategoryTreeModal();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeCategoryManagerModal() {
    const modal = document.getElementById('categoryManagerModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderCategoryTreeModal() {
    const tree = getStoredCategoryTree();
    const { l1Idx, l2Idx, l3Idx } = InventoryApp.catTreeState;

    const col1 = document.getElementById('catCol1List');
    const col2 = document.getElementById('catCol2List');
    const col3 = document.getElementById('catCol3List');
    const count1 = document.getElementById('catCol1Count');
    const count2 = document.getElementById('catCol2Count');
    const count3 = document.getElementById('catCol3Count');

    // 1. Column 1 (Level 1)
    if (count1) count1.textContent = `${tree.length} รายการ`;
    if (col1) {
        col1.innerHTML = tree.map((item, idx) => {
            const isSel = idx === l1Idx;
            return `
                <div class="px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors group ${isSel ? 'text-[#ee4d2d] font-bold bg-orange-50/70' : 'text-slate-700 hover:bg-slate-50'}"
                    onclick="selectCategoryTreeL1(${idx})" title="${escapeHtml(item.name)}">
                    <div class="flex items-center gap-2 min-w-0 flex-1 mr-1.5">
                        <span class="truncate font-medium text-xs leading-normal">${escapeHtml(item.name)}</span>
                        ${item.code ? `<span class="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-normal shrink-0">[${item.code}]</span>` : ''}
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" onclick="editCategoryTreeItem(1, ${idx}, event)" title="แก้ไข"
                            class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 rounded">
                            <i class="bi bi-pencil text-[10px]"></i>
                        </button>
                        <button type="button" onclick="deleteCategoryTreeItem(1, ${idx}, event)" title="ลบ"
                            class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded">
                            <i class="bi bi-trash text-[10px]"></i>
                        </button>
                        <i class="bi bi-chevron-right text-xs ${isSel ? 'text-[#ee4d2d]' : 'text-slate-400'}"></i>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 2. Column 2 (Level 2)
    const selectedL1 = tree[l1Idx];
    const l2List = selectedL1?.children || [];
    const btnAddL2 = document.getElementById('btnAddCol2Btn');
    if (btnAddL2) btnAddL2.disabled = !selectedL1;

    if (count2) count2.textContent = selectedL1 ? `${l2List.length} รายการ` : '-';
    if (col2) {
        if (!selectedL1 || l2List.length === 0) {
            col2.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">ยังไม่มีหมวดย่อย กด "+ เพิ่มหมวดย่อย" ด้านล่าง</div>`;
        } else {
            col2.innerHTML = l2List.map((item, idx) => {
                const isSel = idx === l2Idx;
                const hasChildren = item.children && item.children.length > 0;
                return `
                    <div class="px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors group ${isSel ? 'text-[#ee4d2d] font-bold bg-orange-50/70' : 'text-slate-700 hover:bg-slate-50'}"
                        onclick="selectCategoryTreeL2(${idx})" title="${escapeHtml(item.name)}">
                        <div class="flex items-center gap-2 min-w-0 flex-1 mr-1.5">
                            <span class="truncate font-medium text-xs leading-normal">${escapeHtml(item.name)}</span>
                            ${item.code ? `<span class="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-normal shrink-0">[${item.code}]</span>` : ''}
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button type="button" onclick="editCategoryTreeItem(2, ${idx}, event)" title="แก้ไข"
                                class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 rounded">
                                <i class="bi bi-pencil text-[10px]"></i>
                            </button>
                            <button type="button" onclick="deleteCategoryTreeItem(2, ${idx}, event)" title="ลบ"
                                class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded">
                                <i class="bi bi-trash text-[10px]"></i>
                            </button>
                            ${hasChildren ? `<i class="bi bi-chevron-right text-xs ${isSel ? 'text-[#ee4d2d]' : 'text-slate-400'}"></i>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 3. Column 3 (Level 3)
    const selectedL2 = l2List[l2Idx];
    const l3List = selectedL2?.children || [];
    const btnAddL3 = document.getElementById('btnAddCol3Btn');
    if (btnAddL3) btnAddL3.disabled = !selectedL2;

    if (count3) count3.textContent = selectedL2 ? `${l3List.length} รายการ` : '-';
    if (col3) {
        if (!selectedL2 || l3List.length === 0) {
            col3.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">ยังไม่มีประเภทย่อย กด "+ เพิ่มประเภทย่อย" ด้านล่าง</div>`;
        } else {
            col3.innerHTML = l3List.map((item, idx) => {
                const isSel = idx === l3Idx;
                return `
                    <div class="px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors group ${isSel ? 'text-[#ee4d2d] font-bold bg-orange-50/70' : 'text-slate-700 hover:bg-slate-50'}"
                        onclick="selectCategoryTreeL3(${idx})" title="${escapeHtml(item.name)}">
                        <div class="flex items-center gap-2 min-w-0 flex-1 mr-1.5">
                            <span class="truncate font-medium text-xs leading-normal">${escapeHtml(item.name)}</span>
                            ${item.code ? `<span class="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-normal shrink-0">[${item.code}]</span>` : ''}
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button type="button" onclick="editCategoryTreeItem(3, ${idx}, event)" title="แก้ไข"
                                class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 rounded">
                                <i class="bi bi-pencil text-[10px]"></i>
                            </button>
                            <button type="button" onclick="deleteCategoryTreeItem(3, ${idx}, event)" title="ลบ"
                                class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded">
                                <i class="bi bi-trash text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 4. Update Summary Breadcrumb & SKU / Barcode Structure Preview
    updateCategoryTreePreviews(selectedL1, selectedL2, l3List[l3Idx]);
}

function updateCategoryTreePreviews(l1, l2, l3) {
    const p1 = document.getElementById('catTreePreviewL1');
    const p2 = document.getElementById('catTreePreviewL2');
    const p3 = document.getElementById('catTreePreviewL3');
    const breadcrumbEl = document.getElementById('catTreeSelectedBreadcrumb');
    const barcodeBadge = document.getElementById('catTreeBarcodeBadge');

    if (p1) p1.textContent = l1 ? `${l1.name} (${l1.code || '-'})` : '-';
    if (p2) p2.textContent = l2 ? `${l2.name} (${l2.code || '-'})` : '-';
    if (p3) p3.textContent = l3 ? `${l3.name} (${l3.code || '-'})` : '-';

    const pathArr = [];
    if (l1) pathArr.push(l1.name);
    if (l2) pathArr.push(l2.name);
    if (l3) pathArr.push(l3.name);

    if (breadcrumbEl) {
        breadcrumbEl.textContent = pathArr.length > 0 ? pathArr.join(' > ') : 'กรุณาเลือกหมวดหมู่';
    }

    // Construct Barcode / SKU from all selected category levels: e.g. WM-PNT-PAG-001
    const { prefix, suggestedSku } = getSuggestedSkuForCategoryTree(l1, l2, l3);

    if (barcodeBadge) {
        barcodeBadge.textContent = suggestedSku;
    }
}

function selectCategoryTreeL1(idx) {
    InventoryApp.catTreeState.l1Idx = idx;
    InventoryApp.catTreeState.l2Idx = 0;
    InventoryApp.catTreeState.l3Idx = 0;
    renderCategoryTreeModal();
}

function selectCategoryTreeL2(idx) {
    InventoryApp.catTreeState.l2Idx = idx;
    InventoryApp.catTreeState.l3Idx = 0;
    renderCategoryTreeModal();
}

function selectCategoryTreeL3(idx) {
    InventoryApp.catTreeState.l3Idx = idx;
    renderCategoryTreeModal();
}

// -------------------------------------------------------------------
// Add Item (+ เพิ่มหมวดในแต่ละส่วน)
// -------------------------------------------------------------------
function promptAddCategoryTreeItem(level) {
    const tree = getStoredCategoryTree();
    const { l1Idx, l2Idx } = InventoryApp.catTreeState;

    let targetParentName = '';
    if (level === 2) {
        if (!tree[l1Idx]) return alert('กรุณาเลือกหมวดหลักก่อน');
        targetParentName = ` ภายใต้ "${tree[l1Idx].name}"`;
    } else if (level === 3) {
        if (!tree[l1Idx]?.children?.[l2Idx]) return alert('กรุณาเลือกหมวดย่อยก่อน');
        targetParentName = ` ภายใต้ "${tree[l1Idx].children[l2Idx].name}"`;
    }

    const levelTitle = level === 1 ? 'หมวดหมู่หลัก' : level === 2 ? 'หมวดหมู่ย่อย' : 'ประเภทย่อย';
    const name = prompt(`เพิ่ม${levelTitle}ใหม่${targetParentName}:\n(เช่น กางเกง, เลกกิ้ง, เสื้อผ้าสตรี)`);
    if (!name || !name.trim()) return;
    const cleanName = name.trim();

    const code = prompt(`รหัสย่อบาร์โค้ด / SKU (2-4 ตัวอักษร เช่น PNT, RAG, TSH, NS):`, cleanName.slice(0, 3).toUpperCase());
    const cleanCode = (code || cleanName.slice(0, 3)).trim().toUpperCase();

    const newItem = { name: cleanName, code: cleanCode, children: [] };

    if (level === 1) {
        tree.push(newItem);
        InventoryApp.catTreeState.l1Idx = tree.length - 1;
        InventoryApp.catTreeState.l2Idx = 0;
        InventoryApp.catTreeState.l3Idx = 0;
    } else if (level === 2) {
        if (!tree[l1Idx].children) tree[l1Idx].children = [];
        tree[l1Idx].children.push(newItem);
        InventoryApp.catTreeState.l2Idx = tree[l1Idx].children.length - 1;
        InventoryApp.catTreeState.l3Idx = 0;
    } else if (level === 3) {
        if (!tree[l1Idx].children[l2Idx].children) tree[l1Idx].children[l2Idx].children = [];
        tree[l1Idx].children[l2Idx].children.push(newItem);
        InventoryApp.catTreeState.l3Idx = tree[l1Idx].children[l2Idx].children.length - 1;
    }

    saveStoredCategoryTree(tree);
    renderCategoryTreeModal();
    populateModalCategories(cleanName);
}

// -------------------------------------------------------------------
// Edit Item
// -------------------------------------------------------------------
function editCategoryTreeItem(level, index, event) {
    if (event) event.stopPropagation();

    const tree = getStoredCategoryTree();
    const { l1Idx, l2Idx } = InventoryApp.catTreeState;

    let targetItem = null;
    if (level === 1) targetItem = tree[index];
    else if (level === 2) targetItem = tree[l1Idx]?.children?.[index];
    else if (level === 3) targetItem = tree[l1Idx]?.children?.[l2Idx]?.children?.[index];

    if (!targetItem) return;

    const newName = prompt(`แก้ไขชื่อหมวดหมู่:`, targetItem.name);
    if (newName === null) return;
    const cleanName = newName.trim();
    if (!cleanName) return alert('ชื่อหมวดหมู่ต้องไม่ว่างเปล่า');

    const newCode = prompt(`แก้ไขรหัสย่อบาร์โค้ด / SKU:`, targetItem.code || '');
    if (newCode === null) return;
    const cleanCode = (newCode || cleanName.slice(0, 3)).trim().toUpperCase();

    targetItem.name = cleanName;
    targetItem.code = cleanCode;

    saveStoredCategoryTree(tree);
    renderCategoryTreeModal();
    populateModalCategories();
}

// -------------------------------------------------------------------
// Delete Item
// -------------------------------------------------------------------
function deleteCategoryTreeItem(level, index, event) {
    if (event) event.stopPropagation();

    const tree = getStoredCategoryTree();
    const { l1Idx, l2Idx } = InventoryApp.catTreeState;

    let targetItem = null;
    let parentArr = null;

    if (level === 1) { parentArr = tree; targetItem = tree[index]; }
    else if (level === 2) { parentArr = tree[l1Idx]?.children; targetItem = parentArr?.[index]; }
    else if (level === 3) { parentArr = tree[l1Idx]?.children?.[l2Idx]?.children; targetItem = parentArr?.[index]; }

    if (!targetItem || !parentArr) return;

    if (!confirm(`ยืนยันการลบหมวดหมู่ "${targetItem.name}"${targetItem.children?.length ? ' พร้อมหมวดย่อยทั้งหมด' : ''} ใช่หรือไม่?`)) return;

    parentArr.splice(index, 1);

    if (level === 1) InventoryApp.catTreeState.l1Idx = Math.max(0, index - 1);
    else if (level === 2) InventoryApp.catTreeState.l2Idx = Math.max(0, index - 1);
    else if (level === 3) InventoryApp.catTreeState.l3Idx = Math.max(0, index - 1);

    saveStoredCategoryTree(tree);
    renderCategoryTreeModal();
    populateModalCategories();
}

// -------------------------------------------------------------------
// Search in Category Tree
// -------------------------------------------------------------------
function onCategoryTreeSearch(query) {
    const q = (query || '').trim().toLowerCase();
    const resultsContainer = document.getElementById('catTreeSearchResults');
    const btnClear = document.getElementById('btnClearCatSearch');

    if (btnClear) btnClear.classList.toggle('hidden', !q);

    if (!q || q.length < 1) {
        if (resultsContainer) resultsContainer.classList.add('hidden');
        return;
    }

    const tree = getStoredCategoryTree();
    const matches = [];

    tree.forEach((l1, i) => {
        if (l1.children && l1.children.length > 0) {
            l1.children.forEach((l2, j) => {
                if (l2.children && l2.children.length > 0) {
                    l2.children.forEach((l3, k) => {
                        const pathStr = `${l1.name} > ${l2.name} > ${l3.name}`.toLowerCase();
                        const codeStr = `${l1.code || ''}-${l2.code || ''}-${l3.code || ''}`.toLowerCase();
                        if (pathStr.includes(q) || codeStr.includes(q)) {
                            matches.push({ l1, l2, l3, i, j, k, path: `${l1.name} > ${l2.name} > ${l3.name}`, code: [l1.code, l2.code, l3.code].filter(Boolean).join('-') });
                        }
                    });
                } else {
                    const pathStr = `${l1.name} > ${l2.name}`.toLowerCase();
                    if (pathStr.includes(q)) {
                        matches.push({ l1, l2, l3: null, i, j, k: 0, path: `${l1.name} > ${l2.name}`, code: [l1.code, l2.code].filter(Boolean).join('-') });
                    }
                }
            });
        } else {
            if (l1.name.toLowerCase().includes(q) || (l1.code && l1.code.toLowerCase().includes(q))) {
                matches.push({ l1, l2: null, l3: null, i, j: 0, k: 0, path: l1.name, code: l1.code });
            }
        }
    });

    if (!resultsContainer) return;
    resultsContainer.classList.remove('hidden');

    if (matches.length === 0) {
        resultsContainer.innerHTML = `<div class="p-3 text-center text-slate-400">ไม่พบหมวดหมู่ที่ตรงกับ "${escapeHtml(q)}"</div>`;
        return;
    }

    resultsContainer.innerHTML = matches.slice(0, 15).map(m => `
        <div class="px-3 py-2 hover:bg-orange-100/60 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
            onclick="selectCategoryTreePath(${m.i}, ${m.j}, ${m.k})">
            <span class="font-medium text-slate-800">${escapeHtml(m.path)}</span>
            <span class="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-orange-200 text-[#ee4d2d] font-bold">
                ${escapeHtml(m.code)}
            </span>
        </div>
    `).join('');
}

function selectCategoryTreePath(i, j, k) {
    InventoryApp.catTreeState = { l1Idx: i, l2Idx: j, l3Idx: k };
    clearCategoryTreeSearch();
    renderCategoryTreeModal();
}

function clearCategoryTreeSearch() {
    const input = document.getElementById('catTreeSearchInput');
    if (input) input.value = '';
    const resultsContainer = document.getElementById('catTreeSearchResults');
    if (resultsContainer) resultsContainer.classList.add('hidden');
    const btnClear = document.getElementById('btnClearCatSearch');
    if (btnClear) btnClear.classList.add('hidden');
}

// -------------------------------------------------------------------
// Confirm Selection
// -------------------------------------------------------------------
function confirmCategoryTreeSelection() {
    const tree = getStoredCategoryTree();
    const { l1Idx, l2Idx, l3Idx } = InventoryApp.catTreeState;
    const l1 = tree[l1Idx];
    const l2 = l1?.children?.[l2Idx];
    const l3 = l2?.children?.[l3Idx];

    const pathArr = [];
    if (l1) pathArr.push(l1.name);
    if (l2) pathArr.push(l2.name);
    if (l3) pathArr.push(l3.name);

    const fullPath = pathArr.join(' > ');
    if (!fullPath) {
        alert('กรุณาเลือกหมวดหมู่');
        return;
    }

    // SKU prefix & suggested barcode: e.g. WM-PNT-PAG and WM-PNT-PAG-001
    const { prefix: skuPrefix, suggestedSku } = getSuggestedSkuForCategoryTree(l1, l2, l3);

    // 1. Update Display in Tab 1
    const dispEl = document.getElementById('displayModalCategory');
    if (dispEl) dispEl.textContent = fullPath;
    const dispSku = document.getElementById('displayModalCategorySku');
    if (dispSku) dispSku.textContent = skuPrefix;

    // 2. Update Hidden Select for form payload compatibility
    const select = document.getElementById('modalCategory');
    if (select) {
        let exists = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === fullPath) {
                select.selectedIndex = i;
                exists = true;
                break;
            }
        }
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = fullPath;
            opt.textContent = fullPath;
            opt.setAttribute('data-prefix', skuPrefix);
            opt.selected = true;
            select.appendChild(opt);
        }
        select.value = fullPath;
    }

    // 3. Update Tab 2 Category Badge
    const tab2Badge = document.getElementById('tab2CategoryBadge');
    if (tab2Badge) tab2Badge.textContent = fullPath;

    // 4. Intelligently update barcode / SKU into #modalSku
    const skuInput = document.getElementById('modalSku');
    if (skuInput) {
        const currentSku = skuInput.value.trim().toUpperCase();
        if (!InventoryApp.editingId) {
            // New product: Always update SKU to suggested SKU of the selected category
            skuInput.value = suggestedSku;
            onModalSkuInput(suggestedSku);
        } else {
            // Editing existing product: If empty/short or user wants to update prefix
            if (!currentSku || currentSku.length <= 4) {
                skuInput.value = suggestedSku;
                onModalSkuInput(suggestedSku);
            } else if (confirm(`คุณเปลี่ยนหมวดหมู่สินค้าเป็น:\n"${fullPath}" (${skuPrefix})\n\nต้องการเปลี่ยนรหัส SKU เดิม ("${currentSku}") ให้เป็นรหัสหมวดหมู่ใหม่ ("${suggestedSku}") ด้วยหรือไม่?\n\n• กด "OK" เพื่อเปลี่ยนรหัส SKU ให้ตรงกับหมวดใหม่\n• กด "Cancel" เพื่อใช้รหัส SKU เดิมต่อไป`)) {
                skuInput.value = suggestedSku;
                onModalSkuInput(suggestedSku);
            }
        }
    }

    closeCategoryManagerModal();
}

function updateTab2CategoryBadge() {
    const select = document.getElementById('modalCategory');
    const disp = document.getElementById('displayModalCategory');
    const badge = document.getElementById('tab2CategoryBadge');
    const val = disp?.textContent || select?.value || 'เสื้อผ้าผู้หญิง > กางเกง > เลกกิ้ง';
    if (badge) {
        badge.textContent = val;
    }
}

function populateModalCategories(selectedName) {
    const select = document.getElementById('modalCategory');
    const disp = document.getElementById('displayModalCategory');
    const dispSku = document.getElementById('displayModalCategorySku');
    if (!select) return;

    const tree = getStoredCategoryTree();
    const flatPaths = [];

    tree.forEach(l1 => {
        if (l1.children && l1.children.length > 0) {
            l1.children.forEach(l2 => {
                if (l2.children && l2.children.length > 0) {
                    l2.children.forEach(l3 => {
                        const codes = [l1.code, l2.code, l3.code].filter(Boolean);
                        flatPaths.push({
                            path: `${l1.name} > ${l2.name} > ${l3.name}`,
                            prefix: codes.join('-')
                        });
                    });
                } else {
                    const codes = [l1.code, l2.code].filter(Boolean);
                    flatPaths.push({
                        path: `${l1.name} > ${l2.name}`,
                        prefix: codes.join('-')
                    });
                }
            });
        } else {
            flatPaths.push({
                path: l1.name,
                prefix: l1.code || 'GEN'
            });
        }
    });

    select.innerHTML = flatPaths.map(item => {
        const isSel = (selectedName && (item.path === selectedName || item.path.includes(selectedName))) ? 'selected' : '';
        return `<option value="${escapeHtml(item.path)}" data-prefix="${item.prefix}" ${isSel}>${escapeHtml(item.path)}</option>`;
    }).join('');

    const targetVal = selectedName || select.value || (flatPaths[0]?.path || 'เสื้อผ้าผู้หญิง > กางเกง > เลกกิ้ง');
    const matchedItem = flatPaths.find(p => p.path === targetVal || targetVal.includes(p.path)) || flatPaths[0];

    if (disp && matchedItem) {
        disp.textContent = matchedItem.path;
    }
    if (dispSku && matchedItem) {
        dispSku.textContent = matchedItem.prefix;
    }

    updateTab2CategoryBadge();
}

function onModalCategoryChange(categoryName) {
    const select = document.getElementById('modalCategory');
    const disp = document.getElementById('displayModalCategory');
    const dispSku = document.getElementById('displayModalCategorySku');
    if (!select) return;

    const opt = select.options[select.selectedIndex];
    const prefix = opt?.getAttribute('data-prefix');
    if (disp) disp.textContent = select.value;
    if (dispSku && prefix) dispSku.textContent = prefix;

    updateTab2CategoryBadge();

    const inputSku = document.getElementById('modalSku');
    if (prefix && inputSku && (!inputSku.value.trim() || inputSku.value.trim().length <= 4 || inputSku.value.endsWith('-001'))) {
        inputSku.value = `${prefix}-001`;
        onModalSkuInput(inputSku.value);
    }
}

function openQuickAddCategoryModal() {
    openCategoryManagerModal();
}

// ----------------------------------------------------
// Tab 2 Helper: Custom Option Popup Modal & Custom Attributes
// ----------------------------------------------------
let currentCustomOptionTargetSelectId = null;

function promptAddCustomOption(selectId, promptTitle) {
    currentCustomOptionTargetSelectId = selectId;
    const modal = document.getElementById('addCustomOptionModal');
    const titleEl = document.getElementById('customOptionModalTitle');
    const labelEl = document.getElementById('customOptionModalLabel');
    const input = document.getElementById('customOptionModalInput');

    if (!modal || !input) return;

    const cleanLabelName = (promptTitle || '').replace(/^เพิ่ม/, '').replace(/ใหม่$/, '');
    if (titleEl) titleEl.textContent = `จัดการตัวเลือก: ${cleanLabelName || 'ทั่วไป'}`;
    if (labelEl) labelEl.textContent = `เพิ่ม${cleanLabelName || 'ตัวเลือก'}ใหม่:`;
    if (input) input.placeholder = `กรอกชื่อ${cleanLabelName || 'ตัวเลือก'}...`;

    input.value = '';
    renderCustomOptionModalList();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => input.focus(), 60);
}

function renderCustomOptionModalList() {
    const listEl = document.getElementById('customOptionModalList');
    const countEl = document.getElementById('customOptionModalCount');
    if (!listEl || !currentCustomOptionTargetSelectId) return;

    const select = document.getElementById(currentCustomOptionTargetSelectId);
    if (!select || select.options.length === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">ยังไม่มีตัวเลือกในรายการ</div>`;
        if (countEl) countEl.textContent = '0 รายการ';
        return;
    }

    const options = Array.from(select.options);
    if (countEl) countEl.textContent = `${options.length} รายการ`;

    listEl.innerHTML = options.map((opt, idx) => `
        <div class="flex items-center justify-between py-1.5 px-2.5 hover:bg-slate-50 rounded-lg group transition-colors border border-transparent hover:border-slate-100">
            <div class="flex items-center gap-2 min-w-0">
                <span class="w-1.5 h-1.5 rounded-full ${opt.selected ? 'bg-[#ee4d2d]' : 'bg-slate-300'} shrink-0"></span>
                <span class="text-xs ${opt.selected ? 'font-bold text-[#ee4d2d]' : 'text-slate-700'} truncate" title="${escapeHtml(opt.text || opt.value)}">
                    ${escapeHtml(opt.text || opt.value)}
                </span>
                ${opt.selected ? '<span class="text-[9px] bg-orange-100 text-[#ee4d2d] px-1.5 py-0.2 rounded font-semibold shrink-0">เลือกอยู่</span>' : ''}
            </div>
            <button type="button" onclick="deleteCustomOptionItem('${escapeHtml(opt.value)}')" 
                class="w-6 h-6 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0" 
                title="ลบตัวเลือกนี้">
                <i class="bi bi-trash text-xs"></i>
            </button>
        </div>
    `).join('');
}

function deleteCustomOptionItem(val) {
    if (!currentCustomOptionTargetSelectId) return;
    const select = document.getElementById(currentCustomOptionTargetSelectId);
    if (!select) return;

    let targetIndex = -1;
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === val || select.options[i].text === val) {
            targetIndex = i;
            break;
        }
    }

    if (targetIndex !== -1) {
        const wasSelected = select.selectedIndex === targetIndex;
        select.remove(targetIndex);

        // If deleted was selected, reset to first available
        if (wasSelected && select.options.length > 0) {
            select.selectedIndex = 0;
        }

        // Also remove from localStorage
        try {
            const stored = JSON.parse(localStorage.getItem('sgyver_attribute_options') || '{}');
            if (stored[currentCustomOptionTargetSelectId]) {
                stored[currentCustomOptionTargetSelectId] = stored[currentCustomOptionTargetSelectId].filter(item => item !== val);
                localStorage.setItem('sgyver_attribute_options', JSON.stringify(stored));
            }
        } catch (e) {
            console.error('Failed to remove custom option from storage:', e);
        }

        renderCustomOptionModalList();
    }
}

function closeAddCustomOptionModal() {
    const modal = document.getElementById('addCustomOptionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    currentCustomOptionTargetSelectId = null;
}

function confirmAddCustomOption() {
    const input = document.getElementById('customOptionModalInput');
    const val = (input?.value || '').trim();
    if (!val) {
        alert('กรุณากรอกชื่อตัวเลือกใหม่');
        input?.focus();
        return;
    }

    if (!currentCustomOptionTargetSelectId) {
        closeAddCustomOptionModal();
        return;
    }

    const select = document.getElementById(currentCustomOptionTargetSelectId);
    if (select) {
        let exists = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].text.toLowerCase() === val.toLowerCase() || select.options[i].value.toLowerCase() === val.toLowerCase()) {
                select.selectedIndex = i;
                exists = true;
                break;
            }
        }
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            opt.selected = true;
            select.appendChild(opt);
        }

        saveAttributeOptionToStorage(currentCustomOptionTargetSelectId, val);
    }

    input.value = '';
    input.focus();
    renderCustomOptionModalList();
}

function saveAttributeOptionToStorage(selectId, optionVal) {
    try {
        const stored = JSON.parse(localStorage.getItem('sgyver_attribute_options') || '{}');
        if (!stored[selectId]) stored[selectId] = [];
        if (!stored[selectId].includes(optionVal)) {
            stored[selectId].push(optionVal);
            localStorage.setItem('sgyver_attribute_options', JSON.stringify(stored));
        }
    } catch (e) {
        console.error('Failed to save custom option to storage:', e);
    }
}

function loadSavedAttributeOptions() {
    try {
        const stored = JSON.parse(localStorage.getItem('sgyver_attribute_options') || '{}');
        Object.keys(stored).forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const optionsArr = stored[selectId];
            if (Array.isArray(optionsArr)) {
                optionsArr.forEach(val => {
                    let exists = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value.toLowerCase() === val.toLowerCase() || select.options[i].text.toLowerCase() === val.toLowerCase()) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        const opt = document.createElement('option');
                        opt.value = val;
                        opt.textContent = val;
                        select.appendChild(opt);
                    }
                });
            }
        });
    } catch (e) {
        console.warn('Failed to load saved attribute options:', e);
    }
}

function addCustomAttributeRow(attrName = '', attrVal = '') {
    const container = document.getElementById('customAttributesContainer');
    const list = document.getElementById('customAttributesList');
    if (!container || !list) return;
    container.classList.remove('hidden');

    const rowDiv = document.createElement('div');
    rowDiv.className = 'custom-attr-row flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl transition-all';
    rowDiv.innerHTML = `
        <input type="text" placeholder="ชื่อคุณลักษณะ เช่น ความหนาผ้า, ซับใน" value="${escapeHtml(attrName)}"
            class="custom-attr-name w-1/3 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-medium">
        <input type="text" placeholder="ค่า เช่น หนาพิเศษ, มีซับในทั้งตัว" value="${escapeHtml(attrVal)}"
            class="custom-attr-value flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none">
        <button type="button" onclick="removeCustomAttributeRow(this)" title="ลบคุณลักษณะนี้"
            class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
            <i class="bi bi-trash"></i>
        </button>
    `;
    list.appendChild(rowDiv);
}

function removeCustomAttributeRow(btn) {
    if (!btn) return;
    const row = btn.closest('.custom-attr-row');
    if (row) {
        row.remove();
        checkCustomAttributesEmpty();
    }
}

function checkCustomAttributesEmpty() {
    const container = document.getElementById('customAttributesContainer');
    const list = document.getElementById('customAttributesList');
    if (container && list && list.children.length === 0) {
        container.classList.add('hidden');
    }
}

// ==============================================================================
// 5.3 PRODUCT IMAGE GALLERY & STORAGE (อัลบั้มรูปภาพสินค้า / รองรับสูงสุด 15 รูปต่อสินค้า)
// ==============================================================================
InventoryApp.modalImages = []; // Array of image URLs / data URLs for product gallery

let galleryDraggedIndex = null;

function handleGalleryDragStart(e, index) {
    galleryDraggedIndex = index;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    }
    const target = e.currentTarget;
    target.classList.add('opacity-40', 'scale-95');
}

function handleGalleryDragOver(e, index) {
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
}

function handleGalleryDragEnter(e, index) {
    e.preventDefault();
    if (galleryDraggedIndex === null || galleryDraggedIndex === index) return;
    const target = e.currentTarget;
    target.classList.add('ring-2', 'ring-amber-500', 'border-amber-400');
}

function handleGalleryDragLeave(e, index) {
    const target = e.currentTarget;
    target.classList.remove('ring-2', 'ring-amber-500', 'border-amber-400');
}

function handleGalleryDrop(e, targetIndex) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.remove('ring-2', 'ring-amber-500', 'border-amber-400');

    if (galleryDraggedIndex === null || galleryDraggedIndex === targetIndex) return;

    const images = InventoryApp.modalImages || [];
    if (galleryDraggedIndex < 0 || galleryDraggedIndex >= images.length) return;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const [moved] = images.splice(galleryDraggedIndex, 1);
    images.splice(targetIndex, 0, moved);
    InventoryApp.modalImages = images;

    galleryDraggedIndex = null;
    renderModalGallery();
}

function handleGalleryDragEnd(e) {
    const target = e.currentTarget;
    target.classList.remove('opacity-40', 'scale-95', 'ring-2', 'ring-amber-500', 'border-amber-400');
    document.querySelectorAll('#modalGalleryGrid > div').forEach(el => {
        el.classList.remove('opacity-40', 'scale-95', 'ring-2', 'ring-amber-500', 'border-amber-400');
    });
    galleryDraggedIndex = null;
}

function renderModalGallery() {
    const grid = document.getElementById('modalGalleryGrid');
    const badge = document.getElementById('galleryCountBadge');
    const images = InventoryApp.modalImages || [];

    if (badge) {
        badge.innerHTML = `<span class="font-bold text-indigo-600">${images.length}</span> / 15 รูป ${images.length > 0 ? '<span class="text-amber-600 font-semibold">(ลากรูปเพื่อสลับตำแหน่ง | รูปแรกคือรูปปก)</span>' : ''}`;
    }

    if (!grid) return;

    if (images.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-5 px-3 border-2 border-dashed border-slate-200 rounded-xl bg-white/70 text-center flex flex-col items-center justify-center text-slate-400 group hover:border-indigo-300 transition-colors cursor-pointer"
                onclick="document.getElementById('modalAddImageUrlInput')?.focus()">
                <div class="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-500 flex items-center justify-center text-lg mb-1 transition-colors">
                    <i class="bi bi-images"></i>
                </div>
                <div class="text-xs font-semibold text-slate-600 group-hover:text-indigo-600">ยังไม่มีรูปภาพสินค้าในแกลเลอรี</div>
                <p class="text-[10px] text-slate-400 mt-0.5">วางลิงก์รูปภาพ (URL) ด้านล่าง หรือกดปุ่ม "อัปโหลดรูปจากเครื่อง" ได้เลย (สูงสุด 15 รูป)</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = images.map((url, idx) => {
        const isCover = idx === 0;
        return `
            <div class="relative group rounded-xl overflow-hidden border ${isCover ? 'border-amber-400 ring-2 ring-amber-300/60 shadow-sm' : 'border-slate-200'} bg-white aspect-square flex flex-col cursor-grab active:cursor-grabbing select-none transition-all duration-150"
                draggable="true"
                ondragstart="handleGalleryDragStart(event, ${idx})"
                ondragover="handleGalleryDragOver(event, ${idx})"
                ondragenter="handleGalleryDragEnter(event, ${idx})"
                ondragleave="handleGalleryDragLeave(event, ${idx})"
                ondrop="handleGalleryDrop(event, ${idx})"
                ondragend="handleGalleryDragEnd(event)"
                title="คลิกค้างไว้เพื่อลากสลับตำแหน่งรูป (รูปแรกคือรูปปก)">
                <!-- Cover Badge / Number -->
                ${isCover ? `
                    <div class="absolute top-1 left-1 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 pointer-events-none">
                        <i class="bi bi-star-fill text-[8px]"></i> รูปปก
                    </div>
                ` : `
                    <div class="absolute top-1 left-1 z-10 bg-slate-900/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded pointer-events-none">
                        #${idx + 1}
                    </div>
                `}

                <!-- Action Controls overlay (Only visible on hover!) -->
                <div class="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button type="button" onclick="event.stopPropagation(); removeImageFromGallery(${idx})" title="ลบรูปนี้"
                        class="w-6 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] shadow-md transition-colors active:scale-95">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>

                <!-- Thumbnail -->
                <img src="${escapeHtml(url)}" alt="รูปสินค้า #${idx + 1}"
                    onclick="openImagePreview('${escapeHtml(url)}', 'รูปสินค้า #${idx + 1}', InventoryApp.modalImages, ${idx})"
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-auto"
                    title="คลิกดูรูปขนาดใหญ่ (Popup) หรือคลิกค้างเพื่อลากสลับตำแหน่ง"
                    onerror="this.onerror=null; this.src='https://placehold.co/200x200/f1f5f9/94a3b8?text=Image+Error';">

                <!-- Bottom label for Cover -->
                ${isCover ? `
                    <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent py-1 px-1 text-center pointer-events-none">
                        <span class="text-[9px] font-bold text-amber-300 flex items-center justify-center gap-1">
                            <i class="bi bi-check-circle-fill text-[8px]"></i> รูปหน้าปก
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function addImageToGallery(url) {
    if (!url) return;
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    if (!InventoryApp.modalImages) InventoryApp.modalImages = [];

    if (InventoryApp.modalImages.length >= 15) {
        alert('สามารถเพิ่มรูปภาพสินค้าได้สูงสุด 15 รูปต่อสินค้าครับ');
        return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:image/')) {
        alert('ลิงก์รูปภาพไม่ถูกต้อง ต้องขึ้นต้นด้วย https:// หรือ http://');
        return;
    }

    InventoryApp.modalImages.push(cleanUrl);
    renderModalGallery();
}

function addImageToGalleryFromInput() {
    const input = document.getElementById('modalAddImageUrlInput');
    if (!input) return;

    const val = input.value.trim();
    if (!val) return;

    // Support multiple URLs separated by comma, newline, or space
    const urls = val.split(/[\r\n,]+/).map(u => u.trim()).filter(Boolean);

    let addedCount = 0;
    for (const u of urls) {
        if (InventoryApp.modalImages.length >= 15) {
            alert('เพิ่มได้สูงสุด 15 รูปครับ');
            break;
        }
        if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/')) {
            InventoryApp.modalImages.push(u);
            addedCount++;
        }
    }

    input.value = '';
    renderModalGallery();

    if (addedCount === 0 && urls.length > 0) {
        alert('กรุณาใส่ลิงก์รูปภาพที่ขึ้นต้นด้วย https:// หรือ http://');
    }
}

function setAsCoverImage(index) {
    if (!InventoryApp.modalImages || index < 0 || index >= InventoryApp.modalImages.length) return;
    const [selected] = InventoryApp.modalImages.splice(index, 1);
    InventoryApp.modalImages.unshift(selected);
    renderModalGallery();
}

function removeImageFromGallery(index) {
    if (!InventoryApp.modalImages || index < 0 || index >= InventoryApp.modalImages.length) return;
    InventoryApp.modalImages.splice(index, 1);
    renderModalGallery();
}

function clearModalGallery() {
    if (!InventoryApp.modalImages || InventoryApp.modalImages.length === 0) return;
    if (!confirm('ต้องการลบรูปภาพทั้งหมดในแกลเลอรีนี้ใช่หรือไม่?')) return;
    InventoryApp.modalImages = [];
    renderModalGallery();
}

// Compress and convert uploaded image file to Data URL
function compressImageFile(file, maxWidth = 1000, maxHeight = 1000, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleModalImageFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 15 - (InventoryApp.modalImages?.length || 0);
    if (remainingSlots <= 0) {
        alert('แกลเลอรีเต็มแล้ว (สูงสุด 15 รูปต่อสินค้า)');
        event.target.value = '';
        return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;
        try {
            const compressedDataUrl = await compressImageFile(file);
            InventoryApp.modalImages.push(compressedDataUrl);
        } catch (err) {
            console.error('Failed to compress image file:', err);
        }
    }

    event.target.value = '';
    renderModalGallery();
}

async function pasteImageFromClipboard() {
    try {
        if (navigator.clipboard?.read) {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const compressed = await compressImageFile(blob);
                    addImageToGallery(compressed);
                    return;
                }
            }
        }

        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
            const urls = text.split(/[\r\n,]+/).map(u => u.trim()).filter(Boolean);
            urls.forEach(u => addImageToGallery(u));
            return;
        }

        const fallback = prompt('กรุณาวางลิงก์รูปภาพ (Image URL ที่ขึ้นต้นด้วย https://):');
        if (fallback) {
            const urls = fallback.split(/[\r\n,]+/).map(u => u.trim()).filter(Boolean);
            urls.forEach(u => addImageToGallery(u));
        }
    } catch (err) {
        const fallback = prompt('กรุณาวางลิงก์รูปภาพ (Image URL ที่ขึ้นต้นด้วย https://):');
        if (fallback) {
            const urls = fallback.split(/[\r\n,]+/).map(u => u.trim()).filter(Boolean);
            urls.forEach(u => addImageToGallery(u));
        }
    }
}

// ==============================================================================
// 🎬 PRODUCT VIDEO MANAGEMENT (URL LINK + FILE UPLOAD + LIVE PREVIEW)
// ==============================================================================
InventoryApp.modalVideoUrl = '';

function renderModalVideo() {
    const slot = document.getElementById('modalVideoSlotContainer');
    const badge = document.getElementById('modalVideoStatusBadge');
    const input = document.getElementById('modalVideoUrlInput');
    const removeBtn = document.getElementById('btnRemoveModalVideo');

    const videoUrl = (InventoryApp.modalVideoUrl || '').trim();

    if (badge) {
        if (videoUrl) {
            badge.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-600 font-bold"><i class="bi bi-check-circle-fill"></i> มีวิดีโอแล้ว</span>`;
        } else {
            badge.innerHTML = `(ไม่บังคับ - สูงสุด 1 วิดีโอ)`;
        }
    }

    if (input && videoUrl && !videoUrl.startsWith('data:video/')) {
        input.value = videoUrl;
    }

    if (removeBtn) {
        removeBtn.classList.toggle('hidden', !videoUrl);
    }

    if (!slot) return;

    if (videoUrl) {
        slot.innerHTML = `
            <div class="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-[#ee4d2d] bg-black shadow-sm group select-none shrink-0">
                <video src="${escapeHtml(videoUrl)}" class="w-full h-full object-cover" muted preload="metadata" playsinline></video>
                <!-- Play Overlay Button -->
                <div class="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer"
                    onclick="openVideoPreviewModal('${escapeHtml(videoUrl)}')" title="คลิกเพื่อเล่นวิดีโอตัวอย่าง (Popup)">
                    <div class="w-8 h-8 rounded-full bg-white/95 text-[#ee4d2d] flex items-center justify-center text-sm shadow pl-0.5 group-hover:scale-110 transition-transform">
                        <i class="bi bi-play-fill text-base"></i>
                    </div>
                </div>
                <!-- Delete Button top right -->
                <button type="button" onclick="event.stopPropagation(); clearModalVideo()" title="ลบวิดีโอ"
                    class="absolute top-1 right-1 z-10 w-6 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] shadow transition-colors active:scale-95 cursor-pointer">
                    <i class="bi bi-trash-fill"></i>
                </button>
                <!-- Video Tag Badge -->
                <span class="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 pointer-events-none">
                    <i class="bi bi-camera-video text-[8px] text-amber-300"></i> วิดีโอ
                </span>
            </div>
        `;
    } else {
        slot.innerHTML = `
            <div onclick="document.getElementById('modalVideoFileInput').click()" 
                class="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#ee4d2d] flex flex-col items-center justify-center text-slate-400 hover:text-[#ee4d2d] cursor-pointer transition-all shrink-0 bg-white group hover:shadow-sm"
                title="คลิกเพื่อเลือกไฟล์วิดีโอ หรือวางลิงก์ด้านล่าง">
                <div class="w-8 h-8 rounded-lg bg-orange-50 text-[#ee4d2d] flex items-center justify-center text-base mb-1 group-hover:scale-110 transition-transform">
                    <i class="bi bi-camera-video"></i>
                </div>
                <span class="text-[10px] font-bold text-[#ee4d2d]">+ เพิ่มวิดีโอ</span>
                <span class="text-[9px] text-slate-400">MP4 / ลิงก์</span>
            </div>
        `;
    }
}

function setModalVideoFromInput() {
    const input = document.getElementById('modalVideoUrlInput');
    if (!input) return;
    const url = input.value.trim();

    if (!url) {
        alert('กรุณากรอกลิงก์วิดีโอสินค้า (URL)');
        input.focus();
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:video/')) {
        alert('ลิงก์วิดีโอต้องขึ้นต้นด้วย https:// หรือ http://');
        input.focus();
        return;
    }

    InventoryApp.modalVideoUrl = url;
    renderModalVideo();
    showToastNotification('เพิ่มลิงก์วิดีโอเรียบร้อยแล้ว');
}

async function pasteVideoUrlFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
            const input = document.getElementById('modalVideoUrlInput');
            if (input) input.value = text.trim();
            setModalVideoFromInput();
            return;
        }
        const fallback = prompt('กรุณาวางลิงก์วิดีโอ (Video URL ที่ขึ้นต้นด้วย https://):');
        if (fallback && fallback.trim()) {
            const input = document.getElementById('modalVideoUrlInput');
            if (input) input.value = fallback.trim();
            setModalVideoFromInput();
        }
    } catch(err) {
        const fallback = prompt('กรุณาวางลิงก์วิดีโอ (Video URL ที่ขึ้นต้นด้วย https://):');
        if (fallback && fallback.trim()) {
            const input = document.getElementById('modalVideoUrlInput');
            if (input) input.value = fallback.trim();
            setModalVideoFromInput();
        }
    }
}

function handleModalVideoFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
        alert('ขนาดไฟล์วิดีโอเกิน 30MB กรุณาเลือกไฟล์ขนาดไม่เกิน 30MB ตามเงื่อนไขของระบบ');
        event.target.value = '';
        return;
    }

    // Convert file to base64 Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
        InventoryApp.modalVideoUrl = e.target.result;
        renderModalVideo();
        showToastNotification('อัปโหลดไฟล์วิดีโอเรียบร้อยแล้ว');
    };
    reader.onerror = () => {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์วิดีโอ');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function clearModalVideo() {
    InventoryApp.modalVideoUrl = '';
    const input = document.getElementById('modalVideoUrlInput');
    if (input) input.value = '';
    renderModalVideo();
    showToastNotification('ลบวิดีโอเรียบร้อยแล้ว');
}

function openVideoPreviewModal(url) {
    if (!url) return;
    const modal = document.getElementById('videoPreviewModal');
    const player = document.getElementById('videoPreviewPlayer');
    if (!modal || !player) return;

    player.src = url;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    player.play().catch(() => {});
}

function closeVideoPreviewModal() {
    const modal = document.getElementById('videoPreviewModal');
    const player = document.getElementById('videoPreviewPlayer');
    if (player) {
        player.pause();
        player.src = '';
    }
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ==============================================================================
// 5.4 SUB-SKU VARIANT IMAGE PICKER (จัดเก็บรูปภาพเฉพาะสำหรับแต่ละตัวเลือกย่อย)
// ==============================================================================
InventoryApp.activeVariantImageIndex = null;

function openVariantImagePicker(idx) {
    if (!InventoryApp.modalVariants || !InventoryApp.modalVariants[idx]) return;
    InventoryApp.activeVariantImageIndex = idx;
    const v = InventoryApp.modalVariants[idx];

    const modal = document.getElementById('variantImagePickerModal');
    const title = document.getElementById('varImgPickerTitle');
    const nameEl = document.getElementById('varImgPickerItemName');
    const skuEl = document.getElementById('varImgPickerItemSku');
    const preview = document.getElementById('varImgPickerPreview');
    const placeholder = document.getElementById('varImgPickerPlaceholder');
    const input = document.getElementById('varImgPickerUrlInput');
    const gallerySection = document.getElementById('varImgPickerGallerySection');
    const galleryGrid = document.getElementById('varImgPickerGalleryGrid');

    if (title) title.innerText = `รูปภาพตัวเลือก: ${v.variant || 'ตัวเลือกที่ ' + (idx + 1)}`;
    if (nameEl) nameEl.innerText = v.variant || `ตัวเลือกที่ ${idx + 1}`;
    if (skuEl) skuEl.innerText = `รหัส SKU: ${v.sku || '-'}`;
    if (input) input.value = '';

    // Update current preview
    if (v.image_url) {
        if (preview) { preview.src = v.image_url; preview.classList.remove('hidden'); }
        if (placeholder) placeholder.classList.add('hidden');
    } else {
        if (preview) { preview.src = ''; preview.classList.add('hidden'); }
        if (placeholder) placeholder.classList.remove('hidden');
    }

    // Populate quick picker options from main product gallery
    const gallery = InventoryApp.modalImages || [];
    if (gallerySection && galleryGrid) {
        if (gallery.length > 0) {
            gallerySection.classList.remove('hidden');
            galleryGrid.innerHTML = gallery.map((url, gIdx) => {
                const isSelected = v.image_url === url;
                return `
                    <div onclick="setVariantImageFromGallery('${escapeHtml(url)}')" 
                        class="aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group relative shadow-2xs bg-white transition-all hover:scale-105 ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-slate-200 hover:border-emerald-400'}"
                        title="คลิกเลือกรูปนี้">
                        <img src="${escapeHtml(url)}" alt="รูปแกลเลอรี #${gIdx + 1}" class="w-full h-full object-cover">
                        ${gIdx === 0 ? '<span class="absolute top-0.5 left-0.5 bg-amber-500 text-white text-[7px] font-bold px-1 rounded shadow">ปก</span>' : ''}
                        ${isSelected ? '<span class="absolute bottom-0.5 right-0.5 bg-emerald-600 text-white text-[7px] font-bold px-1 rounded shadow"><i class="bi bi-check"></i></span>' : ''}
                    </div>
                `;
            }).join('');
        } else {
            gallerySection.classList.add('hidden');
            galleryGrid.innerHTML = '';
        }
    }

    if (modal) modal.classList.remove('hidden');
}

function closeVariantImagePicker() {
    const modal = document.getElementById('variantImagePickerModal');
    if (modal) modal.classList.add('hidden');
    InventoryApp.activeVariantImageIndex = null;
}

function setVariantImageFromGallery(url) {
    if (InventoryApp.activeVariantImageIndex === null) return;
    const idx = InventoryApp.activeVariantImageIndex;
    if (!InventoryApp.modalVariants || !InventoryApp.modalVariants[idx]) return;

    InventoryApp.modalVariants[idx].image_url = url;

    // Update picker preview
    const preview = document.getElementById('varImgPickerPreview');
    const placeholder = document.getElementById('varImgPickerPlaceholder');
    if (preview) { preview.src = url; preview.classList.remove('hidden'); }
    if (placeholder) placeholder.classList.add('hidden');

    renderModalVariantsTable();
    closeVariantImagePicker();
}

function applyVariantImageUrlFromInput() {
    if (InventoryApp.activeVariantImageIndex === null) return;
    const idx = InventoryApp.activeVariantImageIndex;
    if (!InventoryApp.modalVariants || !InventoryApp.modalVariants[idx]) return;

    const input = document.getElementById('varImgPickerUrlInput');
    const url = (input?.value || '').trim();
    if (!url) {
        alert('กรุณากรอกลิงก์รูปภาพ');
        return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
        alert('ลิงก์รูปภาพไม่ถูกต้อง ต้องขึ้นต้นด้วย https:// หรือ http://');
        return;
    }

    InventoryApp.modalVariants[idx].image_url = url;

    // Also add to main gallery if not there yet
    if (!InventoryApp.modalImages) InventoryApp.modalImages = [];
    if (!InventoryApp.modalImages.includes(url) && InventoryApp.modalImages.length < 15) {
        InventoryApp.modalImages.push(url);
        renderModalGallery();
    }

    renderModalVariantsTable();
    closeVariantImagePicker();
}

async function handleVariantImageFileUpload(event) {
    if (InventoryApp.activeVariantImageIndex === null) return;
    const idx = InventoryApp.activeVariantImageIndex;
    if (!InventoryApp.modalVariants || !InventoryApp.modalVariants[idx]) return;

    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    try {
        const compressedDataUrl = await compressImageFile(file);
        InventoryApp.modalVariants[idx].image_url = compressedDataUrl;

        // Also add to main gallery if not full
        if (!InventoryApp.modalImages) InventoryApp.modalImages = [];
        if (!InventoryApp.modalImages.includes(compressedDataUrl) && InventoryApp.modalImages.length < 15) {
            InventoryApp.modalImages.push(compressedDataUrl);
            renderModalGallery();
        }

        renderModalVariantsTable();
        closeVariantImagePicker();
    } catch (err) {
        console.error('Variant file upload error:', err);
        alert('เกิดข้อผิดพลาดในการโหลดรูปภาพ');
    } finally {
        event.target.value = '';
    }
}

function clearActiveVariantImage() {
    if (InventoryApp.activeVariantImageIndex === null) return;
    const idx = InventoryApp.activeVariantImageIndex;
    if (!InventoryApp.modalVariants || !InventoryApp.modalVariants[idx]) return;

    InventoryApp.modalVariants[idx].image_url = null;
    renderModalVariantsTable();
    closeVariantImagePicker();
}

// ==============================================================================
// 5.5 SIZE CHART MANAGEMENT (ตารางขนาดสินค้า: โหมดรูปภาพ และ โหมดแบบฟอร์ม)
// ==============================================================================
InventoryApp.sizeChart = {
    type: 'image', // 'image' | 'form'
    imageUrl: '',
    rows: []
};

function switchSizeChartMode(mode) {
    if (mode !== 'image' && mode !== 'form') mode = 'image';
    InventoryApp.sizeChart.type = mode;

    const radImg = document.getElementById('radSizeChartImg');
    const radForm = document.getElementById('radSizeChartForm');
    if (radImg) radImg.checked = (mode === 'image');
    if (radForm) radForm.checked = (mode === 'form');

    const paneImg = document.getElementById('sizeChartImagePane');
    const paneForm = document.getElementById('sizeChartFormPane');

    if (mode === 'image') {
        if (paneImg) paneImg.classList.remove('hidden');
        if (paneForm) paneForm.classList.add('hidden');
        renderSizeChartImagePane();
    } else {
        if (paneImg) paneImg.classList.add('hidden');
        if (paneForm) paneForm.classList.remove('hidden');
        if (!InventoryApp.sizeChart.rows || InventoryApp.sizeChart.rows.length === 0) {
            applyFreesizePresetSizeChart();
        } else {
            renderSizeChartTable();
        }
    }
}

function renderSizeChartImagePane() {
    const emptyBox = document.getElementById('sizeChartEmptyBox');
    const previewCard = document.getElementById('sizeChartPreviewCard');
    const imgEl = document.getElementById('sizeChartPreviewImg');
    const hasImage = !!InventoryApp.sizeChart.imageUrl;

    if (hasImage) {
        if (emptyBox) emptyBox.classList.add('hidden');
        if (previewCard) previewCard.classList.remove('hidden');
        if (imgEl) imgEl.src = InventoryApp.sizeChart.imageUrl;
    } else {
        if (emptyBox) emptyBox.classList.remove('hidden');
        if (previewCard) previewCard.classList.add('hidden');
        if (imgEl) imgEl.src = '';
    }
}

async function handleSizeChartFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    try {
        const compressedDataUrl = await compressImageFile(file, 1600, 1600, 0.88);
        InventoryApp.sizeChart.imageUrl = compressedDataUrl;
        InventoryApp.sizeChart.type = 'image';
        switchSizeChartMode('image');
    } catch (err) {
        console.error('Size chart upload error:', err);
        alert('เกิดข้อผิดพลาดในการโหลดรูปภาพตารางขนาด');
    } finally {
        event.target.value = '';
    }
}

function promptPasteSizeChartUrl() {
    const url = prompt('วางลิงก์รูปภาพตารางขนาดสินค้า (URL):');
    if (!url || !url.trim()) return;
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:image/')) {
        alert('ลิงก์รูปภาพไม่ถูกต้อง ต้องขึ้นต้นด้วย https:// หรือ http://');
        return;
    }
    InventoryApp.sizeChart.imageUrl = cleanUrl;
    InventoryApp.sizeChart.type = 'image';
    switchSizeChartMode('image');
}

function clearSizeChartImage() {
    InventoryApp.sizeChart.imageUrl = '';
    renderSizeChartImagePane();
}

function viewFullSizeChartImage() {
    if (!InventoryApp.sizeChart?.imageUrl) return;
    openImagePreview(InventoryApp.sizeChart.imageUrl, 'ตารางเทียบขนาดไซส์ (Size Chart)');
}

function renderSizeChartTable() {
    const tbody = document.getElementById('sizeChartTableBody');
    if (!tbody) return;

    const rows = InventoryApp.sizeChart.rows || [];
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-slate-400">ยังไม่มีข้อมูลขนาด กด "+ เพิ่มแถวไซส์" หรือเลือกเทมเพลตด้านบน</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((r, idx) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-1.5 px-3">
                <input type="text" value="${escapeHtml(r.size || '')}" placeholder="เช่น S, M, F"
                    oninput="updateSizeChartRowValue(${idx}, 'size', this.value)"
                    class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg font-bold text-slate-800 outline-none">
            </td>
            <td class="py-1.5 px-2.5">
                <input type="text" value="${escapeHtml(r.chest || '')}" placeholder="32-34&quot;"
                    oninput="updateSizeChartRowValue(${idx}, 'chest', this.value)"
                    class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-mono">
            </td>
            <td class="py-1.5 px-2.5">
                <input type="text" value="${escapeHtml(r.waist || '')}" placeholder="24-26&quot;"
                    oninput="updateSizeChartRowValue(${idx}, 'waist', this.value)"
                    class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-mono">
            </td>
            <td class="py-1.5 px-2.5">
                <input type="text" value="${escapeHtml(r.hip || '')}" placeholder="34-36&quot;"
                    oninput="updateSizeChartRowValue(${idx}, 'hip', this.value)"
                    class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-mono">
            </td>
            <td class="py-1.5 px-2.5">
                <input type="text" value="${escapeHtml(r.length || '')}" placeholder="36&quot;"
                    oninput="updateSizeChartRowValue(${idx}, 'length', this.value)"
                    class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-mono">
            </td>
            <td class="py-1.5 px-2 text-center">
                <button type="button" onclick="deleteSizeChartRow(${idx})" class="w-6 h-6 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-colors">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateSizeChartRowValue(idx, field, value) {
    if (InventoryApp.sizeChart.rows && InventoryApp.sizeChart.rows[idx]) {
        InventoryApp.sizeChart.rows[idx][field] = value;
    }
}

function addSizeChartRow(data = { size: '', chest: '', waist: '', hip: '', length: '' }) {
    if (!InventoryApp.sizeChart.rows) InventoryApp.sizeChart.rows = [];
    InventoryApp.sizeChart.rows.push(data);
    renderSizeChartTable();
}

function deleteSizeChartRow(index) {
    if (!InventoryApp.sizeChart.rows || index < 0 || index >= InventoryApp.sizeChart.rows.length) return;
    InventoryApp.sizeChart.rows.splice(index, 1);
    renderSizeChartTable();
}

function applyFreesizePresetSizeChart() {
    InventoryApp.sizeChart.rows = [
        { size: 'Freesize', chest: '32-38"', waist: '24-32"', hip: '34-40"', length: '36"' }
    ];
    renderSizeChartTable();
}

function applyStandardPresetSizeChart() {
    InventoryApp.sizeChart.rows = [
        { size: 'S', chest: '32-34"', waist: '24-26"', hip: '34-36"', length: '38"' },
        { size: 'M', chest: '34-36"', waist: '26-28"', hip: '36-38"', length: '38.5"' },
        { size: 'L', chest: '36-38"', waist: '28-30"', hip: '38-40"', length: '39"' },
        { size: 'XL', chest: '38-40"', waist: '30-32"', hip: '40-42"', length: '39.5"' }
    ];
    renderSizeChartTable();
}

function collectSizeChartData() {
    const isImage = (InventoryApp.sizeChart.type === 'image');
    return {
        type: isImage ? 'image' : 'form',
        imageUrl: isImage ? (InventoryApp.sizeChart.imageUrl || '') : '',
        rows: isImage ? [] : (InventoryApp.sizeChart.rows || [])
    };
}

function openProductModal() {
    InventoryApp.editingId = null;
    InventoryApp.modalVariants = [];
    InventoryApp.modalImages = [];
    InventoryApp.isMergingVariants = false;
    InventoryApp.mergingParentSku = null;

    const mergeBanner = document.getElementById('variantMergeBannerContainer');
    if (mergeBanner) mergeBanner.classList.add('hidden');

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

    // Clear description and character counters
    const descInput = document.getElementById('modalProductDescription');
    if (descInput) descInput.value = '';
    const charCount = document.getElementById('modalNameCharCount');
    if (charCount) charCount.innerText = '0/120';
    const descCount = document.getElementById('modalDescCharCount');
    if (descCount) descCount.innerText = '0/5000';

    // Clear and render gallery
    const inputUrl = document.getElementById('modalAddImageUrlInput');
    if (inputUrl) inputUrl.value = '';
    renderModalGallery();

    // Reset Size Chart
    InventoryApp.sizeChart = {
        type: 'image',
        imageUrl: '',
        rows: [{ size: 'Freesize', chest: '32-38"', waist: '24-32"', hip: '34-40"', length: '36"' }]
    };
    switchSizeChartMode('image');

    // Reset Custom Attributes in Tab 2
    const customList = document.getElementById('customAttributesList');
    if (customList) customList.innerHTML = '';
    const customContainer = document.getElementById('customAttributesContainer');
    if (customContainer) customContainer.classList.add('hidden');

    // Populate categories
    populateModalCategories('เสื้อผ้าแฟชั่น');
    updateTab2CategoryBadge();
    loadSavedAttributeOptions();

    // Reset Tab 2 standard attributes dropdowns to defaults
    if (document.getElementById('attrBrand')) document.getElementById('attrBrand').value = 'No brand';
    if (document.getElementById('attrPlusSize')) document.getElementById('attrPlusSize').value = 'no';
    if (document.getElementById('attrOrigin')) document.getElementById('attrOrigin').value = 'TH';
    if (document.getElementById('attrMaterial')) document.getElementById('attrMaterial').value = '';
    if (document.getElementById('attrPantsType')) document.getElementById('attrPantsType').value = 'skinny';
    if (document.getElementById('attrLength')) document.getElementById('attrLength').value = 'ankle';
    if (document.getElementById('attrPattern')) document.getElementById('attrPattern').value = 'plain';
    if (document.getElementById('attrStyle')) document.getElementById('attrStyle').value = 'korean';

    // Reset Shipping Info in Tab 5
    const shipW = document.getElementById('shipWeight'); if (shipW) shipW.value = '0.25';
    const shipWd = document.getElementById('shipDimWidth'); if (shipWd) shipWd.value = '15';
    const shipLn = document.getElementById('shipDimLength'); if (shipLn) shipLn.value = '25';
    const shipHg = document.getElementById('shipDimHeight'); if (shipHg) shipHg.value = '5';
    const chkStd = document.getElementById('chkShipStandard'); if (chkStd) chkStd.checked = true;
    const chkExp = document.getElementById('chkShipExpress'); if (chkExp) chkExp.checked = true;

    // Clear batch inputs
    const bPrice = document.getElementById('batchVarPrice'); if (bPrice) bPrice.value = '';
    const bStock = document.getElementById('batchVarStock'); if (bStock) bStock.value = '';
    const bRack = document.getElementById('batchVarRack'); if (bRack) bRack.value = '';

    // Reset SKU Tracker elements
    const tracker = document.getElementById('skuTrackerPanel');
    if (tracker) { tracker.innerHTML = ''; tracker.classList.add('hidden'); }
    const badge = document.getElementById('skuCheckStatusBadge');
    if (badge) { badge.innerHTML = ''; badge.classList.add('hidden'); }
    const icon = document.getElementById('modalSkuStateIcon');
    if (icon) { icon.innerHTML = ''; }
    const inputSku = document.getElementById('modalSku');
    if (inputSku) {
        inputSku.classList.remove('border-rose-400', 'border-emerald-400', 'bg-rose-50/20');
    }

    // Default to Shopee tab 'general' & SINGLE mode
    switchShopeeTab('general');
    switchProductModalMode('SINGLE');
    renderDistributorPresetChips();
    renderCarePresetChips();

    // Reset video state
    InventoryApp.modalVideoUrl = '';
    renderModalVideo();

    // Reset Shopee source tracking
    InventoryApp.currentShopeeUrl = '';
    InventoryApp.currentShopeeItemId = '';

    // Reset Tab 7: URL & Warehouse Location
    const urlInput = document.getElementById('modalProductUrl'); if (urlInput) urlInput.value = '';
    const locNote = document.getElementById('modalLocationNote'); if (locNote) locNote.value = '';
    clearLocationImage();
    const urlStatus = document.getElementById('modalProductUrlStatus'); if (urlStatus) urlStatus.innerHTML = '';

    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('hidden');
}

function editProductModal(id) {
    const item = InventoryApp.products.find(p => p.id === id);
    if (!item) return;

    InventoryApp.editingId = id;

    // Detect parentKey and all sibling group items
    const parentKey = (typeof getParentGroupKey === 'function' ? getParentGroupKey(item) : item.sku).trim().toUpperCase();
    const groupItems = (typeof getParentGroupKey === 'function')
        ? InventoryApp.products.filter(p => getParentGroupKey(p) === parentKey)
        : [item];

    // Restore Shopee URL & Item ID
    InventoryApp.currentShopeeUrl = item.product_url || localStorage.getItem('sgyver_shopee_url_' + parentKey) || localStorage.getItem('sgyver_shopee_url_' + item.sku) || '';
    InventoryApp.currentShopeeItemId = item.item_id || localStorage.getItem('sgyver_shopee_itemid_' + parentKey) || localStorage.getItem('sgyver_shopee_itemid_' + item.sku) || '';

    const hasVariants = groupItems.length > 1 || (item.variant && item.variant.trim() !== '');

    document.getElementById('modalProdId').value = item.id;
    document.getElementById('modalName').value = item.name || '';
    document.getElementById('modalDistributor').value = item.distributor || '';
    document.getElementById('modalCare').value = item.care_instructions || '';

    if (hasVariants) {
        document.getElementById('modalProductTitle').innerText = groupItems.length > 1
            ? `แก้ไขสินค้าหลัก: ${parentKey} (${groupItems.length} ตัวเลือก)`
            : `แก้ไขสินค้า: ${parentKey}`;
        document.getElementById('modalSku').value = parentKey;
        document.getElementById('modalVariant').value = item.variant || '';
        document.getElementById('modalPrice').value = (item.price !== null && item.price !== undefined) ? item.price : '';
        document.getElementById('modalStock').value = item.stock_quantity ?? 0;
        document.getElementById('modalMinAlert').value = item.min_stock_alert ?? 5;
        document.getElementById('modalLocation').value = item.warehouse_location || 'A-01';

        // Load all existing siblings as variants in Tab 4 combinations table
        InventoryApp.modalVariants = groupItems.map(c => ({
            id: c.id,
            variant: c.variant || c.name || '',
            sku: c.sku,
            price: (c.price !== null && c.price !== undefined) ? c.price : '',
            stock_quantity: c.stock_quantity ?? 0,
            min_stock_alert: c.min_stock_alert ?? 5,
            warehouse_location: c.warehouse_location || 'A-01',
            image_url: c.image_url || null
        }));

        switchProductModalMode('VARIANTS');
        renderModalVariantsTable();
    } else {
        document.getElementById('modalProductTitle').innerText = `แก้ไขสินค้า: ${item.sku}`;
        document.getElementById('modalSku').value = item.sku || '';
        document.getElementById('modalVariant').value = item.variant || '';
        document.getElementById('modalPrice').value = (item.price !== null && item.price !== undefined) ? item.price : '';
        document.getElementById('modalStock').value = item.stock_quantity ?? 0;
        document.getElementById('modalMinAlert').value = item.min_stock_alert ?? 5;
        document.getElementById('modalLocation').value = item.warehouse_location || 'A-01';

        InventoryApp.modalVariants = [];
        switchProductModalMode('SINGLE');
    }

    // Load description and update counters
    const descInput = document.getElementById('modalProductDescription');
    const savedDesc = localStorage.getItem('sgyver_desc_' + parentKey) || localStorage.getItem('sgyver_desc_' + item.sku) || '';
    if (descInput) descInput.value = savedDesc || item.care_instructions || '';
    const charCount = document.getElementById('modalNameCharCount');
    if (charCount) charCount.innerText = `${(item.name || '').length}/120`;
    const descCount = document.getElementById('modalDescCharCount');
    if (descCount) descCount.innerText = `${(descInput?.value || '').length}/5000`;

    // Load gallery images with highest priority to cachedGallery (user's explicit saved order)
    let finalGallery = [];
    const cachedGalleryStr = localStorage.getItem('sgyver_gallery_' + parentKey) || localStorage.getItem('sgyver_gallery_' + item.sku);
    if (cachedGalleryStr) {
        try {
            const parsed = JSON.parse(cachedGalleryStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
                finalGallery = parsed.filter(Boolean);
            }
        } catch (e) {}
    }

    // If no cached gallery found, build from item and groupItems
    if (finalGallery.length === 0) {
        if (Array.isArray(item.images)) {
            item.images.forEach(img => {
                if (img && !finalGallery.includes(img)) finalGallery.push(img);
            });
        }
        if (item.image_url && !finalGallery.includes(item.image_url)) {
            finalGallery.unshift(item.image_url);
        }
        groupItems.forEach(gi => {
            if (gi.image_url && !finalGallery.includes(gi.image_url)) finalGallery.push(gi.image_url);
            if (Array.isArray(gi.images)) {
                gi.images.forEach(img => {
                    if (img && !finalGallery.includes(img)) finalGallery.push(img);
                });
            } else if (typeof gi.images === 'string' && gi.images.startsWith('[')) {
                try {
                    const parsed = JSON.parse(gi.images);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(img => {
                            if (img && !finalGallery.includes(img)) finalGallery.push(img);
                        });
                    }
                } catch(e) {}
            }
        });
    }

    // Ensure explicit cached cover image is at index 0 (if user hasn't explicitly saved a custom gallery order)
    const cachedCover = localStorage.getItem('sgyver_img_' + parentKey) || localStorage.getItem('sgyver_img_' + item.sku);
    if (!cachedGalleryStr && cachedCover) {
        const coverIdx = finalGallery.indexOf(cachedCover);
        if (coverIdx > 0) {
            finalGallery.splice(coverIdx, 1);
            finalGallery.unshift(cachedCover);
        } else if (coverIdx === -1) {
            finalGallery.unshift(cachedCover);
        }
    }

    InventoryApp.modalImages = finalGallery.slice(0, 15);
    renderModalGallery();

    // Load Product Video
    const savedVideo = item.video_url || localStorage.getItem('sgyver_video_' + parentKey) || localStorage.getItem('sgyver_video_' + item.sku) || '';
    InventoryApp.modalVideoUrl = savedVideo;
    renderModalVideo();

    // Load Size Chart
    let loadedSizeChart = null;
    const cachedSc = localStorage.getItem('sgyver_sizechart_' + parentKey) || localStorage.getItem('sgyver_sizechart_' + item.sku);
    if (cachedSc) {
        try { loadedSizeChart = JSON.parse(cachedSc); } catch (e) {}
    }
    if (loadedSizeChart && (loadedSizeChart.imageUrl || (loadedSizeChart.rows && loadedSizeChart.rows.length > 0))) {
        InventoryApp.sizeChart = loadedSizeChart;
        switchSizeChartMode(loadedSizeChart.type || (loadedSizeChart.imageUrl ? 'image' : 'form'));
    } else {
        InventoryApp.sizeChart = {
            type: 'image',
            imageUrl: '',
            rows: [{ size: 'Freesize', chest: '32-38"', waist: '24-32"', hip: '34-40"', length: '36"' }]
        };
        switchSizeChartMode('image');
    }

    // Populate category from item.product_type
    populateModalCategories(item.product_type || localStorage.getItem('sgyver_cat_' + parentKey) || 'เสื้อผ้าแฟชั่น');
    updateTab2CategoryBadge();
    loadSavedAttributeOptions();

    // Load Standard Tab 2 Attributes
    const savedTab2 = localStorage.getItem('sgyver_tab2_attrs_' + parentKey) || localStorage.getItem('sgyver_tab2_attrs_' + item.sku);
    if (savedTab2) {
        try {
            const t2 = JSON.parse(savedTab2);
            if (document.getElementById('attrBrand') && t2.brand) document.getElementById('attrBrand').value = t2.brand;
            if (document.getElementById('attrPlusSize') && t2.plusSize) document.getElementById('attrPlusSize').value = t2.plusSize;
            if (document.getElementById('attrOrigin') && t2.origin) document.getElementById('attrOrigin').value = t2.origin;
            if (document.getElementById('attrMaterial') && t2.material !== undefined) document.getElementById('attrMaterial').value = t2.material;
            if (document.getElementById('attrPantsType') && t2.pantsType) document.getElementById('attrPantsType').value = t2.pantsType;
            if (document.getElementById('attrLength') && t2.length) document.getElementById('attrLength').value = t2.length;
            if (document.getElementById('attrPattern') && t2.pattern) document.getElementById('attrPattern').value = t2.pattern;
            if (document.getElementById('attrStyle') && t2.style) document.getElementById('attrStyle').value = t2.style;
        } catch(e) {}
    }

    // Load Custom Attributes in Tab 2
    const customList = document.getElementById('customAttributesList');
    if (customList) customList.innerHTML = '';
    const cachedAttrs = localStorage.getItem('sgyver_attrs_' + parentKey) || localStorage.getItem('sgyver_attrs_' + item.sku);
    if (cachedAttrs) {
        try {
            const parsedAttrs = JSON.parse(cachedAttrs);
            if (Array.isArray(parsedAttrs) && parsedAttrs.length > 0) {
                parsedAttrs.forEach(a => addCustomAttributeRow(a.name, a.value));
            }
        } catch(e) {}
    }
    checkCustomAttributesEmpty();

    // Load Shipping Info in Tab 5
    const cachedShip = localStorage.getItem('sgyver_shipping_' + parentKey) || localStorage.getItem('sgyver_shipping_' + item.sku);
    if (cachedShip) {
        try {
            const s = JSON.parse(cachedShip);
            if (document.getElementById('shipWeight') && s.weight !== undefined) document.getElementById('shipWeight').value = s.weight;
            if (document.getElementById('shipDimWidth') && s.width !== undefined) document.getElementById('shipDimWidth').value = s.width;
            if (document.getElementById('shipDimLength') && s.length !== undefined) document.getElementById('shipDimLength').value = s.length;
            if (document.getElementById('shipDimHeight') && s.height !== undefined) document.getElementById('shipDimHeight').value = s.height;
            if (document.getElementById('chkShipStandard') && s.standard !== undefined) document.getElementById('chkShipStandard').checked = s.standard;
            if (document.getElementById('chkShipExpress') && s.express !== undefined) document.getElementById('chkShipExpress').checked = s.express;
        } catch(e) {}
    } else {
        if (document.getElementById('shipWeight')) document.getElementById('shipWeight').value = '0.25';
        if (document.getElementById('shipDimWidth')) document.getElementById('shipDimWidth').value = '15';
        if (document.getElementById('shipDimLength')) document.getElementById('shipDimLength').value = '25';
        if (document.getElementById('shipDimHeight')) document.getElementById('shipDimHeight').value = '5';
        if (document.getElementById('chkShipStandard')) document.getElementById('chkShipStandard').checked = true;
        if (document.getElementById('chkShipExpress')) document.getElementById('chkShipExpress').checked = true;
    }

    // Reset SKU Tracker elements
    const tracker = document.getElementById('skuTrackerPanel');
    if (tracker) { tracker.innerHTML = ''; tracker.classList.add('hidden'); }
    const badge = document.getElementById('skuCheckStatusBadge');
    if (badge) { badge.innerHTML = ''; badge.classList.add('hidden'); }
    const icon = document.getElementById('modalSkuStateIcon');
    if (icon) { icon.innerHTML = ''; }

    // Restore Tab 7: URL & Warehouse Location
    const pUrl = item.product_url || localStorage.getItem('sgyver_product_url_' + parentKey) || localStorage.getItem('sgyver_product_url_' + item.sku) || localStorage.getItem('sgyver_shopee_url_' + parentKey) || localStorage.getItem('sgyver_shopee_url_' + item.sku) || '';
    const pNote = item.location_note || localStorage.getItem('sgyver_loc_note_' + parentKey) || localStorage.getItem('sgyver_loc_note_' + item.sku) || '';
    const pLocImg = item.location_image || localStorage.getItem('sgyver_loc_img_' + parentKey) || localStorage.getItem('sgyver_loc_img_' + item.sku) || '';

    const urlInput = document.getElementById('modalProductUrl'); if (urlInput) urlInput.value = pUrl;
    const locNote = document.getElementById('modalLocationNote'); if (locNote) locNote.value = pNote;
    setLocationImage(pLocImg);
    checkModalProductUrlDuplicate();

    // Start on Shopee tab 'general'
    switchShopeeTab('general');
    renderDistributorPresetChips();
    renderCarePresetChips();

    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('hidden');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.add('hidden');
}

function generateRandomSkuModal() {
    // 1. Determine active category abbreviation prefix (e.g. WM-PNT-PAG)
    let prefix = '';
    const dispSku = document.getElementById('displayModalCategorySku');
    if (dispSku && dispSku.textContent.trim()) {
        prefix = dispSku.textContent.trim().toUpperCase();
    }
    if (!prefix) {
        const selCat = document.getElementById('modalCategory');
        prefix = selCat?.options[selCat.selectedIndex]?.getAttribute('data-prefix');
    }
    if (!prefix) {
        prefix = 'GEN';
    }

    // 2. Inspect existing products to find highest sequence number for this prefix
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}[-_]?(\\d+)$`, 'i');

    let maxSeq = 0;
    let numDigits = 3;
    const products = InventoryApp.products || [];
    products.forEach(p => {
        const sku = (p.sku || '').trim().toUpperCase();
        const m = sku.match(regex);
        if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
                numDigits = Math.max(numDigits, m[1].length);
            }
        }
    });

    // 3. Also check current value in #modalSku:
    // If the input already contains e.g. "WM-PNT-PAG-001" and user clicks "สุ่มรหัส", increment to "WM-PNT-PAG-002"!
    const currentVal = (document.getElementById('modalSku')?.value || '').trim().toUpperCase();
    const curMatch = currentVal.match(regex);
    if (curMatch) {
        const curNum = parseInt(curMatch[1], 10);
        if (!isNaN(curNum) && curNum >= maxSeq) {
            maxSeq = curNum;
            numDigits = Math.max(numDigits, curMatch[1].length);
        }
    }

    const nextSeq = String(maxSeq + 1).padStart(numDigits, '0');
    const newSku = `${prefix}-${nextSeq}`;

    const inputSku = document.getElementById('modalSku');
    if (inputSku) {
        inputSku.value = newSku;
        onModalSkuInput(newSku);
    }
}

// Resilient upsert helper that automatically updates by ID if ID exists, or upserts by SKU.
// Automatically filters to allowed database columns and recovers from missing schema columns.
const SUPABASE_ALLOWED_COLUMNS = new Set([
    'sku', 'name', 'variant', 'price', 'distributor', 'care_instructions',
    'barcode_type', 'stock_quantity', 'min_stock_alert', 'warehouse_location',
    'image_url', 'images', 'product_type', 'created_at', 'updated_at',
    // Optional schema columns (if added in Supabase):
    'parent_sku', 'product_url', 'item_id', 'location_note', 'location_image', 'video_url'
]);

async function safeSupabaseUpsert(data) {
    if (!InventoryApp.supabaseClient) return { error: null };
    const isArray = Array.isArray(data);
    const list = isArray ? data : [data];

    try {
        for (const item of list) {
            // Only send known columns to Supabase
            const cleanItem = {};
            for (const [k, v] of Object.entries(item)) {
                if (SUPABASE_ALLOWED_COLUMNS.has(k) && v !== undefined) {
                    cleanItem[k] = v;
                }
            }
            const id = item.id;

            if (id) {
                // Direct update by ID - immune to unique constraint or pkey duplicate conflicts
                for (let attempt = 0; attempt < 10; attempt++) {
                    const { error } = await InventoryApp.supabaseClient
                        .from('product_labels')
                        .update(cleanItem)
                        .eq('id', id);
                    if (!error) break;
                    console.warn(`Update attempt ${attempt + 1} notice for id ${id}:`, error.message);
                    const m = error.message?.match(/Could not find the ['"]?([^'"\s]+)['"]? column/i);
                    if (m && cleanItem[m[1]] !== undefined) {
                        SUPABASE_ALLOWED_COLUMNS.delete(m[1]); // remember not in database so future saves skip it
                        delete cleanItem[m[1]];
                        continue;
                    }
                    break;
                }
            } else {
                // Insert or upsert by SKU
                for (let attempt = 0; attempt < 10; attempt++) {
                    const check = await InventoryApp.supabaseClient
                        .from('product_labels')
                        .select('id')
                        .eq('sku', cleanItem.sku)
                        .maybeSingle();

                    if (check.data && check.data.id) {
                        const { error } = await InventoryApp.supabaseClient
                            .from('product_labels')
                            .update(cleanItem)
                            .eq('id', check.data.id);
                        if (!error) break;
                        const m = error.message?.match(/Could not find the ['"]?([^'"\s]+)['"]? column/i);
                        if (m && cleanItem[m[1]] !== undefined) {
                            SUPABASE_ALLOWED_COLUMNS.delete(m[1]);
                            delete cleanItem[m[1]];
                            continue;
                        }
                    } else {
                        const { error } = await InventoryApp.supabaseClient
                            .from('product_labels')
                            .insert(cleanItem);
                        if (!error) break;
                        const m = error.message?.match(/Could not find the ['"]?([^'"\s]+)['"]? column/i);
                        if (m && cleanItem[m[1]] !== undefined) {
                            SUPABASE_ALLOWED_COLUMNS.delete(m[1]);
                            delete cleanItem[m[1]];
                            continue;
                        }
                    }
                    break;
                }
            }
        }
        return { error: null };
    } catch (err) {
        console.warn('safeSupabaseUpsert caught exception (local save proceeds):', err);
        return { error: null };
    }
}

async function handleSaveProductModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const saveBtn = document.getElementById('btnSaveModalProd');

    const parentSku = (document.getElementById('modalSku')?.value || '').trim().toUpperCase();
    const name = (document.getElementById('modalName')?.value || '').trim();
    const category = (document.getElementById('modalCategory')?.value || document.getElementById('displayModalCategory')?.textContent || 'เสื้อผ้าแฟชั่น').trim();
    const distributor = (document.getElementById('modalDistributor')?.value || '').trim();
    const care_instructions = (document.getElementById('modalCare')?.value || '').trim();

    if (!parentSku || !name) {
        if (!name) {
            switchShopeeTab('general');
            const nameEl = document.getElementById('modalName');
            if (nameEl) {
                nameEl.focus();
                nameEl.classList.add('border-rose-500', 'ring-2', 'ring-rose-200');
                setTimeout(() => nameEl.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200'), 3000);
            }
            alert('กรุณากรอก "ชื่อสินค้า" ก่อนบันทึกครับ');
        } else if (!parentSku) {
            switchShopeeTab('general');
            const skuEl = document.getElementById('modalSku');
            if (skuEl) {
                skuEl.focus();
                skuEl.classList.add('border-rose-500', 'ring-2', 'ring-rose-200');
                setTimeout(() => skuEl.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200'), 3000);
            }
            alert('กรุณากรอก "รหัส SKU" ก่อนบันทึกครับ');
        }
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
        }
        return;
    }

    // Safety Collision Check: If creating a NEW product (!InventoryApp.editingId)
    // ensure parentSku does not accidentally overwrite an existing product
    if (!InventoryApp.editingId && !InventoryApp.isMergingVariants) {
        // Check SKU collision
        const existingCollided = (InventoryApp.products || []).find(p => {
            const ps = (p.parent_sku || '').trim().toUpperCase();
            const pk = (typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : '').trim().toUpperCase();
            const s = (p.sku || '').trim().toUpperCase();
            return (ps === parentSku || pk === parentSku || s === parentSku || s.startsWith(parentSku + '-'));
        });

        if (existingCollided) {
            // Check if there are newly arrived variants for this existing product
            const mergeStatus = analyzeVariantMergeStatus(parentSku, InventoryApp.modalVariants);
            if (mergeStatus && mergeStatus.hasExisting) {
                if (mergeStatus.newVariants.length > 0) {
                    const wantMerge = confirm(
                        `✨ ตรวจพบสินค้าเดิมในคลัง: "${existingCollided.name}" (${parentSku})\n\n` +
                        `มีตัวเลือกใหม่ที่ยังไม่มีในคลัง ${mergeStatus.newVariants.length} รายการ:\n` +
                        `(${mergeStatus.newVariants.map(v => v.variant).join(', ')})\n\n` +
                        `ต้องการเพิ่ม "เฉพาะตัวเลือกใหม่นี้" เข้าโพสต์เดิมหรือไม่?\n\n` +
                        `• กด "OK" เพื่อเพิ่มเฉพาะตัวเลือกใหม่ต่อท้าย (ตัวเลือกเดิมไม่หาย ไม่ลงซ้ำ)\n` +
                        `• กด "Cancel" เพื่อเปลี่ยนเป็นรหัสสินค้าใหม่ถัดไป`
                    );
                    if (wantMerge) {
                        applyOnlyNewVariantsMerge(parentSku);
                        return handleSaveProductModal(event);
                    }
                } else {
                    alert(`⚠️ สินค้า "${existingCollided.name}" (${parentSku}) มีอยู่ในคลังแล้วครบทุกตัวเลือก (${mergeStatus.duplicateVariants.length} รายการ)\n\nระบบไม่อนุญาตให้ลงซ้ำเพื่อป้องกันโพสต์เบิ้ลครับ`);
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
                    }
                    return;
                }
            }

            const info = inspectSkuPrefix(parentSku);
            const nextSku = info ? info.nextSku : `${parentSku}-002`;
            const acceptNext = confirm(
                `⚠️ รหัสสินค้าหลัก "${parentSku}" ซ้ำกับสินค้าเดิมในคลัง:\n"${existingCollided.name}"\n\n` +
                `หากใช้รหัสเดิม สินค้าเดิมจะถูกเขียนทับจนหายไป!\n\n` +
                `กด "OK" เพื่อเปลี่ยนไปใช้รหัสว่างถัดไป (${nextSku}) อัตโนมัติ\n` +
                `กด "Cancel" เพื่อกลับไปแก้ไขรหัสด้วยตนเอง`
            );
            if (acceptNext) {
                const skuInput = document.getElementById('modalSku');
                if (skuInput) {
                    skuInput.value = nextSku;
                    onModalSkuInput(nextSku);
                }
                return handleSaveProductModal(event);
            } else {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
                }
                return;
            }
        }
    }

    // Auto-capture any pending image URLs typed in the input
    const pendingInput = document.getElementById('modalAddImageUrlInput');
    if (pendingInput && pendingInput.value.trim()) {
        const urls = pendingInput.value.trim().split(/[\r\n,]+/).map(u => u.trim()).filter(Boolean);
        urls.forEach(u => {
            if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/')) {
                if (!InventoryApp.modalImages) InventoryApp.modalImages = [];
                if (!InventoryApp.modalImages.includes(u) && InventoryApp.modalImages.length < 15) {
                    InventoryApp.modalImages.push(u);
                }
            }
        });
        pendingInput.value = '';
    }

    // The gallery order in InventoryApp.modalImages is the user's chosen order
    // Image #1 (index 0) is ALWAYS the cover image!
    const galleryImages = InventoryApp.modalImages || [];
    const coverImage = galleryImages.length > 0 ? galleryImages[0] : '';

    // Original parent group key if we are editing an existing product
    const editingItem = InventoryApp.editingId ? InventoryApp.products.find(p => p.id === InventoryApp.editingId) : null;
    const origParentKey = editingItem ? ((typeof getParentGroupKey === 'function' ? getParentGroupKey(editingItem) : editingItem.sku) || parentSku).trim().toUpperCase() : parentSku;

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin text-sm"></i> <span>กำลังบันทึก...</span>';
    }

    // Cache cover & gallery in localStorage under BOTH parentSku AND origParentKey
    if (coverImage) {
        localStorage.setItem('sgyver_img_' + parentSku, coverImage);
        if (origParentKey && origParentKey !== parentSku) {
            localStorage.setItem('sgyver_img_' + origParentKey, coverImage);
        }
    } else {
        localStorage.removeItem('sgyver_img_' + parentSku);
        if (origParentKey) localStorage.removeItem('sgyver_img_' + origParentKey);
    }

    if (galleryImages.length > 0) {
        localStorage.setItem('sgyver_gallery_' + parentSku, JSON.stringify(galleryImages));
        if (origParentKey && origParentKey !== parentSku) {
            localStorage.setItem('sgyver_gallery_' + origParentKey, JSON.stringify(galleryImages));
        }
    } else {
        localStorage.removeItem('sgyver_gallery_' + parentSku);
        if (origParentKey) localStorage.removeItem('sgyver_gallery_' + origParentKey);
    }

    // Cache Product Video in localStorage
    if (InventoryApp.modalVideoUrl) {
        localStorage.setItem('sgyver_video_' + parentSku, InventoryApp.modalVideoUrl);
        if (origParentKey && origParentKey !== parentSku) {
            localStorage.setItem('sgyver_video_' + origParentKey, InventoryApp.modalVideoUrl);
        }
    } else {
        localStorage.removeItem('sgyver_video_' + parentSku);
        if (origParentKey) localStorage.removeItem('sgyver_video_' + origParentKey);
    }

    const description = (document.getElementById('modalProductDescription')?.value || '').trim();
    if (description) {
        localStorage.setItem('sgyver_desc_' + parentSku, description);
        if (origParentKey) localStorage.setItem('sgyver_desc_' + origParentKey, description);
    }

    // Collect & save Size Chart in localStorage
    const sizeChartData = collectSizeChartData();
    localStorage.setItem('sgyver_sizechart_' + parentSku, JSON.stringify(sizeChartData));
    if (origParentKey) localStorage.setItem('sgyver_sizechart_' + origParentKey, JSON.stringify(sizeChartData));

    // Collect & save Tab 2 Standard Attributes in localStorage
    const tab2Attrs = {
        brand: document.getElementById('attrBrand')?.value || 'No brand',
        plusSize: document.getElementById('attrPlusSize')?.value || 'no',
        origin: document.getElementById('attrOrigin')?.value || 'TH',
        material: (document.getElementById('attrMaterial')?.value || '').trim(),
        pantsType: document.getElementById('attrPantsType')?.value || 'skinny',
        length: document.getElementById('attrLength')?.value || 'ankle',
        pattern: document.getElementById('attrPattern')?.value || 'plain',
        style: document.getElementById('attrStyle')?.value || 'korean'
    };
    localStorage.setItem('sgyver_tab2_attrs_' + parentSku, JSON.stringify(tab2Attrs));
    if (origParentKey) localStorage.setItem('sgyver_tab2_attrs_' + origParentKey, JSON.stringify(tab2Attrs));

    // Collect & save Shipping Info in localStorage
    const shippingData = {
        weight: parseFloat(document.getElementById('shipWeight')?.value || 0.25),
        width: parseFloat(document.getElementById('shipDimWidth')?.value || 15),
        length: parseFloat(document.getElementById('shipDimLength')?.value || 25),
        height: parseFloat(document.getElementById('shipDimHeight')?.value || 5),
        standard: document.getElementById('chkShipStandard')?.checked ?? true,
        express: document.getElementById('chkShipExpress')?.checked ?? true
    };
    localStorage.setItem('sgyver_shipping_' + parentSku, JSON.stringify(shippingData));
    if (origParentKey) localStorage.setItem('sgyver_shipping_' + origParentKey, JSON.stringify(shippingData));

    // Collect & save Custom Attributes in localStorage
    const customAttrRows = Array.from(document.querySelectorAll('#customAttributesList > div'));
    const customAttrs = customAttrRows.map(row => ({
        name: (row.querySelector('.custom-attr-name')?.value || '').trim(),
        value: (row.querySelector('.custom-attr-value')?.value || '').trim()
    })).filter(a => a.name || a.value);
    if (customAttrs.length > 0) {
        localStorage.setItem('sgyver_attrs_' + parentSku, JSON.stringify(customAttrs));
        if (origParentKey) localStorage.setItem('sgyver_attrs_' + origParentKey, JSON.stringify(customAttrs));
    } else {
        localStorage.removeItem('sgyver_attrs_' + parentSku);
        if (origParentKey) localStorage.removeItem('sgyver_attrs_' + origParentKey);
    }

    // Tab 7: URL & Warehouse Location
    const productUrl = (document.getElementById('modalProductUrl')?.value || '').trim() || InventoryApp.currentShopeeUrl || '';
    const locationNote = (document.getElementById('modalLocationNote')?.value || '').trim();
    const locationImage = (document.getElementById('modalLocationImageUrl')?.value || '').trim();

    if (productUrl) {
        localStorage.setItem('sgyver_product_url_' + parentSku, productUrl);
        if (origParentKey) localStorage.setItem('sgyver_product_url_' + origParentKey, productUrl);
        localStorage.setItem('sgyver_shopee_url_' + parentSku, productUrl);
        if (origParentKey) localStorage.setItem('sgyver_shopee_url_' + origParentKey, productUrl);
    } else {
        localStorage.removeItem('sgyver_product_url_' + parentSku);
        if (origParentKey) localStorage.removeItem('sgyver_product_url_' + origParentKey);
    }
    if (locationNote) {
        localStorage.setItem('sgyver_loc_note_' + parentSku, locationNote);
        if (origParentKey) localStorage.setItem('sgyver_loc_note_' + origParentKey, locationNote);
    } else {
        localStorage.removeItem('sgyver_loc_note_' + parentSku);
        if (origParentKey) localStorage.removeItem('sgyver_loc_note_' + origParentKey);
    }
    if (locationImage) {
        localStorage.setItem('sgyver_loc_img_' + parentSku, locationImage);
        if (origParentKey) localStorage.setItem('sgyver_loc_img_' + origParentKey, locationImage);
    } else {
        localStorage.removeItem('sgyver_loc_img_' + parentSku);
        if (origParentKey) localStorage.removeItem('sgyver_loc_img_' + origParentKey);
    }

    if (InventoryApp.currentShopeeItemId) {
        localStorage.setItem('sgyver_shopee_itemid_' + parentSku, InventoryApp.currentShopeeItemId);
        if (origParentKey && origParentKey !== parentSku) {
            localStorage.setItem('sgyver_shopee_itemid_' + origParentKey, InventoryApp.currentShopeeItemId);
        }
    }
    if (productUrl || InventoryApp.currentShopeeItemId) {
        localStorage.setItem('sgyver_shopee_time_' + parentSku, new Date().toLocaleString('th-TH'));
    }

    try {
        if (InventoryApp.productModalMode === 'VARIANTS') {
            // Validate multi-variants
            if (!InventoryApp.modalVariants || InventoryApp.modalVariants.length === 0) {
                alert('กรุณาเพิ่มตัวเลือกย่อยอย่างน้อย 1 รายการ');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
                }
                return;
            }

            for (let i = 0; i < InventoryApp.modalVariants.length; i++) {
                const v = InventoryApp.modalVariants[i];
                if (!v.sku || !v.sku.trim()) {
                    alert(`กรุณาระบุรหัส SKU ย่อยในแถวที่ ${i + 1}`);
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
                    }
                    return;
                }
                if (!v.variant || !v.variant.trim()) {
                    alert(`กรุณาระบุชื่อตัวเลือกในแถวที่ ${i + 1}`);
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
                    }
                    return;
                }
            }

            const payloads = InventoryApp.modalVariants.map(v => {
                const subSku = v.sku.trim().toUpperCase();
                const variantImg = v.image_url || coverImage || null;
                if (variantImg) localStorage.setItem('sgyver_img_' + subSku, variantImg);
                if (galleryImages.length > 0) localStorage.setItem('sgyver_gallery_' + subSku, JSON.stringify(galleryImages));
                localStorage.setItem('sgyver_parent_sku_' + subSku, parentSku);
                localStorage.setItem('sgyver_sizechart_' + subSku, JSON.stringify(sizeChartData));
                if (customAttrs.length > 0) localStorage.setItem('sgyver_attrs_' + subSku, JSON.stringify(customAttrs));
                localStorage.setItem('sgyver_tab2_attrs_' + subSku, JSON.stringify(tab2Attrs));
                localStorage.setItem('sgyver_shipping_' + subSku, JSON.stringify(shippingData));
                if (productUrl) localStorage.setItem('sgyver_product_url_' + subSku, productUrl);
                if (locationNote) localStorage.setItem('sgyver_loc_note_' + subSku, locationNote);
                if (locationImage) localStorage.setItem('sgyver_loc_img_' + subSku, locationImage);
                if (InventoryApp.modalVideoUrl) {
                    localStorage.setItem('sgyver_video_' + subSku, InventoryApp.modalVideoUrl);
                } else {
                    localStorage.removeItem('sgyver_video_' + subSku);
                }

                const itemPayload = {
                    sku: subSku,
                    parent_sku: parentSku,
                    name: name,
                    product_type: category,
                    image_url: variantImg,
                    images: galleryImages, // All variants share the user's gallery with Image #1 as cover
                    video_url: InventoryApp.modalVideoUrl || null,
                    variant: v.variant.trim(),
                    price: v.price !== null && v.price !== undefined && v.price !== '' ? parseFloat(v.price) : null,
                    stock_quantity: parseInt(v.stock_quantity ?? 0, 10),
                    min_stock_alert: parseInt(v.min_stock_alert ?? 5, 10),
                    warehouse_location: (v.warehouse_location || 'A-01').trim().toUpperCase(),
                    distributor,
                    care_instructions,
                    product_url: productUrl || InventoryApp.currentShopeeUrl || (v.product_url || null),
                    item_id: InventoryApp.currentShopeeItemId || (v.item_id || null),
                    location_note: locationNote || null,
                    location_image: locationImage || null,
                    updated_at: new Date().toISOString()
                };
                if (v.id) {
                    itemPayload.id = v.id;
                }
                return itemPayload;
            });

            localStorage.setItem('sgyver_cat_' + parentSku, category);
            if (origParentKey) localStorage.setItem('sgyver_cat_' + origParentKey, category);

            // Update in-memory InventoryApp.products immediately so the card grid reflects it now
            if (Array.isArray(InventoryApp.products)) {
                payloads.forEach(item => {
                    const existing = InventoryApp.products.find(p => (item.id && p.id === item.id) || (p.sku && p.sku.toUpperCase() === item.sku.toUpperCase()));
                    if (existing) {
                        Object.assign(existing, item);
                    } else {
                        InventoryApp.products.push({ ...item, id: Date.now() + Math.floor(Math.random() * 1000) });
                    }
                });
            }

            // Persist to local cache so reload never loses items!
            saveCustomProductsToLocalCache();

            closeProductModal();
            calculateMetrics(InventoryApp.products);
            renderTable();

            // Background upsert to Supabase
            await safeSupabaseUpsert(payloads);

            if (InventoryApp.isMergingVariants) {
                alert(`บันทึกสำเร็จ! เพิ่มเฉพาะตัวเลือกใหม่ ${payloads.length} รายการ เข้าสู่สินค้าหลัก "${parentSku}" เรียบร้อยแล้ว (ตัวเลือกเดิมในคลังยังอยู่ครบถ้วน ไม่ลงตัวเลือกซ้ำ)`);
                InventoryApp.isMergingVariants = false;
                InventoryApp.mergingParentSku = null;
            } else {
                alert(`บันทึกสินค้าหลัก "${parentSku}" พร้อมรูปภาพแกลเลอรี (${galleryImages.length} รูป) และตัวเลือกย่อย ${payloads.length} รายการเรียบร้อยแล้ว!`);
            }

        } else {
            // SINGLE Mode
            const variant = (document.getElementById('modalVariant')?.value || '').trim();
            const priceVal = document.getElementById('modalPrice')?.value;
            const price = priceVal !== '' ? parseFloat(priceVal) : null;
            const stockVal = document.getElementById('modalStock')?.value;
            const stock_quantity = stockVal !== '' ? parseInt(stockVal, 10) : 0;
            const minVal = document.getElementById('modalMinAlert')?.value;
            const min_stock_alert = minVal !== '' ? parseInt(minVal, 10) : 5;
            const warehouse_location = (document.getElementById('modalLocation')?.value || 'A-01').trim().toUpperCase();

            if (coverImage) {
                localStorage.setItem('sgyver_img_' + parentSku, coverImage);
                if (origParentKey) localStorage.setItem('sgyver_img_' + origParentKey, coverImage);
            }
            if (galleryImages.length > 0) {
                localStorage.setItem('sgyver_gallery_' + parentSku, JSON.stringify(galleryImages));
                if (origParentKey) localStorage.setItem('sgyver_gallery_' + origParentKey, JSON.stringify(galleryImages));
            }
            localStorage.setItem('sgyver_parent_sku_' + parentSku, parentSku);
            if (origParentKey) localStorage.setItem('sgyver_parent_sku_' + origParentKey, parentSku);
            localStorage.setItem('sgyver_cat_' + parentSku, category);
            localStorage.setItem('sgyver_tab2_attrs_' + parentSku, JSON.stringify(tab2Attrs));
            localStorage.setItem('sgyver_shipping_' + parentSku, JSON.stringify(shippingData));
            if (productUrl) localStorage.setItem('sgyver_product_url_' + parentSku, productUrl);
            if (locationNote) localStorage.setItem('sgyver_loc_note_' + parentSku, locationNote);
            if (locationImage) localStorage.setItem('sgyver_loc_img_' + parentSku, locationImage);

            if (InventoryApp.modalVideoUrl) {
                localStorage.setItem('sgyver_video_' + parentSku, InventoryApp.modalVideoUrl);
                if (origParentKey) localStorage.setItem('sgyver_video_' + origParentKey, InventoryApp.modalVideoUrl);
            } else {
                localStorage.removeItem('sgyver_video_' + parentSku);
                if (origParentKey) localStorage.removeItem('sgyver_video_' + origParentKey);
            }

            const payload = {
                sku: parentSku,
                parent_sku: parentSku,
                name,
                product_type: category,
                image_url: coverImage || null,
                images: galleryImages,
                video_url: InventoryApp.modalVideoUrl || null,
                variant,
                price,
                stock_quantity,
                min_stock_alert,
                warehouse_location,
                distributor,
                care_instructions,
                product_url: productUrl || InventoryApp.currentShopeeUrl || (InventoryApp.editingId ? InventoryApp.products.find(p=>p.id===InventoryApp.editingId)?.product_url : null) || null,
                item_id: InventoryApp.currentShopeeItemId || (InventoryApp.editingId ? InventoryApp.products.find(p=>p.id===InventoryApp.editingId)?.item_id : null) || null,
                location_note: locationNote || null,
                location_image: locationImage || null,
                updated_at: new Date().toISOString()
            };
            if (InventoryApp.editingId) {
                const editingItem = InventoryApp.products.find(p => p.id === InventoryApp.editingId);
                if (editingItem) {
                    payload.id = editingItem.id;
                }
            }

            // Update in-memory InventoryApp.products immediately
            if (Array.isArray(InventoryApp.products)) {
                const existing = InventoryApp.products.find(p => (payload.id && p.id === payload.id) || (p.sku && p.sku.toUpperCase() === payload.sku.toUpperCase()));
                if (existing) {
                    Object.assign(existing, payload);
                } else {
                    InventoryApp.products.push({ ...payload, id: Date.now() + Math.floor(Math.random() * 1000) });
                }
            }

            // Persist to local cache so reload never loses items!
            saveCustomProductsToLocalCache();

            closeProductModal();
            calculateMetrics(InventoryApp.products);
            renderTable();

            await safeSupabaseUpsert(payload);

            alert(`บันทึกข้อมูลสินค้า (หมวด: ${category}) พร้อมรูปภาพแกลเลอรี ${galleryImages.length} รูปเรียบร้อยแล้ว`);
        }

    } catch (err) {
        console.error('Save product modal error:', err);
        alert('ไม่สามารถบันทึกได้: ' + (err.message || err));
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill text-sm"></i> <span>บันทึกข้อมูลสินค้า</span>';
        }
    }
}

async function deleteProduct(id) {
    const item = InventoryApp.products.find(p => p.id === id);
    if (!item) return;

    if (!confirm(`ยืนยันการลบสินค้า SKU: "${item.sku}" ออกจากคลังใช่หรือไม่?`)) return;

    try {
        InventoryApp.products = InventoryApp.products.filter(p => p.id !== id);
        saveCustomProductsToLocalCache();

        if (InventoryApp.supabaseClient) {
            const { error } = await InventoryApp.supabaseClient
                .from('product_labels')
                .delete()
                .eq('id', id);

            if (error) console.warn('Supabase delete warning:', error.message);
        }

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
    link.setAttribute('download', `inventory_${new Date().toISOString().slice(0, 10)}.csv`);
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

// ==============================================================================
// 7. SHOPEE EXCEL & CSV MASS IMPORT ENGINE
// ==============================================================================
const ShopeeImportState = {
    selectedFile: null,
    parsedRows: [],
    newItems: [],
    existingItems: [],
    invalidItems: [],
    previewTab: 'ALL', // 'ALL', 'NEW', 'EXISTING', 'SKIP'
    isProcessing: false
};

function openShopeeImportModal(shouldReset = true) {
    const modal = document.getElementById('shopeeImportModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    if (shouldReset) {
        resetShopeeImport();
    }
}

function closeShopeeImportModal() {
    if (ShopeeImportState.isProcessing) {
        if (!confirm('กำลังนำเข้าข้อมูลอยู่ ยืนยันที่จะปิดหน้าต่างใช่หรือไม่?')) return;
    }
    const modal = document.getElementById('shopeeImportModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    resetShopeeImport();
}

function resetShopeeImport() {
    ShopeeImportState.selectedFile = null;
    ShopeeImportState.parsedRows = [];
    ShopeeImportState.newItems = [];
    ShopeeImportState.existingItems = [];
    ShopeeImportState.invalidItems = [];
    ShopeeImportState.isProcessing = false;

    const fileInput = document.getElementById('shopeeFileInput');
    if (fileInput) fileInput.value = '';

    const dropzone = document.getElementById('shopeeDropzone');
    if (dropzone) dropzone.classList.remove('hidden');

    const fileInfo = document.getElementById('shopeeFileInfo');
    if (fileInfo) fileInfo.classList.add('hidden');

    const analysisSection = document.getElementById('shopeeAnalysisSection');
    if (analysisSection) analysisSection.classList.add('hidden');

    const progressContainer = document.getElementById('shopeeProgressContainer');
    if (progressContainer) progressContainer.classList.add('hidden');

    const btnConfirm = document.getElementById('btnConfirmShopeeImport');
    if (btnConfirm) {
        btnConfirm.disabled = true;
        document.getElementById('btnConfirmShopeeText').innerText = 'กรุณาเลือกไฟล์ก่อน';
    }

    const btnReset = document.getElementById('btnResetShopeeModal');
    if (btnReset) btnReset.classList.add('hidden');

    const tbody = document.getElementById('shopeePreviewTbody');
    if (tbody) tbody.innerHTML = '';
}

function handleShopeeDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('shopeeDropzone');
    if (dropzone) {
        dropzone.classList.add('border-orange-500', 'bg-orange-50/50');
    }
}

function handleShopeeDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('shopeeDropzone');
    if (dropzone) {
        dropzone.classList.remove('border-orange-500', 'bg-orange-50/50');
    }
}

function handleShopeeDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('shopeeDropzone');
    if (dropzone) {
        dropzone.classList.remove('border-orange-500', 'bg-orange-50/50');
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        processShopeeFile(files[0]);
    }
}

function handleShopeeFileSelect(e) {
    const file = e.target?.files?.[0];
    if (file) {
        processShopeeFile(file);
    }
}

async function processShopeeFile(file) {
    if (!file) return;

    const validExts = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExts.some(ext => fileName.endsWith(ext));

    if (!isValid) {
        alert('กรุณาเลือกไฟล์ Excel (.xlsx, .xls) หรือ .csv จาก Shopee เท่านั้น');
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('ไม่พบไลบรารี SheetJS (XLSX) กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
        return;
    }

    ShopeeImportState.selectedFile = file;

    // Show File Chip
    const fileInfo = document.getElementById('shopeeFileInfo');
    const fileNameEl = document.getElementById('shopeeFileName');
    const fileSizeEl = document.getElementById('shopeeFileSize');
    if (fileInfo && fileNameEl && fileSizeEl) {
        fileNameEl.innerText = file.name;
        fileSizeEl.innerText = `(${(file.size / 1024).toFixed(1)} KB)`;
        fileInfo.classList.remove('hidden');
    }

    const btnReset = document.getElementById('btnResetShopeeModal');
    if (btnReset) btnReset.classList.remove('hidden');

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel นี้');
        }

        // Pick first sheet or sheet with relevant name
        let sheetName = workbook.SheetNames[0];
        for (const name of workbook.SheetNames) {
            const lower = name.toLowerCase();
            if (lower.includes('template') || lower.includes('สินค้า') || lower.includes('mass') || lower.includes('product')) {
                sheetName = name;
                break;
            }
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length < 2) {
            throw new Error('ไฟล์ว่างเปล่า หรือไม่มีข้อมูลสินค้า');
        }

        // Detect Header Row & Extract Normalized Items
        parseShopeeRawRows(rawRows);

    } catch (err) {
        console.error('Shopee file parsing error:', err);
        alert('ไม่สามารถอ่านไฟล์ได้: ' + (err.message || err));
        resetShopeeImport();
    }
}

function parseShopeeRawRows(rawRows) {
    let headerRowIndex = -1;
    let colMap = {};

    // Scan first 15 rows to detect header
    for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;

        // Skip rows that look like JSON metadata (e.g. {"SEARCH_CONDITION": ...})
        const rowStr = row.join(' ');
        if (rowStr.includes('SEARCH_CONDITION') || rowStr.includes('CATEGORY_IDS')) {
            continue;
        }

        let foundSku = false;
        let foundName = false;
        let tempMap = {};

        row.forEach((cellVal, colIdx) => {
            // Clean value: remove asterisks, parentheses, whitespace
            const val = String(cellVal || '').replace(/[\*\(].*?[\)]/g, '').replace(/[\*]/g, '').trim().toLowerCase();
            if (!val) return;

            // 1. Variation SKU (Check first before parent SKU, avoid pure numeric IDs like 'รหัสตัวเลือกสินค้า')
            if (val.includes('เลขอ้างอิง sku') || val.includes('variation sku') || val.includes('รหัสเลขอ้างอิงตัวเลือก') || val.includes('sku ตัวเลือก') || val === 'model sku' || (val.includes('sku') && !val.includes('parent'))) {
                if (tempMap.variationSku === undefined) tempMap.variationSku = colIdx;
                foundSku = true;
            } 
            // 2. Parent SKU
            else if (val.includes('parent sku') || val.includes('เลขอ้างอิง parent') || val.includes('รหัสเลขอ้างอิงหลัก')) {
                tempMap.parentSku = colIdx;
                foundSku = true;
            } 
            // 3. Item SKU / General SKU fallback (only if not variation ID)
            else if ((val === 'sku' || val === 'รหัสอ้างอิง' || val.includes('รหัสเลขอ้างอิง') || val === 'item sku') && !val.includes('ตัวเลือก')) {
                if (tempMap.variationSku === undefined) tempMap.variationSku = colIdx;
                foundSku = true;
            }

            // 4. Product Name
            if (val.includes('ชื่อสินค้า') || val.includes('product name') || val.includes('ชื่อผลิตภัณฑ์') || val.includes('ชื่อรายการสินค้า') || val.includes('product title') || val === 'ชื่อ' || val === 'name' || val === 'title') {
                tempMap.name = colIdx;
                foundName = true;
            }

            // 5. Variation Name / Option (Avoid 'รหัสตัวเลือก')
            if (val.includes('ชื่อตัวเลือก') || val.includes('variation name') || val.includes('ตัวเลือก 1') || val === 'ตัวเลือก' || val.includes('option') || val.includes('ไซส์') || val.includes('แบบ') || val.includes('สี')) {
                if (tempMap.variant === undefined) tempMap.variant = colIdx;
            }

            // 6. Price (Prioritize ราคาส่วนลด / ราคาขาย, fallback to ราคาตั้งต้น)
            if (val.includes('ราคาส่วนลด') || val.includes('ราคาขาย') || val.includes('discounted price') || val.includes('special price')) {
                tempMap.price = colIdx;
            } else if (val.includes('ราคาตั้งต้น') || val.includes('ราคา') || val.includes('price')) {
                if (tempMap.price === undefined) {
                    tempMap.price = colIdx;
                } else if (tempMap.altPrice === undefined) {
                    tempMap.altPrice = colIdx;
                }
            }

            // 7. Stock
            if (val.includes('สต็อก') || val.includes('stock') || val.includes('จำนวน') || val.includes('qty') || val.includes('จำนวนคลัง') || val.includes('คลัง')) {
                if (tempMap.stock === undefined) tempMap.stock = colIdx;
            }

            // 8. Brand
            if (val.includes('แบรนด์') || val.includes('brand') || val.includes('ยี่ห้อ')) {
                if (tempMap.brand === undefined) tempMap.brand = colIdx;
            }
        });

        if (foundSku && (foundName || tempMap.price !== undefined || tempMap.stock !== undefined)) {
            headerRowIndex = i;
            colMap = tempMap;
            break;
        }
    }

    if (headerRowIndex === -1) {
        // Fallback: If no explicit header matched, find the first row containing 'sku'
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const row = rawRows[i];
            if (!Array.isArray(row)) continue;
            let hasSku = false;
            row.forEach((c, idx) => {
                const v = String(c || '').toLowerCase();
                if (v.includes('sku') || v.includes('รหัส')) {
                    colMap.variationSku = idx;
                    hasSku = true;
                }
                if (v.includes('name') || v.includes('ชื่อ')) colMap.name = idx;
                if (v.includes('price') || v.includes('ราคา')) colMap.price = idx;
                if (v.includes('stock') || v.includes('จำนวน') || v.includes('คลัง')) colMap.stock = idx;
            });
            if (hasSku) {
                headerRowIndex = i;
                break;
            }
        }
        if (headerRowIndex === -1) headerRowIndex = 0;
    }

    // Existing SKUs in database map (case-insensitive)
    const existingSkuMap = new Map();
    InventoryApp.products.forEach(p => {
        if (p.sku) {
            existingSkuMap.set(p.sku.trim().toUpperCase(), p);
        }
    });

    const parsedItems = [];
    const newItems = [];
    const existingItems = [];
    const invalidItems = [];
    const fileSkuMap = new Map(); // Track unique SKUs in file to merge variation rows

    // Parse subsequent data rows
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!Array.isArray(row) || row.length === 0) continue;

        // Extract SKU (Prioritize variation SKU, fallback to parent SKU)
        let skuVal = '';
        if (colMap.variationSku !== undefined && row[colMap.variationSku]) {
            skuVal = String(row[colMap.variationSku]).trim();
        }
        if (!skuVal && colMap.parentSku !== undefined && row[colMap.parentSku]) {
            skuVal = String(row[colMap.parentSku]).trim();
        }

        // Clean SKU
        skuVal = skuVal.replace(/[\r\n\t]/g, '').trim().toUpperCase();

        // Skip metadata / instruction / header rows that leaked into data
        if (!skuVal || 
            skuVal.includes('SEARCH_CONDITION') || 
            skuVal.startsWith('{') || 
            skuVal === 'PARENT SKU' || 
            skuVal === 'VARIATION SKU' || 
            skuVal === 'ITEM SKU' || 
            skuVal === 'SKU' || 
            skuVal.includes('CATEGORY_IDS')) {
            continue;
        }

        const nameVal = colMap.name !== undefined ? String(row[colMap.name] || '').trim() : '';
        const variantVal = colMap.variant !== undefined ? String(row[colMap.variant] || '').trim() : '';
        const brandVal = colMap.brand !== undefined ? String(row[colMap.brand] || '').trim() : 'Paperstudio (เปเปอร์สตูดิโอ)';

        // Price Parsing (Try main price e.g. ราคาส่วนลด, fallback to altPrice e.g. ราคาตั้งต้น)
        let priceVal = null;
        if (colMap.price !== undefined && row[colMap.price] !== undefined && row[colMap.price] !== '') {
            const cleanPrice = String(row[colMap.price]).replace(/[^0-9.]/g, '');
            const parsedP = parseFloat(cleanPrice);
            if (!isNaN(parsedP)) priceVal = parsedP;
        }
        if (priceVal === null && colMap.altPrice !== undefined && row[colMap.altPrice] !== undefined && row[colMap.altPrice] !== '') {
            const cleanPrice = String(row[colMap.altPrice]).replace(/[^0-9.]/g, '');
            const parsedP = parseFloat(cleanPrice);
            if (!isNaN(parsedP)) priceVal = parsedP;
        }

        // Stock Parsing
        let stockVal = 0;
        if (colMap.stock !== undefined && row[colMap.stock] !== undefined && row[colMap.stock] !== '') {
            const cleanStock = String(row[colMap.stock]).replace(/[^0-9]/g, '');
            const parsedS = parseInt(cleanStock, 10);
            if (!isNaN(parsedS) && parsedS >= 0) stockVal = parsedS;
        }

        // Skip completely empty rows
        if (!skuVal && !nameVal && priceVal === null) continue;

        const existingRecord = existingSkuMap.get(skuVal);

        // Smart name resolution:
        // 1. If nameVal from file exists and is not empty, use it.
        // 2. If nameVal is empty, but database already has a custom name for this SKU, preserve it!
        // 3. Otherwise, fallback to 'สินค้า [SKU]' or 'สินค้า [SKU] ([Variant])'
        let resolvedName = nameVal;
        if (!resolvedName) {
            if (existingRecord && existingRecord.name && !existingRecord.name.includes('ไม่มีชื่อสินค้า')) {
                resolvedName = existingRecord.name;
            } else if (variantVal) {
                resolvedName = `สินค้า ${skuVal} (${variantVal})`;
            } else {
                resolvedName = `สินค้า ${skuVal}`;
            }
        }

        // Check if SKU already appeared in this file (e.g. multiple variation rows without unique variation SKU)
        if (fileSkuMap.has(skuVal)) {
            const prevItem = fileSkuMap.get(skuVal);
            if (variantVal && (!prevItem.variant || !prevItem.variant.includes(variantVal))) {
                prevItem.variant = prevItem.variant ? `${prevItem.variant}, ${variantVal}` : variantVal;
            }
            if (stockVal > 0) {
                prevItem.stock_quantity = (prevItem.stock_quantity ?? 0) + stockVal;
            }
            if (priceVal !== null && prevItem.price === null) {
                prevItem.price = priceVal;
            }
            if (nameVal && (!prevItem.name || prevItem.name.startsWith('สินค้า '))) {
                prevItem.name = nameVal;
            }
            prevItem.duplicateRowsCount = (prevItem.duplicateRowsCount || 1) + 1;
            continue;
        }

        const itemObj = {
            rowNumber: r + 1, // Excel line number (1-based)
            sku: skuVal,
            name: resolvedName,
            variant: variantVal,
            price: priceVal,
            stock_quantity: stockVal,
            distributor: 'นำเข้าจาก Shopee Seller Centre',
            min_stock_alert: 5,
            skipReason: !skuVal ? `ไม่พบรหัส SKU ในแถวที่ ${r + 1} ของไฟล์ Excel` : ''
        };

        if (!skuVal) {
            itemObj.isSkipped = true;
            invalidItems.push(itemObj);
            continue;
        }

        fileSkuMap.set(skuVal, itemObj);
        parsedItems.push(itemObj);

        if (existingRecord) {
            itemObj.isExisting = true;
            itemObj.existingId = existingRecord.id;
            itemObj.existingStock = existingRecord.stock_quantity ?? 0;
            itemObj.existingLocation = existingRecord.warehouse_location || 'A-01';
            existingItems.push(itemObj);
        } else {
            itemObj.isExisting = false;
            newItems.push(itemObj);
        }
    }

    ShopeeImportState.parsedRows = parsedItems;
    ShopeeImportState.newItems = newItems;
    ShopeeImportState.existingItems = existingItems;
    ShopeeImportState.invalidItems = invalidItems;
    ShopeeImportState.previewTab = 'ALL';

    renderShopeeAnalysis();
}

function setShopeePreviewTab(tab) {
    ShopeeImportState.previewTab = tab || 'ALL';
    updateShopeePreviewTabButtons();
    renderShopeePreviewTable();
}

function updateShopeePreviewTabButtons() {
    const tab = ShopeeImportState.previewTab;
    const allBtn = document.getElementById('tabShopeePrevAll');
    const newBtn = document.getElementById('tabShopeePrevNew');
    const existBtn = document.getElementById('tabShopeePrevExist');
    const skipBtn = document.getElementById('tabShopeePrevSkip');

    const cardAll = document.getElementById('cardShopeeAll');
    const cardNew = document.getElementById('cardShopeeNew');
    const cardExist = document.getElementById('cardShopeeExist');
    const cardSkip = document.getElementById('cardShopeeSkip');

    // Reset card highlight
    [cardAll, cardNew, cardExist, cardSkip].forEach(c => {
        if (c) c.classList.remove('ring-4', 'ring-orange-400/40', 'border-orange-500');
    });

    // Reset buttons
    if (allBtn) allBtn.className = 'px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-medium transition-all';
    if (newBtn) newBtn.className = 'px-2.5 py-1 rounded-lg text-emerald-700 hover:text-emerald-900 font-medium transition-all';
    if (existBtn) existBtn.className = 'px-2.5 py-1 rounded-lg text-blue-700 hover:text-blue-900 font-medium transition-all';
    if (skipBtn) skipBtn.className = 'px-2.5 py-1 rounded-lg text-rose-700 hover:text-rose-900 font-bold transition-all';

    if (tab === 'ALL') {
        if (allBtn) allBtn.className = 'px-2.5 py-1 rounded-lg font-bold bg-white text-slate-900 shadow-sm transition-all border border-slate-200';
        if (cardAll) cardAll.classList.add('ring-4', 'ring-orange-400/40', 'border-orange-500');
    } else if (tab === 'NEW') {
        if (newBtn) newBtn.className = 'px-2.5 py-1 rounded-lg font-bold bg-emerald-600 text-white shadow-sm transition-all';
        if (cardNew) cardNew.classList.add('ring-4', 'ring-emerald-400/40', 'border-emerald-500');
    } else if (tab === 'EXISTING') {
        if (existBtn) existBtn.className = 'px-2.5 py-1 rounded-lg font-bold bg-blue-600 text-white shadow-sm transition-all';
        if (cardExist) cardExist.classList.add('ring-4', 'ring-blue-400/40', 'border-blue-500');
    } else if (tab === 'SKIP') {
        if (skipBtn) skipBtn.className = 'px-2.5 py-1 rounded-lg font-bold bg-rose-600 text-white shadow-sm transition-all';
        if (cardSkip) cardSkip.classList.add('ring-4', 'ring-rose-400/40', 'border-rose-500');
    }
}

function renderShopeeAnalysis() {
    const analysisSection = document.getElementById('shopeeAnalysisSection');
    if (!analysisSection) return;

    analysisSection.classList.remove('hidden');

    const totalCount = ShopeeImportState.parsedRows.length + ShopeeImportState.invalidItems.length;
    document.getElementById('statShopeeTotal').innerText = totalCount.toLocaleString();
    document.getElementById('statShopeeNew').innerText = ShopeeImportState.newItems.length.toLocaleString();
    document.getElementById('statShopeeExist').innerText = ShopeeImportState.existingItems.length.toLocaleString();
    document.getElementById('statShopeeSkip').innerText = ShopeeImportState.invalidItems.length.toLocaleString();

    // Tab Counts
    const countAllEl = document.getElementById('prevCountAll');
    const countNewEl = document.getElementById('prevCountNew');
    const countExistEl = document.getElementById('prevCountExist');
    const countSkipEl = document.getElementById('prevCountSkip');

    if (countAllEl) countAllEl.innerText = totalCount.toLocaleString();
    if (countNewEl) countNewEl.innerText = ShopeeImportState.newItems.length.toLocaleString();
    if (countExistEl) countExistEl.innerText = ShopeeImportState.existingItems.length.toLocaleString();
    if (countSkipEl) countSkipEl.innerText = ShopeeImportState.invalidItems.length.toLocaleString();

    updateShopeePreviewTabButtons();
    renderShopeePreviewTable();

    // Update Action Button
    const btnConfirm = document.getElementById('btnConfirmShopeeImport');
    const btnConfirmText = document.getElementById('btnConfirmShopeeText');
    if (btnConfirm && btnConfirmText) {
        const validTotal = ShopeeImportState.newItems.length + ShopeeImportState.existingItems.length;
        if (validTotal > 0) {
            btnConfirm.disabled = false;
            btnConfirmText.innerText = `ยืนยันนำเข้าสินค้า (${validTotal.toLocaleString()} รายการ)`;
        } else {
            btnConfirm.disabled = true;
            btnConfirmText.innerText = 'ไม่พบสินค้าที่จะนำเข้า';
        }
    }
}

function renderShopeePreviewTable() {
    const tbody = document.getElementById('shopeePreviewTbody');
    const previewCountEl = document.getElementById('shopeePreviewCount');
    if (!tbody) return;

    let targetList = [];
    const tab = ShopeeImportState.previewTab;

    if (tab === 'NEW') {
        targetList = ShopeeImportState.newItems;
    } else if (tab === 'EXISTING') {
        targetList = ShopeeImportState.existingItems;
    } else if (tab === 'SKIP') {
        targetList = ShopeeImportState.invalidItems;
    } else {
        // ALL: show skipped first so the user notices immediately, followed by new and existing
        targetList = [...ShopeeImportState.invalidItems, ...ShopeeImportState.newItems, ...ShopeeImportState.existingItems];
    }

    const previewList = targetList.slice(0, 100);

    if (previewCountEl) {
        let label = 'ทั้งหมด';
        if (tab === 'NEW') label = 'เฉพาะสินค้าใหม่';
        if (tab === 'EXISTING') label = 'เฉพาะสินค้าเดิม';
        if (tab === 'SKIP') label = 'เฉพาะรายการที่ข้าม/ไม่มี SKU';

        previewCountEl.innerText = `แสดง ${previewList.length} จาก ${targetList.length.toLocaleString()} รายการ (${label})`;
    }

    if (targetList.length === 0) {
        let emptyMsg = 'ไม่พบรายการในหมวดนี้';
        if (tab === 'SKIP') emptyMsg = '✅ ข้อมูลสมบูรณ์! ไม่พบรายการที่ข้าม (สินค้าทุกชิ้นมีรหัส SKU ครบถ้วน)';
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-10 text-center text-slate-400 font-sans">
                    <i class="bi bi-inbox text-3xl block mb-2 text-slate-300"></i>
                    ${emptyMsg}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = previewList.map(item => {
        if (item.isSkipped) {
            return `
                <tr class="bg-rose-50/50 hover:bg-rose-100/50 transition-colors border-l-4 border-l-rose-500">
                    <td class="py-2.5 px-2.5 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-700 border border-rose-300 shadow-xs">
                            <i class="bi bi-x-circle-fill text-[10px]"></i> ข้าม (เพิ่มไม่ได้)
                        </span>
                    </td>
                    <td class="py-2.5 px-2.5 font-mono font-bold text-rose-600 text-xs whitespace-nowrap">
                        <span class="bg-white px-2 py-0.5 rounded-md border border-rose-300 text-rose-700 font-bold inline-flex items-center gap-1 shadow-xs">
                            <i class="bi bi-file-earmark-spreadsheet-fill text-rose-500"></i> แถวที่ ${item.rowNumber || '-'}
                        </span>
                    </td>
                    <td class="py-2.5 px-2.5">
                        <div class="font-bold text-slate-900 line-clamp-1">${escapeHtml(item.name)}</div>
                        <div class="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                            <i class="bi bi-exclamation-triangle-fill text-amber-500 flex-shrink-0"></i> 
                            <span>${escapeHtml(item.skipReason || 'ไม่พบรหัส SKU ในไฟล์')}</span>
                        </div>
                    </td>
                    <td class="py-2.5 px-2 text-slate-600">${escapeHtml(item.variant || '-')}</td>
                    <td class="py-2.5 px-2 text-right font-mono font-semibold text-slate-700">
                        ${item.price !== null ? '฿' + item.price.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td class="py-2.5 px-2 text-center font-mono text-slate-400">
                        ${item.stock_quantity ?? '-'}
                    </td>
                </tr>
            `;
        }

        const statusBadge = item.isExisting
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <i class="bi bi-arrow-repeat text-[9px]"></i> มีอยู่แล้ว (${item.existingStock} ชิ้น)
               </span>`
            : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <i class="bi bi-plus-lg text-[9px]"></i> ใหม่
               </span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-2 px-2.5 whitespace-nowrap">${statusBadge}</td>
                <td class="py-2 px-2.5 font-mono font-bold text-blue-600 text-xs">
                    ${escapeHtml(item.sku)}
                    <span class="text-[10px] text-slate-400 block font-normal">แถว ${item.rowNumber}</span>
                </td>
                <td class="py-2 px-2.5 font-medium text-slate-800">
                    <div class="flex items-center gap-2.5">
                        ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" class="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs" onerror="this.style.display='none'">` : ''}
                        <div class="min-w-0">
                            <div class="font-bold text-slate-900 line-clamp-1 text-xs">${escapeHtml(item.name)}</div>
                            ${item.category ? `<span class="text-[10px] text-blue-600 font-medium truncate block">${escapeHtml(item.category)}</span>` : ''}
                        </div>
                    </div>
                </td>
                <td class="py-2 px-2 text-slate-500 text-xs">${escapeHtml(item.variant || '-')}</td>
                <td class="py-2 px-2 text-right font-mono font-semibold text-slate-700">
                    ${item.price !== null ? '฿' + item.price.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                </td>
                <td class="py-2 px-2 text-center font-mono font-bold text-slate-800">
                    ${item.stock_quantity ?? 0}
                </td>
            </tr>
        `;
    }).join('');
}

async function executeShopeeImport() {
    if (ShopeeImportState.isProcessing) return;

    const totalValid = ShopeeImportState.newItems.length + ShopeeImportState.existingItems.length;
    if (totalValid === 0) {
        alert('ไม่มีรายการสินค้าที่จะนำเข้า');
        return;
    }

    const policy = document.querySelector('input[name="shopeeConflictPolicy"]:checked')?.value || 'UPDATE_INFO_KEEP_STOCK';
    const defaultRack = (document.getElementById('shopeeDefaultRack')?.value || 'A-01').trim().toUpperCase();

    // Confirm dialog summary
    let policyDesc = '';
    if (policy === 'UPDATE_INFO_KEEP_STOCK') {
        policyDesc = `เพิ่มสินค้าใหม่ ${ShopeeImportState.newItems.length} รายการ และอัปเดตข้อมูลสินค้าเดิม ${ShopeeImportState.existingItems.length} รายการ (โดยไม่ทับสต็อกเดิมในคลัง)`;
    } else if (policy === 'SKIP_EXISTING') {
        policyDesc = `เพิ่มเฉพาะสินค้าใหม่ ${ShopeeImportState.newItems.length} รายการ (ข้ามสินค้าเดิม ${ShopeeImportState.existingItems.length} รายการ)`;
    } else {
        policyDesc = `อัปเดตทับทั้งหมด ${totalValid} รายการ (รวมถึงจำนวนสต็อกตาม Shopee)`;
    }

    if (!confirm(`ยืนยันการนำเข้าสินค้าจาก Shopee?\n\nเงื่อนไข: ${policyDesc}\n\nต้องการดำเนินการต่อหรือไม่?`)) {
        return;
    }

    ShopeeImportState.isProcessing = true;

    // Show Progress UI
    const progressContainer = document.getElementById('shopeeProgressContainer');
    const progressBar = document.getElementById('shopeeProgressBar');
    const progressPercent = document.getElementById('shopeeProgressPercent');
    const progressStatus = document.getElementById('shopeeProgressStatus');
    const btnConfirm = document.getElementById('btnConfirmShopeeImport');

    if (progressContainer) progressContainer.classList.remove('hidden');
    if (btnConfirm) btnConfirm.disabled = true;

    // Prepare Batches
    const recordsToUpsert = [];

    // 1. Process New Items (Always added)
    ShopeeImportState.newItems.forEach(item => {
        recordsToUpsert.push({
            sku: item.sku,
            name: item.name,
            variant: item.variant,
            price: item.price,
            stock_quantity: item.stock_quantity ?? 0,
            min_stock_alert: item.min_stock_alert ?? 5,
            warehouse_location: defaultRack,
            distributor: item.distributor || 'Shopee Seller Centre',
            care_instructions: item.care_instructions || 'ควรซักก่อนสวมใส่ / ควรรีดด้วยไฟปานกลาง',
            image_url: item.image_url || null,
            updated_at: new Date().toISOString()
        });
        if (item.image_url && item.sku) {
            try { localStorage.setItem('sgyver_img_' + item.sku, item.image_url); } catch(e){}
        }
    });

    // 2. Process Existing Items according to Conflict Policy
    if (policy === 'UPDATE_INFO_KEEP_STOCK') {
        // Keep existing stock and rack location
        ShopeeImportState.existingItems.forEach(item => {
            recordsToUpsert.push({
                sku: item.sku,
                name: item.name,
                variant: item.variant,
                price: item.price,
                stock_quantity: item.existingStock, // Keep real warehouse stock!
                warehouse_location: item.existingLocation, // Keep real rack!
                image_url: item.image_url || null,
                updated_at: new Date().toISOString()
            });
            if (item.image_url && item.sku) {
                try { localStorage.setItem('sgyver_img_' + item.sku, item.image_url); } catch(e){}
            }
        });
    } else if (policy === 'OVERWRITE_ALL') {
        // Full overwrite including Shopee stock
        ShopeeImportState.existingItems.forEach(item => {
            recordsToUpsert.push({
                sku: item.sku,
                name: item.name,
                variant: item.variant,
                price: item.price,
                stock_quantity: item.stock_quantity ?? 0,
                image_url: item.image_url || null,
                updated_at: new Date().toISOString()
            });
            if (item.image_url && item.sku) {
                try { localStorage.setItem('sgyver_img_' + item.sku, item.image_url); } catch(e){}
            }
        });
    }
    // If SKIP_EXISTING: we do not add existingItems to recordsToUpsert

    // Deduplicate recordsToUpsert by SKU to strictly prevent PostgreSQL error:
    // "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueMap = new Map();
    recordsToUpsert.forEach(rec => {
        const key = String(rec.sku || '').trim().toUpperCase();
        if (!key) return;

        if (uniqueMap.has(key)) {
            const prev = uniqueMap.get(key);
            let mergedVariant = prev.variant;
            if (rec.variant && (!prev.variant || !prev.variant.includes(rec.variant))) {
                mergedVariant = prev.variant ? `${prev.variant}, ${rec.variant}` : rec.variant;
            }
            const preferredName = (rec.name && !rec.name.startsWith('สินค้า WG')) 
                ? rec.name 
                : (prev.name || rec.name);
            const mergedStock = policy === 'OVERWRITE_ALL' 
                ? (prev.stock_quantity ?? 0) + (rec.stock_quantity ?? 0)
                : (prev.stock_quantity ?? rec.stock_quantity ?? 0);

            uniqueMap.set(key, {
                ...prev,
                ...rec,
                name: preferredName,
                variant: mergedVariant,
                price: rec.price !== null ? rec.price : prev.price,
                stock_quantity: mergedStock,
                image_url: rec.image_url || prev.image_url || null
            });
        } else {
            uniqueMap.set(key, rec);
        }
    });

    const finalRecordsToUpload = Array.from(uniqueMap.values());

    try {
        const totalToUpload = finalRecordsToUpload.length;
        if (totalToUpload === 0) {
            alert('ไม่มีรายการใหม่ที่ต้องนำเข้า (เนื่องจากเลือกข้ามสินค้าเดิมทั้งหมด)');
            closeShopeeImportModal();
            return;
        }

        const BATCH_SIZE = 40;
        let processedCount = 0;

        for (let i = 0; i < totalToUpload; i += BATCH_SIZE) {
            const chunk = finalRecordsToUpload.slice(i, i + BATCH_SIZE);

            if (progressStatus) {
                progressStatus.innerText = `กำลังบันทึกลง Supabase (${Math.min(i + BATCH_SIZE, totalToUpload)} / ${totalToUpload} รายการ)...`;
            }

            let { error } = await InventoryApp.supabaseClient
                .from('product_labels')
                .upsert(chunk, { onConflict: 'sku' });

            if (error && error.message && error.message.includes('image_url')) {
                // Fallback: exclude image_url if not in DB schema
                const fallbackChunk = chunk.map(c => {
                    const copy = { ...c };
                    delete copy.image_url;
                    return copy;
                });
                const res = await InventoryApp.supabaseClient
                    .from('product_labels')
                    .upsert(fallbackChunk, { onConflict: 'sku' });
                error = res.error;
            }

            if (error) throw error;

            processedCount += chunk.length;
            const pct = Math.round((processedCount / totalToUpload) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressPercent) progressPercent.innerText = `${pct}%`;
        }

        // Complete!
        if (progressStatus) progressStatus.innerText = 'บันทึกข้อมูลเรียบร้อยแล้ว!';
        await loadInventory();

        const insertedNewCount = ShopeeImportState.newItems.length;
        const updatedExistCount = policy === 'SKIP_EXISTING' ? 0 : ShopeeImportState.existingItems.length;
        const skippedExistCount = policy === 'SKIP_EXISTING' ? ShopeeImportState.existingItems.length : 0;

        alert(`🎉 นำเข้าสินค้าจาก Shopee สำเร็จ!\n\n` +
              `• เพิ่มสินค้าใหม่: ${insertedNewCount.toLocaleString()} รายการ\n` +
              `• ปรับปรุงสินค้าเดิม: ${updatedExistCount.toLocaleString()} รายการ\n` +
              (skippedExistCount > 0 ? `• ข้ามสินค้าเดิม: ${skippedExistCount.toLocaleString()} รายการ\n` : '') +
              `• ยอดสินค้าในระบบทั้งหมด: ${InventoryApp.products.length.toLocaleString()} รายการ`);

        closeShopeeImportModal();

    } catch (err) {
        console.error('Shopee import error:', err);
        alert('เกิดข้อผิดพลาดในการนำเข้าสินค้า: ' + (err.message || err));
    } finally {
        ShopeeImportState.isProcessing = false;
        if (btnConfirm) btnConfirm.disabled = false;
    }
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

// ==============================================================================
// UNIVERSAL IMAGE PREVIEW POPUP (LIGHTBOX MODAL)
// ==============================================================================
InventoryApp.imagePreviewState = {
    isOpen: false,
    images: [],
    currentIndex: 0,
    caption: ''
};

function openImagePreview(url, caption = '', galleryList = null, currentIndex = 0) {
    if (!url) return;
    const modal = document.getElementById('imagePreviewModal');
    const img = document.getElementById('imagePreviewImg');

    if (!modal || !img) return;

    let images = [];
    if (Array.isArray(galleryList) && galleryList.length > 0) {
        images = galleryList.filter(Boolean);
    } else {
        images = [url];
    }

    let idx = typeof currentIndex === 'number' && currentIndex >= 0 && currentIndex < images.length ? currentIndex : images.indexOf(url);
    if (idx === -1) idx = 0;

    InventoryApp.imagePreviewState = {
        isOpen: true,
        images,
        currentIndex: idx,
        caption: caption || ''
    };

    updateImagePreviewDOM();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function updateImagePreviewDOM() {
    const { images, currentIndex, caption } = InventoryApp.imagePreviewState;
    const currentUrl = images[currentIndex] || '';

    const img = document.getElementById('imagePreviewImg');
    const capEl = document.getElementById('imagePreviewCaption');
    const counterEl = document.getElementById('imagePreviewCounter');
    const prevBtn = document.getElementById('imagePreviewPrevBtn');
    const nextBtn = document.getElementById('imagePreviewNextBtn');
    const navHint = document.getElementById('imagePreviewNavHint');
    const downloadBtn = document.getElementById('imagePreviewDownloadBtn');

    if (img) {
        img.src = currentUrl;
    }
    if (capEl) {
        capEl.textContent = caption || `รูปภาพที่ ${currentIndex + 1}`;
    }
    if (downloadBtn) {
        downloadBtn.href = currentUrl;
    }

    const hasMultiple = images.length > 1;
    if (counterEl) {
        if (hasMultiple) {
            counterEl.textContent = `(${currentIndex + 1} / ${images.length})`;
            counterEl.classList.remove('hidden');
        } else {
            counterEl.classList.add('hidden');
        }
    }

    if (prevBtn) prevBtn.classList.toggle('hidden', !hasMultiple);
    if (nextBtn) nextBtn.classList.toggle('hidden', !hasMultiple);
    if (navHint) navHint.classList.toggle('hidden', !hasMultiple);
}

function navigateImagePreview(direction) {
    const state = InventoryApp.imagePreviewState;
    if (!state.isOpen || state.images.length <= 1) return;

    let newIndex = state.currentIndex + direction;
    if (newIndex < 0) {
        newIndex = state.images.length - 1;
    } else if (newIndex >= state.images.length) {
        newIndex = 0;
    }

    state.currentIndex = newIndex;
    updateImagePreviewDOM();
}

function closeImagePreview() {
    const modal = document.getElementById('imagePreviewModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    InventoryApp.imagePreviewState.isOpen = false;
    document.body.style.overflow = '';
}

function handleImagePreviewBackdropClick(event) {
    if (event.target && event.target.id === 'imagePreviewModal') {
        closeImagePreview();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const customOptModal = document.getElementById('addCustomOptionModal');
        if (customOptModal && !customOptModal.classList.contains('hidden')) {
            closeAddCustomOptionModal();
            return;
        }
    }
    if (!InventoryApp.imagePreviewState?.isOpen) return;
    if (e.key === 'Escape') {
        closeImagePreview();
    } else if (e.key === 'ArrowLeft') {
        navigateImagePreview(-1);
    } else if (e.key === 'ArrowRight') {
        navigateImagePreview(1);
    }
});

// ==============================================================================
// ⚠️ SHOPEE DUPLICATE IMPORT DETECTION & MODAL HANDLERS
// ==============================================================================

function openDuplicateShopeeModal(existingProduct, incomingData) {
    const modal = document.getElementById('duplicateShopeeModal');
    if (!modal) return;

    const parentKey = typeof getParentGroupKey === 'function' ? getParentGroupKey(existingProduct) : (existingProduct.parent_sku || existingProduct.sku);
    const rawParentSku = existingProduct.parent_sku || parentKey;
    const parentItems = (InventoryApp.products || []).filter(p => (typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : (p.parent_sku || p.sku)) === parentKey);
    
    let totalStock = 0;
    parentItems.forEach(c => totalStock += parseInt(c.stock_quantity ?? 0, 10));

    // Cover image
    const coverImg = existingProduct.image_url || localStorage.getItem('sgyver_img_' + rawParentSku) || localStorage.getItem('sgyver_img_' + parentKey) || (parentItems.find(x => x.image_url)?.image_url);
    const imgEl = document.getElementById('dupModalImg');
    const imgPlaceholder = document.getElementById('dupModalImgPlaceholder');
    if (coverImg && (coverImg.startsWith('http') || coverImg.startsWith('data:image/'))) {
        if (imgEl) {
            imgEl.src = coverImg;
            imgEl.classList.remove('hidden');
        }
        if (imgPlaceholder) imgPlaceholder.classList.add('hidden');
    } else {
        if (imgEl) imgEl.classList.add('hidden');
        if (imgPlaceholder) imgPlaceholder.classList.remove('hidden');
    }

    const rawItemId = incomingData.itemid || (incomingData.url && (incomingData.url.match(/-i\.(\d+)\.(\d+)/)?.[2] || incomingData.url.match(/\/product\/(\d+)\/(\d+)/)?.[2] || incomingData.url.match(/[?&]item_?id=(\d+)/)?.[1])) || '';
    const badgeEl = document.getElementById('dupModalShopeeIdBadge');
    if (badgeEl) badgeEl.innerText = rawItemId ? `Shopee ID: ${rawItemId}` : 'Shopee URL ซ้ำ';

    const skuEl = document.getElementById('dupModalSku');
    if (skuEl) skuEl.innerText = rawParentSku;

    const titleEl = document.getElementById('dupModalTitle');
    if (titleEl) titleEl.innerText = existingProduct.name || incomingData.name || '-';

    const stockEl = document.getElementById('dupModalStock');
    if (stockEl) stockEl.innerText = totalStock.toLocaleString('th-TH');

    const varEl = document.getElementById('dupModalVariants');
    if (varEl) varEl.innerText = parentItems.length.toLocaleString('th-TH');

    const timeEl = document.getElementById('dupModalTime');
    const storedTime = localStorage.getItem('sgyver_shopee_time_' + rawParentSku) || localStorage.getItem('sgyver_shopee_time_' + parentKey) || 'มีอยู่ในคลังแล้ว';
    if (timeEl) timeEl.innerText = storedTime;

    // Button 1: Open existing
    const btnOpen = document.getElementById('dupBtnOpenExisting');
    if (btnOpen) {
        btnOpen.onclick = () => {
            closeDuplicateShopeeModal();
            editProductModal(existingProduct.id);
            showToastNotification(`เปิดสินค้าเดิมในคลัง: ${rawParentSku} (${parentItems.length} ตัวเลือก)`);
        };
    }

    // Button 2: Proceed as new
    const btnNew = document.getElementById('dupBtnCreateNew');
    if (btnNew) {
        btnNew.onclick = () => {
            closeDuplicateShopeeModal();
            incomingData._allowDuplicate = true;
            applyShopeeExtractedData(incomingData);
            showToastNotification(`นำเข้าเป็นโพสต์ใหม่เรียบร้อย (ระบบสร้างรหัส SKU แยกต่างหาก)`);
        };
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDuplicateShopeeModal() {
    const modal = document.getElementById('duplicateShopeeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ==============================================================================
// ⚡ SHOPEE 1-CLICK SCRAPER & BOOKMARKLET ENGINE
// ==============================================================================

function getShopeeBookmarkletCode() {
    return 'javascript:(async function(){' +
        'try{' +
        'if(!location.hostname.includes("shopee.")){' +
        'alert("⚠️ กรุณาเปิดหน้าสินค้าบนเว็บ Shopee ก่อนกดบุ๊กมาร์กนี้ครับ");return;' +
        '}' +
        'const url=window.location.href;' +
        'let shopid=null,itemid=null;' +
        'const m1=url.match(/-i\\.(\\d+)\\.(\\d+)/);' +
        'const m2=url.match(/\\/product\\/(\\d+)\\/(\\d+)/);' +
        'const m3=url.match(/\\/portal\\/product\\/(\\d+)/);' +
        'const m4=url.match(/[?&]item_?id=(\\d+)/);' +
        'if(m1){shopid=m1[1];itemid=m1[2];}' +
        'else if(m2){shopid=m2[1];itemid=m2[2];}' +
        'else if(m3){itemid=m3[1];}' +
        'else if(m4){itemid=m4[1];}' +
        'let b=document.getElementById("sgyver-shopee-toast");' +
        'if(b)b.remove();' +
        'b=document.createElement("div");' +
        'b.id="sgyver-shopee-toast";' +
        'b.style.cssText="position:fixed;top:20px;right:20px;z-index:999999999;font-family:sans-serif;max-width:400px;font-size:13px;line-height:1.5;box-shadow:0 20px 45px rgba(0,0,0,0.45);border-radius:18px;overflow:hidden;border:2px solid rgba(255,255,255,0.35);";' +
        'document.body.appendChild(b);' +
        'async function doExtractAndCopy(isRepeat){' +
        'b.style.background="linear-gradient(135deg,#ff5722,#ee4d2d)";b.style.color="#fff";b.style.padding="16px 20px";' +
        'b.innerHTML="<div style=\\"font-weight:bold;font-size:14px;\\">⚡ กำลังดูดข้อมูลสินค้าจาก Shopee...</div>";' +
        'let d=null;' +
        'if(shopid&&itemid){' +
        'try{' +
        'const r=await fetch("/api/v4/item/get?itemid="+itemid+"&shopid="+shopid);' +
        'if(r.ok){const j=await r.json();if(j&&j.data)d=j.data;}' +
        '}catch(e){console.warn(e);}' +
        '}' +
        'let title="";' +
        'if(d&&d.name){title=d.name.trim();}' +
        'else{' +
        'const h=document.querySelector("h1")||document.querySelector(".fM3Aih")||document.querySelector(".product-briefing__title")||document.querySelector("input[placeholder*=\\"ชื่อสินค้า\\"]");' +
        'title=(h?(h.value||h.innerText):document.title).replace(/\\s*\\|\\s*Shopee\\s*.*$/i,"").trim();' +
        '}' +
        'let images=[];' +
        'if(d&&Array.isArray(d.images)){' +
        'images=d.images.map(function(img){return img.startsWith("http")?img:("https://down-th.img.susercontent.com/file/"+img);});' +
        '}' +
        'if(images.length===0){' +
        'document.querySelectorAll("img").forEach(function(img){' +
        'const src=img.src||img.getAttribute("data-src")||"";' +
        'if((src.includes("down-th.img.susercontent.com/file/")||src.includes("susercontent.com/file/"))&&!images.includes(src)){' +
        'const c=src.replace(/_tn$/,"").split("?")[0];' +
        'if(!images.includes(c))images.push(c);' +
        '}' +
        '});' +
        '}' +
        'images=images.slice(0,15);' +
        'let videoUrl="";' +
        'if(d&&d.video_info_list&&d.video_info_list.length>0){' +
        'const v=d.video_info_list[0];' +
        'videoUrl=(v.default_format&&v.default_format.url)||(v.formats&&v.formats[0]&&v.formats[0].url)||"";' +
        '}' +
        'if(!videoUrl){' +
        'const ve=document.querySelector("video source")||document.querySelector("video");' +
        'if(ve&&ve.src)videoUrl=ve.src;' +
        '}' +
        'let desc="";' +
        'if(d&&d.description){desc=d.description;}' +
        'else{' +
        'const de=document.querySelector(".fM3Aih")||document.querySelector("div[style*=\\"white-space: pre-wrap\\"]");' +
        'desc=de?de.innerText.trim():"";' +
        '}' +
        'let variants=[];' +
        'if(d&&Array.isArray(d.models)&&d.models.length>0){' +
        'variants=d.models.map(function(m,idx){' +
        'let imgUrl=null;' +
        'if(m.extinfo&&Array.isArray(m.extinfo.tier_index)&&d.tier_variations){' +
        'const t0=m.extinfo.tier_index[0];' +
        'const tier0=d.tier_variations[0];' +
        'if(tier0&&tier0.images&&tier0.images[t0]){' +
        'imgUrl="https://down-th.img.susercontent.com/file/"+tier0.images[t0];' +
        '}' +
        '}' +
        'const price=m.price?(m.price/100000):(d.price?d.price/100000:0);' +
        'const stock=(m.stock!==undefined)?m.stock:(m.normal_stock||10);' +
        'return {name:m.name||("ตัวเลือก "+(idx+1)),sku:m.sku||m.model_sku||"",price:price,stock:stock,image_url:imgUrl};' +
        '});' +
        '}' +
        'let rawAttributes=[];' +
        'if(d&&Array.isArray(d.attributes)){' +
        'rawAttributes=d.attributes.map(function(a){return {name:a.name,value:a.value};});' +
        '}' +
        'let categories=[];' +
        'if(d&&Array.isArray(d.categories)){' +
        'categories=d.categories.map(function(c){return c.display_name;});' +
        '}' +
        'let weight="";' +
        'if(d&&d.weight){weight=(d.weight>50?(d.weight/1000):d.weight).toString();}' +
        'const copyTime=new Date().toLocaleString("th-TH");' +
        'const singlePayload={' +
        'source:"SGYVER_SHOPEE_IMPORT",version:"2.0",extracted_at:new Date().toISOString(),url:window.location.href,' +
        'itemid:itemid||"",shopid:shopid||"",' +
        'name:title,images:images,video_url:videoUrl,description:desc,weight:weight||"0.25",variants:variants,raw_attributes:rawAttributes,categories:categories' +
        '};' +
        'let basket=[];' +
        'try{basket=JSON.parse(localStorage.getItem("sgyver_basket")||"[]");if(!Array.isArray(basket))basket=[];}catch(e){basket=[];}' +
        'const cleanUrl=window.location.href.split("?")[0].replace(/\\/+$/,"");' +
        'const exIdx=basket.findIndex(function(it){' +
        'if(itemid&&it.itemid&&String(it.itemid)===String(itemid))return true;' +
        'if(it.url&&it.url.split("?")[0].replace(/\\/+$/,"")===cleanUrl)return true;' +
        'return false;' +
        '});' +
        'if(exIdx>=0){basket[exIdx]=singlePayload;}' +
        'else{basket.push(singlePayload);}' +
        'try{localStorage.setItem("sgyver_basket",JSON.stringify(basket));}catch(e){}' +
        'if(itemid){try{localStorage.setItem("sgyver_copied_"+itemid, copyTime);}catch(e){}}' +
        'const batchPayload={' +
        'source:"SGYVER_SHOPEE_BATCH",version:"2.0",mode:"basket",extracted_at:new Date().toISOString(),' +
        'total:basket.length,items:basket' +
        '};' +
        'const clipJson=JSON.stringify(batchPayload,null,2);' +
        'try{await navigator.clipboard.writeText(clipJson);}' +
        'catch(err){const t=document.createElement("textarea");t.value=clipJson;document.body.appendChild(t);t.select();document.execCommand("copy");document.body.removeChild(t);}' +
        'b.style.background="linear-gradient(135deg,#059669,#047857)";b.style.color="#fff";b.style.padding="16px 20px";' +
        'b.innerHTML=\'<div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-weight:bold;font-size:14px;display:flex;align-items:center;gap:6px;">🛒 สินค้าเข้าตะกร้าแล้ว (สะสม \'+ basket.length +\' สินค้า)!</div><button onclick="this.closest(\\\'#sgyver-shopee-toast\\\').remove()" style="background:transparent;border:none;color:#fff;font-size:16px;cursor:pointer;opacity:0.8;">✕</button></div>\' +' +
        '\'<div style="font-size:12px;margin-top:6px;background:rgba(0,0,0,0.22);padding:8px 10px;border-radius:10px;">\' +' +
        '\'<div style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\'+ (title||"สินค้า Shopee") +\'</div>\' +' +
        '\'<div style="font-size:11px;margin-top:3px;opacity:0.95;">📸 รูป: <b>\'+ images.length +\'</b> รูป | 🎬 วิดีโอ: <b>\'+ (videoUrl?"มี":"ไม่มี") +\'</b> | 🎨 ตัวเลือก: <b>\'+ variants.length +\'</b> แบบ</div>\' +' +
        '\'<div style="font-size:10.5px;color:#a7f3d0;margin-top:3px;">✅ อัปเดตคลิปบอร์ดแล้ว (\'+ basket.length +\' รายการ)</div>\' +' +
        '\'</div>\' +' +
        '\'<button id="sgyver-copy-single-btn" style="width:100%;margin-top:10px;padding:12px 14px;background:#fef08a;color:#854d0e;border:2px solid #ca8a04;border-radius:12px;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;gap:6px;">👉 📋 คัดลอกแล้ว (\'+ basket.length +\' ชิ้น)! สลับไปวางที่ S-Gyver</button>\' +' +
        '\'<div style="display:flex;gap:6px;margin-top:8px;">\' +' +
        '\'<button id="sgyver-clear-basket-btn" style="flex:1;padding:6px 8px;background:rgba(255,255,255,0.18);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:8px;font-size:11px;cursor:pointer;">🗑️ ล้างตะกร้า (เริ่มใหม่)</button>\' +' +
        '\'</div>\' +' +
        '\'<div style="font-size:10.5px;text-align:center;margin-top:6px;opacity:0.85;">💡 เปิดดูดสินค้าชิ้นอื่นต่อได้เลย หรือสลับไปวางที่ S-Gyver เพื่อลงทีเดียว</div>\';' +
        'const copyBtn=document.getElementById("sgyver-copy-single-btn");' +
        'if(copyBtn){' +
        'copyBtn.onclick=async function(){' +
        'try{await navigator.clipboard.writeText(clipJson);}' +
        'catch(e){const t=document.createElement("textarea");t.value=clipJson;document.body.appendChild(t);t.select();document.execCommand("copy");document.body.removeChild(t);}' +
        'copyBtn.innerHTML="✅ คัดลอกทั้ง "+ basket.length +" ชิ้นแล้ว!";copyBtn.style.background="#bbf7d0";copyBtn.style.color="#166534";' +
        '};' +
        '}' +
        'const clearBtn=document.getElementById("sgyver-clear-basket-btn");' +
        'if(clearBtn){' +
        'clearBtn.onclick=function(){' +
        'try{localStorage.removeItem("sgyver_basket");}catch(e){}' +
        'b.remove();' +
        'alert("🗑️ ล้างตะกร้าสะสมสินค้า Shopee เรียบร้อยแล้ว เริ่มดูดใหม่ได้เลยครับ");' +
        '};' +
        '}' +
        'setTimeout(function(){if(b&&b.parentNode)b.remove();},25000);' +
        '}' +
        'const prevCopied=itemid?localStorage.getItem("sgyver_copied_"+itemid):null;' +
        'let existingBasket=[];' +
        'try{existingBasket=JSON.parse(localStorage.getItem("sgyver_basket")||"[]");if(!Array.isArray(existingBasket))existingBasket=[];}catch(e){existingBasket=[];}' +
        'if(prevCopied){' +
        'b.style.background="linear-gradient(135deg,#d97706,#b45309)";b.style.color="#fff";b.style.padding="16px 20px";' +
        'b.innerHTML=\'<div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-weight:bold;font-size:14px;display:flex;align-items:center;gap:6px;">⚠️ สินค้านี้เคยดูดข้อมูลไปแล้ว!</div><button onclick="this.closest(\\\'#sgyver-shopee-toast\\\').remove()" style="background:transparent;border:none;color:#fff;font-size:16px;cursor:pointer;opacity:0.8;">✕</button></div>\' +' +
        '\'<div style="font-size:12px;margin-top:8px;background:rgba(0,0,0,0.25);padding:10px 12px;border-radius:10px;border-left:4px solid #fef08a;">\' +' +
        '\'<div>คุณเคยกดดูดสินค้านี้เข้า S-Gyver ไปแล้วเมื่อ:</div>\' +' +
        '\'<div style="font-weight:bold;font-size:13px;color:#fef08a;margin-top:2px;">🕒 \'+ prevCopied +\'</div>\' +' +
        '\'<div style="font-size:11px;margin-top:4px;opacity:0.9;">Shopee Item ID: <b>\'+ itemid +\'</b> (ในตะกร้ามี \'+ existingBasket.length +\' ชิ้น)</div>\' +' +
        '\'</div>\' +' +
        '\'<div style="font-size:11.5px;margin-top:8px;opacity:0.95;">ต้องการเพิ่มหรืออัปเดตข้อมูลสินค้านี้ลงในตะกร้าหรือไม่?</div>\' +' +
        '\'<div style="display:flex;gap:6px;margin-top:10px;">\' +' +
        '\'<button id="sgyver-btn-repeat" style="flex:1;padding:10px 12px;background:#fef08a;color:#854d0e;border:2px solid #ca8a04;border-radius:10px;font-weight:bold;font-size:12px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);">➕ เพิ่ม/อัปเดตลงตะกร้า</button>\' +' +
        '\'<button id="sgyver-btn-clear" style="padding:10px 10px;background:rgba(255,255,255,0.18);color:#fff;border:1px solid rgba(255,255,255,0.35);border-radius:10px;font-size:11px;cursor:pointer;" title="ล้างตะกร้าทั้งหมด">🗑️ ล้างตะกร้า</button>\' +' +
        '\'<button id="sgyver-btn-cancel" style="padding:10px 10px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:10px;font-size:11px;cursor:pointer;">✕ ยกเลิก</button>\' +' +
        '\'</div>\';' +
        'document.getElementById("sgyver-btn-repeat").onclick=function(){doExtractAndCopy(true);};' +
        'document.getElementById("sgyver-btn-clear").onclick=function(){localStorage.removeItem("sgyver_basket");if(itemid)localStorage.removeItem("sgyver_copied_"+itemid);doExtractAndCopy(true);};' +
        'document.getElementById("sgyver-btn-cancel").onclick=function(){b.remove();};' +
        '}else{' +
        'doExtractAndCopy(false);' +
        '}' +
        '}catch(err){alert("เกิดข้อผิดพลาดในการดูดข้อมูล: "+err.message);}' +
        '})();';
}

function initShopeeBookmarkletLink() {
    const link = document.getElementById('shopeeBookmarkletLink');
    if (!link) return;
    const code = getShopeeBookmarkletCode();
    link.href = code;
    link.onclick = function(e) {
        alert('💡 วิธีติดตั้ง Bookmarklet:\n\n1. คลิกค้างไว้ที่ปุ่ม "⭐️ ดูดสินค้า Shopee -> S-Gyver" แล้วลากขึ้นไปปล่อยบนแถบ บุ๊กมาร์ก (Bookmarks Bar) ด้านบนเบราว์เซอร์\n\n(กดแป้น Ctrl + Shift + B เพื่อเปิดแถบ Bookmark หากยังไม่เปิด)\n\nหรือกดปุ่ม "คัดลอกโค้ดสคริปต์ Bookmarklet" ด้านล่างเพื่อนำไปสร้างเองได้ครับ');
    };
}

async function copyShopeeBookmarkletCode() {
    const code = getShopeeBookmarkletCode();
    try {
        await navigator.clipboard.writeText(code);
        alert('📋 คัดลอกโค้ดสคริปต์ Bookmarklet เรียบร้อยแล้ว!\n\nวิธีนำไปใช้ในเบราว์เซอร์:\n1. คลิกขวาที่แถบ Bookmark ด้านบน -> เลือก "เพิ่มหน้า..." (Add Page / Add Bookmark)\n2. ช่องชื่อ: ตั้งชื่อเป็น "⭐️ ดูดสินค้า Shopee"\n3. ช่อง URL: วางโค้ดที่คัดลอกไปนี้ลงไป แล้วกดบันทึก\n\nเวลาเปิดดูสินค้าบน Shopee ก็แค่คลิกบุ๊กมาร์กนี้ได้ทันที!');
    } catch (err) {
        prompt('กรุณาคัดลอกโค้ด Bookmarklet ด้านล่างนี้:', code);
    }
}

// ------------------------------------------------------------------------------
// 🛒 Shopee Scraper Basket Batch Importer (สร้างหลายการ์ดพร้อมกัน)
// ------------------------------------------------------------------------------

function openShopeeBasketConfirmModal(data) {
    const modal = document.getElementById('shopeeBasketConfirmModal');
    if (!modal) return;
    const items = data.items || [];
    if (items.length === 0) return;

    const totalBadge = document.getElementById('basketConfirmTotalBadge');
    if (totalBadge) totalBadge.innerText = `${items.length} รายการ`;

    const btnText = document.getElementById('btnBasketConfirmImportAllText');
    if (btnText) btnText.innerText = `⚡ สร้าง ${items.length} การ์ดสินค้าลงคลังทันที`;

    const listEl = document.getElementById('basketConfirmItemsList');
    if (listEl) {
        listEl.innerHTML = items.map((it, idx) => {
            const img = (it.images && it.images.length > 0) ? it.images[0] : (it.image_url || '');
            const varCount = Array.isArray(it.variants) ? it.variants.length : 1;
            const imgCount = Array.isArray(it.images) ? it.images.length : (it.image_url ? 1 : 0);
            const price = it.price || (it.variants?.[0]?.price) || '-';
            const priceStr = price !== '-' ? `฿${parseFloat(price).toLocaleString('th-TH')}` : '-';

            return `
                <div class="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3.5 hover:border-emerald-300 transition-all">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                            #${idx + 1}
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            ${img ? `<img src="${img}" class="w-full h-full object-cover">` : `<i class="bi bi-image text-slate-400"></i>`}
                        </div>
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-slate-800 truncate" title="${escapeHtml(it.name || '')}">
                                ${escapeHtml(it.name || 'สินค้า Shopee')}
                            </div>
                            <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>📸 <b>${imgCount}</b> รูป</span>
                                <span>•</span>
                                <span>🎨 <b>${varCount}</b> ตัวเลือก</span>
                                ${it.itemid ? `<span>•</span><span class="text-[10px] text-slate-400">ID: ${it.itemid}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-xs font-black text-emerald-600">${priceStr}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">พร้อมสร้างการ์ด</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const importBtn = document.getElementById('btnBasketConfirmImportAll');
    if (importBtn) {
        importBtn.onclick = function() {
            closeShopeeBasketConfirmModal();
            executeShopeeBasketBatchImport(items);
        };
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeShopeeBasketConfirmModal() {
    const modal = document.getElementById('shopeeBasketConfirmModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function executeShopeeBasketBatchImport(items) {
    if (!Array.isArray(items) || items.length === 0) return;

    const catTree = getStoredCategoryTree();
    const existingProducts = InventoryApp.products || [];
    const prefixSeqTracker = new Map();
    const allNewItems = [];
    let totalVariantsCreated = 0;

    items.forEach((data, pIdx) => {
        // 1. Determine Category & SKU Prefix
        const titleLower = ((data.name || '') + ' ' + (data.categories ? data.categories.join(' ') : '')).toLowerCase();
        let chosenL1 = -1, chosenL2 = -1, chosenL3 = -1;
        let foundCat = false;

        // Eyewear check
        const isEyewear = /แว่น|แว่นตา|แว่นกันแดด|แว่นสายตา|แว่นแฟชั่น|glasses|sunglasses|eyewear|goggles|เลนส์/i.test(titleLower);
        if (isEyewear) {
            for (let i = 0; i < catTree.length; i++) {
                if (catTree[i].code === 'ACC' || (catTree[i].name && catTree[i].name.includes('เครื่องประดับ'))) {
                    const l1 = catTree[i];
                    if (l1.children) {
                        for (let j = 0; j < l1.children.length; j++) {
                            const l2 = l1.children[j];
                            if (l2.code === 'EYE' || (l2.name && l2.name.includes('แว่น'))) {
                                chosenL1 = i; chosenL2 = j; chosenL3 = 0;
                                if (l2.children) {
                                    for (let k = 0; k < l2.children.length; k++) {
                                        const l3 = l2.children[k];
                                        if (/สายตา|กรองแสง|opt/i.test(titleLower) && (l3.code === 'OPT' || l3.name.includes('สายตา'))) {
                                            chosenL3 = k; break;
                                        } else if (/แฟชั่น|fsh/i.test(titleLower) && (l3.code === 'FSH' || l3.name.includes('แฟชั่น'))) {
                                            chosenL3 = k; break;
                                        } else if (/กันแดด|sun/i.test(titleLower) && (l3.code === 'SUN' || l3.name.includes('กันแดด'))) {
                                            chosenL3 = k; break;
                                        }
                                    }
                                }
                                foundCat = true;
                                break;
                            }
                        }
                    }
                    if (foundCat) break;
                }
            }
        }

        // Level 3 matching
        if (!foundCat) {
            for (let i = 0; i < catTree.length; i++) {
                const l1 = catTree[i];
                if (!l1.children) continue;
                for (let j = 0; j < l1.children.length; j++) {
                    const l2 = l1.children[j];
                    if (!l2.children) continue;
                    for (let k = 0; k < l2.children.length; k++) {
                        const l3 = l2.children[k];
                        const l3Name = (l3.name || '').toLowerCase();
                        if (l3Name && titleLower.includes(l3Name)) {
                            chosenL1 = i; chosenL2 = j; chosenL3 = k;
                            foundCat = true; break;
                        }
                    }
                    if (foundCat) break;
                }
                if (foundCat) break;
            }
        }

        // Level 2 matching
        if (!foundCat) {
            for (let i = 0; i < catTree.length; i++) {
                const l1 = catTree[i];
                if (!l1.children) continue;
                for (let j = 0; j < l1.children.length; j++) {
                    const l2 = l1.children[j];
                    const l2Name = (l2.name || '').toLowerCase();
                    if (l2Name && titleLower.includes(l2Name)) {
                        chosenL1 = i; chosenL2 = j; chosenL3 = 0;
                        foundCat = true; break;
                    }
                }
                if (foundCat) break;
            }
        }

        // General fallback
        if (!foundCat || chosenL1 === -1) {
            let genIdx = catTree.findIndex(l1 => l1.code === 'GEN' || (l1.name && l1.name.includes('ทั่วไป')));
            if (genIdx !== -1) { chosenL1 = genIdx; chosenL2 = 0; chosenL3 = 0; }
            else { chosenL1 = 0; chosenL2 = 0; chosenL3 = 0; }
        }

        const l1Obj = catTree[chosenL1];
        const l2Obj = l1Obj?.children?.[chosenL2];
        const l3Obj = l2Obj?.children?.[chosenL3];
        const fullCatPath = [l1Obj?.name, l2Obj?.name, l3Obj?.name].filter(Boolean).join(' > ');
        
        const codes = [];
        if (l1Obj?.code) codes.push(l1Obj.code.trim().toUpperCase());
        if (l2Obj?.code) codes.push(l2Obj.code.trim().toUpperCase());
        if (l3Obj?.code) codes.push(l3Obj.code.trim().toUpperCase());
        const prefix = codes.length > 0 ? codes.join('-') : 'GEN';

        if (!prefixSeqTracker.has(prefix)) {
            let maxSeq = 0;
            const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const prefixPattern = new RegExp(`^${escaped}-([0-9]+)(?:[-_][0-9A-Z]+)?$`, 'i');
            existingProducts.forEach(p => {
                const sku = (p.sku || '').trim().toUpperCase();
                const pSku = (p.parent_sku || '').trim().toUpperCase();
                const pKey = (typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : '').trim().toUpperCase();
                [sku, pSku, pKey].forEach(val => {
                    if (!val) return;
                    const m = val.match(prefixPattern);
                    if (m && m[1]) {
                        const num = parseInt(m[1], 10);
                        if (!isNaN(num) && num > maxSeq) maxSeq = num;
                    }
                });
            });
            prefixSeqTracker.set(prefix, maxSeq);
        }

        const nextSeqNum = prefixSeqTracker.get(prefix) + 1;
        prefixSeqTracker.set(prefix, nextSeqNum);
        const parentSku = `${prefix}-${String(nextSeqNum).padStart(3, '0')}`;

        // Prepare Images
        const galleryImages = Array.isArray(data.images) ? data.images.slice(0, 15) : [];
        const coverImage = galleryImages.length > 0 ? galleryImages[0] : (data.image_url || '');

        // Cache in localStorage
        if (coverImage) localStorage.setItem('sgyver_img_' + parentSku, coverImage);
        if (galleryImages.length > 0) localStorage.setItem('sgyver_gallery_' + parentSku, JSON.stringify(galleryImages));
        if (data.description) localStorage.setItem('sgyver_desc_' + parentSku, data.description);
        if (data.video_url) localStorage.setItem('sgyver_video_' + parentSku, data.video_url);
        if (data.url) {
            localStorage.setItem('sgyver_product_url_' + parentSku, data.url);
            localStorage.setItem('sgyver_shopee_url_' + parentSku, data.url);
        }
        if (data.itemid) localStorage.setItem('sgyver_shopee_itemid_' + parentSku, data.itemid);
        localStorage.setItem('sgyver_shopee_time_' + parentSku, new Date().toLocaleString('th-TH'));
        localStorage.setItem('sgyver_cat_' + parentSku, fullCatPath);

        // Shipping Data
        const shippingData = {
            weight: parseFloat(data.weight || 0.25),
            width: 15, length: 25, height: 5,
            standard: true, express: true
        };
        localStorage.setItem('sgyver_shipping_' + parentSku, JSON.stringify(shippingData));

        const distributor = data.shopid ? `Shopee Shop ID ${data.shopid}` : 'Shopee Seller Centre';

        // Variants or Single
        if (Array.isArray(data.variants) && data.variants.length > 0) {
            data.variants.forEach((v, vIdx) => {
                const subSku = `${parentSku}-${String(vIdx + 1).padStart(2, '0')}`;
                const variantImg = v.image_url || coverImage || null;
                if (variantImg) localStorage.setItem('sgyver_img_' + subSku, variantImg);
                if (galleryImages.length > 0) localStorage.setItem('sgyver_gallery_' + subSku, JSON.stringify(galleryImages));
                localStorage.setItem('sgyver_parent_sku_' + subSku, parentSku);
                localStorage.setItem('sgyver_shipping_' + subSku, JSON.stringify(shippingData));
                if (data.url) localStorage.setItem('sgyver_product_url_' + subSku, data.url);

                const itemPayload = {
                    id: Date.now() + Math.floor(Math.random() * 10000) + (pIdx * 100) + vIdx,
                    sku: subSku,
                    parent_sku: parentSku,
                    name: data.name,
                    product_type: fullCatPath,
                    image_url: variantImg,
                    images: galleryImages,
                    video_url: data.video_url || null,
                    variant: v.name || `ตัวเลือกที่ ${vIdx + 1}`,
                    price: (v.price !== null && v.price !== undefined && !isNaN(v.price)) ? parseFloat(v.price) : 290,
                    stock_quantity: (v.stock !== null && v.stock !== undefined && !isNaN(v.stock)) ? parseInt(v.stock, 10) : 10,
                    min_stock_alert: 5,
                    warehouse_location: 'A-01',
                    distributor: distributor,
                    care_instructions: '',
                    product_url: data.url || null,
                    item_id: data.itemid || null,
                    location_note: null,
                    location_image: null,
                    updated_at: new Date().toISOString()
                };

                InventoryApp.products.push(itemPayload);
                allNewItems.push(itemPayload);
                totalVariantsCreated++;
            });
        } else {
            const itemPayload = {
                id: Date.now() + Math.floor(Math.random() * 10000) + (pIdx * 100),
                sku: parentSku,
                parent_sku: parentSku,
                name: data.name,
                product_type: fullCatPath,
                image_url: coverImage || null,
                images: galleryImages,
                video_url: data.video_url || null,
                variant: 'มาตรฐาน',
                price: data.price ? parseFloat(data.price) : 290,
                stock_quantity: data.stock ? parseInt(data.stock, 10) : 10,
                min_stock_alert: 5,
                warehouse_location: 'A-01',
                distributor: distributor,
                care_instructions: '',
                product_url: data.url || null,
                item_id: data.itemid || null,
                location_note: null,
                location_image: null,
                updated_at: new Date().toISOString()
            };

            InventoryApp.products.push(itemPayload);
            allNewItems.push(itemPayload);
            totalVariantsCreated++;
        }
    });

    saveCustomProductsToLocalCache();
    calculateMetrics(InventoryApp.products);
    renderTable();

    // Background upsert
    safeSupabaseUpsert(allNewItems);

    // Show celebratory toast
    showToastNotification(`🎉 นำเข้าสำเร็จ! สร้างการ์ดสินค้าหลัก ${items.length} สินค้า (${totalVariantsCreated} SKU ย่อย) เรียบร้อยแล้ว`);
}

function openShopeeScraperModal() {
    const modal = document.getElementById('shopeeScraperModal');
    if (!modal) return;
    initShopeeBookmarkletLink();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeShopeeScraperModal() {
    const modal = document.getElementById('shopeeScraperModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function importShopeeFromClipboard() {
    try {
        let text = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
            try {
                text = await navigator.clipboard.readText();
            } catch (clipErr) {
                console.warn('Direct clipboard read blocked by browser:', clipErr);
            }
        }

        if (!text || !text.trim()) {
            const manual = prompt('📋 กรุณากดปุ่ม Ctrl + V เพื่อวางข้อมูลสินค้าที่ดูดมาจาก Shopee ลงในช่องนี้ได้เลยครับ:');
            if (manual && manual.trim()) {
                text = manual.trim();
            } else {
                openShopeeScraperModal();
                return;
            }
        }

        const trimmed = text.trim();
        // Check if user copied Shopee URL instead of running bookmarklet
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            if (trimmed.includes('shopee.')) {
                alert('💡 ในคลิปบอร์ดของคุณยังเป็น "ลิงก์ URL ของ Shopee" (ยังไม่ใช่ข้อมูลสินค้าที่ดูดมา)\n\n👉 วิธีแก้ไขง่ายๆ ใน 2 วินาที:\n1. สลับไปที่แท็บหน้าสินค้าบน Shopee\n2. กดปุ่มบุ๊กมาร์ก "⭐️ ดูดสินค้า Shopee -> S-Gyver" ด้านบน\n3. ที่ป้ายสีเขียวมุมขวาบน ให้คลิกที่ปุ่มสีเหลือง "📋 คลิกตรงนี้เพื่อคัดลอกข้อมูลสินค้า"\n4. สลับกลับมากดปุ่ม "วางข้อมูลจาก Shopee" นี้อีกครั้งได้ทันทีครับ!');
                openShopeeScraperModal();
                const rawInput = document.getElementById('rawShopeeInput');
                if (rawInput) rawInput.value = trimmed;
                return;
            }
        }

        // Try JSON parse
        let parsed = null;
        try {
            parsed = JSON.parse(trimmed);
        } catch (e) {
            openShopeeScraperModal();
            const rawInput = document.getElementById('rawShopeeInput');
            if (rawInput) rawInput.value = trimmed;
            return;
        }

        // Check if Batch Mode payload
        if (parsed && (parsed.source === 'SGYVER_SHOPEE_BATCH' || Array.isArray(parsed.items))) {
            closeShopeeScraperModal();
            if (parsed.items && parsed.items.length === 1) {
                applyShopeeExtractedData(parsed.items[0]);
            } else if (parsed.items && parsed.items.length > 1) {
                openShopeeBasketConfirmModal(parsed);
            } else {
                applyShopeeBatchExtractedData(parsed);
            }
            return;
        }

        // Check if Single Product payload
        if (parsed && (parsed.source === 'SGYVER_SHOPEE_IMPORT' || parsed.name || (parsed.images && parsed.images.length > 0))) {
            closeShopeeScraperModal();
            applyShopeeExtractedData(parsed);
        } else {
            openShopeeScraperModal();
            const rawInput = document.getElementById('rawShopeeInput');
            if (rawInput) rawInput.value = trimmed;
        }
    } catch (err) {
        console.warn('Clipboard read error, opening modal:', err);
        const manual = prompt('📋 ไม่สามารถอ่านคลิปบอร์ดได้ กรุณากด Ctrl + V เพื่อวางข้อมูลที่ดูดมาจาก Shopee:');
        if (manual && manual.trim()) {
            try {
                const parsed = JSON.parse(manual.trim());
                if (parsed.source === 'SGYVER_SHOPEE_BATCH' || Array.isArray(parsed.items)) {
                    if (parsed.items && parsed.items.length === 1) {
                        applyShopeeExtractedData(parsed.items[0]);
                    } else if (parsed.items && parsed.items.length > 1) {
                        openShopeeBasketConfirmModal(parsed);
                    } else {
                        applyShopeeBatchExtractedData(parsed);
                    }
                } else {
                    applyShopeeExtractedData(parsed);
                }
                return;
            } catch(e) {}
        }
        openShopeeScraperModal();
    }
}

// Auto-detect Shopee Bookmarklet payload when user switches tabs to S-Gyver
let lastAutoDetectedPayload = '';
function showShopeeAutoDetectToast(data) {
    if (!data) return;
    const isBatch = data.source === 'SGYVER_SHOPEE_BATCH' || Array.isArray(data.items);
    if (!isBatch && !data.name) return;

    let t = document.getElementById('sgyver-autodetect-toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.id = 'sgyver-autodetect-toast';
    t.className = 'fixed bottom-6 right-6 z-[999999] bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-300 flex items-center gap-3.5 animate-bounce';

    const count = data.items?.length || 0;
    const titleText = isBatch ? `ตรวจพบสินค้าในตะกร้าดูด Shopee (${count} รายการ)!` : escapeHtml(data.name || 'สินค้า Shopee');
    const subText = isBatch ? `พร้อมสร้างการ์ดสินค้า ${count} รายการลงคลังทันที` : `รูป ${data.images?.length || 0} รูป | ${data.variants?.length || 0} ตัวเลือก`;
    const btnText = isBatch ? (count > 1 ? `สร้าง ${count} การ์ดทันที` : 'วางข้อมูลทันที') : 'วางข้อมูลทันที';

    t.innerHTML = `
        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
            🛒
        </div>
        <div class="max-w-[280px]">
            <div class="text-xs font-black flex items-center gap-1.5 text-yellow-300">
                <span>${isBatch ? `📦 ตะกร้าดูด Shopee (${count} สินค้า)!` : 'ตรวจพบสินค้าจาก Shopee ในคลิปบอร์ด!'}</span>
            </div>
            <div class="text-[11px] font-semibold truncate text-white/95 mt-0.5">${titleText}</div>
            <div class="text-[10px] text-white/80">${subText}</div>
        </div>
        <button type="button" id="btnAutoDetectPasteNow"
            class="px-4 py-2 bg-white text-emerald-800 hover:bg-yellow-300 hover:text-emerald-950 text-xs font-black rounded-xl shadow-md transition-all active:scale-95 shrink-0 cursor-pointer">
            ${btnText}
        </button>
        <button type="button" onclick="this.closest('#sgyver-autodetect-toast').remove()" class="text-white/70 hover:text-white text-sm p-1 ml-1 cursor-pointer">✕</button>
    `;
    document.body.appendChild(t);
    const pasteBtn = document.getElementById('btnAutoDetectPasteNow');
    if (pasteBtn) {
        pasteBtn.onclick = function() {
            t.remove();
            if (isBatch) {
                if (data.items && data.items.length === 1) {
                    applyShopeeExtractedData(data.items[0]);
                } else if (data.items && data.items.length > 1) {
                    openShopeeBasketConfirmModal(data);
                } else {
                    applyShopeeBatchExtractedData(data);
                }
            } else {
                applyShopeeExtractedData(data);
            }
        };
    }
    setTimeout(() => { if (t && t.parentNode) t.remove(); }, 20000);
}

async function pasteShopeeClipboardToInput() {
    try {
        let text = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
            text = await navigator.clipboard.readText();
        }
        const rawInput = document.getElementById('rawShopeeInput');
        if (rawInput && text) {
            rawInput.value = text;
        }
    } catch (err) {
        console.warn('Clipboard read failed:', err);
    }
}

function processShopeeRawInput() {
    const rawInput = document.getElementById('rawShopeeInput');
    const text = (rawInput?.value || '').trim();
    if (!text) {
        alert('กรุณาวางข้อมูลสินค้าหรือลิงก์ Shopee ก่อนครับ');
        return;
    }

    try {
        const parsed = JSON.parse(text);
        if (parsed.source === 'SGYVER_SHOPEE_BATCH' || Array.isArray(parsed.items)) {
            closeShopeeScraperModal();
            if (parsed.items && parsed.items.length === 1) {
                applyShopeeExtractedData(parsed.items[0]);
            } else if (parsed.items && parsed.items.length > 1) {
                openShopeeBasketConfirmModal(parsed);
            } else {
                applyShopeeBatchExtractedData(parsed);
            }
            return;
        }
        if (parsed && (parsed.name || (parsed.images && parsed.images.length > 0))) {
            applyShopeeExtractedData(parsed);
            closeShopeeScraperModal();
            return;
        }
    } catch (e) {
        // Not JSON
    }

    alert('⚠️ รูปแบบข้อมูลไม่ถูกต้อง กรุณาใช้ปุ่ม Bookmarklet ดูดสินค้าจาก Shopee แล้วนำข้อมูล JSON มาวางครับ');
}

// Whole Page / Batch Shopee Import Processor
function applyShopeeBatchExtractedData(data) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
        alert('⚠️ ไม่พบรายการสินค้าในข้อมูลชุดที่คัดลอกมา');
        return;
    }

    // Filter out marketing / promo banners & non-products (Seller AI Assistant, เพิ่มยอดขาย, ฯลฯ)
    const rawTotal = data.items.length;
    data.items = data.items.filter(item => {
        if (!item || !item.name) return false;
        if (isJunkShopeeProduct(item)) return false;
        if ((!item.price || item.price === 0) && (!item.stock || item.stock <= 0)) return false;
        return true;
    });

    const filteredPromoCount = rawTotal - data.items.length;
    if (filteredPromoCount > 0) {
        console.log(`[Shopee Batch] กรองป้ายโฆษณา/ตัวช่วย Seller Centre ออกอัตโนมัติแล้ว ${filteredPromoCount} รายการ`);
    }

    if (data.items.length === 0) {
        alert('⚠️ รายการทั้งหมดในหน้านี้เป็นป้ายโฆษณาและเครื่องมือช่วยขายของ Shopee (ไม่ใช่สินค้าจริง) ระบบจึงกรองออกให้เรียบร้อยแล้วครับ');
        return;
    }

    const catTree = getStoredCategoryTree();
    const existingProducts = InventoryApp.products || [];
    const existingSkuMap = new Map();
    existingProducts.forEach(p => {
        if (p.sku) existingSkuMap.set(p.sku.trim().toUpperCase(), p);
    });

    const prefixSeqTracker = new Map();
    const newItems = [];
    const existingItems = [];
    const parsedRows = [];

    data.items.forEach((item, idx) => {
        const titleLower = (item.name || '').toLowerCase();
        let chosenL1 = 0, chosenL2 = 0, chosenL3 = 0;
        let foundCat = false;

        // Match Level 3 (e.g. เลกกิ้ง, เสื้อยืด, กางเกงยีนส์)
        for (let i = 0; i < catTree.length; i++) {
            const l1 = catTree[i];
            if (!l1.children) continue;
            for (let j = 0; j < l1.children.length; j++) {
                const l2 = l1.children[j];
                if (!l2.children) continue;
                for (let k = 0; k < l2.children.length; k++) {
                    const l3 = l2.children[k];
                    if (l3.name && titleLower.includes(l3.name.toLowerCase())) {
                        chosenL1 = i; chosenL2 = j; chosenL3 = k;
                        foundCat = true;
                        break;
                    }
                }
                if (foundCat) break;
            }
            if (foundCat) break;
        }

        // Match Level 2 fallback
        if (!foundCat) {
            for (let i = 0; i < catTree.length; i++) {
                const l1 = catTree[i];
                if (!l1.children) continue;
                for (let j = 0; j < l1.children.length; j++) {
                    const l2 = l1.children[j];
                    if (l2.name && titleLower.includes(l2.name.toLowerCase())) {
                        chosenL1 = i; chosenL2 = j; chosenL3 = 0;
                        foundCat = true;
                        break;
                    }
                }
                if (foundCat) break;
            }
        }

        const l1Obj = catTree[chosenL1];
        const l2Obj = l1Obj?.children?.[chosenL2];
        const l3Obj = l2Obj?.children?.[chosenL3];
        const catPath = [l1Obj?.name, l2Obj?.name, l3Obj?.name].filter(Boolean).join(' > ');

        const codes = [];
        if (l1Obj?.code) codes.push(l1Obj.code.trim().toUpperCase());
        if (l2Obj?.code) codes.push(l2Obj.code.trim().toUpperCase());
        if (l3Obj?.code) codes.push(l3Obj.code.trim().toUpperCase());
        const prefix = codes.length > 0 ? codes.join('-') : 'GEN';

        if (!prefixSeqTracker.has(prefix)) {
            let maxSeq = 0;
            const prefixPattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-([0-9]+)$`, 'i');
            existingProducts.forEach(p => {
                if (!p.sku) return;
                const m = p.sku.trim().match(prefixPattern);
                if (m && m[1]) {
                    const num = parseInt(m[1], 10);
                    if (num > maxSeq) maxSeq = num;
                }
            });
            prefixSeqTracker.set(prefix, maxSeq);
        }

        const nextSeq = prefixSeqTracker.get(prefix) + 1;
        prefixSeqTracker.set(prefix, nextSeq);
        const generatedSku = `${prefix}-${String(nextSeq).padStart(3, '0')}`;

        if (item.image_url) {
            try { localStorage.setItem('sgyver_img_' + generatedSku, item.image_url); } catch(e){}
        }

        const itemObj = {
            rowNumber: idx + 1,
            sku: generatedSku,
            name: item.name,
            variant: item.sold_text || 'สินค้าจาก Shopee',
            price: item.price || 0,
            stock_quantity: (item.stock !== undefined && item.stock !== null && !isNaN(item.stock)) ? item.stock : 10,
            min_stock_alert: 5,
            category: catPath,
            image_url: item.image_url || null,
            product_url: item.url || '',
            distributor: item.shopid ? `Shopee Shop ID ${item.shopid}` : 'Shopee Seller Centre'
        };

        parsedRows.push(itemObj);

        if (existingItemMatch || existingSkuMap.has(generatedSku.toUpperCase())) {
            const ex = existingItemMatch || existingSkuMap.get(generatedSku.toUpperCase());
            itemObj.isExisting = true;
            itemObj.existingId = ex.id;
            itemObj.existingStock = ex.stock_quantity ?? 0;
            itemObj.existingLocation = ex.warehouse_location || 'A-01';
            existingItems.push(itemObj);
        } else {
            itemObj.isExisting = false;
            newItems.push(itemObj);
        }
    });

    openShopeeImportModal(false);

    ShopeeImportState.parsedRows = parsedRows;
    ShopeeImportState.newItems = newItems;
    ShopeeImportState.existingItems = existingItems;
    ShopeeImportState.invalidItems = [];
    ShopeeImportState.previewTab = 'ALL';

    const fileInfo = document.getElementById('shopeeFileInfo');
    const fileName = document.getElementById('shopeeFileName');
    const fileSize = document.getElementById('shopeeFileSize');
    const dropzone = document.getElementById('shopeeDropzone');
    if (fileInfo && fileName && fileSize) {
        fileName.innerText = (data.page_title || 'สินค้าจาก Shopee') + ` (${data.items.length} รายการ)`;
        fileSize.innerText = `ดูดผ่าน Bookmarklet เมื่อ ${new Date().toLocaleTimeString('th-TH')}`;
        fileInfo.classList.remove('hidden');
        if (dropzone) dropzone.classList.add('hidden');
    }

    renderShopeeAnalysis();
}

function applyShopeeExtractedData(data) {
    if (!data) return;

    // Extract itemid and clean url from Shopee data
    const rawItemId = data.itemid || (data.url && (data.url.match(/-i\.(\d+)\.(\d+)/)?.[2] || data.url.match(/\/product\/(\d+)\/(\d+)/)?.[2] || data.url.match(/[?&]item_?id=(\d+)/)?.[1])) || '';
    const cleanUrl = (data.url || '').split('?')[0].replace(/\/+$/, '');

    // Duplicate detection against existing warehouse items (unless user chose to allow duplicate)
    if (!data._allowDuplicate && (rawItemId || cleanUrl)) {
        let existingMatch = null;
        if (Array.isArray(InventoryApp.products)) {
            existingMatch = InventoryApp.products.find(p => {
                const pKey = typeof getParentGroupKey === 'function' ? getParentGroupKey(p) : (p.parent_sku || p.sku);
                const storedUrl = (p.product_url || localStorage.getItem('sgyver_shopee_url_' + pKey) || localStorage.getItem('sgyver_shopee_url_' + p.sku) || '').split('?')[0].replace(/\/+$/, '');
                const storedItemId = p.item_id || p.shopee_itemid || localStorage.getItem('sgyver_shopee_itemid_' + pKey) || localStorage.getItem('sgyver_shopee_itemid_' + p.sku) || '';

                if (rawItemId && storedItemId && String(storedItemId) === String(rawItemId)) return true;
                if (cleanUrl && storedUrl && cleanUrl === storedUrl) return true;
                return false;
            });
        }

        if (existingMatch) {
            openDuplicateShopeeModal(existingMatch, data);
            return;
        }
    }

    InventoryApp.currentShopeeUrl = data.url || '';
    InventoryApp.currentShopeeItemId = rawItemId || '';

    // 1. Open Product Modal (fresh clean state)
    openProductModal();

    // Set Tab 7: Product Source URL
    const urlInput = document.getElementById('modalProductUrl');
    if (urlInput) {
        urlInput.value = data.url || '';
        checkModalProductUrlDuplicate();
    }

    // 2. Set Product Name
    const nameInput = document.getElementById('modalName');
    if (nameInput) {
        nameInput.value = data.name || '';
        const charCount = document.getElementById('modalNameCharCount');
        if (charCount) charCount.innerText = `${nameInput.value.length}/120`;
    }

    // 3. Set Gallery Images (Up to 15 slots)
    if (Array.isArray(data.images) && data.images.length > 0) {
        InventoryApp.modalImages = data.images.slice(0, 15);
        renderModalGallery();
    }

    // 4. Set Video URL
    if (data.video_url) {
        InventoryApp.modalVideoUrl = data.video_url;
        const vidInput = document.getElementById('modalVideoUrlInput');
        if (vidInput) vidInput.value = data.video_url;
        renderModalVideo();
    } else {
        InventoryApp.modalVideoUrl = '';
        renderModalVideo();
    }

    // 5. Intelligent Category Matching & SKU Generation
    const titleLower = ((data.name || '') + ' ' + (data.categories ? data.categories.join(' ') : '')).toLowerCase();
    const catTree = getStoredCategoryTree();
    let chosenL1 = -1, chosenL2 = -1, chosenL3 = -1;
    let foundCat = false;

    // 5.1 Explicit Keyword: Eyewear / Sunglasses (แว่นตา, แว่นกันแดด)
    const isEyewear = /แว่น|แว่นตา|แว่นกันแดด|แว่นสายตา|แว่นแฟชั่น|glasses|sunglasses|eyewear|goggles|เลนส์/i.test(titleLower);
    if (isEyewear) {
        for (let i = 0; i < catTree.length; i++) {
            if (catTree[i].code === 'ACC' || (catTree[i].name && catTree[i].name.includes('เครื่องประดับ'))) {
                const l1 = catTree[i];
                if (l1.children) {
                    for (let j = 0; j < l1.children.length; j++) {
                        const l2 = l1.children[j];
                        if (l2.code === 'EYE' || (l2.name && l2.name.includes('แว่น'))) {
                            chosenL1 = i; chosenL2 = j; chosenL3 = 0; // Default SUN (แว่นกันแดด)
                            if (l2.children) {
                                for (let k = 0; k < l2.children.length; k++) {
                                    const l3 = l2.children[k];
                                    if (/สายตา|กรองแสง|opt/i.test(titleLower) && (l3.code === 'OPT' || l3.name.includes('สายตา'))) {
                                        chosenL3 = k; break;
                                    } else if (/แฟชั่น|fsh/i.test(titleLower) && (l3.code === 'FSH' || l3.name.includes('แฟชั่น'))) {
                                        chosenL3 = k; break;
                                    } else if (/กันแดด|sun/i.test(titleLower) && (l3.code === 'SUN' || l3.name.includes('กันแดด'))) {
                                        chosenL3 = k; break;
                                    }
                                }
                            }
                            foundCat = true;
                            break;
                        }
                    }
                }
                if (foundCat) break;
            }
        }
    }

    // 5.2 Match Level 3 from category tree (e.g. เลกกิ้ง, เสื้อยืด, ยีนส์)
    if (!foundCat) {
        for (let i = 0; i < catTree.length; i++) {
            const l1 = catTree[i];
            if (!l1.children) continue;
            for (let j = 0; j < l1.children.length; j++) {
                const l2 = l1.children[j];
                if (!l2.children) continue;
                for (let k = 0; k < l2.children.length; k++) {
                    const l3 = l2.children[k];
                    const l3Name = (l3.name || '').toLowerCase();
                    if (l3Name && titleLower.includes(l3Name)) {
                        chosenL1 = i; chosenL2 = j; chosenL3 = k;
                        foundCat = true;
                        break;
                    }
                }
                if (foundCat) break;
            }
            if (foundCat) break;
        }
    }

    // 5.3 Fallback: Match Level 2 (e.g. กางเกง, เสื้อ, หมวก)
    if (!foundCat) {
        for (let i = 0; i < catTree.length; i++) {
            const l1 = catTree[i];
            if (!l1.children) continue;
            for (let j = 0; j < l1.children.length; j++) {
                const l2 = l1.children[j];
                const l2Name = (l2.name || '').toLowerCase();
                if (l2Name && titleLower.includes(l2Name)) {
                    chosenL1 = i; chosenL2 = j; chosenL3 = 0;
                    foundCat = true;
                    break;
                }
            }
            if (foundCat) break;
        }
    }

    // 5.4 Safe Fallback: If STILL not found, use "สินค้าทั่วไป (General)" -> GEN-MSC-STD
    // NEVER default to index 0, 0, 0 (Leggings)!
    if (!foundCat || chosenL1 === -1) {
        let genIdx = catTree.findIndex(l1 => l1.code === 'GEN' || (l1.name && l1.name.includes('ทั่วไป')));
        if (genIdx !== -1) {
            chosenL1 = genIdx;
            chosenL2 = 0;
            chosenL3 = 0;
        } else {
            chosenL1 = 0;
            chosenL2 = 0;
            chosenL3 = 0;
        }
    }

    InventoryApp.catTreeState = { l1Idx: chosenL1, l2Idx: chosenL2, l3Idx: chosenL3 };
    const l1Obj = catTree[chosenL1];
    const l2Obj = l1Obj?.children?.[chosenL2];
    const l3Obj = l2Obj?.children?.[chosenL3];
    const fullCatPath = [l1Obj?.name, l2Obj?.name, l3Obj?.name].filter(Boolean).join(' > ');
    const { prefix, suggestedSku } = getSuggestedSkuForCategoryTree(l1Obj, l2Obj, l3Obj);

    let finalParentSku = suggestedSku;

    // Update UI elements for Category
    const dispCat = document.getElementById('displayModalCategory');
    if (dispCat) dispCat.textContent = fullCatPath;
    const dispSku = document.getElementById('displayModalCategorySku');
    if (dispSku) dispSku.textContent = prefix;
    const tab2Badge = document.getElementById('tab2CategoryBadge');
    if (tab2Badge) tab2Badge.textContent = fullCatPath;

    const selectCat = document.getElementById('modalCategory');
    if (selectCat) {
        let exists = false;
        for (let idx = 0; idx < selectCat.options.length; idx++) {
            if (selectCat.options[idx].value === fullCatPath) {
                selectCat.selectedIndex = idx;
                exists = true;
                break;
            }
        }
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = fullCatPath;
            opt.textContent = fullCatPath;
            opt.setAttribute('data-prefix', prefix);
            opt.selected = true;
            selectCat.appendChild(opt);
        }
    }

    // 6. Set Variations (Tab 4) or Single
    if (Array.isArray(data.variants) && data.variants.length > 0) {
        const curRack = (document.getElementById('modalLocation')?.value || 'A-01').trim().toUpperCase();
        InventoryApp.modalVariants = data.variants.map((v, idx) => {
            const suffix = String(idx + 1).padStart(2, '0');
            return {
                variant: v.name || `ตัวเลือกที่ ${idx + 1}`,
                sku: `${finalParentSku}-${suffix}`,
                price: (v.price !== null && v.price !== undefined && !isNaN(v.price)) ? parseFloat(v.price) : 290,
                stock_quantity: (v.stock !== null && v.stock !== undefined && !isNaN(v.stock)) ? parseInt(v.stock, 10) : 5,
                min_stock_alert: 5,
                warehouse_location: curRack,
                image_url: v.image_url || null
            };
        });
        switchProductModalMode('VARIANTS');
        renderModalVariantsTable();
    } else {
        InventoryApp.modalVariants = [];
        switchProductModalMode('SINGLE');
        if (data.price) {
            const pInput = document.getElementById('modalPrice');
            if (pInput) pInput.value = data.price;
        }
        if (data.stock) {
            const sInput = document.getElementById('modalStock');
            if (sInput) sInput.value = data.stock;
        }
    }

    // Set Parent SKU & Trigger Smart Variant Checker
    const skuInput = document.getElementById('modalSku');
    if (skuInput) {
        skuInput.value = finalParentSku;
        onModalSkuInput(finalParentSku);
    }

    // 7. Set Product Description (Tab 3)
    const descInput = document.getElementById('modalProductDescription');
    if (descInput) {
        descInput.value = data.description || '';
        const descCount = document.getElementById('modalDescCharCount');
        if (descCount) descCount.innerText = `${descInput.value.length}/5000`;
    }

    // 8. Tab 2: Standard Attributes Auto-mapping
    if (Array.isArray(data.raw_attributes)) {
        data.raw_attributes.forEach(attr => {
            const n = (attr.name || '').toLowerCase();
            const val = (attr.value || '').trim();
            if (n.includes('แบรนด์') || n.includes('brand')) {
                const brandEl = document.getElementById('attrBrand');
                if (brandEl) {
                    let matched = false;
                    for (let o of brandEl.options) {
                        if (o.value.toLowerCase() === val.toLowerCase() || o.text.toLowerCase().includes(val.toLowerCase())) {
                            brandEl.value = o.value;
                            matched = true;
                            break;
                        }
                    }
                    if (!matched && val) {
                        const opt = new Option(val, val, true, true);
                        brandEl.add(opt);
                    }
                }
            } else if (n.includes('ประเทศ') || n.includes('origin')) {
                const originEl = document.getElementById('attrOrigin');
                if (originEl) {
                    if (val.includes('ไทย') || val.includes('TH')) originEl.value = 'TH';
                    else if (val.includes('จีน') || val.includes('CN')) originEl.value = 'CN';
                    else if (val.includes('เกาหลี') || val.includes('KR')) originEl.value = 'KR';
                    else if (val.includes('ญี่ปุ่น') || val.includes('JP')) originEl.value = 'JP';
                }
            } else if (n.includes('วัสดุ') || n.includes('material')) {
                const matEl = document.getElementById('attrMaterial');
                if (matEl) matEl.value = val;
            } else if (n.includes('ทรง') || n.includes('ประเภท')) {
                const pantsEl = document.getElementById('attrPantsType');
                if (pantsEl) {
                    if (val.includes('สกินนี่') || val.includes('skinny')) pantsEl.value = 'skinny';
                    else if (val.includes('ขากว้าง') || val.includes('wide')) pantsEl.value = 'wide';
                    else if (val.includes('กระบอก') || val.includes('straight')) pantsEl.value = 'straight';
                    else if (val.includes('คาร์โก้') || val.includes('cargo')) pantsEl.value = 'cargo';
                }
            } else if (n.includes('ลาย') || n.includes('pattern')) {
                const patEl = document.getElementById('attrPattern');
                if (patEl) {
                    if (val.includes('เรียบ')) patEl.value = 'plain';
                    else if (val.includes('ทาง')) patEl.value = 'striped';
                    else if (val.includes('กราฟิก')) patEl.value = 'graphic';
                    else if (val.includes('พิมพ์')) patEl.value = 'printed';
                }
            } else if (n.includes('สไตล์') || n.includes('style')) {
                const styleEl = document.getElementById('attrStyle');
                if (styleEl) {
                    if (val.includes('เกาหลี')) styleEl.value = 'korean';
                    else if (val.includes('ปาร์ตี้')) styleEl.value = 'party';
                    else if (val.includes('สตรีท')) styleEl.value = 'street';
                    else if (val.includes('ลำลอง')) styleEl.value = 'casual';
                }
            } else if (n.includes('ขนาดใหญ่') || n.includes('plus size')) {
                const plusEl = document.getElementById('attrPlusSize');
                if (plusEl) {
                    plusEl.value = (val.includes('ใช่') || val.includes('yes')) ? 'yes' : 'no';
                }
            } else if (n.includes('ความยาว') || n.includes('length')) {
                const lenEl = document.getElementById('attrLength');
                if (lenEl) {
                    if (val.includes('ข้อเท้า') || val.includes('ankle')) lenEl.value = 'ankle';
                    else if (val.includes('สั้น') || val.includes('short')) lenEl.value = 'short';
                    else if (val.includes('พื้น') || val.includes('floor')) lenEl.value = 'floor';
                }
            }
        });
    }

    // 9. Tab 5: Shipping Weight
    if (data.weight) {
        const shipW = document.getElementById('shipWeight');
        if (shipW) shipW.value = data.weight;
    }

    // 10. Tab 6: Distributor & Care Instructions
    if (data.distributor) {
        const distEl = document.getElementById('modalDistributor');
        if (distEl) distEl.value = data.distributor;
    }
    if (data.care_instructions) {
        const careEl = document.getElementById('modalCare');
        if (careEl) careEl.value = data.care_instructions;
    }

    // Close scraper modal if open
    closeShopeeScraperModal();

    // Default to Tab 1
    switchShopeeTab('general');

    // Notify user with custom toast
    const varCount = InventoryApp.modalVariants ? InventoryApp.modalVariants.length : 0;
    const imgCount = InventoryApp.modalImages ? InventoryApp.modalImages.length : 0;
    alert(`🎉 ดูดข้อมูลสินค้าจาก Shopee สำเร็จครบถ้วน 12 รายการ!\n\n` +
          `• ชื่อสินค้า: ${data.name || '-'}\n` +
          `• หมวดหมู่: ${fullCatPath}\n` +
          `• รหัสสินค้าที่สร้าง: ${suggestedSku}\n` +
          `• รูปภาพสินค้า: ${imgCount} รูป\n` +
          `• วิดีโอสินค้า: ${data.video_url ? 'มีลิงก์วิดีโอเรียบร้อย' : 'ไม่มี'}\n` +
          `• ตัวเลือกสินค้า (สี/ไซส์): ${varCount} รายการ\n` +
          `• คุณลักษณะ & รายละเอียด: กรอกเรียบร้อยแล้ว\n\n` +
          `👉 สามารถตรวจสอบข้อมูลในแต่ละแท็บ แล้วกด "บันทึกข้อมูลสินค้า" ได้ทันทีครับ!`);
}

window.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    loadCategoryTreeFromSupabase();
    loadInventory();
    loadSavedAttributeOptions();
    renderDistributorPresetChips();
    renderCarePresetChips();
    initShopeeBookmarkletLink();

    // Auto open Shopee Import Modal if requested via URL query (?action=shopee_import)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'shopee_import') {
        setTimeout(() => {
            openShopeeImportModal();
        }, 500);
    }
});

// Global paste handler: press Ctrl + V anywhere to import Shopee data
window.addEventListener('paste', async (e) => {
    // If user is actively typing in an input or textarea (except rawShopeeInput), let normal paste proceed
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        if (activeEl.id !== 'rawShopeeInput') return;
    }

    const text = (e.clipboardData || window.clipboardData)?.getData('text');
    if (!text || !text.trim()) return;

    const trimmed = text.trim();
    if (trimmed.includes('SGYVER_SHOPEE_BATCH') || trimmed.includes('SGYVER_SHOPEE_IMPORT') || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && (parsed.source === 'SGYVER_SHOPEE_BATCH' || Array.isArray(parsed.items))) {
                e.preventDefault();
                closeShopeeScraperModal();
                applyShopeeBatchExtractedData(parsed);
                return;
            }
            if (parsed && (parsed.source === 'SGYVER_SHOPEE_IMPORT' || parsed.name || (parsed.images && parsed.images.length > 0))) {
                e.preventDefault();
                closeShopeeScraperModal();
                applyShopeeExtractedData(parsed);
                return;
            }
        } catch(err) {
            // Not valid JSON, proceed normally
        }
    }
});

// Auto-detect when user switches back from Shopee tab
window.addEventListener('focus', async () => {
    // Only detect if product modal is closed
    const prodModal = document.getElementById('productModal');
    if (prodModal && !prodModal.classList.contains('hidden')) return;

    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text && (
                text.includes('"source": "SGYVER_SHOPEE_IMPORT"') || text.includes('"source":"SGYVER_SHOPEE_IMPORT"') ||
                text.includes('"source": "SGYVER_SHOPEE_BATCH"') || text.includes('"source":"SGYVER_SHOPEE_BATCH"')
            )) {
                const parsed = JSON.parse(text);
                if (parsed && (parsed.name || parsed.items) && parsed.extracted_at !== lastAutoDetectedPayload) {
                    lastAutoDetectedPayload = parsed.extracted_at;
                    showShopeeAutoDetectToast(parsed);
                }
            }
        }
    } catch(e) {
        // Silently ignore if browser restricts background clipboard read
    }
});

// Real-time synchronization when Chrome Extension scrapes a product from Shopee
window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'SGYVER_AUTO_SYNC_PRODUCT' && event.data.product) {
        const p = event.data.product;
        console.log('⚡ [S-Gyver Realtime] Received scraped product from Shopee extension:', p);
        if (typeof showShopeeAutoDetectToast === 'function') {
            showShopeeAutoDetectToast(p);
        }
        if (typeof loadInventoryData === 'function') {
            loadInventoryData();
        }
    }
});

// ==============================================================================
// 🎯 DRAG & DROP SHOPEE PRODUCT (Split-Screen Drag directly from Shopee)
// ==============================================================================
(function initShopeeDragAndDrop() {
    let dragCounter = 0;
    let dropOverlay = null;

    function getOrCreateDropOverlay() {
        if (dropOverlay) return dropOverlay;
        dropOverlay = document.createElement('div');
        dropOverlay.id = 'sgyver-shopee-dropzone';
        dropOverlay.style.cssText = `
            position: fixed;
            inset: 16px;
            z-index: 99999999;
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(12px);
            border: 3px dashed #10b981;
            border-radius: 28px;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #ffffff;
            pointer-events: none;
            box-shadow: 0 0 60px rgba(16, 185, 129, 0.45);
            font-family: 'Prompt', -apple-system, sans-serif;
            transition: all 0.2s ease;
        `;
        dropOverlay.innerHTML = `
            <div style="font-size: 58px; filter: drop-shadow(0 4px 14px rgba(16,185,129,0.7)); animation: bounce 1s infinite;">📥</div>
            <div style="font-size: 24px; font-weight: 800; color: #34d399;">วางการ์ดสินค้า Shopee ตรงนี้!</div>
            <div style="font-size: 13.5px; color: #cbd5e1; max-width: 480px; text-align: center; line-height: 1.6;">
                S-Gyver จะดึงรูปภาพ, ราคา, ตัวเลือกสี/ไซส์ และเพิ่มเข้าคลังสินค้าทันที
            </div>
            <div style="
                background: rgba(16, 185, 129, 0.2);
                border: 1px solid rgba(16, 185, 129, 0.4);
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 12px;
                color: #86efac;
                font-weight: 700;
            ">✨ รองรับ Drag & Drop ข้ามหน้าจอแบบ Split-Screen</div>
        `;
        document.body.appendChild(dropOverlay);
        return dropOverlay;
    }

    window.addEventListener('dragenter', (e) => {
        dragCounter++;
        const overlay = getOrCreateDropOverlay();
        overlay.style.display = 'flex';
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    window.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            if (dropOverlay) dropOverlay.style.display = 'none';
        }
    });

    window.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (dropOverlay) dropOverlay.style.display = 'none';

        // 1. Try application/json
        let jsonStr = e.dataTransfer.getData('application/json');
        let rawText = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list') || '';
        let htmlStr = e.dataTransfer.getData('text/html') || '';

        let productPayload = null;

        if (jsonStr) {
            try { productPayload = JSON.parse(jsonStr); } catch (err) {}
        }

        if (!productPayload && rawText) {
            try {
                if (rawText.startsWith('{') && rawText.endsWith('}')) {
                    productPayload = JSON.parse(rawText);
                }
            } catch (err) {}
        }

        // If dropped a raw Shopee link
        if (!productPayload && (rawText.includes('shopee.co.th') || rawText.includes('-i.'))) {
            const match = rawText.match(/-i\.(\d+)\.(\d+)/) || rawText.match(/\/product\/(\d+)\/(\d+)/);
            const shopid = match ? match[1] : '';
            const itemid = match ? match[2] : '';

            productPayload = {
                itemid: itemid,
                shopid: shopid,
                sku: `SP_${itemid || Date.now()}`,
                url: rawText.split('?')[0],
                name: `สินค้า Shopee (${itemid || 'ใหม่'})`,
                source: 'SGYVER_SHOPEE_IMPORT',
                warehouse_location: 'A-01'
            };

            if (htmlStr) {
                const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
                const img = doc.querySelector('img');
                if (img && img.src) {
                    productPayload.images = [img.src];
                    productPayload.image_url = img.src;
                }
                const link = doc.querySelector('a');
                if (link && link.innerText) {
                    productPayload.name = link.innerText.trim();
                }
            }
        }

        if (productPayload && (productPayload.name || productPayload.itemid || productPayload.url)) {
            productPayload.source = 'SGYVER_SHOPEE_IMPORT';
            
            // Clean fallback name if it contains Shopee card metadata (e.g. ฿219-64%4.9ขายแล้ว 251 ชิ้น)
            if (productPayload.name) {
                productPayload.name = productPayload.name
                    .replace(/฿\s*[\d,.-]+.*$/i, '')
                    .replace(/-\d+%.*$/, '')
                    .replace(/\b\d+(\.\d+)?\s*(ขายแล้ว|sold).*$/i, '')
                    .replace(/[\n\r\t]+/g, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
            }

            const itemid = productPayload.itemid;
            const shopid = productPayload.shopid;
            const needsDeepFetch = (!productPayload.variants || productPayload.variants.length === 0) || 
                                   (!productPayload.images || productPayload.images.length <= 1) || 
                                   !productPayload.description;

            if (itemid && needsDeepFetch) {
                // Show Quick Toast / Modal Loading
                showShopeeImportLoading(productPayload.name);

                fetchShopeeFullDetailsAsync(itemid, shopid, productPayload.url).then(fullData => {
                    hideShopeeImportLoading();
                    if (fullData && fullData.name && ((fullData.images && fullData.images.length > 1) || (fullData.variants && fullData.variants.length > 0))) {
                        applyShopeeExtractedData(fullData);
                    } else if (fullData && fullData.name) {
                        applyShopeeExtractedData(fullData);
                    } else {
                        applyShopeeExtractedData(productPayload);
                    }
                }).catch(() => {
                    hideShopeeImportLoading();
                    applyShopeeExtractedData(productPayload);
                });
            } else {
                applyShopeeExtractedData(productPayload);
            }
        }
    });

    // Helper: Async fetch full item details via Extension background or direct API
    async function fetchShopeeFullDetailsAsync(itemid, shopid, url) {
        if (!itemid) return null;

        // Method 1: Bridge via Extension background (Uses open Shopee tab session!)
        try {
            const reqId = 'shopee_req_' + Date.now();
            const extensionPromise = new Promise((resolve) => {
                const timer = setTimeout(() => resolve(null), 5500);
                function handleMsg(e) {
                    if (e.data && e.data.type === 'SGYVER_SHOPEE_DETAILS_RESPONSE' && e.data.reqId === reqId) {
                        clearTimeout(timer);
                        window.removeEventListener('message', handleMsg);
                        resolve(e.data.success && e.data.data ? e.data.data : null);
                    }
                }
                window.addEventListener('message', handleMsg);
                window.postMessage({ type: 'SGYVER_FETCH_SHOPEE_DETAILS', itemid, shopid, reqId }, '*');
            });

            const extResult = await extensionPromise;
            if (extResult && extResult.name && (extResult.images?.length > 1 || extResult.variants?.length > 0)) {
                return extResult;
            }
            if (extResult && extResult.name) {
                return extResult;
            }
        } catch (e) {}

        // Method 2: Direct API fetch fallback
        try {
            const res = await fetch(`https://shopee.co.th/api/v4/item/get?itemid=${itemid}&shopid=${shopid || ''}`);
            if (res.ok) {
                const j = await res.json();
                if (j && j.data) {
                    const d = j.data;
                    const images = [];
                    if (d.images && Array.isArray(d.images)) {
                        d.images.forEach(img => images.push(img.startsWith('http') ? img : `https://down-th.img.susercontent.com/file/${img}`));
                    }
                    const variants = [];
                    if (d.models && Array.isArray(d.models)) {
                        d.models.forEach((m, idx) => {
                            let imgUrl = null;
                            if (m.extinfo && Array.isArray(m.extinfo.tier_index) && d.tier_variations) {
                                const t0 = m.extinfo.tier_index[0];
                                const tier0 = d.tier_variations[0];
                                if (tier0 && tier0.images && tier0.images[t0]) {
                                    imgUrl = `https://down-th.img.susercontent.com/file/${tier0.images[t0]}`;
                                }
                            }
                            variants.push({
                                name: m.name || `ตัวเลือก ${idx + 1}`,
                                sku: (m.sku || m.model_sku || `SP_${itemid}_${idx + 1}`).trim(),
                                price: m.price ? (m.price / 100000) : (d.price ? d.price / 100000 : 0),
                                stock: (m.stock !== undefined) ? m.stock : (m.normal_stock || 10),
                                image_url: imgUrl || images[0] || null
                            });
                        });
                    }

                    return {
                        source: 'SGYVER_SHOPEE_IMPORT',
                        version: '2.0',
                        itemid: String(itemid),
                        shopid: String(shopid || ''),
                        sku: `SP_${itemid}`,
                        name: (d.name || '').trim(),
                        price: d.price ? d.price / 100000 : 0,
                        stock: parseInt(d.stock || 10, 10),
                        images: images.slice(0, 15),
                        image_url: images[0] || null,
                        description: d.description || '',
                        variants: variants,
                        url: url || `https://shopee.co.th/product/${shopid || '0'}/${itemid}`,
                        warehouse_location: 'A-01'
                    };
                }
            }
        } catch (e) {}

        return null;
    }

    function showShopeeImportLoading(name) {
        let toast = document.getElementById('sgyver-import-loading-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sgyver-import-loading-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 999999999;
                background: linear-gradient(135deg, #0f172a, #1e293b);
                color: #ffffff;
                padding: 16px 22px;
                border-radius: 20px;
                box-shadow: 0 20px 45px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                gap: 14px;
                font-family: 'Prompt', sans-serif;
                font-size: 13.5px;
                border: 2px solid #10b981;
                animation: sgyverSlideUp 0.3s ease;
            `;
            document.body.appendChild(toast);
        }
        toast.innerHTML = `
            <div style="font-size: 26px; animation: spin 1s linear infinite;">⏳</div>
            <div>
                <div style="font-weight: 800; color: #34d399;">กำลังดูดข้อมูลเชิงลึกจาก Shopee...</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">ดึงรูปภาพครบ 15 รูป, วิดีโอ, ตัวเลือกสี/ไซส์ และรายละเอียดสินค้า</div>
            </div>
        `;
        toast.style.display = 'flex';
    }

    function hideShopeeImportLoading() {
        const toast = document.getElementById('sgyver-import-loading-toast');
        if (toast) toast.style.display = 'none';
    }
})();




