/**
 * ====================================================
 * 🚀 Gyver Workspace 2.0 - Main Workspace Controller
 * Sidebar, Dynamic Views, Scratchpad, To-Do, & Widgets
 * ====================================================
 */

// ====================================================
// 1. Sidebar Toggle (Desktop Icon Rail & Mobile Drawer)
// ====================================================
function toggleSidebar() {
    const sidebar = document.getElementById('gemini-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (window.innerWidth < 992) {
        sidebar.classList.toggle('show-mobile');
        backdrop.classList.toggle('show');
    } else {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        try {
            localStorage.setItem('gyver_sidebar_collapsed', isCollapsed ? 'true' : 'false');
        } catch (e) {}

        setTimeout(() => {
            if (typeof resizeWhiteboardCanvas === 'function') {
                resizeWhiteboardCanvas(true);
            }
        }, 280);
    }
}

// ====================================================
// 2. Switch Main Center View dynamically (7 Views)
// ====================================================
const views = {
    'board': 'view-board-section',
    'whiteboard': 'view-whiteboard-section',
    'teaching': 'view-teaching-section',
    'quick': 'view-quick-section',
    'education': 'view-education-section',
    'assessment': 'view-assessment-section',
    'teacher': 'view-teacher-section',
    'business': 'view-business-section'
};

function switchMainView(categoryKey) {
    // Hide all view sections
    Object.values(views).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('d-none');
    });

    // Show selected view
    const targetId = views[categoryKey] || 'view-board-section';
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.classList.remove('d-none');

    // Update active state in sidebar nav items & section links
    document.querySelectorAll('.sidebar-nav-item, .sidebar-section-link').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.getElementById(`nav-item-${categoryKey}`);
    if (activeNav) activeNav.classList.add('active');

    // Scroll workspace to top
    const workspace = document.getElementById('main-workspace-zone');
    if (workspace) workspace.scrollTop = 0;

    // Re-calibrate whiteboard canvas when switching to whiteboard view
    if (categoryKey === 'whiteboard') {
        setTimeout(() => {
            if (typeof resizeWhiteboardCanvas === 'function') {
                resizeWhiteboardCanvas(true);
            }
        }, 50);
    }

    // Close mobile sidebar if open
    if (window.innerWidth < 992) {
        const sidebar = document.getElementById('gemini-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('show-mobile');
        if (backdrop) backdrop.classList.remove('show');
    }
}

// ====================================================
// 3. Smart Notepad Auto-save (Scratchpad Widget)
// ====================================================
let noteSaveTimeout = null;

function loadBoardNotes() {
    const saved = localStorage.getItem('gyver_board_notes');
    const textarea = document.getElementById('my-board-notes');
    if (textarea && saved !== null) {
        textarea.value = saved;
        updateNotesWordCount(saved);
    }
}

function handleBoardNotesInput() {
    const textarea = document.getElementById('my-board-notes');
    const statusBadge = document.getElementById('notes-save-status');
    if (!textarea) return;

    const text = textarea.value;
    updateNotesWordCount(text);

    if (statusBadge) {
        statusBadge.className = 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 small';
        statusBadge.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>กำลังบันทึก...';
    }

    clearTimeout(noteSaveTimeout);
    noteSaveTimeout = setTimeout(() => {
        localStorage.setItem('gyver_board_notes', text);
        if (statusBadge) {
            statusBadge.className = 'badge bg-success-subtle text-success border border-success-subtle px-2 py-1 small';
            statusBadge.innerHTML = '<i class="bi bi-cloud-check-fill me-1"></i>บันทึกอัตโนมัติแล้ว';
        }
    }, 600);
}

function updateNotesWordCount(text) {
    const countEl = document.getElementById('notes-word-count');
    if (countEl) countEl.innerText = `${text.length} ตัวอักษร`;
}

function copyBoardNotes() {
    const textarea = document.getElementById('my-board-notes');
    if (!textarea || !textarea.value.trim()) {
        alert('ยังไม่มีข้อความในโน้ต');
        return;
    }
    navigator.clipboard.writeText(textarea.value).then(() => {
        const toast = (typeof Swal !== 'undefined') ? Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1800
        }) : null;
        if (toast) toast.fire({ icon: 'success', title: 'คัดลอกโน้ตเรียบร้อยแล้ว' });
        else alert('คัดลอกโน้ตเรียบร้อยแล้ว');
    });
}

function clearBoardNotes() {
    if (confirm('คุณต้องการล้างข้อความทั้งหมดในกระดานโน้ตใช่หรือไม่?')) {
        const textarea = document.getElementById('my-board-notes');
        if (textarea) {
            textarea.value = '';
            handleBoardNotesInput();
        }
    }
}

// ====================================================
// 4. Interactive To-Do List Widget
// ====================================================
let boardTodos = [];

function loadBoardTodos() {
    try {
        const raw = localStorage.getItem('gyver_board_todos');
        boardTodos = raw ? JSON.parse(raw) : [
            { id: '1', text: 'ทดลองใช้งาน Gyver Forms และแบบทดสอบ', done: true },
            { id: '2', text: 'เตรียมแผนการสอนและวงล้อสุ่มรายชื่อ', done: false },
            { id: '3', text: 'ตรวจเช็คประวัติคะแนนนักเรียน', done: false }
        ];
    } catch (e) {
        boardTodos = [];
    }
    renderBoardTodos();
}

function saveBoardTodos() {
    localStorage.setItem('gyver_board_todos', JSON.stringify(boardTodos));
    renderBoardTodos();
}

function renderBoardTodos() {
    const container = document.getElementById('board-todo-list');
    if (!container) return;

    if (boardTodos.length === 0) {
        container.innerHTML = '<div class="text-muted text-center py-3 small">ไม่มีรายการสิ่งที่ต้องทำ คลิกปุ่ม "+ เพิ่ม" ด้านบนได้เลย</div>';
        return;
    }

    container.innerHTML = boardTodos.map((todo) => `
        <div class="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light border ${todo.done ? 'opacity-75' : ''}">
            <div class="form-check m-0 d-flex align-items-center gap-2">
                <input class="form-check-input mt-0" type="checkbox" id="todo-${todo.id}" ${todo.done ? 'checked' : ''} onchange="toggleTodoDone('${todo.id}')">
                <label class="form-check-label small ${todo.done ? 'text-decoration-line-through text-muted' : 'text-dark fw-medium'}" for="todo-${todo.id}">
                    ${escapeHtml(todo.text)}
                </label>
            </div>
            <button class="btn btn-link text-danger p-0 border-0 ms-2" onclick="deleteTodo('${todo.id}')" title="ลบรายการ">
                <i class="bi bi-x-lg" style="font-size: 0.8rem;"></i>
            </button>
        </div>
    `).join('');
}

function toggleTodoDone(id) {
    const item = boardTodos.find(t => t.id === id);
    if (item) {
        item.done = !item.done;
        saveBoardTodos();
    }
}

function deleteTodo(id) {
    boardTodos = boardTodos.filter(t => t.id !== id);
    saveBoardTodos();
}

function addTodoPrompt() {
    const text = prompt('พิมพ์สิ่งที่ต้องทำ (To-Do):');
    if (text && text.trim()) {
        boardTodos.push({
            id: 't_' + Date.now(),
            text: text.trim(),
            done: false
        });
        saveBoardTodos();
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ====================================================
// 5. WIDGET CONTROLLER & CUSTOMIZATION SYSTEM
// ====================================================
const WIDGET_STORAGE_KEY = 'gyver_active_widgets';
const DEFAULT_WIDGETS = {
    banner: true,
    shortcuts: true,
    scratchpad: true,
    todo: true,
    clock: true,
    whiteboard: false
};

let activeWidgets = { ...DEFAULT_WIDGETS };

function loadWidgetConfig() {
    try {
        const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            activeWidgets = Object.assign({}, DEFAULT_WIDGETS, parsed);
        }
    } catch (e) {
        console.warn('Failed to load widget config from storage:', e);
        activeWidgets = { ...DEFAULT_WIDGETS };
    }

    // Apply visibility to all registered widgets
    Object.keys(activeWidgets).forEach(key => {
        applyWidgetVisibility(key, activeWidgets[key]);
    });

    updateWidgetBadgesAndLayout();
}

function saveWidgetConfig() {
    try {
        localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(activeWidgets));
    } catch (e) {
        console.warn('Failed to save widget config to storage:', e);
    }
}

function applyWidgetVisibility(key, isVisible) {
    let targetEl = document.getElementById(`widget-${key}`);
    if (key === 'scratchpad') {
        targetEl = document.getElementById('widget-scratchpad-col') || targetEl;
    } else if (key === 'todo') {
        targetEl = document.getElementById('widget-todo-col') || targetEl;
    }

    const switchEl = document.getElementById(`toggle-widget-${key}`);
    if (switchEl) {
        switchEl.checked = !!isVisible;
    }

    if (targetEl) {
        if (isVisible) {
            targetEl.classList.remove('d-none');
        } else {
            targetEl.classList.add('d-none');
        }
    }
}

function toggleWidget(key, isVisible) {
    activeWidgets[key] = !!isVisible;
    applyWidgetVisibility(key, activeWidgets[key]);
    saveWidgetConfig();
    updateWidgetBadgesAndLayout();
}

function showAllWidgets() {
    Object.keys(activeWidgets).forEach(key => {
        activeWidgets[key] = true;
        applyWidgetVisibility(key, true);
    });
    saveWidgetConfig();
    updateWidgetBadgesAndLayout();
}

function resetDefaultWidgets() {
    activeWidgets = { ...DEFAULT_WIDGETS };
    Object.keys(activeWidgets).forEach(key => {
        applyWidgetVisibility(key, activeWidgets[key]);
    });
    saveWidgetConfig();
    updateWidgetBadgesAndLayout();
}

function updateWidgetBadgesAndLayout() {
    const activeCount = Object.values(activeWidgets).filter(Boolean).length;

    // Badges in Header & Drawer
    const headerBadge = document.getElementById('active-widgets-count');
    const drawerBadge = document.getElementById('active-widgets-drawer-count');
    if (headerBadge) headerBadge.textContent = activeCount;
    if (drawerBadge) drawerBadge.textContent = `${activeCount} เปิดใช้งาน`;

    // Adjust scratchpad & todo columns dynamically
    const scratchpadCol = document.getElementById('widget-scratchpad-col');
    const todoCol = document.getElementById('widget-todo-col');
    const cardsRow = document.getElementById('board-cards-row');
    const scratchpadVisible = !!activeWidgets.scratchpad;
    const todoVisible = !!activeWidgets.todo;

    if (cardsRow) {
        if (!scratchpadVisible && !todoVisible) {
            cardsRow.classList.add('d-none');
        } else {
            cardsRow.classList.remove('d-none');
        }
    }

    if (scratchpadCol && todoCol) {
        if (scratchpadVisible && !todoVisible) {
            scratchpadCol.className = 'col-12';
        } else if (!scratchpadVisible && todoVisible) {
            todoCol.className = 'col-12';
        } else if (scratchpadVisible && todoVisible) {
            scratchpadCol.className = 'col-12 col-lg-7';
            todoCol.className = 'col-12 col-lg-5';
        }
    }
}

// 🕒 Live Clock Updater
function initLiveClock() {
    function updateClock() {
        const now = new Date();
        const timeEl = document.getElementById('board-clock-time');
        const dateEl = document.getElementById('board-clock-date');

        if (timeEl) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            timeEl.textContent = `${hours}:${minutes}:${seconds}`;
        }

        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('th-TH', options);
        }
    }

    updateClock();
    setInterval(updateClock, 1000);
}

// ====================================================
// 7. Page Initialization on DOMContentLoaded
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    // Clear any previous drag layout storage
    try {
        localStorage.removeItem('gyver_widget_layout_v2');
    } catch (e) {}

    // Restore sidebar collapsed state
    try {
        if (window.innerWidth >= 992 && localStorage.getItem('gyver_sidebar_collapsed') === 'true') {
            const sidebar = document.getElementById('gemini-sidebar');
            if (sidebar) sidebar.classList.add('collapsed');
        }
    } catch (e) {}

    loadWidgetConfig();
    loadCustomShortcuts();
    initLiveClock();
    loadBoardNotes();
    loadBoardTodos();

    if (typeof initWhiteboard === 'function') {
        initWhiteboard();
    }
});

// ====================================================
// 📊 CUSTOMIZABLE QUICK SHORTCUTS SYSTEM
// ====================================================
const SHORTCUTS_STORAGE_KEY = 'gyver_custom_shortcuts';

const ALL_SHORTCUT_CATALOG = [
    {
        id: 'education',
        title: 'Gyver Education',
        subtitle: 'กิจกรรมห้องเรียน',
        icon: 'bi-controller',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        action: "switchMainView('education')"
    },
    {
        id: 'forms',
        title: 'Gyver Forms',
        subtitle: 'แบบประเมิน & ควิซ',
        icon: 'bi-file-earmark-text-fill',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        action: "switchMainView('assessment')"
    },
    {
        id: 'wheel',
        title: 'Instant Wheel',
        subtitle: 'หมุนสุ่มชื่อด่วน',
        icon: 'bi-disc-fill',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        action: "switchMainView('quick')"
    },
    {
        id: 'pin',
        title: 'ใส่รหัส PIN',
        subtitle: 'เชื่อมต่อห้องสอบ',
        icon: 'bi-broadcast',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        action: 'openJoinRoomModal()'
    },
    {
        id: 'whiteboard',
        title: 'ไวท์บอร์ด',
        subtitle: 'กระดานวาดเขียน',
        icon: 'bi-easel2-fill',
        gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        action: "switchMainView('whiteboard')"
    },
    {
        id: 'quiz',
        title: 'Gyver Quiz',
        subtitle: 'ระบบสร้างแบบทดสอบ',
        icon: 'bi-patch-question-fill',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        action: "switchMainView('assessment')"
    },
    {
        id: 'code_race',
        title: 'Code Race',
        subtitle: 'แข่งพิมพ์โค้ดภาษา Python',
        icon: 'bi-code-slash',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        action: "switchMainView('education')"
    },
    {
        id: 'question_bank',
        title: 'คลังข้อสอบ',
        subtitle: 'คลังคำถามและข้อสอบ',
        icon: 'bi-question-square-fill',
        gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        action: "switchMainView('teacher')"
    },
    {
        id: 'classroom',
        title: 'จัดการห้องเรียน',
        subtitle: 'รายชื่อนักเรียน & เช็คชื่อ',
        icon: 'bi-people-fill',
        gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        action: "switchMainView('teacher')"
    },
    {
        id: 'number_guess',
        title: 'Number Guess',
        subtitle: 'เกมทายตัวเลขปริศนา',
        icon: 'bi-123',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        action: "switchMainView('quick')"
    },
    {
        id: 'history',
        title: 'ประวัติกิจกรรม',
        subtitle: 'สถิติและคะแนนย้อนหลัง',
        icon: 'bi-clock-history',
        gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        action: "switchMainView('teacher')"
    }
];

const DEFAULT_SHORTCUT_IDS = ['education', 'forms', 'wheel', 'pin'];
let selectedShortcutIds = [...DEFAULT_SHORTCUT_IDS];

function loadCustomShortcuts() {
    try {
        const saved = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                selectedShortcutIds = parsed;
            }
        }
    } catch (e) {
        selectedShortcutIds = [...DEFAULT_SHORTCUT_IDS];
    }
    renderQuickShortcuts();
}

function saveCustomShortcuts() {
    try {
        localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(selectedShortcutIds));
    } catch (e) {}
    renderQuickShortcuts();
}

function renderQuickShortcuts() {
    const container = document.getElementById('quick-shortcuts-container');
    if (!container) return;

    const itemsToRender = ALL_SHORTCUT_CATALOG.filter(item => selectedShortcutIds.includes(item.id));

    let colClass = 'col-6 col-md-3';
    if (itemsToRender.length === 1) colClass = 'col-12';
    else if (itemsToRender.length === 2) colClass = 'col-6';
    else if (itemsToRender.length === 3) colClass = 'col-12 col-md-4';
    else if (itemsToRender.length >= 4) colClass = 'col-6 col-md-3';

    container.innerHTML = itemsToRender.map(item => `
        <div class="${colClass}">
            <div class="quick-stat-pill" style="cursor: pointer;" onclick="${item.action}">
                <div class="rounded-3 p-2 text-white shadow-sm" style="background: ${item.gradient}; flex-shrink: 0;">
                    <i class="bi ${item.icon} fs-4"></i>
                </div>
                <div class="text-truncate">
                    <div class="text-muted small text-truncate" style="font-size: 0.78rem;">${item.subtitle}</div>
                    <div class="fw-bold text-dark fs-6 text-truncate">${item.title}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function openCustomizeShortcutsModal() {
    const modalEl = document.getElementById('customizeShortcutsModal');
    if (!modalEl) return;

    const listContainer = document.getElementById('shortcuts-selection-list');
    if (listContainer) {
        listContainer.innerHTML = ALL_SHORTCUT_CATALOG.map(item => {
            const isChecked = selectedShortcutIds.includes(item.id);
            return `
                <div class="col-md-6">
                    <label class="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-white cursor-pointer shadow-sm h-100 position-relative" for="chk_sc_${item.id}" style="transition: all 0.2s ease;">
                        <div class="d-flex align-items-center gap-3">
                            <div class="rounded-3 p-2 text-white d-flex align-items-center justify-content-center flex-shrink-0" style="background: ${item.gradient}; width: 42px; height: 42px;">
                                <i class="bi ${item.icon} fs-5"></i>
                            </div>
                            <div>
                                <div class="fw-bold text-dark small">${item.title}</div>
                                <div class="text-muted text-xs" style="font-size: 0.75rem;">${item.subtitle}</div>
                            </div>
                        </div>
                        <div class="form-check form-switch fs-5 m-0 ms-2">
                            <input class="form-check-input shortcut-toggle-item" type="checkbox" id="chk_sc_${item.id}" value="${item.id}" ${isChecked ? 'checked' : ''}>
                        </div>
                    </label>
                </div>
            `;
        }).join('');
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function saveShortcutsSelection() {
    const checkboxes = document.querySelectorAll('.shortcut-toggle-item');
    const newSelected = [];
    checkboxes.forEach(chk => {
        if (chk.checked) {
            newSelected.push(chk.value);
        }
    });

    if (newSelected.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกอย่างน้อย 1 ทางลัด',
                text: 'คุณต้องเลือกอย่างน้อย 1 ทางลัดด่วนเพื่อแสดงผลบนหน้ากระดาน'
            });
        } else {
            alert('กรุณาเลือกอย่างน้อย 1 ทางลัด');
        }
        return;
    }

    selectedShortcutIds = newSelected;
    saveCustomShortcuts();

    const modalEl = document.getElementById('customizeShortcutsModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'บันทึกทางลัดสำเร็จ!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
    }
}

