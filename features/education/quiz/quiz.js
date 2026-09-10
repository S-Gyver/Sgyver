/**
 * ====================================================
 * 🎯 Gyver Quiz - Engine & Core Logic
 * ====================================================
 */

// Global State
let quizzesList = [];
let currentQuiz = null;
let currentMode = 'list'; // 'list', 'builder', 'taker', 'result', 'analytics'
let isSupabaseTableAvailable = true;

// Student Exam State
let currentStudent = { name: '', room: '', startTime: null };
let studentAnswers = {}; // { questionId: value | [values] }
let examTimerInterval = null;
let remainingSeconds = 0;
let lastExamResult = null;
let activeExamQuestions = [];

// 🌟 SweetAlert2 Cyber Dialog Helpers
function getCyberSwal() {
    if (typeof Swal !== 'undefined') {
        return Swal.mixin({
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#f8fafc',
            customClass: {
                popup: 'cyber-swal-popup border-quiz',
                confirmButton: 'btn btn-quiz-glow px-4 py-2 fw-bold',
                cancelButton: 'btn btn-outline-secondary px-4 py-2 text-white me-2'
            },
            buttonsStyling: false
        });
    }
    return null;
}

function getCyberToast() {
    if (typeof Swal !== 'undefined') {
        return Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2400,
            timerProgressBar: true,
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#f8fafc',
            customClass: {
                popup: 'cyber-swal-popup border-quiz'
            }
        });
    }
    return null;
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
    parseUrlParams();
    await initQuizStorage();

    if (currentMode === 'taker' && currentQuiz) {
        renderTakerView();
    } else if (currentMode === 'analytics' && currentQuiz) {
        renderAnalyticsView();
    } else if (currentMode === 'builder' && currentQuiz) {
        renderBuilderView();
    } else {
        renderQuizListView();
    }
});

/**
 * อ่าน Query Params จาก URL
 */
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get('id');
    const mode = params.get('mode');

    if (mode && ['list', 'builder', 'taker', 'result', 'analytics'].includes(mode)) {
        currentMode = mode;
    } else if (quizId) {
        currentMode = 'taker'; // Default mode if only quiz ID is passed
    }

    window.activeQuizId = quizId;
}

/**
 * 🗄️ Storage Engine (Supabase + LocalStorage Fallback)
 */
async function initQuizStorage() {
    quizzesList = getLocalQuizzes();

    if (window.supabaseClient && isSupabaseTableAvailable) {
        try {
            const { data, error } = await window.supabaseClient
                .from('gyver_quizzes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                isSupabaseTableAvailable = false;
                console.info('ℹ️ Operating Quiz engine on LocalStorage.');
            } else if (data) {
                quizzesList = data.map(item => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    questions: Array.isArray(item.schema) ? item.schema : (item.schema?.questions || []),
                    variants: item.schema?.variants || [],
                    settings: item.schema?.settings || {
                        passingScore: 70,
                        timeLimit: 15,
                        certEnabled: true,
                        showAnswers: true
                    },
                    createdAt: item.created_at,
                    updatedAt: item.updated_at
                }));
                saveLocalQuizzes(quizzesList);
            }
        } catch (e) {
            isSupabaseTableAvailable = false;
        }
    }

    // Set currentQuiz if ID present
    if (window.activeQuizId) {
        currentQuiz = quizzesList.find(q => q.id === window.activeQuizId) || null;
    }
}

function getLocalQuizzes() {
    try {
        const raw = localStorage.getItem('gyver_local_quizzes');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalQuizzes(list) {
    try {
        localStorage.setItem('gyver_local_quizzes', JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save quizzes to localStorage', e);
    }
}

function getLocalQuizResponses(quizId) {
    try {
        const raw = localStorage.getItem(`gyver_quiz_responses_${quizId}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalQuizResponses(quizId, responses) {
    try {
        localStorage.setItem(`gyver_quiz_responses_${quizId}`, JSON.stringify(responses));
    } catch (e) {
        console.error('Failed to save quiz responses', e);
    }
}

async function syncQuizToSupabase(quiz) {
    if (!window.supabaseClient || !isSupabaseTableAvailable) return;
    try {
        const payload = {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            schema: {
                questions: quiz.questions,
                variants: quiz.variants || [],
                settings: quiz.settings
            },
            updated_at: new Date().toISOString()
        };
        await window.supabaseClient.from('gyver_quizzes').upsert(payload);
    } catch (e) {
        console.warn('Supabase sync skipped, stored locally', e);
    }
}

// ====================================================
// 1. List View (รายการแบบทดสอบทั้งหมด)
// ====================================================

function renderQuizListView() {
    stopTimer();
    hideAllViews();
    const container = document.getElementById('view-list-container');
    if (container) container.classList.remove('d-none');
    updateUrlQuery(null, 'list');

    const grid = document.getElementById('quiz-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (quizzesList.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-patch-question text-subtle fs-1"></i>
                <p class="text-subtle mt-2">ยังไม่มีแบบทดสอบ คุณสามารถสร้างควิซแรกได้ทันที</p>
                <button class="btn btn-quiz-glow px-4 py-2 mt-2" onclick="createNewQuiz()">
                    <i class="bi bi-plus-circle-fill me-2"></i>สร้างแบบทดสอบแรก
                </button>
            </div>
        `;
        return;
    }

    quizzesList.forEach(quiz => {
        const responses = getLocalQuizResponses(quiz.id);
        const respCount = responses.length;
        const totalPoints = (quiz.questions || []).reduce((sum, q) => sum + (q.points !== undefined ? Number(q.points) : 1), 0);
        const timeLimit = quiz.settings?.timeLimit ? `${quiz.settings.timeLimit} นาที` : 'ไม่จำกัดเวลา';

        const hasVariants = Array.isArray(quiz.variants) && quiz.variants.length > 0;

        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="cyber-card border-quiz-accent h-100 d-flex flex-column justify-content-between">
                <div>
                    <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-1">
                        <div class="d-flex gap-1 flex-wrap">
                            <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 small" style="background: rgba(236,72,153,0.15) !important; color: #f472b6 !important;">
                                <i class="bi bi-card-checklist me-1"></i>${quiz.questions ? quiz.questions.length : 0} ข้อ (${totalPoints} คะแนน)
                            </span>
                            ${hasVariants ? `<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1 small"><i class="bi bi-shield-lock-fill me-1"></i>${quiz.variants.length} ชุดสลับช้อยส์</span>` : ''}
                        </div>
                        <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 small">
                            <i class="bi bi-people-fill me-1"></i>${respCount} คนทำ
                        </span>
                    </div>
                    <h5 class="fw-bold text-white text-truncate mb-2" title="${escapeHtml(quiz.title)}">
                        ${escapeHtml(quiz.title || 'แบบทดสอบไม่มีชื่อ')}
                    </h5>
                    <p class="text-subtle small mb-3 text-truncate-2" style="min-height: 38px;">
                        ${escapeHtml(quiz.description || 'ไม่มีคำอธิบาย')}
                    </p>
                    <div class="d-flex gap-2 text-subtle small mb-3">
                        <span><i class="bi bi-stopwatch me-1 text-warning"></i>${timeLimit}</span>
                        <span><i class="bi bi-award me-1 text-quiz"></i>ผ่าน ${quiz.settings?.passingScore || 70}%</span>
                    </div>
                </div>
                <div>
                    <!-- Live Lobby Anti-Cheating Entrance Button -->
                    <a href="quiz_lobby.html?quizId=${quiz.id}" class="btn btn-sm btn-quiz-glow w-100 mb-2 fw-bold text-decoration-none text-center">
                        <i class="bi bi-broadcast-pin me-1"></i>เปิดห้องสอบสด (Live Lobby 20 ชุด)
                    </a>

                    <div class="border-top border-secondary pt-3 d-flex flex-wrap gap-2 justify-content-between">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-quiz" onclick="startQuizFromList('${quiz.id}')" title="เข้าทำข้อสอบเดี่ยว">
                                <i class="bi bi-play-fill me-1"></i>ทำข้อสอบ
                            </button>
                            <button class="btn btn-outline-secondary text-white" onclick="editQuiz('${quiz.id}')" title="แก้ไขข้อสอบ">
                                <i class="bi bi-pencil-square me-1"></i>แก้ไข
                            </button>
                            <button class="btn btn-outline-info" onclick="viewQuizAnalytics('${quiz.id}')" title="ดูผลคะแนน">
                                <i class="bi bi-bar-chart-fill me-1"></i>คะแนน
                            </button>
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-quiz" onclick="openShareModalForId('${quiz.id}')" title="แชร์ข้อสอบ / QR Code">
                                <i class="bi bi-qr-code-scan"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteQuiz('${quiz.id}')" title="ลบแบบทดสอบ">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function createNewQuiz() {
    const newQuiz = {
        id: generateId(),
        title: 'แบบทดสอบใหม่',
        description: 'คำชี้แจง: ให้นักเรียนเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว มีเวลาทำตามที่กำหนด',
        settings: {
            passingScore: 70,
            timeLimit: 15,
            certEnabled: true,
            showAnswers: true,
            poolEnabled: true,
            poolCount: 20
        },
        questions: [
            {
                id: generateId(),
                title: 'ข้อที่ 1: เมืองหลวงของประเทศไทยคือเมืองใด?',
                type: 'radio',
                points: 1,
                correctAnswer: 'กรุงเทพมหานคร',
                explanation: 'กรุงเทพมหานครเป็นเมืองหลวงและศูนย์กลางการปกครองของประเทศไทย',
                options: ['เชียงใหม่', 'กรุงเทพมหานคร', 'ภูเก็ต', 'ขอนแก่น']
            },
            {
                id: generateId(),
                title: 'ข้อที่ 2: แม่สีปฐมภูมิประกอบด้วยสีใดบ้าง? (เลือกได้หลายข้อ)',
                type: 'checkbox',
                points: 1,
                correctAnswer: ['สีแดง', 'สีเหลือง', 'สีน้ำเงิน'],
                explanation: 'แม่สีปฐมภูมิได้แก่ สีแดง สีเหลือง และสีน้ำเงิน',
                options: ['สีแดง', 'สีเขียว', 'สีเหลือง', 'สีน้ำเงิน']
            }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    quizzesList.unshift(newQuiz);
    saveLocalQuizzes(quizzesList);
    syncQuizToSupabase(newQuiz);

    currentQuiz = newQuiz;
    window.activeQuizId = newQuiz.id;
    renderBuilderView();
}

function editQuiz(quizId) {
    currentQuiz = quizzesList.find(q => q.id === quizId);
    if (currentQuiz) {
        window.activeQuizId = currentQuiz.id;
        renderBuilderView();
    }
}

async function deleteQuiz(quizId) {
    const swal = getCyberSwal();
    if (swal) {
        const result = await swal.fire({
            title: 'ยืนยันการลบแบบทดสอบ?',
            text: 'ข้อมูลคำตอบ สถิติ และผลคะแนนทั้งหมดจะถูกลบถาวร',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-trash-fill me-1"></i> ลบแบบทดสอบ',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: 'cyber-swal-popup border-quiz',
                confirmButton: 'btn btn-danger px-4 py-2 fw-bold me-2',
                cancelButton: 'btn btn-outline-secondary px-4 py-2 text-white'
            }
        });
        if (!result.isConfirmed) return;
    } else if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแบบทดสอบนี้? ข้อมูลคำตอบและคะแนนทั้งหมดจะถูกลบด้วย')) {
        return;
    }

    quizzesList = quizzesList.filter(q => q.id !== quizId);
    saveLocalQuizzes(quizzesList);
    try {
        localStorage.removeItem(`gyver_quiz_responses_${quizId}`);
    } catch (e) {}

    if (window.supabaseClient && isSupabaseTableAvailable) {
        window.supabaseClient.from('gyver_quizzes').delete().eq('id', quizId).then();
    }

    const toast = getCyberToast();
    if (toast) {
        toast.fire({
            icon: 'success',
            title: 'ลบแบบทดสอบเรียบร้อยแล้ว'
        });
    }
    renderQuizListView();
}

// ====================================================
// 2. Builder View (สร้าง & ปรับแต่งข้อสอบ)
// ====================================================

function renderBuilderView() {
    if (!currentQuiz) return;
    stopTimer();
    hideAllViews();
    const container = document.getElementById('view-builder-container');
    if (container) container.classList.remove('d-none');
    updateUrlQuery(currentQuiz.id, 'builder');

    // Bind settings
    document.getElementById('builder-quiz-title').value = currentQuiz.title || '';
    document.getElementById('builder-quiz-desc').value = currentQuiz.description || '';
    document.getElementById('setting-passing-score').value = currentQuiz.settings?.passingScore ?? 70;
    document.getElementById('setting-time-limit').value = currentQuiz.settings?.timeLimit ?? 15;
    document.getElementById('setting-cert-enabled').checked = currentQuiz.settings?.certEnabled ?? true;
    document.getElementById('setting-show-answers').checked = currentQuiz.settings?.showAnswers ?? true;

    // Question Pool setting (Default to true / enabled!)
    const totalQ = (currentQuiz.questions || []).length;
    const isPoolActive = (currentQuiz.settings?.poolEnabled !== undefined) ? currentQuiz.settings.poolEnabled : true;
    const poolCountVal = Number(currentQuiz.settings?.poolCount) > 0 ? currentQuiz.settings.poolCount : 20;

    const poolEnabledEl = document.getElementById('setting-pool-enabled');
    const poolCountEl = document.getElementById('setting-pool-count');
    if (poolEnabledEl) poolEnabledEl.checked = isPoolActive;
    if (poolCountEl) poolCountEl.value = poolCountVal;
    togglePoolCountInput();
    updatePoolTotalLabel();

    renderVariantsBadge();
    renderQuestionsBuilder();
}

function togglePoolCountInput() {
    const isEnabled = document.getElementById('setting-pool-enabled')?.checked;
    const container = document.getElementById('pool-count-container');
    if (container) {
        if (isEnabled) {
            container.classList.remove('d-none');
        } else {
            container.classList.add('d-none');
        }
    }
}

function updatePoolTotalLabel() {
    const label = document.getElementById('pool-total-label');
    if (label && currentQuiz) {
        label.textContent = (currentQuiz.questions || []).length;
    }
}

function renderQuestionsBuilder() {
    updatePoolTotalLabel();
    const listEl = document.getElementById('builder-questions-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    (currentQuiz.questions || []).forEach((q, idx) => {
        const block = document.createElement('div');
        block.className = 'question-block';
        block.id = `q-block-${q.id}`;

        let optionsHtml = '';
        if (q.type === 'radio' || q.type === 'checkbox') {
            optionsHtml = `
                <div class="mt-3">
                    <label class="form-label text-subtle small fw-bold">ตัวเลือกและเฉลยข้อที่ถูกต้อง (ติ๊กเลือกข้อที่ถูก)</label>
                    <div id="options-container-${q.id}">
                        ${(q.options || []).map((opt, optIdx) => {
                            const isCorrect = q.type === 'checkbox'
                                ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt))
                                : (q.correctAnswer === opt);

                            return `
                                <div class="choice-row d-flex align-items-center gap-2 ${isCorrect ? 'is-correct' : ''}">
                                    <input class="form-check-input" type="${q.type}" name="correct_${q.id}" 
                                        ${isCorrect ? 'checked' : ''} 
                                        onchange="setQuestionCorrectAnswer('${q.id}', '${escapeHtml(opt)}', this.checked)">
                                    <input type="text" class="form-control form-control-cyber form-control-sm" 
                                        value="${escapeHtml(opt)}" 
                                        placeholder="ตัวเลือก ${optIdx + 1}"
                                        oninput="updateOptionText('${q.id}', ${optIdx}, this.value)">
                                    <button class="btn btn-sm btn-link text-danger p-0" onclick="removeOption('${q.id}', ${optIdx})" title="ลบตัวเลือก">
                                        <i class="bi bi-x-circle fs-5"></i>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <button class="btn btn-sm btn-outline-quiz mt-2" onclick="addOption('${q.id}')">
                        <i class="bi bi-plus me-1"></i>เพิ่มตัวเลือก
                    </button>
                </div>
            `;
        } else if (q.type === 'text') {
            optionsHtml = `
                <div class="mt-3">
                    <label class="form-label text-subtle small fw-bold">คีย์เวิร์ดเฉลย / คำตอบที่ถูกต้อง (ไม่บังคับ)</label>
                    <input type="text" class="form-control form-control-cyber" 
                        value="${escapeHtml(q.correctAnswer || '')}" 
                        placeholder="ระบุคำตอบที่ถูกต้อง..."
                        oninput="q_setAnswer('${q.id}', this.value)">
                </div>
            `;
        }

        block.innerHTML = `
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2 flex-wrap">
                <div class="d-flex align-items-center gap-2 flex-grow-1">
                    <span class="badge bg-quiz-accent text-white px-2 py-1" style="background: #ec4899;">ข้อ ${idx + 1}</span>
                    <input type="text" class="form-control form-control-cyber fw-bold" 
                        value="${escapeHtml(q.title || '')}" 
                        placeholder="พิมพ์คำถามข้อที่ ${idx + 1}..."
                        oninput="updateQuestionTitle('${q.id}', this.value)">
                </div>
                <div class="d-flex align-items-center gap-2">
                    <div class="input-group input-group-sm" style="width: 130px;">
                        <span class="input-group-text bg-dark text-white border-secondary">คะแนน</span>
                        <input type="number" class="form-control form-control-cyber text-center" 
                            value="${q.points ?? 1}" min="1" max="100"
                            onchange="updateQuestionPoints('${q.id}', this.value)">
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeQuestion('${q.id}')" title="ลบข้อนี้">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>

            ${optionsHtml}

            <div class="mt-3 pt-2 border-top border-secondary">
                <label class="form-label text-subtle small"><i class="bi bi-info-circle me-1"></i>คำอธิบายเฉลยเหตุผล (แสดงให้นักเรียนดูหลังส่งข้อสอบ)</label>
                <input type="text" class="form-control form-control-cyber form-control-sm" 
                    value="${escapeHtml(q.explanation || '')}" 
                    placeholder="เช่น เนื่องจากเป็นข้อเท็จจริงตามกฎหมาย หรือ สูตรการคำนวณ..."
                    oninput="updateQuestionExplanation('${q.id}', this.value)">
            </div>
        `;

        listEl.appendChild(block);
    });
}

function addQuestion(type = 'radio') {
    if (!currentQuiz) return;
    if (!currentQuiz.questions) currentQuiz.questions = [];

    const newQ = {
        id: generateId(),
        title: `ข้อที่ ${currentQuiz.questions.length + 1}: พิมพ์คำถาม...`,
        type: type,
        points: 1,
        correctAnswer: type === 'radio' ? 'ตัวเลือกที่ 1' : (type === 'checkbox' ? ['ตัวเลือกที่ 1'] : ''),
        explanation: '',
        options: type === 'text' ? [] : ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2', 'ตัวเลือกที่ 3', 'ตัวเลือกที่ 4']
    };

    currentQuiz.questions.push(newQ);
    renderQuestionsBuilder();
}

function removeQuestion(qId) {
    if (!currentQuiz || !currentQuiz.questions) return;
    currentQuiz.questions = currentQuiz.questions.filter(q => q.id !== qId);
    renderQuestionsBuilder();
}

function updateQuestionTitle(qId, title) {
    const q = currentQuiz.questions.find(x => x.id === qId);
    if (q) q.title = title;
}

function updateQuestionPoints(qId, pts) {
    const q = currentQuiz.questions.find(x => x.id === qId);
    if (q) q.points = Number(pts) || 1;
}

function updateQuestionExplanation(qId, text) {
    const q = currentQuiz.questions.find(x => x.id === qId);
    if (q) q.explanation = text;
}

function updateOptionText(qId, optIdx, text) {
    const q = currentQuiz.questions.find(x => x.id === qId);
    if (q && q.options) {
        const oldVal = q.options[optIdx];
        q.options[optIdx] = text;
        if (q.type === 'radio' && q.correctAnswer === oldVal) {
            q.correctAnswer = text;
        } else if (q.type === 'checkbox' && Array.isArray(q.correctAnswer)) {
            const pos = q.correctAnswer.indexOf(oldVal);
            if (pos !== -1) q.correctAnswer[pos] = text;
        }
    }
}

function addOption(qId) {
    const q = currentQuiz.questions.find(x => x.id === qId);
    if (q && q.options) {
        q.options.push(`ตัวเลือกที่ ${q.options.length + 1}`);
        renderQuestionsBuilder();
    }
}

function removeOption(qId, optIdx) {
    const q = currentQuiz.questions.find(x => x.id === qId);
    if (q && q.options && q.options.length > 1) {
        const removed = q.options.splice(optIdx, 1)[0];
        if (q.type === 'radio' && q.correctAnswer === removed) {
            q.correctAnswer = q.options[0] || '';
        } else if (q.type === 'checkbox' && Array.isArray(q.correctAnswer)) {
            q.correctAnswer = q.correctAnswer.filter(val => val !== removed);
        }
        renderQuestionsBuilder();
    }
}

function setQuestionCorrectAnswer(qId, optionVal, isChecked) {
    const q = currentQuiz.questions.find(x => x.id === qId);
    if (!q) return;

    if (q.type === 'radio') {
        q.correctAnswer = optionVal;
    } else if (q.type === 'checkbox') {
        if (!Array.isArray(q.correctAnswer)) q.correctAnswer = [];
        if (isChecked && !q.correctAnswer.includes(optionVal)) {
            q.correctAnswer.push(optionVal);
        } else if (!isChecked) {
            q.correctAnswer = q.correctAnswer.filter(val => val !== optionVal);
        }
    }
    renderQuestionsBuilder();
}

function q_setAnswer(qId, val) {
    const q = currentQuiz.questions.find(x => x.id === qId);
    if (q) q.correctAnswer = val;
}

function saveCurrentQuiz() {
    if (!currentQuiz) return;

    currentQuiz.title = document.getElementById('builder-quiz-title').value.trim() || 'แบบทดสอบไม่มีชื่อ';
    currentQuiz.description = document.getElementById('builder-quiz-desc').value.trim() || '';
    const poolEnabled = document.getElementById('setting-pool-enabled')?.checked || false;
    const poolCount = Number(document.getElementById('setting-pool-count')?.value) || 20;

    currentQuiz.settings = {
        passingScore: Number(document.getElementById('setting-passing-score').value) || 70,
        timeLimit: Number(document.getElementById('setting-time-limit').value) || 0,
        certEnabled: document.getElementById('setting-cert-enabled').checked,
        showAnswers: document.getElementById('setting-show-answers').checked,
        poolEnabled: poolEnabled,
        poolCount: poolCount
    };
    currentQuiz.updatedAt = new Date().toISOString();

    saveLocalQuizzes(quizzesList);
    syncQuizToSupabase(currentQuiz);

    const swal = getCyberSwal();
    if (swal) {
        swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ!',
            text: 'แบบทดสอบและคำถามทั้งหมดถูกบันทึกเรียบร้อยแล้ว',
            timer: 2000,
            showConfirmButton: false
        });
    } else {
        alert('บันทึกแบบทดสอบเรียบร้อยแล้ว!');
    }
}

function previewCurrentQuizAsStudent() {
    saveCurrentQuiz();
    startQuizFromList(currentQuiz.id);
}

// 🎲 20 Variants Anti-Cheating Generator
function renderVariantsBadge() {
    const badge = document.getElementById('variants-count-badge');
    const text = document.getElementById('variants-status-text');
    if (!badge || !text) return;

    const count = (currentQuiz?.variants || []).length;
    if (count > 0) {
        badge.className = 'badge bg-success text-white px-2 py-1';
        badge.innerHTML = `<i class="bi bi-shield-check me-1"></i>พร้อมใช้งาน ${count} / 20 ชุด`;
        text.textContent = `ระบบได้สลับลำดับข้อสอบและช้อยส์คำตอบเรียบร้อยแล้ว (${count} ชุด ไม่ซ้ำกัน)`;
    } else {
        badge.className = 'badge bg-warning text-dark px-2 py-1';
        badge.innerHTML = `<i class="bi bi-shield-lock-fill me-1"></i>0 / 20 ชุด`;
        text.textContent = 'ยังไม่ได้สร้างชุดข้อสอบสลับช้อยส์ 20 ชุด (กดปุ่มสุ่มสร้างด้านบน)';
    }

    const lobbyLink = document.getElementById('btn-builder-lobby-link');
    if (lobbyLink && currentQuiz) {
        lobbyLink.href = `quiz_lobby.html?quizId=${currentQuiz.id}`;
    }
}

function generate20Variants() {
    if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
        const swal = getCyberSwal();
        if (swal) {
            swal.fire({
                icon: 'warning',
                title: 'ยังไม่มีคำถาม',
                text: 'กรุณาสร้างคำถามในแบบทดสอบอย่างน้อย 1 ข้อก่อนสร้าง 20 ชุดคำถาม',
                confirmButtonText: 'เข้าใจแล้ว'
            });
        }
        return;
    }

    const baseQuestions = currentQuiz.questions;
    const variants = [];
    const totalQ = (baseQuestions || []).length;
    const isPool = (currentQuiz.settings?.poolEnabled === false) ? false : (totalQ > 20 || !!currentQuiz.settings?.poolEnabled);
    const poolCount = isPool 
        ? (Number(currentQuiz.settings?.poolCount) > 0 ? Math.min(Number(currentQuiz.settings.poolCount), totalQ) : Math.min(20, totalQ))
        : totalQ;

    for (let i = 1; i <= 20; i++) {
        const cloned = JSON.parse(JSON.stringify(baseQuestions));
        shuffleArray(cloned);
        const selected = cloned.slice(0, poolCount);

        selected.forEach((q, qIdx) => {
            q.title = q.title.replace(/^ข้อที่\s*\d+[:.]?\s*/, `ข้อที่ ${qIdx + 1}: `);
            if (Array.isArray(q.options) && q.options.length > 1) {
                shuffleArray(q.options);
            }
        });

        variants.push({
            variantIndex: i,
            variantName: `ชุดที่ ${i}`,
            questions: selected
        });
    }

    currentQuiz.variants = variants;
    saveLocalQuizzes(quizzesList);
    syncQuizToSupabase(currentQuiz);

    const swal = getCyberSwal();
    if (swal) {
        swal.fire({
            icon: 'success',
            title: 'สร้าง 20 ชุดสำเร็จ! 🎉',
            text: isPool 
                ? `ระบบได้สุ่มดึงคำถามคนละ ${poolCount} ข้อ จากคลังทั้งหมด ${baseQuestions.length} ข้อ พร้อมสลับช้อยส์ 20 ชุดเรียบร้อย` 
                : 'ระบบได้สลับลำดับข้อและสลับตัวเลือกเป็น 20 ชุดเรียบร้อย พร้อมสำหรับแจกนักเรียน 1 คนต่อ 1 ชุดในห้องสอบสด',
            timer: 2500,
            showConfirmButton: false
        });
    }

    renderVariantsBadge();
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function openLobbyForCurrentQuiz(e) {
    if (e) e.preventDefault();
    if (!currentQuiz) return;
    saveCurrentQuiz();
    window.location.href = `quiz_lobby.html?quizId=${currentQuiz.id}`;
}

// ====================================================
// 3. Taker View (หน้านักเรียนทำแบบทดสอบ)
// ====================================================

function startQuizFromList(quizId) {
    currentQuiz = quizzesList.find(q => q.id === quizId);
    if (!currentQuiz) return;

    window.activeQuizId = currentQuiz.id;
    studentAnswers = {};
    renderTakerView();
}

function renderTakerView() {
    if (!currentQuiz) return;
    stopTimer();
    hideAllViews();
    const container = document.getElementById('view-taker-container');
    if (container) container.classList.remove('d-none');
    updateUrlQuery(currentQuiz.id, 'taker');

    // Reset student gate
    document.getElementById('taker-gate-card').classList.remove('d-none');
    document.getElementById('taker-active-exam').classList.add('d-none');

    document.getElementById('gate-quiz-title').textContent = currentQuiz.title || 'แบบทดสอบ';
    document.getElementById('gate-quiz-desc').textContent = currentQuiz.description || 'ไม่มีคำชี้แจง';
    
    const totalQ = (currentQuiz.questions || []).length;
    const isPool = (currentQuiz.settings?.poolEnabled === false) ? false : (totalQ > 20 || !!currentQuiz.settings?.poolEnabled);
    const displayCount = isPool 
        ? (Number(currentQuiz.settings?.poolCount) > 0 ? Math.min(Number(currentQuiz.settings.poolCount), totalQ) : Math.min(20, totalQ))
        : totalQ;

    document.getElementById('gate-total-questions').textContent = isPool 
        ? `${displayCount} ข้อ (สุ่มจาก ${totalQ} ข้อ)` 
        : `${displayCount} ข้อ`;

    document.getElementById('gate-total-time').textContent = currentQuiz.settings?.timeLimit ? `${currentQuiz.settings.timeLimit} นาที` : 'ไม่จำกัด';
    document.getElementById('gate-pass-score').textContent = `${currentQuiz.settings?.passingScore || 70}%`;
}

function startTakingQuiz() {
    const nameInput = document.getElementById('taker-student-name');
    const roomInput = document.getElementById('taker-student-room');

    const name = nameInput ? nameInput.value.trim() : '';
    const room = roomInput ? roomInput.value.trim() : '';

    if (!name) {
        const swal = getCyberSwal();
        if (swal) {
            swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาระบุชื่อผู้เข้าสอบก่อนเริ่มทำข้อสอบ',
                confirmButtonText: 'รับทราบ'
            });
        } else {
            alert('กรุณาระบุชื่อผู้เข้าสอบก่อนเริ่มทำข้อสอบ');
        }
        return;
    }

    currentStudent = {
        name: name,
        room: room,
        startTime: new Date()
    };

    document.getElementById('taker-gate-card').classList.add('d-none');
    document.getElementById('taker-active-exam').classList.remove('d-none');

    document.getElementById('active-exam-title').textContent = currentQuiz.title;
    document.getElementById('active-student-badge').textContent = `ผู้เข้าสอบ: ${name} ${room ? `(${room})` : ''}`;

    // Prepare Active Exam Questions (Random subset if Question Pool enabled)
    const totalQ = (currentQuiz.questions || []).length;
    const isPool = (currentQuiz.settings?.poolEnabled === false) ? false : (totalQ > 20 || !!currentQuiz.settings?.poolEnabled);
    const poolCount = isPool 
        ? (Number(currentQuiz.settings?.poolCount) > 0 ? Math.min(Number(currentQuiz.settings.poolCount), totalQ) : Math.min(20, totalQ))
        : totalQ;

    const allQ = JSON.parse(JSON.stringify(currentQuiz.questions || []));

    if (isPool && poolCount < allQ.length) {
        shuffleArray(allQ);
        activeExamQuestions = allQ.slice(0, poolCount);
        activeExamQuestions.forEach((q, idx) => {
            q.title = q.title.replace(/^ข้อที่\s*\d+[:.]?\s*/, `ข้อที่ ${idx + 1}: `);
            if (Array.isArray(q.options) && q.options.length > 1) {
                shuffleArray(q.options);
            }
        });
    } else {
        activeExamQuestions = allQ;
    }

    renderTakerQuestions();

    // Start Timer if enabled
    const timeLimitMin = currentQuiz.settings?.timeLimit || 0;
    const timerDisplay = document.getElementById('exam-timer-display');

    if (timeLimitMin > 0) {
        remainingSeconds = timeLimitMin * 60;
        if (timerDisplay) timerDisplay.classList.remove('d-none');
        updateTimerDisplay();

        stopTimer();
        examTimerInterval = setInterval(() => {
            remainingSeconds--;
            updateTimerDisplay();

            if (remainingSeconds <= 0) {
                stopTimer();
                const swal = getCyberSwal();
                if (swal) {
                    swal.fire({
                        icon: 'info',
                        title: '⏰ หมดเวลาทำข้อสอบ!',
                        text: 'ระบบกำลังตรวจคำตอบและประมวลผลคะแนนของคุณอัตโนมัติ...',
                        timer: 2500,
                        showConfirmButton: false
                    }).then(() => {
                        autoSubmitQuiz();
                    });
                } else {
                    alert('หมดเวลาทำข้อสอบแล้ว! ระบบจะทำการตรวจและส่งคำตอบของคุณโดยอัตโนมัติ');
                    autoSubmitQuiz();
                }
            }
        }, 1000);
    } else {
        if (timerDisplay) timerDisplay.classList.add('d-none');
    }
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('timer-text');
    if (!timerEl) return;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function stopTimer() {
    if (examTimerInterval) {
        clearInterval(examTimerInterval);
        examTimerInterval = null;
    }
}

function renderTakerQuestions() {
    const listEl = document.getElementById('taker-questions-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const questionsToRender = (activeExamQuestions && activeExamQuestions.length > 0) ? activeExamQuestions : (currentQuiz.questions || []);

    questionsToRender.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'cyber-card mb-4 border-quiz';
        card.id = `exam-q-${q.id}`;

        let choicesHtml = '';
        if (q.type === 'radio') {
            choicesHtml = `
                <div class="row g-2 mt-2">
                    ${(q.options || []).map((opt, oIdx) => `
                        <div class="col-12 col-md-6">
                            <div class="quiz-choice-card" onclick="selectRadioChoice('${q.id}', '${escapeHtml(opt)}', this)">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge bg-dark border border-secondary text-white">${String.fromCharCode(65 + oIdx)}</span>
                                    <span class="text-white">${escapeHtml(opt)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (q.type === 'checkbox') {
            choicesHtml = `
                <div class="row g-2 mt-2">
                    ${(q.options || []).map((opt, oIdx) => `
                        <div class="col-12 col-md-6">
                            <div class="quiz-choice-card" onclick="toggleCheckboxChoice('${q.id}', '${escapeHtml(opt)}', this)">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge bg-dark border border-secondary text-white">${oIdx + 1}</span>
                                    <span class="text-white">${escapeHtml(opt)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (q.type === 'text') {
            choicesHtml = `
                <div class="mt-3">
                    <textarea class="form-control form-control-cyber" rows="2" 
                        placeholder="พิมพ์คำตอบของคุณที่นี่..."
                        oninput="studentAnswers['${q.id}'] = this.value"></textarea>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="fw-bold text-white mb-1"><span class="text-quiz me-2">ข้อ ${idx + 1}.</span>${escapeHtml(q.title)}</h5>
                <span class="badge bg-secondary text-white">${q.points ?? 1} คะแนน</span>
            </div>
            ${choicesHtml}
        `;

        listEl.appendChild(card);
    });
}

function selectRadioChoice(qId, val, el) {
    studentAnswers[qId] = val;
    const parentCard = document.getElementById(`exam-q-${qId}`);
    if (parentCard) {
        parentCard.querySelectorAll('.quiz-choice-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    }
}

function toggleCheckboxChoice(qId, val, el) {
    if (!Array.isArray(studentAnswers[qId])) {
        studentAnswers[qId] = [];
    }
    const idx = studentAnswers[qId].indexOf(val);
    if (idx === -1) {
        studentAnswers[qId].push(val);
        el.classList.add('selected');
    } else {
        studentAnswers[qId].splice(idx, 1);
        el.classList.remove('selected');
    }
}

async function confirmSubmitQuiz() {
    const swal = getCyberSwal();
    if (swal) {
        const result = await swal.fire({
            title: 'ยืนยันการส่งข้อสอบ?',
            text: 'คุณตรวจสอบคำตอบครบถ้วนแล้ว และพร้อมตรวจผลคะแนนหรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-send-fill me-1"></i> ส่งข้อสอบเลย',
            cancelButtonText: 'กลับไปตรวจทาน',
            customClass: {
                popup: 'cyber-swal-popup border-quiz',
                confirmButton: 'btn btn-quiz-glow px-4 py-2 fw-bold me-2',
                cancelButton: 'btn btn-outline-secondary px-4 py-2 text-white'
            }
        });
        if (result.isConfirmed) {
            autoSubmitQuiz();
        }
    } else {
        if (confirm('คุณต้องการส่งข้อสอบและตรวจผลคะแนนหรือไม่?')) {
            autoSubmitQuiz();
        }
    }
}

function autoSubmitQuiz() {
    stopTimer();

    let totalPoints = 0;
    let earnedPoints = 0;
    const questionResults = [];

    const questionsToGrade = (activeExamQuestions && activeExamQuestions.length > 0) ? activeExamQuestions : (currentQuiz.questions || []);

    questionsToGrade.forEach(q => {
        const qPts = (q.points !== undefined && !isNaN(Number(q.points))) ? Number(q.points) : 1;
        totalPoints += qPts;

        const given = studentAnswers[q.id];
        let isCorrect = false;

        if (q.type === 'radio') {
            isCorrect = (given === q.correctAnswer);
        } else if (q.type === 'checkbox') {
            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
            const givenArr = Array.isArray(given) ? given : [];
            isCorrect = (correctArr.length === givenArr.length && correctArr.every(v => givenArr.includes(v)));
        } else if (q.type === 'text') {
            isCorrect = (given && q.correctAnswer && given.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
        }

        const ptsEarned = isCorrect ? qPts : 0;
        earnedPoints += ptsEarned;

        questionResults.push({
            questionId: q.id,
            title: q.title,
            type: q.type,
            points: qPts,
            ptsEarned: ptsEarned,
            givenAnswer: given,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            isCorrect: isCorrect
        });
    });

    const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passTarget = currentQuiz.settings?.passingScore ?? 70;
    const isPassed = percent >= passTarget;

    const resultRecord = {
        id: generateId(),
        quizId: currentQuiz.id,
        quizTitle: currentQuiz.title,
        studentName: currentStudent.name,
        studentRoom: currentStudent.room,
        earnedPoints: earnedPoints,
        totalPoints: totalPoints,
        percent: percent,
        isPassed: isPassed,
        submittedAt: new Date().toISOString(),
        questionResults: questionResults
    };

    lastExamResult = resultRecord;

    // Save response
    const existing = getLocalQuizResponses(currentQuiz.id);
    existing.unshift(resultRecord);
    saveLocalQuizResponses(currentQuiz.id, existing);

    // Sync response to Supabase if supported
    syncQuizResponseToSupabase(resultRecord);

    renderResultView();
}

async function syncQuizResponseToSupabase(record) {
    if (!window.supabaseClient || !isSupabaseTableAvailable) return;
    try {
        await window.supabaseClient.from('gyver_quiz_responses').insert({
            quiz_id: record.quizId,
            student_name: record.studentName,
            student_room: record.studentRoom,
            score: record.earnedPoints,
            total: record.totalPoints,
            percentage: record.percent,
            is_passed: record.isPassed,
            answers: record.questionResults
        });
    } catch (e) {
        console.warn('Quiz response sync skipped', e);
    }
}

// ====================================================
// 4. Result & Review View (ผลคะแนน & เฉลย)
// ====================================================

function renderResultView() {
    if (!lastExamResult) return;
    stopTimer();
    hideAllViews();
    const container = document.getElementById('view-result-container');
    if (container) container.classList.remove('d-none');
    updateUrlQuery(currentQuiz.id, 'result');

    const iconEl = document.getElementById('result-status-icon');
    const titleEl = document.getElementById('result-status-title');
    const nameEl = document.getElementById('result-student-name');
    const scoreTextEl = document.getElementById('result-score-text');
    const scoreTotalEl = document.getElementById('result-score-total');
    const percentEl = document.getElementById('result-percent');
    const targetEl = document.getElementById('result-target');
    const badgeEl = document.getElementById('result-status-badge');
    const btnCert = document.getElementById('btn-show-cert');

    nameEl.textContent = `${lastExamResult.studentName} ${lastExamResult.studentRoom ? `(${lastExamResult.studentRoom})` : ''}`;
    scoreTextEl.textContent = lastExamResult.earnedPoints;
    scoreTotalEl.textContent = `/ ${lastExamResult.totalPoints} คะแนน`;
    percentEl.textContent = `${lastExamResult.percent}%`;
    targetEl.textContent = `${currentQuiz.settings?.passingScore || 70}%`;

    if (lastExamResult.isPassed) {
        iconEl.innerHTML = '<i class="bi bi-patch-check-fill text-success" style="font-size: 4rem;"></i>';
        titleEl.textContent = 'ยินดีด้วย! คุณผ่านเกณฑ์การทดสอบ 🎉';
        titleEl.className = 'fw-bold mb-2 text-success';
        badgeEl.className = 'fs-5 fw-bold text-success';
        badgeEl.textContent = 'ผ่านเกณฑ์ ✅';

        if (currentQuiz.settings?.certEnabled) {
            btnCert.classList.remove('d-none');
        } else {
            btnCert.classList.add('d-none');
        }
    } else {
        iconEl.innerHTML = '<i class="bi bi-x-circle-fill text-danger" style="font-size: 4rem;"></i>';
        titleEl.textContent = 'เสียใจด้วย ยังไม่ผ่านเกณฑ์ ⚠️';
        titleEl.className = 'fw-bold mb-2 text-danger';
        badgeEl.className = 'fs-5 fw-bold text-danger';
        badgeEl.textContent = 'ไม่ผ่าน ❌';
        btnCert.classList.add('d-none');
    }

    // Answer Review
    const reviewSection = document.getElementById('result-review-section');
    const reviewList = document.getElementById('result-review-list');

    if (currentQuiz.settings?.showAnswers) {
        reviewSection.classList.remove('d-none');
        reviewList.innerHTML = (lastExamResult.questionResults || []).map((r, idx) => `
            <div class="question-block border-${r.isCorrect ? 'success' : 'danger'} mb-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="fw-bold text-white mb-0">ข้อ ${idx + 1}. ${escapeHtml(r.title)}</h6>
                    <span class="badge bg-${r.isCorrect ? 'success' : 'danger'}">
                        ${r.isCorrect ? `+${r.points} คะแนน` : '0 คะแนน'}
                    </span>
                </div>
                <div class="small mb-1">
                    <span class="text-subtle">คำตอบของคุณ: </span>
                    <span class="fw-bold ${r.isCorrect ? 'text-success' : 'text-danger'}">
                        ${escapeHtml(Array.isArray(r.givenAnswer) ? r.givenAnswer.join(', ') : (r.givenAnswer || '(ไม่ได้ตอบ)'))}
                    </span>
                </div>
                ${!r.isCorrect ? `
                    <div class="small text-success mb-1">
                        <span class="text-subtle">เฉลยที่ถูกต้อง: </span>
                        <span class="fw-bold">${escapeHtml(Array.isArray(r.correctAnswer) ? r.correctAnswer.join(', ') : r.correctAnswer)}</span>
                    </div>
                ` : ''}
                ${r.explanation ? `
                    <div class="small text-info mt-2 pt-2 border-top border-secondary">
                        <i class="bi bi-info-circle me-1"></i>${escapeHtml(r.explanation)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } else {
        reviewSection.classList.add('d-none');
    }
}

// ====================================================
// 5. Digital Certificate Generator (Canvas)
// ====================================================

function openCertificateModal() {
    if (!lastExamResult) return;
    const canvas = document.getElementById('cert-preview-canvas');
    if (!canvas) return;

    drawCertificate(canvas, {
        studentName: lastExamResult.studentName,
        quizTitle: lastExamResult.quizTitle,
        percent: lastExamResult.percent,
        date: new Date(lastExamResult.submittedAt).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric'
        }),
        code: `GYV-${lastExamResult.id.toUpperCase()}`
    });

    const modal = new bootstrap.Modal(document.getElementById('certModal'));
    modal.show();
}

function drawCertificate(canvas, data) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background Cyber Midnight
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0a0d14');
    bgGrad.addColorStop(1, '#1e112a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Decorative Borders
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    // Corner Accents
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(16, 16, 20, 20);
    ctx.fillRect(w - 36, 16, 20, 20);
    ctx.fillRect(16, h - 36, 20, 20);
    ctx.fillRect(w - 36, h - 36, 20, 20);

    // Header Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 22px Kanit, sans-serif';
    ctx.fillText('S-GYVER SMART EDUCATION PLATFORM', w / 2, 85);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Kanit, sans-serif';
    ctx.fillText('เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า', w / 2, 145);

    // Student Name
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 44px Kanit, sans-serif';
    ctx.fillText(data.studentName, w / 2, 230);

    // Underline
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 250, 245);
    ctx.lineTo(w / 2 + 250, 245);
    ctx.stroke();

    // Body Text
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '24px Kanit, sans-serif';
    ctx.fillText('ได้ผ่านการทดสอบวัดผลและประเมินความรู้ ในวิชา/หัวข้อ', w / 2, 310);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Kanit, sans-serif';
    ctx.fillText(`"${data.quizTitle}"`, w / 2, 360);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px Kanit, sans-serif';
    ctx.fillText(`ผลคะแนนการทดสอบ: ${data.percent}%  |  ให้ไว้ ณ วันที่ ${data.date}`, w / 2, 420);

    // Signatures & Gold Stamp
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "Fira Code", monospace';
    ctx.fillText(`VERIFICATION CODE: ${data.code}`, w / 2, 570);

    // Signature Line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 120, 515);
    ctx.lineTo(w / 2 + 120, 515);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Kanit, sans-serif';
    ctx.fillText('คณะกรรมการวัดและประเมินผล Gyver Assessment', w / 2, 540);
}

function downloadCertificateImage() {
    const canvas = document.getElementById('cert-preview-canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `Certificate_${lastExamResult?.studentName || 'GyverQuiz'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function viewQuizAnalytics(quizId) {
    currentQuiz = quizzesList.find(q => q.id === quizId);
    if (!currentQuiz) return;
    window.activeQuizId = currentQuiz.id;

    if (window.supabaseClient && isSupabaseTableAvailable) {
        try {
            const { data, error } = await window.supabaseClient
                .from('gyver_quiz_responses')
                .select('*')
                .eq('quiz_id', quizId)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                const mapped = data.map(item => ({
                    id: String(item.id),
                    quizId: item.quiz_id,
                    studentName: item.student_name,
                    studentRoom: item.student_room,
                    earnedPoints: item.score,
                    totalPoints: item.total,
                    percent: item.percentage,
                    isPassed: item.is_passed,
                    submittedAt: item.created_at,
                    questionResults: item.answers
                }));
                saveLocalQuizResponses(quizId, mapped);
            }
        } catch (e) {
            console.warn('Could not fetch responses from Supabase', e);
        }
    }

    renderAnalyticsView();
}

function renderAnalyticsView() {
    if (!currentQuiz) return;
    stopTimer();
    hideAllViews();
    const container = document.getElementById('view-analytics-container');
    if (container) container.classList.remove('d-none');
    updateUrlQuery(currentQuiz.id, 'analytics');

    document.getElementById('analytics-quiz-title').textContent = currentQuiz.title;
    document.getElementById('analytics-quiz-desc').textContent = currentQuiz.description || '';

    const responses = getLocalQuizResponses(currentQuiz.id);
    const totalTakers = responses.length;

    let totalPercent = 0;
    let highScore = 0;
    let passCount = 0;

    responses.forEach(r => {
        totalPercent += (r.percent || 0);
        if (r.percent > highScore) highScore = r.percent;
        if (r.isPassed) passCount++;
    });

    const avgPercent = totalTakers > 0 ? Math.round(totalPercent / totalTakers) : 0;
    const passRate = totalTakers > 0 ? Math.round((passCount / totalTakers) * 100) : 0;

    document.getElementById('stat-total-takers').textContent = totalTakers;
    document.getElementById('stat-avg-score').textContent = `${avgPercent}%`;
    document.getElementById('stat-high-score').textContent = `${highScore}%`;
    document.getElementById('stat-pass-rate').textContent = `${passRate}%`;

    // Leaderboard Table (Sorted by score desc, then time)
    const sorted = [...responses].sort((a, b) => b.percent - a.percent);
    const tbody = document.getElementById('analytics-leaderboard-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-subtle">ยังไม่มีประวัติการส่งข้อสอบ</td></tr>`;
        return;
    }

    sorted.forEach((r, idx) => {
        const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
        const dateStr = new Date(r.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold fs-5">${medal}</td>
            <td class="fw-bold text-white">${escapeHtml(r.studentName)}</td>
            <td class="text-subtle">${escapeHtml(r.studentRoom || '-')}</td>
            <td class="text-white">${r.earnedPoints} / ${r.totalPoints}</td>
            <td class="fw-bold text-quiz">${r.percent}%</td>
            <td>
                <span class="badge bg-${r.isPassed ? 'success' : 'danger'}">
                    ${r.isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
                </span>
            </td>
            <td class="text-subtle small">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportQuizResultsCSV() {
    if (!currentQuiz) return;
    const responses = getLocalQuizResponses(currentQuiz.id);
    if (responses.length === 0) {
        const swal = getCyberSwal();
        if (swal) {
            swal.fire({
                icon: 'info',
                title: 'ยังไม่มีข้อมูล',
                text: 'ยังไม่มีประวัติการสอบสำหรับส่งออกไฟล์ CSV',
                confirmButtonText: 'เข้าใจแล้ว'
            });
        } else {
            alert('ไม่มีข้อมูลสำหรับส่งออก CSV');
        }
        return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'อันดับ,ชื่อผู้เข้าสอบ,ห้อง/ชั้น,คะแนนที่ได้,คะแนนเต็ม,ร้อยละ,สถานะ,เวลาที่ส่ง\n';

    const sorted = [...responses].sort((a, b) => b.percent - a.percent);
    sorted.forEach((r, idx) => {
        csv += `"${idx + 1}","${r.studentName}","${r.studentRoom || ''}","${r.earnedPoints}","${r.totalPoints}","${r.percent}%","${r.isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}","${r.submittedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `QuizResults_${currentQuiz.title}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ====================================================
// 7. Modals & Helpers
// ====================================================

function showQuizShareModal() {
    if (!currentQuiz) return;
    openShareModalForId(currentQuiz.id);
}

function openShareModalForId(quizId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${quizId}&mode=taker`;
    const input = document.getElementById('share-url-input');
    const qrImg = document.getElementById('qr-code-img');

    if (input) input.value = shareUrl;
    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;

    const modal = new bootstrap.Modal(document.getElementById('shareModal'));
    modal.show();
}

function copyQuizShareUrl() {
    const input = document.getElementById('share-url-input');
    if (!input) return;
    input.select();
    document.execCommand('copy');

    const toast = getCyberToast();
    if (toast) {
        toast.fire({
            icon: 'success',
            title: 'คัดลอกลิงก์แบบทดสอบเรียบร้อยแล้ว!'
        });
    } else {
        alert('คัดลอกลิงก์แบบทดสอบเรียบร้อยแล้ว!');
    }
}

function downloadQrCode() {
    const qrImg = document.getElementById('qr-code-img');
    if (!qrImg || !qrImg.src) return;
    const a = document.createElement('a');
    a.href = qrImg.src;
    a.download = `QRCode_GyverQuiz.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function hideAllViews() {
    [
        'view-list-container',
        'view-builder-container',
        'view-taker-container',
        'view-result-container',
        'view-analytics-container'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('d-none');
    });
}

function updateUrlQuery(id, mode) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('id', id);
    else url.searchParams.delete('id');

    if (mode) url.searchParams.set('mode', mode);
    else url.searchParams.delete('mode');

    window.history.pushState({}, '', url);
}

function generateId() {
    return 'q_' + Math.random().toString(36).substr(2, 9);
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
