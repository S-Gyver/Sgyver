let currentUserId = null;
const animalPresetList = [
    { name: 'Tiger (เสือ)', seed: 'Tiger' }, { name: 'Bear (หมี)', seed: 'Bear' },
    { name: 'Panda (แพนด้า)', seed: 'Panda' }, { name: 'Fox (จิ้งจอก)', seed: 'Fox' },
    { name: 'Bunny (กระต่าย)', seed: 'Bunny' }, { name: 'Cat (แมว)', seed: 'Cat' },
    { name: 'Dog (สุนัข)', seed: 'Dog' }, { name: 'Lion (สิงโต)', seed: 'Lion' }
];

document.addEventListener('DOMContentLoaded', async () => {
    renderAnimalAvatarGrid();
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

function selectAnimalAvatar(url) {
    document.getElementById('profile-avatar-preview').src = url;
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) sidebarAvatar.src = url;

    const modalEl = document.getElementById('animalAvatarModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
    showToast('info', 'เลือกอวตารสำเร็จ', 'อย่าลืมกดกดบันทึกการเปลี่ยนแปลงเพื่ออัปเดตข้อมูล');
}

async function loadUserProfileData() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
        currentUserId = session.user.id;
        document.getElementById('profile-email').value = session.user.email || '';
        
        const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUserId).maybeSingle();
        if (data) {
            document.getElementById('profile-username').value = data.username || '';
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
        }
    }
}

async function handleSaveProfile(e) {
    e.preventDefault();
    const avatarUrl = document.getElementById('profile-avatar-preview').src;

    const payload = {
        username: document.getElementById('profile-username').value,
        nickname: document.getElementById('profile-nickname').value,
        first_name: document.getElementById('profile-firstname').value,
        last_name: document.getElementById('profile-lastname').value,
        phone: document.getElementById('profile-phone').value,
        avatar_url: avatarUrl
    };

    const { error } = await supabaseClient.from('profiles').update(payload).eq('id', currentUserId);
    if (!error) {
        showToast('success', 'บันทึกสำเร็จ!', 'ข้อมูลโปรไฟล์ของคุณถูกอัปเดตเรียบร้อยแล้ว');
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
    } else {
        showToast('error', 'บันทึกล้มเหลว', error.message);
    }
}