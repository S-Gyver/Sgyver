// assets/js/authGuard.js

// 1. ตรวจสอบว่าล็อกอินหรือยัง (สำหรับหน้า User เช่น index.html)
async function enforceAuthentication() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        sessionStorage.setItem('gyver_redirect_target', window.location.pathname);
        const currentDepth = window.location.pathname.split('/').filter(Boolean).length;
        const rootPrefix = currentDepth > 1 ? '../'.repeat(currentDepth - 1) : './';
        window.location.href = `${rootPrefix}auth/login.html`;
        return null;
    }
    return session;
}

// 2. ตรวจสอบสิทธิ์ Admin (สำหรับหน้า Admin เช่น admin/index.html)
async function enforceAdminRole() {
    const session = await enforceAuthentication();
    if (session) {
        const userRole = session.user.user_metadata?.role || 'user';
        if (userRole !== 'admin') {
            alert('🚨 บัญชีของคุณไม่มีสิทธิ์เข้าใช้งานส่วนการจัดการแอดมิน!');
            window.location.href = '../index.html'; // เด้งกลับหน้า User หลัก
        }
    }
}
}