/**
 * ====================================================
 * 🎯 Gyver Quiz - Live Lobby Teacher Controller
 * ====================================================
 */

// State
let currentQuiz = null;
let roomCode = '';
let lobbyData = {
    room_code: '',
    status: 'WAITING', // 'WAITING', 'RUNNING', 'FINISHED'
    players: [] // [{ id, name, room, assignedVariant, score, total, percent, isPassed, submittedAt }]
};

let realtimeChannel = null;
let pollTimerInterval = null;
let examTimerInterval = null;
let remainingExamSeconds = 0;
let lastRenderedPlayersJSON = '';
const localBC = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('gyver_live_quiz_channel') : null;

// SweetAlert Cyber Helper
const CyberSwal = typeof Swal !== 'undefined' ? Swal.mixin({
    background: 'rgba(15, 23, 42, 0.96)',
    color: '#f8fafc',
    customClass: {
        popup: 'cyber-swal-popup border-quiz',
        confirmButton: 'btn btn-quiz-glow px-4 py-2 fw-bold',
        cancelButton: 'btn btn-outline-secondary px-4 py-2 text-white me-2'
    },
    buttonsStyling: false
}) : null;

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quizId') || urlParams.get('id');

    await loadQuizData(quizId);
    initRoomCode();
    await createOrRegisterLobby();
    setupLobbyRealtime();
    setupLobbyLifecycleListeners();
});

/**
 * โหลดข้อมูล Quiz และเตรียม 20 ชุดข้อสอบ
 */
async function loadQuizData(quizId) {
    // 1. Load from local
    const localQuizzes = getLocalQuizzes();
    if (quizId) {
        currentQuiz = localQuizzes.find(q => q.id === quizId) || null;
    }
    if (!currentQuiz && localQuizzes.length > 0) {
        currentQuiz = localQuizzes[0];
    }

    // 2. Load from Supabase if available
    if (window.supabaseClient && quizId && !currentQuiz) {
        try {
            const { data } = await window.supabaseClient
                .from('gyver_quizzes')
                .select('*')
                .eq('id', quizId)
                .maybeSingle();

            if (data) {
                currentQuiz = {
                    id: data.id,
                    title: data.title,
                    description: data.description,
                    questions: Array.isArray(data.schema) ? data.schema : (data.schema?.questions || []),
                    variants: data.schema?.variants || [],
                    settings: data.schema?.settings || { passingScore: 70, timeLimit: 15 }
                };
            }
        } catch (e) {}
    }

    // Fallback dummy quiz if empty
    if (!currentQuiz) {
        currentQuiz = {
            id: 'demo_quiz',
            title: 'แบบทดสอบทั่วไป',
            description: 'แบบทดสอบสำหรับ Live Lobby',
            settings: { passingScore: 70, timeLimit: 15, poolEnabled: true, poolCount: 20 },
            questions: [
                { id: 'q1', title: 'เมืองหลวงของไทยคือเมืองใด?', type: 'radio', points: 1, correctAnswer: 'กรุงเทพฯ', options: ['กรุงเทพฯ', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'] },
                { id: 'q2', title: '2 + 2 เท่ากับเท่าใด?', type: 'radio', points: 1, correctAnswer: '4', options: ['3', '4', '5', '6'] }
            ]
        };
    }

    // Ensure variants exist (Support Question Pool & Dynamic Set Count)
    const totalQ = (currentQuiz.questions || []).length;
    const isPool = (currentQuiz.settings?.poolEnabled === false) ? false : (totalQ > 20 || !!currentQuiz.settings?.poolEnabled);
    const poolCount = isPool 
        ? (Number(currentQuiz.settings?.poolCount) > 0 ? Math.min(Number(currentQuiz.settings.poolCount), totalQ) : Math.min(20, totalQ))
        : totalQ;

    if (!currentQuiz.variants || currentQuiz.variants.length === 0 || (currentQuiz.variants[0]?.questions?.length !== poolCount)) {
        const existingCount = (currentQuiz.variants && currentQuiz.variants.length > 0) ? currentQuiz.variants.length : 20;
        currentQuiz.variants = autoGenerate20Variants(currentQuiz.questions, poolCount, existingCount);
    }

    const varCount = currentQuiz.variants.length;
    // Update Header UI
    const qCountBadge = isPool ? `สุ่ม ${poolCount}/${totalQ} ข้อ (${varCount} SETS)` : `${totalQ} ข้อ (${varCount} SETS READY)`;
    document.getElementById('lobby-quiz-title').innerHTML = `
        ${escapeHtml(currentQuiz.title)}
        <span class="badge bg-warning text-dark fs-6 font-mono"><i class="bi bi-shield-lock-fill me-1"></i>${qCountBadge}</span>
    `;
    document.getElementById('lobby-quiz-desc').textContent = isPool 
        ? `ระบบสุ่มดึงข้อสอบคนละ ${poolCount} ข้อ จากคลังทั้งหมด ${totalQ} ข้อ แจกจ่าย 1 คนต่อ 1 ชุดไม่ซ้ำกัน (${varCount} ชุด)` 
        : (currentQuiz.description || `สุ่มแจกจ่ายข้อสอบ ${varCount} ชุด ไม่ซ้ำกัน 1 คนต่อ 1 ชุด`);
}

function autoGenerate20Variants(baseQuestions, poolCount, targetCount = 20) {
    const variants = [];
    const count = (poolCount && poolCount > 0 && poolCount < (baseQuestions || []).length)
        ? poolCount
        : (baseQuestions || []).length;
    const maxGen = Math.max(1, targetCount || 20);

    for (let i = 1; i <= maxGen; i++) {
        const cloned = JSON.parse(JSON.stringify(baseQuestions || []));
        shuffleArray(cloned);
        const selected = cloned.slice(0, count);

        selected.forEach((q, idx) => {
            q.title = q.title.replace(/^ข้อที่\s*\d+[:.]?\s*/, `ข้อที่ ${idx + 1}: `);
            if (Array.isArray(q.options) && q.options.length > 1) {
                shuffleArray(q.options);
            }
        });
        variants.push({
            variantIndex: i,
            variantName: `ชุดที่ ${i}`,
            questions: selected
        });
    }
    return variants;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function getLocalQuizzes() {
    try {
        const raw = localStorage.getItem('gyver_local_quizzes');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

/**
 * สุ่มสร้างรหัส PIN 4 หลัก
 */
function initRoomCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam && pinParam.length >= 4) {
        roomCode = pinParam;
    } else {
        roomCode = String(Math.floor(1000 + Math.random() * 9000));
    }

    lobbyData.room_code = roomCode;
    document.getElementById('display-room-pin').textContent = roomCode;

    // Build Student Join URL
    const studentUrl = `${window.location.origin}${window.location.pathname.replace('quiz_lobby.html', 'quiz_student.html')}?pin=${roomCode}`;
    const displayUrlEl = document.getElementById('display-join-url');
    if (displayUrlEl) displayUrlEl.textContent = studentUrl;

    // Generate QR Code
    const qrImg = document.getElementById('lobby-qr-code-img');
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(studentUrl)}`;
    }
}

function copyJoinLink() {
    const studentUrl = `${window.location.origin}${window.location.pathname.replace('quiz_lobby.html', 'quiz_student.html')}?pin=${roomCode}`;
    navigator.clipboard.writeText(studentUrl).then(() => {
        CyberSwal?.fire({
            icon: 'success',
            title: 'คัดลอกลิงก์สำเร็จ!',
            text: 'ส่งลิงก์นี้ให้นักเรียนกดเข้าห้องสอบได้ทันที',
            timer: 1800,
            showConfirmButton: false
        });
    }).catch(() => {
        prompt('คัดลอกลิงก์ด้านล่างนี้:', studentUrl);
    });
}

/**
 * บันทึกหรือซิงก์ห้องสอบกับ Supabase / LocalStorage
 */
async function createOrRegisterLobby() {
    lobbyData = {
        room_code: roomCode,
        game_mode: 'quiz',
        match_type: 'solo',
        status: 'WAITING',
        players: [],
        quiz_id: currentQuiz.id,
        quiz_title: currentQuiz.title,
        quiz_variants: currentQuiz.variants,
        quiz_settings: currentQuiz.settings,
        created_at: new Date().toISOString()
    };

    saveLocalLobby(lobbyData);

    const badge = document.getElementById('connection-status-badge');
    const banner = document.getElementById('missing-table-banner');
    const btnSql = document.getElementById('btn-header-sql');

    if (window.supabaseClient) {
        try {
            const { error } = await window.supabaseClient.from('lobbies').upsert([lobbyData], { onConflict: 'room_code' });
            if (error) {
                console.warn('Supabase lobbies upsert error:', error);
                setMissingTableState(true, error);
                return;
            }
            // เชื่อมต่อสำเร็จ
            setMissingTableState(false);
        } catch (e) {
            console.warn('Lobby sync to Supabase skipped:', e);
            setMissingTableState(true, e);
        }
    } else {
        if (badge) {
            badge.className = 'badge bg-warning-subtle text-warning border border-warning-subtle px-3 py-2';
            badge.innerHTML = '<i class="bi bi-hdd me-1"></i>โหมดออฟไลน์ (LocalStorage / Broadcast)';
        }
    }
}

function setMissingTableState(isMissing, err = null) {
    const badge = document.getElementById('connection-status-badge');
    const banner = document.getElementById('missing-table-banner');
    const btnSql = document.getElementById('btn-header-sql');

    if (isMissing) {
        const errStr = String(err?.message || err || '');
        const isTableMissing = err && (err.code === 'PGRST205' || errStr.includes('lobbies') || err.code === '42P01');

        if (badge) {
            badge.className = 'badge bg-danger text-white px-3 py-2 cursor-pointer shadow-sm animate-pulse';
            if (isTableMissing) {
                badge.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i>ยังไม่มีตารางใน Supabase (คลิกดูวิธีแก้)';
            } else {
                badge.innerHTML = '<i class="bi bi-wifi-off me-1"></i>Supabase เชื่อมต่อไม่ติด (Paused / Offline)';
            }
        }
        if (banner) {
            banner.classList.remove('d-none');
            const descEl = banner.querySelector('p');
            if (descEl && !isTableMissing) {
                descEl.innerHTML = `⚠️ <b>ตรวจพบปัญหาการเชื่อมต่อ Supabase:</b> ระบบได้รับข้อผิดพลาด <code>ERR_CONNECTION_RESET</code> (อาจเกิดจากโปรเจกต์ Supabase อยู่ในสถานะ <b>Paused</b> กรุณาเปิด <a href="https://supabase.com/dashboard" target="_blank" class="text-warning text-decoration-underline fw-bold">Supabase Dashboard</a> แล้วกด <b>"Restore Project"</b>)`;
            }
        }
        if (btnSql) btnSql.classList.remove('d-none');
    } else {
        if (badge) {
            badge.className = 'badge bg-success-subtle text-success border border-success-subtle px-3 py-2';
            badge.innerHTML = '<i class="bi bi-wifi me-1"></i>ระบบออนไลน์ (Supabase พร้อมใช้งาน)';
        }
        if (banner) banner.classList.add('d-none');
        if (btnSql) btnSql.classList.add('d-none');
    }
}

function openSqlSetupModal() {
    const modalEl = document.getElementById('sqlSetupModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

function copySqlScript() {
    const sqlCode = document.getElementById('sql-code-display')?.innerText || '';
    if (!sqlCode) return;

    navigator.clipboard.writeText(sqlCode).then(() => {
        CyberSwal?.fire({
            icon: 'success',
            title: 'คัดลอกคำสั่ง SQL เรียบร้อย!',
            text: 'นำไปวางใน Supabase Dashboard > SQL Editor แล้วกด Run ได้เลยครับ',
            timer: 2000,
            showConfirmButton: false
        });
    }).catch(() => {
        prompt('คัดลอกคำสั่ง SQL ด้านล่างนี้:', sqlCode);
    });
}

async function recheckSupabaseConnection() {
    const badge = document.getElementById('connection-status-badge');
    if (badge) {
        badge.className = 'badge bg-info text-dark px-3 py-2';
        badge.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i>กำลังตรวจสอบ...';
    }

    await createOrRegisterLobby();

    const banner = document.getElementById('missing-table-banner');
    if (!banner || banner.classList.contains('d-none')) {
        // Modal instance close
        const modalEl = document.getElementById('sqlSetupModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        CyberSwal?.fire({
            icon: 'success',
            title: 'เชื่อมต่อตาราง Supabase สำเร็จ!',
            text: 'ห้องสอบออนไลน์พร้อมแล้ว นักเรียนสามารถสแกน QR Code หรือใส่รหัส PIN เข้าห้องสอบได้ทันที',
            timer: 2500,
            showConfirmButton: false
        });
    } else {
        CyberSwal?.fire({
            icon: 'error',
            title: 'ยังไม่พบตาราง lobbies',
            text: 'ยังไม่พบตารางใน Supabase กรุณาตรวจสอบว่าได้วางโค้ดและกดปุ่ม Run ใน SQL Editor สำเร็จหรือไม่',
            confirmButtonText: 'รับทราบ'
        });
    }
}

function saveLocalLobby(data) {
    try {
        localStorage.setItem(`gyver_lobby_${roomCode}`, JSON.stringify(data));
        if (localBC) {
            localBC.postMessage({ type: 'LOBBY_STATE', roomCode: roomCode, data: data });
        }
    } catch (e) {}
}

function getLocalLobby() {
    try {
        const raw = localStorage.getItem(`gyver_lobby_${roomCode}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/**
 * 📡 Realtime + Polling Sync Engine
 */
function setupLobbyRealtime() {
    // 0. Local BroadcastChannel for instant local / offline sync
    if (localBC) {
        localBC.onmessage = (event) => {
            const msg = event?.data;
            if (!msg || msg.roomCode !== roomCode) return;
            if (msg.type === 'REQUEST_LOBBY') {
                localBC.postMessage({ type: 'LOBBY_STATE', roomCode: roomCode, data: lobbyData });
            } else if (msg.type === 'STUDENT_JOIN') {
                handleStudentJoinedEvent(msg.student);
            } else if (msg.type === 'STUDENT_LEAVE') {
                handleStudentLeftEvent(msg.student);
            } else if (msg.type === 'STUDENT_SUBMIT') {
                handleStudentSubmittedEvent(msg.result);
            } else if (msg.type === 'STUDENT_PROGRESS') {
                handleStudentProgressEvent(msg);
            } else if (msg.type === 'STUDENT_LOCKDOWN_ALERT') {
                handleStudentLockdownAlert(msg);
            } else if (msg.type === 'STUDENT_UNLOCKED') {
                handleStudentUnlockedEvent(msg);
            }
        };
    }

    // 1. Supabase Postgres Changes & Broadcast Channel
    if (window.supabaseClient) {
        try {
            realtimeChannel = window.supabaseClient.channel(`quiz_lobby_channel_${roomCode}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'lobbies',
                    filter: `room_code=eq.${roomCode}`
                }, (payload) => {
                    if (payload.new) {
                        handleLobbyUpdate(payload.new);
                    }
                })
                .on('broadcast', { event: 'student_joined' }, (payload) => {
                    handleStudentJoinedEvent(payload.payload);
                })
                .on('broadcast', { event: 'student_left' }, (payload) => {
                    handleStudentLeftEvent(payload.payload);
                })
                .on('broadcast', { event: 'student_submitted' }, (payload) => {
                    handleStudentSubmittedEvent(payload.payload);
                })
                // 📈 Real-time progress from students on OTHER devices
                .on('broadcast', { event: 'student_progress' }, (payload) => {
                    handleStudentProgressEvent(payload.payload);
                })
                // 🚨 Real-time Anti-Cheat Lockdown alert
                .on('broadcast', { event: 'student_lockdown_alert' }, (payload) => {
                    handleStudentLockdownAlert(payload.payload);
                })
                // 🔓 Real-time Anti-Cheat Unlock alert
                .on('broadcast', { event: 'student_unlocked' }, (payload) => {
                    handleStudentUnlockedEvent(payload.payload);
                })
                .subscribe();
        } catch (e) {
            console.warn('Realtime subscription error:', e);
        }
    }

    // 2. Polling Fallback every 1.5 seconds for rock-solid sync
    pollTimerInterval = setInterval(async () => {
        if (window.supabaseClient) {
            try {
                const { data } = await window.supabaseClient
                    .from('lobbies')
                    .select('*')
                    .eq('room_code', roomCode)
                    .maybeSingle();

                if (data) {
                    handleLobbyUpdate(data);
                    return;
                }
            } catch (e) {}
        }

        // LocalStorage fallback check
        const local = getLocalLobby();
        if (local) {
            handleLobbyUpdate(local);
        }
    }, 1500);
}

function handleLobbyUpdate(updatedLobby) {
    if (!updatedLobby) return;

    // Merge transient student lockdown & progress states
    if (lobbyData && lobbyData.players && updatedLobby.players) {
        updatedLobby.players.forEach(newP => {
            const oldP = lobbyData.players.find(p => p.name === newP.name);
            if (oldP) {
                if (newP.isLocked === undefined && oldP.isLocked !== undefined) {
                    newP.isLocked = oldP.isLocked;
                    newP.lockReason = oldP.lockReason;
                    newP.violationCount = oldP.violationCount;
                    newP.lastLockedAt = oldP.lastLockedAt;
                }
                if (newP.answeredCount === undefined && oldP.answeredCount !== undefined) {
                    newP.answeredCount = oldP.answeredCount;
                    newP.totalQuestions = oldP.totalQuestions;
                    newP.startedAt = oldP.startedAt;
                }
            }
        });
    }

    lobbyData = updatedLobby;
    saveLocalLobby(lobbyData);

    if (lobbyData.status === 'WAITING') {
        renderWaitingLobbyUI();
    } else if (lobbyData.status === 'RUNNING') {
        renderMonitoringUI();
    } else if (lobbyData.status === 'FINISHED') {
        renderSummaryUI();
    }
}

function handleStudentJoinedEvent(student) {
    if (!student || !student.name) return;
    if (!lobbyData.players) lobbyData.players = [];

    const existing = lobbyData.players.find(p => p.name === student.name && p.room === student.room);
    if (!existing) {
        lobbyData.players.push({
            id: student.id || ('s_' + Math.random().toString(36).substr(2, 7)),
            name: student.name,
            room: student.room || '',
            status: 'WAITING'
        });
        saveLocalLobby(lobbyData);
        syncLobbyPlayersToSupabase();
        renderWaitingLobbyUI();
    }
}

function handleStudentLeftEvent(student) {
    if (!student || !student.name) return;
    if (lobbyData.status !== 'WAITING') return; // ให้ผลเฉพาะช่วงรอก่อนสอบเริ่ม
    if (!lobbyData.players || lobbyData.players.length === 0) return;

    const beforeLen = lobbyData.players.length;
    lobbyData.players = lobbyData.players.filter(p => {
        if (student.id && p.id === student.id) return false;
        if (!student.id && p.name === student.name && (!student.room || p.room === student.room)) return false;
        if (p.name === student.name && (!student.room || p.room === student.room)) return false;
        return true;
    });

    if (lobbyData.players.length !== beforeLen) {
        saveLocalLobby(lobbyData);
        syncLobbyPlayersToSupabase();
        renderWaitingLobbyUI(true);
    }
}

function handleStudentSubmittedEvent(result) {
    if (!result) return;
    const player = (lobbyData.players || []).find(p => p.name === result.studentName);
    if (player) {
        // 🛡️ ป้องกันการส่งคะแนนซ้ำ (Strict Anti-Score Overwrite)
        if (player.status === 'SUBMITTED') {
            console.warn(`[Anti-Cheat] ผู้เข้าสอบ "${player.name}" เคยส่งข้อสอบไปแล้วด้วยคะแนน ${player.score}/${player.total}. ปฏิเสธการส่งคะแนนซ้ำ!`);
            return;
        }

        player.submittedAt = result.submittedAt || new Date().toISOString();
        player.score = result.score;
        player.total = result.total;
        player.percent = result.percent;
        player.isPassed = result.isPassed;
        player.status = 'SUBMITTED';

        saveLocalLobby(lobbyData);
        syncLobbyPlayersToSupabase();
        renderMonitoringUI();
        checkIfAllSubmitted();
    }
}

async function syncLobbyPlayersToSupabase() {
    if (!window.supabaseClient) return;
    try {
        await window.supabaseClient
            .from('lobbies')
            .update({ players: lobbyData.players })
            .eq('room_code', roomCode);
    } catch (e) {}
}

/**
 * 🟢 Render หน้ารอนักเรียนเข้าห้อง (ไม่มีการ์ดกระพริบ และมีปุ่มให้ครูเตะ นร ออกได้)
 */
function renderWaitingLobbyUI(force = false) {
    const grid = document.getElementById('lobby-students-grid');
    const badge = document.getElementById('student-count-badge');
    if (!grid) return;

    const players = lobbyData.players || [];
    if (badge) badge.textContent = `${players.length} คน`;

    const currentJSON = JSON.stringify(players.map(p => ({ id: p.id, name: p.name, room: p.room })));
    if (!force && currentJSON === lastRenderedPlayersJSON) {
        // รายชื่อนักเรียนไม่เปลี่ยน ไม่แตะ DOM เพื่อให้การ์ดนิ่งสนิท ไม่กระพริบ
        return;
    }
    lastRenderedPlayersJSON = currentJSON;

    if (players.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 text-subtle" id="lobby-empty-hint">
                <div class="spinner-grow text-quiz mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                <h5>กำลังรอนักเรียนสแกนเข้าร่วม...</h5>
                <p class="small text-subtle m-0">ให้นักเรียนสแกน QR Code ฝั่งซ้าย หรือเปิดเบราว์เซอร์แล้วใส่ PIN</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = players.map(p => `
        <div class="col-6 col-md-4 col-xl-3" id="player-card-${escapeHtml(p.id || p.name)}">
            <div class="student-lobby-card d-flex align-items-center gap-3 position-relative">
                <div class="student-avatar flex-shrink-0">
                    ${escapeHtml((p.name || 'S').charAt(0).toUpperCase())}
                </div>
                <div class="text-truncate flex-grow-1 pe-3">
                    <div class="fw-bold text-white text-truncate">${escapeHtml(p.name)}</div>
                    <div class="small text-subtle">${escapeHtml(p.room || 'นักเรียน')}</div>
                </div>
                <button type="button" class="student-kick-btn" data-player-id="${escapeHtml(p.id || p.name)}" data-player-name="${escapeHtml(p.name)}" onclick="onKickStudentClick(this)" title="เตะ ${escapeHtml(p.name)} ออกจากห้อง">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function onKickStudentClick(btn) {
    if (!btn) return;
    const id = btn.getAttribute('data-player-id');
    const name = btn.getAttribute('data-player-name');
    confirmKickStudent(id, name);
}

async function confirmKickStudent(idOrName, studentName) {
    if (!CyberSwal) {
        if (confirm(`คุณต้องการเตะ "${studentName}" ออกจากห้องสอบใช่หรือไม่?`)) {
            executeKickStudent(idOrName, studentName);
        }
        return;
    }

    const res = await CyberSwal.fire({
        title: `เตะ "${studentName}" ออก?`,
        text: 'นักเรียนคนนี้จะถูกนำออกจากห้องสอบ และต้องสแกนหรือใส่ PIN เพื่อเข้าใหม่อีกครั้ง',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-person-x-fill me-1"></i> ยืนยันเตะออก',
        cancelButtonText: 'ยกเลิก'
    });

    if (res.isConfirmed) {
        executeKickStudent(idOrName, studentName);
    }
}

async function executeKickStudent(idOrName, studentName) {
    if (!lobbyData.players) return;

    // 1. นำนักเรียนออกจากรายชื่อ
    lobbyData.players = lobbyData.players.filter(p => (p.id !== idOrName && p.name !== studentName));
    saveLocalLobby(lobbyData);
    renderWaitingLobbyUI(true);

    // 2. ส่ง Local Broadcast ทันที
    if (localBC) {
        localBC.postMessage({
            type: 'KICK_STUDENT',
            roomCode: roomCode,
            studentName: studentName,
            id: idOrName
        });
    }

    // 3. ซิงค์ Supabase & ส่ง Supabase Broadcast แจ้งเตะนักเรียน
    if (window.supabaseClient) {
        try {
            await window.supabaseClient
                .from('lobbies')
                .update({ players: lobbyData.players })
                .eq('room_code', roomCode);

            await window.supabaseClient.channel(`quiz_room_${roomCode}`).send({
                type: 'broadcast',
                event: 'KICK_STUDENT',
                payload: {
                    studentName: studentName,
                    id: idOrName,
                    roomCode: roomCode
                }
            });
        } catch (err) {
            console.error('Failed to sync kick student to Supabase:', err);
        }
    }

    if (CyberSwal) {
        CyberSwal.fire({
            icon: 'success',
            title: `เตะ "${studentName}" ออกแล้ว`,
            timer: 1500,
            showConfirmButton: false
        });
    }
}

window.onKickStudentClick = onKickStudentClick;
window.confirmKickStudent = confirmKickStudent;


/**
 * 🚀 ครูกดเริ่มสอบ -> สุ่มแจกจ่ายข้อสอบ 20 ชุดแบบ 1 คนต่อ 1 ชุด!
 */
async function startLiveExam() {
    const players = lobbyData.players || [];
    if (players.length === 0) {
        CyberSwal?.fire({
            icon: 'warning',
            title: 'ยังไม่มีนักเรียนในห้อง',
            text: 'กรุณารอนักเรียนสแกนเข้าห้องรอก่อนเริ่มสอบครับ',
            confirmButtonText: 'เข้าใจแล้ว'
        });
        return;
    }

    const confirm = await CyberSwal?.fire({
        title: 'ยืนยันเริ่มการสอบ?',
        text: `มีนักเรียนในห้องทั้งหมด ${players.length} คน ระบบจะทำการสุ่มแจกชุดข้อสอบ 20 ชุดไม่ซ้ำกันรายบุคคลทันที`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-play-circle-fill me-1"></i> เริ่มสอบทันที',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirm || !confirm.isConfirmed) return;

    // 🎲 Distribution Algorithm (1 to 1 Unique Assignment)
    const totalQ = (currentQuiz.questions || []).length;
    const isPool = (currentQuiz.settings?.poolEnabled === false) ? false : (totalQ > 20 || !!currentQuiz.settings?.poolEnabled);
    const poolCount = isPool 
        ? (Number(currentQuiz.settings?.poolCount) > 0 ? Math.min(Number(currentQuiz.settings.poolCount), totalQ) : Math.min(20, totalQ))
        : totalQ;

    let variants = currentQuiz.variants;
    if (!variants || variants.length === 0 || (variants[0]?.questions?.length !== poolCount)) {
        const existingCount = (variants && variants.length > 0) ? variants.length : 20;
        variants = autoGenerate20Variants(currentQuiz.questions, poolCount, existingCount);
        currentQuiz.variants = variants;
    }
    
    // Create an array of variant indices [1..20] and shuffle it
    let availableVariantIndices = variants.map(v => v.variantIndex);
    shuffleArray(availableVariantIndices);

    const updatedPlayers = players.map((p, idx) => {
        // If more than 20 students, loop gracefully, but adjacent will never be same
        const variantIndex = availableVariantIndices[idx % availableVariantIndices.length];
        const assignedVariant = variants.find(v => v.variantIndex === variantIndex) || variants[0];

        return {
            ...p,
            status: 'IN_EXAM',
            assignedVariantIndex: variantIndex,
            assignedVariantName: assignedVariant.variantName,
            variantQuestions: assignedVariant.questions
        };
    });

    lobbyData.status = 'RUNNING';
    lobbyData.players = updatedPlayers;
    lobbyData.startedAt = new Date().toISOString();

    saveLocalLobby(lobbyData);

    // Broadcast signal locally
    if (localBC) {
        localBC.postMessage({
            type: 'START_EXAM',
            roomCode: roomCode,
            lobby: lobbyData
        });
    }

    // Sync to Supabase
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('lobbies').update({
                status: 'RUNNING',
                players: updatedPlayers
            }).eq('room_code', roomCode);

            // Broadcast signal to all student devices
            await window.supabaseClient.channel(`quiz_room_${roomCode}`).send({
                type: 'broadcast',
                event: 'START_EXAM',
                payload: { roomCode: roomCode }
            });
        } catch (e) {}
    }

    // Switch View to Monitoring Dashboard
    document.getElementById('view-lobby-waiting').classList.add('d-none');
    document.getElementById('view-lobby-active').classList.remove('d-none');

    startExamTimer();
    renderMonitoringUI();
}

/**
 * 📡 Handle real-time progress update from student tab
 */
function handleStudentProgressEvent(msg) {
    if (!lobbyData) return;
    const p = (lobbyData.players || []).find(x => x.name === msg.studentName);
    if (p && p.status !== 'SUBMITTED') {
        p.answeredCount = msg.answeredCount;
        p.totalQuestions = msg.totalQuestions;
        if (msg.startedAt) p.startedAt = msg.startedAt;
    }
    renderMonitoringUI();
}

function handleStudentLockdownAlert(msg) {
    if (!msg || !msg.studentName) return;
    console.warn('[Teacher Alert] Cheating/Lockdown:', msg);

    // 🔒 Update player's locked state in dashboard
    const player = (lobbyData.players || []).find(p => p.name === msg.studentName);
    if (player) {
        player.isLocked = true;
        player.lockReason = msg.reason || 'ตรวจพบการคลิกออกนอกหน้าจอสอบ';
        player.violationCount = msg.violationCount || ((player.violationCount || 0) + 1);
        player.lastLockedAt = msg.time || new Date().toLocaleTimeString('th-TH');
        saveLocalLobby(lobbyData);
        syncLobbyPlayersToSupabase();
        renderMonitoringUI();
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'warning',
            title: `🚨 แจ้งเตือนการทุจริต: ${msg.studentName}`,
            html: `
                <div class="text-start p-2">
                    <p class="text-danger fw-bold mb-1"><i class="bi bi-shield-slash-fill me-1"></i>${escapeHtml(msg.reason || 'ตรวจพบการออกจากหน้าจอสอบ')}</p>
                    <p class="text-subtle small mb-1">เวลา: ${escapeHtml(msg.time || 'เมื่อสักครู่')}</p>
                    <p class="text-warning small mb-2">ครั้งที่: ${msg.violationCount || 1} (หน้าจอเด็กถูกล็อกแล้ว)</p>
                </div>
            `,
            toast: true,
            position: 'top-end',
            timer: 10000,
            showConfirmButton: true,
            confirmButtonText: '<i class="bi bi-unlock-fill me-1"></i>ปลดล็อกให้เด็ก',
            showCancelButton: true,
            cancelButtonText: 'ปิด',
            background: '#1e1018',
            color: '#fff'
        }).then((res) => {
            if (res.isConfirmed) {
                teacherUnlockStudent(msg.studentName);
            }
        });
    }
}

/**
 * 🔓 Handle notification when a student screen is unlocked (via PIN or remote)
 */
function handleStudentUnlockedEvent(msg) {
    if (!msg || !msg.studentName) return;
    const player = (lobbyData.players || []).find(p => p.name === msg.studentName);
    if (player) {
        player.isLocked = false;
        saveLocalLobby(lobbyData);
        syncLobbyPlayersToSupabase();
        renderMonitoringUI();
    }
}

/**
 * 🔓 Teacher Remotely Unlocks Student Screen
 */
async function teacherUnlockStudent(studentName) {
    if (!studentName) return;

    let shouldUnlock = true;
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'ปลดล็อกหน้าจอสอบ?',
            html: `ต้องการปลดล็อกหน้าจอให้ <b>${escapeHtml(studentName)}</b> หรือไม่?<br><span class="text-subtle small">เมื่อยืนยัน ระบบจะปลดล็อกหน้าจอนักเรียนทันทีโดยไม่ต้องใส่ PIN</span>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-unlock-fill me-1"></i>ยืนยันปลดล็อก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            background: 'rgba(15, 23, 42, 0.98)',
            color: '#fff'
        });
        shouldUnlock = result.isConfirmed;
    }

    if (!shouldUnlock) return;

    // 1. Update teacher's local player state
    const player = (lobbyData.players || []).find(p => p.name === studentName);
    if (player) {
        player.isLocked = false;
        saveLocalLobby(lobbyData);
        syncLobbyPlayersToSupabase();
        renderMonitoringUI();
    }

    // 2. Broadcast via Local BroadcastChannel
    if (localBC) {
        localBC.postMessage({
            type: 'TEACHER_UNLOCK_STUDENT',
            roomCode: roomCode,
            studentName: studentName
        });
    }

    // 3. Broadcast via Supabase Realtime
    if (window.supabaseClient && roomCode) {
        try {
            await window.supabaseClient.channel(`quiz_lobby_channel_${roomCode}`).send({
                type: 'broadcast',
                event: 'teacher_unlock_student',
                payload: {
                    roomCode: roomCode,
                    studentName: studentName
                }
            });
        } catch (e) {
            console.warn('[Teacher Unlock] Realtime broadcast error:', e);
        }
    }

    // 4. Show success toast to teacher
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'ปลดล็อกหน้าจอแล้ว! 🔓',
            text: `ส่งคำสั่งปลดล็อกให้ ${studentName} สำเร็จ`,
            toast: true,
            position: 'top-end',
            timer: 3000,
            showConfirmButton: false,
            background: '#0f172a',
            color: '#fff'
        });
    }
}
window.teacherUnlockStudent = teacherUnlockStudent;

function onTeacherUnlockClick(btn) {
    const name = btn.getAttribute('data-student-name');
    if (name) teacherUnlockStudent(name);
}
window.onTeacherUnlockClick = onTeacherUnlockClick;

/**
 * 📊 Render Live Exam Monitoring Dashboard
 */
function renderMonitoringUI() {
    document.getElementById('view-lobby-waiting').classList.add('d-none');
    document.getElementById('view-lobby-active').classList.remove('d-none');

    const grid = document.getElementById('monitor-students-grid');
    const submittedCountEl = document.getElementById('active-submitted-count');
    const players = lobbyData.players || [];

    const submitted = players.filter(p => p.status === 'SUBMITTED');
    if (submittedCountEl) {
        submittedCountEl.textContent = `${submitted.length} / ${players.length}`;
    }

    if (!grid) return;

    // Calculate exam time limit for fast-submission detection
    const timeLimitSec = (currentQuiz?.settings?.timeLimit || 15) * 60;

    grid.innerHTML = players.map(p => {
        const isDone = p.status === 'SUBMITTED';

        // --- Progress calculation for in-progress students ---
        const answered  = p.answeredCount || 0;
        const total     = p.totalQuestions || 0;
        const pct       = total > 0 ? Math.round((answered / total) * 100) : 0;

        // Elapsed time since student started
        let elapsedLabel = '';
        let isSuspiciouslyFast = false;
        if (isDone && p.startedAt && p.submittedAt) {
            const secs = Math.round((new Date(p.submittedAt) - new Date(p.startedAt)) / 1000);
            const mins = Math.floor(secs / 60);
            const ss   = secs % 60;
            elapsedLabel = `${mins}:${String(ss).padStart(2,'0')} น.`;
            // "Suspicious" = finished faster than 30% of total time
            isSuspiciouslyFast = secs < timeLimitSec * 0.30;
        }

        // Progress bar color: red < 30%, yellow < 70%, green >= 70%
        const barColor = pct < 30 ? 'bg-danger' : pct < 70 ? 'bg-warning' : 'bg-success';

        return `
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="monitor-student-card ${isDone ? 'is-submitted' : (p.isLocked ? 'is-locked' : '')}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-warning text-dark font-mono">
                            <i class="bi bi-shield-fill me-1"></i>${escapeHtml(p.assignedVariantName || 'ชุดพิเศษ')}
                        </span>
                        <div class="d-flex align-items-center gap-1">
                            ${isSuspiciouslyFast ? `<span class="badge bg-danger" title="ส่งเร็วมากผิดปกติ ควรตรวจสอบ"><i class="bi bi-lightning-charge-fill"></i> เร็วมาก!</span>` : ''}
                            ${p.isLocked ? `
                                <span class="badge bg-danger pulse-badge" title="หน้าจอถูกระงับการสอบ">
                                    <i class="bi bi-lock-fill me-1"></i>โดนล็อกแล้ว (${p.violationCount || 1})
                                </span>
                            ` : `
                                <span class="badge bg-${isDone ? 'success' : 'secondary'}">
                                    ${isDone ? 'ส่งแล้ว ✅' : 'กำลังทำข้อสอบ...'}
                                </span>
                            `}
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div class="student-avatar ${p.isLocked ? 'is-locked-avatar' : ''}" style="width: 36px; height: 36px; font-size: 0.9rem;">
                            ${escapeHtml((p.name || 'S').charAt(0).toUpperCase())}
                        </div>
                        <div class="text-truncate flex-grow-1">
                            <div class="fw-bold text-white text-truncate">${escapeHtml(p.name)}</div>
                            <div class="small text-subtle">${escapeHtml(p.room || '-')}</div>
                        </div>
                        ${p.isLocked ? `
                            <span class="badge bg-danger-subtle text-danger border border-danger-subtle font-mono" style="font-size: 0.72rem;">
                                <i class="bi bi-exclamation-octagon-fill me-1"></i>LOCKED
                            </span>
                        ` : ''}
                    </div>
                    ${isDone ? `
                        <div class="d-flex justify-content-between align-items-center pt-2 border-top border-secondary mb-1">
                            <span class="small text-subtle">คะแนนที่ได้:</span>
                            <span class="fw-bold fs-5 text-quiz font-mono">${p.score} / ${p.total} (${p.percent}%)</span>
                        </div>
                        ${elapsedLabel ? `<div class="d-flex justify-content-between align-items-center">
                            <span class="small text-subtle">เวลาทำข้อสอบ:</span>
                            <span class="small fw-semibold ${isSuspiciouslyFast ? 'text-danger' : 'text-info'}">
                                <i class="bi bi-stopwatch me-1"></i>${elapsedLabel}
                            </span>
                        </div>` : ''}
                    ` : `
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="small text-subtle">ตอบแล้ว:</span>
                            <span class="small fw-bold text-white">${answered} / ${total > 0 ? total : '?'} ข้อ</span>
                        </div>
                        <div class="progress" style="height: 8px; border-radius: 8px; background: rgba(255,255,255,0.08);">
                            <div class="progress-bar ${barColor} ${pct < 100 ? 'progress-bar-striped progress-bar-animated' : ''}" 
                                 style="width: ${total > 0 ? pct : 0}%; border-radius: 8px; transition: width 0.5s ease;">
                            </div>
                        </div>
                        <div class="text-end mt-1">
                            <span class="small text-subtle" style="font-size: 0.7rem;">${total > 0 ? pct : 0}%</span>
                        </div>

                        ${p.isLocked ? `
                            <div class="mt-2 pt-2 border-top border-danger-subtle">
                                <div class="small text-danger fw-semibold d-flex align-items-center gap-1 mb-2">
                                    <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                                    <span class="text-truncate" title="${escapeHtml(p.lockReason || 'ตรวจพบการออกจากหน้าจอ')}">${escapeHtml(p.lockReason || 'ตรวจพบการออกจากหน้าจอ')}</span>
                                </div>
                                <button type="button" class="btn btn-danger btn-sm w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 py-2"
                                        data-student-name="${escapeHtml(p.name)}"
                                        onclick="onTeacherUnlockClick(this)">
                                    <i class="bi bi-unlock-fill"></i> ปลดล็อกหน้าจอ
                                </button>
                            </div>
                        ` : ''}
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function startExamTimer() {
    const timeLimitMin = currentQuiz.settings?.timeLimit || 15;
    remainingExamSeconds = timeLimitMin * 60;
    updateExamTimerText();

    if (examTimerInterval) clearInterval(examTimerInterval);
    examTimerInterval = setInterval(() => {
        remainingExamSeconds--;
        updateExamTimerText();

        if (remainingExamSeconds <= 0) {
            clearInterval(examTimerInterval);
            finishExam();
        }
    }, 1000);
}

function updateExamTimerText() {
    const timerEl = document.getElementById('active-timer-display');
    if (!timerEl) return;
    const mins = Math.max(0, Math.floor(remainingExamSeconds / 60));
    const secs = Math.max(0, remainingExamSeconds % 60);
    timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function confirmEndExamEarly() {
    CyberSwal?.fire({
        title: 'ยืนยันยุติการสอบ?',
        text: 'ระบบจะตัดเวลาและสรุปผลคะแนนของนักเรียนทุกคนทันที',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ยุติการสอบเดี๋ยวนี้',
        cancelButtonText: 'ทำต่อ'
    }).then(r => {
        if (r.isConfirmed) finishExam();
    });
}

function checkIfAllSubmitted() {
    const players = lobbyData.players || [];
    if (players.length > 0 && players.every(p => p.status === 'SUBMITTED')) {
        finishExam();
    }
}

async function finishExam() {
    if (examTimerInterval) clearInterval(examTimerInterval);

    lobbyData.status = 'FINISHED';
    saveLocalLobby(lobbyData);

    // 📡 ส่งสัญญาณแจ้งนักเรียนทุกคนว่าการสอบสิ้นสุดแล้ว (ปลดล็อกเฉลย)
    if (localBC) {
        localBC.postMessage({
            type: 'EXAM_FINISHED',
            roomCode: roomCode
        });
    }

    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('lobbies').update({
                status: 'FINISHED'
            }).eq('room_code', roomCode);

            await window.supabaseClient.channel(`quiz_lobby_channel_${roomCode}`).send({
                type: 'broadcast',
                event: 'exam_finished',
                payload: { roomCode: roomCode, status: 'FINISHED' }
            });
        } catch (e) {}
    }

    document.getElementById('view-lobby-active').classList.add('d-none');
    document.getElementById('view-lobby-summary').classList.remove('d-none');
    renderSummaryUI();
}

/**
 * 🏆 Render Final Summary & Leaderboard
 */
function renderSummaryUI() {
    document.getElementById('view-lobby-waiting').classList.add('d-none');
    document.getElementById('view-lobby-active').classList.add('d-none');
    document.getElementById('view-lobby-summary').classList.remove('d-none');

    const players = lobbyData.players || [];
    const totalCount = players.length;

    let totalPercent = 0;
    let passedCount = 0;

    players.forEach(p => {
        totalPercent += (p.percent || 0);
        if (p.isPassed) passedCount++;
    });

    const avgPercent = totalCount > 0 ? Math.round(totalPercent / totalCount) : 0;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

    document.getElementById('summary-total-students').textContent = `${totalCount} คน`;
    document.getElementById('summary-avg-score').textContent = `${avgPercent}%`;
    document.getElementById('summary-pass-rate').textContent = `${passRate}%`;

    // Leaderboard
    const sorted = [...players].sort((a, b) => (b.percent || 0) - (a.percent || 0));
    const tbody = document.getElementById('summary-leaderboard-tbody');
    if (!tbody) return;

    tbody.innerHTML = sorted.map((p, idx) => {
        const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
        return `
            <tr>
                <td class="fw-bold fs-5">${medal}</td>
                <td class="fw-bold text-white">${escapeHtml(p.name)}</td>
                <td class="text-subtle">${escapeHtml(p.room || '-')}</td>
                <td><span class="badge bg-warning text-dark font-mono">${escapeHtml(p.assignedVariantName || '-')}</span></td>
                <td class="fw-bold text-white">${p.score || 0} / ${p.total || 0}</td>
                <td class="fw-bold text-quiz">${p.percent || 0}%</td>
                <td>
                    <span class="badge bg-${p.isPassed ? 'success' : 'danger'}">
                        ${p.isPassed ? 'ผ่านเกณฑ์' : 'ไม่ผ่าน'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function exportLobbyResultsCSV() {
    const players = lobbyData.players || [];
    if (players.length === 0) {
        alert('ไม่มีข้อมูลสำหรับส่งออก CSV');
        return;
    }

    let csv = '\uFEFF';
    csv += 'อันดับ,ชื่อนักเรียน,ห้อง/ชั้น,ชุดข้อสอบที่ได้รับ,คะแนนที่ได้,คะแนนเต็ม,ร้อยละ,สถานะ,เวลาที่ส่ง\n';

    const sorted = [...players].sort((a, b) => (b.percent || 0) - (a.percent || 0));
    sorted.forEach((p, idx) => {
        csv += `"${idx + 1}","${p.name}","${p.room || ''}","${p.assignedVariantName || ''}","${p.score || 0}","${p.total || 0}","${p.percent || 0}%","${p.isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}","${p.submittedAt || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `LiveExam_PIN_${roomCode}_${currentQuiz.title}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

let isLobbyCleanedUp = false;

/**
 * 🎧 ดักฟังเหตุการณ์ระบบ: กดย้อนกลับ (Back), ปิดแท็บ (X), ปิดเบราว์เซอร์ หรือสไลด์ปิดแอปบน มือถือ / iPad / Tablet
 */
function setupLobbyLifecycleListeners() {
    // 1. ปุ่ม Back บนเบราว์เซอร์
    window.addEventListener('popstate', () => {
        deleteLobbyKeepalive();
        if (!window.location.pathname.endsWith('quiz.html')) {
            window.location.href = 'quiz.html';
        }
    });

    // 2. ปิดแท็บ (X), ปิดหน้าต่าง, หรือสไลด์แอปทิ้งใน iOS / Android
    window.addEventListener('pagehide', () => {
        deleteLobbyKeepalive();
    });

    window.addEventListener('beforeunload', () => {
        deleteLobbyKeepalive();
    });
}

/**
 * ⚡ ลบห้องสอบออกจาก Supabase และ LocalStorage แบบ KeepAlive (ทำงานสำเร็จแม้ปิดหน้าต่างทันที)
 */
function deleteLobbyKeepalive() {
    if (isLobbyCleanedUp || !roomCode) return;
    isLobbyCleanedUp = true;

    const quizId = currentQuiz?.id || lobbyData?.quiz_id;

    // 1. ส่งสัญญาณกระจายบอกเครื่องนักเรียนว่าห้องปิดแล้ว
    if (localBC) {
        try { localBC.postMessage({ type: 'ROOM_CLOSED', roomCode: roomCode }); } catch (e) {}
    }

    if (window.supabaseClient) {
        try {
            window.supabaseClient.channel(`quiz_room_${roomCode}`).send({
                type: 'broadcast',
                event: 'ROOM_CLOSED',
                payload: { roomCode: roomCode }
            }).catch(() => {});

            // ลบห้องสอบออกจากตาราง lobbies
            window.supabaseClient
                .from('lobbies')
                .delete()
                .eq('room_code', roomCode)
                .then(() => {})
                .catch(() => {});

            // 🧹 ลบประวัติคำตอบและคะแนนใน gyver_quiz_responses อัตโนมัติ (Clean เกลี้ยงทุกรอบ)
            if (quizId) {
                window.supabaseClient
                    .from('gyver_quiz_responses')
                    .delete()
                    .eq('quiz_id', quizId)
                    .then(() => {})
                    .catch(() => {});
            }
        } catch (e) {}
    }

    // 2. ลบข้อมูลจาก LocalStorage
    try {
        localStorage.removeItem(`gyver_lobby_${roomCode}`);
        if (quizId) {
            localStorage.removeItem(`gyver_quiz_responses_${quizId}`);
        }
    } catch (e) {}

    // 3. เคลียร์ตัวนับเวลา
    if (pollTimerInterval) clearInterval(pollTimerInterval);
    if (examTimerInterval) clearInterval(examTimerInterval);

    // 4. ส่ง HTTP DELETE ไปที่ Supabase REST API พร้อม keepalive: true และ schema headers
    try {
        const supabaseUrl = window.SUPABASE_URL || (window.supabaseClient && window.supabaseClient.supabaseUrl);
        const supabaseKey = window.SUPABASE_KEY || (window.supabaseClient && window.supabaseClient.supabaseKey);

        if (supabaseUrl && supabaseKey) {
            // Delete lobby
            const url = `${supabaseUrl}/rest/v1/lobbies?room_code=eq.${encodeURIComponent(roomCode)}`;
            fetch(url, {
                method: 'DELETE',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                    'Accept-Profile': 'public',
                    'Content-Profile': 'public'
                },
                keepalive: true
            }).catch(() => {});

            // Delete responses for this quiz
            if (quizId) {
                const respUrl = `${supabaseUrl}/rest/v1/gyver_quiz_responses?quiz_id=eq.${encodeURIComponent(quizId)}`;
                fetch(respUrl, {
                    method: 'DELETE',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                        'Accept-Profile': 'public',
                        'Content-Profile': 'public'
                    },
                    keepalive: true
                }).catch(() => {});
            }
        }
    } catch (e) {}
}

/**
 * 🗑️ ปิดห้องสอบ และลบข้อมูลห้อง (PIN) พร้อมล้างประวัติคำตอบใน Supabase ออกทั้งหมด
 */
async function confirmCloseAndDeleteLobby() {
    const quizId = currentQuiz?.id || lobbyData?.quiz_id;

    if (CyberSwal) {
        const confirm = await CyberSwal.fire({
            title: 'ยืนยันปิดห้องสอบ?',
            html: `
                <div class="text-start p-2">
                    <p class="mb-2">รหัสห้องสอบ <b>${escapeHtml(roomCode)}</b> จะถูกลบออกจากฐานข้อมูล Supabase ทันที นักเรียนจะไม่สามารถใช้รหัสนี้ได้อีก</p>
                    <div class="alert alert-danger bg-danger-subtle border border-danger-subtle text-danger small p-2 m-0 rounded-3">
                        <i class="bi bi-trash3-fill me-1"></i>
                        <b>ระบบจะล้างประวัติคำตอบและคะแนนใน Supabase (gyver_quiz_responses) ออกทั้งหมดทันที</b> เพื่อให้ชุดนี้สะอาดเกลี้ยงพร้อมสำหรับการเปิดสอบรอบใหม่
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-trash-fill me-1"></i> ปิดห้องและล้างข้อมูลทั้งหมด',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                confirmButton: 'btn btn-danger px-4 py-2 fw-bold',
                cancelButton: 'btn btn-outline-secondary px-4 py-2 text-white me-2'
            }
        });
        if (!confirm.isConfirmed) return;
    } else {
        if (!confirm(`ยืนยันปิดห้องสอบรหัส ${roomCode}? ระบบจะลบ PIN และล้างประวัติคำตอบของชุดนี้ในฐานข้อมูลออกทั้งหมด`)) return;
    }

    await closeAndDeleteLobby(true);
}

async function closeAndDeleteLobby(skipConfirm = false) {
    if (!skipConfirm) {
        return confirmCloseAndDeleteLobby();
    }

    // แสดงหน้าจอแจ้งเตือนว่ากำลังล้างข้อมูล
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'กำลังปิดห้องและล้างข้อมูล...',
            html: '<span class="text-subtle small">กำลังลบ PIN และเคลียร์ประวัติคะแนนใน Supabase...</span>',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#fff'
        });
    }

    const quizId = currentQuiz?.id || lobbyData?.quiz_id;

    // 1. รอ Supabase delete gyver_quiz_responses ให้เสร็จอย่างแน่นอน
    if (window.supabaseClient && quizId) {
        try {
            await window.supabaseClient
                .from('gyver_quiz_responses')
                .delete()
                .eq('quiz_id', quizId);
        } catch (e) {
            console.warn('Error clearing gyver_quiz_responses:', e);
        }
    }

    // 2. เคลียร์ LocalStorage
    if (quizId) {
        try {
            localStorage.removeItem(`gyver_quiz_responses_${quizId}`);
        } catch (e) {}
    }

    // 3. ปิดห้องและลบจากตาราง lobbies
    deleteLobbyKeepalive();

    // รอเล็กน้อยเพื่อให้คำสั่งทำงานเรียบร้อย
    await new Promise(r => setTimeout(r, 400));

    // Redirect กลับไปหน้า Quiz Dashboard
    window.location.href = 'quiz.html';
}

window.confirmCloseAndDeleteLobby = confirmCloseAndDeleteLobby;
window.closeAndDeleteLobby = closeAndDeleteLobby;
