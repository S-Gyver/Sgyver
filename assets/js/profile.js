// assets/js/profile.js

let editAvatarBase64 = '';

function showProfileAlert(msg, type = 'danger') {
    const el = document.getElementById('profile-alert');
    if (el) {
        el.className = `alert alert-${type} py-2 small text-center`;
        el.innerText = msg;
        el.classList.remove('d-none');
    }
}

function showPasswordAlert(msg, type = 'danger') {
    const el = document.getElementById('password-alert');
    if (el) {
        el.className = `alert alert-${type} py-2 small text-center`;
        el.innerText = msg;
        el.classList.remove('d-none');
    }
}

// 🖼️ บีบอัดรูปภาพให้เล็กลงมากเป็นพิเศษ (100x100px)
function previewPageAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showProfileAlert('❌ ขนาดไฟล์ใหญ่เกิน 5MB กรุณาเลือกไฟล์ที่เล็กลง');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const targetSize = 100; // บีบรูปเหลือขนาด 100x100 px
            
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');

            let srcX = 0, srcY = 0, srcSize = Math.min(img.width, img.height);
            if (img.width > img.height) {
                srcX = (img.width - img.height) / 2;
            } else {
                srcY = (img.height - img.width) / 2;
            }

            ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, targetSize, targetSize);

            // บีบอัดเป็น JPEG คุณภาพ 0.5 (ขนาดไฟล์จะเหลือแค่ไม่กี่ KB)
            editAvatarBase64 = canvas.toDataURL('image/jpeg', 0.5);
            document.getElementById('page-avatar-preview').src = editAvatarBase64;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// โหลดข้อมูลโปรไฟล์
async function loadUserProfile() {
    if (!window.supabaseClient) return;

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session || !session.user) {
            window.location.href = '../index.html';
            return;
        }

        const username = session.user.user_metadata?.username || session.user.email.split('@')[0];
        let avatar = session.user.user_metadata?.avatar_url;
        
        // ถ้าเป็น Base64 แบบเดิมที่ยาวเกินไป ให้ใช้รูป Default ชั่วคราว
        if (!avatar || avatar.length > 50000) {
            avatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        }

        const role = session.user.user_metadata?.role || 'user';

        const sidebarName = document.getElementById('sidebar-display-name');
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        const sidebarBadge = document.getElementById('sidebar-role-badge');

        if (sidebarName) sidebarName.innerText = username;
        if (sidebarAvatar) sidebarAvatar.src = avatar;
        if (sidebarBadge) sidebarBadge.innerText = role === 'admin' ? 'Admin Lv.5' : 'User Lv.1';

        const emailInput = document.getElementById('page-email');
        const usernameInput = document.getElementById('page-username');
        const previewImg = document.getElementById('page-avatar-preview');

        if (emailInput) emailInput.value = session.user.email;
        if (usernameInput) usernameInput.value = username;
        if (previewImg) previewImg.src = avatar;

    } catch (err) {
        console.error("Load user profile error:", err);
    }
}

function setupFormListeners() {
    // 1. บันทึกแก้ไขโปรไฟล์
    const profileForm = document.getElementById('form-profile-info');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-save-profile');
            const newUsername = document.getElementById('page-username').value.trim();

            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึก...`;

            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                let currentAvatar = session.user.user_metadata?.avatar_url;

                // เช็กถ้าของเดิมยาวเกินไป ให้ตัดล้างออก
                if (currentAvatar && currentAvatar.length > 50000) {
                    currentAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                }

                // สร้าง Clean Payload
                const cleanPayload = {
                    username: newUsername,
                    role: session.user.user_metadata?.role || 'user',
                    avatar_url: editAvatarBase64 || currentAvatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
                };

                // ส่งยิงอัปเดต
                const { data, error } = await window.supabaseClient.auth.updateUser({
                    data: cleanPayload
                });

                if (error) {
                    showProfileAlert(`❌ อัปเดตไม่สำเร็จ: ${error.message}`);
                    btn.disabled = false;
                    btn.innerHTML = `<i class="bi bi-floppy-fill me-1"></i>บันทึกการเปลี่ยนแปลง`;
                } else {
                    showProfileAlert('🎉 บันทึกข้อมูลโปรไฟล์สำเร็จเรียบร้อย!', 'success');
                    editAvatarBase64 = '';
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.innerHTML = `<i class="bi bi-floppy-fill me-1"></i>บันทึกการเปลี่ยนแปลง`;
                        loadUserProfile();
                    }, 800);
                }
            } catch (err) {
                showProfileAlert(`❌ ข้อผิดพลาด: ${err.message}`);
                btn.disabled = false;
                btn.innerHTML = `<i class="bi bi-floppy-fill me-1"></i>บันทึกการเปลี่ยนแปลง`;
            }
        });
    }

    // 2. เปลี่ยนรหัสผ่าน
    const passForm = document.getElementById('form-change-password');
    if (passForm) {
        passForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-new-password').value;
            const btn = document.getElementById('btn-save-pass');

            if (newPass !== confirmPass) {
                return showPasswordAlert('❌ รหัสผ่านทั้งสองช่องไม่ตรงกัน');
            }

            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังอัปเดต...`;

            try {
                const { error } = await window.supabaseClient.auth.updateUser({
                    password: newPass
                });

                if (error) {
                    showPasswordAlert(`❌ เปลี่ยนรหัสผ่านไม่สำเร็จ: ${error.message}`);
                    btn.disabled = false;
                    btn.innerHTML = `<i class="bi bi-key-fill me-1"></i>อัปเดตรหัสผ่านใหม่`;
                } else {
                    showPasswordAlert('🎉 เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว!', 'success');
                    passForm.reset();
                    btn.disabled = false;
                    btn.innerHTML = `<i class="bi bi-key-fill me-1"></i>อัปเดตรหัสผ่านใหม่`;
                }
            } catch (err) {
                showPasswordAlert(`❌ เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน`);
                btn.disabled = false;
                btn.innerHTML = `<i class="bi bi-key-fill me-1"></i>อัปเดตรหัสผ่านใหม่`;
            }
        });
    }

    const avatarInput = document.getElementById('page-avatar-file');
    if (avatarInput) {
        avatarInput.addEventListener('change', previewPageAvatar);
    }
}

window.onload = () => {
    loadUserProfile();
    setupFormListeners();
};