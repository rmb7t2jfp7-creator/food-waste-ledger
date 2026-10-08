# A simple record of real use

You can help improve Food Waste Ledger without coding. Real use and specific feedback are useful contributions, even if you never change the code.

This guide contains **empty templates, not a record of anyone using the app**. Copy them into a private note. Personal journal contents and backup files should not be published in this repository.

## Start once

Choose which kitchen and food you will observe, what you will exclude, and how you will weigh it. Keep that scope consistent. If you tried the fictional sample, use **Start fresh** before entering real observations; back up anything you want to retain first.

## Daily: about two minutes to log and check in

Record discarded food during normal disposal: date, food, grams, and reason. Subtract the container weight. Do not handle unsafe food just to weigh it.

**No kitchen scale?** Do not invent a weight or mark the day “No food discarded.” Choose **Only part of the day recorded** and note that food was discarded but not weighed. You can still notice confusing steps and give useful feedback.

At the end of an observed day, choose the accurate description and select **Save daily check-in**:

| Description | What you are reporting |
| --- | --- |
| No food discarded (`zero`) | You observed the day within your scope and discarded no food. Requires no food entries on that date. |
| All discarded food recorded (`complete`) | You finished logging the day's discarded food. Requires at least one entry. |
| Only part of the day recorded (`partial`) | Some observation or logging is missing. Any number of entries is allowed, including none. |
| No check-in | Coverage is unknown, even if a food entry exists. |

A missed day stays unknown. If correcting entries makes a check-in inconsistent, choose partial while making the correction, then select the accurate final description.

## Weekly: one actual finding

1. Review the dates observed and the gaps. Write one thing you actually noticed—or say the record is too incomplete to interpret.
2. If useful, try one practical change and note when it began. Keep plans separate from results.
3. Select **Back up JSON** and keep it privately; it preserves entries and check-ins. **Export check-ins** creates a separate CSV. **Export food entries** and the Python report cannot show zero check-ins or distinguish complete from partial days.
4. Report a confusing or broken step through the [feedback form](https://github.com/rmb7t2jfp7-creator/food-waste-ledger/issues/new?template=feedback.yml). Say what you tried, expected, and saw. Use fictional examples and remove personal details from screenshots.

After a fix is published, retry the same steps and note the result. A useful release links to the issue, describes the actual improvement, and states the checks performed. You do not need to code or publish daily updates to help.

## What the record can—and cannot—show

Dates and records are user-entered and editable: this is **self-reported use**, not independent verification or a tamper-proof audit. An issue and retest can document a software improvement; another person's review is separate and supports only what they actually assessed. Code review is not environmental assessment. Lower logged totals, tests, releases, or activity do not by themselves prove waste prevention, emissions savings, or subscription eligibility. Do not invent observations or create busywork commits to suggest progress. See [METHODOLOGY.md](METHODOLOGY.md) before comparing periods or making impact claims.

## Empty private templates

Fill only facts you know. Leave unknown fields blank or write “unknown.”

### Setup

```text
What I will observe and exclude:
Intended observation period:
Weighing method, or no scale:
App version/release or date accessed:
Private backup location:
```

### Weekly finding

```text
Dates reviewed and observation gaps:
One actual finding, or why I cannot interpret the record:
Change actually tried and start date, or none:
What is still only planned:
Private JSON backup date/location:
```

### Feedback and follow-up

```text
Date, device/browser, and app version or date accessed:
What I tried, expected, and saw (use a fictional example publicly):
Public issue link, if any:
Fix/release link and date I retried the steps, if any:
What happened after the fix; remaining uncertainty:
Review source/scope: my own check or another person's feedback:
```
