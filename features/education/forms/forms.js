/**
 * ====================================================
 * 📋 Gyver Forms - Engine & Logic (Google Forms Clone)
 * ====================================================
 */

// Global State
let currentForm = null;
let formsList = [];
let responsesList = [];
let currentMode = 'list'; // 'list', 'builder', 'respond', 'responses'
let isSupabaseTableAvailable = true;

document.addEventListener('DOMContentLoaded', async () => {
    parseUrlParams();
    await initDataStorage();

    if (currentMode === 'respond' && currentForm) {
        renderResponderView();
    } else if (currentMode === 'responses' && currentForm) {
        renderAnalyticsView();
    } else if (currentMode === 'builder' && currentForm) {
        renderBuilderView();
    } else {
        renderFormsListView();
    }
});

/**
 * อ่าน Query Params จาก URL
 */
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const formId = params.get('id');
    const mode = params.get('mode');

    if (mode && ['list', 'builder', 'respond', 'responses'].includes(mode)) {
        currentMode = mode;
    } else if (formId) {
        currentMode = 'respond'; // Default mode if only ID is provided
    }

    window.activeFormId = formId;
}

/**
 * 🗄️ Storage Engine (Supabase Sync with LocalStorage Fallback)
 */
async function initDataStorage() {
    formsList = getLocalForms();
    
    if (window.supabaseClient && isSupabaseTableAvailable) {
        try {
            const { data, error } = await window.supabaseClient
                .from('gyver_forms')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                isSupabaseTableAvailable = false;
                console.info('ℹ️ Supabase table "gyver_forms" not ready. Operating on LocalStorage engine.');
            } else if (data) {
                formsList = data.map(item => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    questions: item.schema || [],
                    createdAt: item.created_at,
                    updatedAt: item.updated_at
                }));
                saveLocalForms(formsList);
            }
        } catch (e) {
            isSupabaseTableAvailable = false;
        }
    }

    if (window.activeFormId) {
        currentForm = formsList.find(f => f.id === window.activeFormId);
        if (currentForm) {
            await loadFormResponses(currentForm.id);
        }
    }
}

function getLocalForms() {
    try {
        return JSON.parse(localStorage.getItem('gyver_forms_db') || '[]');
    } catch {
        return [];
    }
}

function saveLocalForms(data) {
    localStorage.setItem('gyver_forms_db', JSON.stringify(data));
}

function getLocalResponses(formId) {
    try {
        const all = JSON.parse(localStorage.getItem('gyver_form_responses_db') || '[]');
        return all.filter(r => r.formId === formId);
    } catch {
        return [];
    }
}

function saveLocalResponse(responseObj) {
    try {
        const all = JSON.parse(localStorage.getItem('gyver_form_responses_db') || '[]');
        all.push(responseObj);
        localStorage.setItem('gyver_form_responses_db', JSON.stringify(all));
    } catch (e) {
        console.error('Error saving local response:', e);
    }
}

async function loadFormResponses(formId) {
    responsesList = getLocalResponses(formId);

    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient
                .from('gyver_form_responses')
                .select('*')
                .eq('form_id', formId)
                .order('submitted_at', { ascending: false });

            if (!error && data) {
                responsesList = data.map(r => ({
                    id: r.id,
                    formId: r.form_id,
                    respondentName: r.respondent_name,
                    respondentEmail: r.respondent_email,
                    answers: r.answers || {},
                    submittedAt: r.submitted_at
                }));
            }
        } catch (e) {
            console.warn('Supabase responses table not available, using local responses.', e);
        }
    }
}

/**
 * 📋 1. List View (หน้าซอยรายการแบบฟอร์มทั้งหมด)
 */
function renderFormsListView() {
    currentMode = 'list';
    document.getElementById('view-list-container').classList.remove('d-none');
    document.getElementById('view-builder-container').classList.add('d-none');
    document.getElementById('view-responder-container').classList.add('d-none');
    document.getElementById('view-analytics-container').classList.add('d-none');

    const grid = document.getElementById('forms-grid');
    grid.innerHTML = '';

    if (formsList.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 text-subtle">
                <i class="bi bi-file-earmark-plus display-1 text-purple mb-3 opacity-50"></i>
                <h4 class="fw-bold text-white">ยังไม่มีแบบสอบถาม</h4>
                <p>กดปุ่ม "สร้างแบบสอบถามใหม่" ด้านบนเพื่อเริ่มต้นสร้างฟอร์มสไตล์ Google Forms ได้เลย</p>
                <button class="btn btn-purple-glow px-4 py-2 mt-2" onclick="createNewForm()">
                    <i class="bi bi-plus-lg me-1"></i>สร้างแบบสอบถามใหม่
                </button>
            </div>
        `;
        return;
    }

    formsList.forEach(form => {
        const localResp = getLocalResponses(form.id);
        const respCount = localResp.length;
        const formUrl = getShareableUrl(form.id, 'respond');

        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="cyber-card border-purple-accent h-100 d-flex flex-column justify-content-between">
                <div>
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-purple-subtle text-purple border border-purple px-2 py-1 small">
                            <i class="bi bi-card-checklist me-1"></i>${form.questions ? form.questions.length : 0} คำถาม
                        </span>
                        <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 small">
                            <i class="bi bi-chat-left-text me-1"></i>${respCount} คำตอบ
                        </span>
                    </div>
                    <h5 class="fw-bold text-white text-truncate mb-2" title="${escapeHtml(form.title)}">${escapeHtml(form.title || 'แบบฟอร์มไม่มีชื่อ')}</h5>
                    <p class="text-subtle small mb-3 text-truncate-2" style="min-height: 40px;">
                        ${escapeHtml(form.description || 'ไม่มีคำอธิบาย')}
                    </p>
                </div>
                <div>
                    <div class="border-top border-secondary pt-3 d-flex flex-wrap gap-2 justify-content-between">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-purple text-purple border-purple" onclick="editForm('${form.id}')" title="แก้ไขฟอร์ม">
                                <i class="bi bi-pencil-square me-1"></i>แก้ไข
                            </button>
                            <button class="btn btn-outline-info" onclick="viewAnalytics('${form.id}')" title="ดูสรุปผล">
                                <i class="bi bi-bar-chart-fill me-1"></i>ผลลัพธ์
                            </button>
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-light" onclick="copyShareLink('${form.id}')" title="คัดลอกลิงก์แชร์">
                                <i class="bi bi-link-45deg"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteForm('${form.id}')" title="ลบแบบฟอร์ม">
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

function createNewForm() {
    const newForm = {
        id: generateId(),
        title: 'แบบสอบถามใหม่',
        description: 'กรุณากรอกรายละเอียดของแบบสอบถามที่นี่',
        questions: [
            {
                id: generateId(),
                title: 'คำถามข้อที่ 1',
                type: 'radio',
                required: true,
                options: ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2']
            }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    formsList.unshift(newForm);
    saveLocalForms(formsList);
    syncFormToSupabase(newForm);

    currentForm = newForm;
    window.activeFormId = newForm.id;
    updateUrlQuery(newForm.id, 'builder');
    renderBuilderView();
}

function editForm(formId) {
    currentForm = formsList.find(f => f.id === formId);
    if (currentForm) {
        window.activeFormId = currentForm.id;
        updateUrlQuery(currentForm.id, 'builder');
        renderBuilderView();
    }
}

function viewAnalytics(formId) {
    currentForm = formsList.find(f => f.id === formId);
    if (currentForm) {
        window.activeFormId = currentForm.id;
        updateUrlQuery(currentForm.id, 'responses');
        loadFormResponses(formId).then(() => {
            renderAnalyticsView();
        });
    }
}

function updateUrlQuery(formId, mode) {
    try {
        const query = formId ? `?id=${formId}&mode=${mode}` : 'forms.html';
        if (window.location.protocol !== 'file:') {
            history.pushState(null, '', query);
        } else {
            try {
                history.replaceState(null, '', query);
            } catch (e) {}
        }
    } catch (e) {
        // Safe catch for local file:// security origin restriction
    }
}

async function deleteForm(formId) {
    if (!confirm('คุณต้องการลบแบบสอบถามนี้ใช่หรือไม่? (ข้อมูลคำตอบทั้งหมดจะถูกลบด้วย)')) return;

    formsList = formsList.filter(f => f.id !== formId);
    saveLocalForms(formsList);

    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('gyver_forms').delete().eq('id', formId);
        } catch (e) {
            console.warn('Error deleting from supabase:', e);
        }
    }

    renderFormsListView();
}

/**
 * 🛠️ 2. Form Builder View (ระบบแก้ไขแบบฟอร์ม)
 */
function renderBuilderView() {
    currentMode = 'builder';
    document.getElementById('view-list-container').classList.add('d-none');
    document.getElementById('view-builder-container').classList.remove('d-none');
    document.getElementById('view-responder-container').classList.add('d-none');
    document.getElementById('view-analytics-container').classList.add('d-none');

    document.getElementById('builder-form-title').value = currentForm.title || '';
    document.getElementById('builder-form-desc').value = currentForm.description || '';

    renderQuestionsEditorList();
}

function renderQuestionsEditorList() {
    const list = document.getElementById('questions-editor-list');
    list.innerHTML = '';

    currentForm.questions.forEach((q, idx) => {
        const qBlock = document.createElement('div');
        qBlock.className = 'question-block';
        qBlock.id = `q-block-${q.id}`;

        let optionsHtml = '';
        if (q.type === 'radio' || q.type === 'checkbox') {
            optionsHtml = `
                <div class="mt-3">
                    <label class="form-label text-subtle small fw-bold"><i class="bi bi-list-task me-1"></i>รายการตัวเลือก:</label>
                    <div id="options-list-${q.id}" class="d-flex flex-column gap-2 mb-2">
                        ${q.options.map((opt, optIdx) => `
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-dark border-secondary text-subtle">
                                    <i class="bi bi-${q.type === 'radio' ? 'circle' : 'square'}"></i>
                                </span>
                                <input type="text" class="form-control form-control-cyber" value="${escapeHtml(opt)}" 
                                    onchange="updateOptionText('${q.id}', ${optIdx}, this.value)">
                                <button class="btn btn-outline-danger" onclick="removeOption('${q.id}', ${optIdx})" ${q.options.length <= 1 ? 'disabled' : ''}>
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-sm btn-outline-purple text-purple border-purple rounded-pill mt-1" onclick="addOption('${q.id}')">
                        <i class="bi bi-plus-circle me-1"></i>เพิ่มตัวเลือก
                    </button>
                </div>
            `;
        } else if (q.type === 'rating') {
            optionsHtml = `
                <div class="mt-3 p-3 bg-dark rounded-3 border border-secondary text-subtle small">
                    <i class="bi bi-star-fill text-warning me-1"></i>โหมดสเกลความพึงพอใจ: แสดงตัวเลือกให้กดให้คะแนน 1 ถึง 5 ดาว/คะแนน
                </div>
            `;
        } else if (q.type === 'text') {
            optionsHtml = `
                <div class="mt-3">
                    <input type="text" class="form-control form-control-cyber" disabled placeholder="ตัวอย่างช่องกรอกข้อความสั้น...">
                </div>
            `;
        } else if (q.type === 'paragraph') {
            optionsHtml = `
                <div class="mt-3">
                    <textarea class="form-control form-control-cyber" rows="2" disabled placeholder="ตัวอย่างช่องกรอกข้อความยาว/ย่อหน้า..."></textarea>
                </div>
            `;
        } else if (q.type === 'date') {
            optionsHtml = `
                <div class="mt-3">
                    <input type="date" class="form-control form-control-cyber" style="max-width: 250px;" disabled>
                </div>
            `;
        }

        qBlock.innerHTML = `
            <div class="row g-2 align-items-center mb-3">
                <div class="col-12 col-md-7">
                    <div class="input-group">
                        <span class="input-group-text bg-purple text-white border-purple fw-bold">ข้อ ${idx + 1}</span>
                        <input type="text" class="form-control form-control-cyber fw-bold" value="${escapeHtml(q.title)}" 
                            placeholder="ระบุคำถามที่นี่..." onchange="updateQuestionTitle('${q.id}', this.value)">
                    </div>
                </div>
                <div class="col-12 col-md-5">
                    <select class="form-select form-select-cyber" onchange="changeQuestionType('${q.id}', this.value)">
                        <option value="radio" ${q.type === 'radio' ? 'selected' : ''}>🔘 ตัวเลือกเดียว (Multiple Choice)</option>
                        <option value="checkbox" ${q.type === 'checkbox' ? 'selected' : ''}>☑️ หลายตัวเลือก (Checkboxes)</option>
                        <option value="text" ${q.type === 'text' ? 'selected' : ''}>📝 ข้อความสั้น (Short Text)</option>
                        <option value="paragraph" ${q.type === 'paragraph' ? 'selected' : ''}>📄 ย่อหน้า/คำตอบยาว (Paragraph)</option>
                        <option value="rating" ${q.type === 'rating' ? 'selected' : ''}>⭐ คะแนน 1-5 (Linear Rating)</option>
                        <option value="date" ${q.type === 'date' ? 'selected' : ''}>📅 เลือกวันที่ (Date)</option>
                    </select>
                </div>
            </div>

            ${optionsHtml}

            <div class="border-top border-secondary pt-3 mt-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" id="req-${q.id}" 
                        ${q.required ? 'checked' : ''} onchange="toggleQuestionRequired('${q.id}', this.checked)">
                    <label class="form-check-label text-warning small fw-bold" for="req-${q.id}">
                        <i class="bi bi-asterisk text-danger me-1"></i>จำกัดต้องตอบ (Required)
                    </label>
                </div>

                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary text-white" onclick="moveQuestion('${q.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="ย้ายขึ้น">
                        <i class="bi bi-arrow-up"></i>
                    </button>
                    <button class="btn btn-outline-secondary text-white" onclick="moveQuestion('${q.id}', 1)" ${idx === currentForm.questions.length - 1 ? 'disabled' : ''} title="ย้ายลง">
                        <i class="bi bi-arrow-down"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="duplicateQuestion('${q.id}')" title="คัดลอกคำถาม">
                        <i class="bi bi-copy me-1"></i>คัดลอก
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteQuestion('${q.id}')" ${currentForm.questions.length <= 1 ? 'disabled' : ''} title="ลบคำถาม">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        list.appendChild(qBlock);
    });
}

function updateBuilderHeader() {
    if (!currentForm) return;
    currentForm.title = document.getElementById('builder-form-title').value.trim() || 'แบบสอบถามไม่มีชื่อ';
    currentForm.description = document.getElementById('builder-form-desc').value.trim();
    saveCurrentFormState();
}

function addQuestion() {
    const newQ = {
        id: generateId(),
        title: `คำถามข้อที่ ${currentForm.questions.length + 1}`,
        type: 'radio',
        required: true,
        options: ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2']
    };
    currentForm.questions.push(newQ);
    saveCurrentFormState();
    renderQuestionsEditorList();
}

function updateQuestionTitle(qId, val) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        q.title = val.trim();
        saveCurrentFormState();
    }
}

function changeQuestionType(qId, newType) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        q.type = newType;
        if ((newType === 'radio' || newType === 'checkbox') && (!q.options || q.options.length === 0)) {
            q.options = ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2'];
        }
        saveCurrentFormState();
        renderQuestionsEditorList();
    }
}

function updateOptionText(qId, optIdx, val) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q && q.options && q.options[optIdx] !== undefined) {
        q.options[optIdx] = val.trim();
        saveCurrentFormState();
    }
}

function addOption(qId) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        if (!q.options) q.options = [];
        q.options.push(`ตัวเลือกที่ ${q.options.length + 1}`);
        saveCurrentFormState();
        renderQuestionsEditorList();
    }
}

function removeOption(qId, optIdx) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q && q.options && q.options.length > 1) {
        q.options.splice(optIdx, 1);
        saveCurrentFormState();
        renderQuestionsEditorList();
    }
}

function toggleQuestionRequired(qId, isReq) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        q.required = isReq;
        saveCurrentFormState();
    }
}

function duplicateQuestion(qId) {
    const idx = currentForm.questions.findIndex(item => item.id === qId);
    if (idx !== -1) {
        const original = currentForm.questions[idx];
        const copy = JSON.parse(JSON.stringify(original));
        copy.id = generateId();
        copy.title = `${copy.title} (สำเนา)`;
        currentForm.questions.splice(idx + 1, 0, copy);
        saveCurrentFormState();
        renderQuestionsEditorList();
    }
}

function deleteQuestion(qId) {
    if (currentForm.questions.length <= 1) return;
    currentForm.questions = currentForm.questions.filter(q => q.id !== qId);
    saveCurrentFormState();
    renderQuestionsEditorList();
}

function moveQuestion(qId, delta) {
    const idx = currentForm.questions.findIndex(q => q.id === qId);
    if (idx === -1) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= currentForm.questions.length) return;

    const temp = currentForm.questions[idx];
    currentForm.questions[idx] = currentForm.questions[targetIdx];
    currentForm.questions[targetIdx] = temp;

    saveCurrentFormState();
    renderQuestionsEditorList();
}

function saveCurrentFormState() {
    currentForm.updatedAt = new Date().toISOString();
    const idx = formsList.findIndex(f => f.id === currentForm.id);
    if (idx !== -1) {
        formsList[idx] = currentForm;
    } else {
        formsList.unshift(currentForm);
    }
    saveLocalForms(formsList);
}

async function saveFormAndNotify() {
    updateBuilderHeader();
    saveCurrentFormState();
    await syncFormToSupabase(currentForm);

    const shareUrl = getShareableUrl(currentForm.id, 'respond');
    alert(`✅ บันทึกแบบสอบถามเรียบร้อยแล้ว!\n\nลิงก์สำหรับส่งให้ผู้ตอบ:\n${shareUrl}`);
}

async function syncFormToSupabase(formObj) {
    if (!window.supabaseClient || !isSupabaseTableAvailable) return;
    try {
        const { error } = await window.supabaseClient
            .from('gyver_forms')
            .upsert({
                id: formObj.id,
                title: formObj.title,
                description: formObj.description,
                schema: formObj.questions,
                updated_at: formObj.updatedAt
            });
        if (error) {
            isSupabaseTableAvailable = false;
        }
    } catch (e) {
        isSupabaseTableAvailable = false;
    }
}

/**
 * 📝 3. Form Responder View (หน้าสำหรับผู้กรอกแบบสอบถาม)
 */
function renderResponderView() {
    currentMode = 'respond';
    document.getElementById('view-list-container').classList.add('d-none');
    document.getElementById('view-builder-container').classList.add('d-none');
    document.getElementById('view-responder-container').classList.remove('d-none');
    document.getElementById('view-analytics-container').classList.add('d-none');

    const titleEl = document.getElementById('responder-form-title');
    const descEl = document.getElementById('responder-form-desc');
    const qListEl = document.getElementById('responder-questions-list');
    const successBox = document.getElementById('responder-success-box');
    const formBox = document.getElementById('responder-form-box');

    successBox.classList.add('d-none');
    formBox.classList.remove('d-none');

    titleEl.innerText = currentForm.title || 'แบบสอบถาม';
    descEl.innerText = currentForm.description || '';

    qListEl.innerHTML = '';

    currentForm.questions.forEach((q, idx) => {
        const qCard = document.createElement('div');
        qCard.className = 'cyber-card mb-4 border-purple';

        let inputHtml = '';
        if (q.type === 'radio') {
            inputHtml = q.options.map((opt, optIdx) => `
                <label class="custom-option-item w-100 mb-2">
                    <input type="radio" name="resp_q_${q.id}" value="${escapeHtml(opt)}" class="form-check-input">
                    <span>${escapeHtml(opt)}</span>
                </label>
            `).join('');
        } else if (q.type === 'checkbox') {
            inputHtml = q.options.map((opt, optIdx) => `
                <label class="custom-option-item w-100 mb-2">
                    <input type="checkbox" name="resp_q_${q.id}" value="${escapeHtml(opt)}" class="form-check-input">
                    <span>${escapeHtml(opt)}</span>
                </label>
            `).join('');
        } else if (q.type === 'rating') {
            inputHtml = `
                <div class="d-flex justify-content-between gap-2 flex-wrap pt-2">
                    ${[1, 2, 3, 4, 5].map(num => `
                        <label class="btn btn-outline-purple flex-grow-1 text-center py-2 border-purple">
                            <input type="radio" name="resp_q_${q.id}" value="${num}" class="btn-check" id="star_${q.id}_${num}">
                            <span class="d-block fs-4">⭐</span>
                            <span class="fw-bold">${num}</span>
                        </label>
                    `).join('')}
                </div>
            `;
        } else if (q.type === 'text') {
            inputHtml = `<input type="text" id="resp_q_${q.id}" class="form-control form-control-cyber" placeholder="กรอกคำตอบของคุณที่นี่...">`;
        } else if (q.type === 'paragraph') {
            inputHtml = `<textarea id="resp_q_${q.id}" class="form-control form-control-cyber" rows="3" placeholder="กรอกคำตอบเพิ่มเติม..."></textarea>`;
        } else if (q.type === 'date') {
            inputHtml = `<input type="date" id="resp_q_${q.id}" class="form-control form-control-cyber" style="max-width: 300px;">`;
        }

        qCard.innerHTML = `
            <div class="mb-3">
                <h5 class="fw-bold text-white">
                    ${idx + 1}. ${escapeHtml(q.title)}
                    ${q.required ? '<span class="text-danger fw-bold ms-1" title="จำกัดต้องตอบ">*</span>' : ''}
                </h5>
            </div>
            <div>${inputHtml}</div>
        `;
        qListEl.appendChild(qCard);
    });
}

async function submitResponse() {
    const respondentName = document.getElementById('responder-name').value.trim() || 'ผู้ตอบทั่วไป';
    const respondentEmail = document.getElementById('responder-email').value.trim();

    const answers = {};
    let missingRequired = false;

    for (const q of currentForm.questions) {
        let val = null;

        if (q.type === 'radio' || q.type === 'rating') {
            const checked = document.querySelector(`input[name="resp_q_${q.id}"]:checked`);
            if (checked) val = checked.value;
        } else if (q.type === 'checkbox') {
            const checkedBoxes = document.querySelectorAll(`input[name="resp_q_${q.id}"]:checked`);
            val = Array.from(checkedBoxes).map(cb => cb.value);
            if (val.length === 0) val = null;
        } else if (q.type === 'text' || q.type === 'paragraph' || q.type === 'date') {
            const input = document.getElementById(`resp_q_${q.id}`);
            if (input && input.value.trim() !== '') {
                val = input.value.trim();
            }
        }

        if (q.required && (val === null || val === undefined || (Array.isArray(val) && val.length === 0))) {
            missingRequired = true;
            break;
        }

        answers[q.id] = val;
    }

    if (missingRequired) {
        alert('⚠️ กรุณากรอกข้อมูลในข้อบังคับ (ที่มีเครื่องหมาย *) ให้ครบถ้วน');
        return;
    }

    const responseObj = {
        id: generateId(),
        formId: currentForm.id,
        respondentName: respondentName,
        respondentEmail: respondentEmail,
        answers: answers,
        submittedAt: new Date().toISOString()
    };

    saveLocalResponse(responseObj);

    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('gyver_form_responses').insert({
                id: responseObj.id,
                form_id: responseObj.formId,
                respondent_name: responseObj.respondentName,
                respondent_email: responseObj.respondentEmail,
                answers: responseObj.answers,
                submitted_at: responseObj.submittedAt
            });
        } catch (e) {
            console.warn('Error saving response to Supabase:', e);
        }
    }

    document.getElementById('responder-form-box').classList.add('d-none');
    document.getElementById('responder-success-box').classList.remove('d-none');
}

/**
 * 📊 4. Form Analytics & Responses View (หน้าดูผลลัพธ์และสรุป)
 */
function renderAnalyticsView() {
    currentMode = 'responses';
    document.getElementById('view-list-container').classList.add('d-none');
    document.getElementById('view-builder-container').classList.add('d-none');
    document.getElementById('view-responder-container').classList.add('d-none');
    document.getElementById('view-analytics-container').classList.remove('d-none');

    document.getElementById('analytics-form-title').innerText = currentForm.title || 'สรุปผลแบบสอบถาม';
    document.getElementById('analytics-total-count').innerText = responsesList.length;

    const summaryContainer = document.getElementById('analytics-questions-summary');
    summaryContainer.innerHTML = '';

    if (responsesList.length === 0) {
        summaryContainer.innerHTML = `
            <div class="cyber-card text-center py-5 text-subtle">
                <i class="bi bi-inbox-fill display-2 text-purple mb-3 opacity-50"></i>
                <h4 class="fw-bold text-white">ยังไม่มีผู้เข้ามาตอบแบบสอบถามนี้</h4>
                <p>ส่งลิงก์แบบสอบถามให้นักเรียนหรือผู้ตอบกรอกข้อมูลได้เลย</p>
                <button class="btn btn-purple-glow px-4 py-2 mt-2" onclick="copyShareLink('${currentForm.id}')">
                    <i class="bi bi-link-45deg me-1"></i>คัดลอกลิงก์แบบสอบถาม
                </button>
            </div>
        `;
    } else {
        currentForm.questions.forEach((q, idx) => {
            const qCard = document.createElement('div');
            qCard.className = 'cyber-card mb-4 border-purple-accent';

            let statsContent = '';

            if (q.type === 'radio' || q.type === 'checkbox') {
                const counts = {};
                (q.options || []).forEach(opt => counts[opt] = 0);

                responsesList.forEach(r => {
                    const ans = r.answers ? r.answers[q.id] : null;
                    if (Array.isArray(ans)) {
                        ans.forEach(val => { if (counts[val] !== undefined) counts[val]++; });
                    } else if (ans && counts[ans] !== undefined) {
                        counts[ans]++;
                    }
                });

                const totalAns = responsesList.length;

                statsContent = (q.options || []).map(opt => {
                    const cnt = counts[opt] || 0;
                    const pct = totalAns > 0 ? Math.round((cnt / totalAns) * 100) : 0;
                    return `
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center small mb-1">
                                <span class="fw-bold text-white">${escapeHtml(opt)}</span>
                                <span class="text-purple fw-bold">${cnt} คน (${pct}%)</span>
                            </div>
                            <div class="progress progress-cyber">
                                <div class="progress-bar progress-bar-purple" style="width: ${pct}%"></div>
                            </div>
                        </div>
                    `;
                }).join('');

            } else if (q.type === 'rating') {
                let sum = 0;
                let count = 0;
                const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

                responsesList.forEach(r => {
                    const val = parseInt(r.answers ? r.answers[q.id] : 0);
                    if (val >= 1 && val <= 5) {
                        sum += val;
                        count++;
                        starCounts[val]++;
                    }
                });

                const avg = count > 0 ? (sum / count).toFixed(1) : '0.0';

                statsContent = `
                    <div class="d-flex align-items-center gap-4 mb-3 p-3 bg-dark rounded-3">
                        <div class="text-center">
                            <h2 class="display-4 fw-bold text-warning m-0">${avg}</h2>
                            <div class="text-warning fs-5">⭐⭐⭐⭐⭐</div>
                            <span class="text-subtle small">จาก ${count} การประเมิน</span>
                        </div>
                        <div class="flex-grow-1">
                            ${[5, 4, 3, 2, 1].map(star => {
                                const cnt = starCounts[star];
                                const pct = count > 0 ? Math.round((cnt / count) * 100) : 0;
                                return `
                                    <div class="d-flex align-items-center gap-2 small mb-1">
                                        <span class="text-subtle" style="width: 40px;">${star} ดาว</span>
                                        <div class="progress progress-cyber flex-grow-1">
                                            <div class="progress-bar bg-warning" style="width: ${pct}%"></div>
                                        </div>
                                        <span class="text-subtle" style="width: 45px; text-align: right;">${cnt} คน</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            } else {
                // Text / Paragraph / Date
                const textAnswers = responsesList
                    .map(r => r.answers ? r.answers[q.id] : null)
                    .filter(ans => ans && ans !== '');

                statsContent = textAnswers.length > 0 ? `
                    <div class="list-group list-group-flush rounded-3 overflow-hidden border border-secondary">
                        ${textAnswers.map(ans => `
                            <div class="list-group-item bg-dark text-white border-secondary py-2 px-3 small">
                                <i class="bi bi-chat-left-quote text-purple me-2"></i>${escapeHtml(ans)}
                            </div>
                        `).join('')}
                    </div>
                ` : `<p class="text-subtle small m-0">ไม่มีคำตอบที่เป็นข้อความ</p>`;
            }

            qCard.innerHTML = `
                <h5 class="fw-bold text-white mb-3">${idx + 1}. ${escapeHtml(q.title)}</h5>
                <div>${statsContent}</div>
            `;

            summaryContainer.appendChild(qCard);
        });
    }

    renderAnalyticsTable();
}

function renderAnalyticsTable() {
    const tbody = document.getElementById('analytics-responses-tbody');
    tbody.innerHTML = '';

    responsesList.forEach((r, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'border-secondary';

        const timeStr = r.submittedAt ? new Date(r.submittedAt).toLocaleString('th-TH') : '-';

        let answersSummary = currentForm.questions.map(q => {
            let val = r.answers ? r.answers[q.id] : '-';
            if (Array.isArray(val)) val = val.join(', ');
            return `<div><strong class="text-purple-glow">${escapeHtml(q.title)}:</strong> ${escapeHtml(val || '-')}</div>`;
        }).join('');

        tr.innerHTML = `
            <td class="text-subtle">${idx + 1}</td>
            <td class="fw-bold text-white">${escapeHtml(r.respondentName || 'ผู้ตอบทั่วไป')}</td>
            <td class="text-subtle small">${escapeHtml(r.respondentEmail || '-')}</td>
            <td class="small text-subtle">${timeStr}</td>
            <td class="small">${answersSummary}</td>
        `;

        tbody.appendChild(tr);
    });
}

function exportResponsesToCSV() {
    if (!responsesList || responsesList.length === 0) {
        alert('⚠️ ไม่พบข้อมูลคำตอบสำหรับส่งออก');
        return;
    }

    const headers = ['ลำดับ', 'ชื่อผู้ตอบ', 'อีเมล', 'เวลาที่ส่ง'];
    currentForm.questions.forEach(q => headers.push(`"${q.title.replace(/"/g, '""')}"`));

    const csvRows = [headers.join(',')];

    responsesList.forEach((r, idx) => {
        const row = [
            idx + 1,
            `"${(r.respondentName || '').replace(/"/g, '""')}"`,
            `"${(r.respondentEmail || '').replace(/"/g, '""')}"`,
            `"${r.submittedAt ? new Date(r.submittedAt).toLocaleString('th-TH') : ''}"`
        ];

        currentForm.questions.forEach(q => {
            let val = r.answers ? r.answers[q.id] : '';
            if (Array.isArray(val)) val = val.join('; ');
            if (val === null || val === undefined) val = '';
            row.push(`"${String(val).replace(/"/g, '""')}"`);
        });

        csvRows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM for Thai Excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Gyver_Form_Responses_${currentForm.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clearAllResponses() {
    if (!confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบคำตอบทั้งหมดของแบบสอบถามนี้?')) return;

    responsesList = [];
    try {
        const all = JSON.parse(localStorage.getItem('gyver_form_responses_db') || '[]');
        const filtered = all.filter(r => r.formId !== currentForm.id);
        localStorage.setItem('gyver_form_responses_db', JSON.stringify(filtered));
    } catch (e) {
        console.error('Error clearing local responses:', e);
    }

    renderAnalyticsView();
}

/**
 * 🔗 Utilities
 */
function getShareableUrl(formId, mode = 'respond') {
    const origin = window.location.origin + window.location.pathname;
    return `${origin}?id=${formId}&mode=${mode}`;
}

function copyShareLink(formId) {
    const url = getShareableUrl(formId, 'respond');
    navigator.clipboard.writeText(url).then(() => {
        alert('📋 คัดลอกลิงก์แบบสอบถามแล้ว!\n\nส่งลิงก์นี้ให้นักเรียนหรือผู้ตอบได้ทันที');
    }).catch(() => {
        prompt('คัดลอกลิงก์ด้านล่างนี้:', url);
    });
}

function generateId() {
    return 'f_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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
