# 📱 WatChat - Configuration & Test Guide

## 🎯 Vue d'ensemble rapide

**WatChat** est une application de messagerie en temps réel construite avec :
- **Backend** : Express.js + MongoDB + Socket.io
- **Frontend** : HTML/CSS/JavaScript Vanilla
- **Design** : Inspiré de WhatsApp

---

## ✅ État du Projet

### Fonctionnalités Complètes
- ✅ Authentification JWT (registration, login, logout)
- ✅ Gestion des profils utilisateur
- ✅ Système de contacts (ajouter, bloquer, débloquer)
- ✅ Conversations 1-to-1 et groupes
- ✅ Envoi/réception de messages en temps réel
- ✅ Indicateur de saisie en direct
- ✅ Gestion des sessions (appareil/navigateur)
- ✅ Interface WhatsApp-like
- ✅ Erreurs corrigées et testées

### En Cours
- 🔄 Upload de fichiers/images
- 🔄 Réactions emoji
- 🔄 Messages vocaux

---

## 🚀 Démarrage Rapide

### Option 1 : Démarrage Normal (PowerShell/CMD Windows)
```powershell
cd "C:\Users\Martin\Documents\Ynov\Cours\coordination_front_back\BackEnd"
npm run dev
```

### Option 2 : Vérifier le Port
```powershell
# Vérifier qui utilise le port 5000
netstat -ano | findstr :5000

# Tuer le processus si nécessaire
taskkill /PID <PID> /F
```

### Option 3 : Changer le Port (si 5000 est occupé)
```powershell
# Éditer le fichier .env
# Changer PORT=5000 par PORT=3000 par exemple
```

---

## 📋 Checklist de Test

### 1. Vérification du Serveur
```
[ ] Le serveur démarre sans erreur
[ ] Message "🚀 Serveur lancé sur le port 5000"
[ ] Socket.io connecté
[ ] MongoDB connecté
```

### 2. Accès à l'Application
```
[ ] Ouvrir http://localhost:5000 dans le navigateur
[ ] L'interface de login s'affiche
[ ] Aucune erreur en console (F12)
```

### 3. Authentification
```
[ ] Créer un compte (inscription)
[ ] Se connecter avec les identifiants
[ ] Avatar visible (Dicebear fallback)
[ ] Nom d'utilisateur affiché
```

### 4. Gestion des Contacts
```
[ ] Bouton 👥 (Contacts) visible
[ ] Lister tous les utilisateurs
[ ] Ajouter un contact
[ ] Bloquer/débloquer un contact
[ ] Voir les contacts bloqués
```

### 5. Conversations
```
[ ] Créer une conversation (bouton +)
[ ] Sélectionner des utilisateurs
[ ] Envoyer un message
[ ] Recevoir les messages en temps réel
[ ] Voir l'indicateur de saisie
```

### 6. Profil & Sessions
```
[ ] Modifier le profil
[ ] Voir les sessions actives (📱)
[ ] Fermer une session
[ ] Se déconnecter
```

---

## 🔧 Structure des Fichiers Importants

```
src/
├── models/
│   ├── User.js              # Schéma utilisateur
│   ├── Conversation.js      # Schéma conversation
│   ├── Message.js           # Schéma message
│   └── Contact.js           # Schéma contact
├── controllers/
│   ├── messageController.js # ✅ CORRIGÉ (creator ajouté)
│   ├── contactController.js
│   └── userController.js
├── routes/
│   ├── messages.js
│   ├── contacts.js
│   └── users.js
└── socket/
    └── index.js             # Gestion Socket.io

public/
├── index.html              # Interface HTML
├── script_v2.js           # ✅ Frontend JavaScript V2 (optimisé)
└── style_v2.css           # ✅ Styles WhatsApp-like
```

---

## 🐛 Erreurs Corrigées

### ❌ Erreur : "creator is required"
**Cause** : createOrGetConversation n'ajoutait pas le creator
**Solution** : ✅ Ajouté `creator: req.user.id` ligne 27

### ❌ Erreur : Avatars manquants
**Cause** : Les utilisateurs sans avatar affichaient une image cassée
**Solution** : ✅ Fallback Dicebear API en JavaScript

### ❌ Erreur : Contacts non chargés
**Cause** : populate() mal formé
**Solution** : ✅ Syntax mongoose explicite avec path/model

---

## 📡 Architecture Socket.io

```javascript
// Client envoie
socket.emit("typing", { conversationId, userName, isTyping })
socket.emit("mark-conversation-as-read", { conversationId })

// Serveur répond
socket.on("receive-message", (message) => {...})
socket.on("user-typing", ({ conversationId, userName, isTyping }) => {...})
socket.on("user-status", () => {...})
```

---

## 💾 Variables d'Environnement (.env)

```env
PORT=5000
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=votre_clé_secrète_complexe
NODE_ENV=development
```

---

## 🌐 Routes Principales Testées

### Auth ✅
```
POST /api/auth/register    → Créer compte
POST /api/auth/login       → Se connecter
POST /api/auth/logout      → Se déconnecter
```

### Messages ✅
```
POST   /api/messages/conversations      → Créer conversation
GET    /api/messages/conversations      → Lister conversations
GET    /api/messages/conversation/:id   → Messages d'une conv
POST   /api/messages                    → Envoyer message
DELETE /api/messages/conversations/:id/leave  → Quitter conv
```

### Contacts ✅
```
GET    /api/contacts           → Mes contacts
POST   /api/contacts           → Ajouter contact
PUT    /api/contacts/:id/block → Bloquer
GET    /api/contacts/blocked   → Contacts bloqués
```

### Users ✅
```
GET    /api/users              → Tous les utilisateurs
GET    /api/users/profile      → Mon profil
PUT    /api/users/profile      → Modifier profil
```

### Sessions ✅
```
GET    /api/sessions           → Mes sessions
DELETE /api/sessions/:id       → Fermer session
DELETE /api/sessions           → Fermer toutes
```

---

## 🎨 Design Frontend (WhatsApp-like)

### Couleurs Utilisées
- 🟢 Primary: `#25d366` (WhatsApp Green)
- ⚫ Dark: `#111b21` (Sidebar dark)
- ⚪ Bulles: `#dcf8c6` (envoyé), `#ffffff` (reçu)
- 🔘 Borders: `#e5e5e5`, `#2a2a2a`

### Composants
- Sidebar avec conversations (dark mode)
- Chat window avec messages
- Modals pour actions (contacts, profil, sessions)
- Avatar circulaire 40-50px
- Animations smooth

---

## 📊 Données de Test

### Comptes de Test à Créer
1. **Alice** - alice@test.com / password123
2. **Bob** - bob@test.com / password123
3. **Charlie** - charlie@test.com / password123

### Tests à Effectuer
```
Test 1: Alice ↔ Bob (conversation 1-to-1)
Test 2: Alice + Bob + Charlie (groupe)
Test 3: Bloquer/débloquer contact
Test 4: Modifier profil
Test 5: Multiples sessions
```

---

## 🎯 Prochaines Étapes (À Faire)

1. **Upload de Fichiers**
   - Intégrer multer dans le frontend
   - Bouton de fichier dans la barre de message
   - Afficher les fichiers uploadés

2. **Réactions Emoji**
   - Ajouter un emoji picker
   - Afficher les réactions sur les messages
   - Compteur de réactions

3. **Appels Audio/Vidéo**
   - Intégrer WebRTC
   - Boutons d'appel dans la barre

4. **Recherche de Messages**
   - Implémenter full-text search
   - Ajouter une barre de recherche

---

## ✨ Commandes Utiles

```bash
# Démarrer le serveur
npm run dev

# Démarrer en production
npm start

# Tuer un processus sur le port 5000
lsof -i :5000 | grep -v PID | awk '{print $2}' | xargs kill -9  # Linux/Mac
taskkill /F /FI "memusage>100000" /T  # Windows

# Vérifier les logs
tail -f logs/app.log

# Nettoyer node_modules
rm -rf node_modules && npm install
```

---

## 🆘 Troubleshooting

| Problème | Solution |
|----------|----------|
| Port déjà utilisé | Changer PORT dans .env ou tuer le processus |
| MongoDB non connecté | Vérifier MONGO_URI dans .env |
| Socket.io non connecté | Vérifier console.log, relancer le navigateur |
| Avatars cassés | Utiliser Dicebear fallback (inclus) |
| Messages ne s'envoient pas | Vérifier que vous êtes dans une conversation |
| Contacts vides | Créer d'autres comptes d'abord |

---

## 📞 Support

Pour toute question ou erreur :
1. Vérifier la console du navigateur (F12)
2. Vérifier les logs du serveur
3. Vérifier la connexion MongoDB
4. Vérifier la config .env

---

**Dernière mise à jour** : 24 novembre 2025
**Status** : ✅ Fonctionnel avec corrections d'erreurs
