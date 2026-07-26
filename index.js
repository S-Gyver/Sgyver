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

// ระบบนับสถิติบันทึกจำนวนการกดเข้าแต่ละเมนูลงบนเครื่องเบราว์เซอร์
function countClick(menuName) {
    let currentCount = parseInt(localStorage.getItem(`gyver_click_${menuName}`) || 0);
    localStorage.setItem(`gyver_click_${menuName}`, currentCount + 1);
}

// ดึงตัวเลขสถิติจากเครื่องมาแสดงผลบริเวณ Footer หลังบ้าน
function showClickStats() {
    const wheelCount = localStorage.getItem('gyver_click_wheel') || 0;
    const adminCount = localStorage.getItem('gyver_click_admin') || 0;
    const statsText = document.getElementById('click-stats-text');
    if (statsText) {
        statsText.innerText = `สถิติกดใช้งาน: วงล้อ (${wheelCount} ครั้ง) | แอดมิน (${adminCount} ครั้ง)`;
    }
}

window.onload = () => {
    updateTime();
    // สั่งรีเฟรชเวลาทุกๆ 1 นาทีให้เป็นปัจจุบันเสมอ
    setInterval(updateTime, 60000);
    showClickStats();
};