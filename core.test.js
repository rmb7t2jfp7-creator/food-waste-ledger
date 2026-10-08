'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./core.js');
function row(overrides = {}) { return { id: 'one', date: '2026-10-07', item: 'Rice', grams: '0.001', reason: 'Overprepared', notes: '', ...overrides }; }
function state(entries, dataStatus = 'personal') { return { schemaVersion: 1, dataStatus, entries }; }

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
  const result = C.summary(sample.entries, '2026-10-01', '2026-10-07');
  assert.equal(sample.dataStatus, 'fictional');
  assert.equal(result.totalGrams, '430.5');
  assert.equal(result.daysWithEntries, 5);
  assert.equal(result.daysWithoutEntries, 2);
  assert.equal(result.selected.length, 6);
  assert.equal(result.byReason[0].grams, '200.5');
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
  for (const input of [null, [], {}, { ...state([]), extra: 1 }, { ...state([]), schemaVersion: 2 }, { ...state([]), dataStatus: 'verified' }, state([row(), row()]), state([{ ...row(), hidden: true }]), state([row({ id: '<tag>' })]), state([row({ grams: 2 })]), state([row({ item: '' })]), state([row({ notes: 'x'.repeat(2001) })]), state(Array.from({ length: C.MAX_ENTRIES + 1 }, (_, i) => row({ id: 'id_' + i })))]) assert.throws(() => C.backup(input));
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
