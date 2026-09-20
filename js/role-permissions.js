(() => {
  "use strict";

  /*
   * Section 23 frontend boundary:
   * - This module owns UI state and presentation only.
   * - It never stores JWTs, roles, permissions, or authorization state in browser storage.
   * - Server-side authorization remains mandatory.
   * - API paths below are conceptual boundaries and are not treated as final backend contracts.
   */

  const API = Object.freeze({
    roles: "/api/roles",
    permissions: "/api/permissions",
    rolePermissions: (id) => `/api/roles/${encodeURIComponent(id)}/permissions`,
    roleMembers: (id) => `/api/roles/${encodeURIComponent(id)}/members`,
    roleAssignments: "/api/role-assignments"
  });

  const SYSTEM_ROLE_NAMES = new Set(["ceo", "developer", "admin", "hr"]);

  const state = {
    roles: [],
    selectedRole: null,
    permissions: [],
    assignedPermissionIds: new Set(),
    roleMembers: [],
    filters: { search: "", type: "", status: "" },
    loading: false,
    permissionLoading: false,
    dirty: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function normalizeRole(role) {
    if (!role || typeof role !== "object") return null;
    const rawName = String(role.name ?? "").trim();
    const normalizedName = rawName.toLowerCase().replace(/\s+/g, "_");
    const type = String(role.type ?? (SYSTEM_ROLE_NAMES.has(normalizedName) ? "system" : "custom")).toLowerCase();
    const status = String(role.status ?? "active").toLowerCase();

    return {
      id: role.id ?? role._id ?? null,
      name: rawName || "Unnamed Role",
      key: normalizedName,
      description: String(role.description ?? ""),
      type: type === "system" ? "system" : "custom",
      status: ["active", "inactive", "archived"].includes(status) ? status : "active",
      memberCount: Number.isFinite(Number(role.memberCount)) ? Number(role.memberCount) : null,
      permissionCount: Number.isFinite(Number(role.permissionCount)) ? Number(role.permissionCount) : null,
      createdAt: role.createdAt ?? null,
      updatedAt: role.updatedAt ?? null
    };
  }

  function normalizePermission(permission) {
    if (!permission || typeof permission !== "object") return null;
    const id = permission.id ?? permission._id ?? permission.key ?? null;
    return {
      id: id == null ? null : String(id),
      name: String(permission.name ?? permission.key ?? "Unnamed permission"),
      key: String(permission.key ?? ""),
      description: String(permission.description ?? ""),
      module: String(permission.module ?? "Other"),
      action: String(permission.action ?? "")
    };
  }

  function roleLabel(role) {
    return role?.name || "Role";
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function setStatePanel(message, type = "empty", retry = null) {
    const panel = $("#roles-state");
    if (!panel) return;
    panel.hidden = false;
    panel.className = `state-panel ${type}`;
    panel.textContent = "";
    const text = document.createElement("div");
    text.textContent = message;
    panel.appendChild(text);
    if (retry) {
      const wrap = document.createElement("div");
      wrap.className = "state-action";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Retry";
      button.addEventListener("click", retry);
      wrap.appendChild(button);
      panel.appendChild(wrap);
    }
  }

  function clearStatePanel() {
    const panel = $("#roles-state");
    if (panel) panel.hidden = true;
  }

  function setPermissionState(message, type = "empty") {
    const panel = $("#permission-state");
    if (!panel) return;
    panel.hidden = false;
    panel.className = `inline-state ${type}`;
    panel.textContent = message;
  }

  function clearPermissionState() {
    const panel = $("#permission-state");
    if (panel) panel.hidden = true;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
      const error = new Error(data?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function filteredRoles() {
    const { search, type, status } = state.filters;
    const query = search.trim().toLowerCase();

    return state.roles.filter((role) => {
      const searchable = `${role.name} ${role.description}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (!type || role.type === type)
        && (!status || role.status === status);
    });
  }

  function updateStats() {
    const roles = state.roles;
    $("#stat-total").textContent = roles.length ? String(roles.length) : "0";
    $("#stat-system").textContent = String(roles.filter((r) => r.type === "system").length);
    $("#stat-custom").textContent = String(roles.filter((r) => r.type === "custom").length);
    $("#stat-active").textContent = String(roles.filter((r) => r.status === "active").length);
  }

  function renderRoleList() {
    const list = $("#role-list");
    const count = $("#role-result-count");
    if (!list || !count) return;

    const roles = filteredRoles();
    count.textContent = `${roles.length} role${roles.length === 1 ? "" : "s"}`;
    list.textContent = "";

    if (!roles.length) {
      const empty = document.createElement("div");
      empty.className = "empty-list";
      empty.textContent = state.roles.length ? "No roles match the current filters." : "No roles are available.";
      list.appendChild(empty);
      return;
    }

    roles.forEach((role) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "role-item";
      button.dataset.roleId = role.id ?? "";
      button.setAttribute("aria-pressed", String(state.selectedRole?.id === role.id));
      if (state.selectedRole?.id === role.id) button.classList.add("active");

      const main = document.createElement("span");
      main.className = "role-item-main";
      const name = document.createElement("span");
      name.className = "role-name";
      name.textContent = roleLabel(role);
      const description = document.createElement("span");
      description.className = "role-description";
      description.textContent = role.description || (role.type === "system" ? "Protected system role" : "Custom role");
      main.append(name, description);

      const side = document.createElement("span");
      side.className = "role-item-side";
      const type = document.createElement("span");
      type.className = `badge ${role.type}`;
      type.textContent = role.type === "system" ? "System" : "Custom";
      side.appendChild(type);

      if (role.status !== "active") {
        const status = document.createElement("span");
        status.className = `badge ${role.status === "archived" ? "neutral" : "warning"}`;
        status.textContent = role.status[0].toUpperCase() + role.status.slice(1);
        side.appendChild(status);
      }

      button.append(main, side);
      button.addEventListener("click", () => selectRole(role));
      list.appendChild(button);
    });

    const createRow = document.createElement("div");
    createRow.className = "role-create-row";
    const create = document.createElement("button");
    create.type = "button";
    create.className = "btn btn-primary";
    create.style.width = "100%";
    create.textContent = "+ Create Role";
    create.addEventListener("click", openCreateRoleModal);
    createRow.appendChild(create);
    list.appendChild(createRow);
  }

  function selectRole(role) {
    state.selectedRole = role;
    state.dirty = false;
    renderRoleList();
    renderRoleDetails();
    if (role?.id != null) loadRoleDetails(role.id);
  }

  function renderRoleDetails() {
    const empty = $("#details-empty");
    const content = $("#details-content");
    if (!empty || !content) return;

    if (!state.selectedRole) {
      empty.hidden = false;
      content.hidden = true;
      return;
    }

    empty.hidden = true;
    content.hidden = false;

    const role = state.selectedRole;
    $("#selected-role-name").textContent = roleLabel(role);
    $("#selected-role-description").textContent = role.description || "No description provided.";
    setBadge($("#selected-role-type"), role.type === "system" ? "System Role" : "Custom Role", role.type);
    setBadge($("#selected-role-status"), role.status[0].toUpperCase() + role.status.slice(1), role.status === "active" ? "success" : role.status === "archived" ? "neutral" : "warning");

    $("#selected-permission-count").textContent = role.permissionCount == null ? "—" : String(role.permissionCount);
    $("#selected-member-count").textContent = role.memberCount == null ? "—" : String(role.memberCount);
    $("#selected-created-at").textContent = formatDate(role.createdAt);
    $("#selected-updated-at").textContent = formatDate(role.updatedAt);

    const protectedRole = role.type === "system";
    $("#edit-role-button").disabled = protectedRole;
    $("#archive-role-button").disabled = protectedRole;
    $("#save-permissions-button").disabled = protectedRole || state.permissionLoading;
  }

  function setBadge(element, text, kind) {
    if (!element) return;
    element.textContent = text;
    element.className = `badge ${kind}`;
  }

  function renderPermissionCatalog() {
    const catalog = $("#permission-catalog");
    if (!catalog) return;
    catalog.textContent = "";

    if (state.permissionLoading) {
      setPermissionState("Loading permissions…", "loading");
      return;
    }

    clearPermissionState();

    if (!state.permissions.length) {
      setPermissionState("No permission definitions are available from the backend.", "empty");
      $("#permission-summary").textContent = "0 permissions assigned";
      return;
    }

    const modules = new Map();
    state.permissions.forEach((permission) => {
      const module = permission.module || "Other";
      if (!modules.has(module)) modules.set(module, []);
      modules.get(module).push(permission);
    });

    modules.forEach((permissions, moduleName) => {
      const moduleSection = document.createElement("section");
      moduleSection.className = "permission-module";
      const header = document.createElement("div");
      header.className = "module-header";

      const title = document.createElement("span");
      title.className = "module-title";
      title.textContent = moduleName;

      const actions = document.createElement("div");
      actions.className = "module-actions";
      const select = document.createElement("button");
      select.type = "button";
      select.className = "text-button";
      select.textContent = "Select all";
      select.addEventListener("click", () => setModulePermissions(permissions, true));
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "text-button";
      clear.textContent = "Clear";
      clear.addEventListener("click", () => setModulePermissions(permissions, false));
      actions.append(select, clear);
      header.append(title, actions);

      const rows = document.createElement("div");
      rows.className = "permission-list";

      permissions.forEach((permission) => {
        const row = document.createElement("label");
        row.className = "permission-row";
        const text = document.createElement("span");
        const name = document.createElement("span");
        name.className = "permission-name";
        name.textContent = permission.name;
        const description = document.createElement("span");
        description.className = "permission-description";
        description.textContent = permission.description;
        text.append(name);
        if (description.textContent) text.append(description);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "permission-checkbox";
        checkbox.dataset.permissionId = permission.id ?? "";
        checkbox.checked = state.assignedPermissionIds.has(String(permission.id));
        checkbox.disabled = state.selectedRole?.type === "system";
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) state.assignedPermissionIds.add(String(permission.id));
          else state.assignedPermissionIds.delete(String(permission.id));
          state.dirty = true;
          updatePermissionSummary();
        });

        row.append(text, checkbox);
        rows.appendChild(row);
      });

      moduleSection.append(header, rows);
      catalog.appendChild(moduleSection);
    });

    updatePermissionSummary();
  }

  function setModulePermissions(permissions, checked) {
    if (state.selectedRole?.type === "system") return;
    permissions.forEach((permission) => {
      const id = String(permission.id);
      if (checked) state.assignedPermissionIds.add(id);
      else state.assignedPermissionIds.delete(id);
    });
    state.dirty = true;
    renderPermissionCatalog();
  }

  function updatePermissionSummary() {
    const count = state.assignedPermissionIds.size;
    $("#permission-summary").textContent = `${count} permission${count === 1 ? "" : "s"} assigned`;
    if (state.selectedRole && state.selectedRole.type !== "system") {
      $("#selected-permission-count").textContent = String(count);
    }
  }

  async function loadRoleDetails(roleId) {
    state.permissionLoading = true;
    state.assignedPermissionIds = new Set();
    renderPermissionCatalog();
    renderRoleDetails();

    if (roleId == null) {
      state.permissionLoading = false;
      setPermissionState("This role does not have a backend identifier yet.", "error");
      return;
    }

    try {
      const [roleData, permissionData] = await Promise.all([
        requestJson(API.roles + "/" + encodeURIComponent(roleId)),
        requestJson(API.permissions)
      ]);

      const freshRole = normalizeRole(roleData?.role || roleData);
      if (freshRole) {
        state.selectedRole = freshRole;
        state.roles = state.roles.map((r) => r.id === freshRole.id ? freshRole : r);
        updateStats();
        renderRoleList();
        renderRoleDetails();
      }

      state.permissions = Array.isArray(permissionData?.permissions)
        ? permissionData.permissions.map(normalizePermission).filter(Boolean)
        : [];

      const assigned = roleData?.permissions ?? roleData?.role?.permissions ?? [];
      state.assignedPermissionIds = new Set(
        Array.isArray(assigned)
          ? assigned.map((p) => String(p?.id ?? p?.permissionId ?? p))
          : []
      );

      state.permissionLoading = false;
      renderPermissionCatalog();
      renderRoleDetails();
    } catch (error) {
      state.permissionLoading = false;
      renderPermissionCatalog();
      setPermissionState("Unable to load role permissions. No local authorization fallback is used.", "error");
      console.error("Role details request failed:", error);
      renderRoleDetails();
    }
  }

  async function loadRoles() {
    state.loading = true;
    setStatePanel("Loading roles…", "loading");
    try {
      const data = await requestJson(API.roles);
      const incoming = Array.isArray(data?.roles) ? data.roles : [];
      state.roles = incoming.map(normalizeRole).filter(Boolean);
      clearStatePanel();
      updateStats();
      renderRoleList();

      if (!state.roles.length) {
        setStatePanel("No roles are available.", "empty");
        state.selectedRole = null;
        renderRoleDetails();
        return;
      }

      const current = state.selectedRole && state.roles.find((r) => r.id === state.selectedRole.id);
      selectRole(current || state.roles[0]);
    } catch (error) {
      state.roles = [];
      state.selectedRole = null;
      updateStats();
      renderRoleList();
      renderRoleDetails();
      setStatePanel("Unable to load roles. Connect the future roles API to populate this page.", "error", loadRoles);
      console.error("Roles request failed:", error);
    } finally {
      state.loading = false;
    }
  }

  function applyFilters() {
    state.filters.search = $("#role-search")?.value || "";
    state.filters.type = $("#role-type-filter")?.value || "";
    state.filters.status = $("#role-status-filter")?.value || "";
    renderRoleList();
  }

  function clearFilters() {
    $("#role-search").value = "";
    $("#role-type-filter").value = "";
    $("#role-status-filter").value = "";
    applyFilters();
  }

  function validateRoleName(name) {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name.trim()) return "Role name is required.";
    if (!/^[a-zA-Z0-9][a-zA-Z0-9 &'_-]{1,49}$/.test(name.trim())) return "Use 2–50 letters, numbers, spaces, hyphens, underscores, or apostrophes.";
    if (SYSTEM_ROLE_NAMES.has(normalized)) return "This name is reserved for a protected system role.";
    if (state.roles.some((r) => r.key === normalized)) return "A role with this name already exists.";
    return "";
  }

  function createModalShell(title, description) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "presentation");

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modal-title");

    const header = document.createElement("div");
    header.className = "modal-header";
    const titleWrap = document.createElement("div");
    const heading = document.createElement("h2");
    heading.id = "modal-title";
    heading.textContent = title;
    const sub = document.createElement("p");
    sub.className = "muted";
    sub.textContent = description;
    titleWrap.append(heading, sub);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-close";
    close.setAttribute("aria-label", "Close dialog");
    close.textContent = "×";
    header.append(titleWrap, close);

    modal.appendChild(header);
    backdrop.appendChild(modal);
    $("#modal-root").appendChild(backdrop);

    const closeModal = () => {
      document.removeEventListener("keydown", onKeydown);
      backdrop.remove();
    };
    const onKeydown = (event) => {
      if (event.key === "Escape") closeModal();
    };
    close.addEventListener("click", closeModal);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModal();
    });
    document.addEventListener("keydown", onKeydown);

    return { backdrop, modal, closeModal };
  }

  function openCreateRoleModal() {
    const { modal, closeModal } = createModalShell("Create Custom Role", "Create a custom role. Backend authorization will determine who can perform this action.");

    const body = document.createElement("div");
    body.className = "modal-body";
    const form = document.createElement("form");
    form.className = "form-grid";

    const nameField = field("Role name", "role-name", "text", "e.g. Gallery Manager");
    const descField = field("Description", "role-description", "textarea", "Describe the role's responsibility.");
    const warning = document.createElement("div");
    warning.className = "warning-box";
    warning.textContent = "Creating a role does not grant authorization by itself. Permission assignment must be validated by the backend.";

    form.append(nameField.wrapper, descField.wrapper, warning);
    body.appendChild(form);

    const footer = document.createElement("div");
    footer.className = "modal-footer";
    const cancel = button("Cancel", "btn btn-secondary");
    const submit = button("Create Role", "btn btn-primary");
    cancel.addEventListener("click", closeModal);

    submit.addEventListener("click", async () => {
      const name = nameField.input.value.trim();
      const description = descField.input.value.trim();
      const error = validateRoleName(name);
      if (error) {
        nameField.error.textContent = error;
        nameField.input.setAttribute("aria-invalid", "true");
        nameField.input.focus();
        return;
      }
      nameField.error.textContent = "";
      nameField.input.removeAttribute("aria-invalid");
      submit.disabled = true;
      submit.textContent = "Creating…";
      try {
        await requestJson(API.roles, {
          method: "POST",
          body: JSON.stringify({ name, description, type: "custom" })
        });
        closeModal();
        showToast("Role created successfully.");
        await loadRoles();
      } catch (requestError) {
        submit.disabled = false;
        submit.textContent = "Create Role";
        nameField.error.textContent = requestError.message || "Unable to create role.";
        console.error("Create role failed:", requestError);
      }
    });

    footer.append(cancel, submit);
    modal.append(body, footer);
    nameField.input.focus();
  }

  function field(labelText, id, type, placeholder) {
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    input.id = id;
    input.placeholder = placeholder;
    input.required = id === "role-name";
    if (type !== "textarea") input.type = type;
    const error = document.createElement("span");
    error.className = "field-error";
    error.setAttribute("role", "alert");
    wrapper.append(label, input, error);
    return { wrapper, input, error };
  }

  function button(text, className) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.textContent = text;
    return el;
  }

  function openRoleEditModal() {
    const role = state.selectedRole;
    if (!role || role.type === "system") return;
    const { modal, closeModal } = createModalShell("Edit Custom Role", "Update role metadata. Permission changes remain a separate operation.");

    const body = document.createElement("div");
    body.className = "modal-body";
    const name = field("Role name", "edit-role-name", "text", "");
    const description = field("Description", "edit-role-description", "textarea", "");
    name.input.value = role.name;
    description.input.value = role.description;
    body.append(name.wrapper, description.wrapper);

    const footer = document.createElement("div");
    footer.className = "modal-footer";
    const cancel = button("Cancel", "btn btn-secondary");
    const save = button("Save Changes", "btn btn-primary");
    cancel.addEventListener("click", closeModal);
    save.addEventListener("click", async () => {
      const newName = name.input.value.trim();
      const normalized = newName.toLowerCase().replace(/\s+/g, "_");
      if (!newName) {
        name.error.textContent = "Role name is required.";
        return;
      }
      if (SYSTEM_ROLE_NAMES.has(normalized)) {
        name.error.textContent = "Protected system role names cannot be reused.";
        return;
      }
      save.disabled = true;
      save.textContent = "Saving…";
      try {
        await requestJson(API.roles + "/" + encodeURIComponent(role.id), {
          method: "PATCH",
          body: JSON.stringify({ name: newName, description: description.input.value.trim() })
        });
        closeModal();
        showToast("Role updated successfully.");
        await loadRoles();
      } catch (error) {
        save.disabled = false;
        save.textContent = "Save Changes";
        name.error.textContent = error.message || "Unable to update role.";
      }
    });
    footer.append(cancel, save);
    modal.append(body, footer);
    name.input.focus();
  }

  async function savePermissions() {
    const role = state.selectedRole;
    if (!role || role.type === "system" || role.id == null || state.permissionLoading) return;

    const buttonEl = $("#save-permissions-button");
    buttonEl.disabled = true;
    buttonEl.textContent = "Saving…";

    try {
      await requestJson(API.rolePermissions(role.id), {
        method: "PUT",
        body: JSON.stringify({ permissions: Array.from(state.assignedPermissionIds) })
      });
      state.dirty = false;
      showToast("Permissions saved successfully.");
      await loadRoleDetails(role.id);
    } catch (error) {
      showToast(error.message || "Unable to save permissions.");
      console.error("Save permissions failed:", error);
    } finally {
      if (state.selectedRole?.type !== "system") {
        buttonEl.disabled = false;
        buttonEl.textContent = "Save Changes";
      }
    }
  }

  function openMembersModal() {
    const role = state.selectedRole;
    if (!role) return;
    const { modal, closeModal } = createModalShell("Role Members", `Members currently assigned to ${roleLabel(role)}.`);
    const body = document.createElement("div");
    body.className = "modal-body";
    const list = document.createElement("div");
    list.className = "member-list";
    list.textContent = "Loading role members…";
    body.appendChild(list);
    modal.appendChild(body);

    if (role.id == null) {
      list.textContent = "Member data requires a backend role identifier.";
      return;
    }

    requestJson(API.roleMembers(role.id))
      .then((data) => {
        const members = Array.isArray(data?.members) ? data.members : [];
        list.textContent = "";
        if (!members.length) {
          list.textContent = "No members are assigned to this role.";
          return;
        }
        members.forEach((member) => {
          const row = document.createElement("div");
          row.className = "member-row";
          const name = document.createElement("strong");
          name.textContent = member.name || "Member";
          const status = document.createElement("span");
          status.className = "badge neutral";
          status.textContent = member.status || "Active";
          row.append(name, status);
          list.appendChild(row);
        });
      })
      .catch((error) => {
        list.textContent = "Unable to load role members.";
        console.error("Role members request failed:", error);
      });
  }

  function confirmArchiveRole() {
    const role = state.selectedRole;
    if (!role || role.type === "system") return;

    const { modal, closeModal } = createModalShell("Archive Custom Role", "Review the access impact before continuing.");
    const body = document.createElement("div");
    body.className = "modal-body";
    const warning = document.createElement("div");
    warning.className = "warning-box";
    warning.textContent = `${roleLabel(role)} may have ${role.memberCount == null ? "members" : role.memberCount + " member(s)"} assigned. The backend must prevent unsafe deletion or handle reassignment before archiving.`;
    body.appendChild(warning);

    const footer = document.createElement("div");
    footer.className = "modal-footer";
    const cancel = button("Cancel", "btn btn-secondary");
    const confirm = button("Archive Role", "btn btn-danger");
    cancel.addEventListener("click", closeModal);
    confirm.addEventListener("click", async () => {
      confirm.disabled = true;
      confirm.textContent = "Archiving…";
      try {
        await requestJson(API.roles + "/" + encodeURIComponent(role.id), { method: "PATCH", body: JSON.stringify({ status: "archived" }) });
        closeModal();
        showToast("Role archived successfully.");
        await loadRoles();
      } catch (error) {
        confirm.disabled = false;
        confirm.textContent = "Archive Role";
        showToast(error.message || "Unable to archive role.");
      }
    });
    footer.append(cancel, confirm);
    modal.append(body, footer);
  }

  function wireEvents() {
    $("#role-search")?.addEventListener("input", applyFilters);
    $("#role-type-filter")?.addEventListener("change", applyFilters);
    $("#role-status-filter")?.addEventListener("change", applyFilters);
    $("#clear-filters")?.addEventListener("click", clearFilters);
    $("#create-role-button")?.addEventListener("click", openCreateRoleModal);
    $("#edit-role-button")?.addEventListener("click", openRoleEditModal);
    $("#view-members-button")?.addEventListener("click", openMembersModal);
    $("#archive-role-button")?.addEventListener("click", confirmArchiveRole);
    $("#save-permissions-button")?.addEventListener("click", savePermissions);

    $("#select-all-permissions")?.addEventListener("click", () => {
      if (state.selectedRole?.type === "system") return;
      state.permissions.forEach((p) => state.assignedPermissionIds.add(String(p.id)));
      state.dirty = true;
      renderPermissionCatalog();
    });

    $("#clear-all-permissions")?.addEventListener("click", () => {
      if (state.selectedRole?.type === "system") return;
      state.assignedPermissionIds.clear();
      state.dirty = true;
      renderPermissionCatalog();
    });

    const toggle = $("#mobile-nav-toggle");
    const sidebar = $("#admin-sidebar");
    toggle?.addEventListener("click", () => {
      const open = sidebar.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close admin navigation" : "Open admin navigation");
    });

    $$(".sidebar a").forEach((link) => link.addEventListener("click", () => {
      sidebar?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireEvents();
    loadRoles();
  });
})();