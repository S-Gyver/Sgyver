async function logoutProfilePage() {
    showToast('info', 'กำลังออกจากระบบ...', 'ระบบกำลังนำคุณกลับไปหน้าหลัก');
    setTimeout(async () => {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        sessionStorage.clear();
        localStorage.removeItem('gyver_admin_session');
        window.location.href = '../../index.html';
    }, 1000);
}