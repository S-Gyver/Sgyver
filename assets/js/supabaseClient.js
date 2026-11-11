const SUPABASE_URL = 'https://igiihteeeprpcxxlldkd.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';       

// ประกาศเป็นตัวแปร window เพื่อให้ทุกไฟล์ดึงไปใช้ได้ทันที
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: 'public' },
    global: {
        headers: {
            'Accept-Profile': 'public',
            'Content-Profile': 'public'
        }
    }
});

// ============================================================================
// 🛡️ Offline / Quota-Exceeded (HTTP 402) Fallback Auth Layer
// ช่วยให้เจ้าของระบบ (SD / Admin) และสมาชิกยังล็อกอินและใช้งานทุกเมนูได้
// แม้ในขณะที่ Supabase ติดลิมิต exceed_egress_quota (HTTP 402)
// ============================================================================
(function setupGyverOfflineAuthFallback() {
    const OFFLINE_SESSION_KEY = 'gyver_offline_session';
    const client = window.supabaseClient;
    if (!client || !client.auth) return;

    function getStoredOfflineSession() {
        try {
            const raw = localStorage.getItem(OFFLINE_SESSION_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.user && parsed.user.id) return parsed;
        } catch (_) {}
        return null;
    }

    window.createGyverOfflineSession = function (identifier) {
        const cleanId = String(identifier || 'SD').trim();
        const lower = cleanId.toLowerCase();
        const isAdminAccount = (lower === 'admin' || lower.startsWith('admin@'));
        const isOwnerSD = (lower === 'sd' || lower.startsWith('sd@') || isAdminAccount);
        const nickname = lower === 'sd' ? 'เอส' : (isAdminAccount ? 'Admin' : cleanId.split('@')[0]);
        const email = cleanId.includes('@') ? cleanId : `${lower}@gyver.local`;
        const level = isOwnerSD ? 5 : 4;
        const role = isAdminAccount ? 'admin' : 'member';

        const session = {
            access_token: 'gyver-offline-token-' + Date.now(),
            token_type: 'bearer',
            expires_in: 86400 * 30,
            expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
            is_offline_fallback: true,
            user: {
                id: isOwnerSD ? '00000000-0000-0000-0000-000000000001' : ('offline-' + lower.replace(/[^a-z0-9]/g, '')),
                aud: 'authenticated',
                role: 'authenticated',
                email: email,
                user_metadata: {
                    username: lower === 'sd' ? 'SD' : cleanId.split('@')[0],
                    nickname: nickname,
                    first_name: nickname,
                    role: role,
                    level: level
                },
                app_metadata: { provider: 'email' }
            }
        };

        try {
            localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(session));
            localStorage.setItem('gyver_user_level', String(level));
            if (isAdminAccount) {
                const adminSessionData = {
                    isLoggedIn: true,
                    id: session.user.id,
                    username: session.user.user_metadata.username,
                    name: nickname,
                    email: email,
                    role: 'admin',
                    level: level
                };
                sessionStorage.setItem('gyver_admin_session', JSON.stringify(adminSessionData));
                localStorage.setItem('gyver_admin_session', JSON.stringify(adminSessionData));
            }
        } catch (_) {}

        return session;
    };

    window.clearGyverOfflineSession = function () {
        try {
            localStorage.removeItem(OFFLINE_SESSION_KEY);
        } catch (_) {}
    };

    const origGetSession = client.auth.getSession.bind(client.auth);
    client.auth.getSession = async function (...args) {
        try {
            const res = await origGetSession(...args);
            if (res && res.data && res.data.session) {
                return res;
            }
        } catch (_) {}
        const offlineSession = getStoredOfflineSession();
        if (offlineSession) {
            return { data: { session: offlineSession }, error: null };
        }
        return { data: { session: null }, error: null };
    };

    const origGetUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = async function (...args) {
        try {
            const res = await origGetUser(...args);
            if (res && res.data && res.data.user) {
                return res;
            }
        } catch (_) {}
        const offlineSession = getStoredOfflineSession();
        if (offlineSession && offlineSession.user) {
            return { data: { user: offlineSession.user }, error: null };
        }
        return { data: { user: null }, error: null };
    };

    const origSignInWithPassword = client.auth.signInWithPassword.bind(client.auth);
    client.auth.signInWithPassword = async function (credentials, ...rest) {
        try {
            const res = await origSignInWithPassword(credentials, ...rest);
            if (res && !res.error && res.data?.user) {
                return res;
            }
            const errMsg = String(res?.error?.message || res?.error?.status || '');
            if (
                errMsg.includes('exceed_egress_quota') ||
                errMsg.includes('402') ||
                errMsg.includes('restricted') ||
                errMsg.includes('Failed to fetch') ||
                res?.error?.status === 402
            ) {
                const offlineSession = window.createGyverOfflineSession(credentials?.email || 'SD');
                return { data: { user: offlineSession.user, session: offlineSession }, error: null };
            }
            return res;
        } catch (err) {
            const offlineSession = window.createGyverOfflineSession(credentials?.email || 'SD');
            return { data: { user: offlineSession.user, session: offlineSession }, error: null };
        }
    };

    const origSignOut = client.auth.signOut.bind(client.auth);
    client.auth.signOut = async function (...args) {
        window.clearGyverOfflineSession();
        try {
            return await origSignOut(...args);
        } catch (_) {
            return { error: null };
        }
    };
})();
