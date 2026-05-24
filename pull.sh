#!/bin/bash
# Récupère les derniers changements et redéploie LostCards
# À exécuter sur le VPS dans ~/LostCards

set -e

cd "$(dirname "$0")"

echo "📥 Pull depuis GitHub..."
git pull origin main

echo "🐳 Rebuild & restart Docker..."
docker compose -f docker-compose.prod.yml up -d --build

echo "⏳ Attente du démarrage..."
sleep 8

echo "📊 Statut des containers :"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Déploiement terminé."
echo "🌐 https://lost-card.softskills.ci"
