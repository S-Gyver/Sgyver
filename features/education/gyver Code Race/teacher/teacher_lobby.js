let currentRoomCode = '';

document.addEventListener('DOMContentLoaded', async () => {
    // 🧹 เคลียร์ห้องเก่าของครูที่ค้างในฐานข้อมูลก่อน
    await cleanupPreviousTeacherLobbies();
    generateNewRoomCode();
});

// 🧹 เคลียร์ห้องสถานะ WAITING เก่าของครู
async function cleanupPreviousTeacherLobbies() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user?.id) {
                await supabaseClient
                    .from('lobbies')
                    .delete()
                    .eq('status', 'WAITING');
            }
        }
    } catch (e) {
        console.warn("Cleanup error:", e);
    }
}

// 🎲 สุ่มสร้างรหัสห้อง 4 หลัก
function generateNewRoomCode() {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    currentRoomCode = randomCode;

    const roomDisplay = document.getElementById('display-room-code');
    if (roomDisplay) roomDisplay.innerText = currentRoomCode;

    const joinUrl = `${window.location.origin}/features/education/gyver%20Code%20Race/student/student_lobby.html?room=${currentRoomCode}`;
    updateQRCode(joinUrl);
}

// 📲 สร้างรูป QR Code สแกนเข้าห้อง
function updateQRCode(url) {
    const qrBox = document.getElementById('qrcode-box');
    if (!qrBox) return;
    
    qrBox.innerHTML = '';
    try {
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrBox, {
                text: url,
                width: 110,
                height: 110,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    } catch (e) {
        console.error("QR Code error:", e);
    }
}

function selectGameMode(mode, element) {
    if (typeof selectedMode !== 'undefined') selectedMode = mode;
    document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('active'));
    if (element) element.classList.add('active');
}

function toggleTeamConfig(isTeam) {
    const panel = document.getElementById('team-config-panel');
    if (panel) {
        if (isTeam) panel.classList.remove('d-none');
        else panel.classList.add('d-none');
    }
}

// 🚀 ครูสั่งสร้างห้องแข่งขัน
async function handleCreateLobby() {
    const btnSubmit = document.getElementById('create-lobby-btn');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังสร้างห้องแข่งขัน...`;
    }

    const roomCode = document.getElementById('display-room-code')?.innerText.trim() || currentRoomCode;
    const gameMode = typeof selectedMode !== 'undefined' ? selectedMode : 'typing';
    const matchType = document.querySelector('input[name="matchType"]:checked')?.value || 'solo';
    
    let teamSize = '1';
    let teamAssign = 'none';

    if (matchType === 'team') {
        teamSize = document.getElementById('team-size-select')?.value || '2';
        teamAssign = document.getElementById('team-assign-select')?.value || 'auto_random';
    }

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient
                .from('lobbies')
                .upsert([{
                    room_code: roomCode,
                    game_mode: gameMode,
                    match_type: matchType,
                    status: 'WAITING',
                    players: [],
                    created_at: new Date().toISOString()
                }], { onConflict: 'room_code' });
        }
    } catch (err) {
        console.error("Create Lobby Error:", err);
    }

    setTimeout(() => {
        window.location.href = `typing_control.html?room=${roomCode}&mode=${gameMode}&type=${matchType}&teamSize=${teamSize}&teamAssign=${teamAssign}`;
    }, 300);
}