/**
 * ==============================================================================
 * 🪵 SGYVER MATERIAL - SINGLE PAGE APPLICATION JAVASCRIPT ENGINE
 * ระบบบันทึกและคำนวณราคาไม้สั่งซื้อ (VIP Lv.4)
 * Connected to Supabase DB & Cloudinary Storage
 * ==============================================================================
 */

// ── CLOUDINARY CONFIG ──────────────────────────────────────────
const CLOUDINARY_CONFIG = {
    cloudName: 'xn7rvu6g',
    uploadPreset: 'gyver_live',
};

// ── DEFAULT WOOD DATA (Synced with Supabase) ──────────────────
const DEFAULT_CATEGORIES = [
  {
    "id": "HMR",
    "name": "HMR",
    "items": [
      {
        "id": "hmr_3",
        "size": "3 mm",
        "price": 136
      },
      {
        "id": "hmr_9",
        "size": "9 mm",
        "price": 295
      },
      {
        "id": "hmr_12",
        "size": "12 mm",
        "price": 400
      },
      {
        "id": "hmr_15",
        "size": "15 mm",
        "price": 460
      },
      {
        "id": "hmr_18",
        "size": "18 mm",
        "price": 560
      },
      {
        "id": "hmr_25",
        "size": "25 mm",
        "price": 930
      }
    ],
    "title": "HMR (High Moisture Resistance Board)",
    "imageUrl": "https://res.cloudinary.com/xn7rvu6g/image/upload/v1792978656/sgyver_materials/swqbufkp9xq43vicwmbc.webp",
    "description": "ไม้แผ่นใยไม้อัดทนความชื้น สีเขียว สำหรับงานครัว ห้องน้ำ และพื้นที่เสี่ยงความชื้นสูง"
  },
  {
    "id": "MDF",
    "name": "MDF",
    "items": [
      {
        "id": "mdf_2_5",
        "size": "2.5 mm",
        "price": 68
      },
      {
        "id": "mdf_3",
        "size": "3 mm",
        "price": 91
      },
      {
        "id": "mdf_4",
        "size": "4 mm",
        "price": 115
      },
      {
        "id": "mdf_5_5",
        "size": "5.5 mm",
        "price": 150
      },
      {
        "id": "mdf_6",
        "size": "6 mm",
        "price": 165
      },
      {
        "id": "mdf_9",
        "size": "9 mm",
        "price": 220
      },
      {
        "id": "mdf_12",
        "size": "12 mm",
        "price": 290
      },
      {
        "id": "mdf_15",
        "size": "15 mm",
        "price": 350
      },
      {
        "id": "mdf_16",
        "size": "16 mm",
        "price": 385
      },
      {
        "id": "mdf_18",
        "size": "18 mm",
        "price": 410
      },
      {
        "id": "mdf_19",
        "size": "19 mm",
        "price": 460
      },
      {
        "id": "mdf_25",
        "size": "25 mm",
        "price": 650
      }
    ],
    "title": "MDF (Medium Density Fiberboard)",
    "imageUrl": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    "description": "แผ่นใยไม้อัดความหนาแน่นปานกลาง ผิวเรียบเนียนทั้งสองด้าน เหมาะสำหรับทำเฟอร์นิเจอร์ บิวท์อิน และงานพ่นสี"
  },
  {
    "id": "Rubber_Wood",
    "name": "Rubber_Wood",
    "items": [
      {
        "id": "rw_12",
        "size": "12 mm",
        "price": 550
      },
      {
        "id": "rw_16",
        "size": "16 mm",
        "price": 680
      },
      {
        "id": "rw_18",
        "size": "18 mm",
        "price": 750
      },
      {
        "id": "rw_20",
        "size": "20 mm",
        "price": 820
      },
      {
        "id": "rw_25",
        "size": "25 mm",
        "price": 1050
      },
      {
        "id": "rw_30",
        "size": "30 mm",
        "price": 1250
      }
    ],
    "title": "Rubber Wood (ไม้ยางพาราประสาน)",
    "imageUrl": "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80",
    "description": "ไม้จริงประสาน ลายไม้ธรรมชาติ แข็งแรง ทนทาน นิยมทำท็อปโต๊ะ บันได และเฟอร์นิเจอร์ไม้จริง"
  },
  {
    "id": "Pine_Wood",
    "name": "Pine_Wood",
    "items": [
      {
        "id": "pw_12",
        "size": "12 mm",
        "price": 620
      },
      {
        "id": "pw_15",
        "size": "15 mm",
        "price": 720
      },
      {
        "id": "pw_18",
        "size": "18 mm",
        "price": 850
      },
      {
        "id": "pw_20",
        "size": "20 mm",
        "price": 940
      },
      {
        "id": "pw_25",
        "size": "25 mm",
        "price": 1180
      }
    ],
    "title": "Pine Wood (ไม้สนประสาน)",
    "imageUrl": "https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=600&q=80",
    "description": "ไม้สนประสาน ลายไม้มีตาไม้สไตล์นอร์ดิก / สแกนดิเนเวียน น้ำหนักเบา ขัดแต่งง่าย"
  },
  {
    "id": "Plywood_Black",
    "name": "Plywood_Black",
    "items": [
      {
        "id": "pb_10",
        "size": "10 mm",
        "price": 390
      },
      {
        "id": "pb_12",
        "size": "12 mm",
        "price": 460
      },
      {
        "id": "pb_15",
        "size": "15 mm",
        "price": 560
      },
      {
        "id": "pb_18",
        "size": "18 mm",
        "price": 690
      },
      {
        "id": "pb_20",
        "size": "20 mm",
        "price": 780
      }
    ],
    "title": "Plywood Black (ไม้อัดเคลือบฟิล์มดำ)",
    "imageUrl": "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80",
    "description": "ไม้อัดเคลือบฟิล์มฟีนอลสีดำ กันน้ำ ทนแดด ทนสารเคมี งานหล่อคอนกรีตและงานโครงสร้างกลางแจ้ง"
  },
  {
    "id": "Plywood_Core",
    "name": "Plywood_Core",
    "items": [
      {
        "id": "pc_3",
        "size": "3 mm",
        "price": 120
      },
      {
        "id": "pc_4",
        "size": "4 mm",
        "price": 155
      },
      {
        "id": "pc_6",
        "size": "6 mm",
        "price": 230
      },
      {
        "id": "pc_10",
        "size": "10 mm",
        "price": 340
      },
      {
        "id": "pc_15",
        "size": "15 mm",
        "price": 490
      },
      {
        "id": "pc_20",
        "size": "20 mm",
        "price": 650
      }
    ],
    "title": "Plywood Core (ไม้อัดไส้แน่น / ไม้อัดยาง)",
    "imageUrl": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
    "description": "ไม้อัดยางไส้แน่น แข็งแรง ไม่แอ่นงอ เหมาะสำหรับงานบิวท์อิน โครงตู้ และงานปูพื้น"
  },
  {
    "id": "Frame Wood",
    "name": "Frame Wood",
    "items": [
      {
        "id": "fw_rubber_260",
        "name": "Rubber",
        "size": "1\" x 2\" x 2.44m",
        "price": 260
      },
      {
        "id": "fw_pine_320",
        "name": "Pine",
        "size": "1\" x 2\" x 2.44m",
        "price": 320
      },
      {
        "id": "fw_benjaporn_245",
        "name": "Benjaporn",
        "size": "1\" x 2\" x 2.44m",
        "price": 245
      },
      {
        "id": "fw_1x2_244",
        "name": "",
        "size": "1\" x 2\" x 2.44m",
        "price": 45
      },
      {
        "id": "fw_1x2_300",
        "name": "",
        "size": "1\" x 2\" x 3.00m",
        "price": 58
      },
      {
        "id": "fw_15x3_244",
        "name": "",
        "size": "1.5\" x 3\" x 2.44m",
        "price": 95
      },
      {
        "id": "fw_2x2_244",
        "name": "",
        "size": "2\" x 2\" x 2.44m",
        "price": 85
      }
    ],
    "title": "Frame Wood (ไม้โครงสน / สะเดา / ไม้ยาง)",
    "imageUrl": "https://images.unsplash.com/photo-1520699049698-acd2fccb8cc8?auto=format&fit=crop&w=600&q=80",
    "description": "ไม้แปรรูปสำหรับทำโครงสร้างเฟอร์นิเจอร์ โครงผนังเบา และงานตกแต่งภายใน ผ่านการอบน้ำยากันมอด"
  },
  {
    "id": "HMR_White",
    "name": "HMR_White",
    "items": [
      {
        "id": "hmrw_6",
        "size": "6 mm",
        "price": 295
      },
      {
        "id": "hmrw_9",
        "size": "9 mm",
        "price": 380
      },
      {
        "id": "hmrw_12",
        "size": "12 mm",
        "price": 480
      },
      {
        "id": "hmrw_15",
        "size": "15 mm",
        "price": 560
      },
      {
        "id": "hmrw_16",
        "size": "16 mm",
        "price": 610
      },
      {
        "id": "hmrw_18",
        "size": "18 mm",
        "price": 680
      },
      {
        "id": "hmrw_25",
        "size": "25 mm",
        "price": 950
      }
    ],
    "title": "HMR White (ไม้ HMR เคลือบเมลามีนขาว)",
    "imageUrl": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    "description": "ไม้ HMR ทนชื้น เคลือบผิวเมลามีนสีขาวสองด้าน ทนต่อรอยขีดข่วน ไม่ต้องทาสีพร้อมใช้งานทันที"
  },
  {
    "id": "Hinge",
    "name": "บานพับ (Hinges)",
    "group": "อุปกรณ์ฟิตติ้ง (Fittings)",
    "items": [
      { "id": "hg_full_soft", "name": "บานพับถ้วย ทับขอบ (Full Overlay)", "size": "Soft-Close 35mm", "price": 35 },
      { "id": "hg_half_soft", "name": "บานพับถ้วย กลางขอบ (Half Overlay)", "size": "Soft-Close 35mm", "price": 35 },
      { "id": "hg_inset_soft", "name": "บานพับถ้วย ในขอบ (Inset)", "size": "Soft-Close 35mm", "price": 38 },
      { "id": "hg_butterfly_4", "name": "บานพับปีกผีเสื้อ สแตนเลส", "size": "4\" x 3\"", "price": 55 },
      { "id": "hg_piano_18", "name": "บานพับเปียโน ชุบนิกเกิล", "size": "ยาว 1.8m", "price": 120 }
    ],
    "title": "บานพับเฟอร์นิเจอร์ (Furniture Hinges)",
    "imageUrl": "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80",
    "description": "บานพับถ้วยระบบ Soft-Close ปิดนุ่มนวล บานพับผีเสื้อ และบานพับเปียโนสำหรับตู้และหน้าบาน"
  },
  {
    "id": "Drawer_Slide",
    "name": "รางลิ้นชัก (Drawer Slides)",
    "group": "อุปกรณ์ฟิตติ้ง (Fittings)",
    "items": [
      { "id": "ds_ball_10", "name": "รางลูกปืน 3 ตอน", "size": "10 นิ้ว (250mm)", "price": 65 },
      { "id": "ds_ball_12", "name": "รางลูกปืน 3 ตอน", "size": "12 นิ้ว (300mm)", "price": 75 },
      { "id": "ds_ball_14", "name": "รางลูกปืน 3 ตอน", "size": "14 นิ้ว (350mm)", "price": 85 },
      { "id": "ds_ball_16", "name": "รางลูกปืน 3 ตอน", "size": "16 นิ้ว (400mm)", "price": 95 },
      { "id": "ds_soft_14", "name": "รางรับใต้ Soft-Close ซ่อนราง", "size": "14 นิ้ว (350mm)", "price": 220 },
      { "id": "ds_soft_16", "name": "รางรับใต้ Soft-Close ซ่อนราง", "size": "16 นิ้ว (400mm)", "price": 240 }
    ],
    "title": "รางลิ้นชักลูกปืนและรางรับใต้ (Drawer Runners)",
    "imageUrl": "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80",
    "description": "รางลิ้นชักลูกปืนรับข้าง 3 ตอน แข็งแรง และรางรับใต้ระบบ Soft-Close ปิดนุ่มนวลเงียบสนิท"
  },
  {
    "id": "Handle",
    "name": "มือจับ & อุปกรณ์เสริม",
    "group": "อุปกรณ์ฟิตติ้ง (Fittings)",
    "items": [
      { "id": "hd_c_96", "name": "มือจับตัว C อลูมิเนียมดำด้าน", "size": "ระยะรู 96 mm", "price": 45 },
      { "id": "hd_c_128", "name": "มือจับตัว C อลูมิเนียมดำด้าน", "size": "ระยะรู 128 mm", "price": 55 },
      { "id": "hd_knob_brass", "name": "ปุ่มจับกลม มินิมอล สีทองเหลือง", "size": "เส้นผ่านศูนย์กลาง 25 mm", "price": 30 },
      { "id": "hd_gas_strut", "name": "โช๊คอัพแก๊สเปิดบานขึ้น (Gas Spring)", "size": "แรงดัน 100N (10kg)", "price": 60 }
    ],
    "title": "มือจับ ปุ่มจับ และโช๊คอัพตู้ (Handles & Accessories)",
    "imageUrl": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    "description": "มือจับโมเดิร์น ปุ่มจับสไตล์มินิมอล และโช๊คไฮดรอลิกสำหรับงานบานเปิดยกขึ้น"
  }
];

// ── GLOBAL APPLICATION STATE ──────────────────────────────────
const AppState = {
    categories: [],
    customGroups: ["งานไม้ (Wood)", "อุปกรณ์ฟิตติ้ง (Fittings)"],
    expandedGroups: { "งานไม้ (Wood)": true, "อุปกรณ์ฟิตติ้ง (Fittings)": true },
    selectedCategoryId: 'HMR',
    sizeSortAscending: true, // เรียงตามความหนา น้อย ➔ มาก โดยเริ่มต้น
    orderList: [], // { id, categoryName, name, size, price, quantity, total }
    editingItemId: null,
    supabaseClient: null,
    isOnline: false
};

// ─────────────────────────────────────────────────────────────
// GROUP / ACCORDION HELPERS (จัดการเมนูหลักและเมนูย่อย)
// ─────────────────────────────────────────────────────────────
function getGroupIconHtml(groupName) {
    if (!groupName) return '<i class="bi bi-folder-fill" style="color: #d97706;"></i>';
    const s = groupName.toLowerCase();
    if (s.includes('ไม้') || s.includes('wood')) return '<i class="bi bi-tree-fill" style="color: #b45309;"></i>';
    if (s.includes('ฟิตติ้ง') || s.includes('fitting') || s.includes('ฮาร์ดแวร์') || s.includes('บานพับ') || s.includes('ราง')) return '<i class="bi bi-tools" style="color: #475569;"></i>';
    if (s.includes('สี') || s.includes('paint') || s.includes('เคมี')) return '<i class="bi bi-paint-bucket" style="color: #e11d48;"></i>';
    if (s.includes('กระจก') || s.includes('glass') || s.includes('อะคริลิค')) return '<i class="bi bi-window" style="color: #0284c7;"></i>';
    if (s.includes('อลูมิเนียม') || s.includes('เหล็ก') || s.includes('metal')) return '<i class="bi bi-wrench-adjustable" style="color: #475569;"></i>';
    return '<i class="bi bi-folder-fill" style="color: #d97706;"></i>';
}

function getGroupEmoji(groupName) {
    return getGroupIconHtml(groupName);
}

function getAllGroups() {
    const set = new Set(AppState.customGroups || []);
    set.add('งานไม้ (Wood)');
    if (Array.isArray(AppState.categories)) {
        AppState.categories.forEach(c => {
            if (c.group && c.group.trim()) {
                set.add(c.group.trim());
            }
        });
    }
    const list = Array.from(set);
    const woodIdx = list.indexOf('งานไม้ (Wood)');
    if (woodIdx > 0) {
        list.splice(woodIdx, 1);
        list.unshift('งานไม้ (Wood)');
    }
    return list;
}

function toggleMainGroup(groupName) {
    AppState.expandedGroups[groupName] = !AppState.expandedGroups[groupName];
    try {
        localStorage.setItem('sgyver_expanded_groups', JSON.stringify(AppState.expandedGroups));
    } catch (_) {}
    renderCategories();
}
window.toggleMainGroup = toggleMainGroup;

function openAddGroupModal() {
    const input = document.getElementById('newGroupNameInput');
    if (input) input.value = '';
    openModal('addMainGroupModalOverlay');
    setTimeout(() => input?.focus(), 100);
}
window.openAddGroupModal = openAddGroupModal;

function confirmAddMainGroup() {
    const name = (document.getElementById('newGroupNameInput')?.value || '').trim();
    if (!name) {
        if (typeof showToast === 'function') {
            showToast('warning', 'กรุณาระบุชื่อเมนูหลัก', 'เช่น อุปกรณ์ฟิตติ้ง หรือ สีและเคมีภัณฑ์');
        }
        return;
    }

    if (!AppState.customGroups.includes(name)) {
        AppState.customGroups.push(name);
        try {
            localStorage.setItem('sgyver_custom_groups', JSON.stringify(AppState.customGroups));
        } catch (_) {}
    }
    AppState.expandedGroups[name] = true;

    closeModal('addMainGroupModalOverlay');
    renderCategories();
    updateGroupDropdownOptions(name);

    if (typeof showToast === 'function') {
        showToast('success', 'เพิ่มเมนูหลักสำเร็จ!', `สร้างกลุ่ม "${name}" เรียบร้อยแล้ว`);
    }
}
window.confirmAddMainGroup = confirmAddMainGroup;

function updateGroupDropdownOptions(selectedGroup) {
    const select = document.getElementById('newCatGroupSelect');
    if (!select) return;

    const groups = getAllGroups();
    const currentCat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    const targetGroup = selectedGroup || currentCat?.group || 'งานไม้ (Wood)';

    select.innerHTML = groups.map(g => `
        <option value="${escapeHtml(g)}" ${g === targetGroup ? 'selected' : ''}>
            ${getGroupEmoji(g)} ${escapeHtml(g)}
        </option>
    `).join('');
}
window.updateGroupDropdownOptions = updateGroupDropdownOptions;

function ensureInitialData(categories) {
    if (!Array.isArray(categories)) return false;
    let modified = false;

    // 1. Ensure all categories have a group (fallback to "งานไม้ (Wood)")
    categories.forEach(c => {
        if (!c.group) {
            c.group = "งานไม้ (Wood)";
            modified = true;
        }
    });

    // 2. Ensure Frame Wood items
    if (ensureFrameWoodItems(categories)) {
        modified = true;
    }

    // 3. Ensure sample fittings exist
    const sampleFittings = [
      {
        "id": "Hinge",
        "name": "บานพับ (Hinges)",
        "group": "อุปกรณ์ฟิตติ้ง (Fittings)",
        "items": [
          { "id": "hg_full_soft", "name": "บานพับถ้วย ทับขอบ (Full Overlay)", "size": "Soft-Close 35mm", "price": 35 },
          { "id": "hg_half_soft", "name": "บานพับถ้วย กลางขอบ (Half Overlay)", "size": "Soft-Close 35mm", "price": 35 },
          { "id": "hg_inset_soft", "name": "บานพับถ้วย ในขอบ (Inset)", "size": "Soft-Close 35mm", "price": 38 },
          { "id": "hg_butterfly_4", "name": "บานพับปีกผีเสื้อ สแตนเลส", "size": "4\" x 3\"", "price": 55 },
          { "id": "hg_piano_18", "name": "บานพับเปียโน ชุบนิกเกิล", "size": "ยาว 1.8m", "price": 120 }
        ],
        "title": "บานพับเฟอร์นิเจอร์ (Furniture Hinges)",
        "imageUrl": "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80",
        "description": "บานพับถ้วยระบบ Soft-Close ปิดนุ่มนวล บานพับผีเสื้อ และบานพับเปียโนสำหรับตู้และหน้าบาน"
      },
      {
        "id": "Drawer_Slide",
        "name": "รางลิ้นชัก (Drawer Slides)",
        "group": "อุปกรณ์ฟิตติ้ง (Fittings)",
        "items": [
          { "id": "ds_ball_10", "name": "รางลูกปืน 3 ตอน", "size": "10 นิ้ว (250mm)", "price": 65 },
          { "id": "ds_ball_12", "name": "รางลูกปืน 3 ตอน", "size": "12 นิ้ว (300mm)", "price": 75 },
          { "id": "ds_ball_14", "name": "รางลูกปืน 3 ตอน", "size": "14 นิ้ว (350mm)", "price": 85 },
          { "id": "ds_ball_16", "name": "รางลูกปืน 3 ตอน", "size": "16 นิ้ว (400mm)", "price": 95 },
          { "id": "ds_soft_14", "name": "รางรับใต้ Soft-Close ซ่อนราง", "size": "14 นิ้ว (350mm)", "price": 220 },
          { "id": "ds_soft_16", "name": "รางรับใต้ Soft-Close ซ่อนราง", "size": "16 นิ้ว (400mm)", "price": 240 }
        ],
        "title": "รางลิ้นชักลูกปืนและรางรับใต้ (Drawer Runners)",
        "imageUrl": "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80",
        "description": "รางลิ้นชักลูกปืนรับข้าง 3 ตอน แข็งแรง และรางรับใต้ระบบ Soft-Close ปิดนุ่มนวลเงียบสนิท"
      },
      {
        "id": "Handle",
        "name": "มือจับ & อุปกรณ์เสริม",
        "group": "อุปกรณ์ฟิตติ้ง (Fittings)",
        "items": [
          { "id": "hd_c_96", "name": "มือจับตัว C อลูมิเนียมดำด้าน", "size": "ระยะรู 96 mm", "price": 45 },
          { "id": "hd_c_128", "name": "มือจับตัว C อลูมิเนียมดำด้าน", "size": "ระยะรู 128 mm", "price": 55 },
          { "id": "hd_knob_brass", "name": "ปุ่มจับกลม มินิมอล สีทองเหลือง", "size": "เส้นผ่านศูนย์กลาง 25 mm", "price": 30 },
          { "id": "hd_gas_strut", "name": "โช๊คอัพแก๊สเปิดบานขึ้น (Gas Spring)", "size": "แรงดัน 100N (10kg)", "price": 60 }
        ],
        "title": "มือจับ ปุ่มจับ และโช๊คอัพตู้ (Handles & Accessories)",
        "imageUrl": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
        "description": "มือจับโมเดิร์น ปุ่มจับสไตล์มินิมอล และโช๊คไฮดรอลิกสำหรับงานบานเปิดยกขึ้น"
      }
    ];

    sampleFittings.forEach(sampleCat => {
        const exists = categories.some(c => c.id === sampleCat.id || c.name === sampleCat.name);
        if (!exists) {
            categories.push(JSON.parse(JSON.stringify(sampleCat)));
            modified = true;
        }
    });

    return modified;
}

// ─────────────────────────────────────────────────────────────
// WOOD SIZE SORTING (ระบบเรียงลำดับตามขนาดและความหนาของไม้)
// ─────────────────────────────────────────────────────────────
function parseSizeTokens(str) {
    if (!str) return [];
    return (String(str).match(/([0-9]+(?:\.[0-9]+)?)/g) || []).map(Number);
}

function compareWoodSizes(sizeA, sizeB, ascending = true) {
    const na = parseSizeTokens(sizeA);
    const nb = parseSizeTokens(sizeB);
    const maxLen = Math.max(na.length, nb.length);
    for (let i = 0; i < maxLen; i++) {
        const valA = na[i] !== undefined ? na[i] : 0;
        const valB = nb[i] !== undefined ? nb[i] : 0;
        if (valA !== valB) {
            return ascending ? (valA - valB) : (valB - valA);
        }
    }
    const cmp = String(sizeA).localeCompare(String(sizeB), 'th', { numeric: true });
    return ascending ? cmp : -cmp;
}

function compareWoodItemSpecs(a, b, ascending = true) {
    if (a.size && b.size) {
        return compareWoodSizes(a.size, b.size, ascending);
    }
    const strA = a.name || a.size || '';
    const strB = b.name || b.size || '';
    const cmp = strA.localeCompare(strB, 'th', { numeric: true });
    return ascending ? cmp : -cmp;
}

function ensureFrameWoodItems(categories) {
    if (!Array.isArray(categories)) return false;
    const fw = categories.find(c => c.id === 'Frame Wood' || c.name === 'Frame Wood');
    if (!fw || !Array.isArray(fw.items)) return false;

    let modified = false;
    const hasRubber = fw.items.some(i => (i.name && i.name.toLowerCase().includes('rubber')) || (i.size && i.size.toLowerCase().includes('rubber')));
    const hasPine = fw.items.some(i => (i.name && i.name.toLowerCase().includes('pine')) || (i.size && i.size.toLowerCase().includes('pine')));
    const hasBenjaporn = fw.items.some(i => (i.name && i.name.toLowerCase().includes('benjaporn')) || (i.size && i.size.toLowerCase().includes('benjaporn')));

    if (!hasBenjaporn) {
        fw.items.unshift({
            id: 'fw_benjaporn_245',
            name: 'Benjaporn',
            size: '1" x 2" x 2.44m',
            price: 245,
            shop: ''
        });
        modified = true;
    }
    if (!hasPine) {
        fw.items.unshift({
            id: 'fw_pine_320',
            name: 'Pine',
            size: '1" x 2" x 2.44m',
            price: 320,
            shop: ''
        });
        modified = true;
    }
    if (!hasRubber) {
        fw.items.unshift({
            id: 'fw_rubber_260',
            name: 'Rubber',
            size: '1" x 2" x 2.44m',
            price: 260,
            shop: ''
        });
        modified = true;
    }
    return modified;
}

function sortAllCategoriesItems() {
    if (Array.isArray(AppState.categories)) {
        AppState.categories.forEach(cat => {
            if (Array.isArray(cat.items)) {
                cat.items.sort((a, b) => compareWoodItemSpecs(a, b, true));
            }
        });
    }
}

function toggleSizeSort() {
    AppState.sizeSortAscending = !AppState.sizeSortAscending;
    const icon = document.getElementById('sizeSortIcon');
    if (icon) {
        icon.className = AppState.sizeSortAscending ? 'bi bi-sort-numeric-down' : 'bi bi-sort-numeric-up-alt';
    }
    renderItemsList();
    if (typeof showToast === 'function') {
        const orderText = AppState.sizeSortAscending ? 'น้อย ➔ มาก (3mm ➔ 25mm)' : 'มาก ➔ น้อย (25mm ➔ 3mm)';
        showToast('info', 'เรียงตามขนาด', `เรียงความหนา: ${orderText}`, 1500);
    }
}
window.toggleSizeSort = toggleSizeSort;

// ── INITIALIZATION ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initUserGreeting();
    initSupabaseConnection();
    loadAppDataLocalFirst();
    initMobileView();
    // Fetch latest directly from Supabase to override any old local cache
    await syncFromSupabase(false);
    subscribeToSupabaseRealtime();
});

// ── 📱 iOS MOBILE TAB CONTROLLER ──────────────────────────────
let currentMobileTab = 'catalog';

function initMobileView() {
    const ws = document.getElementById('mainWorkspace');
    if (ws) {
        ws.classList.add('mobile-mode-catalog');
    }
    window.addEventListener('resize', () => {
        const floatingBar = document.getElementById('mobileFloatingBar');
        if (floatingBar) {
            if (window.innerWidth > 992 || AppState.orderList.length === 0) {
                floatingBar.style.display = 'none';
            } else {
                floatingBar.style.display = 'flex';
            }
        }
    });
}

function switchMobileTab(tab) {
    currentMobileTab = tab;
    const ws = document.getElementById('mainWorkspace');
    const btnCatalog = document.getElementById('segBtnCatalog');
    const btnOrder = document.getElementById('segBtnOrder');
    if (!ws) return;

    if (tab === 'order') {
        ws.classList.remove('mobile-mode-catalog');
        ws.classList.add('mobile-mode-order');
        btnCatalog?.classList.remove('active');
        btnOrder?.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        ws.classList.remove('mobile-mode-order');
        ws.classList.add('mobile-mode-catalog');
        btnCatalog?.classList.add('active');
        btnOrder?.classList.remove('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 1. Initial User Greeting (hello [user])
async function initUserGreeting() {
    const adminEl = document.getElementById('adminGreetingText');
    if (!adminEl) return;

    let userName = '';

    // Check active Supabase session
    try {
        if (AppState.supabaseClient && AppState.supabaseClient.auth) {
            const { data: { session } } = await AppState.supabaseClient.auth.getSession();
            if (session && session.user) {
                userName = session.user.user_metadata?.nickname ||
                           session.user.user_metadata?.username ||
                           session.user.user_metadata?.full_name ||
                           session.user.email?.split('@')[0];
            }
        }
    } catch (_) {}

    // Check cached auth tokens in localStorage
    if (!userName) {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(key));
                    const u = parsed.user || parsed.currentSession?.user;
                    if (u) {
                        userName = u.user_metadata?.nickname || 
                                   u.user_metadata?.username || 
                                   u.user_metadata?.full_name || 
                                   u.email?.split('@')[0];
                        if (userName) break;
                    }
                } catch (_) {}
            }
        }
    }

    // Fallback to local storage name or admin
    if (!userName) {
        userName = localStorage.getItem('gyver_user_name') || 
                   sessionStorage.getItem('gyver_user_name') || 
                   localStorage.getItem('gyver_username') ||
                   'admin';
    }

    // hello [user] in lowercase
    adminEl.textContent = `hello ${userName}`;
}

// 2. Supabase Connection Initialization
function initSupabaseConnection() {
    try {
        if (window.supabaseClient) {
            AppState.supabaseClient = window.supabaseClient;
            updateSupabaseStatus(true, 'Supabase Connected');
        } else if (window.supabase && window.SUPABASE_URL && window.SUPABASE_KEY) {
            AppState.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
            updateSupabaseStatus(true, 'Supabase Connected');
        } else {
            updateSupabaseStatus(false, 'Local Mode (Supabase Standby)');
        }
    } catch (e) {
        console.warn('Supabase init note:', e);
        updateSupabaseStatus(false, 'Offline Storage');
    }
}

function updateSupabaseStatus(isOnline, text) {
    AppState.isOnline = isOnline;
    const badge = document.getElementById('supabaseStatusBadge');
    const label = document.getElementById('supabaseStatusText');
    if (badge && label) {
        label.textContent = text;
        badge.className = isOnline ? 'status-indicator online' : 'status-indicator';
    }
}

// 3. Load App Data (Supabase Remote First -> LocalStorage -> Default)
function loadAppDataLocalFirst() {
    try {
        const storedCustomGroups = localStorage.getItem('sgyver_custom_groups');
        if (storedCustomGroups) {
            const parsedG = JSON.parse(storedCustomGroups);
            if (Array.isArray(parsedG)) AppState.customGroups = Array.from(new Set([...AppState.customGroups, ...parsedG]));
        }
        const storedExpanded = localStorage.getItem('sgyver_expanded_groups');
        if (storedExpanded) {
            const parsedE = JSON.parse(storedExpanded);
            if (typeof parsedE === 'object' && parsedE !== null) AppState.expandedGroups = Object.assign(AppState.expandedGroups, parsedE);
        }

        const stored = localStorage.getItem('sgyver_material_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                AppState.categories = parsed;
                const updated = ensureInitialData(AppState.categories);
                sortAllCategoriesItems();
                if (updated) {
                    saveAppData();
                }
                updateShopSuggestionsAndFilter();
                renderCategories();
                selectCategory(AppState.selectedCategoryId || 'HMR');
                renderOrderTable();
                return;
            }
        }
    } catch (e) {
        console.error('Error loading local storage data:', e);
    }
    // Deep clone defaults
    AppState.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    ensureInitialData(AppState.categories);
    sortAllCategoriesItems();
    updateShopSuggestionsAndFilter();
    renderCategories();
    selectCategory('HMR');
    renderOrderTable();
}

async function syncFromSupabase(isManual = false) {
    if (!AppState.supabaseClient) return;
    try {
        if (isManual && typeof showToast === 'function') {
            showToast('info', 'กำลังดึงข้อมูล...', 'กำลังดึงข้อมูลล่าสุดจาก Supabase', 1500);
        }

        const { data, error } = await AppState.supabaseClient
            .from('sgyver_materials')
            .select('*')
            .eq('id', 'master_catalog')
            .maybeSingle();

        if (data && Array.isArray(data.data) && data.data.length > 0 && !error) {
            AppState.categories = data.data;
            const updated = ensureInitialData(AppState.categories);
            sortAllCategoriesItems();
            localStorage.setItem('sgyver_material_data', JSON.stringify(AppState.categories));
            if (updated) {
                syncCategoriesToSupabase();
            }
            updateShopSuggestionsAndFilter();
            renderCategories();
            selectCategory(AppState.selectedCategoryId || 'HMR');
            renderOrderTable();
            updateSupabaseStatus(true, 'Supabase Synced');
            if (isManual && typeof showToast === 'function') {
                showToast('success', 'ซิงค์สำเร็จ!', 'ดึงข้อมูลล่าสุดจาก Supabase เรียบร้อยแล้ว');
            }
        } else if (isManual && typeof showToast === 'function') {
            showToast('warning', 'ไม่พบข้อมูลใหม่', 'ยังไม่มีการเปลี่ยนแปลงใน Supabase');
        }
    } catch (err) {
        console.warn('Sync from Supabase failed:', err);
        if (isManual && typeof showToast === 'function') {
            showToast('error', 'ซิงค์ล้มเหลว', 'ไม่สามารถเชื่อมต่อ Supabase ได้');
        }
    }
}
window.syncFromSupabase = syncFromSupabase;

function subscribeToSupabaseRealtime() {
    if (!AppState.supabaseClient) return;
    try {
        AppState.supabaseClient
            .channel('sgyver_materials_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sgyver_materials' }, (payload) => {
                if (payload.new && Array.isArray(payload.new.data)) {
                    AppState.categories = payload.new.data;
                    ensureInitialData(AppState.categories);
                    localStorage.setItem('sgyver_material_data', JSON.stringify(AppState.categories));
                    updateShopSuggestionsAndFilter();
                    renderCategories();
                    selectCategory(AppState.selectedCategoryId || 'HMR');
                    renderOrderTable();
                    if (typeof showToast === 'function') {
                        showToast('info', 'อัปเดตข้อมูลอัตโนมัติ', 'ข้อมูลในหน้านี้ซิงค์ตรงกับ Supabase เรียบร้อยแล้ว', 2500);
                    }
                }
            })
            .subscribe();
    } catch (e) {
        console.warn('Realtime subscription note:', e);
    }
}

// ─────────────────────────────────────────────────────────────
// SHOP & SUPPLIER HELPERS (จัดการข้อมูลร้านค้า / แหล่งซื้อ และสุ่มสีประจำร้าน)
// ─────────────────────────────────────────────────────────────
// Curated 12-color iOS pastel tint palette for shops
const SHOP_COLOR_PALETTE = [
    { bg: 'rgba(0, 122, 255, 0.12)', text: '#0284c7', border: 'rgba(0, 122, 255, 0.3)' },   // iOS Blue
    { bg: 'rgba(52, 199, 89, 0.13)', text: '#16a34a', border: 'rgba(52, 199, 89, 0.32)' },  // iOS Green
    { bg: 'rgba(255, 149, 0, 0.14)', text: '#d97706', border: 'rgba(245, 158, 11, 0.35)' }, // iOS Orange
    { bg: 'rgba(175, 82, 222, 0.13)', text: '#9333ea', border: 'rgba(175, 82, 222, 0.3)' }, // iOS Purple
    { bg: 'rgba(255, 45, 85, 0.12)', text: '#e11d48', border: 'rgba(255, 45, 85, 0.3)' },   // iOS Pink
    { bg: 'rgba(48, 176, 199, 0.13)', text: '#0891b2', border: 'rgba(48, 176, 199, 0.32)' },// iOS Teal
    { bg: 'rgba(88, 86, 214, 0.13)', text: '#4f46e5', border: 'rgba(88, 86, 214, 0.3)' },  // iOS Indigo
    { bg: 'rgba(162, 132, 94, 0.15)', text: '#78350f', border: 'rgba(162, 132, 94, 0.35)' },// iOS Wood Brown
    { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' },   // iOS Coral/Red
    { bg: 'rgba(132, 204, 22, 0.15)', text: '#4d7c0f', border: 'rgba(132, 204, 22, 0.35)' },// Lime Green
    { bg: 'rgba(20, 184, 166, 0.13)', text: '#0f766e', border: 'rgba(20, 184, 166, 0.32)' },// Cyan/Mint
    { bg: 'rgba(217, 70, 239, 0.12)', text: '#a21caf', border: 'rgba(217, 70, 239, 0.3)' }  // Fuchsia
];

function getShopColorObj(shopName) {
    if (!shopName || !shopName.trim()) {
        return SHOP_COLOR_PALETTE[0];
    }
    const clean = shopName.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % SHOP_COLOR_PALETTE.length;
    return SHOP_COLOR_PALETTE[idx];
}

function renderShopBadge(shopName) {
    if (!shopName || !shopName.trim()) {
        return `<span class="item-shop-badge empty" title="ยังไม่ระบุร้านขาย">-</span>`;
    }
    const clean = shopName.trim();
    const color = getShopColorObj(clean);
    const style = `background: ${color.bg}; color: ${color.text}; border-color: ${color.border};`;
    return `<span class="item-shop-badge" style="${style}" title="ร้าน: ${escapeHtml(clean)}"><i class="bi bi-shop"></i> ${escapeHtml(clean)}</span>`;
}

function updateShopSuggestionsAndFilter() {
    const datalist = document.getElementById('shopSuggestionsList');
    const select = document.getElementById('shopFilterSelect');

    const shopSet = new Set();
    if (Array.isArray(AppState.categories)) {
        AppState.categories.forEach(cat => {
            if (cat.defaultShop && cat.defaultShop.trim()) {
                shopSet.add(cat.defaultShop.trim());
            }
            if (Array.isArray(cat.items)) {
                cat.items.forEach(it => {
                    if (it.shop && it.shop.trim()) {
                        shopSet.add(it.shop.trim());
                    }
                });
            }
        });
    }

    const shops = Array.from(shopSet).sort();

    if (datalist) {
        datalist.innerHTML = shops.map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
    }

    if (select) {
        const currentVal = select.value;
        let html = '<option value="">🏪 ทุกร้าน</option>';
        shops.forEach(s => {
            html += `<option value="${escapeHtml(s)}" ${s === currentVal ? 'selected' : ''}>🏪 ${escapeHtml(s)}</option>`;
        });
        select.innerHTML = html;
        if (shops.includes(currentVal)) {
            select.value = currentVal;
        }
    }
}

function saveAppData() {
    try {
        localStorage.setItem('sgyver_material_data', JSON.stringify(AppState.categories));
    } catch (e) {
        console.error('Save to local storage failed:', e);
    }
    // Attempt Supabase async background sync
    syncCategoriesToSupabase();
}

async function syncCategoriesToSupabase() {
    if (!AppState.supabaseClient) return;
    try {
        // Upsert into Supabase materials store
        await AppState.supabaseClient
            .from('sgyver_materials')
            .upsert([
                {
                    id: 'master_catalog',
                    data: AppState.categories,
                    updated_at: new Date().toISOString()
                }
            ], { onConflict: 'id' });
    } catch (err) {
        // Soft fail without blocking local UI
    }
}

// ─────────────────────────────────────────────────────────────
// CATEGORY COLUMN CONTROLLERS
// ─────────────────────────────────────────────────────────────
function renderCategories() {
    const container = document.getElementById('categoryListContainer');
    const badge = document.getElementById('categoryCountBadge');
    if (!container) return;

    container.innerHTML = '';
    const groups = getAllGroups();
    const totalCats = AppState.categories.length;
    if (badge) badge.textContent = `${groups.length}/${totalCats}`;

    groups.forEach(groupName => {
        const groupCats = AppState.categories.filter(c => (c.group || 'งานไม้ (Wood)') === groupName);
        const isExpanded = AppState.expandedGroups[groupName] !== false; // expanded by default

        const block = document.createElement('div');
        block.className = 'main-group-block';

        const header = document.createElement('div');
        header.className = `main-group-header ${isExpanded ? 'expanded' : 'collapsed'}`;
        header.onclick = () => toggleMainGroup(groupName);

        header.innerHTML = `
            <div class="main-group-title">
                <span class="main-group-icon">${getGroupIconHtml(groupName)}</span>
                <span class="main-group-text">${escapeHtml(groupName)}</span>
            </div>
            <div class="main-group-meta">
                <span class="main-group-badge">${groupCats.length}</span>
                <i class="bi bi-chevron-down main-group-chevron"></i>
            </div>
        `;
        block.appendChild(header);

        const sublist = document.createElement('div');
        sublist.className = `main-group-sublist ${isExpanded ? '' : 'is-collapsed'}`;

        if (groupCats.length === 0) {
            sublist.innerHTML = `
                <div class="empty-group-sub">
                    ยังไม่มีหมวดหมู่ย่อย 
                    <button class="btn-classic" style="padding: 2px 8px; font-size: 0.76rem; margin-top: 4px;" onclick="event.stopPropagation(); openAddCategoryModal('${escapeHtml(groupName)}')">
                        <i class="bi bi-plus-lg"></i> เพิ่มหมวด
                    </button>
                </div>
            `;
        } else {
            groupCats.forEach(cat => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `category-item-btn ${cat.id === AppState.selectedCategoryId ? 'active' : ''}`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    selectCategory(cat.id);
                };

                const isHardware = groupName.includes('ฟิตติ้ง') || groupName.includes('ฮาร์ดแวร์') || groupName.includes('บานพับ') || groupName.includes('ราง');
                const iconClass = isHardware ? 'bi-tools' : 'bi-box-fill';

                btn.innerHTML = `
                    <div class="category-item-title">
                        <i class="bi ${iconClass} category-icon" style="${isHardware ? 'color: var(--ios-blue);' : ''}"></i>
                        <span>${escapeHtml(cat.name)}</span>
                    </div>
                    <span class="category-count">${cat.items?.length || 0}</span>
                `;
                sublist.appendChild(btn);
            });
        }

        block.appendChild(sublist);
        container.appendChild(block);
    });
}

function selectCategory(catId) {
    AppState.selectedCategoryId = catId;
    const cat = AppState.categories.find(c => c.id === catId);
    if (!cat) return;

    // Ensure the category's group is expanded
    const groupName = cat.group || 'งานไม้ (Wood)';
    if (AppState.expandedGroups[groupName] === false) {
        AppState.expandedGroups[groupName] = true;
        renderCategories();
    }

    // Update active state in buttons
    document.querySelectorAll('.category-item-btn').forEach(btn => {
        const titleSpan = btn.querySelector('.category-item-title span');
        if (titleSpan && titleSpan.textContent.trim() === cat.name) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update Middle Column Group Badge & Title
    const groupBadgeEl = document.getElementById('currentCategoryGroupBadge');
    if (groupBadgeEl) groupBadgeEl.textContent = cat.group || 'งานไม้ (Wood)';

    const titleEl = document.getElementById('currentCategoryTitle');
    if (titleEl) titleEl.textContent = cat.name;

    // Update Right Top Image Preview
    updateImagePreview(cat);

    // Render Middle Items List
    renderItemsList();
}

function updateImagePreview(cat) {
    const nameEl = document.getElementById('imageCategoryName');
    const metaNameEl = document.getElementById('imageMetaName');
    const metaDescEl = document.getElementById('imageMetaDesc');
    const previewImg = document.getElementById('categoryPreviewImage');
    const placeholder = document.getElementById('imageFramePlaceholder');

    if (nameEl) nameEl.textContent = cat.name;
    if (metaNameEl) metaNameEl.textContent = cat.title || cat.name;
    if (metaDescEl) metaDescEl.textContent = cat.description || `ไม้หมวด ${cat.name} คุณภาพมาตรฐานช่างมืออาชีพ`;

    if (cat.imageUrl) {
        previewImg.src = cat.imageUrl;
        previewImg.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }
}

function handleImageError(img) {
    img.style.display = 'none';
    const placeholder = document.getElementById('imageFramePlaceholder');
    if (placeholder) placeholder.style.display = 'flex';
}

// ─────────────────────────────────────────────────────────────
// MIDDLE COLUMN: ITEM LIST & PRICE CONTROLLERS
// ─────────────────────────────────────────────────────────────
function renderItemsList() {
    const tbody = document.getElementById('itemsTableBody');
    const countBadge = document.getElementById('itemCountBadge');
    const searchVal = (document.getElementById('itemSearchInput')?.value || '').toLowerCase().trim();
    const shopFilter = (document.getElementById('shopFilterSelect')?.value || '').trim();
    if (!tbody) return;

    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat || !cat.items) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">ไม่พบข้อมูลไม้ในหมวดนี้</td></tr>';
        if (countBadge) countBadge.textContent = '0 รายการ';
        return;
    }

    const filtered = cat.items.filter(item => {
        const itemShop = (item.shop || cat.defaultShop || '').trim();
        if (shopFilter && itemShop !== shopFilter) {
            return false;
        }
        if (!searchVal) return true;
        return (item.size && item.size.toLowerCase().includes(searchVal)) || 
               (item.name && item.name.toLowerCase().includes(searchVal)) ||
               (item.price + '').includes(searchVal) ||
               itemShop.toLowerCase().includes(searchVal);
    });

    // เรียงตามขนาดความหนาหรือชื่อของไม้ (อัตโนมัติตาม AppState.sizeSortAscending)
    filtered.sort((a, b) => compareWoodItemSpecs(a, b, AppState.sizeSortAscending));

    if (countBadge) countBadge.textContent = `${filtered.length} รายการ`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">ไม่พบขนาดไม้ที่ตรงกับเงื่อนไขค้นหา</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const isChecked = AppState.orderList.some(o => o.id === item.id);
        const displayShop = item.shop || cat.defaultShop || '';
        const hasName = Boolean(item.name && item.name.trim());
        const hasSize = Boolean(item.size && item.size.trim());

        return `
            <tr class="${isChecked ? 'row-selected' : ''}" id="row-${item.id}">
                <td style="text-align: center;">
                    <input type="checkbox" class="item-checkbox" 
                           ${isChecked ? 'checked' : ''} 
                           onchange="handleItemCheckboxToggle('${item.id}', this.checked)">
                </td>
                <td>
                    <span class="item-badge-cat">${escapeHtml(cat.name)}</span>
                </td>
                <td>
                    ${hasName ? `
                        <div class="item-name-size-wrapper">
                            <span class="item-wood-name-badge ${!hasSize ? 'standalone' : ''}">${escapeHtml(item.name)}</span>
                            ${hasSize ? `<span class="item-size-text">${escapeHtml(item.size)}</span>` : ''}
                        </div>
                    ` : `
                        <span class="item-size-text">${escapeHtml(item.size || '-')}</span>
                    `}
                </td>
                <td>
                    ${renderShopBadge(displayShop)}
                </td>
                <td style="text-align: right;">
                    <div class="item-price-wrapper" style="justify-content: flex-end;">
                        <span>${formatMoney(item.price)}</span>
                        <span style="font-size: 0.75rem; color: var(--ios-label-secondary);">฿</span>
                    </div>
                </td>
                <td style="text-align: center;">
                    <div class="ios-dropdown-wrapper" id="dropdown-wrap-${item.id}">
                        <button class="btn-item-dropdown" onclick="toggleItemDropdown(event, '${item.id}')" title="จัดการรายการ (แก้ไข / ลบ)">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <div class="ios-dropdown-menu" id="dropdown-menu-${item.id}">
                            <button class="ios-dropdown-item" onclick="handleDropdownEdit(event, '${item.id}')">
                                <i class="bi bi-pencil-fill" style="color: var(--ios-blue);"></i> แก้ไข
                            </button>
                            <button class="ios-dropdown-item danger" onclick="handleDropdownDelete(event, '${item.id}')">
                                <i class="bi bi-trash3-fill"></i> ลบ
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterItems() {
    renderItemsList();
}

// ─────────────────────────────────────────────────────────────
// DROPDOWN MENU CONTROLLERS
// ─────────────────────────────────────────────────────────────
function toggleItemDropdown(event, itemId) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const menu = document.getElementById(`dropdown-menu-${itemId}`);
    if (!menu) return;

    const isShowing = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isShowing) {
        menu.classList.add('show');
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.ios-dropdown-menu.show').forEach(m => m.classList.remove('show'));
}

// Global click-outside dismiss
document.addEventListener('click', (e) => {
    if (!e.target.closest('.ios-dropdown-wrapper')) {
        closeAllDropdowns();
    }
});

function handleDropdownEdit(event, itemId) {
    if (event) event.stopPropagation();
    closeAllDropdowns();
    openQuickEditModal(itemId);
}

function handleDropdownDelete(event, itemId) {
    if (event) event.stopPropagation();
    closeAllDropdowns();

    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;
    const item = cat.items.find(i => i.id === itemId);
    if (!item) return;

    if (!confirm(`คุณต้องการลบ "${cat.name} ขนาด ${item.size}" ใช่หรือไม่?`)) {
        return;
    }

    // ลบรายการออกจากหมวดหมู่
    cat.items = cat.items.filter(i => i.id !== itemId);

    // ลบออกจากตาราง Order ด้วยถ้าถูกติ๊กเลือกอยู่
    AppState.orderList = AppState.orderList.filter(o => o.id !== itemId);

    saveAppData();
    renderCategories();
    renderItemsList();
    renderOrderTable();

    if (typeof showToast === 'function') {
        showToast('info', 'ลบรายการสำเร็จ', `ลบ ${cat.name} ขนาด ${item.size} ออกจากระบบแล้ว`);
    }
}

// Checkbox click toggle in middle list
function handleItemCheckboxToggle(itemId, isChecked) {
    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;
    const item = cat.items.find(i => i.id === itemId);
    if (!item) return;

    if (isChecked) {
        // Add to Order List if not present
        const existing = AppState.orderList.find(o => o.id === itemId);
        if (!existing) {
            const itemShop = item.shop || cat.defaultShop || '';
            AppState.orderList.push({
                id: item.id,
                categoryName: cat.name,
                name: item.name || '',
                size: item.size || '',
                price: Number(item.price) || 0,
                shop: itemShop,
                quantity: 1,
                total: Number(item.price) || 0
            });
            if (typeof showToast === 'function') {
                const label = item.name ? `[${item.name}] ${item.size || ''}` : `${item.size || ''}`;
                showToast('info', 'เพิ่มลงในตารางคำนวณแล้ว', `${cat.name} ${label} (1 แผ่น)`, 1800);
            }
        }
    } else {
        // Remove from Order List
        AppState.orderList = AppState.orderList.filter(o => o.id !== itemId);
    }

    renderItemsList();
    renderOrderTable();
}

// ─────────────────────────────────────────────────────────────
// QUICK EDIT PRICE, SIZE & SHOP MODAL
// ─────────────────────────────────────────────────────────────
function openQuickEditModal(itemId) {
    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;
    const item = cat.items.find(i => i.id === itemId);
    if (!item) return;

    AppState.editingItemId = itemId;
    document.getElementById('editMaterialName').value = cat.name;
    document.getElementById('editItemName').value = item.name || '';
    document.getElementById('editSizeText').value = item.size || '';
    document.getElementById('editShopInput').value = item.shop || cat.defaultShop || '';
    const priceInput = document.getElementById('editPriceInput');
    priceInput.value = item.price;

    openModal('quickEditModalOverlay');
    setTimeout(() => {
        if (!item.name && cat.id.toLowerCase().includes('frame')) {
            document.getElementById('editItemName').focus();
        } else {
            priceInput.focus();
            priceInput.select();
        }
    }, 100);
}

function confirmSaveQuickPrice() {
    const newPriceVal = parseFloat(document.getElementById('editPriceInput').value);
    const newNameVal = (document.getElementById('editItemName').value || '').trim();
    const newSizeVal = (document.getElementById('editSizeText').value || '').trim();
    const newShopVal = (document.getElementById('editShopInput').value || '').trim();

    if (isNaN(newPriceVal) || newPriceVal < 0) {
        if (typeof showToast === 'function') {
            showToast('warning', 'ราคาไม่ถูกต้อง', 'กรุณาระบุราคาที่ถูกต้องมากกว่าหรือเท่ากับ 0');
        }
        return;
    }

    if (!newNameVal && !newSizeVal) {
        if (typeof showToast === 'function') {
            showToast('warning', 'กรุณาระบุชื่อหรือขนาด', 'ต้องระบุชื่อเรียก/ชนิดไม้ หรือขนาดความหนาอย่างน้อย 1 อย่าง');
        }
        return;
    }

    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;
    const item = cat.items.find(i => i.id === AppState.editingItemId);
    if (!item) return;

    item.name = newNameVal;
    item.price = newPriceVal;
    item.size = newSizeVal;
    item.shop = newShopVal;
    cat.items.sort((a, b) => compareWoodItemSpecs(a, b, true));

    // Update if in orderList too
    const orderItem = AppState.orderList.find(o => o.id === item.id);
    if (orderItem) {
        orderItem.name = newNameVal;
        orderItem.size = newSizeVal;
        orderItem.price = newPriceVal;
        orderItem.shop = newShopVal;
        orderItem.total = newPriceVal * orderItem.quantity;
        renderOrderTable();
    }

    saveAppData();
    updateShopSuggestionsAndFilter();
    renderItemsList();
    closeModal('quickEditModalOverlay');

    if (typeof showToast === 'function') {
        const itemLabel = newNameVal ? `[${newNameVal}] ${newSizeVal}` : newSizeVal;
        showToast('success', 'อัปเดตข้อมูลสำเร็จ', `${cat.name} ${itemLabel}: ${formatMoney(newPriceVal)} ฿ ${newShopVal ? `(${newShopVal})` : ''}`);
    }
}

// ─────────────────────────────────────────────────────────────
// ADD NEW ITEM MODAL
// ─────────────────────────────────────────────────────────────
function openAddItemModal() {
    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;

    document.getElementById('addItemCategoryDisplay').value = cat.name;
    document.getElementById('newItemNameInput').value = '';
    document.getElementById('newSizeInput').value = '';
    document.getElementById('newPriceInput').value = '';
    document.getElementById('newShopInput').value = cat.defaultShop || '';

    openModal('addItemModalOverlay');
    setTimeout(() => {
        if (cat.id.toLowerCase().includes('frame')) {
            document.getElementById('newItemNameInput').focus();
        } else {
            document.getElementById('newSizeInput').focus();
        }
    }, 100);
}

function confirmAddItem() {
    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;

    const name = (document.getElementById('newItemNameInput').value || '').trim();
    const size = (document.getElementById('newSizeInput').value || '').trim();
    const price = parseFloat(document.getElementById('newPriceInput').value);
    const shop = (document.getElementById('newShopInput').value || '').trim();

    if (!name && !size) {
        if (typeof showToast === 'function') showToast('warning', 'กรุณาระบุชื่อหรือขนาด', 'ต้องระบุชื่อเรียก/ชนิดไม้ หรือขนาดความหนาอย่างน้อย 1 อย่าง');
        return;
    }

    if (isNaN(price) || price < 0) {
        if (typeof showToast === 'function') showToast('warning', 'กรุณาระบุราคา', 'ราคาต้องเป็นตัวเลขที่ถูกต้อง');
        return;
    }

    const newItemId = `${cat.id.toLowerCase()}_${Date.now()}`;
    cat.items.push({
        id: newItemId,
        name: name,
        size: size,
        price: price,
        shop: shop
    });
    cat.items.sort((a, b) => compareWoodItemSpecs(a, b, true));

    saveAppData();
    updateShopSuggestionsAndFilter();
    renderCategories();
    renderItemsList();
    closeModal('addItemModalOverlay');

    if (typeof showToast === 'function') {
        const itemLabel = name ? `[${name}] ${size}` : size;
        showToast('success', 'เพิ่มรายการใหม่สำเร็จ', `${cat.name} ${itemLabel} ราคา ${formatMoney(price)} ฿ ${shop ? `(${shop})` : ''}`);
    }
}

// ─────────────────────────────────────────────────────────────
// ADD NEW CATEGORY MODAL
// ─────────────────────────────────────────────────────────────
function openAddCategoryModal(defaultGroup) {
    updateGroupDropdownOptions(defaultGroup);
    document.getElementById('newCatKey').value = '';
    document.getElementById('newCatDesc').value = '';
    document.getElementById('newCatDefaultShop').value = '';
    document.getElementById('newCatImageUrl').value = '';

    openModal('addCategoryModalOverlay');
    setTimeout(() => document.getElementById('newCatKey').focus(), 100);
}
window.openAddCategoryModal = openAddCategoryModal;

function confirmAddCategory() {
    const key = (document.getElementById('newCatKey').value || '').trim().replace(/\s+/g, '_');
    const desc = (document.getElementById('newCatDesc').value || '').trim();
    const defaultShop = (document.getElementById('newCatDefaultShop').value || '').trim();
    const imageUrl = (document.getElementById('newCatImageUrl').value || '').trim();
    const group = (document.getElementById('newCatGroupSelect')?.value || 'งานไม้ (Wood)').trim();

    if (!key) {
        if (typeof showToast === 'function') showToast('warning', 'กรุณาระบุรหัสประเภท', 'เช่น Teak_Wood หรือ Hinge_Soft');
        return;
    }

    if (AppState.categories.some(c => c.id.toLowerCase() === key.toLowerCase())) {
        if (typeof showToast === 'function') showToast('warning', 'หมวดหมู่นี้มีอยู่แล้ว', 'กรุณาใช้รหัสอื่นที่ไม่ซ้ำกัน');
        return;
    }

    const isFittings = group.includes('ฟิตติ้ง') || group.includes('ฮาร์ดแวร์') || group.includes('บานพับ') || group.includes('ราง');

    const newCat = {
        id: key,
        name: key,
        group: group,
        title: `${key} (${desc || key})`,
        description: desc || `หมวดหมู่ ${key} สำหรับงานผลิตและตกแต่ง`,
        defaultShop: defaultShop,
        imageUrl: imageUrl || (isFittings ? 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80' : 'https://images.unsplash.com/photo-1546484475-7f7bd55792da?auto=format&fit=crop&w=600&q=80'),
        items: isFittings ? [
            { id: `${key.toLowerCase()}_1`, name: 'รุ่นมาตรฐาน', size: '', price: 45.0, shop: defaultShop },
            { id: `${key.toLowerCase()}_2`, name: 'รุ่นพรีเมียม Soft-Close', size: '', price: 85.0, shop: defaultShop }
        ] : [
            { id: `${key.toLowerCase()}_10`, name: '', size: '10 mm', price: 300.0, shop: defaultShop },
            { id: `${key.toLowerCase()}_15`, name: '', size: '15 mm', price: 450.0, shop: defaultShop },
            { id: `${key.toLowerCase()}_18`, name: '', size: '18 mm', price: 550.0, shop: defaultShop }
        ]
    };

    AppState.categories.push(newCat);
    AppState.expandedGroups[group] = true;

    saveAppData();
    updateShopSuggestionsAndFilter();
    renderCategories();
    selectCategory(newCat.id);
    closeModal('addCategoryModalOverlay');

    if (typeof showToast === 'function') {
        showToast('success', 'เพิ่มหมวดหมู่สำเร็จ!', `เพิ่ม ${newCat.name} ในกลุ่ม "${group}" เรียบร้อยแล้ว`);
    }
}

// ─────────────────────────────────────────────────────────────
// CLOUDINARY IMAGE UPLOAD & IMAGE URL CONTROLLERS
// ─────────────────────────────────────────────────────────────
function triggerImageUpload() {
    const input = document.getElementById('cloudinaryFileInput');
    if (input) input.click();
}

async function handleImageFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;

    if (typeof showToast === 'function') {
        showToast('info', 'กำลังอัปโหลด...', `กำลังส่งรูป "${file.name}" ขึ้น Cloudinary`, 4000);
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', 'sgyver_materials');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Cloudinary error ${response.status}`);
        }

        const data = await response.json();
        const uploadedUrl = data.secure_url || data.url;

        cat.imageUrl = uploadedUrl;
        saveAppData();
        updateImagePreview(cat);

        if (typeof showToast === 'function') {
            showToast('success', 'อัปโหลด Cloudinary สำเร็จ!', `จัดเก็บในโฟลเดอร์ sgyver_materials สำหรับ ${cat.name}`);
        }
    } catch (err) {
        console.warn('Cloudinary upload fallback to FileReader DataURL:', err);
        // Fallback: Read local data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            cat.imageUrl = e.target.result;
            saveAppData();
            updateImagePreview(cat);
            if (typeof showToast === 'function') {
                showToast('success', 'บันทึกรูปภาพเรียบร้อย', 'บันทึกรูปภาพในระบบเรียบร้อย (ออฟไลน์โหมด)');
            }
        };
        reader.readAsDataURL(file);
    } finally {
        event.target.value = '';
    }
}

function openCustomUrlModal() {
    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;

    document.getElementById('customUrlCatLabel').textContent = cat.name;
    document.getElementById('customImageUrlInput').value = cat.imageUrl || '';
    openModal('customUrlModalOverlay');
    setTimeout(() => document.getElementById('customImageUrlInput').focus(), 100);
}

function confirmCustomImageUrl() {
    const url = (document.getElementById('customImageUrlInput').value || '').trim();
    if (!url) {
        if (typeof showToast === 'function') showToast('warning', 'กรุณาระบุ URL', 'URL ไม่สามารถเป็นค่าว่างได้');
        return;
    }

    const cat = AppState.categories.find(c => c.id === AppState.selectedCategoryId);
    if (!cat) return;

    cat.imageUrl = url;
    saveAppData();
    updateImagePreview(cat);
    closeModal('customUrlModalOverlay');

    if (typeof showToast === 'function') {
        showToast('success', 'อัปเดตรูปภาพแล้ว', `เปลี่ยนรูปภาพของ ${cat.name} สำเร็จ`);
    }
}

// ─────────────────────────────────────────────────────────────
// RIGHT BOTTOM: ORDER / SUMMARY TABLE CONTROLLERS
// ─────────────────────────────────────────────────────────────
function renderOrderTable() {
    const tbody = document.getElementById('orderTableBody');
    const emptyState = document.getElementById('emptyOrderState');
    const badge = document.getElementById('orderItemsCountBadge');
    const totalSheetsEl = document.getElementById('summaryTotalSheets');
    const grandTotalEl = document.getElementById('summaryGrandTotal');
    if (!tbody) return;

    if (badge) badge.textContent = `${AppState.orderList.length} รายการ`;

    if (AppState.orderList.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (totalSheetsEl) totalSheetsEl.innerHTML = `0 <span style="font-size: 0.82rem; font-weight: normal; color: var(--text-muted);">แผ่น</span>`;
        if (grandTotalEl) grandTotalEl.textContent = '0.00 ฿';
        const mobileBadge = document.getElementById('mobileOrderBadge');
        const floatingBar = document.getElementById('mobileFloatingBar');
        if (mobileBadge) mobileBadge.textContent = '0';
        if (floatingBar) floatingBar.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    let totalSheets = 0;
    let grandTotal = 0;

    tbody.innerHTML = AppState.orderList.map((order, index) => {
        const rowTotal = (order.price * order.quantity) || 0;
        totalSheets += Number(order.quantity) || 0;
        grandTotal += rowTotal;
        const orderShop = order.shop?.trim() || '';

        let orderItemContent = '';
        if (order.name && order.size) {
            orderItemContent = `<div class="order-item-title"><span class="item-wood-name-badge">${escapeHtml(order.name)}</span> <strong>${escapeHtml(order.size)}</strong></div>`;
        } else if (order.name) {
            orderItemContent = `<span class="item-wood-name-badge standalone">${escapeHtml(order.name)}</span>`;
        } else {
            orderItemContent = `<strong>${escapeHtml(order.size || '-')}</strong>`;
        }

        return `
            <tr id="order-row-${order.id}">
                <td style="text-align: center; color: var(--text-muted); font-size: 0.82rem;">${index + 1}</td>
                <td><span class="item-badge-cat">${escapeHtml(order.categoryName)}</span></td>
                <td>${orderItemContent}</td>
                <td>
                    ${renderShopBadge(orderShop)}
                </td>
                <td style="text-align: right; font-family: 'Fira Code', monospace;">${formatMoney(order.price)}</td>
                <td style="text-align: center;">
                    <div class="qty-stepper">
                        <button class="qty-btn" type="button" onclick="adjustOrderQuantity('${order.id}', -1)">-</button>
                        <input type="number" min="1" class="qty-input" value="${order.quantity}" 
                               onchange="setOrderQuantity('${order.id}', this.value)">
                        <button class="qty-btn" type="button" onclick="adjustOrderQuantity('${order.id}', 1)">+</button>
                    </div>
                </td>
                <td style="text-align: right;" class="order-row-total">${formatMoney(rowTotal)} ฿</td>
                <td style="text-align: center;">
                    <button class="btn-remove-row" onclick="removeOrderItem('${order.id}')" title="ลบรายการนี้">
                        <i class="bi bi-x-circle-fill"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (totalSheetsEl) {
        totalSheetsEl.innerHTML = `${totalSheets.toLocaleString('th-TH')} <span style="font-size: 0.82rem; font-weight: normal; color: var(--text-muted);">แผ่น</span>`;
    }
    if (grandTotalEl) {
        grandTotalEl.textContent = `${formatMoney(grandTotal)} ฿`;
    }

    // 📱 Update Mobile Segment Badge and Floating Quick Order Bar
    const mobileBadge = document.getElementById('mobileOrderBadge');
    const floatingBar = document.getElementById('mobileFloatingBar');
    const floatingQty = document.getElementById('mobileFloatingQty');
    const floatingTotal = document.getElementById('mobileFloatingTotal');

    if (mobileBadge) mobileBadge.textContent = AppState.orderList.length;

    if (AppState.orderList.length > 0) {
        if (floatingBar && window.innerWidth <= 992) {
            floatingBar.style.display = 'flex';
        }
        if (floatingQty) floatingQty.textContent = `${totalSheets.toLocaleString('th-TH')} แผ่น`;
        if (floatingTotal) floatingTotal.textContent = `${formatMoney(grandTotal)} ฿`;
    } else {
        if (floatingBar) floatingBar.style.display = 'none';
    }
}

function adjustOrderQuantity(orderId, delta) {
    const item = AppState.orderList.find(o => o.id === orderId);
    if (!item) return;

    let newQty = (parseInt(item.quantity, 10) || 1) + delta;
    if (newQty < 1) newQty = 1;

    item.quantity = newQty;
    item.total = item.price * newQty;
    renderOrderTable();
}

function setOrderQuantity(orderId, value) {
    const item = AppState.orderList.find(o => o.id === orderId);
    if (!item) return;

    let parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) parsed = 1;

    item.quantity = parsed;
    item.total = item.price * parsed;
    renderOrderTable();
}

function removeOrderItem(orderId) {
    AppState.orderList = AppState.orderList.filter(o => o.id !== orderId);
    renderItemsList();
    renderOrderTable();
}

function clearOrderList() {
    if (AppState.orderList.length === 0) return;
    if (!confirm('คุณต้องการล้างรายการสั่งซื้อทั้งหมดใช่หรือไม่?')) return;

    AppState.orderList = [];
    renderItemsList();
    renderOrderTable();

    if (typeof showToast === 'function') {
        showToast('info', 'ล้างรายการเรียบร้อย', 'ตารางคำนวณราคาไม้ว่างเปล่าแล้ว');
    }
}

// ─────────────────────────────────────────────────────────────
// COPY LINE SUMMARY (คัดลอกสรุปรายการส่ง LINE - จัดกลุ่มแยกตามร้าน)
// ─────────────────────────────────────────────────────────────
function copyLineOrderSummary() {
    if (AppState.orderList.length === 0) {
        if (typeof showToast === 'function') {
            showToast('warning', 'ไม่มีรายการสินค้า', 'กรุณาเลือกรายการไม้ในคอลัมน์กลางก่อนส่ง LINE');
        }
        return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    // จัดกลุ่มรายการสั่งซื้อตามร้านค้า
    const shopGroups = {};
    let grandTotalSheets = 0;
    let grandTotalPrice = 0;

    AppState.orderList.forEach(item => {
        const sName = item.shop?.trim() || 'ไม่ระบุร้านค้า';
        if (!shopGroups[sName]) shopGroups[sName] = [];
        shopGroups[sName].push(item);
        grandTotalSheets += item.quantity;
        grandTotalPrice += item.price * item.quantity;
    });

    const shopNames = Object.keys(shopGroups);
    let lines = [];
    lines.push(`📦 รายการสั่งซื้อไม้ - Sgyver Material`);
    lines.push(`📅 วันที่: ${dateStr} เวลา ${timeStr} น.`);
    lines.push(`========================================`);

    let itemCounter = 1;
    shopNames.forEach((sName, sIdx) => {
        const items = shopGroups[sName];
        let shopSheets = 0;
        let shopPrice = 0;

        lines.push(`📍 แหล่งซื้อ/ร้าน: 【 ${sName} 】`);
        items.forEach(it => {
            const rowTotal = it.price * it.quantity;
            shopSheets += it.quantity;
            shopPrice += rowTotal;
            let itemDesc = '';
            if (it.name && it.size) {
                itemDesc = `[${it.categoryName} - ${it.name}] ขนาด ${it.size}`;
            } else if (it.name) {
                itemDesc = `[${it.categoryName} - ${it.name}]`;
            } else {
                itemDesc = `[${it.categoryName}] ขนาด ${it.size || '-'}`;
            }
            lines.push(`  ${itemCounter++}. ${itemDesc}`);
            lines.push(`     จำนวน: ${it.quantity} แผ่น @ ${formatMoney(it.price)} ฿ = ${formatMoney(rowTotal)} ฿`);
        });
        lines.push(`  ➡️ รวมร้าน ${sName}: ${shopSheets.toLocaleString('th-TH')} แผ่น | ${formatMoney(shopPrice)} ฿`);
        if (sIdx < shopNames.length - 1) {
            lines.push(`----------------------------------------`);
        }
    });

    lines.push(`========================================`);
    lines.push(`📊 จำนวนรวมทั้งหมด: ${grandTotalSheets.toLocaleString('th-TH')} แผ่น (${shopNames.length} ร้าน)`);
    lines.push(`💰 ยอดรวมสุทธิ: ${formatMoney(grandTotalPrice)} บาท`);
    lines.push(`========================================`);
    lines.push(`*ส่งจากระบบ Sgyver Material Studio*`);

    const fullMessage = lines.join('\n');
    copyToClipboardWithFeedback(fullMessage, 'คัดลอกสรุปส่ง LINE แล้ว!', 'จัดกลุ่มแยกตามร้านเรียบร้อย พร้อมวางในแชท LINE ได้ทันที');
}

// ─────────────────────────────────────────────────────────────
// MODAL: ส่ง LINE แยกเฉพาะร้าน (Shop Line Copy Modal)
// ─────────────────────────────────────────────────────────────
function openShopLineCopyModal() {
    if (AppState.orderList.length === 0) {
        if (typeof showToast === 'function') {
            showToast('warning', 'ไม่มีรายการสินค้า', 'กรุณาเลือกไม้ลงในตารางก่อน');
        }
        return;
    }

    const container = document.getElementById('shopLineModalContent');
    if (!container) return;

    const shopGroups = {};
    AppState.orderList.forEach(item => {
        const sName = item.shop?.trim() || 'ไม่ระบุร้านค้า';
        if (!shopGroups[sName]) shopGroups[sName] = [];
        shopGroups[sName].push(item);
    });

    const shopNames = Object.keys(shopGroups);
    container.innerHTML = shopNames.map(sName => {
        const items = shopGroups[sName];
        const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
        const subtotal = items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);

        const shopColor = getShopColorObj(sName);
        return `
            <div class="shop-order-card" style="border-color: ${shopColor.border};">
                <div class="shop-order-header" style="background: ${shopColor.bg}; border-color: ${shopColor.border};">
                    <div class="shop-order-name" style="color: ${shopColor.text};">
                        <i class="bi bi-shop" style="color: ${shopColor.text};"></i>
                        <span>${escapeHtml(sName)}</span>
                    </div>
                    <span class="pane-badge" style="background: rgba(255, 255, 255, 0.9); color: ${shopColor.text}; border: 0.5px solid ${shopColor.border};">
                        ${items.length} รายการ
                    </span>
                </div>
                <div class="shop-order-body">
                    <ul class="shop-order-item-list">
                        ${items.map(it => {
                            let itemDesc = '';
                            if (it.name && it.size) {
                                itemDesc = `<strong>[${escapeHtml(it.categoryName)} - ${escapeHtml(it.name)}]</strong> ${escapeHtml(it.size)}`;
                            } else if (it.name) {
                                itemDesc = `<strong>[${escapeHtml(it.categoryName)} - ${escapeHtml(it.name)}]</strong>`;
                            } else {
                                itemDesc = `<strong>[${escapeHtml(it.categoryName)}]</strong> ${escapeHtml(it.size || '-')}`;
                            }
                            return `
                                <li>
                                    <span>${itemDesc} &times; ${it.quantity} แผ่น</span>
                                    <span style="font-family: monospace; font-weight: 600;">${formatMoney(it.price * it.quantity)} ฿</span>
                                </li>
                            `;
                        }).join('')}
                    </ul>
                    <div class="shop-order-footer">
                        <div style="font-size: 0.86rem; color: var(--ios-label);">
                            รวม: <strong>${totalQty} แผ่น</strong> | <strong style="color: #248a3d;">${formatMoney(subtotal)} ฿</strong>
                        </div>
                        <button class="btn-classic btn-line-classic" onclick="copySingleShopLineOrder('${escapeHtml(sName)}')">
                            <i class="bi bi-line"></i> คัดลอกส่งร้านนี้
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    openModal('shopLineModalOverlay');
}
window.openShopLineCopyModal = openShopLineCopyModal;

function copySingleShopLineOrder(shopName) {
    const items = AppState.orderList.filter(item => {
        const sName = item.shop?.trim() || 'ไม่ระบุร้านค้า';
        return sName === shopName;
    });

    if (items.length === 0) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let lines = [];
    lines.push(`📦 สั่งซื้อไม้ - ร้าน: ${shopName}`);
    lines.push(`📅 วันที่: ${dateStr} เวลา ${timeStr} น.`);
    lines.push(`----------------------------------------`);

    let totalQty = 0;
    let subtotal = 0;
    items.forEach((it, idx) => {
        const rowTotal = it.price * it.quantity;
        totalQty += it.quantity;
        subtotal += rowTotal;
        let itemDesc = '';
        if (it.name && it.size) {
            itemDesc = `[${it.categoryName} - ${it.name}] ขนาด ${it.size}`;
        } else if (it.name) {
            itemDesc = `[${it.categoryName} - ${it.name}]`;
        } else {
            itemDesc = `[${it.categoryName}] ขนาด ${it.size || '-'}`;
        }
        lines.push(`${idx + 1}. ${itemDesc}`);
        lines.push(`   จำนวน: ${it.quantity} แผ่น @ ${formatMoney(it.price)} ฿ = ${formatMoney(rowTotal)} ฿`);
    });

    lines.push(`----------------------------------------`);
    lines.push(`📊 จำนวนรวม: ${totalQty.toLocaleString('th-TH')} แผ่น`);
    lines.push(`💰 ยอดรวม: ${formatMoney(subtotal)} บาท`);
    lines.push(`----------------------------------------`);
    lines.push(`*ส่งจากระบบ Sgyver Material Studio*`);

    copyToClipboardWithFeedback(lines.join('\n'), `คัดลอกส่งร้าน "${shopName}" แล้ว!`, 'พร้อมวางในแชท LINE ของร้านนี้ได้ทันที');
}
window.copySingleShopLineOrder = copySingleShopLineOrder;

function copyToClipboardWithFeedback(text, title, desc) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            if (typeof showToast === 'function') {
                showToast('success', title, desc, 3500);
            }
        }).catch(() => {
            fallbackCopyText(text, title, desc);
        });
    } else {
        fallbackCopyText(text, title, desc);
    }
}

function fallbackCopyText(text, title = 'คัดลอกสำเร็จ!', desc = 'ข้อความพร้อมใช้งานทันที') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        if (typeof showToast === 'function') {
            showToast('success', title, desc);
        }
    } catch (e) {
        alert('คัดลอกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    document.body.removeChild(textarea);
}

// ─────────────────────────────────────────────────────────────
// SAVE ORDER TO HISTORY (SUPABASE & LOCAL HISTORY)
// ─────────────────────────────────────────────────────────────
async function saveOrderToHistory() {
    if (AppState.orderList.length === 0) {
        if (typeof showToast === 'function') {
            showToast('warning', 'ไม่มีรายการบันทึก', 'กรุณาเลือกไม้ลงในตารางก่อนบันทึก');
        }
        return;
    }

    const orderNumber = 'ORD-MAT-' + Date.now().toString(36).toUpperCase();
    let totalSheets = 0;
    let grandTotal = 0;

    AppState.orderList.forEach(item => {
        totalSheets += item.quantity;
        grandTotal += (item.price * item.quantity);
    });

    const orderRecord = {
        order_number: orderNumber,
        items: AppState.orderList,
        total_sheets: totalSheets,
        grand_total: grandTotal,
        created_at: new Date().toISOString()
    };

    // 1. Save to LocalStorage History
    let history = [];
    try {
        const storedHistory = localStorage.getItem('sgyver_material_orders');
        if (storedHistory) history = JSON.parse(storedHistory);
    } catch (_) {}
    history.unshift(orderRecord);
    localStorage.setItem('sgyver_material_orders', JSON.stringify(history.slice(0, 50)));

    // 2. Save to Supabase DB (if available)
    if (AppState.supabaseClient) {
        try {
            await AppState.supabaseClient
                .from('sgyver_material_orders')
                .insert([orderRecord]);
        } catch (e) {
            console.warn('Supabase order insert note:', e);
        }
    }

    if (typeof showToast === 'function') {
        showToast('success', 'บันทึกออเดอร์เรียบร้อย', `รหัสคำสั่งซื้อ: ${orderNumber} (ยอดรวม: ${formatMoney(grandTotal)} ฿)`);
    }
}

function openOrderHistoryModal() {
    let history = [];
    try {
        const storedHistory = localStorage.getItem('sgyver_material_orders');
        if (storedHistory) history = JSON.parse(storedHistory);
    } catch (_) {}

    const container = document.getElementById('orderHistoryContent');
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = '<p class="text-center text-muted p-4">ยังไม่มีประวัติคำสั่งซื้อที่บันทึกไว้</p>';
    } else {
        container.innerHTML = history.map(item => {
            const date = new Date(item.created_at).toLocaleString('th-TH');
            const itemsCount = item.items?.length || 0;
            return `
                <div style="border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 8px; background: #f8fafc;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <strong style="color: var(--brand-primary);">${item.order_number}</strong>
                        <span style="font-size: 0.78rem; color: var(--text-muted);">${date}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">
                        จำนวน: ${item.total_sheets} แผ่น (${itemsCount} รายการ) • ยอดรวม: <strong style="color: #059669;">${formatMoney(item.grand_total)} ฿</strong>
                    </div>
                    <button class="btn-classic" style="padding: 2px 8px; font-size: 0.75rem;" onclick='restoreOrderItems(${JSON.stringify(item.items)})'>
                        <i class="bi bi-arrow-repeat"></i> โหลดรายการนี้เข้าตารางคำนวณ
                    </button>
                </div>
            `;
        }).join('');
    }

    openModal('orderHistoryModalOverlay');
}

function restoreOrderItems(items) {
    if (!Array.isArray(items)) return;
    AppState.orderList = JSON.parse(JSON.stringify(items));
    renderItemsList();
    renderOrderTable();
    closeModal('orderHistoryModalOverlay');
    if (typeof showToast === 'function') {
        showToast('success', 'โหลดรายการสำเร็จ', 'ดึงรายการคำสั่งซื้อเดิมกลับเข้าตารางคำนวณแล้ว');
    }
}

// ─────────────────────────────────────────────────────────────
// EXPORT & IMPORT JSON BACKUP CONTROLLERS
// ─────────────────────────────────────────────────────────────
function exportDataJson() {
    const backupObj = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        categories: AppState.categories,
        orderHistory: JSON.parse(localStorage.getItem('sgyver_material_orders') || '[]')
    };

    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgyver_material_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') {
        showToast('success', 'Export สำเร็จ!', 'ดาวน์โหลดไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว');
    }
}

function importDataJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.categories && Array.isArray(imported.categories)) {
                AppState.categories = imported.categories;
                saveAppData();
                renderCategories();
                selectCategory(AppState.categories[0]?.id || 'MDF');

                if (imported.orderHistory && Array.isArray(imported.orderHistory)) {
                    localStorage.setItem('sgyver_material_orders', JSON.stringify(imported.orderHistory));
                }

                if (typeof showToast === 'function') {
                    showToast('success', 'Import ข้อมูลสำเร็จ!', `นำเข้าประเภทไม้จำนวน ${AppState.categories.length} หมวดเรียบร้อยแล้ว`);
                }
            } else {
                throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
            }
        } catch (err) {
            if (typeof showToast === 'function') {
                showToast('error', 'นำเข้าไฟล์ล้มเหลว', 'ไฟล์ JSON ไม่ถูกต้องตามโครงสร้าง');
            }
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ─────────────────────────────────────────────────────────────
// MODAL HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────
function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.classic-modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
function formatMoney(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
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
