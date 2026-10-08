from datetime import date
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from food_waste_ledger.ledger import (
    Entry, LedgerError, grams_text, html_report, parse_date, parse_mass,
    read_entries, summarize, text_report,
)


ROOT = Path(__file__).resolve().parents[1]


class MassAndDatesTests(unittest.TestCase):
    def test_exact_decimal_arithmetic(self):
        self.assertEqual(grams_text(parse_mass("0.1") + parse_mass("0.2")), "0.3")
        self.assertEqual(grams_text(parse_mass("125.500")), "125.5")
        self.assertEqual(grams_text(parse_mass("0.001")), "0.001")
        self.assertEqual(grams_text(parse_mass("0010")), "10")

    def test_invalid_weights(self):
        for value in ("0", "0.000", "-1", "NaN", "nan", "inf", "Infinity", "1e3",
                      "1,000", "10 g", "", "0.0001", ".5", "1.", "1_000", "9999999999999"):
            with self.subTest(value=value), self.assertRaises(LedgerError):
                parse_mass(value)

    def test_date_validation(self):
        self.assertEqual(parse_date("2024-02-29"), date(2024, 2, 29))
        for value in ("2026-02-29", "2026-13-01", "2026-1-01", "20261001", "today", "0000-01-01"):
            with self.subTest(value=value), self.assertRaises(LedgerError):
                parse_date(value)


class CsvTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "food.csv"

    def read(self, content):
        self.path.write_text(content, encoding="utf-8")
        return read_entries(self.path)

    def test_bom_quoted_commas_and_whitespace(self):
        entries = self.read('\ufeffdate,item,grams,reason,notes\n2026-10-01," Rice, cooked ", 10.5 , Leftover , note \n')
        self.assertEqual(entries, [Entry(date(2026, 10, 1), "Rice, cooked", 10500, "Leftover", "note")])

    def test_header_order_and_optional_notes(self):
        entries = self.read("reason,grams,item,date\nStale,10,Bread,2026-10-01\n")
        self.assertEqual(entries[0].notes, "")

    def test_header_only_is_valid_empty_log(self):
        self.assertEqual(self.read("date,item,grams,reason\n"), [])

    def test_bad_headers(self):
        for content in ("", "date,item,grams\n", "date,item,grams,reason,grams\n",
                        "date,item,grams,reason,gramz\n", "date,item, grams,reason\n"):
            with self.subTest(content=content), self.assertRaises(LedgerError):
                self.read(content)

    def test_wrong_number_of_columns(self):
        for row in ("2026-10-01,Rice,10", "2026-10-01,Rice,10,Leftover,extra"):
            with self.subTest(row=row), self.assertRaisesRegex(LedgerError, "column count"):
                self.read("date,item,grams,reason\n" + row + "\n")

    def test_every_required_cell_must_be_present(self):
        for column in range(4):
            row = ["2026-10-01", "Rice", "10", "Leftover"]
            row[column] = "   "
            with self.subTest(column=column), self.assertRaisesRegex(LedgerError, "must not be blank"):
                self.read("date,item,grams,reason\n" + ",".join(row) + "\n")

    def test_unclosed_quote_is_rejected(self):
        with self.assertRaisesRegex(LedgerError, "valid UTF-8 CSV"):
            self.read('date,item,grams,reason\n2026-10-01,"Rice,10,Leftover\n')

    def test_invalid_utf8(self):
        self.path.write_bytes(b"date,item,grams,reason\n2026-10-01,\xff,10,Leftover\n")
        with self.assertRaisesRegex(LedgerError, "valid UTF-8 CSV"):
            read_entries(self.path)

    def test_bad_row_names_line_number(self):
        with self.assertRaisesRegex(LedgerError, "CSV line 2"):
            self.read("date,item,grams,reason\n2026-10-01,Rice,-1,Leftover\n")

    def test_multiline_note_is_supported(self):
        entries = self.read('date,item,grams,reason,notes\n2026-10-01,Rice,10,Leftover,"one\ntwo"\n')
        self.assertEqual(entries[0].notes, "one\ntwo")


class ReportTests(unittest.TestCase):
    def test_sample_inclusive_boundaries_and_coverage(self):
        entries = read_entries(ROOT / "examples" / "fictional-food-waste.csv")
        result = summarize(entries, date(2026, 10, 1), date(2026, 10, 7), demo=True)
        self.assertEqual(result["entry_count"], 6)
        self.assertEqual(result["excluded_entry_count"], 2)
        self.assertEqual(result["total_grams"], "430.5")
        self.assertEqual(result["days_with_entries"], 5)
        self.assertEqual(result["days_without_entries"], 2)
        self.assertEqual(result["by_reason"][0], {"label": "Overprepared", "entry_count": 2, "grams": "200.5"})
        self.assertEqual(result["by_date"][-1]["label"], "2026-10-07")
        self.assertIn("FICTIONAL", result["data_status"])

    def test_single_day_range(self):
        entry = Entry(date(2026, 10, 1), "Rice", 10000, "Leftover")
        result = summarize([entry], entry.day, entry.day)
        self.assertEqual(result["calendar_days"], 1)
        self.assertEqual(result["total_grams"], "10")

    def test_reversed_date_range(self):
        with self.assertRaises(LedgerError):
            summarize([], date(2026, 10, 2), date(2026, 10, 1))

    def test_empty_period_does_not_claim_zero_waste(self):
        result = summarize([], date(2026, 10, 1), date(2026, 10, 7))
        self.assertEqual(result["total_grams"], "0")
        self.assertEqual(result["days_without_entries"], 7)
        self.assertIn("not verified zero waste", result["warnings"][0])
        self.assertIn("not zero-waste days", text_report(result))

    def test_duplicate_records_retained_and_flagged(self):
        entry = Entry(date(2026, 10, 1), "Rice", 10000, "Leftover")
        result = summarize([entry, entry, entry], entry.day, entry.day)
        self.assertEqual(result["total_grams"], "30")
        self.assertEqual(result["repeated_record_count"], 2)
        self.assertIn("accidental duplicates", result["warnings"][0])

    def test_labels_remain_case_sensitive(self):
        day = date(2026, 10, 1)
        result = summarize([Entry(day, "Rice", 1000, "Leftover"), Entry(day, "rice", 1000, "Leftover")], day, day)
        self.assertEqual(len(result["by_item"]), 2)

    def test_html_escapes_all_user_supplied_content(self):
        day = date(2026, 10, 1)
        result = summarize([Entry(day, '<script>alert("x")</script>', 1, "<img src=x>")],
                           day, day, "<iframe>.csv", demo=True)
        html = html_report(result)
        self.assertNotIn("<script>", html)
        self.assertNotIn("<img src=x>", html)
        self.assertNotIn("<iframe>", html)
        self.assertIn("&lt;script&gt;", html)
        self.assertIn("FICTIONAL DEMONSTRATION DATA", html)
        self.assertIn("Unlogged does not mean zero waste", html)
        self.assertIn("emissions reductions", html)
        self.assertIn("Content-Security-Policy", html)

    def test_terminal_labels_cannot_inject_raw_controls(self):
        day = date(2026, 10, 1)
        result = summarize([Entry(day, "\x1b[31mRice", 1, "Leftover")], day, day)
        self.assertNotIn("\x1b", text_report(result))


class CliTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="food ledger test ")
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.path = self.folder / "food input.csv"
        self.path.write_text("date,item,grams,reason\n2026-10-01,Rice,0.1,Leftover\n"
                             "2026-10-01,Rice,0.2,Leftover\n", encoding="utf-8")

    def run_cli(self, *extra, input_path=None, dates=True):
        args = [sys.executable, "-m", "food_waste_ledger", "summarize", str(input_path or self.path)]
        if dates:
            args.extend(["--start", "2026-10-01", "--end", "2026-10-07"])
        return subprocess.run(args + [str(arg) for arg in extra], cwd=ROOT, capture_output=True, text=True)

    def test_end_to_end_exports_paths_with_spaces(self):
        json_path = self.folder / "result file.json"
        html_path = self.folder / "result file.html"
        result = self.run_cli("--json", json_path, "--html", html_path, "--demo")
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(json_path.read_text(encoding="utf-8"))
        self.assertEqual(data["total_grams"], "0.3")
        self.assertEqual(data["entry_count"], 2)
        self.assertEqual(data["days_with_entries"], 1)
        self.assertIn("FICTIONAL DEMONSTRATION DATA", html_path.read_text(encoding="utf-8"))
        self.assertIn("0.3 g", result.stdout)

    def test_invalid_row_outside_range_also_fails(self):
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write("2020-01-01,Bread,-10,Stale\n")
        output = self.folder / "no.json"
        result = self.run_cli("--json", output)
        self.assertEqual(result.returncode, 2)
        self.assertIn("CSV line 4", result.stderr)
        self.assertFalse(output.exists())
        self.assertNotIn("Traceback", result.stderr)

    def test_missing_file(self):
        result = self.run_cli(input_path=self.folder / "missing.csv")
        self.assertEqual(result.returncode, 2)
        self.assertNotIn("Traceback", result.stderr)

    def test_dates_are_mandatory(self):
        result = self.run_cli(dates=False)
        self.assertEqual(result.returncode, 2)
        self.assertIn("--start", result.stderr)

    def test_invalid_or_reversed_dates(self):
        for start, end in (("2026-02-30", "2026-10-07"), ("2026-10-08", "2026-10-07")):
            with self.subTest(start=start, end=end):
                result = self.run_cli("--start", start, "--end", end, dates=False)
                self.assertEqual(result.returncode, 2)
                self.assertNotIn("Traceback", result.stderr)

    def test_output_does_not_overwrite_input(self):
        original = self.path.read_bytes()
        result = self.run_cli("--json", self.path, "--overwrite")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(self.path.read_bytes(), original)

    def test_output_links_do_not_overwrite_input(self):
        original = self.path.read_bytes()
        alias = self.folder / "alias.json"
        os.link(self.path, alias)
        result = self.run_cli("--json", alias, "--overwrite")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(self.path.read_bytes(), original)

    def test_output_symlinks_do_not_overwrite_input(self):
        alias = self.folder / "symlink.json"
        try:
            alias.symlink_to(self.path)
        except OSError:
            self.skipTest("Symlinks unavailable in this environment")
        result = self.run_cli("--json", alias, "--overwrite")
        self.assertEqual(result.returncode, 2)

    def test_existing_report_requires_explicit_overwrite(self):
        output = self.folder / "existing.json"
        output.write_text("keep me", encoding="utf-8")
        result = self.run_cli("--json", output)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(output.read_text(encoding="utf-8"), "keep me")
        result = self.run_cli("--json", output, "--overwrite")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(output.read_text(encoding="utf-8"))["total_grams"], "0.3")

    def test_same_path_for_both_reports_rejected(self):
        output = self.folder / "report"
        result = self.run_cli("--json", output, "--html", output)
        self.assertEqual(result.returncode, 2)
        self.assertFalse(output.exists())

    def test_reports_cannot_be_hardlinks_to_same_file(self):
        first = self.folder / "report.json"
        second = self.folder / "report.html"
        first.write_text("keep me", encoding="utf-8")
        os.link(first, second)
        result = self.run_cli("--json", first, "--html", second, "--overwrite")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(first.read_text(encoding="utf-8"), "keep me")

    def test_all_output_paths_checked_before_writing(self):
        json_path = self.folder / "new.json"
        html_path = self.folder / "existing.html"
        html_path.write_text("keep me", encoding="utf-8")
        result = self.run_cli("--json", json_path, "--html", html_path)
        self.assertEqual(result.returncode, 2)
        self.assertFalse(json_path.exists())
        self.assertEqual(html_path.read_text(encoding="utf-8"), "keep me")

    def test_missing_output_folder_fails_cleanly(self):
        result = self.run_cli("--html", self.folder / "missing" / "report.html")
        self.assertEqual(result.returncode, 2)
        self.assertIn("folder does not exist", result.stderr)


if __name__ == "__main__":
    unittest.main()
