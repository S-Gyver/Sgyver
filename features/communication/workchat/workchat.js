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
    if (typeof avatarTypeOrName === 'string' && (avatarTypeOrName.startsWith('http://') || avatarTypeOrName.startsWith('https://') || avatarTypeOrName.startsWith('data:image/'))) {
        return `<img src="${avatarTypeOrName}" alt="Avatar" class="w-100 h-100 object-fit-cover" style="object-fit: cover; border-radius: inherit;">`;
    }
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

// Starter Data & Purge Registry
const MOCK_ITEM_IDS = new Set([
    'general',
    'dm_lilly',
    'dm_rihanna',
    'dm_gregory',
    'dm_marry',
    'dm_callie',
    'grp_gyver_team',
    'proj_pim_2026',
    'proj_robot_arm',
    'fld_pim_drawings',
    'fld_pim_photos',
    'fld_pim_docs',
    'fld_robot_schematics',
    'file_spec_pim',
    'file_photo_stand'
]);

const MOCK_FRIEND_USERNAMES = new Set([
    'lilly_jr',
    'rihanna_goldberg',
    'gregory_portman',
    'marry_adams',
    'callie_goodman'
]);

const MOCK_FRIEND_NAMES = new Set([
    'lilly jr.',
    'lilly jr',
    'rihanna goldberg',
    'gregory portman',
    'marry adams',
    'callie goodman'
]);

function isMockFriend(f) {
    if (!f) return true;
    if (f.id && MOCK_ITEM_IDS.has(f.id)) return true;
    if (f.username && MOCK_FRIEND_USERNAMES.has(String(f.username).trim().toLowerCase())) return true;
    if (f.name && MOCK_FRIEND_NAMES.has(String(f.name).trim().toLowerCase())) return true;
    return false;
}

function getDeletedFriendIds() {
    try {
        const raw = localStorage.getItem('sgyver_workchat_deleted_friends');
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr.map(x => String(x).toLowerCase()) : []);
    } catch (_) {
        return new Set();
    }
}

function isDeletedFriendObj(f) {
    if (!f) return false;
    const set = getDeletedFriendIds();
    if (f.id && set.has(String(f.id).toLowerCase())) return true;
    if (f.userId && set.has(String(f.userId).toLowerCase())) return true;
    if (f.username && set.has(String(f.username).toLowerCase())) return true;
    if (f.name && set.has(String(f.name).trim().toLowerCase())) return true;
    return false;
}

function markFriendDeleted(friendOrId) {
    if (!friendOrId) return;
    try {
        const set = getDeletedFriendIds();
        if (typeof friendOrId === 'string') {
            set.add(friendOrId.toLowerCase());
        } else if (typeof friendOrId === 'object') {
            if (friendOrId.id) set.add(String(friendOrId.id).toLowerCase());
            if (friendOrId.userId) set.add(String(friendOrId.userId).toLowerCase());
            if (friendOrId.username) set.add(String(friendOrId.username).toLowerCase());
            if (friendOrId.name) set.add(String(friendOrId.name).trim().toLowerCase());
        }
        localStorage.setItem('sgyver_workchat_deleted_friends', JSON.stringify([...set]));
    } catch (_) {}
}

function markFriendIdDeleted(friendId) {
    markFriendDeleted(friendId);
}

function unmarkFriendDeleted(friendOrId) {
    if (!friendOrId) return;
    try {
        const set = getDeletedFriendIds();
        if (typeof friendOrId === 'string') {
            set.delete(friendOrId.toLowerCase());
        } else if (typeof friendOrId === 'object') {
            if (friendOrId.id) set.delete(String(friendOrId.id).toLowerCase());
            if (friendOrId.userId) set.delete(String(friendOrId.userId).toLowerCase());
            if (friendOrId.username) set.delete(String(friendOrId.username).toLowerCase());
            if (friendOrId.name) set.delete(String(friendOrId.name).trim().toLowerCase());
        }
        localStorage.setItem('sgyver_workchat_deleted_friends', JSON.stringify([...set]));
    } catch (_) {}
}

function unmarkFriendIdDeleted(friendId) {
    unmarkFriendDeleted(friendId);
}

const DEFAULT_PROJECTS = [];
const DEFAULT_FOLDERS = [];
const DEFAULT_FILES = [];
const DEFAULT_GROUPS = [];

const DEFAULT_MESSAGES = [];

// ── 2. INITIALIZATION ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    syncUserProfileFromGyver();
    loadWorkspaceData();
    TEAM_FRIENDS = loadFriendsData();
    saveFriendsData();
    FRIEND_REQUESTS = loadFriendRequestsData();
    updateFriendNotifBadge();
    renderFriendRequestsPopover();
    initSupabaseSync();
    initEmojiPicker();
    renderProjectDropdownList();
    renderHeaderProjectSelector();
    updateHeaderVaultUI();
    renderProjectPills();
    renderExplorer();

    // Auto-select first real friend (e.g. aya) if current chat is invalid or mock
    if (!CHAT_STATE.activeChatId || MOCK_ITEM_IDS.has(CHAT_STATE.activeChatId) || CHAT_STATE.activeChatId === 'general') {
        if (TEAM_FRIENDS.length > 0) {
            CHAT_STATE.activeChatId = TEAM_FRIENDS[0].id;
            selectChatConversation(TEAM_FRIENDS[0].id);
        } else if (CHAT_STATE.groups.length > 0) {
            CHAT_STATE.activeChatId = CHAT_STATE.groups[0].id;
            selectChatConversation(CHAT_STATE.groups[0].id);
        } else {
            CHAT_STATE.activeChatId = null;
            renderEmptyChatHeader();
        }
    } else {
        selectChatConversation(CHAT_STATE.activeChatId);
    }

    renderChatsList();
    renderMessages();
    scrollMessagesToBottom();
});

function renderEmptyChatHeader() {
    const titleEl = document.getElementById('active-chat-name');
    const avatarEl = document.getElementById('active-chat-avatar');
    const statusEl = document.getElementById('active-chat-status');
    if (titleEl) titleEl.textContent = 'เลือกการสนทนา';
    if (avatarEl) avatarEl.innerHTML = `<div class="d-flex align-items-center justify-content-center w-100 h-100 bg-light text-muted rounded-circle"><i class="bi bi-chat-dots fs-5"></i></div>`;
    if (statusEl) statusEl.innerHTML = `<span class="text-muted">เลือกเพื่อนเพื่อเริ่มคุยงาน</span>`;
}


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
                CHAT_STATE.currentUser.id = u.id;
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
    updateFriendNotifBadge();
    renderFriendRequestsPopover();
    enforcePermissionGuard(userLevel, userRole);

    // Refresh friends list for this specific user
    TEAM_FRIENDS = loadFriendsData();
    if (CHAT_STATE.activeChatId && !TEAM_FRIENDS.some(f => f.id === CHAT_STATE.activeChatId) && !CHAT_STATE.groups.some(g => g.id === CHAT_STATE.activeChatId)) {
        CHAT_STATE.activeChatId = null;
        renderEmptyChatHeader();
    }
    renderChatsList();
    renderMessages();
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
    const mobileAvatar = document.getElementById('chats-mobile-profile-avatar');
    if (mobileAvatar) {
        mobileAvatar.innerHTML = renderAvatarDisplay(u.avatar || 'user_boy');
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
        CHAT_STATE.projects = savedProjects ? JSON.parse(savedProjects).filter(p => p && !MOCK_ITEM_IDS.has(p.id)) : [];

        const savedFolders = localStorage.getItem('sgyver_workchat_folders');
        CHAT_STATE.folders = savedFolders ? JSON.parse(savedFolders).filter(f => f && !MOCK_ITEM_IDS.has(f.project_id) && !MOCK_ITEM_IDS.has(f.id)) : [];

        const savedFiles = localStorage.getItem('sgyver_workchat_files');
        CHAT_STATE.files = savedFiles ? JSON.parse(savedFiles).filter(f => f && !MOCK_ITEM_IDS.has(f.project_id) && !MOCK_ITEM_IDS.has(f.id)) : [];

        const savedGroups = localStorage.getItem('sgyver_workchat_groups');
        CHAT_STATE.groups = savedGroups ? JSON.parse(savedGroups).filter(g => g && !MOCK_ITEM_IDS.has(g.id)) : [];

        const savedMessages = localStorage.getItem('sgyver_workchat_messages');
        if (savedMessages) {
            const parsed = JSON.parse(savedMessages);
            CHAT_STATE.messages = parsed.filter(m => {
                if (!m) return false;
                if (MOCK_ITEM_IDS.has(m.chat_id) || MOCK_ITEM_IDS.has(m.project_id)) return false;
                if (['lilly_jr', 'rihanna_goldberg', 'gregory_portman', 'marry_adams'].includes(m.sender_username)) return false;
                return true;
            });
        } else {
            CHAT_STATE.messages = [];
        }

        saveWorkspaceData();

        // Restore preset project selection if previously saved
        try {
            const savedPreset = localStorage.getItem('sgyver_workchat_preset_project_' + (CHAT_STATE.activeChatId || '')) ||
                                localStorage.getItem('sgyver_workchat_active_preset_project');
            if (savedPreset && CHAT_STATE.projects.some(p => p.id === savedPreset)) {
                CHAT_STATE.selectedTagProjectId = savedPreset;
            } else {
                CHAT_STATE.selectedTagProjectId = '';
            }
        } catch (_) {}
    } catch (_) {
        CHAT_STATE.projects = [];
        CHAT_STATE.folders = [];
        CHAT_STATE.files = [];
        CHAT_STATE.groups = [];
        CHAT_STATE.messages = [];
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

// ── 3.1 CLOUD STORE & REALTIME SYNC ENGINE (PC <-> MOBILE) ───────────────────
let _syncCloudTimer = null;
function syncWorkchatToCloud() {
    if (!window.supabaseClient) return;
    clearTimeout(_syncCloudTimer);
    _syncCloudTimer = setTimeout(async () => {
        try {
            const payload = {
                quiz_settings: {
                    messages: (CHAT_STATE.messages || []).slice(-200),
                    files: (CHAT_STATE.files || []).slice(-100),
                    folders: CHAT_STATE.folders || [],
                    projects: CHAT_STATE.projects || [],
                    friends: (typeof TEAM_FRIENDS !== 'undefined' ? TEAM_FRIENDS : []),
                    friend_requests: (typeof FRIEND_REQUESTS !== 'undefined' ? FRIEND_REQUESTS : []),
                    updated_at: new Date().toISOString()
                }
            };
            // 1. Try update by room_code = 'WORKCHAT'
            const { error: updErr, data: updData } = await window.supabaseClient
                .from('lobbies')
                .update(payload)
                .eq('room_code', 'WORKCHAT')
                .select();

            if (updErr || !updData || updData.length === 0) {
                // If row didn't exist yet, insert it
                await window.supabaseClient
                    .from('lobbies')
                    .insert([{ room_code: 'WORKCHAT', status: 'LIVE', ...payload }]);
            }
        } catch (err) {
            console.warn('Sync cloud store notice:', err);
        }
    }, 300);
}
window.syncWorkchatToCloud = syncWorkchatToCloud;

async function fetchCloudStore() {
    if (!window.supabaseClient) return;
    try {
        const { data: cloudStore } = await window.supabaseClient
            .from('lobbies')
            .select('quiz_settings')
            .eq('room_code', 'WORKCHAT')
            .maybeSingle();

        if (cloudStore && cloudStore.quiz_settings) {
            mergeCloudStore(cloudStore.quiz_settings);
        }
    } catch (_) {}
}
window.fetchCloudStore = fetchCloudStore;

// Auto-sync when user switches back to tab or unlocks mobile phone screen
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        fetchCloudStore();
    }
});
window.addEventListener('focus', () => {
    fetchCloudStore();
});

// Periodic lightweight sync heartbeat every 5 seconds (ensures mobile syncs even if carrier drops WebSocket)
if (!window._workchatSyncInterval) {
    window._workchatSyncInterval = setInterval(() => {
        fetchCloudStore();
    }, 5000);
}

function mergeCloudStore(cloudSettings) {
    if (!cloudSettings) return;

    let changed = false;

    if (Array.isArray(cloudSettings.messages) && cloudSettings.messages.length > 0) {
        const existingIds = new Set((CHAT_STATE.messages || []).map(m => m.id));
        let newCount = 0;
        cloudSettings.messages.forEach(m => {
            if (!m || !m.id || existingIds.has(m.id)) return;
            if (MOCK_ITEM_IDS.has(m.chat_id) || MOCK_ITEM_IDS.has(m.project_id)) return;
            if (m.sender_username && MOCK_FRIEND_USERNAMES.has(String(m.sender_username).toLowerCase())) return;
            CHAT_STATE.messages.push(m);
            existingIds.add(m.id);
            newCount++;
        });
        if (newCount > 0) {
            CHAT_STATE.messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            changed = true;
            playIncomingChime();
        }
    }

    if (Array.isArray(cloudSettings.folders) && cloudSettings.folders.length > 0) {
        const existingFldIds = new Set((CHAT_STATE.folders || []).map(f => f.id));
        cloudSettings.folders.forEach(f => {
            if (f && f.id && !existingFldIds.has(f.id)) {
                CHAT_STATE.folders.push(f);
                existingFldIds.add(f.id);
                changed = true;
            }
        });
    }

    if (Array.isArray(cloudSettings.files) && cloudSettings.files.length > 0) {
        const existingFileIds = new Set((CHAT_STATE.files || []).map(f => f.id));
        cloudSettings.files.forEach(f => {
            if (f && f.id && !existingFileIds.has(f.id)) {
                CHAT_STATE.files.push(f);
                existingFileIds.add(f.id);
                changed = true;
            }
        });
    }

    if (Array.isArray(cloudSettings.friends) && typeof TEAM_FRIENDS !== 'undefined') {
        const hadCloudMocks = cloudSettings.friends.some(fr => isMockFriend(fr) || isDeletedFriendObj(fr));

        // Purge any mock, deleted, or unassociated friends currently in TEAM_FRIENDS
        const beforeLen = TEAM_FRIENDS.length;
        TEAM_FRIENDS = TEAM_FRIENDS.filter(fr => !isMockFriend(fr) && !isDeletedFriendObj(fr) && isFriendBelongingToCurrentUser(fr));
        let friendsChanged = (TEAM_FRIENDS.length !== beforeLen);

        const existingFriendIds = new Set(TEAM_FRIENDS.map(fr => fr.id));
        cloudSettings.friends.forEach(fr => {
            if (fr && fr.id && !isMockFriend(fr) && !isDeletedFriendObj(fr) && isFriendBelongingToCurrentUser(fr) && !existingFriendIds.has(fr.id)) {
                TEAM_FRIENDS.push(fr);
                existingFriendIds.add(fr.id);
                friendsChanged = true;
            }
        });

        if (friendsChanged || hadCloudMocks) {
            saveFriendsData();
            if (hadCloudMocks) {
                syncWorkchatToCloud();
            }
            if (CHAT_STATE.currentRailTab === 'people') {
                renderPeopleList();
            } else {
                renderChatsList();
            }
        }
    }

    if (Array.isArray(cloudSettings.friend_requests) && typeof FRIEND_REQUESTS !== 'undefined') {
        mergeFriendRequestsFromCloud(cloudSettings.friend_requests);
    }

    if (changed) {
        saveWorkspaceData();
        renderExplorer();
        updateHeaderVaultUI();
        renderChatsList();
        renderMessages();
        scrollMessagesToBottom();
    }
}

async function initSupabaseSync() {
    if (!window.supabaseClient) return;

    try {
        // 1. Fetch Cloud Store from Supabase (Persistent across PC & Mobile)
        try {
            const { data: cloudStore } = await window.supabaseClient
                .from('lobbies')
                .select('quiz_settings')
                .eq('room_code', 'WORKCHAT')
                .maybeSingle();

            if (cloudStore && cloudStore.quiz_settings) {
                mergeCloudStore(cloudStore.quiz_settings);
            } else {
                syncWorkchatToCloud();
            }
        } catch (_) {}

        // 2. Fetch from dedicated tables if available
        try {
            const { data: dbProjects } = await window.supabaseClient.from('workchat_projects').select('*').order('created_at', { ascending: false });
            if (dbProjects && dbProjects.length > 0) CHAT_STATE.projects = dbProjects;

            const { data: dbFolders } = await window.supabaseClient.from('workchat_folders').select('*').order('created_at', { ascending: true });
            if (dbFolders && dbFolders.length > 0) CHAT_STATE.folders = dbFolders;

            const { data: dbFiles } = await window.supabaseClient.from('workchat_files').select('*').order('created_at', { ascending: false });
            if (dbFiles && dbFiles.length > 0) CHAT_STATE.files = dbFiles;

            const { data: dbMessages } = await window.supabaseClient.from('workchat_messages').select('*').order('created_at', { ascending: true }).limit(100);
            if (dbMessages && dbMessages.length > 0) {
                const existingIds = new Set(CHAT_STATE.messages.map(m => m.id));
                dbMessages.forEach(m => {
                    if (!existingIds.has(m.id)) {
                        CHAT_STATE.messages.push(m);
                        existingIds.add(m.id);
                    }
                });
                CHAT_STATE.messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            }
        } catch (_) {}

        saveWorkspaceData();
        renderProjectDropdownList();
        renderHeaderProjectSelector();
        updateHeaderVaultUI();
        renderProjectPills();
        renderExplorer();
        renderChatsList();
        renderMessages();
        scrollMessagesToBottom();

        // 3. Connect Realtime Channel (WebSocket across PC & Mobile)
        if (CHAT_STATE.realtimeChannel) {
            try { window.supabaseClient.removeChannel(CHAT_STATE.realtimeChannel); } catch (_) {}
        }

        CHAT_STATE.realtimeChannel = window.supabaseClient.channel('gyver_workchat_realtime', {
            config: { broadcast: { self: false } }
        });

        CHAT_STATE.realtimeChannel
            // A. Realtime Broadcast event (Instant delivery <100ms)
            .on('broadcast', { event: 'new_message' }, ({ payload }) => {
                if (payload && !CHAT_STATE.messages.some(m => m.id === payload.id)) {
                    CHAT_STATE.messages.push(payload);
                    saveWorkspaceData();
                    renderChatsList();
                    renderMessages();
                    scrollMessagesToBottom();
                    playIncomingChime(payload.sender_name, payload.message_text, payload.chat_id);
                }
            })
            .on('broadcast', { event: 'sync_vault' }, ({ payload }) => {
                if (payload) {
                    if (payload.folders) CHAT_STATE.folders = payload.folders;
                    if (payload.files) CHAT_STATE.files = payload.files;
                    saveWorkspaceData();
                    renderExplorer();
                    updateHeaderVaultUI();
                }
            })
            .on('broadcast', { event: 'friend_request_update' }, ({ payload }) => {
                if (payload && Array.isArray(payload.friend_requests)) {
                    mergeFriendRequestsFromCloud(payload.friend_requests);
                }
            })
            // B. Postgres changes on cloud store
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: 'room_code=eq.WORKCHAT' }, payload => {
                if (payload.new && payload.new.quiz_settings) {
                    mergeCloudStore(payload.new.quiz_settings);
                }
            })
            // C. Postgres changes on workchat_messages if table exists
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workchat_messages' }, payload => {
                if (payload.new && !CHAT_STATE.messages.some(m => m.id === payload.new.id)) {
                    CHAT_STATE.messages.push(payload.new);
                    saveWorkspaceData();
                    renderChatsList();
                    renderMessages();
                    scrollMessagesToBottom();
                    playIncomingChime(payload.new.sender_name, payload.new.message_text, payload.new.chat_id);
                }
            })
            .subscribe((status) => {
                console.log('WorkChat Realtime WebSocket status:', status);
            });

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

    // 2. 1-on-1 Direct Chats (Dynamically generated from TEAM_FRIENDS)
    const directChannels = (TEAM_FRIENDS || []).map(f => {
        const lastMsg = (CHAT_STATE.messages || [])
            .filter(m => m.chatId === f.id || m.recipientId === f.id)
            .pop();

        let sub = f.bio || f.role || 'ส่งข้อความเพื่อเริ่มคุยงาน';
        if (lastMsg) {
            const isMe = (lastMsg.sender === CHAT_STATE.currentUser.displayName || lastMsg.sender === CHAT_STATE.currentUser.username);
            sub = (isMe ? 'คุณ: ' : '') + (lastMsg.text || '📎 ส่งไฟล์แนบ');
        }

        return {
            id: f.id,
            name: f.name,
            subtitleDefault: sub,
            avatarType: f.avatarType,
            status: `${f.status === 'online' ? 'ออนไลน์' : 'ออฟไลน์'} • ${f.role}`,
            isDirect: true,
            type: 'direct',
            isCustom: f.isCustom
        };
    });

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
                ${item.isDirect ? `
                    <button type="button" class="btn-chat-item-delete ms-1" onclick="event.stopPropagation(); deleteFriend('${item.id}')" title="ลบ ${escapeHtml(item.name)} ออกจากรายชื่อเพื่อน">
                        <i class="bi bi-trash3"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ── 4.5 PEOPLE (FRIENDS) LIST ENGINE ────────────────────────────────────────
const DEFAULT_FRIENDS = [];

function getFriendsStorageKey() {
    const u = (CHAT_STATE.currentUser?.username || '').toLowerCase();
    return u ? `sgyver_workchat_friends_${u}` : 'sgyver_workchat_friends_guest';
}

function isFriendBelongingToCurrentUser(fr) {
    if (!fr) return false;
    const myUser = (CHAT_STATE.currentUser?.username || '').toLowerCase();
    const myId = (CHAT_STATE.currentUser?.id || '').toLowerCase();
    if (!myUser && !myId) return true;
    if (fr.ownerUsername) return fr.ownerUsername.toLowerCase() === myUser;
    if (fr.ownerUserId && myId) return fr.ownerUserId.toLowerCase() === myId;
    if (Array.isArray(FRIEND_REQUESTS)) {
        return FRIEND_REQUESTS.some(req => 
            req.status === 'accepted' && (
                (req.fromUsername?.toLowerCase() === myUser && (req.toUsername?.toLowerCase() === fr.username?.toLowerCase() || req.toName === fr.name)) ||
                (req.toUsername?.toLowerCase() === myUser && (req.fromUsername?.toLowerCase() === fr.username?.toLowerCase() || req.fromName === fr.name))
            )
        );
    }
    return false;
}

function loadFriendsData() {
    try {
        const key = getFriendsStorageKey();
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.filter(f => !isMockFriend(f) && !isDeletedFriendObj(f) && isFriendBelongingToCurrentUser(f));
            }
        }
    } catch (e) {
        console.warn('Failed to load friends from local storage', e);
    }
    return [];
}

function saveFriendsData() {
    try {
        const key = getFriendsStorageKey();
        const cleanFriends = (TEAM_FRIENDS || []).filter(f => !isMockFriend(f) && !isDeletedFriendObj(f));
        localStorage.setItem(key, JSON.stringify(cleanFriends));
    } catch (e) {
        console.warn('Failed to save friends to local storage', e);
    }
}

let TEAM_FRIENDS = loadFriendsData();

function renderPeopleList() {
    const container = document.getElementById('chats-list-stream');
    if (!container) return;

    const query = (CHAT_STATE.chatsSearchQuery || '').toLowerCase();
    const filtered = TEAM_FRIENDS.filter(f => 
        !query || 
        f.name.toLowerCase().includes(query) || 
        (f.role && f.role.toLowerCase().includes(query)) ||
        (f.bio && f.bio.toLowerCase().includes(query)) ||
        (f.username && f.username.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-people fs-1 d-block mb-2 text-primary opacity-50"></i>
                <div class="fw-bold">ไม่พบรายชื่อเพื่อน</div>
                <div class="small mb-3">ลองค้นหาด้วยคำอื่น หรือกดปุ่มด้านล่างเพื่อเพิ่มเพื่อน</div>
                <button type="button" class="btn btn-sm btn-primary rounded-pill px-4 fw-bold shadow-sm" onclick="openAddFriendModal()">
                    <i class="bi bi-person-plus-fill me-1"></i> เพิ่มเพื่อนใหม่
                </button>
            </div>
        `;
        return;
    }

    const onlineCount = filtered.filter(f => f.status === 'online').length;

    container.innerHTML = `
        <div class="d-flex align-items-center justify-content-between px-2 py-2 mb-1">
            <span class="small fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.5px;">รายชื่อเพื่อน (${filtered.length})</span>
            <div class="d-flex align-items-center gap-2">
                <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill font-mono" style="font-size: 0.68rem;">ออนไลน์ ${onlineCount}</span>
                <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-0 fw-semibold" style="font-size: 0.72rem;" onclick="openAddFriendModal()" title="เพิ่มเพื่อน">
                    <i class="bi bi-person-plus-fill me-1"></i> เพิ่มเพื่อน
                </button>
            </div>
        </div>
        ${filtered.map(friend => `
            <div class="people-card-item position-relative" onclick="openDirectChatFromPeople('${friend.id}')">
                <div class="people-avatar-wrap">
                    ${getIllustratedAvatar(friend.avatarType, friend.name)}
                    <span class="people-status-dot ${friend.status}"></span>
                </div>
                <div class="people-info">
                    <div class="d-flex align-items-center justify-content-between">
                        <span class="people-name text-truncate">${escapeHtml(friend.name)}</span>
                        <span class="people-status-badge ${friend.status}">
                            ${friend.status === 'online' ? '● ออนไลน์' : 'ออฟไลน์'}
                        </span>
                    </div>
                    <div class="people-role text-truncate">${escapeHtml(friend.role || '')}</div>
                    <div class="people-bio text-truncate">${escapeHtml(friend.bio || '')}</div>
                </div>
                <div class="d-flex align-items-center gap-1 ms-1 flex-shrink-0">
                    <button type="button" class="btn-people-chat" onclick="event.stopPropagation(); openDirectChatFromPeople('${friend.id}')" title="ส่งข้อความคุยกับ ${escapeHtml(friend.name)}">
                        <i class="bi bi-chat-dots-fill"></i>
                    </button>
                    <button type="button" class="btn-people-delete" onclick="event.stopPropagation(); deleteFriend('${friend.id}')" title="ลบ ${escapeHtml(friend.name)} ออกจากรายชื่อเพื่อน">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
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

function deleteFriend(friendId) {
    const friend = TEAM_FRIENDS.find(f => f.id === friendId) || { id: friendId, name: 'เพื่อน' };

    // 1. Mark all identifiers of this friend as deleted so cloud sync never resurrects them
    markFriendDeleted(friend);
    markFriendDeleted(friendId);

    // 2. Remove from TEAM_FRIENDS
    const targetNameLower = String(friend.name || '').trim().toLowerCase();
    const targetUserLower = String(friend.username || '').trim().toLowerCase();
    const targetUserId = String(friend.userId || '').trim();

    TEAM_FRIENDS = TEAM_FRIENDS.filter(f => {
        if (!f) return false;
        if (f.id === friendId) return false;
        if (targetUserId && f.userId === targetUserId) return false;
        if (targetUserLower && String(f.username || '').trim().toLowerCase() === targetUserLower) return false;
        if (targetNameLower && String(f.name || '').trim().toLowerCase() === targetNameLower) return false;
        return true;
    });

    // 3. Also mark any friend requests involving this person as 'removed' so mergeFriendRequestsFromCloud never re-adds them!
    if (typeof FRIEND_REQUESTS !== 'undefined' && Array.isArray(FRIEND_REQUESTS)) {
        FRIEND_REQUESTS.forEach(r => {
            if (!r) return;
            const matchFrom = (targetUserId && r.fromUserId === targetUserId) ||
                              (targetUserLower && String(r.fromUsername || '').trim().toLowerCase() === targetUserLower) ||
                              (targetNameLower && String(r.fromName || '').trim().toLowerCase() === targetNameLower) ||
                              ('dm_user_' + r.fromUserId === friendId);
            const matchTo = (targetUserId && r.toUserId === targetUserId) ||
                            (targetUserLower && String(r.toUsername || '').trim().toLowerCase() === targetUserLower) ||
                            (targetNameLower && String(r.toName || '').trim().toLowerCase() === targetNameLower) ||
                            ('dm_user_' + r.toUserId === friendId);
            if (matchFrom || matchTo) {
                r.status = 'removed';
            }
        });
        saveFriendRequestsData();
        updateFriendNotifBadge();
        renderFriendRequestsPopover();
        broadcastFriendRequestsUpdate();
    }

    // 4. Also remove messages belonging to this deleted direct chat
    if (Array.isArray(CHAT_STATE.messages)) {
        CHAT_STATE.messages = CHAT_STATE.messages.filter(m => m && m.chat_id !== friendId);
        saveWorkspaceData();
    }

    saveFriendsData();
    syncWorkchatToCloud();

    if (CHAT_STATE.activeChatId === friendId) {
        if (TEAM_FRIENDS.length > 0) {
            selectChatConversation(TEAM_FRIENDS[0].id);
        } else if (CHAT_STATE.groups && CHAT_STATE.groups.length > 0) {
            selectChatConversation(CHAT_STATE.groups[0].id);
        } else {
            CHAT_STATE.activeChatId = null;
            renderEmptyChatHeader();
            renderMessages();
        }
    }

    if (CHAT_STATE.currentRailTab === 'people') {
        renderPeopleList();
    } else {
        renderChatsList();
    }
    showModernToast(`ลบ "${friend.name}" ออกจากรายชื่อเพื่อนแล้ว`);
}
window.deleteFriend = deleteFriend;

function openAddFriendModal() {
    const modalEl = document.getElementById('modalAddFriend');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
        setTimeout(() => {
            executeSearchSupabaseUsers();
        }, 150);
    }
}
window.openAddFriendModal = openAddFriendModal;

let _searchUserDebounce = null;
function onAddFriendSearchInput(val) {
    clearTimeout(_searchUserDebounce);
    _searchUserDebounce = setTimeout(() => {
        executeSearchSupabaseUsers();
    }, 350);
}
window.onAddFriendSearchInput = onAddFriendSearchInput;

async function executeSearchSupabaseUsers() {
    const queryInput = document.getElementById('input-add-friend-query');
    const query = queryInput ? queryInput.value.trim() : '';
    const stream = document.getElementById('add-friend-results-stream');
    const labelEl = document.getElementById('search-results-label');
    const countEl = document.getElementById('search-results-count');
    if (!stream) return;

    if (countEl) countEl.innerText = 'กำลังค้นหา...';

    if (!window.supabaseClient) {
        if (countEl) countEl.innerText = '';
        stream.innerHTML = `
            <div class="p-3 text-center text-muted small bg-light rounded-3">
                <i class="bi bi-wifi-off fs-4 d-block mb-1 text-secondary"></i>
                ไม่ได้เชื่อมต่อ Supabase หรืออยู่ในโหมดออฟไลน์
                <div class="mt-2">คุณสามารถใช้แท็บ <strong>"สร้างรายชื่อใหม่เอง"</strong> เพื่อเพิ่มเพื่อนได้ทันทีครับ</div>
            </div>
        `;
        return;
    }

    try {
        let req = window.supabaseClient.from('profiles').select('id, username, nickname, first_name, last_name, avatar_url, role, level, email');
        if (query) {
            req = req.or(`username.ilike.%${query}%,nickname.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`).limit(25);
            if (labelEl) labelEl.innerText = `ผลการค้นหา: "${query}"`;
        } else {
            req = req.order('created_at', { ascending: false }).limit(10);
            if (labelEl) labelEl.innerText = 'สมาชิกแนะนำในระบบ';
        }

        const { data, error } = await req;
        if (error) {
            console.warn('Search users error:', error);
            if (countEl) countEl.innerText = 'เกิดข้อผิดพลาด';
            stream.innerHTML = `
                <div class="p-3 text-center text-muted small bg-light rounded-3">
                    <i class="bi bi-exclamation-triangle text-warning fs-4 d-block mb-1"></i>
                    ไม่สามารถค้นหาได้ในขณะนี้
                    <div class="mt-2 text-secondary">สามารถสลับไปที่แท็บ <strong>"สร้างรายชื่อใหม่เอง"</strong> เพื่อเพิ่มเพื่อนได้ทันที</div>
                </div>
            `;
            return;
        }

        renderAddFriendSearchResults(data || []);
    } catch (err) {
        console.warn('Search exception:', err);
        if (countEl) countEl.innerText = '';
        stream.innerHTML = `<div class="p-3 text-center text-muted small">เกิดข้อผิดพลาดในการค้นหา</div>`;
    }
}
window.executeSearchSupabaseUsers = executeSearchSupabaseUsers;

function renderAddFriendSearchResults(users) {
    const stream = document.getElementById('add-friend-results-stream');
    const countEl = document.getElementById('search-results-count');
    if (!stream) return;

    if (countEl) countEl.innerText = `พบ ${users.length} คน`;

    if (!users || users.length === 0) {
        stream.innerHTML = `
            <div class="text-center py-4 text-muted small">
                <i class="bi bi-person-x fs-2 d-block mb-1 opacity-50"></i>
                ไม่พบสมาชิกที่ตรงกับคำค้นหา
                <div class="mt-2">
                    สามารถสลับไปแท็บ <strong>"สร้างรายชื่อใหม่เอง"</strong> เพื่อเพิ่มเพื่อนด้วยตนเองได้ครับ
                </div>
            </div>
        `;
        return;
    }

    const friendUserIdSet = new Set(TEAM_FRIENDS.map(f => f.userId || f.username));
    const currentMyId = CHAT_STATE.currentUser.id || CHAT_STATE.currentUser.username;

    stream.innerHTML = users.map(user => {
        const displayName = user.nickname || (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username) || 'สมาชิก Gyver';
        const role = user.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : (user.role || `สมาชิก Lv.${user.level || 1}`);
        const avatar = user.avatar_url || 'user_boy';
        const isMe = (user.id === currentMyId || (user.username && user.username === CHAT_STATE.currentUser.username));
        const alreadyFriend = friendUserIdSet.has(user.id) || (user.username && friendUserIdSet.has(user.username)) || TEAM_FRIENDS.some(f => f.name === displayName);

        // Check if there is a pending request between us and this user
        const outgoingPending = (FRIEND_REQUESTS || []).find(r =>
            r && r.status === 'pending' && isRequestFromMe(r) &&
            ((user.id && r.toUserId === user.id) || (user.username && r.toUsername === user.username) || (r.toName === displayName))
        );
        const incomingPending = (FRIEND_REQUESTS || []).find(r =>
            r && r.status === 'pending' && isRequestForMe(r) &&
            ((user.id && r.fromUserId === user.id) || (user.username && r.fromUsername === user.username) || (r.fromName === displayName))
        );

        const safeUserObj = {
            id: user.id,
            name: displayName,
            username: user.username || '',
            avatarUrl: user.avatar_url || 'user_boy',
            role: role,
            email: user.email || ''
        };
        const encodedData = encodeURIComponent(JSON.stringify(safeUserObj));

        return `
            <div class="friend-search-result-item">
                <div class="d-flex align-items-center gap-2.5 min-w-0">
                    <div class="friend-search-avatar">
                        ${getIllustratedAvatar(avatar, displayName)}
                    </div>
                    <div class="min-w-0">
                        <div class="fw-bold text-dark small text-truncate">
                            ${escapeHtml(displayName)}
                            ${isMe ? '<span class="badge bg-secondary-subtle text-secondary ms-1 font-mono" style="font-size: 0.65rem;">คุณ</span>' : ''}
                        </div>
                        <div class="text-muted text-truncate" style="font-size: 0.72rem;">
                            ${escapeHtml(user.username ? '@' + user.username : (user.email || ''))} • ${escapeHtml(role)}
                        </div>
                    </div>
                </div>

                <div class="flex-shrink-0">
                    ${isMe ? `
                        <span class="badge bg-light text-muted border rounded-pill px-2.5 py-1.5 small">บัญชีของคุณ</span>
                    ` : alreadyFriend ? `
                        <button type="button" class="btn btn-sm btn-light text-success rounded-pill px-3 py-1 fw-bold border" disabled>
                            <i class="bi bi-check2"></i> เพื่อนแล้ว
                        </button>
                    ` : incomingPending ? `
                        <button type="button" class="btn btn-sm btn-success rounded-pill px-3 py-1 fw-bold shadow-sm" onclick="acceptFriendRequest('${incomingPending.id}'); executeSearchSupabaseUsers();">
                            <i class="bi bi-check2-circle me-1"></i> ตอบรับคำขอ
                        </button>
                    ` : outgoingPending ? `
                        <button type="button" class="btn btn-sm btn-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1 fw-bold" onclick="cancelFriendRequest('${outgoingPending.id}'); executeSearchSupabaseUsers();" title="คลิกเพื่อยกเลิกคำขอ">
                            <i class="bi bi-hourglass-split me-1"></i> ส่งคำขอแล้ว
                        </button>
                    ` : `
                        <button type="button" class="btn btn-sm btn-primary rounded-pill px-3 py-1 fw-bold shadow-sm" onclick="addNewFriendFromData('${encodedData}')">
                            <i class="bi bi-person-plus-fill me-1"></i> เพิ่มเพื่อน
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function addNewFriendFromData(encodedJson) {
    try {
        const u = JSON.parse(decodeURIComponent(encodedJson));
        const newFriendId = 'dm_user_' + (u.id || u.username || Date.now());

        if (TEAM_FRIENDS.some(f => f.id === newFriendId || (u.id && f.userId === u.id) || (u.username && f.username === u.username))) {
            showModernToast(`"${u.name}" อยู่ในรายชื่อเพื่อนของคุณแล้ว`);
            return;
        }

        // Check if request already exists
        const existingOutgoing = (FRIEND_REQUESTS || []).find(r =>
            r && r.status === 'pending' && isRequestFromMe(r) &&
            ((u.id && r.toUserId === u.id) || (u.username && r.toUsername === u.username) || (r.toName === u.name))
        );
        if (existingOutgoing) {
            showModernToast(`ส่งคำขอเป็นเพื่อนไปหา "${u.name}" แล้ว รอการตอบรับครับ`);
            return;
        }

        // Send a Friend Request to target user
        const me = CHAT_STATE.currentUser;
        const newReq = {
            id: 'freq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            fromUserId: me.id || me.username || '',
            fromUsername: me.username || '',
            fromName: me.displayName || me.username || 'ผู้ใช้งาน Gyver',
            fromRole: me.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : `สมาชิก Lv.${me.level || 1}`,
            fromAvatar: me.avatar || 'user_boy',
            toUserId: u.id || '',
            toUsername: u.username || '',
            toName: u.name || 'สมาชิก Gyver',
            toRole: u.role || 'สมาชิกทีม',
            toAvatar: u.avatarUrl || 'user_boy',
            status: 'pending',
            created_at: new Date().toISOString()
        };

        unmarkFriendDeleted({ id: newFriendId, userId: u.id, username: u.username, name: u.name });
        FRIEND_REQUESTS.push(newReq);
        saveFriendRequestsData();
        updateFriendNotifBadge();
        renderFriendRequestsPopover();
        broadcastFriendRequestsUpdate();
        syncWorkchatToCloud();
        executeSearchSupabaseUsers();

        showModernToast(`ส่งคำขอเป็นเพื่อนไปหา "${u.name}" แล้ว รออีกฝ่ายกดยอมรับ 🔔`);
    } catch (err) {
        console.error('Failed to send friend request:', err);
        showModernToast('ไม่สามารถส่งคำขอเป็นเพื่อนได้');
    }
}
window.addNewFriendFromData = addNewFriendFromData;

// ── 4.5.1 FRIEND REQUESTS & NOTIFICATION BELL ENGINE ────────────────────────
let FRIEND_REQUESTS = loadFriendRequestsData();

function loadFriendRequestsData() {
    try {
        const raw = localStorage.getItem('sgyver_workchat_friend_requests');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter(r => r && r.id);
            }
        }
    } catch (e) {
        console.warn('Failed to load friend requests', e);
    }
    return [];
}

function saveFriendRequestsData() {
    try {
        const clean = (FRIEND_REQUESTS || []).filter(r => r && r.id).slice(-100);
        localStorage.setItem('sgyver_workchat_friend_requests', JSON.stringify(clean));
    } catch (e) {
        console.warn('Failed to save friend requests', e);
    }
}

function isRequestForMe(req) {
    if (!req) return false;
    if (req.isDemoToMe) return true;
    const me = CHAT_STATE.currentUser || {};
    const myId = String(me.id || '').trim().toLowerCase();
    const myUser = String(me.username || '').trim().toLowerCase();
    const myName = String(me.displayName || '').trim().toLowerCase();

    const toId = String(req.toUserId || '').trim().toLowerCase();
    const toUser = String(req.toUsername || '').trim().toLowerCase();
    const toName = String(req.toName || '').trim().toLowerCase();

    if (myId && toId && myId === toId) return true;
    if (myUser && toUser && myUser === toUser) return true;
    if (myName && toName && myName === toName) return true;
    return false;
}

function isRequestFromMe(req) {
    if (!req) return false;
    if (req.isDemoToMe) return false;
    const me = CHAT_STATE.currentUser || {};
    const myId = String(me.id || '').trim().toLowerCase();
    const myUser = String(me.username || '').trim().toLowerCase();
    const myName = String(me.displayName || '').trim().toLowerCase();

    const fromId = String(req.fromUserId || '').trim().toLowerCase();
    const fromUser = String(req.fromUsername || '').trim().toLowerCase();
    const fromName = String(req.fromName || '').trim().toLowerCase();

    if (myId && fromId && myId === fromId) return true;
    if (myUser && fromUser && myUser === fromUser) return true;
    if (myName && fromName && myName === fromName) return true;
    return false;
}

function broadcastFriendRequestsUpdate() {
    try {
        if (CHAT_STATE.realtimeChannel) {
            CHAT_STATE.realtimeChannel.send({
                type: 'broadcast',
                event: 'friend_request_update',
                payload: { friend_requests: FRIEND_REQUESTS }
            });
        }
    } catch (_) {}
}

function mergeFriendRequestsFromCloud(cloudReqs) {
    if (!Array.isArray(cloudReqs)) return;
    let changed = false;
    let newlyReceivedName = '';
    let newlyAcceptedName = '';

    const localMap = new Map((FRIEND_REQUESTS || []).map(r => [r.id, r]));

    cloudReqs.forEach(cr => {
        if (!cr || !cr.id) return;
        const existing = localMap.get(cr.id);
        if (!existing) {
            localMap.set(cr.id, cr);
            changed = true;
            if (cr.status === 'pending' && isRequestForMe(cr)) {
                newlyReceivedName = cr.fromName || 'สมาชิกใหม่';
            }
        } else if (existing.status !== cr.status) {
            const wasPending = existing.status === 'pending';
            existing.status = cr.status;
            changed = true;
            if (wasPending && cr.status === 'accepted' && isRequestFromMe(cr)) {
                newlyAcceptedName = cr.toName || 'เพื่อนใหม่';
            }
        }
    });

    // Ensure any request accepted where we are either sender or receiver adds the counterpart to TEAM_FRIENDS
    localMap.forEach(req => {
        if (req.status === 'accepted') {
            if (isRequestFromMe(req)) {
                ensureCounterpartInFriends({
                    userId: req.toUserId,
                    username: req.toUsername,
                    name: req.toName,
                    role: req.toRole,
                    avatarType: req.toAvatar
                });
            } else if (isRequestForMe(req)) {
                ensureCounterpartInFriends({
                    userId: req.fromUserId,
                    username: req.fromUsername,
                    name: req.fromName,
                    role: req.fromRole,
                    avatarType: req.fromAvatar
                });
            }
        }
    });

    if (changed) {
        FRIEND_REQUESTS = Array.from(localMap.values());
        saveFriendRequestsData();
        updateFriendNotifBadge();
        renderFriendRequestsPopover();

        if (newlyReceivedName) {
            playIncomingChime();
            showModernToast(`🔔 "${newlyReceivedName}" ส่งคำขอเป็นเพื่อนถึงคุณ!`);
        }
        if (newlyAcceptedName) {
            playIncomingChime();
            showModernToast(`🎉 "${newlyAcceptedName}" ยอมรับคำขอเป็นเพื่อนของคุณแล้ว!`);
        }
    }
}

function ensureCounterpartInFriends(person, forceAdd = false) {
    if (!person || !person.name) return null;
    const friendId = 'dm_user_' + (person.userId || person.username || person.name.toLowerCase().replace(/\s+/g, '_'));
    const candidate = {
        id: friendId,
        userId: person.userId || '',
        username: person.username || '',
        name: person.name
    };

    if (!forceAdd && isDeletedFriendObj(candidate)) {
        return null;
    }
    if (forceAdd) {
        unmarkFriendDeleted(candidate);
    }

    const existing = TEAM_FRIENDS.find(f =>
        f.id === friendId ||
        (person.userId && f.userId === person.userId) ||
        (person.username && f.username === person.username) ||
        (f.name === person.name)
    );
    if (existing) return existing;

    const newFriend = {
        id: friendId,
        userId: person.userId || '',
        username: person.username || '',
        name: person.name,
        role: person.role || 'สมาชิกทีม',
        avatarType: person.avatarType || 'user_boy',
        status: 'online',
        bio: 'เพื่อนร่วมทีม Gyver',
        isCustom: true
    };
    TEAM_FRIENDS.push(newFriend);
    saveFriendsData();
    if (CHAT_STATE.currentRailTab === 'people') {
        renderPeopleList();
    } else {
        renderChatsList();
    }
    return newFriend;
}

function updateFriendNotifBadge() {
    const incomingPending = (FRIEND_REQUESTS || []).filter(r => r && r.status === 'pending' && isRequestForMe(r));
    const count = incomingPending.length;

    // Badges on desktop header, mobile chats header, and mobile bottom rail
    const badgeIds = ['friend-notif-badge', 'middle-friend-notif-badge', 'rail-friend-notif-badge'];
    badgeIds.forEach(id => {
        const badgeEl = document.getElementById(id);
        if (badgeEl) {
            if (count > 0) {
                badgeEl.textContent = count > 99 ? '99+' : String(count);
                badgeEl.classList.remove('d-none');
            } else {
                badgeEl.textContent = '0';
                badgeEl.classList.add('d-none');
            }
        }
    });

    const bellBtnIds = ['btn-friend-notif-bell', 'btn-middle-notif-bell'];
    bellBtnIds.forEach(id => {
        const bellBtn = document.getElementById(id);
        if (bellBtn) {
            bellBtn.classList.toggle('has-pending', count > 0);
        }
    });

    const countHeaderIds = ['friend-notif-header-count', 'middle-friend-notif-header-count'];
    countHeaderIds.forEach(id => {
        const headerCountEl = document.getElementById(id);
        if (headerCountEl) {
            headerCountEl.textContent = `${count} รายการ`;
        }
    });
}
window.updateFriendNotifBadge = updateFriendNotifBadge;

function renderFriendRequestsPopover() {
    const containers = [
        document.getElementById('friend-notif-list-stream'),
        document.getElementById('middle-friend-notif-list-stream')
    ].filter(Boolean);

    if (containers.length === 0) return;

    updateFriendNotifBadge();

    const incoming = (FRIEND_REQUESTS || [])
        .filter(r => r && r.status === 'pending' && isRequestForMe(r))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const outgoing = (FRIEND_REQUESTS || [])
        .filter(r => r && r.status === 'pending' && isRequestFromMe(r))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (incoming.length === 0 && outgoing.length === 0) {
        const emptyHtml = `
            <div class="text-center py-4 px-3">
                <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-light text-secondary mb-2" style="width: 52px; height: 52px;">
                    <i class="bi bi-bell-slash fs-4"></i>
                </div>
                <div class="fw-bold text-dark small">ยังไม่มีคำขอเป็นเพื่อนใหม่</div>
                <div class="text-muted mb-3" style="font-size: 0.74rem;">เมื่อมีคนกดเพิ่มคุณเป็นเพื่อน รายการจะแจ้งเตือนที่นี่เพื่อให้คุณกดยอมรับหรือปฏิเสธครับ</div>
                <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-semibold" style="font-size: 0.74rem;" onclick="simulateIncomingFriendRequest()">
                    <i class="bi bi-stars me-1"></i> ทดสอบจำลองมีคนขอเป็นเพื่อน
                </button>
            </div>
        `;
        containers.forEach(c => { c.innerHTML = emptyHtml; });
        return;
    }

    let html = '';

    if (incoming.length > 0) {
        html += `
            <div class="px-3 py-1.5 bg-light border-bottom text-muted fw-bold text-uppercase" style="font-size: 0.68rem; letter-spacing: 0.4px;">
                รอการตอบรับจากคุณ (${incoming.length})
            </div>
        `;
        html += incoming.map(req => `
            <div class="friend-req-card">
                <div class="d-flex align-items-start gap-2.5">
                    <div class="friend-req-avatar">
                        ${getIllustratedAvatar(req.fromAvatar || 'user_boy', req.fromName)}
                    </div>
                    <div class="flex-grow-1 min-w-0">
                        <div class="d-flex align-items-center justify-content-between gap-1">
                            <span class="fw-bold text-dark text-truncate" style="font-size: 0.86rem;">${escapeHtml(req.fromName || 'ผู้ใช้งาน')}</span>
                            <span class="text-muted flex-shrink-0" style="font-size: 0.68rem;">${formatMessageTime(req.created_at)}</span>
                        </div>
                        <div class="text-primary text-truncate fw-semibold" style="font-size: 0.72rem;">${escapeHtml(req.fromRole || 'สมาชิกทีม')}</div>
                        <div class="text-muted mt-0.5 mb-2" style="font-size: 0.72rem;">ต้องการเพิ่มคุณเป็นเพื่อนใน WorkChat</div>
                        <div class="d-flex align-items-center gap-2">
                            <button type="button" class="btn-req-accept flex-grow-1" onclick="acceptFriendRequest('${req.id}')">
                                <i class="bi bi-check-lg me-1"></i> ยอมรับ
                            </button>
                            <button type="button" class="btn-req-decline flex-grow-1" onclick="rejectFriendRequest('${req.id}')">
                                <i class="bi bi-x-lg me-1"></i> ปฏิเสธ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (outgoing.length > 0) {
        html += `
            <div class="px-3 py-1.5 bg-light border-top border-bottom text-muted fw-bold text-uppercase" style="font-size: 0.68rem; letter-spacing: 0.4px;">
                คำขอที่คุณส่งไป (${outgoing.length})
            </div>
        `;
        html += outgoing.map(req => `
            <div class="friend-req-card">
                <div class="d-flex align-items-center justify-content-between gap-2">
                    <div class="d-flex align-items-center gap-2.5 min-w-0">
                        <div class="friend-req-avatar" style="width: 38px; height: 38px;">
                            ${getIllustratedAvatar(req.toAvatar || 'user_boy', req.toName)}
                        </div>
                        <div class="min-w-0">
                            <div class="fw-bold text-dark text-truncate" style="font-size: 0.82rem;">${escapeHtml(req.toName || 'สมาชิก')}</div>
                            <div class="text-muted text-truncate" style="font-size: 0.7rem;">
                                <i class="bi bi-hourglass-split text-warning me-1"></i> รอการตอบรับ
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn-req-decline flex-shrink-0 py-1 px-2.5" style="font-size: 0.72rem;" onclick="cancelFriendRequest('${req.id}')">
                        ยกเลิก
                    </button>
                </div>
            </div>
        `).join('');
    }

    containers.forEach(c => { c.innerHTML = html; });
}
window.renderFriendRequestsPopover = renderFriendRequestsPopover;

function acceptFriendRequest(reqId) {
    const req = (FRIEND_REQUESTS || []).find(r => r && r.id === reqId);
    if (!req) return;

    req.status = 'accepted';
    saveFriendRequestsData();

    const newFriend = ensureCounterpartInFriends({
        userId: req.fromUserId,
        username: req.fromUsername,
        name: req.fromName,
        role: req.fromRole,
        avatarType: req.fromAvatar
    }, true);

    updateFriendNotifBadge();
    renderFriendRequestsPopover();
    broadcastFriendRequestsUpdate();
    syncWorkchatToCloud();

    showModernToast(`ยอมรับ "${req.fromName}" เป็นเพื่อนเรียบร้อยแล้ว! 🎉`);

    if (newFriend) {
        openDirectChatFromPeople(newFriend.id);
    }
}
window.acceptFriendRequest = acceptFriendRequest;

function rejectFriendRequest(reqId) {
    const req = (FRIEND_REQUESTS || []).find(r => r && r.id === reqId);
    if (!req) return;

    const fromName = req.fromName || 'ผู้ใช้งาน';
    req.status = 'rejected';
    saveFriendRequestsData();
    updateFriendNotifBadge();
    renderFriendRequestsPopover();
    broadcastFriendRequestsUpdate();
    syncWorkchatToCloud();

    showModernToast(`ปฏิเสธคำขอเป็นเพื่อนจาก "${fromName}" แล้ว`);
}
window.rejectFriendRequest = rejectFriendRequest;

function cancelFriendRequest(reqId) {
    const req = (FRIEND_REQUESTS || []).find(r => r && r.id === reqId);
    if (!req) return;

    FRIEND_REQUESTS = FRIEND_REQUESTS.filter(r => r && r.id !== reqId);
    saveFriendRequestsData();
    updateFriendNotifBadge();
    renderFriendRequestsPopover();
    broadcastFriendRequestsUpdate();
    syncWorkchatToCloud();

    showModernToast(`ยกเลิกคำขอเป็นเพื่อนที่ส่งให้ "${req.toName || 'สมาชิก'}" แล้ว`);
}
window.cancelFriendRequest = cancelFriendRequest;

function simulateIncomingFriendRequest() {
    const me = CHAT_STATE.currentUser || {};
    const demoReq = {
        id: 'freq_demo_' + Date.now(),
        fromUserId: 'demo_friend_' + Date.now(),
        fromUsername: 'aya_member',
        fromName: 'Aya (สมาชิกทีม)',
        fromRole: 'ฝ่ายประสานงานโปรเจกต์',
        fromAvatar: 'user_boy',
        toUserId: me.id || me.username || '',
        toUsername: me.username || '',
        toName: me.displayName || '',
        isDemoToMe: true,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    FRIEND_REQUESTS.push(demoReq);
    saveFriendRequestsData();
    updateFriendNotifBadge();
    renderFriendRequestsPopover();
    playIncomingChime();
    showModernToast('🔔 มีคำขอเป็นเพื่อนใหม่เข้ามา! กดยอมรับหรือปฏิเสธได้เลยครับ');
}
window.simulateIncomingFriendRequest = simulateIncomingFriendRequest;

function selectCustomFriendAvatar(avatarKey) {
    const valInput = document.getElementById('custom-friend-avatar-val');
    if (valInput) valInput.value = avatarKey;

    const options = document.querySelectorAll('#custom-friend-avatar-picker .custom-avatar-option');
    options.forEach(opt => {
        if (opt.getAttribute('data-avatar') === avatarKey) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}
window.selectCustomFriendAvatar = selectCustomFriendAvatar;

function handleCreateCustomFriend() {
    const nameInput = document.getElementById('custom-friend-name');
    const roleInput = document.getElementById('custom-friend-role');
    const bioInput = document.getElementById('custom-friend-bio');
    const avatarInput = document.getElementById('custom-friend-avatar-val');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        showModernToast('กรุณาระบุชื่อเพื่อน');
        return;
    }

    const role = roleInput ? roleInput.value.trim() : 'เพื่อนร่วมทีม';
    const bio = bioInput ? bioInput.value.trim() : '';
    const avatar = avatarInput ? avatarInput.value : 'user_boy';

    const newFriendId = 'dm_custom_' + Date.now();
    const newFriend = {
        id: newFriendId,
        username: 'contact_' + Date.now(),
        name: name,
        role: role || 'เพื่อนร่วมทีม',
        avatarType: avatar,
        status: 'online',
        bio: bio || 'รายชื่อเพื่อนที่สร้างเอง',
        isCustom: true
    };

    TEAM_FRIENDS.push(newFriend);
    saveFriendsData();
    syncWorkchatToCloud();

    if (nameInput) nameInput.value = '';
    if (roleInput) roleInput.value = '';
    if (bioInput) bioInput.value = '';

    if (CHAT_STATE.currentRailTab === 'people') {
        renderPeopleList();
    } else {
        renderChatsList();
    }

    showModernToast(`บันทึกและเพิ่ม "${name}" เรียบร้อยแล้ว! 🎉`);

    const modalEl = document.getElementById('modalAddFriend');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    openDirectChatFromPeople(newFriend.id);
}
window.handleCreateCustomFriend = handleCreateCustomFriend;

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
    // 2. Direct 1-on-1 Friend Conversations (Dynamic for all friends including custom & added ones)
    const friend = (typeof TEAM_FRIENDS !== 'undefined' ? TEAM_FRIENDS : []).find(f => f.id === chatId);

    if (group) {
        if (titleEl) titleEl.textContent = group.name;
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar('group', group.name);
        const memberCount = (group.members && group.members.length) || 1;
        if (statusEl) statusEl.innerHTML = `<span class="status-dot-green"></span> กลุ่มแชท • สมาชิก ${memberCount} คน`;
        CHAT_STATE.activeProjectId = 'all';
    } else if (friend) {
        if (titleEl) titleEl.textContent = friend.name;
        if (avatarEl) avatarEl.innerHTML = getIllustratedAvatar(friend.avatarType, friend.name);
        const isOnline = friend.status === 'online';
        if (statusEl) {
            statusEl.innerHTML = isOnline 
                ? `<span class="status-dot-green"></span> ออนไลน์ • ${escapeHtml(friend.role || 'สมาชิกในระบบ')}`
                : `<span class="text-muted">●</span> ออฟไลน์ • ${escapeHtml(friend.role || 'สมาชิกในระบบ')}`;
        }
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

    // Restore preset project for this specific conversation if previously chosen
    try {
        const savedChatProj = localStorage.getItem('sgyver_workchat_preset_project_' + chatId);
        if (savedChatProj !== null && (!savedChatProj || CHAT_STATE.projects.some(p => p.id === savedChatProj))) {
            CHAT_STATE.selectedTagProjectId = savedChatProj;
        }
    } catch (_) {}

    updateHeaderVaultUI();
    populateStagingFolderDropdown();

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

    if (!CHAT_STATE.activeChatId) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted" style="margin-top: 15vh;">
                <i class="bi bi-chat-square-text fs-1 d-block mb-3 text-primary opacity-50"></i>
                <div class="fw-bold fs-5 mb-1 text-dark">ยังไม่ได้เลือกการสนทนา</div>
                <div class="small text-muted mb-4">กดเลือกเพื่อนหรือกลุ่มจากแถบด้านซ้าย เพื่อเริ่มคุยงานได้เลยครับ</div>
            </div>
        `;
        return;
    }

    const activeChatId = CHAT_STATE.activeChatId;
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
        const isImageAttachment = Boolean(msg.file_data && (
            (msg.file_data.type && (msg.file_data.type.startsWith('image/') || msg.file_data.type === 'image')) ||
            (msg.file_data.url && (msg.file_data.url.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(msg.file_data.url))) ||
            (msg.file_data.name && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(msg.file_data.name))
        ));

        if (msg.file_data) {
            const f = msg.file_data;
            if (isImageAttachment && f.url) {
                attachedHtml = `
                    <div class="msg-image-attachment my-1" onclick="previewFileDirectly('${escapeHtml(f.name)}', '${escapeHtml(f.url)}')" style="cursor: pointer;">
                        <img src="${f.url}" alt="${escapeHtml(f.name)}" class="rounded-3 shadow-sm d-block" style="max-width: 100%; max-height: 260px; object-fit: cover;">
                    </div>
                `;
            } else {
                attachedHtml = `
                    <div class="msg-file-card">
                        <div class="msg-file-thumb" onclick="previewFileDirectly('${escapeHtml(f.name)}', '${escapeHtml(f.url)}')">
                            <i class="bi bi-file-earmark-arrow-down-fill"></i>
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

        // Project folder chip: ONLY shown if message is an image (not on plain text messages)
        const projectMarkup = (project && isImageAttachment) 
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
    const isProjectChannel = CHAT_STATE.projects.some(p => p.id === activeChatId);
    const newMsg = {
        id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        chat_id: activeChatId,
        sender_username: u.username,
        sender_name: u.displayName || u.username,
        avatar: u.avatar || 'user_boy',
        message_text: '👍',
        project_id: isProjectChannel ? activeChatId : null,
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

    if (CHAT_STATE.realtimeChannel) {
        try {
            CHAT_STATE.realtimeChannel.send({
                type: 'broadcast',
                event: 'new_message',
                payload: newMsg
            });
        } catch (_) {}
    }
    syncWorkchatToCloud();
    dispatchPushNotification(newMsg);
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
        html += `<option value="${p.id}:root">📁 [โฟลเดอร์หลักของ ${escapeHtml(p.code || p.name)}]</option>`;
        const projectFolders = CHAT_STATE.folders.filter(f => f.project_id === p.id);
        projectFolders.forEach(f => {
            html += `<option value="${p.id}:${f.id}">↳ 📁 ${escapeHtml(f.name)}</option>`;
        });
        html += `</optgroup>`;
    });

    select.innerHTML = html;

    // Automatic pre-selection based on active selectedTagProjectId
    if (CHAT_STATE.selectedTagProjectId) {
        const projectFolders = CHAT_STATE.folders.filter(f => f.project_id === CHAT_STATE.selectedTagProjectId);
        if (projectFolders.length > 0) {
            select.value = `${CHAT_STATE.selectedTagProjectId}:${projectFolders[0].id}`;
        } else {
            select.value = `${CHAT_STATE.selectedTagProjectId}:root`;
        }
    } else {
        select.value = '';
    }
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
        project_id: hasAttachment ? targetProjectId : (CHAT_STATE.projects.some(p => p.id === activeChatId) ? activeChatId : null),
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

    // 1. Broadcast immediately to all connected devices (PC, Mobile, Tablet) via WebSocket
    if (CHAT_STATE.realtimeChannel) {
        try {
            CHAT_STATE.realtimeChannel.send({
                type: 'broadcast',
                event: 'new_message',
                payload: newMsg
            });
        } catch (_) {}
    }

    // 2. Persist to Supabase Cloud Store (Available when devices reconnect/reload)
    syncWorkchatToCloud();

    // 3. Also insert to workchat_messages table if configured
    if (window.supabaseClient) {
        try {
            window.supabaseClient.from('workchat_messages').insert([newMsg]).catch(() => {});
        } catch (_) {}
    }

    // 4. Dispatch Web Push to wake up phones when app is closed
    dispatchPushNotification(newMsg);
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

function playIncomingChime(senderName, messageText, chatId) {
    const audio = document.getElementById('chat-chime-sound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    // 📳 Mobile Vibration
    if (navigator.vibrate) {
        try { navigator.vibrate([150, 80, 150]); } catch (_) {}
    }

    // 🔔 System Notification when app is in background or another tab
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const title = senderName ? `${senderName} (WorkChat)` : 'WorkChat';
        const body = messageText || 'มีข้อความใหม่ส่งถึงคุณ';
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        body: body,
                        icon: 'icon-192.png',
                        badge: 'icon-192.png',
                        tag: 'workchat-msg-' + (chatId || 'general'),
                        renotify: true,
                        vibrate: [200, 100, 200],
                        data: { url: './workchat.html' }
                    });
                }).catch(() => {
                    new Notification(title, { body: body, icon: 'icon-192.png' });
                });
            } else {
                new Notification(title, { body: body, icon: 'icon-192.png' });
            }
        } catch (_) {}
    }
}

const WORKCHAT_VAPID_PUBLIC_KEY = 'BISry9qnvms9_wSiEQPgLMxB1l5zE5nF7FJrErFXeAgT61M-Rj9eGWNVB3hOWev8By9ZSMzyFw91u2nGg3dydUk';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function registerPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
            const appServerKey = urlBase64ToUint8Array(WORKCHAT_VAPID_PUBLIC_KEY);
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: appServerKey
            });
        }

        if (sub && window.supabaseClient) {
            const rawKey = sub.getKey('p256dh');
            const rawAuth = sub.getKey('auth');
            const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
            const auth = rawAuth ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth))) : '';
            const currentUserId = CHAT_STATE.currentUser?.username || 'user_' + (localStorage.getItem('gyver_user_id') || 'guest');

            await window.supabaseClient.from('workchat_push_subscriptions').upsert({
                user_id: currentUserId,
                endpoint: sub.endpoint,
                p256dh: p256dh,
                auth: auth,
                user_agent: navigator.userAgent.slice(0, 200),
                updated_at: new Date().toISOString()
            }, { onConflict: 'endpoint' });
        }
    } catch (err) {
        console.warn('Push subscription notice:', err);
    }
}
window.registerPushSubscription = registerPushSubscription;

async function dispatchPushNotification(msgPayload) {
    if (!window.supabaseClient || !msgPayload) return;
    try {
        const senderName = msgPayload.sender_name || CHAT_STATE.currentUser?.displayName || 'WorkChat';
        const msgText = msgPayload.message_text || (msgPayload.attachment_url ? 'ส่งไฟล์แนบ' : 'มีข้อความใหม่');
        const chatId = msgPayload.chat_id || CHAT_STATE.activeChatId || 'general';
        const senderId = msgPayload.sender_id || CHAT_STATE.currentUser?.username || '';

        // Call Supabase Edge Function to deliver push notifications to all other devices
        await window.supabaseClient.functions.invoke('send-workchat-push', {
            body: {
                sender_name: senderName,
                message_text: msgText,
                chat_id: chatId,
                sender_id: senderId
            }
        });
    } catch (_) {
        // Silently continue if edge function is not yet deployed
    }
}
window.dispatchPushNotification = dispatchPushNotification;

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                registerPushSubscription();
                if (typeof showModernToast === 'function') {
                    showModernToast('เปิดการแจ้งเตือนข้อความแล้ว');
                }
            }
        });
    } else if (Notification.permission === 'granted') {
        registerPushSubscription();
    }
}
window.requestNotificationPermission = requestNotificationPermission;

// Trigger notification permission on first user tap/click
if (typeof window !== 'undefined') {
    const promptNotificationOnInteraction = () => {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                requestNotificationPermission();
            } else if (Notification.permission === 'granted') {
                registerPushSubscription();
            }
        }
    };
    window.addEventListener('click', promptNotificationOnInteraction, { once: true });
    window.addEventListener('touchend', promptNotificationOnInteraction, { once: true });

    // Also auto-sync push subscription if already granted
    if ('Notification' in window && Notification.permission === 'granted') {
        setTimeout(registerPushSubscription, 1500);
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
    CHAT_STATE.selectedTagProjectId = projId || '';

    // Remember preference for current chat & globally
    try {
        if (CHAT_STATE.activeChatId) {
            localStorage.setItem('sgyver_workchat_preset_project_' + CHAT_STATE.activeChatId, projId || '');
        }
        localStorage.setItem('sgyver_workchat_active_preset_project', projId || '');
    } catch (_) {}

    // If project selected, sync vault activeProjectId so drawer also focuses on this project
    if (projId) {
        CHAT_STATE.activeProjectId = projId;
        CHAT_STATE.activeFolderId = null;
        renderProjectPills();
    }

    updateHeaderVaultUI();
    renderProjectDropdownList();
    populateStagingFolderDropdown();

    const proj = CHAT_STATE.projects.find(p => p.id === projId);
    if (proj) {
        showModernToast(`📌 ตั้งค่าโปรเจกต์: [${proj.code || 'PROJ'}] ${proj.name} เรียบร้อย! (ข้อความและไฟล์จะแท็กเข้าโปรเจกต์นี้อัตโนมัติ)`);
    } else {
        showModernToast('📁 ตั้งค่าเป็น: คลังไฟล์ทั่วไป (General)');
    }
}
window.selectTagProject = selectTagProject;

function renderHeaderProjectSelector() {
    const menu = document.getElementById('header-project-select-menu');
    if (!menu) return;

    const currentProjId = CHAT_STATE.selectedTagProjectId || '';

    let html = `
        <li class="header-vault-menu-header px-3 py-2 border-bottom">
            <div class="d-flex align-items-center justify-content-between mb-1">
                <span class="fw-bold small text-dark"><i class="bi bi-tag-fill text-primary me-1"></i> เลือกโปรเจกต์ประจำวัน</span>
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle" style="font-size: 0.65rem;">Auto-Tag</span>
            </div>
            <div class="text-muted" style="font-size: 0.73rem; line-height: 1.3;">
                คุยเรื่องโปรเจกต์ไหนเลือกไว้เลย ตอนส่งข้อความหรือแนบไฟล์จะจัดเก็บเข้าโฟลเดอร์ให้อัตโนมัติ
            </div>
        </li>
        <li class="px-2 pt-2 pb-1">
            <span class="text-uppercase fw-bold text-muted px-2" style="font-size: 0.65rem; letter-spacing: 0.5px;">โปรเจกต์ที่ใช้งาน</span>
        </li>
        <li>
            <a class="dropdown-item d-flex align-items-center justify-content-between py-2 px-3 ${!currentProjId ? 'active' : ''}" 
               href="javascript:void(0)" onclick="selectTagProject('', 'ทั่วไป (General)')">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-folder2-open text-warning fs-5"></i>
                    <div>
                        <div class="fw-semibold text-dark">ทั่วไป (General)</div>
                        <div class="text-muted" style="font-size: 0.72rem;">ไม่เจาะจงโปรเจกต์ • บันทึกเข้าคลังกลาง</div>
                    </div>
                </div>
                ${!currentProjId ? '<i class="bi bi-check2 text-primary fs-5 fw-bold"></i>' : ''}
            </a>
        </li>
    `;

    CHAT_STATE.projects.forEach(p => {
        const isSelected = (currentProjId === p.id);
        const foldersCount = (CHAT_STATE.folders || []).filter(f => f.project_id === p.id).length;
        const filesCount = (CHAT_STATE.files || []).filter(f => f.project_id === p.id).length;
        const color = p.color || '#3b82f6';

        html += `
            <li>
                <a class="dropdown-item d-flex align-items-center justify-content-between py-2 px-3 ${isSelected ? 'active' : ''}" 
                   href="javascript:void(0)" onclick="selectTagProject('${p.id}', '${escapeHtml(p.code || p.name)}')">
                    <div class="d-flex align-items-center gap-2 text-truncate me-2">
                        <span class="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style="width: 28px; height: 28px; background: ${color}20; color: ${color}; font-size: 0.85rem;">
                            <i class="bi bi-folder-fill"></i>
                        </span>
                        <div class="text-truncate">
                            <div class="fw-semibold text-dark text-truncate">
                                <span class="badge me-1" style="background: ${color}; font-size: 0.68rem;">${escapeHtml(p.code || 'PROJ')}</span>
                                ${escapeHtml(p.name)}
                            </div>
                            <div class="text-muted" style="font-size: 0.72rem;">
                                ${foldersCount} โฟลเดอร์ • ${filesCount} ไฟล์
                            </div>
                        </div>
                    </div>
                    ${isSelected ? '<i class="bi bi-check2 text-primary fs-5 fw-bold flex-shrink-0"></i>' : ''}
                </a>
            </li>
        `;
    });

    html += `
        <li><hr class="dropdown-divider my-1"></li>
        <li>
            <a class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 text-primary fw-semibold" href="javascript:void(0)" onclick="toggleDrivePane(true)">
                <i class="bi bi-layout-sidebar-reverse fs-5"></i>
                <div class="d-flex flex-column">
                    <span>เปิดลิ้นชักคลังไฟล์ (Project Vault)</span>
                    <span class="text-muted fw-normal" style="font-size: 0.7rem;">ดูโครงสร้างโฟลเดอร์และดาวน์โหลดไฟล์ทั้งหมด</span>
                </div>
            </a>
        </li>
    `;

    menu.innerHTML = html;
}
window.renderHeaderProjectSelector = renderHeaderProjectSelector;

function updateHeaderVaultUI() {
    const nameEl = document.getElementById('header-vault-project-name');
    const iconEl = document.getElementById('header-vault-icon');
    const groupEl = document.getElementById('header-vault-pill-group');
    const countEl = document.getElementById('vault-btn-count');

    const currentProjId = CHAT_STATE.selectedTagProjectId || '';
    const proj = CHAT_STATE.projects.find(p => p.id === currentProjId);

    if (proj) {
        if (nameEl) nameEl.textContent = proj.code || proj.name;
        if (iconEl) {
            iconEl.className = 'bi bi-folder-fill';
            iconEl.style.color = proj.color || '#3b82f6';
        }
        if (groupEl) groupEl.classList.add('has-project');

        if (countEl) {
            const projFolders = (CHAT_STATE.folders || []).filter(f => f.project_id === proj.id);
            const projFiles = (CHAT_STATE.files || []).filter(f => f.project_id === proj.id);
            countEl.textContent = projFolders.length + projFiles.length;
        }
    } else {
        if (nameEl) nameEl.textContent = 'คลังไฟล์';
        if (iconEl) {
            iconEl.className = 'bi bi-folder-fill text-warning';
            iconEl.style.color = '';
        }
        if (groupEl) groupEl.classList.remove('has-project');

        if (countEl) {
            countEl.textContent = (CHAT_STATE.folders || []).length;
        }
    }

    renderHeaderProjectSelector();
}
window.updateHeaderVaultUI = updateHeaderVaultUI;

function showModernToast(msg, duration = 3000) {
    let container = document.getElementById('workchat-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'workchat-toast-container';
        container.style.cssText = 'position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'workchat-floating-toast shadow-lg';
    toast.style.cssText = 'background: rgba(15, 23, 42, 0.92); color: #fff; padding: 8px 16px; border-radius: 9999px; font-size: 0.82rem; font-weight: 600; backdrop-filter: blur(8px); opacity: 0; transform: translateY(10px); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: auto; max-width: 90vw; text-align: center; border: 1px solid rgba(255, 255, 255, 0.15);';
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}
window.showModernToast = showModernToast;

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
    updateHeaderVaultUI();

    if (foldersGrid) {
        if (activeFolders.length === 0) {
            foldersGrid.innerHTML = `<div class="text-muted small py-2 col-span-2">ไม่มีโฟลเดอร์ในระดับนี้</div>`;
        } else {
            foldersGrid.innerHTML = activeFolders.map(f => {
                const subfilesCount = CHAT_STATE.files.filter(file => file.folder_id === f.id).length;
                return `
                    <div class="folder-card" 
                         onclick="navigateToFolder('${f.id}')" 
                         oncontextmenu="openVaultContextMenu(event, 'folder', '${f.id}')" 
                         title="คลิกเพื่อเปิดโฟลเดอร์ (คลิกขวาเพื่อลบ/เปลี่ยนชื่อ)">
                        <i class="bi bi-folder-fill folder-icon"></i>
                        <div style="flex:1; min-width:0;">
                            <div class="folder-name">${escapeHtml(f.name)}</div>
                            <div class="folder-count">${subfilesCount} ไฟล์</div>
                        </div>
                        <button type="button" class="btn btn-sm btn-link text-muted p-1 border-0 folder-more-btn" onclick="openVaultContextMenu(event, 'folder', '${f.id}')" title="ตัวเลือก & ลบโฟลเดอร์">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
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
                    <div class="file-card" oncontextmenu="openVaultContextMenu(event, 'file', '${file.id}')" title="คลิกขวาเพื่อลบ/จัดการไฟล์">
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

    if (CHAT_STATE.realtimeChannel) {
        try {
            CHAT_STATE.realtimeChannel.send({
                type: 'broadcast',
                event: 'new_message',
                payload: newMsg
            });
        } catch (_) {}
    }
    syncWorkchatToCloud();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_messages').insert([newMsg]).catch(() => {});
    }

    dispatchPushNotification(newMsg);

    renderChatsList();
    renderMessages();
    scrollMessagesToBottom();

    if (typeof showToast === 'function') {
        showToast('success', 'แชร์ไฟล์แล้ว', `ส่ง ${file.name} เข้าห้องแชทแล้ว`, 2000);
    }
}

function deleteFile(fileId) {
    const file = CHAT_STATE.files.find(f => f.id === fileId);
    if (!file) return;

    if (!confirm(`คุณต้องการลบไฟล์ "${file.name}" ใช่หรือไม่?`)) return;

    CHAT_STATE.files = CHAT_STATE.files.filter(f => f.id !== fileId);
    saveWorkspaceData();
    syncWorkchatToCloud();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_files').delete().eq('id', fileId).then(() => {});
    }

    renderExplorer();
    updateHeaderVaultUI();
    showModernToast(`🗑️ ลบไฟล์ "${file.name}" เรียบร้อยแล้ว`);
}
window.deleteFile = deleteFile;

function deleteFolder(folderId) {
    const folder = CHAT_STATE.folders.find(f => f.id === folderId);
    if (!folder) return;

    const subfiles = CHAT_STATE.files.filter(f => f.folder_id === folderId);
    const confirmMsg = subfiles.length > 0
        ? `คุณต้องการลบโฟลเดอร์ "${folder.name}" ใช่หรือไม่?\n⚠️ ไฟล์ภายในโฟลเดอร์นี้จำนวน ${subfiles.length} ไฟล์จะถูกลบไปด้วย`
        : `คุณต้องการลบโฟลเดอร์ "${folder.name}" ใช่หรือไม่?`;

    if (!confirm(confirmMsg)) return;

    // Delete subfiles inside this folder
    CHAT_STATE.files = CHAT_STATE.files.filter(f => f.folder_id !== folderId);
    // Delete the folder itself
    CHAT_STATE.folders = CHAT_STATE.folders.filter(f => f.id !== folderId);

    // If active folder is this one, return to root
    if (CHAT_STATE.activeFolderId === folderId) {
        CHAT_STATE.activeFolderId = null;
    }

    saveWorkspaceData();
    syncWorkchatToCloud();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_folders').delete().eq('id', folderId).then(() => {});
        window.supabaseClient.from('workchat_files').delete().eq('folder_id', folderId).then(() => {});
    }

    renderExplorer();
    updateHeaderVaultUI();
    populateStagingFolderDropdown();

    showModernToast(`🗑️ ลบโฟลเดอร์ "${folder.name}" เรียบร้อยแล้ว`);
}
window.deleteFolder = deleteFolder;

function renameFolder(folderId) {
    const folder = CHAT_STATE.folders.find(f => f.id === folderId);
    if (!folder) return;

    const newName = prompt('ระบุชื่อโฟลเดอร์ใหม่:', folder.name);
    if (!newName || !newName.trim() || newName.trim() === folder.name) return;

    folder.name = newName.trim();
    saveWorkspaceData();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_folders').update({ name: folder.name }).eq('id', folderId).then(() => {});
    }

    renderExplorer();
    populateStagingFolderDropdown();
    showModernToast(`✏️ เปลี่ยนชื่อโฟลเดอร์เป็น "${folder.name}" เรียบร้อยแล้ว`);
}
window.renameFolder = renameFolder;

function renameFile(fileId) {
    const file = CHAT_STATE.files.find(f => f.id === fileId);
    if (!file) return;

    const newName = prompt('ระบุชื่อไฟล์ใหม่:', file.name);
    if (!newName || !newName.trim() || newName.trim() === file.name) return;

    file.name = newName.trim();
    saveWorkspaceData();

    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_files').update({ name: file.name }).eq('id', fileId).then(() => {});
    }

    renderExplorer();
    showModernToast(`✏️ เปลี่ยนชื่อไฟล์เป็น "${file.name}" เรียบร้อยแล้ว`);
}
window.renameFile = renameFile;

// ── 8.1 VAULT CUSTOM CONTEXT MENU (RIGHT-CLICK) ──────────────────────────────
function openVaultContextMenu(e, type, id) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const menu = document.getElementById('vault-context-menu');
    if (!menu) return;

    let titleHtml = '';
    let itemsHtml = '';

    if (type === 'folder') {
        const folder = CHAT_STATE.folders.find(f => f.id === id);
        if (!folder) return;

        titleHtml = `<i class="bi bi-folder-fill me-1 text-warning"></i> ${escapeHtml(folder.name)}`;
        itemsHtml = `
            <li class="vault-context-item" onclick="handleContextAction('open-folder', '${id}')">
                <i class="bi bi-folder2-open text-primary"></i> <span>เปิดโฟลเดอร์</span>
            </li>
            <li class="vault-context-item" onclick="handleContextAction('rename-folder', '${id}')">
                <i class="bi bi-pencil text-muted"></i> <span>เปลี่ยนชื่อโฟลเดอร์</span>
            </li>
            <div class="vault-context-divider"></div>
            <li class="vault-context-item danger" onclick="handleContextAction('delete-folder', '${id}')">
                <i class="bi bi-trash3-fill"></i> <span>ลบโฟลเดอร์นี้</span>
            </li>
        `;
    } else if (type === 'file') {
        const file = CHAT_STATE.files.find(f => f.id === id);
        if (!file) return;

        titleHtml = `<i class="bi bi-file-earmark-text-fill me-1 text-primary"></i> ${escapeHtml(file.name)}`;
        itemsHtml = `
            <li class="vault-context-item" onclick="handleContextAction('preview-file', '${id}')">
                <i class="bi bi-eye text-primary"></i> <span>ดูตัวอย่างไฟล์</span>
            </li>
            <li class="vault-context-item" onclick="handleContextAction('share-file', '${id}')">
                <i class="bi bi-chat-dots-fill text-info"></i> <span>ส่งเข้าห้องแชท</span>
            </li>
            <a href="${file.file_url}" download="${escapeHtml(file.name)}" class="vault-context-item" onclick="closeVaultContextMenu()">
                <i class="bi bi-download text-success"></i> <span>ดาวน์โหลดไฟล์</span>
            </a>
            <li class="vault-context-item" onclick="handleContextAction('rename-file', '${id}')">
                <i class="bi bi-pencil text-muted"></i> <span>เปลี่ยนชื่อไฟล์</span>
            </li>
            <div class="vault-context-divider"></div>
            <li class="vault-context-item danger" onclick="handleContextAction('delete-file', '${id}')">
                <i class="bi bi-trash3-fill"></i> <span>ลบไฟล์นี้</span>
            </li>
        `;
    }

    const titleEl = document.getElementById('vault-context-title');
    const itemsEl = document.getElementById('vault-context-items');
    if (titleEl) titleEl.innerHTML = titleHtml;
    if (itemsEl) itemsEl.innerHTML = itemsHtml;

    menu.classList.remove('d-none');

    // Positioning
    const menuWidth = 220;
    const menuHeight = 180;
    let posX = (e && typeof e.clientX === 'number') ? e.clientX : window.innerWidth / 2;
    let posY = (e && typeof e.clientY === 'number') ? e.clientY : window.innerHeight / 2;

    if (posX + menuWidth > window.innerWidth) {
        posX = window.innerWidth - menuWidth - 12;
    }
    if (posY + menuHeight > window.innerHeight) {
        posY = window.innerHeight - menuHeight - 12;
    }

    menu.style.left = `${Math.max(10, posX)}px`;
    menu.style.top = `${Math.max(10, posY)}px`;
}
window.openVaultContextMenu = openVaultContextMenu;

function closeVaultContextMenu() {
    const menu = document.getElementById('vault-context-menu');
    if (menu) menu.classList.add('d-none');
}
window.closeVaultContextMenu = closeVaultContextMenu;

function handleContextAction(action, id) {
    closeVaultContextMenu();
    if (action === 'open-folder') {
        navigateToFolder(id);
    } else if (action === 'rename-folder') {
        renameFolder(id);
    } else if (action === 'delete-folder') {
        deleteFolder(id);
    } else if (action === 'preview-file') {
        previewFile(id);
    } else if (action === 'share-file') {
        shareFileToChat(id);
    } else if (action === 'rename-file') {
        renameFile(id);
    } else if (action === 'delete-file') {
        deleteFile(id);
    }
}
window.handleContextAction = handleContextAction;

// Global listener for closing context menu
document.addEventListener('click', (e) => {
    if (!e.target.closest('#vault-context-menu') && !e.target.closest('.folder-more-btn')) {
        closeVaultContextMenu();
    }
});
document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.folder-card') && !e.target.closest('.file-card')) {
        closeVaultContextMenu();
    }
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVaultContextMenu();
});

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

    // On mobile, switching tabs always returns from inner chat room to list view
    if (tabName !== 'vault' && window.innerWidth <= 768) {
        switchMobileView('list');
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
