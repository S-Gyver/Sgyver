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
    stagedAttachment: null,

    projects: [],
    folders: [],
    files: [],
    messages: [],

    activePreviewFile: null,
    mobileView: 'chat',
    realtimeChannel: null
};

// ── 🎨 ILLUSTRATED AVATARS (Matching Modern Cartoon Reference Screenshot) ──
function getIllustratedAvatar(avatarTypeOrName, fallbackName) {
    const key = String(avatarTypeOrName || fallbackName || '').toLowerCase();
    
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

const DEFAULT_MESSAGES = [
    {
        id: 'msg_1',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'Hi, Mrs. Lilly',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 72000000).toISOString()
    },
    {
        id: 'msg_2',
        sender_username: 'lilly_jr',
        sender_name: 'Lilly Jr.',
        avatar: 'lilly',
        message_text: 'Hey',
        project_id: null,
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 54000000).toISOString()
    },
    {
        id: 'msg_3',
        sender_username: 'callie_goodman',
        sender_name: 'Callie Goodman',
        avatar: 'user_boy',
        message_text: 'Hello. Mrs. Lilly, i have a good idea how to create a music with help of our team. Can we meet up tomorrow near the bar to talk?',
        project_id: 'proj_pim_2026',
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 36000000).toISOString()
    },
    {
        id: 'msg_4',
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
        id: 'msg_5',
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
    }
];

// ── 2. INITIALIZATION ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    syncUserProfileFromGyver();
    loadWorkspaceData();
    initSupabaseSync();
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

        const savedMessages = localStorage.getItem('sgyver_workchat_messages');
        CHAT_STATE.messages = savedMessages ? JSON.parse(savedMessages) : DEFAULT_MESSAGES;
    } catch (_) {
        CHAT_STATE.projects = DEFAULT_PROJECTS;
        CHAT_STATE.folders = DEFAULT_FOLDERS;
        CHAT_STATE.files = DEFAULT_FILES;
        CHAT_STATE.messages = DEFAULT_MESSAGES;
    }
}

function saveWorkspaceData() {
    try {
        localStorage.setItem('sgyver_workchat_projects', JSON.stringify(CHAT_STATE.projects));
        localStorage.setItem('sgyver_workchat_folders', JSON.stringify(CHAT_STATE.folders));
        localStorage.setItem('sgyver_workchat_files', JSON.stringify(CHAT_STATE.files));
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
function renderChatsList() {
    const container = document.getElementById('chats-list-stream');
    if (!container) return;

    const query = (CHAT_STATE.chatsSearchQuery || '').toLowerCase();

    // Built-in conversations
    const channels = [
        {
            id: 'general',
            name: 'Lilly Jr.',
            subtitleDefault: 'Good idea! I like this.',
            avatarType: 'lilly',
            status: 'ออนไลน์ • ทีมงาน 3 คน'
        },
        {
            id: 'dm_rihanna',
            name: 'Rihanna Goldberg',
            subtitleDefault: 'Great, Thanks!',
            avatarType: 'rihanna',
            status: 'ออนไลน์'
        },
        {
            id: 'dm_gregory',
            name: 'Gregory Portman',
            subtitleDefault: 'This is so good man. Will do Remix.',
            avatarType: 'gregory',
            status: 'ออนไลน์'
        },
        {
            id: 'dm_marry',
            name: 'Marry Adams',
            subtitleDefault: 'Cool. We can help Lilly.',
            avatarType: 'marry',
            status: 'ออฟไลน์'
        },
        {
            id: 'dm_callie',
            name: 'Callie Goodman',
            subtitleDefault: 'You: Call me today. We have a new project.',
            avatarType: 'user_boy',
            status: 'ออนไลน์'
        },
        // Dynamic Projects
        ...CHAT_STATE.projects.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            subtitleDefault: p.description || 'โฟลเดอร์ไฟล์โปรเจกต์',
            avatarType: (p.code && p.code.includes('PIM')) ? 'lilly' : 'gregory',
            status: `โปรเจกต์ ${p.code || ''}`,
            projectId: p.id
        }))
    ];

    const filtered = channels.filter(c => !query || c.name.toLowerCase().includes(query) || (c.code && c.code.toLowerCase().includes(query)));

    container.innerHTML = filtered.map(item => {
        const isActive = (CHAT_STATE.activeChatId === item.id) || (!CHAT_STATE.activeChatId && item.id === 'general');
        
        // Find latest message snippet
        let snippet = item.subtitleDefault;
        let lastTime = '';
        if (item.id === 'general') {
            const m = CHAT_STATE.messages[CHAT_STATE.messages.length - 1];
            if (m) {
                snippet = m.message_text;
                lastTime = formatMessageTime(m.created_at);
            }
        }

        return `
            <div class="chat-conversation-item ${isActive ? 'active' : ''}" onclick="selectChatConversation('${item.id}')">
                <div class="item-avatar-circle">
                    ${getIllustratedAvatar(item.avatarType, item.name)}
                </div>
                <div class="item-info">
                    <div class="item-title-row">
                        <span class="item-name">${escapeHtml(item.name)}</span>
                        ${lastTime ? `<span class="item-time">${lastTime}</span>` : ''}
                    </div>
                    <div class="item-snippet">${escapeHtml(snippet)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function handleChatsSearch(query) {
    CHAT_STATE.chatsSearchQuery = query;
    renderChatsList();
}
window.handleChatsSearch = handleChatsSearch;

function selectChatConversation(chatId) {
    CHAT_STATE.activeChatId = chatId;

    const titleEl = document.getElementById('active-chat-name');
    const avatarEl = document.getElementById('active-chat-avatar');
    const statusEl = document.getElementById('active-chat-status');

    if (chatId === 'general') {
        if (titleEl) titleEl.textContent = 'Lilly Jr.';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('lilly', 'Lilly Jr.');
        if (statusEl) statusEl.innerHTML = '<span class="status-dot-green"></span> ออนไลน์ • ทีมงาน 3 คน';
        CHAT_STATE.activeProjectId = 'all';
    } else if (chatId === 'dm_rihanna') {
        if (titleEl) titleEl.textContent = 'Rihanna Goldberg';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('rihanna', 'Rihanna Goldberg');
        if (statusEl) statusEl.innerHTML = '<span class="status-dot-green"></span> ออนไลน์';
    } else if (chatId === 'dm_gregory') {
        if (titleEl) titleEl.textContent = 'Gregory Portman';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('gregory', 'Gregory Portman');
        if (statusEl) statusEl.innerHTML = '<span class="status-dot-green"></span> ออนไลน์';
    } else if (chatId === 'dm_marry') {
        if (titleEl) titleEl.textContent = 'Marry Adams';
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('marry', 'Marry Adams');
        if (statusEl) statusEl.innerHTML = '<span class="text-muted">●</span> ออฟไลน์';
    } else {
        const project = CHAT_STATE.projects.find(p => p.id === chatId);
        if (project) {
            CHAT_STATE.activeProjectId = project.id;
            CHAT_STATE.selectedTagProjectId = project.id;
            if (titleEl) titleEl.textContent = project.name;
            if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar(project.code?.includes('PIM') ? 'lilly' : 'gregory', project.name);
            if (statusEl) statusEl.innerHTML = `<span class="status-dot-green"></span> โปรเจกต์: ${escapeHtml(project.code || '')}`;
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

    if (CHAT_STATE.messages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-chat-dots fs-1 d-block mb-2 text-primary opacity-50"></i>
                <div class="fw-bold">ยังไม่มีข้อความ</div>
                <div class="small">พิมพ์ข้อความแรกเพื่อเริ่มคุยงานกับทีมของคุณได้เลยครับ</div>
            </div>
        `;
        return;
    }

    container.innerHTML = CHAT_STATE.messages.map(msg => {
        const isMe = (msg.sender_username === CHAT_STATE.currentUser.username || msg.sender_name === CHAT_STATE.currentUser.displayName || msg.sender_username === 'callie_goodman');
        const timeStr = formatMessageTime(msg.created_at);
        const project = CHAT_STATE.projects.find(p => p.id === msg.project_id);

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
            ? getIllustratedAvatar('user_boy', 'Callie Goodman') 
            : getIllustratedAvatar(msg.avatar || 'lilly', msg.sender_name);

        return `
            <div class="msg-row ${isMe ? 'outbound' : 'inbound'}">
                <div class="msg-avatar-circle">
                    ${avatarMarkup}
                </div>
                <div class="msg-content-wrapper">
                    ${!isMe ? `<div class="msg-sender-name">${escapeHtml(msg.sender_name)}</div>` : ''}
                    <div class="msg-bubble-box">
                        ${project ? `
                            <div class="msg-project-chip" onclick="selectProjectFilter('${project.id}')" title="คลิกเปิดดูไฟล์โปรเจกต์นี้">
                                <i class="bi bi-folder-fill" style="color: ${project.color || '#f59e0b'};"></i>
                                <span>${escapeHtml(project.code || project.name)}</span>
                            </div>
                        ` : ''}
                        <div>${escapeHtml(msg.message_text)}</div>
                        ${attachedHtml}
                    </div>
                    <div class="msg-time-label">
                        ${timeStr} ${isMe ? '<i class="bi bi-check2-all text-primary ms-1"></i>' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function autoGrowTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function triggerFileInput() {
    const input = document.getElementById('chat-file-input');
    if (input) input.click();
}

function triggerPhotoCapture() {
    const input = document.getElementById('chat-file-input');
    if (input) {
        input.setAttribute('accept', 'image/*');
        input.click();
    }
}

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
}

async function sendMessage() {
    const input = document.getElementById('chat-message-input');
    if (!input) return;

    const text = input.value.trim();
    const hasAttachment = !!CHAT_STATE.stagedAttachment;

    if (!text && !hasAttachment) return;

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

    const newMsg = {
        id: msgId,
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
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
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
    if (!container) return;

    const isOpen = (typeof forceState === 'boolean') ? forceState : !container.classList.contains('drive-open');

    if (isOpen) {
        container.classList.add('drive-open');
        document.querySelectorAll('.rail-nav-item').forEach(b => b.classList.remove('active'));
        document.getElementById('rail-tab-vault')?.classList.add('active');
        renderExplorer();
    } else {
        container.classList.remove('drive-open');
        document.querySelectorAll('.rail-nav-item').forEach(b => b.classList.remove('active'));
        document.getElementById('rail-tab-chat')?.classList.add('active');
    }
}
window.toggleDrivePane = toggleDrivePane;

function switchRailTab(tabName) {
    if (tabName === 'chat') {
        toggleDrivePane(false);
    } else if (tabName === 'vault') {
        const container = document.getElementById('chat-main-container');
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
    } else {
        document.body.classList.remove('mobile-view-chat');
    }
}
window.switchMobileView = switchMobileView;

// Keyboard shortcut: Esc to close Project Vault drawer
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const container = document.getElementById('chat-main-container');
        if (container && container.classList.contains('drive-open')) {
            toggleDrivePane(false);
        }
    }
});

// ── 10. HELPERS ─────────────────────────────────────────────────────────────
function formatMessageTime(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
        return '';
    }
}

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
