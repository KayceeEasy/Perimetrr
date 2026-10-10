function initOnboardModalDismissals() {
    const modals = [
        { id: 'email-verify-modal', closeFn: closeEmailVerifyModal },
        { id: 'qr-modal', closeFn: closeQrModal }
    ];

    modals.forEach(({ id, closeFn }) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', (e) => {
            if (e.target === el) closeFn();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modals.forEach(({ id, closeFn }) => {
                const el = document.getElementById(id);
                if (el && el.style.display !== 'none' && el.style.display !== '') {
                    closeFn();
                }
            });
        }
    });
}

let currentStep = 1;
let uploadedLogoBase64 = "";

function initOnboardThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;
    const savedTheme = localStorage.getItem('attendance_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = themeBtn.querySelector('i');
    if (icon) {
        icon.setAttribute('data-lucide', savedTheme === 'dark' ? 'sun' : 'moon');
    }

    themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('attendance_theme', nextTheme);
        const iconEl = themeBtn.querySelector('i');
        if (iconEl) {
            iconEl.setAttribute('data-lucide', nextTheme === 'dark' ? 'sun' : 'moon');
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initOnboardThemeToggle();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }

    const companyNameInput = document.getElementById('company-name');
    const shortNameInput = document.getElementById('company-short-name');

    if (companyNameInput && shortNameInput) {
        companyNameInput.addEventListener('input', () => {
            if (!shortNameInput.dataset.touched) {
                const words = companyNameInput.value.trim().split(/\s+/);
                const firstWord = words[0] || '';
                shortNameInput.value = firstWord.substring(0, 16);
            }
        });

        shortNameInput.addEventListener('input', () => {
            shortNameInput.dataset.touched = "true";
        });
    }

    const adminEmailInput = document.getElementById('admin-email');
    if (adminEmailInput) {
        adminEmailInput.addEventListener('input', () => {
            validateEmailRealtime(adminEmailInput.value);
        });
    }

    const adminPassInput = document.getElementById('admin-pass');
    if (adminPassInput) {
        adminPassInput.addEventListener('input', () => {
            updatePasswordStrength(adminPassInput.value);
        });
    }

    // Color picker sync
    const colorInput = document.getElementById('brand-color');
    const colorDisplay = document.getElementById('color-code-display');
    if (colorInput && colorDisplay) {
        colorInput.addEventListener('input', () => {
            colorDisplay.textContent = colorInput.value;
        });
    }

    // Radius slider sync
    const radiusSlider = document.getElementById('geofence-radius');
    const radiusDisplay = document.getElementById('radius-display');
    if (radiusSlider && radiusDisplay) {
        radiusSlider.addEventListener('input', () => {
            radiusDisplay.textContent = `${radiusSlider.value} meters`;
        });
    }

    // Logo dropzone setup
    setupLogoDropzone();
    initOnboardModalDismissals();
});

function setupLogoDropzone() {
    const dropzone = document.getElementById('logo-dropzone');
    const fileInput = document.getElementById('logo-file-input');
    const emptyState = document.getElementById('dropzone-empty');
    const previewState = document.getElementById('dropzone-preview');
    const previewImg = document.getElementById('logo-preview-img');
    const filenameLabel = document.getElementById('logo-filename');
    const removeBtn = document.getElementById('remove-logo-btn');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', (e) => {
        if (e.target !== removeBtn) fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            uploadedLogoBase64 = '';
            previewImg.src = '';
            previewState.style.display = 'none';
            emptyState.style.display = 'block';
        });
    }

    function handleFile(file) {
        if (!file.type.match(/image\/(png|jpeg|svg\+xml)/)) {
            showToast('Please upload a PNG, JPG, or SVG image.', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast('Logo file size must be less than 2MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedLogoBase64 = e.target.result;
            previewImg.src = uploadedLogoBase64;
            filenameLabel.textContent = file.name;
            emptyState.style.display = 'none';
            previewState.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }
}

function detectCurrentLocation() {
    const gpsStatus = document.getElementById('gps-status');
    const latInput = document.getElementById('office-lat');
    const lonInput = document.getElementById('office-lon');

    if (!navigator.geolocation) {
        gpsStatus.textContent = 'Geolocation is not supported by your browser.';
        gpsStatus.style.color = '#dc2626';
        return;
    }

    gpsStatus.textContent = 'Detecting current coordinates...';
    gpsStatus.style.color = 'var(--text-muted)';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lon = pos.coords.longitude.toFixed(6);
            latInput.value = lat;
            lonInput.value = lon;
            gpsStatus.textContent = `Successfully captured: Lat ${lat}, Lon ${lon} (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`;
            gpsStatus.style.color = 'var(--success)';
        },
        (err) => {
            gpsStatus.textContent = `Could not get location: ${err.message}. Please enter coordinates manually.`;
            gpsStatus.style.color = '#dc2626';
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
let isEmailValid = false;
let currentStaffJoinUrl = '';
let currentWorkspaceCode = '';

function validateEmailRealtime(email) {
    const msgEl = document.getElementById('email-validation-msg');
    if (!msgEl) return;
    const clean = String(email || '').trim();
    if (!clean) {
        msgEl.style.display = 'none';
        isEmailValid = false;
        return;
    }
    if (EMAIL_REGEX.test(clean)) {
        msgEl.className = 'email-status valid';
        msgEl.textContent = 'Valid business email format.';
        msgEl.style.display = 'block';
        isEmailValid = true;
    } else {
        msgEl.className = 'email-status invalid';
        msgEl.textContent = 'Please enter a valid work email address (e.g. name@company.com).';
        msgEl.style.display = 'block';
        isEmailValid = false;
    }
}

function updatePasswordStrength(pass) {
    const wrap = document.getElementById('password-strength-wrap');
    const bar = document.getElementById('password-strength-bar');
    const label = document.getElementById('password-strength-label');
    if (!wrap || !bar || !label) return;

    if (!pass) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'block';
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) {
        bar.style.width = '33%';
        bar.style.background = '#ef4444';
        label.textContent = 'Password strength: Weak (min 6 characters, mix letters & numbers)';
        label.style.color = '#ef4444';
    } else if (score <= 4) {
        bar.style.width = '66%';
        bar.style.background = '#f59e0b';
        label.textContent = 'Password strength: Good';
        label.style.color = '#f59e0b';
    } else {
        bar.style.width = '100%';
        bar.style.background = '#10b981';
        label.textContent = 'Password strength: Strong';
        label.style.color = '#10b981';
    }
}

function goToStep(step) {
    // Validate current step before advancing
    if (step > currentStep) {
        if (currentStep === 1) {
            const name = document.getElementById('company-name').value.trim();
            const shortName = document.getElementById('company-short-name').value.trim();
            if (name.length < 2 || name.length > 128) { showToast('Company name must be 2–128 characters.', 'warning'); return; }
            if (!shortName || shortName.length < 2) { showToast('Please enter a Company Short Name (at least 2 characters).', 'warning'); return; }
        } else if (currentStep === 2) {
            const office = document.getElementById('office-name').value.trim();
            const lat = document.getElementById('office-lat').value;
            const lon = document.getElementById('office-lon').value;
            if (office.length < 2 || office.length > 128) { showToast('Office name must be 2–128 characters.', 'warning'); return; }
            if (lat === '' || !Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90) { showToast('Please provide a valid Latitude coordinate.', 'warning'); return; }
            if (lon === '' || !Number.isFinite(Number(lon)) || Number(lon) < -180 || Number(lon) > 180) { showToast('Please provide a valid Longitude coordinate.', 'warning'); return; }
        } else if (currentStep === 3) {
            const adminEmail = document.getElementById('admin-email').value.trim();
            const adminPass = document.getElementById('admin-pass').value;
            if (!EMAIL_REGEX.test(adminEmail)) {
                showToast('Please enter a valid work email address before continuing.', 'warning');
                return;
            }
            if (!validatePasswordStrength(adminPass).ok) {
                showToast(validatePasswordStrength(adminPass).message, 'warning');
                return;
            }
        }
    }

    // Toggle sections
    document.querySelectorAll('.step-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(`step-${step}`);
    if (target) target.classList.add('active');

    // Update stepper indicators
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`step-indicator-${i}`);
        if (!indicator) continue;
        if (i < step) {
            indicator.classList.remove('active');
            indicator.classList.add('completed');
        } else if (i === step) {
            indicator.classList.add('active');
            indicator.classList.remove('completed');
        } else {
            indicator.classList.remove('active', 'completed');
        }
    }

    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

async function submitTenantOnboarding() {
    const agreement = document.getElementById('onboard-terms');
    if (!agreement?.checked) { agreement?.focus(); showToast('Please read the policies and confirm your authority to create this workspace.', 'warning'); return; }
    const submitBtn = document.getElementById('submit-onboard-btn');
    const adminName = document.getElementById('admin-name').value.trim();
    const adminEmail = document.getElementById('admin-email').value.trim();
    const adminPass = document.getElementById('admin-pass').value;
    const companyName = document.getElementById('company-name').value.trim();
    const shortName = document.getElementById('company-short-name').value.trim();

    if (!companyName) { showToast('Please provide the Company Legal Name.', 'warning'); return; }
    if (!shortName) { showToast('Please provide a Company Short Name.', 'warning'); return; }
    if (!adminName) { showToast('Please provide your full name.', 'warning'); return; }
    if (!adminEmail || !EMAIL_REGEX.test(adminEmail)) { showToast('Please provide a valid work email address.', 'warning'); return; }
    if (!validatePasswordStrength(adminPass).ok) { showToast(validatePasswordStrength(adminPass).message, 'warning'); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Setting up your workspace...';

    const workspaceCode = typeof generateWorkspaceCode === 'function' ? generateWorkspaceCode(shortName || companyName) : (shortName.substring(0, 4).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000));

    const tenantPayload = {
        name: companyName,
        short_name: shortName,
        workspace_code: workspaceCode,
        logo_url: uploadedLogoBase64,
        brand_color: document.getElementById('brand-color').value,
        office_name: document.getElementById('office-name').value.trim(),
        latitude: parseFloat(document.getElementById('office-lat').value),
        longitude: parseFloat(document.getElementById('office-lon').value),
        radius: parseInt(document.getElementById('geofence-radius').value, 10),
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPass,
        plan_tier: document.getElementById('plan-tier').value,
        status: 'active'
    };

    pendingTenantPayload = tenantPayload;
    await executeFinalOnboarding(tenantPayload);
}

let pendingTenantPayload = null;
let activeEmailOtp = '';
let isEmailVerified = false;

function openEmailVerifyModal(email) {
    const modal = document.getElementById('email-verify-modal');
    const target = document.getElementById('verify-email-target');
    const input = document.getElementById('email-otp-input');
    const err = document.getElementById('otp-error-msg');
    const hint = document.getElementById('otp-hint-msg');
    const btn = document.getElementById('btn-confirm-otp');
    if (!modal) return;

    if (target) target.textContent = email;
    if (input) { input.value = ''; input.focus(); }
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    if (hint) { hint.textContent = 'Check your inbox for the 6-digit confirmation code from Perimetrr.'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Verify & Launch Workspace'; }
    modal.style.display = 'flex';
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
}

function closeEmailVerifyModal() {
    const modal = document.getElementById('email-verify-modal');
    if (modal) modal.style.display = 'none';
    const submitBtn = document.getElementById('submit-onboard-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="rocket" size="16"></i> Complete Setup & Launch Workspace';
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    }
}

async function confirmEmailOtp() {
    const input = document.getElementById('email-otp-input');
    const err = document.getElementById('otp-error-msg');
    const btn = document.getElementById('btn-confirm-otp');
    const entered = (input?.value || '').trim();

    if (!entered || entered.length < 6) {
        if (err) { err.style.display = 'block'; err.textContent = 'Please enter the 6-digit verification code.'; }
        return;
    }

    if (!pendingTenantPayload || !pendingTenantPayload.admin_email) {
        if (err) { err.style.display = 'block'; err.textContent = 'Session expired. Please restart workspace setup.'; }
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }
    if (err) err.style.display = 'none';

    try {
        if (!supabaseClient) throw new Error('Secure account service is unavailable.');

        let verifyRes = await supabaseClient.auth.verifyOtp({
            email: pendingTenantPayload.admin_email,
            token: entered,
            type: 'signup'
        });

        if (verifyRes.error) {
            verifyRes = await supabaseClient.auth.verifyOtp({
                email: pendingTenantPayload.admin_email,
                token: entered,
                type: 'email'
            });
        }

        if (verifyRes.error) throw verifyRes.error;

        isEmailVerified = true;
        closeEmailVerifyModal();
        await finalizeWorkspaceCreation(pendingTenantPayload);
    } catch (verifyErr) {
        console.warn('OTP verification error:', verifyErr);
        if (btn) { btn.disabled = false; btn.textContent = 'Verify & Launch Workspace'; }
        if (err) {
            err.style.display = 'block';
            err.textContent = verifyErr.message || 'Invalid or expired confirmation code. Please check your inbox and try again.';
        }
    }
}

async function executeFinalOnboarding(tenantPayload) {
    pendingTenantPayload = tenantPayload;
    const submitBtn = document.getElementById('submit-onboard-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader" size="16" class="spin"></i> Creating Administrator Account...';
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    }

    try {
        if (!supabaseClient) throw new Error('Secure account service is unavailable. Please try again shortly.');
        const {data:currentUser} = await supabaseClient.auth.getUser();
        if (currentUser?.user) {
            if (currentUser.user.email?.toLowerCase() !== tenantPayload.admin_email.toLowerCase()) throw new Error('Sign out of the current account before registering another administrator.');
            delete tenantPayload.admin_password;
            await finalizeWorkspaceCreation(tenantPayload);
            return;
        }
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: tenantPayload.admin_email,
            password: tenantPayload.admin_password,
            options: { data: { full_name: tenantPayload.admin_name } }
        });
        if (authError) throw authError;
        delete tenantPayload.admin_password;

        if (!authData?.session) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="rocket" size="16"></i> Complete Setup & Launch Workspace';
                if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
            }
            openEmailVerifyModal(tenantPayload.admin_email);
            return;
        }

        await finalizeWorkspaceCreation(tenantPayload);
    } catch (e) {
        console.error('Onboard error:', e);
        showToast(e.message || 'An error occurred during account registration.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="rocket" size="16"></i> Complete Setup & Launch Workspace';
            if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        }
    }
}

async function finalizeWorkspaceCreation(tenantPayload) {
    const submitBtn = document.getElementById('submit-onboard-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader" size="16" class="spin"></i> Provisioning Workspace Vault...';
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    }

    try {
        const { data: tenantRows, error: workspaceError } = await supabaseClient.rpc('create_workspace', {
            p_name: tenantPayload.name,
            p_slug: tenantPayload.workspace_code.toLowerCase(),
            p_workspace_code: tenantPayload.workspace_code,
            p_brand_color: tenantPayload.brand_color,
            p_logo_url: tenantPayload.logo_url || '',
            p_office_name: tenantPayload.office_name,
            p_latitude: tenantPayload.latitude,
            p_longitude: tenantPayload.longitude,
            p_radius_meters: tenantPayload.radius,
            p_plan_tier: 'free',
            p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos'
        });
        if (workspaceError) throw workspaceError;

        const row = Array.isArray(tenantRows) ? tenantRows[0] : tenantRows;
        if (row) {
            if (tenantPayload.short_name) {
                const {error} = await supabaseClient.rpc('update_workspace_short_name', {p_tenant_id:row.id,p_short_name:tenantPayload.short_name});
                if (error) showToast('Workspace created. Your short name could not be saved; update it later in Command Center.', 'warning');
                else row.short_name = tenantPayload.short_name;
            }
            try { safeStorage.setItem('active_tenant', JSON.stringify(row)); } catch (e) {}
            delete tenantPayload.admin_password;
            const actualTenant = {...tenantPayload, ...row};
            pendingTenantPayload = null;
            showSuccessScreen(actualTenant);
        } else {
            throw new Error('Failed to provision workspace.');
        }
    } catch (err) {
        console.error('Workspace provisioning error:', err);
        showToast(err.message || 'Failed to provision workspace database records.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="rocket" size="16"></i> Complete Setup & Launch Workspace';
            if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        }
    }
}

function togglePasswordVisibility() {
    const passInput = document.getElementById('admin-pass');
    const toggleBtn = document.getElementById('toggle-pass-btn');
    if (!passInput || !toggleBtn) return;
    if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleBtn.innerHTML = '<i data-lucide="eye-off" size="16"></i>';
    } else {
        passInput.type = 'password';
        toggleBtn.innerHTML = '<i data-lucide="eye" size="16"></i>';
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

function showSuccessScreen(tenant) {
    // Shared invitations must never inherit an ephemeral hosting preview address.
    const origin = 'https://perimetrr.com';
    const basePath = '';

    const code = tenant.workspace_code;
    if (!code) { showToast('Workspace pairing code is unavailable. Please contact support.', 'error'); return; }
    const staffJoinUrl = `${origin}${basePath}/?join=${encodeURIComponent(code)}`;
    const adminUrl = `${origin}${basePath}/command-center/?tenant=${encodeURIComponent(tenant.slug || code.toLowerCase())}`;
    const hybridUrl = `${origin}${basePath}/hybrid/?tenant=${encodeURIComponent(tenant.slug || code.toLowerCase())}`;

    currentStaffJoinUrl = staffJoinUrl;
    currentWorkspaceCode = code;

    document.getElementById('success-company-sub').textContent = 
        `${tenant.name} (${tenant.short_name || code}) is ready on the ${tenant.plan_tier || 'free'} plan. Perimeter bound to ${tenant.office_name} (${tenant.radius || 100}m radius).`;

    const displayCodeEl = document.getElementById('display-workspace-code');
    if (displayCodeEl) displayCodeEl.textContent = code;

    document.getElementById('link-staff-url').textContent = staffJoinUrl;
    document.getElementById('link-admin-url').textContent = adminUrl;
    document.getElementById('link-hybrid-url').textContent = hybridUrl;

    document.getElementById('btn-open-staff').href = staffJoinUrl;
    document.getElementById('btn-open-admin').href = adminUrl;
    document.getElementById('btn-open-hybrid').href = hybridUrl;

    const primaryAdminBtn = document.getElementById('btn-primary-launch-admin');
    if (primaryAdminBtn) primaryAdminBtn.href = adminUrl;
    const secondaryPortalBtn = document.getElementById('btn-secondary-launch-portal');
    if (secondaryPortalBtn) secondaryPortalBtn.href = staffJoinUrl;

    goToStep(4);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

async function openQrModal() {
    const modal = document.getElementById('qr-modal');
    const qrImg = document.getElementById('qr-image');
    const qrCodeDisplay = document.getElementById('qr-modal-code');

    if (!currentStaffJoinUrl) return;

    qrImg.removeAttribute('src');
    qrImg.hidden = true;
    if (qrCodeDisplay) qrCodeDisplay.textContent = currentWorkspaceCode;

    modal.style.display = 'flex';
    try {
        const image = await getWorkspaceQrDataUrl(currentStaffJoinUrl);
        if (modal.style.display === 'flex') { qrImg.src = image; qrImg.hidden = false; }
    } catch (error) { showToast(error.message, 'error'); }
}

function closeQrModal() {
    const modal = document.getElementById('qr-modal');
    modal.style.display = 'none';
}

function copyLink(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const textToCopy = el.textContent || el.value;

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy. Please copy manually.', 'error');
    });
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.onboard-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `onboard-toast ${type}`;
    toast.textContent = message;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'success' ? '#10b981' : '#1e293b',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '0.88rem',
        fontWeight: '600',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        zIndex: '999999',
        textAlign: 'center',
        maxWidth: '90%',
        animation: 'slideUp 0.3s ease-out'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


async function saveOnboardQr() {
    const image = document.getElementById('qr-image');
    if (!image?.src?.startsWith('data:image/png')) { showToast('QR image is still loading. Try again shortly.', 'warning'); return; }
    const link = document.createElement('a'); link.href = image.src; link.download = `perimetrr-workspace-${currentWorkspaceCode}.png`; link.click();
}
async function shareOnboardQr() {
    try {
        const image = document.getElementById('qr-image');
        const data = {title:'Join our Perimetrr workspace',text:`Workspace code ${currentWorkspaceCode}`,url:currentStaffJoinUrl};
        if (navigator.share) {
            if (image?.src?.startsWith('data:image/png')) {
                const file = new File([await (await fetch(image.src)).blob()], `perimetrr-workspace-${currentWorkspaceCode}.png`, {type:'image/png'});
                if (navigator.canShare?.({files:[file]})) return await navigator.share({...data,files:[file]});
            }
            return await navigator.share(data);
        }
        await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
        showToast('Workspace invitation copied.', 'success');
    } catch (error) { if (error.name !== 'AbortError') showToast('Could not share. Copy the workspace link from the setup page.', 'error'); }
}
