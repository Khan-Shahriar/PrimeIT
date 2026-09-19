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
if(toggle&&sidebar){
  toggle.addEventListener('click',()=>{
    const isOpen=sidebar.classList.toggle('open');
    toggle.setAttribute('aria-expanded',String(isOpen));
    toggle.setAttribute('aria-label',isOpen?'Close navigation menu':'Open navigation menu');
  });
}
document.querySelectorAll('.sidebar a').forEach(a=>a.addEventListener('click',()=>{
  sidebar?.classList.remove('open');
  toggle?.setAttribute('aria-expanded','false');
  toggle?.setAttribute('aria-label','Open navigation menu');
}));
