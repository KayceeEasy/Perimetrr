/* Progressive password UI; existing server authentication remains authoritative. */
document.addEventListener('DOMContentLoaded', () => {
    for (const input of document.querySelectorAll('input[data-password-ui]')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'password-field';
        input.before(wrapper);
        wrapper.append(input);
        const toggle = document.createElement('button');
        toggle.type = 'button'; toggle.className = 'secondary password-toggle';
        toggle.textContent = 'Show'; toggle.setAttribute('aria-label', 'Show password');
        toggle.setAttribute('aria-controls', input.id); toggle.setAttribute('aria-pressed', 'false');
        wrapper.append(toggle);
        toggle.addEventListener('click', () => {
            const reveal = input.type === 'password';
            input.type = reveal ? 'text' : 'password';
            toggle.textContent = reveal ? 'Hide' : 'Show';
            toggle.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
            toggle.setAttribute('aria-pressed', String(reveal));
        });
        if (!input.hasAttribute('data-password-strength')) continue;
        const feedback = document.createElement('p');
        feedback.className = 'password-feedback muted'; feedback.id = input.id + '-requirements';
        feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
        input.setAttribute('aria-describedby', feedback.id); wrapper.after(feedback);
        const update = () => {
            const value = input.value;
            const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(pattern => pattern.test(value)).length;
            if (!value) { feedback.textContent = 'For a new password: 8–128 characters; use at least 3 of uppercase, lowercase, numbers and symbols. Avoid common words and repeated characters.'; return; }
            const result = validatePasswordStrength(value);
            const requirements = [];
            if (value.length < 8) requirements.push(`${8 - value.length} more character${8 - value.length === 1 ? '' : 's'}`);
            if (value.length > 128) requirements.push('reduce to 128 characters');
            if (classes < 3) requirements.push(`${3 - classes} more character type${3 - classes === 1 ? '' : 's'}`);
            feedback.textContent = result.ok ? 'New-password requirements met.'
                : requirements.length ? 'Still needed: ' + requirements.join(' and ') + '.' : result.message;
            feedback.dataset.valid = String(result.ok);
        };
        input.addEventListener('input', update); update();
    }
});
