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

    // WebRTC
    localStream:   null,
    screenStream:  null,
    peerConnections: new Map(), // name -> RTCPeerConnection

    // Persistent items
    chatMessages:  [],
    sharedFiles:   [],

    // Timers
    clockInterval: null,
};

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// ── DOM HELPERS ────────────────────────────────────────────────
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
function el(id)  { return document.getElementById(id); }

// ── INITIALIZATION ON PAGE LOAD ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Read URL query params
    const params = new URLSearchParams(window.location.search);
    const pinParam = (params.get('pin') || '').trim().toUpperCase();
    const nameParam = (params.get('name') || '').trim();
    const roleParam = (params.get('role') || '').trim().toLowerCase();

    if (pinParam) {
        el('input-pin').value = pinParam;
        el('input-pin').readOnly = true;
        el('input-pin').style.background = 'rgba(255,255,255,0.05)';
    }

    // Check if host from localStorage
    const hostRooms = getStoredHostRooms();
    const isOwner = hostRooms[pinParam] !== undefined;

    if (roleParam === 'host' || isOwner) {
        selectRole('host');
    } else {
        selectRole('student');
    }

    if (nameParam) {
        el('input-name').value = nameParam;
    } else {
        const savedName = localStorage.getItem('gyver_user_name') || '';
        if (savedName) el('input-name').value = savedName;
    }

    syncJoinBtn();

    // If both pin and name are available, auto-enter!
    if (pinParam && el('input-name').value.trim()) {
        enterStudio();
    }
});

// ── LOCAL STORAGE HELPERS ──────────────────────────────────────
function getStoredHostRooms() {
    try {
        return JSON.parse(localStorage.getItem('gyver_live_host_rooms') || '{}');
    } catch {
        return {};
    }
}

function saveHostRoom(pin, secret) {
    const rooms = getStoredHostRooms();
    rooms[pin] = secret || 'host';
    localStorage.setItem('gyver_live_host_rooms', JSON.stringify(rooms));
}

// ── JOIN SCREEN LOGIC ──────────────────────────────────────────
function selectRole(role) {
    STATE.myRole = role;
    STATE.isHost = (role === 'host');
    el('role-host').classList.toggle('active', role === 'host');
    el('role-host').classList.toggle('host',   role === 'host');
    el('role-student').classList.toggle('active', role === 'student');
    el('role-student').classList.toggle('student', role === 'student');
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
    const pin  = el('input-pin').value.trim().toUpperCase();
    const name = el('input-name').value.trim();
    if (!pin || !name) return;

    localStorage.setItem('gyver_user_name', name);

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
    el('self-tile-name').textContent    = `${name} (คุณ)`;

    const avatarSeed = encodeURIComponent(name);
    const avatarUrl  = `https://api.dicebear.com/8.x/thumbs/svg?seed=${avatarSeed}`;
    el('self-avatar-img').src = avatarUrl;
    el('up-avatar').src       = avatarUrl;

    if (STATE.isHost) {
        el('btn-lock-room').style.display = '';
        el('btn-end-session').style.display = '';
        el('btn-delete-room').style.display = '';
        el('btn-delete-archived').style.display = '';
        el('ctrl-end-label').textContent  = 'จบ/ออก';
    }

    startClock();
    addParticipant({ name, role: STATE.myRole, micOn: false, camOn: false, speaking: false });

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

                if (STATE.roomStatus === 'ENDED') {
                    applyEndedRoomState();
                }
            } else if (STATE.isHost) {
                // Auto-create room record if host
                await supabaseClient.from('live_studio_rooms').insert([{
                    pin,
                    title: STATE.roomTitle,
                    host_name: name,
                    status: 'LIVE'
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

// ── LOAD DB HISTORY (CHAT & FILES) ─────────────────────────────
async function loadDbHistory(pin) {
    if (!window.supabaseClient) return;

    try {
        // 1. Load Messages
        const { data: messages, error: msgErr } = await supabaseClient
            .from('live_studio_messages')
            .select('*')
            .eq('room_pin', pin)
            .order('created_at', { ascending: true });

        if (msgErr) {
            console.warn('💡 [Supabase Notice] ยังไม่ได้รันคำสั่ง SQL สร้างตาราง live_studio_messages:', msgErr.message);
        } else if (messages && messages.length > 0) {
            messages.forEach(msg => {
                renderChatMessage({
                    name:      msg.sender_name,
                    role:      msg.sender_role,
                    text:      msg.message,
                    timestamp: new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                    avatar:    msg.sender_avatar,
                    isHistory: true
                });
            });
        }

        // 2. Load Files
        const { data: files, error: fileErr } = await supabaseClient
            .from('live_studio_files')
            .select('*')
            .eq('room_pin', pin)
            .order('created_at', { ascending: false });

        if (fileErr) {
            console.warn('💡 [Supabase Notice] ยังไม่ได้รันคำสั่ง SQL สร้างตาราง live_studio_files:', fileErr.message);
        } else if (files && files.length > 0) {
            files.forEach(f => {
                addFileToPanel({
                    name:      f.file_name,
                    url:       f.file_url,
                    size:      f.file_size,
                    type:      f.file_type,
                    uploader:  f.sender_name,
                    timestamp: new Date(f.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                });
            });
        }
    } catch (err) {
        console.warn('[loadDbHistory] Graceful skip:', err.message);
    }
}

// ── CLOUDINARY FILE UPLOAD ─────────────────────────────────────
async function handleFileUpload(input) {
    const file = input.files?.[0];
    if (!file) return;

    const progressEl = el('file-upload-progress');
    const statusText = el('upload-status-text');

    if (progressEl) {
        progressEl.style.display = 'flex';
        statusText.textContent = `กำลังอัปโหลด "${file.name}" ขึ้น Cloudinary...`;
    }

    try {
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY.uploadPreset);

        const res = await fetch(url, { method: 'POST', body: formData });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const fileUrl = data.secure_url || data.url;
        const fileSize = file.size || data.bytes || 0;
        const fileName = file.name;
        const fileType = file.type || data.format || 'file';

        // 1. Save file to Supabase DB
        if (window.supabaseClient) {
            await supabaseClient.from('live_studio_files').insert([{
                room_pin:    STATE.roomPin,
                sender_name: STATE.myName,
                file_name:   fileName,
                file_url:    fileUrl,
                file_type:   fileType,
                file_size:   fileSize
            }]);
        }

        // 2. Add to local Files tab
        addFileToPanel({
            name:     fileName,
            url:      fileUrl,
            size:     fileSize,
            type:     fileType,
            uploader: STATE.myName,
            timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        });

        // 3. Post a message to chat with permanent download link
        const sizeFormatted = formatFileSize(fileSize);
        const chatMsg = `📎 ได้แนบไฟล์: [${fileName}](${fileUrl}) (${sizeFormatted})`;
        await saveAndBroadcastMessage(chatMsg);

        // 4. Realtime broadcast for other users
        if (STATE.channel) {
            STATE.channel.send({
                type: 'broadcast',
                event: 'file_shared',
                payload: {
                    name:      fileName,
                    url:       fileUrl,
                    size:      fileSize,
                    type:      fileType,
                    uploader:  STATE.myName,
                    timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                }
            });
        }

        showToast('success', 'อัปโหลดสำเร็จ', `ไฟล์ "${fileName}" ถูกบันทึกลง Cloudinary เรียบร้อยแล้ว`, 3500);

    } catch (err) {
        console.error('[Cloudinary Upload Error]', err);
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

function addFileToPanel(f) {
    const list = el('files-list');
    const emptyState = el('files-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    // Update count badge
    STATE.sharedFiles.push(f);
    el('files-badge-count').textContent = STATE.sharedFiles.length;
    el('tab-files-count').textContent   = STATE.sharedFiles.length;

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

    let iconClass = 'bi-file-earmark';
    if (f.type.includes('image') || f.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) iconClass = 'bi-file-earmark-image';
    else if (f.type.includes('pdf')) iconClass = 'bi-file-earmark-pdf';
    else if (f.type.includes('video')) iconClass = 'bi-file-earmark-play';
    else if (f.type.includes('zip') || f.type.includes('rar')) iconClass = 'bi-file-earmark-zip';

    fileCard.innerHTML = `
        <div style="font-size:1.6rem;color:#818cf8"><i class="bi ${iconClass}"></i></div>
        <div style="flex:1;min-width:0">
            <div style="font-size:0.85rem;font-weight:600;color:#f2f3f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
            <div style="font-size:0.72rem;color:var(--discord-muted)">${escapeHtml(f.uploader)} · ${formatFileSize(f.size)} · ${f.timestamp || ''}</div>
        </div>
        <a href="${escapeHtml(f.url)}" target="_blank" download="${escapeHtml(f.name)}" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(88,101,242,0.15);color:#818cf8;text-decoration:none;border:1px solid rgba(88,101,242,0.3)">
            <i class="bi bi-download"></i>
        </a>
    `;

    list.prepend(fileCard);
}

// ── REALTIME & SIGNALING ───────────────────────────────────────
function setupRealtimeChannel(pin) {
    if (!window.supabaseClient) {
        console.warn('[Realtime] supabaseClient not ready');
        return;
    }

    const channelName = `live_room_${pin}`;
    STATE.channel = supabaseClient.channel(channelName, {
        config: { presence: { key: STATE.myName } }
    });

    // 1. Broadcast Events
    STATE.channel
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
            renderChatMessage(payload);
        })
        .on('broadcast', { event: 'file_shared' }, ({ payload }) => {
            addFileToPanel(payload);
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
            if (p && p.name !== STATE.myName) {
                showToast('info', 'มีผู้เข้าร่วม', `${p.name} เข้าร่วมห้องเรียน`, 2000);
                // If host, offer WebRTC connection to student
                if (STATE.isHost && (STATE.camOn || STATE.micOn || STATE.screenOn)) {
                    initiatePeerConnection(p.name);
                }
            }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            const p = leftPresences[0];
            if (p) {
                removeParticipant(p.name);
                closePeerConnection(p.name);
            }
        });

    // Subscribe
    STATE.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await STATE.channel.track({
                name:     STATE.myName,
                role:     STATE.myRole,
                micOn:    STATE.micOn,
                camOn:    STATE.camOn,
                screenOn: STATE.screenOn,
            });
        }
    });
}

// ── CHAT SYSTEM (WITH DB PERSISTENCE) ──────────────────────────
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

    // 1. Render locally immediately
    renderChatMessage(msgObj);

    // 2. Save to Supabase DB (persistent)
    if (window.supabaseClient) {
        try {
            await supabaseClient.from('live_studio_messages').insert([{
                room_pin:      STATE.roomPin,
                sender_name:   STATE.myName,
                sender_role:   STATE.myRole,
                sender_avatar: avatarUrl,
                message:       text
            }]);
        } catch (err) {
            console.error('[Save Message DB Error]', err);
        }
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

function renderChatMessage(msg) {
    const container = el('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${msg.role === 'host' ? 'host-msg' : ''}`;

    const roleBadge = msg.role === 'host' ? `<span class="host-badge">ครูผู้สอน</span>` : '';
    const avatarSrc = msg.avatar || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(msg.name)}`;

    // Convert markdown links e.g. [text](url) to HTML
    let bodyHtml = escapeHtml(msg.text);
    bodyHtml = bodyHtml.replace(/\[(.*?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" download style="color:#60a5fa;text-decoration:underline;word-break:break-all"><i class="bi bi-file-earmark-arrow-down me-1"></i>$1</a>');

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
        localStorage.setItem('gyver_live_host_rooms', JSON.stringify(hostRooms));

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

    for (const key in presenceState) {
        const presences = presenceState[key];
        presences.forEach(p => {
            count++;
            allUsers.push(p);
        });
    }

    el('online-count').textContent = `${count} คนออนไลน์`;
    el('vc-member-count').textContent = count;

    allUsers.forEach(p => {
        // Participants Tab Item
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.innerHTML = `
            <img class="participant-avatar" src="https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(p.name)}" alt="${escapeHtml(p.name)}">
            <div class="participant-info">
                <div class="participant-name">${escapeHtml(p.name)}${p.name === STATE.myName ? ' (คุณ)' : ''}</div>
                <div class="participant-role">${p.role === 'host' ? 'ครูผู้สอน' : 'นักเรียน'}</div>
            </div>
            <div class="participant-icons">
                <i class="bi ${p.micOn ? 'bi-mic-fill text-success' : 'bi-mic-mute-fill text-muted'}"></i>
                <i class="bi ${p.camOn ? 'bi-camera-video-fill text-success' : 'bi-camera-video-off-fill text-muted'}"></i>
            </div>
        `;
        list.appendChild(item);

        // Sidebar Voice Channel Member
        if (voiceList) {
            const vMember = document.createElement('div');
            vMember.className = 'voice-member';
            vMember.innerHTML = `
                <img src="https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(p.name)}" alt="${escapeHtml(p.name)}">
                <span>${escapeHtml(p.name)}</span>
                <i class="bi ${p.micOn ? 'bi-mic-fill' : 'bi-mic-mute-fill'} ms-auto" style="font-size:.8rem;color:${p.micOn ? '#23a55a' : '#80848e'}"></i>
            `;
            voiceList.appendChild(vMember);
        }
    });
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

    if (!STATE.localStream) {
        try {
            STATE.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            showToast('error', 'ไมค์', 'ไม่สามารถเข้าถึงไมโครโฟนได้', 3000);
            return;
        }
    }

    const audioTrack = STATE.localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        STATE.micOn = audioTrack.enabled;
    } else {
        STATE.micOn = !STATE.micOn;
    }

    el('ctrl-mic').classList.toggle('off', !STATE.micOn);
    el('ctrl-mic-icon').className = STATE.micOn ? 'bi bi-mic-fill' : 'bi bi-mic-mute-fill';
    el('self-mic-badge').classList.toggle('muted', !STATE.micOn);
    el('self-mic-badge').innerHTML = STATE.micOn ? '<i class="bi bi-mic-fill"></i>' : '<i class="bi bi-mic-mute-fill"></i>';

    broadcastMediaState();
}

async function toggleCamera() {
    if (STATE.roomStatus === 'ENDED') return;

    if (!STATE.camOn) {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = videoStream.getVideoTracks()[0];

            if (STATE.localStream) {
                STATE.localStream.addTrack(videoTrack);
            } else {
                STATE.localStream = videoStream;
            }

            const selfVideo = el('self-video');
            selfVideo.srcObject = new MediaStream([videoTrack]);
            selfVideo.style.display = 'block';
            el('self-avatar-img').style.display = 'none';
            STATE.camOn = true;
        } catch (err) {
            showToast('error', 'กล้อง', 'ไม่สามารถเปิดกล้องได้: ' + err.message, 3000);
            return;
        }
    } else {
        if (STATE.localStream) {
            const videoTrack = STATE.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.stop();
                STATE.localStream.removeTrack(videoTrack);
            }
        }
        el('self-video').style.display = 'none';
        el('self-avatar-img').style.display = 'block';
        STATE.camOn = false;
    }

    el('ctrl-cam').classList.toggle('off', !STATE.camOn);
    el('ctrl-cam-icon').className = STATE.camOn ? 'bi bi-camera-video-fill' : 'bi bi-camera-video-off-fill';

    broadcastMediaState();
}

async function toggleScreenShare() {
    if (STATE.roomStatus === 'ENDED') return;

    if (!STATE.screenOn) {
        try {
            STATE.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const screenVideo = el('screen-video');
            screenVideo.srcObject = STATE.screenStream;
            screenVideo.style.display = 'block';
            el('screen-placeholder').style.display = 'none';
            el('screen-label').style.display = 'flex';
            el('screen-label-text').textContent = `${STATE.myName} กำลังแชร์หน้าจอ`;
            STATE.screenOn = true;

            STATE.screenStream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };
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
    el('screen-video').style.display = 'none';
    el('screen-placeholder').style.display = 'flex';
    el('screen-label').style.display = 'none';
    STATE.screenOn = false;
    el('ctrl-screen').classList.remove('active');
    broadcastMediaState();
}

function broadcastMediaState() {
    if (!STATE.channel) return;
    STATE.channel.track({
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
    const pc = createPeerConnection(peerName);
    if (STATE.localStream) {
        STATE.localStream.getTracks().forEach(t => pc.addTrack(t, STATE.localStream));
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

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

function createPeerConnection(peerName) {
    if (STATE.peerConnections.has(peerName)) {
        return STATE.peerConnections.get(peerName);
    }
    const pc = new RTCPeerConnection(ICE_SERVERS);
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

    pc.ontrack = (event) => {
        addRemoteTrack(peerName, event.streams[0]);
    };

    return pc;
}

async function handleSignalOffer(payload) {
    const pc = createPeerConnection(payload.sender);
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

    if (STATE.localStream) {
        STATE.localStream.getTracks().forEach(t => pc.addTrack(t, STATE.localStream));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

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

async function handleSignalAnswer(payload) {
    const pc = STATE.peerConnections.get(payload.sender);
    if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    }
}

async function handleSignalIce(payload) {
    const pc = STATE.peerConnections.get(payload.sender);
    if (pc && payload.candidate) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {}
    }
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
        pc.close();
        STATE.peerConnections.delete(name);
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
}

function switchChannel(ch) {
    $$('.channel-item').forEach(c => c.classList.remove('active'));
    const target = el(`ch-${ch}`);
    if (target) target.classList.add('active');
    if (ch === 'files') switchTab('files');
    else if (ch === 'main') switchTab('chat');
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
