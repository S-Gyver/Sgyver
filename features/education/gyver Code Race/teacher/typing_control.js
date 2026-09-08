let roomCode = '8090';
let matchType = 'solo';
let teamSize = '2';
let teamAssign = 'auto_random';

let autoSaveTimer = null;
let typingProblemStock = [];
let studentList = [];
let isGamePaused = false;
let pendingActionType = null;
let pendingKickStudentNo = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = (urlParams.get('room') || '8090').trim().toUpperCase();
    matchType = urlParams.get('type') || 'solo';
    teamSize = urlParams.get('teamSize') || '2';
    teamAssign = urlParams.get('teamAssign') || 'auto_random';

    const roomDisplay = document.getElementById('display-room-code');
    if (roomDisplay) roomDisplay.innerText = roomCode;

    // อัปเดตลิงก์เปิดจอใหญ่ให้มีรหัสห้องติดไปด้วยเสมอ
    const openProjectorBtn = document.querySelector('a[href="projector_race.html"]');
    if (openProjectorBtn) {
        openProjectorBtn.href = `projector_race.html?room=${roomCode}`;
    }

    const actionSubmitBtn = document.getElementById('btn-action-confirm-submit');
    if (actionSubmitBtn) {
        actionSubmitBtn.onclick = executeConfirmedAction;
    }

    const matchBadge = document.getElementById('match-type-badge');
    const summaryMode = document.getElementById('summary-mode-text');
    if (matchBadge) matchBadge.innerText = matchType === 'team' ? `แข่งกลุ่ม (Team)` : `แข่งเดี่ยว (Solo)`;
    if (summaryMode) summaryMode.innerText = matchType === 'team' ? `แข่งกลุ่ม (${teamSize} คน/ทีม)` : `Solo`;

    const shuffleBtn = document.getElementById('btn-auto-shuffle-teams');
    if (shuffleBtn) {
        if (matchType === 'team' && teamAssign === 'auto_random') {
            shuffleBtn.classList.remove('d-none');
        } else {
            shuffleBtn.classList.add('d-none');
        }
    }

    setupQRCode(roomCode);

    try {
        await fetchProblemsFromDB();
        await loadQuizSubjectsFromCentralBank();
        await ensureRoomExistsInDatabase(roomCode);
        await fetchAndApplySavedConfig();

        bindAutoSaveEvents();
        fetchAndListenStudents();
    } catch (err) {
        console.error("Initialization error:", err);
    }
});

async function ensureRoomExistsInDatabase(code) {
    if (!code || typeof supabaseClient === 'undefined' || !supabaseClient) return;

    try {
        const { data: existing, error: checkErr } = await supabaseClient
            .from('lobbies')
            .select('*')
            .eq('room_code', code)
            .maybeSingle();

        if (!existing) {
            const payload = getGameSettingsPayload();
            const { error: insertErr } = await supabaseClient
                .from('lobbies')
                .insert([{
                    room_code: code,
                    match_type: matchType,
                    status: 'WAITING',
                    created_at: new Date().toISOString(),
                    ...payload
                }]);

            if (insertErr) {
                console.error("❌ สร้างห้องไม่สำเร็จ:", insertErr);
            } else {
                console.log("✅ สร้างแถวห้องใหม่ใน lobbies เรียบร้อย:", code);
            }
        }
    } catch (err) {
        console.error("ensureRoomExistsInDatabase error:", err);
    }
}

async function fetchAndApplySavedConfig() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data, error } = await supabaseClient
                .from('lobbies')
                .select('*')
                .eq('room_code', roomCode)
                .maybeSingle();

            if (!error && data) {
                // คืนสถานะเกมปัจจุบัน
                const statusBadge = document.getElementById('match-status-badge');
                const btnStart = document.getElementById('btn-start-match');
                const btnPause = document.getElementById('btn-pause-match');
                const btnEnd = document.getElementById('btn-end-match');

                if (data.status === 'IN_PROGRESS') {
                    if (statusBadge) {
                        statusBadge.innerText = "STATUS: IN_PROGRESS";
                        statusBadge.className = "badge bg-success border border-success text-white font-mono px-3 py-1";
                    }
                    if (btnStart) btnStart.disabled = true;
                    if (btnPause) btnPause.disabled = false;
                    if (btnEnd) btnEnd.disabled = false;
                } else if (data.status === 'PAUSED') {
                    isGamePaused = true;
                    if (statusBadge) {
                        statusBadge.innerText = "STATUS: PAUSED";
                        statusBadge.className = "badge bg-warning text-dark font-mono px-3 py-1";
                    }
                    if (btnStart) btnStart.disabled = true;
                    if (btnPause) {
                        btnPause.disabled = false;
                        btnPause.innerHTML = '<i class="bi bi-play-circle-fill me-1"></i>แข่งต่อ';
                        btnPause.className = "btn btn-warning w-100 py-2 font-mono fw-bold";
                    }
                    if (btnEnd) btnEnd.disabled = false;
                }
                const preview = document.getElementById('problem-preview-code');
                const summaryProb = document.getElementById('summary-problem-text');
                const selectBox = document.getElementById('saved-problems-select');

                let matchedProb = null;
                if (data.target_code) {
                    const cleanTarget = data.target_code.trim();
                    matchedProb = typingProblemStock.find(p => (p.starter_code || p.code || '').trim() === cleanTarget);
                }

                if (matchedProb) {
                    if (selectBox) selectBox.value = matchedProb.id;
                    if (preview) preview.innerText = matchedProb.starter_code || matchedProb.code || "";
                    if (summaryProb) summaryProb.innerText = matchedProb.title || "เลือกแล้ว";
                } else if (typingProblemStock.length > 0) {
                    const firstProb = typingProblemStock[0];
                    if (selectBox) selectBox.value = firstProb.id;
                    if (preview) preview.innerText = firstProb.starter_code || firstProb.code || "";
                    if (summaryProb) summaryProb.innerText = firstProb.title || "เลือกแล้ว";
                }

                const timerSwitch = document.getElementById('timer-toggle-switch');
                const durationSelect = document.getElementById('game-duration-select');
                if (timerSwitch) {
                    timerSwitch.checked = !!data.timer_enabled;
                    toggleTimerSettingsUI(timerSwitch.checked);
                    if (durationSelect && data.timer_duration) {
                        durationSelect.value = String(data.timer_duration);
                    }
                }

                const quizSwitch = document.getElementById('quiz-toggle-switch');
                const quizStockSelect = document.getElementById('quiz-stock-select');
                if (quizSwitch) {
                    quizSwitch.checked = !!data.quiz_enabled;
                    toggleQuizSettingsUI(quizSwitch.checked);
                    if (quizStockSelect && data.quiz_stock_id) {
                        quizStockSelect.value = data.quiz_stock_id;
                    }
                }

                const goldSwitch = document.getElementById('gold-toggle-switch');
                const goldStepSelect = document.getElementById('gold-step-percent');
                const goldAmountInput = document.getElementById('gold-reward-amount');
                if (goldSwitch) {
                    goldSwitch.checked = !!data.gold_enabled;
                    toggleGoldSettingsUI(goldSwitch.checked);
                    if (goldStepSelect && data.gold_milestone) {
                        goldStepSelect.value = String(data.gold_milestone);
                    }
                    if (goldAmountInput && data.gold_amount) {
                        goldAmountInput.value = data.gold_amount;
                    }
                }

                const shopSwitch = document.getElementById('shop-toggle-switch');
                if (shopSwitch) {
                    shopSwitch.checked = !!data.shop_enabled;
                    toggleShopSettingsUI(shopSwitch.checked);

                    if (document.getElementById('item-shield-enable')) document.getElementById('item-shield-enable').checked = !!data.item_shield;
                    if (document.getElementById('item-distract-enable')) document.getElementById('item-distract-enable').checked = !!data.item_blind;
                    if (document.getElementById('item-freeze-enable')) document.getElementById('item-freeze-enable').checked = !!data.item_freeze;
                    if (document.getElementById('item-boost-enable')) document.getElementById('item-boost-enable').checked = !!data.item_boost;
                }

                updateHeaderMatchSummaryDirect(data);
                return true;
            }
        }
    } catch (e) {
        console.warn("Fetch saved config error:", e);
    }
    return false;
}

function updateHeaderMatchSummaryDirect(data) {
    if (!data) return;

    const summaryTimer = document.getElementById('summary-timer-text');
    if (summaryTimer) {
        summaryTimer.innerText = !data.timer_enabled 
            ? "ไม่จำกัดเวลา" 
            : `${Math.floor((data.timer_duration || 180) / 60)} นาที (${data.timer_duration || 180}s)`;
        summaryTimer.className = data.timer_enabled ? "text-info fw-bold" : "text-subtle";
    }

    const summaryGold = document.getElementById('summary-gold-text');
    if (summaryGold) {
        summaryGold.innerText = data.gold_enabled 
            ? `แจก ${data.gold_amount || 3}G / ${data.gold_milestone || '10%'}` 
            : "ปิดใช้งาน";
        summaryGold.className = data.gold_enabled ? "text-warning fw-bold" : "text-subtle";
    }

    const summaryQuiz = document.getElementById('summary-quiz-text');
    if (summaryQuiz) {
        summaryQuiz.innerText = data.quiz_enabled ? "เปิดใช้งาน" : "ปิดใช้งาน";
        summaryQuiz.className = data.quiz_enabled ? "text-danger fw-bold" : "text-subtle";
    }

    const summaryShop = document.getElementById('summary-shop-text');
    if (summaryShop) {
        if (!data.shop_enabled) {
            summaryShop.innerText = "ปิดใช้งาน";
            summaryShop.className = "text-subtle";
        } else {
            let activeItems = [];
            if (data.item_shield) activeItems.push("🛡️โล่");
            if (data.item_blind) activeItems.push("👁️เบลอ");
            if (data.item_freeze) activeItems.push("❄️แช่แข็ง");
            if (data.item_boost) activeItems.push("⚡บูสท์");
            
            summaryShop.innerText = activeItems.length > 0 ? activeItems.join(" ") : "ไม่มีไอเทม";
            summaryShop.className = "text-cyan fw-bold";
        }
    }
}

function toggleTimerSettingsUI(isEnabled) {
    const zone = document.getElementById('timer-select-zone');
    const label = document.getElementById('timer-toggle-label');
    if (isEnabled) {
        if (zone) zone.classList.remove('d-none');
        if (label) { label.innerText = "เปิดใช้งาน"; label.className = "form-check-label text-warning small ms-1"; }
    } else {
        if (zone) zone.classList.add('d-none');
        if (label) { label.innerText = "ปิดใช้งาน"; label.className = "form-check-label text-subtle small ms-1"; }
    }
}

function toggleGoldSettingsUI(isEnabled) {
    const zone = document.getElementById('gold-select-zone');
    const label = document.getElementById('gold-toggle-label');
    if (zone) zone.classList.toggle('d-none', !isEnabled);
    if (label) {
        label.innerText = isEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน";
        label.className = isEnabled ? "form-check-label text-warning small" : "form-check-label text-subtle small";
    }
}

function toggleShopSettingsUI(isEnabled) {
    const zone = document.getElementById('shop-select-zone');
    const label = document.getElementById('shop-toggle-label');
    if (zone) zone.classList.toggle('d-none', !isEnabled);
    if (label) {
        label.innerText = isEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน";
        label.className = isEnabled ? "form-check-label text-cyan small" : "form-check-label text-subtle small";
    }
}

function toggleQuizSettingsUI(isEnabled) {
    const zone = document.getElementById('quiz-select-zone');
    const label = document.getElementById('quiz-toggle-label');
    if (zone) zone.classList.toggle('d-none', !isEnabled);
    if (label) {
        label.innerText = isEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน";
        label.className = isEnabled ? "form-check-label text-danger small ms-1" : "form-check-label text-subtle small ms-1";
    }
}

function toggleTimerSettings(isEnabled) {
    toggleTimerSettingsUI(isEnabled);
    triggerAutoSave();
}

function toggleGoldSettings(isEnabled) {
    toggleGoldSettingsUI(isEnabled);
    triggerAutoSave();
}

function toggleShopSettings(isEnabled) {
    toggleShopSettingsUI(isEnabled);
    triggerAutoSave();
}

function toggleQuizSettings(isEnabled) {
    toggleQuizSettingsUI(isEnabled);
    triggerAutoSave();
}

function updateHeaderMatchSummary() {
    const payload = getGameSettingsPayload();
    updateHeaderMatchSummaryDirect(payload);
}

async function fetchProblemsFromDB() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('game_problems')
                .select('*')
                .eq('game_mode', 'typing')
                .order('created_at', { ascending: true });
                
            if (!error && data) {
                typingProblemStock = data;
                renderProblemSelectOptions();
            }
        }
    } catch (err) {
        console.error("Fetch problems error:", err);
    }
}

function renderProblemSelectOptions() {
    const selectBox = document.getElementById('saved-problems-select');
    if (!selectBox) return;
    selectBox.innerHTML = "";
    typingProblemStock.forEach((p, idx) => {
        selectBox.innerHTML += `<option value="${p.id}">โจทย์ที่ ${idx + 1}: ${p.title}</option>`;
    });
}

function setupQRCode(code) {
    const qrBox = document.getElementById("qrcode-box");
    if (qrBox) {
        qrBox.innerHTML = "";
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const basePath = pathname.substring(0, pathname.indexOf('/teacher/'));
        const joinUrl = `${origin}${basePath}/student/student_lobby.html?room=${code}`;

        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrBox, { text: joinUrl, width: 110, height: 110 });
            }
        } catch (e) {}
    }
}

async function fetchAndListenStudents() {
    await fetchStudents();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient
            .channel(`lobbies_sync_${roomCode}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'lobbies',
                filter: `room_code=eq.${roomCode}`
            }, (payload) => {
                if (payload.new && Array.isArray(payload.new.players)) {
                    studentList = payload.new.players;
                    renderStudentsUI();
                }
            })
            .subscribe();

        const channel = supabaseClient.channel(`room_signal_${roomCode}`);
        channel.on('broadcast', { event: 'player_left' }, () => {
            fetchStudents();
        }).subscribe();
    }
}

async function fetchStudents() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data } = await supabaseClient
                .from('lobbies')
                .select('players')
                .eq('room_code', roomCode)
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
    const teamsGrid = document.getElementById('teams-container-grid');

    const pendingList = studentList.filter(s => s.status === 'pending');
    const approvedList = studentList.filter(s => s.status === 'approved');

    if (document.getElementById('pending-count')) document.getElementById('pending-count').innerText = pendingList.length;
    if (document.getElementById('approved-count')) document.getElementById('approved-count').innerText = approvedList.length;

    if (pendingGrid) {
        pendingGrid.innerHTML = pendingList.length === 0 
            ? `<div class="text-center text-subtle small py-3 font-mono">ไม่มีนักเรียนรอนุมัติ</div>`
            : pendingList.map(s => `
                <div class="p-2 bg-dark rounded-3 border border-warning d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2 overflow-hidden me-2">
                        <img src="${s.image || s.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(s.nickname_th || 'Racer')}" class="rounded-circle" style="width:30px; height:30px; object-fit:cover;">
                        <span class="fw-bold text-white small text-truncate">${s.nickname_th || s.name} <small class="text-subtle">(เลขที่ ${s.number || '-'})</small></span>
                    </div>
                    <div class="d-flex gap-1">
                        <button type="button" class="btn btn-sm btn-success py-0 px-2 font-mono" onclick="approveStudent('${s.number}')"><i class="bi bi-check-lg"></i></button>
                        <button type="button" class="btn btn-sm btn-danger py-0 px-2 font-mono" onclick="kickStudent('${s.number}')"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>
            `).join('');
    }

    if (teamsGrid) {
        if (approvedList.length === 0) {
            teamsGrid.innerHTML = `<div class="col-12 text-center text-subtle py-5 font-mono">ยังไม่มีนักเรียนในห้องแข่ง</div>`;
            return;
        }

        if (matchType === 'solo') {
            teamsGrid.innerHTML = `
                <div class="col-12">
                    <div class="p-3 bg-dark rounded-3 border border-secondary d-flex flex-wrap gap-2">
                        ${approvedList.map(s => renderStudentChip(s)).join('')}
                    </div>
                </div>
            `;
        } else {
            const teamMap = new Map();
            approvedList.forEach(s => {
                const tNum = s.team || s.team_id || '1';
                if (!teamMap.has(tNum)) teamMap.set(tNum, []);
                teamMap.get(tNum).push(s);
            });

            let cardsHtml = '';
            teamMap.forEach((members, tNum) => {
                cardsHtml += `
                    <div class="col-md-6 col-xl-4">
                        <div class="cyber-card p-3 h-100 border-info">
                            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-2">
                                <span class="fw-bold text-warning font-mono"><i class="bi bi-people-fill me-1"></i>กลุ่ม ${tNum}</span>
                                <span class="badge bg-info text-dark font-mono">${members.length} คน</span>
                            </div>
                            <div class="d-flex flex-column gap-2">
                                ${members.map(s => renderStudentChip(s)).join('')}
                            </div>
                        </div>
                    </div>
                `;
            });
            teamsGrid.innerHTML = cardsHtml;
        }
    }
}

function renderStudentChip(s) {
    return `
        <div class="p-2 bg-slate-900 rounded-3 border border-secondary d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2 overflow-hidden me-2">
                <img src="${s.image || s.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(s.nickname_th || 'Racer')}" class="rounded-circle" style="width:28px; height:28px; object-fit:cover;">
                <span class="fw-bold text-white small text-truncate">${s.nickname_th || s.name} <small class="text-subtle">(เลขที่ ${s.number || '-'})</small></span>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 font-mono" onclick="kickStudent('${s.number}')"><i class="bi bi-person-x-fill"></i></button>
        </div>
    `;
}

async function autoRandomizeTeams() {
    const approvedList = studentList.filter(s => s.status === 'approved');
    if (approvedList.length === 0) return showCyberAlert("ไม่สามารถสุ่มกลุ่มได้", "ยังไม่มีนักเรียนที่ได้รับการอนุมัติในห้องแข่งครับ", "warning");

    const perTeam = parseInt(teamSize) || 2;
    const shuffled = [...approvedList].sort(() => Math.random() - 0.5);

    shuffled.forEach((student, index) => {
        const groupNum = Math.floor(index / perTeam) + 1;
        student.team = String(groupNum);
    });

    studentList = studentList.map(s => {
        const found = shuffled.find(m => String(m.number) === String(s.number));
        return found ? found : s;
    });

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        await supabaseClient.from('lobbies').update({ players: studentList }).eq('room_code', roomCode);

        const channel = supabaseClient.channel(`room_signal_${roomCode}`);
        await channel.send({ type: 'broadcast', event: 'teams_shuffled', payload: studentList });
    }

    renderStudentsUI();
    showToast("🎲 สุ่มคละกลุ่มใหม่อัตโนมัติเรียบร้อยแล้ว!");
}

async function approveStudent(studentNo) {
    try {
        studentList = studentList.map(s => String(s.number) === String(studentNo) ? { ...s, status: 'approved' } : s);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('lobbies').update({ players: studentList }).eq('room_code', roomCode);
        }
        renderStudentsUI();
    } catch (e) {}
}

async function approveAllStudents() {
    try {
        studentList = studentList.map(s => ({ ...s, status: 'approved' }));
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('lobbies').update({ players: studentList }).eq('room_code', roomCode);
        }
        renderStudentsUI();
    } catch (e) {}
}

// 🟢 บันทึกเลขที่นักเรียนที่จะเตะลงในตัวแปร global
function kickStudent(studentNo) {
    pendingKickStudentNo = String(studentNo).trim();
    const modalEl = document.getElementById('studentKickModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// 🟢 เตะนักเรียนออกจากห้อง พร้อมส่งสัญญาณ Realtime บอกหน้านักเรียนทันที
async function executeConfirmedKickStudent() {
    const modalEl = document.getElementById('studentKickModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    if (!pendingKickStudentNo) return;

    try {
        // กรองนักเรียนออกจากอาร์เรย์
        studentList = studentList.filter(s => String(s.number).trim() !== String(pendingKickStudentNo).trim());

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            // อัปเดตรายชื่อผู้เล่นที่เหลือลง Supabase
            await supabaseClient.from('lobbies').update({ players: studentList }).eq('room_code', roomCode);

            // ยิง Broadcast บอกจอนักเรียนทันที
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'kicked_out',
                payload: { number: pendingKickStudentNo }
            });
        }

        renderStudentsUI();
        showToast("🚪 เตะนักเรียนออกจากห้องเรียบร้อย!");
    } catch (e) {
        console.error("Kick student error:", e);
    } finally {
        pendingKickStudentNo = null;
    }
}

// 🟢 จัดการเปิด Modal ยืนยันการสั่งการ (เริ่ม, พัก, จบการแข่ง)
function promptActionConfirm(action) {
    pendingActionType = action;
    const modalEl = document.getElementById('actionConfirmModal');
    if (!modalEl) return;

    const modalTitle = document.getElementById('action-modal-title');
    const modalMsg = document.getElementById('action-modal-msg');
    const modalIcon = document.getElementById('action-modal-icon');
    const submitBtn = document.getElementById('btn-action-confirm-submit');
    const modalCard = document.getElementById('action-modal-card');

    if (action === 'start') {
        const approvedList = studentList.filter(s => s.status === 'approved');
        if (approvedList.length === 0) {
            showCyberAlert("ยังไม่สามารถเริ่มได้", "ยังไม่มีนักเรียนที่ได้รับการอนุมัติในห้องแข่งเลยครับ กรุณาอนุมัตินักเรียนก่อนเริ่มแข่งขัน", "warning");
            return;
        }

        if (modalTitle) modalTitle.innerText = "ยืนยันการเริ่มการแข่งขัน";
        if (modalMsg) modalMsg.innerText = `มีนักเรียนพร้อมแข่งขัน ${approvedList.length} คน ต้องการปล่อยตัวนักแข่งเข้าสู่สนามทันทีใช่หรือไม่?`;
        if (modalIcon) modalIcon.innerHTML = '<i class="bi bi-play-circle-fill text-warning"></i>';
        if (submitBtn) {
            submitBtn.className = "btn btn-warning fw-bold text-dark w-50 py-2";
            submitBtn.innerText = "เริ่มแข่ง!";
        }
        if (modalCard) modalCard.className = "modal-content cyber-modal border-warning text-white rounded-4 p-3 text-center shadow-lg font-mono";
    } else if (action === 'pause') {
        if (!isGamePaused) {
            if (modalTitle) modalTitle.innerText = "ยืนยันการพักการแข่งขัน";
            if (modalMsg) modalMsg.innerText = "คุณต้องการหยุดพักการแข่งขันชั่วคราวใช่หรือไม่?";
            if (modalIcon) modalIcon.innerHTML = '<i class="bi bi-pause-circle-fill text-warning"></i>';
            if (submitBtn) {
                submitBtn.className = "btn btn-warning fw-bold text-dark w-50 py-2";
                submitBtn.innerText = "พักการแข่ง";
            }
            if (modalCard) modalCard.className = "modal-content cyber-modal border-warning text-white rounded-4 p-3 text-center shadow-lg font-mono";
        } else {
            if (modalTitle) modalTitle.innerText = "ยืนยันการแข่งขันต่อ";
            if (modalMsg) modalMsg.innerText = "คุณต้องการปลดการหยุดพักและให้เริ่มแข่งขันต่อใช่หรือไม่?";
            if (modalIcon) modalIcon.innerHTML = '<i class="bi bi-play-circle-fill text-success"></i>';
            if (submitBtn) {
                submitBtn.className = "btn btn-success fw-bold text-white w-50 py-2";
                submitBtn.innerText = "แข่งต่อ";
            }
            if (modalCard) modalCard.className = "modal-content cyber-modal border-success text-white rounded-4 p-3 text-center shadow-lg font-mono";
        }
    } else if (action === 'end') {
        if (modalTitle) modalTitle.innerText = "ยืนยันการจบการแข่งขัน";
        if (modalMsg) modalMsg.innerText = "คุณต้องการยุติการแข่งขันทันที และนำทุกคนไปยังหน้าสรุปผลใช่หรือไม่?";
        if (modalIcon) modalIcon.innerHTML = '<i class="bi bi-stop-circle-fill text-danger"></i>';
        if (submitBtn) {
            submitBtn.className = "btn btn-danger fw-bold text-white w-50 py-2";
            submitBtn.innerText = "จบการแข่ง";
        }
        if (modalCard) modalCard.className = "modal-content cyber-modal border-danger text-white rounded-4 p-3 text-center shadow-lg font-mono";
    }

    if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// 🟢 ดำเนินการตามคำสั่งที่ยืนยันแล้ว
async function executeConfirmedAction() {
    const modalEl = document.getElementById('actionConfirmModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    const action = pendingActionType;
    pendingActionType = null;
    if (!action) return;

    if (action === 'start') {
        await handleStartMatchExecution();
    } else if (action === 'pause') {
        await handlePauseMatchExecution();
    } else if (action === 'end') {
        await handleEndMatchExecution();
    }
}

async function handleStartMatchExecution() {
    try {
        await saveAndBroadcastMatchConfig();

        const startedAt = new Date().toISOString();
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient
                .from('lobbies')
                .update({
                    status: 'IN_PROGRESS',
                    started_at: startedAt
                })
                .eq('room_code', roomCode);

            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'start_game',
                payload: {
                    roomCode: roomCode,
                    startedAt: startedAt
                }
            });
        }

        const statusBadge = document.getElementById('match-status-badge');
        const btnStart = document.getElementById('btn-start-match');
        const btnPause = document.getElementById('btn-pause-match');
        const btnEnd = document.getElementById('btn-end-match');

        if (statusBadge) {
            statusBadge.innerText = "STATUS: IN_PROGRESS";
            statusBadge.className = "badge bg-success border border-success text-white font-mono px-3 py-1";
        }
        if (btnStart) btnStart.disabled = true;
        if (btnPause) btnPause.disabled = false;
        if (btnEnd) btnEnd.disabled = false;

        showToast("🏁 ปล่อยตัวนักแข่งเข้าสู่สนามเรียบร้อยแล้ว!");
    } catch (err) {
        console.error("Start match error:", err);
        showCyberAlert("เกิดข้อผิดพลาด", "ไม่สามารถเริ่มการแข่งขันได้ กรุณาลองใหม่อีกครั้ง", "danger");
    }
}

async function handlePauseMatchExecution() {
    try {
        isGamePaused = !isGamePaused;
        const newStatus = isGamePaused ? 'PAUSED' : 'IN_PROGRESS';

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient
                .from('lobbies')
                .update({ status: newStatus })
                .eq('room_code', roomCode);

            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'pause_game',
                payload: {
                    roomCode: roomCode,
                    isPaused: isGamePaused
                }
            });
        }

        const statusBadge = document.getElementById('match-status-badge');
        const btnPause = document.getElementById('btn-pause-match');

        if (statusBadge) {
            statusBadge.innerText = `STATUS: ${newStatus}`;
            statusBadge.className = isGamePaused 
                ? "badge bg-warning text-dark font-mono px-3 py-1" 
                : "badge bg-success border border-success text-white font-mono px-3 py-1";
        }

        if (btnPause) {
            btnPause.innerHTML = isGamePaused 
                ? '<i class="bi bi-play-circle-fill me-1"></i>แข่งต่อ' 
                : '<i class="bi bi-pause-circle-fill me-1"></i>พักการแข่งขัน';
            btnPause.className = isGamePaused 
                ? "btn btn-warning w-100 py-2 font-mono fw-bold" 
                : "btn btn-outline-warning w-100 py-2 font-mono fw-bold";
        }

        showToast(isGamePaused ? "⏸️ พักการแข่งขันชั่วคราวแล้ว" : "▶️ ให้การแข่งขันดำเนินต่อแล้ว");
    } catch (err) {
        console.error("Pause match error:", err);
    }
}

async function handleEndMatchExecution() {
    try {
        const finishedAt = new Date().toISOString();
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient
                .from('lobbies')
                .update({
                    status: 'FINISHED',
                    finished_at: finishedAt
                })
                .eq('room_code', roomCode);

            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({
                type: 'broadcast',
                event: 'end_game',
                payload: { roomCode: roomCode }
            });
        }

        showToast("🏁 จบการแข่งขันแล้ว กำลังไปหน้าสรุปผล...");
        setTimeout(() => {
            window.location.href = `race_summary.html?room=${roomCode}`;
        }, 800);
    } catch (err) {
        console.error("End match error:", err);
    }
}

function showCyberAlert(title, message, type = 'warning') {
    const modalEl = document.getElementById('cyberAlertModal');
    if (!modalEl) {
        alert(`${title}: ${message}`);
        return;
    }

    const titleEl = document.getElementById('cyber-alert-title');
    const msgEl = document.getElementById('cyber-alert-message');
    const iconEl = document.getElementById('cyber-alert-icon');

    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;
    if (iconEl) {
        iconEl.innerHTML = type === 'danger' 
            ? '<i class="bi bi-x-circle-fill text-danger"></i>' 
            : (type === 'success' 
                ? '<i class="bi bi-check-circle-fill text-success"></i>' 
                : '<i class="bi bi-exclamation-triangle-fill text-warning"></i>');
    }

    if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

async function addNewProblemToStock() {
    const titleInput = document.getElementById('new-prob-title');
    const codeInput = document.getElementById('new-prob-code');
    const title = titleInput?.value?.trim();
    const code = codeInput?.value?.trim();

    if (!title || !code) {
        alert("กรุณากรอกทั้งชื่อโจทย์และโค้ดต้นแบบ");
        return;
    }

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('game_problems')
                .insert([{
                    title: title,
                    starter_code: code,
                    game_mode: 'typing',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (!error && data && data.length > 0) {
                typingProblemStock.push(data[0]);
                renderProblemSelectOptions();
                const selectBox = document.getElementById('saved-problems-select');
                if (selectBox) selectBox.value = data[0].id;
                loadSelectedProblem(data[0].id, true);
                if (titleInput) titleInput.value = '';
                if (codeInput) codeInput.value = '';

                const modalEl = document.getElementById('addStockProblemModal');
                if (modalEl && typeof bootstrap !== 'undefined') {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
                showToast("✅ เพิ่มโจทย์ใหม่ลง Stock เรียบร้อย!");
            }
        }
    } catch (e) {
        console.error("Add problem error:", e);
    }
}

function openEditProblemModal() {
    showCyberAlert("จัดการโจทย์", "สามารถเลือกโจทย์ที่มีอยู่แล้วในรายการ หรือกดเพิ่มโจทย์ใหม่ได้ทันทีครับ", "warning");
}

function openDeleteProblemModal() {
    showCyberAlert("จัดการโจทย์", "สามารถเลือกโจทย์อื่นที่ต้องการใช้ได้จากเมนู Stock ด้านบนครับ", "warning");
}

async function clearAllApprovedStudents() {
    if (!confirm("❓ คุณต้องการเตะนักเรียนออกจากห้องทั้งหมดใช่หรือไม่?")) return;
    try {
        studentList = [];
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('lobbies').update({ players: [] }).eq('room_code', roomCode);
        }
        renderStudentsUI();
    } catch (e) {}
}

async function loadQuizSubjectsFromCentralBank() {
    const selectBox = document.getElementById('quiz-stock-select');
    if (!selectBox) return;

    const defaultOptions = `
        <option value="set_python_basics">📚 ชุดที่ 1: ความรู้ทั่วไป & Python พื้นฐาน</option>
        <option value="set_logic_math">📚 ชุดที่ 2: ตรรกศาสตร์ & คณิตศาสตร์กวนๆ</option>
    `;

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data: subjects, error } = await supabaseClient
                .from('quiz_subjects')
                .select('subject_key, questions');

            if (error || !subjects || subjects.length === 0) {
                selectBox.innerHTML = defaultOptions;
            } else {
                selectBox.innerHTML = subjects.map(s => {
                    const qCount = Array.isArray(s.questions) ? s.questions.length : 0;
                    return `<option value="${s.subject_key}">📚 ${s.subject_key} (${qCount} ข้อ)</option>`;
                }).join('') + defaultOptions;
            }
        } else {
            selectBox.innerHTML = defaultOptions;
        }
    } catch (e) {
        selectBox.innerHTML = defaultOptions;
    }
}

function loadSelectedProblem(val, shouldSave = true) {
    const preview = document.getElementById('problem-preview-code');
    const summaryProb = document.getElementById('summary-problem-text');
    const selectedProblem = typingProblemStock.find(p => String(p.id) === String(val));
    
    if (selectedProblem) {
        if (preview) preview.innerText = selectedProblem.starter_code || selectedProblem.code || "";
        if (summaryProb) summaryProb.innerText = selectedProblem.title || "เลือกแล้ว";
        if (shouldSave) triggerAutoSave();
    }
}

function bindAutoSaveEvents() {
    const selectors = ['#saved-problems-select', '#quiz-stock-select', 'input[type="checkbox"]', 'select', 'input[type="number"]'];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.addEventListener('change', triggerAutoSave));
    });
}

function triggerAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveAndBroadcastMatchConfig();
        updateHeaderMatchSummary();
    }, 200);
}

async function saveAndBroadcastMatchConfig() {
    const payload = getGameSettingsPayload();
    
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({ type: 'broadcast', event: 'config_updated', payload: payload });

            await supabaseClient
                .from('lobbies')
                .update(payload)
                .eq('room_code', roomCode);
        }
    } catch (err) {
        console.error("saveAndBroadcastMatchConfig catch error:", err);
    }
}

function getGameSettingsPayload() {
    const isTimerEnabled = document.querySelector('#timer-toggle-switch')?.checked || false;
    const timeDuration = parseInt(document.querySelector('#game-duration-select')?.value || 180);
    
    const isGoldEnabled = document.querySelector('#gold-toggle-switch')?.checked || false;
    const goldMilestone = document.querySelector('#gold-step-percent')?.value || '10%';
    const goldAmount = parseInt(document.querySelector('#gold-reward-amount')?.value || 3);
    
    const isQuizEnabled = document.querySelector('#quiz-toggle-switch')?.checked || false;
    const quizSelect = document.querySelector('#quiz-stock-select');
    const quizStockVal = quizSelect?.value || 'set_python_basics';

    const isShopEnabled = document.querySelector('#shop-toggle-switch')?.checked || false;
    const itemShield = document.querySelector('#item-shield-enable')?.checked || false;
    const itemBlind = document.querySelector('#item-distract-enable')?.checked || false;
    const itemFreeze = document.querySelector('#item-freeze-enable')?.checked || false;
    const itemBoost = document.querySelector('#item-boost-enable')?.checked || false;

    return {
        target_code: document.getElementById('problem-preview-code')?.innerText || '',
        timer_enabled: isTimerEnabled,
        timer_duration: timeDuration,
        gold_enabled: isGoldEnabled,
        gold_milestone: goldMilestone,
        gold_amount: goldAmount,
        quiz_enabled: isQuizEnabled,
        quiz_stock_id: quizStockVal,
        shop_enabled: isShopEnabled,
        item_shield: itemShield,
        item_blind: itemBlind,
        item_freeze: itemFreeze,
        item_boost: itemBoost
    };
}

async function saveAndCloseSettingsModal() {
    await saveAndBroadcastMatchConfig();
    updateHeaderMatchSummary();
    showToast("✅ บันทึกการตั้งค่าลงฐานข้อมูลเรียบร้อยแล้ว!");

    const modalEl = document.getElementById('matchSettingsModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

function showToast(msg) {
    const toastEl = document.getElementById('cyberToast');
    const toastMsg = document.getElementById('toast-message');
    if (toastEl && toastMsg) {
        toastMsg.innerHTML = msg;
        if (typeof bootstrap !== 'undefined') new bootstrap.Toast(toastEl).show();
    }
}

async function removeLobbyFromDatabase() {
    if (!roomCode) return;
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const channel = supabaseClient.channel(`room_signal_${roomCode}`);
            await channel.send({ type: 'broadcast', event: 'room_closed', payload: { roomCode: roomCode } });
            await supabaseClient.from('lobbies').delete().eq('room_code', roomCode);
        }
    } catch (e) {}
}

function openCloseRoomModal() {
    const modalEl = document.getElementById('closeRoomModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

async function confirmCloseRoom() {
    await removeLobbyFromDatabase();
    window.location.href = 'teacher_lobby.html';
}

window.addEventListener('beforeunload', () => { removeLobbyFromDatabase(); });
window.addEventListener('pagehide', () => { removeLobbyFromDatabase(); });