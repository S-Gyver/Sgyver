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
document.addEventListener('DOMContentLoaded', () => {
    parseUrlParams();
});

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
        if (lastFetchError && (lastFetchError.code === 'PGRST205' || String(lastFetchError.message || '').includes('lobbies') || lastFetchError.code === '42P01')) {
            CyberSwal?.fire({
                icon: 'warning',
                title: 'ยังไม่ได้สร้างตารางในฐานข้อมูล',
                html: `ระบบตรวจพบว่ายังไม่มีตาราง <code>lobbies</code> ในฐานข้อมูล Supabase<br><br><span class="text-warning">โปรดแจ้งคุณครูผู้คุมสอบให้เปิดหน้าจอคุมสอบ แล้วกดปุ่ม <b>"ตั้งค่า SQL"</b> เพื่อรันคำสั่งติดตั้งตารางใน Supabase ก่อนครับ</span>`,
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

    listenForExamStart();
}

/**
 * 📡 ฟังและรอสัญญาณเมื่อครูกด "เริ่มสอบ"
 */
function listenForExamStart() {
    // 1. Supabase Realtime Channel
    if (window.supabaseClient) {
        try {
            window.supabaseClient.channel(`quiz_room_${roomPin}`)
                .on('broadcast', { event: 'START_EXAM' }, async () => {
                    checkAndLaunchExam();
                })
                .subscribe();

            window.supabaseClient.channel(`student_waiting_${roomPin}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'lobbies',
                    filter: `room_code=eq.${roomPin}`
                }, (payload) => {
                    if (payload.new && payload.new.status === 'RUNNING') {
                        checkAndLaunchExam(payload.new);
                    }
                })
                .subscribe();
        } catch (e) {}
    }

    // 2. Fallback Polling every 1.5 seconds
    pollInterval = setInterval(async () => {
        const lobby = await fetchLobbyData(roomPin);
        if (lobby && lobby.status === 'RUNNING') {
            checkAndLaunchExam(lobby);
        }
    }, 1500);
}

async function checkAndLaunchExam(freshLobby) {
    const lobby = freshLobby || (await fetchLobbyData(roomPin));
    if (!lobby || lobby.status !== 'RUNNING') return;

    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    currentLobby = lobby;

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

    // Launch Student Exam Screen
    document.getElementById('view-student-waiting').classList.add('d-none');
    document.getElementById('view-student-exam').classList.remove('d-none');

    document.getElementById('exam-variant-badge').innerHTML = `<i class="bi bi-shield-lock-fill me-1"></i>${escapeHtml(assignedVariant.variantName)} (เฉพาะตัวคุณ)`;
    document.getElementById('exam-student-label').textContent = `${studentProfile.name} ${studentProfile.room ? `(${studentProfile.room})` : ''}`;

    renderLiveQuestions();
    startStudentExamTimer();
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

        let choicesHtml = '';
        if (q.type === 'radio') {
            choicesHtml = `
                <div class="row g-2 mt-2">
                    ${(q.options || []).map((opt, oIdx) => `
                        <div class="col-12 col-md-6">
                            <div class="quiz-choice-card" onclick="selectStudentRadio('${q.id}', '${escapeHtml(opt)}', this)">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge bg-dark border border-secondary text-white">${String.fromCharCode(65 + oIdx)}</span>
                                    <span class="text-white">${escapeHtml(opt)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (q.type === 'checkbox') {
            choicesHtml = `
                <div class="row g-2 mt-2">
                    ${(q.options || []).map((opt, oIdx) => `
                        <div class="col-12 col-md-6">
                            <div class="quiz-choice-card" onclick="toggleStudentCheckbox('${q.id}', '${escapeHtml(opt)}', this)">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge bg-dark border border-secondary text-white">${oIdx + 1}</span>
                                    <span class="text-white">${escapeHtml(opt)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (q.type === 'text') {
            choicesHtml = `
                <div class="mt-3">
                    <textarea class="form-control form-control-cyber" rows="2" 
                        placeholder="พิมพ์คำตอบของคุณที่นี่..."
                        oninput="studentAnswers['${q.id}'] = this.value"></textarea>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="fw-bold text-white mb-1"><span class="text-quiz me-2">ข้อ ${idx + 1}.</span>${escapeHtml(q.title)}</h5>
                <span class="badge bg-secondary text-white">${q.points || 10} คะแนน</span>
            </div>
            ${choicesHtml}
        `;

        container.appendChild(card);
    });
}

function selectStudentRadio(qId, val, el) {
    studentAnswers[qId] = val;
    const parent = document.getElementById(`exam-q-card-${qId}`);
    if (parent) {
        parent.querySelectorAll('.quiz-choice-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    }
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
}

function startStudentExamTimer() {
    const timeLimitMin = currentLobby.quiz_settings?.timeLimit || 15;
    remainingExamSeconds = timeLimitMin * 60;
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
    if (examTimerInterval) clearInterval(examTimerInterval);

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

    // Sync to Supabase and send broadcast event
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.channel(`quiz_lobby_channel_${roomPin}`).send({
                type: 'broadcast',
                event: 'student_submitted',
                payload: studentExamResult
            });

            // Update row
            const { data } = await window.supabaseClient.from('lobbies').select('players').eq('room_code', roomPin).maybeSingle();
            if (data && Array.isArray(data.players)) {
                const player = data.players.find(x => x.name === studentProfile.name);
                if (player) {
                    player.status = 'SUBMITTED';
                    player.score = earnedPoints;
                    player.total = totalPoints;
                    player.percent = percent;
                    player.isPassed = isPassed;
                    player.submittedAt = studentExamResult.submittedAt;
                }
                await window.supabaseClient.from('lobbies').update({ players: data.players }).eq('room_code', roomPin);
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
    document.getElementById('view-student-exam').classList.add('d-none');
    document.getElementById('view-student-result').classList.remove('d-none');

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
    if (reviewList) {
        reviewList.innerHTML = (res.questionResults || []).map((q, idx) => `
            <div class="question-block border-${q.isCorrect ? 'success' : 'danger'} mb-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="fw-bold text-white mb-0">ข้อ ${idx + 1}. ${escapeHtml(q.title)}</h6>
                    <span class="badge bg-${q.isCorrect ? 'success' : 'danger'}">
                        ${q.isCorrect ? `+${q.points} คะแนน` : '0 คะแนน'}
                    </span>
                </div>
                <div class="small mb-1">
                    <span class="text-subtle">คำตอบของคุณ: </span>
                    <span class="fw-bold ${q.isCorrect ? 'text-success' : 'text-danger'}">
                        ${escapeHtml(Array.isArray(q.givenAnswer) ? q.givenAnswer.join(', ') : (q.givenAnswer || '(ไม่ได้ตอบ)'))}
                    </span>
                </div>
                ${!q.isCorrect ? `
                    <div class="small text-success mb-1">
                        <span class="text-subtle">เฉลยที่ถูกต้อง: </span>
                        <span class="fw-bold">${escapeHtml(Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer)}</span>
                    </div>
                ` : ''}
                ${q.explanation ? `
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
            }

            if (data) return data;
        } catch (e) {
            lastFetchError = e;
        }
    }
    return getLocalLobby(pin);
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
