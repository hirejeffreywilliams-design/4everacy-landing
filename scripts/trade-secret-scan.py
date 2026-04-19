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

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Banned terms — EXACT match (case-insensitive), word-boundary enforced.
# Source of truth: security/banned-terms.txt (one term per line, # for comments).
# ---------------------------------------------------------------------------
BANNED_TERMS_FILE = Path(__file__).resolve().parent.parent / "security" / "banned-terms.txt"


def load_banned_terms() -> list[str]:
    if not BANNED_TERMS_FILE.exists():
        print(f"ERROR: banned terms file not found: {BANNED_TERMS_FILE}", file=sys.stderr)
        sys.exit(2)
    terms: list[str] = []
    for line in BANNED_TERMS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        terms.append(line)
    return terms

# ---------------------------------------------------------------------------
# Pattern-based checks (MEDIUM). Regex, case-insensitive.
# ---------------------------------------------------------------------------
BANNED_PATTERNS: list[tuple[str, str]] = [
    ("patent_pending_badge", r"patent[\s-]*pending"),
    ("claim_count", r"\b\d{2,4}\s*\+?\s*patents?\b"),
    ("engine_count", r"\b\d+\s*(engines?|cores?|vaults?|stacks?)\b"),
    ("fsu_multiplier", r"\b\d+(\.\d+)?x\s*(fsu|multiplier)\b"),
]

# File extensions treated as CLIENT-SHIPPED (CRITICAL severity on hit)
CLIENT_SHIPPED_EXT = {".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".svg", ".xml"}

# Extensions still in the repo but not served to browsers directly (HIGH)
REPO_INTERNAL_EXT = {".md", ".txt", ".yml", ".yaml", ".toml"}

# Paths to skip entirely
# `security/` holds the scanner's own banned-list + documentation which
# legitimately references the banned terms; skipping it avoids self-hits.
SKIP_DIRS = {".git", "node_modules", "dist", "build", ".next", "images", "admin-legacy", "security"}
# Self-exclusions — the scanner itself and its CI config
SELF_PATHS = {
    "scripts/trade-secret-scan.py",
    "scripts/install-pre-commit-hook.sh",
    ".github/workflows/trade-secret-check.yml",
}


def iter_files(root: Path) -> Iterable[Path]:
    for dirpath, dirnames, filenames in os.walk(root):
        # prune
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fname in filenames:
            p = Path(dirpath) / fname
            rel = p.relative_to(root).as_posix()
            if rel in SELF_PATHS:
                continue
            yield p


def classify_severity(path: Path, match_type: str) -> str:
    ext = path.suffix.lower()
    if match_type == "pattern":
        return "MEDIUM"
    if ext in CLIENT_SHIPPED_EXT:
        return "CRITICAL"
    if ext in REPO_INTERNAL_EXT:
        return "HIGH"
    return "HIGH"


def scan_file(path: Path) -> list[dict]:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []
    hits: list[dict] = []

    # exact banned terms (case-insensitive, word boundary)
    for term in BANNED_TERMS:
        pattern = re.compile(r"(?<![A-Za-z0-9_])" + re.escape(term) + r"(?![A-Za-z0-9_])", re.IGNORECASE)
        for m in pattern.finditer(text):
            line_no = text.count("\n", 0, m.start()) + 1
            line = text.splitlines()[line_no - 1] if line_no <= text.count("\n") + 1 else ""
            hits.append({
                "severity": classify_severity(path, "exact"),
                "match_type": "exact",
                "term": term,
                "line": line_no,
                "snippet": line.strip()[:200],
            })

    # patterns
    for name, pat in BANNED_PATTERNS:
        pattern = re.compile(pat, re.IGNORECASE)
        for m in pattern.finditer(text):
            line_no = text.count("\n", 0, m.start()) + 1
            line = text.splitlines()[line_no - 1] if line_no <= text.count("\n") + 1 else ""
            hits.append({
                "severity": classify_severity(path, "pattern"),
                "match_type": f"pattern:{name}",
                "term": m.group(0),
                "line": line_no,
                "snippet": line.strip()[:200],
            })

    return hits


BANNED_TERMS: list[str] = load_banned_terms()


def main() -> int:
    ap = argparse.ArgumentParser(description="Trade-secret scanner for 4everacy-landing")
    ap.add_argument("--json", action="store_true", help="Emit full JSON to stdout")
    ap.add_argument("--out", type=str, default=None, help="Write JSON to file")
    ap.add_argument("--summary", action="store_true", help="Summary only")
    ap.add_argument("--root", type=str, default=str(REPO_ROOT), help="Scan root")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    all_hits: list[dict] = []
    files_scanned = 0
    for p in iter_files(root):
        files_scanned += 1
        file_hits = scan_file(p)
        for h in file_hits:
            h["file"] = p.relative_to(root).as_posix()
        all_hits.extend(file_hits)

    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0}
    for h in all_hits:
        counts[h["severity"]] = counts.get(h["severity"], 0) + 1

    payload = {
        "files_scanned": files_scanned,
        "total_hits": len(all_hits),
        "counts": counts,
        "hits": all_hits,
    }

    if args.out:
        Path(args.out).write_text(json.dumps(payload, indent=2))

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"Files scanned: {files_scanned}")
        print(f"Total hits:    {len(all_hits)}")
        print(f"  CRITICAL: {counts['CRITICAL']}")
        print(f"  HIGH:     {counts['HIGH']}")
        print(f"  MEDIUM:   {counts['MEDIUM']}")
        if not args.summary and all_hits:
            print("")
            print("Detail:")
            by_sev = {"CRITICAL": [], "HIGH": [], "MEDIUM": []}
            for h in all_hits:
                by_sev[h["severity"]].append(h)
            for sev in ("CRITICAL", "HIGH", "MEDIUM"):
                if not by_sev[sev]:
                    continue
                print(f"\n--- {sev} ({len(by_sev[sev])}) ---")
                for h in by_sev[sev][:50]:
                    print(f"  {h['file']}:{h['line']}  [{h['match_type']}] {h['term']}")
                    if h["snippet"]:
                        print(f"      > {h['snippet']}")
                if len(by_sev[sev]) > 50:
                    print(f"  ... and {len(by_sev[sev]) - 50} more")

    # CI gate: fail on CRITICAL or HIGH
    if counts["CRITICAL"] > 0 or counts["HIGH"] > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
