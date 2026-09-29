// ดึงตัวแปร window.supabaseClient ที่ถูกประกาศไว้ใน assets/js/supabaseClient.js
const alertBox = document.getElementById('auth-alert');

function showAlert(message, type = 'danger') {
    alertBox.className = `alert alert-${type} py-2 small text-center`;
    alertBox.innerText = message;
    alertBox.classList.remove('d-none');
}

// 🔒 ระบบจดจำการล็อกอินถาวร: ถ้าตรวจพบเซสชันเดิมอยู่แล้ว ให้ผ่านเข้าสู่เป้าหมายหรือหน้าหลัก
async function checkExistingSession() {
    if (!window.supabaseClient || !window.supabaseClient.auth) return;
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session && session.user) {
            const user = session.user;
            let isAdmin = false;

            // ตรวจสอบสิทธิ์จากตาราง profiles ในฐานข้อมูลเป็นหลัก
            try {
                const { data: prof } = await window.supabaseClient
                    .from('profiles')
                    .select('role, username, nickname')
                    .eq('id', user.id)
                    .maybeSingle();

                if (prof) {
                    if (prof.role === 'admin' || (prof.username && prof.username.toLowerCase() === 'admin')) {
                        isAdmin = true;
                    } else {
                        isAdmin = false;
                    }
                } else {
                    if (user.user_metadata?.role === 'admin' || (user.user_metadata?.username && user.user_metadata.username.toLowerCase() === 'admin')) {
                        isAdmin = true;
                    }
                }
            } catch (e) { }

            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect');

            if (isAdmin) {
                const adminSessionData = {
                    isLoggedIn: true,
                    id: user.id,
                    username: user.user_metadata?.username || 'admin',
                    name: user.user_metadata?.nickname || user.user_metadata?.username || 'Admin',
                    email: user.email,
                    role: 'admin',
                    level: 2
                };
                sessionStorage.setItem('gyver_admin_session', JSON.stringify(adminSessionData));
                localStorage.setItem('gyver_admin_session', JSON.stringify(adminSessionData));
                window.location.href = redirectParam || '../../admin/admin_dashboard.html';
                return;
            }

            // ถ้าไม่ใช่ Admin เคลียร์ session admin ตกค้าง
            sessionStorage.removeItem('gyver_admin_session');
            localStorage.removeItem('gyver_admin_session');

            const redirectUrl = redirectParam || sessionStorage.getItem('gyver_redirect_target') || '../my_workspace.html';
            sessionStorage.removeItem('gyver_redirect_target');
            window.location.href = redirectUrl;
            return;
        }
    } catch (e) {
        console.warn("checkExistingSession error:", e);
    }
}
checkExistingSession();

// 🎛️ ตรวจสอบการส่งพารามิเตอร์เปิดแท็บสมัครสมาชิกโดยตรง (เช่น มาจากหน้านักเรียนสแกน QR Code)
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || urlParams.get('mode');
    const redirectParam = urlParams.get('redirect');

    if (redirectParam) {
        sessionStorage.setItem('gyver_redirect_target', redirectParam);
    }

    if (tab === 'register' || window.location.hash === '#register') {
        const tabRegisterBtn = document.getElementById('tab-register');
        if (tabRegisterBtn && typeof bootstrap !== 'undefined') {
            const triggerEl = new bootstrap.Tab(tabRegisterBtn);
            triggerEl.show();
        }
        showAlert('👋 กรุณาสมัครสมาชิกก่อนเข้าร่วมกิจกรรมห้องเรียนครับ (หากมีบัญชีอยู่แล้ว สามารถกดแท็บ "เข้าสู่ระบบ" ได้เลย)', 'info');
    }
});

// 🔐 1. ระบบจัดการการเข้าสู่ระบบ (Login)
document.getElementById('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();
    const identifier = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    const btnSubmit = document.getElementById('btn-login-submit');

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังตรวจสอบสิทธิ์...`;
    alertBox.classList.add('d-none');

    let targetEmail = identifier;
    let foundProfile = null;

    // ถ้าไม่ได้กรอกเป็นรูปแบบอีเมล (เช่น กรอก admin หรือ username อื่น)
    if (!identifier.includes('@')) {
        try {
            // ค้นหาอีเมลจากตาราง profiles โดยตรง
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .or(`username.ilike.${identifier},nickname.ilike.${identifier}`)
                .maybeSingle();

            if (profile) {
                foundProfile = profile;
                if (profile.email) {
                    targetEmail = profile.email;
                }
            }
        } catch (err) {
            console.warn("Profile lookup warning:", err);
        }
    }

    let authResult = null;

    // พยายามเข้าสู่ระบบด้วย targetEmail ถ้ามีรูปแบบอีเมล
    if (targetEmail.includes('@')) {
        authResult = await window.supabaseClient.auth.signInWithPassword({
            email: targetEmail,
            password: password,
        });
    }

    // กรณีถ้ายังล็อกอินไม่สำเร็จ และระบุ username เป็น "admin" ให้ลองอีเมลแอดมินมาตรฐานของระบบ
    if ((!authResult || authResult.error) && identifier.toLowerCase() === 'admin') {
        const adminCandidates = [
            'admin@gyver.local',
            'admin@admin.com',
            'admin@gmail.com',
            'admin@sgyver.com',
            'admin@gyver.com'
        ];

        for (const candidate of adminCandidates) {
            if (candidate === targetEmail) continue; // ข้ามตัวที่ลองไปแล้ว
            const testAuth = await window.supabaseClient.auth.signInWithPassword({
                email: candidate,
                password: password,
            });
            if (!testAuth.error && testAuth.data?.user) {
                authResult = testAuth;
                targetEmail = candidate;
                break;
            }
        }
    }

    // หากยังไม่สำเร็จ และไม่มี targetEmail ที่เป็นอีเมล
    if (!authResult) {
        authResult = {
            error: { message: `ไม่พบบัญชีผู้ใช้งาน "${identifier}" ในระบบ กรุณาใช้อีเมลในการเข้าสู่ระบบครับ` }
        };
    }

    const { data, error } = authResult;

    if (error) {
        let errMsg = error.message;
        if (error.message === 'Invalid login credentials') {
            if (foundProfile && foundProfile.email) {
                errMsg = `รหัสผ่านไม่ถูกต้องสำหรับบัญชี "${identifier}" (${foundProfile.email})`;
            } else {
                errMsg = 'อีเมล / Username หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
            }
        }
        showAlert(`❌ เข้าสู่ระบบไม่สำเร็จ: ${errMsg}`);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>ลงชื่อเข้าใช้งาน`;
        return;
    }

    // ล็อกอินสำเร็จ ตรวจสอบว่าเป็น Admin หรือไม่ โดยใช้ฐานข้อมูล profiles เป็นหลัก
    const user = data.user;
    let isUserAdmin = false;

    try {
        const { data: dbProf } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        if (dbProf) {
            foundProfile = dbProf;
            if (dbProf.role === 'admin' || (dbProf.username && dbProf.username.toLowerCase() === 'admin')) {
                isUserAdmin = true;
            } else {
                isUserAdmin = false;
            }
        }
    } catch (e) { }

    // กรณีไม่มีข้อมูลใน profiles ให้ดูจาก username หรือ metadata
    if (!foundProfile) {
        if (
            identifier.toLowerCase() === 'admin' ||
            (user.user_metadata?.username && user.user_metadata.username.toLowerCase() === 'admin') ||
            (user.email && user.email.toLowerCase().startsWith('admin@'))
        ) {
            isUserAdmin = true;
        }
    }

    if (isUserAdmin) {
        // อัปเดตสิทธิ์ admin ลงใน metadata และ profiles
        try {
            await window.supabaseClient.auth.updateUser({
                data: { role: 'admin' }
            });
            await window.supabaseClient.from('profiles').upsert([{
                id: user.id,
                username: foundProfile?.username || user.user_metadata?.username || identifier || 'admin',
                role: 'admin',
                level: 2,
                email: user.email
            }]);
        } catch (e) { }

        const adminSessionData = {
            isLoggedIn: true,
            id: user.id,
            username: foundProfile?.username || user.user_metadata?.username || identifier || 'admin',
            name: foundProfile?.nickname || foundProfile?.username || user.user_metadata?.nickname || 'Admin',
            email: user.email,
            role: 'admin',
            level: 2
        };
        sessionStorage.setItem('gyver_admin_session', JSON.stringify(adminSessionData));
        localStorage.setItem('gyver_admin_session', JSON.stringify(adminSessionData));

        showAlert('🎉 ล็อกอินแอดมินสำเร็จ! กำลังนำคุณเข้าสู่หน้าผู้ดูแลระบบ (Admin Dashboard)...', 'success');

        setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect');
            sessionStorage.removeItem('gyver_redirect_target');
            window.location.href = redirectParam || '../../admin/admin_dashboard.html';
        }, 800);

    } else {
        // หากไม่ใช่แอดมิน แต่มี role: 'admin' ตกค้างใน metadata ให้แก้ไขกลับเป็น 'user'
        if (user.user_metadata?.role === 'admin') {
            try {
                await window.supabaseClient.auth.updateUser({
                    data: { role: 'user' }
                });
            } catch (e) { }
        }

        // เคลียร์ session admin ตกค้าง
        sessionStorage.removeItem('gyver_admin_session');
        localStorage.removeItem('gyver_admin_session');

        showAlert('🎉 ล็อกอินสำเร็จ! กำลังนำคุณเข้าสู่ระบบ...', 'success');

        setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect');
            const redirectUrl = redirectParam || sessionStorage.getItem('gyver_redirect_target') || '../my_workspace.html';
            sessionStorage.removeItem('gyver_redirect_target');
            window.location.href = redirectUrl;
        }, 1000);
    }
});

// 📝 2. ระบบจัดการการสมัครสมาชิก (Register)
document.getElementById('form-register').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('reg-username')?.value?.trim() || '';
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    const confirmPassword = document.getElementById('reg-confirm-pass').value;
    const btnSubmit = document.getElementById('btn-reg-submit');

    if (password !== confirmPassword) {
        return showAlert('❌ รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้งครับ');
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังสมัครสมาชิก...`;
    alertBox.classList.add('d-none');

    const avatarDefault = `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(username || email)}`;

    const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                username: username,
                nickname: username,
                avatar_url: avatarDefault,
                role: 'user'
            }
        }
    });

    if (error) {
        showAlert(`❌ สมัครสมาชิกไม่สำเร็จ: ${error.message}`);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-person-plus me-2"></i>ยืนยันการสมัครสมาชิก`;
    } else {
        if (data.user) {
            try {
                await window.supabaseClient.from('profiles').upsert([{
                    id: data.user.id,
                    username: username,
                    nickname: username,
                    email: email,
                    avatar_url: avatarDefault
                }]);
            } catch (err) { }
        }

        if (data.user && data.session === null) {
            showAlert('✉️ สมัครสมาชิกเรียบร้อย! กรุณาเช็กกล่องข้อความในอีเมลของคุณเพื่อกดยืนยันตัวตนก่อนล็อกอินครับ', 'warning');
        } else {
            showAlert('🎉 สมัครสมาชิกและเข้าสู่ระบบเรียบร้อยแล้ว!', 'success');
            setTimeout(() => {
                const redirectUrl = sessionStorage.getItem('gyver_redirect_target') || '../my_workspace.html';
                sessionStorage.removeItem('gyver_redirect_target');
                window.location.href = redirectUrl;
            }, 1200);
        }
        document.getElementById('form-register').reset();
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-person-plus me-2"></i>ยืนยันการสมัครสมาชิก`;
    }
});