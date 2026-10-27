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
    barcodeType: localStorage.getItem('sgyver_label_barcode_type') || 'BOTH', // 'BOTH', 'CODE128', or 'QR'
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

const DEFAULT_DISTRIBUTOR_PRESETS = [
    { id: 'dist_1', name: 'บริษัท ซิกเนเจอร์ แอพพาเรล จำกัด', shortName: 'บ.ซิกเนเจอร์ แอพพาเรล', brand: 'Signature Apparel', address: '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160' },
    { id: 'dist_2', name: 'Paperstudio (เปเปอร์สตูดิโอ)', shortName: 'Paperstudio', brand: 'Paperstudio (เปเปอร์สตูดิโอ)', address: '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160' },
    { id: 'dist_3', name: 'S-Gyver Official Store', shortName: 'S-Gyver Official', brand: 'S-Gyver', address: '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160' },
    { id: 'dist_4', name: 'Whatever_Glitters', shortName: 'Whatever_Glitters', brand: 'Whatever_Glitters', address: '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160' },
    { id: 'dist_5', name: 'สินค้านำเข้า (Imported)', shortName: 'สินค้านำเข้า', brand: 'No brand', address: '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160' },
    { id: 'dist_6', name: 'ผลิตในประเทศไทย (Made in Thailand)', shortName: '🇹🇭 ผลิตในไทย', brand: 'Signature', address: '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160' }
];

function getDistributorPresets() {
    try {
        const stored = localStorage.getItem('sgyver_distributor_presets');
        if (stored !== null) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item, idx) => ({
                    id: item.id || `dist_${idx}_${Date.now()}`,
                    name: item.name || '',
                    shortName: item.shortName || item.name || '',
                    brand: item.brand !== undefined ? item.brand : (item.name || ''),
                    address: item.address || ''
                }));
            }
        }
    } catch (e) {}
    return DEFAULT_DISTRIBUTOR_PRESETS.map((item, idx) => ({
        ...item,
        id: item.id || `dist_${idx}`,
        brand: item.brand !== undefined ? item.brand : (item.name || ''),
        address: item.address || ''
    }));
}

function renderLabelDistributorChips() {
    const container = document.getElementById('labelDistributorChips');
    if (!container) return;
    const presets = getDistributorPresets();
    container.innerHTML = presets.map((p, idx) => `
        <button type="button" onclick="selectLabelDistributorPreset('${p.id}', ${idx})" 
            title="${p.name}${p.brand ? ` (แบรนด์: ${p.brand})` : ''}"
            class="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-slate-600 rounded-lg text-[10px] border border-slate-200 transition-colors flex items-center gap-1 truncate max-w-[150px]">
            <i class="bi bi-building text-[9px]"></i>
            <span class="truncate">${p.shortName || p.name}</span>
        </button>
    `).join('');
}

function selectLabelDistributorPreset(id, idx) {
    const presets = getDistributorPresets();
    let item = presets.find(p => p.id === id);
    if (!item && typeof idx === 'number' && presets[idx]) item = presets[idx];
    if (!item) return;

    if (item.name && document.getElementById('formDistributor')) {
        document.getElementById('formDistributor').value = item.name;
    }
    if (item.brand && document.getElementById('formBrand')) {
        document.getElementById('formBrand').value = item.brand;
    }
    if (item.address && document.getElementById('formDistributorAddress')) {
        document.getElementById('formDistributorAddress').value = item.address;
    }
    onFormInputChange();
}

/**
 * Extract only the primary/main category from hierarchical category paths
 * e.g. "เสื้อผ้าแฟชั่นผู้หญิง > กระโปรง > กระโปรงสั้นเหนือเข่า" -> "เสื้อผ้าแฟชั่นผู้หญิง"
 */
function getMainProductType(rawType) {
    if (!rawType) return '';
    const str = String(rawType).trim();
    if (str.includes('>')) {
        const parts = str.split('>');
        return parts[0].trim();
    }
    return str;
}

function cleanFormProductType() {
    const el = document.getElementById('formProductType');
    if (el && el.value.includes('>')) {
        el.value = getMainProductType(el.value);
    }
}

/**
 * สกัดเฉพาะขนาด / ไซส์มาตรฐาน (S, M, L, XL, XXL, 2XL, 3XL, Free Size ฯลฯ)
 * ตัดข้อความขยายความ เช่น (อก38"), (อก 40 นิ้ว), (เอว30) ออกทั้งหมด
 * หากไม่มีไซส์ระบุไว้ จะคืนค่าเป็น 'Free Size' ตามที่ผู้ใช้กำหนด
 */
function extractPureSize(raw) {
    if (!raw) return 'Free';
    let str = String(raw).trim();
    if (!str || str === '-' || str === 'ไม่มี') return 'Free';

    // ตัดส่วนขยายความในวงเล็บ เช่น (อก38"), [เอว30], (รอบอก 40 นิ้ว)
    str = str.replace(/[\(\[].*?[\)\]]/g, ' ').trim();
    // ตัดข้อความขยายความที่ตามหลัง เช่น "อก 38", "รอบอก 40", "เอว 32"
    str = str.replace(/(?:อก|รอบอก|เอว|สะโพก|ความยาว|ยาว).*$/i, '').trim();

    if (!str) return 'Free';

    // 1. ตรวจหาคำว่า Free Size / ฟรีไซส์ / One Size / F
    if (/^(free\s*size|freesize|free-size|one\s*size|onesize|free|ฟรีไซส์|ฟรีไซต์|f)$/i.test(str)) {
        return 'Free';
    }

    // 2. ตรวจหาช่วงไซส์เสื้อผ้ามาตรฐาน เช่น S-M, M-L, L-XL, XL-2XL, M-XXL
    const rangeMatch = str.match(/\b([XSML]{1,3}\s*-\s*(?:[XSML]{1,3}|[2-5]XL))\b/i);
    if (rangeMatch) {
        return rangeMatch[1].toUpperCase().replace(/\s+/g, '');
    }

    // 3. ตรวจหาไซส์เสื้อผ้ามาตรฐาน (เรียงจากตัวยาวไปสั้น)
    const sizeRegex = /(?:^|[\s/\-_,])(8XL|7XL|6XL|5XL|4XL|3XL|2XL|XXXXXL|XXXXL|XXXL|XXL|3XS|2XS|XXS|XS|XL|2X|3X|4X|5X|S|M|L|F)(?=[\s/\-_,"'(:;]|$)/i;
    const match = str.match(sizeRegex);
    if (match) {
        const found = match[1].toUpperCase();
        if (found === 'F') return 'Free';
        return found;
    }

    // 4. ตรวจหากรณีไซส์กางเกง/รองเท้าที่เป็นตัวเลข 2 หลัก (เช่น 24 - 48 หรือ 28(เอว28))
    const numMatch = str.match(/(?:^|[\s/\-_,])([2-4][0-9]|5[0-2])(?=[\s/\-_,"'(:;]|$)/);
    if (numMatch) {
        return numMatch[1];
    }

    // 5. หากมีคำว่า free หรือ ฟรี
    if (/free|ฟรี/i.test(str)) {
        return 'Free';
    }

    // 6. ถ้าไม่ได้ลงไซส์ไว้ หรือเป็นข้อความอื่นที่ไม่ใช่ไซส์ ให้เป็น 'Free Size' ตามคำขอ
    return 'Free';
}

function extractPureSizeCandidate(raw) {
    if (!raw) return null;
    let str = String(raw).trim();
    if (!str || str === '-' || str === 'ไม่มี') return null;

    str = str.replace(/[\(\[].*?[\)\]]/g, ' ').trim();
    str = str.replace(/(?:อก|รอบอก|เอว|สะโพก|ความยาว|ยาว).*$/i, '').trim();

    if (!str) return null;

    if (/^(free\s*size|freesize|free-size|one\s*size|onesize|free|ฟรีไซส์|ฟรีไซต์|f)$/i.test(str)) {
        return 'Free';
    }

    const rangeMatch = str.match(/\b([XSML]{1,3}\s*-\s*(?:[XSML]{1,3}|[2-5]XL))\b/i);
    if (rangeMatch) {
        return rangeMatch[1].toUpperCase().replace(/\s+/g, '');
    }

    const sizeRegex = /(?:^|[\s/\-_,])(8XL|7XL|6XL|5XL|4XL|3XL|2XL|XXXXXL|XXXXL|XXXL|XXL|3XS|2XS|XXS|XS|XL|2X|3X|4X|5X|S|M|L|F)(?=[\s/\-_,"'(:;]|$)/i;
    const match = str.match(sizeRegex);
    if (match) {
        const found = match[1].toUpperCase();
        if (found === 'F') return 'Free';
        return found;
    }

    const numMatch = str.match(/(?:^|[\s/\-_,])([2-4][0-9]|5[0-2])(?=[\s/\-_,"'(:;]|$)/);
    if (numMatch) {
        return numMatch[1];
    }

    if (/free|ฟรี/i.test(str)) {
        return 'Free';
    }

    return null;
}

function splitVariantColorAndSize(rawVariant) {
    const str = String(rawVariant || '').trim();
    if (!str) return { color: '', size: 'Free' };

    // กรณีมีตัวคั่น เช่น "ทอง, S(อก38")", "ชมพู / M(อก40")", "ดำ - XL"
    if (str.includes(',') || str.includes('/') || str.includes(' - ') || str.includes('|')) {
        const parts = str.split(/[,/|]+|(?:\s+-\s+)/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
            const p0Size = extractPureSizeCandidate(parts[0]);
            const p1Size = extractPureSizeCandidate(parts[1]);

            if (p1Size) {
                return { color: parts[0], size: p1Size };
            } else if (p0Size) {
                return { color: parts.slice(1).join(', '), size: p0Size };
            } else {
                return { color: parts[0], size: extractPureSize(parts[1]) };
            }
        }
    }

    // กรณีไม่มีตัวคั่น เช่น มีข้อความเดียว เช่น "S(อก38")" หรือ "ทอง"
    const candidate = extractPureSizeCandidate(str);
    if (candidate) {
        return { color: '', size: candidate };
    }

    // ถ้าไม่ใช่ไซส์ แสดงว่าเป็นสีอย่างเดียว เช่น "ทอง" -> ไซส์คือ 'Free'
    return { color: str, size: 'Free' };
}

function cleanFormSizeInput() {
    const el = document.getElementById('formSize');
    if (el) {
        el.value = extractPureSize(el.value);
        onFormColorSizeChange();
    }
}

function onFormColorSizeChange() {
    const color = (document.getElementById('formColor')?.value || '').trim();
    const rawSize = (document.getElementById('formSize')?.value || '').trim();
    const size = rawSize ? extractPureSize(rawSize) : 'Free';
    const hiddenVariant = document.getElementById('formVariant');
    if (hiddenVariant) {
        if (color && size) hiddenVariant.value = `${color},${size}`;
        else if (size) hiddenVariant.value = size;
        else if (color) hiddenVariant.value = color;
        else hiddenVariant.value = '';
    }
    onFormInputChange();
}

function getInventoryLocalProducts() {
    try {
        const stored = localStorage.getItem('sgyver_custom_products');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.warn('Error reading sgyver_custom_products:', e);
    }
    return [];
}

async function findProductFromInventory(querySku) {
    if (!querySku) return null;
    const cleanQuery = String(querySku).trim().toUpperCase();
    if (!cleanQuery) return null;

    // Helper to enrich product with localStorage metadata if missing
    const enrichProduct = (p) => {
        if (!p) return null;
        const cleanSku = (p.sku || cleanQuery).trim().toUpperCase();
        const parentKey = (p.parent_sku || (cleanSku.includes('-') ? cleanSku.split('-').slice(0, -1).join('-') : cleanSku) || '').trim().toUpperCase();

        // 1. Distributor
        let distributor = (p.distributor || '').trim();
        if (!distributor && cleanSku) {
            distributor = (localStorage.getItem('sgyver_distributor_' + cleanSku) || '').trim();
        }
        if (!distributor && parentKey) {
            distributor = (localStorage.getItem('sgyver_distributor_' + parentKey) || '').trim();
        }

        // Match preset for distributor
        const presets = getDistributorPresets();
        const matchedPreset = presets.find(dp => 
            (distributor && dp.name && dp.name.trim().toLowerCase() === distributor.toLowerCase()) ||
            (distributor && dp.shortName && dp.shortName.trim().toLowerCase() === distributor.toLowerCase())
        );

        // 2. Brand resolution
        // Priority:
        // a. p.brand from DB (if not generic placeholder 'Paperstudio (เปเปอร์สตูดิโอ)' when distributor isn't Paperstudio)
        // b. localStorage 'sgyver_brand_' for subSku or parentKey
        // c. localStorage 'sgyver_tab2_attrs_' for subSku or parentKey
        // d. matched preset's brand
        // e. distributor name itself
        let brand = '';
        if (p.brand && p.brand !== 'No brand') {
            if (p.brand !== 'Paperstudio (เปเปอร์สตูดิโอ)' || (distributor && distributor.includes('Paperstudio'))) {
                brand = p.brand.trim();
            }
        }
        if (!brand && cleanSku) {
            brand = (localStorage.getItem('sgyver_brand_' + cleanSku) || '').trim();
            if (brand === 'Paperstudio (เปเปอร์สตูดิโอ)' && distributor && !distributor.includes('Paperstudio')) {
                brand = '';
            }
        }
        if (!brand && parentKey) {
            brand = (localStorage.getItem('sgyver_brand_' + parentKey) || '').trim();
            if (brand === 'Paperstudio (เปเปอร์สตูดิโอ)' && distributor && !distributor.includes('Paperstudio')) {
                brand = '';
            }
        }
        if (!brand) {
            try {
                const tab2Sku = JSON.parse(localStorage.getItem('sgyver_tab2_attrs_' + cleanSku) || '{}');
                const tab2Parent = JSON.parse(localStorage.getItem('sgyver_tab2_attrs_' + parentKey) || '{}');
                const b = tab2Sku.brand || tab2Parent.brand;
                if (b && b !== 'No brand') {
                    if (b !== 'Paperstudio (เปเปอร์สตูดิโอ)' || (distributor && distributor.includes('Paperstudio'))) {
                        brand = b.trim();
                    }
                }
            } catch(e) {}
        }
        if (!brand && matchedPreset && matchedPreset.brand && matchedPreset.brand !== 'No brand') {
            brand = matchedPreset.brand.trim();
        }
        if (!brand && distributor && distributor !== 'บริษัท เปเปอร์สตูดิโอ') {
            brand = distributor;
        }
        if (!brand && p.brand) {
            brand = p.brand.trim();
        }
        if (!brand) {
            brand = 'Whatever_Glitters';
        }

        // 3. Distributor Address
        let address = (p.distributor_address || '').trim();
        if (!address && cleanSku) {
            address = (localStorage.getItem('sgyver_dist_address_' + cleanSku) || '').trim();
        }
        if (!address && parentKey) {
            address = (localStorage.getItem('sgyver_dist_address_' + parentKey) || '').trim();
        }
        if (!address && matchedPreset && matchedPreset.address) {
            address = matchedPreset.address.trim();
        }
        if (!address) {
            address = '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160';
        }

        // 4. Usage Info
        let usage = (p.usage_info || p.usage || '').trim();
        if (!usage && cleanSku) {
            usage = (localStorage.getItem('sgyver_usage_' + cleanSku) || '').trim();
        }
        if (!usage && parentKey) {
            usage = (localStorage.getItem('sgyver_usage_' + parentKey) || '').trim();
        }
        if (!usage) {
            usage = 'สำหรับสวมใส่';
        }

        // 5. Default distributor
        if (!distributor) {
            distributor = brand || 'Whatever_Glitters';
        }

        return {
            ...p,
            sku: p.sku || cleanQuery,
            brand: brand,
            product_type: getMainProductType(p.product_type || p.name || 'เสื้อผ้าแฟชั่น'),
            name: getMainProductType(p.name || p.product_type || 'เสื้อผ้าแฟชั่น'),
            variant: p.variant || 'M L XL XXL',
            usage_info: usage,
            care_instructions: p.care_instructions || 'ควรซักก่อนสวมใส่ / ห้ามใช้น้ำยาฟอกขาว / ควรรีดด้วยไฟปานกลาง / ควรแยกผ้าสีกับผ้าขาวก่อนซัก การซักด้วยเครื่อง อาจทำให้เนื้อผ้าเสียรูปทรง',
            manufacturer: p.manufacturer || 'ประเทศจีน',
            distributor: distributor,
            distributor_address: address,
            price: (p.price !== null && p.price !== undefined && p.price !== '' && !isNaN(p.price)) ? parseFloat(p.price) : null,
            stock_quantity: parseInt(p.stock_quantity ?? 0, 10),
            min_stock_alert: parseInt(p.min_stock_alert ?? 5, 10),
            warehouse_location: (p.warehouse_location || 'A-01').trim()
        };
    };

    // 1. Search in in-memory AppState.products
    if (Array.isArray(AppState.products)) {
        let found = AppState.products.find(p => p.sku && p.sku.trim().toUpperCase() === cleanQuery);
        if (found) return enrichProduct(found);

        found = AppState.products.find(p => p.sku && p.sku.replace(/\s+/g, '').toUpperCase() === cleanQuery.replace(/\s+/g, ''));
        if (found) return enrichProduct(found);

        found = AppState.products.find(p => p.parent_sku && p.parent_sku.trim().toUpperCase() === cleanQuery);
        if (found) return enrichProduct(found);
    }

    // 2. Search in localStorage 'sgyver_custom_products' (Inventory page cache)
    const localProds = getInventoryLocalProducts();
    if (localProds.length > 0) {
        let foundLocal = localProds.find(p => p.sku && p.sku.trim().toUpperCase() === cleanQuery);
        if (foundLocal) return enrichProduct(foundLocal);

        foundLocal = localProds.find(p => p.sku && p.sku.replace(/\s+/g, '').toUpperCase() === cleanQuery.replace(/\s+/g, ''));
        if (foundLocal) return enrichProduct(foundLocal);

        foundLocal = localProds.find(p => p.parent_sku && p.parent_sku.trim().toUpperCase() === cleanQuery);
        if (foundLocal) return enrichProduct(foundLocal);

        // Prefix match (e.g. parent sku)
        foundLocal = localProds.find(p => p.sku && (p.sku.toUpperCase().startsWith(cleanQuery + '-') || cleanQuery.startsWith(p.sku.toUpperCase() + '-')));
        if (foundLocal) return enrichProduct(foundLocal);
    }

    // 3. Query Supabase
    if (AppState.supabaseClient) {
        try {
            // Exact match
            const { data, error } = await AppState.supabaseClient
                .from('product_labels')
                .select('*')
                .eq('sku', cleanQuery)
                .maybeSingle();

            if (!error && data) {
                return enrichProduct(data);
            }

            // Fallback: match by parent_sku or prefix
            const { data: parentList, error: parentErr } = await AppState.supabaseClient
                .from('product_labels')
                .select('*')
                .or(`parent_sku.eq.${cleanQuery},sku.ilike.${cleanQuery}%`)
                .limit(1);

            if (!parentErr && parentList && parentList.length > 0) {
                return enrichProduct(parentList[0]);
            }
        } catch (err) {
            console.warn('Supabase query error in findProductFromInventory:', err);
        }
    }

    return null;
}

function populateFormFromInventoryProduct(item, showNotification = true) {
    if (!item) return;

    AppState.currentProduct = { ...item };
    AppState.isEditing = true;
    AppState.editId = item.id || null;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    setVal('formSku', item.sku || '');
    setVal('formBrand', item.brand || '');
    setVal('formProductType', getMainProductType(item.product_type || item.name || 'เสื้อผ้าแฟชั่น'));
    const parsedVar = splitVariantColorAndSize(item.variant || '');
    setVal('formColor', parsedVar.color);
    setVal('formSize', parsedVar.size);
    setVal('formVariant', item.variant || '');
    setVal('formUsage', item.usage_info || 'สำหรับสวมใส่');
    setVal('formCare', item.care_instructions || '');
    setVal('formManufacturer', item.manufacturer || 'ประเทศจีน');
    setVal('formDistributor', item.distributor || '');
    setVal('formDistributorAddress', item.distributor_address || '');

    // Price handling
    const chkPrice = document.getElementById('chkPriceAsSpecified');
    const priceInput = document.getElementById('formPrice');
    const priceWrapper = document.getElementById('priceInputWrapper');
    if (item.price !== null && item.price !== undefined && item.price !== '' && !isNaN(item.price)) {
        if (chkPrice) chkPrice.checked = false;
        if (priceWrapper) priceWrapper.classList.remove('hidden');
        if (priceInput) priceInput.value = item.price;
    } else {
        if (chkPrice) chkPrice.checked = true;
        if (priceWrapper) priceWrapper.classList.add('hidden');
        if (priceInput) priceInput.value = '';
    }

    setVal('formStock', item.stock_quantity ?? 0);
    setVal('formMinStock', item.min_stock_alert ?? 5);
    setVal('formLocation', item.warehouse_location || 'A-01');
    setVal('editProductId', item.id || '');

    // Form mode badge
    const badge = document.getElementById('formModeBadge');
    if (badge) {
        badge.innerHTML = `<i class="bi bi-link-45deg text-blue-600 font-bold me-1"></i> เชื่อมกับคลังสินค้า: <strong>${escapeHtml(item.sku)}</strong>`;
        badge.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 transition-all';
    }

    // Update label preview
    updateLabelPreview(AppState.currentProduct);

    if (showNotification) {
        SoundFx.playSuccessBeep();
        showInventorySyncToast(item);
    }
}

function showInventorySyncToast(item, customMessage = null) {
    let toast = document.getElementById('inventorySyncToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'inventorySyncToast';
        toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[99999] transition-all duration-300 pointer-events-none transform -translate-y-6 opacity-0';
        document.body.appendChild(toast);
    }

    if (customMessage) {
        toast.innerHTML = `
            <div class="px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2.5 text-xs">
                <span>${customMessage}</span>
            </div>
        `;
    } else if (item) {
        toast.innerHTML = `
            <div class="px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-md border border-blue-500/40 flex items-center gap-3 text-xs">
                <div class="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-500/30">
                    <i class="bi bi-check-lg"></i>
                </div>
                <div class="min-w-0 pr-1">
                    <div class="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span class="text-sky-300 font-mono">${escapeHtml(item.sku)}</span>
                        <span class="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded border border-blue-400/30">คลังสินค้า</span>
                    </div>
                    <div class="text-[11px] text-slate-300 truncate max-w-xs">
                        ${escapeHtml(item.name || item.product_type || '')} ${item.variant ? `(${escapeHtml(item.variant)})` : ''} • ฿${item.price ?? 'ระบุ ณ จุดขาย'}
                    </div>
                </div>
            </div>
        `;
    }

    toast.classList.remove('-translate-y-6', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    if (window._syncToastTimer) clearTimeout(window._syncToastTimer);
    window._syncToastTimer = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-6', 'opacity-0');
    }, 3200);
}

let skuLookupDebounceTimer = null;

function handleSkuInput(val) {
    onFormInputChange();
    const cleanSku = (val || '').trim().toUpperCase();
    if (!cleanSku || cleanSku.length < 3) return;

    clearTimeout(skuLookupDebounceTimer);
    skuLookupDebounceTimer = setTimeout(async () => {
        const product = await findProductFromInventory(cleanSku);
        if (product && product.sku.toUpperCase() === cleanSku) {
            populateFormFromInventoryProduct(product, true);
        }
    }, 380);
}

async function handleSkuKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Do NOT submit the form!
        const input = document.getElementById('formSku');
        const sku = (input?.value || '').trim();
        if (!sku) return;
        await triggerManualSkuLookup(sku);
    }
}

async function handleSkuBlur(val) {
    const cleanSku = (val || '').trim().toUpperCase();
    if (!cleanSku || cleanSku.length < 3) return;
    if (AppState.currentProduct && AppState.currentProduct.sku && AppState.currentProduct.sku.toUpperCase() === cleanSku) {
        return;
    }
    const product = await findProductFromInventory(cleanSku);
    if (product) {
        populateFormFromInventoryProduct(product, true);
    }
}

async function triggerManualSkuLookup(forcedSku) {
    const skuInput = document.getElementById('formSku');
    const sku = (forcedSku || skuInput?.value || '').trim();
    if (!sku) {
        alert('กรุณากรอกรหัส SKU / บาร์โค้ดที่ต้องการค้นหา');
        skuInput?.focus();
        return;
    }

    const badge = document.getElementById('formModeBadge');
    if (badge) {
        badge.innerHTML = `<span class="inline-block animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent me-1"></span> กำลังดึงข้อมูลจากคลังสินค้า...`;
        badge.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200';
    }

    const product = await findProductFromInventory(sku);
    if (product) {
        populateFormFromInventoryProduct(product, true);
    } else {
        SoundFx.playErrorBuzz();
        if (badge) {
            badge.innerHTML = `<i class="bi bi-info-circle me-1"></i> โหมด: รหัสใหม่ (ยังไม่มีในคลัง)`;
            badge.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200';
        }
        showInventorySyncToast(null, `⚠️ ไม่พบข้อมูลรหัส "${sku}" ในคลังสินค้า (สามารถกรอกข้อมูลเพื่อบันทึกเป็นสินค้าใหม่ได้)`);
    }
}

async function loadProductsList() {
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

    let supabaseProducts = [];
    if (AppState.supabaseClient) {
        try {
            const { data, error } = await AppState.supabaseClient
                .from('product_labels')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000);

            if (!error && Array.isArray(data)) {
                supabaseProducts = data;
            }
        } catch (err) {
            console.warn('Load products from Supabase warning:', err);
        }
    }

    // Merge with localStorage 'sgyver_custom_products' from the Inventory page
    const localProducts = getInventoryLocalProducts();
    const map = new Map();

    localProducts.forEach(p => {
        if (p && p.sku) map.set(p.sku.toUpperCase(), p);
    });

    supabaseProducts.forEach(p => {
        if (p && p.sku) map.set(p.sku.toUpperCase(), p);
    });

    AppState.products = Array.from(map.values());
    renderProductsTable(AppState.products);
    updateWarehouseMetrics(AppState.products);

    const countEl = document.getElementById('productCount');
    if (countEl) countEl.innerText = AppState.products.length;
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
    const product_type = getMainProductType((document.getElementById('formProductType')?.value || '').trim()) || 'เสื้อผ้าแฟชั่น';
    const name = product_type || (document.getElementById('formBrand')?.value || '').trim() || 'เสื้อผ้าแฟชั่น';
    const formColorVal = (document.getElementById('formColor')?.value || '').trim();
    const formSizeVal = (document.getElementById('formSize')?.value || '').trim();
    let variant = '';
    if (formColorVal && formSizeVal) variant = `${formColorVal},${formSizeVal}`;
    else if (formSizeVal) variant = formSizeVal;
    else if (formColorVal) variant = formColorVal;
    else variant = (document.getElementById('formVariant')?.value || '').trim();
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
        distributor: distributor || 'Whatever_Glitters',
        distributor_address,
        care_instructions,
        brand,
        product_type,
        usage_info,
        manufacturer,
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

        // Also update local inventory cache
        try {
            const localList = getInventoryLocalProducts();
            const existingIdx = localList.findIndex(p => p.sku && p.sku.toUpperCase() === sku);
            const savedItem = (data && data[0]) ? { ...data[0], ...payload } : payload;
            if (existingIdx !== -1) {
                localList[existingIdx] = { ...localList[existingIdx], ...savedItem };
            } else {
                localList.push(savedItem);
            }
            localStorage.setItem('sgyver_custom_products', JSON.stringify(localList));
        } catch (e) {}

        SoundFx.playSuccessBeep();

        const savedItem = (data && data[0]) ? data[0] : payload;
        populateFormFromInventoryProduct(savedItem, false);

        await loadProductsList();
        showInventorySyncToast(savedItem, `✅ บันทึกสินค้า "${sku}" ลงระบบและคลังสินค้าเรียบร้อยแล้ว`);
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
    if (document.getElementById('formBrand')) document.getElementById('formBrand').value = item.brand || 'Whatever_Glitters';
    if (document.getElementById('formProductType')) document.getElementById('formProductType').value = getMainProductType(item.product_type || item.name || 'เสื้อผ้าแฟชั่น');
    const parsedEditVar = splitVariantColorAndSize(item.variant || '');
    if (document.getElementById('formColor')) document.getElementById('formColor').value = parsedEditVar.color;
    if (document.getElementById('formSize')) document.getElementById('formSize').value = parsedEditVar.size;
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
    if (document.getElementById('formDistributor')) document.getElementById('formDistributor').value = 'Whatever_Glitters';
    if (document.getElementById('formBrand')) document.getElementById('formBrand').value = 'Whatever_Glitters';
    if (document.getElementById('formDistributorAddress')) document.getElementById('formDistributorAddress').value = '25 ซอยพุทธมณฑลสาย 2 ซอย 11 แขวงบางไผ่ เขตบางแค กรุงเทพฯ 10160';
    if (document.getElementById('formProductType')) document.getElementById('formProductType').value = 'เสื้อผ้าแฟชั่น';
    if (document.getElementById('formColor')) document.getElementById('formColor').value = '';
    if (document.getElementById('formSize')) document.getElementById('formSize').value = 'Free';
    if (document.getElementById('formVariant')) document.getElementById('formVariant').value = 'Free';
    if (document.getElementById('formUsage')) document.getElementById('formUsage').value = 'สำหรับสวมใส่';
    if (document.getElementById('formCare')) document.getElementById('formCare').value = 'ควรซักก่อนสวมใส่ / ห้ามใช้น้ำยาฟอกขาว / ควรรีดด้วยไฟปานกลาง / ควรแยกผ้าสีกับผ้าขาวก่อนซัก การซักด้วยเครื่อง อาจทำให้เนื้อผ้าเสียรูปทรง';
    if (document.getElementById('formManufacturer')) document.getElementById('formManufacturer').value = 'ประเทศจีน';

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
    const brand = (document.getElementById('formBrand')?.value || '').trim() || 'Whatever_Glitters';
    const product_type = getMainProductType((document.getElementById('formProductType')?.value || '').trim()) || 'เสื้อผ้าแฟชั่น';
    const formColorVal = (document.getElementById('formColor')?.value || '').trim();
    const formSizeVal = (document.getElementById('formSize')?.value || '').trim();
    let variant = '';
    if (formColorVal && formSizeVal) variant = `${formColorVal},${formSizeVal}`;
    else if (formSizeVal) variant = formSizeVal;
    else if (formColorVal) variant = formColorVal;
    else variant = (document.getElementById('formVariant')?.value || '').trim() || 'Free';
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
        // Query from Inventory (Local Cache + Memory + Supabase)
        const data = await findProductFromInventory(sku);

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

            // Populate every field in Card 1 form and update preview immediately
            populateFormFromInventoryProduct(data, false);

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
        if (document.getElementById('formBrand')) document.getElementById('formBrand').value = item.brand || 'Whatever_Glitters';
        if (document.getElementById('formProductType')) document.getElementById('formProductType').value = getMainProductType(item.product_type || item.name || 'เสื้อผ้าแฟชั่น');
        const parsedPreview = splitVariantColorAndSize(item.variant || '');
        if (document.getElementById('formColor')) document.getElementById('formColor').value = parsedPreview.color;
        if (document.getElementById('formSize')) document.getElementById('formSize').value = parsedPreview.size;
        if (document.getElementById('formVariant')) document.getElementById('formVariant').value = item.variant || 'Free';
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

    if (lblBrand) lblBrand.innerText = product.brand || 'Whatever_Glitters';
    if (lblProductType) lblProductType.innerText = getMainProductType(product.product_type || product.name || 'เสื้อผ้าแฟชั่น');

    // Parse color and size for sticker display
    const formColorVal = (document.getElementById('formColor')?.value || '').trim();
    const formSizeVal = (document.getElementById('formSize')?.value || '').trim();
    let displayColor = formColorVal;
    let displaySize = formSizeVal ? extractPureSize(formSizeVal) : '';

    if (!displayColor && !displaySize && product.variant) {
        const parsedV = splitVariantColorAndSize(product.variant);
        displayColor = parsedV.color;
        displaySize = parsedV.size;
    } else if (!displaySize && product.variant) {
        displaySize = extractPureSize(product.variant);
    }

    if (!displaySize) {
        displaySize = 'Free';
    }

    const stickerLineColor = document.getElementById('stickerLineColor');
    const lblColor = document.getElementById('lblColor');
    if (stickerLineColor && lblColor) {
        if (displayColor) {
            stickerLineColor.classList.remove('hidden');
            lblColor.innerText = displayColor;
        } else {
            stickerLineColor.classList.add('hidden');
        }
    }

    if (lblVariant) lblVariant.innerText = displaySize;

    // ⚡ Big Size Callout on right side (ตัวอักษรไซส์ตัวใหญ่เด่นชัด)
    const stickerBigSize = document.getElementById('stickerBigSize');
    const chkBigSize = document.getElementById('chkBigSize');
    const isShowBigSize = chkBigSize ? chkBigSize.checked : true;
    if (stickerBigSize) {
        const rawSize = displaySize.trim();
        if (isShowBigSize && rawSize) {
            stickerBigSize.classList.remove('hidden');
            stickerBigSize.innerText = rawSize;

            const cleanUpper = rawSize.toUpperCase();
            if (cleanUpper === 'FREE') {
                stickerBigSize.style.setProperty('font-size', '14pt', 'important');
                stickerBigSize.style.setProperty('line-height', '0.95', 'important');
                stickerBigSize.style.setProperty('letter-spacing', '-0.5px', 'important');
            } else if (cleanUpper.length <= 1) { // S, M, L, F
                stickerBigSize.style.setProperty('font-size', '38pt', 'important');
                stickerBigSize.style.setProperty('line-height', '0.85', 'important');
                stickerBigSize.style.setProperty('letter-spacing', '-1px', 'important');
            } else if (cleanUpper.length <= 2) { // XL, XS, 2X, 3X
                stickerBigSize.style.setProperty('font-size', '30pt', 'important');
                stickerBigSize.style.setProperty('line-height', '0.88', 'important');
                stickerBigSize.style.setProperty('letter-spacing', '-1px', 'important');
            } else if (cleanUpper.length <= 3) { // 2XL, XXL, 3XL, 4XL
                stickerBigSize.style.setProperty('font-size', '24pt', 'important');
                stickerBigSize.style.setProperty('line-height', '0.90', 'important');
                stickerBigSize.style.setProperty('letter-spacing', '-0.8px', 'important');
            } else if (cleanUpper.length <= 5) { // M-XXL, 5XL, S-M
                stickerBigSize.style.setProperty('font-size', '15pt', 'important');
                stickerBigSize.style.setProperty('line-height', '0.95', 'important');
                stickerBigSize.style.setProperty('letter-spacing', '-0.5px', 'important');
            } else { // Free Size, One Size
                stickerBigSize.style.setProperty('font-size', '12pt', 'important');
                stickerBigSize.style.setProperty('line-height', '1.02', 'important');
                stickerBigSize.style.setProperty('letter-spacing', '-0.3px', 'important');
            }
        } else {
            stickerBigSize.classList.add('hidden');
        }
    }
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
    const barcodeWrapper = document.getElementById('barcodeWrapper');
    const qrcodeWrapper = document.getElementById('qrcodeWrapper');
    const barcodeSvg = document.getElementById('barcodeSvg');
    const qrcodeDiv = document.getElementById('qrcodeDiv');

    const is57 = AppState.labelSize === '57roll';
    const is70 = AppState.labelSize === '70x50';
    const type = AppState.barcodeType || 'BOTH';

    const showBarcode = (type === 'BOTH' || type === 'CODE128');
    const showQr = (type === 'BOTH' || type === 'QR');

    // Toggle container visibilities
    if (barcodeWrapper) {
        if (showBarcode) barcodeWrapper.classList.remove('hidden');
        else barcodeWrapper.classList.add('hidden');
    }
    if (qrcodeWrapper) {
        if (showQr) qrcodeWrapper.classList.remove('hidden');
        else qrcodeWrapper.classList.add('hidden');
    }

    // 1. Render 1D Barcode (JsBarcode CODE128 for handheld barcode scanner guns)
    if (showBarcode && barcodeSvg) {
        try {
            let barWidth = 1.55;
            let barHeight = type === 'BOTH' ? 62 : 85;

            if (is57) {
                barWidth = 1.55;
                barHeight = type === 'BOTH' ? 65 : 85;
            } else if (is70) {
                barWidth = 1.8;
                barHeight = type === 'BOTH' ? 70 : 90;
            } else { // 50x30
                barWidth = 1.35;
                barHeight = type === 'BOTH' ? 36 : 48;
            }

            JsBarcode('#barcodeSvg', codeText, {
                format: 'CODE128',
                lineColor: '#000000',
                width: barWidth,
                height: barHeight,
                displayValue: false,
                margin: 3
            });
        } catch (err) {
            console.warn('JsBarcode render failed:', err);
        }
    }

    // 2. Render 2D QR Code (QRCode for mobile phone cameras & iPad fast scanning)
    if (showQr && qrcodeDiv) {
        qrcodeDiv.innerHTML = '';
        let qrSize = 58; // ~15.5mm (perfect scan size for mobile camera lenses)
        if (type === 'QR') {
            qrSize = is57 ? 75 : (is70 ? 90 : 52);
        } else {
            // In BOTH mode
            qrSize = is57 ? 58 : (is70 ? 70 : 42);
        }

        if (window.QRCode) {
            new QRCode(qrcodeDiv, {
                text: codeText,
                width: qrSize,
                height: qrSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });

            // Explicitly hide the internal canvas created by qrcodejs so only the crisp img displays
            const canvas = qrcodeDiv.querySelector('canvas');
            if (canvas) canvas.style.display = 'none';
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

function toggleBigSizeOption() {
    const chk = document.getElementById('chkBigSize');
    const isChecked = chk ? chk.checked : true;
    localStorage.setItem('sgyver_label_show_big_size', isChecked ? '1' : '0');
    updateLabelPreview(AppState.currentProduct);
}

function switchBarcodeType(type) {
    AppState.barcodeType = type;
    try {
        localStorage.setItem('sgyver_label_barcode_type', type);
    } catch (e) {}

    const btnBoth = document.getElementById('btnTypeBoth');
    const btnBarcode = document.getElementById('btnTypeBarcode');
    const btnQR = document.getElementById('btnTypeQR');

    const activeClass = 'px-2 py-1 rounded-md text-xs font-bold transition-all bg-white text-blue-600 shadow-sm';
    const inactiveClass = 'px-2 py-1 rounded-md text-xs font-medium transition-all text-slate-600 hover:text-slate-900';

    if (btnBoth) btnBoth.className = type === 'BOTH' ? activeClass : inactiveClass;
    if (btnBarcode) btnBarcode.className = type === 'CODE128' ? activeClass : inactiveClass;
    if (btnQR) btnQR.className = type === 'QR' ? activeClass : inactiveClass;

    const sku = (AppState.currentProduct && AppState.currentProduct.sku) || 'SAMPLE';
    renderBarcodeOrQr(sku);
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
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@600;700;800;900&family=Prompt:wght@600;700;800;900&display=swap" rel="stylesheet">
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
                    font-family: 'Kanit', 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-weight: 700 !important;
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
                    padding: 2.5mm 5mm 0mm 5mm !important;
                    font-size: 7.2pt !important;
                    line-height: 1.3 !important;
                    font-weight: 700 !important;
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
                    height: 12mm !important;
                    shape-rendering: crispEdges !important;
                }
                .size-57roll .sticker-barcode-wrapper svg {
                    height: 14mm !important;
                    max-width: 46mm !important;
                    shape-rendering: crispEdges !important;
                }
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

                /* Thai Garment Label Styles for Print - High Contrast Bold for Thermal Print */
                .sticker-line-brand {
                    font-size: 8.8pt !important;
                    line-height: 1.25 !important;
                    margin-bottom: 2.5px !important;
                    font-weight: 800 !important;
                }
                .sticker-line-brand .sticker-tag-lbl {
                    font-size: 9.2pt !important;
                    font-weight: 800 !important;
                }
                .sticker-val-brand {
                    font-size: 9.2pt !important;
                    font-weight: 800 !important;
                }
                .sticker-tag-lbl {
                    font-weight: 800 !important;
                    color: #000000 !important;
                    margin-right: 3px !important;
                    display: inline !important;
                    font-size: 7.2pt !important;
                }
                .sticker-val {
                    color: #000000 !important;
                    font-weight: 700 !important;
                    display: inline !important;
                    font-size: 7.2pt !important;
                }
                .sticker-line {
                    margin-bottom: 2px !important;
                    line-height: 1.28 !important;
                    font-weight: 700 !important;
                }
                .sticker-line-care {
                    margin-bottom: 2.5px !important;
                    line-height: 1.25 !important;
                    font-size: 6.5pt !important;
                    font-weight: 700 !important;
                    text-align: left !important;
                }
                .sticker-line-care .sticker-tag-lbl {
                    font-size: 6.8pt !important;
                    font-weight: 800 !important;
                }
                .sticker-line-care .sticker-val {
                    font-size: 6.5pt !important;
                    font-weight: 700 !important;
                }
                .sticker-line-distributor {
                    margin-bottom: 2px !important;
                    line-height: 1.25 !important;
                    font-size: 6.8pt !important;
                    font-weight: 700 !important;
                }
                .sticker-line-distributor .sticker-tag-lbl {
                    font-size: 7.2pt !important;
                    font-weight: 800 !important;
                }
                .sticker-line-distributor .sticker-val {
                    font-size: 7.0pt !important;
                    font-weight: 700 !important;
                }
                .sticker-val-address {
                    font-size: 6.5pt !important;
                    font-weight: 700 !important;
                    line-height: 1.24 !important;
                    padding-left: 2px !important;
                    margin-top: 1.5px !important;
                    word-break: break-word !important;
                }
                .sticker-line-price {
                    margin-top: 2.5px !important;
                    margin-bottom: 2.5px !important;
                    font-size: 8.2pt !important;
                    font-weight: 800 !important;
                }
                .sticker-line-price .sticker-tag-lbl {
                    font-size: 8.5pt !important;
                    font-weight: 800 !important;
                }
                .sticker-line-price .sticker-val {
                    font-size: 8.8pt !important;
                    font-weight: 800 !important;
                }
                .sticker-barcode-section {
                    border-top: 1px dashed #000000 !important;
                    padding-top: 2px !important;
                    margin-top: 2.5px !important;
                }
                .sticker-barcode-section strong {
                    font-weight: 850 !important;
                    font-size: 7.2pt !important;
                    color: #000000 !important;
                }
                .sticker-barcode-section span {
                    font-weight: 800 !important;
                    font-size: 7.2pt !important;
                    color: #000000 !important;
                }
                .size-57roll .sticker-barcode-wrapper svg {
                    height: 12mm !important;
                    max-width: 46mm !important;
                    shape-rendering: crispEdges !important;
                }
                .sticker-qr-wrapper {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    margin-top: 1.5px !important;
                }
                .sticker-qr-wrapper canvas {
                    display: none !important;
                }
                .sticker-qr-wrapper img {
                    display: block !important;
                    margin: 0 auto !important;
                    shape-rendering: crispEdges !important;
                    image-rendering: pixelated !important;
                }
                .size-57roll .sticker-qr-wrapper img {
                    width: 17mm !important;
                    height: 17mm !important;
                }

                .hidden {
                    display: none !important;
                }

                /* Middle row layout for Color, Size, Usage & Big Size Callout */
                .sticker-middle-row {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    flex-wrap: nowrap !important;
                    margin: 1px 0 !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                .sticker-middle-left {
                    flex: 1 1 auto !important;
                    min-width: 0 !important;
                    padding-right: 2px !important;
                }
                .sticker-big-size {
                    flex: 0 0 auto !important;
                    font-weight: 900 !important;
                    font-family: 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                    color: #000000 !important;
                    line-height: 0.88 !important;
                    text-align: right !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-end !important;
                    user-select: none !important;
                    box-sizing: border-box !important;
                    padding-right: 0.5mm !important;
                    font-size: 38pt !important;
                    letter-spacing: -1px !important;
                }
                .size-57roll .sticker-big-size {
                    padding-right: 0.5mm !important;
                    font-size: 38pt !important;
                    line-height: 0.88 !important;
                }
                .size-50x30 .sticker-big-size {
                    font-size: 26pt !important;
                    line-height: 0.88 !important;
                }
                .size-70x50 .sticker-big-size {
                    font-size: 48pt !important;
                    line-height: 0.88 !important;
                }
                .sticker-sku-line {
                    text-align: center !important;
                    font-family: 'Kanit', 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    letter-spacing: 0px !important;
                    font-weight: 800 !important;
                    font-size: 7.2pt !important;
                    color: #000000 !important;
                    line-height: 1.3 !important;
                }
                .sticker-sku-line strong,
                .sticker-sku-line #lblSkuText {
                    font-weight: 850 !important;
                    font-size: 7.2pt !important;
                    color: #000000 !important;
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
    renderLabelDistributorChips();

    // Restore Big Size checkbox setting
    const savedShowBigSize = localStorage.getItem('sgyver_label_show_big_size');
    if (savedShowBigSize !== null && document.getElementById('chkBigSize')) {
        document.getElementById('chkBigSize').checked = savedShowBigSize === '1';
    }

    onFormInputChange();
    updateTearFeedUI();
    await loadProductsList();

    // Check if SKU is passed via URL query param (e.g. from Inventory app)
    const urlParams = new URLSearchParams(window.location.search);
    const skuParam = urlParams.get('sku');
    if (skuParam) {
        const found = await findProductFromInventory(skuParam);
        if (found) {
            populateFormFromInventoryProduct(found, false);
        }
    }

    setTimeout(() => {
        refocusScanner();
    }, 400);
});

// ==============================================================================
// 8. GLOBAL BARCODE SCANNER AUTO-CAPTURE LISTENER
// ==============================================================================
let barcodeBuffer = '';
let barcodeLastCharTime = 0;

window.addEventListener('keydown', async (e) => {
    // If user is focused on a normal textarea or other inputs (except scannerInput and formSku), let normal typing proceed
    const target = e.target;
    const isModalOpen = !document.getElementById('supabaseModal')?.classList.contains('hidden') ||
                        !document.getElementById('batchPrintModal')?.classList.contains('hidden');
    if (isModalOpen) return;

    const isOtherInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && 
                         target.id !== 'scannerInput' && target.id !== 'formSku';

    if (isOtherInput) return;

    const currentTime = Date.now();
    const timeDiff = currentTime - barcodeLastCharTime;
    barcodeLastCharTime = currentTime;

    if (e.key === 'Enter') {
        // Fast consecutive characters ending with Enter = Barcode Scanner Gun!
        if (barcodeBuffer.length >= 3 && timeDiff < 120) {
            e.preventDefault();
            const scannedSku = barcodeBuffer.trim().toUpperCase();
            barcodeBuffer = '';

            const scanInput = document.getElementById('scannerInput');
            if (scanInput) scanInput.value = scannedSku;

            await processBarcodeScan(scannedSku);
            return;
        }
        barcodeBuffer = '';
        return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (timeDiff > 120) {
            barcodeBuffer = '';
        }
        barcodeBuffer += e.key;
    }
}, true);

// ==============================================================================
// 9. WEB BLUETOOTH THERMAL PRINTER & NATIVE SHARE (PERIPAGE NO WATERMARK)
// ==============================================================================
const BluetoothThermalPrinter = {
    device: null,
    server: null,
    characteristic: null,
    isConnected: false,

    async connect() {
        if (!navigator.bluetooth) {
            throw new Error('เบราว์เซอร์นี้ยังไม่รองรับ Web Bluetooth (แนะนำ Google Chrome / Edge บน Android/คอมพิวเตอร์ หรือเบราว์เซอร์ Bluefy บน iOS)');
        }

        const optionalServices = [
            '0000ff00-0000-1000-8000-00805f9b34fb', // PeriPage primary
            '000018f0-0000-1000-8000-00805f9b34fb', // Serial BLE
            '0000ae30-0000-1000-8000-00805f9b34fb',
            '0000fff0-0000-1000-8000-00805f9b34fb',
            '0000ffe0-0000-1000-8000-00805f9b34fb',
            '0000fee7-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
            '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
        ];

        try {
            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: optionalServices
            });

            this.device.addEventListener('gattserverdisconnected', () => {
                this.isConnected = false;
                this.characteristic = null;
                console.log('Bluetooth Printer disconnected');
            });

            this.server = await this.device.gatt.connect();

            // PeriPage preferred write characteristic UUIDs
            const preferredWriteUuids = [
                '0000ff02-0000-1000-8000-00805f9b34fb', // PeriPage standard
                '00002af1-0000-1000-8000-00805f9b34fb',
                '49535343-8841-43f4-a8d4-ecbe34729bb3',
                '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
                '0000ae01-0000-1000-8000-00805f9b34fb',
                '0000fff2-0000-1000-8000-00805f9b34fb',
                '0000fff1-0000-1000-8000-00805f9b34fb',
                '0000ffe1-0000-1000-8000-00805f9b34fb'
            ];

            const ignoredServices = ['00001800', '00001801', '0000180a', '0000180f'];
            const writableList = [];
            const services = await this.server.getPrimaryServices();

            for (const s of services) {
                if (ignoredServices.some(ig => s.uuid.toLowerCase().includes(ig))) continue;
                try {
                    const chars = await s.getCharacteristics();
                    for (const c of chars) {
                        const canWrite = c.properties.write || c.properties.writeWithoutResponse;
                        if (canWrite) {
                            let score = 10;
                            const cuuid = c.uuid.toLowerCase();
                            const suuid = s.uuid.toLowerCase();

                            if (suuid.includes('ff00') || suuid.includes('18f0') || suuid.includes('49535343') || suuid.includes('6e400001')) {
                                score += 50;
                            }
                            const prefIdx = preferredWriteUuids.findIndex(u => cuuid === u.toLowerCase());
                            if (prefIdx >= 0) {
                                score += (100 - prefIdx * 10);
                            }
                            if (c.properties.writeWithoutResponse) score += 5;

                            writableList.push({ c, score, uuid: c.uuid });
                        }
                    }
                } catch (e) {
                    console.warn('Characteristic inspection skip:', e);
                }
            }

            if (!writableList.length) {
                throw new Error('ไม่พบช่องทางส่งข้อมูลพิมพ์ (เครื่องพิมพ์นี้อาจใช้ Bluetooth Classic SPP แนะนำให้กดปุ่ม "แชร์เข้าแอป PeriPage" เพื่อพิมพ์ผ่านแอปแท้โดยตรง)');
            }

            // Pick highest score
            writableList.sort((a, b) => b.score - a.score);
            this.characteristic = writableList[0].c;
            console.log('Selected PeriPage characteristic:', this.characteristic.uuid, 'Score:', writableList[0].score);

            this.isConnected = true;
            return this.device.name || 'PeriPage Printer';
        } catch (err) {
            this.isConnected = false;
            throw err;
        }
    },

    async writeRaw(bytes) {
        if (!this.characteristic) throw new Error('Bluetooth characteristic not ready');
        const chunkSize = 100;
        const noRsp = this.characteristic.properties.writeWithoutResponse;

        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            let tries = 0;
            while (true) {
                try {
                    if (noRsp && this.characteristic.writeValueWithoutResponse) {
                        await this.characteristic.writeValueWithoutResponse(chunk);
                    } else if (this.characteristic.writeValueWithResponse) {
                        await this.characteristic.writeValueWithResponse(chunk);
                    } else {
                        await this.characteristic.writeValue(chunk);
                    }
                    break;
                } catch (err) {
                    tries++;
                    if (tries > 3) throw err;
                    await new Promise(r => setTimeout(r, 60));
                }
            }
            await new Promise(r => setTimeout(r, 12));
        }
    },

    async printRasterImage(canvas) {
        if (!this.isConnected || !this.characteristic) {
            await this.connect();
        }

        const width = 384;
        const height = canvas.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, width, height).data;

        const bpr = 48; // 384 dots / 8 = 48 bytes per row
        const packed = new Uint8Array(bpr * height);

        for (let y = 0; y < height; y++) {
            const rowOffset = y * bpr;
            for (let bx = 0; bx < bpr; bx++) {
                let byteVal = 0;
                for (let bit = 0; bit < 8; bit++) {
                    const x = bx * 8 + bit;
                    if (x < width) {
                        const idx = (y * width + x) * 4;
                        const r = imgData[idx];
                        const g = imgData[idx + 1];
                        const b = imgData[idx + 2];
                        const a = imgData[idx + 3];
                        const isDark = a > 128 && (0.299 * r + 0.587 * g + 0.114 * b < 165);
                        if (isDark) {
                            byteVal |= (0x80 >> bit);
                        }
                    }
                }
                packed[rowOffset + bx] = byteVal;
            }
        }

        // PeriPage Protocol Command Definitions:
        // Reset command: 16 bytes: 10 ff fe 01 00 00 00 00 00 00 00 00 00 00 00 00
        const cmdReset = new Uint8Array([0x10, 0xFF, 0xFE, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        // Density command (2 = High): 10 ff 10 00 02
        const cmdDensity = new Uint8Array([0x10, 0xFF, 0x10, 0x00, 0x02]);
        // Feed command: 1B 4A [dots]
        const cmdFeed = (dots) => new Uint8Array([0x1B, 0x4A, Math.max(0, Math.min(255, dots))]);

        // 1. Set concentration/density
        await this.writeRaw(cmdDensity);
        await new Promise(r => setTimeout(r, 40));

        // 2. Transmit in chunks of 48 rows with block reset (matches PeriPage internal buffer)
        const rowsPerChunk = 48;
        for (let y = 0; y < height; y += rowsPerChunk) {
            const rows = Math.min(rowsPerChunk, height - y);

            // PeriPage hardware requires reset immediately preceding each raster block
            await this.writeRaw(cmdReset);
            await new Promise(r => setTimeout(r, 20));

            // ESC/POS GS v 0 raster header for this block
            const header = new Uint8Array([
                0x1D, 0x76, 0x30, 0x00,
                bpr & 0xFF, (bpr >> 8) & 0xFF,
                rows & 0xFF, (rows >> 8) & 0xFF
            ]);
            await this.writeRaw(header);

            // Raster bytes for this chunk
            const chunkData = packed.subarray(y * bpr, (y + rows) * bpr);
            await this.writeRaw(chunkData);
        }

        // 3. Tear Feed: Fixed exactly 10mm (80 dots at 203 DPI) per user setting
        await this.writeRaw(cmdFeed(80));
    }
};

async function triggerBluetoothDirectPrint() {
    const labelEl = document.getElementById('printableLabel');
    if (!labelEl) return;

    if (typeof html2canvas === 'undefined') {
        alert('กรุณารอโหลดสคริปต์สักครู่ หรือรีเฟรชหน้าเว็บ');
        return;
    }

    const btn = document.getElementById('btnBtDirectPrint');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> <span>กำลังส่งพิมพ์บลูทูธ...</span>`;
    }

    try {
        if (!BluetoothThermalPrinter.isConnected || !BluetoothThermalPrinter.characteristic) {
            showInventorySyncToast(null, 'กำลังเปิดหน้าต่างเชื่อมต่อบลูทูธ...');
            await BluetoothThermalPrinter.connect();
        }

        showInventorySyncToast(null, 'กำลังเรนเดอร์ภาพฉลากความละเอียดสูง...');

        // PeriPage 57mm has 384 dots printhead width (203 DPI)
        const targetWidth = 384;
        const scale = targetWidth / labelEl.offsetWidth;

        const canvas = await html2canvas(labelEl, {
            scale: scale,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });

        showInventorySyncToast(null, 'กำลังส่งข้อมูลพิมพ์บลูทูธ...');
        await BluetoothThermalPrinter.printRasterImage(canvas);

        showInventorySyncToast(null, '✅ พิมพ์ออกเครื่องพิมพ์บลูทูธสำเร็จ! (ไม่มีลายน้ำ 100%)');
    } catch (err) {
        console.error('Bluetooth Print Error:', err);
        if (err.name === 'NotFoundError') {
            showInventorySyncToast(null, 'ยกเลิกการเลือกเครื่องพิมพ์');
        } else {
            alert('ไม่สามารถพิมพ์ผ่านบลูทูธได้: ' + (err.message || err) + '\n\n💡 แนะนำ: หากต้องการพิมพ์ทันทีโดยไม่ติดลายน้ำ สามารถกดปุ่ม "แชร์เข้าแอป PeriPage" ได้เช่นกัน (แอปแท้ PeriPage ฟรี 100%)');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function shareStickerToPeriPageApp() {
    const labelEl = document.getElementById('printableLabel');
    if (!labelEl) return;

    if (typeof html2canvas === 'undefined') {
        alert('กำลังโหลดระบบภาพ กรุณาลองใหม่อีกครั้ง');
        return;
    }

    const btn = document.getElementById('btnShareApp');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<div class="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent"></div> <span>เตรียมภาพ...</span>`;
    }

    try {
        const sku = (document.getElementById('formSku')?.value || 'STICKER').trim();
        const canvas = await html2canvas(labelEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });

        canvas.toBlob(async (blob) => {
            if (!blob) {
                alert('ไม่สามารถแปลงฉลากเป็นรูปภาพได้');
                return;
            }

            const fileName = `Label_${sku}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `ฉลากสินค้า ${sku}`,
                        text: 'พิมพ์ฉลากสินค้า S-Gyver ผ่านแอป PeriPage (ฟรี ไม่มีลายน้ำ)'
                    });
                    showInventorySyncToast(null, 'ส่งเข้าแอปสำเร็จ สั่งพิมพ์ได้ทันที!');
                } catch (shareErr) {
                    if (shareErr.name !== 'AbortError') {
                        downloadStickerImage(canvas, fileName);
                    }
                }
            } else {
                downloadStickerImage(canvas, fileName);
                alert('📱 บันทึกรูปภาพฉลากเรียบร้อยแล้ว!\n\nคุณสามารถเปิดรูปนี้ในแอป "PeriPage" ทางการเพื่อกดพิมพ์ได้เลย (แอปแท้ PeriPage ฟรี 100% และไม่มีลายน้ำแน่นอน)');
            }
        }, 'image/png');
    } catch (err) {
        console.error('Share Error:', err);
        alert('เกิดข้อผิดพลาดในการแชร์: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

function downloadStickerImage(canvas, fileName) {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

