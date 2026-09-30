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
                    <button class="btn ${isSubmitted ? 'btn-outline-success' : 'btn-primary'} btn-sm rounded-pill fw-bold w-100" onclick="openSubmitWorkModal('${a.id}')">
                        <i class="bi ${isSubmitted ? 'bi-pencil' : 'bi-send-fill'} me-1"></i>${isSubmitted ? 'แก้ไขงานที่ส่ง' : 'ส่งการบ้านนี้'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
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

    const urlInput = document.getElementById('submit-work-url');
    const commentInput = document.getElementById('submit-work-comment');

    if (urlInput) urlInput.value = sub?.file_url || '';
    if (commentInput) commentInput.value = sub?.comment || '';

    const modal = new bootstrap.Modal(document.getElementById('submitWorkModal'));
    modal.show();
}

async function handleStudentSubmitWork(e) {
    e.preventDefault();
    if (!currentClassroom || !activeSubmitAssignmentId) return;

    const url = document.getElementById('submit-work-url').value.trim();
    const comment = document.getElementById('submit-work-comment').value.trim();

    const assignments = Array.isArray(currentClassroom.assignments) ? currentClassroom.assignments : [];
    const assignment = assignments.find(a => a.id === activeSubmitAssignmentId);
    if (!assignment) return;

    if (!assignment.submissions) assignment.submissions = {};
    const studentKey = currentStudentId || currentStudentName;

    assignment.submissions[studentKey] = {
        student_id: currentStudentId,
        student_name: currentStudentName,
        file_url: url,
        comment: comment,
        submitted_at: new Date().toISOString(),
        score: assignment.submissions[studentKey]?.score ?? null
    };

    const btn = document.getElementById('btn-do-submit');
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ assignments: assignments })
            .eq('id', currentClassroom.id);

        if (!error) {
            currentClassroom.assignments = assignments;
            showToast('success', 'ส่งงานสำเร็จ!', 'ผลงานของคุณถูกส่งไปยังคุณครูเรียบร้อย');
            bootstrap.Modal.getInstance(document.getElementById('submitWorkModal'))?.hide();
            renderStudentAssignments();
        } else {
            showToast('error', 'ส่งงานไม่สำเร็จ', error.message);
        }
    } finally {
        btn.disabled = false;
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
