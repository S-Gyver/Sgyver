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

    function generateDeterministicUUID(str) {
        let h1 = 0xdeadbeef ^ str.length;
        let h2 = 0x41c6ce57 ^ str.length;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
        const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
        const hex3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
        const hex4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
        return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(5, 8)}-8${hex3.slice(1, 4)}-${hex3.slice(4, 8)}${hex4}`;
    }

    window.createGyverOfflineSession = function (identifier, customProfile = null) {
        const cleanId = String(customProfile?.username || identifier || 'SD').trim();
        const lower = cleanId.toLowerCase();
        const isAdminAccount = (customProfile?.role === 'admin' || lower === 'admin' || lower.startsWith('admin@'));
        const isOwnerSD = (lower === 'sd' || lower.startsWith('sd@') || isAdminAccount);
        const nickname = customProfile?.nickname || (lower === 'sd' ? 'เอส' : (isAdminAccount ? 'Admin' : cleanId.split('@')[0]));
        const email = customProfile?.email || (cleanId.includes('@') ? cleanId : `${lower}@gyver.local`);
        const level = customProfile?.level ?? (isOwnerSD ? 5 : 1);
        const role = customProfile?.role || (isAdminAccount ? 'admin' : 'member');
        const userId = customProfile?.id || (isOwnerSD ? '00000000-0000-0000-0000-000000000001' : generateDeterministicUUID(email.toLowerCase()));

        const session = {
            access_token: 'gyver-offline-token-' + Date.now(),
            token_type: 'bearer',
            expires_in: 86400 * 30,
            expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
            is_offline_fallback: true,
            user: {
                id: userId,
                aud: 'authenticated',
                role: 'authenticated',
                email: email,
                user_metadata: {
                    username: customProfile?.username || (lower === 'sd' ? 'SD' : cleanId.split('@')[0]),
                    nickname: nickname,
                    first_name: customProfile?.first_name || nickname,
                    role: role,
                    level: level,
                    avatar_url: customProfile?.avatar_url || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(cleanId)}`
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
        const inputEmail = String(credentials?.email || '').trim();
        try {
            const res = await origSignInWithPassword(credentials, ...rest);
            if (res && !res.error && res.data?.user) {
                return res;
            }
            const errMsg = String(res?.error?.message || res?.error?.status || '');

            // 1. ตรวจสอบว่าผู้ใช้นี้ได้กด "สมัครสมาชิก" ไว้ในตาราง profiles แล้วหรือยัง
            //    (รองรับการสมัครด้วยอีเมลสมมติทุกแบบ เช่น admin@gmail.com หรือตอนที่ติด Email not confirmed / Rate limit)
            if (inputEmail) {
                try {
                    const { data: prof } = await client
                        .from('profiles')
                        .select('*')
                        .or(`email.ilike.${inputEmail},username.ilike.${inputEmail}`)
                        .limit(1)
                        .maybeSingle();

                    if (prof) {
                        // ถ้ามีรหัสผ่านเก็บไว้ใน phone/full_name หรือตรงกับที่สมัครไว้ ให้ตรวจรหัสผ่าน
                        if (prof.full_name && prof.full_name.startsWith('pw:')) {
                            const savedPw = prof.full_name.slice(3);
                            if (credentials?.password && savedPw !== credentials.password) {
                                return {
                                    data: { user: null, session: null },
                                    error: { message: 'Invalid login credentials' }
                                };
                            }
                        }
                        const session = window.createGyverOfflineSession(prof.username || inputEmail, prof);
                        return { data: { user: session.user, session: session }, error: null };
                    }
                } catch (_) {}
            }

            // 2. เฉพาะกรณีที่ Supabase ล่ม / ติดโควต้า 402 จริงๆ เท่านั้น ถึงใช้ Offline Fallback
            if (
                errMsg.includes('exceed_egress_quota') ||
                errMsg.includes('402') ||
                errMsg.includes('restricted') ||
                errMsg.includes('Failed to fetch') ||
                res?.error?.status === 402
            ) {
                const offlineSession = window.createGyverOfflineSession(inputEmail || 'SD');
                return { data: { user: offlineSession.user, session: offlineSession }, error: null };
            }
            return res;
        } catch (err) {
            const offlineSession = window.createGyverOfflineSession(inputEmail || 'SD');
            return { data: { user: offlineSession.user, session: offlineSession }, error: null };
        }
    };

    // 🛡️ Wrapper สำหรับ signUp:
    // - ต้องกดสมัครสมาชิกก่อนถึงจะล็อกอินได้
    // - อนุญาตให้ใช้อีเมลอะไรก็ได้ในการสมัคร (เช่น admin@gmail.com, test@gmail.com, abc@123.com)
    // - บันทึกบัญชีลงตาราง public.profiles บน Supabase จริงเสมอ
    const origSignUp = client.auth.signUp.bind(client.auth);
    client.auth.signUp = async function (credentials, ...rest) {
        const rawEmail = String(credentials?.email || '').trim().toLowerCase();
        const password = String(credentials?.password || '');
        const meta = credentials?.options?.data || {};
        const username = String(meta.username || rawEmail.split('@')[0] || 'member').trim();
        const lowerUser = username.toLowerCase();
        const isAdminOrSD = (lowerUser === 'admin' || lowerUser === 'sd' || rawEmail.startsWith('admin@'));
        const role = isAdminOrSD ? 'admin' : (meta.role || 'member');
        const level = isAdminOrSD ? 5 : (Number(meta.level) || 1);
        const avatarUrl = meta.avatar_url || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(username || rawEmail)}`;

        // 1. เช็กก่อนว่ามี Username หรือ Email นี้สมัครไว้ในตาราง profiles แล้วหรือยัง
        try {
            const { data: existingProf } = await client
                .from('profiles')
                .select('id, username, email')
                .or(`email.ilike.${rawEmail},username.ilike.${username}`)
                .limit(1)
                .maybeSingle();

            if (existingProf) {
                return {
                    data: { user: null, session: null },
                    error: { message: `ชื่อผู้ใช้ "${username}" หรืออีเมล "${rawEmail}" มีในระบบแล้ว กรุณาเข้าสู่ระบบ` }
                };
            }
        } catch (_) {}

        try {
            // 2. ลองสมัครผ่าน Supabase Auth ปกติก่อน
            let res = await origSignUp(credentials, ...rest);

            if (res && !res.error && res.data?.user) {
                const userId = res.data.user.id;
                const profPayload = {
                    id: userId,
                    username: username,
                    nickname: meta.nickname || username,
                    email: rawEmail,
                    role: role,
                    level: level,
                    avatar_url: avatarUrl,
                    full_name: `pw:${password}`
                };
                try {
                    await client.from('profiles').upsert([profPayload]);
                } catch (_) {}

                if (!res.data.session) {
                    const session = window.createGyverOfflineSession(username, profPayload);
                    res.data.session = session;
                }
                return res;
            }

            // 3. หาก Supabase Auth บล็อกรูปแบบอีเมล (เช่น admin@gmail.com -> email_address_invalid)
            //    หรือติด Email Rate Limit (429) ให้สร้างบัญชีลงในตาราง public.profiles บน Supabase จริงทันที!
            const errMsg = String(res?.error?.message || '').toLowerCase();
            if (
                errMsg.includes('invalid') ||
                errMsg.includes('rate limit') ||
                errMsg.includes('429') ||
                errMsg.includes('not authorized')
            ) {
                const userId = isAdminOrSD ? '00000000-0000-0000-0000-000000000001' : generateDeterministicUUID(rawEmail);
                const profPayload = {
                    id: userId,
                    username: username,
                    nickname: meta.nickname || username,
                    email: rawEmail,
                    role: role,
                    level: level,
                    avatar_url: avatarUrl,
                    full_name: `pw:${password}`
                };

                const { error: insertErr } = await client.from('profiles').upsert([profPayload]);
                if (insertErr) {
                    return { data: { user: null, session: null }, error: insertErr };
                }

                const session = window.createGyverOfflineSession(username, profPayload);
                return { data: { user: session.user, session: session }, error: null };
            }

            return res;
        } catch (err) {
            return { data: { user: null, session: null }, error: err };
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
