#!/bin/sh
set -e

BASE_URL="https://raw.githubusercontent.com/soukadao/gitcv/main/skills"
INSTALL_DIR="${1:-$HOME/.claude/skills}"

SKILLS="git-typed-commit git-branch-strategy"

for skill in $SKILLS; do
  mkdir -p "$INSTALL_DIR/$skill"
  curl -fsSL "$BASE_URL/$skill/SKILL.md" -o "$INSTALL_DIR/$skill/SKILL.md"
  echo "installed: $skill"
done

echo "done. skills installed to $INSTALL_DIR"
