// Safely obtain Supabase client reference without redeclaring globals
const hybridSupabaseClient = (typeof window !== 'undefined' && window.supabaseClient)
    ? window.supabaseClient
    : ((typeof supabaseClient !== 'undefined')
        ? supabaseClient
        : (window.supabase && window.APP_CONFIG ? window.supabase.createClient(
            window.APP_CONFIG.SUPABASE_URL,
            window.APP_CONFIG.SUPABASE_KEY,
            { db: { schema: 'api' } }
          ) : null));


const urlParams = new URLSearchParams(window.location.search);
let activeTenantSlug = urlParams.get('tenant') || (typeof getActiveTenantSlug === 'function' ? getActiveTenantSlug() : null) || '';

let STORAGE_KEY = `perimetrr-hybrid-schedule-${activeTenantSlug || 'default'}`;
let HISTORY_STORAGE_KEY = `perimetrr-hybrid-history-${activeTenantSlug || 'default'}`;

// Admin Mode check: active authenticated admin session strictly for this tenant
async function checkHasAdminSession() {
    if (!hybridSupabaseClient) return false;
    try {
        const {data, error} = await hybridSupabaseClient.auth.getUser();
        if (error || !data?.user) return false;
        const result = await hybridSupabaseClient.rpc('get_admin_workspaces');
        if (result.error) return false;
        const memberships = Array.isArray(result.data) ? result.data : [];
        const match = memberships.find(entry => entry.tenants?.slug === activeTenantSlug);
        return Boolean(match);
    } catch (_) { return false; }
}

let IS_ADMIN = false;
let isWorkspaceAuthorized = false;
let tenantHybridOfficeDays = 2;

function openHybridAdminLoginModal() {
    const modal = document.getElementById('hybrid-admin-login-modal');
    const err = document.getElementById('hybrid-admin-error');
    if (modal) {
        modal.style.display = 'flex';
        if (err) err.style.display = 'none';
        const emailInput = document.getElementById('hybrid-admin-email');
        if (emailInput) setTimeout(() => emailInput.focus(), 100);
    }
}

function closeHybridAdminLoginModal() {
    const modal = document.getElementById('hybrid-admin-login-modal');
    if (modal) modal.style.display = 'none';
}

async function handleHybridAdminLogin(event) {
    if (event) event.preventDefault();
    const emailInput = document.getElementById('hybrid-admin-email');
    const pwdInput = document.getElementById('hybrid-admin-password');
    const errEl = document.getElementById('hybrid-admin-error');
    const submitBtn = document.getElementById('hybrid-admin-submit-btn');

    const email = (emailInput ? emailInput.value : '').trim();
    const password = pwdInput ? pwdInput.value : '';

    if (!email || !password) {
        if (errEl) { errEl.textContent = 'Email and password required.'; errEl.style.display = 'block'; }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
    }

    try {
        const res = await callBackend({ mode: 'admin-login', email, password, tenantSlug: activeTenantSlug });
        if (res && res.ok) {
            if (activeTenantSlug && res.tenantSlug && res.tenantSlug.toLowerCase() !== activeTenantSlug.toLowerCase()) {
                if (errEl) {
                    errEl.textContent = 'This admin account does not have access to this workspace.';
                    errEl.style.display = 'block';
                }
                return;
            }

            sessionStorage.setItem('admin_tenant_slug', activeTenantSlug);
            if (res.adminToken) sessionStorage.setItem('admin_token', res.adminToken);
            IS_ADMIN = true;

            closeHybridAdminLoginModal();
            updateAdminModeUI();
            renderTable();
            if (typeof showToast === 'function') showToast('Admin editing unlocked!', 'success');
        } else {
            if (errEl) {
                errEl.textContent = res?.message || 'Invalid administrator credentials.';
                errEl.style.display = 'block';
            }
        }
    } catch(e) {
        if (errEl) {
            errEl.textContent = 'Could not verify admin credentials.';
            errEl.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Unlock Editing';
        }
    }
}

function handleSwitchWorkspace() {
    sessionStorage.removeItem('hybrid_authorized_tenant');
    activeTenantSlug = '';
    try {
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    } catch (e) {}
    const gate = document.getElementById('hybrid-auth-gate');
    const container = document.querySelector('.container');
    if (gate) gate.style.display = 'flex';
    if (container) container.style.display = 'none';
    const input = document.getElementById('hybrid-workspace-code-input');
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
    }
}

function updateAdminModeUI() {
    const adminControls = document.getElementById('admin-controls');
    const adminLoginBtn = document.getElementById('hybrid-admin-login-btn');
    if (IS_ADMIN) {
        if (adminControls) adminControls.style.display = 'flex';
        if (adminLoginBtn) adminLoginBtn.style.display = 'none';
        document.body.classList.add('admin-mode');
    } else {
        if (adminControls) adminControls.style.display = 'none';
        if (adminLoginBtn) adminLoginBtn.style.display = 'inline-flex';
        document.body.classList.remove('admin-mode');
    }
}

let ALL_STAFF = [];
let STAFF = [];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

let currentWeekKey = "";
let currentData = {};
let draggedItem = null;
let currentDeptFilter = "all";

/* ============================================================
   ZERO-TRUST WORKSPACE AUTHENTICATION GATE
   ============================================================ */

async function checkWorkspaceAuth() {
    if (await checkHasAdminSession()) {
        isWorkspaceAuthorized = true;
        IS_ADMIN = true;
        return true;
    }

    // Check previously verified session
    const sessionAuthSlug = sessionStorage.getItem('hybrid_authorized_tenant');
    if (sessionAuthSlug && (!activeTenantSlug || activeTenantSlug === sessionAuthSlug)) {
        activeTenantSlug = sessionAuthSlug;
        isWorkspaceAuthorized = true;
        return true;
    }

    // Check if this device is paired to a workspace
    const pairedSlug = typeof safeStorage !== 'undefined' ? safeStorage.getItem('active_tenant_slug') : localStorage.getItem('active_tenant_slug');
    if (pairedSlug) {
        if (!activeTenantSlug) activeTenantSlug = pairedSlug;
        if (activeTenantSlug === pairedSlug) {
            isWorkspaceAuthorized = true;
            return true;
        }
    }

    // Check code in URL parameter (?code=ABC123)
    const codeParam = urlParams.get('code');
    if (codeParam && typeof callBackend === 'function') {
        try {
            const tenant = await getTenantByWorkspaceCode(codeParam);
            const res = tenant ? { ok: true, slug: tenant.slug } : null;
            if (res && res.ok && res.slug) {
                activeTenantSlug = res.slug;
                sessionStorage.setItem('hybrid_authorized_tenant', res.slug);
                isWorkspaceAuthorized = true;
                return true;
            }
        } catch(e) {}
    }

    return false;
}

async function handleUnlockGate(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('hybrid-workspace-code-input');
    const errEl = document.getElementById('hybrid-gate-error');
    const code = (input ? input.value : '').trim().toUpperCase();

    if (!code || code.length < 4) {
        if (errEl) { errEl.textContent = 'Enter the Workspace Code shared by your administrator (for example, ABCD-1234).'; errEl.style.display = 'block'; }
        return;
    }

    try {
        if (typeof callBackend !== 'function') throw new Error('Backend unavailable');
        const tenant = await getTenantByWorkspaceCode(code);
        const res = tenant ? { ok: true, slug: tenant.slug } : null;
        if (res && res.ok && res.slug) {
            activeTenantSlug = res.slug;
            sessionStorage.setItem('hybrid_authorized_tenant', res.slug);
            STORAGE_KEY = `perimetrr-hybrid-schedule-${activeTenantSlug}`;
            HISTORY_STORAGE_KEY = `perimetrr-hybrid-history-${activeTenantSlug}`;
            isWorkspaceAuthorized = true;
            IS_ADMIN = await checkHasAdminSession();

            document.getElementById('hybrid-auth-gate').style.display = 'none';
            document.querySelector('.container').style.display = 'block';

            await initTenantHybridBranding();
            await loadDynamicStaff();
            await loadHistory(true);
            if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        } else {
            if (errEl) { errEl.textContent = res?.message || 'Invalid Workspace Code. Access denied.'; errEl.style.display = 'block'; }
        }
    } catch (err) {
        if (errEl) { errEl.textContent = 'Verification error. Please try again.'; errEl.style.display = 'block'; }
    }
}

/* ============================================================
   TENANT BRANDING & HEADER SETUP
   ============================================================ */

async function initTenantHybridBranding() {
    if (!activeTenantSlug) return;
    try {
        let tenant = null;
        if (typeof getTenantConfig === 'function') {
            tenant = await getTenantConfig(activeTenantSlug);
        }
        if (tenant && tenant.hybrid_office_days) {
            tenantHybridOfficeDays = Math.max(1, Math.min(4, Number(tenant.hybrid_office_days)));
        }
        const companyName = tenant?.name || (activeTenantSlug.charAt(0).toUpperCase() + activeTenantSlug.slice(1));
        const titleEl = document.getElementById('page-brand-title');
        if (titleEl) titleEl.textContent = `${companyName} Hybrid Schedule`;
        document.title = `${companyName} Hybrid Schedule | Perimetrr`;
    } catch(e) {
        console.warn('Error applying tenant hybrid branding:', e);
    }
}

/* ============================================================
   STAFF DATA LOADING (TENANT-SCOPED & STRICT POLICY SCOPING)
   ============================================================ */

async function loadDynamicStaff() {
    if (!isWorkspaceAuthorized || !activeTenantSlug) return;
    try {
        let tenantStaff = [];
        if (typeof getTenantStaffList === 'function') {
            tenantStaff = await getTenantStaffList(activeTenantSlug);
        }

        ALL_STAFF = [];
        if (tenantStaff && tenantStaff.length) {
            // Strict filtering: Only weekly_hybrid staff appear on the schedule
            // office_only (100% on-site) and field_flexible (remote) are strictly excluded
            ALL_STAFF = tenantStaff
                .filter(s => {
                    const pol = String(s.schedule_policy || 'weekly_hybrid').toLowerCase().trim();
                    return pol === 'weekly_hybrid' || pol === 'hybrid';
                })
                .map(s => ({
                    name: String(s.name || '').trim(),
                    dept: String(s.dept || 'General').trim(),
                    is_team_lead: Boolean(s.is_team_lead)
                }));
        }

        // Sort leads first, then alphabetically by name
        ALL_STAFF.sort((a, b) => {
            if (a.is_team_lead && !b.is_team_lead) return -1;
            if (!a.is_team_lead && b.is_team_lead) return 1;
            return a.name.localeCompare(b.name);
        });

        applyDepartmentFilter();
        populateDepartmentFilterDropdown();
    } catch (e) {
        console.warn('Could not load dynamic staff for hybrid schedule:', e);
    }
}

function populateDepartmentFilterDropdown() {
    const select = document.getElementById('dept-filter-select');
    if (!select) return;

    const depts = Array.from(new Set(ALL_STAFF.map(s => s.dept).filter(Boolean))).sort();
    select.innerHTML = '<option value="all">All Departments</option>';
    depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        select.appendChild(opt);
    });
}

function filterByDepartment(dept) {
    currentDeptFilter = dept;
    applyDepartmentFilter();
    renderTable();
}

function applyDepartmentFilter() {
    if (currentDeptFilter === "all") {
        STAFF = [...ALL_STAFF];
    } else {
        STAFF = ALL_STAFF.filter(s => s.dept === currentDeptFilter);
    }
}

/* ============================================================
   CONFIGURABLE HYBRID QUOTA MODAL
   ============================================================ */

function openHybridSettingsModal() {
    const modal = document.getElementById('hybrid-settings-modal');
    const select = document.getElementById('hybrid-office-days-select');
    if (select) select.value = String(tenantHybridOfficeDays || 2);
    if (modal) modal.style.display = 'flex';
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
}

function closeHybridSettingsModal() {
    const modal = document.getElementById('hybrid-settings-modal');
    if (modal) modal.style.display = 'none';
}

async function saveHybridSettings() {
    const select = document.getElementById('hybrid-office-days-select');
    const val = parseInt(select?.value || '2', 10);
    if (val >= 1 && val <= 4) {
        try {
            if (typeof callBackend === 'function') {
                const response = await callBackend({
                    mode: 'update-config',
                    key: 'HYBRID_OFFICE_DAYS',
                    value: val,
                    tenantSlug: activeTenantSlug
                });
                if (!response?.ok) throw new Error(response?.message || 'The quota could not be saved.');
                tenantHybridOfficeDays = val;
            }
        } catch(e) {
            if (typeof showToast === 'function') showToast(e.message || 'Unable to save the quota. Try again.', 'error');
            return;
        }
        closeHybridSettingsModal();
        generateNew();
        if (typeof showToast === 'function') {
            showToast(`Hybrid quota updated: ${val} Office / ${5 - val} Remote days.`, 'success');
        }
    }
}

/* ============================================================
   HELPERS & DATE MATH
   ============================================================ */

function formatDate(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getWeekRange(offsetWeeks = 0) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;

    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday + (offsetWeeks * 7));

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return `${formatDate(monday)} - ${formatDate(friday)}, ${friday.getFullYear()}`;
}

function getScopedWeekKey(weekKey) {
    if (!weekKey) return '';
    return weekKey.startsWith(`${activeTenantSlug}::`) ? weekKey : `${activeTenantSlug}::${weekKey}`;
}

function getUnscopedWeekKey(weekKey) {
    if (!weekKey) return '';
    const prefix = `${activeTenantSlug}::`;
    return weekKey.startsWith(prefix) ? weekKey.replace(prefix, '') : weekKey;
}

function ensureScheduleData(data) {
    const valid = {};
    const pool = ALL_STAFF.length ? ALL_STAFF : STAFF;
    pool.forEach(p => {
        valid[p.name] = {};
        DAYS.forEach(d => {
            const status = data?.[p.name]?.[d];
            valid[p.name][d] = ['Office', 'Home', 'Leave'].includes(status) ? status : 'Unscheduled';
        });
    });
    return valid;
}

/* ============================================================
   SCHEDULE GENERATION ENGINE (BALANCED & QUOTA-CONFIGURABLE)
   ============================================================ */

function generateNew() {
    if (!currentWeekKey) {
        currentWeekKey = getWeekRange(0);
    }
    const targetWeekKey = currentWeekKey;

    const data = {};
    const officeCount = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
    const leadCount = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };

    const pool = ALL_STAFF.length ? [...ALL_STAFF] : [...STAFF];
    const requiredOfficeDays = Math.max(1, Math.min(4, tenantHybridOfficeDays || 2));

    pool.forEach(person => {
        data[person.name] = { Monday: "Home", Tuesday: "Home", Wednesday: "Home", Thursday: "Home", Friday: "Home" };

        for (let d = 0; d < requiredOfficeDays; d++) {
            const candidateDays = DAYS.filter(day => data[person.name][day] !== "Office");
            candidateDays.sort((a, b) => {
                if (person.is_team_lead) {
                    return (leadCount[a] - leadCount[b]) || (officeCount[a] - officeCount[b]);
                }
                return (officeCount[a] - officeCount[b]) || (leadCount[a] - leadCount[b]);
            });

            const chosenDay = candidateDays[0];
            if (chosenDay) {
                data[person.name][chosenDay] = "Office";
                officeCount[chosenDay]++;
                if (person.is_team_lead) leadCount[chosenDay]++;
            }
        }
    });

    currentData = ensureScheduleData(data);
    renderTable();
    autoSync(targetWeekKey);
}

/* ============================================================
   TABLE RENDERING & DRAG-AND-DROP
   ============================================================ */

function renderTable() {
    const thead = document.getElementById("table-head-days");
    const tbody = document.getElementById("schedule-body");
    const dateRangeEl = document.getElementById("display-date-range");

    if (dateRangeEl) dateRangeEl.innerText = getUnscopedWeekKey(currentWeekKey);

    const parts = getUnscopedWeekKey(currentWeekKey).split(' - ');
    const mondayText = parts[0] || '';
    const fridayText = parts[1] || '';
    const startYearMatch = fridayText.match(/\d{4}$/);
    const startYear = startYearMatch ? parseInt(startYearMatch[0], 10) : new Date().getFullYear();

    const mondayDate = new Date(`${mondayText} ${startYear}`);
    const validDate = !isNaN(mondayDate.getTime());

    thead.innerHTML = `<th>Staff Name</th>`;
    DAYS.forEach((d, idx) => {
        let dateLabel = '';
        if (validDate) {
            const currentDay = new Date(mondayDate);
            currentDay.setDate(mondayDate.getDate() + idx);
            dateLabel = `<br><span style="font-size:0.68rem; font-weight:normal; opacity:0.8;">${formatDate(currentDay)}</span>`;
        }
        thead.innerHTML += `<th>${d}${dateLabel}</th>`;
    });
    thead.innerHTML += `<th class="counter-header" data-html2canvas-ignore>Home Days</th>`;

    tbody.innerHTML = "";
    STAFF.forEach(person => {
        const row = document.createElement("tr");
        let homeCount = 0;
        const star = person.is_team_lead ? ` <span class="staff-lead-star" title="Team Lead">★</span>` : "";

        let rowHtml = `<td style="font-weight:600; text-align:left;">${escapeHtml(person.name)}${star}<br><span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${escapeHtml(person.dept)}</span></td>`;

        DAYS.forEach(day => {
            const status = (currentData[person.name] && currentData[person.name][day]) ? currentData[person.name][day] : "Home";
            if (status === "Home") homeCount++;

            const statusClass = status === "Office" ? "office" : (status === "Leave" ? "leave" : "home");
            const draggableAttr = IS_ADMIN ? 'draggable="true"' : '';
            const cursorStyle = IS_ADMIN ? 'cursor: grab;' : 'cursor: default;';

            rowHtml += `
                <td>
                    <div class="day-slot ${statusClass}" ${draggableAttr}
                         data-person="${escapeHtml(person.name)}" data-day="${day}" data-status="${status}"
                         style="${cursorStyle}">
                         ${status}
                    </div>
                </td>`;
        });

        rowHtml += `<td class="counter-cell" data-html2canvas-ignore><strong>${homeCount}</strong>/5</td>`;
        row.innerHTML = rowHtml;
        tbody.appendChild(row);
    });

    if (IS_ADMIN) {
        attachDragEvents();
    }
}

function attachDragEvents() {
    const slots = document.querySelectorAll(".day-slot");
    slots.forEach(slot => {
        slot.addEventListener("dragstart", (e) => {
            draggedItem = e.target;
            e.target.style.opacity = "0.5";
        });

        slot.addEventListener("dragend", (e) => {
            e.target.style.opacity = "1";
            draggedItem = null;
        });

        slot.addEventListener("dragover", (e) => e.preventDefault());

        slot.addEventListener("drop", (e) => {
            e.preventDefault();
            if (!draggedItem || draggedItem === e.target) return;

            const target = e.target.classList.contains("day-slot") ? e.target : e.target.closest(".day-slot");
            if (!target) return;

            const p1 = draggedItem.dataset.person;
            const d1 = draggedItem.dataset.day;
            const p2 = target.dataset.person;
            const d2 = target.dataset.day;

            const status1 = currentData[p1][d1];
            const status2 = currentData[p2][d2];

            currentData[p1][d1] = status2;
            currentData[p2][d2] = status1;

            renderTable();
            autoSync(currentWeekKey);
        });
    });
}

/* ============================================================
   HISTORY STORAGE & SUPABASE SYNC
   ============================================================ */

function loadHistoryFromStorage() {
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch(e) {
        return [];
    }
}

function saveHistoryToStorage(history) {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch(e) {}
}

async function loadHistory(updateTable = false) {
    if (!isWorkspaceAuthorized || !activeTenantSlug) return;
    const localHistory = loadHistoryFromStorage();
    renderHistoryCards(localHistory);

    let backup = null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) backup = JSON.parse(stored);
    } catch (e) {}

    if (!hybridSupabaseClient) {
        if (updateTable) {
            currentWeekKey = getWeekRange(0);
            const currentWeekEntry = localHistory.find(item => item.weekKey === currentWeekKey);
            if (currentWeekEntry) {
                currentData = ensureScheduleData(currentWeekEntry.data);
            } else if (backup && backup.weekKey === currentWeekKey) {
                currentData = ensureScheduleData(backup.data);
            } else if (IS_ADMIN) {
                generateNew();
                return;
            } else {
                currentData = ensureScheduleData({});
            }
            renderTable();
        }
        return;
    }

    try {
        const response = await callBackend({mode:'get-hybrid-history', tenantSlug:activeTenantSlug});
        if (!response?.ok) throw new Error(response?.message || 'Unable to load schedule history.');
        const remoteHistory = (response.history || []).map(row => ({
            weekKey: formatScheduleRange(row.week_start), data: row.schedule_data, timestamp: row.updated_at
        }));

        // A successful cloud read is authoritative for every browser in this workspace.
        const history = remoteHistory;

        if (updateTable) {
            const currentRange = getWeekRange(0);
            const currentWeekEntry = history.find(item => item.weekKey === currentRange);
            if (currentWeekEntry) {
                currentWeekKey = currentWeekEntry.weekKey;
                currentData = ensureScheduleData(currentWeekEntry.data);
                renderTable();
            } else if (backup && backup.weekKey === currentRange) {
                currentWeekKey = backup.weekKey;
                currentData = ensureScheduleData(backup.data);
                renderTable();
            } else if (IS_ADMIN) {
                generateNew();
            } else {
                const fallback = history[0] || backup;
                if (fallback) {
                    currentWeekKey = fallback.weekKey;
                    currentData = ensureScheduleData(fallback.data);
                    renderTable();
                } else {
                    currentWeekKey = currentRange;
                    currentData = ensureScheduleData({});
                    renderTable();
                }
            }
        }

        saveHistoryToStorage(history);
        renderHistoryCards(history);
    } catch (e) {
        console.warn("Could not fetch remote history, using local cache:", e);
        if (updateTable && !currentWeekKey) {
            currentWeekKey = getWeekRange(0);
            const entry = localHistory.find(item => item.weekKey === currentWeekKey);
            currentData = ensureScheduleData(entry ? entry.data : (backup ? backup.data : {}));
            renderTable();
        }
    }
}

function formatScheduleRange(iso) {
    const start = new Date(iso + 'T12:00:00');
    const end = new Date(start); end.setDate(end.getDate() + 4);
    return `${formatDate(start)} - ${formatDate(end)}, ${end.getFullYear()}`;
}

function renderHistoryCards(history) {
    const container = document.getElementById("history-container");
    if (!container) return;

    if (!history.length) {
        container.innerHTML = `<p class="empty-text">No previous schedules available for this workspace.</p>`;
        return;
    }

    container.innerHTML = "";
    history.forEach(item => {
        const card = document.createElement("div");
        card.className = "history-card";
        if (item.weekKey === currentWeekKey) {
            card.classList.add("active");
        }

        const dateObj = new Date(item.timestamp);
        const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

        card.innerHTML = `
            <div class="history-info">
                <strong>${item.weekKey}</strong>
                <div style="font-size:0.7rem; color:var(--text-muted);">${dateStr}</div>
            </div>
            <button class="btn-load" onclick="selectWeek('${item.weekKey}')">View</button>
        `;
        container.appendChild(card);
    });
}

function selectWeek(weekKey) {
    const history = loadHistoryFromStorage();
    const entry = history.find(h => h.weekKey === weekKey);
    if (!entry) return;

    currentWeekKey = entry.weekKey;
    currentData = ensureScheduleData(entry.data);
    renderTable();

    document.querySelectorAll(".history-card").forEach(c => {
        c.classList.remove("active");
        if (c.querySelector("strong")?.innerText === weekKey) {
            c.classList.add("active");
        }
    });
}

async function autoSync(targetWeekKey) {
    if (!isWorkspaceAuthorized || !activeTenantSlug || !IS_ADMIN) return;
    const statusEl = document.getElementById("sync-status");
    if (statusEl) statusEl.innerHTML = `<span class="spin">⏳</span> Saving...`;

    const entry = {
        weekKey: getUnscopedWeekKey(targetWeekKey),
        data: currentData,
        timestamp: new Date().toISOString()
    };

    const history = loadHistoryFromStorage();
    const idx = history.findIndex(h => h.weekKey === entry.weekKey);
    if (idx >= 0) history[idx] = entry;
    else history.unshift(entry);

    saveHistoryToStorage(history);
    renderHistoryCards(history);

    try {
        const res = await callBackend({ mode: 'save-hybrid-schedule', tenantSlug: activeTenantSlug, weekStart: entry.weekKey, scheduleData: currentData });
        if (!res?.ok) throw new Error(res?.message || 'Unable to save the schedule.');
        if (statusEl) statusEl.textContent = '✓ Synced';
    } catch (_) {
        if (statusEl) statusEl.textContent = 'Saved on this device only — cloud sync failed. Retry when connected.';
        if (typeof showToast === 'function') showToast('Cloud sync failed. Your local schedule is saved; try saving again when connected.', 'error');
        return;
    }
    setTimeout(() => { if (statusEl) statusEl.innerHTML = ""; }, 2500);
}

/* ============================================================
   EXPORT & SHARING
   ============================================================ */

function downloadImage() {
    const zone = document.getElementById("capture-zone");
    if (!zone) return;

    html2canvas(zone, { scale: 2 }).then(canvas => {
        const link = document.createElement("a");
        link.download = `hybrid-schedule-${getUnscopedWeekKey(currentWeekKey).replace(/\s+/g, '_')}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.9);
        link.click();
    });
}

function shareWhatsApp() {
    currentData = ensureScheduleData(currentData);
    const cleanWeek = getUnscopedWeekKey(currentWeekKey);
    let summaryText = `*Hybrid Work Schedule (${cleanWeek})*\n\n`;
    const list = STAFF.length ? STAFF : ALL_STAFF;
    list.forEach(s => {
        const officeDays = DAYS.filter(d => currentData[s.name] && currentData[s.name][d] === 'Office');
        summaryText += `• ${s.name}: ${officeDays.length ? officeDays.join(', ') : 'Remote'}\n`;
    });
    summaryText += `\n_Generated via Perimetrr_`;

    const zone = document.getElementById("capture-zone");
    if (!zone) {
        window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, '_blank');
        return;
    }

    if (navigator.share && navigator.canShare) {
        html2canvas(zone, { scale: 2 }).then(async canvas => {
            const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
            const file = new File([blob], `hybrid-schedule-${cleanWeek}.jpg`, { type: 'image/jpeg' });
            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: `Hybrid Schedule: ${cleanWeek}`,
                        text: summaryText,
                        files: [file]
                    });
                    return;
                } catch(e) {}
            }
            downloadImage();
            window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`, '_blank');
        });
    } else {
        downloadImage();
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`, '_blank');
    }
}

function shareGmail() {
    currentData = ensureScheduleData(currentData);
    const cleanWeek = getUnscopedWeekKey(currentWeekKey);
    const subject = encodeURIComponent(`Hybrid Work Schedule: ${cleanWeek}`);
    let body = `Hello Team,\n\nHere is the hybrid work schedule for ${cleanWeek}:\n\n`;
    const list = STAFF.length ? STAFF : ALL_STAFF;
    list.forEach(s => {
        const officeDays = DAYS.filter(d => currentData[s.name] && currentData[s.name][d] === 'Office');
        body += `${s.name}: ${officeDays.length ? officeDays.join(', ') : 'Remote'}\n`;
    });
    body += `\nPlease check in at your office location when on-site.\n\nThank you.`;

    downloadImage();

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${encodeURIComponent(body)}`;
    const popup = window.open(gmailUrl, '_blank');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
    }
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

window.onload = async () => {
    if (typeof initTheme === 'function') initTheme();
    if (typeof initRefreshButton === 'function') initRefreshButton();

    const isAuthorized = await checkWorkspaceAuth();
    if (!isAuthorized) {
        // Show Zero-Trust Workspace Verification Gate, hide table and staff data completely
        const gate = document.getElementById('hybrid-auth-gate');
        if (gate) gate.style.display = 'flex';
        const container = document.querySelector('.container');
        if (container) container.style.display = 'none';
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        return;
    }

    // Authorized device: Show schedule and load data
    const gate = document.getElementById('hybrid-auth-gate');
    if (gate) gate.style.display = 'none';
    const container = document.querySelector('.container');
    if (container) container.style.display = 'block';

    await initTenantHybridBranding();
    updateAdminModeUI();
    await loadDynamicStaff();
    await loadHistory(true);
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
};
