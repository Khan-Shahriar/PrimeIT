/* PrimeIt — Admin Member Management
 * Section 17 frontend implementation.
 * Backend/authentication/authorization remain future integration boundaries.
 */

(function () {
  "use strict";

  const state = {
    members: [],
    filteredMembers: [],
    selectedMember: null,
    editingMember: null,
    pendingAction: null,
    search: "",
    department: "",
    role: "",
    status: "",
    page: 1,
    pageSize: 10,
    loading: false,
    dataAvailable: false,
    lastFocusedElement: null
  };

  const elements = {
    sidebar: document.getElementById("admin-sidebar"),
    sidebarToggle: document.querySelector("[data-sidebar-toggle]"),
    sidebarClose: document.querySelector("[data-sidebar-close]"),
    pageStatus: document.getElementById("page-status"),
    addMemberButton: document.getElementById("add-member-btn"),
    search: document.getElementById("member-search"),
    clearSearch: document.getElementById("clear-search"),
    department: document.getElementById("department-filter"),
    role: document.getElementById("role-filter"),
    status: document.getElementById("status-filter"),
    resetFilters: document.getElementById("reset-filters"),
    tableBody: document.getElementById("member-table-body"),
    tableShell: document.getElementById("member-table-shell"),
    loading: document.getElementById("list-loading"),
    listState: document.getElementById("list-state"),
    listStateTitle: document.getElementById("list-state-title"),
    listStateMessage: document.getElementById("list-state-message"),
    retry: document.getElementById("retry-members"),
    resultCount: document.getElementById("result-count"),
    pagination: document.getElementById("pagination"),
    paginationSummary: document.getElementById("pagination-summary"),
    previousPage: document.getElementById("previous-page"),
    nextPage: document.getElementById("next-page"),
    pageIndicator: document.getElementById("page-indicator"),
    detailsDialog: document.getElementById("member-details-dialog"),
    detailsContent: document.getElementById("member-details-content"),
    detailsEdit: document.getElementById("details-edit-btn"),
    formDialog: document.getElementById("member-form-dialog"),
    form: document.getElementById("member-form"),
    formTitle: document.getElementById("member-form-title"),
    formMessage: document.getElementById("member-form-message"),
    formSubmit: document.getElementById("member-form-submit"),
    actionDialog: document.getElementById("member-action-dialog"),
    actionMemberName: document.getElementById("action-member-name"),
    actionMessage: document.getElementById("action-message"),
    confirmAction: document.getElementById("confirm-member-action"),
    backdrop: document.getElementById("member-modal-backdrop")
  };

  const fieldIds = [
    "first-name",
    "last-name",
    "display-name",
    "work-email",
    "member-phone",
    "member-department",
    "member-job-title",
    "member-role",
    "member-status",
    "joining-date",
    "member-location",
    "member-bio"
  ];

  const apiAdapter = {
    async listMembers() {
      return window.PrimeItApi.get("/members");
    },
    async createMember(payload) {
      // The current backend requires a password for account creation, while
      // this existing form intentionally does not collect one. Do not invent
      // credentials or generate a hidden password on the client.
      const error = new Error("Member creation requires the backend account-creation contract to supply a password. No account was created.");
      error.status = 422;
      throw error;
    },
    async updateMember(id, payload) {
      return window.PrimeItApi.put("/members/" + encodeURIComponent(id), payload);
    },
    async accountAction(id, action) {
      if (action === "activate") {
        return window.PrimeItApi.put("/members/" + encodeURIComponent(id), { status: "active" });
      }
      if (action === "deactivate") {
        return window.PrimeItApi.put("/members/" + encodeURIComponent(id), { status: "inactive" });
      }
      throw new Error("This account action is not supported by the current backend API.");
    }
  };

  function setStatus(message) {
    if (elements.pageStatus) {
      elements.pageStatus.textContent = message;
    }
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function getInitials(member) {
    const name = member && (member.display_name || member.full_name || "");
    if (!name.trim()) return "M";
    return name.trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join("");
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function normalizeStatus(value) {
    const status = String(value || "").toLowerCase();
    if (status === "active") return "active";
    if (status === "suspended") return "suspended";
    if (status === "inactive") return "inactive";
    return status || "inactive";
  }

  function formatRole(value) {
    if (!value) return "—";
    return String(value).replace(/[_-]+/g, " ").replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function normalizeMember(member) {
    if (!member || typeof member !== "object") return null;

    return {
      id: member.id ?? member.member_id ?? "",
      member_id: member.member_id ?? member.id ?? "",
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      full_name: member.full_name || [member.first_name, member.last_name].filter(Boolean).join(" "),
      display_name: member.display_name || member.full_name || [member.first_name, member.last_name].filter(Boolean).join(" "),
      profile_image: member.profile_image || member.avatar_url || "",
      email: member.email || member.work_email || "",
      phone: member.phone || "",
      department: member.department || "",
      job_title: member.job_title || member.position || "",
      role: member.role || "",
      status: normalizeStatus(member.status),
      joining_date: member.joining_date || member.joined_at || member.created_at || "",
      location: member.location || "",
      bio: member.bio || "",
      social_links: Array.isArray(member.social_links) ? member.social_links : []
    };
  }

  function getMemberSearchText(member) {
    return [
      member.display_name,
      member.full_name,
      member.email,
      member.member_id,
      member.id,
      member.job_title
    ].join(" ").toLowerCase();
  }

  function setStat(name, value, meta) {
    const valueElement = document.querySelector('[data-stat="' + name + '"]');
    const metaElement = document.querySelector('[data-stat-meta="' + name + '"]');
    if (valueElement) valueElement.textContent = value;
    if (metaElement) metaElement.textContent = meta;
  }

  function renderUnavailableStats() {
    setStat("total", "—", "Data unavailable");
    setStat("active", "—", "Data unavailable");
    setStat("inactive", "—", "Data unavailable");
    setStat("pending", "—", "Data unavailable");
  }

  function renderStats() {
    const members = state.members;
    if (!state.dataAvailable) {
      renderUnavailableStats();
      return;
    }

    const active = members.filter(function (member) { return member.status === "active"; }).length;
    const inactive = members.filter(function (member) { return member.status === "inactive"; }).length;
    const pending = members.filter(function (member) {
      return ["invited", "pending"].includes(member.status);
    }).length;

    setStat("total", String(members.length), "Current member records");
    setStat("active", String(active), "Active member records");
    setStat("inactive", String(inactive), "Inactive member records");
    setStat("pending", String(pending), "Invited or pending records");
  }

  function populateFilterOptions() {
    const departments = Array.from(new Set(state.members.map(function (member) {
      return member.department;
    }).filter(Boolean))).sort();

    const roles = Array.from(new Set(state.members.map(function (member) {
      return member.role;
    }).filter(Boolean))).sort();

    const currentDepartment = state.department;
    const currentRole = state.role;

    elements.department.innerHTML = '<option value="">All Departments</option>' +
      departments.map(function (department) {
        return '<option value="' + escapeHtml(department) + '">' + escapeHtml(department) + '</option>';
      }).join("");

    elements.role.innerHTML = '<option value="">All Roles</option>' +
      roles.map(function (role) {
        return '<option value="' + escapeHtml(role) + '">' + escapeHtml(formatRole(role)) + '</option>';
      }).join("");

    elements.department.value = departments.includes(currentDepartment) ? currentDepartment : "";
    elements.role.value = roles.includes(currentRole) ? currentRole : "";
  }

  function applyFilters() {
    const search = state.search.trim().toLowerCase();

    state.filteredMembers = state.members.filter(function (member) {
      const matchesSearch = !search || getMemberSearchText(member).includes(search);
      const matchesDepartment = !state.department || member.department === state.department;
      const matchesRole = !state.role || member.role === state.role;
      const matchesStatus = !state.status || member.status === state.status;
      return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
    });

    state.page = 1;
    renderList();
  }

  function renderList() {
    if (!state.dataAvailable) {
      elements.tableBody.innerHTML = "";
      elements.listState.hidden = false;
      elements.listState.dataset.state = "unavailable";
      elements.loading.hidden = true;
      elements.pagination.hidden = true;
      elements.resultCount.textContent = "No member data";
      return;
    }

    elements.listState.hidden = state.filteredMembers.length !== 0;

    if (!state.filteredMembers.length) {
      elements.listState.dataset.state = "empty";
      elements.listStateTitle.textContent = state.members.length ? "No members match these filters" : "No members found";
      elements.listStateMessage.textContent = state.members.length
        ? "Try clearing the search or changing the selected filters."
        : "There are currently no member records available from the connected data source.";
      elements.retry.hidden = true;
      elements.tableBody.innerHTML = "";
      elements.pagination.hidden = true;
      elements.resultCount.textContent = "0 results";
      return;
    }

    elements.retry.hidden = true;

    const totalPages = Math.max(1, Math.ceil(state.filteredMembers.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.pageSize;
    const pageMembers = state.filteredMembers.slice(start, start + state.pageSize);

    elements.tableBody.innerHTML = pageMembers.map(renderMemberRow).join("");

    elements.resultCount.textContent = state.filteredMembers.length + " result" + (state.filteredMembers.length === 1 ? "" : "s");
    elements.pagination.hidden = totalPages <= 1;
    elements.paginationSummary.textContent = "Showing " + (start + 1) + "–" + Math.min(start + state.pageSize, state.filteredMembers.length) + " of " + state.filteredMembers.length;
    elements.pageIndicator.textContent = "Page " + state.page + " of " + totalPages;
    elements.previousPage.disabled = state.page <= 1;
    elements.nextPage.disabled = state.page >= totalPages;
  }

  function renderMemberRow(member) {
    const status = normalizeStatus(member.status);
    const statusLabel = formatRole(status);
    const avatar = member.profile_image
      ? '<img src="' + escapeHtml(member.profile_image) + '" alt="">'
      : escapeHtml(getInitials(member));

    return '<tr data-member-id="' + escapeHtml(member.id) + '">' +
      '<td><div class="member-cell">' +
        '<span class="member-avatar">' + avatar + '</span>' +
        '<span><strong class="member-name">' + escapeHtml(member.display_name || member.full_name || "Unnamed member") + '</strong>' +
        '<span class="member-email">' + escapeHtml(member.email || "No work email") + '</span></span>' +
      '</div></td>' +
      '<td><span class="member-id">' + escapeHtml(member.member_id || "—") + '</span></td>' +
      '<td>' + escapeHtml(member.department || "—") + '</td>' +
      '<td>' + escapeHtml(member.job_title || "—") + '</td>' +
      '<td><span class="role-badge">' + escapeHtml(formatRole(member.role)) + '</span></td>' +
      '<td><span class="status-badge status-' + escapeHtml(status) + '">' + escapeHtml(statusLabel) + '</span></td>' +
      '<td>' + escapeHtml(formatDate(member.joining_date)) + '</td>' +
      '<td><div class="action-group">' +
        '<button class="action-button" type="button" data-member-action="view" data-member-id="' + escapeHtml(member.id) + '">View</button>' +
        '<button class="action-button" type="button" data-member-action="edit" data-member-id="' + escapeHtml(member.id) + '">Edit</button>' +
        '<button class="action-button danger" type="button" data-member-action="' + (status === "active" ? "deactivate" : "activate") + '" data-member-id="' + escapeHtml(member.id) + '">' + (status === "active" ? "Deactivate" : "Activate") + '</button>' +
      '</div></td>' +
    '</tr>';
  }

  function showListLoading(isLoading) {
    state.loading = isLoading;
    elements.loading.hidden = !isLoading;
    if (isLoading) {
      elements.listState.hidden = true;
      elements.tableBody.innerHTML = "";
      elements.pagination.hidden = true;
      elements.resultCount.textContent = "Loading…";
    }
  }

  async function loadMembers() {
    showListLoading(true);
    setStatus("Loading member data…");

    try {
      const response = await apiAdapter.listMembers();
      const records = Array.isArray(response) ? response : (response && Array.isArray(response.members) ? response.members : []);
      state.members = records.map(normalizeMember).filter(Boolean);
      state.dataAvailable = true;
      populateFilterOptions();
      renderStats();
      applyFilters();
      setStatus("Member data loaded.");
    } catch (error) {
      state.dataAvailable = false;
      state.members = [];
      state.filteredMembers = [];
      renderUnavailableStats();
      elements.tableBody.innerHTML = "";
      elements.listState.hidden = false;
      elements.listState.dataset.state = "unavailable";
      elements.listStateTitle.textContent = "Member data unavailable";
      elements.listStateMessage.textContent = error?.status === 403
        ? "You do not have permission to manage members."
        : error?.status === 401
          ? "Your session is no longer valid. Please sign in again."
          : (error?.message || "Unable to load member data. No production records are being fabricated in the frontend.");
      elements.retry.hidden = false;
      elements.resultCount.textContent = "No member data";
      elements.pagination.hidden = true;
      setStatus(error?.status === 403
        ? "Member management access denied."
        : "Member data could not be loaded. Please retry.");
    } finally {
      showListLoading(false);
    }
  }

  function getMemberById(id) {
    return state.members.find(function (member) {
      return String(member.id) === String(id) || String(member.member_id) === String(id);
    }) || null;
  }

  function openDialog(dialog) {
    if (!dialog) return;
    state.lastFocusedElement = document.activeElement;
    elements.backdrop.hidden = false;
    dialog.hidden = false;
    document.body.classList.add("dialog-open");

    const focusable = getFocusable(dialog);
    if (focusable.length) focusable[0].focus();
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    dialog.hidden = true;

    const otherOpen = [elements.detailsDialog, elements.formDialog, elements.actionDialog].some(function (item) {
      return item && !item.hidden;
    });

    if (!otherOpen) {
      elements.backdrop.hidden = true;
      document.body.classList.remove("dialog-open");
      if (state.lastFocusedElement && document.contains(state.lastFocusedElement)) {
        state.lastFocusedElement.focus();
      }
      state.lastFocusedElement = null;
    }
  }

  function getFocusable(container) {
    return Array.from(container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ));
  }

  function trapFocus(event, dialog) {
    if (event.key !== "Tab" || !dialog || dialog.hidden) return;

    const focusable = getFocusable(dialog);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openDetails(member) {
    if (!member) return;
    state.selectedMember = member;

    const avatar = member.profile_image
      ? '<img src="' + escapeHtml(member.profile_image) + '" alt="">'
      : escapeHtml(getInitials(member));

    elements.detailsContent.innerHTML =
      '<div class="details-hero">' +
        '<div class="details-avatar">' + avatar + '</div>' +
        '<div><h3 class="details-name">' + escapeHtml(member.display_name || member.full_name || "Unnamed member") + '</h3>' +
        '<p class="details-subtitle">' + escapeHtml(member.job_title || "PrimeIt member") + '</p></div>' +
      '</div>' +
      '<div class="details-grid">' +
        detailItem("Member ID", member.member_id || member.id || "—") +
        detailItem("Status", formatRole(member.status)) +
        detailItem("Department", member.department || "—") +
        detailItem("Role", formatRole(member.role)) +
        detailItem("Job Title", member.job_title || "—") +
        detailItem("Joining Date", formatDate(member.joining_date)) +
        detailItem("Work Email", member.email || "—") +
        detailItem("Phone", member.phone || "—") +
        detailItem("Location", member.location || "—") +
        '<div class="detail-item detail-bio"><span class="detail-label">Short Bio</span><span class="detail-value">' + escapeHtml(member.bio || "—") + '</span></div>' +
      '</div>';

    elements.detailsEdit.disabled = !member.id;
    openDialog(elements.detailsDialog);
  }

  function detailItem(label, value) {
    return '<div class="detail-item"><span class="detail-label">' + escapeHtml(label) + '</span><span class="detail-value">' + escapeHtml(value) + '</span></div>';
  }

  function resetForm() {
    elements.form.reset();
    document.getElementById("member-record-id").value = "";
    clearValidation();
    elements.formMessage.hidden = true;
    elements.formMessage.textContent = "";
  }

  function populateRoleSelect(selectedRole) {
    const roles = Array.from(new Set(state.members.map(function (member) {
      return member.role;
    }).filter(Boolean)));

    const select = document.getElementById("member-role");
    select.innerHTML = '<option value="">Select role</option>' +
      roles.map(function (role) {
        return '<option value="' + escapeHtml(role) + '">' + escapeHtml(formatRole(role)) + '</option>';
      }).join("");

    if (selectedRole && !roles.includes(selectedRole)) {
      const option = document.createElement("option");
      option.value = selectedRole;
      option.textContent = formatRole(selectedRole);
      select.appendChild(option);
    }

    select.value = selectedRole || "";
  }

  function setFormValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value || "";
  }

  function openAddForm() {
    state.editingMember = null;
    resetForm();
    populateRoleSelect("");
    elements.formTitle.textContent = "Add Member";
    elements.formSubmit.textContent = "Create Member";
    openDialog(elements.formDialog);
  }

  function openEditForm(member) {
    if (!member) return;

    state.editingMember = member;
    resetForm();
    populateRoleSelect(member.role);

    setFormValue("member-record-id", member.id);
    setFormValue("first-name", member.first_name);
    setFormValue("last-name", member.last_name);
    setFormValue("display-name", member.display_name);
    setFormValue("work-email", member.email);
    setFormValue("member-phone", member.phone);
    setFormValue("member-department", member.department);
    setFormValue("member-job-title", member.job_title);
    setFormValue("member-role", member.role);
    setFormValue("member-status", member.status);
    setFormValue("joining-date", member.joining_date ? String(member.joining_date).slice(0, 10) : "");
    setFormValue("member-location", member.location);
    setFormValue("member-bio", member.bio);

    elements.formTitle.textContent = "Edit Member";
    elements.formSubmit.textContent = "Save Changes";
    openDialog(elements.formDialog);
  }

  function clearValidation() {
    fieldIds.forEach(function (id) {
      const field = document.getElementById(id);
      const error = document.getElementById(id + "-error");
      if (field) {
        field.removeAttribute("aria-invalid");
        const wrapper = field.closest(".form-field");
        if (wrapper) wrapper.classList.remove("has-error");
      }
      if (error) error.textContent = "";
    });
  }

  function setFieldError(id, message) {
    const field = document.getElementById(id);
    const error = document.getElementById(id + "-error");
    if (field) field.setAttribute("aria-invalid", "true");
    if (field && field.closest(".form-field")) field.closest(".form-field").classList.add("has-error");
    if (error) error.textContent = message;
  }

  function validateForm() {
    clearValidation();
    const errors = [];

    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const email = document.getElementById("work-email").value.trim();
    const phone = document.getElementById("member-phone").value.trim();
    const joiningDate = document.getElementById("joining-date").value;
    const bio = document.getElementById("member-bio").value.trim();

    if (!firstName) { setFieldError("first-name", "First name is required."); errors.push("first-name"); }
    if (!lastName) { setFieldError("last-name", "Last name is required."); errors.push("last-name"); }

    if (!email) {
      setFieldError("work-email", "Work email is required.");
      errors.push("work-email");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("work-email", "Enter a valid work email.");
      errors.push("work-email");
    }

    if (phone && phone.length > 30) {
      setFieldError("member-phone", "Phone number is too long.");
      errors.push("member-phone");
    }

    if (joiningDate) {
      const parsed = new Date(joiningDate + "T00:00:00");
      if (Number.isNaN(parsed.getTime())) {
        setFieldError("joining-date", "Enter a valid joining date.");
        errors.push("joining-date");
      }
    }

    if (bio.length > 500) {
      setFieldError("member-bio", "Bio must be 500 characters or fewer.");
      errors.push("member-bio");
    }

    return errors;
  }

  function collectFormData() {
    const data = {};
    fieldIds.forEach(function (id) {
      const field = document.getElementById(id);
      if (field) data[field.name] = field.value.trim();
    });
    return data;
  }

  async function submitMemberForm(event) {
    event.preventDefault();

    const errors = validateForm();
    if (errors.length) {
      const first = document.getElementById(errors[0]);
      if (first) first.focus();
      return;
    }

    elements.formSubmit.disabled = true;
    elements.formSubmit.textContent = state.editingMember ? "Saving…" : "Preparing…";
    elements.formMessage.hidden = true;

    try {
      const payload = collectFormData();

      if (state.editingMember) {
        await apiAdapter.updateMember(state.editingMember.id, payload);
      } else {
        await apiAdapter.createMember(payload);
      }

      elements.formMessage.hidden = false;
      elements.formMessage.textContent = state.editingMember
        ? "Member updated successfully."
        : "Member created successfully.";
      setStatus(state.editingMember ? "Member updated successfully." : "Member created successfully.");
      closeDialog(elements.formDialog);
      await loadMembers();
    } catch (error) {
      elements.formMessage.hidden = false;
      elements.formMessage.textContent = error.message || "Unable to save the member.";
      setStatus(error.status === 403
        ? "You do not have permission to modify this member."
        : "The member change was not saved.");
    } finally {
      elements.formSubmit.disabled = false;
      elements.formSubmit.textContent = state.editingMember ? "Save Changes" : "Create Member";
    }
  }

  function openActionDialog(member, action) {
    if (!member) return;

    state.pendingAction = { member: member, action: action };

    const labels = {
      activate: "Activate member",
      deactivate: "Deactivate member",
      suspend: "Suspend member",
      archive: "Archive member",
      reset: "Reset account",
      invite: "Send invitation"
    };

    const messages = {
      activate: "This will request that the connected backend activate this member account.",
      deactivate: "This will request that the connected backend deactivate this member account.",
      suspend: "This will request that the connected backend suspend this member account.",
      archive: "This will request that the connected backend archive this member record.",
      reset: "This will request that the connected authentication system reset this member account.",
      invite: "This will request that the connected account system send an invitation."
    };

    elements.actionMemberName.textContent = member.display_name || member.full_name || "Unnamed member";
    elements.actionMessage.textContent = messages[action] || "This action requires the connected backend.";
    elements.confirmAction.textContent = labels[action] || "Confirm";
    openDialog(elements.actionDialog);
  }

  async function confirmAction() {
    if (!state.pendingAction) return;

    const action = state.pendingAction.action;
    const member = state.pendingAction.member;

    elements.confirmAction.disabled = true;
    elements.confirmAction.textContent = "Preparing…";

    try {
      await apiAdapter.accountAction(member.id, action);
      closeDialog(elements.actionDialog);
      await loadMembers();
      setStatus("Member account status updated successfully.");
    } catch (error) {
      setStatus(error?.status === 403
        ? "You do not have permission to change this account."
        : (error?.message || "The account action could not be completed."));
      closeDialog(elements.actionDialog);
    } finally {
      elements.confirmAction.disabled = false;
      elements.confirmAction.textContent = "Confirm";
      state.pendingAction = null;
    }
  }

  function handleTableAction(event) {
    const button = event.target.closest("[data-member-action]");
    if (!button) return;

    const member = getMemberById(button.dataset.memberId);
    if (!member) return;

    const action = button.dataset.memberAction;

    if (action === "view") openDetails(member);
    if (action === "edit") openEditForm(member);
    if (["activate", "deactivate", "suspend", "archive", "reset", "invite"].includes(action)) {
      openActionDialog(member, action);
    }
  }

  function resetFilters() {
    state.search = "";
    state.department = "";
    state.role = "";
    state.status = "";
    state.page = 1;

    elements.search.value = "";
    elements.department.value = "";
    elements.role.value = "";
    elements.status.value = "";
    elements.clearSearch.hidden = true;

    applyFilters();
  }

  function updateSearchClear() {
    elements.clearSearch.hidden = !elements.search.value;
  }

  function handleKeydown(event) {
    const openDialogElement = [elements.detailsDialog, elements.formDialog, elements.actionDialog].find(function (dialog) {
      return dialog && !dialog.hidden;
    });

    if (openDialogElement) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog(openDialogElement);
        return;
      }
      trapFocus(event, openDialogElement);
    }
  }

  function setupSidebar() {
    if (!elements.sidebarToggle || !elements.sidebar) return;

    elements.sidebarToggle.addEventListener("click", function () {
      const open = elements.sidebar.classList.toggle("open");
      elements.sidebarToggle.setAttribute("aria-expanded", String(open));
      elements.sidebarToggle.setAttribute("aria-label", open ? "Close admin navigation" : "Open admin navigation");
      if (elements.sidebarClose) elements.sidebarClose.hidden = !open;
    });

    elements.sidebarClose?.addEventListener("click", closeSidebar);

    elements.sidebar.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeSidebar);
    });
  }

  function closeSidebar() {
    if (!elements.sidebar) return;
    elements.sidebar.classList.remove("open");
    elements.sidebarToggle?.setAttribute("aria-expanded", "false");
    elements.sidebarToggle?.setAttribute("aria-label", "Open admin navigation");
  }

  function setupEvents() {
    elements.addMemberButton?.addEventListener("click", openAddForm);
    elements.retry?.addEventListener("click", loadMembers);

    elements.search?.addEventListener("input", function () {
      state.search = elements.search.value;
      state.page = 1;
      updateSearchClear();
      applyFilters();
    });

    elements.clearSearch?.addEventListener("click", function () {
      elements.search.value = "";
      state.search = "";
      updateSearchClear();
      elements.search.focus();
      applyFilters();
    });

    elements.department?.addEventListener("change", function () {
      state.department = elements.department.value;
      applyFilters();
    });

    elements.role?.addEventListener("change", function () {
      state.role = elements.role.value;
      applyFilters();
    });

    elements.status?.addEventListener("change", function () {
      state.status = elements.status.value;
      applyFilters();
    });

    elements.resetFilters?.addEventListener("click", resetFilters);

    elements.tableBody?.addEventListener("click", handleTableAction);

    elements.previousPage?.addEventListener("click", function () {
      if (state.page > 1) {
        state.page -= 1;
        renderList();
      }
    });

    elements.nextPage?.addEventListener("click", function () {
      const totalPages = Math.ceil(state.filteredMembers.length / state.pageSize);
      if (state.page < totalPages) {
        state.page += 1;
        renderList();
      }
    });

    elements.detailsEdit?.addEventListener("click", function () {
      if (state.selectedMember) {
        const member = state.selectedMember;
        closeDialog(elements.detailsDialog);
        openEditForm(member);
      }
    });

    elements.form?.addEventListener("submit", submitMemberForm);
    elements.confirmAction?.addEventListener("click", confirmAction);

    document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
      button.addEventListener("click", function () {
        const dialog = document.getElementById(button.dataset.closeDialog);
        closeDialog(dialog);
      });
    });

    elements.backdrop?.addEventListener("click", function () {
      const openDialogElement = [elements.detailsDialog, elements.formDialog, elements.actionDialog].find(function (dialog) {
        return dialog && !dialog.hidden;
      });
      closeDialog(openDialogElement);
    });

    document.addEventListener("keydown", handleKeydown);
  }

  function initialize() {
    renderUnavailableStats();
    setupSidebar();
    setupEvents();
    loadMembers();
  }

  initialize();
})();