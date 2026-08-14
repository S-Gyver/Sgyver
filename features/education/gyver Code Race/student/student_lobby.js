let currentAvatarUrl = '';
let selectedFileObject = null;
let hasSavedProfile = false;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = (urlParams.get('room') || 'RACE88').toUpperCase();
    const isTeamMode = urlParams.get('type') === 'team';

    const roomCodeEl = document.getElementById('lobby-room-code');
    if (roomCodeEl) roomCodeEl.innerText = roomCode;

    const teamZone = document.getElementById('team-input-zone');
    if (teamZone && !isTeamMode) {
        teamZone.classList.add('d-none');
    }

    const btnRandom = document.getElementById('btn-random-avatar');
    if (btnRandom) btnRandom.addEventListener('click', randomizeAvatar);

    const btnUpload = document.getElementById('btn-upload-avatar');
    const fileInput = document.getElementById('custom-avatar-input');
    if (btnUpload && fileInput) {
        btnUpload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleCustomAvatarUpload);
    }

    loadSavedProfile();
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

function loadSavedProfile() {
    const savedData = localStorage.getItem('gyver_race_student_profile');
    if (!savedData) {
        showFullFormMode();
        randomizeAvatar();
        return;
    }

    try {
        const profile = JSON.parse(savedData);
        if (profile && profile.nicknameTh) {
            hasSavedProfile = true;

            if (document.getElementById('student-nickname-th')) document.getElementById('student-nickname-th').value = profile.nicknameTh || '';
            if (document.getElementById('student-firstname-th')) document.getElementById('student-firstname-th').value = profile.firstnameTh || '';
            if (document.getElementById('student-lastname-th')) document.getElementById('student-lastname-th').value = profile.lastnameTh || '';
            if (document.getElementById('student-nickname-en')) document.getElementById('student-nickname-en').value = profile.nicknameEn || '';
            if (document.getElementById('student-firstname-en')) document.getElementById('student-firstname-en').value = profile.firstnameEn || '';
            if (document.getElementById('student-lastname-en')) document.getElementById('student-lastname-en').value = profile.lastnameEn || '';
            if (document.getElementById('student-level')) document.getElementById('student-level').value = profile.studentLevel || 'ม.5';
            if (document.getElementById('student-room')) document.getElementById('student-room').value = profile.studentRoom || '10';
            if (document.getElementById('student-number')) document.getElementById('student-number').value = profile.studentNumber || '10';

            if (document.getElementById('saved-display-name-th')) document.getElementById('saved-display-name-th').innerText = `${profile.nicknameTh} (${profile.firstnameTh || ''} ${profile.lastnameTh || ''})`;
            if (document.getElementById('saved-display-name-en')) document.getElementById('saved-display-name-en').innerText = `${profile.nicknameEn || ''} (${profile.firstnameEn || ''} ${profile.lastnameEn || ''})`;
            if (document.getElementById('saved-display-class')) document.getElementById('saved-display-class').innerText = profile.studentClass || 'ม.5/10';
            if (document.getElementById('saved-display-no')) document.getElementById('saved-display-no').innerText = profile.studentNumber || '10';

            if (profile.avatarUrl) {
                currentAvatarUrl = profile.avatarUrl;
                const avatarImg = document.getElementById('student-avatar-preview');
                if (avatarImg) avatarImg.src = currentAvatarUrl;
            }

            document.getElementById('saved-profile-card')?.classList.remove('d-none');
            document.getElementById('full-profile-form-zone')?.classList.add('d-none');
            document.getElementById('avatar-btn-group')?.classList.add('d-none');
        } else {
            showFullFormMode();
            randomizeAvatar();
        }
    } catch (e) {
        showFullFormMode();
        randomizeAvatar();
    }
}

function enableEditProfileMode() {
    hasSavedProfile = false;
    document.getElementById('saved-profile-card')?.classList.add('d-none');
    document.getElementById('full-profile-form-zone')?.classList.remove('d-none');
    document.getElementById('avatar-btn-group')?.classList.remove('d-none');
    updateClassPreview();
}

function showFullFormMode() {
    hasSavedProfile = false;
    document.getElementById('saved-profile-card')?.classList.add('d-none');
    document.getElementById('full-profile-form-zone')?.classList.remove('d-none');
    document.getElementById('avatar-btn-group')?.classList.remove('d-none');
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
    const avatarImg = document.getElementById('student-avatar-preview');

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("ไฟล์ภาพใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 5MB ครับ");
        return;
    }

    selectedFileObject = file;

    const reader = new FileReader();
    reader.onload = function (event) {
        currentAvatarUrl = event.target.result;
        if (avatarImg) avatarImg.src = currentAvatarUrl;
    };
    reader.readAsDataURL(file);
}

function toggleNoTeam(isNoTeam) {
    const teamInput = document.getElementById('student-team-num');
    if (!teamInput) return;

    if (isNoTeam) {
        teamInput.value = 0;
        teamInput.disabled = true;
    } else {
        teamInput.value = 1;
        teamInput.disabled = false;
    }
}

async function handleStudentJoin(e) {
    if (e) e.preventDefault();

    const btnSubmit = document.getElementById('btn-submit-join');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึกข้อมูล...`;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let roomCode = (urlParams.get('room') || 'RACE88').toUpperCase();

    const roomInputEl = document.getElementById('input-room-code');
    if (roomInputEl && roomInputEl.value.trim()) {
        roomCode = roomInputEl.value.trim().toUpperCase();
    }

    let nicknameTh = document.getElementById('student-nickname-th')?.value.trim();
    let firstnameTh = document.getElementById('student-firstname-th')?.value.trim();
    let lastnameTh = document.getElementById('student-lastname-th')?.value.trim();
    let nicknameEn = document.getElementById('student-nickname-en')?.value.trim();
    let firstnameEn = document.getElementById('student-firstname-en')?.value.trim();
    let lastnameEn = document.getElementById('student-lastname-en')?.value.trim();

    let studentLevel = document.getElementById('student-level')?.value || 'ม.5'; 
    let studentRoom = document.getElementById('student-room')?.value || '10';   
    let studentNumber = document.getElementById('student-number')?.value.trim() || '10';
    let teamNum = document.getElementById('student-team-num')?.value || 0;

    if (hasSavedProfile) {
        const savedData = localStorage.getItem('gyver_race_student_profile');
        if (savedData) {
            try {
                const p = JSON.parse(savedData);
                nicknameTh = p.nicknameTh || nicknameTh;
                firstnameTh = p.firstnameTh || firstnameTh;
                lastnameTh = p.lastnameTh || lastnameTh;
                nicknameEn = p.nicknameEn || nicknameEn;
                firstnameEn = p.firstnameEn || firstnameEn;
                lastnameEn = p.lastnameEn || lastnameEn;
                studentLevel = p.studentLevel || studentLevel;
                studentRoom = p.studentRoom || studentRoom;
                studentNumber = p.studentNumber || studentNumber;
                if (p.avatarUrl) currentAvatarUrl = p.avatarUrl;
            } catch (err) {}
        }
    }

    if (!nicknameTh) {
        alert("กรุณากรอกชื่อเล่นนักเรียนก่อนครับ!");
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i class="bi bi-play-circle-fill me-2"></i>พร้อมแล้ว! เข้าห้องแข่งขัน`;
        }
        return;
    }

    const cleanLevel = studentLevel.replace('ม.', '').trim();
    let classKey = `${cleanLevel}/${studentRoom}`; 
    let studentClassFormatted = `${studentLevel}/${studentRoom}`;

    const profilePayload = {
        nicknameTh,
        firstnameTh,
        lastnameTh,
        fullnameTh: `${firstnameTh} ${lastnameTh}`,
        nicknameEn,
        firstnameEn,
        lastnameEn,
        studentLevel,
        studentRoom,
        studentClass: studentClassFormatted,
        studentNumber,
        avatarUrl: currentAvatarUrl
    };
    localStorage.setItem('gyver_race_student_profile', JSON.stringify(profilePayload));

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const newPlayerData = {
                name: `${nicknameTh} ${studentClassFormatted}`,
                nickname_th: nicknameTh,
                firstname_th: firstnameTh,
                lastname_th: lastnameTh,
                nickname_en: nicknameEn || '',
                firstname_en: firstnameEn || '',
                lastname_en: lastnameEn || '',
                level: studentLevel,
                room: studentRoom,
                class_name: studentClassFormatted,
                number: parseInt(studentNumber) || 10,
                image: currentAvatarUrl,
                status: 'approved',
                score: 0,
                spunCount: 0,
                progress: 0,
                code: '',
                wpm: 0,
                errors: 0
            };

            let { data: existingClass } = await supabaseClient
                .from('class_rooms')
                .select('*')
                .eq('class_key', classKey)
                .maybeSingle();

            let playersList = [];

            if (existingClass) {
                playersList = Array.isArray(existingClass.players) ? existingClass.players : [];
                const existingIdx = playersList.findIndex(p => String(p.number) === String(newPlayerData.number) || p.nickname_th === newPlayerData.nickname_th);
                
                if (existingIdx !== -1) {
                    playersList[existingIdx] = { ...playersList[existingIdx], ...newPlayerData };
                } else {
                    playersList.push(newPlayerData);
                }

                await supabaseClient
                    .from('class_rooms')
                    .update({ players: playersList })
                    .eq('class_key', classKey);

            } else {
                playersList.push(newPlayerData);
                await supabaseClient
                    .from('class_rooms')
                    .insert([{ class_key: classKey, players: playersList }]);
            }
        }
    } catch (err) {
        console.error("Supabase Save Error:", err);
    }

    // 🚀 ย้ายไปหน้ารอทันที
    window.location.href = `student_waiting.html?room=${roomCode}&name=${encodeURIComponent(nicknameTh)}&class=${encodeURIComponent(studentClassFormatted)}&no=${studentNumber}&classKey=${encodeURIComponent(classKey)}&team=${teamNum}`;
}