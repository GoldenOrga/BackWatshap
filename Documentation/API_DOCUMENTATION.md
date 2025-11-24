# Backend WatChat - Documentation API

## 🚀 Installation

```bash
npm install
npm run dev
```

## 📋 Structure du Projet

```
src/
├── config/          # Configuration (BD, logger, Sentry)
├── controllers/     # Logique métier
├── middleware/      # Middleware (auth, validation)
├── models/          # Schémas MongoDB
├── routes/          # Routes API
├── socket/          # WebSocket (Socket.io)
├── utils/           # Utilitaires (validateurs)
├── app.js           # Configuration Express
└── server.js        # Point d'entrée
```

## 🔐 Authentication

### POST /api/auth/register
Enregistrer un nouvel utilisateur
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "avatar": "https://example.com/avatar.jpg"
}
```
**Response:** `{ accessToken, refreshToken, user }`

### POST /api/auth/login
Connexion utilisateur
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Response:** `{ accessToken, refreshToken, user }`

### POST /api/auth/refresh-token
Rafraîchir le token d'accès
```json
{
  "refreshToken": "eyJhbGc..."
}
```
**Response:** `{ accessToken, refreshToken }`

### POST /api/auth/logout
Déconnexion (nécessite authentification)
**Response:** `{ message: "Déconnexion réussie ✅" }`

---

## 👤 Utilisateurs

### GET /api/users
Récupérer la liste des utilisateurs
**Query params:**
- `page` (default: 1)
- `limit` (default: 10)
- `online` (true/false)

### GET /api/users/search
Chercher des utilisateurs
**Query params:**
- `q` (string) - Terme de recherche

### GET /api/users/:id
Récupérer un utilisateur spécifique

### PUT /api/users/profile
Mettre à jour le profil (authentifié)
```json
{
  "name": "New Name",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

### POST /api/users/change-password
Changer le mot de passe (authentifié)
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

### DELETE /api/users/account
Supprimer le compte (authentifié)
```json
{
  "password": "password123"
}
```

---

## 👥 Contacts

### POST /api/contacts
Ajouter un contact (authentifié)
```json
{
  "contactId": "64abc123..."
}
```

### GET /api/contacts
Récupérer les contacts (authentifié)
**Query params:**
- `status` (pending, accepted, blocked) - default: accepted

### GET /api/contacts/blocked
Récupérer les contacts bloqués (authentifié)

### GET /api/contacts/search
Chercher dans les contacts (authentifié)
**Query params:**
- `q` (string)

### DELETE /api/contacts/:contactId
Supprimer un contact (authentifié)

### POST /api/contacts/:contactId/block
Bloquer un contact (authentifié)

### POST /api/contacts/:contactId/unblock
Débloquer un contact (authentifié)

---

## 💬 Messages

### POST /api/messages/conversations
Créer ou obtenir une conversation (authentifié)
```json
{
  "participantIds": ["64abc123...", "64def456..."],
  "name": "Nom du groupe (optionnel)"
}
```

### GET /api/messages/conversations
Récupérer les conversations (authentifié)

### GET /api/messages/conversation/:conversation_id
Récupérer les messages d'une conversation (authentifié)
**Query params:**
- `page` (default: 1)

### POST /api/messages
Envoyer un message (authentifié)
```json
{
  "conversation_id": "64abc123...",
  "content": "Hello!"
}
```

### PUT /api/messages/:id
Modifier un message (authentifié)
```json
{
  "content": "Message modifié"
}
```

### DELETE /api/messages/:id
Supprimer un message (authentifié)

### DELETE /api/messages/conversations/:conversationId/leave
Quitter une conversation (authentifié)

---

## 🔗 Sessions

### POST /api/sessions
Créer une nouvelle session (authentifié)
```json
{
  "deviceName": "Mon iPhone",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### GET /api/sessions
Récupérer les sessions actives (authentifié)

### GET /api/sessions/history
Récupérer l'historique des sessions (authentifié)
**Query params:**
- `page` (default: 1)

### GET /api/sessions/devices
Récupérer les appareils actifs (authentifié)

### DELETE /api/sessions/:sessionId
Fermer une session spécifique (authentifié)

### POST /api/sessions/terminate-all
Fermer toutes les sessions (authentifié)

### POST /api/sessions/terminate-others
Fermer toutes les autres sessions (authentifié)
```json
{
  "currentSessionId": "64abc123..."
}
```

---

## 🔒 Authentification

Ajouter le header `Authorization: Bearer <accessToken>` pour les requêtes authentifiées.

---

## 📊 Variables d'Environnement

```env
PORT=5000
MONGO_URI=mongodb://...
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
SENTRY_DSN=your_sentry_dsn (optionnel)
DEBUG=true (optionnel)
```

---

## 📝 Logging

Les logs sont sauvegardés dans `logs/YYYY-MM-DD.log`

## 🛠️ Tests

```bash
npm test              # Lancer les tests
npm run test:watch   # Mode watch
npm run coverage     # Coverage
```
