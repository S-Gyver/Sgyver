let authModalInstance = null;
let selectedRegFile = null;

// 📍 Path ตรงไปยังโฟลเดอร์ admin นอกสุด
const ADMIN_DASHBOARD_PATH = './admin/admin_dashboard.html';

function showPopupAlert(message, type = 'danger') {
    const alertBox = document.getElementById('popup-auth-alert');
    if (alertBox) {
        alertBox.className = `alert alert-${type} py-2 small text-center`;
        alertBox.innerText = message;
        alertBox.classList.remove('d-none');
    }
}

function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            showPopupAlert('❌ ขนาดไฟล์รูปใหญ่เกินไป (กรุณาใช้รูปไม่เกิน 2MB)');
            event.target.value = '';
            selectedRegFile = null;
            return;
        }

        selectedRegFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewImg = document.getElementById('avatar-preview');
            if (previewImg) previewImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        selectedRegFile = null;
    }
}

async function uploadAvatarStorage(file) {
    if (!file) return 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    const fileExt = file.name.split('.').pop();
    const fileName = `reg-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await window.supabaseClient.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

    if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    }

    const { data } = window.supabaseClient.storage
        .from('avatars')
        .getPublicUrl(fileName);

    return data.publicUrl;
}

// 🔍 เช็กสถานะสิทธิ์ User (Lv.0 vs Lv.1 vs Admin)
async function checkUserLevel() {
    if (!window.supabaseClient) return;

    try {
        // 🔴 1. ตรวจสอบ Admin Session จาก SessionStorage
        const adminSessionStr = sessionStorage.getItem('gyver_admin_session');
        if (adminSessionStr) {
            try {
                const adminSession = JSON.parse(adminSessionStr);
                if (adminSession && adminSession.isLoggedIn) {
                    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                        window.location.href = ADMIN_DASHBOARD_PATH;
                    }
                    return;
                }
            } catch (e) {
                sessionStorage.removeItem('gyver_admin_session');
            }
        }

        // 🟢 2. เช็กเซสชันผู้ใช้จาก Supabase Auth
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        const loginBtn = document.getElementById('auth-login-btn');
        const userProfileZone = document.getElementById('user-profile-zone');
        const badgeText = document.getElementById('level-badge-text');
        const welcomeDesc = document.getElementById('level-welcome-desc');
        const eduWheelCard = document.getElementById('education-wheel-card');
        const eduRaceCard = document.getElementById('education-race-card');
        const eduBankCard = document.getElementById('education-bank-card');
        const teacherClassroomCard = document.getElementById('teacher-classroom-card');
        const teacherHistoryCard = document.getElementById('teacher-history-card');
        const heroCtaZone = document.getElementById('hero-cta-zone');

        const navUserName = document.getElementById('nav-user-name');
        const navUserAvatar = document.getElementById('nav-user-avatar');

        if (session && session.user) {
            const displayName = session.user.user_metadata?.username || session.user.email || '';
            const avatarUrl = session.user.user_metadata?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            
            // 👑 เช็กว่าบัญชีที่ล็อกอินมามีชื่อหรืออีเมลเป็น admin หรือไม่
            if (displayName.toLowerCase() === 'admin' || session.user.email.toLowerCase().startsWith('admin@')) {
                sessionStorage.setItem('gyver_admin_session', JSON.stringify({
                    isLoggedIn: true,
                    username: 'admin',
                    name: 'ผู้ดูแลระบบ'
                }));
                window.location.href = ADMIN_DASHBOARD_PATH;
                return;
            }

            if (loginBtn) loginBtn.classList.add('d-none');
            if (userProfileZone) {
                userProfileZone.classList.remove('d-none');
                userProfileZone.classList.add('d-flex');
                
                if (navUserName) navUserName.innerText = displayName;
                if (navUserAvatar) navUserAvatar.src = avatarUrl;
            }

            const hour = new Date().getHours();
            let greeting = 'สวัสดี';
            if (hour < 12) greeting = 'อรุณสวัสดิ์';
            else if (hour < 17) greeting = 'สวัสดีตอนบ่าย';
            else greeting = 'สวัสดีตอนเย็น';

            if (badgeText) badgeText.innerText = 'Gyver Portal (Lv.1 Member)';
            if (welcomeDesc) welcomeDesc.innerText = `${greeting}คุณ ${displayName}! ปลดล็อกสิทธิ์การใช้งานหมวดห้องเรียนอัจฉริยะเรียบร้อยแล้ว`;

            if (heroCtaZone) {
                heroCtaZone.innerHTML = '';
                heroCtaZone.classList.add('d-none');
            }

            if (eduWheelCard) {
                eduWheelCard.className = "action-card p-3 h-100";
                eduWheelCard.innerHTML = `
                    <a href="features/education/wheel/wheel_display.html" class="d-flex align-items-center gap-3 text-decoration-none text-dark h-100">
                        <div class="icon-box icon-gradient-live text-white shadow-sm">
                            <i class="bi bi-broadcast"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <h6 class="fw-bold text-dark m-0 fs-5">Gyver Wheel (Live)</h6>
                                <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 small">Lv.1 Member</span>
                            </div>
                            <p class="text-secondary small m-0">วงล้อสุ่มรายชื่อออนไลน์ บันทึกสถิติคะแนนสดลงฐานข้อมูล</p>
                        </div>
                    </a>
                `;
            }

            if (eduRaceCard) {
                eduRaceCard.className = "action-card p-3 h-100";
                eduRaceCard.innerHTML = `
                    <a href="features/education/gyver%20Code%20Race/race_home.html" class="d-flex align-items-center gap-3 text-decoration-none text-dark h-100">
                        <div class="icon-box icon-gradient-race text-white shadow-sm">
                            <i class="bi bi-controller"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <h6 class="fw-bold text-dark m-0 fs-5">Gyver Code Race</h6>
                                <span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1 small">Lv.1 Member</span>
                            </div>
                            <p class="text-secondary small m-0">เกมแข่งพิมพ์โค้ดภาษา Python ออนไลน์ สนุกตื่นเต้นแบบ Realtime</p>
                        </div>
                    </a>
                `;
            }

            if (eduBankCard) {
                eduBankCard.className = "action-card p-3 h-100";
                eduBankCard.innerHTML = `
                    <a href="features/education/question_bank/question_bank.html" class="d-flex align-items-center gap-3 text-decoration-none text-dark h-100">
                        <div class="icon-box icon-gradient-bank text-white shadow-sm">
                            <i class="bi bi-patch-question-fill"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <h6 class="fw-bold text-dark m-0 fs-5">Gyver Question Bank</h6>
                                <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 small">Lv.1 Member</span>
                            </div>
                            <p class="text-secondary small m-0">คลังคำถามและข้อสอบ สำหรับเชื่อมต่อวงล้อและเกมพิมพ์โค้ด</p>
                        </div>
                    </a>
                `;
            }

            if (teacherClassroomCard) {
                teacherClassroomCard.className = "action-card p-3 h-100";
                teacherClassroomCard.innerHTML = `
                    <a href="auth/classroom_manage/classroom_manage.html" class="d-flex align-items-center gap-3 text-decoration-none text-dark h-100">
                        <div class="icon-box icon-gradient-classroom text-white shadow-sm">
                            <i class="bi bi-people-fill"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <h6 class="fw-bold text-dark m-0 fs-5">Classroom Management</h6>
                                <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 small">Lv.1 Member</span>
                            </div>
                            <p class="text-secondary small m-0">สร้างห้องเรียน จัดการรายชื่อนักเรียน และ QR Code</p>
                        </div>
                    </a>
                `;
            }

            if (teacherHistoryCard) {
                teacherHistoryCard.className = "action-card p-3 h-100";
                teacherHistoryCard.innerHTML = `
                    <a href="auth/history/history.html" class="d-flex align-items-center gap-3 text-decoration-none text-dark h-100">
                        <div class="icon-box icon-gradient-history text-white shadow-sm">
                            <i class="bi bi-clock-history"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <h6 class="fw-bold text-dark m-0 fs-5">Activity History</h6>
                                <span class="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-2 py-1 small">Lv.1 Member</span>
                            </div>
                            <p class="text-secondary small m-0">ดูสถิติการเล่น ประวัติคะแนน และผลกิจกรรมย้อนหลัง</p>
                        </div>
                    </a>
                `;
            }

        } else {
            if (loginBtn) loginBtn.classList.remove('d-none');
            if (userProfileZone) {
                userProfileZone.classList.add('d-none');
                userProfileZone.classList.remove('d-flex');
            }

            if (badgeText) badgeText.innerText = 'Gyver Portal (Lv.0 Visitor)';
            if (welcomeDesc) welcomeDesc.innerText = 'ยินดีต้อนรับผู้เยี่ยมชม สามารถใช้เครื่องมือด่วนได้ทันที หรือลงชื่อเข้าใช้งานเพื่อปลดล็อกฟังก์ชันห้องเรียนออนไลน์';

            if (heroCtaZone) {
                heroCtaZone.classList.remove('d-none');
                heroCtaZone.innerHTML = `
                    <button class="btn btn-light text-primary fw-bold px-4 py-2 rounded-pill shadow-sm" data-bs-toggle="modal" data-bs-target="#authModal">
                        <i class="bi bi-box-arrow-in-right me-1"></i>เข้าสู่ระบบ / สมัครใช้งาน
                    </button>
                `;
            }

            if (eduWheelCard) {
                eduWheelCard.className = "action-card disabled-card p-3 d-flex align-items-center gap-3 h-100";
                eduWheelCard.innerHTML = `
                    <div class="icon-box icon-gradient-soon text-white">
                        <i class="bi bi-lock-fill"></i>
                    </div>
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h6 class="fw-bold text-muted m-0">Gyver Wheel (Live)</h6>
                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">ต้องล็อกอิน</span>
                        </div>
                        <p class="text-muted small m-0">ล็อกอินด้วยบัญชีสมาชิกเพื่อใช้งานระบบวงล้อเรียลไทม์</p>
                    </div>
                `;
            }

            if (eduRaceCard) {
                eduRaceCard.className = "action-card disabled-card p-3 d-flex align-items-center gap-3 h-100";
                eduRaceCard.innerHTML = `
                    <div class="icon-box icon-gradient-soon text-white">
                        <i class="bi bi-lock-fill"></i>
                    </div>
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h6 class="fw-bold text-muted m-0">Gyver Code Race</h6>
                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">ต้องล็อกอิน</span>
                        </div>
                        <p class="text-muted small m-0">ล็อกอินด้วยบัญชีสมาชิกเพื่อใช้งานเกมแข่งพิมพ์โค้ดออนไลน์</p>
                    </div>
                `;
            }

            if (eduBankCard) {
                eduBankCard.className = "action-card disabled-card p-3 d-flex align-items-center gap-3 h-100";
                eduBankCard.innerHTML = `
                    <div class="icon-box icon-gradient-soon text-white">
                        <i class="bi bi-lock-fill"></i>
                    </div>
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h6 class="fw-bold text-muted m-0">Gyver Question Bank</h6>
                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">ต้องล็อกอิน</span>
                        </div>
                        <p class="text-muted small m-0">คลังคำถามและข้อสอบ สำหรับเชื่อมต่อวงล้อและเกมพิมพ์โค้ด</p>
                    </div>
                `;
            }

            if (teacherClassroomCard) {
                teacherClassroomCard.className = "action-card disabled-card p-3 d-flex align-items-center gap-3 h-100";
                teacherClassroomCard.innerHTML = `
                    <div class="icon-box icon-gradient-soon text-white">
                        <i class="bi bi-lock-fill"></i>
                    </div>
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h6 class="fw-bold text-muted m-0">Classroom Management</h6>
                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">ต้องล็อกอิน</span>
                        </div>
                        <p class="text-muted small m-0">สร้างห้องเรียน จัดการรายชื่อนักเรียน และ QR Code เข้าร่วมห้อง</p>
                    </div>
                `;
            }

            if (teacherHistoryCard) {
                teacherHistoryCard.className = "action-card disabled-card p-3 d-flex align-items-center gap-3 h-100";
                teacherHistoryCard.innerHTML = `
                    <div class="icon-box icon-gradient-soon text-white">
                        <i class="bi bi-lock-fill"></i>
                    </div>
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h6 class="fw-bold text-muted m-0">Activity History</h6>
                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">ต้องล็อกอิน</span>
                        </div>
                        <p class="text-muted small m-0">ดูสถิติการเล่น ประวัติคะแนน และผลกิจกรรมย้อนหลัง</p>
                    </div>
                `;
            }
        }

    } catch (err) {
        console.log("Check user level error:", err);
    }
}

function setupPopupAuthListeners() {
    const authModalEl = document.getElementById('authModal');
    if (authModalEl) {
        authModalInstance = bootstrap.Modal.getOrCreateInstance(authModalEl);
    }

    // ล้างข้อความแจ้งเตือนเมื่อสลับแท็บ Login / Register
    const tabBtns = document.querySelectorAll('#authModal button[data-bs-toggle="pill"]');
    tabBtns.forEach(btn => {
        btn.addEventListener('shown.bs.tab', () => {
            const alertBox = document.getElementById('popup-auth-alert');
            if (alertBox) {
                alertBox.classList.add('d-none');
                alertBox.innerText = '';
            }
        });
    });

    const loginForm = document.getElementById('form-popup-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputIdentifier = document.getElementById('popup-login-email').value.trim();
            const password = document.getElementById('popup-login-pass').value;
            const btnSubmit = document.getElementById('btn-popup-login');

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังตรวจสอบ...`;

            try {
                let targetEmail = inputIdentifier;

                if (!inputIdentifier.includes('@')) {
                    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>ค้นหา Username...`;
                    
                    const { data: foundEmail, error: rpcError } = await window.supabaseClient.rpc('get_email_by_username', {
                        p_username: inputIdentifier
                    });

                    if (rpcError || !foundEmail) {
                        showPopupAlert('❌ ไม่พบชื่อผู้ใช้งาน (Username) นี้ในระบบ');
                        btnSubmit.disabled = false;
                        btnSubmit.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i>ลงชื่อเข้าใช้งาน`;
                        return;
                    }

                    targetEmail = foundEmail;
                }

                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: targetEmail,
                    password: password,
                });

                if (error) {
                    showPopupAlert(`❌ เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i>ลงชื่อเข้าใช้งาน`;
                } else {
                    const loggedUsername = data.user?.user_metadata?.username || inputIdentifier;

                    if (loggedUsername.toLowerCase() === 'admin' || targetEmail.toLowerCase().startsWith('admin@')) {
                        sessionStorage.setItem('gyver_admin_session', JSON.stringify({
                            isLoggedIn: true,
                            username: 'admin',
                            name: 'ผู้ดูแลระบบ'
                        }));

                        showPopupAlert('🔑 ยินดีต้อนรับผู้ดูแลระบบ! กำลังไปหน้า Admin Dashboard...', 'success');
                        setTimeout(() => {
                            window.location.href = ADMIN_DASHBOARD_PATH;
                        }, 800);
                    } else {
                        showPopupAlert('🎉 ล็อกอินสำเร็จ!', 'success');
                        setTimeout(() => {
                            if (authModalInstance) authModalInstance.hide();
                            btnSubmit.disabled = false;
                            btnSubmit.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i>ลงชื่อเข้าใช้งาน`;
                            loginForm.reset();
                            checkUserLevel();
                        }, 800);
                    }
                }

            } catch (err) {
                showPopupAlert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i>ลงชื่อเข้าใช้งาน`;
            }
        });
    }

    const regForm = document.getElementById('form-popup-register');
    if (regForm) {
        regForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('popup-reg-username').value.trim();
            const email = document.getElementById('popup-reg-email').value.trim();
            const password = document.getElementById('popup-reg-pass').value;
            const passwordConfirm = document.getElementById('popup-reg-pass-confirm').value;
            const btnSubmit = document.getElementById('btn-popup-reg');

            if (password !== passwordConfirm) {
                return showPopupAlert('❌ รหัสผ่านและช่องยืนยันรหัสผ่านไม่ตรงกัน');
            }

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังสมัครสมาชิก...`;

            try {
                let avatarPublicUrl = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                if (selectedRegFile) {
                    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังอัปโหลดรูปโปรไฟล์...`;
                    avatarPublicUrl = await uploadAvatarStorage(selectedRegFile);
                }

                btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึกบัญชีผู้ใช้...`;

                const { data, error } = await window.supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            username: username,
                            avatar_url: avatarPublicUrl,
                            role: username.toLowerCase() === 'admin' ? 'admin' : 'user'
                        }
                    }
                });

                if (error) {
                    showPopupAlert(`❌ สมัครไม่สำเร็จ: ${error.message}`);
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i class="bi bi-person-plus me-1"></i>ยืนยันการสมัครสมาชิก`;
                } else {
                    if (data.user && data.session === null) {
                        showPopupAlert('✉️ สมัครเรียบร้อย! กรุณาเช็กอีเมลเพื่อยืนยันตัวตนก่อนล็อกอินครับ', 'warning');
                    } else {
                        showPopupAlert('🎉 สมัครสมาชิกและล็อกอินสำเร็จ!', 'success');
                        setTimeout(() => {
                            if (authModalInstance) authModalInstance.hide();
                            checkUserLevel();
                        }, 1000);
                    }
                    regForm.reset();
                    selectedRegFile = null;
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i class="bi bi-person-plus me-1"></i>ยืนยันการสมัครสมาชิก`;
                }
            } catch (err) {
                showPopupAlert(`❌ เกิดข้อผิดพลาดในการสมัครสมาชิก: ${err.message}`);
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<i class="bi bi-person-plus me-1"></i>ยืนยันการสมัครสมาชิก`;
            }
        });
    }
}

async function logoutMainSystem() {
    sessionStorage.removeItem('gyver_admin_session');

    if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
        checkUserLevel();
    }
}

// 👁️ ปุ่มเปิด/ปิดดูรหัสผ่าน
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}

// 🕒 นาฬิกาและวันที่สดใหม่ (Real-time Live Clock)
function startLiveClock() {
    function tick() {
        const timeEl = document.getElementById('current-time-display');
        if (!timeEl) return;
        const now = new Date();
        timeEl.innerText = now.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    tick();
    setInterval(tick, 1000);
}

// 🔍 ระบบค้นหาและกรองการ์ดเครื่องมือ (Search & Filter Pills)
let currentToolFilter = 'all';

function setupToolSearchAndFilter() {
    const searchInput = document.getElementById('tool-search-input');
    const clearBtn = document.getElementById('btn-clear-search');
    const filterBtns = document.querySelectorAll('.filter-btn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (clearBtn) {
                clearBtn.classList.toggle('d-none', query === '');
            }
            applyToolFilters(query, currentToolFilter);
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentToolFilter = btn.getAttribute('data-filter') || 'all';
            const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
            applyToolFilters(query, currentToolFilter);
        });
    });
}

function clearToolSearch() {
    const searchInput = document.getElementById('tool-search-input');
    const clearBtn = document.getElementById('btn-clear-search');
    if (searchInput) {
        searchInput.value = '';
        if (clearBtn) clearBtn.classList.add('d-none');
        applyToolFilters('', currentToolFilter);
    }
}

function applyToolFilters(query, filter) {
    const toolCards = document.querySelectorAll('[data-tool-card]');
    const sections = document.querySelectorAll('[data-tool-section]');

    toolCards.forEach(card => {
        const cat = card.getAttribute('data-tool-category') || '';
        const title = (card.getAttribute('data-tool-title') || '').toLowerCase();
        const desc = (card.getAttribute('data-tool-desc') || '').toLowerCase();

        const matchesQuery = query === '' || title.includes(query) || desc.includes(query);
        const matchesCategory = filter === 'all' || cat === filter;

        if (matchesQuery && matchesCategory) {
            card.classList.remove('d-none');
        } else {
            card.classList.add('d-none');
        }
    });

    sections.forEach(sec => {
        const visibleCards = sec.querySelectorAll('[data-tool-card]:not(.d-none)');
        sec.classList.toggle('d-none', visibleCards.length === 0);
    });
}

window.onload = () => {
    checkUserLevel();
    setupPopupAuthListeners();
    startLiveClock();
    setupToolSearchAndFilter();
};