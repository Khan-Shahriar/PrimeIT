document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const API = Object.freeze({
    profile: "/api/v1/auth/me",
    profilePhoto: "/api/v1/auth/me/photo",
    password: "/api/v1/auth/me/password",
    logout: "/api/v1/auth/logout"
  });

  const state = {
    profile: null,
    originalForm: null,
    objectUrl: null,
    saving: false,
    changingPassword: false,
    uploadingPhoto: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const elements = {
    sidebar: $("#admin-sidebar"),
    sidebarToggle: $("[data-sidebar-toggle]"),
    sidebarBackdrop: $("[data-sidebar-close]"),
    profileForm: $("#profile-form"),
    profileFieldset: $("[data-profile-fieldset]"),
    editProfile: $("[data-edit-profile]"),
    saveProfile: $("[data-save-profile]"),
    cancelButtons: $$("[data-cancel-profile]"),
    status: $("[data-profile-status]"),
    globalStatus: $("[data-global-status]"),
    profilePhotoInput: $("[data-profile-photo]"),
    changePhotoButton: $("[data-change-photo]"),
    selectPhotoButton: $("[data-select-photo]"),
    removePhotoButton: $("[data-remove-photo]"),
    photoPreview: $("[data-photo-preview]"),
    photoPreviewInitials: $("[data-photo-preview-initials]"),
    photoFileName: $("[data-photo-file-name]"),
    passwordForm: $("#password-form"),
    changePasswordButton: $("[data-change-password]"),
    logoutButtons: $$("[data-logout]")
  };

  const textTargets = {
    adminName: $$("[data-admin-name]"),
    adminRole: $$("[data-admin-role]"),
    adminInitials: $$("[data-admin-initials]"),
    profileName: $$("[data-profile-name]"),
    profileRole: $$("[data-profile-role]"),
    profileEmail: $$("[data-profile-email]"),
    department: $$("[data-profile-department]"),
    jobTitle: $$("[data-profile-job-title]"),
    employeeId: $$("[data-profile-employee-id]"),
    statusBadge: $$("[data-profile-status-badge]"),
    joiningDate: $$("[data-profile-joining-date]"),
    lastLogin: $$("[data-profile-last-login]"),
    createdAt: $$("[data-profile-created-at]"),
    updatedAt: $$("[data-profile-updated-at]"),
    workEmail: $$("[data-profile-work-email]"),
    roleReadonly: $$("[data-profile-role-readonly]"),
    departmentReadonly: $$("[data-profile-department-readonly]"),
    jobTitleReadonly: $$("[data-profile-job-title-readonly]")
  };

  function setText(nodes, value, fallback = "—") {
    const safeValue = value === null || value === undefined || String(value).trim() === "" ? fallback : String(value);
    nodes.forEach((node) => { node.textContent = safeValue; });
  }

  function getInitials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "AD";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words.at(-1)[0]).toUpperCase();
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function setStatus(message = "", type = "info") {
    if (elements.status) {
      elements.status.hidden = !message;
      elements.status.textContent = message;
      elements.status.dataset.type = type;
    }
    if (elements.globalStatus) elements.globalStatus.textContent = message;
  }

  function clearFieldErrors() {
    $$("[data-field-error], [data-password-error]").forEach((node) => { node.textContent = ""; });
    $$("[aria-invalid='true']").forEach((input) => input.removeAttribute("aria-invalid"));
  }

  function setFieldError(name, message) {
    const target = $("[data-field-error=\"" + name + "\"]") || $("[data-password-error=\"" + name + "\"]");
    if (target) target.textContent = message;
    const input = $("[name=\"" + name + "\"]");
    if (input) input.setAttribute("aria-invalid", "true");
  }

  function normalizeProfile(payload) {
    const source = payload?.user || payload?.profile || payload || {};
    return {
      id: source.id ?? null,
      employeeId: source.employeeId ?? source.employee_id ?? null,
      firstName: source.firstName ?? source.first_name ?? "",
      lastName: source.lastName ?? source.last_name ?? "",
      displayName: source.displayName ?? source.display_name ?? source.full_name ?? "",
      email: source.email ?? "",
      phone: source.phone ?? "",
      profileImage: source.profileImage ?? source.profile_photo ?? source.profile_image ?? "",
      jobTitle: source.jobTitle ?? source.job_title ?? "",
      department: source.department ?? "",
      role: source.role ?? "",
      bio: source.bio ?? "",
      socialLinks: source.socialLinks ?? source.social_links ?? {},
      joiningDate: source.joiningDate ?? source.joining_date ?? null,
      accountStatus: source.accountStatus ?? source.account_status ?? "",
      createdAt: source.createdAt ?? source.created_at ?? null,
      updatedAt: source.updatedAt ?? source.updated_at ?? null,
      lastLoginAt: source.lastLoginAt ?? source.last_login_at ?? null
    };
  }

  async function readResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    const text = await response.text();
    return text ? { message: text } : {};
  }

  async function apiRequest(url, options = {}) {
    if (!window.PrimeItApi) throw new Error("API client is unavailable.");
    let body = options.body;
    if (typeof body === "string" && url === API.profile) {
      try {
        const source = JSON.parse(body);
        body = {
          full_name: source.displayName || [source.firstName, source.lastName].filter(Boolean).join(" "),
          phone: source.phone || "",
          bio: source.bio || ""
        };
      } catch {}
    }
    return window.PrimeItApi.request(url, { ...options, body });
  }

  function renderAvatar(container, imageUrl, initials) {
    if (!container) return;

    container.textContent = "";

    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "Administrator profile photo";
      image.addEventListener("error", () => {
        container.replaceChildren(document.createTextNode(initials));
        container.removeAttribute("data-image-loaded");
      }, { once: true });
      container.append(image);
      container.dataset.imageLoaded = "true";
      return;
    }

    container.textContent = initials;
    container.removeAttribute("data-image-loaded");
  }

  function getSocialLink(profile, key) {
    if (!profile?.socialLinks || typeof profile.socialLinks !== "object") return "";
    return profile.socialLinks[key] || "";
  }

  function populateForm(profile) {
    if (!elements.profileForm) return;

    const values = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      phone: profile.phone,
      bio: profile.bio,
      linkedin: getSocialLink(profile, "linkedin"),
      website: getSocialLink(profile, "website")
    };

    Object.entries(values).forEach(([name, value]) => {
      const input = elements.profileForm.elements.namedItem(name);
      if (input) input.value = value || "";
    });

    state.originalForm = { ...values };
  }

  function renderProfile(profile) {
    state.profile = profile;
    const initials = getInitials(profile.displayName || (profile.firstName + " " + profile.lastName));

    setText(textTargets.adminName, profile.displayName, "Administrator");
    setText(textTargets.adminRole, profile.role, "Account context");
    setText(textTargets.profileName, profile.displayName, "Administrator");
    setText(textTargets.profileRole, profile.role, "Account role unavailable");
    setText(textTargets.profileEmail, profile.email, "Email unavailable");
    setText(textTargets.department, profile.department);
    setText(textTargets.jobTitle, profile.jobTitle);
    setText(textTargets.employeeId, profile.employeeId);
    setText(textTargets.statusBadge, profile.accountStatus);
    setText(textTargets.joiningDate, formatDate(profile.joiningDate));
    setText(textTargets.lastLogin, formatDateTime(profile.lastLoginAt));
    setText(textTargets.createdAt, formatDateTime(profile.createdAt));
    setText(textTargets.updatedAt, formatDateTime(profile.updatedAt));
    setText(textTargets.workEmail, profile.email);
    setText(textTargets.roleReadonly, profile.role);
    setText(textTargets.departmentReadonly, profile.department);
    setText(textTargets.jobTitleReadonly, profile.jobTitle);
    setText(textTargets.adminInitials, initials, "AD");

    renderAvatar($("[data-profile-avatar]"), profile.profileImage, initials);
    renderAvatar(elements.photoPreview, profile.profileImage, initials);

    if (elements.photoPreviewInitials) elements.photoPreviewInitials.hidden = Boolean(profile.profileImage);

    if (profile.accountStatus) {
      textTargets.statusBadge.forEach((node) => {
        node.dataset.status = String(profile.accountStatus).toLowerCase();
      });
    }

    populateForm(profile);
  }

  function collectFormData() {
    const formData = new FormData(elements.profileForm);
    return {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      displayName: String(formData.get("displayName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      bio: String(formData.get("bio") || "").trim(),
      linkedin: String(formData.get("linkedin") || "").trim(),
      website: String(formData.get("website") || "").trim()
    };
  }

  function validateProfile(data) {
    clearFieldErrors();
    let valid = true;

    if (!data.displayName) {
      setFieldError("displayName", "Display name is required.");
      valid = false;
    } else if (data.displayName.length > 100) {
      setFieldError("displayName", "Display name must be 100 characters or fewer.");
      valid = false;
    }

    if (data.firstName.length > 80) {
      setFieldError("firstName", "First name must be 80 characters or fewer.");
      valid = false;
    }

    if (data.lastName.length > 80) {
      setFieldError("lastName", "Last name must be 80 characters or fewer.");
      valid = false;
    }

    if (data.phone && !/^[+()0-9.\-\s]{7,30}$/.test(data.phone)) {
      setFieldError("phone", "Enter a valid phone number.");
      valid = false;
    }

    if (data.bio.length > 1000) {
      setFieldError("bio", "Bio must be 1,000 characters or fewer.");
      valid = false;
    }

    for (const [name, value] of [["linkedin", data.linkedin], ["website", data.website]]) {
      if (!value) continue;
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        setFieldError(name, "Enter a valid HTTP or HTTPS URL.");
        valid = false;
      }
    }

    return valid;
  }

  function setEditMode(enabled) {
    if (!elements.profileFieldset) return;

    elements.profileFieldset.disabled = !enabled;
    if (elements.editProfile) elements.editProfile.hidden = enabled;
    elements.cancelButtons.forEach((button) => { button.hidden = !enabled; });
    if (elements.saveProfile) elements.saveProfile.hidden = !enabled;

    if (enabled) $("[name=\"displayName\"]")?.focus();
  }

  function restoreOriginalForm() {
    if (!state.originalForm || !elements.profileForm) return;

    Object.entries(state.originalForm).forEach(([name, value]) => {
      const input = elements.profileForm.elements.namedItem(name);
      if (input) input.value = value || "";
    });

    clearFieldErrors();
    setStatus("");
  }

  async function loadAdminProfile() {
    setStatus("Loading administrator profile…", "loading");

    try {
      const data = await apiRequest(API.profile);
      renderProfile(normalizeProfile(data));
      setStatus("");
    } catch (error) {
      console.error("Admin profile load error:", error);
      if (error.status === 401) {
        setStatus("Your session has expired. Please sign in again.", "error");
        return;
      }
      setStatus("Profile information is currently unavailable. Please try again later.", "error");
    }
  }

  async function saveAdminProfile(event) {
    event.preventDefault();
    if (state.saving) return;

    const data = collectFormData();
    if (!validateProfile(data)) {
      setStatus("Please correct the highlighted fields.", "error");
      return;
    }

    state.saving = true;
    setStatus("Saving profile changes…", "loading");

    const button = elements.saveProfile;
    const originalText = button?.textContent || "Save changes";
    if (button) {
      button.disabled = true;
      button.textContent = "Saving…";
    }

    try {
      const response = await apiRequest(API.profile, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      renderProfile(normalizeProfile(response));
      setEditMode(false);
      setStatus("Profile updated successfully.", "success");
    } catch (error) {
      console.error("Admin profile save error:", error);

      if (error.status === 400 && error.payload?.errors && typeof error.payload.errors === "object") {
        Object.entries(error.payload.errors).forEach(([name, message]) => setFieldError(name, String(message)));
        setStatus("Please correct the highlighted fields.", "error");
      } else if (error.status === 401) {
        setStatus("Your session has expired. Please sign in again.", "error");
      } else {
        setStatus("Unable to save your changes. Your entered values have been kept.", "error");
      }
    } finally {
      state.saving = false;
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function validatePasswordForm() {
    const form = elements.passwordForm;
    const current = form?.elements.namedItem("currentPassword")?.value || "";
    const next = form?.elements.namedItem("newPassword")?.value || "";
    const confirm = form?.elements.namedItem("confirmPassword")?.value || "";

    ["currentPassword", "newPassword", "confirmPassword"].forEach((name) => {
      const error = $("[data-password-error=\"" + name + "\"]");
      const input = form?.elements.namedItem(name);
      if (error) error.textContent = "";
      input?.removeAttribute("aria-invalid");
    });

    let valid = true;

    if (!current) {
      setFieldError("currentPassword", "Enter your current password.");
      valid = false;
    }

    if (next.length < 8) {
      setFieldError("newPassword", "New password must be at least 8 characters.");
      valid = false;
    }

    if (next !== confirm) {
      setFieldError("confirmPassword", "Passwords do not match.");
      valid = false;
    }

    if (current && next && current === next) {
      setFieldError("newPassword", "New password must be different from your current password.");
      valid = false;
    }

    return { valid, current, next };
  }

  async function changePassword(event) {
    event.preventDefault();
    if (state.changingPassword) return;

    const { valid, current, next } = validatePasswordForm();
    if (!valid) {
      setStatus("Please correct the password fields.", "error");
      return;
    }

    state.changingPassword = true;
    setStatus("Changing password…", "loading");

    const button = elements.changePasswordButton;
    const originalText = button?.textContent || "Change password";
    if (button) {
      button.disabled = true;
      button.textContent = "Changing…";
    }

    try {
      await apiRequest(API.password, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: next })
      });

      elements.passwordForm.reset();
      setStatus("Password changed successfully.", "success");
    } catch (error) {
      console.error("Admin password change error:", error);
      if (error.status === 401) {
        setStatus("Your session has expired or the current password was not accepted.", "error");
      } else {
        setStatus("Unable to change the password. No password data has been stored by this page.", "error");
      }
    } finally {
      state.changingPassword = false;
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function validatePhoto(file) {
    if (!file) return "Select an image first.";
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      return "Only JPG, PNG, and WebP images are supported.";
    }
    if (file.size > 2 * 1024 * 1024) {
      return "The selected image must be 2 MB or smaller.";
    }
    return "";
  }

  function resetPhotoSelection() {
    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }

    if (elements.profilePhotoInput) elements.profilePhotoInput.value = "";
    if (elements.photoFileName) elements.photoFileName.textContent = "No new image selected";
    if (elements.removePhotoButton) elements.removePhotoButton.hidden = true;

    if (state.profile) {
      renderAvatar(elements.photoPreview, state.profile.profileImage, getInitials(state.profile.displayName));
      if (elements.photoPreviewInitials) elements.photoPreviewInitials.hidden = Boolean(state.profile.profileImage);
    }
  }

  async function uploadPhoto(file) {
    if (state.uploadingPhoto) return;

    state.uploadingPhoto = true;
    setStatus("Uploading profile photo…", "loading");

    try {
      const formData = new FormData();
      formData.append("profile_photo", file);

      const data = await apiRequest(API.profilePhoto, { method: "POST", body: formData });
      renderProfile(normalizeProfile(data?.user || data?.profile || data));
      resetPhotoSelection();
      setStatus("Profile photo updated successfully.", "success");
    } catch (error) {
      console.error("Admin profile photo error:", error);
      setStatus("Unable to update the profile photo. The selected image was not treated as permanently uploaded.", "error");
    } finally {
      state.uploadingPhoto = false;
    }
  }

  async function handlePhotoSelection(event) {
    const file = event.target.files?.[0];
    const validationError = validatePhoto(file);

    if (validationError) {
      setStatus(validationError, "error");
      event.target.value = "";
      return;
    }

    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);
    renderAvatar(elements.photoPreview, state.objectUrl, getInitials(state.profile?.displayName));
    if (elements.photoPreviewInitials) elements.photoPreviewInitials.hidden = true;
    if (elements.photoFileName) elements.photoFileName.textContent = file.name;
    if (elements.removePhotoButton) elements.removePhotoButton.hidden = false;
    setStatus("Image preview ready. It has not been permanently uploaded yet.", "info");

    await uploadPhoto(file);
  }

  async function logout(event) {
    event.preventDefault();

    if (state.saving || state.changingPassword || state.uploadingPhoto) {
      setStatus("Please wait for the current account operation to finish.", "info");
      return;
    }

    try {
      await apiRequest(API.logout, { method: "POST" });
      window.location.href = "admin-login.html";
    } catch (error) {
      console.error("Admin logout error:", error);
      setStatus("Unable to sign out right now. Please try again.", "error");
    }
  }

  function closeSidebar() {
    elements.sidebar?.classList.remove("open");
    elements.sidebarToggle?.setAttribute("aria-expanded", "false");
    if (elements.sidebarBackdrop) elements.sidebarBackdrop.hidden = true;
  }

  function setupNavigation() {
    elements.sidebarToggle?.addEventListener("click", () => {
      const open = elements.sidebar?.classList.toggle("open");
      elements.sidebarToggle?.setAttribute("aria-expanded", String(Boolean(open)));
      if (elements.sidebarBackdrop) elements.sidebarBackdrop.hidden = !open;
    });

    elements.sidebarBackdrop?.addEventListener("click", closeSidebar);
    $$(".sidebar .nav-link").forEach((link) => link.addEventListener("click", closeSidebar));
  }

  elements.editProfile?.addEventListener("click", () => {
    clearFieldErrors();
    setEditMode(true);
    setStatus("");
  });

  elements.cancelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      restoreOriginalForm();
      setEditMode(false);
    });
  });

  elements.profileForm?.addEventListener("submit", saveAdminProfile);
  elements.passwordForm?.addEventListener("submit", changePassword);
  elements.selectPhotoButton?.addEventListener("click", () => elements.profilePhotoInput?.click());
  elements.changePhotoButton?.addEventListener("click", () => elements.profilePhotoInput?.click());
  elements.removePhotoButton?.addEventListener("click", () => {
    resetPhotoSelection();
    setStatus("New image selection removed.", "info");
  });
  elements.profilePhotoInput?.addEventListener("change", handlePhotoSelection);
  elements.logoutButtons.forEach((button) => button.addEventListener("click", logout));

  setupNavigation();
  setEditMode(false);
  loadAdminProfile();

  window.addEventListener("beforeunload", () => {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  });
});