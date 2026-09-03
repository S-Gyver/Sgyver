let classRooms = {}; 
let currentClassKey = ""; 
let quizSubjects = {};
let currentQuizSubjectKey = "";
let questions = [];
let gameStates = {};
let realtimeChannel = null;
let currentUserId = null;

// ตัวแปรระบบ Mini Live Wheel
let miniStartAngle = 0;
let isMiniSpinning = false;
let miniIdleAnimationId = null;
let idleAnimationId = null;

async function getCurrentUser() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return null;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        currentUserId = session.user.id;
    }
    return currentUserId;
}

async function loadData() {
    try {
        await getCurrentUser();
        if (!currentUserId) return;

        // 🔒 ดึงคลาสเรียนเฉพาะของครู
        const { data: classesData } = await supabaseClient
            .from('classrooms')
            .select('*')
            .eq('teacher_id', currentUserId);

        classRooms = {};
        if (classesData && classesData.length > 0) {
            classesData.forEach(c => { 
                const roomKey = c.class_name || `ROOM_${c.id}`;
                classRooms[roomKey] = { id: c.id, code: c.room_code, students: Array.isArray(c.students) ? c.students : [] };
            });
        }

        // 🔒 ดึงข้อมูลวิชาคำถาม
        const { data: subjectsData } = await supabaseClient
            .from('quiz_subjects')
            .select('*')
            .eq('user_id', currentUserId);

        quizSubjects = {};
        if (subjectsData && subjectsData.length > 0) {
            subjectsData.forEach(s => { quizSubjects[s.subject_key] = s.questions; });
        }

        // 🔒 ดึงสถานะเกม
        const { data: statesData } = await supabaseClient
            .from('game_state')
            .select('*')
            .eq('user_id', currentUserId);

        gameStates = {};
        if (statesData) {
            statesData.forEach(s => { gameStates[s.key] = s.value; });
        }

        currentClassKey = gameStates['current_class_key'] || Object.keys(classRooms)[0] || "";
        currentQuizSubjectKey = gameStates['current_quiz_subject_key'] || Object.keys(quizSubjects)[0] || "";

        if (currentClassKey && !gameStates['current_class_key']) {
            await updateGameState('current_class_key', currentClassKey);
        }
        if (currentQuizSubjectKey && !gameStates['current_quiz_subject_key']) {
            await updateGameState('current_quiz_subject_key', currentQuizSubjectKey);
        }

        questions = quizSubjects[currentQuizSubjectKey] || [];

        renderAllSelects();
        renderTargetWinnerOptions(); 
        renderSpecificQuizOptions(); 
        renderPlayers();
        renderQuizzes();
        drawMiniWheel(); 
        startMiniIdleSpinning(); 
        
        if (!gameStates['current_step']) {
            gameStates['current_step'] = 'ready';
        }
        syncLiveMonitorUI();
        restoreActiveTab();
        initSupabaseRealtime();

    } catch (err) {
        console.error("Error loading data from Supabase:", err);
    }
}

// 🎨 วาดวงล้อ Mini Live Wheel
function drawMiniWheel() {
    const canvas = document.getElementById('mini-wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sz = canvas.width;
    const cx = sz / 2;
    const r = cx - 5;
    const players = getActivePlayers();
    const numOptions = players.length;

    ctx.clearRect(0, 0, sz, sz);

    if (numOptions === 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cx, r, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px Kanit';
        ctx.textAlign = 'center';
        ctx.fillText('ไม่มีข้อมูล', cx, cx);
        ctx.restore();
        return;
    }

    const arc = (Math.PI * 2) / numOptions;

    players.forEach((p, i) => {
        const a = miniStartAngle + i * arc;
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cx);
        ctx.arc(cx, cx, r, a, a + arc);
        
        const g = ctx.createRadialGradient(cx, cx, 5, cx, cx, r);
        const hue = (i * 360) / numOptions;
        g.addColorStop(0, '#1a1c29');
        g.addColorStop(0.6, `hsl(${hue},85%,50%)`);
        g.addColorStop(1, `hsl(${hue},90%,35%)`);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Kanit';
        ctx.translate(cx, cx);
        ctx.rotate(a + arc / 2);
        ctx.textAlign = 'right';
        const displayName = p.name ? (p.name.length > 5 ? p.name.substring(0, 4) + '..' : p.name) : `${i + 1}`;
        ctx.fillText(displayName, cx - 10, 3);
        ctx.restore();
    });

    updateMiniPointerColor();
}

function updateMiniPointerColor() {
    const pointer = document.getElementById('mini-wheel-pointer');
    const players = getActivePlayers();
    if (!pointer || players.length === 0) return;

    const numOptions = players.length;
    const arc = (Math.PI * 2) / numOptions;
    
    const cIdx = Math.floor((Math.PI * 1.5 - ((miniStartAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / arc) % numOptions;
    const targetColor = `hsl(${(cIdx * 360 / numOptions)},85%,55%)`;
    
    pointer.style.borderTopColor = targetColor;
    pointer.style.filter = `drop-shadow(0 0 10px ${targetColor})`;
}

function startMiniIdleSpinning() {
    function loop() {
        if (!isMiniSpinning && getActivePlayers().length > 0) {
            miniStartAngle += 0.005;
            drawMiniWheel();
        }
        miniIdleAnimationId = requestAnimationFrame(loop);
    }
    cancelAnimationFrame(idleAnimationId);
    if (idleAnimationId) cancelAnimationFrame(idleAnimationId);
    miniIdleAnimationId = requestAnimationFrame(loop);
}

// 🎡 แอนิเมชันหมุน Mini Wheel สด
function spinMiniWheelTo(winnerIndex, winnerData, currentBaseAngle) {
    const players = getActivePlayers();
    if (isMiniSpinning || !players[winnerIndex]) return;
    isMiniSpinning = true;

    clearWinnerDisplayUI();

    let startTime = null;
    const duration = 10000;
    if (typeof currentBaseAngle === 'number') {
        miniStartAngle = currentBaseAngle;
    }
    const baseAngle = miniStartAngle;
    const numOptions = players.length;
    const arc = (Math.PI * 2) / numOptions;

    const targetAngleOnWheel = Math.PI * 1.5 - (winnerIndex * arc) - (arc / 2);
    const rounds = 12 * Math.PI * 2;
    const totalSpinAngle = rounds + (targetAngleOnWheel - (baseAngle % (Math.PI * 2)));

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOutProgress = 1 - Math.pow(1 - progress, 5);
        miniStartAngle = baseAngle + (easeOutProgress * totalSpinAngle);
        drawMiniWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            const winnerObj = winnerData || players[winnerIndex];
            renderWinnerDataUI(winnerObj);

            if (winnerObj?.name) {
                updateGameState('current_winner_name', winnerObj.name);
            }

            setTimeout(() => {
                isMiniSpinning = false;
            }, 3000);
        }
    }

    requestAnimationFrame(animate);
}

function clearWinnerDisplayUI() {
    document.getElementById('live-winner-name').innerText = "-";
    document.getElementById('live-winner-count').innerText = "-";
    document.getElementById('live-winner-score').innerText = "-";
    const avatarEl = document.getElementById('live-winner-avatar');
    if (avatarEl) {
        avatarEl.innerHTML = `<i class="bi bi-person-fill"></i>`;
        avatarEl.onclick = null;
    }
}

function renderWinnerDataUI(p) {
    if (!p) return;
    const avatarUrl = p.image || p.avatar || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(p.name || 'Winner')}`;
    
    document.getElementById('live-winner-name').innerText = p.name || '-';
    document.getElementById('live-winner-count').innerText = `${p.spunCount || p.spin_count || 0} ครั้ง`;
    document.getElementById('live-winner-score').innerText = `${p.score || 0} แต้ม`;
    
    const avatarEl = document.getElementById('live-winner-avatar');
    if (avatarEl) {
        avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">`;
        avatarEl.onclick = () => {
            if (typeof openPhotoZoom === 'function') {
                openPhotoZoom(avatarUrl, `🎉 ผู้โชคดี: ${p.name || ''}`);
            }
        };
    }
}

// ➕➖ เพิ่ม/ลด คะแนนด่วนให้ผู้สุ่มได้รอบนี้
async function adjustCurrentWinnerScore(amount) {
    const currentWinnerName = gameStates['current_winner_name'];
    if (!currentWinnerName) return;

    const players = getActivePlayers();
    const winnerIndex = players.findIndex(p => p.name === currentWinnerName);

    if (winnerIndex !== -1) {
        players[winnerIndex].score = Math.max(0, (players[winnerIndex].score || 0) + amount);
        
        await saveActivePlayers(players);
        renderWinnerDataUI(players[winnerIndex]);

        if (realtimeChannel) {
            realtimeChannel.send({ 
                type: 'broadcast', 
                event: 'update_score',
                payload: { students: players }
            });
        }
    }
}

function initTabTracker() {
    const tabTriggerList = document.querySelectorAll('#pills-tab button[data-bs-toggle="pill"]');
    tabTriggerList.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', (event) => {
            const tabName = event.target.getAttribute('data-tab-name');
            localStorage.setItem('gyver_admin_active_tab', tabName);
        });
    });
}

function restoreActiveTab() {
    const savedTabName = localStorage.getItem('gyver_admin_active_tab');
    if (savedTabName) {
        const targetTabButton = document.querySelector(`#pills-tab button[data-tab-name="${savedTabName}"]`);
        if (targetTabButton && !targetTabButton.classList.contains('active')) {
            const tabInstance = bootstrap.Tab.getOrCreateInstance(targetTabButton);
            tabInstance.show();
        }
    }
}

async function updateGameState(key, value) {
    if (!currentUserId) await getCurrentUser();
    gameStates[key] = value;
    await supabaseClient
        .from('game_state')
        .upsert({ 
            key: key, 
            value: String(value), 
            user_id: currentUserId,
            updated_at: new Date() 
        }, { onConflict: 'key,user_id' });
}

function getActivePlayers() {
    return classRooms[currentClassKey]?.students || [];
}

async function saveActivePlayers(playersArray) {
    if (!currentUserId) await getCurrentUser();
    if (!classRooms[currentClassKey]) return;

    classRooms[currentClassKey].students = playersArray;
    const classId = classRooms[currentClassKey].id;

    if (classId) {
        await supabaseClient
            .from('classrooms')
            .update({ students: playersArray })
            .eq('id', classId);
    }
}

function renderAllSelects() {
    const keys = Object.keys(classRooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const quizKeys = Object.keys(quizSubjects).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const mClass = document.getElementById('monitor-class-select');
    const cClass = document.getElementById('current-class-select');
    const mSub = document.getElementById('monitor-subject-select');
    const cSub = document.getElementById('current-quiz-subject-select');

    const classOptions = keys.length > 0 ? keys.map(k => `<option value="${k}" ${k === currentClassKey ? 'selected' : ''}>🏫 ห้อง: ${k}</option>`).join('') : '<option value="">ยังไม่มีห้องเรียน</option>';
    const subOptions = quizKeys.length > 0 ? quizKeys.map(k => `<option value="${k}" ${k === currentQuizSubjectKey ? 'selected' : ''}>📚 วิชา: ${k}</option>`).join('') : '<option value="">ยังไม่มีวิชา</option>';

    if(mClass) mClass.innerHTML = classOptions;
    if(cClass) cClass.innerHTML = keys.length > 0 ? keys.map(k => `<option value="${k}" ${k === currentClassKey ? 'selected' : ''}>${k}</option>`).join('') : '<option value="">ยังไม่มีห้องเรียน</option>';
    if(mSub) mSub.innerHTML = subOptions;
    if(cSub) cSub.innerHTML = quizKeys.length > 0 ? quizKeys.map(k => `<option value="${k}" ${k === currentQuizSubjectKey ? 'selected' : ''}>${k}</option>`).join('') : '<option value="">ยังไม่มีวิชา</option>';
}

function renderTargetWinnerOptions() {
    const targetSelect = document.getElementById('target-winner-select');
    if (!targetSelect) return;

    const players = getActivePlayers();
    if (players.length === 0) {
        targetSelect.innerHTML = `<option value="">-- ไม่พบนักเรียนในห้องนี้ --</option>`;
        return;
    }

    let optionsHtml = `<option value="">🎲 สุ่มตามธรรมชาติ (Auto)</option>`;
    optionsHtml += players.map((p, idx) => `
        <option value="${idx}">🎯 ล็อกเป้า: ${p.name || 'ไม่มีชื่อ'}</option>
    `).join('');

    targetSelect.innerHTML = optionsHtml;
}

function renderSpecificQuizOptions() {
    const selectQuiz = document.getElementById('select-specific-quiz');
    if (!selectQuiz) return;

    if (questions.length === 0) {
        selectQuiz.innerHTML = `<option value="">-- ไม่พบคำถามในวิชานี้ --</option>`;
        return;
    }

    let optionsHtml = `<option value="">-- สุ่มคำถามอัตโนมัติ --</option>`;
    optionsHtml += questions.map((q, idx) => `
        <option value="${idx}">ข้อ ${idx + 1}: ${q.q.substring(0, 25)}...</option>
    `).join('');

    selectQuiz.innerHTML = optionsHtml;
}

async function syncClassFromMonitor(selectedKey) {
    if (!selectedKey) return;
    currentClassKey = selectedKey;
    await updateGameState('current_class_key', selectedKey);
    renderTargetWinnerOptions();
    drawMiniWheel();
    initSupabaseRealtime(); 
    if(realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'class_changed', payload: { key: selectedKey } });
    loadData();
}

async function syncSubjectFromMonitor(selectedKey) {
    if (!selectedKey) return;
    currentQuizSubjectKey = selectedKey;
    await updateGameState('current_quiz_subject_key', selectedKey);
    renderSpecificQuizOptions();
    if(realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'subject_changed', payload: { key: selectedKey } });
    loadData();
}

function changeClassRoom(val) { syncClassFromMonitor(val); }
function changeQuizSubject(val) { syncSubjectFromMonitor(val); }

async function createNewClassRoom() {
    const room = document.getElementById('new-room-name').value.trim();
    if(!room) return alert('กรอกชื่อห้องเรียนด้วยครับ!');
    if(classRooms[room]) return alert('ห้องนี้มีอยู่ในระบบแล้วครับ!');

    if (!currentUserId) await getCurrentUser();

    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabaseClient
        .from('classrooms')
        .insert({ 
            class_name: room, 
            room_code: randomCode,
            students: [],
            teacher_id: currentUserId 
        })
        .select()
        .single();

    if (!error && data) {
        await syncClassFromMonitor(room);
        document.getElementById('new-room-name').value = '';
    }
}

async function deleteCurrentClassRoom() {
    if(Object.keys(classRooms).length <= 1) return alert('ต้องมีห้องเรียนเหลืออยู่อย่างน้อย 1 ห้องครับ');
    if(!confirm(`⚠️ คุณแน่ใจใช่ไหมที่จะลบห้อง "${currentClassKey}" และรายชื่อทั้งหมดถาวร?`)) return;

    if (!currentUserId) await getCurrentUser();
    const classId = classRooms[currentClassKey]?.id;

    if (classId) {
        await supabaseClient
            .from('classrooms')
            .delete()
            .eq('id', classId);
    }

    const nextKey = Object.keys(classRooms).filter(k => k !== currentClassKey)[0];
    await syncClassFromMonitor(nextKey);
}

async function handleQuizSubjectSubmit() {
    const name = document.getElementById('quiz-sub-name').value.trim();
    const content = document.getElementById('quiz-sub-content').value.trim();
    const room = document.getElementById('quiz-sub-room').value.trim();
    const oldKeyInput = document.getElementById('edit-subject-old-key');
    const oldKey = oldKeyInput.value;

    if(!name || !content || !room) return alert('กรอกข้อมูลรายวิชาให้ครบถ้วนก่อนครับ!');
    const combinedKey = `${name} - ${content} - ${room}`;

    if (!currentUserId) await getCurrentUser();

    if (oldKey === "") {
        if(quizSubjects[combinedKey]) return alert('วิชานี้มีในระบบอยู่แล้วครับ!');
        await supabaseClient
            .from('quiz_subjects')
            .insert({ 
                subject_key: combinedKey, 
                questions: [],
                user_id: currentUserId 
            });
        await syncSubjectFromMonitor(combinedKey);
    } else {
        if(oldKey !== combinedKey && quizSubjects[combinedKey]) return alert('ชื่อรายวิชาใหม่นี้ไปซ้ำกับวิชาอื่นที่มีอยู่แล้วครับ!');
        
        const currentQuestionsArray = quizSubjects[oldKey] || [];
        await supabaseClient
            .from('quiz_subjects')
            .upsert({ 
                subject_key: combinedKey, 
                questions: currentQuestionsArray,
                user_id: currentUserId 
            }, { onConflict: 'subject_key,user_id' });

        if (oldKey !== combinedKey) {
            await supabaseClient
                .from('quiz_subjects')
                .delete()
                .eq('subject_key', oldKey)
                .eq('user_id', currentUserId);
        }
        await syncSubjectFromMonitor(combinedKey);
    }

    cancelEditQuizSubject();
    loadData();
}

function startEditQuizSubject() {
    if (!currentQuizSubjectKey) return;
    const parts = currentQuizSubjectKey.split(' - ');
    if (parts.length < 3) return alert('รูปแบบข้อมูลวิชาเดิมไม่รองรับการแก้ไขด่วนแบบแยกช่องครับ');

    document.getElementById('edit-subject-old-key').value = currentQuizSubjectKey;
    document.getElementById('quiz-sub-name').value = parts[0];
    document.getElementById('quiz-sub-content').value = parts[1];
    document.getElementById('quiz-sub-room').value = parts[2];

    document.getElementById('quiz-sub-submit-btn').innerHTML = `<i class="bi bi-floppy-fill me-1"></i>บันทึกการแก้ไข`;
    document.getElementById('quiz-sub-submit-btn').className = "btn btn-warning text-dark fw-bold btn-sm flex-grow-1";
    document.getElementById('quiz-sub-cancel-btn').classList.remove('d-none');
}

function cancelEditQuizSubject() {
    document.getElementById('edit-subject-old-key').value = "";
    document.getElementById('quiz-sub-name').value = "";
    document.getElementById('quiz-sub-content').value = "";
    document.getElementById('quiz-sub-room').value = "";

    document.getElementById('quiz-sub-submit-btn').innerHTML = `<i class="bi bi-plus-square me-1"></i>เพิ่มรายวิชา`;
    document.getElementById('quiz-sub-submit-btn').className = "btn btn-warning text-dark fw-bold btn-sm flex-grow-1";
    document.getElementById('quiz-sub-cancel-btn').classList.add('d-none');
}

async function deleteCurrentQuizSubject() {
    if(Object.keys(quizSubjects).length <= 1) return alert('ต้องมีวิชาเหลืออยู่อย่างน้อย 1 วิชาครับ');
    if(!confirm(`⚠️ แน่ใจใช่ไหมที่จะลบวิชา "${currentQuizSubjectKey}" และโจทย์ทั้งหมดถาวร?`)) return;

    if (!currentUserId) await getCurrentUser();

    await supabaseClient
        .from('quiz_subjects')
        .delete()
        .eq('subject_key', currentQuizSubjectKey)
        .eq('user_id', currentUserId);

    const nextKey = Object.keys(quizSubjects).filter(k => k !== currentQuizSubjectKey)[0];
    await syncSubjectFromMonitor(nextKey);
}

async function saveQuizData() {
    if (!currentUserId) await getCurrentUser();
    await supabaseClient
        .from('quiz_subjects')
        .upsert({ 
            subject_key: currentQuizSubjectKey, 
            questions: questions,
            user_id: currentUserId 
        }, { onConflict: 'subject_key,user_id' });
}

async function triggerRemoteAction(eventName, payload = {}) {
    await updateGameState(`remote_${eventName}_trigger`, Date.now().toString());
    if(realtimeChannel) {
        realtimeChannel.send({ type: 'broadcast', event: eventName, payload: payload });
    }
}

// 🎯 เมื่อครูเปลี่ยนการเลือกล็อกเป้าใน Dropdown
document.getElementById('target-winner-select')?.addEventListener('change', async function(e) {
    const val = e.target.value;
    await updateGameState('target_winner_index', val !== "" ? val : '-1');
    if (realtimeChannel) {
        realtimeChannel.send({ 
            type: 'broadcast', 
            event: 'target_changed',
            payload: { targetIndex: val !== "" ? parseInt(val) : -1 }
        });
    }
});

// 🎯 ปุ่มสั่งหมุนวงล้อ
document.getElementById('remote-spin-btn')?.addEventListener('click', async function() {
    const currentStep = gameStates['current_step'] || 'ready';
    
    if (currentStep !== 'ready') return;

    const players = getActivePlayers();
    if (players.length === 0) return alert('ห้องนี้ยังไม่มีรายชื่อนักเรียนครับ!');
    
    const targetSelect = document.getElementById('target-winner-select');
    let selectedIndex = -1;

    if (targetSelect && targetSelect.value !== "") {
        selectedIndex = parseInt(targetSelect.value);
    } else {
        selectedIndex = Math.floor(Math.random() * players.length);
    }

    const winner = players[selectedIndex];

    const currentBaseAngle = miniStartAngle;
    spinMiniWheelTo(selectedIndex, winner);

    await updateGameState('current_winner_name', winner.name || '');
    await updateGameState('current_active_quiz', 'null');
    await updateGameState('selected_choice_idx', 'null');
    await updateGameState('quiz_submitted', 'false');
    await updateGameState('current_step', 'spinning');

    triggerRemoteAction('spin_trigger', { targetIndex: selectedIndex, baseAngle: currentBaseAngle, winner_id: winner.id, winner_name: winner.name });
});

document.getElementById('remote-quiz-btn')?.addEventListener('click', async function() {
    if (questions.length === 0) return alert('คลังคำถามวิชานี้ว่างอยู่ครับ!');
    const randomIndex = Math.floor(Math.random() * questions.length);
    sendQuizByIndex(randomIndex);
});

function triggerSpecificQuiz(quizIndexVal) {
    if (quizIndexVal === "") return;
    const index = parseInt(quizIndexVal);
    if (!isNaN(index) && questions[index]) {
        sendQuizByIndex(index);
    }
}

// 🎯 ส่งคำถามตรงกันทั้งครูและนักเรียน 100%
async function sendQuizByIndex(quizIndex) {
    highlightAdminChoice(null);

    const rawQuestion = questions[quizIndex];
    
    const quizPayload = { 
        q: rawQuestion.q, 
        choices: rawQuestion.choices, 
        correct: rawQuestion.correct 
    };

    await updateGameState('current_active_quiz', JSON.stringify(quizPayload));
    await updateGameState('selected_choice_idx', 'null');
    await updateGameState('quiz_submitted', 'false');
    await updateGameState('current_step', 'quiz_visible');

    triggerRemoteAction('quiz', { quiz: quizPayload });
    setTimeout(() => { syncLiveMonitorUI(); }, 100);
}

function remoteConfirmAnswer() { triggerRemoteAction('confirm'); }

async function remoteSkipTurn() { 
    await remoteResetWindow();
    triggerRemoteAction('skip'); 
}

// 🔄 รีเซ็ตหน้าจอมอนิเตอร์ครูกลับสู่ค่าเริ่มต้น (ล้างการล็อกเป้า + เลือกคำถามด่วน)
async function remoteResetWindow() { 
    await updateGameState('current_step', 'ready');
    await updateGameState('current_winner_name', '');
    await updateGameState('current_active_quiz', 'null');
    await updateGameState('selected_choice_idx', 'null');
    await updateGameState('quiz_submitted', 'false');
    await updateGameState('target_winner_index', '-1');
    
    // 🧹 ล้างค่า Dropdown ล็อกเป้า และ Dropdown เลือกคำถามให้เป็น Default ("")
    const targetSelect = document.getElementById('target-winner-select');
    if (targetSelect) targetSelect.value = "";

    const quizSelect = document.getElementById('select-specific-quiz');
    if (quizSelect) quizSelect.value = "";

    clearWinnerDisplayUI();
    highlightAdminChoice(null);
    syncLiveMonitorUI();
}

async function remoteSelectChoice(index) {
    if(gameStates['quiz_submitted'] === 'true') return;
    await updateGameState('selected_choice_idx', index);
    triggerRemoteAction('select_choice', { index: index });
    highlightAdminChoice(index);
}

function highlightAdminChoice(selectedIndex) {
    const activeQuiz = gameStates['current_active_quiz'] && gameStates['current_active_quiz'] !== 'null' ? JSON.parse(gameStates['current_active_quiz']) : null;
    const correctIdx = activeQuiz ? activeQuiz.correct : null;
    const isSubmitted = gameStates['quiz_submitted'] === 'true';

    for(let i = 0; i <= 3; i++) {
        const btn = document.getElementById(`admin-choice-${i}`);
        if(btn) {
            btn.className = "btn-choice-admin";
            btn.style.border = "none";
            btn.style.borderLeft = "4px solid #00f0ff";

            if(selectedIndex !== null && i === selectedIndex) {
                btn.classList.add('active-selected');
            }

            if(activeQuiz && i === correctIdx && !isSubmitted) {
                btn.style.border = "2px dashed #ffbe0b";
                btn.style.borderLeft = "6px solid #ffbe0b";
            }

            if(activeQuiz && i === correctIdx && isSubmitted) {
                btn.style.border = "3px solid #06d6a0";
                btn.style.borderLeft = "6px solid #06d6a0";
            }
        }
    }
}

function syncLiveMonitorUI() {
    const currentWinnerName = gameStates['current_winner_name'] || "";
    const selectedChoice = (gameStates['selected_choice_idx'] && gameStates['selected_choice_idx'] !== 'null') ? parseInt(gameStates['selected_choice_idx']) : null;
    const currentStep = gameStates['current_step'] || 'ready';
    
    const stepBadge = document.getElementById('monitor-step-badge');
    const spinBtn = document.getElementById('remote-spin-btn');
    const players = getActivePlayers();

    const tag = document.getElementById('monitor-active-subject-tag');
    if(tag) tag.innerText = `📖 วิชาที่ใช้สุ่ม: ${currentQuizSubjectKey}`;

    const stepsConfig = {
        'ready': { 
            text: "🟢 พร้อมสุ่มรอบต่อไป", 
            badgeClass: "bg-success text-white border-success",
            canSpin: true
        },
        'spinning': { 
            text: "🌀 กำลังหมุนลุ้นผู้โชคดี...", 
            badgeClass: "bg-warning text-dark border-warning",
            canSpin: false
        },
        'winner_selected': { 
            text: "🟡 นักเรียนกำลังดูป๊อปอัปผู้โชคดี", 
            badgeClass: "bg-info text-dark border-info",
            canSpin: false
        },
        'quiz_visible': { 
            text: "🔴 นักเรียนกำลังทำโจทย์คำถาม", 
            badgeClass: "bg-primary text-white border-primary",
            canSpin: false
        },
        'answered': { 
            text: "🟣 นักเรียนกำลังดูเฉลยผลลัพธ์", 
            badgeClass: "bg-danger text-white border-danger",
            canSpin: false
        }
    };

    const currentConfig = stepsConfig[currentStep] || stepsConfig['ready'];
    
    if (stepBadge) {
        stepBadge.innerText = currentConfig.text;
        stepBadge.className = `badge ${currentConfig.badgeClass} px-3 py-2 font-mono fs-6 shadow-sm`;
    }

    if (spinBtn) {
        if (currentConfig.canSpin) {
            spinBtn.disabled = false;
            spinBtn.title = "สั่งหมุนวงล้อสุ่มผู้โชคดี";
            spinBtn.className = "btn btn-pink-gradient w-100 py-3 fw-bold fs-5 shadow";
        } else {
            spinBtn.disabled = true;
            spinBtn.title = "ไม่สามารถสั่งหมุนได้ เนื่องจากหน้านักเรียนยังคงค้างอยู่ในขั้นตอนอื่น";
            spinBtn.className = "btn btn-disabled-gray w-100 py-3 fw-bold fs-5 shadow";
        }
    }

    if(currentWinnerName && !isMiniSpinning) {
        const p = players.find(player => player.name === currentWinnerName);
        if(p) {
            renderWinnerDataUI(p);
        }
    } else if (!isMiniSpinning) {
        clearWinnerDisplayUI();
    }

    const activeQuiz = gameStates['current_active_quiz'] && gameStates['current_active_quiz'] !== 'null' ? JSON.parse(gameStates['current_active_quiz']) : null;
    if(activeQuiz && (currentStep === 'quiz_visible' || currentStep === 'answered')) {
        document.getElementById('live-quiz-text').innerText = activeQuiz.q;
        activeQuiz.choices.forEach((choice, idx) => {
            const btn = document.getElementById(`admin-choice-${idx}`);
            if(btn) btn.innerText = `${idx + 1}. ${choice}`;
        });
        highlightAdminChoice(selectedChoice);
    } else {
        highlightAdminChoice(null);
        document.getElementById('live-quiz-text').innerText = questions.length > 0 ? "คำถามพร้อมแล้ว กด 'สุ่มคำถาม' หรือเลือกระบุข้อได้เลย! 🚀" : "ไม่มีคำถามสำหรับรอบนี้";
        for(let i = 0; i <= 3; i++) {
            const btn = document.getElementById(`admin-choice-${i}`);
            if(btn) btn.innerText = `${i + 1}. `;
        }
    }
}

function startEditPlayer(index) {
    const players = getActivePlayers();
    const target = players[index];
    if (!target) return;

    document.getElementById('edit-player-index').value = index;
    document.getElementById('player-name').value = target.name;
    document.getElementById('delete-current-image-flag').value = "false"; 
    
    document.getElementById('player-form-title').innerHTML = `<i class="bi bi-pencil-square me-2"></i>กำลังแก้ไขข้อมูล: ${target.name}`;
    document.getElementById('player-submit-btn').innerText = "บันทึกข้อมูล";
    document.getElementById('player-cancel-edit-btn').classList.remove('d-none');
}

function cancelEditPlayer() {
    document.getElementById('edit-player-index').value = "";
    document.getElementById('delete-current-image-flag').value = "false";
    document.getElementById('player-name').value = "";
    document.getElementById('player-img').value = "";
    document.getElementById('player-form-title').innerHTML = `<i class="bi bi-person-plus-fill me-2"></i>เพิ่มนักเรียนใหม่`;
    document.getElementById('player-submit-btn').innerText = "เพิ่มชื่อ";
    document.getElementById('player-cancel-edit-btn').classList.add('d-none');
}

document.getElementById('player-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const nameInput = document.getElementById('player-name');
    const editIndexInput = document.getElementById('edit-player-index');
    const name = nameInput.value.trim();
    const players = getActivePlayers();
    const editIndex = editIndexInput.value;

    if (editIndex === "") {
        if(players.some(p => p.name === name)) return alert('ชื่อนี้ซ้ำกันในห้องนี้แล้วครับ!');
        players.push({ name: name, score: 0, spunCount: 0, image: `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(name)}` });
    } else {
        const idx = parseInt(editIndex);
        players[idx].name = name;
    }

    await saveActivePlayers(players); 
    cancelEditPlayer(); 
    loadData(); 
});

function renderPlayers() {
    const players = getActivePlayers();
    const countEl = document.getElementById('player-count');
    if (countEl) countEl.innerText = players.length;
    
    const list = document.getElementById('player-list');
    if(!list) return;
    if(players.length === 0) {
        list.innerHTML = `<li class="list-group-item text-center text-subtle list-item-cyber py-3">ยังไม่มีรายชื่อนักเรียนในห้องนี้</li>`;
        return;
    }
    list.innerHTML = players.map((p, i) => {
        let avatarUrl = p.image || p.avatar || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(p.name)}`;
        return `
            <li class="list-group-item list-item-cyber d-flex justify-content-between align-items-center p-3 rounded-3">
                <div class="d-flex align-items-center gap-3">
                    <img src="${avatarUrl}" class="admin-avatar">
                    <div>
                        <h5 class="m-0 fw-bold text-cyan">${p.name}</h5>
                        <div class="mt-1">
                            <span class="badge bg-dark border border-secondary text-subtle me-1">โดนสุ่ม: <strong>${p.spunCount || p.spin_count || 0}</strong> ครั้ง</span>
                            <span class="badge bg-dark border border-warning text-warning">คะแนน: <strong>${p.score || 0}</strong> แต้ม</span>
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-danger px-2 py-1 fw-bold" type="button" onclick="adjustStat(${i}, 'score', -1)"><i class="bi bi-dash-circle"></i></button>
                        <button class="btn btn-outline-success px-2 py-1 fw-bold" type="button" onclick="adjustStat(${i}, 'score', 1)"><i class="bi bi-plus-circle"></i></button>
                    </div>
                    <button class="btn btn-sm btn-warning px-3 ms-1 text-dark fw-bold" type="button" onclick="startEditPlayer(${i})"><i class="bi bi-pencil-fill"></i></button>
                    <button class="btn btn-sm btn-danger px-3" type="button" onclick="deletePlayer(${i})"><i class="bi bi-trash-fill"></i></button>
                </div>
            </li>
        `;
    }).join('');
}

async function adjustStat(index, key, amount) {
    const players = getActivePlayers();
    if(key === 'score') players[index].score = Math.max(0, (players[index].score || 0) + amount); 
    await saveActivePlayers(players);
    if(realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'update_score' });
    loadData();
}

async function deletePlayer(index) {
    let players = getActivePlayers();
    if(!confirm('ยืนยันที่จะลบนักเรียนคนนี้ออกใช่ไหม?')) return;
    players.splice(index, 1);
    await saveActivePlayers(players);
    loadData();
}

async function resetAllScores() {
    let players = getActivePlayers();
    if(!confirm('รีเซ็ตคะแนนและจำนวนสุ่มทุกคนในห้องนี้เป็น 0 ใช่ไหม?')) return;
    players = players.map(p => ({...p, score: 0, spunCount: 0}));
    await saveActivePlayers(players);
    if(realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'update_score' });
    loadData();
}

document.getElementById('quiz-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('quiz-q').value.trim();
    const choices = [
        document.getElementById('choice-0').value.trim(), 
        document.getElementById('choice-1').value.trim(), 
        document.getElementById('choice-2').value.trim(), 
        document.getElementById('choice-3').value.trim()
    ];
    const correct = parseInt(document.getElementById('correct-choice').value);
    const editIndexInput = document.getElementById('edit-quiz-index');
    const editIndex = editIndexInput.value;
    
    if (editIndex === "") {
        questions.push({ q, choices, correct });
    } else {
        const idx = parseInt(editIndex);
        questions[idx] = { q, choices, correct };
    }
    
    await saveQuizData();
    cancelEditQuiz(); 
    loadData();
});

function renderQuizzes() {
    const countEl = document.getElementById('q-count');
    if (countEl) countEl.innerText = questions.length;

    const list = document.getElementById('quiz-list');
    if(!list) return;
    if(questions.length === 0) {
        list.innerHTML = `<div class="list-group-item text-center text-subtle list-item-cyber py-3">ยังไม่มีโจทย์คำถามในวิชานี้</div>`;
        return;
    }
    list.innerHTML = questions.map((q, i) => `
        <div class="list-group-item list-item-cyber p-3 rounded-3">
            <div class="d-flex justify-content-between align-items-start">
                <div style="width: 80%;">
                    <span class="badge bg-warning text-dark mb-2">ข้อที่ ${i+1}</span>
                    <h5 class="fw-bold text-white mb-2">${q.q}</h5>
                    <div class="row g-2 small text-subtle">
                        ${q.choices.map((c, idx) => `
                            <div class="col-6 ${idx === q.correct ? 'text-cyan fw-bold' : ''}">
                                ${idx + 1}. <span>${c}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function cancelEditQuiz() {
    document.getElementById('edit-quiz-index').value = "";
    document.getElementById('quiz-form').reset();
}

// 📡 10. ฟัง Realtime Broadcast สัญญาณสดจากฝั่งนักเรียน
function initSupabaseRealtime() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const currentRoom = classRooms[currentClassKey];
    const channelName = currentRoom?.code ? `room_${currentRoom.code}` : (currentRoom?.id ? `room_${currentRoom.id}` : 'room_global');

    if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);

    realtimeChannel = supabaseClient.channel(channelName);

    realtimeChannel.on('broadcast', { event: 'spin_trigger' }, (payload) => {
        if (payload && payload.payload && !isMiniSpinning) {
            const targetIndex = payload.payload.targetIndex;
            const baseAngle = payload.payload.baseAngle;
            const winnerObj = payload.payload.winner;

            if (typeof targetIndex === 'number' && targetIndex !== -1) {
                spinMiniWheelTo(targetIndex, winnerObj, baseAngle);
            }
        }
    })
    .on('broadcast', { event: 'student_selected_choice' }, (payload) => {
        if (payload && payload.payload && typeof payload.payload.index === 'number') {
            const idx = payload.payload.index;
            gameStates['selected_choice_idx'] = String(idx);
            highlightAdminChoice(idx);
        }
    })
    // 🎯 เพิ่มการดักฟังเมื่อนักเรียนกดสุ่มคำถามจาก Pop-up ฝั่งนักเรียน
    .on('broadcast', { event: 'quiz' }, (payload) => {
        if (payload && payload.payload && payload.payload.quiz) {
            const activeQuiz = payload.payload.quiz;
            gameStates['current_active_quiz'] = JSON.stringify(activeQuiz);
            gameStates['selected_choice_idx'] = 'null';
            gameStates['quiz_submitted'] = 'false';
            gameStates['current_step'] = 'quiz_visible';
            syncLiveMonitorUI();
        }
    })
    .on('broadcast', { event: 'state_changed' }, (payload) => {
        if (payload && payload.payload && payload.payload.step) {
            gameStates['current_step'] = payload.payload.step;
            syncLiveMonitorUI();
        }
    })
    .on('broadcast', { event: 'reset_monitor' }, () => {
        remoteResetWindow();
    });

    realtimeChannel.subscribe();
}

window.onload = async () => {
    await loadData();
    initTabTracker(); 
};