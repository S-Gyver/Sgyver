// ตั้งค่าการเชื่อมต่อ Supabase โปรเจกต์สิงคโปร์ของคุณ
const SUPABASE_URL = 'https://igiihteeeprpcxxlldkd.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';       
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const alertBox = document.getElementById('auth-alert');

function showAlert(message, type = 'danger') {
    alertBox.className = `alert alert-${type} py-2 small text-center`;
    alertBox.innerText = message;
    alertBox.classList.remove('d-none');
}

// 🔒 ระบบจดจำการล็อกอินถาวร: ถ้าตรวจพบเซสชันเดิมอยู่แล้ว ให้ผ่านเข้าสู่ระบบโดยตรง
async function checkExistingSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
}
checkExistingSession();

// 🔐 1. ระบบจัดการการเข้าสู่ระบบ (Login)
document.getElementById('form-login').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    const btnSubmit = document.getElementById('btn-login-submit');

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังตรวจสอบสิทธิ์...`;
    alertBox.classList.add('d-none');

    // เรียกใช้ระบบล็อกอินของ Supabase Auth (ตัว SDK จะเก็บบันทึก Session ให้อัตโนมัติบนเบราว์เซอร์)
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showAlert(`❌ เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>ลงชื่อเข้าใช้งาน`;
    } else {
        showAlert('🎉 ล็อกอินสำเร็จ! กำลังนำคุณเข้าสู่ระบบ...', 'success');
        
        // 🌟 เงื่อนไขพิเศษ: หากใช้บัญชีนี้ ให้ผูกสิทธิ์ Metadata Role เป็น 'admin' บนระบบ Supabase ทันที
        if (email === 's.gyver36@gmail.com') {
            await supabaseClient.auth.updateUser({
                data: { role: 'admin' }
            });
        }

        setTimeout(() => {
            const redirectUrl = sessionStorage.getItem('gyver_redirect_target') || 'index.html';
            sessionStorage.removeItem('gyver_redirect_target');
            window.location.href = redirectUrl;
        }, 1200);
    }
});

// 📝 2. ระบบจัดการการสมัครสมาชิก (Register)
document.getElementById('form-register').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    const confirmPassword = document.getElementById('reg-confirm-pass').value;
    const btnSubmit = document.getElementById('btn-reg-submit');

    if (password !== confirmPassword) {
        return showAlert('❌ รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้งครับ');
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังสมัครสมาชิก...`;
    alertBox.classList.add('d-none');

    // เรียกใช้ระบบสมัครสมาชิกของ Supabase Auth
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { role: 'user' } // สมาชิกทั่วไปสมัครใหม่จะได้สิทธิ์เป็น user
        }
    });

    if (error) {
        showAlert(`❌ สมัครสมาชิกไม่สำเร็จ: ${error.message}`);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-person-plus me-2"></i>ยืนยันการสมัครสมาชิก`;
    } else {
        if (data.user && data.session === null) {
            showAlert('✉️ สมัครสมาชิกเรียบร้อย! กรุณาเช็กกล่องข้อความในอีเมลของคุณเพื่อกดยืนยันตัวตนก่อนล็อกอินครับ', 'warning');
        } else {
            showAlert('🎉 สมัครสมาชิกและล็อกอินสำเร็จเรียบร้อย!', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        }
        document.getElementById('form-register').reset();
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-person-plus me-2"></i>ยืนยันการสมัครสมาชิก`;
    }
});