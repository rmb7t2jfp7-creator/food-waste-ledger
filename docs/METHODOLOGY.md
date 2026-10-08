# Measuring food waste with this tool

Food Waste Ledger adds up the food mass that a person records. Its purpose is to help someone notice which foods and reasons account for their logged waste, then choose a practical change to try. It does not measure environmental outcomes by itself.

The US EPA recommends recording the amount, type, and reason for wasted food to identify prevention opportunities. See [Prevent Wasted Food Through Source Reduction](https://www.epa.gov/sustainable-management-food/prevent-wasted-food-through-source-reduction) and [Tools for Preventing and Diverting Wasted Food](https://www.epa.gov/sustainable-management-food/tools-preventing-and-diverting-wasted-food). This independent project is not affiliated with or endorsed by EPA.

## Keep a consistent diary

1. Choose one household or kitchen and a fixed observation period.
2. Choose what you will count. For a first trial, record food that was intended to be eaten but is being discarded. Keep normally inedible bones, shells, and peels separate. The current tool does not classify edible versus inedible material for you.
3. Weigh food in grams, subtracting the container weight. Record the date, item, and reason each time. If you cannot weigh discarded food, do not invent a weight or mark the day zero. Use a partial check-in and note that food was discarded but not weighed.
4. Use consistent item names and reasons, such as `overprepared`, `spoiled`, or `plate leftovers`. The tool groups labels after trimming outer whitespace, so spelling and capitalization matter.
5. Add an end-of-day check-in based on what you actually observed. Use zero only for an observed day with no food discarded within your chosen scope; use complete when the day's food entries are finished; use partial when you know the record is incomplete. Leave unobserved days without a check-in. Recording a label does not independently verify coverage.
6. Review the largest categories and the coverage of your diary. Choose one practical change, such as making a smaller batch or planning meals around foods already on hand. Keep a dated note of what you changed.

Do not handle unsafe food just to weigh it. Use observations made during normal disposal, and follow your usual food safety practices.

## What the numbers mean

- Total grams is the sum of included entries. Kilograms is grams divided by 1,000.
- The start and end dates are both included. Entries outside that period are not included in its totals.
- An entry means some food was logged on that date. It does not establish that the whole day was observed.
- Without a daily check-in, a date's observation status is unknown, including dates that have some food entries. The app never infers a zero day from an absence of entries.
- A **No food discarded** (`zero`) check-in means the recorder reports observing that day and discarding no food within the chosen scope. It is allowed only when that date has no entries. It does not prove zero waste elsewhere or independent verification.
- An **All discarded food recorded** (`complete`) check-in means the recorder reports finishing that day's logging. It requires at least one entry. An **Only part of the day recorded** (`partial`) check-in records incomplete coverage and may have no entries or several entries. These statuses describe self-reported coverage, not data quality certification.
- Identical rows can describe separate real events or an accidental duplicate. The tool retains them and warns so you can review the source. Do not remove real events merely to make totals lower.
- The program validates formatting and arithmetic, not whether the measurements are true or representative. Dates and records are user-entered and editable; the diary is not a tamper-proof audit trail or independent verification of use.

## Keep observations when moving data

Schema-version-2 JSON backups preserve both food entries and daily check-ins, including check-in notes. Importing a version-1 backup keeps its entries and adds no check-ins; past coverage remains unknown until you can honestly document it. Do not reconstruct complete days from memory just to remove gaps.

The separate check-ins CSV is for viewing or sharing observation records. It is not the Python analyzer's input format or a substitute for a full JSON backup. The original food-entry CSV remains compatible with the Python analyzer, which still summarizes entries only. Its dates-with-entries count cannot show zero check-ins, distinguish partial from complete days, or measure observation coverage. Keep both CSV files together if you choose CSV for review, and keep JSON for restoration.

## Before claiming a reduction

Keep a baseline diary with explicit coverage notes, record the change you try, and collect another comparable period. Note differences in people, meals, guests, travel, purchases, and measurement coverage. Do not compare a largely partial week with a more complete week as if the totals meant the same thing. A lower total of logged waste alone does not demonstrate prevention or causality. There is no automatic reduction calculation in this version.

A dated personal diary supports the narrow statement that someone reported these observations. A specific usability issue and a checked fix support a claim that a software problem was addressed. An independent review is a separate event: identify what was reviewed, by whom with permission, and the review's limits. Neither usage records, passing tests, releases, nor a positive review alone establish avoided waste or environmental impact.

Use the empty templates in [USAGE-JOURNAL.md](USAGE-JOURNAL.md) to document actual observations and changes. Keep private data private; use fictional examples in public issues.

No greenhouse-gas factor is applied. [EPA's WARM overview](https://www.epa.gov/waste-reduction-model/basic-information-about-waste-reduction-model) describes comparative modeling of waste-management scenarios; a diary total alone is insufficient to establish emissions savings. Any future emissions feature would need explicit boundaries, sourced factors, uncertainty, and a defensible baseline.

## Evidence at launch

The bundled entries are fictional demonstration data. No household trial, external adoption, avoided waste, or emissions benefit has been measured for this project. The working software is the deliverable; the intended environmental benefit remains a hypothesis to test.
