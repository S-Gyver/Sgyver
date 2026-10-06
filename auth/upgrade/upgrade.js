let currentUserProfileData = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadSidebarUserData();
});

// โหลดข้อมูลผู้ใช้แสดงที่ Sidebar และอัปเดตสถานะการ์ดแต่ละระดับ
async function loadSidebarUserData() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            const { data } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (data) {
                currentUserProfileData = data;
                const nameEl = document.getElementById('sidebar-display-name');
                const badgeEl = document.getElementById('sidebar-role-badge');
                const avatarEl = document.getElementById('sidebar-avatar');

                const userLevel = Number(data.level) || 1;
                const isAdmin = data.role === 'admin' || (data.username && data.username.toLowerCase() === 'admin');

                if (nameEl) nameEl.innerText = data.nickname || data.username || 'ผู้ใช้งาน';
                if (badgeEl) badgeEl.innerText = isAdmin ? 'Admin (สิทธิ์สูงสุด)' : `User Lv.${userLevel}`;
                if (avatarEl && data.avatar_url) avatarEl.src = data.avatar_url;

                updateTierCardsUI(isAdmin ? 4 : userLevel, isAdmin);
            }
        }
    } catch (err) {
        console.error("Load sidebar user error:", err);
    }
}

function updateTierCardsUI(currentLevel, isAdmin = false) {
    const tierPill = document.getElementById('upgrade-current-tier-pill');
    const tierNames = {
        1: 'Standard Member (Lv.1)',
        2: 'Pro Member (Lv.2)',
        3: 'Business Studio (Lv.3)',
        4: 'E-Commerce VIP (Lv.4)'
    };

    if (tierPill) {
        if (isAdmin) {
            tierPill.innerHTML = '<i class="bi bi-shield-fill-check text-danger me-1"></i>คุณมีสิทธิ์: ผู้ดูแลระบบ Admin (ปลดล็อกทุกระดับ)';
            tierPill.className = 'badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill font-mono px-3 py-1 small';
        } else {
            tierPill.innerHTML = `<i class="bi bi-award-fill text-warning me-1"></i>ระดับปัจจุบันของคุณ: ${tierNames[currentLevel] || 'Lv.' + currentLevel}`;
            tierPill.className = 'badge bg-success-subtle text-success border border-success-subtle rounded-pill font-mono px-3 py-1 small';
        }
    }

    for (let lv = 1; lv <= 4; lv++) {
        const cardEl = document.getElementById(`tier-card-${lv}`);
        const statusEl = document.getElementById(`tier-status-${lv}`);
        const btnEl = document.getElementById(`tier-btn-${lv}`);

        if (!cardEl || !statusEl || !btnEl) continue;

        if (isAdmin || lv < currentLevel) {
            // ระดับที่ผ่านสิทธิ์มาแล้ว
            statusEl.className = 'badge bg-secondary-subtle text-secondary px-2 py-1 rounded-pill small fw-bold tier-status-pill';
            statusEl.innerHTML = '<i class="bi bi-check2-all me-1"></i>ปลดล็อกแล้ว';
            btnEl.className = 'btn btn-outline-secondary btn-sm w-100 fw-bold rounded-3 mt-auto tier-action-btn';
            btnEl.disabled = true;
            btnEl.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>ได้รับสิทธิ์นี้แล้ว';
        } else if (lv === currentLevel) {
            // ระดับปัจจุบันของผู้ใช้งาน
            statusEl.className = 'badge bg-success text-white px-2 py-1 rounded-pill small fw-bold tier-status-pill';
            statusEl.innerHTML = '<i class="bi bi-stars me-1"></i>สิทธิ์ปัจจุบันของคุณ';
            cardEl.style.boxShadow = '0 0 0 2px #10b981, 0 10px 25px -5px rgba(16, 185, 129, 0.2)';
            btnEl.className = 'btn btn-success text-white btn-sm w-100 fw-bold rounded-3 mt-auto tier-action-btn';
            btnEl.disabled = true;
            btnEl.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>ใช้งานระดับนี้อยู่';
        } else {
            // ระดับที่ยังไม่ได้ปลดล็อก (สูงกว่าปัจจุบัน)
            btnEl.disabled = false;
        }
    }
}

function requestUpgrade(targetLevel) {
    const levelNames = {
        2: 'Lv.2 Pro Member (Live Studio & Code Race)',
        3: 'Lv.3 Business Studio (Quotation & ออกใบเสนอราคา)',
        4: 'Lv.4 E-Commerce VIP (Shopee Orders & ซิงก์คำสั่งซื้อ)'
    };
    const targetName = levelNames[targetLevel] || `Lv.${targetLevel}`;
    const username = currentUserProfileData?.username || currentUserProfileData?.email || 'บัญชีของคุณ';

    if (typeof showToast === 'function') {
        showToast('info', `ยื่นขอปรับสิทธิ์ ${targetName}`, `กรุณาแจ้งผู้ดูแลระบบ (Admin) เพื่ออนุมัติปรับสิทธิ์สำหรับ "${username}" ครับ`, 5000);
    } else {
        alert(`📢 กรุณาแจ้งผู้ดูแลระบบ (Admin) เพื่อขออนุมัติปรับสิทธิ์เป็น:\n${targetName}\n(สำหรับบัญชี: ${username})`);
    }
}