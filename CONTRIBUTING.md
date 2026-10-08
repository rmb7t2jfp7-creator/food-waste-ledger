# Contributing to Food Waste Ledger

Small, useful improvements are welcome. Start by trying the browser diary or the fictional example in the README and checking whether it helps you understand the records. You do not need to write code: describe an unclear label, a confusing step, or a result that did not match your expectation. Use the [feedback form](https://github.com/rmb7t2jfp7-creator/food-waste-ledger/issues/new?template=feedback.yml) and share reproduction steps with a small fictional example. Do not post a household's private diary, names, addresses, or private backup files.

## Help through real use

Use the app for an actual routine if it is useful to you. The [usage journal](docs/USAGE-JOURNAL.md) provides empty templates for dated observations and a weekly review; filling them is optional and does not require public daily updates. Record gaps honestly. An issue can explain what happened, the device/browser, and the version or date used without claiming broad impact.

Connect improvements to a specific user problem. After a change, try the same steps again and record whether the behavior improved, including any remaining limitation. A release note should describe changes actually shipped and the checks actually run. Publish a release when there is a useful change to communicate, not on a daily schedule to manufacture activity. Duplicate issues, busywork commits, invented users, and fabricated trial results are not useful contributions.

## Development

Use Python 3.9 or newer for the command-line analyzer and Node.js 18 or newer for browser core tests. There are no packages to install. From the project folder, run:

```sh
python3 -m unittest discover -s tests -v
node --test core.test.js
```

Keep changes focused and explain the user problem. Add a test when changing calculations, validation, or output safety. Documentation fixes and suggestions about usability are also useful.

## Measurement and claims

Keep recorded food mass separate from estimated or avoided impact. Dates without check-ins must remain unknown; zero, complete, and partial are explicit self-reported statuses. Zero requires no food entries on that date; complete requires at least one; partial can have any number. Preserve entries and observation records in JSON backups, and never infer historical check-ins when migrating version-1 data. The legacy entries CSV and Python analyzer remain entries-only; they must not be described as reporting daily check-in coverage.

Do not claim reduced waste, saved money, users, or emissions reductions without evidence and a documented method. Distinguish the recorder's own statements, software verification, external usability feedback, and independently reviewed impact. Identify a review's actual scope; a code review is not an environmental assessment. Use fictional data for public examples, marked as fictional in both the source and report.

When proposing a new feature, label it as a proposal until implemented and checked. Disclose substantial AI assistance in your pull request and review the resulting code before submitting it. Contributions are offered under the project's MIT license.
