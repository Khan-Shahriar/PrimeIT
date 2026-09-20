(() => {
  'use strict';

  const CONFIG = Object.freeze({
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  });

  const state = {
    gallery: [],
    filtered: [],
    selectedFile: null,
    previewUrl: null,
    lastFocusedElement: null,
    openModal: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    sidebar: $('#admin-sidebar'),
    sidebarToggle: $('[data-sidebar-toggle]'),
    sidebarBackdrop: $('[data-sidebar-close]'),
    search: $('#gallery-search'),
    category: $('#gallery-category-filter'),
    collection: $('#gallery-collection-filter'),
    status: $('#gallery-status-filter'),
    featured: $('#gallery-featured-filter'),
    grid: $('#gallery-grid'),
    resultCount: $('[data-result-count]'),
    pageStatus: $('[data-gallery-status]'),
    uploadModal: $('#upload-modal'),
    detailsModal: $('#details-modal'),
    editModal: $('#edit-modal'),
    editForm: $('#edit-form'),
    editTitle: $('#edit-image-title'),
    editAlt: $('#edit-image-alt'),
    editDescription: $('#edit-image-description'),
    editCategory: $('#edit-image-category'),
    editCollection: $('#edit-image-collection'),
    editFeatured: $('#edit-image-featured'),
    editStatus: $('#edit-image-status'),
    editMessage: $('[data-edit-message']),
    lightboxModal: $('#lightbox-modal'),
    uploadForm: $('#upload-form'),
    fileInput: $('#gallery-file'),
    dropzone: $('[data-upload-dropzone]'),
    filePreview: $('[data-file-preview]'),
    previewImage: $('[data-preview-image]'),
    fileName: $('[data-file-name]'),
    fileMeta: $('[data-file-meta]'),
    uploadMessage: $('[data-upload-message]'),
    title: $('#image-title'),
    alt: $('#image-alt'),
    description: $('#image-description'),
    categoryInput: $('#image-category'),
    collectionInput: $('#image-collection'),
    featuredInput: $('#image-featured'),
    statusInput: $('#image-status'),
    detailsContent: $('[data-details-content]'),
    lightboxImage: $('[data-lightbox-image]'),
    lightboxTitle: $('#lightbox-title'),
    lightboxCaption: $('[data-lightbox-caption]')
  };

  function setPageStatus(message, isError = false) {
    if (!els.pageStatus) return;
    els.pageStatus.textContent = message;
    els.pageStatus.dataset.state = isError ? 'error' : 'ready';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = units[0];
    for (let i = 0; value >= 1024 && unit !== units[units.length - 1]; i += 1) {
      value /= 1024;
      unit = units[i + 1];
    }
    return value.toFixed(value >= 10 ? 0 : 1) + ' ' + unit;
  }

  function formatDate(value) {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }

  function showToast(message) {
    let toast = $('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.remove(), 2600);
  }

  function openModal(modal, trigger) {
    if (!modal) return;
    state.lastFocusedElement = trigger || document.activeElement;
    state.openModal = modal;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const focusTarget = modal.querySelector('button, input, select, textarea');
    focusTarget?.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (state.openModal === modal) state.openModal = null;
    if (![els.uploadModal, els.detailsModal, els.editModal, els.lightboxModal].some(item => item && !item.hidden)) {
      document.body.style.overflow = '';
    }
    state.lastFocusedElement?.focus?.();
  }

  function toggleSidebar(force) {
    if (!els.sidebar || !els.sidebarToggle) return;
    const shouldOpen = typeof force === 'boolean' ? force : !els.sidebar.classList.contains('open');
    els.sidebar.classList.toggle('open', shouldOpen);
    els.sidebarToggle.setAttribute('aria-expanded', String(shouldOpen));
    els.sidebarToggle.setAttribute('aria-label', shouldOpen ? 'Close admin navigation' : 'Open admin navigation');
    if (els.sidebarBackdrop) els.sidebarBackdrop.hidden = !shouldOpen;
  }

  function getStatusClass(status) {
    if (status === 'Published') return 'success';
    if (status === 'Draft') return 'warning';
    if (status === 'Archived') return 'danger';
    return 'neutral';
  }

  function matchesFilters(item) {
    const query = els.search?.value.trim().toLowerCase() || '';
    const category = els.category?.value || '';
    const collection = els.collection?.value || '';
    const status = els.status?.value || '';
    const featured = els.featured?.value || '';

    const haystack = [item.title, item.description, item.category, item.collection, item.uploadedBy, item.altText]
      .filter(Boolean).join(' ').toLowerCase();

    return (!query || haystack.includes(query))
      && (!category || item.category === category)
      && (!collection || item.collection === collection)
      && (!status || item.status === status)
      && (!featured || String(Boolean(item.isFeatured)) === featured);
  }

  function updateCollectionOptions() {
    if (!els.collection) return;
    const current = els.collection.value;
    const collections = [...new Set(state.gallery.map(item => item.collection).filter(Boolean))].sort();
    els.collection.innerHTML = '<option value="">All collections</option>' +
      collections.map(collection => '<option value="' + escapeHtml(collection) + '">' + escapeHtml(collection) + '</option>').join('');
    els.collection.value = collections.includes(current) ? current : '';
  }

  function updateStats() {
    const values = {
      total: state.gallery.length,
      published: state.gallery.filter(item => item.status === 'Published').length,
      draft: state.gallery.filter(item => ['Draft', 'Unpublished'].includes(item.status)).length,
      featured: state.gallery.filter(item => item.isFeatured).length,
      archived: state.gallery.filter(item => item.status === 'Archived').length
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = $('[data-stat="' + key + '"]');
      if (node) node.textContent = state.gallery.length ? String(value) : '—';
      const meta = $('[data-stat-meta="' + key + '"]');
      if (meta) meta.textContent = state.gallery.length ? 'Current frontend dataset' : 'Awaiting API data';
    });
  }

  function renderGallery() {
    state.filtered = state.gallery.filter(matchesFilters);
    if (els.resultCount) {
      els.resultCount.textContent = state.filtered.length + (state.filtered.length === 1 ? ' item' : ' items');
    }

    if (!els.grid) return;

    if (!state.gallery.length) {
      els.grid.innerHTML = '<div class="state-panel gallery-empty-state"><div class="state-icon" aria-hidden="true">▧</div><h3>No gallery images available</h3><p>Gallery items will appear here after they are provided by the future gallery API.</p><button class="btn btn-primary" type="button" data-action="open-upload">Add Image</button></div>';
      return;
    }

    if (!state.filtered.length) {
      els.grid.innerHTML = '<div class="state-panel"><div class="state-icon" aria-hidden="true">⌕</div><h3>No images match your filters</h3><p>Try changing the search term or clearing one or more filters.</p><button class="btn btn-secondary" type="button" data-action="reset-filters">Clear Filters</button></div>';
      return;
    }

    els.grid.innerHTML = state.filtered.map(item => {
      const image = item.thumbnailUrl || item.imageUrl;
      const imageMarkup = image
        ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.altText || item.title || '') + '" loading="lazy" data-gallery-image="' + escapeHtml(item.id) + '">'
        : '<div class="gallery-admin-image-placeholder">Image preview unavailable</div>';

      return '<article class="gallery-admin-card" data-item-id="' + escapeHtml(item.id) + '">' +
        '<div class="gallery-admin-image">' +
          imageMarkup +
          (item.isFeatured ? '<span class="featured-marker">Featured</span>' : '') +
        '</div>' +
        '<div class="gallery-admin-body">' +
          '<div class="gallery-card-title"><h3>' + escapeHtml(item.title || 'Untitled image') + '</h3><span class="badge ' + getStatusClass(item.status) + '">' + escapeHtml(item.status || 'Unknown') + '</span></div>' +
          '<div class="gallery-meta"><span>' + escapeHtml(item.category || 'Uncategorized') + '</span><span aria-hidden="true">·</span><span>' + escapeHtml(item.collection || 'No collection') + '</span></div>' +
          '<div class="gallery-card-actions">' +
            '<button class="btn btn-secondary btn-sm" type="button" data-action="view" data-id="' + escapeHtml(item.id) + '">View</button>' +
            (image ? '<button class="btn btn-secondary btn-sm" type="button" data-action="preview" data-id="' + escapeHtml(item.id) + '">Preview</button>' : '') +
            '<button class="btn btn-secondary btn-sm" type="button" data-action="edit" data-id="' + escapeHtml(item.id) + '">Edit</button>' +
            '<button class="btn btn-secondary btn-sm" type="button" data-action="toggle-featured" data-id="' + escapeHtml(item.id) + '">' + (item.isFeatured ? 'Unfeature' : 'Feature') + '</button>' +
            '<button class="btn btn-secondary btn-sm" type="button" data-action="toggle-publish" data-id="' + escapeHtml(item.id) + '">' + (item.status === 'Published' ? 'Unpublish' : 'Publish') + '</button>' +
            '<button class="btn btn-danger btn-sm" type="button" data-action="archive" data-id="' + escapeHtml(item.id) + '">Archive</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function validateImageFile(file) {
    if (!file) return { valid: false, message: 'Please select an image file.' };
    if (!CONFIG.allowedTypes.has(file.type)) {
      return { valid: false, message: 'Unsupported image type. Select JPG, JPEG, PNG, WebP, or GIF.' };
    }
    if (file.size > CONFIG.maxFileSize) {
      return { valid: false, message: 'The selected file is larger than the 10 MB frontend limit.' };
    }
    return { valid: true };
  }

  function clearFileSelection() {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
    state.selectedFile = null;
    if (els.fileInput) els.fileInput.value = '';
    if (els.filePreview) els.filePreview.hidden = true;
    if (els.previewImage) {
      els.previewImage.removeAttribute('src');
      els.previewImage.alt = '';
    }
  }

  function selectFile(file) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showUploadError(validation.message);
      clearFileSelection();
      return;
    }

    clearFileSelection();
    state.selectedFile = file;
    state.previewUrl = URL.createObjectURL(file);

    if (els.previewImage) {
      els.previewImage.src = state.previewUrl;
      els.previewImage.alt = 'Local preview of ' + file.name;
    }
    if (els.fileName) els.fileName.textContent = file.name;
    if (els.fileMeta) els.fileMeta.textContent = file.type + ' · ' + formatBytes(file.size);
    if (els.filePreview) els.filePreview.hidden = false;
    clearUploadError();
  }

  function showUploadError(message) {
    if (!els.uploadMessage) return;
    els.uploadMessage.textContent = message;
    els.uploadMessage.hidden = false;
  }

  function clearUploadError() {
    if (!els.uploadMessage) return;
    els.uploadMessage.textContent = '';
    els.uploadMessage.hidden = true;
  }

  function resetUploadForm() {
    els.uploadForm?.reset();
    clearFileSelection();
    clearUploadError();
  }

  function openUpload(trigger) {
    resetUploadForm();
    openModal(els.uploadModal, trigger);
  }

  function collectUploadMetadata() {
    return {
      title: els.title?.value.trim() || '',
      altText: els.alt?.value.trim() || '',
      description: els.description?.value.trim() || '',
      category: els.categoryInput?.value || '',
      collection: els.collectionInput?.value.trim() || '',
      isFeatured: Boolean(els.featuredInput?.checked),
      status: els.statusInput?.value || 'Draft'
    };
  }

  function validateMetadata(metadata) {
    if (!state.selectedFile) return 'Select an image before preparing the upload.';
    if (!metadata.title) return 'Title is required.';
    if (!metadata.altText) return 'Alt text is required for meaningful gallery images.';
    if (metadata.title.length > 160) return 'Title is too long.';
    if (metadata.altText.length > 250) return 'Alt text is too long.';
    return '';
  }

  function prepareUpload(event) {
    event.preventDefault();
    const metadata = collectUploadMetadata();
    const error = validateMetadata(metadata);
    if (error) {
      showUploadError(error);
      return;
    }

    const widthHeight = new Image();
    widthHeight.onload = () => {
      setPageStatus('Image is validated locally and metadata is ready for a future API upload.');
      showToast('Upload prepared locally. Nothing was persisted.');
      closeModal(els.uploadModal);
    };
    widthHeight.onerror = () => showUploadError('The selected file could not be decoded as an image.');
    widthHeight.src = state.previewUrl;
  }

  function findItem(id) {
    return state.gallery.find(item => String(item.id) === String(id));
  }

  function renderDetails(item) {
    if (!els.detailsContent) return;
    const image = item.thumbnailUrl || item.imageUrl;
    els.detailsContent.innerHTML =
      '<div class="details-image">' +
        (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.altText || item.title || '') + '">' : '<div class="state-panel"><h3>No image preview</h3><p>Image URL is not available in the current data.</p></div>') +
      '</div>' +
      '<div class="details-list">' +
        detailRow('Title', item.title) +
        detailRow('Description', item.description) +
        detailRow('Alt text', item.altText) +
        detailRow('Category', item.category) +
        detailRow('Collection', item.collection) +
        detailRow('Status', item.status) +
        detailRow('Featured', item.isFeatured ? 'Featured' : 'Not featured') +
        detailRow('Published', formatDate(item.publishedAt)) +
        detailRow('Uploaded', formatDate(item.uploadedAt)) +
        detailRow('Updated', formatDate(item.updatedAt)) +
        detailRow('Uploader', item.uploadedBy) +
      '</div>';
  }

  function detailRow(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + escapeHtml(label) + '</span><span class="detail-value">' + escapeHtml(value || 'Not available') + '</span></div>';
  }

  function openDetails(id, trigger) {
    const item = findItem(id);
    if (!item) {
      showToast('Gallery item is not available in the current dataset.');
      return;
    }
    renderDetails(item);
    openModal(els.detailsModal, trigger);
  }

  function openLightbox(id, trigger) {
    const item = findItem(id);
    if (!item || !(item.imageUrl || item.thumbnailUrl)) {
      showToast('No image preview is available for this item.');
      return;
    }
    const image = item.imageUrl || item.thumbnailUrl;
    els.lightboxImage.src = image;
    els.lightboxImage.alt = item.altText || item.title || '';
    els.lightboxTitle.textContent = item.title || 'Gallery image';
    els.lightboxCaption.textContent = item.description || '';
    openModal(els.lightboxModal, trigger);
  }

  function actionNeedsApi(action) {
    return ['edit', 'toggle-featured', 'toggle-publish', 'archive'].includes(action);
  }

  function handleGalleryAction(action, id, trigger) {
    if (action === 'view') return openDetails(id, trigger);
    if (action === 'preview') return openLightbox(id, trigger);

    const item = findItem(id);
    if (!item) {
      if (actionNeedsApi(action)) {
        showToast('This action will be available after gallery API data is connected.');
      }
      return;
    }

    if (action === 'edit') {
      els.editTitle.value = item.title || '';
      els.editAlt.value = item.altText || '';
      els.editDescription.value = item.description || '';
      els.editCategory.value = item.category || '';
      els.editCollection.value = item.collection || '';
      els.editFeatured.checked = Boolean(item.isFeatured);
      els.editStatus.value = item.status || 'Draft';
      els.editForm.dataset.itemId = String(item.id);
      if (els.editMessage) els.editMessage.hidden = true;
      openModal(els.editModal, trigger);
      return;
    }

    if (action === 'toggle-featured') {
      showToast('Featured status requires the future gallery API.');
      return;
    }

    if (action === 'toggle-publish') {
      showToast('Publication status requires the future gallery API.');
      return;
    }

    if (action === 'archive') {
      const confirmed = window.confirm('Archive "' + (item.title || 'this image') + '"? This frontend will not delete or modify stored files.');
      if (confirmed) showToast('Archive action prepared for the future API.');
    }
  }

  function prepareEdit(event) {
    event.preventDefault();
    const title = els.editTitle.value.trim();
    const altText = els.editAlt.value.trim();
    if (!title || !altText) {
      els.editMessage.textContent = 'Title and alt text are required.';
      els.editMessage.hidden = false;
      return;
    }
    setPageStatus('Gallery metadata changes are validated and ready for a future API update.');
    showToast('Changes prepared locally. Nothing was persisted.');
    closeModal(els.editModal);
  }

  function resetFilters() {
    if (els.search) els.search.value = '';
    if (els.category) els.category.value = '';
    if (els.collection) els.collection.value = '';
    if (els.status) els.status.value = '';
    if (els.featured) els.featured.value = '';
    renderGallery();
  }

  function handleClick(event) {
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) return;
    const action = actionElement.dataset.action;

    if (action === 'open-upload') return openUpload(actionElement);
    if (action === 'close-upload') return closeModal(els.uploadModal);
    if (action === 'close-details') return closeModal(els.detailsModal);
    if (action === 'close-edit') return closeModal(els.editModal);
    if (action === 'close-lightbox') return closeModal(els.lightboxModal);
    if (action === 'choose-file') return els.fileInput?.click();
    if (action === 'remove-file') return clearFileSelection();
    if (action === 'reset-filters') return resetFilters();
    if (action === 'refresh') {
      setPageStatus('Gallery refresh is ready for future REST API integration.');
      renderGallery();
      return;
    }
    if (action === 'logout') {
      showToast('Logout will be handled by the future authentication layer.');
      return;
    }
    if (action === 'toggle-sidebar') return toggleSidebar();
    if (action === 'sidebar-close') return toggleSidebar(false);

    if (actionNeedsApi(action) || ['view', 'preview'].includes(action)) {
      handleGalleryAction(action, actionElement.dataset.id, actionElement);
    }
  }

  function handleKeydown(event) {
    if (event.key !== 'Escape') return;
    if (state.openModal) closeModal(state.openModal);
    else toggleSidebar(false);
  }

  function init() {
    if (!els.grid) return;

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);

    [els.search, els.category, els.collection, els.status, els.featured].forEach(control => {
      control?.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', renderGallery);
    });

    els.sidebarToggle?.addEventListener('click', () => toggleSidebar());
    els.sidebarBackdrop?.addEventListener('click', () => toggleSidebar(false));
    $$('.sidebar a').forEach(link => link.addEventListener('click', () => toggleSidebar(false)));

    els.fileInput?.addEventListener('change', event => selectFile(event.target.files?.[0]));
    els.uploadForm?.addEventListener('submit', prepareUpload);

    els.dropzone?.addEventListener('dragover', event => {
      event.preventDefault();
      els.dropzone.classList.add('dragover');
    });
    els.dropzone?.addEventListener('dragleave', () => els.dropzone.classList.remove('dragover'));
    els.dropzone?.addEventListener('drop', event => {
      event.preventDefault();
      els.dropzone.classList.remove('dragover');
      selectFile(event.dataTransfer.files?.[0]);
    });

    els.editForm?.addEventListener('submit', prepareEdit);

    [els.uploadModal, els.detailsModal, els.editModal, els.lightboxModal].forEach(modal => {
      modal?.addEventListener('mousedown', event => {
        if (event.target === modal) closeModal(modal);
      });
    });

    updateCollectionOptions();
    updateStats();
    renderGallery();

    window.addEventListener('beforeunload', () => {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    });
  }

  init();
})();