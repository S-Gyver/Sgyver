/**
 * S-Gyver Shopee Warehouse Sync Content Script
 * Injected into Shopee Seller Centre (seller.shopee.co.th)
 * Syncs full product catalog, variations, SKUs, and stock directly into S-Gyver Supabase Warehouse
 */

console.log('📦 [S-Gyver] Shopee Warehouse Sync Content Script Loaded');

const SGYVER_CONFIG = {
    supabaseUrl: 'https://igiihteeeprpcxxlldkd.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw',
    defaultRack: 'A-01'
};

// 1. Inject Floating Action Button on Shopee Seller Centre
function injectShopeeFloatingButton() {
    if (document.getElementById('sgyver-shopee-sync-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'sgyver-shopee-sync-fab';
    fab.innerHTML = `
        <div id="sgyver-shopee-btn-inner" style="
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 9999999;
            background: linear-gradient(135deg, #059669, #10b981);
            color: #ffffff;
            padding: 12px 22px;
            border-radius: 50px;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.45);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Prompt', sans-serif;
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            transition: all 0.25s ease;
            user-select: none;
            border: 2px solid rgba(255, 255, 255, 0.25);
        ">
            <span style="font-size: 18px;">📦</span>
            <span>ซิงค์เข้าคลัง S-Gyver</span>
            <span style="
                background: rgba(255,255,255,0.25);
                font-size: 10px;
                padding: 2px 7px;
                border-radius: 20px;
                font-weight: 800;
            ">1-Click</span>
        </div>
    `;

    document.body.appendChild(fab);

    const btn = document.getElementById('sgyver-shopee-btn-inner');
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-3px) scale(1.02)';
        btn.style.boxShadow = '0 14px 30px rgba(16, 185, 129, 0.55)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'none';
        btn.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.45)';
    });
    btn.addEventListener('click', openShopeeSyncModal);
}

// 2. Open Sleek In-Page Sync Modal
function openShopeeSyncModal() {
    let modal = document.getElementById('sgyver-shopee-sync-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sgyver-shopee-sync-modal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(4px);
            z-index: 10000000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Prompt', sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: #ffffff;
                width: 100%;
                max-width: 520px;
                border-radius: 24px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                animation: sgyverFadeIn 0.2s ease-out;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #059669, #0f766e);
                    padding: 20px 24px;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="
                            width: 44px;
                            height: 44px;
                            border-radius: 14px;
                            background: rgba(255, 255, 255, 0.15);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 22px;
                        ">📦</div>
                        <div>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">ซิงค์สินค้า Shopee เข้าคลังสินค้า</h3>
                            <div style="font-size: 12px; opacity: 0.85; margin-top: 2px;">เชื่อมต่อ Supabase Real-time • S-Gyver Warehouse</div>
                        </div>
                    </div>
                    <button id="sgyver-close-btn" style="
                        background: rgba(255,255,255,0.15);
                        border: none;
                        color: white;
                        width: 32px;
                        height: 32px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background 0.2s;
                    ">&times;</button>
                </div>

                <!-- Body -->
                <div style="padding: 24px; display: flex; flex-direction: column; gap: 18px;">
                    <!-- Info Alert -->
                    <div style="
                        background: #f0fdf4;
                        border: 1px solid #bbf7d0;
                        border-radius: 16px;
                        padding: 14px 16px;
                        font-size: 12.5px;
                        color: #166534;
                        line-height: 1.5;
                        display: flex;
                        gap: 10px;
                    ">
                        <span style="font-size: 18px;">💡</span>
                        <div>
                            <b>ไม่ต้องดาวน์โหลดไฟล์ Excel:</b> ระบบจะดึงชื่อสินค้าตัวเต็ม, รหัส SKU, ไซส์/สี และสต็อกปัจจุบันจาก Shopee แล้วส่งตรงเข้าคลังสินค้าทันที
                        </div>
                    </div>

                    <!-- Sync Policy Selection -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 13px; font-weight: 700; color: #1e293b;">รูปแบบการซิงค์ข้อมูลสต็อก:</label>
                        
                        <label style="
                            display: flex;
                            align-items: flex-start;
                            gap: 10px;
                            padding: 12px 14px;
                            border: 2px solid #10b981;
                            background: #f0fdf4;
                            border-radius: 14px;
                            cursor: pointer;
                        ">
                            <input type="radio" name="sgyverSyncPolicy" value="KEEP_WAREHOUSE_STOCK" checked style="margin-top: 3px;">
                            <div>
                                <span style="font-size: 13px; font-weight: 700; color: #0f172a; display: block;">อัปเดตข้อมูล & คงสต็อกเดิมในคลัง (แนะนำ)</span>
                                <span style="font-size: 11.5px; color: #64748b; display: block; margin-top: 2px;">อัปเดตชื่อสินค้า, ราคา, ไซส์/สี โดยไม่แตะต้องยอดสต็อกที่นับไว้ในคลังจริง</span>
                            </div>
                        </label>

                        <label style="
                            display: flex;
                            align-items: flex-start;
                            gap: 10px;
                            padding: 12px 14px;
                            border: 1px solid #e2e8f0;
                            border-radius: 14px;
                            cursor: pointer;
                        ">
                            <input type="radio" name="sgyverSyncPolicy" value="OVERWRITE_STOCK" style="margin-top: 3px;">
                            <div>
                                <span style="font-size: 13px; font-weight: 600; color: #334155; display: block;">ซิงค์ยอดสต็อกตาม Shopee ทั้งหมด</span>
                                <span style="font-size: 11.5px; color: #64748b; display: block; margin-top: 2px;">อัปเดตสต็อกในคลังให้เท่ากับจำนวนคงเหลือใน Shopee ทันที</span>
                            </div>
                        </label>
                    </div>

                    <!-- Rack Location -->
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <label for="sgyverRackInput" style="font-size: 12.5px; font-weight: 600; color: #475569;">ชั้นวางเริ่มต้นสำหรับสินค้าใหม่:</label>
                        <input type="text" id="sgyverRackInput" value="A-01" style="
                            width: 100px;
                            padding: 6px 12px;
                            border: 1px solid #cbd5e1;
                            border-radius: 10px;
                            font-size: 13px;
                            font-family: monospace;
                            font-weight: 700;
                            text-align: center;
                            outline: none;
                        ">
                    </div>

                    <!-- Progress Box (Hidden initially) -->
                    <div id="sgyver-progress-box" style="display: none; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #334155;">
                            <span id="sgyver-progress-status">กำลังเชื่อมต่อกับระบบ Shopee...</span>
                            <span id="sgyver-progress-pct" style="color: #059669; font-weight: 700;">0%</span>
                        </div>
                        <div style="
                            width: 100%;
                            height: 10px;
                            background: #e2e8f0;
                            border-radius: 10px;
                            overflow: hidden;
                        ">
                            <div id="sgyver-progress-bar" style="
                                width: 0%;
                                height: 100%;
                                background: linear-gradient(90deg, #10b981, #059669);
                                transition: width 0.3s ease;
                            "></div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 10px; margin-top: 4px;">
                        <button id="sgyver-cancel-btn" style="
                            flex: 1;
                            padding: 12px;
                            border: 1px solid #cbd5e1;
                            background: #f8fafc;
                            color: #475569;
                            border-radius: 14px;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                        ">ยกเลิก</button>

                        <button id="sgyver-start-sync-btn" style="
                            flex: 2;
                            padding: 12px;
                            border: none;
                            background: linear-gradient(135deg, #059669, #10b981);
                            color: white;
                            border-radius: 14px;
                            font-size: 13px;
                            font-weight: 700;
                            cursor: pointer;
                            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 6px;
                            transition: transform 0.15s ease;
                        ">
                            <span>🚀</span>
                            <span>เริ่มซิงค์ข้อมูลทันที</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind events
        document.getElementById('sgyver-close-btn').onclick = closeShopeeSyncModal;
        document.getElementById('sgyver-cancel-btn').onclick = closeShopeeSyncModal;
        document.getElementById('sgyver-start-sync-btn').onclick = executeShopeeLiveSync;
    }

    modal.style.display = 'flex';
}

function closeShopeeSyncModal() {
    const modal = document.getElementById('sgyver-shopee-sync-modal');
    if (modal) modal.style.display = 'none';
}

// 3. Extract Products from Shopee Seller Centre Internal APIs
async function executeShopeeLiveSync() {
    const startBtn = document.getElementById('sgyver-start-sync-btn');
    const progressBox = document.getElementById('sgyver-progress-box');
    const progressBar = document.getElementById('sgyver-progress-bar');
    const progressPct = document.getElementById('sgyver-progress-pct');
    const progressStatus = document.getElementById('sgyver-progress-status');
    const rackInput = document.getElementById('sgyverRackInput');
    const defaultRack = (rackInput ? rackInput.value : 'A-01').trim().toUpperCase() || 'A-01';
    const policy = document.querySelector('input[name="sgyverSyncPolicy"]:checked')?.value || 'KEEP_WAREHOUSE_STOCK';

    if (startBtn) {
        startBtn.disabled = true;
        startBtn.style.opacity = '0.6';
        startBtn.style.cursor = 'not-allowed';
    }
    if (progressBox) progressBox.style.display = 'flex';

    function setProgress(pct, statusText) {
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPct) progressPct.innerText = `${pct}%`;
        if (progressStatus) progressStatus.innerText = statusText;
    }

    try {
        setProgress(5, 'กำลังตรวจสอบสินค้าทั้งหมดในร้าน Shopee...');

        // 1. Fetch Existing SKUs in Warehouse from Supabase
        const existingWarehouseMap = new Map();
        try {
            const res = await fetch(`${SGYVER_CONFIG.supabaseUrl}/rest/v1/product_labels?select=id,sku,name,stock_quantity,warehouse_location`, {
                headers: {
                    'apikey': SGYVER_CONFIG.supabaseKey,
                    'Authorization': `Bearer ${SGYVER_CONFIG.supabaseKey}`,
                    'Accept-Profile': 'public'
                }
            });
            if (res.ok) {
                const list = await res.json();
                list.forEach(item => {
                    if (item.sku) existingWarehouseMap.set(item.sku.trim().toUpperCase(), item);
                });
            }
        } catch (e) {
            console.warn('Could not pre-fetch existing warehouse SKUs:', e);
        }

        // 2. Fetch Shopee Catalog via Seller APIs
        const collectedItems = await fetchAllShopeeProducts(setProgress);

        if (!collectedItems || collectedItems.length === 0) {
            throw new Error('ไม่พบรายการสินค้า หรือไม่สามารถดึงข้อมูลจากระบบ Shopee ได้ กรุณาตรวจสอบว่าเปิดหน้ารายการสินค้าอยู่');
        }

        setProgress(70, `ดึงสินค้าจาก Shopee สำเร็จ ${collectedItems.length.toLocaleString()} รายการ กำลังจัดระเบียบข้อมูล...`);

        // 3. Deduplicate by SKU & Format Records for Supabase
        const dedupedRecordsMap = new Map();

        collectedItems.forEach(item => {
            const cleanSku = (item.sku || '').trim().toUpperCase();
            if (!cleanSku) return;

            const existingRecord = existingWarehouseMap.get(cleanSku);
            let finalStock = item.stock_quantity ?? 0;
            let finalLocation = defaultRack;

            if (existingRecord) {
                finalLocation = existingRecord.warehouse_location || defaultRack;
                if (policy === 'KEEP_WAREHOUSE_STOCK') {
                    // Keep real warehouse counted stock
                    finalStock = existingRecord.stock_quantity ?? 0;
                }
            }

            if (dedupedRecordsMap.has(cleanSku)) {
                // Merge if duplicate SKU exists in export
                const prev = dedupedRecordsMap.get(cleanSku);
                const mergedVariant = prev.variant && item.variant && prev.variant !== item.variant
                    ? `${prev.variant}, ${item.variant}`
                    : (item.variant || prev.variant);

                dedupedRecordsMap.set(cleanSku, {
                    ...prev,
                    ...item,
                    variant: mergedVariant,
                    stock_quantity: policy === 'OVERWRITE_STOCK' ? (prev.stock_quantity + finalStock) : prev.stock_quantity
                });
            } else {
                dedupedRecordsMap.set(cleanSku, {
                    sku: cleanSku,
                    name: item.name,
                    variant: item.variant || '',
                    price: item.price !== null ? item.price : 0,
                    stock_quantity: finalStock,
                    warehouse_location: finalLocation,
                    distributor: 'นำเข้าจาก Shopee Seller Centre',
                    min_stock_alert: 5,
                    care_instructions: 'ควรซักก่อนสวมใส่ / ควรรีดด้วยไฟปานกลาง',
                    barcode_type: 'CODE128',
                    updated_at: new Date().toISOString()
                });
            }
        });

        const recordsToUpsert = Array.from(dedupedRecordsMap.values());
        const totalToUpload = recordsToUpsert.length;

        setProgress(75, `กำลังบันทึกลงฐานข้อมูลคลังสินค้า (${totalToUpload.toLocaleString()} รายการ)...`);

        // 4. Batch Upload to Supabase in chunks of 40 (preventing PostgreSQL limits)
        const BATCH_SIZE = 40;
        let processedCount = 0;

        for (let i = 0; i < totalToUpload; i += BATCH_SIZE) {
            const chunk = recordsToUpsert.slice(i, i + BATCH_SIZE);
            const res = await fetch(`${SGYVER_CONFIG.supabaseUrl}/rest/v1/product_labels?on_conflict=sku`, {
                method: 'POST',
                headers: {
                    'apikey': SGYVER_CONFIG.supabaseKey,
                    'Authorization': `Bearer ${SGYVER_CONFIG.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates',
                    'Accept-Profile': 'public',
                    'Content-Profile': 'public'
                },
                body: JSON.stringify(chunk)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Supabase error (${res.status}): ${errText}`);
            }

            processedCount += chunk.length;
            const pct = 75 + Math.round((processedCount / totalToUpload) * 25);
            setProgress(pct, `กำลังบันทึก ${processedCount.toLocaleString()} / ${totalToUpload.toLocaleString()} รายการ...`);
        }

        // 5. Complete!
        setProgress(100, `🎉 ซิงค์สำเร็จ ${totalToUpload.toLocaleString()} รายการเข้าคลังสินค้าเรียบร้อย!`);

        setTimeout(() => {
            alert(`🎉 ซิงค์สินค้าเข้าคลังสำเร็จ!\n\n` +
                  `• รวมสินค้าทั้งหมด: ${totalToUpload.toLocaleString()} รายการ\n` +
                  `• ข้อมูลชื่อสินค้า, รหัส SKU, ไซส์/สี และราคาอัปเดตเรียบร้อยแล้ว\n` +
                  `• สามารถเปิดหน้าระบบคลังสินค้า S-Gyver เพื่อตรวจนับหรือพิมพ์ฉลากได้ทันทีครับ`);
            closeShopeeSyncModal();
        }, 600);

    } catch (err) {
        console.error('Shopee Live Sync Error:', err);
        alert('เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ' + (err.message || err));
        if (progressStatus) progressStatus.innerText = '❌ เกิดข้อผิดพลาด: ' + (err.message || err);
    } finally {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            startBtn.style.cursor = 'pointer';
        }
    }
}

// Helper to extract cookies from Shopee page
function getShopeeCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return '';
}

// 4. Smart Multi-Strategy Product Fetcher (API + Multi-Page Auto-Collector)
async function fetchAllShopeeProducts(onProgress) {
    // Strategy 1: Try Shopee internal API endpoints with SPC_CDS token
    try {
        const apiItems = await fetchViaShopeeApi(onProgress);
        if (apiItems && apiItems.length >= 200) {
            return apiItems;
        }
    } catch (e) {
        console.warn('API fetch strategy fallback:', e);
    }

    // Strategy 2: Multi-Page Auto-Collector (Flips through Page 1, 2, 3, 4 to get all 315 items!)
    onProgress(15, 'กำลังเริ่มดึงสินค้าให้ครบทุกหน้า (1 ➔ 2 ➔ 3 ➔ 4)...');
    const allPageItems = await autoCollectFromAllPages(onProgress);
    return allPageItems;
}

// Strategy 1: Direct API queries with full model/variation support
async function fetchViaShopeeApi(onProgress) {
    const spcCds = getShopeeCookie('SPC_CDS');
    const allItems = [];
    const PAGE_SIZE = 100;

    const endpointBuilders = [
        p => `/api/v3/mps/product/list_product_page?page_number=${p}&page_size=${PAGE_SIZE}&status=ALL${spcCds ? `&SPC_CDS=${encodeURIComponent(spcCds)}&SPC_CDS_VER=2` : ''}`,
        p => `/api/v3/product/search_product_list?page_number=${p}&page_size=${PAGE_SIZE}&status=NORMAL${spcCds ? `&SPC_CDS=${encodeURIComponent(spcCds)}&SPC_CDS_VER=2` : ''}`,
        p => `/api/v3/product/get_product_list?page_number=${p}&page_size=${PAGE_SIZE}${spcCds ? `&SPC_CDS=${encodeURIComponent(spcCds)}&SPC_CDS_VER=2` : ''}`
    ];

    for (const buildUrl of endpointBuilders) {
        try {
            let page = 1;
            let hasMore = true;
            allItems.length = 0;

            while (hasMore && page <= 25) {
                onProgress(10 + Math.min(page * 3, 50), `กำลังอ่านข้อมูลสินค้า & ตัวเลือกย่อยหน้าที่ ${page}...`);
                const url = buildUrl(page);
                const resp = await fetch(url, {
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'x-source': 'seller-center'
                    },
                    credentials: 'include'
                });

                if (!resp.ok) break;

                const resJson = await resp.json();
                const products = resJson?.data?.products || resJson?.data?.list || resJson?.data?.item_list || [];

                if (!Array.isArray(products) || products.length === 0) {
                    hasMore = false;
                    break;
                }

                products.forEach(p => {
                    const parentName = p.name || p.title || '';
                    const parentSku = (p.parent_sku || p.item_sku || p.sku || (p.item_id ? `SP_${p.item_id}` : '')).trim();

                    // Parse models / variations
                    const models = Array.isArray(p.models) && p.models.length > 0
                        ? p.models
                        : (Array.isArray(p.model_list) ? p.model_list : []);

                    if (models.length > 0) {
                        models.forEach((m, mIdx) => {
                            let variationSku = (m.sku || m.model_sku || '').trim();
                            if (!variationSku) {
                                variationSku = parentSku ? `${parentSku}-${mIdx + 1}` : `SP_${p.item_id || 'VAR'}_${mIdx + 1}`;
                            }

                            const variationName = (m.name || m.model_name || '').trim();
                            
                            // Normalise price (Shopee internal prices can be micro-units divided by 100,000)
                            let rawPrice = m.price ?? p.price ?? 0;
                            let parsedPrice = parseFloat(rawPrice) || 0;
                            if (parsedPrice > 100000) {
                                parsedPrice = parsedPrice / 100000;
                            }

                            const stock = m.normal_stock ?? m.stock ?? m.stock_info_v2?.normal_stock ?? p.stock ?? 0;

                            allItems.push({
                                sku: variationSku,
                                name: parentName,
                                variant: variationName,
                                price: parsedPrice,
                                stock_quantity: parseInt(stock, 10) || 0
                            });
                        });
                    } else if (parentSku) {
                        let rawPrice = p.price ?? 0;
                        let parsedPrice = parseFloat(rawPrice) || 0;
                        if (parsedPrice > 100000) {
                            parsedPrice = parsedPrice / 100000;
                        }

                        allItems.push({
                            sku: parentSku,
                            name: parentName,
                            variant: '',
                            price: parsedPrice,
                            stock_quantity: parseInt(p.normal_stock ?? p.stock ?? 0, 10) || 0
                        });
                    }
                });

                if (products.length < PAGE_SIZE) {
                    hasMore = false;
                }
                page++;
            }

            if (allItems.length >= 200) {
                return allItems;
            }
        } catch (e) {
            console.warn('API Endpoint builder failed:', e);
        }
    }

    return allItems;
}

// Strategy 2: Multi-Page Auto-Collector with Model/Variation Extraction
async function autoCollectFromAllPages(onProgress) {
    const collectedItemsMap = new Map();

    function getNextPageButton() {
        const candidates = document.querySelectorAll(
            'button.shopee-pager__btn--next, button.shopee-pager__button--next, button.btn-next, div[class*="pagination"] button, button[aria-label*="Next"]'
        );
        for (const btn of candidates) {
            const txt = (btn.innerText || '').trim();
            const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
            const isNext = txt === '>' || txt === '›' || aria.includes('next') || btn.classList.contains('shopee-pager__btn--next');
            const isDisabled = btn.disabled || btn.classList.contains('disabled') || btn.getAttribute('aria-disabled') === 'true';
            if (isNext && !isDisabled) {
                return btn;
            }
        }
        return null;
    }

    let pageNum = 1;
    const maxPages = 20;

    while (pageNum <= maxPages) {
        onProgress(
            15 + Math.min(pageNum * 10, 60),
            `กำลังดึงข้อมูลและตัวเลือกสินค้า หน้าที่ ${pageNum}...`
        );

        // Collect items and variations from current page
        const pageItems = await extractItemsAndVariationsFromPage();
        pageItems.forEach(item => {
            const key = item.sku || (item.name + '_' + item.variant);
            if (key && !collectedItemsMap.has(key)) {
                collectedItemsMap.set(key, item);
            }
        });

        onProgress(
            20 + Math.min(pageNum * 10, 65),
            `อ่านหน้าที่ ${pageNum} สำเร็จ (สะสมได้ ${collectedItemsMap.size} รายการตัวเลือก)...`
        );

        const nextBtn = getNextPageButton();
        if (!nextBtn) {
            // Reached the last page!
            break;
        }

        // Click Next Page button
        nextBtn.click();
        pageNum++;
        // Wait 1.5 seconds for new products to render
        await new Promise(res => setTimeout(res, 1500));
    }

    return Array.from(collectedItemsMap.values());
}

// Unified DOM Item & Variation Extractor (Supports Table View & Card View + Model API)
async function extractItemsAndVariationsFromPage() {
    const items = [];

    // Check if Shopee is in Table/List View
    const tableRows = document.querySelectorAll('.shopee-table__row, tr[class*="product-table-row"]');
    if (tableRows && tableRows.length > 2) {
        // Table View Mode: Check for variation rows or expanded models
        tableRows.forEach((row, idx) => {
            if (row.closest('thead')) return;

            const nameEl = row.querySelector('.product-name, [class*="product-name"], [class*="item-name"], a[href*="/product/"]');
            const skuEl = row.querySelector('[class*="sku"], [class*="item-sku"]');
            const variantEl = row.querySelector('[class*="variation"], [class*="model"], [class*="tier"]');
            const priceEl = row.querySelector('[class*="price"]');
            const stockEl = row.querySelector('[class*="stock"], [class*="qty"]');

            const name = nameEl ? nameEl.innerText.trim() : '';
            const variant = variantEl ? variantEl.innerText.trim() : '';
            let sku = skuEl ? skuEl.innerText.replace(/SKU[:\s]*/i, '').trim() : '';
            const price = priceEl ? parseFloat(priceEl.innerText.replace(/[^0-9.]/g, '')) || 0 : 0;
            const stock = stockEl ? parseInt(stockEl.innerText.replace(/[^0-9]/g, ''), 10) || 0 : 0;

            if (sku || name) {
                items.push({
                    sku: sku || `SP_ROW_${idx + 1}`,
                    name: name || `สินค้า Shopee`,
                    variant: variant,
                    price: price,
                    stock_quantity: stock
                });
            }
        });

        if (items.length > 0) return items;
    }

    // Card View Mode
    const cards = document.querySelectorAll('.product-item, .shopee-card, div[class*="product-card"], div[class*="item-card"]');
    for (let idx = 0; idx < cards.length; idx++) {
        const card = cards[idx];
        const titleEl = card.querySelector('.product-title, .title, [class*="name"], [class*="title"], a[href*="/product/"]');
        const priceEl = card.querySelector('.price, [class*="price"]');
        const stockEl = card.querySelector('[class*="stock"], [class*="qty"], [class*="inventory"]');
        const skuEl = card.querySelector('[class*="sku"]');

        const title = titleEl ? titleEl.innerText.trim() : '';
        const priceClean = priceEl ? priceEl.innerText.replace(/[^0-9.]/g, '') : '0';
        const stockClean = stockEl ? stockEl.innerText.replace(/[^0-9]/g, '') : '0';

        let sku = skuEl ? skuEl.innerText.replace(/SKU[:\s]*/i, '').trim() : '';
        let itemId = '';
        const linkEl = card.querySelector('a[href*="/portal/product/"], a[href*="/product/"]');
        if (linkEl && linkEl.href) {
            const match = linkEl.href.match(/\/product\/(\d+)/);
            if (match) itemId = match[1];
        }

        if (!sku) {
            sku = itemId ? `SP_${itemId}` : `SP_${idx + 1}`;
        }

        // Try fetching individual model variations if item_id exists
        let modelFound = false;
        if (itemId) {
            try {
                const modelRes = await fetch(`/api/v3/product/get_model_list?item_id=${itemId}`, {
                    headers: { 'Accept': 'application/json' },
                    credentials: 'include'
                });
                if (modelRes.ok) {
                    const mJson = await modelRes.json();
                    const models = mJson?.data?.list || mJson?.data?.models || [];
                    if (Array.isArray(models) && models.length > 0) {
                        modelFound = true;
                        models.forEach((m, mIdx) => {
                            const varSku = (m.sku || m.model_sku || `${sku}-${mIdx + 1}`).trim();
                            const varName = (m.name || m.model_name || '').trim();
                            let mPrice = parseFloat(m.price || priceClean) || 0;
                            if (mPrice > 100000) mPrice = mPrice / 100000;
                            const mStock = parseInt(m.normal_stock ?? m.stock ?? stockClean, 10) || 0;

                            items.push({
                                sku: varSku,
                                name: title || `สินค้า Shopee (${sku})`,
                                variant: varName,
                                price: mPrice,
                                stock_quantity: mStock
                            });
                        });
                    }
                }
            } catch (err) {
                // Ignore per-item model error, fallback to card
            }
        }

        if (!modelFound && (sku || title)) {
            items.push({
                sku: sku,
                name: title || `สินค้า Shopee (${sku})`,
                variant: '',
                price: parseFloat(priceClean) || 0,
                stock_quantity: parseInt(stockClean, 10) || 0
            });
        }
    }

    return items;
}

// 5. Initialize when page is ready
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectShopeeFloatingButton, 1000);
});

// Run periodically in case of SPA page change
setInterval(() => {
    injectShopeeFloatingButton();
}, 2500);
