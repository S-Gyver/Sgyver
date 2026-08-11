// ดึง instance window.supabaseClient จากไฟล์ assets/js/supabaseClient.js
let classRooms = {}; 
let currentClassKey = ""; 
let quizSubjects = {};
let currentQuizSubjectKey = "";
let questions = [];
let gameStates = {};
let realtimeChannel = null;
let currentUserId = null; // 🔑 ตัวแปรเก็บ user_id

async function getCurrentUser() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session && session.user) {
        currentUserId = session.user.id;
    }
    return currentUserId;
}

async function loadData() {
    try {
        await getCurrentUser();
        if (!currentUserId) return;

        // 🔒 กรองดึงเฉพาะ class_rooms ของผู้ใช้ปัจจุบัน
        const { data: classesData } = await window.supabaseClient
            .from('class_rooms')
            .select('*')
            .eq('user_id', currentUserId);

        classRooms = {};
        if (classesData && classesData.length > 0) {
            classesData.forEach(c => { classRooms[c.class_key] = c.players; });
        }

        // 🔒 กรองดึงเฉพาะ quiz_subjects ของผู้ใช้ปัจจุบัน
        const { data: subjectsData } = await window.supabaseClient
            .from('quiz_subjects')
            .select('*')
            .eq('user_id', currentUserId);

        quizSubjects = {};
        if (subjectsData && subjectsData.length > 0) {
            subjectsData.forEach(s => { quizSubjects[s.subject_key] = s.questions; });
        }

        // 🔒 กรองดึงเฉพาะ game_state ของผู้ใช้ปัจจุบัน
        const { data: statesData } = await window.supabaseClient
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
        renderPlayers();
        renderQuizzes();
        syncLiveMonitorUI();
        restoreActiveTab();

    } catch (err) {
        console.error("Error loading data from Supabase:", err);
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

// 🔒 แนบ user_id ตอนอัปเดต game_state
async function updateGameState(key, value) {
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

function getActivePlayers() {
    return classRooms[currentClassKey] || [];
}

// 🔒 แนบ user_id ตอนบันทึกนักเรียนลงห้องเรียน
async function saveActivePlayers(playersArray) {
    if (!currentUserId) await getCurrentUser();
    classRooms[currentClassKey] = playersArray;
    await window.supabaseClient
        .from('class_rooms')
        .upsert({ 
            class_key: currentClassKey, 
            players: playersArray,
            user_id: currentUserId
        }, { onConflict: 'class_key,user_id' });
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

async function syncClassFromMonitor(selectedKey) {
    if (!selectedKey) return;
    currentClassKey = selectedKey;
    await updateGameState('current_class_key', selectedKey);
    if(realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'class_changed', payload: { key: selectedKey } });
    loadData();
}

async function syncSubjectFromMonitor(selectedKey) {
    if (!selectedKey) return;
    currentQuizSubjectKey = selectedKey;
    await updateGameState('current_quiz_subject_key', selectedKey);
    if(realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'subject_changed', payload: { key: selectedKey } });
    loadData();
}

function changeClassRoom(val) { syncClassFromMonitor(val); }
function changeQuizSubject(val) { syncSubjectFromMonitor(val); }

// 🔒 แนบ user_id ตอนสร้างห้องเรียนใหม่
async function createNewClassRoom() {
    const room = document.getElementById('new-room-name').value.trim();
    if(!room) return alert('กรอกชื่อห้องเรียนด้วยครับ!');
    if(classRooms[room]) return alert('ห้องนี้มีอยู่ในระบบแล้วครับ!');

    if (!currentUserId) await getCurrentUser();

    await window.supabaseClient
        .from('class_rooms')
        .insert({ 
            class_key: room, 
            players: [],
            user_id: currentUserId 
        });

    await syncClassFromMonitor(room);
    document.getElementById('new-room-name').value = '';
}

// 🔒 ลบเฉพาะห้องของผู้ใช้ปัจจุบัน
async function deleteCurrentClassRoom() {
    if(Object.keys(classRooms).length <= 1) return alert('ต้องมีห้องเรียนเหลืออยู่อย่างน้อย 1 ห้องครับ');
    if(!confirm(`⚠️ คุณแน่ใจใช่ไหมที่จะลบห้อง "${currentClassKey}" และรายชื่อทั้งหมดถาวร?`)) return;

    if (!currentUserId) await getCurrentUser();

    await window.supabaseClient
        .from('class_rooms')
        .delete()
        .eq('class_key', currentClassKey)
        .eq('user_id', currentUserId);

    const nextKey = Object.keys(classRooms).filter(k => k !== currentClassKey)[0];
    await syncClassFromMonitor(nextKey);
}

// 🔒 แนบ user_id ตอนบันทึก/แก้ไขชุดวิชา
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
        await window.supabaseClient
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
        await window.supabaseClient
            .from('quiz_subjects')
            .upsert({ 
                subject_key: combinedKey, 
                questions: currentQuestionsArray,
                user_id: currentUserId 
            }, { onConflict: 'subject_key,user_id' });

        if (oldKey !== combinedKey) {
            await window.supabaseClient
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
    document.getElementById('quiz-sub-submit-btn').className = "btn btn-success text-white fw-bold btn-sm flex-grow-1";
    document.getElementById('quiz-sub-cancel-btn').classList.add('d-none');
}

// 🔒 ลบวิชาเฉพาะของผู้ใช้ปัจจุบัน
async function deleteCurrentQuizSubject() {
    if(Object.keys(quizSubjects).length <= 1) return alert('ต้องมีวิชาเหลืออยู่อย่างน้อย 1 วิชาครับ');
    if(!confirm(`⚠️ แน่ใจใช่ไหมที่จะลบวิชา "${currentQuizSubjectKey}" และโจทย์ทั้งหมดถาวร?`)) return;

    if (!currentUserId) await getCurrentUser();

    await window.supabaseClient
        .from('quiz_subjects')
        .delete()
        .eq('subject_key', currentQuizSubjectKey)
        .eq('user_id', currentUserId);

    const nextKey = Object.keys(quizSubjects).filter(k => k !== currentQuizSubjectKey)[0];
    await syncSubjectFromMonitor(nextKey);
}

// 🔒 แนบ user_id ตอนเซฟคำถาม
async function saveQuizData() {
    if (!currentUserId) await getCurrentUser();
    await window.supabaseClient
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

document.getElementById('remote-spin-btn')?.addEventListener('click', async function() {
    if (getActivePlayers().length === 0) return alert('ห้องนี้ยังไม่มีรายชื่อนักเรียนครับ!');
    document.getElementById('remote-status-text').innerText = "กำลังส่งคำสั่งหมุน...";
    document.getElementById('remote-status-text').className = "badge bg-warning text-dark px-3 py-2 fw-bold";
    document.getElementById('remote-spin-btn').disabled = true;
    
    await updateGameState('current_winner_name', '');
    await updateGameState('current_active_quiz', 'null');
    await updateGameState('selected_choice_idx', 'null');
    await updateGameState('quiz_submitted', 'false');
    await updateGameState('current_step', 'spinning');

    triggerRemoteAction('spin');
});

document.getElementById('remote-quiz-btn')?.addEventListener('click', async function() {
    if (questions.length === 0) return alert('คลังคำถามวิชานี้ว่างอยู่ครับ!');
    
    highlightAdminChoice(null);
    document.getElementById('remote-confirm-btn').disabled = true;

    const rawQuestion = questions[Math.floor(Math.random() * questions.length)];
    const mappedChoices = rawQuestion.choices.map((choice, index) => ({ text: choice, isCorrect: index === rawQuestion.correct }));
    
    for (let i = mappedChoices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mappedChoices[i], mappedChoices[j]] = [mappedChoices[j], mappedChoices[i]];
    }
    
    const quizPayload = { 
        q: rawQuestion.q, 
        choices: mappedChoices.map(c => c.text), 
        correct: mappedChoices.findIndex(c => c.isCorrect) 
    };

    await updateGameState('current_active_quiz', JSON.stringify(quizPayload));
    await updateGameState('selected_choice_idx', 'null');
    await updateGameState('quiz_submitted', 'false');
    await updateGameState('current_step', 'quiz_visible');

    triggerRemoteAction('quiz');
    
    setTimeout(() => { loadData(); }, 100);
});

function remoteConfirmAnswer() { triggerRemoteAction('confirm'); }
function remoteSkipTurn() { if(confirm('ต้องการข้ามรอบเล่นใช่ไหม?')) triggerRemoteAction('skip'); }
function remoteResetWindow() { if(confirm('ต้องการบังคับปิดหน้าต่างสุ่มใหม่ใช่ไหม?')) triggerRemoteAction('reset'); }

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
            btn.style.borderLeft = "4px solid #3498db";

            if(selectedIndex !== null && i === selectedIndex) {
                btn.classList.add('active-selected');
            }

            if(activeQuiz && i === correctIdx && !isSubmitted) {
                btn.style.border = "2px dashed #f1c40f";
                btn.style.borderLeft = "6px solid #f1c40f";
            }

            if(activeQuiz && i === correctIdx && isSubmitted) {
                btn.style.border = "3px solid #2ecc71";
                btn.style.borderLeft = "6px solid #2ecc71";
            }
        }
    }
    const confirmBtn = document.getElementById('remote-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = (selectedIndex === null || isSubmitted);
}

function formatAdminQuizPreview(text) {
    if (!text) return "";
    return text.includes('\n') ? `<div>${text.split('\n')[0]}</div><pre>${text.split('\n').slice(1).join('\n')}</pre>` : text;
}

function syncLiveMonitorUI() {
    const currentWinnerName = gameStates['current_winner_name'] || "";
    const selectedChoice = (gameStates['selected_choice_idx'] && gameStates['selected_choice_idx'] !== 'null') ? parseInt(gameStates['selected_choice_idx']) : null;
    const isSubmitted = gameStates['quiz_submitted'] === 'true';
    const currentStep = gameStates['current_step'] || 'ready';
    
    const statusBadge = document.getElementById('remote-status-text');
    const spinBtn = document.getElementById('remote-spin-btn');
    const players = getActivePlayers();

    const tag = document.getElementById('monitor-active-subject-tag');
    if(tag) tag.innerText = `📖 วิชาที่ใช้สุ่ม: ${currentQuizSubjectKey}`;

    const stepsConfig = {
        'ready': { text: "พร้อมสั่งการ", class: "bg-success", spinDisable: false },
        'spinning': { text: "กำลังหมุนลุ้นชื่อ...", class: "bg-warning text-dark", spinDisable: true },
        'winner_selected': { text: "ได้ผู้โชคดี/รอเปิดโจทย์", class: "bg-info text-dark", spinDisable: true },
        'quiz_visible': { text: "ผู้เล่นกำลังเลือกคำตอบ", class: "bg-primary", spinDisable: true },
        'answered': { text: "ตอบเสร็จแล้ว/รอจัดการชื่อ", class: "bg-danger", spinDisable: true }
    };

    if(statusBadge && stepsConfig[currentStep]) {
        statusBadge.innerText = stepsConfig[currentStep].text;
        statusBadge.className = `badge ${stepsConfig[currentStep].class} px-3 py-2 fw-bold`;
        if (spinBtn) spinBtn.disabled = stepsConfig[currentStep].spinDisable;
    }

    if(currentWinnerName) {
        const p = players.find(player => player.name === currentWinnerName);
        if(p) {
            document.getElementById('live-winner-name').innerText = p.name;
            document.getElementById('live-winner-count').innerText = `${p.spunCount || 0} ครั้ง`;
            document.getElementById('live-winner-score').innerText = `${p.score} แต้ม`;
            document.getElementById('live-winner-avatar').innerHTML = p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">` : `<i class="bi bi-person-fill"></i>`;
        }
    } else {
        document.getElementById('live-winner-name').innerText = "-";
        document.getElementById('live-winner-count').innerText = "-";
        document.getElementById('live-winner-score').innerText = "-";
        document.getElementById('live-winner-avatar').innerHTML = `<i class="bi bi-person-fill"></i>`;
    }

    const activeQuiz = gameStates['current_active_quiz'] && gameStates['current_active_quiz'] !== 'null' ? JSON.parse(gameStates['current_active_quiz']) : null;
    if(activeQuiz) {
        document.getElementById('live-quiz-text').innerHTML = formatAdminQuizPreview(activeQuiz.q);
        activeQuiz.choices.forEach((choice, idx) => {
            const btn = document.getElementById(`admin-choice-${idx}`);
            const hintText = (idx === activeQuiz.correct) ? "  " : "";
            if(btn) btn.innerText = `${idx + 1}. ${choice}${hintText}`;
        });
        highlightAdminChoice(selectedChoice);
    } else {
        highlightAdminChoice(null);
        resetQuizMonitorFields(questions.length > 0 ? "คำถามในชุดวิชานี้พร้อมแล้ว กดปุ่ม 'สุ่มคำถาม' ได้เลย! 🚀" : "ไม่มีคำถามสำหรับรอบนี้ (ชุดวิชานี้คลังว่าง)");
    }

    if(isSubmitted) {
        const confirmBtn = document.getElementById('remote-confirm-btn');
        if (confirmBtn) confirmBtn.disabled = true;
    }
}

function resetQuizMonitorFields(text) {
    document.getElementById('live-quiz-text').innerText = text;
    for(let idx = 0; idx <= 3; idx++) {
        const btn = document.getElementById(`admin-choice-${idx}`);
        if(btn) {
            btn.innerText = `${idx + 1}. `;
            btn.className = "btn-choice-admin";
            btn.style.border = "none";
            btn.style.borderLeft = "4px solid #3498db";
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
    document.getElementById('player-img-label').innerText = "เปลี่ยนรูปโปรไฟล์ใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)";
    document.getElementById('player-cancel-edit-btn').classList.remove('d-none');

    const previewZone = document.getElementById('edit-preview-zone');
    const deleteImgBtn = document.getElementById('player-delete-img-btn');
    
    if (target.image) {
        if(previewZone) {
            previewZone.innerHTML = `<img src="${target.image}" style="width:38px; height:38px; object-fit:cover; border-radius:6px; border:1px solid #b862cd;">`;
            previewZone.classList.remove('d-none');
        }
        if(deleteImgBtn) deleteImgBtn.classList.remove('d-none');
    } else {
        if(previewZone) previewZone.classList.add('d-none');
        if(deleteImgBtn) deleteImgBtn.classList.add('d-none');
    }
    
    document.getElementById('player-form').scrollIntoView({ behavior: 'smooth' });
}

function markDeleteImage() {
    if(confirm("ต้องการนำรูปภาพโปรไฟล์เดิมออกใช่หรือไม่?")) {
        document.getElementById('delete-current-image-flag').value = "true";
        document.getElementById('edit-preview-zone').classList.add('d-none');
        document.getElementById('player-delete-img-btn').classList.add('d-none');
        document.getElementById('player-img-label').innerText = "รูปภาพเดิมจะถูกลบออก (เลือกไฟล์ใหม่ได้หากต้องการสลับรูป)";
    }
}

function cancelEditPlayer() {
    document.getElementById('edit-player-index').value = "";
    document.getElementById('delete-current-image-flag').value = "false";
    document.getElementById('player-name').value = "";
    document.getElementById('player-img').value = "";
    document.getElementById('player-form-title').innerHTML = `<i class="bi bi-person-plus-fill me-2"></i>เพิ่มผู้ร่วมสนุกใหม่`;
    document.getElementById('player-submit-btn').innerText = "เพิ่มชื่อ";
    document.getElementById('player-submit-btn').disabled = false;
    document.getElementById('player-img-label').innerText = "รูปโปรไฟล์ (ถ้ามี)";
    document.getElementById('player-cancel-edit-btn').classList.add('d-none');
    
    const previewZone = document.getElementById('edit-preview-zone');
    const deleteImgBtn = document.getElementById('player-delete-img-btn');
    if(previewZone) previewZone.classList.add('d-none');
    if(deleteImgBtn) deleteImgBtn.classList.add('d-none');
}

document.getElementById('player-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const nameInput = document.getElementById('player-name');
    const fileInput = document.getElementById('player-img');
    const editIndexInput = document.getElementById('edit-player-index');
    const deleteFlagInput = document.getElementById('delete-current-image-flag');
    const btnSubmit = document.getElementById('player-submit-btn');
    
    const name = nameInput.value.trim();
    const players = getActivePlayers();
    const editIndex = editIndexInput.value;
    const shouldDeleteImage = deleteFlagInput.value === "true";

    if (editIndex === "") {
        if(players.some(p => p.name === name)) return alert('ชื่อนี้ซ้ำกันในห้องนี้แล้วครับ!');
    } else {
        const idx = parseInt(editIndex);
        if(players.some((p, i) => p.name === name && i !== idx)) return alert('ชื่อนี้ไปซ้ำกับนักเรียนคนอื่นในห้องครับ!');
    }
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังประมวลผล...`;

    let imageUrl = null;
    let oldImageToClean = null; 

    if (editIndex !== "") {
        const currentTmpPlayer = players[parseInt(editIndex)];
        imageUrl = currentTmpPlayer.image;
        if (shouldDeleteImage) {
            oldImageToClean = currentTmpPlayer.image;
            imageUrl = null; 
        }
    }

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const safeRoomName = currentClassKey.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeRoomName}_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            alert(`❌ อัปโหลดรูปภาพล้มเหลว: ${uploadError.message}`);
            btnSubmit.disabled = false;
            btnSubmit.innerText = editIndex === "" ? "เพิ่มชื่อ" : "บันทึกข้อมูล";
            return;
        }

        const { data: publicUrlData } = window.supabaseClient.storage
            .from('avatars')
            .getPublicUrl(fileName);

        if (editIndex !== "" && players[parseInt(editIndex)].image) {
            oldImageToClean = players[parseInt(editIndex)].image;
        }

        imageUrl = publicUrlData.publicUrl;
    }

    if (oldImageToClean) {
        try {
            const urlParts = oldImageToClean.split('/');
            const targetFileName = urlParts[urlParts.length - 1];
            await window.supabaseClient.storage.from('avatars').remove([targetFileName]);
        } catch(err) {
            console.error(err);
        }
    }

    if (editIndex === "") {
        players.push({ name: name, score: 0, spunCount: 0, image: imageUrl });
    } else {
        const idx = parseInt(editIndex);
        players[idx].name = name;
        players[idx].image = imageUrl;
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
        list.innerHTML = `<li class="list-group-item text-center text-muted list-item-custom py-3">ยังไม่มีรายชื่อนักเรียนในห้องนี้ขณะนี้</li>`;
        return;
    }
    list.innerHTML = players.map((p, i) => {
        let imgHtml = p.image ? `<img src="${p.image}" class="admin-avatar">` : `<div class="admin-avatar d-inline-flex align-items-center justify-content-center text-secondary bg-dark fs-4"><i class="bi bi-person"></i></div>`;
        return `
            <li class="list-group-item list-item-custom d-flex justify-content-between align-items-center p-3 rounded">
                <div class="d-flex align-items-center gap-3">
                    ${imgHtml}
                    <div>
                        <h5 class="m-0 fw-bold text-info">${p.name}</h5>
                        <div class="mt-1">
                            <span class="badge bg-secondary badge-stat me-1">โดนสุ่ม: <strong>${p.spunCount || 0}</strong> ครั้ง</span>
                            <span class="badge bg-dark badge-stat text-success">คะแนนสะสม: <strong>${p.score}</strong> แต้ม</span>
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
    if(key === 'score') players[index].score = Math.max(0, players[index].score + amount); 
    await saveActivePlayers(players);
    loadData();
}

async function deletePlayer(index) {
    let players = getActivePlayers();
    if(!confirm('ยืนยันที่จะลบผู้เล่นคนนี้ออกจากระบบใช่ไหม?')) return;
    
    if (players[index].image) {
        try {
            const urlParts = players[index].image.split('/');
            const targetFileName = urlParts[urlParts.length - 1];
            await window.supabaseClient.storage.from('avatars').remove([targetFileName]);
        } catch(e) {
            console.error(e);
        }
    }

    if(players[index].name === gameStates['current_winner_name']) {
        await updateGameState('current_winner_name', '');
        await updateGameState('current_active_quiz', 'null');
    }
    players.splice(index, 1);
    await saveActivePlayers(players);
    loadData();
}

async function resetAllScores() {
    let players = getActivePlayers();
    if(!confirm('คุณแน่ใจไหมที่จะรีเซ็ตคะแนนของห้องนี้ทั้งหมดกลับเป็นศูนย์?')) return;
    players = players.map(p => ({...p, score: 0, spunCount: 0}));
    await updateGameState('current_winner_name', '');
    await updateGameState('current_active_quiz', 'null');
    await saveActivePlayers(players);
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

function startEditQuiz(index) {
    const target = questions[index];
    if (!target) return;

    document.getElementById('edit-quiz-index').value = index;
    document.getElementById('quiz-q').value = target.q;
    document.getElementById('choice-0').value = target.choices[0];
    document.getElementById('choice-1').value = target.choices[1];
    document.getElementById('choice-2').value = target.choices[2];
    document.getElementById('choice-3').value = target.choices[3];
    document.getElementById('correct-choice').value = target.correct;

    document.getElementById('quiz-form-title').innerHTML = `<i class="bi bi-pencil-square me-2"></i>กำลังแก้ไขข้อมูล: ข้อที่ ${index + 1}`;
    document.getElementById('quiz-submit-btn').innerHTML = `<i class="bi bi-floppy-fill me-2"></i>บันทึกการแก้ไขคำถาม`;
    document.getElementById('quiz-submit-btn').className = "btn btn-warning text-dark w-100 fw-bold shadow";
    document.getElementById('quiz-cancel-edit-btn').classList.remove('d-none');
    
    document.getElementById('quiz-form').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditQuiz() {
    document.getElementById('edit-quiz-index').value = "";
    document.getElementById('quiz-form').reset();
    
    document.getElementById('quiz-form-title').innerHTML = `<i class="bi bi-question-square-fill me-2"></i>สร้างโจทย์คำถามใหม่`;
    document.getElementById('quiz-submit-btn').innerHTML = `<i class="bi bi-floppy-fill me-2"></i>บันทึกคำถามเข้าคลังของวิชานี้`;
    document.getElementById('quiz-submit-btn').className = "btn btn-success w-100 fw-bold shadow";
    document.getElementById('quiz-cancel-edit-btn').classList.add('d-none');
}

function renderQuizzes() {
    const countEl = document.getElementById('q-count');
    if (countEl) countEl.innerText = questions.length;

    const list = document.getElementById('quiz-list');
    if(!list) return;
    if(questions.length === 0) {
        list.innerHTML = `<div class="list-group-item text-center text-muted list-item-custom py-3">ยังไม่มีโจทย์คำถามในชุดวิชานี้ขณะนี้</div>`;
        return;
    }
    list.innerHTML = questions.map((q, i) => `
        <div class="list-group-item list-item-custom p-3 rounded">
            <div class="d-flex justify-content-between align-items-start">
                <div style="width: 80%;">
                    <span class="badge bg-success mb-2">ข้อที่ ${i+1}</span>
                    <h5 class="fw-bold text-white mb-2" style="white-space: pre-wrap;">${q.q}</h5>
                    <div class="row g-2 small text-white-50">
                        ${q.choices.map((c, idx) => `
                            <div class="col-6 ${idx === q.correct ? 'text-success fw-bold' : ''}">
                                ${idx + 1}. <span class="quiz-choice-preview-box">${c}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-warning text-dark fw-bold px-3" onclick="startEditQuiz(${i})"><i class="bi bi-pencil-fill"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteQuiz(${i})"><i class="bi bi-trash3-fill"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

async function deleteQuiz(index) {
    if(!confirm('ต้องการลบคำถามข้อนี้ใช่หรือไม่?')) return;
    const editIndex = document.getElementById('edit-quiz-index').value;
    if (editIndex !== "" && parseInt(editIndex) === index) {
        cancelEditQuiz();
    }
    questions.splice(index, 1);
    await saveQuizData();
    loadData();
}

async function logout() { 
    await window.supabaseClient.auth.signOut();
    window.location.href = '../../../index.html'; 
}

function initSupabaseRealtime() {
    window.supabaseClient.channel('admin_state_sync')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, (payload) => {
        if (currentUserId && payload.new.user_id === currentUserId) {
            gameStates[payload.new.key] = payload.new.value;
            if(payload.new.key === 'current_class_key') currentClassKey = payload.new.value;
            if(payload.new.key === 'current_quiz_subject_key') currentQuizSubjectKey = payload.new.value;
            loadData();
        }
    })
    .subscribe();

    realtimeChannel = window.supabaseClient.channel('game_broadcast_room');
    
    realtimeChannel.on('broadcast', { event: 'admin_sync_choice' }, (payload) => {
        highlightAdminChoice(payload.index);
    })
    .on('broadcast', { event: 'student_answered' }, () => {
        loadData();
    }).subscribe();
}

window.onload = () => {
    loadData();
    initSupabaseRealtime();
    initTabTracker(); 
};