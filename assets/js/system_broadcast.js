/**
 * 🛰️ Gyver Studio System Broadcast & Maintenance Engine
 * Automatically synchronizes Announcement Banners & Maintenance Mode across all client pages.
 */

(function () {
    const CONFIG_CACHE_KEY = 'gyver_sys_config_cache';

    async function fetchSystemConfig() {
        const client = window.supabaseClient || window._supabase;
        if (!client) return null;

        try {
            // ดึงข้อมูลการตั้งค่าส่วนกลางจาก Supabase
            const { data, error } = await client
                .from('gyver_forms')
                .select('schema, updated_at')
                .eq('id', 'SYS_GLOBAL_CONFIG')
                .maybeSingle();

            if (!error && data && data.schema) {
                const config = data.schema;
                try {
                    sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({
                        data: config,
                        time: Date.now()
                    }));
                } catch (_) {}
                return config;
            }
        } catch (e) {
            console.warn("System config fetch warning:", e);
        }

        // ดึงจากแคชสำรอง
        try {
            const cached = sessionStorage.getItem(CONFIG_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                return parsed.data;
            }
        } catch (_) {}

        return null;
    }

    function isCurrentSessionAdmin() {
        try {
            const adminRaw = sessionStorage.getItem('gyver_admin_session') || localStorage.getItem('gyver_admin_session');
            if (adminRaw) {
                const parsed = JSON.parse(adminRaw);
                return parsed && parsed.isLoggedIn && parsed.role === 'admin' && parsed.email !== 's.gyver36@gmail.com';
            }
        } catch (_) {}
        return false;
    }

    // 📢 1. เรนเดอร์ Announcement Banner
    function renderAnnouncementBanner(announcement) {
        if (!announcement || !announcement.active || !announcement.text || !announcement.text.trim()) {
            const existing = document.getElementById('gyver-system-announcement-banner');
            if (existing) existing.remove();
            return;
        }

        // เช็กว่าผู้ใช้เคยกดปิดประกาศเวอร์ชันนี้ไปแล้วหรือยัง
        const dismissedKey = 'gyver_dismissed_announcement_' + (announcement.updated_at || announcement.text.slice(0, 15));
        if (sessionStorage.getItem(dismissedKey)) {
            return;
        }

        let existing = document.getElementById('gyver-system-announcement-banner');
        if (!existing) {
            existing = document.createElement('div');
            existing.id = 'gyver-system-announcement-banner';
            document.body.prepend(existing);
        }

        const type = announcement.type || 'info';
        const isMarquee = announcement.marquee !== false;

        const typeStyles = {
            info: {
                bg: 'linear-gradient(90deg, #091e3a 0%, #0d2a4a 50%, #091e3a 100%)',
                border: '#00f2fe',
                color: '#e0f7ff',
                icon: 'bi-broadcast-pin',
                badgeBg: 'rgba(0, 242, 254, 0.18)',
                badgeText: '#00f2fe',
                badgeLabel: 'ประกาศด่วน'
            },
            warning: {
                bg: 'linear-gradient(90deg, #2b1d06 0%, #3d2707 50%, #2b1d06 100%)',
                border: '#f59e0b',
                color: '#fef3c7',
                icon: 'bi-exclamation-triangle-fill',
                badgeBg: 'rgba(245, 158, 11, 0.22)',
                badgeText: '#fbbf24',
                badgeLabel: 'แจ้งเตือนสำคัญ'
            },
            danger: {
                bg: 'linear-gradient(90deg, #300c0f 0%, #441116 50%, #300c0f 100%)',
                border: '#ef4444',
                color: '#fee2e2',
                icon: 'bi-shield-fill-exclamation',
                badgeBg: 'rgba(239, 68, 68, 0.25)',
                badgeText: '#f87171',
                badgeLabel: 'ฉุกเฉิน'
            },
            success: {
                bg: 'linear-gradient(90deg, #06231a 0%, #0a3528 50%, #06231a 100%)',
                border: '#10b981',
                color: '#d1fae5',
                icon: 'bi-patch-check-fill',
                badgeBg: 'rgba(16, 185, 129, 0.22)',
                badgeText: '#34d399',
                badgeLabel: 'อัปเดตใหม่'
            }
        };

        const currentStyle = typeStyles[type] || typeStyles.info;

        existing.className = `gyver-announcement-wrap announcement-${type}`;
        existing.style.cssText = `
            position: relative;
            z-index: 10050;
            width: 100%;
            background: ${currentStyle.bg};
            border-bottom: 1.5px solid ${currentStyle.border};
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -1px 0 rgba(255, 255, 255, 0.05);
            color: ${currentStyle.color};
            font-family: 'Prompt', 'Kanit', sans-serif;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 16px;
            font-size: 0.9rem;
            animation: slideDownAnnounce 0.35s ease-out;
            box-sizing: border-box;
        `;

        const contentHtml = isMarquee ? `
            <div style="flex: 1; overflow: hidden; white-space: nowrap; margin: 0 12px; mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);">
                <div class="announcement-marquee-track" style="display: inline-block; white-space: nowrap; animation: marqueeScroll 25s linear infinite;">
                    <span style="font-weight: 500;">${escapeHtml(announcement.text)}</span>
                    <span style="display: inline-block; width: 80px;"></span>
                    <span style="font-weight: 500; opacity: 0.85;">${escapeHtml(announcement.text)}</span>
                </div>
            </div>
        ` : `
            <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 12px; font-weight: 500;">
                ${escapeHtml(announcement.text)}
            </div>
        `;

        existing.innerHTML = `
            <div style="display: flex; align-items: center; flex: 1; min-width: 0;">
                <span style="background: ${currentStyle.badgeBg}; color: ${currentStyle.badgeText}; border: 1px solid ${currentStyle.border}44; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; letter-spacing: 0.5px; flex-shrink: 0;">
                    <i class="bi ${currentStyle.icon}"></i> ${currentStyle.badgeLabel}
                </span>
                ${contentHtml}
            </div>
            <button type="button" id="btn-close-system-announcement" title="ปิดการแจ้งเตือนนี้" style="background: transparent; border: none; color: ${currentStyle.color}; opacity: 0.75; font-size: 1.15rem; cursor: pointer; padding: 2px 8px; border-radius: 6px; line-height: 1; transition: opacity 0.2s;">
                <i class="bi bi-x-lg"></i>
            </button>
        `;

        injectStylesOnce();

        document.getElementById('btn-close-system-announcement')?.addEventListener('click', () => {
            sessionStorage.setItem(dismissedKey, '1');
            existing.style.transition = 'all 0.3s ease';
            existing.style.transform = 'translateY(-100%)';
            existing.style.opacity = '0';
            setTimeout(() => existing.remove(), 300);
        });
    }

    // 🔒 2. เรนเดอร์ Maintenance Mode
    function handleMaintenanceMode(maintenance) {
        if (!maintenance || !maintenance.active) {
            const existing = document.getElementById('gyver-system-maintenance-overlay');
            if (existing) existing.remove();
            const badge = document.getElementById('gyver-admin-bypass-pill');
            if (badge) badge.remove();
            return;
        }

        const isAdmin = isCurrentSessionAdmin();

        // หากเป็น Admin อนุญาตให้ใช้งานได้ตามปกติ แต่แสดง Badge แจ้งเตือนมุมล่าง
        if (isAdmin) {
            let badge = document.getElementById('gyver-admin-bypass-pill');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'gyver-admin-bypass-pill';
                badge.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10090;
                    background: rgba(220, 38, 38, 0.92);
                    backdrop-filter: blur(8px);
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4);
                    padding: 8px 16px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                    font-family: 'Prompt', sans-serif;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    animation: pulseBadge 2s infinite;
                `;
                badge.innerHTML = `<i class="bi bi-shield-lock-fill"></i> โหมดปิดปรับปรุงเปิดอยู่ (Admin Bypass) <a href="${getRelativeAdminPath()}" style="color:#ffe4e6; text-decoration: underline; margin-left: 6px;">ตั้งค่า</a>`;
                document.body.appendChild(badge);
            }
            return;
        }

        // หน้าล็อกอินหรือหน้าแอดมินไม่ต้องบล็อกด้วย Maintenance Overlay เพื่อให้ Admin ล็อกอินเข้ามาปิดโหมดได้
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('admin_dashboard') || currentPath.includes('/auth/login')) {
            return;
        }

        // สำหรับบุคคลทั่วไป / สมาชิกทั่วไป แสดงหน้าจอ Cyberpunk Maintenance Overlay บล็อกการใช้งาน
        let overlay = document.getElementById('gyver-system-maintenance-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gyver-system-maintenance-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 999999;
                background: radial-gradient(circle at center, #0f172a 0%, #050811 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Prompt', 'Kanit', sans-serif;
                color: #e2e8f0;
                padding: 20px;
                box-sizing: border-box;
            `;

            const title = maintenance.title || '🛠️ กำลังปิดปรับปรุงระบบชั่วคราว';
            const message = maintenance.message || 'ขออภัยในความไม่สะดวก ขณะนี้ทีมงานกำลังพัฒนาและอัปเกรดระบบเพื่อประสิทธิภาพที่ดียิ่งขึ้น กรุณากลับมาใหม่อีกครั้งในเร็วๆ นี้ครับ';
            const finishTime = maintenance.estimated_finish ? `<div style="margin-top: 15px; font-family: monospace; font-size: 0.85rem; color: #38bdf8;"><i class="bi bi-clock-history me-1"></i>กำหนดการแล้วเสร็จโดยประมาณ: ${escapeHtml(maintenance.estimated_finish)}</div>` : '';

            overlay.innerHTML = `
                <div style="background: rgba(15, 23, 42, 0.88); border: 1.5px solid rgba(56, 189, 248, 0.25); box-shadow: 0 0 50px rgba(0, 242, 254, 0.15), inset 0 0 20px rgba(56, 189, 248, 0.05); backdrop-filter: blur(16px); border-radius: 20px; padding: 40px 30px; max-width: 540px; width: 100%; text-align: center;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: rgba(245, 158, 11, 0.15); border: 2px solid #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fbbf24; font-size: 2.5rem; box-shadow: 0 0 25px rgba(245, 158, 11, 0.3);">
                        <i class="bi bi-tools"></i>
                    </div>
                    <h3 style="color: #fff; font-weight: 700; margin-bottom: 12px; font-size: 1.45rem;">${escapeHtml(title)}</h3>
                    <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 20px;">${escapeHtml(message)}</p>
                    ${finishTime}
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                        <button onclick="location.reload()" style="background: linear-gradient(135deg, #0ea5e9, #0284c7); border: none; color: white; padding: 10px 22px; border-radius: 10px; font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="bi bi-arrow-clockwise"></i> ลองใหม่อีกครั้ง
                        </button>
                        <a href="${getRelativeLoginPath()}" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15); color: #cbd5e1; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="bi bi-key-fill"></i> เข้าสู่ระบบแอดมิน
                        </a>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    }

    function getRelativeAdminPath() {
        const p = window.location.pathname.toLowerCase();
        if (p.includes('/admin/')) return 'admin_dashboard.html';
        return 'admin/admin_dashboard.html';
    }

    function getRelativeLoginPath() {
        const p = window.location.pathname.toLowerCase();
        if (p.includes('/auth/login/')) return 'login.html';
        if (p.includes('/admin/')) return '../auth/login/login.html';
        return 'auth/login/login.html';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    }

    function injectStylesOnce() {
        if (document.getElementById('gyver-system-broadcast-styles')) return;
        const style = document.createElement('style');
        style.id = 'gyver-system-broadcast-styles';
        style.textContent = `
            @keyframes marqueeScroll {
                0% { transform: translateX(0%); }
                100% { transform: translateX(-50%); }
            }
            @keyframes slideDownAnnounce {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes pulseBadge {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.85; transform: scale(0.98); }
            }
            .announcement-marquee-track:hover {
                animation-play-state: paused !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ฟังก์ชันเริ่มต้นทำงานและ Realtime Subscription
    async function init() {
        const config = await fetchSystemConfig();
        if (config) {
            renderAnnouncementBanner(config.announcement);
            handleMaintenanceMode(config.maintenance);
        }

        // ซิงก์ Realtime ด้วย Supabase Channel
        const client = window.supabaseClient || window._supabase;
        if (client && client.channel) {
            try {
                client.channel('public:sys_global_config')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'gyver_forms',
                        filter: 'id=eq.SYS_GLOBAL_CONFIG'
                    }, payload => {
                        if (payload.new && payload.new.schema) {
                            const newCfg = payload.new.schema;
                            renderAnnouncementBanner(newCfg.announcement);
                            handleMaintenanceMode(newCfg.maintenance);
                        }
                    })
                    .subscribe();
            } catch (err) {
                console.warn("Realtime broadcast subscribe warning:", err);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.GyverSystemBroadcast = {
        fetchConfig: fetchSystemConfig,
        refresh: init
    };
})();
