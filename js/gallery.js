(() => {
  "use strict";
  const API = "/api/v1/gallery";
  const grid = document.querySelector("#gallery-grid");
  const empty = document.querySelector("#gallery-empty");
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const lightbox = document.querySelector("#gallery-lightbox");
  const lightboxImage = document.querySelector("#lightbox-image");
  const lightboxTitle = document.querySelector("#lightbox-title");
  const lightboxDescription = document.querySelector("#lightbox-description");
  const lightboxCategory = document.querySelector("#lightbox-category");
  let items = [], visible = [], index = -1, previousFocus = null;

  function request() {
    return fetch(API, { credentials:"include", headers:{Accept:"application/json"} }).then(async r => {
      const data = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(data.message || "Unable to load gallery.");
      return Array.isArray(data.data) ? data.data : [];
    });
  }
  function render() {
    grid.replaceChildren();
    if(!visible.length){ empty.hidden=false; empty.textContent=items.length ? "No images are available in this category yet." : "No published gallery images are available yet."; return; }
    empty.hidden=true;
    visible.forEach((item,i)=>{
      const article=document.createElement("article"); article.className="gallery-item"; article.dataset.category=(item.category||"").toLowerCase();
      const button=document.createElement("button"); button.className="gallery-trigger"; button.type="button"; button.setAttribute("aria-label",`Open ${item.title} image`);
      const wrap=document.createElement("span"); wrap.className="gallery-image-wrap";
      const img=document.createElement("img"); img.src=item.thumbnailUrl||item.imageUrl; img.alt=item.altText||item.title; img.loading="lazy"; img.decoding="async";
      const overlay=document.createElement("span"); overlay.className="gallery-overlay"; overlay.setAttribute("aria-hidden","true"); const view=document.createElement("span"); view.textContent="View image"; overlay.appendChild(view);
      wrap.append(img,overlay);
      const copy=document.createElement("span"); copy.className="gallery-copy"; const meta=document.createElement("span"); meta.className="gallery-meta"; const tag=document.createElement("span"); tag.className="tag"; tag.textContent=item.category||"Gallery"; meta.appendChild(tag); const strong=document.createElement("strong"); strong.textContent=item.title||"Gallery image"; const desc=document.createElement("span"); desc.textContent=item.description||""; copy.append(meta,strong,desc);
      button.append(wrap,copy); article.appendChild(button); grid.appendChild(article); button.addEventListener("click",()=>openLightbox(i));
    });
  }
  function applyFilter(category){ visible=category==="all"?items:items.filter(x=>(x.category||"").toLowerCase()===category.toLowerCase()); render(); }
  function openLightbox(i){ if(!visible[i])return; index=i; previousFocus=document.activeElement; const item=visible[i]; lightboxImage.src=item.imageUrl; lightboxImage.alt=item.altText||item.title; lightboxTitle.textContent=item.title||"Gallery image"; lightboxDescription.textContent=item.description||""; lightboxCategory.textContent=item.category||""; lightbox.classList.add("is-open"); lightbox.setAttribute("aria-hidden","false"); document.body.classList.add("modal-open"); lightbox.querySelector(".lightbox-close")?.focus(); }
  function closeLightbox(){ lightbox.classList.remove("is-open"); lightbox.setAttribute("aria-hidden","true"); document.body.classList.remove("modal-open"); previousFocus?.focus?.(); }
  function move(delta){ if(!visible.length)return; index=(index+delta+visible.length)%visible.length; openLightbox(index); }
  filterButtons.forEach(button=>button.addEventListener("click",()=>{filterButtons.forEach(b=>{b.classList.remove("is-active");b.setAttribute("aria-pressed","false");});button.classList.add("is-active");button.setAttribute("aria-pressed","true");applyFilter(button.dataset.filter);}));
  document.querySelectorAll("[data-lightbox-close]").forEach(b=>b.addEventListener("click",closeLightbox));
  document.querySelector(".lightbox-prev")?.addEventListener("click",()=>move(-1));
  document.querySelector(".lightbox-next")?.addEventListener("click",()=>move(1));
  document.addEventListener("keydown",e=>{if(!lightbox.classList.contains("is-open"))return;if(e.key==="Escape")closeLightbox();if(e.key==="ArrowLeft")move(-1);if(e.key==="ArrowRight")move(1);});
  request().then(data=>{items=data; const categories=[...new Set(items.map(x=>x.category).filter(Boolean))].sort(); filterButtons.forEach(b=>{if(b.dataset.filter!=="all"&&!categories.some(c=>c.toLowerCase()===b.dataset.filter.toLowerCase())) b.hidden=true;}); applyFilter("all");}).catch(error=>{items=[];visible=[];render();empty.textContent=error.message||"Unable to load gallery.";empty.hidden=false;});
})();