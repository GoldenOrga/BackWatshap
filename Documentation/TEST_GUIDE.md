# 🚀 WatChat - Application de Chat en Temps Réel

Une application de chat moderne ressemblant à WhatsApp, construite avec **Express**, **MongoDB** et **Socket.io**.

---

## 📋 Fonctionnalités Implémentées

### ✅ Authentification & Sécurité
- ✅ Inscription et connexion avec JWT
- ✅ Tokens d'accès et de rafraîchissement
- ✅ Hachage des mots de passe avec bcrypt
- ✅ Gestion des sessions multiples

### ✅ Gestion des Utilisateurs
- ✅ Profil utilisateur modifiable (nom, avatar)
- ✅ Statut en ligne/hors ligne
- ✅ Recherche d'utilisateurs

### ✅ Système de Contacts
- ✅ Ajouter/supprimer des contacts
- ✅ Bloquer/débloquer des contacts
- ✅ Liste des contacts avec statut

### ✅ Conversations & Messagerie
- ✅ Conversations 1-to-1 et groupes
- ✅ Création de groupes
- ✅ Envoi/réception de messages en temps réel
- ✅ Indicateur de saisie en direct
- ✅ Statut des messages (envoyé, livré, lu)
- ✅ Édition et suppression de messages
- ✅ Quitter une conversation/groupe

### ✅ Gestion des Sessions
- ✅ Voir toutes les sessions actives
- ✅ Fermer une session spécifique
- ✅ Fermer toutes les sessions

---

## 🏗️ Architecture

```
BackEnd/
├── src/
│   ├── models/          # Schémas MongoDB
│   │   ├── User.js
│   │   ├── Conversation.js
│   │   ├── Message.js
│   │   ├── Contact.js
│   │   ├── Session.js
│   │   ├── Attachment.js
│   │   └── Group.js
│   ├── controllers/     # Logique métier
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── messageController.js
│   │   ├── contactController.js
│   │   ├── sessionController.js
│   │   ├── mediaController.js
│   │   └── groupController.js
│   ├── routes/         # Endpoints API
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── messages.js
│   │   ├── contacts.js
│   │   ├── sessions.js
│   │   ├── media.js
│   │   └── groups.js
│   ├── middleware/     # Middlewares Express
│   │   └── auth.js     # Authentification JWT
│   ├── socket/         # Socket.io
│   │   └── index.js
│   ├── config/         # Configuration
│   │   ├── db.js       # MongoDB
│   │   ├── logger.js   # Logging
│   │   └── sentry.js   # Monitoring
│   ├── app.js          # Application Express
│   └── server.js       # Serveur HTTP
├── public/
│   ├── index.html      # Interface Web
│   ├── script_v2.js    # Frontend JS
│   └── style_v2.css    # Styles (WhatsApp-like)
├── .env                # Configuration env
└── package.json        # Dépendances
```

---

## 🛠️ Installation & Démarrage

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer le fichier `.env`
```env
PORT=5000
MONGO_URI=votre_connection_string_mongodb
JWT_SECRET=votre_clé_secrète_jwt
```

### 3. Lancer le serveur en développement
```bash
npm run dev
```

Le serveur démarre sur `http://localhost:5000`

---

## 📱 Guide de Testage

### Créer des Compte Test
1. Accédez à `http://localhost:5000`
2. Cliquez sur **"S'inscrire"**
3. Créez 2-3 comptes différents :
   - **Compte 1** : Alice (alice@test.com)
   - **Compte 2** : Bob (bob@test.com)
   - **Compte 3** : Charlie (charlie@test.com)

### Tester les Fonctionnalités

#### 1️⃣ Authentification
```
✓ S'inscrire avec email/mot de passe
✓ Se connecter avec les identifiants
✓ Profil visible avec avatar
✓ Se déconnecter (bouton 🚪)
```

#### 2️⃣ Gestion de Contacts
```
✓ Cliquer sur le bouton 👥 (Contacts)
✓ Ajouter Alice comme contact
✓ Bloquer/débloquer un contact
✓ Voir les contacts bloqués
```

#### 3️⃣ Conversations 1-to-1
```
✓ Cliquer sur une conversation
✓ Envoyer un message
✓ Recevoir les messages en temps réel
✓ Voir l'indicateur de saisie (l'autre tape...)
```

#### 4️⃣ Créer des Groupes
```
✓ Cliquer sur le bouton ➕ (Nouveau groupe)
✓ Sélectionner plusieurs utilisateurs
✓ Ajouter un nom de groupe (optionnel)
✓ Cliquer sur "Créer"
✓ Chatter dans le groupe
```

#### 5️⃣ Modifier le Profil
```
✓ Cliquer sur votre profil en haut à gauche
✓ Modifier le nom
✓ Changer l'avatar (URL d'image)
✓ Enregistrer les changements
```

#### 6️⃣ Gestion des Sessions
```
✓ Cliquer sur le bouton 📱 (Sessions)
✓ Voir toutes les sessions actives
✓ Fermer une session spécifique
✓ Fermer toutes les sessions
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register          # S'inscrire
POST   /api/auth/login             # Se connecter
POST   /api/auth/refresh-token     # Rafraîchir le token
POST   /api/auth/logout            # Se déconnecter
```

### Users
```
GET    /api/users                  # Lister tous les utilisateurs
GET    /api/users/profile          # Obtenir mon profil
PUT    /api/users/profile          # Mettre à jour mon profil
GET    /api/users/search           # Chercher un utilisateur
POST   /api/users/:id/block        # Bloquer un utilisateur
```

### Contacts
```
GET    /api/contacts               # Mes contacts
GET    /api/contacts/blocked       # Mes contacts bloqués
POST   /api/contacts               # Ajouter un contact
DELETE /api/contacts/:id           # Supprimer un contact
PUT    /api/contacts/:id/block     # Bloquer un contact
PUT    /api/contacts/:id/unblock   # Débloquer un contact
```

### Messages & Conversations
```
GET    /api/messages/conversations # Mes conversations
GET    /api/messages/conversation/:id  # Messages d'une conversation
POST   /api/messages               # Envoyer un message
POST   /api/messages/conversations # Créer une conversation
PUT    /api/messages/:id           # Éditer un message
DELETE /api/messages/:id           # Supprimer un message
DELETE /api/messages/conversations/:id/leave  # Quitter une conversation
```

### Groups
```
POST   /api/groups                 # Créer un groupe
GET    /api/groups/:id             # Infos du groupe
PUT    /api/groups/:id             # Modifier le groupe
POST   /api/groups/:id/members     # Ajouter un membre
DELETE /api/groups/:id/members/:userId  # Supprimer un membre
PUT    /api/groups/:id/members/:userId/role  # Changer le rôle
GET    /api/groups/:id/members     # Lister les membres
POST   /api/groups/:id/leave       # Quitter le groupe
```

### Sessions
```
GET    /api/sessions               # Mes sessions
POST   /api/sessions               # Créer une session
DELETE /api/sessions/:id           # Fermer une session
DELETE /api/sessions               # Fermer toutes les sessions
```

### Media
```
POST   /api/media/upload           # Uploader un fichier
GET    /api/media/:id              # Télécharger un fichier
DELETE /api/media/:id              # Supprimer un fichier
```

---

## 📡 Socket.io Events

### Client → Serveur
```javascript
socket.emit("typing", { conversationId, userName, isTyping })
socket.emit("mark-conversation-as-read", { conversationId })
socket.emit("message-read", { messageId })
```

### Serveur → Client
```javascript
socket.on("receive-message", (message) => {...})
socket.on("user-typing", ({ conversationId, userName, isTyping }) => {...})
socket.on("user-status", () => {...})
socket.on("message-updated", (message) => {...})
```

---

## 🎨 Interface (WhatsApp-like)

### Design
- ✅ Dark mode pour la sidebar (Messages)
- ✅ Chat blanc avec bulle verte (#25d366)
- ✅ Avatar circulaire pour tous les utilisateurs
- ✅ Indicateur de saisie en live
- ✅ Responsive design (desktop + mobile)
- ✅ Modals pour contacts, sessions, profil

### Couleurs
- 🟢 Vert WhatsApp: `#25d366`
- ⚫ Sombre: `#111b21`
- ⚪ Bulle envoyée: `#dcf8c6`
- ⚪ Bulle reçue: `#ffffff`

---

## 🚀 Prochaines Fonctionnalités

- [ ] Upload de fichiers/images
- [ ] Appels audio/vidéo
- [ ] Messages vocaux
- [ ] Réactions emoji
- [ ] Story/Statut utilisateur
- [ ] Sauvegarde hors ligne
- [ ] Chiffrement end-to-end

---

## 📝 Notes

- La base de données MongoDB Atlas est utilisée
- Les images d'avatar utilisent DiceBear API comme fallback
- Les tokens JWT expirent après 1 jour
- Les sessions expirent après 7 jours
- Les fichiers uploadés sont stockés dans `/uploads`

---

## 🐛 Dépannage

### Le serveur ne démarre pas
```bash
# Vérifier la connexion MongoDB
# Vérifier la variable PORT dans .env
# Vérifier qu'aucun processus n'utilise déjà le port 5000
```

### Les messages ne s'affichent pas
```bash
# Vérifier la connexion Socket.io
# Vérifier que vous êtes dans une conversation
# Vérifier la console du navigateur (F12)
```

### Les fichiers n'upload pas
```bash
# Vérifier le dossier /uploads existe
# Vérifier les permissions du dossier
# Vérifier la limite de taille (50MB)
```

---

**Développé avec ❤️ pour WatChat**
