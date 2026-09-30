let adminSession = null;
let allUsersList = [];
let allClassRooms = [];
let allProblems = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 🔒 ตรวจสอบสิทธิ์การเข้าใช้งาน Admin
    let savedSession = sessionStorage.getItem('gyver_admin_session') || localStorage.getItem('gyver_admin_session');
    
    if (savedSession) {
        try {
            adminSession = JSON.parse(savedSession);
            if (adminSession && adminSession.isLoggedIn && adminSession.role === 'admin' && adminSession.email !== 's.gyver36@gmail.com') {
                const nameEl = document.getElementById('admin-display-name');
                if (nameEl) nameEl.innerText = adminSession.name || adminSession.username || 'Admin';
            } else {
                adminSession = null;
                sessionStorage.removeItem('gyver_admin_session');
                localStorage.removeItem('gyver_admin_session');
            }
        } catch (e) {
            adminSession = null;
        }
    }

    // ตรวจสอบความถูกต้องกับ Supabase Auth และ Profiles เสมอเพื่อความปลอดภัย
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                const user = session.user;
                let isUserAdmin = false;
                let prof = null;

                try {
                    const { data: dbProf } = await supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .maybeSingle();
                    if (dbProf) {
                        prof = dbProf;
                        if (dbProf.role === 'admin' || (dbProf.username && dbProf.username.toLowerCase() === 'admin')) {
                            isUserAdmin = true;
                        } else {
                            // สิทธิ์ในฐานข้อมูลเป็น user ธรรมดา ห้ามเข้าหน้าแอดมินเด็ดขาด
                            isUserAdmin = false;
                        }
                    }
                } catch (e) { }

                // กรณีไม่มี profile ในฐานข้อมูล
                if (!prof) {
                    if (
                        (user.user_metadata?.username && user.user_metadata.username.toLowerCase() === 'admin') ||
                        (user.email && user.email.toLowerCase().startsWith('admin@'))
                    ) {
                        isUserAdmin = true;
                    }
                }

                if (isUserAdmin) {
                    adminSession = {
                        isLoggedIn: true,
                        id: user.id,
                        username: prof?.username || user.user_metadata?.username || 'admin',
                        name: prof?.nickname || prof?.username || user.user_metadata?.nickname || 'Admin',
                        email: user.email,
                        role: 'admin',
                        level: prof?.level || 2
                    };
                    sessionStorage.setItem('gyver_admin_session', JSON.stringify(adminSession));
                    localStorage.setItem('gyver_admin_session', JSON.stringify(adminSession));

                    const nameEl = document.getElementById('admin-display-name');
                    if (nameEl) nameEl.innerText = adminSession.name || adminSession.username || 'Admin';
                } else {
                    // หากไม่ใช่แอดมิน ให้ล้างสิทธิ์ adminSession ทันที
                    adminSession = null;
                    sessionStorage.removeItem('gyver_admin_session');
                    localStorage.removeItem('gyver_admin_session');

                    // ปรับ role ใน metadata กลับเป็น user ถ้าเคยติด admin มา
                    if (user.user_metadata?.role === 'admin') {
                        try {
                            await supabaseClient.auth.updateUser({ data: { role: 'user' } });
                        } catch (e) { }
                    }
                }
            }
        } catch (err) {
            console.warn("Supabase auth check error:", err);
        }
    }

    // ถ้าตรวจสอบแล้วไม่มีสิทธิ์ Admin ให้เด้งกลับไปหน้า My Workspace หรือ Login พร้อมแจ้งเตือน
    if (!adminSession || !adminSession.isLoggedIn) {
        sessionStorage.removeItem('gyver_admin_session');
        localStorage.removeItem('gyver_admin_session');
        alert("🔒 หน้านี้สงวนสิทธิ์สำหรับผู้ดูแลระบบ (Admin) เท่านั้น บัญชีของคุณไม่ใช่แอดมิน");
        window.location.href = '../my_workspace.html';
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

            // ตรวจสอบให้แน่ใจว่า Admin ปัจจุบันอยู่ในรายชื่อสมาชิก
            if (adminSession && !rawUsers.some(u => (u.username && u.username.toLowerCase() === (adminSession.username || '').toLowerCase()) || (u.email && u.email.toLowerCase() === (adminSession.email || '').toLowerCase()))) {
                rawUsers.unshift({
                    id: adminSession.id || 'admin_id',
                    username: adminSession.username || 'admin',
                    nickname: adminSession.name || 'Admin',
                    email: adminSession.email || 'admin@gyver.local',
                    role: 'admin',
                    level: adminSession.level || 2,
                    created_at: new Date().toISOString(),
                    avatar_url: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
                });
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

            // อัปเดต badge บนแท็บนำทาง
            setElementText('nav-badge-users', totalUsers);

            renderUserTable(allUsersList);
            renderAnalyticsCharts(allUsersList);
            await loadSystemConfigData();
        }
    } catch (err) {
        console.error("Dashboard data load error:", err);
    }
}

let currentRoleFilter = 'all';

function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function renderUserTable(users) {
    const tbody = document.getElementById('user-accounts-tbody');
    const countBadge = document.getElementById('table-user-count');
    if (!tbody) return;

    if (countBadge) {
        countBadge.innerText = `${(users || []).length} คน`;
    }

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="user-empty-state-box">
                        <i class="bi bi-person-x"></i>
                        <span>ไม่พบบัญชีผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา</span>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => {
        const avatar = u.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        const isAdmin = u.role === 'admin' || (u.username && u.username.toLowerCase() === 'admin');
        const roleBadge = isAdmin 
            ? `<span class="badge-role-admin font-mono"><i class="bi bi-shield-fill-check me-1"></i>ADMIN</span>`
            : `<span class="badge-role-user font-mono"><i class="bi bi-person-fill me-1"></i>USER</span>`;

        const level = u.level ?? 1;
        const levelBadge = level >= 2
            ? `<span class="badge-level badge-level-pro"><i class="bi bi-stars me-1"></i>Lv.${level} VIP</span>`
            : (level === 0 
                ? `<span class="badge-level text-subtle">Lv.0 Guest</span>`
                : `<span class="badge-level"><i class="bi bi-check2 me-1"></i>Lv.1 Member</span>`);

        const userNameText = u.username || u.nickname || (u.email ? u.email.split('@')[0] : 'User');
        const userEmailText = u.email || '-';

        // 📅 แปลงวันที่สมัครใช้งาน
        const createdDateStr = u.created_at 
            ? new Date(u.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
            : '-';

        return `
            <tr class="${isAdmin ? 'is-admin-row' : ''}">
                <td class="text-center">
                    <div class="user-avatar-wrap">
                        <img src="${avatar}" class="user-avatar-img" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="${userNameText}">
                    </div>
                </td>
                <td>
                    <div class="d-flex flex-column">
                        <a href="javascript:void(0)" class="user-name-link font-heading" onclick="openUserDetailModal('${u.id}')" title="คลิกเพื่อดูห้องเรียนและโจทย์ของ ${userNameText}">
                            <i class="bi bi-search text-cyan" style="font-size: 0.85rem;"></i>
                            <span class="fs-6 fw-semibold">${userNameText}</span>
                            ${isAdmin ? '<span class="badge bg-danger text-white ms-1" style="font-size:0.62rem; padding: 2px 5px;">👑 CROWN</span>' : ''}
                        </a>
                        <small class="text-subtle font-mono" style="font-size: 0.74rem;">ID: ${u.id ? (u.id.length > 12 ? u.id.slice(0, 10) + '...' : u.id) : 'system'}</small>
                    </div>
                </td>
                <td>
                    <span class="user-email-text">${userEmailText}</span>
                </td>
                <td class="text-center text-subtle small font-mono">
                    <i class="bi bi-calendar3 me-1 opacity-75"></i>${createdDateStr}
                </td>
                <td class="text-center">${levelBadge}</td>
                <td class="text-center">${roleBadge}</td>
                <td class="text-center">
                    <button class="btn btn-action-trigger" onclick="openUserActionModal('${u.id}')" title="จัดการสิทธิ์และบัญชี">
                        <i class="bi bi-sliders me-1"></i>จัดการสิทธิ์
                    </button>
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

// ==============================================================================
// 🎛️ USER ACTION MODAL (Clean dialog replacing jittery table dropdown)
// ==============================================================================
let activeModalUser = null;
let userActionModalInstance = null;

function openUserActionModal(userId) {
    const user = allUsersList.find(u => u.id === userId);
    if (!user) return;
    activeModalUser = user;

    const username = user.username || user.nickname || (user.email ? user.email.split('@')[0] : 'User');
    const email = user.email || '-';
    const avatar = user.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    const isAdmin = user.role === 'admin' || (user.username && user.username.toLowerCase() === 'admin');
    const level = user.level ?? 1;

    setElementText('uact-username', username);
    setElementText('uact-email', email);
    const avatarEl = document.getElementById('uact-avatar');
    if (avatarEl) avatarEl.src = avatar;

    const badgesWrap = document.getElementById('uact-status-badges');
    if (badgesWrap) {
        badgesWrap.innerHTML = `
            ${isAdmin ? '<span class="badge bg-danger text-white font-mono"><i class="bi bi-shield-fill-check me-1"></i>ADMIN</span>' : '<span class="badge bg-info text-dark font-mono"><i class="bi bi-person-fill me-1"></i>USER</span>'}
            <span class="badge bg-dark border border-secondary text-warning font-mono">Lv.${level}</span>
        `;
    }

    const modalEl = document.getElementById('userActionModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        userActionModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        userActionModalInstance.show();
    }
}

async function executeModalChangeLevel(newLevel) {
    if (!activeModalUser) return;
    const uid = activeModalUser.id;
    if (userActionModalInstance) userActionModalInstance.hide();
    await changeUserLevel(uid, newLevel);
}

async function executeModalChangeRole(newRole) {
    if (!activeModalUser) return;
    const uid = activeModalUser.id;
    if (userActionModalInstance) userActionModalInstance.hide();
    await changeUserRole(uid, newRole);
}

async function executeModalDeleteUser() {
    if (!activeModalUser) return;
    const uid = activeModalUser.id;
    if (userActionModalInstance) userActionModalInstance.hide();
    await deleteUserAccount(uid);
}

function viewTargetUserActivities() {
    if (!activeModalUser) return;
    const uid = activeModalUser.id;
    if (userActionModalInstance) userActionModalInstance.hide();
    openUserDetailModal(uid);
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

function applyRoleFilter(role, btn) {
    currentRoleFilter = role;
    document.querySelectorAll('.filter-pill-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    filterUserTable();
}

function clearSearch() {
    const input = document.getElementById('user-search-input');
    if (input) {
        input.value = '';
        const clearBtn = document.getElementById('user-search-clear');
        if (clearBtn) clearBtn.style.display = 'none';
    }
    filterUserTable();
}

function filterUserTable() {
    const searchInput = document.getElementById('user-search-input');
    const query = searchInput?.value.toLowerCase().trim() || '';
    const clearBtn = document.getElementById('user-search-clear');
    if (clearBtn) {
        clearBtn.style.display = query.length > 0 ? 'block' : 'none';
    }

    let filtered = allUsersList;

    // 1. กรองตาม Role Tab
    if (currentRoleFilter === 'admin') {
        filtered = filtered.filter(u => u.role === 'admin' || (u.username && u.username.toLowerCase() === 'admin'));
    } else if (currentRoleFilter === 'user') {
        filtered = filtered.filter(u => u.role !== 'admin' && (!u.username || u.username.toLowerCase() !== 'admin'));
    }

    // 2. กรองตามคำค้นหา Text Query
    if (query) {
        filtered = filtered.filter(u => 
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.nickname && u.nickname.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.id && u.id.toLowerCase().includes(query))
        );
    }

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
        // 1. เคลียร์ Session Admin และภาพส่วนตัวทั้งหมดใน Storage
        sessionStorage.removeItem('gyver_admin_session');
        localStorage.removeItem('gyver_admin_session');
        localStorage.removeItem('cs_bg');
        localStorage.removeItem('cs_custom_bg_name');
        localStorage.removeItem('cs_custom_bg_raw');
        localStorage.removeItem('cs_bg_size');
        localStorage.removeItem('cs_bg_pos');
        localStorage.removeItem('cs_bg_fit_mode');
        localStorage.removeItem('cs_screen_title');
        localStorage.removeItem('cs_open_widgets');
        localStorage.removeItem('gyver_dock_items');

        // 2. ออกจากระบบ Supabase
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.auth.signOut();
        }
    } catch (err) {
        console.error("Logout error:", err);
    } finally {
        // 3. นำทางกลับไปยังหน้าหลัก index.html
        window.location.href = '../my_workspace.html';
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

// ==============================================================================
// 📈 ADVANCED CYBER ANALYTICS & INSIGHTS (CHART.JS INTEGRATION)
// ==============================================================================
let growthChartInstance = null;
let roleChartInstance = null;

function renderAnalyticsCharts(users) {
    if (typeof Chart === 'undefined') return;

    // 1. Line Chart: Growth Velocity
    const growthCanvas = document.getElementById('chart-user-growth');
    if (growthCanvas) {
        const dateMap = new Map();
        (users || []).forEach(u => {
            const date = u.created_at ? new Date(u.created_at) : new Date();
            const key = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            dateMap.set(key, (dateMap.get(key) || 0) + 1);
        });

        const labels = Array.from(dateMap.keys()).reverse();
        if (labels.length === 0) labels.push('ปัจจุบัน');

        let cumulative = 0;
        const dataPoints = Array.from(dateMap.values()).reverse().map(count => {
            cumulative += count;
            return cumulative;
        });

        if (growthChartInstance) {
            growthChartInstance.destroy();
        }

        const ctx = growthCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

        growthChartInstance = new Chart(growthCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'สมาชิกสะสม (Total Users)',
                    data: dataPoints,
                    borderColor: '#00f2fe',
                    borderWidth: 3,
                    pointBackgroundColor: '#060911',
                    pointBorderColor: '#00f2fe',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#00f2fe',
                        bodyColor: '#fff',
                        borderColor: 'rgba(56, 189, 248, 0.3)',
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { family: 'Kanit' },
                        bodyFont: { family: 'Fira Code' }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Kanit', size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Fira Code', size: 11 },
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // 2. Doughnut Chart: Role & Level Breakdown
    const roleCanvas = document.getElementById('chart-role-distribution');
    if (roleCanvas) {
        let adminCount = 0;
        let vipCount = 0;
        let memberCount = 0;
        let guestCount = 0;

        (users || []).forEach(u => {
            if (u.role === 'admin' || (u.username && u.username.toLowerCase() === 'admin')) {
                adminCount++;
            } else {
                const lvl = u.level ?? 1;
                if (lvl >= 2) vipCount++;
                else if (lvl === 1) memberCount++;
                else guestCount++;
            }
        });

        if (roleChartInstance) {
            roleChartInstance.destroy();
        }

        roleChartInstance = new Chart(roleCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Admin', 'Lv.2 VIP', 'Lv.1 Member', 'Lv.0 Guest'],
                datasets: [{
                    data: [adminCount, vipCount, memberCount, guestCount],
                    backgroundColor: [
                        '#f43f5e',
                        '#f59e0b',
                        '#00f2fe',
                        '#a855f7'
                    ],
                    borderColor: '#0b1120',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Kanit', size: 11 },
                            boxWidth: 10,
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { family: 'Kanit' },
                        bodyFont: { family: 'Fira Code' }
                    }
                }
            }
        });
    }
}

// ==============================================================================
// 📢 & 🔒 LIVE BROADCAST & MAINTENANCE CONTROL MANAGEMENT
// ==============================================================================
let currentGlobalConfig = {
    announcement: {
        active: false,
        text: '',
        type: 'info',
        marquee: true,
        updated_at: new Date().toISOString()
    },
    maintenance: {
        active: false,
        title: '',
        message: '',
        estimated_finish: '',
        allow_admin: true,
        updated_at: new Date().toISOString()
    }
};

async function loadSystemConfigData() {
    try {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient
            .from('gyver_forms')
            .select('*')
            .eq('id', 'SYS_GLOBAL_CONFIG')
            .maybeSingle();

        if (data && data.schema) {
            currentGlobalConfig = data.schema;
        }

        // 1. Populate Announcement UI
        const ann = currentGlobalConfig.announcement || {};
        const switchAnn = document.getElementById('switch-announcement-active');
        const labelAnn = document.getElementById('label-announcement-active');
        const typeSelect = document.getElementById('announcement-type-select');
        const textInput = document.getElementById('announcement-text-input');
        const marqueeCheck = document.getElementById('announcement-marquee-check');

        if (switchAnn) switchAnn.checked = !!ann.active;
        if (labelAnn) {
            labelAnn.innerText = ann.active ? '🟢 กำลังยิงสัญญาณ (ACTIVE)' : '⚪ ปิดใช้งาน (OFF)';
            labelAnn.className = `form-check-label font-mono small ms-1 fw-bold ${ann.active ? 'text-cyan' : 'text-subtle'}`;
        }
        if (typeSelect && ann.type) typeSelect.value = ann.type;
        if (textInput && ann.text) textInput.value = ann.text;
        if (marqueeCheck) marqueeCheck.checked = ann.marquee !== false;

        updateBroadcastPreview();

        // 2. Populate Maintenance UI
        const maint = currentGlobalConfig.maintenance || {};
        const switchMaint = document.getElementById('switch-maintenance-master');
        const titleInput = document.getElementById('maintenance-title-input');
        const msgInput = document.getElementById('maintenance-msg-input');
        const timeInput = document.getElementById('maintenance-time-input');

        if (switchMaint) switchMaint.checked = !!maint.active;
        if (titleInput && maint.title) titleInput.value = maint.title;
        if (msgInput && maint.message) msgInput.value = maint.message;
        if (timeInput && maint.estimated_finish) timeInput.value = maint.estimated_finish;

        updateMaintenanceStatusBanner(!!maint.active);

        // 🧭 อัปเดตสถานะสัญลักษณ์บนแท็บเมนู
        const navDot = document.getElementById('nav-broadcast-dot');
        if (navDot) navDot.style.display = ann.active ? 'inline-block' : 'none';

        const maintBadge = document.getElementById('nav-maint-badge');
        if (maintBadge) maintBadge.style.display = maint.active ? 'inline-block' : 'none';

    } catch (err) {
        console.warn("Load system config error:", err);
    }
}

function updateMaintenanceStatusBanner(isActive) {
    const alertBox = document.getElementById('maintenance-status-alert');
    const statusText = document.getElementById('maintenance-status-text');
    const statusBadge = document.getElementById('maintenance-status-badge');
    const labelMaint = document.getElementById('label-maintenance-master');

    if (!alertBox) return;

    if (isActive) {
        alertBox.className = 'p-2 px-3 rounded-3 mb-3 d-flex align-items-center justify-content-between font-mono small bg-slate-900 border border-danger border-opacity-50 text-danger shadow-sm';
        if (statusText) statusText.innerHTML = '<i class="bi bi-shield-fill-exclamation me-2 text-danger"></i>สถานะ: โหมดปิดปรับปรุงระบบกำลังทำงาน (บล็อกผู้ใช้ทั่วไป)';
        if (statusBadge) {
            statusBadge.className = 'badge bg-danger text-white';
            statusBadge.innerText = 'MAINTENANCE ON';
        }
        if (labelMaint) {
            labelMaint.innerText = '🔴 กำลังปิดปรับปรุง (LOCKED)';
            labelMaint.className = 'form-check-label font-mono small ms-1 fw-bold text-danger';
        }
    } else {
        alertBox.className = 'p-2 px-3 rounded-3 mb-3 d-flex align-items-center justify-content-between font-mono small bg-slate-900 border border-success border-opacity-25 text-success';
        if (statusText) statusText.innerHTML = '<i class="bi bi-check-circle-fill me-2 text-success"></i>สถานะ: ระบบเปิดให้บริการตามปกติ';
        if (statusBadge) {
            statusBadge.className = 'badge bg-success bg-opacity-25 text-success';
            statusBadge.innerText = 'LIVE 24/7';
        }
        if (labelMaint) {
            labelMaint.innerText = 'เปิดให้บริการปกติ';
            labelMaint.className = 'form-check-label font-mono small ms-1 fw-bold text-white';
        }
    }
}

function updateBroadcastPreview() {
    const previewBox = document.getElementById('broadcast-live-preview-box');
    const previewStatus = document.getElementById('preview-badge-status');
    const typeSelect = document.getElementById('announcement-type-select');
    const textInput = document.getElementById('announcement-text-input');
    const marqueeCheck = document.getElementById('announcement-marquee-check');
    const switchAnn = document.getElementById('switch-announcement-active');

    if (!previewBox) return;

    const isActive = switchAnn ? switchAnn.checked : false;
    const type = typeSelect ? typeSelect.value : 'info';
    const text = textInput && textInput.value.trim() ? textInput.value.trim() : 'ตัวอย่างข้อความประกาศด่วนจะแสดงที่นี่แบบเรียลไทม์...';
    const isMarquee = marqueeCheck ? marqueeCheck.checked : true;

    if (previewStatus) {
        previewStatus.innerText = isActive ? '📡 สัญญาณกำลังออกอากาศ' : '⏸️ พักการยิงสัญญาณ';
        previewStatus.className = `badge font-mono border ${isActive ? 'bg-info bg-opacity-25 text-cyan border-cyan' : 'bg-dark text-subtle border-secondary'}`;
    }

    const typeThemes = {
        info: { border: '#00f2fe', color: '#e0f7ff', icon: 'bi-broadcast-pin', label: 'ประกาศด่วน', bg: '#091e3a' },
        warning: { border: '#f59e0b', color: '#fef3c7', icon: 'bi-exclamation-triangle-fill', label: 'แจ้งเตือนสำคัญ', bg: '#2b1d06' },
        danger: { border: '#ef4444', color: '#fee2e2', icon: 'bi-shield-fill-exclamation', label: 'ฉุกเฉิน', bg: '#300c0f' },
        success: { border: '#10b981', color: '#d1fae5', icon: 'bi-patch-check-fill', label: 'อัปเดตใหม่', bg: '#06231a' }
    };

    const theme = typeThemes[type] || typeThemes.info;

    previewBox.style.background = theme.bg;
    previewBox.style.border = `1px solid ${theme.border}`;
    previewBox.style.color = theme.color;
    previewBox.style.padding = '8px 12px';

    const textContent = isMarquee
        ? `<marquee scrollamount="5" style="margin: 0 10px; font-weight: 500;">${text}</marquee>`
        : `<div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 10px; font-weight: 500;">${text}</div>`;

    previewBox.innerHTML = `
        <div class="d-flex align-items-center w-100" style="min-width: 0;">
            <span class="badge border font-mono" style="background: rgba(255,255,255,0.1); color: ${theme.border}; border-color: ${theme.border} !important; font-size: 0.75rem; flex-shrink: 0;">
                <i class="bi ${theme.icon} me-1"></i>${theme.label}
            </span>
            ${textContent}
        </div>
    `;
}

function toggleAnnouncementSwitch(checked) {
    const labelAnn = document.getElementById('label-announcement-active');
    if (labelAnn) {
        labelAnn.innerText = checked ? '🟢 กำลังยิงสัญญาณ (ACTIVE)' : '⚪ ปิดใช้งาน (OFF)';
        labelAnn.className = `form-check-label font-mono small ms-1 fw-bold ${checked ? 'text-cyan' : 'text-subtle'}`;
    }
    updateBroadcastPreview();
}

function toggleMaintenanceSwitch(checked) {
    updateMaintenanceStatusBanner(checked);
}

async function saveAnnouncementBroadcast() {
    const switchAnn = document.getElementById('switch-announcement-active');
    const typeSelect = document.getElementById('announcement-type-select');
    const textInput = document.getElementById('announcement-text-input');
    const marqueeCheck = document.getElementById('announcement-marquee-check');

    const active = switchAnn ? switchAnn.checked : false;
    const type = typeSelect ? typeSelect.value : 'info';
    const text = textInput ? textInput.value.trim() : '';
    const marquee = marqueeCheck ? marqueeCheck.checked : true;

    if (active && !text) {
        alert("⚠️ กรุณาระบุข้อความประกาศก่อนเปิดใช้งานครับ");
        return;
    }

    currentGlobalConfig.announcement = {
        active: active,
        type: type,
        text: text,
        marquee: marquee,
        updated_at: new Date().toISOString()
    };

    await saveGlobalConfigToSupabase("📢 บันทึกและอัปเดตประกาศด่วนสำเร็จ!");
}

async function clearAnnouncementBroadcast() {
    if (!confirm("⚠️ คุณต้องการล้างข้อความประกาศทั้งหมดใช่หรือไม่?")) return;

    const switchAnn = document.getElementById('switch-announcement-active');
    const textInput = document.getElementById('announcement-text-input');

    if (switchAnn) switchAnn.checked = false;
    if (textInput) textInput.value = '';

    currentGlobalConfig.announcement = {
        active: false,
        type: 'info',
        text: '',
        marquee: true,
        updated_at: new Date().toISOString()
    };

    toggleAnnouncementSwitch(false);
    await saveGlobalConfigToSupabase("🧹 ล้างประกาศเรียบร้อยแล้ว");
}

async function saveMaintenanceControl() {
    const switchMaint = document.getElementById('switch-maintenance-master');
    const titleInput = document.getElementById('maintenance-title-input');
    const msgInput = document.getElementById('maintenance-msg-input');
    const timeInput = document.getElementById('maintenance-time-input');

    const active = switchMaint ? switchMaint.checked : false;
    const title = titleInput ? titleInput.value.trim() : '🛠️ กำลังปิดปรับปรุงระบบเพื่อเพิ่มประสิทธิภาพ';
    const message = msgInput ? msgInput.value.trim() : 'ขออภัยในความไม่สะดวก ขณะนี้ทีมงานกำลังอัปเกรดระบบเพื่อความเสถียรยิ่งขึ้น...';
    const finish = timeInput ? timeInput.value.trim() : '';

    currentGlobalConfig.maintenance = {
        active: active,
        title: title,
        message: message,
        estimated_finish: finish,
        allow_admin: true,
        updated_at: new Date().toISOString()
    };

    const confirmMsg = active 
        ? "⚠️ คำเตือน: คุณกำลังจะเปิดโหมดปิดปรับปรุงระบบ (Maintenance Mode) ผู้ใช้ทั่วไปจะไม่สามารถเข้าใช้งานหน้าหลักได้จนกว่าจะปิดโหมดนี้ ยืนยันหรือไม่?" 
        : "ต้องการบันทึกการเปิดให้บริการระบบตามปกติใช่หรือไม่?";

    if (!confirm(confirmMsg)) return;

    await saveGlobalConfigToSupabase(active ? "🔒 เปิดโหมดปิดปรับปรุงระบบเรียบร้อยแล้ว!" : "🟢 บันทึกเปิดระบบตามปกติเรียบร้อยแล้ว!");
}

async function saveGlobalConfigToSupabase(successToastText) {
    try {
        if (!supabaseClient) return;

        const payload = {
            id: 'SYS_GLOBAL_CONFIG',
            title: 'Gyver Studio System Configuration',
            description: 'Central configuration for announcements, maintenance mode, and feature flags',
            schema: currentGlobalConfig,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('gyver_forms')
            .upsert([payload]);

        if (!error) {
            showToast(successToastText || "✅ บันทึกข้อมูลสำเร็จ!");
        } else {
            showToast(`❌ เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
        }
    } catch (e) {
        console.error("Save config error:", e);
        showToast(`❌ เกิดข้อผิดพลาด: ${e.message}`);
    }
}

// 📈 Resize Chart.js when switching to Analytics Tab
document.addEventListener('DOMContentLoaded', () => {
    const analyticsTabBtn = document.getElementById('tab-analytics-nav');
    if (analyticsTabBtn) {
        analyticsTabBtn.addEventListener('shown.bs.tab', () => {
            if (typeof growthChartInstance !== 'undefined' && growthChartInstance) {
                growthChartInstance.resize();
            }
            if (typeof roleChartInstance !== 'undefined' && roleChartInstance) {
                roleChartInstance.resize();
            }
        });
    }
});