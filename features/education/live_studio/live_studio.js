/* ================================================================
   🎙️ GYVER LIVE STUDIO — live_studio.js
   Lobby & Archive Controller (Supabase DB + Realtime)
   ================================================================ */
'use strict';

const LOBBY_STATE = {
    rooms:        [],
    msgCounts:    {},
    fileCounts:   {},
    activeFilter: 'my', // 'my' | 'live' | 'archived'
    channel:      null,
};

let currentAuthUser = null;
let currentUserId   = null;
let currentUserName = '';

// ── DOM HELPERS ────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

// ── AUTH CHECK ─────────────────────────────────────────────────
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
            console.warn('[Live Studio Auth check]', e);
        }
    }
}

// ── USER-SCOPED STORAGE HELPERS ────────────────────────────────
function getStorageKey() {
    return currentUserId ? `gyver_live_host_rooms_${currentUserId}` : 'gyver_live_host_rooms';
}

function getMyHostRooms() {
    try {
        return JSON.parse(localStorage.getItem(getStorageKey()) || '{}');
    } catch {
        return {};
    }
}

function saveMyHostRoom(pin) {
    const rooms = getMyHostRooms();
    rooms[pin] = 'host';
    localStorage.setItem(getStorageKey(), JSON.stringify(rooms));
}

function removeMyHostRoom(pin) {
    const rooms = getMyHostRooms();
    delete rooms[pin];
    localStorage.setItem(getStorageKey(), JSON.stringify(rooms));
}

// Check whether current user is the owner of this room
function isUserOwnerOfRoom(room) {
    if (!room) return false;
    // 1. If room has host_secret, match with currentUserId or email
    if (currentUserId && room.host_secret) {
        return (room.host_secret === currentUserId || (currentAuthUser?.email && room.host_secret === currentAuthUser.email));
    }
    // 2. User-scoped local storage check
    const myRoomsMap = getMyHostRooms();
    if (myRoomsMap[room.pin] !== undefined) {
        // If room is owned by another specific user ID, don't allow claiming it
        if (room.host_secret && currentUserId && room.host_secret !== currentUserId) {
            return false;
        }
        return true;
    }
    return false;
}

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 0. Safety check: if user was already in a live room and didn't leave, restore back to live_room
    try {
        const raw = sessionStorage.getItem('gyver_active_live_room') || localStorage.getItem('gyver_active_live_room');
        if (raw) {
            const activeRoom = JSON.parse(raw);
            if (activeRoom && activeRoom.pin) {
                const targetUrl = `live_room.html?pin=${encodeURIComponent(activeRoom.pin)}${activeRoom.name ? '&name=' + encodeURIComponent(activeRoom.name) : ''}&role=${encodeURIComponent(activeRoom.role || 'student')}`;
                window.location.replace(targetUrl);
                return;
            }
        }
    } catch (e) {}

    // 1. Load logged-in user
    await initAuthUser();

    // 2. Default filter: strictly 'my' (only user's own rooms, never public list)
    setLobbyFilter('my');

    // 3. Fill user name if available
    const qName = el('quick-name-input');
    if (qName) {
        qName.value = currentUserName || '';
    }

    // 4. Load rooms (only owned by user)
    await fetchRooms();

    // 5. Subscribe to realtime room updates
    setupLobbyRealtime();
});

// ── FETCH ROOMS FROM SUPABASE (STRICT PRIVACY: ONLY OWNED ROOMS) ──
async function fetchRooms() {
    if (!window.supabaseClient) {
        renderRoomGrid();
        return;
    }

    try {
        const hasLocalHostRooms = Object.keys(getMyHostRooms()).length > 0;

        // If user is neither logged in nor has locally created rooms, they own 0 rooms
        if (!currentUserId && !hasLocalHostRooms) {
            LOBBY_STATE.rooms = [];
            LOBBY_STATE.msgCounts = {};
            LOBBY_STATE.fileCounts = {};
            updateBadgeCounts();
            renderRoomGrid();
            return;
        }

        // Get all rooms from DB
        const { data: rooms, error } = await supabaseClient
            .from('live_studio_rooms')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // STRICT PRIVACY: Only retain rooms owned by current user
        LOBBY_STATE.rooms = (rooms || []).filter(r => isUserOwnerOfRoom(r));

        // Fetch stats only for user's own rooms
        if (LOBBY_STATE.rooms.length > 0) {
            const pins = LOBBY_STATE.rooms.map(r => r.pin);

            const { data: msgStats } = await supabaseClient
                .from('live_studio_messages')
                .select('room_pin')
                .in('room_pin', pins);

            if (msgStats) {
                const mCounts = {};
                msgStats.forEach(m => {
                    mCounts[m.room_pin] = (mCounts[m.room_pin] || 0) + 1;
                });
                LOBBY_STATE.msgCounts = mCounts;
            }

            const { data: fileStats } = await supabaseClient
                .from('live_studio_files')
                .select('room_pin')
                .in('room_pin', pins);

            if (fileStats) {
                const fCounts = {};
                fileStats.forEach(f => {
                    fCounts[f.room_pin] = (fCounts[f.room_pin] || 0) + 1;
                });
                LOBBY_STATE.fileCounts = fCounts;
            }
        }

        updateBadgeCounts();
        renderRoomGrid();

    } catch (err) {
        console.error('[fetchRooms Error]', err);
        renderRoomGrid();
    }
}

// ── UPDATE COUNTS & TABS ───────────────────────────────────────
function updateBadgeCounts() {
    const myRooms = LOBBY_STATE.rooms.filter(r => isUserOwnerOfRoom(r));
    const liveMyCount = myRooms.filter(r => r.status === 'LIVE').length;
    const archivedMyCount = myRooms.filter(r => r.status === 'ENDED').length;

    if (el('badge-my-count')) el('badge-my-count').textContent = liveMyCount;
    if (el('badge-archived-count')) el('badge-archived-count').textContent = archivedMyCount;

    const tabsEl = el('lobby-tabs');
    if (tabsEl) {
        // Only show tabs if user actually owns rooms
        tabsEl.style.display = myRooms.length > 0 ? 'flex' : 'none';
    }
}

function setLobbyFilter(filter) {
    // Only 'my' or 'archived'
    LOBBY_STATE.activeFilter = (filter === 'archived') ? 'archived' : 'my';
    ['my', 'archived'].forEach(f => {
        const btn = el(`tab-btn-${f}`);
        if (btn) btn.classList.toggle('active', f === LOBBY_STATE.activeFilter);
    });
    renderRoomGrid();
}

// ── RENDER ROOM GRID (ZERO PUBLIC LEAKS) ─────────────────────────
function renderRoomGrid() {
    const grid = el('room-grid');
    if (!grid) return;

    const myRooms = LOBBY_STATE.rooms.filter(r => isUserOwnerOfRoom(r));

    // When user has no rooms (e.g. Guest, Student, or new user): NEVER display any stranger's room!
    if (myRooms.length === 0) {
        grid.innerHTML = `
            <div class="private-portal-card" style="grid-column: 1 / -1">
                <div class="private-portal-icon">
                    <i class="bi bi-shield-lock-fill"></i>
                </div>
                <h3 class="private-portal-title">ห้องเรียนออนไลน์เป็นระบบส่วนตัว</h3>
                <p class="private-portal-desc">
                    ห้องเรียนจะไม่แสดงสู่สาธารณะเพื่อความเป็นส่วนตัวและความปลอดภัยของชั้นเรียน<br>
                    นักเรียนและผู้เข้าร่วมสามารถเข้าสู่ห้องเรียนได้โดยการกรอก <strong>รหัส PIN</strong> ด้านบนเท่านั้น
                </p>
                <div class="private-portal-guide">
                    <div class="guide-item">
                        <i class="bi bi-key text-pink me-1"></i>
                        <span>1. รับรหัส PIN 4-6 หลักจากครูผู้สอน</span>
                    </div>
                    <div class="guide-item">
                        <i class="bi bi-pencil-square text-pink me-1"></i>
                        <span>2. กรอก PIN และชื่อของคุณในช่องด้านบน</span>
                    </div>
                    <div class="guide-item">
                        <i class="bi bi-box-arrow-in-right text-pink me-1"></i>
                        <span>3. กด "เข้าร่วมห้องเรียน" เพื่อเริ่มเรียนทันที</span>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    let filtered = [];
    if (LOBBY_STATE.activeFilter === 'my') {
        filtered = myRooms.filter(r => r.status === 'LIVE');
    } else if (LOBBY_STATE.activeFilter === 'archived') {
        filtered = myRooms.filter(r => r.status === 'ENDED');
    }

    if (filtered.length === 0) {
        let msg = LOBBY_STATE.activeFilter === 'archived' 
            ? 'คุณยังไม่มีคลังย้อนหลังของห้องที่คุณสอน' 
            : 'ไม่มีห้องเรียนสดที่คุณเปิดสอนอยู่ในขณะนี้';
        grid.innerHTML = `
            <div class="lobby-empty" style="grid-column: 1 / -1">
                <i class="bi bi-folder-check"></i>
                <div style="font-size:1.05rem;font-weight:600;color:#fff;margin-bottom:4px">${msg}</div>
                <div style="font-size:0.85rem">กดปุ่ม <strong>"+ สร้างห้องเรียนใหม่"</strong> ด้านบนเพื่อเริ่มเปิดการสอน</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(room => {
        const isLive = (room.status === 'LIVE');
        const msgCount = LOBBY_STATE.msgCounts[room.pin] || 0;
        const fileCount = LOBBY_STATE.fileCounts[room.pin] || 0;

        const dateStr = new Date(room.created_at).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: '2-digit'
        });
        const timeStr = new Date(room.created_at).toLocaleTimeString('th-TH', {
            hour: '2-digit', minute: '2-digit'
        });

        const card = document.createElement('div');
        card.className = `room-card ${isLive ? 'is-live' : 'is-ended'}`;

        card.innerHTML = `
            <div class="room-card-header">
                <span class="room-card-status ${isLive ? 'live' : 'ended'}">
                    <i class="bi ${isLive ? 'bi-broadcast' : 'bi-archive-fill'}"></i>
                    ${isLive ? 'กำลังสอนสด (LIVE)' : 'จบการสอนแล้ว'}
                </span>
                <span class="room-card-pin" title="รหัส PIN สำหรับให้นักเรียนเข้า">PIN: ${escapeHtml(room.pin)}</span>
            </div>

            <div class="room-card-title">${escapeHtml(room.title || `ห้องเรียน ${room.pin}`)}</div>

            <div class="room-card-meta">
                <div class="room-card-meta-row">
                    <i class="bi bi-person-badge-fill" style="color:var(--cyber-pink)"></i>
                    <span>ครูผู้สอน: <strong>${escapeHtml(room.host_name || 'ไม่ระบุ')}</strong> (ห้องของคุณ)</span>
                </div>
                <div class="room-card-meta-row">
                    <i class="bi bi-calendar3"></i>
                    <span>สร้างเมื่อ: ${dateStr} ${timeStr} น.</span>
                </div>
            </div>

            <div class="room-card-stats">
                <span><i class="bi bi-chat-dots"></i> ${msgCount} ข้อความ</span>
                <span><i class="bi bi-paperclip"></i> ${fileCount} ไฟล์แนบ</span>
            </div>

            <div class="room-card-actions">
                <button class="btn-enter-room ${isLive ? '' : 'archive-btn'}" onclick="enterRoomFromLobby('${escapeHtml(room.pin)}', 'host')">
                    <i class="bi ${isLive ? 'bi-box-arrow-in-right' : 'bi-folder2-open'}"></i>
                    ${isLive ? 'เข้าจัดการห้องเรียน' : 'ดูประวัติ & จัดการไฟล์'}
                </button>
                <button class="btn-del-room" title="ลบห้องนี้ถาวร" onclick="confirmDeleteRoom('${escapeHtml(room.pin)}')">
                    <i class="bi bi-trash-fill"></i>
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function showEmptyState(msg) {
    const grid = el('room-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="lobby-empty" style="grid-column: 1 / -1">
                <i class="bi bi-exclamation-circle"></i>
                <div>${msg}</div>
            </div>
        `;
    }
}

// ── CREATE ROOM MODAL LOGIC ────────────────────────────────────
function openCreateModal() {
    // Generate fresh PIN
    randomizeModalPin();

    // Pre-fill name only if user is logged in, otherwise leave empty for manual typing
    const savedName = currentUserName || '';
    el('modal-host-name').value = savedName;

    el('create-modal').style.display = 'flex';
    setTimeout(() => el('modal-room-title').focus(), 100);
}

function closeCreateModal() {
    el('create-modal').style.display = 'none';
}

function randomizeModalPin() {
    // Random 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    el('modal-room-pin').value = pin;
}

async function submitCreateRoom() {
    const title = el('modal-room-title').value.trim();
    const host  = el('modal-host-name').value.trim();
    const pin   = el('modal-room-pin').value.trim().toUpperCase();

    if (!title) {
        showToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อวิชาหรือหัวข้อการสอน', 3000);
        el('modal-room-title').focus();
        return;
    }
    if (!host) {
        showToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อครูผู้สอน', 3000);
        el('modal-host-name').focus();
        return;
    }
    if (!pin) {
        showToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุรหัส PIN', 3000);
        el('modal-room-pin').focus();
        return;
    }

    localStorage.setItem('gyver_user_name', host);

    const btn = el('btn-submit-create');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i>กำลังสร้าง...';

    try {
        if (!window.supabaseClient) throw new Error('ไม่พบการเชื่อมต่อ Supabase');

        // Check if PIN already exists
        const { data: existing } = await supabaseClient
            .from('live_studio_rooms')
            .select('pin')
            .eq('pin', pin)
            .maybeSingle();

        if (existing) {
            showToast('error', 'PIN ซ้ำ', 'รหัสห้องนี้ถูกใช้แล้ว กรุณากดสุ่มรหัส PIN ใหม่', 3500);
            randomizeModalPin();
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-broadcast me-1"></i>เปิดห้องเรียนสด';
            return;
        }

        // Insert new room with host_secret bound to current user ID
        const { error } = await supabaseClient
            .from('live_studio_rooms')
            .insert([{
                pin:         pin,
                title:       title,
                host_name:   host,
                status:      'LIVE',
                host_secret: currentUserId || host
            }]);

        if (error) throw error;

        // Remember as my room in user-scoped storage
        saveMyHostRoom(pin);

        // Pre-save active room session for instant restore
        const sessionData = { pin, name: host, role: 'host' };
        try {
            sessionStorage.setItem('gyver_active_live_room', JSON.stringify(sessionData));
            localStorage.setItem('gyver_active_live_room', JSON.stringify(sessionData));
            window.parent.postMessage({
                action: 'updateLiveRoomState',
                pin,
                name: host,
                role: 'host'
            }, '*');
        } catch (_) {}

        showToast('success', 'สร้างห้องสำเร็จ', `กำลังพาคุณเข้าสู่ห้องเรียน ${pin}...`, 2000);
        setTimeout(() => {
            window.location.href = `live_room.html?pin=${encodeURIComponent(pin)}&name=${encodeURIComponent(host)}&role=host`;
        }, 1000);

    } catch (err) {
        console.error('[Create Room Error]', err);
        showToast('error', 'สร้างห้องไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด', 3500);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-broadcast me-1"></i>เปิดห้องเรียนสด';
    }
}

// ── ENTER ROOM HELPER ──────────────────────────────────────────
function enterRoomFromLobby(pin, role) {
    const name = currentUserName || localStorage.getItem('gyver_user_name') || '';
    const sessionData = { pin, name, role };
    try {
        sessionStorage.setItem('gyver_active_live_room', JSON.stringify(sessionData));
        localStorage.setItem('gyver_active_live_room', JSON.stringify(sessionData));
        window.parent.postMessage({
            action: 'updateLiveRoomState',
            pin,
            name,
            role
        }, '*');
    } catch (_) {}
    window.location.href = `live_room.html?pin=${encodeURIComponent(pin)}${name ? `&name=${encodeURIComponent(name)}` : ''}&role=${encodeURIComponent(role)}`;
}

// ── QUICK JOIN BAR ─────────────────────────────────────────────
function handleQuickJoinKey(e) {
    if (e.key === 'Enter') handleQuickJoin();
}

async function handleQuickJoin() {
    const pin  = el('quick-pin-input').value.trim().toUpperCase();
    const name = el('quick-name-input').value.trim();

    if (!pin) {
        showToast('warning', 'ระบุ PIN', 'กรุณากรอกรหัส PIN ห้องเรียน', 2500);
        el('quick-pin-input').focus();
        return;
    }

    const effectiveName = name || currentUserName || localStorage.getItem('gyver_user_name') || '';
    if (!effectiveName) {
        showToast('warning', 'ระบุชื่อของคุณ', 'กรุณากรอกชื่อของคุณก่อนเข้าร่วมห้องเรียน', 2500);
        el('quick-name-input').focus();
        return;
    }

    localStorage.setItem('gyver_user_name', effectiveName);

    // Validate PIN with Supabase DB
    if (window.supabaseClient) {
        try {
            const { data: room, error } = await supabaseClient
                .from('live_studio_rooms')
                .select('pin, title, status, is_locked')
                .eq('pin', pin)
                .maybeSingle();

            if (!room) {
                showToast('error', 'ไม่พบห้องเรียน', `ไม่พบห้องเรียนที่มีรหัส PIN "${pin}" กรุณาตรวจสอบรหัสอีกครั้ง`, 4000);
                return;
            }

            if (room.is_locked) {
                showToast('error', 'ห้องเรียนถูกล็อก', 'ห้องเรียนนี้ถูกล็อกโดยครูผู้สอน ไม่อนุญาตให้เข้าร่วมในขณะนี้', 4000);
                return;
            }
        } catch (err) {
            console.warn('[handleQuickJoin validation notice]:', err);
        }
    }

    const sessionData = { pin, name: effectiveName, role: 'student' };
    try {
        sessionStorage.setItem('gyver_active_live_room', JSON.stringify(sessionData));
        localStorage.setItem('gyver_active_live_room', JSON.stringify(sessionData));
        window.parent.postMessage({
            action: 'updateLiveRoomState',
            pin,
            name: effectiveName,
            role: 'student'
        }, '*');
    } catch (_) {}

    window.location.href = `live_room.html?pin=${encodeURIComponent(pin)}&name=${encodeURIComponent(effectiveName)}&role=student`;
}

// ── DELETE ROOM ACTION ─────────────────────────────────────────
async function confirmDeleteRoom(pin) {
    const room = LOBBY_STATE.rooms.find(r => r.pin === pin);
    if (room && !isUserOwnerOfRoom(room)) {
        showToast('error', 'ไม่มีสิทธิ์', 'คุณไม่ใช่เจ้าของห้องเรียนนี้ ไม่สามารถลบได้', 3000);
        return;
    }

    const confirmed = confirm(`⚠️ คุณต้องการลบห้องเรียน [PIN: ${pin}] ถาวรใช่หรือไม่?\n\n• ประวัติแชททั้งหมดจะถูกลบ\n• รายการไฟล์ทั้งหมดจะถูกลบ\n• การกระทำนี้ไม่สามารถย้อนกลับได้`);
    if (!confirmed) return;

    try {
        if (!window.supabaseClient) throw new Error('Supabase client not connected');

        const { error } = await supabaseClient
            .from('live_studio_rooms')
            .delete()
            .eq('pin', pin);

        if (error) throw error;

        removeMyHostRoom(pin);
        showToast('success', 'ลบห้องเรียบร้อย', `ห้อง ${pin} ถูกลบออกจากระบบแล้ว`, 3000);

        // Refresh list
        await fetchRooms();

    } catch (err) {
        console.error('[Delete Room Error]', err);
        showToast('error', 'ลบห้องไม่สำเร็จ', err.message, 3000);
    }
}

// ── REALTIME SYNC ──────────────────────────────────────────────
function setupLobbyRealtime() {
    if (!window.supabaseClient) return;

    LOBBY_STATE.channel = supabaseClient
        .channel('live_studio_lobby_changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'live_studio_rooms' },
            () => {
                fetchRooms();
            }
        )
        .subscribe();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
