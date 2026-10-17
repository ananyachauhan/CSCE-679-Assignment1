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
    const month = months.get(key) || { date: key, max: -Infinity, min: Infinity, days: 0, daily: [] };
    month.max = Math.max(month.max, +maximum);
    month.min = Math.min(month.min, +minimum);
    month.days++;
    month.daily.push({ date, day: +date.slice(8), max: +maximum, min: +minimum });
    months.set(key, month);
  }
  return [...months.values()].sort((a, b) => a.date.localeCompare(b.date)).map(month => ({
    ...month, daily: month.daily.sort((a, b) => a.day - b.day)
  }));
}

// Shared geometry makes the daily lines comparable across every month.
const MINI_CHART = { width: 100, height: 72, padding: 4, min: 0, max: 40 };
// UTC month arithmetic handles leap years without local timezone offsets.
function daysInMonth(date) {
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
/** Convert daily temperatures into SVG path commands.
 * Calendar days map left to right; temperatures share a fixed 0-40 scale.
 * SVG y increases downward, so subtract the scaled temperature from the bottom.
 * Use a new M command after a missing day instead of connecting across a gap.
 */
function dailyLinePath(daily, metric, numberOfDays) {
  const { width, height, padding, min, max } = MINI_CHART;
  let previousDay = -1;
  return daily.map(observation => {
    const x = padding + (observation.day - 1) / (numberOfDays - 1) * (width - 2 * padding);
    const y = height - padding - (observation[metric] - min) / (max - min) * (height - 2 * padding);
    const command = observation.day === previousDay + 1 ? 'L' : 'M';
    previousDay = observation.day;
    return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}
// Overlay both daily series; CSS defines their green and light-blue strokes.
function createDailyChart(month) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 100 72');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  for (const metric of ['max', 'min']) {
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', dailyLinePath(month.daily, metric, daysInMonth(month.date)));
    path.setAttribute('class', `daily-line daily-${metric}`);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(path);
  }
  return svg;
}

/** Create the matrix, bind its controls, and render the shared color legend.
 * Each call owns its state inside one document, keeping the two tabs independent.
 */
function createTemperatureMatrix(root, monthlyData) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const lastYear = +monthlyData.at(-1).date.slice(0, 4);
  // Include the final calendar year and the preceding nine years.
  const firstYear = lastYear - 9;
  const byMonth = new Map(monthlyData.filter(month => +month.date.slice(0, 4) >= firstYear).map(month => [month.date, month]));
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
  function showDetail(event, month, date, selectedDay) {
    const cellBox = event.currentTarget.getBoundingClientRect();
    let day = selectedDay;
    if (day === undefined && Number.isFinite(event.clientX) && event.type !== 'focus') {
      // Invert the same padded x scale used by dailyLinePath to select a day.
      const chartX = (event.clientX - cellBox.left) / cellBox.width * MINI_CHART.width;
      day = Math.max(1, Math.min(daysInMonth(date), Math.round(1 +
        (chartX - MINI_CHART.padding) / (MINI_CHART.width - 2 * MINI_CHART.padding) * (daysInMonth(date) - 1))));
    }
    const observation = month?.daily.find(record => record.day === day);
    tooltip.textContent = day === undefined ? (month ? detailText(month) : `${date}  |  No observations`) :
      observation ? `${observation.date}  |  Maximum: ${observation.max} deg C  |  Minimum: ${observation.min} deg C` :
        `${date}-${String(day).padStart(2, '0')}  |  No observations`;
    tooltip.hidden = false;
    const rootBox = root.getBoundingClientRect();
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
        if (month) cell.append(createDailyChart(month));
        // Pointer, keyboard focus, and tap expose the same underlying values.
        cell.addEventListener('pointerenter' , event => showDetail(event, month, date));
        cell.addEventListener('pointermove', event => showDetail(event, month, date));
        cell.addEventListener('pointerleave', () => { tooltip.hidden = true; });
        cell.addEventListener('focus', event => showDetail(event, month, date));
        cell.addEventListener('blur', () => { tooltip.hidden = true; });
        cell.addEventListener('click', event => showDetail(event, month, date));
        // Arrow keys inspect individual days; Escape dismisses the tooltip.
        let keyboardDay = 1;
        cell.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === 'Escape') { tooltip.hidden = true; return; }
          keyboardDay = Math.max(1, Math.min(daysInMonth(date), keyboardDay + (event.key === 'ArrowRight' ? 1 : -1)));
          showDetail(event, month, date, keyboardDay);
        });
        grid.append(cell);
      });
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    root.querySelector('[data-current-mode]').textContent = `Background: monthly ${mode === 'max' ? 'maximum' : 'minimum'} ( deg C)`;
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
if (typeof module !== 'undefined') module.exports = { aggregateMonths, daysInMonth, dailyLinePath };
