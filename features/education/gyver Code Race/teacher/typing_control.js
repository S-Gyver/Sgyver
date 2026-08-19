let roomCode = 'RACE88';
let classKey = '5/10';
let autoSaveTimer = null;
let typingProblemStock = [];
let studentList = [];
let isGamePaused = false;
let pendingActionType = null;
let pendingKickStudentNo = null;

// 📍 อัปเดตในไฟล์ typing_control.js

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('room') || 'RACE88';
    classKey = urlParams.get('classKey') || '5/10';

    const roomDisplay = document.getElementById('display-room-code');
    if (roomDisplay) roomDisplay.innerText = roomCode;

    setupQRCode(roomCode);
    bindAutoSaveEvents();

    await initPageData();
    fetchAndListenStudents();
});

// 🟢 ดักจับเหตุการณ์เมื่อผู้ใช้กด Back ย้อนกลับมาจากหน้าอื่น (แก้ปัญหา BFCache)
window.addEventListener('pageshow', async (event) => {
    // สั่งโหลดข้อมูลคลังโจทย์ใหม่และอัปเดต UI ของสวิตช์ทุกครั้งที่ย้อนกลับมาหน้านี้
    await initPageData();
});

// 🔄 ฟังก์ชันโหลดข้อมูลและอัปเดต UI สวิตช์ให้ตรงกับความเป็นจริง
async function initPageData() {
    await fetchProblemsFromDB();
    await loadQuizSubjectsFromCentralBank();
    
    // ตรวจสอบและอัปเดตการแสดงผลของโซนคำถามกวนใจให้ตรงกับสวิตช์
    const quizSwitch = document.getElementById('quiz-toggle-switch');
    if (quizSwitch) {
        toggleQuizSettings(quizSwitch.checked);
    }
}

// 📚 ดึงรายชื่อชุดวิชาคำถามส่วนตัวของผู้ใช้จากตาราง quiz_subjects (ฉบับแก้ไข Error column created_at)
async function loadQuizSubjectsFromCentralBank() {
    const selectBox = document.getElementById('quiz-stock-select');
    if (!selectBox) return;

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            
            // 🔑 1. ดึง user_id ของผู้ใช้ที่ล็อกอินปัจจุบัน
            const { data: { session } } = await supabaseClient.auth.getSession();
            const currentUserId = session?.user?.id;

            if (!currentUserId) {
                selectBox.innerHTML = `<option value="">กรุณาลงชื่อเข้าใช้งานระบบก่อน</option>`;
                return;
            }

            // 🟢 2. ดึงเฉพาะชุดวิชาคำถามของผู้ใช้คนนี้ (เรียงตาม subject_key แทน created_at)
            const { data: subjects, error } = await supabaseClient
                .from('quiz_subjects')
                .select('subject_key, questions')
                .eq('user_id', currentUserId)
                .order('subject_key', { ascending: true });

            if (error) {
                console.error("Fetch quiz_subjects error:", error.message);
                selectBox.innerHTML = `<option value="">เกิดข้อผิดพลาดในการดึงคลังโจทย์</option>`;
                return;
            }

            // 🟢 3. หยอดชุดวิชาลงใน Dropdown
            if (subjects && subjects.length > 0) {
                selectBox.innerHTML = subjects.map(s => {
                    const qCount = Array.isArray(s.questions) ? s.questions.length : 0;
                    return `<option value="${s.subject_key}">📚 ${s.subject_key} (${qCount} ข้อ)</option>`;
                }).join('');
            } else {
                selectBox.innerHTML = `<option value="">ยังไม่มีชุดคำถาม (คลิกจัดการคลังโจทย์กลางเพื่อเพิ่ม)</option>`;
            }

            triggerAutoSave();
        }
    } catch (err) {
        console.error("Load quiz subjects from central bank catch error:", err);
    }
}

function setupQRCode(code) {
    const qrBox = document.getElementById("qrcode-box");
    if (qrBox) {
        qrBox.innerHTML = "";
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const basePath = pathname.substring(0, pathname.indexOf('/teacher/'));
        const joinUrl = `${origin}${basePath}/student/student_lobby.html?room=${code}&classKey=${encodeURIComponent(classKey)}`;

        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrBox, { text: joinUrl, width: 140, height: 140 });
            }
        } catch (e) {
            console.error("QR Code Error:", e);
        }
    }
}

// 🚪 1. เปิด Modal ยืนยันการปิดห้องนี้
function openCloseRoomModal() {
    const modalEl = document.getElementById('closeRoomModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// 🚪 2. ยืนยันปิดห้องและพาย้ายกลับไป teacher_lobby.html
function confirmCloseRoom() {
    window.location.href = 'teacher_lobby.html';
}

// 📡 ดึงรายชื่อนักเรียนสด
async function fetchAndListenStudents() {
    await fetchStudents();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`class_rooms_sync_${classKey}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'class_rooms',
                filter: `class_key=eq.${classKey}`
            }, (payload) => {
                if (payload.new && Array.isArray(payload.new.players)) {
                    studentList = payload.new.players;
                    renderStudentsUI();
                }
            })
            .subscribe();

        setInterval(fetchStudents, 1500);
    }
}

async function fetchStudents() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data } = await supabaseClient
                .from('class_rooms')
                .select('players')
                .eq('class_key', classKey)
                .maybeSingle();

            if (data && Array.isArray(data.players)) {
                studentList = data.players;
                renderStudentsUI();
            }
        }
    } catch (e) {}
}

function renderStudentsUI() {
    const pendingGrid = document.getElementById('pending-list-grid');
    const approvedGrid = document.getElementById('approved-list-grid');

    const pendingList = studentList.filter(s => s.status === 'pending');
    const approvedList = studentList.filter(s => s.status !== 'pending');

    if (document.getElementById('pending-count')) document.getElementById('pending-count').innerText = pendingList.length;
    if (document.getElementById('approved-count')) document.getElementById('approved-count').innerText = approvedList.length;

    if (pendingGrid) {
        pendingGrid.innerHTML = pendingList.length === 0 
            ? `<div class="text-center text-muted small py-2 font-mono">ไม่มีนักเรียนรอนุมัติ</div>`
            : pendingList.map(s => `
                <div class="p-2 bg-slate-900 rounded-3 border border-warning d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2 overflow-hidden me-2">
                        <img src="${s.image || s.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(s.nickname_th || 'Racer')}" class="rounded-circle flex-shrink-0" style="width:34px; height:34px; object-fit:cover; border: 1px solid #f59e0b;">
                        <span class="fw-bold text-white small text-truncate">
                            ${s.nickname_th || s.name} <small class="text-subtle fw-normal">(เลขที่ ${s.number || '-'})</small>
                        </span>
                    </div>
                    <div class="d-flex gap-1 flex-shrink-0">
                        <button type="button" class="btn btn-sm btn-success py-1 px-2 font-mono fw-bold d-flex align-items-center gap-1" onclick="approveStudent('${s.number}')">
                            <i class="bi bi-check-lg"></i><span>อนุมัติ</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger py-1 px-2 font-mono fw-bold d-flex align-items-center gap-1" onclick="kickStudent('${s.number}')">
                            <i class="bi bi-x-lg"></i><span>ปฏิเสธ</span>
                        </button>
                    </div>
                </div>
            `).join('');
    }

    if (approvedGrid) {
        approvedGrid.innerHTML = approvedList.length === 0
            ? `<div class="text-center text-muted small py-2 font-mono">ยังไม่มีนักเรียนในห้องแข่ง</div>`
            : approvedList.map(s => `
                <div class="p-2 bg-slate-900 rounded-3 border border-secondary d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2 overflow-hidden me-2">
                        <img src="${s.image || s.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(s.nickname_th || 'Racer')}" class="rounded-circle flex-shrink-0" style="width:34px; height:34px; object-fit:cover; border: 1px solid #38bdf8;">
                        <span class="fw-bold text-white small text-truncate">
                            ${s.nickname_th || s.name} <small class="text-subtle fw-normal">(เลขที่ ${s.number || '-'})</small>
                        </span>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <span class="badge bg-success font-mono">พร้อมแข่ง</span>
                        <button type="button" class="btn btn-sm btn-outline-danger py-1 px-2 font-mono fw-bold d-flex align-items-center gap-1" onclick="kickStudent('${s.number}')">
                            <i class="bi bi-person-x-fill"></i><span>เตะ</span>
                        </button>
                    </div>
                </div>
            `).join('');
    }
}

async function approveStudent(studentNo) {
    try {
        studentList = studentList.map(s => String(s.number) === String(studentNo) ? { ...s, status: 'approved' } : s);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('class_rooms').update({ players: studentList }).eq('class_key', classKey);
        }
        renderStudentsUI();
    } catch (e) {}
}

async function approveAllStudents() {
    try {
        studentList = studentList.map(s => ({ ...s, status: 'approved' }));
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('class_rooms').update({ players: studentList }).eq('class_key', classKey);
        }
        renderStudentsUI();
    } catch (e) {}
}

function kickStudent(studentNo) {
    pendingKickStudentNo = studentNo;
    const targetStudent = studentList.find(s => String(s.number) === String(studentNo));
    const targetName = targetStudent ? (targetStudent.nickname_th || targetStudent.name) : 'นักเรียนคนนี้';

    const msgEl = document.getElementById('kick-student-modal-msg');
    if (msgEl) msgEl.innerText = `คุณต้องการปฏิเสธ/เตะ "${targetName}" ออกจากห้องใช่หรือไม่?`;

    const btnSubmit = document.getElementById('btn-confirm-student-kick');
    if (btnSubmit) btnSubmit.onclick = executeConfirmedKickStudent;

    const modalEl = document.getElementById('studentKickModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

async function executeConfirmedKickStudent() {
    const modalEl = document.getElementById('studentKickModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    if (!pendingKickStudentNo) return;

    try {
        const targetStudent = studentList.find(s => String(s.number) === String(pendingKickStudentNo));
        const targetName = targetStudent ? (targetStudent.nickname_th || targetStudent.name) : 'นักเรียน';

        studentList = studentList.filter(s => String(s.number) !== String(pendingKickStudentNo));

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('class_rooms').update({ players: studentList }).eq('class_key', classKey);
        }

        renderStudentsUI();
        showToast(`🚪 เตะ ${targetName} ออกจากห้องเรียบร้อย!`);
    } catch (e) {
        console.error("Kick Student Error:", e);
    } finally {
        pendingKickStudentNo = null;
    }
}

async function clearAllApprovedStudents() {
    if (!confirm("❓ คุณต้องการเตะนักเรียนออกจากห้องทั้งหมดใช่หรือไม่?")) return;
    try {
        studentList = [];
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('class_rooms').update({ players: [] }).eq('class_key', classKey);
        }
        renderStudentsUI();
    } catch (e) {}
}

/* ----------------------------------------------------
   📝 ระบบจัดการ STOCK โจทย์
---------------------------------------------------- */

async function addNewProblemToStock() {
    const titleEl = document.getElementById('new-prob-title');
    const codeEl = document.getElementById('new-prob-code');

    const title = titleEl ? titleEl.value.trim() : '';
    const code = codeEl ? codeEl.value.trim() : '';

    if (!title || !code) {
        alert("⚠️ กรุณากรอกทั้งชื่อหัวข้อโจทย์และโค้ดต้นแบบก่อนครับ!");
        return;
    }

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from('game_problems')
                .insert([{
                    title: title,
                    starter_code: code,
                    game_mode: 'typing',
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                alert("❌ เกิดข้อผิดพลาดในการบันทึกโจทย์: " + error.message);
                return;
            }

            const modalEl = document.getElementById('addStockProblemModal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            if (titleEl) titleEl.value = '';
            if (codeEl) codeEl.value = '';

            showToast("✅ เพิ่มโจทย์ใหม่ลง Stock เรียบร้อยแล้ว!");
            await fetchProblemsFromDB();
        }
    } catch (err) {
        console.error("Add problem error:", err);
    }
}

function openEditProblemModal() {
    const selectBox = document.getElementById('saved-problems-select');
    const currentId = selectBox ? selectBox.value : null;

    if (!currentId) {
        alert("⚠️ กรุณาเลือกโจทย์ที่ต้องการแก้ไขก่อนครับ!");
        return;
    }

    const problem = typingProblemStock.find(p => String(p.id) === String(currentId));
    if (!problem) return;

    document.getElementById('edit-prob-id').value = problem.id;
    document.getElementById('edit-prob-title').value = problem.title || '';
    document.getElementById('edit-prob-code').value = problem.starter_code || problem.code || '';

    const modalEl = document.getElementById('editProblemModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

async function saveEditedProblem() {
    const id = document.getElementById('edit-prob-id')?.value;
    const title = document.getElementById('edit-prob-title')?.value.trim();
    const code = document.getElementById('edit-prob-code')?.value.trim();

    if (!title || !code) {
        alert("⚠️ กรุณากรอกทั้งชื่อหัวข้อโจทย์และโค้ดก่อนครับ!");
        return;
    }

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from('game_problems')
                .update({
                    title: title,
                    starter_code: code
                })
                .eq('id', id);

            if (error) {
                alert("❌ บันทึกแก้ไขล้มเหลว: " + error.message);
                return;
            }

            const modalEl = document.getElementById('editProblemModal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            showToast("✅ บันทึกแก้ไขโจทย์เรียบร้อยแล้ว!");
            await fetchProblemsFromDB();
        }
    } catch (err) {
        console.error("Save edit problem error:", err);
    }
}

function openDeleteProblemModal() {
    const selectBox = document.getElementById('saved-problems-select');
    const currentId = selectBox ? selectBox.value : null;

    if (!currentId) {
        alert("⚠️ กรุณาเลือกโจทย์ที่ต้องการลบก่อนครับ!");
        return;
    }

    const problem = typingProblemStock.find(p => String(p.id) === String(currentId));
    if (!problem) return;

    const titleEl = document.getElementById('delete-target-title');
    if (titleEl) titleEl.innerText = `คุณต้องการลบโจทย์ "${problem.title}" ใช่หรือไม่?`;

    const modalEl = document.getElementById('deleteConfirmModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

async function confirmDeleteProblem() {
    const selectBox = document.getElementById('saved-problems-select');
    const currentId = selectBox ? selectBox.value : null;

    if (!currentId) return;

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from('game_problems')
                .delete()
                .eq('id', currentId);

            if (error) {
                alert("❌ ลบโจทย์ล้มเหลว: " + error.message);
                return;
            }

            const modalEl = document.getElementById('deleteConfirmModal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            showToast("🧹 ลบโจทย์ออกจาก Stock เรียบร้อยแล้ว!");
            await fetchProblemsFromDB();
        }
    } catch (err) {
        console.error("Delete problem error:", err);
    }
}

/* ---------------------------------------------------- */

function toggleTimerSettings(isEnabled) {
    const zone = document.getElementById('timer-select-zone');
    const label = document.getElementById('timer-toggle-label');
    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) { label.innerText = "จับเวลา"; label.classList.replace('text-subtle', 'text-warning'); }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) { label.innerText = "ไม่จำกัดเวลา"; label.classList.replace('text-warning', 'text-subtle'); }
    }
    triggerAutoSave();
}

function toggleGoldSettings(isEnabled) {
    const zone = document.getElementById('gold-select-zone');
    const label = document.getElementById('gold-toggle-label');
    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) { label.innerText = "เปิดใช้งาน"; label.classList.replace('text-subtle', 'text-warning'); }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) { label.innerText = "ปิดใช้งาน"; label.classList.replace('text-warning', 'text-subtle'); }
    }
    triggerAutoSave();
}

function toggleShopSettings(isEnabled) {
    const zone = document.getElementById('shop-select-zone');
    const label = document.getElementById('shop-toggle-label');
    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) { label.innerText = "เปิดใช้งาน"; label.classList.replace('text-subtle', 'text-cyan'); }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) { label.innerText = "ปิดใช้งาน"; label.classList.replace('text-cyan', 'text-subtle'); }
    }
    triggerAutoSave();
}

function toggleQuizSettings(isEnabled) {
    const zone = document.getElementById('quiz-select-zone');
    const label = document.getElementById('quiz-toggle-label');
    
    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) { 
            label.innerText = "เปิดใช้งาน"; 
            label.classList.replace('text-subtle', 'text-danger'); 
        }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) { 
            label.innerText = "ปิดใช้งาน"; 
            label.classList.replace('text-danger', 'text-subtle'); 
        }
    }
    triggerAutoSave();
}

function bindAutoSaveEvents() {
    const selectors = ['#saved-problems-select', '#quiz-stock-select', 'input[type="checkbox"]', 'select', 'input[type="number"]'];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.addEventListener('change', triggerAutoSave);
            if (el.tagName === 'INPUT' && el.type === 'number') {
                el.addEventListener('input', triggerAutoSave);
            }
        });
    });
}

function triggerAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveAndBroadcastMatchConfig();
    }, 200);
}

async function saveAndBroadcastMatchConfig() {
    const config = getGameSettingsConfig();
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({ type: 'broadcast', event: 'config_updated', payload: config });
            await supabaseClient.from('lobbies').update({ match_config: config }).eq('room_code', roomCode);
        }
    } catch (err) {}
}

function getGameSettingsConfig() {
    const isTimerEnabled = document.querySelector('#timer-toggle-switch')?.checked || false;
    const timeDuration = parseInt(document.querySelector('#game-duration-select')?.value || 180);

    const isGoldEnabled = document.querySelector('#gold-toggle-switch')?.checked ?? true;
    const goldMilestone = document.querySelector('#gold-step-percent')?.value || '10%';
    const goldAmount = parseInt(document.querySelector('#gold-reward-amount')?.value || 3);

    const isShopEnabled = document.querySelector('#shop-toggle-switch')?.checked ?? true;
    const itemShield = document.querySelector('#item-shield-enable')?.checked ?? true;
    const itemBlind = document.querySelector('#item-distract-enable')?.checked ?? true;
    const itemFreeze = document.querySelector('#item-freeze-enable')?.checked ?? true;
    const itemBoost = document.querySelector('#item-boost-enable')?.checked ?? true;

    const isQuizEnabled = document.querySelector('#quiz-toggle-switch')?.checked || false;
    const quizStockVal = document.querySelector('#quiz-stock-select')?.value || 'set_python_basics';
    const quizRewardGold = parseInt(document.querySelector('#quiz-reward-gold')?.value || 2);

    return {
        target_code: document.getElementById('problem-preview-code')?.innerText || '',
        timer: { unlimited: !isTimerEnabled, duration: timeDuration },
        gold: { enabled: isGoldEnabled, milestone: goldMilestone, amount: goldAmount },
        items: { enabled: isShopEnabled, shield: itemShield, blind: itemBlind, freeze: itemFreeze, boost: itemBoost },
        quiz: { enabled: isQuizEnabled, stock_id: quizStockVal, reward_gold: quizRewardGold }
    };
}

function promptActionConfirm(actionType) {
    pendingActionType = actionType;

    const card = document.getElementById('action-modal-card');
    const icon = document.getElementById('action-modal-icon');
    const title = document.getElementById('action-modal-title');
    const msg = document.getElementById('action-modal-msg');
    const btnSubmit = document.getElementById('btn-action-confirm-submit');

    if (actionType === 'start') {
        if (card) card.className = "modal-content bg-dark text-white border-warning rounded-4 p-3 text-center shadow-lg font-mono";
        if (icon) icon.innerHTML = `<i class="bi bi-play-circle-fill text-warning"></i>`;
        if (title) title.innerText = "ยืนยันการเริ่มแข่งขัน";
        if (msg) msg.innerText = "คุณต้องการสั่งเริ่มการแข่งขันบนหน้าจอของนักเรียนทุกคนใช่หรือไม่?";
        if (btnSubmit) {
            btnSubmit.className = "btn btn-warning fw-bold w-50 py-2";
            btnSubmit.innerText = "เริ่มเลย!";
            btnSubmit.onclick = executeConfirmedAction;
        }
    } else if (actionType === 'pause') {
        const isNextPause = !isGamePaused;
        if (card) card.className = "modal-content bg-dark text-white border-warning rounded-4 p-3 text-center shadow-lg font-mono";
        if (icon) icon.innerHTML = `<i class="bi bi-pause-circle-fill text-warning"></i>`;
        if (title) title.innerText = isNextPause ? "ยืนยันการพักการแข่งขัน" : "ยืนยันการแข่งต่อ";
        if (msg) msg.innerText = isNextPause ? "คุณต้องการพักสนามแข่งชั่วคราวใช่หรือไม่?" : "คุณต้องการเปิดสนามแข่งให้เด็กเล่นต่อใช่หรือไม่?";
        if (btnSubmit) {
            btnSubmit.className = "btn btn-warning fw-bold w-50 py-2";
            btnSubmit.innerText = isNextPause ? "พักเกม" : "แข่งต่อ";
            btnSubmit.onclick = executeConfirmedAction;
        }
    } else if (actionType === 'end') {
        if (card) card.className = "modal-content bg-dark text-white border-danger rounded-4 p-3 text-center shadow-lg font-mono";
        if (icon) icon.innerHTML = `<i class="bi bi-stop-circle-fill text-danger"></i>`;
        if (title) title.innerText = "ยืนยันการจบการแข่งขันทันที";
        if (msg) msg.innerText = "การแข่งขันจะถูกสั่งหยุดและสรุปผลทันที คุณต้องการจบเกมเลยใช่หรือไม่?";
        if (btnSubmit) {
            btnSubmit.className = "btn btn-danger fw-bold w-50 py-2";
            btnSubmit.innerText = "จบการแข่ง";
            btnSubmit.onclick = executeConfirmedAction;
        }
    }

    const modalEl = document.getElementById('actionConfirmModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function executeConfirmedAction() {
    const modalEl = document.getElementById('actionConfirmModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    if (pendingActionType === 'start') {
        startCountdownAndGame();
    } else if (pendingActionType === 'pause') {
        togglePauseGame();
    } else if (pendingActionType === 'end') {
        forceEndGame();
    }
}

async function startCountdownAndGame() {
    await saveAndBroadcastMatchConfig();
    
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('lobbies').update({ status: 'RACING' }).eq('room_code', roomCode);

            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'start_game',
                payload: { roomCode: roomCode, status: 'RACING' }
            });

            document.getElementById('match-status-badge').innerText = "STATUS: RACING LIVE";
            document.getElementById('match-status-badge').className = "badge bg-danger text-white font-mono animate-pulse";
            document.getElementById('btn-start-match').disabled = true;
            document.getElementById('btn-pause-match').disabled = false;
            document.getElementById('btn-end-match').disabled = false;

            showToast("🚀 สั่งเริ่มการแข่งขันเรียบร้อยแล้ว!");
        }
    } catch (e) {}
}

async function togglePauseGame() {
    isGamePaused = !isGamePaused;
    const pauseBtn = document.getElementById('btn-pause-match');
    const badge = document.getElementById('match-status-badge');

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'toggle_pause',
                payload: { paused: isGamePaused }
            });

            if (isGamePaused) {
                if (pauseBtn) pauseBtn.innerHTML = `<i class="bi bi-play-fill me-1"></i>เล่นต่อ (Resume)`;
                if (badge) { badge.innerText = "STATUS: PAUSED"; badge.className = "badge bg-warning text-dark font-mono"; }
                showToast("⏸️ พักการแข่งขันชั่วคราว");
            } else {
                if (pauseBtn) pauseBtn.innerHTML = `<i class="bi bi-pause-circle-fill me-1"></i>พักการแข่งขัน`;
                if (badge) { badge.innerText = "STATUS: RACING LIVE"; badge.className = "badge bg-danger text-white font-mono animate-pulse"; }
                showToast("▶️ เล่นการแข่งขันต่อแล้ว!");
            }
        }
    } catch (e) {}
}

// teacher/typing_control.js

// ⏹️ สั่งจบเกมทันทีกลางคัน (Force End Race) + ลบแถวใน DB + นำทางไปหน้าสรุปผล
async function forceEndGame() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            
            // 1. ส่ง Broadcast สัญญาณจบเกมไปให้นักเรียนและจอโปรเจกเตอร์
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'end_game',
                payload: { roomCode: roomCode, classKey: classKey }
            });

            // 2. ลบแถวรหัสห้องนี้ออกจากตาราง lobbies ทันที
            const { error } = await supabaseClient
                .from('lobbies')
                .delete()
                .eq('room_code', roomCode);

            if (error) {
                console.error("Delete lobby error:", error.message);
            } else {
                console.log(`🧹 ลบรหัสห้อง ${roomCode} ออกจากตาราง lobbies เรียบร้อยแล้ว`);
            }

            showToast("🏁 จบการแข่งขันเรียบร้อย กำลังไปหน้าสรุปผล...");

            // 🚀 3. นำทางไปยังหน้าสรุปผลการแข่งขัน
            setTimeout(() => {
                window.location.href = `race_summary.html?room=${roomCode}&classKey=${encodeURIComponent(classKey)}`;
            }, 1000);
        }
    } catch (e) {
        console.error("Force end game catch error:", e);
    }
}

// 🧹 สั่ง Auto Clean-up ลบห้องที่ลืมปิดและผ่านไปเกิน 24 ชม.
async function cleanupOldLobbies() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            // ลบห้องที่ถูกสร้างมานานเกิน 24 ชั่วโมง
            await supabaseClient
                .from('lobbies')
                .delete()
                .lt('created_at', twentyFourHoursAgo);
        }
    } catch (e) {
        console.warn("Cleanup old lobbies warning:", e);
    }
}

// เรียกใช้งาน Auto Clean-up ทันทีเมื่อเปิดหน้าควบคุม
document.addEventListener('DOMContentLoaded', () => {
    cleanupOldLobbies();
});

async function fetchProblemsFromDB() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data } = await supabaseClient.from('game_problems').select('*').eq('game_mode', 'typing').order('created_at', { ascending: true });
            typingProblemStock = data || [];
            renderProblemSelectOptions();
        }
    } catch (err) {}
}

function renderProblemSelectOptions() {
    const selectBox = document.getElementById('saved-problems-select');
    if (!selectBox) return;
    selectBox.innerHTML = "";
    typingProblemStock.forEach((p, idx) => {
        selectBox.innerHTML += `<option value="${p.id}">โจทย์ที่ ${idx + 1}: ${p.title}</option>`;
    });
    if (typingProblemStock.length > 0) loadSelectedProblem(typingProblemStock[0].id);
}

function loadSelectedProblem(val) {
    const preview = document.getElementById('problem-preview-code');
    const selectedProblem = typingProblemStock.find(p => p.id === val);
    if (selectedProblem && preview) {
        preview.innerText = selectedProblem.starter_code || selectedProblem.code || "";
        triggerAutoSave();
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