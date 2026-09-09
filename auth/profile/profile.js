let currentUserId = null;
const animalPresetList = [
    { name: 'Tiger (เสือ)', seed: 'Tiger' }, { name: 'Bear (หมี)', seed: 'Bear' },
    { name: 'Panda (แพนด้า)', seed: 'Panda' }, { name: 'Fox (จิ้งจอก)', seed: 'Fox' },
    { name: 'Bunny (กระต่าย)', seed: 'Bunny' }, { name: 'Cat (แมว)', seed: 'Cat' },
    { name: 'Dog (สุนัข)', seed: 'Dog' }, { name: 'Lion (สิงโต)', seed: 'Lion' }
];

document.addEventListener('DOMContentLoaded', async () => {
    renderAnimalAvatarGrid();
    setupAvatarUploadListener();
    await loadUserProfileData();
});

function renderAnimalAvatarGrid() {
    const grid = document.getElementById('animal-avatar-grid');
    if (!grid) return;
    grid.innerHTML = animalPresetList.map(a => {
        const avatarUrl = `https://api.dicebear.com/7.x/big-smile/svg?seed=${a.seed}`;
        return `
            <div class="col-4 col-sm-3 col-md-2 text-center">
                <div class="p-2 border rounded-4 bg-light animal-avatar-card shadow-sm h-100 d-flex flex-column align-items-center justify-content-center" onclick="selectAnimalAvatar('${avatarUrl}')" style="cursor: pointer;">
                    <img src="${avatarUrl}" class="rounded-circle border border-2 border-success bg-white mb-2" style="width: 60px; height: 60px; object-fit: cover;">
                    <small class="d-block text-truncate fw-bold text-dark font-mono" style="font-size: 0.75rem;">${a.name}</small>
                </div>
            </div>`;
    }).join('');
}

function setupAvatarUploadListener() {
    const fileInput = document.getElementById('profile-avatar-file');
    if (!fileInput) return;

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('error', 'ไฟล์ใหญ่เกินไป', 'กรุณาเลือกไฟล์ขนาดไม่เกิน 2MB');
            fileInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            const dataUrl = evt.target.result;
            document.getElementById('profile-avatar-preview').src = dataUrl;
            const sidebarAvatar = document.getElementById('sidebar-avatar');
            if (sidebarAvatar) sidebarAvatar.src = dataUrl;
            showToast('info', 'เลือกรูปภาพแล้ว', 'อย่าลืมกดบันทึกการเปลี่ยนแปลงเพื่ออัปเดต');
        };
        reader.readAsDataURL(file);
    });
}

function selectAnimalAvatar(url) {
    document.getElementById('profile-avatar-preview').src = url;
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) sidebarAvatar.src = url;

    const modalEl = document.getElementById('animalAvatarModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
    showToast('info', 'เลือกอวตารสำเร็จ', 'อย่าลืมกดบันทึกการเปลี่ยนแปลงเพื่ออัปเดตข้อมูล');
}

async function loadUserProfileData() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
        currentUserId = session.user.id;
        document.getElementById('profile-email').value = session.user.email || '';
        
        const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUserId).maybeSingle();
        if (data) {
            document.getElementById('profile-username').value = data.username || session.user.user_metadata?.username || '';
            document.getElementById('profile-nickname').value = data.nickname || '';
            document.getElementById('profile-firstname').value = data.first_name || '';
            document.getElementById('profile-lastname').value = data.last_name || '';
            document.getElementById('profile-phone').value = data.phone || '';

            if (data.avatar_url) {
                document.getElementById('profile-avatar-preview').src = data.avatar_url;
                const sidebarAvatar = document.getElementById('sidebar-avatar');
                if (sidebarAvatar) sidebarAvatar.src = data.avatar_url;
            }

            const sidebarName = document.getElementById('sidebar-display-name');
            if (sidebarName) sidebarName.innerText = data.nickname || data.username || 'ผู้ใช้งาน';
        } else {
            // ค่าเริ่มต้นจาก auth metadata
            document.getElementById('profile-username').value = session.user.user_metadata?.username || '';
            if (session.user.user_metadata?.avatar_url) {
                document.getElementById('profile-avatar-preview').src = session.user.user_metadata.avatar_url;
                const sidebarAvatar = document.getElementById('sidebar-avatar');
                if (sidebarAvatar) sidebarAvatar.src = session.user.user_metadata.avatar_url;
            }
        }

        // ตรวจสอบว่าจำเป็นต้องแจ้งเตือนให้กรอกโปรไฟล์หรือไม่
        const targetTool = sessionStorage.getItem('gyver_target_tool_url');
        const urlParams = new URLSearchParams(window.location.search);
        const isRequiredFlow = targetTool || urlParams.get('required') === '1';

        const isMissingInfo = !data?.nickname?.trim() || !data?.first_name?.trim() || !data?.last_name?.trim() || !data?.phone?.trim();

        const warningAlert = document.getElementById('profile-warning-alert');
        if (warningAlert && (isRequiredFlow || isMissingInfo)) {
            warningAlert.classList.remove('d-none');
            
            // โฟกัสช่องแรกที่ยังว่างอยู่
            if (!data?.nickname?.trim()) {
                document.getElementById('profile-nickname')?.focus();
            } else if (!data?.first_name?.trim()) {
                document.getElementById('profile-firstname')?.focus();
            } else if (!data?.last_name?.trim()) {
                document.getElementById('profile-lastname')?.focus();
            } else if (!data?.phone?.trim()) {
                document.getElementById('profile-phone')?.focus();
            }
        }
    }
}

async function handleSaveProfile(e) {
    e.preventDefault();
    if (!currentUserId) {
        showToast('error', 'ไม่พบผู้ใช้งาน', 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        return;
    }

    const username = document.getElementById('profile-username').value.trim();
    const nickname = document.getElementById('profile-nickname').value.trim();
    const firstName = document.getElementById('profile-firstname').value.trim();
    const lastName = document.getElementById('profile-lastname').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const avatarUrl = document.getElementById('profile-avatar-preview').src;

    if (!username) {
        showToast('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกชื่อผู้ใช้งาน (Username)');
        document.getElementById('profile-username')?.focus();
        return;
    }

    if (!nickname || !firstName || !lastName || !phone) {
        showToast('warning', 'ข้อมูลยังไม่ครบถ้วน', 'กรุณาระบุชื่อเล่น ชื่อจริง นามสกุล และเบอร์โทรศัพท์ให้ครบทุกช่อง');
        if (!nickname) document.getElementById('profile-nickname')?.focus();
        else if (!firstName) document.getElementById('profile-firstname')?.focus();
        else if (!lastName) document.getElementById('profile-lastname')?.focus();
        else if (!phone) document.getElementById('profile-phone')?.focus();
        return;
    }

    const saveBtn = document.getElementById('btn-save-profile');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...';
    }

    try {
        const payload = {
            id: currentUserId,
            username: username,
            nickname: nickname,
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            avatar_url: avatarUrl
        };

        const { error } = await supabaseClient.from('profiles').upsert(payload);
        if (error) throw error;

        // อัปเดต metadata ของผู้ใช้ใน Supabase Auth ด้วย (ถ้ามี)
        try {
            await supabaseClient.auth.updateUser({
                data: {
                    username: username,
                    avatar_url: avatarUrl
                }
            });
        } catch (metaErr) {
            console.warn('Update user metadata warn:', metaErr);
        }

        const sidebarAvatar = document.getElementById('sidebar-avatar');
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        const sidebarName = document.getElementById('sidebar-display-name');
        if (sidebarName) sidebarName.innerText = nickname || username;

        const warningAlert = document.getElementById('profile-warning-alert');
        if (warningAlert) warningAlert.classList.add('d-none');

        // หากมีเครื่องมือที่ผู้ใช้ตั้งใจจะเปิด ให้พาผู้ใช้กลับไปยังเครื่องมือนั้นอัตโนมัติ
        const targetTool = sessionStorage.getItem('gyver_target_tool_url');
        if (targetTool) {
            sessionStorage.removeItem('gyver_target_tool_url');
            showToast('success', 'บันทึกสำเร็จ!', 'ข้อมูลโปรไฟล์ครบถ้วนแล้ว กำลังเปิดเครื่องมือที่คุณเลือก...');
            setTimeout(() => {
                window.location.href = '../../' + targetTool;
            }, 1200);
        } else {
            showToast('success', 'บันทึกสำเร็จ!', 'ข้อมูลโปรไฟล์ของคุณถูกอัปเดตเรียบร้อยแล้ว');
        }
    } catch (err) {
        console.error('Save profile error:', err);
        showToast('error', 'บันทึกล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-floppy-fill me-1"></i>บันทึกการเปลี่ยนแปลง';
        }
    }
}