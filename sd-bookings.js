/* ────────────────────────────────────────────────────────────────
   Sweet Dreams RV — shared booking data access.
   Backed by the real API now (GET /api/bookings/availability, GET
   /api/bookings, GET /api/overrides), not localStorage. SEED stays defined
   below purely as a local-dev/Playwright fixture — it is never merged into
   the production data path, which reads only from the API.
   ──────────────────────────────────────────────────────────────── */
(function () {
  var WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var TRAILER_NAMES = {
    charlie: 'Charlie', ella: 'Ella', virginia: 'Virginia', marylou: 'Mary Lou',
    jerry: 'Jerry', patricia: 'Patricia', nola: 'Nola', billybob: 'Billy Bob',
  };

  // Demo booking seed. start = day offset from "today" (day 0 = today, PST).
  // Local-dev/Playwright fixture only — see the file comment above.
  var SEED = [
    { id: 'p70', trailer: 'patricia', start: -11, nights: 2, guest: 'Marcus Okafor', phone: '(406) 555-0158', site: 'Emigrant Lake · #8', total: 433, type: 'returned', source: 'phone', pay: { status: 'Paid in full', method: 'Card by phone' } },
    { id: 'p72', trailer: 'charlie', start: -11, nights: 6, guest: 'Big Sky club', phone: '(503) 555-0143', site: 'Indian Mary Park · #30', total: 989, type: 'returned', source: 'phone', pay: { status: 'Paid in full', method: 'Check' } },
    { id: 'p71', trailer: 'billybob', start: -7, nights: 5, guest: 'Summit getaway', phone: '(503) 555-0166', site: 'Joseph H. Stewart SP', total: 940, type: 'returned', source: 'phone', pay: { status: 'Paid in full', method: 'Check' } },
    { id: 'b36', trailer: 'marylou', start: -6, nights: 4, guest: 'Willow Creek trip', phone: '(541) 555-0175', site: 'Indian Mary Park · #42', total: 731, type: 'returned', source: 'web', email: 'willow.creek.tri@icloud.com', plan: 'full', paidToday: 731, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'p81', trailer: 'jerry', start: -6, nights: 4, guest: 'Harbor getaway', phone: '(406) 555-0126', site: 'Valley of the Rogue SP · #7', total: 771, type: 'returned', source: 'phone', pay: { status: 'Paid in full', method: 'E-transfer' } },
    { id: 'ub90', trailer: 'ella', start: 1, nights: 1, guest: 'Maintenance', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'b45', trailer: 'marylou', start: 4, nights: 6, guest: 'Elena Nguyen', phone: '(458) 555-0166', site: 'Indian Mary Park · #30', total: 1049, type: 'confirmed', source: 'web', email: 'elena.nguyen@icloud.com', plan: 'full', paidToday: 1049, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'p79', trailer: 'virginia', start: 5, nights: 2, guest: 'Cole & Jordan', phone: '(406) 555-0185', site: 'Diamond Lake RA', total: 413, type: 'confirmed', source: 'phone', pay: { status: 'Deposit taken', method: 'Check' } },
    { id: 'b30', trailer: 'billybob', start: 7, nights: 2, guest: 'Big Sky retreat', phone: '(458) 555-0191', site: 'Valley of the Rogue SP · #12', total: 433, type: 'confirmed', source: 'web', email: 'big.sky.retreat@outlook.com', plan: 'full', paidToday: 433, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'q54', trailer: 'nola', start: 14, nights: 5, guest: 'The Hayes family', phone: '(541) 555-0176', site: 'Rogue Elk Park', total: 940, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Card by phone' } },
    { id: 'p85', trailer: 'charlie', start: 17, nights: 2, guest: 'Reid Sullivan', phone: '(541) 555-0147', site: 'Joseph H. Stewart SP · #22', total: 393, type: 'confirmed', source: 'phone', pay: { status: 'Paid in full', method: 'Cash' } },
    { id: 'r01', trailer: 'marylou', start: 19, nights: 6, guest: 'Priya Lindqvist', phone: '(360) 555-0147', site: 'Valley of the Rogue SP · #12', total: 1049, type: 'confirmed', source: 'web', email: 'priya.lindqvist@gmail.com', plan: 'firstnight', paidToday: 159, deposit: 1000, balanceChargeFailed: true, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b53', trailer: 'billybob', start: 19, nights: 4, guest: 'Liam Novak', phone: '(541) 555-0138', site: 'Indian Mary Park · #42', total: 771, type: 'confirmed', source: 'web', email: 'liam.novak@outlook.com', plan: 'full', paidToday: 771, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'ub97', trailer: 'jerry', start: 20, nights: 3, guest: 'Deep clean', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'b27', trailer: 'virginia', start: 28, nights: 7, guest: 'Diego Frost', phone: '(458) 555-0106', site: 'Almeda Park', total: 1208, type: 'confirmed', source: 'web', email: 'diego.frost@outlook.com', plan: 'full', paidToday: 1208, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'b47', trailer: 'nola', start: 30, nights: 5, guest: 'The Abbott family', phone: '(458) 555-0143', site: 'Lake Selmac · #4', total: 940, type: 'confirmed', source: 'web', email: 'the.abbott.famil@yahoo.com', plan: 'full', paidToday: 940, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'r23', trailer: 'patricia', start: 35, nights: 6, guest: 'Hunter Walker', phone: '(541) 555-0187', site: 'Joseph H. Stewart SP', total: 1109, type: 'confirmed', source: 'web', email: 'hunter.walker@outlook.com', plan: 'firstnight', paidToday: 169, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'r21', trailer: 'marylou', start: 45, nights: 7, guest: 'Big Sky reunion', phone: '(406) 555-0184', site: 'Joseph H. Stewart SP', total: 1208, type: 'confirmed', source: 'web', email: 'big.sky.reunion@icloud.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'p78', trailer: 'nola', start: 45, nights: 2, guest: 'The Brooks family', phone: '(360) 555-0172', site: 'Lake Selmac · #4', total: 433, type: 'confirmed', source: 'phone', pay: { status: 'Deposit taken', method: 'Check' } },
    { id: 'r11', trailer: 'virginia', start: 52, nights: 6, guest: 'Elena Ramirez', phone: '(503) 555-0150', site: 'Ben Hur Lampman RA', total: 1049, type: 'confirmed', source: 'web', email: 'elena.ramirez@yahoo.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b48', trailer: 'patricia', start: 57, nights: 3, guest: 'The Okafor group', phone: '(406) 555-0148', site: 'Indian Mary Park · #30', total: 602, type: 'confirmed', source: 'web', email: 'the.okafor.group@icloud.com', plan: 'full', paidToday: 602, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'r13', trailer: 'jerry', start: 59, nights: 4, guest: 'Harbor party', phone: '(406) 555-0159', site: 'Indian Mary Park · #30', total: 771, type: 'confirmed', source: 'web', email: 'harbor.party@yahoo.com', plan: 'firstnight', paidToday: 169, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b43', trailer: 'nola', start: 61, nights: 7, guest: 'Morgan Foster', phone: '(406) 555-0164', site: 'Schroeder Park · #19', total: 1278, type: 'confirmed', source: 'web', email: 'morgan.foster@yahoo.com', plan: 'full', paidToday: 1278, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'b42', trailer: 'ella', start: 63, nights: 4, guest: 'The Vega crew', phone: '(360) 555-0199', site: 'Casey State RA', total: 731, type: 'confirmed', source: 'web', email: 'the.vega.crew@gmail.com', plan: 'full', paidToday: 731, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'b44', trailer: 'billybob', start: 64, nights: 6, guest: 'Liam Ramirez', phone: '(406) 555-0185', site: 'Whitehorse County Park', total: 1109, type: 'confirmed', source: 'web', email: 'liam.ramirez@outlook.com', plan: 'full', paidToday: 1109, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'ub96', trailer: 'virginia', start: 66, nights: 1, guest: 'Owner use', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'b51', trailer: 'charlie', start: 67, nights: 2, guest: 'Summit crew', phone: '(541) 555-0191', site: 'Diamond Lake RA', total: 393, type: 'confirmed', source: 'web', email: 'summit.crew@yahoo.com', plan: 'full', paidToday: 393, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'p84', trailer: 'marylou', start: 72, nights: 4, guest: 'The Diaz family', phone: '(360) 555-0156', site: 'Valley of the Rogue SP · #14', total: 731, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Cash' } },
    { id: 'b39', trailer: 'virginia', start: 73, nights: 7, guest: 'The Novak family', phone: '(503) 555-0147', site: 'Rogue Elk Park', total: 1208, type: 'confirmed', source: 'web', email: 'the.novak.family@outlook.com', plan: 'full', paidToday: 1208, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'b49', trailer: 'billybob', start: 73, nights: 7, guest: 'Dana Lindqvist', phone: '(458) 555-0103', site: 'Diamond Lake · Crater rim', total: 1278, type: 'confirmed', source: 'web', email: 'dana.lindqvist@outlook.com', plan: 'full', paidToday: 1278, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'b41', trailer: 'ella', start: 74, nights: 3, guest: 'Owen Grant', phone: '(541) 555-0180', site: 'Valley of the Rogue SP · #7', total: 572, type: 'confirmed', source: 'web', email: 'owen.grant@gmail.com', plan: 'full', paidToday: 572, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'p76', trailer: 'charlie', start: 77, nights: 4, guest: 'Jae Brooks', phone: '(541) 555-0108', site: 'Casey State RA', total: 691, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Cash' } },
    { id: 'r17', trailer: 'virginia', start: 83, nights: 7, guest: 'Reid Diaz', phone: '(458) 555-0128', site: 'Valley of the Rogue SP · #14', total: 1208, type: 'confirmed', source: 'web', email: 'reid.diaz@yahoo.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'q63', trailer: 'marylou', start: 84, nights: 5, guest: 'The Doyle family', phone: '(541) 555-0119', site: 'Schroeder Park · #19', total: 890, type: 'pending', source: 'web', email: 'the.doyle.family@yahoo.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'q60', trailer: 'patricia', start: 86, nights: 5, guest: 'The Ortiz family', phone: '(406) 555-0133', site: 'Griffin Park', total: 940, type: 'pending', source: 'web', email: 'the.ortiz.family@icloud.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'p86', trailer: 'nola', start: 86, nights: 6, guest: 'Ruby & Reid', phone: '(503) 555-0163', site: 'Rogue Elk Park', total: 1109, type: 'confirmed', source: 'phone', pay: { status: 'Deposit taken', method: 'E-transfer' } },
    { id: 'r00', trailer: 'marylou', start: 97, nights: 7, guest: 'Theo & Morgan', phone: '(541) 555-0111', site: 'Ben Hur Lampman RA', total: 1208, type: 'confirmed', source: 'web', email: 'theo.morgan@outlook.com', plan: 'firstnight', paidToday: 159, deposit: 1000, balanceChargeFailed: true, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'q57', trailer: 'patricia', start: 104, nights: 5, guest: 'Theo Foster', phone: '(360) 555-0128', site: 'Emigrant Lake · #8', total: 940, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Card by phone' } },
    { id: 'r05', trailer: 'virginia', start: 107, nights: 2, guest: 'Dana Carter', phone: '(503) 555-0195', site: 'Joseph H. Stewart SP', total: 413, type: 'confirmed', source: 'web', email: 'dana.carter@icloud.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b29', trailer: 'nola', start: 112, nights: 4, guest: 'The Quinn family', phone: '(406) 555-0121', site: 'Diamond Lake RA', total: 771, type: 'confirmed', source: 'web', email: 'the.quinn.family@gmail.com', plan: 'full', paidToday: 771, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'p73', trailer: 'marylou', start: 117, nights: 2, guest: 'The Carter family', phone: '(458) 555-0109', site: 'Lake Selmac · #4', total: 413, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Cash' } },
    { id: 'b35', trailer: 'jerry', start: 118, nights: 5, guest: 'The Cole crew', phone: '(541) 555-0129', site: 'Diamond Lake RA', total: 940, type: 'confirmed', source: 'web', email: 'the.cole.crew@outlook.com', plan: 'full', paidToday: 940, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'p80', trailer: 'ella', start: 121, nights: 5, guest: 'The Brooks family', phone: '(406) 555-0154', site: 'Casey State RA', total: 890, type: 'confirmed', source: 'phone', pay: { status: 'Paid in full', method: 'Cash' } },
    { id: 'r22', trailer: 'nola', start: 122, nights: 2, guest: 'Mia Salazar', phone: '(541) 555-0145', site: 'Valley of the Rogue SP · #14', total: 433, type: 'confirmed', source: 'web', email: 'mia.salazar@yahoo.com', plan: 'firstnight', paidToday: 169, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'p89', trailer: 'virginia', start: 123, nights: 3, guest: 'The Ramirez family', phone: '(541) 555-0159', site: 'Whitehorse County Park', total: 572, type: 'confirmed', source: 'phone', pay: { status: 'Deposit taken', method: 'Check' } },
    { id: 'r09', trailer: 'charlie', start: 124, nights: 5, guest: 'Iris & Ava', phone: '(503) 555-0144', site: 'Indian Mary Park · #42', total: 840, type: 'confirmed', source: 'web', email: 'iris.ava@gmail.com', plan: 'firstnight', paidToday: 149, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'ub91', trailer: 'virginia', start: 131, nights: 3, guest: 'Owner use', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'q61', trailer: 'jerry', start: 132, nights: 4, guest: 'Lakeside reunion', phone: '(406) 555-0119', site: 'Emigrant Lake · #8', total: 771, type: 'pending', source: 'web', email: 'lakeside.reunion@outlook.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'r20', trailer: 'jerry', start: 144, nights: 7, guest: 'The Diaz family', phone: '(406) 555-0118', site: 'Valley of the Rogue SP · #7', total: 1278, type: 'confirmed', source: 'web', email: 'the.diaz.family@gmail.com', plan: 'firstnight', paidToday: 169, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'ub98', trailer: 'virginia', start: 144, nights: 2, guest: 'Deep clean', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'q68', trailer: 'nola', start: 147, nights: 3, guest: 'Summit retreat', phone: '(360) 555-0129', site: 'Joseph H. Stewart SP · #22', total: 602, type: 'pending', source: 'web', email: 'summit.retreat@gmail.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'q58', trailer: 'charlie', start: 150, nights: 5, guest: 'Elena Dunn', phone: '(406) 555-0139', site: 'Diamond Lake RA', total: 840, type: 'pending', source: 'web', email: 'elena.dunn@icloud.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'ub95', trailer: 'patricia', start: 150, nights: 3, guest: 'Tire rotation', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'ub93', trailer: 'nola', start: 154, nights: 2, guest: 'Brake inspection', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'q56', trailer: 'ella', start: 159, nights: 4, guest: 'The Quinn family', phone: '(541) 555-0157', site: 'Valley of the Rogue SP · #7', total: 731, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Card by phone' } },
    { id: 'r07', trailer: 'marylou', start: 164, nights: 2, guest: 'Priya Dunn', phone: '(458) 555-0170', site: 'Emigrant Lake · #8', total: 413, type: 'confirmed', source: 'web', email: 'priya.dunn@icloud.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'q65', trailer: 'virginia', start: 165, nights: 6, guest: 'The Ramsey family', phone: '(503) 555-0120', site: 'Ben Hur Lampman RA', total: 1049, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Card by phone' } },
    { id: 'p74', trailer: 'nola', start: 166, nights: 7, guest: 'Harbor club', phone: '(406) 555-0136', site: 'Schroeder Park · #19', total: 1278, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Cash' } },
    { id: 'q67', trailer: 'charlie', start: 173, nights: 3, guest: 'The Grant family', phone: '(360) 555-0124', site: 'Emigrant Lake · #8', total: 542, type: 'pending', source: 'web', email: 'the.grant.family@outlook.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'b46', trailer: 'patricia', start: 179, nights: 6, guest: 'The Cole family', phone: '(458) 555-0138', site: 'Indian Mary Park · #30', total: 1109, type: 'confirmed', source: 'web', email: 'the.cole.family@gmail.com', plan: 'full', paidToday: 1109, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'r25', trailer: 'ella', start: 185, nights: 5, guest: 'Camp Sundance reunion', phone: '(406) 555-0111', site: 'Schroeder Park · #19', total: 890, type: 'confirmed', source: 'web', email: 'camp.sundance.re@gmail.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'r10', trailer: 'marylou', start: 191, nights: 3, guest: 'Big Sky group', phone: '(541) 555-0125', site: 'Ben Hur Lampman RA', total: 572, type: 'confirmed', source: 'web', email: 'big.sky.group@icloud.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'p88', trailer: 'nola', start: 191, nights: 3, guest: 'Jordan Underwood', phone: '(541) 555-0158', site: 'Valley of the Rogue SP · #7', total: 602, type: 'confirmed', source: 'phone', pay: { status: 'Paid in full', method: 'Card by phone' } },
    { id: 'b32', trailer: 'virginia', start: 193, nights: 6, guest: 'The Yamada group', phone: '(541) 555-0190', site: 'Schroeder Park · #19', total: 1049, type: 'confirmed', source: 'web', email: 'the.yamada.group@yahoo.com', plan: 'full', paidToday: 1049, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'r16', trailer: 'jerry', start: 194, nights: 4, guest: 'Dana Grant', phone: '(458) 555-0153', site: 'Casey State RA', total: 771, type: 'confirmed', source: 'web', email: 'dana.grant@gmail.com', plan: 'firstnight', paidToday: 169, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b52', trailer: 'nola', start: 198, nights: 7, guest: 'Iris Calloway', phone: '(360) 555-0185', site: 'Diamond Lake · Crater rim', total: 1278, type: 'confirmed', source: 'web', email: 'iris.calloway@icloud.com', plan: 'full', paidToday: 1278, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'r12', trailer: 'jerry', start: 210, nights: 7, guest: 'Willow & Sofia', phone: '(458) 555-0143', site: 'Schroeder Park · #19', total: 1278, type: 'confirmed', source: 'web', email: 'willow.sofia@outlook.com', plan: 'firstnight', paidToday: 169, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'ub94', trailer: 'marylou', start: 210, nights: 3, guest: 'Repair', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'r02', trailer: 'patricia', start: 220, nights: 2, guest: 'The Barnes family', phone: '(503) 555-0165', site: 'Almeda Park', total: 433, type: 'confirmed', source: 'web', email: 'the.barnes.famil@gmail.com', plan: 'firstnight', paidToday: 169, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b50', trailer: 'jerry', start: 225, nights: 7, guest: 'The Ramirez family', phone: '(503) 555-0151', site: 'Joseph H. Stewart SP', total: 1278, type: 'confirmed', source: 'web', email: 'the.ramirez.fami@yahoo.com', plan: 'full', paidToday: 1278, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'r03', trailer: 'virginia', start: 230, nights: 5, guest: 'The Carter family', phone: '(406) 555-0163', site: 'Schroeder Park · #19', total: 890, type: 'confirmed', source: 'web', email: 'the.carter.famil@yahoo.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'q69', trailer: 'patricia', start: 239, nights: 2, guest: 'Reid Frost', phone: '(541) 555-0112', site: 'Diamond Lake RA', total: 433, type: 'pending', source: 'web', email: 'reid.frost@outlook.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'b26', trailer: 'ella', start: 243, nights: 2, guest: 'Hunter Hayes', phone: '(458) 555-0149', site: 'Diamond Lake · Crater rim', total: 413, type: 'confirmed', source: 'web', email: 'hunter.hayes@icloud.com', plan: 'full', paidToday: 413, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'r06', trailer: 'marylou', start: 244, nights: 6, guest: 'Harbor trip', phone: '(406) 555-0183', site: 'Ben Hur Lampman RA', total: 1049, type: 'confirmed', source: 'web', email: 'harbor.trip@gmail.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b33', trailer: 'billybob', start: 248, nights: 5, guest: 'Ruby Barnes', phone: '(406) 555-0147', site: 'Casey State RA', total: 940, type: 'confirmed', source: 'web', email: 'ruby.barnes@gmail.com', plan: 'full', paidToday: 940, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'r24', trailer: 'virginia', start: 262, nights: 6, guest: 'Harbor crew', phone: '(458) 555-0185', site: 'Almeda Park', total: 1049, type: 'confirmed', source: 'web', email: 'harbor.crew@outlook.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b37', trailer: 'patricia', start: 264, nights: 5, guest: 'Willow Creek trip', phone: '(503) 555-0151', site: 'Diamond Lake · Crater rim', total: 940, type: 'confirmed', source: 'web', email: 'willow.creek.tri@yahoo.com', plan: 'full', paidToday: 940, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'b40', trailer: 'ella', start: 267, nights: 3, guest: 'Nadia Dunn', phone: '(541) 555-0138', site: 'Valley of the Rogue SP · #14', total: 572, type: 'confirmed', source: 'web', email: 'nadia.dunn@yahoo.com', plan: 'full', paidToday: 572, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'r19', trailer: 'marylou', start: 272, nights: 2, guest: 'Rogue Valley party', phone: '(360) 555-0141', site: 'Indian Mary Park · #42', total: 413, type: 'confirmed', source: 'web', email: 'rogue.valley.par@yahoo.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'q64', trailer: 'ella', start: 274, nights: 4, guest: 'Theo Okafor', phone: '(360) 555-0182', site: 'Rogue Elk Park', total: 731, type: 'pending', source: 'web', email: 'theo.okafor@gmail.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'p77', trailer: 'marylou', start: 278, nights: 6, guest: 'Cole Boone', phone: '(360) 555-0162', site: 'Casey State RA', total: 1049, type: 'confirmed', source: 'phone', pay: { status: 'Paid in full', method: 'Card by phone' } },
    { id: 'r08', trailer: 'marylou', start: 290, nights: 6, guest: 'Liam & Iris', phone: '(503) 555-0135', site: 'Lake Selmac · #4', total: 1049, type: 'confirmed', source: 'web', email: 'liam.iris@outlook.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'b28', trailer: 'billybob', start: 298, nights: 3, guest: 'Trailblazers getaway', phone: '(503) 555-0185', site: 'Valley of the Rogue SP · #12', total: 602, type: 'confirmed', source: 'web', email: 'trailblazers.get@outlook.com', plan: 'full', paidToday: 602, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'q62', trailer: 'charlie', start: 305, nights: 4, guest: 'Riverbend trip', phone: '(406) 555-0190', site: 'Ben Hur Lampman RA', total: 691, type: 'pending', source: 'web', email: 'riverbend.trip@icloud.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'p83', trailer: 'jerry', start: 309, nights: 6, guest: 'Trailblazers crew', phone: '(503) 555-0141', site: 'Lake Selmac · #4', total: 1109, type: 'confirmed', source: 'phone', pay: { status: 'Deposit taken', method: 'E-transfer' } },
    { id: 'q59', trailer: 'patricia', start: 313, nights: 3, guest: 'Nadia Perry', phone: '(406) 555-0163', site: 'Emigrant Lake · #8', total: 602, type: 'pending', source: 'web', email: 'nadia.perry@yahoo.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'p87', trailer: 'nola', start: 314, nights: 3, guest: 'Elena Ramirez', phone: '(360) 555-0153', site: 'Valley of the Rogue SP · #12', total: 602, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Cash' } },
    { id: 'b38', trailer: 'charlie', start: 323, nights: 6, guest: 'The Patel crew', phone: '(503) 555-0198', site: 'Emigrant Lake · #8', total: 989, type: 'confirmed', source: 'web', email: 'the.patel.crew@yahoo.com', plan: 'full', paidToday: 989, deposit: 1000, pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'b31', trailer: 'billybob', start: 324, nights: 3, guest: 'The Frost family', phone: '(541) 555-0131', site: 'Rogue Elk Park', total: 602, type: 'confirmed', source: 'web', email: 'the.frost.family@yahoo.com', plan: 'full', paidToday: 602, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'ub99', trailer: 'ella', start: 325, nights: 2, guest: 'Deep clean', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'q66', trailer: 'jerry', start: 327, nights: 4, guest: 'Camp Sundance crew', phone: '(406) 555-0195', site: 'Griffin Park', total: 771, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Card by phone' } },
    { id: 'r18', trailer: 'patricia', start: 329, nights: 2, guest: 'Theo Alvarez', phone: '(458) 555-0139', site: 'Joseph H. Stewart SP · #22', total: 433, type: 'confirmed', source: 'web', email: 'theo.alvarez@icloud.com', plan: 'firstnight', paidToday: 169, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'r04', trailer: 'ella', start: 331, nights: 6, guest: 'Lakeside party', phone: '(503) 555-0168', site: 'Lake Selmac · #4', total: 1049, type: 'confirmed', source: 'web', email: 'lakeside.party@yahoo.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'p75', trailer: 'nola', start: 335, nights: 7, guest: 'Willow Creek club', phone: '(406) 555-0177', site: 'Griffin Park', total: 1278, type: 'pending', source: 'phone', pay: { status: 'Invoice sent', method: 'Cash' } },
    { id: 'b34', trailer: 'patricia', start: 337, nights: 2, guest: 'Maya Abbott', phone: '(503) 555-0166', site: 'Indian Mary Park · #42', total: 433, type: 'confirmed', source: 'web', email: 'maya.abbott@outlook.com', plan: 'full', paidToday: 433, deposit: 1000, pay: { status: 'Paid in full', method: 'Card online' } },
    { id: 'r14', trailer: 'virginia', start: 339, nights: 3, guest: 'Harbor club', phone: '(541) 555-0187', site: 'Diamond Lake · Crater rim', total: 572, type: 'confirmed', source: 'web', email: 'harbor.club@gmail.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'ub92', trailer: 'charlie', start: 340, nights: 2, guest: 'Axle service', phone: 'Internal', site: 'In shop · Grants Pass', total: 0, type: 'block', source: 'admin' },
    { id: 'q55', trailer: 'jerry', start: 348, nights: 7, guest: 'Noah Grant', phone: '(458) 555-0188', site: 'Indian Mary Park · #30', total: 1278, type: 'pending', source: 'web', email: 'noah.grant@gmail.com', plan: 'full', pay: { status: 'Deposit paid', method: 'Card online' } },
    { id: 'r15', trailer: 'virginia', start: 349, nights: 3, guest: 'Trailblazers party', phone: '(406) 555-0184', site: 'Emigrant Lake · #8', total: 572, type: 'confirmed', source: 'web', email: 'trailblazers.par@icloud.com', plan: 'firstnight', paidToday: 159, deposit: 1000, pay: { status: 'First night paid', method: 'Card online' } },
    { id: 'p82', trailer: 'marylou', start: 349, nights: 5, guest: 'Maya & Ruby', phone: '(406) 555-0198', site: 'Griffin Park', total: 890, type: 'confirmed', source: 'phone', pay: { status: 'Paid in full', method: 'Card by phone' } },
  ];

  // day 0 = today in Pacific time
  function pstToday() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(new Date());
    function get(t) { return +parts.find(function (p) { return p.type === t; }).value; }
    return new Date(get('year'), get('month') - 1, get('day'));
  }

  // ── Public, PII-free: trailer/arrival/nights for every active booking.
  // Used by the customer site's conflict/availability checks. Polls on its
  // own so a booking made in one tab shows up as unavailable in another.
  var availabilityCache = [];
  var availabilityRefreshing = null;
  var availabilityStarted = false;
  function refreshAvailability() {
    if (availabilityRefreshing) return availabilityRefreshing;
    availabilityRefreshing = fetch('/api/bookings/availability')
      .then(function (res) { return res.json(); })
      .then(function (rows) {
        availabilityCache = rows;
        window.dispatchEvent(new CustomEvent('sd-bookings-changed'));
        return availabilityCache;
      })
      .catch(function () {})
      .finally(function () { availabilityRefreshing = null; });
    return availabilityRefreshing;
  }
  function loadAvailability() {
    if (!availabilityStarted) {
      availabilityStarted = true;
      refreshAvailability();
      setInterval(refreshAvailability, 10000);
    }
    return availabilityCache;
  }

  // ── Admin-only, full detail. Used by the owner dashboard and the pricing
  // screen's next-up cards. Requires a valid admin session; 401s quietly
  // (leaves the cache empty) if called from a page that isn't logged in.
  var allCache = [];
  var allRefreshing = null;
  var allStarted = false;
  function refreshAll() {
    if (allRefreshing) return allRefreshing;
    allRefreshing = fetch('/api/bookings', { credentials: 'include' })
      .then(function (res) { if (!res.ok) throw new Error('unauthorized'); return res.json(); })
      .then(function (rows) {
        allCache = rows;
        window.dispatchEvent(new CustomEvent('sd-bookings-changed'));
        return allCache;
      })
      .catch(function () {})
      .finally(function () { allRefreshing = null; });
    return allRefreshing;
  }
  function loadAll() {
    if (!allStarted) {
      allStarted = true;
      refreshAll();
      setInterval(refreshAll, 10000);
    }
    return allCache;
  }

  var overridesCache = { status: {}, cancelled: {}, charges: {}, refunds: {} };
  var overridesRefreshing = null;
  var overridesStarted = false;
  function refreshOverrides() {
    if (overridesRefreshing) return overridesRefreshing;
    overridesRefreshing = fetch('/api/overrides', { credentials: 'include' })
      .then(function (res) { if (!res.ok) throw new Error('unauthorized'); return res.json(); })
      .then(function (data) {
        overridesCache = data;
        window.dispatchEvent(new CustomEvent('sd-overrides-changed'));
        return overridesCache;
      })
      .catch(function () {})
      .finally(function () { overridesRefreshing = null; });
    return overridesRefreshing;
  }
  function loadOverrides() {
    if (!overridesStarted) {
      overridesStarted = true;
      refreshOverrides();
      setInterval(refreshOverrides, 10000);
    }
    return overridesCache;
  }

  // Convert an absolute-date API row to the day-offset-from-today shape the
  // calendar/queue rendering already expects (same conversion loadWeb() used
  // to do for web bookings only; now applies to every booking).
  function toRelative(b, base) {
    var d = new Date(b.arrival + 'T00:00:00');
    var start = Math.round((d.getTime() - base.getTime()) / 86400000);
    return Object.assign({}, b, { start: start });
  }

  // Deliveries (confirmed, not yet out) + pickups (out on a trip), each sorted
  // by their date and capped. Returns plain data; callers render + style.
  // Production data comes only from the API now — no SEED merge.
  function nextUp(cap) {
    var base = pstToday();
    var ov = loadOverrides();
    var status = ov.status || {};
    var all = loadAll().map(function (b) { return toRelative(b, base); });
    function eff(b) { return ov.cancelled[b.id] ? 'cancelled' : (b.type === 'block' ? 'block' : (status[b.id] || b.type)); }
    var live = all.filter(function (b) { return eff(b) !== 'cancelled'; });
    function dateAt(i) { return new Date(base.getTime() + i * 86400000); }
    function queue(stage, keyFn) {
      return live.filter(function (b) { return b.type !== 'block' && eff(b) === stage; })
        .sort(function (a, c) { return keyFn(a) - keyFn(c); })
        .map(function (b) {
          var idx = keyFn(b); var d = dateAt(idx);
          return { id: b.id, wd: WD[d.getDay()], num: d.getDate(),
            trailer: TRAILER_NAMES[b.trailer] || b.trailer, guest: b.guest, site: b.site, today: idx === 0 };
        });
    }
    var deliveries = queue('confirmed', function (b) { return b.start; });
    var pickups = queue('out', function (b) { return b.start + b.nights; });
    var c = cap || 4;
    return {
      deliveries: deliveries.slice(0, c), deliveriesMore: Math.max(0, deliveries.length - c),
      pickups: pickups.slice(0, c), pickupsMore: Math.max(0, pickups.length - c),
    };
  }

  window.SDBookings = {
    SEED: SEED, WD: WD, TRAILER_NAMES: TRAILER_NAMES,
    pstToday: pstToday,
    loadAvailability: loadAvailability, refreshAvailability: refreshAvailability,
    loadAll: loadAll, refreshAll: refreshAll,
    loadOverrides: loadOverrides, refreshOverrides: refreshOverrides,
    nextUp: nextUp,
  };
})();
