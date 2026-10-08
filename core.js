(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FoodLedger = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_ENTRIES = 1000;
  const MAX_OBSERVATIONS = 3660;
  const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
  function fail(message) { throw new Error(message); }
  function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function exactKeys(value, keys, name) {
    if (!plain(value) || Object.keys(value).length !== keys.length || !keys.every(key => Object.prototype.hasOwnProperty.call(value, key))) fail(name + ' has missing or unknown fields.');
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
  function observation(value) {
    exactKeys(value, ['date', 'status', 'notes'], 'Daily check-in');
    const day = date(value.date);
    if (!['zero', 'complete', 'partial'].includes(value.status)) fail('Daily check-in status must be zero, complete, or partial.');
    return { date: day, status: value.status, notes: text(value.notes, 'Check-in notes', 2000, false) };
  }
  function validatedObservations(values, entries) {
    if (!Array.isArray(values) || values.length > MAX_OBSERVATIONS) fail('Diary must contain at most ' + MAX_OBSERVATIONS + ' daily check-ins.');
    const observations = values.map(observation);
    if (new Set(observations.map(item => item.date)).size !== observations.length) fail('Only one daily check-in is allowed per date; edit the existing check-in.');
    const datesWithEntries = new Set(entries.map(item => item.date));
    observations.forEach(item => {
      if (item.status === 'zero' && datesWithEntries.has(item.date)) fail(item.date + ' is checked as a fully observed zero-waste day but has food-waste entries. Change or remove that check-in first; do not remove real entries to make a zero claim.');
      if (item.status === 'complete' && !datesWithEntries.has(item.date)) fail(item.date + ' is checked as a complete day with recorded waste but has no entries. Change or remove that check-in first. Use zero only if the full day was observed with no discarded food.');
    });
    return observations;
  }
  function backup(value) {
    if (!plain(value) || ![1, 2].includes(value.schemaVersion)) fail('Unsupported backup version.');
    const legacy = value.schemaVersion === 1;
    exactKeys(value, legacy ? ['schemaVersion', 'dataStatus', 'entries'] : ['schemaVersion', 'dataStatus', 'entries', 'observations'], 'Backup');
    if (!['personal', 'fictional'].includes(value.dataStatus)) fail('Unsupported backup data status.');
    if (!Array.isArray(value.entries) || value.entries.length > MAX_ENTRIES) fail('Backup must contain at most ' + MAX_ENTRIES + ' entries.');
    const entries = value.entries.map(entry);
    if (new Set(entries.map(item => item.id)).size !== entries.length) fail('Backup has duplicate entry IDs.');
    const observations = validatedObservations(legacy ? [] : value.observations, entries);
    const result = { schemaVersion: 2, dataStatus: value.dataStatus, entries, observations };
    if (new TextEncoder().encode(JSON.stringify(result, null, 2) + '\n').byteLength > MAX_BACKUP_BYTES) fail('This diary would exceed the 10 MB backup limit. Shorten notes or keep a smaller diary; your current saved diary has not been changed.');
    return result;
  }
  function parseBackup(source) {
    if (typeof source !== 'string' || new TextEncoder().encode(source).byteLength > MAX_BACKUP_BYTES) fail('Backup must be at most 10 MB of UTF-8 JSON text.');
    let value;
    try { value = JSON.parse(source); } catch (_) { fail('The file is not valid JSON.'); }
    return backup(value);
  }
  function summary(entries, start, end, observations = []) {
    date(start); date(end);
    if (end < start) fail('End date must be on or after start date.');
    const checkIns = validatedObservations(observations, entries).filter(item => item.date >= start && item.date <= end).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    const zeroDays = checkIns.filter(item => item.status === 'zero').length;
    const completeDays = zeroDays + checkIns.filter(item => item.status === 'complete').length;
    const partialDays = checkIns.filter(item => item.status === 'partial').length;
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
    return { selected, total, totalGrams: grams(total), byReason, days, daysWithEntries: observedDates.size, daysWithoutEntries: days - observedDates.size, excluded: entries.length - selected.length, repeated, checkIns, completeDays, zeroDays, partialDays, uncheckedDays: days - checkIns.length };
  }
  function csv(state) {
    const valid = backup(state);
    const quote = value => /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
    const rows = valid.entries.map(row => [row.date, row.item, row.grams, row.reason, (valid.dataStatus === 'fictional' ? '[FICTIONAL DEMONSTRATION DATA] ' : '') + row.notes].map(quote).join(','));
    return 'date,item,grams,reason,notes\r\n' + rows.join('\r\n') + (rows.length ? '\r\n' : '');
  }
  function checkinsCsv(state) {
    const valid = backup(state);
    const quote = value => /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
    const ordered = [...valid.observations].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    const rows = ordered.map(item => [item.date, item.status, item.notes, valid.dataStatus].map(quote).join(','));
    return 'date,status,notes,data_status\r\n' + rows.join('\r\n') + (rows.length ? '\r\n' : '');
  }
  function sample() {
    return backup({ schemaVersion: 2, dataStatus: 'fictional', observations: [
      { date: '2026-10-01', status: 'complete', notes: 'Fictional complete-day check-in' },
      { date: '2026-10-02', status: 'complete', notes: 'Fictional complete-day check-in' },
      { date: '2026-10-03', status: 'zero', notes: 'Fictional fully observed day with no discarded food' },
      { date: '2026-10-04', status: 'partial', notes: 'Fictional partial-day check-in; observation coverage is incomplete' },
      { date: '2026-10-06', status: 'complete', notes: 'Fictional complete-day check-in' },
      { date: '2026-10-07', status: 'complete', notes: 'Fictional complete-day check-in' }
    ], entries: [
      { id: 'demo_1', date: '2026-10-01', item: 'Rice', grams: '125', reason: 'Overprepared', notes: 'Fictional example' },
      { id: 'demo_2', date: '2026-10-01', item: 'Spinach', grams: '60', reason: 'Spoiled', notes: 'Fictional example' },
      { id: 'demo_3', date: '2026-10-02', item: 'Bread', grams: '45', reason: 'Stale', notes: 'Fictional example' },
      { id: 'demo_4', date: '2026-10-04', item: 'Rice', grams: '75.5', reason: 'Overprepared', notes: 'Fictional example' },
      { id: 'demo_5', date: '2026-10-06', item: 'Apple', grams: '90', reason: 'Damaged', notes: 'Fictional example' },
      { id: 'demo_6', date: '2026-10-07', item: 'Bread', grams: '35', reason: 'Stale', notes: 'Fictional example' }
    ] });
  }
  return { MAX_ENTRIES, MAX_OBSERVATIONS, MAX_BACKUP_BYTES, date, mass, grams, entry, observation, backup, parseBackup, summary, csv, checkinsCsv, sample };
});
