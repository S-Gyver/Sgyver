/**
 * S-GYVER WORKCHAT & PROJECT FILE VAULT
 * Modern Messenger Aesthetics – 3-Column Clean & Minimal Design
 */

// ── 1. GLOBAL STATE & DEFAULT DATA ──────────────────────────────────────────
const CHAT_STATE = {
    currentUser: {
        username: 'callie_goodman',
        displayName: 'Callie Goodman',
        avatar: 'user_boy'
    },
    activeChatId: 'general',
    activeProjectId: 'all',
    activeFolderId: null,
    selectedTagProjectId: '',
    chatsSearchQuery: '',
    currentRailTab: 'chat',
    chatFilter: 'all',
    stagedAttachment: null,

    projects: [],
    folders: [],
    files: [],
    groups: [],
    messages: [],

    activePreviewFile: null,
    mobileView: 'chat',
    realtimeChannel: null
};

// ── 🎨 ILLUSTRATED AVATARS (Matching Modern Cartoon Reference Screenshot) ──
function getIllustratedAvatar(avatarTypeOrName, fallbackName) {
    const key = String(avatarTypeOrName || fallbackName || '').toLowerCase();
    
    // 0. Group Avatar (Multiple Persons on Gradient)
    if (key.includes('group') || key.includes('team') || key.includes('กลุ่ม')) {
        return `
            <svg viewBox="0 0 100 100" fill="none" class="w-100 h-100">
                <defs>
                    <linearGradient id="grpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#3B82F6"/>
                        <stop offset="100%" stop-color="#8B5CF6"/>
                    </linearGradient>
                </defs>
                <rect width="100" height="100" fill="url(#grpGrad)"/>
                <circle cx="34" cy="38" r="14" fill="#FDE047"/>
                <circle cx="66" cy="38" r="14" fill="#FED7AA"/>
                <circle cx="50" cy="44" r="15" fill="#FFFFFF"/>
                <path d="M24 82C24 68 36 62 50 62C64 62 76 68 76 82V90H24V82Z" fill="#FFFFFF"/>
                <path d="M50 74C40 74 32 78 30 86H70C68 78 60 74 50 74Z" fill="#3B82F6" opacity="0.25"/>
            </svg>
        `;
    }

    // 1. Lilly Jr. (Cute blonde girl with blue/yellow headband & side buns)
    if (key.includes('lilly') || key.includes('มุก') || key.includes('design') || key.includes('pim')) {
        return `
            <svg viewBox="0 0 100 100" fill="none" class="w-100 h-100">
                <rect width="100" height="100" fill="#FED7AA"/>
                <!-- Hair Back -->
                <circle cx="50" cy="46" r="32" fill="#FBBF24"/>
                <!-- Headband -->
                <path d="M22 42C22 28 34 20 50 20C66 20 78 28 78 42" stroke="#3B82F6" stroke-width="8" stroke-linecap="round"/>
                <!-- Side buns -->
                <circle cx="20" cy="40" r="9" fill="#F59E0B"/>
                <circle cx="80" cy="40" r="9" fill="#F59E0B"/>
                <!-- Face -->
                <circle cx="50" cy="50" r="22" fill="#FFEDD5"/>
                <!-- Hair Bangs -->
                <path d="M36 40C40 44 48 44 50 42C52 44 60 44 64 40" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/>
                <!-- Eyes -->
                <circle cx="43" cy="48" r="2.5" fill="#1E293B"/>
                <circle cx="57" cy="48" r="2.5" fill="#1E293B"/>
                <!-- Smile -->
                <path d="M46 56C48 59 52 59 54 56" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
    }
    
    // 2. Rihanna Goldberg (Curly dark hair girl with green headband)
    if (key.includes('rihanna') || key.includes('goldberg')) {
        return `
            <svg viewBox="0 0 100 100" fill="none" class="w-100 h-100">
                <rect width="100" height="100" fill="#FED7AA"/>
                <!-- Big Curly Hair -->
                <circle cx="34" cy="36" r="16" fill="#1E293B"/>
                <circle cx="66" cy="36" r="16" fill="#1E293B"/>
                <circle cx="50" cy="28" r="18" fill="#1E293B"/>
                <circle cx="28" cy="50" r="14" fill="#1E293B"/>
                <circle cx="72" cy="50" r="14" fill="#1E293B"/>
                <!-- Headband -->
                <path d="M28 46C28 36 38 32 50 32C62 32 72 36 72 46" stroke="#10B981" stroke-width="7" stroke-linecap="round"/>
                <!-- Face -->
                <circle cx="50" cy="52" r="20" fill="#FDBA74"/>
                <!-- Eyes -->
                <circle cx="44" cy="50" r="2.5" fill="#1E293B"/>
                <circle cx="56" cy="50" r="2.5" fill="#1E293B"/>
                <!-- Smile -->
                <path d="M46 58C48 61 52 61 54 58" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
    }

    // 3. Gregory Portman (Cool guy with blonde hair & cyber cyan eye lens)
    if (key.includes('gregory') || key.includes('portman') || key.includes('เอก') || key.includes('robot') || key.includes('ช่าง')) {
        return `
            <svg viewBox="0 0 100 100" fill="none" class="w-100 h-100">
                <rect width="100" height="100" fill="#E2E8F0"/>
                <!-- Blonde Hair -->
                <path d="M30 42C30 26 38 18 52 18C66 18 70 26 70 38" fill="#FBBF24"/>
                <circle cx="50" cy="48" r="21" fill="#FFEDD5"/>
                <!-- Left Eye -->
                <circle cx="43" cy="46" r="2.5" fill="#1E293B"/>
                <!-- Right Cyber Lens -->
                <circle cx="57" cy="46" r="6" fill="#06B6D4" opacity="0.3"/>
                <circle cx="57" cy="46" r="3.5" fill="#06B6D4"/>
                <circle cx="57" cy="46" r="1.5" fill="#FFFFFF"/>
                <path d="M51 46H63" stroke="#06B6D4" stroke-width="1.5"/>
                <path d="M46 54C48 56 52 56 54 54" stroke="#0F172A" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
    }

    // 4. Marry Adams (Dark hair bob girl with subtle pink tint)
    if (key.includes('marry') || key.includes('adams') || key.includes('จัดซื้อ')) {
        return `
            <svg viewBox="0 0 100 100" fill="none" class="w-100 h-100">
                <rect width="100" height="100" fill="#FEE2E2"/>
                <!-- Bob Hair -->
                <path d="M26 44C26 28 36 20 50 20C64 20 74 28 74 44V60C74 60 70 54 66 54C62 54 58 60 50 60C42 60 38 54 34 54C30 54 26 60 26 60V44Z" fill="#334155"/>
                <circle cx="50" cy="48" r="19" fill="#FFEDD5"/>
                <circle cx="44" cy="47" r="2.5" fill="#1E293B"/>
                <circle cx="56" cy="47" r="2.5" fill="#1E293B"/>
                <path d="M46 54C48 56 52 56 54 54" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
    }

    // 5. Default User / Boy with dark swept hair (like user screenshot bottom left & outgoing msg)
    return `
        <svg viewBox="0 0 100 100" fill="none" class="w-100 h-100">
            <rect width="100" height="100" fill="#E2E8F0"/>
            <path d="M35 75C35 68 42 62 50 62C58 62 65 68 65 75V100H35V75Z" fill="#F1F5F9"/>
            <circle cx="50" cy="48" r="21" fill="#FFEDD5"/>
            <!-- Dark swept hair -->
            <path d="M28 42C28 26 38 18 54 18C68 18 74 26 74 38C74 44 70 48 64 48C58 48 56 42 50 42C44 42 38 48 34 48C30 48 28 46 28 42Z" fill="#1E293B"/>
            <circle cx="45" cy="47" r="2" fill="#0F172A"/>
            <circle cx="57" cy="47" r="2" fill="#0F172A"/>
            <path d="M42 42C45 41 48 42 48 42" stroke="#0F172A" stroke-width="2" stroke-linecap="round"/>
            <path d="M54 42C57 41 60 42 60 42" stroke="#0F172A" stroke-width="2" stroke-linecap="round"/>
            <path d="M47 54C49 56 52 56 54 54" stroke="#0F172A" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
}

function renderAvatarDisplay(avatar) {
    if (!avatar) return getIllustratedAvatar('callie');
    if (typeof avatar === 'string' && (avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://'))) {
        return `<img src="${avatar}" alt="Avatar" class="w-100 h-100 object-fit-cover">`;
    }
    return getIllustratedAvatar(avatar);
}

// Starter Mock Data for Instant Demonstration
const DEFAULT_PROJECTS = [
    {
        id: 'proj_pim_2026',
        name: 'โปรเจกต์ A - นิทรรศการ 10 ปีสาธิต PIM',
        code: 'PIM-2026',
        color: '#3b82f6',
        description: 'งานผลิตฉาก Backdrop ไม้และแท่นวางโมเดลนิทรรศการ',
        created_by: 'เอส (Admin)',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
        id: 'proj_robot_arm',
        name: 'โปรเจกต์ B - ชุดแขนกลหุ่นยนต์ 4-DOF',
        code: 'ROBOT-01',
        color: '#f59e0b',
        description: 'จัดทำบอร์ดวงจรควบคุม WiFi และโครงสร้างอะคริลิกเลเซอร์คัต',
        created_by: 'ช่างเอก',
        created_at: new Date(Date.now() - 86400000).toISOString()
    }
];

const DEFAULT_FOLDERS = [
    {
        id: 'fld_pim_drawings',
        project_id: 'proj_pim_2026',
        parent_id: null,
        name: '01_แบบแปลน & ขนาด 3D',
        created_by: 'เอส (Admin)',
        created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'fld_pim_photos',
        project_id: 'proj_pim_2026',
        parent_id: null,
        name: '02_รูปถ่ายหน้างานจริง',
        created_by: 'น้องมุก (ดีไซน์)',
        created_at: new Date(Date.now() - 72000000).toISOString()
    },
    {
        id: 'fld_pim_docs',
        project_id: 'proj_pim_2026',
        parent_id: null,
        name: '03_ใบเสนอราคา & สัญญา',
        created_by: 'เอส (Admin)',
        created_at: new Date(Date.now() - 50000000).toISOString()
    },
    {
        id: 'fld_robot_schematics',
        project_id: 'proj_robot_arm',
        parent_id: null,
        name: '01_วงจรและโค้ดโปรแกรม',
        created_by: 'ช่างเอก',
        created_at: new Date(Date.now() - 40000000).toISOString()
    }
];

const DEFAULT_FILES = [
    {
        id: 'file_spec_pim',
        project_id: 'proj_pim_2026',
        folder_id: 'fld_pim_drawings',
        name: 'สเปกกรอบฉากนิทรรศการ_2x2.3m.pdf',
        file_url: 'sample_items/backdrop_racing.png',
        file_type: 'pdf',
        file_size: 2450000,
        uploaded_by: 'เอส (Admin)',
        created_at: new Date(Date.now() - 80000000).toISOString()
    },
    {
        id: 'file_photo_stand',
        project_id: 'proj_pim_2026',
        folder_id: 'fld_pim_photos',
        name: 'ตัวอย่างขาตั้งไม้ประกอบจริง.png',
        file_url: 'sample_items/farm_stand.png',
        file_type: 'image',
        file_size: 1120000,
        uploaded_by: 'น้องมุก (ดีไซน์)',
        created_at: new Date(Date.now() - 65000000).toISOString()
    }
];

const DEFAULT_GROUPS = [
    {
        id: 'grp_gyver_team',
        name: 'กลุ่มทีมหลัก Gyver Core Team',
        members: ['callie_goodman', 'lilly_jr', 'rihanna_goldberg', 'gregory_portman', 'marry_adams'],
        created_by: 'Callie Goodman',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    }
];

const DEFAULT_MESSAGES = [
    // ── 1. Group Chat: grp_gyver_team ──
    {
        id: 'msg_grp_1',
        chat_id: 'grp_gyver_team',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'สวัสดีทีม Gyver ทุกคนครับ! ห้องนี้เป็นกลุ่มแชทหลักสำหรับประสานงานโครงการทั้งหมด 🚀',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 72000000).toISOString()
    },
    {
        id: 'msg_grp_2',
        chat_id: 'grp_gyver_team',
        sender_username: 'lilly_jr',
        sender_name: 'Lilly Jr.',
        avatar: 'lilly',
        message_text: 'ยินดีค่ะทุกคน! ทีมดีไซน์เตรียมแบบงานชุดใหม่พร้อมส่งเข้าคลังไฟล์แล้ว',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 65000000).toISOString()
    },
    {
        id: 'msg_grp_3',
        chat_id: 'grp_gyver_team',
        sender_username: 'gregory_portman',
        sender_name: 'Gregory Portman',
        avatar: 'gregory',
        message_text: 'ทีมวิศวกรรมพร้อมลุยครับ บอร์ดควบคุมชุดใหม่เริ่มทดสอบแล้ว',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 50000000).toISOString()
    },

    // ── 2. Direct Chat: Lilly Jr. (general) ──
    {
        id: 'msg_lilly_1',
        chat_id: 'general',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'Hi, Mrs. Lilly',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 45000000).toISOString()
    },
    {
        id: 'msg_lilly_2',
        chat_id: 'general',
        sender_username: 'lilly_jr',
        sender_name: 'Lilly Jr.',
        avatar: 'lilly',
        message_text: 'Hey Callie! How is the exhibition project going?',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 40000000).toISOString()
    },
    {
        id: 'msg_lilly_3',
        chat_id: 'general',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'Hello Mrs. Lilly, i have a good idea how to create the backdrop with help of our team. Can we meet up tomorrow near the bar to talk?',
        project_id: 'proj_pim_2026',
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 36000000).toISOString()
    },
    {
        id: 'msg_lilly_4',
        chat_id: 'general',
        sender_username: 'lilly_jr',
        sender_name: 'Lilly Jr.',
        avatar: 'lilly',
        message_text: 'Good idea! i like this',
        project_id: 'proj_pim_2026',
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 18000000).toISOString()
    },
    {
        id: 'msg_lilly_5',
        chat_id: 'general',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'แนบแบบแปลนโครงสร้างไม้และตัวอย่างชิ้นงานประกอบจริงไว้ในโฟลเดอร์โปรเจกต์ PIM ให้เรียบร้อยแล้วครับ',
        project_id: 'proj_pim_2026',
        folder_id: 'fld_pim_photos',
        file_data: {
            name: 'ตัวอย่างขาตั้งไม้ประกอบจริง.png',
            url: 'sample_items/farm_stand.png',
            type: 'image',
            size: '1.1 MB'
        },
        created_at: new Date(Date.now() - 6000000).toISOString()
    },

    // ── 3. Direct Chat: Rihanna Goldberg (dm_rihanna) ──
    {
        id: 'msg_rihanna_1',
        chat_id: 'dm_rihanna',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'สวัสดีครับคุณริฮานน่า ราคาไม้อัดเกรดเฟอร์นิเจอร์และบานพับสำหรับโปรเจกต์ PIM ได้ราคาหรือยังครับ',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 30000000).toISOString()
    },
    {
        id: 'msg_rihanna_2',
        chat_id: 'dm_rihanna',
        sender_username: 'rihanna_goldberg',
        sender_name: 'Rihanna Goldberg',
        avatar: 'rihanna',
        message_text: 'เช็คราคาโรงงานให้แล้วค่ะ สั่งไม้อัด 15mm ได้ส่วนลด 12% เดี๋ยวสรุปยอดให้นะคะ',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 25000000).toISOString()
    },
    {
        id: 'msg_rihanna_3',
        chat_id: 'dm_rihanna',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'ยอดเยี่ยมเลยครับ ขอบคุณมากครับ!',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 20000000).toISOString()
    },
    {
        id: 'msg_rihanna_4',
        chat_id: 'dm_rihanna',
        sender_username: 'rihanna_goldberg',
        sender_name: 'Rihanna Goldberg',
        avatar: 'rihanna',
        message_text: 'Great, Thanks! ยินดีเสมอค่ะ',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 15000000).toISOString()
    },

    // ── 4. Direct Chat: Gregory Portman (dm_gregory) ──
    {
        id: 'msg_greg_1',
        chat_id: 'dm_gregory',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'คุณเกรกอรี่ ตัวบอร์ด ESP32 คุมแขนกล 4-DOF เขียนโค้ด Servo ถึงไหนแล้วครับ',
        project_id: 'proj_robot_arm',
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 28000000).toISOString()
    },
    {
        id: 'msg_greg_2',
        chat_id: 'dm_gregory',
        sender_username: 'gregory_portman',
        sender_name: 'Gregory Portman',
        avatar: 'gregory',
        message_text: 'ทดสอบการเคลื่อนที่และกริปเปอร์ผ่านเว็บเรียบร้อยแล้วครับ เสถียรดีมาก',
        project_id: 'proj_robot_arm',
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 22000000).toISOString()
    },
    {
        id: 'msg_greg_3',
        chat_id: 'dm_gregory',
        sender_username: 'gregory_portman',
        sender_name: 'Gregory Portman',
        avatar: 'gregory',
        message_text: 'This is so good man. Will do Remix & อัปเกรดเฟิร์มแวร์ให้อีกนิดนะ',
        project_id: 'proj_robot_arm',
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 12000000).toISOString()
    },

    // ── 5. Direct Chat: Marry Adams (dm_marry) ──
    {
        id: 'msg_marry_1',
        chat_id: 'dm_marry',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'คุณแมรี่ รบกวนช่วยตรวจเอกสารสัญญาจ้างและใบเสนอราคาของงาน PIM ให้หน่อยนะครับ',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 19000000).toISOString()
    },
    {
        id: 'msg_marry_2',
        chat_id: 'dm_marry',
        sender_username: 'marry_adams',
        sender_name: 'Marry Adams',
        avatar: 'marry',
        message_text: 'Cool. We can help Lilly & ทีมงาน กำลังเร่งทำเอกสารให้ค่ะ',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 10000000).toISOString()
    },

    // ── 6. Direct Chat: Callie Goodman (dm_callie - Note to self / Sample) ──
    {
        id: 'msg_callie_1',
        chat_id: 'dm_callie',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: `รับมอบหมาย\n5.สามารถปฏิบัติตามกติกาของ\nชุมนุม ใช้อุปกรณ์คอมพิวเตอร์\nอย่างเหมาะสม และเคารพ\nความคิดเห็นของผู้อื่น\n6.มีความพร้อมในการลงมือ\nปฏิบัติ สร้างผลงาน และนำ\nเสนอผลงานของตนเองตาม\nความเหมาะสม`,
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 50400000).toISOString()
    },
    {
        id: 'msg_callie_2',
        chat_id: 'dm_callie',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'https://www.instagram.com/reel/De-1LKppLWm/?obrf=MW5mMzc5OXVjOHN0ZA==',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 50000000).toISOString()
    },

    // ── 7. Project Room: proj_pim_2026 ──
    {
        id: 'msg_proj_pim_1',
        chat_id: 'proj_pim_2026',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'ห้องแชทกลางสำหรับติดตามแบบและไฟล์โปรเจกต์ PIM-2026',
        project_id: 'proj_pim_2026',
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 36000000).toISOString()
    },
    {
        id: 'msg_proj_pim_2',
        chat_id: 'proj_pim_2026',
        sender_username: 'lilly_jr',
        sender_name: 'Lilly Jr.',
        avatar: 'lilly',
        message_text: 'อัปโหลดแบบแปลน 3D และตัวอย่างฉากลงโฟลเดอร์เรียบร้อยแล้วค่ะ',
        project_id: 'proj_pim_2026',
        folder_id: 'fld_pim_drawings',
        file_data: null,
        created_at: new Date(Date.now() - 18000000).toISOString()
    },

    // ── 8. Project Room: proj_robot_arm ──
    {
        id: 'msg_proj_rob_1',
        chat_id: 'proj_robot_arm',
        sender_username: 'gregory_portman',
        sender_name: 'Gregory Portman',
        avatar: 'gregory',
        message_text: 'ห้องงานหุ่นยนต์แขนกล ROBOT-01 โค้ดและวงจรทั้งหมดอัปขึ้นโฟลเดอร์เรียบร้อยครับ',
        project_id: 'proj_robot_arm',
        folder_id: 'fld_robot_schematics',
        file_data: null,
        created_at: new Date(Date.now() - 14000000).toISOString()
    }
];

// ── 2. INITIALIZATION ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    syncUserProfileFromGyver();
    loadWorkspaceData();
    initSupabaseSync();
    initEmojiPicker();
    renderProjectDropdownList();
    renderProjectPills();
    renderExplorer();
    renderChatsList();
    renderMessages();
    scrollMessagesToBottom();
});

async function syncUserProfileFromGyver() {
    let syncedName = '';
    let syncedAvatar = '';
    let syncedUsername = '';
    let userLevel = 1;
    let userRole = 'user';
    let isLoggedIn = false;

    // Step 1: Sync from Parent Window DOM (when in iframe inside Gyver Workspace)
    try {
        if (window.parent && window.parent !== window) {
            const pDoc = window.parent.document;
            const pNameEl = pDoc.getElementById('nav-user-name');
            const pAvatarEl = pDoc.getElementById('nav-user-avatar');
            const pBadgeEl = pDoc.getElementById('nav-user-badge');

            if (pNameEl && pNameEl.innerText && pNameEl.innerText.trim() && pNameEl.innerText.trim() !== 'User') {
                syncedName = pNameEl.innerText.trim();
                syncedUsername = syncedName.toLowerCase().replace(/\s+/g, '_');
                isLoggedIn = true;
            }
            if (pAvatarEl && pAvatarEl.src && !pAvatarEl.src.includes('149071.png')) {
                syncedAvatar = pAvatarEl.src;
            }
            // Parse level from parent badge (e.g. "Lv.5")
            if (pBadgeEl && pBadgeEl.innerText) {
                const match = pBadgeEl.innerText.match(/\d+/);
                if (match) {
                    userLevel = Math.max(userLevel, parseInt(match[0], 10));
                }
            }
            // Parse level from parent body class (e.g. "is-lv5", "is-lv4")
            if (pDoc.body) {
                const match = pDoc.body.className.match(/is-lv(\d+)/);
                if (match) {
                    userLevel = Math.max(userLevel, parseInt(match[1], 10));
                }
            }
            if (window.parent.currentUserRole === 'admin') {
                userRole = 'admin';
                userLevel = Math.max(userLevel, 5);
                isLoggedIn = true;
            }
        }
    } catch (_) {}

    // Step 2: Check localStorage level cached by Workspace
    try {
        const storedLv = parseInt(localStorage.getItem('gyver_user_level') || '0', 10);
        if (storedLv > 0) {
            userLevel = Math.max(userLevel, storedLv);
            isLoggedIn = true;
        }
    } catch (_) {}

    // Step 3: Check localStorage admin session
    try {
        const adminSession = sessionStorage.getItem('gyver_admin_session') || localStorage.getItem('gyver_admin_session');
        if (adminSession) {
            const parsed = JSON.parse(adminSession);
            userRole = 'admin';
            userLevel = Math.max(userLevel, 5);
            isLoggedIn = true;
            if (!syncedName && parsed.name) syncedName = parsed.name;
        }
    } catch (_) {}

    // Step 4: Admin name recognition ("เอส", "admin", "sgyver")
    if (syncedName && (syncedName.includes('เอส') || syncedName.toLowerCase().includes('admin') || syncedName.toLowerCase().includes('s gyver') || syncedName.toLowerCase().includes('sgyver'))) {
        userLevel = Math.max(userLevel, 5);
        userRole = 'admin';
        isLoggedIn = true;
    }

    // Step 5: Fallback to localStorage cache
    try {
        const saved = localStorage.getItem('gyver_workchat_user');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!syncedName && parsed.displayName) syncedName = parsed.displayName;
            if (!syncedAvatar && parsed.avatar) syncedAvatar = parsed.avatar;
            if (!syncedUsername && parsed.username) syncedUsername = parsed.username;
            if (parsed.level !== undefined) userLevel = Math.max(userLevel, parsed.level);
            if (parsed.role && parsed.role === 'admin') userRole = 'admin';
            if (parsed.isLoggedIn) isLoggedIn = true;
        }
    } catch (_) {}

    // Step 6: Check Supabase session
    const sb = window.supabaseClient || (window.parent && window.parent.supabaseClient);
    if (sb) {
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (session && session.user) {
                const u = session.user;
                syncedUsername = syncedUsername || (u.email ? u.email.split('@')[0] : 'user');
                syncedName = syncedName || (u.user_metadata?.full_name || u.user_metadata?.nickname || u.user_metadata?.name || syncedUsername);
                syncedAvatar = syncedAvatar || (u.user_metadata?.avatar_url || '');
                isLoggedIn = true;

                // Query profile table
                const { data: prof } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
                if (prof) {
                    if (prof.level) userLevel = Math.max(userLevel, Number(prof.level) || 1);
                    if (prof.role === 'admin' || (prof.username && prof.username.toLowerCase() === 'admin')) {
                        userRole = 'admin';
                        userLevel = Math.max(userLevel, 5);
                    }
                    if (prof.full_name || prof.nickname) {
                        syncedName = prof.nickname || prof.full_name;
                    }
                }
            }
        } catch (_) {}
    }

    // Default to admin "เอส" if in workspace and user is admin
    if (!syncedName) {
        syncedName = 'เอส (Admin)';
        userLevel = Math.max(userLevel, 5);
        userRole = 'admin';
    }

    CHAT_STATE.currentUser.displayName = syncedName;
    CHAT_STATE.currentUser.username = syncedUsername || syncedName.toLowerCase().replace(/\s+/g, '_');
    CHAT_STATE.currentUser.avatar = syncedAvatar || 'user_boy';
    CHAT_STATE.currentUser.level = userLevel;
    CHAT_STATE.currentUser.role = userRole;

    try {
        localStorage.setItem('gyver_workchat_user', JSON.stringify({
            displayName: syncedName,
            username: CHAT_STATE.currentUser.username,
            avatar: CHAT_STATE.currentUser.avatar,
            level: userLevel,
            role: userRole,
            isLoggedIn: true
        }));
    } catch (_) {}

    updateUserUI();
    enforcePermissionGuard(userLevel, userRole);
}

function enforcePermissionGuard(level, role) {
    // If launched from workspace, or user is admin, or user has level >= 1, do not block
    const isAllowed = (level >= 1 || role === 'admin' || (window.parent && window.parent !== window));
    const guardOverlay = document.getElementById('workchat-permission-guard');
    if (!guardOverlay) return;

    if (isAllowed) {
        guardOverlay.classList.add('d-none');
    } else {
        guardOverlay.classList.remove('d-none');
        const nameEl = document.getElementById('guard-current-user-name');
        const badgeEl = document.getElementById('guard-current-level-badge');
        if (nameEl) nameEl.textContent = CHAT_STATE.currentUser.displayName || 'ผู้ใช้งาน';
        if (badgeEl) {
            badgeEl.className = 'badge bg-secondary font-mono';
            badgeEl.textContent = `Lv.${level}`;
        }
    }
}

function updateUserUI() {
    const u = CHAT_STATE.currentUser;
    const railAvatar = document.getElementById('rail-user-avatar');
    if (railAvatar) {
        railAvatar.innerHTML = renderAvatarDisplay(u.avatar || 'user_boy');
    }
}

function handleUserProfileClick() {
    const u = CHAT_STATE.currentUser;
    const nameEl = document.getElementById('modal-card-name');
    const avatarEl = document.getElementById('modal-card-avatar');
    if (nameEl) nameEl.textContent = u.displayName || u.username;
    if (avatarEl) avatarEl.innerHTML = renderAvatarDisplay(u.avatar || 'user_boy');

    const modalEl = document.getElementById('modalUserProfileCard');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

// ── 3. DATA PERSISTENCE & SUPABASE REALTIME ──────────────────────────────────
function loadWorkspaceData() {
    try {
        const savedProjects = localStorage.getItem('sgyver_workchat_projects');
        CHAT_STATE.projects = savedProjects ? JSON.parse(savedProjects) : DEFAULT_PROJECTS;

        const savedFolders = localStorage.getItem('sgyver_workchat_folders');
        CHAT_STATE.folders = savedFolders ? JSON.parse(savedFolders) : DEFAULT_FOLDERS;

        const savedFiles = localStorage.getItem('sgyver_workchat_files');
        CHAT_STATE.files = savedFiles ? JSON.parse(savedFiles) : DEFAULT_FILES;

        const savedGroups = localStorage.getItem('sgyver_workchat_groups');
        CHAT_STATE.groups = savedGroups ? JSON.parse(savedGroups) : DEFAULT_GROUPS;

        const savedMessages = localStorage.getItem('sgyver_workchat_messages');
        if (savedMessages) {
            const parsed = JSON.parse(savedMessages);
            CHAT_STATE.messages = parsed.map(m => {
                if (!m.chat_id) {
                    m.chat_id = m.project_id || 'general';
                }
                return m;
            });
            // Backfill default channels if user's local storage lacks them
            DEFAULT_MESSAGES.forEach(dm => {
                if (!CHAT_STATE.messages.some(m => m.chat_id === dm.chat_id)) {
                    CHAT_STATE.messages.push(dm);
                }
            });
        } else {
            CHAT_STATE.messages = DEFAULT_MESSAGES;
        }
    } catch (_) {
        CHAT_STATE.projects = DEFAULT_PROJECTS;
        CHAT_STATE.folders = DEFAULT_FOLDERS;
        CHAT_STATE.files = DEFAULT_FILES;
        CHAT_STATE.groups = DEFAULT_GROUPS;
        CHAT_STATE.messages = DEFAULT_MESSAGES;
    }
}

function saveWorkspaceData() {
    try {
        localStorage.setItem('sgyver_workchat_projects', JSON.stringify(CHAT_STATE.projects));
        localStorage.setItem('sgyver_workchat_folders', JSON.stringify(CHAT_STATE.folders));
        localStorage.setItem('sgyver_workchat_files', JSON.stringify(CHAT_STATE.files));
        localStorage.setItem('sgyver_workchat_groups', JSON.stringify(CHAT_STATE.groups));
        localStorage.setItem('sgyver_workchat_messages', JSON.stringify(CHAT_STATE.messages));
    } catch (_) {}
}

async function initSupabaseSync() {
    if (!window.supabaseClient) return;

    try {
        const { data: dbProjects } = await window.supabaseClient.from('workchat_projects').select('*').order('created_at', { ascending: false });
        if (dbProjects && dbProjects.length > 0) CHAT_STATE.projects = dbProjects;

        const { data: dbFolders } = await window.supabaseClient.from('workchat_folders').select('*').order('created_at', { ascending: true });
        if (dbFolders && dbFolders.length > 0) CHAT_STATE.folders = dbFolders;

        const { data: dbFiles } = await window.supabaseClient.from('workchat_files').select('*').order('created_at', { ascending: false });
        if (dbFiles && dbFiles.length > 0) CHAT_STATE.files = dbFiles;

        const { data: dbMessages } = await window.supabaseClient.from('workchat_messages').select('*').order('created_at', { ascending: true }).limit(100);
        if (dbMessages && dbMessages.length > 0) CHAT_STATE.messages = dbMessages;

        saveWorkspaceData();
        renderProjectDropdownList();
        renderProjectPills();
        renderExplorer();
        renderChatsList();
        renderMessages();
        scrollMessagesToBottom();

        // Realtime Subscription
        CHAT_STATE.realtimeChannel = window.supabaseClient.channel('workchat_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workchat_messages' }, payload => {
                if (payload.new && !CHAT_STATE.messages.find(m => m.id === payload.new.id)) {
                    CHAT_STATE.messages.push(payload.new);
                    saveWorkspaceData();
                    renderChatsList();
                    renderMessages();
                    scrollMessagesToBottom();
                    playIncomingChime();
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workchat_projects' }, () => {
                reloadProjectsFromCloud();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workchat_files' }, () => {
                reloadFilesFromCloud();
            })
            .subscribe();

    } catch (err) {
        console.warn('Supabase local sync notice:', err);
    }
}

async function reloadProjectsFromCloud() {
    if (!window.supabaseClient) return;
    const { data } = await window.supabaseClient.from('workchat_projects').select('*').order('created_at', { ascending: false });
    if (data) {
        CHAT_STATE.projects = data;
        saveWorkspaceData();
        renderProjectDropdownList();
        renderProjectPills();
        renderChatsList();
    }
}

async function reloadFilesFromCloud() {
    if (!window.supabaseClient) return;
    const { data } = await window.supabaseClient.from('workchat_files').select('*').order('created_at', { ascending: false });
    if (data) {
        CHAT_STATE.files = data;
        saveWorkspaceData();
        renderExplorer();
    }
}

// ── 4. CHATS COLUMN (MIDDLE COLUMN CONVERSATION LIST) ───────────────────────
function setChatsFilter(filterType) {
    CHAT_STATE.chatFilter = filterType;
    document.querySelectorAll('.chats-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });
    renderChatsList();
}
window.setChatsFilter = setChatsFilter;

function renderChatsList() {
    const container = document.getElementById('chats-list-stream');
    if (!container) return;

    const query = (CHAT_STATE.chatsSearchQuery || '').toLowerCase();
    const currentFilter = CHAT_STATE.chatFilter || 'all';

    // 1. Group Conversations (Built-in + Custom Created)
    const groupChannels = (CHAT_STATE.groups || []).map(g => ({
        id: g.id,
        name: g.name,
        isGroup: true,
        type: 'group',
        memberCount: (g.members && g.members.length) || 1,
        subtitleDefault: `กลุ่มแชท (${(g.members && g.members.length) || 1} คน)`,
        avatarType: 'group',
        status: `กลุ่มแชท • สมาชิก ${(g.members && g.members.length) || 1} คน`
    }));

    // 2. 1-on-1 Direct Chats
    const directChannels = [
        {
            id: 'general',
            name: 'Lilly Jr.',
            subtitleDefault: 'Good idea! I like this.',
            avatarType: 'lilly',
            status: 'ออนไลน์ • ฝ่ายดีไซน์',
            isDirect: true,
            type: 'direct'
        },
        {
            id: 'dm_rihanna',
            name: 'Rihanna Goldberg',
            subtitleDefault: 'Great, Thanks!',
            avatarType: 'rihanna',
            status: 'ออนไลน์ • จัดซื้อและผลิต',
            isDirect: true,
            type: 'direct'
        },
        {
            id: 'dm_gregory',
            name: 'Gregory Portman',
            subtitleDefault: 'This is so good man. Will do Remix.',
            avatarType: 'gregory',
            status: 'ออนไลน์ • วิศวกรโครงสร้าง',
            isDirect: true,
            type: 'direct'
        },
        {
            id: 'dm_marry',
            name: 'Marry Adams',
            subtitleDefault: 'Cool. We can help Lilly.',
            avatarType: 'marry',
            status: 'ออฟไลน์ • ประสานงาน',
            isDirect: true,
            type: 'direct'
        },
        {
            id: 'dm_callie',
            name: 'Callie Goodman',
            subtitleDefault: 'You: Call me today. We have a new project.',
            avatarType: 'user_boy',
            status: 'บันทึกส่วนตัว (Note to self)',
            isDirect: true,
            type: 'direct'
        }
    ];

    // 3. Dynamic Projects
    const projectChannels = CHAT_STATE.projects.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        subtitleDefault: p.description || 'โฟลเดอร์ไฟล์โปรเจกต์',
        avatarType: (p.code && p.code.includes('PIM')) ? 'lilly' : 'gregory',
        status: `โปรเจกต์ ${p.code || ''}`,
        projectId: p.id,
        isProject: true,
        type: 'project'
    }));

    let allChannels = [];
    if (currentFilter === 'direct') {
        allChannels = directChannels;
    } else if (currentFilter === 'group') {
        allChannels = groupChannels;
    } else {
        // 'all' includes Groups, Direct chats, and Projects
        allChannels = [...groupChannels, ...directChannels, ...projectChannels];
    }

    const filtered = allChannels.filter(c => 
        !query || 
        c.name.toLowerCase().includes(query) || 
        (c.code && c.code.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        if (currentFilter === 'group') {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-people fs-1 d-block mb-2 text-primary opacity-50"></i>
                    <div class="fw-bold">ไม่พบกลุ่มคุยงาน</div>
                    <div class="small mb-3">คุณสามารถสร้างกลุ่มคุยงานใหม่เพื่อคุยหลายคนได้เลยครับ</div>
                    <button type="button" class="btn btn-sm btn-primary rounded-pill px-3 fw-bold" onclick="openNewGroupModal()">
                        <i class="bi bi-plus-lg me-1"></i> สร้างกลุ่มคุยงาน
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-chat-left-dots fs-1 d-block mb-2 text-primary opacity-50"></i>
                <div class="fw-bold">ไม่พบการสนทนา</div>
                <div class="small">ค้นหาด้วยชื่ออื่น หรือกดปุ่ม + เพื่อสร้างกลุ่มแชทใหม่</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const isActive = (CHAT_STATE.activeChatId === item.id) || (!CHAT_STATE.activeChatId && item.id === 'general');
        
        // Find latest message snippet for this specific chat
        let snippet = item.subtitleDefault;
        let lastTime = '';
        const chatMsgs = CHAT_STATE.messages.filter(m => m.chat_id === item.id || (!m.chat_id && item.id === 'general'));
        if (chatMsgs.length > 0) {
            const lastM = chatMsgs[chatMsgs.length - 1];
            const isMe = (lastM.sender_username === CHAT_STATE.currentUser.username || lastM.sender_name === CHAT_STATE.currentUser.displayName);
            const prefix = isMe ? 'คุณ: ' : (item.isGroup ? `${lastM.sender_name.split(' ')[0]}: ` : '');
            snippet = prefix + (lastM.file_data ? `[ไฟล์] ${lastM.file_data.name}` : lastM.message_text);
            lastTime = formatMessageTime(lastM.created_at);
        }

        return `
            <div class="chat-conversation-item ${isActive ? 'active' : ''}" onclick="selectChatConversation('${item.id}')">
                <div class="item-avatar-circle">
                    ${getIllustratedAvatar(item.avatarType, item.name)}
                </div>
                <div class="item-info">
                    <div class="item-title-row">
                        <span class="item-name">${escapeHtml(item.name)}</span>
                        ${item.isGroup ? '<span class="badge bg-primary-subtle text-primary border border-primary-subtle" style="font-size: 0.65rem; padding: 2px 6px; border-radius: 6px;">กลุ่ม</span>' : ''}
                        ${lastTime ? `<span class="item-time ms-auto">${lastTime}</span>` : ''}
                    </div>
                    <div class="item-snippet">${escapeHtml(snippet)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ── 4.5 PEOPLE (FRIENDS) LIST ENGINE ────────────────────────────────────────
const TEAM_FRIENDS = [
    {
        id: 'general',
        username: 'lilly_jr',
        name: 'Lilly Jr.',
        role: 'ฝ่ายดีไซน์ (Design Lead)',
        avatarType: 'lilly',
        status: 'online',
        bio: 'ออกแบบฉากนิทรรศการ และโมเดล 3D'
    },
    {
        id: 'dm_rihanna',
        username: 'rihanna_goldberg',
        name: 'Rihanna Goldberg',
        role: 'ฝ่ายจัดซื้อและผลิต (Production)',
        avatarType: 'rihanna',
        status: 'online',
        bio: 'เช็คราคาไม้ สเปกบานพับ และสั่งซื้ออุปกรณ์'
    },
    {
        id: 'dm_gregory',
        username: 'gregory_portman',
        name: 'Gregory Portman',
        role: 'วิศวกรโครงสร้าง & หุ่นยนต์ (Engineering)',
        avatarType: 'gregory',
        status: 'online',
        bio: 'โปรเจกต์หุ่นยนต์แขนกล และงานระบบบอร์ด'
    },
    {
        id: 'dm_marry',
        username: 'marry_adams',
        name: 'Marry Adams',
        role: 'ผู้ประสานงานโครงการ (Coordinator)',
        avatarType: 'marry',
        status: 'offline',
        bio: 'ติดตามเอกสารใบเสนอราคาและสัญญาจ้าง'
    },
    {
        id: 'dm_callie',
        username: 'callie_goodman',
        name: 'Callie Goodman',
        role: 'ผู้จัดการโปรเจกต์ (Project Manager)',
        avatarType: 'user_boy',
        status: 'online',
        bio: 'วางแผนงาน ติดตามกำหนดส่งมอบงาน'
    }
];

function renderPeopleList() {
    const container = document.getElementById('chats-list-stream');
    if (!container) return;

    const query = (CHAT_STATE.chatsSearchQuery || '').toLowerCase();
    const filtered = TEAM_FRIENDS.filter(f => 
        !query || 
        f.name.toLowerCase().includes(query) || 
        f.role.toLowerCase().includes(query) ||
        f.bio.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-people fs-1 d-block mb-2 text-primary opacity-50"></i>
                <div class="fw-bold">ไม่พบรายชื่อเพื่อน</div>
                <div class="small">ลองค้นหาด้วยคำอื่น หรือกดปุ่ม + ด้านบนเพื่อเพิ่มเพื่อน</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="d-flex align-items-center justify-content-between px-2 py-2 mb-1">
            <span class="small fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.5px;">รายชื่อเพื่อน (${filtered.length})</span>
            <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill font-mono" style="font-size: 0.68rem;">ออนไลน์ 4</span>
        </div>
        ${filtered.map(friend => `
            <div class="people-card-item" onclick="openDirectChatFromPeople('${friend.id}')">
                <div class="people-avatar-wrap">
                    ${getIllustratedAvatar(friend.avatarType, friend.name)}
                    <span class="people-status-dot ${friend.status}"></span>
                </div>
                <div class="people-info">
                    <div class="d-flex align-items-center justify-content-between">
                        <span class="people-name">${escapeHtml(friend.name)}</span>
                        <span class="people-status-badge ${friend.status}">
                            ${friend.status === 'online' ? '● ออนไลน์' : 'ออฟไลน์'}
                        </span>
                    </div>
                    <div class="people-role">${escapeHtml(friend.role)}</div>
                    <div class="people-bio">${escapeHtml(friend.bio)}</div>
                </div>
                <button type="button" class="btn-people-chat" onclick="event.stopPropagation(); openDirectChatFromPeople('${friend.id}')" title="ส่งข้อความคุยกับ ${escapeHtml(friend.name)}">
                    <i class="bi bi-chat-dots-fill"></i>
                </button>
            </div>
        `).join('')}
    `;
}

function openDirectChatFromPeople(chatId) {
    selectChatConversation(chatId);
    if (window.innerWidth <= 768) {
        switchMobileView('chat');
    }
    const input = document.getElementById('chat-message-input');
    if (input) input.focus();
}
window.openDirectChatFromPeople = openDirectChatFromPeople;

function openAddFriendModal() {
    const modalEl = document.getElementById('modalAddFriend');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}
window.openAddFriendModal = openAddFriendModal;

function handleAddFriendSubmit() {
    const input = document.getElementById('input-add-friend-query');
    const val = input ? input.value.trim() : '';
    const modalEl = document.getElementById('modalAddFriend');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }
    if (val) {
        showModernToast(`ส่งคำขอเป็นเพื่อนไปยัง "${val}" เรียบร้อยแล้ว (ระบบจะบันทึกอัตโนมัติในเวอร์ชันถัดไป)`);
        if (input) input.value = '';
    } else {
        showModernToast('ระบบเพิ่มเพื่อนร่วมทีมจะเปิดใช้งานเร็วๆ นี้ครับ');
    }
}
window.handleAddFriendSubmit = handleAddFriendSubmit;

// ── 4.6 GROUP CHAT ENGINE (สร้างกลุ่มคุยงาน) ────────────────────────────────
function openNewGroupModal() {
    const input = document.getElementById('input-new-group-name');
    if (input) input.value = '';

    const listEl = document.getElementById('group-members-picker-list');
    if (listEl) {
        listEl.innerHTML = TEAM_FRIENDS.map(friend => {
            const isMe = (friend.username === CHAT_STATE.currentUser.username);
            return `
                <label class="d-flex align-items-center gap-2 p-2 rounded-3 mb-1 bg-white border border-light-subtle user-select-none" style="cursor: pointer;">
                    <input type="checkbox" class="form-check-input group-member-checkbox m-0" value="${friend.username}" data-name="${escapeHtml(friend.name)}" onchange="updateGroupSelectedCount()" ${isMe ? 'checked disabled' : ''}>
                    <div style="width: 34px; height: 34px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">
                        ${getIllustratedAvatar(friend.avatarType, friend.name)}
                    </div>
                    <div class="flex-grow-1 min-w-0">
                        <div class="fw-semibold text-dark small text-truncate">
                            ${escapeHtml(friend.name)} ${isMe ? '<span class="badge bg-secondary-subtle text-secondary" style="font-size: 0.65rem;">คุณ</span>' : ''}
                        </div>
                        <div class="text-muted" style="font-size: 0.72rem;">${escapeHtml(friend.role)}</div>
                    </div>
                </label>
            `;
        }).join('');
    }

    updateGroupSelectedCount();

    const modalEl = document.getElementById('modalCreateGroup');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}
window.openNewGroupModal = openNewGroupModal;

function updateGroupSelectedCount() {
    const checked = document.querySelectorAll('.group-member-checkbox:checked');
    const countEl = document.getElementById('group-selected-count');
    if (countEl) {
        countEl.textContent = `เลือกแล้ว ${checked.length} คน`;
    }
}
window.updateGroupSelectedCount = updateGroupSelectedCount;

function submitCreateNewGroup() {
    const input = document.getElementById('input-new-group-name');
    const groupName = input ? input.value.trim() : '';

    if (!groupName) {
        showModernToast('กรุณาระบุชื่อกลุ่มแชทก่อนสร้างครับ');
        if (input) input.focus();
        return;
    }

    const checkedBoxes = document.querySelectorAll('.group-member-checkbox:checked');
    const members = Array.from(checkedBoxes).map(cb => cb.value);

    // Ensure current user is in members
    if (!members.includes(CHAT_STATE.currentUser.username)) {
        members.push(CHAT_STATE.currentUser.username);
    }

    const groupId = 'grp_' + Date.now();
    const newGroup = {
        id: groupId,
        name: groupName,
        members: members,
        created_by: CHAT_STATE.currentUser.displayName || CHAT_STATE.currentUser.username,
        created_at: new Date().toISOString()
    };

    CHAT_STATE.groups.unshift(newGroup);

    // Initial greeting message in the new group
    const welcomeMsg = {
        id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        chat_id: groupId,
        sender_username: CHAT_STATE.currentUser.username,
        sender_name: CHAT_STATE.currentUser.displayName || CHAT_STATE.currentUser.username,
        avatar: CHAT_STATE.currentUser.avatar || 'user_boy',
        message_text: `สร้างกลุ่ม "${groupName}" เรียบร้อยแล้ว (สมาชิก ${members.length} คน) เริ่มพูดคุยงานได้ทันทีครับ! 🎉`,
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date().toISOString()
    };
    CHAT_STATE.messages.push(welcomeMsg);

    saveWorkspaceData();

    // Close modal
    const modalEl = document.getElementById('modalCreateGroup');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    // Switch rail tab to 'chat' if currently on another tab
    if (CHAT_STATE.currentRailTab !== 'chat') {
        switchRailTab('chat');
    }

    selectChatConversation(groupId);
    showModernToast(`สร้างกลุ่ม "${groupName}" สำเร็จแล้ว!`);
}
window.submitCreateNewGroup = submitCreateNewGroup;

function handleChatsSearch(query) {
    CHAT_STATE.chatsSearchQuery = query;
    if (CHAT_STATE.currentRailTab === 'people') {
        renderPeopleList();
    } else {
        renderChatsList();
    }
}
window.handleChatsSearch = handleChatsSearch;

function selectChatConversation(chatId) {
    CHAT_STATE.activeChatId = chatId;

    const titleEl = document.getElementById('active-chat-name');
    const avatarEl = document.getElementById('active-chat-avatar');
    const statusEl = document.getElementById('active-chat-status');

    // 1. Group Conversations
    const group = (CHAT_STATE.groups || []).find(g => g.id === chatId);
    if (group) {
        if (titleEl) titleEl.textContent = group.name;
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('group', group.name);
        const memberCount = (group.members && group.members.length) || 1;
        if (statusEl) statusEl.innerHTML = `<span class="status-dot-green"></span> กลุ่มแชท • สมาชิก ${memberCount} คน`;
        CHAT_STATE.activeProjectId = 'all';
    } else if (chatId === 'general') {
        if (titleEl) titleEl.textContent = 'Lilly Jr.';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('lilly', 'Lilly Jr.');
        if (statusEl) statusEl.innerHTML = '<span class="status-dot-green"></span> ออนไลน์ • ฝ่ายดีไซน์ (Design Lead)';
        CHAT_STATE.activeProjectId = 'all';
    } else if (chatId === 'dm_rihanna') {
        if (titleEl) titleEl.textContent = 'Rihanna Goldberg';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('rihanna', 'Rihanna Goldberg');
        if (statusEl) statusEl.innerHTML = '<span class="status-dot-green"></span> ออนไลน์ • ฝ่ายจัดซื้อและผลิต';
        CHAT_STATE.activeProjectId = 'all';
    } else if (chatId === 'dm_gregory') {
        if (titleEl) titleEl.textContent = 'Gregory Portman';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('gregory', 'Gregory Portman');
        if (statusEl) statusEl.innerHTML = '<span class="status-dot-green"></span> ออนไลน์ • วิศวกรโครงสร้าง & หุ่นยนต์';
        CHAT_STATE.activeProjectId = 'all';
    } else if (chatId === 'dm_marry') {
        if (titleEl) titleEl.textContent = 'Marry Adams';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('marry', 'Marry Adams');
        if (statusEl) statusEl.innerHTML = '<span class="text-muted">●</span> ออฟไลน์ • ผู้ประสานงานโครงการ';
        CHAT_STATE.activeProjectId = 'all';
    } else if (chatId === 'dm_callie') {
        if (titleEl) titleEl.textContent = 'Callie Goodman (ฉัน)';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('user_boy', 'Callie Goodman');
        if (statusEl) statusEl.innerHTML = '<span class="status-dot-green"></span> บันทึกส่วนตัว (Note to self)';
        CHAT_STATE.activeProjectId = 'all';
    } else {
        const project = CHAT_STATE.projects.find(p => p.id === chatId);
        if (project) {
            CHAT_STATE.activeProjectId = project.id;
            CHAT_STATE.selectedTagProjectId = project.id;
            if (titleEl) titleEl.textContent = project.name;
            if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar(project.code?.includes('PIM') ? 'lilly' : 'gregory', project.name);
            if (statusEl) statusEl.innerHTML = `<span class="status-dot-green"></span> โฟลเดอร์โปรเจกต์: ${escapeHtml(project.code || '')}`;
        }
    }

    renderChatsList();
    renderMessages();
    scrollMessagesToBottom();

    // Mobile: Switch view to chat
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile-view-chat');
    }
}
window.selectChatConversation = selectChatConversation;

// ── 5. CHAT MESSAGING ENGINE (MODERN BUBBLES) ───────────────────────────────
function renderMessages() {
    const container = document.getElementById('messages-stream');
    if (!container) return;

    const activeChatId = CHAT_STATE.activeChatId || 'general';
    const currentMessages = CHAT_STATE.messages.filter(msg => {
        if (msg.chat_id) {
            return msg.chat_id === activeChatId;
        }
        // Legacy fallback
        if (activeChatId === 'general') return !msg.project_id;
        if (msg.project_id && msg.project_id === activeChatId) return true;
        return false;
    });

    if (currentMessages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-chat-dots fs-1 d-block mb-2 text-primary opacity-50"></i>
                <div class="fw-bold">ยังไม่มีข้อความในการสนทนานี้</div>
                <div class="small">พิมพ์ข้อความด้านล่างเพื่อเริ่มการสนทนาได้เลยครับ</div>
            </div>
        `;
        return;
    }

    // Determine which outbound messages are purple vs blue (Instagram / Messenger aesthetic)
    const outboundIndices = [];
    currentMessages.forEach((m, idx) => {
        const isMe = (m.sender_username === CHAT_STATE.currentUser.username || m.sender_name === CHAT_STATE.currentUser.displayName || m.sender_username === 'callie_goodman');
        if (isMe) outboundIndices.push(idx);
    });
    const lastOutboundIdx = outboundIndices.length > 0 ? outboundIndices[outboundIndices.length - 1] : -1;

    let html = '';
    let lastDateDividerKey = null;

    currentMessages.forEach((msg, idx) => {
        const isMe = (msg.sender_username === CHAT_STATE.currentUser.username || msg.sender_name === CHAT_STATE.currentUser.displayName || msg.sender_username === 'callie_goodman');
        const project = CHAT_STATE.projects.find(p => p.id === msg.project_id);

        // Check if we should insert a centered date divider (like "อ. 21:43 น.")
        const msgTime = new Date(msg.created_at || Date.now()).getTime();
        const dividerSlot = Math.floor(msgTime / (20 * 60 * 1000)); // Every 20 mins or new day
        if (dividerSlot !== lastDateDividerKey) {
            lastDateDividerKey = dividerSlot;
            html += `<div class="msg-date-divider">${formatChatDividerDate(msg.created_at)}</div>`;
        }

        // Outbound color theme: Latest is electric blue (#0066ff), previous is vibrant purple (#7818eb)
        let bubbleThemeClass = '';
        if (isMe) {
            bubbleThemeClass = (idx === lastOutboundIdx) ? 'bubble-blue' : 'bubble-purple';
        }

        let attachedHtml = '';
        if (msg.file_data) {
            const f = msg.file_data;
            const isImg = f.type && (f.type.startsWith('image/') || f.type === 'image');
            attachedHtml = `
                <div class="msg-file-card">
                    <div class="msg-file-thumb" onclick="previewFileDirectly('${escapeHtml(f.name)}', '${escapeHtml(f.url)}')">
                        ${isImg ? `<img src="${f.url}" class="w-100 h-100 object-fit-cover rounded" alt="thumb">` : `<i class="bi bi-file-earmark-arrow-down-fill"></i>`}
                    </div>
                    <div class="msg-file-info">
                        <div class="msg-file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
                        <div class="msg-file-meta">${f.size || 'ไฟล์แนบ'} ${project ? `• ${escapeHtml(project.code || project.name)}` : ''}</div>
                    </div>
                    <a href="${f.url}" download="${escapeHtml(f.name)}" class="msg-file-dl-btn" title="ดาวน์โหลด">
                        <i class="bi bi-download"></i>
                    </a>
                </div>
            `;
        }

        const avatarMarkup = isMe 
            ? '' 
            : getIllustratedAvatar(msg.avatar || 'lilly', msg.sender_name);

        // Status / time label below message
        let timeLabelContent = '';
        if (isMe) {
            if (idx === lastOutboundIdx) {
                timeLabelContent = `${formatMessageStatusRelative(msg.created_at)}`;
            } else {
                timeLabelContent = `${formatMessageTime(msg.created_at)}`;
            }
        } else {
            timeLabelContent = formatMessageTime(msg.created_at);
        }

        const projectMarkup = project 
            ? `<div class="msg-project-chip" onclick="selectProjectFilter('${project.id}')" title="คลิกเปิดดูไฟล์โปรเจกต์นี้"><i class="bi bi-folder-fill" style="color: ${project.color || '#f59e0b'};"></i><span>${escapeHtml(project.code || project.name)}</span></div>` 
            : '';
        const textMarkup = msg.message_text 
            ? `<div class="msg-text-content">${formatMessageTextWithLinks(msg.message_text)}</div>` 
            : '';

        html += `
            <div class="msg-row ${isMe ? 'outbound ' + bubbleThemeClass : 'inbound'}">
                ${!isMe ? `<div class="msg-avatar-circle">${avatarMarkup}</div>` : ''}
                <div class="msg-content-wrapper">
                    ${!isMe ? `<div class="msg-sender-name">${escapeHtml(msg.sender_name)}</div>` : ''}
                    <div class="msg-bubble-box">${projectMarkup}${textMarkup}${attachedHtml}</div>
                    <div class="msg-time-label">${timeLabelContent}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function handleMessageInputChange(el) {
    if (!el) return;
    autoGrowTextarea(el);
    const inputBar = document.getElementById('chat-area-input-bar');
    if (!inputBar) return;
    if (el.value.trim().length > 0) {
        inputBar.classList.add('has-text');
    } else {
        inputBar.classList.remove('has-text');
    }
}
window.handleMessageInputChange = handleMessageInputChange;

function sendQuickLike() {
    const u = CHAT_STATE.currentUser;
    const activeChatId = CHAT_STATE.activeChatId || 'general';
    const newMsg = {
        id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        chat_id: activeChatId,
        sender_username: u.username,
        sender_name: u.displayName || u.username,
        avatar: u.avatar || 'user_boy',
        message_text: '👍',
        project_id: CHAT_STATE.selectedTagProjectId || null,
        folder_id: null,
        file_data: null,
        created_at: new Date().toISOString()
    };

    CHAT_STATE.messages.push(newMsg);
    saveWorkspaceData();

    renderChatsList();
    renderMessages();
    scrollMessagesToBottom();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_messages').insert([newMsg]).then(() => {});
    }
}
window.sendQuickLike = sendQuickLike;

function autoGrowTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function triggerFileInput() {
    const input = document.getElementById('chat-file-input');
    if (input) {
        input.removeAttribute('capture');
        input.setAttribute('accept', '*/*');
        input.click();
    }
}

function triggerImageSelect() {
    const input = document.getElementById('chat-file-input');
    if (input) {
        input.removeAttribute('capture');
        input.setAttribute('accept', 'image/*');
        input.click();
    }
}

function triggerPhotoCapture() {
    const input = document.getElementById('chat-file-input');
    if (input) {
        input.setAttribute('accept', 'image/*');
        input.setAttribute('capture', 'environment');
        input.click();
    }
}
window.triggerFileInput = triggerFileInput;
window.triggerImageSelect = triggerImageSelect;
window.triggerPhotoCapture = triggerPhotoCapture;

function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    stageFileAttachment(file);
    e.target.value = '';
}

function stageFileAttachment(file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
        CHAT_STATE.stagedAttachment = {
            file: file,
            name: file.name,
            size: formatBytes(file.size),
            type: file.type || 'file',
            dataUrl: evt.target.result
        };

        const stagingBox = document.getElementById('attachment-staging-box');
        const filenameEl = document.getElementById('staging-filename');
        const sizeEl = document.getElementById('staging-filesize');
        const thumbWrap = document.getElementById('staging-thumb-preview');

        if (filenameEl) filenameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatBytes(file.size);

        if (thumbWrap) {
            if (file.type.startsWith('image/')) {
                thumbWrap.innerHTML = `<img src="${evt.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`;
            } else {
                thumbWrap.innerHTML = `<i class="bi bi-file-earmark-arrow-up fs-3 text-primary"></i>`;
            }
        }

        populateStagingFolderDropdown();
        if (stagingBox) stagingBox.classList.remove('d-none');
        const inputBar = document.getElementById('chat-area-input-bar');
        if (inputBar) inputBar.classList.add('has-text');
    };
    reader.readAsDataURL(file);
}

function populateStagingFolderDropdown() {
    const select = document.getElementById('staging-folder-select');
    if (!select) return;

    let html = `<option value="">📁 คลังไฟล์ทั่วไป (General)</option>`;
    CHAT_STATE.projects.forEach(p => {
        html += `<optgroup label="📂 ${escapeHtml(p.name)}">`;
        html += `<option value="${p.id}:root">📁 [โฟลเดอร์หลักของโปรเจกต์]</option>`;
        const projectFolders = CHAT_STATE.folders.filter(f => f.project_id === p.id);
        projectFolders.forEach(f => {
            html += `<option value="${p.id}:${f.id}">↳ 📁 ${escapeHtml(f.name)}</option>`;
        });
        html += `</optgroup>`;
    });

    select.innerHTML = html;
}

function cancelStagedAttachment() {
    CHAT_STATE.stagedAttachment = null;
    const stagingBox = document.getElementById('attachment-staging-box');
    if (stagingBox) stagingBox.classList.add('d-none');
    const input = document.getElementById('chat-message-input');
    const inputBar = document.getElementById('chat-area-input-bar');
    if (inputBar && (!input || !input.value.trim())) {
        inputBar.classList.remove('has-text');
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-message-input');
    if (!input) return;

    const text = input.value.trim();
    const hasAttachment = !!CHAT_STATE.stagedAttachment;

    if (!text && !hasAttachment) {
        return; // Empty input: do not send anything
    }

    const u = CHAT_STATE.currentUser;
    const msgId = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    let fileData = null;
    let targetProjectId = CHAT_STATE.selectedTagProjectId || null;
    let targetFolderId = null;

    if (hasAttachment) {
        const att = CHAT_STATE.stagedAttachment;
        const select = document.getElementById('staging-folder-select');
        if (select && select.value) {
            const parts = select.value.split(':');
            targetProjectId = parts[0];
            targetFolderId = (parts[1] !== 'root') ? parts[1] : null;
        }

        const fileId = 'file_' + Date.now();
        const newFileRecord = {
            id: fileId,
            project_id: targetProjectId,
            folder_id: targetFolderId,
            name: att.name,
            file_url: att.dataUrl,
            file_type: att.type,
            file_size: att.file.size,
            uploaded_by: u.displayName || u.username,
            created_at: new Date().toISOString()
        };

        CHAT_STATE.files.unshift(newFileRecord);
        if (window.supabaseClient) {
            window.supabaseClient.from('workchat_files').insert([newFileRecord]).then(() => {});
        }

        fileData = {
            name: att.name,
            url: att.dataUrl,
            type: att.type,
            size: att.size
        };

        cancelStagedAttachment();
        renderExplorer();
    }

    const activeChatId = CHAT_STATE.activeChatId || 'general';
    if (!targetProjectId && CHAT_STATE.projects.some(p => p.id === activeChatId)) {
        targetProjectId = activeChatId;
    }

    const newMsg = {
        id: msgId,
        chat_id: activeChatId,
        sender_username: u.username,
        sender_name: u.displayName || u.username,
        avatar: u.avatar || 'user_boy',
        message_text: text,
        project_id: targetProjectId,
        folder_id: targetFolderId,
        file_data: fileData,
        created_at: new Date().toISOString()
    };

    CHAT_STATE.messages.push(newMsg);
    saveWorkspaceData();

    input.value = '';
    input.style.height = 'auto';
    toggleEmojiPicker(false);
    const inputBar = document.getElementById('chat-area-input-bar');
    if (inputBar) inputBar.classList.remove('has-text');

    renderChatsList();
    renderMessages();
    scrollMessagesToBottom();

    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('workchat_messages').insert([newMsg]);
        } catch (_) {}
    }
}

function scrollMessagesToBottom() {
    const container = document.getElementById('messages-stream');
    if (container) {
        const doScroll = () => {
            container.scrollTop = container.scrollHeight + 100;
        };
        requestAnimationFrame(doScroll);
        setTimeout(doScroll, 60);
        setTimeout(doScroll, 200);
    }
}

function playIncomingChime() {
    const audio = document.getElementById('chat-chime-sound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

// ── 6. PROJECT DRIVE & FOLDER EXPLORER ───────────────────────────────────────
function renderProjectDropdownList() {
    const list = document.getElementById('tag-project-dropdown-list');
    if (!list) return;

    let html = `
        <li><h6 class="dropdown-header">เครื่องมือด่วน</h6></li>
        <li>
            <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="javascript:void(0)" onclick="triggerPhotoCapture()">
                <i class="bi bi-camera-fill text-primary fs-5"></i>
                <span class="fw-semibold">ถ่ายภาพ</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="javascript:void(0)" onclick="triggerImageSelect()">
                <i class="bi bi-image-fill text-success fs-5"></i>
                <span class="fw-semibold">รูปภาพจากคลัง</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="javascript:void(0)" onclick="showModernToast('บันทึกเสียงข้อความ...')">
                <i class="bi bi-mic-fill text-danger fs-5"></i>
                <span class="fw-semibold">ข้อความเสียง</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="javascript:void(0)" onclick="triggerFileInput()">
                <i class="bi bi-paperclip text-info fs-5"></i>
                <span class="fw-semibold">แนบไฟล์เอกสาร</span>
            </a>
        </li>
        <li><hr class="dropdown-divider my-1"></li>
        <li><h6 class="dropdown-header">เลือกโปรเจกต์ที่กำลังคุย</h6></li>
        <li><a class="dropdown-item ${!CHAT_STATE.selectedTagProjectId ? 'active' : ''}" href="javascript:void(0)" onclick="selectTagProject('', 'ทั่วไป (General)')">ทั่วไป (General)</a></li>
    `;

    CHAT_STATE.projects.forEach(p => {
        html += `
            <li>
                <a class="dropdown-item ${CHAT_STATE.selectedTagProjectId === p.id ? 'active' : ''}" href="javascript:void(0)" onclick="selectTagProject('${p.id}', '${escapeHtml(p.code || p.name)}')">
                    <span class="d-inline-block rounded-circle me-1" style="width: 8px; height: 8px; background: ${p.color || '#3b82f6'};"></span>
                    ${escapeHtml(p.name)}
                </a>
            </li>
        `;
    });

    list.innerHTML = html;
}

function selectTagProject(projId, label) {
    CHAT_STATE.selectedTagProjectId = projId;
    renderProjectDropdownList();
}

function renderProjectPills() {
    const container = document.getElementById('project-pills-container');
    if (!container) return;

    let html = `
        <button class="project-pill-btn ${CHAT_STATE.activeProjectId === 'all' ? 'active' : ''}" id="pill-proj-all" onclick="selectProjectFilter('all')">
            <i class="bi bi-grid-fill me-1"></i> ทั้งหมด
        </button>
    `;

    CHAT_STATE.projects.forEach(p => {
        html += `
            <button class="project-pill-btn ${CHAT_STATE.activeProjectId === p.id ? 'active' : ''}" onclick="selectProjectFilter('${p.id}')">
                <span class="d-inline-block rounded-circle" style="width: 7px; height: 7px; background: ${p.color || '#3b82f6'};"></span>
                <span>${escapeHtml(p.code || p.name)}</span>
            </button>
        `;
    });

    container.innerHTML = html;
}

function selectProjectFilter(projId) {
    CHAT_STATE.activeProjectId = projId;
    CHAT_STATE.activeFolderId = null;
    renderProjectPills();
    renderExplorer();
    toggleDrivePane(true);
}

function navigateToFolder(folderId) {
    CHAT_STATE.activeFolderId = folderId;
    renderExplorer();
}

function renderExplorer() {
    renderBreadcrumbs();

    const foldersGrid = document.getElementById('folders-grid');
    const filesGrid = document.getElementById('files-grid');
    const foldersCountEl = document.getElementById('folders-count');
    const filesCountEl = document.getElementById('files-count');
    const vaultBtnCount = document.getElementById('vault-btn-count');

    let activeFolders = CHAT_STATE.folders.filter(f => {
        if (CHAT_STATE.activeProjectId !== 'all' && f.project_id !== CHAT_STATE.activeProjectId) {
            return false;
        }
        return f.parent_id === CHAT_STATE.activeFolderId;
    });

    let activeFiles = CHAT_STATE.files.filter(f => {
        if (CHAT_STATE.activeProjectId !== 'all' && f.project_id !== CHAT_STATE.activeProjectId) {
            return false;
        }
        return f.folder_id === CHAT_STATE.activeFolderId;
    });

    if (foldersCountEl) foldersCountEl.textContent = activeFolders.length;
    if (filesCountEl) filesCountEl.textContent = activeFiles.length;
    if (vaultBtnCount) vaultBtnCount.textContent = (CHAT_STATE.folders || []).length;

    if (foldersGrid) {
        if (activeFolders.length === 0) {
            foldersGrid.innerHTML = `<div class="text-muted small py-2 col-span-2">ไม่มีโฟลเดอร์ในระดับนี้</div>`;
        } else {
            foldersGrid.innerHTML = activeFolders.map(f => {
                const subfilesCount = CHAT_STATE.files.filter(file => file.folder_id === f.id).length;
                return `
                    <div class="folder-card" onclick="navigateToFolder('${f.id}')" title="คลิกเพื่อเปิดโฟลเดอร์">
                        <i class="bi bi-folder-fill folder-icon"></i>
                        <div style="flex:1; min-width:0;">
                            <div class="folder-name">${escapeHtml(f.name)}</div>
                            <div class="folder-count">${subfilesCount} ไฟล์</div>
                        </div>
                        <i class="bi bi-chevron-right text-muted small"></i>
                    </div>
                `;
            }).join('');
        }
    }

    if (filesGrid) {
        if (activeFiles.length === 0) {
            filesGrid.innerHTML = `<div class="text-muted small py-2 col-span-2">ไม่มีไฟล์ในโฟลเดอร์นี้ (ลากไฟล์มาวางหรือกดอัปโหลดได้เลย)</div>`;
        } else {
            filesGrid.innerHTML = activeFiles.map(file => {
                const isImg = file.file_type && file.file_type.startsWith('image');
                return `
                    <div class="file-card">
                        <div class="file-preview-wrap" onclick="previewFile('${file.id}')" title="คลิกเพื่อดูตัวอย่าง">
                            ${isImg ? `
                                <img src="${file.file_url}" class="file-thumb-img" alt="${escapeHtml(file.name)}">
                            ` : `
                                <i class="bi ${getFileTypeIcon(file.name)} fs-1 text-primary opacity-75"></i>
                            `}
                        </div>
                        <div class="file-card-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                        <div class="file-card-meta">
                            <span>${formatBytes(file.file_size)}</span>
                            <span>${escapeHtml(file.uploaded_by || '')}</span>
                        </div>
                        <div class="file-actions-row">
                            <button type="button" class="file-action-btn" onclick="shareFileToChat('${file.id}')" title="แชร์เข้าห้องแชท">
                                <i class="bi bi-chat-dots-fill me-1"></i>ส่งแชท
                            </button>
                            <a href="${file.file_url}" download="${escapeHtml(file.name)}" class="file-action-btn" title="ดาวน์โหลด">
                                <i class="bi bi-download"></i>
                            </a>
                            <button type="button" class="file-action-btn text-danger" onclick="deleteFile('${file.id}')" title="ลบไฟล์">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function renderBreadcrumbs() {
    const container = document.getElementById('drive-breadcrumbs');
    if (!container) return;

    let html = `
        <span class="breadcrumb-item ${!CHAT_STATE.activeFolderId ? 'active' : ''}" onclick="navigateToFolder(null)">
            <i class="bi bi-house-door-fill text-primary"></i> หน้าแรก
        </span>
    `;

    if (CHAT_STATE.activeProjectId !== 'all') {
        const p = CHAT_STATE.projects.find(proj => proj.id === CHAT_STATE.activeProjectId);
        if (p) {
            html += `
                <i class="bi bi-chevron-right text-muted small"></i>
                <span class="breadcrumb-item ${!CHAT_STATE.activeFolderId ? 'active' : ''}" onclick="navigateToFolder(null)">
                    📂 ${escapeHtml(p.name)}
                </span>
            `;
        }
    }

    if (CHAT_STATE.activeFolderId) {
        const chain = getFolderBreadcrumbChain(CHAT_STATE.activeFolderId);
        chain.forEach((f, idx) => {
            const isLast = (idx === chain.length - 1);
            html += `
                <i class="bi bi-chevron-right text-muted small"></i>
                <span class="breadcrumb-item ${isLast ? 'active' : ''}" onclick="navigateToFolder('${f.id}')">
                    📁 ${escapeHtml(f.name)}
                </span>
            `;
        });
    }

    container.innerHTML = html;
}

function getFolderBreadcrumbChain(folderId) {
    const chain = [];
    let currentId = folderId;
    while (currentId) {
        const f = CHAT_STATE.folders.find(item => item.id === currentId);
        if (f) {
            chain.unshift(f);
            currentId = f.parent_id;
        } else {
            break;
        }
    }
    return chain;
}

function getFileTypeIcon(filename) {
    if (!filename) return 'bi-file-earmark';
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'pdf': return 'bi-file-earmark-pdf-fill text-danger';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'webp': return 'bi-file-earmark-image-fill text-warning';
        case 'zip':
        case 'rar': return 'bi-file-earmark-zip-fill text-purple';
        case 'doc':
        case 'docx': return 'bi-file-earmark-word-fill text-primary';
        case 'xls':
        case 'xlsx': return 'bi-file-earmark-excel-fill text-success';
        default: return 'bi-file-earmark-text-fill text-primary';
    }
}

// ── 7. CREATE PROJECTS, FOLDERS & DIRECT UPLOADS ─────────────────────────────
let selectedProjectColorHex = '#3b82f6';

function openNewProjectModal() {
    const input = document.getElementById('input-project-name');
    if (input) input.value = '';
    const modalEl = document.getElementById('modalNewProject');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

function selectProjectColor(el, hex) {
    selectedProjectColorHex = hex;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    if (el) el.classList.add('active');
}

async function createNewProject() {
    const nameInput = document.getElementById('input-project-name');
    const codeInput = document.getElementById('input-project-code');
    const descInput = document.getElementById('input-project-desc');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        if (typeof showToast === 'function') showToast('warning', 'กรุณาระบุชื่อโปรเจกต์', 'โปรดใส่ชื่อโปรเจกต์งาน', 2000);
        return;
    }

    const newProj = {
        id: 'proj_' + Date.now(),
        name: name,
        code: codeInput ? codeInput.value.trim() : '',
        color: selectedProjectColorHex,
        description: descInput ? descInput.value.trim() : '',
        created_by: CHAT_STATE.currentUser.displayName || CHAT_STATE.currentUser.username,
        created_at: new Date().toISOString()
    };

    CHAT_STATE.projects.unshift(newProj);
    saveWorkspaceData();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_projects').insert([newProj]).then(() => {});
    }

    CHAT_STATE.activeProjectId = newProj.id;
    CHAT_STATE.activeFolderId = null;

    renderProjectDropdownList();
    renderProjectPills();
    renderExplorer();
    renderChatsList();

    const modalEl = document.getElementById('modalNewProject');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

    if (typeof showToast === 'function') {
        showToast('success', 'สร้างโปรเจกต์แล้ว', `เพิ่ม ${name} เรียบร้อย`, 2500);
    }
}

function openNewFolderModal() {
    const labelEl = document.getElementById('new-folder-parent-label');
    const input = document.getElementById('input-folder-name');
    if (input) input.value = '';

    let parentName = 'หน้าแรก';
    if (CHAT_STATE.activeFolderId) {
        const curFolder = CHAT_STATE.folders.find(f => f.id === CHAT_STATE.activeFolderId);
        if (curFolder) parentName = curFolder.name;
    } else if (CHAT_STATE.activeProjectId !== 'all') {
        const curProj = CHAT_STATE.projects.find(p => p.id === CHAT_STATE.activeProjectId);
        if (curProj) parentName = curProj.name;
    }

    if (labelEl) labelEl.innerHTML = `สร้างอยู่ภายใต้: <strong>${escapeHtml(parentName)}</strong>`;

    const modalEl = document.getElementById('modalNewFolder');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function createNewFolder() {
    const input = document.getElementById('input-folder-name');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    let targetProjectId = CHAT_STATE.activeProjectId !== 'all' ? CHAT_STATE.activeProjectId : null;
    if (!targetProjectId && CHAT_STATE.projects.length > 0) {
        targetProjectId = CHAT_STATE.projects[0].id;
    }

    const newFolder = {
        id: 'fld_' + Date.now(),
        project_id: targetProjectId,
        parent_id: CHAT_STATE.activeFolderId,
        name: name,
        created_by: CHAT_STATE.currentUser.displayName || CHAT_STATE.currentUser.username,
        created_at: new Date().toISOString()
    };

    CHAT_STATE.folders.push(newFolder);
    saveWorkspaceData();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_folders').insert([newFolder]).then(() => {});
    }

    renderExplorer();

    const modalEl = document.getElementById('modalNewFolder');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

    if (typeof showToast === 'function') {
        showToast('success', 'สร้างโฟลเดอร์แล้ว', `เพิ่มโฟลเดอร์ ${name} สำเร็จ`, 2000);
    }
}

function triggerDirectUpload() {
    const input = document.getElementById('direct-upload-input');
    if (input) input.click();
}

function handleDirectUpload(e) {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    files.forEach(file => {
        saveFileDirectly(file, CHAT_STATE.activeProjectId, CHAT_STATE.activeFolderId);
    });

    e.target.value = '';
}

function saveFileDirectly(file, projectId, folderId) {
    const reader = new FileReader();
    reader.onload = function(evt) {
        const fileId = 'file_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        let targetProj = (projectId && projectId !== 'all') ? projectId : (CHAT_STATE.projects[0]?.id || null);

        const newFile = {
            id: fileId,
            project_id: targetProj,
            folder_id: folderId || null,
            name: file.name,
            file_url: evt.target.result,
            file_type: file.type || 'file',
            file_size: file.size,
            uploaded_by: CHAT_STATE.currentUser.displayName || CHAT_STATE.currentUser.username,
            created_at: new Date().toISOString()
        };

        CHAT_STATE.files.unshift(newFile);
        saveWorkspaceData();

        if (window.supabaseClient) {
            window.supabaseClient.from('workchat_files').insert([newFile]).then(() => {});
        }

        renderExplorer();
        if (typeof showToast === 'function') {
            showToast('info', 'อัปโหลดไฟล์แล้ว', `${file.name} บันทึกเข้าคลังเรียบร้อย`, 2000);
        }
    };
    reader.readAsDataURL(file);
}

// Drag & Drop
function handleDragOver(e) {
    e.preventDefault();
    const area = document.getElementById('drive-explorer-area');
    if (area) area.classList.add('drag-over');
}

function handleDragLeave(e) {
    const area = document.getElementById('drive-explorer-area');
    if (area) area.classList.remove('drag-over');
}

function handleDropFile(e) {
    e.preventDefault();
    const area = document.getElementById('drive-explorer-area');
    if (area) area.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    if (!files || files.length === 0) return;

    files.forEach(file => {
        saveFileDirectly(file, CHAT_STATE.activeProjectId, CHAT_STATE.activeFolderId);
    });
}

// ── 8. FILE PREVIEWS & SHARING TO CHAT ───────────────────────────────────────
function previewFile(fileId) {
    const file = CHAT_STATE.files.find(f => f.id === fileId);
    if (!file) return;

    CHAT_STATE.activePreviewFile = file;
    previewFileDirectly(file.name, file.file_url);
}

function previewFileDirectly(filename, url) {
    const nameEl = document.getElementById('preview-modal-filename');
    const bodyEl = document.getElementById('preview-modal-body');
    const dlBtn = document.getElementById('btn-preview-download');

    if (nameEl) nameEl.textContent = filename;
    if (dlBtn) {
        dlBtn.href = url;
        dlBtn.download = filename;
    }

    if (bodyEl) {
        const isImg = url.startsWith('data:image') || /\.(png|jpe?g|webp|gif|svg)$/i.test(filename);
        if (isImg) {
            bodyEl.innerHTML = `<img src="${url}" class="img-fluid" style="max-height: 75vh; object-fit: contain;">`;
        } else {
            bodyEl.innerHTML = `
                <div class="p-5 text-dark">
                    <i class="bi ${getFileTypeIcon(filename)} fs-1 text-primary mb-3 d-block"></i>
                    <h5>${escapeHtml(filename)}</h5>
                    <p class="text-muted small">ไฟล์นี้รองรับการดาวน์โหลดเพื่อเปิดด้วยโปรแกรมในเครื่องของคุณ</p>
                    <a href="${url}" download="${escapeHtml(filename)}" class="btn btn-primary rounded-pill mt-2">
                        <i class="bi bi-download me-1"></i> ดาวน์โหลดทันที
                    </a>
                </div>
            `;
        }
    }

    const modalEl = document.getElementById('modalFilePreview');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function shareCurrentPreviewToChat() {
    const file = CHAT_STATE.activePreviewFile;
    if (!file) return;

    shareFileToChat(file.id);

    const modalEl = document.getElementById('modalFilePreview');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
}

function shareFileToChat(fileId) {
    const file = CHAT_STATE.files.find(f => f.id === fileId);
    if (!file) return;

    const u = CHAT_STATE.currentUser;
    const msgId = 'msg_' + Date.now();

    const newMsg = {
        id: msgId,
        sender_username: u.username,
        sender_name: u.displayName || u.username,
        avatar: u.avatar || 'user_boy',
        message_text: `แชร์ไฟล์งาน: ${file.name}`,
        project_id: file.project_id,
        folder_id: file.folder_id,
        file_data: {
            name: file.name,
            url: file.file_url,
            type: file.file_type,
            size: formatBytes(file.file_size)
        },
        created_at: new Date().toISOString()
    };

    CHAT_STATE.messages.push(newMsg);
    saveWorkspaceData();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_messages').insert([newMsg]).then(() => {});
    }

    renderChatsList();
    renderMessages();
    scrollMessagesToBottom();

    if (typeof showToast === 'function') {
        showToast('success', 'แชร์ไฟล์แล้ว', `ส่ง ${file.name} เข้าห้องแชทแล้ว`, 2000);
    }
}

function deleteFile(fileId) {
    if (!confirm('คุณต้องการลบไฟล์นี้ใช่หรือไม่?')) return;

    CHAT_STATE.files = CHAT_STATE.files.filter(f => f.id !== fileId);
    saveWorkspaceData();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_files').delete().eq('id', fileId).then(() => {});
    }

    renderExplorer();
    if (typeof showToast === 'function') {
        showToast('info', 'ลบไฟล์แล้ว', 'นำไฟล์ออกจากคลังเรียบร้อย', 2000);
    }
}

// ── 9. DRAWER TOGGLE & NAVIGATION ───────────────────────────────────────────
function returnToWorkspace() {
    if (window.parent && window.parent !== window) {
        if (typeof window.parent.closeAppInWorkspace === 'function') {
            window.parent.closeAppInWorkspace();
            return;
        }
        try {
            window.parent.postMessage({ action: 'closeWorkspaceApp' }, '*');
            return;
        } catch (_) {}
    }
    window.location.href = '../../../my_workspace.html';
}
window.returnToWorkspace = returnToWorkspace;

function toggleDrivePane(forceState) {
    const container = document.getElementById('chat-main-container');
    const isOpen = (typeof forceState === 'boolean') 
        ? forceState 
        : !(container?.classList.contains('drive-open') || document.body.classList.contains('drive-open'));

    if (isOpen) {
        if (container) container.classList.add('drive-open');
        document.body.classList.add('drive-open');
        document.querySelectorAll('.rail-nav-item').forEach(b => b.classList.remove('active'));
        document.getElementById('rail-tab-vault')?.classList.add('active');
        renderExplorer();
    } else {
        if (container) container.classList.remove('drive-open');
        document.body.classList.remove('drive-open');
        document.querySelectorAll('.rail-nav-item').forEach(b => b.classList.remove('active'));
        const activeTabId = (CHAT_STATE.currentRailTab === 'people') ? 'rail-tab-people' : 'rail-tab-chat';
        document.getElementById(activeTabId)?.classList.add('active');
    }
}
window.toggleDrivePane = toggleDrivePane;

function switchRailTab(tabName) {
    const titleEl = document.getElementById('middle-col-title');
    const actionsEl = document.getElementById('middle-col-actions');
    const searchInput = document.getElementById('chats-search-input');
    const container = document.getElementById('chat-main-container');

    // Close drive pane if open when switching to chat or people
    if (tabName !== 'vault' && container) {
        container.classList.remove('drive-open');
    }

    // Clear active state across all rail buttons
    document.querySelectorAll('.rail-nav-item').forEach(b => b.classList.remove('active'));

    const chatIcon = document.querySelector('#rail-tab-chat i');
    const peopleIcon = document.querySelector('#rail-tab-people i');

    if (tabName === 'chat') {
        CHAT_STATE.currentRailTab = 'chat';
        document.getElementById('rail-tab-chat')?.classList.add('active');
        if (chatIcon) chatIcon.className = 'bi bi-chat-dots-fill';
        if (peopleIcon) peopleIcon.className = 'bi bi-people';

        if (titleEl) titleEl.textContent = 'Chats';
        if (actionsEl) {
            actionsEl.innerHTML = `
                <button type="button" class="chats-action-circle" onclick="showModernToast('เริ่มวิดีโอคอลคุยงานกลุ่ม...')" title="วิดีโอคอล">
                    <i class="bi bi-camera-video"></i>
                </button>
                <div class="dropdown d-inline-block">
                    <button type="button" class="chats-action-circle" data-bs-toggle="dropdown" title="สร้างห้องแชทใหม่ / สร้างกลุ่มคุยงาน">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 p-2" style="border-radius: 18px; min-width: 240px;">
                        <li>
                            <a class="dropdown-item d-flex align-items-center gap-2 py-2 rounded-3 fw-semibold" href="javascript:void(0)" onclick="openNewGroupModal()">
                                <i class="bi bi-people-fill text-primary fs-5"></i>
                                <div>
                                    <div>สร้างกลุ่มคุยงานใหม่</div>
                                    <div class="small text-muted fw-normal" style="font-size: 0.72rem;">รวมเพื่อนร่วมทีมคุยงานหลายคน</div>
                                </div>
                            </a>
                        </li>
                        <li><hr class="dropdown-divider my-1"></li>
                        <li>
                            <a class="dropdown-item d-flex align-items-center gap-2 py-2 rounded-3 fw-semibold" href="javascript:void(0)" onclick="openNewProjectModal()">
                                <i class="bi bi-folder-plus text-warning fs-5"></i>
                                <div>
                                    <div>สร้างโฟลเดอร์โปรเจกต์</div>
                                    <div class="small text-muted fw-normal" style="font-size: 0.72rem;">เปิดห้องแชทและคลังไฟล์โปรเจกต์</div>
                                </div>
                            </a>
                        </li>
                    </ul>
                </div>
            `;
        }
        if (searchInput) searchInput.placeholder = 'Search messenger...';
        document.getElementById('chats-filter-tabs')?.classList.remove('d-none');
        renderChatsList();

    } else if (tabName === 'people') {
        CHAT_STATE.currentRailTab = 'people';
        document.getElementById('rail-tab-people')?.classList.add('active');
        if (chatIcon) chatIcon.className = 'bi bi-chat-dots';
        if (peopleIcon) peopleIcon.className = 'bi bi-people-fill';

        if (titleEl) titleEl.textContent = 'People';
        if (actionsEl) {
            actionsEl.innerHTML = `
                <button type="button" class="chats-action-circle" onclick="openAddFriendModal()" title="เพิ่มเพื่อนร่วมทีม (เร็วๆ นี้)">
                    <i class="bi bi-person-plus-fill text-primary"></i>
                </button>
            `;
        }
        if (searchInput) searchInput.placeholder = 'Search people... (ค้นหารายชื่อเพื่อน)';
        document.getElementById('chats-filter-tabs')?.classList.add('d-none');
        renderPeopleList();

    } else if (tabName === 'vault') {
        const isAlreadyOpen = container && container.classList.contains('drive-open');
        if (isAlreadyOpen) {
            toggleDrivePane(false);
        } else {
            toggleDrivePane(true);
        }
    }
}
window.switchRailTab = switchRailTab;

function switchMobileView(viewName) {
    if (viewName === 'chat') {
        document.body.classList.add('mobile-view-chat');
        scrollMessagesToBottom();
    } else {
        document.body.classList.remove('mobile-view-chat');
    }
}
window.switchMobileView = switchMobileView;

// Cleanly handle window resizing between mobile and desktop viewports
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.body.classList.remove('mobile-view-chat');
    }
});

// Keyboard shortcut: Esc to close Project Vault drawer
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const container = document.getElementById('chat-main-container');
        if (container && container.classList.contains('drive-open')) {
            toggleDrivePane(false);
        }
    }
});

// ── 10. HELPERS & EMOJI PICKER ─────────────────────────────────────────────
function formatMessageTime(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
        return '';
    }
}

function formatChatDividerDate(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        const dayStr = dayNames[d.getDay()];
        const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        return `${dayStr} ${timeStr} น.`;
    } catch (_) {
        return '';
    }
}

function formatMessageStatusRelative(isoStr) {
    if (!isoStr) return 'ส่งแล้ว';
    try {
        const diffMs = Date.now() - new Date(isoStr).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'ส่งแล้ว';
        if (diffMins < 60) return `ส่งเมื่อ ${diffMins} นาทีที่แล้ว`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `ส่งเมื่อ ${diffHours} ชั่วโมงที่แล้ว`;
        const diffDays = Math.floor(diffHours / 24);
        return `ส่งเมื่อ ${diffDays} วันที่แล้ว`;
    } catch (_) {
        return 'ส่งแล้ว';
    }
}

function formatMessageTextWithLinks(text) {
    if (!text) return '';
    const safeText = escapeHtml(text);
    const urlPattern = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    return safeText.replace(urlPattern, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="msg-inline-link">${url}</a>`;
    });
}

const POPULAR_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '✨', '🎉', '😊', '👏', '💯', '🚀', '💡', '😍', '😎', '🥳', '👋', '💬', '📌', '🎯', '✌️', '🤝', '🤍'];

function initEmojiPicker() {
    const grid = document.getElementById('emoji-grid');
    if (!grid) return;
    grid.innerHTML = POPULAR_EMOJIS.map(emoji => `
        <button type="button" class="emoji-item-btn" onclick="insertEmoji('${emoji}')" title="${emoji}">
            ${emoji}
        </button>
    `).join('');
}

function toggleEmojiPicker(forceStateOrEvent) {
    const popover = document.getElementById('emoji-picker-popover');
    if (!popover) return;
    if (typeof forceStateOrEvent === 'boolean') {
        if (forceStateOrEvent) {
            initEmojiPicker();
            popover.classList.remove('d-none');
        } else {
            popover.classList.add('d-none');
        }
        return;
    }
    if (forceStateOrEvent) {
        if (typeof forceStateOrEvent.stopPropagation === 'function') {
            forceStateOrEvent.stopPropagation();
        }
        if (typeof forceStateOrEvent.preventDefault === 'function') {
            forceStateOrEvent.preventDefault();
        }
    }
    const isHidden = popover.classList.contains('d-none');
    if (isHidden) {
        initEmojiPicker();
        popover.classList.remove('d-none');
    } else {
        popover.classList.add('d-none');
    }
}
window.toggleEmojiPicker = toggleEmojiPicker;

function insertEmoji(emoji) {
    const input = document.getElementById('chat-message-input');
    if (!input) return;
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const val = input.value;
    input.value = val.substring(0, start) + emoji + val.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
    handleMessageInputChange(input);
    toggleEmojiPicker(false);
}
window.insertEmoji = insertEmoji;

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    const popover = document.getElementById('emoji-picker-popover');
    if (!popover || popover.classList.contains('d-none')) return;

    const isInsidePopover = popover.contains(e.target);
    const isTriggerBtn = e.target.closest && e.target.closest('#btn-capsule-emoji, [onclick*="toggleEmojiPicker"]');

    if (!isInsidePopover && !isTriggerBtn) {
        popover.classList.add('d-none');
    }
});

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

// ── 11. PWA INSTALLATION ENGINE ───────────────────────────────────────────
let deferredPwaPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
});

window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
    if (typeof showToast === 'function') {
        showToast('success', 'ติดตั้งสำเร็จ!', 'WorkChat ถูกติดตั้งลงหน้าจอมือถือของคุณแล้ว', 3000);
    }
});

function triggerWorkChatPwaInstall() {
    if (deferredPwaPrompt) {
        executeNativeInstallPrompt();
        return;
    }

    const currentUrl = window.location.href.split('#')[0];
    const qrImg = document.getElementById('pwa-install-qrcode');
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`;
    }

    const modalEl = document.getElementById('modalPwaInstallGuide');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

async function executeNativeInstallPrompt() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
            deferredPwaPrompt = null;
            const modalEl = document.getElementById('modalPwaInstallGuide');
            if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        }
    } else {
        if (typeof showToast === 'function') {
            showToast('info', 'วิธีติดตั้ง', 'สำหรับ Android: จุดสามจุด > ติดตั้งแอป / สำหรับ iOS: แชร์ > เพิ่มลงหน้าจอโฮม', 3500);
        }
    }
}

function copyAppUrl() {
    const url = window.location.href.split('#')[0];
    navigator.clipboard.writeText(url).then(() => {
        if (typeof showToast === 'function') {
            showToast('success', 'คัดลอกลิงก์แล้ว', 'นำไปส่งทาง LINE หรือเปิดบนมือถือเพื่อติดตั้งได้เลย', 2500);
        }
    }).catch(() => {
        prompt('คัดลอกลิงก์นี้ไปเปิดในมือถือ:', url);
    });
}
