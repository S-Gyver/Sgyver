let roomCode = '';
let classKey = '';
let playersData = {}; 
let focusSlot1No = null; 
let focusSlot2No = null; 
let isMatchEnded = false;
let isPaused = false;
let remainingSeconds = 180;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = (urlParams.get('room') || 'RACE88').trim().toUpperCase();
    classKey = urlParams.get('classKey') || '5/10';

    const roomEl = document.getElementById('live-room-code');
    if (roomEl) roomEl.innerText = roomCode;

    await fetchInitialRoomConfig();
    await fetchAndListenPlayers();
    listenLiveStudentTyping();
    listenRoomSignals();
});

async function fetchInitialRoomConfig() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data } = await supabaseClient
                .from('lobbies')
                .select('*')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (data) {
                if (data.status === 'FINISHED') {
                    window.location.href = `race_summary.html?room=${roomCode}`;
                    return;
                }

                if (data.timer_enabled && data.timer_duration) {
                    remainingSeconds = parseInt(data.timer_duration);
                    startCountdownTimer();
                } else {
                    const timerEl = document.getElementById('live-timer');
                    if (timerEl) timerEl.innerText = "NO LIMIT";
                }
            }
        }
    } catch (e) {
        console.warn("fetchInitialRoomConfig error:", e);
    }
}

function startCountdownTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        if (isPaused || isMatchEnded) return;

        remainingSeconds--;
        updateTimerDisplay();

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            triggerTimeExpiredFinish();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('live-timer');
    if (!timerEl) return;

    if (remainingSeconds < 0) remainingSeconds = 0;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    timerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function triggerTimeExpiredFinish() {
    if (isMatchEnded) return;
    isMatchEnded = true;

    const overlay = document.getElementById('winner-celebration-overlay');
    const winnerName = document.getElementById('winner-name-display');
    const winnerStats = document.getElementById('winner-stats-display');
    const countdownBadge = document.getElementById('redirect-countdown-badge');

    const sortedPlayers = Object.values(playersData).sort((a, b) => b.progress - a.progress || b.wpm - a.wpm);
    const topPlayer = sortedPlayers[0];

    if (overlay) {
        overlay.classList.remove('d-none');
        overlay.classList.add('d-flex');
    }
    if (winnerName) {
        winnerName.innerText = topPlayer ? `หมดเวลาการแข่งขัน! ผู้นำอันดับ 1: ${topPlayer.name}` : "หมดเวลาการแข่งขัน!";
    }
    if (winnerStats) {
        winnerStats.innerText = topPlayer ? `${topPlayer.progress}% | ${topPlayer.wpm} WPM` : "";
    }

    let countdown = 5;
    const cdInterval = setInterval(() => {
        countdown--;
        if (countdownBadge) countdownBadge.innerText = `กำลังนำไปยังหน้าสรุปผลใน ${countdown} วินาที...`;
        if (countdown <= 0) {
            clearInterval(cdInterval);
            window.location.href = `race_summary.html?room=${roomCode}`;
        }
    }, 1000);
}

function listenLiveStudentTyping() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const channel = supabaseClient.channel(`room_typing_${roomCode}`);

        channel.on('broadcast', { event: 'typing_update' }, (payload) => {
            if (payload && payload.payload) {
                const p = payload.payload;
                const numKey = String(p.number);

                if (!playersData[numKey]) {
                    playersData[numKey] = {
                        number: numKey,
                        name: p.name || `นักเรียน (${numKey})`,
                        image: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(p.name || numKey),
                        progress: 0,
                        code: '',
                        wpm: 0,
                        errors: 0
                    };
                    if (!focusSlot1No) focusSlot1No = numKey;
                    else if (!focusSlot2No) focusSlot2No = numKey;
                }

                playersData[numKey].progress = p.progress || 0;
                playersData[numKey].code = p.typedCode || '';
                playersData[numKey].wpm = p.wpm || 0;
                playersData[numKey].errors = p.errors || 0;

                renderAllSections();

                // ตรวจจับผู้ชนะเข้าเส้นชัย (100%)
                if (p.progress >= 100 && !isMatchEnded) {
                    triggerWinnerCelebration(playersData[numKey]);
                }
            }
        }).subscribe();
    }
}

function triggerWinnerCelebration(winner) {
    if (isMatchEnded) return;
    isMatchEnded = true;

    const overlay = document.getElementById('winner-celebration-overlay');
    const winnerName = document.getElementById('winner-name-display');
    const winnerStats = document.getElementById('winner-stats-display');
    const countdownBadge = document.getElementById('redirect-countdown-badge');

    if (overlay) {
        overlay.classList.remove('d-none');
        overlay.classList.add('d-flex');
    }
    if (winnerName) {
        winnerName.innerText = `${winner.name} (เลขที่ ${winner.number})`;
    }
    if (winnerStats) {
        winnerStats.innerText = `พิมพ์สำเร็จ 100% | ความเร็ว ${winner.wpm} WPM!`;
    }

    let countdown = 5;
    const cdInterval = setInterval(() => {
        countdown--;
        if (countdownBadge) countdownBadge.innerText = `กำลังนำไปยังหน้าสรุปผลใน ${countdown} วินาที...`;
        if (countdown <= 0) {
            clearInterval(cdInterval);
            window.location.href = `race_summary.html?room=${roomCode}`;
        }
    }, 1000);
}

function listenRoomSignals() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const channel = supabaseClient.channel(`room_signal_${roomCode}`);

        channel.on('broadcast', { event: 'end_game' }, () => {
            console.log("🏁 ได้รับสัญญาณจบการแข่งจากครู");
            window.location.href = `race_summary.html?room=${roomCode}`;
        });

        channel.on('broadcast', { event: 'pause_game' }, (payload) => {
            isPaused = !!(payload && payload.payload && payload.payload.isPaused);
            const timerEl = document.getElementById('live-timer');
            if (timerEl) {
                timerEl.style.color = isPaused ? '#ef4444' : '#f59e0b';
            }
        });

        channel.subscribe();
    }
}

async function fetchAndListenPlayers() {
    await fetchPlayersFromDB();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`lobbies_live_${roomCode}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'lobbies',
                filter: `room_code=eq.${roomCode}`
            }, (payload) => {
                if (payload.new && Array.isArray(payload.new.players)) {
                    updatePlayersDataFromDB(payload.new.players);
                }
                if (payload.new && payload.new.status === 'FINISHED') {
                    window.location.href = `race_summary.html?room=${roomCode}`;
                }
            })
            .subscribe();

        setInterval(fetchPlayersFromDB, 2000);
    }
}

async function fetchPlayersFromDB() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data } = await supabaseClient
                .from('lobbies')
                .select('players, status')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (data) {
                if (data.status === 'FINISHED') {
                    window.location.href = `race_summary.html?room=${roomCode}`;
                    return;
                }
                if (Array.isArray(data.players)) {
                    updatePlayersDataFromDB(data.players);
                }
            }
        }
    } catch (e) {}
}

function updatePlayersDataFromDB(playersArray) {
    const approvedPlayers = playersArray.filter(p => p.status === 'approved' || !p.status);

    approvedPlayers.forEach(p => {
        const numKey = String(p.number || p.studentNumber || '10');
        const sName = p.nickname_th || p.name || 'นักเรียน';

        if (!playersData[numKey]) {
            playersData[numKey] = {
                number: numKey,
                name: sName,
                image: p.image || p.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(sName),
                progress: p.progress || 0,
                code: p.code || '// รอนักเรียนเริ่มพิมพ์...',
                wpm: p.wpm || 0,
                errors: p.errors || 0
            };
        } else {
            // ซิงก์ข้อมูลที่มีการอัปเดตลง DB ถ้าค่ามากกว่า
            if ((p.progress || 0) > playersData[numKey].progress) {
                playersData[numKey].progress = p.progress;
            }
            if (p.code && playersData[numKey].code.startsWith('//')) {
                playersData[numKey].code = p.code;
            }
            if (p.wpm) playersData[numKey].wpm = p.wpm;
            if (p.errors !== undefined) playersData[numKey].errors = p.errors;
        }
    });

    const nos = Object.keys(playersData);
    if (!focusSlot1No && nos.length > 0) focusSlot1No = nos[0];
    if (!focusSlot2No && nos.length > 1) focusSlot2No = nos[1];

    renderAllSections();
}

function renderAllSections() {
    renderProgressBarSection();
    renderDualFocusScreens();
    renderAllMiniCardsGrid();
}

function renderProgressBarSection() {
    const container = document.getElementById('progress-tracks-container');
    if (!container) return;

    const sortedPlayers = Object.values(playersData).sort((a, b) => b.progress - a.progress || b.wpm - a.wpm);

    const rank1El = document.getElementById('rank-1-name');
    const rank2El = document.getElementById('rank-2-name');

    if (rank1El) rank1El.innerText = sortedPlayers.length > 0 ? `${sortedPlayers[0].name} (${sortedPlayers[0].progress}%)` : '-';
    if (rank2El) rank2El.innerText = sortedPlayers.length > 1 ? `${sortedPlayers[1].name} (${sortedPlayers[1].progress}%)` : '-';

    if (sortedPlayers.length === 0) {
        container.innerHTML = `<div class="text-center text-subtle font-mono py-3">กำลังรอข้อมูลการพิมพ์จากผู้แข่งขัน...</div>`;
        return;
    }

    container.innerHTML = sortedPlayers.map(p => `
        <div class="progress-track-item d-flex align-items-center gap-3">
            <div class="d-flex align-items-center gap-2" style="width: 140px;">
                <img src="${p.image}" class="rounded-circle" style="width:28px; height:28px; border:1px solid #38bdf8;">
                <span class="text-white fw-bold small text-truncate">${p.name}</span>
            </div>
            <div class="progress flex-grow-1 bg-dark" style="height: 14px;">
                <div class="progress-bar ${p.progress >= 100 ? 'bg-success' : 'bg-cyan'} progress-bar-striped progress-bar-animated" role="progressbar" style="width: ${p.progress}%;">
                    ${p.progress}%
                </div>
            </div>
            <span class="badge bg-dark border border-secondary text-warning font-mono" style="width: 60px;">${p.progress}%</span>
        </div>
    `).join('');
}

// 📺 สลับสีสว่างเตือนสีแดงบนหน้าจอ Projector เมื่อเด็กพิมพ์ผิด
function renderDualFocusScreens() {
    const p1 = playersData[focusSlot1No];
    const p2 = playersData[focusSlot2No];

    // --- Slot 1 ---
    if (p1) {
        const isWrong1 = p1.errors > 0;
        const box1 = document.getElementById('slot1-screen-box');
        const codeEl1 = document.getElementById('slot1-code-content');

        const slot1Name = document.getElementById('slot1-player-name');
        const slot1Percent = document.getElementById('slot1-player-percent');
        const slot1Wpm = document.getElementById('slot1-wpm-text');

        if (slot1Name) slot1Name.innerText = `FOCUS #1: ${p1.name} (เลขที่ ${p1.number})`;
        if (slot1Percent) slot1Percent.innerText = `${p1.progress}%`;

        if (codeEl1) {
            codeEl1.innerText = p1.code || '// กำลังพิมพ์...';
            codeEl1.style.color = isWrong1 ? '#fca5a5' : '#38bdf8';
        }

        if (box1) {
            if (isWrong1) box1.classList.add('is-wrong-box');
            else box1.classList.remove('is-wrong-box');
        }

        if (slot1Wpm) {
            slot1Wpm.innerHTML = isWrong1 
                ? `<span class="text-danger fw-bold fs-6"><i class="bi bi-exclamation-triangle-fill me-1"></i>พิมพ์ผิดตัวอักษร!</span> | WPM: ${p1.wpm}`
                : `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>พิมพ์ถูกต้อง</span> | WPM: ${p1.wpm}`;
        }
    }

    // --- Slot 2 ---
    if (p2) {
        const isWrong2 = p2.errors > 0;
        const box2 = document.getElementById('slot2-screen-box');
        const codeEl2 = document.getElementById('slot2-code-content');

        const slot2Name = document.getElementById('slot2-player-name');
        const slot2Percent = document.getElementById('slot2-player-percent');
        const slot2Wpm = document.getElementById('slot2-wpm-text');

        if (slot2Name) slot2Name.innerText = `FOCUS #2: ${p2.name} (เลขที่ ${p2.number})`;
        if (slot2Percent) slot2Percent.innerText = `${p2.progress}%`;

        if (codeEl2) {
            codeEl2.innerText = p2.code || '// กำลังพิมพ์...';
            codeEl2.style.color = isWrong2 ? '#fca5a5' : '#f59e0b';
        }

        if (box2) {
            if (isWrong2) box2.classList.add('is-wrong-box');
            else box2.classList.remove('is-wrong-box');
        }

        if (slot2Wpm) {
            slot2Wpm.innerHTML = isWrong2 
                ? `<span class="text-danger fw-bold fs-6"><i class="bi bi-exclamation-triangle-fill me-1"></i>พิมพ์ผิดตัวอักษร!</span> | WPM: ${p2.wpm}`
                : `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>พิมพ์ถูกต้อง</span> | WPM: ${p2.wpm}`;
        }
    }
}

function renderAllMiniCardsGrid() {
    const container = document.getElementById('all-mini-cards-grid');
    if (!container) return;

    if (Object.keys(playersData).length === 0) {
        container.innerHTML = `<div class="text-center text-subtle font-mono py-3 w-100">กำลังดึงรายชื่อผู้เข้าแข่งขัน...</div>`;
        return;
    }

    container.innerHTML = Object.values(playersData).map(p => {
        const isSlot1 = String(p.number) === String(focusSlot1No);
        const isSlot2 = String(p.number) === String(focusSlot2No);
        let activeClass = isSlot1 ? 'active-slot1' : isSlot2 ? 'active-slot2' : '';
        const isWrong = p.errors > 0;

        return `
            <div class="mini-student-card ${activeClass} ${isWrong ? 'border-danger' : ''}" onclick="selectPlayerToFocus('${p.number}')">
                <div class="d-flex align-items-center justify-content-between mb-1">
                    <div class="d-flex align-items-center gap-2 overflow-hidden">
                        <img src="${p.image}" class="rounded-circle" style="width:24px; height:24px; object-fit:cover;">
                        <strong class="text-white small text-truncate">${p.name}</strong>
                    </div>
                    ${isWrong ? '<span class="badge bg-danger" style="font-size:0.55rem;">ผิด!</span>' : ''}
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-subtle" style="font-size:0.65rem;">เลขที่ ${p.number}</small>
                    <span class="badge bg-dark border ${isWrong ? 'border-danger text-danger' : 'border-info text-cyan'}" style="font-size:0.65rem;">${p.progress}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function selectPlayerToFocus(no) {
    const numKey = String(no);
    if (focusSlot1No === numKey) return;

    focusSlot2No = focusSlot1No;
    focusSlot1No = numKey;

    renderAllSections();
}