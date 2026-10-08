# Contributing to Food Waste Ledger

Small, useful improvements are welcome. Start by running the fictional example in the README and checking whether the report helps you understand the entries. Share reproduction steps and a small fictional CSV when reporting a bug; do not post a household's private diary.

## Development

Use Python 3.9 or newer. The application and tests use only the Python standard library. From the project folder, run:

```sh
python3 -m unittest discover -s tests -v
```

Keep changes focused and explain the user problem. Add a test when changing calculations, validation, or output safety. Documentation fixes and suggestions about usability are also useful.

## Measurement and claims

Keep measured food mass separate from estimated or avoided impact. Dates without entries must never silently become zero-waste days. Do not claim reduced waste, saved money, users, or emissions reductions without evidence and a documented method. Use fictional data for public examples, marked as fictional in both the source and report.

When proposing a new feature, label it as a proposal until implemented and checked. Disclose substantial AI assistance in your pull request and review the resulting code before submitting it. Contributions are offered under the project's MIT license.
