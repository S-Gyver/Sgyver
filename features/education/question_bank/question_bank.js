let quizSubjects = {};
let currentQuizSubjectKey = "";
let questions = [];
let currentUserId = null;
let quizSearchQuery = "";

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

        // ดึงข้อมูลชุดวิชาจากตาราง quiz_subjects ของผู้ใช้คนนี้
        const { data: subjectsData } = await window.supabaseClient
            .from('quiz_subjects')
            .select('*')
            .eq('user_id', currentUserId);

        quizSubjects = {};
        if (subjectsData && subjectsData.length > 0) {
            subjectsData.forEach(s => { quizSubjects[s.subject_key] = s.questions; });
        }

        if (!currentQuizSubjectKey || !quizSubjects[currentQuizSubjectKey]) {
            currentQuizSubjectKey = Object.keys(quizSubjects)[0] || "";
        }

        questions = quizSubjects[currentQuizSubjectKey] || [];

        renderAllSelects();
        renderSubjectBadges();
        renderQuizzes();

    } catch (err) {
        console.error("Error loading data from Supabase:", err);
    }
}

function renderAllSelects() {
    const quizKeys = Object.keys(quizSubjects).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const cSub = document.getElementById('current-quiz-subject-select');

    if (cSub) {
        cSub.innerHTML = quizKeys.length > 0 
            ? quizKeys.map(k => `<option value="${k}" ${k === currentQuizSubjectKey ? 'selected' : ''}>📚 ${k}</option>`).join('')
            : '<option value="">ยังไม่มีชุดวิชาคำถาม</option>';
    }
}

function renderSubjectBadges() {
    const badgeZone = document.getElementById('subject-badges-zone');
    if (!badgeZone) return;

    if (!currentQuizSubjectKey) {
        badgeZone.innerHTML = `<span class="badge bg-secondary">ยังไม่มีข้อมูลวิชา</span>`;
        return;
    }

    const parts = currentQuizSubjectKey.split(' - ');
    const subName = parts[0] || currentQuizSubjectKey;
    const subChapter = parts[1] || '';
    const subRoom = parts[2] || '';

    badgeZone.innerHTML = `
        <span class="badge bg-dark border border-cyan text-cyan px-3 py-2 fs-6">
            <i class="bi bi-book me-1"></i>วิชา: <strong>${subName}</strong>
        </span>
        ${subChapter ? `
        <span class="badge bg-dark border border-warning text-warning px-3 py-2 fs-6">
            <i class="bi bi-bookmark-check me-1"></i>บท: <strong>${subChapter}</strong>
        </span>` : ''}
        ${subRoom ? `
        <span class="badge bg-dark border border-secondary text-subtle px-3 py-2 fs-6">
            <i class="bi bi-door-open me-1"></i>ห้อง: <strong>${subRoom}</strong>
        </span>` : ''}
    `;
}

function changeQuizSubject(val) {
    if (!val) return;
    currentQuizSubjectKey = val;
    questions = quizSubjects[currentQuizSubjectKey] || [];
    renderSubjectBadges();
    renderQuizzes();
}

async function handleQuizSubjectSubmit() {
    const name = document.getElementById('quiz-sub-name').value.trim();
    const content = document.getElementById('quiz-sub-content').value.trim();
    const room = document.getElementById('quiz-sub-room').value.trim();
    const oldKeyInput = document.getElementById('edit-subject-old-key');
    const oldKey = oldKeyInput.value;

    if (!name || !content || !room) return alert('กรอกข้อมูลรายวิชาให้ครบถ้วนก่อนครับ!');
    const combinedKey = `${name} - ${content} - ${room}`;

    if (!currentUserId) await getCurrentUser();

    if (oldKey === "") {
        if (quizSubjects[combinedKey]) return alert('วิชานี้มีในระบบอยู่แล้วครับ!');
        await window.supabaseClient
            .from('quiz_subjects')
            .insert({ 
                subject_key: combinedKey, 
                questions: [],
                user_id: currentUserId 
            });
    } else {
        if (oldKey !== combinedKey && quizSubjects[combinedKey]) return alert('ชื่อรายวิชาใหม่นี้ไปซ้ำกับวิชาอื่นที่มีอยู่แล้วครับ!');
        
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
    }

    cancelEditQuizSubject();
    currentQuizSubjectKey = combinedKey;
    await loadData();
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

async function deleteCurrentQuizSubject() {
    if (Object.keys(quizSubjects).length <= 0) return alert('ไม่มีวิชาให้ลบแล้วครับ');
    if (!confirm(`⚠️ แน่ใจใช่ไหมที่จะลบวิชา "${currentQuizSubjectKey}" และโจทย์ทั้งหมดถาวร?`)) return;

    if (!currentUserId) await getCurrentUser();

    await window.supabaseClient
        .from('quiz_subjects')
        .delete()
        .eq('subject_key', currentQuizSubjectKey)
        .eq('user_id', currentUserId);

    currentQuizSubjectKey = "";
    await loadData();
}

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

document.getElementById('quiz-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentQuizSubjectKey) return alert('กรุณาสร้างหรือเลือกชุดวิชาก่อนครับ!');

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

    document.getElementById('quiz-form-title').innerHTML = `<i class="bi bi-pencil-square me-2"></i>กำลังแก้ไขข้อสอบ: ข้อที่ ${index + 1}`;
    document.getElementById('quiz-submit-btn').innerHTML = `<i class="bi bi-floppy-fill me-2"></i>บันทึกการแก้ไขคำถาม`;
    document.getElementById('quiz-submit-btn').className = "btn btn-warning text-dark w-100 fw-bold shadow py-2";
    document.getElementById('quiz-cancel-edit-btn').classList.remove('d-none');
    
    document.getElementById('quiz-form-card').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditQuiz() {
    document.getElementById('edit-quiz-index').value = "";
    document.getElementById('quiz-form').reset();
    
    document.getElementById('quiz-form-title').innerHTML = `<i class="bi bi-question-square-fill me-2"></i>สร้างโจทย์คำถามใหม่`;
    document.getElementById('quiz-submit-btn').innerHTML = `<i class="bi bi-floppy-fill me-2"></i>บันทึกคำถามเข้าคลังของวิชานี้`;
    document.getElementById('quiz-submit-btn').className = "btn btn-success w-100 fw-bold shadow py-2";
    document.getElementById('quiz-cancel-edit-btn').classList.add('d-none');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function highlightMatch(text, query) {
    if (!text) return '';
    const safeText = escapeHtml(text);
    if (!query) return safeText;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return safeText.replace(regex, '<mark class="bg-warning text-dark px-1 rounded fw-bold">$1</mark>');
}

function filterQuestions(query) {
    quizSearchQuery = (query || '').trim().toLowerCase();
    renderQuizzes();
}

function renderQuizzes() {
    const countEl = document.getElementById('q-count');
    if (countEl) countEl.innerText = questions.length;

    const list = document.getElementById('quiz-list');
    if (!list) return;

    let filtered = questions;
    if (quizSearchQuery) {
        filtered = questions.filter((item) => {
            const inQ = (item.q || '').toLowerCase().includes(quizSearchQuery);
            const inChoices = (item.choices || []).some(c => (c || '').toLowerCase().includes(quizSearchQuery));
            return inQ || inChoices;
        });
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="text-center text-muted py-5 border border-dashed rounded-3">
                <i class="bi bi-search fs-2 mb-2 d-block text-warning"></i>
                <h6>${quizSearchQuery ? `ไม่พบโจทย์คำถามที่ตรงกับ "${escapeHtml(quizSearchQuery)}"` : 'ยังไม่มีโจทย์คำถามในชุดวิชานี้ (สร้างข้อแรกด้านบน)'}</h6>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map((q) => {
        const realIndex = questions.indexOf(q);
        return `
        <div class="quiz-card-modern mb-3 font-mono">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-warning text-dark fw-bold px-3 py-1 fs-6 font-kanit">ข้อที่ ${realIndex + 1}</span>
                    <span class="badge bg-dark border border-secondary text-subtle small font-kanit">4 ตัวเลือก</span>
                    ${quizSearchQuery ? '<span class="badge bg-secondary text-white small">พบในผลค้นหา</span>' : ''}
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-warning fw-bold px-3" onclick="startEditQuiz(${realIndex})" title="แก้ไขคำถาม">
                        <i class="bi bi-pencil-fill me-1"></i>แก้ไข
                    </button>
                    <button class="btn btn-sm btn-outline-danger px-2" onclick="deleteQuiz(${realIndex})" title="ลบคำถามนี้">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </div>
            </div>

            <!-- ข้อความโจทย์ -->
            <div class="mb-3">
                <h5 class="fw-bold text-white font-kanit lh-base m-0" style="white-space: pre-wrap;">${highlightMatch(q.q, quizSearchQuery)}</h5>
            </div>

            <!-- ช้อยส์ 1-4 แบบการ์ด ไฮไลต์เฉลย -->
            <div class="row g-2">
                ${q.choices.map((c, idx) => {
                    const isCorrect = idx === q.correct;
                    return `
                    <div class="col-12 col-md-6">
                        <div class="choice-pill ${isCorrect ? 'choice-pill-correct' : 'choice-pill-normal'}">
                            <span class="fw-bold ${isCorrect ? 'text-success' : 'text-cyan'}">${idx + 1}.</span>
                            <span class="flex-grow-1 text-truncate">${highlightMatch(c, quizSearchQuery)}</span>
                            ${isCorrect ? '<span class="badge bg-success text-white font-kanit ms-auto small">เฉลย</span>' : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }).join('');
}

async function deleteQuiz(index) {
    if (!confirm(`ต้องการลบคำถามข้อที่ ${index + 1} ใช่หรือไม่?`)) return;
    const editIndex = document.getElementById('edit-quiz-index').value;
    if (editIndex !== "" && parseInt(editIndex) === index) {
        cancelEditQuiz();
    }
    questions.splice(index, 1);
    await saveQuizData();
    loadData();
}

// 🚀 ส่งวิชานี้เข้า Gyver Wheel ทันที
async function launchWheelWithSubject() {
    if (!currentQuizSubjectKey) return alert('กรุณาเลือกวิชาก่อนครับ');
    try {
        if (!currentUserId) await getCurrentUser();
        if (currentUserId) {
            await window.supabaseClient
                .from('game_state')
                .upsert([
                    { key: 'current_quiz_subject_key', value: currentQuizSubjectKey, user_id: currentUserId, updated_at: new Date() }
                ], { onConflict: 'key,user_id' });
        }
    } catch (e) {
        console.error("Save subject state error:", e);
    }
    window.location.href = '../wheel/wheel_display.html';
}

async function logout() { 
    await window.supabaseClient.auth.signOut();
    window.location.href = '../../../index.html'; 
}

window.onload = () => {
    loadData();
};