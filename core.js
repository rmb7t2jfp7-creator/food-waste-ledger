(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FoodLedger = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_ENTRIES = 1000;
  function fail(message) { throw new Error(message); }
  function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function exactKeys(value, keys, name) {
    if (!plain(value) || Object.keys(value).sort().join('|') !== keys.slice().sort().join('|')) fail(name + ' has missing or unknown fields.');
  }
  function text(value, name, limit, required = true) {
    if (typeof value !== 'string') fail(name + ' must be text.');
    const clean = value.trim();
    if ((required && !clean) || clean.length > limit) fail(name + ' is required and must be at most ' + limit + ' characters.');
    return clean;
  }
  function date(value) {
    if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) fail('Use a real date in YYYY-MM-DD format.');
    const parsed = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('Use a real calendar date.');
    return value;
  }
  function mass(value) {
    if (typeof value !== 'string' || !/^[0-9]{1,12}(\.[0-9]{1,3})?$/.test(value.trim())) fail('Grams must be a positive decimal: up to 12 digits before and 3 after the decimal point.');
    const [whole, fraction = ''] = value.trim().split('.');
    const mg = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
    if (mg <= 0n) fail('Grams must be greater than zero. Missing entries cannot represent confirmed zero waste.');
    return mg;
  }
  function grams(mg) {
    if (typeof mg !== 'bigint' || mg < 0n) fail('Mass must be nonnegative integer milligrams.');
    return String(mg / 1000n) + (mg % 1000n ? '.' + String(mg % 1000n).padStart(3, '0').replace(/0+$/, '') : '');
  }
  function entry(value) {
    exactKeys(value, ['id', 'date', 'item', 'grams', 'reason', 'notes'], 'Entry');
    if (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value.id)) fail('Entry ID is invalid.');
    return { id: value.id, date: date(value.date), item: text(value.item, 'Item', 200), grams: grams(mass(value.grams)), reason: text(value.reason, 'Reason', 200), notes: text(value.notes, 'Notes', 2000, false) };
  }
  function backup(value) {
    exactKeys(value, ['schemaVersion', 'dataStatus', 'entries'], 'Backup');
    if (value.schemaVersion !== 1 || !['personal', 'fictional'].includes(value.dataStatus)) fail('Unsupported backup version or data status.');
    if (!Array.isArray(value.entries) || value.entries.length > MAX_ENTRIES) fail('Backup must contain at most ' + MAX_ENTRIES + ' entries.');
    const entries = value.entries.map(entry);
    if (new Set(entries.map(item => item.id)).size !== entries.length) fail('Backup has duplicate entry IDs.');
    return { schemaVersion: 1, dataStatus: value.dataStatus, entries };
  }
  function parseBackup(source) {
    if (typeof source !== 'string' || source.length > 10 * 1024 * 1024) fail('Backup must be at most 10 MB of JSON text.');
    let value;
    try { value = JSON.parse(source); } catch (_) { fail('The file is not valid JSON.'); }
    return backup(value);
  }
  function summary(entries, start, end) {
    date(start); date(end);
    if (end < start) fail('End date must be on or after start date.');
    const selected = entries.filter(row => row.date >= start && row.date <= end);
    const groups = new Map();
    let total = 0n;
    const observedDates = new Set();
    const seen = new Set();
    let repeated = 0;
    selected.forEach(row => {
      const mg = mass(row.grams);
      total += mg;
      observedDates.add(row.date);
      groups.set(row.reason, (groups.get(row.reason) || 0n) + mg);
      const signature = JSON.stringify([row.date, row.item, grams(mg), row.reason, row.notes]);
      if (seen.has(signature)) repeated += 1;
      seen.add(signature);
    });
    const byReason = [...groups].map(([label, mg]) => ({ label, mg, grams: grams(mg) })).sort((a, b) => a.mg === b.mg ? (a.label < b.label ? -1 : a.label > b.label ? 1 : 0) : a.mg > b.mg ? -1 : 1);
    const days = Math.round((new Date(end + 'T12:00:00Z') - new Date(start + 'T12:00:00Z')) / 86400000) + 1;
    return { selected, total, totalGrams: grams(total), byReason, days, daysWithEntries: observedDates.size, daysWithoutEntries: days - observedDates.size, excluded: entries.length - selected.length, repeated };
  }
  function csv(state) {
    const valid = backup(state);
    const quote = value => /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
    const rows = valid.entries.map(row => [row.date, row.item, row.grams, row.reason, (valid.dataStatus === 'fictional' ? '[FICTIONAL DEMONSTRATION DATA] ' : '') + row.notes].map(quote).join(','));
    return 'date,item,grams,reason,notes\r\n' + rows.join('\r\n') + (rows.length ? '\r\n' : '');
  }
  function sample() {
    return backup({ schemaVersion: 1, dataStatus: 'fictional', entries: [
      { id: 'demo_1', date: '2026-10-01', item: 'Rice', grams: '125', reason: 'Overprepared', notes: 'Fictional example' },
      { id: 'demo_2', date: '2026-10-01', item: 'Spinach', grams: '60', reason: 'Spoiled', notes: 'Fictional example' },
      { id: 'demo_3', date: '2026-10-02', item: 'Bread', grams: '45', reason: 'Stale', notes: 'Fictional example' },
      { id: 'demo_4', date: '2026-10-04', item: 'Rice', grams: '75.5', reason: 'Overprepared', notes: 'Fictional example' },
      { id: 'demo_5', date: '2026-10-06', item: 'Apple', grams: '90', reason: 'Damaged', notes: 'Fictional example' },
      { id: 'demo_6', date: '2026-10-07', item: 'Bread', grams: '35', reason: 'Stale', notes: 'Fictional example' }
    ] });
  }
  return { MAX_ENTRIES, date, mass, grams, entry, backup, parseBackup, summary, csv, sample };
});
