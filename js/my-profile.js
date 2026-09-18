const changePhotoButton=document.querySelector('#change-photo-btn');
const profilePhotoInput=document.querySelector('#profile-photo-input');
const profilePhotoPreview=document.querySelector('#profile-photo-preview');
const userAvatarPreview=document.querySelector('#user-avatar-preview');
const PROFILE_PHOTO_KEY='primeit_member_profile_photo';

function showProfilePhoto(imageSrc){
  if(!imageSrc) return;

  if(profilePhotoPreview){
    profilePhotoPreview.innerHTML='';
    const profileImage=document.createElement('img');
    profileImage.src=imageSrc;
    profileImage.alt='Profile photo';
    profilePhotoPreview.appendChild(profileImage);
  }

  if(userAvatarPreview){
    userAvatarPreview.innerHTML='';
    const userImage=document.createElement('img');
    userImage.src=imageSrc;
    userImage.alt='Profile photo';
    userAvatarPreview.appendChild(userImage);
  }
}

if(changePhotoButton&&profilePhotoInput){
  changePhotoButton.addEventListener('click',()=>profilePhotoInput.click());

  profilePhotoInput.addEventListener('change',()=>{
    const file=profilePhotoInput.files?.[0];
    if(!file) return;

    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      profilePhotoInput.value='';
      return;
    }

    const reader=new FileReader();
    reader.addEventListener('load',()=>{
      const imageSrc=reader.result;
      try{
        localStorage.setItem(PROFILE_PHOTO_KEY,imageSrc);
        showProfilePhoto(imageSrc);
      }catch(error){
        console.error('Unable to save profile photo locally.',error);
        showProfilePhoto(imageSrc);
      }
    });
    reader.readAsDataURL(file);
  });
}

try{
  const savedPhoto=localStorage.getItem(PROFILE_PHOTO_KEY);
  if(savedPhoto) showProfilePhoto(savedPhoto);
}catch(error){
  console.error('Unable to restore profile photo.',error);
}



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
if(toggle&&sidebar) toggle.addEventListener('click',()=>sidebar.classList.toggle('open'));
document.querySelectorAll('.sidebar a').forEach(a=>a.addEventListener('click',()=>sidebar?.classList.remove('open')));
