document.addEventListener('DOMContentLoaded', async () => {
    await loadSidebarUserData();
});

// โหลดข้อมูลผู้ใช้แสดงที่ Sidebar
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
                const nameEl = document.getElementById('sidebar-display-name');
                const badgeEl = document.getElementById('sidebar-role-badge');
                const avatarEl = document.getElementById('sidebar-avatar');

                if (nameEl) nameEl.innerText = data.nickname || data.username || 'ผู้ใช้งาน';
                if (badgeEl) badgeEl.innerText = `User Lv.${data.level ?? 1}`;
                if (avatarEl && data.avatar_url) avatarEl.src = data.avatar_url;
            }
        }
    } catch (err) {
        console.error("Load sidebar user error:", err);
    }
}

function requestUpgrade(level) {
    showToast('info', 'ส่งคำขอแล้ว', `แอดมินได้รับคำขออัปเกรดเป็น Lv.${level} เรียบร้อยแล้ว`);
}