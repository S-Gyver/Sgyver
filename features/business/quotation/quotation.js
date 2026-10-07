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
    date: '2569-08-22',
    validUntil: '2569-09-22',
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
    sellerSignDate: '2569-08-22'
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
    renderCatalogPills();
    populateFormFromState();
    recalculateFinancials();
    loadQuotationsFromStorage();

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

    // Watermark
    const watermark = document.getElementById('a4-watermark');
    if (watermark) {
        watermark.textContent = q.status;
        watermark.className = `a4-watermark ${q.status.toLowerCase()}`;
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
                    <td class="text-center" style="width: 48px; font-weight: 600; color: var(--tc-primary);">
                        ${idx + 1}.
                    </td>
                    <td>
                        <div class="item-title-terracotta" style="${isNameEmpty ? 'color: #94a3b8; font-style: italic;' : ''}">
                            ${escapeHtml(item.name || '— (ระบุชื่อรายการสินค้า / บริการ) —')}
                        </div>
                        ${hasVisual ? `
                            <div class="item-visual-block">
                                ${item.img ? `<img src="${item.img}" class="item-thumbnail-img" alt="${escapeHtml(item.name || 'item')}">` : ''}
                                ${specsHtml ? `<div class="item-specs-list">${specsHtml}</div>` : ''}
                            </div>
                        ` : ''}
                    </td>
                    <td class="text-center font-mono" style="width: 75px; font-size: 0.95rem;">
                        ${item.qty || 1}
                    </td>
                    <td class="text-center font-mono" style="width: 100px; font-size: 0.95rem;">
                        ${formatCurrencySuffix(item.price)}
                    </td>
                    <td class="text-center font-mono fw-bold" style="width: 110px; font-size: 0.95rem;">
                        ${formatCurrencySuffix(lineTotal)}
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
    docNo: ''
};

/**
 * 📲 แชร์ใบเสนอราคาเข้า LINE
 * - บน Mobile: เปิดแอป LINE โดยตรง
 * - บน PC: เปิดหน้าต่างแชร์แบบพรีเมียม (คัดลอกข้อความอัตโนมัติ ไม่ติด 404)
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
        docNo: q.docNo
    };

    // อัตโนมัติ: คัดลอกข้อความทั้งหมดลง Clipboard ทันที (เพื่อให้พร้อมแปะ)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).catch(() => {});
    }

    // ตรวจสอบว่าเปิดจากสมาร์ตโฟน/แท็บเล็ตหรือไม่
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
        // บนมือถือใช้ LINE URL Scheme ได้โดยตรง
        const mobileLineUrl = `https://line.me/R/share?text=${encodeURIComponent(msg)}`;
        window.open(mobileLineUrl, '_blank');
        return;
    }

    // บน Desktop PC: เปิดหน้าต่างแชร์สวยงามทันที (ป้องกัน 404 ของเว็บเบราว์เซอร์ PC)
    openLineShareModal(q, msg, clientLink);
}

function openLineShareModal(q, message, clientLink) {
    const modal = document.getElementById('line-share-modal');
    const textarea = document.getElementById('line-share-text-preview');
    const badgeDocNo = document.getElementById('line-modal-docno');
    const qrImg = document.getElementById('line-qr-image');
    const qrBox = document.getElementById('line-qr-box');

    if (badgeDocNo) badgeDocNo.textContent = q.docNo;
    if (textarea) textarea.value = message;
    if (qrBox) qrBox.style.display = 'none';

    // เตรียมรูป QR Code
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(clientLink)}`;
    }

    resetCopyButtonState();

    if (modal) {
        modal.classList.add('active');
    }

    if (typeof showToast === 'function') {
        showToast('success', 'คัดลอกข้อความแล้ว!', 'คัดลอกข้อความสรุป & ลิงก์แล้ว นำไปวาง (Ctrl+V) ในแชท LINE ได้ทันที', 3000);
    }
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
    if (text) text.textContent = 'คัดลอกข้อความ & ลิงก์ทั้งหมด (วางใน LINE ได้ทันที)';
}

function openLineDesktopApp() {
    // พยายามเรียกโปรแกรม LINE สำหรับ Windows PC ผ่าน URI Protocol
    window.location.href = 'line://';
    if (typeof showToast === 'function') {
        showToast('info', 'กำลังสลับไปที่ LINE PC', 'ข้อความถูกคัดลอกไว้แล้ว เพียงกด Ctrl + V ในห้องแชทของลูกค้า', 4000);
    }
}

function openLineWebShare() {
    const link = activeLineShareData.link;
    if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
        window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link)}`, '_blank');
    } else {
        alert('การแชร์ผ่าน LINE Web โดยตรง จำเป็นต้องรันเว็บบนโฮสต์จริง (http:// หรือ https://)\n\nบนเครื่องคอมพิวเตอร์ของคุณ แนะนำให้กดปุ่ม "คัดลอกข้อความ" แล้วนำไปวางในแชท LINE PC ได้เลยครับ!');
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

function formatDateThai(isoDateStr) {
    if (!isoDateStr) return '—';
    try {
        const parts = isoDateStr.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10) > 2500 ? parseInt(parts[0], 10) : parseInt(parts[0], 10) + 543;
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            const thMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            return `${d} ${thMonths[m]} ${y}`;
        }
    } catch(e) {}
    return isoDateStr;
}

// Format as DD/MM/YYYY matching user's image (e.g. 22/08/2569)
function formatDateCustom(isoDateStr) {
    if (!isoDateStr) return '—';
    try {
        const parts = isoDateStr.split('-');
        if (parts.length === 3) {
            let y = parseInt(parts[0], 10);
            if (y < 2500) y += 543;
            const m = String(parts[1]).padStart(2, '0');
            const d = String(parts[2]).padStart(2, '0');
            return `${d}/${m}/${y}`;
        }
    } catch(e) {}
    return isoDateStr;
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
