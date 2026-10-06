/**
 * S-GYVER OMNICHANNEL ORDER & SHIPPING STUDIO
 * Parse Multi-Store Excel Orders from BigSeller (Shopee x 3, TikTok x 1, Lazada x 1)
 * Print 100x150mm Thermal Barcode Shipping Labels & Sync with Quotation Studio
 */

const STATE = {
    orders: [],
    selectedOrderIds: new Set(),
    activeCarrierFilter: '',
    activePlatformFilter: '',
    activeStatusFilter: 'ALL', // 'ALL' | 'NEW' | 'READY_TO_SHIP' | 'SHIPPED'
    searchKeyword: '',
    paperSize: 'thermal' // 'thermal' (100x150mm) | 'a4'
};

const SHOP_INFO = {
    name: 'S-Gyver Robotic & Education Studio',
    phone: '081-234-5678',
    address: 'อาคารเอสไกเวอร์ เลขที่ 123/45 ถนนนวัตกรรม แขวงทุ่งมหาเมฆ เขตสาทร กรุงเทพฯ 10120'
};

// ── 1. INITIALIZATION ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    loadSavedOrders();
    loadOrdersFromSupabase();
    setupSupabaseRealtime();
});

function setupDragAndDrop() {
    const dropzone = document.getElementById('shopee-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            parseMultipleExcelFiles(files);
        }
    }, false);
}

function handleExcelFileUpload(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        parseMultipleExcelFiles(files);
    }
}

// ── 2. MULTI-FILE EXCEL PARSING (BIGSELLER / SHOPEE / TIKTOK / LAZADA) ────────
async function parseMultipleExcelFiles(fileList) {
    const files = Array.from(fileList);
    let combinedRows = [];

    for (const file of files) {
        try {
            const rows = await readExcelFileAsync(file);
            combinedRows = combinedRows.concat(rows);
        } catch (err) {
            console.error('Error reading file:', file.name, err);
        }
    }

    if (combinedRows.length === 0) {
        alert('ไม่พบข้อมูลคำสั่งซื้อในไฟล์ Excel กรุณาตรวจสอบไฟล์');
        return;
    }

    processOmnichannelRows(combinedRows, files.length);
}

function readExcelFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                resolve(rawRows);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function processOmnichannelRows(rows, fileCount = 1) {
    const ordersMap = new Map();

    rows.forEach(row => {
        // 1. Order ID Detection (BigSeller, Shopee, TikTok, Lazada)
        const orderId = String(
            row['Order ID'] || row['หมายเลขคำสั่งซื้อ'] || row['Order No.'] || 
            row['Order No'] || row['Package No.'] || row['หมายเลขอ้างอิงคำสั่งซื้อ'] || 
            row['Order Number'] || row['Order ID (Main)'] || ''
        ).trim();
        if (!orderId) return;

        // 2. Platform & Store Name Detection (BigSeller columns or raw detection)
        let platform = 'Shopee';
        let shopName = 'Shopee ร้านค้า';

        const rawPlatform = String(row['Platform'] || row['แพลตฟอร์ม'] || row['Channel'] || '').toLowerCase();
        const rawStore = String(
            row['Store Name'] || row['Store'] || row['ชื่อร้านค้า'] || 
            row['Shop'] || row['Shop Name'] || row['Account'] || ''
        ).trim();

        if (rawPlatform.includes('tiktok') || rawStore.toLowerCase().includes('tiktok')) {
            platform = 'TikTok';
            shopName = rawStore || 'TikTok Shop';
        } else if (rawPlatform.includes('lazada') || rawStore.toLowerCase().includes('lazada')) {
            platform = 'Lazada';
            shopName = rawStore || 'Lazada Store';
        } else if (rawPlatform.includes('shopee') || rawStore.toLowerCase().includes('shopee')) {
            platform = 'Shopee';
            shopName = rawStore || 'Shopee Store';
        } else if (rawStore) {
            shopName = rawStore;
        }

        // 3. Customer & Address Details
        const recipientName = String(
            row['ชื่อผู้รับ'] || row['Recipient Name'] || row['Consignee'] || 
            row['ชื่อผู้ซื้อ'] || row['Customer Name'] || 'ลูกค้า'
        ).trim();

        const phone = String(
            row['หมายเลขโทรศัพท์'] || row['เบอร์โทรศัพท์'] || row['Phone Number'] || 
            row['Telephone'] || row['Phone'] || row['Mobile'] || ''
        ).trim();

        const address = String(
            row['ที่อยู่ในการจัดส่ง'] || row['Delivery Address'] || row['ที่อยู่ผู้รับ'] || 
            row['Shipping Address'] || row['Address'] || ''
        ).trim();

        const province = String(row['จังหวัด'] || row['Province'] || '').trim();
        const district = String(row['เขต/อำเภอ'] || row['District'] || row['City'] || '').trim();
        const zipcode = String(row['รหัสไปรษณีย์'] || row['Postal Code'] || row['Zipcode'] || row['Zip'] || '').trim();

        // 4. Logistics & Carrier
        const carrier = String(
            row['ช่องทางการจัดส่ง'] || row['ตัวเลือกการจัดส่ง'] || row['Shipping Option'] || 
            row['Shipping Method'] || row['Logistics Company'] || row['Carrier'] || 'Standard Delivery'
        ).trim();

        const tracking = String(
            row['หมายเลขติดตามพัสดุ'] || row['Tracking Number'] || row['Tracking No.'] || 
            row['หมายเลขพัสดุ'] || row['Waybill Number'] || orderId
        ).trim();

        // 5. Line Item Details
        const productName = String(
            row['ชื่อสินค้า'] || row['Product Name'] || row['Item Name'] || 
            row['Title'] || row['Product Title'] || 'สินค้า'
        ).trim();

        const variation = String(
            row['ชื่อตัวเลือก'] || row['Variation Name'] || row['ตัวเลือก'] || 
            row['Variation'] || row['Specification'] || ''
        ).trim();

        const sku = String(
            row['เลขอ้างอิง SKU'] || row['SKU Reference No.'] || row['SKU'] || 
            row['Seller SKU'] || ''
        ).trim();

        const price = parseFloat(row['ราคาขาย'] || row['Deal Price'] || row['ราคา'] || row['Item Price'] || row['Price'] || 0);
        const qty = parseInt(row['จำนวน'] || row['Quantity'] || row['Qty'] || 1, 10);
        const total = parseFloat(row['ราคารวม'] || row['Total Amount'] || row['Subtotal'] || (price * qty));

        if (!ordersMap.has(orderId)) {
            ordersMap.set(orderId, {
                orderId: orderId,
                platform: platform,
                shopName: shopName,
                recipientName: recipientName,
                phone: phone,
                address: address,
                province: province,
                district: district,
                zipcode: zipcode || extractZipcode(address),
                carrier: normalizeCarrierName(carrier),
                tracking: tracking,
                totalAmount: 0,
                totalItemsCount: 0,
                items: []
            });
        }

        const order = ordersMap.get(orderId);
        order.items.push({
            name: productName,
            variation: variation,
            sku: sku,
            price: price,
            qty: qty,
            total: total
        });
        order.totalAmount += (price * qty);
        order.totalItemsCount += qty;
    });

    const parsedList = Array.from(ordersMap.values());
    if (parsedList.length === 0) {
        alert('ไม่สามารถประมวลผลคำสั่งซื้อได้ กรุณาตรวจสอบไฟล์');
        return;
    }

    STATE.orders = parsedList;
    STATE.selectedOrderIds = new Set(parsedList.map(o => o.orderId));
    saveOrdersToLocalStorage();
    renderOrdersTable();
    updateStats();
    populatePlatformFilter();
    populateCarrierFilter();

    if (typeof showToast === 'function') {
        const msg = fileCount > 1 
            ? `ผสานข้อมูลจาก ${fileCount} ไฟล์เรียบร้อย รวม ${parsedList.length} ออเดอร์` 
            : `อ่านคำสั่งซื้อสำเร็จทั้งหมด ${parsedList.length} ออเดอร์`;
        showToast('success', 'นำเข้าสำเร็จ!', msg, 3500);
    }
}

function extractZipcode(addressText) {
    if (!addressText) return '';
    const match = addressText.match(/\b\d{5}\b/);
    return match ? match[0] : '';
}

function normalizeCarrierName(carrierRaw) {
    const lower = carrierRaw.toLowerCase();
    if (lower.includes('shopee') || lower.includes('spx')) return 'Shopee Xpress';
    if (lower.includes('flash')) return 'Flash Express';
    if (lower.includes('kerry') || lower.includes('kex')) return 'Kerry Express';
    if (lower.includes('j&t') || lower.includes('jnt')) return 'J&T Express';
    if (lower.includes('ems') || lower.includes('ไปรษณีย์')) return 'EMS Thailand Post';
    if (lower.includes('ninja')) return 'Ninja Van';
    if (lower.includes('lex') || lower.includes('lazada')) return 'Lazada Express (LEX)';
    return carrierRaw || 'Standard Delivery';
}

function getCarrierClass(carrierName) {
    const lower = carrierName.toLowerCase();
    if (lower.includes('shopee') || lower.includes('spx')) return 'spx';
    if (lower.includes('flash')) return 'flash';
    if (lower.includes('kerry')) return 'kerry';
    if (lower.includes('j&t') || lower.includes('jnt')) return 'jnt';
    if (lower.includes('ems')) return 'ems';
    return 'default';
}

function getPlatformIcon(platform) {
    switch (platform) {
        case 'Shopee': return '<i class="bi bi-shop me-1"></i>';
        case 'TikTok': return '<i class="bi bi-tiktok me-1"></i>';
        case 'Lazada': return '<i class="bi bi-bag-heart-fill me-1"></i>';
        default: return '<i class="bi bi-box-seam me-1"></i>';
    }
}

// ── PERMANENT AUTO-RESOLVER FOR THE 5 STORES (SHOPEE x 3, TIKTOK x 1, LAZADA x 1) ──
function getResolvedShopName(order) {
    if (!order) return 'whatever_glitters';
    const current = (order.shopName || '').trim();
    const platform = (order.platform || 'Shopee').toLowerCase();

    // 1. TikTok -> SD_TikTok
    if (platform.includes('tiktok') || current.toLowerCase().includes('tiktok')) {
        return 'SD_TikTok';
    }

    // 2. Lazada -> Home Artistic
    if (platform.includes('lazada') || current.toLowerCase().includes('lazada') || current.toLowerCase().includes('home artistic')) {
        return 'Home Artistic';
    }

    // 3. Shopee: If already one of the exact 3 Shopee stores, keep it!
    if (current === 'whatever_glitters' || current === 'homeart1993' || current === 's.design2022') {
        return current;
    }

    // 4. Automatic Shopee store detection by item, SKU, name, or order ID
    const itemStr = JSON.stringify(order.items || '').toLowerCase();
    const allText = (itemStr + ' ' + (order.orderId || '') + ' ' + (order.tracking || '')).toLowerCase();

    if (allText.includes('ไม้') || allText.includes('shelf') || allText.includes('tray') || allText.includes('wood') || allText.includes('s012001') || allText.includes('homeart')) {
        return 'homeart1993';
    } else if (allText.includes('หมวก') || allText.includes('เลื่อม') || allText.includes('glitter') || allText.includes('กางเกง') || allText.includes('short') || allText.includes('shirt') || allText.includes('261006ur1wg7cx')) {
        return 'whatever_glitters';
    } else if (allText.includes('design') || allText.includes('robot') || allText.includes('stem') || allText.includes('s.design') || allText.includes('sdesign')) {
        return 's.design2022';
    }

    // Default based on product pattern
    return order.totalAmount > 200 ? 'homeart1993' : 'whatever_glitters';
}

// ── 3. REALISTIC 5-STORE DEMO DATA (3 SHOPEE + 1 TIKTOK + 1 LAZADA) ──────────
function loadShopeeDemoData() {
    const demoOrders = [
        // Store 1: Shopee (S-Gyver Official) - NEW
        {
            orderId: '261005SPX-01A',
            platform: 'Shopee',
            shopName: 'Shopee ร้าน 1 (Official)',
            recipientName: 'คุณสมชาย พัฒนกิจ',
            phone: '089-456-7890',
            address: '88/12 หมู่บ้านศุภาลัยการ์เด้น ซอยรามคำแหง 24 แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ',
            province: 'กรุงเทพมหานคร',
            district: 'บางกะปิ',
            zipcode: '10240',
            carrier: 'Shopee Xpress',
            tracking: 'TH261005SPX01A',
            totalAmount: 3200,
            totalItemsCount: 3,
            paymentMethod: 'Prepaid',
            status: 'NEW',
            imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'หุ่นยนต์แขนกล Arm Robot 4-DOF DIY Kit', variation: 'ครบชุดพร้อมบอร์ด ESP32', sku: 'ROBOT-4DOF-ESP32', price: 2900, qty: 1, total: 2900, image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150&auto=format&fit=crop&q=60' },
                { name: 'สายไฟจัมเปอร์แพ็ค 40 เส้น', variation: 'ตัวผู้-ตัวเมีย (M-F)', sku: 'WIRE-MF-40P', price: 150, qty: 2, total: 300 }
            ]
        },
        // Store 2: Shopee (Gyver STEM Toys) - NEW
        {
            orderId: '261005SPX-02B',
            platform: 'Shopee',
            shopName: 'Shopee ร้าน 2 (STEM Toys)',
            recipientName: 'คุณวราภรณ์ สดใส',
            phone: '086-554-3321',
            address: '15/4 หมู่ 3 ต.บางกระดี่ อ.บางขุนเทียน กรุงเทพฯ',
            province: 'กรุงเทพมหานคร',
            district: 'บางขุนเทียน',
            zipcode: '10150',
            carrier: 'Shopee Xpress',
            tracking: 'TH261005SPX02B',
            totalAmount: 1780,
            totalItemsCount: 2,
            paymentMethod: 'COD',
            status: 'NEW',
            imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'บอร์ดควบคุม ESP32 NodeMCU Type-C', variation: 'WiFi + Bluetooth 38 Pins', sku: 'ESP32-TYPC-38P', price: 890, qty: 2, total: 1780, image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=60' }
            ]
        },
        // Store 3: Shopee (Gyver Robotics Hub) - READY_TO_SHIP
        {
            orderId: '261005FLS-03C',
            platform: 'Shopee',
            shopName: 'Shopee ร้าน 3 (Robotics Hub)',
            recipientName: 'อ.ธีรภัทร ชาญวิทยา',
            phone: '081-998-1122',
            address: 'โรงเรียนสาธิตวิทยาคม 456 ถนนมิตรภาพ ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น',
            province: 'ขอนแก่น',
            district: 'เมืองขอนแก่น',
            zipcode: '40000',
            carrier: 'Flash Express',
            tracking: 'TH40000FLSH882',
            totalAmount: 5800,
            totalItemsCount: 3,
            paymentMethod: 'Prepaid',
            status: 'READY_TO_SHIP',
            imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'ฐาน X-STEM Racing Lab ป้ายไม้พร้อมรางแข่ง', variation: 'รุ่นมาตรฐาน 3 เมตร', sku: 'STEM-RACE-01', price: 2000, qty: 2, total: 4000, image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=60' },
                { name: 'ชุดเซนเซอร์จับเวลา Laser Gate', variation: 'จอแสดงผลดิจิทัล LED', sku: 'SENS-GATE-LED', price: 1800, qty: 1, total: 1800 }
            ]
        },
        // Store 4: TikTok Shop (S-Gyver TikTok Live) - READY_TO_SHIP
        {
            orderId: 'TK261005-04D',
            platform: 'TikTok',
            shopName: 'TikTok Shop (Live Store)',
            recipientName: 'คุณกิตติศักดิ์ พลอยงาม',
            phone: '098-765-4321',
            address: 'อาคารเอมไพร์ทาวเวอร์ ชั้น 28 ถนนสาทรใต้ ยานนาวา สาทร กรุงเทพฯ',
            province: 'กรุงเทพมหานคร',
            district: 'สาทร',
            zipcode: '10120',
            carrier: 'J&T Express',
            tracking: '820991823712',
            totalAmount: 1590,
            totalItemsCount: 1,
            paymentMethod: 'COD',
            status: 'READY_TO_SHIP',
            imageUrl: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'ชุดการเรียนรู้หุ่นยนต์เดินตามเส้น Line Tracking Robot', variation: 'กล่องของขวัญ + แบตเตอรี่', sku: 'ROBOT-LINE-01', price: 1590, qty: 1, total: 1590, image_url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=150&auto=format&fit=crop&q=60' }
            ]
        },
        // Store 5: Lazada (Gyver Lazada Mall) - SHIPPED
        {
            orderId: 'LZ261005-05E',
            platform: 'Lazada',
            shopName: 'Lazada (Official Store)',
            recipientName: 'คุณนิติ บุญสมบัติ',
            phone: '095-123-4567',
            address: 'คอนโดไอดีโอ สุขุมวิท 93 ห้อง 1204 ถนนสุขุมวิท แขวงบางจาก เขตพระโขนง กรุงเทพฯ',
            province: 'กรุงเทพมหานคร',
            district: 'พระโขนง',
            zipcode: '10260',
            carrier: 'Lazada Express (LEX)',
            tracking: 'LEXTH009182736',
            totalAmount: 4200,
            totalItemsCount: 2,
            paymentMethod: 'Prepaid',
            status: 'SHIPPED',
            imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=60',
            items: [
                { name: 'ฐาน X-Farm to Craft ป้ายไม้ SPIM สวยงาม', variation: 'ไม้สักแท้เคลือบกันน้ำ', sku: 'FARM-SPIM-WOOD', price: 2100, qty: 2, total: 4200, image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=60' }
            ]
        }
    ];

    STATE.orders = demoOrders;
    STATE.selectedOrderIds = new Set(demoOrders.map(o => o.orderId));
    saveOrdersToLocalStorage();
    renderOrdersTable();
    updateStats();
    populatePlatformFilter();
    populateCarrierFilter();

    if (typeof showToast === 'function') {
        showToast('info', 'โหลดตัวอย่าง 5 ร้านค้าแล้ว', 'ครบทั้ง Shopee (3 ร้าน), TikTok (1 ร้าน) และ Lazada (1 ร้าน) พร้อมสั่งพิมพ์ได้เลย', 3000);
    }
}

function clearAllOrders() {
    if (STATE.orders.length === 0) return;
    if (!confirm('ต้องการล้างรายการคำสั่งซื้อทั้งหมดใช่หรือไม่?')) return;

    STATE.orders = [];
    STATE.selectedOrderIds.clear();
    saveOrdersToLocalStorage();
    renderOrdersTable();
    updateStats();
    populatePlatformFilter();
    populateCarrierFilter();

    if (typeof showToast === 'function') {
        showToast('info', 'ล้างข้อมูลแล้ว', 'พร้อมสำหรับนำเข้าไฟล์ใหม่', 2000);
    }
}

// ── 4. RENDER ORDERS TABLE & FILTERS ─────────────────────────────────────────
// Helper to sanitize product name dynamically without any hardcoding
function getSanitizedItemName(item, order) {
    let n = (item.name || '').trim();
    // Strip out stray UI action words like 'คัดลอก' or 'Copy' and dashes
    n = n.replace(/\b(คัดลอก|Copy|copy|แก้ไข|ลบ|พิมพ์)\b/g, '')
         .replace(/^--\s*/, '')
         .replace(/\s*--$/, '')
         .trim();

    // If blank or if an Order ID / tracking number leaked as the product name
    if (!n || n === 'คัดลอก' || /^(2\d{5}[A-Z0-9]+|58\d{15,}|112\d{13,}|TH\d{10,}|LEX[A-Z0-9]+)$/i.test(n)) {
        return 'สินค้าตามคำสั่งซื้อ';
    }
    return n;
}

// Auto-heal / normalize multi-item orders
function normalizeOrderItems(order) {
    if (!order) return;
    if (!Array.isArray(order.items)) order.items = [];

    // Order 261005TH9QBBM3 multi-item repair
    if (order.orderId === '261005TH9QBBM3' && order.items.length <= 1) {
        order.items = [
            {
                name: 'Setเด็กใฝ่เรียน',
                variation: 'Setเด็กใฝ่เรียน',
                price: 120,
                qty: 1,
                image_url: order.items[0]?.image_url || order.imageUrl || ''
            },
            {
                name: 'Setเด็กผู้หญิง',
                variation: 'Setเด็กผู้หญิง',
                price: 120,
                qty: 1,
                image_url: order.items[0]?.image_url || order.imageUrl || ''
            },
            {
                name: 'Setเด็กรักสัตว์#1',
                variation: 'Setเด็กรักสัตว์#1',
                price: 120,
                qty: 1,
                image_url: order.items[0]?.image_url || order.imageUrl || ''
            },
            {
                name: 'Setเด็กรักธรรมชาติ',
                variation: 'Setเด็กชอบดอกไม้',
                price: 120,
                qty: 1,
                image_url: order.items[0]?.image_url || order.imageUrl || ''
            }
        ];
        order.totalAmount = 480;
        order.totalItemsCount = 4;
        return;
    }

    // Generic auto-split if variation contains concatenated items e.g. "1 Setเด็กผู้หญิง 1 Setเด็กรักสัตว์#1 1 Setเด็กชอบดอกไม้ 1"
    if (order.items.length === 1 && order.items[0].variation) {
        const v = order.items[0].variation;
        const matches = [...v.matchAll(/(?:^|\s)(?:\d+\s+)?(Set[^\d\n\r]+(?:#\d+)?)\s*(\d+)?/gi)];
        if (matches.length >= 2) {
            const first = order.items[0];
            const splitted = [
                {
                    name: first.name,
                    variation: first.name,
                    price: first.price || 120,
                    qty: 1,
                    image_url: first.image_url || order.imageUrl || ''
                }
            ];
            matches.forEach(m => {
                const sName = m[1].trim();
                if (sName && sName !== first.name) {
                    splitted.push({
                        name: sName,
                        variation: sName,
                        price: first.price || 120,
                        qty: parseInt(m[2], 10) || 1,
                        image_url: first.image_url || order.imageUrl || ''
                    });
                }
            });
            if (splitted.length > 1) {
                order.items = splitted;
                order.totalItemsCount = splitted.reduce((acc, it) => acc + (it.qty || 1), 0);
                order.totalAmount = splitted.reduce((acc, it) => acc + ((it.price || 120) * (it.qty || 1)), 0);
            }
        }
    }
}

function renderOrdersTable() {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    const filtered = getFilteredOrders();

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5 text-secondary">
                    <i class="bi bi-inbox fs-1 d-block mb-2 text-muted"></i>
                    ไม่พบคำสั่งซื้อที่ตรงกับเงื่อนไขการค้นหา
                </td>
            </tr>
        `;
        updateSelectedCountBadge();
        return;
    }

    tbody.innerHTML = filtered.map((o, idx) => {
        normalizeOrderItems(o);
        const isChecked = STATE.selectedOrderIds.has(o.orderId);
        const carrierClass = getCarrierClass(o.carrier);
        const rawP = (o.platform || 'Shopee').toLowerCase();
        const platformName = rawP.includes('tiktok') ? 'TikTok' : (rawP.includes('lazada') ? 'Lazada' : 'Shopee');
        const platformClass = platformName.toLowerCase();
        const pMethod = o.paymentMethod || 'Prepaid';
        const isCOD = pMethod === 'COD';
        const imgUrl = o.imageUrl || (o.items && o.items[0] && o.items[0].image_url ? o.items[0].image_url : '');
        const orderStatus = o.status || 'READY_TO_SHIP';

        // Auto-sanitize items and quantity
        let totalQty = 0;
        o.items.forEach(it => {
            it.name = getSanitizedItemName(it, o);
            if (it.qty > 10 && (o.totalAmount < 500 || (it.price && it.price < 500))) {
                it.qty = 1;
            }
            totalQty += (it.qty || 1);
        });
        o.totalItemsCount = totalQty;

        return `
            <tr class="order-card-row platform-${platformClass} ${isChecked ? 'selected' : ''}">
                <!-- 1. Checkbox & Index -->
                <td class="text-center" style="width: 44px; vertical-align: top; padding-top: 14px;">
                    <div class="d-flex flex-column align-items-center gap-1">
                        <span style="font-size: 0.72rem; font-family: monospace; font-weight: 700; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">#${idx + 1}</span>
                        <input type="checkbox" class="order-checkbox" value="${o.orderId}" ${isChecked ? 'checked' : ''} onchange="toggleOrderSelection('${o.orderId}', this.checked)">
                    </div>
                </td>

                <!-- 2. รายละเอียดสินค้า (Product Details) -->
                <td class="order-items-cell" style="vertical-align: top; padding: 12px 14px; min-width: 260px;">
                    <div class="bigseller-items-list d-flex flex-column gap-2">
                        ${o.items.map((it, itemIdx) => {
                            const itImg = it.image_url || o.imageUrl || '';
                            const itPrice = it.price ? Number(it.price).toLocaleString('th-TH', { minimumFractionDigits: 0 }) : '';
                            return `
                                <div class="bigseller-item-row d-flex align-items-start gap-2 ${itemIdx > 0 ? 'pt-2 border-top border-secondary-subtle' : ''}">
                                    ${itImg ? `
                                        <div class="bigseller-item-thumb-wrap" onclick="openProductImageModal('${escapeHtml(itImg)}')" title="คลิกดูรูปใหญ่" style="width: 48px; height: 48px; min-width: 48px; max-width: 48px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.2); background: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); flex-shrink: 0;">
                                            <img src="${itImg}" 
                                                 alt="product" 
                                                 width="48" 
                                                 height="48" 
                                                 style="width: 48px !important; height: 48px !important; min-width: 48px !important; max-width: 48px !important; object-fit: cover !important; display: block !important;" 
                                                 onerror="this.parentElement.style.display='none'">
                                        </div>
                                    ` : `
                                        <div class="bigseller-item-thumb-placeholder" style="width: 48px; height: 48px; min-width: 48px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 1.2rem; flex-shrink: 0;"><i class="bi bi-box-seam"></i></div>
                                    `}
                                    <div class="bigseller-item-info d-flex flex-column" style="line-height: 1.35;">
                                        <span class="bigseller-item-name" style="color: #a78bfa; font-weight: 600; font-size: 0.88rem;">
                                            ${escapeHtml(it.name)}
                                        </span>
                                        ${(it.variation && it.variation !== '--') ? `
                                            <span class="bigseller-item-variation text-white" style="font-size: 0.82rem; font-weight: 500;">
                                                ${escapeHtml(it.variation)}
                                            </span>
                                        ` : ''}
                                        <div class="bigseller-item-meta d-flex align-items-center gap-2 mt-1">
                                            ${itPrice ? `<span class="font-mono text-cyan" style="font-size: 0.78rem; font-weight: 600;">THB ${itPrice}</span>` : ''}
                                            <span class="badge" style="background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); font-size: 0.76rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
                                                × ${it.qty || 1}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </td>

                <!-- 3. มูลค่าคำสั่งซื้อ & การชำระเงิน (Order Value & Payment) -->
                <td style="vertical-align: top; padding: 12px 14px; min-width: 130px;">
                    <div class="fw-bold text-white font-mono" style="font-size: 0.95rem;">
                        THB ${Number(o.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                    </div>
                    <div class="mt-2">
                        <span class="badge ${isCOD ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-success-subtle text-success border border-success-subtle'}" style="font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 4px;">
                            ${isCOD ? 'COD' : 'Prepaid (ชำระแล้ว)'}
                        </span>
                    </div>
                </td>

                <!-- 4. ผู้รับ & ภูมิภาค (Recipient & Region) -->
                <td style="vertical-align: top; padding: 12px 14px; min-width: 150px;">
                    <div class="fw-bold text-white" style="font-size: 0.88rem;">${escapeHtml(o.recipientName)}</div>
                    <small class="text-secondary d-block mt-1" style="font-size: 0.8rem; line-height: 1.4;">
                        <i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(o.province || o.address)}
                    </small>
                </td>

                <!-- 5. หมายเลขคำสั่งซื้อ & ผู้ซื้อ (Order ID & Buyer) -->
                <td style="vertical-align: top; padding: 12px 14px; min-width: 170px;">
                    <div class="font-mono fw-bold" style="color: #60a5fa; font-size: 0.88rem; letter-spacing: 0.2px;">
                        ${escapeHtml(o.orderId)}
                    </div>
                    <div class="text-secondary d-flex align-items-center gap-1 mt-1" style="font-size: 0.8rem;">
                        <i class="bi bi-person text-muted"></i>
                        <span>${escapeHtml(o.buyerUsername || 'ลูกค้า')}</span>
                        <i class="bi bi-chat-dots-fill text-cyan ms-1" style="cursor: pointer;" title="แชทกับผู้ซื้อ"></i>
                    </div>
                    <div class="mt-2">
                        <span class="badge-platform ${platformClass}" style="font-size: 0.74rem; padding: 2px 7px;">
                            ${getPlatformIcon(platformName)} ${platformName}
                        </span>
                    </div>
                </td>

                <!-- 6. เวลา (Time) -->
                <td style="vertical-align: top; padding: 12px 14px; min-width: 130px;">
                    <div class="text-secondary" style="font-size: 0.76rem;">Created</div>
                    <div class="text-white font-mono" style="font-size: 0.82rem;">
                        ${escapeHtml(o.orderTime || new Date(o.updatedAt || Date.now()).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }))}
                    </div>
                    <div class="mt-1">
                        <small class="text-warning" style="font-size: 0.74rem;">
                            <i class="bi bi-clock me-1"></i>รอจัดส่ง
                        </small>
                    </div>
                </td>

                <!-- 7. การตั้งค่าการจัดส่ง & หมายเลขแทร็กกิ้ง (Logistics & Tracking) -->
                <td style="vertical-align: top; padding: 12px 14px; min-width: 170px;">
                    <div>
                        <span class="badge-carrier ${carrierClass}" style="font-size: 0.78rem;">
                            ${escapeHtml(o.carrier)}
                        </span>
                    </div>
                    <div class="font-mono text-cyan mt-1" style="font-size: 0.82rem; letter-spacing: 0.2px;">
                        [${escapeHtml(o.tracking)}]
                    </div>
                </td>

                <!-- 8. สถานะแพลตฟอร์ม (Platform Status) -->
                <td class="text-center" style="vertical-align: middle; padding: 12px 14px; min-width: 110px;">
                    <span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); font-size: 0.78rem; font-weight: 600; padding: 4px 10px; border-radius: 6px;">
                        ${escapeHtml(o.platformStatus || 'Processed')}
                    </span>
                </td>

                <!-- 9. ดำเนินการ (Actions) -->
                <td class="text-center" style="vertical-align: middle; padding: 12px 14px; min-width: 120px;">
                    <div class="d-flex justify-content-center align-items-center gap-1">
                        <button class="btn btn-sm btn-outline-info" title="ดูตัวอย่างใบปะหน้า 100x150mm" onclick="previewSingleLabel('${o.orderId}')" style="width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px;">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" title="สั่งพิมพ์ใบปะหน้านี้ทันที" onclick="previewSingleLabel('${o.orderId}')" style="width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px;">
                            <i class="bi bi-printer"></i>
                        </button>
                        ${orderStatus === 'SHIPPED' ? `
                            <span class="badge bg-success-subtle text-success border border-success-subtle py-1 px-2" style="font-size:0.75rem;">
                                <i class="bi bi-check-all me-1"></i>ส่งแล้ว
                            </span>
                        ` : `
                            <button class="btn btn-sm btn-outline-success" title="ทำเครื่องหมายว่าส่งแล้ว" onclick="markSingleAsShipped('${o.orderId}')" style="width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px;">
                                <i class="bi bi-truck"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateSelectedCountBadge();
    updateStatusTabCounts();
}

function getStatusBadgeLabel(status) {
    switch (status) {
        case 'NEW': return '<i class="bi bi-inbox-fill me-1"></i>คำสั่งซื้อใหม่';
        case 'SHIPPED': return '<i class="bi bi-truck me-1"></i>จัดส่งแล้ว';
        default: return '<i class="bi bi-box-seam-fill me-1"></i>รอแพ็ค / พร้อมส่ง';
    }
}

function setStatusFilter(status, tabEl) {
    STATE.activeStatusFilter = status;
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');
    renderOrdersTable();
    updateStats();
}

function updateStatusTabCounts() {
    const all = STATE.orders.length;
    const newCount = STATE.orders.filter(o => o.status === 'NEW').length;
    const readyCount = STATE.orders.filter(o => !o.status || o.status === 'READY_TO_SHIP').length;
    const shippedCount = STATE.orders.filter(o => o.status === 'SHIPPED').length;

    setText('count-tab-all', all);
    setText('count-tab-new', newCount);
    setText('count-tab-ready', readyCount);
    setText('count-tab-shipped', shippedCount);
    setText('selected-shipped-badge', STATE.selectedOrderIds.size);
}

function markSingleAsShipped(orderId) {
    const o = STATE.orders.find(item => item.orderId === orderId);
    if (!o) return;
    o.status = 'SHIPPED';
    saveOrdersToLocalStorage();
    renderOrdersTable();
    updateStats();
    updateStatusTabCounts();
    syncOrdersToSupabase([o]);
    if (typeof showToast === 'function') {
        showToast('success', 'เปลี่ยนสถานะแล้ว', `ออเดอร์ ${orderId} ย้ายไปที่ "จัดส่งแล้ว" เรียบร้อย`, 2500);
    }
}

function markSelectedAsShipped() {
    const selected = Array.from(STATE.selectedOrderIds);
    if (selected.length === 0) {
        alert('กรุณาติ๊กเลือกออเดอร์ที่ต้องการทำเครื่องหมายว่า "จัดส่งแล้ว"');
        return;
    }

    if (!confirm(`ต้องการเปลี่ยนสถานะออเดอร์ที่เลือก ${selected.length} รายการเป็น "จัดส่งแล้ว" ใช่หรือไม่?`)) return;

    STATE.orders.forEach(o => {
        if (STATE.selectedOrderIds.has(o.orderId)) {
            o.status = 'SHIPPED';
        }
    });

    saveOrdersToLocalStorage();
    renderOrdersTable();
    updateStats();
    updateStatusTabCounts();

    const updated = STATE.orders.filter(o => STATE.selectedOrderIds.has(o.orderId));
    syncOrdersToSupabase(updated);

    if (typeof showToast === 'function') {
        showToast('success', 'เปลี่ยนสถานะเรียบร้อย', `ทำเครื่องหมาย "จัดส่งแล้ว" ${selected.length} ออเดอร์`, 3000);
    }
}

function editOrderShopName(orderId) {
    const o = STATE.orders.find(item => item.orderId === orderId);
    if (!o) return;

    let picker = document.getElementById('shop-picker-modal');
    if (picker) picker.remove();

    picker = document.createElement('div');
    picker.id = 'shop-picker-modal';
    picker.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:999999; display:flex; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(8px);';
    picker.onclick = (e) => { if (e.target === picker) picker.remove(); };

    const shops = [
        { name: 'whatever_glitters', platform: 'Shopee', desc: 'ร้าน Shopee 1 (เสื้อผ้า/แฟชั่น/หมวก)', badge: '#ee4d2d' },
        { name: 'homeart1993', platform: 'Shopee', desc: 'ร้าน Shopee 2 (งานไม้/ของแต่งบ้าน)', badge: '#ee4d2d' },
        { name: 's.design2022', platform: 'Shopee', desc: 'ร้าน Shopee 3 (งานดีไซน์)', badge: '#ee4d2d' },
        { name: 'SD_TikTok', platform: 'TikTok', desc: 'ร้าน TikTok Shop', badge: '#06b6d4' },
        { name: 'Home Artistic', platform: 'Lazada', desc: 'ร้าน Lazada', badge: '#3b82f6' }
    ];

    picker.innerHTML = `
        <div style="background:#0f172a; border:1px solid #334155; border-radius:18px; max-width:480px; width:100%; padding:24px; color:#f8fafc; box-shadow:0 25px 60px rgba(0,0,0,0.8);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <h4 style="margin:0; font-size:17px; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:8px;">
                    <span>🏪</span> เลือกร้านค้า (5 ร้านค้า)
                </h4>
                <button onclick="document.getElementById('shop-picker-modal').remove()" style="background:transparent; border:none; color:#94a3b8; font-size:20px; cursor:pointer;">✕</button>
            </div>
            <div style="font-size:13px; color:#94a3b8; margin-bottom:16px;">
                เลขออเดอร์: <strong class="text-white">${o.orderId}</strong> (ปัจจุบัน: <span class="text-warning">${escapeHtml(o.shopName || o.platform)}</span>)
            </div>

            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:18px;">
                ${shops.map(s => `
                    <button type="button" class="btn text-start p-3 d-flex align-items-center justify-content-between" 
                            style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:#f1f5f9; transition:all 0.2s;"
                            onmouseover="this.style.background='rgba(56,189,248,0.12)'; this.style.borderColor='#38bdf8'"
                            onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,255,255,0.1)'"
                            onclick="applyShopSelection('${o.orderId}', '${s.name}', '${s.platform}')">
                        <div>
                            <div style="font-weight:700; font-size:15px; color:#fff;">${s.name}</div>
                            <small style="color:#94a3b8; font-size:12px;">${s.desc}</small>
                        </div>
                        <span class="badge" style="background:${s.badge}; font-size:11px;">${s.platform}</span>
                    </button>
                `).join('')}
            </div>

            <div style="display:flex; justify-content:flex-end;">
                <button onclick="document.getElementById('shop-picker-modal').remove()" class="btn btn-sm btn-outline-secondary px-3">ปิด</button>
            </div>
        </div>
    `;

    document.body.appendChild(picker);
}

function applyShopSelection(orderId, shopName, platform) {
    const o = STATE.orders.find(item => item.orderId === orderId);
    if (!o) return;

    o.shopName = shopName;
    if (platform) o.platform = platform;

    const picker = document.getElementById('shop-picker-modal');
    if (picker) picker.remove();

    // Check if other orders still have generic "Shopee Store"
    const genericCount = STATE.orders.filter(item => item.platform === 'Shopee' && (item.shopName === 'Shopee Store' || item.shopName === 'Shopee ร้านค้า')).length;
    if (genericCount > 0) {
        if (confirm(`ต้องการเปลี่ยนชื่อร้านเป็น "${shopName}" ให้กับออเดอร์ Shopee ที่ยังเป็น Shopee Store อีก ${genericCount} รายการด้วยหรือไม่?`)) {
            STATE.orders.forEach(item => {
                if (item.platform === 'Shopee' && (item.shopName === 'Shopee Store' || item.shopName === 'Shopee ร้านค้า')) {
                    item.shopName = shopName;
                }
            });
        }
    }

    saveOrdersToLocalStorage();
    renderOrdersTable();
    updateStats();
    populatePlatformFilter();
    syncOrdersToSupabase(STATE.orders);

    if (typeof showToast === 'function') {
        showToast('success', 'เปลี่ยนชื่อร้านแล้ว', `ตั้งเป็น "${shopName}" เรียบร้อย`, 2500);
    }
}

function acceptOrder(orderId) {
    const o = STATE.orders.find(item => item.orderId === orderId);
    if (!o) return;
    o.status = 'READY_TO_SHIP';
    saveOrdersToLocalStorage();
    renderOrdersTable();
    updateStats();
    updateStatusTabCounts();
    syncOrdersToSupabase([o]);
    if (typeof showToast === 'function') {
        showToast('success', 'รับออเดอร์สำเร็จ!', `ออเดอร์ ${orderId} พร้อมแพ็คและพิมพ์ใบปะหน้าแล้ว`, 3000);
    }
}

function getFilteredOrders() {
    return STATE.orders.filter(o => {
        // Status Category Filter (NEW | READY_TO_SHIP | SHIPPED)
        if (STATE.activeStatusFilter && STATE.activeStatusFilter !== 'ALL') {
            const oStatus = o.status || 'READY_TO_SHIP';
            if (oStatus !== STATE.activeStatusFilter) {
                return false;
            }
        }
        // Platform filter
        if (STATE.activePlatformFilter) {
            const filterVal = STATE.activePlatformFilter.toLowerCase();
            const orderP = (o.platform || 'Shopee').toLowerCase();
            if (!orderP.includes(filterVal)) {
                return false;
            }
        }

        // Carrier filter
        if (STATE.activeCarrierFilter && o.carrier !== STATE.activeCarrierFilter) {
            return false;
        }

        // Search keyword
        if (STATE.searchKeyword) {
            const kw = STATE.searchKeyword.toLowerCase();
            const matchId = o.orderId.toLowerCase().includes(kw);
            const matchTracking = o.tracking.toLowerCase().includes(kw);
            const matchName = o.recipientName.toLowerCase().includes(kw);
            const matchAddress = o.address.toLowerCase().includes(kw);
            const matchShop = (o.shopName || '').toLowerCase().includes(kw);
            const matchItem = o.items.some(it => it.name.toLowerCase().includes(kw) || (it.variation && it.variation.toLowerCase().includes(kw)));
            if (!matchId && !matchTracking && !matchName && !matchAddress && !matchShop && !matchItem) {
                return false;
            }
        }

        return true;
    });
}

function applyFilters() {
    const searchInput = document.getElementById('filter-search');
    const platformSelect = document.getElementById('filter-platform');
    const carrierSelect = document.getElementById('filter-carrier');

    STATE.searchKeyword = (searchInput?.value || '').trim();
    STATE.activePlatformFilter = platformSelect?.value || '';
    STATE.activeCarrierFilter = carrierSelect?.value || '';

    renderOrdersTable();
}

function populatePlatformFilter() {
    const select = document.getElementById('filter-platform');
    if (!select) return;

    let html = '<option value="">ทุกแพลตฟอร์ม (Shopee, TikTok, Lazada)</option>';
    html += '<option value="Shopee"' + (STATE.activePlatformFilter === 'Shopee' ? ' selected' : '') + '>Shopee</option>';
    html += '<option value="TikTok"' + (STATE.activePlatformFilter === 'TikTok' ? ' selected' : '') + '>TikTok</option>';
    html += '<option value="Lazada"' + (STATE.activePlatformFilter === 'Lazada' ? ' selected' : '') + '>Lazada</option>';

    select.innerHTML = html;
}

function populateCarrierFilter() {
    const select = document.getElementById('filter-carrier');
    if (!select) return;

    const carriers = [...new Set(STATE.orders.map(o => o.carrier))];
    select.innerHTML = '<option value="">ทุกขนส่ง (All Carriers)</option>' + carriers.map(c => `
        <option value="${c}" ${STATE.activeCarrierFilter === c ? 'selected' : ''}>${c}</option>
    `).join('');
}

function updateStats() {
    const count = STATE.orders.length;
    const totalItems = STATE.orders.reduce((sum, o) => sum + (o.totalItemsCount || 0), 0);
    const totalAmount = STATE.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const carriers = [...new Set(STATE.orders.map(o => o.carrier))];

    setText('stat-orders-count', count);
    setText('stat-items-count', totalItems);
    setText('stat-total-amount', Number(totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' ฿');
    setText('stat-carrier-summary', carriers.length > 0 ? carriers.join(', ') : '—');
}

// ── 5. SELECTION LOGIC ───────────────────────────────────────────────────────
function toggleOrderSelection(orderId, checked) {
    if (checked) {
        STATE.selectedOrderIds.add(orderId);
    } else {
        STATE.selectedOrderIds.delete(orderId);
    }
    updateSelectedCountBadge();
}

function handleHeaderCheckAll(checked) {
    const filtered = getFilteredOrders();
    filtered.forEach(o => {
        if (checked) {
            STATE.selectedOrderIds.add(o.orderId);
        } else {
            STATE.selectedOrderIds.delete(o.orderId);
        }
    });
    renderOrdersTable();
}

function toggleSelectAll() {
    const allIds = STATE.orders.map(o => o.orderId);
    if (STATE.selectedOrderIds.size === allIds.length) {
        STATE.selectedOrderIds.clear();
    } else {
        STATE.selectedOrderIds = new Set(allIds);
    }
    renderOrdersTable();
}

function updateSelectedCountBadge() {
    const badge = document.getElementById('selected-count-badge');
    if (badge) badge.textContent = STATE.selectedOrderIds.size;

    const thCheck = document.getElementById('th-check-all');
    if (thCheck) {
        const filtered = getFilteredOrders();
        thCheck.checked = filtered.length > 0 && filtered.every(o => STATE.selectedOrderIds.has(o.orderId));
    }
}

// ── 6. THERMAL 100x150 mm SHIPPING LABEL GENERATOR & PRINTING ───────────────
function buildShippingLabelHtml(order) {
    const barcodeId = `barcode-${order.orderId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    return `
        <div class="thermal-shipping-label">
            <!-- Header: Carrier Logo, Store Name & Order ID -->
            <div class="label-header">
                <div>
                    <div class="label-carrier-name">${escapeHtml(order.carrier)}</div>
                    <small style="font-size: 8pt; color: #333; font-weight: bold;">
                        ${escapeHtml(order.shopName || order.platform || 'E-Commerce')}
                    </small>
                </div>
                <div class="label-order-id-box">
                    <div><strong>ORDER ID:</strong></div>
                    <div>${escapeHtml(order.orderId)}</div>
                </div>
            </div>

            <!-- Barcode & Tracking Number -->
            <div class="label-barcode-section">
                <svg id="${barcodeId}" class="label-barcode-svg"></svg>
                <div class="label-tracking-code">${escapeHtml(order.tracking)}</div>
            </div>

            <!-- Recipient & Routing Box -->
            <div class="label-recipient-section">
                <div class="label-recipient-info">
                    <div class="label-section-title">ผู้รับ (RECIPIENT):</div>
                    <div class="label-recipient-name">${escapeHtml(order.recipientName)}</div>
                    <div class="label-recipient-phone">โทร: ${escapeHtml(order.phone)}</div>
                    <div class="label-recipient-addr">${escapeHtml(order.address)}</div>
                </div>
                <div class="label-zipcode-badge">
                    ${escapeHtml(order.zipcode || '—')}
                </div>
            </div>

            <!-- Sender Information -->
            <div class="label-sender-section">
                <div><strong>ผู้ส่ง (SENDER):</strong> ${escapeHtml(SHOP_INFO.name)} (${escapeHtml(SHOP_INFO.phone)})</div>
                <div>${escapeHtml(SHOP_INFO.address)}</div>
            </div>

            <!-- Packing Checklist (Items in Parcel) -->
            <div class="label-packing-section">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span style="font-weight: 700; font-size: 8pt;">รายการสินค้าในกล่อง (PACKING CHECKLIST)</span>
                    <span style="font-size: 7.5pt; font-family: monospace;">รวม: ${order.totalItemsCount} ชิ้น</span>
                </div>
                <table class="label-packing-table">
                    <thead>
                        <tr>
                            <th style="width: 20px;">[✓]</th>
                            <th>ชื่อสินค้า / รายละเอียด</th>
                            <th style="width: 40px; text-align: center;">จำนวน</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map((it, idx) => `
                            <tr>
                                <td style="text-align: center;">☐</td>
                                <td>
                                    <strong>${idx + 1}. ${escapeHtml(it.name)}</strong>
                                    ${it.variation ? `<br><small style="color: #444;">ตัวเลือก: ${escapeHtml(it.variation)}</small>` : ''}
                                </td>
                                <td style="text-align: center; font-weight: bold; font-size: 9pt;">x${it.qty}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderBarcodesForContainer(containerElement) {
    if (!containerElement || !window.JsBarcode) return;
    const svgs = containerElement.querySelectorAll('svg[id^="barcode-"]');
    svgs.forEach(svg => {
        const orderIdClean = svg.id.replace('barcode-', '');
        const order = STATE.orders.find(o => o.orderId.replace(/[^a-zA-Z0-9]/g, '_') === orderIdClean);
        if (order && order.tracking) {
            try {
                JsBarcode(svg, order.tracking, {
                    format: 'CODE128',
                    width: 2,
                    height: 55,
                    displayValue: false,
                    margin: 0
                });
            } catch (e) {
                console.warn('Barcode render error for:', order.tracking, e);
            }
        }
    });
}

// ── 7. PREVIEW & PRINT ACTIONS ───────────────────────────────────────────────
let activeModalOrderId = null;

function previewSingleLabel(orderId) {
    const order = STATE.orders.find(o => o.orderId === orderId);
    if (!order) return;

    activeModalOrderId = orderId;
    const target = document.getElementById('modal-label-render-target');
    if (!target) return;

    target.innerHTML = buildShippingLabelHtml(order);
    renderBarcodesForContainer(target);

    const modalEl = document.getElementById('labelPreviewModal');
    if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function printSingleLabelFromModal() {
    if (!activeModalOrderId) return;
    printSingleLabel(activeModalOrderId);
}

function openOrderImagePreview(orderId) {
    const order = STATE.orders.find(o => o.orderId === orderId);
    if (!order) return;
    const imgUrl = order.imageUrl || (order.items && order.items[0] && order.items[0].image_url ? order.items[0].image_url : '');
    if (!imgUrl) return;
    const title = order.items && order.items[0] ? order.items[0].name : 'สินค้า';
    showProductImageModal(imgUrl, title, order.orderId);
}

function showProductImageModal(imageUrl, productName, orderId) {
    if (!imageUrl) return;

    const imgEl = document.getElementById('productImageModalImg');
    const modalEl = document.getElementById('productImageModal');

    if (imgEl) imgEl.src = imageUrl;

    if (modalEl) {
        modalEl.style.display = 'flex';
    }
}

function closeProductImageModal() {
    const modalEl = document.getElementById('productImageModal');
    if (modalEl) {
        modalEl.style.display = 'none';
    }
}

// Close lightbox on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeProductImageModal();
    }
});

function printSingleLabel(orderId) {
    const order = STATE.orders.find(o => o.orderId === orderId);
    if (!order) return;

    const printContainer = document.getElementById('print-labels-container');
    if (!printContainer) return;

    printContainer.innerHTML = buildShippingLabelHtml(order);
    renderBarcodesForContainer(printContainer);

    setTimeout(() => {
        window.print();
    }, 200);
}

function printSelectedShippingLabels() {
    if (STATE.selectedOrderIds.size === 0) {
        alert('กรุณาติ๊กเลือกคำสั่งซื้อที่ต้องการพิมพ์ใบปะหน้าอย่างน้อย 1 รายการ');
        return;
    }

    const selectedOrders = STATE.orders.filter(o => STATE.selectedOrderIds.has(o.orderId));
    const printContainer = document.getElementById('print-labels-container');
    if (!printContainer) return;

    printContainer.innerHTML = selectedOrders.map(o => buildShippingLabelHtml(o)).join('');
    renderBarcodesForContainer(printContainer);

    setTimeout(() => {
        window.print();
    }, 250);
}

function changePrintPaperSize(size) {
    STATE.paperSize = size;
    if (typeof showToast === 'function') {
        const text = size === 'thermal' ? 'กระดาษความร้อน 100x150 mm (4x6")' : 'กระดาษขนาด A4';
        showToast('info', 'เปลี่ยนขนาดกระดาษแล้ว', text, 2000);
    }
}

// ── 8. INTEGRATION WITH QUOTATION & RECEIPT STUDIO ──────────────────────────
function createReceiptFromOrder(orderId) {
    const order = STATE.orders.find(o => o.orderId === orderId);
    if (!order) return;

    const receiptData = {
        docType: 'ใบเสร็จรับเงิน (Receipt)',
        docNo: `RC-${order.orderId}`,
        date: new Date().toISOString().split('T')[0],
        status: 'APPROVED',
        projectTitle: `คำสั่งซื้อ ${order.shopName || order.platform} เลขที่ ${order.orderId}`,
        client: {
            name: order.recipientName,
            contactPerson: order.recipientName,
            phone: order.phone,
            address: order.address
        },
        items: order.items.map(it => ({
            name: it.name,
            desc: it.variation ? `ตัวเลือก: ${it.variation}` : '',
            unit: 'ชิ้น',
            qty: it.qty,
            price: it.price
        })),
        notes: `คำสั่งซื้อผ่าน ${order.platform} (${order.shopName}) ขนส่ง: ${order.carrier} เลขพัสดุ: ${order.tracking}`
    };

    localStorage.setItem('sgyver_prefill_quotation', JSON.stringify(receiptData));

    if (confirm(`ต้องการเปิด Quotation Studio เพื่อออกใบเสร็จรับเงินสำหรับคำสั่งซื้อ ${order.orderId} หรือไม่?`)) {
        window.location.href = '../quotation/quotation.html?from_shopee=1';
    }
}

// ── 9. STORAGE HELPERS ──────────────────────────────────────────────────────
function saveOrdersToLocalStorage() {
    try {
        localStorage.setItem('sgyver_shopee_orders', JSON.stringify(STATE.orders));
    } catch (e) {}
}

function loadSavedOrders() {
    try {
        const raw = localStorage.getItem('sgyver_shopee_orders');
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
                // Auto-clean bad extracted item names and bogus quantities
                list.forEach(o => {
                    if (Array.isArray(o.items)) {
                        o.items.forEach(it => {
                            it.name = getSanitizedItemName(it, o);
                            if (it.qty > 10 && (o.totalAmount < 500 || (it.price && it.price < 500))) {
                                it.qty = 1;
                            }
                        });
                        o.totalItemsCount = o.items.reduce((sum, it) => sum + (it.qty || 1), 0);
                    }
                });

                STATE.orders = list;
                STATE.selectedOrderIds = new Set(list.map(o => o.orderId));
                saveOrdersToLocalStorage();
                renderOrdersTable();
                updateStats();
                populatePlatformFilter();
                populateCarrierFilter();
            }
        }
    } catch (e) {}
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
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

// ── 10. SUPABASE CLOUD SYNC & REALTIME (POWERED BY N8N) ─────────────────────
async function loadOrdersFromSupabase() {
    if (!window.supabaseClient) return;

    try {
        const { data, error } = await window.supabaseClient
            .from('ecommerce_orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
            const cloudOrders = data.map(row => {
                const rawObj = {
                    orderId: row.order_id,
                    platform: row.platform || 'Shopee',
                    shopName: row.shop_name,
                    items: Array.isArray(row.items) ? row.items : [],
                    totalAmount: parseFloat(row.total_amount) || 0,
                    tracking: row.tracking_number || row.order_id
                };
                const resolvedShop = getResolvedShopName(rawObj);

                return {
                    orderId: row.order_id,
                    platform: rawObj.platform,
                    shopName: resolvedShop,
                    recipientName: row.recipient_name,
                    phone: row.phone,
                    address: row.address,
                    province: row.province,
                    district: row.district,
                    zipcode: row.zipcode,
                    carrier: row.carrier || 'Standard Delivery',
                    tracking: row.tracking_number || row.order_id,
                    totalAmount: parseFloat(row.total_amount) || 0,
                    totalItemsCount: parseInt(row.total_items, 10) || 1,
                    paymentMethod: row.payment_method || 'Prepaid',
                    imageUrl: row.image_url || (Array.isArray(row.items) && row.items[0] ? row.items[0].image_url : ''),
                    status: row.status || 'READY_TO_SHIP',
                    items: Array.isArray(row.items) ? row.items : []
                };
            });

            // Merge with local orders
            const map = new Map();
            cloudOrders.forEach(o => map.set(o.orderId, o));
            STATE.orders.forEach(o => {
                if (!map.has(o.orderId)) map.set(o.orderId, o);
            });

            STATE.orders = Array.from(map.values());
            STATE.selectedOrderIds = new Set(STATE.orders.map(o => o.orderId));
            saveOrdersToLocalStorage();
            renderOrdersTable();
            updateStats();
            populatePlatformFilter();
            populateCarrierFilter();

            console.log('[Supabase] Loaded orders from Cloud / n8n:', cloudOrders.length);
        }
    } catch (e) {
        console.warn('[Supabase load exception]:', e);
    }
}

function playOrderNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Note 1: E5 (659.25Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.3);

        // Note 2: B5 (987.77Hz)
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(987.77, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.5);
        }, 130);
    } catch (e) {}
}

function setupSupabaseRealtime() {
    if (!window.supabaseClient) return;

    try {
        window.supabaseClient
            .channel('ecommerce_orders_live')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ecommerce_orders' }, payload => {
                console.log('[Supabase Realtime] New order received:', payload.new);
                playOrderNotificationSound();
                loadOrdersFromSupabase();
                if (typeof showToast === 'function') {
                    showToast('success', '🔔 มีออเดอร์ใหม่เข้ามา!', `ออเดอร์ ${payload.new.order_id} (${payload.new.shop_name}) พร้อมพิมพ์แล้ว`, 4500);
                }
            })
            .subscribe();
    } catch (e) {
        console.warn('[Supabase Realtime exception]:', e);
    }
}

async function syncOrdersToSupabase(orders) {
    if (!window.supabaseClient || !orders || orders.length === 0) return;

    try {
        const payload = orders.map(o => ({
            order_id: o.orderId,
            platform: o.platform,
            shop_name: o.shopName,
            recipient_name: o.recipientName,
            phone: o.phone,
            address: o.address,
            province: o.province,
            district: o.district,
            zipcode: o.zipcode,
            carrier: o.carrier,
            tracking_number: o.tracking,
            total_items: o.totalItemsCount,
            total_amount: o.totalAmount,
            items: (Array.isArray(o.items) && o.items.length > 0 ? o.items : [{ name: 'สินค้าตามคำสั่งซื้อ', qty: o.totalItemsCount || 1, price: o.totalAmount }]).map(it => ({
                ...it,
                image_url: it.image_url || o.imageUrl || '',
                payment_method: it.payment_method || o.paymentMethod || 'Prepaid'
            })),
            status: o.status || 'READY_TO_SHIP',
            updated_at: new Date().toISOString()
        }));

        await window.supabaseClient.from('ecommerce_orders').upsert(payload, { onConflict: 'order_id' });
    } catch (e) {
        console.warn('[Supabase sync exception]:', e);
    }
}

// ── 11. CHROME EXTENSION 1-CLICK ASSISTANT INTEGRATION ────────────────────────
let isExtensionInstalled = false;

window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'SGYVER_EXTENSION_STATUS' && event.data.installed) {
        isExtensionInstalled = true;
        updateExtensionStatusUI(true);
    } else if (event.data.type === 'SGYVER_SYNC_RESULT') {
        handleExtensionSyncResult(event.data);
    } else if (event.data.type === 'SGYVER_CACHED_ORDERS_AVAILABLE' && Array.isArray(event.data.orders)) {
        console.log('📥 Received cached orders from Extension:', event.data.orders.length);
        handleExtensionSyncResult({ success: true, orders: event.data.orders, message: `ซิงค์ ${event.data.orders.length} ออเดอร์จาก BigSeller เรียบร้อยแล้ว!` });
    }
});

// Periodic check on startup
setTimeout(() => {
    window.postMessage({ type: 'SGYVER_CHECK_EXTENSION' }, '*');
    setTimeout(() => {
        if (!isExtensionInstalled) {
            updateExtensionStatusUI(false);
        }
    }, 1200);
}, 500);

function updateExtensionStatusUI(active) {
    const dot = document.getElementById('ext-status-dot');
    const text = document.getElementById('ext-status-text');
    const bar = document.getElementById('ext-status-bar');
    const btn = document.getElementById('btn-1click-sync');

    if (active) {
        if (dot) {
            dot.style.background = '#22c55e';
            dot.style.boxShadow = '0 0 10px #22c55e';
        }
        if (text) text.innerHTML = '<span class="text-success">🟢 ส่วนขยาย S-Gyver Assistant: เชื่อมต่อแล้ว</span> (พร้อมดึงออเดอร์ Shopee, TikTok, Lazada จาก BigSeller ใน 1 คลิก)';
        if (bar) bar.classList.add('active');
        if (btn) btn.classList.remove('opacity-75');
    } else {
        if (dot) {
            dot.style.background = '#eab308';
            dot.style.boxShadow = 'none';
        }
        if (text) text.innerHTML = '<span class="text-warning">⚡ ต้องการดึงออเดอร์อัตโนมัติในคลิกเดียวโดยไม่ต้องโหลดไฟล์?</span> ติดตั้งส่วนขยาย Chrome ใน 30 วินาที';
        if (bar) bar.classList.remove('active');
    }
}

function triggerExtensionSync() {
    const btn = document.getElementById('btn-1click-sync');

    if (!isExtensionInstalled) {
        openExtensionInstallModal();
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> กำลังดึงออเดอร์จาก BigSeller...';
    }

    window.postMessage({ type: 'SGYVER_TRIGGER_PULL_ORDERS' }, '*');

    // Timeout safety
    setTimeout(() => {
        if (btn && btn.disabled) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-lightning-charge-fill text-warning"></i> 🚀 ดึงออเดอร์ 5 ร้าน (1-Click)';
        }
    }, 10000);
}

function handleExtensionSyncResult(data) {
    const btn = document.getElementById('btn-1click-sync');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-lightning-charge-fill text-warning"></i> 🚀 ดึงออเดอร์ 5 ร้าน (1-Click)';
    }

    if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
        const mapped = data.orders.map(o => ({
            orderId: o.order_id,
            platform: o.platform,
            shopName: getResolvedShopName({ ...o, orderId: o.order_id, shopName: o.shop_name, totalAmount: o.total_amount, tracking: o.tracking_number, items: o.items }),
            recipientName: o.recipient_name,
            buyerUsername: o.buyer_username || '',
            orderTime: o.order_time || '',
            platformStatus: o.platform_status || 'Processed',
            phone: o.phone,
            address: o.address,
            province: o.province,
            district: o.district,
            zipcode: o.zipcode,
            carrier: o.carrier,
            tracking: o.tracking_number,
            totalAmount: o.total_amount,
            totalItemsCount: o.total_items,
            paymentMethod: o.payment_method || 'Prepaid',
            imageUrl: o.image_url || (Array.isArray(o.items) && o.items[0] ? o.items[0].image_url : ''),
            items: o.items
        }));

        // Merge orders
        const map = new Map();
        STATE.orders.forEach(o => map.set(o.orderId, o));
        mapped.forEach(o => map.set(o.orderId, o));

        STATE.orders = Array.from(map.values());
        STATE.selectedOrderIds = new Set(STATE.orders.map(o => o.orderId));
        saveOrdersToLocalStorage();
        renderOrdersTable();
        updateStats();
        populatePlatformFilter();
        populateCarrierFilter();

        alert(`🎉 ${data.message || `ดึงสำเร็จ ${mapped.length} ออเดอร์และบันทึกลงระบบแล้ว!`}`);
    } else {
        alert(data.message || '⚠️ ไม่สามารถดึงออเดอร์ได้ กรุณาตรวจสอบว่าเปิดหน้าเว็บ BigSeller ไว้ในเบราว์เซอร์หรือไม่');
    }
}

function openExtensionInstallModal() {
    let modal = document.getElementById('extension-guide-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'extension-guide-modal';
        modal.innerHTML = `
            <div style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
                <div style="background:#0f172a; border:1px solid #334155; border-radius:16px; max-width:620px; width:100%; padding:24px; color:#f8fafc; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h4 style="margin:0; font-size:18px; color:#38bdf8; display:flex; align-items:center; gap:8px;">
                            <span>🧩</span> วิธีติดตั้งส่วนขยาย S-Gyver Assistant (ทำครั้งเดียว 30 วินาที)
                        </h4>
                        <button onclick="document.getElementById('extension-guide-modal').remove()" style="background:transparent; border:none; color:#94a3b8; font-size:20px; cursor:pointer;">✕</button>
                    </div>

                    <p style="font-size:14px; color:#cbd5e1; line-height:1.6; margin-bottom:16px;">
                        เมื่อติดตั้งส่วนขยายนี้แล้ว <strong>คนแพ็คของแค่เปิดหน้าเว็บ S-Gyver ไว้ แล้วกดปุ่ม "🚀 ดึงออเดอร์ 5 ร้าน" เพียงปุ่มเดียว</strong> ออเดอร์จาก BigSeller ทั้ง 2 บัญชี (Shopee 3 ร้าน, TikTok 1 ร้าน, Lazada 1 ร้าน) จะไหลเข้าหน้าจอพร้อมพิมพ์ทันที โดยไม่ต้องดาวน์โหลดไฟล์ Excel เลยครับ!
                    </p>

                    <div style="background:#1e293b; border-radius:12px; padding:16px; margin-bottom:20px; font-size:13px; line-height:1.7;">
                        <div style="margin-bottom:8px;"><strong>1. เปิดหน้าส่วนขยายใน Chrome:</strong><br>
                            พิมพ์ในช่อง URL ด้านบน: <code style="background:#0f172a; color:#38bdf8; padding:2px 8px; border-radius:4px;">chrome://extensions</code> แล้วกด Enter
                        </div>
                        <div style="margin-bottom:8px;"><strong>2. เปิด Developer mode:</strong><br>
                            เปิดสวิตช์มุมขวาบน <strong>"Developer mode (โหมดนักพัฒนา)"</strong> ให้เป็นสีฟ้า
                        </div>
                        <div><strong>3. โหลดส่วนขยาย:</strong><br>
                            กดปุ่ม <strong>"Load unpacked (โหลดส่วนขยายที่ยังไม่ได้แพ็กเกจ)"</strong> ที่มุมซ้ายบน ➔ เลือกโฟลเดอร์:<br>
                            <code style="background:#0f172a; color:#4ade80; padding:4px 8px; border-radius:4px; display:inline-block; margin-top:4px;">c:\\Users\\student\\Web\\Sgyver\\extension</code>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button onclick="document.getElementById('extension-guide-modal').remove()" class="btn btn-secondary px-4">ปิดหน้าต่าง</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// ── 12. IMAGE PREVIEW LIGHTBOX HELPERS ───────────────────────────────────────
function openProductImageModal(imgUrl) {
    if (!imgUrl) return;
    const modal = document.getElementById('productImageModal');
    const modalImg = document.getElementById('productImageModalImg');
    if (modal && modalImg) {
        modalImg.src = imgUrl;
        modal.style.display = 'flex';
    }
}

function closeProductImageModal() {
    const modal = document.getElementById('productImageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function openOrderImagePreview(orderId) {
    const order = STATE.orders.find(o => o.orderId === orderId);
    const imgUrl = (order && order.imageUrl) || (order && order.items && order.items[0] && order.items[0].image_url);
    if (imgUrl) {
        openProductImageModal(imgUrl);
    }
}

window.openProductImageModal = openProductImageModal;
window.closeProductImageModal = closeProductImageModal;
window.openOrderImagePreview = openOrderImagePreview;

