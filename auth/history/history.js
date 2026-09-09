document.addEventListener('DOMContentLoaded', async () => {
    await fetchActivityLogs();
});

async function fetchActivityLogs() {
    const tableBody = document.getElementById('history-list-body') || document.getElementById('history-table-body');
    if (!tableBody) return;

    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.warn("Supabase client is not ready yet.");
            return;
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) {
            window.location.href = '../login/login.html';
            return;
        }

        const userId = session.user.id;
        const userEmail = (session.user.email || '').toLowerCase();

        // 1. ดึงข้อมูลห้องเรียนทั้งหมด เพื่อตรวจหาห้องที่ผู้ใช้เข้าร่วม (ในฐานะนักเรียน) หรือเป็นผู้สร้าง (ในฐานะครู)
        const { data: classrooms, error: classError } = await supabaseClient
            .from('classrooms')
            .select('*')
            .order('created_at', { ascending: false });

        if (classError) {
            console.warn("Fetch classrooms error:", classError.message);
        }

        // 2. ดึงข้อมูล activity_logs (ถ้ามีบันทึกกิจกรรมย่อย เช่น เกม หรือ การตอบคำถาม)
        let logs = [];
        try {
            const { data: logData, error: logError } = await supabaseClient
                .from('activity_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);
            if (!logError && logData) {
                logs = logData;
            }
        } catch (e) {
            console.warn("Fetch activity_logs warn:", e);
        }

        // 3. กรองห้องเรียนที่ผู้ใช้คนนี้เข้าร่วมในฐานะนักเรียน
        const allClassrooms = classrooms || [];
        const studentJoinedRooms = [];
        const teacherManagedRooms = [];

        let totalScore = 0;
        let totalSpun = 0;

        allClassrooms.forEach(room => {
            // เช็กว่าเป็นครูผู้สร้างห้องหรือไม่
            if (room.teacher_id === userId) {
                teacherManagedRooms.push(room);
            }

            // เช็กว่าเป็นนักเรียนที่อยู่ในห้องหรือไม่
            if (Array.isArray(room.students)) {
                const foundStudent = room.students.find(s => 
                    (s.user_id && s.user_id === userId) || 
                    (s.email && s.email.toLowerCase() === userEmail)
                );

                if (foundStudent) {
                    const studentScore = Number(foundStudent.score) || 0;
                    const studentSpuns = Number(foundStudent.spunCount) || 0;
                    totalScore += studentScore;
                    totalSpun += studentSpuns;

                    studentJoinedRooms.push({
                        room: room,
                        student: foundStudent,
                        score: studentScore,
                        spunCount: studentSpuns
                    });
                }
            }
        });

        // บวกรวมคะแนนจาก activity_logs ด้วย
        logs.forEach(l => {
            if (l.score_change) totalScore += Number(l.score_change) || 0;
        });

        // อัปเดตการแสดงผลตัวเลขสถิติภาพรวมด้านบน
        const statClassCountEl = document.getElementById('stat-classrooms-count');
        const statTotalScoreEl = document.getElementById('stat-total-score');
        const statSpinCountEl = document.getElementById('stat-spin-count');

        if (statClassCountEl) statClassCountEl.innerText = studentJoinedRooms.length;
        if (statTotalScoreEl) statTotalScoreEl.innerText = totalScore;
        if (statSpinCountEl) statSpinCountEl.innerText = totalSpun;

        // 4. รวบรวมเหตุการณ์ทั้งหมดเป็นประวัติกิจกรรม
        const eventList = [];

        // เพิ่มประวัติการเข้าร่วมห้องเรียน
        studentJoinedRooms.forEach(item => {
            const dateStr = item.room.created_at || new Date().toISOString();
            const roomTitle = item.room.class_name || item.room.name || 'ห้องเรียน Gyver';
            eventList.push({
                timestamp: new Date(dateStr).getTime(),
                dateStr: dateStr,
                category: 'classroom_student',
                categoryBadge: '<span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1"><i class="bi bi-person-check-fill me-1"></i>เข้าร่วมห้องเรียน</span>',
                title: `ห้องเรียน: ${roomTitle}`,
                description: `ชื่อห้อง: <strong class="text-primary">${roomTitle}</strong> | รหัสห้อง: <span class="font-mono fw-bold text-dark">${item.room.room_code || '-'}</span> | ชื่อนักเรียน: <span class="fw-semibold text-dark">${item.student.name || item.student.nickname || '-'}</span> | ถูกสุ่มแล้ว: ${item.spunCount} ครั้ง`,
                scoreHtml: `<span class="badge bg-success-subtle text-success border border-success-subtle font-mono px-2 py-1 fs-6">+${item.score} pt</span>`
            });
        });

        // เพิ่มประวัติห้องเรียนที่คุณเป็นผู้สร้าง (ครู)
        teacherManagedRooms.forEach(room => {
            const dateStr = room.created_at || new Date().toISOString();
            const roomTitle = room.class_name || room.name || 'กิจกรรมการเรียนรู้';
            const studentCount = Array.isArray(room.students) ? room.students.length : 0;
            eventList.push({
                timestamp: new Date(dateStr).getTime(),
                dateStr: dateStr,
                category: 'classroom_teacher',
                categoryBadge: '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1"><i class="bi bi-mortarboard-fill me-1"></i>สร้างห้องเรียน</span>',
                title: `สร้างห้องเรียน: ${roomTitle}`,
                description: `ชื่อห้อง: <strong class="text-primary">${roomTitle}</strong> | รหัสห้อง: <span class="font-mono fw-bold text-dark">${room.room_code || '-'}</span> | มีนักเรียนในห้องทั้งหมด <span class="fw-bold text-primary">${studentCount}</span> คน`,
                scoreHtml: `<span class="badge bg-light text-muted border font-mono px-2 py-1">ผู้สอน</span>`
            });
        });

        // เพิ่มบันทึกจาก activity_logs
        logs.forEach(item => {
            const dateStr = item.created_at || new Date().toISOString();
            let scoreBadge = '<span class="text-muted font-mono">-</span>';
            if (item.score_change > 0) {
                scoreBadge = `<span class="badge bg-success-subtle text-success border border-success-subtle font-mono px-2 py-1 fs-6">+${item.score_change} pt</span>`;
            } else if (item.score_change < 0) {
                scoreBadge = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle font-mono px-2 py-1 fs-6">${item.score_change} pt</span>`;
            }

            eventList.push({
                timestamp: new Date(dateStr).getTime(),
                dateStr: dateStr,
                category: 'game_log',
                categoryBadge: `<span class="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-2 py-1"><i class="bi bi-controller me-1"></i>${item.activity_type || 'กิจกรรม'}</span>`,
                title: item.activity_type || 'กิจกรรมในห้องเรียน',
                description: item.description || '-',
                scoreHtml: scoreBadge
            });
        });

        // จัดเรียงจากใหม่สุดไปเก่าสุด
        eventList.sort((a, b) => b.timestamp - a.timestamp);

        // แสดงผลลงตาราง
        if (eventList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-5">
                        <div class="mb-2 fs-2 text-secondary"><i class="bi bi-inbox"></i></div>
                        <div class="fw-bold text-dark">ยังไม่มีประวัติกิจกรรมล่าสุด</div>
                        <small class="text-secondary">เมื่อคุณเข้าร่วมห้องเรียน หรือเข้าร่วมกิจกรรมวงล้อสุ่ม/เกมพิมพ์โค้ด ประวัติและคะแนนจะปรากฏที่นี่โดยอัตโนมัติ</small>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = eventList.map(item => {
            const dateObj = new Date(item.dateStr);
            const formattedDate = dateObj.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <tr>
                    <td class="align-middle">
                        <div class="small text-muted font-mono">${formattedDate}</div>
                    </td>
                    <td class="align-middle">
                        ${item.categoryBadge}
                    </td>
                    <td class="align-middle">
                        <div class="fw-bold text-dark mb-1">${item.title}</div>
                        <small class="text-secondary">${item.description}</small>
                    </td>
                    <td class="align-middle text-center">
                        ${item.scoreHtml}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Fetch activity logs error:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-1"></i> เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message || err}
                </td>
            </tr>
        `;
    }
}