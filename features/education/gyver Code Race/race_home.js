let html5QrCodeScanner = null;

document.addEventListener('DOMContentLoaded', () => {
    const quickJoinBtn = document.getElementById('btn-quick-join');
    const quickRoomInput = document.getElementById('quick-room-code');

    if (quickJoinBtn && quickRoomInput) {
        quickJoinBtn.addEventListener('click', () => {
            const roomCode = quickRoomInput.value.trim().toUpperCase();
            if (!roomCode) {
                showCyberAlert('ข้อผิดพลาด', 'กรุณากรอกรหัสห้องก่อนครับ!', 'warning');
                return;
            }
            validateRoomAndRedirect(roomCode);
        });

        quickRoomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                quickJoinBtn.click();
            }
        });
    }
});

// 🟢 1. สั่งโชว์ Cyberpunk Alert Modal แทน alert() ดั้งเดิม
function showCyberAlert(title, message, type = 'warning') {
    const titleEl = document.getElementById('cyber-alert-title');
    const msgEl = document.getElementById('cyber-alert-message');
    const iconEl = document.getElementById('cyber-alert-icon');
    const modalEl = document.getElementById('cyberAlertModal');

    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;
    
    if (iconEl) {
        if (type === 'danger') {
            iconEl.innerHTML = `<i class="bi bi-x-circle-fill text-danger"></i>`;
            if (titleEl) titleEl.className = "fw-bold text-danger mb-2";
        } else {
            iconEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-warning"></i>`;
            if (titleEl) titleEl.className = "fw-bold text-warning mb-2";
        }
    }

    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        alert(`${title}: ${message}`);
    }
}

// 🟢 2. เช็กความมีอยู่จริงของห้องในตาราง lobbies ก่อนพาไปหน้า student_lobby
async function validateRoomAndRedirect(roomCode) {
    if (!roomCode) {
        showCyberAlert("แจ้งเตือน", "กรุณากรอกรหัสห้องก่อนครับ!", "warning");
        return;
    }

    const submitBtn = document.querySelector('#join-room-form button[type="submit"]');
    let originalText = '';
    if (submitBtn) {
        originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> เช็กห้อง...`;
    }

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let { data: lobbyData, error } = await supabaseClient
                .from('lobbies')
                .select('room_code, status')
                .eq('room_code', roomCode)
                .maybeSingle();

            // 🛑 ถ้าไม่พบห้องในฐานข้อมูล lobbies
            if (error || !lobbyData) {
                showCyberAlert("ไม่พบห้องแข่งขัน", `ไม่พบห้องหมายเลข "${roomCode}" ในระบบ กรุณาตรวจสอบรหัสห้อง หรือรอคุณครูเปิดห้องก่อนครับ`, "danger");
                resetSubmitBtn(submitBtn, originalText);
                return;
            }
        }
    } catch (err) {
        console.error("Check lobby error:", err);
    }

    // ✅ พบห้องแข่งขันจริง พาเข้าสู่หน้าตั้งค่าโปรไฟล์นักเรียน
    window.location.href = `student/student_lobby.html?room=${roomCode}`;
}

function resetSubmitBtn(btn, text) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = text;
    }
}

// 🚀 ฟังก์ชันกดปุ่ม JOIN หน้าแรก
function handleJoinRoom(e) {
    if (e) e.preventDefault();
    const codeInput = document.getElementById('room-code-input');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    
    validateRoomAndRedirect(code);
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
        showCyberAlert("ระบบขัดข้อง", "ระบบสแกน QR Code ยังโหลดไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง", "danger");
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
        showCyberAlert("กล้องขัดข้อง", "ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์การใช้งานกล้องในเบราว์เซอร์ครับ", "danger");
    });
}

// ✅ เมื่อสแกน QR Code สำเร็จ
function onQrCodeScanSuccess(decodedText) {
    stopQrScanner();

    let extractedRoomCode = '';

    if (decodedText.includes("room=")) {
        const urlParams = new URLSearchParams(decodedText.split('?')[1]);
        extractedRoomCode = (urlParams.get('room') || '').trim().toUpperCase();
    } else {
        extractedRoomCode = decodedText.trim().toUpperCase();
    }

    if (extractedRoomCode) {
        validateRoomAndRedirect(extractedRoomCode);
    } else {
        showCyberAlert("QR Code ไม่ถูกต้อง", "QR Code ไม่ถูกต้อง กรุณาสแกนใหม่อีกครั้ง", "danger");
        openQRCamera();
    }
}

function onQrCodeScanError(errorMessage) {
    // อยู่ระหว่างค้นหา QR Code
}

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