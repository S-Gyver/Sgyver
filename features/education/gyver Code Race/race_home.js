let html5QrCodeScanner = null;

document.addEventListener('DOMContentLoaded', () => {
    // ผูก Event Listener สำรองสำหรับ Quick Join
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

// 🚀 ฟังก์ชันสำหรับกด Join ห้องปกติ
function handleJoinRoom(e) {
    if (e) e.preventDefault();
    const codeInput = document.getElementById('room-code-input');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    
    if (!code) {
        alert('กรุณากรอกรหัสห้องก่อนครับ!');
        return;
    }

    window.location.href = `student/student_lobby.html?room=${code}`;
}

// 📷 เปิด Modal สแกน QR Code
function openQRCamera() {
    const modalEl = document.getElementById('qrScannerModal');
    if (!modalEl) return;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    setTimeout(() => {
        startQrScanner();
    }, 300);
}

// 🚀 เริ่มทำงานกล้องอ่าน QR Code
function startQrScanner() {
    if (html5QrCodeScanner) {
        stopQrScanner();
    }

    if (typeof Html5Qrcode === 'undefined') {
        alert('⚠️ ระบบสแกน QR Code ยังโหลดไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง');
        return;
    }

    html5QrCodeScanner = new Html5Qrcode("qr-reader");

    const config = { 
        fps: 10, 
        qrbox: { width: 220, height: 220 } 
    };

    html5QrCodeScanner.start(
        { facingMode: "environment" }, 
        config, 
        onQrCodeScanSuccess, 
        onQrCodeScanError
    ).catch(err => {
        console.error("Camera access error:", err);
        alert("⚠️ ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์การใช้งานกล้องในเบราว์เซอร์ครับ");
    });
}

// ✅ เมื่อสแกน QR Code สำเร็จ
function onQrCodeScanSuccess(decodedText) {
    stopQrScanner();

    // 1. กรณี QR Code เป็น Link แบบเต็ม (เช่น https://.../student_lobby.html?room=8090)
    if (decodedText.includes("room=")) {
        window.location.href = decodedText;
        return;
    }

    // 2. กรณี QR Code เป็นรหัสห้อง 4 หลัก (เช่น 8090)
    const cleanRoomCode = decodedText.trim().toUpperCase();
    if (cleanRoomCode) {
        window.location.href = `student/student_lobby.html?room=${cleanRoomCode}`;
    } else {
        alert("❌ QR Code ไม่ถูกต้อง กรุณาสแกนใหม่อีกครั้ง");
        openQRCamera();
    }
}

function onQrCodeScanError(errorMessage) {
    // อยู่ระหว่างค้นหา QR Code
}

// 🛑 ปิดกล้องและปิด Modal
function closeQRCamera() {
    stopQrScanner();

    const modalEl = document.getElementById('qrScannerModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

function stopQrScanner() {
    if (html5QrCodeScanner) {
        html5QrCodeScanner.stop().then(() => {
            html5QrCodeScanner.clear();
            html5QrCodeScanner = null;
        }).catch(err => {
            console.warn("Stop scanner warning:", err);
            html5QrCodeScanner = null;
        });
    }
}