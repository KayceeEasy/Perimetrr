const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('../pricing/catalog.js');
const root = path.resolve(__dirname, '..');

test('launch prices use integer cents and annual billing gives exactly two months free', () => {
    for (const [plan, monthly, annual] of [['free', 0, 0], ['team', 995, 9950], ['enterprise', 2995, 29950]]) {
        assert.equal(catalog.quote(plan, 'monthly').totalCents, monthly);
        const yearly = catalog.quote(plan, 'annual');
        assert.equal(yearly.totalCents, annual);
        assert.equal(yearly.annualSavingsCents, monthly * 2);
    }
    assert.equal(catalog.quote('team', 'annual').monthlyEquivalentCents, 829);
    assert.equal(catalog.quote('enterprise', 'annual').monthlyEquivalentCents, 2496);
    assert.ok(Object.isFrozen(catalog.plans.team));
    for (const name of ['unknown', '__proto__', 'constructor']) assert.throws(() => catalog.quote(name, 'monthly'));
    assert.throws(() => catalog.quote('team', 'weekly'));
});

test('billing selector updates yearly totals, equivalents and savings and switches back', () => {
    let interval = 'monthly', change;
    const status = { textContent: '' };
    const cards = ['team', 'enterprise'].map(plan => {
        const fields = new Map(['[data-total]', '[data-period]', '[data-equivalent]', '[data-savings]'].map(key => [key, { textContent: '' }]));
        return { dataset: { plan }, fields, querySelector: key => fields.get(key) };
    });
    const form = { querySelector: () => ({ value: interval }), addEventListener: (name, fn) => { assert.equal(name, 'change'); change = fn; } };
    const context = { Intl, PerimetrrPricing: catalog, document: {
        getElementById: id => id === 'billing-options' ? form : status,
        querySelectorAll: selector => selector === '[data-plan]' ? cards : []
    } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'pricing/pricing.js'), 'utf8'), context);
    assert.equal(cards[0].fields.get('[data-total]').textContent, '$9.95');
    interval = 'annual'; change();
    assert.equal(cards[0].fields.get('[data-total]').textContent, '$99.50');
    assert.match(cards[0].fields.get('[data-equivalent]').textContent, /\$8\.29\/month.*\$99\.50 billed annually/);
    assert.equal(cards[1].fields.get('[data-total]').textContent, '$299.50');
    assert.match(cards[1].fields.get('[data-savings]').textContent, /\$59\.90/);
    assert.match(status.textContent, /Annual/);
    interval = 'monthly'; change();
    assert.equal(cards[1].fields.get('[data-total]').textContent, '$29.95');
    assert.equal(cards[0].fields.get('[data-period]').textContent, '/month');
});

test('pricing is published with honest payment status and no browser payment authorization', async () => {
    const { publicFiles } = require('../tools/public-files.cjs');
    assert.ok(publicFiles(root).includes('pricing/index.html'));
    const page = fs.readFileSync(path.join(root, 'pricing/index.html'), 'utf8');
    assert.match(page, /paid subscription starts only after confirmed payment/);
    assert.match(page, /actual charge currency and total before you confirm payment/);
    assert.doesNotMatch(page, /not open yet|being prepared|not published yet/);
    assert.match(page, /<noscript>/);
    assert.doesNotMatch(page, /Most popular|Buy now|>Start (?:a |your )?(?:free |paid )?trial</i);
    const { createPreviewServer } = require('../tools/serve.cjs');
    const server = createPreviewServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const origin = `http://127.0.0.1:${server.address().port}`;
        for (const route of ['/pricing/', '/pricing/style.css', '/pricing/catalog.js', '/pricing/pricing.js', '/onboard/', '/enterprise/']) {
            assert.equal((await fetch(origin + route)).status, 200, route);
        }
    } finally { await new Promise(resolve => server.close(resolve)); }
});
