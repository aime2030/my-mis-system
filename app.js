const DB_NAME='MIS_INDEXEDDB_APP';
const DB_VERSION=7;
const ADMIN_EMAIL='admin@example.com';
const ADMIN_PASSWORD='admin123';
let db;
let invoiceModeActive=false;
let returnToInvoiceForm=false;

const money=n=>'RWF '+Number(n||0).toLocaleString('en-RW',{minimumFractionDigits:0,maximumFractionDigits:0});
const today=()=>new Date().toISOString().slice(0,10);
const byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

const defaultSettings={
  companyName:'SPEED UP STUDIO COMPANY LTD',
  companyLocation:'Rubona kuwa 15/12/2025, Akarere ka Rwamagana, Umurenge wa Rubona',
  companyPhone:'0788493603',
  companyTin:'107623016',
  companyEmail:'info@speedupstudio.rw',
  directorName:'RUKINGA Eric',
  logoData:'',
  signatureData:''
};

function createStores(database){
  if(!database.objectStoreNames.contains('stock')) database.createObjectStore('stock',{keyPath:'id',autoIncrement:true});
  if(!database.objectStoreNames.contains('invoices')) database.createObjectStore('invoices',{keyPath:'id',autoIncrement:true});
  if(!database.objectStoreNames.contains('settings')) database.createObjectStore('settings',{keyPath:'id'});
  if(!database.objectStoreNames.contains('buttonBoxes')) database.createObjectStore('buttonBoxes',{keyPath:'id',autoIncrement:true});
}
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=e=>{db=e.target.result;createStores(db);};
    req.onsuccess=e=>{db=e.target.result;resolve(db)};
    req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
    req.onblocked=()=>reject(new Error('Database upgrade blocked. Close other open MIS tabs, then refresh.'));
  });
}
function tx(store,mode='readonly'){
  if(!db) throw new Error('Database is not ready. Refresh the page.');
  if(!db.objectStoreNames.contains(store)) throw new Error('Missing storage area: '+store+'. Close all MIS tabs and refresh.');
  return db.transaction(store,mode).objectStore(store);
}
function getAll(store){return new Promise((res,rej)=>{try{const r=tx(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error||new Error('Read failed'));}catch(e){rej(e)}})}
function getOne(store,id){return new Promise((res,rej)=>{try{const r=tx(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('Read failed'));}catch(e){rej(e)}})}
function put(store,data){return new Promise((res,rej)=>{try{const r=tx(store,'readwrite').put(data);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('Save failed'));}catch(e){rej(e)}})}
function del(store,id){return new Promise((res,rej)=>{try{const r=tx(store,'readwrite').delete(Number(id));r.onsuccess=()=>res();r.onerror=()=>rej(r.error||new Error('Delete failed'));}catch(e){rej(e)}})}
async function getSettings(){return (await getOne('settings','branding'))||{id:'branding',...defaultSettings}}
async function saveSettings(data){
  const clean={id:'branding',...defaultSettings,...data};
  await put('settings',clean);
  return clean;
}
function fileToDataURL(file){return new Promise((res,rej)=>{if(!file)return res('');const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(reader.error);reader.readAsDataURL(file);});}
function showAlert(id,msg,type='ok'){
  const el=byId(id);
  if(!el){ alert(msg); return; }
  el.innerHTML=`<div class="alert ${type==='error'?'error':''}">${msg}</div>`;
  setTimeout(()=>{ if(el) el.innerHTML=''; },2800);
}

function showApp(){byId('loginPage').classList.add('hidden');byId('appPage').classList.remove('hidden');refreshAll();}
function showLogin(){byId('appPage').classList.add('hidden');byId('loginPage').classList.remove('hidden');}
loginForm.onsubmit=e=>{e.preventDefault();const email=loginEmail.value.trim().toLowerCase();const pass=loginPassword.value;if(email===ADMIN_EMAIL&&pass===ADMIN_PASSWORD){localStorage.setItem('misLoggedIn','yes');showApp();}else{showAlert('loginAlert','Invalid email or password','error')}};
logoutBtn.onclick=e=>{e.preventDefault();localStorage.removeItem('misLoggedIn');showLogin();};

function toggleSidebar(){document.querySelector('.sidebar').classList.toggle('active');document.querySelector('.sidebar-backdrop').classList.toggle('active')}
function closeSidebar(){document.querySelector('.sidebar').classList.remove('active');document.querySelector('.sidebar-backdrop').classList.remove('active')}
function showPage(page){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active-page'));byId(page).classList.add('active-page');document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.page===page));closeSidebar();refreshAll();}
document.querySelectorAll('.nav-link').forEach(a=>a.onclick=e=>{e.preventDefault();showPage(a.dataset.page)});

async function refreshDashboard(){const stock=await getAll('stock'), invoices=await getAll('invoices');const stockValue=stock.reduce((s,i)=>s+(+i.quantity*+i.unitPrice),0);const invAmount=invoices.reduce((s,i)=>s+ +i.amount,0);const paid=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+ +i.amount,0);const unpaid=invAmount-paid;const todayInvoices=invoices.filter(i=>i.invoiceDate===today());totalStockItems.textContent=stock.length;totalStockValue.textContent=money(stockValue);totalInvoices.textContent=invoices.length;totalInvoiceAmount.textContent=money(invAmount);paidAmount.textContent=money(paid);unpaidAmount.textContent=money(unpaid);todayDate.textContent=today();todayInvoices.textContent=todayInvoices.length;todayAmount.textContent=money(todayInvoices.reduce((s,i)=>s+ +i.amount,0));const low=stock.filter(i=>+i.quantity<=5);lowStockList.innerHTML=low.length?low.map(i=>`<p><strong>${esc(i.itemName)}</strong>: ${esc(i.quantity)} left</p>`).join(''):'<p>No low stock items.</p>';}
async function refreshStock(){const items=(await getAll('stock')).sort((a,b)=>b.id-a.id);stockTable.innerHTML=items.map(i=>`<tr><td>${esc(i.itemName)}</td><td>${esc(i.quantity)}</td><td>${money(i.unitPrice)}</td><td>${money(i.quantity*i.unitPrice)}</td><td><button class="btn small" onclick="editStock(${i.id})">Edit</button> <button class="btn red small" onclick="deleteStock(${i.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="5">No stock yet.</td></tr>';}
async function editStock(id){const i=await getOne('stock',id);stockId.value=i.id;itemName.value=i.itemName;quantity.value=i.quantity;unitPrice.value=i.unitPrice;stockFormTitle.textContent='Edit Stock Item';showPage('stock');}
async function deleteStock(id){if(confirm('Delete this item?')){await del('stock',id);refreshAll();}}
stockForm.onsubmit=async e=>{e.preventDefault();const data={itemName:itemName.value.trim(),quantity:+quantity.value,unitPrice:+unitPrice.value,updatedAt:new Date().toISOString()};if(!data.itemName)return showAlert('stockAlert','Please enter stock name','error');if(data.quantity<0||data.unitPrice<0)return showAlert('stockAlert','Quantity and price cannot be negative','error');if(stockId.value)data.id=+stockId.value;await put('stock',data);stockForm.reset();stockId.value='';stockFormTitle.textContent='Add Stock Item';showAlert('stockAlert','Stock saved successfully');refreshAll();}
resetStockForm.onclick=()=>{stockForm.reset();stockId.value='';stockFormTitle.textContent='Add Stock Item'};


async function refreshBoxes(){
  let boxes=[];
  try{
    boxes=(await getAll('buttonBoxes')).sort((a,b)=>(b.id||0)-(a.id||0));
  }catch(err){
    console.error('Button box load failed:',err);
    showAlert('boxAlert','Button box storage is being prepared. Refresh the page and try again.','error');
    return;
  }
  const table=byId('boxTable');
  if(table){
    table.innerHTML=boxes.map(b=>`<tr><td>${esc(b.boxName)}</td><td>${esc(b.buttonsLeft)}</td><td>${money(b.pricePerButton)}</td><td>${money((+b.buttonsLeft||0)*(+b.pricePerButton||0))}</td><td><button class="btn small" onclick="editBox(${b.id})">Edit</button> <button class="btn red small" onclick="deleteBox(${b.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="5">No button boxes uploaded yet.</td></tr>';
  }
  const select=byId('invoiceBoxSelect');
  if(select){
    select.innerHTML='<option value="">Choose uploaded button box</option>'+boxes.map(b=>`<option value="${b.id}" data-name="${esc(b.boxName)}" data-left="${b.buttonsLeft}" data-price="${b.pricePerButton}">${esc(b.boxName)} - ${esc(b.buttonsLeft)} buttons left - ${money(b.pricePerButton)}</option>`).join('');
  }
}
async function editBox(id){
  const b=await getOne('buttonBoxes',id);
  if(!b) return showAlert('boxAlert','Button box not found','error');
  byId('boxId').value=b.id;
  byId('boxName').value=b.boxName||'';
  byId('boxButtons').value=b.buttonsLeft||0;
  byId('boxPrice').value=b.pricePerButton||0;
  byId('boxName').focus();
}
async function deleteBox(id){if(confirm('Delete this button box?')){await del('buttonBoxes',id);await refreshBoxes();showAlert('boxAlert','Button box deleted successfully');}}
function resetBoxFormFields(){const f=byId('boxForm'); if(f) f.reset(); const id=byId('boxId'); if(id) id.value='';}
if(byId('resetBoxForm')) if(byId('resetBoxForm')) byId('resetBoxForm').onclick=resetBoxFormFields;
function hideInvoiceSubViews(){
  ['invoiceListView','boxManagerView','invoiceDetailView','invoiceFormView','invoicePreview'].forEach(id=>{const el=byId(id); if(el) el.classList.add('hidden');});
}
function showInvoiceList(){invoiceModeActive=false;returnToInvoiceForm=false;hideInvoiceSubViews();byId('invoiceListView').classList.remove('hidden');}
function showCreateInvoiceView(){hideInvoiceSubViews();byId('invoiceFormView').classList.remove('hidden');invoiceModeActive=true;renderInvoiceBoxLines();}
function showInvoiceDetailPage(){hideInvoiceSubViews();byId('invoiceDetailView').classList.remove('hidden');invoiceModeActive=true;refreshBoxes();updateBoxPreview();renderInvoiceBoxLines();}
function showBoxDetailsPage(fromForm=false){hideInvoiceSubViews();byId('boxManagerView').classList.remove('hidden');returnToInvoiceForm=!!fromForm;refreshBoxes();}
function hideBoxManager(){showInvoiceList();}

function nextInvoiceNo(invoices){const num=(invoices.length+1).toString().padStart(4,'0');return 'INV-'+new Date().getFullYear()+'-'+num;}
function getInvoiceBoxLines(){
  return [...document.querySelectorAll('.item-row.box-stock-line')].map(row=>({
    row,
    boxId:+row.dataset.boxId||0,
    boxName:row.dataset.boxName||'Button Box',
    qty:+row.querySelector('.qty').value||0,
    price:+row.querySelector('.price').value||0,
    desc:row.querySelector('.desc').value||'Buttons from box'
  }));
}
function renderInvoiceBoxLines(){
  const list=byId('invoiceBoxLinesList');
  const summary=byId('invoiceDetailSummary');
  const lines=getInvoiceBoxLines();
  const totalButtons=lines.reduce((s,l)=>s+l.qty,0);
  const totalAmount=lines.reduce((s,l)=>s+(l.qty*l.price),0);
  if(list){
    list.innerHTML=lines.length?`<div class="table-wrapper"><table class="table"><thead><tr><th>Box</th><th>Buttons</th><th>Price</th><th>Total</th><th>Action</th></tr></thead><tbody>${lines.map((l,idx)=>`<tr><td>${esc(l.boxName)}</td><td>${esc(l.qty)}</td><td>${money(l.price)}</td><td>${money(l.qty*l.price)}</td><td><button class="btn red small" type="button" onclick="removeInvoiceBoxLine(${idx})">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'No box added to this invoice yet.';
  }
  if(summary){
    summary.textContent=lines.length?`Invoice box detail: ${totalButtons} button(s) from ${lines.length} box(es). Box amount: ${money(totalAmount)}.`:'No button box selected. Use Invoice Details if the client needs buttons from a box.';
  }
  calcInvoiceTotal();
}
function removeInvoiceBoxLine(index){
  const lines=getInvoiceBoxLines();
  if(lines[index]) lines[index].row.remove();
  renderInvoiceBoxLines();
}
function updateBoxPreview(){
  const select=byId('invoiceBoxSelect');
  const countInput=byId('invoiceBoxCount');
  const preview=byId('boxRemainingPreview');
  if(!select||!countInput||!preview) return;
  const boxIdVal=+select.value||0;
  const count=+countInput.value||0;
  if(!boxIdVal){preview.textContent='No box selected.';return;}
  const opt=select.selectedOptions[0];
  const left=+opt.dataset.left||0;
  const price=+opt.dataset.price||0;
  const name=opt.dataset.name||'Button box';
  const already=getInvoiceBoxLines().filter(l=>l.boxId===boxIdVal).reduce((s,l)=>s+l.qty,0);
  const remainBeforeNew=left-already;
  if(count<=0){preview.textContent=`${name}: ${left} button(s) left. Already added on this invoice: ${already}. Available now: ${remainBeforeNew}. Price: ${money(price)}.`;return;}
  if(count>remainBeforeNew){preview.textContent=`Not enough buttons. ${name} has ${remainBeforeNew} button(s) available for this invoice.`;return;}
  preview.textContent=`${name}: add ${count} button(s). Remaining after saving invoice: ${remainBeforeNew-count}. Price per button: ${money(price)}.`;
}
function setBoxCount(n){invoiceBoxCount.value=n;document.querySelectorAll('.box-button-grid button').forEach(b=>b.classList.toggle('active',b.dataset.box==String(n)));updateBoxPreview();}
document.querySelectorAll('.box-button-grid button').forEach(b=>b.onclick=()=>setBoxCount(b.dataset.box));
if(byId('invoiceBoxCount')) byId('invoiceBoxCount').oninput=()=>{document.querySelectorAll('.box-button-grid button').forEach(b=>b.classList.toggle('active',b.dataset.box==String(invoiceBoxCount.value)));updateBoxPreview();};
if(byId('invoiceBoxSelect')) byId('invoiceBoxSelect').onchange=updateBoxPreview;
function clearBoxSelection(){
  if(byId('invoiceBoxCount')) byId('invoiceBoxCount').value='';
  if(byId('invoiceBoxSelect')) byId('invoiceBoxSelect').value='';
  document.querySelectorAll('.box-button-grid button').forEach(b=>b.classList.remove('active'));
  updateBoxPreview();
}
function addBoxDetailToInvoice(){
  const select=byId('invoiceBoxSelect');
  const countInput=byId('invoiceBoxCount');
  if(!select||!countInput) return;
  const boxId=+select.value||0;
  const count=+countInput.value||0;
  if(!boxId) return alert('Please choose a button box.');
  if(count<=0) return alert('Please enter number of buttons.');
  const opt=select.selectedOptions[0];
  const left=+opt.dataset.left||0;
  const price=+opt.dataset.price||0;
  const name=opt.dataset.name||'Button box';
  const already=getInvoiceBoxLines().filter(l=>l.boxId===boxId).reduce((s,l)=>s+l.qty,0);
  if(count+already>left) return alert('This box has only '+(left-already)+' button(s) available for this invoice.');
  const row=document.createElement('div');
  row.className='item-row box-stock-line';
  row.dataset.boxId=boxId;
  row.dataset.boxName=name;
  row.innerHTML=`<select class="input stock-select" disabled><option>Button Box</option></select><input class="input desc"><input class="input qty" type="number" step="1" min="1" readonly><input class="input price" type="number" step="0.01" min="0" readonly><input class="input amount" readonly value="0"><button type="button" class="btn light small">Remove</button>`;
  invoiceItemsWrapper.prepend(row);
  row.querySelector('.desc').value='Buttons from '+name;
  row.querySelector('.qty').value=count;
  row.querySelector('.price').value=price;
  row.querySelector('button').onclick=()=>{row.remove();renderInvoiceBoxLines();};
  calcRow(row);
  clearBoxSelection();
  renderInvoiceBoxLines();
}
async function addLine(){const stock=await getAll('stock');const div=document.createElement('div');div.className='item-row';div.innerHTML=`<select class="input stock-select"><option value="">Manual item</option>${stock.map(s=>`<option value="${s.id}" data-name="${esc(s.itemName)}" data-price="${s.unitPrice}">${esc(s.itemName)} (${s.quantity} left)</option>`).join('')}</select><input class="input desc" placeholder="Description"><input class="input qty" type="number" step="0.01" value="1" min="0.01" required><input class="input price" type="number" step="0.01" value="0" min="0" required><input class="input amount" readonly value="0"><button type="button" class="btn light small">Remove</button>`;invoiceItemsWrapper.appendChild(div);div.querySelector('button').onclick=()=>{div.remove();calcInvoiceTotal()};div.querySelector('.stock-select').onchange=e=>{const opt=e.target.selectedOptions[0];if(opt.value){div.querySelector('.desc').value=opt.dataset.name;div.querySelector('.price').value=opt.dataset.price;}calcRow(div)};['qty','price'].forEach(c=>div.querySelector('.'+c).oninput=()=>calcRow(div));calcRow(div)}
function calcRow(row){const q=+row.querySelector('.qty').value||0,p=+row.querySelector('.price').value||0;row.querySelector('.amount').value=(q*p).toFixed(2);calcInvoiceTotal()}function calcInvoiceTotal(){const total=[...document.querySelectorAll('#invoiceItemsWrapper .item-row .amount')].reduce((s,i)=>s+(+i.value||0),0);invoiceTotal.textContent=money(total);return total}
if(byId('showBoxManager')) byId('showBoxManager').onclick=()=>showBoxDetailsPage(false);
if(byId('showBoxManagerFromForm')) byId('showBoxManagerFromForm').onclick=()=>showBoxDetailsPage(true);
if(byId('showInvoiceDetailsFromForm')) byId('showInvoiceDetailsFromForm').onclick=()=>showInvoiceDetailPage();
if(byId('backFromInvoiceDetails')) byId('backFromInvoiceDetails').onclick=()=>showCreateInvoiceView();
if(byId('openBoxDetailsFromDetail')) byId('openBoxDetailsFromDetail').onclick=()=>showBoxDetailsPage(true);
if(byId('addBoxToInvoiceDetail')) byId('addBoxToInvoiceDetail').onclick=addBoxDetailToInvoice;
if(byId('clearInvoiceBoxSelection')) byId('clearInvoiceBoxSelection').onclick=clearBoxSelection;
if(byId('backFromBoxes')) byId('backFromBoxes').onclick=()=>{ returnToInvoiceForm?showCreateInvoiceView():showInvoiceList(); refreshInvoices(); refreshBoxes(); };
if(byId('boxForm')) byId('boxForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const name=byId('boxName').value.trim();
    const buttons=Number(byId('boxButtons').value);
    const price=Number(byId('boxPrice').value);
    const currentId=byId('boxId').value;
    const data={boxName:name,buttonsLeft:Number.isFinite(buttons)?buttons:0,pricePerButton:Number.isFinite(price)?price:0,updatedAt:new Date().toISOString()};
    if(!data.boxName)return showAlert('boxAlert','Enter box name or box number','error');
    if(data.buttonsLeft<0||data.pricePerButton<0)return showAlert('boxAlert','Buttons and price cannot be negative','error');
    if(currentId)data.id=Number(currentId);
    await put('buttonBoxes',data);
    resetBoxFormFields();
    await refreshBoxes();
    updateBoxPreview();
    await refreshDashboard();
    showAlert('boxAlert','Button box saved successfully');
  }catch(err){
    console.error('Save button box failed:',err);
    showAlert('boxAlert','Save failed: '+(err && err.message ? err.message : err),'error');
  }
};
if(byId('resetBoxForm')) byId('resetBoxForm').onclick=resetBoxFormFields;
showInvoiceForm.onclick=async()=>{showCreateInvoiceView();invoiceForm.reset();await refreshBoxes();invoiceDate.value=today();clearBoxSelection();invoiceNumber.value=nextInvoiceNo(await getAll('invoices'));invoiceItemsWrapper.innerHTML='';await addLine();renderInvoiceBoxLines();}
cancelInvoice.onclick=()=>{showInvoiceList();};addInvoiceItem.onclick=addLine;
invoiceForm.onsubmit=async e=>{
  e.preventDefault();
  renderInvoiceBoxLines();
  const stock=await getAll('stock');
  const boxes=await getAll('buttonBoxes');
  const rows=[...document.querySelectorAll('#invoiceItemsWrapper .item-row')];
  const lines=[];const usage={};const boxUsage={};
  for(const r of rows){
    const isBoxLine=r.classList.contains('box-stock-line');
    const stockSelect=r.querySelector('.stock-select');
    const stockId=isBoxLine?0:(+stockSelect.value||0);
    const boxId=isBoxLine?(+r.dataset.boxId||0):0;
    const boxName=isBoxLine?(r.dataset.boxName||'Button Box'):'';
    const desc=r.querySelector('.desc').value.trim()||'Service';
    const quantity=+r.querySelector('.qty').value||0;
    const unitPrice=+r.querySelector('.price').value||0;
    if(quantity<=0)return alert('Quantity must be greater than 0');
    if(stockId)usage[stockId]=(usage[stockId]||0)+quantity;
    if(boxId)boxUsage[boxId]=(boxUsage[boxId]||0)+quantity;
    lines.push({stockId,boxId,boxName,description:desc,quantity,unitPrice,amount:quantity*unitPrice});
  }
  for(const id in usage){const item=stock.find(s=>s.id===+id);if(!item||usage[id]>+item.quantity)return alert('Not enough stock for '+(item?item.itemName:'selected item'));}
  for(const id in boxUsage){const box=boxes.find(b=>b.id===+id);if(!box)return alert('Selected button box was not found.');if(boxUsage[id]>+box.buttonsLeft)return alert('Not enough buttons in '+box.boxName+'. Remaining: '+box.buttonsLeft);}
  const boxDetails=Object.keys(boxUsage).map(id=>{const b=boxes.find(x=>x.id===+id);return {boxId:+id,boxName:b?b.boxName:'Button Box',count:boxUsage[id]};});
  const invoice={clientName:clientName.value.trim(),clientPhone:clientPhone.value.trim(),clientEmail:clientEmail.value.trim(),clientAddress:clientAddress.value.trim(),clientTin:clientTin.value.trim(),boxDetails,boxCount:boxDetails.reduce((s,b)=>s+b.count,0),invoiceNumber:invoiceNumber.value,status:invoiceStatus.value,invoiceDate:invoiceDate.value,lines,amount:lines.reduce((s,l)=>s+l.amount,0),createdAt:new Date().toISOString()};
  const id=await put('invoices',invoice);
  for(const sid in usage){const item=stock.find(s=>s.id===+sid);item.quantity=+item.quantity-usage[sid];await put('stock',item)}
  for(const bid in boxUsage){const b=boxes.find(x=>x.id===+bid);b.buttonsLeft=+b.buttonsLeft-boxUsage[bid];await put('buttonBoxes',b);}
  invoiceFormView.classList.add('hidden');refreshAll();previewInvoice(id,'invoice');
};
async function refreshInvoices(){const inv=(await getAll('invoices')).sort((a,b)=>b.id-a.id);invoiceTable.innerHTML=inv.map(i=>`<tr><td>${esc(i.invoiceNumber)}</td><td>${esc(i.clientName)}</td><td>${money(i.amount)}</td><td><span class="status-badge status-${esc(i.status)}">${esc(i.status)}</span></td><td>${esc(i.invoiceDate)}</td><td><button class="btn small" onclick="previewInvoice(${i.id},'invoice')">View</button> <button class="btn light small" onclick="previewInvoice(${i.id},'receipt')">Receipt</button> <button class="btn red small" onclick="deleteInvoice(${i.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="6">No invoices yet.</td></tr>';}
async function deleteInvoice(id){if(confirm('Delete this invoice? Stock will not be restored automatically.')){await del('invoices',id);refreshAll();}}
async function previewInvoice(id,type){
  const i=await getOne('invoices',id);
  const s=await getSettings();
  hideInvoiceSubViews();
  invoicePreview.classList.remove('hidden');
  const title=type==='invoice'?'INVOICE':'RECEIPT';
  const boxDetails=(i.boxDetails&&i.boxDetails.length)?i.boxDetails:(i.boxCount?[{boxName:i.boxName||'selected box',count:i.boxCount}]:[]);
  const boxInfo=boxDetails.length?boxDetails.map(b=>`${esc(b.count)} from ${esc(b.boxName)}`).join(', '):'';
  invoicePreview.innerHTML=`<div class="report-actions"><button class="btn light" onclick="backToInvoices()">Back</button> <button class="btn" onclick="window.print()">Print</button></div><div class="print-sheet"><div class="report-header"><div class="company-info">${s.logoData?`<img class="invoice-logo" src="${s.logoData}" alt="Company Logo">`:''}<h3>${esc(s.companyName)}</h3><p>${esc(s.companyLocation)}</p><p><strong>Phone:</strong> ${esc(s.companyPhone)}</p><p><strong>TIN/VAT:</strong> ${esc(s.companyTin)}</p><p><strong>Email:</strong> ${esc(s.companyEmail)}</p></div><div style="text-align:right"><h2>${title}</h2><p><strong>No:</strong> ${esc(i.invoiceNumber)}</p><p><strong>Date:</strong> ${esc(i.invoiceDate)}</p><p><strong>Status:</strong> <span class="status-badge status-${esc(i.status)}">${esc(i.status).toUpperCase()}</span></p></div></div><div class="client-section"><div class="report-mini-box"><h4>${type==='invoice'?'Bill To':'Received From'}</h4><p><strong>${esc(i.clientName)}</strong></p><p>Phone: ${esc(i.clientPhone)||'-'}</p><p>Email: ${esc(i.clientEmail)||'-'}</p><p>Address: ${esc(i.clientAddress)||'-'}</p><p>TIN: ${esc(i.clientTin)||'-'}</p></div><div class="report-mini-box"><h4>Payment Terms</h4><p><strong>Invoice Date:</strong> ${esc(i.invoiceDate)}</p><p><strong>Due Date:</strong> ${dueDate(i.invoiceDate)}</p>${boxDetails.length?`<p><strong>Button Boxes:</strong> ${boxDetails.length}</p><p><strong>Buttons Used:</strong> ${esc(boxDetails.reduce((a,b)=>a+(+b.count||0),0))}</p>`:''}</div></div>${boxDetails.length?`<div class="box-detail-print"><strong>Invoice Detail:</strong> ${boxInfo}</div>`:''}<table class="table"><thead><tr><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Amount</th></tr></thead><tbody>${i.lines.map(l=>`<tr><td>${esc(l.description)}</td><td class="text-right">${esc(l.quantity)}</td><td class="text-right">${money(l.unitPrice)}</td><td class="text-right"><strong>${money(l.amount)}</strong></td></tr>`).join('')}</tbody></table><div class="total-section"><div class="total-box"><div class="total-row"><span>Subtotal:</span><span>${money(i.amount)}</span></div><div class="total-row"><span>Tax (0%):</span><span>${money(0)}</span></div><div class="total-row final"><span>Total Due:</span><span>${money(i.amount)}</span></div></div></div><div class="payment-note"><p><strong>Payment Instructions:</strong></p><p>Please settle this invoice within 30 days of receipt. For payment inquiries, contact us at ${esc(s.companyPhone)} or ${esc(s.companyEmail)}.</p></div><div class="signature-section"><div class="signature-box">${s.signatureData?`<img class="signature-img" src="${s.signatureData}" alt="Signature">`:'<div class="empty-signature"></div>'}<p>Authorized By</p></div><div class="signature-box">${s.signatureData?`<img class="signature-img" src="${s.signatureData}" alt="Director Signature">`:'<div class="empty-signature"></div>'}<p>${esc(s.directorName)}</p><p class="muted">Director Manager</p></div></div><div class="footer-note"><p>This is a computer-generated invoice.</p><p>© ${new Date().getFullYear()} ${esc(s.companyName)}. All rights reserved.</p></div></div>`;
}
function dueDate(date){const d=new Date(date);if(isNaN(d))return '-';d.setDate(d.getDate()+30);return d.toISOString().slice(0,10)}
function backToInvoices(){showInvoiceList();}

async function refreshSettings(){const s=await getSettings();companyName.value=s.companyName;companyLocation.value=s.companyLocation;companyPhone.value=s.companyPhone;companyTin.value=s.companyTin;companyEmail.value=s.companyEmail;directorName.value=s.directorName;loginBrandTitle.textContent=s.companyName||'SpeedUp MS';brandingPreview.innerHTML=`${s.logoData?`<img class="invoice-logo" src="${s.logoData}">`:''}<h3>${esc(s.companyName)}</h3><p>${esc(s.companyLocation)}</p><p>Phone: ${esc(s.companyPhone)}</p><p>TIN/VAT: ${esc(s.companyTin)}</p><p>Email: ${esc(s.companyEmail)}</p><p><strong>Director:</strong> ${esc(s.directorName)}</p>${s.signatureData?`<img class="signature-img" src="${s.signatureData}">`:''}`;}
settingsForm.onsubmit=async e=>{
  e.preventDefault();
  try{
    const old=await getSettings();
    const logo=await fileToDataURL(companyLogo.files[0]);
    const sig=await fileToDataURL(directorSignature.files[0]);
    const data={
      companyName:companyName.value.trim()||defaultSettings.companyName,
      companyLocation:companyLocation.value.trim(),
      companyPhone:companyPhone.value.trim(),
      companyTin:companyTin.value.trim(),
      companyEmail:companyEmail.value.trim(),
      directorName:directorName.value.trim(),
      logoData:logo||old.logoData||'',
      signatureData:sig||old.signatureData||''
    };
    await saveSettings(data);
    companyLogo.value='';
    directorSignature.value='';
    await refreshSettings();
    showAlert('settingsAlert','Invoice branding saved successfully');
  }catch(err){
    console.error(err);
    showAlert('settingsAlert','Settings could not be saved. Please use smaller logo/signature images and try again.','error');
  }
};

async function refreshAll(){await refreshDashboard();await refreshStock();await refreshInvoices();await refreshBoxes();await refreshSettings();}
openDB().then(async()=>{const s=await getSettings();loginBrandTitle.textContent=s.companyName||'SpeedUp MS';if(localStorage.getItem('misLoggedIn')==='yes')showApp();else showLogin();});
