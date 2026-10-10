(function () {
    'use strict';
    const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
    const form = document.getElementById('billing-options');
    function render() {
        const interval = form.querySelector('input[name="interval"]:checked').value;
        for (const link of document.querySelectorAll('[data-start-plan]')) {
            const target = new URL(link.getAttribute('href'), location.href);
            target.searchParams.set('billing', interval);
            link.setAttribute('href', target.pathname + target.search);
        }
        for (const card of document.querySelectorAll('[data-plan]')) {
            const plan = card.dataset.plan;
            const quote = PerimetrrPricing.quote(plan, interval);
            card.querySelector('[data-total]').textContent = money(quote.totalCents);
            card.querySelector('[data-period]').textContent = interval === 'annual' ? '/year' : '/month';
            card.querySelector('[data-equivalent]').textContent = interval === 'annual'
                ? `${money(quote.monthlyEquivalentCents)}/month equivalent. ${money(quote.totalCents)} billed annually.`
                : `${money(quote.totalCents)} billed monthly.`;
            card.querySelector('[data-savings]').textContent = interval === 'annual'
                ? `Save ${money(quote.annualSavingsCents)} per year — 2 months free.`
                : 'Switch to annual billing for 2 months free.';
        }
        document.getElementById('billing-status').textContent = interval === 'annual'
            ? 'Annual billing selected. Full yearly prices are shown.'
            : 'Monthly billing selected. Prices are per month.';
    }
    form.addEventListener('change', render);
    render();
})();
