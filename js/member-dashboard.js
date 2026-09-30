(() => {
  "use strict";

  const els = {
    avatar: document.querySelector("#user-avatar-preview"),
    name: document.querySelector("#welcome-member-name"),
    date: document.querySelector("#dashboard-date"),
    casual: document.querySelector("#stat-casual-leave"),
    sick: document.querySelector("#stat-sick-leave"),
    announcements: document.querySelector("#stat-announcements"),
    holidays: document.querySelector("#stat-upcoming-holidays"),
    casualMeta: document.querySelector("#stat-casual-leave-meta"),
    sickMeta: document.querySelector("#stat-sick-leave-meta"),
    announcementList: document.querySelector(".announcement-preview-card .announcement-list"),
    holidayList: document.querySelector(".two-col .list"),
    casualBalance: document.querySelector("#casual-leave-balance"),
    casualRemaining: document.querySelector("#casual-leave-remaining"),
    casualProgress: document.querySelector("#casual-leave-progress"),
    sickBalance: document.querySelector("#sick-leave-balance"),
    sickRemaining: document.querySelector("#sick-leave-remaining"),
    sickProgress: document.querySelector("#sick-leave-progress")
  };

  function formatDate(value, options = {month:"short",day:"2-digit",year:"numeric"}) {
    const d = value ? new Date(String(value).length === 10 ? value + "T00:00:00" : value) : new Date();
    return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", options).format(d);
  }

  function renderDate() {
    if (els.date) els.date.textContent = formatDate(new Date());
  }

  function renderName() {
    if (els.name && !els.name.textContent.trim()) els.name.textContent = "Member";
  }

  function setBalance(type, row) {
    if (!row) return;
    const total = Number(row.allowance ?? row.total ?? 0) + Number(row.adjustment ?? 0);
    const used = Number(row.used ?? 0);
    const remaining = Math.max(0, total - used);
    const pct = total > 0 ? Math.min(100, Math.max(0, used / total * 100)) : 0;
    const e = type === "casual"
      ? {b:els.casualBalance,r:els.casualRemaining,p:els.casualProgress,s:els.casual,m:els.casualMeta}
      : {b:els.sickBalance,r:els.sickRemaining,p:els.sickProgress,s:els.sick,m:els.sickMeta};
    if (e.s) e.s.textContent = String(remaining);
    if (e.m) e.m.textContent = `${used} used / ${total} total`;
    if (e.b) e.b.textContent = `${used} used / ${total}`;
    if (e.r) e.r.textContent = `${remaining} day${remaining === 1 ? "" : "s"} remaining`;
    if (e.p) { e.p.style.width = pct + "%"; e.p.setAttribute("aria-valuenow", String(Math.round(pct))); }
  }

  function renderAnnouncements(items) {
    if (!els.announcementList) return;
    const rows = Array.isArray(items) ? items.slice(0, 3) : [];
    els.announcements.textContent = String(items?.length ?? 0);
    els.announcements?.nextElementSibling && (els.announcements.nextElementSibling.textContent = "Published office updates");
    els.announcementList.replaceChildren();
    if (!rows.length) {
      const item = document.createElement("div"); item.className = "list-item announcement-item";
      item.textContent = "No published announcements available."; els.announcementList.appendChild(item); return;
    }
    rows.forEach(a => {
      const item=document.createElement("div"); item.className="list-item announcement-item";
      const content=document.createElement("div"); content.className="announcement-content";
      const row=document.createElement("div"); row.className="announcement-title-row";
      const title=document.createElement("b"); title.textContent=a.title || "Announcement";
      const badge=document.createElement("span"); badge.className="badge blue"; badge.textContent=a.category || "Office";
      row.append(title,badge);
      const meta=document.createElement("div"); meta.className="muted"; meta.textContent=a.summary || formatDate(a.publishedAt || a.updatedAt);
      content.append(row,meta); item.append(content); els.announcementList.appendChild(item);
    });
  }

  function renderHolidays(items) {
    const all=Array.isArray(items)?items:[];
    const today=new Date(); today.setHours(0,0,0,0);
    const upcoming=all.filter(h=>new Date(String(h.date).slice(0,10)+"T00:00:00")>=today).slice(0,3);
    if (els.holidays) els.holidays.textContent=String(upcoming.length);
    if (!els.holidayList) return;
    els.holidayList.replaceChildren();
    if (!upcoming.length) {
      const item=document.createElement("div"); item.className="list-item"; item.textContent="No upcoming holidays."; els.holidayList.appendChild(item); return;
    }
    upcoming.forEach(h=>{
      const item=document.createElement("div"); item.className="list-item";
      const name=document.createElement("span"); name.textContent=h.name || "Company Holiday";
      const date=document.createElement("b"); date.textContent=formatDate(h.date,{month:"short",day:"2-digit"});
      item.append(name,date); els.holidayList.appendChild(item);
    });
  }

  function setupNavigation() {
    const toggle=document.querySelector(".mobile-toggle"), sidebar=document.querySelector(".sidebar");
    toggle?.addEventListener("click",()=>{const open=sidebar.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Close navigation menu":"Open navigation menu")});
    sidebar?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>sidebar.classList.remove("open")));
  }

  async function loadData() {
    const year=new Date().getFullYear();
    const [balance, announcements, holidays] = await Promise.allSettled([
      PrimeItApi.get("/leave/balance?year="+year),
      PrimeItApi.get("/announcements?limit=3&offset=0"),
      PrimeItApi.get("/holidays?year="+year+"&status=Active")
    ]);
    if (balance.status==="fulfilled") {
      const balances=balance.value?.balance && typeof balance.value.balance==="object" ? balance.value.balance : {};
      Object.entries(balances).forEach(([type,row])=>setBalance(String(type).toLowerCase(),row));
    }
    if (announcements.status==="fulfilled") renderAnnouncements(announcements.value.announcements);
    if (holidays.status==="fulfilled") renderHolidays(holidays.value.holidays);
  }

  function initialize() {
    renderName(); renderDate(); setupNavigation(); loadData().catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",initialize);
})();