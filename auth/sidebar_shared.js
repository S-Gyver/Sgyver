// สคริปต์กลางสำหรับดึงโปรไฟล์มาอัปเดตรูปและชื่อฝั่ง Sidebar
document.addEventListener('DOMContentLoaded', async () => {
    await loadSidebarUserData();
});

async function loadSidebarUserData() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profile) {
                const sidebarName = document.getElementById('sidebar-display-name');
                const sidebarBadge = document.getElementById('sidebar-role-badge');
                const sidebarAvatar = document.getElementById('sidebar-avatar');

                if (sidebarName) sidebarName.innerText = profile.nickname || profile.username || 'ผู้ใช้งาน';
                if (sidebarBadge) sidebarBadge.innerText = `User Lv.${profile.level ?? 1}`;
                if (sidebarAvatar && profile.avatar_url) sidebarAvatar.src = profile.avatar_url;
            }
        }
    } catch (err) {
        console.error("Load sidebar user error:", err);
    }
}