// 🛠️ ใช้งานร่วมกับตัวแปร SUPABASE_URL และ SUPABASE_KEY บนหัว HTML ของคุณ
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let players = [];
let questions = [];
let currentWinner = "";
let currentQuestion = null;
let startAngle = 0; 
let userSelectedIdx = null;
let gameStates = {};
let realtimeChannel = null;
let idleAnimationId = null;

const mockingEmojis = ["🤣", "🤪", "🤫", "😝", "🤡", "💩", "😎", "🤷‍♂️", "👑", "🥱", "😏"];
const phrasesRank1 = ["แน่จริงก็ทำแต้มให้ชนะสิ!", "หนาวจังเลยบนนี้ 👑", "ตามมาให้ทันนะน้องๆ", "อันดับหนึ่งมันนอนมาว่ะ", "มองลงไปไม่เจอใครเลย 🥱"];
const phrasesRank2 = ["เกือบได้ที่ 1 ละตัวเรา", "แค้นนี้ต้องชำระ!", "จี้ตูดอยู่นนะบอกเลย", "อ่อนหัดไปนะที่ 3", "แต้มเดียวก็เสียวได้ 😏"];
const phrasesRank3 = ["ดีกว่าไม่มีชื่อขึ้นบอร์ด", "ตามมาห่างๆ อย่างห่วงๆ", "ที่ 3 ก็เสียวได้นะ", "ขึ้นแท่นแล้วโว้ยยย", "ลุยโว้ยย ขยับอีกนิด!"];

const winEmojis = ["🥳", "🎉", "👑", "🚀", "🔥", "🧠", "😎"];
const winPhrases = ["อัจฉริยะขืนคืน!", "ตอบถูกเฉย ยอมใจว่ะ", "ตึงจัดครับจารย์!", "เทพเจ้าคำถามถูกต้อง", "เอาไปเลย 1 แต้มเน้นๆ"];
const loseEmojis = ["🤣", "🤡", "😜", "🤫", "💩", "🤦‍♂️", "🤷‍♂️"];
const losePhrases = ["อ่อนหัดไปนะน้องชาย", "ดวงดีแต่ไร้สมอง 🤪", "ตอบอะไรเนี่ยยยย!", "เข้าคลังคำถามด่วนเลย", "มั่วจัด มั่วจนต้องร้องขอชีวิต"];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const canvasLarge = document.getElementById('canvas-large');
const ctxLarge = canvasLarge.getContext('2d');

const wheelModal = new bootstrap.Modal(document.getElementById('wheelModal'));
const winnerModal = new bootstrap.Modal(document.getElementById('winnerModal'));
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
    const count = 200;
    const fire = (ratio, opts) => confetti(Object.assign({}, { origin: { y: 0.6 } }, opts, { particleCount: Math.floor(count * ratio) }));
    fire(0.25, { spread: 26, startVelocity: 55 }); fire(0.2, { spread: 60 }); fire(0.35, { spread: 100, decay: 0.91 }); fire(0.1, { spread: 120, startVelocity: 25 });
}

async function initData() {
    const { data: statesData } = await supabaseClient.from('game_state').select('*');
    gameStates = {};
    if (statesData) statesData.forEach(s => { gameStates[s.key] = s.value; });

    const currentClassKey = gameStates['current_class_key'] || "";
    const currentQuizSubjectKey = gameStates['current_quiz_subject_key'] || "";

    if (currentClassKey) {
        const { data: cData } = await supabaseClient.from('class_rooms').select('players').eq('class_key', currentClassKey).single();
        players = cData ? cData.players : [];
    }
    if (currentQuizSubjectKey) {
        const { data: sData } = await supabaseClient.from('quiz_subjects').select('questions').eq('subject_key', currentQuizSubjectKey).single();
        questions = sData ? sData.questions : [];
    }

    updateSessionBadges(currentClassKey, currentQuizSubjectKey);
    drawAllWheels();
    updateLeaderboard();
    startIdleSpinning();

    const syncChoice = (gameStates['selected_choice_idx'] && gameStates['selected_choice_idx'] !== 'null') ? parseInt(gameStates['selected_choice_idx']) : null;
    if (syncChoice !== null && gameStates['quiz_submitted'] !== 'true') {
        userSelectedIdx = syncChoice;
        highlightSelection(syncChoice);
    }
}

function updateSessionBadges(cls, sub) {
    const classEl = document.getElementById('current-game-class');
    const subjectEl = document.getElementById('current-game-subject');
    if(classEl) classEl.innerHTML = `<i class="bi bi-door-open-fill me-1"></i> ห้องเรียน: ${cls || '-'}`;
    if(subjectEl) subjectEl.innerHTML = `<i class="bi bi-book-half me-1"></i> วิชา: ${sub || '-'}`;
}

function startMockingRoutine(rankNum, phraseList) {
    function showBubble() {
        const bubble = document.getElementById(`p${rankNum}-bubble`);
        const hasPlayer = bubble && bubble.getAttribute('data-active') === 'true';

        if (bubble && hasPlayer) {
            bubble.innerHTML = `<span class="bubble-emoji">${mockingEmojis[Math.floor(Math.random() * mockingEmojis.length)]}</span> ${phraseList[Math.floor(Math.random() * phraseList.length)]}`;
            bubble.classList.add('show-active'); 
            
            setTimeout(() => {
                bubble.classList.remove('show-active');
                const nextRandomDelay = Math.floor(Math.random() * 25001) + 5000;
                setTimeout(showBubble, nextRandomDelay);
            }, 3000);
        } else {
            setTimeout(showBubble, 2000);
        }
    }
    setTimeout(showBubble, Math.floor(Math.random() * 4000) + 1000);
}

async function updateCloudState(key, value) {
    gameStates[key] = value;
    await supabaseClient.from('game_state').upsert({ key: key, value: String(value), updated_at: new Date() });
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
    } else {
        currentQuestion = null;
        await supabaseClient.from('game_state').delete().eq('key', 'current_active_quiz');
    }
}

function startCloudWheelSpin() {
    if (players.length === 0) return;
    
    stopIdleSpinning();
    document.getElementById('spin-btn').disabled = true;
    ['quiz-content', 'post-spin-actions'].forEach(id => document.getElementById(id)?.classList.add('d-none'));
    document.getElementById('show-quiz-btn')?.classList.remove('d-none');
    document.getElementById('skip-zone')?.classList.remove('d-none');

    wheelModal.show();
    let startTime = null;
    const duration = 9500; 
    const baseAngle = startAngle; 
    const additionalSpinAngle = 65 + (Math.random() * 25) + (Math.random() * 2 * Math.PI); 

    function animateWheel(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        startAngle = baseAngle + ((1 - Math.pow(1 - progress, 5)) * additionalSpinAngle);
        drawAllWheels(); 

        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animateWheel);
        } else {
            const arc = Math.PI * 2 / players.length;
            const index = Math.floor(((Math.PI * 1.5 - ((startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / arc) % players.length;
            
            const targetPlayer = players[index];
            currentWinner = targetPlayer.name;

            players = players.map(p => p.name === currentWinner ? {...p, spunCount: (p.spunCount || 0) + 1} : p);
            
            setTimeout(async () => {
                wheelModal.hide();
                const imgZone = document.getElementById('modal-winner-img-zone');
                imgZone.innerHTML = targetPlayer.image ? `<img src="${targetPlayer.image}" class="rounded-circle shadow" style="width:160px; height:160px; object-fit:cover; border:5px solid #fff;">` : `<div class="bg-secondary text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow" style="width:160px; height:160px; font-size:4.5rem;"><i class="bi bi-person-fill"></i></div>`;
                document.getElementById('modal-winner-name').innerText = currentWinner;
                document.getElementById('modal-winner-emoji-zone').innerHTML = `<div class="emoji-thinking" style="font-size: 4.5rem;">🤔💭</div><div class="fw-bold text-primary text-center mt-2 fs-4 animate-pulse">กำลังคิดหาคำตอบ...</div>`;

                const currentClassKey = gameStates['current_class_key'];
                await supabaseClient.from('class_rooms').update({ players: players }).eq('class_key', currentClassKey);
                await updateCloudState('current_winner_name', currentWinner);
                await updateCloudState('current_step', 'winner_selected');

                winnerModal.show();
                triggerFireworks();
                document.getElementById('spin-btn').disabled = false;
            }, 1000); 
        }
    }
    animationFrameId = requestAnimationFrame(animateWheel);
}

async function renderActiveQuizUI() {
    if (!currentQuestion) {
        const { data: activeQuizState } = await supabaseClient.from('game_state').select('*').eq('key', 'current_active_quiz').single();
        if (activeQuizState && activeQuizState.value && activeQuizState.value !== 'null') {
            currentQuestion = JSON.parse(activeQuizState.value);
        }
    }

    if (!currentQuestion) {
        if (questions && questions.length > 0) {
            const rawQuestion = questions[Math.floor(Math.random() * questions.length)];
            const mappedChoices = rawQuestion.choices.map((choice, index) => ({ text: choice, isCorrect: index === rawQuestion.correct }));
            for (let i = mappedChoices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mappedChoices[i], mappedChoices[j]] = [mappedChoices[j], mappedChoices[i]];
            }
            currentQuestion = { q: rawQuestion.q, choices: mappedChoices.map(c => c.text), correct: mappedChoices.findIndex(c => c.isCorrect) };
            await updateCloudState('current_active_quiz', JSON.stringify(currentQuestion));
        } else {
            alert('🚨 ไม่พบคำถามในคลัง! กรุณาเพิ่มโจทย์คำถามในห้องเรียนก่อนครับ');
            return;
        }
    }

    updateCloudState('current_step', 'quiz_visible');
    document.getElementById('show-quiz-btn')?.classList.add('d-none');
    document.getElementById('quiz-content')?.classList.remove('d-none');
    document.getElementById('question-text').innerHTML = formatQuestionText(currentQuestion.q);
    
    const container = document.getElementById('options-container'); 
    if(container) {
        container.innerHTML = "";
        currentQuestion.choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.id = `user-choice-btn-${index}`;
            btn.className = "btn btn-outline-primary text-start p-3 fw-bold fs-4 d-flex align-items-center";
            btn.style.whiteSpace = "normal"; 
            btn.innerHTML = formatChoiceText(choice, ["A.", "B.", "C.", "D."][index]);
            btn.onclick = () => selectChoice(index);
            container.appendChild(btn);
        });
    }
    document.getElementById('user-confirm-btn')?.classList.remove('d-none');
}

async function selectChoice(index) {
    if(gameStates['quiz_submitted'] === 'true') return;
    userSelectedIdx = index;
    await updateCloudState('selected_choice_idx', index);
    highlightSelection(index);
    
    // 🌟 ส่งสัญญาณ Broadcast สวนกลับไปหาหน้าจอ Admin ให้เปลี่ยนปุ่มไฮไลต์ตามด้วย
    if (realtimeChannel) {
        realtimeChannel.send({ type: 'broadcast', event: 'admin_sync_choice', payload: { index: index } });
    }
}

function highlightSelection(selectedIndex) {
    const container = document.getElementById('options-container');
    if (!container) return;
    for(let i = 0; i < container.children.length; i++) {
        container.children[i].className = (i === selectedIndex) ? "btn btn-primary text-start p-3 fw-bold fs-4 text-white shadow d-flex align-items-center" : "btn btn-outline-primary text-start p-3 fw-bold fs-4 d-flex align-items-center";
    }
}

async function submitUserAnswer() {
    if (userSelectedIdx === null) {
        const { data: syncChoiceState } = await supabaseClient.from('game_state').select('*').eq('key', 'selected_choice_idx').single();
        if (syncChoiceState && syncChoiceState.value && syncChoiceState.value !== 'null') {
            userSelectedIdx = parseInt(syncChoiceState.value);
            highlightSelection(userSelectedIdx);
        }
    }

    if(userSelectedIdx === null) return alert('กรุณาเลือกคำตอบก่อนครับ!');
    await updateCloudState('quiz_submitted', 'true');
    await updateCloudState('current_step', 'answered');
    
    document.getElementById('user-confirm-btn')?.classList.add('d-none');
    document.getElementById('skip-zone')?.classList.add('d-none');

    const options = document.getElementById('options-container')?.children;
    if (options) {
        for(let btn of options) btn.disabled = true;
        const emojiZone = document.getElementById('modal-winner-emoji-zone');

        if (userSelectedIdx === currentQuestion.correct) {
            if(options[userSelectedIdx]) options[userSelectedIdx].className = "btn btn-success text-start p-3 fw-bold fs-4 text-white shadow d-flex align-items-center";
            players = players.map(p => p.name === currentWinner ? {...p, score: p.score + 1} : p);
            triggerFireworks();
            if(emojiZone) emojiZone.innerHTML = `<div style="font-size: 5rem; animation: pulse 0.5s infinite alternate;">${winEmojis[Math.floor(Math.random() * winEmojis.length)]}</div><div class="fw-bold text-success text-center mt-2 fs-3">${winPhrases[Math.floor(Math.random() * winPhrases.length)]}</div>`;
        } else {
            if(options[userSelectedIdx]) options[userSelectedIdx].className = "btn btn-danger text-start p-3 fw-bold fs-4 text-white shadow d-flex align-items-center";
            if(options[currentQuestion.correct]) options[currentQuestion.correct].className = "btn btn-success text-start p-3 fw-bold fs-4 text-white shadow d-flex align-items-center";
            if(emojiZone) emojiZone.innerHTML = `<div style="font-size: 5rem; animation: shakeEmoji 0.3s infinite alternate;">${loseEmojis[Math.floor(Math.random() * loseEmojis.length)]}</div><div class="fw-bold text-danger text-center mt-2 fs-3">${losePhrases[Math.floor(Math.random() * losePhrases.length)]}</div>`;
        }
    }

    const currentClassKey = gameStates['current_class_key'];
    await supabaseClient.from('class_rooms').update({ players: players }).eq('class_key', currentClassKey);
    updateLeaderboard();
    document.getElementById('post-spin-actions')?.classList.remove('d-none');
    if(realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'student_answered' });
}

async function clearLiveStorage() {
    await updateCloudState('current_winner_name', '');
    await updateCloudState('current_active_quiz', 'null');
    await updateCloudState('selected_choice_idx', 'null');
    await updateCloudState('quiz_submitted', 'false');
    await updateCloudState('current_step', 'ready');
    userSelectedIdx = null;
}

async function closeWithoutAction() {
    if (currentWinner) {
        players = players.map(p => p.name === currentWinner ? {...p, spunCount: Math.max(0, (p.spunCount || 1) - 1)} : p);
        const currentClassKey = gameStates['current_class_key'];
        await supabaseClient.from('class_rooms').update({ players: players }).eq('class_key', currentClassKey);
    }
    await clearLiveStorage(); 
    winnerModal.hide(); 
    resetTurn();
    startIdleSpinning();
}

async function deleteCurrentWinner() {
    if (!currentWinner || !confirm(`🚨 คุณแน่ใจจริงๆ ใช่ไหมที่จะลบ "${currentWinner}" ออกถาวร?`)) return;
    players = players.filter(p => p.name !== currentWinner);
    const currentClassKey = gameStates['current_class_key'];
    await supabaseClient.from('class_rooms').update({ players: players }).eq('class_key', currentClassKey);
    await clearLiveStorage(); 
    winnerModal.hide(); 
    resetTurn();
    startIdleSpinning();
}

function resetTurn() { if (animationFrameId) cancelAnimationFrame(animationFrameId); initData(); }

function initSupabaseRealtime() {
    realtimeChannel = supabaseClient.channel('game_broadcast_room');

    realtimeChannel
    .on('broadcast', { event: 'spin' }, () => { selectRandomQuestion(); startCloudWheelSpin(); })
    .on('broadcast', { event: 'quiz' }, async () => {
        const { data: activeQuizState } = await supabaseClient.from('game_state').select('*').eq('key', 'current_active_quiz').single();
        if (activeQuizState && activeQuizState.value && activeQuizState.value !== 'null') {
            currentQuestion = JSON.parse(activeQuizState.value);
        }
        if (currentQuestion) {
            renderActiveQuizUI();
        }
    })
    .on('broadcast', { event: 'select_choice' }, (payload) => { 
        // 🌟 แก้ไขจุดสำคัญ: บังคับเปลี่ยนตัวแปรของหน้า Wheel และเปลี่ยนสไตล์คลาส CSS เป็นสีน้ำเงินตามที่แอดมินส่งสัญญาณมา
        userSelectedIdx = payload.index;
        highlightSelection(payload.index); 
    })
    .on('broadcast', { event: 'confirm' }, () => { submitUserAnswer(); })
    .on('broadcast', { event: 'skip' }, () => { closeWithoutAction(); })
    .on('broadcast', { event: 'reset' }, () => { closeWithoutAction(); })
    .on('broadcast', { event: 'class_changed' }, () => { resetTurn(); })
    .on('broadcast', { event: 'subject_changed' }, () => { resetTurn(); })
    .subscribe();

    supabaseClient.channel('public_state_sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => { initData(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'class_rooms' }, () => { initData(); })
    .subscribe();
}

function startIdleSpinning() {
    if (players.length === 0) return;
    function loop() {
        startAngle += 0.003; 
        drawAllWheels(); 
        idleAnimationId = requestAnimationFrame(loop);
    }
    if (!idleAnimationId) {
        idleAnimationId = requestAnimationFrame(loop);
    }
}

function stopIdleSpinning() {
    if (idleAnimationId) {
        cancelAnimationFrame(idleAnimationId);
        idleAnimationId = null;
    }
}

document.getElementById('spin-btn').addEventListener('click', () => { realtimeChannel.send({ type: 'broadcast', event: 'spin' }); startCloudWheelSpin(); });
document.getElementById('show-quiz-btn')?.addEventListener('click', () => { realtimeChannel.send({ type: 'broadcast', event: 'quiz' }); renderActiveQuizUI(); });
document.getElementById('keep-name-btn')?.addEventListener('click', async () => { await clearLiveStorage(); winnerModal.hide(); resetTurn(); });
document.getElementById('remove-name-btn')?.addEventListener('click', deleteCurrentWinner);

function drawAllWheels() { if(players.length>0) { renderSingleWheel(canvas, ctx, 14, 25); renderSingleWheel(canvasLarge, ctxLarge, 20, 45); updatePointerColors(); } }
function renderSingleWheel(tc,tx,fs,to) { const sz=tc.width, cx=sz/2, r=cx-10, arc=Math.PI*2/players.length; tx.clearRect(0,0,sz,sz); players.forEach((p,i)=>{ const a=startAngle+i*arc; tx.save(); tx.beginPath(); tx.moveTo(cx,cx); tx.arc(cx,cx,r,a,a+arc); const g=tx.createRadialGradient(cx,cx,10,cx,cx,r); const hue=(i*360/players.length); g.addColorStop(0,'#1a1c29'); g.addColorStop(0.6,`hsl(${hue},85%,50%)`); g.addColorStop(1,`hsl(${hue},90%,35%)`); tx.fillStyle=g; tx.fill(); tx.restore(); tx.save(); tx.fillStyle='#fff'; tx.font=`bold ${fs}px sans-serif`; tx.translate(cx,cx); tx.rotate(a+arc/2); tx.textAlign='right'; tx.fillText(p.name,cx-to,fs/3); tx.restore(); }); }

function updatePointerColors() { 
    if(players.length===0) return; 
    const arc=Math.PI*2/players.length, cIdx=Math.floor((Math.PI*1.5-((startAngle%(Math.PI*2)+Math.PI*2)%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/arc)%players.length; 
    const targetColor = `hsl(${(cIdx*360/players.length)},75%,60%)`;
    const pointerSmall = document.getElementById('pointer');
    if (pointerSmall) pointerSmall.style.setProperty('--pointer-color', targetColor);
    const pointerLarge = document.getElementById('pointer-large');
    if (pointerLarge) pointerLarge.style.setProperty('--pointer-color', targetColor);
}

function updateLeaderboard() { const sorted=[...players].sort((a,b)=>b.score-a.score); updatePodiumDisplay(sorted); document.getElementById('leaderboard-body').innerHTML=sorted.map((p,idx)=>`<tr><td class="fw-bold text-center">${idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':idx+1}</td><td>${p.image?`<img src="${p.image}" class="table-avatar">` : '<div class="table-avatar"><i class="bi bi-person"></i></div>'}<strong>${p.name}</strong></td><td class="text-center">${p.spunCount||0} ครั้ง</td><td class="text-center fw-bold text-success">${p.score}</td></tr>`).join(''); }

function updatePodiumDisplay(sorted) { 
    for(let i=1; i<=3; i++) { 
        const p = sorted[i-1]; 
        const av = document.getElementById(`p${i}-avatar`); 
        const nm = document.getElementById(`p${i}-name`); 
        const bb = document.getElementById(`p${i}-bubble`); 
        if(p && p.score > 0) { 
            if(nm) nm.innerText = p.name; 
            if(bb) bb.setAttribute('data-active', 'true'); 
            av.innerHTML = p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover; border-radius:9px;">` : `<i class="bi bi-person-fill text-secondary"></i>`; 
        } else { 
            if(nm) nm.innerText = "-"; 
            if(bb) { bb.setAttribute('data-active', 'false'); bb.classList.remove('show-active'); } 
            av.innerHTML = `<i class="bi bi-person-fill text-muted"></i>`; 
        } 
    } 
}

window.onload = async () => {
    await initData();
    initSupabaseRealtime();
    startMockingRoutine(1, phrasesRank1);
    startMockingRoutine(2, phrasesRank2);
    startMockingRoutine(3, phrasesRank3);
};