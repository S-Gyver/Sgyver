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
let selectedSubmissionFile = null;
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

                <div class="d-flex gap-2 pt-2 border-top mt-auto">
                    ${isSubmitted && mySub.file_url ? `
                        <a href="${mySub.file_url}" target="_blank" class="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-bold" title="เปิดดูผลงานที่ส่งไว้">
                            <i class="bi bi-box-arrow-up-right me-1"></i>ดูงานที่ส่ง
                        </a>
                    ` : ''}
                    <button class="btn ${isSubmitted ? 'btn-outline-success' : 'btn-primary'} btn-sm rounded-pill fw-bold flex-grow-1" onclick="openSubmitWorkModal('${a.id}')">
                        <i class="bi ${isSubmitted ? 'bi-pencil' : 'bi-send-fill'} me-1"></i>${isSubmitted ? 'แก้ไขงานที่ส่ง' : 'ส่งการบ้านนี้'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
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

function handleStudentFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
        showToast('error', 'ไฟล์มีขนาดใหญ่เกินไป', 'ขนาดไฟล์สูงสุดไม่เกิน 100 MB');
        event.target.value = '';
        return;
    }

    selectedSubmissionFile = file;
    const previewCard = document.getElementById('file-selected-card');
    const nameEl = document.getElementById('file-selected-name');
    const sizeEl = document.getElementById('file-selected-size');
    const iconEl = document.getElementById('file-selected-icon');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatFileSize(file.size);
    if (iconEl) iconEl.className = `bi ${getFileIconClass(file.name)} fs-5`;
    if (previewCard) previewCard.classList.remove('d-none');
}

function removeSelectedFile() {
    selectedSubmissionFile = null;
    const fileInput = document.getElementById('submit-file-input');
    if (fileInput) fileInput.value = '';
    const previewCard = document.getElementById('file-selected-card');
    if (previewCard) previewCard.classList.add('d-none');
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
        const file = dt?.files?.[0];
        if (file) {
            const input = document.getElementById('submit-file-input');
            if (input) {
                input.files = dt.files;
                handleStudentFileSelected({ target: input });
            }
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

    removeSelectedFile();
    const progressEl = document.getElementById('submit-upload-progress');
    if (progressEl) progressEl.classList.add('d-none');

    const urlInput = document.getElementById('submit-work-url');
    const commentInput = document.getElementById('submit-work-comment');
    const existingFileAlert = document.getElementById('existing-file-alert');
    const existingFileLink = document.getElementById('existing-file-link');

    if (commentInput) commentInput.value = sub?.comment || '';

    // ตรวจสอบข้อมูลการส่งเดิม
    if (sub && sub.file_url) {
        const isCloudinaryFile = sub.file_url.includes('cloudinary.com') || sub.submission_type === 'file';
        if (isCloudinaryFile) {
            const radioFile = document.getElementById('type-file');
            if (radioFile) radioFile.checked = true;
            toggleSubmissionType('file');

            if (urlInput) urlInput.value = '';
            if (existingFileAlert && existingFileLink) {
                existingFileAlert.classList.remove('d-none');
                existingFileLink.href = sub.file_url;
                existingFileLink.textContent = sub.file_name ? `📄 ดูไฟล์ที่ส่งไว้ (${sub.file_name})` : '📄 ดูไฟล์งานเดิมที่ส่งไว้บน Cloudinary';
            }
        } else {
            const radioLink = document.getElementById('type-link');
            if (radioLink) radioLink.checked = true;
            toggleSubmissionType('link');
            if (urlInput) urlInput.value = sub.file_url;
            if (existingFileAlert) existingFileAlert.classList.add('d-none');
        }
    } else {
        const radioFile = document.getElementById('type-file');
        if (radioFile) radioFile.checked = true;
        toggleSubmissionType('file');
        if (urlInput) urlInput.value = '';
        if (existingFileAlert) existingFileAlert.classList.add('d-none');
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
    let finalFileUrl = '';
    let fileName = '';
    let fileSize = '';

    const btn = document.getElementById('btn-do-submit');
    const progressEl = document.getElementById('submit-upload-progress');
    const statusText = document.getElementById('submit-upload-status-text');

    if (currentSubmissionType === 'file') {
        if (selectedSubmissionFile) {
            // อัปโหลดไฟล์ขึ้น Cloudinary
            try {
                if (btn) btn.disabled = true;
                if (progressEl) progressEl.classList.remove('d-none');
                if (statusText) statusText.textContent = `กำลังอัปโหลด "${selectedSubmissionFile.name}" ขึ้น Cloudinary...`;

                const formData = new FormData();
                formData.append('file', selectedSubmissionFile);
                formData.append('upload_preset', CLOUDINARY.uploadPreset);

                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson.error?.message || 'อัปโหลดขึ้น Cloudinary ไม่สำเร็จ');
                }

                const data = await res.json();
                finalFileUrl = data.secure_url;
                fileName = selectedSubmissionFile.name;
                fileSize = formatFileSize(selectedSubmissionFile.size);
            } catch (err) {
                console.error("Cloudinary upload error:", err);
                showToast('error', 'อัปโหลดไฟล์ล้มเหลว', err.message);
                if (btn) btn.disabled = false;
                if (progressEl) progressEl.classList.add('d-none');
                return;
            }
        } else if (existingSubmissionData && existingSubmissionData.file_url) {
            finalFileUrl = existingSubmissionData.file_url;
            fileName = existingSubmissionData.file_name || 'ไฟล์งานเดิม';
            fileSize = existingSubmissionData.file_size || '';
        } else {
            showToast('warning', 'กรุณาเลือกไฟล์', 'กรุณาเลือกไฟล์ผลงานที่ต้องการส่งขึ้น Cloudinary');
            return;
        }
    } else {
        const urlInput = document.getElementById('submit-work-url');
        const url = (urlInput?.value || '').trim();
        if (!url) {
            showToast('warning', 'กรุณาระบุลิงก์', 'กรุณากรอกลิงก์ผลงาน เช่น Canva, Google Drive');
            return;
        }
        finalFileUrl = url;
        fileName = 'ลิงก์ผลงานภายนอก';
    }

    if (!assignment.submissions) assignment.submissions = {};
    const studentKey = currentStudentId || currentStudentName;

    assignment.submissions[studentKey] = {
        student_id: currentStudentId,
        student_name: currentStudentName,
        submission_type: currentSubmissionType, // 'file' | 'link'
        file_url: finalFileUrl,
        file_name: fileName,
        file_size: fileSize,
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
            showToast('success', 'ส่งงานสำเร็จ!', currentSubmissionType === 'file' ? 'ไฟล์ถูกบันทึกขึ้น Cloudinary เรียบร้อยแล้ว' : 'ส่งลิงก์ผลงานไปยังคุณครูเรียบร้อย');
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
