/**
 * ====================================================
 * ☁️ Gyver Workspace - Cloud Synchronization Engine
 * Syncs Wallpaper, Dock Layout, Open Widgets & Title across devices via Supabase
 * ====================================================
 */

(function () {
    let currentUserId = null;
    let syncDebounceTimers = {};
    let isApplyingCloudState = false;

    function getSupabase() {
        return window.supabaseClient || window._supabase || null;
    }

    function updateSyncUI(status) {
        const icon = document.getElementById('cs-cloud-sync-icon');
        const text = document.getElementById('cs-cloud-sync-text');
        const btn = document.getElementById('cs-cloud-sync-btn');
        if (!icon) return;

        if (status === 'syncing') {
            icon.className = 'bi bi-arrow-repeat spin text-warning';
            if (text) text.textContent = 'กำลังซิงก์...';
            if (btn) btn.title = 'กำลังซิงก์ข้อมูลกับระบบคลาวด์...';
        } else if (status === 'synced') {
            icon.className = 'bi bi-cloud-check-fill text-info';
            if (text) text.textContent = 'ซิงก์แล้ว';
            if (btn) btn.title = 'ข้อมูลหน้าจอและ Wallpaper ซิงก์กับคลาวด์เรียบร้อยแล้ว';
        } else if (status === 'offline') {
            icon.className = 'bi bi-cloud-slash text-white-50';
            if (text) text.textContent = 'ออฟไลน์';
            if (btn) btn.title = 'เข้าสู่ระบบเพื่อซิงก์หน้าจอข้ามเครื่อง';
        } else if (status === 'error') {
            icon.className = 'bi bi-exclamation-triangle-fill text-danger';
            if (text) text.textContent = 'ซิงก์ผิดพลาด';
            if (btn) btn.title = 'ไม่สามารถซิงก์กับคลาวด์ได้ในขณะนี้ คลิกเพื่อลองใหม่';
        }
    }

    /**
     * 🚀 เริ่มต้นการทำงานของ Cloud Sync
     */
    async function init(userId = null) {
        const client = getSupabase();
        if (!client) {
            updateSyncUI('offline');
            return;
        }

        try {
            if (!userId) {
                const { data: { session } } = await client.auth.getSession();
                if (session && session.user) {
                    currentUserId = session.user.id;
                }
            } else {
                currentUserId = userId;
            }

            if (!currentUserId) {
                updateSyncUI('offline');
                return;
            }

            updateSyncUI('syncing');

            // 1. โหลดข้อมูลจาก Supabase game_state
            const { data, error } = await client
                .from('game_state')
                .select('key, value, updated_at')
                .eq('user_id', currentUserId)
                .in('key', [
                    'workspace_wallpaper',
                    'workspace_dock_items',
                    'workspace_open_widgets',
                    'workspace_screen_title'
                ]);

            if (error) {
                console.warn('[CloudSync] Error fetching cloud state:', error);
                updateSyncUI('error');
                return;
            }

            const stateMap = {};
            if (Array.isArray(data)) {
                data.forEach(item => {
                    stateMap[item.key] = item.value;
                });
            }

            const hasAnyCloudData = Object.keys(stateMap).length > 0;

            if (hasAnyCloudData) {
                // 2. ถ้าใน Cloud มีข้อมูลอยู่แล้ว (ผู้ใช้เคยตั้งค่าไว้จากเครื่องอื่น หรือเครื่องนี้มาก่อน)
                // -> นำค่าจาก Cloud มาอัปเดตลงเครื่องนี้ทันที!
                applyCloudStateToLocal(stateMap);
                updateSyncUI('synced');
            } else {
                // 3. ถ้าใน Cloud ยังไม่มีข้อมูล (เพิ่งเข้าใช้งานครั้งแรก)
                // -> นำค่าปัจจุบันของเครื่องนี้ อัปโหลดขึ้น Cloud ไปเป็นค่าเริ่มต้น!
                await uploadAllLocalToCloud();
                updateSyncUI('synced');
            }

            // ฟัง Realtime การเปลี่ยนแปลงหากเปิดแท็บ/เครื่องพร้อมกัน
            setupRealtimeSubscription(client, currentUserId);

        } catch (err) {
            console.warn('[CloudSync] Init error:', err);
            updateSyncUI('error');
        }
    }

    /**
     * 📥 นำค่าจาก Cloud มาปรับใช้กับหน้าจอในเครื่องปัจจุบัน
     */
    function applyCloudStateToLocal(stateMap) {
        isApplyingCloudState = true;
        let changedWallpaper = false;
        let changedDock = false;
        let changedTitle = false;
        let changedWidgets = false;

        try {
            // 🖼️ 1. Wallpaper
            if (stateMap['workspace_wallpaper']) {
                try {
                    const wp = JSON.parse(stateMap['workspace_wallpaper']);
                    if (wp && wp.bg) {
                        const localBg = localStorage.getItem('cs_bg');
                        const localRaw = localStorage.getItem('cs_custom_bg_raw');
                        
                        if (localBg !== wp.bg || localRaw !== wp.raw) {
                            localStorage.setItem('cs_bg', wp.bg);
                            if (wp.size) localStorage.setItem('cs_bg_size', wp.size);
                            if (wp.pos) localStorage.setItem('cs_bg_pos', wp.pos);
                            if (wp.mode) localStorage.setItem('cs_bg_fit_mode', wp.mode);
                            if (wp.name) localStorage.setItem('cs_custom_bg_name', wp.name);
                            else localStorage.removeItem('cs_custom_bg_name');
                            if (wp.raw) localStorage.setItem('cs_custom_bg_raw', wp.raw);
                            else localStorage.removeItem('cs_custom_bg_raw');

                            if (typeof applyBackground === 'function') {
                                applyBackground(wp.bg, wp.size, wp.pos);
                            }
                            if (typeof updateUploadedBgUI === 'function') {
                                updateUploadedBgUI(wp.bg, wp.name, wp.mode);
                            }
                            changedWallpaper = true;
                        }
                    }
                } catch (e) {
                    console.warn('[CloudSync] Error applying wallpaper:', e);
                }
            }

            // ⚓ 2. Dock Items
            if (stateMap['workspace_dock_items']) {
                try {
                    const cloudDock = JSON.parse(stateMap['workspace_dock_items']);
                    if (Array.isArray(cloudDock) && cloudDock.length > 0) {
                        const localDockRaw = localStorage.getItem('gyver_dock_items');
                        if (localDockRaw !== JSON.stringify(cloudDock)) {
                            localStorage.setItem('gyver_dock_items', JSON.stringify(cloudDock));
                            if (typeof loadDockItems === 'function') loadDockItems();
                            if (typeof renderDock === 'function') renderDock();
                            changedDock = true;
                        }
                    }
                } catch (e) {
                    console.warn('[CloudSync] Error applying dock items:', e);
                }
            }

            // 📌 3. Screen Title
            if (stateMap['workspace_screen_title']) {
                try {
                    const cloudTitle = stateMap['workspace_screen_title'];
                    const localTitle = localStorage.getItem('cs_screen_title');
                    if (cloudTitle && cloudTitle !== localTitle) {
                        localStorage.setItem('cs_screen_title', cloudTitle);
                        const titleInput = document.getElementById('screen-title-input');
                        if (titleInput) titleInput.value = cloudTitle;
                        changedTitle = true;
                    }
                } catch (e) {
                    console.warn('[CloudSync] Error applying screen title:', e);
                }
            }

            // 🪟 4. Open Widgets
            if (stateMap['workspace_open_widgets']) {
                try {
                    const cloudWidgets = JSON.parse(stateMap['workspace_open_widgets']);
                    if (Array.isArray(cloudWidgets) && cloudWidgets.length > 0) {
                        const localWidgetsRaw = localStorage.getItem('cs_open_widgets');
                        if (localWidgetsRaw !== JSON.stringify(cloudWidgets)) {
                            localStorage.setItem('cs_open_widgets', JSON.stringify(cloudWidgets));
                            
                            // ปิดวิดเจ็ตเดิมทั้งหมด แล้วเปิดตามที่คลาวด์สั่ง
                            if (typeof activeWidgets !== 'undefined') {
                                Object.keys(activeWidgets).forEach(id => {
                                    if (typeof removeWidget === 'function') removeWidget(id);
                                });
                            }
                            if (typeof restoreOpenWidgets === 'function') {
                                restoreOpenWidgets();
                            }
                            changedWidgets = true;
                        }
                    }
                } catch (e) {
                    console.warn('[CloudSync] Error applying open widgets:', e);
                }
            }

            if (changedWallpaper || changedDock || changedWidgets || changedTitle) {
                if (typeof showDockToast === 'function') {
                    showDockToast('☁️ ซิงก์ข้อมูลหน้าจอ & Wallpaper จากคลาวด์เรียบร้อยแล้ว');
                }
            }
        } finally {
            setTimeout(() => {
                isApplyingCloudState = false;
            }, 500);
        }
    }

    /**
     * 📤 สำรองข้อมูลทั้งหมดของเครื่องนี้ขึ้น Cloud
     */
    async function uploadAllLocalToCloud() {
        if (!currentUserId) return;
        const client = getSupabase();
        if (!client) return;

        const rows = [];
        const now = new Date();

        // Wallpaper
        const wp = {
            bg: localStorage.getItem('cs_bg') || '',
            size: localStorage.getItem('cs_bg_size') || 'cover',
            pos: localStorage.getItem('cs_bg_pos') || 'center center',
            mode: localStorage.getItem('cs_bg_fit_mode') || 'ambient',
            name: localStorage.getItem('cs_custom_bg_name') || '',
            raw: localStorage.getItem('cs_custom_bg_raw') || ''
        };
        if (wp.bg) {
            rows.push({
                key: 'workspace_wallpaper',
                value: JSON.stringify(wp),
                user_id: currentUserId,
                updated_at: now
            });
        }

        // Dock
        const dock = localStorage.getItem('gyver_dock_items');
        if (dock) {
            rows.push({
                key: 'workspace_dock_items',
                value: dock,
                user_id: currentUserId,
                updated_at: now
            });
        }

        // Widgets
        const widgets = localStorage.getItem('cs_open_widgets');
        if (widgets) {
            rows.push({
                key: 'workspace_open_widgets',
                value: widgets,
                user_id: currentUserId,
                updated_at: now
            });
        }

        // Title
        const title = localStorage.getItem('cs_screen_title');
        if (title) {
            rows.push({
                key: 'workspace_screen_title',
                value: title,
                user_id: currentUserId,
                updated_at: now
            });
        }

        if (rows.length > 0) {
            try {
                await client.from('game_state').upsert(rows, { onConflict: 'key,user_id' });
                if (typeof showDockToast === 'function') {
                    showDockToast('☁️ สำรองหน้าจอ & Wallpaper ขึ้นคลาวด์แล้ว');
                }
            } catch (e) {
                console.warn('[CloudSync] Upload all error:', e);
            }
        }
    }

    /**
     * 💾 ฟังก์ชันบันทึกเฉพาะส่วนแบบ Debounce (ประหยัด Request)
     */
    function saveKeyDebounced(key, valueGetter, delay = 800) {
        if (!currentUserId || isApplyingCloudState) return;
        clearTimeout(syncDebounceTimers[key]);
        updateSyncUI('syncing');

        syncDebounceTimers[key] = setTimeout(async () => {
            const client = getSupabase();
            if (!client || !currentUserId || isApplyingCloudState) return;

            try {
                const val = typeof valueGetter === 'function' ? valueGetter() : valueGetter;
                if (val === undefined || val === null) return;

                const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);

                await client.from('game_state').upsert([{
                    key: key,
                    value: stringVal,
                    user_id: currentUserId,
                    updated_at: new Date()
                }], { onConflict: 'key,user_id' });

                updateSyncUI('synced');
            } catch (e) {
                console.warn(`[CloudSync] Error saving ${key}:`, e);
                updateSyncUI('error');
            }
        }, delay);
    }

    function saveWallpaperDebounced() {
        if (isApplyingCloudState) return;
        saveKeyDebounced('workspace_wallpaper', () => ({
            bg: localStorage.getItem('cs_bg') || '',
            size: localStorage.getItem('cs_bg_size') || 'cover',
            pos: localStorage.getItem('cs_bg_pos') || 'center center',
            mode: localStorage.getItem('cs_bg_fit_mode') || 'ambient',
            name: localStorage.getItem('cs_custom_bg_name') || '',
            raw: localStorage.getItem('cs_custom_bg_raw') || ''
        }), 600);
    }

    function saveDockDebounced() {
        if (isApplyingCloudState) return;
        saveKeyDebounced('workspace_dock_items', () => {
            const saved = localStorage.getItem('gyver_dock_items');
            return saved ? JSON.parse(saved) : [];
        }, 500);
    }

    function saveWidgetsDebounced() {
        if (isApplyingCloudState) return;
        saveKeyDebounced('workspace_open_widgets', () => {
            const saved = localStorage.getItem('cs_open_widgets');
            return saved ? JSON.parse(saved) : [];
        }, 800);
    }

    function saveTitleDebounced() {
        if (isApplyingCloudState) return;
        saveKeyDebounced('workspace_screen_title', () => {
            return localStorage.getItem('cs_screen_title') || '';
        }, 500);
    }

    async function manualSync() {
        updateSyncUI('syncing');
        if (typeof showDockToast === 'function') {
            showDockToast('🔄 กำลังเชื่อมต่อและซิงก์ข้อมูลคลาวด์...');
        }
        await init(currentUserId);
    }

    function setupRealtimeSubscription(client, userId) {
        try {
            client.channel(`workspace_sync_${userId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'game_state',
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    if (isApplyingCloudState) return;
                    if (payload.new && payload.new.key && payload.new.key.startsWith('workspace_')) {
                        const map = {};
                        map[payload.new.key] = payload.new.value;
                        applyCloudStateToLocal(map);
                    }
                })
                .subscribe();
        } catch (e) {}
    }

    // Export Global API
    window.GyverWorkspaceCloudSync = {
        init,
        saveWallpaperDebounced,
        saveDockDebounced,
        saveWidgetsDebounced,
        saveTitleDebounced,
        manualSync
    };
})();
