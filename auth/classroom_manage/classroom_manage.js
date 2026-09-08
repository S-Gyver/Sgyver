let currentUserId = null;
let activeClassroom = null;
let cachedClassrooms = [];
let studentSearchQuery = "";

document.addEventListener('DOMContentLoaded', async () => {
    await fetchUserAndClassrooms();
});

async function fetchUserAndClassrooms() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) return;

        currentUserId = session.user.id;
        await loadClassroomList();
    } catch (err) {
        console.error("Error loading user:", err);
    }
}

async function loadClassroomList() {
    if (!currentUserId) return;

    const { data: classrooms, error } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('teacher_id', currentUserId)
        .order('created_at', { ascending: false });

    const container = document.getElementById('classroom-list-container');
    if (!container) return;

    if (error) {
        console.error("Fetch classrooms error:", error.message);
        return;
    }

    cachedClassrooms = classrooms || [];

    if (cachedClassrooms.length > 0) {
        container.innerHTML = cachedClassrooms.map(c => {
            const studentCount = Array.isArray(c.students) ? c.students.length : 0;
            const code = c.room_code || 'N/A';
            const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('th-TH') : '';

            return `
            <div class="col-md-6 col-lg-4">
                <div class="classroom-card h-100 d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="room-code-badge">
                            <i class="bi bi-key-fill text-success"></i> ${code}
                            <button class="room-code-copy-btn" onclick="quickCopyCode('${code}')" title="คัดลอกรหัสห้อง">
                                <i class="bi bi-clipboard"></i>
                            </button>
                        </span>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical fs-5"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3">
                                <li>
                                    <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="deleteClassroom('${c.id}', '${encodeURIComponent(c.class_name)}')">
                                        <i class="bi bi-trash3 me-2"></i>ลบห้องเรียนนี้
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <h5 class="fw-bold text-dark mb-1 text-truncate">${c.class_name || 'ไม่มีชื่อห้อง'}</h5>
                    <div class="d-flex align-items-center gap-2 mb-3">
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                            <i class="bi bi-people me-1"></i>${studentCount} คน
                        </span>
                        <small class="text-muted font-mono" style="font-size: 0.75rem;">${dateStr}</small>
                    </div>

                    <!-- ปุ่มลัดปฏิบัติการ -->
                    <div class="d-flex gap-2 mt-auto pt-2 border-top">
                        <button class="btn btn-primary btn-sm rounded-3 fw-bold flex-grow-1" onclick="openManageStudentsModal('${c.id}')">
                            <i class="bi bi-person-gear me-1"></i>จัดการนักเรียน
                        </button>
                        <button class="btn btn-outline-primary btn-sm rounded-3 px-3" onclick="quickOpenQRModal('${c.id}')" title="แสดง QR Code ให้เด็กสแกน">
                            <i class="bi bi-qr-code-scan"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } else {
        container.innerHTML = `
            <div class="col-12 text-center py-5 bg-white rounded-4 border border-dashed shadow-sm">
                <div class="bg-primary-subtle text-primary d-inline-flex p-3 rounded-circle mb-3">
                    <i class="bi bi-door-open fs-1"></i>
                </div>
                <h5 class="fw-bold text-dark mb-1">ยังไม่มีห้องเรียนในระบบ</h5>
                <p class="text-muted small mb-3">สร้างห้องเรียนแรกของคุณเพื่อเริ่มจัดการรายชื่อและสุ่มกิจกรรมหน้าชั้น</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#addClassModal">
                    <i class="bi bi-plus-circle-fill me-1"></i>สร้างห้องเรียนใหม่
                </button>
            </div>`;
    }
}

function quickCopyCode(code) {
    if (!code || code === 'N/A') return;
    navigator.clipboard.writeText(code);
    showToast('success', 'คัดลอกแล้ว', `คัดลอกรหัสห้อง ${code} เรียบร้อยแล้ว`);
}

async function deleteClassroom(classId, encodedName) {
    const className = decodeURIComponent(encodedName);
    if (!confirm(`⚠️ คุณแน่ใจหรือไม่ที่จะลบห้อง "${className}" ? รายชื่อและคะแนนทั้งหมดจะถูกลบถาวร`)) return;

    const { error } = await supabaseClient
        .from('classrooms')
        .delete()
        .eq('id', classId)
        .eq('teacher_id', currentUserId);

    if (!error) {
        showToast('info', 'ลบห้องเรียนสำเร็จ', `ลบห้อง "${className}" เรียบร้อยแล้ว`);
        await loadClassroomList();
    } else {
        showToast('error', 'ลบไม่สำเร็จ', error.message);
    }
}

async function openManageStudentsModal(classId) {
    const { data: classroom } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('id', classId)
        .single();

    if (!classroom) return;

    activeClassroom = classroom;
    if (!Array.isArray(activeClassroom.students)) {
        activeClassroom.students = [];
    }

    studentSearchQuery = "";
    const searchInput = document.getElementById('search-student-input');
    if (searchInput) searchInput.value = "";

    document.getElementById('student-modal-title').innerHTML = `<i class="bi bi-people-fill me-2 text-primary"></i>จัดการนักเรียน - ${activeClassroom.class_name}`;
    renderStudentTable();

    const modal = new bootstrap.Modal(document.getElementById('manageStudentsModal'));
    modal.show();
}

function filterStudentTable(query) {
    studentSearchQuery = (query || '').trim().toLowerCase();
    renderStudentTable();
}

// 🎨 แสดงตารางรายชื่อนักเรียน พร้อมฟังก์ชันคลิกดู PhotoZoom และ Search Filter
function renderStudentTable() {
    const tbody = document.getElementById('student-table-body');
    const countEl = document.getElementById('student-count');
    const students = activeClassroom?.students || [];

    countEl.innerText = students.length;

    let filtered = students;
    if (studentSearchQuery) {
        filtered = students.filter(s => (s.name || '').toLowerCase().includes(studentSearchQuery));
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">${studentSearchQuery ? 'ไม่พบนักเรียนที่ค้นหา' : 'ยังไม่มีนักเรียนในห้องนี้ (เลือกวิธีเพิ่มด้านบน)'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((s, idx) => {
        const realIndex = students.indexOf(s);
        const avatarUrl = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;

        return `
        <tr class="student-row">
            <td class="font-mono text-muted text-center" style="width: 45px;">${realIndex + 1}</td>
            <td style="width: 60px;">
                <img src="${avatarUrl}" 
                     class="student-avatar-img" 
                     onclick="openPhotoZoom('${avatarUrl}', 'รูปนักเรียน: ${s.name}')" 
                     alt="${s.name}" title="คลิกเพื่อดูรูปขยาย">
            </td>
            <td class="fw-bold text-dark">${s.name}</td>
            <td class="text-center font-mono text-success fw-bold" style="width: 85px;">${s.score ?? 0} pt</td>
            <td class="text-center font-mono text-secondary" style="width: 90px;">${s.spunCount ?? 0} ครั้ง</td>
            <td class="text-end" style="width: 70px;">
                <button class="btn btn-outline-danger btn-sm p-1 px-2 rounded-2" onclick="removeStudent(${realIndex})" title="ลบชื่อนี้">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

// 📋 1. เพิ่มนักเรียนแบบ Bulk Paste (คัดลอก-วางทีละหลายคนจาก Excel / Google Sheets)
async function handleBulkAddStudents() {
    const textarea = document.getElementById('bulk-student-textarea');
    const rawText = textarea?.value?.trim();

    if (!rawText || !activeClassroom) {
        return showToast('warning', 'กรุณากรอกรายชื่อ', 'พิมพ์หรือวางรายชื่อนักเรียนอย่างน้อย 1 คน');
    }

    const lines = rawText.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
    if (lines.length === 0) return;

    const newStudents = lines.map(name => ({
        name: name,
        image: `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(name)}`,
        score: 0,
        spunCount: 0
    }));

    activeClassroom.students = [...activeClassroom.students, ...newStudents];
    await updateClassroomStudentsInDB();

    textarea.value = '';
    renderStudentTable();
    showToast('success', 'เพิ่มนักเรียนสำเร็จ!', `นำเข้ารายชื่อทั้งหมด ${newStudents.length} คนเรียบร้อยแล้ว`);
}

// 🔢 2. สร้างเลขที่นักเรียนอัตโนมัติ (เช่น เลขที่ 1 ถึง เลขที่ 35)
async function handleGenerateNumberStudents() {
    const startNum = parseInt(document.getElementById('gen-num-start')?.value) || 1;
    const totalNum = parseInt(document.getElementById('gen-num-total')?.value) || 30;
    const prefix = document.getElementById('gen-num-prefix')?.value || 'เลขที่ ';

    if (!activeClassroom) return;

    let newStudents = [];
    for (let i = 0; i < totalNum; i++) {
        const studentName = `${prefix}${startNum + i}`;
        newStudents.push({
            name: studentName,
            image: `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(studentName)}`,
            score: 0,
            spunCount: 0
        });
    }

    activeClassroom.students = [...activeClassroom.students, ...newStudents];
    await updateClassroomStudentsInDB();

    renderStudentTable();
    showToast('success', 'สร้างเลขที่สำเร็จ!', `สร้างนักเรียน ${prefix}${startNum} ถึง ${prefix}${startNum + totalNum - 1} (${totalNum} คน) เรียบร้อย`);
}

// 👤 3. เพิ่มนักเรียนเดี่ยวพร้อมรูปถ่าย
async function handleAddSingleStudent() {
    const inputName = document.getElementById('single-student-name')?.value?.trim();
    const fileInput = document.getElementById('single-student-image');

    if (!inputName || !activeClassroom) {
        return showToast('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกชื่อนักเรียนก่อนบันทึก');
    }

    const btn = document.getElementById('btn-add-single-student');
    if (btn) btn.disabled = true;

    try {
        let imageUrl = `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(inputName)}`;

        if (fileInput?.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `student_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

            const { error: uploadErr } = await supabaseClient.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (!uploadErr) {
                const { data: publicUrlData } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
                imageUrl = publicUrlData.publicUrl;
            }
        }

        const newStudent = {
            name: inputName,
            image: imageUrl,
            score: 0,
            spunCount: 0
        };

        activeClassroom.students.push(newStudent);
        await updateClassroomStudentsInDB();

        document.getElementById('single-student-name').value = '';
        if (fileInput) fileInput.value = '';
        renderStudentTable();
        showToast('success', 'เพิ่มนักเรียนสำเร็จ', `เพิ่ม ${inputName} เข้าระบบเรียบร้อย`);

    } catch (err) {
        console.error("Add student error:", err);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function removeStudent(index) {
    if (!activeClassroom) return;
    activeClassroom.students.splice(index, 1);
    await updateClassroomStudentsInDB();
    renderStudentTable();
    showToast('info', 'ลบรายชื่อแล้ว', 'นำรายชื่อนักเรียนออกจากห้องเรียนเรียบร้อย');
}

async function clearAllStudents() {
    if (!activeClassroom || activeClassroom.students.length === 0) return;
    if (!confirm('⚠️ แน่ใจใช่ไหมที่จะลบรายชื่อนักเรียนทั้งหมดในห้องนี้?')) return;

    activeClassroom.students = [];
    await updateClassroomStudentsInDB();
    renderStudentTable();
    showToast('info', 'ล้างรายชื่อเรียบร้อย', 'ลบรายชื่อนักเรียนทั้งหมดในห้องเรียนแล้ว');
}

async function resetAllStudentScores() {
    if (!activeClassroom || activeClassroom.students.length === 0) return;
    if (!confirm('ต้องการรีเซ็ตคะแนนและจำนวนครั้งที่โดนสุ่มของทุกคนในห้องนี้เป็น 0 ใช่หรือไม่?')) return;

    activeClassroom.students.forEach(s => {
        s.score = 0;
        s.spunCount = 0;
    });

    await updateClassroomStudentsInDB();
    renderStudentTable();
    showToast('success', 'รีเซ็ตคะแนนเรียบร้อย', 'คะแนนนักเรียนทุกคนถูกตั้งค่าเป็น 0 แล้ว');
}

async function updateClassroomStudentsInDB() {
    const { error } = await supabaseClient
        .from('classrooms')
        .update({ students: activeClassroom.students })
        .eq('id', activeClassroom.id);

    if (error) {
        showToast('error', 'บันทึกรายชื่อล้มเหลว', error.message);
    } else {
        await loadClassroomList();
    }
}

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

        const { error } = await supabaseClient.from('classrooms').insert([payload]);
        if (!error) {
            showToast('success', 'สร้างห้องเรียนสำเร็จ!', `ห้องเรียน "${className}" พร้อมใช้งานแล้ว`);
            document.getElementById('form-create-class').reset();
            bootstrap.Modal.getInstance(document.getElementById('addClassModal'))?.hide();
            await loadClassroomList();
        } else {
            showToast('error', 'สร้างห้องเรียนไม่สำเร็จ', error.message);
        }
    } finally {
        btnSave.disabled = false;
    }
}

// 📱 เปิด Modal QR Code ได้โดยตรงจากหน้ารวมห้องเรียน
function quickOpenQRModal(classId) {
    const target = cachedClassrooms.find(c => c.id === classId);
    if (!target) return;

    activeClassroom = target;
    openRoomQRModal();
}

function openRoomQRModal() {
    if (!activeClassroom) return;

    const roomCode = activeClassroom.room_code || 'N/A';
    const className = activeClassroom.class_name || 'ไม่มีชื่อห้อง';

    document.getElementById('qr-modal-room-name').innerText = `ห้องเรียน: ${className}`;
    document.getElementById('qr-modal-room-code').innerText = roomCode;

    const joinUrl = `${window.location.origin}${window.location.pathname.replace('classroom_manage/classroom_manage.html', 'student_join/student_join.html')}?code=${roomCode}`;
    
    document.getElementById('qr-modal-link-input').value = joinUrl;

    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(joinUrl)}`;
    document.getElementById('qr-code-img').src = qrApiUrl;

    const qrModal = new bootstrap.Modal(document.getElementById('roomQRModal'));
    qrModal.show();
}

function copyJoinLink() {
    const input = document.getElementById('qr-modal-link-input');
    input.select();
    navigator.clipboard.writeText(input.value);

    const msg = document.getElementById('copy-success-msg');
    msg.classList.remove('d-none');
    setTimeout(() => msg.classList.add('d-none'), 2000);
}