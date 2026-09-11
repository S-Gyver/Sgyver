/**
 * ====================================================
 * 🖍️ Gyver Workspace - Interactive Whiteboard Engine
 * Canvas Drawing, Tools, Patterns, Undo & PNG Export
 * ====================================================
 */

let wbCanvas = null;
let wbCtx = null;
let wbWrapper = null;
let isDrawing = false;
let currentTool = 'pen'; // 'pen', 'highlighter', 'eraser'
let currentSize = 2;
let currentColor = '#0f172a';
let currentBg = 'bg-white-clean';
let undoStack = [];
const MAX_UNDO = 25;
let lastX = 0;
let lastY = 0;

function initWhiteboard() {
    wbCanvas = document.getElementById('whiteboard-canvas');
    wbWrapper = document.getElementById('wb-canvas-wrapper');
    if (!wbCanvas || !wbWrapper) return;
    wbCtx = wbCanvas.getContext('2d', { willReadFrequently: true });

    setTimeout(() => {
        resizeWhiteboardCanvas(false);
    }, 100);

    window.addEventListener('resize', () => resizeWhiteboardCanvas(true));

    wbCanvas.addEventListener('pointerdown', handlePointerDown);
    wbCanvas.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // Keyboard shortcut: Ctrl + Z to Undo
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            const wbEl = document.getElementById('view-whiteboard-section');
            if (wbEl && !wbEl.classList.contains('d-none')) {
                e.preventDefault();
                undoWb();
            }
        }
    });
}

function resizeWhiteboardCanvas(preserve = true) {
    if (!wbCanvas || !wbWrapper || !wbCtx) return;
    const rect = wbWrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let backupData = null;
    if (preserve && wbCanvas.width > 0 && wbCanvas.height > 0) {
        try {
            backupData = wbCtx.getImageData(0, 0, wbCanvas.width, wbCanvas.height);
        } catch (e) {}
    }

    wbCanvas.width = rect.width;
    wbCanvas.height = rect.height;

    if (backupData) {
        wbCtx.putImageData(backupData, 0, 0);
    }
}

function saveWhiteboardState() {
    if (!wbCtx || !wbCanvas) return;
    try {
        if (undoStack.length >= MAX_UNDO) {
            undoStack.shift();
        }
        undoStack.push(wbCtx.getImageData(0, 0, wbCanvas.width, wbCanvas.height));
    } catch (e) {}
}

function getPointerPos(e) {
    const rect = wbCanvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function handlePointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    isDrawing = true;
    saveWhiteboardState();

    const pos = getPointerPos(e);
    lastX = pos.x;
    lastY = pos.y;

    drawStroke(lastX, lastY, pos.x, pos.y);
}

function handlePointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    drawStroke(lastX, lastY, pos.x, pos.y);
    lastX = pos.x;
    lastY = pos.y;
}

function handlePointerUp(e) {
    if (isDrawing) {
        isDrawing = false;
    }
}

function drawStroke(fromX, fromY, toX, toY) {
    if (!wbCtx) return;

    wbCtx.beginPath();
    wbCtx.lineCap = 'round';
    wbCtx.lineJoin = 'round';

    if (currentTool === 'pen') {
        wbCtx.globalCompositeOperation = 'source-over';
        wbCtx.strokeStyle = currentColor;
        wbCtx.lineWidth = currentSize;
        wbCtx.globalAlpha = 1.0;
    } else if (currentTool === 'highlighter') {
        wbCtx.globalCompositeOperation = 'multiply';
        wbCtx.strokeStyle = currentColor;
        wbCtx.lineWidth = currentSize * 3.5;
        wbCtx.globalAlpha = 0.35;
    } else if (currentTool === 'eraser') {
        wbCtx.globalCompositeOperation = 'destination-out';
        wbCtx.lineWidth = currentSize * 4;
        wbCtx.globalAlpha = 1.0;
    }

    wbCtx.moveTo(fromX, fromY);
    wbCtx.lineTo(toX, toY);
    wbCtx.stroke();
    wbCtx.closePath();
}

function setWbTool(tool) {
    currentTool = tool;
    ['pen', 'highlighter', 'eraser'].forEach(t => {
        const btn = document.getElementById(`wb-tool-${t}`);
        if (btn) {
            if (t === tool) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    if (tool === 'eraser') {
        wbCanvas.style.cursor = 'cell';
    } else {
        wbCanvas.style.cursor = 'crosshair';
    }
}

function setWbSize(size, tag) {
    currentSize = size;
    ['sm', 'md', 'lg'].forEach(s => {
        const btn = document.getElementById(`wb-size-${s}`);
        if (btn) {
            if (s === tag) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

function setWbColor(color, dotEl) {
    currentColor = color;
    document.querySelectorAll('.wb-color-dot').forEach(el => el.classList.remove('active'));
    if (dotEl) {
        dotEl.classList.add('active');
    }
    const picker = document.getElementById('wb-custom-color');
    if (picker) picker.value = color;

    if (currentTool === 'eraser') {
        setWbTool('pen');
    }
}

function setWbBackground(bgClass) {
    currentBg = bgClass;
    if (!wbWrapper) return;
    wbWrapper.className = `whiteboard-canvas-wrapper ${bgClass}`;

    const bgMap = {
        'bg-white-clean': 'wb-bg-white',
        'bg-grid': 'wb-bg-grid',
        'bg-lined': 'wb-bg-lined',
        'bg-chalkboard': 'wb-bg-chalk'
    };

    Object.entries(bgMap).forEach(([cls, id]) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (cls === bgClass) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    if (bgClass === 'bg-chalkboard' && currentColor === '#0f172a') {
        setWbColor('#ffffff', null);
    } else if (bgClass !== 'bg-chalkboard' && currentColor === '#ffffff') {
        setWbColor('#0f172a', null);
    }
}

function undoWb() {
    if (!wbCtx || undoStack.length === 0) return;
    const previous = undoStack.pop();
    wbCtx.putImageData(previous, 0, 0);
}

function clearWb() {
    if (!wbCtx || !wbCanvas) return;
    if (confirm('คุณต้องการล้างภาพวาดบนกระดานทั้งหมดใช่หรือไม่?')) {
        saveWhiteboardState();
        wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
    }
}

function downloadWbImage() {
    if (!wbCanvas) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = wbCanvas.width;
    tempCanvas.height = wbCanvas.height;
    const tCtx = tempCanvas.getContext('2d');

    if (currentBg === 'bg-chalkboard') {
        tCtx.fillStyle = '#0f172a';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    } else {
        tCtx.fillStyle = '#ffffff';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        if (currentBg === 'bg-grid') {
            tCtx.strokeStyle = '#e2e8f0';
            tCtx.lineWidth = 1;
            const step = 26;
            for (let x = 0; x < tempCanvas.width; x += step) {
                tCtx.beginPath(); tCtx.moveTo(x, 0); tCtx.lineTo(x, tempCanvas.height); tCtx.stroke();
            }
            for (let y = 0; y < tempCanvas.height; y += step) {
                tCtx.beginPath(); tCtx.moveTo(0, y); tCtx.lineTo(tempCanvas.width, y); tCtx.stroke();
            }
        } else if (currentBg === 'bg-lined') {
            tCtx.strokeStyle = '#e2e8f0';
            tCtx.lineWidth = 1;
            const step = 30;
            for (let y = 0; y < tempCanvas.height; y += step) {
                tCtx.beginPath(); tCtx.moveTo(0, y); tCtx.lineTo(tempCanvas.width, y); tCtx.stroke();
            }
        }
    }

    tCtx.drawImage(wbCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = `gyver_whiteboard_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}
