let roomCode = '';
let classKey = '';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = (urlParams.get('room') || 'RACE88').trim().toUpperCase();
    classKey = urlParams.get('classKey') || '5/10';
    const matchType = urlParams.get('type') || 'solo';

    const roomEl = document.getElementById('proj-room-code');
    if (roomEl) roomEl.innerText = roomCode;
    
    const cfgType = document.getElementById('cfg-match-type');
    if (cfgType) {
        cfgType.innerText = matchType === 'team' ? 'โหมดทีม (Team Race)' : 'โหมดเดี่ยว (Solo Race)';
    }

    generateQRCode(roomCode);
    await fetchInitialLobbyConfig();
    fetchAndRenderStudents();
    listenStudentJoinEvents();
    listenCombatLogsFeed();
    listenTeacherConfigRealtime();
});

function generateQRCode(code) {
    const container = document.getElementById('qrcode-container');
    if (!container) return;
    container.innerHTML = '';

    const joinUrl = `${window.location.origin}/features/education/gyver%20Code%20Race/student/student_lobby.html?room=${code}`;

    try {
        if (typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: joinUrl,
                width: 130,
                height: 130,
                colorDark: "#020617",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    } catch (e) {}
}

async function fetchInitialLobbyConfig() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data } = await supabaseClient
                .from('lobbies')
                .select('*')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (data) {
                updateProjectorUI(data);
                const cfgType = document.getElementById('cfg-match-type');
                if (cfgType && data.match_type) {
                    cfgType.innerText = data.match_type === 'team' ? 'โหมดทีม (Team Race)' : 'โหมดเดี่ยว (Solo Race)';
                }
                if (data.status === 'IN_PROGRESS') {
                    window.location.href = `projector_live.html?room=${roomCode}`;
                }
            }
        }
    } catch (e) {
        console.warn("fetchInitialLobbyConfig error:", e);
    }
}

function listenTeacherConfigRealtime() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const channel = supabaseClient.channel(`room_signal_${roomCode}`);
        
        channel.on('broadcast', { event: 'config_updated' }, (payload) => {
            if (payload && payload.payload) {
                updateProjectorUI(payload.payload);
            }
        });

        channel.on('broadcast', { event: 'emoji_reaction' }, (payload) => {
            if (payload && payload.payload) {
                const data = payload.payload;
                addFeedLog(`${data.message}`);
                showEmojiOnStudentCard(data.name, data.emoji);
                showFloatingEmojiEffect(data.emoji);
            }
        });

        channel.on('broadcast', { event: 'start_game' }, () => {
            console.log("🚀 สัญญาณเริ่มแข่งมาแล้ว! เปลี่ยนไปหน้า Live...");
            window.location.href = `projector_live.html?room=${roomCode}`;
        });

        channel.subscribe();
    }
}

function showEmojiOnStudentCard(studentName, emoji) {
    if (!studentName) return;

    const cards = document.querySelectorAll('.player-card-hover');
    cards.forEach(card => {
        const nameAttr = card.getAttribute('data-student-name');
        if (nameAttr && nameAttr.trim() === studentName.trim()) {
            const oldBadge = card.querySelector('.card-emoji-badge');
            if (oldBadge) oldBadge.remove();

            const badge = document.createElement('div');
            badge.className = 'card-emoji-badge';
            badge.innerText = emoji;
            card.appendChild(badge);

            setTimeout(() => {
                badge.style.transition = 'opacity 0.5s ease';
                badge.style.opacity = '0';
                setTimeout(() => badge.remove(), 500);
            }, 3000);
        }
    });
}

function showFloatingEmojiEffect(emoji) {
    const floatEl = document.createElement('div');
    floatEl.innerText = emoji;
    floatEl.style.cssText = `
        position: fixed;
        bottom: 50px;
        left: ${Math.random() * 80 + 10}%;
        font-size: 4rem;
        z-index: 9999;
        pointer-events: none;
        animation: floatUp 2s ease-out forwards;
    `;
    document.body.appendChild(floatEl);

    setTimeout(() => floatEl.remove(), 2000);
}

function updateProjectorUI(cfg) {
    if (!cfg) return;

    // Time Limit
    const timeEl = document.getElementById('cfg-time-limit');
    if (timeEl) {
        const timerEnabled = cfg.timer_enabled ?? cfg.timer?.enabled ?? false;
        const duration = cfg.timer_duration ?? cfg.timer?.duration ?? 180;
        timeEl.innerText = !timerEnabled 
            ? 'ไม่จำกัดเวลา' 
            : `${Math.floor(duration / 60)} นาที (${duration} วินาที)`;
    }

    // Gold Rule
    const goldEl = document.getElementById('cfg-gold-rule');
    if (goldEl) {
        const goldEnabled = cfg.gold_enabled ?? cfg.gold?.enabled ?? false;
        const amount = cfg.gold_amount ?? cfg.gold?.amount ?? 3;
        const milestone = cfg.gold_milestone ?? cfg.gold?.milestone ?? '10%';
        goldEl.innerText = goldEnabled 
            ? `${amount} Gold / ทุก ${milestone}` 
            : 'ปิดใช้งาน';
    }

    // Quiz Rule
    const quizEl = document.getElementById('cfg-quiz-rule');
    if (quizEl) {
        const quizEnabled = cfg.quiz_enabled ?? cfg.quiz?.enabled ?? false;
        quizEl.innerText = quizEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
        quizEl.className = quizEnabled ? 'text-danger fw-bold' : 'text-subtle';
    }

    // Items List
    const itemContainer = document.getElementById('cfg-items-list');
    if (itemContainer) {
        const shopEnabled = cfg.shop_enabled ?? cfg.items?.enabled ?? false;
        if (!shopEnabled) {
            itemContainer.innerHTML = '<span class="text-subtle small">ปิดใช้งานร้านค้า</span>';
        } else {
            const shield = cfg.item_shield ?? cfg.items?.shield;
            const blind = cfg.item_blind ?? cfg.items?.blind;
            const freeze = cfg.item_freeze ?? cfg.items?.freeze;
            const boost = cfg.item_boost ?? cfg.items?.boost;

            let itemsHtml = '';
            if (shield) itemsHtml += `<span class="badge bg-secondary text-white" style="font-size: 0.65rem;">🛡️ โล่ป้องกัน</span> `;
            if (blind) itemsHtml += `<span class="badge bg-secondary text-white" style="font-size: 0.65rem;">👁️ หน้าจอเบลอ</span> `;
            if (freeze) itemsHtml += `<span class="badge bg-secondary text-white" style="font-size: 0.65rem;">❄️ แช่แข็งระบบ</span> `;
            if (boost) itemsHtml += `<span class="badge bg-secondary text-white" style="font-size: 0.65rem;">⚡ สปีดบูสท์</span> `;
            itemContainer.innerHTML = itemsHtml || '<span class="text-subtle small">ไม่มีไอเทมเปิดขาย</span>';
        }
    }
}

async function fetchAndRenderStudents() {
    const grid = document.getElementById('projector-students-grid');
    const countEl = document.getElementById('proj-student-count');

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data: lobbyData } = await supabaseClient
                .from('lobbies')
                .select('players, status')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (lobbyData) {
                if (lobbyData.status === 'IN_PROGRESS') {
                    window.location.href = `projector_live.html?room=${roomCode}`;
                    return;
                }

                if (Array.isArray(lobbyData.players)) {
                    const approvedPlayers = lobbyData.players.filter(p => p.status === 'approved' || !p.status);
                    if (countEl) countEl.innerText = approvedPlayers.length;

                    if (grid) {
                        if (approvedPlayers.length === 0) {
                            grid.innerHTML = `<div class="col-12 text-center text-subtle font-mono py-4">ยังไม่มีนักเรียนที่ได้รับการอนุมัติในห้องแข่ง</div>`;
                        } else {
                            grid.innerHTML = approvedPlayers.map(p => {
                                const studentName = p.nickname_th || p.name;
                                return `
                                    <div class="player-card-hover p-2 bg-dark rounded-3 border border-secondary d-flex align-items-center gap-2" style="width: 170px;" data-student-name="${studentName}">
                                        <img src="${p.image || p.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(studentName)}" class="peer-avatar-lg">
                                        <div class="font-mono overflow-hidden">
                                            <strong class="text-white d-block small text-truncate">${studentName}</strong>
                                            <small class="text-cyan d-block" style="font-size: 0.7rem;">เลขที่ ${p.number || '-'}</small>
                                            <span class="badge bg-success mt-1" style="font-size: 0.6rem;">พร้อมแข่ง</span>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Fetch Error:", e);
    }
}

function listenStudentJoinEvents() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`lobbies_sync_projector_${roomCode}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'lobbies',
                filter: `room_code=eq.${roomCode}`
            }, () => {
                fetchAndRenderStudents();
            })
            .subscribe();

        setInterval(fetchAndRenderStudents, 3000);
    }
}

function listenCombatLogsFeed() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`combat_logs_room_${roomCode}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'combat_logs',
                filter: `room_code=eq.${roomCode}`
            }, (payload) => {
                if (payload.new && payload.new.message) {
                    addFeedLog(payload.new.message);
                }
            })
            .subscribe();
    }
}

function addFeedLog(msg) {
    const box = document.getElementById('activity-feed-box');
    if (box) {
        const item = document.createElement('div');
        item.className = 'text-warning mb-1';
        item.innerHTML = `<span class="text-subtle">[${new Date().toLocaleTimeString('th-TH')}]</span> ${msg}`;
        box.prepend(item);
    }
}