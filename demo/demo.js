/* Isolated sample dashboard: no network calls, auth bypasses or persistent writes. */
(function () {
    'use strict';
    const staff = getDemoStaff();
    let records, pending;
    const person = document.getElementById('demo-person-filter');
    const status = document.getElementById('demo-status-filter');
    const labels = { ON_TIME: 'On time', LATE: 'Late', OUT: 'Signed out', provisional_transfer: 'Provisional', rejected: 'Unverified · transfer rejected' };
    for (const member of staff) {
        const tile = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = member.name;
        const detail = document.createElement('span'); detail.textContent = member.dept + (member.is_team_lead ? ' · Team Lead' : '');
        tile.append(name, detail); document.getElementById('demo-staff').append(tile);
        const option = document.createElement('option'); option.value = member.name; option.textContent = member.name; person.append(option);
    }
    function visible() { return records.filter(row => (!person.value || row.name === person.value) && (!status.value || row.status === status.value)); }
    function render() {
        const rows = visible(); const body = document.getElementById('demo-records'); body.replaceChildren();
        for (const row of rows) {
            const tr = document.createElement('tr');
            for (const value of [row.name, row.dept, row.date, row.time, row.action, labels[row.status] || row.status]) {
                const td = document.createElement('td'); td.textContent = value; tr.append(td);
            }
            body.append(tr);
        }
        document.getElementById('demo-empty').hidden = rows.length > 0;
        document.getElementById('demo-record-count').textContent = String(rows.length);
        document.getElementById('demo-pending-count').textContent = pending ? '1' : '0';
        document.getElementById('demo-approve').disabled = !pending;
        document.getElementById('demo-reject').disabled = !pending;
        document.getElementById('demo-export').disabled = !rows.length;
    }
    function reset() {
        records = generateMockLogs(); pending = true; person.value = ''; status.value = '';
        records.unshift({ name: 'Morgan Chen', dept: 'Growth & Sales', date: new Date().toISOString().slice(0,10), time: '09:05', action: 'IN', status: 'provisional_transfer', verified: false, request_id: 'demo-transfer-1' });
        document.getElementById('demo-message').textContent = 'Sample transfer pending. Try approving or rejecting it.'; render();
    }
    function resolve(approve) {
        if (!pending) return;
        for (const row of records) if (row.request_id === 'demo-transfer-1' && row.status === 'provisional_transfer') {
            row.original_status = row.status; row.status = approve ? 'ON_TIME' : 'rejected'; row.verified = approve;
        }
        pending = false;
        document.getElementById('demo-message').textContent = approve ? 'Demo transfer approved. Its provisional record is now verified; original status remains in sample audit data.' : 'Demo transfer rejected. Its record remains unverified.';
        render();
    }
    person.addEventListener('change', render); status.addEventListener('change', render);
    document.getElementById('demo-approve').addEventListener('click', () => resolve(true));
    document.getElementById('demo-reject').addEventListener('click', () => resolve(false));
    document.getElementById('demo-reset').addEventListener('click', reset);
    document.getElementById('demo-export').addEventListener('click', () => {
        const cell = value => '"' + String(value).replace(/"/g, '""') + '"';
        const csv = [['Staff', 'Department', 'Date', 'Time', 'Action', 'Status'], ...visible().map(row => [row.name, row.dept, row.date, row.time, row.action, labels[row.status] || row.status])].map(row => row.map(cell).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = 'perimetrr-demo-attendance.csv'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    reset();
})();
