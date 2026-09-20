(() => {
  "use strict";

  const state = {
    holidays: [],
    filtered: [],
    selected: null,
    editing: false,
    pendingRemove: null,
    busy: false,
    lastFocused: null,
    today: new Date()
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const els = {
    sidebar: $("#admin-sidebar"),
    sidebarToggle: $("[data-sidebar-toggle]"),
    sidebarBackdrop: $("[data-sidebar-close]"),
    filters: $("#holiday-filters"),
    search: $("#holiday-search"),
    year: $("#holiday-year"),
    type: $("#holiday-type"),
    status: $("#holiday-status"),
    time: $("#holiday-time"),
    table: $("[data-holiday-table]"),
    body: $("[data-holiday-body]"),
    mobileList: $("[data-mobile-holiday-list]"),
    summary: $("[data-result-summary]"),
    pageStatus: $("[data-page-status]"),
    detailsModal: $('[data-modal="details"]'),
    detailsTitle: $("#details-title"),
    details: $("[data-details]"),
    formModal: $('[data-modal="form"]'),
    form: $("#holiday-form"),
    formTitle: $("#form-title"),
    formKicker: $("[data-form-kicker]"),
    formId: $("#holiday-id"),
    formName: $("#form-name"),
    formDate: $("#form-date"),
    formDescription: $("#form-description"),
    formType: $("#form-type"),
    formRecurring: $("#form-recurring"),
    formStatus: $("#form-status"),
    descriptionCount: $("[data-description-count]"),
    formState: $("[data-form-state]"),
    formServerError: $("[data-form-server-error]"),
    submitHoliday: $("[data-submit-holiday]"),
    confirmModal: $('[data-modal="confirm"]'),
    confirmDescription: $("[data-confirm-description]"),
    confirmState: $("[data-confirm-state]"),
    toast: $("[data-toast]")
  };

  const api = {
    // Future REST adapter boundary. Final endpoints are intentionally not defined in Section 19.
    async listHolidays() { throw new Error("API_NOT_CONNECTED"); },
    async createHoliday(payload) { void payload; throw new Error("API_NOT_CONNECTED"); },
    async updateHoliday(id, payload) { void id; void payload; throw new Error("API_NOT_CONNECTED"); },
    async removeHoliday(id) { void id; throw new Error("API_NOT_CONNECTED"); }
  };

  const TYPES = new Set(["Public Holiday","Company Holiday","Optional Holiday","Other"]);
  const STATUSES = new Set(["Active","Inactive"]);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[char]));
  }

  function normalizeHoliday(raw) {
    if (!raw || typeof raw !== "object") return null;
    const date = typeof raw.date === "string" ? raw.date.slice(0,10) : "";
    if (!raw.id && raw.id !== 0) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parsed = new Date(date + "T00:00:00");
    if (Number.isNaN(parsed.getTime())) return null;

    return {
      id: String(raw.id),
      name: String(raw.name ?? "").trim(),
      date,
      year: Number.isInteger(Number(raw.year)) ? Number(raw.year) : parsed.getFullYear(),
      description: String(raw.description ?? "").trim(),
      type: TYPES.has(raw.type) ? raw.type : "Other",
      recurring: Boolean(raw.recurring),
      status: STATUSES.has(raw.status) ? raw.status : "Active",
      createdAt: raw.createdAt ?? null,
      updatedAt: raw.updatedAt ?? null
    };
  }

  function formatDate(date) {
    const parsed = new Date(date + "T00:00:00");
    if (Number.isNaN(parsed.getTime())) return "Invalid date";
    return new Intl.DateTimeFormat("en-US", {month:"short",day:"2-digit",year:"numeric"}).format(parsed);
  }

  function dayName(date) {
    const parsed = new Date(date + "T00:00:00");
    return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("en-US",{weekday:"long"}).format(parsed);
  }

  function todayString() {
    const d = state.today;
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return y + "-" + m + "-" + day;
  }

  function isUpcoming(holiday) {
    return holiday.date >= todayString();
  }

  function setStats() {
    const total = state.holidays.length;
    const currentYear = state.holidays.filter(h => h.year === state.today.getFullYear()).length;
    const upcoming = state.holidays.filter(h => isUpcoming(h) && h.status === "Active").length;
    const past = state.holidays.filter(h => h.date < todayString()).length;

    const values = {total, "current-year":currentYear, upcoming, past};
    Object.entries(values).forEach(([key,value]) => {
      const valueEl = $(`[data-stat="${key}"]`);
      const metaEl = $(`[data-stat-meta="${key}"]`);
      if (!valueEl || !metaEl) return;
      valueEl.textContent = String(value);
      metaEl.textContent = "Loaded from holiday service";
    });
  }

  function setStatsUnavailable() {
    $$("[data-stat]").forEach(el => el.textContent = "—");
    $$("[data-stat-meta]").forEach(el => el.textContent = "Unavailable");
  }

  function populateYears() {
    const current = state.today.getFullYear();
    const years = new Set([current, current - 1, current + 1]);
    state.holidays.forEach(h => years.add(h.year));
    const selected = els.year.value;
    els.year.innerHTML = '<option value="">All years</option>' +
      [...years].sort((a,b)=>b-a).map(year => `<option value="${year}">${year}</option>`).join("");
    if ([...years].map(String).includes(selected)) els.year.value = selected;
  }

  function getFiltered() {
    const search = els.search.value.trim().toLowerCase();
    const year = els.year.value;
    const type = els.type.value;
    const status = els.status.value;
    const time = els.time.value;

    return state.holidays
      .filter(h => !search || h.name.toLowerCase().includes(search) || h.description.toLowerCase().includes(search))
      .filter(h => !year || String(h.year) === year)
      .filter(h => !type || h.type === type)
      .filter(h => !status || h.status === status)
      .filter(h => !time || (time === "upcoming" ? isUpcoming(h) : !isUpcoming(h)))
      .sort((a,b) => a.date.localeCompare(b.date));
  }

  function statusBadge(status) {
    return status === "Active"
      ? '<span class="badge success">Active</span>'
      : '<span class="badge warning">Inactive</span>';
  }

  function renderTable() {
    state.filtered = getFiltered();

    if (!state.holidays.length) {
      els.table.hidden = true;
      els.mobileList.hidden = true;
      showState("empty");
      els.summary.textContent = "No holiday data available.";
      return;
    }

    hideStates();
    els.table.hidden = false;
    els.mobileList.hidden = false;

    els.body.innerHTML = state.filtered.map(h => `
      <tr>
        <td>
          <span class="holiday-name">${escapeHtml(h.name)}</span>
          ${h.description ? `<span class="holiday-description">${escapeHtml(h.description)}</span>` : ""}
        </td>
        <td class="date-cell"><time datetime="${escapeHtml(h.date)}">${escapeHtml(formatDate(h.date))}</time></td>
        <td>${escapeHtml(dayName(h.date))}</td>
        <td>${h.year}</td>
        <td>${escapeHtml(h.type)}</td>
        <td>${statusBadge(h.status)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-secondary btn-sm" type="button" data-action="details" data-id="${escapeHtml(h.id)}">Details</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="edit" data-id="${escapeHtml(h.id)}">Edit</button>
            <button class="btn btn-danger btn-sm" type="button" data-action="remove" data-id="${escapeHtml(h.id)}">Remove</button>
          </div>
        </td>
      </tr>`).join("");

    els.mobileList.innerHTML = state.filtered.map(h => `
      <article class="holiday-mobile-card">
        <div class="holiday-mobile-top">
          <div><strong class="holiday-name">${escapeHtml(h.name)}</strong><span class="holiday-description">${escapeHtml(h.description || "No description")}</span></div>
          ${statusBadge(h.status)}
        </div>
        <div class="holiday-mobile-meta">
          <span><strong>Date:</strong> ${escapeHtml(formatDate(h.date))}</span>
          <span><strong>Day:</strong> ${escapeHtml(dayName(h.date))}</span>
          <span><strong>Type:</strong> ${escapeHtml(h.type)}</span>
        </div>
        <div class="holiday-mobile-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-action="details" data-id="${escapeHtml(h.id)}">Details</button>
          <button class="btn btn-secondary btn-sm" type="button" data-action="edit" data-id="${escapeHtml(h.id)}">Edit</button>
          <button class="btn btn-danger btn-sm" type="button" data-action="remove" data-id="${escapeHtml(h.id)}">Remove</button>
        </div>
      </article>`).join("");

    els.summary.textContent = state.filtered.length === state.holidays.length
      ? `${state.holidays.length} holiday${state.holidays.length === 1 ? "" : "s"} loaded.`
      : `${state.filtered.length} of ${state.holidays.length} holidays match the current filters.`;

    if (!state.filtered.length) {
      els.table.hidden = true;
      els.mobileList.hidden = false;
      els.mobileList.innerHTML = '<div class="state-panel"><div class="state-icon" aria-hidden="true">⌕</div><strong>No matching holidays.</strong><p>Try changing the search or filters.</p><button class="btn btn-secondary btn-sm" type="button" data-action="reset-filters">Reset filters</button></div>';
      els.summary.textContent = "No holidays match the current filters.";
    }
  }

  function showState(name, message) {
    hideStates();
    const panel = $(`[data-state="${name}"]`);
    if (panel) panel.hidden = false;
    if (message) $("[data-error-message]").textContent = message;
  }

  function hideStates() {
    $$("[data-state]").forEach(el => el.hidden = true);
  }

  async function loadData() {
    showState("loading");
    els.table.hidden = true;
    els.mobileList.hidden = true;
    els.pageStatus.textContent = "Loading holiday data…";

    try {
      const result = await api.listHolidays();
      const incoming = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      state.holidays = incoming.map(normalizeHoliday).filter(Boolean);
      populateYears();
      setStats();
      renderTable();
      els.pageStatus.textContent = state.holidays.length ? "Holiday data loaded." : "Holiday service returned no records.";
    } catch (error) {
      if (error?.message === "API_NOT_CONNECTED") {
        state.holidays = [];
        setStatsUnavailable();
        populateYears();
        showState("empty");
        els.summary.textContent = "No holiday data available.";
        els.pageStatus.textContent = "Holiday data is awaiting REST API integration.";
        return;
      }
      state.holidays = [];
      setStatsUnavailable();
      showState("error", "The holiday service did not return usable data. No local production data has been substituted.");
      els.summary.textContent = "Holiday data could not be loaded.";
      els.pageStatus.textContent = "Holiday data could not be loaded.";
    }
  }

  function findHoliday(id) {
    return state.holidays.find(h => h.id === String(id)) || null;
  }

  function openModal(modal) {
    state.lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const focusTarget = modal.querySelector("button,input,select,textarea");
    window.setTimeout(() => focusTarget?.focus(), 0);
  }

  function closeModals() {
    [els.detailsModal,els.formModal,els.confirmModal].forEach(modal => { if (modal) modal.hidden = true; });
    document.body.style.overflow = "";
    state.pendingRemove = null;
    state.busy = false;
    state.lastFocused?.focus?.();
  }

  function renderDetails(holiday) {
    els.detailsTitle.textContent = holiday.name;
    els.details.innerHTML = [
      ["Date",formatDate(holiday.date)],
      ["Day",dayName(holiday.date)],
      ["Year",holiday.year],
      ["Type",holiday.type],
      ["Status",holiday.status],
      ["Recurring",holiday.recurring ? "Yes" : "No"],
      ["Description",holiday.description || "No description provided.",true],
      ["Created",holiday.createdAt ? String(holiday.createdAt) : "Unavailable"],
      ["Updated",holiday.updatedAt ? String(holiday.updatedAt) : "Unavailable"]
    ].map(([label,value,full]) => `<div class="detail-item${full ? " full" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  function openDetails(holiday) {
    state.selected = holiday;
    renderDetails(holiday);
    openModal(els.detailsModal);
  }

  function clearFormErrors() {
    $$(".field-error", els.form).forEach(el => el.textContent = "");
    els.formServerError.textContent = "";
    els.formState.textContent = "";
  }

  function setFormMode(holiday = null) {
    clearFormErrors();
    state.editing = Boolean(holiday);
    els.form.reset();
    els.formId.value = holiday?.id || "";
    els.formName.value = holiday?.name || "";
    els.formDate.value = holiday?.date || "";
    els.formDescription.value = holiday?.description || "";
    els.formType.value = holiday?.type || "";
    els.formRecurring.checked = Boolean(holiday?.recurring);
    els.formStatus.value = holiday?.status || "Active";
    els.formTitle.textContent = holiday ? "Edit Holiday" : "Add Holiday";
    els.formKicker.textContent = holiday ? "Update holiday" : "Add holiday";
    els.submitHoliday.textContent = holiday ? "Save Changes" : "Save Holiday";
    updateDescriptionCount();
  }

  function openCreate() {
    closeModals();
    setFormMode();
    openModal(els.formModal);
  }

  function openEdit(holiday) {
    closeModals();
    setFormMode(holiday);
    openModal(els.formModal);
  }

  function validateForm() {
    clearFormErrors();
    let valid = true;
    const name = els.formName.value.trim();
    const date = els.formDate.value;
    const type = els.formType.value;
    const description = els.formDescription.value.trim();

    if (!name) { $("#form-name-error").textContent = "Holiday name is required."; valid = false; }
    else if (name.length > 120) { $("#form-name-error").textContent = "Holiday name must be 120 characters or fewer."; valid = false; }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date+"T00:00:00").getTime())) {
      $("#form-date-error").textContent = "Enter a valid holiday date."; valid = false;
    }

    if (!TYPES.has(type)) { $("#form-type-error").textContent = "Select a valid holiday type."; valid = false; }
    if (description.length > 500) { $("#form-description-error").textContent = "Description must be 500 characters or fewer."; valid = false; }

    if (valid) {
      const duplicate = state.holidays.find(h =>
        h.id !== els.formId.value &&
        h.date === date &&
        h.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        $("#form-date-error").textContent = "A holiday with the same name and date is already loaded.";
        valid = false;
      }
    }

    return valid;
  }

  function updateDescriptionCount() {
    els.descriptionCount.textContent = `${els.formDescription.value.length} / 500`;
  }

  async function submitForm(event) {
    event.preventDefault();
    if (state.busy || !validateForm()) return;

    const payload = {
      name: els.formName.value.trim(),
      date: els.formDate.value,
      description: els.formDescription.value.trim(),
      type: els.formType.value,
      recurring: els.formRecurring.checked,
      status: els.formStatus.value
    };

    state.busy = true;
    els.submitHoliday.disabled = true;
    els.formState.textContent = "Preparing request…";

    try {
      if (state.editing) await api.updateHoliday(els.formId.value, payload);
      else await api.createHoliday(payload);
      els.formState.textContent = "The backend must confirm this operation before local holiday data changes.";
      showToast("Holiday action is not connected to the backend yet.");
    } catch (error) {
      if (error?.message === "API_NOT_CONNECTED") {
        els.formState.textContent = "REST API integration is required before this action can be completed. No local record was changed.";
        return;
      }
      els.formServerError.textContent = "The holiday service rejected or could not complete the operation. No local record was changed.";
      els.formState.textContent = "Operation failed.";
    } finally {
      state.busy = false;
      els.submitHoliday.disabled = false;
    }
  }

  function openRemove(holiday) {
    state.pendingRemove = holiday;
    els.confirmDescription.textContent = `You are requesting removal of “${holiday.name}” dated ${formatDate(holiday.date)}. The backend will determine whether removal is allowed. No local record will be removed until server confirmation.`;
    els.confirmState.textContent = "";
    openModal(els.confirmModal);
  }

  async function confirmRemove() {
    if (state.busy || !state.pendingRemove) return;
    state.busy = true;
    const button = $("[data-action='confirm-remove']", els.confirmModal);
    button.disabled = true;
    els.confirmState.textContent = "Preparing request…";

    try {
      await api.removeHoliday(state.pendingRemove.id);
      els.confirmState.textContent = "The backend must confirm this operation before the holiday is removed.";
      showToast("Holiday removal is not connected to the backend yet.");
    } catch (error) {
      if (error?.message === "API_NOT_CONNECTED") {
        els.confirmState.textContent = "REST API integration is required before removal can be completed. No local record was changed.";
      } else {
        els.confirmState.textContent = "The holiday service rejected or could not complete the operation. No local record was changed.";
      }
    } finally {
      state.busy = false;
      button.disabled = false;
    }
  }

  function setSidebar(open) {
    els.sidebar.classList.toggle("open", open);
    els.sidebarToggle?.setAttribute("aria-expanded", String(open));
    if (els.sidebarBackdrop) els.sidebarBackdrop.hidden = !open;
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2800);
  }

  document.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;

    if (action === "open-create") { openCreate(); return; }
    if (action === "refresh" || action === "retry") { loadData(); return; }
    if (action === "reset-filters") { els.filters.reset(); renderTable(); return; }
    if (action === "close-modal") { closeModals(); return; }
    if (action === "details") {
      const holiday = findHoliday(actionButton.dataset.id);
      if (holiday) openDetails(holiday);
      return;
    }
    if (action === "edit") {
      const holiday = findHoliday(actionButton.dataset.id);
      if (holiday) openEdit(holiday);
      return;
    }
    if (action === "edit-selected") {
      if (state.selected) openEdit(state.selected);
      return;
    }
    if (action === "remove") {
      const holiday = findHoliday(actionButton.dataset.id);
      if (holiday) openRemove(holiday);
      return;
    }
    if (action === "confirm-remove") { confirmRemove(); return; }
    if (action === "logout") {
      showToast("Logout will be handled by the future authentication service.");
    }
  });

  els.filters.addEventListener("input", renderTable);
  els.filters.addEventListener("change", renderTable);
  els.form.addEventListener("submit", submitForm);
  els.formDescription.addEventListener("input", updateDescriptionCount);
  els.sidebarToggle?.addEventListener("click", () => setSidebar(!els.sidebar.classList.contains("open")));
  els.sidebarBackdrop?.addEventListener("click", () => setSidebar(false));
  $$(".sidebar a").forEach(link => link.addEventListener("click", () => setSidebar(false)));

  document.addEventListener("keydown", event => {
    const modalOpen = [els.detailsModal,els.formModal,els.confirmModal].some(m => m && !m.hidden);
    if (event.key === "Escape" && modalOpen) closeModals();
    if (event.key === "Escape" && els.sidebar.classList.contains("open")) setSidebar(false);

    if (event.key === "Tab" && modalOpen) {
      const modal = [els.detailsModal,els.formModal,els.confirmModal].find(m => m && !m.hidden);
      if (!modal) return;
      const focusable = $$("button,input,select,textarea,[href],[tabindex]:not([tabindex='-1'])", modal)
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  // Public integration hook for the future backend adapter. It does not grant authorization.
  window.PrimeItHolidayManagement = Object.freeze({
    setApi(adapter) {
      if (!adapter || typeof adapter !== "object") throw new TypeError("A holiday API adapter is required.");
      Object.keys(api).forEach(key => {
        if (typeof adapter[key] === "function") api[key] = adapter[key].bind(adapter);
      });
      return loadData();
    },
    refresh: loadData
  });

  setStatsUnavailable();
  populateYears();
  loadData();
})();