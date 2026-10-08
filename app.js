(function () {
  'use strict';
  const C = window.FoodLedger;
  const $ = id => document.getElementById(id);
  const STORE_KEY = 'food-waste-ledger-v1';
  let state = { schemaVersion: 1, dataStatus: 'personal', entries: [] };
  let editId = null;
  let blockStorageWrite = false;
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  let range = { start: today.slice(0, 8) + '01', end: today };

  function message(id, value) {
    $(id).textContent = value;
    $(id).hidden = !value;
  }
  function announce(value) { message('notice', value); }
  function storageProblem(value) {
    message('storage-message', value + ' Changes are kept only for this session. Export a JSON backup before closing this page.');
    $('storage-status').textContent = 'Not saved in browser storage. Back up your diary now.';
  }
  try {
    const source = window.localStorage.getItem(STORE_KEY);
    if (source !== null) {
      try { state = C.parseBackup(source); }
      catch (_) {
        blockStorageWrite = true;
        storageProblem('The saved diary could not be read; that stored copy has not been overwritten. Use Start fresh to reset it, or work with a separate backup.');
      }
    }
  } catch (_) { storageProblem('This browser has blocked access to local storage.'); }

  function persist() {
    if (blockStorageWrite) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
      message('storage-message', '');
      $('storage-status').textContent = 'Saved only in this browser. Export a backup regularly.';
    } catch (_) { storageProblem('The diary could not be saved. Browser storage may be full or disabled.'); }
  }
  function commit(next, notice) {
    state = C.backup(next);
    persist();
    render();
    if (notice) announce(notice);
  }
  function syncRange() {
    $('start').value = range.start;
    $('end').value = range.end;
    message('filter-error', '');
  }
  function coverAll() {
    if (state.entries.length) {
      const dates = state.entries.map(row => row.date).sort();
      range = { start: dates[0], end: dates[dates.length - 1] };
    } else range = { start: today.slice(0, 8) + '01', end: today };
    syncRange();
  }
  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function resetForm() {
    editId = null;
    $('entry-form').reset();
    $('entry-date').value = today;
    $('entry-title').textContent = 'Add an entry';
    $('save-entry').textContent = 'Add to diary ↗';
    $('cancel-edit').hidden = true;
    message('entry-error', '');
  }
  function edit(row) {
    editId = row.id;
    $('entry-date').value = row.date;
    for (const field of ['item', 'grams', 'reason', 'notes']) $(field).value = row[field];
    $('entry-title').textContent = 'Edit entry';
    $('save-entry').textContent = 'Save changes ↗';
    $('cancel-edit').hidden = false;
    message('entry-error', '');
    $('item').focus();
    $('entry-title').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function remove(row) {
    if (!window.confirm('Delete this entry for ' + row.item + ' on ' + row.date + '?')) return;
    commit({ ...state, entries: state.entries.filter(item => item.id !== row.id) }, 'Entry deleted.');
    if (editId === row.id) resetForm();
  }
  function render() {
    const result = C.summary(state.entries, range.start, range.end);
    $('data-status').textContent = state.dataStatus === 'fictional' ? 'Fictional sample diary · all entries are demonstration data' : 'Your diary · user-entered, unverified observations';
    $('total').textContent = result.totalGrams;
    $('count').textContent = String(result.selected.length);
    $('excluded').textContent = result.excluded + ' outside this period';
    $('coverage').textContent = result.daysWithEntries + ' / ' + result.days;
    $('unlogged').textContent = result.daysWithoutEntries + ' dates unlogged, not measured zero';
    $('row-count').textContent = result.selected.length + (result.selected.length === 1 ? ' entry' : ' entries');
    $('empty').hidden = result.selected.length > 0;
    message('duplicate-warning', result.repeated ? result.repeated + ' repeated identical record(s) are included. Review whether these are separate observations or accidental duplicates.' : '');
    const list = $('entry-list');
    list.replaceChildren();
    [...result.selected].sort((a, b) => b.date.localeCompare(a.date)).forEach(row => {
      const card = element('article', 'entry-card');
      const info = element('div');
      info.append(element('h3', '', row.item), element('p', '', row.date + ' · ' + row.reason));
      if (row.notes) info.append(element('p', 'entry-notes', row.notes));
      const right = element('div');
      right.append(element('div', 'mass', row.grams + ' g'));
      const controls = element('div', 'entry-controls');
      const editButton = element('button', '', 'Edit');
      editButton.type = 'button';
      editButton.setAttribute('aria-label', 'Edit ' + row.item + ' on ' + row.date);
      editButton.addEventListener('click', () => edit(row));
      const deleteButton = element('button', '', 'Delete');
      deleteButton.type = 'button';
      deleteButton.setAttribute('aria-label', 'Delete ' + row.item + ' on ' + row.date);
      deleteButton.addEventListener('click', () => remove(row));
      controls.append(editButton, deleteButton);
      right.append(controls);
      card.append(info, right);
      list.append(card);
    });
    const chart = $('reason-chart');
    chart.replaceChildren();
    if (!result.byReason.length) chart.append(element('p', 'chart-empty', 'No recorded mass in this period. Add an entry or adjust the dates.'));
    result.byReason.forEach(group => {
      const row = element('div', 'bar-row');
      const label = element('div', 'bar-label');
      label.append(element('span', '', group.label), element('strong', '', group.grams + ' g'));
      const track = element('div', 'bar-track');
      track.setAttribute('aria-hidden', 'true');
      const bar = element('div', 'bar-fill');
      bar.style.width = Number(group.mg * 10000n / result.byReason[0].mg) / 100 + '%';
      track.append(bar);
      row.append(label, track);
      chart.append(row);
    });
  }
  $('filter-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      C.summary(state.entries, $('start').value, $('end').value);
      range = { start: $('start').value, end: $('end').value };
      message('filter-error', '');
      render();
      announce('Showing ' + range.start + ' through ' + range.end + ', inclusive.');
    } catch (error) { message('filter-error', error.message); }
  });
  $('entry-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const row = C.entry({ id: editId || 'row_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2), date: $('entry-date').value, item: $('item').value, grams: $('grams').value, reason: $('reason').value, notes: $('notes').value });
      const entries = editId ? state.entries.map(item => item.id === editId ? row : item) : [...state.entries, row];
      const outside = row.date < range.start || row.date > range.end;
      commit({ ...state, entries }, (editId ? 'Entry updated.' : 'Entry added.') + (outside ? ' This date is outside the current filter; change the date range to see it.' : '') + (state.dataStatus === 'fictional' ? ' This remains a fictional sample diary; use Start fresh for your own observations.' : ''));
      resetForm();
    } catch (error) { message('entry-error', error.message); }
  });
  $('cancel-edit').addEventListener('click', resetForm);
  $('sample').addEventListener('click', () => {
    if (state.entries.length && !window.confirm('Replace this diary with fictional sample data? Back up your own diary first.')) return;
    state = C.sample();
    range = { start: '2026-10-01', end: '2026-10-07' };
    syncRange();
    resetForm();
    persist();
    render();
    announce('Fictional sample loaded: 430.5 g across six entries. These are not real observations.');
  });
  $('clear').addEventListener('click', () => {
    if (!window.confirm('Clear the diary saved in this browser and start an empty personal diary? Export a backup first if you want to keep it.')) return;
    blockStorageWrite = false;
    state = { schemaVersion: 1, dataStatus: 'personal', entries: [] };
    coverAll();
    resetForm();
    persist();
    render();
    announce('Started an empty personal diary.');
  });
  function download(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = element('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('backup').addEventListener('click', () => {
    download(JSON.stringify(state, null, 2) + '\n', 'application/json', 'food-waste-' + state.dataStatus + '-backup.json');
    announce('JSON backup prepared for download. It contains the whole diary and its personal or fictional status.');
  });
  $('csv').addEventListener('click', () => {
    download(C.csv(state), 'text/csv;charset=utf-8', 'food-waste-' + state.dataStatus + '.csv');
    announce('CSV prepared for download with all diary entries. When opening it in a spreadsheet, import label columns as text to preserve what you entered.');
  });
  $('import').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 10 MB.');
      const imported = C.parseBackup(await file.text());
      if (state.entries.length && !window.confirm('Replace the current diary with ' + imported.entries.length + ' entries from this backup? Export your current diary first if needed.')) return;
      state = imported;
      coverAll();
      resetForm();
      persist();
      render();
      announce('Backup imported. ' + imported.entries.length + ' entries; ' + (imported.dataStatus === 'fictional' ? 'fictional demonstration data.' : 'user-entered, unverified observations.'));
    } catch (error) { announce('Import rejected: ' + error.message + ' Your current diary was kept.'); }
    finally { event.target.value = ''; }
  });
  if (state.entries.length) coverAll();
  else syncRange();
  resetForm();
  render();
})();
