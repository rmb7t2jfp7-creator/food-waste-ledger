"""Command line interface; run from the repository with python3 -m food_waste_ledger."""

import argparse
import json
from pathlib import Path
import sys

from . import __version__
from .ledger import LedgerError, html_report, parse_date, read_entries, summarize, text_report


def _output_paths(input_path, json_path, html_path, overwrite):
    paths = [path for path in (json_path, html_path) if path is not None]
    resolved = [path.resolve() for path in paths]
    if input_path.resolve() in resolved:
        raise LedgerError("An output path cannot be the input CSV path.")
    if len(resolved) != len(set(resolved)):
        raise LedgerError("JSON and HTML reports must have different output paths.")
    existing = [path for path in paths if path.exists()]
    if input_path.exists() and any(path.samefile(input_path) for path in existing):
        raise LedgerError("An output file cannot be the input CSV, including links to it.")
    if len(existing) == 2 and existing[0].samefile(existing[1]):
        raise LedgerError("JSON and HTML reports must be different files, including links.")
    for path in paths:
        if path.exists() and not overwrite:
            raise LedgerError(f"Output already exists: {path}. Choose another path or use --overwrite.")
        if path.exists() and not path.is_file():
            raise LedgerError(f"Output is not a regular file: {path}.")
        if not path.parent.is_dir():
            raise LedgerError(f"Output folder does not exist: {path.parent}.")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Summarize recorded food-waste mass from a local CSV file.")
    parser.add_argument("--version", action="version", version=__version__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    command = subparsers.add_parser("summarize", help="Validate all rows and summarize an inclusive date range")
    command.add_argument("input", type=Path, help="UTF-8 CSV with date,item,grams,reason and optional notes")
    command.add_argument("--start", required=True, help="First included date, YYYY-MM-DD")
    command.add_argument("--end", required=True, help="Last included date, YYYY-MM-DD")
    command.add_argument("--json", type=Path, metavar="FILE", help="Save a machine-readable JSON report")
    command.add_argument("--html", type=Path, metavar="FILE", help="Save a standalone HTML report")
    command.add_argument("--demo", action="store_true", help="Mark all report data as fictional demonstration data")
    command.add_argument("--overwrite", action="store_true", help="Allow replacement of existing report files")
    args = parser.parse_args(argv)
    try:
        start = parse_date(args.start, "start date")
        end = parse_date(args.end, "end date")
        if end < start:
            raise LedgerError("End date must be on or after start date.")
        _output_paths(args.input, args.json, args.html, args.overwrite)
        entries = read_entries(args.input)
        report = summarize(entries, start, end, args.input.name, args.demo)
        outputs = []
        if args.json:
            outputs.append((args.json, json.dumps(report, ensure_ascii=False, indent=2) + "\n"))
        if args.html:
            outputs.append((args.html, html_report(report)))
        for path, content in outputs:
            with path.open("w" if args.overwrite else "x", encoding="utf-8", newline="\n") as handle:
                handle.write(content)
        sys.stdout.write(text_report(report))
        for path, _ in outputs:
            print(f"Saved report: {path}")
        return 0
    except (LedgerError, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
