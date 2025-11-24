#!/bin/bash

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 WatChat - Démarrage du serveur${NC}"
echo -e "${BLUE}========================================${NC}"

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js détecté : $(node -v)${NC}"

# Vérifier que npm est installé
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm détecté : $(npm -v)${NC}"

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⏳ Installation des dépendances...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erreur lors de l'installation${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Dépendances installées${NC}"
fi

# Vérifier le fichier .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Le fichier .env n'existe pas${NC}"
    echo -e "${YELLOW}Créez un fichier .env avec la configuration MongoDB${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Fichier .env détecté${NC}"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Démarrage du serveur...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

npm run dev
