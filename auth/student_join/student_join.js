let currentClassData = null;
let currentStudentUser = null;
let currentStudentProfile = null;
let selectedCustomAvatarFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) {
        alert('ไม่พบรหัสห้องเรียน กรุณาสแกน QR Code ใหม่อีกครั้ง');
        return;
    }

    const badgeEl = document.getElementById('room-code-badge');
    if (badgeEl) badgeEl.innerText = code;

    // ตรวจสอบ client
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        alert('ไม่สามารถเชื่อมต่อระบบฐานข้อมูลได้ กรุณาลองใหม่');
        return;
    }

    // โหลดข้อมูลห้องเรียน
    await fetchClassroomData(code);

    // 📲 ตรวจสอบว่าเป็นโหมดสแกน QR เช็คชื่อรายวัน (mode=checkin) หรือไม่
    const mode = urlParams.get('mode');
    if (mode === 'checkin' && currentClassData) {
        await setupAttendanceCheckinMode(urlParams);
        return;
    }

    // ตรวจสอบการสมัครใช้งาน / ล็อกอิน
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session && session.user) {
            // 🟢 เข้าสู่ระบบแล้ว
            currentStudentUser = session.user;
            await setupAuthenticatedStudentUI();
        } else {
            // ⚪ ยังไม่เคยเข้าสู่ระบบ -> เปิดโหมดสมัครสมาชิกไปในตัวเลย
            currentStudentUser = null;
            setupGuestStudentUI();
        }
    } catch (err) {
        console.warn("Auth check error, fallback to guest:", err);
        currentStudentUser = null;
        setupGuestStudentUI();
    }
});

// 🟢 โหมดนักเรียนที่เข้าสู่ระบบแล้ว (Authenticated User)
async function setupAuthenticatedStudentUI() {
    const checkingState = document.getElementById('auth-checking-state');
    const joinContent = document.getElementById('join-content');
    const authBadge = document.getElementById('auth-user-badge');
    const guestBanner = document.getElementById('guest-register-banner');
    const credSection = document.getElementById('new-user-credentials-section');
    const stepHeader = document.getElementById('profile-step-header');
    const displayAccount = document.getElementById('student-display-account');
    const submitBtn = document.getElementById('submit-btn');

    if (checkingState) checkingState.classList.add('d-none');
    if (joinContent) joinContent.classList.remove('d-none');
    if (authBadge) authBadge.classList.remove('d-none');
    if (guestBanner) guestBanner.classList.add('d-none');
    if (credSection) credSection.classList.add('d-none');
    if (stepHeader) stepHeader.classList.add('d-none');

    // ไม่บังคับรหัสผ่านในโหมดล็อกอินแล้ว
    const identInput = document.getElementById('student-identifier');
    const passInput = document.getElementById('student-password');
    if (identInput) identInput.required = false;
    if (passInput) passInput.required = false;

    if (submitBtn) {
        submitBtn.innerHTML = '<i class="bi bi-send-fill me-1"></i> ยืนยันเข้าร่วมห้อง';
        submitBtn.className = 'btn btn-primary btn-lg w-100 fw-bold rounded-3 shadow';
    }

    const mainHeading = document.getElementById('join-main-heading');
    const subHeading = document.getElementById('join-sub-heading');
    if (mainHeading) mainHeading.innerText = 'ลงชื่อเข้าร่วมกิจกรรม';
    if (subHeading) subHeading.innerText = 'ตรวจสอบหรือกรอกข้อมูลโปรไฟล์เพื่อเข้าร่วมห้องเรียน';

    // ข้อมูลโปรไฟล์เดิม
    let avatarUrl = currentStudentUser.user_metadata?.avatar_url || 
                    `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(currentStudentUser.email || 'Student')}`;
    let nickname = currentStudentUser.user_metadata?.nickname || currentStudentUser.user_metadata?.username || '';
    let firstName = currentStudentUser.user_metadata?.first_name || '';
    let lastName = currentStudentUser.user_metadata?.last_name || '';
    let phone = currentStudentUser.user_metadata?.phone || '';

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

// ⚪ โหมดนักเรียนใหม่ที่ยังไม่มีบัญชี (Guest / In-place Registration)
function setupGuestStudentUI() {
    const checkingState = document.getElementById('auth-checking-state');
    const joinContent = document.getElementById('join-content');
    const authBadge = document.getElementById('auth-user-badge');
    const guestBanner = document.getElementById('guest-register-banner');
    const credSection = document.getElementById('new-user-credentials-section');
    const stepHeader = document.getElementById('profile-step-header');
    const submitBtn = document.getElementById('submit-btn');

    if (checkingState) checkingState.classList.add('d-none');
    if (joinContent) joinContent.classList.remove('d-none');
    if (authBadge) authBadge.classList.add('d-none');
    if (guestBanner) guestBanner.classList.remove('d-none');
    if (credSection) credSection.classList.remove('d-none');
    if (stepHeader) stepHeader.classList.remove('d-none');

    // บังคับกรอกข้อมูลบัญชี
    const identInput = document.getElementById('student-identifier');
    const passInput = document.getElementById('student-password');
    if (identInput) identInput.required = true;
    if (passInput) passInput.required = true;

    if (submitBtn) {
        submitBtn.innerHTML = '<i class="bi bi-rocket-takeoff-fill me-1"></i> สมัครสมาชิก & เข้าห้องเรียนทันที';
        submitBtn.className = 'btn btn-primary btn-lg w-100 fw-bold rounded-3 shadow';
    }

    const mainHeading = document.getElementById('join-main-heading');
    const subHeading = document.getElementById('join-sub-heading');
    if (mainHeading) mainHeading.innerText = 'ลงชื่อเข้าร่วมห้องเรียน';
    if (subHeading) subHeading.innerText = 'สร้างบัญชีสมาชิกและเข้าร่วมห้องเรียนในครั้งเดียว';

    // สุ่มอวตารเริ่มต้น
    randomizeAvatar();
}

// 👁️ สลับการมองเห็นรหัสผ่าน
function toggleJoinPassword() {
    const passInput = document.getElementById('student-password');
    const icon = document.getElementById('toggle-pass-icon');
    if (!passInput) return;

    if (passInput.type === 'password') {
        passInput.type = 'text';
        if (icon) icon.className = 'bi bi-eye-slash';
    } else {
        passInput.type = 'password';
        if (icon) icon.className = 'bi bi-eye';
    }
}

// 🔑 Modal เข้าสู่ระบบด่วน สำหรับนักเรียนที่มีบัญชีอยู่แล้ว
function openQuickLoginModal() {
    const modalEl = document.getElementById('quickLoginModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function goToFullLoginPage(e) {
    if (e) e.preventDefault();
    sessionStorage.setItem('gyver_redirect_target', window.location.href);
    window.location.href = `../login/login.html?redirect=${encodeURIComponent(window.location.href)}`;
}

async function handleQuickLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('quick-login-id')?.value?.trim() || '';
    const password = document.getElementById('quick-login-pass')?.value || '';
    const alertBox = document.getElementById('quick-login-alert');
    const submitBtn = document.getElementById('btn-quick-login-submit');

    if (!identifier || !password) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังตรวจสอบ...';
    if (alertBox) alertBox.classList.add('d-none');

    let targetEmail = identifier;
    // ถ้าไม่ได้ใส่อีเมล ค้นหาจาก username / nickname ใน profiles
    if (!identifier.includes('@')) {
        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .or(`username.ilike.${identifier},nickname.ilike.${identifier}`)
                .maybeSingle();

            if (profile && profile.email) {
                targetEmail = profile.email;
            } else {
                targetEmail = `${identifier.toLowerCase().replace(/[^a-z0-9_]/g, '')}@student.sgyver.local`;
            }
        } catch (err) {
            console.warn("Profile lookup err:", err);
        }
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: targetEmail,
        password: password
    });

    if (error) {
        if (alertBox) {
            alertBox.innerText = `เข้าสู่ระบบไม่สำเร็จ: ${error.message === 'Invalid login credentials' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : error.message}`;
            alertBox.classList.remove('d-none');
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'เข้าสู่ระบบ';
        return;
    }

    currentStudentUser = data.user;
    bootstrap.Modal.getInstance(document.getElementById('quickLoginModal'))?.hide();
    await setupAuthenticatedStudentUI();
}

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
        currentStudentUser = null;
        setupGuestStudentUI();
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

// 🚀 ส่งข้อมูลเข้าร่วมห้องเรียน (พร้อมสมัครสมาชิกอัตโนมัติหากยังไม่มีบัญชี)
async function submitStudentName(e) {
    e.preventDefault();
    if (!currentClassData) {
        alert('ไม่พบข้อมูลห้องเรียน กรุณาลองใหม่อีกครั้ง');
        return;
    }

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

    // ตรวจสอบว่ามีการอัปโหลดรูปภาพตัวเองหรือไม่
    let avatarUrl = document.getElementById('profile-avatar-preview')?.src || 
                      `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(nickname || firstName)}`;

    if (selectedCustomAvatarFile) {
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังอัปโหลดรูปโปรไฟล์...';
        avatarUrl = await uploadAvatarStorage(selectedCustomAvatarFile);
    }

    // 🚀 1. กรณีนักเรียนใหม่ ยังไม่มีบัญชีผู้ใช้ -> สมัครสมาชิกทันที
    let studentEmail = currentStudentUser?.email || '';
    let studentUsername = nickname;

    if (!currentStudentUser) {
        const identifier = document.getElementById('student-identifier')?.value?.trim() || '';
        const password = document.getElementById('student-password')?.value || '';

        if (!identifier) {
            alert('กรุณากรอกอีเมล หรือรหัสนักเรียนสำหรับใช้เข้าสู่ระบบครับ');
            document.getElementById('student-identifier')?.focus();
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-rocket-takeoff-fill me-1"></i> สมัครสมาชิก & เข้าห้องเรียนทันที';
            return;
        }

        if (!password || password.length < 6) {
            alert('กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษรครับ');
            document.getElementById('student-password')?.focus();
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-rocket-takeoff-fill me-1"></i> สมัครสมาชิก & เข้าห้องเรียนทันที';
            return;
        }

        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังสร้างบัญชีผู้ใช้ใหม่...';

        if (identifier.includes('@')) {
            studentEmail = identifier.toLowerCase();
            studentUsername = identifier.split('@')[0].replace(/[^a-z0-9_]/g, '') || nickname;
        } else {
            studentUsername = identifier.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (studentUsername.length < 3) {
                alert('รหัสนักเรียนหรือชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร (ภาษาอังกฤษหรือตัวเลข) ครับ');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-rocket-takeoff-fill me-1"></i> สมัครสมาชิก & เข้าห้องเรียนทันที';
                return;
            }
            studentEmail = `${studentUsername}@student.sgyver.local`;
        }

        // เรียกสมัครสมาชิกผ่าน Supabase auth
        const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
            email: studentEmail,
            password: password,
            options: {
                data: {
                    username: studentUsername,
                    nickname: nickname,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    avatar_url: avatarUrl,
                    role: 'student'
                }
            }
        });

        if (signUpError) {
            console.error("SignUp error:", signUpError);
            let msg = signUpError.message;
            if (msg.includes('User already registered') || msg.includes('already exists')) {
                alert(`⚠️ บัญชี "${identifier}" นี้มีอยู่ในระบบแล้ว!\nหากคุณเป็นเจ้าของบัญชีนี้ กรุณากดปุ่ม "มีบัญชีแล้ว?" เพื่อเข้าสู่ระบบด้วยรหัสผ่านของคุณ`);
            } else {
                alert(`สมัครสมาชิกไม่สำเร็จ: ${msg}`);
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-rocket-takeoff-fill me-1"></i> สมัครสมาชิก & เข้าห้องเรียนทันที';
            return;
        }

        currentStudentUser = signUpData.user;

        // ถ้า Supabase ไม่ได้ auto-login session ให้ลอง signInWithPassword ทันที
        if (!signUpData.session) {
            try {
                const { data: signInData } = await supabaseClient.auth.signInWithPassword({
                    email: studentEmail,
                    password: password
                });
                if (signInData?.user) currentStudentUser = signInData.user;
            } catch (err) {
                console.warn("Auto signIn warn:", err);
            }
        }
    }

    if (!currentStudentUser) {
        alert('ไม่สามารถยืนยันตัวตนผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send-fill me-1"></i> ยืนยันเข้าร่วมห้อง';
        return;
    }

    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึกข้อมูลเข้าห้องเรียน...';

    // 💾 2. บันทึกข้อมูลลงตาราง profiles
    try {
        await supabaseClient
            .from('profiles')
            .upsert([{
                id: currentStudentUser.id,
                username: studentUsername || nickname,
                nickname: nickname,
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                email: studentEmail || currentStudentUser.email,
                avatar_url: avatarUrl,
                role: 'student'
            }]);

        await supabaseClient.auth.updateUser({
            data: {
                username: studentUsername || nickname,
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

    // 💾 3. บันทึกรายชื่อเข้าห้องเรียน (ตาราง classrooms)
    let currentStudents = Array.isArray(currentClassData.students) ? currentClassData.students : [];
    const displayName = `${nickname} (${firstName} ${lastName})`.trim();

    const isDuplicate = currentStudents.some(s => 
        (s.user_id && s.user_id === currentStudentUser.id) || 
        s.name === displayName || 
        (s.first_name === firstName && s.last_name === lastName)
    );

    if (isDuplicate) {
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
                    email: studentEmail || currentStudentUser.email
                };
            }
            return s;
        });
    } else {
        currentStudents.push({
            name: displayName,
            nickname: nickname,
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            user_id: currentStudentUser.id,
            email: studentEmail || currentStudentUser.email,
            score: 0,
            spunCount: 0,
            image: avatarUrl
        });
    }

    const { error } = await supabaseClient
        .from('classrooms')
        .update({ students: currentStudents })
        .eq('id', currentClassData.id);

    if (!error) {
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

        const enterClassBtn = document.getElementById('btn-enter-student-classroom');
        if (enterClassBtn && currentClassData.room_code) {
            enterClassBtn.href = `../my_classroom/student_view.html?code=${encodeURIComponent(currentClassData.room_code)}`;
        }

        const successTitle = document.getElementById('success-title');
        const successSub = document.getElementById('success-subtitle');
        if (successTitle) successTitle.innerText = 'ลงชื่อและเข้าร่วมห้องเรียนสำเร็จ!';
        if (successSub) successSub.innerText = `ยินดีต้อนรับ ${nickname} เข้าสู่ห้อง ${currentClassData.class_name || ''} เรียบร้อยแล้ว`;

        document.getElementById('join-form').classList.add('d-none');
        document.getElementById('result-success').classList.remove('d-none');
    } else {
        alert('เกิดข้อผิดพลาดในการบันทึกห้องเรียน กรุณาลองใหม่อีกครั้ง');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send-fill me-1"></i> ยืนยันเข้าร่วมห้อง';
    }
}

// =============================================================================
// 📲 โหมดสแกน QR เช็คชื่อเข้าเรียนรายวัน (Daily Attendance Check-in Mode)
// =============================================================================
let selectedCheckinStudentKey = null;
let selectedCheckinStudentObj = null;
let currentCheckinDate = '';
let currentCheckinStatus = 'present';

async function setupAttendanceCheckinMode(urlParams) {
    const checkingState = document.getElementById('auth-checking-state');
    const joinContent = document.getElementById('join-content');
    const checkinContent = document.getElementById('checkin-content');

    if (checkingState) checkingState.classList.add('d-none');
    if (joinContent) joinContent.classList.add('d-none');
    if (checkinContent) checkinContent.classList.remove('d-none');

    currentCheckinDate = urlParams.get('date') || new Date().toISOString().split('T')[0];
    currentCheckinStatus = urlParams.get('status') === 'late' ? 'late' : 'present';

    const roomNameEl = document.getElementById('checkin-room-name');
    const dateBadgeEl = document.getElementById('checkin-date-badge');
    const statusBadgeEl = document.getElementById('checkin-status-badge');

    if (roomNameEl) roomNameEl.innerText = currentClassData.class_name || 'ห้องเรียน';
    if (dateBadgeEl) dateBadgeEl.innerText = `วันที่: ${currentCheckinDate}`;
    if (statusBadgeEl) {
        if (currentCheckinStatus === 'late') {
            statusBadgeEl.className = 'badge bg-warning text-dark rounded-pill px-3 py-1';
            statusBadgeEl.innerText = '🟡 สถานะ: มาสาย';
        } else {
            statusBadgeEl.className = 'badge bg-success text-white rounded-pill px-3 py-1';
            statusBadgeEl.innerText = '🟢 สถานะ: มาเรียน';
        }
    }

    // ลองตรวจสอบว่ามี session ล็อกอิน หรือเคยจำชื่อนักเรียนในเครื่องนี้ไว้หรือไม่
    let rememberedKey = null;
    try {
        rememberedKey = localStorage.getItem(`gyver_checkin_student_${currentClassData.room_code}`);
    } catch (_) {}

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
            currentStudentUser = session.user;
            const students = Array.isArray(currentClassData.students) ? currentClassData.students : [];
            const matched = students.find(s => (s.user_id && s.user_id === session.user.id) || (s.email && s.email === session.user.email));
            if (matched) {
                rememberedKey = matched.user_id || matched.name;
            }
        }
    } catch (_) {}

    renderCheckinStudentList('', rememberedKey);
}

function renderCheckinStudentList(filterText = '', preselectKey = null) {
    const listEl = document.getElementById('checkin-student-list');
    const confirmBtn = document.getElementById('btn-confirm-checkin');
    if (!listEl || !currentClassData) return;

    const students = Array.isArray(currentClassData.students) ? currentClassData.students : [];
    const dayLogs = (currentClassData.attendance_logs && currentClassData.attendance_logs[currentCheckinDate]) || {};
    const q = (filterText || '').trim().toLowerCase();

    if (students.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-4 text-muted small">
                ยังไม่มีรายชื่อนักเรียนในห้องนี้<br>
                กรุณากดปุ่มด้านล่างเพื่อลงทะเบียนเพิ่มชื่อเข้าห้องเรียนก่อนครับ
            </div>
        `;
        return;
    }

    if (preselectKey) {
        const found = students.find(s => (s.user_id || s.name) === preselectKey || s.name === preselectKey);
        if (found) {
            selectedCheckinStudentKey = found.user_id || found.name;
            selectedCheckinStudentObj = found;
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ยืนยันเช็คชื่อ "${found.name}"`;
            }
        }
    }

    const filtered = students.map((s, idx) => ({ s, idx })).filter(({ s }) => {
        if (!q) return true;
        return (s.name && s.name.toLowerCase().includes(q)) || (s.nickname && s.nickname.toLowerCase().includes(q));
    });

    listEl.innerHTML = filtered.map(({ s, idx }) => {
        const sKey = s.user_id || s.name;
        const isSelected = (selectedCheckinStudentKey === sKey || selectedCheckinStudentKey === s.name);
        const alreadyChecked = dayLogs[sKey] || dayLogs[s.name];
        const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;

        return `
            <div onclick="selectStudentForCheckin(${idx})"
                 class="d-flex align-items-center justify-content-between p-2 mb-1.5 rounded-3 border ${isSelected ? 'border-success bg-success-subtle shadow-sm' : 'bg-white'}"
                 style="cursor: pointer; transition: all 0.15s;">
                <div class="d-flex align-items-center gap-2.5 text-truncate">
                    <img src="${avatar}" class="rounded-circle border" style="width: 40px; height: 40px; object-fit: cover; flex-shrink: 0;">
                    <div class="text-truncate">
                        <div class="fw-bold text-dark small text-truncate">${idx + 1}. ${s.name}</div>
                        <div class="text-muted" style="font-size: 0.72rem;">
                            ${alreadyChecked ? '<span class="text-success fw-semibold">✓ เช็คชื่อวันนี้แล้ว</span>' : 'แตะเพื่อเลือกชื่อของคุณ'}
                        </div>
                    </div>
                </div>
                <div class="ms-2 flex-shrink-0">
                    ${isSelected
                        ? '<i class="bi bi-check-circle-fill text-success fs-4"></i>'
                        : (alreadyChecked ? '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">เช็คแล้ว</span>' : '<i class="bi bi-circle text-muted fs-5"></i>')}
                </div>
            </div>
        `;
    }).join('');
}

function filterCheckinStudentList(val) {
    renderCheckinStudentList(val);
}

function selectStudentForCheckin(studentIndex) {
    if (!currentClassData || !Array.isArray(currentClassData.students)) return;
    const s = currentClassData.students[studentIndex];
    if (!s) return;

    selectedCheckinStudentKey = s.user_id || s.name;
    selectedCheckinStudentObj = s;

    const confirmBtn = document.getElementById('btn-confirm-checkin');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ยืนยันเช็คชื่อ "${s.name}"`;
    }

    const searchVal = document.getElementById('checkin-search-input')?.value || '';
    renderCheckinStudentList(searchVal);
}

async function submitStudentCheckin() {
    if (!currentClassData || !selectedCheckinStudentKey || !selectedCheckinStudentObj) {
        alert('กรุณาแตะเลือกชื่อของคุณก่อนครับ');
        return;
    }

    const confirmBtn = document.getElementById('btn-confirm-checkin');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึกการเช็คชื่อ...';
    }

    const extraNote = document.getElementById('checkin-note-input')?.value?.trim() || '';
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const noteText = extraNote ? `สแกน QR ${nowTime} น. (${extraNote})` : `สแกน QR ${nowTime} น.`;

    try {
        // 1. ดึง attendance_logs ล่าสุดจากฐานข้อมูลเพื่อไม่ให้ทับข้อมูลเพื่อนที่สแกนพร้อมกัน
        const { data: freshRoom } = await supabaseClient
            .from('classrooms')
            .select('attendance_logs')
            .eq('id', currentClassData.id)
            .maybeSingle();

        const logs = (freshRoom && freshRoom.attendance_logs && typeof freshRoom.attendance_logs === 'object')
            ? freshRoom.attendance_logs
            : (currentClassData.attendance_logs || {});

        if (!logs[currentCheckinDate]) {
            logs[currentCheckinDate] = {};
        }

        logs[currentCheckinDate][selectedCheckinStudentKey] = {
            status: currentCheckinStatus,
            note: noteText
        };

        const { error } = await supabaseClient
            .from('classrooms')
            .update({ attendance_logs: logs })
            .eq('id', currentClassData.id);

        if (error) throw error;

        // 2. ส่ง Realtime Broadcast แจ้งหน้าจอครูทันที
        try {
            const ch = supabaseClient.channel(`classroom-channel-${currentClassData.id}`);
            ch.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    ch.send({
                        type: 'broadcast',
                        event: 'attendance_checkin',
                        payload: {
                            date: currentCheckinDate,
                            studentKey: selectedCheckinStudentKey,
                            studentName: selectedCheckinStudentObj.name,
                            status: currentCheckinStatus,
                            note: noteText
                        }
                    });
                }
            });
        } catch (_) {}

        // 3. จำชื่อนักเรียนไว้ในเครื่องสำหรับสแกนครั้งถัดไป
        try {
            localStorage.setItem(`gyver_checkin_student_${currentClassData.room_code}`, selectedCheckinStudentKey);
        } catch (_) {}

        // 4. แสดงหน้าเช็คชื่อสำเร็จ
        document.getElementById('checkin-step-select')?.classList.add('d-none');
        const successBox = document.getElementById('checkin-success-box');
        if (successBox) successBox.classList.remove('d-none');

        const avatarEl = document.getElementById('checkin-success-avatar');
        const nameEl = document.getElementById('checkin-success-name');
        const metaEl = document.getElementById('checkin-success-meta');
        const goBtn = document.getElementById('btn-checkin-go-classroom');

        if (avatarEl) {
            avatarEl.src = selectedCheckinStudentObj.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(selectedCheckinStudentObj.name)}`;
        }
        if (nameEl) nameEl.innerText = selectedCheckinStudentObj.name;
        if (metaEl) metaEl.innerText = `วันที่ ${currentCheckinDate} • เวลา ${nowTime} น. (${currentCheckinStatus === 'late' ? 'มาสาย' : 'มาเรียน'})`;
        if (goBtn && currentClassData.room_code) {
            goBtn.href = `../my_classroom/student_view.html?code=${encodeURIComponent(currentClassData.room_code)}`;
        }
    } catch (err) {
        console.error('Checkin error:', err);
        alert('เกิดข้อผิดพลาดในการบันทึกเช็คชื่อ กรุณาลองใหม่อีกครั้ง');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ยืนยันเช็คชื่อ "${selectedCheckinStudentObj.name}"`;
        }
    }
}

function switchToRegisterNewStudentMode() {
    document.getElementById('checkin-content')?.classList.add('d-none');
    if (currentStudentUser) {
        setupAuthenticatedStudentUI();
    } else {
        setupGuestStudentUI();
    }
}
