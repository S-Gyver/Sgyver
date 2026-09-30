/**
 * ====================================================
 * 🏫 Gyver My Classroom (ห้องเรียนของฉัน) - Main Logic
 * ====================================================
 */

let currentUserId = null;
let cachedClassrooms = [];
let activeClassroomId = null;
let activeClassroom = null;

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
        }
    });
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
        await loadClassrooms();

    } catch (err) {
        console.error("fetchUserAndClassrooms error:", err);
    }
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
    return c;
}

// 📚 ดึงรายชื่อห้องเรียนทั้งหมดของครูคนนี้
async function loadClassrooms() {
    if (!currentUserId) return;

    const { data: classrooms, error } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('teacher_id', currentUserId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch classrooms error:", error.message);
        showToast('error', 'โหลดห้องเรียนไม่สำเร็จ', error.message);
        return;
    }

    cachedClassrooms = (classrooms || []).map(enrichClassroom);

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

    renderHubClassrooms(cachedClassrooms);
}

function handleSearchClassrooms(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
        renderHubClassrooms(cachedClassrooms);
        return;
    }

    const filtered = cachedClassrooms.filter(c => 
        (c.class_name || '').toLowerCase().includes(q) ||
        (c.room_code || '').toLowerCase().includes(q)
    );
    renderHubClassrooms(filtered);
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

    grid.innerHTML = classroomsList.map(c => {
        const studentCount = Array.isArray(c.students) ? c.students.length : 0;
        const materialsCount = Array.isArray(c.materials) ? c.materials.length : 0;
        const assignmentsCount = Array.isArray(c.assignments) ? c.assignments.length : 0;
        const roomCode = c.room_code || '------';
        const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('th-TH') : '';

        return `
        <div class="col-md-6 col-lg-4">
            <div class="hub-classroom-card h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <span class="room-code-badge" title="รหัสห้องเรียน">
                        <i class="bi bi-key-fill text-success"></i> ${roomCode}
                        <button class="room-code-copy-btn ms-1" onclick="quickCopyCode('${roomCode}')" title="คัดลอกรหัสห้อง">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </span>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical fs-5"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3">
                            <li>
                                <a class="dropdown-item py-2" href="javascript:void(0)" onclick="quickOpenQRModal('${c.id}')">
                                    <i class="bi bi-qr-code me-2 text-primary"></i>แสดง QR Code
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="deleteClassroomFromHub('${c.id}', '${encodeURIComponent(c.class_name)}')">
                                    <i class="bi bi-trash3 me-2"></i>ลบห้องเรียนนี้
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <h4 class="fw-bold text-dark mb-2 text-truncate" title="${c.class_name || 'ไม่มีชื่อห้อง'}">
                    ${c.class_name || 'ไม่มีชื่อห้อง'}
                </h4>
                
                <div class="d-flex flex-wrap gap-2 mb-4">
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-people-fill me-1"></i>${studentCount} คน
                    </span>
                    <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-folder-fill me-1"></i>${materialsCount} ไฟล์
                    </span>
                    <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-journal-text me-1"></i>${assignmentsCount} งาน
                    </span>
                </div>

                <div class="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
                    <small class="text-muted font-mono" style="font-size: 0.75rem;">สร้างเมื่อ: ${dateStr}</small>
                    <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" onclick="enterClassroom('${c.id}')">
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

    const className = document.getElementById('class-title').value.trim();
    const btnSave = document.getElementById('btn-save-class');
    btnSave.disabled = true;

    try {
        const payload = {
            teacher_id: currentUserId,
            class_name: className,
            room_code: generateRoomCode(),
            students: []
        };

        const { data, error } = await supabaseClient.from('classrooms').insert([payload]).select();
        if (!error && data && data[0]) {
            const newClass = enrichClassroom(data[0]);
            showToast('success', 'สร้างห้องเรียนสำเร็จ!', `ห้องเรียน "${className}" พร้อมใช้งานแล้ว`);
            document.getElementById('form-create-class').reset();
            bootstrap.Modal.getInstance(document.getElementById('addClassModal'))?.hide();

            cachedClassrooms.unshift(newClass);
            renderHubClassrooms(cachedClassrooms);

            // นำครูเข้าสู่ห้องเรียนใหม่ทันที
            enterClassroom(newClass.id);
        } else {
            showToast('error', 'สร้างห้องเรียนไม่สำเร็จ', error?.message || 'เกิดข้อผิดพลาด');
        }
    } finally {
        btnSave.disabled = false;
    }
}

async function deleteClassroomFromHub(classId, encodedName) {
    const className = decodeURIComponent(encodedName);
    if (!confirm(`⚠️ คุณแน่ใจหรือไม่ที่จะลบห้อง "${className}" ? ข้อมูลทั้งหมดจะถูกลบถาวร`)) return;

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
    try {
        const lastTabId = localStorage.getItem(`gyver_last_tab_${activeClassroomId}`);
        if (lastTabId) {
            const tabTriggerEl = document.getElementById(lastTabId);
            if (tabTriggerEl && typeof bootstrap !== 'undefined') {
                const tabInstance = bootstrap.Tab.getOrCreateInstance(tabTriggerEl);
                tabInstance.show();
            }
        }
    } catch (e) {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderNavbarRoomDropdown() {
    const navRoomTitle = document.getElementById('navbar-current-room-name');
    if (navRoomTitle && activeClassroom) {
        navRoomTitle.innerText = activeClassroom.class_name || 'เลือกห้องเรียน';
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
    const codeEl = document.getElementById('current-class-code');
    const codeBadge = document.getElementById('current-class-code-badge');
    const subtitleEl = document.getElementById('current-class-subtitle');

    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    const roomCode = activeClassroom.room_code || '------';

    if (titleEl) titleEl.innerText = activeClassroom.class_name || 'ไม่มีชื่อห้อง';
    if (codeEl) codeEl.innerText = roomCode;
    if (codeBadge) codeBadge.style.display = 'inline-flex';
    if (subtitleEl) subtitleEl.innerText = `รหัสห้อง: ${roomCode} • จำนวนนักเรียน: ${students.length} คน`;

    const statStudents = document.getElementById('stat-student-count');
    if (statStudents) statStudents.innerText = `${students.length} คน`;

    updateAttendanceStatsBadge();
    updateMaterialsCountBadge();
    updateAssignmentsCountBadge();
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
            return `
            <div class="student-card-mini">
                <img src="${avatar}" alt="${nickname}" onclick="openPhotoZoom('${avatar}', '${s.name}')" title="คลิกดูรูปขยาย">
                <div class="fw-bold text-dark small text-truncate" title="${s.name}">${nickname}</div>
                <div class="text-muted font-mono" style="font-size: 0.7rem;">#${idx + 1}</div>
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

function renderTabAttendance() {
    const tbody = document.getElementById('attendance-table-body');
    if (!tbody || !activeClassroom) return;

    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">ยังไม่มีรายชื่อนักเรียนในห้องนี้</td></tr>`;
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

        const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;

        return `
        <tr>
            <td class="text-center font-mono text-muted">${idx + 1}</td>
            <td>
                <img src="${avatar}" class="rounded-circle border" style="width: 38px; height: 38px; object-fit: cover; cursor: pointer;" onclick="openPhotoZoom('${avatar}', '${s.name}')">
            </td>
            <td>
                <div class="fw-bold text-dark">${s.name}</div>
                <div class="text-muted small">${s.nickname ? `ชื่อเล่น: ${s.nickname}` : ''}</div>
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
                <input type="text" class="form-control form-control-sm rounded-3" placeholder="ระบุเหตุผล (ถ้ามี)" value="${note}" onchange="updateStudentAttendanceNote('${studentKey}', this.value)">
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

/* ============================================================== */
/* 📂 TAB 3: แจกไฟล์ & ชีทเรียน (Course Materials Hub) */
/* ============================================================== */
function updateMaterialsCountBadge() {
    const badge = document.getElementById('stat-material-count');
    if (!badge || !activeClassroom) return;
    const materials = Array.isArray(activeClassroom.materials) ? activeClassroom.materials : [];
    badge.innerText = `${materials.length} ไฟล์`;
}

function loadMaterials() {
    const container = document.getElementById('materials-container');
    if (!container || !activeClassroom) return;

    const materials = Array.isArray(activeClassroom.materials) ? activeClassroom.materials : [];
    updateMaterialsCountBadge();

    if (materials.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 bg-light rounded-4 border border-dashed">
                <i class="bi bi-cloud-arrow-up fs-1 text-primary opacity-50 d-block mb-2"></i>
                <h6 class="fw-bold text-dark mb-1">ยังไม่มีเอกสารหรือไฟล์ที่แจก</h6>
                <p class="small text-muted mb-3">กดปุ่ม "เพิ่มเอกสาร/แจกไฟล์" ด้านบน เพื่อวางสไลด์หรือชีทเรียนให้นักเรียนดาวน์โหลด</p>
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

async function handleSaveMaterial(e) {
    e.preventDefault();
    if (!activeClassroom) return;

    const title = document.getElementById('material-title').value.trim();
    const category = document.getElementById('material-category').value;
    const url = document.getElementById('material-url').value.trim();
    const desc = document.getElementById('material-desc').value.trim();

    const newMaterial = {
        id: 'mat_' + Date.now(),
        title: title,
        category: category,
        file_url: url,
        description: desc,
        created_at: new Date().toISOString()
    };

    let materials = Array.isArray(activeClassroom.materials) ? activeClassroom.materials : [];
    materials.unshift(newMaterial);
    activeClassroom.materials = materials;
    localStorage.setItem(`gyver_materials_${activeClassroomId}`, JSON.stringify(materials));

    const btn = document.getElementById('btn-save-material');
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ materials: materials })
            .eq('id', activeClassroomId);

        if (error) console.warn("Supabase materials notice:", error.message);
        showToast('success', 'เพิ่มเอกสารสำเร็จ!', `เอกสาร "${title}" ถูกเพิ่มเข้าห้องเรียนแล้ว`);
        document.getElementById('form-add-material').reset();
        bootstrap.Modal.getInstance(document.getElementById('addMaterialModal'))?.hide();
        loadMaterials();
    } catch (err) {
        console.warn("Save material error:", err);
        showToast('success', 'เพิ่มเอกสารสำเร็จ!', `เอกสาร "${title}" ถูกเพิ่มเข้าห้องเรียนแล้ว`);
        document.getElementById('form-add-material').reset();
        bootstrap.Modal.getInstance(document.getElementById('addMaterialModal'))?.hide();
        loadMaterials();
    } finally {
        btn.disabled = false;
    }
}

async function deleteMaterial(idx) {
    if (!activeClassroom) return;
    if (!confirm('⚠️ ยืนยันการลบเอกสารนี้หรือไม่?')) return;

    let materials = Array.isArray(activeClassroom.materials) ? activeClassroom.materials : [];
    materials.splice(idx, 1);
    activeClassroom.materials = materials;
    localStorage.setItem(`gyver_materials_${activeClassroomId}`, JSON.stringify(materials));

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ materials: materials })
            .eq('id', activeClassroomId);

        if (error) console.warn("Supabase delete material notice:", error.message);
    } catch (err) {
        console.warn("Delete material error:", err);
    }
    showToast('info', 'ลบเอกสารแล้ว', 'ลบเอกสารออกจากห้องเรียนเรียบร้อย');
    loadMaterials();
}

/* ============================================================== */
/* 📝 TAB 4: สั่งงาน & ตรวจงาน (Assignments & Submissions) */
/* ============================================================== */
function updateAssignmentsCountBadge() {
    const badge = document.getElementById('stat-assignment-count');
    if (!badge || !activeClassroom) return;
    const assignments = Array.isArray(activeClassroom.assignments) ? activeClassroom.assignments : [];
    badge.innerText = `${assignments.length} ชิ้น`;
}

function loadAssignments() {
    const container = document.getElementById('assignments-container');
    if (!container || !activeClassroom) return;

    const assignments = Array.isArray(activeClassroom.assignments) ? activeClassroom.assignments : [];
    updateAssignmentsCountBadge();

    if (assignments.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 bg-light rounded-4 border border-dashed">
                <i class="bi bi-pencil-square fs-1 text-info opacity-50 d-block mb-2"></i>
                <h6 class="fw-bold text-dark mb-1">ยังไม่มีการบ้านหรือชิ้นงานที่มอบหมาย</h6>
                <p class="small text-muted mb-3">กดปุ่ม "สั่งงานใหม่" เพื่อสร้างโจทย์ กำหนดส่ง และเปิดให้นักเรียนส่งงาน</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#addAssignmentModal">
                    <i class="bi bi-plus-circle-fill me-1"></i>สั่งงานแรก
                </button>
            </div>`;
        return;
    }

    container.innerHTML = assignments.map((a, idx) => {
        const submissions = a.submissions || {};
        const submittedCount = Object.keys(submissions).length;
        const totalStudents = Array.isArray(activeClassroom.students) ? activeClassroom.students.length : 0;
        const dueDateStr = a.due_date ? new Date(a.due_date).toLocaleDateString('th-TH') : 'ไม่ระบุ';

        return `
        <div class="col-md-6 col-lg-6">
            <div class="assignment-card h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
                        <i class="bi bi-award-fill me-1"></i>${a.points || 10} คะแนน
                    </span>
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteAssignment(${idx})" title="ลบงานนี้">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>

                <h5 class="fw-bold text-dark mb-1">${a.title}</h5>
                <p class="text-muted small mb-3 flex-grow-1" style="font-size: 0.85rem;">${a.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>

                <div class="bg-light p-2 px-3 rounded-3 mb-3 d-flex justify-content-between align-items-center">
                    <small class="text-muted"><i class="bi bi-clock me-1"></i>กำหนดส่ง: <b>${dueDateStr}</b></small>
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                        ส่งแล้ว ${submittedCount}/${totalStudents} คน
                    </span>
                </div>

                <div class="d-flex gap-2 pt-2 border-top mt-auto">
                    <button class="btn btn-primary btn-sm rounded-3 fw-bold flex-grow-1" onclick="openSubmissionsModal('${a.id}')">
                        <i class="bi bi-clipboard2-check me-1"></i>ตรวจงาน (${submittedCount} คน)
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function handleSaveAssignment(e) {
    e.preventDefault();
    if (!activeClassroom) return;

    const title = document.getElementById('assignment-title').value.trim();
    const dueDate = document.getElementById('assignment-due-date').value;
    const points = parseInt(document.getElementById('assignment-points').value) || 10;
    const desc = document.getElementById('assignment-desc').value.trim();

    const newAssignment = {
        id: 'assign_' + Date.now(),
        title: title,
        due_date: dueDate,
        points: points,
        description: desc,
        submissions: {},
        created_at: new Date().toISOString()
    };

    let assignments = Array.isArray(activeClassroom.assignments) ? activeClassroom.assignments : [];
    assignments.unshift(newAssignment);
    activeClassroom.assignments = assignments;
    localStorage.setItem(`gyver_assignments_${activeClassroomId}`, JSON.stringify(assignments));

    const btn = document.getElementById('btn-save-assignment');
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ assignments: assignments })
            .eq('id', activeClassroomId);

        if (error) console.warn("Supabase assignments notice:", error.message);
        showToast('success', 'สั่งงานสำเร็จ!', `งาน "${title}" ถูกสร้างเรียบร้อยแล้ว`);
        document.getElementById('form-add-assignment').reset();
        bootstrap.Modal.getInstance(document.getElementById('addAssignmentModal'))?.hide();
        loadAssignments();
    } catch (err) {
        console.warn("Save assignment error:", err);
        showToast('success', 'สั่งงานสำเร็จ!', `งาน "${title}" ถูกสร้างเรียบร้อยแล้ว`);
        document.getElementById('form-add-assignment').reset();
        bootstrap.Modal.getInstance(document.getElementById('addAssignmentModal'))?.hide();
        loadAssignments();
    } finally {
        btn.disabled = false;
    }
}

async function deleteAssignment(idx) {
    if (!activeClassroom) return;
    if (!confirm('⚠️ ยืนยันการลบการบ้านชิ้นนี้หรือไม่?')) return;

    let assignments = Array.isArray(activeClassroom.assignments) ? activeClassroom.assignments : [];
    assignments.splice(idx, 1);
    activeClassroom.assignments = assignments;
    localStorage.setItem(`gyver_assignments_${activeClassroomId}`, JSON.stringify(assignments));

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ assignments: assignments })
            .eq('id', activeClassroomId);

        if (error) console.warn("Supabase delete assignment notice:", error.message);
    } catch (err) {
        console.warn("Delete assignment error:", err);
    }
    showToast('info', 'ลบงานแล้ว', 'ลบการบ้านออกจากห้องเรียนเรียบร้อย');
    loadAssignments();
}

function openSubmissionsModal(assignmentId) {
    activeAssignmentId = assignmentId;
    const assignments = Array.isArray(activeClassroom.assignments) ? activeClassroom.assignments : [];
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    document.getElementById('submissions-modal-title').innerText = `ตรวจงาน: ${assignment.title}`;
    document.getElementById('submissions-modal-subtitle').innerText = `คะแนนเต็ม: ${assignment.points} คะแนน • กำหนดส่ง: ${assignment.due_date || 'ไม่ระบุ'}`;

    renderSubmissionsTable(assignment);

    const modal = new bootstrap.Modal(document.getElementById('submissionsModal'));
    modal.show();
}

function renderSubmissionsTable(assignment) {
    const tbody = document.getElementById('submissions-table-body');
    const students = Array.isArray(activeClassroom.students) ? activeClassroom.students : [];
    const submissions = assignment.submissions || {};

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">ยังไม่มีนักเรียนในห้องนี้</td></tr>`;
        return;
    }

    tbody.innerHTML = students.map((s, idx) => {
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
            <td>
                ${hasSubmitted ? `<span class="badge bg-success-subtle text-success font-mono">${new Date(sub.submitted_at).toLocaleDateString('th-TH')}</span>` : '<span class="badge bg-secondary-subtle text-secondary">ยังไม่ส่ง</span>'}
            </td>
            <td>
                ${hasSubmitted && sub.file_url ? `
                    <a href="${sub.file_url}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1">
                        <i class="bi bi-box-arrow-up-right me-1"></i>ดูผลงาน
                    </a>
                    ${sub.comment ? `<div class="small text-muted mt-1">💬 "${sub.comment}"</div>` : ''}
                ` : '<span class="text-muted small">-</span>'}
            </td>
            <td>
                <input type="number" class="form-control form-control-sm text-center font-mono" id="score_input_${idx}" value="${hasSubmitted ? (sub.score ?? '') : ''}" max="${assignment.points}" min="0" placeholder="0/${assignment.points}">
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-primary rounded-2 px-2" onclick="saveStudentGrade('${studentKey}', 'score_input_${idx}')" title="บันทึกคะแนน">
                    <i class="bi bi-check2"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function saveStudentGrade(studentKey, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const scoreVal = input.value === '' ? null : parseFloat(input.value);

    let assignments = Array.isArray(activeClassroom.assignments) ? activeClassroom.assignments : [];
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

    activeClassroom.assignments = assignments;
    localStorage.setItem(`gyver_assignments_${activeClassroomId}`, JSON.stringify(assignments));

    try {
        const { error } = await supabaseClient
            .from('classrooms')
            .update({ assignments: assignments })
            .eq('id', activeClassroomId);

        if (error) console.warn("Supabase save grade notice:", error.message);
    } catch (err) {
        console.warn("Save grade error:", err);
    }
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
