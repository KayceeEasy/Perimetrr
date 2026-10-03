/**
 * Shared utilities for Perimetrr Presence Verification.
 * Loaded by index.html, command-center/index.html, and related portal surfaces.
 */

const STORAGE_KEYS = {
    pendingQueue: 'attendance_pending_queue',
    recentLog: 'attendance_recent_log',
    lastSynced: 'attendance_last_synced',
    lastAction: 'attendance_last_action',
    pendingAction: 'attendance_pending_action',
    theme: 'attendance_theme',
    deviceLock: 'attendance_device_lock',
    analytics: 'attendance_analytics',
    language: 'attendance_language'
};
if (typeof window !== 'undefined') {
    window.STORAGE_KEYS = STORAGE_KEYS;
}

// Supabase Initialization
const supabaseUrl = 'https://opstrnvrraimoqoqpawg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wc3RybnZycmFpbW9xb3FwYXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzQ5NTMsImV4cCI6MjEwNTg1MDk1M30.0h6c6g289vNJ-IQWRzLChLjcMXKR7kXXLCklZWcMVfQ';
const supabaseClient = (typeof window !== 'undefined' && window.supabase) ? window.supabase.createClient(supabaseUrl, supabaseKey, { db: { schema: 'api' } }) : null;
if (typeof window !== 'undefined') {
    window.supabaseUrl = supabaseUrl;
    window.supabaseKey = supabaseKey;
    window.supabaseClient = supabaseClient;
}

/* ---------- Multi-Language Internationalization (i18n) ---------- */

const I18N_DICTIONARY = {
    en: {
        appName: "Staff Attendance",
        verifyingGps: "Verifying GPS...",
        gpsReady: "📍 GPS Ready • Select Name",
        withinPerimeter: "Within office premises",
        awayFromOffice: "Away from office",
        metersFromOffice: "meters from office",
        officeRequired: "📍 On-site (Required)",
        officeMode: "📍 Office",
        homeMode: "🏠 Home",
        flexibleMode: "🏠 Flexible / Remote",
        executiveMode: "🏠 Flexible / Remote",
        signIn: "SIGN IN",
        signOut: "SIGN OUT",
        signOutRemote: "SIGN OUT (REMOTE)",
        remoteActive: "🏠 Remote Sign-Out Active",
        selectYourName: "SELECT YOUR NAME",
        verifying: "VERIFYING...",
        pleaseWait: "PLEASE WAIT...",
        readyToSignIn: "Ready to sign in",
        readyToSignOut: "Ready to sign out",
        typeSearchName: "Type to search your name...",
        switchWorkspace: "Switch",
        connectWorkspaceTitle: "Connect to Your Workspace",
        connectWorkspaceDesc: "Your administrator must first create your workspace and staff profile. Enter their Workspace Code (for example ABCD-1234), open the shared link, or scan their QR code.",
        connectWorkspaceBtn: "Connect Workspace",
        scanQrBtn: "Scan a QR Code",
        cancelScan: "Cancel Scan",
        cameraBlockedNotice: "Camera access blocked: Tap the 🔒 icon in your browser address bar to allow camera, or enter your workspace code below.",
        tryCameraAgain: "Try Camera Again",
        switchAccount: "Change",
        deviceBound: "Linked",
        adminLogin: "Admin Login",
        quickGuide: "Quick Guide",
        toggleTheme: "Toggle Theme",
        refresh: "Refresh",
        onLeave: "🌴 On Leave",
        completed: "COMPLETED",
        adminEmail: "Admin Email",
        password: "Password",
        logIn: "Log in",
        forgotPassword: "Forgot password?",
        backToAttendance: "← Back to attendance",
        signInSuccess: "Sign-in successful!",
        signOutSuccess: "Sign-out successful!",
        connectedTo: "Connected to",
        invalidCode: "Invalid Workspace Code. Please verify with your team administrator."
    },
    es: {
        appName: "Asistencia de Personal",
        verifyingGps: "Verificando GPS...",
        gpsReady: "📍 GPS Listo • Selecciona Nombre",
        withinPerimeter: "Dentro de la oficina",
        awayFromOffice: "Fuera de la oficina",
        metersFromOffice: "metros de la oficina",
        officeRequired: "📍 En Sitio (Obligatorio)",
        officeMode: "📍 Oficina",
        homeMode: "🏠 En Casa",
        flexibleMode: "🏠 Flexible / Remoto",
        executiveMode: "🏠 Flexible / Remoto",
        signIn: "REGISTRAR ENTRADA",
        signOut: "REGISTRAR SALIDA",
        signOutRemote: "SALIDA (REMOTO)",
        remoteActive: "🏠 Salida remota activa",
        selectYourName: "SELECCIONA TU NOMBRE",
        verifying: "VERIFICANDO...",
        pleaseWait: "ESPERE POR FAVOR...",
        readyToSignIn: "Listo para registrar entrada",
        readyToSignOut: "Listo para registrar salida",
        typeSearchName: "Escribe para buscar tu nombre...",
        switchWorkspace: "Cambiar",
        connectWorkspaceTitle: "Conéctate a tu Espacio de Trabajo",
        connectWorkspaceDesc: "Ingresa el código de 6 caracteres de tu empresa o usa el enlace de invitación para vincular este teléfono.",
        connectWorkspaceBtn: "Conectar Espacio",
        scanQrBtn: "Escanear Código QR",
        cancelScan: "Cancelar Escaneo",
        cameraBlockedNotice: "Acceso a la cámara bloqueado: toca el icono 🔒 en la barra del navegador para permitirla, o escribe tu código de 6 caracteres abajo.",
        tryCameraAgain: "Reintentar Cámara",
        switchAccount: "Cambiar",
        deviceBound: "Vinculado",
        adminLogin: "Acceso Admin",
        quickGuide: "Guía Rápida",
        toggleTheme: "Cambiar Tema",
        refresh: "Actualizar",
        onLeave: "🌴 De Permiso",
        completed: "COMPLETADO",
        adminEmail: "Correo del Administrador",
        password: "Contraseña",
        logIn: "Iniciar Sesión",
        forgotPassword: "¿Olvidaste tu contraseña?",
        backToAttendance: "← Volver a asistencia",
        signInSuccess: "¡Entrada registrada con éxito!",
        signOutSuccess: "¡Salida registrada con éxito!",
        connectedTo: "Conectado a",
        invalidCode: "Código de espacio de trabajo inválido. Consulta con tu administrador."
    },
    fr: {
        appName: "Présence du Personnel",
        verifyingGps: "Vérification GPS...",
        gpsReady: "📍 GPS Prêt • Sélectionnez Votre Nom",
        withinPerimeter: "Dans les locaux du bureau",
        awayFromOffice: "Hors du bureau",
        metersFromOffice: "mètres du bureau",
        officeRequired: "📍 Sur Site (Obligatoire)",
        officeMode: "📍 Bureau",
        homeMode: "🏠 Télétravail",
        flexibleMode: "🏠 Flexible / Télétravail",
        executiveMode: "🏠 Flexible / Télétravail",
        signIn: "ENREGISTRER L'ARRIVÉE",
        signOut: "ENREGISTRER LE DÉPART",
        signOutRemote: "DÉPART (À DISTANCE)",
        remoteActive: "🏠 Départ à distance actif",
        selectYourName: "SÉLECTIONNEZ VOTRE NOM",
        verifying: "VÉRIFICATION...",
        pleaseWait: "VEUILLEZ PATIENTER...",
        readyToSignIn: "Prêt pour l'arrivée",
        readyToSignOut: "Prêt pour le départ",
        typeSearchName: "Tapez pour chercher votre nom...",
        switchWorkspace: "Changer",
        connectWorkspaceTitle: "Connectez-vous à votre Espace",
        connectWorkspaceDesc: "Saisissez le code d'entreprise à 6 caractères ou ouvrez le lien d'invitation pour jumeler ce téléphone.",
        connectWorkspaceBtn: "Rejoindre l'Espace",
        scanQrBtn: "Scanner un QR Code",
        cancelScan: "Annuler le Scan",
        cameraBlockedNotice: "Accès caméra bloqué : appuyez sur l'icône 🔒 dans votre barre d'adresse pour l'autoriser, ou saisissez votre code ci-dessous.",
        tryCameraAgain: "Réessayer la Caméra",
        switchAccount: "Changer",
        deviceBound: "Lié",
        adminLogin: "Accès Admin",
        quickGuide: "Guide Rapide",
        toggleTheme: "Changer de Thème",
        refresh: "Actualiser",
        onLeave: "🌴 En Congé",
        completed: "TERMINÉ",
        adminEmail: "E-mail Administrateur",
        password: "Mot de passe",
        logIn: "Se connecter",
        forgotPassword: "Mot de passe oublié ?",
        backToAttendance: "← Retour à la présence",
        signInSuccess: "Arrivée enregistrée avec succès !",
        signOutSuccess: "Départ enregistré avec succès !",
        connectedTo: "Connecté à",
        invalidCode: "Code d'espace invalide. Veuillez vérifier auprès de votre administrateur."
    },
    pt: {
        appName: "Presença de Funcionários",
        verifyingGps: "Verificando GPS...",
        gpsReady: "📍 GPS Pronto • Selecione Seu Nome",
        withinPerimeter: "Dentro do escritório",
        awayFromOffice: "Fora do escritório",
        metersFromOffice: "metros do escritório",
        officeRequired: "📍 No Local (Obrigatório)",
        officeMode: "📍 Escritório",
        homeMode: "🏠 Home Office",
        flexibleMode: "🏠 Flexível / Remoto",
        executiveMode: "🏠 Flexível / Remoto",
        signIn: "REGISTRAR ENTRADA",
        signOut: "REGISTRAR SAÍDA",
        signOutRemote: "SAÍDA (REMOTO)",
        remoteActive: "🏠 Saída remota ativa",
        selectYourName: "SELECIONE SEU NOME",
        verifying: "VERIFICANDO...",
        pleaseWait: "POR FAVOR, AGUARDE...",
        readyToSignIn: "Pronto para registrar entrada",
        readyToSignOut: "Pronto para registrar saída",
        typeSearchName: "Digite para buscar seu nome...",
        switchWorkspace: "Trocar",
        connectWorkspaceTitle: "Conecte-se ao seu Espaço",
        connectWorkspaceDesc: "Insira o código de 6 caracteres da sua empresa ou use o link de convite para emparelhar este celular.",
        connectWorkspaceBtn: "Conectar Espaço",
        scanQrBtn: "Escanear Código QR",
        cancelScan: "Cancelar Leitura",
        cameraBlockedNotice: "Acesso à câmera bloqueado: toque no ícone 🔒 na barra de endereço para permitir, ou digite seu código de 6 dígitos abaixo.",
        tryCameraAgain: "Tentar Câmera Novamente",
        switchAccount: "Trocar",
        deviceBound: "Vinculado",
        adminLogin: "Acesso Admin",
        quickGuide: "Guia Rápido",
        toggleTheme: "Mudar Tema",
        refresh: "Atualizar",
        onLeave: "🌴 De Licença",
        completed: "CONCLUÍDO",
        adminEmail: "E-mail do Administrador",
        password: "Senha",
        logIn: "Entrar",
        forgotPassword: "Esqueceu a senha?",
        backToAttendance: "← Voltar para presença",
        signInSuccess: "Entrada registrada com sucesso!",
        signOutSuccess: "Saída registrada com sucesso!",
        connectedTo: "Conectado a",
        invalidCode: "Código de espaço inválido. Confirme com o administrador da sua equipe."
    },
    ar: {
        appName: "حضور الموظفين",
        verifyingGps: "جاري التحقق من الموقع (GPS)...",
        gpsReady: "📍 تم التحقق من الموقع • حدد اسمك",
        withinPerimeter: "داخل مقر العمل",
        awayFromOffice: "خارج مقر العمل",
        metersFromOffice: "متر من المكتب",
        officeRequired: "📍 في المقر (مطلوب)",
        officeMode: "📍 المكتب",
        homeMode: "🏠 العمل من المنزل",
        flexibleMode: "🏠 نمط مرن / عن بُعد",
        executiveMode: "🏠 نمط مرن / عن بُعد",
        signIn: "تسجيل الدخول",
        signOut: "تسجيل الخروج",
        signOutRemote: "تسجيل خروج (عن بُعد)",
        remoteActive: "🏠 تسجيل الخروج عن بُعد متاح",
        selectYourName: "اختر اسمك",
        verifying: "جاري التحقق...",
        pleaseWait: "يرجى الانتظار...",
        readyToSignIn: "جاهز لتسجيل الحضور",
        readyToSignOut: "جاهز لتسجيل الانصراف",
        typeSearchName: "اكتب للبحث عن اسمك...",
        switchWorkspace: "تبديل",
        connectWorkspaceTitle: "الاتصال بمساحة عملك",
        connectWorkspaceDesc: "أدخل رمز مساحة العمل المكون من 6 خانات أو افتح رابط الدعوة لربط هذا الجهاز.",
        connectWorkspaceBtn: "اتصال بمساحة العمل",
        scanQrBtn: "مسح رمز QR",
        cancelScan: "إلغاء المسح",
        cameraBlockedNotice: "تم حظر الوصول إلى الكاميرا: انقر على أيقونة 🔒 في شريط المتصفح للسماح بالكاميرا، أو أدخل الرمز أدناه.",
        tryCameraAgain: "إعادة محاولة الكاميرا",
        switchAccount: "تغيير",
        deviceBound: "مرتبط",
        adminLogin: "دخول المسؤول",
        quickGuide: "دليل سريع",
        toggleTheme: "تبديل السمة",
        refresh: "تحديث",
        onLeave: "🌴 في إجازة",
        completed: "مكتمل",
        adminEmail: "بريد المسؤول",
        password: "كلمة المرور",
        logIn: "تسجيل الدخول",
        forgotPassword: "نسيت كلمة المرور؟",
        backToAttendance: "← العودة إلى الحضور",
        signInSuccess: "تم تسجيل الحضور بنجاح!",
        signOutSuccess: "تم تسجيل الانصراف بنجاح!",
        connectedTo: "متصل بـ",
        invalidCode: "رمز مساحة العمل غير صالح. يرجى مراجعة مسؤول فريقك."
    }
};

const LANG_CONFIG = {
    en: { flag: "🇬🇧", label: "English", code: "EN" },
    es: { flag: "🇪🇸", label: "Español", code: "ES" },
    fr: { flag: "🇫🇷", label: "Français", code: "FR" },
    pt: { flag: "🇵🇹", label: "Português", code: "PT" },
    ar: { flag: "🇸🇦", label: "العربية", code: "AR" }
};

function getAppLanguage() {
    try {
        if (typeof safeStorage !== 'undefined') {
            return safeStorage.getItem('app_language') || 'en';
        }
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('app_language') || 'en';
        }
    } catch (e) {}
    return 'en';
}

function setAppLanguage(lang) {
    const supported = ['en', 'es', 'fr', 'pt', 'ar'];
    const validLang = supported.includes(lang) ? lang : 'en';
    try {
        if (typeof safeStorage !== 'undefined') {
            safeStorage.setItem('app_language', validLang);
        } else if (typeof localStorage !== 'undefined') {
            localStorage.setItem('app_language', validLang);
        }
    } catch (e) {}

    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = validLang;
        document.documentElement.dir = (validLang === 'ar') ? 'rtl' : 'ltr';
    }

    applyLanguageTranslations(validLang);

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: validLang } }));
    }
}

function t(key, defaultFallback = '') {
    const lang = getAppLanguage();
    if (I18N_DICTIONARY[lang] && I18N_DICTIONARY[lang][key]) {
        return I18N_DICTIONARY[lang][key];
    }
    if (I18N_DICTIONARY.en && I18N_DICTIONARY.en[key]) {
        return I18N_DICTIONARY.en[key];
    }
    return defaultFallback;
}

function applyLanguageTranslations(lang) {
    if (typeof document === 'undefined') return;

    // 1. Text content with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            const val = t(key);
            if (val) el.textContent = val;
        }
    });

    // 2. Placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            const val = t(key);
            if (val) el.placeholder = val;
        }
    });

    // 3. Update topbar language indicator
    const meta = LANG_CONFIG[lang] || LANG_CONFIG.en;
    document.querySelectorAll('.current-lang-flag, #current-lang-flag').forEach(el => {
        el.textContent = meta.flag;
    });
    document.querySelectorAll('.current-lang-code, #current-lang-code').forEach(el => {
        el.textContent = meta.code;
    });

    // 4. Update dropdown menu active states
    document.querySelectorAll('.lang-option-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        if (btnLang === lang) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function initLanguageSelector() {
    if (typeof document === 'undefined') return;

    document.querySelectorAll('.lang-selector-wrap').forEach(wrap => {
        const langBtn = wrap.querySelector('.lang-btn') || wrap.querySelector('#lang-select-btn');
        const menu = wrap.querySelector('.lang-dropdown-menu') || wrap.querySelector('#lang-dropdown-menu');
        if (langBtn && menu && !langBtn.dataset.bound) {
            langBtn.dataset.bound = 'true';
            langBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close any other open dropdown menus first
                document.querySelectorAll('.lang-dropdown-menu').forEach(m => {
                    if (m !== menu) m.style.display = 'none';
                });
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });

            menu.querySelectorAll('.lang-option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const lang = btn.getAttribute('data-lang');
                    if (lang) setAppLanguage(lang);
                    menu.style.display = 'none';
                });
            });
        }
    });

    if (!document.__langClickBound) {
        document.__langClickBound = true;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.lang-selector-wrap')) {
                document.querySelectorAll('.lang-dropdown-menu').forEach(m => {
                    m.style.display = 'none';
                });
            }
        });
    }

    // Apply currently saved language immediately
    const curLang = getAppLanguage();
    if (document.documentElement) {
        document.documentElement.lang = curLang;
        document.documentElement.dir = (curLang === 'ar') ? 'rtl' : 'ltr';
    }
    applyLanguageTranslations(curLang);
}

// Automatically initialize language on DOMContentLoaded
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguageSelector);
    } else {
        initLanguageSelector();
    }
}


/* ---------- HTML Escaping & Date Utilities ---------- */

function formatWeekKeyFromDmy(dmyStr) {
    if (!dmyStr) return dmyStr;
    if (dmyStr.includes('-') || dmyStr.includes(',')) return dmyStr;
    const parts = dmyStr.split('/');
    if (parts.length !== 3) return dmyStr;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const monday = new Date(year, month, day);
    const friday = new Date(year, month, day + 4);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monMonth = monthNames[monday.getMonth()];
    const friMonth = monthNames[friday.getMonth()];
    // Always include both month names to match GAS-saved keys: "July 27 - July 31, 2026"
    return `${monMonth} ${monday.getDate()} - ${friMonth} ${friday.getDate()}, ${year}`;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ---------- Analytics/Monitoring ---------- */

function logAnalyticsEvent(type, details = {}) {
    const analytics = readStoredJson(STORAGE_KEYS.analytics, []);
    const event = {
        type,
        details,
        timestamp: new Date().toISOString()
    };
    analytics.unshift(event);
    writeStoredJson(STORAGE_KEYS.analytics, analytics.slice(0, 100));

    if (navigator.onLine) {
        const deviceId = typeof window._deviceId !== 'undefined' ? window._deviceId : '';
        const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
        callBackend({ mode: 'log-analytics', eventType: type, details: detailStr, deviceId }).catch(() => {});
    }
}

function getAnalytics() {
    return readStoredJson(STORAGE_KEYS.analytics, []);
}

function clearAnalytics() {
    writeStoredJson(STORAGE_KEYS.analytics, []);
}


/* ---------- Safe Storage Wrapper ---------- */
window.safeStorage = {
    getItem: (key) => { try { return localStorage.getItem(key); } catch(e) { return null; } },
    setItem: (key, val) => { try { localStorage.setItem(key, val); } catch(e) {} },
    removeItem: (key) => { try { localStorage.removeItem(key); } catch(e) {} }
};

window.safeSession = {
    getItem: (key) => { try { return sessionStorage.getItem(key); } catch(e) { return null; } },
    setItem: (key, val) => { try { sessionStorage.setItem(key, val); } catch(e) {} },
    removeItem: (key) => { try { sessionStorage.removeItem(key); } catch(e) {} }
};

/* ---------- Storage helpers ---------- */

function readStoredJson(key, fallback = []) {
    try {
        const value = safeStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.warn(`Failed to parse stored value for "${key}":`, error);
        return fallback;
    }
}

function writeStoredJson(key, value) {
    try {
        safeStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to persist value for "${key}":`, error);
    }
}

/* ---------- Request deduplication ---------- */

const pendingRequests = new Map();

async function callBackendDeduplicated(payload, timeoutMs = 20000) {
    const requestKey = JSON.stringify(payload);

    if (pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey);
    }

    const promise = callBackend(payload, timeoutMs)
        .finally(() => {
            pendingRequests.delete(requestKey);
        });

    pendingRequests.set(requestKey, promise);
    return promise;
}

/* ---------- Backend communication ----------
   Routes requests to Supabase (PostgreSQL + Edge RPCs). */

/* ---------- Multi-Tenant Registry & Data Scoping (Commercial v3.0) ---------- */

function generateWorkspaceCode(slugOrName) {
    let raw = String(slugOrName || 'WKPX').replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (raw.length < 4) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        while (raw.length < 4) {
            raw += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    const prefix = raw.substring(0, 4);
    const randNum = Math.floor(1000 + Math.random() * 9000); // 4 digits: 1000..9999
    return `${prefix}-${randNum}`;
}

async function getTenantRegistry() {
 if (!supabaseClient?.auth?.getSession) return [];
 const {data:sessionData}=await supabaseClient.auth.getSession();
 if (!sessionData?.session) return [];
 const {data,error}=await supabaseClient.rpc('get_admin_workspaces');
 if(error)throw error;
 return (data||[]).map(entry=>({...entry.tenants,status:entry.tenants.subscription_status}));
}

async function getTenantByWorkspaceCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();

    try {
        const { data, error } = await supabaseClient.rpc('get_workspace_for_pairing', { p_workspace_code: clean });
        const row = Array.isArray(data) ? data[0] : null;
        if (error || !row) return null;
        const tenant = { id: row.tenant_id, slug: row.slug, name: row.tenant_name, short_name: row.short_name || row.tenant_name, workspace_code: row.workspace_code, brand_color: row.brand_color, logo_url: row.logo_url };
        safeStorage.setItem('active_tenant', JSON.stringify(tenant));
        safeStorage.setItem('active_tenant_slug', tenant.slug || tenant.workspace_code);
        return tenant;
    } catch (e) { return null; }
}

function getActiveTenantDirect() {
    try {
        const stored = safeStorage.getItem('active_tenant');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') return parsed;
        }
    } catch (e) {}
    return null;
}

function saveActiveTenant(tenant) {
    if (!tenant) return;
    try {
        safeStorage.setItem('active_tenant', JSON.stringify(tenant));
        safeStorage.setItem('active_tenant_slug', tenant.slug || tenant.workspace_code || tenant.id);
    } catch (e) {
        console.warn('saveActiveTenant error:', e);
    }
}

function getActiveTenantSlug() {
    try {
        const direct = getActiveTenantDirect();
        if (direct && direct.slug) return direct.slug;
        const storedSlug = safeStorage.getItem('active_tenant_slug');
        if (storedSlug) return storedSlug;
        if (typeof activeTenantSlug !== 'undefined' && activeTenantSlug) return activeTenantSlug;
    } catch (e) {}
    return 'default';
}

if (typeof window !== 'undefined') {
    window.getActiveTenantDirect = getActiveTenantDirect;
    window.getActiveTenantSlug = getActiveTenantSlug;
    window.saveActiveTenant = saveActiveTenant;
}

async function getActiveTenant(optionalSlug = null) {
 try {
  const params=new URLSearchParams(window.location.search);
  const joinCode=params.get('join')||params.get('code');
  if(joinCode) {
   const tenant=await getTenantByWorkspaceCode(joinCode);
   if(tenant && window.history?.replaceState)window.history.replaceState({},document.title,window.location.pathname);
   return tenant;
  }
  const stored=getActiveTenantDirect();
  const pathParts=window.location.pathname.split('/').filter(Boolean);
  const tenantIndex=pathParts.indexOf('tenant');
  const slug=optionalSlug||params.get('tenant')||params.get('company')||(tenantIndex>=0?pathParts[tenantIndex+1]:null)||safeSession.getItem('admin_tenant_slug')||safeStorage.getItem('active_tenant_slug');
  if(stored && (!slug || [stored.slug,stored.workspace_code,stored.id].some(value=>String(value||'').toLowerCase()===String(slug).toLowerCase())))return stored;
  if(!slug)return null;
  const registry=await getTenantRegistry();
  const authorized=registry.find(t=>[t.slug,t.workspace_code,t.id].some(value=>String(value||'').toLowerCase()===String(slug).toLowerCase()));
  if(authorized)return authorized;
  const {data,error}=await supabaseClient.rpc('get_workspace_config',{p_slug:String(slug)});
  return !error && data?.id ? {...data,latitude:data.lat,longitude:data.lon} : null;
 }catch(_){return null;}
}

/* ---------- Per-Tenant Staff & Config Scoping ---------- */

function sanitizeStaffDirectory(rows) {
 return (Array.isArray(rows)?rows:[]).map(row=>{
  if(typeof row!=='object'||!row)return row;
  const clean={...row,device_linked:Boolean(row.device_linked||row.device_id||row.deviceId)};
  delete clean.device_id;delete clean.deviceId;delete clean.device_token;
  return clean;
 });
}
async function getTenantStaffList(tenantSlug) {
 const slug=String(tenantSlug||getActiveTenantSlug()).trim().toLowerCase();
    if (slug === 'demo') {
        return [
            { id: "demo-staff-1", name: "Alex Rivera", dept: "Engineering", schedule_policy: "weekly_hybrid", is_team_lead: true, device_id: null },
            { id: "demo-staff-2", name: "Jordan Lee", dept: "Operations", schedule_policy: "weekly_hybrid", is_team_lead: false, device_id: null },
            { id: "demo-staff-3", name: "Sam Taylor", dept: "Product & Design", schedule_policy: "field_flexible", is_team_lead: false, device_id: null },
            { id: "demo-staff-4", name: "Morgan Chen", dept: "Growth & Sales", schedule_policy: "office_only", is_team_lead: false, device_id: null },
            { id: "demo-staff-5", name: "Elena Rostova", dept: "DevOps & Cloud", schedule_policy: "weekly_hybrid", is_team_lead: false, device_id: null }
        ];
    }

 if(!supabaseClient?.rpc)return sanitizeStaffDirectory(readStoredJson('staff_cache_'+slug,[]));
 const tenant=await getActiveTenant(slug);
 const {data:sessionData}=supabaseClient.auth?.getSession?await supabaseClient.auth.getSession():{data:null};
 let rows;
 if(sessionData?.session){
  const {data,error}=await supabaseClient.rpc('manage_tenant_staff',{p_action:'list',p_tenant_slug:slug});
  if(!error&&data?.ok)rows=data.staff;
 }
 if(!rows && tenant?.workspace_code){
  const {data,error}=await supabaseClient.rpc('get_workspace_staff',{p_workspace_code:tenant.workspace_code});
  if(error)throw error;rows=data;
 }
 if(!rows)return [];
 const clean=sanitizeStaffDirectory(rows);writeStoredJson('staff_cache_'+slug,clean);return clean;
}

async function getTenantConfig(tenantSlug) {
    const slug = String(tenantSlug || (typeof activeTenantSlug !== 'undefined' ? activeTenantSlug : (typeof getActiveTenantSlug === 'function' ? getActiveTenantSlug() : 'default'))).trim().toLowerCase();
    if (slug === 'demo') {
        const demoLat = (typeof coords !== 'undefined' && coords && coords.lat) ? coords.lat : 6.4357;
        const demoLon = (typeof coords !== 'undefined' && coords && coords.lon) ? coords.lon : 3.4738;
        return {
            slug: 'demo',
            name: 'Acme Global Demo',
            office_name: 'Acme HQ (Sandbox)',
            latitude: demoLat,
            longitude: demoLon,
            radius: 500,
            grace_period_minutes: 15,
            default_policy: 'weekly_hybrid',
            hybrid_office_days: 2,
            brand_color: '#27FB8A',
            logo_url: '',
            workday_start_time: '08:30',
            late_cutoff_minutes: 570,
            workday_end_time: '17:00',
            workday_end_minutes: 1020,
            allow_remote_signout_post_closing: true,
            count_wfh_in_attendance_quota: true,
            wfh_quota_enabled: true,
            workdays: '1_5',
            team_lead_priority_sort: true,
            timezone: (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') : 'UTC'
        };
    }
    const configKey = `TENANT_CONFIG_${slug}`;
    try {
        const { data, error } = await supabaseClient.rpc('get_workspace_config', { p_slug: slug });
        if (!error && data) {
            return { ...data, latitude: data.latitude ?? data.lat, longitude: data.longitude ?? data.lon };
        }
    } catch (e) {}

    // Fallback to tenant registry defaults
    const registry = await getTenantRegistry();
    const t = registry.find(item => item.slug.toLowerCase() === slug);
    if (!t?.id) return null;
    return {
        slug: t.slug || slug,
        name: t.name || (slug.charAt(0).toUpperCase() + slug.slice(1)),
        office_name: t.office_name || 'Main Office',
        latitude: t.latitude == null ? null : Number(t.latitude),
        longitude: t.longitude == null ? null : Number(t.longitude),
        radius: Number(t.radius) || 100,
        grace_period_minutes: Number(t.grace_period_minutes) || 15,
        default_policy: t.default_policy || 'weekly_hybrid',
        hybrid_office_days: Number(t.hybrid_office_days) || 2,
        brand_color: t.brand_color || '#1a56db',
        logo_url: t.logo_url || '',
        workday_start_time: t.workday_start_time || '08:30',
        late_cutoff_minutes: Number(t.late_cutoff_minutes) || 510,
        workday_end_time: t.workday_end_time || '17:00',
        workday_end_minutes: Number(t.workday_end_minutes) || 1020,
        allow_remote_signout_post_closing: t.allow_remote_signout_post_closing !== undefined ? t.allow_remote_signout_post_closing : true,
        count_wfh_in_attendance_quota: t.wfh_quota_enabled !== undefined ? t.wfh_quota_enabled : true,
        wfh_quota_enabled: t.wfh_quota_enabled !== undefined ? t.wfh_quota_enabled : true,
        workdays: t.workdays || '1_5',
        team_lead_priority_sort: t.team_lead_priority_sort !== undefined ? t.team_lead_priority_sort : true,
        timezone: t.timezone || 'Africa/Lagos'
    };
}

async function resolveRequestedTenantSlug(payload) {
    if (payload && payload.tenantSlug) return String(payload.tenantSlug).trim().toLowerCase();
    const activeTenant = await getActiveTenant();
    if (activeTenant && activeTenant.slug) return activeTenant.slug.toLowerCase();
    const sessionSlug = (typeof safeSession !== 'undefined' && (safeSession.getItem('admin_tenant_slug'))) || null;
    if (sessionSlug) return sessionSlug.toLowerCase();
    const storageSlug = (typeof safeStorage !== 'undefined' && safeStorage.getItem('active_tenant_slug')) || null;
    if (storageSlug) return storageSlug.toLowerCase();
    return null;
}



/**
 * Normalizes schedule policy string to schema-supported check constraint:
 * 'office' | 'weekly_hybrid' | 'remote' | 'leave'
 */
function normalizeSchedulePolicy(policy) {
    if (!policy) return 'weekly_hybrid';
    const p = String(policy).toLowerCase().trim();
    if (p === 'office' || p === 'office_only' || p.includes('onsite') || p.includes('on-site')) return 'office';
    if (p === 'remote' || p === 'field_flexible' || p === 'flexible' || p === 'executive') return 'remote';
    if (p === 'leave' || p === 'on_leave') return 'leave';
    return 'weekly_hybrid';
}

/* ==========================================================================
   DOMAIN-SPECIFIC BACKEND HANDLERS
   Modularized from monolithic callBackend for maintainability and security
   ========================================================================== */


/**
 * Auth & Administrator Access Domain
 */
async function handleAuthBackend(mode, payload) {
    switch (mode) {
            case 'admin-login': {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email: String(payload.email || '').trim(), password: String(payload.password || '') });
                if (error || !data?.user) return { ok: false, message: 'Sign-in failed. Check your email and password and try again.' };
                const { data: memberships, error: memberError } = await supabaseClient.rpc('get_admin_workspaces');
                if (memberError) throw memberError;
                const requestedSlug = payload.tenantSlug || new URLSearchParams(window.location.search).get('tenant');
                const membership = (memberships || []).find(m => !requestedSlug || m.tenants?.slug === requestedSlug || m.tenants?.workspace_code === requestedSlug);
                if (!membership?.tenants) return { ok: false, message: 'This account is not an administrator of the selected workspace.' };
                return { ok: true, role: membership.role === 'owner' ? 'admin' : membership.role, isSuperuser: false, username: data.user.email, tenantSlug: membership.tenants.slug, tenant: membership.tenants };
            }
            case 'admin-logout': {
                await supabaseClient.auth.signOut();
                return { ok: true, message: 'Logged out.' };
            }
            case 'admin-reset-user-password':
            case 'reset-admin-password':
                return { ok: false, message: 'Passwords belong to each account. The account holder must use the secure email recovery flow.' };
            case 'admin-change-password': {
                const pass = payload.newPassword;
                if (pass) {
                    const passCheck = validatePasswordStrength(pass);
                    if (!passCheck.ok) {
                        return { ok: false, message: passCheck.message };
                    }
                    // Make sure the Supabase client's session is fresh before calling updateUser
                    let session = null;
                    try {
                        const { data: sessData } = await supabaseClient.auth.getSession();
                        session = sessData?.session || null;
                    } catch(e) {}
                    if (!session) {
                        // Try a token refresh in case the access token is just expired
                        try {
                            const { data: refreshData } = await supabaseClient.auth.refreshSession();
                            session = refreshData?.session || null;
                        } catch(e) {}
                    }
                    if (!session) {
                        return { ok: false, message: 'No active admin session — please log in again before changing your password.' };
                    }
                    // Re-assert the session so the client sends the correct Bearer token
                    await supabaseClient.auth.setSession({
                        access_token: session.access_token,
                        refresh_token: session.refresh_token
                    });
                    const { error } = await supabaseClient.auth.updateUser({ password: pass });
                    if (error) throw error;
                }
                return { ok: true, message: 'Password updated successfully!' };
            }
            case 'admin-set-recovery-email': {
                const email = String(payload.email || '').trim();
                if (!isValidEmail(email)) return {ok:false,message:'Enter a valid email address.'};
                const {error} = await supabaseClient.auth.updateUser({email});
                if (error) throw error;
                return {ok:true,message:'Confirm the email change using the links sent by the account service. Recovery uses your confirmed account email.'};
            }
            case 'get-recovery-email': {
                const {data,error} = await supabaseClient.auth.getUser();
                if(error || !data?.user) return {ok:false,message:'Sign in to view your recovery email.'};
                return {ok:true,email:data.user.email};
            }
        default:
            return null;
    }
}

/**
 * Presence & Attendance Verification Domain
 */
function attendanceFilterDate(value, endOfDay = false) {
    if (!value) return null;
    let raw = String(value).trim();
    const displayed = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (displayed) raw = `${displayed[3]}-${displayed[2]}-${displayed[1]}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split('-').map(Number);
        const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error('Enter a valid attendance date.');
        return date.toISOString();
    }
    if (!/^\d{4}-\d{2}-\d{2}T/.test(raw) || !Number.isFinite(Date.parse(raw))) throw new Error('Enter a valid attendance date.');
    return new Date(raw).toISOString();
}
async function handleAttendanceBackend(mode, payload) {
    switch (mode) {
            case 'attendance': {
                const tenant=await getActiveTenant(payload.tenantSlug);
                const staffId=payload.staffId||(await getTenantStaffList(tenant?.slug)).find(s=>s.name?.toLowerCase()===String(payload.name||'').trim().toLowerCase())?.id;
                if(!staffId)return {ok:false,allowed:false,message:'Select a registered staff profile.'};
                const {data,error}=await supabaseClient.rpc('record_attendance',{
                    p_staff_id:staffId,p_device_id:payload.deviceId,p_event_type:String(payload.action||'').toLowerCase(),
                    p_latitude:payload.lat,p_longitude:payload.lon
                });
                if(error)throw error;
                const result=Array.isArray(data)?data[0]:data;
                return {ok:Boolean(result?.ok),allowed:Boolean(result?.ok),message:result?.message,status:result?.status,
                    distance:result?.distance_meters,raw:result?{...result,distance:result.distance_meters}:null};
            }
            case 'list-logs': {
                if(payload.name && typeof getDeviceId==='function'){
                    const tenant=await getActiveTenant(payload.tenantSlug);
                    const member=(await getTenantStaffList(tenant?.slug)).find(row=>row.name?.toLowerCase()===String(payload.name).toLowerCase());
                    if(!member)return {ok:false,message:'Staff profile unavailable.'};
                    const {data,error}=await supabaseClient.rpc('get_staff_attendance',{p_staff_id:member.id,p_device_id:getDeviceId(),p_limit:Math.min(Number(payload.limit)||10,50)});
                    if(error)throw error;
                    if(!data?.ok)return {ok:false,message:data?.message||'Device authorization required.'};
                    return {ok:true,logs:(data.logs||[]).map(row=>({...row,name:member.name,action:row.event_type.toUpperCase(),date:row.occurred_at.slice(0,10),time:new Date(row.occurred_at).toLocaleTimeString(),created_at:row.occurred_at,server_status:row.status}))};
                }
                const tenantSlug = await resolveRequestedTenantSlug(payload);
                if (!tenantSlug) return { ok: true, logs: [] };

                const { data, error } = await supabaseClient.rpc('get_admin_attendance', {
                    p_tenant_slug: tenantSlug,
                    p_staff_id: payload.staffId || null,
                    p_from_date: attendanceFilterDate(payload.fromDate),
                    p_to_date: attendanceFilterDate(payload.toDate, true),
                    p_limit: parseInt(payload.limit, 10) || 200
                });
                if (error) throw error;

                const logs = (data || []).map(row => ({
                    id: row.id,
                    name: row.staff ? row.staff.name : (payload.name || 'Staff Member'),
                    dept: row.staff ? (row.staff.department || 'General') : 'General',
                    action: (row.event_type || 'IN').toUpperCase(),
                    status: row.status === 'on_site' ? 'Verified Present' : (row.status === 'provisional_transfer' ? 'Provisional Transfer' : (row.status === 'outside_perimeter' ? 'Outside Perimeter' : row.status)),
                    time: new Date(row.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: row.occurred_at ? row.occurred_at.split('T')[0] : '',
                    occurred_at: row.occurred_at,
                    created_at: row.occurred_at,
                    server_status: row.status,
                    original_status: row.original_status,
                    transfer_request_id: row.transfer_request_id,
                    transfer_resolved_at: row.transfer_resolved_at,
                    distance: row.distance_meters,
                    verification_method: row.verification_method,
                    office: row.office ? row.office.name : 'Office'
                }));

                return { ok: true, logs };
            }

        default:
            return null;
    }
}

/**
 * Staff Profiles & Roster Management Domain
 */
async function handleStaffBackend(mode, payload) {
    switch (mode) {
            case 'list-staff': {
                const slug = await resolveRequestedTenantSlug(payload);
                if (!slug) return {ok:false,message:'Select your workspace first.'};
                return {ok:true,allowed:true,staff:await getTenantStaffList(slug)};
            }
            case 'add-staff': {
                const tenantSlug = await resolveRequestedTenantSlug(payload);
                if (!tenantSlug) return { ok: false, message: 'No active workspace selected or authorized.' };
                const name = String(payload.name || '').trim();
                if (!name) return { ok: false, message: 'Staff name is required.' };

                const res = await supabaseClient.rpc('manage_tenant_staff', {
                    p_action: 'add',
                    p_tenant_slug: tenantSlug,
                    p_staff_data: {
                        name,
                        dept: String(payload.dept || 'General').trim(),
                        schedule_policy: normalizeSchedulePolicy(payload.schedule_policy),
                        is_team_lead: Boolean(payload.is_team_lead),
                        include_in_reports: payload.include_in_reports !== false
                    }
                });

                try { safeStorage.removeItem(`staff_cache_${tenantSlug}`); safeStorage.removeItem('attendance_staff_cache_v2'); } catch(e) {}
                if (res && res.data && res.data.ok) {
                    return { ok: true, message: res.data.message || 'Staff added successfully.' };
                }
                return { ok: false, message: (res && res.data && res.data.message) || 'Could not add staff.' };
            }
            case 'batch-import-staff': {
                const tenantSlug = await resolveRequestedTenantSlug(payload);
                if (!tenantSlug) return { ok: false, message: 'No active workspace selected or authorized.' };
                const list = Array.isArray(payload.staff) ? payload.staff : [];
                if (!list.length) return { ok: false, message: 'No staff data provided.' };

                const cleanList = list.map(item => ({
                    name: String(item.name || '').trim(),
                    dept: String(item.dept || item.department || 'General').trim(),
                    schedule_policy: normalizeSchedulePolicy(item.schedule_policy),
                    is_team_lead: Boolean(item.is_team_lead),
                    include_in_reports: item.include_in_reports !== false
                })).filter(i => Boolean(i.name));

                const res = await supabaseClient.rpc('manage_tenant_staff', {
                    p_action: 'batch_import',
                    p_tenant_slug: tenantSlug,
                    p_staff_data: cleanList
                });

                try { safeStorage.removeItem(`staff_cache_${tenantSlug}`); safeStorage.removeItem('attendance_staff_cache_v2'); } catch(e) {}
                if (res && res.data && res.data.ok) {
                    return {
                        ok: true,
                        message: res.data.message || `Processed ${cleanList.length} staff records.`,
                        count: res.data.count || cleanList.length
                    };
                }
                return { ok: false, message: (res && res.data && res.data.message) || 'Import failed.' };
            }
            case 'update-staff': {
                const tenantSlug = await resolveRequestedTenantSlug(payload);
                if (!tenantSlug) return { ok: false, message: 'No active workspace selected or authorized.' };
                const name = String(payload.name || '').trim();

                const res = await supabaseClient.rpc('manage_tenant_staff', {
                    p_action: 'update',
                    p_tenant_slug: tenantSlug,
                    p_staff_data: {
                        id: payload.id,
                        name,
                        dept: payload.dept !== undefined ? String(payload.dept).trim() : undefined,
                        schedule_policy: payload.schedule_policy !== undefined ? normalizeSchedulePolicy(payload.schedule_policy) : undefined,
                        is_team_lead: payload.is_team_lead !== undefined ? Boolean(payload.is_team_lead) : undefined,
                        include_in_reports: payload.include_in_reports !== undefined ? Boolean(payload.include_in_reports) : undefined
                    }
                });

                try { safeStorage.removeItem(`staff_cache_${tenantSlug}`); safeStorage.removeItem('attendance_staff_cache_v2'); } catch(e) {}
                if (res && res.data && res.data.ok) {
                    return { ok: true, message: res.data.message || 'Staff updated successfully.' };
                }
                return { ok: false, message: (res && res.data && res.data.message) || 'Could not update staff.' };
            }
            case 'remove-staff': {
                const tenantSlug = await resolveRequestedTenantSlug(payload);
                if (!tenantSlug) return { ok: false, message: 'No active workspace selected or authorized.' };
                const name = String(payload.name || '').trim();

                const res = await supabaseClient.rpc('manage_tenant_staff', {
                    p_action: 'remove',
                    p_tenant_slug: tenantSlug,
                    p_staff_data: { name, id: payload.id }
                });

                try { safeStorage.removeItem(`staff_cache_${tenantSlug}`); safeStorage.removeItem('attendance_staff_cache_v2'); } catch(e) {}
                if (res && res.data && res.data.ok) {
                    return { ok: true, message: res.data.message || 'Staff removed successfully.' };
                }
                return { ok: false, message: (res && res.data && res.data.message) || 'Could not remove staff.' };
            }
            case 'reset-staff-lock': {
                const tenantSlug = await resolveRequestedTenantSlug(payload);
                if (!tenantSlug) return { ok: false, message: 'No active workspace selected or authorized.' };
                const name = String(payload.name || '').trim();

                const res = await supabaseClient.rpc('manage_tenant_staff', {
                    p_action: 'reset_lock',
                    p_tenant_slug: tenantSlug,
                    p_staff_data: { name, id: payload.id }
                });

                try { safeStorage.removeItem(`staff_cache_${tenantSlug}`); safeStorage.removeItem('attendance_staff_cache_v2'); } catch(e) {}
                if (res && res.data && res.data.ok) {
                    return { ok: true, message: res.data.message || 'Device lock reset successfully.' };
                }
                return { ok: false, message: (res && res.data && res.data.message) || 'Could not reset device lock.' };
            }
            case 'reset-all-locks': {
                const tenantSlug = await resolveRequestedTenantSlug(payload);
                if (!tenantSlug) return { ok: false, message: 'No active workspace selected or authorized.' };

                const res = await supabaseClient.rpc('manage_tenant_staff', {
                    p_action: 'reset_all_locks',
                    p_tenant_slug: tenantSlug
                });

                try { safeStorage.removeItem(`staff_cache_${tenantSlug}`); safeStorage.removeItem('attendance_staff_cache_v2'); } catch(e) {}
                if (res && res.data && res.data.ok) {
                    return { ok: true, message: res.data.message || 'All device locks reset successfully.' };
                }
                return { ok: false, message: (res && res.data && res.data.message) || 'Could not reset all device locks.' };
            }

            case 'verify-staff-member': {
                const activeTenant = await getActiveTenant(payload.tenantSlug);
                const tenantSlug = (payload.tenantSlug || (activeTenant ? activeTenant.slug : 'default')).toLowerCase();
                const queryName = String(payload.name || '').trim().toLowerCase();
                if (!queryName) return { ok: false, message: 'Please enter your registered staff name.' };

                const staff = await getTenantStaffList(tenantSlug);
                const member = staff.find(s => String(s.name || '').trim().toLowerCase() === queryName);

                if (!member) {
                    return { ok: false, message: `No registered staff found matching "${payload.name}" for ${activeTenant ? activeTenant.name : 'this company'}. Please verify your spelling or contact HR.` };
                }

                const verification=await handleDeviceBackend('verify-owner',{staffId:member.id,deviceId:typeof getDeviceId==='function'?getDeviceId():payload.deviceId});
                return {ok:true,name:member.name,dept:member.dept||member.department||'General',schedule_policy:member.schedule_policy||'weekly_hybrid',
                    is_team_lead:Boolean(member.is_team_lead),allowed:verification.allowed,message:verification.message,
                    provisional:verification.provisional};
            }
            case 'unlink-staff-device':
                return handleStaffBackend('reset-staff-lock',payload);
        default:
            return null;
    }
}

/**
 * Delegated Tenant Administrators Domain
 */
async function handleTenantAdminBackend(mode, payload) {
    if (['add-admin-user','remove-admin-user','update-admin-role','update-admin-user'].includes(mode)) {
        return { ok: false, message: 'Administrator invitations and role changes require a server-side account-management service. This action is not available in this release.' };
    }
    if (mode !== 'list-admin-users') return null;
    const slug = await resolveRequestedTenantSlug(payload);
    const { data, error } = await supabaseClient.rpc('get_workspace_administrators', {p_tenant_slug:slug});
    if (error) throw error;
    return { ok: true, users: (data || []).map(m => ({ id: m.user_id, username: 'Workspace administrator', role: m.role, is_primary: m.role === 'owner' })) };
}

/**
 * Workspace Configuration & Policies Domain
 */
async function handleConfigBackend(mode, payload) {
    switch (mode) {
            case 'get-config': {
                const slug = await resolveRequestedTenantSlug(payload);
                const config = slug ? await getTenantConfig(slug) : null;
                return { ok: true, config: { TIMEZONE: config?.timezone || 'Africa/Lagos', OFFICE_LAT: config?.latitude, OFFICE_LON: config?.longitude, RADIUS_METERS: config?.radius, WORKDAY_END_MINUTES: 1020, ALLOW_REMOTE_SIGNOUT_POST_CLOSING: 'false', COUNT_WFH_IN_ATTENDANCE_QUOTA: 'true' } };
            }
            case 'update-config': {
                return { ok: false, message: 'This workspace policy is not supported by the current database. No changes were saved.' };
            }
        default:
            return null;
    }
}

/**
 * Weekly Hybrid Attendance Matrix Domain
 */
function scheduleWeekStart(value) {
    const raw = String(value || '').replace(/^[^:]+::/, '').trim();
    let date;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) date = new Date(raw.slice(0,10)+'T12:00:00');
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) { const [d,m,y]=raw.split('/'); date=new Date(Number(y),Number(m)-1,Number(d),12); }
    else {
        if (!/^[A-Za-z]{3,9}\s+\d{1,2}(?:,?\s+\d{4})?(?:\s+-\s+[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})?$/.test(raw)) throw new Error('Invalid schedule week.');
        const start = raw.split(' - ')[0];
        const year = raw.match(/\b\d{4}\b/)?.[0];
        date = new Date(/\b\d{4}\b/.test(start) ? start : `${start}, ${year || new Date().getFullYear()}`);
        const end = raw.split(' - ')[1];
        if (end && !/\b\d{4}\b/.test(start) && Number.isFinite(date.getTime())) {
            const endDate = new Date(end);
            if (Number.isFinite(endDate.getTime()) && endDate.getMonth() < date.getMonth()) date.setFullYear(date.getFullYear() - 1);
        }
    }
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid schedule week.');
    const day=date.getDay();date.setDate(date.getDate()-(day===0?6:day-1));
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}

async function handleScheduleBackend(mode, payload) {
    if (!['get-hybrid-schedule','save-hybrid-schedule','update-hybrid-schedule','get-hybrid-history'].includes(mode)) return null;
    const slug = await resolveRequestedTenantSlug(payload);
    if (!slug) return { ok: false, message: 'Select your workspace first.' };
    const tenant = await getTenantConfig(slug);
    if (!tenant?.id) return { ok: false, message: 'Workspace is unavailable. Reconnect with your pairing code.' };
    if (mode === 'get-hybrid-history') {
        const { data, error } = await supabaseClient.rpc('get_workspace_schedule_history', {p_workspace_code:tenant.workspace_code});
        if (error) throw error;
        return { ok:true, history:data || [] };
    }
    const weekStart = scheduleWeekStart(payload.weekStart);
    if (mode === 'get-hybrid-schedule') {
        const { data,error } = await supabaseClient.rpc('get_workspace_schedule', {p_workspace_code:tenant.workspace_code,p_week_start:weekStart});
        if (error) throw error;
        return { ok:true, allowed:true, schedule:data || {} };
    }
    const { data:userData,error:userError }=await supabaseClient.auth.getUser();
    if(userError || !userData?.user) return {ok:false,message:'Sign in as a workspace administrator to save schedules.'};
    const { error } = await supabaseClient.rpc('save_workspace_schedule', {p_tenant_slug:slug,p_week_start:weekStart,p_schedule_data:payload.scheduleData || payload.schedule || {}});
    if(error)throw error;
    return {ok:true,message:'Hybrid schedule saved.'};
}

/**
 * Hardware Device Identity & Account Ownership Domain
 */
async function handleDeviceBackend(mode, payload) {
    switch (mode) {
            case 'verify-owner':
            case 'verify-user':
            case 'register-owner': {
                let staffId=payload.staffId;
                if(!staffId){
                    const tenant=await getActiveTenant(payload.tenantSlug);
                    staffId=(await getTenantStaffList(tenant?.slug)).find(row=>row.name?.toLowerCase()===String(payload.name||'').trim().toLowerCase())?.id;
                }
                if(!staffId||!payload.deviceId)return {ok:false,allowed:false,message:'A registered staff profile and device identity are required.'};
                const rpc=mode==='register-owner'?'bind_staff_device':'verify_staff_device';
                const {data,error}=await supabaseClient.rpc(rpc,{p_staff_id:staffId,p_device_id:payload.deviceId});
                if(error)throw error;
                const result=Array.isArray(data)?data[0]:data;
                return {ok:Boolean(result?.ok),allowed:Boolean(result?.ok),message:result?.message,
                    provisional:result?.ok===true&&result?.message==='Transfer pending. Attendance will be provisional.'};
            }
            case 'request-device-transfer': {
                const staffName = payload.staffName || 'Employee';
                const tenantSlug = payload.tenantSlug || 'default';
                const deviceId = payload.deviceId || (typeof getDeviceId === 'function' ? getDeviceId() : null);

                let staffId = payload.staffId;
                if (!staffId && staffName) {
                    const staffList = await getTenantStaffList(tenantSlug);
                    const s = staffList.find(item => item.name.toLowerCase() === staffName.toLowerCase());
                    if (s) staffId = s.id;
                }

                if (!staffId) {
                    return { ok: false, message: `Staff member "${staffName}" not found.` };
                }

                try {
                    const { data, error } = await supabaseClient.rpc('request_device_transfer', {
                        p_staff_id: staffId,
                        p_device_id: deviceId
                    });
                    if (error) throw error;
                    return data;
                } catch(e) {
                    console.warn('Error in request_device_transfer RPC:', e);
                    return { ok: false, message: e.message || 'Could not request transfer.' };
                }
            }
            case 'get-device-transfers': {
                const tenantSlug = payload.tenantSlug || 'default';
                try {
                    {
                        const { data, error } = await supabaseClient.rpc('get_admin_transfers', {p_tenant_slug:tenantSlug});

                        if (!error && Array.isArray(data)) {
                            const mapped = data.map(r => ({
                                id: r.id,
                                staffName: r.staff ? r.staff.name : 'Employee',
                                staff_name: r.staff ? r.staff.name : 'Employee',
                                dept: r.staff ? (r.staff.department || 'General') : 'General',
                                requestedAt: r.requested_at,
                                requested_at: r.requested_at,
                                expires_at: r.expires_at,
                                status: r.status
                            }));
                            return { ok: true, transfers: mapped };
                        }
                    }
                } catch(e) {}
                return {ok:false,message:'Transfer requests could not be loaded. Check administrator access and retry.'};
            }
            case 'approve-device-transfer': {
                const tenantSlug = payload.tenantSlug || 'default';
                let reqId = payload.requestId;
                if (!reqId && payload.staffName) {
                    const transfersRes = await handleDeviceBackend('get-device-transfers', { tenantSlug });
                    const item = (transfersRes.transfers || []).find(t => (t.staffName || t.staff_name || '').toLowerCase() === payload.staffName.toLowerCase());
                    if (item) reqId = item.id;
                }
                if (reqId) {
                    try {
                        const { data, error } = await supabaseClient.rpc('admin_resolve_device_transfer', {
                            p_request_id: reqId,
                            p_action: 'approve'
                        });
                        if(error)throw error;
                        if(data)return data;
                    } catch(e) {}
                }
                return { ok: false, message: 'Could not approve device transfer.' };
            }
            case 'reject-device-transfer': {
                const tenantSlug = payload.tenantSlug || 'default';
                let reqId = payload.requestId;
                if (!reqId && payload.staffName) {
                    const transfersRes = await handleDeviceBackend('get-device-transfers', { tenantSlug });
                    const item = (transfersRes.transfers || []).find(t => (t.staffName || t.staff_name || '').toLowerCase() === payload.staffName.toLowerCase());
                    if (item) reqId = item.id;
                }
                if (reqId) {
                    try {
                        const { data, error } = await supabaseClient.rpc('admin_resolve_device_transfer', {
                            p_request_id: reqId,
                            p_action: 'reject'
                        });
                        if(error)throw error;
                        if(data)return data;
                    } catch(e) {}
                }
                return { ok: false, message: 'Could not reject device transfer.' };
            }
        default:
            return null;
    }
}

/* ==========================================================================
   PRIMARY BACKEND DISPATCHER (Public API Contract)
   ========================================================================== */

/**
 * Interactive Demo Sandbox Mock Backend Handler
 * Enables 1-click test drive of the Perimetrr terminal with zero database dependencies.
 */
function generateMockLogs() {
    const logs = [];
    const names = ["Jordan Lee", "Sam Taylor", "Alex Chen", "Morgan Smith", "Casey Johnson", "Riley Davis", "Jamie Wilson"];
    const depts = ["Operations", "Product & Design", "Engineering", "Marketing", "Sales", "HR", "Finance"];

    // Generate logs for the last 5 days
    for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // Skip weekends
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        names.forEach((name, idx) => {
            // Some randomness to make it look real (~10% absent)
            if (Math.random() > 0.9) return;

            // Random check-in time around 8:00 - 9:30
            const inHour = 8 + (Math.random() > 0.7 ? 1 : 0);
            const inMin = Math.floor(Math.random() * 60);
            const inTimeStr = `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')} AM`;

            // Random check-out time around 4:30 - 6:30 PM
            const outHour = 4 + Math.floor(Math.random() * 3);
            const outMin = Math.floor(Math.random() * 60);
            const outTimeStr = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')} PM`;

            const distIn = Math.floor(Math.random() * 40);
            const distOut = Math.floor(Math.random() * 40);

            const inDate = new Date(d);
            inDate.setHours(inHour, inMin);

            logs.push({
                name: name,
                dept: depts[idx],
                action: "IN",
                time: inTimeStr,
                date: dateStr,
                distance: distIn,
                status: (inHour === 9 && inMin > 15) ? "LATE" : "ON_TIME",
                verified: true,
                notes: `GPS Verified (${distIn}m from HQ)`,
                created_at: inDate.toISOString()
            });

            // Generate OUT logs for past days (or if it's today and past 4PM)
            const isPastDay = i > 0;
            const isTodayAndLate = i === 0 && new Date().getHours() >= 17;
            if (isPastDay || isTodayAndLate) {
                const outDate = new Date(d);
                outDate.setHours(outHour + 12, outMin);
                logs.push({
                    name: name,
                    dept: depts[idx],
                    action: "OUT",
                    time: outTimeStr,
                    date: dateStr,
                    distance: distOut,
                    status: "OUT",
                    verified: true,
                    notes: `GPS Verified (${distOut}m from HQ)`,
                    created_at: outDate.toISOString()
                });
            }
        });
    }
    // Sort descending by created_at
    return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

let demoAttendanceLogs = generateMockLogs();

function resetDemoAttendanceLogs() {
    demoAttendanceLogs = generateMockLogs();
}

if (typeof window !== 'undefined') {
    window.resetDemoAttendanceLogs = resetDemoAttendanceLogs;
}

function handleDemoBackend(mode, payload) {
    const demoStaffList = [
        { name: "Alex Rivera", dept: "Engineering", schedule_policy: "weekly_hybrid", is_team_lead: true, device_id: null },
        { name: "Jordan Lee", dept: "Operations", schedule_policy: "weekly_hybrid", is_team_lead: false, device_id: null },
        { name: "Sam Taylor", dept: "Product & Design", schedule_policy: "field_flexible", is_team_lead: false, device_id: null },
        { name: "Morgan Chen", dept: "Growth & Sales", schedule_policy: "office_only", is_team_lead: false, device_id: null },
        { name: "Elena Rostova", dept: "DevOps & Cloud", schedule_policy: "weekly_hybrid", is_team_lead: false, device_id: null }
    ];

    switch (mode) {
        case 'list-staff':
            return { ok: true, staff: demoStaffList };
        case 'get-config':
            return {
                ok: true,
                config: {
                    office_name: "Acme HQ (Sandbox)",
                    radius: 500,
                    latitude: payload && payload.latitude ? payload.latitude : 0,
                    longitude: payload && payload.longitude ? payload.longitude : 0,
                    late_cutoff_minutes: 570,
                    workday_end_minutes: 1020,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                    wfh_quota_enabled: true,
                    default_policy: "weekly_hybrid"
                }
            };
        case 'verify-staff-member': {
            const member = demoStaffList.find(s => s.name === (payload ? payload.name : '')) || demoStaffList[0];
            return {
                ok: true,
                name: member.name,
                dept: member.dept,
                schedule_policy: member.schedule_policy,
                is_team_lead: member.is_team_lead,
                is_linked: false,
                was_unlinked_by_admin: false
            };
        }
        case 'verify-owner':
        case 'verify-user':
            return { ok: true, allowed: true, owner: payload && payload.name ? payload.name : 'Alex Rivera', message: 'Device authorized (Sandbox Demo)' };
        case 'register-owner':
            return { ok: true, allowed: true, message: 'Device registered (Sandbox Demo)' };
        case 'attendance':
        case 'log-attendance':
        case 'signin':
        case 'signout': {
            const isSignOut = mode === 'signout' || (payload && payload.action && payload.action.toUpperCase() === 'OUT');
            const actionText = isSignOut ? 'Sign Out' : 'Sign In';
            const action = isSignOut ? 'OUT' : 'IN';
            const staffName = payload && payload.name ? payload.name : 'Alex Rivera';
            const staffDept = payload && payload.dept ? payload.dept : 'Engineering';
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toISOString().split('T')[0];

            demoAttendanceLogs.unshift({
                name: staffName,
                dept: staffDept,
                action: action,
                time: timeStr,
                date: dateStr,
                distance: 14,
                status: "ON_TIME",
                verified: true,
                notes: "GPS Verified (14m from HQ)",
                created_at: now.toISOString()
            });

            const rawObj = {
                status: 'WELCOME',
                message: `${actionText} verified successfully! (Sandbox Demo)`,
                distance: '14',
                distance_meters: 14,
                ok: true
            };
            return {
                ok: true,
                allowed: true,
                message: `${actionText} verified successfully! (Sandbox Demo)`,
                distance: 14,
                status: 'WELCOME',
                timestamp: now.toISOString(),
                raw: rawObj
            };
        }
        case 'list-logs': {
            const requestedName = payload && payload.name ? payload.name.toLowerCase() : '';
            const filtered = requestedName
                ? demoAttendanceLogs.filter(l => (l.name || '').toLowerCase() === requestedName)
                : demoAttendanceLogs;
            return {
                ok: true,
                logs: filtered
            };
        }
        case 'get-hybrid-schedule':
            return {
                ok: true,
                schedule: {
                    "Alex Rivera": { "mon": "office", "tue": "office", "wed": "remote", "thu": "office", "fri": "remote" },
                    "Jordan Lee": { "mon": "remote", "tue": "office", "wed": "office", "thu": "remote", "fri": "office" },
                    "Sam Taylor": { "mon": "office", "tue": "office", "wed": "office", "thu": "remote", "fri": "remote" },
                    "Morgan Chen": { "mon": "office", "tue": "office", "wed": "office", "thu": "office", "fri": "office" },
                    "Elena Rostova": { "mon": "remote", "tue": "remote", "wed": "office", "thu": "office", "fri": "office" }
                }
            };
        case 'record-device-lock':
        case 'reset-staff-lock':
        case 'unlink-staff-device':
        case 'request-device-transfer':
            return { ok: true, message: 'Device operation completed in demo sandbox.' };
        default:
            return { ok: true, message: 'Demo sandbox operation succeeded.' };
    }
}

/**
 * Universal backend entry point for Supabase queries and RPCs.
 * Routes requests to domain-specific handlers for maintainability and security.
 *
 * @param {Object} payload - The request payload containing { mode, ... }
 * @param {number} timeoutMs - Optional timeout in milliseconds
 * @returns {Promise<Object>} Response object conforming to { ok: boolean, ... }
 */
async function callBackend(payload, timeoutMs = 20000) {
    const mode = payload ? payload.mode : null;
    if (!mode) return { ok: false, message: 'Missing request mode.' };

    const activeTenant = (typeof getActiveTenantDirect === 'function' ? getActiveTenantDirect() : null);
    const tenantSlug = String(payload.tenantSlug || (activeTenant ? (activeTenant.slug || activeTenant.workspace_code || '') : '') || safeStorage.getItem('active_tenant_slug') || '').toLowerCase();

    // 1. Intercept demo / sandbox simulation instantly
    if (tenantSlug === 'demo') {
        return handleDemoBackend(mode, payload);
    }

    if (!supabaseClient) return { ok: false, message: 'Supabase client not loaded.' };

    try {
        let res;

        res = await handleAuthBackend(mode, payload);
        if (res !== null) return res;

        res = await handleAttendanceBackend(mode, payload);
        if (res !== null) return res;

        res = await handleStaffBackend(mode, payload);
        if (res !== null) return res;

        res = await handleTenantAdminBackend(mode, payload);
        if (res !== null) return res;

        res = await handleConfigBackend(mode, payload);
        if (res !== null) return res;

        res = await handleScheduleBackend(mode, payload);
        if (res !== null) return res;

        res = await handleDeviceBackend(mode, payload);
        if (res !== null) return res;

        return { ok: false, allowed: false, message: `Endpoint '${mode}' is not implemented in Supabase yet.` };
    } catch (err) {
        console.error(`callBackend error on mode: ${mode}`, err);
        return { ok: false, allowed: false, message: err?.message || 'Database error.' };
    }
}



function normalizeBackendResponse(data) {
    if (!data) return { ok: false, allowed: false, message: 'No response from backend.', raw: null };
    if (data.result !== undefined) {
        const normalized = normalizeBackendResponse(data.result);
        if (normalized.raw === null && typeof data.result === 'string') {
            normalized.raw = data.result;
        }
        return normalized;
    }
    if (typeof data === 'string') {
        const parts = data.split('|');
        const isSuccess = ['WELCOME', 'LATE', 'NORMAL'].includes(parts[0]);
        return { ok: isSuccess, allowed: isSuccess, message: parts[1] || data, raw: data };
    }
    return {
        ok: data.ok === true || data.allowed === true,
        allowed: data.allowed === true || data.ok === true,
        message: data.message || data.result || 'Backend response received.',
        staff: data.staff || null,
        owner: data.owner || data.deviceOwner || null,
        logs: data.logs || null,
        config: data.config || null,
        schedule: data.schedule || null,
        csrfToken: data.csrfToken || null,
        adminToken: data.adminToken || null,
        raw: null
    };
}

/* ---------- Theme ---------- */

function applyTheme(theme, animate = false) {
    const root = document.documentElement;
    const toggle = document.getElementById('theme-toggle');
    const isDark = theme === 'dark';

    const updateDOM = () => {
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (toggle) {
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                toggle.innerHTML = isDark ? '<i data-lucide="sun" size="16"></i>' : '<i data-lucide="moon" size="16"></i>';
                window.lucide.createIcons();
            } else {
                toggle.textContent = isDark ? 'Light' : 'Dark';
            }
            toggle.setAttribute('aria-pressed', String(isDark));
            toggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        }
        try {
            safeStorage.setItem(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
        } catch (e) {
            console.warn('localStorage not available:', e);
        }
    };

    if (animate && typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.startViewTransition(() => {
            updateDOM();
        });
    } else {
        updateDOM();
    }
}

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    let saved = null;
    try {
        saved = safeStorage.getItem(STORAGE_KEYS.theme);
    } catch (e) {
        console.warn('localStorage not available:', e);
    }

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light', false);

    toggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
    });
}

/* ---------- Hard refresh ---------- */

async function hardRefresh() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
    }
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((reg) => reg.unregister()));
        }
        if (window.caches && caches.keys) {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
        }
    } catch (error) {
        console.warn('Error clearing service worker/cache during refresh:', error);
    } finally {
        window.location.reload();
    }
}

function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', hardRefresh);
    }
}

/* ---------- Show/hide password toggle ---------- */

function initPasswordToggle(toggleEl) {
    const targetId = toggleEl.getAttribute('data-toggle-target');
    const input = document.getElementById(targetId);
    if (!input || toggleEl.dataset.toggleBound) return;
    toggleEl.dataset.toggleBound = 'true';

    const syncToggleState = () => {
        const isHidden = input.type === 'password';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            toggleEl.innerHTML = isHidden ? '<i data-lucide="eye" size="14"></i>' : '<i data-lucide="eye-off" size="14"></i>';
            window.lucide.createIcons();
        } else {
            toggleEl.textContent = isHidden ? 'Show' : 'Hide';
        }
        toggleEl.setAttribute('aria-label', isHidden ? 'Show password' : 'Hide password');
        toggleEl.classList.toggle('visible', !isHidden);
    };

    syncToggleState();
    toggleEl.addEventListener('click', () => {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        syncToggleState();
    });
}

function initAllPasswordToggles(root = document) {
    root.querySelectorAll('[data-toggle-target]').forEach(initPasswordToggle);
}

/* ---------- Formatting ---------- */

function formatTimestamp(isoString) {
    if (!isoString) return 'Pending';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Pending';
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
}

function formatRelativeTimestamp(isoString) {
    if (!isoString) return 'Pending';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Pending';

    const now = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const isToday = date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth() &&
                    date.getDate() === now.getDate();

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const isYesterday = date.getFullYear() === yesterday.getFullYear() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getDate() === yesterday.getDate();

    if (isToday) {
        return `Today, ${timeStr}`;
    } else if (isYesterday) {
        return `Yesterday, ${timeStr}`;
    } else {
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleDateString([], { month: 'short' });
        return `${day} ${month}, ${timeStr}`;
    }
}

function formatDateDisplay(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/* ---------- Toast notifications ---------- */

let toastTimer = null;

function showToast(message, type = 'default', durationMs = 3400) {
    let toastEl = document.getElementById('app-toast');
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'app-toast';
        document.body.appendChild(toastEl);
    }
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = '<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
        iconSvg = '<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    }
    toastEl.innerHTML = `${iconSvg}<span style="flex:1;">${escapeHtml(message)}</span>`;
    toastEl.className = `toast visible${type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : ' toast-info'}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('visible');
    }, durationMs);
}

/* ---------- Inline dialog ---------- */

function showInlineDialog({ title, message, fields = [], confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, customContentHtml = '' }) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        const fieldsHtml = fields.map((field, idx) => {
            const inputId = `dialog-field-${idx}`;
            const labelHtml = field.label ? `<label for="${inputId}" style="display:block; font-size:0.78rem; font-weight:600; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.04em;">${escapeHtml(field.label)}</label>` : '';
            if (field.type === 'select') {
                const optionsHtml = (field.options || []).map(opt => `
                    <option value="${escapeHtml(opt.value)}" ${field.value === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>
                `).join('');
                return `
                    <div style="margin-bottom:12px;">
                        ${labelHtml}
                        <select id="${inputId}" class="dialog-select" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); font-size:0.88rem;">
                            ${optionsHtml}
                        </select>
                    </div>
                `;
            }

            const prefilledValue = (field.value !== undefined && field.value !== null) ? escapeHtml(String(field.value)) : '';
            const input = `
                <input
                    id="${inputId}"
                    type="${field.type || 'text'}"
                    placeholder="${escapeHtml(field.placeholder || '')}"
                    autocomplete="${field.autocomplete || 'off'}"
                    value="${prefilledValue}"
                />
            `;
            if (field.type === 'password') {
                return `
                    <div style="margin-bottom:12px;">
                        ${labelHtml}
                        <div class="password-field-wrap" style="margin-bottom:0;">
                            ${input}
                            <button type="button" class="password-toggle" data-toggle-target="${inputId}" aria-label="Show password"><i data-lucide="eye" size="14"></i></button>
                        </div>
                    </div>
                `;
            }
            return `<div style="margin-bottom:12px;">${labelHtml}${input}</div>`;
        }).join('');
        overlay.innerHTML = `
            <div class="dialog-box">
                <h3>${escapeHtml(title)}</h3>
                ${message ? `<p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:14px;">${escapeHtml(message)}</p>` : ''}
                ${fieldsHtml}
                ${customContentHtml}
                <div class="dialog-actions">
                    <button type="button" class="admin-btn secondary" data-action="cancel">${escapeHtml(cancelLabel)}</button>
                    <button type="button" class="admin-btn${danger ? ' danger' : ''}" data-action="confirm">${escapeHtml(confirmLabel)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        initAllPasswordToggles(overlay);

        const cleanup = (result) => {
            overlay.remove();
            resolve(result);
        };

        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(null));
        overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            const values = fields.map((field, idx) => {
                const raw = overlay.querySelector(`#dialog-field-${idx}`).value;
                return field.type === 'password' ? raw : raw.trim();
            });
            // Only require non-empty for fields that are not optional
            const missingRequired = fields.some((field, idx) => !field.optional && !values[idx]);
            if (fields.length && missingRequired) {
                showToast('Please fill in all required fields.', 'error');
                return;
            }
            // Capture all custom select/input values before overlay removal
            const customSelects = overlay.querySelectorAll('select');
            customSelects.forEach(sel => {
                if (sel.id) window['_dialogVal_' + sel.id] = sel.value;
            });
            cleanup(fields.length ? values : true);
        });
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) cleanup(null);
        });
        overlay.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') cleanup(null);
        });

        const firstInput = overlay.querySelector('input');
        if (firstInput) firstInput.focus();
    });
}

function confirmDialog(message, { danger = false, confirmLabel = 'Confirm', title = 'Please confirm' } = {}) {
    return showInlineDialog({ title, message, confirmLabel, danger }).then((result) => result === true);
}

function promptDialog(title, placeholder = '', type = 'text') {
    return showInlineDialog({ title, fields: [{ placeholder, type }] }).then((result) => (result ? result[0] : null));
}

async function requestDeviceTransfer(staffName) {
    if (!staffName) return { ok: false, message: 'Staff name required.' };
    const tenantSlug = safeStorage.getItem('active_tenant_slug') || safeStorage.getItem('attendance_tenant_slug') || 'default';
    const deviceId = getDeviceId();
    return callBackend({
        mode: 'request-device-transfer',
        staffName: staffName,
        tenantSlug: tenantSlug,
        deviceId: deviceId
    });
}

/**
 * Password strength and entropy validator.
 * Enforces >= 8 characters, at least 3 character classes,
 * and rejects common weak dictionary passwords and repetitive patterns.
 */
function validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
        return { ok: false, message: 'Password is required.' };
    }
    if (password.length < 8) {
        return { ok: false, message: 'Password must be at least 8 characters long.' };
    }
    if (password.length > 128) {
        return { ok: false, message: 'Password cannot exceed 128 characters.' };
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

    if (varietyCount < 3) {
        return {
            ok: false,
            message: 'Password must include at least 3 of: uppercase letters, lowercase letters, numbers, and special symbols.'
        };
    }

    const commonWeakPatterns = [
        'password', '12345678', '123456789', 'admin123', 'admin2024', 'admin2025', 'admin2026',
        'qwertyui', 'qwertyuiop', 'perimetrr', 'welcome1', 'letmein1'
    ];
    const lowerPass = password.toLowerCase();
    for (const weak of commonWeakPatterns) {
        if (lowerPass.includes(weak)) {
            return { ok: false, message: 'Password contains common easily guessed words or sequences.' };
        }
    }

    // Check for repetitive characters (e.g. "aaaa" or "1111")
    if (/(.)\1{3,}/.test(password)) {
        return { ok: false, message: 'Password cannot contain 4 or more repeated identical characters.' };
    }

    return { ok: true, message: 'Strong password verified.' };
}

/**
 * Validates email format for admin communications and Supabase Auth.
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

if (typeof window !== 'undefined') {
    window.validatePasswordStrength = validatePasswordStrength;
    window.isValidEmail = isValidEmail;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports.validatePasswordStrength = validatePasswordStrength;
    module.exports.isValidEmail = isValidEmail;
}
