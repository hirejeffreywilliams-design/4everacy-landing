#!/usr/bin/env python3
"""
Trade-secret scanner for 4everacy-landing.

Purpose
-------
Block public exposure of internal codenames, engine names, and trade-secret
terms in landing-page assets. Mirrors the pattern used in the platform repo
(scripts/trade-secret-scan.py) but sized for a static landing site.

Severity model
--------------
- CRITICAL : exact-match of a banned codename in shipped HTML/CSS/JS/JSON/SVG.
            CI must fail on any CRITICAL hit.
- HIGH     : exact-match in markdown, docs, or config that live in the repo
            but are not served to end users. CI should fail on HIGH too —
            anything in this repo is considered public-adjacent.
- MEDIUM   : pattern hits (patent-pending language, "308+ patents", claim
            counts, FSU multipliers). Flagged for review, not auto-blocking,
            because some may be legitimate copy. CI treats as WARN.

Exit codes
----------
0 = no CRITICAL or HIGH hits
1 = at least one CRITICAL or HIGH hit

Usage
-----
    python3 scripts/trade-secret-scan.py                 # scan repo, text summary
    python3 scripts/trade-secret-scan.py --json          # JSON output
    python3 scripts/trade-secret-scan.py --out scan.json # write JSON to file
    python3 scripts/trade-secret-scan.py --summary       # summary only
"""