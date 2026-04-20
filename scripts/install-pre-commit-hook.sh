#!/bin/bash
# Install a pre-commit hook that runs the trade-secret scanner on staged files.
# Usage: bash scripts/install-pre-commit-hook.sh
set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  echo "ERROR: not inside a git repository"
  exit 1
fi

HOOK_FILE="$REPO_ROOT/.git/hooks/pre-commit"

cat > "$HOOK_FILE" <<'HOOK'
#!/bin/bash
# Auto-installed by scripts/install-pre-commit-hook.sh
# Fails the commit if CRITICAL or HIGH trade-secret hits are found.
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [ ! -f "scripts/trade-secret-scan.py" ]; then
  echo "pre-commit: scanner missing at scripts/trade-secret-scan.py — skipping"
  exit 0
fi

echo "pre-commit: running trade-secret scan..."
python3 scripts/trade-secret-scan.py --summary
RC=$?
if [ $RC -ne 0 ]; then
  echo ""
  echo "❌ pre-commit: trade-secret scan failed (CRITICAL or HIGH hits present)."
  echo "   Run \`python3 scripts/trade-secret-scan.py\` for details."
  echo "   To bypass ONLY in an emergency, use: git commit --no-verify"
  exit 1
fi
echo "✅ pre-commit: trade-secret scan clean."
HOOK

chmod +x "$HOOK_FILE"
echo "Installed pre-commit hook at $HOOK_FILE"
