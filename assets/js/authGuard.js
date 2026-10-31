// assets/js/authGuard.js

// หาตำแหน่งรากของเว็บจากที่อยู่ไฟล์สคริปต์นี้ (assets/js/ -> ../../) ใช้ได้ทุกความลึกของหน้า
const GYVER_ROOT_URL = (document.currentScript && document.currentScript.src) ? new URL('../../', document.currentScript.src).href : (window.location.origin + '/');

// 1. ตรวจสอบว่าล็อกอินหรือยัง (สำหรับหน้า User เช่น index.html)
async function enforceAuthentication() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        sessionStorage.setItem('gyver_redirect_target', window.location.pathname);
        window.location.href = GYVER_ROOT_URL + 'auth/login/login.html';
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
            window.location.href = GYVER_ROOT_URL + 'my_workspace.html'; // เด้งกลับหน้า User หลัก
        }
    }
}
