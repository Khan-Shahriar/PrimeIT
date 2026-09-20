(() => {
  'use strict';

  const STATUS = Object.freeze({
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    UNPUBLISHED: 'Unpublished',
    ARCHIVED: 'Archived'
  });

  const DEFAULT_CATEGORIES = Object.freeze(['General', 'Office', 'HR', 'Holiday', 'Event', 'Policy', 'Important']);
  const DEFAULT_AUDIENCES = Object.freeze(['All Members', 'Employees', 'Administrators', 'HR', 'Custom']);

  const state = {
    announcements: [],
    filtered: [],
    loading: false,
    error: null,
    selectedId: null,
    confirmAction: null,
    lastFocusedElement: null,
    modalElement: null,
    search: '',
    status: '',
    category: '',
    audience: '',
    date: '',
    importantOnly: false,
    pinnedOnly: false
  };

  const elements = {
    sidebar: document.querySelector('#admin-sidebar'),
    sidebarToggle: document.querySelector('[data-sidebar-toggle]'),
    sidebarClose: document.querySelector('[data-sidebar-close]'),
    table: document.querySelector('[data-announcement-table]'),
    tableBody: document.querySelector('[data-announcement-body]'),
    mobileList: document.querySelector('[data-mobile-announcement-list]'),
    statePanels: {
      loading: document.querySelector('[data-state="loading"]'),
      empty: document.querySelector('[data-state="empty"]'),
      error: document.querySelector('[data-state="error"]')
    },
    emptyTitle: document.querySelector('[data-empty-title]'),
    emptyMessage: document.querySelector('[data-empty-message]'),
    errorMessage: document.querySelector('[data-error-message]'),
    resultSummary: document.querySelector('[data-result-summary]'),
    pageStatus: document.querySelector('[data-page-status]'),
    stats: {
      total: document.querySelector('[data-stat="total"]'),
      published: document.querySelector('[data-stat="published"]'),
      draft: document.querySelector('[data-stat="draft"]'),
      archived: document.querySelector('[data-stat="archived"]'),
      important: document.querySelector('[data-stat="important"]')
    },
    filters: {
      form: document.querySelector('#announcement-filters'),
      search: document.querySelector('#announcement-search'),
      status: document.querySelector('#announcement-status-filter'),
      category: document.querySelector('#announcement-category-filter'),
      audience: document.querySelector('#announcement-audience-filter'),
      date: document.querySelector('#announcement-date-filter'),
      important: document.querySelector('#announcement-important-filter'),
      pinned: document.querySelector('#announcement-pinned-filter')
    },
    modals: {
      details: document.querySelector('[data-modal="details"]'),
      form: document.querySelector('[data-modal="form"]'),
      confirm: document.querySelector('[data-modal="confirm"]')
    },
    details: {
      title: document.querySelector('#details-title'),
      description: document.querySelector('#details-description'),
      meta: document.querySelector('[data-details-meta]'),
      content: document.querySelector('[data-details-content]'),
      grid: document.querySelector('[data-details-grid]')
    },
    form: {
      element: document.querySelector('#announcement-form'),
      id: document.querySelector('#announcement-id'),
      title: document.querySelector('#announcement-title'),
      category: document.querySelector('#announcement-category'),
      summary: document.querySelector('#announcement-summary'),
      content: document.querySelector('#announcement-content'),
      audience: document.querySelector('#announcement-audience'),
      status: document.querySelector('#announcement-form-status'),
      publishedAt: document.querySelector('#announcement-publish-date'),
      important: document.querySelector('#announcement-important'),
      pinned: document.querySelector('#announcement-pinned'),
      kicker: document.querySelector('[data-form-kicker]'),
      heading: document.querySelector('#form-title'),
      error: document.querySelector('[data-form-error]'),
      state: document.querySelector('[data-form-state]'),
      summaryCount: document.querySelector('[data-summary-count]'),
      contentCount: document.querySelector('[data-content-count]')
    },
    confirm: {
      title: document.querySelector('#confirm-title'),
      description: document.querySelector('[data-confirm-description]'),
      button: document.querySelector('[data-action="confirm-action"]'),
      state: document.querySelector('[data-confirm-state]')
    },
    toast: document.querySelector('[data-toast]')
  };

  function normalizeAnnouncement(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!title) return null;

    const status = Object.values(STATUS).includes(raw.status) ? raw.status : STATUS.DRAFT;

    return {
      id: String(raw.id ?? cryptoRandomId()),
      title,
      summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
      content: typeof raw.content === 'string' ? raw.content : '',
      category: typeof raw.category === 'string' ? raw.category.trim() : '',
      author: typeof raw.author === 'string' ? raw.author.trim() : '',
      audience: typeof raw.audience === 'string' ? raw.audience.trim() : '',
      publishedAt: normalizeDateValue(raw.publishedAt),
      updatedAt: normalizeDateValue(raw.updatedAt),
      createdAt: normalizeDateValue(raw.createdAt),
      status,
      isPinned: raw.isPinned === true,
      isImportant: raw.isImportant === true
    };
  }

  function normalizeDateValue(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function cryptoRandomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  function toDateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove('show'), 2600);
  }

  function setPanel(panel, visible) {
    if (!panel) return;
    panel.hidden = !visible;
  }

  function updateStats() {
    const total = state.announcements.length;
    const published = state.announcements.filter(item => item.status === STATUS.PUBLISHED).length;
    const draft = state.announcements.filter(item => item.status === STATUS.DRAFT).length;
    const archived = state.announcements.filter(item => item.status === STATUS.ARCHIVED).length;
    const important = state.announcements.filter(item => item.isImportant || item.isPinned).length;

    elements.stats.total.textContent = String(total);
    elements.stats.published.textContent = String(published);
    elements.stats.draft.textContent = String(draft);
    elements.stats.archived.textContent = String(archived);
    elements.stats.important.textContent = String(important);

    document.querySelectorAll('[data-stat-meta]').forEach(node => {
      node.textContent = 'Current frontend state';
    });
  }

  function populateSelect(select, values, selected = '') {
    if (!select) return;
    const current = selected || select.value;
    const first = select.options[0];
    select.replaceChildren(first.cloneNode(true));

    [...new Set(values.filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b)).forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    select.value = values.includes(current) ? current : '';
  }

  function updateFilterOptions() {
    const categories = [...new Set([
      ...DEFAULT_CATEGORIES,
      ...state.announcements.map(item => item.category).filter(Boolean)
    ])];

    const audiences = [...new Set([
      ...DEFAULT_AUDIENCES,
      ...state.announcements.map(item => item.audience).filter(Boolean)
    ])];

    populateSelect(elements.filters.category, categories, state.category);
    populateSelect(elements.filters.audience, audiences, state.audience);
  }

  function getDateBucket(value) {
    if (!value) return 'older';
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'older';

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = (startToday - timestamp) / 86400000;

    if (diffDays < 1 && timestamp <= Date.now()) return 'today';
    if (diffDays >= 0 && diffDays <= 7) return '7';
    if (diffDays >= 0 && diffDays <= 30) return '30';
    return 'older';
  }

  function matchesFilters(item) {
    const search = state.search.trim().toLowerCase();
    if (search) {
      const haystack = [item.title, item.summary, item.category, item.author, item.content]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    if (state.status && item.status !== state.status) return false;
    if (state.category && item.category !== state.category) return false;
    if (state.audience && item.audience !== state.audience) return false;
    if (state.date && getDateBucket(item.publishedAt) !== state.date) return false;
    if (state.importantOnly && !item.isImportant) return false;
    if (state.pinnedOnly && !item.isPinned) return false;

    return true;
  }

  function applyFilters() {
    state.filtered = state.announcements.filter(matchesFilters);
    renderList();
  }

  function statusBadge(status) {
    const classes = {
      [STATUS.PUBLISHED]: 'success',
      [STATUS.DRAFT]: 'warning',
      [STATUS.UNPUBLISHED]: 'gray',
      [STATUS.ARCHIVED]: 'danger'
    };
    return `<span class="badge ${classes[status] || 'gray'}">${escapeHtml(status)}</span>`;
  }

  function priorityBadges(item) {
    const badges = [];
    if (item.isImportant) badges.push('<span class="badge warning">Important</span>');
    if (item.isPinned) badges.push('<span class="badge blue">Pinned</span>');
    return badges.length ? `<div class="priority-stack">${badges.join('')}</div>` : '<span class="muted">—</span>';
  }

  function actionButton(label, action, id, className = 'btn-secondary') {
    return `<button class="btn btn-sm ${className}" type="button" data-action="${action}" data-id="${escapeHtml(id)}">${label}</button>`;
  }

  function renderDesktopRows() {
    return state.filtered.map(item => `
      <tr>
        <td class="title-cell">
          <strong title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong>
          <small title="${escapeHtml(item.summary)}">${escapeHtml(item.summary || 'No summary')}</small>
        </td>
        <td>${escapeHtml(item.category || '—')}</td>
        <td>${statusBadge(item.status)}</td>
        <td>${escapeHtml(item.audience || '—')}</td>
        <td>${escapeHtml(item.author || '—')}</td>
        <td>${formatDate(item.publishedAt)}</td>
        <td>${priorityBadges(item)}</td>
        <td>
          <div class="actions">
            ${actionButton('View', 'view', item.id)}
            ${actionButton('Edit', 'edit', item.id)}
            ${item.status === STATUS.PUBLISHED
              ? actionButton('Unpublish', 'unpublish', item.id)
              : actionButton('Publish', 'publish', item.id, 'btn-primary')}
            ${item.status !== STATUS.ARCHIVED
              ? actionButton('Archive', 'archive', item.id, 'btn-secondary')
              : ''}
            ${actionButton('Delete', 'delete', item.id, 'btn-danger')}
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderMobileCards() {
    return state.filtered.map(item => `
      <article class="mobile-announcement-card">
        <div class="mobile-card-header">
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <div class="mobile-card-meta">
              ${statusBadge(item.status)}
              <span>${escapeHtml(item.category || 'Uncategorized')}</span>
              <span>${escapeHtml(item.audience || 'Audience not set')}</span>
            </div>
          </div>
          <div class="priority-stack">${priorityBadges(item)}</div>
        </div>
        <p class="mobile-card-summary">${escapeHtml(item.summary || 'No summary available.')}</p>
        <div class="mobile-card-meta">
          <span>Author: ${escapeHtml(item.author || '—')}</span>
          <span>Published: ${formatDate(item.publishedAt)}</span>
        </div>
        <div class="mobile-card-actions">
          ${actionButton('View', 'view', item.id)}
          ${actionButton('Edit', 'edit', item.id)}
          ${item.status === STATUS.PUBLISHED
            ? actionButton('Unpublish', 'unpublish', item.id)
            : actionButton('Publish', 'publish', item.id, 'btn-primary')}
          ${item.status !== STATUS.ARCHIVED
            ? actionButton('Archive', 'archive', item.id)
            : ''}
          ${actionButton('Delete', 'delete', item.id, 'btn-danger')}
        </div>
      </article>
    `).join('');
  }

  function renderList() {
    const total = state.filtered.length;
    elements.resultSummary.textContent = total
      ? `Showing ${total} of ${state.announcements.length} announcement${state.announcements.length === 1 ? '' : 's'}.`
      : state.announcements.length
        ? 'No announcements match the current search or filters.'
        : 'No announcement data available.';

    setPanel(elements.statePanels.loading, state.loading);
    setPanel(elements.statePanels.error, Boolean(state.error) && !state.loading);
    setPanel(elements.statePanels.empty, !state.loading && !state.error && total === 0);
    elements.table.hidden = state.loading || Boolean(state.error) || total === 0;
    elements.mobileList.hidden = elements.table.hidden;

    if (state.error) {
      elements.errorMessage.textContent = state.error.message || 'Please try again later.';
    }

    if (state.announcements.length && total === 0) {
      elements.emptyTitle.textContent = 'No matching announcements.';
      elements.emptyMessage.textContent = 'No announcements match your current search or filters. Clear the filters to view all available records.';
    } else {
      elements.emptyTitle.textContent = 'No announcements available.';
      elements.emptyMessage.textContent = 'Announcements will appear here when the future REST API supplies authoritative data. No production announcements are fabricated by this frontend.';
    }

    elements.tableBody.replaceChildren();
    elements.mobileList.replaceChildren();

    if (total) {
      elements.tableBody.innerHTML = renderDesktopRows();
      elements.mobileList.innerHTML = renderMobileCards();
    }

    updateStats();
  }

  function renderLoading() {
    state.loading = true;
    state.error = null;
    renderList();
  }

  function renderError(error) {
    state.loading = false;
    state.error = error instanceof Error ? error : new Error('Unable to load announcements.');
    renderList();
  }

  function setFormError(id, message) {
    const field = document.querySelector('#' + id);
    const error = document.querySelector('#' + id + '-error');
    field?.closest('.field')?.classList.toggle('has-error', Boolean(message));
    if (error) error.textContent = message || '';
    if (message) field?.setAttribute('aria-invalid', 'true');
    else field?.removeAttribute('aria-invalid');
  }

  function clearFormErrors() {
    ['announcement-title', 'announcement-category', 'announcement-summary', 'announcement-content'].forEach(id => setFormError(id, ''));
    elements.form.error.textContent = '';
  }

  function validateForm() {
    clearFormErrors();
    let valid = true;

    if (!elements.form.title.value.trim()) {
      setFormError('announcement-title', 'Title is required.');
      valid = false;
    }

    if (!elements.form.category.value) {
      setFormError('announcement-category', 'Category is required.');
      valid = false;
    }

    if (!elements.form.content.value.trim()) {
      setFormError('announcement-content', 'Content is required.');
      valid = false;
    }

    return valid;
  }

  function updateCounter(input, output, max) {
    if (input && output) output.textContent = `${input.value.length} / ${max}`;
  }

  function resetForm() {
    elements.form.element.reset();
    elements.form.id.value = '';
    elements.form.status.value = STATUS.DRAFT;
    elements.form.kicker.textContent = 'Create announcement';
    elements.form.heading.textContent = 'Add Announcement';
    elements.form.state.textContent = '';
    elements.form.error.textContent = '';
    clearFormErrors();
    updateCounter(elements.form.summary, elements.form.summaryCount, 500);
    updateCounter(elements.form.content, elements.form.contentCount, 10000);
  }

  function populateForm(item) {
    resetForm();
    elements.form.id.value = item.id;
    elements.form.title.value = item.title;
    elements.form.category.value = item.category;
    elements.form.summary.value = item.summary;
    elements.form.content.value = item.content;
    elements.form.audience.value = item.audience;
    elements.form.status.value = item.status;
    elements.form.publishedAt.value = toDateTimeLocal(item.publishedAt);
    elements.form.important.checked = item.isImportant;
    elements.form.pinned.checked = item.isPinned;
    elements.form.kicker.textContent = 'Edit announcement';
    elements.form.heading.textContent = 'Edit Announcement';
    updateCounter(elements.form.summary, elements.form.summaryCount, 500);
    updateCounter(elements.form.content, elements.form.contentCount, 10000);
  }

  function openModal(name, trigger) {
    const modal = elements.modals[name];
    if (!modal) return;

    state.lastFocusedElement = trigger || document.activeElement;
    state.modalElement = modal;
    modal.hidden = false;
    document.body.classList.add('modal-open');

    const focusTarget = modal.querySelector('.modal-close, input, select, textarea, button');
    window.requestAnimationFrame(() => focusTarget?.focus());
  }

  function closeModal() {
    if (!state.modalElement) return;

    state.modalElement.hidden = true;
    document.body.classList.remove('modal-open');
    state.modalElement = null;

    const trigger = state.lastFocusedElement;
    state.lastFocusedElement = null;
    trigger?.focus?.();
  }

  function openCreate(trigger) {
    resetForm();
    openModal('form', trigger);
  }

  function openDetails(id, trigger) {
    const item = state.announcements.find(record => record.id === String(id));
    if (!item) return;

    state.selectedId = item.id;
    elements.details.title.textContent = item.title;
    elements.details.description.textContent = item.summary || 'Review the announcement information.';
    elements.details.meta.innerHTML = [
      statusBadge(item.status),
      item.category ? `<span class="badge gray">${escapeHtml(item.category)}</span>` : '',
      item.isImportant ? '<span class="badge warning">Important</span>' : '',
      item.isPinned ? '<span class="badge blue">Pinned</span>' : ''
    ].filter(Boolean).join('');

    elements.details.content.replaceChildren();
    const paragraphs = String(item.content || 'No additional details are available.')
      .split(/\n\s*\n/)
      .filter(Boolean);

    paragraphs.forEach(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      elements.details.content.appendChild(paragraph);
    });

    const details = [
      ['Audience', item.audience || '—'],
      ['Author', item.author || '—'],
      ['Category', item.category || '—'],
      ['Published', formatDateTime(item.publishedAt)],
      ['Updated', formatDateTime(item.updatedAt)],
      ['Created', formatDateTime(item.createdAt)]
    ];

    elements.details.grid.replaceChildren();
    details.forEach(([label, value]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'detail-item';
      const labelNode = document.createElement('span');
      labelNode.className = 'detail-label';
      labelNode.textContent = label;
      const valueNode = document.createElement('span');
      valueNode.className = 'detail-value';
      valueNode.textContent = value;
      wrapper.append(labelNode, valueNode);
      elements.details.grid.appendChild(wrapper);
    });

    openModal('details', trigger);
  }

  function openEdit(id, trigger) {
    const item = state.announcements.find(record => record.id === String(id));
    if (!item) return;
    populateForm(item);
    openModal('form', trigger);
  }

  function openConfirmation(action, id, trigger) {
    const item = state.announcements.find(record => record.id === String(id));
    if (!item) return;

    state.selectedId = item.id;
    state.confirmAction = action;

    const labels = {
      publish: ['Publish announcement?', `Publish “${item.title}”? It will be marked Published in the current frontend state.`, 'Publish'],
      unpublish: ['Unpublish announcement?', `Unpublish “${item.title}”? It will be marked Unpublished in the current frontend state.`, 'Unpublish'],
      archive: ['Archive announcement?', `Archive “${item.title}”? Archived records will remain available to the management interface until the server defines retention behavior.`, 'Archive'],
      delete: ['Delete announcement?', `Delete “${item.title}”? This is a destructive action. The frontend will only update its temporary in-memory state until a backend is connected.`, 'Delete']
    };

    const [title, description, button] = labels[action] || ['Confirm action', 'Confirm this announcement action.', 'Confirm'];
    elements.confirm.title.textContent = title;
    elements.confirm.description.textContent = description;
    elements.confirm.button.textContent = button;
    elements.confirm.button.classList.toggle('btn-danger', action === 'delete' || action === 'archive');
    elements.confirm.button.classList.toggle('btn-primary', action === 'publish');
    elements.confirm.state.textContent = '';
    openModal('confirm', trigger);
  }

  function applyLocalStatusChange(action) {
    const index = state.announcements.findIndex(item => item.id === state.selectedId);
    if (index < 0) return;

    if (action === 'delete') {
      state.announcements.splice(index, 1);
    } else {
      const nextStatus = {
        publish: STATUS.PUBLISHED,
        unpublish: STATUS.UNPUBLISHED,
        archive: STATUS.ARCHIVED
      }[action];

      if (nextStatus) {
        state.announcements[index].status = nextStatus;
        if (nextStatus === STATUS.PUBLISHED && !state.announcements[index].publishedAt) {
          state.announcements[index].publishedAt = new Date().toISOString();
        }
        state.announcements[index].updatedAt = new Date().toISOString();
      }
    }

    applyFilters();
  }

  function confirmAction() {
    const action = state.confirmAction;
    if (!action) return;

    elements.confirm.button.disabled = true;
    elements.confirm.state.textContent = 'Updating frontend state…';

    window.setTimeout(() => {
      applyLocalStatusChange(action);
      elements.confirm.button.disabled = false;
      elements.confirm.state.textContent = 'Updated in current frontend state. No backend request was made.';
      showToast('Frontend state updated; backend integration is still pending.');
      window.setTimeout(closeModal, 700);
    }, 250);
  }

  function serializeForm() {
    const formData = new FormData(elements.form.element);
    const intent = formData.get('intent') === 'publish' ? STATUS.PUBLISHED : STATUS.DRAFT;

    return {
      id: elements.form.id.value || cryptoRandomId(),
      title: elements.form.title.value.trim(),
      summary: elements.form.summary.value.trim(),
      content: elements.form.content.value,
      category: elements.form.category.value,
      author: '',
      audience: elements.form.audience.value,
      publishedAt: elements.form.publishedAt.value ? new Date(elements.form.publishedAt.value).toISOString() : '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: elements.form.status.value || intent,
      isPinned: elements.form.pinned.checked,
      isImportant: elements.form.important.checked
    };
  }

  function saveForm(event) {
    event.preventDefault();

    const intent = event.submitter?.value === 'publish' ? 'publish' : 'draft';
    if (!validateForm()) {
      elements.form.state.textContent = 'Please correct the highlighted fields.';
      return;
    }

    const payload = serializeForm();
    payload.status = intent === 'publish' ? STATUS.PUBLISHED : STATUS.DRAFT;
    if (payload.status === STATUS.PUBLISHED && !payload.publishedAt) {
      payload.publishedAt = new Date().toISOString();
    }

    const existingIndex = state.announcements.findIndex(item => item.id === payload.id);
    const existing = existingIndex >= 0 ? state.announcements[existingIndex] : null;

    payload.createdAt = existing?.createdAt || payload.createdAt;
    payload.author = existing?.author || '';

    const normalized = normalizeAnnouncement(payload);
    if (!normalized) {
      elements.form.error.textContent = 'Unable to prepare the announcement data.';
      return;
    }

    elements.form.element.querySelectorAll('button').forEach(button => { button.disabled = true; });
    elements.form.state.textContent = 'Preparing announcement…';

    window.setTimeout(() => {
      if (existingIndex >= 0) state.announcements[existingIndex] = normalized;
      else state.announcements.unshift(normalized);

      updateFilterOptions();
      applyFilters();
      elements.form.element.querySelectorAll('button').forEach(button => { button.disabled = false; });
      elements.form.state.textContent = 'Prepared in current frontend state. No backend request was made.';
      showToast(intent === 'publish'
        ? 'Announcement prepared for publishing; backend integration is pending.'
        : 'Announcement saved as a local draft; backend integration is pending.');
      window.setTimeout(closeModal, 700);
    }, 250);
  }

  function resetFilters() {
    elements.filters.form.reset();
    state.search = '';
    state.status = '';
    state.category = '';
    state.audience = '';
    state.date = '';
    state.importantOnly = false;
    state.pinnedOnly = false;
    applyFilters();
  }

  function readFilters() {
    state.search = elements.filters.search.value;
    state.status = elements.filters.status.value;
    state.category = elements.filters.category.value;
    state.audience = elements.filters.audience.value;
    state.date = elements.filters.date.value;
    state.importantOnly = elements.filters.important.checked;
    state.pinnedOnly = elements.filters.pinned.checked;
    applyFilters();
  }

  function handleListAction(event) {
    const button = event.target.closest('[data-action][data-id]');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === 'view') openDetails(id, button);
    if (action === 'edit') openEdit(id, button);
    if (['publish', 'unpublish', 'archive', 'delete'].includes(action)) openConfirmation(action, id, button);
  }

  function setupNavigation() {
    elements.sidebarToggle?.addEventListener('click', () => {
      const isOpen = elements.sidebar.classList.toggle('open');
      elements.sidebarToggle.setAttribute('aria-expanded', String(isOpen));
      elements.sidebarToggle.setAttribute('aria-label', isOpen ? 'Close admin navigation' : 'Open admin navigation');
      if (elements.sidebarClose) elements.sidebarClose.hidden = !isOpen;
    });

    elements.sidebarClose?.addEventListener('click', closeSidebar);

    elements.sidebar?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeSidebar);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && elements.sidebar?.classList.contains('open')) {
        closeSidebar();
      }
    });
  }

  function closeSidebar() {
    elements.sidebar?.classList.remove('open');
    elements.sidebarToggle?.setAttribute('aria-expanded', 'false');
    elements.sidebarToggle?.setAttribute('aria-label', 'Open admin navigation');
    if (elements.sidebarClose) elements.sidebarClose.hidden = true;
  }

  function trapModalFocus(event) {
    if (event.key !== 'Tab' || !state.modalElement || state.modalElement.hidden) return;

    const focusable = [...state.modalElement.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    )].filter(node => !node.hidden);

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

  function handleGlobalClick(event) {
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) return;

    const action = actionElement.dataset.action;

    if (action === 'open-create') openCreate(actionElement);
    if (action === 'refresh' || action === 'retry') initialize();
    if (action === 'reset-filters') resetFilters();
    if (action === 'close-modal') closeModal();
    if (action === 'edit-selected' && state.selectedId) {
      const selected = state.announcements.find(item => item.id === state.selectedId);
      if (selected) {
        closeModal();
        window.setTimeout(() => openEdit(selected.id), 0);
      }
    }
    if (action === 'confirm-action') confirmAction();
    if (action === 'logout') {
      showToast('Logout will be handled by the future authentication service.');
    }
  }

  function setupModalBehavior() {
    Object.values(elements.modals).forEach(modal => {
      modal?.addEventListener('click', event => {
        if (event.target === modal) closeModal();
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.modalElement && !state.modalElement.hidden) {
        event.preventDefault();
        closeModal();
        return;
      }
      trapModalFocus(event);
    });
  }

  function setupForms() {
    elements.form.element?.addEventListener('submit', saveForm);

    elements.form.summary?.addEventListener('input', () => updateCounter(elements.form.summary, elements.form.summaryCount, 500));
    elements.form.content?.addEventListener('input', () => updateCounter(elements.form.content, elements.form.contentCount, 10000));

    [elements.form.title, elements.form.category, elements.form.content].forEach(field => {
      field?.addEventListener('input', () => {
        const id = field.id;
        if (field.value.trim()) setFormError(id, '');
      });
      field?.addEventListener('change', () => {
        if (field.value.trim()) setFormError(field.id, '');
      });
    });
  }

  function setupFilters() {
    elements.filters.form?.addEventListener('input', readFilters);
    elements.filters.form?.addEventListener('change', readFilters);
  }

  function setupEvents() {
    elements.tableBody?.addEventListener('click', handleListAction);
    elements.mobileList?.addEventListener('click', handleListAction);
    document.addEventListener('click', handleGlobalClick);
    setupNavigation();
    setupModalBehavior();
    setupForms();
    setupFilters();
  }

  /*
   * REST API boundary:
   * Keep network operations isolated here. Do not add guessed production
   * endpoints until the backend contract is finalized.
   *
   * Expected conceptual operations:
   * GET collection
   * GET one announcement
   * POST announcement
   * PUT/PATCH announcement
   * PATCH publication state
   * PATCH important/pinned state
   * DELETE/archive announcement
   *
   * Authentication will later rely on server-issued HTTP-only cookies.
   * No JWT, role, permission, or authorization state is read from browser storage.
   */
  async function loadAnnouncements() {
    return [];
  }

  async function initialize() {
    renderLoading();
    try {
      const data = await loadAnnouncements();
      state.announcements = Array.isArray(data)
        ? data.map(normalizeAnnouncement).filter(Boolean)
        : [];
      state.loading = false;
      state.error = null;
      updateFilterOptions();
      applyFilters();
      elements.pageStatus.textContent = 'Announcement data is ready for future REST API integration.';
    } catch (error) {
      renderError(error);
      elements.pageStatus.textContent = 'Announcement data could not be loaded.';
    }
  }

  /*
   * Future integration boundary. Backend responses can be passed here after
   * server-side authentication/authorization and schema validation are added.
   */
  window.PrimeItAdminAnnouncements = Object.freeze({
    setData(data) {
      state.announcements = Array.isArray(data)
        ? data.map(normalizeAnnouncement).filter(Boolean)
        : [];
      state.loading = false;
      state.error = null;
      updateFilterOptions();
      applyFilters();
    },
    reload: initialize
  });

  setupEvents();
  initialize();
})();