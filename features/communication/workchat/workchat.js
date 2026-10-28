/**
 * S-GYVER WORKCHAT & PROJECT FILE VAULT (VIP Lv.3)
 * Real-time Team Chat with Nested Project Folders & File Hub
 */

// ── 1. GLOBAL STATE & DEFAULT DATA ──────────────────────────────────────────
const CHAT_STATE = {
    currentUser: {
        username: 'user_' + Math.floor(1000 + Math.random() * 9000),
        displayName: 'สมาชิก Gyver',
        avatar: '👨‍💻'
    },
    activeProjectId: 'all', // 'all' or specific project id
    activeFolderId: null,   // null (root) or specific folder id
    selectedTagProjectId: '',
    stagedAttachment: null, // { file, name, size, type, dataUrl }

    projects: [],
    folders: [],
    files: [],
    messages: [],

    activePreviewFile: null,
    mobileView: 'chat', // 'chat' | 'drive'
    realtimeChannel: null
};

const DEFAULT_AVATARS = ['👨‍💻', '🛠️', '🎨', '📋', '🚀', '🤖', '⭐', '👩‍💼', '💡', '📦'];

// Starter Mock Data for Instant Demonstration
const DEFAULT_PROJECTS = [
    {
        id: 'proj_pim_2026',
        name: 'โปรเจกต์ A - นิทรรศการ 10 ปีสาธิต PIM',
        code: 'PIM-2026',
        color: '#06b6d4',
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
        sender_username: 'เอส (Admin)',
        sender_name: 'เอส (Admin)',
        avatar: '👨‍💻',
        message_text: 'สวัสดีทีมงานทุกคนครับ! วันนี้เราเริ่มคุยเรื่อง "โปรเจกต์ A - นิทรรศการ PIM" นะครับ ผมสร้างโฟลเดอร์เก็บแบบ 3D และใบเสนอราคาไว้ในคลังไฟล์ฝั่งขวาแล้ว เข้าไปดูได้เลย',
        project_id: 'proj_pim_2026',
        folder_id: 'fld_pim_drawings',
        file_data: null,
        created_at: new Date(Date.now() - 72000000).toISOString()
    },
    {
        id: 'msg_2',
        sender_username: 'น้องมุก (ดีไซน์)',
        sender_name: 'น้องมุก (ดีไซน์)',
        avatar: '🎨',
        message_text: 'รับทราบค่ะพี่เอส หนูกำลังขึ้นรูปขาตั้งไม้ทดสอบหน้างาน เดี๋ยวถ่ายรูปส่งเข้าโฟลเดอร์รูปภาพให้นะคะ',
        project_id: 'proj_pim_2026',
        folder_id: null,
        file_data: null,
        created_at: new Date(Date.now() - 54000000).toISOString()
    },
    {
        id: 'msg_3',
        sender_username: 'ช่างเอก',
        sender_name: 'ช่างเอก',
        avatar: '🛠️',
        message_text: 'ส่งรูปชิ้นงานจริงเข้าไปในโฟลเดอร์รูปหน้างานแล้วครับ กดดูจากในแชทนี้ได้เลยครับผม',
        project_id: 'proj_pim_2026',
        folder_id: 'fld_pim_photos',
        file_data: {
            name: 'ตัวอย่างขาตั้งไม้ประกอบจริง.png',
            url: 'sample_items/farm_stand.png',
            type: 'image',
            size: '1.1 MB'
        },
        created_at: new Date(Date.now() - 36000000).toISOString()
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
    renderMessages();

    // Auto-scroll messages to bottom
    scrollMessagesToBottom();
});

async function syncUserProfileFromGyver() {
    let syncedName = '';
    let syncedAvatar = '';
    let syncedUsername = '';
    let userLevel = 1;
    let userRole = 'user';
    let isLoggedIn = false;

    // Step 1: Immediate sync from Parent Window DOM (when running in Workspace iframe)
    try {
        if (window.parent && window.parent !== window) {
            const pNameEl = window.parent.document.getElementById('nav-user-name');
            const pAvatarEl = window.parent.document.getElementById('nav-user-avatar');
            if (pNameEl && pNameEl.innerText && pNameEl.innerText.trim() && pNameEl.innerText.trim() !== 'User') {
                syncedName = pNameEl.innerText.trim();
                syncedUsername = syncedName.toLowerCase().replace(/\s+/g, '_');
                isLoggedIn = true;
            }
            if (pAvatarEl && pAvatarEl.src && !pAvatarEl.src.includes('149071.png')) {
                syncedAvatar = pAvatarEl.src;
            }

            // Sync level from parent window if available
            if (window.parent.currentUserRole === 'admin') {
                userRole = 'admin';
                userLevel = 5;
                isLoggedIn = true;
            } else if (typeof window.parent.currentUserLevel === 'number') {
                userLevel = window.parent.currentUserLevel;
                isLoggedIn = true;
            }
        }
    } catch (e) {
        console.warn('[WorkChat] Parent frame access notice:', e);
    }

    // Check localStorage admin session
    try {
        if (sessionStorage.getItem('gyver_admin_session') || localStorage.getItem('gyver_admin_session')) {
            userRole = 'admin';
            userLevel = 5;
            isLoggedIn = true;
        }
    } catch (_) {}

    // Step 2: Fallback to localStorage cache
    try {
        const saved = localStorage.getItem('gyver_workchat_user');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!syncedName && parsed.displayName) syncedName = parsed.displayName;
            if (!syncedAvatar && parsed.avatar) syncedAvatar = parsed.avatar;
            if (!syncedUsername && parsed.username) syncedUsername = parsed.username;
            if (parsed.level !== undefined && userLevel === 1) userLevel = parsed.level;
        }
    } catch (_) {}

    // Apply immediate data
    if (syncedName) {
        CHAT_STATE.currentUser.displayName = syncedName;
        CHAT_STATE.currentUser.username = syncedUsername || syncedName.toLowerCase().replace(/\s+/g, '_');
    }
    if (syncedAvatar) {
        CHAT_STATE.currentUser.avatar = syncedAvatar;
    }
    updateUserUI();

    // Step 3: Deep sync from Supabase Auth & profiles table (covers standalone PWA and cloud refresh)
    try {
        const client = window.supabaseClient || (window.parent && window.parent.supabaseClient);
        if (client && client.auth) {
            const { data: { session } } = await client.auth.getSession();
            if (session && session.user) {
                isLoggedIn = true;
                const u = session.user;
                const meta = u.user_metadata || {};
                let dbName = meta.nickname || meta.username || meta.first_name || u.email?.split('@')[0];
                let dbAvatar = meta.avatar_url;

                try {
                    const { data: prof, error } = await client
                        .from('profiles')
                        .select('username, nickname, first_name, last_name, avatar_url, role, level')
                        .eq('id', u.id)
                        .maybeSingle();

                    if (prof && !error) {
                        if (prof.nickname && prof.nickname.trim()) dbName = prof.nickname.trim();
                        else if (prof.first_name && prof.first_name.trim()) dbName = prof.first_name.trim();
                        else if (prof.username && prof.username.trim()) dbName = prof.username.trim();

                        if (prof.avatar_url) dbAvatar = prof.avatar_url;

                        if (prof.role === 'admin' || (prof.username && prof.username.toLowerCase() === 'admin')) {
                            userRole = 'admin';
                            userLevel = 5;
                        } else if (prof.level !== undefined && prof.level !== null) {
                            userLevel = Number(prof.level);
                        }
                    }
                } catch (pe) {
                    console.warn('[WorkChat] Profile table fetch:', pe);
                }

                if (dbName) {
                    CHAT_STATE.currentUser.displayName = dbName;
                    CHAT_STATE.currentUser.username = (meta.username || dbName).toLowerCase().replace(/\s+/g, '_');
                }
                if (dbAvatar) {
                    CHAT_STATE.currentUser.avatar = dbAvatar;
                }
                CHAT_STATE.currentUser.level = userLevel;
                CHAT_STATE.currentUser.role = userRole;

                try {
                    localStorage.setItem('gyver_workchat_user', JSON.stringify(CHAT_STATE.currentUser));
                } catch (_) {}

                updateUserUI();
                renderMessages();
            }
        }
    } catch (se) {
        console.warn('[WorkChat] Supabase session sync:', se);
    }

    // 🛡️ Step 4: Access Control Gate (Requires VIP Lv.4 or Admin Lv.5)
    enforceWorkChatAccessControl(userLevel, userRole, isLoggedIn);
}

function enforceWorkChatAccessControl(level, role, isLoggedIn) {
    const guardEl = document.getElementById('workchat-permission-guard');
    if (!guardEl) return;

    // Admin or Level >= 4 has full access
    if (role === 'admin' || level >= 4) {
        guardEl.classList.add('d-none');
        return;
    }

    // Access Denied: Show Guard Overlay
    guardEl.classList.remove('d-none');
    const nameEl = document.getElementById('guard-current-user-name');
    const badgeEl = document.getElementById('guard-current-level-badge');

    if (nameEl) {
        nameEl.textContent = CHAT_STATE.currentUser.displayName || 'ผู้ใช้งานทั่วไป';
    }
    if (badgeEl) {
        if (!isLoggedIn) {
            badgeEl.className = 'badge bg-secondary font-mono';
            badgeEl.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
        } else {
            const levelLabels = {
                0: 'Lv.0 Guest',
                1: 'Lv.1 Standard',
                2: 'Lv.2 VIP Pro',
                3: 'Lv.3 Business'
            };
            badgeEl.className = 'badge bg-warning text-dark font-mono';
            badgeEl.textContent = levelLabels[level] || `Lv.${level}`;
        }
    }
}

function renderAvatarDisplay(avatar) {
    if (!avatar) return '👤';
    if (typeof avatar === 'string' && (avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://'))) {
        return `<img src="${avatar}" alt="Avatar" class="avatar-img-fit">`;
    }
    return avatar;
}

function updateUserUI() {
    const u = CHAT_STATE.currentUser;
    const nameEl = document.getElementById('topbar-username');
    const avatarEl = document.getElementById('topbar-avatar');
    if (nameEl) nameEl.textContent = u.displayName || u.username;
    if (avatarEl) {
        avatarEl.innerHTML = renderAvatarDisplay(u.avatar || '👨‍💻');
    }
}

function handleUserProfileClick() {
    const u = CHAT_STATE.currentUser;
    const nameEl = document.getElementById('modal-card-name');
    const avatarEl = document.getElementById('modal-card-avatar');
    if (nameEl) nameEl.textContent = u.displayName || u.username;
    if (avatarEl) avatarEl.innerHTML = renderAvatarDisplay(u.avatar || '👨‍💻');

    const modalEl = document.getElementById('modalUserProfileCard');
    if (modalEl) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
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
    } catch (e) {
        console.warn('Storage read error, using defaults:', e);
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
        // Fetch Cloud Projects
        const { data: dbProjects } = await window.supabaseClient.from('workchat_projects').select('*').order('created_at', { ascending: false });
        if (dbProjects && dbProjects.length > 0) {
            CHAT_STATE.projects = dbProjects;
        }

        // Fetch Cloud Folders
        const { data: dbFolders } = await window.supabaseClient.from('workchat_folders').select('*').order('created_at', { ascending: true });
        if (dbFolders && dbFolders.length > 0) {
            CHAT_STATE.folders = dbFolders;
        }

        // Fetch Cloud Files
        const { data: dbFiles } = await window.supabaseClient.from('workchat_files').select('*').order('created_at', { ascending: false });
        if (dbFiles && dbFiles.length > 0) {
            CHAT_STATE.files = dbFiles;
        }

        // Fetch Cloud Messages
        const { data: dbMessages } = await window.supabaseClient.from('workchat_messages').select('*').order('created_at', { ascending: true }).limit(100);
        if (dbMessages && dbMessages.length > 0) {
            CHAT_STATE.messages = dbMessages;
        }

        saveWorkspaceData();
        renderProjectDropdownList();
        renderProjectPills();
        renderExplorer();
        renderMessages();
        scrollMessagesToBottom();

        // Subscribe to Realtime Messages
        CHAT_STATE.realtimeChannel = window.supabaseClient.channel('workchat_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workchat_messages' }, payload => {
                if (payload.new && !CHAT_STATE.messages.find(m => m.id === payload.new.id)) {
                    CHAT_STATE.messages.push(payload.new);
                    saveWorkspaceData();
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
        console.warn('Supabase Realtime not configured yet, running in instant local mode:', err);
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

// ── 4. CHAT MESSAGING ENGINE ────────────────────────────────────────────────
function renderMessages() {
    const container = document.getElementById('messages-stream');
    if (!container) return;

    if (CHAT_STATE.messages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-chat-dots fs-1 d-block mb-2 text-cyan opacity-50"></i>
                <div class="fw-bold">ยังไม่มีข้อความ</div>
                <div class="small">พิมพ์ข้อความแรกเพื่อเริ่มคุยงานกับทีมของคุณได้เลยครับ</div>
            </div>
        `;
        return;
    }

    container.innerHTML = CHAT_STATE.messages.map(msg => {
        const isMe = (msg.sender_username === CHAT_STATE.currentUser.username || msg.sender_name === CHAT_STATE.currentUser.displayName);
        const timeStr = formatMessageTime(msg.created_at);
        const project = CHAT_STATE.projects.find(p => p.id === msg.project_id);

        let attachedHtml = '';
        if (msg.file_data) {
            const f = msg.file_data;
            const isImg = f.type && (f.type.startsWith('image/') || f.type === 'image');
            attachedHtml = `
                <div class="msg-attached-card">
                    <div class="msg-attached-thumb" onclick="previewFileDirectly('${escapeHtml(f.name)}', '${escapeHtml(f.url)}')">
                        ${isImg ? `<img src="${f.url}" class="w-100 h-100 rounded object-fit-cover" alt="thumb">` : `<i class="bi bi-file-earmark-arrow-down-fill"></i>`}
                    </div>
                    <div class="msg-attached-info">
                        <div class="msg-attached-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
                        <div class="msg-attached-meta">${f.size || 'ไฟล์แนบ'} ${project ? `• โฟลเดอร์ ${escapeHtml(project.name)}` : ''}</div>
                    </div>
                    <a href="${f.url}" download="${escapeHtml(f.name)}" class="btn btn-sm btn-outline-light py-0 px-2" title="ดาวน์โหลด">
                        <i class="bi bi-download"></i>
                    </a>
                </div>
            `;
        }

        return `
            <div class="msg-group ${isMe ? 'my-msg' : 'other-msg'}">
                <div class="msg-avatar" style="${isMe ? 'background: linear-gradient(135deg, #0891b2, #0284c7);' : ''}">
                    ${renderAvatarDisplay(msg.avatar)}
                </div>
                <div class="msg-body-wrapper">
                    ${!isMe ? `<div class="msg-sender-info"><strong>${escapeHtml(msg.sender_name)}</strong> <span>${timeStr}</span></div>` : ''}
                    
                    <div class="msg-bubble">
                        ${project ? `
                            <div class="msg-project-tag" style="border-left: 3px solid ${project.color || '#06b6d4'};" onclick="selectProjectFilter('${project.id}')" title="คลิกเพื่อเปิดดูไฟล์โปรเจกต์นี้">
                                <i class="bi bi-folder-fill" style="color: ${project.color || '#06b6d4'};"></i>
                                <span>${escapeHtml(project.code || project.name)}</span>
                            </div>
                        ` : ''}
                        
                        <div>${escapeHtml(msg.message_text)}</div>
                        ${attachedHtml}
                    </div>

                    ${isMe ? `<div class="msg-time-status"><span>${timeStr}</span> <i class="bi bi-check2-all text-cyan"></i></div>` : ''}
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
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
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
                thumbWrap.innerHTML = `<i class="bi bi-file-earmark-arrow-up fs-3 text-cyan"></i>`;
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

    // Process attachment if staged
    if (hasAttachment) {
        const att = CHAT_STATE.stagedAttachment;
        const select = document.getElementById('staging-folder-select');
        if (select && select.value) {
            const parts = select.value.split(':');
            targetProjectId = parts[0];
            targetFolderId = (parts[1] !== 'root') ? parts[1] : null;
        }

        // Save file record to Project Drive
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

        // Upload to Supabase if connected
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
        avatar: u.avatar || '👨‍💻',
        message_text: text,
        project_id: targetProjectId,
        folder_id: targetFolderId,
        file_data: fileData,
        created_at: new Date().toISOString()
    };

    // Add locally immediately
    CHAT_STATE.messages.push(newMsg);
    saveWorkspaceData();

    // Reset input
    input.value = '';
    input.style.height = 'auto';

    renderMessages();
    scrollMessagesToBottom();

    // Sync to Supabase Cloud
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('workchat_messages').insert([newMsg]);
        } catch (err) {
            console.warn('Message send to cloud error:', err);
        }
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

// ── 5. PROJECT DRIVE & FOLDER EXPLORER ───────────────────────────────────────
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
                    <span class="pill-color-dot d-inline-block me-1" style="background: ${p.color || '#06b6d4'};"></span>
                    ${escapeHtml(p.name)}
                </a>
            </li>
        `;
    });

    list.innerHTML = html;
}

function selectTagProject(projId, label) {
    CHAT_STATE.selectedTagProjectId = projId;
    const labelEl = document.getElementById('tag-project-label');
    if (labelEl) labelEl.textContent = label;
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
                <span class="pill-color-dot" style="background: ${p.color || '#06b6d4'};"></span>
                <span>${escapeHtml(p.code || p.name)}</span>
            </button>
        `;
    });

    container.innerHTML = html;
}

function selectProjectFilter(projId) {
    CHAT_STATE.activeProjectId = projId;
    CHAT_STATE.activeFolderId = null; // Reset to root of selected project
    renderProjectPills();
    renderExplorer();

    // Open drive view to inspect
    if (window.innerWidth <= 992) {
        switchMobileView('drive');
    } else {
        toggleDrivePane(true);
    }
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

    // 1. Filter Folders for current scope
    let activeFolders = CHAT_STATE.folders.filter(f => {
        if (CHAT_STATE.activeProjectId !== 'all' && f.project_id !== CHAT_STATE.activeProjectId) {
            return false;
        }
        return f.parent_id === CHAT_STATE.activeFolderId;
    });

    // 2. Filter Files for current scope
    let activeFiles = CHAT_STATE.files.filter(f => {
        if (CHAT_STATE.activeProjectId !== 'all' && f.project_id !== CHAT_STATE.activeProjectId) {
            return false;
        }
        return f.folder_id === CHAT_STATE.activeFolderId;
    });

    if (foldersCountEl) foldersCountEl.textContent = activeFolders.length;
    if (filesCountEl) filesCountEl.textContent = activeFiles.length;
    if (vaultBtnCount) vaultBtnCount.textContent = (CHAT_STATE.folders || []).length;

    // Render Folders
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

    // Render Files
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
                                <i class="bi ${getFileTypeIcon(file.name)} fs-1 text-cyan opacity-75"></i>
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
            <i class="bi bi-house-door-fill text-cyan"></i> หน้าแรก
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
        default: return 'bi-file-earmark-text-fill text-cyan';
    }
}

// ── 6. CREATE PROJECTS, FOLDERS & DIRECT UPLOADS ─────────────────────────────
let selectedProjectColorHex = '#06b6d4';

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

    // Sync to Supabase
    if (window.supabaseClient) {
        window.supabaseClient.from('workchat_projects').insert([newProj]).then(() => {});
    }

    // Automatically select the new project
    CHAT_STATE.activeProjectId = newProj.id;
    CHAT_STATE.activeFolderId = null;

    renderProjectDropdownList();
    renderProjectPills();
    renderExplorer();

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

// Drag & Drop File Handling
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

// ── 7. FILE PREVIEWS & SHARING TO CHAT ───────────────────────────────────────
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
                <div class="p-5 text-white">
                    <i class="bi ${getFileTypeIcon(filename)} fs-1 text-cyan mb-3 d-block"></i>
                    <h5>${escapeHtml(filename)}</h5>
                    <p class="text-muted small">ไฟล์นี้รองรับการดาวน์โหลดเพื่อเปิดด้วยโปรแกรมในเครื่องของคุณ</p>
                    <a href="${url}" download="${escapeHtml(filename)}" class="btn btn-primary mt-2">
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
        avatar: u.avatar || '👨‍💻',
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

    renderMessages();
    scrollMessagesToBottom();

    if (window.innerWidth <= 992) {
        switchMobileView('chat');
    }

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

// ── 8. MOBILE VIEWPORT SWITCHER ─────────────────────────────────────────────
function switchMobileView(viewName) {
    CHAT_STATE.mobileView = viewName;

    const btnChat = document.getElementById('tab-mobile-chat');
    const btnDrive = document.getElementById('tab-mobile-drive');

    if (viewName === 'drive') {
        document.body.classList.add('view-drive');
        if (btnChat) btnChat.classList.remove('active');
        if (btnDrive) btnDrive.classList.add('active');
    } else {
        document.body.classList.remove('view-drive');
        if (btnChat) btnChat.classList.add('active');
        if (btnDrive) btnDrive.classList.remove('active');
    }
}

// ── 8.1 TOGGLE PROJECT FILE VAULT DRAWER (SLIDE-OUT DRAWER) ────────────────
function toggleDrivePane(forceState) {
    const container = document.getElementById('chat-main-container') || document.querySelector('.chat-main-container');
    const btnToggle = document.getElementById('btn-toggle-drive-panel');
    const sideTab = document.getElementById('drive-side-tab');
    if (!container) return;

    // Mobile viewport delegation
    if (window.innerWidth <= 992) {
        if (forceState === false) {
            switchMobileView('chat');
        } else if (forceState === true) {
            switchMobileView('drive');
        } else {
            const isCurrentlyDrive = document.body.classList.contains('view-drive');
            switchMobileView(isCurrentlyDrive ? 'chat' : 'drive');
        }
        return;
    }

    const isOpen = (typeof forceState === 'boolean') ? forceState : !container.classList.contains('drive-open');

    if (isOpen) {
        container.classList.add('drive-open');
        if (btnToggle) btnToggle.classList.add('active');
        if (sideTab) sideTab.style.display = 'none';
        renderExplorer();
    } else {
        container.classList.remove('drive-open');
        if (btnToggle) btnToggle.classList.remove('active');
        if (sideTab) sideTab.style.display = 'flex';
    }
}
window.toggleDrivePane = toggleDrivePane;

// Keyboard shortcut: Esc to close Project Vault drawer
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const container = document.getElementById('chat-main-container') || document.querySelector('.chat-main-container');
        if (container && container.classList.contains('drive-open')) {
            toggleDrivePane(false);
        }
    }
});

// ── 9. HELPERS ──────────────────────────────────────────────────────────────
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

// ── 10. PWA INSTALLATION ENGINE ───────────────────────────────────────────
let deferredPwaPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const btn = document.getElementById('btn-pwa-install-workchat');
    if (btn) {
        btn.classList.remove('btn-outline-info');
        btn.classList.add('btn-info', 'text-dark', 'fw-bold');
    }
});

window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
    if (typeof showToast === 'function') {
        showToast('success', 'ติดตั้งสำเร็จ!', 'WorkChat ถูกติดตั้งลงหน้าจอมือถือของคุณแล้ว', 3000);
    }
});

function triggerWorkChatPwaInstall() {
    // If native prompt is available (Chrome/Android), trigger it directly!
    if (deferredPwaPrompt) {
        executeNativeInstallPrompt();
        return;
    }

    // Otherwise show the guided modal with QR code & platform instructions
    const currentUrl = window.location.href.split('#')[0];
    const qrImg = document.getElementById('pwa-install-qrcode');
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`;
    }

    const modalEl = document.getElementById('modalPwaInstallGuide');
    if (modalEl) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
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

