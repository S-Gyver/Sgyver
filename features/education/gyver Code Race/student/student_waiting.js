document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = (urlParams.get('room') || '8090').trim().toUpperCase();
    const name = urlParams.get('name') || 'นักเรียน';
    const className = urlParams.get('class') || 'ม.-/-';
    const no = urlParams.get('no') || '-';
    const team = urlParams.get('team') || '0';

    // 1. แสดงข้อมูลผู้ใช้
    if (document.getElementById('wait-room-code')) document.getElementById('wait-room-code').innerText = roomCode;
    if (document.getElementById('wait-name-text')) document.getElementById('wait-name-text').innerText = name;
    if (document.getElementById('wait-class-badge')) document.getElementById('wait-class-badge').innerText = className;
    if (document.getElementById('wait-no-text')) document.getElementById('wait-no-text').innerText = no;
    
    const teamBadge = document.getElementById('wait-team-badge');
    const ruleTypeText = document.getElementById('rule-type-text');
    if (teamBadge) {
        if (team === '0' || !team) {
            teamBadge.innerText = 'แข่งเดี่ยว';
            if (ruleTypeText) ruleTypeText.innerText = 'ประเภทบุคคล (Solo)';
        } else {
            teamBadge.innerText = `กลุ่ม ${team}`;
            if (ruleTypeText) ruleTypeText.innerText = `ประเภททีม (Team ${team})`;
        }
    }

    const savedData = localStorage.getItem('gyver_race_student_profile');
    if (savedData) {
        try {
            const profile = JSON.parse(savedData);
            if (profile.avatarUrl && document.getElementById('wait-avatar-img')) {
                document.getElementById('wait-avatar-img').src = profile.avatarUrl;
            }
        } catch (e) {}
    }

    // 2. ดึง Match Config เริ่มต้น
    await fetchInitialMatchConfig(roomCode);

    // 3. 🟢 ฟังและซิงก์รายชื่อผู้เล่น Realtime จากตาราง lobbies
    fetchAndListenJoinedPlayers(roomCode);

    // 4. ดักฟังคำสั่งจากครู (อนุมัติ/เริ่มเกม/ลบออกจากห้อง)
    listenTeacherRealtimeSignals(roomCode, name, className, no, team);
});

async function fetchInitialMatchConfig(roomCode) {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data } = await supabaseClient
                .from('lobbies')
                .select('match_config')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (data && data.match_config) {
                updateStudentConfigUI(data.match_config);
            }
        }
    } catch (e) {}
}

function updateStudentConfigUI(cfg) {
    if (!cfg) return;

    const timeEl = document.getElementById('rule-time-text');
    if (timeEl && cfg.timer) {
        timeEl.innerText = cfg.timer.unlimited 
            ? 'ไม่จำกัดเวลา' 
            : `${Math.floor(cfg.timer.duration / 60)} นาที (${cfg.timer.duration} วินาที)`;
    }

    const goldEl = document.getElementById('rule-gold-text');
    if (goldEl && cfg.gold) {
        goldEl.innerText = cfg.gold.enabled 
            ? `แจก ${cfg.gold.amount} Gold / ทุก ${cfg.gold.milestone}` 
            : 'ปิดใช้งาน';
    }

    const quizEl = document.getElementById('rule-quiz-text');
    if (quizEl && cfg.quiz) {
        quizEl.innerText = cfg.quiz.enabled 
            ? `เปิดใช้งาน (${cfg.quiz.stock_name || 'คลังโจทย์'})` 
            : 'ปิดใช้งาน';
    }

    const shopContainer = document.getElementById('rule-shop-items-container');
    if (shopContainer && cfg.items) {
        if (!cfg.items.enabled) {
            shopContainer.innerHTML = '<span class="badge bg-danger text-white font-mono" style="font-size: 0.7rem;">ปิดใช้งานร้านค้า</span>';
            return;
        }

        let itemsHtml = '';
        if (cfg.items.shield) itemsHtml += `<span class="badge bg-info text-dark font-mono" style="font-size: 0.7rem;">🛡️ โล่ป้องกัน</span> `;
        if (cfg.items.blind) itemsHtml += `<span class="badge bg-warning text-dark font-mono" style="font-size: 0.7rem;">👁️ หน้าจอเบลอ</span> `;
        if (cfg.items.freeze) itemsHtml += `<span class="badge bg-primary text-white font-mono" style="font-size: 0.7rem;">❄️ แช่แข็งระบบ</span> `;
        if (cfg.items.boost) itemsHtml += `<span class="badge bg-success text-white font-mono" style="font-size: 0.7rem;">⚡ สปีดบูสท์</span> `;

        shopContainer.innerHTML = itemsHtml || '<span class="badge bg-secondary text-white font-mono" style="font-size: 0.7rem;">ไม่มีไอเทมเปิดขาย</span>';
    }
}

async function fetchAndListenJoinedPlayers(roomCode) {
    await fetchJoinedPlayers(roomCode);

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`waiting_sync_lobbies_${roomCode}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'lobbies',
                filter: `room_code=eq.${roomCode}`
            }, (payload) => {
                if (payload.new && Array.isArray(payload.new.players)) {
                    renderJoinedPlayersUI(payload.new.players);
                }
            })
            .subscribe();
    }
}

async function fetchJoinedPlayers(roomCode) {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data: lobbyData } = await supabaseClient
                .from('lobbies')
                .select('players')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (lobbyData && Array.isArray(lobbyData.players)) {
                renderJoinedPlayersUI(lobbyData.players);
            }
        }
    } catch (err) {
        console.error("Fetch players error:", err);
    }
}

function renderJoinedPlayersUI(players) {
    const container = document.getElementById('joined-players-container');
    const countEl = document.getElementById('joined-count');

    if (!container) return;
    if (countEl) countEl.innerText = players.length;

    if (players.length === 0) {
        container.innerHTML = `<div class="text-subtle small font-mono py-2"><i class="bi bi-hourglass-split me-1"></i>กำลังดึงรายชื่อผู้เข้าแข่งขัน...</div>`;
        return;
    }

    container.innerHTML = players.map(p => `
        <div class="peer-chip">
            <img src="${p.image || p.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(p.nickname_th || 'Racer')}" class="peer-avatar-sm">
            <div class="font-mono lh-1">
                <span class="text-white fw-bold d-block small">${p.nickname_th || p.name}</span>
                <small class="text-subtle" style="font-size: 0.7rem;">เลขที่ ${p.number || '-'}</small>
            </div>
        </div>
    `).join('');
}

function listenTeacherRealtimeSignals(roomCode, name, className, no, team) {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const channel = supabaseClient.channel(`room_signal_${roomCode}`);
        
        channel.on('broadcast', { event: 'config_updated' }, (payload) => {
            if (payload && payload.payload) updateStudentConfigUI(payload.payload);
        });

        // 🟢 เมื่อครูกดปุ่มเริ่มเกม
        channel.on('broadcast', { event: 'start_game' }, async () => {
            await checkApprovalAndGoToArena(roomCode, name, className, no, team);
        });

        // 🟢 เมื่อโดนเตะออกจากห้อง
        channel.on('broadcast', { event: 'kicked_out' }, (payload) => {
            if (payload && payload.payload && String(payload.payload.number) === String(no)) {
                // ในไฟล์ student/student_waiting.js

function listenTeacherRealtimeSignals(roomCode, name, className, no, team) {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const channel = supabaseClient.channel(`room_signal_${roomCode}`);
        
        channel.on('broadcast', { event: 'config_updated' }, (payload) => {
            if (payload && payload.payload) updateStudentConfigUI(payload.payload);
        });

        // เมื่อครูกดปุ่มเริ่มเกม
        channel.on('broadcast', { event: 'start_game' }, async () => {
            await checkApprovalAndGoToArena(roomCode, name, className, no, team);
        });

        // 🟢 เมื่อโดนคุณครูเตะออกจากห้อง
        channel.on('broadcast', { event: 'kicked_out' }, (payload) => {
            if (payload && payload.payload && String(payload.payload.number) === String(no)) {
                showCyberKickedModal();
            }
        }).subscribe();
    }
}

// 🟢 แสดง Cyberpunk Modal เมื่อโดนเตะออกจากห้อง
function showCyberKickedModal() {
    const modalEl = document.getElementById('kickedNoticeModal');
    if (modalEl) {
        if (typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        } else {
            alert("⚠️ คุณถูกคุณครูเตะออกจากห้องแข่งขันแล้วครับ!");
            window.location.href = '../race_home.html';
        }
    } else {
        alert("⚠️ คุณถูกคุณครูเตะออกจากห้องแข่งขันแล้วครับ!");
        window.location.href = '../race_home.html';
    }
}
                window.location.href = '../race_home.html';
            }
        }).subscribe();
    }
}

async function checkApprovalAndGoToArena(roomCode, name, className, no, team) {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data: lobbyData } = await supabaseClient
                .from('lobbies')
                .select('players')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (lobbyData && Array.isArray(lobbyData.players)) {
                const me = lobbyData.players.find(p => String(p.number) === String(no) && p.nickname_th === name);

                // 🛑 หากสถานะไม่ใช่อนุมัติ (approved) จะไม่ให้เข้าเล่น
                if (!me || me.status !== 'approved') {
                    alert("⚠️ คุณยังไม่ได้รับการอนุมัติให้เข้าแข่งขัน กรุณารอคุณครูกด 'อนุมัติ' ก่อนครับ!");
                    return;
                }
            }
        }
    } catch (e) {
        console.warn("Check approval status error:", e);
    }

    goToBattleArena(roomCode, name, className, no, team);
}

function openLeaveConfirmModal() {
    const modalEl = document.getElementById('leaveConfirmModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// 🚪 ฟังก์ชันสั่งลบตนเองออกจากตาราง lobbies
async function removeStudentFromLobby() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = (urlParams.get('room') || '8090').trim().toUpperCase();
    const no = urlParams.get('no') || '-';
    const name = urlParams.get('name') || '';

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data: lobbyData } = await supabaseClient
                .from('lobbies')
                .select('players')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (lobbyData && Array.isArray(lobbyData.players)) {
                const updatedPlayers = lobbyData.players.filter(
                    p => String(p.number) !== String(no) && p.nickname_th !== name
                );

                await supabaseClient
                    .from('lobbies')
                    .update({ players: updatedPlayers })
                    .eq('room_code', roomCode);

                const channel = supabaseClient.channel(`room_signal_${roomCode}`);
                await channel.send({
                    type: 'broadcast',
                    event: 'player_left',
                    payload: { number: no, name: name }
                });
            }
        }
    } catch (e) {
        console.warn("Remove student error:", e);
    }
}

async function confirmLeaveRoom() {
    const btnConfirm = document.getElementById('btn-confirm-leave');
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerText = "กำลังออก...";
    }

    await removeStudentFromLobby();
    window.location.href = '../race_home.html';
}

window.addEventListener('beforeunload', () => {
    removeStudentFromLobby();
});

window.addEventListener('pagehide', () => {
    removeStudentFromLobby();
});

async function sendEmojiReaction(emoji) {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = (urlParams.get('room') || '8090').trim().toUpperCase();
    const name = urlParams.get('name') || 'นักเรียน';

    const messageText = `😀 ${name} ส่ง Reaction ${emoji}`;

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'emoji_reaction',
                payload: { name: name, emoji: emoji, message: messageText }
            });

            await supabaseClient.from('combat_logs').insert([{
                room_code: roomCode,
                message: messageText,
                log_type: 'EMOJI'
            }]);
        }
    } catch (e) {
        console.warn("Send emoji error:", e);
    }

    const alertBox = document.createElement('div');
    alertBox.className = 'position-fixed bottom-0 start-50 translate-middle-x bg-info text-dark font-mono px-3 py-1 rounded-pill shadow fs-6 mb-3';
    alertBox.style.zIndex = '99999';
    alertBox.innerHTML = `ส่ง ${emoji} ขึ้นจอใหญ่แล้ว!`;
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 1500);
}

function goToBattleArena(roomCode, name, className, no, team) {
    window.location.href = `student_typing.html?room=${roomCode}&name=${encodeURIComponent(name)}&class=${encodeURIComponent(className)}&no=${no}&team=${team}`;
}