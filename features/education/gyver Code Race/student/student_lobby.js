let currentAvatarUrl = '';
let selectedFileObject = null;
let currentUserId = null;
let userEmail = '';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let roomCode = (urlParams.get('room') || '').trim().toUpperCase();
    const isTeamMode = urlParams.get('type') === 'team';

    const roomInputEl = document.getElementById('input-room-code') || document.getElementById('student-room-code');
    if (roomInputEl && roomCode) roomInputEl.value = roomCode;

    const roomCodeEl = document.getElementById('lobby-room-code');
    if (roomCodeEl) roomCodeEl.innerText = roomCode || '----';

    const teamZone = document.getElementById('team-input-zone');
    if (teamZone && !isTeamMode) teamZone.classList.add('d-none');

    const btnRandom = document.getElementById('btn-random-avatar');
    if (btnRandom) btnRandom.addEventListener('click', randomizeAvatar);

    const btnUpload = document.getElementById('btn-upload-avatar');
    const fileInput = document.getElementById('custom-avatar-input');
    if (btnUpload && fileInput) {
        btnUpload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleCustomAvatarUpload);
    }

    const joinForm = document.getElementById('student-join-form') || document.querySelector('form');
    if (joinForm) joinForm.addEventListener('submit', handleStudentJoin);

    await loadUserProfileFromDatabase();
});

function updateClassPreview() {
    const level = document.getElementById('student-level')?.value || '';
    const room = document.getElementById('student-room')?.value || '';
    const previewEl = document.getElementById('class-preview-text');

    if (previewEl) {
        if (level && room) {
            previewEl.innerText = `${level}/${room}`;
            previewEl.className = "badge bg-success fs-6 font-mono w-100 py-2 border border-light";
        } else {
            previewEl.innerText = "ม.-/-";
            previewEl.className = "badge bg-primary fs-6 font-mono w-100 py-2 border border-info";
        }
    }
}

async function loadUserProfileFromDatabase() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            currentUserId = session.user.id;
            userEmail = session.user.email || '';
        }

        let profile = null;
        if (currentUserId) {
            const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUserId).maybeSingle();
            profile = data;
        }

        if (profile) {
            if (document.getElementById('student-nickname-th')) document.getElementById('student-nickname-th').value = profile.nickname || '';
            if (document.getElementById('student-firstname-th')) document.getElementById('student-firstname-th').value = profile.first_name || '';
            if (document.getElementById('student-lastname-th')) document.getElementById('student-lastname-th').value = profile.last_name || '';
            if (document.getElementById('student-nickname-en')) document.getElementById('student-nickname-en').value = profile.nickname_en || '';
            if (document.getElementById('student-firstname-en')) document.getElementById('student-firstname-en').value = profile.first_name_en || '';
            if (document.getElementById('student-lastname-en')) document.getElementById('student-lastname-en').value = profile.last_name_en || '';

            if (profile.student_class) {
                const classParts = profile.student_class.split('/');
                if (classParts.length === 2) {
                    if (document.getElementById('student-level')) document.getElementById('student-level').value = classParts[0].startsWith('ม.') ? classParts[0] : `ม.${classParts[0]}`;
                    if (document.getElementById('student-room')) document.getElementById('student-room').value = classParts[1];
                }
            }
            if (document.getElementById('student-number')) document.getElementById('student-number').value = profile.student_number || '';

            if (profile.avatar_url) {
                currentAvatarUrl = profile.avatar_url;
                const avatarImg = document.getElementById('student-avatar-preview');
                if (avatarImg) avatarImg.src = currentAvatarUrl;
            } else {
                randomizeAvatar();
            }
            updateClassPreview();
        } else {
            randomizeAvatar();
        }
    } catch (err) {
        randomizeAvatar();
    }
}

function randomizeAvatar() {
    selectedFileObject = null;
    const seed = 'Racer' + Math.floor(Math.random() * 100000);
    currentAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    const avatarImg = document.getElementById('student-avatar-preview');
    if (avatarImg) avatarImg.src = currentAvatarUrl;
}

function handleCustomAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("ไฟล์ภาพใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 5MB ครับ");

    selectedFileObject = file;
    const reader = new FileReader();
    reader.onload = function (event) {
        currentAvatarUrl = event.target.result;
        const avatarImg = document.getElementById('student-avatar-preview');
        if (avatarImg) avatarImg.src = currentAvatarUrl;
    };
    reader.readAsDataURL(file);
}

// 🟢 บันทึกข้อมูลนักเรียนเข้าตาราง lobbies เฉพาะเมื่อมีห้องจริงเท่านั้น
async function handleStudentJoin(e) {
    if (e) e.preventDefault();

    const btnSubmit = document.getElementById('btn-submit-join');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังตรวจสอบห้อง...`;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let inputRoom = (document.getElementById('input-room-code')?.value || document.getElementById('student-room-code')?.value || urlParams.get('room') || '').trim().toUpperCase();

    let nicknameTh = document.getElementById('student-nickname-th')?.value.trim() || '';
    let firstnameTh = document.getElementById('student-firstname-th')?.value.trim() || '';
    let lastnameTh = document.getElementById('student-lastname-th')?.value.trim() || '';
    let nicknameEn = document.getElementById('student-nickname-en')?.value.trim() || '';
    let firstnameEn = document.getElementById('student-firstname-en')?.value.trim() || '';
    let lastnameEn = document.getElementById('student-lastname-en')?.value.trim() || '';
    let studentLevel = document.getElementById('student-level')?.value || 'ม.5'; 
    let studentRoom = document.getElementById('student-room')?.value || '10';   
    let studentNumber = document.getElementById('student-number')?.value.trim() || '1';
    let teamNum = document.getElementById('student-team-num')?.value || 0;

    if (!inputRoom || !nicknameTh) {
        alert("⚠️ กรุณากรอกรหัสห้องและชื่อเล่นให้ครบถ้วนครับ!");
        resetJoinBtn();
        return;
    }

    let studentClassFormatted = `${studentLevel}/${studentRoom}`;

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            // 🛑 1. ค้นหาห้องแข่งขันจากตาราง lobbies ก่อน
            let { data: lobbyData, error } = await supabaseClient
                .from('lobbies')
                .select('players, status')
                .eq('room_code', inputRoom)
                .maybeSingle();

            // 🛑 2. ถ้าไม่พบห้องในฐานข้อมูล ให้เด้งเตือนและปฏิเสธการเข้าเล่นทันที
            if (error || !lobbyData) {
                alert(`⚠️ ไม่พบห้องแข่งขันหมายเลข "${inputRoom}" ในระบบ!\n\nกรุณาตรวจสอบรหัสห้อง หรือรอคุณครูเปิดห้องแข่งขันก่อนครับ`);
                resetJoinBtn();
                return;
            }

            const newPlayerData = {
                name: `${nicknameTh} (${studentClassFormatted})`,
                nickname_th: nicknameTh,
                firstname_th: firstnameTh,
                lastname_th: lastnameTh,
                nickname_en: nicknameEn,
                firstname_en: firstnameEn,
                lastname_en: lastnameEn,
                level: studentLevel,
                room: studentRoom,
                class_name: studentClassFormatted,
                number: parseInt(studentNumber) || 1,
                image: currentAvatarUrl,
                status: 'pending', // 🔴 เริ่มต้นเป็น pending รอนุมัติจากครู
                score: 0,
                progress: 0,
                wpm: 0,
                errors: 0
            };

            let playersList = Array.isArray(lobbyData.players) ? lobbyData.players : [];
            
            // ค้นหาและอัปเดตข้อมูลผู้เล่นเดิมหรือเพิ่มคนใหม่
            const existingIdx = playersList.findIndex(p => String(p.number) === String(newPlayerData.number) && p.nickname_th === newPlayerData.nickname_th);
            if (existingIdx !== -1) {
                playersList[existingIdx] = { ...playersList[existingIdx], ...newPlayerData };
            } else {
                playersList.push(newPlayerData);
            }

            // 🟢 3. อัปเดตรายชื่อนักเรียนกลับลงห้องที่มีอยู่แล้ว
            await supabaseClient
                .from('lobbies')
                .update({ players: playersList })
                .eq('room_code', inputRoom);
        }
    } catch (err) {
        console.error("Save Player Error:", err);
        alert("⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง");
        resetJoinBtn();
        return;
    }

    // เซฟออฟไลน์สำรองใน LocalStorage
    localStorage.setItem('gyver_race_student_profile', JSON.stringify({
        nicknameTh, firstnameTh, lastnameTh, nicknameEn, firstnameEn, lastnameEn,
        studentLevel, studentRoom, studentClass: studentClassFormatted, studentNumber, avatarUrl: currentAvatarUrl
    }));

    window.location.href = `student_waiting.html?room=${inputRoom}&name=${encodeURIComponent(nicknameTh)}&class=${encodeURIComponent(studentClassFormatted)}&no=${studentNumber}&team=${teamNum}`;
}

function resetJoinBtn() {
    const btnSubmit = document.getElementById('btn-submit-join');
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-play-circle-fill me-2"></i>พร้อมแล้ว! เข้าห้องแข่งขัน`;
    }
}