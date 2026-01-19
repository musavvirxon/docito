# File: scripts/remove-modern-design.sh
#!/usr/bin/env bash
set -euo pipefail

# Optional hard-delete of modern design files after you've removed all imports.
# (We keep ModernNavbar/ModernFooter as null-components for safety until imports are gone.)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FILES=(
  "src/components/home/ModernNavbar.tsx"
  "src/components/home/ModernFooter.tsx"
  "src/components/layout/PublicShell.tsx"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    rm -f "$f"
    echo "[deleted] $f"
  fi
done

echo "[done] Modern design files removed (if no longer referenced)."
