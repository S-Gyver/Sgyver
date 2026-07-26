// แสดงเวลาปัจจุบันเล็กๆ นุ่มๆ บนแถบหัวเว็บ
function updateTime() {
    const now = new Date();
    const timeDisplay = document.getElementById('current-time-display');
    if (timeDisplay) {
        timeDisplay.innerText = now.toLocaleDateString('th-TH', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
    }
}

// 🚪 ฟังก์ชันล็อกเอาต์ออกจากระบบส่วนกลางและเคลียร์สถานะบน Supabase Cloud
async function logoutMainSystem() {
    const SUPABASE_URL = 'https://igiihteeeprpcxxlldkd.supabase.co'; 
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';       
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    await client.auth.signOut();
    window.location.href = 'login.html';
}

window.onload = () => {
    updateTime();
    // สั่งรีเฟรชเวลาทุกๆ 1 นาทีให้เป็นปัจจุบันเสมอ
    setInterval(updateTime, 60000);
};