# Backend WatChat - Documentation API Complète

## 🚀 Installation et Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer le serveur en développement
npm run dev

# Lancer les tests
npm test

# Voir la couverture de code
npm run coverage
```

## 📋 Structure du Projet

```
src/
├── config/          # Configuration (BD, logger, Sentry)
├── controllers/     # Logique métier (auth, messages, contacts, etc.)
├── middleware/      # Middleware (authentification, etc.)
├── models/          # Schémas MongoDB
├── routes/          # Routes API
├── socket/          # WebSocket (Socket.io)
├── utils/           # Utilitaires (validateurs)
├── uploaders/       # Configuration multer pour uploads
├── app.js           # Configuration Express
└── server.js        # Point d'entrée
```

---

## 🔐 Authentication

### 1️⃣ POST /api/auth/register
**Enregistrer un nouvel utilisateur**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean Martin",
    "email": "jean@example.com",
    "password": "SecurePass123!",
    "avatar": "https://api.example.com/avatar.jpg"
  }'
```

**Request Body:**
```json
{
  "name": "Jean Martin",
  "email": "jean@example.com",
  "password": "SecurePass123!",
  "avatar": "https://api.example.com/avatar.jpg"
}
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64abc123def456ghi789",
    "name": "Jean Martin",
    "email": "jean@example.com",
    "avatar": "https://api.example.com/avatar.jpg",
    "isOnline": true
  }
}
```

### 2️⃣ POST /api/auth/login
**Connexion utilisateur**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jean@example.com",
    "password": "SecurePass123!"
  }'
```

**Request Body:**
```json
{
  "email": "jean@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64abc123def456ghi789",
    "name": "Jean Martin",
    "email": "jean@example.com",
    "avatar": "https://api.example.com/avatar.jpg",
    "isOnline": true
  }
}
```

### 3️⃣ POST /api/auth/refresh-token
**Rafraîchir le token d'accès**

```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4️⃣ POST /api/auth/logout
**Déconnexion utilisateur**

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200):**
```json
{
  "message": "Déconnexion réussie ✅"
}
```

---

## 👤 Utilisateurs

### 1️⃣ GET /api/users
**Récupérer la liste des utilisateurs**

```bash
# Récupérer tous les utilisateurs (page 1)
curl -X GET "http://localhost:5000/api/users" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Avec pagination
curl -X GET "http://localhost:5000/api/users?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Seulement les utilisateurs en ligne
curl -X GET "http://localhost:5000/api/users?online=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
[
  {
    "_id": "64abc123def456ghi789",
    "name": "Jean Martin",
    "email": "jean@example.com",
    "avatar": "https://api.example.com/avatar.jpg",
    "isOnline": true
  },
  {
    "_id": "64def456ghi789abc123",
    "name": "Marie Dupont",
    "email": "marie@example.com",
    "avatar": "https://api.example.com/avatar2.jpg",
    "isOnline": false
  }
]
```

### 2️⃣ GET /api/users/search
**Chercher des utilisateurs**

```bash
curl -X GET "http://localhost:5000/api/users/search?q=jean" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
[
  {
    "_id": "64abc123def456ghi789",
    "name": "Jean Martin",
    "email": "jean@example.com",
    "avatar": "https://api.example.com/avatar.jpg",
    "isOnline": true
  }
]
```

### 3️⃣ GET /api/users/:id
**Récupérer un utilisateur spécifique**

```bash
curl -X GET "http://localhost:5000/api/users/64abc123def456ghi789" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "_id": "64abc123def456ghi789",
  "name": "Jean Martin",
  "email": "jean@example.com",
  "avatar": "https://api.example.com/avatar.jpg",
  "isOnline": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 4️⃣ PUT /api/users/profile
**Mettre à jour le profil**

```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean-Pierre Martin",
    "avatar": "https://api.example.com/new-avatar.jpg"
  }'
```

**Request Body:**
```json
{
  "name": "Jean-Pierre Martin",
  "avatar": "https://api.example.com/new-avatar.jpg"
}
```

**Response (200):**
```json
{
  "_id": "64abc123def456ghi789",
  "name": "Jean-Pierre Martin",
  "email": "jean@example.com",
  "avatar": "https://api.example.com/new-avatar.jpg",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

### 5️⃣ POST /api/users/change-password
**Changer le mot de passe**

```bash
curl -X POST http://localhost:5000/api/users/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass123!"
  }'
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response (200):**
```json
{
  "message": "Mot de passe changé avec succès"
}
```

### 6️⃣ DELETE /api/users/account
**Supprimer le compte utilisateur**

```bash
curl -X DELETE http://localhost:5000/api/users/account \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePass123!"
  }'
```

**Response (200):**
```json
{
  "message": "Compte supprimé avec succès"
}
```

---

## 👥 Contacts

### 1️⃣ POST /api/contacts
**Ajouter un nouveau contact**

```bash
curl -X POST http://localhost:5000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "64def456ghi789abc123"
  }'
```

**Request Body:**
```json
{
  "contactId": "64def456ghi789abc123"
}
```

**Response (201):**
```json
{
  "_id": "64xyz789abc123def456",
  "user": "64abc123def456ghi789",
  "contact": "64def456ghi789abc123",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 2️⃣ GET /api/contacts
**Récupérer les contacts acceptés**

```bash
curl -X GET "http://localhost:5000/api/contacts?status=accepted" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**
- `status`: `pending`, `accepted`, `blocked` (default: `accepted`)

**Response (200):**
```json
[
  {
    "_id": "64xyz789abc123def456",
    "user": "64abc123def456ghi789",
    "contact": {
      "_id": "64def456ghi789abc123",
      "name": "Marie Dupont",
      "email": "marie@example.com",
      "avatar": "https://api.example.com/avatar2.jpg",
      "isOnline": true
    },
    "status": "accepted"
  }
]
```

### 3️⃣ POST /api/contacts/:contactId/block
**Bloquer un contact**

```bash
curl -X POST http://localhost:5000/api/contacts/64def456ghi789abc123/block \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "message": "Contact bloqué avec succès"
}
```

### 4️⃣ POST /api/contacts/:contactId/unblock
**Débloquer un contact**

```bash
curl -X POST http://localhost:5000/api/contacts/64def456ghi789abc123/unblock \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "message": "Contact débloqué avec succès"
}
```

---

## 💬 Messages et Conversations

### 🎯 SCÉNARIO COMPLET : Créer une conversation et envoyer des messages

#### **Étape 1: Obtenir l'ID d'un utilisateur (recherche)**

```bash
curl -X GET "http://localhost:5000/api/users/search?q=marie" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "_id": "64def456ghi789abc123",
    "name": "Marie Dupont",
    "email": "marie@example.com"
  }
]
```

#### **Étape 2: Créer une conversation**

```bash
curl -X POST http://localhost:5000/api/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "participantIds": ["64def456ghi789abc123"]
  }'
```

**Request Body (Conversation 1-à-1):**
```json
{
  "participantIds": ["64def456ghi789abc123"]
}
```

**Request Body (Conversation de groupe):**
```json
{
  "participantIds": ["64def456ghi789abc123", "64ghi789abc123def456"],
  "name": "Projet WatChat"
}
```

**Response (201):**
```json
{
  "_id": "64conv123abc456def789",
  "participants": [
    {
      "_id": "64abc123def456ghi789",
      "name": "Jean Martin",
      "avatar": "https://api.example.com/avatar.jpg",
      "isOnline": true
    },
    {
      "_id": "64def456ghi789abc123",
      "name": "Marie Dupont",
      "avatar": "https://api.example.com/avatar2.jpg",
      "isOnline": false
    }
  ],
  "name": null,
  "isGroup": false,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### **Étape 3: Envoyer un message**

```bash
curl -X POST http://localhost:5000/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "64conv123abc456def789",
    "content": "Bonjour Marie! Comment ça va?"
  }'
```

**Request Body:**
```json
{
  "conversation_id": "64conv123abc456def789",
  "content": "Bonjour Marie! Comment ça va?"
}
```

**Response (201):**
```json
{
  "_id": "64msg123abc456def789",
  "sender": {
    "_id": "64abc123def456ghi789",
    "name": "Jean Martin",
    "avatar": "https://api.example.com/avatar.jpg"
  },
  "conversation": "64conv123abc456def789",
  "content": "Bonjour Marie! Comment ça va?",
  "createdAt": "2024-01-15T10:32:00.000Z",
  "edited": false,
  "deleted": false
}
```

### 📨 Autres opérations sur les messages

#### **GET /api/messages/conversations**
Récupérer toutes les conversations de l'utilisateur

```bash
curl -X GET http://localhost:5000/api/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
[
  {
    "_id": "64conv123abc456def789",
    "conversationName": "Marie Dupont",
    "participants": [
      {
        "_id": "64abc123def456ghi789",
        "name": "Jean Martin",
        "isOnline": true
      },
      {
        "_id": "64def456ghi789abc123",
        "name": "Marie Dupont",
        "isOnline": false
      }
    ],
    "lastMessage": {
      "_id": "64msg123abc456def789",
      "content": "Bonjour Marie! Comment ça va?",
      "sender": {
        "name": "Jean Martin"
      }
    },
    "unreadCount": 0,
    "isGroup": false,
    "updatedAt": "2024-01-15T10:32:00.000Z"
  }
]
```

#### **GET /api/messages/conversation/:conversation_id**
Récupérer les messages d'une conversation

```bash
curl -X GET "http://localhost:5000/api/messages/conversation/64conv123abc456def789?page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**
- `page`: numéro de page (default: 1)

**Response (200):**
```json
[
  {
    "_id": "64msg123abc456def789",
    "sender": {
      "_id": "64abc123def456ghi789",
      "name": "Jean Martin",
      "avatar": "https://api.example.com/avatar.jpg"
    },
    "conversation": "64conv123abc456def789",
    "content": "Bonjour Marie! Comment ça va?",
    "createdAt": "2024-01-15T10:32:00.000Z",
    "edited": false,
    "deleted": false
  }
]
```

#### **PUT /api/messages/:id**
Modifier un message

```bash
curl -X PUT http://localhost:5000/api/messages/64msg123abc456def789 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Bonjour Marie! Comment allez-vous?"
  }'
```

**Response (200):**
```json
{
  "_id": "64msg123abc456def789",
  "sender": "64abc123def456ghi789",
  "conversation": "64conv123abc456def789",
  "content": "Bonjour Marie! Comment allez-vous?",
  "edited": true,
  "createdAt": "2024-01-15T10:32:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

#### **DELETE /api/messages/:id**
Supprimer un message

```bash
curl -X DELETE http://localhost:5000/api/messages/64msg123abc456def789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "message": "Message supprimé"
}
```

#### **DELETE /api/messages/conversations/:conversationId/leave**
Quitter une conversation

```bash
curl -X DELETE http://localhost:5000/api/messages/conversations/64conv123abc456def789/leave \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "message": "Vous avez quitté la conversation."
}
```

---

## 📤 Téléchargement de fichiers

### 1️⃣ POST /api/media/upload
**Télécharger un fichier (image, vidéo, document)**

```bash
curl -X POST http://localhost:5000/api/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/chemin/vers/mon-image.jpg" \
  -F "conversationId=64conv123abc456def789"
```

**Form Data:**
- `file`: Le fichier à uploader
- `conversationId` (optionnel): ID de la conversation
- `messageId` (optionnel): ID du message

**Fichiers acceptés:**
- Images: `JPEG`, `PNG`, `GIF`, `WebP`
- Vidéos: `MP4`, `WebM`
- Audio: `MP3`, `WAV`, `OGG`
- Documents: `PDF`, `DOC`, `DOCX`

**Response (201):**
```json
{
  "_id": "64att123abc456def789",
  "uploader": "64abc123def456ghi789",
  "originalName": "mon-image.jpg",
  "filename": "1642334400000-a1b2c3d4e5-mon-image.jpg",
  "mimetype": "image/jpeg",
  "size": 245632,
  "url": "/uploads/1642334400000-a1b2c3d4e5-mon-image.jpg",
  "type": "image",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 2️⃣ GET /api/media/:fileId
**Récupérer les informations d'un fichier**

```bash
curl -X GET http://localhost:5000/api/media/64att123abc456def789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "_id": "64att123abc456def789",
  "uploader": {
    "_id": "64abc123def456ghi789",
    "name": "Jean Martin",
    "avatar": "https://api.example.com/avatar.jpg"
  },
  "originalName": "mon-image.jpg",
  "filename": "1642334400000-a1b2c3d4e5-mon-image.jpg",
  "mimetype": "image/jpeg",
  "size": 245632,
  "url": "/uploads/1642334400000-a1b2c3d4e5-mon-image.jpg",
  "type": "image",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 3️⃣ GET /api/media/download/:fileId
**Télécharger un fichier**

```bash
curl -X GET http://localhost:5000/api/media/download/64att123abc456def789 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -O
```

**Response:** Le fichier est téléchargé

### 4️⃣ DELETE /api/media/:fileId
**Supprimer un fichier**

```bash
curl -X DELETE http://localhost:5000/api/media/64att123abc456def789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "message": "Fichier supprimé avec succès"
}
```

---

## 🔗 Sessions et Appareils

### 1️⃣ POST /api/sessions
**Créer une nouvelle session**

```bash
curl -X POST http://localhost:5000/api/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceName": "Mon iPhone 13",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
  }'
```

**Response (201):**
```json
{
  "_id": "64ses123abc456def789",
  "user": "64abc123def456ghi789",
  "deviceName": "Mon iPhone 13",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "lastActivity": "2024-01-15T10:30:00.000Z"
}
```

### 2️⃣ GET /api/sessions
**Récupérer les sessions actives**

```bash
curl -X GET http://localhost:5000/api/sessions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
[
  {
    "_id": "64ses123abc456def789",
    "deviceName": "Mon iPhone 13",
    "ipAddress": "192.168.1.100",
    "isActive": true,
    "lastActivity": "2024-01-15T10:35:00.000Z"
  },
  {
    "_id": "64ses456def789abc123",
    "deviceName": "Mon Laptop",
    "ipAddress": "192.168.1.101",
    "isActive": true,
    "lastActivity": "2024-01-15T10:33:00.000Z"
  }
]
```

### 3️⃣ DELETE /api/sessions/:sessionId
**Fermer une session spécifique**

```bash
curl -X DELETE http://localhost:5000/api/sessions/64ses123abc456def789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "message": "Session fermée avec succès"
}
```

### 4️⃣ POST /api/sessions/terminate-all
**Fermer toutes les sessions**

```bash
curl -X POST http://localhost:5000/api/sessions/terminate-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "message": "Toutes les sessions ont été fermées"
}
```

---

## 🔒 Authentification et Autorisation

Toutes les requêtes authentifiées nécessitent le header:
```
Authorization: Bearer <accessToken>
```

**Exemple:**
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0YWJjMTIzZGVmNDU2Z2hpNzg5IiwiaWF0IjoxNjQyMzM0NDAwfQ.abc123xyz"
```

---

## 📊 Variables d'Environnement

Créez un fichier `.env` à la racine du projet:

```env
# Serveur
PORT=5000
NODE_ENV=development

# Base de données
MONGO_URI=mongodb://localhost:27017/watcher

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production

# Sentry (optionnel)
SENTRY_DSN=https://your_sentry_key@sentry.io/your_project_id

# Logs
DEBUG=true
LOG_LEVEL=info
```

---

## 🛠️ Codes de Réponse HTTP

| Code | Signification |
|------|-------------|
| **200** | OK - Requête réussie |
| **201** | Created - Ressource créée |
| **400** | Bad Request - Données invalides |
| **401** | Unauthorized - Token manquant ou invalide |
| **403** | Forbidden - Accès refusé |
| **404** | Not Found - Ressource non trouvée |
| **500** | Server Error - Erreur serveur |

---

## 📝 Logging et Débogage

Les logs sont sauvegardés dans le répertoire `logs/` avec le format: `YYYY-MM-DD.log`

Pour activer le mode debug:
```bash
DEBUG=true npm run dev
```

---

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Mode watch (re-exécute les tests à chaque changement)
npm run test:watch

# Voir la couverture de code
npm run coverage
```

---

## 🔄 WebSocket Events (Socket.io)

Les événements en temps réel sont gérés via Socket.io:

### Événements principaux:

- **`receive-message`**: Nouveau message reçu
- **`user-online`**: Utilisateur connecté
- **`user-offline`**: Utilisateur déconnecté
- **`typing`**: Utilisateur en train d'écrire
- **`stop-typing`**: Utilisateur a arrêté d'écrire

Voir `Documentation/SOCKET_IO_EVENTS.md` pour plus de détails.

---

## 📚 Ressources Supplémentaires

- [Socket.io Events](./SOCKET_IO_EVENTS.md)
- [Project Status](./PROJECT_STATUS.md)
- [Testing Guide](./TEST_GUIDE.md)
- [Setup Guide](./SETUP.md)
