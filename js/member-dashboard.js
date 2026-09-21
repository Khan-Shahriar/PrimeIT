const dashboardUserAvatar=document.querySelector('#user-avatar-preview');
const welcomeMemberName=document.querySelector('#welcome-member-name');
const dashboardDate=document.querySelector('#dashboard-date');
const mobileToggle=document.querySelector('.mobile-toggle');
const sidebar=document.querySelector('.sidebar');
const logoutLink=document.querySelector('#member-logout-link');

const leaveSummaryElements={
  casual:{
    balance:document.querySelector('#casual-leave-balance'),
    remaining:document.querySelector('#casual-leave-remaining'),
    progress:document.querySelector('#casual-leave-progress')
  },
  sick:{
    balance:document.querySelector('#sick-leave-balance'),
    remaining:document.querySelector('#sick-leave-remaining'),
    progress:document.querySelector('#sick-leave-progress')
  }
};

function renderProfilePhoto(){
  // Profile image integration is intentionally deferred to the authenticated profile service.
  if(!dashboardUserAvatar) return;
}

function renderMemberName(){
  if(!welcomeMemberName) return;
  const name=welcomeMemberName.textContent.trim();
  if(!name) welcomeMemberName.textContent='Member';
}

function renderDashboardDate(){
  if(!dashboardDate) return;
  dashboardDate.textContent=new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',year:'numeric'}).format(new Date());
}

function updateLeaveSummary(type,used,total){
  const elements=leaveSummaryElements[type];
  if(!elements||!Number.isFinite(used)||!Number.isFinite(total)||total<=0) return;

  const safeUsed=Math.max(0,Math.min(used,total));
  const remaining=total-safeUsed;
  const percentage=Math.min(Math.max((safeUsed/total)*100,0),100);

  if(elements.balance) elements.balance.textContent=`${safeUsed} used / ${total}`;
  if(elements.remaining) elements.remaining.textContent=`${remaining} day${remaining===1?'':'s'} remaining`;
  if(elements.progress){
    elements.progress.style.width=`${percentage}%`;
    elements.progress.setAttribute('aria-valuenow',String(Math.round(percentage)));
  }
}

function closeMobileSidebar(){
  if(!sidebar) return;
  sidebar.classList.remove('open');
  mobileToggle?.setAttribute('aria-expanded','false');
  mobileToggle?.setAttribute('aria-label','Open navigation menu');
}

function setupMobileNavigation(){
  mobileToggle?.addEventListener('click',()=>{
    const isOpen=sidebar.classList.toggle('open');
    mobileToggle.setAttribute('aria-expanded',String(isOpen));
    mobileToggle.setAttribute('aria-label',isOpen?'Close navigation menu':'Open navigation menu');
  });
  sidebar?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMobileSidebar));
}

function setupLogoutIntegration(){
  if(!logoutLink) return;
  logoutLink.dataset.logoutReady='true';
}

function initializeDashboard(){
  renderProfilePhoto();
  renderMemberName();
  renderDashboardDate();
  setupMobileNavigation();
  setupLogoutIntegration();
}

initializeDashboard();

// Future API integration:
// updateLeaveSummary('casual', used, total);
// updateLeaveSummary('sick', used, total);