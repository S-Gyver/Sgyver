let players = [];
let questions = [];
let currentWinner = "";
let currentQuestion = null;
let startAngle = 0;
let userSelectedIdx = null;
let gameStates = {};
let realtimeChannel = null;
let idleAnimationId = null;
let currentUserId = null;

// 🔊 สตรีมไฟล์เสียงออนไลน์
const soundTick = new Audio('https://cdn.freesound.org/previews/240/240776_4107740-lq.mp3');
const soundQuizOpen = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'); 
const soundCorrect = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
const soundWrong = new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3');

soundTick.preload = 'auto';

// 🎚️ ปรับระดับความดังเสียง (Volume Range: 0.0 - 1.0)
soundTick.volume = 1.0;     // 🔊 เร่งเสียงหมุนวงล้อขึ้นสุด (100%)
soundQuizOpen.volume = 0.25; // 🔉 เบาเสียงเปิดโจทย์ลงเหลือ 25%
soundCorrect.volume = 0.3;  // 🔉 เบาเสียงเอฟเฟกต์ตอบถูก/พลุลงเหลือ 30%
soundWrong.volume = 0.3;    // 🔉 เบาเสียงตอบผิดลงเหลือ 30%

function unlockAudioContext() {
    const unlockSignals = ['click', 'touchstart', 'keydown'];
    const doUnlock = () => {
        soundTick.play().then(() => { soundTick.pause(); soundTick.currentTime = 0; }).catch(e => {});
        unlockSignals.forEach(signal => window.removeEventListener(signal, doUnlock));
    };
    unlockSignals.forEach(signal => window.addEventListener(signal, doUnlock));
}
unlockAudioContext();

// 🔊 ฟังก์ชันเล่นเสียง Tick หมุนวงล้อ
function playTickSound() {
    try {
        soundTick.currentTime = 0;
        soundTick.volume = 1.0; // การันตีความดังเสียงหมุน 100%
        soundTick.play().catch(e => {});
    } catch (e) {}
}

function unlockAudioContext() {
    const unlockSignals = ['click', 'touchstart', 'keydown'];
    const doUnlock = () => {
        initAudioFilter();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        soundTick.play().then(() => { soundTick.pause(); soundTick.currentTime = 0; }).catch(e => { });
        unlockSignals.forEach(signal => window.removeEventListener(signal, doUnlock));
    };
    unlockSignals.forEach(signal => window.addEventListener(signal, doUnlock));
}
unlockAudioContext();

// 🔊 ฟังก์ชันเล่นเสียง Tick หมุนวงล้อ
function playTickSound() {
    try {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        soundTick.currentTime = 0;
        soundTick.play().catch(e => { });
    } catch (e) { }
}

function unlockAudioContext() {
    const unlockSignals = ['click', 'touchstart', 'keydown'];
    const doUnlock = () => {
        soundTick.play().then(() => { soundTick.pause(); soundTick.currentTime = 0; }).catch(e => { });
        unlockSignals.forEach(signal => window.removeEventListener(signal, doUnlock));
    };
    unlockSignals.forEach(signal => window.addEventListener(signal, doUnlock));
}
unlockAudioContext();

const mockingEmojis = ["🤣", "🤪", "🤫", "😝", "🤡", "💩", "😎", "🤷‍♂️", "👑", "🥱", "😏"];
const phrasesRank1 = ["แน่จริงก็ทำแต้มให้ชนะสิ!", "หนาวจังเลยบนนี้ 👑", "ตามมาให้ทันนะน้องๆ", "อันดับหนึ่งมันนอนมาว่ะ", "มองลงไปไม่เจอใครเลย 🥱"];
const phrasesRank2 = ["เกือบได้ที่ 1 ละตัวเรา", "แค้นนี้ต้องชำระ!", "จี้ตูดอยู่นนะบอกเลย", "อ่อนหัดไปนะที่ 3", "แต้มเดียวก็เสียวได้ 😏"];
const phrasesRank3 = ["ดีกว่าไม่มีชื่อขึ้นบอร์ด", "ตามมาห่างๆ อย่างห่วงๆ", "ที่ 3 ก็เสียวได้นะ", "ขึ้นแท่นแล้วโว้ยยย", "ลุยโว้ยย ขยับอีกนิด!"];

const winEmojis = ["🥳", "🎉", "👑", "🚀", "🔥", "🧠", "😎"];
const winPhrases = ["อัจฉริยะขืนคืน!", "ตอบถูกเฉย ยอมใจว่ะ", "ตึงจัดครับจารย์!", "เทพเจ้าคำถามถูกต้อง", "เอาไปเลย 1 แต้มเน้นๆ"];
const loseEmojis = ["🤣", "🤡", "😜", "🤫", "💩", "🤦‍♂️", "🤷‍♂️"];
const losePhrases = ["อ่อนหัดไปนะน้องชาย", "ดวงดีแต่ไร้สมอง 🤪", "ตอบอะไรเนี่ยยยย!", "เข้าคลังคำถามด่วนเลย", "มั่วจัด มั่วจนต้องร้องขอชีวิต"];

const canvas = document.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const canvasLarge = document.getElementById('canvas-large');
const ctxLarge = canvasLarge ? canvasLarge.getContext('2d') : null;

let wheelModal = null;
let winnerModal = null;

const wheelModalEl = document.getElementById('wheelModal');
if (wheelModalEl) wheelModal = new bootstrap.Modal(wheelModalEl);

const winnerModalEl = document.getElementById('winnerModal');
if (winnerModalEl) winnerModal = new bootstrap.Modal(winnerModalEl);

let animationFrameId = null;

function formatQuestionText(rawText) {
    if (!rawText) return "";
    if (rawText.includes('\n')) {
        const lines = rawText.split('\n');
        return `<div class="quiz-question-wrapper"><div class="text-dark fw-bold mb-3">${lines[0]}</div><div class="p-3 rounded-3 border bg-light shadow-sm text-start" style="font-family: 'Courier New', monospace; font-size: 1.25rem;"><pre class="m-0 text-dark fw-bold" style="white-space: pre-wrap; font-family: inherit;">${lines.slice(1).join('\n')}</pre></div></div>`;
    }
    return rawText;
}

function formatChoiceText(choiceText, label) {
    if (!choiceText) return "";
    return choiceText.includes('\n') ? `<div class="text-start w-100"><div class="mb-2 text-primary fw-bold">${label}</div><div class="p-3 rounded-3 border bg-white shadow-sm text-start w-100" style="font-family: 'Courier New', monospace; font-size: 1.15rem; color: #24292e;"><pre class="m-0 fw-bold" style="white-space: pre-wrap; font-family: inherit; color: inherit;">${choiceText}</pre></div></div>` : `${label} ${choiceText}`;
}

function triggerFireworks() {
    if (typeof confetti !== 'undefined') {
        const count = 200;
        const fire = (ratio, opts) => confetti(Object.assign({}, { origin: { y: 0.6 } }, opts, { particleCount: Math.floor(count * ratio) }));
        fire(0.25, { spread: 26, startVelocity: 55 }); fire(0.2, { spread: 60 }); fire(0.35, { spread: 100, decay: 0.91 }); fire(0.1, { spread: 120, startVelocity: 25 });
    }
}

async function getCurrentUser() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session && session.user) {
        currentUserId = session.user.id;
    }
    return currentUserId;
}

async function initData() {
    await getCurrentUser();
    if (!currentUserId) return;

    const { data: statesData } = await window.supabaseClient
        .from('game_state')
        .select('*')
        .eq('user_id', currentUserId);

    gameStates = {};
    if (statesData) statesData.forEach(s => { gameStates[s.key] = s.value; });

    const currentClassKey = gameStates['current_class_key'] || "";
    const currentQuizSubjectKey = gameStates['current_quiz_subject_key'] || "";

    if (currentClassKey) {
        const { data: cData } = await window.supabaseClient
            .from('class_rooms')
            .select('players')
            .eq('class_key', currentClassKey)
            .eq('user_id', currentUserId)
            .maybeSingle();
        players = cData ? cData.players : [];
    }
    if (currentQuizSubjectKey) {
        const { data: sData } = await window.supabaseClient
            .from('quiz_subjects')
            .select('questions')
            .eq('subject_key', currentQuizSubjectKey)
            .eq('user_id', currentUserId)
            .maybeSingle();
        questions = sData ? sData.questions : [];
    }

    updateSessionBadges(currentClassKey, currentQuizSubjectKey);
    drawAllWheels();
    updateLeaderboard();
    startIdleSpinning();
}

function updateSessionBadges(cls, sub) {
    const classEl = document.getElementById('current-game-class');
    const subjectEl = document.getElementById('current-game-subject');
    if (classEl) classEl.innerHTML = `<i class="bi bi-door-open-fill me-1"></i> ห้องเรียน: ${cls || '-'}`;
    if (subjectEl) subjectEl.innerHTML = `<i class="bi bi-book-half me-1"></i> วิชา: ${sub || '-'}`;
}

async function updateCloudState(key, value) {
    if (!currentUserId) await getCurrentUser();
    gameStates[key] = value;
    await window.supabaseClient
        .from('game_state')
        .upsert({
            key: key,
            value: String(value),
            user_id: currentUserId,
            updated_at: new Date()
        }, { onConflict: 'key,user_id' });
}

async function selectRandomQuestion() {
    if (questions.length > 0) {
        const rawQuestion = questions[Math.floor(Math.random() * questions.length)];
        const mappedChoices = rawQuestion.choices.map((choice, index) => ({ text: choice, isCorrect: index === rawQuestion.correct }));

        for (let i = mappedChoices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mappedChoices[i], mappedChoices[j]] = [mappedChoices[j], mappedChoices[i]];
        }

        currentQuestion = { q: rawQuestion.q, choices: mappedChoices.map(c => c.text), correct: mappedChoices.findIndex(c => c.isCorrect) };
        await updateCloudState('current_active_quiz', JSON.stringify(currentQuestion));
    }
}

async function renderActiveQuizUI() {
    if (!currentQuestion && currentUserId) {
        const { data: activeQuizState } = await window.supabaseClient
            .from('game_state')
            .select('*')
            .eq('key', 'current_active_quiz')
            .eq('user_id', currentUserId)
            .maybeSingle();
        if (activeQuizState && activeQuizState.value && activeQuizState.value !== 'null') {
            currentQuestion = JSON.parse(activeQuizState.value);
        }
    }

    if (!currentQuestion) return;

    soundQuizOpen.currentTime = 0;
    soundQuizOpen.play().catch(e => { });

    updateCloudState('current_step', 'quiz_visible');
    document.getElementById('show-quiz-btn')?.classList.add('d-none');
    document.getElementById('quiz-content')?.classList.remove('d-none');
    document.getElementById('question-text').innerHTML = formatQuestionText(currentQuestion.q);

    const container = document.getElementById('options-container');
    if (container) {
        container.innerHTML = "";
        currentQuestion.choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.id = `user-choice-btn-${index}`;
            btn.className = "btn btn-outline-primary text-start p-3 fw-bold fs-4 d-flex align-items-center";
            btn.innerHTML = formatChoiceText(choice, ["A.", "B.", "C.", "D."][index]);
            btn.onclick = () => selectChoice(index);
            container.appendChild(btn);
        });
    }
    document.getElementById('user-confirm-btn')?.classList.remove('d-none');
}

async function selectChoice(index) {
    if (gameStates['quiz_submitted'] === 'true') return;
    userSelectedIdx = index;
    await updateCloudState('selected_choice_idx', index);
    highlightSelection(index);
    if (realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'admin_sync_choice', payload: { index: index } });
}

function highlightSelection(selectedIndex) {
    const container = document.getElementById('options-container');
    if (!container) return;
    for (let i = 0; i < container.children.length; i++) {
        container.children[i].className = (i === selectedIndex) ? "btn btn-primary text-start p-3 fw-bold fs-4 text-white shadow d-flex align-items-center" : "btn btn-outline-primary text-start p-3 fw-bold fs-4 d-flex align-items-center";
    }
}

async function submitUserAnswer() {
    if (userSelectedIdx === null) return alert('กรุณาเลือกคำตอบก่อนครับ!');
    await updateCloudState('quiz_submitted', 'true');
    await updateCloudState('current_step', 'answered');

    document.getElementById('user-confirm-btn')?.classList.add('d-none');
    document.getElementById('skip-zone')?.classList.add('d-none');

    const options = document.getElementById('options-container')?.children;
    if (options) {
        for (let btn of options) btn.disabled = true;
        const emojiZone = document.getElementById('modal-winner-emoji-zone');

        if (userSelectedIdx === currentQuestion.correct) {
            soundCorrect.currentTime = 0;
            soundCorrect.play().catch(e => { });

            if (options[userSelectedIdx]) options[userSelectedIdx].className = "btn btn-success text-start p-3 fw-bold fs-4 text-white shadow d-flex align-items-center";
            players = players.map(p => (p.nickname_th || p.name) === currentWinner ? { ...p, score: (p.score || 0) + 1 } : p);
            triggerFireworks();
            if (emojiZone) emojiZone.innerHTML = `<div style="font-size: 5rem; animation: pulse 0.5s infinite alternate;">${winEmojis[Math.floor(Math.random() * winEmojis.length)]}</div><div class="fw-bold text-success text-center mt-2 fs-3">${winPhrases[Math.floor(Math.random() * winPhrases.length)]}</div>`;
        } else {
            soundWrong.currentTime = 0;
            soundWrong.play().catch(e => { });

            if (options[userSelectedIdx]) options[userSelectedIdx].className = "btn btn-danger text-start p-3 fw-bold fs-4 text-white shadow d-flex align-items-center";
            if (options[currentQuestion.correct]) options[currentQuestion.correct].className = "btn btn-success text-start p-3 fw-bold fs-4 text-white shadow d-flex align-items-center";
            if (emojiZone) emojiZone.innerHTML = `<div style="font-size: 5rem; animation: shakeEmoji 0.3s infinite alternate;">${loseEmojis[Math.floor(Math.random() * loseEmojis.length)]}</div><div class="fw-bold text-danger text-center mt-2 fs-3">${losePhrases[Math.floor(Math.random() * losePhrases.length)]}</div>`;
        }
    }

    const currentClassKey = gameStates['current_class_key'];
    if (currentClassKey && currentUserId) {
        await window.supabaseClient.from('class_rooms').update({ players: players }).eq('class_key', currentClassKey).eq('user_id', currentUserId);
    }

    updateLeaderboard();
    document.getElementById('post-spin-actions')?.classList.remove('d-none');
    if (realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'student_answered' });
}

async function clearLiveStorage() {
    await updateCloudState('current_winner_name', '');
    await updateCloudState('current_active_quiz', 'null');
    await updateCloudState('selected_choice_idx', 'null');
    await updateCloudState('quiz_submitted', 'false');
    await updateCloudState('current_step', 'ready');
    userSelectedIdx = null;
    currentQuestion = null;
}

async function closeWithoutAction() {
    if (currentWinner && currentUserId) {
        players = players.map(p => (p.nickname_th || p.name) === currentWinner ? { ...p, spunCount: Math.max(0, (p.spunCount || 1) - 1) } : p);
        const currentClassKey = gameStates['current_class_key'];
        await window.supabaseClient.from('class_rooms').update({ players: players }).eq('class_key', currentClassKey).eq('user_id', currentUserId);
    }
    await clearLiveStorage();
    if (winnerModal) winnerModal.hide();
    resetTurn();
    startIdleSpinning();
}

function resetTurn() { if (animationFrameId) cancelAnimationFrame(animationFrameId); initData(); }

function initSupabaseRealtime() {
    realtimeChannel = window.supabaseClient.channel('game_broadcast_room');

    realtimeChannel
        .on('broadcast', { event: 'spin' }, (payload) => {
            selectRandomQuestion();
            const targetWinner = payload?.payload?.targetWinner || "";
            startCloudWheelSpin(targetWinner);
        })
        .on('broadcast', { event: 'quiz' }, async () => {
            if (currentUserId) {
                const { data: activeQuizState } = await window.supabaseClient
                    .from('game_state')
                    .select('*')
                    .eq('key', 'current_active_quiz')
                    .eq('user_id', currentUserId)
                    .maybeSingle();
                if (activeQuizState && activeQuizState.value && activeQuizState.value !== 'null') {
                    currentQuestion = JSON.parse(activeQuizState.value);
                }
            }
            if (currentQuestion) renderActiveQuizUI();
        })
        .on('broadcast', { event: 'select_choice' }, (payload) => {
            userSelectedIdx = payload.index;
            highlightSelection(payload.index);
        })
        .on('broadcast', { event: 'confirm' }, () => { submitUserAnswer(); })
        .on('broadcast', { event: 'skip' }, () => { closeWithoutAction(); })
        .on('broadcast', { event: 'reset' }, () => { closeWithoutAction(); })
        .on('broadcast', { event: 'class_changed' }, () => { resetTurn(); })
        .on('broadcast', { event: 'subject_changed' }, () => { resetTurn(); })
        .subscribe();
}

function startIdleSpinning() {
    if (players.length === 0) return;
    function loop() {
        startAngle += 0.003;
        drawAllWheels();
        idleAnimationId = requestAnimationFrame(loop);
    }
    if (!idleAnimationId) idleAnimationId = requestAnimationFrame(loop);
}

function stopIdleSpinning() {
    if (idleAnimationId) {
        cancelAnimationFrame(idleAnimationId);
        idleAnimationId = null;
    }
}

document.getElementById('spin-btn')?.addEventListener('click', () => { realtimeChannel.send({ type: 'broadcast', event: 'spin' }); startCloudWheelSpin(); });
document.getElementById('show-quiz-btn')?.addEventListener('click', () => { realtimeChannel.send({ type: 'broadcast', event: 'quiz' }); renderActiveQuizUI(); });
document.getElementById('keep-name-btn')?.addEventListener('click', async () => { await clearLiveStorage(); if (winnerModal) winnerModal.hide(); resetTurn(); });

function drawAllWheels() {
    if (players.length > 0) {
        if (canvas && ctx) renderSingleWheel(canvas, ctx, 14, 25);
        if (canvasLarge && ctxLarge) renderSingleWheel(canvasLarge, ctxLarge, 20, 45);
        updatePointerColors();
    }
}

function renderSingleWheel(tc, tx, fs, to) {
    const sz = tc.width, cx = sz / 2, r = cx - 10, arc = Math.PI * 2 / players.length;
    tx.clearRect(0, 0, sz, sz);
    players.forEach((p, i) => {
        const a = startAngle + i * arc;
        tx.save();
        tx.beginPath();
        tx.moveTo(cx, cx);
        tx.arc(cx, cx, r, a, a + arc);
        const g = tx.createRadialGradient(cx, cx, 10, cx, cx, r);
        const hue = (i * 360 / players.length);
        g.addColorStop(0, '#1a1c29');
        g.addColorStop(0.6, `hsl(${hue},85%,50%)`);
        g.addColorStop(1, `hsl(${hue},90%,35%)`);
        tx.fillStyle = g;
        tx.fill();
        tx.restore();

        tx.save();
        tx.fillStyle = '#fff';
        tx.font = `bold ${fs}px sans-serif`;
        tx.translate(cx, cx);
        tx.rotate(a + arc / 2);
        tx.textAlign = 'right';
        tx.fillText(p.nickname_th || p.name, cx - to, fs / 3);
        tx.restore();
    });
}

function updatePointerColors() {
    if (players.length === 0) return;
    const arc = Math.PI * 2 / players.length;
    const cIdx = Math.floor((Math.PI * 1.5 - ((startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / arc) % players.length;
    const targetColor = `hsl(${(cIdx * 360 / players.length)},75%,60%)`;
    const pointerSmall = document.getElementById('pointer');
    if (pointerSmall) pointerSmall.style.setProperty('--pointer-color', targetColor);
    const pointerLarge = document.getElementById('pointer-large');
    if (pointerLarge) pointerLarge.style.setProperty('--pointer-color', targetColor);
}

function updateLeaderboard() {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    updatePodiumDisplay(sorted);
    const leaderboardBody = document.getElementById('leaderboard-body');
    if (leaderboardBody) {
        leaderboardBody.innerHTML = sorted.map((p, idx) => `
            <tr>
                <td class="fw-bold text-center">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                <td>${p.image || p.avatar ? `<img src="${p.image || p.avatar}" class="table-avatar">` : '<div class="table-avatar"><i class="bi bi-person"></i></div>'}<strong>${p.nickname_th || p.name}</strong></td>
                <td class="text-center">${p.spunCount || 0} ครั้ง</td>
                <td class="text-center fw-bold text-success">${p.score || 0}</td>
            </tr>`).join('');
    }
}

function updatePodiumDisplay(sorted) {
    for (let i = 1; i <= 3; i++) {
        const p = sorted[i - 1];
        const av = document.getElementById(`p${i}-avatar`);
        const nm = document.getElementById(`p${i}-name`);
        const bb = document.getElementById(`p${i}-bubble`);
        if (p && (p.score || 0) > 0) {
            if (nm) nm.innerText = p.nickname_th || p.name;
            if (bb) bb.setAttribute('data-active', 'true');
            if (av) av.innerHTML = p.image || p.avatar ? `<img src="${p.image || p.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:9px;">` : `<i class="bi bi-person-fill text-secondary"></i>`;
        } else {
            if (nm) nm.innerText = "-";
            if (bb) { bb.setAttribute('data-active', 'false'); bb.classList.remove('show-active'); }
            if (av) av.innerHTML = `<i class="bi bi-person-fill text-muted"></i>`;
        }
    }
}

window.onload = async () => {
    await initData();
    initSupabaseRealtime();
};

// 🎯 ฟังก์ชันสั่งหมุนวงล้อ ฟิสิกส์สมูทระดับ Wheel of Names
function startCloudWheelSpin(targetWinnerName) {
    if (players.length === 0) return;

    stopIdleSpinning();
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) spinBtn.disabled = true;
    ['quiz-content', 'post-spin-actions'].forEach(id => document.getElementById(id)?.classList.add('d-none'));
    document.getElementById('show-quiz-btn')?.classList.remove('d-none');
    document.getElementById('skip-zone')?.classList.remove('d-none');

    if (wheelModal) wheelModal.show();

    // 🎯 1. เช็กการสั่งล็อกเป้า
    const isRigged = Boolean(targetWinnerName && targetWinnerName.trim() !== "");
    let targetIndex = -1;

    if (isRigged) {
        targetIndex = players.findIndex(p => (p.nickname_th || p.name) === targetWinnerName || p.name === targetWinnerName);
    }

    if (targetIndex === -1) {
        targetIndex = Math.floor(Math.random() * players.length);
    }

    const targetPlayer = players[targetIndex];
    currentWinner = targetPlayer.nickname_th || targetPlayer.name;

    const arc = (Math.PI * 2) / players.length;

    // 🎯 2. คำนวณองศาสุดท้ายให้เข็มด้านบน (1.5 * PI) ชี้กึ่งกลางช่อง targetIndex พอดี
    const centerArc = targetIndex * arc + (arc / 2);
    let targetAngle = (Math.PI * 1.5) - centerArc;

    targetAngle = (targetAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);

    const baseAngle = startAngle % (Math.PI * 2);
    let deltaAngle = targetAngle - baseAngle;
    if (deltaAngle < 0) {
        deltaAngle += Math.PI * 2;
    }

    // หมุนปกติ 14 รอบ / ถ้าล็อกเป้าหมุน 8 รอบ
    const rounds = isRigged ? 8 : 14;
    const totalRotation = (Math.PI * 2 * rounds) + deltaAngle;
    const initialStartAngle = startAngle;

    let startTime = null;
    // ⏳ เวลาหมุนปกติปรับเพิ่มเป็น 10.5 วินาที เพื่อให้ช่วงชะลอเอื่อยๆ ยาวนาน สมูทสะใจ
    const duration = isRigged ? 6500 : 10500;
    let lastPlayerIndex = -1;

    function animateWheel(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        let easedProgress = 0;

        if (isRigged) {
            // 🏎️ [กรณีสั่งล็อกเป้า] หมุนเอื่อยๆ -> พุ่งกระชากจี๊ด -> เบรกชะงักกึกที่เป้าหมาย
            if (progress < 0.7) {
                easedProgress = Math.pow(progress / 0.7, 2) * 0.5;
            } else if (progress < 0.9) {
                const p2 = (progress - 0.7) / 0.2;
                easedProgress = 0.5 + (p2 * 0.45);
            } else {
                const p3 = (progress - 0.9) / 0.1;
                easedProgress = 0.95 + (Math.sin(p3 * Math.PI / 2) * 0.05);
            }
        } else {
            // 🌸 [กรณีสุ่มปกติ] สมการ Deceleration แบบ Wheel of Names (ค่อยๆ ชะลอความเร็วช่วงปลายยาวสมูท)
            easedProgress = 1 - Math.pow(1 - progress, 3.8);
        }

        startAngle = initialStartAngle + (easedProgress * totalRotation);
        drawAllWheels();

        // เสียง Tick รัวสมูท + ลูกศรเด้งเวลาข้ามช่อง
        const checkIndex = Math.floor(((Math.PI * 1.5 - ((startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / arc) % players.length;

        if (checkIndex !== lastPlayerIndex && progress < 0.99) {
            lastPlayerIndex = checkIndex;
            playTickSound(); // สั่งเล่นเสียงแบบ cloneNode เนียนไม่โดนกระตุก

            // สั่งกระตุกเข็มลูกศรเด้ง
            const pointerEl = document.getElementById('pointer-large') || document.getElementById('pointer');
            if (pointerEl) {
                pointerEl.classList.remove('tick-bounce');
                void pointerEl.offsetWidth; // Reflow
                pointerEl.classList.add('tick-bounce');
            }
        }

        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animateWheel);
        } else {
            startAngle = initialStartAngle + totalRotation;
            drawAllWheels();

            players = players.map((p, idx) => idx === targetIndex ? { ...p, spunCount: (p.spunCount || 0) + 1 } : p);

            setTimeout(async () => {
                if (wheelModal) wheelModal.hide();

                const imgZone = document.getElementById('modal-winner-img-zone');
                if (imgZone) {
                    imgZone.innerHTML = targetPlayer.image || targetPlayer.avatar
                        ? `<img src="${targetPlayer.image || targetPlayer.avatar}" class="rounded-circle shadow" style="width:160px; height:160px; object-fit:cover; border:5px solid #fff;">`
                        : `<div class="bg-secondary text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow" style="width:160px; height:160px; font-size:4.5rem;"><i class="bi bi-person-fill"></i></div>`;
                }

                const winnerNameEl = document.getElementById('modal-winner-name');
                if (winnerNameEl) winnerNameEl.innerText = currentWinner;

                const winnerEmojiEl = document.getElementById('modal-winner-emoji-zone');
                if (winnerEmojiEl) {
                    winnerEmojiEl.innerHTML = `<div class="emoji-thinking" style="font-size: 4.5rem;">🤔💭</div><div class="fw-bold text-primary text-center mt-2 fs-4 animate-pulse">กำลังคิดหาคำตอบ...</div>`;
                }

                const currentClassKey = gameStates['current_class_key'];
                if (currentClassKey && currentUserId) {
                    await window.supabaseClient
                        .from('class_rooms')
                        .update({ players: players })
                        .eq('class_key', currentClassKey)
                        .eq('user_id', currentUserId);
                }

                await updateCloudState('current_winner_name', currentWinner);
                await updateCloudState('current_step', 'winner_selected');

                if (winnerModal) winnerModal.show();
                triggerFireworks();

                soundCorrect.currentTime = 0;
                soundCorrect.play().catch(e => { });

                if (spinBtn) spinBtn.disabled = false;
            }, 500);
        }
    }
    animationFrameId = requestAnimationFrame(animateWheel);
}