let roomCode = '';
let classKey = '';
let playersData = {}; 
let focusSlot1No = null; 
let focusSlot2No = null; 

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('room') || 'RACE88';
    classKey = urlParams.get('classKey') || '5/10';

    document.getElementById('live-room-code').innerText = roomCode;

    fetchAndListenPlayers();
    listenLiveStudentTyping();
});

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
            }
        }).subscribe();
    }
}

async function fetchAndListenPlayers() {
    await fetchPlayersFromDB();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`class_rooms_live_${classKey}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'class_rooms',
                filter: `class_key=eq.${classKey}`
            }, (payload) => {
                if (payload.new && Array.isArray(payload.new.players)) {
                    updatePlayersDataFromDB(payload.new.players);
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
                .from('class_rooms')
                .select('players')
                .eq('class_key', classKey)
                .maybeSingle();

            if (data && Array.isArray(data.players)) {
                updatePlayersDataFromDB(data.players);
            }
        }
    } catch (e) {}
}

function updatePlayersDataFromDB(playersArray) {
    playersArray.forEach(p => {
        const numKey = String(p.number || p.studentNumber || '10');
        const sName = p.nickname_th || p.name || 'นักเรียน';

        playersData[numKey] = {
            number: numKey,
            name: sName,
            image: p.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(sName),
            progress: p.progress || 0,
            code: p.code || '// รอนักเรียนเริ่มพิมพ์...',
            wpm: p.wpm || 0,
            errors: p.errors || 0
        };
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

    const sortedPlayers = Object.values(playersData).sort((a, b) => b.progress - a.progress);

    if (sortedPlayers.length > 0) document.getElementById('rank-1-name').innerText = `${sortedPlayers[0].name} (${sortedPlayers[0].progress}%)`;
    if (sortedPlayers.length > 1) document.getElementById('rank-2-name').innerText = `${sortedPlayers[1].name} (${sortedPlayers[1].progress}%)`;

    container.innerHTML = sortedPlayers.map(p => `
        <div class="progress-track-item d-flex align-items-center gap-3">
            <div class="d-flex align-items-center gap-2" style="width: 140px;">
                <img src="${p.image}" class="rounded-circle" style="width:28px; height:28px; border:1px solid #38bdf8;">
                <span class="text-white fw-bold small text-truncate">${p.name}</span>
            </div>
            <div class="progress flex-grow-1 bg-dark" style="height: 14px;">
                <div class="progress-bar bg-cyan progress-bar-striped progress-bar-animated" role="progressbar" style="width: ${p.progress}%;">
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

        document.getElementById('slot1-player-name').innerText = `FOCUS #1: ${p1.name} (เลขที่ ${p1.number})`;
        document.getElementById('slot1-player-percent').innerText = `${p1.progress}%`;

        if (codeEl1) {
            codeEl1.innerText = p1.code || '// กำลังพิมพ์...';
            codeEl1.style.color = isWrong1 ? '#fca5a5' : '#38bdf8';
        }

        if (box1) {
            if (isWrong1) box1.classList.add('is-wrong-box');
            else box1.classList.remove('is-wrong-box');
        }

        document.getElementById('slot1-wpm-text').innerHTML = isWrong1 
            ? `<span class="text-danger fw-bold fs-6"><i class="bi bi-exclamation-triangle-fill me-1"></i>พิมพ์ผิดตัวอักษร!</span> | WPM: ${p1.wpm}`
            : `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>พิมพ์ถูกต้อง</span> | WPM: ${p1.wpm}`;
    }

    // --- Slot 2 ---
    if (p2) {
        const isWrong2 = p2.errors > 0;
        const box2 = document.getElementById('slot2-screen-box');
        const codeEl2 = document.getElementById('slot2-code-content');

        document.getElementById('slot2-player-name').innerText = `FOCUS #2: ${p2.name} (เลขที่ ${p2.number})`;
        document.getElementById('slot2-player-percent').innerText = `${p2.progress}%`;

        if (codeEl2) {
            codeEl2.innerText = p2.code || '// กำลังพิมพ์...';
            codeEl2.style.color = isWrong2 ? '#fca5a5' : '#f59e0b';
        }

        if (box2) {
            if (isWrong2) box2.classList.add('is-wrong-box');
            else box2.classList.remove('is-wrong-box');
        }

        document.getElementById('slot2-wpm-text').innerHTML = isWrong2 
            ? `<span class="text-danger fw-bold fs-6"><i class="bi bi-exclamation-triangle-fill me-1"></i>พิมพ์ผิดตัวอักษร!</span> | WPM: ${p2.wpm}`
            : `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>พิมพ์ถูกต้อง</span> | WPM: ${p2.wpm}`;
    }
}

function renderAllMiniCardsGrid() {
    const container = document.getElementById('all-mini-cards-grid');
    if (!container) return;

    container.innerHTML = Object.values(playersData).map(p => {
        const isSlot1 = String(p.number) === String(focusSlot1No);
        const isSlot2 = String(p.number) === String(focusSlot2No);
        let activeClass = isSlot1 ? 'active-slot1' : isSlot2 ? 'active-slot2' : '';
        const isWrong = p.errors > 0;

        return `
            <div class="mini-student-card ${activeClass} ${isWrong ? 'border-danger' : ''}" onclick="selectPlayerToFocus('${p.number}')">
                <div class="d-flex align-items-center justify-content-between mb-1">
                    <div class="d-flex align-items-center gap-2 overflow-hidden">
                        <img src="${p.image}" class="rounded-circle" style="width:24px; height:24px;">
                        <strong class="text-white small text-truncate">${p.name}</strong>
                    </div>
                    ${isWrong ? '<span class="badge bg-danger animate-pulse" style="font-size:0.55rem;">ผิด!</span>' : ''}
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