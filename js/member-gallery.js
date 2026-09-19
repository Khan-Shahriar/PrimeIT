(() => {
  'use strict';

  const elements = {
    sidebar: document.querySelector('#member-sidebar'),
    mobileToggle: document.querySelector('#member-mobile-toggle'),
    grid: document.querySelector('#gallery-grid'),
    search: document.querySelector('#gallery-search'),
    category: document.querySelector('#gallery-category'),
    reset: document.querySelector('#gallery-reset'),
    resultCount: document.querySelector('#gallery-result-count'),
    status: document.querySelector('#gallery-status'),
    loading: document.querySelector('#gallery-loading'),
    empty: document.querySelector('#gallery-empty'),
    noResults: document.querySelector('#gallery-no-results'),
    noResultsReset: document.querySelector('#gallery-no-results-reset'),
    error: document.querySelector('#gallery-error'),
    retry: document.querySelector('#gallery-retry'),
    pagination: document.querySelector('#gallery-pagination'),
    lightbox: document.querySelector('#gallery-lightbox'),
    lightboxDialog: document.querySelector('.lightbox-dialog'),
    lightboxImage: document.querySelector('#lightbox-image'),
    lightboxLoading: document.querySelector('#lightbox-loading'),
    lightboxFallback: document.querySelector('#lightbox-fallback'),
    lightboxClose: document.querySelector('#lightbox-close'),
    lightboxPrev: document.querySelector('#lightbox-prev'),
    lightboxNext: document.querySelector('#lightbox-next'),
    lightboxTitle: document.querySelector('#lightbox-title'),
    lightboxDescription: document.querySelector('#lightbox-description'),
    lightboxMeta: document.querySelector('#lightbox-meta'),
    toast: document.querySelector('#gallery-toast')
  };

  const state = {
    items: [],
    filteredItems: [],
    searchTerm: '',
    category: '',
    loading: false,
    error: null,
    page: 1,
    pageSize: 12,
    currentIndex: -1,
    lastFocusedElement: null,
    imageRequestToken: 0
  };

  const allowedStatuses = new Set(['published', 'visible', 'available']);

  function normalizeItem(item) {
    if (!item || typeof item !== 'object') return null;

    const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
    const thumbnailUrl = typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl.trim() : imageUrl;

    if (!imageUrl) return null;

    return {
      id: String(item.id ?? imageUrl),
      title: String(item.title ?? 'Gallery image').trim() || 'Gallery image',
      description: String(item.description ?? '').trim(),
      imageUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      category: String(item.category ?? '').trim(),
      album: String(item.album ?? '').trim(),
      publishedDate: String(item.publishedDate ?? item.uploadedDate ?? '').trim(),
      altText: String(item.altText ?? item.title ?? 'Gallery image').trim() || 'Gallery image',
      status: String(item.status ?? 'published').trim().toLowerCase()
    };
  }

  function setGalleryData(items) {
    state.items = Array.isArray(items)
      ? items.map(normalizeItem).filter(Boolean).filter(item => allowedStatuses.has(item.status))
      : [];

    state.error = null;
    state.page = 1;
    populateCategoryFilter();
    renderGallery();
  }

  function setGalleryLoading(isLoading) {
    state.loading = isLoading;
    elements.loading.hidden = !isLoading;

    if (isLoading) {
      elements.grid.hidden = true;
      elements.empty.hidden = true;
      elements.noResults.hidden = true;
      elements.error.hidden = true;
      elements.pagination.hidden = true;
      setStatus('Loading available gallery images.');
    } else {
      elements.grid.hidden = false;
    }
  }

  function setGalleryError(error) {
    state.error = error instanceof Error ? error : new Error('Gallery could not be loaded.');
    state.loading = false;
    elements.loading.hidden = true;
    elements.grid.hidden = true;
    elements.empty.hidden = true;
    elements.noResults.hidden = true;
    elements.error.hidden = false;
    elements.pagination.hidden = true;
    elements.resultCount.textContent = 'Gallery unavailable';
    setStatus('Gallery loading failed.');
  }

  function setStatus(message) {
    elements.status.textContent = message || '';
  }

  function formatDate(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function getFilteredItems() {
    const query = state.searchTerm.toLowerCase();

    return state.items.filter(item => {
      const searchableText = [
        item.title,
        item.description,
        item.category,
        item.album
      ].join(' ').toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesCategory = !state.category || item.category === state.category;

      return matchesSearch && matchesCategory;
    });
  }

  function populateCategoryFilter() {
    const categories = [...new Set(
      state.items.map(item => item.category).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    const current = state.category;
    elements.category.replaceChildren(new Option('All categories', ''));

    categories.forEach(category => {
      elements.category.add(new Option(category, category));
    });

    elements.category.disabled = categories.length === 0;

    if (categories.includes(current)) {
      elements.category.value = current;
    } else {
      state.category = '';
      elements.category.value = '';
    }
  }

  function updateResetVisibility() {
    elements.reset.hidden = !(state.searchTerm || state.category);
  }

  function renderGallery() {
    if (state.loading || state.error) return;

    state.filteredItems = getFilteredItems();

    const total = state.filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.pageSize;
    const visibleItems = state.filteredItems.slice(start, start + state.pageSize);

    elements.grid.replaceChildren();
    elements.empty.hidden = state.items.length !== 0;
    elements.noResults.hidden = !(state.items.length > 0 && total === 0);
    elements.grid.hidden = state.items.length === 0 || total === 0;
    elements.pagination.hidden = total <= state.pageSize;

    elements.resultCount.textContent = total === 1 ? '1 image' : total + ' images';

    if (state.items.length === 0) {
      setStatus('No gallery images are currently available to members.');
    } else if (total === 0) {
      setStatus('No gallery images match the current search or filter.');
    } else {
      setStatus(total + ' gallery image' + (total === 1 ? '' : 's') + ' available.');
    }

    visibleItems.forEach((item, index) => {
      elements.grid.appendChild(createGalleryCard(item, start + index));
    });

    renderPagination(totalPages);
    updateResetVisibility();
  }

  function createGalleryCard(item, index) {
    const article = document.createElement('article');
    article.className = 'gallery-card';

    const button = document.createElement('button');
    button.className = 'gallery-card-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Open ' + item.title + ' image');
    button.addEventListener('click', () => openLightbox(index));

    const imageWrap = document.createElement('div');
    imageWrap.className = 'gallery-image-wrap';

    const image = document.createElement('img');
    image.className = 'gallery-image';
    image.src = item.thumbnailUrl;
    image.alt = item.altText;
    image.loading = 'lazy';
    image.decoding = 'async';

    const fallback = document.createElement('div');
    fallback.className = 'gallery-image-fallback';
    fallback.hidden = true;
    fallback.innerHTML = '<strong>Image unavailable</strong><span>This image could not be displayed.</span>';

    image.addEventListener('error', () => {
      image.hidden = true;
      fallback.hidden = false;
    }, { once: true });

    imageWrap.append(image, fallback);

    const body = document.createElement('div');
    body.className = 'gallery-card-body';

    const heading = document.createElement('div');
    heading.className = 'gallery-card-heading';

    const title = document.createElement('h3');
    title.className = 'gallery-card-title';
    title.textContent = item.title;

    heading.appendChild(title);

    if (item.category) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = item.category;
      heading.appendChild(tag);
    }

    body.appendChild(heading);

    if (item.description) {
      const description = document.createElement('p');
      description.className = 'gallery-card-description';
      description.textContent = item.description;
      body.appendChild(description);
    }

    const meta = document.createElement('div');
    meta.className = 'gallery-card-meta';

    if (item.album) {
      const album = document.createElement('span');
      album.textContent = item.album;
      meta.appendChild(album);
    }

    if (item.publishedDate) {
      const date = document.createElement('span');
      date.textContent = formatDate(item.publishedDate);
      meta.appendChild(date);
    }

    if (meta.childElementCount) body.appendChild(meta);

    button.append(imageWrap, body);
    article.appendChild(button);

    return article;
  }

  function renderPagination(totalPages) {
    elements.pagination.replaceChildren();

    if (totalPages <= 1) {
      elements.pagination.hidden = true;
      return;
    }

    elements.pagination.hidden = false;

    const createPageButton = (label, page, disabled, current) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;

      if (current) button.setAttribute('aria-current', 'page');
      if (label === 'Previous') button.setAttribute('aria-label', 'Previous gallery page');
      if (label === 'Next') button.setAttribute('aria-label', 'Next gallery page');

      button.addEventListener('click', () => {
        state.page = page;
        renderGallery();
        document.querySelector('#gallery-results-title')?.scrollIntoView({ block: 'start' });
      });

      return button;
    };

    elements.pagination.appendChild(
      createPageButton('Previous', state.page - 1, state.page === 1, false)
    );

    for (let page = 1; page <= totalPages; page += 1) {
      elements.pagination.appendChild(
        createPageButton(String(page), page, false, page === state.page)
      );
    }

    elements.pagination.appendChild(
      createPageButton('Next', state.page + 1, state.page === totalPages, false)
    );
  }

  function resetGallery() {
    state.searchTerm = '';
    state.category = '';
    state.page = 1;
    elements.search.value = '';
    elements.category.value = '';
    renderGallery();
    elements.search.focus();
  }

  function getVisibleLightboxItems() {
    return state.filteredItems;
  }

  function openLightbox(index) {
    const items = getVisibleLightboxItems();
    if (!items[index]) return;

    state.currentIndex = index;
    state.lastFocusedElement = document.activeElement;
    elements.lightbox.hidden = false;
    document.body.classList.add('modal-open');
    renderLightboxItem();
    window.setTimeout(() => elements.lightboxClose.focus(), 0);
  }

  function closeLightbox() {
    if (elements.lightbox.hidden) return;

    elements.lightbox.hidden = true;
    document.body.classList.remove('modal-open');
    state.currentIndex = -1;
    state.imageRequestToken += 1;

    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
      state.lastFocusedElement.focus();
    }
  }

  function renderLightboxItem() {
    const item = getVisibleLightboxItems()[state.currentIndex];
    if (!item) return;

    const requestToken = ++state.imageRequestToken;

    elements.lightboxTitle.textContent = item.title;
    elements.lightboxDescription.textContent = item.description || 'No description available.';
    elements.lightboxMeta.replaceChildren();

    const metadata = [
      ['Category', item.category],
      ['Album', item.album],
      ['Date', formatDate(item.publishedDate)]
    ].filter(([, value]) => value);

    metadata.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      elements.lightboxMeta.append(dt, dd);
    });

    elements.lightboxImage.hidden = false;
    elements.lightboxFallback.hidden = true;
    elements.lightboxLoading.hidden = false;
    elements.lightboxImage.alt = item.altText;
    elements.lightboxImage.removeAttribute('src');

    const preload = new Image();

    preload.onload = () => {
      if (requestToken !== state.imageRequestToken) return;
      elements.lightboxImage.src = item.imageUrl;
      elements.lightboxLoading.hidden = true;
    };

    preload.onerror = () => {
      if (requestToken !== state.imageRequestToken) return;
      elements.lightboxImage.hidden = true;
      elements.lightboxLoading.hidden = true;
      elements.lightboxFallback.hidden = false;
    };

    preload.src = item.imageUrl;

    const atStart = state.currentIndex <= 0;
    const atEnd = state.currentIndex >= getVisibleLightboxItems().length - 1;
    elements.lightboxPrev.disabled = atStart;
    elements.lightboxNext.disabled = atEnd;
  }

  function moveLightbox(direction) {
    const nextIndex = state.currentIndex + direction;
    const items = getVisibleLightboxItems();

    if (nextIndex < 0 || nextIndex >= items.length) return;

    state.currentIndex = nextIndex;
    renderLightboxItem();
  }

  function trapLightboxFocus(event) {
    if (elements.lightbox.hidden || event.key !== 'Tab') return;

    const focusable = [...elements.lightboxDialog.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])'
    )].filter(element => element.offsetParent !== null);

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

  function setupMobileNavigation() {
    elements.mobileToggle?.addEventListener('click', () => {
      const isOpen = elements.sidebar.classList.toggle('open');
      elements.mobileToggle.setAttribute('aria-expanded', String(isOpen));
      elements.mobileToggle.setAttribute(
        'aria-label',
        isOpen ? 'Close navigation menu' : 'Open navigation menu'
      );
    });

    elements.sidebar?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        elements.sidebar.classList.remove('open');
        elements.mobileToggle?.setAttribute('aria-expanded', 'false');
        elements.mobileToggle?.setAttribute('aria-label', 'Open navigation menu');
      });
    });
  }

  function setupControls() {
    elements.search?.addEventListener('input', event => {
      state.searchTerm = event.target.value.trim();
      state.page = 1;
      renderGallery();
    });

    elements.category?.addEventListener('change', event => {
      state.category = event.target.value;
      state.page = 1;
      renderGallery();
    });

    elements.reset?.addEventListener('click', resetGallery);
    elements.noResultsReset?.addEventListener('click', resetGallery);
  }

  function setupLightbox() {
    elements.lightboxClose?.addEventListener('click', closeLightbox);
    elements.lightboxPrev?.addEventListener('click', () => moveLightbox(-1));
    elements.lightboxNext?.addEventListener('click', () => moveLightbox(1));

    elements.lightbox?.addEventListener('click', event => {
      if (event.target.matches('[data-lightbox-close]')) closeLightbox();
    });

    document.addEventListener('keydown', event => {
      if (elements.lightbox.hidden) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveLightbox(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveLightbox(1);
      } else {
        trapLightboxFocus(event);
      }
    });
  }

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2200);
  }

  function setupRetry() {
    elements.retry?.addEventListener('click', () => {
      if (typeof window.PrimeItGallery?.load === 'function') {
        window.PrimeItGallery.load();
      }
    });
  }

  function initialize() {
    setupMobileNavigation();
    setupControls();
    setupLightbox();
    setupRetry();
    setGalleryData([]);
  }

  /*
   * REST API integration boundary.
   * Section 13 intentionally does not invent or call a production endpoint.
   * A later backend integration can call:
   *
   *   window.PrimeItGallery.setData(items);
   *   window.PrimeItGallery.setLoading(true);
   *   window.PrimeItGallery.setError(error);
   *
   * Authentication remains server-controlled through HTTP-only cookies.
   * This module never reads JWTs, document.cookie, localStorage, or sessionStorage.
   */
  window.PrimeItGallery = {
    setData: setGalleryData,
    setLoading: setGalleryLoading,
    setError: setGalleryError,
    load() {
      setGalleryLoading(true);

      /*
       * The final REST endpoint is intentionally deferred to the backend/API
       * section. No fake production request is made here.
       */
      window.setTimeout(() => {
        setGalleryLoading(false);
        setGalleryData([]);
        showToast('Gallery data source is not connected yet.');
      }, 250);
    }
  };

  initialize();
})();