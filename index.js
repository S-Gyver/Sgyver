/**
 * ====================================================
 * 🚀 Gyver Studio Workspace - Main JavaScript (index.js)
 * ====================================================
 */

let currentUser = null;
let currentUserProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
    initClock();
    initSearchAndFilter();
    initAuthForms();
    await checkAuthState();

    // Listen for auth state changes
    if (window.supabaseClient && window.supabaseClient.auth) {
        window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await checkAuthState();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                currentUserProfile = null;
                updateUIForLoggedOut();
            }
        });
    }
});

/**
 * 🕒 1. Live Clock Display
 */
function initClock() {
    const clockEl = document.getElementById('current-time-display');
    if (!clockEl) return;

    function updateTime() {
        const now = new Date();
        const optionsDate = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
        const dateStr = now.toLocaleDateString('th-TH', optionsDate);
        const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        clockEl.innerText = `${dateStr} | ${timeStr} น.`;
    }

    updateTime();
    setInterval(updateTime, 1000);
}

/**
 * 🔒 2. Check Auth State & Update UI
 */
async function checkAuthState() {
    if (!window.supabaseClient || !window.supabaseClient.auth) {
        updateUIForLoggedOut();
        return;
    }

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session && session.user) {
            currentUser = session.user;
            await loadUserProfile(session.user.id);
            updateUIForLoggedIn();
        } else {
            currentUser = null;
            currentUserProfile = null;
            updateUIForLoggedOut();
        }
    } catch (e) {
        console.warn("Check auth state error:", e);
        updateUIForLoggedOut();
    }
}

/**
 * 👤 Load Profile data from Supabase
 */
async function loadUserProfile(userId) {
    if (!window.supabaseClient) return;

    try {
        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (!error && profile) {
            currentUserProfile = profile;
        } else {
            // Fallback metadata profile
            currentUserProfile = {
                id: userId,
                username: currentUser.user_metadata?.username || currentUser.email.split('@')[0],
                nickname: currentUser.user_metadata?.nickname || currentUser.email.split('@')[0],
                level: currentUser.user_metadata?.level || 1,
                avatar_url: currentUser.user_metadata?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
            };
        }
    } catch (e) {
        console.warn("Load profile error:", e);
    }
}

/**
 * 🟢 Update UI for Logged-In User
 */
function updateUIForLoggedIn() {
    const loginBtn = document.getElementById('auth-login-btn');
    const userZone = document.getElementById('user-profile-zone');
    const heroCtaZone = document.getElementById('hero-cta-zone');
    const levelBadge = document.getElementById('level-badge-text');
    const levelDesc = document.getElementById('level-welcome-desc');

    if (loginBtn) loginBtn.classList.add('d-none');
    if (userZone) {
        userZone.classList.remove('d-none');
        userZone.classList.add('d-flex');
    }

    const displayName = currentUserProfile?.nickname || currentUserProfile?.username || currentUser?.email?.split('@')[0] || 'Member';
    const userLevel = currentUserProfile?.level ?? 1;
    const avatarUrl = currentUserProfile?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    const navName = document.getElementById('nav-user-name');
    const navAvatar = document.getElementById('nav-user-avatar');
    const navBadge = document.getElementById('nav-user-badge');

    if (navName) navName.innerText = displayName;
    if (navAvatar) navAvatar.src = avatarUrl;
    if (navBadge) navBadge.innerText = `Lv.${userLevel}`;

    if (levelBadge) {
        levelBadge.innerText = `Gyver Member (Lv.${userLevel})`;
        levelBadge.className = 'badge bg-success text-white rounded-pill px-3 py-1 mb-2 fw-semibold';
    }
    if (levelDesc) {
        levelDesc.innerText = `ยินดีต้อนรับคุณ ${displayName} สู่ระบบจัดการเรียนรู้ออนไลน์ ปลดล็อกเครื่องมือทั้งหมดแล้ว!`;
    }

    if (heroCtaZone) {
        heroCtaZone.innerHTML = `
            <a href="auth/profile/profile.html" class="btn btn-light text-primary fw-bold px-4 py-2 rounded-pill shadow-sm text-decoration-none">
                <i class="bi bi-person-gear me-1"></i>จัดการโปรไฟล์
            </a>
            <a href="auth/classroom_manage/classroom_manage.html" class="btn btn-outline-light fw-bold px-4 py-2 rounded-pill text-decoration-none">
                <i class="bi bi-people me-1"></i>ห้องเรียนของฉัน
            </a>
        `;
    }

    // Unlock protected tool cards UI
    unlockProtectedCards(true);
}

/**
 * 🔴 Update UI for Logged-Out User
 */
function updateUIForLoggedOut() {
    const loginBtn = document.getElementById('auth-login-btn');
    const userZone = document.getElementById('user-profile-zone');
    const heroCtaZone = document.getElementById('hero-cta-zone');
    const levelBadge = document.getElementById('level-badge-text');
    const levelDesc = document.getElementById('level-welcome-desc');

    if (loginBtn) loginBtn.classList.remove('d-none');
    if (userZone) {
        userZone.classList.add('d-none');
        userZone.classList.remove('d-flex');
    }

    if (levelBadge) {
        levelBadge.innerText = 'Gyver Portal (Lv.0 Visitor)';
        levelBadge.className = 'badge bg-white text-primary rounded-pill px-3 py-1 mb-2 fw-semibold';
    }
    if (levelDesc) {
        levelDesc.innerText = 'ศูนย์รวมเครื่องมือช่วยสอนและระบบจัดการห้องเรียนออนไลน์ กรุณาล็อกอินเพื่อเข้าถึงฟังก์ชันเต็มรูปแบบ';
    }

    if (heroCtaZone) {
        heroCtaZone.innerHTML = `
            <button class="btn btn-light text-primary fw-bold px-4 py-2 rounded-pill shadow-sm"
                data-bs-toggle="modal" data-bs-target="#authModal">
                <i class="bi bi-box-arrow-in-right me-1"></i>เข้าสู่ระบบ / สมัครใช้งาน
            </button>
        `;
    }

    // Lock protected tool cards UI
    unlockProtectedCards(false);
}

/**
 * 🔓 Toggle card UI locks based on login status
 */
function unlockProtectedCards(isLoggedIn) {
    const protectedCardIds = [
        'education-wheel-card',
        'education-race-card',
        'teacher-forms-card',
        'teacher-quiz-card',
        'education-bank-card',
        'teacher-classroom-card',
        'teacher-history-card'
    ];

    protectedCardIds.forEach(id => {
        const card = document.getElementById(id);
        if (!card) return;

        const titleEl = card.querySelector('h6');
        const badge = card.querySelector('.badge');

        if (isLoggedIn) {
            card.classList.remove('disabled-card');
            card.classList.remove('opacity-75');
            if (titleEl) {
                titleEl.classList.remove('text-muted');
                titleEl.classList.add('text-dark');
            }
            if (badge) {
                badge.className = 'badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 small';
                badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>พร้อมใช้งาน';
            }
        } else {
            card.classList.add('disabled-card');
            if (titleEl) {
                titleEl.classList.remove('text-dark');
                titleEl.classList.add('text-muted');
            }
            if (badge) {
                badge.className = 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 small';
                badge.innerHTML = 'ต้องล็อกอิน';
            }
        }
    });
}

/**
 * 🔑 3. Auth Forms Handling (Login & Register Popup Forms)
 */
function initAuthForms() {
    const loginForm = document.getElementById('form-popup-login');
    const registerForm = document.getElementById('form-popup-register');

    if (loginForm) {
        loginForm.addEventListener('submit', handlePopupLoginSubmit);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handlePopupRegisterSubmit);
    }
}

/**
 * 🔐 Login Form Submit Handler
 */
async function handlePopupLoginSubmit(e) {
    e.preventDefault(); // 🛑 Critical: Prevent standard GET form submission to index.html?

    const alertBox = document.getElementById('popup-auth-alert');
    const emailInput = document.getElementById('popup-login-email')?.value?.trim();
    const password = document.getElementById('popup-login-pass')?.value;
    const submitBtn = document.getElementById('btn-popup-login');

    if (!emailInput || !password) return;

    setAlert(alertBox, 'd-none', '');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังตรวจสอบข้อมูล...`;

    let targetEmail = emailInput;

    // Handle username input instead of email
    if (!targetEmail.includes('@') && window.supabaseClient) {
        try {
            const { data: prof } = await window.supabaseClient
                .from('profiles')
                .select('email')
                .eq('username', targetEmail)
                .maybeSingle();

            if (prof && prof.email) {
                targetEmail = prof.email;
            }
        } catch (err) { }
    }

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: targetEmail,
            password: password
        });

        if (error) {
            setAlert(alertBox, 'alert-danger', `❌ เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i>ลงชื่อเข้าใช้งาน`;
        } else {
            setAlert(alertBox, 'alert-success', '🎉 ล็อกอินสำเร็จ! กำลังโหลดหน้าจอของคุณ...');

            if (targetEmail === 's.gyver36@gmail.com') {
                try {
                    await window.supabaseClient.auth.updateUser({ data: { role: 'admin' } });
                } catch (e) { }
            }

            currentUser = data.user;
            await loadUserProfile(data.user.id);
            updateUIForLoggedIn();

            setTimeout(() => {
                const modalEl = document.getElementById('authModal');
                if (modalEl && typeof bootstrap !== 'undefined') {
                    const bsModal = bootstrap.Modal.getInstance(modalEl);
                    if (bsModal) bsModal.hide();
                }
                loginForm.reset();
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i>ลงชื่อเข้าใช้งาน`;
                setAlert(alertBox, 'd-none', '');
            }, 800);
        }
    } catch (err) {
        setAlert(alertBox, 'alert-danger', `❌ เกิดข้อผิดพลาด: ${err.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i>ลงชื่อเข้าใช้งาน`;
    }
}

/**
 * 📝 Register Form Submit Handler
 */
async function handlePopupRegisterSubmit(e) {
    e.preventDefault(); // 🛑 Critical: Prevent standard GET form submission

    const alertBox = document.getElementById('popup-auth-alert');
    const username = document.getElementById('popup-reg-username')?.value?.trim();
    const email = document.getElementById('popup-reg-email')?.value?.trim();
    const password = document.getElementById('popup-reg-pass')?.value;
    const confirmPass = document.getElementById('popup-reg-pass-confirm')?.value;
    const submitBtn = document.getElementById('btn-popup-reg');

    if (password !== confirmPass) {
        setAlert(alertBox, 'alert-danger', '❌ รหัสผ่านทั้งสองช่องไม่ตรงกัน');
        return;
    }

    setAlert(alertBox, 'd-none', '');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังลงทะเบียน...`;

    // Preview avatar or default dicebear avatar
    let avatarUrl = `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(username || email)}`;
    const previewImg = document.getElementById('avatar-preview');
    if (previewImg && previewImg.src && !previewImg.src.includes('cdn-icons-png')) {
        avatarUrl = previewImg.src;
    }

    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username,
                    nickname: username,
                    avatar_url: avatarUrl,
                    level: 1,
                    role: 'user'
                }
            }
        });

        if (error) {
            setAlert(alertBox, 'alert-danger', `❌ สมัครสมาชิกไม่สำเร็จ: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="bi bi-person-plus me-1"></i>ยืนยันการสมัครสมาชิก`;
        } else {
            if (data.user) {
                try {
                    await window.supabaseClient.from('profiles').upsert([{
                        id: data.user.id,
                        username: username,
                        nickname: username,
                        email: email,
                        avatar_url: avatarUrl,
                        level: 1
                    }]);
                } catch (err) { }
            }

            if (data.user && data.session === null) {
                setAlert(alertBox, 'alert-warning', '✉️ สมัครเรียบร้อย! กรุณาเช็กอีเมลเพื่อกดยืนยันตัวตนก่อนล็อกอินครับ');
            } else {
                setAlert(alertBox, 'alert-success', '🎉 สมัครสมาชิกและเข้าสู่ระบบเรียบร้อยแล้ว!');
                currentUser = data.user;
                await loadUserProfile(data.user.id);
                updateUIForLoggedIn();

                setTimeout(() => {
                    const modalEl = document.getElementById('authModal');
                    if (modalEl && typeof bootstrap !== 'undefined') {
                        const bsModal = bootstrap.Modal.getInstance(modalEl);
                        if (bsModal) bsModal.hide();
                    }
                }, 1000);
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="bi bi-person-plus me-1"></i>ยืนยันการสมัครสมาชิก`;
        }
    } catch (err) {
        setAlert(alertBox, 'alert-danger', `❌ เกิดข้อผิดพลาด: ${err.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-person-plus me-1"></i>ยืนยันการสมัครสมาชิก`;
    }
}

/**
 * 🚨 Helper function for alert display
 */
function setAlert(el, alertClass, message) {
    if (!el) return;
    if (alertClass === 'd-none') {
        el.className = 'alert d-none py-2 small text-center';
        el.innerText = '';
    } else {
        el.className = `alert ${alertClass} py-2 small text-center`;
        el.innerText = message;
        el.classList.remove('d-none');
    }
}

/**
 * 🚪 Logout Handler
 */
async function logoutMainSystem() {
    if (window.supabaseClient && window.supabaseClient.auth) {
        await window.supabaseClient.auth.signOut();
    }
    currentUser = null;
    currentUserProfile = null;
    updateUIForLoggedOut();
    window.location.reload();
}

/**
 * 🛡️ Protected Tool Card Click Handler
 */
function handleProtectedToolClick(event, targetUrl, toolTitle) {
    if (currentUser) {
        window.location.href = targetUrl;
    } else {
        if (event) event.preventDefault();
        const alertBox = document.getElementById('popup-auth-alert');
        setAlert(alertBox, 'alert-info', `👋 คุณกำลังเข้าถึง "${toolTitle}" กรุณาล็อกอินหรือสมัครสมาชิกเพื่อเปิดใช้งานฟีเจอร์นี้ครับ`);

        const modalEl = document.getElementById('authModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            bsModal.show();
        } else {
            window.location.href = 'auth/login/login.html';
        }
    }
}

/**
 * 👁️ Password Visibility Toggle Helper
 */
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bi bi-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'bi bi-eye';
    }
}

/**
 * 🖼️ Preview selected avatar image
 */
function previewAvatar(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('avatar-preview');
    if (!file || !preview) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * 🔍 4. Tool Search & Category Pills Filter
 */
function initSearchAndFilter() {
    const searchInput = document.getElementById('tool-search-input');
    const filterBtns = document.querySelectorAll('#filter-pills-group .filter-btn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('[data-tool-card]');

            cards.forEach(card => {
                const title = (card.getAttribute('data-tool-title') || '').toLowerCase();
                const desc = (card.getAttribute('data-tool-desc') || '').toLowerCase();
                if (title.includes(term) || desc.includes(term)) {
                    card.parentElement.style.display = '';
                } else {
                    card.parentElement.style.display = 'none';
                }
            });
        });
    }

    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterCategory = btn.getAttribute('data-filter');
                const sections = document.querySelectorAll('[data-tool-section]');

                sections.forEach(sec => {
                    const secCat = sec.getAttribute('data-tool-category');
                    if (filterCategory === 'all' || filterCategory === secCat) {
                        sec.style.display = '';
                    } else {
                        sec.style.display = 'none';
                    }
                });
            });
        });
    }
}

/**
 * 🎮 ระบบเข้าห้องสอบ / กิจกรรมผ่าน Modal (พิมพ์ PIN หรือเปิดกล้องสแกน QR Code)
 */
let html5QrScanner = null;

function prepareJoinModal() {
    stopCameraScanner();
    setTimeout(() => {
        const pinInput = document.getElementById('modal-join-pin');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
    }, 350);
}

function openJoinRoomModal() {
    prepareJoinModal();
    const modalEl = document.getElementById('joinRoomModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }
}

// เมื่อกด Submit ใน Modal
async function handleModalJoinRoom(event) {
    if (event) event.preventDefault();
    const pinInput = document.getElementById('modal-join-pin');
    if (!pinInput) return;

    let pin = pinInput.value.trim().toUpperCase();
    if (!pin) {
        alert('กรุณากรอกเลขห้อง (PIN)');
        pinInput.focus();
        return;
    }

    stopCameraScanner();

    // ปิด Modal
    const modalEl = document.getElementById('joinRoomModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
    }

    // Direct เข้าสู่หน้าสอบนักเรียนพร้อม PIN ทันที
    window.location.href = `features/education/quiz/quiz_student.html?pin=${encodeURIComponent(pin)}`;
}

// สลับเปิด/ปิดกล้องสแกน QR Code
function toggleCameraScanner() {
    const box = document.getElementById('modal-qr-box');
    if (!box) return;

    if (box.classList.contains('d-none')) {
        startCameraScanner();
    } else {
        stopCameraScanner();
    }
}

// เริ่มเปิดกล้องอ่าน QR Code
function startCameraScanner() {
    const box = document.getElementById('modal-qr-box');
    const btnText = document.getElementById('btn-toggle-qr-text');
    if (box) box.classList.remove('d-none');
    if (btnText) btnText.textContent = 'กำลังเปิดกล้อง...';

    if (typeof Html5Qrcode === 'undefined') {
        alert('ระบบกล้องยังโหลดไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง');
        if (box) box.classList.add('d-none');
        if (btnText) btnText.textContent = 'เปิดกล้องเพื่อสแกน QR Code';
        return;
    }

    if (html5QrScanner) {
        stopCameraScanner();
    }

    try {
        html5QrScanner = new Html5Qrcode('modal-qr-reader');
        const config = { 
            fps: 10, 
            qrbox: { width: 220, height: 220 } 
        };

        html5QrScanner.start(
            { facingMode: 'environment' },
            config,
            onQrScanSuccess,
            () => {
                // Ignore scanning frames without QR
            }
        ).then(() => {
            if (btnText) btnText.textContent = 'ปิดกล้องสแกน';
        }).catch(err => {
            console.error('Camera access error:', err);
            if (box) box.classList.add('d-none');
            if (btnText) btnText.textContent = 'เปิดกล้องเพื่อสแกน QR Code';
            alert('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์การใช้กล้องในเบราว์เซอร์ของคุณ หรือพิมพ์รหัส PIN แทนครับ');
        });
    } catch (e) {
        console.error('QR scanner exception:', e);
        if (box) box.classList.add('d-none');
        if (btnText) btnText.textContent = 'เปิดกล้องเพื่อสแกน QR Code';
    }
}

// หยุดการทำงานของกล้อง
function stopCameraScanner() {
    if (html5QrScanner) {
        try {
            html5QrScanner.stop().then(() => {
                html5QrScanner.clear();
                html5QrScanner = null;
            }).catch(() => {
                html5QrScanner = null;
            });
        } catch (e) {
            html5QrScanner = null;
        }
    }
    const box = document.getElementById('modal-qr-box');
    const btnText = document.getElementById('btn-toggle-qr-text');
    if (box) box.classList.add('d-none');
    if (btnText) btnText.textContent = 'เปิดกล้องเพื่อสแกน QR Code';
}

// เมื่อสแกน QR Code สำเร็จ
function onQrScanSuccess(decodedText) {
    stopCameraScanner();

    // ปิด Modal
    const modalEl = document.getElementById('joinRoomModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
    }

    let extractedPin = '';

    // กรณีเป็น URL ที่มีพารามิเตอร์ pin หรือ room
    if (decodedText.includes('pin=')) {
        try {
            const url = new URL(decodedText);
            extractedPin = (url.searchParams.get('pin') || '').trim().toUpperCase();
        } catch (e) {
            const match = decodedText.match(/pin=([^&]+)/);
            if (match) extractedPin = match[1].trim().toUpperCase();
        }
    } else if (decodedText.includes('room=')) {
        try {
            const url = new URL(decodedText);
            extractedPin = (url.searchParams.get('room') || '').trim().toUpperCase();
        } catch (e) {
            const match = decodedText.match(/room=([^&]+)/);
            if (match) extractedPin = match[1].trim().toUpperCase();
        }
    } else if (/^\d{4,8}$/.test(decodedText.trim())) {
        extractedPin = decodedText.trim().toUpperCase();
    } else if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        // ลิงก์ตรง ไปยังหน้านั้นทันที
        window.location.href = decodedText;
        return;
    } else {
        extractedPin = decodedText.trim().toUpperCase();
    }

    if (extractedPin) {
        window.location.href = `features/education/quiz/quiz_student.html?pin=${encodeURIComponent(extractedPin)}`;
    } else {
        alert('QR Code ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
}

// ตรวจจับเมื่อ Modal ถูกปิด ให้ปิดกล้องทันที
document.addEventListener('DOMContentLoaded', () => {
    const joinModalEl = document.getElementById('joinRoomModal');
    if (joinModalEl) {
        joinModalEl.addEventListener('hidden.bs.modal', () => {
            stopCameraScanner();
        });
    }
});

window.openJoinRoomModal = openJoinRoomModal;
window.prepareJoinModal = prepareJoinModal;
window.handleModalJoinRoom = handleModalJoinRoom;
window.toggleCameraScanner = toggleCameraScanner;
window.startCameraScanner = startCameraScanner;
window.stopCameraScanner = stopCameraScanner;


