# Food Waste Ledger

A small, offline food-waste diary analyzer for households and small kitchens. Record discarded food in a CSV file, then see which items and reasons account for the logged weight. Use the report to choose a practical change to try.

**Status: initial working prototype.** This project was created with substantial AI assistance. Its examples are fictional; no real-world trial, adoption, waste reduction, or emissions benefit has been established. It reports recorded mass, not food saved.

## Try the example

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

The report includes total recorded grams, breakdowns by item/reason/date, counts of included and excluded records, and the number of dates with entries. A date with entries is not necessarily a fully observed day. This version cannot record confirmed zero-waste days.

Mass is summed exactly in integer milligrams and emitted in JSON as decimal gram strings to avoid rounding errors. This precision does not imply that a kitchen scale is accurate to a milligram.

[Measurement guidance and limitations](docs/METHODOLOGY.md) explain consistent weighing, a useful first trial, and why these totals do not establish avoided waste or carbon savings. The project follows the general idea of food-waste measurement described by the [US EPA](https://www.epa.gov/sustainable-management-food/tools-preventing-and-diverting-wasted-food), with no affiliation or endorsement.

Your data stays on your computer while running this tool. Reports contain food labels and the input filename; they can still reveal household habits if you share them. Only fictional data belongs in public examples.

## Built and planned

**Built:** CSV validation; inclusive date filtering; exact weight totals; item/reason/date summaries; duplicate warnings; text, JSON, and standalone HTML reports; automated tests; and a GitHub Actions test workflow. The HTML uses no scripts, remote assets, or tracking.

**Possible next steps, not implemented:** a simpler entry form, explicit observation/zero-waste day records, and comparisons that account for missing observations. A first real trial and independent feedback are also still needed. These are proposals, not promised outcomes or evidence of impact.

## Development and contributing

Run the tests from the project folder:

```sh
python3 -m unittest discover -s tests -v
```

The hosted workflow runs the same suite on pushes and pull requests after publication. Its presence does not mean a hosted run has already passed. See [CONTRIBUTING.md](CONTRIBUTING.md) for bug reports, focused changes, and measurement standards.

## License

[MIT](LICENSE). This project is independent of Anthropic and any subscription program.
