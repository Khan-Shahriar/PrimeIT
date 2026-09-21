(() => {
  "use strict";

  const API = Object.freeze({
    list: "/api/v1/gallery/admin",
    create: "/api/v1/gallery",
    item: (id) => `/api/v1/gallery/${encodeURIComponent(id)}`,
    publish: (id) => `/api/v1/gallery/${encodeURIComponent(id)}/publish`,
    archive: (id) => `/api/v1/gallery/${encodeURIComponent(id)}/archive`
  });

  const CONFIG = Object.freeze({
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: new Set(["image/jpeg", "image/png", "image/webp"])
  });

  const state = { gallery: [], filtered: [], selectedFile: null, previewUrl: null, activeItemId: null, lastFocused: null, busy: false };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const els = {
    sidebar: $("#admin-sidebar"),
    sidebarToggle: $("[data-sidebar-toggle]"),
    sidebarBackdrop: $("[data-sidebar-close]"),
    search: $("#gallery-search"),
    category: $("#gallery-category-filter"),
    collection: $("#gallery-collection-filter"),
    status: $("#gallery-status-filter"),
    featured: $("#gallery-featured-filter"),
    grid: $("#gallery-grid"),
    resultCount: $("[data-result-count]"),
    pageStatus: $("[data-gallery-status]"),
    uploadModal: $("#upload-modal"),
    detailsModal: $("#details-modal"),
    editModal: $("#edit-modal"),
    editForm: $("#edit-form"),
    editTitle: $("#edit-image-title"),
    editAlt: $("#edit-image-alt"),
    editDescription: $("#edit-image-description"),
    editCategory: $("#edit-image-category"),
    editCollection: $("#edit-image-collection"),
    editFeatured: $("#edit-image-featured"),
    editStatus: $("#edit-image-status"),
    editMessage: $("[data-edit-message]"),
    lightboxModal: $("#lightbox-modal"),
    uploadForm: $("#upload-form"),
    fileInput: $("#gallery-file"),
    dropzone: $("[data-upload-dropzone]"),
    filePreview: $("[data-file-preview]"),
    previewImage: $("[data-preview-image]"),
    fileName: $("[data-file-name]"),
    fileMeta: $("[data-file-meta]"),
    uploadMessage: $("[data-upload-message]"),
    uploadProgress: $("[data-upload-progress]"),
    title: $("#image-title"),
    alt: $("#image-alt"),
    description: $("#image-description"),
    categoryInput: $("#image-category"),
    collectionInput: $("#image-collection"),
    featuredInput: $("#image-featured"),
    statusInput: $("#image-status"),
    detailsContent: $("[data-details-content]"),
    lightboxImage: $("[data-lightbox-image]"),
    lightboxTitle: $("#lightbox-title"),
    lightboxCaption: $("[data-lightbox-caption]")
  };

  function escapeAttr(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let n = bytes / 1024, i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
    return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
  }

  function formatDate(value) {
    if (!value) return "Not available";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Not available" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, { credentials: "include", ...options, headers: { Accept: "application/json", ...(options.headers || {}) } });
    const type = response.headers.get("content-type") || "";
    const data = type.includes("application/json") ? await response.json() : null;
    if (!response.ok) {
      const error = new Error(data?.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function uploadFormData(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Accept", "application/json");
      xhr.upload.addEventListener("progress", event => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      xhr.onload = () => {
        let data = null;
        try { data = JSON.parse(xhr.responseText || "{}"); } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else { const e = new Error(data?.message || `Upload failed (${xhr.status})`); e.status = xhr.status; e.data = data; reject(e); }
      };
      xhr.onerror = () => reject(new Error("Network error while uploading the image."));
      xhr.onabort = () => reject(new Error("Upload cancelled."));
      xhr.send(formData);
    });
  }

  function setStatus(message, error = false) {
    if (!els.pageStatus) return;
    els.pageStatus.textContent = message;
    els.pageStatus.dataset.state = error ? "error" : "ready";
  }

  function toast(message) {
    let node = $(".toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "toast";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      document.body.appendChild(node);
    }
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.remove(), 2800);
  }

  function openModal(modal, trigger) {
    if (!modal) return;
    state.lastFocused = trigger || document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector("button, input, select, textarea")?.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (![els.uploadModal, els.detailsModal, els.editModal, els.lightboxModal].some(m => m && !m.hidden)) document.body.style.overflow = "";
    state.lastFocused?.focus?.();
  }

  function validateFile(file) {
    if (!file) return "Please select an image file.";
    if (!CONFIG.allowedTypes.has(file.type)) return "Only JPEG, PNG, and WebP images are allowed.";
    if (file.size > CONFIG.maxFileSize) return "The selected file exceeds the 10 MB upload limit.";
    return "";
  }

  function clearFile() {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
    state.selectedFile = null;
    if (els.fileInput) els.fileInput.value = "";
    if (els.filePreview) els.filePreview.hidden = true;
    if (els.previewImage) els.previewImage.removeAttribute("src");
    if (els.uploadProgress) els.uploadProgress.hidden = true;
  }

  function showUploadMessage(message) {
    if (!els.uploadMessage) return;
    els.uploadMessage.textContent = message;
    els.uploadMessage.hidden = !message;
  }

  function selectFile(file) {
    const error = validateFile(file);
    clearFile();
    if (error) { showUploadMessage(error); return; }
    state.selectedFile = file;
    state.previewUrl = URL.createObjectURL(file);
    els.previewImage.src = state.previewUrl;
    els.previewImage.alt = `Preview of ${file.name}`;
    els.fileName.textContent = file.name;
    els.fileMeta.textContent = `${file.type} · ${formatBytes(file.size)}`;
    els.filePreview.hidden = false;
    showUploadMessage("");
  }

  function metadataFromForm(edit = false) {
    return {
      title: (edit ? els.editTitle : els.title)?.value.trim() || "",
      altText: (edit ? els.editAlt : els.alt)?.value.trim() || "",
      description: (edit ? els.editDescription : els.description)?.value.trim() || "",
      category: (edit ? els.editCategory : els.categoryInput)?.value.trim() || "",
      collection: (edit ? els.editCollection : els.collectionInput)?.value.trim() || "",
      isFeatured: Boolean((edit ? els.editFeatured : els.featuredInput)?.checked),
      status: (edit ? els.editStatus : els.statusInput)?.value || "Draft"
    };
  }

  function validateMetadata(data, requireFile) {
    if (requireFile && !state.selectedFile) return "Please select an image.";
    if (!data.title) return "Title is required.";
    if (!data.altText) return "Alt text is required.";
    if (data.title.length > 160) return "Title must not exceed 160 characters.";
    if (data.altText.length > 250) return "Alt text must not exceed 250 characters.";
    if (data.description.length > 2000) return "Description must not exceed 2000 characters.";
    if (data.category.length > 80) return "Category must not exceed 80 characters.";
    if (data.collection.length > 120) return "Collection must not exceed 120 characters.";
    if (!["Draft", "Published", "Archived"].includes(data.status)) return "Invalid gallery status.";
    return "";
  }

  async function loadGallery() {
    setStatus("Loading gallery…");
    try {
      const data = await requestJson(API.list);
      state.gallery = Array.isArray(data?.data) ? data.data : [];
      setStatus(`${state.gallery.length} gallery item${state.gallery.length === 1 ? "" : "s"} loaded.`);
      updateFilterOptions();
      render();
    } catch (error) {
      state.gallery = [];
      render();
      setStatus(error.status === 401 ? "Authentication required." : "Unable to load gallery.", true);
      toast(error.message || "Unable to load gallery.");
    }
  }

  function updateFilterOptions() {
    const values = [
      [els.category, [...new Set(state.gallery.map(x => x.category).filter(Boolean))]],
      [els.collection, [...new Set(state.gallery.map(x => x.collection).filter(Boolean))]]
    ];
    values.forEach(([select, items]) => {
      if (!select) return;
      const current = select.value;
      select.replaceChildren(new Option(select === els.category ? "All categories" : "All collections", ""));
      items.sort().forEach(value => select.add(new Option(value, value)));
      if (items.includes(current)) select.value = current;
    });
  }

  function filteredItems() {
    const query = els.search?.value.trim().toLowerCase() || "";
    const category = els.category?.value || "";
    const collection = els.collection?.value || "";
    const status = els.status?.value || "";
    const featured = els.featured?.value || "";
    return state.gallery.filter(item => {
      const text = [item.title,item.description,item.category,item.collection,item.altText,item.uploadedBy].filter(Boolean).join(" ").toLowerCase();
      return (!query || text.includes(query)) && (!category || item.category === category) && (!collection || item.collection === collection) && (!status || item.status === status) && (!featured || String(Boolean(item.isFeatured)) === featured);
    });
  }

  function renderStats() {
    const values = {
      total: state.gallery.length,
      published: state.gallery.filter(x => x.status === "Published").length,
      draft: state.gallery.filter(x => x.status === "Draft").length,
      featured: state.gallery.filter(x => Boolean(x.isFeatured)).length,
      archived: state.gallery.filter(x => x.status === "Archived").length
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = $(`[data-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function render() {
    const items = filteredItems();
    state.filtered = items;
    if (els.resultCount) els.resultCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    renderStats();
    if (!els.grid) return;
    els.grid.replaceChildren();

    if (!items.length) {
      const panel = document.createElement("div");
      panel.className = "state-panel gallery-empty-state";
      const h = document.createElement("h3");
      h.textContent = state.gallery.length ? "No images match your filters" : "No gallery images available";
      const p = document.createElement("p");
      p.textContent = state.gallery.length ? "Try changing the search or filters." : "Upload the first PrimeIt gallery image.";
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn btn-primary"; b.dataset.action = "open-upload"; b.textContent = "Add Image";
      panel.append(h,p,b); els.grid.appendChild(panel); return;
    }

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "gallery-admin-card";
      card.dataset.itemId = item.id;
      const imageWrap = document.createElement("div");
      imageWrap.className = "gallery-admin-image";
      const image = document.createElement("img");
      image.src = item.thumbnailUrl || item.imageUrl;
      image.alt = item.altText || item.title || "Gallery image";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => image.replaceWith(Object.assign(document.createElement("div"), { className:"gallery-admin-image-placeholder", textContent:"Image unavailable" })), { once:true });
      imageWrap.appendChild(image);
      if (item.isFeatured) {
        const marker = document.createElement("span"); marker.className = "featured-marker"; marker.textContent = "Featured"; imageWrap.appendChild(marker);
      }
      const body = document.createElement("div"); body.className = "gallery-admin-body";
      const heading = document.createElement("div"); heading.className = "gallery-card-title";
      const title = document.createElement("h3"); title.textContent = item.title || "Untitled image";
      const badge = document.createElement("span"); badge.className = "badge"; badge.textContent = item.status || "Unknown";
      heading.append(title,badge);
      const meta = document.createElement("div"); meta.className = "gallery-meta";
      const cat = document.createElement("span"); cat.textContent = item.category || "Uncategorized";
      const sep = document.createElement("span"); sep.textContent = "·"; sep.setAttribute("aria-hidden","true");
      const col = document.createElement("span"); col.textContent = item.collection || "No collection";
      meta.append(cat,sep,col);
      const actions = document.createElement("div"); actions.className = "gallery-card-actions";
      [["view","View"],["preview","Preview"],["edit","Edit"],["toggle-featured",item.isFeatured ? "Unfeature":"Feature"],["toggle-publish",item.status === "Published" ? "Unpublish":"Publish"],["archive","Archive"]].forEach(([action,label]) => {
        const b = document.createElement("button"); b.type="button"; b.className = action==="archive" ? "btn btn-danger btn-sm" : "btn btn-secondary btn-sm"; b.dataset.action=action; b.dataset.id=item.id; b.textContent=label; actions.appendChild(b);
      });
      body.append(heading,meta,actions); card.append(imageWrap,body); els.grid.appendChild(card);
    });
  }

  function findItem(id) { return state.gallery.find(item => String(item.id) === String(id)); }

  function openUpload(trigger) {
    els.uploadForm?.reset(); clearFile(); showUploadMessage(""); openModal(els.uploadModal, trigger);
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (state.busy) return;
    const metadata = metadataFromForm();
    const error = validateMetadata(metadata, true);
    if (error) { showUploadMessage(error); return; }

    state.busy = true;
    const formData = new FormData();
    formData.append("image", state.selectedFile);
    Object.entries(metadata).forEach(([key,value]) => formData.append(key, String(value)));
    if (els.uploadProgress) { els.uploadProgress.hidden = false; els.uploadProgress.value = 0; }
    showUploadMessage("Uploading…");
    try {
      const created = await uploadFormData(API.create, formData, percent => { if (els.uploadProgress) els.uploadProgress.value = percent; });
      if (metadata.status === "Published" && created?.data?.id) {
        await requestJson(API.publish(created.data.id), { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"Published"}) });
      }
      showUploadMessage("Upload complete.");
      toast("Gallery image uploaded successfully.");
      closeModal(els.uploadModal);
      await loadGallery();
    } catch (error) {
      showUploadMessage(error.message || "Upload failed. Nothing was published.");
      setStatus("Upload failed.", true);
    } finally {
      state.busy = false;
      if (els.uploadProgress) els.uploadProgress.hidden = true;
    }
  }

  function openDetails(id, trigger) {
    const item = findItem(id); if (!item) return;
    const root = els.detailsContent; if (!root) return;
    root.replaceChildren();
    const image = document.createElement("img"); image.src=item.imageUrl; image.alt=item.altText || item.title; image.loading="lazy";
    const details = document.createElement("div"); details.className="details-list";
    [["Title",item.title],["Description",item.description],["Alt text",item.altText],["Category",item.category],["Collection",item.collection],["Status",item.status],["Featured",item.isFeatured?"Yes":"No"],["Published",formatDate(item.publishedAt)],["Uploaded",formatDate(item.uploadedAt)],["Updated",formatDate(item.updatedAt)]].forEach(([label,value]) => {
      const row=document.createElement("div"); row.className="detail-row"; const a=document.createElement("span"); a.className="detail-label"; a.textContent=label; const b=document.createElement("span"); b.className="detail-value"; b.textContent=value || "Not available"; row.append(a,b); details.appendChild(row);
    });
    root.append(image,details); openModal(els.detailsModal, trigger);
  }

  function openLightbox(id, trigger) {
    const item=findItem(id); if(!item) return;
    els.lightboxImage.src=item.imageUrl; els.lightboxImage.alt=item.altText || item.title; els.lightboxTitle.textContent=item.title; els.lightboxCaption.textContent=item.description || "";
    openModal(els.lightboxModal, trigger);
  }

  function openEdit(id, trigger) {
    const item=findItem(id); if(!item) return;
    state.activeItemId=item.id;
    els.editTitle.value=item.title||""; els.editAlt.value=item.altText||""; els.editDescription.value=item.description||""; els.editCategory.value=item.category||""; els.editCollection.value=item.collection||""; els.editFeatured.checked=Boolean(item.isFeatured); els.editStatus.value=item.status||"Draft";
    if(els.editMessage) els.editMessage.hidden=true;
    openModal(els.editModal, trigger);
  }

  async function submitEdit(event) {
    event.preventDefault();
    const id=state.activeItemId; if(!id || state.busy) return;
    const metadata=metadataFromForm(true);
    const error=validateMetadata(metadata,false);
    if(error){ if(els.editMessage){els.editMessage.textContent=error;els.editMessage.hidden=false;} return; }
    state.busy=true;
    try {
      await requestJson(API.item(id), { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(metadata) });
      closeModal(els.editModal); toast("Gallery item updated successfully."); await loadGallery();
    } catch(error) {
      if(els.editMessage){els.editMessage.textContent=error.message || "Update failed.";els.editMessage.hidden=false;}
    } finally { state.busy=false; }
  }

  async function action(action,id,trigger) {
    const item=findItem(id);
    if(action==="view") return openDetails(id,trigger);
    if(action==="preview") return openLightbox(id,trigger);
    if(!item) return;
    try {
      if(action==="edit") return openEdit(id,trigger);
      if(action==="toggle-featured") await requestJson(API.item(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isFeatured:!item.isFeatured})});
      if(action==="toggle-publish") await requestJson(API.publish(id),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:item.status==="Published"?"Draft":"Published"})});
      if(action==="archive") {
        if(!window.confirm(`Archive "${item.title}"?`)) return;
        await requestJson(API.archive(id),{method:"POST"});
      }
      toast("Gallery item updated.");
      await loadGallery();
    } catch(error) { toast(error.message || "Gallery action failed."); setStatus("Gallery action failed.",true); }
  }

  function resetFilters(){ [els.search,els.category,els.collection,els.status,els.featured].forEach(x=>{if(x)x.value="";}); render(); }

  function toggleSidebar(force){ if(!els.sidebar)return; const open=typeof force==="boolean"?force:!els.sidebar.classList.contains("open"); els.sidebar.classList.toggle("open",open); els.sidebarToggle?.setAttribute("aria-expanded",String(open)); if(els.sidebarBackdrop)els.sidebarBackdrop.hidden=!open; }

  function init(){
    document.addEventListener("click",e=>{const el=e.target.closest("[data-action]");if(!el)return;const a=el.dataset.action;if(a==="open-upload")return openUpload(el);if(a==="close-upload")return closeModal(els.uploadModal);if(a==="close-details")return closeModal(els.detailsModal);if(a==="close-edit")return closeModal(els.editModal);if(a==="close-lightbox")return closeModal(els.lightboxModal);if(a==="choose-file")return els.fileInput?.click();if(a==="remove-file")return clearFile();if(a==="reset-filters")return resetFilters();if(a==="refresh")return loadGallery();if(a==="toggle-sidebar")return toggleSidebar();if(a==="sidebar-close")return toggleSidebar(false);if(["view","preview","edit","toggle-featured","toggle-publish","archive"].includes(a))return action(a,el.dataset.id,el);});
    document.addEventListener("keydown",e=>{if(e.key==="Escape" && [els.uploadModal,els.detailsModal,els.editModal,els.lightboxModal].some(m=>m&&!m.hidden)) { const m=[els.uploadModal,els.detailsModal,els.editModal,els.lightboxModal].find(x=>x&&!x.hidden); closeModal(m); }});
    [els.search,els.category,els.collection,els.status,els.featured].forEach(x=>x?.addEventListener(x.tagName==="INPUT"?"input":"change",render));
    els.fileInput?.addEventListener("change",e=>selectFile(e.target.files?.[0]));
    els.uploadForm?.addEventListener("submit",submitUpload);
    els.editForm?.addEventListener("submit",submitEdit);
    els.dropzone?.addEventListener("dragover",e=>{e.preventDefault();els.dropzone.classList.add("dragover");});
    els.dropzone?.addEventListener("dragleave",()=>els.dropzone.classList.remove("dragover"));
    els.dropzone?.addEventListener("drop",e=>{e.preventDefault();els.dropzone.classList.remove("dragover");selectFile(e.dataTransfer.files?.[0]);});
    els.sidebarToggle?.addEventListener("click",()=>toggleSidebar()); els.sidebarBackdrop?.addEventListener("click",()=>toggleSidebar(false));
    $$(".sidebar a").forEach(a=>a.addEventListener("click",()=>toggleSidebar(false)));
    [els.uploadModal,els.detailsModal,els.editModal,els.lightboxModal].forEach(m=>m?.addEventListener("mousedown",e=>{if(e.target===m)closeModal(m);}));
    loadGallery();
  }

  init();
})();