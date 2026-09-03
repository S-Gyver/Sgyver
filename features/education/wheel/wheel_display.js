let currentClassId = '';
let roomCode = '';
let studentsList = [];
let questionsList = [];
let currentWinnerIndex = -1;
let currentActiveQuiz = null;
let selectedChoiceIdx = null;
let startAngle = 0;
let isSpinning = false;
let idleAnimationId = null;
let realtimeChannel = null;
let gameStates = {};

let bigWheelModalInstance = null;
let winnerCardModalInstance = null;
let quizDisplayModalInstance = null;
let answerResultModalInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    initModals();
    await fetchDisplayClassrooms();

    const urlParams = new URLSearchParams(window.location.search);
    currentClassId = urlParams.get('class_id') || '';
    
    if (currentClassId) {
        await fetchClassroomData(currentClassId);
    }

    startIdleSpinning();
});

function initModals() {
    const bigModalEl = document.getElementById('bigWheelModal');
    const winnerCardEl = document.getElementById('winnerCardModal');
    const quizDisplayEl = document.getElementById('quizDisplayModal');
    const answerResultEl = document.getElementById('answerResultModal');

    if (bigModalEl && typeof bootstrap !== 'undefined') {
        bigWheelModalInstance = bootstrap.Modal.getOrCreateInstance(bigModalEl, { focus: false, backdrop: 'static', keyboard: false });
    }
    if (winnerCardEl && typeof bootstrap !== 'undefined') {
        winnerCardModalInstance = bootstrap.Modal.getOrCreateInstance(winnerCardEl, { focus: false });
    }
    if (quizDisplayEl && typeof bootstrap !== 'undefined') {
        quizDisplayModalInstance = bootstrap.Modal.getOrCreateInstance(quizDisplayEl, { focus: false });
    }
    if (answerResultEl && typeof bootstrap !== 'undefined') {
        answerResultModalInstance = bootstrap.Modal.getOrCreateInstance(answerResultEl, { focus: false });
    }
}

function safeCloseAllModals() {
    return new Promise((resolve) => {
        const modalElements = [
            document.getElementById('bigWheelModal'),
            document.getElementById('winnerCardModal'),
            document.getElementById('quizDisplayModal'),
            document.getElementById('answerResultModal')
        ];

        let openModals = modalElements.filter(el => el && el.classList.contains('show'));

        if (openModals.length === 0) {
            forceCleanBackdrop();
            resolve();
            return;
        }

        let closedCount = 0;
        openModals.forEach((modalEl) => {
            const instance = bootstrap.Modal.getInstance(modalEl);
            
            const onHidden = () => {
                modalEl.removeEventListener('hidden.bs.modal', onHidden);
                closedCount++;
                if (closedCount >= openModals.length) {
                    forceCleanBackdrop();
                    resolve();
                }
            };

            modalEl.addEventListener('hidden.bs.modal', onHidden);

            if (instance) {
                instance.hide();
            } else {
                modalEl.classList.remove('show');
                modalEl.style.display = 'none';
                onHidden();
            }
        });

        setTimeout(() => {
            forceCleanBackdrop();
            resolve();
        }, 300);
    });
}

function forceCleanBackdrop() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.querySelectorAll('.modal').forEach(m => {
        m.removeAttribute('aria-hidden');
    });
}

async function fetchDisplayClassrooms() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) return;

        const { data: classrooms, error } = await supabaseClient
            .from('classrooms')
            .select('*')
            .eq('teacher_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error || !classrooms || classrooms.length === 0) {
            document.getElementById('display-room-title').innerText = 'ไม่พบห้องเรียน';
            drawWheel();
            return;
        }

        if (!currentClassId) {
            currentClassId = classrooms[0].id;
            await fetchClassroomData(currentClassId);
        }
    } catch (err) {
        console.error("Fetch display classrooms error:", err);
    }
}

async function fetchClassroomData(classId) {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient || !classId) return;

        const { data, error } = await supabaseClient
            .from('classrooms')
            .select('*')
            .eq('id', classId)
            .maybeSingle();

        if (!error && data) {
            document.getElementById('display-room-title').innerText = data.class_name || 'ไม่ระบุห้อง';
            roomCode = data.room_code || '';
            studentsList = Array.isArray(data.students) ? data.students : [];
            
            fetchQuizQuestions();
            fetchGameStateData();

            drawWheel();
            drawBigWheel();
            updateLeaderboardUI();
            listenRealtimeSignals(roomCode, classId);
        }
    } catch (e) {
        console.error("Fetch classroom error:", e);
    }
}

async function fetchGameStateData() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) return;

        const { data } = await supabaseClient
            .from('game_state')
            .select('*')
            .eq('user_id', session.user.id);

        if (data) {
            gameStates = {};
            data.forEach(s => { gameStates[s.key] = s.value; });
            
            const subKey = gameStates['current_quiz_subject_key'];
            const subEl = document.getElementById('display-subject-tag');
            if (subEl) subEl.innerText = subKey || 'ไม่ระบุวิชา';
        }
    } catch (e) {
        console.error("Fetch game state error:", e);
    }
}

async function fetchQuizQuestions() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) return;

        const { data } = await supabaseClient
            .from('quiz_subjects')
            .select('questions')
            .eq('user_id', session.user.id);

        if (data && data.length > 0) {
            questionsList = data.flatMap(d => d.questions || []);
        }
    } catch (e) {
        console.error("Fetch quiz error:", e);
    }
}

function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sz = canvas.width;
    const cx = sz / 2;
    const r = cx - 10;
    const numOptions = studentsList.length;

    ctx.clearRect(0, 0, sz, sz);

    if (numOptions === 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cx, r, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px Kanit';
        ctx.textAlign = 'center';
        ctx.fillText('ยังไม่มีรายชื่อผู้เล่น', cx, cx);
        ctx.restore();
        return;
    }

    const arc = (Math.PI * 2) / numOptions;

    studentsList.forEach((p, i) => {
        const a = startAngle + i * arc;
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cx);
        ctx.arc(cx, cx, r, a, a + arc);
        
        const g = ctx.createRadialGradient(cx, cx, 10, cx, cx, r);
        const hue = (i * 360) / numOptions;
        g.addColorStop(0, '#1a1c29');
        g.addColorStop(0.6, `hsl(${hue},85%,50%)`);
        g.addColorStop(1, `hsl(${hue},90%,35%)`);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Kanit';
        ctx.translate(cx, cx);
        ctx.rotate(a + arc / 2);
        ctx.textAlign = 'right';
        const studentName = p.name || `นักเรียน ${i + 1}`;
        ctx.fillText(studentName, cx - 25, 5);
        ctx.restore();
    });

    updatePointerColor();
}

function drawBigWheel() {
    const canvas = document.getElementById('big-wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sz = canvas.width;
    const cx = sz / 2;
    const r = cx - 15;
    const numOptions = studentsList.length;

    ctx.clearRect(0, 0, sz, sz);

    if (numOptions === 0) return;

    const arc = (Math.PI * 2) / numOptions;

    studentsList.forEach((p, i) => {
        const a = startAngle + i * arc;
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cx);
        ctx.arc(cx, cx, r, a, a + arc);
        
        const g = ctx.createRadialGradient(cx, cx, 20, cx, cx, r);
        const hue = (i * 360) / numOptions;
        g.addColorStop(0, '#1a1c29');
        g.addColorStop(0.6, `hsl(${hue},85%,50%)`);
        g.addColorStop(1, `hsl(${hue},90%,35%)`);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Kanit';
        ctx.translate(cx, cx);
        ctx.rotate(a + arc / 2);
        ctx.textAlign = 'right';
        const studentName = p.name || `นักเรียน ${i + 1}`;
        ctx.fillText(studentName, cx - 45, 7);
        ctx.restore();
    });

    updateBigPointerColor();
}

function updatePointerColor() {
    const pointer = document.getElementById('wheel-pointer-arrow');
    if (!pointer || studentsList.length === 0) return;

    const numOptions = studentsList.length;
    const arc = (Math.PI * 2) / numOptions;
    
    const cIdx = Math.floor((Math.PI * 1.5 - ((startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / arc) % numOptions;
    const targetColor = `hsl(${(cIdx * 360 / numOptions)},85%,55%)`;
    
    pointer.style.borderTopColor = targetColor;
    pointer.style.filter = `drop-shadow(0 0 12px ${targetColor})`;
}

function updateBigPointerColor() {
    const pointer = document.getElementById('big-wheel-pointer');
    if (!pointer || studentsList.length === 0) return;

    const numOptions = studentsList.length;
    const arc = (Math.PI * 2) / numOptions;
    
    const cIdx = Math.floor((Math.PI * 1.5 - ((startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / arc) % numOptions;
    const targetColor = `hsl(${(cIdx * 360 / numOptions)},85%,55%)`;
    
    pointer.style.borderTopColor = targetColor;
    pointer.style.filter = `drop-shadow(0 0 25px ${targetColor})`;
}

function startIdleSpinning() {
    function loop() {
        if (!isSpinning && studentsList.length > 0) {
            startAngle += 0.005;
            drawWheel();
            drawBigWheel();
        }
        idleAnimationId = requestAnimationFrame(loop);
    }
    cancelAnimationFrame(idleAnimationId);
    idleAnimationId = requestAnimationFrame(loop);
}

async function spinRandomly() {
    if (isSpinning || studentsList.length === 0) return;
    
    let randomIndex = -1;

    const targetIdxState = gameStates['target_winner_index'];
    if (targetIdxState !== undefined && targetIdxState !== null && targetIdxState !== '' && targetIdxState !== '-1') {
        const parsedIdx = parseInt(targetIdxState);
        if (!isNaN(parsedIdx) && studentsList[parsedIdx]) {
            randomIndex = parsedIdx;
        }
    }

    if (randomIndex === -1) {
        randomIndex = Math.floor(Math.random() * studentsList.length);
    }

    const winner = studentsList[randomIndex];
    const currentBaseAngle = startAngle;

    if (realtimeChannel) {
        realtimeChannel.send({
            type: 'broadcast',
            event: 'spin_trigger',
            payload: {
                targetIndex: randomIndex,
                baseAngle: currentBaseAngle,
                winner: winner,
                winner_id: winner ? winner.id : null,
                winner_name: winner ? winner.name : ''
            }
        });
    }

    spinWheelTo(randomIndex, currentBaseAngle);
}

async function spinWheelTo(winnerIndex, currentBaseAngle) {
    if (isSpinning || !studentsList[winnerIndex]) return;
    isSpinning = true;
    currentWinnerIndex = winnerIndex;
    
    resetQuizData();

    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    await safeCloseAllModals();

    const spinBtn = document.getElementById('btn-spin-wheel');
    if (spinBtn) spinBtn.disabled = true;

    if (bigWheelModalInstance) {
        bigWheelModalInstance.show();
    }

    let startTime = null;
    const duration = 10000;
    
    if (typeof currentBaseAngle === 'number') {
        startAngle = currentBaseAngle;
    }
    const baseAngle = startAngle;
    const numOptions = studentsList.length;
    const arc = (Math.PI * 2) / numOptions;

    const randomOffsetInSlice = (Math.random() * 0.6 + 0.2) * arc; 
    const targetAngleOnWheel = Math.PI * 1.5 - (winnerIndex * arc) - randomOffsetInSlice;
    
    const rounds = 12 * Math.PI * 2; 
    const totalSpinAngle = rounds + (targetAngleOnWheel - (baseAngle % (Math.PI * 2)));

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOutProgress = 1 - Math.pow(1 - progress, 5);
        startAngle = baseAngle + (easeOutProgress * totalSpinAngle);

        drawWheel();
        drawBigWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            const winner = studentsList[winnerIndex];
            winner.spunCount = (winner.spunCount || 0) + 1;

            if (currentClassId && typeof supabaseClient !== 'undefined' && supabaseClient) {
                supabaseClient
                    .from('classrooms')
                    .update({ students: studentsList })
                    .eq('id', currentClassId);
            }

            updateLeaderboardUI();
            showWinnerAnnouncement(winner);

            setTimeout(async () => {
                if (bigWheelModalInstance) bigWheelModalInstance.hide();
                await safeCloseAllModals();

                renderCard1WinnerData(winner);
                if (winnerCardModalInstance) winnerCardModalInstance.show();

                if (typeof confetti === 'function') {
                    confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 } });
                }

                isSpinning = false;
                if (spinBtn) spinBtn.disabled = false;
                
                notifyTeacherState('winner_selected');
            }, 1000);
        }
    }

    requestAnimationFrame(animate);
}

function resetQuizData() {
    selectedChoiceIdx = null;
    currentActiveQuiz = null;

    const qEl = document.getElementById('card2-quiz-question');
    const choicesEl = document.getElementById('card2-quiz-choices');

    if (qEl) qEl.innerText = 'กำลังประมวลผลคำถาม...';
    if (choicesEl) {
        choicesEl.innerHTML = `
            <div class="choice-box-neon choice-placeholder">1. <span>กรุณากดสุ่มคำถาม...</span></div>
            <div class="choice-box-neon choice-placeholder">2. <span>กรุณากดสุ่มคำถาม...</span></div>
            <div class="choice-box-neon choice-placeholder">3. <span>กรุณากดสุ่มคำถาม...</span></div>
            <div class="choice-box-neon choice-placeholder">4. <span>กรุณากดสุ่มคำถาม...</span></div>
        `;
    }
}

function renderCard1WinnerData(winner) {
    if (!winner) return;
    const avatarUrl = winner.image || winner.avatar || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(winner.name || 'Winner')}`;

    document.getElementById('card1-winner-name').innerText = winner.name || '-';
    document.getElementById('card1-winner-count').innerText = `โดนสุ่ม: ${winner.spunCount || winner.spin_count || 0} ครั้ง`;
    document.getElementById('card1-winner-score').innerText = `คะแนน: ${winner.score || 0} pt`;
    
    const avatarEl = document.getElementById('card1-winner-avatar');
    if (avatarEl) {
        avatarEl.src = avatarUrl;
        avatarEl.onclick = () => {
            if (typeof openPhotoZoom === 'function') openPhotoZoom(avatarUrl, `🎉 ผู้โชคดี: ${winner.name || ''}`);
        };
    }
}

function renderCard2WinnerData(winner) {
    if (!winner) return;
    const avatarUrl = winner.image || winner.avatar || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(winner.name || 'Winner')}`;

    document.getElementById('card2-winner-name').innerText = winner.name || '-';
    document.getElementById('card2-winner-count').innerText = `โดนสุ่ม: ${winner.spunCount || winner.spin_count || 0} ครั้ง`;
    document.getElementById('card2-winner-score').innerText = `คะแนน: ${winner.score || 0} pt`;
    
    const avatarEl = document.getElementById('card2-winner-avatar');
    if (avatarEl) {
        avatarEl.src = avatarUrl;
        avatarEl.onclick = () => {
            if (typeof openPhotoZoom === 'function') openPhotoZoom(avatarUrl, `🎉 ผู้โชคดี: ${winner.name || ''}`);
        };
    }
}

async function skipCurrentWinner() {
    resetQuizData();
    await closeAllModals();
}

async function resignAndRespin() {
    resetQuizData();
    await safeCloseAllModals();

    if (currentWinnerIndex !== -1 && studentsList[currentWinnerIndex]) {
        studentsList[currentWinnerIndex].spunCount = Math.max(0, (studentsList[currentWinnerIndex].spunCount || 1) - 1);
        
        if (currentClassId && typeof supabaseClient !== 'undefined' && supabaseClient) {
            supabaseClient
                .from('classrooms')
                .update({ students: studentsList })
                .eq('id', currentClassId);
        }
        updateLeaderboardUI();
    }

    setTimeout(() => {
        spinRandomly();
    }, 200);
}

async function openQuizModalFromCard1() {
    if (questionsList.length === 0) {
        alert("ยังไม่มีโจทย์คำถามในคลังวิชานี้ครับ!");
        return;
    }

    const randomIndex = Math.floor(Math.random() * questionsList.length);
    currentActiveQuiz = questionsList[randomIndex];
    selectedChoiceIdx = null;

    await safeCloseAllModals();

    const winner = studentsList[currentWinnerIndex];
    renderCard2WinnerData(winner);
    displayQuizDataInCard2(currentActiveQuiz);

    if (quizDisplayModalInstance) quizDisplayModalInstance.show();

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
            await supabaseClient
                .from('game_state')
                .upsert([
                    { key: 'current_active_quiz', value: JSON.stringify(currentActiveQuiz), user_id: session.user.id, updated_at: new Date() },
                    { key: 'selected_choice_idx', value: 'null', user_id: session.user.id, updated_at: new Date() },
                    { key: 'quiz_submitted', value: 'false', user_id: session.user.id, updated_at: new Date() },
                    { key: 'current_step', value: 'quiz_visible', user_id: session.user.id, updated_at: new Date() }
                ], { onConflict: 'key,user_id' });
        }
    } catch (e) {
        console.error("Save state error:", e);
    }

    if (realtimeChannel) {
        realtimeChannel.send({
            type: 'broadcast',
            event: 'quiz',
            payload: { quiz: currentActiveQuiz }
        });
    }
    notifyTeacherState('quiz_visible');
}

function displayQuizDataInCard2(q) {
    if (!q) return;

    const qEl = document.getElementById('card2-quiz-question');
    const choicesEl = document.getElementById('card2-quiz-choices');

    if (qEl && choicesEl) {
        qEl.innerText = q.q || 'โจทย์คำถาม...';
        
        choicesEl.innerHTML = (q.choices || []).map((c, idx) => `
            <div class="choice-box-neon" onclick="selectChoice(${idx})">
                <span class="text-cyan me-3 fw-bold font-mono">${idx + 1}.</span>
                <span>${c}</span>
            </div>
        `).join('');
    }
}

function selectChoice(idx) {
    selectedChoiceIdx = idx;
    const choiceEls = document.querySelectorAll('#card2-quiz-choices .choice-box-neon');
    choiceEls.forEach((el, i) => {
        if (i === idx) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    if (realtimeChannel) {
        realtimeChannel.send({
            type: 'broadcast',
            event: 'student_selected_choice',
            payload: { index: idx }
        });
    }
}

async function confirmAnswerAndProceed() {
    if (selectedChoiceIdx === null) {
        alert("กรุณาเลือกตัวเลือกก่อนกด ยืนยันคำตอบ ครับ!");
        return;
    }

    const isCorrect = selectedChoiceIdx === currentActiveQuiz.correct;
    const choiceEls = document.querySelectorAll('#card2-quiz-choices .choice-box-neon');

    choiceEls.forEach((el, i) => {
        el.classList.remove('selected');
        if (i === currentActiveQuiz.correct) {
            el.classList.add('correct-answer');
        } else if (i === selectedChoiceIdx && !isCorrect) {
            el.classList.add('wrong-answer');
        }
    });

    const iconZone = document.getElementById('result-icon-zone');
    const titleText = document.getElementById('result-title-text');
    const detailText = document.getElementById('result-detail-text');

    if (isCorrect && currentWinnerIndex !== -1 && studentsList[currentWinnerIndex]) {
        studentsList[currentWinnerIndex].score = (studentsList[currentWinnerIndex].score || 0) + 1;

        if (currentClassId && typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient
                .from('classrooms')
                .update({ students: studentsList })
                .eq('id', currentClassId);
        }

        updateLeaderboardUI();
        renderCard2WinnerData(studentsList[currentWinnerIndex]);

        if (iconZone) iconZone.innerHTML = `<i class="bi bi-check-circle-fill text-success text-cyan-glow"></i>`;
        if (titleText) {
            titleText.innerText = `ตอบถูกต้อง! 🎉`;
            titleText.className = "fw-bold font-kanit text-success display-4 mb-2";
        }
        if (detailText) detailText.innerText = `ยินดีด้วย! คุณได้รับ +1 คะแนนเรียบร้อยแล้ว`;

        if (typeof confetti === 'function') {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
        }
    } else {
        const correctChoiceText = currentActiveQuiz.choices[currentActiveQuiz.correct] || '';
        if (iconZone) iconZone.innerHTML = `<i class="bi bi-x-circle-fill text-danger"></i>`;
        if (titleText) {
            titleText.innerText = `ยังไม่ถูกต้อง! ❌`;
            titleText.className = "fw-bold font-kanit text-danger display-4 mb-2";
        }
        if (detailText) detailText.innerText = `คำตอบที่ถูกต้องคือ ข้อ ${currentActiveQuiz.correct + 1}: ${correctChoiceText}`;
    }

    notifyTeacherState('answered');

    await safeCloseAllModals();
    if (answerResultModalInstance) answerResultModalInstance.show();
}

async function closeResultModalAndRespin() {
    await closeAllModals();
}

async function closeAllModals() {
    await safeCloseAllModals();
    isSpinning = false;
    currentWinnerIndex = -1;
    gameStates['target_winner_index'] = '-1';

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
            await supabaseClient
                .from('game_state')
                .upsert([
                    { key: 'current_winner_name', value: '', user_id: session.user.id, updated_at: new Date() },
                    { key: 'current_active_quiz', value: 'null', user_id: session.user.id, updated_at: new Date() },
                    { key: 'selected_choice_idx', value: 'null', user_id: session.user.id, updated_at: new Date() },
                    { key: 'target_winner_index', value: '-1', user_id: session.user.id, updated_at: new Date() },
                    { key: 'current_step', value: 'ready', user_id: session.user.id, updated_at: new Date() }
                ], { onConflict: 'key,user_id' });
        }
    } catch (e) {
        console.error("Reset state error:", e);
    }

    notifyTeacherState('ready');
    if (realtimeChannel) {
        realtimeChannel.send({
            type: 'broadcast',
            event: 'reset_monitor'
        });
    }
}

function notifyTeacherState(stateStep) {
    if (realtimeChannel) {
        realtimeChannel.send({
            type: 'broadcast',
            event: 'state_changed',
            payload: { step: stateStep }
        });
    }
}

function updateLeaderboardUI() {
    if (studentsList.length === 0) {
        updatePodiumSlot(1, null);
        updatePodiumSlot(2, null);
        updatePodiumSlot(3, null);
        const tbody = document.getElementById('leaderboard-table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-center text-subtle py-4">ยังไม่มีข้อมูลนักเรียน</td></tr>`;
        return;
    }

    const sorted = [...studentsList].sort((a, b) => (b.score || 0) - (a.score || 0));

    updatePodiumSlot(1, sorted[0]);
    updatePodiumSlot(2, sorted[1]);
    updatePodiumSlot(3, sorted[2]);

    const tbody = document.getElementById('leaderboard-table-body');
    if (tbody) {
        tbody.innerHTML = sorted.map((s, idx) => {
            const avatarUrl = s.image || s.avatar || 'https://api.dicebear.com/7.x/big-smile/svg?seed=' + encodeURIComponent(s.name || 'Student');
            return `
            <tr>
                <td class="text-center fw-bold ${idx < 3 ? 'text-warning' : 'text-subtle'}">${idx + 1}</td>
                <td class="text-start">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${avatarUrl}" class="rounded-circle border border-secondary" style="width:32px; height:32px; object-fit:cover;" onclick="if(typeof openPhotoZoom==='function') openPhotoZoom('${avatarUrl}', '${s.name || 'นักเรียน'}')">
                        <span class="student-name-text">${s.name || 'ไม่มีชื่อ'}</span>
                    </div>
                </td>
                <td class="text-end text-cyan font-mono fs-6 fw-bold">${s.spunCount || s.spin_count || 0}</td>
                <td class="text-end text-warning font-mono fs-6 fw-bold">${s.score || 0} pt</td>
            </tr>`;
        }).join('');
    }
}

function updatePodiumSlot(rank, student) {
    const nameEl = document.getElementById(`podium-${rank}-name`);
    const scoreEl = document.getElementById(`podium-${rank}-score`);
    const imgEl = document.getElementById(`podium-${rank}-img`);

    if (student) {
        const avatarUrl = student.image || student.avatar || `https://api.dicebear.com/7.x/big-smile/svg?seed=Rank${rank}`;
        if (nameEl) nameEl.innerText = student.name || '-';
        if (scoreEl) scoreEl.innerText = `${student.score || 0} pt`;
        if (imgEl) {
            imgEl.src = avatarUrl;
            imgEl.onclick = () => {
                if (typeof openPhotoZoom === 'function') openPhotoZoom(avatarUrl, `อันดับ ${rank}: ${student.name || ''}`);
            };
        }
    } else {
        if (nameEl) nameEl.innerText = '-';
        if (scoreEl) scoreEl.innerText = '0 pt';
        if (imgEl) {
            imgEl.src = `https://api.dicebear.com/7.x/big-smile/svg?seed=${rank}`;
            imgEl.onclick = null;
        }
    }
}

function showWinnerAnnouncement(winner) {
    const box = document.getElementById('winner-announcement-box');
    if (!box) return;

    const nameEl = document.getElementById('winner-announce-name');
    const avatarEl = document.getElementById('winner-announce-avatar');
    const avatarUrl = winner.image || winner.avatar || 'https://api.dicebear.com/7.x/big-smile/svg?seed=Winner';

    if (nameEl) nameEl.innerText = `${winner.name || 'ผู้โชคดี'}`;
    if (avatarEl) {
        avatarEl.src = avatarUrl;
        avatarEl.onclick = () => {
            if (typeof openPhotoZoom === 'function') openPhotoZoom(avatarUrl, `🎉 ผู้โชคดี: ${winner.name || ''}`);
        };
    }

    box.classList.remove('d-none');
}

function listenRealtimeSignals(code, classId) {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);

        const channelName = code ? `room_${code}` : (classId ? `room_${code}` : 'room_global');
        realtimeChannel = supabaseClient.channel(channelName);

        realtimeChannel.on('broadcast', { event: 'spin_trigger' }, (payload) => {
            if (payload && payload.payload) {
                const targetIndex = payload.payload.targetIndex;
                const baseAngle = payload.payload.baseAngle;

                if (typeof targetIndex === 'number' && targetIndex !== -1) {
                    spinWheelTo(targetIndex, baseAngle);
                }
            }
        })
        .on('broadcast', { event: 'target_changed' }, (payload) => {
            if (payload && payload.payload && typeof payload.payload.targetIndex !== 'undefined') {
                gameStates['target_winner_index'] = String(payload.payload.targetIndex);
            }
        })
        .on('broadcast', { event: 'subject_changed' }, (payload) => {
            if (payload && payload.payload && payload.payload.key) {
                const subEl = document.getElementById('display-subject-tag');
                if (subEl) subEl.innerText = payload.payload.key;
            }
        })
        .on('broadcast', { event: 'quiz' }, (payload) => {
            if (payload && payload.payload && payload.payload.quiz) {
                currentActiveQuiz = payload.payload.quiz;
                selectedChoiceIdx = null;

                if (winnerCardModalInstance) winnerCardModalInstance.hide();
                
                const winner = studentsList[currentWinnerIndex];
                renderCard2WinnerData(winner);
                displayQuizDataInCard2(currentActiveQuiz);

                if (quizDisplayModalInstance) quizDisplayModalInstance.show();
            } else if (questionsList.length > 0) {
                openQuizModalFromCard1();
            }
        })
        .on('broadcast', { event: 'select_choice' }, (payload) => {
            if (payload && payload.payload && typeof payload.payload.index === 'number') {
                selectChoice(payload.payload.index);
            }
        })
        .on('broadcast', { event: 'confirm' }, () => {
            confirmAnswerAndProceed();
        })
        .on('broadcast', { event: 'skip' }, () => {
            skipCurrentWinner();
        })
        .on('broadcast', { event: 'reset' }, () => {
            closeAllModals();
        })
        .on('broadcast', { event: 'update_score' }, (payload) => {
            if (payload && payload.payload && Array.isArray(payload.payload.students)) {
                studentsList = payload.payload.students;
                updateLeaderboardUI();
                drawWheel();
                drawBigWheel();
            } else if (currentClassId) {
                fetchClassroomData(currentClassId);
            }
        })
        .subscribe();
    }
}