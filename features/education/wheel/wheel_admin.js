let classRooms = {}; 
let currentClassKey = ""; 
let quizSubjects = {};
let currentQuizSubjectKey = "";
let questions = [];
let gameStates = {};
let realtimeChannel = null;
let currentUserId = null;

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

        const { data: classesData } = await window.supabaseClient
            .from('class_rooms')
            .select('*')
            .eq('user_id', currentUserId);

        classRooms = {};
        if (classesData && classesData.length > 0) {
            classesData.forEach(c => { classRooms[c.class_key] = c.players; });
        }

        const { data: subjectsData } = await window.supabaseClient
            .from('quiz_subjects')
            .select('*')
            .eq('user_id', currentUserId);

        quizSubjects = {};
        if (subjectsData && subjectsData.length > 0) {
            subjectsData.forEach(s => { quizSubjects[s.subject_key] = s.questions; });
        }

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
            localStorage.setItem('gyver_wheel_active_tab', tabName);
        });
    });
}

function restoreActiveTab() {
    const savedTabName = localStorage.getItem('gyver_wheel_active_tab');
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

async function saveActivePlayers(playersArray) {
    if (!currentUserId) await getCurrentUser();
    classRooms[currentClassKey] = playersArray;

    try {
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
            const { data, error } = await window.supabaseClient
                .from('class_rooms')
                .update({ players: playersArray })
                .eq('class_key', currentClassKey)
                .eq('user_id', currentUserId)
                .select();

            if (!data || data.length === 0) {
                await window.supabaseClient
                    .from('class_rooms')
                    .insert({
                        class_key: currentClassKey,
                        players: playersArray,
                        user_id: currentUserId
                    });
            }

            if (error) console.error("Save players error:", error.message);
        }
    } catch (err) {
        console.error("saveActivePlayers catch error:", err);
    }
}

function renderAllSelects() {
    const keys = Object.keys(classRooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const quizKeys = Object.keys(quizSubjects).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const mClass = document.getElementById('monitor-class-select');
    const cClass = document.getElementById('current-class-select');
    const mSub = document.getElementById('monitor-subject-select');

    if (mClass) mClass.innerHTML = keys.length > 0 ? keys.map(k => `<option value="${k}" ${k === currentClassKey ? 'selected' : ''}>🏫 ห้อง: ${k}</option>`).join('') : '<option value="">ยังไม่มีห้องเรียน</option>';
    if (cClass) cClass.innerHTML = keys.length > 0 ? keys.map(k => `<option value="${k}" ${k === currentClassKey ? 'selected' : ''}>${k}</option>`).join('') : '<option value="">ยังไม่มีห้องเรียน</option>';
    if (mSub) mSub.innerHTML = quizKeys.length > 0 ? quizKeys.map(k => `<option value="${k}" ${k === currentQuizSubjectKey ? 'selected' : ''}>📚 วิชา: ${k}</option>`).join('') : '<option value="">ยังไม่มีวิชา</option>';

    // 🎯 โหลดชื่อใส่ Dropdown สั่งล็อก
    const riggedSelect = document.getElementById('rigged-target-select');
    if (riggedSelect) {
        const currentPlayers = getActivePlayers();
        const currentSelected = riggedSelect.value;
        riggedSelect.innerHTML = `<option value="">🎲 สุ่มปกติ (ถ่วงน้ำหนักคนโดนน้อย)</option>` +
            currentPlayers.map(p => {
                const pName = p.nickname_th || p.name;
                return `<option value="${pName}" ${pName === currentSelected ? 'selected' : ''}>🎯 ล็อกเป้า: ${pName}</option>`;
            }).join('');
    }
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

async function createNewClassRoom() {
    const room = document.getElementById('new-room-name').value.trim();
    if(!room) return alert('กรอกชื่อห้องเรียนด้วยครับ!');
    if(classRooms[room]) return alert('ห้องนี้มีอยู่ในระบบแล้วครับ!');

    if (!currentUserId) await getCurrentUser();

    await window.supabaseClient.from('class_rooms').insert({ class_key: room, players: [], user_id: currentUserId });
    await syncClassFromMonitor(room);
    document.getElementById('new-room-name').value = '';
}

async function deleteCurrentClassRoom() {
    if(Object.keys(classRooms).length <= 1) return alert('ต้องมีห้องเรียนเหลืออยู่อย่างน้อย 1 ห้องครับ');
    if(!confirm(`⚠️ คุณแน่ใจใช่ไหมที่จะลบห้อง "${currentClassKey}" และรายชื่อทั้งหมดถาวร?`)) return;

    if (!currentUserId) await getCurrentUser();

    await window.supabaseClient.from('class_rooms').delete().eq('class_key', currentClassKey).eq('user_id', currentUserId);
    const nextKey = Object.keys(classRooms).filter(k => k !== currentClassKey)[0];
    await syncClassFromMonitor(nextKey);
}

// 🟢 แก้ไขการส่งข้อมูล Realtime ให้ส่ง payload ออกไปด้วยถูกต้อง
async function triggerRemoteAction(eventName, payload = {}) {
    await updateGameState(`remote_${eventName}_trigger`, Date.now().toString());
    if (realtimeChannel) {
        realtimeChannel.send({
            type: 'broadcast',
            event: eventName,
            payload: payload
        });
    }
}

// 🟢 แก้ไขปุ่มกดหมุนวงล้อให้แนบชื่อเป้าหมายล็อกส่งไป Realtime
document.getElementById('remote-spin-btn')?.addEventListener('click', async function() {
    const activePlayers = getActivePlayers();
    if (activePlayers.length === 0) return alert('ห้องนี้ยังไม่มีรายชื่อนักเรียนครับ!');
    
    document.getElementById('remote-status-text').innerText = "กำลังส่งคำสั่งหมุน...";
    document.getElementById('remote-status-text').className = "badge bg-warning text-dark px-3 py-2 fw-bold";
    document.getElementById('remote-spin-btn').disabled = true;

    // 🎯 อ่านชื่อที่เลือกจาก Dropdown ล็อกเป้า
    const riggedTarget = document.getElementById('rigged-target-select')?.value || "";
    let targetWinner = "";

    if (riggedTarget) {
        targetWinner = riggedTarget;
    } else {
        // ถ่วงน้ำหนักการสุ่ม
        const maxSpun = Math.max(...activePlayers.map(p => p.spunCount || 0), 1);
        let weightedPool = [];

        activePlayers.forEach(p => {
            const spun = p.spunCount || 0;
            const weight = Math.max(1, (maxSpun - spun + 1) * 3);
            for (let w = 0; w < weight; w++) {
                weightedPool.push(p.nickname_th || p.name);
            }
        });

        targetWinner = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    }

    await updateGameState('current_winner_name', '');
    await updateGameState('current_active_quiz', 'null');
    await updateGameState('selected_choice_idx', 'null');
    await updateGameState('quiz_submitted', 'false');
    await updateGameState('current_step', 'spinning');

    // 🔑 ส่ง targetWinner ออกไปใน payload อย่างชัดเจน
    triggerRemoteAction('spin', { targetWinner: targetWinner });
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
        const p = players.find(player => (player.nickname_th || player.name) === currentWinnerName || player.name === currentWinnerName);
        if(p) {
            document.getElementById('live-winner-name').innerText = p.nickname_th || p.name;
            document.getElementById('live-winner-count').innerText = `${p.spunCount || 0} ครั้ง`;
            document.getElementById('live-winner-score').innerText = `${p.score ?? p.points ?? 0} แต้ม`;
            document.getElementById('live-winner-avatar').innerHTML = p.image || p.avatar ? `<img src="${p.image || p.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">` : `<i class="bi bi-person-fill"></i>`;
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
    document.getElementById('player-name').value = target.nickname_th || target.name;
    document.getElementById('delete-current-image-flag').value = "false"; 
    
    document.getElementById('player-form-title').innerHTML = `<i class="bi bi-pencil-square me-2"></i>กำลังแก้ไขข้อมูล: ${target.nickname_th || target.name}`;
    document.getElementById('player-submit-btn').innerText = "บันทึกข้อมูล";
    document.getElementById('player-img-label').innerText = "เปลี่ยนรูปโปรไฟล์ใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)";
    document.getElementById('player-cancel-edit-btn').classList.remove('d-none');

    const previewZone = document.getElementById('edit-preview-zone');
    const deleteImgBtn = document.getElementById('player-delete-img-btn');
    
    if (target.image || target.avatar) {
        if(previewZone) {
            previewZone.innerHTML = `<img src="${target.image || target.avatar}" style="width:38px; height:38px; object-fit:cover; border-radius:6px; border:1px solid #b862cd;">`;
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
        if(players.some(p => (p.nickname_th || p.name) === name)) return alert('ชื่อนี้ซ้ำกันในห้องนี้แล้วครับ!');
    } else {
        const idx = parseInt(editIndex);
        if(players.some((p, i) => (p.nickname_th || p.name) === name && i !== idx)) return alert('ชื่อนี้ไปซ้ำกับนักเรียนคนอื่นในห้องครับ!');
    }
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังประมวลผล...`;

    let imageUrl = null;
    let oldImageToClean = null; 

    if (editIndex !== "") {
        const currentTmpPlayer = players[parseInt(editIndex)];
        imageUrl = currentTmpPlayer.image || currentTmpPlayer.avatar;
        if (shouldDeleteImage) {
            oldImageToClean = currentTmpPlayer.image || currentTmpPlayer.avatar;
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
            .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
            alert(`❌ อัปโหลดรูปภาพล้มเหลว: ${uploadError.message}`);
            btnSubmit.disabled = false;
            btnSubmit.innerText = editIndex === "" ? "เพิ่มชื่อ" : "บันทึกข้อมูล";
            return;
        }

        const { data: publicUrlData } = window.supabaseClient.storage.from('avatars').getPublicUrl(fileName);

        if (editIndex !== "" && (players[parseInt(editIndex)].image || players[parseInt(editIndex)].avatar)) {
            oldImageToClean = players[parseInt(editIndex)].image || players[parseInt(editIndex)].avatar;
        }

        imageUrl = publicUrlData.publicUrl;
    }

    if (oldImageToClean) {
        try {
            const urlParts = oldImageToClean.split('/');
            const targetFileName = urlParts[urlParts.length - 1];
            await window.supabaseClient.storage.from('avatars').remove([targetFileName]);
        } catch(err) { console.error(err); }
    }

    if (editIndex === "") {
        players.push({ name: name, nickname_th: name, score: 0, spunCount: 0, image: imageUrl });
    } else {
        const idx = parseInt(editIndex);
        players[idx].name = name;
        players[idx].nickname_th = name;
        players[idx].image = imageUrl;
    }

    await saveActivePlayers(players); 
    cancelEditPlayer(); 
    loadData(); 
});

function filterPlayerList() { renderPlayers(); }

async function adjustStat(index, key, amount) {
    const players = getActivePlayers();
    if (!players[index]) return;

    if (key === 'score') {
        const currentScore = parseInt(players[index].score ?? players[index].points ?? 0);
        players[index].score = Math.max(0, currentScore + amount);
    } else if (key === 'spunCount') {
        const currentCount = parseInt(players[index].spunCount ?? 0);
        players[index].spunCount = Math.max(0, currentCount + amount);
    }

    await saveActivePlayers(players);
    renderPlayers();
}

function renderPlayers() {
    const players = getActivePlayers();
    const countEl = document.getElementById('player-count');
    if (countEl) countEl.innerText = players.length;
    
    const list = document.getElementById('player-list');
    if (!list) return;

    if (players.length === 0) {
        list.innerHTML = `<li class="list-group-item text-center text-muted list-item-custom py-3">ยังไม่มีรายชื่อนักเรียนในห้องนี้ขณะนี้</li>`;
        return;
    }

    const query = document.getElementById('player-search-input')?.value.toLowerCase().trim() || "";

    const filteredPlayers = players.map((p, originalIndex) => ({ ...p, originalIndex }))
        .filter(p => {
            if (!query) return true;
            const studentName = (p.nickname_th || p.name || '').toLowerCase();
            return studentName.includes(query);
        });

    if (filteredPlayers.length === 0) {
        list.innerHTML = `<li class="list-group-item text-center text-warning list-item-custom py-3">ไม่พบรายชื่อนักเรียนที่ตรงกับ "${query}"</li>`;
        return;
    }

    list.innerHTML = filteredPlayers.map(p => {
        const i = p.originalIndex;
        let imgHtml = p.image || p.avatar 
            ? `<img src="${p.image || p.avatar}" class="admin-avatar">` 
            : `<div class="admin-avatar d-inline-flex align-items-center justify-content-center text-secondary bg-dark fs-4"><i class="bi bi-person"></i></div>`;

        const studentName = p.nickname_th || p.name || 'นักเรียน';
        const displayScore = p.score ?? p.points ?? 0;
        const displaySpun = p.spunCount ?? 0;

        return `
            <li class="list-group-item list-item-custom d-flex justify-content-between align-items-center p-3 rounded mb-1">
                <div class="d-flex align-items-center gap-3">
                    ${imgHtml}
                    <div>
                        <h5 class="m-0 fw-bold text-info">${studentName}</h5>
                        <div class="mt-1">
                            <span class="badge bg-secondary badge-stat me-1">โดนสุ่ม: <strong>${displaySpun}</strong> ครั้ง</span>
                            <span class="badge bg-dark badge-stat text-success border border-success">คะแนนสะสม: <strong>${displayScore}</strong> แต้ม</span>
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-danger px-2 py-1 fw-bold" type="button" onclick="adjustStat(${i}, 'score', -1)" title="ลด 1 คะแนน">
                            <i class="bi bi-dash-circle"></i>
                        </button>
                        <button class="btn btn-outline-success px-2 py-1 fw-bold" type="button" onclick="adjustStat(${i}, 'score', 1)" title="เพิ่ม 1 คะแนน">
                            <i class="bi bi-plus-circle"></i>
                        </button>
                    </div>
                    <button class="btn btn-sm btn-warning px-3 ms-1 text-dark fw-bold" type="button" onclick="startEditPlayer(${i})" title="แก้ไข">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-danger px-3" type="button" onclick="deletePlayer(${i})" title="ลบชื่อ">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            </li>
        `;
    }).join('');
}

async function deletePlayer(index) {
    let players = getActivePlayers();
    if(!confirm('ยืนยันที่จะลบผู้เล่นคนนี้ออกจากระบบใช่ไหม?')) return;
    
    if (players[index].image || players[index].avatar) {
        try {
            const urlParts = (players[index].image || players[index].avatar).split('/');
            const targetFileName = urlParts[urlParts.length - 1];
            await window.supabaseClient.storage.from('avatars').remove([targetFileName]);
        } catch(e) { console.error(e); }
    }

    if((players[index].nickname_th || players[index].name) === gameStates['current_winner_name']) {
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