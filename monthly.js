/* Monthly extremes, not monthly averages. All temperatures are degrees Celsius. */
/**
 * Validate daily CSV records and group them by YYYY-MM.
 * The maximum is the highest daily high; the minimum is the lowest daily low.
 * Count observations so tooltips can identify partial months.
 */
function aggregateMonths(csvText) {
  const months = new Map();
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.shift().trim() !== 'date,max_temperature,min_temperature') {
    throw new Error('Expected date,max_temperature,min_temperature columns.');
  }
  const dates = new Set();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [date, maximum, minimum] = line.split(',').map(value => value.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !maximum || !minimum ||
        !Number.isFinite(+maximum) || !Number.isFinite(+minimum) || +minimum > +maximum) {
      throw new Error(`Invalid daily record: ${line}`);
    }
    if (dates.has(date)) throw new Error(`Duplicate date: ${date}`);
    dates.add(date);
    // ISO date prefixes form stable month keys without timezone conversion.
    const key = date.slice(0, 7);
    const month = months.get(key) || { date: key, max: -Infinity, min: Infinity, days: 0 };
    month.max = Math.max(month.max, +maximum);
    month.min = Math.min(month.min, +minimum);
    month.days++;
    months.set(key, month);
  }
  return [...months.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Create the matrix, bind its controls, and render the shared color legend.
 * Each call owns its state inside one document, keeping the two tabs independent.
 */
function createTemperatureMatrix(root, monthlyData) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const byMonth = new Map(monthlyData.map(month => [month.date, month]));
  const firstYear = +monthlyData[0].date.slice(0, 4);
  const lastYear = +monthlyData.at(-1).date.slice(0, 4);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const grid = root.querySelector('[data-matrix]');
  const tooltip = root.querySelector('[data-detail]');
  const buttons = [...root.querySelectorAll('[data-mode]')];
  let mode = window.openai?.widgetState?.modelContent?.mode === 'min' ? 'min' : 'max';

  // Include both extremes and coverage even when only one colors the cell.
  function detailText(month) {
    if (!month) return 'No observations';
    const [year, number] = month.date.split('-').map(Number);
    const expectedDays = new Date(Date.UTC(year, number, 0)).getUTCDate();
    return `${month.date}  |  Maximum: ${month.max} deg C  |  Minimum: ${month.min} deg C  |  ${month.days}/${expectedDays} days`;
  }

  // Position one reusable tooltip below the active cell, clamped horizontally.
  function showDetail(event, month, date) {
    tooltip.textContent = month ? detailText(month) : `${date}  |  No observations`;
    tooltip.hidden = false;
    const rootBox = root.getBoundingClientRect();
    const cellBox = event.currentTarget.getBoundingClientRect();
    const left = Math.min(cellBox.left - rootBox.left, root.clientWidth - tooltip.offsetWidth - 4);
    tooltip.style.left = `${Math.max(0, left)}px`;
    tooltip.style.top = `${cellBox.bottom - rootBox.top + 5}px`;
  }

  // Rebuild rows in month order and columns in year order after a mode change.
  // Missing months remain transparent rather than implying a zero temperature.
  function renderMatrix() {
    grid.replaceChildren();
    grid.style.setProperty('--year-count', years.length);
    const monthAxisTitle = document.createElement('span');
    monthAxisTitle.className = 'month-axis-title';
    // Reserve the top-left grid slot; the y-axis title sits beside the rows.
    monthAxisTitle.setAttribute('aria-hidden', 'true');
    grid.append(monthAxisTitle);
    years.forEach(year => {
      const label = document.createElement('span');
      label.className = 'year-label';
      label.textContent = year;
      grid.append(label);
    });
    monthNames.forEach((monthName, monthIndex) => {
      const label = document.createElement('span');
      label.className = 'month-label';
      label.textContent = monthName;
      grid.append(label);
      years.forEach(year => {
        const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        const month = byMonth.get(date);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'temperature-cell cursor-interaction';
        cell.style.background = month ? temperatureColor(month[mode]) : 'transparent';
        cell.setAttribute('aria-label', month ? detailText(month) : `${date}: no observations`);
        // Pointer, keyboard focus, and tap expose the same underlying values.
        cell.addEventListener('pointerenter' , event => showDetail(event, month, date));
        cell.addEventListener('pointerleave', () => { tooltip.hidden = true; });
        cell.addEventListener('focus', event => showDetail(event, month, date));
        cell.addEventListener('blur', () => { tooltip.hidden = true; });
        cell.addEventListener('click', event => showDetail(event, month, date));
        grid.append(cell);
      });
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    root.querySelector('[data-current-mode]').textContent = `Monthly ${mode === 'max' ? 'maximum' : 'minimum'} temperature ( deg C)`;
    tooltip.hidden = true;
  }

  // Mode selects the monthly statistic used for background color.
  // Optional host state is ignored when this page runs in a normal browser.
  function setMode(nextMode, persist = false) {
    mode = nextMode === 'min' ? 'min' : 'max';
    renderMatrix();
    if (persist) window.openai?.setWidgetState?.({ modelContent: { mode } }).catch(() => {});
  }
  buttons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode, true)));
  window.addEventListener('openai:set_globals', event => {
    const savedMode = event.detail?.globals?.widgetState?.modelContent?.mode;
    if (savedMode) setMode(savedMode);
  });
  renderTemperatureLegend(root);
  renderMatrix();
}

// The build embeds the CSV so opening the page offline needs no fetch request.
if (typeof document !== 'undefined') {
  const root = document.getElementById('hong-kong-temperature');
  createTemperatureMatrix(root, aggregateMonths(root.querySelector('[data-csv]').textContent));
}
if (typeof module !== 'undefined') module.exports = { aggregateMonths, temperatureColor };
