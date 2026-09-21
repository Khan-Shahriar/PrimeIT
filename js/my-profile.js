(() => {
  'use strict';

  const state = {
    profile: null,
    originalForm: null,
    editMode: false,
    imagePreviewUrl: null,
    saving: false
  };

  const elements = {
    sidebar: document.querySelector('#member-sidebar'),
    menuToggle: document.querySelector('#member-menu-toggle'),
    form: document.querySelector('#profile-form'),
    content: document.querySelector('#profile-content'),
    loading: document.querySelector('#profile-loading'),
    empty: document.querySelector('#profile-empty'),
    emptyDismiss: document.querySelector('#profile-empty-dismiss'),
    editToggle: document.querySelector('#profile-edit-toggle'),
    actions: document.querySelector('#profile-actions'),
    cancel: document.querySelector('#profile-cancel'),
    save: document.querySelector('#profile-save'),
    status: document.querySelector('#profile-status-region'),
    photoInput: document.querySelector('#profile-photo-input'),
    changePhoto: document.querySelector('#change-photo-btn'),
    photoPreview: document.querySelector('#profile-photo-preview'),
    userAvatar: document.querySelector('#user-avatar-preview'),
    photoHelp: document.querySelector('#profile-photo-help'),
    summaryName: document.querySelector('#profile-summary-name'),
    summaryRole: document.querySelector('#profile-summary-role'),
    summaryDepartment: document.querySelector('#profile-summary-department'),
    summaryId: document.querySelector('#profile-summary-id'),
    summaryJoined: document.querySelector('#profile-summary-joined'),
    topbarName: document.querySelector('#topbar-member-name'),
    sectionState: document.querySelector('#basic-section-state'),
    bioCount: document.querySelector('#bio-count')
  };

  const fields = {
    firstName: document.querySelector('#first-name'),
    lastName: document.querySelector('#last-name'),
    displayName: document.querySelector('#display-name'),
    email: document.querySelector('#work-email'),
    jobTitle: document.querySelector('#job-title'),
    department: document.querySelector('#department'),
    role: document.querySelector('#member-role'),
    employeeId: document.querySelector('#employee-id'),
    joiningDate: document.querySelector('#joining-date'),
    phone: document.querySelector('#phone'),
    bio: document.querySelector('#bio'),
    professionalLink: document.querySelector('#professional-link')
  };

  const editableFields = [
    fields.firstName,
    fields.lastName,
    fields.displayName,
    fields.phone,
    fields.bio,
    fields.professionalLink
  ].filter(Boolean);

  const allFormFields = Object.values(fields).filter(Boolean);

  function setStatus(message, type = 'info') {
    if (!elements.status) return;
    elements.status.textContent = '';
    elements.status.className = `profile-status-region is-${type}`;
    if (!message) {
      elements.status.hidden = true;
      return;
    }
    elements.status.hidden = false;
    elements.status.textContent = message;
  }

  function setLoading(isLoading) {
    if (elements.loading) elements.loading.hidden = !isLoading;
    if (isLoading && elements.content) elements.content.hidden = true;
  }

  function setEmptyState(isEmpty) {
    if (elements.empty) elements.empty.hidden = !isEmpty;
    if (isEmpty && elements.content) elements.content.hidden = true;
  }

  function normalizeProfile(data) {
    if (!data || typeof data !== 'object') return null;

    return {
      firstName: String(data.firstName ?? data.first_name ?? ''),
      lastName: String(data.lastName ?? data.last_name ?? ''),
      displayName: String(data.displayName ?? data.display_name ?? data.full_name ?? ''),
      email: String(data.email ?? ''),
      jobTitle: String(data.jobTitle ?? data.job_title ?? data.position ?? ''),
      department: String(data.department ?? ''),
      role: String(data.role ?? ''),
      employeeId: String(data.employeeId ?? data.employee_id ?? ''),
      joiningDate: String(data.joiningDate ?? data.joining_date ?? data.created_at ?? ''),
      phone: String(data.phone ?? ''),
      bio: String(data.bio ?? ''),
      professionalLink: String(data.professionalLink ?? data.professional_link ?? ''),
      profileImageUrl: typeof (data.profileImageUrl ?? data.profile_image ?? data.profile_photo) === 'string' ? (data.profileImageUrl ?? data.profile_image ?? data.profile_photo) : ''
    };
  }

  function getDisplayName(profile) {
    return profile.displayName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
      'Member';
  }

  function getInitials(profile) {
    const name = getDisplayName(profile);
    const parts = name.split(/\s+/).filter(Boolean);
    return (parts.length > 1
      ? parts.slice(0, 2).map(part => part[0])
      : [name.slice(0, 2)]
    ).join('').toUpperCase() || 'M';
  }

  function setFieldValue(field, value, emptyText = '') {
    if (!field) return;
    field.value = value || '';
    if (!value && field.tagName === 'INPUT') field.placeholder = emptyText;
  }

  function renderProfile(profile) {
    const safeProfile = normalizeProfile(profile);
    if (!safeProfile) {
      setEmptyState(true);
      return;
    }

    state.profile = safeProfile;

    setFieldValue(fields.firstName, safeProfile.firstName, 'Not provided');
    setFieldValue(fields.lastName, safeProfile.lastName, 'Not provided');
    setFieldValue(fields.displayName, safeProfile.displayName, 'Not provided');
    setFieldValue(fields.email, safeProfile.email, 'Not provided');
    setFieldValue(fields.jobTitle, safeProfile.jobTitle, 'Not provided');
    setFieldValue(fields.department, safeProfile.department, 'Not provided');
    setFieldValue(fields.role, safeProfile.role, 'Not provided');
    setFieldValue(fields.employeeId, safeProfile.employeeId, 'Not provided');
    setFieldValue(fields.joiningDate, safeProfile.joiningDate, 'Not provided');
    setFieldValue(fields.phone, safeProfile.phone, 'Not provided');
    setFieldValue(fields.bio, safeProfile.bio);
    setFieldValue(fields.professionalLink, safeProfile.professionalLink, 'No professional link');

    const displayName = getDisplayName(safeProfile);
    const initials = getInitials(safeProfile);

    if (elements.summaryName) elements.summaryName.textContent = displayName;
    if (elements.summaryRole) elements.summaryRole.textContent = safeProfile.role || safeProfile.jobTitle || 'Role unavailable';
    if (elements.summaryDepartment) elements.summaryDepartment.textContent = safeProfile.department || 'Department unavailable';
    if (elements.summaryId) elements.summaryId.textContent = safeProfile.employeeId || 'Not provided';
    if (elements.summaryJoined) elements.summaryJoined.textContent = safeProfile.joiningDate || 'Not provided';
    if (elements.topbarName) elements.topbarName.textContent = displayName;

    renderAvatar(safeProfile.profileImageUrl, initials);
    updateBioCount();
    setEmptyState(false);
  }

  function renderAvatar(imageUrl, initials) {
    const targets = [elements.photoPreview, elements.userAvatar].filter(Boolean);

    targets.forEach(target => {
      target.textContent = '';
      target.classList.remove('has-image');

      if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = 'Profile photo';
        image.addEventListener('error', () => {
          target.textContent = initials;
          target.classList.remove('has-image');
        }, { once: true });
        target.appendChild(image);
        target.classList.add('has-image');
      } else {
        target.textContent = initials;
      }
    });
  }

  function captureFormState() {
    return {
      firstName: fields.firstName?.value || '',
      lastName: fields.lastName?.value || '',
      displayName: fields.displayName?.value || '',
      phone: fields.phone?.value || '',
      bio: fields.bio?.value || '',
      professionalLink: fields.professionalLink?.value || ''
    };
  }

  function restoreFormState(snapshot) {
    if (!snapshot) return;
    Object.entries(snapshot).forEach(([key, value]) => {
      if (fields[key]) fields[key].value = value;
    });
    updateBioCount();
  }

  function setEditMode(enabled) {
    state.editMode = Boolean(enabled);

    editableFields.forEach(field => {
      field.readOnly = !state.editMode;
      field.setAttribute('aria-readonly', String(!state.editMode));
    });

    if (elements.editToggle) {
      elements.editToggle.textContent = state.editMode ? 'Editing Profile' : 'Edit Profile';
      elements.editToggle.setAttribute('aria-pressed', String(state.editMode));
      elements.editToggle.disabled = state.saving;
    }

    if (elements.actions) elements.actions.hidden = !state.editMode;
    if (elements.changePhoto) elements.changePhoto.disabled = state.saving;

    if (elements.sectionState) {
      elements.sectionState.textContent = state.editMode ? 'Editing' : 'View mode';
      elements.sectionState.classList.toggle('is-editing', state.editMode);
    }
  }

  function clearValidation() {
    document.querySelectorAll('.field-error').forEach(error => {
      error.textContent = '';
    });

    allFormFields.forEach(field => {
      field.removeAttribute('aria-invalid');
      field.classList.remove('is-invalid');
    });
  }

  function setFieldError(field, message) {
    if (!field) return;
    field.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');

    const error = document.querySelector(`#${field.id}-error`);
    if (error) error.textContent = message;
  }

  function validateProfile() {
    clearValidation();

    const values = captureFormState();
    let valid = true;

    if (values.firstName.trim().length > 80) {
      setFieldError(fields.firstName, 'First name must be 80 characters or fewer.');
      valid = false;
    }

    if (values.lastName.trim().length > 80) {
      setFieldError(fields.lastName, 'Last name must be 80 characters or fewer.');
      valid = false;
    }

    if (!values.displayName.trim()) {
      setFieldError(fields.displayName, 'Display name is required.');
      valid = false;
    } else if (values.displayName.trim().length > 80) {
      setFieldError(fields.displayName, 'Display name must be 80 characters or fewer.');
      valid = false;
    }

    if (values.phone && !/^[+0-9()\-\s.]{7,30}$/.test(values.phone.trim())) {
      setFieldError(fields.phone, 'Enter a valid phone number.');
      valid = false;
    }

    if (values.bio.length > 500) {
      setFieldError(fields.bio, 'Bio must be 500 characters or fewer.');
      valid = false;
    }

    if (values.professionalLink) {
      try {
        const url = new URL(values.professionalLink);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
      } catch {
        setFieldError(fields.professionalLink, 'Enter a valid http or https URL.');
        valid = false;
      }
    }

    if (!valid) setStatus('Please correct the highlighted fields before continuing.', 'error');
    return valid;
  }

  function updateBioCount() {
    if (!elements.bioCount || !fields.bio) return;
    elements.bioCount.textContent = `${fields.bio.value.length} / 500`;
  }

  function beginEdit() {
    if (!state.profile || state.saving) return;
    state.originalForm = captureFormState();
    clearValidation();
    setStatus('');
    setEditMode(true);
    fields.displayName?.focus();
  }

  function cancelEdit() {
    if (state.saving) return;
    restoreFormState(state.originalForm);
    clearValidation();

    if (state.imagePreviewUrl) {
      URL.revokeObjectURL(state.imagePreviewUrl);
      state.imagePreviewUrl = null;
    }

    renderAvatar(state.profile?.profileImageUrl || '', getInitials(state.profile || {}));
    setEditMode(false);
    setStatus('Unsaved profile changes were discarded.', 'info');
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!state.editMode || state.saving) return;

    if (!validateProfile()) return;

    state.saving = true;
    if (elements.save) {
      elements.save.disabled = true;
      elements.save.textContent = 'Checking...';
    }
    if (elements.cancel) elements.cancel.disabled = true;
    if (elements.editToggle) elements.editToggle.disabled = true;

    try {
      const values = captureFormState();
      const payload = {
        full_name: values.displayName.trim() || [values.firstName.trim(), values.lastName.trim()].filter(Boolean).join(" "),
        phone: values.phone.trim(),
        bio: values.bio.trim()
      };
      const response = await window.PrimeItApi.put("/auth/me", payload);
      const serverProfile = normalizeProfile(response?.user || response);
      renderProfile(serverProfile);
      state.originalForm = captureFormState();
      setEditMode(false);
      setStatus("Profile updated successfully.", "success");
    } catch (error) {
      setStatus(error?.status === 403
        ? "You do not have permission to update this profile."
        : error?.status === 401
          ? "Your session has expired. Please sign in again."
          : (error?.message || "Unable to save profile changes. Your entered values were kept."), "error");
    }

    state.saving = false;
    if (elements.save) {
      elements.save.disabled = false;
      elements.save.textContent = 'Save Changes';
    }
    if (elements.cancel) elements.cancel.disabled = false;
    if (elements.editToggle) elements.editToggle.disabled = false;

    setEditMode(false);
    state.originalForm = captureFormState();

    setStatus(
      'Changes were applied to this page only. No server save was performed because the authenticated profile API is not connected yet.',
      'info'
    );
  }

  function handlePhotoSelection() {
    const file = elements.photoInput?.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxBytes = 5 * 1024 * 1024;

    if (!allowedTypes.has(file.type)) {
      elements.photoInput.value = '';
      setStatus('Choose a JPG, PNG, or WebP image.', 'error');
      return;
    }

    if (file.size > maxBytes) {
      elements.photoInput.value = '';
      setStatus('Profile images must be 5 MB or smaller.', 'error');
      return;
    }

    if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
    state.imagePreviewUrl = URL.createObjectURL(file);

    const initials = getInitials(state.profile || {});
    renderAvatar(state.imagePreviewUrl, initials);

    setStatus('Image preview updated. The image has not been uploaded or stored.', 'info');
  }

  function setupMobileNavigation() {
    if (!elements.menuToggle || !elements.sidebar) return;

    elements.menuToggle.addEventListener('click', () => {
      const isOpen = elements.sidebar.classList.toggle('open');
      elements.menuToggle.setAttribute('aria-expanded', String(isOpen));
      elements.menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    elements.sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        elements.sidebar.classList.remove('open');
        elements.menuToggle.setAttribute('aria-expanded', 'false');
        elements.menuToggle.setAttribute('aria-label', 'Open navigation menu');
      });
    });
  }

  function setupFormEvents() {
    elements.form?.addEventListener('submit', handleSave);
    elements.editToggle?.addEventListener('click', () => {
      if (state.editMode) {
        setStatus('Finish or cancel the current profile edit before starting another action.', 'info');
        return;
      }
      beginEdit();
    });
    elements.cancel?.addEventListener('click', cancelEdit);
    fields.bio?.addEventListener('input', updateBioCount);
    elements.changePhoto?.addEventListener('click', () => elements.photoInput?.click());
    elements.photoInput?.addEventListener('change', handlePhotoSelection);

    elements.emptyDismiss?.addEventListener('click', () => {
      setEmptyState(false);
      if (elements.content) elements.content.hidden = false;
      setStatus('No authenticated profile data has been loaded. Fields remain blank until the profile service supplies them.', 'info');
    });
  }

  function setupBeforeUnload() {
    window.addEventListener('beforeunload', event => {
      if (!state.editMode || state.saving) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  async function initializeProfilePage() {
    setLoading(true);
    setEmptyState(false);
    setupMobileNavigation();
    setupFormEvents();
    setupBeforeUnload();

    try {
      const profile = await window.PrimeItApi.getCurrentUser();
      const normalized = normalizeProfile(profile);
      if (!normalized) {
        setEmptyState(true);
        setStatus("No authenticated profile data was returned.", "error");
        return;
      }
      renderProfile(normalized);
      state.originalForm = captureFormState();
      setStatus("");
    } catch (error) {
      if (error?.status === 401) {
        window.location.replace("/member/member-login.html");
        return;
      }
      setEmptyState(true);
      setStatus(error?.message || "Unable to load your profile. Please retry.", "error");
    } finally {
      setLoading(false);
    }
  }

  initializeProfilePage();
})();