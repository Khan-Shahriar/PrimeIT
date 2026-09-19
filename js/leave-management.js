const leaveState={
  history:[],
  balance:null,
  holidays:null,
  selectedRequestId:null,
  lastFocusedElement:null
};

const form=document.querySelector('#leave-request-form');
const leaveType=document.querySelector('#leave-type');
const startDate=document.querySelector('#start-date');
const endDate=document.querySelector('#end-date');
const reason=document.querySelector('#leave-reason');
const requestedDays=document.querySelector('#requested-days');
const reasonCount=document.querySelector('#reason-count');
const requestSummary=document.querySelector('#request-summary');
const summaryType=document.querySelector('#summary-type');
const summaryDays=document.querySelector('#summary-days');
const formState=document.querySelector('#request-form-state');
const submitButton=document.querySelector('#submit-leave-request');
const resetButton=document.querySelector('#reset-leave-request');
const cancelModal=document.querySelector('#cancel-modal');
const cancelModalState=document.querySelector('#cancel-modal-state');
const cancelRequestSummary=document.querySelector('#cancel-request-summary');
const confirmCancelButton=document.querySelector('#confirm-cancel-request');
const toast=document.querySelector('#leave-toast');
const sidebar=document.querySelector('#member-sidebar');
const mobileToggle=document.querySelector('.mobile-toggle');

const leaveTypeLabels={
  holiday:'Holiday Leave',
  casual:'Casual Leave',
  sick:'Sick Leave'
};

const statusLabels={
  pending:'Pending',
  approved:'Approved',
  rejected:'Rejected',
  cancelled:'Cancelled'
};

function showToast(message){
  if(!toast) return;
  toast.textContent=message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer=window.setTimeout(()=>toast.classList.remove('show'),2800);
}

function setFieldError(field,errorId,message){
  const error=document.getElementById(errorId);
  if(error) error.textContent=message||'';
  if(field){
    field.setAttribute('aria-invalid',message?'true':'false');
  }
}

function clearValidation(){
  setFieldError(leaveType,'leave-type-error','');
  setFieldError(startDate,'start-date-error','');
  setFieldError(endDate,'end-date-error','');
  setFieldError(reason,'leave-reason-error','');
}

function parseDateInput(value){
  if(!value) return null;
  const [year,month,day]=value.split('-').map(Number);
  if(!year||!month||!day) return null;
  const date=new Date(year,month-1,day);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day) return null;
  date.setHours(0,0,0,0);
  return date;
}

function calculateRequestedDays(){
  const start=parseDateInput(startDate?.value);
  const end=parseDateInput(endDate?.value);

  if(!start||!end||end<start){
    if(requestedDays) requestedDays.value='—';
    if(requestSummary) requestSummary.hidden=true;
    return null;
  }

  const days=Math.floor((end-start)/86400000)+1;
  if(requestedDays) requestedDays.value=String(days);
  if(requestSummary){
    requestSummary.hidden=false;
    summaryType.textContent=leaveTypeLabels[leaveType.value]||'—';
    summaryDays.textContent=String(days);
  }
  return days;
}

function validateForm(){
  clearValidation();
  let valid=true;
  const start=parseDateInput(startDate.value);
  const end=parseDateInput(endDate.value);

  if(!leaveType.value){
    setFieldError(leaveType,'leave-type-error','Select a leave type.');
    valid=false;
  }

  if(!startDate.value){
    setFieldError(startDate,'start-date-error','Select a start date.');
    valid=false;
  }else if(!start){
    setFieldError(startDate,'start-date-error','Enter a valid date.');
    valid=false;
  }

  if(!endDate.value){
    setFieldError(endDate,'end-date-error','Select an end date.');
    valid=false;
  }else if(!end){
    setFieldError(endDate,'end-date-error','Enter a valid date.');
    valid=false;
  }

  if(start&&end&&end<start){
    setFieldError(endDate,'end-date-error','End date cannot be before the start date.');
    valid=false;
  }

  const days=start&&end&&end>=start?calculateRequestedDays():null;
  if(days!==null&&days<=0){
    setFieldError(endDate,'end-date-error','The requested duration must be at least one day.');
    valid=false;
  }

  return valid;
}

function updateReasonCount(){
  if(reasonCount) reasonCount.textContent=`${reason.value.length} / 1000`;
}

function setFormState(message,type='info'){
  if(!formState) return;
  formState.textContent=message||'';
  formState.className=`form-state ${message?type:''}`;
}

function resetFormUi(){
  clearValidation();
  setFormState('');
  if(requestedDays) requestedDays.value='—';
  if(requestSummary) requestSummary.hidden=true;
  updateReasonCount();
}

function setupForm(){
  [leaveType,startDate,endDate,reason].forEach(field=>{
    field?.addEventListener('input',()=>{
      const errorId=field===leaveType?'leave-type-error':field===startDate?'start-date-error':field===endDate?'end-date-error':'leave-reason-error';
      setFieldError(field,errorId,'');
      if(field===startDate||field===endDate||field===leaveType) calculateRequestedDays();
    });
    field?.addEventListener('change',()=>{
      if(field===startDate||field===endDate||field===leaveType) calculateRequestedDays();
    });
  });

  reason?.addEventListener('input',updateReasonCount);

  form?.addEventListener('submit',event=>{
    event.preventDefault();
    if(!validateForm()){
      setFormState('Please correct the highlighted fields before continuing.','error');
      return;
    }

    setFormState('The form is valid and ready for REST API submission. No request was sent from this frontend.','info');
    showToast('Leave request is ready for API integration.');
  });

  resetButton?.addEventListener('click',()=>{
    window.setTimeout(resetFormUi,0);
  });
}

function setBalanceLoading(isLoading){
  document.querySelectorAll('[data-balance-used],[data-balance-remaining]').forEach(element=>{
    if(isLoading) element.textContent='…';
  });
}

function renderBalance(balance){
  leaveState.balance=balance||null;
  if(!balance){
    setBalanceLoading(false);
    return;
  }

  ['holiday','casual','sick'].forEach(type=>{
    const item=balance[type];
    if(!item) return;
    const total=document.querySelector(`[data-balance-total="${type}"]`);
    const used=document.querySelector(`[data-balance-used="${type}"]`);
    const remaining=document.querySelector(`[data-balance-remaining="${type}"]`);
    if(total&&Number.isFinite(item.total)) total.textContent=String(item.total);
    if(used&&Number.isFinite(item.used)) used.textContent=String(item.used);
    if(remaining&&Number.isFinite(item.remaining)) remaining.textContent=String(item.remaining);
  });
}

function renderHistory(requests){
  leaveState.history=Array.isArray(requests)?requests:[];
  const loading=document.querySelector('#history-loading');
  const empty=document.querySelector('#history-empty');
  const error=document.querySelector('#history-error');
  const table=document.querySelector('#history-table-container');
  const body=document.querySelector('#leave-history-body');

  loading.hidden=true;
  error.hidden=true;

  if(!leaveState.history.length){
    table.hidden=true;
    empty.hidden=false;
    return;
  }

  empty.hidden=true;
  table.hidden=false;
  body.replaceChildren();

  leaveState.history.forEach(request=>{
    const row=document.createElement('tr');
    const type=document.createElement('td');
    type.textContent=leaveTypeLabels[request.leaveType]||request.leaveType||'—';

    const dates=document.createElement('td');
    dates.textContent=formatDateRange(request.startDate,request.endDate);

    const days=document.createElement('td');
    days.textContent=Number.isFinite(request.days)?String(request.days):'—';

    const reasonCell=document.createElement('td');
    reasonCell.className='reason-cell';
    reasonCell.textContent=request.reason||'—';

    const submitted=document.createElement('td');
    submitted.textContent=formatDate(request.submittedAt);

    const status=document.createElement('td');
    const badge=document.createElement('span');
    const normalized=String(request.status||'').toLowerCase();
    badge.className=`status-badge status-${statusLabels[normalized]?'': 'cancelled'}`;
    if(normalized==='pending') badge.className='status-badge status-pending';
    else if(normalized==='approved') badge.className='status-badge status-approved';
    else if(normalized==='rejected') badge.className='status-badge status-rejected';
    else if(normalized==='cancelled') badge.className='status-badge status-cancelled';
    badge.textContent=statusLabels[normalized]||'Unknown';
    status.appendChild(badge);

    const action=document.createElement('td');
    action.className='action-cell';
    if(isCancellationEligible(request)){
      const button=document.createElement('button');
      button.type='button';
      button.className='btn btn-danger btn-sm';
      button.textContent='Cancel';
      button.dataset.cancelRequestId=String(request.id||'');
      button.addEventListener('click',()=>openCancelModal(request));
      action.appendChild(button);
    }else{
      action.textContent='—';
    }

    [type,dates,days,reasonCell,submitted,status,action].forEach(cell=>row.appendChild(cell));
    body.appendChild(row);
  });
}

function renderHistoryError(){
  document.querySelector('#history-loading').hidden=true;
  document.querySelector('#history-empty').hidden=true;
  document.querySelector('#history-table-container').hidden=true;
  document.querySelector('#history-error').hidden=false;
}

function isCancellationEligible(request){
  const status=String(request?.status||'').toLowerCase();
  return Boolean(request?.cancellationEligible)&&status==='pending';
}

function formatDate(value){
  if(!value) return '—';
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date);
}

function formatDateRange(start,end){
  if(!start&&!end) return '—';
  const first=formatDate(start);
  const last=formatDate(end);
  return start&&end&&start!==end?`${first} – ${last}`:first;
}

function openCancelModal(request){
  leaveState.selectedRequestId=request?.id??null;
  leaveState.lastFocusedElement=document.activeElement;
  cancelRequestSummary.textContent=`${leaveTypeLabels[request?.leaveType]||'Leave'} · ${formatDateRange(request?.startDate,request?.endDate)}`;
  cancelModalState.textContent='';
  confirmCancelButton.disabled=false;
  cancelModal.hidden=false;
  confirmCancelButton.focus();
}

function closeCancelModal(){
  cancelModal.hidden=true;
  leaveState.selectedRequestId=null;
  if(leaveState.lastFocusedElement&&typeof leaveState.lastFocusedElement.focus==='function'){
    leaveState.lastFocusedElement.focus();
  }
}

function setupCancelModal(){
  document.querySelectorAll('[data-action="close-cancel-modal"]').forEach(button=>{
    button.addEventListener('click',closeCancelModal);
  });

  cancelModal?.addEventListener('click',event=>{
    if(event.target===cancelModal) closeCancelModal();
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!cancelModal.hidden) closeCancelModal();
  });

  confirmCancelButton?.addEventListener('click',()=>{
    if(!leaveState.selectedRequestId) return;
    confirmCancelButton.disabled=true;
    cancelModalState.textContent='Cancellation is ready for API integration. No request was sent from this frontend.';
    cancelModalState.className='modal-state info';
    showToast('Cancellation is ready for API integration.');
  });
}

function setupMobileNavigation(){
  mobileToggle?.addEventListener('click',()=>{
    const isOpen=sidebar.classList.toggle('open');
    mobileToggle.setAttribute('aria-expanded',String(isOpen));
    mobileToggle.setAttribute('aria-label',isOpen?'Close navigation menu':'Open navigation menu');
  });

  sidebar?.querySelectorAll('a').forEach(link=>{
    link.addEventListener('click',()=>{
      sidebar.classList.remove('open');
      mobileToggle?.setAttribute('aria-expanded','false');
      mobileToggle?.setAttribute('aria-label','Open navigation menu');
    });
  });
}

function setupRetryControls(){
  document.querySelector('[data-action="retry-balance"]')?.addEventListener('click',()=>{
    showToast('Leave balance API integration is pending.');
  });
  document.querySelector('[data-action="retry-history"]')?.addEventListener('click',()=>{
    showToast('Leave history API integration is pending.');
  });
  document.querySelector('[data-action="retry-holidays"]')?.addEventListener('click',()=>{
    showToast('Holiday API integration is pending.');
  });
}

function setupFutureApiBoundary(){
  // Future authenticated REST calls belong here.
  // Authentication will rely on the server-managed HTTP-only cookie.
  // Do not read, create, or persist JWT tokens in browser storage or document.cookie.
  //
  // Expected future operations:
  // - GET current member leave balance
  // - GET current member leave history
  // - GET company holidays
  // - POST a new member-owned leave request
  // - request cancellation for an eligible member-owned leave request
}

function initialize(){
  setupForm();
  setupCancelModal();
  setupMobileNavigation();
  setupRetryControls();
  setupFutureApiBoundary();
  updateReasonCount();
  setBalanceLoading(false);
  renderHistory([]);
}

initialize();