let currentAvatarUrl = '';
let selectedFileObject = null;
let currentUserId = null;
let userEmail = '';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let roomCode = (urlParams.get('room') || '').trim().toUpperCase();
    const isTeamMode = urlParams.get('type') === 'team';

    const roomInputEl = document.getElementById('input-room-code') || document.getElementById('student-room-code');
    if (roomInputEl && roomCode) {
        roomInputEl.value = roomCode;
    }

    const roomCodeEl = document.getElementById('lobby-room-code');
    if (roomCodeEl) {
        roomCodeEl.innerText = roomCode || '8090';
    }

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

    const joinForm = document.getElementById('student-join-form') || document.querySelector('form');
    if (joinForm) {
        joinForm.addEventListener('submit', handleStudentJoin);
    }

    // 🟢 โหลดข้อมูลจากตาราง profiles ใน Supabase มาแสดงผล
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

// 🟢 1. ดึงข้อมูลโปรไฟล์จากตาราง profiles ใน Supabase มาใส่ฟอร์ม
async function loadUserProfileFromDatabase() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        // ดึง Session ผู้ใช้ปัจจุบัน
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            currentUserId = session.user.id;
            userEmail = session.user.email || '';
        }

        // เช็ก Admin/User Session สำรองใน Storage
        const savedAdminSession = sessionStorage.getItem('gyver_admin_session') || localStorage.getItem('gyver_admin_session');
        if (savedAdminSession) {
            try {
                const adminData = JSON.parse(savedAdminSession);
                if (adminData) {
                    if (!userEmail) userEmail = adminData.email || '';
                    if (!currentUserId) currentUserId = adminData.id || null;
                }
            } catch (e) {}
        }

        let profile = null;

        // ค้นหาแถวโปรไฟล์ในตาราง profiles
        if (currentUserId) {
            const { data } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', currentUserId)
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

        // หยอดข้อมูลใส่ช่องต่างๆ ในฟอร์มหากมีข้อมูลเดิม
        if (profile) {
            if (!currentUserId) currentUserId = profile.id;

            // 🇹🇭 ภาษาไทย
            if (document.getElementById('student-nickname-th')) document.getElementById('student-nickname-th').value = profile.nickname || '';
            if (document.getElementById('student-firstname-th')) document.getElementById('student-firstname-th').value = profile.first_name || '';
            if (document.getElementById('student-lastname-th')) document.getElementById('student-lastname-th').value = profile.last_name || '';

            // 🇬🇧 ภาษาอังกฤษ
            if (document.getElementById('student-nickname-en')) document.getElementById('student-nickname-en').value = profile.nickname_en || '';
            if (document.getElementById('student-firstname-en')) document.getElementById('student-firstname-en').value = profile.first_name_en || '';
            if (document.getElementById('student-lastname-en')) document.getElementById('student-lastname-en').value = profile.last_name_en || '';

            // 🏫 ชั้นเรียน & เลขที่
            if (profile.student_class) {
                const classParts = profile.student_class.split('/');
                if (classParts.length === 2) {
                    const levelVal = classParts[0].startsWith('ม.') ? classParts[0] : `ม.${classParts[0]}`;
                    if (document.getElementById('student-level')) document.getElementById('student-level').value = levelVal;
                    if (document.getElementById('student-room')) document.getElementById('student-room').value = classParts[1];
                } else if (document.getElementById('student-level')) {
                    document.getElementById('student-level').value = profile.student_class;
                }
            }

            if (document.getElementById('student-number')) {
                document.getElementById('student-number').value = profile.student_number || '';
            }

            // 🖼️ อวตาร / รูปโปรไฟล์
            if (profile.avatar_url) {
                currentAvatarUrl = profile.avatar_url;
                const avatarImg = document.getElementById('student-avatar-preview');
                if (avatarImg) avatarImg.src = currentAvatarUrl;
            } else {
                randomizeAvatar();
            }

            updateClassPreview();
        } else {
            // กรณีไม่มีข้อมูลเดิม -> เช็ก LocalStorage สำรอง หรือสุ่มอวตารใหม่
            loadFromLocalStorageOrRandom();
        }

    } catch (err) {
        console.error("Load profile error:", err);
        loadFromLocalStorageOrRandom();
    }
}

function loadFromLocalStorageOrRandom() {
    const savedData = localStorage.getItem('gyver_race_student_profile');
    if (savedData) {
        try {
            const p = JSON.parse(savedData);
            if (document.getElementById('student-nickname-th')) document.getElementById('student-nickname-th').value = p.nicknameTh || '';
            if (document.getElementById('student-firstname-th')) document.getElementById('student-firstname-th').value = p.firstnameTh || '';
            if (document.getElementById('student-lastname-th')) document.getElementById('student-lastname-th').value = p.lastnameTh || '';
            if (document.getElementById('student-level')) document.getElementById('student-level').value = p.studentLevel || '';
            if (document.getElementById('student-room')) document.getElementById('student-room').value = p.studentRoom || '';
            if (document.getElementById('student-number')) document.getElementById('student-number').value = p.studentNumber || '';
            if (p.avatarUrl) {
                currentAvatarUrl = p.avatarUrl;
                const avatarImg = document.getElementById('student-avatar-preview');
                if (avatarImg) avatarImg.src = currentAvatarUrl;
            } else {
                randomizeAvatar();
            }
            updateClassPreview();
            return;
        } catch (e) {}
    }
    randomizeAvatar();
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

// 💾 2. เมื่องกดเริ่ม/เข้าร่วมแข่งขัน -> บันทึกลงตาราง profiles และนำเข้าห้องแข่ง
async function handleStudentJoin(e) {
    if (e) e.preventDefault();

    const btnSubmit = document.getElementById('btn-submit-join');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังเข้าร่วมห้อง...`;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let inputRoom = (document.getElementById('input-room-code')?.value || document.getElementById('student-room-code')?.value || urlParams.get('room') || '8090').trim().toUpperCase();

    let nicknameTh = document.getElementById('student-nickname-th')?.value.trim() || '';
    let firstnameTh = document.getElementById('student-firstname-th')?.value.trim() || '';
    let lastnameTh = document.getElementById('student-lastname-th')?.value.trim() || '';

    let nicknameEn = document.getElementById('student-nickname-en')?.value.trim() || '';
    let firstnameEn = document.getElementById('student-firstname-en')?.value.trim() || '';
    let lastnameEn = document.getElementById('student-lastname-en')?.value.trim() || '';

    let studentLevel = document.getElementById('student-level')?.value || 'ม.5'; 
    let studentRoom = document.getElementById('student-room')?.value || '10';   
    let studentNumber = document.getElementById('student-number')?.value.trim() || '10';
    let teamNum = document.getElementById('student-team-num')?.value || 0;

    if (!inputRoom) {
        alert("⚠️ กรุณากรอกรหัสห้อง (Room Code) ก่อนครับ!");
        resetJoinBtn();
        return;
    }

    if (!nicknameTh) {
        alert("⚠️ กรุณากรอกชื่อเล่นภาษาไทยก่อนครับ!");
        resetJoinBtn();
        return;
    }

    let targetClassKey = inputRoom; 
    let studentClassFormatted = `${studentLevel}/${studentRoom}`;

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data: lobbyData } = await supabaseClient
                .from('lobbies')
                .select('*')
                .eq('room_code', inputRoom)
                .maybeSingle();

            if (lobbyData && lobbyData.class_key) {
                targetClassKey = lobbyData.class_key;
            }
        }
    } catch (err) {
        console.warn("Lobbies fetch error:", err);
    }

    // เซฟลง LocalStorage สำรอง
    const profilePayload = {
        nicknameTh,
        firstnameTh,
        lastnameTh,
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
            name: `${nicknameTh} (${studentClassFormatted})`,
            nickname_th: nicknameTh,
            firstname_th: firstnameTh,
            lastname_th: lastnameTh,
            level: studentLevel,
            room: studentRoom,
            class_name: studentClassFormatted,
            number: parseInt(studentNumber) || 10,
            image: currentAvatarUrl,
            status: 'pending',
            score: 0,
            progress: 0,
            wpm: 0,
            errors: 0
        };

        // ดึงข้อมูลห้องจาก lobbies
        let { data: lobbyData } = await supabaseClient
            .from('lobbies')
            .select('players')
            .eq('room_code', inputRoom)
            .maybeSingle();

        let playersList = [];

        if (lobbyData) {
            playersList = Array.isArray(lobbyData.players) ? lobbyData.players : [];

            // เช็กว่ามีนักเรียนคนนี้แล้วหรือไม่
            const existingIdx = playersList.findIndex(p => String(p.number) === String(newPlayerData.number) && p.nickname_th === newPlayerData.nickname_th);

            if (existingIdx !== -1) {
                playersList[existingIdx] = { ...playersList[existingIdx], ...newPlayerData };
            } else {
                playersList.push(newPlayerData);
            }

            // อัปเดตรายชื่อผู้เล่นกลับลงตาราง lobbies
            await supabaseClient
                .from('lobbies')
                .update({ players: playersList })
                .eq('room_code', inputRoom);
        }
    }
} catch (err) {
    console.error("Save Player to Lobbies Error:", err);
}

    // 🟢 4. บันทึกผู้เล่นรอนุมัติเข้าตาราง class_rooms
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
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
                number: parseInt(studentNumber) || 10,
                image: currentAvatarUrl,
                status: 'pending',
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
                .eq('class_key', targetClassKey)
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
                    .eq('class_key', targetClassKey);

            } else {
                playersList.push(newPlayerData);
                await supabaseClient
                    .from('class_rooms')
                    .insert([{ class_key: targetClassKey, players: playersList }]);
            }
        }
    } catch (err) {
        console.error("Supabase Save Player Error:", err);
    }

    window.location.href = `student_waiting.html?room=${inputRoom}&name=${encodeURIComponent(nicknameTh)}&class=${encodeURIComponent(studentClassFormatted)}&no=${studentNumber}&classKey=${encodeURIComponent(targetClassKey)}&team=${teamNum}`;
}

function resetJoinBtn() {
    const btnSubmit = document.getElementById('btn-submit-join');
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-play-circle-fill me-2"></i>พร้อมแล้ว! เข้าห้องแข่งขัน`;
    }
}