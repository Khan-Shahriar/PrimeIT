(() => {
  'use strict';

  const state = {
    announcements: [],
    filtered: [],
    page: 1,
    pageSize: 8,
    search: '',
    category: 'all',
    pinnedOnly: false,
    loading: true,
    error: null,
    lastFocusedElement: null
  };

  const elements = {
    sidebar: document.querySelector('#member-sidebar'),
    mobileToggle: document.querySelector('.mobile-toggle'),
    search: document.querySelector('#announcement-search'),
    clearSearch: document.querySelector('#clear-search'),
    category: document.querySelector('#announcement-category'),
    pinnedOnly: document.querySelector('#pinned-only'),
    reset: document.querySelector('#reset-filters'),
    list: document.querySelector('#announcement-list'),
    status: document.querySelector('#announcement-status'),
    count: document.querySelector('#announcement-count'),
    summary: document.querySelector('#results-summary'),
    pagination: document.querySelector('#announcement-pagination'),
    modal: document.querySelector('#announcement-modal'),
    modalClose: document.querySelector('#modal-close'),
    modalMeta: document.querySelector('#modal-meta'),
    modalTitle: document.querySelector('#modal-title'),
    modalSummary: document.querySelector('#modal-summary'),
    modalContent: document.querySelector('#modal-content')
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[character]));
  }

  function normalizeAnnouncement(item) {
    if (!item || typeof item !== 'object') return null;

    const content = typeof item.content === 'string' ? item.content.trim() : '';
    const summary = typeof item.summary === 'string' ? item.summary.trim() : '';

    return {
      id: String(item.id ?? ''),
      title: typeof item.title === 'string' ? item.title.trim() : '',
      content,
      summary: summary || content.slice(0, 180),
      category: typeof item.category === 'string' ? item.category.trim() : '',
      author: typeof item.author === 'string' ? item.author.trim() : '',
      publishedAt: item.publishedAt || '',
      updatedAt: item.updatedAt || '',
      isPinned: item.isPinned === true,
      status: typeof item.status === 'string' ? item.status.trim().toLowerCase() : ''
    };
  }

  function isMemberVisible(item) {
    // The server must enforce visibility. This is only a defensive client-side
    // guard for data accidentally containing an obvious non-published status.
    if (!item || !item.status) return true;
    return item.status === 'published';
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function getSortableTime(item) {
    const value = item.publishedAt || item.updatedAt;
    const time = value ? new Date(value).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
  }

  function getSearchText(item) {
    return [
      item.title,
      item.summary,
      item.content,
      item.category
    ].join(' ').toLowerCase();
  }

  function renderLoading() {
    elements.status.innerHTML = `
      <div class="skeleton-list" aria-label="Loading announcements">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>`;
    elements.list.innerHTML = '';
    elements.pagination.hidden = true;
    elements.summary.textContent = '';
  }

  function renderStatus(type, title, message, showRetry = false) {
    const icon = type === 'error' ? '!' : 'i';
    const retry = showRetry
      ? '<button class="btn btn-secondary retry-button" id="announcement-retry" type="button">Try again</button>'
      : '';

    elements.status.innerHTML = `
      <div class="status-panel ${type}">
        <div class="status-icon" aria-hidden="true">${icon}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        ${retry}
      </div>`;

    elements.status.querySelector('#announcement-retry')?.addEventListener('click', initialize);
    elements.list.innerHTML = '';
    elements.pagination.hidden = true;
  }

  function updateCategoryOptions() {
    const categories = [...new Set(
      state.announcements
        .map(item => item.category)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    const current = state.category;
    elements.category.innerHTML = '<option value="all">All categories</option>';

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      elements.category.appendChild(option);
    });

    elements.category.value = categories.includes(current) ? current : 'all';
    state.category = elements.category.value;
  }

  function applyFilters() {
    const query = state.search.trim().toLowerCase();

    state.filtered = state.announcements
      .filter(isMemberVisible)
      .filter(item => !query || getSearchText(item).includes(query))
      .filter(item => state.category === 'all' || item.category === state.category)
      .filter(item => !state.pinnedOnly || item.isPinned)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return getSortableTime(b) - getSortableTime(a);
      });

    const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(state.page, maxPage);

    renderResults();
  }

  function renderCard(item) {
    const date = formatDate(item.publishedAt || item.updatedAt);
    const meta = [
      item.category ? `<span class="badge category-badge">${escapeHtml(item.category)}</span>` : '',
      date ? `<span>${escapeHtml(date)}</span>` : '',
      item.author ? `<span>By ${escapeHtml(item.author)}</span>` : ''
    ].filter(Boolean).join('<span aria-hidden="true">·</span>');

    const pin = item.isPinned
      ? '<span class="badge warning">Important</span>'
      : '';

    const summary = item.summary
      ? `<p class="announcement-summary">${escapeHtml(item.summary)}</p>`
      : '';

    return `
      <article class="announcement-card ${item.isPinned ? 'is-pinned' : ''}" data-announcement-id="${escapeHtml(item.id)}">
        <div class="announcement-card-header">
          <div class="announcement-title-wrap">
            <h3 class="announcement-title">${escapeHtml(item.title || 'Announcement')}</h3>
            <div class="announcement-meta">${meta || '<span>Announcement</span>'}</div>
          </div>
          ${pin}
        </div>
        ${summary}
        <div class="announcement-footer">
          ${item.isPinned ? '<span class="pinned-marker">● Important announcement</span>' : '<span class="muted">Member update</span>'}
          <button class="read-button" type="button" data-action="view" data-id="${escapeHtml(item.id)}">Read announcement →</button>
        </div>
      </article>`;
  }

  function renderResults() {
    if (state.loading || state.error) return;

    const total = state.filtered.length;
    const start = (state.page - 1) * state.pageSize;
    const visible = state.filtered.slice(start, start + state.pageSize);

    elements.count.textContent = String(state.announcements.length);
    elements.summary.textContent = total
      ? `Showing ${start + 1}–${Math.min(start + visible.length, total)} of ${total}`
      : '';

    if (!total) {
      const hasFilters = state.search || state.category !== 'all' || state.pinnedOnly;
      renderStatus(
        'empty',
        hasFilters ? 'No matching announcements' : 'No announcements available',
        hasFilters
          ? 'No announcements match your current search or filters.'
          : 'There are no member announcements available right now.'
      );
      return;
    }

    elements.status.innerHTML = '';
    elements.list.innerHTML = visible.map(renderCard).join('');
    elements.pagination.hidden = total <= state.pageSize;
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    if (totalPages <= 1) {
      elements.pagination.innerHTML = '';
      elements.pagination.hidden = true;
      return;
    }

    const buttons = [];
    buttons.push(`
      <button class="page-button" type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>Previous</button>`);

    for (let page = 1; page <= totalPages; page += 1) {
      buttons.push(`
        <button class="page-button ${page === state.page ? 'active' : ''}" type="button" data-page="${page}" aria-label="Page ${page}" ${page === state.page ? 'aria-current="page"' : ''}>${page}</button>`);
    }

    buttons.push(`
      <button class="page-button" type="button" data-page="${state.page + 1}" ${state.page === totalPages ? 'disabled' : ''}>Next</button>`);

    elements.pagination.innerHTML = buttons.join('');
  }

  function findAnnouncement(id) {
    return state.announcements.find(item => item.id === String(id));
  }

  function contentToHtml(content) {
    if (!content) return '<p>No additional details are available.</p>';

    return content
      .split(/\n\s*\n/)
      .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function openDetails(id, trigger) {
    const item = findAnnouncement(id);
    if (!item) return;

    state.lastFocusedElement = trigger || document.activeElement;
    const date = formatDate(item.publishedAt || item.updatedAt);

    elements.modalMeta.innerHTML = [
      item.isPinned ? '<span class="badge warning">Important</span>' : '',
      item.category ? `<span class="badge category-badge">${escapeHtml(item.category)}</span>` : '',
      date ? `<span>${escapeHtml(date)}</span>` : '',
      item.author ? `<span>By ${escapeHtml(item.author)}</span>` : ''
    ].filter(Boolean).join('<span aria-hidden="true">·</span>');

    elements.modalTitle.textContent = item.title || 'Announcement';
    elements.modalSummary.textContent = item.summary || '';
    elements.modalSummary.hidden = !item.summary;
    elements.modalContent.innerHTML = contentToHtml(item.content);

    elements.modal.hidden = false;
    document.body.classList.add('modal-open');
    elements.modalClose.focus();
  }

  function closeDetails() {
    elements.modal.hidden = true;
    document.body.classList.remove('modal-open');
    state.lastFocusedElement?.focus?.();
    state.lastFocusedElement = null;
  }

  function handleSearchInput(event) {
    state.search = event.target.value;
    state.page = 1;
    elements.clearSearch.hidden = !state.search;
    applyFilters();
  }

  function clearSearch() {
    elements.search.value = '';
    state.search = '';
    elements.clearSearch.hidden = true;
    state.page = 1;
    applyFilters();
    elements.search.focus();
  }

  function resetFilters() {
    elements.search.value = '';
    elements.category.value = 'all';
    elements.pinnedOnly.checked = false;
    state.search = '';
    state.category = 'all';
    state.pinnedOnly = false;
    state.page = 1;
    elements.clearSearch.hidden = true;
    applyFilters();
  }

  function setupMobileNavigation() {
    elements.mobileToggle?.addEventListener('click', () => {
      const isOpen = elements.sidebar.classList.toggle('open');
      elements.mobileToggle.setAttribute('aria-expanded', String(isOpen));
      elements.mobileToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    document.querySelectorAll('.sidebar a').forEach(link => {
      link.addEventListener('click', () => {
        elements.sidebar?.classList.remove('open');
        elements.mobileToggle?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function setupEvents() {
    elements.search.addEventListener('input', handleSearchInput);
    elements.clearSearch.addEventListener('click', clearSearch);
    elements.category.addEventListener('change', event => {
      state.category = event.target.value;
      state.page = 1;
      applyFilters();
    });
    elements.pinnedOnly.addEventListener('change', event => {
      state.pinnedOnly = event.target.checked;
      state.page = 1;
      applyFilters();
    });
    elements.reset.addEventListener('click', resetFilters);

    elements.list.addEventListener('click', event => {
      const button = event.target.closest('[data-action="view"]');
      if (!button) return;
      openDetails(button.dataset.id, button);
    });

    elements.pagination.addEventListener('click', event => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      const page = Number(button.dataset.page);
      if (!Number.isInteger(page) || page < 1) return;
      state.page = page;
      renderResults();
      elements.announcementResults?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    elements.modalClose.addEventListener('click', closeDetails);
    elements.modal.addEventListener('click', event => {
      if (event.target === elements.modal) closeDetails();
    });

    document.addEventListener('keydown', event => {
      if (elements.modal.hidden) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetails();
      }

      if (event.key === 'Tab') {
        const focusable = elements.modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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
    });
  }

  async function loadAnnouncements() {
    // API integration boundary:
    // The future authenticated REST request belongs here. It must use the
    // server-issued HTTP-only authentication cookie and must never read/store JWTs.
    //
    // Do not add a guessed endpoint or fake response here until the backend
    // contract is finalized.
    return [];
  }

  async function initialize() {
    state.loading = true;
    state.error = null;
    renderLoading();

    try {
      const data = await loadAnnouncements();
      state.announcements = Array.isArray(data)
        ? data.map(normalizeAnnouncement).filter(Boolean)
        : [];

      state.loading = false;
      state.page = 1;
      updateCategoryOptions();
      applyFilters();
    } catch (error) {
      state.loading = false;
      state.error = error instanceof Error ? error : new Error('Unable to load announcements.');
      elements.count.textContent = '—';
      renderStatus('error', 'Unable to load announcements', 'Please try again.', true);
    }
  }

  // Future backend/API integration can call this public boundary with validated
  // member-visible announcement records returned by the server.
  window.PrimeItAnnouncements = Object.freeze({
    setData(data) {
      state.announcements = Array.isArray(data)
        ? data.map(normalizeAnnouncement).filter(Boolean)
        : [];
      state.loading = false;
      state.error = null;
      state.page = 1;
      updateCategoryOptions();
      applyFilters();
    },
    reload: initialize
  });

  setupMobileNavigation();
  setupEvents();
  initialize();
})();
