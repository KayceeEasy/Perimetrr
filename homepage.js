/* Illustrative controls only: no geolocation or attendance backend requests. */
(function () {
    'use strict';
    const slider = document.getElementById('playground-distance');
    const linked = document.getElementById('playground-linked');
    if (!slider || !linked) return;
    function update() {
        const distance = Number(slider.value);
        const inside = distance <= 150;
        document.getElementById('playground-distance-value').textContent = `${distance} m from office`;
        document.getElementById('playground-person').setAttribute('transform', `translate(${120 + distance * .5} 100)`);
        document.getElementById('playground-result').textContent = !linked.checked
            ? 'Browser not paired → link your staff profile before check-in.'
            : inside ? 'Inside Perimeter + paired browser → eligible for check-in.'
                : 'Outside Perimeter → on-site check-in is blocked. Move closer to the office.';
        document.querySelector('.perimeter-playground').dataset.state = inside && linked.checked ? 'eligible' : 'blocked';
    }
    slider.addEventListener('input', update);
    linked.addEventListener('change', update);
    update();
})();
