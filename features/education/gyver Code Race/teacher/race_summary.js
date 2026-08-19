let roomCode = '';
let classKey = '';
let playersList = [];

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('room') || 'RACE88';
    classKey = urlParams.get('classKey') || '5/10';

    const roomEl = document.getElementById('summary-room-code');
    const classEl = document.getElementById('summary-class-key');
    
    if (roomEl) roomEl.innerText = roomCode;
    if (classEl) classEl.innerText = classKey;

    await fetchAndRenderSummaryData();
});

async function fetchAndRenderSummaryData() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            
            // ดึงข้อมูลรายชื่อและคะแนนจากตาราง class_rooms
            let { data } = await supabaseClient
                .from('class_rooms')
                .select('players')
                .eq('class_key', classKey)
                .maybeSingle();

            if (data && Array.isArray(data.players)) {
                // กรองเฉพาะผู้เล่นที่ได้รับอนุมัติ
                playersList = data.players.filter(p => p.status !== 'pending');
                
                // เรียงลำดับจาก Progress % มากไปน้อย (ถ้าเท่ากันวัดจาก WPM)
                playersList.sort((a, b) => {
                    if ((b.progress || 0) === (a.progress || 0)) {
                        return (b.wpm || 0) - (a.wpm || 0);
                    }
                    return (b.progress || 0) - (a.progress || 0);
                });

                renderPodium();
                renderLeaderboardTable();
            } else {
                showEmptyState();
            }
        }
    } catch (e) {
        console.error("Fetch Summary Error:", e);
        showEmptyState();
    }
}

// 🏆 เรนเดอร์แท่นรับรางวัล TOP 3
function renderPodium() {
    const container = document.getElementById('podium-container');
    if (!container) return;

    if (playersList.length === 0) {
        container.innerHTML = `<div class="text-center text-muted font-mono py-3">ไม่มีข้อมูลผู้ชนะในการแข่งครั้งนี้</div>`;
        return;
    }

    const p1 = playersList[0];
    const p2 = playersList[1];
    const p3 = playersList[2];

    let html = '';

    // อันดับ 2
    if (p2) {
        html += `
            <div class="podium-card podium-2">
                <div class="podium-crown">🥈</div>
                <img src="${p2.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(p2.nickname_th || p2.name)}" class="podium-avatar">
                <h6 class="fw-bold text-white font-mono m-0 text-truncate">${p2.nickname_th || p2.name}</h6>
                <small class="text-subtle d-block font-mono">เลขที่ ${p2.number || '-'}</small>
                <div class="mt-2 badge bg-dark border border-secondary text-cyan font-mono">${p2.progress || 0}% | ${p2.wpm || 0} WPM</div>
            </div>
        `;
    }

    // อันดับ 1
    if (p1) {
        html += `
            <div class="podium-card podium-1">
                <div class="podium-crown">👑</div>
                <img src="${p1.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(p1.nickname_th || p1.name)}" class="podium-avatar" style="width:75px; height:75px; border-color:#f59e0b;">
                <h5 class="fw-bold text-warning font-mono m-0 text-truncate">${p1.nickname_th || p1.name}</h5>
                <small class="text-subtle d-block font-mono">เลขที่ ${p1.number || '-'}</small>
                <div class="mt-2 badge bg-warning text-dark font-mono fs-6 fw-bold">${p1.progress || 0}% | ${p1.wpm || 0} WPM</div>
            </div>
        `;
    }

    // อันดับ 3
    if (p3) {
        html += `
            <div class="podium-card podium-3">
                <div class="podium-crown">🥉</div>
                <img src="${p3.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(p3.nickname_th || p3.name)}" class="podium-avatar">
                <h6 class="fw-bold text-white font-mono m-0 text-truncate">${p3.nickname_th || p3.name}</h6>
                <small class="text-subtle d-block font-mono">เลขที่ ${p3.number || '-'}</small>
                <div class="mt-2 badge bg-dark border border-secondary text-warning font-mono">${p3.progress || 0}% | ${p3.wpm || 0} WPM</div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// 📊 เรนเดอร์ตารางสรุปผลทั้งหมด
function renderLeaderboardTable() {
    const tbody = document.getElementById('leaderboard-tbody');
    const countEl = document.getElementById('total-players-count');

    if (countEl) countEl.innerText = `${playersList.length} คน`;

    if (!tbody) return;

    if (playersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">ไม่พบข้อมูลผู้เข้าแข่งขัน</td></tr>`;
        return;
    }

    tbody.innerHTML = playersList.map((p, idx) => {
        const rank = idx + 1;
        let rankBadge = `<span class="badge bg-dark border border-secondary text-subtle font-mono">${rank}</span>`;
        
        if (rank === 1) rankBadge = `<span class="badge bg-warning text-dark font-mono fw-bold">🥇 1</span>`;
        else if (rank === 2) rankBadge = `<span class="badge bg-secondary text-white font-mono fw-bold">🥈 2</span>`;
        else if (rank === 3) rankBadge = `<span class="badge bg-danger text-white font-mono fw-bold">🥉 3</span>`;

        const isFinished = p.progress >= 100;

        return `
            <tr>
                <td class="text-center">${rankBadge}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="${p.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(p.nickname_th || p.name)}" class="rounded-circle" style="width:32px; height:32px; object-fit:cover;">
                        <span class="fw-bold text-white">${p.nickname_th || p.name} <small class="text-subtle fw-normal">(เลขที่ ${p.number || '-'})</small></span>
                    </div>
                </td>
                <td class="text-center">
                    <div class="progress bg-dark m-auto" style="height: 12px; max-width: 120px;">
                        <div class="progress-bar ${isFinished ? 'bg-success' : 'bg-cyan'}" style="width: ${p.progress || 0}%;"></div>
                    </div>
                    <small class="text-subtle">${p.progress || 0}%</small>
                </td>
                <td class="text-center fw-bold text-warning">${p.wpm || 0}</td>
                <td class="text-center">
                    ${isFinished 
                        ? `<span class="badge bg-success font-mono">FINISH 🏁</span>` 
                        : `<span class="badge bg-dark border border-secondary text-subtle font-mono">FINISHED</span>`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

function showEmptyState() {
    const container = document.getElementById('podium-container');
    const tbody = document.getElementById('leaderboard-tbody');

    if (container) container.innerHTML = `<div class="text-center text-subtle font-mono py-3">ไม่มีข้อมูลผู้เข้าร่วมการแข่งขัน</div>`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted font-mono">ไม่พบข้อมูลคะแนนการแข่งขัน</td></tr>`;
}