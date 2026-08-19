let quizSubjects = {};
let currentQuizSubjectKey = "";
let questions = [];
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

        // ดึงข้อมูลชุดวิชาจากตาราง quiz_subjects ของผู้ใช้คนนี้
        const { data: subjectsData } = await window.supabaseClient
            .from('quiz_subjects')
            .select('*')
            .eq('user_id', currentUserId);

        quizSubjects = {};
        if (subjectsData && subjectsData.length > 0) {
            subjectsData.forEach(s => { quizSubjects[s.subject_key] = s.questions; });
        }

        currentQuizSubjectKey = Object.keys(quizSubjects)[0] || "";
        questions = quizSubjects[currentQuizSubjectKey] || [];

        renderAllSelects();
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

function changeQuizSubject(val) {
    if (!val) return;
    currentQuizSubjectKey = val;
    questions = quizSubjects[currentQuizSubjectKey] || [];
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
    if (!list) return;
    if (questions.length === 0) {
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
    if (!confirm('ต้องการลบคำถามข้อนี้ใช่หรือไม่?')) return;
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

window.onload = () => {
    loadData();
};