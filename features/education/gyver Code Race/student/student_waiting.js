document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = (urlParams.get('room') || '8090').trim().toUpperCase();
    const name = urlParams.get('name') || 'นักเรียน';
    const className = urlParams.get('class') || 'ม.-/-';
    const no = urlParams.get('no') || '-';
    const team = urlParams.get('team') || '0';
    
    // 🟢 บังคับใช้ classKey จาก URL หรืออิงตาม roomCode ให้ตรงกันทุกจอ
    const classKey = urlParams.get('classKey') || roomCode;

    // 1. แสดงโปรไฟล์ตัวเอง
    const waitRoomCode = document.getElementById('wait-room-code');
    if (waitRoomCode) waitRoomCode.innerText = roomCode;

    const waitNameText = document.getElementById('wait-name-text');
    if (waitNameText) waitNameText.innerText = name;

    const waitClassBadge = document.getElementById('wait-class-badge');
    if (waitClassBadge) waitClassBadge.innerText = className;

    const waitNoText = document.getElementById('wait-no-text');
    if (waitNoText) waitNoText.innerText = no;
    
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
                const avatarImg = document.getElementById('wait-avatar-img');
                if (avatarImg) avatarImg.src = profile.avatarUrl;
            }
        } catch (e) {}
    }

    // 2. ดึง Config เริ่มต้นของห้อง
    await fetchInitialMatchConfig(roomCode);

    // 3. 🟢 ดึงรายชื่อเพื่อนร่วมห้องและเปิด Realtime Sync
    fetchAndListenJoinedPlayers(classKey, roomCode);

    // 4. ฟังคำสั่ง Realtime จากครู (เริ่มเกม/ปรับตั้งค่า)
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

// 🟢 3. ดึงรายชื่อเพื่อนร่วมห้องสด และฟังเหตุการณ์อัปเดต
async function fetchAndListenJoinedPlayers(classKey, roomCode) {
    await fetchJoinedPlayers(classKey, roomCode);

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        // ฟังการอัปเดตแบบ Realtime
        supabaseClient
            .channel(`waiting_sync_${roomCode}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'class_rooms'
            }, () => {
                fetchJoinedPlayers(classKey, roomCode);
            })
            .subscribe();

        // Polling สำรองเพื่อความนิ่ง
        setInterval(() => fetchJoinedPlayers(classKey, roomCode), 1500);
    }
}

async function fetchJoinedPlayers(classKey, roomCode) {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            // 🟢 แก้ไข: ใช้ .select() ดึงแถวทั้งหมดที่อาจแมตช์ ไม่ใช้ .maybeSingle() ป้องกัน Error 400
            let { data: rooms } = await supabaseClient
                .from('class_rooms')
                .select('players')
                .or(`class_key.eq.${classKey},class_key.eq.${roomCode}`);

            if (rooms && rooms.length > 0) {
                let allPlayers = [];
                let playerMap = new Map();

                // รวมเด็กจากทุกแถวที่หาเจอ และตัดคนที่ซ้ำกันออก
                rooms.forEach(r => {
                    if (Array.isArray(r.players)) {
                        r.players.forEach(p => {
                            const uniqueKey = p.number ? `${p.number}_${p.nickname_th}` : p.name;
                            if (!playerMap.has(uniqueKey)) {
                                playerMap.set(uniqueKey, p);
                                allPlayers.push(p);
                            }
                        });
                    }
                });

                renderJoinedPlayersUI(allPlayers);
            }
        }
    } catch (err) {
        console.error("Fetch players error:", err);
    }
}

// 🟢 แสดงผลชิปรายชื่อนักเรียนทุกคน
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
            if (payload && payload.payload) {
                updateStudentConfigUI(payload.payload);
            }
        });

        channel.on('broadcast', { event: 'start_game' }, () => {
            goToBattleArena(roomCode, name, className, no, team);
        }).subscribe();
    }
}

function openLeaveConfirmModal() {
    const modalEl = document.getElementById('leaveConfirmModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

async function confirmLeaveRoom() {
    const btnConfirm = document.getElementById('btn-confirm-leave');
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerText = "กำลังออก...";
    }

    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room') || '';
    const classKey = urlParams.get('classKey') || roomCode;
    const no = urlParams.get('no') || '-';
    const name = urlParams.get('name') || '';

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data: rooms } = await supabaseClient
                .from('class_rooms')
                .select('*')
                .or(`class_key.eq.${classKey},class_key.eq.${roomCode}`);

            if (rooms && rooms.length > 0) {
                for (let room of rooms) {
                    if (Array.isArray(room.players)) {
                        const updatedPlayers = room.players.filter(
                            p => String(p.number) !== String(no) && p.nickname_th !== name
                        );

                        await supabaseClient
                            .from('class_rooms')
                            .update({ players: updatedPlayers })
                            .eq('id', room.id);
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Leave room error:", e);
    }

    window.location.href = '../race_home.html';
}

async function sendEmojiReaction(emoji) {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room') || '8090';
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
