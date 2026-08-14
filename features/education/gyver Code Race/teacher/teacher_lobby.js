let currentRoomCode = '';

document.addEventListener('DOMContentLoaded', () => {
    generateNewRoomCode();
});

// สุ่มสร้างรหัสห้อง เช่น RACE88
function generateNewRoomCode() {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const numbers = "123456789";
    
    let code = "RACE";
    for (let i = 0; i < 2; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    currentRoomCode = code;
    const roomEl = document.getElementById('generated-room-code');
    if (roomEl) roomEl.innerText = currentRoomCode;
}

function toggleTeamSettings(isTeam) {
    // ฟังก์ชันจัดการการเปิด/ปิดตั้งค่าโหมดกลุ่ม
}

// ครูสั่งกดสร้างห้องแข่ง
async function handleCreateLobby(e) {
    e.preventDefault();

    const btnSubmit = document.getElementById('btn-create-lobby');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังสร้างห้องแข่งขัน...`;
    }

    const gameMode = document.querySelector('input[name="gameMode"]:checked')?.value || 'typing';
    const matchType = document.querySelector('input[name="matchType"]:checked')?.value || 'solo';
    const level = document.getElementById('teacher-level')?.value || 'ม.5';
    const room = document.getElementById('teacher-room')?.value || '10';
    
    const cleanLevel = level.replace('ม.', '').trim();
    const classKey = `${cleanLevel}/${room}`; // เช่น "5/10"

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            
            const lobbyPayload = {
                room_code: currentRoomCode,
                game_mode: gameMode,
                match_type: matchType,
                class_key: classKey,
                status: 'WAITING',
                created_at: new Date().toISOString()
            };

            // บันทึกสร้างห้องแข่งใหม่ลงตาราง lobbies
            const { data, error } = await supabaseClient
                .from('lobbies')
                .upsert([lobbyPayload], { onConflict: 'room_code' })
                .select();

            if (error) {
                console.error("Lobby Creation Error:", error.message, error.details);
            } else {
                console.log("สร้างห้องลงตาราง lobbies สำเร็จ:", data);
            }
        }
    } catch (err) {
        console.error("Create Lobby Catch Error:", err);
    }

    // 🚀 นำทางไปหน้าตั้งค่าและคุมการแข่ง (typing_control.html)
    setTimeout(() => {
        window.location.href = `typing_control.html?room=${currentRoomCode}&mode=${gameMode}&type=${matchType}&classKey=${encodeURIComponent(classKey)}`;
    }, 500);
}