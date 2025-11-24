document.addEventListener("DOMContentLoaded", () => {
  // === DOM Elements ===
  const authContainer = document.getElementById("auth-container");
  const chatContainer = document.getElementById("chat-container");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const loginView = document.getElementById("login-view");
  const registerView = document.getElementById("register-view");
  const authError = document.getElementById("auth-error");

  const conversationsList = document.getElementById("users-list");
  const messagesList = document.getElementById("messages-list");
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  const chatView = document.getElementById("chat-view");
  const welcomeScreen = document.getElementById("welcome-screen");
  const chatHeaderName = document.getElementById("chat-with-name");
  const chatWithAvatar = document.getElementById("chat-with-avatar");
  const currentUserAvatar = document.getElementById("current-user-avatar");
  const currentUserName = document.getElementById("current-user-name");
  const typingIndicator = document.getElementById("typing-indicator");
  const leaveConversationBtn = document.getElementById("leave-conversation-btn");

  // === Modals ===
  const newGroupModal = document.getElementById("new-group-modal");
  const profileModal = document.getElementById("profile-modal");
  const sessionsModal = document.getElementById("sessions-modal");
  const contactsModal = document.getElementById("contacts-modal");

  // === State ===
  let token = localStorage.getItem("accessToken");
  let currentUser = JSON.parse(localStorage.getItem("user")) || null;
  let socket = null;
  let currentConversation = null;
  let typingTimeout = null;
  const typingUsers = new Map();
  const userPresence = new Map(); // userId -> { isOnline, lastSeen }
  const messageStatusMap = new Map(); // messageId -> status

  // === API Calls ===
  const apiCall = async (endpoint, method = "GET", body = null, isFormData = false) => {
    const options = { method };
    
    if (!isFormData) {
      options.headers = { "Content-Type": "application/json" };
    }
    
    if (token) {
      options.headers = options.headers || {};
      options.headers["Authorization"] = `Bearer ${token}`;
    }
    
    if (body && !isFormData) {
      options.body = JSON.stringify(body);
    } else if (body && isFormData) {
      options.body = body;
    }

    try {
      const response = await fetch(`/api${endpoint}`, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Une erreur est survenue");
      }
      return data;
    } catch (error) {
      console.error("API Error:", error);
      showError(error.message);
      throw error;
    }
  };

  const showError = (message) => {
    if (authError) {
      authError.textContent = message;
      setTimeout(() => { authError.textContent = ""; }, 5000);
    }
  };

  // === Authentication ===
  const handleLogin = async (e) => {
    e.preventDefault();
    authError.textContent = "";
    try {
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      const data = await apiCall("/auth/login", "POST", { email, password });
      
      token = data.accessToken;
      currentUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.name}`,
        isOnline: true
      };

      localStorage.setItem("accessToken", token);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(currentUser));

      loginForm.reset();
      showChatView();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    authError.textContent = "";
    try {
      const name = document.getElementById("register-name").value;
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;

      await apiCall("/auth/register", "POST", { name, email, password });
      
      registerForm.reset();
      showLogin.click();
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      if (socket) socket.disconnect();
      await apiCall("/auth/logout", "POST");
      token = null;
      currentUser = null;
      localStorage.clear();
      location.reload();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // === Socket.io Connection ===
  const connectSocket = () => {
    if (!token) return;

    socket = io('http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    // === Connection Events ===
    socket.on('connect', () => {
      console.log('✅ Socket connecté');
      loadConversations();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion:', error);
      showError('Erreur de connexion: ' + error.message);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket déconnecté');
    });

    socket.on('reconnect', () => {
      console.log('🔄 Reconnecté au serveur');
      loadConversations();
      if (currentConversation) {
        socket.emit('join-conversation', { conversationId: currentConversation._id });
      }
    });

    // === Événements de Présence ===
    socket.on('user-status', (data) => {
      userPresence.set(data.userId, {
        isOnline: data.isOnline,
        lastSeen: data.lastSeen
      });
      updateUserStatus(data.userId, data.isOnline);
    });

    socket.on('user-joined-conversation', (data) => {
      console.log(`${data.userName} a rejoint la conversation`);
      if (currentConversation && currentConversation._id === data.conversationId) {
        showNotification(`${data.userName} a rejoint`);
      }
    });

    socket.on('user-left-conversation', (data) => {
      console.log(`Un utilisateur a quitté`);
      if (currentConversation && currentConversation._id === data.conversationId) {
        loadMessages();
      }
    });

    socket.on('user-typing', (data) => {
      if (currentConversation && currentConversation._id === data.conversationId) {
        typingUsers.set(data.senderId, data.isTyping);
        updateTypingIndicator();
      }
    });

    // === Événements de Messages ===
    socket.on('receive-message', (message) => {
      if (currentConversation && currentConversation._id === message.conversationId) {
        addMessageToUI(message, true);
        messageStatusMap.set(message._id, message.status);
      }
      // Marquer comme lu après 1 seconde
      setTimeout(() => {
        socket.emit('mark-conversation-as-read', {
          conversationId: message.conversationId
        });
      }, 1000);
    });

    socket.on('message-delivered', (data) => {
      messageStatusMap.set(data.messageId, 'delivered');
      updateMessageStatus(data.messageId, 'delivered');
    });

    socket.on('messages-read', (data) => {
      updateMessagesReadStatus(data.conversationId, data.readerId);
    });

    socket.on('message-edited', (data) => {
      updateMessageInUI(data.messageId, data.content, true);
      showNotification(`${data.sender.name} a modifié un message`);
    });

    socket.on('message-deleted', (data) => {
      removeMessageFromUI(data.messageId);
    });

    socket.on('reaction-added', (data) => {
      addReactionToMessage(data.messageId, data.userId, data.emoji);
    });

    socket.on('reaction-removed', (data) => {
      removeReactionFromMessage(data.messageId, data.userId, data.emoji);
    });

    // === Événements de Groupe ===
    socket.on('group-user-added', (data) => {
      showNotification(`Nouvel utilisateur ajouté: ${data.conversationName}`);
      loadConversations();
    });

    socket.on('group-user-removed', (data) => {
      if (currentConversation && currentConversation._id === data.conversationId) {
        loadConversations();
      }
    });

    socket.on('removed-from-group', (data) => {
      showNotification('Vous avez été retiré du groupe');
      loadConversations();
    });

    socket.on('group-updated', (data) => {
      if (currentConversation && currentConversation._id === data.conversationId) {
        loadConversations();
        loadMessages();
      }
    });

    // === Messages Manqués ===
    socket.on('missed-messages', (data) => {
      console.log(`${data.count} messages manqués`);
      data.messages.forEach(msg => {
        if (currentConversation && currentConversation._id === msg.conversation) {
          addMessageToUI(msg, false);
        }
      });
    });
  };

  // === Chat View ===
  const showChatView = () => {
    authContainer.style.display = "none";
    chatContainer.style.display = "flex";
    currentUserName.textContent = currentUser.name;
    currentUserAvatar.src = currentUser.avatar;
    connectSocket();
    loadConversations();
  };

  const loadConversations = async () => {
    try {
      const conversations = await apiCall("/messages/conversations");
      conversationsList.innerHTML = "";
      
      conversations.forEach(conv => {
        const name = conv.conversationName || "Conversation";
        const avatar = conv.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
        const unreadBadge = conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : "";
        const onlineIndicator = userPresence.has(conv.lastMessageSenderId) && userPresence.get(conv.lastMessageSenderId).isOnline
          ? '<span class="online-indicator"></span>'
          : '';

        const li = document.createElement("li");
        li.className = "conversation-item";
        li.innerHTML = `
          <div class="conversation-avatar-container">
            <img src="${avatar}" alt="${name}" class="conversation-avatar" />
            ${onlineIndicator}
          </div>
          <div class="conversation-info">
            <h3>${name}</h3>
            <p>${conv.lastMessage || "Aucun message"}</p>
          </div>
          <div class="conversation-meta">
            <span class="timestamp">${new Date(conv.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            ${unreadBadge}
          </div>
        `;
        
        li.addEventListener("click", () => selectConversation(li, conv));
        conversationsList.appendChild(li);
      });
    } catch (error) {
      console.error("Load conversations error:", error);
    }
  };

  const selectConversation = async (liElement, conv) => {
    document.querySelectorAll(".conversation-item").forEach(item => item.classList.remove("active"));
    liElement.classList.add("active");
    
    currentConversation = conv;
    
    if (socket) {
      socket.emit('join-conversation', { conversationId: conv._id });
    }

    chatHeaderName.textContent = conv.conversationName || "Conversation";
    chatWithAvatar.src = conv.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.conversationName}`;
    
    welcomeScreen.style.display = "none";
    chatView.style.display = "flex";
    
    loadMessages();
  };

  const loadMessages = async () => {
    if (!currentConversation) return;
    
    try {
      const messages = await apiCall(`/messages/conversation/${currentConversation._id}`);
      messagesList.innerHTML = "";
      
      messages.forEach(msg => {
        addMessageToUI(msg, false);
        messageStatusMap.set(msg._id, msg.status);
      });

      messagesList.scrollTop = messagesList.scrollHeight;

      // Marquer comme lu
      if (socket) {
        socket.emit('mark-conversation-as-read', {
          conversationId: currentConversation._id
        });
      }
    } catch (error) {
      console.error("Load messages error:", error);
    }
  };

  const addMessageToUI = (message, isBubble = false) => {
    const senderName = message.sender?.name || "Utilisateur";
    const senderAvatar = message.sender?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderName}`;
    const isCurrentUser = message.sender?._id === currentUser.id || message.sender === currentUser.id;
    const statusIcon = getStatusIcon(message.status);
    const editedBadge = message.edited ? '<span class="edited-badge">édité</span>' : '';
    const reactionEmojis = message.reactions?.map(r => r.emoji).join('') || '';

    const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement("div");
    div.className = `message ${isCurrentUser ? "sent" : "received"}`;
    div.id = `msg-${message._id}`;
    div.innerHTML = `
      ${!isCurrentUser ? `<img src="${senderAvatar}" alt="${senderName}" class="message-avatar" />` : ''}
      <div class="message-content">
        ${!isCurrentUser ? `<p class="message-sender">${senderName}</p>` : ''}
        <div class="message-bubble">
          <p>${message.content}</p>
          ${editedBadge}
          <div class="message-time-status">
            <span class="time">${time}</span>
            ${isCurrentUser ? `<span class="status">${statusIcon}</span>` : ''}
          </div>
        </div>
        ${reactionEmojis ? `<div class="message-reactions">${reactionEmojis}</div>` : ''}
      </div>
    `;

    // Ajouter les actions au hover
    div.addEventListener('mouseenter', () => {
      if (isCurrentUser) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.innerHTML = `
          <button class="action-btn" onclick="editMessage('${message._id}')">✏️</button>
          <button class="action-btn" onclick="deleteMessage('${message._id}')">🗑️</button>
          <button class="action-btn" onclick="addEmoji('${message._id}')">😊</button>
        `;
        div.appendChild(actions);
      }
    });

    messagesList.appendChild(div);
    messagesList.scrollTop = messagesList.scrollHeight;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.value.trim() || !currentConversation || !socket) return;

    const content = messageInput.value.trim();
    messageInput.value = "";

    socket.emit('send-message', {
      conversationId: currentConversation._id,
      content
    }, (ack) => {
      if (ack.success) {
        console.log('Message envoyé:', ack.messageId);
        messageStatusMap.set(ack.messageId, ack.status);
      }
    });
  };

  // === UI Helpers ===
  const getStatusIcon = (status) => {
    const icons = {
      'sent': '✓',
      'delivered': '✓✓',
      'read': '✓✓'
    };
    return icons[status] || '⏱️';
  };

  const updateTypingIndicator = () => {
    let typingList = Array.from(typingUsers.entries())
      .filter(([_, isTyping]) => isTyping)
      .map(([userId, _]) => userId);

    if (typingList.length > 0) {
      typingIndicator.style.display = "flex";
      typingIndicator.innerHTML = '<span>En train de saisir</span><div class="dots"><span></span><span></span><span></span></div>';
    } else {
      typingIndicator.style.display = "none";
    }
  };

  const updateMessageStatus = (messageId, status) => {
    const msgEl = document.getElementById(`msg-${messageId}`);
    if (msgEl) {
      const statusEl = msgEl.querySelector('.status');
      if (statusEl) statusEl.textContent = getStatusIcon(status);
    }
  };

  const updateMessagesReadStatus = (conversationId, readerId) => {
    if (currentConversation && currentConversation._id === conversationId) {
      document.querySelectorAll('.message.received .status').forEach(el => {
        el.textContent = getStatusIcon('read');
      });
    }
  };

  const updateMessageInUI = (messageId, newContent, edited = false) => {
    const msgEl = document.getElementById(`msg-${messageId}`);
    if (msgEl) {
      const bubble = msgEl.querySelector('.message-bubble p');
      if (bubble) bubble.textContent = newContent;
      if (edited && !msgEl.querySelector('.edited-badge')) {
        const badge = document.createElement('span');
        badge.className = 'edited-badge';
        badge.textContent = 'édité';
        msgEl.querySelector('.message-bubble').appendChild(badge);
      }
    }
  };

  const removeMessageFromUI = (messageId) => {
    const msgEl = document.getElementById(`msg-${messageId}`);
    if (msgEl) msgEl.remove();
  };

  const addReactionToMessage = (messageId, userId, emoji) => {
    const msgEl = document.getElementById(`msg-${messageId}`);
    if (msgEl) {
      let reactionsDiv = msgEl.querySelector('.message-reactions');
      if (!reactionsDiv) {
        reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'message-reactions';
        msgEl.appendChild(reactionsDiv);
      }
      if (!reactionsDiv.textContent.includes(emoji)) {
        reactionsDiv.textContent += emoji;
      }
    }
  };

  const removeReactionFromMessage = (messageId, userId, emoji) => {
    const msgEl = document.getElementById(`msg-${messageId}`);
    if (msgEl) {
      const reactionsDiv = msgEl.querySelector('.message-reactions');
      if (reactionsDiv) {
        reactionsDiv.textContent = reactionsDiv.textContent.replace(emoji, '');
        if (!reactionsDiv.textContent.trim()) reactionsDiv.remove();
      }
    }
  };

  const updateUserStatus = (userId, isOnline) => {
    document.querySelectorAll('.online-indicator').forEach(indicator => {
      if (isOnline) {
        indicator.style.backgroundColor = '#31a24c';
      } else {
        indicator.style.backgroundColor = '#aaa';
      }
    });
  };

  const showNotification = (message) => {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  };

  // === Input Handling ===
  const handleMessageInput = () => {
    if (socket && currentConversation) {
      socket.emit('typing', {
        conversationId: currentConversation._id,
        isTyping: true
      });

      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit('typing', {
          conversationId: currentConversation._id,
          isTyping: false
        });
      }, 3000);
    }
  };

  // === Modals ===
  const openNewGroupModal = () => {
    newGroupModal.style.display = "flex";
  };

  const closeModal = (modal) => {
    modal.style.display = "none";
  };

  const openProfileModal = async () => {
    profileModal.style.display = "flex";
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const profileAvatar = document.getElementById("profile-avatar");
    
    if (profileName) profileName.value = currentUser.name;
    if (profileEmail) profileEmail.value = currentUser.email;
    if (profileAvatar) profileAvatar.src = currentUser.avatar;
  };

  const openSessionsModal = async () => {
    sessionsModal.style.display = "flex";
    try {
      const sessions = await apiCall("/sessions");
      const sessionsList = document.getElementById("sessions-list");
      sessionsList.innerHTML = "";
      
      sessions.forEach(session => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div>
            <p>${session.deviceName}</p>
            <small>${new Date(session.lastActivity).toLocaleString('fr-FR')}</small>
          </div>
          <button onclick="terminateSession('${session._id}')">Terminer</button>
        `;
        sessionsList.appendChild(li);
      });
    } catch (error) {
      console.error("Load sessions error:", error);
    }
  };

  const openContactsModal = async () => {
    contactsModal.style.display = "flex";
    try {
      const contacts = await apiCall("/contacts");
      const contactsList = document.getElementById("contacts-list");
      const availableUsers = await apiCall("/users");
      
      contactsList.innerHTML = "";
      
      contacts.forEach(contact => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${contact.contact.name}</span>
          <button onclick="removeContact('${contact._id}')">Retirer</button>
        `;
        contactsList.appendChild(li);
      });

      const addContactSection = document.getElementById("add-contact-section");
      addContactSection.innerHTML = "<h4>Ajouter des contacts</h4>";
      availableUsers.forEach(user => {
        if (user._id !== currentUser.id && !contacts.find(c => c.contact._id === user._id)) {
          const div = document.createElement("div");
          div.className = "available-user";
          div.innerHTML = `
            <span>${user.name}</span>
            <button onclick="addContact('${user._id}')">Ajouter</button>
          `;
          addContactSection.appendChild(div);
        }
      });
    } catch (error) {
      console.error("Load contacts error:", error);
    }
  };

  // === Expose Functions to Global Scope ===
  window.sendMessage = sendMessage;
  window.handleLogin = handleLogin;
  window.handleRegister = handleRegister;
  window.handleLogout = handleLogout;
  window.showChatView = showChatView;
  window.openNewGroupModal = openNewGroupModal;
  window.closeModal = closeModal;
  window.openProfileModal = openProfileModal;
  window.openSessionsModal = openSessionsModal;
  window.openContactsModal = openContactsModal;
  window.handleMessageInput = handleMessageInput;
  window.addContact = addContact;
  window.removeContact = removeContact;
  window.blockContact = blockContact;
  window.unblockContact = unblockContact;
  window.terminateSession = terminateSession;
  window.editMessage = editMessage;
  window.deleteMessage = deleteMessage;
  window.addEmoji = addEmoji;

  // === Event Listeners ===
  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  messageForm.addEventListener("submit", sendMessage);
  messageInput.addEventListener("input", handleMessageInput);
  showRegister.addEventListener("click", () => {
    loginView.style.display = "none";
    registerView.style.display = "block";
  });
  showLogin.addEventListener("click", () => {
    loginView.style.display = "block";
    registerView.style.display = "none";
  });

  // === Stub Functions ===
  window.addContact = async (userId) => {
    try {
      await apiCall(`/contacts/add/${userId}`, "POST");
      openContactsModal();
      showNotification("Contact ajouté");
    } catch (error) {
      console.error("Add contact error:", error);
    }
  };

  window.removeContact = async (contactId) => {
    try {
      await apiCall(`/contacts/${contactId}`, "DELETE");
      openContactsModal();
    } catch (error) {
      console.error("Remove contact error:", error);
    }
  };

  window.blockContact = async (userId) => {
    try {
      await apiCall(`/contacts/block/${userId}`, "POST");
      showNotification("Contact bloqué");
    } catch (error) {
      console.error("Block contact error:", error);
    }
  };

  window.unblockContact = async (userId) => {
    try {
      await apiCall(`/contacts/unblock/${userId}`, "POST");
      showNotification("Contact débloqué");
    } catch (error) {
      console.error("Unblock contact error:", error);
    }
  };

  window.terminateSession = async (sessionId) => {
    try {
      await apiCall(`/sessions/${sessionId}`, "DELETE");
      openSessionsModal();
    } catch (error) {
      console.error("Terminate session error:", error);
    }
  };

  window.editMessage = (messageId) => {
    const newContent = prompt("Modifier le message:");
    if (newContent && socket && currentConversation) {
      socket.emit('edit-message', {
        messageId,
        conversationId: currentConversation._id,
        content: newContent
      });
    }
  };

  window.deleteMessage = (messageId) => {
    if (confirm("Supprimer le message ?") && socket && currentConversation) {
      socket.emit('delete-message', {
        messageId,
        conversationId: currentConversation._id
      });
    }
  };

  window.addEmoji = (messageId) => {
    const emoji = prompt("Ajouter une réaction (emoji):");
    if (emoji && socket && currentConversation) {
      socket.emit('add-reaction', {
        messageId,
        conversationId: currentConversation._id,
        emoji
      });
    }
  };

  // Initialize
  if (token && currentUser) {
    showChatView();
  }
});
