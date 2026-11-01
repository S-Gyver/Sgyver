/**
 * ====================================================
 * ☁️ Gyver Teacher Cloud Drive - คลังสื่อการสอนส่วนตัว
 * เก็บไฟล์แยกตามบัญชีผู้ใช้ (Per-User) บน Cloudinary + Supabase
 * เปิดดู PowerPoint, Word, Excel, Canva, PDF, รูปภาพ บนเว็บได้ทันที
 * ====================================================
 */

const CLOUDINARY = {
    cloudName: 'xn7rvu6g',
    uploadPreset: 'gyver_live'
};

let currentUserId = null;
let currentUserDisplayName = 'ครูผู้สอน';
let driveState = {
    folders: [
        { id: 'default', name: 'ทั่วไป', created_at: new Date().toISOString() }
    ],
    items: []
};

let activeFolderId = 'all'; // 'all' | 'starred' | folder.id
let activeTypeFilter = 'all'; // 'all' | 'ppt' | 'canva' | 'word' | 'excel' | 'pdf' | 'image'
let currentModalMode = 'file'; // 'file' | 'canva'
let selectedDriveFiles = [];
let currentViewingItem = null;

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

document.addEventListener('DOMContentLoaded', async () => {
    await initTeacherDrive();
    initDropzone();
});

async function initTeacherDrive() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                currentUserId = session.user.id;
                currentUserDisplayName = session.user.user_metadata?.nickname ||
                    session.user.user_metadata?.username ||
                    session.user.email || 'ครูผู้สอน';

                try {
                    const { data: profile } = await supabaseClient
                        .from('profiles')
                        .select('nickname, username, first_name, last_name')
                        .eq('id', currentUserId)
                        .maybeSingle();
                    if (profile) {
                        currentUserDisplayName = profile.nickname || profile.username || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || currentUserDisplayName;
                    }
                } catch (_) {}
            } else if (sessionStorage.getItem('gyver_admin_session') || localStorage.getItem('gyver_admin_session')) {
                currentUserId = 'admin_master';
                currentUserDisplayName = 'ผู้ดูแลระบบ (Admin)';
            } else {
                // หากยังไม่ได้ล็อกอิน ให้ส่งไปหน้าล็อกอินแล้วกลับมาหน้านี้
                window.location.href = `../../../auth/login/login.html?redirect=${encodeURIComponent(window.location.href)}`;
                return;
            }
        }
    } catch (e) {
        console.warn('Auth check warning:', e);
    }

    if (!currentUserId) {
        currentUserId = 'guest_local';
    }

    const badgeEl = document.getElementById('drive-user-badge');
    if (badgeEl) {
        badgeEl.innerHTML = `<i class="bi bi-cloud-check-fill me-1"></i>พื้นที่ส่วนตัวของ: ${escapeHtml(currentUserDisplayName)}`;
    }

    await loadUserDriveData();
    renderAllDriveUI();
}

// ☁️ โหลดข้อมูลคลังสื่อส่วนตัวของ User คนนี้จาก Supabase (game_state) + LocalStorage
async function loadUserDriveData() {
    const localKey = `gyver_teacher_drive_${currentUserId}`;
    try {
        const localRaw = localStorage.getItem(localKey);
        if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (parsed && Array.isArray(parsed.items)) {
                driveState = parsed;
            }
        }
    } catch (_) {}

    if (typeof supabaseClient !== 'undefined' && supabaseClient && currentUserId !== 'guest_local' && currentUserId !== 'admin_master') {
        try {
            const { data, error } = await supabaseClient
                .from('game_state')
                .select('value')
                .eq('user_id', currentUserId)
                .eq('key', 'teacher_media_drive')
                .maybeSingle();

            if (!error && data && data.value) {
                const cloudParsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                if (cloudParsed && Array.isArray(cloudParsed.items)) {
                    driveState = cloudParsed;
                    try {
                        localStorage.setItem(localKey, JSON.stringify(driveState));
                    } catch (_) {}
                }
            }
        } catch (err) {
            console.warn('Cloud drive fetch warning:', err);
        }
    }

    if (!Array.isArray(driveState.folders) || driveState.folders.length === 0) {
        driveState.folders = [{ id: 'default', name: 'ทั่วไป', created_at: new Date().toISOString() }];
    }
    if (!Array.isArray(driveState.items)) {
        driveState.items = [];
    }
}

// 💾 บันทึกข้อมูลคลังสื่อส่วนตัวของ User คนนี้ลง LocalStorage และ Supabase (game_state)
async function saveUserDriveData() {
    const localKey = `gyver_teacher_drive_${currentUserId}`;
    try {
        localStorage.setItem(localKey, JSON.stringify(driveState));
    } catch (_) {}

    if (typeof supabaseClient !== 'undefined' && supabaseClient && currentUserId !== 'guest_local' && currentUserId !== 'admin_master') {
        try {
            await supabaseClient
                .from('game_state')
                .upsert([{
                    key: 'teacher_media_drive',
                    user_id: currentUserId,
                    value: JSON.stringify(driveState),
                    updated_at: new Date().toISOString()
                }], { onConflict: 'key,user_id' });
        } catch (err) {
            console.warn('Cloud drive save warning:', err);
        }
    }
}

function renderAllDriveUI() {
    updateDriveStats();
    renderDriveFolders();
    renderDriveFiles();
}

function updateDriveStats() {
    const items = driveState.items || [];
    const total = items.length;
    const pptCanva = items.filter(i => i.fileType === 'ppt' || i.fileType === 'canva').length;
    const docXlsPdf = items.filter(i => i.fileType === 'word' || i.fileType === 'excel' || i.fileType === 'pdf').length;
    const imgMedia = items.filter(i => i.fileType === 'image' || i.fileType === 'video').length;

    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };
    setTxt('stat-total-files', total);
    setTxt('stat-ppt-canva', pptCanva);
    setTxt('stat-doc-xls-pdf', docXlsPdf);
    setTxt('stat-images-media', imgMedia);
}

// 📁 จัดการโฟลเดอร์ส่วนตัวของครู
function renderDriveFolders() {
    const listEl = document.getElementById('drive-folders-list');
    const selectEl = document.getElementById('drive-item-folder');
    if (!listEl) return;

    const folders = driveState.folders || [];
    const items = driveState.items || [];
    const starredCount = items.filter(i => i.starred).length;

    let pillsHtml = `
        <span class="drive-folder-pill rounded-pill px-3 py-1.5 small fw-bold d-inline-flex align-items-center gap-1.5 ${activeFolderId === 'all' ? 'active' : ''}"
              onclick="selectDriveFolder('all')">
            <i class="bi bi-grid-fill"></i>
            <span>ทั้งหมด (${items.length})</span>
        </span>
        <span class="drive-folder-pill rounded-pill px-3 py-1.5 small fw-bold d-inline-flex align-items-center gap-1.5 ${activeFolderId === 'starred' ? 'active' : ''}"
              onclick="selectDriveFolder('starred')">
            <i class="bi bi-star-fill text-warning"></i>
            <span>ติดดาว (${starredCount})</span>
        </span>
    `;

    folders.forEach(f => {
        const count = items.filter(i => (i.folderId || 'default') === f.id).length;
        const isActive = activeFolderId === f.id;
        pillsHtml += `
            <span class="drive-folder-pill rounded-pill px-3 py-1.5 small fw-bold d-inline-flex align-items-center gap-1.5 ${isActive ? 'active' : ''}"
                  onclick="selectDriveFolder('${escapeHtml(f.id)}')">
                <i class="bi bi-folder-fill ${isActive ? 'text-white' : 'text-warning'}"></i>
                <span>${escapeHtml(f.name)} (${count})</span>
                ${f.id !== 'default' ? `
                    <i class="bi bi-x-circle ms-1 opacity-75" title="ลบโฟลเดอร์นี้"
                       onclick="event.stopPropagation(); deleteDriveFolder('${escapeHtml(f.id)}')"></i>
                ` : ''}
            </span>
        `;
    });

    listEl.innerHTML = pillsHtml;

    if (selectEl) {
        selectEl.innerHTML = folders.map(f =>
            `<option value="${escapeHtml(f.id)}" ${activeFolderId === f.id ? 'selected' : ''}>📁 ${escapeHtml(f.name)}</option>`
        ).join('');
    }
}

function selectDriveFolder(folderId) {
    activeFolderId = folderId;
    renderDriveFolders();
    renderDriveFiles();
}

async function promptCreateFolder() {
    if (typeof Swal === 'undefined') return;
    const { value: folderName } = await Swal.fire({
        title: 'สร้างโฟลเดอร์เก็บสื่อใหม่',
        input: 'text',
        inputPlaceholder: 'เช่น สไลด์วิชา Python, ข้อสอบกลางภาค, ใบงาน ม.1',
        showCancelButton: true,
        confirmButtonText: 'สร้างโฟลเดอร์',
        cancelButtonText: 'ยกเลิก'
    });

    const clean = (folderName || '').trim();
    if (!clean) return;

    const newFolder = {
        id: 'fld_' + Date.now(),
        name: clean,
        created_at: new Date().toISOString()
    };

    driveState.folders.push(newFolder);
    activeFolderId = newFolder.id;
    await saveUserDriveData();
    renderAllDriveUI();
    showToast('success', 'สร้างโฟลเดอร์แล้ว', `สร้างโฟลเดอร์ "${clean}" เรียบร้อย`);
}

async function deleteDriveFolder(folderId) {
    if (folderId === 'default') return;
    const folder = driveState.folders.find(f => f.id === folderId);
    if (!folder) return;

    if (!confirm(`ต้องการลบโฟลเดอร์ "${folder.name}" ใช่หรือไม่?\n(ไฟล์ข้างในจะถูกย้ายไปที่โฟลเดอร์ "ทั่วไป" ไม่ถูกลบหาย)`)) return;

    driveState.items.forEach(item => {
        if (item.folderId === folderId) item.folderId = 'default';
    });
    driveState.folders = driveState.folders.filter(f => f.id !== folderId);
    if (activeFolderId === folderId) activeFolderId = 'all';

    await saveUserDriveData();
    renderAllDriveUI();
    showToast('info', 'ลบโฟลเดอร์แล้ว', 'ย้ายไฟล์ข้างในไปที่โฟลเดอร์ทั่วไปเรียบร้อย');
}

function setDriveTypeFilter(type) {
    activeTypeFilter = type;
    document.querySelectorAll('#drive-type-tabs .drive-type-tab').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-type') === type);
    });
    renderDriveFiles();
}

// 🔍 ตรวจจับประเภทไฟล์จากชื่อไฟล์หรือ URL
function detectDriveFileType(url = '', fileName = '') {
    const u = (url || '').toLowerCase();
    const n = (fileName || '').toLowerCase();

    if (u.includes('canva.com/design/')) return 'canva';
    if (u.includes('docs.google.com/presentation') || /\.(pptx|ppt|ppsx)(\?|$)/i.test(u) || /\.(pptx|ppt|ppsx)$/i.test(n)) return 'ppt';
    if (u.includes('docs.google.com/document') || /\.(docx|doc)(\?|$)/i.test(u) || /\.(docx|doc)$/i.test(n)) return 'word';
    if (u.includes('docs.google.com/spreadsheets') || /\.(xlsx|xls|csv)(\?|$)/i.test(u) || /\.(xlsx|xls|csv)$/i.test(n)) return 'excel';
    if (/\.pdf(\?|$)/i.test(u) || /\.pdf$/i.test(n)) return 'pdf';
    if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?|$)/i.test(u) || /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(n)) return 'image';
    if (u.includes('youtube.com/') || u.includes('youtu.be/') || /\.(mp4|mov|webm)(\?|$)/i.test(u) || /\.(mp4|mov|webm)$/i.test(n)) return 'video';
    return 'other';
}

function getFileTypeMeta(fileType) {
    const map = {
        ppt:   { label: 'PowerPoint', icon: 'bi-file-earmark-slides-fill', boxClass: 'icon-ppt', badgeClass: 'bg-warning-subtle text-warning-emphasis border-warning-subtle' },
        canva: { label: 'Canva Slide', icon: 'bi-palette-fill', boxClass: 'icon-canva', badgeClass: 'bg-info-subtle text-info-emphasis border-info-subtle' },
        word:  { label: 'Word Doc', icon: 'bi-file-earmark-word-fill', boxClass: 'icon-word', badgeClass: 'bg-primary-subtle text-primary border-primary-subtle' },
        excel: { label: 'Excel Sheet', icon: 'bi-file-earmark-excel-fill', boxClass: 'icon-excel', badgeClass: 'bg-success-subtle text-success border-success-subtle' },
        pdf:   { label: 'PDF', icon: 'bi-file-earmark-pdf-fill', boxClass: 'icon-pdf', badgeClass: 'bg-danger-subtle text-danger border-danger-subtle' },
        image: { label: 'รูปภาพ', icon: 'bi-image-fill', boxClass: 'icon-image', badgeClass: 'bg-secondary-subtle text-secondary border-secondary-subtle' },
        video: { label: 'วิดีโอ', icon: 'bi-play-btn-fill', boxClass: 'icon-video', badgeClass: 'bg-danger-subtle text-danger border-danger-subtle' },
        other: { label: 'ไฟล์/ลิงก์', icon: 'bi-file-earmark-text-fill', boxClass: 'icon-other', badgeClass: 'bg-light text-secondary border' }
    };
    return map[fileType] || map.other;
}

// 🗂️ แสดงการ์ดไฟล์ในคลังสื่อ
function renderDriveFiles() {
    const grid = document.getElementById('drive-files-grid');
    if (!grid) return;

    const q = (document.getElementById('drive-search-input')?.value || '').trim().toLowerCase();
    const foldersMap = {};
    (driveState.folders || []).forEach(f => { foldersMap[f.id] = f.name; });

    const filtered = (driveState.items || []).filter(item => {
        if (activeFolderId === 'starred' && !item.starred) return false;
        if (activeFolderId !== 'all' && activeFolderId !== 'starred' && (item.folderId || 'default') !== activeFolderId) return false;
        if (activeTypeFilter !== 'all' && item.fileType !== activeTypeFilter) return false;
        if (q) {
            const hay = `${item.title || ''} ${item.fileName || ''} ${item.description || ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 bg-light rounded-4 border border-dashed">
                <i class="bi bi-cloud-arrow-up-fill display-4 text-primary opacity-50 d-block mb-2"></i>
                <h5 class="fw-bold text-dark mb-1">ยังไม่มีไฟล์หรือสไลด์ในหมวดหมู่นี้</h5>
                <p class="text-muted small mb-3">อัปโหลดไฟล์ Word, Excel, PowerPoint, รูปภาพ ขึ้น Cloudinary หรือวางลิงก์ Canva เพื่อเปิดสอนบนเว็บได้ทันที</p>
                <div class="d-flex justify-content-center gap-2 flex-wrap">
                    <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" onclick="openAddDriveModal('file')">
                        <i class="bi bi-cloud-plus-fill me-1"></i>อัปโหลดไฟล์ขึ้น Cloudinary
                    </button>
                    <button class="btn btn-info text-dark btn-sm rounded-pill px-4 fw-bold shadow-sm" onclick="openAddDriveModal('canva')">
                        <i class="bi bi-easel2-fill me-1"></i>เพิ่มสไลด์ Canva
                    </button>
                </div>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const meta = getFileTypeMeta(item.fileType);
        const folderName = foldersMap[item.folderId || 'default'] || 'ทั่วไป';
        const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '';

        const thumbHtml = item.fileType === 'image' ? `
            <div class="drive-thumb-preview" onclick="openDriveItemViewer('${escapeHtml(item.id)}')">
                <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" loading="lazy">
            </div>
        ` : '';

        return `
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="drive-file-card h-100 d-flex flex-column">
                    ${thumbHtml}
                    <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                        <div class="d-flex align-items-center gap-2.5 text-truncate">
                            <div class="drive-icon-box ${meta.boxClass}" onclick="openDriveItemViewer('${escapeHtml(item.id)}')" style="cursor:pointer;">
                                <i class="bi ${meta.icon}"></i>
                            </div>
                            <div class="text-truncate">
                                <span class="badge ${meta.badgeClass} border rounded-pill px-2 py-0.5" style="font-size: 0.68rem;">
                                    ${meta.label}
                                </span>
                                <div class="text-muted mt-0.5" style="font-size: 0.7rem;">
                                    <i class="bi bi-folder2 me-1"></i>${escapeHtml(folderName)} ${item.fileSize ? `• ${escapeHtml(item.fileSize)}` : ''}
                                </div>
                            </div>
                        </div>

                        <div class="d-flex align-items-center gap-1 flex-shrink-0">
                            <button type="button" class="btn btn-sm btn-link p-1 ${item.starred ? 'text-warning' : 'text-muted'}"
                                    onclick="toggleStarDriveItem('${escapeHtml(item.id)}')" title="ติดดาวรายการโปรด">
                                <i class="bi ${item.starred ? 'bi-star-fill' : 'bi-star'}"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-link text-danger p-1"
                                    onclick="deleteDriveItem('${escapeHtml(item.id)}')" title="ลบไฟล์นี้">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </div>

                    <h6 class="fw-bold text-dark mb-1 text-truncate" title="${escapeHtml(item.title)}"
                        onclick="openDriveItemViewer('${escapeHtml(item.id)}')" style="cursor:pointer;">
                        ${escapeHtml(item.title)}
                    </h6>
                    <p class="text-muted small mb-3 flex-grow-1" style="font-size: 0.8rem;">
                        ${escapeHtml(item.description || item.fileName || 'คลิกปุ่มด้านล่างเพื่อเปิดดูบนเว็บทันที')}
                    </p>

                    <div class="d-flex align-items-center justify-content-between gap-1.5 pt-2 border-top mt-auto flex-wrap">
                        <button type="button" class="btn btn-primary btn-sm rounded-pill px-3 fw-bold flex-grow-1 shadow-xs"
                                onclick="openDriveItemViewer('${escapeHtml(item.id)}')">
                            <i class="bi bi-easel2-fill me-1"></i>เปิดบนเว็บ
                        </button>
                        <button type="button" class="btn btn-outline-success btn-sm rounded-pill px-2.5 fw-bold"
                                onclick="shareDriveItemToClassroom('${escapeHtml(item.id)}')" title="ส่งไฟล์นี้เข้าห้องเรียนของฉัน">
                            <i class="bi bi-send-check-fill"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-2.5"
                                onclick="copyDriveItemUrl('${escapeHtml(item.id)}')" title="คัดลอกลิงก์ไฟล์">
                            <i class="bi bi-link-45deg"></i>
                        </button>
                        <a href="${escapeHtml(item.url)}" target="_blank" download class="btn btn-outline-secondary btn-sm rounded-pill px-2.5" title="ดาวน์โหลด / เปิดแท็บใหม่">
                            <i class="bi bi-download"></i>
                        </a>
                    </div>
                    <div class="text-end text-muted font-mono mt-1" style="font-size: 0.65rem;">${dateStr}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ➕ เปิด Modal อัปโหลดไฟล์ / เพิ่ม Canva
function openAddDriveModal(mode = 'file') {
    document.getElementById('form-add-drive-item')?.reset();
    clearDriveSelectedFiles();
    renderDriveFolders();

    if (mode === 'canva') {
        const r = document.getElementById('mode-drive-canva');
        if (r) r.checked = true;
        switchDriveModalMode('canva');
    } else {
        const r = document.getElementById('mode-drive-file');
        if (r) r.checked = true;
        switchDriveModalMode('file');
    }

    const modalEl = document.getElementById('addDriveItemModal');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

function switchDriveModalMode(mode) {
    currentModalMode = mode;
    const fileSec = document.getElementById('drive-section-file');
    const canvaSec = document.getElementById('drive-section-canva');
    const urlInput = document.getElementById('drive-item-url');

    if (mode === 'canva') {
        fileSec?.classList.add('d-none');
        canvaSec?.classList.remove('d-none');
        if (urlInput) {
            urlInput.required = true;
            setTimeout(() => urlInput.focus(), 120);
        }
    } else {
        fileSec?.classList.remove('d-none');
        canvaSec?.classList.add('d-none');
        if (urlInput) urlInput.required = false;
    }
}

function initDropzone() {
    const dz = document.getElementById('drive-dropzone');
    if (!dz) return;
    ['dragenter', 'dragover'].forEach(ev => {
        dz.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
        dz.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover'); });
    });
    dz.addEventListener('drop', e => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleDriveFilesSelected({ target: { files, value: '' } });
        }
    });
}

function handleDriveFilesSelected(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.size > 100 * 1024 * 1024) {
            showToast('error', 'ไฟล์ใหญ่เกินไป', `"${f.name}" มีขนาดเกิน 100 MB`);
            continue;
        }
        if (!selectedDriveFiles.some(x => x.name === f.name && x.size === f.size)) {
            selectedDriveFiles.push(f);
        }
    }
    event.target.value = '';

    // เติมชื่อไฟล์อัตโนมัติหากเลือกไฟล์เดียวและยังไม่ได้พิมพ์ชื่อ
    const titleInput = document.getElementById('drive-item-title');
    if (selectedDriveFiles.length === 1 && titleInput && !titleInput.value.trim()) {
        const n = selectedDriveFiles[0].name;
        titleInput.value = n.substring(0, n.lastIndexOf('.')) || n;
    }

    renderDriveSelectedFiles();
}

function renderDriveSelectedFiles() {
    const box = document.getElementById('drive-selected-files-box');
    const list = document.getElementById('drive-selected-files-list');
    const countEl = document.getElementById('drive-selected-count');
    if (!box || !list) return;

    if (selectedDriveFiles.length === 0) {
        box.classList.add('d-none');
        list.innerHTML = '';
        return;
    }

    box.classList.remove('d-none');
    if (countEl) countEl.textContent = `ไฟล์ที่เลือก (${selectedDriveFiles.length} ไฟล์)`;

    list.innerHTML = selectedDriveFiles.map((f, idx) => `
        <div class="d-flex align-items-center justify-content-between p-2 rounded-3 border bg-light small">
            <div class="text-truncate me-2">
                <i class="bi bi-file-earmark-check-fill text-success me-1"></i>
                <span class="fw-bold text-dark">${escapeHtml(f.name)}</span>
                <span class="text-muted ms-1">(${formatFileSize(f.size)})</span>
            </div>
            <button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="removeDriveSelectedFile(${idx})">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `).join('');
}

function removeDriveSelectedFile(idx) {
    selectedDriveFiles.splice(idx, 1);
    renderDriveSelectedFiles();
}

function clearDriveSelectedFiles() {
    selectedDriveFiles = [];
    const input = document.getElementById('drive-file-input');
    if (input) input.value = '';
    renderDriveSelectedFiles();
}

function normalizeCanvaOrSlideUrl(raw) {
    let val = (raw || '').trim();
    if (!val) return '';
    const iframeMatch = val.match(/src\s*=\s*["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
        val = iframeMatch[1].trim();
    }
    return val;
}

// ☁️ อัปโหลดไฟล์ขึ้น Cloudinary (แยกตามโฟลเดอร์ของ User) หรือบันทึกลิงก์ Canva
async function handleSaveDriveItem(e) {
    e.preventDefault();

    const folderId = document.getElementById('drive-item-folder')?.value || 'default';
    const customTitle = document.getElementById('drive-item-title')?.value.trim() || '';
    const desc = document.getElementById('drive-item-desc')?.value.trim() || '';
    const btn = document.getElementById('btn-save-drive-item');
    const progressBox = document.getElementById('drive-upload-progress');
    const statusText = document.getElementById('drive-upload-status');

    if (currentModalMode === 'file') {
        if (selectedDriveFiles.length === 0) {
            showToast('warning', 'กรุณาเลือกไฟล์', 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลดอย่างน้อย 1 ไฟล์');
            return;
        }

        if (btn) btn.disabled = true;
        if (progressBox) progressBox.classList.remove('d-none');

        try {
            for (let i = 0; i < selectedDriveFiles.length; i++) {
                const file = selectedDriveFiles[i];
                if (statusText) {
                    statusText.textContent = `กำลังอัปโหลด (${i + 1}/${selectedDriveFiles.length}): "${file.name}" ขึ้น Cloudinary...`;
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', CLOUDINARY.uploadPreset);
                formData.append('folder', `gyver_teacher_drive/${currentUserId}`);

                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson.error?.message || `อัปโหลด "${file.name}" ไม่สำเร็จ`);
                }

                const data = await res.json();
                const cleanFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const itemTitle = (selectedDriveFiles.length === 1 && customTitle) ? customTitle : cleanFileName;
                const fType = detectDriveFileType(data.secure_url, file.name);

                driveState.items.unshift({
                    id: 'drv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    user_id: currentUserId,
                    folderId,
                    title: itemTitle,
                    fileName: file.name,
                    fileSize: formatFileSize(file.size),
                    fileType: fType,
                    url: data.secure_url,
                    cloudinary_public_id: data.public_id || '',
                    description: desc,
                    starred: false,
                    created_at: new Date().toISOString()
                });
            }

            await saveUserDriveData();
            bootstrap.Modal.getInstance(document.getElementById('addDriveItemModal'))?.hide();
            renderAllDriveUI();
            showToast('success', 'อัปโหลดขึ้น Cloudinary สำเร็จ!', `บันทึกไฟล์เข้าคลังสื่อส่วนตัวของคุณเรียบร้อยแล้ว`);
        } catch (err) {
            console.error('Cloudinary upload error:', err);
            showToast('error', 'อัปโหลดไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด');
        } finally {
            if (btn) btn.disabled = false;
            if (progressBox) progressBox.classList.add('d-none');
        }
    } else {
        // Canva / Google Slides / External URL
        const rawUrl = document.getElementById('drive-item-url')?.value || '';
        const cleanUrl = normalizeCanvaOrSlideUrl(rawUrl);
        if (!cleanUrl) {
            showToast('warning', 'กรุณาวางลิงก์', 'กรุณาวางลิงก์ Canva หรือ Google Slides');
            return;
        }

        const fType = detectDriveFileType(cleanUrl, '');
        const itemTitle = customTitle || (fType === 'canva' ? 'สไลด์ Canva' : 'สื่อการสอนออนไลน์');

        driveState.items.unshift({
            id: 'drv_' + Date.now(),
            user_id: currentUserId,
            folderId,
            title: itemTitle,
            fileName: fType === 'canva' ? 'Canva Presentation' : cleanUrl,
            fileSize: '',
            fileType: fType,
            url: cleanUrl,
            description: desc,
            starred: false,
            created_at: new Date().toISOString()
        });

        await saveUserDriveData();
        bootstrap.Modal.getInstance(document.getElementById('addDriveItemModal'))?.hide();
        renderAllDriveUI();
        showToast('success', 'บันทึกสไลด์สำเร็จ!', `เพิ่ม "${itemTitle}" เข้าคลังสื่อส่วนตัวเรียบร้อย`);
    }
}

async function toggleStarDriveItem(itemId) {
    const item = driveState.items.find(i => i.id === itemId);
    if (!item) return;
    item.starred = !item.starred;
    await saveUserDriveData();
    renderAllDriveUI();
}

async function deleteDriveItem(itemId) {
    const item = driveState.items.find(i => i.id === itemId);
    if (!item) return;
    if (!confirm(`ต้องการลบ "${item.title}" ออกจากคลังสื่อส่วนตัวใช่หรือไม่?`)) return;

    driveState.items = driveState.items.filter(i => i.id !== itemId);
    await saveUserDriveData();
    renderAllDriveUI();
    showToast('info', 'ลบรายการแล้ว', `ลบ "${item.title}" เรียบร้อยแล้ว`);
}

function copyDriveItemUrl(itemId) {
    const item = driveState.items.find(i => i.id === itemId);
    if (!item) return;
    navigator.clipboard.writeText(item.url);
    showToast('success', 'คัดลอกลิงก์แล้ว', 'นำลิงก์ไปวางแชร์ให้นักเรียนหรือเปิดในแท็บใหม่ได้เลย');
}

// =============================================================================
// 🖥️ เปิดไฟล์ Word / Excel / PowerPoint / Canva / PDF / รูปภาพ บนเว็บทันที!
// =============================================================================
function openDriveItemViewer(itemId) {
    const item = driveState.items.find(i => i.id === itemId);
    if (!item) return;
    currentViewingItem = item;

    const meta = getFileTypeMeta(item.fileType);
    const titleEl = document.getElementById('drive-viewer-title');
    const badgeEl = document.getElementById('drive-viewer-badge');
    const engineGroup = document.getElementById('drive-viewer-engine-group');
    const dlBtn = document.getElementById('drive-viewer-download-btn');
    const loadingEl = document.getElementById('drive-viewer-loading');
    const imgEl = document.getElementById('drive-viewer-image');
    const iframeEl = document.getElementById('drive-viewer-iframe');

    if (titleEl) titleEl.textContent = item.title || item.fileName || 'สื่อการสอน';
    if (badgeEl) badgeEl.textContent = meta.label;
    if (dlBtn) dlBtn.href = item.url;

    // กรณีเป็นรูปภาพ แสดงด้วย <img> คมชัดทันที
    if (item.fileType === 'image') {
        engineGroup?.classList.add('d-none');
        loadingEl?.classList.add('d-none');
        if (iframeEl) {
            iframeEl.classList.add('d-none');
            iframeEl.src = 'about:blank';
        }
        if (imgEl) {
            imgEl.src = item.url;
            imgEl.classList.remove('d-none');
        }
    } else {
        if (imgEl) {
            imgEl.classList.add('d-none');
            imgEl.src = '';
        }
        if (iframeEl) iframeEl.classList.remove('d-none');
        loadingEl?.classList.remove('d-none');

        const url = item.url;
        const lower = url.toLowerCase();

        if (item.fileType === 'canva' || lower.includes('canva.com/design/')) {
            engineGroup?.classList.add('d-none');
            let embedUrl = url;
            if (!lower.includes('?embed') && !lower.includes('&embed')) {
                embedUrl = url.replace(/\/(edit|watch|view)(\?.*)?$/i, '/view?embed');
                if (!embedUrl.includes('/view?embed')) {
                    embedUrl = url.split('?')[0].replace(/\/+$/, '') + '/view?embed';
                }
            }
            if (iframeEl) iframeEl.src = embedUrl;
        } else if (item.fileType === 'ppt' || item.fileType === 'word' || item.fileType === 'excel') {
            if (lower.includes('docs.google.com/')) {
                engineGroup?.classList.add('d-none');
                const embedUrl = url.replace(/\/(edit|pub|preview).*$/i, '/embed');
                if (iframeEl) iframeEl.src = embedUrl;
            } else {
                engineGroup?.classList.remove('d-none');
                document.getElementById('btn-drv-engine-office')?.classList.add('active');
                document.getElementById('btn-drv-engine-google')?.classList.remove('active');
                if (iframeEl) iframeEl.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
            }
        } else if (item.fileType === 'pdf') {
            engineGroup?.classList.remove('d-none');
            if (iframeEl) iframeEl.src = url;
        } else if (lower.includes('youtube.com/watch') || lower.includes('youtu.be/')) {
            engineGroup?.classList.add('d-none');
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (iframeEl) iframeEl.src = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : url;
        } else {
            engineGroup?.classList.add('d-none');
            if (iframeEl) iframeEl.src = url;
        }
    }

    const modalEl = document.getElementById('driveViewerModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
        modalEl.addEventListener('hidden.bs.modal', () => {
            if (iframeEl) iframeEl.src = 'about:blank';
        }, { once: true });
    }
}

function switchDriveViewerEngine(engine) {
    if (!currentViewingItem) return;
    const iframeEl = document.getElementById('drive-viewer-iframe');
    const loadingEl = document.getElementById('drive-viewer-loading');
    const btnOffice = document.getElementById('btn-drv-engine-office');
    const btnGoogle = document.getElementById('btn-drv-engine-google');

    loadingEl?.classList.remove('d-none');
    if (engine === 'google') {
        btnOffice?.classList.remove('active');
        btnGoogle?.classList.add('active');
        if (iframeEl) iframeEl.src = `https://docs.google.com/gview?url=${encodeURIComponent(currentViewingItem.url)}&embedded=true`;
    } else {
        btnOffice?.classList.add('active');
        btnGoogle?.classList.remove('active');
        if (iframeEl) iframeEl.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(currentViewingItem.url)}`;
    }
}

function toggleDriveViewerFullscreen() {
    const el = document.getElementById('drive-viewer-modal-content');
    if (!el) return;
    if (!document.fullscreenElement) {
        el.requestFullscreen?.().catch(() => {});
    } else {
        document.exitFullscreen?.().catch(() => {});
    }
}

// =============================================================================
// 📤 ส่งไฟล์จากคลังสื่อส่วนตัวเข้า "ห้องเรียนของฉัน" (My Classroom) ในคลิกเดียว
// =============================================================================
async function shareDriveItemToClassroom(itemId) {
    const item = driveState.items.find(i => i.id === itemId);
    if (!item || typeof supabaseClient === 'undefined' || !supabaseClient) return;

    try {
        const { data: rooms } = await supabaseClient
            .from('classrooms')
            .select('id, class_name, room_code, materials')
            .eq('teacher_id', currentUserId)
            .order('created_at', { ascending: false });

        if (!rooms || rooms.length === 0) {
            showToast('info', 'ยังไม่มีห้องเรียน', 'คุณยังไม่ได้สร้างห้องเรียนในเมนู "ห้องเรียนของฉัน"');
            return;
        }

        const optionsHtml = rooms.map(r =>
            `<option value="${escapeHtml(r.id)}">${escapeHtml(r.class_name)} (รหัส: ${escapeHtml(r.room_code)})</option>`
        ).join('');

        const { value: chosenRoomId } = await Swal.fire({
            title: 'ส่งสื่อการสอนเข้าห้องเรียน',
            html: `
                <p class="text-muted small mb-2">ส่ง <b>"${escapeHtml(item.title)}"</b> ไปยังแท็บเอกสาร & ชีทเรียนของห้อง:</p>
                <select id="swal-target-classroom" class="form-select rounded-3">${optionsHtml}</select>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-send-check-fill me-1"></i> ส่งเข้าห้องเรียน',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => document.getElementById('swal-target-classroom')?.value
        });

        if (!chosenRoomId) return;
        const targetRoom = rooms.find(r => r.id === chosenRoomId);
        if (!targetRoom) return;

        const mats = Array.isArray(targetRoom.materials) ? targetRoom.materials : [];
        const catMap = { ppt: 'slide', canva: 'slide', word: 'worksheet', excel: 'worksheet', pdf: 'slide', image: 'other', video: 'link', other: 'other' };

        mats.unshift({
            id: 'mat_' + Date.now(),
            title: item.title,
            category: catMap[item.fileType] || 'slide',
            file_url: item.url,
            file_name: item.fileName || item.title,
            description: item.description || '',
            created_at: new Date().toISOString()
        });

        const { error } = await supabaseClient
            .from('classrooms')
            .update({ materials: mats })
            .eq('id', targetRoom.id);

        if (error) throw error;
        showToast('success', 'ส่งเข้าห้องเรียนแล้ว!', `ส่ง "${item.title}" เข้าห้อง "${targetRoom.class_name}" เรียบร้อยแล้ว`);
    } catch (err) {
        console.error('Share to classroom error:', err);
        showToast('error', 'ส่งไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด');
    }
}

