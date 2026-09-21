(() => {
  'use strict';

  const config = window.PrimeItMemberDirectoryConfig || {};
  const state = {
    allMembers: [],
    filteredMembers: [],
    currentPage: 1,
    pageSize: 9,
    lastFocusedElement: null
  };

  const elements = {
    toggle: document.querySelector('.mobile-toggle'),
    sidebar: document.querySelector('.sidebar'),
    search: document.querySelector('#member-search'),
    department: document.querySelector('#member-department'),
    position: document.querySelector('#member-position'),
    role: document.querySelector('#member-role'),
    clearFilters: document.querySelector('#member-clear-filters'),
    retry: document.querySelector('#member-retry'),
    emptyClear: document.querySelector('#member-empty-clear'),
    loading: document.querySelector('#member-loading-state'),
    error: document.querySelector('#member-error-state'),
    empty: document.querySelector('#member-empty-state'),
    emptyTitle: document.querySelector('#member-empty-title'),
    emptyMessage: document.querySelector('#member-empty-message'),
    results: document.querySelector('#member-results'),
    resultsSummary: document.querySelector('#member-results-summary'),
    count: document.querySelector('#member-count'),
    pagination: document.querySelector('#member-pagination'),
    previous: document.querySelector('#member-prev-page'),
    next: document.querySelector('#member-next-page'),
    pageInfo: document.querySelector('#member-page-info'),
    modal: document.querySelector('#member-detail-modal'),
    modalDialog: document.querySelector('.member-modal-dialog'),
    modalClose: document.querySelector('#member-detail-close'),
    detailAvatar: document.querySelector('#member-detail-avatar'),
    detailTitle: document.querySelector('#member-detail-title'),
    detailRole: document.querySelector('#member-detail-role'),
    detailDepartment: document.querySelector('#member-detail-department'),
    detailContactRow: document.querySelector('#member-detail-contact-row'),
    detailContact: document.querySelector('#member-detail-contact'),
    detailBio: document.querySelector('#member-detail-bio')
  };

  const normalize = value => String(value ?? '').trim().toLocaleLowerCase();

  const getInitials = name => {
    const parts = String(name ?? '').trim().split(/\\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts.slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  };

  const uniqueSortedValues = key => {
    const values = state.allMembers
      .map(member => String(member?.[key] ?? '').trim())
      .filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  };

  const setSelectOptions = (select, label, values) => {
    if (!select) return;
    select.replaceChildren(new Option(label, ''));
    values.forEach(value => select.add(new Option(value, value)));
  };

  const setLoading = visible => {
    if (elements.loading) elements.loading.hidden = !visible;
  };

  const setError = visible => {
    if (elements.error) elements.error.hidden = !visible;
  };

  const setEmpty = (visible, title = 'No members found', message = 'No members found. Try adjusting your search or filters.') => {
    if (!elements.empty) return;
    elements.empty.hidden = !visible;
    if (elements.emptyTitle) elements.emptyTitle.textContent = title;
    if (elements.emptyMessage) elements.emptyMessage.textContent = message;
  };

  const getSearchableText = member => [
    member.fullName,
    member.name,
    member.position,
    member.department
  ].map(normalize).join(' ');

  const applyFilters = () => {
    const query = normalize(elements.search?.value);
    const department = normalize(elements.department?.value);
    const position = normalize(elements.position?.value);
    const role = normalize(elements.role?.value);

    state.filteredMembers = state.allMembers.filter(member => {
      const searchable = getSearchableText(member);
      return (!query || searchable.includes(query)) &&
        (!department || normalize(member.department) === department) &&
        (!position || normalize(member.position) === position) &&
        (!role || normalize(member.role) === role);
    });

    state.currentPage = 1;
    renderResults();
  };

  const createAvatar = member => {
    const avatar = document.createElement('div');
    avatar.className = 'member-card-avatar';
    avatar.setAttribute('aria-hidden', 'true');

    const image = String(member.profileImage ?? '').trim();
    if (image && /^(https?:\/\/|\.\.?\/|\/)/i.test(image)) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => {
        avatar.replaceChildren(document.createTextNode(getInitials(member.fullName || member.name)));
      }, { once: true });
      avatar.appendChild(img);
    } else {
      avatar.textContent = getInitials(member.fullName || member.name);
    }

    return avatar;
  };

  const createCard = member => {
    const card = document.createElement('article');
    card.className = 'member-card';

    const header = document.createElement('div');
    header.className = 'member-card-header';
    header.appendChild(createAvatar(member));

    const heading = document.createElement('div');
    heading.className = 'member-card-heading';

    const name = document.createElement('h3');
    name.className = 'member-card-name';
    name.textContent = member.fullName || member.name || 'Member';

    const position = document.createElement('p');
    position.className = 'member-card-position';
    position.textContent = member.position || 'Position not provided';

    heading.append(name, position);
    header.appendChild(heading);

    const meta = document.createElement('div');
    meta.className = 'member-card-meta';

    const department = document.createElement('span');
    department.textContent = member.department ? `Department · ${member.department}` : 'Department · Not provided';
    meta.appendChild(department);

    if (member.role) {
      const role = document.createElement('span');
      role.textContent = `Role · ${member.role}`;
      meta.appendChild(role);
    }

    const footer = document.createElement('div');
    footer.className = 'member-card-footer';

    const contact = document.createElement('span');
    contact.className = 'member-contact-status';
    const contactAllowed = member.contactPermitted === true;
    contact.textContent = contactAllowed ? 'Contact permitted' : 'Contact restricted';
    if (contactAllowed) contact.classList.add('allowed');

    const details = document.createElement('button');
    details.className = 'member-details-button';
    details.type = 'button';
    details.textContent = 'View Details';
    details.addEventListener('click', () => openDetails(member));

    footer.append(contact, details);
    card.append(header, meta, footer);
    return card;
  };

  const renderResults = () => {
    if (!elements.results) return;

    elements.results.replaceChildren();
    setError(false);

    const total = state.filteredMembers.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

    if (state.currentPage > totalPages) state.currentPage = totalPages;

    if (elements.count) elements.count.textContent = String(state.allMembers.length);
    if (elements.resultsSummary) {
      elements.resultsSummary.textContent = total === 1 ? '1 member' : `${total} members`;
    }

    if (!total) {
      setEmpty(true);
      if (elements.pagination) elements.pagination.hidden = true;
      return;
    }

    setEmpty(false);

    const start = (state.currentPage - 1) * state.pageSize;
    const pageItems = state.filteredMembers.slice(start, start + state.pageSize);
    const fragment = document.createDocumentFragment();

    pageItems.forEach(member => fragment.appendChild(createCard(member)));
    elements.results.appendChild(fragment);

    if (elements.pagination) elements.pagination.hidden = totalPages <= 1;
    if (elements.pageInfo) elements.pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
    if (elements.previous) elements.previous.disabled = state.currentPage <= 1;
    if (elements.next) elements.next.disabled = state.currentPage >= totalPages;
  };

  const clearFilters = () => {
    if (elements.search) elements.search.value = '';
    if (elements.department) elements.department.value = '';
    if (elements.position) elements.position.value = '';
    if (elements.role) elements.role.value = '';
    applyFilters();
    elements.search?.focus();
  };

  const openDetails = member => {
    if (!elements.modal) return;

    state.lastFocusedElement = document.activeElement;

    elements.detailAvatar.replaceChildren();
    const image = String(member.profileImage ?? '').trim();

    if (image && /^(https?:\/\/|\.\.?\/|\/)/i.test(image)) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = '';
      img.addEventListener('error', () => {
        elements.detailAvatar.textContent = getInitials(member.fullName || member.name);
      }, { once: true });
      elements.detailAvatar.appendChild(img);
    } else {
      elements.detailAvatar.textContent = getInitials(member.fullName || member.name);
    }

    elements.detailTitle.textContent = member.fullName || member.name || 'Member';
    elements.detailRole.textContent = member.position || 'Position not provided';
    elements.detailDepartment.textContent = member.department || 'Not provided';

    const contactAllowed = member.contactPermitted === true;
    const contactParts = [];

    if (contactAllowed && member.email) contactParts.push(String(member.email));
    if (contactAllowed && member.phone) contactParts.push(String(member.phone));

    if (contactParts.length) {
      elements.detailContactRow.hidden = false;
      elements.detailContact.textContent = contactParts.join(' · ');
    } else {
      elements.detailContactRow.hidden = true;
      elements.detailContact.textContent = '';
    }

    elements.detailBio.textContent = member.bio ? String(member.bio) : '';

    elements.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    elements.modalClose?.focus();
  };

  const closeDetails = () => {
    if (!elements.modal) return;
    elements.modal.hidden = true;
    document.body.style.overflow = '';
    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
      state.lastFocusedElement.focus();
    }
  };

  const trapModalFocus = event => {
    if (!elements.modal || elements.modal.hidden || event.key !== 'Tab') return;

    const focusable = [...elements.modalDialog.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )];

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
  };

  const loadMembers = async () => {
    setError(false);
    setEmpty(false);
    setLoading(true);

    try {
      const loader = typeof config.loadMembers === 'function'
        ? config.loadMembers
        : async () => {
            if (!window.PrimeItApi) throw new Error('API_CLIENT_UNAVAILABLE');
            const payload = await window.PrimeItApi.get('/members');
            return Array.isArray(payload?.members) ? payload.members : [];
          };

      const response = await loader();

      if (!Array.isArray(response)) {
        throw new Error('Invalid member directory response');
      }

      state.allMembers = response.filter(member => member && typeof member === 'object');
      state.filteredMembers = [...state.allMembers];

      setSelectOptions(elements.department, 'All Departments', uniqueSortedValues('department'));
      setSelectOptions(elements.position, 'All Positions', uniqueSortedValues('position'));
      setSelectOptions(elements.role, 'All Roles', uniqueSortedValues('role'));

      setLoading(false);
      renderResults();
    } catch (error) {
      setLoading(false);
      state.allMembers = [];
      state.filteredMembers = [];
      if (elements.results) elements.results.replaceChildren();
      if (elements.pagination) elements.pagination.hidden = true;
      setEmpty(false);
      setError(true);
      if (elements.count) elements.count.textContent = '0';
      if (elements.error) {
        const message = error?.status === 403
          ? 'You do not have permission to view the member directory.'
          : error?.status === 401
            ? 'Your session is no longer valid. Please sign in again.'
            : 'Unable to load the member directory. Please try again.';
        elements.error.textContent = message;
      }
      if (elements.resultsSummary) elements.resultsSummary.textContent = 'Directory unavailable';
    }
  };

  elements.search?.addEventListener('input', applyFilters);
  elements.department?.addEventListener('change', applyFilters);
  elements.position?.addEventListener('change', applyFilters);
  elements.role?.addEventListener('change', applyFilters);
  elements.clearFilters?.addEventListener('click', clearFilters);
  elements.emptyClear?.addEventListener('click', clearFilters);
  elements.retry?.addEventListener('click', loadMembers);

  elements.previous?.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage -= 1;
      renderResults();
    }
  });

  elements.next?.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(state.filteredMembers.length / state.pageSize));
    if (state.currentPage < totalPages) {
      state.currentPage += 1;
      renderResults();
    }
  });

  elements.modalClose?.addEventListener('click', closeDetails);
  elements.modal?.addEventListener('click', event => {
    if (event.target.matches('[data-member-modal-close]')) closeDetails();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && elements.modal && !elements.modal.hidden) {
      closeDetails();
      return;
    }
    trapModalFocus(event);
  });

  if (elements.toggle && elements.sidebar) {
    elements.toggle.addEventListener('click', () => {
      const isOpen = elements.sidebar.classList.toggle('open');
      elements.toggle.setAttribute('aria-expanded', String(isOpen));
      elements.toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });
  }

  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', () => {
      elements.sidebar?.classList.remove('open');
      elements.toggle?.setAttribute('aria-expanded', 'false');
      elements.toggle?.setAttribute('aria-label', 'Open navigation menu');
    });
  });

  loadMembers();
})();