document.addEventListener('DOMContentLoaded', () => {
    const quickJoinBtn = document.getElementById('btn-quick-join');
    const quickRoomInput = document.getElementById('quick-room-code');

    if (quickJoinBtn && quickRoomInput) {
        quickJoinBtn.addEventListener('click', () => {
            const roomCode = quickRoomInput.value.trim().toUpperCase();
            if (!roomCode) {
                alert('กรุณากรอกรหัสห้องก่อนครับ!');
                return;
            }
            window.location.href = `student/student_lobby.html?room=${roomCode}`;
        });

        quickRoomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                quickJoinBtn.click();
            }
        });
    }
});