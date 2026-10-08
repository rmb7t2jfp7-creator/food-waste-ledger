# Initial validation

On October 7, 2026, the initial version passed all **34 automated tests** locally using **Python 3.9.6** on macOS:

```sh
python3 -m unittest discover -s tests -v
```

The checks cover exact mass arithmetic, inclusive dates, malformed CSV and invalid values, missing data, duplicate handling, output escaping, command-line exports, and protecting the input file from accidental replacement through an output path (including symlinks and hardlinks).

The documented fictional example was run successfully and generated 430.5 g from six entries during October 1–7, with five dates containing entries and two out-of-period records excluded. Its HTML report was generated locally. These are software verification results using fictional data, not measured environmental results.

The GitHub Actions configuration includes Python 3.9, 3.11, 3.13, and 3.14. Hosted runs and those additional interpreters have not been verified at initial preparation; check the repository's Actions results after publication.

Limits at that initial Python-only validation included no observed-zero-day representation. The Python analyzer still processes food entries only. Independent measurement validation, a controlled trial, a causal reduction estimate, and an emissions model have not been established. Read [METHODOLOGY.md](METHODOLOGY.md) before interpreting a diary.

## Browser diary upgrade

The browser upgrade passed **11 Node core tests** locally, and the unchanged Python CLI passed its **34 tests** again. The Node checks cover exact totals beyond JavaScript Number precision, invalid mass and calendar dates, inclusive/leap-day filtering, unknown dates, duplicate records, strict JSON backup validation, CSV quoting, fictional labeling, and arbitrary reason labels. Static syntax checks passed for the browser scripts. These automated core checks do not claim a human usability study or real environmental outcomes.

The counts above describe the earlier browser upgrade, not the current test suite. Daily check-ins and schema-version-2 backups add behavior that requires its own checks. Run the documented test commands and inspect the GitHub Actions run for the exact revision being used. Browser interactions, publication, and the latest hosted CI result must be checked separately against that revision; this document does not establish that a new revision has passed.

## Daily check-ins (0.3.0)

The local update passed 24 Node data-logic tests and the unchanged 34 Python tests. The new checks cover version-1 migration without invented observations, version-2 round trips, check-in status/date/uniqueness validation, zero and complete conflict rules, date-filtered coverage, separate check-in CSV output, and UTF-8 backup size limits.

Browser QA used fictional data only. In the in-app browser, an existing diary survived reload; partial and explicit zero check-ins updated coverage, and a conflicting zero check-in was rejected without changing recorded mass. In desktop Safari, deletion of the last entry on a complete day was rejected, removing a check-in kept its food entries, and both JSON and check-in CSV downloads appeared. Importing a version-1 fixture kept six entries and added no check-ins; importing the newly downloaded version-2 backup restored six entries and five check-ins, which persisted after reload.

The check-in form was visually reviewed in desktop Safari at its normal and a narrower CSS viewport using page zoom. This was not physical-phone testing or a screen-reader audit. Static checks covered script syntax, DOM IDs, accessibility references, asset paths, issue-form YAML, and whitespace. Check the Actions run for the published revision for hosted CI results. These software checks do not demonstrate real-world adoption or environmental benefit.
