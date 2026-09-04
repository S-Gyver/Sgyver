let currentClassData = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) {
        alert('ไม่พบรหัสห้องเรียน กรุณาสแกน QR Code ใหม่อีกครั้ง');
        return;
    }

    const badgeEl = document.getElementById('room-code-badge');
    if (badgeEl) badgeEl.innerText = code;

    // 🔍 ตรวจสอบห้องเรียนใน Supabase
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('room_code', code)
        .maybeSingle();

    const nameEl = document.getElementById('room-name-display');
    const submitBtn = document.getElementById('submit-btn');

    if (error || !data) {
        if (nameEl) nameEl.innerText = 'ไม่พบห้องเรียนนี้';
        if (submitBtn) submitBtn.disabled = true;
    } else {
        currentClassData = data;
        if (nameEl) nameEl.innerText = data.class_name || 'ไม่มีชื่อห้อง';
    }
});

async function submitStudentName(e) {
    e.preventDefault();
    const nameInput = document.getElementById('student-name');
    const name = nameInput.value.trim();
    if (!name || !currentClassData) return;

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'กำลังบันทึก...';

    let currentStudents = Array.isArray(currentClassData.students) ? currentClassData.students : [];

    // 🛑 ตรวจสอบชื่อซ้ำ
    if (currentStudents.some(s => s.name === name)) {
        alert('ชื่อนี้มีอยู่ในห้องเรียนแล้วครับ!');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send-fill me-1"></i> ยืนยันเข้าร่วมห้อง';
        return;
    }

    // ➕ เพิ่มนักเรียนใหม่
    currentStudents.push({
        name: name,
        score: 0,
        spunCount: 0,
        image: `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(name)}`
    });

    // 💾 บันทึกกลับลง Supabase
    const { error } = await supabaseClient
        .from('classrooms')
        .update({ students: currentStudents })
        .eq('id', currentClassData.id);

    if (!error) {
        document.getElementById('join-form').classList.add('d-none');
        document.getElementById('result-success').classList.remove('d-none');
    } else {
        alert('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send-fill me-1"></i> ยืนยันเข้าร่วมห้อง';
    }
}