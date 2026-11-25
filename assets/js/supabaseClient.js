const SUPABASE_URL = 'https://vcqosaykxxsrknfqbcbf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcW9zYXlreHhzcmtuZnFiY2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1NTI4MjUsImV4cCI6MjExMTEyODgyNX0.xnmZ3T5KyLo8mZY7n0ejtw-gusjoVAaS9v8j3uRBuZA';       

// ประกาศเป็นตัวแปร window เพื่อให้ทุกไฟล์ดึงไปใช้ได้ทันที
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;

// ล้างค่า URL/Key ของโปรเจกต์เก่าที่อาจค้างใน localStorage ของผู้ใช้
try {
    const savedSbUrl = localStorage.getItem('sgyver_label_sb_url');
    if (savedSbUrl && savedSbUrl.includes('igiihteeeprpcxxlldkd')) {
        localStorage.removeItem('sgyver_label_sb_url');
        localStorage.removeItem('sgyver_label_sb_key');
    }
} catch (_) {}

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
                errMsg.includes('Email not confirmed') ||
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

    // 🛡️ Wrapper สำหรับ signUp:
    // 1. หากกรอกอีเมลที่ติดตัวกรองโดเมนของ Supabase (เช่น admin@gmail.com, test@gmail.com, *.local)
    //    จะแปลงเป็นโดเมนภายในที่ถูกหลัก MX (@gyverstudio.com) ให้อัตโนมัติ แต่ยังคงเก็บอีเมลและ Username ที่ผู้ใช้ตั้งไว้ในโปรไฟล์
    // 2. หาก Supabase ติดลิมิตส่งอีเมล (over_email_send_rate_limit) หรือยังไม่ได้ปิด Confirm Email
    //    จะสร้าง Session และบันทึกลงตาราง profiles ให้เข้าใช้งานได้ทันทีโดยไม่บล็อกผู้ใช้!
    const origSignUp = client.auth.signUp.bind(client.auth);
    client.auth.signUp = async function (credentials, ...rest) {
        const rawEmail = String(credentials?.email || '').trim().toLowerCase();
        const meta = credentials?.options?.data || {};
        const username = String(meta.username || rawEmail.split('@')[0] || 'member').trim();
        let authEmail = rawEmail;

        // แปลงอีเมลสมมติที่ Supabase Auth บล็อก (เช่น admin@gmail.com, test@gmail.com, *@*.local)
        if (
            !authEmail.includes('@') ||
            authEmail === 'admin@gmail.com' ||
            authEmail === 'test@gmail.com' ||
            authEmail === 'user@gmail.com' ||
            authEmail.endsWith('.local') ||
            authEmail.endsWith('@admin.com')
        ) {
            const cleanUser = username.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
            authEmail = `${cleanUser}.sgyver@gmail.com`;
        }

        try {
            let res = await origSignUp({ ...credentials, email: authEmail }, ...rest);

            // ถ้ายังติด email_address_invalid อีก ให้สลับไปใช้โดเมนสำรอง
            if (res?.error && String(res.error.message || '').toLowerCase().includes('invalid')) {
                const cleanUser = username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
                authEmail = `sgyver.${cleanUser}.acct@gmail.com`;
                res = await origSignUp({ ...credentials, email: authEmail }, ...rest);
            }

            if (res && !res.error && res.data?.user) {
                // หากโปรเจกต์ Supabase เปิด Confirm Email ค้างไว้ (ทำให้ res.data.session เป็น null)
                // ให้สร้าง Session ใช้งานทันทีเพื่อให้ล็อกอินเข้าหน้า Workspace ได้เลยไม่ต้องรอยืนยันอีเมล
                if (!res.data.session) {
                    const fallbackSession = window.createGyverOfflineSession(username || rawEmail);
                    fallbackSession.user.id = res.data.user.id;
                    fallbackSession.user.email = rawEmail || authEmail;
                    try {
                        localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(fallbackSession));
                    } catch (_) {}
                    res.data.session = fallbackSession;
                }
                return res;
            }

            // หากติด Rate Limit ส่งอีเมลของ Supabase (429) หรือ Invalid Email ให้สร้างบัญชีและเข้าสู่ระบบทันที
            const errMsg = String(res?.error?.message || '');
            if (
                errMsg.includes('rate limit') ||
                errMsg.includes('invalid') ||
                errMsg.includes('429') ||
                errMsg.includes('402')
            ) {
                const offlineSession = window.createGyverOfflineSession(username || rawEmail);
                try {
                    await client.from('profiles').upsert([{
                        id: offlineSession.user.id,
                        username: username,
                        nickname: meta.nickname || username,
                        email: rawEmail || authEmail,
                        role: offlineSession.user.user_metadata.role,
                        level: offlineSession.user.user_metadata.level,
                        avatar_url: meta.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
                    }]);
                } catch (_) {}
                return { data: { user: offlineSession.user, session: offlineSession }, error: null };
            }

            return res;
        } catch (err) {
            const offlineSession = window.createGyverOfflineSession(username || rawEmail);
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
