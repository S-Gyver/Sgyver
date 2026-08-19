let currentUserId = null;
let isEmailEditable = false;

document.addEventListener('DOMContentLoaded', async () => {
    const fileInput = document.getElementById('profile-avatar-file') || document.getElementById('page-avatar-file');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    alert("⚠️ ไฟล์รูปภาพใหญ่เกินไป (ต้องไม่เกิน 2MB)");
                    fileInput.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.getElementById('profile-avatar-preview') || document.getElementById('page-avatar-preview');
                    if (preview) preview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    await loadUserProfileData();
});

function enableEmailEdit() {
    const emailInput = document.getElementById('profile-email') || document.getElementById('page-email');
    const btnEdit = document.getElementById('btn-toggle-edit-email');
    const helpText = document.getElementById('email-help-text');

    if (!emailInput) return;

    isEmailEditable = !isEmailEditable;

    if (isEmailEditable) {
        emailInput.removeAttribute('readonly');
        emailInput.removeAttribute('disabled');
        emailInput.classList.remove('bg-light');
        emailInput.focus();

        if (btnEdit) {
            btnEdit.className = "btn btn-warning font-mono fw-bold";
            btnEdit.innerHTML = `<i class="bi bi-lock-fill me-1"></i>ล็อคช่อง`;
        }
        if (helpText) helpText.innerText = "⚠️ คุณกำลังแก้ไขอีเมล กรุณากด 'บันทึกการเปลี่ยนแปลง' ด้านล่างเมื่อเสร็จสิ้น";
    } else {
        emailInput.setAttribute('readonly', 'true');
        emailInput.setAttribute('disabled', 'true');
        emailInput.classList.add('bg-light');

        if (btnEdit) {
            btnEdit.className = "btn btn-outline-warning font-mono fw-bold";
            btnEdit.innerHTML = `<i class="bi bi-pencil-square me-1"></i>แก้ไขอีเมล`;
        }
        if (helpText) helpText.innerText = "* กดปุ่มแก้ไขเพื่อเปลี่ยนที่อยู่อีเมลใหม่";
    }
}

async function loadUserProfileData() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        let userEmail = '';
        let targetId = null;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            userEmail = session.user.email || '';
            targetId = session.user.id;
        }

        const savedAdminSession = sessionStorage.getItem('gyver_admin_session') || localStorage.getItem('gyver_admin_session');
        let adminData = null;
        if (savedAdminSession) {
            try {
                adminData = JSON.parse(savedAdminSession);
                if (adminData) {
                    if (!userEmail) userEmail = adminData.email || '';
                    if (!targetId) targetId = adminData.id || null;
                }
            } catch (e) {}
        }

        let profile = null;

        if (targetId) {
            const { data } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', targetId)
                .maybeSingle();
            profile = data;
        }

        if (!profile && userEmail) {
            const { data } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('email', userEmail)
                .maybeSingle();
            profile = data;
        }

        if (profile) {
            currentUserId = profile.id;

            if (profile.avatar_url) {
                const previewImg = document.getElementById('profile-avatar-preview') || document.getElementById('page-avatar-preview');
                const sidebarAvatar = document.getElementById('sidebar-avatar');
                if (previewImg) previewImg.src = profile.avatar_url;
                if (sidebarAvatar) sidebarAvatar.src = profile.avatar_url;
            }

            const usernameInput = document.getElementById('profile-username') || document.getElementById('page-username');
            if (usernameInput) usernameInput.value = profile.username || '';

            const emailInput = document.getElementById('profile-email') || document.getElementById('page-email');
            if (emailInput) emailInput.value = profile.email || userEmail || '';

            // 🇹🇭 ข้อมูลภาษาไทย
            if (document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = profile.nickname || '';
            if (document.getElementById('profile-firstname')) document.getElementById('profile-firstname').value = profile.first_name || '';
            if (document.getElementById('profile-lastname')) document.getElementById('profile-lastname').value = profile.last_name || '';

            // 🇬🇧 ข้อมูลภาษาอังกฤษ
            if (document.getElementById('profile-nickname-en')) document.getElementById('profile-nickname-en').value = profile.nickname_en || '';
            if (document.getElementById('profile-firstname-en')) document.getElementById('profile-firstname-en').value = profile.first_name_en || '';
            if (document.getElementById('profile-lastname-en')) document.getElementById('profile-lastname-en').value = profile.last_name_en || '';

            // ชั้นเรียน / เลขที่ / โทรศัพท์ / Social
            if (document.getElementById('profile-class')) document.getElementById('profile-class').value = profile.student_class || '';
            if (document.getElementById('profile-number')) document.getElementById('profile-number').value = profile.student_number || '';
            if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = profile.phone || '';
            if (document.getElementById('profile-line')) document.getElementById('profile-line').value = profile.line_id || '';
            if (document.getElementById('profile-facebook')) document.getElementById('profile-facebook').value = profile.facebook || '';
            if (document.getElementById('profile-instagram')) document.getElementById('profile-instagram').value = profile.instagram || '';

            const sidebarName = document.getElementById('sidebar-display-name');
            const sidebarBadge = document.getElementById('sidebar-role-badge');
            if (sidebarName) sidebarName.innerText = profile.nickname ? `${profile.nickname} (${profile.username})` : profile.username;
            if (sidebarBadge) sidebarBadge.innerText = `Role: ${(profile.role || 'user').toUpperCase()} (Lv.${profile.level ?? 1})`;
        }

    } catch (err) {
        console.error("Load user profile catch error:", err);
    }
}

// 💾 บันทึกข้อมูลโปรไฟล์กลับลง Supabase
async function handleSaveProfile(e) {
    if (e) e.preventDefault();

    const usernameInput = document.getElementById('profile-username') || document.getElementById('page-username');
    const emailInput = document.getElementById('profile-email') || document.getElementById('page-email');

    const usernameVal = usernameInput?.value.trim() || '';
    const emailVal = emailInput?.value.trim() || '';

    if (!emailVal && !usernameVal) return alert("⚠️ กรุณากรอกชื่อผู้ใช้งานหรืออีเมลก่อนบันทึกครับ");

    const btnSave = document.getElementById('btn-save-profile');
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...`;
    }

    try {
        if (isEmailEditable && emailVal) {
            const { error: authErr } = await supabaseClient.auth.updateUser({ email: emailVal });
            if (authErr) {
                console.warn("Supabase Auth Email Update Warning:", authErr.message);
            }
        }

        const fileInput = document.getElementById('profile-avatar-file') || document.getElementById('page-avatar-file');
        const previewImg = document.getElementById('profile-avatar-preview') || document.getElementById('page-avatar-preview');
        let avatarUrl = previewImg?.src || '';

        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar_${currentUserId || Date.now()}_${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadErr } = await supabaseClient.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (!uploadErr) {
                const { data: publicUrlData } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
                avatarUrl = publicUrlData.publicUrl;
            }
        }

        // 🟢 ตัด updated_at ออก ป้องกันปัญหา Schema Cache Error
        const profilePayload = {
            username: usernameVal,
            email: emailVal,
            nickname: document.getElementById('profile-nickname')?.value.trim() || null,
            first_name: document.getElementById('profile-firstname')?.value.trim() || null,
            last_name: document.getElementById('profile-lastname')?.value.trim() || null,
            nickname_en: document.getElementById('profile-nickname-en')?.value.trim() || null,
            first_name_en: document.getElementById('profile-firstname-en')?.value.trim() || null,
            last_name_en: document.getElementById('profile-lastname-en')?.value.trim() || null,
            student_class: document.getElementById('profile-class')?.value.trim() || null,
            student_number: document.getElementById('profile-number')?.value.trim() || null,
            phone: document.getElementById('profile-phone')?.value.trim() || null,
            line_id: document.getElementById('profile-line')?.value.trim() || null,
            facebook: document.getElementById('profile-facebook')?.value.trim() || null,
            instagram: document.getElementById('profile-instagram')?.value.trim() || null,
            avatar_url: avatarUrl
        };

        let resultError = null;

        if (currentUserId) {
            const { error } = await supabaseClient
                .from('profiles')
                .update(profilePayload)
                .eq('id', currentUserId);
            resultError = error;
        } else {
            const { error } = await supabaseClient
                .from('profiles')
                .update(profilePayload)
                .eq('email', emailVal);
            resultError = error;
        }

        if (resultError) {
            alert("❌ บันทึกข้อมูลล้มเหลว: " + resultError.message);
        } else {
            alert("✅ บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว!");
            if (isEmailEditable) enableEmailEdit();
            await loadUserProfileData();
        }

    } catch (err) {
        console.error("Save profile catch error:", err);
        alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = `<i class="bi bi-floppy-fill me-1"></i>บันทึกการเปลี่ยนแปลง`;
        }
    }
}

async function logoutProfilePage() {
    if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        sessionStorage.clear();
        localStorage.removeItem('gyver_admin_session');
        window.location.href = '../index.html';
    }
}