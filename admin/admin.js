// ใน admin/admin.js
async function logoutAdmin() {
    if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
    }
    window.location.href = '../auth/login.html';
}