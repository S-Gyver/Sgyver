// 🔔 GYVER WORKSPACE - TOAST COMPONENT MODULE

// สร้าง Container อัตโนมัติเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('gyver-toast-container')) {
        const container = document.createElement('div');
        container.id = 'gyver-toast-container';
        document.body.appendChild(container);
    }
});

/**
 * 📣 ฟังก์ชันหลักสำหรับเรียกแสดง Toast แจ้งเตือน
 * @param {string} type - ชนิดการแจ้งเตือน ('success', 'error', 'warning', 'info')
 * @param {string} title - หัวข้อข้อความ
 * @param {string} message - รายละเอียดข้อความ
 * @param {number} duration - ระยะเวลาแสดงผล (มิลลิวินาที) เช่น 3000 = 3 วินาที
 */
function showToast(type = 'success', title = 'แจ้งเตือน', message = '', duration = 3000) {
    let container = document.getElementById('gyver-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'gyver-toast-container';
        document.body.appendChild(container);
    }

    // ไอคอนตามประเภท
    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `gyver-toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="bi ${icons[type] || icons.info}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" onclick="closeToast(this.parentElement)"><i class="bi bi-x"></i></button>
    `;

    container.appendChild(toast);

    // ซ่อนอัตโนมัติตามเวลาที่กำหนด
    setTimeout(() => {
        closeToast(toast);
    }, duration);
}

function closeToast(toastElement) {
    if (!toastElement || toastElement.classList.contains('hide')) return;
    toastElement.classList.add('hide');
    toastElement.addEventListener('animationend', () => {
        toastElement.remove();
    });
}