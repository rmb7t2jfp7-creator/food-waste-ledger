# Food Waste Ledger

[Try it in your browser](https://rmb7t2jfp7-creator.github.io/food-waste-ledger/) · [Test results](https://github.com/rmb7t2jfp7-creator/food-waste-ledger/actions)

A small food-waste diary for households and small kitchens, with a phone-friendly browser app and an offline Python CSV analyzer. Record discarded food, see which reasons account for its logged weight, and choose one practical change to try.

**Status: initial working prototype.** This project was created with substantial AI assistance. Its examples are fictional; no real-world trial, adoption, waste reduction, or emissions benefit has been established. It reports recorded mass, not food saved.

## Use the browser diary

Open `index.html` in a modern browser. The app uses only the included files, with no accounts, dependencies, remote assets, analytics, or data submission. A hosted page fetches only its app files. It works with local files where your browser permits them. If local-file restrictions prevent loading or saving, run the following from this folder and open `http://localhost:8000`:

```sh
python3 -m http.server 8000
```

For use on a phone, a GitHub Pages deployment can serve the same static files. Each browser and site address has its own diary; there is no automatic sync. A hosted page needs its assets to load, so keep a local copy if you need dependable offline access.

- Add a food item, date, positive weight, reason, and optional notes. Edit or delete entries using their buttons.
- Use **Save daily check-in** to describe how completely you observed that date. **No food discarded** (`zero`) means you report observing the day with no discarded food in your chosen scope and requires no entries for that date. **All discarded food recorded** (`complete`) means you report finishing the day's logging and requires at least one entry. **Only part of the day recorded** (`partial`) means observation or logging was incomplete and can have any number of entries. No check-in means **unknown**, even if some food entries exist. These are your own reports, not independent verification.
- Choose **From** and **Through**, then **Apply**. Both dates are included. Totals and the reason chart describe recorded discarded mass only.
- **Try fictional sample** loads six clearly marked examples totaling **430.5 g**. It asks before replacing an existing diary. Changes in sample mode remain fictional; use **Start fresh** for your own observations.
- **Back up JSON** saves the whole diary, its personal/fictional status, and daily check-ins in schema version 2. **Import backup** validates the complete file before replacing anything. Version-1 backups migrate with their entries preserved and no inferred check-ins. The browser accepts up to 1,000 entries, 200-character labels, and 2,000-character notes. Unknown fields, invalid dates/weights, repeated IDs, and check-ins inconsistent with their day's entries are rejected.
- **Export food entries** saves all food entries in the Python tool's existing schema, including entries outside the current filter. **Export check-ins** creates a separate CSV that preserves observation dates, statuses, and notes. Use JSON when you want a complete, restorable backup. The legacy entries CSV and Python analyzer cannot represent daily check-ins or distinguish observed zero days. Fictional exports are marked. Import label columns as text when opening CSV in a spreadsheet; formulas entered as labels remain literal text in the export and may be interpreted by spreadsheet software.

The browser uses local storage when available. If access is blocked, storage is full, or a saved copy is malformed, the app displays a warning and lets you work in memory. It does not claim unsaved changes are saved. A malformed stored copy is preserved until you explicitly confirm importing a valid replacement backup or use **Start fresh**. Export a backup before closing if a storage warning is visible. Clearing browser data, private browsing, or changing devices/site addresses can lose access to the diary.

Labels are inserted as text, and chart weights are summed exactly using integer milligrams (`BigInt`). No missing date is converted into a confirmed zero-waste observation.

## Build a useful record without coding

Use the diary for a routine you actually want to understand. Log food during normal disposal, spend about two minutes on an honest daily check-in, and write one actual finding when reviewing the week. If you have no kitchen scale and discarded food, do not invent weights or mark zero: use partial and note that the food was not weighed. Keep dated backups privately. A missed day should stay unknown or partial; do not fill gaps with invented zeros. Dates and records are user-entered and editable, so the diary is self-reported use, not independent verification or a tamper-proof audit.

When something is confusing or broken, open a [plain-language feedback issue](https://github.com/rmb7t2jfp7-creator/food-waste-ledger/issues/new?template=feedback.yml): say what you tried, expected, and saw, using a fictional example. You do not have to change code to provide useful feedback. Publish an update when a real improvement has been made and checked, with a link to the issue it addresses.

The [usage journal guide](docs/USAGE-JOURNAL.md) includes a short daily/weekly routine and empty templates for observations, feedback, and improvement checks. It separates your own reports from independent review and measured impact.

## Try the Python example

You need **Python 3.9 or newer**. No package installation, account, API key, or internet connection is needed to run the program. On Windows, use `py -3` in place of `python3` if necessary.

Download or clone this project, open a terminal in its folder, and run:

```sh
python3 -m food_waste_ledger summarize examples/fictional-food-waste.csv --start 2026-10-01 --end 2026-10-07 --demo --html demo-report.html --json demo-report.json
```

Double-click `demo-report.html` to view the report in your browser. The same summary appears in the terminal; `demo-report.json` can be read by other tools. Existing report files are protected: use different output filenames or add `--overwrite` to replace them deliberately.

The fictional example produces **430.5 g** from **6 entries** across **5 of 7 calendar days**. Two records outside the requested dates are excluded. The two dates without entries are unknown, not measured zero-waste days. `--demo` marks every output as fictional.

A ready-made [fictional report](examples/demo-report.html) is also included. Download and open that file to see it without running Python.

## Use your own diary

Copy `examples/blank-ledger.csv` to a new file under a folder named `data`, which is excluded from Git by default. Fill it in with your own observations using a text editor or spreadsheet, then save it as UTF-8 CSV.

Use this structure; the row below is **fictional**:

```csv
date,item,grams,reason,notes
2026-10-07,Rice,125,Overprepared,Fictional example only
```

| Column | Meaning |
| --- | --- |
| `date` | Calendar date in `YYYY-MM-DD` format. |
| `item` | Food name, such as Rice. Required. |
| `grams` | Positive weight in grams, without units or commas. Up to three decimal places and twelve digits before the decimal. |
| `reason` | Your reason for discarding it, such as Overprepared. Required. |
| `notes` | Optional context. The whole column may be omitted. Notes are not included in aggregate reports. |

Keep the required column names exactly as shown; their order may vary. Quote fields containing commas. Labels are grouped after trimming surrounding whitespace; `Rice` and `rice` remain separate. Blank lines are ignored. Malformed records, duplicate column names, unknown columns, blank required values, negative or zero weights, NaN, and infinite values are rejected with an error.

For your diary, omit `--demo` and choose the dates you actually observed:

```sh
python3 -m food_waste_ledger summarize data/my-food-waste.csv --start 2026-10-01 --end 2026-10-07 --html my-report.html
```

Both date boundaries are included. The program validates the entire CSV, including entries outside the requested period. Correct an invalid row before generating a report. It never modifies the input CSV. Identical records remain in the totals but trigger a warning for you to review.

## Read the report honestly

The Python report includes total recorded grams, breakdowns by item/reason/date, counts of included and excluded records, and the number of dates with entries. A date with entries is not necessarily a fully observed day. The browser's separate daily check-ins can distinguish self-reported zero, complete, and partial observations; the Python report and its entries-only CSV cannot. A complete check-in describes your own reporting coverage, not independent confirmation that nothing was missed.

Mass is summed exactly in integer milligrams and emitted in JSON as decimal gram strings to avoid rounding errors. This precision does not imply that a kitchen scale is accurate to a milligram.

[Measurement guidance and limitations](docs/METHODOLOGY.md) explain consistent weighing, a useful first trial, and why these totals do not establish avoided waste or carbon savings. The project follows the general idea of food-waste measurement described by the [US EPA](https://www.epa.gov/sustainable-management-food/tools-preventing-and-diverting-wasted-food), with no affiliation or endorsement.

Your data stays on your computer while running this tool. Reports contain food labels and the input filename; they can still reveal household habits if you share them. Only fictional data belongs in public examples.

## Built and planned

**Built:** a responsive browser diary with add/edit/delete, inclusive date filtering, exact weight totals, a reason chart, duplicate warnings, explicit fictional sample mode, and daily check-ins for self-reported zero/complete/partial coverage. It includes local saving with visible failure notices, schema-version-2 JSON backup/import with version-1 migration, Python-compatible entries CSV export, and a separate check-ins CSV export. The Python CLI includes CSV validation, item/reason/date summaries, and text, JSON, and standalone HTML reports; it still processes entries only. The static Python HTML reports use no scripts; the interactive browser app uses only local JavaScript. Both use no remote assets or tracking.

**Possible next steps, not implemented:** comparisons that account for observation coverage and check-in-aware Python reports. A real trial and independent feedback have not been established. These are proposals, not promised outcomes or evidence of impact. See [CHANGELOG.md](CHANGELOG.md) for the changes in version 0.3.0.

## Development and contributing

Run the tests from the project folder:

```sh
python3 -m unittest discover -s tests -v
node --test core.test.js
```

The browser core tests need Node.js 18 or newer; running the browser app itself does not need Node or Python. No package installation is needed. Test counts change as the app develops; run these commands or inspect the latest matching GitHub Actions run for current results. Browser interaction checks are separate from these data-logic tests.

The hosted workflow runs Python and Node checks on pushes and pull requests after publication. Its presence does not establish that the latest hosted revision has passed; check GitHub Actions for the actual result. See [CONTRIBUTING.md](CONTRIBUTING.md) for bug reports, focused changes, and measurement standards.

## License

[MIT](LICENSE).
