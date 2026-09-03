// 🔍 GYVER WORKSPACE - PHOTO ZOOM COMPONENT MODULE

// สร้างโครงสร้าง HTML Overlay อัตโนมัติเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('gyver-photozoom-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'gyver-photozoom-overlay';
        overlay.className = 'photozoom-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) closePhotoZoom();
        };

        overlay.innerHTML = `
            <div class="photozoom-container">
                <button class="photozoom-close-btn" onclick="closePhotoZoom()"><i class="bi bi-x-lg"></i></button>
                <img id="gyver-photozoom-img" class="photozoom-img" src="" alt="Zoomed Photo">
                <div id="gyver-photozoom-caption" class="photozoom-caption d-none"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        // รองรับการกดปุ่ม ESC เพื่อปิด
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closePhotoZoom();
        });
    }
});

/**
 * 🔍 ฟังก์ชันเปิดซูมดูรูปภาพ
 * @param {string} imageUrl - URL ของรูปภาพที่ต้องการซูม
 * @param {string} captionText - คำอธิบายรูปภาพ (Optional)
 */
function openPhotoZoom(imageUrl, captionText = '') {
    if (!imageUrl) return;

    let overlay = document.getElementById('gyver-photozoom-overlay');
    const imgEl = document.getElementById('gyver-photozoom-img');
    const captionEl = document.getElementById('gyver-photozoom-caption');

    imgEl.src = imageUrl;

    if (captionText) {
        captionEl.innerText = captionText;
        captionEl.classList.remove('d-none');
    } else {
        captionEl.classList.add('d-none');
    }

    overlay.classList.add('active');
}

/**
 * ❌ ปิดหน้าต่างซูมรูปภาพ
 */
function closePhotoZoom() {
    const overlay = document.getElementById('gyver-photozoom-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}