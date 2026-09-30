(() => {
  "use strict";
  const state={loaded:false};
  const $=(s,r=document)=>r.querySelector(s);

  function setCard(key,value,meta){
    const card=$('[data-stat-card="'+key+'"]');
    if(!card)return;
    const v=card.querySelector("[data-stat-value]"),m=card.querySelector("[data-stat-meta]");
    if(v)v.textContent=String(value);
    if(m)m.textContent=meta||"Loaded from API";
  }
  function dateText(v){const d=new Date(String(v).length===10?v+"T00:00:00":v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(d)}
  function renderHolidays(items){
    const box=$("[data-holiday-list]");if(!box)return;
    const today=new Date();today.setHours(0,0,0,0);
    const rows=(Array.isArray(items)?items:[]).filter(h=>new Date(String(h.date).slice(0,10)+"T00:00:00")>=today).slice(0,5);
    setCard("holidays",rows.length,rows.length+" upcoming in current calendar");
    box.replaceChildren();
    if(!rows.length){const p=document.createElement("p");p.className="holiday-empty";p.textContent="No upcoming holidays are available.";box.appendChild(p);return}
    rows.forEach(h=>{const item=document.createElement("div");item.className="holiday-item";const n=document.createElement("span");n.className="holiday-name";n.textContent=h.name||"Company Holiday";const d=document.createElement("time");d.className="holiday-date";d.dateTime=h.date||"";d.textContent=dateText(h.date);item.append(n,d);box.appendChild(item)})
  }
  function renderMembers(data){
    const total=Number(data?.pagination?.total ?? data?.members?.length ?? 0);
    const members=Array.isArray(data?.members)?data.members:[];
    const active=members.filter(m=>String(m.status).toLowerCase()==="active").length;
    setCard("members",total,"Total member accounts");
    $("[data-overview-value='members]")?.textContent;
    const a=$("[data-overview-value='active-members']"); if(a)a.textContent=String(active);
    const n=$("[data-state-note='members']");if(n)n.textContent="Member data loaded from the authenticated member service.";
  }
  function renderLeave(data){
    const pending=Number(data?.stats?.pending ?? data?.stats?.Pending ?? 0);
    setCard("leave",pending,"Pending requests");
    const panel=$("[data-state-panel='leave']");
    if(panel){panel.innerHTML="";const p=document.createElement("p");p.textContent=pending?pending+" pending leave request"+(pending===1?"":"s")+" require review.":"No pending leave requests.";panel.appendChild(p)}
  }
  function renderAnnouncements(data){
    const rows=Array.isArray(data?.announcements)?data.announcements:[];
    setCard("announcements",Number(data?.pagination?.total ?? rows.length),"Announcement records");
    const panel=$("[data-state-panel='announcements']");
    if(panel){panel.innerHTML="";const p=document.createElement("p");p.textContent=rows.length?"Recent announcement data is available.":"No announcements available.";panel.appendChild(p)}
  }
  function renderGallery(data){
    const total=Number(data?.pagination?.total ?? data?.data?.length ?? 0);
    setCard("gallery",total,"Published gallery items");
    const c=$("[data-gallery-count]");if(c)c.textContent=String(total);
    const s=$("[data-gallery-state]");if(s)s.textContent="Gallery data loaded from the public gallery service.";
  }
  async function load(){
    const year=new Date().getFullYear();
    const results=await Promise.allSettled([
      PrimeItApi.get("/members?limit=1&offset=0"),
      PrimeItApi.get("/leave/admin?limit=1&offset=0&year="+year),
      PrimeItApi.get("/announcements/admin?limit=1&offset=0"),
      PrimeItApi.get("/gallery?limit=1&offset=0"),
      PrimeItApi.get("/holidays?year="+year+"&status=Active")
    ]);
    const handlers=[renderMembers,renderLeave,renderAnnouncements,renderGallery,(r)=>renderHolidays(r.holidays)];
    results.forEach((r,i)=>{if(r.status==="fulfilled")handlers[i](r.value)});
    state.loaded=true;
    const status=$("[data-dashboard-status]");if(status)status.textContent="Dashboard data loaded from the server.";
  }
  function nav(){
    const sidebar=$("#admin-sidebar"),toggle=$("[data-sidebar-toggle]"),close=$("[data-sidebar-close]");
    toggle?.addEventListener("click",()=>{const open=sidebar.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Close admin navigation":"Open admin navigation");document.body.classList.toggle("sidebar-open",open);if(close)close.hidden=!open});
    close?.addEventListener("click",()=>{sidebar.classList.remove("open");toggle?.setAttribute("aria-expanded","false");document.body.classList.remove("sidebar-open");if(close)close.hidden=true});
  }
  document.addEventListener("DOMContentLoaded",()=>{const d=$("[data-current-date]");if(d){const now=new Date();d.textContent=dateText(now);d.dateTime=now.toISOString().slice(0,10)}nav();load().catch(()=>{})});
})();