let roomCode = '';
let classKey = '';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('room') || 'RACE88';
    classKey = urlParams.get('classKey') || '5/10';
    const matchType = urlParams.get('type') || 'solo';

    document.getElementById('proj-room-code').innerText = roomCode;
    
    const cfgType = document.getElementById('cfg-match-type');
    if (cfgType) {
        cfgType.innerText = matchType === 'team' ? 'โหมดทีม (Team Race)' : 'โหมดเดี่ยว (Solo Race)';
    }

    generateQRCode(roomCode);
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

    new QRCode(container, {
        text: joinUrl,
        width: 130,
        height: 130,
        colorDark: "#020617",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
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
            window.location.href = `projector_live.html?room=${roomCode}&classKey=${encodeURIComponent(classKey)}`;
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
    const timeEl = document.getElementById('cfg-time-limit');
    if (timeEl && cfg.timer) {
        timeEl.innerText = cfg.timer.unlimited 
            ? 'ไม่จำกัดเวลา' 
            : `${Math.floor(cfg.timer.duration / 60)} นาที (${cfg.timer.duration} วินาที)`;
    }

    const goldEl = document.getElementById('cfg-gold-rule');
    if (goldEl && cfg.gold) {
        goldEl.innerText = cfg.gold.enabled 
            ? `${cfg.gold.amount} Gold / ทุก ${cfg.gold.milestone}` 
            : 'ปิดใช้งาน';
    }

    const quizEl = document.getElementById('cfg-quiz-rule');
    if (quizEl && cfg.quiz) {
        quizEl.innerText = cfg.quiz.enabled 
            ? `${cfg.quiz.stock_name} | +${cfg.quiz.reward_gold} Gold` 
            : 'ปิดใช้งาน';
    }

    const itemContainer = document.getElementById('cfg-items-list');
    if (itemContainer && cfg.items) {
        if (!cfg.items.enabled) {
            itemContainer.innerHTML = '<span class="text-subtle small">ปิดใช้งานร้านค้า</span>';
            return;
        }

        let itemsHtml = '';
        if (cfg.items.shield) itemsHtml += `<span class="badge bg-secondary text-white" style="font-size: 0.65rem;">🛡️ โล่ป้องกัน (3G)</span> `;
        if (cfg.items.blind) itemsHtml += `<span class="badge bg-secondary text-white" style="font-size: 0.65rem;">👁️ หน้าจอเบลอ (4G)</span> `;
        if (cfg.items.freeze) itemsHtml += `<span class="badge bg-secondary text-white" style="font-size: 0.65rem;">❄️ แช่แข็งระบบ (5G)</span> `;
        if (cfg.items.boost) itemsHtml += `<span class="badge bg-secondary text-white" style="font-size: 0.65rem;">⚡ สปีดบูสท์ (6G)</span> `;
        
        itemContainer.innerHTML = itemsHtml || '<span class="text-subtle small">ไม่มีไอเทมเปิดขาย</span>';
    }
}

async function fetchAndRenderStudents() {
    const grid = document.getElementById('projector-students-grid');
    const countEl = document.getElementById('proj-student-count');

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data: classData } = await supabaseClient
                .from('class_rooms')
                .select('players')
                .eq('class_key', classKey)
                .maybeSingle();

            if (classData && Array.isArray(classData.players) && classData.players.length > 0) {
                const players = classData.players;
                if (countEl) countEl.innerText = players.length;

                grid.innerHTML = players.map(p => {
                    const studentName = p.nickname_th || p.name;
                    return `
                        <div class="player-card-hover p-2 bg-dark rounded-3 border border-secondary d-flex align-items-center gap-2" style="width: 170px;" data-student-name="${studentName}">
                            <img src="${p.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(studentName)}" class="peer-avatar-lg">
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
    } catch (e) {
        console.warn("Fetch Error:", e);
    }
}

function listenStudentJoinEvents() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`class_rooms_sync_${classKey}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'class_rooms',
                filter: `class_key=eq.${classKey}`
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