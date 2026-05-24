#!/bin/bash
# Pousse les changements locaux vers GitHub
# Usage: ./push.sh "message de commit"

set -e

MSG="${1:-update}"
BRANCH="${2:-main}"

echo "📦 Staging..."
git add .

if git diff --cached --quiet; then
  echo "ℹ️  Rien à commit."
else
  echo "💾 Commit: $MSG"
  git commit -m "$MSG"
fi

echo "🚀 Push vers origin/$BRANCH..."
git push origin "$BRANCH"

echo "✅ Push terminé."
echo ""
echo "👉 Sur le serveur, lance maintenant : ./pull.sh"
