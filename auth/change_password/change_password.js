async function handleChangePassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-new-password').value;

    if (newPass !== confirmPass) {
        return showToast('warning', 'รหัสผ่านไม่ตรงกัน', 'กรุณาตรวจสอบรหัสผ่านใหม่อีกครั้ง');
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (!error) {
        showToast('success', 'เปลี่ยนรหัสผ่านสำเร็จ!', 'รหัสผ่านใหม่ของคุณมีผลใช้งานทันที');
        document.getElementById('form-change-password').reset();
    } else {
        showToast('error', 'เกิดข้อผิดพลาด', error.message);
    }
}