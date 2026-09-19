const dashboardUserAvatar=document.querySelector('#user-avatar-preview');
const welcomeMemberName=document.querySelector('#welcome-member-name');
const dashboardDate=document.querySelector('#dashboard-date');
const memberNameElement=document.querySelector('.user-chip > span:first-child');
const mobileToggle=document.querySelector('.mobile-toggle');
const sidebar=document.querySelector('.sidebar');
const logoutLink=document.querySelector('#member-logout-link');

const quickStatElements={
  casualLeave:{
    value:document.querySelector('#stat-casual-leave'),
    meta:document.querySelector('#stat-casual-leave-meta')
  },
  sickLeave:{
    value:document.querySelector('#stat-sick-leave'),
    meta:document.querySelector('#stat-sick-leave-meta')
  },
  announcements:{
    value:document.querySelector('#stat-announcements'),
    meta:document.querySelector('#stat-announcements-meta')
  },
  upcomingHolidays:{
    value:document.querySelector('#stat-upcoming-holidays'),
    meta:document.querySelector('#stat-upcoming-holidays-meta')
  }
};

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
  const savedProfilePhoto=localStorage.getItem('primeit_member_profile_photo');
  if(!savedProfilePhoto||!dashboardUserAvatar) return;

  dashboardUserAvatar.innerHTML='';
  const image=document.createElement('img');
  image.src=savedProfilePhoto;
  image.alt='Profile photo';
  dashboardUserAvatar.appendChild(image);
}

function renderMemberName(){
  const userName=memberNameElement?.textContent?.trim();
  if(userName&&welcomeMemberName){
    welcomeMemberName.textContent=userName;
  }
}

function renderDashboardDate(){
  if(!dashboardDate) return;

  dashboardDate.textContent=new Intl.DateTimeFormat('en-US',{
    month:'short',
    day:'2-digit',
    year:'numeric'
  }).format(new Date());
}

function updateLeaveSummary(type,used,total){
  const elements=leaveSummaryElements[type];
  if(!elements||!Number.isFinite(used)||!Number.isFinite(total)||total<=0) return;

  const safeUsed=Math.max(0,Math.min(used,total));
  const remaining=total-safeUsed;
  const percentage=Math.min(Math.max((safeUsed/total)*100,0),100);

  if(elements.balance){
    elements.balance.textContent=`${safeUsed} used / ${total}`;
  }

  if(elements.remaining){
    elements.remaining.textContent=`${remaining} day${remaining===1?'':'s'} remaining`;
  }

  if(elements.progress){
    elements.progress.style.width=`${percentage}%`;
    elements.progress.setAttribute('aria-valuenow',String(Math.round(percentage)));
    elements.progress.setAttribute('aria-valuemin','0');
    elements.progress.setAttribute('aria-valuemax','100');
  }
}

function closeMobileSidebar(){
  if(!sidebar) return;

  sidebar.classList.remove('open');
  mobileToggle?.setAttribute('aria-expanded','false');
  mobileToggle?.setAttribute('aria-label','Open navigation menu');
}

function setupMobileNavigation(){
  if(mobileToggle&&sidebar){
    mobileToggle.addEventListener('click',()=>{
      const isOpen=sidebar.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded',String(isOpen));
      mobileToggle.setAttribute('aria-label',isOpen?'Close navigation menu':'Open navigation menu');
    });
  }

  document.querySelectorAll('.sidebar a').forEach(link=>{
    link.addEventListener('click',closeMobileSidebar);
  });
}

function setupLogoutIntegration(){
  if(!logoutLink) return;

  logoutLink.dataset.logoutReady='true';

  // Future authenticated integration:
  // connect this action to the server-side logout endpoint.
  // Do not remove JWT cookies from client-side JavaScript.
}

function initializeDashboard(){
  renderProfilePhoto();
  renderMemberName();
  renderDashboardDate();
  setupMobileNavigation();
  setupLogoutIntegration();
}

initializeDashboard();

// Future authenticated API integration:
// updateLeaveSummary('casual', used, total);
// updateLeaveSummary('sick', used, total);
