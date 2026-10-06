/**
 * S-Gyver Assistant Content Script for S-Gyver Studio
 * Bridges the S-Gyver web application with the Chrome Extension
 */

console.log('⚡ [S-Gyver Assistant] Connected to S-Gyver Studio');

// 1. Tell S-Gyver Studio page that Extension is INSTALLED & ACTIVE
window.postMessage({ type: 'SGYVER_EXTENSION_STATUS', installed: true, version: '1.0.0' }, '*');

// Also set flag on document
document.documentElement.setAttribute('data-sgyver-extension-installed', 'true');

// 2. Listen to S-Gyver Page Commands (e.g. 1-Click Sync Button)
window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'SGYVER_TRIGGER_PULL_ORDERS') {
        console.log('🚀 [S-Gyver Assistant] Received 1-Click pull command from page');

        chrome.runtime.sendMessage({ action: 'PULL_ORDERS_FROM_BIGSELLER' }, (response) => {
            if (chrome.runtime.lastError) {
                window.postMessage({ 
                    type: 'SGYVER_SYNC_RESULT', 
                    success: false, 
                    message: 'ไม่สามารถติดต่อส่วนขยายเบราว์เซอร์ได้: ' + chrome.runtime.lastError.message 
                }, '*');
                return;
            }

            window.postMessage({
                type: 'SGYVER_SYNC_RESULT',
                success: response && response.success,
                orders: response ? response.orders : [],
                message: response ? response.message : ''
            }, '*');
        });
    } else if (event.data.type === 'SGYVER_CHECK_EXTENSION') {
        window.postMessage({ type: 'SGYVER_EXTENSION_STATUS', installed: true, version: '1.0.0' }, '*');
    }
});
