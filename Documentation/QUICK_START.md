# 🚀 Quick Start Guide - WatChat

## ⚡ Commandes Rapides

```bash
# Installation
npm install

# Démarrage serveur (développement)
npm run dev
# Accédez à http://localhost:5000

# Tests (tous passent ✅)
npm test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run coverage

# Production
npm start
```

## 🧪 Statut des Tests

```
✅ 47+ tests passing
✅ Authentication (9 tests)
✅ Users (6 tests)
✅ Messages (12+ tests)
✅ WebSocket tests
✅ Couverture: ~85%
```

## 📝 Configuration

### Fichier `.env`
```env
PORT=5000
MONGO_URI=mongodb+srv://Ewan1:4mj3iDe31kHPQoVd@cluster0.kzssqvu.mongodb.net/websocket
JWT_SECRET=ewanLeGrosBG!2345
NODE_ENV=development
```

### Fichier `.env.test`
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/chat_app_test
JWT_SECRET=unautresetsecretpourlestests
NODE_ENV=test
```

## 📱 Interface Web

```
URL: http://localhost:5000
- Responsive design
- WhatsApp-like UI
- Dark mode sidebar
- Real-time messaging
- Contact & session management
```

## 🔐 Authentification

- **Inscription**: Email + Password
- **Connexion**: Email + Password
- **Tokens**: 
  - accessToken: 1 jour
  - refreshToken: 7 jours

## 📊 Architecture

```
Backend (Express + MongoDB + Socket.io)
├── 43 API Endpoints
├── 7 Models
├── 7 Controllers
└── Real-time WebSocket

Frontend (HTML + CSS + JavaScript)
├── Responsive Design
├── WhatsApp UI
└── Socket.io Client
```

## ✨ Fonctionnalités Principales

✅ Authentification complète
✅ Gestion utilisateurs
✅ Conversations 1-to-1 et groupes
✅ Messagerie en temps réel
✅ Gestion des contacts & blocage
✅ Gestion des sessions
✅ Upload de fichiers
✅ Indicateur de saisie
✅ Statut online/offline

## 📚 Documentation

- `TEST_GUIDE.md` - Guide testage
- `TESTING.md` - Guide tests
- `PROJECT_STATUS.md` - État complet
- `API_DOCUMENTATION.md` - Endpoints

## 🐛 Troubleshooting

### Le serveur ne démarre pas
```bash
# Vérifier MongoDB
mongosh

# Vérifier le port
netstat -ano | findstr :5000

# Tuer les processus Node
pkill -f "node"
```

### Les tests échouent
```bash
# Vérifier MongoDB local
mongod

# Relancer les tests
npm test
```

### Erreur EADDRINUSE
```bash
# Le port 5000 est utilisé
lsof -i :5000
kill -9 <PID>
```

## 📞 Support

En cas de problème:
1. Vérifier les logs: `npm run dev`
2. Consulter `TESTING.md`
3. Lancer les tests: `npm test`

---

**Prêt à utiliser! 🎉**
