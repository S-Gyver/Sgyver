/**
 * ====================================================
 * 🎯 Gyver Quiz - Student Live Exam Controller
 * ====================================================
 */

// State
let roomPin = '';
let studentProfile = {
    id: '',
    name: '',
    room: ''
};

let currentLobby = null;
let assignedVariant = null; // { variantName, questions }
let studentAnswers = {};
let studentExamResult = null;

let pollInterval = null;
let examTimerInterval = null;
let remainingExamSeconds = 0;
let lastFetchError = null;
let isExamSubmitted = false;
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

// 💾 Session Persistence & Auto-Resume on Refresh
const STUDENT_SESSION_KEY = 'gyver_active_student_session';

function saveStudentSession(extraData = {}) {
    if (!roomPin || !studentProfile || !studentProfile.name) return;
    const session = {
        roomPin: roomPin,
        studentProfile: studentProfile,
        currentLobby: currentLobby,
        assignedVariant: assignedVariant,
        studentAnswers: studentAnswers,
        examEndTime: window.examEndTimeTimestamp || null,
        activeView: getActiveStudentViewId(),
        studentExamResult: studentExamResult || null,
        isExamSubmitted: isExamSubmitted,
        updatedAt: Date.now(),
        ...extraData
    };
    try {
        localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
    } catch (e) {}
}

function getActiveStudentViewId() {
    const examView = document.getElementById('view-student-exam');
    const waitingView = document.getElementById('view-student-waiting');
    const resultView = document.getElementById('view-student-result');

    if (examView && !examView.classList.contains('d-none')) return 'exam';
    if (waitingView && !waitingView.classList.contains('d-none')) return 'waiting';
    if (resultView && !resultView.classList.contains('d-none')) return 'result';
    return 'join';
}

function clearStudentSession() {
    try {
        localStorage.removeItem(STUDENT_SESSION_KEY);
    } catch (e) {}
}

async function restoreStudentSession() {
    try {
        const raw = localStorage.getItem(STUDENT_SESSION_KEY);
        if (!raw) return;
        const session = JSON.parse(raw);

        if (!session || !session.roomPin || !session.studentProfile?.name) return;

        if (roomPin && String(roomPin) !== String(session.roomPin)) {
            return;
        }
        roomPin = String(session.roomPin);

        studentProfile = session.studentProfile;
        currentLobby = session.currentLobby;
        assignedVariant = session.assignedVariant;
        studentAnswers = session.studentAnswers || {};
        studentExamResult = session.studentExamResult || null;
        isExamSubmitted = session.isExamSubmitted || false;
        window.examEndTimeTimestamp = session.examEndTime || null;

        const pinInput = document.getElementById('join-pin-input');
        const nameInput = document.getElementById('join-name-input');
        const roomInput = document.getElementById('join-room-input');
        if (pinInput) pinInput.value = roomPin;
        if (nameInput) nameInput.value = studentProfile.name;
        if (roomInput) roomInput.value = studentProfile.room || '';

        const freshLobby = await fetchLobbyData(roomPin);
        if (freshLobby) {
            currentLobby = freshLobby;
        }

        // 🛡️ ตรวจสอบว่าเคยส่งข้อสอบแล้วหรือไม่ (จาก LocalStorage ถาวร หรือใน Lobby Data)
        const savedSubmitted = localStorage.getItem(`gyver_submitted_${roomPin}_${studentProfile.name}`);
        if (savedSubmitted && !studentExamResult) {
            try {
                studentExamResult = JSON.parse(savedSubmitted);
            } catch (e) {}
        }

        const myEntry = (freshLobby?.players || []).find(p => p.name && p.name.trim().toLowerCase() === studentProfile.name.trim().toLowerCase());
        if (session.isExamSubmitted || savedSubmitted || studentExamResult || (myEntry && myEntry.status === 'SUBMITTED')) {
            isExamSubmitted = true;
            if (!studentExamResult && myEntry) {
                studentExamResult = {
                    studentName: myEntry.name,
                    studentRoom: myEntry.room,
                    assignedVariantName: myEntry.assignedVariantName || 'ชุดข้อสอบ',
                    quizTitle: freshLobby?.quiz_title || 'แบบทดสอบ',
                    score: myEntry.score || 0,
                    total: myEntry.total || 20,
                    percent: myEntry.percent || Math.round(((myEntry.score || 0) / (myEntry.total || 20)) * 100),
                    isPassed: myEntry.isPassed ?? false,
                    submittedAt: myEntry.submittedAt || new Date().toISOString(),
                    questionResults: myEntry.answers || []
                };
            }
            session.activeView = 'result';
        }

        if (session.activeView === 'result' || isExamSubmitted) {
            document.getElementById('view-student-join')?.classList.add('d-none');
            document.getElementById('view-student-waiting')?.classList.add('d-none');
            document.getElementById('view-student-exam')?.classList.add('d-none');
            document.getElementById('view-student-result')?.classList.remove('d-none');

            renderStudentResultUI();

        } else if (session.activeView === 'exam' && assignedVariant && assignedVariant.questions) {
            document.getElementById('view-student-join')?.classList.add('d-none');
            document.getElementById('view-student-waiting')?.classList.add('d-none');
            document.getElementById('view-student-result')?.classList.add('d-none');
            document.getElementById('view-student-exam')?.classList.remove('d-none');

            document.getElementById('exam-variant-badge').innerHTML = `<i class="bi bi-shield-lock-fill me-1"></i>${escapeHtml(assignedVariant.variantName)} (เฉพาะตัวคุณ)`;
            document.getElementById('exam-student-label').textContent = `${studentProfile.name} ${studentProfile.room ? `(${studentProfile.room})` : ''}`;

            renderLiveQuestions();
            startStudentExamTimer();
            listenForExamStart();

        } else if (session.activeView === 'waiting') {
            document.getElementById('view-student-join')?.classList.add('d-none');
            document.getElementById('view-student-exam')?.classList.add('d-none');
            document.getElementById('view-student-result')?.classList.add('d-none');
            document.getElementById('view-student-waiting')?.classList.remove('d-none');
            document.getElementById('waiting-student-name').textContent = `ผู้เข้าสอบ: ${studentProfile.name} ${studentProfile.room ? `(${studentProfile.room})` : ''}`;

            listenForExamStart();
        }
    } catch (e) {
        console.warn('Failed to restore student session:', e);
    }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    parseUrlParams();
    setupNavigationListeners();
    restoreStudentSession();
});

function setupNavigationListeners() {
    // ดักการกดย้อนกลับบนเบราว์เซอร์
    window.addEventListener('popstate', () => {
        const resultView = document.getElementById('view-student-result');
        if (resultView && !resultView.classList.contains('d-none')) {
            // 🛡️ อยู่หน้าผลสอบแล้ว ห้ามถอยกลับไปหน้าข้อสอบเด็ดขาด
            history.pushState({ inResult: true }, '', window.location.href);
            return;
        }

        const waitingView = document.getElementById('view-student-waiting');
        if (waitingView && !waitingView.classList.contains('d-none')) {
            leaveLobby();
            clearStudentSession();
            waitingView.classList.add('d-none');
            document.getElementById('view-student-join')?.classList.remove('d-none');
        }
    });

    // ดักการรีเฟรช/ปิดหน้าต่างขณะกำลังสอบเพื่อบันทึกเซสชัน
    window.addEventListener('beforeunload', (e) => {
        const examView = document.getElementById('view-student-exam');
        const isExamActive = examView && !examView.classList.contains('d-none');
        if (isExamActive) {
            saveStudentSession();
            e.preventDefault();
            e.returnValue = 'คุณกำลังทำข้อสอบอยู่ ข้อมูลและคำตอบของคุณจะถูกบันทึกไว้อัตโนมัติ';
            return e.returnValue;
        }

        const waitingView = document.getElementById('view-student-waiting');
        if (waitingView && !waitingView.classList.contains('d-none')) {
            saveStudentSession();
        }
    });
}

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const pin = params.get('pin') || params.get('room');

    if (pin) {
        roomPin = pin.trim();
        const pinInput = document.getElementById('join-pin-input');
        const badge = document.getElementById('student-pin-badge');
        if (pinInput) {
            pinInput.value = roomPin;
            pinInput.readOnly = true;
        }
        if (badge) badge.textContent = `PIN: ${roomPin}`;

        const nameInput = document.getElementById('join-name-input');
        if (nameInput) nameInput.focus();
    }
}

/**
 * 🚪 เข้าร่วมห้องสอบ
 */
async function joinLiveLobby() {
    const pinInput = document.getElementById('join-pin-input');
    const nameInput = document.getElementById('join-name-input');
    const roomInput = document.getElementById('join-room-input');

    const pin = pinInput ? pinInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const room = roomInput ? roomInput.value.trim() : '';

    if (!pin) {
        CyberSwal?.fire({ icon: 'warning', title: 'กรุณากรอกรหัส PIN', text: 'โปรดกรอกรหัส PIN 4 หลักเพื่อเข้าห้องสอบ' });
        return;
    }
    if (!name) {
        CyberSwal?.fire({ icon: 'warning', title: 'กรุณากรอกชื่อ', text: 'โปรดระบุชื่อ - นามสกุล หรือชื่อเล่นของผู้เข้าสอบ' });
        return;
    }

    roomPin = pin;
    studentProfile = {
        id: 'std_' + Math.random().toString(36).substr(2, 8),
        name: name,
        room: room
    };

    // Verify lobby exists
    const lobby = await fetchLobbyData(roomPin);
    if (!lobby) {
        const errStr = String(lastFetchError?.message || lastFetchError || '');
        const isTableMissing = lastFetchError && (lastFetchError.code === 'PGRST205' || errStr.includes('lobbies') || lastFetchError.code === '42P01');
        const isNetworkOrPaused = errStr.includes('Failed to fetch') || errStr.includes('NetworkError') || errStr.includes('CONNECTION_RESET') || errStr.includes('PROTOCOL_ERROR');

        if (isTableMissing) {
            CyberSwal?.fire({
                icon: 'warning',
                title: 'ยังไม่ได้สร้างตารางในฐานข้อมูล',
                html: `ระบบตรวจพบว่ายังไม่มีตาราง <code>lobbies</code> ในฐานข้อมูล Supabase<br><br><span class="text-warning">โปรดแจ้งคุณครูผู้คุมสอบให้เปิดหน้าจอคุมสอบ แล้วกดปุ่ม <b>"ตั้งค่า SQL"</b> เพื่อรันคำสั่งติดตั้งตารางใน Supabase ก่อนครับ</span>`,
                confirmButtonText: 'รับทราบ'
            });
        } else if (isNetworkOrPaused) {
            CyberSwal?.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อ Supabase ได้',
                html: `ระบบไม่สามารถติดต่อฐานข้อมูล Supabase ได้ (<code>Failed to fetch / Connection Reset</code>)<br><br>
                <div class="text-start p-3 rounded bg-dark border border-secondary small text-light">
                    <p class="mb-2 text-warning fw-bold"><i class="bi bi-exclamation-triangle-fill me-1"></i> สาเหตุที่พบบ่อย:</p>
                    <ol class="mb-0 ps-3">
                        <li class="mb-1"><b>โปรเจกต์ Supabase ถูกพัก (Paused):</b> หากไม่มีการใช้งานเกิน 7 วัน Supabase จะพักการทำงานชั่วคราว ให้เปิด <a href="https://supabase.com/dashboard" target="_blank" class="text-info fw-bold text-decoration-underline">Supabase Dashboard</a> แล้วกด <b>"Restore Project"</b></li>
                        <li><b>เน็ตโรงเรียนหรือเครือข่ายบล็อก:</b> ตรวจสอบสัญญาณอินเทอร์เน็ต</li>
                    </ol>
                </div>`,
                confirmButtonText: 'รับทราบ'
            });
        } else {
            CyberSwal?.fire({
                icon: 'error',
                title: 'ไม่พบห้องสอบ',
                text: `ไม่พบห้องสอบรหัส PIN: ${roomPin} หรือห้องสอบอาจถูกปิดไปแล้ว (โปรดตรวจสอบรหัส PIN ให้ถูกต้อง)`
            });
        }
        return;
    }

    if (lobby.status === 'FINISHED') {
        CyberSwal?.fire({
            icon: 'info',
            title: 'การสอบเสร็จสิ้นแล้ว',
            text: 'ห้องสอบนี้สิ้นสุดเวลาสอบแล้ว ไม่สามารถเข้าร่วมได้'
        });
        return;
    }

    currentLobby = lobby;

    // 🛡️ ตรวจสอบว่านักเรียนคนนี้เคยส่งข้อสอบในห้องนี้ไปแล้วหรือไม่ (Anti-Retake Protection)
    const submittedStorageKey = `gyver_submitted_${roomPin}_${name}`;
    const savedSubmissionRaw = localStorage.getItem(submittedStorageKey);
    const existingSubmittedPlayer = (currentLobby.players || []).find(p => 
        p.name && p.name.trim().toLowerCase() === name.trim().toLowerCase() && 
        (room ? (p.room === room) : true) && 
        p.status === 'SUBMITTED'
    );

    if (savedSubmissionRaw || existingSubmittedPlayer) {
        isExamSubmitted = true;
        studentProfile = {
            id: existingSubmittedPlayer?.id || 'std_' + Math.random().toString(36).substr(2, 8),
            name: name,
            room: room
        };

        if (savedSubmissionRaw) {
            try {
                studentExamResult = JSON.parse(savedSubmissionRaw);
            } catch (e) {}
        }
        if (!studentExamResult && existingSubmittedPlayer) {
            studentExamResult = {
                studentName: existingSubmittedPlayer.name,
                studentRoom: existingSubmittedPlayer.room,
                assignedVariantName: existingSubmittedPlayer.assignedVariantName || 'ชุดข้อสอบ',
                quizTitle: currentLobby.quiz_title || 'แบบทดสอบ',
                score: existingSubmittedPlayer.score || 0,
                total: existingSubmittedPlayer.total || 20,
                percent: existingSubmittedPlayer.percent || Math.round(((existingSubmittedPlayer.score || 0) / (existingSubmittedPlayer.total || 20)) * 100),
                isPassed: existingSubmittedPlayer.isPassed ?? false,
                submittedAt: existingSubmittedPlayer.submittedAt || new Date().toISOString(),
                questionResults: existingSubmittedPlayer.answers || []
            };
        }

        saveStudentSession({ activeView: 'result' });

        await CyberSwal?.fire({
            icon: 'info',
            title: 'คุณได้ส่งข้อสอบแล้ว',
            html: `ผู้เข้าสอบ <b>${escapeHtml(name)}</b> ได้ทำการส่งข้อสอบชุดนี้เรียบร้อยแล้ว<br>คะแนนของคุณคือ <b class="text-quiz fs-5">${studentExamResult ? studentExamResult.score : existingSubmittedPlayer.score} / ${studentExamResult ? studentExamResult.total : (existingSubmittedPlayer.total || 20)}</b> คะแนน<br><br><span class="text-warning small"><i class="bi bi-shield-lock-fill me-1"></i> ระบบไม่อนุญาตให้ทำข้อสอบซ้ำหรือแก้ไขคะแนน</span>`,
            confirmButtonText: '<i class="bi bi-card-checklist me-1"></i> ดูผลคะแนนของคุณ'
        });

        document.getElementById('view-student-join')?.classList.add('d-none');
        document.getElementById('view-student-waiting')?.classList.add('d-none');
        document.getElementById('view-student-exam')?.classList.add('d-none');
        document.getElementById('view-student-result')?.classList.remove('d-none');
        renderStudentResultUI();
        return;
    }

    // Register student to players list
    if (!currentLobby.players) currentLobby.players = [];
    const exists = currentLobby.players.find(p => p.name === studentProfile.name && p.room === studentProfile.room);
    if (!exists) {
        currentLobby.players.push({
            id: studentProfile.id,
            name: studentProfile.name,
            room: studentProfile.room,
            status: 'WAITING'
        });

        saveLocalLobby(currentLobby);

        // Send local broadcast to teacher tab
        if (localBC) {
            localBC.postMessage({
                type: 'STUDENT_JOIN',
                roomCode: roomPin,
                student: studentProfile
            });
        }

        // Sync to Supabase
        if (window.supabaseClient) {
            try {
                await window.supabaseClient
                    .from('lobbies')
                    .update({ players: currentLobby.players })
                    .eq('room_code', roomPin);

                // Broadcast join event
                await window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`).send({
                    type: 'broadcast',
                    event: 'student_joined',
                    payload: studentProfile
                });
            } catch (e) {}
        }
    }

    // Switch to Waiting Screen
    document.getElementById('view-student-join').classList.add('d-none');
    document.getElementById('view-student-waiting').classList.remove('d-none');
    document.getElementById('waiting-student-name').textContent = `ผู้เข้าสอบ: ${name} ${room ? `(${room})` : ''}`;

    try {
        history.pushState({ waitingInRoom: true, pin: roomPin }, '');
    } catch (e) {}

    listenForExamStart();
}

/**
 * 📡 ฟังและรอสัญญาณเมื่อครูกด "เริ่มสอบ"
 */
function listenForExamStart() {
    // 0. Local BroadcastChannel for instant local / offline sync
    if (localBC) {
        localBC.addEventListener('message', (event) => {
            const msg = event?.data;
            if (!msg || String(msg.roomCode) !== String(roomPin)) return;
            if (msg.type === 'START_EXAM') {
                checkAndLaunchExam(msg.lobby);
            } else if (msg.type === 'EXAM_FINISHED') {
                if (currentLobby) currentLobby.status = 'FINISHED';
                const resultView = document.getElementById('view-student-result');
                if (resultView && !resultView.classList.contains('d-none')) {
                    renderStudentResultUI();
                }
            } else if (msg.type === 'ROOM_CLOSED') {
                handleRoomClosed();
            } else if (msg.type === 'KICK_STUDENT') {
                if (msg.studentName === studentProfile.name || (studentProfile.id && msg.id === studentProfile.id)) {
                    handleStudentKicked();
                }
            } else if (msg.type === 'TEACHER_UNLOCK_STUDENT') {
                if (msg.studentName === studentProfile.name) {
                    handleRemoteUnlockByTeacher();
                }
            } else if (msg.type === 'LOBBY_STATE' && msg.data) {
                if (msg.data.status === 'RUNNING') {
                    checkAndLaunchExam(msg.data);
                } else if (msg.data.status === 'FINISHED') {
                    if (currentLobby) currentLobby.status = 'FINISHED';
                    const resultView = document.getElementById('view-student-result');
                    if (resultView && !resultView.classList.contains('d-none')) {
                        renderStudentResultUI();
                    }
                } else if (msg.data.status === 'WAITING') {
                    const players = msg.data.players || [];
                    const stillIn = players.some(p => p.name === studentProfile.name);
                    if (!stillIn) {
                        handleStudentKicked();
                    }
                }
            }
        });
    }

    // 1. Supabase Realtime Channel
    if (window.supabaseClient) {
        try {
            window.supabaseClient.channel(`quiz_room_${roomPin}`)
                .on('broadcast', { event: 'START_EXAM' }, async () => {
                    checkAndLaunchExam();
                })
                .on('broadcast', { event: 'ROOM_CLOSED' }, () => {
                    handleRoomClosed();
                })
                .on('broadcast', { event: 'KICK_STUDENT' }, (payload) => {
                    const data = payload?.payload || payload;
                    if (data && (data.studentName === studentProfile.name || (studentProfile.id && data.id === studentProfile.id))) {
                        handleStudentKicked();
                    }
                })
                .subscribe();

            window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`)
                .on('broadcast', { event: 'exam_finished' }, () => {
                    if (currentLobby) currentLobby.status = 'FINISHED';
                    const resultView = document.getElementById('view-student-result');
                    if (resultView && !resultView.classList.contains('d-none')) {
                        renderStudentResultUI();
                    }
                })
                .on('broadcast', { event: 'teacher_unlock_student' }, (payload) => {
                    const data = payload?.payload || payload;
                    if (data && data.studentName === studentProfile.name) {
                        handleRemoteUnlockByTeacher();
                    }
                })
                .subscribe();

            window.supabaseClient.channel(`student_waiting_${roomPin}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'lobbies',
                    filter: `room_code=eq.${roomPin}`
                }, (payload) => {
                    if (payload.eventType === 'DELETE') {
                        handleRoomClosed();
                    } else if (payload.new) {
                        if (payload.new.status === 'RUNNING') {
                            checkAndLaunchExam(payload.new);
                        } else if (payload.new.status === 'FINISHED') {
                            if (currentLobby) currentLobby.status = 'FINISHED';
                            const resultView = document.getElementById('view-student-result');
                            if (resultView && !resultView.classList.contains('d-none')) {
                                renderStudentResultUI();
                            }
                        } else if (payload.new.status === 'WAITING') {
                            const players = payload.new.players || [];
                            const stillIn = players.some(p => p.name === studentProfile.name);
                            if (!stillIn) {
                                handleStudentKicked();
                            }
                        }
                    }
                })
                .subscribe();
        } catch (e) {}
    }

    // 2. Fallback Polling every 1.5 seconds
    pollInterval = setInterval(async () => {
        const lobby = await fetchLobbyData(roomPin);
        if (!lobby) {
            handleRoomClosed();
            return;
        }

        if (lobby.status === 'RUNNING') {
            checkAndLaunchExam(lobby);
        } else if (lobby.status === 'FINISHED') {
            if (currentLobby) currentLobby.status = 'FINISHED';
            const resultView = document.getElementById('view-student-result');
            if (resultView && !resultView.classList.contains('d-none')) {
                renderStudentResultUI();
            }
        } else if (lobby.status === 'WAITING') {
            const players = lobby.players || [];
            const stillIn = players.some(p => p.name === studentProfile.name);
            if (!stillIn) {
                handleStudentKicked();
            }
        }
    }, 1500);
}

/**
 * ⚠️ เมื่อห้องสอบถูกปิดหรือถูกลบโดยคุณครู
 */
function handleRoomClosed() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    // 🛡️ หากนักเรียนส่งข้อสอบแล้วและกำลังดูผลสอบ ให้คงหน้าผลสอบและเปิดเฉลยทันที
    const resultView = document.getElementById('view-student-result');
    if (resultView && !resultView.classList.contains('d-none')) {
        if (currentLobby) currentLobby.status = 'FINISHED';
        renderStudentResultUI();
        return;
    }

    clearStudentSession();

    // Reset view to Join screen
    document.getElementById('view-student-waiting')?.classList.add('d-none');
    document.getElementById('view-student-exam')?.classList.add('d-none');
    document.getElementById('view-student-result')?.classList.add('d-none');
    document.getElementById('view-student-join')?.classList.remove('d-none');

    const pinInput = document.getElementById('join-pin-input');
    if (pinInput) pinInput.readOnly = false;

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'info',
            title: 'ห้องสอบถูกปิดแล้ว',
            text: 'คุณครูได้ทำการปิดห้องสอบและลบรหัส PIN นี้เรียบร้อยแล้ว',
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#f8fafc',
            confirmButtonText: 'รับทราบ',
            customClass: {
                confirmButton: 'btn btn-quiz-glow px-4 py-2 fw-bold text-white'
            },
            buttonsStyling: false
        });
    } else {
        alert('ห้องสอบถูกปิดและลบรหัส PIN แล้วโดยคุณครู');
    }
}

/**
 * ⚠️ เมื่อนักเรียนถูกครูเตะออกจากห้องสอบ
 */
function handleStudentKicked() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    // สลับกลับหน้า Join
    document.getElementById('view-student-waiting')?.classList.add('d-none');
    document.getElementById('view-student-join')?.classList.remove('d-none');

    // แจ้งเตือนนักเรียน
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'warning',
            title: 'คุณถูกเชิญออกจากห้อง',
            text: 'คุณครูได้เชิญคุณออกจากห้องสอบนี้ หากมีข้อผิดพลาดกรุณาเข้าห้องใหม่อีกครั้ง',
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#f8fafc',
            confirmButtonText: 'เข้าใจแล้ว',
            customClass: {
                confirmButton: 'btn btn-quiz-glow px-4 py-2 fw-bold text-white'
            },
            buttonsStyling: false
        });
    } else {
        alert('คุณถูกเชิญออกจากห้องสอบโดยคุณครู');
    }
}

/**
 * 🚪 นำนักเรียนออกจาก Lobby เมื่อกดย้อนกลับ, ปิดแท็บ หรือกดปุ่มออกจากห้อง
 */
function leaveLobby() {
    const waitingView = document.getElementById('view-student-waiting');
    const isWaiting = waitingView && !waitingView.classList.contains('d-none');
    if (!isWaiting) return; // ทำงานเฉพาะเมื่อกำลังอยู่ในหน้ารอสอบเท่านั้น

    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    if (!roomPin || !studentProfile.name) return;

    // 0. ส่งสัญญาณ Local Broadcast ให้แท็บครูทันที
    if (localBC) {
        localBC.postMessage({
            type: 'STUDENT_LEAVE',
            roomCode: roomPin,
            student: {
                id: studentProfile.id,
                name: studentProfile.name,
                room: studentProfile.room,
                roomCode: roomPin
            }
        });
    }

    // 1. ส่งสัญญาณ broadcast แจ้งเครื่องครูทันที
    if (window.supabaseClient) {
        try {
            window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`).send({
                type: 'broadcast',
                event: 'student_left',
                payload: {
                    id: studentProfile.id,
                    name: studentProfile.name,
                    room: studentProfile.room,
                    roomCode: roomPin
                }
            });
        } catch (e) {}
    }

    // 2. ปรับปรุงข้อมูลในฐานข้อมูล Supabase ทันที (หากยังอยู่ในสถานะ WAITING)
    if (window.supabaseClient && currentLobby && currentLobby.players) {
        try {
            const remaining = currentLobby.players.filter(p => 
                (studentProfile.id ? p.id !== studentProfile.id : true) && p.name !== studentProfile.name
            );
            window.supabaseClient
                .from('lobbies')
                .update({ players: remaining })
                .eq('room_code', roomPin)
                .then(() => {})
                .catch(() => {});
        } catch (e) {}
    }

    // 3. รองรับกรณีปิดเบราว์เซอร์หรือปิดแท็บด้วย fetch keepalive (เบราว์เซอร์จะส่งสำเร็จแม้หน้าต่างจะปิดไปแล้ว)
    try {
        const supabaseUrl = window.SUPABASE_URL || (window.supabaseClient && window.supabaseClient.supabaseUrl);
        const supabaseKey = window.SUPABASE_KEY || (window.supabaseClient && window.supabaseClient.supabaseKey);
        if (supabaseUrl && supabaseKey && currentLobby && currentLobby.players) {
            const remaining = currentLobby.players.filter(p => 
                (studentProfile.id ? p.id !== studentProfile.id : true) && p.name !== studentProfile.name
            );
            fetch(`${supabaseUrl}/rest/v1/lobbies?room_code=eq.${encodeURIComponent(roomPin)}&status=eq.WAITING`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                    'Accept-Profile': 'public',
                    'Content-Profile': 'public'
                },
                body: JSON.stringify({ players: remaining }),
                keepalive: true
            }).catch(() => {});
        }
    } catch (e) {}
}

async function confirmLeaveLobby() {
    if (typeof Swal !== 'undefined') {
        const res = await Swal.fire({
            title: 'ออกจากห้องรอสอบ?',
            text: 'คุณจะออกจากรายชื่อในห้องนี้ และสามารถกลับเข้ามาใหม่ได้ตลอดก่อนครูเริ่มสอบ',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ออกจากห้อง',
            cancelButtonText: 'อยู่ในห้องต่อ',
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#f8fafc',
            customClass: {
                confirmButton: 'btn btn-outline-danger px-4 py-2 me-2',
                cancelButton: 'btn btn-secondary px-4 py-2'
            },
            buttonsStyling: false
        });
        if (!res.isConfirmed) return;
    }

    leaveLobby();
    clearStudentSession();
    document.getElementById('view-student-waiting')?.classList.add('d-none');
    document.getElementById('view-student-join')?.classList.remove('d-none');
}

window.leaveLobby = leaveLobby;
window.confirmLeaveLobby = confirmLeaveLobby;

async function checkAndLaunchExam(freshLobby) {
    const lobby = freshLobby || (await fetchLobbyData(roomPin));
    if (!lobby || lobby.status !== 'RUNNING') return;

    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    currentLobby = lobby;

    // 🛡️ หากส่งข้อสอบแล้ว ห้ามเปิดหน้าข้อสอบเด็ดขาด ให้แสดงหน้าผลสอบ
    const meCheck = (currentLobby.players || []).find(p => p.name && p.name.trim().toLowerCase() === studentProfile.name.trim().toLowerCase());
    if (isExamSubmitted || (meCheck && meCheck.status === 'SUBMITTED')) {
        isExamSubmitted = true;
        document.getElementById('view-student-join')?.classList.add('d-none');
        document.getElementById('view-student-waiting')?.classList.add('d-none');
        document.getElementById('view-student-exam')?.classList.add('d-none');
        document.getElementById('view-student-result')?.classList.remove('d-none');
        if (studentExamResult) renderStudentResultUI();
        return;
    }

    // Find my assigned variant!
    const me = (currentLobby.players || []).find(p => p.name === studentProfile.name);
    if (!me || !me.variantQuestions || me.variantQuestions.length === 0) {
        // Fallback to variant 1 if not specifically tagged
        const variants = currentLobby.quiz_variants || [];
        assignedVariant = variants[0] || {
            variantName: 'ชุดทั่วไป',
            questions: currentLobby.quiz_questions || []
        };
    } else {
        assignedVariant = {
            variantName: me.assignedVariantName || `ชุดที่ ${me.assignedVariantIndex || 1}`,
            questions: me.variantQuestions
        };
    }

    // Safety Guarantee: If questions in variant > 20, clamp to pool count (default 20)
    let questions = assignedVariant.questions || [];
    const poolLimit = (currentLobby.quiz_settings?.poolCount && Number(currentLobby.quiz_settings.poolCount) > 0)
        ? Number(currentLobby.quiz_settings.poolCount)
        : 20;
    if (questions.length > poolLimit) {
        questions = questions.slice(0, poolLimit);
        questions.forEach((q, idx) => {
            q.title = q.title.replace(/^ข้อที่\s*\d+[:.]?\s*/, `ข้อที่ ${idx + 1}: `);
        });
        assignedVariant.questions = questions;
    }

    // Launch Student Exam Screen
    document.getElementById('view-student-waiting').classList.add('d-none');
    document.getElementById('view-student-exam').classList.remove('d-none');

    document.getElementById('exam-variant-badge').innerHTML = `<i class="bi bi-shield-lock-fill me-1"></i>${escapeHtml(assignedVariant.variantName)} (เฉพาะตัวคุณ)`;
    document.getElementById('exam-student-label').textContent = `${studentProfile.name} ${studentProfile.room ? `(${studentProfile.room})` : ''}`;

    // 📈 Record exam start time + total questions for teacher progress tracking
    const totalQ = assignedVariant.questions?.length || 0;
    const nowIso = new Date().toISOString();
    const localLobby = getLocalLobby(roomPin);
    if (localLobby && Array.isArray(localLobby.players)) {
        const myEntry = localLobby.players.find(x => x.name === studentProfile.name);
        if (myEntry) {
            myEntry.startedAt = nowIso;
            myEntry.totalQuestions = totalQ;
            myEntry.answeredCount = 0;
            myEntry.status = 'RUNNING';
        }
        saveLocalLobby(localLobby);
        // Local tab broadcast
        if (localBC) {
            localBC.postMessage({
                type: 'STUDENT_PROGRESS',
                roomCode: roomPin,
                studentName: studentProfile.name,
                answeredCount: 0,
                totalQuestions: totalQ,
                startedAt: nowIso
            });
        }
        // 🌐 Cross-device: broadcast via Supabase Realtime
        if (window.supabaseClient) {
            try {
                await window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`).send({
                    type: 'broadcast',
                    event: 'student_progress',
                    payload: {
                        studentName: studentProfile.name,
                        answeredCount: 0,
                        totalQuestions: totalQ,
                        startedAt: nowIso
                    }
                });
            } catch (e) {}
        }
    }

    saveStudentSession({ activeView: 'exam' });
    renderLiveQuestions();
    startStudentExamTimer();

    // 🛡️ Activate Anti-Cheat Lockdown Shield
    const quizSettings = currentLobby?.quiz_settings || currentLobby?.settings || {};
    const isLockdown = (quizSettings.lockdownEnabled !== false);
    const teacherPin = quizSettings.teacherPin || '9999';
    if (isLockdown) {
        startStudentExamLockdown(teacherPin);
    }
}

/**
 * 📝 Render คำถามชุดเฉพาะตัว
 */
function renderLiveQuestions() {
    const container = document.getElementById('exam-questions-container');
    if (!container || !assignedVariant) return;
    container.innerHTML = '';

    const questions = assignedVariant.questions || [];

    questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'cyber-card mb-4 border-quiz';
        card.id = `exam-q-card-${q.id}`;

        const isMultiline = (q.options || []).some(opt => (opt || '').includes('\n') || (opt || '').length > 35);
        const colClass = isMultiline ? 'col-12' : 'col-12 col-md-6';
        const currentAns = studentAnswers[q.id];

        let choicesHtml = '';
        if (q.type === 'radio') {
            choicesHtml = `
                <div class="row g-2 mt-2">
                    ${(q.options || []).map((opt, oIdx) => {
                        const isSelected = (currentAns === opt);
                        return `
                        <div class="${colClass}">
                            <div class="quiz-choice-card ${isSelected ? 'selected' : ''}" onclick="selectStudentRadioByIdx('${q.id}', ${oIdx}, this)">
                                <div class="d-flex align-items-start gap-2">
                                    <span class="badge bg-dark border border-secondary text-white mt-1">${String.fromCharCode(65 + oIdx)}</span>
                                    <div class="quiz-choice-text text-white flex-grow-1">${escapeHtml(opt)}</div>
                                </div>
                            </div>
                        </div>
                    `;}).join('')}
                </div>
            `;
        } else if (q.type === 'checkbox') {
            choicesHtml = `
                <div class="row g-2 mt-2">
                    ${(q.options || []).map((opt, oIdx) => {
                        const isSelected = Array.isArray(currentAns) && currentAns.includes(opt);
                        return `
                        <div class="${colClass}">
                            <div class="quiz-choice-card ${isSelected ? 'selected' : ''}" onclick="toggleStudentCheckboxByIdx('${q.id}', ${oIdx}, this)">
                                <div class="d-flex align-items-start gap-2">
                                    <span class="badge bg-dark border border-secondary text-white mt-1">${oIdx + 1}</span>
                                    <div class="quiz-choice-text text-white flex-grow-1">${escapeHtml(opt)}</div>
                                </div>
                            </div>
                        </div>
                    `;}).join('')}
                </div>
            `;
        } else if (q.type === 'text') {
            choicesHtml = `
                <div class="mt-3">
                    <textarea class="form-control form-control-cyber font-mono" rows="2" 
                        placeholder="พิมพ์คำตอบของคุณที่นี่..."
                        oninput="studentAnswers['${q.id}'] = this.value; saveStudentSession();">${escapeHtml(currentAns || '')}</textarea>
                </div>
            `;
        } else if (q.type === 'code') {
            const initialCode = currentAns || q.codeStarter || `# 🐍 เขียนโค้ด Python ที่นี่\n`;
            choicesHtml = `
                <div class="mt-3">
                    <div class="code-editor-box">
                        <div class="code-editor-header">
                            <span class="text-white small font-mono fw-bold">
                                <i class="bi bi-code-slash text-info me-1"></i>Python 3 Live Editor
                            </span>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-sm btn-outline-warning py-0 px-2" onclick="resetStudentCode('${q.id}')">
                                    <i class="bi bi-arrow-counterclockwise me-1"></i>รีเซ็ต
                                </button>
                                <button type="button" class="btn btn-sm btn-success py-0 px-3 fw-bold" onclick="runStudentPython('${q.id}')">
                                    <i class="bi bi-play-fill me-1"></i>รันโค้ด
                                </button>
                            </div>
                        </div>
                        <textarea id="student-editor-${q.id}">${escapeHtml(initialCode)}</textarea>
                    </div>

                    <div class="python-terminal-box">
                        <div class="python-terminal-header">
                            <div class="d-flex align-items-center gap-2">
                                <div class="terminal-dots">
                                    <span class="terminal-dot dot-red"></span>
                                    <span class="terminal-dot dot-yellow"></span>
                                    <span class="terminal-dot dot-green"></span>
                                </div>
                                <span class="text-white small font-mono ms-2">Terminal Output</span>
                            </div>
                            <button type="button" class="btn btn-sm btn-link text-subtle p-0 text-decoration-none" onclick="clearStudentOutput('${q.id}')">
                                <i class="bi bi-trash3 me-1"></i>ล้างหน้าจอ
                            </button>
                        </div>
                        <pre id="student-output-${q.id}" class="python-terminal-output">กดปุ่ม "รันโค้ด" เพื่อทดสอบการทำงานของโปรแกรม...</pre>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="fw-bold text-white mb-1 flex-grow-1"><span class="text-quiz me-2">ข้อ ${idx + 1}.</span>${formatQuizTitleHtml(q.title)}</div>
                <span class="badge bg-secondary text-white ms-2">${q.points || 10} คะแนน</span>
            </div>
            ${choicesHtml}
        `;

        container.appendChild(card);
    });

    // Initialize CodeMirror for Student Code questions
    setTimeout(() => {
        questions.forEach(q => {
            if (q.type === 'code') {
                const ta = document.getElementById(`student-editor-${q.id}`);
                if (ta && typeof CodeMirror !== 'undefined' && !studentCodeMirrorInstances[q.id]) {
                    const editor = CodeMirror.fromTextArea(ta, {
                        mode: 'python',
                        theme: 'dracula',
                        lineNumbers: true,
                        indentUnit: 4,
                        tabSize: 4,
                        lineWrapping: true
                    });
                    editor.on('change', () => {
                        studentAnswers[q.id] = editor.getValue();
                        saveStudentSession();
                        updateStudentAnswerProgress();
                    });
                    // Anti-Paste guard
                    editor.on('paste', (cm, e) => {
                        const quizSettings = currentLobby?.quiz_settings || currentLobby?.settings || {};
                        const antiPaste = (quizSettings.antiPaste !== false);
                        if (antiPaste) {
                            e.preventDefault();
                            if (typeof Swal !== 'undefined') {
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'ห้ามวางโค้ดจากภายนอก! ⚠️',
                                    text: 'ระบบไม่อนุญาตให้วางโค้ด เพื่อป้องกันการทุจริตและการใช้ AI กรุณาพิมพ์โค้ดด้วยตนเอง',
                                    toast: true,
                                    position: 'top-end',
                                    timer: 3500,
                                    showConfirmButton: false,
                                    background: '#1e1b4b',
                                    color: '#fff'
                                });
                            }
                        }
                    });
                    studentCodeMirrorInstances[q.id] = editor;
                }
            }
        });
    }, 50);
}

function selectStudentRadioByIdx(qId, oIdx, el) {
    const questions = assignedVariant?.questions || [];
    const q = questions.find(x => x.id === qId);
    if (!q || !q.options || oIdx >= q.options.length) return;
    selectStudentRadio(qId, q.options[oIdx], el);
}

function toggleStudentCheckboxByIdx(qId, oIdx, el) {
    const questions = assignedVariant?.questions || [];
    const q = questions.find(x => x.id === qId);
    if (!q || !q.options || oIdx >= q.options.length) return;
    toggleStudentCheckbox(qId, q.options[oIdx], el);
}

function selectStudentRadio(qId, val, el) {
    studentAnswers[qId] = val;
    const parent = document.getElementById(`exam-q-card-${qId}`);
    if (parent) {
        parent.querySelectorAll('.quiz-choice-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    }
    saveStudentSession();
    broadcastStudentProgress();
}

function toggleStudentCheckbox(qId, val, el) {
    if (!Array.isArray(studentAnswers[qId])) {
        studentAnswers[qId] = [];
    }
    const idx = studentAnswers[qId].indexOf(val);
    if (idx === -1) {
        studentAnswers[qId].push(val);
        el.classList.add('selected');
    } else {
        studentAnswers[qId].splice(idx, 1);
        el.classList.remove('selected');
    }
    saveStudentSession();
    broadcastStudentProgress();
}

/**
 * 📡 Broadcast real-time progress to teacher tab
 */
// Debounce timer for Supabase progress broadcast (avoid spamming)
let _progressBroadcastTimer = null;

function broadcastStudentProgress() {
    if (!assignedVariant) return;
    const totalQ = assignedVariant.questions?.length || 0;
    const answered = Object.keys(studentAnswers).filter(qId => {
        const v = studentAnswers[qId];
        return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;

    const payload = {
        type: 'STUDENT_PROGRESS',
        roomCode: roomPin,
        studentName: studentProfile.name,
        answeredCount: answered,
        totalQuestions: totalQ,
        startedAt: null   // already sent on exam start
    };

    // Local broadcast (same device, instant)
    if (localBC) localBC.postMessage(payload);

    // 🌐 Cross-device: Supabase Realtime broadcast (debounced 800ms to avoid spam)
    clearTimeout(_progressBroadcastTimer);
    _progressBroadcastTimer = setTimeout(() => {
        if (window.supabaseClient && roomPin) {
            try {
                window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`).send({
                    type: 'broadcast',
                    event: 'student_progress',
                    payload: {
                        studentName: studentProfile.name,
                        answeredCount: answered,
                        totalQuestions: totalQ,
                        startedAt: null
                    }
                });
            } catch (e) {}
        }
    }, 800);
}

function startStudentExamTimer() {
    const timeLimitMin = currentLobby?.quiz_settings?.timeLimit || 15;
    if (!window.examEndTimeTimestamp) {
        remainingExamSeconds = timeLimitMin * 60;
        window.examEndTimeTimestamp = Date.now() + (remainingExamSeconds * 1000);
    } else {
        remainingExamSeconds = Math.max(0, Math.floor((window.examEndTimeTimestamp - Date.now()) / 1000));
    }

    saveStudentSession({ activeView: 'exam' });
    updateStudentTimerText();

    if (examTimerInterval) clearInterval(examTimerInterval);
    examTimerInterval = setInterval(() => {
        remainingExamSeconds--;
        updateStudentTimerText();

        if (remainingExamSeconds <= 0) {
            clearInterval(examTimerInterval);
            CyberSwal?.fire({
                icon: 'info',
                title: '⏰ หมดเวลาทำข้อสอบ!',
                text: 'ระบบกำลังส่งและตรวจคำตอบของคุณอัตโนมัติ...',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                submitLiveExamAnswers();
            });
        }
    }, 1000);
}

function updateStudentTimerText() {
    const timerEl = document.getElementById('exam-timer-text');
    if (!timerEl) return;
    const mins = Math.max(0, Math.floor(remainingExamSeconds / 60));
    const secs = Math.max(0, remainingExamSeconds % 60);
    timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function confirmSubmitLiveExam() {
    const confirm = await CyberSwal?.fire({
        title: 'ยืนยันการส่งข้อสอบ?',
        text: 'คุณต้องการส่งคำตอบและตรวจผลคะแนนทันทีหรือไม่?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-send-fill me-1"></i> ส่งข้อสอบเลย',
        cancelButtonText: 'กลับไปตรวจทาน'
    });

    if (confirm && confirm.isConfirmed) {
        submitLiveExamAnswers();
    }
}

/**
 * 📤 ตรวจคำตอบ & ส่งผลคะแนนเข้าห้องสอบ Live
 */
async function submitLiveExamAnswers() {
    if (isExamSubmitted) return;
    isExamSubmitted = true;

    // 🔒 ล็อกปุ่มส่งและอินพุตทั้งหมดทันที ป้องกันการกดส่งซ้ำหรือแอบแก้ไขคำตอบ
    const submitBtn = document.getElementById('btn-submit-exam');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังประมวลผลคะแนน...';
    }
    document.querySelectorAll('#view-student-exam input, #view-student-exam textarea, #view-student-exam button, #view-student-exam select').forEach(el => {
        el.disabled = true;
    });

    if (examTimerInterval) clearInterval(examTimerInterval);
    stopStudentExamLockdown();

    let totalPoints = 0;
    let earnedPoints = 0;
    const questionResults = [];

    const questions = assignedVariant?.questions || [];

    questions.forEach(q => {
        const qPts = Number(q.points) || 10;
        totalPoints += qPts;

        const given = studentAnswers[q.id];
        let isCorrect = false;

        if (q.type === 'radio') {
            isCorrect = (given === q.correctAnswer);
        } else if (q.type === 'checkbox') {
            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
            const givenArr = Array.isArray(given) ? given : [];
            isCorrect = (correctArr.length === givenArr.length && correctArr.every(v => givenArr.includes(v)));
        } else if (q.type === 'text') {
            isCorrect = (given && q.correctAnswer && given.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
        } else if (q.type === 'code') {
            const studentCode = given || '';
            let codePassed = false;
            if (studentCode.trim().length > 10) {
                if (q.expectedOutput) {
                    codePassed = studentCode.toLowerCase().includes(q.expectedOutput.toLowerCase().trim());
                } else {
                    codePassed = true;
                }
            }
            isCorrect = codePassed;
        }

        const ptsEarned = isCorrect ? qPts : 0;
        earnedPoints += ptsEarned;

        questionResults.push({
            questionId: q.id,
            title: q.title,
            points: qPts,
            ptsEarned: ptsEarned,
            givenAnswer: given,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            isCorrect: isCorrect
        });
    });

    const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passTarget = currentLobby?.quiz_settings?.passingScore ?? 70;
    const isPassed = percent >= passTarget;

    studentExamResult = {
        studentName: studentProfile.name,
        studentRoom: studentProfile.room,
        assignedVariantName: assignedVariant?.variantName || 'ชุดพิเศษ',
        quizTitle: currentLobby?.quiz_title || 'แบบทดสอบ',
        score: earnedPoints,
        total: totalPoints,
        percent: percent,
        isPassed: isPassed,
        submittedAt: new Date().toISOString(),
        questionResults: questionResults
    };

    // 💾 บันทึกผลสอบลง LocalStorage ถาวรแยกตาม PIN และชื่อ เพื่อป้องกันการเข้าสอบซ้ำ
    try {
        localStorage.setItem(`gyver_submitted_${roomPin}_${studentProfile.name}`, JSON.stringify(studentExamResult));
    } catch (e) {}

    // Update lobby in local
    const localLobby = getLocalLobby(roomPin);
    if (localLobby && Array.isArray(localLobby.players)) {
        const p = localLobby.players.find(x => x.name === studentProfile.name);
        if (p) {
            p.status = 'SUBMITTED';
            p.score = earnedPoints;
            p.total = totalPoints;
            p.percent = percent;
            p.isPassed = isPassed;
            p.submittedAt = studentExamResult.submittedAt;
        }
        saveLocalLobby(localLobby);
    }

    // Send local broadcast to teacher tab
    if (localBC) {
        localBC.postMessage({
            type: 'STUDENT_SUBMIT',
            roomCode: roomPin,
            result: studentExamResult
        });
    }

    // Sync to Supabase and send broadcast event
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`).send({
                type: 'broadcast',
                event: 'student_submitted',
                payload: studentExamResult
            });

            // Update row (ไม่ overwrite ถ้าคนนี้เคยส่งแล้ว)
            const { data } = await window.supabaseClient.from('lobbies').select('players').eq('room_code', roomPin).maybeSingle();
            if (data && Array.isArray(data.players)) {
                const player = data.players.find(x => x.name === studentProfile.name);
                if (player) {
                    if (player.status !== 'SUBMITTED' || !player.submittedAt) {
                        player.status = 'SUBMITTED';
                        player.score = earnedPoints;
                        player.total = totalPoints;
                        player.percent = percent;
                        player.isPassed = isPassed;
                        player.submittedAt = studentExamResult.submittedAt;
                        await window.supabaseClient.from('lobbies').update({ players: data.players }).eq('room_code', roomPin);
                    }
                }
            }

            // Also record response to gyver_quiz_responses if available
            try {
                await window.supabaseClient.from('gyver_quiz_responses').insert({
                    quiz_id: currentLobby.quiz_id || 'live_quiz',
                    student_name: studentProfile.name,
                    student_room: studentProfile.room,
                    score: earnedPoints,
                    total: totalPoints,
                    percentage: percent,
                    is_passed: isPassed,
                    answers: studentExamResult.questionResults
                });
            } catch (ignoreErr) {}
        } catch (e) {}
    }

    renderStudentResultUI();
}

/**
 * 🏆 แสดงผลคะแนนของนักเรียน
 */
function renderStudentResultUI() {
    isExamSubmitted = true;
    saveStudentSession({ activeView: 'result', isExamSubmitted: true });

    document.getElementById('view-student-join')?.classList.add('d-none');
    document.getElementById('view-student-waiting')?.classList.add('d-none');
    document.getElementById('view-student-exam')?.classList.add('d-none');
    document.getElementById('view-student-result')?.classList.remove('d-none');

    // 🧹 ล้างคำถามในหน้าข้อสอบ ป้องกันการ inspect สลับกลับมากาใหม่
    const examQuestionsList = document.getElementById('student-exam-questions-list');
    if (examQuestionsList) {
        examQuestionsList.innerHTML = '<div class="text-center py-5 text-subtle"><i class="bi bi-shield-check text-success fs-1 mb-2 d-block"></i>คุณได้ส่งข้อสอบชุดนี้เรียบร้อยแล้ว</div>';
    }

    // 🛡️ ดักประวัติเบราว์เซอร์ไม่ให้กดย้อนกลับไปหน้าข้อสอบ
    try {
        history.pushState({ inResult: true, roomPin }, '', window.location.href);
    } catch (e) {}

    const res = studentExamResult;
    if (!res) return;

    document.getElementById('student-result-name-text').textContent = `${res.studentName} ${res.studentRoom ? `(${res.studentRoom})` : ''} - ${res.assignedVariantName}`;
    document.getElementById('student-result-score').textContent = res.score;
    document.getElementById('student-result-total').textContent = `/ ${res.total} คะแนน`;
    document.getElementById('student-result-percent').textContent = `${res.percent}%`;

    const iconEl = document.getElementById('student-result-icon');
    const titleEl = document.getElementById('student-result-title');
    const statusEl = document.getElementById('student-result-status');
    const certBtn = document.getElementById('btn-student-cert');

    if (res.isPassed) {
        iconEl.innerHTML = '<i class="bi bi-patch-check-fill text-success" style="font-size: 4rem;"></i>';
        titleEl.textContent = '🎉 ยินดีด้วย! คุณผ่านเกณฑ์การทดสอบ';
        titleEl.className = 'fw-bold mb-2 text-success';
        statusEl.className = 'fs-5 fw-bold text-success';
        statusEl.textContent = 'ผ่านเกณฑ์ ✅';
        if (certBtn) certBtn.classList.remove('d-none');
    } else {
        iconEl.innerHTML = '<i class="bi bi-x-circle-fill text-danger" style="font-size: 4rem;"></i>';
        titleEl.textContent = 'เสียใจด้วย ยังไม่ผ่านเกณฑ์ ⚠️';
        titleEl.className = 'fw-bold mb-2 text-danger';
        statusEl.className = 'fs-5 fw-bold text-danger';
        statusEl.textContent = 'ไม่ผ่าน ❌';
        if (certBtn) certBtn.classList.add('d-none');
    }

    // Answers review
    const reviewList = document.getElementById('student-review-list');
    const isExamFinished = currentLobby && (currentLobby.status === 'FINISHED' || currentLobby.status === 'CLOSED');
    const allowImmediate = currentLobby?.quiz_settings?.showAnswersImmediately === true;
    const canShowAnswers = isExamFinished || allowImmediate;

    if (reviewList) {
        let bannerHtml = '';
        if (!canShowAnswers) {
            bannerHtml = `
                <div class="alert alert-dark border border-warning text-warning d-flex align-items-center gap-2 mb-3 py-2 px-3">
                    <i class="bi bi-shield-lock-fill fs-4 flex-shrink-0 text-warning"></i>
                    <div class="small">
                        <b>เฉลยคำตอบถูกซ่อนไว้ชั่วคราว:</b> เพื่อความโปร่งใสและป้องกันการทุจริต ระบบจะเปิดแสดงเฉลยข้อที่ถูกต้องและคำอธิบายเมื่อคุณครูสิ้นสุดการสอบของห้องแล้ว
                    </div>
                </div>
            `;
        }

        reviewList.innerHTML = bannerHtml + (res.questionResults || []).map((q, idx) => `
            <div class="question-block border-${q.isCorrect ? 'success' : 'danger'} mb-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="fw-bold text-white mb-1 flex-grow-1"><span class="text-quiz me-2">ข้อ ${idx + 1}.</span>${formatQuizTitleHtml(q.title)}</div>
                    <span class="badge bg-${q.isCorrect ? 'success' : 'danger'} ms-2">
                        ${q.isCorrect ? `+${q.points} คะแนน` : '0 คะแนน'}
                    </span>
                </div>
                <div class="small mb-1">
                    <span class="text-subtle">คำตอบของคุณ: </span>
                    <div class="fw-bold quiz-choice-text ${q.isCorrect ? 'text-success' : 'text-danger'} mt-1">
                        ${escapeHtml(Array.isArray(q.givenAnswer) ? q.givenAnswer.join(', ') : (q.givenAnswer || '(ไม่ได้ตอบ)'))}
                    </div>
                </div>
                ${!q.isCorrect && canShowAnswers ? `
                    <div class="small mb-1 mt-2">
                        <span class="text-subtle">เฉลยที่ถูกต้อง: </span>
                        <div class="fw-bold quiz-choice-text text-success mt-1">
                            ${escapeHtml(Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer)}
                        </div>
                    </div>
                ` : ''}
                ${q.explanation && canShowAnswers ? `
                    <div class="small text-info mt-2 pt-2 border-top border-secondary">
                        <i class="bi bi-info-circle me-1"></i>${escapeHtml(q.explanation)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
}

// Certificate Modal
function openStudentCertModal() {
    if (!studentExamResult) return;
    const canvas = document.getElementById('student-cert-canvas');
    if (!canvas) return;

    drawStudentCertificate(canvas, {
        studentName: studentExamResult.studentName,
        quizTitle: studentExamResult.quizTitle,
        percent: studentExamResult.percent,
        date: new Date(studentExamResult.submittedAt).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric'
        }),
        code: `LIVE-GYV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    });

    const modal = new bootstrap.Modal(document.getElementById('studentCertModal'));
    modal.show();
}

function drawStudentCertificate(canvas, data) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background Cyber
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0a0d14');
    bgGrad.addColorStop(1, '#1e112a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Decorative Borders
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    // Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 22px Kanit, sans-serif';
    ctx.fillText('S-GYVER ANTI-CHEATING LIVE EXAM', w / 2, 85);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Kanit, sans-serif';
    ctx.fillText('เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า', w / 2, 145);

    // Student Name
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 44px Kanit, sans-serif';
    ctx.fillText(data.studentName, w / 2, 230);

    // Body
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '24px Kanit, sans-serif';
    ctx.fillText('ได้ผ่านการทดสอบวัดผลในระบบห้องสอบสดแบบสลับชุดคำถาม', w / 2, 310);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Kanit, sans-serif';
    ctx.fillText(`"${data.quizTitle}"`, w / 2, 360);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px Kanit, sans-serif';
    ctx.fillText(`ผลคะแนนการทดสอบ: ${data.percent}%  |  ให้ไว้ ณ วันที่ ${data.date}`, w / 2, 420);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "Fira Code", monospace';
    ctx.fillText(`VERIFICATION CODE: ${data.code}`, w / 2, 570);

    // Signature Line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 120, 515);
    ctx.lineTo(w / 2 + 120, 515);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Kanit, sans-serif';
    ctx.fillText('คณะกรรมการวัดและประเมินผล Gyver Assessment', w / 2, 540);
}

function downloadStudentCertPNG() {
    const canvas = document.getElementById('student-cert-canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `Certificate_${studentExamResult?.studentName || 'GyverQuiz'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Data Helpers
async function fetchLobbyData(pin) {
    lastFetchError = null;

    // 1. ลองดึงจาก Supabase
    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient
                .from('lobbies')
                .select('*')
                .eq('room_code', pin)
                .maybeSingle();

            if (error) {
                console.warn('Supabase fetchLobbyData error:', error);
                lastFetchError = error;
            } else {
                if (data) return data;
                // หากเชื่อมต่อ Supabase สำเร็จและไม่พบข้อมูล (data === null) แสดงว่าห้องถูกลบไปแล้ว
                return null;
            }
        } catch (e) {
            console.warn('Supabase fetch exception:', e);
            lastFetchError = e;
        }
    }

    // 2. ตรวจสอบ LocalStorage
    const local = getLocalLobby(pin);
    if (local) return local;

    // 3. ร้องขอผ่าน Local BroadcastChannel ข้ามแท็บ
    if (localBC) {
        const bcData = await requestLobbyViaBC(pin, 300);
        if (bcData) return bcData;
    }

    return null;
}

function requestLobbyViaBC(pin, timeoutMs = 300) {
    return new Promise((resolve) => {
        if (!localBC) return resolve(null);
        let resolved = false;

        const handler = (event) => {
            const msg = event?.data;
            if (msg && msg.type === 'LOBBY_STATE' && String(msg.roomCode) === String(pin)) {
                resolved = true;
                localBC.removeEventListener('message', handler);
                resolve(msg.data);
            }
        };

        localBC.addEventListener('message', handler);
        localBC.postMessage({ type: 'REQUEST_LOBBY', roomCode: pin });

        setTimeout(() => {
            if (!resolved) {
                localBC.removeEventListener('message', handler);
                resolve(null);
            }
        }, timeoutMs);
    });
}

function saveLocalLobby(data) {
    try {
        localStorage.setItem(`gyver_lobby_${data.room_code}`, JSON.stringify(data));
    } catch (e) {}
}

function getLocalLobby(pin) {
    try {
        const raw = localStorage.getItem(`gyver_lobby_${pin}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
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

/**
 * 🎨 จัดรูปแบบโจทย์คำถาม: แยกบรรทัดโค้ดใส่กล่อง Code Block และจัดข้อความภาษาไทย
 */
function formatQuizTitleHtml(title) {
    if (!title) return '';
    const lines = title.split('\n');
    if (lines.length === 1) {
        return `<span class="quiz-formatted-content">${escapeHtml(title)}</span>`;
    }

    let html = '';
    let codeBuffer = [];

    const flushCode = () => {
        if (codeBuffer.length > 0) {
            html += `<pre class="quiz-code-block">${escapeHtml(codeBuffer.join('\n'))}</pre>`;
            codeBuffer = [];
        }
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        const isCode = trimmed && (
            line.startsWith('    ') || line.startsWith('\t') ||
            /^(print|input|if|elif|else:|while|for|def|return|import|from|class)\b/.test(trimmed) ||
            /^[a-zA-Z_]\w*\s*(=|\+=|-=|\*=|\/\/=)\s*/.test(trimmed) ||
            /\b(==|!=|<=|>=|\/\/|\*\*|%)\b/.test(trimmed)
        );

        if (isCode) {
            codeBuffer.push(line);
        } else {
            if (codeBuffer.length > 0 && trimmed === '') {
                codeBuffer.push('');
            } else {
                flushCode();
                if (trimmed) {
                    html += `<div class="quiz-formatted-content mb-1">${escapeHtml(line)}</div>`;
                } else {
                    html += `<div class="mb-1">&nbsp;</div>`;
                }
            }
        }
    });
    flushCode();
    return html || `<div class="quiz-formatted-content">${escapeHtml(title)}</div>`;
}

// ====================================================
// 🐍 Python Code Runner Engine (Skulpt Live)
// ====================================================
const studentCodeMirrorInstances = {};

function resetStudentCode(qId) {
    const questions = assignedVariant?.questions || [];
    const q = questions.find(x => x.id === qId);
    if (!q) return;
    const defaultCode = q.codeStarter || `# 🐍 เขียนโค้ด Python ที่นี่\n`;
    if (studentCodeMirrorInstances[qId]) {
        studentCodeMirrorInstances[qId].setValue(defaultCode);
    }
    studentAnswers[qId] = defaultCode;
    saveStudentSession();
    updateStudentAnswerProgress();
}

function clearStudentOutput(qId) {
    const outputEl = document.getElementById(`student-output-${qId}`);
    if (outputEl) {
        outputEl.textContent = 'หน้าจอผลลัพธ์ว่างเปล่า...';
        outputEl.classList.remove('has-error');
    }
}

async function runStudentPython(qId) {
    const editor = studentCodeMirrorInstances[qId];
    const code = editor ? editor.getValue() : (studentAnswers[qId] || '');
    studentAnswers[qId] = code;
    saveStudentSession();
    updateStudentAnswerProgress();

    const outputEl = document.getElementById(`student-output-${qId}`);
    if (outputEl) {
        outputEl.textContent = '⏳ กำลังรันโปรแกรม...\n';
        outputEl.classList.remove('has-error');
    }

    // Clear previous error highlight
    if (editor && editor._errorMark) {
        editor._errorMark.clear();
        editor._errorMark = null;
    }

    await executeStudentPythonSkulpt(code, outputEl, undefined, qId);
}

/**
 * Translates Skulpt/Python error types into friendly Thai messages
 */
function translatePythonError(errStr) {
    if (!errStr) return errStr;
    const typeMap = [
        [/SyntaxError/,      '❌ ข้อผิดพลาดไวยากรณ์ (SyntaxError)'],
        [/IndentationError/, '❌ ข้อผิดพลาดการย่อหน้า (IndentationError)'],
        [/NameError/,        '❌ ชื่อตัวแปรไม่ถูกต้อง (NameError)'],
        [/TypeError/,        '❌ ชนิดข้อมูลไม่ถูกต้อง (TypeError)'],
        [/ValueError/,       '❌ ค่าไม่ถูกต้อง (ValueError)'],
        [/ZeroDivisionError/,'❌ หารด้วยศูนย์ไม่ได้ (ZeroDivisionError)'],
        [/IndexError/,       '❌ Index เกินขอบเขต (IndexError)'],
        [/AttributeError/,   '❌ ไม่พบ Attribute (AttributeError)'],
        [/ImportError/,      '❌ โมดูลไม่รองรับในโหมดนี้ (ImportError)'],
        [/RecursionError/,   '❌ การวนซ้ำมากเกินไป (RecursionError)']
    ];
    for (const [re, label] of typeMap) {
        if (re.test(errStr)) {
            return errStr.replace(re, label.split(' ')[0].replace('❌ ', ''));
        }
    }
    return errStr;
}

/**
 * Extract line number from Skulpt error string or object
 * Skulpt errors look like: "SyntaxError: invalid syntax on line 5"
 * or have err.traceback[].lineno
 */
function parseSkulptLineNumber(err) {
    try {
        // Try traceback from Skulpt error object
        if (err && err.traceback && err.traceback.length > 0) {
            const tb = err.traceback[err.traceback.length - 1];
            if (tb && tb.lineno) return parseInt(tb.lineno, 10);
        }
    } catch(e) {}
    try {
        // Try string pattern: "on line N" or "line N"
        const str = err ? err.toString() : '';
        const m = str.match(/on line (\d+)/i) || str.match(/line (\d+)/i);
        if (m) return parseInt(m[1], 10);
    } catch(e) {}
    return null;
}

function executeStudentPythonSkulpt(code, outputEl, onInputCallback, qId) {
    return new Promise((resolve) => {
        if (typeof Sk === 'undefined') {
            if (outputEl) {
                outputEl.classList.add('has-error');
                outputEl.textContent = '❌ ระบบกำลังโหลดเครื่องมือรัน Python (Skulpt) กรุณารอสักครู่แล้วลองใหม่ครับ';
            }
            return resolve({ error: 'Skulpt not loaded' });
        }

        if (outputEl) {
            outputEl.classList.remove('has-error');
            outputEl.textContent = '';
        }

        function outf(text) {
            if (outputEl) {
                outputEl.textContent += text;
                outputEl.scrollTop = outputEl.scrollHeight;
            }
        }

        function builtinRead(x) {
            if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
                throw "File not found: '" + x + "'";
            }
            return Sk.builtinFiles["files"][x];
        }

        Sk.configure({
            output: outf,
            read: builtinRead,
            inputfun: function(prompt) {
                return new Promise((res) => {
                    if (typeof onInputCallback === 'function') {
                        onInputCallback(prompt, res);
                    } else if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            title: '⌨️ ป้อนค่า input()',
                            html: prompt
                                ? `<div class="text-warning fw-bold font-mono mb-2">${escapeHtml(prompt)}</div><div class="text-subtle small">กรุณาพิมพ์ค่าตัวเลขหรือข้อความแล้วกด Enter</div>`
                                : '<div class="text-subtle small">กรุณาพิมพ์ค่าสำหรับโปรแกรม:</div>',
                            input: 'text',
                            inputAttributes: { autocapitalize: 'off', autocomplete: 'off', placeholder: 'พิมพ์ค่าที่นี่แล้วกด Enter...' },
                            showCancelButton: false,
                            confirmButtonText: '<i class="bi bi-check-lg me-1"></i>ส่งค่า (Enter)',
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'cyber-card border-quiz',
                                title: 'text-white font-kanit',
                                input: 'form-control form-control-cyber text-center font-mono fs-5',
                                confirmButton: 'btn btn-quiz-glow px-4 fw-bold'
                            }
                        }).then((result) => {
                            const val = result.value !== undefined ? result.value : '';
                            outf((prompt || '') + val + '\n');
                            res(val);
                        });
                    } else {
                        const val = window.prompt(prompt || 'Input:') || '';
                        outf((prompt || '') + val + '\n');
                        res(val);
                    }
                });
            },
            inputfunTakesPrompt: true
        });

        (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'turtle-canvas';

        const myPromise = Sk.misceval.asyncToPromise(function() {
            return Sk.importMainWithBody("<stdin>", false, code, true);
        });

        myPromise.then(function(mod) {
            if (outputEl && !outputEl.textContent.trim()) {
                outputEl.textContent = '✅ โปรแกรมทำงานเสร็จสิ้น (ไม่มีข้อความแสดงผล)';
            }
            resolve(outputEl ? outputEl.textContent : '');
        }, function(err) {
            const rawStr = err ? err.toString() : 'Unknown error';
            const lineNum = parseSkulptLineNumber(err);
            const codeLines = code.split('\n');

            // Build friendly error message
            let friendlyMsg = '';
            if (lineNum && lineNum > 0) {
                const badLine = codeLines[lineNum - 1] || '';
                friendlyMsg = [
                    `❌ พบข้อผิดพลาดที่บรรทัดที่ ${lineNum}`,
                    ``,
                    `📍 โค้ดที่มีปัญหา:`,
                    `   ${badLine.trimEnd()}`,
                    `   ${'~'.repeat(Math.max(badLine.trimEnd().length, 1))}`,
                    ``,
                    `🔍 รายละเอียด: ${rawStr}`,
                    ``,
                    `💡 คำแนะนำ: ตรวจสอบไวยากรณ์ การย่อหน้า และชื่อตัวแปร`
                ].join('\n');

                // Highlight the error line in CodeMirror
                if (qId) {
                    const editor = studentCodeMirrorInstances[qId];
                    if (editor) {
                        if (editor._errorMark) editor._errorMark.clear();
                        editor._errorMark = editor.markText(
                            { line: lineNum - 1, ch: 0 },
                            { line: lineNum - 1, ch: codeLines[lineNum - 1]?.length || 0 },
                            { className: 'cm-error-line', title: rawStr }
                        );
                        editor.scrollIntoView({ line: lineNum - 1, ch: 0 }, 60);
                        editor.setCursor({ line: lineNum - 1, ch: 0 });
                    }
                }
            } else {
                friendlyMsg = `❌ ข้อผิดพลาด: ${rawStr}\n\n💡 คำแนะนำ: ตรวจสอบไวยากรณ์ การย่อหน้า และชื่อตัวแปร`;
            }

            if (outputEl) {
                outputEl.classList.add('has-error');
                const prevText = outputEl.textContent.trim();
                outputEl.textContent = (prevText && !prevText.includes('กำลังรัน')) 
                    ? prevText + '\n' + friendlyMsg 
                    : friendlyMsg;
                outputEl.scrollTop = outputEl.scrollHeight;
            }
            resolve({ error: rawStr, line: lineNum });
        });
    });
}

// ====================================================
// 🚨 Anti-Cheat Student Exam Lockdown Shield
// ====================================================
const studentLockdownState = {
    isActive: false,
    isLocked: false,
    violationCount: 0,
    teacherPin: '9999',
    history: []
};

function startStudentExamLockdown(pin = '9999') {
    studentLockdownState.isActive = true;
    studentLockdownState.isLocked = false;
    studentLockdownState.violationCount = 0;
    studentLockdownState.teacherPin = String(pin || '9999').trim();

    // 1. Enter Fullscreen Mode
    try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
                console.log('[Lockdown] Fullscreen request prevented by browser interaction policy');
            });
        }
    } catch (e) {}

    // 2. Attach Anti-Cheat Event Listeners
    window.removeEventListener('blur', onStudentLockdownBlur);
    document.removeEventListener('visibilitychange', onStudentLockdownVisibility);
    document.removeEventListener('fullscreenchange', onStudentLockdownFullscreen);
    window.removeEventListener('keydown', onStudentLockdownKeyDown);

    window.addEventListener('blur', onStudentLockdownBlur);
    document.addEventListener('visibilitychange', onStudentLockdownVisibility);
    document.addEventListener('fullscreenchange', onStudentLockdownFullscreen);
    window.addEventListener('keydown', onStudentLockdownKeyDown);

    console.log('[Student Lockdown Shield] Active with PIN:', studentLockdownState.teacherPin);
}

function stopStudentExamLockdown() {
    studentLockdownState.isActive = false;
    studentLockdownState.isLocked = false;

    window.removeEventListener('blur', onStudentLockdownBlur);
    document.removeEventListener('visibilitychange', onStudentLockdownVisibility);
    document.removeEventListener('fullscreenchange', onStudentLockdownFullscreen);
    window.removeEventListener('keydown', onStudentLockdownKeyDown);

    const overlay = document.getElementById('lockdown-shield-overlay');
    if (overlay) overlay.classList.add('d-none');
}

function isSwalOpen() {
    // Check if SweetAlert2 dialog is currently open (e.g., Python input() popup)
    return typeof Swal !== 'undefined' && Swal.isVisible();
}

function onStudentLockdownBlur() {
    if (!studentLockdownState.isActive || studentLockdownState.isLocked) return;
    if (isSwalOpen()) return; // Don't lock when Python input() dialog is open
    setTimeout(() => {
        if (!document.hasFocus() && !isSwalOpen() && studentLockdownState.isActive && !studentLockdownState.isLocked) {
            triggerStudentLockdownScreen('ตรวจพบการคลิกออกนอกหน้าจอสอบ หรือเปิดโปรแกรมอื่นขึ้นมาทับ (Window Blur)');
        }
    }, 400);
}

function onStudentLockdownVisibility() {
    if (!studentLockdownState.isActive || studentLockdownState.isLocked) return;
    if (isSwalOpen()) return; // Don't lock during Python input() dialog
    if (document.hidden) {
        triggerStudentLockdownScreen('ตรวจพบการสลับแท็บ ยุบจอ หรือแอบเปิดเบราว์เซอร์อื่น (Tab Switched / Minimized)');
    }
}

function onStudentLockdownFullscreen() {
    if (!studentLockdownState.isActive || studentLockdownState.isLocked) return;
    if (isSwalOpen()) return; // Don't lock during Python input() dialog
    if (!document.fullscreenElement) {
        triggerStudentLockdownScreen('ตรวจพบการออกจากโหมดเต็มจอ (Exited Fullscreen)');
    }
}

function onStudentLockdownKeyDown(e) {
    if (!studentLockdownState.isActive) return;
    // Block DevTools & inspection shortcuts
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P'))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}

function triggerStudentLockdownScreen(reason) {
    if (!studentLockdownState.isActive || studentLockdownState.isLocked) return;
    studentLockdownState.isLocked = true;
    studentLockdownState.violationCount++;

    const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    studentLockdownState.history.push({ reason, time: nowStr });

    console.warn(`[Lockdown Triggered] #${studentLockdownState.violationCount}: ${reason}`);

    // Show Red Lockdown Overlay
    const overlay = document.getElementById('lockdown-shield-overlay');
    if (overlay) {
        overlay.classList.remove('d-none');
        const reasonEl = document.getElementById('lockdown-reason-text');
        if (reasonEl) reasonEl.textContent = reason;

        const timeEl = document.getElementById('lockdown-time-label');
        if (timeEl) timeEl.textContent = `${nowStr} น.`;

        const countEl = document.getElementById('lockdown-violation-count');
        if (countEl) countEl.textContent = `${studentLockdownState.violationCount} ครั้ง`;

        const pinInput = document.getElementById('lockdown-teacher-pin');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }

        const errEl = document.getElementById('lockdown-pin-error');
        if (errEl) errEl.classList.add('d-none');
    }

    // Broadcast Lockdown to Teacher Room via Local BroadcastChannel
    if (localBC) {
        localBC.postMessage({
            type: 'STUDENT_LOCKDOWN_ALERT',
            roomCode: roomPin,
            studentName: studentProfile?.name || 'นักเรียน',
            reason: reason,
            violationCount: studentLockdownState.violationCount,
            time: nowStr
        });
    }

    // Broadcast to Supabase Realtime Channel
    if (window.supabaseClient && roomPin) {
        try {
            window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`).send({
                type: 'broadcast',
                event: 'student_lockdown_alert',
                payload: {
                    studentName: studentProfile?.name || 'นักเรียน',
                    reason: reason,
                    violationCount: studentLockdownState.violationCount,
                    time: nowStr
                }
            });
        } catch (ignoreErr) {}
    }
}

function unlockExamByTeacherPin() {
    const pinInput = document.getElementById('lockdown-teacher-pin');
    const enteredPin = pinInput ? pinInput.value.trim() : '';
    const errEl = document.getElementById('lockdown-pin-error');

    const validPins = [studentLockdownState.teacherPin, '9999'];
    if (validPins.includes(enteredPin)) {
        if (errEl) errEl.classList.add('d-none');
        studentLockdownState.isLocked = false;

        const overlay = document.getElementById('lockdown-shield-overlay');
        if (overlay) overlay.classList.add('d-none');

        // Re-enter Fullscreen
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } catch (e) {}

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'ปลดล็อกหน้าจอสำเร็จ! 🔓',
                text: 'คุณครูได้ปลดล็อกหน้าจอเรียบร้อยแล้ว ตั้งใจทำข้อสอบต่อนะครับ',
                timer: 2000,
                showConfirmButton: false,
                background: '#0f172a',
                color: '#fff'
            });
        }

        // Broadcast to Teacher Dashboard that this student is unlocked
        if (localBC) {
            localBC.postMessage({
                type: 'STUDENT_UNLOCKED',
                roomCode: roomPin,
                studentName: studentProfile?.name || 'นักเรียน'
            });
        }
        if (window.supabaseClient && roomPin) {
            try {
                window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`).send({
                    type: 'broadcast',
                    event: 'student_unlocked',
                    payload: {
                        roomCode: roomPin,
                        studentName: studentProfile?.name || 'นักเรียน'
                    }
                });
            } catch (ignoreErr) {}
        }
    } else {
        if (errEl) errEl.classList.remove('d-none');
        if (pinInput) {
            pinInput.classList.add('is-invalid');
            setTimeout(() => pinInput.classList.remove('is-invalid'), 1000);
            pinInput.focus();
        }
    }
}

/**
 * 🔓 Remote unlock triggered by teacher from monitor screen
 */
function handleRemoteUnlockByTeacher() {
    studentLockdownState.isLocked = false;

    const overlay = document.getElementById('lockdown-shield-overlay');
    if (overlay) overlay.classList.add('d-none');

    const pinInput = document.getElementById('lockdown-teacher-pin');
    if (pinInput) pinInput.value = '';

    const errEl = document.getElementById('lockdown-pin-error');
    if (errEl) errEl.classList.add('d-none');

    // Re-enter Fullscreen
    try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    } catch (e) {}

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'คุณครูปลดล็อกหน้าจอให้แล้ว! 🔓',
            text: 'ระบบได้รับการปลดล็อกทางไกลจากคุณครู สามารถทำข้อสอบต่อได้ทันทีครับ',
            timer: 2500,
            showConfirmButton: false,
            background: '#0f172a',
            color: '#fff'
        });
    }

    // Confirm back to teacher
    if (localBC) {
        localBC.postMessage({
            type: 'STUDENT_UNLOCKED',
            roomCode: roomPin,
            studentName: studentProfile?.name || 'นักเรียน'
        });
    }
}

// Global functions for student view
window.resetStudentCode = resetStudentCode;
window.clearStudentOutput = clearStudentOutput;
window.runStudentPython = runStudentPython;
window.startStudentExamLockdown = startStudentExamLockdown;
window.stopStudentExamLockdown = stopStudentExamLockdown;
window.triggerStudentLockdownScreen = triggerStudentLockdownScreen;
window.unlockExamByTeacherPin = unlockExamByTeacherPin;


