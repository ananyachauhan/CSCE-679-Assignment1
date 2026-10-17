# CSCE-679-Data-Visualization-Assignment1

Hong Kong temperature visualizations by Ananya.

## View project

[Open the interactive temperature visualizations](https://ananyachauhan.github.io/CSCE-679-Assignment1-Ananya/temperature-matrix.html)

This link becomes available after the project files are uploaded and GitHub Pages is enabled for this repository. To publish, open the repository's **Settings > Pages**, choose **Deploy from a branch**, and select the branch containing these files and the **/ (root)** folder.

- UIN: 237007426
- Email: ananya.a21@tamu.edu

## Open the visualization

Open `temperature-matrix.html` in a browser. It contains two tabs and works offline, without a server or installed dependencies.

- **Level 1: Monthly** displays monthly temperature extremes for 1997-2017.
- **Level 2: Daily** displays daily maximum and minimum lines within monthly cells for 2008-2017.

Both views include axes, a shared temperature palette, maximum/minimum background controls, and hover details. November and December 2017 have no observations. October 2017 ends on day 28.

## Source files

| File | Purpose |
| --- | --- |
| `monthly.js` | Level 1 data aggregation, cells, and interactions |
| `matrix.js` | Level 2 daily SVG charts and interactions |
| `palette.js` | Shared temperature colors and legend |
| `matrix.css` | Layout and styling |
| `build.py` | Builds both views and the combined tabbed page |
| `temperature_daily.csv` | Original daily observations |

The charts use JavaScript, SVG, HTML, and CSS. Python only assembles the standalone HTML files.

## Rebuild after editing

Requires Python 3, with no additional packages:

```sh
python build.py
```

Then reopen or refresh `temperature-matrix.html`. The build also generates standalone Level 1 and Level 2 pages and a preview fragment.

## Data definitions

Monthly maximum is the highest daily maximum within a month. Monthly minimum is the lowest daily minimum within a month. Daily mini charts share a 0-40 degrees Celsius vertical scale; their horizontal scale covers day 1 through the last calendar day of each month. Lines stop where observations stop and break across missing days.

## Assignment and data source

[Original assignment repository](https://github.com/xiameng552180/CSCE-679-Data-Visualization-Assignment1)

The supplied CSV is included so the visualization can be rebuilt offline.
