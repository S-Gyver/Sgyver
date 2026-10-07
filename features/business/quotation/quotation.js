/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 🚀 S-GYVER QUOTATION STUDIO - CONTROLLER & LOGIC ENGINE
 * Terracotta Photo Receipt & Quotation Template + Image Upload + Thai BahtText
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ── 1. GLOBAL STATE & BLANK FORM TEMPLATE ──────────────────────────────────
function getTodayIsoDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getBlankQuotationState() {
    const today = getTodayIsoDate();
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30);
    const validUntilIso = validDate.toISOString().split('T')[0];

    return {
        docType: 'ใบเสนอราคา (Quotation)', // 'ใบเสนอราคา (Quotation)' | 'ใบเสร็จรับเงิน (Receipt)' | 'ใบแจ้งหนี้ (Invoice)'
        templateStyle: 'terracotta',         // 'terracotta' | 'classic'
        docNo: `QT-${y}${m}-${rand}`,
        date: today,
        validUntil: validUntilIso,
        status: 'DRAFT',                     // 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED'
        projectTitle: '',

        // Seller Info (Blank Form - Ready to fill)
        seller: {
            name: '',
            taxId: '',
            branch: 'สำนักงานใหญ่',
            address: '',
            phone: '',
            email: '',
            website: ''
        },

        // Client Info (Blank Form - Ready to fill)
        client: {
            name: '',
            contactPerson: '',
            taxId: '',
            branch: 'สำนักงานใหญ่',
            address: '',
            phone: '',
            email: ''
        },

        // Items List (Clean 1 row with photo upload + dimensions ready)
        items: [
            {
                name: '',
                img: null,
                dimWidth: '',
                dimLength: '',
                dimHeight: '',
                desc: '',
                qty: 1,
                unit: 'ชุด',
                price: 0,
                discount: 0
            }
        ],

        // Financials & Taxes
        discountAmount: 0,
        discountPercent: 0,
        vatType: 'none', // 'none' | 'exclusive' | 'inclusive'
        withholdingTaxRate: 0, // 0 | 1 | 2 | 3 (%)
        
        // Calculations
        subtotal: 0,
        netAfterDiscount: 0,
        vatAmount: 0,
        withholdingTaxAmount: 0,
        grandTotal: 0,
        bahtText: 'ศูนย์บาทถ้วน',

        // Terms & Signatures
        paymentTerms: '',
        bankAccount: '',
        deliveryDays: 0,
        notes: '',
        sellerSignName: '',
        sellerSignDate: today,
        sellerSignatureImg: null,
        clientSignName: '',
        clientSignDate: '',
        clientSignatureImg: null
    };
}

// ── OPTIONAL DEMO REFERENCE DATA (FOR PREVIEWING LAYOUT) ──────────────────────
const DEMO_QUOTATION_DATA = {
    docType: 'ใบเสร็จรับเงิน (Receipt)',
    templateStyle: 'terracotta',
    docNo: 'RC-256908-001',
    date: '2026-08-22',
    validUntil: '2026-09-22',
    status: 'APPROVED',
    projectTitle: 'Backdrop Discovery',
    seller: {
        name: 'ศรัศนันท์ ตราชู',
        taxId: '',
        branch: 'สำนักงานใหญ่',
        address: '222/56 ม.4 มบ.ลัดดาวิลล์1 ถ.บ้านกล้วย-ไทรน้อย ต.พิมลราช อ.บางบัวทอง จ.นนทบุรี 11110',
        phone: '085-849-8956',
        email: 's.gyver36@gmail.com',
        website: 'www.sgyver.io'
    },
    client: {
        name: 'โรงเรียนสาธิตสถาบันการจัดการปัญญาภิวัฒน์ (สำนักงานใหญ่)',
        contactPerson: 'ฝ่ายจัดซื้อและพัฒนาสื่อ',
        taxId: '0994001476136',
        branch: 'สำนักงานใหญ่',
        address: '45/23 ม.2 ถ.แจ้งวัฒนะ ต.บางตลาด อ.ปากเกร็ด จ.นนทบุรี 11120',
        phone: '02-855-0000',
        email: 'spim@pim.ac.th'
    },
    items: [
        {
            name: 'ฐาน X-STEM Racing Lab Backdrop',
            img: 'sample_items/backdrop_racing.png',
            dimWidth: '1 เมตร',
            dimLength: '3 เมตร',
            dimHeight: '2 เมตร',
            desc: '',
            qty: 1,
            unit: 'ชุด',
            price: 2000,
            discount: 0
        },
        {
            name: 'ฐาน X-Farm to Craft (ป้ายไม้ SPIM)',
            img: 'sample_items/farm_spim.png',
            dimWidth: '1 เมตร',
            dimLength: '3 เมตร',
            dimHeight: '2 เมตร',
            desc: '',
            qty: 1,
            unit: 'ชุด',
            price: 1000,
            discount: 0
        },
        {
            name: 'ฐาน X-Farm to Craft (ขาตั้งไม้ชิ้นงาน)',
            img: 'sample_items/farm_stand.png',
            dimWidth: '',
            dimLength: '',
            dimHeight: '',
            desc: '',
            qty: 150,
            unit: 'ชิ้น',
            price: 20,
            discount: 0
        }
    ],
    discountAmount: 0,
    vatType: 'none',
    withholdingTaxRate: 0,
    paymentTerms: '• ชำระเงินครบถ้วนเมื่อส่งมอบงานเรียบร้อย',
    bankAccount: 'ธนาคารกสิกรไทย (KBANK)\nเลขที่บัญชี: 123-4-56789-0\nชื่อบัญชี: ศรัศนันท์ ตราชู',
    deliveryDays: 0,
    notes: 'ส่งมอบงานพร้อมติดตั้งเรียบร้อย',
    sellerSignName: 'ศรัศนันท์ ตราชู',
    sellerSignDate: '2026-08-22'
};

const STATE = {
    currentTab: 'editor', // 'editor' | 'list'
    currentQuoteId: null,
    quotation: getBlankQuotationState(),
    quotationsList: [],
    zoomLevel: 1.0
};

function loadDemoSample() {
    if (confirm('ต้องการโหลด "ข้อมูลตัวอย่าง (Demo)" เพื่อดูรูปแบบใบเสนอราคา/ใบเสร็จใช่หรือไม่?\n(ข้อมูลที่คุณกรอกอยู่ปัจจุบันจะถูกแทนที่ด้วยข้อมูลตัวอย่าง)')) {
        STATE.quotation = JSON.parse(JSON.stringify(DEMO_QUOTATION_DATA));
        populateFormFromState();
        recalculateFinancials();
        if (typeof showToast === 'function') {
            showToast('info', 'โหลดตัวอย่างสำเร็จ', 'แสดงรูปแบบตัวอย่างพร้อมรูปภาพและขนาดแล้ว', 2500);
        }
    }
}

function clearFormToBlank(askConfirm = true) {
    if (askConfirm && !confirm('ต้องการล้างฟอร์มทั้งหมดเพื่อเริ่มกรอกเอกสารใหม่ใช่หรือไม่?')) {
        return;
    }
    STATE.quotation = getBlankQuotationState();
    populateFormFromState();
    recalculateFinancials();
    if (typeof showToast === 'function') {
        showToast('success', 'ล้างฟอร์มแล้ว', 'ฟอร์มว่างเปล่าพร้อมให้คุณกรอกข้อมูลได้เลย', 2000);
    }
}

// ── 2. PRESET CATALOG ITEMS ──────────────────────────────────────────────────
const GYVER_CATALOG = [
    {
        name: 'ฐาน X-STEM Racing Lab Backdrop',
        img: 'sample_items/backdrop_racing.png',
        dimWidth: '1 เมตร',
        dimLength: '3 เมตร',
        dimHeight: '2 เมตร',
        unit: 'ชุด',
        price: 2000
    },
    {
        name: 'ฐาน X-Farm to Craft (ป้ายไม้ SPIM)',
        img: 'sample_items/farm_spim.png',
        dimWidth: '1 เมตร',
        dimLength: '3 เมตร',
        dimHeight: '2 เมตร',
        unit: 'ชุด',
        price: 1000
    },
    {
        name: 'ฐาน X-Farm to Craft (ขาตั้งไม้ชิ้นงาน)',
        img: 'sample_items/farm_stand.png',
        dimWidth: '',
        dimLength: '',
        dimHeight: '',
        unit: 'ชิ้น',
        price: 20
    },
    {
        name: 'แขนกลหุ่นยนต์ Arm Robot 4-DOF พร้อมชุดควบคุม WiFi / Bluetooth',
        img: null,
        dimWidth: '35 ซม.',
        dimLength: '45 ซม.',
        dimHeight: '50 ซม.',
        unit: 'ชุด',
        price: 15900
    },
    {
        name: 'คอร์สอบรมเชิงปฏิบัติการ Robotic & Automation Systems (2 วัน)',
        img: null,
        dimWidth: '',
        dimLength: '',
        dimHeight: '',
        unit: 'คอร์ส',
        price: 8500
    }
];

// ── 3. THAI BAHT TEXT CONVERTER (ALGORITHM) ──────────────────────────────────
function thaiBahtText(number) {
    if (isNaN(number) || number === null || number === '') return 'ศูนย์บาทถ้วน';
    number = parseFloat(number);
    if (number === 0) return 'ศูนย์บาทถ้วน';

    const textNum = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const textUnit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    // Split Integer and Satang
    const strNum = number.toFixed(2).split('.');
    let intPart = strNum[0];
    let decPart = strNum[1];

    function convertGroup(group) {
        let result = '';
        const len = group.length;
        for (let i = 0; i < len; i++) {
            const digit = parseInt(group.charAt(i), 10);
            const unitPos = len - i - 1;
            if (digit !== 0) {
                if (unitPos === 0 && digit === 1 && len > 1 && parseInt(group.charAt(i - 1), 10) !== 0) {
                    result += 'เอ็ด';
                } else if (unitPos === 1 && digit === 1) {
                    result += 'สิบ';
                } else if (unitPos === 1 && digit === 2) {
                    result += 'ยี่สิบ';
                } else {
                    result += textNum[digit] + (unitPos === 1 ? '' : textUnit[unitPos]);
                    if (unitPos === 1) result += 'สิบ';
                }
            }
        }
        return result;
    }

    let bahtText = '';
    // Support over millions
    if (intPart.length > 6) {
        const millionPart = intPart.substring(0, intPart.length - 6);
        intPart = intPart.substring(intPart.length - 6);
        bahtText += convertGroup(millionPart) + 'ล้าน';
    }
    bahtText += convertGroup(intPart);
    if (bahtText !== '') bahtText += 'บาท';

    // Decimals / Satang
    if (decPart === '00') {
        bahtText += 'ถ้วน';
    } else {
        let satangText = '';
        const d1 = parseInt(decPart.charAt(0), 10);
        const d2 = parseInt(decPart.charAt(1), 10);
        if (d1 === 1) satangText += 'สิบ';
        else if (d1 === 2) satangText += 'ยี่สิบ';
        else if (d1 > 2) satangText += textNum[d1] + 'สิบ';

        if (d2 === 1 && d1 !== 0) satangText += 'เอ็ด';
        else if (d2 > 0) satangText += textNum[d2];

        bahtText += satangText + 'สตางค์';
    }

    return bahtText;
}

// ── 4. INITIALIZATION ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initDefaultDocumentNo();
    initThaiDatePickers();
    renderCatalogPills();
    populateFormFromState();
    recalculateFinancials();
    loadQuotationsFromStorage();
    initSavedProfiles();

    // Check if URL has query ?id=...
    const urlParams = new URLSearchParams(window.location.search);
    const quoteId = urlParams.get('id');
    if (quoteId) {
        loadQuotationById(quoteId);
    }

    // Check if coming from Shopee Orders with prefill data
    if (urlParams.get('from_shopee')) {
        try {
            const rawPrefill = localStorage.getItem('sgyver_prefill_quotation');
            if (rawPrefill) {
                const prefillData = JSON.parse(rawPrefill);
                Object.assign(STATE.quotation, prefillData);
                populateFormFromState();
                recalculateFinancials();
                if (typeof showToast === 'function') {
                    showToast('success', 'ดึงข้อมูลคำสั่งซื้อ Shopee แล้ว', `สร้างใบเสร็จสำหรับ ${prefillData.docNo} เรียบร้อย`, 2500);
                }
                localStorage.removeItem('sgyver_prefill_quotation');
            }
        } catch (e) {}
    }

    // Auto-fit A4 preview to fit nicely inside the narrowed preview pane
    setTimeout(fitZoomToPreviewPane, 150);
    window.addEventListener('resize', fitZoomToPreviewPane);
});

function initDefaultDocumentNo() {
    if (!STATE.quotation.docNo) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const rand = String(Math.floor(1000 + Math.random() * 9000));
        STATE.quotation.docNo = `QT-${y}${m}-${rand}`;

        // Default valid until 30 days
        const validDate = new Date();
        validDate.setDate(validDate.getDate() + 30);
        STATE.quotation.validUntil = validDate.toISOString().split('T')[0];
    }
}

// ── 5. FORM POPULATION & EVENT HANDLERS ──────────────────────────────────────
function populateFormFromState() {
    const q = STATE.quotation;

    // Doc meta & template
    setVal('form-doc-type', q.docType || 'ใบเสร็จรับเงิน (Receipt)');
    setVal('form-template-style', q.templateStyle || 'terracotta');
    setVal('form-doc-no', q.docNo);
    setVal('form-doc-date', q.date);
    setVal('form-doc-valid', q.validUntil);
    setVal('form-doc-status', q.status);
    setVal('form-project-title', q.projectTitle || '');

    // Seller
    setVal('form-seller-name', q.seller.name);
    setVal('form-seller-tax', q.seller.taxId || '');
    setVal('form-seller-branch', q.seller.branch || '');
    setVal('form-seller-phone', q.seller.phone);
    setVal('form-seller-email', q.seller.email);
    setVal('form-seller-address', q.seller.address);

    // Client
    setVal('form-client-name', q.client.name);
    setVal('form-client-person', q.client.contactPerson || '');
    setVal('form-client-tax', q.client.taxId || '');
    setVal('form-client-branch', q.client.branch || '');
    setVal('form-client-phone', q.client.phone || '');
    setVal('form-client-email', q.client.email || '');
    setVal('form-client-address', q.client.address);

    // Terms
    setVal('form-payment-terms', q.paymentTerms || '');
    setVal('form-bank-account', q.bankAccount || '');
    setVal('form-delivery-days', q.deliveryDays || 0);
    setVal('form-notes', q.notes || '');
    setVal('form-seller-sign-name', q.sellerSignName || '');
    setVal('form-seller-sign-date', q.sellerSignDate || '');

    // Financials Settings
    setVal('form-discount-amount', q.discountAmount || 0);
    setVal('form-vat-type', q.vatType || 'none');
    setVal('form-wht-rate', q.withholdingTaxRate || 0);

    renderEditorItemsTable();
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

// ── 6. CATALOG & ITEMS MANAGEMENT ───────────────────────────────────────────
function renderCatalogPills() {
    const container = document.getElementById('catalog-pills');
    if (!container) return;

    container.innerHTML = GYVER_CATALOG.map((cat, idx) => `
        <button type="button" class="catalog-pill" onclick="addCatalogItem(${idx})">
            <i class="bi bi-plus-circle me-1"></i>${cat.name}
        </button>
    `).join('');
}

function addCatalogItem(catalogIndex) {
    const cat = GYVER_CATALOG[catalogIndex];
    if (!cat) return;

    STATE.quotation.items.push({
        name: cat.name,
        img: cat.img || null,
        dimWidth: cat.dimWidth || '',
        dimLength: cat.dimLength || '',
        dimHeight: cat.dimHeight || '',
        desc: cat.desc || '',
        qty: 1,
        unit: cat.unit,
        price: cat.price,
        discount: 0
    });

    renderEditorItemsTable();
    recalculateFinancials();
    if (typeof showToast === 'function') showToast('info', 'เพิ่มรายการแล้ว', cat.name, 1500);
}

function addNewItemRow() {
    STATE.quotation.items.push({
        name: '',
        img: null,
        dimWidth: '',
        dimLength: '',
        dimHeight: '',
        desc: '',
        qty: 1,
        unit: 'ชุด',
        price: 0,
        discount: 0
    });
    renderEditorItemsTable();
    recalculateFinancials();
}

function deleteItemRow(index) {
    if (STATE.quotation.items.length <= 1) {
        if (typeof showToast === 'function') showToast('warning', 'คำเตือน', 'เอกสารต้องมีอย่างน้อย 1 รายการ', 2000);
        return;
    }
    STATE.quotation.items.splice(index, 1);
    renderEditorItemsTable();
    recalculateFinancials();
}

// ── 📸 IMAGE UPLOAD HANDLER FOR ITEMS ──
function handleItemImageUpload(index, event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        if (typeof showToast === 'function') showToast('error', 'ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)', 2500);
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        if (STATE.quotation.items[index]) {
            STATE.quotation.items[index].img = e.target.result;
            renderEditorItemsTable();
            recalculateFinancials();
            if (typeof showToast === 'function') showToast('success', 'อัปโหลดรูปแล้ว', 'เพิ่มรูปภาพลงในรายการเรียบร้อย', 1500);
        }
    };
    reader.readAsDataURL(file);
}

function removeItemImage(index) {
    if (STATE.quotation.items[index]) {
        STATE.quotation.items[index].img = null;
        renderEditorItemsTable();
        recalculateFinancials();
    }
}

function renderEditorItemsTable() {
    const tbody = document.getElementById('editor-items-tbody');
    if (!tbody) return;

    tbody.innerHTML = STATE.quotation.items.map((item, index) => {
        const hasImg = !!item.img;
        return `
            <tr class="editor-item-row" data-index="${index}">
                <td style="width: 32px; text-align: center; color: var(--text-muted); font-size: 0.85rem; vertical-align: top; padding-top: 12px;">
                    ${index + 1}
                </td>
                <td>
                    <!-- Item Title (Supports multiline Enter) -->
                    <textarea class="qt-form-textarea mb-1 fw-bold" rows="1" 
                              placeholder="ชื่อรายการสินค้าหรือบริการ (กด Enter เพื่อขึ้นบรรทัดใหม่ได้)" 
                              style="min-height: 38px; resize: vertical; font-size: 0.88rem; line-height: 1.4;"
                              oninput="updateItemField(${index}, 'name', this.value); autoGrowTextarea(this);">${escapeHtml(item.name || '')}</textarea>
                    
                    <!-- 📸 Photo Uploader Block -->
                    <div class="editor-photo-uploader">
                        <input type="file" id="item-file-${index}" accept="image/*" class="d-none" onchange="handleItemImageUpload(${index}, event)">
                        
                        ${hasImg ? `
                            <img src="${item.img}" class="editor-photo-preview" alt="Preview">
                            <button type="button" class="btn-upload-photo" onclick="document.getElementById('item-file-${index}').click()">
                                <i class="bi bi-arrow-repeat"></i> เปลี่ยนรูป
                            </button>
                            <button type="button" class="btn-remove-photo" onclick="removeItemImage(${index})">
                                <i class="bi bi-x-circle-fill"></i> ลบรูป
                            </button>
                        ` : `
                            <button type="button" class="btn-upload-photo" onclick="document.getElementById('item-file-${index}').click()">
                                <i class="bi bi-camera-fill"></i> อัปโหลดรูปภาพ
                            </button>
                            <input type="text" class="editor-specs-input flex-grow-1" placeholder="หรือวางลิงก์รูปภาพ (Image URL)"
                                   value="${item.img && !item.img.startsWith('data:') ? escapeHtml(item.img) : ''}" 
                                   onchange="updateItemField(${index}, 'img', this.value)">
                        `}
                    </div>

                    <!-- Dimensions Fields (กว้าง, ยาว, สูง) -->
                    <div class="editor-specs-row">
                        <input type="text" class="editor-specs-input" placeholder="กว้าง เช่น 1 เมตร" 
                               value="${escapeHtml(item.dimWidth || '')}" oninput="updateItemField(${index}, 'dimWidth', this.value)">
                        <input type="text" class="editor-specs-input" placeholder="ยาว เช่น 3 เมตร" 
                               value="${escapeHtml(item.dimLength || '')}" oninput="updateItemField(${index}, 'dimLength', this.value)">
                        <input type="text" class="editor-specs-input" placeholder="สูง เช่น 2 เมตร" 
                               value="${escapeHtml(item.dimHeight || '')}" oninput="updateItemField(${index}, 'dimHeight', this.value)">
                    </div>

                    <!-- Freeform Specs/Desc (Supports multiline Enter) -->
                    <textarea class="qt-form-textarea text-secondary mt-1" rows="2" 
                              style="min-height: 52px; resize: vertical; font-size: 0.8rem; line-height: 1.5;" 
                              placeholder="รายละเอียดเพิ่มเติม / สเปก / คุณสมบัติ (กด Enter เพื่อขึ้นบรรทัดใหม่ได้)" 
                              oninput="updateItemField(${index}, 'desc', this.value); autoGrowTextarea(this);">${escapeHtml(item.desc || '')}</textarea>
                </td>
                <td style="width: 75px; min-width: 75px; vertical-align: top; padding-top: 10px;">
                    <input type="number" min="1" class="qt-form-input text-center item-qty-input" 
                           value="${item.qty}" oninput="updateItemField(${index}, 'qty', this.value)">
                </td>
                <td style="width: 80px; min-width: 80px; vertical-align: top; padding-top: 10px;">
                    <input type="text" class="qt-form-input text-center item-unit-input" 
                           value="${escapeHtml(item.unit)}" oninput="updateItemField(${index}, 'unit', this.value)">
                </td>
                <td style="width: 125px; min-width: 125px; vertical-align: top; padding-top: 10px;">
                    <input type="number" step="any" class="qt-form-input text-end font-mono item-price-input" 
                           value="${item.price}" oninput="updateItemField(${index}, 'price', this.value)">
                </td>
                <td style="width: 40px; text-align: center; vertical-align: top; padding-top: 12px;">
                    <button type="button" class="btn-delete-row" title="ลบรายการ" onclick="deleteItemRow(${index})">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateItemField(index, field, value) {
    if (!STATE.quotation.items[index]) return;
    if (field === 'qty' || field === 'price' || field === 'discount') {
        STATE.quotation.items[index][field] = parseFloat(value) || 0;
    } else {
        STATE.quotation.items[index][field] = value;
    }
    recalculateFinancials();
}

function autoGrowTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 36) + 'px';
}

// ── 7. FINANCIAL RE-CALCULATION & LIVE A4 SYNC ──────────────────────────────
function syncFromFormToState() {
    const q = STATE.quotation;

    q.docType = getVal('form-doc-type') || q.docType;
    q.templateStyle = getVal('form-template-style') || q.templateStyle;
    q.docNo = getVal('form-doc-no') || q.docNo;
    q.date = getVal('form-doc-date') || q.date;
    q.validUntil = getVal('form-doc-valid') || q.validUntil;
    q.status = getVal('form-doc-status') || q.status;
    q.projectTitle = getVal('form-project-title') || '';

    // Seller
    q.seller.name = getVal('form-seller-name');
    q.seller.taxId = getVal('form-seller-tax');
    q.seller.branch = getVal('form-seller-branch');
    q.seller.phone = getVal('form-seller-phone');
    q.seller.email = getVal('form-seller-email');
    q.seller.address = getVal('form-seller-address');

    // Client
    q.client.name = getVal('form-client-name');
    q.client.contactPerson = getVal('form-client-person');
    q.client.taxId = getVal('form-client-tax');
    q.client.branch = getVal('form-client-branch');
    q.client.phone = getVal('form-client-phone');
    q.client.email = getVal('form-client-email');
    q.client.address = getVal('form-client-address');

    // Terms
    q.paymentTerms = getVal('form-payment-terms');
    q.bankAccount = getVal('form-bank-account');
    q.deliveryDays = parseInt(getVal('form-delivery-days'), 10) || 0;
    q.notes = getVal('form-notes');
    q.sellerSignName = getVal('form-seller-sign-name');
    q.sellerSignDate = getVal('form-seller-sign-date');

    // Financial inputs
    q.discountAmount = parseFloat(getVal('form-discount-amount')) || 0;
    q.vatType = getVal('form-vat-type') || 'none';
    q.withholdingTaxRate = parseFloat(getVal('form-wht-rate')) || 0;
}

function recalculateFinancials() {
    syncFromFormToState();
    const q = STATE.quotation;

    // 1. Calculate Items Subtotal
    let subtotal = 0;
    q.items.forEach(item => {
        const itemLineTotal = (item.qty * item.price) - (item.discount || 0);
        subtotal += itemLineTotal;
    });
    q.subtotal = subtotal;

    // 2. Discount
    let net = Math.max(0, subtotal - (q.discountAmount || 0));
    q.netAfterDiscount = net;

    // 3. VAT
    let vatAmount = 0;
    let grandTotal = net;

    if (q.vatType === 'exclusive') {
        vatAmount = net * 0.07;
        grandTotal = net + vatAmount;
    } else if (q.vatType === 'inclusive') {
        vatAmount = net - (net / 1.07);
        grandTotal = net;
    } else {
        vatAmount = 0;
        grandTotal = net;
    }
    q.vatAmount = vatAmount;

    // 4. Withholding Tax (WHT)
    let whtAmount = 0;
    if (q.withholdingTaxRate > 0) {
        whtAmount = (net * q.withholdingTaxRate) / 100;
    }
    q.withholdingTaxAmount = whtAmount;
    q.grandTotal = Math.max(0, grandTotal - whtAmount);

    // 5. Thai BahtText
    q.bahtText = thaiBahtText(q.grandTotal);

    // Update Live A4 Sheet
    updateLiveA4Sheet();
}

function updateLiveA4Sheet() {
    // Reset image cache to ensure fresh render on changes
    cachedQuotationImageBlob = null;
    cachedQuotationImageDataUrl = null;

    const q = STATE.quotation;
    const a4Sheet = document.getElementById('a4-sheet');
    const isTerracotta = (q.templateStyle !== 'classic');

    if (a4Sheet) {
        a4Sheet.className = isTerracotta ? 'a4-sheet theme-terracotta' : 'a4-sheet theme-classic';
    }

    // Toggle template views
    const terracottaView = document.getElementById('a4-terracotta-view');
    const classicView = document.getElementById('a4-classic-view');

    if (isTerracotta) {
        if (terracottaView) terracottaView.style.display = 'block';
        if (classicView) classicView.style.display = 'none';
        renderTerracottaA4View(q);
    } else {
        if (terracottaView) terracottaView.style.display = 'none';
        if (classicView) classicView.style.display = 'block';
        renderClassicA4View(q);
    }

    // Watermark removed as per user request
    const watermark = document.getElementById('a4-watermark');
    if (watermark) {
        watermark.textContent = '';
        watermark.style.display = 'none';
    }

    // Update Thai date helper badges under form inputs
    if (typeof updateDateHelperBadges === 'function') {
        updateDateHelperBadges();
    }
}

// ── 🎨 RENDER TERRACOTTA THEME WITH PHOTOS (MATCHING USER REFERENCE) ──
function renderTerracottaA4View(q) {
    // Title
    setText('tc-doc-title', q.docType || 'ใบเสนอราคา (Quotation)');

    // Header Grid (Left)
    setText('tc-seller-name', q.seller.name || '— (ระบุชื่อผู้เสนอราคา / ร้านค้า) —');
    setText('tc-seller-address', q.seller.address || '—');
    setText('tc-client-name', q.client.name || '— (ระบุชื่อลูกค้า / หน่วยงานผู้รับ) —');
    setText('tc-client-address', q.client.address || '—');
    setText('tc-client-tax', q.client.taxId || '—');

    // Header Grid (Right)
    setText('tc-seller-phone', q.seller.phone || '—');
    setText('tc-seller-email', q.seller.email || '—');
    setText('tc-doc-date', formatDateCustom(q.date));
    setText('tc-project-title', q.projectTitle || '—');

    // Items Table Body
    const tbody = document.getElementById('tc-items-tbody');
    if (tbody) {
        tbody.innerHTML = q.items.map((item, idx) => {
            const lineTotal = (item.qty * item.price) - (item.discount || 0);
            
            // Build specs HTML
            let specsHtml = '';
            if (item.dimWidth) specsHtml += `<div>กว้าง : ${escapeHtml(item.dimWidth)}</div>`;
            if (item.dimLength) specsHtml += `<div>ยาว : ${escapeHtml(item.dimLength)}</div>`;
            if (item.dimHeight) specsHtml += `<div>สูง : ${escapeHtml(item.dimHeight)}</div>`;
            if (item.desc) specsHtml += `<div style="white-space:pre-line;">${escapeHtml(item.desc)}</div>`;

            const hasVisual = !!item.img || !!specsHtml;
            const isNameEmpty = !item.name;

            return `
                <tr>
                    <td class="text-center" style="width: 48px;">
                        <div class="receipt-item-idx">${idx + 1}.</div>
                    </td>
                    <td>
                        <div class="item-title-terracotta" style="${isNameEmpty ? 'color: #94a3b8; font-style: italic;' : ''}">${escapeHtml(item.name ? item.name.trim() : '— (ระบุชื่อรายการสินค้า / บริการ) —')}</div>
                        ${hasVisual ? `
                            <div class="item-visual-block">
                                ${item.img ? `<img src="${item.img}" class="item-thumbnail-img" alt="${escapeHtml(item.name || 'item')}">` : ''}
                                ${specsHtml ? `<div class="item-specs-list">${specsHtml}</div>` : ''}
                            </div>
                        ` : ''}
                    </td>
                    <td class="text-center font-mono" style="width: 75px;">
                        <div class="receipt-item-val">${item.qty || 1}</div>
                    </td>
                    <td class="text-center font-mono" style="width: 100px;">
                        <div class="receipt-item-val">${formatCurrencySuffix(item.price)}</div>
                    </td>
                    <td class="text-center font-mono fw-bold" style="width: 110px;">
                        <div class="receipt-item-val fw-bold">${formatCurrencySuffix(lineTotal)}</div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Totals Table (Matching user reference)
    setText('tc-subtotal', formatCurrencySuffix(q.subtotal));
    setText('tc-baht-text', q.bahtText || 'ศูนย์บาทถ้วน');

    const whtRow = document.getElementById('tc-wht-row');
    if (whtRow) {
        if (q.withholdingTaxRate > 0) {
            setText('tc-wht-rate', `(${q.withholdingTaxRate}%)`);
            setText('tc-wht-amount', `-${formatCurrencySuffix(q.withholdingTaxAmount)}`);
        } else {
            setText('tc-wht-rate', '');
            setText('tc-wht-amount', '');
        }
    }

    setText('tc-grand-total', formatCurrencySuffix(q.grandTotal));

    // Footer Terms & Bank Account
    const termsArr = [];
    if (q.paymentTerms) termsArr.push(q.paymentTerms);
    if (q.bankAccount) termsArr.push(q.bankAccount);
    if (q.notes) termsArr.push(`หมายเหตุ: ${q.notes}`);
    if (q.deliveryDays) termsArr.push(`กำหนดส่งมอบงาน: ภายใน ${q.deliveryDays} วัน`);
    
    setText('tc-terms-content', termsArr.join('\n') || '—');

    // Signature Date
    setText('tc-sig-date-text', q.date ? formatDateCustom(q.date) : '');
}

// ── 📄 RENDER CLASSIC BLUE THEME ──
function renderClassicA4View(q) {
    setText('a4-doc-no', q.docNo);
    setText('a4-doc-date', formatDateThai(q.date));
    setText('a4-doc-valid', formatDateThai(q.validUntil));
    setText('a4-seller-name', q.seller.name);
    setText('a4-seller-tax', q.seller.taxId ? `เลขประจำตัวผู้เสียภาษี: ${q.seller.taxId}` : '');
    setText('a4-seller-address', q.seller.address);
    setText('a4-seller-contact', `โทร: ${q.seller.phone} | อีเมล: ${q.seller.email}`);

    setText('a4-client-name', q.client.name || '— ยังไม่ได้ระบุชื่อลูกค้า —');
    setText('a4-client-tax', q.client.taxId ? `เลขผู้เสียภาษี: ${q.client.taxId}` : '');
    setText('a4-client-address', q.client.address || '—');
    setText('a4-client-contact', [q.client.phone ? `โทร: ${q.client.phone}` : '', q.client.email ? `อีเมล: ${q.client.email}` : ''].filter(Boolean).join(' | '));

    const tbody = document.getElementById('a4-items-tbody');
    if (tbody) {
        tbody.innerHTML = q.items.map((item, idx) => {
            const lineTotal = (item.qty * item.price) - (item.discount || 0);
            return `
                <tr>
                    <td class="text-center" style="width: 38px;">${idx + 1}</td>
                    <td>
                        <div class="item-title">${escapeHtml(item.name || '—')}</div>
                        ${item.img ? `<img src="${item.img}" style="max-height: 60px; max-width: 90px; border-radius: 4px; margin-top: 4px; display: block;" alt="thumb">` : ''}
                        ${item.desc ? `<div class="item-desc">${escapeHtml(item.desc)}</div>` : ''}
                    </td>
                    <td class="text-center" style="width: 60px;">${item.qty}</td>
                    <td class="text-center" style="width: 60px;">${escapeHtml(item.unit || 'ชุด')}</td>
                    <td class="text-right font-mono" style="width: 95px;">${formatCurrency(item.price)}</td>
                    <td class="text-right font-mono" style="width: 105px;"><strong>${formatCurrency(lineTotal)}</strong></td>
                </tr>
            `;
        }).join('');
    }

    setText('a4-subtotal', formatCurrency(q.subtotal));
    setText('a4-grand-total', formatCurrency(q.grandTotal));
    setText('a4-baht-text', `(${q.bahtText})`);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// ── 8. DATA PERSISTENCE (SUPABASE + LOCALSTORAGE FALLBACK) ──────────────────
async function saveQuotation() {
    recalculateFinancials();
    const q = STATE.quotation;
    q.updatedAt = new Date().toISOString();

    let cloudSaved = false;

    // Auto-save client and seller profiles
    if (typeof autoSaveProfilesFromCurrentQuotation === 'function') {
        autoSaveProfilesFromCurrentQuotation();
    }

    // 1. Always save to LocalStorage first (instant & reliable)
    saveToLocalStorage(q);

    // 2. Try Supabase Cloud
    if (window.supabaseClient) {
        try {
            const payload = {
                doc_no: q.docNo,
                date: q.date,
                valid_until: q.validUntil,
                status: q.status,
                project_title: q.projectTitle,
                client_name: q.client.name,
                client_data: q.client,
                seller_data: q.seller,
                items: q.items,
                subtotal: q.subtotal,
                discount_amount: q.discountAmount,
                vat_amount: q.vatAmount,
                wht_amount: q.withholdingTaxAmount,
                grand_total: q.grandTotal,
                baht_text: q.bahtText,
                payment_terms: q.paymentTerms,
                bank_account: q.bankAccount,
                notes: q.notes,
                seller_sign_name: q.sellerSignName,
                client_sign_name: q.clientSignName,
                updated_at: q.updatedAt
            };

            const { data, error } = await window.supabaseClient
                .from('quotations')
                .upsert([payload], { onConflict: 'doc_no' });

            if (!error) {
                cloudSaved = true;
                console.log('[Supabase] Saved successfully to Cloud:', q.docNo);
            } else {
                console.warn('[Supabase Save Notice]:', error.message || error);
            }
        } catch (e) {
            console.warn('[Supabase save exception]:', e);
        }
    }

    if (cloudSaved) {
        if (typeof showToast === 'function') {
            showToast('success', 'บันทึกสำเร็จ (Cloud + ในเครื่อง)', `${q.docType} ${q.docNo} บันทึกออนไลน์และในเครื่องแล้ว`, 2500);
        } else {
            alert(`บันทึก ${q.docType} ${q.docNo} บน Cloud และในเครื่องเรียบร้อย`);
        }
    } else {
        if (typeof showToast === 'function') {
            showToast('info', 'บันทึกในเครื่องแล้ว (LocalStorage)', `${q.docType} ${q.docNo} บันทึกในเครื่องเรียบร้อย (ยังไม่ได้สร้างตารางใน Cloud)`, 3000);
        } else {
            alert(`บันทึก ${q.docType} ${q.docNo} ในเครื่องเรียบร้อย (LocalStorage)`);
        }
    }

    loadQuotationsFromStorage();
}

function saveToLocalStorage(q) {
    let list = getLocalStorageQuotations();
    const existingIndex = list.findIndex(item => item.docNo === q.docNo);
    if (existingIndex >= 0) {
        list[existingIndex] = JSON.parse(JSON.stringify(q));
    } else {
        list.unshift(JSON.parse(JSON.stringify(q)));
    }
    localStorage.setItem('sgyver_quotations', JSON.stringify(list));
}

function getLocalStorageQuotations() {
    try {
        const raw = localStorage.getItem('sgyver_quotations');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

async function loadQuotationsFromStorage() {
    let list = [];

    // 1. Load LocalStorage first for instant rendering
    const localList = getLocalStorageQuotations();
    list = [...localList];
    STATE.quotationsList = list;
    renderQuotationsListTable();
    updateDashboardStats();
    if (typeof autoHarvestProfilesFromQuotations === 'function') {
        autoHarvestProfilesFromQuotations();
    }

    // 2. Fetch and merge from Supabase if online and available
    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient
                .from('quotations')
                .select('*')
                .order('updated_at', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
                const remoteList = data.map(row => ({
                    docType: row.doc_type || 'ใบเสนอราคา (Quotation)',
                    templateStyle: row.template_style || 'terracotta',
                    docNo: row.doc_no,
                    date: row.date,
                    validUntil: row.valid_until,
                    status: row.status || 'DRAFT',
                    projectTitle: row.project_title,
                    client: row.client_data || { name: row.client_name },
                    seller: row.seller_data || {},
                    items: row.items || [],
                    subtotal: parseFloat(row.subtotal) || 0,
                    discountAmount: parseFloat(row.discount_amount) || 0,
                    vatAmount: parseFloat(row.vat_amount) || 0,
                    withholdingTaxAmount: parseFloat(row.wht_amount) || 0,
                    grandTotal: parseFloat(row.grand_total) || 0,
                    bahtText: row.baht_text,
                    paymentTerms: row.payment_terms,
                    bankAccount: row.bank_account,
                    notes: row.notes,
                    sellerSignName: row.seller_sign_name,
                    clientSignName: row.client_sign_name,
                    updatedAt: row.updated_at
                }));

                // Merge remote & local by docNo
                const map = new Map();
                remoteList.forEach(item => map.set(item.docNo, item));
                localList.forEach(item => {
                    if (!map.has(item.docNo)) {
                        map.set(item.docNo, item);
                    }
                });

                STATE.quotationsList = Array.from(map.values());
                renderQuotationsListTable();
                updateDashboardStats();
                if (typeof autoHarvestProfilesFromQuotations === 'function') {
                    autoHarvestProfilesFromQuotations();
                }
            } else if (error) {
                console.warn('[Supabase load info]:', error.message || error);
            }
        } catch (e) {
            console.warn('[Supabase load exception]:', e);
        }
    }
}

function renderQuotationsListTable() {
    const tbody = document.getElementById('quotations-list-tbody');
    if (!tbody) return;

    if (STATE.quotationsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-file-earmark-text fs-1 d-block mb-2 text-secondary"></i>
                    ยังไม่มีเอกสารในระบบ กดสร้างเอกสารใหม่ได้เลย
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = STATE.quotationsList.map(q => `
        <tr>
            <td class="font-mono fw-bold text-cyan">${q.docNo}</td>
            <td>
                <div class="fw-bold text-white">${escapeHtml(q.client?.name || 'ไม่ระบุชื่อ')}</div>
                ${q.projectTitle ? `<small class="text-secondary">${escapeHtml(q.projectTitle)}</small>` : ''}
            </td>
            <td class="text-secondary">${formatDateThai(q.date)}</td>
            <td class="text-secondary">${formatDateThai(q.validUntil)}</td>
            <td class="font-mono text-end fw-bold text-emerald">${formatCurrencySuffix(q.grandTotal)}</td>
            <td>
                <span class="badge-status badge-${(q.status || 'DRAFT').toLowerCase()}">
                    ● ${getStatusLabel(q.status)}
                </span>
            </td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-1">
                    <button class="btn btn-sm btn-outline-info" title="แก้ไข/ดูเอกสาร" onclick="loadQuotationById('${q.docNo}')">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-light" title="พิมพ์/PDF" onclick="printQuotationDirectly('${q.docNo}')">
                        <i class="bi bi-printer-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success text-success" title="ส่งเข้า LINE" onclick="sendToLine('${q.docNo}')" style="border-color: #06C755; color: #06C755 !important;">
                        <i class="bi bi-line"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" title="คัดลอกลิงก์ให้ลูกค้า" onclick="copyClientApprovalLink('${q.docNo}')">
                        <i class="bi bi-link-45deg"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="ลบ" onclick="deleteQuotation('${q.docNo}')">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateDashboardStats() {
    const list = STATE.quotationsList || [];
    const totalCount = list.length;
    const approvedList = list.filter(q => q.status === 'APPROVED');
    const approvedCount = approvedList.length;

    const totalOfferedValue = list.reduce((sum, q) => sum + (parseFloat(q.grandTotal) || 0), 0);
    const totalApprovedValue = approvedList.reduce((sum, q) => sum + (parseFloat(q.grandTotal) || 0), 0);

    setText('stat-total-count', totalCount);
    setText('stat-total-value', formatCurrencySuffix(totalOfferedValue));
    setText('stat-approved-count', approvedCount);
    setText('stat-approved-value', formatCurrencySuffix(totalApprovedValue));
}

function loadQuotationById(docNo) {
    const found = STATE.quotationsList.find(q => q.docNo === docNo);
    if (!found) {
        if (typeof showToast === 'function') showToast('error', 'ไม่พบเอกสาร', `ไม่พบเอกสารเลขที่ ${docNo}`, 2000);
        return;
    }

    STATE.quotation = JSON.parse(JSON.stringify(found));
    populateFormFromState();
    recalculateFinancials();
    switchTab('editor');

    if (typeof showToast === 'function') {
        showToast('info', 'โหลดเอกสารแล้ว', `เปิดเอกสาร ${docNo} เรียบร้อย`, 2000);
    }
}

function createNewQuotation() {
    clearFormToBlank(false);
    switchTab('editor');
    if (typeof showToast === 'function') showToast('success', 'เริ่มเอกสารใหม่', 'เปิดฟอร์มเปล่าพร้อมกรอกข้อมูลใหม่', 2000);
}

function deleteQuotation(docNo) {
    if (!confirm(`คุณต้องการลบเอกสาร ${docNo} ใช่หรือไม่?`)) return;

    let list = getLocalStorageQuotations();
    list = list.filter(q => q.docNo !== docNo);
    localStorage.setItem('sgyver_quotations', JSON.stringify(list));

    if (window.supabaseClient) {
        window.supabaseClient.from('quotations').delete().eq('doc_no', docNo).then(() => {});
    }

    loadQuotationsFromStorage();
    if (typeof showToast === 'function') showToast('info', 'ลบเอกสารแล้ว', docNo, 2000);
}

// ── 9. EXPORT, PRINT & CLIENT SHARE LINK ────────────────────────────────────
function printQuotation() {
    recalculateFinancials();
    window.print();
}

function printQuotationDirectly(docNo) {
    loadQuotationById(docNo);
    setTimeout(() => {
        window.print();
    }, 300);
}

function copyClientApprovalLink(docNo) {
    const targetDoc = docNo || STATE.quotation.docNo;
    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    const link = `${currentOrigin}${currentPath}/quotation_client.html?id=${encodeURIComponent(targetDoc)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            if (typeof showToast === 'function') {
                showToast('success', 'คัดลอกลิงก์แล้ว', 'ส่งลิงก์นี้ให้ลูกค้าเพื่อดูและเซ็นอนุมัติออนไลน์ได้เลย', 3000);
            } else {
                alert(`คัดลอกลิงก์สำหรับลูกค้าแล้ว:\n${link}`);
            }
        });
    } else {
        prompt('คัดลอกลิงก์สำหรับส่งให้ลูกค้า:', link);
    }
}

/**
 * 🔗 สร้างลิงก์หน้าดูเอกสารสำหรับลูกค้าที่รองรับทั้ง Live Server และ Local File
 */
function getQuotationClientUrl(docNo) {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && origin !== 'file://') {
        const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        return `${origin}${currentPath}/quotation_client.html?id=${encodeURIComponent(docNo)}`;
    }
    // Fallback สำหรับ local path / file://
    const currentFull = window.location.href.split('?')[0].split('#')[0];
    const basePath = currentFull.substring(0, currentFull.lastIndexOf('/'));
    return `${basePath}/quotation_client.html?id=${encodeURIComponent(docNo)}`;
}

let activeLineShareData = {
    message: '',
    link: '',
    docNo: '',
    format: 'image'
};

let cachedQuotationImageBlob = null;
let cachedQuotationImageDataUrl = null;
let isRenderingImage = false;

/**
 * 📲 แชร์ใบเสนอราคาเข้า LINE พร้อมตัวเลือก: รูปภาพ / ลิ้งก์ / PDF
 */
function sendToLine(docNo) {
    let q = null;
    if (docNo) {
        q = (STATE.quotationsList || []).find(item => item.docNo === docNo);
    }
    
    // หากไม่ได้ระบุ หรือหาไม่เจอในลิสต์ ให้ใช้เอกสารปัจจุบันในหน้า Editor
    if (!q) {
        recalculateFinancials();
        saveToLocalStorage(STATE.quotation);
        q = STATE.quotation;
    }

    if (!q || !q.docNo) {
        if (typeof showToast === 'function') {
            showToast('warning', 'ไม่พบข้อมูลเอกสาร', 'กรุณาสร้างหรือเลือกเอกสารก่อนส่งเข้า LINE', 3000);
        } else {
            alert('ไม่พบข้อมูลเอกสาร กรุณาสร้างหรือเลือกเอกสารก่อนส่งเข้า LINE');
        }
        return;
    }

    // เคลียร์แคชรูปภาพเพื่อให้ได้ข้อมูลล่าสุด
    cachedQuotationImageBlob = null;
    cachedQuotationImageDataUrl = null;

    const clientLink = getQuotationClientUrl(q.docNo);
    const docType = q.docType || 'ใบเสนอราคา (Quotation)';
    const clientName = (q.client && q.client.name) ? q.client.name.trim() : 'ลูกค้า';
    const projectTitle = q.projectTitle ? q.projectTitle.trim() : '';
    const grandTotal = formatCurrency(q.grandTotal || 0);

    // ประกอบข้อความสรุปสำหรับส่งทาง LINE
    let msg = `📄 แจ้งเอกสาร: ${docType}\n`;
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 เลขที่: ${q.docNo}\n`;
    msg += `🏢 เรียน: ${clientName}\n`;
    if (projectTitle) {
        msg += `🏷️ โครงการ: ${projectTitle}\n`;
    }
    msg += `💰 ยอดรวมสุทธิ: ${grandTotal} บาท\n`;
    if (q.validUntil) {
        msg += `📅 ใช้ได้ถึง: ${formatDateThai(q.validUntil)}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `👉 ดูเอกสารฉบับเต็มและเซ็นอนุมัติออนไลน์ได้ที่:\n${clientLink}`;

    activeLineShareData = {
        message: msg,
        link: clientLink,
        docNo: q.docNo,
        format: activeLineShareData.format || 'image'
    };

    // เปิดหน้าต่าง Modal ให้เลือกว่าจะส่งเป็น ภาพ / ลิ้งก์ / PDF
    openLineShareModal(q, msg, clientLink);
}

function openLineShareModal(q, message, clientLink) {
    const modal = document.getElementById('line-share-modal');
    const textarea = document.getElementById('line-share-text-preview');
    const badgeDocNo = document.getElementById('line-modal-docno');
    const imgBadgeDocNo = document.getElementById('line-img-docno');
    const qrImg = document.getElementById('line-qr-image');
    const qrBox = document.getElementById('line-qr-box');
    const pdfTitle = document.getElementById('line-pdf-doc-title');
    const pdfMeta = document.getElementById('line-pdf-doc-meta');

    if (badgeDocNo) badgeDocNo.textContent = q.docNo;
    if (imgBadgeDocNo) imgBadgeDocNo.textContent = q.docNo;
    if (textarea) textarea.value = message;
    if (qrBox) qrBox.style.display = 'none';

    if (pdfTitle) pdfTitle.textContent = `${q.docType || 'ใบเสนอราคา'} (PDF Document)`;
    if (pdfMeta) {
        const clientName = (q.client && q.client.name) ? q.client.name : 'ลูกค้า';
        pdfMeta.textContent = `เลขที่: ${q.docNo} | เรียน: ${clientName} | ยอดสุทธิ: ${formatCurrency(q.grandTotal)} บาท`;
    }

    // เตรียมรูป QR Code
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(clientLink)}`;
    }

    resetCopyButtonState();
    resetCopyImageButtonState();

    if (modal) {
        modal.classList.add('active');
    }

    // แสดงแท็บที่เลือก (เริ่มต้นด้วยภาพ)
    switchLineShareFormat(activeLineShareData.format || 'image');
}

/**
 * สลับแท็บรูปแบบ: 'image' | 'link' | 'pdf'
 */
function switchLineShareFormat(format) {
    activeLineShareData.format = format;

    // Tabs
    const tabs = {
        image: document.getElementById('tab-format-image'),
        link: document.getElementById('tab-format-link'),
        pdf: document.getElementById('tab-format-pdf')
    };
    Object.keys(tabs).forEach(k => {
        if (tabs[k]) {
            if (k === format) tabs[k].classList.add('active');
            else tabs[k].classList.remove('active');
        }
    });

    // Panels
    const panels = {
        image: document.getElementById('panel-format-image'),
        link: document.getElementById('panel-format-link'),
        pdf: document.getElementById('panel-format-pdf')
    };
    Object.keys(panels).forEach(k => {
        if (panels[k]) {
            panels[k].style.display = (k === format) ? 'block' : 'none';
        }
    });

    // Subtitle & Tips
    const subTitle = document.getElementById('line-modal-subtitle');
    const tip = document.getElementById('line-modal-tip');

    if (format === 'image') {
        if (subTitle) subTitle.textContent = 'ส่งใบเสนอราคาเป็นรูปภาพ (PNG) ให้ลูกค้าเปิดดูได้ทันที';
        if (tip) tip.innerHTML = '💡 <strong>เคล็ดลับ:</strong> กดปุ่ม <strong>"คัดลอกรูปภาพ"</strong> แล้วกด <code>Ctrl + V</code> วางส่งในห้องแชท LINE ได้ทันที';
        // Auto-render image
        ensureQuotationImageReady();
    } else if (format === 'link') {
        if (subTitle) subTitle.textContent = 'ส่งข้อความสรุป & ลิ้งก์สำหรับเปิดดูและเซ็นอนุมัติออนไลน์';
        if (tip) tip.innerHTML = '💡 <strong>เคล็ดลับ:</strong> กดปุ่ม <strong>"คัดลอกข้อความ & ลิ้งก์"</strong> แล้วกด <code>Ctrl + V</code> วางในแชท LINE ได้ทันที';
    } else if (format === 'pdf') {
        if (subTitle) subTitle.textContent = 'บันทึกเอกสาร PDF มาตรฐาน เพื่อส่งแนบไฟล์ใน LINE';
        if (tip) tip.innerHTML = '💡 <strong>เคล็ดลับ:</strong> บันทึกเป็น PDF แล้วลากไฟล์ (Drag & Drop) ใส่ในแชท LINE ส่งให้ลูกค้าได้ทันที';
    }
}

/**
 * 🖼️ สร้างภาพจากใบเสนอราคา A4 Sheet ด้วย html2canvas
 */
async function ensureQuotationImageReady(forceRefresh = false) {
    if (!forceRefresh && cachedQuotationImageBlob && cachedQuotationImageDataUrl) {
        showRenderedImageInPreview(cachedQuotationImageDataUrl);
        return { blob: cachedQuotationImageBlob, dataUrl: cachedQuotationImageDataUrl };
    }

    if (isRenderingImage) return null;
    isRenderingImage = true;

    const loadingEl = document.getElementById('line-image-loading');
    const imgEl = document.getElementById('line-rendered-image');
    if (loadingEl) loadingEl.style.display = 'block';
    if (imgEl) imgEl.style.display = 'none';

    const sheet = document.getElementById('a4-sheet');
    const wrapper = document.getElementById('a4-wrapper');
    if (!sheet) {
        isRenderingImage = false;
        return null;
    }

    // เก็บค่า transform scale เดิมไว้ แล้วรีเซ็ตชั่วคราวเพื่อให้ภาพคมชัด 100%
    const oldTransform = wrapper ? wrapper.style.transform : '';
    if (wrapper) wrapper.style.transform = 'none';

    try {
        if (typeof html2canvas !== 'function') {
            console.warn('html2canvas is not loaded yet');
            isRenderingImage = false;
            if (wrapper) wrapper.style.transform = oldTransform;
            return null;
        }

        const canvas = await html2canvas(sheet, {
            scale: 2, // ความละเอียดสูงระดับ 2x Retina คมชัดสมบูรณ์แบบ
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        if (wrapper) wrapper.style.transform = oldTransform;

        cachedQuotationImageDataUrl = canvas.toDataURL('image/png');
        return new Promise(resolve => {
            canvas.toBlob(blob => {
                cachedQuotationImageBlob = blob;
                isRenderingImage = false;
                showRenderedImageInPreview(cachedQuotationImageDataUrl);
                resolve({ blob, dataUrl: cachedQuotationImageDataUrl });
            }, 'image/png');
        });
    } catch (err) {
        if (wrapper) wrapper.style.transform = oldTransform;
        isRenderingImage = false;
        console.error('Render quotation image error:', err);
        if (loadingEl) {
            loadingEl.innerHTML = '<div class="text-danger small">ไม่สามารถสร้างภาพตัวอย่างได้</div>';
        }
        return null;
    }
}

function showRenderedImageInPreview(dataUrl) {
    const loadingEl = document.getElementById('line-image-loading');
    const imgEl = document.getElementById('line-rendered-image');
    if (loadingEl) loadingEl.style.display = 'none';
    if (imgEl) {
        imgEl.src = dataUrl;
        imgEl.style.display = 'block';
    }
}

/**
 * 📋 คัดลอกรูปภาพลงคลิปบอร์ด (พร้อมแปะใน LINE PC ได้ทันที)
 */
async function copyQuotationImageToClipboard() {
    let result = await ensureQuotationImageReady();
    if (!result || !result.blob) {
        result = { blob: cachedQuotationImageBlob, dataUrl: cachedQuotationImageDataUrl };
    }

    if (!result || !result.blob) {
        alert('กำลังประมวลผลรูปภาพ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
        return;
    }

    try {
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': result.blob })
            ]);
            setCopyImageButtonSuccess();
        } else {
            downloadQuotationImage();
            if (typeof showToast === 'function') {
                showToast('info', 'ดาวน์โหลดรูปภาพแล้ว', 'เบราว์เซอร์ไม่รองรับการก็อปปี้ภาพลงคลิปบอร์ดโดยตรง จึงดาวน์โหลดไฟล์ภาพให้แทน', 3500);
            }
        }
    } catch (err) {
        console.warn('Clipboard write image failed, fallback to download:', err);
        downloadQuotationImage();
        if (typeof showToast === 'function') {
            showToast('info', 'ดาวน์โหลดรูปภาพแล้ว', 'ระบบดาวน์โหลดไฟล์ภาพ PNG ไว้ให้แล้ว สามารถลากไฟล์ใส่ในแชท LINE ได้ทันที', 3500);
        }
    }
}

function setCopyImageButtonSuccess() {
    const btn = document.getElementById('btn-copy-image');
    const icon = document.getElementById('btn-copy-image-icon');
    const text = document.getElementById('btn-copy-image-text');

    if (btn) btn.classList.add('copied');
    if (icon) icon.className = 'bi bi-check-circle-fill fs-5 text-white';
    if (text) text.textContent = '✅ คัดลอกรูปภาพแล้ว! กด Ctrl + V วางในแชท LINE ได้ทันที';

    if (typeof showToast === 'function') {
        showToast('success', 'คัดลอกรูปภาพแล้ว!', 'รูปภาพใบเสนอราคาอยู่ในคลิปบอร์ดแล้ว นำไปกด Ctrl+V ในแชท LINE ได้เลย', 3000);
    }

    setTimeout(resetCopyImageButtonState, 4000);
}

function resetCopyImageButtonState() {
    const btn = document.getElementById('btn-copy-image');
    const icon = document.getElementById('btn-copy-image-icon');
    const text = document.getElementById('btn-copy-image-text');

    if (btn) btn.classList.remove('copied');
    if (icon) icon.className = 'bi bi-clipboard2-check-fill fs-5';
    if (text) text.textContent = 'คัดลอกรูปภาพ (กดแล้วนำไปวาง Ctrl+V ในแชท LINE ได้ทันที)';
}

function downloadQuotationImage() {
    if (!cachedQuotationImageDataUrl) {
        ensureQuotationImageReady().then(res => {
            if (res && res.dataUrl) downloadQuotationImage();
        });
        return;
    }
    const q = STATE.quotation;
    const docNo = (q && q.docNo) ? q.docNo : 'quotation';
    const a = document.createElement('a');
    a.href = cachedQuotationImageDataUrl;
    a.download = `${docNo}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (typeof showToast === 'function') {
        showToast('success', 'ดาวน์โหลดรูปภาพแล้ว', `บันทึกไฟล์ ${docNo}.png เรียบร้อย`, 2500);
    }
}

async function shareQuotationImageMobile() {
    let result = await ensureQuotationImageReady();
    if (!result || !result.blob) {
        result = { blob: cachedQuotationImageBlob };
    }
    if (!result || !result.blob) return;

    const q = STATE.quotation;
    const docNo = (q && q.docNo) ? q.docNo : 'quotation';
    const file = new File([result.blob], `${docNo}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: `${q.docType || 'ใบเสนอราคา'} ${docNo}`,
                text: `${q.docType || 'ใบเสนอราคา'} เลขที่ ${docNo}`,
                files: [file]
            });
        } catch (e) {
            console.log('User cancelled share');
        }
    } else {
        downloadQuotationImage();
    }
}

function exportAndPrintPdf() {
    closeLineModal();
    setTimeout(() => {
        printQuotation();
    }, 200);
}

function closeLineModal() {
    const modal = document.getElementById('line-share-modal');
    if (modal) modal.classList.remove('active');
}

function closeLineModalOnBackdrop(e) {
    if (e.target && e.target.id === 'line-share-modal') {
        closeLineModal();
    }
}

function copyLineMessageAndNotify() {
    const textarea = document.getElementById('line-share-text-preview');
    const textToCopy = textarea ? textarea.value : activeLineShareData.message;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyButtonSuccess();
        }).catch(() => {
            fallbackCopy(textarea);
        });
    } else {
        fallbackCopy(textarea);
    }
}

function fallbackCopy(textarea) {
    if (textarea) {
        textarea.select();
        document.execCommand('copy');
        setCopyButtonSuccess();
    }
}

function setCopyButtonSuccess() {
    const btn = document.getElementById('btn-copy-line-message');
    const icon = document.getElementById('btn-copy-icon');
    const text = document.getElementById('btn-copy-text');

    if (btn) btn.classList.add('copied');
    if (icon) icon.className = 'bi bi-check-circle-fill fs-5 text-white';
    if (text) text.textContent = '✅ คัดลอกสำเร็จแล้ว! วาง (Ctrl + V) ในแชท LINE ได้ทันที';

    if (typeof showToast === 'function') {
        showToast('success', 'คัดลอกสำเร็จ!', 'ข้อความสรุปและลิงก์อยู่ในคลิปบอร์ดแล้ว วางใน LINE ได้เลย', 2500);
    }

    setTimeout(resetCopyButtonState, 3500);
}

function resetCopyButtonState() {
    const btn = document.getElementById('btn-copy-line-message');
    const icon = document.getElementById('btn-copy-icon');
    const text = document.getElementById('btn-copy-text');

    if (btn) btn.classList.remove('copied');
    if (icon) icon.className = 'bi bi-clipboard-check-fill fs-5';
    if (text) text.textContent = 'คัดลอกข้อความ & ลิงก์ (วางใน LINE ได้ทันที)';
}

function openLineDesktopApp() {
    window.location.href = 'line://';
    if (typeof showToast === 'function') {
        showToast('info', 'กำลังสลับไปที่ LINE PC', 'เปิดโปรแกรม LINE แล้ว เพียงกด Ctrl + V ในห้องแชทของลูกค้า', 4000);
    }
}

function openLineWebShare() {
    const link = activeLineShareData.link;
    if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
        window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link)}`, '_blank');
    } else {
        alert('การแชร์ผ่าน LINE Web โดยตรง จำเป็นต้องรันเว็บบนโฮสต์จริง (http:// หรือ https://)\n\nบนเครื่องคอมพิวเตอร์ของคุณ แนะนำให้กดปุ่ม "คัดลอกข้อความ" หรือ "คัดลอกรูปภาพ" แล้วนำไปวางในแชท LINE PC ได้เลยครับ!');
    }
}

function toggleLineQrCode() {
    const qrBox = document.getElementById('line-qr-box');
    if (qrBox) {
        qrBox.style.display = qrBox.style.display === 'none' ? 'block' : 'none';
    }
}

// ── 10. TABS & UI HELPERS ───────────────────────────────────────────────────
function switchTab(tabName) {
    STATE.currentTab = tabName;
    const editorLayout = document.getElementById('editor-layout');
    const editorPane = document.getElementById('editor-pane');
    const previewPane = document.getElementById('preview-pane');
    const listPane = document.getElementById('list-pane');

    const tabBtnEditor = document.getElementById('tab-btn-editor');
    const tabBtnList = document.getElementById('tab-btn-list');

    if (tabName === 'editor') {
        if (editorLayout) editorLayout.style.display = 'flex';
        if (editorPane) editorPane.style.display = 'block';
        if (previewPane) previewPane.style.display = 'flex';
        if (listPane) listPane.style.display = 'none';

        if (tabBtnEditor) tabBtnEditor.classList.add('active');
        if (tabBtnList) tabBtnList.classList.remove('active');

        setTimeout(fitZoomToPreviewPane, 50);
    } else {
        if (editorLayout) editorLayout.style.display = 'none';
        if (listPane) listPane.style.display = 'block';

        if (tabBtnEditor) tabBtnEditor.classList.remove('active');
        if (tabBtnList) tabBtnList.classList.add('active');

        loadQuotationsFromStorage();
    }
}

function setZoom(level) {
    STATE.zoomLevel = level;
    const wrapper = document.getElementById('a4-wrapper');
    const indicator = document.getElementById('zoom-indicator');
    if (wrapper) wrapper.style.transform = `scale(${level})`;
    if (indicator) indicator.textContent = `${Math.round(level * 100)}%`;
}

function adjustZoom(delta) {
    let nextZoom = Math.min(1.4, Math.max(0.4, STATE.zoomLevel + delta));
    setZoom(nextZoom);
}

function fitZoomToPreviewPane() {
    const pane = document.getElementById('preview-pane');
    if (!pane) return;
    const paneWidth = pane.clientWidth;
    if (paneWidth > 0) {
        // A4 sheet width is approx 794px + breathing room
        const targetZoom = Math.min(1.0, Math.max(0.4, (paneWidth - 36) / 820));
        const roundedZoom = Math.round(targetZoom * 20) / 20; // Step by 0.05
        setZoom(roundedZoom);
    }
}

// ── 11. FORMATTERS ──────────────────────────────────────────────────────────
function formatCurrency(amount) {
    if (isNaN(amount) || amount === null) return '0.00';
    return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format with ".-" suffix as shown in user's image (e.g. 2,000.- / 6,000.-)
function formatCurrencySuffix(amount) {
    if (isNaN(amount) || amount === null) return '0.-';
    return Number(amount).toLocaleString('th-TH') + '.-';
}

function parseDateParts(dateStr) {
    if (!dateStr) return null;
    let s = String(dateStr).trim();
    if (!s) return null;

    let y = 0, m = 0, d = 0;
    if (s.includes('-')) {
        const parts = s.split('-');
        if (parts.length === 3) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
        }
    } else if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
            let p1 = parseInt(parts[0], 10);
            let p2 = parseInt(parts[1], 10);
            let p3 = parseInt(parts[2], 10);
            if (p1 > 1000) {
                y = p1; m = p2; d = p3;
            } else {
                d = p1; m = p2; y = p3;
            }
        }
    }

    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const yearBE = y > 2400 ? y : y + 543;
    const yearCE = y > 2400 ? y - 543 : y;
    return { yearBE, yearCE, month: m, day: d };
}

function formatDateThai(isoDateStr) {
    const p = parseDateParts(isoDateStr);
    if (!p) return '—';
    const thMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${p.day} ${thMonths[p.month] || ''} ${p.yearBE}`;
}

// Format as DD/MM/YYYY matching user's image (e.g. 22/08/2569)
function formatDateCustom(isoDateStr) {
    const p = parseDateParts(isoDateStr);
    if (!p) return '—';
    const m = String(p.month).padStart(2, '0');
    const d = String(p.day).padStart(2, '0');
    return `${d}/${m}/${p.yearBE}`;
}

// Format with Full Thai month and (DD/MM/YYYY BE) for live preview badge
function formatThaiDateDisplay(isoDateStr) {
    const p = parseDateParts(isoDateStr);
    if (!p) return '—';
    const thMonthsFull = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const dStr = String(p.day).padStart(2, '0');
    const mStr = String(p.month).padStart(2, '0');
    return `${p.day} ${thMonthsFull[p.month] || ''} ${p.yearBE} (${dStr}/${mStr}/${p.yearBE})`;
}

const THAI_MONTH_NAMES = [
    { num: 1, name: 'มกราคม (01)' },
    { num: 2, name: 'กุมภาพันธ์ (02)' },
    { num: 3, name: 'มีนาคม (03)' },
    { num: 4, name: 'เมษายน (04)' },
    { num: 5, name: 'พฤษภาคม (05)' },
    { num: 6, name: 'มิถุนายน (06)' },
    { num: 7, name: 'กรกฎาคม (07)' },
    { num: 8, name: 'สิงหาคม (08)' },
    { num: 9, name: 'กันยายน (09)' },
    { num: 10, name: 'ตุลาคม (10)' },
    { num: 11, name: 'พฤศจิกายน (11)' },
    { num: 12, name: 'ธันวาคม (12)' }
];

function initThaiDatePickers() {
    ['doc', 'valid'].forEach(target => {
        const dayEl = document.getElementById(`thai-day-${target}`);
        const monthEl = document.getElementById(`thai-month-${target}`);
        const yearEl = document.getElementById(`thai-year-${target}`);
        if (!dayEl || !monthEl || !yearEl) return;

        // Days 1..31
        let dayOptions = '<option value="">วัน</option>';
        for (let i = 1; i <= 31; i++) {
            dayOptions += `<option value="${i}">${i}</option>`;
        }
        dayEl.innerHTML = dayOptions;

        // Months 1..12
        let monthOptions = '<option value="">เดือน</option>';
        THAI_MONTH_NAMES.forEach(m => {
            monthOptions += `<option value="${m.num}">${m.name}</option>`;
        });
        monthEl.innerHTML = monthOptions;

        // Years BE (current year - 2 to + 5)
        const currentYearBE = new Date().getFullYear() + 543;
        let yearOptions = '<option value="">ปี พ.ศ.</option>';
        for (let y = currentYearBE - 2; y <= currentYearBE + 5; y++) {
            yearOptions += `<option value="${y}">${y}</option>`;
        }
        yearEl.innerHTML = yearOptions;
    });
}

function toggleThaiDatePicker(target) {
    const el = document.getElementById(`thai-date-picker-${target}`);
    if (!el) return;
    if (el.classList.contains('d-none')) {
        el.classList.remove('d-none');
        el.classList.add('d-flex');
        const currentDate = (target === 'doc') ? STATE.quotation.date : STATE.quotation.validUntil;
        syncThaiDatePickerDropdowns(target, currentDate);
    } else {
        el.classList.add('d-none');
        el.classList.remove('d-flex');
    }
}

function syncThaiDatePickerDropdowns(target, isoDateStr) {
    const dayEl = document.getElementById(`thai-day-${target}`);
    const monthEl = document.getElementById(`thai-month-${target}`);
    const yearEl = document.getElementById(`thai-year-${target}`);
    if (!dayEl || !monthEl || !yearEl) return;

    const p = parseDateParts(isoDateStr);
    if (p) {
        dayEl.value = String(p.day);
        monthEl.value = String(p.month);
        yearEl.value = String(p.yearBE);
    } else {
        dayEl.value = '';
        monthEl.value = '';
        yearEl.value = '';
    }
}

function onThaiPickerChanged(target) {
    const dayEl = document.getElementById(`thai-day-${target}`);
    const monthEl = document.getElementById(`thai-month-${target}`);
    const yearEl = document.getElementById(`thai-year-${target}`);
    if (!dayEl || !monthEl || !yearEl) return;

    const day = parseInt(dayEl.value, 10);
    const month = parseInt(monthEl.value, 10);
    const yearBE = parseInt(yearEl.value, 10);

    if (!day || !month || !yearBE) return;

    const yearCE = yearBE - 543;
    const isoStr = `${yearCE}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const inputId = (target === 'doc') ? 'form-doc-date' : 'form-doc-valid';
    setVal(inputId, isoStr);

    if (target === 'doc') {
        STATE.quotation.date = isoStr;
    } else {
        STATE.quotation.validUntil = isoStr;
    }

    recalculateFinancials();
}

function onNativeDateInputChanged(target) {
    const inputId = (target === 'doc') ? 'form-doc-date' : 'form-doc-valid';
    const val = getVal(inputId);
    if (target === 'doc') {
        STATE.quotation.date = val;
    } else {
        STATE.quotation.validUntil = val;
    }
    recalculateFinancials();
}

function setDocDateToday() {
    const todayIso = getTodayIsoDate();
    setVal('form-doc-date', todayIso);
    STATE.quotation.date = todayIso;
    recalculateFinancials();
    if (typeof showToast === 'function') {
        showToast('info', 'ตั้งวันที่วันนี้แล้ว', formatThaiDateDisplay(todayIso), 2000);
    }
}

function addValidDays(days) {
    const baseDateStr = getVal('form-doc-date') || getTodayIsoDate();
    const p = parseDateParts(baseDateStr);
    let baseDate = new Date();
    if (p) {
        baseDate = new Date(p.yearCE, p.month - 1, p.day);
    }
    baseDate.setDate(baseDate.getDate() + days);

    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const d = String(baseDate.getDate()).padStart(2, '0');
    const validIso = `${y}-${m}-${d}`;

    setVal('form-doc-valid', validIso);
    STATE.quotation.validUntil = validIso;
    recalculateFinancials();

    if (typeof showToast === 'function') {
        showToast('info', `กำหนดยืนราคา +${days} วัน`, formatThaiDateDisplay(validIso), 2000);
    }
}

function clearValidDate() {
    setVal('form-doc-valid', '');
    STATE.quotation.validUntil = '';
    recalculateFinancials();
}

function updateDateHelperBadges() {
    const q = STATE.quotation;

    const docDateBadge = document.getElementById('doc-date-th-text');
    if (docDateBadge) {
        docDateBadge.textContent = q.date ? formatThaiDateDisplay(q.date) : 'ไม่ได้ระบุ';
    }

    const validDateBadge = document.getElementById('doc-valid-th-text');
    if (validDateBadge) {
        validDateBadge.textContent = q.validUntil ? formatThaiDateDisplay(q.validUntil) : 'ไม่ได้ระบุ (ไม่จำกัด)';
    }

    syncThaiDatePickerDropdowns('doc', q.date);
    syncThaiDatePickerDropdowns('valid', q.validUntil);
}

function getStatusLabel(status) {
    switch (status) {
        case 'APPROVED': return 'อนุมัติแล้ว';
        case 'SENT': return 'ส่งให้ลูกค้าแล้ว';
        case 'REJECTED': return 'ยกเลิก / ปฏิเสธ';
        case 'DRAFT':
        default: return 'แบบร่าง (Draft)';
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

// ── 12. SAVED PROFILES (CLIENTS & SELLERS) ──────────────────────────────────
const DEFAULT_SAVED_CLIENTS = [
    {
        id: 'cli_pim_satit',
        name: 'โรงเรียนสาธิตสถาบันการจัดการปัญญาภิวัฒน์ (สำนักงานใหญ่)',
        contactPerson: 'ฝ่ายจัดซื้อและพัฒนาสื่อ',
        taxId: '0994001476136',
        branch: 'สำนักงานใหญ่',
        phone: '02-855-0000',
        email: 'spim@pim.ac.th',
        address: '45/23 ม.2 ถ.แจ้งวัฒนะ ต.บางตลาด อ.ปากเกร็ด จ.นนทบุรี 11120'
    }
];

const DEFAULT_SAVED_SELLERS = [
    {
        id: 'sel_achi_default',
        name: 'อชิษ์ อัศวโภคินทร์',
        taxId: '',
        branch: 'สำนักงานใหญ่',
        phone: '091-928-1756',
        email: 's.gyver36@gmail.com',
        address: '222/56 ม.4 มบ.ลัดดาวิลล์1 ถ.บ้านกล้วย-ไทรน้อย ต.พิมลราช อ.บางบัวทอง จ.นนทบุรี 11110',
        bankAccount: 'ธนาคารกสิกรไทย (KBANK)\nเลขที่บัญชี: 123-4-56789-0\nชื่อบัญชี: อชิษ์ อัศวโภคินทร์',
        sellerSignName: 'อชิษ์ อัศวโภคินทร์'
    },
    {
        id: 'sel_sarasanun_demo',
        name: 'ศรัศนันท์ ตราชู',
        taxId: '',
        branch: 'สำนักงานใหญ่',
        phone: '085-849-8956',
        email: 's.gyver36@gmail.com',
        address: '222/56 ม.4 มบ.ลัดดาวิลล์1 ถ.บ้านกล้วย-ไทรน้อย ต.พิมลราช อ.บางบัวทอง จ.นนทบุรี 11110',
        bankAccount: 'ธนาคารกสิกรไทย (KBANK)\nเลขที่บัญชี: 123-4-56789-0\nชื่อบัญชี: ศรัศนันท์ ตราชู',
        sellerSignName: 'ศรัศนันท์ ตราชู'
    }
];

function getSavedClients() {
    try {
        const raw = localStorage.getItem('sgyver_saved_clients');
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) return list;
        }
    } catch (e) {}
    localStorage.setItem('sgyver_saved_clients', JSON.stringify(DEFAULT_SAVED_CLIENTS));
    return [...DEFAULT_SAVED_CLIENTS];
}

function saveClientsToStorage(list) {
    try {
        localStorage.setItem('sgyver_saved_clients', JSON.stringify(list));
    } catch (e) {}
}

function getSavedSellers() {
    try {
        const raw = localStorage.getItem('sgyver_saved_sellers');
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) return list;
        }
    } catch (e) {}
    localStorage.setItem('sgyver_saved_sellers', JSON.stringify(DEFAULT_SAVED_SELLERS));
    return [...DEFAULT_SAVED_SELLERS];
}

function saveSellersToStorage(list) {
    try {
        localStorage.setItem('sgyver_saved_sellers', JSON.stringify(list));
    } catch (e) {}
}

function initSavedProfiles() {
    renderSavedClientSelect();
    renderSavedSellerSelect();
}

function renderSavedClientSelect(selectedId = '') {
    const select = document.getElementById('select-saved-client');
    if (!select) return;

    const clients = getSavedClients();
    select.innerHTML = `
        <option value="">-- เลือกลูกค้าเดิม (${clients.length}) --</option>
        ${clients.map(c => `
            <option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>
                ${escapeHtml(c.name)}
            </option>
        `).join('')}
    `;
}

function renderSavedSellerSelect(selectedId = '') {
    const select = document.getElementById('select-saved-seller');
    if (!select) return;

    const sellers = getSavedSellers();
    select.innerHTML = `
        <option value="">-- เลือกผู้ออกเอกสารเดิม (${sellers.length}) --</option>
        ${sellers.map(s => `
            <option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>
                ${escapeHtml(s.name)}
            </option>
        `).join('')}
    `;
}

function applySelectedClient(clientId) {
    if (!clientId) return;
    const clients = getSavedClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    setVal('form-client-name', client.name || '');
    setVal('form-client-person', client.contactPerson || '');
    setVal('form-client-tax', client.taxId || '');
    setVal('form-client-branch', client.branch || 'สำนักงานใหญ่');
    setVal('form-client-phone', client.phone || '');
    setVal('form-client-email', client.email || '');
    setVal('form-client-address', client.address || '');

    recalculateFinancials();

    if (typeof showToast === 'function') {
        showToast('success', 'โหลดข้อมูลลูกค้าแล้ว', `ดึงข้อมูลของ "${client.name}" ใส่ฟอร์มเรียบร้อย`, 2500);
    }
}

function applySelectedSeller(sellerId) {
    if (!sellerId) return;
    const sellers = getSavedSellers();
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller) return;

    setVal('form-seller-name', seller.name || '');
    setVal('form-seller-tax', seller.taxId || '');
    setVal('form-seller-phone', seller.phone || '');
    setVal('form-seller-email', seller.email || '');
    setVal('form-seller-address', seller.address || '');
    if (seller.bankAccount) setVal('form-bank-account', seller.bankAccount);
    if (seller.sellerSignName) setVal('form-seller-sign-name', seller.sellerSignName);

    recalculateFinancials();

    if (typeof showToast === 'function') {
        showToast('success', 'โหลดข้อมูลผู้ขายแล้ว', `ดึงข้อมูลของ "${seller.name}" ใส่ฟอร์มเรียบร้อย`, 2500);
    }
}

function saveCurrentClientProfile() {
    const name = getVal('form-client-name');
    if (!name) {
        if (typeof showToast === 'function') {
            showToast('warning', 'กรุณาระบุชื่อลูกค้า', 'โปรดกรอกชื่อบริษัท/ลูกค้ารายนี้ในฟอร์มก่อนกดบันทึก', 3000);
        } else {
            alert('กรุณากรอกชื่อลูกค้าก่อนกดบันทึก');
        }
        return;
    }

    const clientData = {
        name: name,
        contactPerson: getVal('form-client-person'),
        taxId: getVal('form-client-tax'),
        branch: getVal('form-client-branch') || 'สำนักงานใหญ่',
        phone: getVal('form-client-phone'),
        email: getVal('form-client-email'),
        address: getVal('form-client-address'),
        updatedAt: new Date().toISOString()
    };

    let clients = getSavedClients();
    const existingIndex = clients.findIndex(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());

    let targetId = '';
    if (existingIndex >= 0) {
        targetId = clients[existingIndex].id;
        clientData.id = targetId;
        clients[existingIndex] = clientData;
    } else {
        targetId = 'cli_' + Date.now();
        clientData.id = targetId;
        clients.unshift(clientData);
    }

    saveClientsToStorage(clients);
    renderSavedClientSelect(targetId);

    if (typeof showToast === 'function') {
        showToast('success', 'บันทึกลูกค้าสำเร็จ', `บันทึกข้อมูลของ "${name}" ไว้ในรายการแล้ว`, 3000);
    }
}

function saveCurrentSellerProfile() {
    const name = getVal('form-seller-name');
    if (!name) {
        if (typeof showToast === 'function') {
            showToast('warning', 'กรุณาระบุชื่อผู้ขาย', 'โปรดกรอกชื่อร้านค้า/ผู้เสนอราคาในฟอร์มก่อนกดบันทึก', 3000);
        } else {
            alert('กรุณากรอกชื่อผู้ขายก่อนกดบันทึก');
        }
        return;
    }

    const sellerData = {
        name: name,
        taxId: getVal('form-seller-tax'),
        branch: getVal('form-seller-branch') || 'สำนักงานใหญ่',
        phone: getVal('form-seller-phone'),
        email: getVal('form-seller-email'),
        address: getVal('form-seller-address'),
        bankAccount: getVal('form-bank-account'),
        sellerSignName: getVal('form-seller-sign-name'),
        updatedAt: new Date().toISOString()
    };

    let sellers = getSavedSellers();
    const existingIndex = sellers.findIndex(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());

    let targetId = '';
    if (existingIndex >= 0) {
        targetId = sellers[existingIndex].id;
        sellerData.id = targetId;
        sellers[existingIndex] = sellerData;
    } else {
        targetId = 'sel_' + Date.now();
        sellerData.id = targetId;
        sellers.unshift(sellerData);
    }

    saveSellersToStorage(sellers);
    renderSavedSellerSelect(targetId);

    if (typeof showToast === 'function') {
        showToast('success', 'บันทึกผู้ขายสำเร็จ', `บันทึกข้อมูลของ "${name}" ไว้ในรายการแล้ว`, 3000);
    }
}

function autoSaveProfilesFromCurrentQuotation() {
    const clientName = getVal('form-client-name');
    if (clientName) {
        let clients = getSavedClients();
        const existingIndex = clients.findIndex(c => c.name.trim().toLowerCase() === clientName.trim().toLowerCase());
        const clientData = {
            name: clientName,
            contactPerson: getVal('form-client-person'),
            taxId: getVal('form-client-tax'),
            branch: getVal('form-client-branch') || 'สำนักงานใหญ่',
            phone: getVal('form-client-phone'),
            email: getVal('form-client-email'),
            address: getVal('form-client-address'),
            updatedAt: new Date().toISOString()
        };
        if (existingIndex >= 0) {
            clientData.id = clients[existingIndex].id;
            clients[existingIndex] = clientData;
        } else {
            clientData.id = 'cli_' + Date.now();
            clients.unshift(clientData);
        }
        saveClientsToStorage(clients);
        renderSavedClientSelect(clientData.id);
    }

    const sellerName = getVal('form-seller-name');
    if (sellerName) {
        let sellers = getSavedSellers();
        const existingIndex = sellers.findIndex(s => s.name.trim().toLowerCase() === sellerName.trim().toLowerCase());
        const sellerData = {
            name: sellerName,
            taxId: getVal('form-seller-tax'),
            branch: getVal('form-seller-branch') || 'สำนักงานใหญ่',
            phone: getVal('form-seller-phone'),
            email: getVal('form-seller-email'),
            address: getVal('form-seller-address'),
            bankAccount: getVal('form-bank-account'),
            sellerSignName: getVal('form-seller-sign-name'),
            updatedAt: new Date().toISOString()
        };
        if (existingIndex >= 0) {
            sellerData.id = sellers[existingIndex].id;
            sellers[existingIndex] = sellerData;
        } else {
            sellerData.id = 'sel_' + Date.now();
            sellers.unshift(sellerData);
        }
        saveSellersToStorage(sellers);
        renderSavedSellerSelect(sellerData.id);
    }
}

function autoHarvestProfilesFromQuotations() {
    const list = STATE.quotationsList || [];
    if (!Array.isArray(list) || list.length === 0) return;

    let clients = getSavedClients();
    let sellers = getSavedSellers();
    let clientChanged = false;
    let sellerChanged = false;

    list.forEach(q => {
        // Harvest Client
        if (q.client && q.client.name && q.client.name.trim()) {
            const cName = q.client.name.trim();
            const exists = clients.some(c => c.name.trim().toLowerCase() === cName.toLowerCase());
            if (!exists) {
                clients.push({
                    id: 'cli_' + Math.floor(Math.random() * 1000000),
                    name: cName,
                    contactPerson: q.client.contactPerson || '',
                    taxId: q.client.taxId || '',
                    branch: q.client.branch || 'สำนักงานใหญ่',
                    phone: q.client.phone || '',
                    email: q.client.email || '',
                    address: q.client.address || '',
                    updatedAt: q.updatedAt || new Date().toISOString()
                });
                clientChanged = true;
            }
        }

        // Harvest Seller
        if (q.seller && q.seller.name && q.seller.name.trim()) {
            const sName = q.seller.name.trim();
            const exists = sellers.some(s => s.name.trim().toLowerCase() === sName.toLowerCase());
            if (!exists) {
                sellers.push({
                    id: 'sel_' + Math.floor(Math.random() * 1000000),
                    name: sName,
                    taxId: q.seller.taxId || '',
                    branch: q.seller.branch || 'สำนักงานใหญ่',
                    phone: q.seller.phone || '',
                    email: q.seller.email || '',
                    address: q.seller.address || '',
                    bankAccount: q.bankAccount || '',
                    sellerSignName: q.sellerSignName || '',
                    updatedAt: q.updatedAt || new Date().toISOString()
                });
                sellerChanged = true;
            }
        }
    });

    if (clientChanged) {
        saveClientsToStorage(clients);
        renderSavedClientSelect();
    }
    if (sellerChanged) {
        saveSellersToStorage(sellers);
        renderSavedSellerSelect();
    }
}

// ── Profile Manager Modal Logic ──
let activeProfileManagerType = 'client'; // 'client' | 'seller'

function openProfileManagerModal(type = 'client') {
    activeProfileManagerType = type;
    const modal = document.getElementById('profile-manager-modal');
    const title = document.getElementById('profile-manager-title');
    const subtitle = document.getElementById('profile-manager-subtitle');
    const clearBtn = document.getElementById('btn-clear-all-profiles');

    if (type === 'client') {
        if (title) title.textContent = 'จัดการรายชื่อลูกค้าที่บันทึกไว้';
        if (subtitle) subtitle.textContent = 'รายชื่อลูกค้าที่ระบบจำไว้สำหรับเลือกใช้งานด่วน';
        if (clearBtn) clearBtn.innerHTML = '<i class="bi bi-trash3 me-1"></i> ลบลูกค้าทั้งหมด';
    } else {
        if (title) title.textContent = 'จัดการรายชื่อผู้ออกเอกสาร (ผู้ขาย)';
        if (subtitle) subtitle.textContent = 'รายชื่อร้านค้า/ผู้ขายที่ระบบจำไว้สำหรับเลือกใช้งานด่วน';
        if (clearBtn) clearBtn.innerHTML = '<i class="bi bi-trash3 me-1"></i> ลบผู้ขายทั้งหมด';
    }

    renderProfileManagerList();

    if (modal) modal.classList.add('active');
}

function closeProfileManagerModal() {
    const modal = document.getElementById('profile-manager-modal');
    if (modal) modal.classList.remove('active');
}

function closeProfileManagerOnBackdrop(e) {
    if (e.target && e.target.id === 'profile-manager-modal') {
        closeProfileManagerModal();
    }
}

function renderProfileManagerList() {
    const container = document.getElementById('profile-manager-list');
    if (!container) return;

    const isClient = (activeProfileManagerType === 'client');
    const list = isClient ? getSavedClients() : getSavedSellers();

    if (list.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-secondary">
                <i class="bi bi-inbox fs-2 mb-2 d-block"></i>
                ยังไม่มีข้อมูล${isClient ? 'ลูกค้า' : 'ผู้ขาย'}ที่บันทึกไว้
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(item => `
        <div class="profile-manager-item">
            <div class="profile-manager-item-info">
                <div class="profile-manager-item-name">${escapeHtml(item.name)}</div>
                <div class="profile-manager-item-sub">
                    ${item.phone ? `📞 ${escapeHtml(item.phone)}` : ''}
                    ${item.taxId ? ` • ภาษี: ${escapeHtml(item.taxId)}` : ''}
                    ${item.address ? ` • 📍 ${escapeHtml(item.address.substring(0, 45))}...` : ''}
                </div>
            </div>
            <div class="d-flex align-items-center gap-1">
                <button type="button" class="btn btn-sm btn-outline-info py-1 px-2" title="เลือกใช้นี้ทันที" onclick="selectProfileAndClose('${item.id}')">
                    <i class="bi bi-check-lg"></i> เลือก
                </button>
                <button type="button" class="btn btn-sm btn-outline-warning py-1 px-2" title="แก้ไขข้อมูลนี้" onclick="openProfileEditorModal('${item.id}')">
                    <i class="bi bi-pencil-square"></i> แก้ไข
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger py-1 px-2" title="ลบรายการนี้" onclick="deleteSavedProfile('${item.id}')">
                    <i class="bi bi-trash3"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function selectProfileAndClose(id) {
    if (activeProfileManagerType === 'client') {
        applySelectedClient(id);
        const sel = document.getElementById('select-saved-client');
        if (sel) sel.value = id;
    } else {
        applySelectedSeller(id);
        const sel = document.getElementById('select-saved-seller');
        if (sel) sel.value = id;
    }
    closeProfileManagerModal();
}

function openProfileEditorModal(id) {
    const isClient = (activeProfileManagerType === 'client');
    const list = isClient ? getSavedClients() : getSavedSellers();
    const item = list.find(x => x.id === id);
    if (!item) return;

    const modal = document.getElementById('profile-editor-modal');
    const title = document.getElementById('profile-editor-title');
    const subtitle = document.getElementById('profile-editor-subtitle');
    const contactGroup = document.getElementById('group-edit-contact');
    const sellerGroup = document.getElementById('group-edit-seller-fields');
    const nameLabel = document.getElementById('lbl-edit-name');

    if (isClient) {
        if (title) title.textContent = 'แก้ไขข้อมูลลูกค้า';
        if (subtitle) subtitle.textContent = 'แก้ไขข้อมูลของลูกค้าที่บันทึกไว้ในระบบ';
        if (nameLabel) nameLabel.innerHTML = 'ชื่อบริษัท / โรงเรียน / ลูกค้า <span class="text-danger">*</span>';
        if (contactGroup) contactGroup.classList.remove('d-none');
        if (sellerGroup) sellerGroup.classList.add('d-none');
    } else {
        if (title) title.textContent = 'แก้ไขข้อมูลผู้ออกเอกสาร (ผู้ขาย)';
        if (subtitle) subtitle.textContent = 'แก้ไขข้อมูลร้านค้า/บริษัทผู้ออกเอกสาร';
        if (nameLabel) nameLabel.innerHTML = 'ชื่อร้านค้า / บริษัท / ผู้ออกเอกสาร <span class="text-danger">*</span>';
        if (contactGroup) contactGroup.classList.add('d-none');
        if (sellerGroup) sellerGroup.classList.remove('d-none');
    }

    setVal('edit-profile-id', item.id);
    setVal('edit-profile-name', item.name || '');
    setVal('edit-profile-contact', item.contactPerson || '');
    setVal('edit-profile-tax', item.taxId || '');
    setVal('edit-profile-branch', item.branch || 'สำนักงานใหญ่');
    setVal('edit-profile-phone', item.phone || '');
    setVal('edit-profile-email', item.email || '');
    setVal('edit-profile-address', item.address || '');
    setVal('edit-profile-bank', item.bankAccount || '');
    setVal('edit-profile-sign', item.sellerSignName || '');

    if (modal) modal.classList.add('active');
}

function closeProfileEditorModal() {
    const modal = document.getElementById('profile-editor-modal');
    if (modal) modal.classList.remove('active');
}

function closeProfileEditorOnBackdrop(e) {
    if (e.target && e.target.id === 'profile-editor-modal') {
        closeProfileEditorModal();
    }
}

function saveEditedProfile() {
    const id = getVal('edit-profile-id');
    const name = getVal('edit-profile-name').trim();
    if (!name) {
        if (typeof showToast === 'function') {
            showToast('warning', 'กรุณาระบุชื่อ', 'โปรดระบุชื่อบริษัท/ร้านค้าก่อนบันทึก', 2500);
        } else {
            alert('กรุณาระบุชื่อก่อนบันทึก');
        }
        return;
    }

    const isClient = (activeProfileManagerType === 'client');
    if (isClient) {
        let clients = getSavedClients();
        const idx = clients.findIndex(c => c.id === id);
        if (idx >= 0) {
            clients[idx].name = name;
            clients[idx].contactPerson = getVal('edit-profile-contact');
            clients[idx].taxId = getVal('edit-profile-tax');
            clients[idx].branch = getVal('edit-profile-branch') || 'สำนักงานใหญ่';
            clients[idx].phone = getVal('edit-profile-phone');
            clients[idx].email = getVal('edit-profile-email');
            clients[idx].address = getVal('edit-profile-address');
            clients[idx].updatedAt = new Date().toISOString();
            saveClientsToStorage(clients);
            renderSavedClientSelect(id);

            // If this client is currently selected in form, refresh it
            const currentSelected = document.getElementById('select-saved-client');
            if (currentSelected && currentSelected.value === id) {
                applySelectedClient(id);
            }
        }
    } else {
        let sellers = getSavedSellers();
        const idx = sellers.findIndex(s => s.id === id);
        if (idx >= 0) {
            sellers[idx].name = name;
            sellers[idx].taxId = getVal('edit-profile-tax');
            sellers[idx].branch = getVal('edit-profile-branch') || 'สำนักงานใหญ่';
            sellers[idx].phone = getVal('edit-profile-phone');
            sellers[idx].email = getVal('edit-profile-email');
            sellers[idx].address = getVal('edit-profile-address');
            sellers[idx].bankAccount = getVal('edit-profile-bank');
            sellers[idx].sellerSignName = getVal('edit-profile-sign');
            sellers[idx].updatedAt = new Date().toISOString();
            saveSellersToStorage(sellers);
            renderSavedSellerSelect(id);

            // If this seller is currently selected in form, refresh it
            const currentSelected = document.getElementById('select-saved-seller');
            if (currentSelected && currentSelected.value === id) {
                applySelectedSeller(id);
            }
        }
    }

    renderProfileManagerList();
    closeProfileEditorModal();

    if (typeof showToast === 'function') {
        showToast('success', 'บันทึกการแก้ไขแล้ว', `อัปเดตข้อมูลของ "${name}" เรียบร้อย`, 2500);
    }
}

function deleteSavedProfile(id) {
    if (activeProfileManagerType === 'client') {
        let clients = getSavedClients().filter(c => c.id !== id);
        saveClientsToStorage(clients);
        renderSavedClientSelect();
    } else {
        let sellers = getSavedSellers().filter(s => s.id !== id);
        saveSellersToStorage(sellers);
        renderSavedSellerSelect();
    }
    renderProfileManagerList();
    if (typeof showToast === 'function') {
        showToast('info', 'ลบรายการแล้ว', 'ลบรายชื่อออกจากระบบเรียบร้อย', 2000);
    }
}

function clearAllProfilesOfType() {
    const isClient = (activeProfileManagerType === 'client');
    const label = isClient ? 'ลูกค้า' : 'ผู้ขาย';
    if (!confirm(`คุณต้องการลบรายชื่อ${label}ที่บันทึกไว้ทั้งหมดใช่หรือไม่?`)) return;

    if (isClient) {
        saveClientsToStorage([]);
        renderSavedClientSelect();
    } else {
        saveSellersToStorage([]);
        renderSavedSellerSelect();
    }
    renderProfileManagerList();
    if (typeof showToast === 'function') {
        showToast('info', 'ลบทั้งหมดแล้ว', `ลบรายการ${label}ทั้งหมดเรียบร้อย`, 2000);
    }
}
