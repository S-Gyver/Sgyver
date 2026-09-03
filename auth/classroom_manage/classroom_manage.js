let currentUserId = null;
let activeClassroom = null;

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

    if (classrooms && classrooms.length > 0) {
        container.innerHTML = classrooms.map(c => {
            const studentCount = Array.isArray(c.students) ? c.students.length : 0;
            return `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 border rounded-4 shadow-sm p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">CODE: ${c.room_code || 'N/A'}</span>
                        <small class="text-muted font-mono" style="font-size: 0.7rem;">${c.created_at ? new Date(c.created_at).toLocaleDateString('th-TH') : ''}</small>
                    </div>
                    <h6 class="fw-bold text-dark mb-1 text-truncate">${c.class_name || 'ไม่มีชื่อห้อง'}</h6>
                    <p class="text-muted small mb-3"><i class="bi bi-people me-1"></i>นักเรียน: <strong>${studentCount}</strong> คน</p>
                    <div class="d-flex gap-2 mt-auto">
                        <button class="btn btn-primary btn-sm rounded-3 fw-bold w-100" onclick="openManageStudentsModal('${c.id}')">
                            <i class="bi bi-person-plus-fill me-1"></i>จัดการนักเรียน
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } else {
        container.innerHTML = `
            <div class="col-12 text-center py-5 bg-light rounded-4 border border-dashed">
                <i class="bi bi-journal-plus display-4 text-primary mb-2"></i>
                <h6 class="fw-bold text-dark">ยังไม่มีห้องเรียนในระบบ</h6>
                <button class="btn btn-primary btn-sm rounded-3 fw-bold mt-2" data-bs-toggle="modal" data-bs-target="#addClassModal">
                    <i class="bi bi-plus-circle-fill me-1"></i>สร้างห้องเรียนแรก
                </button>
            </div>`;
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

    document.getElementById('student-modal-title').innerHTML = `<i class="bi bi-people-fill me-2"></i>จัดการนักเรียน - ${activeClassroom.class_name}`;
    renderStudentTable();

    const modal = new bootstrap.Modal(document.getElementById('manageStudentsModal'));
    modal.show();
}

// 🎨 แสดงตารางรายชื่อนักเรียน พร้อมฟังก์ชันคลิกดู PhotoZoom
function renderStudentTable() {
    const tbody = document.getElementById('student-table-body');
    const countEl = document.getElementById('student-count');
    const students = activeClassroom.students || [];

    countEl.innerText = students.length;

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">ยังไม่มีนักเรียนในห้องนี้</td></tr>`;
        return;
    }

    tbody.innerHTML = students.map((s, index) => `
        <tr>
            <td class="font-mono text-muted">${index + 1}</td>
            <td>
                <img src="${s.image}" 
                     class="rounded-circle border" 
                     style="width: 35px; height: 35px; object-fit: cover; cursor: pointer;" 
                     onclick="openPhotoZoom('${s.image}', 'รูปนักเรียน: ${s.name}')" 
                     alt="${s.name}">
            </td>
            <td class="fw-bold text-dark">${s.name}</td>
            <td class="text-center font-mono text-primary fw-bold">${s.score ?? 0}</td>
            <td class="text-center font-mono text-secondary">${s.spunCount ?? 0}</td>
            <td class="text-end">
                <button class="btn btn-outline-danger btn-sm p-1 px-2" onclick="removeStudent(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleAddStudents() {
    const inputNames = document.getElementById('input-student-names').value.trim();
    const fileInput = document.getElementById('input-student-image');

    if (!inputNames || !activeClassroom) {
        return showToast('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกชื่อนักเรียนก่อนบันทึก');
    }

    const btnAdd = document.getElementById('btn-add-student');
    btnAdd.disabled = true;

    try {
        const names = inputNames.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
        let imageUrl = `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(names[0])}`;

        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `python_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

            const { error: uploadErr } = await supabaseClient.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (!uploadErr) {
                const { data: publicUrlData } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
                imageUrl = publicUrlData.publicUrl;
            }
        }

        const newStudents = names.map(name => ({
            name: name,
            image: imageUrl,
            score: 0,
            spunCount: 0
        }));

        activeClassroom.students = [...activeClassroom.students, ...newStudents];

        await updateClassroomStudentsInDB();
        document.getElementById('input-student-names').value = '';
        fileInput.value = '';
        renderStudentTable();
        showToast('success', 'เพิ่มนักเรียนสำเร็จ', `เพิ่มนักเรียนจำนวน ${newStudents.length} คนเรียบร้อย`);

    } catch (err) {
        console.error("Add student error:", err);
    } finally {
        btnAdd.disabled = false;
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
    if (!activeClassroom) return;
    activeClassroom.students = [];
    await updateClassroomStudentsInDB();
    renderStudentTable();
    showToast('info', 'ล้างรายชื่อเรียบร้อย', 'ลบรายชื่อนักเรียนทั้งหมดในห้องเรียนแล้ว');
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