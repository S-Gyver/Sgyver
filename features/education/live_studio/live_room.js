/* ================================================================
   🎙️ GYVER LIVE STUDIO — live_room.js
   Active Room & Permanent Archive Session (Supabase DB + Cloudinary)
   ================================================================ */
'use strict';

// ── CLOUDINARY CONFIG ──────────────────────────────────────────
const CLOUDINARY = {
    cloudName:    'xn7rvu6g',
    uploadPreset: 'gyver_live',
};

// ── STATE ──────────────────────────────────────────────────────
const STATE = {
    myId:          'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    myName:        '',
    myRole:        'student',   // 'host' | 'student'
    roomPin:       '',
    roomTitle:     '',
    roomStatus:    'LIVE',      // 'LIVE' | 'ENDED'
    isHost:        false,
    isLocked:      false,
    joined:        false,
    sessionStart:  null,

    // Media
    micOn:         false,
    camOn:         false,
    screenOn:      false,

    // Participants Map  {name -> {name, role, micOn, camOn, speaking, pc, stream}}
    participants:  new Map(),

    // Supabase
    channel:       null,
    dbSubscription: null,

    // WebRTC & Screen Sharing (Discord-style multi-sharing)
    localStream:   null,
    screenStream:  null,
    peerConnections: new Map(), // name -> RTCPeerConnection
    activeScreenSharers:  new Map(), // name -> { name, role, isSelf, stream }
    currentViewingSharer: null,      // name of user whose screen is being viewed
    remoteScreenStreams:  new Map(), // name -> MediaStream

    // Persistent items
    chatMessages:  [],
    sharedFiles:   [],
    renderedMessageSignatures: new Set(),
    renderedFileSignatures:    new Set(),

    // Timers
    clockInterval: null,
};

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

// ── DOM HELPERS ────────────────────────────────────────────────
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
function el(id)  { return document.getElementById(id); }

// ── AUTH CHECK & USER-SCOPED STORAGE ───────────────────────────
let currentAuthUser = null;
let currentUserId   = null;
let currentUserName = '';

async function initAuthUser() {
    if (window.supabaseClient && window.supabaseClient.auth) {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session?.user) {
                currentAuthUser = session.user;
                currentUserId   = session.user.id;
                currentUserName = session.user.user_metadata?.nickname 
                    || session.user.user_metadata?.username 
                    || session.user.email?.split('@')[0] || '';

                // Also check profiles table if nickname was not set in metadata
                try {
                    const { data: prof } = await window.supabaseClient
                        .from('profiles')
                        .select('nickname, username')
                        .eq('id', session.user.id)
                        .maybeSingle();
                    if (prof && (prof.nickname || prof.username)) {
                        currentUserName = prof.nickname || prof.username;
                    }
                } catch (_) {}
            }
        } catch (e) {
            console.warn('[Live Room Auth check]', e);
        }
    }
}

function getStorageKey() {
    return currentUserId ? `gyver_live_host_rooms_${currentUserId}` : 'gyver_live_host_rooms';
}

// ── LOCAL STORAGE HELPERS ──────────────────────────────────────
function getStoredHostRooms() {
    try {
        return JSON.parse(localStorage.getItem(getStorageKey()) || '{}');
    } catch {
        return {};
    }
}

function saveHostRoom(pin, secret) {
    const rooms = getStoredHostRooms();
    rooms[pin] = secret || 'host';
    localStorage.setItem(getStorageKey(), JSON.stringify(rooms));
}

// ── INITIALIZATION ON PAGE LOAD ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Read URL query params & location.hash
    const params = new URLSearchParams(window.location.search);
    let pinParam = (params.get('pin') || '').trim().toUpperCase();
    let nameParam = (params.get('name') || '').trim();
    let roleParam = (params.get('role') || '').trim().toLowerCase();

    // Check hash fallback (particularly helpful on file:// protocol)
    if ((!pinParam || !nameParam) && window.location.hash) {
        try {
            const hParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            if (!pinParam) pinParam = (hParams.get('pin') || hParams.get('live_pin') || '').trim().toUpperCase();
            if (!nameParam) nameParam = (hParams.get('name') || '').trim();
            if (!roleParam) roleParam = (hParams.get('role') || '').trim().toLowerCase();
        } catch (_) {}
    }

    // 2. Check saved session (e.g. user refreshed the page while in room)
    let savedSession = null;
    try {
        const raw = sessionStorage.getItem('gyver_active_live_room') || localStorage.getItem('gyver_active_live_room');
        if (raw) savedSession = JSON.parse(raw);
    } catch (e) {}

    if (savedSession && savedSession.pin) {
        if (!pinParam || pinParam === savedSession.pin) {
            pinParam = savedSession.pin;
            if (!nameParam && savedSession.name) nameParam = savedSession.name;
            if (!roleParam && savedSession.role) roleParam = savedSession.role;
        }
    }

    if (pinParam) {
        el('input-pin').value = pinParam;
        el('input-pin').readOnly = true;
        el('input-pin').style.background = 'rgba(255,255,255,0.05)';
    }

    // 3. Kick off auth check asynchronously
    const authPromise = initAuthUser();

    // Auto-enter IF both PIN and NAME are known (from URL, active session, or local storage)
    let effectiveName = nameParam || localStorage.getItem('gyver_user_name');
    if (!effectiveName) {
        await authPromise;
        effectiveName = currentUserName || localStorage.getItem('gyver_user_name');
    }

    if (pinParam && effectiveName) {
        if (roleParam === 'host') {
            selectRole('host');
        } else {
            selectRole('student');
        }
        el('input-name').value = effectiveName;
        enterStudio();
        return;
    }

    // Await auth before showing Join Screen
    await authPromise;

    // Otherwise show Join Screen
    el('join-screen').style.display = 'flex';
    el('studio-app').style.display  = 'none';

    // Set role
    if (roleParam === 'host') {
        selectRole('host');
    } else {
        selectRole('student');
    }

    // 🎯 2 cases for join screen name:
    // 1. Logged in / Registered -> Automatically pre-fill with username
    // 2. Not logged in / Guest -> Leave blank for manual typing
    if (currentUserName) {
        el('input-name').value = currentUserName;
    } else {
        el('input-name').value = '';
        el('input-name').placeholder = 'กรุณาระบุชื่อของคุณ (เช่น น้องพิมพ์, โบ๊ท)';
    }

    syncJoinBtn();

    setTimeout(() => {
        const nameInput = el('input-name');
        if (nameInput) nameInput.focus();
    }, 150);
});

// ── JOIN SCREEN LOGIC ──────────────────────────────────────────
function selectRole(role) {
    STATE.myRole = role;
    STATE.isHost = (role === 'host');
    el('role-host').classList.toggle('active', role === 'host');
    el('role-student').classList.toggle('active', role === 'student');
    syncJoinBtn();
}

function syncJoinBtn() {
    const pin  = el('input-pin').value.trim();
    const name = el('input-name').value.trim();
    el('join-btn').disabled = !(pin && name);
}

function syncSendBtn() {
    const hasText = el('chat-input').value.trim().length > 0;
    el('chat-send-btn').classList.toggle('ready', hasText);
}

// ── ENTER STUDIO ───────────────────────────────────────────────
async function enterStudio() {
    const pinEl  = el('input-pin');
    const nameEl = el('input-name');
    const pin  = pinEl ? pinEl.value.trim().toUpperCase() : '';
    const name = nameEl ? nameEl.value.trim() : '';

    if (!pin) {
        showToast('warning', 'ระบุ PIN', 'กรุณากรอกรหัส PIN ห้องเรียน', 2500);
        if (pinEl) pinEl.focus();
        return;
    }
    if (!name) {
        showToast('error', 'จำเป็นต้องระบุชื่อ', 'กรุณากรอกชื่อของคุณก่อนเข้าร่วมห้องเรียน (ห้ามเว้นว่างเด็ดขาด)', 3500);
        if (nameEl) {
            nameEl.classList.add('input-error-shake');
            nameEl.focus();
            setTimeout(() => nameEl.classList.remove('input-error-shake'), 800);
        }
        return;
    }

    localStorage.setItem('gyver_user_name', name);

    // Save active room session so browser refresh stays in room
    const sessionData = { pin, name, role: STATE.myRole };
    sessionStorage.setItem('gyver_active_live_room', JSON.stringify(sessionData));
    localStorage.setItem('gyver_active_live_room', JSON.stringify(sessionData));

    // Notify parent workspace (my_workspace.html) to keep URL and session in sync
    try {
        window.parent.postMessage({
            action: 'updateLiveRoomState',
            pin,
            name,
            role: STATE.myRole
        }, '*');
    } catch (e) {}

    // Update query params in current window without reloading
    try {
        const roomQuery = `?pin=${encodeURIComponent(pin)}&name=${encodeURIComponent(name)}&role=${encodeURIComponent(STATE.myRole)}`;
        history.replaceState(null, '', `live_room.html${roomQuery}`);
    } catch (e) {}

    STATE.myName    = name;
    STATE.roomPin   = pin;
    STATE.roomTitle = `ห้องเรียน ${pin}`;
    STATE.sessionStart = Date.now();
    STATE.joined = true;

    // 1. Switch screens immediately so user is never stuck
    el('join-screen').style.display = 'none';
    el('studio-app').style.display  = 'flex';

    // 2. Update UI Identifiers immediately
    el('sb-room-name').textContent     = STATE.roomTitle;
    el('sb-pin-badge').textContent     = `📋 ${pin}`;
    el('stage-room-title').textContent = STATE.roomTitle;
    el('up-name').textContent           = name;
    el('up-role').textContent           = STATE.isHost ? '👩‍🏫 ครูผู้สอน' : '🎓 นักเรียน';
    if (el('self-tile-name')) el('self-tile-name').textContent = `${name} (คุณ)`;

    const avatarSeed = encodeURIComponent(name);
    const avatarUrl  = `https://api.dicebear.com/8.x/thumbs/svg?seed=${avatarSeed}`;
    if (el('self-avatar-img')) el('self-avatar-img').src = avatarUrl;
    el('up-avatar').src       = avatarUrl;

    if (STATE.isHost) {
        el('btn-lock-room').style.display = '';
        el('btn-end-session').style.display = '';
        el('btn-delete-room').style.display = '';
        el('btn-delete-archived').style.display = '';
        el('ctrl-end-label').textContent  = 'จบ/ออก';
    } else {
        el('btn-lock-room').style.display = 'none';
        el('btn-end-session').style.display = 'none';
        el('btn-delete-room').style.display = 'none';
        el('btn-delete-archived').style.display = 'none';
        el('ctrl-end-label').textContent  = 'ออก';
    }
    // Both Host and Student have access to Screen Sharing:
    if (el('ctrl-screen')) el('ctrl-screen').style.display = '';

    startClock();
    addParticipant({ id: STATE.myId, name, role: STATE.myRole, micOn: false, camOn: false, speaking: false });

    // Load persistent history immediately (instant rendering from localStorage)
    loadLocalHistory(pin);
    setupChatPasteHandler();

    // Setup Realtime signaling & WebRTC immediately
    setupRealtimeChannel(pin);

    // 3. Background DB sync (non-blocking)
    (async () => {
        if (!window.supabaseClient) return;
        try {
            const { data: roomData } = await supabaseClient
                .from('live_studio_rooms')
                .select('*')
                .eq('pin', pin)
                .maybeSingle();

            if (roomData) {
                STATE.roomTitle  = roomData.title || `ห้อง ${pin}`;
                STATE.roomStatus = roomData.status || 'LIVE';
                STATE.isLocked   = !!roomData.is_locked;

                el('sb-room-name').textContent     = STATE.roomTitle;
                el('stage-room-title').textContent = STATE.roomTitle;

                // Host identity check: Only the actual room creator can act as host
                const hostRooms = getStoredHostRooms();
                const isOwnerByStorage = hostRooms[pin] !== undefined;
                const isOwnerByAuth = !!(currentUserId && roomData.host_secret && (roomData.host_secret === currentUserId || (currentAuthUser?.email && roomData.host_secret === currentAuthUser.email)));
                const isOwner = isOwnerByAuth || isOwnerByStorage;

                if (STATE.isHost && !isOwner) {
                    STATE.isHost = false;
                    STATE.myRole = 'student';
                    el('up-role').textContent = '🎓 นักเรียน';
                    el('btn-lock-room').style.display = 'none';
                    el('btn-end-session').style.display = 'none';
                    el('btn-delete-room').style.display = 'none';
                    el('btn-delete-archived').style.display = 'none';
                    el('ctrl-end-label').textContent  = 'ออก';
                    if (el('ctrl-screen')) el('ctrl-screen').style.display = '';
                }

                if (STATE.roomStatus === 'ENDED') {
                    applyEndedRoomState();
                }
            } else if (STATE.isHost) {
                // Auto-create room record if host
                await supabaseClient.from('live_studio_rooms').insert([{
                    pin,
                    title: STATE.roomTitle,
                    host_name: name,
                    status: 'LIVE',
                    host_secret: currentUserId || name
                }]);
                saveHostRoom(pin, 'host');
            }

            // Load persistent chat & files
            await loadDbHistory(pin);
        } catch (err) {
            console.warn('[DB Background Sync Notice]:', err.message);
        }
    })();

    showToast('success', 'เข้าสู่ห้องเรียน', `ยินดีต้อนรับ ${name} สู่ ${STATE.roomTitle}`, 3000);
}

// ── ENDED ROOM STATE ───────────────────────────────────────────
function applyEndedRoomState() {
    STATE.roomStatus = 'ENDED';
    el('ended-banner').style.display = 'flex';
    el('badge-live').textContent = '● สิ้นสุดการสอน';
    el('badge-live').style.background = 'rgba(234, 179, 8, 0.2)';
    el('badge-live').style.color = '#facc15';
    el('badge-live').style.borderColor = 'rgba(234, 179, 8, 0.4)';

    // Hide end session button if already ended
    el('btn-end-session').style.display = 'none';

    // Disable media controls
    const ctrlDeck = el('control-deck');
    if (ctrlDeck) {
        el('ctrl-mic').disabled = true;
        el('ctrl-cam').disabled = true;
        el('ctrl-screen').disabled = true;
        el('ctrl-mic').style.opacity = '0.4';
        el('ctrl-cam').style.opacity = '0.4';
        el('ctrl-screen').style.opacity = '0.4';
    }

    el('screen-hint').innerHTML = 'ห้องนี้จบการสอนแล้ว — <strong>ประวัติแชทและคลังไฟล์ยังคงเปิดให้ศึกษาและดาวน์โหลดได้ตลอดเวลา</strong>';
}

// ── STORAGE & PERSISTENCE HELPERS ─────────────────────────────
function getChatStorageKey(pin) {
    return `gyver_live_chat_${pin}`;
}

function getFilesStorageKey(pin) {
    return `gyver_live_files_${pin}`;
}

function getLocalMessages(pin) {
    try {
        const raw = localStorage.getItem(getChatStorageKey(pin));
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function getLocalFiles(pin) {
    try {
        const raw = localStorage.getItem(getFilesStorageKey(pin));
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalMessage(pin, msg) {
    if (!pin || !msg) return;
    try {
        const key = getChatStorageKey(pin);
        let list = getLocalMessages(pin);
        const exists = list.some(m => m.timestamp === msg.timestamp && m.name === msg.name && m.text === msg.text);
        if (!exists) {
            list.push(msg);
            if (list.length > 250) list.shift();
            localStorage.setItem(key, JSON.stringify(list));
        }
    } catch (e) {
        console.warn('[saveLocalMessage]', e);
    }
}

function saveLocalFile(pin, f) {
    if (!pin || !f) return;
    try {
        const key = getFilesStorageKey(pin);
        let list = getLocalFiles(pin);
        const exists = list.some(item => (item.url && item.url === f.url) || (item.name === f.name && item.timestamp === f.timestamp));
        if (!exists) {
            list.unshift(f);
            if (list.length > 100) list.pop();
            localStorage.setItem(key, JSON.stringify(list));
        }
    } catch (e) {
        console.warn('[saveLocalFile]', e);
    }
}

function loadLocalHistory(pin) {
    if (!pin) return;
    const msgs = getLocalMessages(pin);
    if (msgs && msgs.length > 0) {
        msgs.forEach(m => renderChatMessage(m, false));
    }
    const files = getLocalFiles(pin);
    if (files && files.length > 0) {
        files.forEach(f => addFileToPanel(f, false));
    }
}

async function ensureRoomExistsInDb(pin) {
    if (!window.supabaseClient) return;
    try {
        await supabaseClient.from('live_studio_rooms').upsert([{
            pin,
            title: STATE.roomTitle || `ห้อง ${pin}`,
            host_name: STATE.isHost ? STATE.myName : 'Host',
            status: STATE.roomStatus || 'LIVE'
        }], { onConflict: 'pin' });
    } catch (e) {
        // ignore
    }
}

// ── LOAD DB HISTORY (CHAT & FILES) ─────────────────────────────
async function loadDbHistory(pin) {
    if (!window.supabaseClient) return;

    try {
        await ensureRoomExistsInDb(pin);

        // 1. Load Messages
        const { data: messages, error: msgErr } = await supabaseClient
            .from('live_studio_messages')
            .select('*')
            .eq('room_pin', pin)
            .order('created_at', { ascending: true });

        if (!msgErr && messages && messages.length > 0) {
            messages.forEach(msg => {
                renderChatMessage({
                    name:      msg.sender_name,
                    role:      msg.sender_role,
                    text:      msg.message,
                    timestamp: new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                    avatar:    msg.sender_avatar,
                    isHistory: true
                }, true);
            });
        }

        // 2. Load Files
        const { data: files, error: fileErr } = await supabaseClient
            .from('live_studio_files')
            .select('*')
            .eq('room_pin', pin)
            .order('created_at', { ascending: false });

        if (!fileErr && files && files.length > 0) {
            files.forEach(f => {
                addFileToPanel({
                    name:      f.file_name,
                    url:       f.file_url,
                    size:      f.file_size,
                    type:      f.file_type,
                    uploader:  f.sender_name,
                    timestamp: new Date(f.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                }, true);
            });
        }
    } catch (err) {
        console.warn('[loadDbHistory] Notice:', err.message);
    }
}

// ── CLOUDINARY & IMAGE HELPERS ─────────────────────────────────
function isImage(url, filename = '') {
    if (!url) return false;
    const str = (url + ' ' + (filename || '')).toLowerCase();
    return str.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)($|\?|\s)/i) ||
           (url.includes('cloudinary.com') && !str.match(/\.(pdf|zip|rar|docx?|xlsx?|pptx?|mp4|webm)($|\?|\s)/i)) ||
           url.startsWith('data:image/');
}

function parseChatBody(text) {
    if (!text) return '';

    // 1. File attachment pattern: 📎 ได้แนบไฟล์: [filename](url) (size)
    const fileAttachRegex = /📎 ได้แนบไฟล์:\s*\[(.*?)\]\((https?:\/\/[^\s]+|data:image\/[^\s]+)\)(?:\s*\((.*?)\))?/;
    const match = text.match(fileAttachRegex);
    if (match) {
        const fileName = match[1];
        const fileUrl  = match[2];
        const fileSize = match[3] || '';

        if (isImage(fileUrl, fileName)) {
            return `
                <div class="chat-file-card-bubble">
                    <div style="font-size:0.8rem;color:#94a3b8;margin-bottom:6px;display:flex;align-items:center;gap:6px">
                        <i class="bi bi-image" style="color:#818cf8"></i>
                        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px">${escapeHtml(fileName)}</span>
                    </div>
                    <a href="${escapeHtml(fileUrl)}" target="_blank" class="chat-img-link" title="คลิกเพื่อดูรูปขนาดเต็ม">
                        <img src="${escapeHtml(fileUrl)}" class="chat-embedded-image" alt="${escapeHtml(fileName)}" loading="lazy" />
                    </a>
                    <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center">
                        <span style="font-size:0.75rem;color:#64748b">${escapeHtml(fileSize)}</span>
                        <a href="${escapeHtml(fileUrl)}" target="_blank" download="${escapeHtml(fileName)}" style="font-size:0.75rem;color:#818cf8;text-decoration:none;display:inline-flex;align-items:center;gap:4px">
                            <i class="bi bi-download"></i> ดาวน์โหลด
                        </a>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="chat-file-card-bubble">
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="font-size:1.6rem;color:#818cf8"><i class="bi bi-file-earmark-arrow-down"></i></div>
                        <div style="flex:1;min-width:0">
                            <div style="font-size:0.85rem;font-weight:600;color:#f2f3f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(fileName)}</div>
                            <div style="font-size:0.72rem;color:#94a3b8">${escapeHtml(fileSize)}</div>
                        </div>
                        <a href="${escapeHtml(fileUrl)}" target="_blank" download="${escapeHtml(fileName)}" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;background:rgba(88,101,242,0.2);color:#818cf8;text-decoration:none">
                            <i class="bi bi-download"></i>
                        </a>
                    </div>
                </div>
            `;
        }
    }

    // 2. Direct image markdown: ![alt](url)
    const imgMdRegex = /!\[(.*?)\]\((https?:\/\/[^\s]+|data:image\/[^\s]+)\)/g;
    if (imgMdRegex.test(text)) {
        return text.replace(imgMdRegex, (m, alt, url) => {
            return `
                <div class="chat-file-card-bubble" style="padding:6px;background:transparent;border:none">
                    <a href="${escapeHtml(url)}" target="_blank" class="chat-img-link" title="คลิกเพื่อดูรูปภาพ">
                        <img src="${escapeHtml(url)}" class="chat-embedded-image" alt="${escapeHtml(alt || 'image')}" loading="lazy" />
                    </a>
                </div>
            `;
        });
    }

    // 3. Standalone image URL
    const urlPattern = /^(https?:\/\/[^\s]+\.(?:jpeg|jpg|gif|png|webp|svg)(?:\?[^\s]*)?)$/i;
    if (urlPattern.test(text.trim())) {
        const url = text.trim();
        return `
            <div class="chat-file-card-bubble" style="padding:6px;background:transparent;border:none">
                <a href="${escapeHtml(url)}" target="_blank" class="chat-img-link" title="คลิกเพื่อดูรูปภาพ">
                    <img src="${escapeHtml(url)}" class="chat-embedded-image" alt="Image" loading="lazy" />
                </a>
            </div>
        `;
    }

    // 4. Standard markdown links [text](url)
    let bodyHtml = escapeHtml(text);
    bodyHtml = bodyHtml.replace(/\[(.*?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" download style="color:#60a5fa;text-decoration:underline;word-break:break-all"><i class="bi bi-link-45deg me-1"></i>$1</a>');

    // Auto-link remaining HTTP/HTTPS URLs (not inside quotes/tags)
    bodyHtml = bodyHtml.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" style="color:#60a5fa;text-decoration:underline;word-break:break-all">$2</a>');

    return bodyHtml;
}

function setupChatPasteHandler() {
    const input = el('chat-input');
    if (!input || input.dataset.pasteAttached) return;
    input.dataset.pasteAttached = 'true';

    input.addEventListener('paste', async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
                const blob = items[i].getAsFile();
                if (blob) {
                    e.preventDefault();
                    const pasteName = `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
                    showToast('info', 'กำลังส่งรูปภาพ...', 'ตรวจพบรูปภาพจากคลิปบอร์ด กำลังบันทึกและส่ง', 2000);
                    await uploadAndSendImageBlob(blob, pasteName);
                    break;
                }
            }
        }
    });
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadAndSendImageBlob(file, defaultName = 'image.png') {
    const progressEl = el('file-upload-progress');
    const statusText = el('upload-status-text');

    const fileName = file.name || defaultName;
    if (progressEl) {
        progressEl.style.display = 'flex';
        statusText.textContent = `กำลังส่งรูปภาพ "${fileName}"...`;
    }

    try {
        let fileUrl = null;
        let fileSize = file.size || 0;

        // Try Cloudinary
        try {
            const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY.uploadPreset);

            const res = await fetch(url, { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                fileUrl = data.secure_url || data.url;
                fileSize = file.size || data.bytes || fileSize;
            }
        } catch (cloudErr) {
            console.warn('Cloudinary upload fallback to data URL:', cloudErr);
        }

        // Fallback to data URL if small image
        if (!fileUrl && fileSize <= 2.5 * 1024 * 1024) {
            fileUrl = await fileToDataUrl(file);
        }

        if (!fileUrl) {
            throw new Error('ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
        }

        const fileType = file.type || 'image/png';
        const timestamp = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        const fileObj = {
            name: fileName,
            url: fileUrl,
            size: fileSize,
            type: fileType,
            uploader: STATE.myName,
            timestamp: timestamp
        };

        // 1. Add to Files tab & localStorage
        addFileToPanel(fileObj, true);

        // 2. Save in Supabase DB if Cloudinary URL
        if (window.supabaseClient && !fileUrl.startsWith('data:')) {
            ensureRoomExistsInDb(STATE.roomPin).then(() => {
                supabaseClient.from('live_studio_files').insert([{
                    room_pin: STATE.roomPin,
                    sender_name: STATE.myName,
                    file_name: fileName,
                    file_url: fileUrl,
                    file_type: fileType,
                    file_size: fileSize
                }]).then(() => {}).catch(() => {});
            });
        }

        // 3. Post to chat
        const sizeFormatted = formatFileSize(fileSize);
        const chatMsg = `📎 ได้แนบไฟล์: [${fileName}](${fileUrl}) (${sizeFormatted})`;
        await saveAndBroadcastMessage(chatMsg);

        // 4. Broadcast file_shared
        if (STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'file_shared',
                payload: fileObj
            });
        }

        showToast('success', 'ส่งรูปภาพสำเร็จ', `รูปภาพถูกบันทึกและส่งเข้าห้องแชทแล้ว`, 3000);
    } catch (err) {
        console.error('Image upload error:', err);
        showToast('error', 'ส่งรูปภาพล้มเหลว', err.message || 'ไม่สามารถส่งรูปภาพได้', 4000);
    } finally {
        if (progressEl) progressEl.style.display = 'none';
    }
}

async function handleFileUpload(input) {
    const file = input.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
        await uploadAndSendImageBlob(file, file.name);
        input.value = '';
        return;
    }

    const progressEl = el('file-upload-progress');
    const statusText = el('upload-status-text');

    if (progressEl) {
        progressEl.style.display = 'flex';
        statusText.textContent = `กำลังอัปโหลด "${file.name}" ขึ้น Cloudinary...`;
    }

    try {
        let fileUrl = null;
        let fileSize = file.size || 0;
        const fileName = file.name;
        const fileType = file.type || 'file';

        try {
            const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY.uploadPreset);

            const res = await fetch(url, { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                fileUrl = data.secure_url || data.url;
                fileSize = file.size || data.bytes || fileSize;
            }
        } catch (e) {
            console.warn('Cloudinary upload error:', e);
        }

        if (!fileUrl && fileSize <= 2.5 * 1024 * 1024) {
            fileUrl = await fileToDataUrl(file);
        }

        if (!fileUrl) {
            throw new Error('ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
        }

        const timestamp = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const fileObj = {
            name: fileName,
            url: fileUrl,
            size: fileSize,
            type: fileType,
            uploader: STATE.myName,
            timestamp: timestamp
        };

        // 1. Add to local Files tab & localStorage
        addFileToPanel(fileObj, true);

        // 2. Save in DB
        if (window.supabaseClient && !fileUrl.startsWith('data:')) {
            ensureRoomExistsInDb(STATE.roomPin).then(() => {
                supabaseClient.from('live_studio_files').insert([{
                    room_pin: STATE.roomPin,
                    sender_name: STATE.myName,
                    file_name: fileName,
                    file_url: fileUrl,
                    file_type: fileType,
                    file_size: fileSize
                }]).then(() => {}).catch(() => {});
            });
        }

        // 3. Post to chat
        const sizeFormatted = formatFileSize(fileSize);
        const chatMsg = `📎 ได้แนบไฟล์: [${fileName}](${fileUrl}) (${sizeFormatted})`;
        await saveAndBroadcastMessage(chatMsg);

        // 4. Realtime broadcast
        if (STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'file_shared',
                payload: fileObj
            });
        }

        showToast('success', 'อัปโหลดสำเร็จ', `ไฟล์ "${fileName}" ถูกบันทึกเรียบร้อยแล้ว`, 3500);

    } catch (err) {
        console.error('[Upload Error]', err);
        showToast('error', 'อัปโหลดล้มเหลว', err.message || 'ไม่สามารถส่งไฟล์ได้', 4000);
    } finally {
        if (progressEl) progressEl.style.display = 'none';
        input.value = '';
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function addFileToPanel(f, saveToStorage = true) {
    if (!f || !f.name) return;

    const fileSig = `${f.url || ''}_${f.name || ''}_${f.timestamp || ''}`;
    if (!STATE.renderedFileSignatures) STATE.renderedFileSignatures = new Set();
    if (STATE.renderedFileSignatures.has(fileSig)) return;
    STATE.renderedFileSignatures.add(fileSig);

    STATE.sharedFiles.push(f);
    if (saveToStorage && STATE.roomPin) {
        saveLocalFile(STATE.roomPin, f);
    }

    const list = el('files-list');
    const emptyState = el('files-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    if (el('files-badge-count')) el('files-badge-count').textContent = STATE.sharedFiles.length;
    if (el('tab-files-count')) el('tab-files-count').textContent   = STATE.sharedFiles.length;

    const fileCard = document.createElement('div');
    fileCard.style.cssText = `
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all .2s;
    `;

    let iconOrThumb = `<div style="font-size:1.6rem;color:#818cf8"><i class="bi bi-file-earmark"></i></div>`;
    if (isImage(f.url, f.name)) {
        iconOrThumb = `<img src="${escapeHtml(f.url)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid rgba(255,255,255,0.15);flex-shrink:0" alt="thumb" />`;
    } else if (f.type && f.type.includes('pdf')) {
        iconOrThumb = `<div style="font-size:1.6rem;color:#ef4444"><i class="bi bi-file-earmark-pdf"></i></div>`;
    } else if (f.type && f.type.includes('video')) {
        iconOrThumb = `<div style="font-size:1.6rem;color:#f59e0b"><i class="bi bi-file-earmark-play"></i></div>`;
    } else if (f.type && (f.type.includes('zip') || f.type.includes('rar'))) {
        iconOrThumb = `<div style="font-size:1.6rem;color:#10b981"><i class="bi bi-file-earmark-zip"></i></div>`;
    }

    fileCard.innerHTML = `
        ${iconOrThumb}
        <div style="flex:1;min-width:0">
            <div style="font-size:0.85rem;font-weight:600;color:#f2f3f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
            <div style="font-size:0.72rem;color:var(--discord-muted)">${escapeHtml(f.uploader || 'ผู้ใช้')} · ${formatFileSize(f.size)} · ${f.timestamp || ''}</div>
        </div>
        <a href="${escapeHtml(f.url)}" target="_blank" download="${escapeHtml(f.name)}" title="ดาวน์โหลด" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(88,101,242,0.15);color:#818cf8;text-decoration:none;border:1px solid rgba(88,101,242,0.3)">
            <i class="bi bi-download"></i>
        </a>
    `;

    if (list) list.prepend(fileCard);
}

// ── REALTIME & SIGNALING ───────────────────────────────────────
function setupRealtimeChannel(pin) {
    if (!window.supabaseClient) {
        console.warn('[Realtime] supabaseClient not ready');
        return;
    }

    const channelName = `live_room_${pin}`;
    STATE.channel = supabaseClient.channel(channelName, {
        config: { presence: { key: STATE.myId } }
    });

    // 1. Broadcast Events
    STATE.channel
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
            renderChatMessage(payload, true);
        })
        .on('broadcast', { event: 'file_shared' }, ({ payload }) => {
            addFileToPanel(payload, true);
        })
        .on('broadcast', { event: 'request_history' }, ({ payload }) => {
            if (payload && payload.requester !== STATE.myName) {
                const msgs = getLocalMessages(STATE.roomPin);
                const files = getLocalFiles(STATE.roomPin);
                if (msgs.length > 0 || files.length > 0) {
                    STATE.channel.send({
                        type: 'broadcast',
                        event: 'sync_history',
                        payload: {
                            target: payload.requester,
                            messages: msgs,
                            files: files
                        }
                    });
                }
            }
        })
        .on('broadcast', { event: 'sync_history' }, ({ payload }) => {
            if (payload && payload.target === STATE.myName) {
                if (payload.messages && payload.messages.length > 0) {
                    payload.messages.forEach(m => renderChatMessage(m, true));
                }
                if (payload.files && payload.files.length > 0) {
                    payload.files.forEach(f => addFileToPanel(f, true));
                }
            }
        })
        .on('broadcast', { event: 'reaction' }, ({ payload }) => {
            showFloatingReaction(payload.emoji, payload.name);
        })
        .on('broadcast', { event: 'raise_hand' }, ({ payload }) => {
            handleRaiseHandEvent(payload);
        })
        .on('broadcast', { event: 'session_ended' }, () => {
            showToast('warning', 'จบการสอน', 'ครูผู้สอนได้จบการสอนสดแล้ว', 4000);
            applyEndedRoomState();
        })
        .on('broadcast', { event: 'room_deleted' }, () => {
            showToast('error', 'ห้องเรียนถูกลบ', 'ห้องนี้ถูกเจ้าของห้องลบแล้ว กำลังกลับสู่หน้าล็อบบี้...', 3000);
            setTimeout(() => window.location.href = 'live_studio.html', 2500);
        })
        .on('broadcast', { event: 'media_state' }, ({ payload }) => {
            updatePeerMediaState(payload);
        })
        .on('broadcast', { event: 'screen_share_start' }, ({ payload }) => {
            handleRemoteScreenShareStart(payload);
        })
        .on('broadcast', { event: 'screen_share_stop' }, ({ payload }) => {
            handleRemoteScreenShareStop(payload);
        })
        .on('broadcast', { event: 'request_screen_stream' }, async ({ payload }) => {
            if (payload && payload.target === STATE.myName && STATE.screenOn && STATE.screenStream) {
                console.log(`[request_screen_stream] Received screen request from ${payload.requester}. Sending track...`);
                await sendScreenTrackToPeer(payload.requester);
            }
        })
        // WebRTC Signaling
        .on('broadcast', { event: 'signal_offer' }, async ({ payload }) => {
            if (payload.target === STATE.myName) await handleSignalOffer(payload);
        })
        .on('broadcast', { event: 'signal_answer' }, async ({ payload }) => {
            if (payload.target === STATE.myName) await handleSignalAnswer(payload);
        })
        .on('broadcast', { event: 'signal_ice' }, async ({ payload }) => {
            if (payload.target === STATE.myName) await handleSignalIce(payload);
        });

    // 2. Presence Tracking
    STATE.channel
        .on('presence', { event: 'sync' }, () => {
            const state = STATE.channel.presenceState();
            updateOnlineList(state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            const p = newPresences[0];
            if (p && p.id !== STATE.myId && p.name !== STATE.myName) {
                STATE.participants.set(p.name, p);
                const roleLabel = (p.role === 'host') ? 'ครูผู้สอน' : 'นักเรียน';
                showToast('info', 'มีผู้เข้าร่วม', `${p.name} (${roleLabel}) เข้าร่วมห้องเรียน`, 2500);
                // If this user has active media or screen share, initiate WebRTC connection
                if (STATE.screenOn) {
                    sendScreenTrackToPeer(p.name);
                } else if (STATE.camOn || STATE.micOn) {
                    initiatePeerConnection(p.name);
                }
            }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            const p = leftPresences[0];
            if (p && p.id !== STATE.myId) {
                removeParticipant(p.name);
                closePeerConnection(p.name);
            }
        });

    // Subscribe
    STATE.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await STATE.channel.track({
                id:       STATE.myId,
                name:     STATE.myName,
                role:     STATE.myRole,
                micOn:    STATE.micOn,
                camOn:    STATE.camOn,
                screenOn: STATE.screenOn,
            });

            // Request history from peers if this client doesn't have cached history
            if (getLocalMessages(pin).length === 0 && getLocalFiles(pin).length === 0) {
                setTimeout(() => {
                    if (STATE.channel) {
                        STATE.channel.send({
                            type: 'broadcast',
                            event: 'request_history',
                            payload: { requester: STATE.myName }
                        });
                    }
                }, 800);
            }
        }
    });
}

// ── CHAT SYSTEM (WITH DB PERSISTENCE & LOCAL CACHE) ─────────────
async function sendChatMessage() {
    const input = el('chat-input');
    const text  = input.value.trim();
    if (!text) return;

    input.value = '';
    syncSendBtn();

    await saveAndBroadcastMessage(text);
}

async function saveAndBroadcastMessage(text) {
    const avatarSeed = encodeURIComponent(STATE.myName);
    const avatarUrl  = `https://api.dicebear.com/8.x/thumbs/svg?seed=${avatarSeed}`;
    const timestamp  = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const msgObj = {
        name:      STATE.myName,
        role:      STATE.myRole,
        text:      text,
        avatar:    avatarUrl,
        timestamp: timestamp
    };

    // 1. Render locally immediately and save in localStorage
    renderChatMessage(msgObj, true);

    // 2. Save to Supabase DB (persistent)
    if (window.supabaseClient) {
        ensureRoomExistsInDb(STATE.roomPin).then(() => {
            supabaseClient.from('live_studio_messages').insert([{
                room_pin:      STATE.roomPin,
                sender_name:   STATE.myName,
                sender_role:   STATE.myRole,
                sender_avatar: avatarUrl,
                message:       text
            }]).then(() => {}).catch(err => {
                console.warn('[Save Message DB Notice]:', err.message);
            });
        });
    }

    // 3. Broadcast to Realtime channel
    if (STATE.channel) {
        STATE.channel.send({
            type: 'broadcast',
            event: 'chat',
            payload: msgObj
        });
    }
}

function chatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
}

function renderChatMessage(msg, saveToStorage = true) {
    if (!msg || !msg.text) return;

    // Deduplication check
    const msgSig = `${msg.timestamp || ''}_${msg.name || ''}_${msg.text}`;
    if (!STATE.renderedMessageSignatures) STATE.renderedMessageSignatures = new Set();
    if (STATE.renderedMessageSignatures.has(msgSig)) return;
    STATE.renderedMessageSignatures.add(msgSig);

    // Save to localStorage for instant persistent reload
    if (saveToStorage && STATE.roomPin) {
        saveLocalMessage(STATE.roomPin, msg);
    }

    const container = el('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${msg.role === 'host' ? 'host-msg' : ''}`;

    const roleBadge = msg.role === 'host' ? `<span class="host-badge">ครูผู้สอน</span>` : '';
    const avatarSrc = msg.avatar || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(msg.name)}`;

    const bodyHtml = parseChatBody(msg.text);

    div.innerHTML = `
        <img class="chat-msg-avatar" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(msg.name)}">
        <div class="chat-msg-body">
            <div class="chat-msg-meta">
                <span class="chat-msg-author">${escapeHtml(msg.name)}</span>
                ${roleBadge}
                <span class="chat-msg-time">${msg.timestamp || ''}</span>
            </div>
            <div class="chat-msg-text">${bodyHtml}</div>
        </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ── END SESSION & DELETE ROOM (HOST ACTIONS) ───────────────────
async function promptEndSession() {
    if (!STATE.isHost) return;

    const confirmed = confirm('คุณต้องการ "จบการสอนสด" ใช่หรือไม่?\n\n• ห้องเรียนจะหยุดการถ่ายทอดสดเสียง/วีดีโอ\n• ประวัติแชทและไฟล์จะยังคงถูกบันทึกไว้ในคลังย้อนหลัง ให้นักเรียนเข้ามาทบทวนได้ตลอดเวลา');
    if (!confirmed) return;

    try {
        if (window.supabaseClient) {
            await supabaseClient
                .from('live_studio_rooms')
                .update({ status: 'ENDED', ended_at: new Date().toISOString() })
                .eq('pin', STATE.roomPin);
        }

        // Notify students via Realtime
        if (STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'session_ended',
                payload: { by: STATE.myName }
            });
        }

        applyEndedRoomState();
        showToast('success', 'จบการสอนแล้ว', 'ห้องเรียนถูกเปลี่ยนสถานะเป็นคลังบันทึกย้อนหลังเรียบร้อย', 4000);
    } catch (err) {
        showToast('error', 'เกิดข้อผิดพลาด', err.message, 3000);
    }
}

async function deleteRoomPermanently() {
    if (!STATE.isHost) return;

    const confirmed = confirm('⚠️ คำเตือน: คุณต้องการ "ลบห้องนี้ถาวร" ใช่หรือไม่?\n\n• ประวัติแชทและไฟล์ทั้งหมดของห้องนี้จะถูกลบออกจากฐานข้อมูลทันที\n• การกระทำนี้ไม่สามารถย้อนกลับได้');
    if (!confirmed) return;

    try {
        if (window.supabaseClient) {
            await supabaseClient
                .from('live_studio_rooms')
                .delete()
                .eq('pin', STATE.roomPin);
        }

        // Notify all clients
        if (STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'room_deleted',
                payload: { pin: STATE.roomPin }
            });
        }

        // Remove from local host list
        const hostRooms = getStoredHostRooms();
        delete hostRooms[STATE.roomPin];
        localStorage.setItem(getStorageKey(), JSON.stringify(hostRooms));

        sessionStorage.removeItem('gyver_active_live_room');
        localStorage.removeItem('gyver_active_live_room');
        try {
            window.parent.postMessage({
                action: 'updateLiveRoomState',
                pin: null
            }, '*');
        } catch (e) {}

        showToast('success', 'ลบห้องเรียบร้อย', 'กำลังกลับสู่หน้ารวมห้องเรียน...', 2000);
        setTimeout(() => {
            window.location.href = 'live_studio.html';
        }, 1500);
    } catch (err) {
        showToast('error', 'ลบห้องไม่สำเร็จ', err.message, 3000);
    }
}

// ── PRESENCE & PARTICIPANTS ────────────────────────────────────
function updateOnlineList(presenceState) {
    const list = el('participants-list');
    const voiceList = el('voice-members-list');
    if (!list) return;

    list.innerHTML = '';
    if (voiceList) voiceList.innerHTML = '';

    let count = 0;
    const allUsers = [];
    const activeNames = new Set();

    for (const key in presenceState) {
        const presences = presenceState[key];
        presences.forEach(p => {
            count++;
            allUsers.push(p);
            if (p.name) {
                activeNames.add(p.name);
                STATE.participants.set(p.name, p);
            }
        });
    }

    // Clean up participants that are no longer online
    STATE.participants.forEach((_, pName) => {
        if (!activeNames.has(pName) && pName !== STATE.myName) {
            removeParticipant(pName);
            closePeerConnection(pName);
        }
    });

    el('online-count').textContent = `${count} คนออนไลน์`;
    el('vc-member-count').textContent = count;

    allUsers.forEach(p => {
        const isMe = (p.id ? p.id === STATE.myId : p.name === STATE.myName);
        const isSharing = !!(p.screenOn || STATE.activeScreenSharers.has(p.name));

        // Sync presence screenOn
        if (p.screenOn && !STATE.activeScreenSharers.has(p.name)) {
            STATE.activeScreenSharers.set(p.name, {
                name: p.name,
                role: p.role,
                isSelf: isMe
            });
        } else if (!p.screenOn && !isMe && STATE.activeScreenSharers.has(p.name)) {
            STATE.activeScreenSharers.delete(p.name);
        }

        // Participants Tab Item
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.innerHTML = `
            <img class="participant-avatar" src="https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(p.name)}" alt="${escapeHtml(p.name)}">
            <div class="participant-info">
                <div class="participant-name">${escapeHtml(p.name)}${isMe ? ' (คุณ)' : ''}</div>
                <div class="participant-role">${p.role === 'host' ? '👩‍🏫 ครูผู้สอน' : '🎓 นักเรียน'}</div>
            </div>
            <div class="participant-icons">
                ${isSharing ? `<span class="live-stream-badge" title="คลิกเพื่อดูหน้าจอของ ${escapeHtml(p.name)}" onclick="selectScreenStream('${escapeHtml(p.name)}')"><i class="bi bi-display-fill"></i> ดูจอ</span>` : ''}
                <i class="bi ${p.micOn ? 'bi-mic-fill text-success' : 'bi-mic-mute-fill text-muted'}"></i>
                <i class="bi ${p.camOn ? 'bi-camera-video-fill text-success' : 'bi-camera-video-off-fill text-muted'}"></i>
            </div>
        `;
        list.appendChild(item);

        // Sidebar Voice Channel Member (compact with vm-avatar)
        if (voiceList) {
            const vMember = document.createElement('div');
            vMember.className = `voice-member ${isSharing ? 'is-streaming' : ''}`;
            vMember.onclick = () => {
                const sharing = !!(p.screenOn || STATE.activeScreenSharers.has(p.name));
                if (sharing) {
                    selectScreenStream(p.name);
                }
            };
            vMember.title = isSharing ? `คลิกเพื่อดูหน้าจอของ ${p.name}` : p.name;
            vMember.innerHTML = `
                <img class="vm-avatar" src="https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(p.name)}" alt="${escapeHtml(p.name)}">
                <span class="voice-member-name">${escapeHtml(p.name)}${isMe ? ' (คุณ)' : ''}</span>
                ${isSharing ? `<span class="live-stream-badge" title="กำลังแชร์หน้าจอ (คลิกเพื่อดู)" onclick="event.stopPropagation(); selectScreenStream('${escapeHtml(p.name)}')"><i class="bi bi-display-fill"></i> สตรีม</span>` : ''}
                <i class="bi ${p.micOn ? 'bi-mic-fill' : 'bi-mic-mute-fill'} ms-auto" style="font-size:.8rem;color:${p.micOn ? '#23a55a' : '#80848e'}"></i>
            `;
            voiceList.appendChild(vMember);
        }
    });

    renderStreamSwitcher();
}

function addParticipant(p) {
    STATE.participants.set(p.name, p);
}

function removeParticipant(name) {
    STATE.participants.delete(name);
    const tile = el(`video-tile-${name}`);
    if (tile) tile.remove();
}

// ── MEDIA TOGGLES (MIC, CAM, SCREEN) ───────────────────────────
async function toggleMic() {
    if (STATE.roomStatus === 'ENDED') return;

    let audioTrack = STATE.localStream ? STATE.localStream.getAudioTracks()[0] : null;

    if (!audioTrack) {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const newTrack = audioStream.getAudioTracks()[0];
            if (STATE.localStream) {
                STATE.localStream.addTrack(newTrack);
            } else {
                STATE.localStream = audioStream;
            }
            audioTrack = newTrack;

            // Add audio track to peer connections
            STATE.peerConnections.forEach(pc => {
                try {
                    pc.addTrack(audioTrack, STATE.localStream);
                } catch (e) {}
            });
        } catch (err) {
            console.error('[Mic Error]:', err);
            let msg = err.message || 'ไม่สามารถเข้าถึงไมโครโฟนได้';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'เบราว์เซอร์บล็อกการเข้าถึงไมค์: กรุณาคลิกไอคอนรูปแม่กุญแจ/Site Settings ที่หน้า URL เพื่อเลือก "อนุญาต (Allow)" ไมโครโฟน';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = 'ไม่พบอุปกรณ์ไมโครโฟนที่เชื่อมต่อกับคอมพิวเตอร์';
            } else if (err.name === 'NotReadableError') {
                msg = 'ไมโครโฟนกำลังถูกโปรแกรมอื่นใช้งานอยู่ หรือเกิดข้อผิดพลาดในการเปิดไมค์';
            }
            showToast('error', 'ไมค์', msg, 5000);
            return;
        }
    }

    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        STATE.micOn = audioTrack.enabled;
    } else {
        STATE.micOn = !STATE.micOn;
    }

    el('ctrl-mic').classList.toggle('off', !STATE.micOn);
    el('ctrl-mic-icon').className = STATE.micOn ? 'bi bi-mic-fill' : 'bi bi-mic-mute-fill';
    if (el('panel-mic-btn')) {
        el('panel-mic-btn').classList.toggle('muted', !STATE.micOn);
        el('panel-mic-btn').innerHTML = STATE.micOn ? '<i class="bi bi-mic-fill"></i>' : '<i class="bi bi-mic-mute-fill"></i>';
    }
    if (el('self-mic-badge')) {
        el('self-mic-badge').classList.toggle('muted', !STATE.micOn);
        el('self-mic-badge').innerHTML = STATE.micOn ? '<i class="bi bi-mic-fill"></i>' : '<i class="bi bi-mic-mute-fill"></i>';
    }

    broadcastMediaState();
}

function createVirtualCameraStream(userName) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    function renderVirtualFrame() {
        if (!STATE.camOn) return;
        frame++;

        // Studio dark background gradient
        const bg = ctx.createLinearGradient(0, 0, 640, 480);
        bg.addColorStop(0, '#0f172a');
        bg.addColorStop(0.5, '#1e1b4b');
        bg.addColorStop(1, '#090d16');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 640, 480);

        // Animated neon circles
        const r1 = 80 + Math.sin(frame * 0.04) * 8;
        ctx.beginPath();
        ctx.arc(320, 200, r1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(320, 200, 60, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1';
        ctx.fill();

        // White avatar robot icon
        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🤖', 320, 202);

        // User name
        ctx.font = 'bold 22px "Kanit", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(userName || 'ผู้ใช้งาน', 320, 310);

        // Virtual Camera Badge
        ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(190, 340, 260, 32, 16);
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 13px "Kanit", sans-serif';
        ctx.fillStyle = '#f472b6';
        ctx.fillText('📷 กล้องเสมือน (Virtual Camera)', 320, 360);

        requestAnimationFrame(renderVirtualFrame);
    }

    renderVirtualFrame();
    return canvas.captureStream(30);
}

async function toggleCamera() {
    if (STATE.roomStatus === 'ENDED') return;

    if (!STATE.camOn) {
        let videoTrack = null;
        try {
            // Attempt to access physical webcam
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoTrack = videoStream.getVideoTracks()[0];
        } catch (err) {
            console.warn('[Camera Access Notice]:', err);
            // If computer doesn't have a webcam or not found, fallback to Virtual Camera Avatar!
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || (err.message && err.message.includes('not found'))) {
                showToast('info', 'กล้องเสมือน (Virtual)', 'คอมพิวเตอร์ไม่มีกล้องจริง ระบบเปิดกล้องเสมือนสำหรับทดสอบให้แล้ว', 4000);
                const virtualStream = createVirtualCameraStream(STATE.myName);
                videoTrack = virtualStream.getVideoTracks()[0];
            } else if (err.name === 'NotAllowedError') {
                showToast('error', 'กล้อง', 'เบราว์เซอร์บล็อกการเข้าถึงกล้อง: กรุณาคลิกไอคอนหน้าแถบ URL เพื่อกด "อนุญาต (Allow)"', 4000);
                return;
            } else {
                showToast('error', 'กล้อง', 'ไม่สามารถเปิดกล้องได้: ' + err.message, 3500);
                return;
            }
        }

        if (videoTrack) {
            if (STATE.localStream) {
                STATE.localStream.addTrack(videoTrack);
            } else {
                STATE.localStream = new MediaStream([videoTrack]);
            }

            const selfVideo = el('self-video');
            const pipCam    = el('pip-camera');
            if (selfVideo) {
                selfVideo.srcObject = new MediaStream([videoTrack]);
                selfVideo.style.display = 'block';
            }
            if (pipCam) pipCam.style.display = 'block';
            if (el('self-avatar-img')) el('self-avatar-img').style.display = 'none';
            STATE.camOn = true;

            // Send video track to connected peers
            STATE.peerConnections.forEach(pc => {
                try {
                    const senders = pc.getSenders();
                    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                    if (videoSender) {
                        videoSender.replaceTrack(videoTrack);
                    } else {
                        pc.addTrack(videoTrack, STATE.localStream);
                    }
                } catch (e) {}
            });
        }
    } else {
        if (STATE.localStream) {
            const videoTrack = STATE.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.stop();
                STATE.localStream.removeTrack(videoTrack);
            }
        }
        const selfVideo = el('self-video');
        const pipCam    = el('pip-camera');
        if (selfVideo) {
            selfVideo.style.display = 'none';
            selfVideo.srcObject = null;
        }
        if (pipCam) pipCam.style.display = 'none';
        if (el('self-avatar-img')) el('self-avatar-img').style.display = 'block';
        STATE.camOn = false;
    }

    el('ctrl-cam').classList.toggle('off', !STATE.camOn);
    el('ctrl-cam-icon').className = STATE.camOn ? 'bi bi-camera-video-fill' : 'bi bi-camera-video-off-fill';
    if (el('panel-cam-btn')) {
        el('panel-cam-btn').classList.toggle('muted', !STATE.camOn);
        el('panel-cam-btn').innerHTML = STATE.camOn ? '<i class="bi bi-camera-video-fill"></i>' : '<i class="bi bi-camera-video-off-fill"></i>';
    }

    broadcastMediaState();
}

// ── DISCORD-STYLE MULTI-SCREEN SHARING ─────────────────────────
function renderStreamSwitcher() {
    const bar = el('stream-switcher-bar');
    const pills = el('stream-switcher-pills');
    if (!bar || !pills) return;

    if (STATE.activeScreenSharers.size === 0) {
        bar.style.display = 'none';
        if (STATE.currentViewingSharer && !STATE.screenOn) {
            STATE.currentViewingSharer = null;
            const screenVideo = el('screen-video');
            if (screenVideo) {
                screenVideo.style.display = 'none';
                screenVideo.srcObject = null;
            }
            if (el('screen-placeholder')) el('screen-placeholder').style.display = 'flex';
            if (el('screen-label')) el('screen-label').style.display = 'none';
            if (el('main-screen-box')) el('main-screen-box').classList.remove('sharing');
        }
        return;
    }

    bar.style.display = 'flex';
    pills.innerHTML = '';

    // If currently viewing nothing or someone who stopped, pick first available
    if (!STATE.currentViewingSharer || !STATE.activeScreenSharers.has(STATE.currentViewingSharer)) {
        const firstKey = STATE.activeScreenSharers.keys().next().value;
        if (firstKey) {
            selectScreenStream(firstKey);
            return;
        }
    }

    STATE.activeScreenSharers.forEach((sharer, sName) => {
        const isSelected = (sName === STATE.currentViewingSharer);
        const btn = document.createElement('button');
        btn.className = `stream-pill-btn ${isSelected ? 'active' : ''}`;
        const isSelf = (sName === STATE.myName);
        const roleIcon = (sharer.role === 'host') ? '👩‍🏫' : '🎓';
        btn.innerHTML = `
            <span class="live-dot"></span>
            <span>${roleIcon} ${escapeHtml(sName)}${isSelf ? ' (คุณ)' : ''}</span>
            <i class="bi bi-display ms-1"></i>
        `;
        btn.onclick = (e) => {
            e.stopPropagation();
            selectScreenStream(sName);
        };
        pills.appendChild(btn);
    });
}

function selectScreenStream(targetName) {
    if (!targetName) return;

    STATE.currentViewingSharer = targetName;
    const isSelf = (targetName === STATE.myName);
    const screenVideo = el('screen-video');
    const placeholder = el('screen-placeholder');
    const label = el('screen-label');
    const box = el('main-screen-box');

    const mobSharer = el('mobile-sharer-name');
    if (mobSharer) {
        mobSharer.textContent = isSelf ? 'หน้าจอของคุณ' : `จอของ ${targetName}`;
    }

    let stream = null;
    if (isSelf) {
        stream = STATE.screenStream;
    } else {
        stream = STATE.remoteScreenStreams.get(targetName);
        // If stream not found or has no tracks, inspect peer connection receivers directly
        if (!stream || stream.getVideoTracks().length === 0) {
            const pc = STATE.peerConnections.get(targetName);
            if (pc) {
                const receivers = pc.getReceivers();
                const vReceiver = receivers.find(r => r.track && r.track.kind === 'video' && r.track.readyState !== 'ended');
                if (vReceiver && vReceiver.track) {
                    if (!stream) {
                        stream = new MediaStream();
                        STATE.remoteScreenStreams.set(targetName, stream);
                    }
                    if (!stream.getTracks().some(t => t.id === vReceiver.track.id)) {
                        stream.getVideoTracks().forEach(t => stream.removeTrack(t));
                        stream.addTrack(vReceiver.track);
                    }
                }
            }
        }
    }

    const hasValidTrack = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].readyState !== 'ended';

    if (hasValidTrack) {
        if (screenVideo) {
            screenVideo.srcObject = stream;
            screenVideo.style.display = 'block';
            screenVideo.play().catch(err => {
                console.warn('Autoplay unmuted blocked, retrying muted:', err);
                screenVideo.muted = true;
                screenVideo.play().catch(e => console.error('Play error:', e));
            });
        }
        if (placeholder) placeholder.style.display = 'none';
        if (box) box.classList.add('sharing');
    } else {
        if (screenVideo) screenVideo.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
        const hint = el('screen-hint');
        if (hint) hint.innerHTML = `กำลังรอสัญญาณภาพจาก <strong>${escapeHtml(targetName)}</strong>...`;

        // Request stream directly from the sharer via signaling broadcast
        if (!isSelf) {
            console.log(`[selectScreenStream] Stream for "${targetName}" not ready. Sending request_screen_stream...`);
            if (STATE.channel) {
                STATE.channel.send({
                    type: 'broadcast',
                    event: 'request_screen_stream',
                    payload: { requester: STATE.myName, target: targetName }
                });
            }

            if (STATE._screenStreamPoll) {
                clearInterval(STATE._screenStreamPoll);
                STATE._screenStreamPoll = null;
            }

            let tries = 0;
            STATE._screenStreamPoll = setInterval(() => {
                tries++;
                // Check if peer connection receivers have the video track now
                const pc = STATE.peerConnections.get(targetName);
                if (pc) {
                    const receivers = pc.getReceivers();
                    const vReceiver = receivers.find(r => r.track && r.track.kind === 'video' && r.track.readyState !== 'ended');
                    if (vReceiver && vReceiver.track) {
                        let s = STATE.remoteScreenStreams.get(targetName);
                        if (!s) {
                            s = new MediaStream();
                            STATE.remoteScreenStreams.set(targetName, s);
                        }
                        if (!s.getTracks().some(t => t.id === vReceiver.track.id)) {
                            s.getVideoTracks().forEach(t => s.removeTrack(t));
                            s.addTrack(vReceiver.track);
                        }
                    }
                }

                const s = STATE.remoteScreenStreams.get(targetName);
                if (s && s.getVideoTracks().length > 0 && s.getVideoTracks()[0].readyState !== 'ended') {
                    clearInterval(STATE._screenStreamPoll);
                    STATE._screenStreamPoll = null;
                    if (STATE.currentViewingSharer === targetName) {
                        const sv = el('screen-video');
                        if (sv) {
                            sv.srcObject = s;
                            sv.style.display = 'block';
                            sv.play().catch(err => {
                                sv.muted = true;
                                sv.play().catch(e => {});
                            });
                        }
                        if (placeholder) placeholder.style.display = 'none';
                        if (box) box.classList.add('sharing');
                    }
                } else {
                    // Retry request every 1.6s if not yet received
                    if (tries % 4 === 0 && tries < 28 && STATE.channel) {
                        STATE.channel.send({
                            type: 'broadcast',
                            event: 'request_screen_stream',
                            payload: { requester: STATE.myName, target: targetName }
                        });
                    }
                    if (tries >= 30) {
                        clearInterval(STATE._screenStreamPoll);
                        STATE._screenStreamPoll = null;
                    }
                }
            }, 400);
        }
    }

    if (label) label.style.display = 'none';
    renderStreamSwitcher();
}

function handleRemoteScreenShareStart(payload) {
    if (!payload || !payload.name || payload.name === STATE.myName) return;

    STATE.activeScreenSharers.set(payload.name, {
        name: payload.name,
        role: payload.role,
        isSelf: false
    });
    showToast('info', 'มีการแชร์หน้าจอ', `${payload.name} กำลังแชร์หน้าจอ`, 3000);

    // Auto select this screen for viewing without colliding WebRTC offers
    selectScreenStream(payload.name);
}

function handleRemoteScreenShareStop(payload) {
    if (!payload || !payload.name) return;
    STATE.activeScreenSharers.delete(payload.name);
    STATE.remoteScreenStreams.delete(payload.name);
    if (STATE.currentViewingSharer === payload.name) {
        STATE.currentViewingSharer = null;
        const screenVideo = el('screen-video');
        if (screenVideo) {
            screenVideo.style.display = 'none';
            screenVideo.srcObject = null;
        }
        if (el('screen-placeholder')) el('screen-placeholder').style.display = 'flex';
        if (el('main-screen-box')) el('main-screen-box').classList.remove('sharing');
    }
    renderStreamSwitcher();
}

async function toggleScreenShare() {
    if (STATE.roomStatus === 'ENDED') return;

    if (!STATE.screenOn) {
        try {
            STATE.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            STATE.screenOn = true;

            // Register in active sharers
            STATE.activeScreenSharers.set(STATE.myName, {
                name: STATE.myName,
                role: STATE.myRole,
                isSelf: true,
                stream: STATE.screenStream
            });

            // Select own screen
            selectScreenStream(STATE.myName);

            // Broadcast start event
            if (STATE.channel) {
                STATE.channel.send({
                    type: 'broadcast',
                    event: 'screen_share_start',
                    payload: { name: STATE.myName, role: STATE.myRole }
                });
            }

            // Send screen track to all connected peers
            const screenTrack = STATE.screenStream.getVideoTracks()[0];

            // Re-negotiate on all existing peer connections
            for (const [peerName, pc] of STATE.peerConnections.entries()) {
                try {
                    const senders = pc.getSenders();
                    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                    if (videoSender) {
                        await videoSender.replaceTrack(screenTrack);
                    } else {
                        pc.addTrack(screenTrack, STATE.screenStream);
                    }
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (STATE.channel) {
                        STATE.channel.send({
                            type: 'broadcast',
                            event: 'signal_offer',
                            payload: {
                                target: peerName,
                                sender: STATE.myName,
                                sdp: offer
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[Screen track renegotiation error]:', e);
                }
            }

            // If any participant doesn't have a peer connection yet, initiate
            STATE.participants.forEach((p, pName) => {
                if (pName !== STATE.myName && !STATE.peerConnections.has(pName)) {
                    initiatePeerConnection(pName);
                }
            });

            screenTrack.onended = () => {
                stopScreenShare();
            };

            showToast('info', 'กำลังแชร์หน้าจอ', 'ทั้งครูและนักเรียนสามารถรับชมหน้าจอของคุณได้แล้ว', 3000);
        } catch (err) {
            if (err.name !== 'NotAllowedError') {
                showToast('error', 'แชร์หน้าจอ', err.message, 3000);
            }
            return;
        }
    } else {
        stopScreenShare();
    }

    el('ctrl-screen').classList.toggle('active', STATE.screenOn);
    broadcastMediaState();
}

function stopScreenShare() {
    if (STATE.screenStream) {
        STATE.screenStream.getTracks().forEach(t => t.stop());
        STATE.screenStream = null;
    }
    STATE.screenOn = false;
    STATE.activeScreenSharers.delete(STATE.myName);

    if (STATE.channel) {
        STATE.channel.send({
            type: 'broadcast',
            event: 'screen_share_stop',
            payload: { name: STATE.myName }
        });
    }

    // Restore camera video track if camera is on
    const camTrack = STATE.localStream?.getVideoTracks()[0] || null;
    STATE.peerConnections.forEach((pc) => {
        try {
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) videoSender.replaceTrack(camTrack);
        } catch (e) {}
    });

    if (STATE.currentViewingSharer === STATE.myName) {
        STATE.currentViewingSharer = null;
    }

    el('ctrl-screen').classList.remove('active');
    renderStreamSwitcher();
    broadcastMediaState();
}

function broadcastMediaState() {
    if (!STATE.channel) return;
    STATE.channel.track({
        id:       STATE.myId,
        name:     STATE.myName,
        role:     STATE.myRole,
        micOn:    STATE.micOn,
        camOn:    STATE.camOn,
        screenOn: STATE.screenOn
    });
}

function updatePeerMediaState(payload) {
    const tile = el(`video-tile-${payload.name}`);
    if (tile) {
        const badge = tile.querySelector('.tile-mic-badge');
        if (badge) {
            badge.classList.toggle('muted', !payload.micOn);
            badge.innerHTML = payload.micOn ? '<i class="bi bi-mic-fill"></i>' : '<i class="bi bi-mic-mute-fill"></i>';
        }
    }
}

// ── WEBRTC CALL SETUP ──────────────────────────────────────────
async function initiatePeerConnection(peerName) {
    if (!peerName || peerName === STATE.myName) return;
    try {
        const pc = createPeerConnection(peerName);
        if (STATE.localStream) {
            STATE.localStream.getTracks().forEach(t => {
                if (!pc.getSenders().some(s => s.track === t)) {
                    try { pc.addTrack(t, STATE.localStream); } catch(e){}
                }
            });
        }
        if (STATE.screenStream) {
            STATE.screenStream.getTracks().forEach(t => {
                if (!pc.getSenders().some(s => s.track === t)) {
                    try { pc.addTrack(t, STATE.screenStream); } catch(e){}
                }
            });
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'signal_offer',
                payload: {
                    target: peerName,
                    sender: STATE.myName,
                    sdp:    offer
                }
            });
        }
    } catch (err) {
        console.warn('[initiatePeerConnection error]:', err);
    }
}

function createPeerConnection(peerName) {
    if (STATE.peerConnections.has(peerName)) {
        return STATE.peerConnections.get(peerName);
    }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc._pendingIceCandidates = [];
    STATE.peerConnections.set(peerName, pc);

    pc.onicecandidate = ({ candidate }) => {
        if (candidate && STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'signal_ice',
                payload: {
                    target:    peerName,
                    sender:    STATE.myName,
                    candidate: candidate
                }
            });
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`[ICE ${peerName}] state:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
            try { pc.restartIce(); } catch(e){}
        }
    };

    pc.ontrack = (event) => {
        const track = event.track;
        console.log(`[ontrack from ${peerName}] kind:`, track.kind);

        let peerStream = STATE.remoteScreenStreams.get(peerName);
        if (!peerStream) {
            peerStream = new MediaStream();
            STATE.remoteScreenStreams.set(peerName, peerStream);
        }

        // Cleanly combine video and audio tracks without overwriting
        if (track.kind === 'video') {
            peerStream.getVideoTracks().forEach(t => {
                if (t.id !== track.id) peerStream.removeTrack(t);
            });
        } else if (track.kind === 'audio') {
            peerStream.getAudioTracks().forEach(t => {
                if (t.id !== track.id) peerStream.removeTrack(t);
            });
        }
        if (!peerStream.getTracks().some(t => t.id === track.id)) {
            peerStream.addTrack(track);
        }

        const attachAndPlayScreen = () => {
            if (track.kind === 'video') {
                if (!STATE.currentViewingSharer || STATE.currentViewingSharer === peerName || STATE.currentViewingSharer === STATE.myName) {
                    STATE.currentViewingSharer = peerName;
                    const screenVideo = el('screen-video');
                    if (screenVideo) {
                        screenVideo.srcObject = peerStream;
                        screenVideo.style.display = 'block';
                        screenVideo.play().catch(err => {
                            console.warn('Autoplay unmuted blocked, retrying muted:', err);
                            screenVideo.muted = true;
                            screenVideo.play().catch(e => console.error('Play error:', e));
                        });
                        if (el('screen-placeholder')) el('screen-placeholder').style.display = 'none';
                    }
                    if (el('main-screen-box')) el('main-screen-box').classList.add('sharing');
                }
            }
        };

        attachAndPlayScreen();
        track.onunmute = () => {
            attachAndPlayScreen();
        };

        addRemoteTrack(peerName, peerStream);
    };

    return pc;
}

async function handleSignalOffer(payload) {
    if (!payload || payload.target !== STATE.myName) return;
    const pc = createPeerConnection(payload.sender);

    try {
        const isPolite = STATE.myName < payload.sender;
        const offerCollision = pc.signalingState !== 'stable';
        if (offerCollision) {
            if (!isPolite) {
                console.warn('[WebRTC] Impolite peer ignoring collision offer from', payload.sender);
                return;
            }
            await pc.setLocalDescription({ type: 'rollback' });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Drain any pending ICE candidates
        if (pc._pendingIceCandidates && pc._pendingIceCandidates.length > 0) {
            for (const cand of pc._pendingIceCandidates) {
                try {
                    await pc.addIceCandidate(cand);
                } catch (e) {}
            }
            pc._pendingIceCandidates = [];
        }

        // Immediately check if incoming offer has a video receiver to render
        const videoReceiver = pc.getReceivers().find(r => r.track && r.track.kind === 'video' && r.track.readyState !== 'ended');
        if (videoReceiver && videoReceiver.track) {
            let peerStream = STATE.remoteScreenStreams.get(payload.sender);
            if (!peerStream) {
                peerStream = new MediaStream();
                STATE.remoteScreenStreams.set(payload.sender, peerStream);
            }
            if (!peerStream.getTracks().some(t => t.id === videoReceiver.track.id)) {
                peerStream.getVideoTracks().forEach(t => peerStream.removeTrack(t));
                peerStream.addTrack(videoReceiver.track);
            }
            if (STATE.currentViewingSharer === payload.sender) {
                const screenVideo = el('screen-video');
                if (screenVideo) {
                    screenVideo.srcObject = peerStream;
                    screenVideo.style.display = 'block';
                    screenVideo.play().catch(e => {
                        screenVideo.muted = true;
                        screenVideo.play().catch(() => {});
                    });
                    if (el('screen-placeholder')) el('screen-placeholder').style.display = 'none';
                }
                if (el('main-screen-box')) el('main-screen-box').classList.add('sharing');
            }
        }

        if (STATE.localStream) {
            STATE.localStream.getTracks().forEach(t => {
                if (!pc.getSenders().some(s => s.track === t)) {
                    try { pc.addTrack(t, STATE.localStream); } catch(e){}
                }
            });
        }
        if (STATE.screenStream) {
            STATE.screenStream.getTracks().forEach(t => {
                if (!pc.getSenders().some(s => s.track === t)) {
                    try { pc.addTrack(t, STATE.screenStream); } catch(e){}
                }
            });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'signal_answer',
                payload: {
                    target: payload.sender,
                    sender: STATE.myName,
                    sdp:    answer
                }
            });
        }
    } catch (err) {
        console.error('[handleSignalOffer error]:', err);
    }
}

async function handleSignalAnswer(payload) {
    if (!payload || payload.target !== STATE.myName) return;
    const pc = STATE.peerConnections.get(payload.sender);
    if (!pc) return;

    try {
        if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            // Drain any pending ICE candidates
            if (pc._pendingIceCandidates && pc._pendingIceCandidates.length > 0) {
                for (const cand of pc._pendingIceCandidates) {
                    try {
                        await pc.addIceCandidate(cand);
                    } catch (e) {}
                }
                pc._pendingIceCandidates = [];
            }

            // Immediately check if answer finalized video receiver
            const videoReceiver = pc.getReceivers().find(r => r.track && r.track.kind === 'video' && r.track.readyState !== 'ended');
            if (videoReceiver && videoReceiver.track) {
                let peerStream = STATE.remoteScreenStreams.get(payload.sender);
                if (!peerStream) {
                    peerStream = new MediaStream();
                    STATE.remoteScreenStreams.set(payload.sender, peerStream);
                }
                if (!peerStream.getTracks().some(t => t.id === videoReceiver.track.id)) {
                    peerStream.getVideoTracks().forEach(t => peerStream.removeTrack(t));
                    peerStream.addTrack(videoReceiver.track);
                }
                if (STATE.currentViewingSharer === payload.sender) {
                    const screenVideo = el('screen-video');
                    if (screenVideo) {
                        screenVideo.srcObject = peerStream;
                        screenVideo.style.display = 'block';
                        screenVideo.play().catch(e => {
                            screenVideo.muted = true;
                            screenVideo.play().catch(() => {});
                        });
                        if (el('screen-placeholder')) el('screen-placeholder').style.display = 'none';
                    }
                    if (el('main-screen-box')) el('main-screen-box').classList.add('sharing');
                }
            }
        }
    } catch (err) {
        console.error('[handleSignalAnswer error]:', err);
    }
}

async function handleSignalIce(payload) {
    if (!payload || payload.target !== STATE.myName) return;
    const pc = STATE.peerConnections.get(payload.sender);
    if (!pc || !payload.candidate) return;

    try {
        const iceCandidate = new RTCIceCandidate(payload.candidate);
        if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(iceCandidate);
        } else {
            if (!pc._pendingIceCandidates) pc._pendingIceCandidates = [];
            pc._pendingIceCandidates.push(iceCandidate);
        }
    } catch (e) {}
}

function addRemoteTrack(name, stream) {
    let tile = el(`video-tile-${name}`);
    if (!tile) {
        tile = document.createElement('div');
        tile.className = 'video-tile';
        tile.id = `video-tile-${name}`;
        tile.innerHTML = `
            <video autoplay playsinline style="width:100%;height:100%;object-fit:cover"></video>
            <img class="tile-avatar" src="https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(name)}" alt="${escapeHtml(name)}" style="display:none">
            <div class="tile-name">${escapeHtml(name)}</div>
            <div class="tile-mic-badge"><i class="bi bi-mic-fill"></i></div>
        `;
        el('video-grid').appendChild(tile);
    }
    const video = tile.querySelector('video');
    if (video) video.srcObject = stream;
}

function closePeerConnection(name) {
    const pc = STATE.peerConnections.get(name);
    if (pc) {
        try { pc.close(); } catch(e){}
        STATE.peerConnections.delete(name);
    }
}

// Send the current screen share track to a specific peer (used when a participant joins mid-share or requests screen)
async function sendScreenTrackToPeer(peerName) {
    if (!STATE.screenStream || !STATE.screenOn) return;

    const screenTrack = STATE.screenStream.getVideoTracks()[0];
    if (!screenTrack) return;

    try {
        let pc = STATE.peerConnections.get(peerName);
        if (!pc || pc.connectionState === 'closed' || pc.signalingState === 'closed') {
            pc = createPeerConnection(peerName);
        }

        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
            await videoSender.replaceTrack(screenTrack);
        } else {
            pc.addTrack(screenTrack, STATE.screenStream);
        }

        // Screen audio track if present
        const audioTracks = STATE.screenStream.getAudioTracks();
        if (audioTracks.length > 0) {
            const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
            if (audioSender) {
                try { await audioSender.replaceTrack(audioTracks[0]); } catch (e) {}
            } else {
                try { pc.addTrack(audioTracks[0], STATE.screenStream); } catch (e) {}
            }
        }

        let offer;
        try {
            offer = await pc.createOffer();
        } catch (err) {
            console.warn('[sendScreenTrackToPeer] createOffer failed on existing pc, recreating...', err);
            try { pc.close(); } catch (e) {}
            STATE.peerConnections.delete(peerName);
            pc = createPeerConnection(peerName);
            pc.addTrack(screenTrack, STATE.screenStream);
            offer = await pc.createOffer();
        }

        await pc.setLocalDescription(offer);

        if (STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'signal_offer',
                payload: {
                    target: peerName,
                    sender: STATE.myName,
                    sdp: offer
                }
            });
            STATE.channel.send({
                type: 'broadcast',
                event: 'screen_share_start',
                payload: { name: STATE.myName, role: STATE.myRole }
            });
        }
    } catch (e) {
        console.warn('[sendScreenTrackToPeer error]:', e);
    }
}

// ── REACTIONS & RAISE HAND ─────────────────────────────────────
function sendReaction() {
    const emojis = ['👍', '👏', '❤️', '🔥', '🎉', '💡', '😂', '✋'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    showFloatingReaction(emoji, 'คุณ');

    if (STATE.channel) {
        STATE.channel.send({
            type: 'broadcast',
            event: 'reaction',
            payload: { emoji, name: STATE.myName }
        });
    }
}

function showFloatingReaction(emoji, name) {
    const floater = document.createElement('div');
    floater.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: ${20 + Math.random() * 60}%;
        font-size: 2.2rem;
        z-index: 9999;
        pointer-events: none;
        animation: floatUp 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    `;
    floater.textContent = emoji;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 2300);
}

function raiseHand() {
    showToast('info', 'ยกมือถาม', 'คุณได้ยกมือแจ้งเตือนครูผู้สอนแล้ว', 2500);
    if (STATE.channel) {
        STATE.channel.send({
            type: 'broadcast',
            event: 'raise_hand',
            payload: { name: STATE.myName }
        });
    }
}

function handleRaiseHandEvent(payload) {
    showToast('warning', '✋ มีคนยกมือถาม!', `${payload.name} กำลังยกมือขอสอบถาม`, 4500);
}

function toggleRoomLock() {
    if (!STATE.isHost) return;
    STATE.isLocked = !STATE.isLocked;
    el('btn-lock-room').classList.toggle('active', STATE.isLocked);
    el('btn-lock-room').innerHTML = STATE.isLocked ? '<i class="bi bi-lock-fill text-danger"></i> ปลดล็อก' : '<i class="bi bi-unlock-fill"></i> ล็อกห้อง';
    showToast('info', 'สถานะห้อง', STATE.isLocked ? 'ห้องถูกล็อกแล้ว' : 'ปลดล็อกห้องแล้ว', 2500);

    if (window.supabaseClient) {
        supabaseClient.from('live_studio_rooms').update({ is_locked: STATE.isLocked }).eq('pin', STATE.roomPin);
    }
}

// ── UI TABS & CHANNELS ─────────────────────────────────────────
function switchTab(tab) {
    ['chat', 'participants', 'files'].forEach(t => {
        const btn   = el(`tab-${t}`);
        const panel = el(`panel-${t}`);
        if (btn)   btn.classList.toggle('active', t === tab);
        if (panel) panel.style.display = (t === tab) ? 'flex' : 'none';
    });

    // Synchronize left channel active indicator
    if (tab === 'files') {
        $$('.channel-item').forEach(c => c.classList.remove('active'));
        const chFiles = el('ch-files');
        if (chFiles) chFiles.classList.add('active');
    } else if (tab === 'chat') {
        $$('.channel-item').forEach(c => c.classList.remove('active'));
        const chMain = el('ch-main');
        if (chMain) chMain.classList.add('active');
    }
}

function switchChannel(ch) {
    $$('.channel-item').forEach(c => c.classList.remove('active'));
    const target = el(`ch-${ch}`);
    if (target) target.classList.add('active');
    if (ch === 'files') switchTab('files');
    else if (ch === 'main') switchTab('chat');
}

// ── MOBILE DRAWER & TABS ───────────────────────────────────────
function toggleMobileDrawer() {
    const chat = document.querySelector('.studio-chat');
    const backdrop = el('mobile-drawer-backdrop');
    if (!chat) return;
    const isOpen = chat.classList.toggle('mobile-open');
    if (backdrop) backdrop.classList.toggle('active', isOpen);
}

function openMobileTab(tab) {
    switchTab(tab);
    const chat = document.querySelector('.studio-chat');
    const backdrop = el('mobile-drawer-backdrop');
    if (chat && !chat.classList.contains('mobile-open')) {
        chat.classList.add('mobile-open');
        if (backdrop) backdrop.classList.add('active');
    }
}

// ── QR CODE & SHARE ────────────────────────────────────────────
let qrInstance = null;

function openQrModal() {
    el('modal-pin-display').textContent = STATE.roomPin;
    const joinUrl = buildJoinUrl();
    el('modal-qr-url').textContent = joinUrl;

    const canvasContainer = el('modal-qr-canvas');
    canvasContainer.innerHTML = '';
    if (window.QRCode) {
        qrInstance = new QRCode(canvasContainer, {
            text:         joinUrl,
            width:        220,
            height:       220,
            colorDark:    '#0f172a',
            colorLight:   '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }
    el('qr-modal').style.display = 'flex';
}

function closeQrModal() {
    el('qr-modal').style.display = 'none';
}

function buildJoinUrl() {
    const loc = window.location;
    return `${loc.origin}${loc.pathname}?pin=${STATE.roomPin}`;
}

function copyJoinUrl() {
    navigator.clipboard.writeText(buildJoinUrl()).then(() => {
        showToast('success', 'คัดลอกสำเร็จ', 'คัดลอกลิงก์ห้องเรียนเรียบร้อยแล้ว', 2500);
    });
}

function copyPin() {
    navigator.clipboard.writeText(STATE.roomPin).then(() => {
        showToast('success', 'คัดลอก PIN', `PIN: ${STATE.roomPin}`, 2000);
    });
}

// ── CLOCK & LEAVE ──────────────────────────────────────────────
function startClock() {
    STATE.clockInterval = setInterval(() => {
        if (!STATE.sessionStart) return;
        const diff = Math.floor((Date.now() - STATE.sessionStart) / 1000);
        const h = String(Math.floor(diff / 3600)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        el('stage-time').textContent = `${h}:${m}:${s}`;
    }, 1000);
}

function leaveRoom() {
    sessionStorage.removeItem('gyver_active_live_room');
    localStorage.removeItem('gyver_active_live_room');
    try {
        window.parent.postMessage({
            action: 'updateLiveRoomState',
            pin: null
        }, '*');
    } catch (e) {}
    if (STATE.localStream) STATE.localStream.getTracks().forEach(t => t.stop());
    if (STATE.screenStream) STATE.screenStream.getTracks().forEach(t => t.stop());
    if (STATE.channel) STATE.channel.unsubscribe();
    window.location.href = 'live_studio.html';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── FULLSCREEN TOGGLE ─────────────────────────────────────────
function toggleFullScreen() {
    const target = el('main-screen-box') || el('screen-video');
    if (!target) return;

    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

    if (!isFs) {
        if (target.requestFullscreen) {
            target.requestFullscreen().catch(err => {
                const video = el('screen-video');
                if (video && video.requestFullscreen) video.requestFullscreen();
            });
        } else if (target.webkitRequestFullscreen) {
            target.webkitRequestFullscreen();
        } else if (target.mozRequestFullScreen) {
            target.mozRequestFullScreen();
        } else if (target.msRequestFullscreen) {
            target.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

function updateFullscreenUI() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    const box = el('main-screen-box');
    if (box) {
        if (isFs) box.classList.add('is-fullscreen');
        else box.classList.remove('is-fullscreen');
    }
    const btns = document.querySelectorAll('.fullscreen-toggle-btn');
    btns.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isFs ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
        }
        btn.setAttribute('title', isFs ? 'ออกจากโหมดเต็มจอ (ESC หรือ F)' : 'เต็มจอ (Fullscreen - กด F)');
    });
}

document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
document.addEventListener('mozfullscreenchange', updateFullscreenUI);
document.addEventListener('MSFullscreenChange', updateFullscreenUI);

// Double-click on main-screen-box to toggle fullscreen
document.addEventListener('DOMContentLoaded', () => {
    const box = el('main-screen-box');
    if (box) {
        box.addEventListener('dblclick', (e) => {
            if (e.target.closest('button')) return;
            toggleFullScreen();
        });
    }
});

// Shortcut 'F' for fullscreen toggle
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea' && !document.activeElement?.isContentEditable) {
            e.preventDefault();
            toggleFullScreen();
        }
    }
});

