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

    // Ensure 20 variants exist (Support Question Pool)
    const totalQ = (currentQuiz.questions || []).length;
    // Auto-enable pool when total questions > 20 unless explicitly turned off
    const isPool = (currentQuiz.settings?.poolEnabled === false) ? false : (totalQ > 20 || !!currentQuiz.settings?.poolEnabled);
    const poolCount = isPool 
        ? (Number(currentQuiz.settings?.poolCount) > 0 ? Math.min(Number(currentQuiz.settings.poolCount), totalQ) : Math.min(20, totalQ))
        : totalQ;

    if (!currentQuiz.variants || currentQuiz.variants.length < 20 || (currentQuiz.variants[0]?.questions?.length !== poolCount)) {
        currentQuiz.variants = autoGenerate20Variants(currentQuiz.questions, poolCount);
    }

    // Update Header UI
    const qCountBadge = isPool ? `สุ่ม ${poolCount}/${totalQ} ข้อ (20 SETS)` : `${totalQ} ข้อ (20 SETS READY)`;
    document.getElementById('lobby-quiz-title').innerHTML = `
        ${escapeHtml(currentQuiz.title)}
        <span class="badge bg-warning text-dark fs-6 font-mono"><i class="bi bi-shield-lock-fill me-1"></i>${qCountBadge}</span>
    `;
    document.getElementById('lobby-quiz-desc').textContent = isPool 
        ? `ระบบสุ่มดึงข้อสอบคนละ ${poolCount} ข้อ จากคลังทั้งหมด ${totalQ} ข้อ แจกจ่าย 1 คนต่อ 1 ชุดไม่ซ้ำกัน` 
        : (currentQuiz.description || 'สุ่มแจกจ่ายข้อสอบ 20 ชุด ไม่ซ้ำกัน 1 คนต่อ 1 ชุด');
}

function autoGenerate20Variants(baseQuestions, poolCount) {
    const variants = [];
    const count = (poolCount && poolCount > 0 && poolCount < (baseQuestions || []).length)
        ? poolCount
        : (baseQuestions || []).length;

    for (let i = 1; i <= 20; i++) {
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
                // ตรวจสอบว่าตารางยังไม่ได้สร้างใน Supabase หรือไม่
                if (error.code === 'PGRST205' || String(error.message || '').includes('lobbies') || error.code === '42P01') {
                    setMissingTableState(true);
                    return;
                }
            }
            // เชื่อมต่อสำเร็จ
            setMissingTableState(false);
        } catch (e) {
            console.warn('Lobby sync to Supabase skipped, using local fallback', e);
            setMissingTableState(true);
        }
    } else {
        if (badge) {
            badge.className = 'badge bg-warning-subtle text-warning border border-warning-subtle px-3 py-2';
            badge.innerHTML = '<i class="bi bi-hdd me-1"></i>โหมดออฟไลน์ (LocalStorage)';
        }
    }
}

function setMissingTableState(isMissing) {
    const badge = document.getElementById('connection-status-badge');
    const banner = document.getElementById('missing-table-banner');
    const btnSql = document.getElementById('btn-header-sql');

    if (isMissing) {
        if (badge) {
            badge.className = 'badge bg-danger text-white px-3 py-2 cursor-pointer shadow-sm animate-pulse';
            badge.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i>ยังไม่มีตารางใน Supabase';
        }
        if (banner) banner.classList.remove('d-none');
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

    // 2. ซิงค์ Supabase & ส่ง Broadcast แจ้งเตะนักเรียน
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
    if (!variants || variants.length < 20 || (variants[0]?.questions?.length !== poolCount)) {
        variants = autoGenerate20Variants(currentQuiz.questions, poolCount);
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
    grid.innerHTML = players.map(p => {
        const isDone = p.status === 'SUBMITTED';
        return `
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="monitor-student-card ${isDone ? 'is-submitted' : ''}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-warning text-dark font-mono">
                            <i class="bi bi-shield-fill me-1"></i>${escapeHtml(p.assignedVariantName || 'ชุดพิเศษ')}
                        </span>
                        <span class="badge bg-${isDone ? 'success' : 'secondary'}">
                            ${isDone ? 'ส่งแล้ว ✅' : 'กำลังทำข้อสอบ...'}
                        </span>
                    </div>
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div class="student-avatar" style="width: 36px; height: 36px; font-size: 0.9rem;">
                            ${escapeHtml((p.name || 'S').charAt(0).toUpperCase())}
                        </div>
                        <div class="text-truncate">
                            <div class="fw-bold text-white text-truncate">${escapeHtml(p.name)}</div>
                            <div class="small text-subtle">${escapeHtml(p.room || '-')}</div>
                        </div>
                    </div>
                    ${isDone ? `
                        <div class="d-flex justify-content-between align-items-center pt-2 border-top border-secondary">
                            <span class="small text-subtle">คะแนนที่ได้:</span>
                            <span class="fw-bold fs-5 text-quiz font-mono">${p.score} / ${p.total} (${p.percent}%)</span>
                        </div>
                    ` : `
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated bg-warning" style="width: 60%"></div>
                        </div>
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

    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('lobbies').update({
                status: 'FINISHED'
            }).eq('room_code', roomCode);
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
