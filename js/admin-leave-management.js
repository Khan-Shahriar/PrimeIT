(() => {
  "use strict";

  const state = {
    requests: [],
    balances: [],
    filteredRequests: [],
    selectedRequest: null,
    decision: null,
    page: 1,
    pageSize: 10,
    lastFocused: null,
    busy: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const els = {
    sidebar: $("#admin-sidebar"),
    toggle: $("[data-sidebar-toggle]"),
    backdrop: $("[data-sidebar-close]"),
    filters: $("#leave-filters"),
    search: $("#leave-search"),
    status: $("#leave-status"),
    type: $("#leave-type"),
    department: $("#leave-department"),
    from: $("#leave-from"),
    to: $("#leave-to"),
    dateError: $("#date-filter-error"),
    table: $("[data-request-table]"),
    body: $("[data-request-body]"),
    summary: $("[data-result-summary]"),
    pagination: $("[data-pagination]"),
    balanceState: $("[data-balance-state]"),
    balanceTable: $("[data-balance-table]"),
    balanceBody: $("[data-balance-body]"),
    detailsModal: $('[data-modal="details"]'),
    decisionModal: $('[data-modal="decision"]'),
    details: $("[data-details]"),
    decisionTitle: $("#decision-title"),
    decisionDescription: $("[data-decision-description]"),
    decisionKicker: $("[data-decision-kicker]"),
    decisionState: $("[data-decision-state]"),
    commentField: $("[data-comment-field]"),
    comment: $("#review-comment"),
    commentCount: $("[data-comment-count]"),
    commentError: $("[data-comment-error]"),
    toast: $("[data-toast]"),
    pageStatus: $("[data-page-status]")
  };

  const api = {
    // Future REST adapter boundary. Section 18 intentionally does not define endpoints.
    async listLeaveRequests() { throw new Error("API_NOT_CONNECTED"); },
    async getLeaveStatistics() { throw new Error("API_NOT_CONNECTED"); },
    async getLeaveBalances() { throw new Error("API_NOT_CONNECTED"); },
    async reviewLeaveRequest() { throw new Error("API_NOT_CONNECTED"); }
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[char]));
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value + (String(value).length === 10 ? "T00:00:00" : ""));
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en", {month:"short", day:"numeric", year:"numeric"}).format(date);
  }

  function statusClass(status) {
    return ({
      Pending:"status-pending", Approved:"status-approved", Rejected:"status-rejected",
      Cancelled:"status-cancelled", Withdrawn:"status-withdrawn"
    }[status] || "status-pending");
  }

  function setState(name, message) {
    $$("[data-state]").forEach(node => { node.hidden = node.dataset.state !== name; });
    if (message) $("[data-error-message]").textContent = message;
  }

  function setStats(stats = null) {
    const keys = ["total","pending","approved","rejected"];
    keys.forEach(key => {
      const value = stats && Number.isFinite(Number(stats[key])) ? Number(stats[key]) : null;
      const node = $(`[data-stat="${key}"]`);
      const meta = $(`[data-stat-meta="${key}"]`);
      node.textContent = value === null ? "—" : String(value);
      meta.textContent = value === null ? "Unavailable" : "Current data";
    });
  }

  function populateDepartments(requests) {
    const current = els.department.value;
    const departments = [...new Set(requests.map(item => item.department).filter(Boolean))].sort();
    els.department.innerHTML = '<option value="">All departments</option>' +
      departments.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    els.department.value = departments.includes(current) ? current : "";
  }

  function validateDateRange() {
    els.dateError.textContent = "";
    if (els.from.value && els.to.value && els.from.value > els.to.value) {
      els.dateError.textContent = "From date must be on or before the To date.";
      return false;
    }
    return true;
  }

  function matchesFilters(item) {
    const query = els.search.value.trim().toLowerCase();
    const fields = [item.memberName,item.memberId,item.department,item.requestId].map(v => String(v || "").toLowerCase());
    const queryMatch = !query || fields.some(v => v.includes(query));
    const statusMatch = !els.status.value || item.status === els.status.value;
    const typeMatch = !els.type.value || item.leaveType === els.type.value;
    const departmentMatch = !els.department.value || item.department === els.department.value;
    const fromMatch = !els.from.value || String(item.endDate || "") >= els.from.value;
    const toMatch = !els.to.value || String(item.startDate || "") <= els.to.value;
    return queryMatch && statusMatch && typeMatch && departmentMatch && fromMatch && toMatch;
  }

  function renderRequests() {
    if (!validateDateRange()) return;
    state.filteredRequests = state.requests.filter(matchesFilters);
    state.page = Math.min(state.page, Math.max(1, Math.ceil(state.filteredRequests.length / state.pageSize)));
    const start = (state.page - 1) * state.pageSize;
    const pageItems = state.filteredRequests.slice(start, start + state.pageSize);

    els.summary.textContent = state.requests.length
      ? `${state.filteredRequests.length} matching request${state.filteredRequests.length === 1 ? "" : "s"}`
      : "No request data available.";

    if (!state.requests.length) {
      els.table.hidden = true;
      els.pagination.hidden = true;
      setState("empty");
      return;
    }
    if (!pageItems.length) {
      els.table.hidden = true;
      els.pagination.hidden = true;
      setState("empty");
      $("[data-state='empty'] strong").textContent = "No matching leave requests.";
      $("[data-state='empty'] p").textContent = "Try changing or resetting the search and filters.";
      return;
    }

    setState("ready");
    els.table.hidden = false;
    els.body.innerHTML = pageItems.map(item => {
      const status = escapeHtml(item.status);
      const pending = item.status === "Pending";
      return `<tr>
        <td><div class="member-cell"><strong>${escapeHtml(item.memberName)}</strong><span>${escapeHtml(item.memberId || "Member ID unavailable")} · ${escapeHtml(item.department || "Department unavailable")}</span></div></td>
        <td>${escapeHtml(item.leaveType)}</td>
        <td><time datetime="${escapeHtml(item.startDate || "")}">${formatDate(item.startDate)}</time> – <time datetime="${escapeHtml(item.endDate || "")}">${formatDate(item.endDate)}</time></td>
        <td>${escapeHtml(item.duration ?? "—")}</td>
        <td><time datetime="${escapeHtml(item.submittedAt || "")}">${formatDate(item.submittedAt)}</time></td>
        <td><span class="status-badge ${statusClass(item.status)}">${status}</span></td>
        <td><div class="row-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-action="details" data-request-id="${escapeHtml(item.requestId)}">Details</button>
          ${pending ? `<button class="btn btn-primary btn-sm" type="button" data-action="approve" data-request-id="${escapeHtml(item.requestId)}">Approve</button><button class="btn btn-danger btn-sm" type="button" data-action="reject" data-request-id="${escapeHtml(item.requestId)}">Reject</button>` : ""}
        </div></td>
      </tr>`;
    }).join("");
    renderPagination();
  }

  function renderPagination() {
    const pages = Math.ceil(state.filteredRequests.length / state.pageSize);
    els.pagination.innerHTML = "";
    els.pagination.hidden = pages <= 1;
    if (pages <= 1) return;
    const previous = document.createElement("button");
    previous.type = "button"; previous.textContent = "Previous"; previous.disabled = state.page === 1;
    previous.dataset.page = String(state.page - 1);
    els.pagination.append(previous);
    for (let page = 1; page <= pages; page++) {
      const button = document.createElement("button");
      button.type = "button"; button.textContent = String(page);
      button.dataset.page = String(page);
      if (page === state.page) button.setAttribute("aria-current","page");
      els.pagination.append(button);
    }
    const next = document.createElement("button");
    next.type = "button"; next.textContent = "Next"; next.disabled = state.page === pages;
    next.dataset.page = String(state.page + 1);
    els.pagination.append(next);
  }

  function renderBalances() {
    const hasData = Array.isArray(state.balances) && state.balances.length > 0;
    els.balanceState.hidden = hasData;
    els.balanceTable.hidden = !hasData;
    if (!hasData) return;
    els.balanceBody.innerHTML = state.balances.map(item => `<tr><td>${escapeHtml(item.memberName)}</td><td>${escapeHtml(item.leaveType)}</td><td>${escapeHtml(item.used ?? "—")}</td><td>${escapeHtml(item.remaining ?? "—")}</td></tr>`).join("");
  }

  function requestById(id) {
    return state.requests.find(item => String(item.requestId) === String(id)) || null;
  }

  function openModal(modal) {
    state.lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    $(".modal", modal)?.focus();
  }

  function closeModals() {
    $$("[data-modal]").forEach(modal => { modal.hidden = true; });
    document.body.classList.remove("modal-open");
    if (state.lastFocused instanceof HTMLElement) state.lastFocused.focus();
    state.selectedRequest = null;
    state.decision = null;
  }

  function renderDetails(request) {
    const entries = [
      ["Request ID", request.requestId],
      ["Member", request.memberName],
      ["Member ID", request.memberId],
      ["Department", request.department],
      ["Leave type", request.leaveType],
      ["Start date", formatDate(request.startDate)],
      ["End date", formatDate(request.endDate)],
      ["Duration", request.duration],
      ["Status", request.status],
      ["Submitted", formatDate(request.submittedAt)],
      ["Reviewed", formatDate(request.reviewedAt)],
      ["Reviewed by", request.reviewedBy],
      ["Reason", request.reason, true],
      ["Reviewer comment", request.reviewerComment, true],
      ["Conflict information", request.conflictMessage, true]
    ];
    els.details.innerHTML = entries.filter(([,value]) => value !== undefined && value !== null && value !== "")
      .map(([label,value,full]) => `<div class="detail-item${full ? " full" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
    const pending = request.status === "Pending";
    $("[data-modal='details'] [data-action='approve']").hidden = !pending;
    $("[data-modal='details'] [data-action='reject']").hidden = !pending;
    $("[data-modal-state]").textContent = "";
  }

  function openDetails(request) {
    state.selectedRequest = request;
    renderDetails(request);
    openModal(els.detailsModal);
  }

  function openDecision(action) {
    if (!state.selectedRequest || state.selectedRequest.status !== "Pending") return;
    state.decision = action;
    els.decisionKicker.textContent = action === "approve" ? "Approve request" : "Reject request";
    els.decisionTitle.textContent = action === "approve" ? "Approve this leave request?" : "Reject this leave request?";
    els.decisionDescription.textContent = action === "approve"
      ? "Confirming will prepare an approval operation for the future backend. This page will not change the request without server confirmation."
      : "Confirming will prepare a rejection operation for the future backend. Add a reviewer comment if appropriate.";
    els.commentField.hidden = action !== "reject";
    els.comment.value = "";
    els.commentCount.textContent = "0 / 1000";
    els.commentError.textContent = "";
    els.decisionState.textContent = "";
    els.decisionModal.querySelector(".btn-primary").textContent = action === "approve" ? "Confirm approval" : "Confirm rejection";
    openModal(els.decisionModal);
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2800);
  }

  async function loadData() {
    setState("loading");
    els.pageStatus.textContent = "Loading leave data…";
    try {
      const [requests, stats, balances] = await Promise.all([
        api.listLeaveRequests(),
        api.getLeaveStatistics(),
        api.getLeaveBalances()
      ]);
      state.requests = Array.isArray(requests) ? requests : [];
      state.balances = Array.isArray(balances) ? balances : [];
      populateDepartments(state.requests);
      setStats(stats);
      renderBalances();
      renderRequests();
      els.pageStatus.textContent = "Leave data loaded.";
    } catch (error) {
      if (error?.message === "API_NOT_CONNECTED") {
        state.requests = [];
        state.balances = [];
        setStats(null);
        renderBalances();
        setState("empty");
        els.summary.textContent = "No request data available.";
        els.pageStatus.textContent = "Leave data is awaiting REST API integration.";
        return;
      }
      setState("error", "The leave service did not return usable data. No local production data has been substituted.");
      els.pageStatus.textContent = "Leave data could not be loaded.";
    }
  }

  function setSidebar(open) {
    els.sidebar.classList.toggle("open", open);
    els.toggle?.setAttribute("aria-expanded", String(open));
    if (els.backdrop) els.backdrop.hidden = !open;
  }

  document.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "refresh" || action === "retry") { loadData(); return; }
    if (action === "reset-filters") {
      els.filters.reset(); els.dateError.textContent = ""; state.page = 1; renderRequests(); return;
    }
    if (action === "close-modal") { closeModals(); return; }
    if (action === "details") {
      const request = requestById(actionButton.dataset.requestId);
      if (request) openDetails(request);
      return;
    }
    if (action === "approve" || action === "reject") { openDecision(action); return; }
    if (action === "submit-decision") { submitDecision(); return; }
  });

  els.pagination.addEventListener("click", event => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    const page = Number(button.dataset.page);
    if (Number.isInteger(page) && page >= 1) { state.page = page; renderRequests(); }
  });

  els.filters.addEventListener("input", () => { state.page = 1; renderRequests(); });
  els.filters.addEventListener("change", () => { state.page = 1; renderRequests(); });

  els.comment.addEventListener("input", () => {
    els.commentCount.textContent = `${els.comment.value.length} / 1000`;
    els.commentError.textContent = "";
  });

  els.toggle?.addEventListener("click", () => setSidebar(!els.sidebar.classList.contains("open")));
  els.backdrop?.addEventListener("click", () => setSidebar(false));
  $$(".sidebar a").forEach(link => link.addEventListener("click", () => setSidebar(false)));

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !els.detailsModal.hidden) closeModals();
    if (event.key === "Escape" && !els.decisionModal.hidden) closeModals();
    if (event.key === "Escape" && els.sidebar.classList.contains("open")) setSidebar(false);
  });

  async function submitDecision() {
    if (state.busy || !state.selectedRequest || !state.decision) return;
    if (state.decision === "reject" && els.comment.value.trim().length > 1000) {
      els.commentError.textContent = "Reviewer comment is too long.";
      return;
    }

    state.busy = true;
    const submitButton = $("[data-action='submit-decision']", els.decisionModal);
    submitButton.disabled = true;
    els.decisionState.textContent = "Preparing request…";

    try {
      await api.reviewLeaveRequest({
        requestId: state.selectedRequest.requestId,
        decision: state.decision,
        reviewerComment: els.comment.value.trim()
      });
      // The real implementation must update only after authoritative server confirmation.
      els.decisionState.textContent = "The backend must confirm this operation before the request status is changed.";
      showToast("Leave action is not connected to the backend yet.");
    } catch (error) {
      if (error?.message === "API_NOT_CONNECTED") {
        els.decisionState.textContent = "REST API integration is required before this action can be completed. No request status was changed.";
        return;
      }
      els.decisionState.textContent = "The leave service rejected or could not complete the operation. No local status was changed.";
    } finally {
      state.busy = false;
      submitButton.disabled = false;
    }
  }

  // Public integration hook for a future backend adapter. It does not grant authorization.
  window.PrimeItLeaveManagement = Object.freeze({
    setApi(adapter) {
      if (!adapter || typeof adapter !== "object") throw new TypeError("A leave API adapter is required.");
      Object.keys(api).forEach(key => {
        if (typeof adapter[key] === "function") api[key] = adapter[key].bind(adapter);
      });
      return loadData();
    },
    refresh: loadData
  });

  setStats(null);
  renderBalances();
  loadData();
})();