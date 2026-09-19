const savedProfilePhoto=localStorage.getItem('primeit_member_profile_photo');
const dashboardUserAvatar=document.querySelector('#user-avatar-preview');
const welcomeMemberName=document.querySelector('#welcome-member-name');
const dashboardDate=document.querySelector('#dashboard-date');

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

if(savedProfilePhoto&&dashboardUserAvatar){
  dashboardUserAvatar.innerHTML='';
  const image=document.createElement('img');
  image.src=savedProfilePhoto;
  image.alt='Profile photo';
  dashboardUserAvatar.appendChild(image);
}

if(welcomeMemberName){
  const userName=dashboardUserAvatar?.previousElementSibling?.textContent?.trim();
  if(userName) welcomeMemberName.textContent=userName;
}

if(dashboardDate){
  const now=new Date();
  dashboardDate.textContent=new Intl.DateTimeFormat('en-US',{
    month:'short',
    day:'2-digit',
    year:'numeric'
  }).format(now);
}

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

function updateLeaveSummary(type,used,total){
  const elements=leaveSummaryElements[type];
  if(!elements||!Number.isFinite(used)||!Number.isFinite(total)||total<=0) return;
  const remaining=Math.max(total-used,0);
  const percentage=Math.min(Math.max((used/total)*100,0),100);
  if(elements.balance) elements.balance.textContent=`${used} used / ${total}`;
  if(elements.remaining) elements.remaining.textContent=`${remaining} day${remaining===1?'':'s'} remaining`;
  if(elements.progress){
    elements.progress.style.width=`${percentage}%`;
    elements.progress.setAttribute('aria-valuenow',String(Math.round(percentage)));
    elements.progress.setAttribute('aria-valuemin','0');
    elements.progress.setAttribute('aria-valuemax','100');
  }
}

// Future authenticated API integration point:
// updateLeaveSummary('casual', used, total);
// updateLeaveSummary('sick', used, total);

document.querySelectorAll('[data-toast]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const text=btn.dataset.toast||'Action completed';
    let t=document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
    t.textContent=text;t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),2200);
  });
});
document.querySelectorAll('form[data-demo]').forEach(form=>{
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const btn=form.querySelector('button[type="submit"]');
    if(btn){const old=btn.textContent;btn.textContent='Saved ✓';setTimeout(()=>btn.textContent=old,1300);}
  });
});

const toggle=document.querySelector('.mobile-toggle');
const sidebar=document.querySelector('.sidebar');
if(toggle&&sidebar) toggle.addEventListener('click',()=>{
  const isOpen=sidebar.classList.toggle('open');
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-label',isOpen?'Close navigation menu':'Open navigation menu');
});
document.querySelectorAll('.sidebar a').forEach(a=>a.addEventListener('click',()=>{
  sidebar?.classList.remove('open');
  toggle?.setAttribute('aria-expanded','false');
  toggle?.setAttribute('aria-label','Open navigation menu');
}));