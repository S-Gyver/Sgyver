document.addEventListener('DOMContentLoaded', async () => {
    await fetchActivityLogs();
});

async function fetchActivityLogs() {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;

    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) {
            window.location.href = '../login/login.html';
            return;
        }

        const { data: logs, error } = await supabaseClient
            .from('activity_logs')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) throw error;

        if (!logs || logs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted py-4">
                        ยังไม่มีประวัตีกิจกรรมล่าสุด
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = logs.map(item => {
            const dateObj = new Date(item.created_at);
            const formattedDate = dateObj.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            let scoreBadge = '<span class="text-muted">-</span>';
            if (item.score_change > 0) {
                scoreBadge = `<span class="badge bg-success">+${item.score_change} pt</span>`;
            } else if (item.score_change < 0) {
                scoreBadge = `<span class="badge bg-danger">${item.score_change} pt</span>`;
            }

            return `
                <tr>
                    <td class="align-middle"><small class="text-muted font-mono">${formattedDate}</small></td>
                    <td class="align-middle">
                        <div class="fw-bold text-dark">${item.activity_type}</div>
                        <small class="text-secondary">${item.description || '-'}</small>
                    </td>
                    <td class="align-middle text-center">${scoreBadge}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Fetch activity logs error:", err);
    }
}