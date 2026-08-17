// @ts-nocheck
const header = document.querySelector("[data-header]");
const toggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const navLinks = nav ? Array.from(nav.querySelectorAll("a")) : [];

const normalizePath = (path) => {
  const fileName = path.split("/").pop() || "index.html";
  return fileName === "" ? "index.html" : fileName;
};

const getCurrentIndexSection = () => {
  const sectionLinks = navLinks.filter((link) => {
    const url = new URL(link.getAttribute("href"), window.location.href);
    return normalizePath(url.pathname) === "index.html" && url.hash;
  });

  if (!sectionLinks.length) return "";

  const visibleHash = sectionLinks.reduce((activeHash, link) => {
    const url = new URL(link.getAttribute("href"), window.location.href);
    const section = document.querySelector(url.hash);
    if (!section) return activeHash;

    const rect = section.getBoundingClientRect();
    return rect.top <= 160 && rect.bottom > 160 ? url.hash : activeHash;
  }, "");

  if (visibleHash) return visibleHash;

  const hashTarget = sectionLinks.find((link) => {
    const url = new URL(link.getAttribute("href"), window.location.href);
    return url.hash === window.location.hash;
  });

  return hashTarget ? new URL(hashTarget.getAttribute("href"), window.location.href).hash : "";
};

function updateActiveNavItem() {
  if (!navLinks.length) return;

  const currentPath = normalizePath(window.location.pathname);
  const activeIndexHash = currentPath === "index.html" ? getCurrentIndexSection() : "";

  navLinks.forEach((link) => {
    const url = new URL(link.getAttribute("href"), window.location.href);
    const linkPath = normalizePath(url.pathname);
    let currentValue = "";

    if (activeIndexHash && linkPath === "index.html" && url.hash === activeIndexHash) {
      currentValue = "location";
    } else if (!activeIndexHash && linkPath === currentPath && !url.hash) {
      currentValue = "page";
    }

    if (currentValue) {
      link.setAttribute("aria-current", currentValue);
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setNavOpen(isOpen) {
  if (!header || !toggle) return;

  header.classList.toggle("nav-active", isOpen);
  document.body.classList.toggle("nav-open", isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
}

function updateHeader() {
  if (!header) return;

  header.classList.toggle("is-scrolled", window.scrollY > 24);
  updateActiveNavItem();
}

if (toggle && header) {
  toggle.addEventListener("click", () => {
    setNavOpen(!header.classList.contains("nav-active"));
  });
}

if (nav) {
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setNavOpen(false);
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setNavOpen(false);
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1080) {
    setNavOpen(false);
  }
  updateActiveNavItem();
});

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("hashchange", updateActiveNavItem);
updateHeader();
updateActiveNavItem();

const siteVideos = Array.from(document.querySelectorAll("video"));

const pauseOtherVideos = (activeVideo) => {
  siteVideos.forEach((video) => {
    if (video !== activeVideo && !video.paused) {
      video.pause();
    }
  });
};

siteVideos.forEach((video) => {
  video.addEventListener("play", () => pauseOtherVideos(video));
});

const videoPlayers = Array.from(document.querySelectorAll("[data-video-player]"));

if (videoPlayers.length > 0) {
  const formatVideoTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  videoPlayers.forEach((player) => {
    const video = player.querySelector("video");
    const frame = player.querySelector(".eys-player-frame");
    const posterButton = player.querySelector("[data-video-play]");
    const playButton = player.querySelector("[data-video-toggle]");
    const muteButton = player.querySelector("[data-video-mute]");
    const fullscreenButton = player.querySelector("[data-video-fullscreen]");
    const seek = player.querySelector("[data-video-seek]");
    const time = player.querySelector("[data-video-time]");
    let isSeeking = false;

    if (!video || !playButton || !seek || !time) return;

    const syncPlayer = () => {
      const duration = video.duration || 0;
      const current = video.currentTime || 0;
      const progress = duration ? (current / duration) * 100 : 0;

      player.classList.toggle("is-playing", !video.paused);
      player.classList.toggle("is-muted", video.muted || video.volume === 0);
      playButton.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");

      if (muteButton) {
        muteButton.setAttribute("aria-label", video.muted || video.volume === 0 ? "Unmute video" : "Mute video");
      }

      if (!isSeeking) {
        seek.value = String(progress);
      }

      seek.style.setProperty("--progress", `${progress}%`);
      time.textContent = `${formatVideoTime(current)} / ${formatVideoTime(duration)}`;
    };

    const togglePlayback = async () => {
      if (video.paused) {
        pauseOtherVideos(video);
        try {
          await video.play();
        } catch {
          player.classList.remove("is-playing");
        }
      } else {
        video.pause();
      }
      syncPlayer();
    };

    posterButton?.addEventListener("click", togglePlayback);
    playButton.addEventListener("click", togglePlayback);
    video.addEventListener("click", togglePlayback);
    video.addEventListener("loadedmetadata", syncPlayer);
    video.addEventListener("timeupdate", syncPlayer);
    video.addEventListener("play", syncPlayer);
    video.addEventListener("pause", syncPlayer);
    video.addEventListener("ended", syncPlayer);
    video.addEventListener("volumechange", syncPlayer);

    seek.addEventListener("input", () => {
      isSeeking = true;
      seek.style.setProperty("--progress", `${seek.value}%`);
      const duration = video.duration || 0;
      time.textContent = `${formatVideoTime((Number(seek.value) / 100) * duration)} / ${formatVideoTime(duration)}`;
    });

    seek.addEventListener("change", () => {
      const duration = video.duration || 0;
      video.currentTime = (Number(seek.value) / 100) * duration;
      isSeeking = false;
      syncPlayer();
    });

    muteButton?.addEventListener("click", () => {
      video.muted = !video.muted;
      syncPlayer();
    });

    fullscreenButton?.addEventListener("click", async () => {
      const fullscreenTarget = frame || player;

      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (fullscreenTarget.requestFullscreen) {
          await fullscreenTarget.requestFullscreen();
        }
      } catch {
        // Fullscreen can be unavailable in some embedded browser contexts.
      }
    });

    syncPlayer();
  });
}

const joinForm = document.querySelector("[data-join-form]");

const apiBase = () =>
  (window.EYS_CONFIG?.CONVEX_HTTP_URL || localStorage.getItem("eys.convexUrl") || "").replace(/\/$/, "");

async function eysApi(path, options = {}) {
  const base = apiBase();

  if (!base) {
    throw new Error("Convex is not configured yet. Add your deployment URL to config.js.");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${base}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function formatDate(timestamp) {
  if (!timestamp) return "Not published";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

if (joinForm) {
  const detailsStep = joinForm.querySelector("[data-details-step]");
  const profileStep = joinForm.querySelector("[data-profile-step]");
  const questions = Array.from(joinForm.querySelectorAll("[data-flow-question]"));
  const interestSelect = joinForm.querySelector("#join-interest");
  const photoInput = joinForm.querySelector("#profile-photo");
  const photoName = joinForm.querySelector("[data-photo-name]");
  const completeButton = joinForm.querySelector("[data-complete-join]");
  const status = joinForm.querySelector("[data-join-status]");
  let activeQuestion = 0;
  let isRestoringDraft = false;
  const draftKey = "eys.joinFormDraft.v1";
  const enhancedSelects = new Map();

  const getDraftFields = () =>
    Array.from(joinForm.elements).filter((field) => field.name && field.type !== "file");

  const saveDraft = () => {
    if (isRestoringDraft || joinForm.dataset.joinComplete === "true") return;

    const draft = {
      activeQuestion,
      values: {},
    };

    getDraftFields().forEach((field) => {
      draft.values[field.name] = field.value;
    });

    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Draft persistence is a convenience; the form still works without storage.
    }
  };

  const restoreDraft = () => {
    let draft;

    try {
      draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    } catch {
      clearDraft();
      return 0;
    }

    if (!draft?.values) return 0;

    isRestoringDraft = true;

    try {
      getDraftFields().forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(draft.values, field.name)) {
          field.value = draft.values[field.name] || "";
          field.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    } finally {
      isRestoringDraft = false;
    }

    return Number.isInteger(draft.activeQuestion) ? draft.activeQuestion : 0;
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage failures.
    }
  };

  const syncKeyboardInset = () => {
    if (!window.visualViewport) return;

    const inset = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
    document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
  };

  const updateEnhancedSelect = (select) => {
    const optionButtons = enhancedSelects.get(select);
    if (!optionButtons) return;

    optionButtons.forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.value === select.value));
    });
  };

  const enhanceFlowSelects = () => {
    joinForm.querySelectorAll(".flow-question select").forEach((select) => {
      if (enhancedSelects.has(select)) return;

      select.classList.add("is-enhanced-select");

      const choiceList = document.createElement("div");
      choiceList.className = "flow-choice-list";
      choiceList.setAttribute("role", "radiogroup");
      choiceList.setAttribute("aria-label", select.closest("[data-flow-question]")?.querySelector("label")?.textContent || select.name);

      const optionButtons = Array.from(select.options)
        .filter((option) => option.value)
        .map((option) => {
          const button = document.createElement("button");
          button.className = "flow-choice-option";
          button.type = "button";
          button.dataset.value = option.value;
          button.setAttribute("role", "radio");
          button.setAttribute("aria-checked", "false");
          button.textContent = option.textContent;
          button.addEventListener("click", () => {
            select.value = option.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            updateEnhancedSelect(select);
            button.focus({ preventScroll: true });
          });
          return button;
        });

      optionButtons.forEach((button) => choiceList.appendChild(button));
      select.insertAdjacentElement("afterend", choiceList);
      enhancedSelects.set(select, optionButtons);
      select.addEventListener("change", () => updateEnhancedSelect(select));
      updateEnhancedSelect(select);
    });
  };

  const setSelectedInterest = () => {
    const interest = new URLSearchParams(window.location.search).get("interest");
    if (!interestSelect || !interest) return;

    const matchingOption = Array.from(interestSelect.options).find((option) => option.value === interest || option.textContent === interest);
    if (matchingOption) {
      interestSelect.value = matchingOption.value;
      interestSelect.dispatchEvent(new Event("change", { bubbles: true }));
      updateEnhancedSelect(interestSelect);
    }
  };

  const getQuestionFocusTarget = (question) =>
    question.querySelector('.flow-choice-option[aria-checked="true"]') ||
    question.querySelector(".flow-choice-option") ||
    question.querySelector("input, textarea, select:not(.is-enhanced-select)");

  const showQuestion = (index, shouldFocus = true) => {
    if (questions.length === 0) return;

    activeQuestion = Math.max(0, Math.min(index, questions.length - 1));
    questions.forEach((question, questionIndex) => {
      question.hidden = questionIndex !== activeQuestion;
    });
    saveDraft();

    questions[activeQuestion].scrollIntoView({ behavior: "smooth", block: "center" });

    if (shouldFocus) {
      window.setTimeout(() => {
        getQuestionFocusTarget(questions[activeQuestion])?.focus({ preventScroll: true });
      }, 120);
    }
  };

  const validateActiveQuestion = () => {
    const field = questions[activeQuestion]?.querySelector("input, select, textarea");
    if (!field || field.checkValidity()) return true;

    field.reportValidity();
    return false;
  };

  const showFirstInvalidQuestion = () => {
    const invalidField = joinForm.querySelector("input:invalid, select:invalid, textarea:invalid");
    const invalidQuestion = invalidField?.closest("[data-flow-question]");
    const invalidIndex = questions.indexOf(invalidQuestion);

    if (invalidIndex >= 0) {
      showQuestion(invalidIndex);
      window.setTimeout(() => invalidField.reportValidity(), 160);
    }
  };

  window.visualViewport?.addEventListener("resize", syncKeyboardInset);
  window.visualViewport?.addEventListener("scroll", syncKeyboardInset);
  window.addEventListener("resize", syncKeyboardInset);
  syncKeyboardInset();

  enhanceFlowSelects();
  joinForm.addEventListener("input", saveDraft);
  joinForm.addEventListener("change", saveDraft);
  const restoredQuestion = restoreDraft();
  setSelectedInterest();
  joinForm.querySelectorAll("select").forEach(updateEnhancedSelect);
  showQuestion(restoredQuestion, false);

  joinForm.querySelectorAll("[data-flow-next]").forEach((button) => {
    button.addEventListener("click", () => {
      if (validateActiveQuestion()) {
        showQuestion(activeQuestion + 1);
      }
    });
  });

  joinForm.querySelectorAll("[data-flow-prev]").forEach((button) => {
    button.addEventListener("click", () => {
      showQuestion(activeQuestion - 1);
    });
  });

  joinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateActiveQuestion()) {
      return;
    }

    if (questions.length > 0 && activeQuestion < questions.length - 1) {
      showQuestion(activeQuestion + 1);
    }
  });

  const readFileAsDataUrl = (file) =>
    new Promise((resolve) => {
      if (!file) return resolve(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => resolve(undefined));
      reader.readAsDataURL(file);
    });

  const optimizeProfilePhoto = async (file) => {
    if (!file) return { dataUrl: undefined, type: undefined, size: undefined };

    if (file.type === "image/svg+xml") {
      const dataUrl = await readFileAsDataUrl(file);
      return { dataUrl, type: file.type, size: file.size };
    }

    const image = await new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("The selected photo could not be processed."));
      };

      img.src = objectUrl;
    });

    const maxDimension = 1200;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
    const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      const dataUrl = await readFileAsDataUrl(file);
      return { dataUrl, type: file.type, size: file.size };
    }

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const mimeType = file.type === "image/png" || file.type === "image/webp" ? "image/jpeg" : file.type;
    const targetSize = 220000;
    let quality = 0.82;

    const toBlobWithQuality = (value) =>
      new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, value);
      });

    let blob = await toBlobWithQuality(quality);

    while (blob && blob.size > targetSize && quality > 0.45) {
      quality -= 0.08;
      blob = await toBlobWithQuality(quality);
    }

    if (!blob) {
      const dataUrl = await readFileAsDataUrl(file);
      return { dataUrl, type: file.type, size: file.size };
    }

    const dataUrl = canvas.toDataURL(mimeType, quality);
    return { dataUrl, type: mimeType, size: blob.size };
  };

  photoInput?.addEventListener("change", () => {
    const file = photoInput.files?.[0];

    if (photoName) {
      photoName.textContent = file ? file.name : "JPG, PNG or WebP";
    }
  });

  completeButton?.addEventListener("click", async () => {
    if (!joinForm.checkValidity()) {
      showFirstInvalidQuestion();
      return;
    }

    const formData = new FormData(joinForm);
    const file = photoInput?.files?.[0];

    completeButton.textContent = "Sending...";
    completeButton.disabled = true;

    if (status) {
      status.textContent = "";
      status.dataset.state = "";
    }

    try {
      const optimizedPhoto = file ? await optimizeProfilePhoto(file) : { dataUrl: undefined, type: undefined, size: undefined };

      await eysApi("/api/join", {
        method: "POST",
        body: {
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          interest: formData.get("interest"),
          location: formData.get("location"),
          message: formData.get("message"),
          profilePhotoName: file?.name,
          profilePhotoType: optimizedPhoto.type || file?.type,
          profilePhotoSize: optimizedPhoto.size || file?.size,
          profilePhotoData: optimizedPhoto.dataUrl,
          consent: formData.get("consent") === "on",
        },
      });

      completeButton.textContent = "Request sent";
      joinForm.dataset.joinComplete = "true";
      clearDraft();
      joinForm.reset();
      setSelectedInterest();
      joinForm.querySelectorAll("select").forEach(updateEnhancedSelect);

      if (photoName) {
        photoName.textContent = "JPG, PNG or WebP";
      }

      if (status) {
        status.textContent = "Thank you. Your request has been sent to the EYS team.";
        status.dataset.state = "success";
      }

      showQuestion(questions.length - 1, false);
    } catch (error) {
      completeButton.textContent = "Send";
      completeButton.disabled = false;

      if (status) {
        status.textContent = error.message;
        status.dataset.state = "error";
      }
    }
  });
}

const adminApp = document.querySelector("[data-admin-app]");

if (adminApp) {
  const tokenKey = "eys.adminToken";
  const loginPanel = adminApp.querySelector("[data-admin-login]");
  const dashboard = adminApp.querySelector("[data-admin-dashboard]");
  const loginForm = adminApp.querySelector("[data-admin-login-form]");
  const loginStatus = adminApp.querySelector("[data-admin-login-status]");
  const adminName = adminApp.querySelector("[data-admin-name]");
  const requestsList = adminApp.querySelector("[data-requests-list]");
  const membersList = adminApp.querySelector("[data-members-list]");
  const memberEditor = adminApp.querySelector("[data-member-editor]");
  const memberEditorStatus = adminApp.querySelector("[data-member-editor-status]");
  const postsList = adminApp.querySelector("[data-posts-list]");
  const editor = adminApp.querySelector("[data-blog-editor]");
  const editorStatus = adminApp.querySelector("[data-blog-editor-status]");
  const impactReportsList = adminApp.querySelector("[data-impact-reports-list]");
  const impactEditor = adminApp.querySelector("[data-impact-editor]");
  const impactEditorStatus = adminApp.querySelector("[data-impact-editor-status]");
  const governanceList = adminApp.querySelector("[data-governance-list]");
  const governanceEditor = adminApp.querySelector("[data-governance-editor]");
  const governanceEditorStatus = adminApp.querySelector("[data-governance-editor-status]");
  const partnersList = adminApp.querySelector("[data-partners-list]");
  const partnerEditor = adminApp.querySelector("[data-partner-editor]");
  const partnerEditorStatus = adminApp.querySelector("[data-partner-editor-status]");

  const token = () => localStorage.getItem(tokenKey) || "";
  const setStatus = (node, message, state = "") => {
    if (!node) return;
    node.textContent = message;
    node.dataset.state = state;
  };

  const setSignedIn = (admin) => {
    if (loginPanel) loginPanel.hidden = true;
    if (dashboard) dashboard.hidden = false;
    if (adminName) adminName.textContent = admin?.name || admin?.email || "Admin";
  };

  const setSignedOut = () => {
    localStorage.removeItem(tokenKey);
    if (loginPanel) loginPanel.hidden = false;
    if (dashboard) dashboard.hidden = true;
  };

  const updateRequestStatus = async (id, status, button) => {
    if (!button) return;
    button.textContent = status === "archived" ? "Archiving..." : "Saving...";
    button.disabled = true;

    try {
      await eysApi("/api/admin/join-requests/status", {
        method: "POST",
        token: token(),
        body: {
          id,
          status,
        },
      });
      await loadRequests();
    } catch (error) {
      button.textContent = error.message;
    }
  };

  const loadRequests = async () => {
    if (!requestsList) return;
    requestsList.innerHTML = '<p class="empty-state">Loading join requests...</p>';

    try {
      const requests = await eysApi("/api/admin/join-requests", { token: token() });
      requestsList.innerHTML = requests.length
        ? requests
            .map(
              (request) => `
                <article class="admin-item">
                  <div>
                    <div class="admin-item-title">${escapeHtml(request.name)}</div>
                    <p>${escapeHtml(request.email)}${request.phone ? ` · ${escapeHtml(request.phone)}` : ""}</p>
                    <p><strong>${escapeHtml(request.interest)}</strong>${request.location ? ` · ${escapeHtml(request.location)}` : ""}</p>
                    ${request.message ? `<p>${escapeHtml(request.message)}</p>` : ""}
                    ${request.profilePhotoName ? `<p>Photo: ${escapeHtml(request.profilePhotoName)}</p>` : ""}
                  </div>
                  <div class="admin-item-meta">
                    <span class="status-pill">${escapeHtml(request.status)}</span>
                    <time>${formatDate(request.createdAt)}</time>
                    <div class="admin-actions-row">
                      ${request.status !== "reviewed" ? `<button class="button secondary compact-button" type="button" data-review-request="${escapeHtml(request._id)}">Mark reviewed</button>` : ""}
                      <button class="button secondary compact-button" type="button" data-archive-request="${escapeHtml(request._id)}">Archive</button>
                      <button class="button secondary compact-button" type="button" data-promote-request="${escapeHtml(request._id)}">Make member</button>
                    </div>
                  </div>
                </article>
              `,
            )
            .join("")
        : '<p class="empty-state">No join requests yet.</p>';

      requestsList.querySelectorAll("[data-promote-request]").forEach((button) => {
        button.addEventListener("click", async () => {
          button.textContent = "Creating...";
          button.disabled = true;

          try {
            await eysApi("/api/admin/members/from-request", {
              method: "POST",
              token: token(),
              body: {
                id: button.dataset.promoteRequest,
                visibility: "draft",
              },
            });
            await Promise.all([loadRequests(), loadMembers()]);
          } catch (error) {
            button.textContent = error.message;
          }
        });
      });

      requestsList.querySelectorAll("[data-review-request]").forEach((button) => {
        button.addEventListener("click", () => updateRequestStatus(button.dataset.reviewRequest, "reviewed", button));
      });

      requestsList.querySelectorAll("[data-archive-request]").forEach((button) => {
        button.addEventListener("click", () => updateRequestStatus(button.dataset.archiveRequest, "archived", button));
      });
    } catch (error) {
      requestsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  };

  const memberPayload = (form) => {
    const formData = new FormData(form);
    return {
      name: formData.get("name"),
      role: formData.get("role"),
      location: formData.get("location"),
      bio: formData.get("bio"),
      skills: formData.get("skills"),
      businessName: formData.get("businessName"),
      websiteUrl: formData.get("websiteUrl"),
      imageUrl: formData.get("imageUrl"),
      visibility: formData.get("visibility"),
    };
  };

  const fillMemberEditor = (member) => {
    if (!memberEditor) return;
    memberEditor.elements.id.value = member._id;
    memberEditor.elements.name.value = member.name;
    memberEditor.elements.role.value = member.role;
    memberEditor.elements.location.value = member.location || "";
    memberEditor.elements.bio.value = member.bio;
    memberEditor.elements.skills.value = (member.skills || []).join(", ");
    memberEditor.elements.businessName.value = member.businessName || "";
    memberEditor.elements.websiteUrl.value = member.websiteUrl || "";
    memberEditor.elements.imageUrl.value = member.imageUrl || "";
    memberEditor.elements.visibility.value = member.visibility;
    memberEditor.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const loadMembers = async () => {
    if (!membersList) return;
    membersList.innerHTML = '<p class="empty-state">Loading members...</p>';

    try {
      const members = await eysApi("/api/admin/members", { token: token() });
      membersList.innerHTML = members.length
        ? members
            .map(
              (member) => `
                <article class="admin-item">
                  <div>
                    <div class="admin-item-title">${escapeHtml(member.name)}</div>
                    <p><strong>${escapeHtml(member.role)}</strong>${member.location ? ` · ${escapeHtml(member.location)}` : ""}</p>
                    <p>${escapeHtml(member.bio)}</p>
                    ${
                      member.skills?.length
                        ? `<div class="mini-tags">${member.skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</div>`
                        : ""
                    }
                    ${member.businessName ? `<p>Project: ${escapeHtml(member.businessName)}</p>` : ""}
                  </div>
                  <div class="admin-item-meta">
                    <span class="status-pill">${escapeHtml(member.visibility)}</span>
                    <time>${formatDate(member.publishedAt || member.updatedAt)}</time>
                    <button class="button secondary compact-button" type="button" data-edit-member="${escapeHtml(member._id)}">Edit</button>
                  </div>
                </article>
              `,
            )
            .join("")
        : '<p class="empty-state">No member profiles yet. Promote a join request or create one above.</p>';

      membersList.querySelectorAll("[data-edit-member]").forEach((button) => {
        button.addEventListener("click", () => {
          const member = members.find((item) => item._id === button.dataset.editMember);
          if (member) fillMemberEditor(member);
        });
      });
    } catch (error) {
      membersList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  };

  const loadPosts = async () => {
    if (!postsList) return;
    postsList.innerHTML = '<p class="empty-state">Loading blog posts...</p>';

    try {
      const posts = await eysApi("/api/admin/blog-posts", { token: token() });
      postsList.innerHTML = posts.length
        ? posts
            .map(
              (post) => `
                <article class="admin-item">
                  <div>
                    <div class="admin-item-title">${escapeHtml(post.title)}</div>
                    <p>${escapeHtml(post.excerpt)}</p>
                    <p>/${escapeHtml(post.slug)}</p>
                  </div>
                  <div class="admin-item-meta">
                    <span class="status-pill">${escapeHtml(post.status)}</span>
                    <time>${formatDate(post.publishedAt || post.updatedAt)}</time>
                    <button class="button secondary compact-button" type="button" data-edit-post="${escapeHtml(post._id)}">Edit</button>
                  </div>
                </article>
              `,
            )
            .join("")
        : '<p class="empty-state">No posts yet. Create the first update above.</p>';

      postsList.querySelectorAll("[data-edit-post]").forEach((button) => {
        button.addEventListener("click", () => {
          const post = posts.find((item) => item._id === button.dataset.editPost);
          if (!post || !editor) return;
          editor.elements.id.value = post._id;
          editor.elements.title.value = post.title;
          editor.elements.excerpt.value = post.excerpt;
          editor.elements.body.value = post.body;
          editor.elements.coverImageUrl.value = post.coverImageUrl || "";
          editor.elements.status.value = post.status;
          editor.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
    } catch (error) {
      postsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  };

  const impactPayload = (form) => {
    const formData = new FormData(form);
    return {
      title: formData.get("title"),
      period: formData.get("period"),
      summary: formData.get("summary"),
      body: formData.get("body"),
      metricHighlights: formData.get("metricHighlights"),
      fileUrl: formData.get("fileUrl"),
      status: formData.get("status"),
    };
  };

  const fillImpactEditor = (report) => {
    if (!impactEditor) return;
    impactEditor.elements.id.value = report._id;
    impactEditor.elements.title.value = report.title;
    impactEditor.elements.period.value = report.period;
    impactEditor.elements.summary.value = report.summary;
    impactEditor.elements.body.value = report.body;
    impactEditor.elements.metricHighlights.value = (report.metricHighlights || []).join("\n");
    impactEditor.elements.fileUrl.value = report.fileUrl || "";
    impactEditor.elements.status.value = report.status;
    impactEditor.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const loadImpactReports = async () => {
    if (!impactReportsList) return;
    impactReportsList.innerHTML = '<p class="empty-state">Loading impact reports...</p>';

    try {
      const reports = await eysApi("/api/admin/impact-reports", { token: token() });
      impactReportsList.innerHTML = reports.length
        ? reports
            .map(
              (report) => `
                <article class="admin-item">
                  <div>
                    <div class="admin-item-title">${escapeHtml(report.title)}</div>
                    <p><strong>${escapeHtml(report.period)}</strong></p>
                    <p>${escapeHtml(report.summary)}</p>
                    ${
                      report.metricHighlights?.length
                        ? `<div class="mini-tags">${report.metricHighlights.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`
                        : ""
                    }
                  </div>
                  <div class="admin-item-meta">
                    <span class="status-pill">${escapeHtml(report.status)}</span>
                    <time>${formatDate(report.publishedAt || report.updatedAt)}</time>
                    <button class="button secondary compact-button" type="button" data-edit-impact-report="${escapeHtml(report._id)}">Edit</button>
                  </div>
                </article>
              `,
            )
            .join("")
        : '<p class="empty-state">No impact reports yet. Add annual notes, quarterly summaries or partner updates above.</p>';

      impactReportsList.querySelectorAll("[data-edit-impact-report]").forEach((button) => {
        button.addEventListener("click", () => {
          const report = reports.find((item) => item._id === button.dataset.editImpactReport);
          if (report) fillImpactEditor(report);
        });
      });
    } catch (error) {
      impactReportsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  };

  const governancePayload = (form) => {
    const formData = new FormData(form);
    return {
      name: formData.get("name"),
      role: formData.get("role"),
      bio: formData.get("bio"),
      imageUrl: formData.get("imageUrl"),
      sortOrder: Number(formData.get("sortOrder")) || 100,
      visibility: formData.get("visibility"),
    };
  };

  const fillGovernanceEditor = (profile) => {
    if (!governanceEditor) return;
    governanceEditor.elements.id.value = profile._id;
    governanceEditor.elements.name.value = profile.name;
    governanceEditor.elements.role.value = profile.role;
    governanceEditor.elements.bio.value = profile.bio;
    governanceEditor.elements.imageUrl.value = profile.imageUrl || "";
    governanceEditor.elements.sortOrder.value = profile.sortOrder ?? 100;
    governanceEditor.elements.visibility.value = profile.visibility;
    governanceEditor.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const loadGovernanceProfiles = async () => {
    if (!governanceList) return;
    governanceList.innerHTML = '<p class="empty-state">Loading governance profiles...</p>';

    try {
      const profiles = await eysApi("/api/admin/governance-profiles", { token: token() });
      governanceList.innerHTML = profiles.length
        ? profiles
            .map(
              (profile) => `
                <article class="admin-item">
                  <div>
                    <div class="admin-item-title">${escapeHtml(profile.name)}</div>
                    <p><strong>${escapeHtml(profile.role)}</strong></p>
                    <p>${escapeHtml(profile.bio)}</p>
                    <p>Sort order: ${escapeHtml(profile.sortOrder ?? 100)}</p>
                  </div>
                  <div class="admin-item-meta">
                    <span class="status-pill">${escapeHtml(profile.visibility)}</span>
                    <time>${formatDate(profile.publishedAt || profile.updatedAt)}</time>
                    <button class="button secondary compact-button" type="button" data-edit-governance="${escapeHtml(profile._id)}">Edit</button>
                  </div>
                </article>
              `,
            )
            .join("")
        : '<p class="empty-state">No governance profiles yet. Add public directors, advisers or a named team group when confirmed.</p>';

      governanceList.querySelectorAll("[data-edit-governance]").forEach((button) => {
        button.addEventListener("click", () => {
          const profile = profiles.find((item) => item._id === button.dataset.editGovernance);
          if (profile) fillGovernanceEditor(profile);
        });
      });
    } catch (error) {
      governanceList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  };

  const partnerPayload = (form) => {
    const formData = new FormData(form);
    return {
      name: formData.get("name"),
      description: formData.get("description"),
      websiteUrl: formData.get("websiteUrl"),
      logoUrl: formData.get("logoUrl"),
      sortOrder: Number(formData.get("sortOrder")) || 100,
      visibility: formData.get("visibility"),
    };
  };

  const fillPartnerEditor = (partner) => {
    if (!partnerEditor) return;
    partnerEditor.elements.id.value = partner._id;
    partnerEditor.elements.name.value = partner.name;
    partnerEditor.elements.description.value = partner.description;
    partnerEditor.elements.websiteUrl.value = partner.websiteUrl || "";
    partnerEditor.elements.logoUrl.value = partner.logoUrl || "";
    partnerEditor.elements.sortOrder.value = partner.sortOrder ?? 100;
    partnerEditor.elements.visibility.value = partner.visibility;
    partnerEditor.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const loadPartners = async () => {
    if (!partnersList) return;
    partnersList.innerHTML = '<p class="empty-state">Loading partners...</p>';

    try {
      const partners = await eysApi("/api/admin/partners", { token: token() });
      partnersList.innerHTML = partners.length
        ? partners
            .map(
              (partner) => `
                <article class="admin-item">
                  <div>
                    <div class="admin-item-title">${escapeHtml(partner.name)}</div>
                    <p>${escapeHtml(partner.description)}</p>
                    ${partner.websiteUrl ? `<p><a class="text-link" href="${escapeHtml(partner.websiteUrl)}" target="_blank" rel="noreferrer">Website</a></p>` : ""}
                  </div>
                  <div class="admin-item-meta">
                    <span class="status-pill">${escapeHtml(partner.visibility)}</span>
                    <time>${formatDate(partner.publishedAt || partner.updatedAt)}</time>
                    <button class="button secondary compact-button" type="button" data-edit-partner="${escapeHtml(partner._id)}">Edit</button>
                  </div>
                </article>
              `,
            )
            .join("")
        : '<p class="empty-state">No partners yet. Add partner or sponsor listings above.</p>';

      partnersList.querySelectorAll("[data-edit-partner]").forEach((button) => {
        button.addEventListener("click", () => {
          const partner = partners.find((item) => item._id === button.dataset.editPartner);
          if (partner) fillPartnerEditor(partner);
        });
      });
    } catch (error) {
      partnersList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  };

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(loginStatus, "Signing in...");
    const formData = new FormData(loginForm);

    try {
      const result = await eysApi("/api/admin/login", {
        method: "POST",
        body: {
          email: formData.get("email"),
          password: formData.get("password"),
        },
      });
      localStorage.setItem(tokenKey, result.token);
      setStatus(loginStatus, "");
      setSignedIn(result.admin);
      await Promise.all([loadRequests(), loadMembers(), loadPosts(), loadImpactReports(), loadGovernanceProfiles(), loadPartners()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in. Please try again.";
      setStatus(loginStatus, message, "error");
    }
  });

  adminApp.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
    try {
      await eysApi("/api/admin/logout", { method: "POST", token: token() });
    } finally {
      setSignedOut();
    }
  });

  adminApp.querySelectorAll("[data-admin-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      adminApp.querySelectorAll("[data-admin-tab]").forEach((item) => item.classList.remove("is-active"));
      adminApp.querySelectorAll("[data-admin-panel]").forEach((panel) => panel.classList.remove("is-active"));
      tab.classList.add("is-active");
      adminApp.querySelector(`[data-admin-panel="${tab.dataset.adminTab}"]`)?.classList.add("is-active");
    });
  });

  adminApp.querySelector("[data-refresh-requests]")?.addEventListener("click", loadRequests);
  adminApp.querySelector("[data-refresh-members]")?.addEventListener("click", loadMembers);
  adminApp.querySelector("[data-refresh-posts]")?.addEventListener("click", loadPosts);
  adminApp.querySelector("[data-refresh-impact-reports]")?.addEventListener("click", loadImpactReports);
  adminApp.querySelector("[data-refresh-governance]")?.addEventListener("click", loadGovernanceProfiles);
  adminApp.querySelector("[data-refresh-partners]")?.addEventListener("click", loadPartners);
  adminApp.querySelector("[data-clear-member-editor]")?.addEventListener("click", () => {
    memberEditor?.reset();
    if (memberEditor?.elements.id) memberEditor.elements.id.value = "";
    setStatus(memberEditorStatus, "");
  });
  adminApp.querySelector("[data-clear-editor]")?.addEventListener("click", () => {
    editor?.reset();
    if (editor?.elements.id) editor.elements.id.value = "";
    setStatus(editorStatus, "");
  });
  adminApp.querySelector("[data-clear-impact-editor]")?.addEventListener("click", () => {
    impactEditor?.reset();
    if (impactEditor?.elements.id) impactEditor.elements.id.value = "";
    setStatus(impactEditorStatus, "");
  });
  adminApp.querySelector("[data-clear-governance-editor]")?.addEventListener("click", () => {
    governanceEditor?.reset();
    if (governanceEditor?.elements.id) governanceEditor.elements.id.value = "";
    setStatus(governanceEditorStatus, "");
  });

  adminApp.querySelector("[data-clear-partner-editor]")?.addEventListener("click", () => {
    partnerEditor?.reset();
    if (partnerEditor?.elements.id) partnerEditor.elements.id.value = "";
    setStatus(partnerEditorStatus, "");
  });

  partnerEditor?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(partnerEditorStatus, "Saving...");
    const formData = new FormData(partnerEditor);
    const id = formData.get("id");

    try {
      await eysApi(id ? "/api/admin/partners/update" : "/api/admin/partners", {
        method: "POST",
        token: token(),
        body: id ? { id, ...partnerPayload(partnerEditor) } : partnerPayload(partnerEditor),
      });
      partnerEditor.reset();
      partnerEditor.elements.id.value = "";
      setStatus(partnerEditorStatus, "Saved.", "success");
      await loadPartners();
    } catch (error) {
      setStatus(partnerEditorStatus, error.message, "error");
    }
  });

  memberEditor?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(memberEditorStatus, "Saving...");
    const formData = new FormData(memberEditor);
    const id = formData.get("id");

    try {
      await eysApi(id ? "/api/admin/members/update" : "/api/admin/members", {
        method: "POST",
        token: token(),
        body: id ? { id, ...memberPayload(memberEditor) } : memberPayload(memberEditor),
      });
      memberEditor.reset();
      memberEditor.elements.id.value = "";
      setStatus(memberEditorStatus, "Saved.", "success");
      await loadMembers();
    } catch (error) {
      setStatus(memberEditorStatus, error.message, "error");
    }
  });

  editor?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(editorStatus, "Saving...");
    const formData = new FormData(editor);
    const id = formData.get("id");
    const payload = {
      title: formData.get("title"),
      excerpt: formData.get("excerpt"),
      body: formData.get("body"),
      coverImageUrl: formData.get("coverImageUrl"),
      status: formData.get("status"),
    };

    try {
      await eysApi(id ? "/api/admin/blog-posts/update" : "/api/admin/blog-posts", {
        method: "POST",
        token: token(),
        body: id ? { id, ...payload } : payload,
      });
      editor.reset();
      editor.elements.id.value = "";
      setStatus(editorStatus, "Saved.", "success");
      await loadPosts();
    } catch (error) {
      setStatus(editorStatus, error.message, "error");
    }
  });

  impactEditor?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(impactEditorStatus, "Saving...");
    const formData = new FormData(impactEditor);
    const id = formData.get("id");
    const payload = impactPayload(impactEditor);

    try {
      await eysApi(id ? "/api/admin/impact-reports/update" : "/api/admin/impact-reports", {
        method: "POST",
        token: token(),
        body: id ? { id, ...payload } : payload,
      });
      impactEditor.reset();
      impactEditor.elements.id.value = "";
      setStatus(impactEditorStatus, "Saved.", "success");
      await loadImpactReports();
    } catch (error) {
      setStatus(impactEditorStatus, error.message, "error");
    }
  });

  governanceEditor?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(governanceEditorStatus, "Saving...");
    const formData = new FormData(governanceEditor);
    const id = formData.get("id");
    const payload = governancePayload(governanceEditor);

    try {
      await eysApi(id ? "/api/admin/governance-profiles/update" : "/api/admin/governance-profiles", {
        method: "POST",
        token: token(),
        body: id ? { id, ...payload } : payload,
      });
      governanceEditor.reset();
      governanceEditor.elements.id.value = "";
      setStatus(governanceEditorStatus, "Saved.", "success");
      await loadGovernanceProfiles();
    } catch (error) {
      setStatus(governanceEditorStatus, error.message, "error");
    }
  });

  if (token()) {
    eysApi("/api/admin/me", { token: token() })
      .then(async (admin) => {
        setSignedIn(admin);
        await Promise.all([loadRequests(), loadMembers(), loadPosts(), loadImpactReports(), loadGovernanceProfiles(), loadPartners()]);
      })
      .catch(setSignedOut);
  }
}

const membersApp = document.querySelector("[data-members-app]");

if (membersApp) {
  const status = membersApp.querySelector("[data-members-status]");
  const list = membersApp.querySelector("[data-members-list]");

  const initials = (name) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const renderMembers = (members) => {
    if (!list) return;
    list.innerHTML = members.length
      ? members
          .map(
            (member) => `
              <article class="member-card">
                ${
                  member.imageUrl
                    ? `<img src="${escapeHtml(member.imageUrl)}" alt="${escapeHtml(member.name)}" />`
                    : `<div class="member-avatar" aria-hidden="true">${escapeHtml(initials(member.name))}</div>`
                }
                <div class="member-card-body">
                  <h2>${escapeHtml(member.name)}</h2>
                  ${member.location ? `<p class="member-location">${escapeHtml(member.location)}</p>` : ""}
                  <p>${escapeHtml(member.bio)}</p>
                  ${
                    member.skills?.length
                      ? `<div class="mini-tags">${member.skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</div>`
                      : ""
                  }
                  ${
                    member.businessName || member.websiteUrl
                      ? `<div class="member-project">
                          ${member.businessName ? `<strong>${escapeHtml(member.businessName)}</strong>` : ""}
                          ${member.websiteUrl ? `<a class="text-link" href="${escapeHtml(member.websiteUrl)}" target="_blank" rel="noreferrer">Visit link</a>` : ""}
                        </div>`
                      : ""
                  }
                </div>
              </article>
            `,
          )
          .join("")
      : '<p class="empty-state">Approved member profiles will appear here soon.</p>';
  };

  (async () => {
    try {
      renderMembers(await eysApi("/api/members"));
      if (status) status.hidden = true;
    } catch (error) {
      if (status) {
        status.textContent = error.message;
        status.dataset.state = "error";
      }
    }
  })();
}

const impactApp = document.querySelector("[data-impact-app]");

if (impactApp) {
  const status = impactApp.querySelector("[data-impact-status]");
  const reportsList = impactApp.querySelector("[data-impact-reports-list]");
  const governanceList = impactApp.querySelector("[data-governance-profiles-list]");

  const renderReports = (reports) => {
    if (!reportsList) return;
    reportsList.innerHTML = reports.length
      ? reports
          .map(
            (report) => `
              <article class="impact-card">
                <div>
                  <h3>${escapeHtml(report.title)}</h3>
                  <p>${escapeHtml(report.summary)}</p>
                  ${
                    report.metricHighlights?.length
                      ? `<div class="mini-tags">${report.metricHighlights.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`
                      : ""
                  }
                </div>
                <div class="impact-card-footer">
                  <time>${formatDate(report.publishedAt)}</time>
                  ${report.fileUrl ? `<a class="text-link" href="${escapeHtml(report.fileUrl)}" target="_blank" rel="noreferrer">Open report</a>` : ""}
                </div>
              </article>
            `,
          )
          .join("")
      : '<p class="empty-state">Formal impact reports will appear here as EYS publishes them.</p>';
  };

  const renderGovernance = (profiles) => {
    if (!governanceList) return;
    governanceList.innerHTML = profiles.length
      ? profiles
          .map(
            (profile) => `
              <article class="governance-card">
                ${
                  profile.imageUrl
                    ? `<img src="${escapeHtml(profile.imageUrl)}" alt="${escapeHtml(profile.name)}" />`
                    : `<div class="governance-avatar" aria-hidden="true">${escapeHtml(profile.name.slice(0, 2).toUpperCase())}</div>`
                }
                <div>
                  <h3>${escapeHtml(profile.name)}</h3>
                  <p>${escapeHtml(profile.bio)}</p>
                </div>
              </article>
            `,
          )
          .join("")
      : '<p class="empty-state">Confirmed governance and team profiles will appear here.</p>';
  };

  (async () => {
    try {
      const [reports, profiles] = await Promise.all([
        eysApi("/api/impact-reports"),
        eysApi("/api/governance-profiles"),
      ]);
      renderReports(reports);
      renderGovernance(profiles);
      if (status) status.hidden = true;
    } catch (error) {
      if (status) {
        status.textContent = error.message;
        status.dataset.state = "error";
      }
    }
  })();
}

const blogApp = document.querySelector("[data-blog-app]");

if (blogApp) {
  const status = blogApp.querySelector("[data-blog-status]");
  const list = blogApp.querySelector("[data-blog-list]");
  const article = blogApp.querySelector("[data-blog-post]");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("post");

  const renderPost = (post) => {
    if (!article || !list) return;
    list.hidden = true;
    article.hidden = false;
    article.innerHTML = `
      <a class="back-link" href="blog.html">Back to all posts</a>
      ${post.coverImageUrl ? `<img class="blog-cover" src="${escapeHtml(post.coverImageUrl)}" alt="" />` : ""}
      <time>${formatDate(post.publishedAt)}</time>
      <h2>${escapeHtml(post.title)}</h2>
      <p class="blog-excerpt">${escapeHtml(post.excerpt)}</p>
      <div class="blog-body">
        ${escapeHtml(post.body)
          .split(/\n{2,}/)
          .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
          .join("")}
      </div>
    `;
  };

  const renderList = (posts) => {
    if (!list) return;
    list.innerHTML = posts.length
      ? posts
          .map(
            (post) => `
              <article class="blog-card">
                ${post.coverImageUrl ? `<img src="${escapeHtml(post.coverImageUrl)}" alt="" />` : ""}
                <div>
                  <time>${formatDate(post.publishedAt)}</time>
                  <h2>${escapeHtml(post.title)}</h2>
                  <p>${escapeHtml(post.excerpt)}</p>
                  <a class="text-link" href="blog.html?post=${encodeURIComponent(post.slug)}">Read update</a>
                </div>
              </article>
            `,
          )
          .join("")
      : '<p class="empty-state">No published posts yet.</p>';
  };

  (async () => {
    try {
      if (slug) {
        const post = await eysApi(`/api/blog/${encodeURIComponent(slug)}`);
        renderPost(post);
      } else {
        renderList(await eysApi("/api/blog"));
      }
      if (status) status.hidden = true;
    } catch (error) {
      if (status) {
        status.textContent = error.message;
        status.dataset.state = "error";
      }
    }
  })();
}
