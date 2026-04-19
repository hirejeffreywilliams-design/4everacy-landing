# Security — Trade-Secret Scanner

This directory holds the registry of banned terms that must not appear in
any publicly-served asset of this repository.

## Files

- `banned-terms.txt` — one term per line (plus `#` comments). **Source of
  truth** for what the scanner blocks. Derived from the Master Trade Secret
  Register, Pioneer Moat Doctrine, and the Narrative Firewall.

## Scanner

See `scripts/trade-secret-scan.py`.

```bash
python3 scripts/trade-secret-scan.py              # full report
python3 scripts/trade-secret-scan.py --summary    # counts only
python3 scripts/trade-secret-scan.py --json       # JSON output
```

Exit code is `1` if any **CRITICAL** or **HIGH** hits are found. `MEDIUM`
hits are flagged but do not fail CI (they are pattern-based and may have
false positives).

### Severity model

| Severity  | Meaning                                                                |
| --------- | ---------------------------------------------------------------------- |
| CRITICAL  | Exact banned term in a client-shipped asset (html/css/js/json/svg)     |
| HIGH      | Exact banned term in repo-internal files (md/txt/yml/yaml/toml)        |
| MEDIUM    | Pattern hit (e.g. `patent-pending`, claim counts, FSU multipliers)     |

## Guardrails

- **CI**: `.github/workflows/trade-secret-check.yml` runs on every PR and push.
- **Pre-commit**: `scripts/install-pre-commit-hook.sh` installs a local hook
  that runs the scanner before every commit.

## Updating `banned-terms.txt`

Any change to this file is a material change to the public-exposure surface
and requires the same PR review as a content change. Do not bypass CI with
`--no-verify` on a commit that adds or removes banned terms.
