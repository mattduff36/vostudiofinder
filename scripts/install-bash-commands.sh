#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASHRC="${HOME}/.bashrc"

MARK_BEGIN="# vostudiofinder commands (auto-generated)"
MARK_END="# /vostudiofinder commands (auto-generated)"

mkdir -p "$(dirname "$BASHRC")"
touch "$BASHRC"

# Remove existing block if present
tmpfile="$(mktemp)"
awk -v begin="$MARK_BEGIN" -v end="$MARK_END" '
  $0==begin {skip=1; next}
  $0==end {skip=0; next}
  skip!=1 {print}
' "$BASHRC" > "$tmpfile"
mv "$tmpfile" "$BASHRC"

{
  echo ""
  echo "$MARK_BEGIN"
  echo "# Add repo scripts to PATH so you can run: deletetestaccounts"
  echo "export PATH=\"\$PATH:$REPO_ROOT/scripts\""
  echo "$MARK_END"
} >> "$BASHRC"

echo "✅ Installed. Restart Git Bash or run: source ~/.bashrc"

