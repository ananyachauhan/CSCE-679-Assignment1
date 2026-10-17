/* Shared assignment palette, sampled from the supplied vertical legend.
 * Integer boundaries retain the reference's existing warm-cell colors.
 * Both levels and both temperature modes use this exact same mapping.
 */
const TEMPERATURE_BINS = [
  { upper: 4, color: '#5e4fa2', label: '0-3 deg C' },
  { upper: 8, color: '#3288bd', label: '4-7 deg C' },
  { upper: 11, color: '#66c2a5', label: '8-10 deg C' },
  { upper: 15, color: '#abdda4', label: '11-14 deg C' },
  { upper: 18, color: '#e6f598', label: '15-17 deg C' },
  { upper: 22, color: '#ffffbf', label: '18-21 deg C' },
  { upper: 25, color: '#fee08b', label: '22-24 deg C' },
  { upper: 29, color: '#fdae61', label: '25-28 deg C' },
  { upper: 32, color: '#f46d43', label: '29-31 deg C' },
  { upper: 36, color: '#d53e4f', label: '32-35 deg C' },
  { upper: Infinity, color: '#9e0142', label: '36-40 deg C' }
];
// Upper bounds are exclusive: for example, 25 belongs to the 25-28 band.
function temperatureColor(value) {
  return TEMPERATURE_BINS.find(bin => value < bin.upper).color;
}
// Build the vertical cold-to-hot strip from the same bins used by the cells.
function renderTemperatureLegend(root) {
  const legend = root.querySelector('[data-legend]');
  const top = document.createElement('span');
  top.className = 'legend-endpoint legend-top';
  top.textContent = '0 deg C';
  const bottom = document.createElement('span');
  bottom.className = 'legend-endpoint legend-bottom';
  bottom.textContent = '40 deg C';
  const strip = document.createElement('div');
  strip.className = 'legend-strip';
  for (const bin of TEMPERATURE_BINS) {
    const swatch = document.createElement('div');
    swatch.style.background = bin.color;
    swatch.title = bin.label;
    swatch.setAttribute('aria-label', bin.label);
    strip.append(swatch);
  }
  legend.replaceChildren(strip, top, bottom);
}
if (typeof module !== 'undefined') module.exports = { TEMPERATURE_BINS, temperatureColor };
