/* Public display prices only. Never use browser values to authorize a purchase. */
(function (scope) {
    'use strict';
    const plans = Object.freeze({
        free: Object.freeze({ monthlyCents: 0, annualCents: 0, staff: 5, workspaces: 1 }),
        team: Object.freeze({ monthlyCents: 995, annualCents: 9950, staff: 30, workspaces: 1 }),
        enterprise: Object.freeze({ monthlyCents: 2995, annualCents: 29950, staff: 90, workspaces: 3 })
    });
    function quote(plan, interval) {
        if (!Object.hasOwn(plans, plan)) throw new Error('Choose a valid plan.');
        if (!['monthly', 'annual'].includes(interval)) throw new Error('Choose monthly or annual billing.');
        const selected = plans[plan];
        return Object.freeze({
            totalCents: interval === 'annual' ? selected.annualCents : selected.monthlyCents,
            monthlyEquivalentCents: interval === 'annual' ? Math.round(selected.annualCents / 12) : selected.monthlyCents,
            annualSavingsCents: selected.monthlyCents * 12 - selected.annualCents
        });
    }
    const catalog = Object.freeze({ plans, quote });
    if (typeof module !== 'undefined' && module.exports) module.exports = catalog;
    else scope.PerimetrrPricing = catalog;
})(globalThis);
