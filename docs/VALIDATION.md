# Initial validation

On October 7, 2026, the initial version passed all **34 automated tests** locally using **Python 3.9.6** on macOS:

```sh
python3 -m unittest discover -s tests -v
```

The checks cover exact mass arithmetic, inclusive dates, malformed CSV and invalid values, missing data, duplicate handling, output escaping, command-line exports, and protecting the input file from accidental replacement through an output path (including symlinks and hardlinks).

The documented fictional example was run successfully and generated 430.5 g from six entries during October 1–7, with five dates containing entries and two out-of-period records excluded. Its HTML report was generated locally. These are software verification results using fictional data, not measured environmental results.

The GitHub Actions configuration includes Python 3.9, 3.11, 3.13, and 3.14. Hosted runs and those additional interpreters have not been verified at initial preparation; check the repository's Actions results after publication.

Known limits: no observed-zero-day representation, no independent measurement validation, no controlled trial, no causal reduction estimate, and no emissions model. Read [METHODOLOGY.md](METHODOLOGY.md) before interpreting a diary.

## Browser diary upgrade

The browser upgrade passed **11 Node core tests** locally, and the unchanged Python CLI passed its **34 tests** again. The Node checks cover exact totals beyond JavaScript Number precision, invalid mass and calendar dates, inclusive/leap-day filtering, unknown dates, duplicate records, strict JSON backup validation, CSV quoting, fictional labeling, and arbitrary reason labels. Static syntax checks passed for the browser scripts. These automated core checks do not claim a human usability study or real environmental outcomes.

The app's browser interactions require separate browser QA; publication and its latest hosted CI result must be checked against the actual uploaded version.
