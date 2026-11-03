/**
 * Gyver Studio – Gamification & Badges Engine
 * Connects Code Race, Class Quizzes, Wheel Spins, and Attendance into XP, Levels & Badges
 */

(function () {
    const LEVELS = [
        { level: 1, title: '🌱 ผู้เริ่มต้น (Novice)', minXP: 0, maxXP: 100 },
        { level: 2, title: '⚡ นักสำรวจ (Explorer)', minXP: 100, maxXP: 250 },
        { level: 3, title: '🎯 ยอดฝีมือห้องเรียน (Class Pro)', minXP: 250, maxXP: 500 },
        { level: 4, title: '🏆 อัจฉริยะก้าวหน้า (Mastermind)', minXP: 500, maxXP: 1000 },
        { level: 5, title: '👑 ตำนาน Gyver (Legend)', minXP: 1000, maxXP: 99999 }
    ];

    const BADGE_DEFINITIONS = [
        {
            id: 'quiz_ace',
            name: '🎯 Quiz Ace',
            desc: 'ตอบคำถามเก็บแต้มสะสมได้ 5 แต้มขึ้นไป',
            icon: '🎯',
            check: (s) => (s.score || 0) >= 5
        },
        {
            id: 'wheel_legend',
            name: '🎡 Lucky Legend',
            desc: 'ร่วมสนุกสุ่มชื่อในวงล้อ 2 ครั้งขึ้นไป',
            icon: '🎡',
            check: (s) => (s.spunCount || 0) >= 2
        },
        {
            id: 'speed_racer',
            name: '🏎️ Speed Racer',
            desc: 'สะสมแต้มความเร็วจากการแข่งขัน Code Race',
            icon: '🏎️',
            check: (s) => (s.codeRaceScore || 0) > 0 || (s.wpm || 0) >= 25
        },
        {
            id: 'perfect_att',
            name: '📅 Iron Attendance',
            desc: 'เข้าเรียนตรงเวลาอย่างสม่ำเสมอ',
            icon: '📅',
            check: (s) => (s.attendanceCount || 0) >= 2
        },
        {
            id: 'star_submitter',
            name: '🌟 Star Student',
            desc: 'ส่งการบ้านและแบบฝึกหัดในห้องเรียน',
            icon: '🌟',
            check: (s) => (s.submittedCount || 0) >= 1
        }
    ];

    function calculateStudentStats(student, classroom) {
        if (!student) return null;

        const classScore = parseInt(student.score) || 0;
        const spunCount = parseInt(student.spunCount) || 0;

        // Attendance count
        let attCount = 0;
        if (classroom && classroom.attendance_logs && typeof classroom.attendance_logs === 'object') {
            const sName = student.name || '';
            Object.values(classroom.attendance_logs).forEach(log => {
                if (log && log[sName] && log[sName].status === 'present') {
                    attCount++;
                }
            });
        }

        // Submissions count
        let subCount = 0;
        if (classroom && Array.isArray(classroom.assignments)) {
            const sKey = student.user_id || student.name || '';
            classroom.assignments.forEach(a => {
                if (a && a.submissions && a.submissions[sKey]) {
                    subCount++;
                }
            });
        }

        // Total XP formula
        const totalXP = (classScore * 10) + (spunCount * 5) + (attCount * 15) + (subCount * 20);

        // Find Level
        let lvlInfo = LEVELS[0];
        for (let l of LEVELS) {
            if (totalXP >= l.minXP) {
                lvlInfo = l;
            }
        }

        const xpInLevel = totalXP - lvlInfo.minXP;
        const levelSpan = Math.max(1, lvlInfo.maxXP - lvlInfo.minXP);
        const percent = Math.min(100, Math.floor((xpInLevel / levelSpan) * 100));

        // Evaluate Badges
        const studentEvalObj = {
            ...student,
            score: classScore,
            spunCount: spunCount,
            attendanceCount: attCount,
            submittedCount: subCount
        };

        const badges = BADGE_DEFINITIONS.map(b => ({
            ...b,
            unlocked: b.check(studentEvalObj)
        }));

        return {
            totalXP,
            level: lvlInfo.level,
            title: lvlInfo.title,
            percent,
            minXP: lvlInfo.minXP,
            maxXP: lvlInfo.maxXP,
            badges,
            classScore,
            spunCount,
            attCount,
            subCount
        };
    }

    // Render Student Gamification Banner
    function renderBanner(containerId, student, classroom) {
        const el = document.getElementById(containerId);
        if (!el || !student) return;

        const stats = calculateStudentStats(student, classroom);
        if (!stats) return;

        const badgesHtml = stats.badges.map(b => `
            <div class="game-badge-item ${b.unlocked ? '' : 'is-locked'}" title="${escapeHtml(b.name)}: ${escapeHtml(b.desc)}">
                <span class="game-badge-icon">${b.icon}</span>
                <span>${escapeHtml(b.name)}</span>
                ${b.unlocked ? '<i class="bi bi-patch-check-fill text-warning ms-1"></i>' : '<i class="bi bi-lock-fill ms-1 text-white-50"></i>'}
            </div>
        `).join('');

        el.innerHTML = `
            <div class="gamification-hero">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                    <div class="d-flex align-items-center gap-2">
                        <span class="game-level-badge">
                            <i class="bi bi-trophy-fill"></i> LV. ${stats.level}
                        </span>
                        <span class="fw-bold fs-6">${escapeHtml(stats.title)}</span>
                    </div>
                    <div class="font-mono small fw-bold text-warning">
                        ⚡ ${stats.totalXP} XP
                    </div>
                </div>

                <div class="game-xp-bar-wrap mb-2">
                    <div class="game-xp-bar-fill" style="width: ${stats.percent}%;"></div>
                </div>
                <div class="d-flex justify-content-between text-white-50 small mb-3" style="font-size: 0.72rem;">
                    <span>ความก้าวหน้าระดับ: ${stats.percent}%</span>
                    <span>เป้าหมายขั้นถัดไป: ${stats.maxXP} XP</span>
                </div>

                <div>
                    <div class="small fw-bold text-white-50 mb-1">🏅 เหรียญเกียรติยศของคุณ (Badges):</div>
                    <div class="game-badges-grid">
                        ${badgesHtml}
                    </div>
                </div>
            </div>
        `;
    }

    // Render Classroom Leaderboard
    function renderLeaderboard(containerId, classroom) {
        const el = document.getElementById(containerId);
        if (!el || !classroom || !Array.isArray(classroom.students)) return;

        const students = classroom.students.map(s => {
            const stats = calculateStudentStats(s, classroom);
            return {
                ...s,
                stats
            };
        });

        // Sort by XP descending
        students.sort((a, b) => (b.stats?.totalXP || 0) - (a.stats?.totalXP || 0));

        if (students.length === 0) {
            el.innerHTML = '<div class="text-center py-4 text-muted">ยังไม่มีนักเรียนในห้องนี้</div>';
            return;
        }

        el.innerHTML = students.map((s, idx) => {
            const rank = idx + 1;
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
            const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const avatar = s.image || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(s.name || 'Student')}`;

            return `
                <div class="leaderboard-card">
                    <div class="leaderboard-rank ${rankClass}">${rankIcon}</div>
                    <img src="${avatar}" alt="" class="leaderboard-avatar">
                    <div class="leaderboard-info">
                        <div class="leaderboard-name text-truncate">${escapeHtml(s.nickname || s.name || 'นักเรียน')}</div>
                        <div class="small text-muted d-flex align-items-center gap-1.5 mt-0.5">
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill" style="font-size:0.65rem;">
                                Lv. ${s.stats?.level || 1}
                            </span>
                            <span style="font-size:0.75rem;">${s.stats?.classScore || 0} แต้ม</span>
                        </div>
                    </div>
                    <div class="leaderboard-score font-mono">
                        ${s.stats?.totalXP || 0} <span style="font-size:0.7rem; font-weight:normal; color:#64748b;">XP</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    // Expose API
    window.GyverGamification = {
        calculate: calculateStudentStats,
        renderBanner: renderBanner,
        renderLeaderboard: renderLeaderboard
    };
})();
