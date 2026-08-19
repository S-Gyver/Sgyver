let adminSession = null;
let allUsersList = [];
let allClassRooms = [];
let allProblems = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 🔒 ตรวจสอบสิทธิ์การเข้าใช้งาน Admin
    const savedSession = sessionStorage.getItem('gyver_admin_session');
    if (!savedSession) {
        window.location.href = '../index.html';
        return;
    }

    try {
        adminSession = JSON.parse(savedSession);
        if (!adminSession.isLoggedIn) {
            window.location.href = '../index.html';
            return;
        }

        const nameEl = document.getElementById('admin-display-name');
        if (nameEl) nameEl.innerText = adminSession.name || adminSession.username;

    } catch (e) {
        window.location.href = '../index.html';
        return;
    }

    await loadAdminDashboardData();
});

async function loadAdminDashboardData() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            
            // 1. ดึงข้อมูลผู้ใช้จากตาราง profiles
            let { data: users, error: userErr } = await supabaseClient
                .from('profiles')
                .select('*');

            if (userErr) {
                console.warn("Profiles fetch warning:", userErr.message);
            }

            let rawUsers = users || [];

            // 2. ดึงข้อมูลห้องเรียน class_rooms
            let { data: classRooms } = await supabaseClient.from('class_rooms').select('*');
            allClassRooms = classRooms || [];

            // 3. ดึงข้อมูล Lobbies กำลังเปิด
            let { data: lobbies } = await supabaseClient.from('lobbies').select('*');

            // 4. ดึงโจทย์คำถามทั้งหมด
            let { data: problems } = await supabaseClient.from('game_problems').select('*');
            allProblems = problems || [];

            // Fallback: กรณีตาราง profiles ยังไม่มีข้อมูล
            if (rawUsers.length === 0) {
                let tempMap = new Map();
                
                tempMap.set('admin', {
                    id: 'admin_id',
                    username: 'admin',
                    email: 'admin@gyver.local',
                    role: 'admin',
                    level: 2,
                    created_at: new Date().toISOString(),
                    avatar_url: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
                });

                allClassRooms.forEach(c => {
                    const userName = c.created_by || `ผู้ใช้งาน (${c.class_key})`;
                    if (!tempMap.has(userName)) {
                        tempMap.set(userName, {
                            id: userName,
                            username: userName,
                            email: `user_${c.class_key}@gyver.local`,
                            role: 'user',
                            level: 1,
                            created_at: c.created_at || new Date().toISOString(),
                            avatar_url: 'https://cdn-icons-png.flaticon.com/512/3429/3429402.png'
                        });
                    }
                });

                rawUsers = Array.from(tempMap.values());
            }

            // 🔝 การจัดเรียงลำดับ: Admin อยู่บนสุดตามด้วยวันที่สมัครจากใหม่ไปเก่า
            allUsersList = rawUsers.sort((a, b) => {
                const isAAdmin = (a.role === 'admin' || (a.username && a.username.toLowerCase() === 'admin')) ? 1 : 0;
                const isBAdmin = (b.role === 'admin' || (b.username && b.username.toLowerCase() === 'admin')) ? 1 : 0;

                if (isAAdmin !== isBAdmin) {
                    return isBAdmin - isAAdmin; // Admin ขึ้นก่อน
                }

                // ถ้าเป็น Role เดียวกัน เรียงตามวันที่สมัคร (ใหม่ไปเก่า)
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateB - dateA;
            });

            // คำนวณสถิติ
            const totalUsers = allUsersList.length;
            const adminCount = allUsersList.filter(u => u.role === 'admin' || u.username === 'admin').length;
            const userCount = totalUsers - adminCount;

            let totalPlayers = 0;
            allClassRooms.forEach(c => {
                if (Array.isArray(c.players)) totalPlayers += c.players.length;
            });

            setElementText('stat-total-users', totalUsers);
            setElementText('stat-admin-users', adminCount);
            setElementText('stat-student-users', userCount);

            setElementText('stat-class-rooms', allClassRooms.length);
            setElementText('stat-total-players', totalPlayers);
            setElementText('stat-active-lobbies', lobbies ? lobbies.length : 0);
            setElementText('stat-total-problems', allProblems.length);

            renderUserTable(allUsersList);
        }
    } catch (err) {
        console.error("Dashboard data load error:", err);
    }
}

function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function renderUserTable(users) {
    const tbody = document.getElementById('user-accounts-tbody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-subtle">ไม่พบข้อมูลสมาชิกในระบบ</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => {
        const avatar = u.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        
        const isAdmin = u.role === 'admin' || (u.username && u.username.toLowerCase() === 'admin');
        const roleBadge = isAdmin 
            ? `<span class="badge bg-danger font-mono"><i class="bi bi-shield-fill me-1"></i>ADMIN</span>`
            : `<span class="badge bg-info text-dark font-mono">USER</span>`;

        const levelBadge = `<span class="badge bg-secondary border border-light font-mono">Lv.${u.level ?? 1}</span>`;
        const userNameText = u.username || u.email || 'User';

        // 📅 แปลงวันที่สมัครใช้งาน
        const createdDateStr = u.created_at 
            ? new Date(u.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
            : '-';

        return `
            <tr>
                <td>
                    <img src="${avatar}" class="rounded-circle border" style="width:36px; height:36px; object-fit:cover;">
                </td>
                <td>
                    <a href="javascript:void(0)" class="text-warning fw-bold text-decoration-none" onclick="openUserDetailModal('${u.id}')">
                        <i class="bi bi-search me-1"></i>${userNameText}
                    </a>
                </td>
                <td class="text-subtle">${u.email || '-'}</td>
                <td class="text-center text-subtle small">${createdDateStr}</td>
                <td class="text-center">${levelBadge}</td>
                <td class="text-center">${roleBadge}</td>
                <td class="text-center">
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-warning font-mono dropdown-toggle" data-bs-toggle="dropdown" data-bs-display="static">
                            จัดการ User
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow-lg">
                            <li><h6 class="dropdown-header text-warning">-- ปรับ Level สิทธิ์ --</h6></li>
                            <li><a class="dropdown-item small" href="javascript:void(0)" onclick="changeUserLevel('${u.id}', 0)">🔹 ตั้งเป็น Lv.0 (Visitor)</a></li>
                            <li><a class="dropdown-item small" href="javascript:void(0)" onclick="changeUserLevel('${u.id}', 1)">🔹 ตั้งเป็น Lv.1 (Member)</a></li>
                            <li><a class="dropdown-item small" href="javascript:void(0)" onclick="changeUserLevel('${u.id}', 2)">🔹 ตั้งเป็น Lv.2 (VIP/Pro)</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><h6 class="dropdown-header text-warning">-- ปรับบทบาท (Role) --</h6></li>
                            <li><a class="dropdown-item small text-danger fw-bold" href="javascript:void(0)" onclick="changeUserRole('${u.id}', 'admin')">👑 ตั้งเป็น ADMIN</a></li>
                            <li><a class="dropdown-item small text-info fw-bold" href="javascript:void(0)" onclick="changeUserRole('${u.id}', 'user')">👤 ตั้งเป็น USER</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item small text-danger" href="javascript:void(0)" onclick="deleteUserAccount('${u.id}')">🗑️ ลบบัญชีนี้</a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function changeUserLevel(userId, newLevel) {
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ level: newLevel })
            .eq('id', userId);

        if (!error) {
            showToast(`✅ ปรับระดับสิทธิ์เป็น Lv.${newLevel} สำเร็จ!`);
            loadAdminDashboardData();
        } else {
            showToast(`❌ เกิดข้อผิดพลาด: ${error.message}`);
        }
    } catch (e) {
        console.error("Change level error:", e);
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (!error) {
            showToast(`✅ ปรับบทบาทเป็น ${newRole.toUpperCase()} สำเร็จ!`);
            loadAdminDashboardData();
        } else {
            showToast(`❌ เกิดข้อผิดพลาด: ${error.message}`);
        }
    } catch (e) {
        console.error("Change role error:", e);
    }
}

async function deleteUserAccount(userId) {
    const user = allUsersList.find(u => u.id === userId);
    const username = user ? (user.username || user.email) : 'ผู้ใช้นี้';

    if (!confirm(`⚠️ คุณต้องการลบบัญชีผู้ใช้ "${username}" ใช่หรือไม่?`)) return;

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (!error) {
            showToast(`🧹 ลบบัญชี ${username} เรียบร้อยแล้ว`);
            loadAdminDashboardData();
        } else {
            showToast(`❌ เกิดข้อผิดพลาดในการลบ: ${error.message}`);
        }
    } catch (e) {
        console.error("Delete user error:", e);
    }
}

// 🔍 เปิด Modal ดูสถิติห้อง/นักเรียน/โจทย์เฉพาะของ User รายนั้น
function openUserDetailModal(userId) {
    const user = allUsersList.find(u => u.id === userId);
    if (!user) return;

    const username = user.username || user.email || 'User';
    const email = user.email || 'ไม่มีข้อมูลอีเมล';
    const role = (user.role || 'user').toUpperCase();
    const level = user.level ?? 1;
    const avatar = user.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    setElementText('modal-user-name', username);
    setElementText('modal-user-email', email);
    setElementText('modal-user-role', role);
    setElementText('modal-user-level', `Lv.${level}`);
    
    const avatarEl = document.getElementById('modal-user-avatar');
    if (avatarEl) avatarEl.src = avatar;

    const classesContainer = document.getElementById('modal-user-classes-list');
    const problemsContainer = document.getElementById('modal-user-problems-list');

    // 🟢 1. กรองเฉพาะห้องเรียนที่ User คนนี้สร้างขึ้นจริงเท่านั้น
    const userClasses = allClassRooms.filter(c => 
        c.user_id === user.id || 
        c.created_by === user.id || 
        c.created_by === user.username ||
        c.teacher_id === user.id
    );

    if (classesContainer) {
        if (userClasses.length === 0) {
            classesContainer.innerHTML = `
                <div class="user-empty-state-box font-mono">
                    <i class="bi bi-folder-x"></i>
                    <span>ผู้ใช้งานนี้ยังไม่มีการสร้างห้องเรียนในระบบ</span>
                </div>`;
        } else {
            classesContainer.innerHTML = userClasses.map(c => {
                const players = Array.isArray(c.players) ? c.players : [];
                const studentTags = players.length > 0 
                    ? players.map(p => `
                        <span class="badge bg-slate-900 border border-secondary text-subtle font-mono me-1 mb-1">
                            ${p.nickname_th || p.name || 'นักเรียน'} (เลขที่ ${p.number || '-'})
                        </span>
                    `).join('')
                    : '<small class="text-muted">ไม่มีนักเรียนในห้องนี้</small>';

                return `
                    <div class="p-3 bg-dark text-white border border-secondary rounded mb-2">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="fw-bold text-warning"><i class="bi bi-door-open me-1"></i>ชั้นเรียน: ${c.class_key}</span>
                            <span class="badge bg-info text-dark">${players.length} คน</span>
                        </div>
                        <div class="d-flex flex-wrap gap-1 mt-2">
                            ${studentTags}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 🟢 2. กรองเฉพาะโจทย์คำถามที่ User คนนี้สร้างขึ้นจริงเท่านั้น
    const userProblems = allProblems.filter(p => 
        p.user_id === user.id || 
        p.created_by === user.id || 
        p.created_by === user.username
    );

    if (problemsContainer) {
        if (userProblems.length === 0) {
            problemsContainer.innerHTML = `
                <div class="user-empty-state-box font-mono">
                    <i class="bi bi-journal-x"></i>
                    <span>ผู้ใช้งานนี้ยังไม่มีคลังโจทย์คำถามในระบบ</span>
                </div>`;
        } else {
            problemsContainer.innerHTML = userProblems.map((p, idx) => `
                <div class="p-3 bg-dark text-white border border-secondary rounded mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold text-success">โจทย์ข้อที่ ${idx + 1}: ${p.title || 'คำถาม Python'}</span>
                        <span class="badge bg-secondary font-mono">${p.level || 'Normal'}</span>
                    </div>
                    <small class="text-subtle d-block font-mono text-truncate">${p.code || p.question || '-'}</small>
                </div>
            `).join('');
        }
    }

    const modalEl = document.getElementById('userDetailModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        new bootstrap.Modal(modalEl).show();
    }
}

function filterUserTable() {
    const query = document.getElementById('user-search-input')?.value.toLowerCase().trim();
    if (!query) {
        renderUserTable(allUsersList);
        return;
    }

    const filtered = allUsersList.filter(u => 
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query))
    );
    renderUserTable(filtered);
}

async function promptClearAllLobbies() {
    if (!confirm("⚠️ คุณต้องการล้างห้องแข่งขันที่กำลังเปิดอยู่ทั้งหมดในระบบใช่หรือไม่?")) return;

    try {
        await supabaseClient.from('lobbies').delete().neq('room_code', '');
        showToast("🧹 ล้างห้องแข่งขันค้างทั้งหมดเรียบร้อยแล้ว!");
        loadAdminDashboardData();
    } catch (e) {
        console.error("Clear lobbies error:", e);
    }
}

// 🟢 ฟังก์ชันออกจากระบบแบบแก้ไขแล้ว (เคลียร์ Session และสั่งเด้งออกไปหน้า index.html)
async function handleAdminLogout() {
    try {
        // 1. เคลียร์ Session Admin ทั้งหมดใน Storage
        sessionStorage.removeItem('gyver_admin_session');
        localStorage.removeItem('gyver_admin_session');

        // 2. ออกจากระบบ Supabase
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.auth.signOut();
        }
    } catch (err) {
        console.error("Logout error:", err);
    } finally {
        // 3. นำทางกลับไปยังหน้าหลัก index.html
        window.location.href = '../index.html';
    }
}

function showToast(msg) {
    const toastEl = document.getElementById('cyberToast');
    const toastMsg = document.getElementById('toast-message');
    if (toastEl && toastMsg) {
        toastMsg.innerHTML = msg;
        if (typeof bootstrap !== 'undefined') {
            new bootstrap.Toast(toastEl).show();
        }
    }
}