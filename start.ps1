#!/usr/bin/env pwsh
<#
    WatChat - Script de Démarrage Interactif
    Valide l'environnement et démarre le serveur
#>

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  🚀 WATCHER - START SCRIPT 🚀                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérifications préalables
Write-Host "⏳ Vérification de l'environnement..." -ForegroundColor Yellow
Write-Host ""

# Vérifier Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    Write-Host "   Téléchargez-le sur: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}
$nodeVersion = node -v
Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green

# Vérifier npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm n'est pas installé" -ForegroundColor Red
    exit 1
}
$npmVersion = npm -v
Write-Host "✅ npm détecté: $npmVersion" -ForegroundColor Green

# Vérifier node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules introuvable" -ForegroundColor Yellow
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
} else {
    Write-Host "✅ Dépendances trouvées" -ForegroundColor Green
}

# Vérifier .env
if (-not (Test-Path ".env")) {
    Write-Host "❌ Le fichier .env n'existe pas!" -ForegroundColor Red
    Write-Host "   Créez .env avec:" -ForegroundColor Yellow
    Write-Host "   PORT=5000" -ForegroundColor Cyan
    Write-Host "   MONGO_URI=votre_connection_string" -ForegroundColor Cyan
    Write-Host "   JWT_SECRET=votre_clé_secrète" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✨ ENVIRONNEMENT VALIDÉ - DÉMARRAGE... ✨           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Ouvrez: http://localhost:5000 dans votre navigateur" -ForegroundColor Cyan
Write-Host "📝 Pour arrêter: Appuyez sur Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Démarrer le serveur
npm run dev
