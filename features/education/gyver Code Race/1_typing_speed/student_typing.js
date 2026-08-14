let targetCode = `num1 = int(input("กรอกตัวเลขที่ 1: "))
num2 = int(input("กรอกตัวเลขที่ 2: "))
print("ผลรวม =", num1 + num2)`;

let startTime = null;
let currentGold = 0;
let lastProgressMilestone = 0;
let progressPercent = 0;

document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('typing-input');
    const targetDisplay = document.getElementById('target-code-display');

    if (targetDisplay) {
        targetDisplay.innerText = targetCode;
        document.getElementById('char-count').innerText = `0 / ${targetCode.length} CHARS`;

        // 🚫 1. ป้องกันการลากข้อความออกจากกล่องโจทย์ (Drag Start)
        targetDisplay.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        });

        // 🚫 2. ป้องกันการคลิกขวาที่กล่องโจทย์
        targetDisplay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }

    if (inputArea) {
        // 🚫 3. ป้องกันการลอยข้อความมาหย่อนใส่ช่องพิมพ์ (Drop)
        inputArea.addEventListener('drop', (e) => {
            e.preventDefault();
            addCombatLog("⚠️ ระบบดักจับ: ไม่อนุญาตให้ลากข้อความมาวาง (Drag & Drop)!");
            return false;
        });

        // 🚫 4. ป้องกันการลากผ่านช่องพิมพ์ (Drag Over)
        inputArea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        // 🚫 5. ป้องกันการกด Ctrl+V / Ctrl+C / Ctrl+X
        inputArea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                addCombatLog("⚠️ ระบบดักจับ: ไม่อนุญาตให้ใช้ Copy-Paste!");
            }
        });

        // 🚫 6. ป้องกันการคลิกขวาแล้วกด Paste
        inputArea.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // 🚫 7. ดักจับ Event paste เผื่อใช้วิธีอื่น
        inputArea.addEventListener('paste', (e) => {
            e.preventDefault();
            addCombatLog("⚠️ ระบบดักจับ: ไม่อนุญาตให้ใช้วิธี Paste!");
        });

        inputArea.addEventListener('input', handleTypingCheck);
    }
});

function handleTypingCheck() {
    const inputArea = document.getElementById('typing-input');
    const userText = inputArea.value;
    const statusText = document.getElementById('error-status-text');
    const progressBar = document.getElementById('progress-bar-fill');

    if (!startTime && userText.length > 0) {
        startTime = new Date();
    }

    document.getElementById('char-count').innerText = `${userText.length} / ${targetCode.length} CHARS`;

    if (targetCode.startsWith(userText)) {
        inputArea.classList.remove('is-wrong');
        statusText.className = "status-indicator text-success";
        statusText.innerHTML = `<span class="dot bg-success"></span> พิมพ์ตรงตามต้นแบบ`;

        progressPercent = Math.min(100, Math.floor((userText.length / targetCode.length) * 100));
        document.getElementById('progress-percent').innerText = `${progressPercent}%`;
        if (progressBar) progressBar.style.width = `${progressPercent}%`;

        if (startTime && userText.length > 0) {
            const timeDiffSec = (new Date() - startTime) / 1000 / 60;
            const wpm = Math.round((userText.length / 5) / (timeDiffSec || 0.01));
            document.getElementById('wpm-counter').innerText = wpm;
        }

        // แจก Gold ทุกๆ 10%
        const currentMilestone = Math.floor(progressPercent / 10);
        if (currentMilestone > lastProgressMilestone) {
            const earned = (currentMilestone - lastProgressMilestone) * 3;
            currentGold += earned;
            lastProgressMilestone = currentMilestone;
            document.getElementById('gold-count').innerText = currentGold;
            addCombatLog(`🎉 พิมพ์ถึง ${currentMilestone * 10}% ได้รับ +${earned} GOLD!`);
        }

        if (progressPercent === 100) {
            addCombatLog("🏁 เข้าเส้นชัยเรียบร้อยแล้ว!");
        }

    } else {
        inputArea.classList.add('is-wrong');
        statusText.className = "status-indicator text-danger";
        statusText.innerHTML = `<span class="dot bg-danger"></span> พิมพ์ผิดตัวอักษร! กรุณาแก้ไข`;
    }
}

function buyCard(cardType, price) {
    if (currentGold < price) {
        alert("❌ Gold ไม่เพียงพอ!");
        return;
    }

    currentGold -= price;
    document.getElementById('gold-count').innerText = currentGold;

    if (cardType === 'boost') {
        progressPercent = Math.min(100, progressPercent + 10);
        document.getElementById('progress-percent').innerText = `${progressPercent}%`;
        document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;
        addCombatLog("⚡ NITRO BOOST ทำงาน! ระยะทาง +10%");
    } else {
        addCombatLog(`🛍️ ซื้อการ์ด ${cardType.toUpperCase()} สำเร็จ!`);
    }
}

function addCombatLog(msg) {
    const box = document.getElementById('combat-log-box');
    if (box) {
        const item = document.createElement('div');
        item.className = 'log-entry';
        item.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString('th-TH')}]</span> ${msg}`;
        box.prepend(item);
    }
}

// ฟังก์ชันประมวลผลเมื่อนักเรียนตอบคำถามกวนใจผิด
function handleQuizAnswerWrong(questionDifficulty) {
    // กำหนดเปอร์เซ็นต์ย้อนถอยหลังตามความยาก
    let rollbackPercent = 10;
    if (questionDifficulty === 'easy') rollbackPercent = 15;      // ข้อง่ายโดนย้อนเยอะ
    else if (questionDifficulty === 'medium') rollbackPercent = 10;
    else if (questionDifficulty === 'hard') rollbackPercent = 5;  // ข้อยากโดนย้อนน้อย

    // คำนวณเปอร์เซ็นต์ก้าวหน้าใหม่
    progressPercent = Math.max(0, progressPercent - rollbackPercent);
    
    // คำนวณความยาวตัวอักษรใหม่ตามเปอร์เซ็นต์ที่เหลือ
    const newCharLength = Math.floor((targetCode.length * progressPercent) / 100);
    
    // ตัดข้อความในช่องพิมพ์ถอยหลังกลับไป
    const inputArea = document.getElementById('typing-input');
    if (inputArea) {
        inputArea.value = targetCode.substring(0, newCharLength);
    }

    // อัปเดต Progress Bar หน้าจอ
    document.getElementById('progress-percent').innerText = `${progressPercent}%`;
    document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;

    addCombatLog(`💥 ตอบผิด! [ระดับ ${questionDifficulty.toUpperCase()}] โดนลงโทษย้อนถอยหลัง -${rollbackPercent}% (ต้องพิมพ์ใหม่!)`);
}