/**
 * ====================================================
 * 🚀 Gyver Studio - Classroom Screen Engine (JavaScript)
 * ClassroomScreen.com Inspired Interactive Widgets
 * ====================================================
 */

// Global State
let highestZIndex = 100;
const activeWidgets = {};
let audioCtx = null;

// Preset Wallpapers
const bgPresets = [
    { name: 'Mountain Sunset', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Lush Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Ocean Waves', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Minimal Dark', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Cozy Workspace', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Modern Classroom', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Pastel Gradient', color: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)' }
];

document.addEventListener('DOMContentLoaded', () => {
    initBackground();
    initScreenTitle();
    initLiveHeaderClock();
    renderBgPresets();

    // 🪟 Restore saved open widgets or initialize defaults
    restoreOpenWidgets();
});

function restoreOpenWidgets() {
    const savedWidgetsRaw = localStorage.getItem('cs_open_widgets');

    if (savedWidgetsRaw !== null) {
        try {
            const savedList = JSON.parse(savedWidgetsRaw);
            if (Array.isArray(savedList)) {
                if (savedList.length > 0) {
                    // Sort by zIndex so stacking order is preserved
                    savedList.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
                    savedList.forEach(item => {
                        if (item && item.type && widgetConfigs[item.type]) {
                            spawnWidget(item.type, null, item);
                        }
                    });
                    return;
                } else {
                    // User intentionally cleared all widgets, keep canvas clean
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to parse cs_open_widgets:', e);
        }
    }

    // Spawn default welcome widgets if first time visit
    if (!localStorage.getItem('cs_has_visited')) {
        localStorage.setItem('cs_has_visited', 'true');
        spawnWidget('clock', { left: 40, top: 40 });
        spawnWidget('traffic', { left: 420, top: 40 });
        spawnWidget('symbol', { left: 600, top: 40 });
        spawnWidget('text', { left: 40, top: 280 });
    } else {
        // Default widgets
        spawnWidget('clock', { left: 40, top: 40 });
        spawnWidget('text', { left: 40, top: 280 });
    }
}

// ====================================================
// 🎵 1. Web Audio Synthesizer (No external audio needed)
// ====================================================
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type) {
    try {
        const ctx = getAudioContext();
        if (type === 'beep') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } else if (type === 'dice') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(300 + Math.random() * 400, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'alarm') {
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(987.77, ctx.currentTime);
                    gain.gain.setValueAtTime(0.4, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.4);
                }, i * 200);
            }
        } else if (type === 'fanfare') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.4);
                }, idx * 120);
            });
        }
    } catch (e) {
        console.warn('Audio play error:', e);
    }
}

// ====================================================
// 🖼️ 2. Background Switcher Logic
// ====================================================
function initBackground() {
    const savedBg = localStorage.getItem('cs_bg');
    const savedName = localStorage.getItem('cs_custom_bg_name');
    const savedSize = localStorage.getItem('cs_bg_size') || 'cover';
    const savedPos = localStorage.getItem('cs_bg_pos') || 'center center';
    const savedMode = localStorage.getItem('cs_bg_fit_mode') || 'ambient';
    if (savedBg) {
        // If image was uploaded previously without raw cache, check if portrait and auto-convert to ambient
        if (savedBg.startsWith('data:image/') && !localStorage.getItem('cs_custom_bg_raw')) {
            const tempImg = new Image();
            tempImg.onload = function () {
                localStorage.setItem('cs_custom_bg_raw', savedBg);
                if (tempImg.height > tempImg.width * 1.05) {
                    const res = processBackgroundImage(tempImg, 'ambient');
                    applyBackground(res.dataUrl, res.bgSize, res.bgPos);
                    localStorage.setItem('cs_bg_fit_mode', 'ambient');
                    updateUploadedBgUI(res.dataUrl, savedName, 'ambient');
                    return;
                }
            };
            tempImg.src = savedBg;
        }

        applyBackground(savedBg, savedSize, savedPos);
        if (savedBg.startsWith('data:image/') || localStorage.getItem('cs_custom_bg_raw')) {
            updateUploadedBgUI(savedBg, savedName, savedMode);
        }
    } else {
        applyBackground(bgPresets[0].url);
    }
    initBgDropzone();
}

function applyBackground(val, bgSize, bgPos) {
    if (!val) return;
    const finalSize = bgSize || localStorage.getItem('cs_bg_size') || 'cover';
    const finalPos = bgPos || localStorage.getItem('cs_bg_pos') || 'center center';

    if (val.startsWith('http') || val.startsWith('data:') || val.includes('/')) {
        document.body.style.backgroundImage = `url('${val}')`;
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.backgroundSize = finalSize;
        document.body.style.backgroundPosition = finalPos;
        document.body.style.backgroundRepeat = 'no-repeat';
    } else {
        document.body.style.backgroundImage = val.includes('gradient') ? val : 'none';
        document.body.style.backgroundColor = val.includes('gradient') ? 'transparent' : val;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
    }
    localStorage.setItem('cs_bg', val);
    localStorage.setItem('cs_bg_size', finalSize);
    localStorage.setItem('cs_bg_pos', finalPos);

    // Update upload preview status badge if present
    const previewWrap = document.getElementById('bg-upload-preview-wrap');
    if (previewWrap) {
        const previewBadge = previewWrap.querySelector('small');
        if (previewBadge) {
            if (val.startsWith('data:image/')) {
                previewBadge.innerHTML = '<i class="bi bi-check-circle-fill"></i>กำลังใช้งานภาพนี้อยู่';
                previewBadge.className = 'text-success small d-flex align-items-center gap-1';
            } else {
                previewBadge.innerHTML = '<i class="bi bi-clock-history"></i>ภาพที่เคยอัปโหลดไว้';
                previewBadge.className = 'text-warning small d-flex align-items-center gap-1';
            }
        }
    }
}

function renderBgPresets() {
    const container = document.getElementById('bg-presets-grid');
    if (!container) return;
    container.innerHTML = bgPresets.map(preset => {
        const bgStyle = preset.url ? `background-image: url('${preset.url}')` : `background: ${preset.color}`;
        return `
            <div class="bg-preset-card" style="${bgStyle}" onclick="applyBackground('${preset.url || preset.color}', 'cover', 'center center'); highlightActiveBg(this)">
                <div class="bg-preset-label">${preset.name}</div>
            </div>
        `;
    }).join('');
}

function highlightActiveBg(card) {
    document.querySelectorAll('.bg-preset-card').forEach(c => c.classList.remove('active'));
    if (card) card.classList.add('active');
}

function setCustomBgUrl() {
    const url = document.getElementById('bg-custom-url-input').value.trim();
    if (url) {
        applyBackground(url, 'cover', 'center center');
        bootstrap.Modal.getInstance(document.getElementById('bgModal')).hide();
    }
}

function setCustomBgColor(color) {
    applyBackground(color, 'cover', 'center center');
}

function processBackgroundImage(img, mode) {
    const isPortrait = img.height > img.width * 1.05;
    const effectiveMode = mode || (isPortrait ? 'ambient' : 'cover');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (effectiveMode === 'ambient' && isPortrait) {
        // Mode 1: 16:9 widescreen composition with ambient blurred borders (doesn't cut off head/body)
        canvas.width = 1920;
        canvas.height = 1080;

        // A. Ambient soft blur from the same image
        ctx.save();
        ctx.filter = 'blur(40px) brightness(0.6) saturate(1.25)';
        const bgScale = Math.max(1920 / img.width, 1080 / img.height) * 1.15;
        const bgW = img.width * bgScale;
        const bgH = img.height * bgScale;
        ctx.drawImage(img, (1920 - bgW) / 2, (1080 - bgH) / 2, bgW, bgH);
        ctx.restore();

        // B. Dark gradient overlay for widgets readability
        const grad = ctx.createRadialGradient(960, 540, 250, 960, 540, 1150);
        grad.addColorStop(0, 'rgba(15, 23, 42, 0.15)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1920, 1080);

        // C. Center: Full crisp portrait photo uncropped (100% visible)
        const fitScale = Math.min(1040 / img.height, 1860 / img.width);
        const fitW = Math.round(img.width * fitScale);
        const fitH = Math.round(img.height * fitScale);
        const fitX = Math.round((1920 - fitW) / 2);
        const fitY = Math.round((1080 - fitH) / 2);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 45;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 15;
        ctx.drawImage(img, fitX, fitY, fitW, fitH);
        ctx.restore();

        // Elegant border frame
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(fitX, fitY, fitW, fitH);

        return {
            dataUrl: canvas.toDataURL('image/jpeg', 0.88),
            fitMode: 'ambient',
            bgSize: 'cover',
            bgPos: 'center center'
        };
    } else {
        // Standard scaling to max 1920x1080
        const maxW = 1920;
        const maxH = 1080;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        let bgPos = 'center center';
        let bgSize = 'cover';
        if (effectiveMode === 'top') {
            bgPos = 'center top';
        } else if (effectiveMode === 'contain') {
            bgSize = 'contain';
        }

        return {
            dataUrl: canvas.toDataURL('image/jpeg', 0.85),
            fitMode: effectiveMode,
            bgSize: bgSize,
            bgPos: bgPos
        };
    }
}

function updateUploadedBgUI(dataUrl, fileName, fitMode) {
    const wrap = document.getElementById('bg-upload-preview-wrap');
    const dropzone = document.getElementById('bg-upload-dropzone');
    const img = document.getElementById('bg-upload-preview-img');
    const name = document.getElementById('bg-upload-preview-name');
    if (!wrap || !img) return;

    if (dataUrl && (dataUrl.startsWith('data:image/') || localStorage.getItem('cs_custom_bg_raw'))) {
        img.src = dataUrl;
        if (name) name.textContent = fileName || localStorage.getItem('cs_custom_bg_name') || 'รูปภาพจากเครื่องของคุณ';
        wrap.classList.remove('d-none');
        wrap.classList.add('d-flex');
        if (dropzone) dropzone.classList.add('d-none');

        // Update active fit mode button
        const mode = fitMode || localStorage.getItem('cs_bg_fit_mode') || 'ambient';
        document.querySelectorAll('#bg-fit-mode-group .btn').forEach(b => b.classList.remove('active', 'btn-info'));
        const activeBtn = document.getElementById(`fit-mode-${mode}`);
        if (activeBtn) activeBtn.classList.add('active', 'btn-info');
    } else {
        wrap.classList.add('d-none');
        wrap.classList.remove('d-flex');
        if (dropzone) dropzone.classList.remove('d-none');
    }
}

function changeUploadedBgFitMode(mode) {
    const rawData = localStorage.getItem('cs_custom_bg_raw') || localStorage.getItem('cs_bg');
    if (!rawData) return;

    const img = new Image();
    img.onload = function () {
        if (!localStorage.getItem('cs_custom_bg_raw')) {
            localStorage.setItem('cs_custom_bg_raw', rawData);
        }
        const res = processBackgroundImage(img, mode);
        applyBackground(res.dataUrl, res.bgSize, res.bgPos);
        localStorage.setItem('cs_bg_fit_mode', mode);

        document.querySelectorAll('#bg-fit-mode-group .btn').forEach(b => b.classList.remove('active', 'btn-info'));
        const activeBtn = document.getElementById(`fit-mode-${mode}`);
        if (activeBtn) activeBtn.classList.add('active', 'btn-info');

        if (typeof showDockToast === 'function') {
            const modeNames = {
                ambient: '✨ ปรับเป็น ขอบเบลอสวยงาม (เห็นครบทั้งตัว ไม่ตัดหัว)',
                top: '🔝 ปรับเป็น จัดชิดขอบบน (เน้นใบหน้า)',
                contain: '🖼️ ปรับเป็น พอดีทั้งรูป',
                cover: '📐 ปรับเป็น ขยายเต็มจอ (Cover)'
            };
            showDockToast(modeNames[mode] || 'เปลี่ยนสไตล์การจัดวางแล้ว');
        }
    };
    img.src = rawData;
}

function handleBgFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            // Compress raw image to max 1280px to safely store in localStorage
            const rawCanvas = document.createElement('canvas');
            const rawScale = Math.min(1280 / Math.max(img.width, img.height), 1);
            rawCanvas.width = Math.round(img.width * rawScale);
            rawCanvas.height = Math.round(img.height * rawScale);
            const rawCtx = rawCanvas.getContext('2d');
            rawCtx.drawImage(img, 0, 0, rawCanvas.width, rawCanvas.height);
            const rawDataUrl = rawCanvas.toDataURL('image/jpeg', 0.82);

            // Determine default mode: if portrait, default to 'ambient' to avoid cutting off heads!
            const defaultMode = (img.height > img.width * 1.05) ? 'ambient' : 'cover';
            const res = processBackgroundImage(img, defaultMode);

            try {
                localStorage.setItem('cs_custom_bg_raw', rawDataUrl);
                localStorage.setItem('cs_custom_bg_name', file.name);
                localStorage.setItem('cs_bg_fit_mode', defaultMode);

                applyBackground(res.dataUrl, res.bgSize, res.bgPos);
                updateUploadedBgUI(res.dataUrl, file.name, defaultMode);
                highlightActiveBg(null);

                const modalEl = document.getElementById('bgModal');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
                if (typeof showDockToast === 'function') {
                    if (defaultMode === 'ambient') {
                        showDockToast('✨ ตรวจพบภาพแนวตั้ง จัดวางแบบ "ขอบเบลอสวยงาม" เพื่อไม่ให้ตัดส่วนหัวแล้วครับ');
                    } else {
                        showDockToast('🖼️ อัปโหลดและเปลี่ยนภาพพื้นหลังเรียบร้อยแล้ว');
                    }
                }
            } catch (err) {
                console.error('Storage error:', err);
                alert('ไม่สามารถบันทึกรูปภาพได้ เนื่องจากขนาดไฟล์เกินขีดจำกัด');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeUploadedBg() {
    localStorage.removeItem('cs_custom_bg_name');
    localStorage.removeItem('cs_custom_bg_raw');
    localStorage.removeItem('cs_bg_fit_mode');
    updateUploadedBgUI(null);
    applyBackground(bgPresets[0].url, 'cover', 'center center');
    highlightActiveBg(document.querySelector('.bg-preset-card'));
    if (typeof showDockToast === 'function') {
        showDockToast('🔄 คืนค่าภาพพื้นหลังเริ่มต้นแล้ว');
    }
}

function initBgDropzone() {
    const dropzone = document.getElementById('bg-upload-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = '#00f2fe';
            dropzone.style.background = 'rgba(76, 201, 240, 0.12)';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'rgba(76, 201, 240, 0.4)';
            dropzone.style.background = 'rgba(255, 255, 255, 0.04)';
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleBgFileUpload({ target: { files: files } });
        }
    }, false);
}

// ====================================================
// 📌 3. Top Header Bar Logic (Title & Clock)
// ====================================================
function initScreenTitle() {
    const titleInput = document.getElementById('screen-title-input');
    const savedTitle = localStorage.getItem('cs_screen_title');
    if (titleInput) {
        if (savedTitle) titleInput.value = savedTitle;
        titleInput.addEventListener('change', () => {
            localStorage.setItem('cs_screen_title', titleInput.value.trim());
        });
    }
}

function initLiveHeaderClock() {
    const el = document.getElementById('header-live-clock');
    if (!el) return;
    function update() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
        el.innerHTML = `<i class="bi bi-clock text-info me-1"></i>${dateStr} ${timeStr} น.`;
    }
    update();
    setInterval(update, 1000);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function clearAllWidgets() {
    if (confirm('คุณต้องการล้างเครื่องมือทั้งหมดบนกระดานหรือไม่?')) {
        Object.keys(activeWidgets).forEach(id => removeWidget(id));
        saveOpenWidgetsState();
    }
}

// ====================================================
// 🪟 4. Floating Widget Canvas Engine & Persistence
// ====================================================
let _saveWidgetsTimer = null;
function debouncedSaveWidgetsState() {
    clearTimeout(_saveWidgetsTimer);
    _saveWidgetsTimer = setTimeout(saveOpenWidgetsState, 300);
}

function saveOpenWidgetsState() {
    try {
        const widgetEntries = Object.entries(activeWidgets);
        const savedList = [];

        widgetEntries.forEach(([id, w]) => {
            const el = document.getElementById(id);
            if (!el || !w.type) return;

            const bodyEl = document.getElementById(`body-${id}`);
            const minimized = bodyEl ? bodyEl.classList.contains('d-none') : false;
            const isExpanded = el.classList.contains('is-expanded');

            const item = {
                id: id,
                type: w.type,
                left: parseInt(el.style.left) || el.offsetLeft || 40,
                top: parseInt(el.style.top) || el.offsetTop || 40,
                width: el.style.width || (el.dataset.prevWidth || ''),
                height: el.style.height || (el.dataset.prevHeight || ''),
                zIndex: parseInt(el.style.zIndex) || 10,
                isExpanded: isExpanded,
                minimized: minimized,
                data: getWidgetSpecificData(id, w.type)
            };
            savedList.push(item);
        });

        localStorage.setItem('cs_open_widgets', JSON.stringify(savedList));
    } catch (e) {
        console.warn('Failed to save widgets state:', e);
    }
}

function getWidgetSpecificData(id, type) {
    try {
        if (type === 'text') {
            const ta = document.querySelector(`#${id} .cs-note-textarea`);
            return { text: ta ? ta.value : '' };
        }
        if (type === 'wheel') {
            const ta = document.getElementById(`wheel-input-${id}`);
            const sel = document.getElementById(`wheel-class-select-${id}`);
            const chk = document.getElementById(`wheel-auto-remove-${id}`);
            const pnl = document.getElementById(`wheel-settings-panel-${id}`);
            const isSettingsOpen = pnl ? (pnl.style.display !== 'none') : true;
            return {
                itemsText: ta ? ta.value : '',
                classId: sel ? sel.value : '',
                autoRemove: chk ? chk.checked : false,
                settingsOpen: isSettingsOpen
            };
        }
        if (type === 'name') {
            const ta = document.getElementById(`name-input-${id}`);
            const sel = document.getElementById(`name-class-select-${id}`);
            const chk = document.getElementById(`remove-picked-${id}`);
            const pnl = document.getElementById(`name-settings-panel-${id}`);
            const isSettingsOpen = pnl ? (pnl.style.display !== 'none') : true;
            return {
                namesText: ta ? ta.value : '',
                classId: sel ? sel.value : '',
                removePicked: chk ? chk.checked : false,
                settingsOpen: isSettingsOpen
            };
        }
        if (type === 'group') {
            const ta = document.getElementById(`group-names-input-${id}`);
            const sel = document.getElementById(`group-class-select-${id}`);
            const cnt = document.getElementById(`group-count-${id}`);
            const res = document.getElementById(`group-results-${id}`);
            return {
                namesText: ta ? ta.value : '',
                classId: sel ? sel.value : '',
                groupCount: cnt ? cnt.value : 'g-3',
                resultsHTML: res ? res.innerHTML : '',
                cachedResults: (typeof _groupResultsCache !== 'undefined') ? _groupResultsCache[id] : null
            };
        }
        if (type === 'guess') {
            const s = (typeof guessWidgetStates !== 'undefined') ? guessWidgetStates[id] : null;
            if (!s) return null;
            const pnl = document.getElementById(`guess-details-panel-${id}`);
            return {
                minRange: s.minRange,
                maxRange: s.maxRange,
                currentMin: s.currentMin,
                currentMax: s.currentMax,
                secret: s.secret,
                attempts: s.attempts,
                history: s.history,
                isGameOver: s.isGameOver,
                settingsOpen: pnl ? (pnl.style.display !== 'none') : true
            };
        }
        if (type === 'draw') {
            const canvas = document.getElementById(`draw-canvas-${id}`);
            const state = activeWidgets[id] || {};
            let dataURL = '';
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                try {
                    dataURL = canvas.toDataURL('image/png');
                } catch (_) { }
            }
            return {
                imageData: dataURL,
                drawColor: state.drawColor || '#ef4444',
                lineWidth: state.lineWidth || 5,
                mode: state.mode || 'pen'
            };
        }
        if (type === 'traffic') {
            const red = document.getElementById(`t-red-${id}`);
            const yellow = document.getElementById(`t-yellow-${id}`);
            let color = 'green';
            if (red && red.classList.contains('active')) color = 'red';
            else if (yellow && yellow.classList.contains('active')) color = 'yellow';
            return { color };
        }
        if (type === 'symbol') {
            const cards = document.querySelectorAll(`#${id} .symbol-card`);
            let activeIndex = 0;
            cards.forEach((card, idx) => {
                if (card.classList.contains('active')) activeIndex = idx;
            });
            return { activeIndex };
        }
        if (type === 'qr') {
            const inp = document.getElementById(`qr-input-${id}`);
            return { url: inp ? inp.value : '' };
        }
        if (type === 'media') {
            const inp = document.getElementById(`media-url-${id}`);
            return { url: inp ? inp.value : '' };
        }
        if (type === 'timer') {
            const st = (typeof timerState !== 'undefined') ? timerState[id] : null;
            return { total: st ? st.total : 300 };
        }
        if (type === 'dice') {
            const activeBtn = document.querySelector(`#${id} [onclick*="setDiceCount"].active`);
            let count = 1;
            if (activeBtn) {
                const match = activeBtn.getAttribute('onclick')?.match(/(\d+)/);
                if (match) count = parseInt(match[1]);
            }
            return { count };
        }
    } catch (e) {
        console.warn('getWidgetSpecificData error for ' + id, e);
    }
    return null;
}

function restoreWidgetSpecificData(id, type, data) {
    if (!data) return;
    try {
        if (type === 'text') {
            if (data.text !== undefined) {
                const ta = document.querySelector(`#${id} .cs-note-textarea`);
                if (ta) ta.value = data.text;
            }
        } else if (type === 'wheel') {
            const ta = document.getElementById(`wheel-input-${id}`);
            const chk = document.getElementById(`wheel-auto-remove-${id}`);
            if (data.itemsText !== undefined && ta) {
                ta.value = data.itemsText;
                if (typeof onWheelInputChanged === 'function') onWheelInputChanged(id);
            }
            if (data.autoRemove !== undefined && chk) {
                chk.checked = data.autoRemove;
            }
            if (data.classId) {
                const sel = document.getElementById(`wheel-class-select-${id}`);
                if (sel) sel.value = data.classId;
            }
            const panel = document.getElementById(`wheel-settings-panel-${id}`);
            const btn = document.getElementById(`wheel-settings-toggle-${id}`);
            const widget = document.getElementById(id);
            if (data.settingsOpen === false) {
                if (panel) panel.style.display = 'none';
                if (btn) btn.classList.remove('active', 'btn-info');
                if (widget) widget.classList.add('wheel-settings-collapsed');
            } else {
                if (panel) panel.style.display = 'flex';
                if (btn) btn.classList.add('active', 'btn-info');
                if (widget) widget.classList.remove('wheel-settings-collapsed');
            }
        } else if (type === 'name') {
            const ta = document.getElementById(`name-input-${id}`);
            const chk = document.getElementById(`remove-picked-${id}`);
            if (data.namesText !== undefined && ta) ta.value = data.namesText;
            if (data.removePicked !== undefined && chk) chk.checked = data.removePicked;
            if (data.classId) {
                const sel = document.getElementById(`name-class-select-${id}`);
                if (sel) sel.value = data.classId;
            }
            const panel = document.getElementById(`name-settings-panel-${id}`);
            const btn = document.getElementById(`toggle-list-btn-${id}`);
            const widget = document.getElementById(id);
            if (data.settingsOpen === false) {
                if (panel) panel.style.display = 'none';
                if (btn) {
                    btn.classList.remove('active', 'btn-warning');
                    btn.classList.add('btn-outline-light');
                }
                if (widget) widget.classList.add('name-settings-collapsed');
            } else {
                if (panel) panel.style.display = 'flex';
                if (btn) {
                    btn.classList.add('active', 'btn-warning');
                    btn.classList.remove('btn-outline-light');
                }
                if (widget) widget.classList.remove('name-settings-collapsed');
            }
        } else if (type === 'group') {
            const ta = document.getElementById(`group-names-input-${id}`);
            const cnt = document.getElementById(`group-count-${id}`);
            const res = document.getElementById(`group-results-${id}`);
            if (data.namesText !== undefined && ta) {
                ta.value = data.namesText;
                if (typeof updateGroupNamesBadge === 'function') updateGroupNamesBadge(id);
            }
            if (data.groupCount && cnt) cnt.value = data.groupCount;
            if (data.classId) {
                const sel = document.getElementById(`group-class-select-${id}`);
                if (sel) sel.value = data.classId;
            }
            if (data.cachedResults && typeof _groupResultsCache !== 'undefined') {
                _groupResultsCache[id] = data.cachedResults;
            }
            if (data.resultsHTML && res && data.resultsHTML.trim().length > 0) {
                res.innerHTML = data.resultsHTML;
            }
        } else if (type === 'guess') {
            if (typeof guessWidgetStates !== 'undefined' && guessWidgetStates[id]) {
                const s = guessWidgetStates[id];
                if (data.minRange !== undefined) s.minRange = data.minRange;
                if (data.maxRange !== undefined) s.maxRange = data.maxRange;
                if (data.currentMin !== undefined) s.currentMin = data.currentMin;
                if (data.currentMax !== undefined) s.currentMax = data.currentMax;
                if (data.secret !== undefined) s.secret = data.secret;
                if (data.attempts !== undefined) s.attempts = data.attempts;
                if (Array.isArray(data.history)) s.history = data.history;
                if (data.isGameOver !== undefined) s.isGameOver = data.isGameOver;

                const minInp = document.getElementById(`guess-cfg-min-${id}`);
                const maxInp = document.getElementById(`guess-cfg-max-${id}`);
                if (minInp) minInp.value = s.minRange;
                if (maxInp) maxInp.value = s.maxRange;

                if (typeof updateGuessDisplay === 'function') updateGuessDisplay(id);
                if (typeof renderGuessHistory === 'function') renderGuessHistory(id);

                if (s.isGameOver) {
                    const input = document.getElementById(`guess-input-${id}`);
                    const submitBtn = document.getElementById(`guess-submit-btn-${id}`);
                    if (input) input.disabled = true;
                    if (submitBtn) submitBtn.disabled = true;
                }

                if (data.settingsOpen === false) {
                    const pnl = document.getElementById(`guess-details-panel-${id}`);
                    const btn = document.getElementById(`guess-settings-btn-${id}`);
                    const w = document.getElementById(id);
                    if (pnl) pnl.style.display = 'none';
                    if (btn) {
                        btn.classList.remove('active', 'btn-info');
                        btn.classList.add('btn-outline-info');
                    }
                    if (w) w.classList.add('guess-settings-collapsed');
                }
            }
        } else if (type === 'draw') {
            if (data.drawColor && typeof setDrawColor === 'function') {
                const colorBtn = document.querySelector(`#${id} [onclick*="${data.drawColor}"]`);
                setDrawColor(id, data.drawColor, colorBtn);
            }
            if (data.lineWidth && typeof setDrawLineWidth === 'function') {
                const sizeBtn = document.querySelector(`#${id} [onclick*="setDrawLineWidth('${id}', ${data.lineWidth}"]`);
                setDrawLineWidth(id, data.lineWidth, sizeBtn);
            }
            if (data.mode && typeof setDrawMode === 'function') {
                const modeBtn = document.getElementById(`draw-mode-${data.mode}-${id}`);
                setDrawMode(id, data.mode, modeBtn);
            }
            if (data.imageData) {
                const drawImg = () => {
                    const canvas = document.getElementById(`draw-canvas-${id}`);
                    if (!canvas) return;
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = data.imageData;
                };
                setTimeout(drawImg, 220);
            }
        } else if (type === 'traffic') {
            if (data.color && typeof setTraffic === 'function') setTraffic(id, data.color);
        } else if (type === 'symbol') {
            if (data.activeIndex !== undefined && typeof setWorkSymbol === 'function') {
                const cards = document.querySelectorAll(`#${id} .symbol-card`);
                if (cards[data.activeIndex]) setWorkSymbol(cards[data.activeIndex]);
            }
        } else if (type === 'qr') {
            if (data.url) {
                const inp = document.getElementById(`qr-input-${id}`);
                if (inp) {
                    inp.value = data.url;
                    if (typeof updateQRCode === 'function') updateQRCode(id);
                }
            }
        } else if (type === 'media') {
            if (data.url) {
                const inp = document.getElementById(`media-url-${id}`);
                if (inp) {
                    inp.value = data.url;
                    if (typeof embedMediaURL === 'function') embedMediaURL(id);
                }
            }
        } else if (type === 'timer') {
            if (data.total !== undefined && typeof timerState !== 'undefined') {
                if (!timerState[id]) timerState[id] = { total: data.total, running: false };
                else timerState[id].total = data.total;
                if (typeof renderTimerDisplay === 'function') renderTimerDisplay(id);
            }
        } else if (type === 'dice') {
            if (data.count && typeof setDiceCount === 'function') {
                const btn = document.querySelector(`#${id} [onclick*="setDiceCount('${id}', ${data.count}"]`);
                if (btn) setDiceCount(id, data.count, btn);
            }
        }
    } catch (err) {
        console.warn('restoreWidgetSpecificData error for ' + id, err);
    }
}

function autoSaveNote(id, val) {
    debouncedSaveWidgetsState();
}

function spawnWidget(type, customPos = null, savedState = null) {
    let id = savedState && savedState.id ? savedState.id : ('widget-' + type + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
    if (document.getElementById(id)) {
        id = 'widget-' + type + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    }
    const canvas = document.getElementById('cs-widget-canvas');
    if (!canvas) return;

    if (savedState && savedState.zIndex) {
        highestZIndex = Math.max(highestZIndex, savedState.zIndex);
    } else {
        highestZIndex++;
    }
    const currentZ = savedState && savedState.zIndex ? savedState.zIndex : highestZIndex;

    const widgetCount = Object.keys(activeWidgets).length;
    let defaultLeft = 60 + (widgetCount % 6) * 40;
    let defaultTop = 40 + (widgetCount % 6) * 30;

    if (savedState && savedState.left !== undefined) {
        defaultLeft = savedState.left;
        defaultTop = savedState.top;
    } else if (customPos) {
        defaultLeft = customPos.left;
        defaultTop = customPos.top;
    }

    // Viewport boundaries safeguard
    const winW = window.innerWidth || 1200;
    const winH = window.innerHeight || 800;
    if (defaultLeft > winW - 100) defaultLeft = Math.max(20, winW - 360);
    if (defaultTop > winH - 100) defaultTop = Math.max(20, winH - 320);
    if (defaultLeft < 0) defaultLeft = 20;
    if (defaultTop < 0) defaultTop = 20;

    const widgetEl = document.createElement('div');
    widgetEl.className = `cs-widget cs-widget-${type}`;
    widgetEl.id = id;
    widgetEl.style.left = defaultLeft + 'px';
    widgetEl.style.top = defaultTop + 'px';
    widgetEl.style.zIndex = currentZ;

    const defaultSizes = {
        wheel: { w: 610, h: 410 },
        name: { w: 610, h: 380 },
        guess: { w: 640, h: 410 },
        group: { w: 380, h: 440 },
        draw: { w: 500, h: 380 },
        media: { w: 460, h: 340 },
        text: { w: 340, h: 260 },
        dice: { w: 320, h: 260 },
        timer: { w: 320, h: 260 },
        clock: { w: 320, h: 250 },
        sound: { w: 320, h: 280 },
        traffic: { w: 220, h: 320 },
        symbol: { w: 320, h: 260 },
        qr: { w: 320, h: 320 }
    };

    const defSize = defaultSizes[type] || { w: 340, h: 280 };

    if (savedState && savedState.width) {
        widgetEl.style.width = savedState.width;
    } else {
        widgetEl.style.width = Math.min(defSize.w, winW - 30) + 'px';
    }

    if (savedState && savedState.height) {
        widgetEl.style.height = savedState.height;
    } else {
        widgetEl.style.height = Math.min(defSize.h, winH - 60) + 'px';
    }

    const config = widgetConfigs[type] || widgetConfigs['text'];

    widgetEl.innerHTML = `
        <div class="cs-widget-header" onmousedown="bringToFront('${id}')">
            <div class="cs-widget-title">
                <i class="${config.icon}"></i>
                <span>${config.title}</span>
            </div>
            <div class="cs-widget-controls">
                <button class="cs-wctrl-btn" onclick="toggleExpandWidget('${id}')" title="ยืดขยาย / ย่อขนาด"><i class="bi bi-arrows-angle-expand" id="expand-icon-${id}"></i></button>
                <button class="cs-wctrl-btn" onclick="minimizeWidget('${id}')" title="ย่อ"><i class="bi bi-dash"></i></button>
                <button class="cs-wctrl-btn close-btn" onclick="removeWidget('${id}')" title="ปิด"><i class="bi bi-x-lg"></i></button>
            </div>
        </div>
        <div class="cs-widget-body" id="body-${id}">
            ${config.render(id)}
        </div>
        <div class="cs-widget-resizer" onmousedown="initWidgetResize(event, '${id}')" ontouchstart="initWidgetResize(event, '${id}')" title="ลากมุมนี้เพื่อปรับขยายขนาด"></div>
    `;

    canvas.appendChild(widgetEl);
    makeDraggable(widgetEl, widgetEl.querySelector('.cs-widget-header'));

    activeWidgets[id] = { type, el: widgetEl };
    updateWidgetBadges();

    if (savedState && savedState.isExpanded) {
        widgetEl.classList.add('is-expanded');
        const icon = document.getElementById(`expand-icon-${id}`);
        if (icon) icon.className = 'bi bi-arrows-angle-contract';
    }

    if (savedState && savedState.minimized) {
        const body = document.getElementById(`body-${id}`);
        if (body) body.classList.add('d-none');
    }

    // Trigger widget post-render initializer if needed
    if (config.postRender) {
        config.postRender(id);
    }
    if (config.cleanup) {
        activeWidgets[id].cleanup = () => config.cleanup(id);
    }

    if (savedState && savedState.data) {
        try {
            restoreWidgetSpecificData(id, type, savedState.data);
        } catch (e) {
            console.warn('Error restoring widget data for ' + id, e);
        }
    }

    if (!savedState) {
        debouncedSaveWidgetsState();
    }
}

function bringToFront(id) {
    highestZIndex++;
    const el = document.getElementById(id);
    if (el) {
        el.style.zIndex = highestZIndex;
        debouncedSaveWidgetsState();
    }
}

function removeWidget(id) {
    const el = document.getElementById(id);
    if (el) {
        // Clean up mic streams or intervals if running
        if (activeWidgets[id] && activeWidgets[id].cleanup) {
            activeWidgets[id].cleanup();
        }
        el.style.transform = 'scale(0.8)';
        el.style.opacity = '0';
        setTimeout(() => {
            el.remove();
            delete activeWidgets[id];
            updateWidgetBadges();
            saveOpenWidgetsState();
        }, 200);
    }
}

function minimizeWidget(id) {
    const body = document.getElementById(`body-${id}`);
    if (body) {
        body.classList.toggle('d-none');
        debouncedSaveWidgetsState();
    }
}

// 📐 Toggle Quick Expand / Normal Size
function toggleExpandWidget(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(`expand-icon-${id}`);
    if (!el) return;

    bringToFront(id);
    el.classList.toggle('is-expanded');

    if (el.classList.contains('is-expanded')) {
        el.dataset.prevWidth = el.style.width || '';
        el.dataset.prevHeight = el.style.height || '';
        el.style.width = '';
        el.style.height = '';
        if (icon) icon.className = 'bi bi-arrows-angle-contract';
        if (typeof showDockToast === 'function') {
            showDockToast('🔍 ยืดขยายขนาดหน้าจอใหญ่ขึ้นแล้ว');
        }
    } else {
        if (el.dataset.prevWidth) el.style.width = el.dataset.prevWidth;
        else el.style.width = '';
        if (el.dataset.prevHeight) el.style.height = el.dataset.prevHeight;
        else el.style.height = '';
        if (icon) icon.className = 'bi bi-arrows-angle-expand';
        if (typeof showDockToast === 'function') {
            showDockToast('📐 ปรับกลับขนาดมาตรฐานแล้ว');
        }
    }
    debouncedSaveWidgetsState();
}

// 🖐️ Smooth Drag to Resize (Mouse & Touch for iPad)
function initWidgetResize(e, id) {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);

    const widgetEl = document.getElementById(id);
    if (!widgetEl) return;

    const startX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const startY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    const startWidth = widgetEl.offsetWidth;
    const startHeight = widgetEl.offsetHeight;

    widgetEl.classList.remove('is-expanded');
    widgetEl.classList.add('active-resize');

    const icon = document.getElementById(`expand-icon-${id}`);
    if (icon) icon.className = 'bi bi-arrows-angle-expand';

    function onMove(ev) {
        const curX = (ev.touches && ev.touches[0]) ? ev.touches[0].clientX : ev.clientX;
        const curY = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : ev.clientY;
        const deltaX = curX - startX;
        const deltaY = curY - startY;

        const maxW = window.innerWidth - widgetEl.offsetLeft - 15;
        const maxH = window.innerHeight - widgetEl.offsetTop - 85;
        const newW = Math.max(280, Math.min(maxW, startWidth + deltaX));
        const newH = Math.max(180, Math.min(maxH, startHeight + deltaY));

        widgetEl.style.width = newW + 'px';
        widgetEl.style.height = newH + 'px';
    }

    function onEnd() {
        widgetEl.classList.remove('active-resize');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        debouncedSaveWidgetsState();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
}

function updateWidgetBadges() {
    const counts = {};
    Object.values(activeWidgets).forEach(w => {
        counts[w.type] = (counts[w.type] || 0) + 1;
    });

    document.querySelectorAll('[data-widget-type]').forEach(btn => {
        const type = btn.getAttribute('data-widget-type');
        let badge = btn.querySelector('.cs-tool-badge');
        if (counts[type]) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'cs-tool-badge';
                btn.appendChild(badge);
            }
            badge.innerText = counts[type];
        } else if (badge) {
            badge.remove();
        }
    });
}

// 🖐️ Smooth Drag & Drop implementation
function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    handle.onmousedown = dragMouseDown;
    handle.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
        if (e.target.closest('.cs-widget-controls')) return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.classList.add('active-drag');
        bringToFront(element.id);
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // Boundaries check
        const maxTop = Math.max(10, window.innerHeight - 80);
        const maxLeft = Math.max(10, window.innerWidth - 60);

        newTop = Math.max(10, Math.min(maxTop, newTop));
        newLeft = Math.max(10, Math.min(maxLeft, newLeft));

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
    }

    function closeDragElement() {
        element.classList.remove('active-drag');
        document.onmouseup = null;
        document.onmousemove = null;
        debouncedSaveWidgetsState();
    }

    function dragTouchStart(e) {
        if (e.target.closest('.cs-widget-controls')) return;
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        element.classList.add('active-drag');
        bringToFront(element.id);
        document.ontouchend = closeTouchElement;
        document.ontouchmove = elementTouchMove;
    }

    function elementTouchMove(e) {
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // Boundaries check for touch
        const maxTop = Math.max(10, window.innerHeight - 80);
        const maxLeft = Math.max(10, window.innerWidth - 60);

        newTop = Math.max(10, Math.min(maxTop, newTop));
        newLeft = Math.max(10, Math.min(maxLeft, newLeft));

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
    }

    function closeTouchElement() {
        element.classList.remove('active-drag');
        document.ontouchend = null;
        document.ontouchmove = null;
        debouncedSaveWidgetsState();
    }
}

// ====================================================
// ⚙️ 5. WIDGET DEFINITIONS & RENDERING LOGIC
// ====================================================
const widgetConfigs = {

    // 1. 🎲 Dice Roller Widget
    dice: {
        title: 'ลูกเต๋า (Dice)',
        icon: 'bi bi-dice-5-fill text-danger',
        render: (id) => `
            <div class="dice-box text-center" style="min-width: 220px;">
                <div class="d-flex justify-content-center gap-2 mb-2">
                    <button class="btn btn-sm btn-outline-light active" onclick="setDiceCount('${id}', 1, this)">1 ลูก</button>
                    <button class="btn btn-sm btn-outline-light" onclick="setDiceCount('${id}', 2, this)">2 ลูก</button>
                    <button class="btn btn-sm btn-outline-light" onclick="setDiceCount('${id}', 3, this)">3 ลูก</button>
                </div>
                <div class="dice-container" id="dice-container-${id}">
                    <div class="dice-face" id="dice-1-${id}">${getDiceDotsSVG(6)}</div>
                </div>
                <div class="fw-bold fs-5 my-2 text-info dice-sum-text" id="dice-sum-${id}">ผลรวม: 6</div>
                <button class="btn btn-danger w-100 fw-bold rounded-pill shadow-sm dice-roll-btn" onclick="rollDice('${id}')">
                    <i class="bi bi-arrow-repeat me-1"></i>ทอยลูกเต๋า
                </button>
            </div>
        `
    },

    // 2. 🎰 Random Name Picker Widget (Resizable & Classroom Selector)
    name: {
        title: 'สุ่มชื่อนักเรียน (Random Name)',
        icon: 'bi bi-shuffle text-warning',
        render: (id) => `
            <div class="name-picker-box" id="name-box-${id}">
                <div class="name-main-layout" id="name-layout-${id}">
                    <!-- Left Column: Big Name Winner Display & Action Controls -->
                    <div class="name-left-col">
                        <!-- Big Name Winner Display -->
                        <div class="name-display" id="name-display-${id}">
                            <span>พร้อมสุ่มชื่อ!</span>
                        </div>

                        <!-- Spin & Quick Action Controls -->
                        <div class="d-flex gap-2 w-100">
                            <button class="btn btn-warning fw-bold flex-grow-1 rounded-pill shadow-sm" onclick="spinNamePicker('${id}')">
                                <i class="bi bi-play-circle-fill me-1"></i>สุ่มชื่อ!
                            </button>
                            <button class="btn btn-warning active rounded-pill px-3" id="toggle-list-btn-${id}" onclick="toggleNameSettings('${id}')" title="แสดง/ซ่อน รายชื่อและห้องเรียน">
                                <i class="bi bi-list-ul"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Right Column: Settings, Classroom Selector & Names (ส่วนรูปที่ 1 ด้านขวา) -->
                    <div id="name-settings-panel-${id}" class="name-right-col text-start">
                        <!-- 🏫 Classroom Selector from Saved Classrooms -->
                        <div class="p-2 mb-2 rounded-3 text-start" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <label class="form-label mb-0 small d-flex align-items-center gap-1" style="font-size: 0.78rem;">
                                    <i class="bi bi-mortarboard-fill text-info"></i>
                                    <span class="fw-semibold text-white">เลือกห้องเรียนที่บันทึกไว้:</span>
                                </label>
                                <div class="d-flex align-items-center gap-1">
                                    <span id="name-class-count-${id}" class="badge bg-info-subtle text-info border border-info-subtle" style="font-size: 0.7rem; display: none;"></span>
                                    <button type="button" class="btn btn-link btn-sm text-info p-0 text-decoration-none" onclick="populateClassroomsDropdown('${id}', true)" title="รีเฟรชรายชื่อห้อง">
                                        <i class="bi bi-arrow-clockwise" id="refresh-icon-${id}"></i>
                                    </button>
                                    <a href="auth/classroom_manage/classroom_manage.html" target="_blank" class="btn btn-link btn-sm text-warning p-0 text-decoration-none ms-1" title="ไปหน้าจัดการห้องเรียน">
                                        <i class="bi bi-box-arrow-up-right"></i>
                                    </a>
                                </div>
                            </div>
                            <select class="form-select form-select-sm bg-dark text-white border-secondary" id="name-class-select-${id}" onchange="onClassroomSelected('${id}', this.value)" style="border-radius: 8px; font-size: 0.85rem;">
                                <option value="">-- กำลังโหลดห้องเรียนที่บันทึกไว้... --</option>
                            </select>
                        </div>

                        <!-- Names Textarea -->
                        <textarea class="form-control form-control-sm bg-dark text-white border-secondary mb-2 flex-grow-1" id="name-input-${id}" rows="3" oninput="debouncedSaveWidgetsState()" placeholder="ใส่ชื่อคนละบรรทัด...&#10;ปุ่น&#10;หนูดี&#10;ซาย" style="font-size: 0.88rem; min-height: 100px;">ปุ่น&#10;หนูดี&#10;ซาย&#10;ชมพู่&#10;ปริ้น&#10;โอ๊ค</textarea>
                        
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <div class="form-check text-start small mb-0">
                                <input class="form-check-input" type="checkbox" id="remove-picked-${id}" onchange="debouncedSaveWidgetsState()">
                                <label class="form-check-label" for="remove-picked-${id}" style="color: #e2e8f0 !important; font-weight: 500; font-size: 0.8rem;">ลบชื่อที่ถูกสุ่มแล้วออก</label>
                            </div>
                            <button type="button" class="btn btn-link btn-sm text-white-50 p-0 text-decoration-none small" style="font-size: 0.76rem;" onclick="saveCurrentNamesAsClassroom('${id}')" title="บันทึกรายชื่อนี้เป็นห้องใหม่">
                                <i class="bi bi-floppy me-1 text-info"></i>บันทึกเป็นห้อง
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        postRender: (id) => {
            populateClassroomsDropdown(id);
        }
    },

    // 3. 🔊 Sound Level / Noise Meter Widget
    sound: {
        title: 'ตัววัดระดับเสียง (Noise Meter)',
        icon: 'bi bi-mic-fill text-success',
        render: (id) => `
            <div style="min-width: 240px;" class="sound-widget-box text-center">
                <div class="noise-meter-bar mb-3">
                    <div class="noise-fill" id="noise-fill-${id}"></div>
                    <div class="noise-threshold-line" id="threshold-line-${id}" style="left: 70%;"></div>
                </div>
                <div class="d-flex align-items-center justify-content-between small mb-2 sound-status-text" style="color: #e2e8f0; font-weight: 500;">
                    <span>ระดับปัจจุบัน: <b class="text-white" id="noise-val-${id}">0%</b></span>
                    <span>ตั้งค่าเตือน: <b class="text-warning" id="threshold-val-${id}">70%</b></span>
                </div>
                <div class="mb-3">
                    <label class="form-label d-block text-start mb-1" style="color: #ffffff !important; font-weight: 500;">ความไวรับสัญญาณ (Threshold)</label>
                    <input type="range" class="form-range" id="threshold-slider-${id}" min="20" max="95" value="70" oninput="updateNoiseThreshold('${id}', this.value)">
                </div>
                <button class="btn btn-sm btn-success w-100 rounded-pill fw-bold shadow-sm py-2" id="mic-btn-${id}" onclick="toggleMicrophone('${id}')">
                    <i class="bi bi-mic-fill me-1"></i>เปิดไมโครโฟน
                </button>
            </div>
        `
    },

    // 4. 🚥 Traffic Light Widget
    traffic: {
        title: 'ไฟจราจร (Traffic Light)',
        icon: 'bi bi-stoplights-fill text-danger',
        render: (id) => `
            <div class="traffic-widget-box text-center" style="min-width: 140px;">
                <div class="traffic-housing mb-2">
                    <div class="traffic-bulb red" id="t-red-${id}" onclick="setTraffic('${id}', 'red')"></div>
                    <div class="traffic-bulb yellow" id="t-yellow-${id}" onclick="setTraffic('${id}', 'yellow')"></div>
                    <div class="traffic-bulb green active" id="t-green-${id}" onclick="setTraffic('${id}', 'green')"></div>
                </div>
                <div class="fw-bold text-success small traffic-status-text" id="t-status-${id}">🟢 เริ่มทำงานได้!</div>
            </div>
        `
    },

    // 5. ⏱️ Timer & Countdown Widget
    timer: {
        title: 'ตัวจับเวลา (Timer)',
        icon: 'bi bi-stopwatch-fill text-primary',
        render: (id) => `
            <div style="min-width: 240px;" class="timer-widget-box text-center">
                <div class="timer-display" id="timer-display-${id}">05:00</div>
                <div class="d-flex justify-content-center gap-1 mb-3 timer-presets">
                    <button class="btn btn-sm btn-outline-light rounded-pill" onclick="addTimerSeconds('${id}', 60)">+1 นาที</button>
                    <button class="btn btn-sm btn-outline-light rounded-pill" onclick="addTimerSeconds('${id}', 300)">+5 นาที</button>
                    <button class="btn btn-sm btn-outline-light rounded-pill" onclick="addTimerSeconds('${id}', 600)">+10 นาที</button>
                </div>
                <div class="d-flex justify-content-center gap-2 timer-controls">
                    <button class="btn btn-primary fw-bold px-4 rounded-pill shadow-sm" id="btn-timer-toggle-${id}" onclick="toggleTimer('${id}')">
                        <i class="bi bi-play-fill me-1"></i>เริ่ม
                    </button>
                    <button class="btn btn-outline-secondary rounded-pill" onclick="resetTimer('${id}')">
                        <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                </div>
            </div>
        `
    },

    // 6. ⏰ Live Clock & Calendar Widget
    clock: {
        title: 'นาฬิกา & ปฏิทิน (Clock)',
        icon: 'bi bi-clock-fill text-info',
        render: (id) => `
            <div style="min-width: 220px;" class="clock-widget-box text-center py-1">
                <div class="fw-bold text-white clock-big-time" id="clock-big-time-${id}">00:00:00</div>
                <div class="text-info font-monospace fw-medium clock-big-date" id="clock-big-date-${id}">วันเสาร์ที่ 12 กุมภาพันธ์</div>
            </div>
        `,
        postRender: (id) => {
            function updateClock() {
                const timeEl = document.getElementById(`clock-big-time-${id}`);
                const dateEl = document.getElementById(`clock-big-date-${id}`);
                if (!timeEl || !dateEl) return;
                const now = new Date();
                timeEl.innerText = now.toLocaleTimeString('th-TH');
                dateEl.innerText = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            }
            updateClock();
            const interval = setInterval(updateClock, 1000);
            activeWidgets[id].cleanup = () => clearInterval(interval);
        }
    },

    // 7. 🙋‍♂️ Work Symbols Widget
    symbol: {
        title: 'กติกาห้องเรียน (Work Symbols)',
        icon: 'bi bi-person-workspace text-pink',
        render: (id) => `
            <div style="min-width: 240px;" class="symbol-widget-box">
                <div class="symbol-grid">
                    <div class="symbol-card active" onclick="setWorkSymbol(this)">
                        <div class="symbol-icon">🤫</div>
                        <div class="symbol-label">เงียบสนิท</div>
                    </div>
                    <div class="symbol-card" onclick="setWorkSymbol(this)">
                        <div class="symbol-icon">💬</div>
                        <div class="symbol-label">กระซิบ</div>
                    </div>
                    <div class="symbol-card" onclick="setWorkSymbol(this)">
                        <div class="symbol-icon">👥</div>
                        <div class="symbol-label">ถามเพื่อน</div>
                    </div>
                    <div class="symbol-card" onclick="setWorkSymbol(this)">
                        <div class="symbol-icon">🤝</div>
                        <div class="symbol-label">ทำงานกลุ่ม</div>
                    </div>
                </div>
            </div>
        `
    },

    // 8. 📝 Text Note Widget
    text: {
        title: 'โน้ตสั่งงาน (Text Note)',
        icon: 'bi bi-journal-text text-warning',
        render: (id) => `
            <div style="min-width: 280px; width: 100%; height: 100%; display: flex; flex-direction: column; flex: 1 1 auto;">
                <textarea class="cs-note-textarea" style="width: 100%; height: 100%; flex: 1 1 auto; min-height: 140px;" placeholder="พิมพ์ข้อความ / กิจกรรมประจำวัน..." oninput="autoSaveNote('${id}', this.value)">ต้อนรับสู่ห้องเรียนวันนี้! 🚀&#10;1. ทำแบบทดสอบก่อนเรียน&#10;2. แบ่งกลุ่มระดมความคิด&#10;3. นำเสนอผลงานหน้าชั้นเรียน</textarea>
            </div>
        `
    },

    // 9. 🎨 Whiteboard / Drawing Widget
    draw: {
        title: 'กระดานวาดรูป (Drawing)',
        icon: 'bi bi-pen-fill text-info',
        render: (id) => `
            <div class="draw-widget-box" style="width: 100%; height: 100%; display: flex; flex-direction: column; min-width: 280px; flex: 1 1 auto;">
                <div class="d-flex align-items-center justify-content-between gap-1 mb-2 flex-wrap">
                    <!-- Tools: Pen & Eraser Modes -->
                    <div class="d-flex align-items-center gap-1">
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-primary btn-sm py-0 px-2 fw-semibold draw-mode-btn active" id="draw-mode-pen-${id}" onclick="setDrawMode('${id}', 'pen', this)" title="โหมดปากกา">
                                <i class="bi bi-pen-fill me-1"></i>ปากกา
                            </button>
                            <button type="button" class="btn btn-outline-warning btn-sm py-0 px-2 fw-semibold draw-mode-btn" id="draw-mode-eraser-${id}" onclick="setDrawMode('${id}', 'eraser', this)" title="โหมดยางลบ (ลบเฉพาะจุด)">
                                <i class="bi bi-eraser-fill me-1"></i>ยางลบ
                            </button>
                        </div>

                        <!-- Colors (clickable to draw and auto-switch back to pen) -->
                        <div class="d-flex align-items-center gap-1 ms-1">
                            <button type="button" class="btn btn-sm btn-dark p-0 border rounded-circle draw-color-btn active" id="draw-btn-red-${id}" style="width:22px;height:22px;background:#ef4444;" onclick="setDrawColor('${id}', '#ef4444', this)" title="สีแดง"></button>
                            <button type="button" class="btn btn-sm btn-dark p-0 border rounded-circle draw-color-btn" id="draw-btn-blue-${id}" style="width:22px;height:22px;background:#3b82f6;" onclick="setDrawColor('${id}', '#3b82f6', this)" title="สีน้ำเงิน"></button>
                            <button type="button" class="btn btn-sm btn-dark p-0 border rounded-circle draw-color-btn" id="draw-btn-green-${id}" style="width:22px;height:22px;background:#22c55e;" onclick="setDrawColor('${id}', '#22c55e', this)" title="สีเขียว"></button>
                            <button type="button" class="btn btn-sm btn-dark p-0 border rounded-circle draw-color-btn" id="draw-btn-orange-${id}" style="width:22px;height:22px;background:#f59e0b;" onclick="setDrawColor('${id}', '#f59e0b', this)" title="สีส้ม"></button>
                            <button type="button" class="btn btn-sm btn-dark p-0 border rounded-circle draw-color-btn" id="draw-btn-dark-${id}" style="width:22px;height:22px;background:#0f172a;" onclick="setDrawColor('${id}', '#0f172a', this)" title="สีดำ"></button>
                        </div>
                    </div>

                    <!-- Size & Clear All -->
                    <div class="d-flex align-items-center gap-1">
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-light btn-sm py-0 px-2" id="draw-size-thin-${id}" onclick="setDrawLineWidth('${id}', 2, this)" title="เส้นบาง">
                                <span style="display:inline-block;width:4px;height:4px;background:currentColor;border-radius:50%;"></span>
                            </button>
                            <button type="button" class="btn btn-outline-light btn-sm py-0 px-2 active" id="draw-size-med-${id}" onclick="setDrawLineWidth('${id}', 5, this)" title="เส้นปานกลาง">
                                <span style="display:inline-block;width:7px;height:7px;background:currentColor;border-radius:50%;"></span>
                            </button>
                            <button type="button" class="btn btn-outline-light btn-sm py-0 px-2" id="draw-size-thick-${id}" onclick="setDrawLineWidth('${id}', 10, this)" title="เส้นหนา">
                                <span style="display:inline-block;width:11px;height:11px;background:currentColor;border-radius:50%;"></span>
                            </button>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger rounded-pill py-0 px-2 small" onclick="clearDrawCanvas('${id}')" title="ล้างทั้งกระดาน">
                            <i class="bi bi-trash3 me-1"></i>ล้างหมด
                        </button>
                    </div>
                </div>
                <div class="draw-canvas-container flex-grow-1 position-relative" id="draw-container-${id}">
                    <canvas id="draw-canvas-${id}" class="drawing-canvas"></canvas>
                </div>
            </div>
        `,
        postRender: (id) => initWidgetCanvas(id)
    },

    // 10. 📱 QR Code Generator Widget
    qr: {
        title: 'สร้าง QR Code (QR Code)',
        icon: 'bi bi-qr-code text-danger',
        render: (id) => `
            <div style="min-width: 250px;" class="text-center">
                <div class="bg-white p-2 rounded-3 mb-3 d-inline-block shadow-sm">
                    <img id="qr-img-${id}" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://classroomscreen.com" alt="QR Code" width="180" height="180">
                </div>
                <div class="input-group input-group-sm">
                    <input type="text" class="form-control bg-dark text-white border-secondary" id="qr-input-${id}" value="https://google.com" placeholder="วางลิงก์ที่นี่...">
                    <button class="btn btn-primary fw-bold" onclick="updateQRCode('${id}')">สร้าง</button>
                </div>
            </div>
        `
    },

    // 11. 👥 Group Maker Widget
    group: {
        title: 'จัดกลุ่มนักเรียน (Group Maker)',
        icon: 'bi bi-people-fill text-success',
        render: (id) => `
            <div class="group-widget-box" style="width: 100%; height: 100%; display: flex; flex-direction: column; flex: 1 1 auto;">
                <!-- 🏫 Classroom Selector from Saved Classrooms -->
                <div class="p-2 mb-2 rounded-3 text-start" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="form-label mb-0 small d-flex align-items-center gap-1" style="font-size: 0.78rem;">
                            <i class="bi bi-mortarboard-fill text-success"></i>
                            <span class="fw-semibold text-white">เลือกห้องเรียนที่บันทึกไว้:</span>
                        </label>
                        <div class="d-flex align-items-center gap-1">
                            <span id="group-class-count-${id}" class="badge bg-success-subtle text-success border border-success-subtle" style="font-size: 0.7rem; display: none;"></span>
                            <button type="button" class="btn btn-link btn-sm text-success p-0 text-decoration-none" onclick="populateGroupClassrooms('${id}', true)" title="รีเฟรชรายชื่อห้อง">
                                <i class="bi bi-arrow-clockwise" id="group-refresh-icon-${id}"></i>
                            </button>
                            <a href="auth/classroom_manage/classroom_manage.html" target="_blank" class="btn btn-link btn-sm text-warning p-0 text-decoration-none ms-1" title="ไปหน้าจัดการห้องเรียน">
                                <i class="bi bi-box-arrow-up-right"></i>
                            </a>
                        </div>
                    </div>
                    <select class="form-select form-select-sm bg-dark text-white border-secondary" id="group-class-select-${id}" onchange="onGroupClassroomSelected('${id}', this.value)" style="border-radius: 8px; font-size: 0.85rem;">
                        <option value="">-- กำลังโหลดห้องเรียนที่บันทึกไว้... --</option>
                    </select>
                </div>

                <!-- Controls Row: Group Count & View/Edit Names Toggle -->
                <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
                    <div class="d-flex align-items-center gap-1">
                        <label class="form-label small m-0 text-white-50" style="font-size: 0.8rem; white-space: nowrap;">แบ่งกลุ่ม:</label>
                        <select class="form-select form-select-sm bg-dark text-white border-secondary" id="group-count-${id}" style="width: 120px; font-weight: 500; font-size: 0.82rem;">
                            <optgroup label="แบ่งตามจำนวนกลุ่ม">
                                <option value="g-2">2 กลุ่ม</option>
                                <option value="g-3" selected>3 กลุ่ม</option>
                                <option value="g-4">4 กลุ่ม</option>
                                <option value="g-5">5 กลุ่ม</option>
                                <option value="g-6">6 กลุ่ม</option>
                                <option value="g-7">7 กลุ่ม</option>
                                <option value="g-8">8 กลุ่ม</option>
                            </optgroup>
                            <optgroup label="แบ่งตามจำนวนคนต่อกลุ่ม">
                                <option value="m-2">กลุ่มละ 2 คน</option>
                                <option value="m-3">กลุ่มละ 3 คน</option>
                                <option value="m-4">กลุ่มละ 4 คน</option>
                                <option value="m-5">กลุ่มละ 5 คน</option>
                                <option value="m-6">กลุ่มละ 6 คน</option>
                            </optgroup>
                        </select>
                    </div>
                    <button type="button" class="btn btn-outline-light btn-sm rounded-pill px-2 py-1" id="group-toggle-btn-${id}" onclick="toggleGroupNamesPanel('${id}')" style="font-size: 0.75rem;">
                        <i class="bi bi-person-lines-fill me-1 text-info"></i><span id="group-names-badge-${id}">รายชื่อ (12 คน)</span>
                    </button>
                </div>

                <!-- Collapsible Names Editor Panel -->
                <div id="group-names-panel-${id}" class="mb-2 text-start" style="display: none; background: rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 8px; border: 1px dashed rgba(255, 255, 255, 0.15);">
                    <div class="d-flex justify-content-between align-items-center mb-1 px-1">
                        <span class="small text-white-50" style="font-size: 0.74rem;">แก้ไข/เพิ่ม-ลบ รายชื่อนักเรียน (คนละบรรทัด):</span>
                        <button type="button" class="btn btn-link btn-sm text-danger p-0 text-decoration-none" style="font-size: 0.74rem;" onclick="clearGroupNames('${id}')">
                            <i class="bi bi-trash3 me-1"></i>ล้าง
                        </button>
                    </div>
                    <textarea class="form-control form-control-sm bg-dark text-white border-secondary" id="group-names-input-${id}" rows="4" oninput="updateGroupNamesBadge('${id}'); debouncedSaveWidgetsState()" placeholder="พิมพ์หรือวางชื่อคนละบรรทัด..." style="font-size: 0.85rem;">ปุ่น&#10;หนูดี&#10;ซาย&#10;ชมพู่&#10;ปริ้น&#10;โอ๊ค&#10;ชัยวัฒน์&#10;ปรียา&#10;สุรชัย&#10;ศิริพร&#10;ธนพล&#10;กนกวรรณ</textarea>
                </div>

                <!-- Generate Action Button -->
                <button class="btn btn-success btn-sm w-100 fw-bold rounded-pill mb-2 shadow-sm d-flex align-items-center justify-content-center gap-1 py-2" onclick="generateGroups('${id}')">
                    <i class="bi bi-shuffle fs-6"></i>
                    <span>สุ่มจัดกลุ่ม</span>
                </button>

                <!-- Group Results Container -->
                <div id="group-results-${id}" class="group-results-container flex-grow-1" style="min-height: 120px; overflow-y: auto;">
                    <div class="small text-center py-2" style="color: #cbd5e1 !important; font-weight: 500;">
                        เลือกห้องเรียนแล้วกด "สุ่มจัดกลุ่ม" เพื่อเริ่ม
                    </div>
                </div>
            </div>
        `,
        postRender: (id) => {
            populateGroupClassrooms(id);
            updateGroupNamesBadge(id);
        }
    },

    // 12. 🎵 Media Embed Widget
    media: {
        title: 'แทรกวิดีโอ / YouTube',
        icon: 'bi bi-youtube text-danger',
        render: (id) => `
            <div style="min-width: 320px;">
                <div id="media-frame-container-${id}" class="ratio ratio-16x9 bg-black rounded-3 mb-2 overflow-hidden">
                    <iframe src="https://www.youtube.com/embed/jfKfPfyJRdk" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
                <div class="input-group input-group-sm">
                    <input type="text" class="form-control bg-dark text-white border-secondary" id="media-url-${id}" oninput="debouncedSaveWidgetsState()" placeholder="วางลิงก์ YouTube (เช่น https://youtu.be/...)">
                    <button class="btn btn-danger fw-bold" onclick="embedMediaURL('${id}')">แสดง</button>
                </div>
            </div>
        `
    },

    // 13. 🎡 Gyver Wheel Lucky Draw Widget (Instant)
    wheel: {
        title: 'วงล้อสุ่มด่วน (Lucky Wheel)',
        icon: 'bi bi-disc-fill text-danger',
        render: (id) => `
            <div class="wheel-widget-box" id="wheel-box-${id}">
                <div class="wheel-main-layout" id="wheel-layout-${id}">
                    <!-- Left Column: Wheel & Action Controls -->
                    <div class="wheel-left-col">
                        <!-- Wheel Stage Container -->
                        <div class="wheel-canvas-container" id="wheel-container-${id}" style="position: relative; width: 100%; max-width: clamp(200px, 34cqi, 400px); max-height: calc(100% - 48px); aspect-ratio: 1/1; margin: auto auto; display: flex; align-items: center; justify-content: center;">
                            <div class="wheel-pointer" id="wheel-pointer-${id}"></div>
                            <canvas class="wheel-canvas" id="wheel-canvas-${id}" width="400" height="400" style="width: 100% !important; height: 100% !important; max-width: 100%; max-height: 100%; aspect-ratio: 1/1; display: block; border-radius: 50%; border: 5px solid #1e293b; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);"></canvas>
                            
                            <!-- Floating Winner Announcement Overlay -->
                            <div class="wheel-winner-banner" id="wheel-winner-banner-${id}">
                                <div class="text-warning small fw-bold mb-1"><i class="bi bi-sparkles me-1"></i>ผู้โชคดีได้แก่</div>
                                <div class="fs-2 fw-bold text-white mb-3" id="wheel-winner-name-${id}">-</div>
                                <div class="d-flex justify-content-center gap-2">
                                    <button class="btn btn-sm btn-success rounded-pill px-3 fw-bold" onclick="dismissWheelWinner('${id}', false)">
                                        <i class="bi bi-check-lg me-1"></i>ตกลง
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3 fw-bold" onclick="dismissWheelWinner('${id}', true)">
                                        <i class="bi bi-trash3 me-1"></i>ลบชื่อนี้ออก
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Action Controls -->
                        <div class="d-flex gap-2 w-100 mb-1 px-1">
                            <button class="btn btn-danger fw-bold flex-grow-1 rounded-pill shadow-sm" id="wheel-spin-btn-${id}" onclick="spinWheelWidget('${id}')">
                                <i class="bi bi-play-circle-fill me-1"></i>หมุนวงล้อ!
                            </button>
                            <button class="btn btn-info active rounded-pill px-3" id="wheel-settings-toggle-${id}" onclick="toggleWheelSettings('${id}')" title="แสดง/ซ่อน รายชื่อและห้องเรียน">
                                <i class="bi bi-gear-fill"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Right Column: Settings, Classroom Picker & Names List (ส่วนรูปที่ 1 ด้านขวา) -->
                    <div class="wheel-right-col text-start" id="wheel-settings-panel-${id}">
                        <!-- 🏫 Classroom Selector -->
                        <div class="p-2 mb-2 rounded-3" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <label class="form-label mb-0 small d-flex align-items-center gap-1" style="font-size: 0.78rem;">
                                    <i class="bi bi-mortarboard-fill text-info"></i>
                                    <span class="fw-semibold text-white">เลือกห้องเรียนที่บันทึกไว้:</span>
                                </label>
                                <div class="d-flex align-items-center gap-1">
                                    <span id="wheel-class-count-${id}" class="badge bg-info-subtle text-info border border-info-subtle" style="font-size: 0.7rem; display: none;"></span>
                                    <button type="button" class="btn btn-link btn-sm text-info p-0 text-decoration-none" onclick="populateWheelClassrooms('${id}', true)" title="รีเฟรชรายชื่อห้อง">
                                        <i class="bi bi-arrow-clockwise" id="wheel-refresh-icon-${id}"></i>
                                    </button>
                                </div>
                            </div>
                            <select class="form-select form-select-sm bg-dark text-white border-secondary" id="wheel-class-select-${id}" onchange="onWheelClassroomSelected('${id}', this.value)" style="border-radius: 8px; font-size: 0.85rem;">
                                <option value="">-- เลือกห้องเรียน (ดึงรายชื่อลงวงล้อ) --</option>
                            </select>
                        </div>

                        <!-- Items Input -->
                        <div class="d-flex justify-content-between align-items-center mb-1 px-1">
                            <span class="small text-white-50" style="font-size: 0.76rem;">รายชื่อในวงล้อ:</span>
                            <span class="badge bg-secondary-subtle text-white-50 border border-secondary" id="wheel-item-count-${id}" style="font-size: 0.7rem;">6 รายการ</span>
                        </div>
                        <textarea class="form-control form-control-sm bg-dark text-white border-secondary mb-2 flex-grow-1" id="wheel-input-${id}" rows="4" oninput="onWheelInputChanged('${id}')" placeholder="ใส่ชื่อคนละบรรทัด..." style="font-size: 0.88rem; min-height: 120px;">ปุ่น&#10;หนูดี&#10;ซาย&#10;ชมพู่&#10;ปริ้น&#10;โอ๊ค</textarea>
                        
                        <div class="d-flex justify-content-between align-items-center px-1 mt-auto">
                            <div class="form-check text-start small mb-0">
                                <input class="form-check-input" type="checkbox" id="wheel-auto-remove-${id}" onchange="debouncedSaveWidgetsState()">
                                <label class="form-check-label" for="wheel-auto-remove-${id}" style="color: #e2e8f0 !important; font-size: 0.78rem;">ลบชื่อผู้ชนะอัตโนมัติ</label>
                            </div>
                            <button type="button" class="btn btn-link btn-sm text-white-50 p-0 text-decoration-none small" style="font-size: 0.76rem;" onclick="shuffleWheelItems('${id}')" title="สลับตำแหน่ง">
                                <i class="bi bi-shuffle me-1"></i>สลับ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        postRender: (id) => {
            initWheelWidget(id);
        },
        cleanup: (id) => {
            destroyWheelWidget(id);
        }
    },

    // 14. 🔢 Gyver Number Guess Widget (Instant)
    guess: {
        title: 'เกมทายตัวเลข (Number Guess)',
        icon: 'bi bi-123 text-info',
        render: (id) => `
            <div class="guess-widget-box" id="guess-box-${id}">
                <div class="guess-main-layout" id="guess-layout-${id}">
                    <!-- Left Column: Gameplay Arena & Controls -->
                    <div class="guess-left-col">
                        <!-- Range Bounds Arena -->
                        <div class="guess-arena-box p-3 mb-2 rounded-3 text-center position-relative overflow-hidden" style="background: radial-gradient(circle at 50% 50%, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%); border: 1.5px solid rgba(99, 102, 241, 0.4); box-shadow: inset 0 0 20px rgba(99, 102, 241, 0.15);">
                            <!-- Header Row: Attempts & Best Record -->
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge rounded-pill bg-dark border border-secondary-subtle text-white-50 px-2 py-1" style="font-size: 0.72rem;">
                                    <i class="bi bi-bullseye text-warning me-1"></i>ทายไป: <b class="text-white" id="guess-attempts-${id}">0</b> ครั้ง
                                </span>
                                <span class="badge rounded-pill bg-dark border border-secondary-subtle text-white-50 px-2 py-1" style="font-size: 0.72rem;">
                                    <i class="bi bi-trophy-fill text-warning me-1"></i>สถิติดีสุด: <b class="text-warning" id="guess-best-${id}">-</b>
                                </span>
                            </div>

                            <!-- Big Bounds Display: Min < ? < Max -->
                            <div class="d-flex justify-content-between align-items-center my-1 px-1">
                                <div class="text-center">
                                    <small class="text-info d-block" style="font-size: 0.75rem; font-weight: 600;">ต่ำสุด</small>
                                    <div class="badge px-3 py-2 fs-5 fw-bold font-monospace shadow-sm" id="guess-min-badge-${id}" style="background: rgba(6, 182, 212, 0.15); border: 1.5px solid #06b6d4; color: #38bdf8; border-radius: 12px;">1</div>
                                </div>

                                <div class="text-center px-2">
                                    <div class="fs-4 text-warning fw-bold animate__animated animate__pulse animate__infinite" id="guess-center-icon-${id}">
                                        <i class="bi bi-question-diamond-fill"></i>
                                    </div>
                                    <small class="text-white-50 font-monospace" id="guess-gap-info-${id}" style="font-size: 0.72rem;">เหลือ 98 ตัวเลข</small>
                                </div>

                                <div class="text-center">
                                    <small class="text-danger d-block" style="font-size: 0.75rem; font-weight: 600;">สูงสุด</small>
                                    <div class="badge px-3 py-2 fs-5 fw-bold font-monospace shadow-sm" id="guess-max-badge-${id}" style="background: rgba(244, 63, 94, 0.15); border: 1.5px solid #f43f5e; color: #fb7185; border-radius: 12px;">100</div>
                                </div>
                            </div>

                            <!-- Range span gauge bar -->
                            <div class="progress mt-2" style="height: 6px; background: rgba(255, 255, 255, 0.08); border-radius: 10px;">
                                <div class="progress-bar bg-info progress-bar-striped progress-bar-animated" id="guess-gauge-${id}" role="progressbar" style="width: 100%; transition: width 0.35s ease;"></div>
                            </div>
                        </div>

                        <!-- Dynamic Hint Banner -->
                        <div class="p-2 mb-2 rounded-3 text-center fw-bold transition-all shadow-sm" id="guess-hint-banner-${id}" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); color: #c7d2fe; font-size: 0.88rem;">
                            <i class="bi bi-lightbulb-fill text-warning me-1"></i>พร้อมแล้ว! ใส่ตัวเลขที่คาดเดาด้านล่าง
                        </div>

                        <!-- Input and Action Controls -->
                        <div class="d-flex align-items-center gap-1 mb-2">
                            <button type="button" class="btn btn-sm btn-outline-light rounded-circle px-2" onclick="adjustGuessInput('${id}', -1)" title="-1" style="width: 32px; height: 32px; flex-shrink: 0;">-1</button>
                            <input type="number" class="form-control form-control-sm text-center fw-bold font-monospace bg-dark text-white border-secondary" id="guess-input-${id}" placeholder="ใส่ตัวเลข..." style="font-size: 1.1rem; border-radius: 10px;" onkeydown="if(event.key==='Enter') submitNumberGuess('${id}')">
                            <button type="button" class="btn btn-sm btn-outline-light rounded-circle px-2" onclick="adjustGuessInput('${id}', 1)" title="+1" style="width: 32px; height: 32px; flex-shrink: 0;">+1</button>
                            <button type="button" class="btn btn-info btn-sm fw-bold px-3 rounded-pill text-dark shadow-sm" id="guess-submit-btn-${id}" onclick="submitNumberGuess('${id}')" style="white-space: nowrap; height: 32px;">
                                <i class="bi bi-send-fill me-1"></i>ตรวจผล
                            </button>
                        </div>

                        <!-- Quick Helpers: Midpoint & Actions -->
                        <div class="d-flex justify-content-between align-items-center gap-1 mt-auto">
                            <button type="button" class="btn btn-sm btn-outline-warning rounded-pill py-0 px-2 fw-semibold" id="guess-midpoint-btn-${id}" onclick="quickGuessMidpoint('${id}')" style="font-size: 0.75rem;">
                                <i class="bi bi-bullseye me-1"></i>ครึ่งทาง: <span id="guess-midpoint-val-${id}">50</span>
                            </button>
                            <div class="d-flex align-items-center gap-1">
                                <button type="button" class="btn btn-sm btn-info active rounded-pill py-0 px-2 fw-semibold" id="guess-settings-btn-${id}" onclick="toggleGuessSettings('${id}')" title="แสดง/ซ่อน ตั้งค่าและประวัติการทาย" style="font-size: 0.75rem;">
                                    <i class="bi bi-sliders me-1"></i><span id="guess-history-count-${id}">ตั้งค่า & ประวัติ (0)</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger rounded-pill py-0 px-2" onclick="resetNumberGuessGame('${id}')" title="เริ่มรอบใหม่" style="font-size: 0.75rem;">
                                    <i class="bi bi-arrow-counterclockwise"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Settings & History Panel (ส่วนตั้งค่า ประวัติ ไปไว้ทางขวา) -->
                    <div id="guess-details-panel-${id}" class="guess-right-col text-start">
                        <!-- Presets & Custom Range -->
                        <div class="p-2 mb-2 rounded-3" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="small fw-semibold text-white d-flex align-items-center gap-1" style="font-size: 0.78rem;">
                                    <i class="bi bi-lightning-charge-fill text-warning"></i>ช่วงตัวเลขด่วน:
                                </span>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button type="button" class="btn btn-dark btn-sm py-0 px-2 border-secondary text-white-50" style="font-size: 0.7rem;" onclick="setGuessPreset('${id}', 1, 50)">1-50</button>
                                    <button type="button" class="btn btn-dark btn-sm py-0 px-2 border-secondary text-white-50" style="font-size: 0.7rem;" onclick="setGuessPreset('${id}', 1, 100)">1-100</button>
                                    <button type="button" class="btn btn-dark btn-sm py-0 px-2 border-secondary text-white-50" style="font-size: 0.7rem;" onclick="setGuessPreset('${id}', 1, 500)">1-500</button>
                                    <button type="button" class="btn btn-dark btn-sm py-0 px-2 border-secondary text-white-50" style="font-size: 0.7rem;" onclick="setGuessPreset('${id}', 1, 1000)">1-1000</button>
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text bg-dark border-secondary text-white-50" style="font-size: 0.7rem;">ต่ำสุด</span>
                                    <input type="number" class="form-control bg-dark text-white border-secondary" id="guess-cfg-min-${id}" value="1" min="0" style="font-size: 0.8rem;">
                                </div>
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text bg-dark border-secondary text-white-50" style="font-size: 0.7rem;">สูงสุด</span>
                                    <input type="number" class="form-control bg-dark text-white border-secondary" id="guess-cfg-max-${id}" value="100" min="2" style="font-size: 0.8rem;">
                                </div>
                                <button type="button" class="btn btn-warning btn-sm fw-bold px-2 py-1 text-dark" style="font-size: 0.72rem; white-space: nowrap;" onclick="applyCustomGuessRange('${id}')">ใช้</button>
                            </div>
                        </div>

                        <!-- Guess History Badges Box -->
                        <div class="d-flex flex-column flex-grow-1 p-2 rounded-3" style="background: rgba(10, 15, 30, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="small text-white-50 fw-semibold" style="font-size: 0.76rem;">
                                    <i class="bi bi-clock-history me-1 text-info"></i>ประวัติการทายในรอบนี้:
                                </span>
                                <span class="badge bg-secondary-subtle text-white-50 border border-secondary" id="guess-history-badge-${id}" style="font-size: 0.68rem;">0 ครั้ง</span>
                            </div>
                            <div id="guess-history-list-${id}" class="d-flex flex-wrap gap-1 align-content-start flex-grow-1 overflow-y-auto" style="min-height: 80px; max-height: 180px;">
                                <span class="text-white-50 small" style="font-size: 0.74rem;">ยังไม่มีการทาย</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        postRender: (id) => {
            initNumberGuessWidget(id);
        },
        cleanup: (id) => {
            destroyNumberGuessWidget(id);
        }
    }
};

// ====================================================
// 🎲 WIDGET SPECIFIC ACTIONS & HELPERS
// ====================================================

// 🎲 Dice Helper Functions
const diceDotsMap = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
};

function getDiceDotsSVG(val) {
    const activeIndices = diceDotsMap[val] || [];
    let dotsHTML = '';
    for (let i = 0; i < 9; i++) {
        if (activeIndices.includes(i)) {
            dotsHTML += `<div class="dice-dot"></div>`;
        } else {
            dotsHTML += `<div></div>`;
        }
    }
    return dotsHTML;
}

function setDiceCount(id, count, btn) {
    const parent = btn.parentElement;
    parent.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const container = document.getElementById(`dice-container-${id}`);
    if (!container) return;

    let html = '';
    for (let i = 1; i <= count; i++) {
        html += `<div class="dice-face" id="dice-${i}-${id}">${getDiceDotsSVG(6)}</div>`;
    }
    container.innerHTML = html;
    document.getElementById(`dice-sum-${id}`).innerText = `ผลรวม: ${count * 6}`;
    debouncedSaveWidgetsState();
}

function rollDice(id) {
    const container = document.getElementById(`dice-container-${id}`);
    if (!container) return;

    const diceList = container.querySelectorAll('.dice-face');
    playSound('dice');

    diceList.forEach(dice => dice.classList.add('dice-rolling'));

    setTimeout(() => {
        let total = 0;
        diceList.forEach(dice => {
            dice.classList.remove('dice-rolling');
            const val = Math.floor(Math.random() * 6) + 1;
            total += val;
            dice.innerHTML = getDiceDotsSVG(val);
        });
        document.getElementById(`dice-sum-${id}`).innerText = `ผลรวม: ${total}`;
    }, 400);
}

// 🎰 Random Name Picker Logic & Saved Classrooms Engine
let _cachedGyverClassrooms = [];

async function populateClassroomsDropdown(id, isManualRefresh = false) {
    const selectEl = document.getElementById(`name-class-select-${id}`);
    const refreshIcon = document.getElementById(`refresh-icon-${id}`);
    if (!selectEl) return;

    if (refreshIcon) refreshIcon.classList.add('spin-animation');

    try {
        let classrooms = [];

        // 1. Try fetching from Supabase if client is ready
        if (window.supabaseClient) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session?.user) {
                    const { data, error } = await window.supabaseClient
                        .from('classrooms')
                        .select('*')
                        .eq('teacher_id', session.user.id)
                        .order('created_at', { ascending: false });

                    if (!error && Array.isArray(data) && data.length > 0) {
                        classrooms = data;
                        try {
                            localStorage.setItem('gyver_cached_classrooms', JSON.stringify(data));
                        } catch (_) { }
                    }
                }
            } catch (err) {
                console.warn('Error fetching classrooms from Supabase:', err);
            }
        }

        // 2. Fallback to localStorage cache
        if (classrooms.length === 0) {
            try {
                const local = localStorage.getItem('gyver_cached_classrooms');
                if (local) {
                    const parsed = JSON.parse(local);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        classrooms = parsed;
                    }
                }
            } catch (_) { }
        }

        // 3. Fallback to custom classes created locally
        if (classrooms.length === 0) {
            try {
                const localSaved = localStorage.getItem('gyver_custom_classes');
                if (localSaved) {
                    const parsed = JSON.parse(localSaved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        classrooms = parsed;
                    }
                }
            } catch (_) { }
        }

        _cachedGyverClassrooms = classrooms;

        const currentVal = selectEl.value;
        selectEl.innerHTML = '<option value="">-- เลือกห้องเรียน (ดึงรายชื่อทันที) --</option>';

        if (classrooms.length > 0) {
            classrooms.forEach(c => {
                const studentCount = Array.isArray(c.students) ? c.students.length : 0;
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `🏫 ${c.class_name || 'ไม่มีชื่อห้อง'} (${studentCount} คน)`;
                selectEl.appendChild(opt);
            });

            if (currentVal && classrooms.some(c => String(c.id) === String(currentVal))) {
                selectEl.value = currentVal;
            }

            if (isManualRefresh && typeof showDockToast === 'function') {
                showDockToast(`🔄 รีเฟรชพบ ${classrooms.length} ห้องเรียน`);
            }
        } else {
            const opt = document.createElement('option');
            opt.value = "";
            opt.disabled = true;
            opt.textContent = 'ยังไม่มีห้องเรียนในระบบ (คลิก ↗ เพื่อสร้างห้อง)';
            selectEl.appendChild(opt);

            if (isManualRefresh && typeof showDockToast === 'function') {
                showDockToast('ℹ️ ยังไม่พบห้องเรียน (ไปสร้างได้ที่ จัดการห้องเรียน)');
            }
        }
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('spin-animation'), 400);
        }
    }
}

function onClassroomSelected(id, classId) {
    if (!classId) return;
    const textarea = document.getElementById(`name-input-${id}`);
    const display = document.getElementById(`name-display-${id}`);
    const badge = document.getElementById(`name-class-count-${id}`);

    const targetClass = (_cachedGyverClassrooms || []).find(c => String(c.id) === String(classId));
    if (!targetClass) return;

    let students = targetClass.students || [];
    let nameList = [];
    if (Array.isArray(students)) {
        nameList = students.map(s => {
            if (typeof s === 'string') return s.trim();
            if (s && typeof s === 'object') return (s.name || s.student_name || s.nickname || '').trim();
            return '';
        }).filter(n => n.length > 0);
    }

    if (nameList.length > 0) {
        if (textarea) textarea.value = nameList.join('\n');
        if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `${nameList.length} คน`;
        }
        if (display) {
            display.innerHTML = `<span class="text-info fs-5">📚 ${targetClass.class_name || 'ห้องเรียน'}<br><small class="text-white-50" style="font-size: 0.85rem;">โหลด ${nameList.length} รายชื่อพร้อมสุ่มแล้ว!</small></span>`;
        }
        if (typeof showDockToast === 'function') {
            showDockToast(`✅ โหลดรายชื่อห้อง "${targetClass.class_name}" (${nameList.length} คน) สำเร็จ`);
        }
        debouncedSaveWidgetsState();
    } else {
        if (badge) badge.style.display = 'none';
        if (display) {
            display.innerHTML = `<span class="text-warning small">⚠️ ห้อง "${targetClass.class_name}" ยังไม่มีรายชื่อนักเรียน</span>`;
        }
    }
}

async function saveCurrentNamesAsClassroom(id) {
    const textarea = document.getElementById(`name-input-${id}`);
    if (!textarea) return;

    const names = textarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) {
        alert('กรุณากรอกรายชื่ออย่างน้อย 1 คน');
        return;
    }

    const defaultTitle = `ห้องเรียนพิเศษ ${new Date().toLocaleDateString('th-TH')}`;
    const className = prompt('ตั้งชื่อห้องเรียนใหม่สำหรับบันทึกรายชื่อนี้:', defaultTitle);
    if (!className || !className.trim()) return;

    const studentsPayload = names.map((name, idx) => ({ id: idx + 1, name }));
    const newClassId = 'local-' + Date.now();
    const newClassroom = {
        id: newClassId,
        class_name: className.trim(),
        students: studentsPayload,
        created_at: new Date().toISOString()
    };

    // Try saving to Supabase if logged in
    try {
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session?.user) {
                await window.supabaseClient.from('classrooms').insert([{
                    class_name: className.trim(),
                    teacher_id: session.user.id,
                    students: studentsPayload,
                    room_code: Math.floor(100000 + Math.random() * 900000).toString()
                }]);
            }
        }
    } catch (_) { }

    // Save to local cache as well
    try {
        const localSaved = JSON.parse(localStorage.getItem('gyver_custom_classes') || '[]');
        localSaved.unshift(newClassroom);
        localStorage.setItem('gyver_custom_classes', JSON.stringify(localSaved));
    } catch (_) { }

    await populateClassroomsDropdown(id);
    const selectEl = document.getElementById(`name-class-select-${id}`);
    if (selectEl) {
        selectEl.value = newClassId;
        onClassroomSelected(id, newClassId);
    }
    if (typeof showDockToast === 'function') {
        showDockToast(`💾 บันทึกห้อง "${className.trim()}" เรียบร้อยแล้ว`);
    }
}

function toggleNameSettings(id) {
    const panel = document.getElementById(`name-settings-panel-${id}`);
    const btn = document.getElementById(`toggle-list-btn-${id}`);
    const widget = document.getElementById(id);
    if (!panel) return;

    const isHidden = panel.style.display === 'none';

    if (isHidden) {
        panel.style.display = 'flex';
        if (btn) {
            btn.classList.add('active', 'btn-warning');
            btn.classList.remove('btn-outline-light');
        }
        if (widget) {
            widget.classList.remove('name-settings-collapsed');
            if (!widget.classList.contains('is-expanded')) {
                const curW = widget.offsetWidth;
                if (curW < 560) {
                    widget.dataset.compactWidth = widget.style.width || '';
                    widget.style.width = '610px';
                }
            }
        }
    } else {
        panel.style.display = 'none';
        if (btn) {
            btn.classList.remove('active', 'btn-warning');
            btn.classList.add('btn-outline-light');
        }
        if (widget) {
            widget.classList.add('name-settings-collapsed');
            if (!widget.classList.contains('is-expanded')) {
                if (widget.dataset.compactWidth !== undefined) {
                    widget.style.width = widget.dataset.compactWidth;
                    delete widget.dataset.compactWidth;
                } else {
                    widget.style.width = '320px';
                }
            }
        }
    }
    debouncedSaveWidgetsState();
}

function spinNamePicker(id) {
    const textarea = document.getElementById(`name-input-${id}`);
    const display = document.getElementById(`name-display-${id}`);
    const removeCheckbox = document.getElementById(`remove-picked-${id}`);
    if (!textarea || !display) return;

    const names = textarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) {
        display.innerHTML = `<span class="text-danger fs-5">โปรดระบุรายชื่อ!</span>`;
        return;
    }

    let spins = 0;
    const maxSpins = 22;
    playSound('dice');

    const interval = setInterval(() => {
        spins++;
        const randName = names[Math.floor(Math.random() * names.length)];
        display.innerHTML = `<span class="text-warning font-mono">${randName}</span>`;

        if (spins >= maxSpins) {
            clearInterval(interval);
            const winner = names[Math.floor(Math.random() * names.length)];
            display.innerHTML = `<span class="text-success fw-bold animate__animated animate__bounceIn">🎉 ${winner} 🎉</span>`;
            playSound('fanfare');

            if (removeCheckbox && removeCheckbox.checked) {
                const updatedNames = names.filter(n => n !== winner);
                textarea.value = updatedNames.join('\n');
                debouncedSaveWidgetsState();
            }
        }
    }, 75);
}

// ====================================================
// 🎡 Gyver Wheel Lucky Draw Widget Engine
// ====================================================
const wheelWidgetStates = {};

function initWheelWidget(id) {
    const textarea = document.getElementById(`wheel-input-${id}`);
    const raw = textarea ? textarea.value : '';
    const items = raw.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    wheelWidgetStates[id] = {
        items: items.length > 0 ? items : ['ปุ่น', 'หนูดี', 'ซาย', 'ชมพู่', 'ปริ้น', 'โอ๊ค'],
        startAngle: 0,
        isSpinning: false,
        currentWinnerIndex: -1,
        animFrameId: null
    };

    drawWheelWidget(id);
    populateWheelClassrooms(id);
}

function destroyWheelWidget(id) {
    if (wheelWidgetStates[id]) {
        if (wheelWidgetStates[id].animFrameId) {
            cancelAnimationFrame(wheelWidgetStates[id].animFrameId);
        }
        delete wheelWidgetStates[id];
    }
}

function drawWheelWidget(id) {
    const canvas = document.getElementById(`wheel-canvas-${id}`);
    const state = wheelWidgetStates[id];
    if (!canvas || !state) return;

    const ctx = canvas.getContext('2d');
    const sz = canvas.width;
    const cx = sz / 2;
    const r = cx - 12;
    ctx.clearRect(0, 0, sz, sz);

    const items = state.items;
    if (items.length === 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cx, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px Kanit';
        ctx.textAlign = 'center';
        ctx.fillText('กรุณาใส่รายชื่อ', cx, cx);
        ctx.restore();
        return;
    }

    const arc = (Math.PI * 2) / items.length;

    items.forEach((item, i) => {
        const a = state.startAngle + i * arc;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cx);
        ctx.arc(cx, cx, r, a, a + arc);

        const g = ctx.createRadialGradient(cx, cx, 8, cx, cx, r);
        const hue = (i * 360) / items.length;
        g.addColorStop(0, '#0f172a');
        g.addColorStop(0.55, `hsl(${hue}, 85%, 48%)`);
        g.addColorStop(1, `hsl(${hue}, 90%, 35%)`);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();
        ctx.restore();

        // Label
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = items.length > 24 ? 'bold 11px Kanit' : (items.length > 14 ? 'bold 13px Kanit' : 'bold 15px Kanit');
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 4;
        ctx.translate(cx, cx);
        ctx.rotate(a + arc / 2);
        ctx.textAlign = 'right';
        const displayLabel = item.length > 14 ? item.substring(0, 13) + '…' : item;
        ctx.fillText(displayLabel, cx - 22, 5);
        ctx.restore();
    });

    // Outer ring highlight
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    // Center circular badge
    ctx.beginPath();
    ctx.arc(cx, cx, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cx, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.restore();

    updateWheelPointerColor(id);
}

function updateWheelPointerColor(id) {
    const state = wheelWidgetStates[id];
    const pointer = document.getElementById(`wheel-pointer-${id}`);
    if (!state || !pointer || state.items.length === 0) return;

    const arc = (Math.PI * 2) / state.items.length;
    const cIdx = Math.floor((Math.PI * 1.5 - ((state.startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / arc) % state.items.length;
    const targetColor = `hsl(${(cIdx * 360 / state.items.length)}, 80%, 55%)`;
    pointer.style.setProperty('--pointer-color', targetColor);
}

function spinWheelWidget(id) {
    const state = wheelWidgetStates[id];
    const spinBtn = document.getElementById(`wheel-spin-btn-${id}`);
    const pointer = document.getElementById(`wheel-pointer-${id}`);
    const banner = document.getElementById(`wheel-winner-banner-${id}`);

    if (!state || state.isSpinning || state.items.length === 0) return;

    if (banner) banner.classList.remove('show');

    state.isSpinning = true;
    if (spinBtn) spinBtn.disabled = true;

    playSound('dice');

    let startTime = null;
    const duration = 5400;
    const baseAngle = state.startAngle;
    const additionalSpin = 32 + Math.random() * 22 + Math.random() * Math.PI * 2;
    let lastTickSegment = -1;

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        state.startAngle = baseAngle + ((1 - Math.pow(1 - progress, 5)) * additionalSpin);
        drawWheelWidget(id);

        if (state.items.length > 0) {
            const arc = (Math.PI * 2) / state.items.length;
            const currentSegment = Math.floor(state.startAngle / arc);
            if (currentSegment !== lastTickSegment) {
                lastTickSegment = currentSegment;
                if (pointer) {
                    pointer.classList.remove('tick-anim');
                    void pointer.offsetWidth;
                    pointer.classList.add('tick-anim');
                }
            }
        }

        if (progress < 1) {
            state.animFrameId = requestAnimationFrame(animate);
        } else {
            state.isSpinning = false;
            if (spinBtn) spinBtn.disabled = false;

            const arc = (Math.PI * 2) / state.items.length;
            state.currentWinnerIndex = Math.floor(((Math.PI * 1.5 - ((state.startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / arc) % state.items.length;
            const winner = state.items[state.currentWinnerIndex] || '';

            playSound('fanfare');
            if (typeof confetti === 'function') {
                try {
                    confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
                } catch (_) { }
            }

            // Check auto-remove
            const autoRemove = document.getElementById(`wheel-auto-remove-${id}`);
            if (autoRemove && autoRemove.checked) {
                setTimeout(() => {
                    dismissWheelWinner(id, true);
                }, 2200);
            }

            // Show winner banner
            const winnerNameEl = document.getElementById(`wheel-winner-name-${id}`);
            if (winnerNameEl) winnerNameEl.textContent = winner;
            if (banner) banner.classList.add('show');
        }
    }

    state.animFrameId = requestAnimationFrame(animate);
}

function dismissWheelWinner(id, doRemove = false) {
    const state = wheelWidgetStates[id];
    const banner = document.getElementById(`wheel-winner-banner-${id}`);
    const textarea = document.getElementById(`wheel-input-${id}`);
    if (banner) banner.classList.remove('show');

    if (doRemove && state && state.currentWinnerIndex >= 0 && state.items[state.currentWinnerIndex]) {
        state.items.splice(state.currentWinnerIndex, 1);
        if (textarea) textarea.value = state.items.join('\n');
        onWheelInputChanged(id);
    }
    if (state) state.currentWinnerIndex = -1;
    debouncedSaveWidgetsState();
}

function onWheelInputChanged(id) {
    const textarea = document.getElementById(`wheel-input-${id}`);
    const countBadge = document.getElementById(`wheel-item-count-${id}`);
    const state = wheelWidgetStates[id];
    if (!textarea || !state) return;

    const items = textarea.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    state.items = items;

    if (countBadge) {
        countBadge.textContent = `${items.length} รายการ`;
    }

    drawWheelWidget(id);
    debouncedSaveWidgetsState();
}

function shuffleWheelItems(id) {
    const textarea = document.getElementById(`wheel-input-${id}`);
    const state = wheelWidgetStates[id];
    if (!textarea || !state || state.items.length < 2) return;

    for (let i = state.items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.items[i], state.items[j]] = [state.items[j], state.items[i]];
    }

    textarea.value = state.items.join('\n');
    drawWheelWidget(id);
    debouncedSaveWidgetsState();
    if (typeof showDockToast === 'function') {
        showDockToast('🔀 สลับตำแหน่งในวงล้อแล้ว');
    }
}

function toggleWheelSettings(id) {
    const panel = document.getElementById(`wheel-settings-panel-${id}`);
    const btn = document.getElementById(`wheel-settings-toggle-${id}`);
    const widget = document.getElementById(id);
    if (!panel) return;

    const isHidden = panel.style.display === 'none';

    if (isHidden) {
        panel.style.display = 'flex';
        if (btn) btn.classList.add('active', 'btn-info');
        if (widget) {
            widget.classList.remove('wheel-settings-collapsed');
            if (!widget.classList.contains('is-expanded')) {
                const curW = widget.offsetWidth;
                if (curW < 560) {
                    widget.dataset.compactWidth = widget.style.width || '';
                    widget.style.width = '610px';
                }
            }
        }
    } else {
        panel.style.display = 'none';
        if (btn) btn.classList.remove('active', 'btn-info');
        if (widget) {
            widget.classList.add('wheel-settings-collapsed');
            if (!widget.classList.contains('is-expanded')) {
                if (widget.dataset.compactWidth !== undefined) {
                    widget.style.width = widget.dataset.compactWidth;
                    delete widget.dataset.compactWidth;
                } else {
                    widget.style.width = '320px';
                }
            }
        }
    }
    debouncedSaveWidgetsState();
}

async function populateWheelClassrooms(id, isManualRefresh = false) {
    const selectEl = document.getElementById(`wheel-class-select-${id}`);
    const refreshIcon = document.getElementById(`wheel-refresh-icon-${id}`);
    if (!selectEl) return;

    if (refreshIcon) refreshIcon.classList.add('spin-animation');

    try {
        let classrooms = _cachedGyverClassrooms || [];

        if (classrooms.length === 0) {
            try {
                if (window.supabaseClient) {
                    const { data: { session } } = await window.supabaseClient.auth.getSession();
                    if (session?.user) {
                        const { data } = await window.supabaseClient
                            .from('classrooms')
                            .select('*')
                            .eq('teacher_id', session.user.id)
                            .order('created_at', { ascending: false });
                        if (Array.isArray(data) && data.length > 0) classrooms = data;
                    }
                }
            } catch (_) { }

            if (classrooms.length === 0) {
                try {
                    const local = localStorage.getItem('gyver_cached_classrooms');
                    if (local) classrooms = JSON.parse(local);
                } catch (_) { }
            }

            if (classrooms.length === 0) {
                try {
                    const localCustom = localStorage.getItem('gyver_custom_classes');
                    if (localCustom) classrooms = JSON.parse(localCustom);
                } catch (_) { }
            }

            _cachedGyverClassrooms = classrooms;
        }

        const currentVal = selectEl.value;
        selectEl.innerHTML = '<option value="">-- เลือกห้องเรียน (ดึงรายชื่อลงวงล้อ) --</option>';

        if (classrooms.length > 0) {
            classrooms.forEach(c => {
                const count = Array.isArray(c.students) ? c.students.length : 0;
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `🏫 ${c.class_name || 'ไม่มีชื่อห้อง'} (${count} คน)`;
                selectEl.appendChild(opt);
            });

            if (currentVal && classrooms.some(c => String(c.id) === String(currentVal))) {
                selectEl.value = currentVal;
            }

            if (isManualRefresh && typeof showDockToast === 'function') {
                showDockToast(`🔄 รีเฟรชพบ ${classrooms.length} ห้องเรียน`);
            }
        } else {
            const opt = document.createElement('option');
            opt.value = "";
            opt.disabled = true;
            opt.textContent = 'ยังไม่มีห้องเรียนในระบบ';
            selectEl.appendChild(opt);
        }
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('spin-animation'), 400);
        }
    }
}

function onWheelClassroomSelected(id, classId) {
    if (!classId) return;
    const textarea = document.getElementById(`wheel-input-${id}`);
    const badge = document.getElementById(`wheel-class-count-${id}`);

    const targetClass = (_cachedGyverClassrooms || []).find(c => String(c.id) === String(classId));
    if (!targetClass) return;

    let students = targetClass.students || [];
    let nameList = [];
    if (Array.isArray(students)) {
        nameList = students.map(s => {
            if (typeof s === 'string') return s.trim();
            if (s && typeof s === 'object') return (s.name || s.student_name || s.nickname || '').trim();
            return '';
        }).filter(n => n.length > 0);
    }

    if (nameList.length > 0) {
        if (textarea) textarea.value = nameList.join('\n');
        if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `${nameList.length} คน`;
        }
        onWheelInputChanged(id);
        if (typeof showDockToast === 'function') {
            showDockToast(`✅ โหลดรายชื่อห้อง "${targetClass.class_name}" (${nameList.length} คน) ลงวงล้อสำเร็จ`);
        }
    }
    debouncedSaveWidgetsState();
}

// 🔊 Microphone Noise Level Sensor
async function toggleMicrophone(id) {
    const btn = document.getElementById(`mic-btn-${id}`);
    const widget = activeWidgets[id];

    if (widget && widget.stream) {
        // Stop stream
        widget.stream.getTracks().forEach(track => track.stop());
        delete widget.stream;
        btn.className = 'btn btn-sm btn-success w-100 rounded-pill fw-bold';
        btn.innerHTML = `<i class="bi bi-mic-fill me-1"></i>เปิดไมโครโฟน`;
        document.getElementById(`noise-fill-${id}`).style.width = '0%';
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const audioContext = getAudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        widget.stream = stream;
        widget.cleanup = () => {
            stream.getTracks().forEach(t => t.stop());
            javascriptNode.disconnect();
            microphone.disconnect();
        };

        btn.className = 'btn btn-sm btn-danger w-100 rounded-pill fw-bold';
        btn.innerHTML = `<i class="bi bi-mic-mute-fill me-1"></i>ปิดไมโครโฟน`;

        let threshold = parseInt(document.getElementById(`threshold-slider-${id}`).value) || 70;

        javascriptNode.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;
            const length = array.length;
            for (let i = 0; i < length; i++) {
                values += (array[i]);
            }
            const average = values / length;
            const volume = Math.min(100, Math.round(average * 2.2));

            const fillBar = document.getElementById(`noise-fill-${id}`);
            const valLabel = document.getElementById(`noise-val-${id}`);

            if (fillBar && valLabel) {
                fillBar.style.width = volume + '%';
                valLabel.innerText = volume + '%';

                if (volume > threshold) {
                    fillBar.classList.add('noise-alarm-badge');
                    playSound('beep');
                } else {
                    fillBar.classList.remove('noise-alarm-badge');
                }
            }
        };

    } catch (err) {
        alert('ไม่สามารถเข้าถึงไมโครโฟนได้: ' + err.message);
    }
}

function updateNoiseThreshold(id, val) {
    const label = document.getElementById(`threshold-val-${id}`);
    const line = document.getElementById(`threshold-line-${id}`);
    if (label) label.innerText = val + '%';
    if (line) line.style.left = val + '%';
}

// 🚥 Traffic Light Control
function setTraffic(id, color) {
    const red = document.getElementById(`t-red-${id}`);
    const yellow = document.getElementById(`t-yellow-${id}`);
    const green = document.getElementById(`t-green-${id}`);
    const status = document.getElementById(`t-status-${id}`);

    [red, yellow, green].forEach(b => b && b.classList.remove('active'));

    if (color === 'red') {
        red.classList.add('active');
        status.innerHTML = `<span class="text-danger">🔴 หยุดพูด / เงียบสนิท (Silence)</span>`;
    } else if (color === 'yellow') {
        yellow.classList.add('active');
        status.innerHTML = `<span class="text-warning">🟡 ระวังเสียงดัง / สรุปงาน (Caution)</span>`;
    } else {
        green.classList.add('active');
        status.innerHTML = `<span class="text-success">🟢 เริ่มทำงานได้! (Go)</span>`;
    }
    playSound('beep');
    debouncedSaveWidgetsState();
}

// ⏱️ Timer Countdown Logic
const timerState = {};

function addTimerSeconds(id, secs) {
    if (!timerState[id]) timerState[id] = { total: 300, running: false };
    timerState[id].total += secs;
    renderTimerDisplay(id);
    debouncedSaveWidgetsState();
}

function renderTimerDisplay(id) {
    const display = document.getElementById(`timer-display-${id}`);
    if (!display) return;
    const t = timerState[id] ? timerState[id].total : 300;
    const mins = Math.floor(t / 60);
    const secs = t % 60;
    display.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toggleTimer(id) {
    if (!timerState[id]) timerState[id] = { total: 300, running: false };
    const state = timerState[id];
    const btn = document.getElementById(`btn-timer-toggle-${id}`);

    if (state.running) {
        clearInterval(state.interval);
        state.running = false;
        if (btn) btn.innerHTML = `<i class="bi bi-play-fill me-1"></i>เริ่ม`;
    } else {
        state.running = true;
        if (btn) btn.innerHTML = `<i class="bi bi-pause-fill me-1"></i>หยุด`;
        state.interval = setInterval(() => {
            if (state.total > 0) {
                state.total--;
                renderTimerDisplay(id);
            } else {
                clearInterval(state.interval);
                state.running = false;
                if (btn) btn.innerHTML = `<i class="bi bi-play-fill me-1"></i>เริ่ม`;
                playSound('alarm');
            }
        }, 1000);
    }
}

function resetTimer(id) {
    if (timerState[id] && timerState[id].interval) {
        clearInterval(timerState[id].interval);
    }
    timerState[id] = { total: 300, running: false };
    const btn = document.getElementById(`btn-timer-toggle-${id}`);
    if (btn) btn.innerHTML = `<i class="bi bi-play-fill me-1"></i>เริ่ม`;
    renderTimerDisplay(id);
    debouncedSaveWidgetsState();
}

// 🙋‍♂️ Work Symbol Selector
function setWorkSymbol(card) {
    const parent = card.parentElement;
    parent.querySelectorAll('.symbol-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    playSound('beep');
    debouncedSaveWidgetsState();
}

// 🎨 Whiteboard Canvas Drawing Logic (Responsive with Auto-Resize & Preserved Strokes)
function initWidgetCanvas(id) {
    const canvas = document.getElementById(`draw-canvas-${id}`);
    const container = document.getElementById(`draw-container-${id}`);
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    if (!activeWidgets[id]) activeWidgets[id] = {};
    activeWidgets[id].drawColor = activeWidgets[id].drawColor || '#ef4444';
    activeWidgets[id].lineWidth = activeWidgets[id].lineWidth || 5;
    activeWidgets[id].mode = activeWidgets[id].mode || 'pen';

    // Auto-fit canvas resolution to container and keep previous strokes intact
    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        if (width <= 0 || height <= 0) return;
        if (canvas.width === width && canvas.height === height) return;

        // Save current canvas drawing
        let tempCanvas = null;
        if (canvas.width > 0 && canvas.height > 0) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        if (tempCanvas) {
            ctx.drawImage(tempCanvas, 0, 0);
        }
    }

    // Run initial sizing
    setTimeout(resizeCanvas, 40);
    setTimeout(resizeCanvas, 150);

    // Watch for window resize or widget resize
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
            resizeCanvas();
        });
        ro.observe(container);
        const prevCleanup = activeWidgets[id].cleanup;
        activeWidgets[id].cleanup = () => {
            ro.disconnect();
            if (prevCleanup) prevCleanup();
        };
    }

    // Pointer coordinates mapping
    function getPointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function startDraw(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        drawing = true;
        const pos = getPointerPos(e);
        lastX = pos.x;
        lastY = pos.y;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }

    function moveDraw(e) {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const isEraser = activeWidgets[id].mode === 'eraser';
        const baseWidth = activeWidgets[id].lineWidth || 5;

        if (isEraser) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(20, baseWidth * 3.8);
        } else {
            ctx.strokeStyle = activeWidgets[id].drawColor || '#ef4444';
            ctx.lineWidth = baseWidth;
        }

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
    }

    function stopDraw(e) {
        if (drawing) {
            drawing = false;
            debouncedSaveWidgetsState();
        }
    }

    // Pointer Events (Mouse, Touch, Apple Pencil)
    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', moveDraw);
    canvas.addEventListener('pointerup', stopDraw);
    canvas.addEventListener('pointercancel', stopDraw);
    canvas.addEventListener('pointerleave', stopDraw);

    // Touch Event fallback
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', moveDraw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
}

function setDrawMode(id, mode, btnEl) {
    if (!activeWidgets[id]) activeWidgets[id] = {};
    activeWidgets[id].mode = mode;

    const widget = document.getElementById(id);
    const penBtn = document.getElementById(`draw-mode-pen-${id}`);
    const eraserBtn = document.getElementById(`draw-mode-eraser-${id}`);
    const canvas = document.getElementById(`draw-canvas-${id}`);

    if (mode === 'eraser') {
        if (eraserBtn) {
            eraserBtn.className = 'btn btn-warning btn-sm py-0 px-2 fw-semibold draw-mode-btn active text-dark';
        }
        if (penBtn) {
            penBtn.className = 'btn btn-outline-primary btn-sm py-0 px-2 fw-semibold draw-mode-btn';
        }
        if (canvas) {
            canvas.classList.add('eraser-mode');
        }
    } else {
        if (penBtn) {
            penBtn.className = 'btn btn-primary btn-sm py-0 px-2 fw-semibold draw-mode-btn active';
        }
        if (eraserBtn) {
            eraserBtn.className = 'btn btn-outline-warning btn-sm py-0 px-2 fw-semibold draw-mode-btn';
        }
        if (canvas) {
            canvas.classList.remove('eraser-mode');
        }
    }
    debouncedSaveWidgetsState();
}

function setDrawColor(id, color, btnEl) {
    if (!activeWidgets[id]) activeWidgets[id] = {};
    activeWidgets[id].drawColor = color;

    // Switch back to pen mode automatically when selecting a color
    setDrawMode(id, 'pen');

    const widget = document.getElementById(id);
    if (widget) {
        widget.querySelectorAll('.draw-color-btn').forEach(b => b.classList.remove('active'));
    }
    if (btnEl) {
        btnEl.classList.add('active');
    }
    debouncedSaveWidgetsState();
}

function setDrawLineWidth(id, width, btnEl) {
    if (!activeWidgets[id]) activeWidgets[id] = {};
    activeWidgets[id].lineWidth = width;

    const widget = document.getElementById(id);
    if (widget) {
        widget.querySelectorAll('[id^="draw-size-"]').forEach(b => b.classList.remove('active', 'btn-light'));
    }
    if (btnEl) {
        btnEl.classList.add('active', 'btn-light');
    }
    debouncedSaveWidgetsState();
}

function clearDrawCanvas(id) {
    const canvas = document.getElementById(`draw-canvas-${id}`);
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        debouncedSaveWidgetsState();
    }
}

// 📱 QR Code Generator Update
function updateQRCode(id) {
    const input = document.getElementById(`qr-input-${id}`);
    const img = document.getElementById(`qr-img-${id}`);
    if (input && img && input.value.trim()) {
        const url = encodeURIComponent(input.value.trim());
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${url}`;
    }
}

// 👥 Group Maker Algorithm & Saved Classrooms Engine
const _groupResultsCache = {};

async function populateGroupClassrooms(id, isManualRefresh = false) {
    const selectEl = document.getElementById(`group-class-select-${id}`);
    const refreshIcon = document.getElementById(`group-refresh-icon-${id}`);
    if (!selectEl) return;

    if (refreshIcon) refreshIcon.classList.add('spin-animation');

    try {
        let classrooms = _cachedGyverClassrooms || [];

        if (classrooms.length === 0) {
            try {
                if (window.supabaseClient) {
                    const { data: { session } } = await window.supabaseClient.auth.getSession();
                    if (session?.user) {
                        const { data } = await window.supabaseClient
                            .from('classrooms')
                            .select('*')
                            .eq('teacher_id', session.user.id)
                            .order('created_at', { ascending: false });
                        if (Array.isArray(data) && data.length > 0) classrooms = data;
                    }
                }
            } catch (_) { }

            if (classrooms.length === 0) {
                try {
                    const local = localStorage.getItem('gyver_cached_classrooms');
                    if (local) classrooms = JSON.parse(local);
                } catch (_) { }
            }

            if (classrooms.length === 0) {
                try {
                    const localCustom = localStorage.getItem('gyver_custom_classes');
                    if (localCustom) classrooms = JSON.parse(localCustom);
                } catch (_) { }
            }

            _cachedGyverClassrooms = classrooms;
        }

        const currentVal = selectEl.value;
        selectEl.innerHTML = '<option value="">-- เลือกห้องเรียน (ดึงรายชื่อทันที) --</option>';

        if (classrooms.length > 0) {
            classrooms.forEach(c => {
                const count = Array.isArray(c.students) ? c.students.length : 0;
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `🏫 ${c.class_name || 'ไม่มีชื่อห้อง'} (${count} คน)`;
                selectEl.appendChild(opt);
            });

            if (currentVal && classrooms.some(c => String(c.id) === String(currentVal))) {
                selectEl.value = currentVal;
            }

            if (isManualRefresh && typeof showDockToast === 'function') {
                showDockToast(`🔄 รีเฟรชพบ ${classrooms.length} ห้องเรียน`);
            }
        } else {
            const opt = document.createElement('option');
            opt.value = "";
            opt.disabled = true;
            opt.textContent = 'ยังไม่มีห้องเรียนในระบบ (คลิก ↗ เพื่อสร้างห้อง)';
            selectEl.appendChild(opt);

            if (isManualRefresh && typeof showDockToast === 'function') {
                showDockToast('ℹ️ ยังไม่พบห้องเรียน (ไปสร้างได้ที่ จัดการห้องเรียน)');
            }
        }
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('spin-animation'), 400);
        }
    }
}

function onGroupClassroomSelected(id, classId) {
    if (!classId) return;
    const textarea = document.getElementById(`group-names-input-${id}`);
    const badge = document.getElementById(`group-class-count-${id}`);
    const resultsContainer = document.getElementById(`group-results-${id}`);

    const targetClass = (_cachedGyverClassrooms || []).find(c => String(c.id) === String(classId));
    if (!targetClass) return;

    let students = targetClass.students || [];
    let nameList = [];
    if (Array.isArray(students)) {
        nameList = students.map(s => {
            if (typeof s === 'string') return s.trim();
            if (s && typeof s === 'object') return (s.name || s.student_name || s.nickname || '').trim();
            return '';
        }).filter(n => n.length > 0);
    }

    if (nameList.length > 0) {
        if (textarea) textarea.value = nameList.join('\n');
        if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `${nameList.length} คน`;
        }
        updateGroupNamesBadge(id);

        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="small text-center py-2 text-info" style="font-weight: 500;">
                    <i class="bi bi-check-circle-fill me-1"></i>โหลดห้อง "<strong>${targetClass.class_name || 'ห้องเรียน'}</strong>" (${nameList.length} คน) เรียบร้อย<br>
                    <span class="text-white-50" style="font-size: 0.78rem;">กด "สุ่มจัดกลุ่ม" ด้านบนเพื่อเริ่มจัดกลุ่ม</span>
                </div>
            `;
        }

        if (typeof showDockToast === 'function') {
            showDockToast(`✅ โหลดรายชื่อห้อง "${targetClass.class_name}" (${nameList.length} คน) แล้ว`);
        }
    } else {
        if (badge) badge.style.display = 'none';
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="small text-center py-2 text-warning" style="font-weight: 500;">
                    ⚠️ ห้อง "${targetClass.class_name}" ยังไม่มีรายชื่อนักเรียน
                </div>
            `;
        }
    }
    debouncedSaveWidgetsState();
}

function toggleGroupNamesPanel(id) {
    const panel = document.getElementById(`group-names-panel-${id}`);
    if (!panel) return;
    const isHidden = panel.style.display === 'none' || !panel.style.display;
    panel.style.display = isHidden ? 'block' : 'none';
}

function updateGroupNamesBadge(id) {
    const textarea = document.getElementById(`group-names-input-${id}`);
    const badge = document.getElementById(`group-names-badge-${id}`);
    if (!textarea || !badge) return;
    const count = textarea.value.split('\n').map(s => s.trim()).filter(Boolean).length;
    badge.textContent = `รายชื่อ (${count} คน)`;
}

function clearGroupNames(id) {
    const textarea = document.getElementById(`group-names-input-${id}`);
    if (textarea) {
        textarea.value = '';
        updateGroupNamesBadge(id);
        debouncedSaveWidgetsState();
    }
}

function generateGroups(id) {
    const countSelect = document.getElementById(`group-count-${id}`);
    const resultsContainer = document.getElementById(`group-results-${id}`);
    const textarea = document.getElementById(`group-names-input-${id}`);

    const rawInput = textarea ? textarea.value : '';
    const names = rawInput.split('\n').map(s => s.trim()).filter(Boolean);

    if (names.length === 0) {
        if (typeof showDockToast === 'function') {
            showDockToast('⚠️ กรุณาเลือกห้องเรียนหรือใส่รายชื่อนักเรียนก่อนครับ');
        } else {
            alert('กรุณาเลือกห้องเรียนหรือใส่รายชื่อนักเรียนก่อนครับ');
        }
        return;
    }

    // Determine number of groups based on select value
    const rawVal = countSelect ? countSelect.value : 'g-3';
    let numGroups = 3;

    if (rawVal.startsWith('m-')) {
        const perGroup = parseInt(rawVal.replace('m-', '')) || 3;
        numGroups = Math.ceil(names.length / perGroup);
    } else if (rawVal.startsWith('g-')) {
        numGroups = parseInt(rawVal.replace('g-', '')) || 3;
    } else {
        numGroups = parseInt(rawVal) || 3;
    }

    numGroups = Math.max(1, Math.min(numGroups, names.length));

    // Fisher-Yates shuffle
    const shuffled = [...names];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Distribute into groups
    const groups = Array.from({ length: numGroups }, () => []);
    shuffled.forEach((name, idx) => {
        groups[idx % numGroups].push(name);
    });

    // Color palettes for groups
    const palettes = [
        { border: 'rgba(59, 130, 246, 0.45)', title: '#60a5fa', badgeBg: 'rgba(59, 130, 246, 0.25)', badgeColor: '#93c5fd' },
        { border: 'rgba(34, 197, 94, 0.45)', title: '#4ade80', badgeBg: 'rgba(34, 197, 94, 0.25)', badgeColor: '#86efac' },
        { border: 'rgba(245, 158, 11, 0.45)', title: '#fbbf24', badgeBg: 'rgba(245, 158, 11, 0.25)', badgeColor: '#fde68a' },
        { border: 'rgba(239, 68, 68, 0.45)', title: '#f87171', badgeBg: 'rgba(239, 68, 68, 0.25)', badgeColor: '#fca5a5' },
        { border: 'rgba(168, 85, 247, 0.45)', title: '#c084fc', badgeBg: 'rgba(168, 85, 247, 0.25)', badgeColor: '#d8b4fe' },
        { border: 'rgba(6, 182, 212, 0.45)', title: '#22d3ee', badgeBg: 'rgba(6, 182, 212, 0.25)', badgeColor: '#67e8f9' },
        { border: 'rgba(249, 115, 22, 0.45)', title: '#fb923c', badgeBg: 'rgba(249, 115, 22, 0.25)', badgeColor: '#fdba74' },
        { border: 'rgba(236, 72, 153, 0.45)', title: '#f472b6', badgeBg: 'rgba(236, 72, 153, 0.25)', badgeColor: '#fbcfe8' }
    ];

    // Save in cache for copying
    _groupResultsCache[id] = { groups, names };

    const headerHtml = `
        <div class="d-flex justify-content-between align-items-center mb-1 px-1">
            <span class="small text-white-50" style="font-size: 0.75rem;">
                <i class="bi bi-people me-1"></i>${names.length} คน &bull; ${groups.length} กลุ่ม
            </span>
            <button class="btn btn-sm btn-outline-info rounded-pill py-0 px-2" style="font-size: 0.72rem;" onclick="copyGroupResults('${id}')" title="คัดลอกรายชื่อกลุ่ม">
                <i class="bi bi-clipboard me-1"></i>คัดลอกผลลัพธ์
            </button>
        </div>
    `;

    const groupsHtml = groups.map((g, idx) => {
        const theme = palettes[idx % palettes.length];
        return `
            <div class="card p-2 text-start" style="background: rgba(15, 23, 42, 0.75); border: 1px solid ${theme.border}; border-radius: 8px;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-bold small" style="color: ${theme.title}; font-size: 0.85rem;">
                        <i class="bi bi-person-fill-check me-1"></i>กลุ่มที่ ${idx + 1}
                    </span>
                    <span class="badge rounded-pill" style="background: ${theme.badgeBg}; color: ${theme.badgeColor}; font-size: 0.7rem; font-weight: 600;">
                        ${g.length} คน
                    </span>
                </div>
                <div class="d-flex flex-wrap gap-1">
                    ${g.map(n => `
                        <span class="badge px-2 py-1" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #f1f5f9; font-weight: 500; font-size: 0.82rem;">
                            ${n}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = headerHtml + groupsHtml;
    debouncedSaveWidgetsState();

    playSound('fanfare');
    if (typeof confetti === 'function') {
        try {
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        } catch (_) { }
    }
}

function copyGroupResults(id) {
    const cached = _groupResultsCache[id];
    if (!cached || !cached.groups) return;

    let text = `📋 ผลการจัดกลุ่มนักเรียน (ทั้งหมด ${cached.names.length} คน, ${cached.groups.length} กลุ่ม)\n` + '='.repeat(35) + '\n';
    cached.groups.forEach((g, idx) => {
        text += `\n🔹 กลุ่มที่ ${idx + 1} (${g.length} คน):\n  ${g.join(', ')}\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            if (typeof showDockToast === 'function') {
                showDockToast('📋 คัดลอกผลการจัดกลุ่มเรียบร้อยแล้ว');
            }
        }).catch(() => fallbackCopyText(text));
    } else {
        fallbackCopyText(text);
    }
}

function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        if (typeof showDockToast === 'function') {
            showDockToast('📋 คัดลอกผลการจัดกลุ่มเรียบร้อยแล้ว');
        }
    } catch (_) { }
    document.body.removeChild(ta);
}

// 🎵 Media Embed URL Update
function embedMediaURL(id) {
    const input = document.getElementById(`media-url-${id}`);
    const container = document.getElementById(`media-frame-container-${id}`);
    if (!input || !container) return;

    let url = input.value.trim();
    if (!url) return;

    // Convert YouTube shorts/watch link to embed format
    if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1].split('&')[0];
        url = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        url = `https://www.youtube.com/embed/${videoId}`;
    }

    container.innerHTML = `<iframe src="${url}" title="Media player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

// ====================================================
// 🔢 15. Gyver Number Guess Widget Engine (Instant)
// ====================================================
const guessWidgetStates = {};
let _guessAudioCtx = null;

function initGuessAudio() {
    if (!_guessAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) _guessAudioCtx = new AudioContext();
    }
    if (_guessAudioCtx && _guessAudioCtx.state === 'suspended') {
        _guessAudioCtx.resume();
    }
}

function playGuessTone(freq, type = 'sine', duration = 0.12, gainVal = 0.15) {
    initGuessAudio();
    if (!_guessAudioCtx) return;
    try {
        const osc = _guessAudioCtx.createOscillator();
        const gain = _guessAudioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, _guessAudioCtx.currentTime);
        gain.gain.setValueAtTime(gainVal, _guessAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, _guessAudioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(_guessAudioCtx.destination);
        osc.start();
        osc.stop(_guessAudioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Guess audio error:", e);
    }
}

function playGuessTooHighSound() {
    playGuessTone(440, 'sawtooth', 0.14, 0.12);
    setTimeout(() => playGuessTone(330, 'sawtooth', 0.2, 0.12), 110);
}

function playGuessTooLowSound() {
    playGuessTone(392, 'triangle', 0.14, 0.18);
    setTimeout(() => playGuessTone(587.33, 'sine', 0.2, 0.2), 110);
}

function playGuessWinFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((f, i) => {
        setTimeout(() => playGuessTone(f, 'sine', 0.3, 0.2), i * 90);
    });
    if (typeof playSound === 'function') {
        playSound('fanfare');
    }
}

function initNumberGuessWidget(id) {
    const state = {
        minRange: 1,
        maxRange: 100,
        currentMin: 1,
        currentMax: 100,
        secret: 0,
        attempts: 0,
        history: [],
        isGameOver: false
    };
    guessWidgetStates[id] = state;
    resetNumberGuessGame(id, false);
    loadBestGuessRecord(id);
}

function destroyNumberGuessWidget(id) {
    delete guessWidgetStates[id];
}

function resetNumberGuessGame(id, playSoundEffect = true) {
    const state = guessWidgetStates[id];
    if (!state) return;

    state.currentMin = state.minRange;
    state.currentMax = state.maxRange;
    state.attempts = 0;
    state.history = [];
    state.isGameOver = false;

    // Generate random secret strictly between currentMin and currentMax
    if (state.maxRange - state.minRange > 2) {
        state.secret = Math.floor(Math.random() * (state.maxRange - state.minRange - 1)) + state.minRange + 1;
    } else {
        state.secret = Math.floor(Math.random() * (state.maxRange - state.minRange + 1)) + state.minRange;
    }

    // Update UI elements
    updateGuessDisplay(id);

    const hintBanner = document.getElementById(`guess-hint-banner-${id}`);
    if (hintBanner) {
        hintBanner.style.background = 'rgba(99, 102, 241, 0.15)';
        hintBanner.style.borderColor = 'rgba(99, 102, 241, 0.35)';
        hintBanner.style.color = '#c7d2fe';
        hintBanner.innerHTML = `<i class="bi bi-lightbulb-fill text-warning me-1"></i>พร้อมแล้ว! ทายตัวเลขระหว่าง ${state.currentMin} ถึง ${state.currentMax}`;
    }

    const input = document.getElementById(`guess-input-${id}`);
    if (input) {
        input.value = '';
        input.disabled = false;
        input.placeholder = `${state.currentMin} - ${state.currentMax}`;
    }

    const submitBtn = document.getElementById(`guess-submit-btn-${id}`);
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.className = 'btn btn-info btn-sm fw-bold px-3 rounded-pill text-dark shadow-sm';
        submitBtn.innerHTML = '<i class="bi bi-send-fill me-1"></i>ตรวจผล';
    }

    renderGuessHistory(id);

    if (playSoundEffect) {
        playGuessTone(600, 'sine', 0.08, 0.1);
    }
    debouncedSaveWidgetsState();
}

function updateGuessDisplay(id) {
    const state = guessWidgetStates[id];
    if (!state) return;

    const minBadge = document.getElementById(`guess-min-badge-${id}`);
    const maxBadge = document.getElementById(`guess-max-badge-${id}`);
    const attemptsEl = document.getElementById(`guess-attempts-${id}`);
    const gapInfo = document.getElementById(`guess-gap-info-${id}`);
    const gauge = document.getElementById(`guess-gauge-${id}`);
    const midBtnVal = document.getElementById(`guess-midpoint-val-${id}`);

    if (minBadge) minBadge.textContent = state.currentMin;
    if (maxBadge) maxBadge.textContent = state.currentMax;
    if (attemptsEl) attemptsEl.textContent = state.attempts;

    const remainingSpan = Math.max(0, state.currentMax - state.currentMin - 1);
    if (gapInfo) {
        gapInfo.textContent = `เหลือ ${remainingSpan} ตัวเลข`;
    }

    const totalSpan = state.maxRange - state.minRange;
    if (gauge && totalSpan > 0) {
        const pct = Math.min(100, Math.max(5, (remainingSpan / totalSpan) * 100));
        gauge.style.width = `${pct}%`;
        if (pct < 20) {
            gauge.className = 'progress-bar bg-danger progress-bar-striped progress-bar-animated';
        } else if (pct < 50) {
            gauge.className = 'progress-bar bg-warning progress-bar-striped progress-bar-animated';
        } else {
            gauge.className = 'progress-bar bg-info progress-bar-striped progress-bar-animated';
        }
    }

    const mid = Math.floor((state.currentMin + state.currentMax) / 2);
    if (midBtnVal) midBtnVal.textContent = mid;
}

function submitNumberGuess(id) {
    const state = guessWidgetStates[id];
    if (!state) return;

    if (state.isGameOver) {
        resetNumberGuessGame(id, true);
        return;
    }

    const input = document.getElementById(`guess-input-${id}`);
    if (!input) return;

    const guess = parseInt(input.value);
    if (isNaN(guess)) {
        if (typeof showDockToast === 'function') {
            showDockToast('⚠️ กรุณาใส่ตัวเลขที่ต้องการทายก่อนครับ');
        }
        input.focus();
        return;
    }

    if (guess <= state.currentMin || guess >= state.currentMax) {
        const msg = `⚠️ ต้องใส่ตัวเลขระหว่าง ${state.currentMin} ถึง ${state.currentMax} ครับ`;
        if (typeof showDockToast === 'function') {
            showDockToast(msg);
        }
        playGuessTone(220, 'sawtooth', 0.2, 0.15);
        input.focus();
        return;
    }

    state.attempts++;
    const hintBanner = document.getElementById(`guess-hint-banner-${id}`);
    const submitBtn = document.getElementById(`guess-submit-btn-${id}`);

    if (guess === state.secret) {
        // 🎉 WINNER!
        state.isGameOver = true;
        state.history.unshift({ guess, result: 'win', hint: 'ถูกต้อง! 🎉' });

        if (hintBanner) {
            hintBanner.style.background = 'rgba(16, 185, 129, 0.25)';
            hintBanner.style.borderColor = '#10b981';
            hintBanner.style.color = '#6ee7b7';
            hintBanner.innerHTML = `🎉 <strong>ถูกต้องแล้ว! คำตอบคือ ${guess}</strong> (ทายสำเร็จใน ${state.attempts} ครั้ง)`;
        }

        if (input) {
            input.disabled = true;
        }

        if (submitBtn) {
            submitBtn.className = 'btn btn-success btn-sm fw-bold px-3 rounded-pill shadow-sm';
            submitBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>เล่นใหม่';
        }

        // Save best record
        const savedBest = parseInt(localStorage.getItem('gyver_guess_best'));
        if (!savedBest || state.attempts < savedBest) {
            localStorage.setItem('gyver_guess_best', state.attempts);
            loadBestGuessRecord(id);
            if (typeof showDockToast === 'function') {
                showDockToast(`🏆 สถิติใหม่! ทายถูกต้องใน ${state.attempts} ครั้ง`);
            }
        }

        playGuessWinFanfare();
        if (typeof confetti === 'function') {
            try {
                confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
            } catch (_) { }
        }
    } else if (guess > state.secret) {
        // 🔻 TOO HIGH
        state.currentMax = guess;
        state.history.unshift({ guess, result: 'high', hint: 'มากไป 🔻' });

        if (hintBanner) {
            hintBanner.style.background = 'rgba(239, 68, 68, 0.2)';
            hintBanner.style.borderColor = '#ef4444';
            hintBanner.style.color = '#fca5a5';
            hintBanner.innerHTML = `🔻 <strong>มากเกินไป!</strong> ต้องน้อยกว่า ${guess}`;
        }

        playGuessTooHighSound();
    } else {
        // 🔺 TOO LOW
        state.currentMin = guess;
        state.history.unshift({ guess, result: 'low', hint: 'น้อยไป 🔺' });

        if (hintBanner) {
            hintBanner.style.background = 'rgba(6, 182, 212, 0.2)';
            hintBanner.style.borderColor = '#06b6d4';
            hintBanner.style.color = '#67e8f9';
            hintBanner.innerHTML = `🔺 <strong>น้อยเกินไป!</strong> ต้องมากกว่า ${guess}`;
        }

        playGuessTooLowSound();
    }

    updateGuessDisplay(id);
    renderGuessHistory(id);
    debouncedSaveWidgetsState();

    if (!state.isGameOver && input) {
        input.value = '';
        input.placeholder = `${state.currentMin} - ${state.currentMax}`;
        input.focus();
    }
}

function quickGuessMidpoint(id) {
    const state = guessWidgetStates[id];
    if (!state || state.isGameOver) return;
    const mid = Math.floor((state.currentMin + state.currentMax) / 2);
    const input = document.getElementById(`guess-input-${id}`);
    if (input) {
        input.value = mid;
        input.focus();
    }
    playGuessTone(500, 'sine', 0.05, 0.08);
}

function adjustGuessInput(id, delta) {
    const state = guessWidgetStates[id];
    if (!state || state.isGameOver) return;
    const input = document.getElementById(`guess-input-${id}`);
    if (!input) return;
    let val = parseInt(input.value);
    if (isNaN(val)) {
        val = Math.floor((state.currentMin + state.currentMax) / 2);
    } else {
        val += delta;
    }
    input.value = Math.max(state.currentMin + 1, Math.min(state.currentMax - 1, val));
    input.focus();
    playGuessTone(600, 'sine', 0.05, 0.08);
}

function renderGuessHistory(id) {
    const state = guessWidgetStates[id];
    const container = document.getElementById(`guess-history-list-${id}`);
    const badgeCount = document.getElementById(`guess-history-count-${id}`);
    const historyBadge = document.getElementById(`guess-history-badge-${id}`);
    if (!state || !container) return;

    if (badgeCount) {
        badgeCount.textContent = `ตั้งค่า & ประวัติ (${state.history.length})`;
    }
    if (historyBadge) {
        historyBadge.textContent = `${state.history.length} ครั้ง`;
    }

    if (state.history.length === 0) {
        container.innerHTML = '<span class="text-white-50 small" style="font-size: 0.74rem;">ยังไม่มีการทาย</span>';
        return;
    }

    container.innerHTML = state.history.map(item => {
        let badgeClass = 'bg-secondary text-white';
        let icon = '';
        if (item.result === 'win') {
            badgeClass = 'bg-success text-white';
            icon = '🎉 ';
        } else if (item.result === 'high') {
            badgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
            icon = '🔻 ';
        } else if (item.result === 'low') {
            badgeClass = 'bg-info-subtle text-info border border-info-subtle';
            icon = '🔺 ';
        }
        return `<span class="badge ${badgeClass} px-2 py-1 font-monospace" style="font-size: 0.75rem;">${icon}${item.guess} <small>(${item.hint})</small></span>`;
    }).join(' ');
}

function toggleGuessSettings(id) {
    const panel = document.getElementById(`guess-details-panel-${id}`);
    const btn = document.getElementById(`guess-settings-btn-${id}`);
    const widget = document.getElementById(id);
    if (!panel) return;

    const isHidden = panel.style.display === 'none';

    if (isHidden) {
        panel.style.display = 'flex';
        if (btn) {
            btn.classList.add('active', 'btn-info');
            btn.classList.remove('btn-outline-info');
        }
        if (widget) {
            widget.classList.remove('guess-settings-collapsed');
            if (!widget.classList.contains('is-expanded')) {
                const curW = widget.offsetWidth;
                if (curW < 560) {
                    widget.dataset.compactWidth = widget.style.width || '';
                    widget.style.width = '640px';
                }
            }
        }
    } else {
        panel.style.display = 'none';
        if (btn) {
            btn.classList.remove('active', 'btn-info');
            btn.classList.add('btn-outline-info');
        }
        if (widget) {
            widget.classList.add('guess-settings-collapsed');
            if (!widget.classList.contains('is-expanded')) {
                if (widget.dataset.compactWidth !== undefined) {
                    widget.style.width = widget.dataset.compactWidth;
                    delete widget.dataset.compactWidth;
                } else {
                    widget.style.width = '350px';
                }
            }
        }
    }
    debouncedSaveWidgetsState();
}

function setGuessPreset(id, min, max) {
    const state = guessWidgetStates[id];
    if (!state) return;
    state.minRange = min;
    state.maxRange = max;
    const minInp = document.getElementById(`guess-cfg-min-${id}`);
    const maxInp = document.getElementById(`guess-cfg-max-${id}`);
    if (minInp) minInp.value = min;
    if (maxInp) maxInp.value = max;
    resetNumberGuessGame(id, true);
    if (typeof showDockToast === 'function') {
        showDockToast(`🎯 ตั้งช่วง ${min} - ${max} เรียบร้อย สุ่มเลขใหม่แล้ว`);
    }
}

function applyCustomGuessRange(id) {
    const minInp = document.getElementById(`guess-cfg-min-${id}`);
    const maxInp = document.getElementById(`guess-cfg-max-${id}`);
    const min = parseInt(minInp?.value) || 1;
    const max = parseInt(maxInp?.value) || 100;
    if (min >= max - 1) {
        if (typeof showDockToast === 'function') {
            showDockToast('⚠️ ค่าสูงสุดต้องมากกว่าค่าต่ำสุดอย่างน้อย 2 ครับ');
        }
        return;
    }
    setGuessPreset(id, min, max);
}

function loadBestGuessRecord(id) {
    const bestEl = document.getElementById(`guess-best-${id}`);
    const best = localStorage.getItem('gyver_guess_best');
    if (bestEl) {
        bestEl.textContent = best ? `${best} ครั้ง` : '-';
    }
}
