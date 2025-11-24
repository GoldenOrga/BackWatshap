🚀 Démarrage Rapide
Prérequis

    Node.js (version 18.x ou supérieure recommandée)

    MongoDB (instance locale ou une base de données cloud comme MongoDB Atlas)

    Un gestionnaire de paquets comme npm ou yarn.

1. Installation

Clonez le dépôt et installez les dépendances :
code Bash

    
# zip le projet


# utilisateur
{ "name": "Alice", "email": "alice@example.com", "password": "password123" }
{ "name": "Bob", "email": "bob@example.com", "password": "password456" }

# Installer les dépendances
npm install

  

2. Configuration de l'Environnement

Créez un fichier .env à la racine du projet en vous basant sur l'exemple .env.example.
code Bash

    
# Copier le fichier d'exemple
cp .env.example .env

  

Modifiez le fichier .env avec vos propres informations, notamment l'URI de votre base de données MongoDB.

.env
code Env

    
# Port sur lequel le serveur écoutera (ex: 3000)
PORT=3000

# URI de connexion à votre base de données MongoDB
MONGO_URI=mongodb://localhost:27017/chat_app

# Secret pour signer les tokens JWT (une longue chaîne de caractères aléatoire)
JWT_SECRET=ewan

  

3. Lancer l'Application
En mode développement

Cette commande utilise nodemon pour redémarrer automatiquement le serveur à chaque modification de fichier.
code Bash

    
npm run dev

  

En mode production

Cette commande lance le serveur de manière standard.
code Bash

    
npm start

  

Une fois le serveur lancé, vous devriez voir le message 🚀 Serveur lancé sur le port 3000 ou 5000.

Ouvrez votre navigateur et allez à l'adresse http://localhost:3000. ou http://localhost:5000
🧪 Tests

Le projet est équipé d'une suite de tests complète pour garantir la qualité et la non-régression.
Lancer tous les tests

Cette commande exécute tous les tests unitaires, d'intégration API et WebSocket dans un environnement de test dédié.
code Bash

    
npm test

  

Lancer les tests en mode "watch"

Les tests se relanceront automatiquement à chaque modification de fichier.
code Bash

    
npm run test:watch

  

Calculer la couverture de code

Cette commande exécute les tests et génère un rapport de couverture dans la console, vous montrant quel pourcentage de votre code est testé.
code Bash

    
npm run coverage

  

    Le projet vise une couverture de test supérieure à 90%.

Structure du Projet
code Code

    
.
├── public/               # Fichiers du frontend (HTML, CSS, JS)
├── src/
│   ├── config/           # Configuration (ex: connexion BDD)
│   ├── controllers/      # Logique métier des routes
│   ├── middleware/       # Middlewares Express (ex: authentification)
│   ├── models/           # Schémas Mongoose (User, Message, etc.)
│   ├── routes/           # Définition des routes de l'API
│   ├── socket/           # Logique WebSocket (handlers.js)
│   ├── app.js            # Fichier principal d'Express
│   └── server.js         # Point d'entrée de l'application (création du serveur)
├── test/                 # Tous les fichiers de test
├── .env.example          # Fichier d'exemple pour les variables d'environnement
├── package.json          # Dépendances et scripts
└── README.md             # Ce fichier

  

Points d'API Principaux (Endpoints)

Toutes les routes (sauf /register et /login) sont protégées et nécessitent un Bearer Token dans l'en-tête Authorization.

    POST /api/auth/register : Inscrire un nouvel utilisateur.

    POST /api/auth/login : Connecter un utilisateur et obtenir un token.

    POST /api/auth/logout : Déconnecter l'utilisateur (côté serveur).

    GET /api/users : Lister les utilisateurs (avec filtres et pagination).

    GET /api/users/search?q=:query : Rechercher un utilisateur.

    PUT /api/users/profile : Mettre à jour son propre profil.

    GET /api/users/:id : Obtenir le profil d'un utilisateur.

    POST /api/messages : Envoyer un message.

    GET /api/messages/:userId : Récupérer la conversation avec un utilisateur.

    PUT /api/messages/:id : Modifier un message.

    DELETE /api/messages/:id : Supprimer un message.