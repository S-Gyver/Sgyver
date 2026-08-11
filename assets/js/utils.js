/**
 * แสดงเวลาปัจจุบันภาษาไทยบน HTML Element ที่กำหนด
 * @param {string} elementId - ID ของ HTML element ที่ต้องการแสดงผล (Default: 'current-time-display')
 */
function updateTime(elementId = 'current-time-display') {
    const now = new Date();
    const timeDisplay = document.getElementById(elementId);
    if (timeDisplay) {
        timeDisplay.innerText = now.toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}