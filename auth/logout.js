async function logoutProfilePage() {
    showToast('info', 'กำลังออกจากระบบ...', 'ระบบกำลังนำคุณกลับไปหน้าหลัก');
    setTimeout(async () => {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        sessionStorage.clear();
        localStorage.removeItem('gyver_admin_session');
        localStorage.removeItem('cs_bg');
        localStorage.removeItem('cs_custom_bg_name');
        localStorage.removeItem('cs_custom_bg_raw');
        localStorage.removeItem('cs_bg_size');
        localStorage.removeItem('cs_bg_pos');
        localStorage.removeItem('cs_bg_fit_mode');
        localStorage.removeItem('cs_screen_title');
        localStorage.removeItem('cs_open_widgets');
        localStorage.removeItem('gyver_dock_items');
        window.location.href = '../../my_workspace.html';
    }, 1000);
}