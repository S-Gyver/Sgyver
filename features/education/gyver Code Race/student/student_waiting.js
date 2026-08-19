document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room') || 'RACE88';
    const name = urlParams.get('name') || 'นักเรียน';
    const className = urlParams.get('class') || 'ม.-/-';
    const no = urlParams.get('no') || '-';
    const team = urlParams.get('team') || '0';

    // 1. แสดงโปรไฟล์ตัวเอง
    document.getElementById('wait-room-code').innerText = roomCode;
    document.getElementById('wait-name-text').innerText = name;
    document.getElementById('wait-class-badge').innerText = className;
    document.getElementById('wait-no-text').innerText = no;
    
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
            if (profile.avatarUrl) {
                document.getElementById('wait-avatar-img').src = profile.avatarUrl;
            }
        } catch (e) {}
    }

    // 2. ดึง Config เริ่มต้น
    await fetchInitialMatchConfig(roomCode);

    // 3. ดึงรายชื่อเพื่อนร่วมห้อง
    fetchJoinedPlayers(roomCode, className);

    // 4. ฟังคำสั่ง Realtime จากครู
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
            ? `เปิดใช้งาน (${cfg.quiz.stock_name})` 
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

async function fetchJoinedPlayers(roomCode, className) {
    const container = document.getElementById('joined-players-container');
    const countEl = document.getElementById('joined-count');
    if (!container) return;

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const cleanLevel = className.replace('ม.', '').trim();

            let { data: classData } = await supabaseClient
                .from('class_rooms')
                .select('players')
                .eq('class_key', cleanLevel)
                .maybeSingle();

            if (classData && Array.isArray(classData.players)) {
                const players = classData.players;
                if (countEl) countEl.innerText = players.length;

                container.innerHTML = players.map(p => `
                    <div class="peer-chip">
                        <img src="${p.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(p.nickname_th || 'Racer')}" class="peer-avatar-sm">
                        <div class="font-mono lh-1">
                            <span class="text-white fw-bold d-block small">${p.nickname_th || p.name}</span>
                            <small class="text-subtle" style="font-size: 0.7rem;">เลขที่ ${p.number || '-'}</small>
                        </div>
                    </div>
                `).join('');
            } else {
                if (countEl) countEl.innerText = '1';
            }
        }
    } catch (err) {}
}

function listenTeacherRealtimeSignals(roomCode, name, className, no, team) {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const channel = supabaseClient.channel(`room_signal_${roomCode}`);
        
        channel.on('broadcast', { event: 'config_updated' }, (payload) => {
            if (payload && payload.payload) {
                updateStudentConfigUI(payload.payload);
            }
        });

        channel.on('broadcast', { event: 'start_game' }, () => {
            goToBattleArena(roomCode, name, className, no, team);
        }).subscribe();
    }
}

// 🚪 เปิด Custom Modal แจ้งเตือนสวยๆ
function openLeaveConfirmModal() {
    const modalEl = document.getElementById('leaveConfirmModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// 🚪 ยืนยันการออกจากห้อง (ลบเด็กออกจาก DB)
async function confirmLeaveRoom() {
    const btnConfirm = document.getElementById('btn-confirm-leave');
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerText = "กำลังออก...";
    }

    const urlParams = new URLSearchParams(window.location.search);
    const className = urlParams.get('class') || 'ม.-/-';
    const no = urlParams.get('no') || '-';
    const name = urlParams.get('name') || '';

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const cleanLevel = className.replace('ม.', '').trim();

            let { data: classData } = await supabaseClient
                .from('class_rooms')
                .select('players')
                .eq('class_key', cleanLevel)
                .maybeSingle();

            if (classData && Array.isArray(classData.players)) {
                const updatedPlayers = classData.players.filter(
                    p => String(p.number) !== String(no) && p.nickname_th !== name
                );

                await supabaseClient
                    .from('class_rooms')
                    .update({ players: updatedPlayers })
                    .eq('class_key', cleanLevel);
            }
        }
    } catch (e) {
        console.warn("Leave room error:", e);
    }

    window.location.href = '../race_home.html';
}

async function sendEmojiReaction(emoji) {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room') || 'RACE88';
    const name = urlParams.get('name') || 'นักเรียน';

    const messageText = `😀 ${name} ส่ง Reaction ${emoji}`;

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'emoji_reaction',
                payload: {
                    name: name,
                    emoji: emoji,
                    message: messageText
                }
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