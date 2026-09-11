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

// 🌟 SweetAlert2 Cyber Dialog Helpers
function getCyberSwal() {
    if (typeof Swal !== 'undefined') {
        return Swal.mixin({
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#f8fafc',
            customClass: {
                popup: 'cyber-swal-popup border-purple',
                confirmButton: 'btn btn-purple-glow px-4 py-2 fw-bold',
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
                popup: 'cyber-swal-popup border-purple'
            }
        });
    }
    return null;
}

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
                console.info('ℹ️ Operating on LocalStorage engine.');
            } else if (data) {
                formsList = data.map(item => {
                    let qList = [];
                    let setObj = { limitOneResponse: true, allowEdit: true, maxEditLimit: 3 };

                    if (Array.isArray(item.schema)) {
                        qList = item.schema;
                    } else if (item.schema && typeof item.schema === 'object') {
                        qList = item.schema.questions || [];
                        if (item.schema.settings) setObj = item.schema.settings;
                    }

                    return {
                        id: item.id,
                        title: item.title,
                        description: item.description,
                        questions: qList,
                        settings: setObj,
                        createdAt: item.created_at,
                        updatedAt: item.updated_at
                    };
                });
                saveLocalForms(formsList);
            }
        } catch (e) {
            isSupabaseTableAvailable = false;
        }
    }

    if (window.activeFormId) {
        currentForm = formsList.find(f => f.id === window.activeFormId) || null;
        if (currentForm) {
            await loadFormResponses(currentForm.id);
        }
    }
}

function getLocalForms() {
    try {
        const raw = localStorage.getItem('gyver_forms_list');
        const list = raw ? JSON.parse(raw) : getSampleForms();
        return list.map(f => {
            if (!f.settings) f.settings = {};
            if (f.settings.limitOneResponse === undefined) f.settings.limitOneResponse = true;
            return f;
        });
    } catch (e) {
        return getSampleForms();
    }
}

function saveLocalForms(forms) {
    localStorage.setItem('gyver_forms_list', JSON.stringify(forms));
}

function getLocalResponses(formId) {
    try {
        const raw = localStorage.getItem(`gyver_form_responses_${formId}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalResponse(formId, responseObj) {
    const list = getLocalResponses(formId);
    list.unshift(responseObj);
    localStorage.setItem(`gyver_form_responses_${formId}`, JSON.stringify(list));
    return list;
}

/**
 * 📦 ข้อมูลตัวอย่างเริ่มต้น (Sample Form Data)
 */
function getSampleForms() {
    return [
        {
            id: 'sample-form-101',
            title: 'แบบประเมินความพึงพอใจการจัดการเรียนรู้',
            description: 'ขอความอนุเคราะห์ตอบแบบสอบถามเพื่อนำข้อมูลไปพัฒนาการสอนในภาคเรียนถัดไป',
            settings: {
                limitOneResponse: true,
                allowEdit: true,
                isQuiz: false,
                passingScore: 70,
                certTitle: 'เกียรติบัตรเข้าร่วมการประเมิน'
            },
            questions: [
                {
                    id: 'q1',
                    title: 'ชื่อ-นามสกุล ผู้ตอบแบบสอบถาม',
                    type: 'text',
                    required: true
                },
                {
                    id: 'q2',
                    title: 'ระดับความพึงพอใจต่อภาพรวมของรายวิชา',
                    type: 'radio',
                    required: true,
                    options: ['มากที่สุด', 'มาก', 'ปานกลาง', 'น้อย']
                },
                {
                    id: 'q3',
                    title: 'ข้อเสนอแนะเพิ่มเติมสำหรับการปรับปรุงรายวิชา',
                    type: 'textarea',
                    required: false
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
}

/**
 * 🔄 Sync Form to Supabase
 */
async function syncFormToSupabase(formObj) {
    if (!window.supabaseClient || !isSupabaseTableAvailable) return;
    try {
        const schemaPayload = {
            questions: formObj.questions,
            settings: formObj.settings
        };
        await window.supabaseClient.from('gyver_forms').upsert({
            id: formObj.id,
            title: formObj.title,
            description: formObj.description,
            schema: schemaPayload,
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Supabase sync skipped:', e);
    }
}

/**
 * 📥 Load Responses for a form
 */
async function loadFormResponses(formId) {
    responsesList = getLocalResponses(formId);
    const noticeEl = document.getElementById('supabase-missing-notice');

    if (window.supabaseClient && isSupabaseTableAvailable) {
        try {
            let res = await window.supabaseClient
                .from('gyver_form_responses')
                .select('*')
                .eq('form_id', formId)
                .order('created_at', { ascending: false });

            // Fallback: หากตารางเดิมยังไม่มีคอลัมน์ created_at ให้ลอง select โดยไม่ sort created_at
            if (res.error && (res.error.code === '42703' || res.error.message?.includes('created_at'))) {
                console.warn('⚠️ Column created_at missing, retrying without order:', res.error);
                res = await window.supabaseClient
                    .from('gyver_form_responses')
                    .select('*')
                    .eq('form_id', formId);
            }

            if (res.error) {
                console.warn('Supabase gyver_form_responses error:', res.error);
                if (noticeEl) noticeEl.classList.remove('d-none');
            } else if (res.data) {
                if (noticeEl) noticeEl.classList.add('d-none');
                if (res.data.length > 0) {
                    responsesList = res.data.map(item => ({
                        id: item.id,
                        responderName: item.responder_name || 'ผู้ตอบแบบสอบถาม',
                        answers: typeof item.answers === 'string' ? JSON.parse(item.answers) : (item.answers || {}),
                        quizScore: Number(item.quiz_score) || 0,
                        totalPoints: Number(item.total_points) || 0,
                        isPassed: !!item.is_passed,
                        submittedAt: item.created_at || new Date().toISOString()
                    }));
                    localStorage.setItem(`gyver_form_responses_${formId}`, JSON.stringify(responsesList));
                }
            }
        } catch (e) {
            console.warn('Supabase response fetch skipped:', e);
            if (noticeEl) noticeEl.classList.remove('d-none');
        }
    }
}

// ====================================================
// 1. List View (หน้าแสดงรายการฟอร์ม)
// ====================================================

function renderFormsListView() {
    hideAllViewContainers();
    const container = document.getElementById('view-list-container');
    if (container) container.classList.remove('d-none');

    const grid = document.getElementById('forms-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (formsList.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox text-subtle fs-1"></i>
                <p class="text-subtle mt-2">ยังไม่มีแบบสอบถาม คุณสามารถกดสร้างใหม่ได้ทันที</p>
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
                            <button class="btn btn-sm btn-outline-purple text-purple border-purple" onclick="showQrCodeModal('${form.id}')" title="คัดลอกลิงก์ & ดู QR Code">
                                <i class="bi bi-qr-code-scan me-1"></i>แชร์
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteForm('${form.id}')" title="ลบแบบสอบถาม">
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
        settings: {
            limitOneResponse: true,
            allowEdit: true,
            maxEditLimit: 3,
            isQuiz: false,
            passingScore: 70,
            certTitle: 'เกียรติบัตรเข้าร่วมกิจกรรม'
        },
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

async function deleteForm(formId) {
    const swal = getCyberSwal();
    if (swal) {
        const result = await swal.fire({
            title: 'ยืนยันการลบแบบสอบถาม?',
            text: 'ข้อมูลคำตอบและประวัติทั้งหมดจะถูกลบถาวร',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-trash-fill me-1"></i> ลบแบบฟอร์ม',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: 'cyber-swal-popup border-purple',
                confirmButton: 'btn btn-danger px-4 py-2 fw-bold me-2',
                cancelButton: 'btn btn-outline-secondary px-4 py-2 text-white'
            }
        });
        if (!result.isConfirmed) return;
    } else if (!confirm('คุณแน่ใจหรือไม่ที่จะลบแบบสอบถามนี้? ข้อมูลคำตอบทั้งหมดจะถูกลบออก')) {
        return;
    }

    formsList = formsList.filter(f => f.id !== formId);
    saveLocalForms(formsList);

    const toast = getCyberToast();
    if (toast) {
        toast.fire({
            icon: 'success',
            title: 'ลบแบบสอบถามเรียบร้อยแล้ว'
        });
    }

    renderFormsListView();
}

// ====================================================
// 2. Builder View (สร้าง & แก้ไขฟอร์ม)
// ====================================================

function renderBuilderView() {
    hideAllViewContainers();
    const container = document.getElementById('view-builder-container');
    if (container) container.classList.remove('d-none');

    if (!currentForm) return;

    const titleInput = document.getElementById('form-title-input');
    const descInput = document.getElementById('form-desc-input');
    if (titleInput) titleInput.value = currentForm.title || '';
    if (descInput) descInput.value = currentForm.description || '';

    // Render Form Settings
    const limitOneToggle = document.getElementById('setting-limit-one');
    const allowEditToggle = document.getElementById('setting-allow-edit');
    const maxEditSelect = document.getElementById('setting-max-edit-limit');

    if (limitOneToggle) {
        if (!currentForm.settings) currentForm.settings = {};
        if (currentForm.settings.limitOneResponse === undefined) currentForm.settings.limitOneResponse = true;
        limitOneToggle.checked = !!currentForm.settings.limitOneResponse;
    }
    if (allowEditToggle) {
        allowEditToggle.checked = currentForm.settings ? !!currentForm.settings.allowEdit : true;
        toggleEditLimitUI();
    }
    if (maxEditSelect) maxEditSelect.value = (currentForm.settings && currentForm.settings.maxEditLimit) || 3;

    renderQuestionsList();
}

function updateFormHeaderInfo() {
    if (!currentForm) return;
    const titleInput = document.getElementById('form-title-input');
    const descInput = document.getElementById('form-desc-input');
    if (titleInput) currentForm.title = titleInput.value;
    if (descInput) currentForm.description = descInput.value;

    currentForm.updatedAt = new Date().toISOString();
    saveLocalForms(formsList);
    syncFormToSupabase(currentForm);
}

function toggleQuizSettingsUI() {
    const isQuiz = document.getElementById('setting-quiz-mode')?.checked || false;
    const subContainer = document.getElementById('quiz-settings-sub');
    if (subContainer) {
        subContainer.classList.toggle('d-none', !isQuiz);
    }
    updateFormSettings();
    renderQuestionsList();
}

function toggleEditLimitUI() {
    const allowEdit = document.getElementById('setting-allow-edit')?.checked || false;
    const subContainer = document.getElementById('edit-limit-sub');
    if (subContainer) {
        subContainer.classList.toggle('d-none', !allowEdit);
    }
    updateFormSettings();
}

function updateFormSettings() {
    if (!currentForm) return;
    if (!currentForm.settings) currentForm.settings = {};

    const quizToggle = document.getElementById('setting-quiz-mode');
    const passingInput = document.getElementById('setting-passing-score');
    const certTitleInput = document.getElementById('setting-cert-title');
    const limitOneToggle = document.getElementById('setting-limit-one');
    const allowEditToggle = document.getElementById('setting-allow-edit');
    const maxEditSelect = document.getElementById('setting-max-edit-limit');

    if (quizToggle) currentForm.settings.isQuiz = quizToggle.checked;
    if (passingInput) currentForm.settings.passingScore = parseInt(passingInput.value) || 70;
    if (certTitleInput) currentForm.settings.certTitle = certTitleInput.value;
    if (limitOneToggle) currentForm.settings.limitOneResponse = limitOneToggle.checked;
    if (allowEditToggle) currentForm.settings.allowEdit = allowEditToggle.checked;
    if (maxEditSelect) currentForm.settings.maxEditLimit = parseInt(maxEditSelect.value) || 3;

    saveLocalForms(formsList);
    syncFormToSupabase(currentForm);
}

function renderQuestionsList() {
    const qContainer = document.getElementById('builder-questions-list');
    if (!qContainer || !currentForm) return;
    qContainer.innerHTML = '';

    const isQuiz = currentForm.settings ? !!currentForm.settings.isQuiz : false;

    currentForm.questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'cyber-card border-purple-accent mb-3 p-3 p-md-4';

        let optionsHtml = '';
        if (['radio', 'checkbox', 'select'].includes(q.type)) {
            optionsHtml = `
                <div class="mt-3">
                    <label class="form-label small fw-bold text-subtle">รายการตัวเลือก:</label>
                    <div id="options-group-${q.id}" class="d-flex flex-column gap-2 mb-2">
                        ${(q.options || []).map((opt, optIdx) => `
                            <div class="d-flex align-items-center gap-2">
                                <input type="${q.type === 'checkbox' ? 'checkbox' : 'radio'}" class="form-check-input mt-0" disabled>
                                <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary" 
                                    value="${escapeHtml(opt)}" 
                                    onchange="updateOptionText('${q.id}', ${optIdx}, this.value)">
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteOption('${q.id}', ${optIdx})">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-sm btn-outline-purple text-purple border-purple" onclick="addOption('${q.id}')">
                        <i class="bi bi-plus-circle me-1"></i>เพิ่มตัวเลือก
                    </button>
                </div>
            `;
        } else if (q.type === 'rating') {
            optionsHtml = `
                <div class="mt-3 p-3 bg-dark bg-opacity-50 border border-warning border-opacity-50 rounded-3">
                    <label class="form-label small fw-bold text-warning mb-1"><i class="bi bi-star-fill me-1"></i>ตัวอย่างการแสดงผลแบบประเมินดาว (1-5 ดาว):</label>
                    <div class="d-flex align-items-center gap-2 text-warning fs-3 my-1">
                        <i class="bi bi-star-fill"></i>
                        <i class="bi bi-star-fill"></i>
                        <i class="bi bi-star-fill"></i>
                        <i class="bi bi-star-fill"></i>
                        <i class="bi bi-star-fill"></i>
                        <span class="fs-6 text-subtle ms-2">(ผู้ตอบจะเห็นดาว 5 ดวงสำหรับคลิกเลือก 1-5 คะแนน)</span>
                    </div>
                </div>
            `;
        }

        let quizHtml = '';
        if (isQuiz) {
            let keyControl = '';
            if (['radio', 'select'].includes(q.type)) {
                keyControl = `
                    <select class="form-select form-select-sm bg-dark text-white border-warning" onchange="updateAnswerKey('${q.id}', this.value)">
                        <option value="">-- เลือกคำตอบที่ถูกต้อง --</option>
                        ${(q.options || []).map(opt => `
                            <option value="${escapeHtml(opt)}" ${q.answerKey === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>
                        `).join('')}
                    </select>
                `;
            } else if (q.type === 'rating') {
                keyControl = `
                    <select class="form-select form-select-sm bg-dark text-white border-warning" onchange="updateAnswerKey('${q.id}', this.value)">
                        <option value="">-- เลือกดาวที่ถูกต้อง (1-5) --</option>
                        <option value="5" ${q.answerKey === '5' ? 'selected' : ''}>5 ดาว ⭐⭐⭐⭐⭐</option>
                        <option value="4" ${q.answerKey === '4' ? 'selected' : ''}>4 ดาว ⭐⭐⭐⭐</option>
                        <option value="3" ${q.answerKey === '3' ? 'selected' : ''}>3 ดาว ⭐⭐⭐</option>
                        <option value="2" ${q.answerKey === '2' ? 'selected' : ''}>2 ดาว ⭐⭐</option>
                        <option value="1" ${q.answerKey === '1' ? 'selected' : ''}>1 ดาว ⭐</option>
                    </select>
                `;
            } else if (q.type === 'checkbox') {
                keyControl = `
                    <div class="d-flex flex-wrap gap-2">
                        ${(q.options || []).map(opt => {
                    const isChecked = Array.isArray(q.answerKey) && q.answerKey.includes(opt);
                    return `
                                <label class="form-check-label text-white small border rounded px-2 py-1 ${isChecked ? 'bg-warning text-dark fw-bold border-warning' : 'border-secondary'}">
                                    <input type="checkbox" class="form-check-input me-1 d-none" ${isChecked ? 'checked' : ''} 
                                        onchange="toggleCheckboxAnswerKey('${q.id}', '${escapeHtml(opt)}')">
                                    ${escapeHtml(opt)}
                                </label>
                            `;
                }).join('')}
                    </div>
                `;
            } else {
                keyControl = `
                    <input type="text" class="form-control form-control-sm bg-dark text-white border-warning" 
                        placeholder="พิมพ์คำตอบที่ถูกต้อง" 
                        value="${escapeHtml(q.answerKey || '')}" 
                        onchange="updateAnswerKey('${q.id}', this.value)">
                `;
            }

            quizHtml = `
                <div class="p-3 mt-3 bg-dark bg-opacity-50 border border-warning rounded-3">
                    <div class="row g-2 align-items-center">
                        <div class="col-12 col-md-4">
                            <label class="form-label small fw-bold text-warning mb-1"><i class="bi bi-star-fill me-1"></i>คะแนนประจำข้อ:</label>
                            <input type="number" class="form-control form-control-sm bg-dark text-white border-warning" 
                                min="0" value="${q.points || 0}" onchange="updateQuestionPoints('${q.id}', this.value)">
                        </div>
                        <div class="col-12 col-md-8">
                            <label class="form-label small fw-bold text-warning mb-1"><i class="bi bi-key-fill me-1"></i>เฉลยคำตอบถูกต้อง:</label>
                            ${keyControl}
                        </div>
                    </div>
                </div>
            `;
        }

        const typeBadgeTextMap = {
            radio: '<i class="bi bi-ui-radios me-1"></i>ข้อที่ ' + (idx + 1) + ' (หลายตัวเลือก)',
            checkbox: '<i class="bi bi-ui-checks me-1"></i>ข้อที่ ' + (idx + 1) + ' (หลายคำตอบ)',
            select: '<i class="bi bi-menu-button-wide-fill me-1"></i>ข้อที่ ' + (idx + 1) + ' (เลือกลิสต์)',
            rating: '<i class="bi bi-star-fill text-warning me-1"></i>ข้อที่ ' + (idx + 1) + ' (ให้คะแนนดาว)',
            text: '<i class="bi bi-input-cursor-text me-1"></i>ข้อที่ ' + (idx + 1) + ' (ข้อความสั้น)',
            textarea: '<i class="bi bi-blockquote-left me-1"></i>ข้อที่ ' + (idx + 1) + ' (ข้อความยาว)'
        };

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-purple-subtle text-purple border border-purple">${typeBadgeTextMap[q.type] || ('ข้อที่ ' + (idx + 1))}</span>
                <div class="d-flex align-items-center gap-2">
                    <div class="form-check form-switch mb-0 me-2">
                        <input class="form-check-input" type="checkbox" id="req-${q.id}" ${q.required ? 'checked' : ''} onchange="toggleQuestionRequired('${q.id}')">
                        <label class="form-check-label small text-subtle" for="req-${q.id}">จำเป็น</label>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteQuestion('${q.id}')" title="ลบคำถาม">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            </div>
            
            <div class="row g-2 mb-2">
                <div class="col-12 col-md-7">
                    <input type="text" class="form-control bg-dark text-white border-purple" 
                        placeholder="ชื่อคำถาม..." value="${escapeHtml(q.title)}" 
                        onchange="updateQuestionTitle('${q.id}', this.value)">
                </div>
                <div class="col-12 col-md-5">
                    <select class="form-select bg-dark text-white border-purple font-kanit" onchange="updateQuestionType('${q.id}', this.value)">
                        <option value="radio" ${q.type === 'radio' ? 'selected' : ''}>🔘 หลายตัวเลือก (Radio)</option>
                        <option value="checkbox" ${q.type === 'checkbox' ? 'selected' : ''}>☑️ หลายคำตอบ (Checkbox)</option>
                        <option value="select" ${q.type === 'select' ? 'selected' : ''}>🔽 เลือกลิสต์ (Dropdown)</option>
                        <option value="rating" ${q.type === 'rating' ? 'selected' : ''}>⭐ ให้คะแนนดาว (Star Rating)</option>
                        <option value="text" ${q.type === 'text' ? 'selected' : ''}>📝 ข้อความสั้น (Short Text)</option>
                        <option value="textarea" ${q.type === 'textarea' ? 'selected' : ''}>📄 ข้อความยาว (Long Text)</option>
                    </select>
                </div>
            </div>
            
            ${optionsHtml}
            ${quizHtml}
        `;
        qContainer.appendChild(card);
    });
}

function addQuestion() {
    if (!currentForm) return;
    const isQuiz = currentForm.settings ? !!currentForm.settings.isQuiz : false;
    currentForm.questions.push({
        id: generateId(),
        title: `คำถามข้อที่ ${currentForm.questions.length + 1}`,
        type: 'radio',
        required: true,
        points: isQuiz ? 10 : 0,
        answerKey: '',
        options: ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2']
    });
    saveLocalForms(formsList);
    syncFormToSupabase(currentForm);
    renderQuestionsList();
}

function deleteQuestion(qId) {
    if (!currentForm) return;
    currentForm.questions = currentForm.questions.filter(q => q.id !== qId);
    saveLocalForms(formsList);
    syncFormToSupabase(currentForm);
    renderQuestionsList();
}

function updateQuestionTitle(qId, val) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        q.title = val;
        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
    }
}

function updateQuestionType(qId, typeVal) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        q.type = typeVal;
        if (['radio', 'checkbox', 'select'].includes(typeVal) && (!q.options || q.options.length === 0)) {
            q.options = ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2'];
        }
        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
        renderQuestionsList();
    }
}

function toggleQuestionRequired(qId) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        q.required = !q.required;
        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
    }
}

function addOption(qId) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        if (!q.options) q.options = [];
        q.options.push(`ตัวเลือกที่ ${q.options.length + 1}`);
        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
        renderQuestionsList();
    }
}

function updateOptionText(qId, optIdx, val) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q && q.options && q.options[optIdx] !== undefined) {
        q.options[optIdx] = val;
        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
    }
}

function deleteOption(qId, optIdx) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q && q.options) {
        q.options.splice(optIdx, 1);
        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
        renderQuestionsList();
    }
}

function updateQuestionPoints(qId, pts) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        q.points = parseInt(pts) || 0;
        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
    }
}

function updateAnswerKey(qId, keyVal) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        q.answerKey = keyVal;
        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
    }
}

function toggleCheckboxAnswerKey(qId, optVal) {
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
        if (!Array.isArray(q.answerKey)) q.answerKey = [];
        const idx = q.answerKey.indexOf(optVal);
        if (idx >= 0) q.answerKey.splice(idx, 1);
        else q.answerKey.push(optVal);

        saveLocalForms(formsList);
        syncFormToSupabase(currentForm);
        renderQuestionsList();
    }
}

// ====================================================
// 3. Responder View (หน้าผู้เรียนตอบแบบสอบถาม)
// ====================================================

function renderResponderView() {
    hideAllViewContainers();
    const container = document.getElementById('view-respond-container');
    if (container) container.classList.remove('d-none');

    if (!currentForm) {
        if (container) {
            container.innerHTML = `
                <div class="cyber-card text-center py-5">
                    <i class="bi bi-exclamation-circle text-warning fs-1"></i>
                    <h4 class="text-white fw-bold mt-2">ไม่พบแบบสอบถามที่ระบุ</h4>
                    <a href="forms.html" class="btn btn-purple-glow mt-3">กลับสู่รายการแบบฟอร์ม</a>
                </div>
            `;
        }
        return;
    }

    const titleEl = document.getElementById('respond-title');
    const descEl = document.getElementById('respond-desc');
    if (titleEl) titleEl.innerText = currentForm.title || 'แบบสอบถาม';
    if (descEl) descEl.innerText = currentForm.description || '';

    const qList = document.getElementById('respond-questions-list');
    if (!qList) return;
    qList.innerHTML = '';

    currentForm.questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'cyber-card border-purple-accent mb-3 p-3 p-md-4';

        let inputHtml = '';
        if (q.type === 'radio') {
            inputHtml = (q.options || []).map((opt, oIdx) => `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="ans-${q.id}" id="ans-${q.id}-${oIdx}" value="${escapeHtml(opt)}">
                    <label class="form-check-label text-white" for="ans-${q.id}-${oIdx}">${escapeHtml(opt)}</label>
                </div>
            `).join('');
        } else if (q.type === 'checkbox') {
            inputHtml = (q.options || []).map((opt, oIdx) => `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="ans-${q.id}" id="ans-${q.id}-${oIdx}" value="${escapeHtml(opt)}">
                    <label class="form-check-label text-white" for="ans-${q.id}-${oIdx}">${escapeHtml(opt)}</label>
                </div>
            `).join('');
        } else if (q.type === 'select') {
            inputHtml = `
                <select class="form-select bg-dark text-white border-purple" name="ans-${q.id}">
                    <option value="">-- เลือกคำตอบ --</option>
                    ${(q.options || []).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
                </select>
            `;
        } else if (q.type === 'rating') {
            inputHtml = `
                <div class="star-rating-box py-2" id="star-box-${q.id}">
                    <input type="hidden" name="ans-${q.id}" id="ans-${q.id}" value="">
                    <div class="d-flex align-items-center gap-2 fs-2 text-warning">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <i class="bi bi-star star-btn-${q.id}" style="cursor: pointer;" 
                               data-star="${star}" 
                               onclick="setFormStarRating('${q.id}', ${star})"
                               onmouseover="hoverFormStarRating('${q.id}', ${star})"
                               onmouseout="resetFormStarRating('${q.id}')"
                               title="${star} ดาว"></i>
                        `).join('')}
                        <span id="star-label-${q.id}" class="text-warning fw-bold ms-2 fs-6"></span>
                    </div>
                </div>
            `;
        } else if (q.type === 'textarea') {
            inputHtml = `<textarea class="form-control bg-dark text-white border-purple" name="ans-${q.id}" rows="3" placeholder="พิมพ์คำตอบของคุณ..."></textarea>`;
        } else {
            inputHtml = `<input type="text" class="form-control bg-dark text-white border-purple" name="ans-${q.id}" placeholder="พิมพ์คำตอบของคุณ...">`;
        }

        card.innerHTML = `
            <div class="mb-3">
                <h5 class="fw-bold text-white mb-1">
                    ${idx + 1}. ${escapeHtml(q.title)} 
                    ${q.required ? '<span class="text-danger">*</span>' : ''}
                </h5>
            </div>
            ${inputHtml}
        `;
        qList.appendChild(card);
    });
}

function setFormStarRating(qId, rating) {
    const input = document.getElementById(`ans-${qId}`);
    if (input) input.value = rating;

    const stars = document.querySelectorAll(`.star-btn-${qId}`);
    stars.forEach((star, idx) => {
        if (idx < rating) {
            star.className = 'bi bi-star-fill text-warning star-btn-' + qId;
        } else {
            star.className = 'bi bi-star text-warning star-btn-' + qId;
        }
    });

    const label = document.getElementById(`star-label-${qId}`);
    if (label) {
        const labels = ['', '1 ดาว (ต้องปรับปรุง)', '2 ดาว (พอใช้)', '3 ดาว (ปานกลาง)', '4 ดาว (ดี)', '5 ดาว (ดีมาก)'];
        label.textContent = labels[rating] || `${rating} / 5 ดาว`;
    }
}

function hoverFormStarRating(qId, rating) {
    const input = document.getElementById(`ans-${qId}`);
    const currentVal = input ? Number(input.value) : 0;
    if (currentVal > 0) return;

    const stars = document.querySelectorAll(`.star-btn-${qId}`);
    stars.forEach((star, idx) => {
        if (idx < rating) {
            star.className = 'bi bi-star-fill text-warning star-btn-' + qId;
        } else {
            star.className = 'bi bi-star text-warning star-btn-' + qId;
        }
    });
}

function resetFormStarRating(qId) {
    const input = document.getElementById(`ans-${qId}`);
    const currentVal = input ? Number(input.value) : 0;
    setFormStarRating(qId, currentVal);
}

function submitResponse() {
    if (!currentForm) return;

    const nameInput = document.getElementById('responder-name');
    const responderName = nameInput ? nameInput.value.trim() : 'ผู้ตอบแบบสอบถาม';

    let quizScore = 0;
    let totalPoints = 0;
    const isQuiz = currentForm.settings ? !!currentForm.settings.isQuiz : false;
    const userAnswers = {};

    for (const q of currentForm.questions) {
        let userVal = null;
        if (q.type === 'radio') {
            const checked = document.querySelector(`input[name="ans-${q.id}"]:checked`);
            userVal = checked ? checked.value : '';
        } else if (q.type === 'checkbox') {
            const checkedBoxes = document.querySelectorAll(`input[name="ans-${q.id}"]:checked`);
            userVal = Array.from(checkedBoxes).map(cb => cb.value);
        } else if (q.type === 'select' || q.type === 'rating' || q.type === 'text' || q.type === 'textarea') {
            const input = document.querySelector(`[name="ans-${q.id}"]`);
            userVal = input ? input.value.trim() : '';
        }

        if (q.required && (!userVal || (Array.isArray(userVal) && userVal.length === 0))) {
            const swal = getCyberSwal();
            if (swal) {
                swal.fire({
                    icon: 'warning',
                    title: 'กรุณาตอบคำถามให้ครบ',
                    text: `คำถามข้อ "${q.title}" เป็นข้อบังคับ`,
                    confirmButtonText: 'เข้าใจแล้ว'
                });
            } else {
                alert(`กรุณาตอบคำถามข้อ "${q.title}" ให้ครบถ้วน`);
            }
            return;
        }

        userAnswers[q.id] = userVal;

        if (isQuiz) {
            const pts = q.points || 0;
            totalPoints += pts;

            if (q.type === 'checkbox') {
                const targetKey = Array.isArray(q.answerKey) ? q.answerKey : [];
                if (Array.isArray(userVal) && userVal.length === targetKey.length && userVal.every(v => targetKey.includes(v))) {
                    quizScore += pts;
                }
            } else {
                if (q.answerKey && userVal === q.answerKey) {
                    quizScore += pts;
                }
            }
        }
    }

    const passingPct = (currentForm.settings && currentForm.settings.passingScore) || 70;
    const userPct = totalPoints > 0 ? (quizScore / totalPoints) * 100 : 100;
    const isPassed = isQuiz ? (userPct >= passingPct) : true;

    const responseObj = {
        id: generateId(),
        responderName: responderName || 'ผู้ตอบแบบสอบถาม',
        answers: userAnswers,
        quizScore: quizScore,
        totalPoints: totalPoints,
        isPassed: isPassed,
        submittedAt: new Date().toISOString()
    };

    saveLocalResponse(currentForm.id, responseObj);
    syncResponseToSupabase(responseObj);

    showResponseSuccessModal(responseObj);
}

function showResponseSuccessModal(respObj) {
    const isQuiz = currentForm.settings ? !!currentForm.settings.isQuiz : false;
    const modalContent = document.getElementById('response-result-content');
    if (!modalContent) return;

    if (isQuiz) {
        modalContent.innerHTML = `
            <div class="text-center py-3">
                <div class="fs-1 mb-2">${respObj.isPassed ? '🎉' : '✍️'}</div>
                <h4 class="fw-bold ${respObj.isPassed ? 'text-success' : 'text-warning'} mb-2">
                    ${respObj.isPassed ? 'ยินดีด้วย! คุณผ่านการทดสอบ' : 'ขอบคุณที่ร่วมทำแบบทดสอบ'}
                </h4>
                <div class="cyber-card bg-dark border-purple p-3 my-3">
                    <div class="fs-3 fw-bold text-warning mb-1">${respObj.quizScore} / ${respObj.totalPoints} คะแนน</div>
                    <div class="small text-subtle">คิดเป็น ${((respObj.quizScore / respObj.totalPoints) * 100).toFixed(1)}% (เกณฑ์ผ่าน ${(currentForm.settings?.passingScore || 70)}%)</div>
                </div>
                ${respObj.isPassed ? `
                    <button class="btn btn-warning fw-bold px-4 py-2 mt-2 shadow-sm rounded-pill" onclick="showCertificateModalFromResponse()">
                        <i class="bi bi-award-fill me-1"></i>รับเกียรติบัตร (Certificate)
                    </button>
                ` : ''}
            </div>
        `;
    } else {
        modalContent.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-check-circle-fill text-success fs-1 mb-2"></i>
                <h4 class="fw-bold text-white mb-2">บันทึกคำตอบเรียบร้อยแล้ว</h4>
                <p class="text-subtle small m-0">ขอบคุณสำหรับข้อมูลและการตอบแบบสอบถามครับ</p>
            </div>
        `;
    }

    const modalEl = document.getElementById('responseSuccessModal');
    if (modalEl && window.bootstrap) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }
}

async function syncResponseToSupabase(respObj) {
    // Notify same-device browser tabs via BroadcastChannel
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('gyver_forms_channel');
            bc.postMessage({ type: 'NEW_RESPONSE', formId: currentForm.id, response: respObj });
            bc.close();
        }
    } catch (e) {}

    if (!window.supabaseClient || !isSupabaseTableAvailable) return;
    try {
        const { error } = await window.supabaseClient.from('gyver_form_responses').insert({
            id: respObj.id,
            form_id: currentForm.id,
            responder_name: respObj.responderName,
            answers: respObj.answers,
            quiz_score: respObj.quizScore,
            total_points: respObj.totalPoints,
            is_passed: respObj.isPassed,
            created_at: respObj.submittedAt
        });
        if (error) {
            console.warn('Could not insert form response into Supabase:', error);
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.error('⚠️ Table public.gyver_form_responses does not exist in Supabase yet. Run supabase_schema.sql to create it.');
            }
        }
    } catch (e) {
        console.warn('Response sync skipped:', e);
    }
}

// ====================================================
// 4. Analytics View (หน้าสรุปผล, รายชื่อผู้ตอบ & Item Analysis)
// ====================================================

function renderAnalyticsView() {
    hideAllViewContainers();
    const container = document.getElementById('view-responses-container');
    if (container) container.classList.remove('d-none');

    if (!currentForm) return;

    const isQuiz = !!currentForm.settings?.isQuiz;

    const titleEl = document.getElementById('analytics-form-title');
    if (titleEl) titleEl.innerText = currentForm.title || 'สรุปผล';

    // Subtitle text
    const subtitleEl = document.querySelector('#view-responses-container p.text-subtle');
    if (subtitleEl) {
        subtitleEl.innerText = isQuiz
            ? 'ข้อมูลผู้ส่งคำตอบ สถิติคะแนน และการวิเคราะห์คุณภาพข้อสอบ (Item Analysis)'
            : 'ข้อมูลผู้ส่งคำตอบ สถิติความพึงพอใจ และข้อเสนอแนะ';
    }

    // Table header labels
    const thScore = document.getElementById('th-score-header');
    if (thScore) thScore.innerText = isQuiz ? 'ผลคะแนน' : 'ประเภท';

    const respCountEl = document.getElementById('analytics-total-responses');
    if (respCountEl) respCountEl.innerText = responsesList.length;

    renderResponsesList();

    // Toggle Survey Summary vs Quiz Item Analysis
    const surveyContainer = document.getElementById('survey-summary-container');
    const quizContainer = document.getElementById('item-analysis-container');

    if (isQuiz) {
        if (surveyContainer) surveyContainer.classList.add('d-none');
        if (quizContainer) quizContainer.classList.remove('d-none');
        renderItemAnalysis();
    } else {
        if (quizContainer) quizContainer.classList.add('d-none');
        if (surveyContainer) surveyContainer.classList.remove('d-none');
        renderSurveySummary();
    }
}

/**
 * 👥 แสดงรายชื่อผู้ส่งคำตอบแบบสอบถาม (Individual Submissions List)
 */
function renderResponsesList() {
    const tbody = document.getElementById('responses-list-tbody');
    if (!tbody || !currentForm) return;
    tbody.innerHTML = '';

    if (responsesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-subtle py-4">ยังไม่มีผู้ส่งคำตอบในแบบฟอร์มนี้</td></tr>`;
        return;
    }

    const isQuiz = !!currentForm.settings?.isQuiz;

    responsesList.forEach((resp, idx) => {
        const tr = document.createElement('tr');
        const dateStr = resp.submittedAt ? new Date(resp.submittedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-';
        
        let scoreHtml = '<span class="badge bg-purple-subtle text-purple border border-purple">แบบสอบถาม</span>';
        let statusHtml = '<span class="badge bg-success"><i class="bi bi-check2 me-1"></i>ส่งแล้ว</span>';

        if (isQuiz) {
            scoreHtml = `<span class="fw-bold text-warning">${resp.quizScore || 0}</span> / ${resp.totalPoints || 0}`;
            statusHtml = resp.isPassed 
                ? '<span class="badge bg-success">ผ่าน</span>' 
                : '<span class="badge bg-danger">ไม่ผ่าน</span>';
        }

        tr.innerHTML = `
            <td class="text-subtle font-mono">${idx + 1}</td>
            <td class="fw-bold text-white">${escapeHtml(resp.responderName || 'ผู้ตอบแบบสอบถาม')}</td>
            <td>${scoreHtml}</td>
            <td>${statusHtml}</td>
            <td class="text-subtle small">${dateStr}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-info py-0 px-2 me-1" onclick="viewIndividualResponse('${escapeHtml(resp.id)}')" title="ดูคำตอบ">
                    <i class="bi bi-eye-fill me-1"></i>ดูคำตอบ
                </button>
                <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteSingleResponse('${escapeHtml(resp.id)}')" title="ลบคำตอบนี้">
                    <i class="bi bi-trash3"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * 📊 สรุปผลสำหรับแบบสอบถาม/แบบประเมินความพึงพอใจรายข้อ
 */
function renderSurveySummary() {
    const container = document.getElementById('survey-summary-content');
    if (!container || !currentForm) return;
    container.innerHTML = '';

    if (responsesList.length === 0) {
        container.innerHTML = `<div class="text-center text-subtle py-4">ยังไม่มีคำตอบเพื่อทำการสรุปผลแบบประเมิน</div>`;
        return;
    }

    (currentForm.questions || []).forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'cyber-card bg-dark border-purple p-3 mb-3';

        let cardHeader = `
            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <div class="fw-bold text-white font-kanit fs-6">
                    <span class="text-purple me-1">ข้อที่ ${idx + 1}:</span> ${escapeHtml(q.title)}
                </div>
                <span class="badge bg-secondary small">${getQuestionTypeLabel(q.type)}</span>
            </div>
        `;

        let cardBody = '';

        if (q.type === 'rating') {
            // ⭐ คำนวณค่าเฉลี่ย Rating 1-5 ดาว
            const ratings = responsesList
                .map(r => Number(r.answers?.[q.id]))
                .filter(v => !isNaN(v) && v > 0);

            if (ratings.length > 0) {
                const sum = ratings.reduce((a, b) => a + b, 0);
                const mean = sum / ratings.length;
                const maxRating = 5;
                const pct = Math.min(100, Math.round((mean / maxRating) * 100));

                let ratingLevel = '';
                let badgeClass = 'bg-success';
                if (mean >= 4.51) { ratingLevel = 'มากที่สุด'; badgeClass = 'bg-success'; }
                else if (mean >= 3.51) { ratingLevel = 'มาก'; badgeClass = 'bg-info text-dark'; }
                else if (mean >= 2.51) { ratingLevel = 'ปานกลาง'; badgeClass = 'bg-warning text-dark'; }
                else if (mean >= 1.51) { ratingLevel = 'น้อย'; badgeClass = 'bg-danger'; }
                else { ratingLevel = 'น้อยที่สุด'; badgeClass = 'bg-dark border border-danger text-danger'; }

                cardBody = `
                    <div class="row align-items-center g-3 mt-1">
                        <div class="col-12 col-md-4 text-center text-md-start">
                            <div class="fs-2 fw-bold text-warning font-mono">${mean.toFixed(2)} <span class="fs-6 text-subtle">/ ${maxRating}</span></div>
                            <div class="small mt-1"><span class="badge ${badgeClass} px-2 py-1">${ratingLevel}</span> <span class="text-subtle">(${ratings.length} คนประเมิน)</span></div>
                        </div>
                        <div class="col-12 col-md-8">
                            <div class="progress bg-black border border-secondary" style="height: 18px; border-radius: 9px;">
                                <div class="progress-bar bg-warning progress-bar-striped" role="progressbar" style="width: ${pct}%;">
                                    ${pct}%
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                cardBody = `<div class="text-subtle small fst-italic">ยังไม่มีผู้ให้คะแนนข้อนี้</div>`;
            }

        } else if (q.type === 'radio' || q.type === 'select') {
            // 🔘 สรุปสัดส่วนตัวเลือก Radio / Select
            const counts = {};
            (q.options || []).forEach(opt => { counts[opt] = 0; });
            let answeredCount = 0;

            responsesList.forEach(r => {
                const val = r.answers?.[q.id];
                if (val !== undefined && val !== null && val !== '') {
                    counts[val] = (counts[val] || 0) + 1;
                    answeredCount++;
                }
            });

            const optionsHtml = (q.options || []).map(opt => {
                const count = counts[opt] || 0;
                const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                return `
                    <div class="mb-2">
                        <div class="d-flex justify-content-between small text-white mb-1">
                            <span>${escapeHtml(opt)}</span>
                            <span class="text-subtle font-mono">${count} คน (${pct}%)</span>
                        </div>
                        <div class="progress bg-black border border-secondary border-opacity-50" style="height: 10px;">
                            <div class="progress-bar bg-purple" role="progressbar" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');

            cardBody = `<div class="mt-2">${optionsHtml || '<div class="text-subtle small">ไม่มีตัวเลือก</div>'}</div>`;

        } else if (q.type === 'checkbox') {
            // ☑️ สรุปสัดส่วนตัวเลือก Checkbox
            const counts = {};
            (q.options || []).forEach(opt => { counts[opt] = 0; });
            let answeredCount = 0;

            responsesList.forEach(r => {
                const val = r.answers?.[q.id];
                if (Array.isArray(val) && val.length > 0) {
                    val.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
                    answeredCount++;
                }
            });

            const optionsHtml = (q.options || []).map(opt => {
                const count = counts[opt] || 0;
                const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                return `
                    <div class="mb-2">
                        <div class="d-flex justify-content-between small text-white mb-1">
                            <span>${escapeHtml(opt)}</span>
                            <span class="text-subtle font-mono">${count} คน (${pct}%)</span>
                        </div>
                        <div class="progress bg-black border border-secondary border-opacity-50" style="height: 10px;">
                            <div class="progress-bar bg-info" role="progressbar" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');

            cardBody = `<div class="mt-2">${optionsHtml || '<div class="text-subtle small">ไม่มีตัวเลือก</div>'}</div>`;

        } else {
            // 📝 ข้อความสั้น / ข้อเสนอแนะ (Text / Textarea)
            const textResponses = responsesList
                .map(r => ({ name: r.responderName || 'ผู้ตอบ', text: r.answers?.[q.id] }))
                .filter(item => item.text && String(item.text).trim().length > 0);

            if (textResponses.length > 0) {
                const listHtml = textResponses.map(item => `
                    <div class="bg-black bg-opacity-50 border border-secondary border-opacity-50 rounded p-2 mb-2 small">
                        <div class="text-white"><i class="bi bi-chat-quote-fill text-purple me-1"></i>${escapeHtml(String(item.text))}</div>
                        <div class="text-subtle mt-1" style="font-size: 0.75rem;">— ${escapeHtml(item.name)}</div>
                    </div>
                `).join('');
                cardBody = `<div class="mt-2" style="max-height: 220px; overflow-y: auto;">${listHtml}</div>`;
            } else {
                cardBody = `<div class="text-subtle small fst-italic mt-2">ยังไม่มีข้อความตอบกลับในข้อนี้</div>`;
            }
        }

        card.innerHTML = cardHeader + cardBody;
        container.appendChild(card);
    });
}

function getQuestionTypeLabel(type) {
    switch(type) {
        case 'rating': return 'ระดับความพึงพอใจ';
        case 'radio': return 'เลือกตอบข้อเดียว';
        case 'checkbox': return 'เลือกตอบหลายข้อ';
        case 'select': return 'เมนูเลื่อน';
        case 'textarea': return 'ข้อเสนอแนะยาว';
        case 'text': return 'ข้อความสั้น';
        default: return 'คำถาม';
    }
}


/**
 * 🔍 เปิดดูคำตอบที่นักเรียนคนนั้นตอบมาทีละข้อ
 */
function viewIndividualResponse(respId) {
    const resp = responsesList.find(r => r.id === respId);
    if (!resp || !currentForm) return;

    const nameEl = document.getElementById('modal-resp-name');
    if (nameEl) nameEl.textContent = resp.responderName || 'ผู้ตอบแบบสอบถาม';

    const bodyEl = document.getElementById('modal-resp-answers-body');
    if (!bodyEl) return;

    let html = '';
    const isQuiz = currentForm.settings?.isQuiz;

    (currentForm.questions || []).forEach((q, idx) => {
        const userAns = resp.answers ? resp.answers[q.id] : null;
        let ansDisplay = '';

        if (userAns === null || userAns === undefined || userAns === '') {
            ansDisplay = '<span class="text-subtle fst-italic">ไม่ได้ตอบ</span>';
        } else if (Array.isArray(userAns)) {
            ansDisplay = userAns.map(v => `<span class="badge bg-dark border border-purple text-white me-1">${escapeHtml(v)}</span>`).join('');
        } else {
            ansDisplay = `<span class="text-white">${escapeHtml(String(userAns))}</span>`;
        }

        let correctnessBadge = '';
        if (isQuiz) {
            let isCorrect = false;
            if (q.type === 'checkbox') {
                const targetKey = Array.isArray(q.answerKey) ? q.answerKey : [];
                if (Array.isArray(userAns) && userAns.length === targetKey.length && userAns.every(v => targetKey.includes(v))) {
                    isCorrect = true;
                }
            } else {
                if (q.answerKey && userAns === q.answerKey) isCorrect = true;
            }
            correctnessBadge = isCorrect 
                ? `<span class="badge bg-success ms-2"><i class="bi bi-check-lg me-1"></i>ถูกต้อง (+${q.points || 0} คะแนน)</span>`
                : `<span class="badge bg-danger ms-2"><i class="bi bi-x-lg me-1"></i>ผิด (0 คะแนน)</span>`;
        }

        html += `
            <div class="cyber-card bg-dark border-purple p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="fw-bold text-white">ข้อที่ ${idx + 1}: ${escapeHtml(q.title)}</div>
                    ${correctnessBadge}
                </div>
                <div class="bg-black bg-opacity-50 p-2 rounded border border-secondary border-opacity-50">
                    <span class="text-subtle small me-2">คำตอบ:</span> ${ansDisplay}
                </div>
                ${isQuiz && q.answerKey ? `<div class="small text-success mt-1"><i class="bi bi-info-circle me-1"></i>เฉลยที่ถูกต้อง: ${escapeHtml(Array.isArray(q.answerKey) ? q.answerKey.join(', ') : q.answerKey)}</div>` : ''}
            </div>
        `;
    });

    bodyEl.innerHTML = html;

    const modalEl = document.getElementById('individualResponseModal');
    if (modalEl && window.bootstrap) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }
}

/**
 * 🧹 ล้างข้อมูลคำตอบทั้งหมดของแบบฟอร์มนี้
 */
async function clearFormResponses() {
    if (!currentForm) return;
    if (responsesList.length === 0) {
        const swal = getCyberSwal();
        if (swal) {
            swal.fire({
                icon: 'info',
                title: 'ไม่มีข้อมูลให้ล้าง',
                text: 'ยังไม่มีประวัติการส่งคำตอบในแบบฟอร์มนี้ครับ'
            });
        }
        return;
    }

    const swal = getCyberSwal();
    if (swal) {
        const result = await swal.fire({
            icon: 'warning',
            title: 'ยืนยันล้างข้อมูลการตอบทั้งหมด?',
            html: `ต้องการล้างคำตอบของผู้ตอบทั้งหมด <b>${responsesList.length} คน</b> ในแบบฟอร์มนี้ใช่หรือไม่?<br><span class="text-danger small">ข้อมูลจะถูกล้างเพื่อเตรียมพร้อมสำหรับรอบใหม่ (ไม่สามารถกู้คืนได้)</span>`,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i>ล้างข้อมูลทันที',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#ef4444'
        });
        if (!result.isConfirmed) return;
    } else {
        if (!confirm(`ต้องการล้างคำตอบทั้งหมด ${responsesList.length} คน ใช่หรือไม่?`)) return;
    }

    // 1. Clear LocalStorage
    localStorage.setItem(`gyver_form_responses_${currentForm.id}`, JSON.stringify([]));
    responsesList = [];

    // 2. Clear Supabase
    if (window.supabaseClient && isSupabaseTableAvailable) {
        try {
            await window.supabaseClient
                .from('gyver_form_responses')
                .delete()
                .eq('form_id', currentForm.id);
        } catch (e) {
            console.warn('Could not delete form responses from Supabase:', e);
        }
    }

    renderAnalyticsView();

    const toast = getCyberToast();
    if (toast) {
        toast.fire({
            icon: 'success',
            title: 'ล้างข้อมูลการตอบเรียบร้อยแล้ว พร้อมสำหรับรอบใหม่!'
        });
    }
}

/**
 * 🗑️ ลบคำตอบเฉพาะรายบุคคล
 */
async function deleteSingleResponse(respId) {
    if (!currentForm) return;
    const targetIdx = responsesList.findIndex(r => r.id === respId);
    if (targetIdx === -1) return;

    const targetResp = responsesList[targetIdx];
    const swal = getCyberSwal();
    if (swal) {
        const result = await swal.fire({
            icon: 'warning',
            title: 'ลบคำตอบนี้?',
            html: `ต้องการลบคำตอบของ <b>${escapeHtml(targetResp.responderName || 'ผู้ตอบแบบสอบถาม')}</b> ใช่หรือไม่?`,
            showCancelButton: true,
            confirmButtonText: 'ลบคำตอบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#ef4444'
        });
        if (!result.isConfirmed) return;
    } else {
        if (!confirm(`ต้องการลบคำตอบของ ${targetResp.responderName} ใช่หรือไม่?`)) return;
    }

    responsesList.splice(targetIdx, 1);
    localStorage.setItem(`gyver_form_responses_${currentForm.id}`, JSON.stringify(responsesList));

    if (window.supabaseClient && isSupabaseTableAvailable && targetResp.id) {
        try {
            await window.supabaseClient
                .from('gyver_form_responses')
                .delete()
                .eq('id', targetResp.id);
        } catch (e) {
            console.warn('Could not delete single response from Supabase:', e);
        }
    }

    renderAnalyticsView();

    const toast = getCyberToast();
    if (toast) {
        toast.fire({
            icon: 'success',
            title: `ลบคำตอบของ ${targetResp.responderName} เรียบร้อยแล้ว`
        });
    }
}

function openShareModalFromAnalytics() {
    if (currentForm) {
        showShareModal(currentForm.id);
    }
}

function showSqlHelpModal() {
    const swal = getCyberSwal();
    if (swal) {
        swal.fire({
            icon: 'info',
            title: 'คำสั่ง SQL สำหรับเปิดตาราง Gyver Forms',
            html: `
                <div class="text-start small">
                    <p class="mb-2">คัดลอกคำสั่งนี้ไปวางและกด Run ใน <b>Supabase Dashboard ➔ SQL Editor</b> เพื่อสร้างตารางบันทึกคำตอบครับ:</p>
                    <pre class="bg-black p-3 rounded border border-purple text-info font-mono text-wrap" style="max-height: 200px; overflow-y: auto; font-size: 0.8rem; user-select: all;">CREATE TABLE IF NOT EXISTS public.gyver_form_responses (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    responder_name TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    quiz_score NUMERIC,
    total_points NUMERIC,
    is_passed BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gyver_form_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to gyver_form_responses" ON public.gyver_form_responses;
CREATE POLICY "Allow all access to gyver_form_responses" ON public.gyver_form_responses
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);</pre>
                </div>
            `,
            confirmButtonText: 'เข้าใจแล้ว',
            width: '650px'
        });
    }
}


function renderItemAnalysis() {
    const tbody = document.getElementById('item-analysis-tbody');
    if (!tbody || !currentForm) return;
    tbody.innerHTML = '';

    if (responsesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-subtle py-4">ยังไม่มีคำตอบเพื่อทำการวิเคราะห์ข้อสอบ</td></tr>`;
        return;
    }

    currentForm.questions.forEach((q, idx) => {
        let correctCount = 0;
        let wrongCount = 0;

        responsesList.forEach(resp => {
            const userVal = resp.answers ? resp.answers[q.id] : null;
            let isCorrect = false;

            if (q.type === 'checkbox') {
                const targetKey = Array.isArray(q.answerKey) ? q.answerKey : [];
                if (Array.isArray(userVal) && userVal.length === targetKey.length && userVal.every(v => targetKey.includes(v))) {
                    isCorrect = true;
                }
            } else {
                if (q.answerKey && userVal === q.answerKey) {
                    isCorrect = true;
                }
            }

            if (isCorrect) correctCount++;
            else wrongCount++;
        });

        const totalResp = responsesList.length;
        const pVal = totalResp > 0 ? (correctCount / totalResp) : 0;
        const pPercent = (pVal * 100).toFixed(0);

        let evalBadge = '';
        if (pVal >= 0.8) evalBadge = '<span class="badge bg-info text-dark">ง่ายมาก</span>';
        else if (pVal >= 0.6) evalBadge = '<span class="badge bg-success">ง่ายพอดี</span>';
        else if (pVal >= 0.4) evalBadge = '<span class="badge bg-warning text-dark">ปานกลาง</span>';
        else if (pVal >= 0.2) evalBadge = '<span class="badge bg-danger">ค่อนข้างยาก</span>';
        else evalBadge = '<span class="badge bg-dark border border-danger text-danger">ยากมาก</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-warning">${idx + 1}</td>
            <td class="text-white fw-bold">${escapeHtml(q.title)}</td>
            <td class="text-center text-success fw-bold">${correctCount}</td>
            <td class="text-center text-danger fw-bold">${wrongCount}</td>
            <td class="text-center text-warning fw-bold">${pVal.toFixed(2)} (${pPercent}%)</td>
            <td class="text-center text-subtle font-mono">${(pVal * 0.85).toFixed(2)}</td>
            <td class="text-center">${evalBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportResponsesCSV() {
    if (!currentForm || responsesList.length === 0) {
        const swal = getCyberSwal();
        if (swal) {
            swal.fire({
                icon: 'info',
                title: 'ยังไม่มีข้อมูล',
                text: 'ไม่มีข้อมูลคำตอบสำหรับส่งออก CSV',
                confirmButtonText: 'เข้าใจแล้ว'
            });
        } else {
            alert('ไม่มีข้อมูลคำตอบให้ส่งออก CSV');
        }
        return;
    }

    let csvContent = '\uFEFF';
    const headers = ['ลำดับ', 'ผู้ตอบ', 'คะแนน', 'เปอร์เซ็นต์', 'สถานะ', 'วันที่ตอบ'];
    currentForm.questions.forEach(q => headers.push(`"${q.title.replace(/"/g, '""')}"`));
    csvContent += headers.join(',') + '\n';

    responsesList.forEach((resp, idx) => {
        const row = [
            idx + 1,
            `"${(resp.responderName || '').replace(/"/g, '""')}"`,
            `"${resp.quizScore || 0}/${resp.totalPoints || 0}"`,
            `"${resp.totalPoints > 0 ? ((resp.quizScore / resp.totalPoints) * 100).toFixed(1) : 100}%"`,
            `"${resp.isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}"`,
            `"${new Date(resp.submittedAt).toLocaleString('th-TH')}"`
        ];

        currentForm.questions.forEach(q => {
            const val = resp.answers ? resp.answers[q.id] : '';
            const valStr = Array.isArray(val) ? val.join('; ') : (val || '');
            row.push(`"${valStr.replace(/"/g, '""')}"`);
        });

        csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Responses_${currentForm.title || 'GyverForm'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ====================================================
// 📜 Auto Certificate Canvas Generator
// ====================================================

let currentCertData = null;

function showCertificateModalFromResponse() {
    if (!currentForm) return;
    const nameInput = document.getElementById('responder-name');
    const name = nameInput ? nameInput.value.trim() : 'ผู้สอบ';
    const lastResp = responsesList[0];
    const scoreStr = lastResp ? `${lastResp.quizScore || 0} / ${lastResp.totalPoints || 0}` : 'ผ่านการทดสอบ';

    currentCertData = {
        name: name || 'ผู้รับเกียรติบัตร',
        scoreStr: scoreStr,
        certTitle: (currentForm.settings && currentForm.settings.certTitle) || currentForm.title || 'แบบทดสอบออนไลน์',
        dateStr: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    };

    renderCertificateCanvas(currentCertData);

    const modalEl = document.getElementById('certificateModal');
    if (modalEl && window.bootstrap) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }
}

function renderCertificateCanvas(data) {
    const canvas = document.getElementById('certificateCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Double Gold Border
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#eab308';
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8b5cf6';
    ctx.strokeRect(34, 34, w - 68, h - 68);

    // Corners
    ctx.fillStyle = '#eab308';
    ctx.fillRect(20, 20, 40, 40);
    ctx.fillRect(w - 60, 20, 40, 40);
    ctx.fillRect(20, h - 60, 40, 40);
    ctx.fillRect(w - 60, h - 60, 40, 40);

    // Title
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'center';
    ctx.fillText('GYVER WORKSPACE - CERTIFICATE OF ACHIEVEMENT', w / 2, 100);

    // Certificate Subtitle
    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText(data.certTitle || 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า', w / 2, 180);

    // Recipient Name
    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(data.name, w / 2, 275);

    // Underline
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 250, 295);
    ctx.lineTo(w / 2 + 250, 295);
    ctx.stroke();

    // Context / Course Text
    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`ได้ผ่านการทดสอบและประเมินผลสัมฤทธิ์ทางการเรียนเรียบร้อยแล้ว`, w / 2, 380);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`ผลคะแนนที่ได้: ${data.scoreStr}  |  วันที่อนุมัติ: ${data.dateStr}`, w / 2, 490);

    // Signatures
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('ลงชื่อ ...........................................................', w / 2, 590);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#a855f7';
    ctx.fillText('Gyver Assessment Engine & Academic Board', w / 2, 625);
}

function downloadCertificateImage() {
    const canvas = document.getElementById('certificateCanvas');
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = image;
    a.download = `Certificate_${currentCertData ? currentCertData.name : 'Gyver'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ====================================================
// 📱 QR Code Modal & Share Helpers
// ====================================================

function showQrCodeModal(formId) {
    const targetForm = formId ? formsList.find(f => f.id === formId) : currentForm;
    if (!targetForm) return;

    const shareUrl = getShareableUrl(targetForm.id, 'respond');
    const inputEl = document.getElementById('share-url-input');
    if (inputEl) inputEl.value = shareUrl;

    const qrImg = document.getElementById('qr-code-img');
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;
    }

    const modalEl = document.getElementById('qrCodeModal');
    if (modalEl && window.bootstrap) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }
}

function copyShareUrlFromModal() {
    const inputEl = document.getElementById('share-url-input');
    if (!inputEl) return;
    inputEl.select();
    document.execCommand('copy');

    const toast = getCyberToast();
    if (toast) {
        toast.fire({
            icon: 'success',
            title: 'คัดลอกลิงก์เรียบร้อยแล้ว!'
        });
    } else {
        alert('คัดลอกลิงก์เรียบร้อยแล้ว!');
    }
}

function downloadQrCodeImage() {
    const qrImg = document.getElementById('qr-code-img');
    if (!qrImg || !qrImg.src) return;
    const a = document.createElement('a');
    a.href = qrImg.src;
    a.download = `QRCode_GyverForm.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function getShareableUrl(formId, mode = 'respond') {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?id=${formId}&mode=${mode}`;
}

// Helper Utilities
function hideAllViewContainers() {
    ['view-list-container', 'view-builder-container', 'view-respond-container', 'view-responses-container'].forEach(id => {
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
    return 'f_' + Math.random().toString(36).substr(2, 9);
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

// Expose globals for HTML onclick handlers
window.viewIndividualResponse = viewIndividualResponse;
window.deleteSingleResponse = deleteSingleResponse;
window.clearFormResponses = clearFormResponses;
window.openShareModalFromAnalytics = openShareModalFromAnalytics;
window.showSqlHelpModal = showSqlHelpModal;

// 📡 BroadcastChannel Listener for Realtime Multi-tab Updates
if (typeof BroadcastChannel !== 'undefined') {
    try {
        const formsBc = new BroadcastChannel('gyver_forms_channel');
        formsBc.onmessage = (event) => {
            if (event.data?.type === 'NEW_RESPONSE' && currentForm && event.data.formId === currentForm.id) {
                responsesList.unshift(event.data.response);
                if (currentMode === 'responses') {
                    renderAnalyticsView();
                }
            }
        };
    } catch (e) {}
}
