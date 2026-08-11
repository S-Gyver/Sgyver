// index.js

let authModalInstance = null;
let selectedRegFile = null;

function showPopupAlert(message, type = 'danger') {
    const alertBox = document.getElementById('popup-auth-alert');
    if (alertBox) {
        alertBox.className = `alert alert-${type} py-2 small text-center`;
        alertBox.innerText = message;
        alertBox.classList.remove('d-none');
    }
}

// 🖼️ พรีวิวรูปและเก็บตัวแปรไฟล์รูปภาพ
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

// ☁️ ฟังก์ชันอัปโหลดรูปขึ้น Supabase Storage (Bucket: avatars)
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

// 🔍 เช็กสถานะสิทธิ์ User (Lv.0 vs Lv.1)
async function checkUserLevel() {
    if (!window.supabaseClient) return;

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        const loginBtn = document.getElementById('auth-login-btn');
        const userProfileZone = document.getElementById('user-profile-zone');
        const badgeText = document.getElementById('level-badge-text');
        const welcomeDesc = document.getElementById('level-welcome-desc');
        const eduWheelCard = document.getElementById('education-wheel-card');

        const navUserName = document.getElementById('nav-user-name');
        const navUserAvatar = document.getElementById('nav-user-avatar');

        if (session && session.user) {
            const displayName = session.user.user_metadata?.username || session.user.email;
            const avatarUrl = session.user.user_metadata?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            
            if (loginBtn) loginBtn.classList.add('d-none');
            if (userProfileZone) {
                userProfileZone.classList.remove('d-none');
                userProfileZone.classList.add('d-flex');
                
                if (navUserName) navUserName.innerText = displayName;
                if (navUserAvatar) navUserAvatar.src = avatarUrl;
            }

            if (badgeText) badgeText.innerText = 'Gyver Portal (Lv.1 Member)';
            if (welcomeDesc) welcomeDesc.innerText = `ยินดีต้อนรับคุณ ${displayName} ปลดล็อกสิทธิ์การใช้งานหมวดห้องเรียนอัจฉริยะเรียบร้อยแล้ว`;

            if (eduWheelCard) {
                eduWheelCard.className = "action-card p-3 h-100";
                eduWheelCard.innerHTML = `
                    <a href="features/education/wheel/wheel.html" class="d-flex align-items-center gap-3 text-decoration-none text-dark h-100">
                        <div class="icon-box bg-primary bg-gradient text-white shadow-sm">
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

        } else {
            if (loginBtn) loginBtn.classList.remove('d-none');
            if (userProfileZone) {
                userProfileZone.classList.add('d-none');
                userProfileZone.classList.remove('d-flex');
            }

            if (badgeText) badgeText.innerText = 'Gyver Portal (Lv.0 Visitor)';
            if (welcomeDesc) welcomeDesc.innerText = 'ยินดีต้อนรับผู้เยี่ยมชม สามารถใช้เครื่องมือด่วนได้ทันที หรือลงชื่อเข้าใช้งานเพื่อปลดล็อกฟังก์ชันห้องเรียนออนไลน์';

            if (eduWheelCard) {
                eduWheelCard.className = "action-card disabled-card p-3 d-flex align-items-center gap-3 h-100";
                eduWheelCard.innerHTML = `
                    <div class="icon-box bg-secondary bg-gradient text-white">
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

    // 1. ฟอร์มเข้าสู่ระบบ (Login)
    const loginForm = document.getElementById('form-popup-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('popup-login-email').value.trim();
            const password = document.getElementById('popup-login-pass').value;
            const btnSubmit = document.getElementById('btn-popup-login');

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังตรวจสอบ...`;

            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                showPopupAlert(`❌ เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i>ลงชื่อเข้าใช้งาน`;
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
        });
    }

    // 2. ฟอร์มสมัครสมาชิก (Register)
    const regForm = document.getElementById('form-popup-register');
    if (regForm) {
        regForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('popup-reg-username').value.trim();
            const email = document.getElementById('popup-reg-email').value.trim();
            const password = document.getElementById('popup-reg-pass').value;
            const passwordConfirm = document.getElementById('popup-reg-pass-confirm').value;
            const btnSubmit = document.getElementById('btn-popup-reg');

            // 🛑 เช็กรหัสผ่านทั้งสองช่องว่าตรงกันหรือไม่
            if (password !== passwordConfirm) {
                return showPopupAlert('❌ รหัสผ่านและช่องยืนยันรหัสผ่านไม่ตรงกัน');
            }

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังสมัครสมาชิก...`;

            try {
                // 1. อัปโหลดรูปโปรไฟล์ (ถ้ามี) ขึ้น Storage
                let avatarPublicUrl = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                if (selectedRegFile) {
                    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังอัปโหลดรูปโปรไฟล์...`;
                    avatarPublicUrl = await uploadAvatarStorage(selectedRegFile);
                }

                btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึกบัญชีผู้ใช้...`;

                // 2. สมัครสมาชิกพร้อมเก็บ Public URL
                const { data, error } = await window.supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            username: username,
                            avatar_url: avatarPublicUrl,
                            role: 'user'
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
    if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
        checkUserLevel();
    }
}

window.onload = () => {
    checkUserLevel();
    setupPopupAuthListeners();
};