const header = document.querySelector("[data-header]");
const toggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");

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
});

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const carousel = document.querySelector("[data-service-carousel]");

if (carousel) {
  const track = carousel.querySelector("[data-service-track]");
  const slides = Array.from(carousel.querySelectorAll("[data-service-slide]"));
  const dots = carousel.querySelector("[data-carousel-dots]");
  const previousButton = document.querySelector("[data-carousel-prev]");
  const nextButton = document.querySelector("[data-carousel-next]");

  const getActiveIndex = () => {
    if (!track || slides.length === 0) return 0;

    const trackLeft = track.getBoundingClientRect().left;
    return slides.reduce((closestIndex, slide, index) => {
      const currentDistance = Math.abs(slide.getBoundingClientRect().left - trackLeft);
      const closestDistance = Math.abs(slides[closestIndex].getBoundingClientRect().left - trackLeft);
      return currentDistance < closestDistance ? index : closestIndex;
    }, 0);
  };

  const scrollToSlide = (index) => {
    const target = slides[index];
    if (!track || !target) return;

    track.scrollTo({
      left: target.offsetLeft - track.offsetLeft,
      behavior: "smooth",
    });
  };

  const updateCarousel = () => {
    const activeIndex = getActiveIndex();

    if (previousButton) {
      previousButton.disabled = activeIndex === 0;
    }

    if (nextButton) {
      nextButton.disabled = activeIndex === slides.length - 1;
    }

    if (dots) {
      Array.from(dots.children).forEach((dot, index) => {
        dot.classList.toggle("is-active", index === activeIndex);
        dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
      });
    }
  };

  if (dots && slides.length > 0) {
    slides.forEach((slide, index) => {
      const dot = document.createElement("button");
      const title = slide.querySelector("strong")?.textContent || `Service ${index + 1}`;

      dot.type = "button";
      dot.setAttribute("aria-label", `Show ${title}`);
      dot.addEventListener("click", () => scrollToSlide(index));
      dots.appendChild(dot);
    });
  }

  previousButton?.addEventListener("click", () => {
    scrollToSlide(Math.max(getActiveIndex() - 1, 0));
  });

  nextButton?.addEventListener("click", () => {
    scrollToSlide(Math.min(getActiveIndex() + 1, slides.length - 1));
  });

  track?.addEventListener("scroll", () => window.requestAnimationFrame(updateCarousel), { passive: true });
  window.addEventListener("resize", updateCarousel);
  updateCarousel();
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
  const photoInput = joinForm.querySelector("#profile-photo");
  const photoName = joinForm.querySelector("[data-photo-name]");
  const completeButton = joinForm.querySelector("[data-complete-join]");
  const backButton = joinForm.querySelector("[data-back-to-details]");
  const status = joinForm.querySelector("[data-join-status]");

  joinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!joinForm.checkValidity()) {
      joinForm.reportValidity();
      return;
    }

    if (profileStep) {
      if (detailsStep) {
        detailsStep.hidden = true;
      }

      profileStep.hidden = false;
      profileStep.scrollIntoView({ behavior: "smooth", block: "center" });
      photoInput?.focus({ preventScroll: true });
    }
  });

  photoInput?.addEventListener("change", () => {
    const file = photoInput.files?.[0];

    if (photoName) {
      photoName.textContent = file ? file.name : "JPG, PNG or WebP";
    }
  });

  completeButton?.addEventListener("click", async () => {
    if (!joinForm.checkValidity()) {
      joinForm.reportValidity();
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
          profilePhotoType: file?.type,
          profilePhotoSize: file?.size,
        },
      });

      completeButton.textContent = "Request sent";
      joinForm.dataset.joinComplete = "true";
      joinForm.reset();

      if (photoName) {
        photoName.textContent = "JPG, PNG or WebP";
      }

      if (status) {
        status.textContent = "Thank you. Your request has been sent to the EYS team.";
        status.dataset.state = "success";
      }
    } catch (error) {
      completeButton.textContent = "Complete request";
      completeButton.disabled = false;

      if (status) {
        status.textContent = error.message;
        status.dataset.state = "error";
      }
    }
  });

  backButton?.addEventListener("click", () => {
    if (profileStep) {
      profileStep.hidden = true;
    }

    if (detailsStep) {
      detailsStep.hidden = false;
      detailsStep.scrollIntoView({ behavior: "smooth", block: "center" });
      joinForm.querySelector("#join-name")?.focus({ preventScroll: true });
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
  const postsList = adminApp.querySelector("[data-posts-list]");
  const editor = adminApp.querySelector("[data-blog-editor]");
  const editorStatus = adminApp.querySelector("[data-blog-editor-status]");

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
                  </div>
                </article>
              `,
            )
            .join("")
        : '<p class="empty-state">No join requests yet.</p>';
    } catch (error) {
      requestsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
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
      await Promise.all([loadRequests(), loadPosts()]);
    } catch (error) {
      setStatus(loginStatus, error.message, "error");
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
  adminApp.querySelector("[data-refresh-posts]")?.addEventListener("click", loadPosts);
  adminApp.querySelector("[data-clear-editor]")?.addEventListener("click", () => {
    editor?.reset();
    if (editor?.elements.id) editor.elements.id.value = "";
    setStatus(editorStatus, "");
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

  if (token()) {
    eysApi("/api/admin/me", { token: token() })
      .then(async (admin) => {
        setSignedIn(admin);
        await Promise.all([loadRequests(), loadPosts()]);
      })
      .catch(setSignedOut);
  }
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
