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

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('room') || 'RACE88';

    const savedData = localStorage.getItem('gyver_race_student_profile');
    if (savedData) {
        try {
            const profile = JSON.parse(savedData);
            studentName = profile.nicknameTh || urlParams.get('name') || 'เอสS';
            studentNo = parseInt(profile.studentNumber || urlParams.get('no') || 10);
            classKey = profile.studentClass ? profile.studentClass.replace('ม.', '').trim() : '5/10';
            
            if (profile.avatarUrl) {
                const avatarImg = document.getElementById('my-avatar');
                if (avatarImg) avatarImg.src = profile.avatarUrl;
            }
        } catch (e) {
            studentName = urlParams.get('name') || 'เอสS';
            studentNo = parseInt(urlParams.get('no') || 10);
        }
    }

    const nameEl = document.getElementById('my-name');
    if (nameEl) nameEl.innerText = studentName;

    const inputArea = document.getElementById('typing-input');
    const targetDisplay = document.getElementById('target-code-display');

    if (targetDisplay) {
        targetDisplay.innerText = targetCode;
        document.getElementById('char-count').innerText = `0 / ${targetCode.length} CHARS`;

        targetDisplay.addEventListener('dragstart', (e) => e.preventDefault());
        targetDisplay.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    if (inputArea) {
        // 💾 ดึงโค้ดที่เคยพิมพ์ค้างไว้กลับมาหากกดรีเฟรชหน้าเว็บ
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

        // ตรวจสอบเช็กคำทันทีถ้ารีเฟรชกลับมาแล้วมีโค้ดค้างอยู่
        if (inputArea.value.length > 0) {
            handleTypingCheck();
        }
    }

    fetchMatchConfig();
});

async function fetchMatchConfig() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data } = await supabaseClient
                .from('lobbies')
                .select('match_config')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (data && data.match_config && data.match_config.target_code) {
                targetCode = data.match_config.target_code;
                const targetDisplay = document.getElementById('target-code-display');
                if (targetDisplay) {
                    targetDisplay.innerText = targetCode;
                    document.getElementById('char-count').innerText = `0 / ${targetCode.length} CHARS`;
                }
            }
        }
    } catch (e) {}
}

function handleTypingCheck() {
    if (isQuizActive) return;

    const inputArea = document.getElementById('typing-input');
    const userText = inputArea.value;
    const statusText = document.getElementById('error-status-text');
    const progressBar = document.getElementById('progress-bar-fill');

    if (!startTime && userText.length > 0) {
        startTime = new Date();
    }

    // 💾 บันทึก Draft ลง LocalStorage ป้องกันหายเมื่อรีเฟรช
    localStorage.setItem(`draft_code_${roomCode}_${studentNo}`, userText);

    document.getElementById('char-count').innerText = `${userText.length} / ${targetCode.length} CHARS`;

    let wpm = 0;
    let errors = 0;

    if (targetCode.startsWith(userText)) {
        inputArea.classList.remove('is-wrong');
        statusText.className = "status-indicator text-success";
        statusText.innerHTML = `<span class="dot bg-success"></span> พิมพ์ตรงตามต้นแบบ`;

        progressPercent = Math.min(100, Math.floor((userText.length / targetCode.length) * 100));
        document.getElementById('progress-percent').innerText = `${progressPercent}%`;
        if (progressBar) progressBar.style.width = `${progressPercent}%`;

        if (startTime && userText.length > 0) {
            const timeDiffSec = (new Date() - startTime) / 1000 / 60;
            wpm = Math.round((userText.length / 5) / (timeDiffSec || 0.01));
            document.getElementById('wpm-counter').innerText = wpm;
        }

        const currentMilestone = Math.floor(progressPercent / 10);
        if (currentMilestone > lastProgressMilestone) {
            const earned = (currentMilestone - lastProgressMilestone) * 3;
            currentGold += earned;
            lastProgressMilestone = currentMilestone;
            document.getElementById('gold-count').innerText = currentGold;
            addCombatLog(`🎉 พิมพ์ถึง ${currentMilestone * 10}% ได้รับ +${earned} GOLD!`);

            if ([3, 6].includes(currentMilestone)) {
                triggerInterruptionQuiz();
            }
        }

        if (progressPercent === 100) {
            addCombatLog("🏁 เข้าเส้นชัยเรียบร้อยแล้ว!");
            // เคลียร์ Draft เมื่อแข่งเสร็จ
            localStorage.removeItem(`draft_code_${roomCode}_${studentNo}`);
        }

    } else {
        inputArea.classList.add('is-wrong');
        statusText.className = "status-indicator text-danger";
        statusText.innerHTML = `<span class="dot bg-danger"></span> พิมพ์ผิดตัวอักษร! กรุณาแก้ไข`;
        errors = 1;
    }

    syncTypingData(userText, progressPercent, wpm, errors);
}

async function syncTypingData(typedCode, progress, wpm, errors) {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            
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

            let { data: classData } = await supabaseClient
                .from('class_rooms')
                .select('players')
                .eq('class_key', classKey)
                .maybeSingle();

            if (classData && Array.isArray(classData.players)) {
                let playersList = classData.players;
                let pIdx = playersList.findIndex(p => String(p.number) === String(studentNo) || p.nickname_th === studentName);
                
                if (pIdx !== -1) {
                    playersList[pIdx].progress = progress;
                    playersList[pIdx].code = typedCode;
                    playersList[pIdx].wpm = wpm;
                    playersList[pIdx].errors = errors;

                    await supabaseClient
                        .from('class_rooms')
                        .update({ players: playersList })
                        .eq('class_key', classKey);
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
    
    if (chosenOption === 3) {
        currentGold += 2;
        document.getElementById('gold-count').innerText = currentGold;
        addCombatLog("✅ ตอบถูกต้อง! ได้รับ +2 GOLD รางวัล");
    } else {
        progressPercent = Math.max(0, progressPercent - 15);
        const newCharLength = Math.floor((targetCode.length * progressPercent) / 100);
        
        const inputArea = document.getElementById('typing-input');
        if (inputArea) {
            inputArea.value = targetCode.substring(0, newCharLength);
            localStorage.setItem(`draft_code_${roomCode}_${studentNo}`, inputArea.value);
        }

        document.getElementById('progress-percent').innerText = `${progressPercent}%`;
        document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;

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
    if (currentGold < price) {
        alert("❌ Gold ไม่เพียงพอ!");
        return;
    }

    currentGold -= price;
    document.getElementById('gold-count').innerText = currentGold;

    if (cardType === 'boost') {
        progressPercent = Math.min(100, progressPercent + 10);
        document.getElementById('progress-percent').innerText = `${progressPercent}%`;
        document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;
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