'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./core.js');
function row(overrides = {}) { return { id: 'one', date: '2026-10-07', item: 'Rice', grams: '0.001', reason: 'Overprepared', notes: '', ...overrides }; }
function state(entries, dataStatus = 'personal', observations = []) { return { schemaVersion: 2, dataStatus, entries, observations }; }
function checkin(overrides = {}) { return { date: '2026-10-07', status: 'partial', notes: '', ...overrides }; }
function checkinDate(index) { return new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10); }

test('exact milligram arithmetic survives totals beyond Number precision', () => {
  const entries = Array.from({ length: 20 }, (_, i) => row({ id: 'id_' + i, grams: '999999999999.999' }));
  const result = C.summary(entries, '2026-10-07', '2026-10-07');
  assert.equal(result.totalGrams, '19999999999999.98');
  assert.equal(C.grams(C.mass('0001.010')), '1.01');
});
test('invalid and nonpositive mass values are rejected', () => {
  for (const value of ['0', '-1', 'NaN', 'Infinity', '1e2', '.5', '1.', '1.0001', '1000000000000', 1, null]) assert.throws(() => C.mass(value));
});
test('real Gregorian dates including leap years and early years', () => {
  for (const value of ['2024-02-29', '0001-01-01', '9999-12-31']) assert.equal(C.date(value), value);
  for (const value of ['2026-02-29', '2026-04-31', '0000-01-01', '2026-13-01', '2026-1-01', '2026-10-07T00:00:00Z']) assert.throws(() => C.date(value));
});
test('fictional sample totals and honest coverage', () => {
  const sample = C.sample();
  const result = C.summary(sample.entries, '2026-10-01', '2026-10-07', sample.observations);
  assert.equal(sample.dataStatus, 'fictional');
  assert.equal(result.totalGrams, '430.5');
  assert.equal(result.daysWithEntries, 5);
  assert.equal(result.daysWithoutEntries, 2);
  assert.equal(result.selected.length, 6);
  assert.equal(result.byReason[0].grams, '200.5');
  assert.equal(result.completeDays, 5);
  assert.equal(result.zeroDays, 1);
  assert.equal(result.partialDays, 1);
  assert.equal(result.uncheckedDays, 1);
  assert.equal(result.checkIns.length, 6);
  assert.ok(sample.observations.every(item => item.notes.startsWith('Fictional')));
});
test('inclusive filters exclude both sides and count calendar days across leap boundary', () => {
  const entries = ['2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02'].map((date, i) => row({ id: 'id_' + i, date, grams: '1' }));
  const result = C.summary(entries, '2024-02-29', '2024-03-01');
  assert.equal(result.totalGrams, '2');
  assert.equal(result.excluded, 2);
  assert.equal(result.days, 2);
  assert.throws(() => C.summary(entries, '2024-03-01', '2024-02-29'));
});
test('no entries returns unknown unlogged days, with no group or invented observation', () => {
  const result = C.summary([], '2026-10-01', '2026-10-07');
  assert.equal(result.totalGrams, '0');
  assert.equal(result.daysWithEntries, 0);
  assert.equal(result.daysWithoutEntries, 7);
  assert.deepEqual(result.byReason, []);
  assert.equal(result.zeroDays, 0);
  assert.equal(result.completeDays, 0);
  assert.equal(result.partialDays, 0);
  assert.equal(result.uncheckedDays, 7);
  assert.deepEqual(result.checkIns, []);
});
test('duplicate records stay in totals while warning count excludes ids', () => {
  const result = C.summary([row(), row({ id: 'two' })], '2026-10-07', '2026-10-07');
  assert.equal(result.repeated, 1);
  assert.equal(result.totalGrams, '0.002');
});
test('backup normalizes whitespace and round trips exact strings/status', () => {
  const original = state([row({ item: ' Rice ', grams: '0001.010' })], 'fictional');
  const restored = C.parseBackup(JSON.stringify(original));
  assert.equal(restored.entries[0].item, 'Rice');
  assert.equal(restored.entries[0].grams, '1.01');
  assert.equal(restored.dataStatus, 'fictional');
  assert.deepEqual(C.parseBackup(JSON.stringify(restored)), restored);
});
test('strict imports reject wrong fields, versions, ids, types and excessive entries', () => {
  for (const input of [null, [], {}, { ...state([]), extra: 1 }, { ...state([]), schemaVersion: 3 }, { ...state([]), dataStatus: 'verified' }, state([row(), row()]), state([{ ...row(), hidden: true }]), state([row({ id: '<tag>' })]), state([row({ grams: 2 })]), state([row({ item: '' })]), state([row({ notes: 'x'.repeat(2001) })]), state(Array.from({ length: C.MAX_ENTRIES + 1 }, (_, i) => row({ id: 'id_' + i })))]) assert.throws(() => C.backup(input));
  assert.throws(() => C.parseBackup('{broken'));
});
test('CSV quotes commas, quotes and newlines and keeps Python-compatible schema', () => {
  const result = C.csv(state([row({ item: 'Rice, beans', reason: '"Leftovers"', notes: 'Line 1\nLine 2' })]));
  assert.equal(result, 'date,item,grams,reason,notes\r\n2026-10-07,"Rice, beans",0.001,"""Leftovers""","Line 1\nLine 2"\r\n');
  assert.ok(C.csv(C.sample()).includes('[FICTIONAL DEMONSTRATION DATA]'));
});
test('arbitrary labels are handled as data, including object property names', () => {
  const entries = C.backup(state([row({ reason: '__proto__' }), row({ id: 'two', reason: '<script>alert(1)</script>' })])).entries;
  const result = C.summary(entries, '2026-10-07', '2026-10-07');
  assert.equal(result.byReason.length, 2);
  assert.equal(result.totalGrams, '0.002');
});

test('strict version-1 backups migrate without inventing check-ins', () => {
  const old = { schemaVersion: 1, dataStatus: 'personal', entries: [row()] };
  const source = JSON.stringify(old);
  assert.deepEqual(C.parseBackup(source), state([row()]));
  assert.equal(JSON.stringify(old), source);
  assert.equal(C.backup({ ...old, dataStatus: 'fictional' }).dataStatus, 'fictional');
  assert.throws(() => C.backup({ ...old, observations: [] }), /unknown fields/);
  const { observations, ...missingObservations } = state([]);
  assert.throws(() => C.backup(missingObservations), /missing or unknown fields/);
});

test('version-2 check-ins round trip notes and status without mutating input', () => {
  const original = state([row()], 'fictional', [checkin({ status: 'complete', notes: '  Fictional note, with "quotes"\nand another line  ' })]);
  const validated = C.backup(original);
  assert.equal(validated.observations[0].notes, 'Fictional note, with "quotes"\nand another line');
  assert.deepEqual(C.parseBackup(JSON.stringify(validated, null, 2) + '\n'), validated);
  assert.equal(original.observations[0].notes.startsWith('  '), true);
});

test('observations enforce exact fields, real dates, supported status and bounded text', () => {
  assert.deepEqual(C.observation(checkin({ notes: ' <b>literal text</b> ' })), checkin({ notes: '<b>literal text</b>' }));
  assert.equal(C.observation(checkin({ notes: 'x'.repeat(2000) })).notes.length, 2000);
  for (const invalid of [null, [], {}, { date: '2026-10-07', status: 'zero' }, { ...checkin(), extra: true }, checkin({ date: '2026-02-29' }), checkin({ status: 'unknown' }), checkin({ status: true }), checkin({ notes: null }), checkin({ notes: 'x'.repeat(2001) })]) assert.throws(() => C.observation(invalid));
});

test('zero check-ins protect against conflicting added or moved entries', () => {
  const current = C.backup(state([], 'personal', [checkin({ status: 'zero' })]));
  const snapshot = JSON.stringify(current);
  assert.throws(() => C.backup({ ...current, entries: [row()] }), /2026-10-07.*Change or remove that check-in first/);
  assert.equal(JSON.stringify(current), snapshot);
  assert.equal(C.backup({ ...current, entries: [row({ date: '2026-10-06' })] }).entries.length, 1);
});

test('complete check-ins protect deletion or moving of the last entry', () => {
  const current = C.backup(state([row(), row({ id: 'two' })], 'personal', [checkin({ status: 'complete' })]));
  assert.equal(C.backup({ ...current, entries: [row()] }).entries.length, 1);
  assert.throws(() => C.backup({ ...current, entries: [] }), /Change or remove that check-in first/);
  assert.throws(() => C.backup({ ...current, entries: [row({ date: '2026-10-06' })] }), /complete day.*no entries/);
  assert.equal(current.entries.length, 2);
  assert.equal(C.backup({ ...current, entries: [], observations: [] }).entries.length, 0);
});

test('partial check-ins allow entries or none without claiming complete or zero days', () => {
  for (const entries of [[], [row()]]) {
    const current = C.backup(state(entries, 'personal', [checkin()]));
    const result = C.summary(current.entries, '2026-10-07', '2026-10-07', current.observations);
    assert.equal(result.partialDays, 1);
    assert.equal(result.completeDays, 0);
    assert.equal(result.zeroDays, 0);
    assert.equal(result.uncheckedDays, 0);
  }
});

test('entry dates never imply complete coverage and empty dates never imply zero', () => {
  const result = C.summary([row()], '2026-10-06', '2026-10-08');
  assert.equal(result.daysWithEntries, 1);
  assert.equal(result.daysWithoutEntries, 2);
  assert.equal(result.completeDays, 0);
  assert.equal(result.zeroDays, 0);
  assert.equal(result.uncheckedDays, 3);
});

test('inclusive check-in filters separate complete, zero, partial and unchecked dates', () => {
  const entries = [row({ date: '2024-02-29' }), row({ id: 'unchecked', date: '2024-03-02' })];
  const observations = [checkin({ date: '2024-03-04', status: 'zero' }), checkin({ date: '2024-03-03', status: 'partial' }), checkin({ date: '2024-02-29', status: 'complete' }), checkin({ date: '2024-02-28', status: 'partial' }), checkin({ date: '2024-03-01', status: 'zero' })];
  const before = JSON.stringify(observations);
  const result = C.summary(entries, '2024-02-29', '2024-03-03', observations);
  assert.equal(result.days, 4);
  assert.deepEqual(result.checkIns.map(item => item.date), ['2024-02-29', '2024-03-01', '2024-03-03']);
  assert.equal(result.completeDays, 2);
  assert.equal(result.zeroDays, 1);
  assert.equal(result.partialDays, 1);
  assert.equal(result.uncheckedDays, 1);
  assert.equal(result.daysWithEntries, 2);
  assert.equal(result.daysWithoutEntries, 2);
  assert.equal(result.totalGrams, '0.002');
  assert.equal(JSON.stringify(observations), before);
});

test('duplicate dates and conflicting check-ins are rejected even outside the report period', () => {
  assert.throws(() => C.backup(state([], 'personal', [checkin(), checkin({ status: 'zero' })])), /one daily check-in/);
  assert.throws(() => C.summary([], '2026-10-01', '2026-10-02', [checkin(), checkin()]), /one daily check-in/);
  assert.throws(() => C.summary([row()], '2026-10-01', '2026-10-02', [checkin({ status: 'zero' })]), /Change or remove/);
});

test('maximum observation count is supported and a larger or invalid list is rejected', () => {
  const observations = Array.from({ length: C.MAX_OBSERVATIONS }, (_, index) => checkin({ date: checkinDate(index), status: 'zero' }));
  const valid = C.backup(state([], 'personal', observations));
  assert.equal(valid.observations.length, 3660);
  assert.deepEqual(C.parseBackup(JSON.stringify(valid, null, 2)), valid);
  assert.throws(() => C.backup(state([], 'personal', [...observations, checkin({ date: checkinDate(C.MAX_OBSERVATIONS) })])), /at most 3660/);
  for (const invalid of [null, {}, 'none']) assert.throws(() => C.backup(state([], 'personal', invalid)));
});

test('check-in CSV keeps a separate schema, date order, quoting and data status', () => {
  const current = state([], 'fictional', [checkin({ date: '2026-10-08', status: 'partial', notes: '' }), checkin({ date: '2026-10-07', status: 'zero', notes: 'Fictional, "zero"\nfull day' })]);
  assert.equal(C.checkinsCsv(current), 'date,status,notes,data_status\r\n2026-10-07,zero,"Fictional, ""zero""\nfull day",fictional\r\n2026-10-08,partial,,fictional\r\n');
  assert.equal(C.checkinsCsv(state([])), 'date,status,notes,data_status\r\n');
  assert.equal(C.checkinsCsv(state([], 'personal', [checkin()])), 'date,status,notes,data_status\r\n2026-10-07,partial,,personal\r\n');
  assert.equal(C.csv(current), 'date,item,grams,reason,notes\r\n');
});

test('check-in export accepts old backups without fabricating rows', () => {
  assert.equal(C.checkinsCsv({ schemaVersion: 1, dataStatus: 'personal', entries: [row()] }), 'date,status,notes,data_status\r\n');
});

test('saved observation notes cannot outgrow the UTF-8 formatted backup import limit', () => {
  const observations = Array.from({ length: 1800 }, (_, index) => checkin({ date: checkinDate(index), notes: '界'.repeat(2000) }));
  assert.throws(() => C.backup(state([], 'personal', observations)), /10 MB backup limit/);
  assert.throws(() => C.parseBackup('界'.repeat(Math.floor(C.MAX_BACKUP_BYTES / 3) + 1)), /10 MB of UTF-8/);
  const smaller = C.backup(state([], 'personal', observations.slice(0, 20)));
  assert.deepEqual(C.parseBackup(JSON.stringify(smaller, null, 2) + '\n'), smaller);
});
