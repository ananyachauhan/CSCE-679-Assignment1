"""Build offline HTML and an inline preview from the supplied daily CSV.

Run: python build.py
Edit matrix.js for behavior and aggregation; edit matrix.css for layout.
"""
from pathlib import Path
from html import escape

# Resolve inputs relative to this script, independent of the shell directory.
folder = Path(__file__).resolve().parent
csv = (folder / 'temperature_daily.csv').read_text(encoding='utf-8-sig')
css = (folder / 'matrix.css').read_text(encoding='utf-8')
palette = (folder / 'palette.js').read_text(encoding='utf-8')
javascript = palette + '\n' + (folder / 'matrix.js').read_text(encoding='utf-8')
# Embed data, styles, and behavior into each offline visualization document.
fragment = '''<section id="hong-kong-temperature" aria-label="Hong Kong monthly temperature matrix">
<h2>Hong Kong daily temperatures, 2008-2017</h2>
<div class="chart-key"><span><i class="line-key"></i>Daily maximum</span><span><i class="line-key minimum"></i>Daily minimum</span><span>Each cell: days left to right  |  0 deg C bottom to 40 deg C top</span></div>
<div class="controls"><button type="button" class="btn" data-mode="max" aria-pressed="true">Maximum</button><button type="button" class="btn" data-mode="min" aria-pressed="false">Minimum</button><span data-current-mode aria-live="polite"></span></div>
<div class="plot-layout"><div class="matrix-scroll" role="region" aria-label="Years across columns, months down rows"><div class="axis-layout"><div class="year-axis-title">Year</div><div class="rows-layout"><div class="vertical-month-title">Month</div><div class="matrix" data-matrix></div></div></div></div>
<div class="legend" data-legend aria-label="Temperature legend from 0 to 40 degrees Celsius"></div></div>
<div class="detail" data-detail role="tooltip" hidden></div>
<script type="text/plain" data-csv>''' + csv + '''</script>
</section>
<style>''' + css + '''</style>
<script>''' + javascript + '''</script>'''
(folder / 'preview.html').write_text(fragment, encoding='utf-8')
standalone_style = '''body { margin: 10px; font: 13px Arial, sans-serif; background: white; color: #242424; } button.btn { font: inherit; padding: 6px 12px; border: 1px solid #aaa; background: white; color: #242424; cursor: pointer; } button.btn[aria-pressed="true"] { background: #242424; color: white; } .note { margin-top: 10px; line-height: 1.4; font-size: 12px; }'''
html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hong Kong daily temperature matrix</title><style>' + standalone_style + '</style><body>' + fragment + '''<p class="note">Both daily lines remain visible. Buttons switch the background between the highest daily maximum and lowest daily minimum in each month. Hover or tap along a line for the date and both temperatures. Focus a cell and use left/right arrows for daily values. Every mini chart uses 0-40 deg C vertically and day 1 to the last calendar day horizontally.<br>October 2017 ends on day 28, so the lines stop early. November and December 2017 are blank. Source: supplied temperature_daily.csv.</p></body></html>'''
(folder / 'temperature-matrix-level2.html').write_text(html, encoding='utf-8')

# Embed complete documents so each view retains its own styles and controls.
# srcdoc keeps the combined page self-contained when opened offline or shared.
# Reuse the shared layout and palette, substituting Level 1 rendering logic.
monthly_script = palette + '\n' + (folder / 'monthly.js').read_text(encoding='utf-8')
monthly_fragment = fragment.replace(javascript, monthly_script).replace(
    'Hong Kong daily temperatures, 2008-2017', 'Hong Kong monthly temperature, 1997-2017')
key_start = monthly_fragment.index('<div class="chart-key">')
key_end = monthly_fragment.index('<div class="controls">', key_start)
monthly_fragment = monthly_fragment[:key_start] + monthly_fragment[key_end:]
monthly_fragment = monthly_fragment.replace('id="hong-kong-temperature"', 'id="hong-kong-temperature" data-level="monthly"')
level1 = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hong Kong monthly temperature</title><style>' + standalone_style + '</style><body>' + monthly_fragment + '<p class="note">Each cell shows the highest daily maximum or lowest daily minimum in the month. Hover, focus, or tap for both values and observation coverage. Both modes use the same 0-40 deg C color legend. Source: supplied temperature_daily.csv.</p></body></html>'
(folder / 'temperature-matrix-level1.html').write_text(level1, encoding='utf-8')
page = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hong Kong temperature: monthly and daily views</title>
<style>
body { margin: 12px; font: 14px Arial, sans-serif; color: #242424; background: #fff; }
h1 { font-size: 21px; margin: 0 0 10px; }
.assignment-header { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #ccc; }
.assignment-header h1 { font-size: 22px; overflow-wrap: anywhere; }
.assignment-header h1 a { color: inherit; text-decoration: none; }
.assignment-header h1 a:hover { text-decoration: underline; }
.student-details { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: 0; line-height: 1.5; }
.student-details a { color: #245b88; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
.tabs button { font: inherit; padding: 7px 12px; border: 1px solid #aaa; border-radius: 4px; background: #fff; color: #242424; cursor: pointer; }
.tabs button[aria-selected="true"] { background: #242424; color: #fff; border-color: #242424; }
.tabs button:focus-visible { outline: 3px solid #4477aa; outline-offset: 3px; }
iframe { display: block; width: 100%; border: 0; min-height: 0; }
[hidden] { display: none !important; }
</style>
</head>
<body>
<header class="assignment-header">
<h1><a href="https://github.com/xiameng552180/CSCE-679-Data-Visualization-Assignment1" target="_blank" rel="noopener noreferrer">CSCE-679-Data-Visualization-Assignment1</a></h1>
<p class="student-details"><span><strong>Name:</strong> Ananya</span><span><strong>UIN:</strong> 237007426</span><span><strong>Email:</strong> <a href="mailto:ananya.a21@tamu.edu">ananya.a21@tamu.edu</a></span></p>
</header>
<div class="tabs" role="tablist" aria-label="Temperature views">
<button type="button" id="monthly-tab" role="tab" aria-controls="monthly-panel" aria-selected="true" tabindex="0">Level 1: Monthly</button>
<button type="button" id="daily-tab" role="tab" aria-controls="daily-panel" aria-selected="false" tabindex="-1">Level 2: Daily</button>
</div>
<section id="monthly-panel" role="tabpanel" aria-labelledby="monthly-tab">
<iframe title="Level 1: Monthly temperature matrix" srcdoc="''' + escape(level1, quote=True) + '''"></iframe>
</section>
<section id="daily-panel" role="tabpanel" aria-labelledby="daily-tab" hidden>
<iframe title="Level 2: Daily temperature matrix" srcdoc="''' + escape(html, quote=True) + '''"></iframe>
</section>
<script>
const tabs = [...document.querySelectorAll('[role="tab"]')];

// Match each frame to its document height, including after tab changes.
function resizeFrame(frame) {
  if (frame.closest('[hidden]')) return;
  const content = frame.contentDocument;
  if (content?.body) frame.style.height = `${content.body.scrollHeight + 24}px`;
}
document.querySelectorAll('iframe').forEach(frame => {
  frame.addEventListener('load', () => {
    resizeFrame(frame);
    new ResizeObserver(() => resizeFrame(frame)).observe(frame.contentDocument.body);
  });
});

// Keep visible panels, accessibility state, and keyboard focus order in sync.
function selectTab(selected) {
  tabs.forEach(tab => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  });
  requestAnimationFrame(() => document.querySelectorAll('iframe').forEach(resizeFrame));
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (!next) return;
    event.preventDefault();
    selectTab(next);
    next.focus();
  });
});
</script>
</body>
</html>'''
(folder / 'temperature-matrix.html').write_text(page, encoding='utf-8')
print('Built combined temperature-matrix.html, Level 2 standalone, and preview.html')

