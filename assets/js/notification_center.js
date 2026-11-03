/**
 * Gyver Studio – Unified Notification Center Engine
 * Works seamlessly across all pages without changing existing layouts
 */

(function () {
    const STORAGE_KEY_NOTIFS = 'gyver_notifications_store';
    const STORAGE_KEY_READ = 'gyver_notifications_read_ids';

    function getRootPrefix() {
        const scripts = document.getElementsByTagName('script');
        for (let s of scripts) {
            const src = s.getAttribute('src') || '';
            const idx = src.indexOf('assets/js/notification_center.js');
            if (idx !== -1) {
                return src.substring(0, idx);
            }
        }
        const path = window.location.pathname.replace(/\\/g, '/');
        const parts = path.split('/').filter(Boolean);
        const repoIdx = parts.findIndex(p => p.toLowerCase() === 'sgyver');
        if (repoIdx !== -1) {
            const depth = parts.length - 1 - repoIdx;
            return depth > 0 ? '../'.repeat(depth) : '';
        }
        return '';
    }

    const ROOT = getRootPrefix();

    let state = {
        filter: 'all', // 'all' | 'chat' | 'system' | 'edu'
        isOpen: false,
        items: []
    };

    function getReadIds() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_READ) || '[]');
        } catch (_) {
            return [];
        }
    }

    function saveReadIds(ids) {
        try {
            localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(ids));
        } catch (_) {}
    }

    function getStoredNotifs() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_NOTIFS) || '[]');
        } catch (_) {
            return [];
        }
    }

    function saveStoredNotifs(items) {
        try {
            localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(items.slice(0, 50)));
        } catch (_) {}
    }

    // Relative Time Helper
    function formatTimeAgo(dateStr) {
        if (!dateStr) return 'เมื่อสักครู่';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const now = new Date();
        const diffMs = now - d;
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return 'เมื่อสักครู่';
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return diffMin + ' นาทีที่แล้ว';
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return diffHours + ' ชั่วโมงที่แล้ว';
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return diffDays + ' วันที่แล้ว';
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    }

    // Add a notification
    function addNotification(notif) {
        if (!notif || !notif.title) return;
        const id = notif.id || 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const item = {
            id: id,
            title: notif.title,
            desc: notif.desc || '',
            type: notif.type || 'system', // 'system' | 'chat' | 'edu'
            icon: notif.icon || 'bi-bell-fill',
            iconBg: notif.iconBg || 'rgba(59, 130, 246, 0.12)',
            iconColor: notif.iconColor || '#2563eb',
            url: notif.url || '',
            created_at: notif.created_at || new Date().toISOString()
        };

        const existing = getStoredNotifs().filter(n => n.id !== id);
        existing.unshift(item);
        saveStoredNotifs(existing);

        // Render & animate bell
        renderNotifs();
        animateBell();
    }

    function animateBell() {
        const icon = document.querySelector('.gyver-notif-bell-btn i');
        if (icon) {
            icon.classList.remove('gyver-notif-wiggle');
            void icon.offsetWidth;
            icon.classList.add('gyver-notif-wiggle');
        }
    }

    // Render Badge & Panel List
    function renderNotifs() {
        const stored = getStoredNotifs();
        const readIds = new Set(getReadIds());
        const unreadCount = stored.filter(n => !readIds.has(n.id)).length;

        // Badge update
        const badge = document.getElementById('gyver-notif-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }

        // List update
        const listEl = document.getElementById('gyver-notif-list');
        if (!listEl) return;

        let filtered = stored;
        if (state.filter !== 'all') {
            filtered = stored.filter(n => n.type === state.filter);
        }

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="gyver-notif-empty">
                    <i class="bi bi-bell-slash"></i>
                    <div>ยังไม่มีการแจ้งเตือนในหมวดนี้</div>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filtered.map(item => {
            const isUnread = !readIds.has(item.id);
            const timeStr = formatTimeAgo(item.created_at);
            const targetUrl = item.url ? item.url : 'javascript:void(0)';
            return `
                <a href="${targetUrl}" class="gyver-notif-item ${isUnread ? 'is-unread' : ''}" onclick="window.GyverNotifications.markRead('${item.id}', '${item.url || ''}')">
                    <div class="gyver-notif-icon-box" style="background: ${item.iconBg}; color: ${item.iconColor};">
                        <i class="bi ${item.icon}"></i>
                    </div>
                    <div class="gyver-notif-content">
                        <div class="gyver-notif-item-title">${escapeHtml(item.title)}</div>
                        <div class="gyver-notif-item-desc">${escapeHtml(item.desc)}</div>
                        <div class="gyver-notif-item-time">${timeStr}</div>
                    </div>
                </a>
            `;
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    // Toggle Panel
    function togglePanel() {
        const panel = document.getElementById('gyver-notif-panel');
        const backdrop = document.getElementById('gyver-notif-backdrop');
        if (!panel) return;
        state.isOpen = !state.isOpen;
        panel.classList.toggle('is-open', state.isOpen);
        if (backdrop) backdrop.classList.toggle('is-open', state.isOpen);
        if (state.isOpen) renderNotifs();
    }

    function closePanel() {
        const panel = document.getElementById('gyver-notif-panel');
        const backdrop = document.getElementById('gyver-notif-backdrop');
        if (panel) panel.classList.remove('is-open');
        if (backdrop) backdrop.classList.remove('is-open');
        state.isOpen = false;
    }

    function markAllRead() {
        const stored = getStoredNotifs();
        const allIds = stored.map(n => n.id);
        saveReadIds(allIds);
        renderNotifs();
    }

    function markRead(id, url) {
        const readIds = getReadIds();
        if (!readIds.includes(id)) {
            readIds.push(id);
            saveReadIds(readIds);
        }
        renderNotifs();
        if (url && url !== 'javascript:void(0)') {
            closePanel();
        }
    }

    function setFilter(filterType) {
        state.filter = filterType;
        document.querySelectorAll('.gyver-notif-tab').forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-filter') === filterType);
        });
        renderNotifs();
    }

    // Mount UI Elements
    function initUI() {
        if (document.getElementById('gyver-notif-btn')) return;

        // Check if there's a dedicated slot in navbar
        const slot = document.getElementById('gyver-notification-slot');

        const bellBtnHtml = `
            <button type="button" class="gyver-notif-bell-btn" id="gyver-notif-btn" title="การแจ้งเตือน (Notifications)">
                <i class="bi bi-bell-fill"></i>
                <span class="gyver-notif-badge d-none" id="gyver-notif-badge">0</span>
            </button>
        `;

        if (slot) {
            slot.innerHTML = bellBtnHtml;
        } else {
            const floating = document.createElement('div');
            floating.className = 'gyver-notif-bell-floating';
            floating.innerHTML = bellBtnHtml;
            document.body.appendChild(floating);
        }

        // Panel & Backdrop
        const panelHtml = `
            <div id="gyver-notif-backdrop"></div>
            <div id="gyver-notif-panel">
                <div class="gyver-notif-header">
                    <div class="gyver-notif-title">
                        <i class="bi bi-bell-fill icon-bell"></i>
                        <span>การแจ้งเตือน</span>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <button type="button" class="gyver-notif-mark-read-btn" id="gyver-notif-mark-read-btn">
                            อ่านแล้วทั้งหมด
                        </button>
                        <button type="button" class="btn btn-sm btn-link text-muted p-0 ms-1" id="gyver-notif-close-btn" style="font-size: 1.1rem; line-height: 1;">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
                <div class="gyver-notif-tabs">
                    <button type="button" class="gyver-notif-tab active" data-filter="all">ทั้งหมด</button>
                    <button type="button" class="gyver-notif-tab" data-filter="chat">💬 แชท</button>
                    <button type="button" class="gyver-notif-tab" data-filter="edu">📂 สื่อสอน</button>
                    <button type="button" class="gyver-notif-tab" data-filter="system">📢 ระบบ</button>
                </div>
                <div class="gyver-notif-list" id="gyver-notif-list">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.id = 'gyver-notif-container';
        container.innerHTML = panelHtml;
        document.body.appendChild(container);

        // Bind events
        document.getElementById('gyver-notif-btn')?.addEventListener('click', togglePanel);
        document.getElementById('gyver-notif-close-btn')?.addEventListener('click', closePanel);
        document.getElementById('gyver-notif-backdrop')?.addEventListener('click', closePanel);
        document.getElementById('gyver-notif-mark-read-btn')?.addEventListener('click', markAllRead);

        document.querySelectorAll('.gyver-notif-tab').forEach(btn => {
            btn.addEventListener('click', () => setFilter(btn.getAttribute('data-filter')));
        });

        // Initial sync from Supabase
        syncInitialNotifications();

        // Listen for Realtime WorkChat & System Broadcast
        setupRealtimeListener();

        renderNotifs();
    }

    // Sync initial notifications from Supabase
    async function syncInitialNotifications() {
        const client = window.supabaseClient;
        if (!client) return;

        try {
            // 1. Sync WorkChat shared messages
            const { data: lobbiesData } = await client
                .from('lobbies')
                .select('quiz_settings')
                .eq('room_code', 'WORKCHAT')
                .maybeSingle();

            if (lobbiesData && lobbiesData.quiz_settings && lobbiesData.quiz_settings.messages) {
                const msgs = lobbiesData.quiz_settings.messages.slice(-10);
                msgs.forEach(m => {
                    if (m.file_data || (m.message_text && m.message_text.includes('แชร์สื่อการสอน'))) {
                        const notifId = 'notif_wc_' + m.id;
                        addNotification({
                            id: notifId,
                            title: (m.sender_name || 'คุณครู') + ' แชร์สื่อการสอน',
                            desc: m.file_data?.name || m.message_text || 'มีไฟล์แนบใหม่ใน WorkChat',
                            type: 'chat',
                            icon: 'bi-chat-dots-fill',
                            iconBg: 'rgba(6, 182, 212, 0.15)',
                            iconColor: '#0891b2',
                            url: ROOT + 'features/communication/workchat/workchat.html',
                            created_at: m.created_at
                        });
                    }
                });
            }

            // 2. Sync System Announcements
            const { data: sysData } = await client
                .from('gyver_forms')
                .select('schema')
                .eq('id', 'SYS_GLOBAL_CONFIG')
                .maybeSingle();

            if (sysData && sysData.schema && sysData.schema.announcement && sysData.schema.announcement.active) {
                const a = sysData.schema.announcement;
                addNotification({
                    id: 'notif_sys_' + (a.updated_at || a.text.slice(0, 10)),
                    title: 'ประกาศระบบ Gyver Studio',
                    desc: a.text,
                    type: 'system',
                    icon: 'bi-broadcast-pin',
                    iconBg: 'rgba(245, 158, 11, 0.15)',
                    iconColor: '#d97706',
                    url: '',
                    created_at: a.updated_at || new Date().toISOString()
                });
            }
        } catch (e) {
            console.warn('[NotificationCenter] Sync error:', e);
        }
    }

    function setupRealtimeListener() {
        const client = window.supabaseClient;
        if (!client || !client.channel) return;

        try {
            client.channel('public:gyver_global_notifications')
                .on('broadcast', { event: 'new_message' }, payload => {
                    const m = payload.payload;
                    if (m) {
                        addNotification({
                            id: 'notif_wc_' + m.id,
                            title: (m.sender_name || 'เพื่อนร่วมงาน') + ' ส่งข้อความใน WorkChat',
                            desc: m.message_text || (m.file_data ? 'แชร์ไฟล์: ' + m.file_data.name : 'มีข้อความใหม่'),
                            type: 'chat',
                            icon: 'bi-chat-dots-fill',
                            iconBg: 'rgba(6, 182, 212, 0.15)',
                            iconColor: '#0891b2',
                            url: ROOT + 'features/communication/workchat/workchat.html',
                            created_at: m.created_at || new Date().toISOString()
                        });
                    }
                })
                .on('broadcast', { event: 'share_drive_item' }, payload => {
                    const it = payload.payload;
                    if (it) {
                        addNotification({
                            id: 'notif_drive_' + it.id + '_' + Date.now(),
                            title: 'แชร์สื่อการสอนใหม่',
                            desc: `"${it.title}" ถูกส่งเข้าห้องเรียน/WorkChat`,
                            type: 'edu',
                            icon: 'bi-file-earmark-slides-fill',
                            iconBg: 'rgba(16, 185, 129, 0.15)',
                            iconColor: '#059669',
                            url: it.url || (ROOT + 'features/education/teacher_drive/teacher_drive.html'),
                            created_at: new Date().toISOString()
                        });
                    }
                })
                .subscribe();
        } catch (_) {}
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }

    // Global API
    window.GyverNotifications = {
        add: addNotification,
        open: togglePanel,
        close: closePanel,
        markAllRead: markAllRead,
        markRead: markRead,
        refresh: syncInitialNotifications
    };
})();
