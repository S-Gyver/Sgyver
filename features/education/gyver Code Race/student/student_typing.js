let targetCode = `num1 = int(input("กรอกตัวเลขที่ 1: "))
num2 = int(input("กรอกตัวเลขที่ 2: "))
print("ผลรวม =", num1 + num2)`;

let roomCode = 'RACE88';
let studentNo = 10;
let studentName = 'เอสS';
let classKey = '5/10';

let startTime = null;
let currentGold = 0;
let lastProgressMilestone = 0;
let progressPercent = 0;
let isQuizActive = false;
let isMatchPaused = false;

// ⚙️ ตัวแปรเก็บ Match Config
let matchConfig = {
    gold: { enabled: true, amount: 3, milestone: '10%' },
    items: { enabled: true, shield: true, blind: true, freeze: true, boost: true },
    quiz: { enabled: false, reward_gold: 2 }
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = (urlParams.get('room') || 'RACE88').trim().toUpperCase();

    const savedData = localStorage.getItem('gyver_race_student_profile');
    if (savedData) {
        try {
            const profile = JSON.parse(savedData);
            studentName = profile.nicknameTh || urlParams.get('name') || 'เอสS';
            studentNo = String(profile.studentNumber || urlParams.get('no') || '10');
            classKey = profile.studentClass ? profile.studentClass.replace('ม.', '').trim() : '5/10';
            
            if (profile.avatarUrl) {
                const avatarImg = document.getElementById('my-avatar');
                if (avatarImg) avatarImg.src = profile.avatarUrl;
            }
        } catch (e) {
            studentName = urlParams.get('name') || 'เอสS';
            studentNo = String(urlParams.get('no') || '10');
        }
    } else {
        studentName = urlParams.get('name') || 'เอสS';
        studentNo = String(urlParams.get('no') || '10');
    }

    const nameEl = document.getElementById('my-name');
    if (nameEl) nameEl.innerText = studentName;

    // 📡 โหลด Config เริ่มต้น และโจทย์จาก DB
    await fetchInitialRoomConfigAndCode();

    initInputArea();
    listenTeacherSignals();
});

async function fetchInitialRoomConfigAndCode() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('lobbies')
                .select('*')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (!error && data) {
                if (data.status === 'FINISHED') {
                    window.location.href = `../teacher/race_summary.html?room=${roomCode}`;
                    return;
                }

                if (data.target_code && data.target_code.trim()) {
                    targetCode = data.target_code.trim();
                }

                applyMatchConfig(data);
            }
        }
    } catch (e) {
        console.warn("fetchInitialRoomConfigAndCode error:", e);
    }

    updateTargetCodeDisplay();
}

function updateTargetCodeDisplay() {
    const targetDisplay = document.getElementById('target-code-display');
    const charCount = document.getElementById('char-count');

    if (targetDisplay) {
        targetDisplay.innerText = targetCode;
        if (charCount) charCount.innerText = `0 / ${targetCode.length} CHARS`;

        targetDisplay.addEventListener('dragstart', (e) => e.preventDefault());
        targetDisplay.addEventListener('contextmenu', (e) => e.preventDefault());
    }
}

function initInputArea() {
    const inputArea = document.getElementById('typing-input');
    if (!inputArea) return;

    const savedDraft = localStorage.getItem(`draft_code_${roomCode}_${studentNo}`);
    if (savedDraft) {
        inputArea.value = savedDraft;
    }

    inputArea.addEventListener('drop', (e) => e.preventDefault());
    inputArea.addEventListener('dragover', (e) => e.preventDefault());
    inputArea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            addCombatLog("⚠️ ไม่อนุญาตให้ใช้ Copy-Paste!");
        }
    });
    inputArea.addEventListener('contextmenu', (e) => e.preventDefault());
    inputArea.addEventListener('paste', (e) => e.preventDefault());
    inputArea.addEventListener('input', handleTypingCheck);

    if (inputArea.value.length > 0) {
        handleTypingCheck();
    }
}

function listenTeacherSignals() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const channel = supabaseClient.channel(`room_signal_${roomCode}`);

        // 1. รับการเปลี่ยนการตั้งค่ากลางเกม
        channel.on('broadcast', { event: 'config_updated' }, (payload) => {
            if (payload && payload.payload) {
                applyMatchConfig(payload.payload);
                addCombatLog("⚙️ คุณครูได้ทำการอัปเดตตั้งค่าการแข่งขันกลางสนาม!");
            }
        });

        // 2. พักการแข่งชั่วคราว
        channel.on('broadcast', { event: 'pause_game' }, (payload) => {
            const paused = !!(payload && payload.payload && payload.payload.isPaused);
            isMatchPaused = paused;
            const inputArea = document.getElementById('typing-input');
            if (inputArea) inputArea.disabled = paused;

            addCombatLog(paused ? "⏸️ คุณครูสั่งพักการแข่งขันชั่วคราว!" : "▶️ การแข่งขันดำเนินต่อแล้ว ลุยต่อเลย!");
        });

        // 3. จบการแข่งขัน
        channel.on('broadcast', { event: 'end_game' }, () => {
            addCombatLog("🏁 จบการแข่งขัน! กำลังนำไปยังหน้าสรุปผล...");
            setTimeout(() => {
                window.location.href = `../teacher/race_summary.html?room=${roomCode}`;
            }, 1000);
        });

        // 4. สัญญาณเตะออก
        channel.on('broadcast', { event: 'kicked_out' }, (payload) => {
            if (payload && payload.payload && String(payload.payload.number) === String(studentNo)) {
                alert("⚠️ คุณถูกคุณครูนำออกจากห้องแข่งขัน!");
                window.location.href = '../race_home.html';
            }
        });

        channel.subscribe();
    }
}

// 🎨 ปรับเปลี่ยนการทำงานตาม Config
function applyMatchConfig(cfg) {
    if (!cfg) return;

    // อัปเดตโจทย์
    if (cfg.target_code && cfg.target_code.trim()) {
        targetCode = cfg.target_code.trim();
        updateTargetCodeDisplay();
    }

    matchConfig.gold = {
        enabled: cfg.gold_enabled ?? cfg.gold?.enabled ?? true,
        amount: cfg.gold_amount ?? cfg.gold?.amount ?? 3,
        milestone: cfg.gold_milestone ?? cfg.gold?.milestone ?? '10%'
    };

    matchConfig.quiz = {
        enabled: cfg.quiz_enabled ?? cfg.quiz?.enabled ?? false,
        reward_gold: 2
    };

    matchConfig.items = {
        enabled: cfg.shop_enabled ?? cfg.items?.enabled ?? true,
        shield: cfg.item_shield ?? cfg.items?.shield ?? true,
        blind: cfg.item_blind ?? cfg.items?.blind ?? true,
        freeze: cfg.item_freeze ?? cfg.items?.freeze ?? true,
        boost: cfg.item_boost ?? cfg.items?.boost ?? true
    };

    // ปรับการใช้งานร้านค้า
    const shopBtn = document.querySelector('.btn-cyber-shop');
    if (shopBtn) {
        if (!matchConfig.items.enabled) {
            shopBtn.classList.add('disabled');
            shopBtn.setAttribute('disabled', 'true');
        } else {
            shopBtn.classList.remove('disabled');
            shopBtn.removeAttribute('disabled');
        }
    }
}

function handleTypingCheck() {
    if (isQuizActive || isMatchPaused) return;

    const inputArea = document.getElementById('typing-input');
    const userText = inputArea.value;
    const statusText = document.getElementById('error-status-text');
    const progressBar = document.getElementById('progress-bar-fill');

    if (!startTime && userText.length > 0) {
        startTime = new Date();
    }

    localStorage.setItem(`draft_code_${roomCode}_${studentNo}`, userText);

    const charCount = document.getElementById('char-count');
    if (charCount) charCount.innerText = `${userText.length} / ${targetCode.length} CHARS`;

    let wpm = 0;
    let errors = 0;

    if (targetCode.startsWith(userText)) {
        inputArea.classList.remove('is-wrong');
        if (statusText) {
            statusText.className = "status-indicator text-success";
            statusText.innerHTML = `<span class="dot bg-success"></span> พิมพ์ตรงตามต้นแบบ`;
        }

        progressPercent = Math.min(100, Math.floor((userText.length / targetCode.length) * 100));
        const progEl = document.getElementById('progress-percent');
        if (progEl) progEl.innerText = `${progressPercent}%`;
        if (progressBar) progressBar.style.width = `${progressPercent}%`;

        if (startTime && userText.length > 0) {
            const timeDiffSec = (new Date() - startTime) / 1000 / 60;
            wpm = Math.round((userText.length / 5) / (timeDiffSec || 0.01));
            const wpmEl = document.getElementById('wpm-counter');
            if (wpmEl) wpmEl.innerText = wpm;
        }

        // แจก Gold ตามเงื่อนไขปัจจุบัน
        const step = parseInt(String(matchConfig.gold?.milestone || '10').replace('%', '')) || 10;
        const reward = matchConfig.gold?.amount ?? 3;

        const currentMilestone = Math.floor(progressPercent / step);
        if (currentMilestone > lastProgressMilestone) {
            if (matchConfig.gold?.enabled !== false) {
                const earned = (currentMilestone - lastProgressMilestone) * reward;
                currentGold += earned;
                const goldEl = document.getElementById('gold-count');
                if (goldEl) goldEl.innerText = currentGold;
                addCombatLog(`🎉 พิมพ์ถึง ${currentMilestone * step}% ได้รับ +${earned} GOLD!`);
            }
            lastProgressMilestone = currentMilestone;

            // คำถามกวนใจถ้าครูเปิดใช้งาน
            if (matchConfig.quiz?.enabled && [3, 6].includes(currentMilestone)) {
                triggerInterruptionQuiz();
            }
        }

        if (progressPercent === 100) {
            addCombatLog("🏁 เข้าเส้นชัยเรียบร้อยแล้ว! รอดูผลการแข่งบนจอใหญ่");
            localStorage.removeItem(`draft_code_${roomCode}_${studentNo}`);
        }

    } else {
        inputArea.classList.add('is-wrong');
        if (statusText) {
            statusText.className = "status-indicator text-danger";
            statusText.innerHTML = `<span class="dot bg-danger"></span> พิมพ์ผิดตัวอักษร! กรุณาแก้ไข`;
        }
        errors = 1;
    }

    syncTypingData(userText, progressPercent, wpm, errors);
}

// 📡 ซิงก์ข้อมูลการพิมพ์ลง Realtime Broadcast และตาราง lobbies
async function syncTypingData(typedCode, progress, wpm, errors) {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            // 1. ยิง Realtime Broadcast ขึ้นจอ Projector ทันที
            const channel = supabaseClient.channel(`room_typing_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'typing_update',
                payload: {
                    number: String(studentNo),
                    name: studentName,
                    typedCode: typedCode,
                    progress: progress,
                    wpm: wpm,
                    errors: errors
                }
            });

            // 2. อัปเดตข้อมูลผู้เล่นในตาราง lobbies (players JSON array)
            let { data: lobbyData } = await supabaseClient
                .from('lobbies')
                .select('players')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (lobbyData && Array.isArray(lobbyData.players)) {
                let playersList = lobbyData.players;
                let pIdx = playersList.findIndex(p => String(p.number) === String(studentNo) || p.nickname_th === studentName);
                
                if (pIdx !== -1) {
                    playersList[pIdx].progress = progress;
                    playersList[pIdx].code = typedCode;
                    playersList[pIdx].wpm = wpm;
                    playersList[pIdx].errors = errors;

                    await supabaseClient
                        .from('lobbies')
                        .update({ players: playersList })
                        .eq('room_code', roomCode);
                }
            }
        }
    } catch (err) {
        console.warn("Sync typing data error:", err);
    }
}

function triggerInterruptionQuiz() {
    isQuizActive = true;
    const overlay = document.getElementById('quiz-interruption-overlay');
    if (overlay) overlay.classList.remove('d-none');
    addCombatLog("❓ คำถามกวนใจเด้งขัดจังหวะ! ตอบให้ถูกเพื่อลุยต่อ");
}

function submitQuizAnswer(chosenOption) {
    const overlay = document.getElementById('quiz-interruption-overlay');
    const reward = matchConfig.quiz?.reward_gold ?? 2;
    
    if (chosenOption === 3) {
        currentGold += reward;
        const goldEl = document.getElementById('gold-count');
        if (goldEl) goldEl.innerText = currentGold;
        addCombatLog(`✅ ตอบถูกต้อง! ได้รับ +${reward} GOLD รางวัล`);
    } else {
        progressPercent = Math.max(0, progressPercent - 15);
        const newCharLength = Math.floor((targetCode.length * progressPercent) / 100);
        
        const inputArea = document.getElementById('typing-input');
        if (inputArea) {
            inputArea.value = targetCode.substring(0, newCharLength);
            localStorage.setItem(`draft_code_${roomCode}_${studentNo}`, inputArea.value);
        }

        const progEl = document.getElementById('progress-percent');
        const progressBar = document.getElementById('progress-bar-fill');
        if (progEl) progEl.innerText = `${progressPercent}%`;
        if (progressBar) progressBar.style.width = `${progressPercent}%`;

        addCombatLog("💥 ตอบผิด! โดนลงโทษย้อนถอยหลัง -15% (ต้องพิมพ์ใหม่)");
    }

    if (overlay) overlay.classList.add('d-none');
    isQuizActive = false;
}

async function sendEmojiReaction(emoji) {
    const messageText = `😀 ${studentName} ส่ง Reaction ${emoji}`;
    addCombatLog(`😀 คุณส่ง Reaction ${emoji} ขึ้นหน้าจอโปรเจกเตอร์`);

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'emoji_reaction',
                payload: {
                    name: studentName,
                    emoji: emoji,
                    message: messageText
                }
            });
        }
    } catch (e) {}
}

function buyCard(cardType, price) {
    if (matchConfig.items?.enabled === false) {
        alert("❌ ร้านค้าถูกปิดใช้งานโดยคุณครู!");
        return;
    }

    if (currentGold < price) {
        alert("❌ Gold ไม่เพียงพอ!");
        return;
    }

    currentGold -= price;
    const goldEl = document.getElementById('gold-count');
    if (goldEl) goldEl.innerText = currentGold;

    if (cardType === 'boost') {
        progressPercent = Math.min(100, progressPercent + 10);
        const progEl = document.getElementById('progress-percent');
        const progressBar = document.getElementById('progress-bar-fill');
        if (progEl) progEl.innerText = `${progressPercent}%`;
        if (progressBar) progressBar.style.width = `${progressPercent}%`;

        addCombatLog("⚡ NITRO BOOST ทำงาน! ระยะทาง +10%");
        
        const inputArea = document.getElementById('typing-input');
        syncTypingData(inputArea ? inputArea.value : '', progressPercent, 0, 0);
    } else {
        addCombatLog(`🛍️ ซื้อการ์ด ${cardType.toUpperCase()} สำเร็จ!`);
    }
}

function addCombatLog(msg) {
    const box = document.getElementById('combat-log-box');
    if (box) {
        const item = document.createElement('div');
        item.className = 'log-entry';
        item.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString('th-TH')}]</span> ${msg}`;
        box.prepend(item);
    }
}