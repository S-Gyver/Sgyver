let roomCode = 'RACE88';
let classKey = '5/10';
let autoSaveTimer = null;
let typingProblemStock = [];
let studentList = [];

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('room') || 'RACE88';
    classKey = urlParams.get('classKey') || '5/10';

    const roomDisplay = document.getElementById('display-room-code');
    if (roomDisplay) roomDisplay.innerText = roomCode;

    setupQRCode(roomCode);
    bindAutoSaveEvents();

    await fetchProblemsFromDB();
    fetchAndListenStudents();
});

function setupQRCode(code) {
    const qrBox = document.getElementById("qrcode-box");
    if (qrBox) {
        qrBox.innerHTML = "";
        const joinUrl = `${window.location.origin}/features/education/gyver%20Code%20Race/student/student_lobby.html?room=${code}`;
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrBox, { text: joinUrl, width: 130, height: 130 });
            }
        } catch (e) {}
    }
}

function toggleTimerSettings(isEnabled) {
    const zone = document.getElementById('timer-select-zone');
    const label = document.getElementById('timer-toggle-label');

    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) {
            label.innerText = "จับเวลา";
            label.classList.replace('text-subtle', 'text-warning');
        }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) {
            label.innerText = "ไม่จำกัดเวลา";
            label.classList.replace('text-warning', 'text-subtle');
        }
    }
    triggerAutoSave();
}

function toggleGoldSettings(isEnabled) {
    const zone = document.getElementById('gold-select-zone');
    const label = document.getElementById('gold-toggle-label');

    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) {
            label.innerText = "เปิดใช้งาน";
            label.classList.replace('text-subtle', 'text-warning');
        }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) {
            label.innerText = "ปิดใช้งาน";
            label.classList.replace('text-warning', 'text-subtle');
        }
    }
    triggerAutoSave();
}

function toggleShopSettings(isEnabled) {
    const zone = document.getElementById('shop-select-zone');
    const label = document.getElementById('shop-toggle-label');

    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) {
            label.innerText = "เปิดใช้งาน";
            label.classList.replace('text-subtle', 'text-cyan');
        }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) {
            label.innerText = "ปิดใช้งาน";
            label.classList.replace('text-cyan', 'text-subtle');
        }
    }
    triggerAutoSave();
}

function toggleQuizSettings(isEnabled) {
    const zone = document.getElementById('quiz-select-zone');
    const label = document.getElementById('quiz-toggle-label');

    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) {
            label.innerText = "เปิดใช้งาน";
            label.classList.replace('text-subtle', 'text-danger');
        }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) {
            label.innerText = "ปิดใช้งาน";
            label.classList.replace('text-danger', 'text-subtle');
        }
    }
    triggerAutoSave();
}

function bindAutoSaveEvents() {
    const selectors = [
        '#saved-problems-select',
        'input[type="checkbox"]',
        'select',
        'input[type="number"]'
    ];

    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.addEventListener('change', triggerAutoSave);
            if (el.tagName === 'INPUT' && el.type === 'number') {
                el.addEventListener('input', triggerAutoSave);
            }
        });
    });
}

function triggerAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveAndBroadcastMatchConfig();
    }, 200);
}

async function saveAndBroadcastMatchConfig() {
    const config = getGameSettingsConfig();

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'config_updated',
                payload: config
            });

            await supabaseClient
                .from('lobbies')
                .update({ match_config: config })
                .eq('room_code', roomCode);

            console.log("⚡ Auto-Saved & Realtime Config Success:", config);
        }
    } catch (err) {
        console.error("Auto Save Error:", err);
    }
}

function getGameSettingsConfig() {
    const isTimerEnabled = document.querySelector('#timer-toggle-switch')?.checked || false;
    const timeDuration = parseInt(document.querySelector('#game-duration-select')?.value || 180);

    const isGoldEnabled = document.querySelector('#gold-toggle-switch')?.checked ?? true;
    const goldMilestone = document.querySelector('#gold-step-percent')?.value || '10%';
    const goldAmount = parseInt(document.querySelector('#gold-reward-amount')?.value || 3);

    const isShopEnabled = document.querySelector('#shop-toggle-switch')?.checked ?? true;
    const itemShield = document.querySelector('#item-shield-enable')?.checked ?? true;
    const itemBlind = document.querySelector('#item-distract-enable')?.checked ?? true;
    const itemFreeze = document.querySelector('#item-freeze-enable')?.checked ?? true;
    const itemBoost = document.querySelector('#item-boost-enable')?.checked ?? true;

    const isQuizEnabled = document.querySelector('#quiz-toggle-switch')?.checked ?? false;
    const quizStock = document.querySelector('#quiz-stock-select')?.options[document.querySelector('#quiz-stock-select')?.selectedIndex]?.text || 'Python พื้นฐาน';
    const quizRewardGold = parseInt(document.querySelector('#quiz-reward-gold')?.value || 2);

    return {
        target_code: document.getElementById('problem-preview-code')?.innerText || '',
        timer: {
            unlimited: !isTimerEnabled,
            duration: timeDuration
        },
        gold: {
            enabled: isGoldEnabled,
            milestone: goldMilestone,
            amount: goldAmount
        },
        items: {
            enabled: isShopEnabled,
            shield: itemShield,
            blind: itemBlind,
            freeze: itemFreeze,
            boost: itemBoost
        },
        quiz: {
            enabled: isQuizEnabled,
            stock_name: quizStock,
            reward_gold: quizRewardGold
        }
    };
}

// 🚀 ครูสั่งกดเริ่มการแข่งขัน: อัปเดต DB และยิง Broadcast สั่งย้ายหน้าทันที!
async function startCountdownAndGame() {
    await saveAndBroadcastMatchConfig();
    
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            // 1. อัปเดตสถานะใน DB เป็น RACING
            await supabaseClient
                .from('lobbies')
                .update({ status: 'RACING' })
                .eq('room_code', roomCode);

            // 2. ยิง Broadcast event: start_game
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'start_game',
                payload: { roomCode: roomCode, status: 'RACING' }
            });

            console.log("🚀 ส่งสัญญาณเริ่มแข่งขันไปยัง Projector และเด็กๆ แล้ว!");
            showToast("🚀 สั่งเริ่มการแข่งขันเรียบร้อยแล้ว!");
        }
    } catch (e) {
        console.error("Start Game Error:", e);
    }
}

async function fetchAndListenStudents() {
    fetchStudents();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`class_rooms_sync_${classKey}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'class_rooms',
                filter: `class_key=eq.${classKey}`
            }, () => {
                fetchStudents();
            })
            .subscribe();
    }
}

async function fetchStudents() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data } = await supabaseClient
                .from('class_rooms')
                .select('players')
                .eq('class_key', classKey)
                .maybeSingle();

            if (data && Array.isArray(data.players)) {
                studentList = data.players;
                renderStudentsUI();
            }
        }
    } catch (e) {}
}

function renderStudentsUI() {
    const pendingGrid = document.getElementById('pending-list-grid');
    const approvedGrid = document.getElementById('approved-list-grid');

    const pendingList = studentList.filter(s => s.status === 'pending');
    const approvedList = studentList.filter(s => s.status !== 'pending');

    if (document.getElementById('pending-count')) document.getElementById('pending-count').innerText = pendingList.length;
    if (document.getElementById('approved-count')) document.getElementById('approved-count').innerText = approvedList.length;

    if (pendingGrid) {
        pendingGrid.innerHTML = pendingList.length === 0 
            ? `<div class="text-center text-muted small py-2 font-mono">ไม่มีนักเรียนรอนุมัติ</div>`
            : pendingList.map(s => `
                <div class="p-2 bg-slate-900 rounded-3 border border-warning d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${s.image || s.avatar}" class="rounded-circle" style="width:32px; height:32px;">
                        <span class="fw-bold text-white small">${s.nickname_th || s.name}</span>
                    </div>
                    <button class="btn btn-sm btn-success py-0 px-2" onclick="approveStudent(${s.number})"><i class="bi bi-check-lg"></i></button>
                </div>
            `).join('');
    }

    if (approvedGrid) {
        approvedGrid.innerHTML = approvedList.length === 0
            ? `<div class="text-center text-muted small py-2 font-mono">ยังไม่มีนักเรียนในห้องแข่ง</div>`
            : approvedList.map(s => `
                <div class="p-2 bg-slate-900 rounded-3 border border-secondary d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${s.image || s.avatar}" class="rounded-circle" style="width:32px; height:32px;">
                        <span class="fw-bold text-white small">${s.nickname_th || s.name}</span>
                    </div>
                    <span class="badge bg-success">พร้อมแข่ง</span>
                </div>
            `).join('');
    }
}

async function fetchProblemsFromDB() {
    try {
        const { data } = await supabaseClient
            .from('game_problems')
            .select('*')
            .eq('game_mode', 'typing')
            .order('created_at', { ascending: true });

        typingProblemStock = data || [];
        renderProblemSelectOptions();
    } catch (err) {}
}

function renderProblemSelectOptions() {
    const selectBox = document.getElementById('saved-problems-select');
    if (!selectBox) return;
    selectBox.innerHTML = "";

    typingProblemStock.forEach((p, idx) => {
        selectBox.innerHTML += `<option value="${p.id}">โจทย์ที่ ${idx + 1}: ${p.title}</option>`;
    });

    if (typingProblemStock.length > 0) loadSelectedProblem(typingProblemStock[0].id);
}

function loadSelectedProblem(val) {
    const preview = document.getElementById('problem-preview-code');
    const selectedProblem = typingProblemStock.find(p => p.id === val);
    if (selectedProblem && preview) {
        preview.innerText = selectedProblem.starter_code || selectedProblem.code || "";
        triggerAutoSave();
    }
}

function showToast(msg) {
    const toastEl = document.getElementById('cyberToast');
    const toastMsg = document.getElementById('toast-message');
    if (toastEl && toastMsg) {
        toastMsg.innerHTML = msg;
        new bootstrap.Toast(toastEl).show();
    }
}