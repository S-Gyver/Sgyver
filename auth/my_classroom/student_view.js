/**
 * ====================================================
 * 🎓 Gyver Student Classroom Portal - Logic
 * ====================================================
 */

let currentStudentSession = null;
let currentStudentId = null;
let currentStudentName = 'นักเรียน';
let currentClassroom = null;
let activeSubmitAssignmentId = null;

// ── CLOUDINARY CONFIG ──────────────────────────────────────────
const CLOUDINARY = {
    cloudName:    'xn7rvu6g',
    uploadPreset: 'gyver_live',
};

let currentSubmissionType = 'file'; // 'file' | 'link'
let selectedSubmissionFiles = []; // Array of File objects
let existingSubmissionFiles = []; // Array of { url, name, size }
let existingSubmissionData = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initStudentView();
});

async function initStudentView() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('code');
    const classId = urlParams.get('id');

    if (!roomCode && !classId) {
        alert('ไม่พบรหัสห้องเรียน กรุณาเข้าสู่ห้องเรียนผ่านลิงก์ของครูผู้สอน');
        return;
    }

    // 1. ตรวจสอบบัญชีนักเรียน
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
            currentStudentSession = session.user;
            currentStudentId = session.user.id;
            currentStudentName = session.user.user_metadata?.first_name 
                ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name || ''}`.trim()
                : (session.user.user_metadata?.nickname || session.user.email);
        }
    } catch (e) {
        console.warn("Auth check warn:", e);
    }

    // 2. ดึงข้อมูลห้องเรียน
    let query = supabaseClient.from('classrooms').select('*');
    if (roomCode) {
        query = query.eq('room_code', roomCode);
    } else {
        query = query.eq('id', classId);
    }

    const { data: classrooms, error } = await query;
    if (error || !classrooms || classrooms.length === 0) {
        alert('ไม่พบข้อมูลห้องเรียนนี้ในระบบ');
        return;
    }

    currentClassroom = classrooms[0];
    renderClassroomHeader();
    renderStudentMaterials();
    renderStudentAssignments();
    renderStudentAttendance();
}

function renderClassroomHeader() {
    if (!currentClassroom) return;

    const titleEl = document.getElementById('student-view-class-name');
    const codeEl = document.getElementById('student-view-room-code');
    const welcomeEl = document.getElementById('student-view-welcome-name');

    if (titleEl) titleEl.innerText = currentClassroom.class_name || 'ห้องเรียน';
    if (codeEl) codeEl.innerText = currentClassroom.room_code || '------';
    if (welcomeEl) welcomeEl.innerText = `ยินดีต้อนรับ: ${currentStudentName}`;
}

async function refreshStudentView() {
    if (!currentClassroom) return;
    const { data: updated } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('id', currentClassroom.id)
        .single();

    if (updated) {
        currentClassroom = updated;
        renderClassroomHeader();
        renderStudentMaterials();
        renderStudentAssignments();
        renderStudentAttendance();
        showToast('success', 'อัปเดตแล้ว', 'ข้อมูลห้องเรียนเป็นล่าสุดแล้ว');
    }
}

// 📂 TAB 1: เอกสาร & ชีทเรียน
function renderStudentMaterials() {
    const list = document.getElementById('student-materials-list');
    if (!list || !currentClassroom) return;

    const materials = Array.isArray(currentClassroom.materials) ? currentClassroom.materials : [];

    if (materials.length === 0) {
        list.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="bi bi-folder-x fs-1 d-block mb-2 text-warning opacity-50"></i>
                <h6 class="fw-bold text-dark">ยังไม่มีไฟล์เอกสารในห้องนี้</h6>
                <p class="small text-muted">คุณครูยังไม่ได้วางไฟล์หรือสไลด์บทเรียน</p>
            </div>`;
        return;
    }

    list.innerHTML = materials.map(m => {
        const catMap = {
            slide: { label: 'สไลด์การสอน', icon: 'bi-file-earmark-slides-fill', class: 'category-badge-slide' },
            worksheet: { label: 'ใบงาน/แบบฝึกหัด', icon: 'bi-file-earmark-ruled-fill', class: 'category-badge-worksheet' },
            link: { label: 'สื่อ/วิดีโอ', icon: 'bi-link-45deg', class: 'category-badge-link' },
            other: { label: 'เอกสารอื่นๆ', icon: 'bi-file-earmark-text-fill', class: 'category-badge-other' }
        };

        const catInfo = catMap[m.category] || catMap.other;
        const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('th-TH') : '';

        return `
        <div class="col-md-6">
            <div class="material-card h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge ${catInfo.class} rounded-pill px-3 py-1 small fw-bold">
                        <i class="bi ${catInfo.icon} me-1"></i>${catInfo.label}
                    </span>
                    <small class="text-muted font-mono" style="font-size: 0.72rem;">${dateStr}</small>
                </div>
                <h6 class="fw-bold text-dark mb-1">${m.title}</h6>
                <p class="text-muted small mb-3 flex-grow-1" style="font-size: 0.85rem;">${m.description || 'ไม่มีคำอธิบาย'}</p>
                <a href="${m.file_url}" target="_blank" class="btn btn-outline-primary btn-sm rounded-pill fw-bold w-100 mt-auto">
                    <i class="bi bi-download me-1"></i>คลิกเพื่อเปิด / ดาวน์โหลด
                </a>
            </div>
        </div>`;
    }).join('');
}

// 📝 TAB 2: การบ้าน & ส่งงาน
function renderStudentAssignments() {
    const list = document.getElementById('student-assignments-list');
    if (!list || !currentClassroom) return;

    const assignments = Array.isArray(currentClassroom.assignments) ? currentClassroom.assignments : [];

    if (assignments.length === 0) {
        list.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="bi bi-journal-x fs-1 d-block mb-2 text-info opacity-50"></i>
                <h6 class="fw-bold text-dark">ยังไม่มีการบ้านหรือชิ้นงานที่ต้องส่ง</h6>
                <p class="small text-muted">คุณครูยังไม่ได้มอบหมายงานในขณะนี้</p>
            </div>`;
        return;
    }

    const studentKey = currentStudentId || currentStudentName;

    list.innerHTML = assignments.map(a => {
        const submissions = a.submissions || {};
        const mySub = submissions[studentKey];
        const isSubmitted = !!mySub;
        const dueDateStr = a.due_date ? new Date(a.due_date).toLocaleDateString('th-TH') : 'ไม่ระบุ';

        return `
        <div class="col-md-6">
            <div class="assignment-card h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-award-fill me-1"></i>${a.points || 10} คะแนน
                    </span>
                    ${isSubmitted 
                        ? `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1"><i class="bi bi-check-circle-fill me-1"></i>ส่งแล้ว</span>` 
                        : `<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1"><i class="bi bi-exclamation-circle-fill me-1"></i>ยังไม่ส่ง</span>`}
                </div>

                <h5 class="fw-bold text-dark mb-1">${a.title}</h5>
                <p class="text-muted small mb-3 flex-grow-1" style="font-size: 0.85rem;">${a.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>

                <div class="bg-light p-2 px-3 rounded-3 mb-3 small d-flex justify-content-between align-items-center">
                    <span class="text-muted"><i class="bi bi-clock me-1"></i>กำหนดส่ง: <b>${dueDateStr}</b></span>
                    ${isSubmitted && mySub.score !== undefined && mySub.score !== null 
                        ? `<span class="badge bg-primary text-white font-mono">ได้: ${mySub.score}/${a.points} คะแนน</span>` 
                        : ''}
                </div>

                <div class="d-flex flex-wrap gap-2 pt-2 border-top mt-auto">
                    ${isSubmitted && mySub.file_url ? `
                        ${Array.isArray(mySub.files) && mySub.files.length > 1 ? `
                            <button class="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-bold" onclick="openStudentViewFilesModal('${a.id}')" title="ดูไฟล์ที่ส่งไว้ทั้งหมด">
                                <i class="bi bi-files me-1"></i>ดูงาน (${mySub.files.length} ไฟล์)
                            </button>
                        ` : `
                            <a href="${mySub.file_url}" target="_blank" class="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-bold" title="เปิดดูผลงานที่ส่งไว้">
                                <i class="bi bi-box-arrow-up-right me-1"></i>ดูงานที่ส่ง
                            </a>
                        `}
                    ` : ''}
                    <button class="btn ${isSubmitted ? 'btn-outline-success' : 'btn-primary'} btn-sm rounded-pill fw-bold flex-grow-1" onclick="openSubmitWorkModal('${a.id}')">
                        <i class="bi ${isSubmitted ? 'bi-pencil' : 'bi-send-fill'} me-1"></i>${isSubmitted ? 'แก้ไขงานที่ส่ง' : 'ส่งการบ้านนี้'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// 📂 กล่องแสดงรายการไฟล์ที่ส่งแล้วของนักเรียน (เมื่อมีหลายไฟล์)
function openStudentViewFilesModal(assignmentId) {
    const assignments = Array.isArray(currentClassroom.assignments) ? currentClassroom.assignments : [];
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    const studentKey = currentStudentId || currentStudentName;
    const sub = assignment.submissions?.[studentKey];
    if (!sub || !Array.isArray(sub.files) || sub.files.length === 0) return;

    const filesHtml = sub.files.map((f, i) => `
        <div class="d-flex align-items-center justify-content-between p-2 mb-2 bg-light rounded-3 border text-start">
            <div class="d-flex align-items-center gap-2 text-truncate me-2">
                <i class="bi ${getFileIconClass(f.name)} fs-5 flex-shrink-0"></i>
                <div class="text-truncate">
                    <div class="fw-bold text-dark small text-truncate">${f.name || `ไฟล์ที่ ${i + 1}`}</div>
                    <div class="text-muted" style="font-size:0.75rem;">${f.size || ''}</div>
                </div>
            </div>
            <a href="${f.url}" target="_blank" class="btn btn-sm btn-primary rounded-pill px-3 py-1 fw-bold flex-shrink-0">
                <i class="bi bi-box-arrow-up-right me-1"></i>เปิดดู
            </a>
        </div>
    `).join('');

    Swal.fire({
        title: `ไฟล์ผลงานที่ส่ง (${sub.files.length} ไฟล์)`,
        html: `<div class="mt-3">${filesHtml}</div>`,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            popup: 'rounded-4 p-4 border-0 shadow'
        }
    });
}

// 📦 จัดการไฟล์และสลับประเภทการส่งงาน
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIconClass(fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'bi-file-earmark-image-fill text-primary';
    if (['pdf'].includes(ext)) return 'bi-file-earmark-pdf-fill text-danger';
    if (['doc', 'docx'].includes(ext)) return 'bi-file-earmark-word-fill text-primary';
    if (['ppt', 'pptx'].includes(ext)) return 'bi-file-earmark-ppt-fill text-warning';
    if (['xls', 'xlsx'].includes(ext)) return 'bi-file-earmark-excel-fill text-success';
    if (['zip', 'rar', '7z'].includes(ext)) return 'bi-file-earmark-zip-fill text-secondary';
    if (['mp4', 'mov', 'webm'].includes(ext)) return 'bi-file-earmark-play-fill text-danger';
    return 'bi-file-earmark-arrow-up-fill text-primary';
}

function toggleSubmissionType(type) {
    currentSubmissionType = type;
    const fileSec = document.getElementById('section-submit-file');
    const linkSec = document.getElementById('section-submit-link');
    const linkInput = document.getElementById('submit-work-url');

    if (type === 'file') {
        if (fileSec) fileSec.classList.remove('d-none');
        if (linkSec) linkSec.classList.add('d-none');
        if (linkInput) linkInput.required = false;
    } else {
        if (fileSec) fileSec.classList.add('d-none');
        if (linkSec) linkSec.classList.remove('d-none');
        if (linkInput) {
            linkInput.required = true;
            linkInput.focus();
        }
    }
}

// 📂 เลือกไฟล์หลายไฟล์ (Multiple files selection)
function handleStudentFilesSelected(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 100 * 1024 * 1024) {
            showToast('error', 'ไฟล์มีขนาดใหญ่เกินไป', `ไฟล์ "${file.name}" เกิน 100 MB`);
            continue;
        }
        // ตรวจสอบไฟล์ซ้ำ
        const exists = selectedSubmissionFiles.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            selectedSubmissionFiles.push(file);
        }
    }

    event.target.value = '';
    renderSelectedFilesList();
}

function renderSelectedFilesList() {
    const container = document.getElementById('file-selected-container');
    const list = document.getElementById('file-selected-list');
    const countLabel = document.getElementById('file-selected-count-label');

    if (!container || !list) return;

    if (selectedSubmissionFiles.length === 0) {
        container.classList.add('d-none');
        list.innerHTML = '';
        return;
    }

    container.classList.remove('d-none');
    if (countLabel) countLabel.textContent = `ไฟล์ใหม่ที่เลือกแนบ (${selectedSubmissionFiles.length} ไฟล์)`;

    list.innerHTML = selectedSubmissionFiles.map((file, idx) => {
        return `
        <div class="file-preview-card">
            <div class="d-flex align-items-center gap-2 text-truncate me-2">
                <div class="p-2 bg-primary-subtle text-primary rounded-3 flex-shrink-0">
                    <i class="bi ${getFileIconClass(file.name)} fs-5"></i>
                </div>
                <div class="text-truncate">
                    <div class="fw-bold text-dark small text-truncate" title="${file.name}">${file.name}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger rounded-circle p-1 px-2 flex-shrink-0" onclick="removeSelectedFileByIndex(${idx})" title="ลบไฟล์นี้">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>`;
    }).join('');
}

function removeSelectedFileByIndex(idx) {
    selectedSubmissionFiles.splice(idx, 1);
    renderSelectedFilesList();
}

function clearAllSelectedFiles() {
    selectedSubmissionFiles = [];
    const fileInput = document.getElementById('submit-file-input');
    if (fileInput) fileInput.value = '';
    renderSelectedFilesList();
}

// 📂 เรนเดอร์ไฟล์เดิมที่เคยส่งไว้แล้ว
function renderExistingFilesList() {
    const container = document.getElementById('existing-files-container');
    const list = document.getElementById('existing-files-list');
    if (!container || !list) return;

    if (existingSubmissionFiles.length === 0) {
        container.classList.add('d-none');
        list.innerHTML = '';
        return;
    }

    container.classList.remove('d-none');
    list.innerHTML = existingSubmissionFiles.map((f, idx) => {
        return `
        <div class="d-flex align-items-center justify-content-between p-2 bg-success-subtle border border-success-subtle rounded-3 small">
            <div class="d-flex align-items-center gap-2 text-truncate me-2">
                <i class="bi ${getFileIconClass(f.name)} text-success fs-5 flex-shrink-0"></i>
                <div class="text-truncate">
                    <a href="${f.url}" target="_blank" class="fw-bold text-success text-decoration-none text-truncate d-block" title="คลิกเพื่อดูไฟล์">
                        ${f.name || 'ไฟล์งานที่ส่งไว้'}
                    </a>
                    ${f.size ? `<span class="text-muted" style="font-size: 0.72rem;">${f.size}</span>` : ''}
                </div>
            </div>
            <div class="d-flex align-items-center gap-1 flex-shrink-0">
                <a href="${f.url}" target="_blank" class="btn btn-sm btn-light border py-0 px-2 text-success small" style="font-size: 0.75rem;">
                    <i class="bi bi-box-arrow-up-right me-1"></i>ดูไฟล์
                </a>
                <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-1" onclick="removeExistingFileByIndex(${idx})" title="ลบไฟล์เดิมนี้ออก">
                    <i class="bi bi-trash3"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

function removeExistingFileByIndex(idx) {
    existingSubmissionFiles.splice(idx, 1);
    renderExistingFilesList();
}

function initDropzoneEvents() {
    const dropzone = document.getElementById('submit-dropzone');
    if (!dropzone || dropzone._hasListeners) return;
    dropzone._hasListeners = true;

    ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (files && files.length > 0) {
            handleStudentFilesSelected({ target: { files: files, value: '' } });
        }
    });
}

function openSubmitWorkModal(assignmentId) {
    activeSubmitAssignmentId = assignmentId;
    const assignments = Array.isArray(currentClassroom.assignments) ? currentClassroom.assignments : [];
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    document.getElementById('modal-work-title').innerText = `การบ้าน: ${assignment.title}`;
    document.getElementById('modal-work-points').innerText = `คะแนนเต็ม: ${assignment.points} คะแนน • กำหนดส่ง: ${assignment.due_date || 'ไม่ระบุ'}`;

    const studentKey = currentStudentId || currentStudentName;
    const sub = assignment.submissions?.[studentKey];
    existingSubmissionData = sub || null;

    clearAllSelectedFiles();
    const progressEl = document.getElementById('submit-upload-progress');
    if (progressEl) progressEl.classList.add('d-none');

    const urlInput = document.getElementById('submit-work-url');
    const commentInput = document.getElementById('submit-work-comment');
    if (commentInput) commentInput.value = sub?.comment || '';

    // โหลดรายการไฟล์เดิม (ถ้ามี)
    existingSubmissionFiles = [];
    if (sub) {
        if (Array.isArray(sub.files) && sub.files.length > 0) {
            existingSubmissionFiles = sub.files.map(f => typeof f === 'string' ? { url: f, name: 'ไฟล์งาน', size: '' } : f);
        } else if (sub.file_url) {
            const isCloudFile = sub.file_url.includes('cloudinary.com') || sub.submission_type === 'file';
            if (isCloudFile) {
                existingSubmissionFiles = [{
                    url: sub.file_url,
                    name: sub.file_name || 'ไฟล์งานเดิม',
                    size: sub.file_size || ''
                }];
            }
        }
    }

    renderExistingFilesList();

    if (sub && sub.submission_type === 'link') {
        const radioLink = document.getElementById('type-link');
        if (radioLink) radioLink.checked = true;
        toggleSubmissionType('link');
        if (urlInput) urlInput.value = sub.file_url || '';
    } else {
        const radioFile = document.getElementById('type-file');
        if (radioFile) radioFile.checked = true;
        toggleSubmissionType('file');
        if (urlInput) urlInput.value = '';
    }

    initDropzoneEvents();

    const modal = new bootstrap.Modal(document.getElementById('submitWorkModal'));
    modal.show();
}

async function handleStudentSubmitWork(e) {
    e.preventDefault();
    if (!currentClassroom || !activeSubmitAssignmentId) return;

    const assignments = Array.isArray(currentClassroom.assignments) ? currentClassroom.assignments : [];
    const assignment = assignments.find(a => a.id === activeSubmitAssignmentId);
    if (!assignment) return;

    const comment = document.getElementById('submit-work-comment')?.value.trim() || '';
    const btn = document.getElementById('btn-do-submit');
    const progressEl = document.getElementById('submit-upload-progress');
    const statusText = document.getElementById('submit-upload-status-text');

    let allFiles = [];
    let finalFileUrl = '';
    let combinedFileName = '';

    if (currentSubmissionType === 'file') {
        if (selectedSubmissionFiles.length === 0 && existingSubmissionFiles.length === 0) {
            showToast('warning', 'กรุณาเลือกไฟล์', 'กรุณาเลือกไฟล์ผลงานอย่างน้อย 1 ไฟล์');
            return;
        }

        // อัปโหลดไฟล์ใหม่ทั้งหมดขึ้น Cloudinary
        const newlyUploaded = [];
        if (selectedSubmissionFiles.length > 0) {
            if (btn) btn.disabled = true;
            if (progressEl) progressEl.classList.remove('d-none');

            try {
                for (let i = 0; i < selectedSubmissionFiles.length; i++) {
                    const file = selectedSubmissionFiles[i];
                    if (statusText) statusText.textContent = `กำลังอัปโหลดไฟล์ (${i + 1}/${selectedSubmissionFiles.length}): "${file.name}"...`;

                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('upload_preset', CLOUDINARY.uploadPreset);

                    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) {
                        const errJson = await res.json().catch(() => ({}));
                        throw new Error(errJson.error?.message || `อัปโหลดไฟล์ "${file.name}" ไม่สำเร็จ`);
                    }

                    const data = await res.json();
                    newlyUploaded.push({
                        url: data.secure_url,
                        name: file.name,
                        size: formatFileSize(file.size)
                    });
                }
            } catch (err) {
                console.error("Upload error:", err);
                showToast('error', 'อัปโหลดไฟล์ล้มเหลว', err.message);
                if (btn) btn.disabled = false;
                if (progressEl) progressEl.classList.add('d-none');
                return;
            }
        }

        allFiles = [...existingSubmissionFiles, ...newlyUploaded];
        finalFileUrl = allFiles[0]?.url || '';
        combinedFileName = allFiles.map(f => f.name).join(', ');
    } else {
        // Link type
        const urlInput = document.getElementById('submit-work-url');
        const url = (urlInput?.value || '').trim();
        if (!url) {
            showToast('warning', 'กรุณาระบุลิงก์', 'กรุณากรอกลิงก์ผลงาน เช่น Canva, Google Drive');
            return;
        }
        finalFileUrl = url;
        combinedFileName = 'ลิงก์ผลงานภายนอก';
        allFiles = [{ url: url, name: 'ลิงก์ผลงาน', size: '' }];
    }

    if (!assignment.submissions) assignment.submissions = {};
    const studentKey = currentStudentId || currentStudentName;

    assignment.submissions[studentKey] = {
        student_id: currentStudentId,
        student_name: currentStudentName,
        submission_type: currentSubmissionType, // 'file' | 'link'
        files: allFiles,
        file_url: finalFileUrl,
        file_name: combinedFileName,
        file_size: allFiles.length > 1 ? `${allFiles.length} ไฟล์` : (allFiles[0]?.size || ''),
        comment: comment,
        submitted_at: new Date().toISOString(),
        score: assignment.submissions[studentKey]?.score ?? null
    };

    if (btn) btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ assignments: assignments })
            .eq('id', currentClassroom.id);

        if (!error) {
            currentClassroom.assignments = assignments;
            showToast('success', 'ส่งงานสำเร็จ!', currentSubmissionType === 'file' ? `บันทึกไฟล์ส่งงาน (${allFiles.length} ไฟล์) เรียบร้อยแล้ว` : 'ส่งลิงก์ผลงานไปยังคุณครูเรียบร้อย');
            bootstrap.Modal.getInstance(document.getElementById('submitWorkModal'))?.hide();
            renderStudentAssignments();
        } else {
            showToast('error', 'ส่งงานไม่สำเร็จ', error.message);
        }
    } catch (err) {
        showToast('error', 'เกิดข้อผิดพลาด', err.message);
    } finally {
        if (btn) btn.disabled = false;
        if (progressEl) progressEl.classList.add('d-none');
    }
}

// 📋 TAB 3: ประวัติเข้าเรียน
function renderStudentAttendance() {
    const tbody = document.getElementById('student-att-tbody');
    if (!tbody || !currentClassroom) return;

    const logs = currentClassroom.attendance_logs || {};
    const dates = Object.keys(logs).sort().reverse();

    if (dates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">ยังไม่มีบันทึกการเช็คชื่อในระบบ</td></tr>`;
        return;
    }

    const studentKey = currentStudentId || currentStudentName;

    tbody.innerHTML = dates.map(d => {
        const record = logs[d]?.[studentKey];
        const status = record?.status || 'unrecorded';
        const note = record?.note || '-';

        const statusMap = {
            present: '<span class="badge bg-success text-white px-3 py-1">มาเรียน</span>',
            late: '<span class="badge bg-warning text-dark px-3 py-1">มาสาย</span>',
            leave: '<span class="badge bg-info text-white px-3 py-1">ลา</span>',
            absent: '<span class="badge bg-danger text-white px-3 py-1">ขาดเรียน</span>',
            unrecorded: '<span class="badge bg-secondary-subtle text-secondary px-3 py-1">ไม่ระบุ</span>'
        };

        return `
        <tr>
            <td class="font-mono">${new Date(d).toLocaleDateString('th-TH')}</td>
            <td class="text-center">${statusMap[status] || statusMap.unrecorded}</td>
            <td class="text-muted small">${note}</td>
        </tr>`;
    }).join('');
}
