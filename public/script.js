document.addEventListener("DOMContentLoaded", () => {
  const authContainer = document.getElementById("auth-container");
  const chatContainer = document.getElementById("chat-container");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginView = document.getElementById("login-view");
  const registerView = document.getElementById("register-view");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const authError = document.getElementById("auth-error");
  const conversationsList = document.getElementById("users-list");
  const logoutBtn = document.getElementById("logout-btn");
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  const messagesList = document.getElementById("messages-list");
  const chatHeaderName = document.getElementById("chat-with-name");
  const typingIndicator = document.getElementById("typing-indicator");
  const welcomeScreen = document.getElementById("welcome-screen");
  const chatView = document.getElementById("chat-view");
  const newGroupBtn = document.getElementById("new-group-btn");
  const newGroupModal = document.getElementById("new-group-modal");
  const modalUsersList = document.getElementById("modal-users-list");
  const createGroupSubmitBtn = document.getElementById(
    "create-group-submit-btn"
  );
  const cancelGroupBtn = document.getElementById("cancel-group-btn");
  const groupNameInput = document.getElementById("group-name-input");
  const leaveConversationBtn = document.getElementById(
    "leave-conversation-btn"
  );

  const chatWithAvatar = document.getElementById("chat-with-avatar");
  const currentUserAvatar = document.getElementById("current-user-avatar");
  const currentUserName = document.getElementById("current-user-name");
  const currentUserProfile = document.getElementById("current-user-profile");
  const profileModal = document.getElementById("profile-modal");
  const saveProfileBtn = document.getElementById("save-profile-btn");
  const cancelProfileBtn = document.getElementById("cancel-profile-btn");
  const profileNameInput = document.getElementById("profile-name-input");
  const profileAvatarInput = document.getElementById("profile-avatar-input");

  let token = localStorage.getItem("accessToken");
  let currentUser = JSON.parse(localStorage.getItem("user"));
  let socket;
  let currentConversation = null;
  let typingTimeout;
  const typingUsers = new Map();

  const apiCall = async (endpoint, method = "GET", body = null) => {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }
    if (body) {
      options.body = JSON.stringify(body);
    }
    try {
      const response = await fetch(`/api${endpoint}`, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Une erreur est survenue");
      }
      return data;
    } catch (error) {
      authError.textContent = error.message;
      console.error("API Call Error:", error);
      throw error;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    authError.textContent = "";
    try {
      const data = await apiCall("/auth/login", "POST", {
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
      });
      token = data.accessToken;
      const refreshToken = data.refreshToken;

      currentUser = { 
        id: data.user.id, 
        name: data.user.name, 
        email: data.user.email,
        avatar: data.user.avatar,
        isOnline: data.user.isOnline
      };
      localStorage.setItem("accessToken", token);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(currentUser));
      showChatView();
    } catch (error) {}
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    authError.textContent = "";
    try {
      const name = document.getElementById("register-name").value;
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
      const avatar = document.getElementById("register-avatar").value;

      const registrationData = { name, email, password };
      if (avatar) {
        registrationData.avatar = avatar;
      }

      const data = await apiCall("/auth/register", "POST", registrationData);
      
      // Auto-login après inscription
      token = data.accessToken;
      const refreshToken = data.refreshToken;
      currentUser = { 
        id: data.user.id, 
        name: data.user.name, 
        email: data.user.email,
        avatar: data.user.avatar,
        isOnline: data.user.isOnline
      };
      localStorage.setItem("accessToken", token);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(currentUser));
      showChatView();
    } catch (error) {}
  };

  const handleLogout = async () => {
    try {
      await apiCall("/auth/logout", "POST");
    } finally {
      localStorage.clear();
      if (socket) socket.disconnect();
      window.location.reload();
    }
  };

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
      conversations.sort(
        (a, b) =>
          new Date(b.lastMessageTimestamp || 0) -
          new Date(a.lastMessageTimestamp || 0)
      );

      conversations.forEach((conv) => {
        const li = document.createElement("li");
        li.dataset.conversationId = conv._id;
        li.dataset.conversation = JSON.stringify(conv);

        const unreadBadge =
          conv.unreadCount > 0
            ? `<span class="unread-badge">${conv.unreadCount}</span>`
            : "";

        li.innerHTML = `
                    <img src="${conv.conversationAvatar}" alt="${conv.conversationName}" class="avatar">
                    <div class="conversation-info">
                        <span>${conv.conversationName}</span>
                    </div>
                    ${unreadBadge}
                `;

        li.addEventListener("click", () => selectConversation(li));
        conversationsList.appendChild(li);
      });

      if (currentConversation) {
      }
    } catch (error) {
      console.error("Échec de la récupération des conversations", error);
    }
  };

  const selectConversation = async (liElement) => {
    const conversationData = JSON.parse(liElement.dataset.conversation);
    if (currentConversation?._id === conversationData._id) return;

    currentConversation = conversationData;

    document
      .querySelectorAll("#users-list li")
      .forEach((li) => li.classList.remove("active"));
    liElement.classList.add("active");
    const badge = liElement.querySelector(".unread-badge");
    if (badge) badge.remove();

    welcomeScreen.classList.add("hidden");
    chatView.classList.remove("hidden");

    chatHeaderName.textContent = currentConversation.conversationName;
    chatWithAvatar.src = currentConversation.conversationAvatar;
    messagesList.innerHTML = "";

    leaveConversationBtn.classList.toggle(
      "hidden",
      !currentConversation.isGroup
    );
    if (currentConversation.isGroup) {
      leaveConversationBtn.onclick = () =>
        handleLeaveConversation(currentConversation._id);
    }

    socket.emit("mark-conversation-as-read", {
      conversationId: currentConversation._id,
    });
    updateTypingIndicator();

    try {
      const messages = await apiCall(
        `/messages/conversation/${currentConversation._id}`
      );
      messages.forEach((msg) => addMessageToUI(msg));
    } catch (error) {
      console.error("Échec de la récupération des messages", error);
    }
  };

  const handleLeaveConversation = async (conversationId) => {
    if (!confirm("Voulez-vous vraiment quitter cette conversation ?")) return;
    try {
      await apiCall(
        `/messages/conversations/${conversationId}/leave`,
        "DELETE"
      );
      if (currentConversation?._id === conversationId) {
        currentConversation = null;
        chatView.classList.add("hidden");
        welcomeScreen.classList.remove("hidden");
      }
      fetchAndRenderConversations();
    } catch (error) {
      console.error("Erreur en quittant la conversation", error);
      alert("Impossible de quitter la conversation.");
    }
  };

  const addMessageToUI = (message) => {
    const messageDiv = document.createElement("div");
    const sender = message.sender || {};
    const senderId = sender._id || message.sender;
    messageDiv.dataset.messageId = message._id;
    messageDiv.classList.add(
      "message",
      senderId === currentUser.id ? "sent" : "received"
    );

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "message-bubble";

    renderUpdatedMessage(bubbleDiv, message);

    messageDiv.innerHTML = `
            <img src="${sender.avatar}" alt="${sender.name}" class="avatar message-avatar">
        `;
    messageDiv.appendChild(bubbleDiv);

    messagesList.prepend(messageDiv);
  };

  const updateTypingIndicator = () => {
    if (!currentConversation) {
      typingIndicator.classList.add("hidden");
      return;
    }

    const typists = (typingUsers.get(currentConversation._id) || []).filter(
      (name) => name !== currentUser.name
    );
    if (typists.length === 0) {
      typingIndicator.classList.add("hidden");
      return;
    }

    let text = "";
    if (typists.length === 1) {
      text = `${typists[0]} est en train d'écrire...`;
    } else if (typists.length === 2) {
      text = `${typists[0]} et ${typists[1]} écrivent...`;
    } else {
      text = "Plusieurs personnes écrivent...";
    }

    typingIndicator.textContent = text;
    typingIndicator.classList.remove("hidden");
  };

  const enterEditMode = (bubbleDiv, message) => {
    const currentContent = message.content;
    bubbleDiv.innerHTML = `
            <div class="message-edit-form">
                <input type="text" class="message-edit-input" value="">
                <div class="edit-actions">
                    <button class="save-btn">OK</button>
                    <button class="cancel-btn">X</button>
                </div>
            </div>`;
    const input = bubbleDiv.querySelector(".message-edit-input");
    input.value = currentContent;
    input.focus();

    bubbleDiv.querySelector(".save-btn").onclick = async () => {
      const newContent = input.value.trim();
      if (newContent && newContent !== currentContent) {
        try {
          const updatedMessage = await apiCall(
            `/messages/${message._id}`,
            "PUT",
            { content: newContent }
          );
          if (socket) socket.emit("edit-message", updatedMessage);
          renderUpdatedMessage(bubbleDiv, updatedMessage);
        } catch (error) {
          console.error("Erreur de modification du message:", error);
          renderUpdatedMessage(bubbleDiv, message);
        }
      } else {
        renderUpdatedMessage(bubbleDiv, message);
      }
    };
    bubbleDiv.querySelector(".cancel-btn").onclick = () =>
      renderUpdatedMessage(bubbleDiv, message);
  };

  const renderUpdatedMessage = (bubbleDiv, message) => {
    bubbleDiv.innerHTML = "";
    const senderId =
      typeof message.sender === "object" ? message.sender._id : message.sender;

    const contentSpan = document.createElement("span");
    contentSpan.className = "message-content";
    contentSpan.textContent = message.content;

    if (message.edited) {
      const editedMarker = document.createElement("em");
      editedMarker.className = "edited-marker";
      editedMarker.textContent = " (modifié)";
      contentSpan.appendChild(editedMarker);
    }
    bubbleDiv.appendChild(contentSpan);

    if (senderId === currentUser.id) {
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.className = "edit-btn";
      editBtn.onclick = () => enterEditMode(bubbleDiv, message);
      bubbleDiv.appendChild(editBtn);

      const statusDiv = document.createElement("div");
      statusDiv.className = "message-status";
      if (message.status === "read") {
        statusDiv.classList.add("read");
        statusDiv.textContent = "Vu";
      } else {
        statusDiv.textContent = "Envoyé";
      }
      bubbleDiv.appendChild(statusDiv);
    }
  };

  const handleMessageSend = async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (!content || !currentConversation) return;
    try {
      await apiCall("/messages", "POST", {
        conversation_id: currentConversation._id,
        content: content,
      });
      messageInput.value = "";

      clearTimeout(typingTimeout);
      socket.emit("typing", {
        conversationId: currentConversation._id,
        userName: currentUser.name,
        isTyping: false,
      });
    } catch (error) {
      console.error("Erreur d'envoi du message", error);
    }
  };

  const handleTyping = () => {
    if (!currentConversation || !socket) return;
    socket.emit("typing", {
      conversationId: currentConversation._id,
      userName: currentUser.name,
      isTyping: true,
    });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", {
        conversationId: currentConversation._id,
        userName: currentUser.name,
        isTyping: false,
      });
    }, 3000);
  };

  const openNewGroupModal = async () => {
    try {
      const { users } = await apiCall("/users");
      modalUsersList.innerHTML = "";
      users.forEach((user) => {
        if (user._id === currentUser.id) return;
        const item = document.createElement("div");
        item.className = "modal-user-item";

        item.innerHTML = `
                    <input type="checkbox" id="user-${user._id}" data-user-id="${user._id}">
                    <label for="user-${user._id}">
                        <img src="${user.avatar}" class="avatar" alt="${user.name}">
                        <span>${user.name}</span>
                    </label>
                `;
        modalUsersList.appendChild(item);
      });
      groupNameInput.value = "";
      newGroupModal.classList.remove("hidden");
    } catch (error) {
      console.error(
        "Impossible de charger les utilisateurs pour le groupe",
        error
      );
    }
  };

  const handleCreateConversation = async () => {
    const selectedUsers = Array.from(
      modalUsersList.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => input.dataset.userId);

    if (selectedUsers.length === 0) {
      alert("Veuillez sélectionner au moins un utilisateur.");
      return;
    }

    try {
      await apiCall("/messages/conversations", "POST", {
        participantIds: selectedUsers,
        name: groupNameInput.value.trim(),
      });
      newGroupModal.classList.add("hidden");
      fetchAndRenderConversations();
    } catch (error) {
      console.error("Erreur lors de la création de la conversation", error);
      alert("Erreur lors de la création de la conversation.");
    }
  };

  const openProfileModal = () => {
    profileNameInput.value = currentUser.name;
    profileAvatarInput.value = currentUser.avatar;
    profileModal.classList.remove("hidden");
  };

  const handleProfileUpdate = async () => {
    const newName = profileNameInput.value.trim();
    const newAvatar = profileAvatarInput.value.trim();

    if (!newName) {
      alert("Le nom ne peut pas être vide.");
      return;
    }

    const updateData = {};
    if (newName !== currentUser.name) updateData.name = newName;
    if (newAvatar !== currentUser.avatar) updateData.avatar = newAvatar;

    if (Object.keys(updateData).length === 0) {
      profileModal.classList.add("hidden");
      return;
    }

    try {
      const updatedUser = await apiCall("/users/profile", "PUT", updateData);

      currentUser.name = updatedUser.name;
      currentUser.avatar = updatedUser.avatar;
      localStorage.setItem("user", JSON.stringify(currentUser));

      currentUserName.textContent = currentUser.name;
      currentUserAvatar.src = currentUser.avatar;

      profileModal.classList.add("hidden");

      fetchAndRenderConversations();
    } catch (error) {
      console.error("Erreur de mise à jour du profil:", error);
      alert("Impossible de mettre à jour le profil.");
    }
  };

  const connectSocket = () => {
    if (socket) socket.disconnect();
    socket = io({ auth: { token } });

    socket.on("connect", () => {
      console.log("Socket connecté:", socket.id);

      apiCall("/messages/conversations").then((conversations) => {
        conversations.forEach((conv) => socket.emit("join-room", conv._id));
      });
    });

    socket.on("receive-message", (message) => {
      if (
        currentConversation &&
        message.conversation === currentConversation._id
      ) {
        addMessageToUI(message);
        socket.emit("mark-conversation-as-read", {
          conversationId: currentConversation._id,
        });
      }
      fetchAndRenderConversations();
    });

    socket.on("user-status", () => fetchAndRenderConversations());

    socket.on("user-typing", ({ conversationId, userName, isTyping }) => {
      const currentTypists = typingUsers.get(conversationId) || [];
      if (isTyping) {
        if (!currentTypists.includes(userName)) currentTypists.push(userName);
      } else {
        const index = currentTypists.indexOf(userName);
        if (index > -1) currentTypists.splice(index, 1);
      }
      typingUsers.set(conversationId, currentTypists);
      updateTypingIndicator();
    });

    socket.on("messages-read", ({ conversationId, readerId }) => {
      if (readerId === currentUser.id) return;
      if (currentConversation && currentConversation._id === conversationId) {
        document
          .querySelectorAll(".message.sent .message-status:not(.read)")
          .forEach((statusDiv) => {
            statusDiv.classList.add("read");
            statusDiv.textContent = "Vu";
          });
      }
    });

    socket.on("message-updated", (updatedMessage) => {
      if (
        currentConversation &&
        updatedMessage.conversation === currentConversation._id
      ) {
        const messageElement = document.querySelector(
          `div[data-message-id="${updatedMessage._id}"]`
        );
        if (messageElement) {
          renderUpdatedMessage(messageElement, updatedMessage);
        }
      }
    });

    socket.on("disconnect", () => console.log("Socket déconnecté."));
  };

  const openSessionsModal = async () => {
    try {
      const sessions = await apiCall("/sessions");
      const sessionsList = document.getElementById("sessions-list");
      sessionsList.innerHTML = "";
      
      if (sessions.length === 0) {
        sessionsList.innerHTML = "<p style='padding: 1rem; color: #999;'>Aucune session active</p>";
        return;
      }

      sessions.forEach((session) => {
        const div = document.createElement("div");
        div.className = "session-item";
        const lastActivity = new Date(session.lastActivity).toLocaleString('fr-FR');
        const createdAt = new Date(session.createdAt).toLocaleString('fr-FR');
        
        div.innerHTML = `
          <div class="session-info">
            <div class="session-device">📱 ${session.deviceName}</div>
            <div class="session-meta">IP: ${session.ipAddress || 'N/A'}</div>
            <div class="session-last-activity">Créée: ${createdAt}</div>
            <div class="session-last-activity">Dernière activité: ${lastActivity}</div>
          </div>
          <button class="session-close-btn" onclick="closeSession('${session._id}')">Fermer</button>
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
      openSessionsModal(); // Rafraîchir la liste
    } catch (error) {
      console.error("Erreur lors de la fermeture de la session:", error);
    }
  };

  const openContactsModal = async () => {
    try {
      // Afficher les contacts existants
      const contacts = await apiCall("/contacts");
      const contactsList = document.getElementById("contacts-list");
      contactsList.innerHTML = "";
      
      if (contacts.length === 0) {
        contactsList.innerHTML = "<p style='padding: 1rem; color: #999;'>Aucun contact. Ajouter des utilisateurs ci-dessous.</p>";
      } else {
        contacts.forEach((contact) => {
          // Vérifier que contact.contact existe et n'est pas null
          if (!contact.contact) {
            console.warn("Contact invalide:", contact);
            return;
          }
          
          const div = document.createElement("div");
          div.className = "contact-item";
          const contactUser = contact.contact;
          
          div.innerHTML = `
            <div class="contact-info">
              <img src="${contactUser.avatar || 'https://api.dicebear.com/6.x/initials/svg?seed=default'}" alt="${contactUser.name}" class="avatar" />
              <span class="contact-name">${contactUser.name}</span>
            </div>
            <div class="contact-actions">
              <button class="block-btn" onclick="blockContact('${contact._id}')">Bloquer</button>
            </div>
          `;
          contactsList.appendChild(div);
        });
      }

      // Afficher les utilisateurs disponibles pour ajouter comme contact
      const users = await apiCall("/users?limit=100");
      const usersList = users.users || users;
      
      // Récupérer les IDs des contacts existants (avec vérification)
      const existingContactIds = new Set(
        contacts
          .filter(c => c.contact) // Filtrer les contacts valides
          .map(c => c.contact._id || c.contact)
      );
      
      // Créer une liste d'utilisateurs non contactés
      const availableUsers = usersList.filter(user => 
        user._id !== currentUser.id && !existingContactIds.has(user._id)
      );
      
      // Ajouter une section pour ajouter des contacts
      if (availableUsers.length > 0) {
        const addContactDiv = document.createElement("div");
        addContactDiv.style.marginTop = "1rem";
        addContactDiv.style.borderTop = "1px solid #ddd";
        addContactDiv.style.paddingTop = "1rem";
        addContactDiv.id = "add-contacts-section";
        
        const title = document.createElement("h3");
        title.textContent = "Ajouter des contacts";
        title.style.marginBottom = "0.5rem";
        addContactDiv.appendChild(title);
        
        const usersDiv = document.createElement("div");
        usersDiv.style.maxHeight = "200px";
        usersDiv.style.overflowY = "auto";
        
        availableUsers.forEach((user) => {
          const userItem = document.createElement("div");
          userItem.className = "contact-item";
          userItem.style.borderBottom = "1px solid #eee";
          
          userItem.innerHTML = `
            <div class="contact-info">
              <img src="${user.avatar || 'https://api.dicebear.com/6.x/initials/svg?seed=default'}" alt="${user.name}" class="avatar" />
              <span class="contact-name">${user.name}</span>
            </div>
            <button class="add-contact-btn" onclick="addNewContact('${user._id}')">➕ Ajouter</button>
          `;
          usersDiv.appendChild(userItem);
        });
        
        addContactDiv.appendChild(usersDiv);
        
        // Supprimer l'ancienne section si elle existe
        const oldSection = document.getElementById("add-contacts-section");
        if (oldSection) {
          oldSection.remove();
        }
        
        contactsList.parentElement.appendChild(addContactDiv);
      }

      // Afficher les contacts bloqués
      const blockedContacts = await apiCall("/contacts/blocked");
      const blockedList = document.getElementById("blocked-contacts-list");
      blockedList.innerHTML = "";
      
      if (blockedContacts.length === 0) {
        blockedList.innerHTML = "<p style='padding: 1rem; color: #999;'>Aucun contact bloqué</p>";
      } else {
        blockedContacts.forEach((contact) => {
          // Vérifier que contact.contact existe
          if (!contact.contact) {
            console.warn("Contact bloqué invalide:", contact);
            return;
          }
          
          const div = document.createElement("div");
          div.className = "blocked-contact-item";
          const contactUser = contact.contact;
          
          div.innerHTML = `
            <div class="blocked-contact-info">
              <img src="${contactUser.avatar || 'https://api.dicebear.com/6.x/initials/svg?seed=default'}" alt="${contactUser.name}" class="avatar" />
              <span>${contactUser.name}</span>
            </div>
            <button class="unblock-btn" onclick="unblockContact('${contact._id}')">Débloquer</button>
          `;
          blockedList.appendChild(div);
        });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des contacts:", error);
      document.getElementById("contacts-list").innerHTML = "<p style='color: red;'>Erreur: " + error.message + "</p>";
    }
  };

  window.blockContact = async (contactId) => {
    try {
      await apiCall(`/contacts/${contactId}/block`, "POST");
      openContactsModal(); // Rafraîchir la liste
    } catch (error) {
      console.error("Erreur lors du blocage du contact:", error);
      alert("Erreur: " + error.message);
    }
  };

  window.unblockContact = async (contactId) => {
    try {
      await apiCall(`/contacts/${contactId}/unblock`, "POST");
      openContactsModal(); // Rafraîchir la liste
    } catch (error) {
      console.error("Erreur lors du déblocage du contact:", error);
      alert("Erreur: " + error.message);
    }
  };

  window.addNewContact = async (userId) => {
    try {
      await apiCall("/contacts", "POST", { contactId: userId });
      openContactsModal(); // Rafraîchir la liste
    } catch (error) {
      console.error("Erreur lors de l'ajout du contact:", error);
      alert("Erreur: " + error.message);
    }
  };

  const init = () => {
    if (token && currentUser) {
      showChatView();
    } else {
      authContainer.classList.remove("hidden");
    }
    loginForm.addEventListener("submit", handleLogin);
    registerForm.addEventListener("submit", handleRegister);
    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      loginView.classList.add("hidden");
      registerView.classList.remove("hidden");
      authError.textContent = "";
    });
    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      registerView.classList.add("hidden");
      loginView.classList.remove("hidden");
      authError.textContent = "";
    });
    logoutBtn.addEventListener("click", handleLogout);
    messageForm.addEventListener("submit", handleMessageSend);
    messageInput.addEventListener("input", handleTyping);
    newGroupBtn.addEventListener("click", openNewGroupModal);
    cancelGroupBtn.addEventListener("click", () =>
      newGroupModal.classList.add("hidden")
    );
    createGroupSubmitBtn.addEventListener("click", handleCreateConversation);

    currentUserProfile.addEventListener("click", openProfileModal);
    cancelProfileBtn.addEventListener("click", () =>
      profileModal.classList.add("hidden")
    );
    saveProfileBtn.addEventListener("click", handleProfileUpdate);

    // Événements pour les sessions et contacts
    const sessionsBtn = document.getElementById("sessions-btn");
    const contactsBtn = document.getElementById("contacts-btn");
    const sessionsModal = document.getElementById("sessions-modal");
    const contactsModal = document.getElementById("contacts-modal");
    const terminateAllBtn = document.getElementById("terminate-all-sessions-btn");
    const closeSessionsBtn = document.getElementById("close-sessions-modal-btn");
    const closeContactsBtn = document.getElementById("close-contacts-modal-btn");

    if (sessionsBtn) {
      sessionsBtn.addEventListener("click", () => {
        openSessionsModal();
        sessionsModal.classList.remove("hidden");
      });
    }

    if (contactsBtn) {
      contactsBtn.addEventListener("click", () => {
        openContactsModal();
        contactsModal.classList.remove("hidden");
      });
    }

    if (terminateAllBtn) {
      terminateAllBtn.addEventListener("click", async () => {
        if (confirm("Êtes-vous sûr de vouloir fermer toutes les sessions ?")) {
          try {
            await apiCall("/sessions/terminate-all", "POST");
            openSessionsModal();
          } catch (error) {
            console.error("Erreur:", error);
          }
        }
      });
    }

    if (closeSessionsBtn) {
      closeSessionsBtn.addEventListener("click", () =>
        sessionsModal.classList.add("hidden")
      );
    }

    if (closeContactsBtn) {
      closeContactsBtn.addEventListener("click", () =>
        contactsModal.classList.add("hidden")
      );
    }
  };

  init();
});
