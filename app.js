(function () {
  'use strict';
  const C = window.FoodLedger;
  const $ = id => document.getElementById(id);
  const STORE_KEY = 'food-waste-ledger-v1';
  let state = { schemaVersion: 2, dataStatus: 'personal', entries: [], observations: [] };
  let editId = null;
  let blockStorageWrite = false;
  function localToday() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }
  const today = localToday();
  const checkInLabels = { zero: 'No food discarded', complete: 'All discarded food recorded', partial: 'Only part of the day recorded' };
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
    if (state.entries.length || state.observations.length) {
      const dates = [...state.entries, ...state.observations].map(row => row.date).sort();
      range = { start: dates[0], end: dates[dates.length - 1] };
    } else {
      const currentDay = localToday();
      range = { start: currentDay.slice(0, 8) + '01', end: currentDay };
    }
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
    $('entry-date').value = localToday();
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
    try {
      commit({ ...state, entries: state.entries.filter(item => item.id !== row.id) }, 'Entry deleted.');
      if (editId === row.id) resetForm();
    } catch (error) { announce('Entry was not deleted. ' + error.message); }
  }
  function loadCheckInDate(day, focus = false) {
    const existing = state.observations.find(row => row.date === day);
    $('checkin-date').value = day;
    $('checkin-status').value = existing ? existing.status : '';
    $('checkin-notes').value = existing ? existing.notes : '';
    $('save-checkin').textContent = existing ? 'Update check-in ↗' : 'Save daily check-in ↗';
    $('checkin-existing').textContent = existing ? 'This date already has a check-in. Saving updates that date only.' : 'One check-in per date. Choose the description that matches what you observed.';
    message('checkin-error', '');
    if (focus) {
      $('checkin-status').focus();
      $('checkin-title').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  function resetCheckInForm() {
    $('checkin-form').reset();
    loadCheckInDate(localToday());
  }
  function removeCheckIn(row) {
    if (!window.confirm('Remove the daily check-in for ' + row.date + '? Food entries for that date will stay in the diary.')) return;
    try {
      commit({ ...state, observations: state.observations.filter(item => item.date !== row.date) }, 'Daily check-in removed. That date is now unknown until you add another check-in.');
      if ($('checkin-date').value === row.date) loadCheckInDate(row.date);
    } catch (error) { announce('Daily check-in was not removed. ' + error.message); }
  }
  function render() {
    const result = C.summary(state.entries, range.start, range.end, state.observations);
    $('data-status').textContent = state.dataStatus === 'fictional' ? 'Fictional sample diary · all entries and check-ins are demonstration data' : 'Your diary · self-reported food entries and daily check-ins';
    $('total').textContent = result.totalGrams;
    $('count').textContent = String(result.selected.length);
    $('excluded').textContent = result.excluded + ' outside this period';
    $('coverage').textContent = result.daysWithEntries + ' / ' + result.days;
    $('unlogged').textContent = result.daysWithoutEntries + ' dates have no food entries';
    $('complete-days').textContent = String(result.completeDays);
    $('zero-days').textContent = result.zeroDays + ' marked “No food discarded”';
    $('partial-days').textContent = String(result.partialDays);
    $('unknown-days').textContent = String(result.uncheckedDays);
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
    const checkIns = $('checkin-list');
    checkIns.replaceChildren();
    $('checkin-count').textContent = result.checkIns.length + (result.checkIns.length === 1 ? ' check-in' : ' check-ins');
    $('checkin-empty').hidden = result.checkIns.length > 0;
    [...result.checkIns].sort((a, b) => b.date.localeCompare(a.date)).forEach(row => {
      const card = element('article', 'checkin-card');
      const info = element('div');
      info.append(element('h3', '', row.date), element('p', 'checkin-status-label ' + row.status, checkInLabels[row.status]));
      if (row.notes) info.append(element('p', 'entry-notes', row.notes));
      const controls = element('div', 'entry-controls');
      const editButton = element('button', '', 'Edit');
      editButton.type = 'button';
      editButton.setAttribute('aria-label', 'Edit daily check-in for ' + row.date);
      editButton.addEventListener('click', () => loadCheckInDate(row.date, true));
      const removeButton = element('button', '', 'Remove');
      removeButton.type = 'button';
      removeButton.setAttribute('aria-label', 'Remove daily check-in for ' + row.date);
      removeButton.addEventListener('click', () => removeCheckIn(row));
      controls.append(editButton, removeButton);
      card.append(info, controls);
      checkIns.append(card);
    });
    const chart = $('reason-chart');
    chart.replaceChildren();
    if (!result.byReason.length) chart.append(element('p', 'chart-empty', 'No discarded food mass is recorded in this period. Check the daily coverage above for complete, partial, and unknown days.'));
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
      C.summary(state.entries, $('start').value, $('end').value, state.observations);
      range = { start: $('start').value, end: $('end').value };
      message('filter-error', '');
      render();
      announce('Showing ' + range.start + ' through ' + range.end + ', inclusive.');
    } catch (error) { message('filter-error', error.message); }
  });
  $('show-all').addEventListener('click', () => {
    coverAll();
    render();
    announce('Showing all recorded dates: ' + range.start + ' through ' + range.end + ', including daily check-ins.');
  });
  $('checkin-date').addEventListener('change', () => loadCheckInDate($('checkin-date').value));
  $('checkin-today').addEventListener('click', () => loadCheckInDate(localToday(), true));
  $('checkin-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const row = C.observation({ date: $('checkin-date').value, status: $('checkin-status').value, notes: $('checkin-notes').value });
      const replacing = state.observations.some(item => item.date === row.date);
      const observations = [...state.observations.filter(item => item.date !== row.date), row];
      const outside = row.date < range.start || row.date > range.end;
      commit({ ...state, observations }, 'Daily check-in ' + (replacing ? 'updated' : 'saved') + ' for ' + row.date + '.' + (outside ? ' This date is outside the current filter; choose Show all dates to see it.' : '') + (state.dataStatus === 'fictional' ? ' This remains fictional sample data.' : ''));
      loadCheckInDate(row.date);
    } catch (error) { message('checkin-error', error.message); }
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
    if ((state.entries.length || state.observations.length) && !window.confirm('Replace all food entries and daily check-ins with fictional sample data? Export a JSON backup first if you want to keep them.')) return;
    state = C.sample();
    range = { start: '2026-10-01', end: '2026-10-07' };
    syncRange();
    resetForm();
    resetCheckInForm();
    persist();
    render();
    announce('Fictional sample loaded: 430.5 g across six entries and ' + state.observations.length + ' daily check-ins. These are not real observations.');
  });
  $('clear').addEventListener('click', () => {
    if (!window.confirm('Clear all food entries and daily check-ins saved in this browser and start an empty personal diary? Export a JSON backup first if you want to keep them.')) return;
    blockStorageWrite = false;
    state = { schemaVersion: 2, dataStatus: 'personal', entries: [], observations: [] };
    coverAll();
    resetForm();
    resetCheckInForm();
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
    announce('JSON backup prepared for download. It includes all food entries, daily check-ins, and the personal or fictional status.');
  });
  $('csv').addEventListener('click', () => {
    download(C.csv(state), 'text/csv;charset=utf-8', 'food-waste-' + state.dataStatus + '.csv');
    announce('Food-entry CSV prepared. It includes all food entries but no daily check-ins; the Python analyzer reads this format. Import label columns as text when opening it in a spreadsheet.');
  });
  $('checkins-csv').addEventListener('click', () => {
    download(C.checkinsCsv(state), 'text/csv;charset=utf-8', 'food-waste-' + state.dataStatus + '-check-ins.csv');
    announce('Daily check-ins CSV prepared for download. It contains all check-in dates, statuses, and notes. It is a separate format from the food-entry CSV and is not input for the Python analyzer. Import text columns as text in a spreadsheet.');
  });
  $('import').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > C.MAX_BACKUP_BYTES) throw new Error('Choose a JSON backup no larger than 10 MB.');
      const imported = C.parseBackup(await file.text());
      if ((state.entries.length || state.observations.length || blockStorageWrite) && !window.confirm('Replace this browser’s diary with ' + imported.entries.length + ' food entries and ' + imported.observations.length + ' daily check-ins from this backup? Export your current diary first if needed.')) return;
      state = imported;
      blockStorageWrite = false;
      coverAll();
      resetForm();
      resetCheckInForm();
      persist();
      render();
      announce('Backup imported. ' + imported.entries.length + ' food entries and ' + imported.observations.length + ' daily check-ins; ' + (imported.dataStatus === 'fictional' ? 'fictional demonstration data.' : 'self-reported observations.'));
    } catch (error) { announce('Import rejected: ' + error.message + ' Your current diary was kept.'); }
    finally { event.target.value = ''; }
  });
  if (state.entries.length || state.observations.length) coverAll();
  else syncRange();
  resetForm();
  resetCheckInForm();
  render();
})();
