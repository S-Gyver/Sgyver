let currentClassData = null;
let currentStudentUser = null;
let currentStudentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) {
        alert('ไม่พบรหัสห้องเรียน กรุณาสแกน QR Code ใหม่อีกครั้ง');
        return;
    }

    const badgeEl = document.getElementById('room-code-badge');
    if (badgeEl) badgeEl.innerText = code;

    // 🔍 1. ตรวจสอบการสมัครใช้งาน / ล็อกอินของนักเรียนก่อนเข้าห้องเรียน
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        alert('ไม่สามารถเชื่อมต่อระบบฐานข้อมูลได้ กรุณาลองใหม่');
        return;
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        // 🛑 ถ้านักเรียนยังไม่ได้สมัครสมาชิก หรือยังไม่ได้เข้าสู่ระบบ -> เด้งไปหน้าสมัครสมาชิกทันที
        if (!session || !session.user) {
            const checkingText = document.getElementById('auth-checking-text');
            if (checkingText) {
                checkingText.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-triangle-fill me-1"></i>ยังไม่พบการสมัครสมาชิก!</span><br>กำลังนำคุณไปยังหน้าสมัครสมาชิกก่อนเข้าร่วมกิจกรรม...';
            }

            sessionStorage.setItem('gyver_redirect_target', window.location.href);
            
            setTimeout(() => {
                window.location.href = `../login/login.html?tab=register&redirect=${encodeURIComponent(window.location.href)}`;
            }, 600);
            return;
        }

        // 🟢 ถ้าล็อกอินแล้ว แสดงฟอร์มและดึงข้อมูลโปรไฟล์มาแสดงในช่องต่างๆ
        currentStudentUser = session.user;
        await setupAuthenticatedStudentUI();
        await fetchClassroomData(code);

    } catch (err) {
        console.error("Auth check error:", err);
        window.location.href = `../login/login.html?tab=register&redirect=${encodeURIComponent(window.location.href)}`;
    }
});

async function setupAuthenticatedStudentUI() {
    const checkingState = document.getElementById('auth-checking-state');
    const joinContent = document.getElementById('join-content');
    const displayAccount = document.getElementById('student-display-account');

    if (checkingState) checkingState.classList.add('d-none');
    if (joinContent) joinContent.classList.remove('d-none');

    // ค่าเริ่มต้นจากข้อมูลการสมัคร
    let avatarUrl = currentStudentUser.user_metadata?.avatar_url || 
                    `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(currentStudentUser.email || 'Student')}`;
    let nickname = currentStudentUser.user_metadata?.nickname || currentStudentUser.user_metadata?.username || '';
    let firstName = currentStudentUser.user_metadata?.first_name || '';
    let lastName = currentStudentUser.user_metadata?.last_name || '';
    let phone = currentStudentUser.user_metadata?.phone || '';

    // 📡 ดึงข้อมูลโดยตรงจากหน้าจัดการโปรไฟล์ (ตาราง profiles)
    try {
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentStudentUser.id)
            .maybeSingle();

        if (profile) {
            currentStudentProfile = profile;
            if (profile.avatar_url) avatarUrl = profile.avatar_url;
            if (profile.nickname) nickname = profile.nickname;
            if (profile.first_name) firstName = profile.first_name;
            if (profile.last_name) lastName = profile.last_name;
            if (profile.phone) phone = profile.phone;
        }
    } catch (e) {
        console.warn("Profile fetch error:", e);
    }

    // ✍️ เติมข้อมูลลงช่อง Input อัตโนมัติ (กรณีไม่มีข้อมูล นร จะพิมพ์เอง)
    const avatarImg = document.getElementById('profile-avatar-preview');
    const nickInput = document.getElementById('student-nickname');
    const firstInput = document.getElementById('student-firstname');
    const lastInput = document.getElementById('student-lastname');
    const phoneInput = document.getElementById('student-phone');

    if (avatarImg) avatarImg.src = avatarUrl;
    if (nickInput && nickname) nickInput.value = nickname;
    if (firstInput && firstName) firstInput.value = firstName;
    if (lastInput && lastName) lastInput.value = lastName;
    if (phoneInput && phone) phoneInput.value = phone;

    if (displayAccount) {
        displayAccount.innerText = (nickname || `${firstName} ${lastName}`.trim() || currentStudentUser.email).trim();
    }
}

let selectedCustomAvatarFile = null;

// 📸 จัดการเมื่อนักเรียนเลือกรูปของตัวเอง
function handleCustomAvatarSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('รูปภาพมีขนาดใหญ่เกินไป กรุณาเลือกรูปขนาดไม่เกิน 5MB ครับ');
        return;
    }

    selectedCustomAvatarFile = file;
    const previewUrl = URL.createObjectURL(file);
    const avatarImg = document.getElementById('profile-avatar-preview');
    if (avatarImg) avatarImg.src = previewUrl;
}

// 🎲 สุ่มรูปอวตารใหม่
function randomizeAvatar() {
    selectedCustomAvatarFile = null;
    const randomSeed = `Student_${Math.floor(Math.random() * 100000)}`;
    const newAvatarUrl = `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(randomSeed)}`;
    const avatarImg = document.getElementById('profile-avatar-preview');
    if (avatarImg) avatarImg.src = newAvatarUrl;
}

// ☁️ อัปโหลดรูปภาพไปยัง Supabase Storage พร้อม Fallback Data URL
async function uploadAvatarStorage(file) {
    if (!file) return 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `student_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

    try {
        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (!uploadError) {
            const { data } = supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);
            if (data && data.publicUrl) return data.publicUrl;
        }
    } catch (e) {
        console.warn("Storage upload error:", e);
    }

    // กรณีไม่ได้ตั้ง Bucket หรือติด Permission ให้แปลงเป็น Base64 Data URL เพื่อไม่ให้รูปหาย
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// 🔄 ปุ่มเปลี่ยนบัญชี (Sign Out แล้วไปหน้าล็อกอิน)
async function handleSwitchAccount(e) {
    if (e) e.preventDefault();
    if (confirm('คุณต้องการออกจากระบบเพื่อสลับบัญชีอื่นใช่หรือไม่?')) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        sessionStorage.setItem('gyver_redirect_target', window.location.href);
        window.location.href = `../login/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
}

async function fetchClassroomData(code) {
    const { data, error } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('room_code', code)
        .maybeSingle();

    const nameEl = document.getElementById('room-name-display');
    const submitBtn = document.getElementById('submit-btn');

    if (error || !data) {
        if (nameEl) nameEl.innerText = 'ไม่พบห้องเรียนนี้';
        if (submitBtn) submitBtn.disabled = true;
    } else {
        currentClassData = data;
        if (nameEl) nameEl.innerText = data.class_name || 'ไม่มีชื่อห้อง';
    }
}

async function submitStudentName(e) {
    e.preventDefault();
    if (!currentClassData || !currentStudentUser) return;

    const nickname = document.getElementById('student-nickname')?.value?.trim() || '';
    const firstName = document.getElementById('student-firstname')?.value?.trim() || '';
    const lastName = document.getElementById('student-lastname')?.value?.trim() || '';
    const phone = document.getElementById('student-phone')?.value?.trim() || '';

    if (!nickname || !firstName || !lastName) {
        alert('กรุณากรอกชื่อเล่น ชื่อจริง และนามสกุลให้ครบถ้วนครับ');
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึกข้อมูลและเข้าห้อง...';

    // ตรวจสอบว่ามีการอัปโหลดรูปภาพตัวเองหรือไม่
    let avatarUrl = document.getElementById('profile-avatar-preview')?.src || 
                      `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(nickname || firstName)}`;

    if (selectedCustomAvatarFile) {
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังอัปโหลดรูปโปรไฟล์...';
        avatarUrl = await uploadAvatarStorage(selectedCustomAvatarFile);
    }

    // 💾 1. บันทึกข้อมูลกลับลงไปยังหน้าจัดการโปรไฟล์ (ตาราง profiles) เสมอ
    try {
        await supabaseClient
            .from('profiles')
            .upsert([{
                id: currentStudentUser.id,
                nickname: nickname,
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                avatar_url: avatarUrl
            }]);

        await supabaseClient.auth.updateUser({
            data: {
                nickname: nickname,
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                avatar_url: avatarUrl
            }
        });
    } catch (err) {
        console.warn("Update profile error:", err);
    }

    // 💾 2. บันทึกรายชื่อเข้าห้องเรียน (ตาราง classrooms)
    let currentStudents = Array.isArray(currentClassData.students) ? currentClassData.students : [];

    // ชื่อที่จะแสดงบนวงล้อและในห้องเรียน: ชื่อเล่น (ชื่อจริง นามสกุล)
    const displayName = `${nickname} (${firstName} ${lastName})`.trim();

    // 🛑 ตรวจสอบชื่อซ้ำในห้อง
    const isDuplicate = currentStudents.some(s => 
        (s.user_id && s.user_id === currentStudentUser.id) || 
        s.name === displayName || 
        (s.first_name === firstName && s.last_name === lastName)
    );

    if (isDuplicate) {
        // ถ้านักเรียนมีชื่ออยู่แล้ว ให้ปรับปรุงข้อมูลเป็นล่าสุด
        currentStudents = currentStudents.map(s => {
            if ((s.user_id && s.user_id === currentStudentUser.id) || s.name === displayName) {
                return {
                    ...s,
                    name: displayName,
                    nickname: nickname,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    image: avatarUrl,
                    user_id: currentStudentUser.id,
                    email: currentStudentUser.email
                };
            }
            return s;
        });
    } else {
        // ➕ เพิ่มนักเรียนใหม่
        currentStudents.push({
            name: displayName,
            nickname: nickname,
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            user_id: currentStudentUser.id,
            email: currentStudentUser.email,
            score: 0,
            spunCount: 0,
            image: avatarUrl
        });
    }

    // อัปเดตกลับลงตาราง classrooms ใน Supabase
    const { error } = await supabaseClient
        .from('classrooms')
        .update({ students: currentStudents })
        .eq('id', currentClassData.id);

    if (!error) {
        // บันทึกลง activity_logs ด้วย (ถ้ามี)
        try {
            await supabaseClient.from('activity_logs').insert([{
                user_id: currentStudentUser.id,
                activity_type: 'เข้าร่วมห้องเรียน',
                description: `เข้าร่วมห้องเรียน: ${currentClassData.class_name || currentClassData.name || ''} (รหัสห้อง: ${currentClassData.room_code})`,
                score_change: 0
            }]);
        } catch (logErr) {
            console.warn('Activity log record warn:', logErr);
        }

        document.getElementById('join-form').classList.add('d-none');
        document.getElementById('result-success').classList.remove('d-none');
    } else {
        alert('เกิดข้อผิดพลาดในการบันทึกห้องเรียน กรุณาลองใหม่อีกครั้ง');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send-fill me-1"></i> ยืนยันเข้าร่วมห้อง';
    }
}