# 📡 Socket.io Events - Documentation Complète

## Vue d'ensemble

Le système Socket.io gère la communication en temps réel entre les clients et le serveur. Tous les événements supportent la reconnexion automatique avec récupération des messages manqués.

---

## ✅ 4.1 - Configuration Socket.io

### Initialisation
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

### CORS Configuration
- Origin: `process.env.FRONTEND_URL` ou `*`
- Credentials: `true`
- Methods: `GET, POST`

### Authentification
- Token JWT requis dans `socket.handshake.auth.token`
- Validation JWT automatique lors de la connexion

---

## ✅ 4.2 - Événements de Messages

### 1️⃣ Envoyer un message
**Client → Serveur**
```javascript
socket.emit('send-message', {
  conversationId: '507f1f77bcf86cd799439011',
  content: 'Bonjour!',
  attachments: [] // optionnel
}, (ack) => {
  console.log('Message envoyé:', ack.messageId);
  console.log('Status:', ack.status); // 'sent'
});
```

**Serveur → Client (Reçu par destinataire)**
```javascript
socket.on('receive-message', (message) => {
  console.log(message);
  // {
  //   _id: 'message_id',
  //   conversationId: 'conv_id',
  //   sender: { _id, name, avatar },
  //   content: 'Bonjour!',
  //   type: 'text',
  //   status: 'sent',
  //   createdAt: timestamp
  // }
});
```

### 2️⃣ Confirmation d'envoi
**Serveur → Client (Après 500ms)**
```javascript
socket.on('message-delivered', (data) => {
  // {
  //   messageId: 'msg_id',
  //   status: 'delivered',
  //   timestamp: new Date()
  // }
});
```

### 3️⃣ Notification de lecture
**Client → Serveur**
```javascript
socket.emit('mark-conversation-as-read', {
  conversationId: '507f1f77bcf86cd799439011'
});
```

**Serveur → Client (Autres utilisateurs)**
```javascript
socket.on('messages-read', (data) => {
  // {
  //   conversationId: 'conv_id',
  //   readerId: 'user_id',
  //   timestamp: new Date()
  // }
});
```

### 4️⃣ Édition de message
**Client → Serveur**
```javascript
socket.emit('edit-message', {
  messageId: '507f1f77bcf86cd799439011',
  conversationId: 'conv_id',
  content: 'Bonjour modifié!'
});
```

**Serveur → Client**
```javascript
socket.on('message-edited', (data) => {
  // {
  //   messageId: 'msg_id',
  //   conversationId: 'conv_id',
  //   content: 'Bonjour modifié!',
  //   editedAt: timestamp,
  //   sender: { _id, name, avatar }
  // }
});
```

### 5️⃣ Suppression de message
**Client → Serveur**
```javascript
socket.emit('delete-message', {
  messageId: '507f1f77bcf86cd799439011',
  conversationId: 'conv_id'
});
```

**Serveur → Client**
```javascript
socket.on('message-deleted', (data) => {
  // {
  //   messageId: 'msg_id',
  //   conversationId: 'conv_id',
  //   timestamp: new Date()
  // }
});
```

### 6️⃣ Réaction au message
**Client → Serveur (Ajouter)**
```javascript
socket.emit('add-reaction', {
  messageId: '507f1f77bcf86cd799439011',
  conversationId: 'conv_id',
  emoji: '👍'
});
```

**Client → Serveur (Supprimer)**
```javascript
socket.emit('remove-reaction', {
  messageId: '507f1f77bcf86cd799439011',
  conversationId: 'conv_id',
  emoji: '👍'
});
```

**Serveur → Client**
```javascript
socket.on('reaction-added', (data) => {
  // {
  //   messageId: 'msg_id',
  //   conversationId: 'conv_id',
  //   userId: 'user_id',
  //   emoji: '👍',
  //   timestamp: new Date()
  // }
});

socket.on('reaction-removed', (data) => {
  // {
  //   messageId: 'msg_id',
  //   conversationId: 'conv_id',
  //   userId: 'user_id',
  //   emoji: '👍',
  //   timestamp: new Date()
  // }
});
```

---

## ✅ 4.3 - Gestion de la Présence

### 1️⃣ Statut en ligne/hors ligne
**Serveur → Tous les clients**
```javascript
socket.on('user-status', (data) => {
  // {
  //   userId: 'user_id',
  //   isOnline: true/false,
  //   lastSeen: timestamp,
  //   timestamp: new Date()
  // }
});
```

### 2️⃣ Rejoindre une conversation
**Client → Serveur**
```javascript
socket.emit('join-conversation', {
  conversationId: '507f1f77bcf86cd799439011'
});
```

**Serveur → Client (Autres utilisateurs)**
```javascript
socket.on('user-joined-conversation', (data) => {
  // {
  //   conversationId: 'conv_id',
  //   userId: 'user_id',
  //   userName: 'John',
  //   timestamp: new Date()
  // }
});
```

### 3️⃣ Quitter une conversation
**Client → Serveur**
```javascript
socket.emit('leave-conversation', {
  conversationId: '507f1f77bcf86cd799439011'
});
```

**Serveur → Client (Autres utilisateurs)**
```javascript
socket.on('user-left-conversation', (data) => {
  // {
  //   conversationId: 'conv_id',
  //   userId: 'user_id',
  //   timestamp: new Date()
  // }
});
```

### 4️⃣ Indicateur de saisie
**Client → Serveur**
```javascript
socket.emit('typing', {
  conversationId: 'conv_id',
  isTyping: true // ou false quand l'utilisateur arrête
});
```

**Serveur → Client (Autres utilisateurs)**
```javascript
socket.on('user-typing', (data) => {
  // {
  //   conversationId: 'conv_id',
  //   senderId: 'user_id',
  //   isTyping: true,
  //   timestamp: new Date()
  // }
});
```

---

## ✅ 4.4 - Notifications en Temps Réel

### 1️⃣ Ajouter à un groupe
**Client → Serveur**
```javascript
socket.emit('user-added-to-group', {
  conversationId: 'group_id',
  newUserId: 'new_user_id'
});
```

**Serveur → Client**
```javascript
socket.on('group-user-added', (data) => {
  // {
  //   conversationId: 'group_id',
  //   newUserId: 'new_user_id',
  //   conversationName: 'Groupe Amis',
  //   timestamp: new Date()
  // }
});
```

### 2️⃣ Retirer d'un groupe
**Client → Serveur**
```javascript
socket.emit('user-removed-from-group', {
  conversationId: 'group_id',
  removedUserId: 'removed_user_id'
});
```

**Serveur → Client**
```javascript
socket.on('group-user-removed', (data) => {
  // {
  //   conversationId: 'group_id',
  //   removedUserId: 'removed_user_id',
  //   timestamp: new Date()
  // }
});

// Notification au utilisateur retiré
socket.on('removed-from-group', (data) => {
  // {
  //   conversationId: 'group_id',
  //   timestamp: new Date()
  // }
});
```

### 3️⃣ Mise à jour des infos du groupe
**Client → Serveur**
```javascript
socket.emit('group-info-updated', {
  conversationId: 'group_id',
  updates: {
    name: 'Nouveau nom',
    avatar: 'url',
    description: 'Nouvelle description'
  }
});
```

**Serveur → Client**
```javascript
socket.on('group-updated', (data) => {
  // {
  //   conversationId: 'group_id',
  //   updates: { ... },
  //   timestamp: new Date()
  // }
});
```

---

## ✅ 4.5 - Gestion de la Reconnexion

### 1️⃣ Reconnexion automatique
La reconnexion est gérée automatiquement par Socket.io avec:
- Délai initial: 1000ms
- Délai max: 5000ms
- Tentatives max: 5

```javascript
socket.on('reconnect', () => {
  console.log('Reconnecté au serveur');
  socket.emit('reconnect');
});

socket.on('reconnect_error', (error) => {
  console.error('Erreur de reconnexion:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Échec de la reconnexion');
});
```

### 2️⃣ Messages manqués après reconnexion
**Serveur → Client (Automatique)**
```javascript
socket.on('missed-messages', (data) => {
  // {
  //   messages: [ { _id, sender, content, ... } ],
  //   count: 5,
  //   timestamp: new Date()
  // }
});
```

### 3️⃣ Demander les messages manqués manuellement
**Client → Serveur**
```javascript
socket.emit('request-missed-messages', {
  lastMessageTimestamp: lastMessageTime
});
```

**Serveur → Client**
```javascript
socket.on('missed-messages', (data) => {
  // Messages depuis le timestamp fourni
});
```

---

## 🔧 Exemple d'Intégration Complète

```javascript
// Connexion
const socket = io('http://localhost:5000', {
  auth: { token: accessToken },
  reconnection: true
});

// 1. Envoyer un message
function sendMessage(conversationId, content) {
  socket.emit('send-message', {
    conversationId,
    content
  }, (ack) => {
    console.log('Envoyé avec ID:', ack.messageId);
  });
}

// 2. Recevoir les messages
socket.on('receive-message', (message) => {
  console.log('Nouveau message:', message.content);
  updateUI(message);
});

// 3. Indicateur de saisie
let typingTimeout;
function handleTyping() {
  socket.emit('typing', { conversationId, isTyping: true });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { conversationId, isTyping: false });
  }, 3000);
}

// 4. Marquer comme lu
function markAsRead(conversationId) {
  socket.emit('mark-conversation-as-read', { conversationId });
}

// 5. Voir les messages manqués
socket.on('missed-messages', (data) => {
  data.messages.forEach(msg => {
    console.log('Message manqué:', msg.content);
    // Synchroniser avec la base locale
  });
});

// 6. Gestion des erreurs
socket.on('connect_error', (error) => {
  console.error('Erreur de connexion:', error);
});

socket.on('disconnect', () => {
  console.log('Déconnecté');
});
```

---

## 📊 Statuts de Message

| Statut | Signification |
|--------|---------------|
| `pending` | En attente d'envoi |
| `sent` | Envoyé au serveur |
| `delivered` | Livré au destinataire |
| `read` | Lu par le destinataire |

---

## 🔒 Sécurité

- ✅ Authentification JWT requise
- ✅ Validation des participations (vous ne pouvez que recevoir les messages de conversations vous appartenant)
- ✅ Nettoyage automatique de la présence à la déconnexion
- ✅ Timestamps pour prévenir les attaques de rejeu

---

## 📈 Performance

- Utilise des **rooms Socket.io** pour cibler les utilisateurs
- Récupération automatique des messages après 500ms (delivered)
- Gestion efficace des maps de présence
- Suppression automatique des données obsolètes

---

## 🚀 À Implémenter dans le Frontend

1. Intégrer tous les événements dans `script_v2.js`
2. Ajouter les listeners pour chaque événement
3. Mettre à jour l'UI en temps réel
4. Gérer les erreurs et reconnexions

