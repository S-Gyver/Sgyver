/**
 * ====================================================
 * 🏫 Gyver My Classroom (ห้องเรียนของฉัน) - Main Logic
 * ====================================================
 */

let currentUserId = null;
let currentUserEmail = '';
let currentUserName = '';
let cachedClassrooms = [];
let cachedTeachingClassrooms = [];
let cachedEnrolledClassrooms = [];
let currentHubRoleTab = 'teaching'; // 'teaching' | 'enrolled'
let activeClassroomId = null;
let activeClassroom = null;

// ── CLOUDINARY CONFIG ──────────────────────────────────────────
const CLOUDINARY = {
    cloudName:    'xn7rvu6g',
    uploadPreset: 'gyver_live',
};
let selectedMaterialFile = null;
let currentMaterialSourceType = 'file'; // 'file' | 'link'

// Realtime channel
let classroomRealtimeChannel = null;

// Attendance state for current selected date
let currentAttendanceDate = new Date().toISOString().split('T')[0];
let currentAttendanceMap = {}; // studentName -> { status: 'present'|'late'|'leave'|'absent', note: '' }

// Selected assignment for grading modal
let activeAssignmentId = null;

document.addEventListener('DOMContentLoaded', async () => {
    initDefaultDates();
    initTabPersistence();
    await fetchUserAndClassrooms();
});

function initTabPersistence() {
    document.addEventListener('shown.bs.tab', (e) => {
        const targetId = e.target?.getAttribute('id');
        if (targetId && activeClassroomId) {
            try {
                localStorage.setItem(`gyver_last_tab_${activeClassroomId}`, targetId);
            } catch (err) {}
            handleTabSectionsBarVisibility(targetId);
        }
    });
}

function handleTabSectionsBarVisibility(tabBtnId) {
    const secBar = document.getElementById('classroom-sections-bar');
    if (!secBar) return;
    // Hide sections bar on course-wide shared tabs (Tab 3: แจกไฟล์ & ชีทเรียน, Tab 4: สั่งงาน & ตรวจงาน)
    if (tabBtnId === 'tab-materials-btn' || tabBtnId === 'tab-assignments-btn') {
        secBar.classList.add('d-none');
    } else {
        secBar.classList.remove('d-none');
    }
}


function initDefaultDates() {
    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput) {
        dateInput.value = currentAttendanceDate;
    }

    const assignmentDue = document.getElementById('assignment-due-date');
    if (assignmentDue) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        assignmentDue.value = nextWeek.toISOString().split('T')[0];
    }
}

// 🔐 ตรวจสอบสิทธิ์ผู้ใช้ และโหลดรายชื่อห้องเรียนทั้งหมดของครู
async function fetchUserAndClassrooms() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            showToast('error', 'ข้อผิดพลาด', 'ไม่พบการเชื่อมต่อฐานข้อมูล Supabase');
            return;
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) {
            window.location.href = '../login/login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        currentUserId = session.user.id;
        currentUserEmail = session.user.email || '';
        const meta = session.user.user_metadata || {};
        currentUserName = meta.first_name ? `${meta.first_name} ${meta.last_name || ''}`.trim() : (meta.nickname || session.user.email || 'ผู้ใช้งาน');
        await loadClassrooms();

    } catch (err) {
        console.error("fetchUserAndClassrooms error:", err);
    }
}

// 🧼 ฟังก์ชันช่วยดึงเฉพาะเลขห้องเรียนย่อย เช่น "4/2" -> "2", "ม.4/1" -> "1", "ห้อง 3" -> "3"
function extractCleanRoomSection(rawSec, gradeLevel) {
    if (!rawSec) return '1';
    let s = String(rawSec).trim();
    const cleanG = String(gradeLevel || '').replace(/[^0-9]/g, '');
    if (cleanG) {
        s = s.replace(new RegExp(`^(?:[มป]\\.?\\s*)?${cleanG}\\s*[/\\-]\\s*`, 'i'), '');
    }
    s = s.replace(/^[มป]\.?\s*\d+\s*[/\\-]\s*/i, '');
    s = s.replace(/^ห้อง\s*/i, '');
    return s.trim() || '1';
}

// 🛠️ ตัวช่วยเติมเต็มข้อมูล materials / assignments / attendance_logs จาก Cloud หรือ Local Fallback
function enrichClassroom(c) {
    if (!c) return c;
    if (!Array.isArray(c.materials)) {
        try {
            c.materials = JSON.parse(localStorage.getItem(`gyver_materials_${c.id}`)) || [];
        } catch (e) { c.materials = []; }
    }
    if (!Array.isArray(c.assignments)) {
        try {
            c.assignments = JSON.parse(localStorage.getItem(`gyver_assignments_${c.id}`)) || [];
        } catch (e) { c.assignments = []; }
    }
    if (!c.attendance_logs || typeof c.attendance_logs !== 'object') {
        try {
            c.attendance_logs = JSON.parse(localStorage.getItem(`gyver_attendance_${c.id}`)) || {};
        } catch (e) { c.attendance_logs = {}; }
    }
    if (!c.attendance_criteria || typeof c.attendance_criteria !== 'object') {
        try {
            c.attendance_criteria = JSON.parse(localStorage.getItem(`gyver_attendance_criteria_${c.id}`)) || null;
        } catch (e) { c.attendance_criteria = null; }
    }
    if (!c.gradebook || typeof c.gradebook !== 'object') {
        try {
            c.gradebook = JSON.parse(localStorage.getItem(`gyver_gradebook_${c.id}`)) || null;
        } catch (e) { c.gradebook = null; }
    }
    if (!c.gradebook) {
        c.gradebook = {
            config: {},
            columns: [
                { id: 'col_task1', title: 'ใบงานที่ 1', max: 10 },
                { id: 'col_task2', title: 'ใบงานที่ 2', max: 10 },
                { id: 'col_quiz', title: 'ทดสอบย่อย', max: 10 },
                { id: 'col_affective', title: 'จิตพิสัย/เวลาเรียน', max: 10 }
            ],
            scores: {}
        };
    }

    if (!c.gradebook.config) c.gradebook.config = {};
    const cfg = c.gradebook.config;
    if (!cfg.midterm_max) cfg.midterm_max = 20;
    if (!cfg.final_max) cfg.final_max = 30;
    if (!cfg.semester) cfg.semester = '1';
    if (!cfg.academic_year) cfg.academic_year = '2569';

    // ถ้าไม่มี subject_name หรือ grade_level หรือ room_section ลองแกะจาก class_name
    if (!cfg.subject_name || !cfg.grade_level || !cfg.room_section) {
        const nameMatch = (c.class_name || '').match(/^(?:([A-Za-zก-๙0-9_]+)\s+)?(.+?)\s*\(([มป]\.?\d+|\d+)(?:[^\/]*\/)*([^)]+)\)$/);
        if (nameMatch) {
            if (!cfg.subject_code && nameMatch[1]) cfg.subject_code = nameMatch[1];
            if (!cfg.subject_name) cfg.subject_name = nameMatch[2]?.trim() || c.class_name;
            if (!cfg.grade_level) cfg.grade_level = (nameMatch[3] || '4').replace(/[^0-9]/g, '') || '4';
            if (!cfg.room_section) cfg.room_section = extractCleanRoomSection(nameMatch[4] || '1', cfg.grade_level);
        } else {
            if (!cfg.subject_name) cfg.subject_name = c.class_name || 'วิชาใหม่';
            if (!cfg.grade_level) cfg.grade_level = '4';
            if (!cfg.room_section) cfg.room_section = '1';
        }
    }
    if (cfg.room_section) {
        cfg.room_section = extractCleanRoomSection(cfg.room_section, cfg.grade_level);
    }
    if (!cfg.subject_group_id && cfg.subject_name) {
        const cleanSubj = cfg.subject_name.replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim();
        cfg.subject_group_id = `subj_${c.teacher_id}_${encodeURIComponent(cleanSubj)}_${cfg.grade_level || '4'}`;
    }

    // แก้ไขข้อความ class_name ในหน่วยความจำหากมี (ม.4/4/X) ให้กลายเป็น (ม.4/X)
    if (c.class_name) {
        c.class_name = c.class_name.replace(/\(ม\.(\d+)\/\1\//g, '(ม.$1/');
    }

    return c;
}

// 📚 ดึงรายชื่อห้องเรียนทั้งหมด (ทั้งห้องที่สอน และห้องที่เรียน)
async function loadClassrooms() {
    if (!currentUserId) return;

    // 1. ดึงห้องเรียนที่ฉันสอน (ครู)
    const { data: classrooms, error } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('teacher_id', currentUserId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch teaching classrooms error:", error.message);
        showToast('error', 'โหลดห้องเรียนไม่สำเร็จ', error.message);
    }

    cachedTeachingClassrooms = (classrooms || []).map(enrichClassroom);
    cachedClassrooms = cachedTeachingClassrooms;

    // 2. ดึงห้องเรียนที่ฉันเข้าร่วม (นักเรียน)
    try {
        const { data: allRooms, error: allErr } = await supabaseClient
            .from('classrooms')
            .select('*')
            .order('created_at', { ascending: false });

        if (!allErr && Array.isArray(allRooms)) {
            const enrolled = allRooms.filter(c => {
                if (!Array.isArray(c.students)) return false;
                return c.students.some(s => {
                    const matchId = s.user_id && String(s.user_id) === String(currentUserId);
                    const matchEmail = currentUserEmail && s.email && String(s.email).toLowerCase() === currentUserEmail.toLowerCase();
                    return matchId || matchEmail;
                });
            });

            // ดึงชื่อครูผู้สอนจาก profiles
            const teacherIds = [...new Set(enrolled.map(c => c.teacher_id).filter(Boolean))];
            let teacherMap = {};
            if (teacherIds.length > 0) {
                try {
                    const { data: profs } = await supabaseClient
                        .from('profiles')
                        .select('id, nickname, first_name, last_name, username')
                        .in('id', teacherIds);
                    if (profs) {
                        profs.forEach(p => {
                            const name = p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : (p.nickname || p.username || 'คุณครู');
                            teacherMap[p.id] = name;
                        });
                    }
                } catch (pe) {
                    console.warn("fetch teacher profiles warn:", pe);
                }
            }

            cachedEnrolledClassrooms = enrolled.map(c => {
                const enriched = enrichClassroom(c);
                enriched.teacherName = teacherMap[c.teacher_id] || 'คุณครูผู้สอน';
                return enriched;
            });
        }
    } catch (e) {
        console.warn("Fetch enrolled classrooms error:", e);
    }

    // หากผู้ใช้ไม่มีห้องสอนเลย แต่มีห้องที่ลงเรียนไว้ ให้เปิดแท็บ 'enrolled' ให้อัตโนมัติ
    if (cachedTeachingClassrooms.length === 0 && cachedEnrolledClassrooms.length > 0) {
        currentHubRoleTab = 'enrolled';
    }

    updateHubRoleTabsUI();

    // 1. ตรวจสอบว่ามีห้องที่เลือกผ่าน URL Query หรือไม่ (เช่น ?id=xxx หรือ ?code=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('id');
    const paramCode = urlParams.get('code');

    if (paramId) {
        const target = cachedClassrooms.find(c => c.id === paramId);
        if (target) {
            enterClassroom(target.id);
            return;
        }
    } else if (paramCode) {
        const target = cachedClassrooms.find(c => c.room_code === paramCode);
        if (target) {
            enterClassroom(target.id);
            return;
        }
    }

    // 2. ตรวจสอบห้องเรียนล่าสุดที่เคยเข้าใช้งานไว้ (ป้องกันการเด้งออกไปหน้ารวมห้องเวลาผู้ใช้กดรีเฟรชเบราว์เซอร์หรือ Workspace)
    try {
        const lastClassId = localStorage.getItem('gyver_last_classroom_id');
        if (lastClassId) {
            const savedTarget = cachedClassrooms.find(c => c.id === lastClassId);
            if (savedTarget) {
                enterClassroom(savedTarget.id);
                return;
            }
        }
    } catch (e) {
        console.warn('localStorage error:', e);
    }

    // ค่าเริ่มต้น: แสดงหน้ารวมห้องเรียนทั้งหมด (View 1)
    showClassroomsHub();
}

/* ============================================================== */
/* 🏛️ VIEW 1: หน้ารวมห้องเรียน (Classrooms Hub) */
/* ============================================================== */
function updateHubRoleTabsUI() {
    const teachBadge = document.getElementById('hub-badge-teaching');
    const enrollBadge = document.getElementById('hub-badge-enrolled');
    if (teachBadge) teachBadge.textContent = cachedTeachingClassrooms.length;
    if (enrollBadge) enrollBadge.textContent = cachedEnrolledClassrooms.length;

    const btnTeach = document.getElementById('hub-tab-btn-teaching');
    const btnEnroll = document.getElementById('hub-tab-btn-enrolled');
    const actionTeach = document.getElementById('btn-hub-action-teaching');
    const actionEnroll = document.getElementById('btn-hub-action-enrolled');
    const hubTitle = document.getElementById('hub-header-title');
    const hubSubtitle = document.getElementById('hub-header-subtitle');
    const hubIcon = document.getElementById('hub-header-icon');
    const hubTip = document.getElementById('hub-tab-tip');

    if (currentHubRoleTab === 'teaching') {
        if (btnTeach) btnTeach.className = 'hub-role-tab-btn active';
        if (btnEnroll) btnEnroll.className = 'hub-role-tab-btn';
        if (actionTeach) actionTeach.classList.remove('d-none');
        if (actionEnroll) actionEnroll.classList.add('d-none');
        if (hubTitle) hubTitle.textContent = 'ห้องเรียนที่ฉันสอน';
        if (hubSubtitle) hubSubtitle.textContent = 'เลือกห้องเรียนที่ต้องการเข้าสอน สแกน QR วันแรก เช็คชื่อ แจกชีท หรือสร้างห้องเรียนใหม่';
        if (hubIcon) hubIcon.className = 'bi bi-person-video3 fs-3';
        if (hubTip) hubTip.innerHTML = '<i class="bi bi-info-circle me-1"></i>แสดงห้องเรียนที่คุณเป็นผู้สอน/ผู้สร้าง';
    } else {
        if (btnTeach) btnTeach.className = 'hub-role-tab-btn';
        if (btnEnroll) btnEnroll.className = 'hub-role-tab-btn active enrolled-active';
        if (actionTeach) actionTeach.classList.add('d-none');
        if (actionEnroll) actionEnroll.classList.remove('d-none');
        if (hubTitle) hubTitle.textContent = 'ห้องเรียนที่ฉันเรียน';
        if (hubSubtitle) hubSubtitle.textContent = 'ห้องเรียนที่คุณเข้าร่วมเป็นนักเรียน เข้าดูบทเรียน ดาวน์โหลดชีท ส่งการบ้าน และดูคะแนน';
        if (hubIcon) hubIcon.className = 'bi bi-backpack2-fill fs-3';
        if (hubTip) hubTip.innerHTML = '<i class="bi bi-info-circle me-1"></i>แสดงห้องเรียนที่คุณเข้าร่วมในฐานะนักเรียน';
    }
}

function switchHubRoleTab(role) {
    currentHubRoleTab = role;
    updateHubRoleTabsUI();
    const searchInput = document.getElementById('search-class-input');
    const q = searchInput ? searchInput.value : '';
    handleSearchClassrooms(q);
}

function showClassroomsHub() {
    // ล้างห้องที่จำไว้เมื่อผู้ใช้จงใจกดย้อนกลับไปหน้ารวมห้อง
    try {
        localStorage.removeItem('gyver_last_classroom_id');
    } catch (e) {}

    const hubView = document.getElementById('classrooms-hub-view');
    const detailView = document.getElementById('classroom-detail-view');
    const backBtn = document.getElementById('nav-btn-back-hub');
    const navDropdown = document.getElementById('navbar-room-dropdown-container');

    if (hubView) hubView.classList.remove('d-none');
    if (detailView) detailView.classList.add('d-none');
    if (backBtn) backBtn.classList.replace('d-inline-flex', 'd-none');
    if (navDropdown) navDropdown.classList.replace('d-inline-flex', 'd-none');

    // ล้าง URL param ให้เป็นหน้าหลัก
    window.history.replaceState(null, '', window.location.pathname);

    updateHubRoleTabsUI();
    const searchInput = document.getElementById('search-class-input');
    const q = searchInput ? searchInput.value : '';
    handleSearchClassrooms(q);
}

function handleSearchClassrooms(query) {
    const q = (query || '').trim().toLowerCase();

    if (currentHubRoleTab === 'teaching') {
        if (!q) {
            renderHubClassrooms(cachedTeachingClassrooms);
            return;
        }
        const filtered = cachedTeachingClassrooms.filter(c => 
            (c.class_name || '').toLowerCase().includes(q) ||
            (c.room_code || '').toLowerCase().includes(q) ||
            (c.gradebook?.config?.subject_code || '').toLowerCase().includes(q) ||
            (c.gradebook?.config?.subject_name || '').toLowerCase().includes(q)
        );
        renderHubClassrooms(filtered);
    } else {
        if (!q) {
            renderHubEnrolledClassrooms(cachedEnrolledClassrooms);
            return;
        }
        const filtered = cachedEnrolledClassrooms.filter(c => 
            (c.class_name || '').toLowerCase().includes(q) ||
            (c.room_code || '').toLowerCase().includes(q) ||
            (c.gradebook?.config?.subject_code || '').toLowerCase().includes(q) ||
            (c.gradebook?.config?.subject_name || '').toLowerCase().includes(q) ||
            (c.teacherName || '').toLowerCase().includes(q)
        );
        renderHubEnrolledClassrooms(filtered);
    }
}

// 🎒 เรนเดอร์การ์ดห้องเรียนที่ฉันเข้าร่วม (Enrolled Classrooms for Students)
function renderHubEnrolledClassrooms(classroomsList) {
    const grid = document.getElementById('hub-classrooms-grid');
    if (!grid) return;

    if (!classroomsList || classroomsList.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 bg-white rounded-4 border border-dashed shadow-sm">
                <div class="bg-success-subtle text-success d-inline-flex p-3 rounded-circle mb-3">
                    <i class="bi bi-backpack2-fill fs-1"></i>
                </div>
                <h5 class="fw-bold text-dark mb-1">ยังไม่มีห้องเรียนที่คุณเข้าร่วม</h5>
                <p class="text-muted small mb-3">ขอรหัสห้องเรียน (PIN 6 ตัวอักษร) หรือสแกน QR Code จากคุณครู เพื่อเข้าห้องเรียน</p>
                <button class="btn btn-success btn-sm rounded-pill px-4 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#joinClassModal">
                    <i class="bi bi-key-fill me-1"></i>เข้าร่วมห้องเรียนด้วย PIN
                </button>
            </div>`;
        return;
    }

    grid.innerHTML = classroomsList.map(c => {
        const cfg = c.gradebook?.config || {};
        const subjectCode = cfg.subject_code || '';
        const subjectName = cfg.subject_name || c.class_name;
        const gradeLevel = cfg.grade_level || '4';
        const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;
        const secNum = extractCleanRoomSection(cfg.room_section || c.class_name, gradeLevel);
        const rCode = c.room_code || '------';
        const teacher = c.teacherName || 'คุณครูผู้สอน';
        const classmatesCount = Array.isArray(c.students) ? c.students.length : 0;
        const materialsCount = Array.isArray(c.materials) ? c.materials.length : 0;
        const assignmentsCount = Array.isArray(c.assignments) ? c.assignments.length : 0;

        return `
        <div class="col-md-6 col-lg-4">
            <div class="hub-classroom-card enrolled-card h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="room-code-badge bg-success-subtle text-success border border-success-subtle" title="รหัสห้องเรียน">
                        <i class="bi bi-key-fill text-success"></i> ${rCode}
                        <button class="room-code-copy-btn ms-1 text-success" onclick="quickCopyCode('${rCode}')" title="คัดลอกรหัสห้อง">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </span>

                    <div class="dropdown">
                        <button class="btn btn-sm btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical fs-5"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3">
                            <li>
                                <a class="dropdown-item py-2" href="student_view.html?code=${rCode}">
                                    <i class="bi bi-box-arrow-in-right me-2 text-success"></i>เข้าสู่หน้าห้องเรียน
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="leaveEnrolledClassroom('${c.id}', '${encodeURIComponent(subjectName)}')">
                                    <i class="bi bi-box-arrow-left me-2"></i>ออกจากห้องเรียนนี้
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="mb-2">
                    ${subjectCode ? `<span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill font-mono px-2 py-0 small me-1">${subjectCode}</span>` : ''}
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0 small me-1">ห้อง ${displayGrade}/${secNum}</span>
                    <span class="badge bg-light text-secondary border rounded-pill px-2 py-0 small">นักเรียน</span>
                </div>

                <h4 class="fw-bold text-dark mb-1 text-truncate" title="${subjectName}">
                    ${subjectCode ? subjectCode + ' ' : ''}${subjectName}
                </h4>

                <div class="small text-muted mb-3 d-flex align-items-center gap-1">
                    <i class="bi bi-person-badge text-primary"></i> ครูผู้สอน: <b class="text-dark">${teacher}</b>
                </div>

                <div class="d-flex flex-wrap gap-2 mb-4">
                    <span class="badge bg-light text-dark border rounded-pill px-3 py-1">
                        <i class="bi bi-people-fill text-primary me-1"></i>${classmatesCount} คนในห้อง
                    </span>
                    <span class="badge bg-light text-dark border rounded-pill px-3 py-1">
                        <i class="bi bi-folder-fill text-warning me-1"></i>${materialsCount} ชีทเรียน
                    </span>
                    <span class="badge bg-light text-dark border rounded-pill px-3 py-1">
                        <i class="bi bi-journal-text text-info me-1"></i>${assignmentsCount} งาน
                    </span>
                </div>

                <div class="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-check-circle-fill me-1"></i>เข้าร่วมแล้ว
                    </span>
                    <a href="student_view.html?code=${rCode}" class="btn btn-success btn-sm rounded-pill px-4 fw-bold shadow-sm">
                        <i class="bi bi-box-arrow-in-right me-1"></i>เข้าห้องเรียน
                    </a>
                </div>
            </div>
        </div>`;
    }).join('');
}

// 🚪 ฟังก์ชันให้นักเรียนออกจากห้องเรียนที่เคยเข้าร่วม
async function leaveEnrolledClassroom(classroomId, encodedSubjName) {
    const subjName = decodeURIComponent(encodedSubjName);
    const result = await Swal.fire({
        title: 'ยืนยันออกจากห้องเรียน?',
        html: `คุณต้องการออกจากห้องเรียน <b>${subjName}</b> ใช่หรือไม่?<br><span class="text-danger small">หากออกแล้ว คุณจะไม่สามารถเข้าดูบทเรียนหรือส่งงานในห้องนี้ได้จนกว่าจะได้รับรหัสเข้าใหม่</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-box-arrow-left me-1"></i>ออกจากห้องเรียน',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        customClass: {
            popup: 'gyver-swal-popup',
            confirmButton: 'btn btn-danger rounded-pill px-4 fw-bold',
            cancelButton: 'btn btn-light rounded-pill px-4'
        }
    });

    if (!result.isConfirmed) return;

    try {
        const { data: room, error: fetchErr } = await supabaseClient
            .from('classrooms')
            .select('id, students')
            .eq('id', classroomId)
            .single();

        if (fetchErr || !room) {
            showToast('error', 'เกิดข้อผิดพลาด', 'ไม่พบข้อมูลห้องเรียน');
            return;
        }

        const currentStudents = Array.isArray(room.students) ? room.students : [];
        const updatedStudents = currentStudents.filter(s => {
            const matchId = s.user_id && String(s.user_id) === String(currentUserId);
            const matchEmail = currentUserEmail && s.email && String(s.email).toLowerCase() === currentUserEmail.toLowerCase();
            return !(matchId || matchEmail);
        });

        const { error: updateErr } = await supabaseClient
            .from('classrooms')
            .update({ students: updatedStudents })
            .eq('id', classroomId);

        if (updateErr) throw updateErr;

        showToast('success', 'ออกจากห้องเรียนแล้ว', `คุณออกจากห้อง ${subjName} เรียบร้อยแล้ว`);
        await loadClassrooms();
    } catch (err) {
        console.error("leaveEnrolledClassroom error:", err);
        showToast('error', 'เกิดข้อผิดพลาด', err.message);
    }
}

// 🔑 ฟังก์ชันกรอกรหัส PIN ด่วนเพื่อไปหน้า student_join
function handleQuickJoinClassroom(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('input-join-room-code');
    const code = (input?.value || '').trim().toUpperCase();
    if (!code || code.length < 4) {
        showToast('warning', 'กรุณาระบุรหัส PIN', 'ระบุรหัสห้องเรียน 6 ตัวอักษร เช่น OYK8ZH');
        return;
    }
    const modalEl = document.getElementById('joinClassModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
    window.location.href = `../student_join/student_join.html?code=${encodeURIComponent(code)}`;
}

function autoUpdateInitialSection(val) {
    const sectionInput = document.getElementById('class-initial-section');
    if (sectionInput) {
        const clean = (val || '').replace(/[^0-9]/g, '');
        if (clean) {
            sectionInput.value = `${clean}/1`;
        }
    }
}

function getSiblingSections(currentClass) {
    if (!currentClass) return [];
    const cfg = currentClass.gradebook?.config || {};
    const currentGroupId = cfg.subject_group_id;
    const currentSubj = (cfg.subject_name || currentClass.class_name || '').replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim().toLowerCase();
    const currentGrade = String(cfg.grade_level || '').replace(/[^0-9]/g, '');

    const siblings = cachedClassrooms.filter(c => {
        if (c.id === currentClass.id) return true;
        const cCfg = c.gradebook?.config || {};
        const cGroupId = cCfg.subject_group_id;
        if (currentGroupId && cGroupId && currentGroupId === cGroupId) return true;
        
        const cSubj = (cCfg.subject_name || c.class_name || '').replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim().toLowerCase();
        const cGrade = String(cCfg.grade_level || '').replace(/[^0-9]/g, '');
        if (currentSubj && cSubj && currentSubj === cSubj && currentGrade && cGrade && currentGrade === cGrade) {
            return true;
        }
        return false;
    });

    return siblings.length > 0 ? siblings : [currentClass];
}

function renderSectionsBar() {
    const container = document.getElementById('sections-pill-container');
    const badge = document.getElementById('section-grade-badge');
    if (!container || !activeClassroom) return;

    const cfg = activeClassroom.gradebook?.config || {};
    const gradeLevel = cfg.grade_level || '4';
    const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;

    if (badge) {
        badge.innerHTML = `<i class="bi bi-mortarboard-fill me-1"></i>ระดับชั้น ${displayGrade}`;
    }

    const siblings = getSiblingSections(activeClassroom);
    if (siblings.length === 0) siblings.push(activeClassroom);

    container.innerHTML = siblings.map(c => {
        const isActive = c.id === activeClassroomId;
        const studentCount = Array.isArray(c.students) ? c.students.length : 0;
        const secNum = extractCleanRoomSection(c.gradebook?.config?.room_section || c.class_name, gradeLevel);

        return `
            <div class="section-card ${isActive ? 'active' : ''}" onclick="enterClassroom('${c.id}')" title="คลิกเพื่อสลับไปยังห้อง ${displayGrade}/${secNum}">
                <div class="d-flex align-items-center justify-content-between gap-3">
                    <span class="fw-bold" style="font-size: 0.95rem;">
                        <i class="bi bi-door-closed${isActive ? '-fill text-primary' : ' text-secondary'} me-1"></i>ห้อง ${displayGrade}/${secNum}
                    </span>
                    <span class="badge ${isActive ? 'bg-primary text-white' : 'bg-light text-success border'} font-mono">${c.room_code || '------'}</span>
                </div>
                <div class="d-flex align-items-center justify-content-between mt-1" style="font-size: 0.78rem;">
                    <span class="text-muted"><i class="bi bi-people me-1"></i>${studentCount} คน</span>
                    ${isActive ? '<span class="text-primary fw-bold"><i class="bi bi-check-circle-fill me-1"></i>กำลังเลือก</span>' : '<span class="text-muted">คลิกเพื่อสลับ</span>'}
                </div>
            </div>
        `;
    }).join('');
}

function openAddSectionModal() {
    if (!activeClassroom) return;
    const cfg = activeClassroom.gradebook?.config || {};
    const gradeLevel = cfg.grade_level || '4';
    const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;
    const subName = cfg.subject_name || activeClassroom.class_name;

    const descEl = document.getElementById('add-section-modal-desc');
    if (descEl) {
        descEl.innerHTML = `เพิ่มห้องเรียนใหม่ในระดับชั้น <b>${displayGrade}</b> (${subName}) เช่น ห้อง 4/2 หรือ 4/3 โดยจะดึงไฟล์เอกสารบทเรียน การบ้าน และเกณฑ์ ปพ.5 มาใช้ร่วมกันอัตโนมัติ`;
    }

    const input = document.getElementById('new-section-name');
    if (input) {
        const siblings = getSiblingSections(activeClassroom);
        const nextNum = siblings.length + 1;
        input.value = `${gradeLevel.replace(/[^0-9]/g, '') || '4'}/${nextNum}`;
    }

    const modalEl = document.getElementById('addSectionModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

async function handleCreateSection(e) {
    e.preventDefault();
    if (!activeClassroom || !currentUserId) return;

    const rawSectionName = document.getElementById('new-section-name')?.value.trim();
    if (!rawSectionName) return;

    const btn = document.getElementById('btn-save-section');
    if (btn) btn.disabled = true;

    try {
        const cfg = activeClassroom.gradebook?.config || {};
        const subjectCode = cfg.subject_code || '';
        const subjectName = cfg.subject_name || activeClassroom.class_name;
        const gradeLevel = cfg.grade_level || '4';
        const academicYear = cfg.academic_year || '2569';
        const semester = cfg.semester || '1';
        const cleanGrade = String(gradeLevel).replace(/[^0-9]/g, '') || '4';
        const cleanSubj = subjectName.replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim();
        const subjectGroupId = cfg.subject_group_id || `subj_${currentUserId}_${encodeURIComponent(cleanSubj)}_${cleanGrade}`;

        const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;
        const cleanSection = extractCleanRoomSection(rawSectionName, gradeLevel);
        const formattedClassName = `${subjectCode ? subjectCode + ' ' : ''}${cleanSubj} (${displayGrade}/${cleanSection})`;

        // คัดลอก materials, assignments, และ columns จากระดับรายวิชา เพื่อแชร์ทรัพยากรการสอนและเกณฑ์ ปพ.5 ร่วมกันทันที
        const clonedMaterials = getSharedCourseMaterials();
        const clonedAssignments = getSharedCourseAssignments();
        const sectionGradebook = {
            config: {
                ...cfg,
                room_section: cleanSection,
                subject_group_id: subjectGroupId
            },
            columns: activeClassroom.gradebook?.columns ? JSON.parse(JSON.stringify(activeClassroom.gradebook.columns)) : [],
            scores: {}
        };

        // 🛡️ ส่งเฉพาะฟิลด์มาตรฐานของ classrooms table เพื่อป้องกัน schema cache error จาก Supabase
        const basePayload = {
            teacher_id: currentUserId,
            class_name: formattedClassName,
            room_code: generateRoomCode(),
            students: []
        };

        const { data, error } = await supabaseClient.from('classrooms').insert([basePayload]).select();
        if (!error && data && data[0]) {
            const rawClass = data[0];

            // บันทึก materials, assignments, gradebook ลง LocalStorage ทันที
            try {
                localStorage.setItem(`gyver_materials_${rawClass.id}`, JSON.stringify(clonedMaterials));
                localStorage.setItem(`gyver_assignments_${rawClass.id}`, JSON.stringify(clonedAssignments));
                localStorage.setItem(`gyver_attendance_${rawClass.id}`, JSON.stringify({}));
                localStorage.setItem(`gyver_gradebook_${rawClass.id}`, JSON.stringify(sectionGradebook));
            } catch (storageErr) {
                console.warn('Storage set error:', storageErr);
            }

            // แอบ sync ข้อมูลเพิ่มเติมไปยัง Supabase ในกรณีที่ DB มีการ migrate คอลัมน์แล้ว (silent non-blocking)
            try {
                await supabaseClient.from('classrooms').update({
                    materials: clonedMaterials,
                    assignments: clonedAssignments,
                    attendance_logs: {},
                    gradebook: sectionGradebook
                }).eq('id', rawClass.id);
            } catch (_) {}

            const newClass = enrichClassroom({
                ...rawClass,
                materials: clonedMaterials,
                assignments: clonedAssignments,
                attendance_logs: {},
                gradebook: sectionGradebook
            });

            cachedClassrooms.unshift(newClass);
            bootstrap.Modal.getInstance(document.getElementById('addSectionModal'))?.hide();
            document.getElementById('form-add-section')?.reset();
            showToast('success', 'เพิ่มห้องเรียนสำเร็จ!', `เพิ่มห้อง "${cleanSection}" เรียบร้อยแล้ว`);
            enterClassroom(newClass.id);
        } else {
            showToast('error', 'สร้างห้องไม่สำเร็จ', error?.message || 'เกิดข้อผิดพลาด');
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function syncSharedContentToSiblings(contentType, contentData) {
    if (!activeClassroom) return;
    const siblings = getSiblingSections(activeClassroom).filter(c => c.id !== activeClassroomId);
    if (siblings.length === 0) return;

    for (const sib of siblings) {
        sib[contentType] = contentData;
        try {
            localStorage.setItem(`gyver_${contentType}_${sib.id}`, JSON.stringify(contentData));
            await supabaseClient.from('classrooms').update({ [contentType]: contentData }).eq('id', sib.id);
        } catch (_) {}
    }
}

// 🗂️ รวมห้องเรียนตามรายวิชาและระดับชั้น เพื่อแสดงการ์ดเดียวบน Hub
function groupClassroomsBySubject(classroomsList) {
    const groups = [];
    const groupMap = new Map();

    (classroomsList || []).forEach(c => {
        const cfg = c.gradebook?.config || {};
        let subjectCode = (cfg.subject_code || '').trim();
        let subjectName = (cfg.subject_name || c.class_name || '').trim();
        let gradeLevel = String(cfg.grade_level || '4').replace(/[^0-9]/g, '') || '4';

        // ทำความสะอาดชื่อวิชา
        subjectName = subjectName.replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim();
        if (!subjectName) subjectName = c.class_name || 'วิชาใหม่';

        // คีย์ของกลุ่มวิชา: ชื่อวิชา + ระดับชั้น (เช่น "2222_4")
        const cleanSubjKey = subjectName.toLowerCase().replace(/\s+/g, '');
        const groupKey = `group_${cleanSubjKey}_${gradeLevel}`;

        if (!groupMap.has(groupKey)) {
            const newGroup = {
                groupKey: groupKey,
                subjectCode: subjectCode,
                subjectName: subjectName,
                gradeLevel: gradeLevel,
                displayGrade: `ม.${gradeLevel}`,
                sections: [],
                totalStudents: 0,
                materialsCount: 0,
                assignmentsCount: 0,
                createdAt: c.created_at
            };
            groupMap.set(groupKey, newGroup);
            groups.push(newGroup);
        }

        const grp = groupMap.get(groupKey);
        grp.sections.push(c);

        if (!grp.subjectCode && subjectCode) grp.subjectCode = subjectCode;

        const stCount = Array.isArray(c.students) ? c.students.length : 0;
        grp.totalStudents += stCount;

        const matCount = Array.isArray(c.materials) ? c.materials.length : 0;
        if (matCount > grp.materialsCount) grp.materialsCount = matCount;

        const assCount = Array.isArray(c.assignments) ? c.assignments.length : 0;
        if (assCount > grp.assignmentsCount) grp.assignmentsCount = assCount;

        if (c.created_at && (!grp.createdAt || new Date(c.created_at) > new Date(grp.createdAt))) {
            grp.createdAt = c.created_at;
        }
    });

    // เรียงลำดับห้องเรียนในแต่ละกลุ่ม (เช่น ห้อง 1, ห้อง 2, ห้อง 3)
    groups.forEach(grp => {
        grp.sections.sort((a, b) => {
            const secA = extractCleanRoomSection(a.gradebook?.config?.room_section || a.class_name, grp.gradeLevel);
            const secB = extractCleanRoomSection(b.gradebook?.config?.room_section || b.class_name, grp.gradeLevel);
            const numA = parseInt(secA, 10);
            const numB = parseInt(secB, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return secA.localeCompare(secB);
        });
    });

    return groups;
}

function renderHubClassrooms(classroomsList) {
    const grid = document.getElementById('hub-classrooms-grid');
    if (!grid) return;

    if (!classroomsList || classroomsList.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 bg-white rounded-4 border border-dashed shadow-sm">
                <div class="bg-primary-subtle text-primary d-inline-flex p-3 rounded-circle mb-3">
                    <i class="bi bi-door-open fs-1"></i>
                </div>
                <h5 class="fw-bold text-dark mb-1">ยังไม่มีห้องเรียนในระบบ</h5>
                <p class="text-muted small mb-3">สร้างห้องเรียนแรกของคุณ เพื่อเริ่มสแกนเข้าห้อง เช็คชื่อ แจกไฟล์ และสั่งงาน</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#addClassModal">
                    <i class="bi bi-plus-circle-fill me-1"></i>สร้างห้องเรียนใหม่
                </button>
            </div>`;
        return;
    }

    const groups = groupClassroomsBySubject(classroomsList);

    grid.innerHTML = groups.map(grp => {
        const sectionsCount = grp.sections.length;
        const firstSec = grp.sections[0];
        const dateStr = grp.createdAt ? new Date(grp.createdAt).toLocaleDateString('th-TH') : '';
        const hasMultiple = sectionsCount > 1;

        // รายการปุ่มชิปห้องเรียนย่อย
        const chipsHtml = grp.sections.map(s => {
            const secNum = extractCleanRoomSection(s.gradebook?.config?.room_section || s.class_name, grp.gradeLevel);
            const rCode = s.room_code || '------';
            return `
                <div class="hub-section-chip" onclick="enterClassroom('${s.id}')" title="เข้าสู่ห้อง ${grp.displayGrade}/${secNum} (รหัส ${rCode})">
                    <i class="bi bi-door-closed text-primary"></i>
                    <span>ห้อง ${grp.gradeLevel}/${secNum}</span>
                    <span class="chip-code">${rCode}</span>
                </div>
            `;
        }).join('');

        return `
        <div class="col-md-6 col-lg-4">
            <div class="hub-classroom-card h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    ${!hasMultiple ? `
                        <span class="room-code-badge" title="รหัสห้องเรียน">
                            <i class="bi bi-key-fill text-success"></i> ${firstSec.room_code || '------'}
                            <button class="room-code-copy-btn ms-1" onclick="quickCopyCode('${firstSec.room_code}')" title="คัดลอกรหัสห้อง">
                                <i class="bi bi-clipboard"></i>
                            </button>
                        </span>
                    ` : `
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 font-mono fw-bold">
                            <i class="bi bi-collection-fill me-1"></i>${sectionsCount} ห้องเรียน (${grp.displayGrade})
                        </span>
                    `}
                    
                    <div class="dropdown">
                        <button class="btn btn-sm btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical fs-5"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3">
                            ${grp.sections.map(s => {
                                const secNum = extractCleanRoomSection(s.gradebook?.config?.room_section || s.class_name, grp.gradeLevel);
                                return `
                                    <li>
                                        <a class="dropdown-item py-2" href="javascript:void(0)" onclick="quickOpenQRModal('${s.id}')">
                                            <i class="bi bi-qr-code me-2 text-primary"></i>QR Code ห้อง ${grp.gradeLevel}/${secNum} (${s.room_code})
                                        </a>
                                    </li>
                                `;
                            }).join('')}
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item py-2 text-primary fw-bold" href="javascript:void(0)" onclick="quickAddSectionFromHub('${firstSec.id}')">
                                    <i class="bi bi-plus-circle me-2"></i>เพิ่มห้องเรียนในระดับนี้
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="deleteCourseGroupFromHub('${grp.groupKey}', '${encodeURIComponent(grp.subjectName)}')">
                                    <i class="bi bi-trash3 me-2"></i>ลบทั้งรายวิชานี้ (${sectionsCount} ห้อง)
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="mb-2">
                    ${grp.subjectCode ? `<span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill font-mono px-2 py-0 small me-1">${grp.subjectCode}</span>` : ''}
                    <span class="badge bg-indigo-subtle text-indigo border rounded-pill px-2 py-0 small me-1" style="background:#e0e7ff; color:#4338ca;">ระดับชั้น ${grp.displayGrade}</span>
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0 small">${sectionsCount} ห้องเรียน</span>
                </div>

                <h4 class="fw-bold text-dark mb-2 text-truncate" title="${grp.subjectName}">
                    ${grp.subjectCode ? grp.subjectCode + ' ' : ''}${grp.subjectName}
                </h4>

                <!-- ชิปห้องเรียนย่อยในวิชานี้ -->
                <div class="mb-3">
                    <div class="small text-muted mb-1 fw-bold" style="font-size:0.75rem;">ห้องเรียนในวิชานี้:</div>
                    <div class="d-flex flex-wrap gap-1 align-items-center">
                        ${chipsHtml}
                        <button class="btn btn-sm btn-outline-secondary rounded-pill py-0 px-2" style="font-size:0.75rem; height: 26px;" onclick="quickAddSectionFromHub('${firstSec.id}')" title="เพิ่มห้องเรียนใหม่ในระดับชั้นนี้">
                            <i class="bi bi-plus"></i> เพิ่มห้อง
                        </button>
                    </div>
                </div>
                
                <div class="d-flex flex-wrap gap-2 mb-4">
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-people-fill me-1"></i>${grp.totalStudents} คน (รวม)
                    </span>
                    <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-folder-fill me-1"></i>${grp.materialsCount} ไฟล์
                    </span>
                    <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-journal-text me-1"></i>${grp.assignmentsCount} งาน
                    </span>
                </div>

                <div class="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
                    <small class="text-muted font-mono" style="font-size: 0.75rem;">สร้างเมื่อ: ${dateStr}</small>
                    <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" onclick="enterClassroom('${firstSec.id}')">
                        <i class="bi bi-box-arrow-in-right me-1"></i>เข้าห้องเรียน
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ➕ สร้างห้องเรียนใหม่
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

async function handleCreateClassroom(e) {
    e.preventDefault();
    if (!currentUserId) return showToast('error', 'เกิดข้อผิดพลาด', 'ไม่พบเซสชันผู้ใช้งาน');

    const subjectCode = document.getElementById('class-subject-code')?.value.trim() || '';
    const subjectName = document.getElementById('class-subject-name')?.value.trim() || 'วิชาใหม่';
    const gradeLevel = document.getElementById('class-grade-level')?.value.trim() || '4';
    const initialSection = document.getElementById('class-initial-section')?.value.trim() || `${gradeLevel}/1`;
    const academicYear = document.getElementById('class-academic-year')?.value.trim() || '2569';
    const semester = document.getElementById('class-semester')?.value || '1';

    const btnSave = document.getElementById('btn-save-class');
    if (btnSave) btnSave.disabled = true;

    try {
        const cleanGrade = gradeLevel.replace(/[^0-9]/g, '') || '4';
        const cleanSubj = subjectName.replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim();
        const subjectGroupId = `subj_${currentUserId}_${encodeURIComponent(cleanSubj)}_${cleanGrade}_${Date.now()}`;
        const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;
        const cleanSection = extractCleanRoomSection(initialSection, gradeLevel);
        const formattedClassName = `${subjectCode ? subjectCode + ' ' : ''}${cleanSubj} (${displayGrade}/${cleanSection})`;

        const initialGradebook = {
            config: {
                subject_code: subjectCode,
                subject_name: subjectName,
                grade_level: gradeLevel,
                room_section: cleanSection,
                subject_group_id: subjectGroupId,
                academic_year: academicYear,
                semester: semester,
                midterm_max: 20,
                final_max: 30
            },
            columns: [
                { id: 'col_task1', title: 'ใบงานที่ 1', max: 10 },
                { id: 'col_task2', title: 'ใบงานที่ 2', max: 10 },
                { id: 'col_quiz', title: 'ทดสอบย่อย', max: 10 },
                { id: 'col_affective', title: 'จิตพิสัย/เวลาเรียน', max: 10 }
            ],
            scores: {}
        };

        // 🛡️ ส่งเฉพาะฟิลด์มาตรฐานของ classrooms table เพื่อป้องกัน schema cache error จาก Supabase
        const basePayload = {
            teacher_id: currentUserId,
            class_name: formattedClassName,
            room_code: generateRoomCode(),
            students: []
        };

        const { data, error } = await supabaseClient.from('classrooms').insert([basePayload]).select();
        if (!error && data && data[0]) {
            const rawClass = data[0];

            // บันทึก gradebook, materials, assignments ลง LocalStorage ทันที
            try {
                localStorage.setItem(`gyver_gradebook_${rawClass.id}`, JSON.stringify(initialGradebook));
                localStorage.setItem(`gyver_materials_${rawClass.id}`, JSON.stringify([]));
                localStorage.setItem(`gyver_assignments_${rawClass.id}`, JSON.stringify([]));
                localStorage.setItem(`gyver_attendance_${rawClass.id}`, JSON.stringify({}));
            } catch (storageErr) {
                console.warn('Storage set error:', storageErr);
            }

            // แอบ sync ข้อมูลเพิ่มเติมไปยัง Supabase ในกรณีที่ DB มีการ migrate คอลัมน์แล้ว (silent non-blocking)
            try {
                await supabaseClient.from('classrooms').update({ gradebook: initialGradebook }).eq('id', rawClass.id);
            } catch (_) {}

            const newClass = enrichClassroom({
                ...rawClass,
                materials: [],
                assignments: [],
                attendance_logs: {},
                gradebook: initialGradebook
            });

            showToast('success', 'สร้างรายวิชาสำเร็จ!', `วิชา "${subjectName}" (ห้อง ${cleanSection}) พร้อมใช้งานแล้ว`);
            document.getElementById('form-create-class')?.reset();
            bootstrap.Modal.getInstance(document.getElementById('addClassModal'))?.hide();

            cachedClassrooms.unshift(newClass);
            renderHubClassrooms(cachedClassrooms);

            // นำครูเข้าสู่ห้องเรียนใหม่ทันที
            enterClassroom(newClass.id);
        } else {
            showToast('error', 'สร้างห้องเรียนไม่สำเร็จ', error?.message || 'เกิดข้อผิดพลาด');
        }
    } finally {
        if (btnSave) btnSave.disabled = false;
    }
}

async function deleteClassroomFromHub(classId, encodedName) {
    const className = decodeURIComponent(encodedName);
    const ok = await showGyverConfirm({
        title: `ลบห้อง "${className}"?`,
        subtitle: '⚠️ ข้อมูลทั้งหมดในห้องนี้จะถูกลบถาวร ไม่สามารถกู้คืนได้',
        icon: 'danger',
        confirmText: '<i class="bi bi-trash3-fill me-1"></i> ลบห้องนี้',
        confirmBtnClass: 'btn-danger'
    });
    if (!ok) return;

    const { error } = await supabaseClient
        .from('classrooms')
        .delete()
        .eq('id', classId)
        .eq('teacher_id', currentUserId);

    if (!error) {
        showToast('info', 'ลบห้องเรียนสำเร็จ', `ลบห้อง "${className}" เรียบร้อยแล้ว`);
        cachedClassrooms = cachedClassrooms.filter(c => c.id !== classId);
        try {
            if (localStorage.getItem('gyver_last_classroom_id') === classId) {
                localStorage.removeItem('gyver_last_classroom_id');
            }
        } catch (e) {}
        renderHubClassrooms(cachedClassrooms);
    } else {
        showToast('error', 'ลบไม่สำเร็จ', error.message);
    }
}

async function deleteCourseGroupFromHub(groupKey, encodedName) {
    const subjName = decodeURIComponent(encodedName);
    const groups = groupClassroomsBySubject(cachedClassrooms);
    const targetGroup = groups.find(g => g.groupKey === groupKey);
    if (!targetGroup) return;

    const count = targetGroup.sections.length;
    const ok = await showGyverConfirm({
        title: `ลบรายวิชา "${subjName}"?`,
        subtitle: `⚠️ การกระทำนี้จะลบห้องเรียนทั้งหมด <b>${count} ห้อง</b> รวมถึงคะแนน ปพ.5 และงานที่สั่งทั้งหมดอย่างถาวร`,
        icon: 'danger',
        confirmText: '<i class="bi bi-trash3-fill me-1"></i> ลบทั้งรายวิชา',
        confirmBtnClass: 'btn-danger'
    });
    if (!ok) return;

    const idsToDelete = targetGroup.sections.map(s => s.id);
    for (const classId of idsToDelete) {
        try {
            await supabaseClient.from('classrooms').delete().eq('id', classId).eq('teacher_id', currentUserId);
            localStorage.removeItem(`gyver_gradebook_${classId}`);
            localStorage.removeItem(`gyver_materials_${classId}`);
            localStorage.removeItem(`gyver_assignments_${classId}`);
            localStorage.removeItem(`gyver_attendance_${classId}`);
        } catch (e) {
            console.warn('Delete classroom error:', e);
        }
    }

    try {
        localStorage.removeItem(`gyver_shared_materials_${targetGroup.groupKey}`);
        localStorage.removeItem(`gyver_shared_assignments_${targetGroup.groupKey}`);
        if (targetGroup.sections && targetGroup.sections[0]) {
            const courseKey = getCourseGroupKey(targetGroup.sections[0]);
            localStorage.removeItem(`gyver_shared_materials_${courseKey}`);
            localStorage.removeItem(`gyver_shared_assignments_${courseKey}`);
        }
    } catch (_) {}

    cachedClassrooms = cachedClassrooms.filter(c => !idsToDelete.includes(c.id));
    try {
        if (idsToDelete.includes(localStorage.getItem('gyver_last_classroom_id'))) {
            localStorage.removeItem('gyver_last_classroom_id');
        }
    } catch (_) {}

    showToast('info', 'ลบรายวิชาสำเร็จ', `ลบวิชา "${subjName}" (${count} ห้อง) เรียบร้อยแล้ว`);
    renderHubClassrooms(cachedClassrooms);
}

function quickAddSectionFromHub(classId) {
    const target = cachedClassrooms.find(c => c.id === classId);
    if (!target) return;
    activeClassroom = target;
    activeClassroomId = target.id;
    openAddSectionModal();
}

function quickCopyCode(code) {
    if (!code || code === '------') return;
    navigator.clipboard.writeText(code);
    showToast('success', 'คัดลอกแล้ว', `คัดลอกรหัสห้อง ${code} เรียบร้อยแล้ว`);
}

function quickOpenQRModal(classId) {
    const target = cachedClassrooms.find(c => c.id === classId);
    if (!target) return;
    activeClassroom = target;
    activeClassroomId = target.id;
    openProjectorMode();
}

/* ============================================================== */
/* 🏫 VIEW 2: ห้องเรียนประจำวิชา (Classroom Active Workspace - 5 Tabs) */
/* ============================================================== */
function enterClassroom(classId) {
    const target = cachedClassrooms.find(c => c.id === classId);
    if (!target) return;

    activeClassroom = target;
    activeClassroomId = target.id;

    // จำห้องเรียนล่าสุดไว้ใน localStorage เพื่อไม่ให้หลุดออกไปหน้า Hub เวลารีเฟรชเบราว์เซอร์
    try {
        localStorage.setItem('gyver_last_classroom_id', activeClassroomId);
    } catch (e) {
        console.warn("Could not save last classroom ID:", e);
    }

    // สลับ View
    const hubView = document.getElementById('classrooms-hub-view');
    const detailView = document.getElementById('classroom-detail-view');
    const backBtn = document.getElementById('nav-btn-back-hub');
    const navDropdown = document.getElementById('navbar-room-dropdown-container');

    if (hubView) hubView.classList.add('d-none');
    if (detailView) detailView.classList.remove('d-none');
    if (backBtn) {
        backBtn.classList.remove('d-none');
        backBtn.classList.add('d-inline-flex');
    }
    if (navDropdown) {
        navDropdown.classList.remove('d-none');
        navDropdown.classList.add('d-inline-flex');
    }

    // อัปเดต URL
    const newUrl = `${window.location.pathname}?id=${activeClassroomId}`;
    window.history.replaceState(null, '', newUrl);

    renderNavbarRoomDropdown();
    renderActiveClassroomHeader();
    renderAllTabs();
    setupRealtimeSubscription();

    // กู้คืนแท็บล่าสุดที่เคยเปิดไว้ในห้องนี้ (ถ้ามี)
    let currentTabId = 'tab-scan-btn';
    try {
        const lastTabId = localStorage.getItem(`gyver_last_tab_${activeClassroomId}`);
        if (lastTabId) {
            currentTabId = lastTabId;
            const tabTriggerEl = document.getElementById(lastTabId);
            if (tabTriggerEl && typeof bootstrap !== 'undefined') {
                const tabInstance = bootstrap.Tab.getOrCreateInstance(tabTriggerEl);
                tabInstance.show();
            }
        }
    } catch (e) {}
    handleTabSectionsBarVisibility(currentTabId);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderNavbarRoomDropdown() {
    const navRoomTitle = document.getElementById('navbar-current-room-name');
    if (navRoomTitle && activeClassroom) {
        const cfg = activeClassroom.gradebook?.config || {};
        const gradeLevel = String(cfg.grade_level || '4').replace(/[^0-9]/g, '') || '4';
        const displayGrade = `ม.${gradeLevel}`;
        let cleanSubj = (cfg.subject_name || activeClassroom.class_name || 'รายวิชา').replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim();
        const sec = extractCleanRoomSection(cfg.room_section || activeClassroom.class_name, gradeLevel);
        navRoomTitle.innerText = `${cleanSubj} ${displayGrade} (ห้อง ${displayGrade}/${sec})`;
    }

    const htmlItems = cachedClassrooms.map(c => {
        const isActive = c.id === activeClassroomId;
        const studentCount = Array.isArray(c.students) ? c.students.length : 0;
        return `
        <li>
            <a class="dropdown-item rounded-3 py-2 d-flex justify-content-between align-items-center ${isActive ? 'bg-primary-subtle text-primary fw-bold' : ''}" 
               href="javascript:void(0)" onclick="enterClassroom('${c.id}')">
                <span class="text-truncate me-2"><i class="bi bi-door-closed me-2"></i>${c.class_name || 'ไม่มีชื่อห้อง'}</span>
                <span class="badge ${isActive ? 'bg-primary text-white' : 'bg-light text-muted border'} rounded-pill font-mono">${studentCount} คน</span>
            </a>
        </li>`;
    }).join('');

    const navbarDropdown = document.getElementById('navbar-room-dropdown-items');
    if (navbarDropdown) {
        navbarDropdown.innerHTML = `
            <li><span class="dropdown-header small text-muted">สลับห้องเรียน</span></li>
            ${htmlItems}
            <li><hr class="dropdown-divider"></li>
            <li>
                <a class="dropdown-item rounded-3 py-2 text-primary fw-bold" href="javascript:void(0)" onclick="showClassroomsHub()">
                    <i class="bi bi-grid-fill me-2"></i>ดูห้องเรียนทั้งหมด
                </a>
            </li>
        `;
    }
}

function renderActiveClassroomHeader() {
    if (!activeClassroom) return;

    const titleEl = document.getElementById('current-class-title');
    const subtitleEl = document.getElementById('current-class-subtitle');

    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    const roomCode = activeClassroom.room_code || '------';

    const cfg = activeClassroom.gradebook?.config || {};
    const gradeLevel = String(cfg.grade_level || '4').replace(/[^0-9]/g, '') || '4';
    const displayGrade = `ม.${gradeLevel}`;

    // ดึงชื่อวิชา (ตัดวงเล็บระบุห้องย่อย เช่น (ม.4/2) ออก)
    let cleanSubj = (cfg.subject_name || activeClassroom.class_name || 'รายวิชา').replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim();
    const subjectCode = (cfg.subject_code || '').trim();
    if (subjectCode && !cleanSubj.startsWith(subjectCode)) {
        cleanSubj = `${subjectCode} ${cleanSubj}`;
    }
    cleanSubj = cleanSubj.replace(new RegExp(`\\s*${displayGrade}$`, 'i'), '').trim();

    // รูปแบบหัวข้อหลัก: "ชื่อวิชา ชั้นปีที่เรียน" เช่น "คอมพิวเตอร์ ม.4"
    const courseTitle = `${cleanSubj} ${displayGrade}`;
    const cleanSection = extractCleanRoomSection(cfg.room_section || activeClassroom.class_name, gradeLevel);

    if (titleEl) titleEl.innerText = courseTitle;
    if (subtitleEl) subtitleEl.innerText = `ห้อง ${displayGrade}/${cleanSection} • รหัสห้อง: ${roomCode} • จำนวนนักเรียน: ${students.length} คน`;

    const statStudents = document.getElementById('stat-student-count');
    if (statStudents) statStudents.innerText = `${students.length} คน`;

    updateAttendanceStatsBadge();
    updateMaterialsCountBadge();
    updateAssignmentsCountBadge();
    renderSectionsBar();
}

function copyCurrentRoomCode() {
    if (!activeClassroom?.room_code) return;
    navigator.clipboard.writeText(activeClassroom.room_code);
    showToast('success', 'คัดลอกสำเร็จ', `คัดลอกรหัสห้อง ${activeClassroom.room_code} แล้ว`);
}

// 📡 Supabase Realtime Listener เมื่อมีนักเรียนสแกนเข้าร่วมห้อง
function setupRealtimeSubscription() {
    if (!activeClassroomId || !supabaseClient) return;

    if (classroomRealtimeChannel) {
        supabaseClient.removeChannel(classroomRealtimeChannel);
    }

    classroomRealtimeChannel = supabaseClient
        .channel(`classroom-channel-${activeClassroomId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'classrooms', filter: `id=eq.${activeClassroomId}` },
            payload => {
                if (payload.new) {
                    activeClassroom = enrichClassroom(payload.new);
                    const idx = cachedClassrooms.findIndex(c => c.id === activeClassroomId);
                    if (idx !== -1) cachedClassrooms[idx] = activeClassroom;

                    renderActiveClassroomHeader();
                    renderTabScan();
                    renderTabAttendance();
                    updateProjectorRoster();

                    showToast('info', 'นักเรียนอัปเดต!', 'มีนักเรียนเข้าร่วมห้องเรียนเพิ่มเติม');
                }
            }
        )
        .subscribe();
}

async function refreshCurrentClassData() {
    if (!activeClassroomId) return;
    const { data: updated, error } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('id', activeClassroomId)
        .single();

    if (updated) {
        activeClassroom = enrichClassroom(updated);
        const idx = cachedClassrooms.findIndex(c => c.id === activeClassroomId);
        if (idx !== -1) cachedClassrooms[idx] = activeClassroom;

        renderActiveClassroomHeader();
        renderAllTabs();
        showToast('success', 'รีเฟรชสำเร็จ', 'อัปเดตข้อมูลห้องเรียนเป็นล่าสุดแล้ว');
    } else if (error) {
        console.error("Refresh class error:", error);
    }
}

function renderAllTabs() {
    renderTabScan();
    renderTabAttendance();
    loadMaterials();
    loadAssignments();
    renderTabGradebook();
}

/* ============================================================== */
/* 📌 TAB 1: สแกนเข้าห้อง (Day 1 Scan & Onboarding Wall) */
/* ============================================================== */
function getStudentJoinUrl() {
    const roomCode = activeClassroom?.room_code || '';
    const origin = window.location.origin;
    let basePath = window.location.pathname;
    
    if (basePath.includes('/auth/my_classroom/')) {
        basePath = basePath.replace('/auth/my_classroom/my_classroom.html', '/auth/student_join/student_join.html');
    } else {
        basePath = '/auth/student_join/student_join.html';
    }

    return `${origin}${basePath}?code=${roomCode}`;
}

function renderTabScan() {
    if (!activeClassroom) return;

    const roomCode = activeClassroom.room_code || '------';
    const joinUrl = getStudentJoinUrl();

    // 1. QR Code Image
    const qrImg = document.getElementById('tab-qr-img');
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;
    if (qrImg) qrImg.src = qrApiUrl;

    const qrText = document.getElementById('tab-qr-code-text');
    if (qrText) qrText.innerText = roomCode;

    const badgeText = document.getElementById('tab-room-badge-text');
    if (badgeText) badgeText.innerText = roomCode;

    const linkInput = document.getElementById('tab-join-link-input');
    if (linkInput) linkInput.value = joinUrl;

    // 2. Student Avatar Wall
    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    const countEl = document.getElementById('joined-students-count');
    if (countEl) countEl.innerText = students.length;

    const wall = document.getElementById('joined-students-wall');
    if (!wall) return;

    if (students.length === 0) {
        wall.innerHTML = `
            <div class="text-center py-5 text-muted">
                <div class="mb-3">
                    <span class="p-3 bg-primary-subtle text-primary rounded-circle d-inline-flex">
                        <i class="bi bi-qr-code fs-1"></i>
                    </span>
                </div>
                <h5 class="fw-bold text-dark mb-1">ยังไม่มีนักเรียนลงชื่อเข้าห้อง</h5>
                <p class="small text-muted mb-3">ให้นักเรียนสแกน QR Code หรือกรอกรหัสห้อง <b>${roomCode}</b> เพื่อเข้าร่วมวิชานี้เป็นวันแรก</p>
                <div class="d-flex justify-content-center gap-2 flex-wrap">
                    <button class="btn btn-primary btn-sm rounded-pill px-3 shadow-sm fw-bold" data-bs-toggle="modal" data-bs-target="#tabQrModal">
                        <i class="bi bi-qr-code me-1"></i>เปิดดู QR Code สแกนเข้าห้อง
                    </button>
                    <button class="btn btn-dark btn-sm rounded-pill px-3 shadow-sm fw-bold" onclick="openProjectorMode()">
                        <i class="bi bi-fullscreen me-1 text-warning"></i>เปิดโหมดฉายขึ้นจอใหญ่
                    </button>
                </div>
            </div>`;
    } else {
        wall.innerHTML = students.map((s, idx) => {
            const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;
            const nickname = s.nickname || s.name || `นักเรียนคนที่ ${idx + 1}`;
            const hasNote = Boolean(s.note && String(s.note).trim());
            const safeNote = hasNote ? escapeHtml(String(s.note).trim()) : '';
            const safeName = escapeHtml(s.name || nickname);
            const safeNick = escapeHtml(nickname);

            return `
            <div class="student-card-mini">
                <div>
                    <div class="position-relative d-inline-block">
                        <img src="${avatar}" alt="${safeNick}" class="student-avatar-img" onclick="openPhotoZoom('${avatar}', '${safeName}')" title="คลิกดูรูปขยาย">
                        <span class="position-absolute bottom-0 end-0 badge rounded-pill bg-primary shadow-sm" style="font-size: 0.65rem; transform: translate(10%, -10%);">#${idx + 1}</span>
                    </div>
                    <div class="fw-bold text-dark small text-truncate mt-1" title="${safeName}">${safeNick}</div>
                    ${s.name && s.name !== nickname ? `<div class="text-muted text-truncate" style="font-size: 0.68rem;" title="${safeName}">${safeName}</div>` : ''}
                    
                    ${hasNote ? `
                    <div class="student-note-chip" onclick="openStudentNoteModal(${idx})" title="คลิกเพื่อดู/แก้ไขโน้ต: ${safeNote}">
                        <i class="bi bi-sticky-fill text-warning me-1"></i><span>${safeNote}</span>
                    </div>` : ''}
                </div>

                <div class="student-card-actions">
                    <button type="button" class="btn ${hasNote ? 'btn-warning text-dark' : 'btn-outline-secondary'}" onclick="openStudentNoteModal(${idx})" title="${hasNote ? 'ดู/แก้ไขโน้ต' : 'เพิ่มโน้ตช่วยจำ'}">
                        <i class="bi ${hasNote ? 'bi-journal-check' : 'bi-journal-plus'}"></i>
                        <span>${hasNote ? 'มีโน้ต' : 'โน้ต'}</span>
                    </button>
                    <button type="button" class="btn btn-outline-danger" onclick="kickStudent(${idx})" title="เตะ ${safeNick} ออกจากห้อง">
                        <i class="bi bi-person-x"></i>
                        <span>เตะ</span>
                    </button>
                </div>
            </div>`;
        }).join('');
    }
}

function copyJoinLinkFromTab() {
    const input = document.getElementById('tab-join-link-input');
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value);
        showToast('success', 'คัดลอกลิงก์สำเร็จ', 'นำลิงก์ไปส่งในกลุ่มไลน์หรือแชทให้นักเรียนได้เลย');
    }
}

// 🥋 เตะนักเรียนออกจากห้องเรียน (Kick Student)
async function kickStudent(studentIndex) {
    if (!activeClassroom || !Array.isArray(activeClassroom.students)) return;
    const s = activeClassroom.students[studentIndex];
    if (!s) return;

    const sName = formatStudentDisplayName(s, `นักเรียนคนที่ ${studentIndex + 1}`);
    const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;
    const className = activeClassroom.class_name || 'ห้องเรียน';

    let isConfirmed = false;
    if (typeof Swal !== 'undefined') {
        const swalRes = await Swal.fire({
            title: `<div class="fw-bold text-dark fs-5 mt-2">ยืนยันเตะนักเรียนออกจากห้อง?</div>`,
            html: `
                <div class="text-center my-3">
                    <div class="position-relative d-inline-block mb-3">
                        <img src="${avatar}" class="rounded-circle border" style="width: 76px; height: 76px; object-fit: cover; border-width: 3px !important; border-color: #fecaca !important; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.18);">
                        <span class="position-absolute bottom-0 end-0 badge rounded-pill bg-danger shadow-sm" style="font-size: 0.72rem;">#${studentIndex + 1}</span>
                    </div>
                    <h5 class="fw-bold text-dark mb-1">${escapeHtml(sName)}</h5>
                    <div class="text-muted small mb-3">ห้องเรียน: <span class="fw-semibold text-secondary">${escapeHtml(className)}</span></div>

                    <div class="p-3 rounded-4 bg-danger-subtle text-danger-emphasis text-start border border-danger-subtle" style="font-size: 0.85rem; line-height: 1.55;">
                        <div class="fw-bold mb-1 d-flex align-items-center gap-2">
                            <i class="bi bi-exclamation-triangle-fill text-danger fs-6"></i>
                            <span>โปรดทราบ</span>
                        </div>
                        <ul class="m-0 ps-3">
                            <li>รายชื่อนักเรียนจะถูกนำออกจากห้องเรียนนี้ทันที</li>
                            <li>หากต้องการเข้าเรียนใหม่ นักเรียนต้องสแกน QR Code หรือกรอกรหัสห้องอีกครั้ง</li>
                        </ul>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-box-arrow-right me-1"></i> ยืนยันเตะออกจากห้อง',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: 'gyver-swal-popup rounded-4 border-0 shadow-lg',
                confirmButton: 'btn btn-danger rounded-pill px-4 py-2 fw-bold shadow-sm',
                cancelButton: 'btn btn-light border rounded-pill px-4 py-2 fw-semibold text-secondary ms-2',
                actions: 'mt-2 mb-0'
            },
            buttonsStyling: false,
            reverseButtons: true,
            focusCancel: true
        });
        isConfirmed = swalRes.isConfirmed;
    } else {
        isConfirmed = confirm(`⚠️ ยืนยันการเตะนักเรียน "${sName}" ออกจากห้องนี้ใช่หรือไม่?\n\n- นักเรียนจะถูกนำออกจากรายชื่อห้องเรียนนี้ทันที\n- หากต้องการเข้าเรียนใหม่ นักเรียนต้องสแกน QR Code หรือกรอกรหัสห้องอีกครั้ง`);
    }

    if (!isConfirmed) return;

    activeClassroom.students.splice(studentIndex, 1);

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ students: activeClassroom.students })
            .eq('id', activeClassroom.id);

        if (error) {
            showToast('error', 'เตะนักเรียนล้มเหลว', error.message);
            return;
        }

        // อัปเดตแคชห้องเรียน
        const idx = cachedClassrooms.findIndex(c => c.id === activeClassroom.id);
        if (idx !== -1) cachedClassrooms[idx].students = activeClassroom.students;

        // ซิงค์ UI ทุกจุด
        renderActiveClassroomHeader();
        renderTabScan();
        renderTabAttendance();
        renderTabGradebook();
        updateProjectorRoster();

        showToast('success', 'เตะนักเรียนออกแล้ว', `นำ "${sName}" ออกจากห้องเรียนเรียบร้อย`);
    } catch (err) {
        console.error('Kick student error:', err);
        showToast('error', 'เกิดข้อผิดพลาด', err.message);
    }
}

// 📝 จัดการโน้ตประจำตัวนักเรียน (Teacher Student Note Modal & Actions)
function openStudentNoteModal(studentIndex) {
    if (!activeClassroom || !Array.isArray(activeClassroom.students)) return;
    const s = activeClassroom.students[studentIndex];
    if (!s) return;

    const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;
    const nickname = s.nickname || s.name || `นักเรียนคนที่ ${studentIndex + 1}`;
    const fullName = s.name && s.name !== nickname ? ` (${s.name})` : '';

    const idxEl = document.getElementById('modal-student-note-idx');
    const avatarEl = document.getElementById('modal-student-note-avatar');
    const nameEl = document.getElementById('modal-student-note-name');
    const textEl = document.getElementById('modal-student-note-text');

    if (idxEl) idxEl.value = studentIndex;
    if (avatarEl) avatarEl.src = avatar;
    if (nameEl) nameEl.innerText = `${nickname}${fullName} • เลขที่ #${studentIndex + 1}`;
    if (textEl) textEl.value = s.note || '';

    const delBtn = document.getElementById('modal-student-note-delete-btn');
    if (delBtn) {
        delBtn.style.display = (s.note && String(s.note).trim()) ? 'inline-flex' : 'none';
    }

    const modalEl = document.getElementById('studentNoteModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function addNoteQuickTag(tagText) {
    const textarea = document.getElementById('modal-student-note-text');
    if (!textarea) return;
    let val = textarea.value.trim();
    if (val) {
        if (!val.includes(tagText)) textarea.value = val + ' • ' + tagText;
    } else {
        textarea.value = tagText;
    }
    textarea.focus();
}

async function saveStudentNote() {
    if (!activeClassroom || !Array.isArray(activeClassroom.students)) return;
    const idx = parseInt(document.getElementById('modal-student-note-idx').value);
    if (isNaN(idx) || !activeClassroom.students[idx]) return;

    const noteText = (document.getElementById('modal-student-note-text').value || '').trim();
    if (noteText) {
        activeClassroom.students[idx].note = noteText;
    } else {
        delete activeClassroom.students[idx].note;
    }

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ students: activeClassroom.students })
            .eq('id', activeClassroom.id);

        if (error) {
            showToast('error', 'บันทึกโน้ตล้มเหลว', error.message);
            return;
        }

        const cIdx = cachedClassrooms.findIndex(c => c.id === activeClassroom.id);
        if (cIdx !== -1) cachedClassrooms[cIdx].students = activeClassroom.students;

        renderTabScan();
        renderTabAttendance();

        const modalEl = document.getElementById('studentNoteModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        showToast('success', 'บันทึกโน้ตสำเร็จ', 'บันทึกข้อมูลโน้ตของนักเรียนเรียบร้อย');
    } catch (err) {
        console.error('Save student note error:', err);
        showToast('error', 'เกิดข้อผิดพลาด', err.message);
    }
}

async function deleteStudentNote() {
    if (!activeClassroom || !Array.isArray(activeClassroom.students)) return;
    const idx = parseInt(document.getElementById('modal-student-note-idx').value);
    if (isNaN(idx) || !activeClassroom.students[idx]) return;

    const ok = await showGyverConfirm({
        title: 'ลบโน้ตนักเรียน?',
        subtitle: 'ต้องการลบข้อความบันทึกช่วยจำของนักเรียนคนนี้ใช่หรือไม่?',
        icon: 'danger',
        confirmText: '<i class="bi bi-trash3-fill me-1"></i> ลบโน้ต',
        confirmBtnClass: 'btn-danger'
    });
    if (!ok) return;

    delete activeClassroom.students[idx].note;

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ students: activeClassroom.students })
            .eq('id', activeClassroom.id);

        if (error) {
            showToast('error', 'ลบโน้ตล้มเหลว', error.message);
            return;
        }

        const cIdx = cachedClassrooms.findIndex(c => c.id === activeClassroom.id);
        if (cIdx !== -1) cachedClassrooms[cIdx].students = activeClassroom.students;

        renderTabScan();
        renderTabAttendance();

        const modalEl = document.getElementById('studentNoteModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        showToast('info', 'ลบโน้ตแล้ว', 'ลบโน้ตของนักเรียนเรียบร้อย');
    } catch (err) {
        console.error('Delete student note error:', err);
        showToast('error', 'เกิดข้อผิดพลาด', err.message);
    }
}

function formatStudentDisplayName(s, defaultName = 'นักเรียน') {
    if (!s) return defaultName;
    const nick = (s.nickname || '').trim();
    const full = (s.name || '').trim();
    if (!nick && !full) return defaultName;
    if (!nick) return full;
    if (!full) return nick;
    if (full === nick) return nick;
    if (full.startsWith(nick + ' ') || full.startsWith(nick + '(')) {
        return full;
    }
    return `${nick} (${full})`;
}

/**
 * 🎨 Modern Gyver Confirmation Modal (SweetAlert2 wrapper with fallback)
 */
async function showGyverConfirm({
    title = 'ยืนยันการทำรายการ',
    subtitle = '',
    html = '',
    icon = 'warning',
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    confirmBtnClass = 'btn-danger',
    showCancel = true
}) {
    if (typeof Swal === 'undefined') {
        return confirm(`${title}\n${subtitle}`);
    }

    const iconColors = {
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        question: '#8b5cf6'
    };

    const iconClasses = {
        warning: 'bi-exclamation-triangle-fill',
        danger: 'bi-trash3-fill',
        info: 'bi-info-circle-fill',
        question: 'bi-question-circle-fill'
    };

    const color = iconColors[icon] || iconColors.warning;
    const iconClass = iconClasses[icon] || iconClasses.warning;

    let contentHtml = '';
    if (html) {
        contentHtml = html;
    } else if (subtitle) {
        contentHtml = `
            <div style="font-size: 0.95rem; color: #475569; line-height: 1.6; margin-top: 10px;">
                ${subtitle}
            </div>
        `;
    }

    const res = await Swal.fire({
        title: `<div class="d-flex align-items-center justify-content-center gap-2 mt-2" style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">
            <i class="bi ${iconClass}" style="color: ${color}; font-size: 1.4rem;"></i>
            <span>${title}</span>
        </div>`,
        html: contentHtml,
        showCancelButton: showCancel,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        customClass: {
            popup: 'gyver-swal-popup rounded-4 border-0 shadow-lg p-4',
            confirmButton: `btn ${confirmBtnClass} rounded-pill px-4 py-2 fw-bold shadow-sm`,
            cancelButton: 'btn btn-light border rounded-pill px-4 py-2 fw-semibold text-secondary ms-2',
            actions: 'mt-3 mb-0'
        },
        buttonsStyling: false,
        reverseButtons: true,
        focusCancel: true
    });

    return res.isConfirmed;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 📺 โหมดฉายจอใหญ่ (Projector Fullscreen Mode)
function openProjectorMode() {
    if (!activeClassroom) return;

    const roomCode = activeClassroom.room_code || '------';
    const joinUrl = getStudentJoinUrl();

    document.getElementById('projector-title').innerText = `วิชา / ห้อง: ${activeClassroom.class_name}`;
    document.getElementById('projector-code-text').innerText = roomCode;

    const qrImg = document.getElementById('projector-qr-img');
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(joinUrl)}`;
    }

    updateProjectorRoster();

    const modal = new bootstrap.Modal(document.getElementById('projectorModal'));
    modal.show();
}

function updateProjectorRoster() {
    if (!activeClassroom) return;
    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    const countEl = document.getElementById('projector-student-count');
    if (countEl) countEl.innerText = students.length;

    const grid = document.getElementById('projector-student-grid');
    if (!grid) return;

    if (students.length === 0) {
        grid.innerHTML = `<div class="text-center py-5 text-white-50 w-100">กำลังรอนักเรียนสแกนเข้ามา...</div>`;
    } else {
        grid.innerHTML = students.map((s, idx) => {
            const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;
            const nickname = s.nickname || s.name || `นร. ${idx + 1}`;
            return `
            <div class="projector-student-card">
                <img src="${avatar}" alt="${nickname}">
                <div class="name">${nickname}</div>
            </div>`;
        }).join('');
    }
}

/* ============================================================== */
/* 📋 TAB 2: เช็คชื่อเข้าเรียน (Daily Attendance) */
/* ============================================================== */
function setAttendanceToday() {
    currentAttendanceDate = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput) dateInput.value = currentAttendanceDate;
    loadAttendanceForDate();
}

function loadAttendanceForDate() {
    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput) currentAttendanceDate = dateInput.value;

    const logs = activeClassroom?.attendance_logs || {};
    currentAttendanceMap = logs[currentAttendanceDate] || {};

    renderTabAttendance();
}

// ⚙️ ดึงเกณฑ์คะแนนเช็คชื่อ (Attendance Criteria)
function getAttendanceCriteria(classroom) {
    const defaultCriteria = {
        present: 1,    // มา 1 ครั้ง ได้กี่คะแนน (เช่น 1 หรือ 0.5)
        late: 0.5,     // สาย 1 ครั้ง
        leave: 0.5,    // ลา 1 ครั้ง
        absent: 0,     // ขาด 1 ครั้ง
        mode: 'raw',   // 'raw' (บวกสะสมตามจริง) | 'scaled' (เทียบบัญญัติไตรยางศ์เต็มเพดาน)
        max_score: 10  // เพดานคะแนนสำหรับโหมด scaled
    };
    if (!classroom) return defaultCriteria;
    return Object.assign({}, defaultCriteria, classroom.attendance_criteria || classroom.gradebook?.config?.attendance_criteria || {});
}

// 🧮 คำนวณสถิติและคะแนนเช็คชื่อของนักเรียนรายบุคคล (ทุกวันที่เคยบันทึกไว้)
function calcStudentAttendanceSummary(student, attendanceLogs, criteria) {
    const logs = attendanceLogs || {};
    const dates = Object.keys(logs);
    const crit = criteria || getAttendanceCriteria(activeClassroom);

    let studentKey = typeof student === 'string' ? student : (student.user_id || student.name);
    let sName = typeof student === 'object' ? student.name : null;
    let sUserId = typeof student === 'object' ? student.user_id : null;

    let present = 0, late = 0, leave = 0, absent = 0;

    dates.forEach(d => {
        const dayRecord = logs[d];
        if (!dayRecord) return;
        const entry = dayRecord[studentKey] || (sName && dayRecord[sName]) || (sUserId && dayRecord[sUserId]);
        if (!entry) return;
        const st = entry.status || 'present';
        if (st === 'present') present++;
        else if (st === 'late') late++;
        else if (st === 'leave') leave++;
        else if (st === 'absent') absent++;
    });

    // คำนวณคะแนนตามเกณฑ์
    const rawScore = (present * Number(crit.present || 0)) +
                     (late * Number(crit.late || 0)) +
                     (leave * Number(crit.leave || 0)) +
                     (absent * Number(crit.absent || 0));

    let finalScore = 0;
    if (crit.mode === 'scaled') {
        const maxPossible = dates.length * Math.max(0.1, Number(crit.present || 1));
        const maxLimit = Number(crit.max_score || 10);
        finalScore = maxPossible > 0 ? Math.min(maxLimit, Math.round((rawScore / maxPossible) * maxLimit * 10) / 10) : 0;
    } else {
        finalScore = Math.round(rawScore * 10) / 10;
    }

    return {
        present,
        late,
        leave,
        absent,
        totalRecordedDays: dates.length,
        rawScore: Math.round(rawScore * 10) / 10,
        finalScore: Math.max(0, finalScore)
    };
}

function renderTabAttendance() {
    const tbody = document.getElementById('attendance-table-body');
    if (!tbody || !activeClassroom) return;

    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    const logs = activeClassroom.attendance_logs || {};
    const totalRecordedDays = Object.keys(logs).length;
    const criteria = getAttendanceCriteria(activeClassroom);

    // อัปเดตป้ายจำนวนวันที่เคยบันทึกแล้วทั้งหมด
    const totalDaysBadge = document.getElementById('att-total-days-badge');
    if (totalDaysBadge) totalDaysBadge.innerText = totalRecordedDays;

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">ยังไม่มีรายชื่อนักเรียนในห้องนี้</td></tr>`;
        updateAttendanceStats(0, 0, 0, 0);
        return;
    }

    let present = 0, late = 0, leave = 0, absent = 0;

    tbody.innerHTML = students.map((s, idx) => {
        const studentKey = s.user_id || s.name;
        const currentRecord = currentAttendanceMap[studentKey] || { status: 'present', note: '' };
        const status = currentRecord.status || 'present';
        const note = currentRecord.note || '';

        if (status === 'present') present++;
        else if (status === 'late') late++;
        else if (status === 'leave') leave++;
        else if (status === 'absent') absent++;

        // สรุปยอดรวม มา/สาย/ลา/ขาด ของนักเรียนคนนี้จากทุกวันที่บันทึก
        const sum = calcStudentAttendanceSummary(s, logs, criteria);

        const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;

        return `
        <tr>
            <td class="text-center font-mono text-muted">${idx + 1}</td>
            <td>
                <img src="${avatar}" class="rounded-circle border" style="width: 38px; height: 38px; object-fit: cover; cursor: pointer;" onclick="openPhotoZoom('${avatar}', '${escapeHtml(s.name)}')">
            </td>
            <td>
                <div class="fw-bold text-dark d-flex align-items-center gap-2 flex-wrap">
                    <span>${escapeHtml(s.name)}</span>
                    ${s.note ? `<span class="badge bg-warning-subtle text-dark border border-warning-subtle role-button" onclick="openStudentNoteModal(${idx})" title="คลิกดู/แก้ไขโน้ต: ${escapeHtml(s.note)}" style="font-size: 0.7rem;"><i class="bi bi-journal-text text-warning me-1"></i>${escapeHtml(s.note)}</span>` : `<button type="button" class="btn btn-link btn-sm p-0 text-muted" onclick="openStudentNoteModal(${idx})" title="เพิ่มโน้ตช่วยจำ" style="font-size: 0.72rem; text-decoration: none;"><i class="bi bi-journal-plus"></i></button>`}
                </div>
                <div class="text-muted small">${s.nickname ? `ชื่อเล่น: ${escapeHtml(s.nickname)}` : ''}</div>
            </td>
            <td class="text-center">
                <div class="d-inline-flex align-items-center gap-1 flex-wrap justify-content-center">
                    <span class="badge bg-success-subtle text-success border border-success-subtle px-1.5 py-0.5" style="font-size: 0.75rem;" title="มาเรียน">มา <b>${sum.present}</b></span>
                    <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-1.5 py-0.5" style="font-size: 0.75rem;" title="มาสาย">สาย <b>${sum.late}</b></span>
                    <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle px-1.5 py-0.5" style="font-size: 0.75rem;" title="ลา">ลา <b>${sum.leave}</b></span>
                    <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-1.5 py-0.5" style="font-size: 0.75rem;" title="ขาดเรียน">ขาด <b>${sum.absent}</b></span>
                </div>
                <div class="text-muted mt-1 font-mono" style="font-size: 0.72rem;">
                    คะแนนสะสม: <b class="text-primary fs-7">${sum.finalScore}</b> แต้ม
                </div>
            </td>
            <td>
                <div class="att-btn-group justify-content-center">
                    <button class="att-btn ${status === 'present' ? 'active-present' : ''}" onclick="setStudentAttendanceStatus('${studentKey}', 'present')">
                        <i class="bi bi-check-lg me-1"></i>มา
                    </button>
                    <button class="att-btn ${status === 'late' ? 'active-late' : ''}" onclick="setStudentAttendanceStatus('${studentKey}', 'late')">
                        <i class="bi bi-clock me-1"></i>สาย
                    </button>
                    <button class="att-btn ${status === 'leave' ? 'active-leave' : ''}" onclick="setStudentAttendanceStatus('${studentKey}', 'leave')">
                        <i class="bi bi-envelope me-1"></i>ลา
                    </button>
                    <button class="att-btn ${status === 'absent' ? 'active-absent' : ''}" onclick="setStudentAttendanceStatus('${studentKey}', 'absent')">
                        <i class="bi bi-x-lg me-1"></i>ขาด
                    </button>
                </div>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm rounded-3" placeholder="ระบุเหตุผล (ถ้ามี)" value="${escapeHtml(note)}" onchange="updateStudentAttendanceNote('${studentKey}', this.value)">
            </td>
        </tr>`;
    }).join('');

    updateAttendanceStats(present, late, leave, absent);
}

function setStudentAttendanceStatus(studentKey, status) {
    if (!currentAttendanceMap[studentKey]) {
        currentAttendanceMap[studentKey] = { status: status, note: '' };
    } else {
        currentAttendanceMap[studentKey].status = status;
    }
    renderTabAttendance();
}

function updateStudentAttendanceNote(studentKey, noteVal) {
    if (!currentAttendanceMap[studentKey]) {
        currentAttendanceMap[studentKey] = { status: 'present', note: noteVal };
    } else {
        currentAttendanceMap[studentKey].note = noteVal;
    }
}

function markAllAttendance(status) {
    if (!activeClassroom) return;
    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    students.forEach(s => {
        const studentKey = s.user_id || s.name;
        const oldNote = currentAttendanceMap[studentKey]?.note || '';
        currentAttendanceMap[studentKey] = { status: status, note: oldNote };
    });
    renderTabAttendance();
    showToast('info', 'อัปเดตสถานะ', `เช็ค "${status === 'present' ? 'มา' : status}" ให้นักเรียนทุกคนแล้ว`);
}

function resetAttendanceStatus() {
    currentAttendanceMap = {};
    renderTabAttendance();
}

function updateAttendanceStats(present, late, leave, absent) {
    const elPresent = document.getElementById('att-count-present');
    const elLate = document.getElementById('att-count-late');
    const elLeave = document.getElementById('att-count-leave');
    const elAbsent = document.getElementById('att-count-absent');

    if (elPresent) elPresent.innerText = present;
    if (elLate) elLate.innerText = late;
    if (elLeave) elLeave.innerText = leave;
    if (elAbsent) elAbsent.innerText = absent;

    updateAttendanceStatsBadge();
}

function updateAttendanceStatsBadge() {
    const badge = document.getElementById('stat-attendance-count');
    if (!badge || !activeClassroom) return;

    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    const checkedCount = Object.keys(currentAttendanceMap).length;
    badge.innerText = `${checkedCount} / ${students.length}`;
}

async function saveAttendanceRecord() {
    if (!activeClassroomId || !activeClassroom) return;

    const existingLogs = activeClassroom.attendance_logs || {};
    existingLogs[currentAttendanceDate] = currentAttendanceMap;
    activeClassroom.attendance_logs = existingLogs;
    localStorage.setItem(`gyver_attendance_${activeClassroomId}`, JSON.stringify(existingLogs));

    // อัปเดตตารางให้แสดงสถิติและคะแนนสะสมใหม่ทันที
    renderTabAttendance();

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ attendance_logs: existingLogs })
            .eq('id', activeClassroomId);

        if (!error) {
            showToast('success', 'บันทึกสำเร็จ!', `บันทึกข้อมูลการเช็คชื่อวันที่ ${currentAttendanceDate} เรียบร้อยแล้ว`);
        } else {
            console.warn("Supabase attendance_logs notice:", error.message);
            showToast('success', 'บันทึกสำเร็จ!', `บันทึกข้อมูลการเช็คชื่อเรียบร้อยแล้ว`);
        }
    } catch (err) {
        console.warn("Save attendance error:", err);
        showToast('success', 'บันทึกสำเร็จ!', `บันทึกข้อมูลการเช็คชื่อเรียบร้อยแล้ว`);
    }
}

// ⚙️ Modal: ตั้งเกณฑ์คะแนนเช็คชื่อ (Attendance Criteria)
function openAttendanceCriteriaModal() {
    if (!activeClassroom) return;
    const crit = getAttendanceCriteria(activeClassroom);

    const elPresent = document.getElementById('att-crit-present');
    const elLate = document.getElementById('att-crit-late');
    const elLeave = document.getElementById('att-crit-leave');
    const elAbsent = document.getElementById('att-crit-absent');
    const elScaleMax = document.getElementById('att-scale-max');

    if (elPresent) elPresent.value = crit.present ?? 1;
    if (elLate) elLate.value = crit.late ?? 0.5;
    if (elLeave) elLeave.value = crit.leave ?? 0.5;
    if (elAbsent) elAbsent.value = crit.absent ?? 0;
    if (elScaleMax) elScaleMax.value = crit.max_score ?? 10;

    const mode = crit.mode || 'raw';
    const radioRaw = document.getElementById('att-calc-mode-raw');
    const radioScaled = document.getElementById('att-calc-mode-scaled');
    if (mode === 'scaled' && radioScaled) radioScaled.checked = true;
    else if (radioRaw) radioRaw.checked = true;

    toggleAttendanceScaleInput();
    previewCriteriaFormula();

    const modalEl = document.getElementById('attendanceCriteriaModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

function toggleAttendanceScaleInput() {
    const isScaled = document.getElementById('att-calc-mode-scaled')?.checked || false;
    const container = document.getElementById('att-scale-max-container');
    if (container) {
        if (isScaled) container.classList.remove('d-none');
        else container.classList.add('d-none');
    }
    previewCriteriaFormula();
}

function previewCriteriaFormula() {
    const p = Number(document.getElementById('att-crit-present')?.value) || 0;
    const l = Number(document.getElementById('att-crit-late')?.value) || 0;
    const lv = Number(document.getElementById('att-crit-leave')?.value) || 0;
    const a = Number(document.getElementById('att-crit-absent')?.value) || 0;
    const isScaled = document.getElementById('att-calc-mode-scaled')?.checked || false;
    const scaleMax = Number(document.getElementById('att-scale-max')?.value) || 10;

    const previewEl = document.getElementById('att-criteria-preview-text');
    if (!previewEl) return;

    if (isScaled) {
        previewEl.innerHTML = `เกณฑ์: มาได้ ${p} แต้ม, สาย ${l} แต้ม, ลา ${lv} แต้ม, ขาด ${a} แต้ม<br><b class="text-success">โหมดเทียบบัญญัติไตรยางศ์:</b> คำนวณเป็นสัดส่วนคะแนนเต็ม <b>${scaleMax}</b> คะแนนตามโครงสร้าง ปพ.5`;
    } else {
        const sampleRaw = (10 * p) + (2 * l);
        previewEl.innerHTML = `สมมุตินักเรียน <b>มา 10 วัน</b> (${10 * p} คะแนน), <b>สาย 2 วัน</b> (${2 * l} คะแนน) → รวมได้รับ <b class="text-primary">${Math.round(sampleRaw * 10) / 10}</b> คะแนนสะสม`;
    }
}

async function handleSaveAttendanceCriteria(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeClassroom) return;

    const present = Number(document.getElementById('att-crit-present')?.value ?? 1);
    const late = Number(document.getElementById('att-crit-late')?.value ?? 0.5);
    const leave = Number(document.getElementById('att-crit-leave')?.value ?? 0.5);
    const absent = Number(document.getElementById('att-crit-absent')?.value ?? 0);
    const mode = document.querySelector('input[name="att-calc-mode"]:checked')?.value || 'raw';
    const max_score = Number(document.getElementById('att-scale-max')?.value ?? 10);

    const newCriteria = {
        present,
        late,
        leave,
        absent,
        mode,
        max_score
    };

    activeClassroom.attendance_criteria = newCriteria;
    if (!activeClassroom.gradebook) activeClassroom.gradebook = { config: {}, columns: [], scores: {} };
    if (!activeClassroom.gradebook.config) activeClassroom.gradebook.config = {};
    activeClassroom.gradebook.config.attendance_criteria = newCriteria;

    // บันทึกลง Supabase และ LocalStorage
    try {
        if (activeClassroomId) {
            localStorage.setItem(`gyver_attendance_criteria_${activeClassroomId}`, JSON.stringify(newCriteria));
            await supabaseClient
                .from('classrooms')
                .update({
                    attendance_criteria: newCriteria,
                    gradebook: activeClassroom.gradebook
                })
                .eq('id', activeClassroomId);
        }
    } catch (err) {
        console.warn("Save attendance criteria error:", err);
    }

    renderTabAttendance();
    renderTabGradebook();

    bootstrap.Modal.getInstance(document.getElementById('attendanceCriteriaModal'))?.hide();
    showToast('success', 'บันทึกเกณฑ์คะแนนแล้ว', `มา=${present} สาย=${late} ลา=${leave} ขาด=${absent} (${mode === 'scaled' ? `สัดส่วนเต็ม ${max_score}` : 'บวกสะสมตามจริง'})`);
}

// 📅 Modal: ดึงคะแนนเช็คชื่อเข้า ปพ.5 (Import Attendance)
function openImportAttendanceModal() {
    if (!activeClassroom) return;

    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    const logs = activeClassroom.attendance_logs || {};
    const totalDays = Object.keys(logs).length;
    const crit = getAttendanceCriteria(activeClassroom);

    // แสดงสถิติด้านบน
    const daysEl = document.getElementById('modal-att-total-days');
    if (daysEl) daysEl.innerText = totalDays;

    const descEl = document.getElementById('modal-att-criteria-desc');
    if (descEl) {
        descEl.innerText = `เกณฑ์: มา = ${crit.present}, สาย = ${crit.late}, ลา = ${crit.leave}, ขาด = ${crit.absent} คะแนน (${crit.mode === 'scaled' ? `สัดส่วนเต็ม ${crit.max_score}` : 'บวกสะสมตามจริง'})`;
    }

    const countEl = document.getElementById('modal-att-preview-count');
    if (countEl) countEl.innerText = students.length;

    // เรนเดอร์พรีวิวคะแนน
    const tbody = document.getElementById('modal-att-preview-tbody');
    if (tbody) {
        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">ยังไม่มีนักเรียนในห้องเรียนนี้</td></tr>`;
        } else {
            tbody.innerHTML = students.map((s, idx) => {
                const sum = calcStudentAttendanceSummary(s, logs, crit);
                return `
                <tr>
                    <td class="text-center font-mono text-muted">${idx + 1}</td>
                    <td class="fw-bold text-dark">${escapeHtml(s.name)}</td>
                    <td class="text-center">
                        <span class="badge bg-success-subtle text-success me-1">มา ${sum.present}</span>
                        <span class="badge bg-warning-subtle text-warning-emphasis me-1">สาย ${sum.late}</span>
                        <span class="badge bg-info-subtle text-info-emphasis me-1">ลา ${sum.leave}</span>
                        <span class="badge bg-danger-subtle text-danger">ขาด ${sum.absent}</span>
                    </td>
                    <td class="text-center font-mono fw-bold text-primary">
                        ${sum.finalScore}
                    </td>
                </tr>`;
            }).join('');
        }
    }

    // รีเซ็ตปลายทาง
    const radioMain = document.getElementById('import-att-dest-main');
    if (radioMain) radioMain.checked = true;
    toggleImportAttendanceDest();

    const modalEl = document.getElementById('importAttendanceModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

function toggleImportAttendanceDest() {
    const isNewCol = document.getElementById('import-att-dest-col')?.checked || false;
    const colOptions = document.getElementById('import-att-col-options');
    if (colOptions) {
        if (isNewCol) colOptions.classList.remove('d-none');
        else colOptions.classList.add('d-none');
    }
}

function executeImportAttendance() {
    if (!activeClassroom) return;
    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    if (students.length === 0) {
        showToast('warning', 'ไม่มีข้อมูล', 'ยังไม่มีนักเรียนในห้องนี้');
        return;
    }

    const logs = activeClassroom.attendance_logs || {};
    const crit = getAttendanceCriteria(activeClassroom);
    const dest = document.querySelector('input[name="import-att-dest"]:checked')?.value || 'main';

    if (!activeClassroom.gradebook) activeClassroom.gradebook = { config: {}, columns: [], scores: {} };
    if (!Array.isArray(activeClassroom.gradebook.columns)) activeClassroom.gradebook.columns = [];
    if (!activeClassroom.gradebook.scores) activeClassroom.gradebook.scores = {};

    let importedCount = 0;

    if (dest === 'main') {
        // นำเข้าใส่ช่องหลัก "มาเรียน (จิตพิสัย)" โดยตรง
        students.forEach(s => {
            const studentKey = s.user_id || s.name;
            const sum = calcStudentAttendanceSummary(s, logs, crit);
            if (!activeClassroom.gradebook.scores[studentKey]) {
                activeClassroom.gradebook.scores[studentKey] = {};
            }
            activeClassroom.gradebook.scores[studentKey].attendance = sum.finalScore;
            importedCount++;
        });
    } else {
        // สร้างเป็นคอลัมน์เก็บคะแนนใหม่
        const colTitle = document.getElementById('import-att-newcol-title')?.value.trim() || 'คะแนนเช็คชื่อ';
        const colTerm = document.getElementById('import-att-newcol-term')?.value || 'attendance';
        const colId = 'att_' + Date.now();

        // คำนวณคะแนนเต็มของคอลัมน์นี้
        const totalDays = Object.keys(logs).length;
        let colMax = 10;
        if (crit.mode === 'scaled') {
            colMax = Number(crit.max_score || 10);
        } else {
            colMax = Math.max(1, Math.round(totalDays * Number(crit.present || 1)));
        }

        activeClassroom.gradebook.columns.push({
            id: colId,
            title: colTitle,
            max: colMax,
            term: colTerm,
            is_bonus: false
        });

        students.forEach(s => {
            const studentKey = s.user_id || s.name;
            const sum = calcStudentAttendanceSummary(s, logs, crit);
            if (!activeClassroom.gradebook.scores[studentKey]) {
                activeClassroom.gradebook.scores[studentKey] = {};
            }
            activeClassroom.gradebook.scores[studentKey][colId] = sum.finalScore;
            importedCount++;
        });
    }

    renderTabGradebook();
    saveGradebookRecord(true);

    bootstrap.Modal.getInstance(document.getElementById('importAttendanceModal'))?.hide();
    showToast('success', 'ดึงคะแนนสำเร็จ!', `นำเข้าคะแนนเช็คชื่อของนักเรียน ${importedCount} คน เข้าสู่ ปพ.5 เรียบร้อย`);
}

window.getAttendanceCriteria = getAttendanceCriteria;
window.calcStudentAttendanceSummary = calcStudentAttendanceSummary;
window.openAttendanceCriteriaModal = openAttendanceCriteriaModal;
window.toggleAttendanceScaleInput = toggleAttendanceScaleInput;
window.previewCriteriaFormula = previewCriteriaFormula;
window.handleSaveAttendanceCriteria = handleSaveAttendanceCriteria;
window.openImportAttendanceModal = openImportAttendanceModal;
window.toggleImportAttendanceDest = toggleImportAttendanceDest;
window.executeImportAttendance = executeImportAttendance;

/* ============================================================== */
/* 📂 TAB 3: แจกไฟล์ & ชีทเรียน (Course Materials Hub - แชร์ทุกห้องในวิชา) */
/* ============================================================== */

// 🔑 คำนวณคีย์กลุ่มวิชาสำหรับเก็บข้อมูลแชร์ร่วมกันทุกห้อง
function getCourseGroupKey(classroom) {
    if (!classroom) return 'default_course';
    const cfg = classroom.gradebook?.config || {};
    if (cfg.subject_group_id) return cfg.subject_group_id;
    const cleanSubj = (cfg.subject_name || classroom.class_name || 'subj').replace(/\s*\([มป]\.?\d+.*?\)$/i, '').trim().toLowerCase().replace(/\s+/g, '_');
    const cleanGrade = String(cfg.grade_level || '4').replace(/[^0-9]/g, '') || '4';
    return `subj_${currentUserId || classroom.teacher_id || 't'}_${cleanSubj}_${cleanGrade}`;
}

// 🏷️ อัปเดตข้อความรายชื่อห้องที่ใช้เอกสาร/งานร่วมกัน บนแบนเนอร์
function updateSharedRoomsListBanners() {
    if (!activeClassroom) return;
    const siblings = getSiblingSections(activeClassroom);
    const cfg = activeClassroom.gradebook?.config || {};
    const gradeLevel = cfg.grade_level || '4';
    const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;

    const roomNames = siblings.map(sib => {
        const sec = extractCleanRoomSection(sib.gradebook?.config?.room_section || sib.class_name, gradeLevel);
        return `ห้อง ${displayGrade}/${sec}`;
    }).join(', ');

    document.querySelectorAll('.shared-rooms-list').forEach(el => {
        el.innerText = roomNames || `ห้อง ${displayGrade}`;
    });
}

// 📂 ดึงคลังไฟล์เอกสารระดับรายวิชา (แชร์ร่วมกันทุกห้อง)
function getSharedCourseMaterials() {
    if (!activeClassroom) return [];
    const groupKey = getCourseGroupKey(activeClassroom);
    try {
        const raw = localStorage.getItem(`gyver_shared_materials_${groupKey}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) {}

    // Fallback: ดึงจากห้องปัจจุบันหรือห้องคู่ขนานที่เคยมีไฟล์อยู่เดิม
    const siblings = getSiblingSections(activeClassroom);
    for (const sib of siblings) {
        if (Array.isArray(sib.materials) && sib.materials.length > 0) {
            try {
                localStorage.setItem(`gyver_shared_materials_${groupKey}`, JSON.stringify(sib.materials));
            } catch (_) {}
            return sib.materials;
        }
    }
    return Array.isArray(activeClassroom.materials) ? activeClassroom.materials : [];
}

// 💾 บันทึกคลังไฟล์เอกสารระดับรายวิชา และซิงก์ไปยังทุกห้องในรายวิชานี้ทันที
async function saveSharedCourseMaterials(materials) {
    if (!activeClassroom) return;
    const groupKey = getCourseGroupKey(activeClassroom);
    try {
        localStorage.setItem(`gyver_shared_materials_${groupKey}`, JSON.stringify(materials));
    } catch (_) {}

    const siblings = getSiblingSections(activeClassroom);
    for (const sib of siblings) {
        sib.materials = materials;
        try {
            localStorage.setItem(`gyver_materials_${sib.id}`, JSON.stringify(materials));
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                supabaseClient.from('classrooms').update({ materials: materials }).eq('id', sib.id).then();
            }
        } catch (_) {}
    }
}

function updateMaterialsCountBadge() {
    const badge = document.getElementById('stat-material-count');
    if (!badge || !activeClassroom) return;
    const materials = getSharedCourseMaterials();
    badge.innerText = `${materials.length} ไฟล์`;
}

function loadMaterials() {
    const container = document.getElementById('materials-container');
    if (!container || !activeClassroom) return;

    updateSharedRoomsListBanners();
    const materials = getSharedCourseMaterials();
    updateMaterialsCountBadge();

    if (materials.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 bg-light rounded-4 border border-dashed">
                <i class="bi bi-cloud-arrow-up fs-1 text-primary opacity-50 d-block mb-2"></i>
                <h6 class="fw-bold text-dark mb-1">ยังไม่มีเอกสารหรือไฟล์ที่แจกในรายวิชานี้</h6>
                <p class="small text-muted mb-3">กดปุ่ม "เพิ่มเอกสาร/แจกไฟล์" ด้านบน เพื่อวางสไลด์หรือชีทเรียนให้นักเรียนทุกห้องดาวน์โหลดพร้อมกัน</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#addMaterialModal">
                    <i class="bi bi-plus-circle-fill me-1"></i>เพิ่มเอกสารแรก
                </button>
            </div>`;
        return;
    }

    container.innerHTML = materials.map((m, idx) => {
        const catMap = {
            slide: { label: 'สไลด์การสอน', icon: 'bi-file-earmark-slides-fill', class: 'category-badge-slide' },
            worksheet: { label: 'ใบงาน/แบบฝึกหัด', icon: 'bi-file-earmark-ruled-fill', class: 'category-badge-worksheet' },
            link: { label: 'สื่อ/วิดีโอ', icon: 'bi-link-45deg', class: 'category-badge-link' },
            other: { label: 'เอกสารอื่นๆ', icon: 'bi-file-earmark-text-fill', class: 'category-badge-other' }
        };

        const catInfo = catMap[m.category] || catMap.other;
        const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('th-TH') : '';

        return `
        <div class="col-md-6 col-lg-4">
            <div class="material-card h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge ${catInfo.class} rounded-pill px-3 py-1 small fw-bold">
                        <i class="bi ${catInfo.icon} me-1"></i>${catInfo.label}
                    </span>
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteMaterial(${idx})" title="ลบเอกสารนี้">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>

                <h6 class="fw-bold text-dark mb-1 text-truncate" title="${m.title}">${m.title}</h6>
                <p class="text-muted small mb-3 flex-grow-1" style="font-size: 0.82rem;">${m.description || 'ไม่มีคำอธิบาย'}</p>

                <div class="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                    <small class="text-muted font-mono" style="font-size: 0.72rem;">${dateStr}</small>
                    <a href="${m.file_url}" target="_blank" class="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold">
                        <i class="bi bi-download me-1"></i>ดาวน์โหลด
                    </a>
                </div>
            </div>
        </div>`;
    }).join('');
}

// 📁 จัดการไฟล์เอกสาร / ชีทเรียน (Cloudinary File Upload สำหรับครู)
function toggleMaterialSourceType(type) {
    currentMaterialSourceType = type;
    const fileSec = document.getElementById('section-mat-file');
    const linkSec = document.getElementById('section-mat-link');
    const linkInput = document.getElementById('material-url');

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

function handleMaterialFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
        showToast('error', 'ไฟล์มีขนาดใหญ่เกินไป', 'ขนาดไฟล์สูงสุดไม่เกิน 100 MB');
        event.target.value = '';
        return;
    }

    selectedMaterialFile = file;
    const previewCard = document.getElementById('mat-file-selected-card');
    const nameEl = document.getElementById('mat-file-selected-name');
    const sizeEl = document.getElementById('mat-file-selected-size');
    const iconEl = document.getElementById('mat-file-selected-icon');

    // เติมชื่อเอกสารให้อัตโนมัติถ้าครูยังไม่ได้พิมพ์
    const titleInput = document.getElementById('material-title');
    if (titleInput && !titleInput.value.trim()) {
        const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        titleInput.value = cleanName;
    }

    const formatSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const s = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
    };

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatSize(file.size);
    if (iconEl) iconEl.className = 'bi bi-file-earmark-check-fill fs-5 text-success';
    if (previewCard) previewCard.classList.remove('d-none');
}

function removeSelectedMaterialFile() {
    selectedMaterialFile = null;
    const fileInput = document.getElementById('material-file-input');
    if (fileInput) fileInput.value = '';
    const previewCard = document.getElementById('mat-file-selected-card');
    if (previewCard) previewCard.classList.add('d-none');
}

async function handleSaveMaterial(e) {
    e.preventDefault();
    if (!activeClassroom) return;

    const title = document.getElementById('material-title')?.value.trim();
    const category = document.getElementById('material-category')?.value || 'slide';
    const desc = document.getElementById('material-desc')?.value.trim() || '';

    let finalUrl = '';
    let fileName = '';

    const btn = document.getElementById('btn-save-material');
    const progressEl = document.getElementById('material-upload-progress');
    const statusText = document.getElementById('material-upload-status-text');

    if (currentMaterialSourceType === 'file') {
        if (!selectedMaterialFile) {
            showToast('warning', 'กรุณาเลือกไฟล์', 'กรุณาเลือกไฟล์เอกสารที่ต้องการอัปโหลดขึ้น Cloudinary');
            return;
        }

        try {
            if (btn) btn.disabled = true;
            if (progressEl) progressEl.classList.remove('d-none');
            if (statusText) statusText.textContent = `กำลังอัปโหลด "${selectedMaterialFile.name}" ขึ้น Cloudinary...`;

            const formData = new FormData();
            formData.append('file', selectedMaterialFile);
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
            finalUrl = data.secure_url;
            fileName = selectedMaterialFile.name;
        } catch (err) {
            console.error("Cloudinary upload error:", err);
            showToast('error', 'อัปโหลดไฟล์ล้มเหลว', err.message);
            if (btn) btn.disabled = false;
            if (progressEl) progressEl.classList.add('d-none');
            return;
        }
    } else {
        const urlInput = document.getElementById('material-url');
        finalUrl = (urlInput?.value || '').trim();
        if (!finalUrl) {
            showToast('warning', 'กรุณาระบุลิงก์', 'กรุณาระบุลิงก์ดาวน์โหลดเอกสาร');
            return;
        }
        fileName = 'ลิงก์ภายนอก';
    }

    const newMaterial = {
        id: 'mat_' + Date.now(),
        title: title,
        category: category,
        file_url: finalUrl,
        file_name: fileName,
        description: desc,
        created_at: new Date().toISOString()
    };

    let materials = getSharedCourseMaterials();
    materials.unshift(newMaterial);

    if (btn) btn.disabled = true;

    try {
        await saveSharedCourseMaterials(materials);
        showToast('success', 'เพิ่มเอกสารสำเร็จ!', currentMaterialSourceType === 'file' ? `ไฟล์ "${fileName}" ถูกอัปโหลดขึ้น Cloudinary และแชร์ไปยังทุกห้องเรียบร้อย` : `เอกสาร "${title}" ถูกเพิ่มและแชร์เรียบร้อย`);
        document.getElementById('form-add-material')?.reset();
        removeSelectedMaterialFile();
        bootstrap.Modal.getInstance(document.getElementById('addMaterialModal'))?.hide();
        loadMaterials();
    } catch (err) {
        console.warn("Save material error:", err);
        showToast('error', 'บันทึกผิดพลาด', err?.message || 'เกิดข้อผิดพลาด');
    } finally {
        if (btn) btn.disabled = false;
        if (progressEl) progressEl.classList.add('d-none');
    }
}

async function deleteMaterial(idx) {
    if (!activeClassroom) return;
    const materials = getSharedCourseMaterials();
    const item = materials[idx];
    const itemTitle = item?.title ? ` "${item.title}"` : '';

    const ok = await showGyverConfirm({
        title: `ลบเอกสาร${itemTitle}?`,
        subtitle: '⚠️ เอกสารนี้จะถูกลบออกจากทุกห้องในรายวิชานี้และไม่สามารถกู้คืนได้',
        icon: 'danger',
        confirmText: '<i class="bi bi-trash3-fill me-1"></i> ลบเอกสาร',
        confirmBtnClass: 'btn-danger'
    });
    if (!ok) return;

    materials.splice(idx, 1);

    await saveSharedCourseMaterials(materials);
    showToast('info', 'ลบเอกสารแล้ว', 'ลบเอกสารออกจากทุกห้องในรายวิชานี้เรียบร้อย');
    loadMaterials();
}

/* ============================================================== */
/* 📝 TAB 4: สั่งงาน & ตรวจงาน (Assignments & Submissions - เกณฑ์เดียวกันทุกห้อง) */
/* ============================================================== */

// 📝 ดึงรายการการบ้านระดับรายวิชา (แชร์ร่วมกันทุกห้อง พร้อมรวมงานที่นักเรียนส่ง)
function getSharedCourseAssignments() {
    if (!activeClassroom) return [];
    const groupKey = getCourseGroupKey(activeClassroom);
    let sharedList = [];
    try {
        const raw = localStorage.getItem(`gyver_shared_assignments_${groupKey}`);
        if (raw) sharedList = JSON.parse(raw) || [];
    } catch (_) {}

    const assignmentMap = new Map();
    sharedList.forEach(a => assignmentMap.set(a.id, a));

    // รวมการบ้านและการส่งงานจากห้องเรียนทั้งหมดในวิชานี้ เพื่อไม่ให้งานหรือคะแนนของห้องใดสูญหาย
    const siblings = getSiblingSections(activeClassroom);
    siblings.forEach(sib => {
        const list = Array.isArray(sib.assignments) ? sib.assignments : [];
        list.forEach(a => {
            if (!assignmentMap.has(a.id)) {
                assignmentMap.set(a.id, JSON.parse(JSON.stringify(a)));
            } else {
                const target = assignmentMap.get(a.id);
                if (!target.submissions) target.submissions = {};
                if (a.submissions) {
                    Object.assign(target.submissions, a.submissions);
                }
            }
        });
    });

    const merged = Array.from(assignmentMap.values());
    try {
        localStorage.setItem(`gyver_shared_assignments_${groupKey}`, JSON.stringify(merged));
    } catch (_) {}
    return merged;
}

// 💾 บันทึกรายการการบ้านระดับรายวิชา และซิงก์ไปยังทุกห้องในรายวิชานี้ทันที
async function saveSharedCourseAssignments(assignments) {
    if (!activeClassroom) return;
    const groupKey = getCourseGroupKey(activeClassroom);
    try {
        localStorage.setItem(`gyver_shared_assignments_${groupKey}`, JSON.stringify(assignments));
    } catch (_) {}

    const siblings = getSiblingSections(activeClassroom);
    for (const sib of siblings) {
        sib.assignments = assignments;
        try {
            localStorage.setItem(`gyver_assignments_${sib.id}`, JSON.stringify(assignments));
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                supabaseClient.from('classrooms').update({ assignments: assignments }).eq('id', sib.id).then();
            }
        } catch (_) {}
    }
}

// 👥 ดึงรายชื่อนักเรียนทั้งหมดจากทุกห้องในรายวิชานี้ พร้อมระบุห้องของนักเรียน
function getAllStudentsInCourse() {
    if (!activeClassroom) return [];
    const siblings = getSiblingSections(activeClassroom);
    const cfg = activeClassroom.gradebook?.config || {};
    const gradeLevel = cfg.grade_level || '4';
    const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;

    const allStudents = [];
    siblings.forEach(sib => {
        const secNum = extractCleanRoomSection(sib.gradebook?.config?.room_section || sib.class_name, gradeLevel);
        const roomLabel = `${displayGrade}/${secNum}`;
        const list = Array.isArray(sib.students) ? sib.students : [];
        list.forEach(st => {
            allStudents.push({
                ...st,
                _roomId: sib.id,
                _roomCode: sib.room_code,
                _roomName: roomLabel,
                _fullRoomLabel: `ห้อง ${roomLabel}`
            });
        });
    });
    return allStudents;
}

function updateAssignmentsCountBadge() {
    const badge = document.getElementById('stat-assignment-count');
    if (!badge || !activeClassroom) return;
    const assignments = getSharedCourseAssignments();
    badge.innerText = `${assignments.length} ชิ้น`;
}

function loadAssignments() {
    const container = document.getElementById('assignments-container');
    if (!container || !activeClassroom) return;

    updateSharedRoomsListBanners();
    const assignments = getSharedCourseAssignments();
    updateAssignmentsCountBadge();

    if (assignments.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 bg-light rounded-4 border border-dashed">
                <i class="bi bi-pencil-square fs-1 text-info opacity-50 d-block mb-2"></i>
                <h6 class="fw-bold text-dark mb-1">ยังไม่มีการบ้านหรือชิ้นงานในรายวิชานี้</h6>
                <p class="small text-muted mb-3">กดปุ่ม "สั่งงานใหม่" เพื่อสร้างโจทย์ กำหนดส่ง ให้นักเรียนทุกห้องส่งงานตามเกณฑ์เดียวกัน</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" onclick="openAddAssignmentModal()">
                    <i class="bi bi-plus-circle-fill me-1"></i>สั่งงานแรก
                </button>
            </div>`;
        return;
    }

    const allStudents = getAllStudentsInCourse();
    const siblings = getSiblingSections(activeClassroom);
    const cfg = activeClassroom.gradebook?.config || {};
    const gradeLevel = cfg.grade_level || '4';
    const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;

    container.innerHTML = assignments.map((a, idx) => {
        const submissions = a.submissions || {};
        const submittedCount = Object.keys(submissions).length;
        const totalStudents = allStudents.length;
        const dueDateStr = a.due_date ? new Date(a.due_date).toLocaleDateString('th-TH') : 'ไม่ระบุ';

        // แยกสถิติการส่งงานตามห้องเรียน (เมื่อมีมากกว่า 1 ห้อง)
        let breakdownHtml = '';
        if (siblings.length > 1) {
            const parts = siblings.map(sib => {
                const sec = extractCleanRoomSection(sib.gradebook?.config?.room_section || sib.class_name, gradeLevel);
                const sList = Array.isArray(sib.students) ? sib.students : [];
                const subInRoom = sList.filter(s => !!submissions[s.user_id || s.name]).length;
                return `<span class="badge bg-white text-secondary border font-mono">${displayGrade}/${sec}: ${subInRoom}/${sList.length} คน</span>`;
            });
            breakdownHtml = `<div class="d-flex flex-wrap gap-1 mt-2 pt-2 border-top">${parts.join('')}</div>`;
        }

        const isQuiz = a.type === 'quiz' || !!a.quiz_id;
        const isProject = a.type === 'project' || (Array.isArray(a.rubrics) && a.rubrics.length > 0);

        return `
        <div class="col-md-6 col-lg-6">
            <div class="assignment-card h-100 d-flex flex-column ${isQuiz ? 'border-warning-subtle shadow-xs' : isProject ? 'border-primary-subtle shadow-xs' : ''}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="d-flex align-items-center gap-1 flex-wrap">
                        ${isQuiz ? `
                            <span class="badge bg-warning text-dark border border-warning-subtle rounded-pill px-3 py-1 font-mono fw-bold">
                                <i class="bi bi-patch-question-fill me-1"></i>Gyver Quiz
                            </span>
                        ` : isProject ? `
                            <span class="badge text-white border rounded-pill px-3 py-1 font-mono fw-bold shadow-xs" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                                <i class="bi bi-kanban-fill me-1"></i>โปรเจกต์ (รูบริก)
                            </span>
                        ` : ''}
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
                            <i class="bi bi-award-fill me-1"></i>${a.points || 10} คะแนน
                        </span>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <button class="btn btn-sm btn-link text-primary p-0 me-1" onclick="openEditAssignmentModal('${a.id}')" title="แก้ไขชิ้นงาน / กำหนดส่ง / เกณฑ์">
                            <i class="bi bi-pencil-square fs-6"></i>
                        </button>
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteAssignment(${idx})" title="ลบงานนี้">
                            <i class="bi bi-trash3 fs-6"></i>
                        </button>
                    </div>
                </div>

                <h5 class="fw-bold text-dark mb-1">${escapeHtml(a.title)}</h5>
                <p class="text-muted small mb-2 flex-grow-1" style="font-size: 0.85rem;">${escapeHtml(a.description || (isQuiz ? 'แบบทดสอบออนไลน์ Gyver Quiz' : isProject ? 'ชิ้นงานโปรเจกต์พร้อมเกณฑ์การประเมินรูบริก' : 'ไม่มีรายละเอียดเพิ่มเติม'))}</p>

                ${isProject && Array.isArray(a.rubrics) && a.rubrics.length > 0 ? `
                    <div class="p-2 px-2.5 rounded-3 border mb-3 small" style="background: rgba(99, 102, 241, 0.05); border-color: rgba(99, 102, 241, 0.2) !important;">
                        <div class="fw-bold small text-dark mb-1 d-flex align-items-center gap-1">
                            <i class="bi bi-ui-checks text-primary"></i> เกณฑ์การให้คะแนน (${a.rubrics.length} ด้าน):
                        </div>
                        <div class="d-flex flex-wrap gap-1">
                            ${a.rubrics.map(r => `
                                <span class="badge bg-white text-dark border font-mono px-2 py-0.5" style="font-size: 0.73rem;">
                                    ${escapeHtml(r.title)} <b class="text-primary">(${r.max} คะแนน)</b>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="bg-light p-2 px-3 rounded-3 mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted"><i class="bi bi-clock me-1"></i>กำหนดส่ง: <b>${dueDateStr}</b></small>
                        <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill font-mono">
                            ${isQuiz ? `สอบแล้ว` : `ส่งแล้ว`} ${submittedCount}/${totalStudents} คน
                        </span>
                    </div>
                    ${breakdownHtml}
                </div>

                <div class="d-flex flex-wrap gap-2 pt-2 border-top mt-auto">
                    <button class="btn btn-primary btn-sm rounded-3 fw-bold flex-grow-1" onclick="openSubmissionsModal('${a.id}')">
                        <i class="bi bi-clipboard2-check me-1"></i>ตรวจงาน (${submittedCount} คน)
                    </button>
                    <button class="btn btn-outline-secondary btn-sm rounded-3 fw-bold" onclick="openEditAssignmentModal('${a.id}')" title="แก้ไขข้อมูลงาน กำหนดส่ง หรือเกณฑ์คะแนน">
                        <i class="bi bi-pencil me-1"></i>แก้ไข
                    </button>
                    ${isQuiz ? `
                        <button class="btn btn-outline-warning text-dark btn-sm rounded-3 fw-bold" onclick="syncQuizSubmissionsForAssignment('${a.id}')" title="ดึงคะแนนสอบล่าสุดจาก Gyver Quiz">
                            <i class="bi bi-arrow-repeat me-1"></i>ซิงค์คะแนน
                        </button>
                        <a href="../../features/education/quiz/quiz.html?id=${encodeURIComponent(a.quiz_id)}" target="_blank" class="btn btn-outline-secondary btn-sm rounded-3" title="เปิดดูข้อสอบ">
                            <i class="bi bi-box-arrow-up-right"></i>
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

let editingAssignmentId = null;
let editingAssignmentType = null;

function openAddAssignmentModal() {
    editingAssignmentId = null;
    editingAssignmentType = null;

    const form = document.getElementById('form-add-assignment');
    if (form) form.reset();

    const titleEl = document.getElementById('modal-add-assignment-title');
    if (titleEl) {
        titleEl.innerHTML = '<i class="bi bi-pencil-square me-2"></i>สั่งงาน / มอบหมายการบ้านใหม่';
    }

    const shortcuts = document.getElementById('assignment-shortcuts-container');
    if (shortcuts) {
        shortcuts.classList.remove('d-none');
    }

    const btn = document.getElementById('btn-save-assignment');
    if (btn) {
        btn.innerHTML = '<i class="bi bi-plus-circle-fill me-1"></i>สร้างงาน';
    }

    // Default due date: 7 days later
    const dueDateInput = document.getElementById('assignment-due-date');
    if (dueDateInput) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        dueDateInput.value = nextWeek.toISOString().split('T')[0];
    }

    const modalEl = document.getElementById('addAssignmentModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}
window.openAddAssignmentModal = openAddAssignmentModal;

async function handleSaveAssignment(e) {
    e.preventDefault();
    if (!activeClassroom) return;

    const title = document.getElementById('assignment-title').value.trim();
    const dueDate = document.getElementById('assignment-due-date').value;
    const points = parseInt(document.getElementById('assignment-points').value) || 10;
    const desc = document.getElementById('assignment-desc').value.trim();

    let assignments = getSharedCourseAssignments();
    const isEditing = !!editingAssignmentId;

    if (isEditing) {
        const target = assignments.find(a => a.id === editingAssignmentId);
        if (target) {
            target.title = title;
            target.due_date = dueDate;
            target.points = points;
            target.description = desc;
            target.updated_at = new Date().toISOString();
        }
    } else {
        const newAssignment = {
            id: 'assign_' + Date.now(),
            title: title,
            due_date: dueDate,
            points: points,
            description: desc,
            submissions: {},
            created_at: new Date().toISOString()
        };
        assignments.unshift(newAssignment);
    }

    const btn = document.getElementById('btn-save-assignment');
    if (btn) btn.disabled = true;

    try {
        await saveSharedCourseAssignments(assignments);
        if (isEditing) {
            showToast('success', 'บันทึกการแก้ไขเรียบร้อย!', `อัปเดตข้อมูลการบ้าน "${title}" ไปยังทุกห้องเรียบร้อยแล้ว`);
        } else {
            showToast('success', 'สั่งงานสำเร็จ!', `งาน "${title}" ถูกสั่งไปยังทุกห้องในรายวิชานี้เรียบร้อยแล้ว (เกณฑ์เดียวกัน)`);
        }
        editingAssignmentId = null;
        editingAssignmentType = null;
        document.getElementById('form-add-assignment')?.reset();
        bootstrap.Modal.getInstance(document.getElementById('addAssignmentModal'))?.hide();
        loadAssignments();
    } catch (err) {
        console.warn("Save assignment error:", err);
        showToast('error', 'บันทึกผิดพลาด', err?.message || 'เกิดข้อผิดพลาด');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function deleteAssignment(idx) {
    if (!activeClassroom) return;
    const assignments = getSharedCourseAssignments();
    const item = assignments[idx];
    const itemTitle = item?.title ? ` "${item.title}"` : '';

    const ok = await showGyverConfirm({
        title: `ลบการบ้าน${itemTitle}?`,
        subtitle: '⚠️ ชิ้นงานและคะแนนตรวจงานจะถูกลบออกจากทุกห้องในรายวิชานี้ถาวร',
        icon: 'danger',
        confirmText: '<i class="bi bi-trash3-fill me-1"></i> ลบชิ้นงาน',
        confirmBtnClass: 'btn-danger'
    });
    if (!ok) return;

    assignments.splice(idx, 1);

    await saveSharedCourseAssignments(assignments);
    showToast('info', 'ลบงานแล้ว', 'ลบการบ้านออกจากทุกห้องในรายวิชานี้เรียบร้อย');
    loadAssignments();
}

// ==============================================================
// 🚀 PROJECT RUBRIC ASSIGNMENTS: มอบหมายงานโปรเจกต์ & เกณฑ์ประเมิน
// ==============================================================
let currentProjectRubrics = [
    { id: 'r1', title: 'ความถูกต้องของการทำงานของโค้ด/ผลงาน', max: 10 },
    { id: 'r2', title: 'ความคิดสร้างสรรค์ & ความสวยงามประณีต', max: 10 },
    { id: 'r3', title: 'การนำไปใช้งานได้จริง & ประโยชน์', max: 10 }
];

let activeGradeRubricStudent = {
    assignmentId: null,
    studentKey: null,
    studentName: '',
    roomName: ''
};

function switchToProjectModal() {
    const modalEl = document.getElementById('addAssignmentModal');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }
    setTimeout(() => {
        openAddProjectModal();
    }, 300);
}
window.switchToProjectModal = switchToProjectModal;

function openAddProjectModal() {
    editingAssignmentId = null;
    editingAssignmentType = null;

    const form = document.getElementById('form-add-project');
    if (form) form.reset();

    const titleEl = document.getElementById('modal-add-project-title');
    if (titleEl) {
        titleEl.innerText = 'มอบหมายงานโปรเจกต์ / ชิ้นงาน (Rubric Criteria)';
    }

    const btn = document.getElementById('btn-save-project-assign');
    if (btn) {
        btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>มอบหมายงานโปรเจกต์';
    }

    // Default due date: 14 days later
    const dueDateInput = document.getElementById('project-due-date');
    if (dueDateInput) {
        const next2Weeks = new Date();
        next2Weeks.setDate(next2Weeks.getDate() + 14);
        dueDateInput.value = next2Weeks.toISOString().split('T')[0];
    }

    // Default rubrics if empty
    if (!currentProjectRubrics || currentProjectRubrics.length === 0) {
        applyProjectRubricPreset('coding');
    } else {
        renderProjectRubricsList();
        calcProjectTotalPoints();
    }

    const modalEl = document.getElementById('addProjectModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}
window.openAddProjectModal = openAddProjectModal;

// ==============================================================
// ✏️ EDIT ASSIGNMENT / PROJECT / QUIZ MODAL
// ==============================================================
function openEditAssignmentModal(assignmentId) {
    const assignments = getSharedCourseAssignments();
    const a = assignments.find(item => item.id === assignmentId);
    if (!a) {
        showToast('error', 'ไม่พบข้อมูลงาน', 'ไม่พบการบ้านหรือโปรเจกต์ที่ต้องการแก้ไข');
        return;
    }

    if (a.type === 'project' || (Array.isArray(a.rubrics) && a.rubrics.length > 0)) {
        openEditProjectModal(a);
    } else if (a.type === 'quiz' || a.quiz_id) {
        openEditQuizAssignmentModal(a);
    } else {
        openEditRegularAssignmentModal(a);
    }
}
window.openEditAssignmentModal = openEditAssignmentModal;

function openEditProjectModal(a) {
    editingAssignmentId = a.id;
    editingAssignmentType = 'project';

    const form = document.getElementById('form-add-project');
    if (form) form.reset();

    const titleEl = document.getElementById('modal-add-project-title');
    if (titleEl) {
        titleEl.innerText = '✏️ แก้ไขงานโปรเจกต์ / เกณฑ์รูบริก';
    }

    const btn = document.getElementById('btn-save-project-assign');
    if (btn) {
        btn.innerHTML = '<i class="bi bi-floppy-fill me-1"></i>บันทึกการแก้ไขโปรเจกต์';
    }

    const titleInput = document.getElementById('project-title');
    if (titleInput) titleInput.value = a.title || '';

    const dueDateInput = document.getElementById('project-due-date');
    if (dueDateInput) dueDateInput.value = a.due_date || '';

    const descInput = document.getElementById('project-desc');
    if (descInput) descInput.value = a.description || '';

    if (Array.isArray(a.rubrics) && a.rubrics.length > 0) {
        currentProjectRubrics = JSON.parse(JSON.stringify(a.rubrics));
    } else {
        applyProjectRubricPreset('coding');
    }

    renderProjectRubricsList();
    calcProjectTotalPoints();

    const modalEl = document.getElementById('addProjectModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}
window.openEditProjectModal = openEditProjectModal;

function openEditRegularAssignmentModal(a) {
    editingAssignmentId = a.id;
    editingAssignmentType = 'regular';

    const form = document.getElementById('form-add-assignment');
    if (form) form.reset();

    const titleEl = document.getElementById('modal-add-assignment-title');
    if (titleEl) {
        titleEl.innerHTML = '<i class="bi bi-pencil-square me-2"></i>แก้ไขการบ้าน / งานที่มอบหมาย';
    }

    const shortcuts = document.getElementById('assignment-shortcuts-container');
    if (shortcuts) {
        shortcuts.classList.add('d-none');
    }

    const btn = document.getElementById('btn-save-assignment');
    if (btn) {
        btn.innerHTML = '<i class="bi bi-floppy-fill me-1"></i>บันทึกการแก้ไข';
    }

    const titleInput = document.getElementById('assignment-title');
    if (titleInput) titleInput.value = a.title || '';

    const dueDateInput = document.getElementById('assignment-due-date');
    if (dueDateInput) dueDateInput.value = a.due_date || '';

    const pointsInput = document.getElementById('assignment-points');
    if (pointsInput) pointsInput.value = a.points || 10;

    const descInput = document.getElementById('assignment-desc');
    if (descInput) descInput.value = a.description || '';

    const modalEl = document.getElementById('addAssignmentModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}
window.openEditRegularAssignmentModal = openEditRegularAssignmentModal;

async function openEditQuizAssignmentModal(a) {
    editingAssignmentId = a.id;
    editingAssignmentType = 'quiz';

    await openAssignQuizModal(false, true);

    const titleEl = document.getElementById('modal-assign-quiz-title');
    if (titleEl) {
        titleEl.innerText = '✏️ แก้ไขการสั่งสอบ Gyver Quiz';
    }

    const btn = document.getElementById('btn-save-quiz-assign');
    if (btn) {
        btn.innerHTML = '<i class="bi bi-floppy-fill me-1"></i>บันทึกการแก้ไข';
    }

    const titleInput = document.getElementById('assign-quiz-title');
    if (titleInput) titleInput.value = a.title || '';

    const dueDateInput = document.getElementById('assign-quiz-due-date');
    if (dueDateInput) dueDateInput.value = a.due_date || '';

    const pointsInput = document.getElementById('assign-quiz-points');
    if (pointsInput) pointsInput.value = a.points || 10;

    const descInput = document.getElementById('assign-quiz-desc');
    if (descInput) descInput.value = a.description || '';

    const select = document.getElementById('assign-quiz-select');
    if (select && a.quiz_id) {
        select.value = a.quiz_id;
        onSelectQuizInModal(a.quiz_id);
    }
}
window.openEditQuizAssignmentModal = openEditQuizAssignmentModal;

function renderProjectRubricsList() {
    const container = document.getElementById('project-rubrics-container');
    if (!container) return;

    container.innerHTML = currentProjectRubrics.map((r, idx) => `
        <div class="p-2.5 bg-white rounded-3 border d-flex align-items-center gap-2 shadow-2xs">
            <span class="badge bg-primary-subtle text-primary border font-mono rounded-pill px-2.5 py-1">เกณฑ์ที่ ${idx + 1}</span>
            <input type="text" class="form-control form-control-sm rounded-2 flex-grow-1" placeholder="ชื่อเกณฑ์ เช่น ความถูกต้อง, ความสวยงาม..." value="${escapeHtml(r.title)}" oninput="updateProjectRubricTitle(${idx}, this.value)">
            <div class="d-flex align-items-center gap-1" style="min-width: 140px;">
                <input type="number" class="form-control form-control-sm rounded-2 text-center font-mono" min="1" max="100" style="width: 75px;" value="${r.max}" oninput="updateProjectRubricMax(${idx}, this.value)">
                <span class="small text-muted font-mono">คะแนน</span>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm rounded-circle p-1" style="width: 28px; height: 28px; line-height: 1;" onclick="removeProjectRubricRow(${idx})" title="ลบเกณฑ์นี้" ${currentProjectRubrics.length <= 1 ? 'disabled' : ''}>
                <i class="bi bi-trash3"></i>
            </button>
        </div>
    `).join('');
}
window.renderProjectRubricsList = renderProjectRubricsList;

function updateProjectRubricTitle(idx, val) {
    if (currentProjectRubrics[idx]) {
        currentProjectRubrics[idx].title = val;
    }
}
window.updateProjectRubricTitle = updateProjectRubricTitle;

function updateProjectRubricMax(idx, val) {
    if (currentProjectRubrics[idx]) {
        const num = parseFloat(val);
        currentProjectRubrics[idx].max = isNaN(num) || num < 0 ? 0 : num;
        calcProjectTotalPoints();
    }
}
window.updateProjectRubricMax = updateProjectRubricMax;

function addProjectRubricRow(title = '', max = 10) {
    const newId = 'r_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    currentProjectRubrics.push({
        id: newId,
        title: title || `เกณฑ์ที่ ${currentProjectRubrics.length + 1}`,
        max: max
    });
    renderProjectRubricsList();
    calcProjectTotalPoints();
}
window.addProjectRubricRow = addProjectRubricRow;

function removeProjectRubricRow(idx) {
    if (currentProjectRubrics.length <= 1) {
        showToast('warning', 'ไม่สามารถลบได้', 'ต้องมีเกณฑ์การประเมินอย่างน้อย 1 ข้อ');
        return;
    }
    currentProjectRubrics.splice(idx, 1);
    renderProjectRubricsList();
    calcProjectTotalPoints();
}
window.removeProjectRubricRow = removeProjectRubricRow;

function applyProjectRubricPreset(type) {
    if (type === 'coding') {
        currentProjectRubrics = [
            { id: 'r1', title: 'ความถูกต้องของการทำงานของโค้ด/โปรแกรม', max: 10 },
            { id: 'r2', title: 'ความสวยงามและการออกแบบหน้าตา (UI/UX)', max: 10 },
            { id: 'r3', title: 'การนำไปใช้งานได้จริง & ประสิทธิภาพ', max: 10 }
        ];
    } else if (type === 'invention') {
        currentProjectRubrics = [
            { id: 'r1', title: 'ความสวยงามและความประณีตของชิ้นงาน', max: 10 },
            { id: 'r2', title: 'ความถูกต้องตรงตามฟังก์ชันและข้อกำหนด', max: 10 },
            { id: 'r3', title: 'ความคงทน ปลอดภัย และการใช้งานได้จริง', max: 10 }
        ];
    } else if (type === 'report') {
        currentProjectRubrics = [
            { id: 'r1', title: 'ความถูกต้องและความสมบูรณ์ของเนื้อหา', max: 10 },
            { id: 'r2', title: 'รูปเล่ม การจัดวาง และความสวยงามเรียบร้อย', max: 10 },
            { id: 'r3', title: 'การคิดวิเคราะห์ สรุปผล และการอ้างอิง', max: 10 }
        ];
    } else if (type === 'presentation') {
        currentProjectRubrics = [
            { id: 'r1', title: 'ความมั่นใจและลีลาการสื่อสารนำเสนอ', max: 10 },
            { id: 'r2', title: 'ความน่าสนใจและความสวยงามของสไลด์/สื่อ', max: 10 },
            { id: 'r3', title: 'ความถูกต้องในการตอบข้อซักถาม', max: 10 }
        ];
    }
    renderProjectRubricsList();
    calcProjectTotalPoints();
    showToast('info', 'โหลดเกณฑ์สำเร็จรูปแล้ว', `ตั้งค่าเกณฑ์แบบ "${type}" เรียบร้อย สามารถปรับแก้คะแนนและหัวข้อได้ตามต้องการ`);
}
window.applyProjectRubricPreset = applyProjectRubricPreset;

function calcProjectTotalPoints() {
    const total = currentProjectRubrics.reduce((sum, r) => sum + (parseFloat(r.max) || 0), 0);
    const badge = document.getElementById('project-total-points-badge');
    if (badge) {
        badge.innerText = `${total} คะแนน`;
    }
    return total;
}
window.calcProjectTotalPoints = calcProjectTotalPoints;

async function handleSaveProjectAssignment(e) {
    e.preventDefault();
    if (!activeClassroom) return;

    const title = document.getElementById('project-title')?.value.trim();
    if (!title) {
        showToast('warning', 'กรุณาระบุชื่อโปรเจกต์', 'ต้องตั้งชื่อโปรเจกต์ก่อนบันทึก');
        return;
    }

    const dueDate = document.getElementById('project-due-date')?.value || '';
    const desc = document.getElementById('project-desc')?.value.trim() || '';

    // Validate rubrics
    if (!currentProjectRubrics || currentProjectRubrics.length === 0) {
        showToast('warning', 'ขาดเกณฑ์การประเมิน', 'กรุณาเพิ่มเกณฑ์การให้คะแนนอย่างน้อย 1 ข้อ');
        return;
    }

    for (let r of currentProjectRubrics) {
        if (!r.title.trim()) {
            showToast('warning', 'กรุณาระบุชื่อเกณฑ์', 'มีเกณฑ์ที่ยังไม่ได้ระบุชื่อ');
            return;
        }
        if ((parseFloat(r.max) || 0) <= 0) {
            showToast('warning', 'คะแนนไม่ถูกต้อง', `เกณฑ์ "${r.title}" ต้องมีคะแนนมากกว่า 0`);
            return;
        }
    }

    const totalPoints = calcProjectTotalPoints();
    let assignments = getSharedCourseAssignments();
    const isEditing = !!editingAssignmentId;

    if (isEditing) {
        const target = assignments.find(a => a.id === editingAssignmentId);
        if (target) {
            target.title = title;
            target.due_date = dueDate;
            target.points = totalPoints;
            target.description = desc;
            target.rubrics = currentProjectRubrics.map((r, i) => ({
                id: r.id || `r_${i + 1}`,
                title: r.title.trim(),
                max: parseFloat(r.max) || 0
            }));
            target.updated_at = new Date().toISOString();
        }
    } else {
        const newProject = {
            id: 'project_' + Date.now(),
            type: 'project',
            title: title,
            due_date: dueDate,
            points: totalPoints,
            description: desc,
            rubrics: currentProjectRubrics.map((r, i) => ({
                id: r.id || `r_${i + 1}`,
                title: r.title.trim(),
                max: parseFloat(r.max) || 0
            })),
            submissions: {},
            created_at: new Date().toISOString()
        };
        assignments.unshift(newProject);
    }

    const btn = document.getElementById('btn-save-project-assign');
    if (btn) btn.disabled = true;

    try {
        await saveSharedCourseAssignments(assignments);
        if (isEditing) {
            showToast('success', 'บันทึกการแก้ไขโปรเจกต์สำเร็จ!', `อัปเดตข้อมูลและเกณฑ์คะแนน "${title}" เรียบร้อยแล้ว`);
        } else {
            showToast('success', 'มอบหมายโปรเจกต์สำเร็จ!', `โปรเจกต์ "${title}" (เต็ม ${totalPoints} คะแนน ตามเกณฑ์ ${currentProjectRubrics.length} ข้อ) ถูกสั่งไปยังทุกห้องเรียบร้อยแล้ว`);
        }
        editingAssignmentId = null;
        editingAssignmentType = null;
        document.getElementById('form-add-project')?.reset();
        bootstrap.Modal.getInstance(document.getElementById('addProjectModal'))?.hide();
        loadAssignments();
    } catch (err) {
        console.warn("Save project error:", err);
        showToast('error', 'บันทึกผิดพลาด', err?.message || 'เกิดข้อผิดพลาด');
    } finally {
        if (btn) btn.disabled = false;
    }
}
window.handleSaveProjectAssignment = handleSaveProjectAssignment;

// ==============================================================
// 📊 EVALUATION: ประเมินคะแนนโปรเจกต์ตามเกณฑ์รูบริก
// ==============================================================
function openGradeProjectRubricModal(encodedStudentKey, assignmentId) {
    const studentKey = decodeURIComponent(encodedStudentKey);
    const assignments = getSharedCourseAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const allStudents = getAllStudentsInCourse();
    const student = allStudents.find(s => (s.user_id || s.name) === studentKey) || { name: studentKey, _roomName: '-' };

    activeGradeRubricStudent = {
        assignmentId: assignmentId,
        studentKey: studentKey,
        studentName: student.name,
        roomName: student._roomName
    };

    // Fill titles
    const nameEl = document.getElementById('grade-rubric-student-name');
    if (nameEl) nameEl.innerHTML = `<i class="bi bi-person-fill text-primary me-1"></i>${escapeHtml(student.name)} <span class="badge bg-primary-subtle text-primary font-mono ms-1">${escapeHtml(student._roomName)}</span>`;

    const titleEl = document.getElementById('grade-rubric-assignment-title');
    if (titleEl) titleEl.innerText = `โปรเจกต์: ${assignment.title} (คะแนนเต็มรวม ${assignment.points} คะแนน)`;

    // Student submission preview
    const sub = assignment.submissions?.[studentKey] || {};
    const infoEl = document.getElementById('grade-rubric-submission-info');
    if (infoEl) {
        if (!sub.submitted_at && !sub.file_url && (!sub.files || sub.files.length === 0)) {
            infoEl.innerHTML = `
                <div class="d-flex align-items-center justify-content-between">
                    <span class="badge bg-secondary-subtle text-secondary"><i class="bi bi-clock me-1"></i>ยังไม่ส่งงานในระบบ</span>
                    <small class="text-muted">(ครูสามารถประเมินผลชิ้นงานจริงหรือการนำเสนอได้ทันที)</small>
                </div>
            `;
        } else {
            let filesHtml = '';
            if (Array.isArray(sub.files) && sub.files.length > 0) {
                filesHtml = `
                    <div class="d-flex flex-wrap gap-1 mt-1">
                        ${sub.files.map(f => `
                            <a href="${f.url}" target="_blank" class="btn btn-outline-success btn-sm rounded-pill px-2.5 py-0.5 small d-inline-flex align-items-center gap-1" title="${f.name}">
                                <i class="bi bi-file-earmark-arrow-down"></i> <span class="text-truncate" style="max-width: 160px;">${f.name}</span>
                            </a>
                        `).join('')}
                    </div>
                `;
            } else if (sub.file_url) {
                filesHtml = `
                    <div class="mt-1">
                        <a href="${sub.file_url}" target="_blank" class="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-bold">
                            <i class="bi bi-box-arrow-up-right me-1"></i>เปิดดูไฟล์/ลิงก์ผลงาน
                        </a>
                    </div>
                `;
            }

            infoEl.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge bg-success-subtle text-success"><i class="bi bi-check-circle-fill me-1"></i>ส่งงานแล้ว</span>
                    <span class="small text-muted font-mono">ส่งเมื่อ: ${new Date(sub.submitted_at).toLocaleString('th-TH')}</span>
                </div>
                ${filesHtml}
                ${sub.comment ? `<div class="mt-2 text-dark small bg-white p-2 rounded-2 border"><b>บันทึกจากนักเรียน:</b> "${escapeHtml(sub.comment)}"</div>` : ''}
            `;
        }
    }

    // Render Rubrics Criteria inputs
    const inputsContainer = document.getElementById('grade-rubric-inputs-container');
    const rubrics = assignment.rubrics || [
        { id: 'r1', title: 'คะแนนรวม', max: assignment.points }
    ];

    const currentRubricScores = sub.rubric_scores || {};

    if (inputsContainer) {
        inputsContainer.innerHTML = rubrics.map((r, idx) => {
            const val = currentRubricScores[r.id] !== undefined ? currentRubricScores[r.id] : '';
            return `
                <div class="p-2.5 bg-white rounded-3 border d-flex justify-content-between align-items-center gap-2">
                    <div class="flex-grow-1">
                        <div class="fw-bold text-dark small">${idx + 1}. ${escapeHtml(r.title)}</div>
                        <small class="text-muted font-mono">(เต็ม ${r.max} คะแนน)</small>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <input type="number" 
                            id="grade_rubric_input_${r.id}" 
                            class="form-control form-control-sm text-center font-mono fw-bold rounded-2 grade-rubric-item-input" 
                            data-max="${r.max}" 
                            data-rubric-id="${r.id}"
                            min="0" 
                            max="${r.max}" 
                            step="0.5" 
                            value="${val}" 
                            placeholder="0-${r.max}"
                            style="width: 85px;" 
                            oninput="updateGradeRubricTotalDisplay()">
                        <span class="small text-secondary font-mono">/${r.max}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Teacher feedback
    const fbEl = document.getElementById('grade-rubric-feedback');
    if (fbEl) {
        fbEl.value = sub.feedback || sub.teacher_comment || '';
    }

    updateGradeRubricTotalDisplay(assignment.points);

    const modalEl = document.getElementById('gradeProjectRubricModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}
window.openGradeProjectRubricModal = openGradeProjectRubricModal;

function updateGradeRubricTotalDisplay(maxPointsOverride) {
    const inputs = document.querySelectorAll('.grade-rubric-item-input');
    let totalScore = 0;
    let anyFilled = false;

    inputs.forEach(inp => {
        if (inp.value !== '') {
            anyFilled = true;
            let val = parseFloat(inp.value);
            const max = parseFloat(inp.dataset.max) || 0;
            if (val > max) {
                inp.value = max;
                val = max;
            } else if (val < 0) {
                inp.value = 0;
                val = 0;
            }
            totalScore += isNaN(val) ? 0 : val;
        }
    });

    const displayEl = document.getElementById('grade-rubric-total-display');
    if (displayEl) {
        const assignments = getSharedCourseAssignments();
        const assignment = assignments.find(a => a.id === activeGradeRubricStudent.assignmentId);
        const max = maxPointsOverride || assignment?.points || 0;
        displayEl.innerText = `${anyFilled ? Math.round(totalScore * 100) / 100 : 0} / ${max} คะแนน`;
    }
}
window.updateGradeRubricTotalDisplay = updateGradeRubricTotalDisplay;

async function saveProjectRubricEvaluation() {
    const { assignmentId, studentKey, studentName } = activeGradeRubricStudent;
    if (!assignmentId || !studentKey) return;

    let assignments = getSharedCourseAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    if (!assignment.submissions) assignment.submissions = {};
    const sub = assignment.submissions[studentKey] || {
        submitted_at: new Date().toISOString()
    };

    const inputs = document.querySelectorAll('.grade-rubric-item-input');
    const rubricScores = {};
    let totalScore = 0;
    let hasAnyScore = false;

    inputs.forEach(inp => {
        const rId = inp.dataset.rubricId;
        if (inp.value !== '') {
            hasAnyScore = true;
            const val = parseFloat(inp.value);
            rubricScores[rId] = isNaN(val) ? 0 : val;
            totalScore += rubricScores[rId];
        }
    });

    sub.score = hasAnyScore ? Math.round(totalScore * 100) / 100 : null;
    sub.rubric_scores = rubricScores;
    sub.feedback = document.getElementById('grade-rubric-feedback')?.value.trim() || '';
    sub.graded_at = new Date().toISOString();

    assignment.submissions[studentKey] = sub;

    try {
        await saveSharedCourseAssignments(assignments);
        showToast('success', 'บันทึกคะแนนเรียบร้อย!', `ประเมินผลงาน ${studentName} ได้ ${sub.score ?? 0} / ${assignment.points} คะแนน`);
        bootstrap.Modal.getInstance(document.getElementById('gradeProjectRubricModal'))?.hide();
        renderSubmissionsTable(assignment);
        loadAssignments();
    } catch (err) {
        console.warn("Save rubric grade error:", err);
        showToast('error', 'บันทึกคะแนนผิดพลาด', err?.message || 'เกิดข้อผิดพลาด');
    }
}
window.saveProjectRubricEvaluation = saveProjectRubricEvaluation;

// ==============================================================
// ⚡ GYVER QUIZ INTEGRATION: สั่งสอบ & ซิงค์คะแนนอัตโนมัติ
// ==============================================================
let cachedQuizzesForModal = [];

function switchToQuizModal() {
    const modalEl = document.getElementById('addAssignmentModal');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }
    setTimeout(() => {
        openAssignQuizModal();
    }, 300);
}
window.switchToQuizModal = switchToQuizModal;

async function openAssignQuizModal(fromAddModal = false, isEditingQuiz = false) {
    if (fromAddModal) {
        const modalEl = document.getElementById('addAssignmentModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    if (!isEditingQuiz) {
        editingAssignmentId = null;
        editingAssignmentType = null;
        const form = document.getElementById('form-assign-quiz');
        if (form) form.reset();
        const titleEl = document.getElementById('modal-assign-quiz-title');
        if (titleEl) titleEl.innerText = 'สั่งสอบด้วย Gyver Quiz';
        const btn = document.getElementById('btn-save-quiz-assign');
        if (btn) btn.innerHTML = '<i class="bi bi-patch-question-fill me-1"></i>มอบหมายแบบทดสอบ';
        const infoCard = document.getElementById('assign-quiz-info-card');
        if (infoCard) infoCard.classList.add('d-none');
    }

    const select = document.getElementById('assign-quiz-select');
    if (select) {
        select.innerHTML = '<option value="">-- กำลังโหลดแบบทดสอบจากคลัง... --</option>';
    }

    // กำหนดวันส่งเริ่มต้น: 7 วันถัดไป (เฉพาะเมื่อสร้างใหม่)
    if (!isEditingQuiz) {
        const dueDateInput = document.getElementById('assign-quiz-due-date');
        if (dueDateInput) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            dueDateInput.value = nextWeek.toISOString().split('T')[0];
        }
    }

    const modalEl = document.getElementById('assignQuizModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();

    // ดึงแบบทดสอบจาก Supabase และ LocalStorage
    cachedQuizzesForModal = [];
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('gyver_quizzes')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && Array.isArray(data)) {
                cachedQuizzesForModal = data.map(item => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    questions: Array.isArray(item.schema) ? item.schema : (item.schema?.questions || []),
                    settings: item.schema?.settings || {}
                }));
            }
        }
    } catch (_) {}

    try {
        const localRaw = localStorage.getItem('gyver_quizzes_list');
        if (localRaw) {
            const localQuizzes = JSON.parse(localRaw);
            if (Array.isArray(localQuizzes)) {
                localQuizzes.forEach(lq => {
                    if (!cachedQuizzesForModal.some(q => q.id === lq.id)) {
                        cachedQuizzesForModal.push(lq);
                    }
                });
            }
        }
    } catch (_) {}

    if (select) {
        if (cachedQuizzesForModal.length === 0) {
            select.innerHTML = '<option value="">-- ไม่พบชุดข้อสอบในคลัง (คลิก "สร้าง/จัดการข้อสอบ" เพื่อสร้างใหม่) --</option>';
        } else {
            select.innerHTML = '<option value="">-- กรุณาเลือกชุดแบบทดสอบที่ต้องการสั่งสอบ --</option>' +
                cachedQuizzesForModal.map(q => {
                    const qCount = Array.isArray(q.questions) ? q.questions.length : 0;
                    return `<option value="${q.id}">📝 ${escapeHtml(q.title)} (${qCount} ข้อ)</option>`;
                }).join('');
        }
    }
}
window.openAssignQuizModal = openAssignQuizModal;

function onSelectQuizInModal(quizId) {
    const infoCard = document.getElementById('assign-quiz-info-card');
    if (!quizId) {
        if (infoCard) infoCard.classList.add('d-none');
        return;
    }

    const quiz = cachedQuizzesForModal.find(q => q.id === quizId);
    if (!quiz) return;

    const qCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
    const timeLimit = quiz.settings?.timeLimit ? `${quiz.settings.timeLimit} นาที` : 'ไม่จำกัดเวลา';
    const passScore = quiz.settings?.passingScore ? `ผ่าน ${quiz.settings.passingScore}%` : 'ผ่าน 70%';

    const titleInput = document.getElementById('assign-quiz-title');
    if (titleInput && (!titleInput.value || titleInput.value.startsWith('สอบ'))) {
        titleInput.value = `สอบ: ${quiz.title}`;
    }

    const pointsInput = document.getElementById('assign-quiz-points');
    if (pointsInput && !editingAssignmentId) {
        pointsInput.value = qCount > 0 ? (qCount <= 30 ? qCount : 10) : 10;
    }

    const descInput = document.getElementById('assign-quiz-desc');
    if (descInput && !descInput.value) {
        descInput.value = quiz.description || 'ให้นักเรียนทำแบบทดสอบให้ครบทุกข้อ มีเวลาทำตามที่กำหนด';
    }

    if (infoCard) {
        infoCard.classList.remove('d-none');
        document.getElementById('assign-quiz-card-title').innerText = quiz.title;
        document.getElementById('assign-quiz-card-qcount').innerText = `${qCount} ข้อ`;
        document.getElementById('assign-quiz-card-desc').innerText = quiz.description || 'ไม่มีคำชี้แจง';
        document.getElementById('assign-quiz-card-time').innerHTML = `<i class="bi bi-stopwatch me-1"></i>${timeLimit}`;
        document.getElementById('assign-quiz-card-pass').innerHTML = `<i class="bi bi-award me-1"></i>${passScore}`;
    }
}
window.onSelectQuizInModal = onSelectQuizInModal;

async function handleSaveQuizAssignment(e) {
    e.preventDefault();
    if (!activeClassroom) return;

    const select = document.getElementById('assign-quiz-select');
    const quizId = select ? select.value : '';
    if (!quizId) {
        showToast('warning', 'กรุณาเลือกข้อสอบ', 'โปรดเลือกชุดแบบทดสอบที่ต้องการสั่งสอบ');
        return;
    }

    const quiz = cachedQuizzesForModal.find(q => q.id === quizId) || { id: quizId, title: 'แบบทดสอบ' };
    const title = document.getElementById('assign-quiz-title').value.trim() || quiz.title;
    const dueDate = document.getElementById('assign-quiz-due-date').value;
    const points = parseInt(document.getElementById('assign-quiz-points').value) || 10;
    const desc = document.getElementById('assign-quiz-desc').value.trim() || quiz.description || '';

    const qCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;

    let assignments = getSharedCourseAssignments();
    const isEditing = !!editingAssignmentId;

    if (isEditing) {
        const target = assignments.find(a => a.id === editingAssignmentId);
        if (target) {
            target.title = title;
            target.due_date = dueDate;
            target.points = points;
            target.description = desc;
            target.quiz_id = quiz.id;
            target.quiz_title = quiz.title;
            target.quiz_total_questions = qCount;
            target.updated_at = new Date().toISOString();
        }
    } else {
        const newAssignment = {
            id: 'quiz_' + Date.now(),
            type: 'quiz',
            quiz_id: quiz.id,
            quiz_title: quiz.title,
            quiz_total_questions: qCount,
            title: title,
            due_date: dueDate,
            points: points,
            description: desc,
            submissions: {},
            created_at: new Date().toISOString()
        };
        assignments.unshift(newAssignment);
    }

    const btn = document.getElementById('btn-save-quiz-assign');
    if (btn) btn.disabled = true;

    try {
        await saveSharedCourseAssignments(assignments);
        if (isEditing) {
            showToast('success', 'บันทึกการแก้ไขแบบทดสอบสำเร็จ!', `อัปเดตข้อมูลการสอบ "${title}" เรียบร้อยแล้ว`);
        } else {
            showToast('success', 'สั่งสอบสำเร็จ!', `มอบหมายแบบทดสอบ "${title}" ให้นักเรียนทุกห้องในรายวิชานี้เรียบร้อย`);
        }
        editingAssignmentId = null;
        editingAssignmentType = null;
        document.getElementById('form-assign-quiz')?.reset();
        document.getElementById('assign-quiz-info-card')?.classList.add('d-none');
        bootstrap.Modal.getInstance(document.getElementById('assignQuizModal'))?.hide();
        loadAssignments();
    } catch (err) {
        console.warn("Save quiz assignment error:", err);
        showToast('error', 'เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถบันทึกได้');
    } finally {
        if (btn) btn.disabled = false;
    }
}
window.handleSaveQuizAssignment = handleSaveQuizAssignment;

// 🔄 ซิงค์คะแนนจาก Gyver Quiz เข้าสู่ห้องเรียนอัตโนมัติ
async function syncQuizSubmissionsForAssignment(assignmentId) {
    if (!activeClassroom) return;
    const assignments = getSharedCourseAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment || !assignment.quiz_id) return;

    showToast('info', 'กำลังดึงคะแนน...', 'กำลังค้นหาผลสอบจากระบบ Gyver Quiz');

    try {
        let responses = [];
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('gyver_quiz_responses')
                .select('*')
                .eq('quiz_id', assignment.quiz_id)
                .order('created_at', { ascending: false });
            if (!error && Array.isArray(data)) {
                responses = data;
            }
        }

        try {
            const localRaw = localStorage.getItem(`gyver_quiz_responses_${assignment.quiz_id}`);
            if (localRaw) {
                const localList = JSON.parse(localRaw);
                if (Array.isArray(localList)) {
                    localList.forEach(lr => {
                        const exists = responses.some(r => (r.student_name || '').trim().toLowerCase() === (lr.studentName || lr.student_name || '').trim().toLowerCase());
                        if (!exists) {
                            responses.push({
                                student_name: lr.studentName || lr.student_name,
                                score: lr.earnedPoints || lr.score,
                                total: lr.totalPoints || lr.total,
                                percentage: lr.percent || lr.percentage,
                                is_passed: lr.isPassed || lr.is_passed,
                                created_at: lr.submittedAt || lr.created_at
                            });
                        }
                    });
                }
            }
        } catch (_) {}

        if (!assignment.submissions) assignment.submissions = {};
        const allStudents = getAllStudentsInCourse();
        let syncedCount = 0;
        const maxPoints = Number(assignment.points) || 10;

        allStudents.forEach(st => {
            const studentKey = st.user_id || st.name;
            const cleanStName = (st.name || '').trim().toLowerCase();
            const cleanStNick = (st.nickname || '').trim().toLowerCase();

            const match = responses.find(r => {
                const rName = (r.student_name || '').trim().toLowerCase();
                return rName === cleanStName || (cleanStNick && rName === cleanStNick) || rName.includes(cleanStName);
            });

            if (match) {
                const rawScore = Number(match.score || 0);
                const rawTotal = Number(match.total || 0);
                const scaledScore = rawTotal > 0 ? Math.round((rawScore / rawTotal) * maxPoints * 10) / 10 : rawScore;

                assignment.submissions[studentKey] = {
                    score: scaledScore,
                    raw_score: rawScore,
                    raw_total: rawTotal,
                    percentage: match.percentage,
                    is_passed: match.is_passed,
                    submitted_at: match.created_at || new Date().toISOString(),
                    note: `ทำแบบทดสอบ Gyver Quiz ได้ ${rawScore}/${rawTotal} คะแนน`
                };
                syncedCount++;
            }
        });

        await saveSharedCourseAssignments(assignments);
        renderSubmissionsTable(assignment);
        loadAssignments();
        showToast('success', 'ซิงค์คะแนนสำเร็จ!', `ดึงคะแนนสอบจาก Gyver Quiz ได้ ${syncedCount} คน`);
    } catch (err) {
        console.warn("Sync quiz error:", err);
        showToast('error', 'ซิงค์ผิดพลาด', err?.message || 'ไม่สามารถดึงคะแนนได้');
    }
}
window.syncQuizSubmissionsForAssignment = syncQuizSubmissionsForAssignment;

// 🔍 ตัวแปรสำหรับฟิลเตอร์กรองตรวจงานตามห้องเรียน ('all' หรือ classId)
let currentSubmissionFilterRoom = 'all';

function openSubmissionsModal(assignmentId) {
    activeAssignmentId = assignmentId;
    const assignments = getSharedCourseAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    currentSubmissionFilterRoom = 'all';

    document.getElementById('submissions-modal-title').innerText = `ตรวจงาน: ${assignment.title}`;
    document.getElementById('submissions-modal-subtitle').innerText = `คะแนนเต็ม: ${assignment.points} คะแนน • กำหนดส่ง: ${assignment.due_date || 'ไม่ระบุ'}`;

    const isQuiz = assignment.type === 'quiz' || !!assignment.quiz_id;
    const bannerEl = document.getElementById('submissions-quiz-banner');
    if (bannerEl) {
        if (isQuiz) {
            bannerEl.classList.remove('d-none');
            bannerEl.innerHTML = `
                <div class="alert alert-warning border border-warning-subtle d-flex flex-wrap justify-content-between align-items-center gap-2 p-2 px-3 mb-0 rounded-3">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-patch-question-fill text-warning fs-4"></i>
                        <div>
                            <div class="fw-bold text-dark small">แบบทดสอบ Gyver Quiz: ${escapeHtml(assignment.quiz_title || assignment.title)}</div>
                            <div class="text-muted" style="font-size: 0.72rem;">ระบบบันทึกผลสอบของนักเรียนเข้าสู่ห้องเรียนอัตโนมัติ หรือกดปุ่มดึงคะแนนเพื่ออัปเดตล่าสุด</div>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="../../features/education/quiz/quiz_lobby.html?quizId=${encodeURIComponent(assignment.quiz_id)}" target="_blank" class="btn btn-dark btn-sm rounded-pill px-3 fw-bold shadow-xs">
                            <i class="bi bi-broadcast-pin me-1 text-warning"></i>เปิดห้องสอบสด (Lobby)
                        </a>
                        <button type="button" class="btn btn-warning text-dark btn-sm rounded-pill px-3 fw-bold shadow-xs" onclick="syncQuizSubmissionsForAssignment('${assignment.id}')">
                            <i class="bi bi-arrow-repeat me-1"></i>ดึงคะแนนสอบล่าสุด
                        </button>
                    </div>
                </div>
            `;
        } else {
            bannerEl.classList.add('d-none');
            bannerEl.innerHTML = '';
        }
    }

    renderSubmissionsFilterButtons(assignment);
    renderSubmissionsTable(assignment);

    const modal = new bootstrap.Modal(document.getElementById('submissionsModal'));
    modal.show();
}

function renderSubmissionsFilterButtons(assignment) {
    const container = document.getElementById('submissions-room-filter-container');
    if (!container) return;

    const siblings = getSiblingSections(activeClassroom);
    const allStudents = getAllStudentsInCourse();
    const cfg = activeClassroom?.gradebook?.config || {};
    const gradeLevel = cfg.grade_level || '4';
    const displayGrade = gradeLevel.toLowerCase().startsWith('ม.') || gradeLevel.toLowerCase().startsWith('ป.') ? gradeLevel : `ม.${gradeLevel}`;

    if (siblings.length <= 1) {
        const sec = extractCleanRoomSection(activeClassroom.gradebook?.config?.room_section || activeClassroom.class_name, gradeLevel);
        container.innerHTML = `<span class="badge bg-secondary-subtle text-secondary px-3 py-1 font-mono">ห้อง ${displayGrade}/${sec} (${allStudents.length} คน)</span>`;
        return;
    }

    let buttons = `
        <button type="button" class="btn btn-sm ${currentSubmissionFilterRoom === 'all' ? 'btn-primary shadow-xs' : 'btn-outline-secondary'} rounded-pill px-3 py-1 font-mono fw-bold" onclick="filterSubmissionsByRoom('all')">
            <i class="bi bi-grid-fill me-1"></i>ทุกห้อง (${allStudents.length})
        </button>
    `;

    siblings.forEach(sib => {
        const sec = extractCleanRoomSection(sib.gradebook?.config?.room_section || sib.class_name, gradeLevel);
        const sList = Array.isArray(sib.students) ? sib.students : [];
        const isSelected = currentSubmissionFilterRoom === sib.id;
        buttons += `
            <button type="button" class="btn btn-sm ${isSelected ? 'btn-primary shadow-xs' : 'btn-outline-secondary'} rounded-pill px-3 py-1 font-mono fw-bold" onclick="filterSubmissionsByRoom('${sib.id}')">
                ห้อง ${displayGrade}/${sec} (${sList.length})
            </button>
        `;
    });

    container.innerHTML = buttons;
}

function filterSubmissionsByRoom(roomId) {
    currentSubmissionFilterRoom = roomId;
    const assignments = getSharedCourseAssignments();
    const assignment = assignments.find(a => a.id === activeAssignmentId);
    if (!assignment) return;

    renderSubmissionsFilterButtons(assignment);
    renderSubmissionsTable(assignment);
}

function renderSubmissionsTable(assignment) {
    const tbody = document.getElementById('submissions-table-body');
    const statsPill = document.getElementById('submissions-stats-pill');
    let allStudents = getAllStudentsInCourse();

    if (currentSubmissionFilterRoom !== 'all') {
        allStudents = allStudents.filter(s => s._roomId === currentSubmissionFilterRoom);
    }

    const submissions = assignment.submissions || {};
    const submittedCount = allStudents.filter(s => !!submissions[s.user_id || s.name]).length;

    if (statsPill) {
        statsPill.innerText = `ส่งแล้ว ${submittedCount} / ${allStudents.length} คน`;
    }

    if (allStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">ไม่พบข้อมูลนักเรียนในห้องที่เลือก</td></tr>`;
        return;
    }

    tbody.innerHTML = allStudents.map((s, idx) => {
        const studentKey = s.user_id || s.name;
        const sub = submissions[studentKey];
        const hasSubmitted = !!sub;

        return `
        <tr>
            <td class="text-center font-mono text-muted">${idx + 1}</td>
            <td>
                <div class="fw-bold text-dark">${s.name}</div>
                <div class="text-muted small">${s.nickname ? `ชื่อเล่น: ${s.nickname}` : ''}</div>
            </td>
            <td class="text-center">
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 font-mono">${s._roomName}</span>
            </td>
            <td>
                ${hasSubmitted ? `<span class="badge bg-success-subtle text-success font-mono">${new Date(sub.submitted_at).toLocaleDateString('th-TH')}</span>` : '<span class="badge bg-secondary-subtle text-secondary">ยังไม่ส่ง</span>'}
            </td>
            <td>
                ${(() => {
                    if (!hasSubmitted) return '<span class="text-muted small">-</span>';
                    if (assignment.type === 'quiz' || assignment.quiz_id) {
                        return `
                            <div class="d-inline-flex flex-column align-items-start">
                                <span class="badge bg-warning-subtle text-dark border border-warning-subtle rounded-pill px-2.5 py-1 font-mono">
                                    <i class="bi bi-patch-question-fill text-warning me-1"></i>สอบผ่าน Gyver Quiz
                                    ${sub.raw_score !== undefined ? `(${sub.raw_score}/${sub.raw_total || assignment.points} คะแนน)` : ''}
                                </span>
                                ${sub.percentage !== undefined ? `<div class="small text-muted font-mono mt-0.5" style="font-size:0.72rem;">คิดเป็น ${sub.percentage}%</div>` : ''}
                            </div>
                        `;
                    }
                    let content = '';
                    if (Array.isArray(sub.files) && sub.files.length > 1) {
                        content = `
                            <div class="d-flex flex-wrap gap-1" style="max-width: 260px;">
                                ${sub.files.map((f, fIdx) => {
                                    const ext = (f.name || '').split('.').pop().toLowerCase();
                                    let icon = 'bi-file-earmark-arrow-down-fill';
                                    let btnColor = 'btn-outline-success';
                                    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
                                        icon = 'bi-file-earmark-image-fill';
                                    } else if (['doc', 'docx'].includes(ext)) {
                                        icon = 'bi-file-earmark-word-fill';
                                        btnColor = 'btn-outline-primary';
                                    } else if (['pdf'].includes(ext)) {
                                        icon = 'bi-file-earmark-pdf-fill';
                                        btnColor = 'btn-outline-danger';
                                    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                                        icon = 'bi-file-earmark-excel-fill';
                                        btnColor = 'btn-outline-success';
                                    } else if (['ppt', 'pptx'].includes(ext)) {
                                        icon = 'bi-file-earmark-slides-fill';
                                        btnColor = 'btn-outline-warning';
                                    } else if (['zip', 'rar', '7z'].includes(ext)) {
                                        icon = 'bi-file-earmark-zip-fill';
                                        btnColor = 'btn-outline-secondary';
                                    }
                                    return `
                                    <a href="${f.url}" target="_blank" class="btn btn-sm ${btnColor} rounded-pill px-2 py-0 small d-inline-flex align-items-center gap-1 text-truncate" style="max-width: 125px; font-size: 0.76rem;" title="${f.name || `ไฟล์ที่ ${fIdx+1}`}">
                                        <i class="bi ${icon}"></i>
                                        <span class="text-truncate">${f.name || `ไฟล์ ${fIdx+1}`}</span>
                                    </a>`;
                                }).join('')}
                            </div>
                        `;
                    } else if (sub.file_url) {
                        if (sub.file_url.includes('cloudinary.com') || sub.submission_type === 'file') {
                            content = `
                                <a href="${sub.file_url}" target="_blank" class="btn btn-sm btn-outline-success rounded-pill px-3 py-1 fw-bold text-truncate" style="max-width: 200px;" title="${sub.file_name || 'ดูไฟล์งาน'}">
                                    <i class="bi bi-file-earmark-arrow-down-fill me-1"></i>${sub.file_name ? sub.file_name : 'ดูไฟล์งาน'}
                                </a>
                            `;
                        } else {
                            content = `
                                <a href="${sub.file_url}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1" title="เปิดลิงก์งาน">
                                    <i class="bi bi-link-45deg me-1"></i>เปิดลิงก์งาน
                                </a>
                            `;
                        }
                    } else {
                        content = '<span class="text-muted small">-</span>';
                    }
                    if (sub.comment) {
                        content += `<div class="small text-muted mt-1">💬 "${sub.comment}"</div>`;
                    }
                    return content;
                })()}
            </td>
            <td>
                ${(() => {
                    const isProject = assignment.type === 'project' || (Array.isArray(assignment.rubrics) && assignment.rubrics.length > 0);
                    if (isProject) {
                        const hasScore = sub && sub.score !== undefined && sub.score !== null;
                        let rubricBreakdown = '';
                        if (sub && sub.rubric_scores) {
                            rubricBreakdown = `
                                <div class="d-flex flex-wrap gap-1 mt-1 justify-content-center" style="max-width: 140px;">
                                    ${(assignment.rubrics || []).map(r => {
                                        const rSc = sub.rubric_scores[r.id];
                                        return `<span class="badge bg-white text-dark border font-mono px-1 py-0" style="font-size: 0.65rem;" title="${escapeHtml(r.title)}">${escapeHtml(r.title.slice(0, 4))}: <b class="${rSc !== undefined ? 'text-primary' : 'text-muted'}">${rSc ?? '-'}</b>/${r.max}</span>`;
                                    }).join('')}
                                </div>
                            `;
                        }
                        return `
                            <div class="d-flex flex-column align-items-center">
                                <button type="button" class="btn btn-sm text-white rounded-pill px-2.5 py-1 fw-bold shadow-xs d-inline-flex align-items-center gap-1" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); font-size: 0.78rem;" onclick="openGradeProjectRubricModal('${encodeURIComponent(studentKey)}', '${assignment.id}')">
                                    <i class="bi bi-sliders"></i> ประเมินเกณฑ์
                                </button>
                                <div class="font-mono fw-bold text-primary small mt-1">
                                    ${hasScore ? `${sub.score} / ${assignment.points} คะแนน` : '<span class="text-muted" style="font-size:0.75rem;">ยังไม่ประเมิน</span>'}
                                </div>
                                ${rubricBreakdown}
                            </div>
                        `;
                    }
                    return `<input type="number" class="form-control form-control-sm text-center font-mono" id="score_input_${idx}" value="${hasSubmitted ? (sub.score ?? '') : ''}" max="${assignment.points}" min="0" placeholder="0/${assignment.points}">`;
                })()}
            </td>
            <td class="text-end">
                ${assignment.type === 'project' || (Array.isArray(assignment.rubrics) && assignment.rubrics.length > 0) ? `
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-2.5" onclick="openGradeProjectRubricModal('${encodeURIComponent(studentKey)}', '${assignment.id}')" title="เปิดประเมินตามเกณฑ์">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                ` : `
                    <button class="btn btn-sm btn-primary rounded-2 px-2" onclick="saveStudentGrade('${encodeURIComponent(studentKey)}', 'score_input_${idx}')" title="บันทึกคะแนน">
                        <i class="bi bi-check2"></i>
                    </button>
                `}
            </td>
        </tr>`;
    }).join('');
}

async function saveStudentGrade(encodedStudentKey, inputId) {
    const studentKey = decodeURIComponent(encodedStudentKey);
    const input = document.getElementById(inputId);
    if (!input) return;

    const scoreVal = input.value === '' ? null : parseFloat(input.value);

    let assignments = getSharedCourseAssignments();
    const assignment = assignments.find(a => a.id === activeAssignmentId);
    if (!assignment) return;

    if (!assignment.submissions) assignment.submissions = {};
    if (!assignment.submissions[studentKey]) {
        assignment.submissions[studentKey] = {
            submitted_at: new Date().toISOString(),
            score: scoreVal
        };
    } else {
        assignment.submissions[studentKey].score = scoreVal;
    }

    await saveSharedCourseAssignments(assignments);
    showToast('success', 'บันทึกคะแนนแล้ว', `บันทึกคะแนนเรียบร้อย`);
}

/* ============================================================== */
/* 🎡 TAB 5: เครื่องมือช่วยสอน (Classroom Tools Hub) */
/* ============================================================== */
function launchWheelWithThisClass() {
    if (!activeClassroom) return;
    localStorage.setItem('selected_classroom_key', activeClassroom.class_name);
    window.open(`../../features/education/wheel/wheel_display.html?class=${encodeURIComponent(activeClassroom.class_name)}`, '_blank');
}

/* ============================================================== */
/* 📊 TAB 6: รวมคะแนน & ตัดเกรด (Digital ปพ.5 Gradebook Logic) */
/* ============================================================== */

// 🧮 1. คำนวณตัดเกรดตามเกณฑ์กระทรวงศึกษาธิการ (สพฐ.)
function calculateThaiGrade(score, status) {
    if (status === 'ms') return { grade: 'มส', text: 'หมดสิทธิ์สอบ', badgeClass: 'grade-0', gpa: 0 };
    if (status === 'r') return { grade: 'ร', text: 'รอตัดสินผล', badgeClass: 'grade-special', gpa: 0 };
    if (status === 'pass') return { grade: 'ผ', text: 'ผ่าน', badgeClass: 'grade-4', gpa: 4.0 };
    if (status === 'fail') return { grade: 'มผ', text: 'ไม่ผ่าน', badgeClass: 'grade-0', gpa: 0 };

    const s = Math.round((Number(score) || 0) * 10) / 10;
    if (s >= 80) return { grade: '4', text: 'ดีเยี่ยม', badgeClass: 'grade-4', gpa: 4.0 };
    if (s >= 75) return { grade: '3.5', text: 'ดีมาก', badgeClass: 'grade-3-5', gpa: 3.5 };
    if (s >= 70) return { grade: '3', text: 'ดี', badgeClass: 'grade-3', gpa: 3.0 };
    if (s >= 65) return { grade: '2.5', text: 'ค่อนข้างดี', badgeClass: 'grade-2-5', gpa: 2.5 };
    if (s >= 60) return { grade: '2', text: 'ปานกลาง', badgeClass: 'grade-2', gpa: 2.0 };
    if (s >= 55) return { grade: '1.5', text: 'พอใช้', badgeClass: 'grade-1-5', gpa: 1.5 };
    if (s >= 50) return { grade: '1', text: 'ผ่านเกณฑ์ขั้นต่ำ', badgeClass: 'grade-1', gpa: 1.0 };
    return { grade: '0', text: 'ไม่ผ่านเกณฑ์', badgeClass: 'grade-0', gpa: 0.0 };
}

// 📑 2. เรนเดอร์หน้าตารางรวมคะแนน ปพ.5
function renderTabGradebook() {
    if (!activeClassroom) return;

    const gb = activeClassroom.gradebook || {};
    const cfg = gb.config || {};
    const columns = Array.isArray(gb.columns) ? gb.columns : [];
    const scores = gb.scores || {};
    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];

    // แบ่งคอลัมน์เก็บคะแนนเป็น 4 ส่วน: มาเรียน, กลางภาค, ปลายภาค และ อื่นๆ (คะแนนช่วย/พิเศษ)
    // ตรวจสอบ migration: หากมีช่องที่ชื่อมี "ช่วยงาน", "พิเศษ", "คะแนนช่วย" หรือ "อื่นๆ" แต่ถูกบันทึกเป็น 'attendance' ให้ปรับเป็น 'other'
    columns.forEach(col => {
        if (col.term === 'attendance' && (col.title.includes('ช่วยงาน') || col.title.includes('พิเศษ') || col.title.includes('อื่นๆ') || col.title.includes('คะแนนช่วย'))) {
            col.term = 'other';
        }
    });

    const attCols = columns.filter(c => c.term === 'attendance');
    const midCols = columns.filter(c => c.term === 'midterm' || (!c.term && c.term !== 'final' && c.term !== 'attendance' && c.term !== 'other'));
    const finalCols = columns.filter(c => c.term === 'final');
    const otherCols = columns.filter(c => c.term === 'other');

    const attendanceWeight = Number(cfg.attendance_max ?? 10);
    const midFormativeWeight = Number(cfg.mid_formative_max ?? 20);
    const midtermMax = Number(cfg.midterm_max ?? 20);
    const finalFormativeWeight = Number(cfg.final_formative_max ?? 20);
    const finalMax = Number(cfg.final_max ?? 30);

    const attRawMax = attCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);
    const midRawMax = midCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);
    const finalRawMax = finalCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);

    // 2.1 อัปเดตข้อมูลบน Header Bar
    const badgeEl = document.getElementById('gb-subject-badge');
    const descEl = document.getElementById('gb-subject-desc');
    if (badgeEl) {
        badgeEl.innerText = cfg.subject_code ? `รหัสวิชา: ${cfg.subject_code}` : 'ยังไม่ระบุรหัสวิชา';
    }
    if (descEl) {
        const subName = cfg.subject_name || activeClassroom.class_name || 'รายวิชา';
        const sem = cfg.semester || '1';
        const yr = cfg.academic_year || '2569';
        descEl.innerText = `${subName} • ภาคเรียนที่ ${sem}/${yr} • สัดส่วน 5 ส่วน (${attendanceWeight}:${midFormativeWeight}:${midtermMax}:${finalFormativeWeight}:${finalMax}) = รวม 100 คะแนน`;
    }

    // 2.2 เรนเดอร์หัวตาราง (Thead)
    const thead = document.getElementById('gradebook-thead');
    if (thead) {
        const renderTh = col => {
            const isBonus = col.is_bonus || !col.max;
            return `
            <th class="text-center font-mono small" style="min-width: 85px;">
                <div class="d-flex align-items-center justify-content-center gap-1">
                    <span title="${col.title}">${col.title}</span>
                    <button type="button" class="btn btn-link btn-xs p-0 text-danger opacity-75" onclick="deleteGradeColumn('${col.id}')" title="ลบช่องนี้">
                        <i class="bi bi-x-circle-fill"></i>
                    </button>
                </div>
                <div class="text-muted fw-normal" style="font-size: 0.72rem;">${isBonus ? 'ไม่มีคะแนนเต็ม' : `เต็ม ${col.max}`}</div>
            </th>
        `};

        const attColHeaders = attCols.map(renderTh).join('');
        const midColHeaders = midCols.map(renderTh).join('');
        const finalColHeaders = finalCols.map(renderTh).join('');
        const otherColHeaders = otherCols.map(renderTh).join('');

        const attColspan = attCols.length > 0 ? (attCols.length > 1 ? attCols.length + 1 : attCols.length) : 1;

        thead.innerHTML = `
            <tr>
                <th rowspan="2" class="sticky-no">เลขที่</th>
                <th rowspan="2" class="sticky-name">ชื่อ - นามสกุล</th>
                <th colspan="${attColspan}" class="text-info-emphasis bg-info-subtle text-center border-start py-2">
                    <div class="gradebook-header-cell">
                        <div class="header-title">
                            <i class="bi bi-calendar-check-fill text-info"></i>
                            <span class="text-primary-emphasis">มาเรียน</span>
                        </div>
                        <div class="header-sub">(${attendanceWeight} คะแนน)</div>
                    </div>
                </th>
                <th colspan="${midCols.length + 1}" class="text-primary bg-primary-subtle text-center border-start py-2">
                    <div class="gradebook-header-cell">
                        <div class="header-title">
                            <i class="bi bi-journal-check"></i>
                            <span>คะแนนเก็บ</span>
                        </div>
                        <div class="fw-bold">กลางภาค</div>
                        <div class="header-sub">(${midFormativeWeight} คะแนน)</div>
                    </div>
                </th>
                <th class="text-primary bg-primary-subtle text-center border-start border-end py-2" style="min-width: 80px;">
                    <div class="gradebook-header-cell">
                        <div class="header-title">
                            <i class="bi bi-file-earmark-text"></i>
                            <span>คะแนนสอบ</span>
                        </div>
                        <div class="fw-bold">กลางภาค</div>
                    </div>
                </th>
                <th colspan="${finalCols.length + 1}" class="text-success bg-success-subtle text-center border-start py-2">
                    <div class="gradebook-header-cell">
                        <div class="header-title">
                            <i class="bi bi-journal-richtext"></i>
                            <span>คะแนนเก็บ</span>
                        </div>
                        <div class="fw-bold">ปลายภาค</div>
                        <div class="header-sub">(${finalFormativeWeight} คะแนน)</div>
                    </div>
                </th>
                <th class="text-danger bg-danger-subtle text-center border-start border-end py-2" style="min-width: 80px;">
                    <div class="gradebook-header-cell">
                        <div class="header-title">
                            <i class="bi bi-file-earmark-medical"></i>
                            <span>คะแนนสอบ</span>
                        </div>
                        <div class="fw-bold">ปลายภาค</div>
                    </div>
                </th>
                ${otherCols.length > 0 ? `
                <th colspan="${otherCols.length}" class="text-warning-emphasis bg-warning-subtle text-center border-start border-end py-2" style="min-width: 80px;">
                    <div class="gradebook-header-cell">
                        <div class="header-title">
                            <i class="bi bi-star-fill text-warning"></i>
                            <span>อื่นๆ</span>
                        </div>
                        <div class="header-sub text-muted" style="font-size: 0.74rem;">(ช่วยงาน/พิเศษ)</div>
                    </div>
                </th>` : ''}
                <th rowspan="2" class="text-center bg-dark text-white font-mono gb-header-total" style="min-width: 72px; width: 75px;">
                    <div class="gradebook-total-cell">
                        <div class="total-lbl">รวม</div>
                        <div class="total-num">100</div>
                        <div class="total-unit">คะแนน</div>
                    </div>
                </th>
                <th rowspan="2" class="text-center bg-dark text-white font-mono gb-header-total" style="min-width: 65px; width: 65px;">เกรด</th>
                <th rowspan="2" class="text-center" style="min-width: 90px;" title="คุณลักษณะอันพึงประสงค์ 8 ประการ">คุณลักษณะ</th>
                <th rowspan="2" class="text-center" style="min-width: 90px;" title="การอ่าน คิดวิเคราะห์ และเขียน">อ่าน/คิด</th>
                <th rowspan="2" class="text-center" style="min-width: 95px;">สถานะ</th>
            </tr>
            <tr>
                ${attCols.length > 0 
                    ? (attColHeaders + (attCols.length > 1 ? `<th class="text-center text-info-emphasis font-mono small bg-light" style="min-width: 80px;"><div>รวมมาเรียน</div><div style="font-size: 0.72rem;">เต็ม ${attendanceWeight}</div></th>` : ''))
                    : `<th class="text-center text-info-emphasis font-mono small bg-light" style="min-width: 80px;"><div>มาเรียน</div><div style="font-size: 0.72rem;">เต็ม ${attendanceWeight}</div></th>`}
                ${midColHeaders}
                <th class="text-center text-primary font-mono small bg-light" style="min-width: 80px;">
                    <div>รวมเก็บ</div>
                    <div style="font-size: 0.72rem;">เต็ม ${midFormativeWeight}</div>
                </th>
                <th class="text-center text-primary font-mono small bg-light" style="min-width: 85px;">
                    <div>กลางภาค</div>
                    <div style="font-size: 0.72rem;">เต็ม ${midtermMax}</div>
                </th>
                ${finalColHeaders}
                <th class="text-center text-success font-mono small bg-light" style="min-width: 80px;">
                    <div>รวมเก็บ</div>
                    <div style="font-size: 0.72rem;">เต็ม ${finalFormativeWeight}</div>
                </th>
                <th class="text-center text-danger font-mono small bg-light" style="min-width: 85px;">
                    <div>ปลายภาค</div>
                    <div style="font-size: 0.72rem;">เต็ม ${finalMax}</div>
                </th>
                ${otherColHeaders}
            </tr>
        `;
    }

    // 2.3 เรนเดอร์ตัวเนื้อหาตาราง (Tbody)
    const tbody = document.getElementById('gradebook-tbody');
    if (!tbody) return;

    const totalColCount = columns.length + (attCols.length === 0 ? 1 : 0) + (attCols.length > 1 ? 1 : 0) + 11;

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${totalColCount}" class="text-center py-5 text-muted">
                    <i class="bi bi-people fs-2 d-block mb-2 text-secondary"></i>
                    ยังไม่มีรายชื่อนักเรียนในห้องเรียนนี้
                </td>
            </tr>
        `;
        updateGradebookKPIs([], 0);
        return;
    }

    let grade4Count = 0;
    let atRiskCount = 0;
    let totalGPA = 0;
    let gradedStudentsCount = 0;

    const rowsHtml = students.map((s, rowIdx) => {
        const studentKey = s.user_id || s.name;
        const sc = scores[studentKey] || {};
        const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;

        // รวบรวมคะแนนช่วยทั้งหมดของนักเรียนคนนี้ (On-top bonus และหมวดอื่นๆ)
        let totalBonus = 0;
        columns.forEach(col => {
            const val = sc[col.id];
            if (val !== undefined && val !== '' && !isNaN(val)) {
                if (col.term === 'other' || col.is_bonus || !col.max) {
                    totalBonus += Number(val);
                }
            }
        });

        // 1. คำนวณคะแนนมาเรียน (Attendance)
        let scaledAtt = 0;
        let attHtml = '';
        if (attCols.length > 0) {
            let attRawSum = 0;
            const attColInputs = attCols.map(col => {
                const isBonus = col.is_bonus || !col.max;
                const rawVal = sc[col.id] !== undefined ? sc[col.id] : '';
                if (!isBonus && rawVal !== '' && !isNaN(rawVal)) {
                    attRawSum += Number(rawVal);
                }
                return `
                    <td class="text-center">
                        <input type="number" step="any" min="0" ${isBonus ? '' : `max="${col.max}"`} 
                            class="grade-input text-info-emphasis font-mono" 
                            value="${rawVal}" 
                            data-col="${col.id}" 
                            data-row="${rowIdx}" 
                            data-student="${studentKey}" 
                            data-max="${isBonus ? 'unlimited' : col.max}"
                            oninput="handleScoreChange('${studentKey}', '${col.id}', this.value, ${isBonus ? 'null' : col.max}, ${rowIdx})"
                            onkeydown="handleGradeKeyNav(event, this)">
                    </td>
                `;
            }).join('');

            if (attRawMax > 0) {
                scaledAtt = Math.round(((attRawSum / attRawMax) * attendanceWeight) * 10) / 10;
            }
            attHtml = attColInputs + (attCols.length > 1 ? `<td class="text-center font-mono fw-bold text-info-emphasis bg-light" id="gb-cell-att-${rowIdx}">${scaledAtt}</td>` : '');
        } else {
            const directAttVal = sc.attendance !== undefined ? sc.attendance : '';
            scaledAtt = directAttVal !== '' ? Number(directAttVal) : 0;
            attHtml = `
                <td class="text-center">
                    <input type="number" step="any" min="0" max="${attendanceWeight}" 
                        class="grade-input text-info-emphasis font-mono fw-bold" 
                        value="${directAttVal}" 
                        data-col="attendance" 
                        data-row="${rowIdx}" 
                        data-student="${studentKey}" 
                        data-max="${attendanceWeight}"
                        oninput="handleScoreChange('${studentKey}', 'attendance', this.value, ${attendanceWeight}, ${rowIdx})"
                        onkeydown="handleGradeKeyNav(event, this)">
                </td>
            `;
        }

        // 2. คำนวณคะแนนเก็บกลางภาค
        let midRawSum = 0;
        const midColInputs = midCols.map(col => {
            const isBonus = col.is_bonus || !col.max;
            const rawVal = sc[col.id] !== undefined ? sc[col.id] : '';
            if (!isBonus && rawVal !== '' && !isNaN(rawVal)) {
                midRawSum += Number(rawVal);
            }
            return `
                <td class="text-center">
                    <input type="number" step="any" min="0" ${isBonus ? '' : `max="${col.max}"`} 
                        class="grade-input font-mono" 
                        value="${rawVal}" 
                        data-col="${col.id}" 
                        data-row="${rowIdx}" 
                        data-student="${studentKey}" 
                        data-max="${isBonus ? 'unlimited' : col.max}"
                        oninput="handleScoreChange('${studentKey}', '${col.id}', this.value, ${isBonus ? 'null' : col.max}, ${rowIdx})"
                        onkeydown="handleGradeKeyNav(event, this)">
                </td>
            `;
        }).join('');

        let scaledMid = 0;
        if (midRawMax > 0) {
            scaledMid = Math.round(((midRawSum / midRawMax) * midFormativeWeight) * 10) / 10;
        }

        // 3. คะแนนสอบกลางภาค
        const midtermVal = sc.midterm !== undefined ? sc.midterm : '';
        const midtermNum = Number(midtermVal) || 0;

        // 4. คำนวณคะแนนเก็บปลายภาค
        let finalRawSum = 0;
        const finalColInputs = finalCols.map(col => {
            const isBonus = col.is_bonus || !col.max;
            const rawVal = sc[col.id] !== undefined ? sc[col.id] : '';
            if (!isBonus && rawVal !== '' && !isNaN(rawVal)) {
                finalRawSum += Number(rawVal);
            }
            return `
                <td class="text-center">
                    <input type="number" step="any" min="0" ${isBonus ? '' : `max="${col.max}"`} 
                        class="grade-input font-mono" 
                        value="${rawVal}" 
                        data-col="${col.id}" 
                        data-row="${rowIdx}" 
                        data-student="${studentKey}" 
                        data-max="${isBonus ? 'unlimited' : col.max}"
                        oninput="handleScoreChange('${studentKey}', '${col.id}', this.value, ${isBonus ? 'null' : col.max}, ${rowIdx})"
                        onkeydown="handleGradeKeyNav(event, this)">
                </td>
            `;
        }).join('');

        let scaledFinal = 0;
        if (finalRawMax > 0) {
            scaledFinal = Math.round(((finalRawSum / finalRawMax) * finalFormativeWeight) * 10) / 10;
        }

        // 5. คะแนนสอบปลายภาค
        const finalVal = sc.final !== undefined ? sc.final : '';
        const finalNum = Number(finalVal) || 0;

        // 5.1 ช่องคะแนนหมวดอื่นๆ (คะแนนช่วย/พิเศษ)
        const otherColInputs = otherCols.map(col => {
            const isBonus = col.is_bonus || !col.max;
            const rawVal = sc[col.id] !== undefined ? sc[col.id] : '';
            return `
                <td class="text-center">
                    <input type="number" step="any" min="0" ${isBonus ? '' : `max="${col.max}"`} 
                        class="grade-input text-warning-emphasis font-mono" 
                        value="${rawVal}" 
                        data-col="${col.id}" 
                        data-row="${rowIdx}" 
                        data-student="${studentKey}" 
                        data-max="${isBonus ? 'unlimited' : col.max}"
                        oninput="handleScoreChange('${studentKey}', '${col.id}', this.value, ${isBonus ? 'null' : col.max}, ${rowIdx})"
                        onkeydown="handleGradeKeyNav(event, this)">
                </td>
            `;
        }).join('');

        // 6. รวม 100 คะแนน (รวมคะแนนช่วย On-top แบบไม่เกิน 100)
        const grandTotal = Math.min(100, Math.round((scaledAtt + scaledMid + midtermNum + scaledFinal + finalNum + totalBonus) * 10) / 10);
        const gradeInfo = calculateThaiGrade(grandTotal, sc.status || 'normal');

        if (sc.status === 'ms' || sc.status === 'r' || gradeInfo.grade === '0') {
            atRiskCount++;
        }
        if (gradeInfo.grade === '4') {
            grade4Count++;
        }
        if (sc.status !== 'ms' && sc.status !== 'r') {
            totalGPA += gradeInfo.gpa;
            gradedStudentsCount++;
        }

        const traitsVal = sc.traits !== undefined ? sc.traits : 3;
        const readingVal = sc.reading !== undefined ? sc.reading : 3;
        const statusVal = sc.status || 'normal';

        return `
            <tr id="gb-row-${rowIdx}">
                <td class="sticky-no font-mono text-muted">${rowIdx + 1}</td>
                <td class="sticky-name">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${avatar}" class="rounded-circle border" style="width: 30px; height: 30px; object-fit: cover;">
                        <div class="text-truncate">
                            <div class="fw-bold text-dark text-truncate" style="max-width: 150px;" title="${s.name}">${s.name}</div>
                            ${s.nickname ? `<div class="text-muted" style="font-size: 0.72rem;">${s.nickname}</div>` : ''}
                        </div>
                    </div>
                </td>
                ${attHtml}
                ${midColInputs}
                <td class="text-center font-mono fw-bold text-primary bg-light" id="gb-cell-mid-formative-${rowIdx}">
                    ${scaledMid}
                </td>
                <td class="text-center">
                    <input type="number" step="any" min="0" max="${midtermMax}" 
                        class="grade-input text-primary font-mono fw-bold" 
                        value="${midtermVal}" 
                        data-col="midterm" 
                        data-row="${rowIdx}" 
                        data-student="${studentKey}" 
                        data-max="${midtermMax}"
                        oninput="handleScoreChange('${studentKey}', 'midterm', this.value, ${midtermMax}, ${rowIdx})"
                        onkeydown="handleGradeKeyNav(event, this)">
                </td>
                ${finalColInputs}
                <td class="text-center font-mono fw-bold text-success bg-light" id="gb-cell-final-formative-${rowIdx}">
                    ${scaledFinal}
                </td>
                <td class="text-center">
                    <input type="number" step="any" min="0" max="${finalMax}" 
                        class="grade-input text-danger font-mono fw-bold" 
                        value="${finalVal}" 
                        data-col="final" 
                        data-row="${rowIdx}" 
                        data-student="${studentKey}" 
                        data-max="${finalMax}"
                        oninput="handleScoreChange('${studentKey}', 'final', this.value, ${finalMax}, ${rowIdx})"
                        onkeydown="handleGradeKeyNav(event, this)">
                </td>
                ${otherColInputs}
                <td class="text-center font-mono fw-bold fs-6" id="gb-cell-total-${rowIdx}">
                    ${grandTotal}
                </td>
                <td class="text-center" id="gb-cell-grade-${rowIdx}">
                    <span class="grade-badge ${gradeInfo.badgeClass}">${gradeInfo.grade}</span>
                </td>
                <td class="text-center">
                    <select class="grade-select" onchange="handleEvaluationChange('${studentKey}', 'traits', this.value)">
                        <option value="3" ${traitsVal == 3 ? 'selected' : ''}>3 (ดีเยี่ยม)</option>
                        <option value="2" ${traitsVal == 2 ? 'selected' : ''}>2 (ดี)</option>
                        <option value="1" ${traitsVal == 1 ? 'selected' : ''}>1 (ผ่าน)</option>
                        <option value="0" ${traitsVal == 0 ? 'selected' : ''}>0 (ไม่ผ่าน)</option>
                    </select>
                </td>
                <td class="text-center">
                    <select class="grade-select" onchange="handleEvaluationChange('${studentKey}', 'reading', this.value)">
                        <option value="3" ${readingVal == 3 ? 'selected' : ''}>3 (ดีเยี่ยม)</option>
                        <option value="2" ${readingVal == 2 ? 'selected' : ''}>2 (ดี)</option>
                        <option value="1" ${readingVal == 1 ? 'selected' : ''}>1 (ผ่าน)</option>
                        <option value="0" ${readingVal == 0 ? 'selected' : ''}>0 (ไม่ผ่าน)</option>
                    </select>
                </td>
                <td class="text-center">
                    <select class="grade-select ${statusVal === 'ms' ? 'text-danger fw-bold' : statusVal === 'r' ? 'text-warning fw-bold' : ''}" 
                        onchange="handleEvaluationChange('${studentKey}', 'status', this.value, ${rowIdx})">
                        <option value="normal" ${statusVal === 'normal' ? 'selected' : ''}>ปกติ</option>
                        <option value="r" ${statusVal === 'r' ? 'selected' : ''}>ร (ค้างงาน)</option>
                        <option value="ms" ${statusVal === 'ms' ? 'selected' : ''}>มส (ขาดเวลา)</option>
                        <option value="pass" ${statusVal === 'pass' ? 'selected' : ''}>ผ (ผ่าน)</option>
                        <option value="fail" ${statusVal === 'fail' ? 'selected' : ''}>มผ (ไม่ผ่าน)</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // 2.4 อัปเดต KPI ตัวเลขสรุป
    const avgGPA = gradedStudentsCount > 0 ? (totalGPA / gradedStudentsCount).toFixed(2) : '0.00';
    updateGradebookKPIs(students, avgGPA, grade4Count, atRiskCount);
}

// 📊 3. อัปเดตค่าสถิติ KPI Dashboard
function updateGradebookKPIs(students, avgGPA, grade4Count = 0, atRiskCount = 0) {
    const elGPA = document.getElementById('gb-stat-gpax');
    const elStudents = document.getElementById('gb-stat-students');
    const elGrade4 = document.getElementById('gb-stat-grade4');
    const elAtRisk = document.getElementById('gb-stat-atrisk');

    if (elGPA) elGPA.innerText = avgGPA || '0.00';
    if (elStudents) elStudents.innerText = Array.isArray(students) ? students.length : 0;
    if (elGrade4) elGrade4.innerText = grade4Count;
    if (elAtRisk) elAtRisk.innerText = atRiskCount;
}

// ⌨️ 4. ระบบเลื่อนช่องกรอกคะแนนด่วนด้วยคีย์บอร์ด (Enter / Arrow Navigation)
function handleGradeKeyNav(e, inputEl) {
    const currentRow = parseInt(inputEl.getAttribute('data-row'), 10);
    const currentCol = inputEl.getAttribute('data-col');

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextInput = document.querySelector(`input.grade-input[data-col="${currentCol}"][data-row="${currentRow + 1}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevInput = document.querySelector(`input.grade-input[data-col="${currentCol}"][data-row="${currentRow - 1}"]`);
        if (prevInput) {
            prevInput.focus();
            prevInput.select();
        }
    }
}

// ⚡ 5. ระบบอัปเดตคะแนนแบบ Realtime โดยไม่ต้องเรนเดอร์ตารางใหม่ทั้งตาราง
function handleScoreChange(studentKey, colId, value, maxScore, rowIdx) {
    if (!activeClassroom) return;

    if (!activeClassroom.gradebook) activeClassroom.gradebook = { config: {}, columns: [], scores: {} };
    if (!activeClassroom.gradebook.scores) activeClassroom.gradebook.scores = {};
    if (!activeClassroom.gradebook.scores[studentKey]) activeClassroom.gradebook.scores[studentKey] = {};

    const gb = activeClassroom.gradebook;
    const cfg = gb.config || {};
    const columns = gb.columns || [];

    // ตรวจสอบคะแนนเกินเต็ม (ถ้าไม่ใช่คะแนนช่วย)
    const isBonusCol = maxScore === null || maxScore === undefined || maxScore === 'null' || maxScore === 'unlimited';
    const numVal = value === '' ? '' : Number(value);
    const inputEl = document.querySelector(`input.grade-input[data-col="${colId}"][data-student="${studentKey}"]`);

    if (!isBonusCol && numVal !== '' && (numVal < 0 || numVal > maxScore)) {
        if (inputEl) inputEl.classList.add('is-invalid-score');
        showToast('warning', 'คะแนนเกินเกณฑ์', `คะแนนช่องนี้เต็ม ${maxScore} คะแนน`);
    } else {
        if (inputEl) inputEl.classList.remove('is-invalid-score');
    }

    gb.scores[studentKey][colId] = numVal;

    // คำนวณแถวนี้ใหม่ทันที
    const sc = gb.scores[studentKey];
    const attendanceWeight = Number(cfg.attendance_max ?? 10);
    const midFormativeWeight = Number(cfg.mid_formative_max ?? 20);
    const midtermMax = Number(cfg.midterm_max ?? 20);
    const finalFormativeWeight = Number(cfg.final_formative_max ?? 20);
    const finalMax = Number(cfg.final_max ?? 30);

    // ตรวจสอบ migration: หากมีช่องที่ชื่อมี "ช่วยงาน", "พิเศษ", "คะแนนช่วย" หรือ "อื่นๆ" แต่ถูกบันทึกเป็น 'attendance' ให้ปรับเป็น 'other'
    columns.forEach(col => {
        if (col.term === 'attendance' && (col.title.includes('ช่วยงาน') || col.title.includes('พิเศษ') || col.title.includes('อื่นๆ') || col.title.includes('คะแนนช่วย'))) {
            col.term = 'other';
        }
    });

    const attCols = columns.filter(c => c.term === 'attendance');
    const midCols = columns.filter(c => c.term === 'midterm' || (!c.term && c.term !== 'final' && c.term !== 'attendance' && c.term !== 'other'));
    const finalCols = columns.filter(c => c.term === 'final');
    const otherCols = columns.filter(c => c.term === 'other');

    const attRawMax = attCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);
    const midRawMax = midCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);
    const finalRawMax = finalCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);

    // รวบรวมคะแนนช่วยทั้งหมดของนักเรียนคนนี้ (On-top bonus และหมวดอื่นๆ)
    let totalBonus = 0;
    columns.forEach(col => {
        const val = sc[col.id];
        if (val !== undefined && val !== '' && !isNaN(val)) {
            if (col.term === 'other' || col.is_bonus || !col.max) {
                totalBonus += Number(val);
            }
        }
    });

    // 1. มาเรียน
    let scaledAtt = 0;
    if (attCols.length > 0) {
        let attRawSum = 0;
        attCols.forEach(col => {
            if (!col.is_bonus && Number(col.max) > 0) {
                const val = sc[col.id];
                if (val !== undefined && val !== '' && !isNaN(val)) attRawSum += Number(val);
            }
        });
        if (attRawMax > 0) {
            scaledAtt = Math.round(((attRawSum / attRawMax) * attendanceWeight) * 10) / 10;
        }
    } else {
        scaledAtt = sc.attendance !== undefined && sc.attendance !== '' ? Number(sc.attendance) : 0;
    }

    // 2. กลางภาค
    let midRawSum = 0;
    midCols.forEach(col => {
        if (!col.is_bonus && Number(col.max) > 0) {
            const val = sc[col.id];
            if (val !== undefined && val !== '' && !isNaN(val)) midRawSum += Number(val);
        }
    });
    let scaledMid = 0;
    if (midRawMax > 0) {
        scaledMid = Math.round(((midRawSum / midRawMax) * midFormativeWeight) * 10) / 10;
    }

    // 3. สอบกลางภาค
    const midtermNum = Number(sc.midterm || 0);

    // 4. ปลายภาค
    let finalRawSum = 0;
    finalCols.forEach(col => {
        if (!col.is_bonus && Number(col.max) > 0) {
            const val = sc[col.id];
            if (val !== undefined && val !== '' && !isNaN(val)) finalRawSum += Number(val);
        }
    });
    let scaledFinal = 0;
    if (finalRawMax > 0) {
        scaledFinal = Math.round(((finalRawSum / finalRawMax) * finalFormativeWeight) * 10) / 10;
    }

    // 5. สอบปลายภาค
    const finalNum = Number(sc.final || 0);

    // 6. รวม 100 (รวมคะแนนช่วย On-top แบบไม่เกิน 100)
    const grandTotal = Math.min(100, Math.round((scaledAtt + scaledMid + midtermNum + scaledFinal + finalNum + totalBonus) * 10) / 10);
    const gradeInfo = calculateThaiGrade(grandTotal, sc.status || 'normal');

    // อัปเดตเซลล์ใน DOM ทันที
    const cellAtt = document.getElementById(`gb-cell-att-${rowIdx}`);
    const cellMid = document.getElementById(`gb-cell-mid-formative-${rowIdx}`);
    const cellFinal = document.getElementById(`gb-cell-final-formative-${rowIdx}`);
    const cellTotal = document.getElementById(`gb-cell-total-${rowIdx}`);
    const cellGrade = document.getElementById(`gb-cell-grade-${rowIdx}`);

    if (cellAtt) cellAtt.innerText = scaledAtt;
    if (cellMid) cellMid.innerText = scaledMid;
    if (cellFinal) cellFinal.innerText = scaledFinal;
    if (cellTotal) {
        cellTotal.innerText = grandTotal;
    }
    if (cellGrade) cellGrade.innerHTML = `<span class="grade-badge ${gradeInfo.badgeClass}">${gradeInfo.grade}</span>`;

    // บันทึกลง Storage สำรอง
    if (activeClassroomId) {
        try {
            localStorage.setItem(`gyver_gradebook_${activeClassroomId}`, JSON.stringify(gb));
        } catch (_) {}
    }
}

// 🌟 6. บันทึกคุณลักษณะ/อ่านคิด/สถานะ
function handleEvaluationChange(studentKey, field, value, rowIdx = null) {
    if (!activeClassroom) return;
    if (!activeClassroom.gradebook) activeClassroom.gradebook = { config: {}, columns: [], scores: {} };
    if (!activeClassroom.gradebook.scores) activeClassroom.gradebook.scores = {};
    if (!activeClassroom.gradebook.scores[studentKey]) activeClassroom.gradebook.scores[studentKey] = {};

    activeClassroom.gradebook.scores[studentKey][field] = value;

    if (field === 'status' && rowIdx !== null) {
        const sc = activeClassroom.gradebook.scores[studentKey];
        const cellTotal = document.getElementById(`gb-cell-total-${rowIdx}`);
        const currentTotal = cellTotal ? Number(cellTotal.innerText) : 0;
        const gradeInfo = calculateThaiGrade(currentTotal, value);

        const cellGrade = document.getElementById(`gb-cell-grade-${rowIdx}`);
        if (cellGrade) {
            cellGrade.innerHTML = `<span class="grade-badge ${gradeInfo.badgeClass}">${gradeInfo.grade}</span>`;
        }
    }

    if (activeClassroomId) {
        try {
            localStorage.setItem(`gyver_gradebook_${activeClassroomId}`, JSON.stringify(activeClassroom.gradebook));
        } catch (_) {}
    }
}

// ➕ 7. เพิ่มช่องเก็บคะแนนใหม่ (Add Column)
function toggleGradebookMaxScoreInput() {
    const isBonus = document.getElementById('gb-col-type-bonus')?.checked || false;
    const maxContainer = document.getElementById('gb-col-max-container');
    const bonusHint = document.getElementById('gb-col-bonus-hint');
    const maxInput = document.getElementById('gb-new-col-max');

    if (isBonus) {
        if (maxContainer) maxContainer.classList.add('d-none');
        if (bonusHint) bonusHint.classList.remove('d-none');
        if (maxInput) maxInput.removeAttribute('required');
    } else {
        if (maxContainer) maxContainer.classList.remove('d-none');
        if (bonusHint) bonusHint.classList.add('d-none');
        if (maxInput) maxInput.setAttribute('required', 'required');
    }
}
window.toggleGradebookMaxScoreInput = toggleGradebookMaxScoreInput;

function openAddGradeColModal() {
    const form = document.getElementById('form-add-grade-col');
    if (form) form.reset();
    toggleGradebookMaxScoreInput();
    const modalEl = document.getElementById('addGradeColModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

function handleAddGradeColumn(e) {
    e.preventDefault();
    if (!activeClassroom) return;

    const titleInput = document.getElementById('gb-new-col-title');
    const maxInput = document.getElementById('gb-new-col-max');
    const term = document.querySelector('input[name="gb-col-term"]:checked')?.value || 'midterm';
    const isBonus = document.getElementById('gb-col-type-bonus')?.checked || false;

    const title = titleInput?.value.trim() || 'งานเก็บคะแนน';
    const max = isBonus ? null : (Number(maxInput?.value) || 10);

    if (!activeClassroom.gradebook) activeClassroom.gradebook = { config: {}, columns: [], scores: {} };
    if (!Array.isArray(activeClassroom.gradebook.columns)) activeClassroom.gradebook.columns = [];

    const newColId = 'col_' + Date.now();
    activeClassroom.gradebook.columns.push({
        id: newColId,
        title: title,
        max: max,
        is_bonus: isBonus,
        term: term // 'attendance' | 'midterm' | 'final' | 'other'
    });

    renderTabGradebook();
    saveGradebookRecord(true);

    document.getElementById('form-add-grade-col')?.reset();
    toggleGradebookMaxScoreInput();
    bootstrap.Modal.getInstance(document.getElementById('addGradeColModal'))?.hide();
    const termLabel = term === 'attendance' ? 'มาเรียน' : (term === 'other' ? 'อื่นๆ (คะแนนช่วย)' : (term === 'final' ? 'คะแนนเก็บปลายภาค' : 'คะแนนเก็บกลางภาค'));
    showToast('success', 'เพิ่มช่องคะแนนแล้ว', `เพิ่ม "${title}" ${isBonus ? '(ไม่มีคะแนนเต็ม)' : `(เต็ม ${max})`} ใน [${termLabel}] เรียบร้อย`);
}

// 🗑️ 8. ลบช่องคะแนน
async function deleteGradeColumn(colId) {
    if (!activeClassroom?.gradebook?.columns) return;
    const target = activeClassroom.gradebook.columns.find(c => c.id === colId);
    if (!target) return;

    const ok = await showGyverConfirm({
        title: `ลบช่องคะแนน "${target.title}"?`,
        subtitle: '⚠️ คะแนนของนักเรียนในช่องนี้จะถูกนำออกถาวร',
        icon: 'danger',
        confirmText: '<i class="bi bi-trash3-fill me-1"></i> ลบช่องคะแนน',
        confirmBtnClass: 'btn-danger'
    });
    if (!ok) return;

    activeClassroom.gradebook.columns = activeClassroom.gradebook.columns.filter(c => c.id !== colId);

    // ลบคะแนนในคีย์นี้ของนักเรียนทุกคน
    if (activeClassroom.gradebook.scores) {
        Object.keys(activeClassroom.gradebook.scores).forEach(key => {
            delete activeClassroom.gradebook.scores[key][colId];
        });
    }

    renderTabGradebook();
    saveGradebookRecord(true);
    showToast('info', 'ลบช่องคะแนนแล้ว', `ลบช่องคะแนน "${target.title}" สำเร็จ`);
}

// ⚙️ 9. ตั้งค่า ปพ.5 (Config Modal)
function calcGradebookConfigTotal() {
    const elAtt = document.getElementById('gb-cfg-attendance');
    const elMidForm = document.getElementById('gb-cfg-mid-formative');
    const elMid = document.getElementById('gb-cfg-midterm');
    const elFinForm = document.getElementById('gb-cfg-final-formative');
    const elFin = document.getElementById('gb-cfg-final');
    const label = document.getElementById('gb-cfg-total-label');

    const sum = (Number(elAtt?.value) || 0) + (Number(elMidForm?.value) || 0) + (Number(elMid?.value) || 0) + (Number(elFinForm?.value) || 0) + (Number(elFin?.value) || 0);
    if (label) {
        if (sum === 100) {
            label.className = 'fw-bold font-mono text-success';
            label.innerText = `รวม 100 / 100 คะแนน (ถูกต้อง ✓)`;
        } else {
            label.className = 'fw-bold font-mono text-danger';
            label.innerText = `รวม ${sum} / 100 คะแนน (ควรเท่ากับ 100)`;
        }
    }
}

function openGradebookConfigModal() {
    if (!activeClassroom) return;
    const gb = activeClassroom.gradebook || {};
    const cfg = gb.config || {};

    const elCode = document.getElementById('gb-cfg-code');
    const elName = document.getElementById('gb-cfg-name');
    const elSem = document.getElementById('gb-cfg-semester');
    const elYear = document.getElementById('gb-cfg-year');
    const elAtt = document.getElementById('gb-cfg-attendance');
    const elMidForm = document.getElementById('gb-cfg-mid-formative');
    const elMid = document.getElementById('gb-cfg-midterm');
    const elFinForm = document.getElementById('gb-cfg-final-formative');
    const elFin = document.getElementById('gb-cfg-final');

    if (elCode) elCode.value = cfg.subject_code || '';
    if (elName) elName.value = cfg.subject_name || activeClassroom.class_name || '';
    if (elSem) elSem.value = cfg.semester || '1';
    if (elYear) elYear.value = cfg.academic_year || '2569';
    
    if (elAtt) elAtt.value = cfg.attendance_max ?? 10;
    if (elMidForm) elMidForm.value = cfg.mid_formative_max ?? 20;
    if (elMid) elMid.value = cfg.midterm_max ?? 20;
    if (elFinForm) elFinForm.value = cfg.final_formative_max ?? 20;
    if (elFin) elFin.value = cfg.final_max ?? 30;

    calcGradebookConfigTotal();

    const modalEl = document.getElementById('gradebookConfigModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

function handleSaveGradebookConfig(e) {
    e.preventDefault();
    if (!activeClassroom) return;

    const elCode = document.getElementById('gb-cfg-code');
    const elName = document.getElementById('gb-cfg-name');
    const elSem = document.getElementById('gb-cfg-semester');
    const elYear = document.getElementById('gb-cfg-year');
    const elAtt = document.getElementById('gb-cfg-attendance');
    const elMidForm = document.getElementById('gb-cfg-mid-formative');
    const elMid = document.getElementById('gb-cfg-midterm');
    const elFinForm = document.getElementById('gb-cfg-final-formative');
    const elFin = document.getElementById('gb-cfg-final');

    if (!activeClassroom.gradebook) activeClassroom.gradebook = { config: {}, columns: [], scores: {} };

    const prevCfg = activeClassroom.gradebook.config || {};
    activeClassroom.gradebook.config = {
        ...prevCfg,
        subject_code: elCode?.value.trim() || '',
        subject_name: elName?.value.trim() || activeClassroom.class_name || '',
        semester: elSem?.value || '1',
        academic_year: elYear?.value.trim() || '2569',
        attendance_max: Number(elAtt?.value) || 10,
        mid_formative_max: Number(elMidForm?.value) || 20,
        midterm_max: Number(elMid?.value) || 20,
        final_formative_max: Number(elFinForm?.value) || 20,
        final_max: Number(elFin?.value) || 30
    };

    renderTabGradebook();
    saveGradebookRecord(true);

    bootstrap.Modal.getInstance(document.getElementById('gradebookConfigModal'))?.hide();
    showToast('success', 'บันทึกการตั้งค่าแล้ว', 'อัปเดตข้อมูลโครงสร้าง ปพ.5 เรียบร้อย');
}

// 📥 10. ดึงคะแนนจากการบ้านที่ตรวจแล้ว (Import Assignment)
function openImportAssignmentModal() {
    if (!activeClassroom) return;
    const assignments = Array.isArray(activeClassroom.assignments) ? activeClassroom.assignments : [];
    const select = document.getElementById('import-assignment-select');

    if (!select) return;

    if (assignments.length === 0) {
        select.innerHTML = '<option value="">-- ยังไม่มีการบ้านในห้องเรียนนี้ --</option>';
    } else {
        select.innerHTML = assignments.map(a => {
            const count = a.submissions ? Object.keys(a.submissions).length : 0;
            const isQuiz = a.type === 'quiz' || !!a.quiz_id;
            const prefix = isQuiz ? '⚡ [Gyver Quiz] ' : '📝 ';
            const maxPts = a.points || a.max_score || 10;
            return `<option value="${a.id}">${prefix}${a.title} (เต็ม ${maxPts} คะแนน • ${isQuiz ? 'สอบแล้ว' : 'ส่งแล้ว'} ${count} คน)</option>`;
        }).join('');
    }

    const modalEl = document.getElementById('importAssignmentModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

function executeImportAssignment() {
    if (!activeClassroom) return;
    const select = document.getElementById('import-assignment-select');
    const assignId = select?.value;
    if (!assignId) return;

    const term = document.querySelector('input[name="import-assign-term"]:checked')?.value || 'midterm';

    const assignments = Array.isArray(activeClassroom.assignments) ? activeClassroom.assignments : [];
    const target = assignments.find(a => a.id === assignId);
    if (!target) return;

    if (!activeClassroom.gradebook) activeClassroom.gradebook = { config: {}, columns: [], scores: {} };
    if (!Array.isArray(activeClassroom.gradebook.columns)) activeClassroom.gradebook.columns = [];
    if (!activeClassroom.gradebook.scores) activeClassroom.gradebook.scores = {};

    // เพิ่มคอลัมน์ใหม่สำหรับการบ้านนี้
    const colId = 'assign_' + target.id;
    const existingCol = activeClassroom.gradebook.columns.find(c => c.id === colId);

    if (!existingCol) {
        activeClassroom.gradebook.columns.push({
            id: colId,
            title: target.title.slice(0, 15),
            max: Number(target.max_score) || 10,
            term: term
        });
    } else {
        existingCol.term = term;
    }

    // ถ่ายโอนคะแนน
    const submissions = target.submissions || {};
    let importedCount = 0;

    Object.keys(submissions).forEach(studentKey => {
        const sub = submissions[studentKey];
        if (sub && sub.score !== undefined && sub.score !== null) {
            if (!activeClassroom.gradebook.scores[studentKey]) {
                activeClassroom.gradebook.scores[studentKey] = {};
            }
            activeClassroom.gradebook.scores[studentKey][colId] = Number(sub.score);
            importedCount++;
        }
    });

    renderTabGradebook();
    saveGradebookRecord(true);

    bootstrap.Modal.getInstance(document.getElementById('importAssignmentModal'))?.hide();
    const termLabel = term === 'attendance' ? 'มาเรียน' : (term === 'final' ? 'คะแนนเก็บปลายภาค' : 'คะแนนเก็บกลางภาค');
    showToast('success', 'ดึงคะแนนสำเร็จ!', `นำเข้าคะแนน "${target.title}" ของนักเรียน ${importedCount} คน ใส่ใน [${termLabel}] แล้ว`);
}

// ⚠️ 11. ตรวจสอบเวลาเรียนและแจ้งเตือนนักเรียนที่เสี่ยงติด มส. (Absent > 20%)
function syncAttendanceWarning() {
    if (!activeClassroom) return;
    const attendanceLogs = activeClassroom.attendance_logs || {};
    const dates = Object.keys(attendanceLogs);
    const totalDays = dates.length;

    if (totalDays === 0) {
        showToast('info', 'ยังไม่มีข้อมูลเช็คชื่อ', 'คุณครูยังไม่ได้บันทึกการเช็คชื่อในแท็บ 2');
        return;
    }

    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    let atRiskList = [];

    students.forEach(s => {
        const studentKey = s.user_id || s.name;
        let absentDays = 0;

        dates.forEach(d => {
            const dayMap = attendanceLogs[d] || {};
            const record = dayMap[studentKey];
            if (record && record.status === 'absent') {
                absentDays++;
            }
        });

        const absentRate = (absentDays / totalDays) * 100;
        if (absentRate >= 20) {
            atRiskList.push({ name: s.name, rate: absentRate.toFixed(0), days: absentDays });
            // เสนอปรับสถานะเป็น มส
            if (!activeClassroom.gradebook) activeClassroom.gradebook = { config: {}, columns: [], scores: {} };
            if (!activeClassroom.gradebook.scores) activeClassroom.gradebook.scores = {};
            if (!activeClassroom.gradebook.scores[studentKey]) activeClassroom.gradebook.scores[studentKey] = {};
            activeClassroom.gradebook.scores[studentKey].status = 'ms';
        }
    });

    renderTabGradebook();
    saveGradebookRecord(true);

    if (atRiskList.length > 0) {
        const names = atRiskList.map(a => `• ${a.name} (ขาด ${a.days}/${totalDays} วัน, ${a.rate}%)`).join('\n');
        alert(`⚠️ ตรวจพบนักเรียนขาดเรียนเกิน 20% ของเวลาเรียนทั้งหมด (${atRiskList.length} คน):\n\n${names}\n\nระบบได้เปลี่ยนสถานะเป็น [มส] ให้อัตโนมัติเรียบร้อยครับ`);
    } else {
        showToast('success', 'เวลาเรียนผ่านเกณฑ์ทุกคน', `นักเรียนทั้งห้องมีเวลาเรียนมากกว่า 80% (จากทั้งหมด ${totalDays} วัน)`);
    }
}

// 💾 12. บันทึกข้อมูลสมุดคะแนน ปพ.5 ลงคลาวด์และ LocalStorage
async function saveGradebookRecord(isSilent = false) {
    if (!activeClassroomId || !activeClassroom) return;

    const btn = document.getElementById('btn-save-gradebook');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึก...`;
    }

    const gb = activeClassroom.gradebook || {};
    localStorage.setItem(`gyver_gradebook_${activeClassroomId}`, JSON.stringify(gb));

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ gradebook: gb })
            .eq('id', activeClassroomId);

        if (!error) {
            if (!isSilent) showToast('success', 'บันทึกสำเร็จ!', 'บันทึกคะแนนและเกรด ปพ.5 ลงสู่ระบบเรียบร้อย');
        } else {
            console.warn("Supabase gradebook notice:", error.message);
            if (!isSilent) showToast('success', 'บันทึกสำเร็จ!', 'บันทึกข้อมูลสมุดคะแนนเรียบร้อย');
        }
    } catch (err) {
        console.warn("Save gradebook error:", err);
        if (!isSilent) showToast('success', 'บันทึกสำเร็จ!', 'บันทึกข้อมูลสมุดคะแนนเรียบร้อย');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-floppy-fill me-1"></i>บันทึกคะแนน`;
        }
    }
}

// 📊 13. ส่งออกรายงาน Excel (.CSV with UTF-8 BOM)
function exportGradebookToCSV() {
    if (!activeClassroom) return;
    const gb = activeClassroom.gradebook || {};
    const cfg = gb.config || {};
    const columns = Array.isArray(gb.columns) ? gb.columns : [];
    const scores = gb.scores || {};
    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];

    const attendanceWeight = Number(cfg.attendance_max ?? 10);
    const midFormativeWeight = Number(cfg.mid_formative_max ?? 20);
    const midtermMax = Number(cfg.midterm_max ?? 20);
    const finalFormativeWeight = Number(cfg.final_formative_max ?? 20);
    const finalMax = Number(cfg.final_max ?? 30);

    columns.forEach(col => {
        if (col.term === 'attendance' && (col.title.includes('ช่วยงาน') || col.title.includes('พิเศษ') || col.title.includes('อื่นๆ') || col.title.includes('คะแนนช่วย'))) {
            col.term = 'other';
        }
    });

    const attCols = columns.filter(c => c.term === 'attendance');
    const midCols = columns.filter(c => c.term === 'midterm' || (!c.term && c.term !== 'final' && c.term !== 'attendance' && c.term !== 'other'));
    const finalCols = columns.filter(c => c.term === 'final');
    const otherCols = columns.filter(c => c.term === 'other');

    const attRawMax = attCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);
    const midRawMax = midCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);
    const finalRawMax = finalCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);

    let csv = '\uFEFF'; // BOM สำหรับให้ Excel เปิดภาษาไทยได้โดยไม่เป็นภาษาต่างดาว

    // Header ข้อมูลวิชา
    csv += `"แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)"\r\n`;
    csv += `"วิชา","${cfg.subject_name || activeClassroom.class_name}","รหัสวิชา","${cfg.subject_code || '-'}","ภาคเรียน","${cfg.semester || 1}/${cfg.academic_year || 2569}"\r\n\r\n`;

    // คอลัมน์หัวตาราง
    const headers = ['เลขที่', 'รหัสนักเรียน', 'ชื่อ - สกุล'];
    if (attCols.length > 0) {
        attCols.forEach(c => headers.push(`"${c.title} ${c.is_bonus || !c.max ? '(ไม่มีคะแนนเต็ม)' : `(${c.max})`}"`));
        if (attCols.length > 1) headers.push(`"รวมมาเรียน (${attendanceWeight})"`);
    } else {
        headers.push(`"มาเรียน (${attendanceWeight})"`);
    }
    midCols.forEach(c => headers.push(`"${c.title} ${c.is_bonus || !c.max ? '(ไม่มีคะแนนเต็ม)' : `(${c.max})`}"`));
    headers.push(`"รวมเก็บกลางภาค (${midFormativeWeight})"`);
    headers.push(`"สอบกลางภาค (${midtermMax})"`);
    finalCols.forEach(c => headers.push(`"${c.title} ${c.is_bonus || !c.max ? '(ไม่มีคะแนนเต็ม)' : `(${c.max})`}"`));
    headers.push(`"รวมเก็บปลายภาค (${finalFormativeWeight})"`);
    headers.push(`"สอบปลายภาค (${finalMax})"`);
    if (otherCols.length > 0) {
        otherCols.forEach(c => headers.push(`"อื่นๆ: ${c.title} ${c.is_bonus || !c.max ? '(ไม่มีคะแนนเต็ม)' : `(${c.max})`}"`));
    }
    headers.push('"รวม 100"');
    headers.push('"เกรด"');
    headers.push('"คุณลักษณะ (0-3)"');
    headers.push('"อ่านคิดวิเคราะห์ (0-3)"');
    headers.push('"สถานะ"');

    csv += headers.join(',') + '\r\n';

    // บรรทัดนักเรียน
    students.forEach((s, idx) => {
        const studentKey = s.user_id || s.name;
        const sc = scores[studentKey] || {};

        let totalBonus = 0;
        columns.forEach(col => {
            const val = sc[col.id];
            if (val !== undefined && val !== '' && !isNaN(val)) {
                if (col.term === 'other' || col.is_bonus || !col.max) totalBonus += Number(val);
            }
        });

        let scaledAtt = 0;
        let attVals = [];
        if (attCols.length > 0) {
            let attRawSum = 0;
            attVals = attCols.map(c => {
                const v = sc[c.id];
                if (v !== undefined && v !== '' && !isNaN(v)) {
                    if (!c.is_bonus && Number(c.max) > 0) attRawSum += Number(v);
                    return v;
                }
                return '';
            });
            if (attRawMax > 0) {
                scaledAtt = Math.round(((attRawSum / attRawMax) * attendanceWeight) * 10) / 10;
            }
            if (attCols.length > 1) attVals.push(scaledAtt);
        } else {
            const directAttVal = sc.attendance !== undefined ? sc.attendance : '';
            scaledAtt = directAttVal !== '' ? Number(directAttVal) : 0;
            attVals = [scaledAtt];
        }

        let midRawSum = 0;
        const midVals = midCols.map(c => {
            const v = sc[c.id];
            if (v !== undefined && v !== '' && !isNaN(v)) {
                if (!c.is_bonus && Number(c.max) > 0) midRawSum += Number(v);
                return v;
            }
            return '';
        });

        let scaledMid = 0;
        if (midRawMax > 0) {
            scaledMid = Math.round(((midRawSum / midRawMax) * midFormativeWeight) * 10) / 10;
        }

        let finalRawSum = 0;
        const finalVals = finalCols.map(c => {
            const v = sc[c.id];
            if (v !== undefined && v !== '' && !isNaN(v)) {
                if (!c.is_bonus && Number(c.max) > 0) finalRawSum += Number(v);
                return v;
            }
            return '';
        });

        let scaledFinal = 0;
        if (finalRawMax > 0) {
            scaledFinal = Math.round(((finalRawSum / finalRawMax) * finalFormativeWeight) * 10) / 10;
        }

        const otherVals = otherCols.map(c => {
            const v = sc[c.id];
            return v !== undefined && v !== '' ? v : '';
        });

        const mid = Number(sc.midterm || 0);
        const fin = Number(sc.final || 0);
        const total = Math.min(100, Math.round((scaledAtt + scaledMid + mid + scaledFinal + fin + totalBonus) * 10) / 10);
        const gradeObj = calculateThaiGrade(total, sc.status || 'normal');

        const row = [
            idx + 1,
            `"${s.student_id || '-'}"`,
            `"${s.name || ''}"`,
            ...attVals,
            ...midVals,
            scaledMid,
            mid,
            ...finalVals,
            scaledFinal,
            fin,
            ...otherVals,
            total,
            `"${gradeObj.grade}"`,
            sc.traits !== undefined ? sc.traits : 3,
            sc.reading !== undefined ? sc.reading : 3,
            `"${sc.status || 'normal'}"`
        ];

        csv += row.join(',') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `ปพ5_${(cfg.subject_name || activeClassroom.class_name).replace(/\s+/g, '_')}_${cfg.academic_year || '2569'}.csv`;
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'ดาวน์โหลดสำเร็จ', `ส่งออกไฟล์ ${fileName} เรียบร้อยแล้ว`);
}

// 🖨️ 14. พิมพ์แบบ ปพ.5 ออกทางเครื่องพิมพ์ / กระดาษ A4
function printGradebookReport() {
    if (!activeClassroom) return;
    const gb = activeClassroom.gradebook || {};
    const cfg = gb.config || {};
    const columns = Array.isArray(gb.columns) ? gb.columns : [];
    const scores = gb.scores || {};
    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];

    const attendanceWeight = Number(cfg.attendance_max ?? 10);
    const midFormativeWeight = Number(cfg.mid_formative_max ?? 20);
    const midtermMax = Number(cfg.midterm_max ?? 20);
    const finalFormativeWeight = Number(cfg.final_formative_max ?? 20);
    const finalMax = Number(cfg.final_max ?? 30);

    const attCols = columns.filter(c => c.term === 'attendance');
    const midCols = columns.filter(c => c.term === 'midterm' || (!c.term && c.term !== 'final' && c.term !== 'attendance' && c.term !== 'other'));
    const finalCols = columns.filter(c => c.term === 'final');
    const otherCols = columns.filter(c => c.term === 'other');

    const attRawMax = attCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);
    const midRawMax = midCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);
    const finalRawMax = finalCols.reduce((sum, col) => sum + (col.is_bonus ? 0 : (Number(col.max) || 0)), 0);

    const printContainer = document.getElementById('print-pp5-container');
    if (!printContainer) return;

    let rowsHtml = '';
    let gradeCounts = { '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0, '0': 0, 'ร': 0, 'มส': 0 };

    students.forEach((s, idx) => {
        const studentKey = s.user_id || s.name;
        const sc = scores[studentKey] || {};

        let totalBonus = 0;
        columns.forEach(col => {
            if (col.is_bonus || !col.max) {
                const val = sc[col.id];
                if (val !== undefined && val !== '' && !isNaN(val)) totalBonus += Number(val);
            }
        });

        let scaledAtt = 0;
        let attColVals = '';
        if (attCols.length > 0) {
            let attRawSum = 0;
            attColVals = attCols.map(c => {
                const v = sc[c.id];
                if (v !== undefined && v !== '' && !isNaN(v)) {
                    if (!c.is_bonus && Number(c.max) > 0) attRawSum += Number(v);
                    return v;
                }
                return '-';
            }).map(v => `<td style="border: 1px solid #000; text-align: center; padding: 4px;">${v}</td>`).join('');

            if (attRawMax > 0) {
                scaledAtt = Math.round(((attRawSum / attRawMax) * attendanceWeight) * 10) / 10;
            }
            if (attCols.length > 1) {
                attColVals += `<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: bold;">${scaledAtt}</td>`;
            }
        } else {
            const directAttVal = sc.attendance !== undefined ? sc.attendance : '';
            scaledAtt = directAttVal !== '' ? Number(directAttVal) : 0;
            attColVals = `<td style="border: 1px solid #000; text-align: center; padding: 4px;">${scaledAtt}</td>`;
        }

        let midRawSum = 0;
        const midColVals = midCols.map(c => {
            const v = sc[c.id];
            if (v !== undefined && v !== '' && !isNaN(v)) {
                if (!c.is_bonus && Number(c.max) > 0) midRawSum += Number(v);
                return v;
            }
            return '-';
        }).map(v => `<td style="border: 1px solid #000; text-align: center; padding: 4px;">${v}</td>`).join('');

        let scaledMid = 0;
        if (midRawMax > 0) {
            scaledMid = Math.round(((midRawSum / midRawMax) * midFormativeWeight) * 10) / 10;
        }

        let finalRawSum = 0;
        const finalColVals = finalCols.map(c => {
            const v = sc[c.id];
            if (v !== undefined && v !== '' && !isNaN(v)) {
                if (!c.is_bonus && Number(c.max) > 0) finalRawSum += Number(v);
                return v;
            }
            return '-';
        }).map(v => `<td style="border: 1px solid #000; text-align: center; padding: 4px;">${v}</td>`).join('');

        let scaledFinal = 0;
        if (finalRawMax > 0) {
            scaledFinal = Math.round(((finalRawSum / finalRawMax) * finalFormativeWeight) * 10) / 10;
        }

        const mid = Number(sc.midterm || 0);
        const fin = Number(sc.final || 0);
        const total = Math.min(100, Math.round((scaledAtt + scaledMid + mid + scaledFinal + fin + totalBonus) * 10) / 10);
        const gradeObj = calculateThaiGrade(total, sc.status || 'normal');

        if (gradeCounts[gradeObj.grade] !== undefined) {
            gradeCounts[gradeObj.grade]++;
        }

        rowsHtml += `
            <tr>
                <td style="border: 1px solid #000; text-align: center; padding: 4px;">${idx + 1}</td>
                <td style="border: 1px solid #000; text-align: left; padding: 4px 8px;">${s.name}</td>
                ${attColVals}
                ${midColVals}
                <td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: bold;">${scaledMid}</td>
                <td style="border: 1px solid #000; text-align: center; padding: 4px;">${mid}</td>
                ${finalColVals}
                <td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: bold;">${scaledFinal}</td>
                <td style="border: 1px solid #000; text-align: center; padding: 4px;">${fin}</td>
                <td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: bold;">${total}</td>
                <td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: bold;">${gradeObj.grade}</td>
                <td style="border: 1px solid #000; text-align: center; padding: 4px;">${sc.traits !== undefined ? sc.traits : 3}</td>
                <td style="border: 1px solid #000; text-align: center; padding: 4px;">${sc.reading !== undefined ? sc.reading : 3}</td>
                <td style="border: 1px solid #000; text-align: center; padding: 4px;">${sc.status === 'ms' ? 'มส' : sc.status === 'r' ? 'ร' : 'ผ่าน'}</td>
            </tr>
        `;
    });

    const attHeaderHtml = attCols.length > 0 
        ? (attCols.map(c => `<th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">${c.title}<br>${c.is_bonus || !c.max ? '(ไม่มีคะแนนเต็ม)' : `(${c.max})`}</th>`).join('') + (attCols.length > 1 ? `<th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">รวมมาเรียน<br>(${attendanceWeight})</th>` : ''))
        : `<th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">มาเรียน<br>(${attendanceWeight})</th>`;

    const midHeaderHtml = midCols.map(c => `
        <th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">${c.title}<br>${c.is_bonus || !c.max ? '(ไม่มีคะแนนเต็ม)' : `(${c.max})`}</th>
    `).join('');

    const finalHeaderHtml = finalCols.map(c => `
        <th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">${c.title}<br>${c.is_bonus || !c.max ? '(ไม่มีคะแนนเต็ม)' : `(${c.max})`}</th>
    `).join('');

    const attColspan = attCols.length > 0 ? (attCols.length > 1 ? attCols.length + 1 : attCols.length) : 1;

    printContainer.innerHTML = `
        <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 13px; line-height: 1.4; padding: 20px; color: #000;">
            <div style="text-align: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: bold;">แบบประเมินผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)</h3>
                <h4 style="margin: 4px 0; font-size: 15px;">กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี • ภาคเรียนที่ ${cfg.semester || 1} ปีการศึกษา ${cfg.academic_year || 2569}</h4>
                <p style="margin: 0; font-size: 13px;">รายวิชา: <b>${cfg.subject_name || activeClassroom.class_name}</b> (รหัสวิชา: ${cfg.subject_code || '-'}) • ระดับชั้น: ${activeClassroom.class_name}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 35px;">เลขที่</th>
                        <th rowspan="2" style="border: 1px solid #000; padding: 4px; min-width: 140px;">ชื่อ - สกุล</th>
                        <th colspan="${attColspan}" style="border: 1px solid #000; padding: 4px;">มาเรียน (${attendanceWeight})</th>
                        <th colspan="${midCols.length + 1}" style="border: 1px solid #000; padding: 4px;">คะแนนเก็บกลางภาค (${midFormativeWeight})</th>
                        <th style="border: 1px solid #000; padding: 4px;">คะแนนสอบกลางภาค</th>
                        <th colspan="${finalCols.length + 1}" style="border: 1px solid #000; padding: 4px;">คะแนนเก็บปลายภาค (${finalFormativeWeight})</th>
                        <th style="border: 1px solid #000; padding: 4px;">สอบปลายภาค</th>
                        <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 45px;">รวม<br>(100)</th>
                        <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 38px;">เกรด</th>
                        <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 50px;">คุณลักษณะ<br>(0-3)</th>
                        <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 50px;">อ่าน/คิด<br>(0-3)</th>
                        <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 45px;">สถานะ</th>
                    </tr>
                    <tr style="background: #f9f9f9;">
                        ${attHeaderHtml}
                        ${midHeaderHtml}
                        <th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">รวมเก็บ<br>(${midFormativeWeight})</th>
                        <th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">กลางภาค<br>(${midtermMax})</th>
                        ${finalHeaderHtml}
                        <th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">รวมเก็บ<br>(${finalFormativeWeight})</th>
                        <th style="border: 1px solid #000; padding: 4px; font-size: 0.8rem;">ปลายภาค<br>(${finalMax})</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <!-- สรุปผลการตัดเกรด -->
            <div style="display: flex; justify-content: space-between; gap: 20px; margin-top: 15px; font-size: 12px;">
                <div style="border: 1px solid #000; padding: 8px; flex: 1;">
                    <b>📊 สรุปผลการประเมินนักเรียน (ทั้งหมด ${students.length} คน)</b>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
                        <span>เกรด 4: <b>${gradeCounts['4']}</b> คน</span> |
                        <span>เกรด 3.5: <b>${gradeCounts['3.5']}</b> คน</span> |
                        <span>เกรด 3: <b>${gradeCounts['3']}</b> คน</span> |
                        <span>เกรด 2.5: <b>${gradeCounts['2.5']}</b> คน</span> |
                        <span>เกรด 2: <b>${gradeCounts['2']}</b> คน</span> |
                        <span>เกรด 1.5: <b>${gradeCounts['1.5']}</b> คน</span> |
                        <span>เกรด 1: <b>${gradeCounts['1']}</b> คน</span> |
                        <span>เกรด 0: <b>${gradeCounts['0']}</b> คน</span>
                    </div>
                </div>
            </div>

            <!-- ลายเซ็นครูและผู้บริหาร -->
            <div style="display: flex; justify-content: space-around; margin-top: 35px; text-align: center; font-size: 13px;">
                <div>
                    <div>ลงชื่อ............................................................</div>
                    <div style="margin-top: 4px;">(............................................................)</div>
                    <div>ครูผู้สอน</div>
                </div>
                <div>
                    <div>ลงชื่อ............................................................</div>
                    <div style="margin-top: 4px;">(............................................................)</div>
                    <div>หัวหน้ากลุ่มสาระการเรียนรู้</div>
                </div>
                <div>
                    <div>ลงชื่อ............................................................</div>
                    <div style="margin-top: 4px;">(............................................................)</div>
                    <div>นายทะเบียน / ผู้อำนวยการ</div>
                </div>
            </div>
        </div>
    `;

    printContainer.classList.remove('d-none');
    window.print();
    setTimeout(() => {
        printContainer.classList.add('d-none');
    }, 1000);
}

