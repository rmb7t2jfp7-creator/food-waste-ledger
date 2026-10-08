"""CSV validation, exact mass arithmetic, and transparent report generation."""

import csv
from dataclasses import dataclass
from datetime import date
from html import escape
from pathlib import Path
import re
from typing import Dict, List


REQUIRED_FIELDS = ("date", "item", "grams", "reason")
LIMITATIONS = (
    "This report describes discarded food mass recorded in the input file. "
    "It does not independently verify observations or establish avoided waste, "
    "emissions reductions, or environmental benefit.",
    "Dates without entries are unlogged dates, not evidence of zero food waste. "
    "Do not compare periods as reductions unless logging coverage and methods are comparable.",
    "Mass includes exactly what the recorder weighed. Packaging, liquids, and "
    "inedible parts can change results; use a consistent weighing method.",
)


class LedgerError(ValueError):
    """An input that cannot safely be interpreted as ledger data."""


@dataclass(frozen=True)
class Entry:
    day: date
    item: str
    milligrams: int
    reason: str
    notes: str = ""


def parse_date(value: str, label: str = "date") -> date:
    if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise LedgerError(f"{label}: use YYYY-MM-DD (received {value!r}).")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise LedgerError(f"{label}: {value!r} is not a real calendar date.") from exc


def parse_mass(value: str) -> int:
    # Integer milligrams avoid floating-point rounding and nonfinite numbers.
    if not re.fullmatch(r"[0-9]{1,12}(?:\.[0-9]{1,3})?", value):
        raise LedgerError(
            "grams must be a positive decimal with at most 12 digits before "
            "and 3 digits after the decimal point; no units or exponent notation."
        )
    whole, _, fraction = value.partition(".")
    milligrams = int(whole) * 1000 + int(fraction.ljust(3, "0") or "0")
    if milligrams == 0:
        raise LedgerError("grams must be greater than zero; record discarded mass only.")
    return milligrams


def grams_text(milligrams: int) -> str:
    whole, fraction = divmod(milligrams, 1000)
    return f"{whole}.{fraction:03d}".rstrip("0").rstrip(".") if fraction else str(whole)


def read_entries(path: Path) -> List[Entry]:
    entries = []
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, strict=True)
            fields = reader.fieldnames
            if not fields:
                raise LedgerError("The CSV is empty; add the header date,item,grams,reason.")
            if len(fields) != len(set(fields)):
                raise LedgerError("Duplicate CSV column names are not allowed.")
            missing = set(REQUIRED_FIELDS) - set(fields)
            unknown = set(fields) - set(REQUIRED_FIELDS) - {"notes"}
            if missing or unknown:
                parts = []
                if missing:
                    parts.append("missing columns: " + ", ".join(sorted(missing)))
                if unknown:
                    parts.append("unknown columns: " + ", ".join(sorted(unknown)))
                raise LedgerError("Invalid CSV header (" + "; ".join(parts) + ").")
            for row in reader:
                location = f"CSV line {reader.line_num}"
                if None in row or any(value is None for value in row.values()):
                    raise LedgerError(f"{location}: column count does not match the header.")
                clean = {key: value.strip() for key, value in row.items()}
                for field in REQUIRED_FIELDS:
                    if not clean[field]:
                        raise LedgerError(f"{location}: {field} must not be blank.")
                try:
                    entries.append(Entry(
                        day=parse_date(clean["date"]),
                        item=clean["item"],
                        milligrams=parse_mass(clean["grams"]),
                        reason=clean["reason"],
                        notes=clean.get("notes", ""),
                    ))
                except LedgerError as exc:
                    raise LedgerError(f"{location}: {exc}") from exc
    except (csv.Error, UnicodeError) as exc:
        raise LedgerError(f"Cannot read CSV as valid UTF-8 CSV: {exc}") from exc
    return entries


def _groups(entries: List[Entry], attribute: str) -> List[Dict[str, object]]:
    groups = {}
    for entry in entries:
        label = getattr(entry, attribute)
        if isinstance(label, date):
            label = label.isoformat()
        count, mass = groups.get(label, (0, 0))
        groups[label] = (count + 1, mass + entry.milligrams)
    order = sorted(groups, key=lambda label: (-groups[label][1], label.casefold(), label))
    if attribute == "day":
        order = sorted(groups)
    return [
        {"label": label, "entry_count": groups[label][0], "grams": grams_text(groups[label][1])}
        for label in order
    ]


def summarize(entries: List[Entry], start: date, end: date,
              source_name: str = "input.csv", demo: bool = False) -> Dict[str, object]:
    if end < start:
        raise LedgerError("End date must be on or after start date.")
    selected = [entry for entry in entries if start <= entry.day <= end]
    recorded_days = len({entry.day for entry in selected})
    calendar_days = (end - start).days + 1
    duplicate_count = len(selected) - len(set(selected))
    warnings = []
    if not selected:
        warnings.append("No entries fall in this period. A total of 0 g here means no recorded mass, not verified zero waste.")
    if duplicate_count:
        warnings.append(
            f"{duplicate_count} repeated exact record(s) are included in totals. "
            "Check whether they are distinct observations or accidental duplicates."
        )
    return {
        "schema_version": 1,
        "source_file": source_name,
        "data_status": "FICTIONAL DEMONSTRATION DATA" if demo else "User-supplied records; independently unverified",
        "period": {"start": start.isoformat(), "end": end.isoformat(), "inclusive": True},
        "input_entry_count": len(entries),
        "excluded_entry_count": len(entries) - len(selected),
        "entry_count": len(selected),
        "calendar_days": calendar_days,
        "days_with_entries": recorded_days,
        "days_without_entries": calendar_days - recorded_days,
        "total_grams": grams_text(sum(entry.milligrams for entry in selected)),
        "mass_encoding": "Decimal gram strings, summed exactly using integer milligrams",
        "repeated_record_count": duplicate_count,
        "by_reason": _groups(selected, "reason"),
        "by_item": _groups(selected, "item"),
        "by_date": _groups(selected, "day"),
        "warnings": warnings,
        "limitations": list(LIMITATIONS),
    }


def text_report(report: Dict[str, object]) -> str:
    period = report["period"]
    lines = [
        "Food Waste Ledger",
        str(report["data_status"]),
        f"Source: {report['source_file']}",
        f"Period: {period['start']} through {period['end']} (inclusive)",
        f"Recorded discarded mass: {report['total_grams']} g",
        f"Entries in period: {report['entry_count']} ({report['excluded_entry_count']} outside period)",
        f"Days with entries: {report['days_with_entries']} of {report['calendar_days']}",
        f"Days without entries: {report['days_without_entries']} (not zero-waste days)",
    ]
    for title, key in (("By reason", "by_reason"), ("By item", "by_item"), ("By date", "by_date")):
        lines.extend(["", title])
        for group in report[key]:
            # repr keeps control characters in arbitrary input labels out of terminal output.
            lines.append(f"  {group['label']!r}: {group['grams']} g ({group['entry_count']} entries)")
        if not report[key]:
            lines.append("  No entries")
    for warning in report["warnings"]:
        lines.extend(["", "WARNING: " + warning])
    lines.extend(["", "Interpretation"] + list(report["limitations"]))
    return "\n".join(lines) + "\n"


def html_report(report: Dict[str, object]) -> str:
    def safe(value: object) -> str:
        return escape(str(value), quote=True)

    tables = []
    for title, key in (("By reason", "by_reason"), ("By item", "by_item"), ("By date", "by_date")):
        rows = "".join(
            f"<tr><th scope='row'>{safe(group['label'])}</th><td>{safe(group['grams'])}</td>"
            f"<td>{safe(group['entry_count'])}</td></tr>"
            for group in report[key]
        ) or "<tr><td colspan='3'>No entries in this period.</td></tr>"
        tables.append(
            f"<section><h2>{title}</h2><table><thead><tr><th scope='col'>Label</th>"
            "<th scope='col'>Recorded grams</th><th scope='col'>Entries</th></tr></thead>"
            f"<tbody>{rows}</tbody></table></section>"
        )
    warnings = "".join(f"<p class='warning'>{safe(warning)}</p>" for warning in report["warnings"])
    limitations = "".join(f"<li>{safe(item)}</li>" for item in report["limitations"])
    period = report["period"]
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Food Waste Ledger report</title>
<style>
:root {{ color-scheme: light; font-family: system-ui,sans-serif; color: #18352b; background: #f4f7f2; }}
body {{ margin: 0 auto; max-width: 58rem; padding: 2rem 1rem; line-height: 1.6; }}
h1 {{ margin-bottom: .2rem; }} h2 {{ margin-top: 1.8rem; }}
.status {{ font-weight: 700; }} .total {{ font-size: 2rem; font-weight: 700; }}
.summary {{ background: white; border: 1px solid #b7c8bc; padding: 1rem 1.4rem; border-radius: .5rem; }}
table {{ width: 100%; border-collapse: collapse; table-layout: fixed; background: white; }}
th,td {{ padding: .65rem; border: 1px solid #b7c8bc; text-align: left; overflow-wrap: anywhere; }}
thead {{ background: #e2ece2; }} tbody th {{ font-weight: 400; }}
li {{ margin-bottom: .5rem; }} .warning {{ padding: 1rem; background: #fff0cc; border-left: 4px solid #775b00; }}
.source {{ overflow-wrap: anywhere; }}
@media print {{ body {{ max-width: none; background: white; }} section {{ break-inside: avoid; }} }}
</style></head><body>
<header><h1>Food Waste Ledger</h1><p class="status">{safe(report['data_status'])}</p>
<p>{safe(period['start'])} through {safe(period['end'])}, inclusive</p>
<p class="source">Input file: {safe(report['source_file'])}</p></header>
<main><div class="summary"><div>Recorded discarded food mass</div><div class="total">{safe(report['total_grams'])} g</div>
<p>{safe(report['entry_count'])} entries in this period; {safe(report['excluded_entry_count'])} input entries outside it.</p>
<p>{safe(report['days_with_entries'])} of {safe(report['calendar_days'])} calendar days have entries.<br>
{safe(report['days_without_entries'])} days have no entries. <strong>Unlogged does not mean zero waste.</strong></p></div>
{warnings}{''.join(tables)}
<section><h2>How to interpret this report</h2><ul>{limitations}</ul>
<p>Labels are grouped exactly as entered after trimming outer whitespace. Repeated identical records are retained and flagged.
Mass is summed exactly to the supplied precision, up to 0.001 g; this does not imply scale accuracy.</p></section></main>
<footer><p>Generated locally by Food Waste Ledger. No remote assets, tracking, or emissions estimates.</p></footer>
</body></html>
"""
