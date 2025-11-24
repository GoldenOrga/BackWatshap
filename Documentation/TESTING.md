# 🧪 Tests WatChat

Guide complet pour exécuter et écrire des tests pour l'application WatChat.

## 📋 Structure des Tests

```
test/
├── auth.test.js              # Tests d'authentification
├── user.test.js              # Tests gestion utilisateurs
├── messages.test.js          # Tests messages & conversations
├── socket_handlers.test.js    # Tests Socket.io
├── websocket.test.js         # Tests WebSocket
└── test_helper.js            # Configuration globale des tests
```

## 🚀 Exécution des Tests

### 1. Prérequis
- MongoDB doit être en cours d'exécution
- Les dépendances doivent être installées : `npm install`

### 2. Configuration de MongoDB pour les tests

**Option A : MongoDB Local**
```bash
# Démarrer MongoDB localement
mongod
```

**Option B : MongoDB Atlas (Recommandé pour CI/CD)**
Créer un fichier `.env.test` avec :
```env
PORT=5001
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/wathcap_test
JWT_SECRET=test_secret_key
NODE_ENV=test
```

### 3. Lancer tous les tests

```bash
npm test
```

### 4. Lancer les tests en mode watch

```bash
npm run test:watch
```

### 5. Lancer un fichier de test spécifique

```bash
npx mocha test/auth.test.js
```

### 6. Générer un rapport de couverture

```bash
npm run coverage
```

---

## ✅ Tests Disponibles

### Authentication Tests (`auth.test.js`)

| Test | Description | Résultat |
|------|-------------|---------|
| `POST /api/auth/register` | Enregistrer un nouvel utilisateur | ✅ |
| `POST /api/auth/register` (email dupliqué) | Refuser email existant | ✅ |
| `POST /api/auth/register` (champs manquants) | Valider les champs requis | ✅ |
| `POST /api/auth/login` | Se connecter avec email/password | ✅ |
| `POST /api/auth/login` (mauvais password) | Rejeter mauvais mot de passe | ✅ |
| `POST /api/auth/login` (email inexistant) | Rejeter email inexistant | ✅ |
| `POST /api/auth/logout` | Se déconnecter | ✅ |
| `POST /api/auth/logout` (pas de token) | Rejeter sans authentification | ✅ |
| `POST /api/auth/logout` (token invalide) | Rejeter token invalide | ✅ |

### User Tests (`user.test.js`)

| Test | Description | Résultat |
|------|-------------|---------|
| `GET /api/users` | Lister tous les utilisateurs | ✅ |
| `GET /api/users?online=true` | Filtrer utilisateurs en ligne | ✅ |
| `GET /api/users` (pas de token) | Rejeter sans authentification | ✅ |
| `GET /api/users/profile` | Obtenir mon profil | ✅ |
| `PUT /api/users/profile` | Modifier mon profil | ✅ |
| `GET /api/users/search` | Chercher un utilisateur | ✅ |

### Message Tests (`messages.test.js`)

| Test | Description | Résultat |
|------|-------------|---------|
| `POST /api/messages/conversations` | Créer une conversation | ✅ |
| `POST /api/messages/conversations` (groupe) | Créer un groupe | ✅ |
| `GET /api/messages/conversations` | Lister les conversations | ✅ |
| `POST /api/messages` | Envoyer un message | ✅ |
| `POST /api/messages` (contenu vide) | Valider le contenu | ✅ |
| `GET /api/messages/conversation/:id` | Récupérer les messages | ✅ |
| `PUT /api/messages/:id` | Éditer un message | ✅ |
| `DELETE /api/messages/:id` | Supprimer un message | ✅ |
| `DELETE /api/messages/conversations/:id/leave` | Quitter conversation | ✅ |

### WebSocket Tests (`websocket.test.js`)

| Test | Description | Résultat |
|------|-------------|---------|
| Socket Connection | Connexion WebSocket | ✅ |
| Message Receive | Recevoir messages | ✅ |
| Typing Indicator | Indicateur de saisie | ✅ |

---

## 📊 Résultats des Tests

### Exécution Complète

```
✅ API Tests - Authentication Routes
  ✓ should register a new user successfully
  ✓ should return 400 if email is already used
  ✓ should return 400 if a required field is missing
  ✓ should log in an existing user and set them as online
  ✓ should fail login with wrong password
  ✓ should fail login with a non-existent email
  ✓ should log out an authenticated user and set them as offline
  ✓ should return 401 if no token is provided
  ✓ should return 401 if the token is invalid

✅ API Tests - User Routes (Full Coverage)
  ✓ should return a list of all users with their avatar
  ✓ should filter for online users when ?online=true is provided
  ✓ should return 401 if no token is provided
  ✓ should return the user's profile
  ✓ should update the user's profile
  ✓ should return 404 if user does not exist

✅ API Tests - Message & Conversation Routes
  ✓ should create a conversation between two users
  ✓ should send a message to a conversation
  ✓ should retrieve all messages from a conversation
  ✓ should edit a message sent by the user
  ✓ should delete a message sent by the user
  ✓ should not allow editing a message sent by another user
  ✓ should not allow deleting a message sent by another user
  ✓ should allow leaving a conversation

  47 passing (2.5s)
```

---

## 🔧 Ajouter Nouveaux Tests

### Template de Test

```javascript
import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import './test_helper.js';

describe('API Tests - Feature Name', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    // Setup avant chaque test
    // Créer des utilisateurs, tokens, etc.
  });

  afterEach(async () => {
    // Cleanup après chaque test
  });

  describe('POST /api/endpoint', () => {
    it('should perform action successfully', async () => {
      const res = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: 'value' });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('success');
    });

    it('should return 400 on invalid input', async () => {
      const res = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: '' });

      expect(res.statusCode).to.equal(400);
    });
  });
});
```

### Bonnes Pratiques

1. **Isolation** : Chaque test doit être indépendant
2. **Nettoyage** : Nettoyer les données après chaque test
3. **Assertions** : Être explicite avec les assertions
4. **Nombres magiques** : Utiliser des constantes
5. **Erreurs** : Tester les happy path ET les erreurs

---

## 🐛 Dépannage

### Les tests ne trouvent pas MongoDB

```bash
# Vérifier si MongoDB est en cours d'exécution
mongosh
# ou
mongo

# Démarrer MongoDB
mongod
```

### Les tests timeout

```javascript
// Augmenter le timeout dans test_helper.js
this.timeout(15000); // 15 secondes
```

### Les tests échouent avec "Cannot find module"

```bash
npm install
npm run dev
```

### Les tests échouent avec "EADDRINUSE"

```bash
# Tuer les processus Node
pkill -f "node"
```

---

## 📈 Couverture de Code

### Voir la couverture actuelle

```bash
npm run coverage
```

### Générer un rapport HTML

```bash
c8 npm test --reporter=html
# Ouvrir coverage/index.html
```

---

## 🚀 Intégration Continue

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:latest
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

---

## 📝 Notes

- Les tokens JWT sont régénérés pour chaque test
- MongoDB Atlas est recommandé pour les tests en production
- Les tests font appel à `test_helper.js` qui gère le setup/teardown global

---

**Dernière mise à jour:** 24 Novembre 2025
