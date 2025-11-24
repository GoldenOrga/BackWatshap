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

      showChatView();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    authError.textContent = "";
    try {
      const name = document.getElementById("register-name").value;
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
      const avatar = document.getElementById("register-avatar").value;

      const data = await apiCall("/auth/register", "POST", {
        name,
        email,
        password,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
      });

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

      document.getElementById("register-name").value = "";
      document.getElementById("register-email").value = "";
      document.getElementById("register-password").value = "";
      document.getElementById("register-avatar").value = "";

      showChatView();
    } catch (error) {
      console.error("Register failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await apiCall("/auth/logout", "POST");
    } finally {
      localStorage.clear();
      token = null;
      currentUser = null;
      if (socket) socket.disconnect();
      window.location.reload();
    }
  };

  // === Chat Views ===
  const showChatView = () => {
    authContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");

    currentUserAvatar.src = currentUser.avatar;
    currentUserName.textContent = currentUser.name;

    connectSocket();
    fetchAndRenderConversations();
  };

  const fetchAndRenderConversations = async () => {
    try {
      const conversations = await apiCall("/messages/conversations");
      conversationsList.innerHTML = "";

      conversations.forEach((conv) => {
        const li = document.createElement("li");
        li.dataset.conversation = JSON.stringify(conv);
        li.className = "conversation-item";

        const avatar = conv.conversationAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.conversationName}`;
        const unreadClass = conv.unreadCount > 0 ? "unread" : "";

        li.innerHTML = `
          <img src="${avatar}" alt="${conv.conversationName}" class="avatar" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=default'">
          <div class="conversation-info">
            <h3>${conv.conversationName}</h3>
            <p class="last-message">${conv.lastMessage || "Pas de messages"}</p>
          </div>
          ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : ""}
        `;
        li.classList.add(unreadClass);
        li.addEventListener("click", () => selectConversation(li));
        conversationsList.appendChild(li);
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
    }
  };

  const selectConversation = async (liElement) => {
    const conversationData = JSON.parse(liElement.dataset.conversation);

    if (currentConversation?._id === conversationData._id) return;

    currentConversation = conversationData;
    conversationsList.querySelectorAll("li").forEach(li => li.classList.remove("active"));
    liElement.classList.add("active");

    const unreadBadge = liElement.querySelector(".unread-badge");
    if (unreadBadge) unreadBadge.remove();
    liElement.classList.remove("unread");

    welcomeScreen.classList.add("hidden");
    chatView.classList.remove("hidden");

    chatHeaderName.textContent = currentConversation.conversationName;
    chatWithAvatar.src = currentConversation.conversationAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentConversation.conversationName}`;
    messagesList.innerHTML = "";

    leaveConversationBtn.classList.toggle("hidden", !currentConversation.isGroup);

    if (socket) {
      socket.emit("mark-conversation-as-read", { conversationId: currentConversation._id });
    }

    try {
      const messages = await apiCall(`/messages/conversation/${currentConversation._id}`);
      messages.forEach((msg) => addMessageToUI(msg));
    } catch (error) {
      console.error("Erreur lors de la récupération des messages:", error);
    }
  };

  const addMessageToUI = (message) => {
    const messageDiv = document.createElement("div");
    const sender = message.sender || {};
    const senderId = typeof sender === "object" ? sender._id : sender;
    const isOwn = senderId === currentUser.id;

    messageDiv.className = `message ${isOwn ? "sent" : "received"}`;
    messageDiv.dataset.messageId = message._id;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    
    const content = document.createElement("p");
    content.textContent = message.content;
    bubble.appendChild(content);

    if (!isOwn && sender.name) {
      const senderName = document.createElement("small");
      senderName.className = "sender-name";
      senderName.textContent = sender.name;
      bubble.insertBefore(senderName, content);
    }

    const time = document.createElement("small");
    time.className = "message-time";
    time.textContent = new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    bubble.appendChild(time);

    messageDiv.appendChild(bubble);
    messagesList.appendChild(messageDiv);
  };

  const handleMessageSend = async (e) => {
    e.preventDefault();

    const content = messageInput.value.trim();
    if (!content || !currentConversation) return;

    try {
      await apiCall("/messages", "POST", {
        conversation_id: currentConversation._id,
        content: content
      });

      messageInput.value = "";
      messageInput.focus();

      if (socket) {
        socket.emit("typing", {
          conversationId: currentConversation._id,
          userName: currentUser.name,
          isTyping: false
        });
      }
    } catch (error) {
      console.error("Erreur d'envoi du message:", error);
    }
  };

  const handleTyping = () => {
    if (!currentConversation || !socket) return;

    socket.emit("typing", {
      conversationId: currentConversation._id,
      userName: currentUser.name,
      isTyping: true
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", {
        conversationId: currentConversation._id,
        userName: currentUser.name,
        isTyping: false
      });
    }, 3000);
  };

  // === Modals ===
  const openNewGroupModal = async () => {
    try {
      const { users } = await apiCall("/users");
      const modalUsersList = document.getElementById("modal-users-list");
      modalUsersList.innerHTML = "";

      users.forEach((user) => {
        if (user._id !== currentUser.id) {
          const label = document.createElement("label");
          label.className = "modal-user-item";
          label.innerHTML = `
            <input type="checkbox" data-user-id="${user._id}" data-user-name="${user.name}">
            <img src="${user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}" alt="${user.name}" class="avatar">
            <span>${user.name}</span>
          `;
          modalUsersList.appendChild(label);
        }
      });

      newGroupModal.classList.remove("hidden");
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
    }
  };

  const handleCreateConversation = async () => {
    const selectedUsers = Array.from(document.querySelectorAll("#modal-users-list input[type='checkbox']:checked"))
      .map(input => input.dataset.userId);

    if (selectedUsers.length === 0) {
      alert("Veuillez sélectionner au moins un utilisateur");
      return;
    }

    try {
      await apiCall("/messages/conversations", "POST", {
        participantIds: selectedUsers,
        name: document.getElementById("group-name-input").value.trim()
      });

      newGroupModal.classList.add("hidden");
      document.getElementById("group-name-input").value = "";
      fetchAndRenderConversations();
    } catch (error) {
      console.error("Erreur lors de la création de la conversation:", error);
    }
  };

  const openProfileModal = () => {
    document.getElementById("profile-name-input").value = currentUser.name;
    document.getElementById("profile-avatar-input").value = currentUser.avatar;
    profileModal.classList.remove("hidden");
  };

  const handleProfileUpdate = async () => {
    const newName = document.getElementById("profile-name-input").value.trim();
    const newAvatar = document.getElementById("profile-avatar-input").value.trim();

    if (!newName) {
      alert("Le nom ne peut pas être vide");
      return;
    }

    try {
      const updated = await apiCall("/users/profile", "PUT", {
        name: newName,
        avatar: newAvatar || currentUser.avatar
      });

      currentUser.name = updated.name;
      currentUser.avatar = updated.avatar;
      localStorage.setItem("user", JSON.stringify(currentUser));

      currentUserName.textContent = currentUser.name;
      currentUserAvatar.src = currentUser.avatar;
      profileModal.classList.add("hidden");

      fetchAndRenderConversations();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
    }
  };

  const openSessionsModal = async () => {
    try {
      const sessions = await apiCall("/sessions");
      const sessionsList = document.getElementById("sessions-list");
      sessionsList.innerHTML = "";

      if (sessions.length === 0) {
        sessionsList.innerHTML = "<p style='text-align: center; color: #999;'>Aucune session active</p>";
        return;
      }

      sessions.forEach((session) => {
        const div = document.createElement("div");
        div.className = "session-item";
        div.innerHTML = `
          <div class="session-info">
            <div class="session-device">${session.deviceName || "Appareil inconnu"}</div>
            <div class="session-meta">${session.ipAddress || "IP inconnue"}</div>
            <div class="session-last-activity">Dernière activité: ${new Date(session.lastActivity).toLocaleDateString("fr-FR")}</div>
          </div>
          <button class="session-close-btn" onclick="window.closeSession('${session._id}')">Fermer</button>
        `;
        sessionsList.appendChild(div);
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des sessions:", error);
    }
  };

  window.closeSession = async (sessionId) => {
    try {
      await apiCall(`/sessions/${sessionId}`, "DELETE");
      openSessionsModal();
    } catch (error) {
      console.error("Erreur lors de la fermeture de la session:", error);
    }
  };

  const openContactsModal = async () => {
    try {
      const contacts = await apiCall("/contacts");
      const contactsList = document.getElementById("contacts-list");
      const blockedList = document.getElementById("blocked-contacts-list");
      contactsList.innerHTML = "";
      blockedList.innerHTML = "";

      if (contacts.length === 0) {
        contactsList.innerHTML = "<p style='text-align: center; color: #999;'>Aucun contact</p>";
      } else {
        contacts.forEach((contact) => {
          const contactUser = contact.contact;
          if (!contactUser) return;

          const div = document.createElement("div");
          div.className = "contact-item";
          div.innerHTML = `
            <div class="contact-info">
              <img src="${contactUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactUser.name}`}" alt="${contactUser.name}" class="avatar">
              <div>
                <div class="contact-name">${contactUser.name}</div>
                <small>${contactUser.isOnline ? "En ligne" : "Hors ligne"}</small>
              </div>
            </div>
            <div class="contact-actions">
              <button class="block-btn" onclick="window.blockContact('${contact._id}')">Bloquer</button>
            </div>
          `;
          contactsList.appendChild(div);
        });
      }

      // Afficher les contacts bloqués
      const blockedContacts = await apiCall("/contacts/blocked");
      if (blockedContacts.length > 0) {
        blockedContacts.forEach((contact) => {
          const contactUser = contact.contact;
          if (!contactUser) return;

          const div = document.createElement("div");
          div.className = "blocked-contact-item";
          div.innerHTML = `
            <div class="blocked-contact-info">
              <img src="${contactUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactUser.name}`}" alt="${contactUser.name}" class="avatar">
              <span>${contactUser.name}</span>
            </div>
            <button class="unblock-btn" onclick="window.unblockContact('${contact._id}')">Débloquer</button>
          `;
          blockedList.appendChild(div);
        });
      } else {
        blockedList.innerHTML = "<p style='text-align: center; color: #999;'>Aucun contact bloqué</p>";
      }

      // Afficher les utilisateurs disponibles
      const { users } = await apiCall("/users");
      const availableUsers = users.filter(u => u._id !== currentUser.id && !contacts.some(c => c.contact._id === u._id));

      if (availableUsers.length > 0) {
        const addTitle = document.createElement("h4");
        addTitle.style.marginTop = "1rem";
        addTitle.textContent = "Ajouter un contact";
        contactsList.appendChild(addTitle);

        availableUsers.forEach((user) => {
          const div = document.createElement("div");
          div.className = "contact-item";
          div.innerHTML = `
            <div class="contact-info">
              <img src="${user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}" alt="${user.name}" class="avatar">
              <div>
                <div class="contact-name">${user.name}</div>
                <small>${user.isOnline ? "En ligne" : "Hors ligne"}</small>
              </div>
            </div>
            <button class="add-contact-btn" onclick="window.addNewContact('${user._id}')">Ajouter</button>
          `;
          contactsList.appendChild(div);
        });
      }

      contactsModal.classList.remove("hidden");
    } catch (error) {
      console.error("Erreur lors du chargement des contacts:", error);
    }
  };

  window.blockContact = async (contactId) => {
    try {
      await apiCall(`/contacts/${contactId}/block`, "PUT");
      openContactsModal();
    } catch (error) {
      console.error("Erreur lors du blocage du contact:", error);
    }
  };

  window.unblockContact = async (contactId) => {
    try {
      await apiCall(`/contacts/${contactId}/unblock`, "PUT");
      openContactsModal();
    } catch (error) {
      console.error("Erreur lors du déblocage du contact:", error);
    }
  };

  window.addNewContact = async (userId) => {
    try {
      await apiCall("/contacts", "POST", { contactId: userId });
      openContactsModal();
    } catch (error) {
      console.error("Erreur lors de l'ajout du contact:", error);
    }
  };

  // === Socket.io ===
  const connectSocket = () => {
    if (socket) socket.disconnect();

    socket = io({ auth: { token } });

    socket.on("connect", () => {
      console.log("✅ Socket connecté");
      fetchAndRenderConversations();
    });

    socket.on("receive-message", (message) => {
      if (currentConversation && message.conversation === currentConversation._id) {
        addMessageToUI(message);
      }
      fetchAndRenderConversations();
    });

    socket.on("user-typing", ({ conversationId, userName, isTyping }) => {
      if (conversationId === currentConversation?._id) {
        const typists = typingUsers.get(conversationId) || [];
        if (isTyping && !typists.includes(userName)) {
          typists.push(userName);
        } else if (!isTyping) {
          typists = typists.filter(t => t !== userName);
        }
        typingUsers.set(conversationId, typists);

        if (typists.length > 0 && typists[0] !== currentUser.name) {
          typingIndicator.textContent = `${typists.join(", ")} est en train d'écrire...`;
          typingIndicator.classList.remove("hidden");
        } else {
          typingIndicator.classList.add("hidden");
        }
      }
    });

    socket.on("disconnect", () => console.log("❌ Socket déconnecté"));
  };

  // === Events ===
  const init = () => {
    // Auth listeners
    if (token && currentUser) {
      showChatView();
    } else {
      authContainer.classList.remove("hidden");
      chatContainer.classList.add("hidden");
    }

    loginForm.addEventListener("submit", handleLogin);
    registerForm.addEventListener("submit", handleRegister);

    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      loginView.classList.add("hidden");
      registerView.classList.remove("hidden");
    });

    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      registerView.classList.add("hidden");
      loginView.classList.remove("hidden");
    });

    document.getElementById("logout-btn").addEventListener("click", handleLogout);

    // Message listeners
    messageForm.addEventListener("submit", handleMessageSend);
    messageInput.addEventListener("input", handleTyping);

    // Modal listeners
    document.getElementById("new-group-btn").addEventListener("click", openNewGroupModal);
    document.getElementById("cancel-group-btn").addEventListener("click", () => {
      newGroupModal.classList.add("hidden");
    });
    document.getElementById("create-group-submit-btn").addEventListener("click", handleCreateConversation);

    document.getElementById("current-user-profile").addEventListener("click", openProfileModal);
    document.getElementById("cancel-profile-btn").addEventListener("click", () => {
      profileModal.classList.add("hidden");
    });
    document.getElementById("save-profile-btn").addEventListener("click", handleProfileUpdate);

    document.getElementById("sessions-btn").addEventListener("click", () => {
      openSessionsModal();
      sessionsModal.classList.remove("hidden");
    });
    document.getElementById("close-sessions-modal-btn").addEventListener("click", () => {
      sessionsModal.classList.add("hidden");
    });
    document.getElementById("terminate-all-sessions-btn").addEventListener("click", async () => {
      if (confirm("Êtes-vous sûr de vouloir fermer toutes les sessions?")) {
        try {
          await apiCall("/sessions", "DELETE");
          openSessionsModal();
        } catch (error) {
          console.error("Erreur lors de la fermeture des sessions:", error);
        }
      }
    });

    document.getElementById("contacts-btn").addEventListener("click", openContactsModal);
    document.getElementById("close-contacts-modal-btn").addEventListener("click", () => {
      contactsModal.classList.add("hidden");
    });

    leaveConversationBtn.addEventListener("click", async () => {
      if (!confirm("Êtes-vous sûr de vouloir quitter cette conversation?")) return;
      try {
        await apiCall(`/messages/conversations/${currentConversation._id}/leave`, "DELETE");
        currentConversation = null;
        welcomeScreen.classList.remove("hidden");
        chatView.classList.add("hidden");
        fetchAndRenderConversations();
      } catch (error) {
        console.error("Erreur lors de la quitte de la conversation:", error);
      }
    });

    // Fermer les modals en cliquant en dehors
    [newGroupModal, profileModal, sessionsModal, contactsModal].forEach(modal => {
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            modal.classList.add("hidden");
          }
        });
      }
    });
  };

  init();
});
