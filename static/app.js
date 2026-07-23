
// ════════════════════════════════════════════════════════
//  SHARED UTILS
// ════════════════════════════════════════════════════════
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmt(n){return Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}
function fmtSz(b){if(!b)return'';if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB'}
function fileIco(n){const e=(n.split('.').pop()||'').toLowerCase();return{pdf:'📄',xlsx:'📊',xls:'📊',docx:'📝',doc:'📝',pptx:'📑',ppt:'📑',dwg:'📐',jpg:'🖼',jpeg:'🖼',png:'🖼',zip:'🗜',rar:'🗜',txt:'📃',msg:'📧'}[e]||'📎'}
function toast(msg,type='if',dur=3500){const c=document.getElementById('toasts');const t=document.createElement('div');t.className='toast '+type;t.innerHTML='<span>'+(type==='ok'?'✓':type==='er'?'✕':'ℹ')+'</span><span>'+esc(msg)+'</span>';c.appendChild(t);setTimeout(()=>t.remove(),dur)}
async function apiCall(method,path,body){const opts={method,headers:{'Content-Type':'application/json'}};if(body)opts.body=JSON.stringify(body);const r=await fetch('/api'+path,opts);return r.json()}
function closeMo(id){document.getElementById(id).classList.remove('on')}
let _currentPanel=null;

function closePanel(){
  document.getElementById('ov').classList.remove('on');
  ['j-panel','r-panel','q-panel'].forEach(id=>document.getElementById(id).classList.remove('on'));
  _currentPanel=null;
  if(jobCurrentJob){jobCurrentJob=null;jobRender();}
  if(rateCurrentRec){rateCurrentRec=null;rateRender();}
  if(quoteCurrentRow!==null){quoteCurrentRow=null;quoteRender();}
}

function openPanel(id){
  document.getElementById('ov').classList.add('on');
  document.getElementById(id).classList.add('on');
  _currentPanel=id;
}

// Module switching
let activeGroup = null;

function showMenu(group){
  clearTimeout(group._hideTimer);
  group.querySelector('.nav-dropdown').style.display='flex';
}
function hideMenu(group){
  group._hideTimer = setTimeout(()=>{
    group.querySelector('.nav-dropdown').style.display='';
  }, 120);
}

function switchMenu(mod, groupId) {
  // Deactivate all group buttons
  document.querySelectorAll('.nav-group-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.nav-dropdown button').forEach(b=>b.classList.remove('active'));
  // Activate group
  const grpBtn = document.getElementById(groupId);
  if(grpBtn) grpBtn.classList.add('on');
  // Activate dropdown item
  const btn = document.querySelector(`.nav-dropdown button[onclick*="'${mod}'"]`);
  if(btn) btn.classList.add('active');
  // Switch module
  document.querySelectorAll('.module').forEach(m=>m.classList.remove('on'));
  const modEl = document.getElementById('mod-'+mod);
  if(modEl) modEl.classList.add('on');
  closePanel();
  activeGroup = groupId;
  if(mod==='admin') { setTimeout(loadAdminUsers,100); setTimeout(backupLoadConfig,150); setTimeout(loadDocCounters,150); }
}

function switchModule(mod, btn){
  // Legacy support — find which group this module belongs to
  const groupMap = {
    quotes:'ng-ventas', cpo:'ng-ventas',
    jobs:'ng-proyectos', pt:'ng-proyectos', sv:'ng-proyectos',
    po:'ng-compras', ivp:'ng-compras', stock:'ng-compras', recovery:'ng-compras', reassign:'ng-compras',
    wh:'ng-costo', rates:'ng-costo', report:'ng-costo', multirpt:'ng-costo', fx:'ng-costo',
    admin:'ng-config'
  };
  switchMenu(mod, groupMap[mod] || 'ng-ventas');
}

// Sort state per module
const sortState={jobs:{key:'job_number',dir:1},rates:{key:'employee',dir:1},quotes:{key:'qnum',dir:1}};

document.querySelectorAll('thead th[data-mod]').forEach(th=>{
  th.addEventListener('click',()=>{
    const mod=th.dataset.mod,k=th.dataset.k;
    if(sortState[mod].key===k) sortState[mod].dir*=-1; else{sortState[mod].key=k;sortState[mod].dir=1;}
    document.querySelectorAll(`thead th[data-mod="${mod}"]`).forEach(t=>t.classList.remove('sa','sd'));
    th.classList.add(sortState[mod].dir===1?'sa':'sd');
    if(mod==='jobs')jobRender(); else if(mod==='rates')rateRender(); else quoteRender();
  });
});

// ════════════════════════════════════════════════════════
//  JOB REGISTER
// ════════════════════════════════════════════════════════
let jobs=[], jobCurrentJob=null, jobNextMain=null, jImpFile=null;

function jSubLabel(sub){
  const n=parseInt(sub||'0');
  if(n===0)return'Máquina / equipo principal';if(n===1)return'Instalación y puesta en marcha';
  if(n>=2&&n<=50)return'Cambio de ingeniería ('+n+')';if(n>=51&&n<=60)return'Refacción cliente ('+n+')';
  if(n>=61&&n<=97)return'Servicio cliente ('+n+')';if(n===99)return'Garantía';return'';
}
function jShortPM(pm=''){if(!pm)return'—';const p=pm.split(' - ')[0].trim().split(' ');return p[0]+(p[1]?' '+p[1][0]+'.':'');}
function jFcBadge(v,noMeta){if(noMeta)return'<span class="badge b-nometa">sin datos</span>';const m={Yes:'b-yes',ToApprove:'b-toappr',InProgress:'b-inprog',No:'b-open'};return'<span class="badge '+(m[v]||'b-open')+'">'+esc(v||'—')+'</span>'}
function jStBadge(v,noMeta){if(noMeta)return'<span class="badge b-nometa">carpeta vacía</span>';const m={Open:'b-open',WIP:'b-wip',Done:'b-done',Cancelled:'b-toappr'};return'<span class="badge '+(m[v]||'b-open')+'">'+esc(v||'Open')+'</span>'}

async function loadJobs(){
  document.getElementById('j-tb').innerHTML='<tr><td colspan="9"><div class="es"><div class="spinner"></div></div></td></tr>';
  try{
    const d=await(await fetch('/api/ping')).json();
    document.getElementById('j-dot').className='conn-dot'+(d.jobs_ok?' ok':'');
    document.getElementById('j-lbl').textContent=d.jobs_ok?'NAS OK':'NAS sin acceso';
    document.getElementById('lbl-jobs').textContent='Jobs';
    document.getElementById('dot-jobs').className='conn-dot'+(d.jobs_ok?' ok':'');
    document.getElementById('j-path').textContent=d.jobs_folder||'—';
    jobs=await apiCall('GET','/jobs')||[];
    jobRender(); jobUpdateStats(); jobPopFilters();
    // Keep report job list in sync
    if(typeof rptRefreshJobList==='function') rptRefreshJobList();
  }catch{toast('Error al cargar jobs','er');}
}

function jobFiltered(){
  const pm=document.getElementById('jf-pm').value;
  const cust=document.getElementById('jf-cust').value.toLowerCase();
  const pg=document.getElementById('jf-pg').value;
  const st=document.getElementById('jf-st').value;
  const sub=document.getElementById('jf-sub').value;
  const gs=document.getElementById('j-gs').value.toLowerCase();
  return jobs.filter(j=>{
    if(pm&&j.pm!==pm)return false;
    if(cust&&!(j.customer||'').toLowerCase().includes(cust))return false;
    if(pg&&j.product_group!==pg)return false;
    if(st&&j.status!==st)return false;
    if(sub){const n=parseInt(j.subindex||'0');if(sub==='00'&&n!==0)return false;if(sub==='01'&&n!==1)return false;if(sub==='02-50'&&!(n>=2&&n<=50))return false;if(sub==='51-60'&&!(n>=51&&n<=60))return false;if(sub==='61-97'&&!(n>=61&&n<=97))return false;if(sub==='99'&&n!==99)return false;}
    if(gs){const hay=((j.job_number||'')+(j.customer||'')+(j.description||'')+(j.pm||'')+(j.po_number||'')).toLowerCase();if(!hay.includes(gs))return false;}
    return true;
  }).sort((a,b)=>{
    const {key,dir}=sortState.jobs;
    if(key==='job_number'){const[am,as_]=(a.job_number||'0-0').split('-').map(Number);const[bm,bs_]=(b.job_number||'0-0').split('-').map(Number);return dir*(am!==bm?am-bm:as_-bs_);}
    let av=a[key]||'',bv=b[key]||'';
    if(typeof av==='number')return dir*(av-bv);
    return dir*String(av).localeCompare(String(bv));
  });
}

function jobRender(){
  const rows=jobFiltered();const tb=document.getElementById('j-tb');
  const isViewOnly = USER_PERMS && !USER_PERMS.is_admin && (USER_PERMS.permissions?.['jobs']||'none') === 'view';
  const colspan = isViewOnly ? 4 : 11;
  if(!rows.length){tb.innerHTML=`<tr><td colspan="${colspan}"><div class="es"><span class="ei">📋</span><br>Sin resultados</div></td></tr>`;return;}
  tb.innerHTML=rows.map(j=>{
    const noMeta=!j.created_at&&!j.customer;
    const sel=jobCurrentJob?.job_number===j.job_number?' sel':'';
    if(isViewOnly) return`<tr class="${noMeta?'no-meta':''}${sel}" onclick="jobOpen('${j.job_number}')">
      <td><span class="tjob">${j.job_number}</span></td>
      <td style="font-weight:600;color:var(--text)">${esc(j.customer||'—')}</td>
      <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;color:var(--muted2)">${esc(j.description||(noMeta?'Sin datos':'—'))}</td>
      <td style="color:var(--muted2);font-size:11px">${jShortPM(j.pm)}</td>
    </tr>`;
    return`<tr class="${noMeta?'no-meta':''}${sel}" onclick="jobOpen('${j.job_number}')">
      <td><span class="tjob">${j.job_number}</span></td>
      <td style="font-weight:600;color:var(--text)">${esc(j.customer||'—')}</td>
      <td style="max-width:210px;overflow:hidden;text-overflow:ellipsis;color:var(--muted2)">${esc(j.description||(noMeta?'Sin datos':'—'))}</td>
      <td style="color:var(--muted2);font-size:11px">${jShortPM(j.pm)}</td>
      <td style="color:var(--muted2);font-size:11px">${esc(j.product_group||'—')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${j.revenue?'$'+fmt(j.revenue):'—'}</td>
      <td>${jFcBadge(j.approval_fc,noMeta)}</td>
      <td>${jStBadge(j.status,noMeta)}</td>
      <td style="color:var(--muted2)">${j.ship_date||'—'}</td>
      <td style="font-size:11px;color:var(--gold);font-family:'DM Mono',monospace">${esc(j.q_number||'—')}</td>
      <td style="font-size:11px;color:var(--muted2);font-family:'DM Mono',monospace">${esc(j.pt_number||j.sv_number||'—')}</td>
    </tr>`;
  }).join('');
}

function jobUpdateStats(){
  document.getElementById('js-tot').textContent=jobs.length;
  document.getElementById('js-open').textContent=jobs.filter(j=>j.status==='Open'||!j.status).length;
  document.getElementById('js-wip').textContent=jobs.filter(j=>j.status==='WIP').length;
  document.getElementById('js-done').textContent=jobs.filter(j=>j.status==='Done').length;
}

function jobPopFilters(){
  const pms=[...new Set(jobs.map(j=>j.pm).filter(Boolean))].sort();
  const pgs=[...new Set(jobs.map(j=>j.product_group).filter(Boolean))].sort();
  const pm=document.getElementById('jf-pm'),pg=document.getElementById('jf-pg');
  const cpm=pm.value,cpg=pg.value;
  pm.innerHTML='<option value="">Todos</option>'+pms.map(p=>'<option'+(p===cpm?' selected':'')+'>'+esc(p)+'</option>').join('');
  pg.innerHTML='<option value="">Todos</option>'+pgs.map(p=>'<option'+(p===cpg?' selected':'')+'>'+esc(p)+'</option>').join('');
}

function jobOpen(jobNum){
  const j=jobs.find(x=>x.job_number===jobNum);if(!j)return;
  jobCurrentJob=j;jobRender();
  document.getElementById('jp-job').textContent=j.job_number;
  document.getElementById('jp-sub').textContent=j.subindex_label||jSubLabel(j.subindex||'00');
  document.getElementById('jp-cust').textContent=j.customer||'Sin datos';
  document.getElementById('je-cust').value=j.customer||'';
  document.getElementById('je-pm').value=j.pm||'';
  document.getElementById('je-desc').value=j.description||'';
  document.getElementById('je-pg').value=j.product_group||'';
  document.getElementById('je-psg').value=j.product_subgroup||'';
  document.getElementById('je-rev').value=j.revenue||'';
  document.getElementById('je-cost').value=j.estimated_cost||'';
  document.getElementById('je-po').value=j.po_number||'';
  document.getElementById('je-ship').value=j.ship_date||'';
  document.getElementById('je-fc').value=j.approval_fc||'ToApprove';
  document.getElementById('je-st').value=j.status||'Open';
  document.getElementById('je-notes').value=j.notes||'';
  document.getElementById('j-dp').textContent='\\\\naspersico\\COST_CONTROLLING\\10_DATABASE\\JOBs\\'+j.job_number;
  jCalcGM();
  const adminSec = document.getElementById('je-admin-section');
  if(adminSec) adminSec.style.display = (USER_PERMS&&USER_PERMS.is_admin) ? '' : 'none';
  const jeNew = document.getElementById('je-new-number');
  if(jeNew) jeNew.value='';
  jStab('det',document.querySelector('#j-panel .ptab'));
  openPanel('j-panel');
}

function jStab(id,btn){
  document.querySelectorAll('#j-panel .ptab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#j-panel .tc2').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('#j-panel .ptab')[id==='det'?0:1].classList.add('on');
  document.getElementById('jtab-'+id).classList.add('on');
  if(id==='doc'&&jobCurrentJob)jLoadFiles(jobCurrentJob.job_number);
}

function jCalcGM(){
  const rev=parseFloat(document.getElementById('je-rev')?.value||0);
  const cost=parseFloat(document.getElementById('je-cost')?.value||0);
  const el=document.getElementById('j-gm');if(!el)return;
  if(!rev){el.textContent='GM: —';el.className='gm-preview';return;}
  const gm=((rev-cost)/rev*100).toFixed(1);
  el.textContent='GM: '+gm+'%  ($'+fmt(rev-cost)+' USD)';
  el.className='gm-preview '+(parseFloat(gm)>=0?'pos':'neg');
}

async function jobSave(){
  if(!jobCurrentJob)return;
  const data={
    customer:document.getElementById('je-cust').value,pm:document.getElementById('je-pm').value,
    description:document.getElementById('je-desc').value,product_group:document.getElementById('je-pg').value,
    product_subgroup:document.getElementById('je-psg').value,revenue:parseFloat(document.getElementById('je-rev').value)||0,
    estimated_cost:parseFloat(document.getElementById('je-cost').value)||0,po_number:document.getElementById('je-po').value,
    ship_date:document.getElementById('je-ship').value,approval_fc:document.getElementById('je-fc').value,
    status:document.getElementById('je-st').value,notes:document.getElementById('je-notes').value,
  };
  try{
    const r=await apiCall('PUT','/jobs/'+jobCurrentJob.job_number,data);
    if(r.error){toast(r.error,'er');return;}
    const idx=jobs.findIndex(j=>j.job_number===jobCurrentJob.job_number);
    if(idx>=0)jobs[idx]=r;jobCurrentJob=r;
    document.getElementById('jp-cust').textContent=r.customer||'';
    jobRender();jobUpdateStats();jobPopFilters();
    toast('Job '+r.job_number+' guardado ✓','ok');
  }catch{toast('Error al guardar','er');}
}

async function jobRenumber(){
  if(!jobCurrentJob) return;
  const newNum = document.getElementById('je-new-number').value.trim().toUpperCase();
  if(!newNum){ toast('Ingresa el nuevo número','er'); return; }
  const old = jobCurrentJob.job_number;
  if(!confirm(`¿Cambiar número de Job?\n\n${old}  →  ${newNum}\n\nEsta acción actualiza la carpeta y todos los registros asociados.`)) return;
  try {
    const d = await fetch(`/api/jobs/${old}/renumber`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({new_number:newNum})
    }).then(r=>r.json());
    if(d.error){ toast(d.error,'er'); return; }
    closePanel();
    await loadJobs();
    await loadPt();
    await loadSv();
    toast(`✓ ${old} → ${newNum}`,'ok',5000);
  } catch(e){ toast('Error: '+e.message,'er'); }
}

async function jobDelete(){
  if(!jobCurrentJob) return;
  const jn = jobCurrentJob.job_number;
  // Verificar si tiene archivos antes de eliminar
  try {
    const files = await fetch('/api/files/'+jn).then(r=>r.json());
    const fileCount = Array.isArray(files) ? files.length : 0;
    const msg = fileCount > 0
      ? `⚠️ ATENCIÓN: El job ${jn} tiene ${fileCount} archivo(s) adjunto(s).\n\nSi quieres conservar los datos, usa la herramienta "Fusionar Jobs" en el panel Admin ANTES de eliminar.\n\n¿Eliminar de todas formas? Esta acción NO se puede deshacer.`
      : `¿Eliminar el job ${jn}?\n\nEsta acción NO se puede deshacer.`;
    if(!confirm(msg)) return;
    const r=await apiCall('DELETE','/jobs/'+jn);
    if(r.error){toast(r.error,'er');return;}
    await loadJobs();closePanel();toast('Job '+jn+' eliminado','ok');
  }catch{toast('Error al eliminar','er');}
}

function jobTypeChange(type) {
  const isNew = type === 'new';
  document.getElementById('jn-new-panel').style.display   = isNew ? '' : 'none';
  document.getElementById('jn-assoc-panel').style.display = isNew ? 'none' : '';
  if (!isNew) {
    document.getElementById('jn-assoc-main').value = '';
    document.getElementById('jn-assoc-sub').value  = '';
  }
  document.getElementById('jn-num').textContent = '—';
  document.getElementById('jn-lbl').textContent  = 'Ingresa los datos';
}

async function jobOpenNew(){
  const r=await apiCall('GET','/next-index');
  jobNextMain=r.next;
  document.getElementById('jn-main').value=jobNextMain;
  document.getElementById('jn-sub').value='';
  document.getElementById('jn-num').textContent=jobNextMain+'-??';
  document.getElementById('jn-lbl').textContent='Ingresa un subíndice';
  document.getElementById('jn-hint').textContent='';
  // Reset tipo a "nuevo"
  document.querySelector('input[name="jn-type"][value="new"]').checked = true;
  jobTypeChange('new');
  ['jn-cust','jn-desc','jn-psg','jn-rev','jn-cost','jn-po','jn-ship'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('jn-pm').value='';document.getElementById('jn-pg').value='';
  document.getElementById('mo-jnew').classList.add('on');
}

function jobUpdatePreview(){
  const mode = document.querySelector('input[name="jn-type"]:checked')?.value || 'new';
  const hint = document.getElementById('jn-hint');
  let main, rawSub;
  if (mode === 'new') {
    main   = jobNextMain;
    rawSub = document.getElementById('jn-sub').value.trim();
  } else {
    main   = document.getElementById('jn-assoc-main').value.trim();
    rawSub = document.getElementById('jn-assoc-sub').value.trim();
  }
  if (!rawSub || (mode==='existing' && !main)) {
    document.getElementById('jn-num').textContent = main ? main+'-??' : '—';
    document.getElementById('jn-lbl').textContent = 'Ingresa un subíndice';
    if(hint){hint.textContent='';hint.className='hint';}
    return;
  }
  const n=parseInt(rawSub); const pad=String(n).padStart(2,'0');
  const valid=(n===0||n===1||(n>=2&&n<=50)||(n>=51&&n<=60)||(n>=61&&n<=97)||n===99);
  document.getElementById('jn-num').textContent = main+'-'+pad;
  document.getElementById('jn-lbl').textContent = valid ? jSubLabel(pad) : 'No válido';
  if(hint){
    hint.textContent = valid ? '✓ Subíndice válido' : '✗ Valores válidos: 00, 01, 02–50, 51–60, 61–97, 99';
    hint.className = 'hint '+(valid?'ok':'bad');
  }
}

async function jobCreate(){
  const mode = document.querySelector('input[name="jn-type"]:checked')?.value || 'new';
  let rawSub, mainOverride;
  if (mode === 'new') {
    rawSub = document.getElementById('jn-sub').value.trim();
    mainOverride = null;
  } else {
    rawSub       = document.getElementById('jn-assoc-sub').value.trim();
    mainOverride = document.getElementById('jn-assoc-main').value.trim();
    if (!mainOverride) { toast('Ingresa el número de job principal','er'); return; }
    // Verificar que el job principal existe
    const exists = jobs.some(j => String(j.main_index) === String(parseInt(mainOverride)));
    if (!exists) { toast(`El job principal ${mainOverride} no existe`,'er'); return; }
  }
  if(!rawSub){toast('Ingresa un subíndice','er');return;}
  const btn=document.getElementById('btn-jcreate');btn.disabled=true;btn.textContent='Creando…';
  try{
    const data={
      subindex:String(parseInt(rawSub)).padStart(2,'0'),
      main_index_override: mainOverride ? parseInt(mainOverride) : null,
      customer:document.getElementById('jn-cust').value,pm:document.getElementById('jn-pm').value,
      description:document.getElementById('jn-desc').value,product_group:document.getElementById('jn-pg').value,
      product_subgroup:document.getElementById('jn-psg').value,revenue:parseFloat(document.getElementById('jn-rev').value)||0,
      estimated_cost:parseFloat(document.getElementById('jn-cost').value)||0,
      po_number:document.getElementById('jn-po').value,ship_date:document.getElementById('jn-ship').value,
    };
    const r=await apiCall('POST','/jobs',data);
    if(r.error){toast(r.error,'er');return;}
    jobs.push(r);closeMo('mo-jnew');jobRender();jobUpdateStats();jobPopFilters();
    toast('Job '+r.job_number+' creado ✓','ok');jobOpen(r.job_number);
  }catch{toast('Error al crear','er');}
  finally{btn.disabled=false;btn.textContent='Crear Job →';}
}

async function jLoadFiles(jobNum){
  const fl=document.getElementById('j-fl');
  fl.innerHTML='<div class="es" style="padding:16px 0"><div class="spinner"></div></div>';
  try{
    const files=await apiCall('GET','/files/'+jobNum);
    if(!files.length){fl.innerHTML='<div class="es" style="padding:20px 0"><span class="ei">📂</span><br>Sin documentos</div>';return;}
    fl.innerHTML=files.map(f=>'<div class="fitem"><span class="fi-ic">'+fileIco(f.name)+'</span><div class="fi-inf"><div class="fi-nm">'+esc(f.name)+'</div><div class="fi-mt">'+fmtSz(f.size)+' · '+f.modified+'</div></div><div style="display:flex;gap:4px"><a class="fi-dl" href="/api/files/'+jobNum+'/'+encodeURIComponent(f.name)+'" download title="Descargar">⬇</a><button class="fi-del" onclick="jDelFile(\''+jobNum+'\',\''+esc(f.name)+'\')">✕</button></div></div>').join('');
  }catch{fl.innerHTML='<div class="es">Error al listar</div>';}
}

async function jUploadFiles(files){
  if(!jobCurrentJob||!files.length)return;
  const fd=new FormData();Array.from(files).forEach(f=>fd.append('files',f));
  try{
    const r=await fetch('/api/files/'+jobCurrentJob.job_number,{method:'POST',body:fd});
    const d=await r.json();if(d.error){toast(d.error,'er');return;}
    toast(d.saved.length+' archivo(s) guardados','ok');jLoadFiles(jobCurrentJob.job_number);
  }catch{toast('Error al subir','er');}
}
function jDropFiles(e){e.preventDefault();document.getElementById('j-dz').classList.remove('dg');jUploadFiles(e.dataTransfer.files);}

async function jDelFile(jobNum,name){
  if(!confirm('¿Eliminar "'+name+'"?'))return;
  try{const r=await apiCall('DELETE','/files/'+jobNum+'/'+encodeURIComponent(name));if(r.error){toast(r.error,'er');return;}toast('Archivo eliminado','ok');jLoadFiles(jobNum);}catch{toast('Error','er');}
}

// Job Import
function jobOpenImport(){jImpFile=null;document.getElementById('jimp-fname').textContent='Seleccionar o arrastrar';document.getElementById('jimp-file').value='';document.getElementById('jimp-results').style.display='none';document.getElementById('btn-jimp-run').disabled=true;document.getElementById('mo-jimp').classList.add('on');}
function onJimpFile(inp){if(inp.files.length){jImpFile=inp.files[0];document.getElementById('jimp-fname').textContent=jImpFile.name;document.getElementById('btn-jimp-run').disabled=false;}}
function jDropImport(e){e.preventDefault();document.getElementById('jdz-imp').classList.remove('dg');const f=e.dataTransfer.files[0];if(f){jImpFile=f;document.getElementById('jimp-fname').textContent=f.name;document.getElementById('btn-jimp-run').disabled=false;}}

async function jobRunImport(){
  if(!jImpFile)return;
  const btn=document.getElementById('btn-jimp-run');btn.disabled=true;btn.textContent='Importando…';
  document.getElementById('jimp-results').style.display='none';
  const fd=new FormData();fd.append('file',jImpFile);fd.append('year',document.getElementById('jimp-year').value);
  try{
    const r=await fetch('/api/import-jobs-excel',{method:'POST',body:fd});
    const d=await r.json();if(d.error){toast(d.error,'er');return;}
    const s=d.summary;
    document.getElementById('jimp-summary').innerHTML=
      '<div class="stat" style="background:rgba(39,174,96,.18);border-color:rgba(39,174,96,.5)"><div class="n" style="color:#1f8a4c;font-weight:700">'+s.created+'</div><div class="l">Creados</div></div>'+
      '<div class="stat" style="background:rgba(0,0,0,.045)"><div class="n" style="color:var(--muted)">'+s.skipped+'</div><div class="l">Omitidos</div></div>'+
      '<div class="stat" style="background:rgba(235,87,87,.08)"><div class="n" style="color:#eb5757">'+s.errors+'</div><div class="l">Errores</div></div>';
    const rows=[];
    d.created.forEach(j=>rows.push('<div class="fitem" style="padding:6px 10px"><span style="color:var(--green)">✓</span><span class="tjob" style="font-size:11px">'+esc(j)+'</span><span style="color:var(--muted);font-size:10px;margin-left:auto">Creado</span></div>'));
    d.errors.forEach(e=>rows.push('<div class="fitem" style="padding:6px 10px"><span style="color:#eb5757">✕</span><span class="tjob" style="font-size:11px">'+esc(e.job)+'</span><span style="color:#eb5757;font-size:10px;margin-left:auto">'+esc(e.error)+'</span></div>'));
    document.getElementById('jimp-detail').innerHTML=rows.join('');
    document.getElementById('jimp-results').style.display='block';
    if(s.created>0){await loadJobs();toast(s.created+' Jobs importados ✓','ok',5000);}else toast('0 Jobs nuevos — '+s.skipped+' ya existían','if');
  }catch(err){toast('Error: '+err.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

['jf-pm','jf-cust','jf-pg','jf-st','jf-sub'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener(el.tagName==='INPUT'?'input':'change',jobRender);});

// ════════════════════════════════════════════════════════
//  HOURLY RATES
// ════════════════════════════════════════════════════════
let rates=[], rateActiveYear=new Date().getFullYear(), rateAvailYears=[], rateMaxRate=0, rateMinRate=0, rateCurrentRec=null, rImpFile=null;

async function loadRates(){
  document.getElementById('r-tb').innerHTML='<tr><td colspan="6"><div class="es"><div class="spinner"></div></div></td></tr>';
  try{
    const d=await apiCall('GET','/rates?year='+rateActiveYear);
    rates=d.records||[];rateAvailYears=d.available_years||[];
    rateBuildYearSel();
    rateMaxRate=rates.length?Math.max(...rates.map(r=>r.rate)):0;
    rateMinRate=rates.length?Math.min(...rates.map(r=>r.rate)):0;
    rateRender();rateUpdateStats();ratePopDepts();
    document.getElementById('r-tb-year').textContent=rateActiveYear;
    document.getElementById('rn-year').textContent=rateActiveYear;
    const ping=await(await fetch('/api/ping')).json();
    document.getElementById('r-path').textContent=ping.rates_folder||'—';
    document.getElementById('dot-rates').className='conn-dot'+(ping.rates_ok?' ok':'');
    document.getElementById('lbl-rates').textContent='Rates';
    // Rebuild WH cost map whenever rates change
    whBuildRateMap();
    if(document.getElementById('mod-wh').classList.contains('on')) whRender();
  }catch{toast('Error al cargar tarifas','er');}
}

function rateBuildYearSel(){
  const all=[...new Set([rateActiveYear,...rateAvailYears])].sort((a,b)=>b-a);
  const sel=document.getElementById('r-year-sel');
  sel.innerHTML=all.map(y=>'<option value="'+y+'"'+(y===rateActiveYear?' selected':'')+'>'+y+'</option>').join('');
  document.getElementById('rimp-year').innerHTML=all.map(y=>'<option value="'+y+'"'+(y===rateActiveYear?' selected':'')+'>'+y+'</option>').join('');
  document.getElementById('rcopy-from').innerHTML=rateAvailYears.map(y=>'<option value="'+y+'">'+y+'</option>').join('');
  document.getElementById('rcopy-to').value=rateActiveYear+1;
}
function rateSwitchYear(){rateActiveYear=parseInt(document.getElementById('r-year-sel').value);loadRates();}

function rateFiltered(){
  const name=document.getElementById('rf-name').value.toLowerCase();
  const dept=document.getElementById('rf-dept').value;
  const fMin=parseFloat(document.getElementById('rf-min').value)||0;
  const fMax=parseFloat(document.getElementById('rf-max').value)||Infinity;
  const gs=document.getElementById('r-gs').value.toLowerCase();
  return rates.filter(r=>{
    if(name&&!(r.employee||'').toLowerCase().includes(name))return false;
    if(dept&&r.department!==dept)return false;
    if(r.rate<fMin||r.rate>fMax)return false;
    if(gs&&!((r.employee||'')+(r.department||'')+(r.notes||'')).toLowerCase().includes(gs))return false;
    return true;
  }).sort((a,b)=>{
    const {key,dir}=sortState.rates;
    let av=a[key]??'',bv=b[key]??'';
    if(typeof av==='number')return dir*(av-bv);
    return dir*String(av).localeCompare(String(bv));
  });
}

function rColorClass(rate){const pct=(rate-rateMinRate)/(rateMaxRate-rateMinRate||1);return pct>0.66?'high':pct>0.33?'mid':'low';}

function rateRender(){
  const rows=rateFiltered();const tb=document.getElementById('r-tb');
  if(!rows.length){tb.innerHTML='<tr><td colspan="6"><div class="es"><span class="ei">👥</span><br>Sin registros</div></td></tr>';return;}
  tb.innerHTML=rows.map((r,i)=>{
    const pct=rateMaxRate>0?Math.round((r.rate/rateMaxRate)*100):0;
    const sel=rateCurrentRec&&rateNorm(rateCurrentRec.employee)===rateNorm(r.employee)?' sel':'';
    const clr=rColorClass(r.rate);
    const clrHex=clr==='high'?'#e74c3c':clr==='mid'?'var(--amber)':'var(--green)';
    return`<tr class="${sel}" onclick="rateOpen('${esc(r.employee)}')">
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red)">${String(i+1).padStart(2,'0')}</td>
      <td style="font-weight:500;color:var(--text)">${esc(r.employee)}</td>
      <td style="color:var(--muted2)">${esc(r.department||'—')}</td>
      <td style="text-align:right"><span class="temp ${clr}">$${r.rate.toFixed(2)}</span></td>
      <td style="width:120px"><div style="font-size:9px;color:var(--muted)">${pct}%</div><div class="rate-bar"><div class="rate-fill" style="width:${pct}%;background:${clrHex}"></div></div></td>
      <td style="color:var(--muted2);max-width:150px;overflow:hidden;text-overflow:ellipsis">${esc(r.notes||'—')}</td>
    </tr>`;
  }).join('');
}

function rateUpdateStats(){
  if(!rates.length){['rs-emp','rs-avg','rs-max','rs-min'].forEach(id=>document.getElementById(id).textContent='—');return;}
  const rs=rates.map(r=>r.rate);
  document.getElementById('rs-emp').textContent=rates.length;
  document.getElementById('rs-avg').textContent='$'+(rs.reduce((a,b)=>a+b,0)/rs.length).toFixed(2);
  document.getElementById('rs-max').textContent='$'+Math.max(...rs).toFixed(2);
  document.getElementById('rs-min').textContent='$'+Math.min(...rs).toFixed(2);
}

function ratePopDepts(){
  const depts=[...new Set(rates.map(r=>r.department).filter(Boolean))].sort();
  const sel=document.getElementById('rf-dept');const cur=sel.value;
  sel.innerHTML='<option value="">Todos</option>'+depts.map(d=>'<option'+(d===cur?' selected':'')+'>'+esc(d)+'</option>').join('');
}

function rateNorm(s){return String(s||'').trim().toUpperCase().replace(/\s+/g,' ');}

function rateOpen(empName){
  const r=rates.find(x=>rateNorm(x.employee)===rateNorm(empName));if(!r)return;
  rateCurrentRec=r;rateRender();
  document.getElementById('rp-rate').textContent='$'+r.rate.toFixed(2);
  document.getElementById('rp-name').textContent=r.employee;
  document.getElementById('re-name').value=r.employee;
  document.getElementById('re-rate').value=r.rate;
  document.getElementById('re-dept').value=r.department||'';
  document.getElementById('re-notes').value=r.notes||'';
  rateUpdatePreview();rateLoadHistory(r.employee);
  openPanel('r-panel');
}

function rateUpdatePreview(){
  const rate=parseFloat(document.getElementById('re-rate')?.value||0);
  const el=document.getElementById('r-preview');if(!el)return;
  if(!rate){el.style.display='none';return;}
  const daily=rate*8,weekly=daily*5,monthly=weekly*4.33;
  el.style.display='block';
  el.textContent='Diario: $'+daily.toFixed(2)+'  ·  Semanal: $'+weekly.toFixed(2)+'  ·  Mensual: $'+monthly.toFixed(2);
}

async function rateLoadHistory(empName){
  const el=document.getElementById('r-hist');
  el.innerHTML='<div class="es" style="padding:10px 0"><div class="spinner"></div></div>';
  try{
    const norm=rateNorm(empName);const entries=[];
    for(const y of rateAvailYears){const d=await apiCall('GET','/rates?year='+y);const rec=(d.records||[]).find(r=>rateNorm(r.employee)===norm);if(rec)entries.push({year:y,rate:rec.rate});}
    if(!entries.length){el.innerHTML='<div style="font-size:11px;color:var(--muted);padding:8px 0">Sin historial en otros años</div>';return;}
    entries.sort((a,b)=>b.year-a.year);
    el.innerHTML=entries.map((e,i)=>{
      const prev=entries[i+1];let diffHtml='<span class="hist-diff same">—</span>';
      if(prev){const diff=e.rate-prev.rate;const pct=((diff/prev.rate)*100).toFixed(1);
        if(diff>0)diffHtml='<span class="hist-diff up">▲ $'+diff.toFixed(2)+' (+'+pct+'%)</span>';
        else if(diff<0)diffHtml='<span class="hist-diff dn">▼ $'+Math.abs(diff).toFixed(2)+' ('+pct+'%)</span>';
        else diffHtml='<span class="hist-diff same">Sin cambio</span>';
      }
      const isCur=e.year===rateActiveYear;
      return'<div class="hist-item" style="'+(isCur?'border-color:rgba(200,16,46,.3)':'')+'"><span class="hist-yr">'+e.year+'</span><span class="hist-rate">$'+e.rate.toFixed(2)+'</span>'+diffHtml+(isCur?'<span style="font-size:9px;color:var(--red);font-weight:600;text-transform:uppercase">Activo</span>':'')+'</div>';
    }).join('');
  }catch{el.innerHTML='<div style="font-size:11px;color:var(--muted)">Error al cargar historial</div>';}
}

async function rateSave(){
  if(!rateCurrentRec)return;
  const data={year:rateActiveYear,employee:document.getElementById('re-name').value.trim(),rate:parseFloat(document.getElementById('re-rate').value)||0,department:document.getElementById('re-dept').value.trim(),notes:document.getElementById('re-notes').value.trim()};
  if(!data.employee){toast('El nombre es requerido','er');return;}
  try{
    const r=await apiCall('PUT','/rates/employee',data);if(r.error){toast(r.error,'er');return;}
    rates=r.records;rateMaxRate=Math.max(...rates.map(r=>r.rate));rateMinRate=Math.min(...rates.map(r=>r.rate));
    rateCurrentRec=rates.find(x=>rateNorm(x.employee)===rateNorm(data.employee));
    document.getElementById('rp-rate').textContent='$'+data.rate.toFixed(2);
    document.getElementById('rp-name').textContent=data.employee;
    rateRender();rateUpdateStats();ratePopDepts();toast(data.employee+' actualizado ✓','ok');
  }catch{toast('Error al guardar','er');}
}

async function rateDelete(){
  if(!rateCurrentRec||!confirm('¿Eliminar a "'+rateCurrentRec.employee+'" del año '+rateActiveYear+'?'))return;
  try{
    const r=await apiCall('DELETE','/rates/employee',{year:rateActiveYear,employee:rateCurrentRec.employee});
    if(r.error){toast(r.error,'er');return;}
    await loadRates();closePanel();toast('Empleado eliminado','ok');
  }catch{toast('Error al eliminar','er');}
}

function rateOpenNew(){
  ['rn-name','rn-rate','rn-dept','rn-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('mo-rnew').classList.add('on');
}

async function rateCreate(){
  const data={year:rateActiveYear,employee:document.getElementById('rn-name').value.trim(),rate:parseFloat(document.getElementById('rn-rate').value)||0,department:document.getElementById('rn-dept').value.trim(),notes:document.getElementById('rn-notes').value.trim()};
  if(!data.employee){toast('El nombre es requerido','er');return;}
  const btn=document.getElementById('btn-rcreate');btn.disabled=true;btn.textContent='Agregando…';
  try{
    const r=await apiCall('PUT','/rates/employee',data);if(r.error){toast(r.error,'er');return;}
    rates=r.records;rateMaxRate=Math.max(...rates.map(r=>r.rate));rateMinRate=Math.min(...rates.map(r=>r.rate));
    closeMo('mo-rnew');rateRender();rateUpdateStats();ratePopDepts();toast(data.employee+' agregado ✓','ok');rateOpen(data.employee);
  }catch{toast('Error al crear','er');}
  finally{btn.disabled=false;btn.textContent='Agregar →';}
}

function rateOpenImport(){
  rImpFile=null;document.getElementById('rimp-file').value='';document.getElementById('rimp-fname').textContent='—';
  document.getElementById('rimp-results').style.display='none';document.getElementById('btn-rimp-run').disabled=true;
  document.getElementById('mo-rimp').classList.add('on');
}
function onRimpFile(inp){if(inp.files.length){rImpFile=inp.files[0];document.getElementById('rimp-fname').textContent=rImpFile.name;document.getElementById('btn-rimp-run').disabled=false;}}
function rDropImport(e){e.preventDefault();document.getElementById('rdz-imp').classList.remove('dg');const f=e.dataTransfer.files[0];if(f){rImpFile=f;document.getElementById('rimp-fname').textContent=f.name;document.getElementById('btn-rimp-run').disabled=false;}}

async function rateRunImport(){
  if(!rImpFile)return;
  const btn=document.getElementById('btn-rimp-run');btn.disabled=true;btn.textContent='Importando…';
  document.getElementById('rimp-results').style.display='none';
  const fd=new FormData();fd.append('file',rImpFile);fd.append('year',document.getElementById('rimp-year').value);fd.append('mode',document.getElementById('rimp-mode').value);
  try{
    const r=await fetch('/api/import-rates-excel',{method:'POST',body:fd});const d=await r.json();
    if(d.error){toast(d.error,'er');return;}
    document.getElementById('rimp-chips').innerHTML=
      '<div class="r-chip" style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.25)"><div class="n" style="color:var(--green)">'+d.imported+'</div><div class="l" style="color:var(--green)">Importados</div></div>'+
      '<div class="r-chip" style="background:rgba(200,16,46,.08);border:1px solid rgba(200,16,46,.2)"><div class="n" style="color:var(--red)">'+d.total+'</div><div class="l" style="color:var(--red)">Total tabla</div></div>'+
      '<div class="r-chip" style="background:rgba(0,0,0,.045);border:1px solid var(--border)"><div class="n" style="color:'+(d.errors?.length?'#eb5757':'var(--muted)')+'">'+( d.errors?.length||0)+'</div><div class="l">Errores</div></div>';
    document.getElementById('rimp-errs').innerHTML=(d.errors||[]).map(e=>'<div style="font-size:11px;color:#eb5757;padding:3px 0">✕ '+esc(e.employee)+': '+esc(e.error)+'</div>').join('');
    document.getElementById('rimp-results').style.display='block';
    if(parseInt(document.getElementById('rimp-year').value)===rateActiveYear)await loadRates();
    toast(d.imported+' tarifas importadas al '+d.year+' ✓','ok',5000);
  }catch(err){toast('Error: '+err.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

function rateOpenCopyYear(){document.getElementById('rcopy-to').value=rateActiveYear+1;document.getElementById('mo-rcopy').classList.add('on');}

async function rateCopyYear(){
  const from=parseInt(document.getElementById('rcopy-from').value);
  const to=parseInt(document.getElementById('rcopy-to').value);
  if(!from||!to){toast('Completa ambos años','er');return;}
  try{
    const r=await apiCall('POST','/rates/copy-year',{source_year:from,target_year:to});
    if(r.error){toast(r.error,'er');return;}
    rateAvailYears=[...new Set([...rateAvailYears,to])].sort((a,b)=>b-a);
    rateActiveYear=to;rateBuildYearSel();await loadRates();closeMo('mo-rcopy');
    toast(r.count+' tarifas copiadas '+from+' → '+to+' ✓','ok');
  }catch{toast('Error al copiar año','er');}
}

function rateExportCSV(){window.open('/api/export-rates/'+rateActiveYear,'_blank');}

// ════════════════════════════════════════════════════════
//  QUOTE REGISTER
// ════════════════════════════════════════════════════════
let quotes=[], quoteCurrentRow=null;

function qStatus(r){return r.awarded?'awarded':r.sentClient?'client':r.sentMgmt?'mgmt':'open';}
function qChipCls(s){return{awarded:'ch-a',client:'ch-c',mgmt:'ch-m',open:'ch-n'}[s];}
function qChipTxt(s){return{awarded:'Awarded ✓',client:'Enviado a cliente',mgmt:'Enviado a dirección',open:'En proceso'}[s];}
function qTypeLbl(r){const p=[];if(r.machine)p.push(r.machine+'×Mach');if(r.tool)p.push(r.tool+'×Tool');if(r.machTool)p.push(r.machTool+'×M+T');if(r.robotic)p.push(r.robotic+'×Rob');if(r.service)p.push(r.service+'×Svc');return p.join(' · ')||'—';}
function qDeadlineBadge(v) {
  if (!v) return '<span style="color:var(--muted)">—</span>';
  const today = new Date(); today.setHours(0,0,0,0);
  const dl    = new Date(v+'T00:00:00'); dl.setHours(0,0,0,0);
  const diff  = Math.floor((dl - today) / 86400000);
  if (diff < 0)  return '<span title="VENCIDA" style="color:#ff4444;font-weight:700">🚨 '+v+'</span>';
  if (diff <= 3) return '<span title="Vence en '+diff+' día(s)" style="color:#f59e0b;font-weight:700">⚠️ '+v+'</span>';
  return '<span style="color:var(--muted2);font-size:11px">'+v+'</span>';
}

function qFmtD(d){if(!d)return'—';const dt=new Date(d+'T00:00:00');return dt.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});}

async function loadQuotes(){
  document.getElementById('q-tb').innerHTML='<tr><td colspan="10"><div class="es"><div class="spinner"></div></div></td></tr>';
  try{
    const ping=await(await fetch('/api/ping')).json();
    const ok=ping.xlsm_ok&&ping.quote_ok;
    document.getElementById('q-dot').className='conn-dot'+(ok?' ok':'');
    document.getElementById('q-lbl').textContent=ok?'Conectado':'Error de conexión';
    document.getElementById('dot-quotes').className='conn-dot'+(ok?' ok':'');
    document.getElementById('lbl-quotes').textContent='Quotes';
    quotes=await(await fetch('/api/quotes')).json();
    quoteRender();quoteUpdateStats();
  }catch(e){toast('Error al cargar cotizaciones: '+e,'er');}
}

function quoteFiltered(){
  const gs=document.getElementById('q-gs').value.toLowerCase();
  const fc=document.getElementById('qf-cust').value.toLowerCase();
  const fs=document.getElementById('qf-st').value;
  const ft=document.getElementById('qf-tp').value;
  const fy=document.getElementById('qf-yr').value;
  let out=quotes.filter(r=>{
    if(gs&&![r.qnum,r.customer,r.desc,r.rfq].join(' ').toLowerCase().includes(gs))return false;
    if(fc&&!(r.customer||'').toLowerCase().includes(fc))return false;
    if(fy&&!(r.qnum||'').includes('Q-'+fy))return false;
    if(fs){const s=qStatus(r);if(fs==='done'&&!r.done)return false;if(fs==='open'&&s!=='open')return false;if(fs==='mgmt'&&s!=='mgmt')return false;if(fs==='client'&&s!=='client')return false;if(fs==='awarded'&&!r.awarded)return false;}
    if(ft&&!r[ft])return false;
    return true;
  });
  const {key,dir}=sortState.quotes;
  if(key)out.sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||''),undefined,{numeric:true})*dir);
  return out;
}

function quoteRender(){
  const data=quoteFiltered();const tb=document.getElementById('q-tb');
  quoteUpdateStats();
  if(!data.length){tb.innerHTML='<tr><td colspan="12"><div class="es"><span class="ei">🔍</span><br>Sin resultados</div></td></tr>';return;}
  tb.innerHTML=data.map(r=>{
    const s=qStatus(r);const sc=s==='awarded'?'q-aw':s==='client'?'q-sc':s==='mgmt'?'q-sm':'';
    return`<tr class="${sc}${r.row===quoteCurrentRow?' sel':''}${r.refused?' refused-row':''}" onclick="quoteOpen(${r.row})">
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red)">${r.qnum||'—'}</td>
      <td style="font-weight:600;color:var(--text)">${esc(r.customer)}</td>
      <td style="max-width:210px;overflow:hidden;text-overflow:ellipsis;color:var(--muted2)">${esc(r.desc||'—')}</td>
      <td style="font-size:11px">${qTypeLbl(r)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${esc(r.rfq||'—')}</td>
      <td>${qFmtD(r.received)}</td>
      <td>${qDeadlineBadge(r.deadline)}</td>
      <td>${r.done?'<span class="badge b-done">Done ✓</span>':'<span class="badge b-toappr">Pendiente</span>'}</td>
      <td>${r.sentMgmt?qFmtD(r.sentMgmt):'<span style="color:var(--muted)">—</span>'}</td>
      <td>${r.sentClient?qFmtD(r.sentClient):'<span style="color:var(--muted)">—</span>'}</td>
      <td>${r.refused
        ? '<span class="badge b-done" style="background:rgba(200,16,46,.22);color:#a80d24;font-weight:700">✕ Refused</span>'
        : r.awarded && r.cpo_registered
          ? '<span class="badge b-yes" style="background:rgba(39,174,96,.22);color:#1f8a4c;font-weight:700">✓ Venta Reg.</span>'
          : r.awarded
            ? '<span class="badge b-yes">Awarded</span>'
            : '—'
      }</td>
      <td>
        <div style="display:flex;flex-direction:column;gap:5px;padding:4px 0">
          <span class="chip ${qChipCls(s)}" style="margin-bottom:0;padding:2px 9px;font-size:9px">${qChipTxt(s)}</span>
          <div style="font-size:11px;color:var(--text)"><span style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.5px">TS:</span> ${esc(r.technicalSales||'—')}</div>
          <div style="font-size:11px;color:var(--text)"><span style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.5px">KAM:</span> ${esc(r.keyAccountManager||'—')}</div>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function quoteUpdateStats(){
  document.getElementById('qs-tot').textContent=quotes.length;
  document.getElementById('qs-aw').textContent=quotes.filter(r=>r.awarded).length;
  document.getElementById('qs-dn').textContent=quotes.filter(r=>r.done).length;
  document.getElementById('qs-op').textContent=quotes.filter(r=>qStatus(r)==='open').length;
}

function quoteOpen(row){
  const r=quotes.find(x=>x.row===row);if(!r)return;quoteSelected=r;quoteCurrentRow=row;quoteRender();
  document.getElementById('qp-q').textContent=r.qnum||'—';
  document.getElementById('qp-c').textContent=r.customer;
  const s=qStatus(r);
  document.getElementById('qpchip').className='chip '+qChipCls(s);
  document.getElementById('qpcl').textContent=qChipTxt(s);
  document.getElementById('qe-cust').value=r.customer||'';
  document.getElementById('qe-rfq').value=r.rfq||'';
  document.getElementById('qe-desc').value=r.desc||'';
  document.getElementById('qe-recv').value=r.received||'';
  document.getElementById('qe-ts').value=r.technicalSales||'';
  document.getElementById('qe-kam').value=r.keyAccountManager||'';
  document.getElementById('qe-mc').value=r.machine||'';
  document.getElementById('qe-tl').value=r.tool||'';
  document.getElementById('qe-mt').value=r.machTool||'';
  document.getElementById('qe-rb').value=r.robotic||'';
  document.getElementById('qe-sv').value=r.service||'';
  document.getElementById('qe-dn').checked=!!r.done;
  document.getElementById('qe-dl').value=r.deadline||'';
  document.getElementById('qe-sm').value=r.sentMgmt||'';
  document.getElementById('qe-sc').value=r.sentClient||'';
  document.getElementById('qe-aw').checked=!!r.awarded;
  document.getElementById('qe-nt').value=r.notes||'';
  // Mostrar/ocultar botones de flujo
  const awardBtn  = document.getElementById('btn-award-flow');
  const refuseBtn = document.getElementById('btn-refuse-flow');
  if (awardBtn)  awardBtn.style.display  = (r.awarded && !r.refused && !r.cpo_registered) ? '' : 'none';
  if (refuseBtn) refuseBtn.style.display = (r.refused || r.cpo_registered) ? 'none' : '';
  document.getElementById('q-dp').textContent='\\\\naspersico\\SALES MX\\GERC\\QUOTE REG\\'+r.qnum;
  qStab('det',document.querySelector('#q-panel .ptab'));
  openPanel('q-panel');
}

function qStab(name,btn){
  document.querySelectorAll('#q-panel .ptab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#q-panel .tc2').forEach(c=>c.classList.remove('on'));
  document.querySelectorAll('#q-panel .ptab').forEach(b=>{if(b.getAttribute('onclick').includes("'"+name+"'"))b.classList.add('on');});
  document.getElementById('qtab-'+name).classList.add('on');
  if(name==='doc'&&quoteCurrentRow!==null){const r=quotes.find(x=>x.row===quoteCurrentRow);if(r)qLoadFiles(r.qnum);}
}

async function quoteSave(){
  const r=quotes.find(x=>x.row===quoteCurrentRow);if(!r)return;
  const payload={
    qnum:r.qnum,customer:document.getElementById('qe-cust').value.trim(),
    rfq:document.getElementById('qe-rfq').value.trim(),desc:document.getElementById('qe-desc').value.trim(),
    received:document.getElementById('qe-recv').value||null,
    technicalSales:document.getElementById('qe-ts').value.trim()||null,
    keyAccountManager:document.getElementById('qe-kam').value.trim()||null,
    machine:document.getElementById('qe-mc').value||null,tool:document.getElementById('qe-tl').value||null,
    machTool:document.getElementById('qe-mt').value||null,robotic:document.getElementById('qe-rb').value||null,
    service:document.getElementById('qe-sv').value||null,done:document.getElementById('qe-dn').checked,
    deadline:document.getElementById('qe-dl').value||null,
      sentMgmt:document.getElementById('qe-sm').value||null,sentClient:document.getElementById('qe-sc').value||null,
    awarded:document.getElementById('qe-aw').checked,notes:document.getElementById('qe-nt').value.trim(),
  };
  try{
    const res=await apiCall('PUT','/quotes/'+quoteCurrentRow,payload);if(res.error)throw new Error(res.error);
    Object.assign(r,payload);
    document.getElementById('qp-q').textContent=r.qnum;document.getElementById('qp-c').textContent=r.customer;
    const s=qStatus(r);document.getElementById('qpchip').className='chip '+qChipCls(s);document.getElementById('qpcl').textContent=qChipTxt(s);
    quoteRender();toast('Guardado en Excel ✓','ok');
  }catch(e){toast('Error al guardar: '+e,'er');}
}

async function quoteDelete(){
  const r=quotes.find(x=>x.row===quoteCurrentRow);if(!r)return;
  if(!confirm('¿Eliminar '+r.qnum+' – '+r.customer+'?'))return;
  try{
    await apiCall('DELETE','/quotes/'+quoteCurrentRow);
    quotes=quotes.filter(x=>x.row!==quoteCurrentRow);closePanel();toast(r.qnum+' eliminada','if');await loadQuotes();
  }catch(e){toast('Error: '+e,'er');}
}

function quoteOpenNew(){
  const t=new Date().toISOString().split('T')[0];
  ['qn-c','qn-r','qn-d','qn-nt'].forEach(id=>document.getElementById(id).value='');
  ['qn-mc','qn-tl','qn-mt','qn-rb','qn-sv'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('qn-recv').value=t;
  document.getElementById('mo-qnew').classList.add('on');
  document.getElementById('qn-c').focus();
}

async function quoteCreate(){
  const c=document.getElementById('qn-c').value.trim();const d=document.getElementById('qn-d').value.trim();
  if(!c){toast('El cliente es obligatorio','er');return;}if(!d){toast('La descripción es obligatoria','er');return;}
  const btn=document.getElementById('btn-qcreate');btn.disabled=true;btn.textContent='Creando…';
  const payload={customer:c,rfq:document.getElementById('qn-r').value.trim(),desc:d,received:document.getElementById('qn-recv').value||null,
    machine:document.getElementById('qn-mc').value||null,tool:document.getElementById('qn-tl').value||null,
    machTool:document.getElementById('qn-mt').value||null,robotic:document.getElementById('qn-rb').value||null,
    service:document.getElementById('qn-sv').value||null,notes:document.getElementById('qn-nt').value.trim(),
    done:false,sentMgmt:null,sentClient:null,awarded:false};
  try{
    const res=await apiCall('POST','/quotes',payload);if(res.error)throw new Error(res.error);
    closeMo('mo-qnew');toast(res.qnum+' creada ✓','ok');
    await loadQuotes();setTimeout(()=>{const nr=quotes.find(x=>x.qnum===res.qnum);if(nr)quoteOpen(nr.row);},300);
  }catch(e){toast('Error al crear: '+e,'er');}
  finally{btn.disabled=false;btn.textContent='Crear cotización';}
}

async function qLoadFiles(qnum){
  const fl=document.getElementById('q-fl');
  fl.innerHTML='<div class="es"><div class="spinner"></div></div>';
  try{
    const files=await(await fetch('/api/quotes/files/'+qnum)).json();
    if(!files.length){fl.innerHTML='<div class="es"><div class="ei">📂</div><p>Sin documentos.</p></div>';return;}
    fl.innerHTML=files.map(f=>'<div class="fitem"><span class="fi-ic">'+fileIco(f.name)+'</span><div class="fi-inf"><div class="fi-nm">'+esc(f.name)+'</div><div class="fi-mt">'+fmtSz(f.size)+' · '+f.modified+'</div></div><div style="display:flex;gap:4px"><a class="fi-dl" href="/api/quotes/files/'+qnum+'/'+encodeURIComponent(f.name)+'" download title="Descargar">⬇</a><button class="fi-del" onclick="qDelFile(\''+qnum+'\',\''+esc(f.name)+'\')">🗑</button></div></div>').join('');
  }catch{fl.innerHTML='<div class="es"><div class="ei">⚠</div><p>Error al leer carpeta.</p></div>';}
}

async function qUploadFiles(fileList){
  const r=quotes.find(x=>x.row===quoteCurrentRow);if(!r)return;
  const fd=new FormData();Array.from(fileList).forEach(f=>fd.append('files',f));
  try{
    const res=await fetch('/api/quotes/upload/'+r.qnum,{method:'POST',body:fd});
    const data=await res.json();if(data.error)throw new Error(data.error);
    toast(data.saved.length+' archivo(s) guardados','ok');await qLoadFiles(r.qnum);
  }catch(e){toast('Error al subir: '+e,'er');}
  document.querySelector('#q-dz input').value='';
}

function qDropFiles(e){e.preventDefault();document.getElementById('q-dz').classList.remove('dg');qUploadFiles(e.dataTransfer.files);}

async function qDelFile(qnum,filename){
  if(!confirm('¿Eliminar "'+filename+'"?'))return;
  try{const r=await(await fetch('/api/quotes/files/'+qnum+'/'+encodeURIComponent(filename),{method:'DELETE'})).json();if(r.error){toast(r.error,'er');return;}toast(filename+' eliminado','if');await qLoadFiles(qnum);}catch(e){toast('Error: '+e,'er');}
}

['qf-cust','qf-st','qf-tp','qf-yr'].forEach(id=>{const el=document.getElementById(id);if(el){el.addEventListener('input',quoteRender);el.addEventListener('change',quoteRender);}});
// Mantiene sincronizado el filtro de Estatus del sidebar con el filtro embebido en la columna de la tabla
document.getElementById('qf-st')?.addEventListener('change',function(){const col=document.getElementById('qf-st-col');if(col)col.value=this.value;});
function qSyncStatusFilter(value,sourceId){
  const otherId = sourceId==='qf-st-col' ? 'qf-st' : 'qf-st-col';
  const other = document.getElementById(otherId);
  if(other) other.value = value;
  quoteRender();
}

// ════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const mods=['mo-jnew','mo-jimp','mo-rnew','mo-rimp','mo-rcopy','mo-qnew','mo-qimp','mo-pt-new','mo-pt-confirm','mo-sv-new','mo-stk-imp','mo-stk-ing','mo-reassign','mo-prov-new','mo-prov-imp','mo-cat-new','mo-cat-imp','mo-cpo-new','mo-cpo-imp','mo-po-imp','mo-wh-imp','mo-ivp-imp','mo-fx-imp','mo-refuse','mo-award'];
    const open=mods.find(m=>document.getElementById(m).classList.contains('on'));
    if(open)closeMo(open); else if(_currentPanel)closePanel();
  }
});

// ════════════════════════════════════════════════════════
//  PURCHASE ORDERS
// ════════════════════════════════════════════════════════
let poRecords=[], poActiveYear=new Date().getFullYear(), poAvailYears=[], poImpFile=null;

const PO_EST_STYLE={
  'Recepcionada':'background:rgba(39,174,96,.22);color:#1f8a4c;border:1px solid rgba(39,174,96,.5);font-weight:700',
  'Emitida':     'background:rgba(41,128,185,.22);color:#1a6fa8;border:1px solid rgba(41,128,185,.5);font-weight:700',
  'Cancelada':   'background:rgba(200,16,46,.18);color:#a80d24;border:1px solid rgba(200,16,46,.5);font-weight:700',
  'Rec.Parc.':   'background:rgba(243,156,18,.22);color:#a8650a;border:1px solid rgba(243,156,18,.5);font-weight:700',
  'Comprada':    'background:rgba(142,68,173,.22);color:#7d3f95;border:1px solid rgba(142,68,173,.5);font-weight:700',
};

function poFmtDate(s){ if(!s)return'—'; try{const d=new Date(s+'T00:00:00');return d.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});}catch{return s;} }
function poFmtNum(n,dec=2){ return n==null||n===''?'—':Number(n).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}); }

async function deleteIPORow(year, clave, idx) {
  if(!confirm(`¿Eliminar este registro (${clave} #${idx+1})?`)) return;
  try {
    const d = await fetch(`/api/po/${year}/${encodeURIComponent(clave)}?idx=${idx}`,
      {method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    toast('Registro eliminado','ok');
    await loadPO();
  } catch(e){toast('Error: '+e.message,'er');}
}


async function loadPO(){
  document.getElementById('po-tb').innerHTML='<tr><td colspan="9"><div class="es"><div class="spinner"></div></div></td></tr>';
  try{
    const ping=await(await fetch('/api/ping')).json();
    const ok=ping.po_ok;
    document.getElementById('po-dot').className='conn-dot'+(ok?' ok':'');
    document.getElementById('po-lbl').textContent=ok?'NAS OK':'NAS sin acceso';
    document.getElementById('dot-po').className='conn-dot'+(ok?' ok':'');
    document.getElementById('lbl-po').textContent='IPOs';
    document.getElementById('po-path').textContent=ping.po_folder||'—';
    // Use USD-converted view
    const d=await(await fetch('/api/po/usd-view?year='+poActiveYear)).json();
    poRecords=d.records||[];
    poAvailYears=d.available_years||[];
    poBuildYearSel();
    poRender();
    poUpdateStats();
  }catch(e){toast('Error al cargar Purchase Orders: '+e,'er');}
}

function poBuildYearSel(){
  const all=[...new Set([poActiveYear,...poAvailYears])].sort((a,b)=>b-a);
  document.getElementById('po-year-sel').innerHTML=all.map(y=>'<option value="'+y+'"'+(y===poActiveYear?' selected':'')+'>'+y+'</option>').join('');
  // Also populate import modal year selector
  const impSel=document.getElementById('po-imp-year');
  if(impSel) impSel.innerHTML=all.map(y=>'<option value="'+y+'"'+(y===poActiveYear?' selected':'')+'>'+y+'</option>').join('');
  document.getElementById('po-tb-year').textContent=poActiveYear;
}

function poSwitchYear(){ poActiveYear=parseInt(document.getElementById('po-year-sel').value); loadPO(); }

function poFiltered(){
  const nombre=document.getElementById('pof-nombre').value.toLowerCase();
  const dest  =document.getElementById('pof-dest').value.toLowerCase();
  const est   =document.getElementById('pof-est').value;
  const mon   =document.getElementById('pof-moneda').value;
  const minSub=parseFloat(document.getElementById('pof-min').value)||0;
  const gs    =document.getElementById('po-gs').value.toLowerCase();

  return poRecords.filter(r=>{
    if(nombre && !(r.nombre||'').toLowerCase().includes(nombre)) return false;
    if(dest   && !(r.entregar_a||'').toLowerCase().includes(dest)) return false;
    if(est    && r.estatus!==est) return false;
    if(mon==='MXN' && r.tipo_cambio>1) return false;
    if(mon==='USD' && r.tipo_cambio<=1) return false;
    if(r.subtotal<minSub) return false;
    if(gs && !((r.gpo_number||'')+(r.clave||'')+(r.nombre||'')+(r.entregar_a||'')+(r.estatus||'')).toString().toLowerCase().includes(gs)) return false;
    return true;
  }).sort((a,b)=>{
    const {key,dir}=sortState.po;
    let av=a[key]??'', bv=b[key]??'';
    if(typeof av==='number') return dir*(av-bv);
    return dir*String(av).localeCompare(String(bv),undefined,{numeric:true});
  });
}

function poRender(){
  const rows=poFiltered();
  const tb=document.getElementById('po-tb');
  const totalUSD=rows.reduce((s,r)=>s+(r.subtotal_usd||r.subtotal||0),0);
  document.getElementById('po-total-mxn').textContent='$'+poFmtNum(totalUSD,2)+' USD';

  if(!rows.length){
    tb.innerHTML='<tr><td colspan="11"><div class="es"><span class="ei">🛒</span><br>Sin registros</div></td></tr>';
    return;
  }
  tb.innerHTML=rows.map((r,rowI)=>{
    const isUSD=r.moneda==='USD';
    const hasFX=!isUSD && r.fx_rate_used;
    const estStyle=PO_EST_STYLE[r.estatus]||'background:rgba(0,0,0,.055);color:var(--muted)';
    const usdVal = r.subtotal_usd != null ? r.subtotal_usd : r.subtotal;
    const poLabel = r.gpo_number || r.clave;

    // Count how many records before this one share the same clave (for idx)
    const sameClaveIdx = rows.slice(0, rowI).filter(x=>(x.clave||x.gpo_number)===(r.clave||r.gpo_number)).length;

    // PDF: GPO-generated records use gpo PDF, IPO-only records use IPO PDF endpoint
    const pdfBtn = r.gpo_pdf && r.gpo_number
      ? `<button onclick="window.open('/api/gpo/${esc(r.gpo_number)}/pdf','_blank')" class="btn-reload" style="font-size:10px;padding:3px 8px">🖨 PDF</button>`
      : (r.part_number || r._split_origin)
      ? `<button onclick="window.open('/api/po/${poActiveYear}/pdf/${esc(r.clave||r.gpo_number)}?idx=${sameClaveIdx}','_blank')" class="btn-reload" style="font-size:10px;padding:3px 8px">🖨 PDF</button>`
      : '—';

    const isAdm = USER_PERMS && USER_PERMS.is_admin;
    // Delete: use idx parameter so only this specific row is deleted
    const clave = r.clave || r.gpo_number || '';
    const delBtn = isAdm
      ? `<button onclick="deleteIPORow(${poActiveYear},'${esc(clave)}',${sameClaveIdx})" class="fi-del" style="font-size:11px;margin-left:4px" title="Eliminar este registro">✕</button>`
      : '';

    const rowIdx = poFiltered().indexOf(r);
    const editBtn = `<button onclick="poOpenEdit(${rowIdx})" class="btn-reload" style="font-size:10px;padding:3px 8px;margin-left:4px" title="Editar registro">✏</button>`;
    return`<tr>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);font-weight:600;white-space:nowrap">${esc(String(poLabel))}</td>
      <td style="color:var(--muted2)">${poFmtDate(r.fecha_doc)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--amber)">${esc(r.entregar_a||'—')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--gold)">${esc(r.cpo||'—')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:var(--text)" title="${esc(r.nombre)}">${esc(r.nombre||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">
        ${isUSD?'':'<span style="font-size:9px;color:var(--muted)">MXN </span>'}$${poFmtNum(r.subtotal)}
      </td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:12px;color:var(--gold);font-weight:600">
        $${poFmtNum(usdVal)}
      </td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:10px;color:${hasFX?'var(--muted2)':'var(--muted)'}">
        ${isUSD?'1.0000':hasFX?r.fx_rate_used.toFixed(4):'<span style="color:#eb5757;font-size:9px">N/FX</span>'}
      </td>
      <td><span class="badge" style="${estStyle}">${esc(r.estatus||'—')}</span></td>
      <td style="color:var(--muted2)">${poFmtDate(r.fecha_recepcion)}</td>
      <td style="white-space:nowrap">${pdfBtn}${editBtn}${delBtn}</td>
    </tr>`;
  }).join('');
}

function poUpdateStats(){
  document.getElementById('pos-tot').textContent =poRecords.length;
  document.getElementById('pos-rec').textContent =poRecords.filter(r=>r.estatus==='Recepcionada').length;
  document.getElementById('pos-emit').textContent=poRecords.filter(r=>r.estatus==='Emitida').length;
  document.getElementById('pos-can').textContent =poRecords.filter(r=>r.estatus==='Cancelada').length;
}

// Sort for PO
sortState.po={key:'clave',dir:1};
document.querySelectorAll('thead th[data-mod="po"]').forEach(th=>{
  th.addEventListener('click',()=>{
    const k=th.dataset.k;
    if(sortState.po.key===k) sortState.po.dir*=-1; else{sortState.po.key=k;sortState.po.dir=1;}
    document.querySelectorAll('thead th[data-mod="po"]').forEach(t=>t.classList.remove('sa','sd'));
    th.classList.add(sortState.po.dir===1?'sa':'sd');
    poRender();
  });
});

// PO Import
function poOpenImport(){
  poImpFile=null;
  document.getElementById('po-imp-file').value='';
  document.getElementById('po-imp-fname').textContent='—';
  document.getElementById('po-imp-results').style.display='none';
  document.getElementById('btn-po-imp-run').disabled=true;
  poBuildYearSel(); // refresh year dropdown
  document.getElementById('mo-po-imp').classList.add('on');
}
function onPoImpFile(inp){
  if(inp.files.length){poImpFile=inp.files[0];document.getElementById('po-imp-fname').textContent=poImpFile.name;document.getElementById('btn-po-imp-run').disabled=false;}
}
function poDropImport(e){
  e.preventDefault();document.getElementById('po-dz-imp').classList.remove('dg');
  const f=e.dataTransfer.files[0];
  if(f){poImpFile=f;document.getElementById('po-imp-fname').textContent=f.name;document.getElementById('btn-po-imp-run').disabled=false;}
}

async function poRunImport(){
  if(!poImpFile)return;
  const btn=document.getElementById('btn-po-imp-run');
  btn.disabled=true;btn.textContent='Importando…';
  document.getElementById('po-imp-results').style.display='none';
  const fd=new FormData();
  fd.append('file',poImpFile);
  fd.append('year',document.getElementById('po-imp-year').value);
  fd.append('mode',document.getElementById('po-imp-mode').value);
  try{
    const r=await fetch('/api/po/import',{method:'POST',body:fd});
    const d=await r.json();
    if(d.error){toast(d.error,'er');return;}
    document.getElementById('po-imp-chips').innerHTML=
      '<div class="r-chip" style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.25)"><div class="n" style="color:var(--green)">'+d.imported+'</div><div class="l" style="color:var(--green)">Importadas</div></div>'+
      '<div class="r-chip" style="background:rgba(200,16,46,.08);border:1px solid rgba(200,16,46,.2)"><div class="n" style="color:var(--red)">'+d.total+'</div><div class="l" style="color:var(--red)">Total tabla</div></div>'+
      '<div class="r-chip" style="background:rgba(0,0,0,.045);border:1px solid var(--border)"><div class="n" style="color:'+(d.errors?.length?'#eb5757':'var(--muted)')+'">'+( d.errors?.length||0)+'</div><div class="l">Errores</div></div>';
    document.getElementById('po-imp-errs').innerHTML=(d.errors||[]).map(e=>'<div style="font-size:11px;color:#eb5757;padding:3px 0">✕ Clave '+esc(e.clave)+': '+esc(e.error)+'</div>').join('');
    document.getElementById('po-imp-results').style.display='block';
    if(parseInt(document.getElementById('po-imp-year').value)===poActiveYear) await loadPO();
    toast(d.imported+' OCs importadas al '+d.year+' ✓','ok',5000);
  }catch(err){toast('Error: '+err.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

function poExportCSV(){ window.open('/api/po/export/'+poActiveYear,'_blank'); }

// ════════════════════════════════════════════════════════
//  WORK HOURS
// ════════════════════════════════════════════════════════
let whRecords=[], whActiveYear=new Date().getFullYear(), whAvailYears=[], whImpFile=null;
let whRateMap={};   // normalized-name → rate (USD/hr), built when rates load
sortState.wh={key:'date_worked',dir:1};

function whBuildRateMap(){
  // Called after loadRates() or loadWH() — cross-reference current rate year
  whRateMap={};
  for(const r of rates){
    if(r.employee && r.rate!=null)
      whRateMap[rateNorm(r.employee)] = parseFloat(r.rate)||0;
  }
}

function whGetRate(employeeName){
  return whRateMap[rateNorm(employeeName)] || 0;
}

async function loadWH(){
  document.getElementById('wh-tb').innerHTML='<tr><td colspan="7"><div class="es"><div class="spinner"></div></div></td></tr>';
  try{
    const ping=await(await fetch('/api/ping')).json();
    const ok=ping.wh_ok;
    document.getElementById('wh-dot').className='conn-dot'+(ok?' ok':'');
    document.getElementById('wh-lbl').textContent=ok?'NAS OK':'NAS sin acceso';
    document.getElementById('dot-wh').className='conn-dot'+(ok?' ok':'');
    document.getElementById('wh-path').textContent=ping.wh_folder||'—';

    const d=await(await fetch('/api/wh?year='+whActiveYear)).json();
    whRecords=d.records||[];
    whAvailYears=d.available_years||[];
    whBuildRateMap();
    whBuildYearSel();
    whRender(); whUpdateStats();
  }catch(e){toast('Error al cargar Work Hours: '+e,'er');}
}

function whBuildYearSel(){
  const all=[...new Set([whActiveYear,...whAvailYears])].sort((a,b)=>b-a);
  document.getElementById('wh-year-sel').innerHTML=all.map(y=>'<option value="'+y+'"'+(y===whActiveYear?' selected':'')+'>'+y+'</option>').join('');
  const impSel=document.getElementById('wh-imp-year');
  if(impSel) impSel.innerHTML=all.map(y=>'<option value="'+y+'"'+(y===whActiveYear?' selected':'')+'>'+y+'</option>').join('');
  document.getElementById('wh-tb-year').textContent=whActiveYear;
}
function whSwitchYear(){ whActiveYear=parseInt(document.getElementById('wh-year-sel').value); loadWH(); }

function whFiltered(){
  const emp  =document.getElementById('whf-emp').value.toLowerCase();
  const code =document.getElementById('whf-code').value.toLowerCase();
  const desc =document.getElementById('whf-desc').value.toLowerCase();
  const from =document.getElementById('whf-from').value;
  const to   =document.getElementById('whf-to').value;
  const gs   =document.getElementById('wh-gs').value.toLowerCase();
  return whRecords.filter(r=>{
    if(emp  && !(r.employee||'').toLowerCase().includes(emp)) return false;
    if(code && !(r.work_code||'').toLowerCase().includes(code)) return false;
    if(desc && !(r.description||'').toLowerCase().includes(desc)) return false;
    if(from && r.date_worked < from) return false;
    if(to   && r.date_worked > to)   return false;
    if(gs && !((r.employee||'')+(r.work_code||'')+(r.description||'')).toLowerCase().includes(gs)) return false;
    return true;
  }).sort((a,b)=>{
    const {key,dir}=sortState.wh;
    // cost is a computed field — sort by it properly
    if(key==='cost'){
      const ca=(a.hours||0)*whGetRate(a.employee||'');
      const cb=(b.hours||0)*whGetRate(b.employee||'');
      return dir*(ca-cb);
    }
    let av=a[key]??'', bv=b[key]??'';
    if(typeof av==='number') return dir*(av-bv);
    return dir*String(av).localeCompare(String(bv));
  });
}

function whHrColor(h){ return h>=10?'#e74c3c':h>=6?'var(--amber)':h>=1?'var(--green)':'var(--muted)'; }

function whRender(){
  const rows=whFiltered();
  const tb=document.getElementById('wh-tb');
  const totalHrs =rows.reduce((s,r)=>s+(r.hours||0),0);
  const totalCost=rows.reduce((s,r)=>s+(r.hours||0)*whGetRate(r.employee||''),0);
  document.getElementById('wh-total-hrs').textContent =totalHrs.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+' h';
  document.getElementById('wh-total-cost').textContent='$'+totalCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(!rows.length){
    tb.innerHTML='<tr><td colspan="7"><div class="es"><span class="ei">⏱</span><br>Sin registros</div></td></tr>';
    return;
  }
  // Limit display to 2000 rows for performance
  const display=rows.slice(0,2000);
  const more=rows.length>2000?`<tr><td colspan="7" style="text-align:center;padding:10px;color:var(--muted);font-size:11px">… y ${rows.length-2000} registros más — afina los filtros para verlos</td></tr>`:'';
  tb.innerHTML=display.map((r,i)=>{
    const rate=whGetRate(r.employee||'');
    const cost=(r.hours||0)*rate;
    const hasRate=rate>0;
    return`<tr style="${i%2===0?'':'background:rgba(0,0,0,.02)'}">
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">${r.id||''}</td>
      <td style="font-weight:500;color:var(--text);max-width:190px;overflow:hidden;text-overflow:ellipsis">${esc(r.employee)}</td>
      <td style="color:var(--muted2);font-family:'DM Mono',monospace;font-size:11px">${r.date_worked||'—'}</td>
      <td><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--amber);font-weight:600">${esc(r.work_code||'—')}</span></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:${whHrColor(r.hours||0)}">${(r.hours||0).toFixed(1)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:12px;color:${hasRate?'var(--green)':'var(--muted)'}" title="${hasRate?'$'+rate.toFixed(2)+'/hr':'Sin tarifa en Hourly Rates'}">
        ${hasRate?'$'+cost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'<span style="font-size:10px;opacity:.5">N/T</span>'}
      </td>
      <td style="color:var(--muted2);max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(r.description||'—')}</td>
    </tr>`;
  }).join('')+more;
}

function whUpdateStats(){
  const total=whRecords.reduce((s,r)=>s+(r.hours||0),0);
  const totalCost=whRecords.reduce((s,r)=>s+(r.hours||0)*whGetRate(r.employee||''),0);
  const emps =new Set(whRecords.map(r=>r.employee)).size;
  const codes=new Set(whRecords.map(r=>r.work_code).filter(Boolean)).size;
  document.getElementById('whs-tot').textContent =whRecords.length.toLocaleString();
  document.getElementById('whs-hrs').textContent =total.toLocaleString('en-US',{maximumFractionDigits:0});
  document.getElementById('whs-emp').textContent =emps;
  document.getElementById('whs-codes').textContent=codes;
}

document.querySelectorAll('thead th[data-mod="wh"]').forEach(th=>{
  th.addEventListener('click',()=>{
    const k=th.dataset.k;
    if(sortState.wh.key===k) sortState.wh.dir*=-1; else{sortState.wh.key=k;sortState.wh.dir=1;}
    document.querySelectorAll('thead th[data-mod="wh"]').forEach(t=>t.classList.remove('sa','sd'));
    th.classList.add(sortState.wh.dir===1?'sa':'sd'); whRender();
  });
});

function whOpenImport(){
  whImpFile=null;
  document.getElementById('wh-imp-file').value='';
  document.getElementById('wh-imp-fname').textContent='—';
  document.getElementById('wh-imp-results').style.display='none';
  document.getElementById('btn-wh-imp-run').disabled=true;
  // Default date range: full year
  document.getElementById('wh-imp-from').value=whActiveYear+'-01-01';
  document.getElementById('wh-imp-to').value=whActiveYear+'-12-31';
  whBuildYearSel();
  document.getElementById('mo-wh-imp').classList.add('on');
}
function onWhImpFile(inp){
  if(inp.files.length){whImpFile=inp.files[0];document.getElementById('wh-imp-fname').textContent=whImpFile.name;document.getElementById('btn-wh-imp-run').disabled=false;}
}
function whDropImport(e){
  e.preventDefault();document.getElementById('wh-dz-imp').classList.remove('dg');
  const f=e.dataTransfer.files[0];
  if(f){whImpFile=f;document.getElementById('wh-imp-fname').textContent=f.name;document.getElementById('btn-wh-imp-run').disabled=false;}
}

async function whRunImport(){
  if(!whImpFile)return;
  const btn=document.getElementById('btn-wh-imp-run');
  btn.disabled=true; btn.textContent='Importando…';
  document.getElementById('wh-imp-results').style.display='none';
  const fd=new FormData();
  fd.append('file',whImpFile);
  fd.append('year',document.getElementById('wh-imp-year').value);
  fd.append('mode',document.getElementById('wh-imp-mode').value);
  fd.append('date_from',document.getElementById('wh-imp-from').value);
  fd.append('date_to',document.getElementById('wh-imp-to').value);
  try{
    const r=await fetch('/api/wh/import',{method:'POST',body:fd});
    const d=await r.json();
    if(d.error){toast(d.error,'er');return;}
    document.getElementById('wh-imp-chips').innerHTML=
      '<div class="r-chip" style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.25)"><div class="n" style="color:var(--green)">'+d.imported+'</div><div class="l" style="color:var(--green)">Importados</div></div>'+
      '<div class="r-chip" style="background:rgba(0,0,0,.045);border:1px solid var(--border)"><div class="n" style="color:var(--muted)">'+d.skipped+'</div><div class="l">Omitidos</div></div>'+
      '<div class="r-chip" style="background:rgba(200,16,46,.08);border:1px solid rgba(200,16,46,.2)"><div class="n" style="color:var(--red)">'+d.total+'</div><div class="l" style="color:var(--red)">Total tabla</div></div>';
    document.getElementById('wh-imp-errs').innerHTML=(d.errors||[]).map(e=>'<div style="font-size:11px;color:#eb5757;padding:3px 0">✕ Row '+esc(e.row)+': '+esc(e.error)+'</div>').join('');
    document.getElementById('wh-imp-results').style.display='block';
    if(parseInt(document.getElementById('wh-imp-year').value)===whActiveYear) await loadWH();
    toast(d.imported+' registros importados ✓ ('+d.skipped+' omitidos por fecha)','ok',6000);
  }catch(err){toast('Error: '+err.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

function whExportCSV(){ window.open('/api/wh/export/'+whActiveYear,'_blank'); }

// ════════════════════════════════════════════════════════
//  INVOICED POs
// ════════════════════════════════════════════════════════
let ivpRecords=[], ivpActiveYear=new Date().getFullYear(), ivpAvailYears=[], ivpImpFile=null;
sortState.ivp={key:'clave',dir:1};

const IVP_EST_STYLE={
  'Emitida': 'background:rgba(41,128,185,.22);color:#1a6fa8;border:1px solid rgba(41,128,185,.5);font-weight:700',
  'Devuelta':'background:rgba(200,16,46,.18);color:#a80d24;border:1px solid rgba(200,16,46,.5);font-weight:700',
};

async function loadIVP(){
  document.getElementById('ivp-tb').innerHTML='<tr><td colspan="9"><div class="es"><div class="spinner"></div></div></td></tr>';
  try{
    const ping=await(await fetch('/api/ping')).json();
    const ok=ping.ivp_ok;
    document.getElementById('ivp-dot').className='conn-dot'+(ok?' ok':'');
    document.getElementById('ivp-lbl').textContent=ok?'NAS OK':'NAS sin acceso';
    document.getElementById('dot-ivp').className='conn-dot'+(ok?' ok':'');
    document.getElementById('ivp-path').textContent=ping.ivp_folder||'—';

    const d=await(await fetch('/api/ivp?year='+ivpActiveYear)).json();
    ivpRecords=d.records||[];
    ivpAvailYears=d.available_years||[];
    ivpBuildYearSel();
    ivpRender(); ivpUpdateStats();
  }catch(e){toast('Error al cargar Invoiced POs: '+e,'er');}
}

function ivpBuildYearSel(){
  const all=[...new Set([ivpActiveYear,...ivpAvailYears])].sort((a,b)=>b-a);
  document.getElementById('ivp-year-sel').innerHTML=all.map(y=>'<option value="'+y+'"'+(y===ivpActiveYear?' selected':'')+'>'+y+'</option>').join('');
  const impSel=document.getElementById('ivp-imp-year');
  if(impSel) impSel.innerHTML=all.map(y=>'<option value="'+y+'"'+(y===ivpActiveYear?' selected':'')+'>'+y+'</option>').join('');
  document.getElementById('ivp-tb-year').textContent=ivpActiveYear;
}
function ivpSwitchYear(){ ivpActiveYear=parseInt(document.getElementById('ivp-year-sel').value); loadIVP(); }

function ivpFiltered(){
  const nombre=document.getElementById('ivpf-nombre').value.toLowerCase();
  const dest  =document.getElementById('ivpf-dest').value.toLowerCase();
  const est   =document.getElementById('ivpf-est').value;
  const mon   =document.getElementById('ivpf-mon').value;
  const from  =document.getElementById('ivpf-from').value;
  const to    =document.getElementById('ivpf-to').value;
  const gs    =document.getElementById('ivp-gs').value.toLowerCase();
  return ivpRecords.filter(r=>{
    if(nombre && !(r.nombre||'').toLowerCase().includes(nombre)) return false;
    if(dest   && !(r.entregar_a||'').toLowerCase().includes(dest)) return false;
    if(est    && r.estatus!==est) return false;
    if(mon    && r.moneda!==mon)  return false;
    if(from   && r.fecha_pago && r.fecha_pago < from) return false;
    if(to     && r.fecha_pago && r.fecha_pago > to)   return false;
    if(gs && !((r.clave||'')+(r.nombre||'')+(r.entregar_a||'')).toString().toLowerCase().includes(gs)) return false;
    return true;
  }).sort((a,b)=>{
    const {key,dir}=sortState.ivp;
    let av=a[key]??'', bv=b[key]??'';
    if(typeof av==='number') return dir*(av-bv);
    return dir*String(av).localeCompare(String(bv),undefined,{numeric:true});
  });
}

function ivpRender(){
  const rows=ivpFiltered();
  const tb=document.getElementById('ivp-tb');
  const totalMXN=rows.filter(r=>r.moneda==='MXN').reduce((s,r)=>s+(r.subtotal||0),0);
  const totalUSD=rows.filter(r=>r.moneda==='USD').reduce((s,r)=>s+(r.subtotal||0),0);
  let totalTxt='';
  if(totalMXN>0) totalTxt+='$'+totalMXN.toLocaleString('en-US',{maximumFractionDigits:0})+' MXN';
  if(totalUSD>0) totalTxt+=(totalTxt?' · ':'')+'$'+totalUSD.toLocaleString('en-US',{maximumFractionDigits:2})+' USD';
  document.getElementById('ivp-total').textContent=totalTxt||'—';

  if(!rows.length){
    tb.innerHTML='<tr><td colspan="9"><div class="es"><span class="ei">🧾</span><br>Sin registros</div></td></tr>';
    return;
  }
  tb.innerHTML=rows.map(r=>{
    const isUSD=r.moneda==='USD';
    const estStyle=IVP_EST_STYLE[r.estatus]||'background:rgba(0,0,0,.055);color:var(--muted)';
    return`<tr>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--red);font-weight:600">${r.clave}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--amber)">${esc(r.entregar_a||'—')}</td>
      <td style="max-width:230px;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:var(--text)" title="${esc(r.nombre)}">${esc(r.nombre||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:12px">$${(r.subtotal||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td><span class="badge" style="${isUSD?'background:rgba(41,128,185,.22);color:#1a6fa8;border:1px solid rgba(41,128,185,.5);font-weight:700':'background:rgba(39,174,96,.22);color:#1f8a4c;border:1px solid rgba(39,174,96,.5);font-weight:700'}">
        ${isUSD?'USD':'MXN'}</span></td>
      <td><span class="badge" style="${estStyle}">${esc(r.estatus||'—')}</span></td>
      <td style="color:var(--muted2);font-size:11px">${r.fecha_recepcion||'—'}</td>
      <td style="color:var(--muted2);font-size:11px;font-weight:${r.fecha_pago?'600':'400'};color:${r.fecha_pago?'var(--gold)':'var(--muted)'}">${r.fecha_pago||'—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${r.doc_anterior||'—'}</td>
    </tr>`;
  }).join('');
}

function ivpUpdateStats(){
  document.getElementById('ivps-tot').textContent =ivpRecords.length;
  document.getElementById('ivps-emit').textContent=ivpRecords.filter(r=>r.estatus==='Emitida').length;
  document.getElementById('ivps-usd').textContent =ivpRecords.filter(r=>r.moneda==='USD').length;
  document.getElementById('ivps-dev').textContent =ivpRecords.filter(r=>r.estatus==='Devuelta').length;
}

document.querySelectorAll('thead th[data-mod="ivp"]').forEach(th=>{
  th.addEventListener('click',()=>{
    const k=th.dataset.k;
    if(sortState.ivp.key===k) sortState.ivp.dir*=-1; else{sortState.ivp.key=k;sortState.ivp.dir=1;}
    document.querySelectorAll('thead th[data-mod="ivp"]').forEach(t=>t.classList.remove('sa','sd'));
    th.classList.add(sortState.ivp.dir===1?'sa':'sd'); ivpRender();
  });
});

function ivpOpenImport(){
  ivpImpFile=null;
  document.getElementById('ivp-imp-file').value='';
  document.getElementById('ivp-imp-fname').textContent='—';
  document.getElementById('ivp-imp-results').style.display='none';
  document.getElementById('btn-ivp-imp-run').disabled=true;
  ivpBuildYearSel();
  document.getElementById('mo-ivp-imp').classList.add('on');
}
function onIvpImpFile(inp){
  if(inp.files.length){ivpImpFile=inp.files[0];document.getElementById('ivp-imp-fname').textContent=ivpImpFile.name;document.getElementById('btn-ivp-imp-run').disabled=false;}
}
function ivpDropImport(e){
  e.preventDefault();document.getElementById('ivp-dz-imp').classList.remove('dg');
  const f=e.dataTransfer.files[0];
  if(f){ivpImpFile=f;document.getElementById('ivp-imp-fname').textContent=f.name;document.getElementById('btn-ivp-imp-run').disabled=false;}
}

async function ivpRunImport(){
  if(!ivpImpFile)return;
  const btn=document.getElementById('btn-ivp-imp-run');
  btn.disabled=true; btn.textContent='Importando…';
  document.getElementById('ivp-imp-results').style.display='none';
  const fd=new FormData();
  fd.append('file',ivpImpFile);
  fd.append('year',document.getElementById('ivp-imp-year').value);
  fd.append('mode',document.getElementById('ivp-imp-mode').value);
  try{
    const r=await fetch('/api/ivp/import',{method:'POST',body:fd});
    const d=await r.json();
    if(d.error){toast(d.error,'er');return;}
    document.getElementById('ivp-imp-chips').innerHTML=
      '<div class="r-chip" style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.25)"><div class="n" style="color:var(--green)">'+d.imported+'</div><div class="l" style="color:var(--green)">Importados</div></div>'+
      '<div class="r-chip" style="background:rgba(200,16,46,.08);border:1px solid rgba(200,16,46,.2)"><div class="n" style="color:var(--red)">'+d.total+'</div><div class="l" style="color:var(--red)">Total tabla</div></div>'+
      '<div class="r-chip" style="background:rgba(0,0,0,.045);border:1px solid var(--border)"><div class="n" style="color:'+(d.errors?.length?'#eb5757':'var(--muted)')+'">'+( d.errors?.length||0)+'</div><div class="l">Errores</div></div>';
    document.getElementById('ivp-imp-errs').innerHTML=(d.errors||[]).map(e=>'<div style="font-size:11px;color:#eb5757;padding:3px 0">✕ Clave '+esc(e.clave)+': '+esc(e.error)+'</div>').join('');
    document.getElementById('ivp-imp-results').style.display='block';
    if(parseInt(document.getElementById('ivp-imp-year').value)===ivpActiveYear) await loadIVP();
    toast(d.imported+' IVPs importadas al '+d.year+' ✓','ok',5000);
  }catch(err){toast('Error: '+err.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

function ivpExportCSV(){ window.open('/api/ivp/export/'+ivpActiveYear,'_blank'); }

// ════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const mods=['mo-jnew','mo-jimp','mo-rnew','mo-rimp','mo-rcopy','mo-qnew','mo-qimp','mo-pt-new','mo-pt-confirm','mo-sv-new','mo-stk-imp','mo-stk-ing','mo-reassign','mo-prov-new','mo-prov-imp','mo-cat-new','mo-cat-imp','mo-cpo-new','mo-cpo-imp','mo-po-imp','mo-wh-imp','mo-ivp-imp','mo-fx-imp','mo-refuse','mo-award'];
    const open=mods.find(m=>document.getElementById(m).classList.contains('on'));
    if(open)closeMo(open); else if(_currentPanel)closePanel();
  }
});

async function init(){
  await loadJobs();
  await loadRates();
  await loadQuotes();
  await loadFX();    // FX loaded before PO so conversion is ready
  await loadPO();
  await loadWH();
  await loadIVP();
  rptInit();
}
init();

// ════════════════════════════════════════════════════════
//  JOB REPORT
// ════════════════════════════════════════════════════════

/* Inject card CSS once */
(function(){
  const s=document.createElement('style');
  s.textContent=`
.rpt-card{border-radius:8px;padding:16px 18px;border:1px solid rgba(0,0,0,.075);display:flex;flex-direction:column;gap:4px}
.rpt-card .rc-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(0,0,0,.55)}
.rpt-card .rc-val{font-family:'DM Mono',monospace;font-size:22px;font-weight:600;color:var(--text);line-height:1}
.rpt-card .rc-sub{font-size:10px;color:rgba(0,0,0,.5);margin-top:2px}
.rpt-card-blue{background:rgba(41,128,185,.18);border-color:rgba(41,128,185,.3)}
.rpt-card-dark{background:rgba(0,0,0,.045);border-color:rgba(0,0,0,.12)}
.rpt-card-gm.pos{background:rgba(39,174,96,.16);border-color:rgba(39,174,96,.35)}
.rpt-card-gm.neg{background:rgba(200,16,46,.14);border-color:rgba(200,16,46,.3)}
.rpt-td{padding:7px 10px;font-size:12px;border-bottom:1px solid rgba(0,0,0,.045);vertical-align:middle}
.rpt-tr:hover td{background:rgba(200,16,46,.07)!important}
.rpt-foot td{padding:8px 10px;font-size:12px;font-weight:700;background:var(--sb);border-top:2px solid var(--red);color:var(--text)}
`;
  document.head.appendChild(s);
})();

let rptCurrentJob = null, rptData = null;

function rptFmtMoney(n){ return n==null?'—':'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function rptFmtHrs(n){   return n==null?'—':Number(n).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'h'; }

function rptInit(){
  // Populate year dropdowns from already-loaded data
  const curY = new Date().getFullYear();

  function buildYearOpts(selId, availYears){
    const all = [...new Set([curY, ...availYears])].sort((a,b)=>b-a);
    const sel = document.getElementById(selId);
    sel.innerHTML = all.map(y=>`<option value="${y}"${y===curY?' selected':''}>${y}</option>`).join('');
  }

  // Rate years
  buildYearOpts('rpt-rate-year', rateAvailYears);
  buildYearOpts('rpt-wh-year',   whAvailYears);
  buildYearOpts('rpt-po-year',   poAvailYears);

  // Populate job selector from loaded jobs
  rptRefreshJobList();
}

function rptRefreshJobList(){
  const sel = document.getElementById('rpt-job-sel');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar Job —</option>' +
    jobs.map(j=>`<option value="${j.job_number}" ${j.job_number===cur?'selected':''}>${j.job_number}${j.customer?' · '+j.customer.substring(0,22):''}</option>`).join('');
  if(cur) sel.value = cur;
}

function rptGetJobNumber(){
  const manual = document.getElementById('rpt-job-input').value.trim();
  const sel    = document.getElementById('rpt-job-sel').value;
  return manual || sel;
}

function rptOnJobSelect(){
  const jn = document.getElementById('rpt-job-sel').value;
  document.getElementById('rpt-job-input').value = '';
  if(jn){
    const j = jobs.find(x=>x.job_number===jn);
    document.getElementById('rpt-customer-display').innerHTML =
      j ? `<span style="color:var(--text);font-weight:600">${esc(j.customer||'—')}</span><span style="color:var(--muted);font-size:10px;margin-left:8px">${esc(j.status||'')}</span>` : '<span style="color:var(--muted)">Cliente: —</span>';
    document.getElementById('btn-rpt-gen').disabled = false;
  } else {
    document.getElementById('rpt-customer-display').innerHTML = '<span style="color:var(--muted)">Cliente: —</span>';
    document.getElementById('btn-rpt-gen').disabled = true;
  }
}

function rptOnManualInput(){
  const jn = document.getElementById('rpt-job-input').value.trim();
  document.getElementById('rpt-job-sel').value = '';
  if(jn){
    // Try to find in loaded jobs for customer auto-fill
    const j = jobs.find(x=>x.job_number===jn);
    document.getElementById('rpt-customer-display').innerHTML = j
      ? `<span style="color:var(--text);font-weight:600">${esc(j.customer||'—')}</span><span style="color:var(--muted);font-size:10px;margin-left:8px">${esc(j.status||'')}</span>`
      : `<span style="color:var(--muted)">Escribe un Job Number registrado</span>`;
    document.getElementById('btn-rpt-gen').disabled = false;
  } else {
    document.getElementById('rpt-customer-display').innerHTML = '<span style="color:var(--muted)">Cliente: —</span>';
    document.getElementById('btn-rpt-gen').disabled = true;
  }
}

async function rptGenerate(){
  const jn = rptGetJobNumber();
  if(!jn){ toast('Selecciona o escribe un Job Number','er'); return; }

  const btn = document.getElementById('btn-rpt-gen');
  btn.disabled = true; btn.textContent = '⚙ Calculando…';
  document.getElementById('rpt-status').textContent = 'Calculando…';
  document.getElementById('rpt-dot').className = 'conn-dot';
  document.getElementById('rpt-empty').style.display = 'flex';
  document.getElementById('rpt-content').style.display = 'none';

  const rateY = document.getElementById('rpt-rate-year').value;
  const whY   = document.getElementById('rpt-wh-year').value;
  const poY   = document.getElementById('rpt-po-year').value;

  try{
    const resp = await fetch(`/api/report/data?job=${encodeURIComponent(jn)}&rate_year=${rateY}&wh_year=${whY}&po_year=${poY}`);
    const d    = await resp.json();
    if(d.error){ toast(d.error,'er'); return; }

    rptData = d;
    rptCurrentJob = jn;
    rptRender(d);
    document.getElementById('btn-rpt-xlsx').disabled = false;
  document.getElementById('btn-rpt-pdf').disabled  = false;
    document.getElementById('rpt-dot').className = 'conn-dot ok';
    document.getElementById('rpt-status').textContent = `Job ${jn} · ${new Date().toLocaleTimeString('es-MX')}`;
  }catch(e){ toast('Error al generar reporte: '+e,'er'); }
  finally{ btn.disabled = false; btn.textContent = '⚙ Generar Reporte'; }
}

// ── Report tab switching
let rptCurrentTab = 'fin';
let mrptCurrentTab = 'fin';
let mrptData = null;

function rptSwitchTab(tab) {
  rptCurrentTab = tab;
  const tabs = {fin:'rpt-tab-fin', op:'rpt-tab-op', com:'rpt-tab-com'};
  Object.entries(tabs).forEach(([k,id])=>{
    const el=document.getElementById(id); if(!el) return;
    el.style.background = k===tab ? 'var(--red)' : 'rgba(0,0,0,.055)';
    el.style.color      = k===tab ? '#fff' : 'var(--muted)';
  });
  if(rptData) {
    if(tab==='fin')      rptRender(rptData);
    else if(tab==='op')  rptRenderOperativo(rptData);
    else if(tab==='com') rptRenderComercial(rptData);
  }
}

function mrptSwitchTab(tab) {
  mrptCurrentTab = tab;
  const tabs = {fin:'mrpt-tab-fin', op:'mrpt-tab-op', com:'mrpt-tab-com'};
  Object.entries(tabs).forEach(([k,id])=>{
    const el=document.getElementById(id); if(!el) return;
    el.style.background = k===tab ? 'var(--red)' : 'rgba(0,0,0,.055)';
    el.style.color      = k===tab ? '#fff' : 'var(--muted)';
  });
  if(mrptData) {
    if(tab==='fin')      mrptRender(mrptData);
    else if(tab==='op')  mrptRenderOperativo(mrptData.jobs);
    else if(tab==='com') mrptRenderComercialMulti(mrptData.jobs);
  }
}

async function rptRenderComercial(d) {
  // Fetch target_compras for this job
  let targetComp = null;
  try {
    const cfgs = await fetch('/api/projconfig').then(r=>r.json());
    for(const cfg of (cfgs.records||[])) {
      const jc = (cfg.jobs||[]).find(j=>(j.job_number||'').trim().toUpperCase()===(rptCurrentJob||'').trim().toUpperCase());
      if(jc && jc.target_compras != null){ targetComp = parseFloat(jc.target_compras); break; }
    }
  }catch(e){}

  const purchasing = d.purchasing_total || 0;
  const ahorro = targetComp !== null ? targetComp - purchasing : null;

  // Render workers + PO tables via rptRender first
  rptRender(d);

  // Override summary cards
  function setCard(id, label, val, sub, extraClass=''){
    const el=document.getElementById(id); if(!el) return;
    el.innerHTML=`<div class="rc-label">${label}</div><div class="rc-val">${val}</div><div class="rc-sub">${sub}</div>`;
    if(extraClass) el.className='rpt-card '+extraClass;
  }
  const fmt = v => rptFmtMoney(v);
  setCard('rpt-card-rev', 'Target Compras',
    targetComp!==null ? fmt(targetComp) : '—',
    targetComp!==null ? d.customer||'—' : '⚠ Configura el proyecto para ver el target',
    'rpt-card-blue');
  setCard('rpt-card-wh',  'Purchase Orders', fmt(purchasing), d.po_items.length+' OC(s)', 'rpt-card-dark');
  setCard('rpt-card-pur', '', '', '', 'rpt-card-dark');
  document.getElementById('rpt-card-pur').style.display='none';
  const ahorroClass = ahorro===null?'rpt-card-gm':ahorro>=0?'rpt-card-gm pos':'rpt-card-gm neg';
  setCard('rpt-card-gm', 'Ahorro Comercial',
    ahorro!==null ? fmt(ahorro) : '—',
    ahorro!==null ? (ahorro>=0?'▲ Dentro del target':'▼ Excedió el target') : 'Sin configuración',
    ahorroClass);
}

async function mrptRenderComercialMulti(reports) {
  // Load target_compras for all jobs
  const targMap = {};
  try {
    const cfgs = await fetch('/api/projconfig').then(r=>r.json());
    (cfgs.records||[]).forEach(cfg=>{
      (cfg.jobs||[]).forEach(j=>{
        const key=(j.job_number||'').trim().toUpperCase();
        if(key && j.target_compras!=null) targMap[key]=parseFloat(j.target_compras);
      });
    });
  }catch(e){}

  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  let totTarg=0, totPur=0, totAhorro=0, configured=0;

  const rows = reports.map(r=>{
    const key=(r.job_number||'').trim().toUpperCase();
    const hasTarg = key in targMap;
    const targ    = hasTarg ? targMap[key] : null;
    const pur     = r.purchasing_total||0;
    const ahorro  = targ!==null ? targ-pur : null;
    totTarg  += targ||0; totPur+=pur;
    totAhorro+= ahorro||0;
    if(hasTarg) configured++;
    return `<tr>
      <td style="padding:6px 8px;font-family:'DM Mono',monospace;color:var(--gold);font-weight:600">${esc(r.job_number)}</td>
      <td style="padding:8px 10px;color:var(--text)">${esc(r.customer||'—')}</td>
      <td style="padding:8px 10px;color:var(--muted2);max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(r.description||'—')}</td>
      <td style="padding:8px 10px;text-align:right;color:${hasTarg?'var(--text)':'var(--muted)'}">
        ${targ!==null?fmt(targ):'—'}</td>
      <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace">${fmt(pur)}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:700;color:${ahorro===null?'var(--muted)':ahorro>=0?'var(--green)':'var(--red)'}">
        ${ahorro!==null?fmt(ahorro):'—'}</td>
    </tr>`;
  }).join('');

  // Update cards
  function mcard(id,label,val,sub,cls=''){
    const el=document.getElementById(id); if(!el) return;
    el.innerHTML=`<div class="rc-label">${label}</div><div class="rc-val">${val}</div><div class="rc-sub">${sub}</div>`;
    if(cls) el.className='rpt-card '+cls;
  }
  mcard('mrpt-card-rev','Target Compras Total',fmt(totTarg),`${configured}/${reports.length} configurados`,'rpt-card-blue');
  mcard('mrpt-card-wh','Purchase Orders Total',fmt(totPur),'','rpt-card-dark');
  mcard('mrpt-card-pur','','','','rpt-card-dark');
  document.getElementById('mrpt-card-pur').style.display='none';
  const ac=totAhorro>=0?'rpt-card-gm pos':'rpt-card-gm neg';
  mcard('mrpt-card-gm','Ahorro Comercial Total',fmt(totAhorro),totAhorro>=0?'▲ Dentro del target':'▼ Excedió el target',ac);

  // Simplified table for Comercial
  document.getElementById('mrpt-tb').innerHTML = rows;
  document.getElementById('mrpt-tfoot').innerHTML=`<tr style="background:rgba(31,56,100,.6);font-weight:700">
    <td colspan="3" style="padding:10px;font-size:11px;color:var(--muted);text-transform:uppercase">TOTAL</td>
    <td style="padding:10px;text-align:right">${fmt(totTarg)}</td>
    <td style="padding:10px;text-align:right">${fmt(totPur)}</td>
    <td style="padding:10px;text-align:right;color:${totAhorro>=0?'var(--green)':'var(--red)'}">${fmt(totAhorro)}</td>
  </tr>`;
  // Update thead for commercial columns
  const th = (txt, color='var(--muted)', align='right') =>
    `<th style="padding:6px 8px;text-align:${align};font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${color};border-bottom:2px solid var(--red);white-space:nowrap">${txt}</th>`;
  document.getElementById('mrpt-thead').innerHTML =
    th('Job','var(--muted)','left') +
    th('Cliente','var(--muted)','left') +
    th('Descripción','var(--muted)','left') +
    th('Target Compras') +
    th('Purchase Orders') +
    th('Ahorro Comercial','var(--green)') +
    th('') + th('') + th('') + th('') + th('') + th('');  // pad to match column count
  document.getElementById('mrpt-empty').style.display='none';
  document.getElementById('mrpt-content').style.display='block';
  document.getElementById('mrpt-status').textContent=`${reports.length} job(s) · Resultado Comercial`;
  document.getElementById('mrpt-dot').style.background='var(--green)';
}


async function rptGetPresupuestoDisponible(jobNumber) {
  try {
    // Fetch ALL configs (no filter) and search for job number inside jobs array
    const d = await fetch('/api/projconfig').then(r=>r.json());
    for(const cfg of (d.records||[])) {
      const jobCfg = (cfg.jobs||[]).find(j =>
        (j.job_number||'').trim().toUpperCase() === (jobNumber||'').trim().toUpperCase()
      );
      if(jobCfg && jobCfg.presupuesto_disponible != null) {
        return parseFloat(jobCfg.presupuesto_disponible);
      }
    }
    return null;
  } catch(e){ return null; }
}

async function rptRenderOperativo(d) {
  // Restore card-pur in case Comercial tab hid it
  const purEl = document.getElementById('rpt-card-pur');
  if(purEl) purEl.style.display = '';

  // Fetch full project config for this job
  let jobCfg = null;
  try {
    const cfgs = await fetch('/api/projconfig').then(r=>r.json());
    for(const cfg of (cfgs.records||[])) {
      const jc = (cfg.jobs||[]).find(j=>
        (j.job_number||'').trim().toUpperCase() === (rptCurrentJob||'').trim().toUpperCase());
      if(jc){ jobCfg = jc; break; }
    }
  } catch(e){}

  const presDisp    = jobCfg?.presupuesto_disponible ?? null;
  const targetComp  = jobCfg?.target_compras ?? null;
  const targetMO    = jobCfg?.target_mo ?? null;
  const base        = presDisp !== null ? presDisp : d.revenue;
  const grossOp     = base - d.amount_wh - d.purchasing_total - (d.reassign_total||0) + (d.recovery_total||0);
  const gmPctOp     = base > 0 ? (grossOp / base * 100) : 0;

  // First render full report (workers + PO tables + cost bar)
  rptRender(d);

  function setCard(id, label, val, sub, extraClass=''){
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = `<div class="rc-label">${label}</div><div class="rc-val">${val}</div><div class="rc-sub">${sub}</div>`;
    if(extraClass) el.className = 'rpt-card ' + extraClass;
  }

  const presLabel = presDisp !== null ? 'Presupuesto Disponible' : '⚠ Sin config. (usando Revenue)';
  setCard('rpt-card-rev', presLabel, rptFmtMoney(base),
    presDisp !== null ? (d.customer||'—') : 'Configura el proyecto para ver el presupuesto',
    'rpt-card-blue');

  const gmClass = grossOp >= 0 ? 'rpt-card-gm pos' : 'rpt-card-gm neg';
  const gmSign  = grossOp >= 0 ? '▲' : '▼';
  setCard('rpt-card-gm', 'Gross Margin Operativo', rptFmtMoney(grossOp),
    `${gmSign} ${gmPctOp.toFixed(1)}%  ·  vs Presupuesto Disponible`, gmClass);

  // Update cost bar relative to presupuesto disponible
  const rev = base || 1;
  const whPct  = Math.min((d.amount_wh / rev)*100, 100);
  const purPct = Math.min((d.purchasing_total / rev)*100, 100 - whPct);
  document.getElementById('rpt-bar-wh').style.width  = whPct.toFixed(1)+'%';
  document.getElementById('rpt-bar-pur').style.left  = whPct.toFixed(1)+'%';
  document.getElementById('rpt-bar-pur').style.width = purPct.toFixed(1)+'%';

  // ── Targets section (remove old one if exists)
  const oldTargets = document.getElementById('rpt-targets-section');
  if(oldTargets) oldTargets.remove();

  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const rptContent = document.getElementById('rpt-content');
  if(!rptContent) return;

  const hasTargets = targetComp !== null || targetMO !== null;
  const divComp = targetComp !== null ? (() => {
    const diff = targetComp - d.purchasing_total;
    const pct  = targetComp > 0 ? (d.purchasing_total/targetComp*100) : 0;
    const ok   = diff >= 0;
    return `
      <div style="flex:1;min-width:220px;background:${ok?'rgba(72,199,142,.08)':'rgba(200,16,46,.08)'};
                  border:1px solid ${ok?'rgba(72,199,142,.3)':'rgba(200,16,46,.3)'};
                  border-radius:8px;padding:14px 16px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;
                    color:var(--muted);margin-bottom:6px">🛒 Target Compras</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-size:10px;color:var(--muted2)">Target</div>
            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:var(--text)">${fmt(targetComp)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:var(--muted2)">Ejercido</div>
            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:var(--text)">${fmt(d.purchasing_total)}</div>
          </div>
        </div>
        <div style="height:6px;background:rgba(0,0,0,.075);border-radius:3px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;width:${Math.min(pct,100).toFixed(1)}%;background:${ok?'var(--green)':'var(--red)'};border-radius:3px;transition:.3s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px">
          <span style="color:${ok?'var(--green)':'var(--red)'};font-weight:700">
            ${ok?'▲ Ahorro: ':'▼ Excedido: '}${fmt(Math.abs(diff))}
          </span>
          <span style="color:var(--muted)">${pct.toFixed(1)}% ejercido</span>
        </div>
      </div>`;
  })() : '';

  const divMO = targetMO !== null ? (() => {
    const diff = targetMO - d.amount_wh;
    const pct  = targetMO > 0 ? (d.amount_wh/targetMO*100) : 0;
    const ok   = diff >= 0;
    return `
      <div style="flex:1;min-width:220px;background:${ok?'rgba(72,199,142,.08)':'rgba(200,16,46,.08)'};
                  border:1px solid ${ok?'rgba(72,199,142,.3)':'rgba(200,16,46,.3)'};
                  border-radius:8px;padding:14px 16px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;
                    color:var(--muted);margin-bottom:6px">⏱ Target Mano de Obra</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-size:10px;color:var(--muted2)">Target</div>
            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:var(--text)">${fmt(targetMO)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:var(--muted2)">Ejercido</div>
            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:var(--text)">${fmt(d.amount_wh)}</div>
          </div>
        </div>
        <div style="height:6px;background:rgba(0,0,0,.075);border-radius:3px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;width:${Math.min(pct,100).toFixed(1)}%;background:${ok?'var(--green)':'var(--red)'};border-radius:3px;transition:.3s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px">
          <span style="color:${ok?'var(--green)':'var(--red)'};font-weight:700">
            ${ok?'▲ Ahorro: ':'▼ Excedido: '}${fmt(Math.abs(diff))}
          </span>
          <span style="color:var(--muted)">${pct.toFixed(1)}% ejercido</span>
        </div>
      </div>`;
  })() : '';

  const targetsHtml = hasTargets ? `
    <div id="rpt-targets-section" style="margin-top:16px">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;
                  color:var(--red);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">
        🎯 Targets vs Ejercido
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${divComp}${divMO}
      </div>
    </div>` : `
    <div id="rpt-targets-section" style="margin-top:12px;padding:10px 14px;
        background:rgba(0,0,0,.035);border:1px dashed var(--border);border-radius:8px;
        font-size:11px;color:var(--muted);text-align:center">
      ⚠ Sin targets configurados para este Job — ve a Proyectos → Configurar Proyecto
    </div>`;

  rptContent.insertAdjacentHTML('beforeend', targetsHtml);
}

async function mrptRenderOperativo(reports) {
  mrptRestoreLayout();
  // Load presupuesto disponible for all jobs — case-insensitive, trimmed
  const presMap = {}; // key: job_number.toUpperCase().trim() → presupuesto_disponible
  try {
    const cfgResp = await fetch('/api/projconfig').then(r=>r.json());
    (cfgResp.records||[]).forEach(cfg => {
      (cfg.jobs||[]).forEach(j => {
        const key = (j.job_number||'').trim().toUpperCase();
        if(key && j.presupuesto_disponible != null) {
          presMap[key] = parseFloat(j.presupuesto_disponible);
        }
      });
    });
  } catch(e){}

  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  let totBase=0, totWH=0, totPur=0, totGM=0, totReas=0, totRecov=0, totSvc=0, totConfigured=0;

  const rows = reports.map(r => {
    const key    = (r.job_number||'').trim().toUpperCase();
    const hasPresp = key in presMap;
    const base   = hasPresp ? presMap[key] : r.revenue;
    const svc    = r.svc_total||0;
    const grossOp = base - r.amount_wh - r.purchasing_total - (r.reassign_total||0) + (r.recovery_total||0) - svc;
    const gmPct  = base > 0 ? (grossOp/base*100) : 0;
    totBase  += base; totWH += r.amount_wh; totPur += r.purchasing_total;
    totReas  += r.reassign_total||0; totRecov += r.recovery_total||0;
    totSvc   += svc; totGM += grossOp;
    if(hasPresp) totConfigured++;
    return `<tr>
      <td style="padding:6px 8px;font-family:'DM Mono',monospace;color:var(--gold);font-weight:600">${esc(r.job_number)}</td>
      <td style="padding:8px 10px;color:var(--text)">${esc(r.customer||'—')}</td>
      <td style="padding:8px 10px;color:var(--muted2);max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(r.description||'—')}</td>
      <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;color:${hasPresp?'var(--gold)':'var(--muted)'}">
        ${hasPresp?fmt(base):'<span title="Sin configuración — usando Revenue">~'+fmt(base)+'</span>'}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--amber)">${rptFmtHrs(r.accum_hours)}</td>
      <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace">${fmt(r.amount_wh)}</td>
      <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace">${fmt(r.purchasing_total)}</td>
      ${svc>0?`<td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;color:var(--amber)">${fmt(svc)}</td>`:'<td style="padding:8px 10px;text-align:right;color:var(--muted)">—</td>'}
      <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;color:var(--red)">${fmt(r.reassign_total||0)}</td>
      <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;color:var(--green)">${fmt(r.recovery_total||0)}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:600;color:${grossOp>=0?'var(--green)':'var(--red)'}">${fmt(grossOp)}</td>
      <td style="padding:8px 10px;text-align:right;color:${gmPct>=0?'var(--green)':'var(--red)'}">${gmPct.toFixed(1)}%</td>
    </tr>`;
  }).join('');

  const totGMop  = totBase - totWH - totPur - totReas + totRecov - totSvc;
  const totGMpct = totBase > 0 ? (totGMop/totBase*100) : 0;

  function mcard(id, label, val, sub, extraClass=''){
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = `<div class="rc-label">${label}</div><div class="rc-val">${val}</div><div class="rc-sub">${sub}</div>`;
    if(extraClass) el.className = 'rpt-card '+extraClass;
  }

  const configNote = totConfigured < reports.length
    ? `${totConfigured}/${reports.length} con presupuesto · resto usa Revenue`
    : `${reports.length} jobs con presupuesto configurado`;

  mcard('mrpt-card-rev', 'Presupuesto Disponible', fmt(totBase), configNote, 'rpt-card-blue');
  mcard('mrpt-card-wh',  'Work Hours Total', fmt(totWH), '', 'rpt-card-dark');
  mcard('mrpt-card-pur', totSvc>0?'Purchasings + Servicios':'Purchasings Total',
    fmt(totPur + totSvc),
    totSvc>0 ? `OCs: ${fmt(totPur)} · Svc: ${fmt(totSvc)}` : '', 'rpt-card-dark');
  const gmClass = totGMop>=0 ? 'rpt-card-gm pos' : 'rpt-card-gm neg';
  mcard('mrpt-card-gm', 'Gross Margin Operativo', fmt(totGMop),
    `${totGMop>=0?'▲':'▼'} ${totGMpct.toFixed(1)}%`, gmClass);

  document.getElementById('mrpt-tb').innerHTML = rows;
  document.getElementById('mrpt-tfoot').innerHTML = `<tr style="background:rgba(31,56,100,.6);font-weight:700">
    <td colspan="3" style="padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">TOTAL</td>
    <td style="padding:10px;text-align:right;color:var(--gold)">${fmt(totBase)}</td>
    <td colspan="1"></td>
    <td style="padding:10px;text-align:right">${fmt(totWH)}</td>
    <td style="padding:10px;text-align:right">${fmt(totPur)}</td>
    <td style="padding:10px;text-align:right;color:var(--amber)">${totSvc>0?fmt(totSvc):'—'}</td>
    <td style="padding:10px;text-align:right;color:var(--red)">${fmt(totReas)}</td>
    <td style="padding:10px;text-align:right;color:var(--green)">${fmt(totRecov)}</td>
    <td style="padding:10px;text-align:right;color:${totGMop>=0?'var(--green)':'var(--red)'}">${fmt(totGMop)}</td>
    <td style="padding:10px;text-align:right;color:${totGMop>=0?'var(--green)':'var(--red)'}">${totGMpct.toFixed(1)}%</td>
  </tr>`;
  // Show content
  document.getElementById('mrpt-empty').style.display='none';
  document.getElementById('mrpt-content').style.display='block';
  document.getElementById('mrpt-status').textContent = `${reports.length} job(s) · Resultado Operativo`;
  document.getElementById('mrpt-dot').style.background='var(--green)';
}


function rptRender(d){
  // Restore card-pur in case Comercial tab hid it
  const purEl = document.getElementById('rpt-card-pur');
  if(purEl) purEl.style.display = '';
  // ── Summary cards ─────────────────────────────────────────────
  function card(id, label, val, sub, extraClass=''){
    const el = document.getElementById(id);
    el.innerHTML = `<div class="rc-label">${label}</div><div class="rc-val">${val}</div><div class="rc-sub">${sub}</div>`;
    if(extraClass) el.className = 'rpt-card ' + extraClass;
  }

  card('rpt-card-rev', 'Revenue',
    rptFmtMoney(d.revenue), d.customer||'—', 'rpt-card-blue');

  card('rpt-card-wh', 'Work Hours Cost',
    rptFmtMoney(d.amount_wh),
    rptFmtHrs(d.accum_hours)+' acumuladas · '+d.workers.length+' empleado(s)', 'rpt-card-dark');

  card('rpt-card-pur', 'Purchasings Total',
    rptFmtMoney(d.purchasing_total),
    d.po_items.length+' OC(s) encontradas', 'rpt-card-dark');

  // Servicios card (always rendered, next to GM or standalone)
  const svcTotal = (d.svc_total||0);
  let svcCard = document.getElementById('rpt-card-svc');
  if(!svcCard) {
    svcCard = document.createElement('div');
    svcCard.id = 'rpt-card-svc';
    svcCard.className = 'rpt-card rpt-card-dark';
    const gmEl = document.getElementById('rpt-card-gm');
    if(gmEl) gmEl.parentNode.insertBefore(svcCard, gmEl);
  }
  if(svcTotal > 0) {
    svcCard.style.display='';
    svcCard.innerHTML = `
      <div class="rc-label">Servicios</div>
      <div class="rc-val">${rptFmtMoney(svcTotal)}</div>
      <div class="rc-sub">
        💵 Viáticos: ${rptFmtMoney(d.svc_viaticos||0)}<br>
        ✈ Viajes: ${rptFmtMoney(d.svc_gastos||0)}<br>
        📦 Envíos: ${rptFmtMoney(d.svc_envios||0)}
      </div>`;
  } else {
    svcCard.style.display='none';
  }

  const gmClass = d.gross_margin >= 0 ? 'rpt-card-gm pos' : 'rpt-card-gm neg';
  const gmSign  = d.gross_margin >= 0 ? '▲' : '▼';
  card('rpt-card-gm', 'Gross Margin',
    rptFmtMoney(d.gross_margin),
    `${gmSign} ${d.gm_pct.toFixed(1)}%  ·  Cost: ${rptFmtMoney(d.cost)}`, gmClass);

  // ── Cost bar ──────────────────────────────────────────────────
  const rev = d.revenue || 1;
  const whPct  = Math.min((d.amount_wh / rev)*100, 100);
  const purPct = Math.min((d.purchasing_total / rev)*100, 100 - whPct);
  document.getElementById('rpt-bar-wh').style.width  = whPct.toFixed(1)+'%';
  document.getElementById('rpt-bar-pur').style.left  = whPct.toFixed(1)+'%';
  document.getElementById('rpt-bar-pur').style.width = purPct.toFixed(1)+'%';

  // ── Workers table ─────────────────────────────────────────────
  const wtb = document.getElementById('rpt-workers-tb');
  if(d.workers.length){
    wtb.innerHTML = d.workers.map((w,i)=>`
      <tr class="rpt-tr" style="${i%2?'background:rgba(0,0,0,.03)':''}">
        <td class="rpt-td" style="color:var(--text);font-size:11px">${esc(w.employee)}</td>
        <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace;color:var(--amber)">${rptFmtHrs(w.hours)}</td>
        <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace;color:var(--muted2)">${w.rate?'$'+w.rate.toFixed(2):'N/A'}</td>
        <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace;color:var(--green)">${rptFmtMoney(w.amount)}</td>
      </tr>`).join('');
  } else {
    wtb.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--muted);font-size:12px">Sin horas registradas para este Job en el año ${d.wh_year}</td></tr>`;
  }
  document.getElementById('rpt-workers-foot').innerHTML = d.workers.length ? `
    <tr class="rpt-foot">
      <td colspan="2">TOTAL</td>
      <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace;color:var(--amber)">${rptFmtHrs(d.accum_hours)}</td>
      <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace;color:var(--green)">${rptFmtMoney(d.amount_wh)}</td>
    </tr>` : '';

  // ── PO table ──────────────────────────────────────────────────
  const ptb = document.getElementById('rpt-po-tb');
  if(d.po_items.length){
    ptb.innerHTML = d.po_items.map((p,i)=>{
      const isUSD = p.moneda==='USD';
      const usdVal = p.subtotal_usd != null ? p.subtotal_usd : p.subtotal;
      return `<tr class="rpt-tr" style="${i%2?'background:rgba(0,0,0,.03)':''}">
        <td class="rpt-td" style="font-family:'DM Mono',monospace;color:var(--red);font-size:11px">${p.clave}</td>
        <td class="rpt-td" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;color:var(--text);font-size:11px" title="${esc(p.nombre)}">${esc(p.nombre)}</td>
        <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${rptFmtMoney(usdVal)}</td>
        <td class="rpt-td" style="text-align:center;font-size:9px;color:var(--muted2)">${isUSD?'USD':'MXN→USD'}</td>
      </tr>`;
    }).join('');
  } else {
    ptb.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--muted);font-size:12px">Sin Purchase Orders para este Job en el año ${d.po_year}</td></tr>`;
  }
  document.getElementById('rpt-po-foot').innerHTML = d.po_items.length ? `
    <tr class="rpt-foot">
      <td colspan="2">TOTAL (USD)</td>
      <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${rptFmtMoney(d.purchasing_total)}</td>
      <td></td>
    </tr>` : '';

  // ── Reasignaciones ──────────────────────────────────────────
  const raSection = document.getElementById('rpt-reassign-section');
  const raTb      = document.getElementById('rpt-reassign-tb');
  if(raSection && raTb){
    if(d.reassign_items && d.reassign_items.length){
      raSection.style.display='';
      raTb.innerHTML = d.reassign_items.map((i,idx)=>`
        <tr class="rpt-tr" style="${idx%2?'background:rgba(0,0,0,.03)':''}">
          <td class="rpt-td" style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(i.order_number||'')}</td>
          <td class="rpt-td" style="font-family:'DM Mono',monospace;color:var(--text);font-size:11px">${esc(i.part_number||'')}</td>
          <td class="rpt-td" style="color:var(--text);font-size:11px">${esc(i.manufacturer||'')}</td>
          <td class="rpt-td" style="color:var(--muted2);font-size:11px">${esc(i.description||'')}</td>
          <td class="rpt-td" style="text-align:right">${i.quantity||0}</td>
          <td class="rpt-td" style="text-align:right;color:var(--muted2)">${rptFmtMoney(i.unit_cost)}</td>
          <td class="rpt-td" style="text-align:right;font-weight:700;color:var(--red)">${rptFmtMoney(i.total_cost)}</td>
        </tr>`).join('');
      document.getElementById('rpt-reassign-foot').innerHTML=`
        <tr class="rpt-foot">
          <td colspan="6">TOTAL REASIGNACIONES</td>
          <td class="rpt-td" style="text-align:right;color:var(--red)">${rptFmtMoney(d.reassign_total)}</td>
        </tr>`;
    } else {
      raSection.style.display='';
      raTb.innerHTML=`<tr><td colspan="7" style="padding:14px;text-align:center;color:var(--muted);font-size:12px">Sin reasignaciones para este Job</td></tr>`;
      document.getElementById('rpt-reassign-foot').innerHTML='';
    }
  }

  // ── Recuperaciones ───────────────────────────────────────────
  const rcSection = document.getElementById('rpt-recovery-section');
  const rcTb      = document.getElementById('rpt-recovery-tb');
  if(rcSection && rcTb){
    if(d.recovery_items && d.recovery_items.length){
      rcSection.style.display='';
      rcTb.innerHTML = d.recovery_items.map((i,idx)=>`
        <tr class="rpt-tr" style="${idx%2?'background:rgba(0,0,0,.03)':''}">
          <td class="rpt-td" style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(i.part_number||'')}</td>
          <td class="rpt-td" style="color:var(--text);font-size:11px">${esc(i.manufacturer||'')}</td>
          <td class="rpt-td" style="color:var(--muted2);font-size:11px">${esc(i.description||'')}</td>
          <td class="rpt-td" style="text-align:right">${i.quantity||0}</td>
          <td class="rpt-td" style="text-align:right;color:var(--muted2)">${rptFmtMoney(i.last_cost)}</td>
          <td class="rpt-td" style="text-align:right;font-weight:700;color:var(--green)">${rptFmtMoney(Math.abs(i.total_value||0))}</td>
        </tr>`).join('');
      document.getElementById('rpt-recovery-foot').innerHTML=`
        <tr class="rpt-foot">
          <td colspan="5">TOTAL RECUPERACIONES</td>
          <td class="rpt-td" style="text-align:right;color:var(--green)">+${rptFmtMoney(Math.abs(d.recovery_total||0))}</td>
        </tr>`;
    } else {
      rcSection.style.display='none';
    }
  }

  // ── Servicios — Viáticos / Gastos de Viaje / Envíos ─────────
  const svcData = {
    viaticos: d.svc_viaticos_items || [],
    gastos:   d.svc_gastos_items   || [],
    envios:   d.svc_envios_items   || [],
  };
  const hasSvc = (d.svc_total||0) > 0;

  // Remove old svc section if exists
  document.getElementById('rpt-svc-section')?.remove();

  if(hasSvc) {
    const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
    const rcSection = document.getElementById('rpt-recovery-section');
    const insertAfter = rcSection || document.getElementById('rpt-reassign-section');
    const svcDiv = document.createElement('div');
    svcDiv.id = 'rpt-svc-section';
    svcDiv.style.cssText = 'margin-top:20px';

    const viaRows = (d.svc_viaticos_items||[]).map((r,i)=>`
      <tr class="rpt-tr" style="${i%2?'background:rgba(0,0,0,.03)':''}">
        <td class="rpt-td" style="color:var(--muted2);font-size:11px">${r.fecha||'—'}</td>
        <td class="rpt-td" style="font-size:11px;color:var(--muted)">${esc(r.id_externo||'—')}</td>
        <td class="rpt-td">${esc(r.tipo_movimiento||'—')}</td>
        <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace">${fmt(r.monto)}</td>
        <td class="rpt-td" style="text-align:right;font-size:10px;color:var(--muted2)">${(r.tipo_cambio||0).toFixed(4)}</td>
        <td class="rpt-td" style="text-align:right;font-weight:700;color:var(--gold)">${fmt(r.valor_usd)}</td>
      </tr>`).join('') || `<tr><td colspan="6" style="padding:14px;text-align:center;color:var(--muted);font-size:12px">Sin viáticos registrados</td></tr>`;

    const gvRows = (d.svc_gastos_items||[]).map((r,i)=>`
      <tr class="rpt-tr" style="${i%2?'background:rgba(0,0,0,.03)':''}">
        <td class="rpt-td" style="color:var(--muted2);font-size:11px">${r.fecha||'—'}</td>
        <td class="rpt-td"><span style="font-size:10px;background:rgba(0,0,0,.065);padding:2px 8px;border-radius:4px">${esc(r.tipo_gasto||'—')}</span></td>
        <td class="rpt-td" style="font-size:11px;color:var(--muted2)">${r.moneda||'USD'}</td>
        <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace">${fmt(r.costo)}</td>
        <td class="rpt-td" style="text-align:right;font-weight:700;color:var(--gold)">${fmt(r.valor_usd)}</td>
      </tr>`).join('') || `<tr><td colspan="5" style="padding:14px;text-align:center;color:var(--muted);font-size:12px">Sin gastos de viaje registrados</td></tr>`;

    const envRows = (d.svc_envios_items||[]).map((r,i)=>`
      <tr class="rpt-tr" style="${i%2?'background:rgba(0,0,0,.03)':''}">
        <td class="rpt-td" style="color:var(--muted2);font-size:11px">${r.fecha||'—'}</td>
        <td class="rpt-td" style="font-family:'DM Mono',monospace;font-size:11px">${esc(r.tracking||'—')}</td>
        <td class="rpt-td" style="font-size:11px;color:var(--muted2)">${r.moneda||'USD'}</td>
        <td class="rpt-td" style="text-align:right;font-family:'DM Mono',monospace">${fmt(r.costo)}</td>
        <td class="rpt-td" style="text-align:right;font-weight:700;color:var(--gold)">${fmt(r.valor_usd)}</td>
        <td class="rpt-td" style="text-align:center">${r.pod_file
          ? `<a href="/api/envios/${r.id}/pod/view" target="_blank" style="font-size:10px;color:var(--green)">📎 POD</a>`
          : '<span style="color:var(--muted);font-size:10px">—</span>'}</td>
      </tr>`).join('') || `<tr><td colspan="6" style="padding:14px;text-align:center;color:var(--muted);font-size:12px">Sin envíos registrados</td></tr>`;

    svcDiv.innerHTML = `
      <!-- Viáticos -->
      <div style="margin-bottom:16px">
        <div class="rpt-section-title" style="color:var(--amber)">💵 VIÁTICOS</div>
        <table class="rpt-tbl">
          <thead><tr>
            <th class="rpt-th">Fecha</th><th class="rpt-th">ID</th><th class="rpt-th">Tipo</th>
            <th class="rpt-th" style="text-align:right">Monto (MXN)</th>
            <th class="rpt-th" style="text-align:right">T.C.</th>
            <th class="rpt-th" style="text-align:right">Valor USD</th>
          </tr></thead>
          <tbody>${viaRows}</tbody>
          ${(d.svc_viaticos||0)>0?`<tfoot><tr class="rpt-foot"><td colspan="5">TOTAL VIÁTICOS</td>
            <td class="rpt-td" style="text-align:right;color:var(--amber)">${fmt(d.svc_viaticos)}</td></tr></tfoot>`:''}
        </table>
      </div>
      <!-- Gastos de Viaje -->
      <div style="margin-bottom:16px">
        <div class="rpt-section-title" style="color:var(--amber)">✈ GASTOS DE VIAJE</div>
        <table class="rpt-tbl">
          <thead><tr>
            <th class="rpt-th">Fecha</th><th class="rpt-th">Tipo de Gasto</th><th class="rpt-th">Moneda</th>
            <th class="rpt-th" style="text-align:right">Costo</th>
            <th class="rpt-th" style="text-align:right">Valor USD</th>
          </tr></thead>
          <tbody>${gvRows}</tbody>
          ${(d.svc_gastos||0)>0?`<tfoot><tr class="rpt-foot"><td colspan="4">TOTAL GASTOS DE VIAJE</td>
            <td class="rpt-td" style="text-align:right;color:var(--amber)">${fmt(d.svc_gastos)}</td></tr></tfoot>`:''}
        </table>
      </div>
      <!-- Envíos -->
      <div>
        <div class="rpt-section-title" style="color:var(--amber)">📦 ENVÍOS DE MENSAJERÍA</div>
        <table class="rpt-tbl">
          <thead><tr>
            <th class="rpt-th">Fecha</th><th class="rpt-th">Tracking</th><th class="rpt-th">Moneda</th>
            <th class="rpt-th" style="text-align:right">Costo</th>
            <th class="rpt-th" style="text-align:right">Valor USD</th>
            <th class="rpt-th" style="text-align:center">POD</th>
          </tr></thead>
          <tbody>${envRows}</tbody>
          ${(d.svc_envios||0)>0?`<tfoot><tr class="rpt-foot"><td colspan="4">TOTAL ENVÍOS</td>
            <td class="rpt-td" style="text-align:right;color:var(--amber)">${fmt(d.svc_envios)}</td><td></td></tr></tfoot>`:''}
        </table>
      </div>`;

    if(insertAfter && insertAfter.parentNode)
      insertAfter.parentNode.insertBefore(svcDiv, insertAfter.nextSibling);
  }

  // ── Warnings ──────────────────────────────────────────────────
  const warns = [];
  if(d.workers.length > 0 && d.workers.some(w=>w.rate===0))
    warns.push(`⚠ Algunos empleados no tienen tarifa en Hourly Rates ${d.rate_year}. Su monto aparece como $0.`);
  if(d.wh_matches === 0)
    warns.push(`ℹ No se encontraron registros de Work Hours para "${rptCurrentJob}" en el año ${d.wh_year}.`);
  if(d.po_matches === 0)
    warns.push(`ℹ No se encontraron Purchase Orders con destino "${rptCurrentJob}" en el año ${d.po_year}.`);
  if(d.revenue === 0)
    warns.push(`ℹ El Job no tiene Revenue registrado. El Gross Margin no se puede calcular correctamente.`);

  const warnEl = document.getElementById('rpt-warn');
  if(warns.length){ warnEl.innerHTML = warns.join('<br>'); warnEl.style.display='block'; }
  else warnEl.style.display='none';

  // Show content
  document.getElementById('rpt-empty').style.display = 'none';
  document.getElementById('rpt-content').style.display = 'block';
}

function rptExportXLSX(){
  if(!rptCurrentJob){ toast('Genera el reporte primero','er'); return; }
  const rateY = document.getElementById('rpt-rate-year').value;
  const whY   = document.getElementById('rpt-wh-year').value;
  const poY   = document.getElementById('rpt-po-year').value;
  window.open(`/api/report/export-excel?job=${encodeURIComponent(rptCurrentJob)}&rate_year=${rateY}&wh_year=${whY}&po_year=${poY}`, '_blank');
}

// ════════════════════════════════════════════════════════
//  FX / TIPO DE CAMBIO
// ════════════════════════════════════════════════════════
let fxRecords=[], fxActiveYear=new Date().getFullYear(), fxAvailYears=[], fxImpFile=null;
sortState.fx={key:'date',dir:-1};
const DAYS_ES=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

async function loadFX(){
  if(document.getElementById('fx-tb'))
    document.getElementById('fx-tb').innerHTML='<tr><td colspan="4"><div class="es"><div class="spinner"></div></div></td></tr>';
  try{
    const ping=await(await fetch('/api/ping')).json();
    const ok=ping.fx_ok;
    if(document.getElementById('fx-dot')){
      document.getElementById('fx-dot').className='conn-dot'+(ok?' ok':'');
      document.getElementById('fx-lbl').textContent=ok?'NAS OK':'NAS sin acceso';
      document.getElementById('fx-path').textContent=ping.fx_folder||'—';
    }
    document.getElementById('dot-fx').className='conn-dot'+(ok?' ok':'');
    const d=await(await fetch('/api/fx?year='+fxActiveYear)).json();
    fxRecords=d.records||[];
    fxAvailYears=d.available_years||[];
    fxBuildYearSel();
    fxRender();
    fxUpdateStats();
    // Today's rate
    const today=new Date().toISOString().split('T')[0];
    const todayRec=fxRecords.find(r=>r.date===today)||fxRecords[fxRecords.length-1];
    if(todayRec && document.getElementById('fx-today-rate'))
      document.getElementById('fx-today-rate').textContent='$'+todayRec.rate.toFixed(4)+' MXN'+(todayRec.date!==today?' ('+todayRec.date+')':'');
  }catch(e){toast('Error al cargar FX: '+e,'er');}
}

function fxBuildYearSel(){
  const curY=new Date().getFullYear();
  const all=[...new Set([fxActiveYear,...fxAvailYears,curY])].sort((a,b)=>b-a);
  const sel=document.getElementById('fx-year-sel');
  if(sel) sel.innerHTML=all.map(y=>'<option value="'+y+'"'+(y===fxActiveYear?' selected':'')+'>'+y+'</option>').join('');
  if(document.getElementById('fx-tb-year')) document.getElementById('fx-tb-year').textContent=fxActiveYear;
}
function fxSwitchYear(){ fxActiveYear=parseInt(document.getElementById('fx-year-sel').value); loadFX(); }

function fxFiltered(){
  const from=document.getElementById('fxf-from').value;
  const to  =document.getElementById('fxf-to').value;
  const gs  =(document.getElementById('fxf-gs').value||'').toLowerCase()||(document.getElementById('fx-gs2').value||'').toLowerCase();
  return [...fxRecords].filter(r=>{
    if(from && r.date<from) return false;
    if(to   && r.date>to)   return false;
    if(gs   && !r.date.includes(gs)) return false;
    return true;
  }).sort((a,b)=>sortState.fx.key==='rate'?sortState.fx.dir*(a.rate-b.rate):sortState.fx.dir*a.date.localeCompare(b.date));
}

function fxRender(){
  const rows=fxFiltered();
  const tb=document.getElementById('fx-tb');
  if(!tb) return;
  if(!rows.length){tb.innerHTML='<tr><td colspan="4"><div class="es"><span class="ei">💱</span><br>Sin registros — carga el archivo del Banco de México</div></td></tr>';return;}
  const byDate={};
  for(const r of fxRecords) byDate[r.date]=r.rate;
  const sortedDates=Object.keys(byDate).sort();
  tb.innerHTML=rows.map((r,i)=>{
    const d=new Date(r.date+'T12:00:00');
    const dayName=DAYS_ES[d.getDay()];
    const isWknd=d.getDay()===0||d.getDay()===6;
    const idx=sortedDates.indexOf(r.date);
    const prevRate=idx>0?byDate[sortedDates[idx-1]]:null;
    let deltaHtml='—';
    if(prevRate!=null){
      const delta=r.rate-prevRate;
      const pct=(delta/prevRate*100);
      if(Math.abs(delta)<0.0001) deltaHtml='<span style="color:var(--muted)">Sin cambio</span>';
      else{
        const clr=delta>0?'#e74c3c':'var(--green)';
        deltaHtml=`<span style="color:${clr}">${delta>0?'▲':'▼'} ${Math.abs(delta).toFixed(4)} (${Math.abs(pct).toFixed(3)}%)</span>`;
      }
    }
    return`<tr style="${isWknd?'opacity:.5':''}${i%2?'background:rgba(0,0,0,.025)':''}">
      <td style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:${isWknd?'var(--muted)':'var(--text)'}">${r.date}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:var(--gold)">${r.rate.toFixed(4)}</td>
      <td style="color:var(--muted2);font-size:11px">${dayName}</td>
      <td style="text-align:right;font-size:12px">${deltaHtml}</td>
    </tr>`;
  }).join('');
}

function fxUpdateStats(){
  if(!fxRecords.length){['fxs-tot','fxs-avg','fxs-min','fxs-max'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='—';});return;}
  const rates=fxRecords.map(r=>r.rate);
  const avg=rates.reduce((a,b)=>a+b,0)/rates.length;
  if(document.getElementById('fxs-tot')) document.getElementById('fxs-tot').textContent=fxRecords.length;
  if(document.getElementById('fxs-avg')) document.getElementById('fxs-avg').textContent=avg.toFixed(4);
  if(document.getElementById('fxs-min')) document.getElementById('fxs-min').textContent=Math.min(...rates).toFixed(4);
  if(document.getElementById('fxs-max')) document.getElementById('fxs-max').textContent=Math.max(...rates).toFixed(4);
}

document.querySelectorAll('thead th[data-mod="fx"]').forEach(th=>{
  th.addEventListener('click',()=>{
    const k=th.dataset.k;
    if(sortState.fx.key===k) sortState.fx.dir*=-1; else{sortState.fx.key=k;sortState.fx.dir=1;}
    document.querySelectorAll('thead th[data-mod="fx"]').forEach(t=>t.classList.remove('sa','sd'));
    th.classList.add(sortState.fx.dir===1?'sa':'sd'); fxRender();
  });
});

['fxf-gs','fx-gs2'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',fxRender);});

async function fxFetchBanxico() {
  const btn = document.querySelector('button[onclick="fxFetchBanxico()"]');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Consultando Banxico…'; }
  try {
    const d = await fetch('/api/fx/banxico', {method:'POST'}).then(r=>r.json());
    if(d.error){
      toast(`Banxico: ${d.error}`, 'er', 6000);
      return;
    }
    toast(`✓ Tipo de cambio registrado: ${d.fecha} → $${d.rate.toFixed(4)} MXN/USD`, 'ok', 6000);
    await loadFX();
  } catch(e){
    toast('Error conectando a Banxico: ' + e.message, 'er');
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='🏦 Importar desde Banxico'; }
  }
}

function fxOpenImport(){
  fxImpFile=null;
  document.getElementById('fx-imp-file').value='';
  document.getElementById('fx-imp-fname').textContent='—';
  document.getElementById('fx-imp-results').style.display='none';
  document.getElementById('btn-fx-imp-run').disabled=true;
  document.getElementById('mo-fx-imp').classList.add('on');
}
function onFxImpFile(inp){
  if(inp.files.length){fxImpFile=inp.files[0];document.getElementById('fx-imp-fname').textContent=fxImpFile.name;document.getElementById('btn-fx-imp-run').disabled=false;}
}
function fxDropImport(e){
  e.preventDefault();document.getElementById('fx-dz-imp').classList.remove('dg');
  const f=e.dataTransfer.files[0];
  if(f){fxImpFile=f;document.getElementById('fx-imp-fname').textContent=f.name;document.getElementById('btn-fx-imp-run').disabled=false;}
}
async function fxRunImport(){
  if(!fxImpFile)return;
  const btn=document.getElementById('btn-fx-imp-run');
  btn.disabled=true; btn.textContent='Importando…';
  document.getElementById('fx-imp-results').style.display='none';
  const fd=new FormData();
  fd.append('file',fxImpFile);
  fd.append('mode',document.getElementById('fx-imp-mode').value);
  try{
    const r=await fetch('/api/fx/import',{method:'POST',body:fd});
    const d=await r.json();
    if(d.error){toast(d.error,'er');return;}
    document.getElementById('fx-imp-chips').innerHTML=
      '<div class="r-chip" style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.25)"><div class="n" style="color:var(--green)">'+d.imported+'</div><div class="l" style="color:var(--green)">Importados</div></div>'+
      '<div class="r-chip" style="background:rgba(0,0,0,.045);border:1px solid var(--border)"><div class="n" style="color:var(--muted)">'+d.skipped+'</div><div class="l">N/E omitidos</div></div>'+
      '<div class="r-chip" style="background:rgba(41,128,185,.18);border:1px solid rgba(41,128,185,.5)"><div class="n" style="color:#1a6fa8;font-weight:700">'+d.total_saved+'</div><div class="l" style="color:#1a6fa8">Total guardado</div></div>';
    document.getElementById('fx-imp-detail').textContent='Años procesados: '+(d.years||[]).join(', ');
    document.getElementById('fx-imp-results').style.display='block';
    if((d.years||[]).includes(fxActiveYear)) await loadFX();
    await loadPO();   // Reload PO with new FX rates
    toast(d.imported+' tipos de cambio importados — años: '+(d.years||[]).join(', '),'ok',6000);
  }catch(err){toast('Error: '+err.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

// ── Quote Import Excel ──────────────────────────────────────────
let qImpFile = null;
function quoteOpenImport(){
  qImpFile=null;
  document.getElementById('qimp-file').value='';
  document.getElementById('qimp-fname').textContent='—';
  document.getElementById('qimp-results').style.display='none';
  document.getElementById('btn-qimp-run').disabled=true;
  document.getElementById('mo-qimp').classList.add('on');
}
function onQimpFile(inp){
  if(inp.files.length){
    qImpFile=inp.files[0];
    document.getElementById('qimp-fname').textContent=qImpFile.name;
    document.getElementById('btn-qimp-run').disabled=false;
  }
}
function qDropImport(e){
  e.preventDefault();
  document.getElementById('qdz-imp').classList.remove('dg');
  const f=e.dataTransfer.files[0];
  if(f){qImpFile=f;document.getElementById('qimp-fname').textContent=f.name;document.getElementById('btn-qimp-run').disabled=false;}
}
async function quoteRunImport(){
  if(!qImpFile)return;
  const btn=document.getElementById('btn-qimp-run');
  btn.disabled=true;btn.textContent='Importando…';
  document.getElementById('qimp-results').style.display='none';
  const fd=new FormData();
  fd.append('file',qImpFile);
  fd.append('mode',document.getElementById('qimp-mode').value);
  try{
    const r=await fetch('/api/quotes/import',{method:'POST',body:fd});
    const d=await r.json();
    if(d.error){toast(d.error,'er');return;}
    document.getElementById('qimp-chips').innerHTML=
      '<div class="r-chip" style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.25)"><div class="n" style="color:var(--green)">'+d.imported+'</div><div class="l" style="color:var(--green)">Importados</div></div>'+
      '<div class="r-chip" style="background:rgba(200,16,46,.08);border:1px solid rgba(200,16,46,.2)"><div class="n" style="color:var(--red)">'+d.total+'</div><div class="l" style="color:var(--red)">Total registros</div></div>'+
      '<div class="r-chip" style="background:rgba(0,0,0,.045);border:1px solid var(--border)"><div class="n" style="color:'+(d.errors?.length?'#eb5757':'var(--muted)')+'">'+(d.errors?.length||0)+'</div><div class="l">Omitidos</div></div>';
    document.getElementById('qimp-errs').innerHTML=(d.errors||[]).map(e=>'<div style="font-size:11px;color:#eb5757;padding:3px 0">✕ '+esc(e.qnum||'?')+': '+esc(e.error)+'</div>').join('');
    document.getElementById('qimp-results').style.display='block';
    await loadQuotes();
    toast(d.imported+' cotizaciones importadas ✓','ok',5000);
  }catch(err){toast('Error: '+err.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

// ════════════════════════════════════════════════════════
//  CUSTOMER POs
// ════════════════════════════════════════════════════════
let quoteSelected = null;
let cpoData = [], cpoActiveYear = new Date().getFullYear(), cpoEditId = null, cpoImpFile = null;

async function loadCpo() {
  const yr = parseInt(document.getElementById('cpo-year-sel').value) || cpoActiveYear;
  cpoActiveYear = yr;
  try {
    const d = await fetch(`/api/cpo?year=${yr}`).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    cpoData = d.records;
    // Populate year selector
    const sel = document.getElementById('cpo-year-sel');
    const avail = d.available_years.length ? d.available_years : [yr];
    sel.innerHTML = avail.map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('');
    cpoRender();
    document.getElementById('cpo-dot').style.background='var(--green)';
    document.getElementById('cpo-lbl').textContent=`${cpoData.length} registros`;
  } catch(e) { toast('Error cargando CPOs','er'); }
}

function cpoRender() {
  const gs  = (document.getElementById('cpo-gs').value||'').toLowerCase();
  const jf  = (document.getElementById('cpo-job-flt').value||'').toLowerCase();
  let rows  = cpoData.filter(r => {
    const txt = `${r.id||''} ${r.po_number||''} ${r.job||''} ${r.customer||''} ${r.customer_supplier||''} ${r.pm||''}`.toLowerCase();
    return txt.includes(gs) && (r.job||'').toLowerCase().includes(jf);
  });
  const fmt = v => v!=null ? '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  const total = rows.reduce((s,r)=>s+(parseFloat(r.value)||0),0);
  document.getElementById('cpo-tb').innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="cpoOpenEdit('${r.id}')">
      <td><span style="color:var(--gold);font-family:'DM Mono',monospace;font-weight:700">${esc(r.id||'—')}</span></td>
      <td><b style="color:var(--gold);font-family:'DM Mono',monospace">${esc(r.po_number||'—')}</b></td>
      <td><span style="color:var(--red);font-family:'DM Mono',monospace;font-weight:600">${esc(r.job||'')}</span></td>
      <td>${esc(r.customer||'')}</td>
      <td>${esc(r.customer_supplier||'')}</td>
      <td style="text-align:right;font-weight:600;color:var(--green)">${fmt(r.value)}</td>
      <td><span class="tag ${r.status==='SHIPPED'?'tag-g':r.status==='WIP'?'tag-b':'tag-r'}">${esc(r.status||'')}</span></td>
      <td style="color:var(--muted)">${r.date||'—'}</td>
      <td style="color:var(--muted);font-size:11px">${esc(r.pm||'')}</td>
      <td style="color:var(--muted)">${r.est_finalize||'—'}</td>
    </tr>`).join('');
  document.getElementById('cpo-count').textContent = `${rows.length} CPOs`;
  document.getElementById('cpo-total').textContent = `Total: ${fmt(total)}`;
}

function cpoOpenNew() {
  cpoEditId = null;
  document.getElementById('cpo-new-title').textContent = 'Nueva Customer PO';
  document.getElementById('btn-cpo-del').style.display = 'none';
  ['cpo-new-po','cpo-new-tid','cpo-new-job','cpo-new-cs','cpo-new-cust','cpo-new-pm'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cpo-new-val').value = '';
  document.getElementById('cpo-new-date').value = '';
  document.getElementById('cpo-new-est').value = '';
  document.getElementById('cpo-new-status').value = 'WIP';
  document.getElementById('cpo-new-tn').value = '01_REVENUE';
  // Populate year selector in modal
  const sel = document.getElementById('cpo-new-year');
  sel.innerHTML = [cpoActiveYear, cpoActiveYear-1, cpoActiveYear+1].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===cpoActiveYear?'selected':''}>${y}</option>`).join('');
  document.getElementById('mo-cpo-new').classList.add('on');
}

function cpoOpenEdit(id) {
  const r = cpoData.find(x=>x.id===id); if(!r) return;
  cpoEditId = id;
  document.getElementById('cpo-new-title').textContent = 'Editar Customer PO';
  document.getElementById('btn-cpo-del').style.display = '';
  document.getElementById('cpo-new-po').value   = r.po_number||'';
  document.getElementById('cpo-new-tid').value  = r.type_id||'CPO';
  document.getElementById('cpo-new-job').value  = r.job||'';
  document.getElementById('cpo-new-val').value  = r.value||0;
  document.getElementById('cpo-new-cs').value   = r.customer_supplier||'';
  document.getElementById('cpo-new-cust').value = r.customer||'';
  document.getElementById('cpo-new-date').value = r.date||'';
  document.getElementById('cpo-new-est').value  = r.est_finalize||'';
  document.getElementById('cpo-new-pm').value   = r.pm||'';
  document.getElementById('cpo-new-status').value = r.status||'WIP';
  document.getElementById('cpo-new-tn').value   = r.type_name||'01_REVENUE';
  const sel = document.getElementById('cpo-new-year');
  const yr  = r.year || cpoActiveYear;
  sel.innerHTML = [yr, yr-1, yr+1].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('');
  document.getElementById('mo-cpo-new').classList.add('on');
}

async function cpoSave() {
  const year = parseInt(document.getElementById('cpo-new-year').value);
  const payload = {
    year, po_number: document.getElementById('cpo-new-po').value.trim(),
    type_id: document.getElementById('cpo-new-tid').value.trim(),
    job: document.getElementById('cpo-new-job').value.trim().toUpperCase(),
    value: parseFloat(document.getElementById('cpo-new-val').value)||0,
    customer_supplier: document.getElementById('cpo-new-cs').value.trim(),
    customer: document.getElementById('cpo-new-cust').value.trim(),
    date: document.getElementById('cpo-new-date').value,
    est_finalize: document.getElementById('cpo-new-est').value,
    pm: document.getElementById('cpo-new-pm').value.trim(),
    status: document.getElementById('cpo-new-status').value,
    type_name: document.getElementById('cpo-new-tn').value.trim(),
  };
  if (!payload.job || !payload.value) { toast('Job y Value son requeridos','er'); return; }
  try {
    const url  = cpoEditId ? `/api/cpo/${cpoEditId}` : '/api/cpo';
    const meth = cpoEditId ? 'PUT' : 'POST';
    const d    = await fetch(url,{method:meth,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    closeMo('mo-cpo-new');
    await loadCpo();
    toast((cpoEditId?'CPO actualizada':'CPO creada')+' ✓','ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

async function cpoDelete() {
  if (!cpoEditId || !confirm('¿Eliminar esta CPO?')) return;
  const yr = parseInt(document.getElementById('cpo-new-year').value);
  try {
    const d = await fetch(`/api/cpo/${cpoEditId}?year=${yr}`,{method:'DELETE'}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    closeMo('mo-cpo-new');
    await loadCpo();
    toast('CPO eliminada','ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

function cpoOpenImport() {
  cpoImpFile = null;
  document.getElementById('cpo-imp-file').value='';
  document.getElementById('cpo-imp-fname').textContent='—';
  document.getElementById('cpo-imp-results').style.display='none';
  document.getElementById('btn-cpo-imp-run').disabled=true;
  const sel = document.getElementById('cpo-imp-year');
  sel.innerHTML = [cpoActiveYear,cpoActiveYear-1,cpoActiveYear+1].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===cpoActiveYear?'selected':''}>${y}</option>`).join('');
  document.getElementById('mo-cpo-imp').classList.add('on');
}
function onCpoImpFile(inp){ if(inp.files.length){cpoImpFile=inp.files[0];document.getElementById('cpo-imp-fname').textContent=cpoImpFile.name;document.getElementById('btn-cpo-imp-run').disabled=false;}}
function cpoDropImport(e){e.preventDefault();document.getElementById('cpo-dz-imp').classList.remove('dg');const f=e.dataTransfer.files[0];if(f){cpoImpFile=f;document.getElementById('cpo-imp-fname').textContent=f.name;document.getElementById('btn-cpo-imp-run').disabled=false;}}

async function cpoRunImport(){
  if(!cpoImpFile)return;
  const btn=document.getElementById('btn-cpo-imp-run');btn.disabled=true;btn.textContent='Importando…';
  const fd=new FormData();fd.append('file',cpoImpFile);fd.append('year',document.getElementById('cpo-imp-year').value);fd.append('mode',document.getElementById('cpo-imp-mode').value);
  try{
    const d=await fetch('/api/cpo/import',{method:'POST',body:fd}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    document.getElementById('cpo-imp-chips').innerHTML=
      '<div class="r-chip" style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.25)"><div class="n" style="color:var(--green)">'+d.imported+'</div><div class="l" style="color:var(--green)">Importadas</div></div>'+
      '<div class="r-chip" style="background:rgba(0,0,0,.045);border:1px solid var(--border)"><div class="n">'+d.total+'</div><div class="l">Total</div></div>';
    document.getElementById('cpo-imp-results').style.display='block';
    await loadCpo();
    toast(d.imported+' CPOs importadas ✓','ok',5000);
  }catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

// ════════════════════════════════════════════════════════
//  MULTI-JOB REPORT
// ════════════════════════════════════════════════════════
function mrptInit(){
  // Populate year selectors using same available years as report
  ['mrpt-rate-year','mrpt-wh-year','mrpt-po-year','mrpt-cpo-year'].forEach(id=>{
    const sel=document.getElementById(id);
    const cur=new Date().getFullYear();
    sel.innerHTML=[cur,cur-1,cur+1].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===cur?'selected':''}>${y}</option>`).join('');
  });
}

async function mrptGenerate(){
  const jobs = document.getElementById('mrpt-jobs').value.split(/\n/).map(s=>s.trim()).filter(Boolean);
  if(!jobs.length){toast('Ingresa al menos un Job','er');return;}
  const label = document.getElementById('mrpt-label').value.trim() || 'Multi-Job Report';
  const body  = {
    jobs, label,
    rate_year: parseInt(document.getElementById('mrpt-rate-year').value),
    wh_year:   parseInt(document.getElementById('mrpt-wh-year').value),
    po_year:   parseInt(document.getElementById('mrpt-po-year').value),
    cpo_year:  parseInt(document.getElementById('mrpt-cpo-year').value),
  };
  document.getElementById('mrpt-status').textContent='Generando…';
  document.getElementById('mrpt-dot').style.background='var(--amber)';
  try{
    const d=await fetch('/api/report/multi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    mrptData = d;
    if(mrptCurrentTab === 'op') mrptRenderOperativo(d.jobs);
    else if(mrptCurrentTab === 'com') mrptRenderComercialMulti(d.jobs);
    else mrptRender(d);
    const pdfBtn = document.getElementById('btn-mrpt-pdf');
    if(pdfBtn) pdfBtn.disabled = false;
  }catch(e){toast('Error: '+e.message,'er');}
}

function mrptRestoreLayout() {
  const pur = document.getElementById('mrpt-card-pur');
  if(pur) pur.style.display = '';
  const th = (label, color='var(--muted)', align='right') =>
    `<th style="padding:6px 8px;text-align:${align};font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${color};border-bottom:2px solid var(--red);white-space:nowrap">${label}</th>`;
  const thead = document.getElementById('mrpt-thead');
  if(thead) thead.innerHTML =
    th('Job','var(--muted)','left') +
    th('Cliente','var(--muted)','left') +
    th('Descripción','var(--muted)','left') +
    th('Revenue') + th('Hrs') + th('WH Cost') +
    th('Purchasings') +
    th('Servicios','var(--amber)') +
    th('Reasign.','var(--red)') +
    th('Recuper.','var(--green)') +
    th('Gross Margin') + th('GM%');
}

function mrptRender(d){
  mrptRestoreLayout();
  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const t   = d.totals;
  document.getElementById('mrpt-title').textContent = d.label || 'Multi-Job Report';
  // Cards
  document.getElementById('mrpt-card-rev').innerHTML =
    `<div class="rc-label">REVENUE TOTAL</div><div class="rc-val">${fmt(t.revenue)}</div><div class="rc-sub">${d.jobs.length} job(s)</div>`;
  document.getElementById('mrpt-card-wh').innerHTML =
    `<div class="rc-label">WORK HOURS COST</div><div class="rc-val">${fmt(t.amount_wh)}</div><div class="rc-sub">${Number(t.accum_hours||0).toLocaleString('en-US',{maximumFractionDigits:1})}h acumuladas</div>`;
  document.getElementById('mrpt-card-pur').innerHTML =
    `<div class="rc-label">${t.svc_total>0?'PURCHASINGS + SERVICIOS':'PURCHASINGS TOTAL'}</div><div class="rc-val">${fmt(t.purchasing_total+(t.svc_total||0))}</div>${t.svc_total>0?`<div class="rc-sub">OCs: ${fmt(t.purchasing_total)} · Svc: ${fmt(t.svc_total)}</div>`:''}`;
  const gmColor = t.gross_margin>=0?'var(--green)':'var(--red)';
  const gmPct   = t.gm_pct||0;
  const raTotal  = t.reassign_total||0;
  const rcTotal  = Math.abs(t.recovery_total||0);
  document.getElementById('mrpt-card-gm').innerHTML =
    `<div class="rc-label">GROSS MARGIN</div><div class="rc-val" style="color:${gmColor}">${fmt(t.gross_margin)}</div>`+
    `<div class="rc-sub" style="color:${gmColor}">▲ ${gmPct}% · Cost: ${fmt(t.cost)}</div>`+
    (raTotal?`<div class="rc-sub" style="color:var(--red)">Reasign.: ${fmt(raTotal)}</div>`:'')+
    (rcTotal?`<div class="rc-sub" style="color:var(--green)">Recuper.: +${fmt(rcTotal)}</div>`:'');
  // Table rows
  document.getElementById('mrpt-tb').innerHTML = d.jobs.map((r,i)=>{
    const svc = r.svc_total||0;
    return `
    <tr style="background:${i%2===0?'rgba(0,0,0,.03)':'transparent'}">
      <td style="padding:6px 8px;font-family:'DM Mono',monospace;font-weight:600;color:var(--gold)">${esc(r.job_number)}</td>
      <td style="padding:8px 10px;font-size:12px">${esc(r.customer||'')}</td>
      <td style="padding:8px 10px;font-size:11px;color:var(--muted2)">${esc(r.description||'')}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:600">${fmt(r.revenue)}<br><span style="font-size:9px;color:var(--muted)">${r.revenue_source==='CPO'?'📌 CPO':''}</span></td>
      <td style="padding:8px 10px;text-align:right;color:var(--muted)">${Number(r.accum_hours||0).toLocaleString('en-US',{maximumFractionDigits:1})}h</td>
      <td style="padding:8px 10px;text-align:right">${fmt(r.amount_wh)}</td>
      <td style="padding:8px 10px;text-align:right">${fmt(r.purchasing_total)}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--amber)">${svc>0?fmt(svc):'—'}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--red)">${r.reassign_total?fmt(r.reassign_total):'—'}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--green)">${r.recovery_total?'+'+fmt(Math.abs(r.recovery_total)):'—'}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:600;color:${r.gross_margin>=0?'var(--green)':'var(--red)'}">${fmt(r.gross_margin)}</td>
      <td style="padding:8px 10px;text-align:right;color:${r.gm_pct>=0?'var(--green)':'var(--red)'}">${r.gm_pct}%</td>
    </tr>`;
  }).join('');
  // Footer totals
  document.getElementById('mrpt-tfoot').innerHTML = `
    <tr style="border-top:2px solid var(--red);font-weight:700">
      <td colspan="3" style="padding:10px;font-size:12px;color:var(--muted)">TOTALES</td>
      <td style="padding:10px;text-align:right">${fmt(t.revenue)}</td>
      <td style="padding:10px;text-align:right;color:var(--muted)">${Number(t.accum_hours||0).toLocaleString('en-US',{maximumFractionDigits:1})}h</td>
      <td style="padding:10px;text-align:right">${fmt(t.amount_wh)}</td>
      <td style="padding:10px;text-align:right">${fmt(t.purchasing_total)}</td>
      <td style="padding:10px;text-align:right;color:var(--amber)">${t.svc_total>0?fmt(t.svc_total):'—'}</td>
      <td style="padding:10px;text-align:right;color:var(--red)">${t.reassign_total?fmt(t.reassign_total):'—'}</td>
      <td style="padding:10px;text-align:right;color:var(--green)">${t.recovery_total?'+'+fmt(Math.abs(t.recovery_total)):'—'}</td>
      <td style="padding:10px;text-align:right;color:${t.gross_margin>=0?'var(--green)':'var(--red)'}">${fmt(t.gross_margin)}</td>
      <td style="padding:10px;text-align:right;color:${t.gm_pct>=0?'var(--green)':'var(--red)'}">${t.gm_pct}%</td>
    </tr>`;
  document.getElementById('mrpt-empty').style.display='none';
  document.getElementById('mrpt-content').style.display='block';
  document.getElementById('mrpt-dot').style.background='var(--green)';
  document.getElementById('mrpt-status').textContent=`${d.jobs.length} jobs procesados`;
}

// Init CPO and Multi-Report on load

// ════════════════════════════════════════════════════════
//  PT NUMBERS
// ════════════════════════════════════════════════════════
let ptData = [], ptEditNum = null;

async function loadPt() {
  try {
    const d = await fetch('/api/pt').then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    ptData = d.records;
    ptRender();
    document.getElementById('pt-dot').style.background = 'var(--green)';
    document.getElementById('pt-lbl').textContent = `${ptData.length} PTs`;
  } catch(e) { toast('Error cargando PTs','er'); }
}

function ptRender() {
  const gs = (document.getElementById('pt-gs').value||'').toLowerCase();
  const rows = ptData.filter(r => JSON.stringify(r).toLowerCase().includes(gs));
  document.getElementById('pt-tb').innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="ptOpenEdit('${esc(r.pt_number)}')">
      <td><b style="color:var(--gold);font-family:'DM Mono',monospace;font-size:13px">${esc(r.pt_number)}</b></td>
      <td>${esc(r.customer||'')}</td>
      <td>${esc(r.customer_program||'')}</td>
      <td style="font-size:11px;color:var(--muted2)">${esc(r.pm||'')}</td>
      <td>${(r.jobs||[]).map(j=>`<span style="display:inline-block;background:rgba(200,16,46,.12);color:var(--red);border-radius:4px;padding:1px 7px;font-family:'DM Mono',monospace;font-size:11px;margin:1px">${esc(j)}</span>`).join(' ')}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(r.notes||'')}</td>
    </tr>`).join('');
  document.getElementById('pt-count').textContent = `${rows.length} PT Numbers`;
}

function ptOpenNew() {
  ptEditNum = null;
  document.getElementById('pt-new-title').textContent = 'Nuevo PT Number';
  document.getElementById('btn-pt-del').style.display = 'none';
  document.getElementById('pt-new-num').value = '';
  document.getElementById('pt-new-num').disabled = false;
  document.getElementById('pt-new-pm').value = '';
  document.getElementById('pt-new-cust').value = '';
  document.getElementById('pt-new-prog').value = '';
  document.getElementById('pt-new-jobs').value = '';
  document.getElementById('pt-new-notes').value = '';
  document.getElementById('mo-pt-new').classList.add('on');
}

function ptOpenEdit(pt_number) {
  const r = ptData.find(x=>x.pt_number===pt_number); if(!r) return;
  ptEditNum = pt_number;
  document.getElementById('pt-new-title').textContent = 'Editar PT Number';
  document.getElementById('btn-pt-del').style.display = '';
  document.getElementById('pt-new-num').value = r.pt_number;
  document.getElementById('pt-new-num').disabled = true;
  document.getElementById('pt-new-pm').value = r.pm||'';
  document.getElementById('pt-new-cust').value = r.customer||'';
  document.getElementById('pt-new-prog').value = r.customer_program||'';
  document.getElementById('pt-new-jobs').value = (r.jobs||[]).join('\n');
  document.getElementById('pt-new-notes').value = r.notes||'';
  document.getElementById('mo-pt-new').classList.add('on');
}

async function ptSave() {
  const jobs = document.getElementById('pt-new-jobs').value.split(/\n/).map(s=>s.trim()).filter(Boolean);
  const payload = {
    pt_number:        document.getElementById('pt-new-num').value.trim().toUpperCase(),
    customer:         document.getElementById('pt-new-cust').value.trim(),
    customer_program: document.getElementById('pt-new-prog').value.trim(),
    pm:               document.getElementById('pt-new-pm').value.trim(),
    jobs,
    notes:            document.getElementById('pt-new-notes').value.trim(),
  };
  if (!payload.pt_number) { toast('PT Number es requerido','er'); return; }
  try {
    const url  = ptEditNum ? `/api/pt/${ptEditNum}` : '/api/pt';
    const meth = ptEditNum ? 'PUT' : 'POST';
    const d    = await fetch(url,{method:meth,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    closeMo('mo-pt-new');
    await loadPt();
    toast((ptEditNum?'PT actualizado':'PT creado')+' ✓','ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

async function ptDelete() {
  if (!ptEditNum || !confirm(`¿Eliminar ${ptEditNum}?`)) return;
  try {
    const d = await fetch(`/api/pt/${ptEditNum}`,{method:'DELETE'}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    closeMo('mo-pt-new');
    await loadPt();
    toast('PT eliminado','ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

// ════════════════════════════════════════════════════════
//  MULTI-JOB: modo PT
// ════════════════════════════════════════════════════════
let ptConfirmJobs = [];

async function mrptLoadCurrentYearJobs() {
  try {
    const currentYear = new Date().getFullYear();
    // jobs is the global array loaded at startup
    const yearJobs = (jobs||[]).filter(j => {
      // Match by ship_date year, or created_at year, or job_number year pattern
      const shipYear = (j.ship_date||'').slice(0,4);
      const createYear = (j.created_at||'').slice(0,4);
      return shipYear == currentYear || createYear == currentYear;
    });

    // If no year filter available, use all active jobs
    const jobList = yearJobs.length > 0
      ? yearJobs
      : (jobs||[]).filter(j => j.status !== 'Cerrado' && j.status !== 'Cancelado');

    if(!jobList.length) {
      toast('No se encontraron jobs para el año en curso','er'); return;
    }
    document.getElementById('mrpt-jobs').value =
      jobList.map(j=>j.job_number).join('\n');
    toast(`✓ ${jobList.length} job(s) cargados`,'ok',3000);
  } catch(e){ toast('Error: '+e.message,'er'); }
}

function mrptToggleMode(mode) {
  document.getElementById('mrpt-jobs-panel').style.display = mode==='jobs' ? '' : 'none';
  document.getElementById('mrpt-pt-panel').style.display   = mode==='pt'   ? '' : 'none';
  document.getElementById('mrpt-sv-panel').style.display   = mode==='sv'   ? '' : 'none';
}

async function mrptLoadPt() {
  const pt = document.getElementById('mrpt-pt-input').value.trim().toUpperCase();
  if (!pt) { toast('Ingresa un PT Number','er'); return; }
  try {
    const d = await fetch(`/api/pt/${pt}/jobs`).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    // Mostrar info del PT
    document.getElementById('mrpt-pt-info').innerHTML =
      `<b style="color:var(--text)">${esc(d.pt.pt_number)}</b> · ${esc(d.pt.customer||'')} · ${esc(d.pt.customer_program||'')} · <span style="color:var(--green)">${d.jobs.length} jobs</span>`;
    // Autocompletar label
    if (!document.getElementById('mrpt-label').value)
      document.getElementById('mrpt-label').value = d.pt.customer_program || d.pt.pt_number;
    // Mostrar modal de confirmación
    document.getElementById('pt-confirm-desc').innerHTML =
      `<b style="color:var(--gold)">${esc(d.pt.pt_number)}</b> — ${esc(d.pt.customer||'')} · ${esc(d.pt.customer_program||'')} · PM: ${esc(d.pt.pm||'')}`;
    document.getElementById('pt-confirm-jobs').innerHTML = d.jobs.map(j=>`
      <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(0,0,0,.035);border-radius:6px;cursor:pointer">
        <input type="checkbox" value="${esc(j.job_number)}" checked style="accent-color:var(--red)">
        <span style="font-family:'DM Mono',monospace;font-weight:600;color:var(--gold)">${esc(j.job_number)}</span>
        <span style="font-size:11px;color:var(--muted2)">${esc(j.customer||'')} · ${esc(j.description||'')}</span>
      </label>`).join('');
    ptConfirmJobs = d.jobs.map(j=>j.job_number);
    document.getElementById('mo-pt-confirm').classList.add('on');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

async function mrptLoadSv() {
  const sv = document.getElementById('mrpt-sv-input').value.trim().toUpperCase();
  if (!sv) { toast('Ingresa un SV Number','er'); return; }
  try {
    const d = await fetch(`/api/sv/${sv}`).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    const rec  = d.sv;
    const jobs = d.jobs || [];
    document.getElementById('mrpt-sv-info').innerHTML =
      `<b style="color:var(--text)">${esc(rec.sv_number)}</b> · ${esc(rec.customer||'')} · ${esc(rec.customer_program||'')} · <span style="color:var(--green)">${jobs.length} jobs</span>`;
    if (!document.getElementById('mrpt-label').value)
      document.getElementById('mrpt-label').value = rec.customer_program || rec.sv_number;
    document.getElementById('pt-confirm-desc').innerHTML =
      `<b style="color:var(--gold)">${esc(rec.sv_number)}</b> — ${esc(rec.customer||'')} · ${esc(rec.customer_program||'')} · PM: ${esc(rec.pm||'')}`;
    document.getElementById('pt-confirm-jobs').innerHTML = jobs.map(j=>`
      <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(0,0,0,.035);border-radius:6px;cursor:pointer">
        <input type="checkbox" value="${esc(j.job_number)}" checked style="accent-color:var(--red)">
        <span style="font-family:'DM Mono',monospace;font-weight:600;color:var(--gold)">${esc(j.job_number)}</span>
        <span style="font-size:11px;color:var(--muted2)">${esc(j.customer||'')} · ${esc(j.description||'')}</span>
      </label>`).join('');
    document.getElementById('mo-pt-confirm').classList.add('on');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

function ptConfirmGenerate() {
  // Recoger jobs seleccionados del modal
  const checked = [...document.querySelectorAll('#pt-confirm-jobs input[type=checkbox]:checked')].map(c=>c.value);
  if (!checked.length) { toast('Selecciona al menos un job','er'); return; }
  // Poner los jobs en el textarea y cambiar a modo jobs para reusar mrptGenerate
  document.getElementById('mrpt-jobs').value = checked.join('\n');
  closeMo('mo-pt-confirm');
  mrptGenerate();
}

// Init PT on load

// ════════════════════════════════════════════════════════
//  SISTEMA DE IDIOMAS
// ════════════════════════════════════════════════════════
const TRANSLATIONS = {
  es: {
    // Nav tabs
    nav_jobs: "Registro JOBs",
    nav_rates: "Tarifas por Hora",
    nav_quotes: "Registro de Cotización",
    nav_pt: "Número de Proyecto",
    nav_cpo: "Ventas",
    nav_po: "Compras",
    nav_wh: "Mano de Obra",
    nav_ivp: "Recepciones",
    nav_report: "Reporte por Job",
    nav_multirpt: "Reporte Múltiple",
    nav_fx: "Tipo de Cambio",
    // Common
    btn_new:       "+ Nuevo",
    btn_save:      "Guardar",
    btn_close:     "Cerrar",
    btn_delete:    "Eliminar",
    btn_reload:    "↺ Recargar",
    btn_import:    "↑ Importar Excel",
    btn_generate:  "⚙ Generar Reporte",
    btn_cancel:    "Cancelar",
    lbl_year:      "Año",
    lbl_search:    "Buscar",
    lbl_filter:    "Filtrar",
    lbl_notes:     "Notas",
    lbl_status:    "Status",
    lbl_date:      "Fecha",
    lbl_customer:  "Cliente",
    lbl_mode:      "Modo",
    lbl_name:      "Nombre",
    // Jobs
    jobs_title:    "Job Register",
    jobs_sub:      "Cost Controlling",
    jobs_total:    "Total Jobs",
    jobs_filter_year: "Año",
    jobs_filter_search: "Buscar job, cliente…",
    jobs_new:      "+ Nuevo Job",
    // Rates
    rates_title:   "Hourly Rates",
    rates_sub:     "Tarifas por empleado",
    rates_employee: "Empleado",
    rates_rate:    "Tarifa (USD/h)",
    rates_dept:    "Departamento",
    rates_new:     "+ Nuevo Empleado",
    // Quotes
    quotes_title:  "Quotation Register",
    quotes_new:    "+ Nueva Cotización",
    quotes_search: "Q-Number, cliente, descripción…",
    // PT Numbers
    pt_title:      "PT Numbers",
    pt_sub:        "Programas · Jobs asociados",
    pt_new:        "+ Nuevo PT",
    pt_number:     "PT Number",
    pt_program:    "Programa Cliente",
    pt_pm:         "PM",
    pt_jobs:       "Jobs",
    // CPO
    cpo_title:     "Customer Purchase Orders",
    cpo_new:       "+ Nueva CPO",
    cpo_po:        "PO Number",
    cpo_value:     "Value (USD)",
    cpo_est:       "Est. Finalización",
    // PO
    po_title:      "Purchase Orders",
    po_new:        "+ Nueva PO",
    // WH
    wh_title:      "Work Hours",
    wh_new:        "+ Nuevo Registro",
    wh_employee:   "Empleado",
    wh_hours:      "Horas",
    wh_desc:       "Descripción",
    // IVP
    ivp_title:     "Invoiced POs",
    ivp_new:       "+ Nueva IVP",
    // Report
    report_title:  "Job Report",
    report_revenue:"REVENUE",
    report_wh_cost:"COSTO WH",
    report_purch:  "COMPRAS TOTAL",
    report_gm:     "MARGEN BRUTO",
    report_by_emp: "🔴 WH POR EMPLEADO",
    report_pos:    "📋 PURCHASE ORDERS",
    // Multi Report
    mrpt_title:    "Multi-Job Report",
    mrpt_mode_jobs:"Por Jobs",
    mrpt_mode_pt:  "Por PT Number",
    mrpt_label:    "Etiqueta / Programa",
    mrpt_jobs_lbl: "Jobs (uno por línea)",
    mrpt_pt_lbl:   "PT Number",
    mrpt_load:     "Cargar",
    mrpt_rate_yr:  "Año Hourly Rates",
    mrpt_wh_yr:    "Año Work Hours",
    mrpt_po_yr:    "Año Purchase Orders",
    mrpt_cpo_yr:   "Año Customer POs",
    // FX
    fx_title:      "Tipo de Cambio",
    fx_rate:       "Tasa (MXN/USD)",
    // Import modal
    imp_title:     "Importar desde Excel",
    imp_drag:      "Arrastra el Excel o haz clic para seleccionar",
    imp_file:      "Archivo",
    imp_result:    "Resultado",
    imp_imported:  "Importados",
    imp_total:     "Total registros",
    imp_skipped:   "Omitidos",
    imp_append:    "Agregar (conserva existentes)",
    imp_replace:   "Reemplazar todo",
    // Login
    login_title:   "Inicia sesión para continuar",
    login_user:    "Usuario",
    login_pass:    "Contraseña",
    login_btn:     "Entrar",
    login_err:     "Usuario o contraseña incorrectos",
    lbl_filters:      "Filtros",
    lbl_active_year:  "Año activo",
    lbl_dept:         "Departamento",
    lbl_search_emp:   "Buscar empleado",
    lbl_rate_range:   "Rango de tarifa",
    lbl_date_from:    "Fecha inicial",
    lbl_date_to:      "Fecha final",
    lbl_date_recv:    "Fecha de recepción",
    lbl_search_date:  "Buscar fecha",
    lbl_system_status:"Estado del sistema",
    ph_search_customer:"Buscar cliente…",
    ph_name:          "Nombre…",
    ph_name_id:       "Nombre o ID…",
    // Confirm PT
    pt_confirm_title: "Confirmar Jobs del PT",
    pt_confirm_gen:   "Generar Reporte →",
    // Catálogos
    cat_elec_title:   "Catálogo Eléctrico",
    cat_mec_title:    "Catálogo Mecánico",
    cat_svc_title:    "Catálogo de Servicios",
    cat_search:       "Marca, No. Parte, descripción, etiqueta…",
    cat_new:          "+ Nuevo Item",
    // Proveedores
    prov_title:       "Proveedores",
    prov_sub:         "Base de proveedores",
    prov_new:         "+ Nuevo Proveedor",
    prov_search:      "Nombre, RFC, contacto…",
    // GPO
    gpo_title:        "Nueva Orden de Compra",
    gpo_supplier:     "Proveedor",
    gpo_job_type:     "Tipo de Job",
    gpo_items:        "Items de la Orden",
    gpo_subtotal:     "SUBTOTAL",
    gpo_iva:          "IVA / VAT",
    gpo_total:        "TOTAL",
    gpo_emit:         "💾 Emitir Orden de Compra",
    // Almacenes
    stock_title:      "Stock",
    stock_sub:        "Inventario general",
    ing_title:        "Ingreso de Material",
    ing_manual:       "📥 Entrada Manual",
    ing_po:           "🛒 Entrada por OC",
    apt_title:        "Apartados",
    apt_sub:          "Existencias · Desglose por Job",
    sal_title:        "Salida de Material",
    sal_new:          "📤 Gestionar Salida de Material",
    sal_surtir:       "⚡ Surtir",
    mov_title:        "Mover Apartados a Stock",
    mov_btn:          "📦 Mover a Stock",
    // Recuperaciones
    rcv_title:        "Recuperación de Costos",
    rcv_mov:          "♻ Mover Apartados a Stock",
    // Configurar Proyecto
    pc_title:         "Configurar Proyecto",
    pc_search:        "Buscar PT o SV Number",
    pc_save:          "💾 Guardar Configuración",
    pc_presup_a:      "PRESUP. A",
    pc_presup_disp:   "PRESUP. DISPONIBLE",
    pc_target_comp:   "Target Compras",
    pc_target_mo:     "Target M.O.",
    // Reports tabs
    rpt_financiero:   "📊 Resultado Financiero",
    rpt_operativo:    "⚙ Resultado Operativo",
    rpt_comercial:    "🛒 Resultado Comercial",
  },
  en: {
    nav_jobs: "Job Register",
    nav_rates: "Hourly Rates",
    nav_quotes: "Quote Register",
    nav_pt: "PT Number",
    nav_cpo: "Customer POs",
    nav_po: "Purchase Orders",
    nav_wh: "Work Hours",
    nav_ivp: "Invoiced PO",
    nav_report: "Job Report",
    nav_multirpt: "Multi-Job Report",
    nav_fx: "Exchange Rates",
    btn_new:       "+ New",
    btn_save:      "Save",
    btn_close:     "Close",
    btn_delete:    "Delete",
    btn_reload:    "↺ Reload",
    btn_import:    "↑ Import Excel",
    btn_generate:  "⚙ Generate Report",
    btn_cancel:    "Cancel",
    lbl_year:      "Year",
    lbl_search:    "Search",
    lbl_filter:    "Filter",
    lbl_notes:     "Notes",
    lbl_status:    "Status",
    lbl_date:      "Date",
    lbl_customer:  "Customer",
    lbl_mode:      "Mode",
    lbl_name:      "Name",
    jobs_title:    "Job Register",
    jobs_sub:      "Cost Controlling",
    jobs_total:    "Total Jobs",
    jobs_filter_year: "Year",
    jobs_filter_search: "Search job, customer…",
    jobs_new:      "+ New Job",
    rates_title:   "Hourly Rates",
    rates_sub:     "Rates per employee",
    rates_employee:"Employee",
    rates_rate:    "Rate (USD/h)",
    rates_dept:    "Department",
    rates_new:     "+ New Employee",
    quotes_title:  "Quotation Register",
    quotes_new:    "+ New Quote",
    quotes_search: "Q-Number, customer, description…",
    pt_title:      "PT Numbers",
    pt_sub:        "Programs · Associated Jobs",
    pt_new:        "+ New PT",
    pt_number:     "PT Number",
    pt_program:    "Customer Program",
    pt_pm:         "PM",
    pt_jobs:       "Jobs",
    cpo_title:     "Customer Purchase Orders",
    cpo_new:       "+ New CPO",
    cpo_po:        "PO Number",
    cpo_value:     "Value (USD)",
    cpo_est:       "Est. Completion",
    po_title:      "Purchase Orders",
    po_new:        "+ New PO",
    wh_title:      "Work Hours",
    wh_new:        "+ New Entry",
    wh_employee:   "Employee",
    wh_hours:      "Hours",
    wh_desc:       "Description",
    ivp_title:     "Invoiced POs",
    ivp_new:       "+ New IVP",
    report_title:  "Job Report",
    report_revenue:"REVENUE",
    report_wh_cost:"WH COST",
    report_purch:  "PURCHASINGS TOTAL",
    report_gm:     "GROSS MARGIN",
    report_by_emp: "🔴 WH BY EMPLOYEE",
    report_pos:    "📋 PURCHASE ORDERS",
    mrpt_title:    "Multi-Job Report",
    mrpt_mode_jobs:"By Jobs",
    mrpt_mode_pt:  "By PT Number",
    mrpt_label:    "Label / Program",
    mrpt_jobs_lbl: "Jobs (one per line)",
    mrpt_pt_lbl:   "PT Number",
    mrpt_load:     "Load",
    mrpt_rate_yr:  "Hourly Rates Year",
    mrpt_wh_yr:    "Work Hours Year",
    mrpt_po_yr:    "Purchase Orders Year",
    mrpt_cpo_yr:   "Customer POs Year",
    fx_title:      "Exchange Rate",
    fx_rate:       "Rate (MXN/USD)",
    imp_title:     "Import from Excel",
    imp_drag:      "Drag Excel file or click to select",
    imp_file:      "File",
    imp_result:    "Result",
    imp_imported:  "Imported",
    imp_total:     "Total records",
    imp_skipped:   "Skipped",
    imp_append:    "Append (keep existing)",
    imp_replace:   "Replace all",
    login_title:   "Sign in to continue",
    login_user:    "Username",
    login_pass:    "Password",
    login_btn:     "Sign In",
    login_err:     "Invalid username or password",
    lbl_filters:      "Filters",
    lbl_active_year:  "Active Year",
    lbl_dept:         "Area",
    lbl_search_emp:   "Search Employee",
    lbl_rate_range:   "Rate Range",
    lbl_date_from:    "Start Date",
    lbl_date_to:      "End Date",
    lbl_date_recv:    "Reception Date",
    lbl_search_date:  "Search Date",
    lbl_system_status:"System Status",
    ph_search_customer:"Search customer…",
    ph_name:          "Name…",
    ph_name_id:       "Name or ID…",
    pt_confirm_title: "Confirm PT Jobs",
    pt_confirm_gen:   "Generate Report →",
    // Catalogs
    cat_elec_title:   "Electrical Catalog",
    cat_mec_title:    "Mechanical Catalog",
    cat_svc_title:    "Services Catalog",
    cat_search:       "Brand, Part No., description, label…",
    cat_new:          "+ New Item",
    // Suppliers
    prov_title:       "Suppliers",
    prov_sub:         "Supplier database",
    prov_new:         "+ New Supplier",
    prov_search:      "Name, tax ID, contact…",
    // GPO
    gpo_title:        "New Purchase Order",
    gpo_supplier:     "Supplier",
    gpo_job_type:     "Job Type",
    gpo_items:        "Order Items",
    gpo_subtotal:     "SUBTOTAL",
    gpo_iva:          "IVA / VAT",
    gpo_total:        "TOTAL",
    gpo_emit:         "💾 Issue Purchase Order",
    // Warehouse
    stock_title:      "Stock",
    stock_sub:        "General inventory",
    ing_title:        "Material Receipt",
    ing_manual:       "📥 Manual Entry",
    ing_po:           "🛒 Entry by PO",
    apt_title:        "Reserved Stock",
    apt_sub:          "Inventory · Job Breakdown",
    sal_title:        "Material Issue",
    sal_new:          "📤 Manage Material Issue",
    sal_surtir:       "⚡ Dispatch",
    mov_title:        "Move to Stock",
    mov_btn:          "📦 Move to Stock",
    // Recoveries
    rcv_title:        "Cost Recovery",
    rcv_mov:          "♻ Move Reserved to Stock",
    // Project Config
    pc_title:         "Configure Project",
    pc_search:        "Search PT or SV Number",
    pc_save:          "💾 Save Configuration",
    pc_presup_a:      "BUDGET A",
    pc_presup_disp:   "AVAILABLE BUDGET",
    pc_target_comp:   "Purchasing Target",
    pc_target_mo:     "Labor Target",
    // Report tabs
    rpt_financiero:   "📊 Financial Result",
    rpt_operativo:    "⚙ Operational Result",
    rpt_comercial:    "🛒 Commercial Result",
  },
  it: {
    nav_jobs: "Registro Commesse",
    nav_rates: "Tariffe Orarie",
    nav_quotes: "Registro Preventivi",
    nav_pt: "Numero Progetto",
    nav_cpo: "Ordini Cliente",
    nav_po: "Ordini d'Acquisto",
    nav_wh: "Ore Lavorate",
    nav_ivp: "OdA Fatturate",
    nav_report: "Report Commessa",
    nav_multirpt: "Report Multi-Commessa",
    nav_fx: "Tassi di Cambio",
    btn_new:       "+ Nuovo",
    btn_save:      "Salva",
    btn_close:     "Chiudi",
    btn_delete:    "Elimina",
    btn_reload:    "↺ Ricarica",
    btn_import:    "↑ Importa Excel",
    btn_generate:  "⚙ Genera Report",
    btn_cancel:    "Annulla",
    lbl_year:      "Anno",
    lbl_search:    "Cerca",
    lbl_filter:    "Filtra",
    lbl_notes:     "Note",
    lbl_status:    "Stato",
    lbl_date:      "Data",
    lbl_customer:  "Cliente",
    lbl_mode:      "Modalità",
    lbl_name:      "Nome",
    jobs_title:    "Registro Commesse",
    jobs_sub:      "Controllo Costi",
    jobs_total:    "Commesse Totali",
    jobs_filter_year: "Anno",
    jobs_filter_search: "Cerca commessa, cliente…",
    jobs_new:      "+ Nuova Commessa",
    rates_title:   "Tariffe Orarie",
    rates_sub:     "Tariffe per dipendente",
    rates_employee:"Dipendente",
    rates_rate:    "Tariffa (USD/h)",
    rates_dept:    "Reparto",
    rates_new:     "+ Nuovo Dipendente",
    quotes_title:  "Registro Preventivi",
    quotes_new:    "+ Nuovo Preventivo",
    quotes_search: "Numero, cliente, descrizione…",
    pt_title:      "Numeri PT",
    pt_sub:        "Programmi · Commesse associate",
    pt_new:        "+ Nuovo PT",
    pt_number:     "Numero PT",
    pt_program:    "Programma Cliente",
    pt_pm:         "PM",
    pt_jobs:       "Commesse",
    cpo_title:     "Ordini d'Acquisto Cliente",
    cpo_new:       "+ Nuovo OdA",
    cpo_po:        "Numero OdA",
    cpo_value:     "Valore (USD)",
    cpo_est:       "Completamento Stimato",
    po_title:      "Ordini d'Acquisto",
    po_new:        "+ Nuovo OdA",
    wh_title:      "Ore Lavorate",
    wh_new:        "+ Nuovo Registro",
    wh_employee:   "Dipendente",
    wh_hours:      "Ore",
    wh_desc:       "Descrizione",
    ivp_title:     "OdA Fatturate",
    ivp_new:       "+ Nuova IVP",
    report_title:  "Report Commessa",
    report_revenue:"RICAVI",
    report_wh_cost:"COSTO ORE",
    report_purch:  "ACQUISTI TOTALE",
    report_gm:     "MARGINE LORDO",
    report_by_emp: "🔴 ORE PER DIPENDENTE",
    report_pos:    "📋 ORDINI D'ACQUISTO",
    mrpt_title:    "Report Multi-Commessa",
    mrpt_mode_jobs:"Per Commesse",
    mrpt_mode_pt:  "Per Numero PT",
    mrpt_label:    "Etichetta / Programma",
    mrpt_jobs_lbl: "Commesse (una per riga)",
    mrpt_pt_lbl:   "Numero PT",
    mrpt_load:     "Carica",
    mrpt_rate_yr:  "Anno Tariffe",
    mrpt_wh_yr:    "Anno Ore Lavorate",
    mrpt_po_yr:    "Anno Ordini Acquisto",
    mrpt_cpo_yr:   "Anno OdA Cliente",
    fx_title:      "Cambio Valuta",
    fx_rate:       "Tasso (MXN/USD)",
    imp_title:     "Importa da Excel",
    imp_drag:      "Trascina il file Excel o clicca per selezionare",
    imp_file:      "File",
    imp_result:    "Risultato",
    imp_imported:  "Importati",
    imp_total:     "Totale record",
    imp_skipped:   "Ignorati",
    imp_append:    "Aggiungi (mantieni esistenti)",
    imp_replace:   "Sostituisci tutto",
    login_title:   "Accedi per continuare",
    login_user:    "Utente",
    login_pass:    "Password",
    login_btn:     "Accedi",
    login_err:     "Utente o password non validi",
    lbl_filters:      "Filtri",
    lbl_active_year:  "Anno attivo",
    lbl_dept:         "Area",
    lbl_search_emp:   "Cerca dipendente",
    lbl_rate_range:   "Fascia tariffaria",
    lbl_date_from:    "Data iniziale",
    lbl_date_to:      "Data finale",
    lbl_date_recv:    "Data ricezione",
    lbl_search_date:  "Cerca data",
    lbl_system_status:"Stato del sistema",
    ph_search_customer:"Cerca cliente…",
    ph_name:          "Nome…",
    ph_name_id:       "Nome o ID…",
    pt_confirm_title: "Conferma Commesse PT",
    pt_confirm_gen:   "Genera Report →",
    // Cataloghi
    cat_elec_title:   "Catalogo Elettrico",
    cat_mec_title:    "Catalogo Meccanico",
    cat_svc_title:    "Catalogo Servizi",
    cat_search:       "Marca, N° parte, descrizione, etichetta…",
    cat_new:          "+ Nuovo Articolo",
    // Fornitori
    prov_title:       "Fornitori",
    prov_sub:         "Database fornitori",
    prov_new:         "+ Nuovo Fornitore",
    prov_search:      "Nome, codice fiscale, contatto…",
    // GPO
    gpo_title:        "Nuovo Ordine d'Acquisto",
    gpo_supplier:     "Fornitore",
    gpo_job_type:     "Tipo Commessa",
    gpo_items:        "Articoli dell'Ordine",
    gpo_subtotal:     "SUBTOTALE",
    gpo_iva:          "IVA / VAT",
    gpo_total:        "TOTALE",
    gpo_emit:         "💾 Emetti Ordine d'Acquisto",
    // Magazzino
    stock_title:      "Stock",
    stock_sub:        "Inventario generale",
    ing_title:        "Ricevimento Materiale",
    ing_manual:       "📥 Entrata Manuale",
    ing_po:           "🛒 Entrata da OdA",
    apt_title:        "Materiale Riservato",
    apt_sub:          "Inventario · Suddivisione per Commessa",
    sal_title:        "Uscita Materiale",
    sal_new:          "📤 Gestisci Uscita Materiale",
    sal_surtir:       "⚡ Consegna",
    mov_title:        "Sposta a Stock",
    mov_btn:          "📦 Sposta a Stock",
    // Recuperi
    rcv_title:        "Recupero Costi",
    rcv_mov:          "♻ Sposta Riservato a Stock",
    // Configura Progetto
    pc_title:         "Configura Progetto",
    pc_search:        "Cerca numero PT o SV",
    pc_save:          "💾 Salva Configurazione",
    pc_presup_a:      "BUDGET A",
    pc_presup_disp:   "BUDGET DISPONIBILE",
    pc_target_comp:   "Target Acquisti",
    pc_target_mo:     "Target Manodopera",
    // Tab report
    rpt_financiero:   "📊 Risultato Finanziario",
    rpt_operativo:    "⚙ Risultato Operativo",
    rpt_comercial:    "🛒 Risultato Commerciale",
  }
};

let LANG = 'es';

function t(key) {
  return (TRANSLATIONS[LANG] && TRANSLATIONS[LANG][key]) || TRANSLATIONS['es'][key] || key;
}

// Mapa de elementos del DOM con su clave de traducción
const LANG_MAP = [
  // Nav tabs (nav-group-btn)
  // Module titles via data-i18n
  { id: 'jobs_mod_title',   text: 'jobs_title' },
  { id: 'jobs_mod_sub',     text: 'jobs_sub' },
  { id: 'pt_mod_title',     text: 'pt_title' },
  { id: 'pt_mod_sub',       text: 'pt_sub' },
  { id: 'cpo_mod_title',    text: 'cpo_title' },
  { id: 'mrpt_mod_title',   text: 'mrpt_title' },
  { id: 'fx_mod_title',     text: 'fx_title' },
];

function applyLang() {
  // Sidebar titles / subtitles using data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // Buttons by data-i18n-btn
  document.querySelectorAll('[data-i18n-btn]').forEach(el => {
    el.textContent = t(el.dataset.i18nBtn);
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  // Translate report tabs
  const tabMap = {
    'rpt-tab-fin':  'rpt_financiero',
    'rpt-tab-op':   'rpt_operativo',
    'rpt-tab-com':  'rpt_comercial',
    'mrpt-tab-fin': 'rpt_financiero',
    'mrpt-tab-op':  'rpt_operativo',
    'mrpt-tab-com': 'rpt_comercial',
  };
  Object.entries(tabMap).forEach(([id, key])=>{
    const el = document.getElementById(id);
    if(el) el.textContent = t(key);
  });
  // Highlight active lang button
  ['es','en','it'].forEach(l => {
    const btn = document.getElementById('lb-'+l);
    if (btn) btn.classList.toggle('active', l === LANG);
  });
}

async function setLang(lang) {
  LANG = lang;
  applyLang();
  try {
    await fetch('/api/me/lang', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({lang})
    });
  } catch(e) { console.warn('Could not persist lang:', e); }
}

async function initLang() {
  try {
    const d = await fetch('/api/me/lang').then(r=>r.json());
    LANG = d.lang || 'es';
  } catch(e) { LANG = 'es'; }
  applyLang();
}



// ════════════════════════════════════════════════════════
//  ADMIN — Usuarios y Permisos
// ════════════════════════════════════════════════════════
let adminData = null;
let USER_PERMS = null;

const MODULE_LABELS = {
  // Proyectos
  'jobs':'Job Register', 'pt':'PT Numbers', 'sv':'SV Numbers',
  'rates':'Hourly Rates', 'quotes':'Quote Register',
  // Ventas
  'cpo':'Customer POs',
  // Compras — Catálogos
  'cat-electrico':'Catálogo Eléctrico', 'cat-mecanico':'Catálogo Mecánico', 'cat-servicios':'Catálogo Servicios',
  // Compras — Proveedores
  'proveedores':'Proveedores',
  // Compras — Documentos
  'gpo':'Órdenes de Compra (GPO)', 'po':'Purchase Orders', 'ivp':'Invoiced POs',
  // Almacenes
  'stock':'Stock', 'recovery':'Recuperaciones', 'reassign':'Reasignaciones',
  'ingreso':'Ingreso de Material (⚡ Solo Control Total)', 'apartados':'Apartados', 'salida':'Salida de Material',
  // Servicio
  'viaticos':'Viáticos', 'gastos-viaje':'Gastos de Viaje', 'envios':'Envíos de Mensajería',
  // Reportes y Config
  'wh':'Work Hours', 'report':'Job Report', 'multirpt':'Multi-Job Report', 'fx':'Exchange Rate',
  'projconfig':'Configurar Proyecto'
};

const LEVEL_LABELS = {
  'none':   '🚫 Sin acceso',
  'view':   '👁 Ver',
  'create': '✏️ Crear',
  'full':   '⚡ Control total'
};

const MODULE_GROUPS = [
  { label: '📋 Proyectos',             mods: ['jobs','pt','sv','rates','quotes'] },
  { label: '🤝 Ventas',               mods: ['cpo'] },
  { label: '⚡ Catálogos',            mods: ['cat-electrico','cat-mecanico','cat-servicios'] },
  { label: '🏭 Proveedores',          mods: ['proveedores'] },
  { label: '📄 Documentos de Compra', mods: ['gpo','po','ivp','reassign','recovery'] },
  { label: '🏬 Almacenes',            mods: ['stock','ingreso','apartados','salida'] },
  { label: '✈ Servicio',             mods: ['viaticos','gastos-viaje','envios'] },
  { label: '📊 Reportes y Config',    mods: ['wh','report','multirpt','fx','projconfig'] },
];

let _adminUsersData = null;

function renderAdminUsers(d) {
  _adminUsersData = d;
  const users = d.users || {};

  const pills = Object.entries(users).map(([uname, info]) => {
    const isAdmin   = (info.role||'') === 'admin';
    const isCurrent = uname === d.current_user;
    return `<button onclick="adminSelectUser('${esc(uname)}')" id="admin-pill-${esc(uname)}"
      class="btn" style="font-size:12px;padding:6px 18px;margin:3px;border-radius:20px;
        background:rgba(0,0,0,.055);border:1px solid var(--border);color:var(--text)">
      ${isAdmin?'👑':'👤'} ${esc(uname)}${isCurrent?' ✓':''}
    </button>`;
  }).join('');

  document.querySelectorAll('#admin-users-grid').forEach(el => {
    el.innerHTML = `
      <div style="margin-bottom:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:8px">Seleccionar usuario</div>
        <div id="admin-user-pills" style="display:flex;flex-wrap:wrap;gap:4px">${pills}</div>
      </div>
      <div id="admin-user-panel"></div>`;
    const first = Object.keys(users)[0];
    if(first) adminSelectUser(first);
  });
}

function adminSelectUser(uname) {
  const d = _adminUsersData; if(!d) return;
  const info = d.users[uname]; if(!info) return;
  const modules = d.modules || [];
  const role = info.role||'viewer', isAdmin = role==='admin';
  const isCurrent = uname === d.current_user;
  const perms = info.permissions||{};

  document.querySelectorAll('#admin-user-pills button').forEach(b => {
    b.style.background='rgba(0,0,0,.055)';
    b.style.borderColor='var(--border)'; b.style.color='var(--text)';
  });
  const pill = document.getElementById(`admin-pill-${uname}`);
  if(pill){ pill.style.background='rgba(200,16,46,.15)'; pill.style.borderColor='var(--red)'; pill.style.color='var(--red)'; }

  const rows = MODULE_GROUPS.map(grp => {
    const gm = grp.mods.filter(m => modules.includes(m));
    if(!gm.length) return '';
    const hdr = `<tr style="background:rgba(0,0,0,.035)"><td colspan="2"
      style="padding:6px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--red);border-bottom:1px solid var(--border)">${grp.label}</td></tr>`;
    return hdr + gm.map(mod => {
      const lv = isAdmin ? 'full' : (perms[mod]||'none');
      const clr = lv==='full'?'var(--green)':lv==='create'?'var(--gold)':lv==='view'?'var(--text)':'var(--muted)';
      const opts = ['none','view','create','full'].map(l=>
        `<option value="${l}" ${lv===l?'selected':''}>${LEVEL_LABELS[l]}</option>`).join('');
      return `<tr style="border-bottom:1px solid rgba(0,0,0,.045)">
        <td style="padding:7px 10px 7px 18px;font-size:11px;color:var(--muted2);width:55%">${MODULE_LABELS[mod]||mod}</td>
        <td style="padding:4px 10px"><select data-user="${uname}" data-mod="${mod}" onchange="adminSetLevel(this)"
          ${isAdmin?'disabled':''}
          style="width:100%;background:var(--inp);border:1px solid var(--border);border-radius:6px;
                 color:${clr};padding:5px 8px;font-size:11px;outline:none;cursor:${isAdmin?'not-allowed':'pointer'}">
          ${opts}</select></td>
      </tr>`;
    }).join('');
  }).join('');

  const panel = document.getElementById('admin-user-panel');
  if(!panel) return;
  panel.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:18px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:40px;height:40px;border-radius:50%;background:${isAdmin?'rgba(200,16,46,.2)':'rgba(0,0,0,.075)'};display:flex;align-items:center;justify-content:center;font-size:18px">${isAdmin?'👑':'👤'}</div>
        <div>
          <div style="font-weight:700;font-size:15px">${esc(uname)}${isCurrent?' <span style="font-size:10px;color:var(--green)">(sesión activa)</span>':''}</div>
          <div style="font-size:11px;color:var(--muted)">${isAdmin?'Administrador — acceso total':'Acceso personalizado por módulo'}</div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <label style="font-size:11px;color:var(--muted)">Rol:</label>
          <select onchange="adminChangeRole('${uname}',this.value)"
            style="background:var(--inp);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:5px 10px;font-size:12px;outline:none"
            ${uname===d.admin_user?'disabled':''}><option value="viewer" ${role==='viewer'?'selected':''}>Acceso personalizado</option>
            <option value="admin" ${role==='admin'?'selected':''}>Administrador</option></select>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="padding:4px 10px;text-align:left;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Módulo</th>
          <th style="padding:4px 10px;text-align:left;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Nivel de acceso</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}


async function adminSetLevel(sel) {
  const uname = sel.dataset.user;
  const mod   = sel.dataset.mod;
  const level = sel.value;
  // Update color
  const colors = {full:'var(--green)',create:'var(--gold)',view:'var(--text)',none:'var(--muted)'};
  sel.style.color = colors[level]||'var(--text)';
  try {
    const d = await fetch('/api/admin/users/'+uname, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({permissions: {[mod]: level}})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    toast(`${uname} · ${MODULE_LABELS[mod]||mod} → ${LEVEL_LABELS[level]}`,'ok',2000);
  } catch(e){toast('Error guardando permiso','er');}
}

async function initPerms() {
  try {
    const d = await fetch('/api/me/perms').then(r=>r.json());
    USER_PERMS = d;
    // Mostrar tab Admin solo si es admin
    const wrap = document.getElementById('admin-tab-wrap');
    if (wrap) wrap.style.display = d.is_admin ? '' : 'none';
    // Aplicar permisos al DOM
    applyPermsToDom(d);
  } catch(e) { console.warn('Could not load perms:', e); }
}

function applyPermsToDom(d) {
  if (!d || d.is_admin) return; // admins ven todo
  const perms = d.permissions || {};

  // Helper: get level for a module
  const lvl = mod => perms[mod] || 'none';
  const canView   = mod => ['view','create','full'].includes(lvl(mod));
  const canCreate = mod => ['create','full'].includes(lvl(mod));
  const canFull   = mod => lvl(mod) === 'full';

  // ── Map of module → DOM selectors for buttons to hide/show
  // Buttons are tagged with data-perm-mod and data-perm-level attributes
  // OR we use specific element IDs

  // Nav menu items: hide if no view access
  const navMap = {
    'jobs':          ["switchMenu('jobs'",   "switchMenu(\"jobs\""],
    'pt':            ["switchMenu('pt'",     "switchMenu(\"pt\""],
    'sv':            ["switchMenu('sv'",     "switchMenu(\"sv\""],
    'rates':         ["switchMenu('rates'"],
    'quotes':        ["switchMenu('quotes'"],
    'cpo':           ["switchMenu('cpo'"],
    'cat-electrico': ["switchMenu('cat-electrico'"],
    'cat-mecanico':  ["switchMenu('cat-mecanico'"],
    'cat-servicios': ["switchMenu('cat-servicios'"],
    'proveedores':   ["switchMenu('proveedores'"],
    'gpo':           ["switchMenu('po'"],
    'po':            ["switchMenu('po'"],
    'ivp':           ["switchMenu('ivp'"],
    'stock':         ["switchMenu('stock'"],
    'ingreso':       ["switchMenu('ingreso'"],
    'apartados':     ["switchMenu('apartados'"],
    'salida':        ["switchMenu('salida'"],
    'recovery':      ["switchMenu('recovery'"],
    'reassign':      ["switchMenu('reassign'"],
    'viaticos':      ["switchMenu('viaticos'"],
    'gastos-viaje':  ["switchMenu('gastos'"],
    'envios':        ["switchMenu('envios'"],
    'wh':            ["switchMenu('wh'"],
    'report':        ["switchMenu('report'"],
    'multirpt':      ["switchMenu('multirpt'"],
    'fx':            ["switchMenu('fx'"],
  };

  // Hide nav items the user can't view
  document.querySelectorAll('button[onclick]').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    for(const [mod, patterns] of Object.entries(navMap)){
      if(patterns.some(p => oc.includes(p))){
        if(!canView(mod)){
          btn.style.display='none';
        }
      }
    }
  });

  // ── Module-level button visibility
  // Each module has: "+ Nuevo" (create), "↑ Importar" (full), "✕ Eliminar" (full)
  // We tag them by onclick patterns

  const btnPatterns = [
    // Jobs
    { pat:'jobOpenNew(',       mod:'jobs',         need:'create' },
    { pat:'importJobs(',       mod:'jobs',         need:'full' },
    { pat:'jobOpenImport(',    mod:'jobs',         need:'full' },
    // PT
    { pat:'ptOpenNew(',        mod:'pt',           need:'create' },
    { pat:'ptOpenImport(',     mod:'pt',           need:'full' },
    { pat:'deletePt(',         mod:'pt',           need:'full' },
    // SV
    { pat:'svOpenNew(',        mod:'sv',           need:'create' },
    { pat:'svOpenImport(',     mod:'sv',           need:'full' },
    { pat:'deleteSv(',         mod:'sv',           need:'full' },
    // Rates
    { pat:'rateOpenNew(',      mod:'rates',        need:'create' },
    { pat:'rateOpenImport(',   mod:'rates',        need:'full' },
    // Quotes
    { pat:'quoteOpenNew(',     mod:'quotes',       need:'create' },
    { pat:'quoteOpenImport(',  mod:'quotes',       need:'full' },
    // CPO
    { pat:'cpoOpenNew(',      mod:'cpo',          need:'create' },
    { pat:'cpoOpenImport(',   mod:'cpo',          need:'full' },
    { pat:'cpoImport(',       mod:'cpo',          need:'full' },
    { pat:'cpoSave(',         mod:'cpo',          need:'create' },
    { pat:'cpoDelete(',       mod:'cpo',          need:'full' },
    { pat:'deleteCpo(',       mod:'cpo',          need:'full' },
    // Catalogos
    { pat:"catOpenNew('electrico'",  mod:'cat-electrico', need:'create' },
    { pat:"catOpenImport('electrico'",mod:'cat-electrico',need:'full' },
    { pat:"deleteCatalogoItem('electrico'",mod:'cat-electrico',need:'full' },
    { pat:"catOpenNew('mecanico'",   mod:'cat-mecanico',  need:'create' },
    { pat:"catOpenImport('mecanico'",mod:'cat-mecanico',  need:'full' },
    { pat:"catOpenNew('servicios'",  mod:'cat-servicios', need:'create' },
    { pat:"catOpenImport('servicios'",mod:'cat-servicios',need:'full' },
    // Proveedores
    { pat:'provOpenNew(',      mod:'proveedores',  need:'create' },
    { pat:'provOpenImport(',   mod:'proveedores',  need:'full' },
    { pat:'provOpenEdit(',     mod:'proveedores',  need:'create' },
    { pat:'deleteProv(',       mod:'proveedores',  need:'full' },
    // GPO / PO
    { pat:'openNewGPO(',      mod:'gpo',          need:'create' },
    { pat:'poOpenImport(',    mod:'po',           need:'full' },
    { pat:'deleteGPO(',       mod:'gpo',          need:'full' },
    { pat:'deleteIPO(',       mod:'po',           need:'full' },
    // IVP
    { pat:'ivpOpenImport(',   mod:'ivp',          need:'full' },
    { pat:'deleteIvp(',       mod:'ivp',          need:'full' },
    // Stock
    { pat:'openIngressStock(', mod:'stock',       need:'create' },
    { pat:'stkOpenImport(',   mod:'stock',        need:'full' },
    { pat:'deleteStockItem(', mod:'stock',        need:'full' },
    // Ingreso — solo Control Total (full)
    { pat:'ingresoOpenManual(', mod:'ingreso',   need:'full' },
    { pat:'ingresoOpenPO(',     mod:'ingreso',   need:'full' },
    { pat:'saeIngresoOpen(',    mod:'ingreso',   need:'full' },
    // Recovery
    { pat:'deleteRecovery(',  mod:'recovery',     need:'full' },
    // Reassign
    { pat:'openReassign(',    mod:'reassign',     need:'create' },
    { pat:'deleteReassign(',  mod:'reassign',     need:'full' },
    // Servicio — Viáticos
    { pat:'viaOpenNew(',      mod:'viaticos',     need:'create' },
    { pat:'viaOpenImport(',   mod:'viaticos',     need:'full' },
    { pat:'deleteViatico(',   mod:'viaticos',     need:'full' },
    // Servicio — Gastos de Viaje
    { pat:'gvOpenNew(',       mod:'gastos-viaje', need:'create' },
    { pat:'deleteGasto(',     mod:'gastos-viaje', need:'full' },
    // Servicio — Envíos
    { pat:'envOpenNew(',      mod:'envios',       need:'create' },
    { pat:'deleteEnvio(',     mod:'envios',       need:'full' },
    // WH
    { pat:'whOpenImport(',    mod:'wh',           need:'full' },
    // FX
    { pat:'fxOpenNew(',       mod:'fx',           need:'create' },
    { pat:'fxOpenImport(',    mod:'fx',           need:'full' },
    { pat:'fxFetchBanxico(',  mod:'fx',           need:'create' },
    // Projconfig
    { pat:'pcSave(',          mod:'projconfig',   need:'create' },
    { pat:'pcDeleteConfig(',  mod:'projconfig',   need:'create' },
    // Rates edit buttons inside modal
    { pat:'rateSave(',        mod:'rates',        need:'create' },
    // SV edit button inside panel
    { pat:'svOpenEdit(',      mod:'sv',           need:'create' },
  ];

  document.querySelectorAll('button[onclick], a[onclick]').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    for(const rule of btnPatterns){
      if(oc.includes(rule.pat)){
        const allowed = rule.need==='create' ? canCreate(rule.mod) : canFull(rule.mod);
        if(!allowed) btn.style.display='none';
        break;
      }
    }
  });

  // Hide import buttons with text content (sidebar buttons)
  document.querySelectorAll('.btn-sec,.btn-new').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    for(const rule of btnPatterns){
      if(oc.includes(rule.pat)){
        const allowed = rule.need==='create' ? canCreate(rule.mod) : canFull(rule.mod);
        if(!allowed) btn.style.display='none';
        break;
      }
    }
  });

  // ── Block row-level editing for view-only modules
  const viewOnlyMods = Object.keys(perms).filter(m => lvl(m) === 'view');

  // ── Jobs: hide financial columns for view-only
  if(viewOnlyMods.includes('jobs')) {
    document.querySelectorAll('table').forEach(t => {
      if(t.querySelector('#j-tb, th[data-mod="jobs"]') || t.contains(document.getElementById('j-tb'))) {
        t.classList.add('jobs-view-only');
      }
    });
    // Target the jobs table directly
    const jtb = document.getElementById('j-tb');
    if(jtb) jtb.closest('table')?.classList.add('jobs-view-only');
  }

  if(viewOnlyMods.includes('jobs')) {
    const orig = window._jobOpen_orig || jobOpen;
    window._jobOpen_orig = orig;
    window.jobOpen = function(jobNum) {
      orig(jobNum);
      setTimeout(()=>{
        document.querySelectorAll('#je-admin-section, [onclick*="jobSave"], [onclick*="jobDelete"], #btn-job-save, #btn-job-del').forEach(el=>el.style.display='none');
      }, 120);
    };
  }

  if(viewOnlyMods.includes('quotes')) {
    const orig = window._quoteOpen_orig || quoteOpen;
    window._quoteOpen_orig = orig;
    window.quoteOpen = function(row) {
      orig(row);
      setTimeout(()=>{
        document.querySelectorAll('[onclick*="quoteSave"],[onclick*="quoteDelete"],[onclick*="addQuoteLine"],[onclick*="deleteQuoteLine"],[onclick*="quoteRefuse"],[onclick*="quoteWon"],[onclick*="quoteLost"]').forEach(el=>el.style.display='none');
        document.querySelectorAll('#quote-panel input,#quote-panel select,#quote-panel textarea').forEach(el=>{el.setAttribute('readonly','');el.style.pointerEvents='none';el.style.opacity='.7';});
      }, 150);
    };
  }

  if(viewOnlyMods.includes('cpo')) {
    window.cpoOpenEdit = function() { return; };
    window.cpoOpenNew  = function() { return; };
    window.cpoSave     = function() { return; };
  }

  // ── For 'create' level: also hide delete buttons inside modals/panels
  const createOnlyMods = Object.keys(perms).filter(m => lvl(m) === 'create');
  const deletePatterns = [
    { pat:'deleteStockItem(', mod:'stock' },
    { pat:'deleteRecovery(',  mod:'recovery' },
    { pat:'deleteReassign(',  mod:'reassign' },
    { pat:'deletePt(',        mod:'pt' },
    { pat:'deleteSv(',        mod:'sv' },
    { pat:'cpoDelete(',       mod:'cpo' },
    { pat:'deleteCpo(',       mod:'cpo' },
    { pat:'deleteGPO(',       mod:'gpo' },
    { pat:'deleteIPO(',       mod:'po' },
    { pat:'deleteIvp(',       mod:'ivp' },
    { pat:'deleteProv(',      mod:'proveedores' },
    { pat:'deleteProveedor(', mod:'proveedores' },
    { pat:'jobDelete(',       mod:'jobs' },
    { pat:'quoteDelete(',     mod:'quotes' },
    { pat:'rateDelete(',      mod:'rates' },
    { pat:'fxDelete(',        mod:'fx' },
    { pat:'btn-cpo-del',      mod:'cpo' },
    { pat:'btn-job-del',      mod:'jobs' },
  ];
  if(createOnlyMods.length) {
    document.querySelectorAll('button[onclick], button[id]').forEach(btn => {
      const oc  = btn.getAttribute('onclick') || '';
      const bid = btn.getAttribute('id') || '';
      for(const rule of deletePatterns){
        if((oc.includes(rule.pat) || bid.includes(rule.pat.replace('(','').replace(',',''))) && createOnlyMods.includes(rule.mod)){
          btn.style.display='none';
          break;
        }
      }
    });
  }

  if(viewOnlyMods.includes('rates')) {
    window.rateOpenNew = function() { return; };
    window.rateSave    = function() { return; };
  }

  if(viewOnlyMods.includes('sv')) {
    window.svOpenEdit  = function() { return; };
    window.svOpenNew   = function() { return; };
  }

  if(viewOnlyMods.includes('fx')) {
    window.fxOpenImport = function() { return; };
    window.fxOpenNew    = function() { return; };
    // fxFetchBanxico stays available for view level (read-only fetch)
  }

  if(viewOnlyMods.includes('pt')) {
    window.ptOpenEdit  = function() { return; };
    window.ptOpenNew   = function() { return; };
  }

  if(viewOnlyMods.includes('proveedores')) {
    const orig = window._provOpenPanel_orig || provOpenPanel;
    window._provOpenPanel_orig = orig;
    window.provOpenPanel = function(clave) {
      orig(clave);
      setTimeout(()=>{
        document.querySelectorAll('[onclick*="provSave"],[onclick*="provDelete"],[onclick*="provEdit"]').forEach(el=>el.style.display='none');
        document.querySelectorAll('#pn-form input,#pn-form select,#pn-form textarea').forEach(el=>{el.setAttribute('readonly','');el.style.pointerEvents='none';el.style.opacity='.7';});
      }, 120);
    };
  }

  if(viewOnlyMods.includes('cat-electrico') || viewOnlyMods.includes('cat-mecanico') || viewOnlyMods.includes('cat-servicios')) {
    const origCat = window._catOpenEdit_orig || catOpenEdit;
    window._catOpenEdit_orig = origCat;
    window.catOpenEdit = function(tipo, code) {
      if(viewOnlyMods.includes(`cat-${tipo}`)) return;
      origCat(tipo, code);
    };
  }

  if(viewOnlyMods.includes('stock')) {
    window.editStockItem = function() { return; };
  }

  // ── Hide Resultado Financiero tab for non-full report users (Comercial always visible)
  const reportLevel = lvl('report');
  const mrptLevel   = lvl('multirpt');
  if(reportLevel !== 'full') {
    const tf = document.getElementById('rpt-tab-fin');
    if(tf) tf.style.display='none';
    rptCurrentTab = 'op';
    rptSwitchTab('op');
  }
  if(mrptLevel !== 'full') {
    const mf = document.getElementById('mrpt-tab-fin');
    if(mf) mf.style.display='none';
    mrptCurrentTab = 'op';
    mrptSwitchTab('op');
  }

  // ── Projconfig: view-only = disable all inputs
  if(viewOnlyMods.includes('projconfig')) {
    window.pcSave = function() { return; };
    window.pcDeleteConfig = function() { return; };
    // Make existing inputs readonly after render
    const origSelect = window.pcSelectPTSV;
    window.pcSelectPTSV = async function(item) {
      await origSelect(item);
      setTimeout(()=>{
        document.querySelectorAll('#pc-jobs-body input').forEach(el=>{
          el.setAttribute('readonly',''); el.style.pointerEvents='none'; el.style.opacity='.6';
        });
      }, 300);
    };
  }

  // ── Projconfig: no access = hide nav button
  if(lvl('projconfig') === 'none') {
    document.querySelectorAll('button[onclick]').forEach(btn=>{
      if((btn.getAttribute('onclick')||'').includes("'projconfig'")) btn.style.display='none';
    });
  }
}

async function loadAdminUsers() {
  try {
    const d = await fetch('/api/admin/users').then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    adminData = d;
    renderAdminUsers(d);
    mergeJobsInit();
    whClearInit();
    backupAllInit();
    loadAdminUsersList();
  } catch(e) { toast('Error cargando usuarios','er'); }
}

async function adminChangeRole(uname, newRole) {
  try {
    const defaultPerms = {};
    const mods = ['jobs','rates','quotes','pt','cpo','po','wh','ivp','report','multirpt','fx'];
    const acts = ['view','create','edit','delete','import'];
    mods.forEach(m => {
      defaultPerms[m] = {};
      acts.forEach(a => {
        defaultPerms[m][a] = newRole === 'admin' ? true : (a === 'view');
      });
    });
    const d = await fetch(`/api/admin/users/${uname}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({role: newRole, permissions: defaultPerms})
    }).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    toast(`${uname} → ${newRole==='admin'?'Administrador':'Consulta'} ✓`,'ok');
    await loadAdminUsers();
  } catch(e) { toast('Error cambiando rol','er'); }
}

// Init on load
// Load admin users when switching to admin module


// ══ INIT ══════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  SV NUMBERS
// ════════════════════════════════════════════════════════
let svData = [], svEditNum = null;

async function loadSv() {
  try {
    const d = await fetch('/api/sv').then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    svData = d.records;
    svRender();
    document.getElementById('sv-dot').style.background = 'var(--green)';
    document.getElementById('sv-lbl').textContent = `${svData.length} SVs`;
  } catch(e) { toast('Error cargando SVs','er'); }
}

function svRender() {
  const gs = (document.getElementById('sv-gs').value||'').toLowerCase();
  const rows = svData.filter(r => JSON.stringify(r).toLowerCase().includes(gs));
  document.getElementById('sv-tb').innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="svOpenEdit('${esc(r.sv_number)}')">
      <td><b style="color:var(--gold);font-family:'DM Mono',monospace;font-size:13px">${esc(r.sv_number)}</b></td>
      <td>${esc(r.customer||'')}</td>
      <td>${esc(r.customer_program||'')}</td>
      <td style="font-size:11px;color:var(--muted2)">${esc(r.pm||'')}</td>
      <td>${(r.jobs||[]).map(j=>`<span style="display:inline-block;background:rgba(200,16,46,.12);color:var(--red);border-radius:4px;padding:1px 7px;font-family:'DM Mono',monospace;font-size:11px;margin:1px">${esc(j)}</span>`).join(' ')}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(r.notes||'')}</td>
    </tr>`).join('');
  document.getElementById('sv-count').textContent = `${rows.length} SV Numbers`;
}

function svOpenNew() {
  svEditNum = null;
  ['sv-new-num','sv-new-pm','sv-new-cust','sv-new-prog','sv-new-jobs','sv-new-notes'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  const btn = document.getElementById('btn-sv-del');
  if(btn) btn.style.display='none';
  document.getElementById('mo-sv-new').classList.add('on');
}

function svOpenEdit(sv_number) {
  const r = svData.find(x=>x.sv_number===sv_number); if(!r) return;
  svEditNum = sv_number;
  document.getElementById('sv-new-num').value   = r.sv_number;
  document.getElementById('sv-new-pm').value    = r.pm||'';
  document.getElementById('sv-new-cust').value  = r.customer||'';
  document.getElementById('sv-new-prog').value  = r.customer_program||'';
  document.getElementById('sv-new-jobs').value  = (r.jobs||[]).join('\n');
  document.getElementById('sv-new-notes').value = r.notes||'';
  const btn = document.getElementById('btn-sv-del');
  if(btn) btn.style.display='';
  document.getElementById('mo-sv-new').classList.add('on');
}

async function svSave() {
  const jobs = document.getElementById('sv-new-jobs').value.split(/\n/).map(s=>s.trim()).filter(Boolean);
  const payload = {
    sv_number:        document.getElementById('sv-new-num').value.trim().toUpperCase(),
    customer:         document.getElementById('sv-new-cust').value.trim(),
    customer_program: document.getElementById('sv-new-prog').value.trim(),
    pm:               document.getElementById('sv-new-pm').value.trim(),
    jobs, notes: document.getElementById('sv-new-notes').value.trim(),
  };
  if (!payload.sv_number) { toast('SV Number es requerido','er'); return; }
  try {
    const url  = svEditNum ? `/api/sv/${svEditNum}` : '/api/sv';
    const meth = svEditNum ? 'PUT' : 'POST';
    const d = await fetch(url,{method:meth,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    closeMo('mo-sv-new');
    await loadSv();
    toast((svEditNum?'SV actualizado':'SV creado')+' ✓','ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

async function svDelete() {
  if (!svEditNum || !confirm(`¿Eliminar ${svEditNum}?`)) return;
  try {
    const d = await fetch(`/api/sv/${svEditNum}`,{method:'DELETE'}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    closeMo('mo-sv-new');
    await loadSv();
    toast('SV eliminado','ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

// ════════════════════════════════════════════════════════
//  FLOW — Quote → CPO → Job → PT/SV
// ════════════════════════════════════════════════════════
let flowQuote = null, flowStep = 1, flowType = 'proyecto', flowNextNums = null;

function quoteAwardFlow() {
  if (!quoteSelected) { toast('Selecciona una cotización primero','er'); return; }
  const q = quoteSelected;
  if (q.refused) { toast('Esta cotización ya fue rechazada','er'); return; }
  flowQuote = q;
  flowStep  = 1;
  flowType  = 'proyecto';
  // Pre-fill step 1
  document.getElementById('award-qnum').textContent     = q.qnum||'—';
  document.getElementById('award-customer').textContent = q.customer||'—';
  document.getElementById('aw-cs').value   = q.customer||'';
  document.getElementById('aw-pm').value   = '';
  document.getElementById('aw-po-num').value = '';
  document.getElementById('aw-value').value  = '';
  document.getElementById('aw-po-date').value = new Date().toISOString().slice(0,10);
  // Year selector
  const sel = document.getElementById('aw-cpo-year');
  const yr  = new Date().getFullYear();
  sel.innerHTML = [yr,yr-1,yr+1].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('');
  // Jobs list — one default row
  document.getElementById('award-jobs-list').innerHTML = awardJobRow(0, q.customer||'', q.desc||'');
  // Show step 1
  awardShowStep(1);
  // Pre-fetch next numbers
  fetch('/api/workflow/next-numbers').then(r=>r.json()).then(d=>{ flowNextNums=d; });
  document.getElementById('mo-award').classList.add('on');
}

function awardJobRow(idx, customer='', desc='') {
  const isFirst = idx === 0;
  const typeSelector = isFirst ? '' : `
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;padding:5px 10px;border-radius:6px;border:1px solid var(--border);flex:1;justify-content:center;background:rgba(0,0,0,.035)">
        <input type="radio" name="aj-type-${idx}" value="new" checked onchange="awardJobTypeChange(${idx},'new')"> ✨ Job nuevo
      </label>
      <label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;padding:5px 10px;border-radius:6px;border:1px solid var(--border);flex:1;justify-content:center;background:rgba(0,0,0,.035)">
        <input type="radio" name="aj-type-${idx}" value="sub" onchange="awardJobTypeChange(${idx},'sub')"> 🔗 Subíndice del Job 1
      </label>
    </div>`;

  return `<div id="award-job-${idx}" style="background:rgba(0,0,0,.045);border-radius:8px;padding:12px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">JOB ${idx+1}</span>
      ${!isFirst?`<button onclick="awardRemoveJob(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">✕</button>`:''}
    </div>
    ${typeSelector}
    <div class="fr">
      <div class="fi" id="aj-sub-wrap-${idx}" style="${isFirst?'':''}"><label>Subíndice</label>
        <input type="text" class="aj-sub" value="${isFirst?'00':''}" placeholder="00,01,51…" style="font-family:'DM Mono',monospace;color:var(--gold)" oninput="awardUpdateValue()"></div>
      <div class="fi" style="flex:2"><label>Descripción</label>
        <input type="text" class="aj-desc" value="${esc(desc)}" placeholder="Descripción del job"></div>
    </div>
    <div class="fr">
      <div class="fi"><label>PM</label><input type="text" class="aj-pm" placeholder="PM del job"></div>
      <div class="fi"><label style="display:flex;align-items:center;gap:6px">Valor (USD) <span style="font-size:9px;color:var(--muted)" id="aj-val-hint-${idx}"></span></label>
        <input type="number" class="aj-val" placeholder="0.00" step="0.01" style="color:var(--green);font-weight:600" oninput="awardUpdateValue()"></div>
    </div>
  </div>`;
}

function awardRemoveJob(idx) {
  document.getElementById('award-job-'+idx).remove();
  awardUpdateValue();
}

function awardJobTypeChange(idx, type) {
  // Si es subíndice del job base, el número principal se hereda del job 0
  // solo cambia el subíndice
  const subWrap = document.getElementById('aj-sub-wrap-'+idx);
  if (subWrap) {
    const lbl = subWrap.querySelector('label');
    if (lbl) lbl.textContent = type==='sub' ? 'Subíndice (del Job 1)' : 'Subíndice';
  }
}

function awardUpdateValue() {
  const totalVal = parseFloat(document.getElementById('aw-value').value)||0;
  const divs = [...document.querySelectorAll('#award-jobs-list > div')];
  let assigned = 0;
  divs.forEach(d => {
    const v = parseFloat(d.querySelector('.aj-val')?.value)||0;
    assigned += v;
  });
  const remaining = Math.round((totalVal - assigned)*100)/100;
  // Update hints
  divs.forEach((d,i) => {
    const hint = document.getElementById('aj-val-hint-'+i);
    if(hint) hint.textContent = totalVal ? `(Total: $${totalVal.toLocaleString()})` : '';
  });
  // Show remaining
  const rem = document.getElementById('award-val-remaining');
  if(rem) {
    rem.textContent = totalVal ? `Restante: $${remaining.toLocaleString('en-US',{minimumFractionDigits:2})}` : '';
    rem.style.color = remaining < 0 ? '#c0392b' : remaining === 0 ? '#1f8a4c' : '#a8650a';
  }
}

function awardAddJob() {
  const list = document.getElementById('award-jobs-list');
  const idx  = list.children.length;
  const q    = flowQuote || {};
  list.insertAdjacentHTML('beforeend', awardJobRow(idx, q.customer||'', q.desc||''));
  awardUpdateValue();
}

function awardTypeChange(val) {
  flowType = val;
  document.getElementById('award-ptsvlabel').textContent =
    val==='proyecto' ? 'Asignar PT Number' : 'Asignar SV Number';
}

function ptsvModeChange(mode) {
  document.getElementById('ptsv-new-panel').style.display      = mode==='new'      ? '' : 'none';
  document.getElementById('ptsv-existing-panel').style.display = mode==='existing' ? '' : 'none';
}

function awardShowStep(n) {
  flowStep = n;
  [1,2,3].forEach(i => {
    document.getElementById(`award-step-${i}`).style.display = i===n ? '' : 'none';
    document.getElementById(`step-ind-${i}`).classList.toggle('active', i===n);
  });
  document.getElementById('award-btn-back').style.display = n>1 ? '' : 'none';
  document.getElementById('award-btn-next').textContent   = n===3 ? '✓ Guardar' : 'Siguiente →';
}

function awardBack() { if(flowStep>1) awardShowStep(flowStep-1); }

async function awardNext() {
  if (flowStep === 1) {
    if (!document.getElementById('aw-value').value) { toast('Ingresa el valor de la venta','er'); return; }
    awardShowStep(2);
  } else if (flowStep === 2) {
    const jobs = [...document.querySelectorAll('#award-jobs-list > div')];
    if (!jobs.length) { toast('Agrega al menos un Job','er'); return; }
    // Populate step 3
    if (flowNextNums) {
      const num = flowType==='proyecto' ? flowNextNums.next_pt : flowNextNums.next_sv;
      document.getElementById('ptsv-auto-num').textContent = num;
      document.getElementById('ptsv-pm').value = document.getElementById('aw-pm').value;
      // Populate existing selector
      const list = flowType==='proyecto' ? (flowNextNums.pt_list||[]) : (flowNextNums.sv_list||[]);
      document.getElementById('ptsv-existing-sel').innerHTML =
        list.map(r=>`<option value="${esc(r.pt_number||r.sv_number)}">${esc(r.pt_number||r.sv_number)} — ${esc(r.customer||'')} ${esc(r.customer_program||'')}</option>`).join('');
    }
    awardShowStep(3);
  } else {
    await awardSubmit();
  }
}

async function awardSubmit() {
  const btn = document.getElementById('award-btn-next');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    // Build jobs
    const jobDivs = [...document.querySelectorAll('#award-jobs-list > div')];
    // Get base job main index (first job, always "new")
    const totalVal = parseFloat(document.getElementById('aw-value').value)||0;
    const jobs = jobDivs.map((d,i) => {
      const typeInput = d.querySelector(`input[name="aj-type-${i}"]`);
      const isSub = typeInput && [...d.querySelectorAll(`input[name="aj-type-${i}"]`)].find(r=>r.checked)?.value === 'sub';
      return {
        subindex:             d.querySelector('.aj-sub')?.value.trim()||'00',
        description:          d.querySelector('.aj-desc')?.value.trim()||'',
        pm:                   d.querySelector('.aj-pm')?.value.trim()||'',
        notes:                d.querySelector('.aj-notes')?.value.trim()||'',
        customer:             flowQuote?.customer||'',
        value:                parseFloat(d.querySelector('.aj-val')?.value)||0,
        use_base_main_index:  isSub && i > 0,  // inherit main from job 0
      };
    });
    // Validate total value
    const assignedTotal = jobs.reduce((s,j)=>s+j.value,0);
    if (totalVal > 0 && Math.round(assignedTotal*100) > Math.round(totalVal*100)) {
      toast(`La suma de valores ($${assignedTotal.toLocaleString()}) excede el total de la venta ($${totalVal.toLocaleString()})`, 'er');
      btn.disabled=false; btn.textContent='✓ Guardar';
      return;
    }
    // PT/SV
    const ptsvMode = document.querySelector('input[name="ptsv-mode"]:checked')?.value || 'new';
    const ptsvNum  = ptsvMode==='new'
      ? document.getElementById('ptsv-auto-num').textContent
      : document.getElementById('ptsv-existing-sel').value;
    const payload = {
      q_row:    flowQuote.row,
      cpo_year: parseInt(document.getElementById('aw-cpo-year').value),
      cpo: {
        po_number:         document.getElementById('aw-po-num').value.trim(),
        date:              document.getElementById('aw-po-date').value,
        value:             parseFloat(document.getElementById('aw-value').value)||0,
        customer_supplier: document.getElementById('aw-cs').value.trim(),
        customer:          flowQuote?.customer||'',
        pm:                document.getElementById('aw-pm').value.trim(),
        est_finalize:      document.getElementById('aw-est-fin').value,
        year:              parseInt(document.getElementById('aw-cpo-year').value),
      },
      jobs,
      pt_sv: {
        kind:             flowType==='proyecto' ? 'pt' : 'sv',
        mode:             ptsvMode,
        number:           ptsvNum,
        customer:         flowQuote?.customer||'',
        customer_program: document.getElementById('ptsv-program').value.trim(),
        pm:               document.getElementById('ptsv-pm').value.trim(),
        notes:            document.getElementById('ptsv-notes').value.trim(),
      }
    };
    const d = await fetch('/api/workflow/award',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    closeMo('mo-award');
    // Refresh all affected modules
    await loadQuotes();
    await loadJobs();
    await loadCpo();
    await loadPt();
    await loadSv();
    const r = d.results;
    toast(`✓ CPO ${r.cpo?.slice(-6)||''} · ${r.jobs.length} Job(s) · ${r.pt_sv?.number||''}`,'ok',6000);
  } catch(e) { toast('Error: '+e.message,'er'); }
  finally { btn.disabled=false; btn.textContent='✓ Guardar'; }
}

// ── REFUSE flow
let refuseQuoteRow = null;
function quoteRefuseFlow() {
  if (!quoteSelected) { toast('Selecciona una cotización primero','er'); return; }
  if (quoteSelected.awarded) { toast('Esta cotización ya fue agenciada','er'); return; }
  refuseQuoteRow = quoteSelected.row;
  document.getElementById('refuse-qnum').textContent = quoteSelected.qnum||'—';
  document.getElementById('refuse-reason').value = '';
  document.getElementById('mo-refuse').classList.add('on');
}

async function refuseConfirm() {
  const reason = document.getElementById('refuse-reason').value.trim();
  try {
    const d = await fetch('/api/workflow/refuse',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({q_row: refuseQuoteRow, reason})}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    closeMo('mo-refuse');
    await loadQuotes();
    toast(`Cotización ${d.qnum} marcada como rechazada`,'ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

// ── Update job table rows to include Q Number and PT/SV
// Override jobRender to add columns (patch via monkey-patch after load)


// Init SV on load


// ══ INIT ══════════════════════════════════════════════

// Close all dropdowns when clicking outside
document.addEventListener('click', ()=>{
  document.querySelectorAll('.nav-dropdown').forEach(d=>d.style.display='');
});
document.addEventListener('DOMContentLoaded', () => {
  initLang();
  initPerms();
  loadJobs();
  loadRates();
  loadQuotes();
  loadCpo();
  loadPt();
  loadSv();
  mrptInit();
  // Show home screen by default
  switchMenu('home', null);
  // Date display
  const homeDate = document.getElementById('home-date');
  if(homeDate) {
    const now = new Date();
    homeDate.textContent = now.toLocaleDateString('es-MX', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  }
});


// ════════════════════════════════════════════════════════
//  ADMIN — Fusión de Jobs
// ════════════════════════════════════════════════════════
function mergeJobsInit() {
  const yr = new Date().getFullYear();
  ['merge-wh-year','merge-po-year','merge-cpo-year'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = [yr,yr-1,yr+1].sort((a,b)=>b-a)
      .map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('');
  });
}

async function mergeJobs() {
  const source = document.getElementById('merge-source').value.trim().toUpperCase();
  const target = document.getElementById('merge-target').value.trim().toUpperCase();
  if (!source || !target) { toast('Ingresa ambos job numbers','er'); return; }
  if (!confirm(`¿Fusionar ${source} → ${target}?\n\nEsto moverá todos los archivos y registros de ${source} hacia ${target}.\n${source} será eliminado. Esta acción no se puede deshacer.`)) return;
  try {
    const d = await fetch('/api/jobs/merge', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        source, target,
        wh_year:  parseInt(document.getElementById('merge-wh-year').value),
        po_year:  parseInt(document.getElementById('merge-po-year').value),
        cpo_year: parseInt(document.getElementById('merge-cpo-year').value),
      })
    }).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    const res = document.getElementById('merge-result');
    res.style.display = '';
    res.innerHTML = `✓ Fusión completada<br>
      Archivos movidos: <b>${d.files_moved.length}</b> · 
      WHs: <b>${d.wh_updated}</b> · 
      POs: <b>${d.po_updated}</b> · 
      CPOs: <b>${d.cpo_updated}</b><br>
      <span style="color:var(--muted);font-size:11px">${source} eliminado · ${target} actualizado</span>`;
    document.getElementById('merge-source').value = '';
    document.getElementById('merge-target').value = '';
    await loadJobs();
    toast(`✓ ${source} fusionado en ${target}`,'ok',5000);
  } catch(e) { toast('Error: '+e.message,'er'); }
}

// ════════════════════════════════════════════════════════
//  ADMIN — Limpiar Work Hours
// ════════════════════════════════════════════════════════
function whClearInit() {
  const sel = document.getElementById('wh-clear-year');
  if (!sel) return;
  const yr = new Date().getFullYear();
  sel.innerHTML = [yr, yr-1, yr+1].sort((a,b)=>b-a)
    .map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('');
}

async function clearWhYear() {
  const year = parseInt(document.getElementById('wh-clear-year').value);
  if (!confirm(`⚠️ ¿Borrar TODOS los registros de Work Hours ${year}?\n\nEsta acción NO se puede deshacer.`)) return;
  try {
    const d = await fetch('/api/wh/clear', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({year})
    }).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    toast(`✓ Work Hours ${year} eliminados`,'ok',5000);
  } catch(e) { toast('Error: '+e.message,'er'); }
}

// ════════════════════════════════════════════════════════
//  SV NUMBER — Panel lateral con documentación
// ════════════════════════════════════════════════════════
let svCurrentSv = null;

// Override svRender para abrir panel al hacer clic
const _svRenderOrig = svRender;
function svRender() {
  const gs = (document.getElementById('sv-gs').value||'').toLowerCase();
  const rows = svData.filter(r => JSON.stringify(r).toLowerCase().includes(gs));
  document.getElementById('sv-tb').innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="svOpenPanel('${esc(r.sv_number)}')">
      <td><b style="color:var(--gold);font-family:'DM Mono',monospace;font-size:13px">${esc(r.sv_number)}</b></td>
      <td>${esc(r.customer||'')}</td>
      <td>${esc(r.customer_program||'')}</td>
      <td style="font-size:11px;color:var(--muted2)">${esc(r.pm||'')}</td>
      <td>${(r.jobs||[]).map(j=>`<span style="display:inline-block;background:rgba(200,16,46,.12);color:var(--red);border-radius:4px;padding:1px 7px;font-family:'DM Mono',monospace;font-size:11px;margin:1px">${esc(j)}</span>`).join(' ')}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(r.notes||'')}</td>
    </tr>`).join('');
  document.getElementById('sv-count').textContent = `${rows.length} SV Numbers`;
}

function svStab(tab, btn) {
  document.querySelectorAll('#sv-panel .ptab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#sv-panel .tc2').forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById(`svtab-${tab}`).classList.add('on');
  if (tab==='doc' && svCurrentSv) svLoadFiles(svCurrentSv);
}

function svOpenPanel(sv_number) {
  const r = svData.find(x=>x.sv_number===sv_number);
  if (!r) return;
  svCurrentSv = sv_number;
  document.getElementById('svp-num').textContent      = r.sv_number;
  document.getElementById('svp-cust').textContent     = r.customer||'—';
  document.getElementById('svp-det-cust').textContent = r.customer||'—';
  document.getElementById('svp-det-prog').textContent = r.customer_program||'—';
  document.getElementById('svp-det-pm').textContent   = r.pm||'—';
  document.getElementById('svp-det-notes').textContent= r.notes||'—';
  document.getElementById('sv-dp').textContent = `Documentos — ${sv_number}`;
  document.getElementById('svp-det-jobs').innerHTML = (r.jobs||[]).map(j=>
    `<span style="background:rgba(200,16,46,.12);color:var(--red);border-radius:4px;padding:3px 10px;font-family:'DM Mono',monospace;font-size:12px">${esc(j)}</span>`
  ).join('');
  // Reset tabs
  document.querySelectorAll('#sv-panel .ptab').forEach((b,i)=>b.classList.toggle('on',i===0));
  document.querySelectorAll('#sv-panel .tc2').forEach((t,i)=>t.classList.toggle('on',i===0));
  document.getElementById('sv-fl').innerHTML = '<div class="es" style="padding:20px 0"><span class="ei">📂</span><br>Sin documentos</div>';
  document.getElementById('sv-panel').classList.add('on');
}

function svClosePanel() {
  svCurrentSv = null;
  document.getElementById('sv-panel').classList.remove('on');
}

async function svLoadFiles(sv_number) {
  try {
    const files = await fetch(`/api/sv/${sv_number}/files`).then(r=>r.json());
    const fl = document.getElementById('sv-fl');
    if (!files.length) {
      fl.innerHTML = '<div class="es" style="padding:20px 0"><span class="ei">📂</span><br>Sin documentos</div>';
      return;
    }
    fl.innerHTML = files.map(f=>`
      <div class="fitem">
        <span class="fi-ic">${fileIco(f.name)}</span>
        <div class="fi-inf">
          <div class="fi-nm">${esc(f.name)}</div>
          <div class="fi-mt">${fmtSz(f.size)} · ${f.modified}</div>
        </div>
        <div style="display:flex;gap:4px">
          <a class="fi-dl" href="/api/sv/${sv_number}/files/${encodeURIComponent(f.name)}" download title="Descargar">⬇</a>
          <button class="fi-del" onclick="svDelFile('${sv_number}','${esc(f.name)}')">✕</button>
        </div>
      </div>`).join('');
  } catch(e) { toast('Error cargando archivos','er'); }
}

async function svUploadFiles(fileList) {
  if (!svCurrentSv || !fileList.length) return;
  const fd = new FormData();
  Array.from(fileList).forEach(f=>fd.append('files',f));
  try {
    const d = await fetch(`/api/sv/${svCurrentSv}/files`,{method:'POST',body:fd}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    await svLoadFiles(svCurrentSv);
    toast(`${d.saved.length} archivo(s) subido(s) ✓`,'ok');
  } catch(e){toast('Error subiendo archivos','er');}
}

function svDropFiles(e) {
  e.preventDefault();
  document.getElementById('sv-dz').classList.remove('dg');
  svUploadFiles(e.dataTransfer.files);
}

async function svDelFile(sv_number, filename) {
  if(!confirm(`¿Eliminar ${filename}?`)) return;
  try {
    const d = await fetch(`/api/sv/${sv_number}/files/${encodeURIComponent(filename)}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    await svLoadFiles(sv_number);
    toast('Archivo eliminado','ok');
  } catch(e){toast('Error','er');}
}

// ════════════════════════════════════════════════════════
//  RESPALDOS
// ════════════════════════════════════════════════════════
function dlBackup(db, fmt, year) {
  const y = year || new Date().getFullYear();
  window.location.href = `/api/backup/${db}?year=${y}&fmt=${fmt}`;
}

function dlBackupAll(fmt) {
  const year = document.getElementById('backup-all-year')?.value || new Date().getFullYear();
  window.location.href = `/api/backup/all?year=${year}&fmt=${fmt}`;
}

function backupAllInit() {
  const sel = document.getElementById('backup-all-year');
  if (!sel) return;
  const yr = new Date().getFullYear();
  sel.innerHTML = [yr,yr-1,yr+1].sort((a,b)=>b-a)
    .map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('');
}

// ════════════════════════════════════════════════════════
//  GESTIÓN DE USUARIOS (Admin)
// ════════════════════════════════════════════════════════
async function loadAdminUsersList() {
  try {
    const d = await fetch('/api/admin/users/list').then(r=>r.json());
    if (d.error) return;
    const el = document.getElementById('admin-users-list');
    if (!el) return;
    el.innerHTML = d.users.map(u=>`
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
        <div style="width:32px;height:32px;border-radius:50%;background:${u.role==='admin'?'rgba(200,16,46,.2)':'rgba(0,0,0,.075)'};display:flex;align-items:center;justify-content:center;font-size:14px">${u.role==='admin'?'👑':'👤'}</div>
        <div style="flex:1">
          <div style="font-weight:600;color:${u.active?'var(--text)':'var(--muted)'}">${esc(u.username)} ${u.is_admin_user?'<span style="font-size:9px;color:var(--red)">[SUPER ADMIN]</span>':''}</div>
          <div style="font-size:10px;color:var(--muted)">${u.role==='admin'?'Administrador':'Consulta'} · ${u.active?'Activo':'Inactivo'}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="changePassword('${esc(u.username)}')" class="btn btn-s" style="font-size:10px;padding:4px 8px">🔑 Password</button>
          ${!u.is_admin_user?`
          <button onclick="toggleUser('${esc(u.username)}','${u.active}')" class="btn ${u.active?'btn-s':'btn-p'}" style="font-size:10px;padding:4px 8px">${u.active?'⏸ Desactivar':'▶ Activar'}</button>
          <button onclick="deleteUser('${esc(u.username)}')" class="btn btn-d" style="font-size:10px;padding:4px 8px">✕</button>`:''}
        </div>
      </div>`).join('');
  } catch(e) {}
}

function showCreateUser() {
  document.getElementById('create-user-form').style.display = '';
  document.getElementById('nu-name').value = '';
  document.getElementById('nu-pass').value = '';
  document.getElementById('nu-role').value = 'viewer';
  document.getElementById('nu-name').focus();
}

async function createUser() {
  const username = document.getElementById('nu-name').value.trim().toLowerCase();
  const password = document.getElementById('nu-pass').value.trim();
  const role     = document.getElementById('nu-role').value;
  if (!username || !password) { toast('Completa todos los campos','er'); return; }
  try {
    const d = await fetch('/api/admin/users/create',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password,role})
    }).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    document.getElementById('create-user-form').style.display='none';
    await loadAdminUsersList();
    await loadAdminUsers();
    toast(`Usuario '${username}' creado ✓`,'ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

async function changePassword(username) {
  const pw = prompt(`Nueva contraseña para '${username}' (mínimo 6 caracteres):`);
  if (!pw) return;
  try {
    const d = await fetch(`/api/admin/users/${username}/password`,{
      method:'PUT', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:pw})
    }).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    toast(`Contraseña de '${username}' actualizada ✓`,'ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

async function toggleUser(username, currentActive) {
  try {
    const d = await fetch(`/api/admin/users/${username}/toggle`,{method:'PUT'}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    await loadAdminUsersList();
    toast(`Usuario ${d.active?'activado':'desactivado'} ✓`,'ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

async function deleteUser(username) {
  if (!confirm(`¿Eliminar el usuario '${username}'? Esta acción no se puede deshacer.`)) return;
  try {
    const d = await fetch(`/api/admin/users/${username}`,{method:'DELETE'}).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    await loadAdminUsersList();
    await loadAdminUsers();
    toast(`Usuario '${username}' eliminado ✓`,'ok');
  } catch(e) { toast('Error: '+e.message,'er'); }
}

// ════════════════════════════════════════════════════════
//  STOCK
// ════════════════════════════════════════════════════════
let stockData = [], stkImpFile = null, raItems = [], raNextNum = '';

async function loadStock() {
  try {
    const d = await fetch('/api/stock').then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    stockData = d.records;
    stockRender();
    document.getElementById('stk-dot').style.background='var(--green)';
    document.getElementById('stk-lbl').textContent=`${stockData.length} items`;
  } catch(e){toast('Error cargando stock','er');}
}

function stockRender() {
  const gs = (document.getElementById('stk-gs').value||'').toLowerCase();
  const rows = stockData.filter(r=>
    [r.manufacturer,r.part_number,r.description,r.label_code].join(' ').toLowerCase().includes(gs));
  const fmt = v=>v!=null?'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2}):'—';
  const total = rows.reduce((s,r)=>s+(parseFloat(r.last_cost)||0)*(parseInt(r.quantity)||0),0);
  document.getElementById('stk-tb').innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="editStockItem('${r.id}')">
      <td><b style="color:var(--text)">${esc(r.manufacturer||'')}</b></td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold)">${esc(r.part_number||'')}</td>
      <td style="color:var(--muted2)">${esc(r.description||'')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(r.label_code||'—')}</td>
      <td style="text-align:right">${fmt(r.last_cost)}</td>
      <td style="text-align:right;font-weight:700;color:${r.quantity>0?'var(--green)':'var(--red)'}">${r.quantity||0}</td>
      <td style="color:var(--muted)">${esc(r.unit||'')}</td>
      <td style="color:var(--muted)">${esc(r.section||'')}</td>
      <td style="color:var(--muted)">${esc(r.box||'')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(r.recovery_job||'')}</td>
    </tr>`).join('');
  document.getElementById('stk-count').textContent=`${rows.length} materiales`;
  document.getElementById('stk-total').textContent=`Valor total: $${total.toLocaleString('en-US',{minimumFractionDigits:2})}`;
}

async function openIngressStock() {
  // Reset form
  document.getElementById('stk-ing-id').value='';
  document.getElementById('stk-ing-title').textContent='Ingresar a Stock';
  ['stk-ing-mfr','stk-ing-pnum','stk-ing-desc','stk-ing-sec','stk-ing-box','stk-ing-label'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('stk-ing-qty').value='0';
  document.getElementById('stk-ing-new-qty').value='';
  document.getElementById('stk-ing-total-qty').value='0';
  document.getElementById('stk-ing-cost').value='';
  document.getElementById('stk-ing-unit').value='Pieza';
  document.getElementById('stk-search').value='';
  document.getElementById('stk-search-results').style.display='none';
  // Populate recovery job selector
  await populateJobSelector('stk-ing-rec', true);
  document.getElementById('mo-stk-ing').classList.add('on');
}

async function populateJobSelector(selId, withOptions=false) {
  const sel = document.getElementById(selId);
  if(!sel) return;
  const opts = withOptions ? ['<option value="Rezagado">Rezagado</option>','<option value="Shopfloor">Shopfloor</option>'] : [];
  const jobOpts = jobs.map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)} — ${esc(j.customer||'')}</option>`);
  sel.innerHTML = '<option value="">— Seleccionar —</option>' + opts.join('') + jobOpts.join('');
}

function stockSearch(q) {
  const res = document.getElementById('stk-search-results');
  if(!q||q.length<2){res.style.display='none';return;}
  const matches = stockData.filter(r=>
    (r.manufacturer||'').toLowerCase().includes(q.toLowerCase())||
    (r.part_number||'').toLowerCase().includes(q.toLowerCase())||
    (r.label_code||'').toLowerCase().includes(q.toLowerCase())).slice(0,8);
  if(!matches.length){res.style.display='none';return;}
  res.style.display='';
  res.innerHTML = matches.map(r=>`
    <div onclick="selectStockItem('${r.id}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;transition:background .15s" onmouseenter="this.style.background='rgba(0,0,0,.05)'" onmouseleave="this.style.background=''">
      <div style="flex:1">
        <div style="font-family:'DM Mono',monospace;color:var(--gold);font-size:12px">${esc(r.part_number)}</div>
        <div style="font-size:11px;color:var(--muted2)">${esc(r.manufacturer)} · ${esc(r.description||'')}${r.label_code?' · 🏷 '+esc(r.label_code):''}</div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${r.quantity>0?'var(--green)':'var(--red)'}">${r.quantity} ${esc(r.unit||'')}</div>
    </div>`).join('');
}

function selectStockItem(id) {
  const r = stockData.find(x=>x.id===id); if(!r) return;
  document.getElementById('stk-ing-id').value          = r.id;
  document.getElementById('stk-ing-mfr').value         = r.manufacturer||'';
  document.getElementById('stk-ing-pnum').value        = r.part_number||'';
  document.getElementById('stk-ing-desc').value        = r.description||'';
  document.getElementById('stk-ing-label').value       = r.label_code||'';
  document.getElementById('stk-ing-qty').value         = r.quantity||0;
  document.getElementById('stk-ing-new-qty').value     = '';
  document.getElementById('stk-ing-total-qty').value   = r.quantity||0;
  document.getElementById('stk-ing-cost').value        = r.last_cost||0;
  document.getElementById('stk-ing-unit').value        = r.unit||'Pieza';
  document.getElementById('stk-ing-sec').value         = r.section||'';
  document.getElementById('stk-ing-box').value         = r.box||'';
  document.getElementById('stk-ing-rec').value         = r.recovery_job||'';
  document.getElementById('stk-search-results').style.display='none';
  document.getElementById('stk-ing-title').textContent='Actualizar Stock';
}

function editStockItem(id) {
  selectStockItem(id);
  document.getElementById('stk-search').value='';
  document.getElementById('mo-stk-ing').classList.add('on');
}

function stkUpdateTotal() {
  const current = parseInt(document.getElementById('stk-ing-qty').value)||0;
  const newQty  = parseInt(document.getElementById('stk-ing-new-qty').value)||0;
  document.getElementById('stk-ing-total-qty').value = current + newQty;
}

async function saveStockIngress() {
  const pnum = document.getElementById('stk-ing-pnum').value.trim().toUpperCase();
  const mfr  = document.getElementById('stk-ing-mfr').value.trim().toUpperCase();
  if(!pnum||!mfr){toast('Fabricante y No. Parte son requeridos','er');return;}
  const newQty = parseInt(document.getElementById('stk-ing-new-qty').value)||0;
  if(newQty < 0){ toast('Los nuevos ingresos no pueden ser negativos','er'); return; }
  const payload = {
    id:           document.getElementById('stk-ing-id').value||undefined,
    manufacturer: mfr, part_number: pnum,
    description:  document.getElementById('stk-ing-desc').value.trim(),
    label_code:   document.getElementById('stk-ing-label').value.trim().toUpperCase(),
    new_quantity: newQty,
    last_cost:    parseFloat(document.getElementById('stk-ing-cost').value)||0,
    unit:         document.getElementById('stk-ing-unit').value,
    section:      document.getElementById('stk-ing-sec').value.trim(),
    box:          document.getElementById('stk-ing-box').value.trim(),
    recovery_job: document.getElementById('stk-ing-rec').value,
  };
  try {
    const d = await fetch('/api/stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-stk-ing');
    await loadStock();
    const msg = d.action==='updated'
      ? `Stock actualizado ✓ · Ingreso: +${d.new_qty||0} · Total: ${(parseInt(document.getElementById('stk-ing-total-qty').value)||0)}`
      : `Material ingresado ✓ · Existencia inicial: ${d.new_qty||0}`;
    toast(msg,'ok',4000);
  } catch(e){toast('Error: '+e.message,'er');}
}

// Stock import
function openStockImport(){stkImpFile=null;document.getElementById('stk-imp-file').value='';document.getElementById('stk-imp-fname').textContent='—';document.getElementById('stk-imp-result').style.display='none';document.getElementById('btn-stk-imp-run').disabled=true;document.getElementById('mo-stk-imp').classList.add('on');}
function onStkImpFile(inp){if(inp.files.length){stkImpFile=inp.files[0];document.getElementById('stk-imp-fname').textContent=stkImpFile.name;document.getElementById('btn-stk-imp-run').disabled=false;}}
function stkDropImport(e){e.preventDefault();document.getElementById('stk-dz-imp').classList.remove('dg');const f=e.dataTransfer.files[0];if(f){stkImpFile=f;document.getElementById('stk-imp-fname').textContent=f.name;document.getElementById('btn-stk-imp-run').disabled=false;}}
async function runStkImport(){
  if(!stkImpFile)return;
  const btn=document.getElementById('btn-stk-imp-run');btn.disabled=true;btn.textContent='Importando…';
  const fd=new FormData();fd.append('file',stkImpFile);fd.append('mode',document.getElementById('stk-imp-mode').value);
  try{
    const d=await fetch('/api/stock/import',{method:'POST',body:fd}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    const res=document.getElementById('stk-imp-result');
    res.style.display='';res.textContent=`✓ ${d.imported} items importados · Total: ${d.total}`;
    await loadStock();toast(d.imported+' materiales importados ✓','ok',5000);
  }catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

// ════════════════════════════════════════════════════════
//  REASIGNACIÓN
// ════════════════════════════════════════════════════════
let raSelItem = null;

async function loadReassign() {
  const job = document.getElementById('ra-job-flt')?.value.trim()||'';
  try {
    const url = '/api/reassign'+(job?`?job=${job}`:'');
    const d = await fetch(url).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    raNextNum = d.next_number;
    const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
    document.getElementById('ra-tb').innerHTML = (d.orders||[]).map(o=>{
      const total = (o.items||[]).reduce((s,i)=>s+parseFloat(i.total_cost||0),0);
      return `<tr class="tr-hover">
        <td><b style="color:var(--gold);font-family:'DM Mono',monospace">${esc(o.order_number)}</b></td>
        <td style="color:var(--muted)">${(o.created_at||'').slice(0,10)}</td>
        <td style="color:var(--muted2)">${(o.items||[]).length} items</td>
        <td style="text-align:right;font-weight:700;color:var(--green)">${fmt(total)}</td>
      </tr>`;
    }).join('');
    document.getElementById('ra-count').textContent=`${d.orders.length} órdenes`;
  }catch(e){toast('Error cargando reasignaciones','er');}
}

async function openReassign() {
  raItems=[]; raSelItem=null;
  document.querySelector('input[name="ra-type"][value="new"]').checked=true;
  raTypeChange('new');
  document.getElementById('ra-auto-num').textContent='Cargando…';
  document.getElementById('ra-search').value='';
  document.getElementById('ra-search-results').style.display='none';
  document.getElementById('ra-item-form').style.display='none';
  document.getElementById('ra-items-list').style.display='none';
  document.getElementById('ra-items-tb').innerHTML='';
  document.getElementById('btn-ra-save').disabled=true;
  await populateJobSelector('ra-item-job');
  // Get next RA number
  try{const d=await fetch('/api/reassign').then(r=>r.json());document.getElementById('ra-auto-num').textContent=d.next_number;raNextNum=d.next_number;}catch(e){}
  document.getElementById('mo-reassign').classList.add('on');
}

function raTypeChange(type) {
  document.getElementById('ra-new-panel').style.display      = type==='new'      ? '' : 'none';
  document.getElementById('ra-existing-panel').style.display = type==='existing' ? '' : 'none';
}

function raSearch(q) {
  const res=document.getElementById('ra-search-results');
  if(!q||q.length<2){res.style.display='none';return;}
  const matches=stockData.filter(r=>
    (r.manufacturer||'').toLowerCase().includes(q.toLowerCase())||
    (r.part_number||'').toLowerCase().includes(q.toLowerCase())||
    (r.label_code||'').toLowerCase().includes(q.toLowerCase())).slice(0,8);
  if(!matches.length){res.style.display='none';return;}
  res.style.display='';
  res.innerHTML=matches.map(r=>`
    <div onclick="raSelectItem('${r.id}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center" onmouseenter="this.style.background='rgba(0,0,0,.05)'" onmouseleave="this.style.background=''">
      <div style="flex:1">
        <div style="font-family:'DM Mono',monospace;color:var(--gold);font-size:12px">${esc(r.part_number)}</div>
        <div style="font-size:11px;color:var(--muted2)">${esc(r.manufacturer)} · ${esc(r.description||'')}${r.label_code?' · 🏷 '+esc(r.label_code):''}</div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${r.quantity>0?'var(--green)':'var(--red)'}">${r.quantity} ${esc(r.unit||'')}</div>
    </div>`).join('');
}

function raSelectItem(id) {
  const r=stockData.find(x=>x.id===id); if(!r) return;
  if(r.quantity<=0){toast('Sin existencia disponible','er');return;}
  raSelItem=r;
  document.getElementById('ra-search-results').style.display='none';
  document.getElementById('ra-search').value=`${r.manufacturer} — ${r.part_number}`;
  document.getElementById('ra-sel-info').textContent=`${r.part_number} · ${r.manufacturer} · ${r.description||''}`;
  document.getElementById('ra-sel-qty').textContent=`${r.quantity} ${r.unit||''}`;
  document.getElementById('ra-item-qty').value='';
  document.getElementById('ra-item-cost').value=r.last_cost||0;
  document.getElementById('ra-item-total').textContent='0.00';
  document.getElementById('ra-item-form').style.display='';
}

function raCalcTotal(){
  const qty=parseInt(document.getElementById('ra-item-qty').value)||0;
  const cost=parseFloat(document.getElementById('ra-item-cost').value)||0;
  document.getElementById('ra-item-total').textContent=(qty*cost).toLocaleString('en-US',{minimumFractionDigits:2});
}

function raAddItem(){
  if(!raSelItem){toast('Selecciona un material','er');return;}
  const qty=parseInt(document.getElementById('ra-item-qty').value)||0;
  const cost=parseFloat(document.getElementById('ra-item-cost').value)||0;
  const job=document.getElementById('ra-item-job').value;
  if(!qty||qty<1){toast('Ingresa una cantidad válida','er');return;}
  if(qty>raSelItem.quantity){toast(`Existencia insuficiente (máx. ${raSelItem.quantity})`,'er');return;}
  if(!job){toast('Selecciona el Job destino','er');return;}
  raItems.push({
    part_number:  raSelItem.part_number,
    manufacturer: raSelItem.manufacturer,
    description:  raSelItem.description||'',
    job, unit_cost:cost, quantity:qty,
    total_cost: Math.round(qty*cost*100)/100
  });
  renderRaItems();
  document.getElementById('ra-item-form').style.display='none';
  document.getElementById('ra-search').value='';
  raSelItem=null;
  document.getElementById('btn-ra-save').disabled=false;
}

function renderRaItems(){
  const fmt=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const list=document.getElementById('ra-items-list');
  list.style.display=raItems.length?'':'none';
  const total=raItems.reduce((s,i)=>s+i.total_cost,0);
  document.getElementById('ra-items-tb').innerHTML=raItems.map((i,idx)=>`
    <div style="display:flex;gap:8px;align-items:center;padding:7px 10px;background:rgba(0,0,0,.035);border-radius:6px;margin-bottom:4px;font-size:11px">
      <div style="flex:1;font-family:'DM Mono',monospace;color:var(--gold)">${esc(i.part_number)}</div>
      <div style="color:var(--muted2)">${esc(i.job)}</div>
      <div style="color:var(--text)">${i.quantity} u.</div>
      <div style="color:var(--green);font-weight:700">${fmt(i.total_cost)}</div>
      <button onclick="raItems.splice(${idx},1);renderRaItems();if(!raItems.length)document.getElementById('btn-ra-save').disabled=true;" style="background:none;border:none;color:var(--red);cursor:pointer">✕</button>
    </div>`).join('');
  document.getElementById('ra-order-total').textContent=total.toLocaleString('en-US',{minimumFractionDigits:2});
}

async function saveReassignOrder(){
  if(!raItems.length){toast('Agrega al menos un material','er');return;}
  const isNew = document.querySelector('input[name="ra-type"]:checked').value==='new';
  const orderNum = isNew ? raNextNum : document.getElementById('ra-existing-num').value.trim().toUpperCase();
  if(!orderNum){toast('Ingresa el número de orden','er');return;}
  const btn=document.getElementById('btn-ra-save');btn.disabled=true;btn.textContent='Guardando…';
  try{
    const d=await fetch('/api/reassign',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({order_number:orderNum,is_new:isNew,items:raItems})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-reassign');
    await loadStock();
    await loadReassign();
    toast(`Orden ${d.order_number} guardada ✓ (${raItems.length} items)`,'ok',5000);
    raItems=[];
  }catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='Guardar Orden';}
}

// Init on load
document.addEventListener('DOMContentLoaded',()=>{loadStock();loadReassign();});

// ════════════════════════════════════════════════════════
//  RECUPERACIÓN DE COSTOS
// ════════════════════════════════════════════════════════
let recoveryData = [];

async function loadRecovery() {
  try {
    const job = document.getElementById('rcv-job-flt')?.value.trim()||'';
    const url  = '/api/recovery'+(job?`?job=${job}`:'');
    const d    = await fetch(url).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    recoveryData = d.records;
    recoveryRender();
    document.getElementById('rcv-dot').style.background='var(--green)';
    document.getElementById('rcv-lbl').textContent=`${recoveryData.length} registros`;
  } catch(e){toast('Error cargando recuperaciones','er');}
}

function recoveryRender() {
  const gs   = (document.getElementById('rcv-gs')?.value||'').toLowerCase();
  const rows = recoveryData.filter(r=>
    [r.manufacturer,r.part_number,r.description,r.job,r.label_code].join(' ').toLowerCase().includes(gs));
  const fmt  = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const total = rows.reduce((s,r)=>s+(parseFloat(r.total_value)||0),0);
  const isAdm = USER_PERMS && USER_PERMS.is_admin;
  document.getElementById('rcv-tb').innerHTML = rows.map(r=>`
    <tr>
      <td><b>${esc(r.manufacturer||'')}</b></td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold)">${esc(r.part_number||'')}</td>
      <td style="color:var(--muted2)">${esc(r.description||'')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(r.label_code||'—')}</td>
      <td style="text-align:right">${fmt(r.last_cost)}</td>
      <td style="text-align:right">${r.quantity||0}</td>
      <td style="color:var(--muted)">${esc(r.unit||'')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(r.job||'')}</td>
      <td style="text-align:right;font-weight:700;color:var(--red)">${fmt(r.total_value)}</td>
      <td style="color:var(--muted);font-size:11px">${(r.created_at||'').slice(0,10)}</td>
      <td>${isAdm?`<button onclick="deleteRecovery('${r.id}')" class="fi-del" style="font-size:11px">✕</button>`:''}</td>
    </tr>`).join('');
  document.getElementById('rcv-count').textContent=`${rows.length} recuperaciones`;
  document.getElementById('rcv-total').textContent=`Total: ${fmt(total)}`;
}

async function deleteRecovery(id) {
  if(!confirm('¿Eliminar este registro de recuperación?')) return;
  try {
    const d = await fetch(`/api/recovery/${id}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    await loadRecovery();
    toast('Registro eliminado','ok');
  } catch(e){toast('Error','er');}
}

// ── Delete stock item (admin only)
async function deleteStockItem(id) {
  if(!confirm('¿Eliminar este material del Stock?')) return;
  try {
    const d = await fetch(`/api/stock/${id}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    await loadStock();
    toast('Material eliminado','ok');
  } catch(e){toast('Error','er');}
}

// ── Delete reassign order (admin only)
async function deleteReassignOrder(orderNum) {
  if(!confirm(`¿Eliminar la orden ${orderNum}? Esta acción no revierte los cambios en stock.`)) return;
  try {
    const d = await fetch(`/api/reassign/order/${orderNum}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    await loadReassign();
    toast(`Orden ${orderNum} eliminada`,'ok');
  } catch(e){toast('Error','er');}
}

// ── PDF de orden de reasignación (abre en nueva pestaña como HTML imprimible)
function printReassignOrder(orderNum) {
  window.open(`/api/reassign/order/${orderNum}/pdf`,'_blank');
}

// ── Update stockRender to show delete button for admins
const _origStockRender = stockRender;
stockRender = function() {
  const gs = (document.getElementById('stk-gs').value||'').toLowerCase();
  const rows = stockData.filter(r=>
    [r.manufacturer,r.part_number,r.description,r.label_code].join(' ').toLowerCase().includes(gs));
  const fmt = v=>v!=null?'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2}):'—';
  const total = rows.reduce((s,r)=>s+(parseFloat(r.last_cost)||0)*(parseInt(r.quantity)||0),0);
  const isAdm = USER_PERMS && USER_PERMS.is_admin;
  document.getElementById('stk-tb').innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="editStockItem('${r.id}')">
      <td><b style="color:var(--text)">${esc(r.manufacturer||'')}</b></td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold)">${esc(r.part_number||'')}</td>
      <td style="color:var(--muted2)">${esc(r.description||'')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(r.label_code||'—')}</td>
      <td style="text-align:right">${fmt(r.last_cost)}</td>
      <td style="text-align:right;font-weight:700;color:${r.quantity>0?'var(--green)':'var(--red)'}">${r.quantity||0}</td>
      <td style="color:var(--muted)">${esc(r.unit||'')}</td>
      <td style="color:var(--muted)">${esc(r.section||'')}</td>
      <td style="color:var(--muted)">${esc(r.box||'')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(r.recovery_job||'')}</td>
      ${isAdm?`<td onclick="event.stopPropagation()"><button onclick="deleteStockItem('${r.id}')" class="fi-del" style="font-size:11px">✕</button></td>`:'<td></td>'}
    </tr>`).join('');
  document.getElementById('stk-count').textContent=`${rows.length} materiales`;
  document.getElementById('stk-total').textContent=`Valor total: $${total.toLocaleString('en-US',{minimumFractionDigits:2})}`;
};

// ── Update loadReassign to show delete and PDF buttons for admins
const _origLoadReassign = loadReassign;
loadReassign = async function() {
  const job = document.getElementById('ra-job-flt')?.value.trim()||'';
  try {
    const url = '/api/reassign'+(job?`?job=${job}`:'');
    const d   = await fetch(url).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    raNextNum = d.next_number;
    const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
    const isAdm = USER_PERMS && USER_PERMS.is_admin;
    document.getElementById('ra-tb').innerHTML = (d.orders||[]).map(o=>{
      const total = (o.items||[]).reduce((s,i)=>s+parseFloat(i.total_cost||0),0);
      return `<tr>
        <td><b style="color:var(--gold);font-family:'DM Mono',monospace">${esc(o.order_number)}</b></td>
        <td style="color:var(--muted)">${(o.created_at||'').slice(0,10)}</td>
        <td style="color:var(--muted2)">${(o.items||[]).length} items</td>
        <td style="text-align:right;font-weight:700;color:var(--green)">${fmt(total)}</td>
        <td>
          <button onclick="printReassignOrder('${esc(o.order_number)}')" class="btn-reload" style="font-size:10px;padding:3px 8px">🖨 PDF</button>
          ${isAdm?`<button onclick="deleteReassignOrder('${esc(o.order_number)}')" class="fi-del" style="font-size:11px;margin-left:4px">✕</button>`:''}
        </td>
      </tr>`;
    }).join('');
    document.getElementById('ra-count').textContent=`${d.orders.length} órdenes`;
  }catch(e){toast('Error cargando reasignaciones','er');}
};

// Init Recovery on load
document.addEventListener('DOMContentLoaded',()=>{ loadRecovery(); });

// ════════════════════════════════════════════════════════
//  PROVEEDORES
// ════════════════════════════════════════════════════════
let provData = [], provCurrentClave = null, provEditClave = null, provImpFile = null;

async function loadProveedores() {
  try {
    const d = await fetch('/api/proveedores').then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    provData = d.records;
    provRender();
    document.getElementById('prov-dot').style.background='var(--green)';
    document.getElementById('prov-lbl').textContent=`${provData.length} proveedores`;
  } catch(e){toast('Error cargando proveedores','er');}
}

function provRender() {
  const gs  = (document.getElementById('prov-gs').value||'').toLowerCase();
  const est = document.getElementById('prov-est-flt').value||'';
  const rows = provData.filter(r=>{
    const txt = `${r.clave} ${r.nombre||''} ${r.rfc||''}`.toLowerCase();
    return txt.includes(gs) && (!est || r.estatus===est);
  });
  document.getElementById('prov-tb').innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="provOpenPanel(${r.clave})">
      <td style="font-family:'DM Mono',monospace;color:var(--muted);font-size:11px">${r.clave}</td>
      <td><span class="tag ${r.estatus==='Activo'?'tag-g':'tag-r'}">${esc(r.estatus||'')}</span></td>
      <td style="font-weight:600;color:var(--text)">${esc(r.nombre||'')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(r.rfc||'')}</td>
      <td style="color:var(--muted)">${esc(r.telefono||'')}</td>
      <td style="color:var(--muted2)">${esc(r.forma_pago||'')}</td>
      <td style="color:var(--muted2)">${esc(r.terminos_pago||'')}</td>
      <td style="color:var(--gold);font-weight:600">${esc(r.moneda||'')}</td>
      <td style="color:var(--muted);font-size:11px">${r.fecha_ultima_compra||'—'}</td>
    </tr>`).join('');
  document.getElementById('prov-count').textContent=`${rows.length} proveedores`;
}

function provOpenPanel(clave) {
  const r = provData.find(x=>x.clave===clave); if(!r) return;
  provCurrentClave = clave;
  document.getElementById('pp-nombre').textContent = r.nombre||'—';
  document.getElementById('pp-rfc').textContent    = r.rfc||'—';
  const dir = [r.calle, r.num_exterior, r.num_interior].filter(Boolean).join(' ');
  document.getElementById('pp-dir').textContent    = dir||'—';
  document.getElementById('pp-tel').textContent    = r.telefono||'—';
  document.getElementById('pp-clas').textContent   = r.clasificacion||'—';
  document.getElementById('pp-fpago').textContent  = r.forma_pago||'—';
  document.getElementById('pp-tpago').textContent  = r.terminos_pago||'—';
  document.getElementById('pp-moneda').textContent = r.moneda||'—';
  document.getElementById('pp-fult').textContent   = r.fecha_ultima_compra||'—';
  document.getElementById('prov-dp').textContent   = `Documentos — ${r.nombre}`;
  document.getElementById('prov-fl').innerHTML='<div class="es" style="padding:20px 0"><span class="ei">📂</span><br>Sin documentos</div>';
  document.querySelectorAll('#prov-panel .ptab').forEach((b,i)=>b.classList.toggle('on',i===0));
  document.querySelectorAll('#prov-panel .tc2').forEach((t,i)=>t.classList.toggle('on',i===0));
  document.getElementById('prov-panel').classList.add('on');
}

function provClosePanel(){ provCurrentClave=null; document.getElementById('prov-panel').classList.remove('on'); }

function provStab(tab, btn) {
  document.querySelectorAll('#prov-panel .ptab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#prov-panel .tc2').forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById(`provtab-${tab}`).classList.add('on');
  if(tab==='doc' && provCurrentClave) provLoadFiles(provCurrentClave);
}

async function provLoadFiles(clave) {
  try {
    const files = await fetch(`/api/proveedores/${clave}/files`).then(r=>r.json());
    const fl = document.getElementById('prov-fl');
    if(!files.length){fl.innerHTML='<div class="es" style="padding:20px 0"><span class="ei">📂</span><br>Sin documentos</div>';return;}
    fl.innerHTML = files.map(f=>`
      <div class="fitem">
        <span class="fi-ic">${fileIco(f.name)}</span>
        <div class="fi-inf"><div class="fi-nm">${esc(f.name)}</div><div class="fi-mt">${fmtSz(f.size)} · ${f.modified}</div></div>
        <div style="display:flex;gap:4px">
          <a class="fi-dl" href="/api/proveedores/${clave}/files/${encodeURIComponent(f.name)}" download>⬇</a>
          <button class="fi-del" onclick="provDelFile(${clave},'${esc(f.name)}')">✕</button>
        </div>
      </div>`).join('');
  } catch(e){}
}

async function provUploadFiles(fileList) {
  if(!provCurrentClave||!fileList.length) return;
  const fd=new FormData();
  Array.from(fileList).forEach(f=>fd.append('files',f));
  try {
    await fetch(`/api/proveedores/${provCurrentClave}/files`,{method:'POST',body:fd});
    await provLoadFiles(provCurrentClave);
    toast(`${fileList.length} archivo(s) subido(s) ✓`,'ok');
  }catch(e){toast('Error','er');}
}

function provDropFiles(e){e.preventDefault();document.getElementById('prov-dz').classList.remove('dg');provUploadFiles(e.dataTransfer.files);}

async function provDelFile(clave, filename) {
  if(!confirm(`¿Eliminar ${filename}?`)) return;
  await fetch(`/api/proveedores/${clave}/files/${encodeURIComponent(filename)}`,{method:'DELETE'});
  await provLoadFiles(clave);
  toast('Archivo eliminado','ok');
}

function provOpenNew() {
  provEditClave = null;
  document.getElementById('prov-new-title').textContent = 'Nuevo Proveedor';
  document.getElementById('btn-prov-del').style.display = 'none';
  ['pn-nombre','pn-rfc','pn-tel','pn-calle','pn-ni','pn-ne','pn-clas','pn-tpago'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('pn-clave').value  = '';
  document.getElementById('pn-fult').value   = '';
  document.getElementById('pn-est').value    = 'Activo';
  document.getElementById('pn-moneda').value = 'MXN';
  document.getElementById('pn-fpago').value  = 'Transferencia';
  document.getElementById('pn-doc-section').style.display='none';
  document.getElementById('mo-prov-new').classList.add('on');
}

function provOpenEdit(clave) {
  const r = provData.find(x=>x.clave===clave); if(!r) return;
  provEditClave = clave;
  document.getElementById('prov-new-title').textContent = 'Editar Proveedor';
  document.getElementById('btn-prov-del').style.display = '';
  document.getElementById('pn-clave').value   = r.clave;
  document.getElementById('pn-nombre').value  = r.nombre||'';
  document.getElementById('pn-rfc').value     = r.rfc||'';
  document.getElementById('pn-tel').value     = r.telefono||'';
  document.getElementById('pn-calle').value   = r.calle||'';
  document.getElementById('pn-ni').value      = r.num_interior||'';
  document.getElementById('pn-ne').value      = r.num_exterior||'';
  document.getElementById('pn-clas').value    = r.clasificacion||'';
  document.getElementById('pn-tpago').value   = r.terminos_pago||'';
  document.getElementById('pn-fult').value    = r.fecha_ultima_compra||'';
  document.getElementById('pn-est').value     = r.estatus||'Activo';
  document.getElementById('pn-moneda').value  = r.moneda||'MXN';
  document.getElementById('pn-fpago').value   = r.forma_pago||'Transferencia';
  document.getElementById('pn-doc-section').style.display='';
  provLoadPanelFiles(clave);
  document.getElementById('mo-prov-new').classList.add('on');
}

async function provLoadPanelFiles(clave) {
  try {
    const files = await fetch(`/api/proveedores/${clave}/files`).then(r=>r.json());
    const fl = document.getElementById('pn-fl');
    fl.innerHTML = files.length ? files.map(f=>`
      <div class="fitem">
        <span class="fi-ic">${fileIco(f.name)}</span>
        <div class="fi-inf"><div class="fi-nm">${esc(f.name)}</div></div>
        <a class="fi-dl" href="/api/proveedores/${clave}/files/${encodeURIComponent(f.name)}" download>⬇</a>
      </div>`).join('') : '<div style="font-size:11px;color:var(--muted);padding:6px 0">Sin documentos</div>';
  }catch(e){}
}

async function pnDropFiles(e){e.preventDefault();document.getElementById('pn-dz').classList.remove('dg');if(provEditClave){const fd=new FormData();Array.from(e.dataTransfer.files).forEach(f=>fd.append('files',f));await fetch(`/api/proveedores/${provEditClave}/files`,{method:'POST',body:fd});provLoadPanelFiles(provEditClave);toast('Archivos subidos ✓','ok');}}

async function pnUploadFiles(fileList){if(!provEditClave){toast('Guarda el proveedor primero para subir documentos','er');return;}const fd=new FormData();Array.from(fileList).forEach(f=>fd.append('files',f));await fetch(`/api/proveedores/${provEditClave}/files`,{method:'POST',body:fd});provLoadPanelFiles(provEditClave);toast(`${fileList.length} archivo(s) subido(s) ✓`,'ok');}

async function saveProveedor() {
  const nombre = document.getElementById('pn-nombre').value.trim().toUpperCase();
  if(!nombre){toast('El nombre es requerido','er');return;}
  const payload = {
    clave:       document.getElementById('pn-clave').value ? parseInt(document.getElementById('pn-clave').value) : undefined,
    estatus:     document.getElementById('pn-est').value,
    nombre,
    rfc:         document.getElementById('pn-rfc').value.trim().toUpperCase(),
    calle:       document.getElementById('pn-calle').value.trim(),
    num_interior:document.getElementById('pn-ni').value.trim(),
    num_exterior:document.getElementById('pn-ne').value.trim(),
    telefono:    document.getElementById('pn-tel').value.trim(),
    clasificacion:document.getElementById('pn-clas').value.trim(),
    fecha_ultima_compra:document.getElementById('pn-fult').value,
    forma_pago:  document.getElementById('pn-fpago').value,
    terminos_pago:document.getElementById('pn-tpago').value.trim(),
    moneda:      document.getElementById('pn-moneda').value,
  };
  try {
    const url  = provEditClave ? `/api/proveedores/${provEditClave}` : '/api/proveedores';
    const meth = provEditClave ? 'PUT' : 'POST';
    const d = await fetch(url,{method:meth,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    if(!provEditClave) {
      provEditClave = d.record.clave;
      document.getElementById('pn-doc-section').style.display='';
    }
    closeMo('mo-prov-new');
    await loadProveedores();
    toast((provEditClave?'Proveedor actualizado':'Proveedor creado')+' ✓','ok');
  }catch(e){toast('Error: '+e.message,'er');}
}

async function deleteProveedor() {
  if(!provEditClave||!confirm('¿Eliminar este proveedor?')) return;
  try {
    const d = await fetch(`/api/proveedores/${provEditClave}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-prov-new');
    await loadProveedores();
    toast('Proveedor eliminado','ok');
  }catch(e){toast('Error','er');}
}

// Import
function provOpenImport(){provImpFile=null;document.getElementById('prov-imp-file').value='';document.getElementById('prov-imp-fname').textContent='—';document.getElementById('prov-imp-result').style.display='none';document.getElementById('btn-prov-imp-run').disabled=true;document.getElementById('mo-prov-imp').classList.add('on');}
function onProvImpFile(inp){if(inp.files.length){provImpFile=inp.files[0];document.getElementById('prov-imp-fname').textContent=provImpFile.name;document.getElementById('btn-prov-imp-run').disabled=false;}}
function provDropImport(e){e.preventDefault();document.getElementById('prov-dz-imp').classList.remove('dg');const f=e.dataTransfer.files[0];if(f){provImpFile=f;document.getElementById('prov-imp-fname').textContent=f.name;document.getElementById('btn-prov-imp-run').disabled=false;}}
async function runProvImport(){
  if(!provImpFile)return;
  const btn=document.getElementById('btn-prov-imp-run');btn.disabled=true;btn.textContent='Importando…';
  const fd=new FormData();fd.append('file',provImpFile);fd.append('mode',document.getElementById('prov-imp-mode').value);
  try{
    const d=await fetch('/api/proveedores/import',{method:'POST',body:fd}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    const res=document.getElementById('prov-imp-result');
    res.style.display='';res.textContent=`✓ ${d.imported} proveedores importados · Total: ${d.total}`;
    await loadProveedores();toast(d.imported+' proveedores importados ✓','ok',5000);
  }catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

// Init on load
document.addEventListener('DOMContentLoaded',()=>{ loadProveedores(); });

// ════════════════════════════════════════════════════════
//  CATÁLOGOS (Eléctrico / Mecánico / Servicios)
// ════════════════════════════════════════════════════════
const catData = {electrico:[], mecanico:[], servicios:[]};
let catImpFile = null, catEditCode = null;

async function loadCatalogo(tipo) {
  try {
    const d = await fetch(`/api/catalogo/${tipo}`).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    catData[tipo] = d.records;
    catRender(tipo);
    document.getElementById(`cat-${tipo}-dot`).style.background='var(--green)';
    document.getElementById(`cat-${tipo}-lbl`).textContent=`${d.records.length} items`;
  } catch(e){toast('Error cargando catálogo','er');}
}

function catRender(tipo) {
  const gs = (document.getElementById(`cat-${tipo}-gs`).value||'').toLowerCase();
  const rows = catData[tipo].filter(r=>
    [r.brand,r.part_number,r.description,r.code,r.label_code].join(' ').toLowerCase().includes(gs));
  const fmt = v=>v?'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2}):'—';
  const hasLabel = tipo!=='servicios';
  document.getElementById(`cat-${tipo}-tb`).innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="catOpenEdit('${tipo}','${r.code}')">
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-weight:700;font-size:12px">${esc(r.code||'')}</td>
      <td><b>${esc(r.brand||'')}</b></td>
      <td style="font-family:'DM Mono',monospace;color:var(--text)">${esc(r.part_number||'')}</td>
      <td style="color:var(--muted2)">${esc(r.description||'')}</td>
      ${hasLabel?`<td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(r.label_code||'—')}</td>`:''}
      <td style="text-align:right;font-weight:600;color:var(--green)">${fmt(r.last_price)}</td>
    </tr>`).join('');
  document.getElementById(`cat-${tipo}-count`).textContent=`${rows.length} items`;
}

function catOpenNew(tipo) {
  catEditCode = null;
  document.getElementById('cn-tipo').value = tipo;
  document.getElementById('cat-new-title').textContent = `Nuevo Item — Catálogo ${tipo.charAt(0).toUpperCase()+tipo.slice(1)}`;
  document.getElementById('btn-cat-del').style.display = 'none';
  ['cn-code','cn-brand','cn-pnum','cn-desc','cn-price','cn-label'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cn-label-row').style.display = tipo==='servicios' ? 'none' : '';
  document.getElementById('mo-cat-new').classList.add('on');
}

function catOpenEdit(tipo, code) {
  const r = catData[tipo].find(x=>x.code===code); if(!r) return;
  catEditCode = code;
  document.getElementById('cn-tipo').value = tipo;
  document.getElementById('cat-new-title').textContent = `Editar Item — ${code}`;
  document.getElementById('btn-cat-del').style.display = '';
  document.getElementById('cn-code').value  = r.code;
  document.getElementById('cn-code').readOnly = true;
  document.getElementById('cn-brand').value = r.brand||'';
  document.getElementById('cn-pnum').value  = r.part_number||'';
  document.getElementById('cn-desc').value  = r.description||'';
  document.getElementById('cn-price').value = r.last_price||'';
  document.getElementById('cn-label').value = r.label_code||'';
  document.getElementById('cn-label-row').style.display = tipo==='servicios' ? 'none' : '';
  document.getElementById('mo-cat-new').classList.add('on');
}

async function saveCatalogoItem() {
  const tipo  = document.getElementById('cn-tipo').value;
  const brand = document.getElementById('cn-brand').value.trim().toUpperCase();
  const pnum  = document.getElementById('cn-pnum').value.trim().toUpperCase();
  if(!brand||!pnum){toast('Marca y No. Parte son requeridos','er');return;}
  const payload = {
    code: document.getElementById('cn-code').value.trim().toUpperCase(),
    brand, part_number: pnum,
    description: document.getElementById('cn-desc').value.trim(),
    last_price: parseFloat(document.getElementById('cn-price').value)||0,
    label_code: document.getElementById('cn-label').value.trim().toUpperCase(),
  };
  try {
    const url  = catEditCode ? `/api/catalogo/${tipo}/${catEditCode}` : `/api/catalogo/${tipo}`;
    const meth = catEditCode ? 'PUT' : 'POST';
    const d = await fetch(url,{method:meth,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-cat-new');
    document.getElementById('cn-code').readOnly = false;
    await loadCatalogo(tipo);
    toast((catEditCode?'Item actualizado':'Item creado')+' ✓','ok');
  } catch(e){toast('Error: '+e.message,'er');}
}

async function deleteCatalogoItem() {
  const tipo = document.getElementById('cn-tipo').value;
  if(!catEditCode || !confirm(`¿Eliminar ${catEditCode}?`)) return;
  try {
    const d = await fetch(`/api/catalogo/${tipo}/${catEditCode}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-cat-new');
    document.getElementById('cn-code').readOnly = false;
    await loadCatalogo(tipo);
    toast('Item eliminado','ok');
  } catch(e){toast('Error: '+e.message,'er');}
}

// Import
function catOpenImport(tipo){
  catImpFile=null;
  document.getElementById('ci-tipo').value = tipo;
  document.getElementById('cat-imp-title').textContent = `Importar Catálogo ${tipo.charAt(0).toUpperCase()+tipo.slice(1)}`;
  document.getElementById('cat-imp-file').value='';
  document.getElementById('cat-imp-fname').textContent='—';
  document.getElementById('cat-imp-result').style.display='none';
  document.getElementById('btn-cat-imp-run').disabled=true;
  document.getElementById('mo-cat-imp').classList.add('on');
}
function onCatImpFile(inp){if(inp.files.length){catImpFile=inp.files[0];document.getElementById('cat-imp-fname').textContent=catImpFile.name;document.getElementById('btn-cat-imp-run').disabled=false;}}
function catDropImport(e){e.preventDefault();document.getElementById('cat-dz-imp').classList.remove('dg');const f=e.dataTransfer.files[0];if(f){catImpFile=f;document.getElementById('cat-imp-fname').textContent=f.name;document.getElementById('btn-cat-imp-run').disabled=false;}}
async function runCatImport(){
  const tipo = document.getElementById('ci-tipo').value;
  if(!catImpFile)return;
  const btn=document.getElementById('btn-cat-imp-run');btn.disabled=true;btn.textContent='Importando…';
  const fd=new FormData();fd.append('file',catImpFile);fd.append('mode',document.getElementById('cat-imp-mode').value);
  try{
    const d=await fetch(`/api/catalogo/${tipo}/import`,{method:'POST',body:fd}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    const res=document.getElementById('cat-imp-result');
    res.style.display='';res.textContent=`✓ ${d.imported} items importados · Total: ${d.total}`;
    await loadCatalogo(tipo);toast(d.imported+' items importados ✓','ok',5000);
  }catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

// Init on load
document.addEventListener('DOMContentLoaded',()=>{
  loadCatalogo('electrico');
  loadCatalogo('mecanico');
  loadCatalogo('servicios');
});

// ════════════════════════════════════════════════════════
//  NUEVA ORDEN DE COMPRA (GPO)
// ════════════════════════════════════════════════════════
let gpoItems = [], gpoSupplier = null, gpoJobs = [];

async function openNewGPO() {
  gpoItems = []; gpoSupplier = null;
  // Reset supplier
  gpoClearSupplier();
  // Reset header fields
  ['gpo-ptsv','gpo-cpo','gpo-notes','gpo-item-search',
   'gi-code','gi-brand','gi-pnum','gi-desc','gi-price','gi-label','gi-notes'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value='';
  });
  gpoClearCPOSuggest();
  // Reset moneda to USD
  document.getElementById('gpo-mon-usd').checked = true;
  document.getElementById('gpo-mon-usd-lbl').style.borderColor = 'var(--gold)';
  document.getElementById('gpo-mon-mxn-lbl').style.borderColor = 'var(--border)';
  document.getElementById('gpo-fx-row').style.display = 'none';
  gpoCurrentFX = null;
  document.getElementById('gi-qty').value = '1';
  document.getElementById('gi-total').value = '';
  document.getElementById('gpo-job-type').value = 'Unico';
  document.getElementById('gpo-item-results').style.display='none';
  document.getElementById('gpo-items-list').style.display='none';
  document.getElementById('gpo-items-tb').innerHTML='';
  document.getElementById('gpo-subtotal').textContent='$0.00';
  document.getElementById('btn-gpo-save').disabled=true;
  gpoLoadEsquemas();
  // Load next PO number
  try {
    const d = await fetch('/api/gpo').then(r=>r.json());
    document.getElementById('gpo-num-preview').textContent = d.next_number||'PO-…';
  } catch(e){}
  // Populate job selector
  await gpoUpdateJobList();
  gpoJobTypeChange();
  document.getElementById('mo-gpo').classList.add('on');
}

// ── Supplier search
async function gpoSearchSupplier(q) {
  const res = document.getElementById('gpo-sup-results');
  if(!q||q.length<2){res.style.display='none';return;}
  try {
    const d = await fetch(`/api/proveedores?q=${encodeURIComponent(q)}`).then(r=>r.json());
    const list = (d.records||[]).slice(0,8);
    if(!list.length){res.style.display='none';return;}
    res.style.display='';
    res.innerHTML = list.map((p,i)=>`
      <div class="gpo-sup-item" data-idx="${i}"
        style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center"
        onmouseenter="this.style.background='rgba(0,0,0,.05)'" onmouseleave="this.style.background=''">
        <div style="flex:1">
          <div style="font-weight:700;font-size:12px">${esc(p.nombre||'')}</div>
          <div style="font-size:10px;color:var(--muted)">RFC: ${esc(p.rfc||'')} · ${esc(p.moneda||'MXN')}</div>
        </div>
      </div>`).join('');
    // Store supplier list and attach click handlers
    res._suppliers = list;
    res.querySelectorAll('.gpo-sup-item').forEach(el=>{
      el.addEventListener('click', ()=>{
        gpoSelectSupplier(res._suppliers[parseInt(el.dataset.idx)]);
      });
    });
  }catch(e){console.error(e);}
}

function gpoSelectSupplier(p) {
  gpoSupplier = p;
  document.getElementById('gpo-sup-results').style.display='none';
  document.getElementById('gpo-sup-search').value='';
  document.getElementById('gpo-sup-card').style.display='';
  document.getElementById('gpo-sup-nombre').textContent = p.nombre||'';
  document.getElementById('gpo-sup-rfc').textContent    = p.rfc||'—';
  document.getElementById('gpo-sup-moneda').textContent = p.moneda||'MXN';
  document.getElementById('gpo-sup-pago').textContent   = p.forma_pago||'—';
  document.getElementById('gpo-sup-data').value = JSON.stringify(p);
}

function gpoClearSupplier() {
  gpoSupplier = null;
  document.getElementById('gpo-sup-card').style.display='none';
  document.getElementById('gpo-sup-search').value='';
  document.getElementById('gpo-sup-results').style.display='none';
  document.getElementById('gpo-sup-data').value='';
}

// ── Job type & selector
async function gpoUpdateJobList() {
  const ptsvVal = (document.getElementById('gpo-ptsv')?.value||'').trim().toUpperCase();
  // Build job list: all jobs + filter by PT/SV if provided
  let jobList = (jobs||[]).map(j=>j.job_number);
  if(ptsvVal) {
    try {
      // Try to find PT or SV records that list related jobs
      const [ptd, svd] = await Promise.all([
        fetch('/api/pt').then(r=>r.json()).catch(()=>({records:[]})),
        fetch('/api/sv').then(r=>r.json()).catch(()=>({records:[]}))
      ]);
      const ptRec = (ptd.records||[]).find(r=>r.pt_number===ptsvVal);
      const svRec = (svd.records||[]).find(r=>r.sv_number===ptsvVal);
      const related = ptRec?.jobs || svRec?.jobs || [];
      if(related.length) jobList = related;
    }catch(e){}
  }
  gpoJobs = jobList;
  const makeOpts = (sel) => {
    const el = document.getElementById(sel); if(!el) return;
    el.innerHTML = '<option value="">— Seleccionar —</option>' +
      jobList.map(j=>`<option value="${esc(j)}">${esc(j)}</option>`).join('');
  };
  makeOpts('gpo-job-unico');
  makeOpts('gi-job');
}

function gpoJobTypeChange() {
  const t = document.getElementById('gpo-job-type').value;
  const uniWrap = document.getElementById('gpo-job-unico-wrap');
  const giJobWrap = document.getElementById('gi-job-wrap');
  uniWrap.style.display  = t==='Unico' ? '' : 'none';
  giJobWrap.style.display = t==='Multiple' ? '' : 'none';
  if(t !== 'Unico') gpoClearCPOSuggest();
}

// ── Búsqueda automática de CPO según el Job seleccionado ──
async function gpoAutoFillCPO() {
  const job = document.getElementById('gpo-job-unico')?.value?.trim().toUpperCase();
  const cpoInput   = document.getElementById('gpo-cpo');
  const suggestSel = document.getElementById('gpo-cpo-suggest');
  const statusEl   = document.getElementById('gpo-cpo-status');
  if(!job){ gpoClearCPOSuggest(); return; }

  statusEl.textContent = 'Buscando CPO del Job…';
  suggestSel.style.display = 'none';
  try {
    const d = await fetch(`/api/cpo/by-job/${encodeURIComponent(job)}`).then(r=>r.json());
    const records = d.records || [];
    if(!records.length){
      cpoInput.value = '';
      statusEl.textContent = `No se encontró ninguna CPO registrada para el Job ${job}. Puedes capturarla manualmente.`;
      return;
    }
    if(records.length === 1){
      cpoInput.value = records[0].id || '';
      statusEl.textContent = `✓ CPO encontrada automáticamente (Cliente: ${records[0].customer || records[0].customer_supplier || '—'})`;
      return;
    }
    // Varias CPO para el mismo Job: se autocompleta con la más reciente y se muestra selector
    cpoInput.value = records[0].id || '';
    suggestSel.innerHTML = records.map(r =>
      `<option value="${esc(r.id)}">${esc(r.id)} — ${esc(r.customer||r.customer_supplier||'—')} (${esc(r.po_number||'')})</option>`
    ).join('');
    suggestSel.style.display = '';
    statusEl.textContent = `⚠ Se encontraron ${records.length} CPO para este Job — verifica cuál corresponde.`;
  } catch(e) {
    statusEl.textContent = 'Error buscando la CPO del Job.';
  }
}

function gpoClearCPOSuggest() {
  const suggestSel = document.getElementById('gpo-cpo-suggest');
  const statusEl   = document.getElementById('gpo-cpo-status');
  if(suggestSel){ suggestSel.style.display = 'none'; suggestSel.innerHTML = ''; }
  if(statusEl) statusEl.textContent = '';
}

// ── Item catalog search
async function gpoSearchItem(q) {
  const res = document.getElementById('gpo-item-results');
  const cat = document.getElementById('gpo-item-cat').value;
  if(!q||q.length<2){res.style.display='none';return;}
  const tipos = cat ? [cat] : ['electrico','mecanico','servicios'];
  let all = [];
  for(const t of tipos){
    const data = catData[t]||[];
    const matches = data.filter(r=>
      [r.brand,r.part_number,r.description,r.code,r.label_code].join(' ').toLowerCase().includes(q.toLowerCase())
    ).slice(0,6).map(r=>({...r,_tipo:t}));
    all = all.concat(matches);
  }
  all = all.slice(0,10);
  if(!all.length){
    res.style.display='';
    res.innerHTML=`<div style="padding:10px 12px;color:var(--muted);font-size:12px">Sin resultados — puedes ingresar el item manualmente abajo.</div>`;
    return;
  }
  res.style.display='';
  res.innerHTML = all.map((r,i)=>`
    <div class="gpo-item-row" data-idx="${i}"
      style="padding:7px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center"
      onmouseenter="this.style.background='rgba(0,0,0,.05)'" onmouseleave="this.style.background=''">
      <div style="flex:1">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase">${esc(r._tipo)}</div>
        <div style="font-family:'DM Mono',monospace;color:var(--gold);font-size:12px">${esc(r.part_number||'')} <span style="color:var(--muted);font-size:10px">${esc(r.code||'')}</span></div>
        <div style="font-size:11px;color:var(--muted2)">${esc(r.brand||'')} · ${esc(r.description||'')}</div>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--green)">${r.last_price?'$'+Number(r.last_price).toFixed(2):'—'}</div>
    </div>`).join('');
  // Store results and attach click handlers
  res._items = all;
  res.querySelectorAll('.gpo-item-row').forEach(el=>{
    el.addEventListener('click', ()=>{
      gpoFillItemForm(res._items[parseInt(el.dataset.idx)]);
    });
  });
}

function gpoFillItemForm(r) {
  document.getElementById('gi-cat-type').value = r._tipo||'electrico';
  document.getElementById('gi-code').value     = r.code||'';
  document.getElementById('gi-brand').value    = r.brand||'';
  document.getElementById('gi-pnum').value     = r.part_number||'';
  document.getElementById('gi-desc').value     = r.description||'';
  document.getElementById('gi-label').value    = r.label_code||'';
  document.getElementById('gi-price').value    = r.last_price||'';
  document.getElementById('gi-qty').value      = '1';
  document.getElementById('gpo-item-results').style.display='none';
  document.getElementById('gpo-item-search').value='';
  gpoCalcItemTotal();
}

function gpoCalcItemTotal() {
  const qty   = parseFloat(document.getElementById('gi-qty').value)||0;
  const price = parseFloat(document.getElementById('gi-price').value)||0;
  document.getElementById('gi-total').value = '$'+((qty*price).toFixed(2));
}

// ── Add item to list
// ── Moneda selector
let gpoCurrentFX = null;

async function gpoMonedaChange() {
  const moneda = document.querySelector('input[name="gpo-moneda"]:checked')?.value || 'USD';
  const fxRow  = document.getElementById('gpo-fx-row');
  const usdLbl = document.getElementById('gpo-mon-usd-lbl');
  const mxnLbl = document.getElementById('gpo-mon-mxn-lbl');

  usdLbl.style.borderColor = moneda==='USD' ? 'var(--gold)' : 'var(--border)';
  mxnLbl.style.borderColor = moneda==='MXN' ? 'var(--red)'  : 'var(--border)';

  if(moneda === 'MXN') {
    fxRow.style.display = '';
    try {
      const d = await fetch('/api/fx/lookup?date='+new Date().toISOString().slice(0,10)).then(r=>r.json());
      if(d.rate) {
        gpoCurrentFX = d.rate;
        document.getElementById('gpo-fx-val').textContent  = d.rate.toFixed(4);
        document.getElementById('gpo-fx-date').textContent = `(${d.date||'último disponible'})`;
      }
    } catch(e) { document.getElementById('gpo-fx-val').textContent = 'No disponible'; }
  } else {
    fxRow.style.display = 'none';
    gpoCurrentFX = null;
  }
  gpoCalcItemTotal();
}

// ── Número a letras (español)
function numeroALetras(num) {
  const u  = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
               'diez','once','doce','trece','catorce','quince','dieciséis',
               'diecisiete','dieciocho','diecinueve'];
  const d  = ['','','veinte','treinta','cuarenta','cincuenta','sesenta',
               'setenta','ochenta','noventa'];
  const c  = ['','cien','doscientos','trescientos','cuatrocientos','quinientos',
               'seiscientos','setecientos','ochocientos','novecientos'];
  function _c(n) {
    if(n<20)  return u[n];
    if(n<100) return d[Math.floor(n/10)] + (n%10 ? ' y '+u[n%10] : '');
    if(n===100) return 'cien';
    return c[Math.floor(n/100)] + (n%100 ? ' '+_c(n%100) : '');
  }
  function _m(n) {
    if(n===0)    return 'cero';
    if(n<1000)   return _c(n);
    if(n<2000)   return 'mil' + (n%1000 ? ' '+_c(n%1000) : '');
    if(n<1000000)return _c(Math.floor(n/1000))+' mil'+(n%1000 ? ' '+_c(n%1000) : '');
    if(n<2000000)return 'un millón'+(n%1000000 ? ' '+_m(n%1000000) : '');
    return _c(Math.floor(n/1000000))+' millones'+(n%1000000 ? ' '+_m(n%1000000) : '');
  }
  const entero  = Math.floor(Math.abs(num));
  const decimal = Math.round((Math.abs(num) - entero) * 100);
  const letras  = _m(entero).toUpperCase();
  return decimal > 0 ? `${letras} ${String(decimal).padStart(2,'0')}/100` : `${letras} 00/100`;
}


function gpoAddItem() {
  const brand = document.getElementById('gi-brand').value.trim().toUpperCase();
  const pnum  = document.getElementById('gi-pnum').value.trim().toUpperCase();
  const desc  = document.getElementById('gi-desc').value.trim();
  const qty   = parseInt(document.getElementById('gi-qty').value)||0;
  const price = parseFloat(document.getElementById('gi-price').value)||0;
  if(!brand||!pnum||!desc){toast('Marca, No. Parte y Descripción son requeridos','er');return;}
  if(qty<1){toast('La cantidad debe ser al menos 1','er');return;}

  const jobType = document.getElementById('gpo-job-type').value;
  let itemJob = '';
  if(jobType==='Multiple')        itemJob = document.getElementById('gi-job').value;
  else if(jobType==='Unico')      itemJob = document.getElementById('gpo-job-unico').value;
  else                             itemJob = jobType;

  gpoItems.push({
    line:        gpoItems.length+1,
    cat_type:    document.getElementById('gi-cat-type').value,
    cat_code:    document.getElementById('gi-code').value.trim().toUpperCase(),
    brand, part_number: pnum, description: desc,
    label_code:  document.getElementById('gi-label').value.trim().toUpperCase(),
    quantity:    qty,
    unit_price:  price,
    total:       Math.round(qty*price*100)/100,
    job:         itemJob,
    notes:       document.getElementById('gi-notes').value.trim(),
  });

  // Reset item form
  ['gi-code','gi-brand','gi-pnum','gi-desc','gi-price','gi-label','gi-notes','gi-total'].forEach(id=>{
    document.getElementById(id).value='';
  });
  document.getElementById('gi-qty').value='1';

  gpoRenderItems();
  gpoUpdateSaveBtnState();
}

function gpoRenderItems() {
  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const catBadge = {electrico:'⚡',mecanico:'⚙',servicios:'🔧',major:'⭐'};
  const total = gpoItems.reduce((s,i)=>s+i.total,0);
  document.getElementById('gpo-items-tb').innerHTML = gpoItems.map((i,idx)=>`
    <tr>
      <td style="color:var(--muted)">${i.line}</td>
      <td>${catBadge[i.cat_type]||''}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--gold)">${esc(i.cat_code||'—')}</td>
      <td style="font-weight:600">${esc(i.brand)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${esc(i.part_number)}</td>
      <td style="color:var(--muted2)">${esc(i.description)}</td>
      <td style="text-align:right">${i.quantity}</td>
      <td style="text-align:right">${fmt(i.unit_price)}</td>
      <td style="text-align:right;font-weight:700;color:var(--green)">${fmt(i.total)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--gold)">${esc(i.job||'—')}</td>
      <td style="color:var(--muted);font-size:10px">${esc(i.notes||'')}</td>
      <td><button onclick="gpoRemoveItem(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer">✕</button></td>
    </tr>`).join('');
  document.getElementById('gpo-subtotal').textContent = fmt(total);
  document.getElementById('gpo-items-list').style.display = gpoItems.length?'':'none';
  const esqFolio = document.getElementById('gpo-esquema')?.value;
  gpoUpdateTotalPreview(gpoEsquemasCache.find(e=>e.folio===esqFolio));
  gpoUpdateSaveBtnState();
}

function gpoRemoveItem(idx) {
  gpoItems.splice(idx,1);
  gpoItems.forEach((i,n)=>i.line=n+1);
  gpoRenderItems();
  gpoUpdateSaveBtnState();
}

let gpoEsquemasCache = [];

async function gpoLoadEsquemas() {
  const sel = document.getElementById('gpo-esquema');
  sel.innerHTML = '<option value="">Cargando…</option>';
  document.getElementById('gpo-esquema-detail').style.display = 'none';
  try {
    const d = await fetch('/api/esquemas-tributarios').then(r=>r.json());
    gpoEsquemasCache = d.records || [];
    sel.innerHTML = '<option value="">Selecciona el esquema tributario…</option>' +
      gpoEsquemasCache.map(e => `<option value="${esc(e.folio)}">${esc(e.folio)} — ${esc(e.nombre)}</option>`).join('');
  } catch(e) {
    sel.innerHTML = '<option value="">Error cargando esquemas</option>';
  }
}

function gpoEsquemaChange() {
  const folio = document.getElementById('gpo-esquema').value;
  const detail = document.getElementById('gpo-esquema-detail');
  const esquema = gpoEsquemasCache.find(e => e.folio === folio);
  if(!esquema) { detail.style.display = 'none'; gpoUpdateSaveBtnState(); return; }
  const pct = v => `${Number(v||0).toLocaleString('en-US',{maximumFractionDigits:4})}%`;
  detail.innerHTML = `
    <span>IVA Trasl.: <b style="color:var(--gold)">${pct(esquema.iva_trasladado)}</b></span>
    <span>ISR Ret.: <b style="color:var(--gold)">${pct(esquema.isr_retenido)}</b></span>
    <span>IVA Ret.: <b style="color:var(--gold)">${pct(esquema.iva_retenido)}</b></span>
    <span>IEPS: <b style="color:var(--gold)">${pct(esquema.ieps)}</b></span>`;
  detail.style.display = 'flex';
  gpoUpdateTotalPreview(esquema);
  gpoUpdateSaveBtnState();
}

function gpoUpdateTotalPreview(esquema) {
  const wrap = document.getElementById('gpo-total-preview-wrap');
  if(!esquema || !gpoItems.length) { wrap.style.display = 'none'; return; }
  const subtotal = gpoItems.reduce((s,i)=>s+i.total,0);
  const ivaAmt   = subtotal * (parseFloat(esquema.iva_trasladado)||0) / 100;
  const isrAmt   = subtotal * (parseFloat(esquema.isr_retenido)||0) / 100;
  const ivaRAmt  = subtotal * (parseFloat(esquema.iva_retenido)||0) / 100;
  const iepsAmt  = subtotal * (parseFloat(esquema.ieps)||0) / 100;
  const total = subtotal + ivaAmt - isrAmt - ivaRAmt + iepsAmt;
  document.getElementById('gpo-total-preview').textContent = '$'+total.toLocaleString('en-US',{minimumFractionDigits:2});
  wrap.style.display = 'flex';
}

function gpoUpdateSaveBtnState() {
  const hasItems   = gpoItems.length > 0;
  const hasEsquema = !!document.getElementById('gpo-esquema')?.value;
  document.getElementById('btn-gpo-save').disabled = !(hasItems && hasEsquema);
}

// ── Save GPO
async function deleteGPO(poNumber) {
  if(!confirm(`¿Eliminar la PO ${poNumber} y todos sus items?\nEsta acción no se puede deshacer.`)) return;
  try {
    const d = await fetch(`/api/gpo/${poNumber}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    await loadPO();
    toast(`PO ${poNumber} eliminada ✓`,'ok');
  } catch(e){toast('Error: '+e.message,'er');}
}

async function deleteIPO(year, clave) {
  if(!confirm(`¿Eliminar el registro de OC ${clave}?`)) return;
  try {
    const d = await fetch(`/api/po/${year}/${clave}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    await loadPO();
    toast('Registro eliminado ✓','ok');
  } catch(e){toast('Error: '+e.message,'er');}
}

async function saveGPO() {
  if(!gpoSupplier){toast('Selecciona un proveedor','er');return;}
  if(!gpoItems.length){toast('Agrega al menos un item','er');return;}
  const jobType = document.getElementById('gpo-job-type').value;
  if(jobType==='Unico' && !document.getElementById('gpo-job-unico').value){
    toast('Selecciona el Job único','er');return;
  }
  const esquemaFolio = document.getElementById('gpo-esquema').value;
  if(!esquemaFolio){ toast('Selecciona el Esquema Tributario antes de emitir la Orden de Compra','er'); return; }
  const esquemaSel = gpoEsquemasCache.find(e => e.folio === esquemaFolio);
  const btn = document.getElementById('btn-gpo-save');
  btn.disabled=true; btn.textContent='Guardando…';
  try {
    const moneda   = document.querySelector('input[name="gpo-moneda"]:checked')?.value || 'USD';
    const payload = {
      supplier:  gpoSupplier,
      pt_sv:     document.getElementById('gpo-ptsv').value.trim().toUpperCase(),
      cpo:       document.getElementById('gpo-cpo').value.trim().toUpperCase(),
      job_type:  jobType,
      job:       jobType==='Unico'?document.getElementById('gpo-job-unico').value:
                 (jobType in {Shopfloor:1,'Fix Asset':1}?jobType:''),
      items:     gpoItems,
      notes:     document.getElementById('gpo-notes').value.trim(),
      iva_pct:   parseFloat(esquemaSel?.iva_trasladado)||0,
      esquema_tributario: esquemaSel || null,
      moneda,
      fx_rate:   moneda==='MXN' ? (gpoCurrentFX||null) : null,
    };
    const d = await fetch('/api/gpo',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-gpo');
    toast(`PO emitida: ${d.po_number} · ${gpoItems.length} items ✓`,'ok',6000);
    // Abrir PDF en nueva pestaña
    setTimeout(()=>window.open(`/api/gpo/${d.po_number}/pdf`,'_blank'),500);
    await loadPO();
  }catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='💾 Emitir Orden de Compra';}
}

// ════════════════════════════════════════════════════════
//  PT IMPORT
// ════════════════════════════════════════════════════════
let ptImpFile = null;
function ptOpenImport(){
  ptImpFile=null;
  document.getElementById('pt-imp-file').value='';
  document.getElementById('pt-imp-fname').textContent='—';
  document.getElementById('pt-imp-result').style.display='none';
  document.getElementById('btn-pt-imp-run').disabled=true;
  document.getElementById('mo-pt-imp').classList.add('on');
}
function onPtImpFile(inp){if(inp.files.length){ptImpFile=inp.files[0];document.getElementById('pt-imp-fname').textContent=ptImpFile.name;document.getElementById('btn-pt-imp-run').disabled=false;}}
function ptDropImport(e){e.preventDefault();document.getElementById('pt-dz-imp').classList.remove('dg');const f=e.dataTransfer.files[0];if(f){ptImpFile=f;document.getElementById('pt-imp-fname').textContent=f.name;document.getElementById('btn-pt-imp-run').disabled=false;}}
async function runPtImport(){
  if(!ptImpFile)return;
  const btn=document.getElementById('btn-pt-imp-run');btn.disabled=true;btn.textContent='Importando…';
  const fd=new FormData();fd.append('file',ptImpFile);fd.append('mode',document.getElementById('pt-imp-mode').value);
  try{
    const d=await fetch('/api/pt/import',{method:'POST',body:fd}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    const res=document.getElementById('pt-imp-result');
    res.style.display='';res.textContent=`✓ ${d.imported} PT importados · Total: ${d.total}`;
    await loadPt();toast(d.imported+' PT Numbers importados ✓','ok',5000);
  }catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

// ════════════════════════════════════════════════════════
//  SV IMPORT
// ════════════════════════════════════════════════════════
let svImpFile = null;
function svOpenImport(){
  svImpFile=null;
  document.getElementById('sv-imp-file').value='';
  document.getElementById('sv-imp-fname').textContent='—';
  document.getElementById('sv-imp-result').style.display='none';
  document.getElementById('btn-sv-imp-run').disabled=true;
  document.getElementById('mo-sv-imp').classList.add('on');
}
function onSvImpFile(inp){if(inp.files.length){svImpFile=inp.files[0];document.getElementById('sv-imp-fname').textContent=svImpFile.name;document.getElementById('btn-sv-imp-run').disabled=false;}}
function svDropImport(e){e.preventDefault();document.getElementById('sv-dz-imp').classList.remove('dg');const f=e.dataTransfer.files[0];if(f){svImpFile=f;document.getElementById('sv-imp-fname').textContent=f.name;document.getElementById('btn-sv-imp-run').disabled=false;}}
async function runSvImport(){
  if(!svImpFile)return;
  const btn=document.getElementById('btn-sv-imp-run');btn.disabled=true;btn.textContent='Importando…';
  const fd=new FormData();fd.append('file',svImpFile);fd.append('mode',document.getElementById('sv-imp-mode').value);
  try{
    const d=await fetch('/api/sv/import',{method:'POST',body:fd}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    const res=document.getElementById('sv-imp-result');
    res.style.display='';res.textContent=`✓ ${d.imported} SV importados · Total: ${d.total}`;
    await loadSv();toast(d.imported+' SV Numbers importados ✓','ok',5000);
  }catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='Importar →';}
}

// ════════════════════════════════════════════════════════
//  CONFIGURAR PROYECTO
// ════════════════════════════════════════════════════════
let pcCurrentPTSV = null, pcJobRows = [];
let pcCurrentTab = 'presupuesto';
let pcPersonalSaved = [];      // filas guardadas [{employee, days:{date:hours}}]
let pcPersonalRatesMap = {};   // {employee: rate} del Hourly Rate Register del año vigente
let pcPersonalRange = null;    // {start: Date, end: Date} derivado de Timing
let _pcPersonalRowSeq = 0;

function pcSwitchTab(tab) {
  pcCurrentTab = tab;
  const tabs = {presupuesto:'pc-tab-presupuesto', timing:'pc-tab-timing', abiertos:'pc-tab-abiertos', cambios:'pc-tab-cambios', personal:'pc-tab-personal'};
  Object.entries(tabs).forEach(([k,id])=>{
    const el = document.getElementById(id); if(!el) return;
    el.style.background = k===tab ? 'var(--red)' : 'rgba(0,0,0,.055)';
    el.style.color      = k===tab ? '#fff' : 'var(--muted)';
  });
  ['presupuesto','timing','abiertos','cambios','personal'].forEach(k=>{
    const el = document.getElementById(`pc-content-${k}`); if(el) el.style.display = (k===tab)?'':'none';
  });
  if(tab==='timing') pcUpdateTimingCalcs();
  if(tab==='personal') pcRefreshPersonalTab();
}

async function pcSearch(q) {
  const res = document.getElementById('pc-ptsv-results');
  if(!q || q.length < 2) { res.style.display='none'; return; }
  const qu = q.toUpperCase();
  // Search in PT and SV data
  const ptMatches = (typeof ptData !== 'undefined' ? ptData : []).filter(r =>
    r.pt_number?.toUpperCase().includes(qu));
  const svMatches = (typeof svData !== 'undefined' ? svData : []).filter(r =>
    r.sv_number?.toUpperCase().includes(qu));
  const all = [
    ...ptMatches.map(r => ({label: r.pt_number, type:'PT', jobs: r.jobs||[], customer: r.customer||''})),
    ...svMatches.map(r => ({label: r.sv_number, type:'SV', jobs: r.jobs||[], customer: r.customer||''})),
  ].slice(0,8);
  if(!all.length) { res.style.display='none'; return; }
  res.style.display='';
  res.innerHTML = all.map((r,i) => `
    <div class="pc-res-item" data-idx="${i}"
      style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border)"
      onmouseenter="this.style.background='rgba(0,0,0,.05)'" onmouseleave="this.style.background=''">
      <div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--gold)">${esc(r.label)}</div>
      <div style="font-size:10px;color:var(--muted)">${r.type} · ${esc(r.customer)} · ${r.jobs.length} jobs</div>
    </div>`).join('');
  res._data = all;
  res.querySelectorAll('.pc-res-item').forEach(el => {
    el.addEventListener('click', () => pcSelectPTSV(res._data[parseInt(el.dataset.idx)]));
  });
}

async function pcSelectPTSV(item) {
  document.getElementById('pc-ptsv-results').style.display='none';
  document.getElementById('pc-ptsv-search').value = item.label;
  pcCurrentPTSV = item.label;
  document.getElementById('pc-header-info').textContent = `${item.label} — ${item.customer}`;

  // Load existing config if any
  let savedRows = {};
  let existingConfig = null;
  try {
    const d = await fetch(`/api/projconfig?q=${encodeURIComponent(item.label)}`).then(r=>r.json());
    existingConfig = (d.records||[]).find(r=>r.ptsv===item.label);
    if(existingConfig) (existingConfig.jobs||[]).forEach(j => { savedRows[j.job_number] = j; });
  } catch(e){}

  // Get job details from jobs array, revenue from CPO sum
  const jobNums = item.jobs;
  const jobDetails = jobNums.map(jn => {
    const j = (typeof jobs !== 'undefined' ? jobs : []).find(x=>x.job_number===jn);
    // Sum all CPO values for this job
    const cpoRevenue = (typeof cpoData !== 'undefined' ? cpoData : [])
      .filter(c => (c.job||'').toString().trim().toUpperCase() === jn.toString().trim().toUpperCase())
      .reduce((sum, c) => sum + (parseFloat(c.value)||0), 0);
    return {
      job_number: jn,
      customer:   j?.customer || (cpoData?.find(c=>c.job===jn)?.customer) || '—',
      revenue:    cpoRevenue,
    };
  });

  pcJobRows = jobDetails;
  pcRenderJobs(jobDetails, savedRows);
  document.getElementById('pc-empty').style.display='none';
  document.getElementById('pc-table-wrap').style.display='';
  document.getElementById('btn-pc-save').disabled=false;

  // Render timing section — small delay to ensure DOM is visible
  const savedTiming = (existingConfig?.timing) || [];
  setTimeout(() => pcRenderTiming(savedTiming), 50);

  // Puntos Abiertos y Control de Cambios
  pcRenderPuntos(existingConfig?.puntos_abiertos || []);
  pcRenderCambios(existingConfig?.control_cambios || []);

  // Plan de Personal — se renderiza al entrar a su pestaña (depende del rango de Timing)
  pcPersonalSaved = existingConfig?.plan_personal || [];

  pcSwitchTab('presupuesto');

  await pcLoadSavedList();
}

function pcRenderJobs(jobDetails, savedRows) {
  const lbl = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:3px';
  const dateInp = 'background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px;width:118px';
  const pctInp  = 'background:var(--inp);border:1px solid rgba(255,193,7,.35);border-radius:4px;color:var(--amber);padding:5px 7px;font-size:12px;width:80px;text-align:right;font-weight:600';
  const estInp  = 'background:var(--inp);border:1px solid rgba(255,193,7,.35);border-radius:4px;color:var(--text);padding:6px 8px;font-size:12px;width:100%;text-align:right';

  document.getElementById('pc-jobs-body').innerHTML = jobDetails.map((j,idx) => {
    const saved = savedRows[j.job_number] || {};
    const revenue = parseFloat(j.revenue)||0;
    // Compatibilidad con nombres de campo anteriores (margen_pct/presupuesto_a → markup_pct/presupuesto_operativo)
    const markupPct = saved.markup_pct ?? saved.margen_pct ?? '';
    const ahorroPct = saved.ahorro_pct ?? '';
    const est = {
      ing_mecanica:  saved.est_ing_mecanica ?? '',
      ing_electrica: saved.est_ing_electrica ?? '',
      major_items:   saved.est_major_items ?? '',
      material_mecanico: saved.est_material_mecanico ?? (saved.est_materiales ?? ''),
      material_electrico: saved.est_material_electrico ?? '',
      servicios_externos: saved.est_servicios_externos ?? '',
      ensamble:      saved.est_ensamble ?? '',
    };
    return `
    <div class="pc-job-card" id="pc-row-${idx}" style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 20px">

      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:14px">
        <div><div style="${lbl}">Job #</div><div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--gold);font-size:15px">${esc(j.job_number)}</div></div>
        <div><div style="${lbl}">Cliente</div><div style="font-weight:600">${esc(j.customer||'—')}</div></div>
        <div><div style="${lbl}">Revenue (CPO)</div><div style="font-weight:700;font-family:'DM Mono',monospace">$${revenue.toLocaleString('en-US',{minimumFractionDigits:2})}</div></div>
        <div><div style="${lbl}">F. Inicio</div><input data-field="fecha_inicio" type="date" value="${saved.fecha_inicio||''}" oninput="pcCalc(${idx})" style="${dateInp}"></div>
        <div><div style="${lbl}">Run Off Interno</div><input data-field="runoff_interno" type="date" value="${saved.runoff_interno||''}" oninput="pcCalc(${idx})" style="${dateInp}"></div>
        <div><div style="${lbl}">Run Off Cliente</div><input data-field="runoff_cliente" type="date" value="${saved.runoff_cliente||''}" oninput="pcCalc(${idx})" style="${dateInp}"></div>
        <div><div style="${lbl}">F. Envío</div><input data-field="fecha_envio" type="date" value="${saved.fecha_envio||''}" oninput="pcCalc(${idx})" style="${dateInp}"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:16px">
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--muted2)">Markup (Calc.) %</span>
            <input data-field="markup_pct" type="number" min="0" max="100" step="0.1" value="${markupPct}" placeholder="%" oninput="pcCalc(${idx})" style="${pctInp}">
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--muted2)">Monto Markup</span>
            <span id="pc-monto-${idx}" style="font-family:'DM Mono',monospace;font-size:13px;color:var(--muted2)">—</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px dashed var(--border)">
            <span style="font-size:12px;font-weight:700">Presupuesto Operativo</span>
            <span id="pc-presa-${idx}" style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:var(--gold)">—</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--muted2)">Target de Ahorro %</span>
            <input data-field="ahorro_pct" type="number" min="0" max="100" step="0.1" value="${ahorroPct}" placeholder="%" oninput="pcCalc(${idx})" style="${pctInp}">
          </div>
          <div style="flex:1"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px dashed var(--border)">
            <span style="font-size:12px;font-weight:700">Presupuesto Disponible</span>
            <span id="pc-presb-${idx}" style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:var(--green)">—</span>
          </div>
        </div>
      </div>

      <div style="border-top:1px dashed var(--border);padding-top:12px">
        <div style="${lbl};margin-bottom:8px">Estimados por Área</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          <div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">Ing. Mecánica</div><input data-field="est_ing_mecanica" type="number" min="0" step="0.01" value="${est.ing_mecanica}" placeholder="$0.00" oninput="pcCalc(${idx})" style="${estInp}"></div>
          <div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">Ing. Eléctrica</div><input data-field="est_ing_electrica" type="number" min="0" step="0.01" value="${est.ing_electrica}" placeholder="$0.00" oninput="pcCalc(${idx})" style="${estInp}"></div>
          <div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">Major Items</div><input data-field="est_major_items" type="number" min="0" step="0.01" value="${est.major_items}" placeholder="$0.00" oninput="pcCalc(${idx})" style="${estInp}"></div>
          <div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">Material Mecánico</div><input data-field="est_material_mecanico" type="number" min="0" step="0.01" value="${est.material_mecanico}" placeholder="$0.00" oninput="pcCalc(${idx})" style="${estInp}"></div>
          <div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">Material Eléctrico</div><input data-field="est_material_electrico" type="number" min="0" step="0.01" value="${est.material_electrico}" placeholder="$0.00" oninput="pcCalc(${idx})" style="${estInp}"></div>
          <div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">Servicios Externos</div><input data-field="est_servicios_externos" type="number" min="0" step="0.01" value="${est.servicios_externos}" placeholder="$0.00" oninput="pcCalc(${idx})" style="${estInp}"></div>
          <div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">Ensamble</div><input data-field="est_ensamble" type="number" min="0" step="0.01" value="${est.ensamble}" placeholder="$0.00" oninput="pcCalc(${idx})" style="${estInp}"></div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:28px;margin-top:10px">
          <div style="text-align:right"><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Suma</div>
            <div id="pc-suma-${idx}" style="font-family:'DM Mono',monospace;font-weight:700;font-size:13px">—</div></div>
          <div style="text-align:right"><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Delta vs Disponible</div>
            <div id="pc-delta-${idx}" style="font-family:'DM Mono',monospace;font-weight:700;font-size:13px">—</div></div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Initial calc for saved rows
  jobDetails.forEach((_,idx) => pcCalc(idx));
}

function pcCalc(idx) {
  const row = document.querySelector(`#pc-row-${idx}`);
  if(!row) return;
  const f = field => parseFloat(row.querySelector(`[data-field="${field}"]`)?.value)||0;
  const revenue   = parseFloat(pcJobRows[idx]?.revenue)||0;
  const markupPct = f('markup_pct');
  const ahorroPct = f('ahorro_pct');
  const estSum    = f('est_ing_mecanica') + f('est_ing_electrica') + f('est_major_items') + f('est_material_mecanico') + f('est_material_electrico') + f('est_servicios_externos') + f('est_ensamble');
  const fmt = v => '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2});

  const montoMarkup = revenue - (revenue / (1 + markupPct/100));
  const presOperativo = revenue - montoMarkup;
  const presDisponible = presOperativo - (presOperativo * ahorroPct / 100);
  const delta = presDisponible - estSum;
  const deltaMatch = Math.abs(delta) < 0.02;

  document.getElementById(`pc-monto-${idx}`).textContent = fmt(montoMarkup);
  document.getElementById(`pc-presa-${idx}`).textContent = fmt(presOperativo);
  document.getElementById(`pc-presb-${idx}`).textContent = fmt(presDisponible);
  const sumaEl = document.getElementById(`pc-suma-${idx}`);
  const deltaEl = document.getElementById(`pc-delta-${idx}`);
  if(sumaEl) sumaEl.textContent = fmt(estSum);
  if(deltaEl) {
    deltaEl.textContent = fmt(delta);
    deltaEl.style.color = estSum===0 ? 'var(--muted)' : deltaMatch ? 'var(--green)' : (delta<0 ? 'var(--red)' : 'var(--amber)');
    deltaEl.title = deltaMatch ? '✓ Suma de estimados igual al Presupuesto Disponible' : (delta<0 ? 'Los estimados exceden el Presupuesto Disponible' : 'Queda margen sin asignar');
  }
  pcUpdateTotals();
}

function pcUpdateTotals() {
  let totRev=0, totA=0, totB=0, totSuma=0;
  pcJobRows.forEach((_,idx) => {
    const row = document.querySelector(`#pc-row-${idx}`);
    if(!row) return;
    const f = field => parseFloat(row.querySelector(`[data-field="${field}"]`)?.value)||0;
    const revenue   = parseFloat(pcJobRows[idx]?.revenue)||0;
    const markupPct = f('markup_pct');
    const ahorroPct = f('ahorro_pct');
    const montoMarkup = revenue - (revenue / (1 + markupPct/100));
    const presOperativo = revenue - montoMarkup;
    const presDisponible = presOperativo - (presOperativo * ahorroPct / 100);
    const estSum = f('est_ing_mecanica') + f('est_ing_electrica') + f('est_major_items') + f('est_material_mecanico') + f('est_material_electrico') + f('est_servicios_externos') + f('est_ensamble');
    totRev += revenue; totA += presOperativo; totB += presDisponible; totSuma += estSum;
  });
  const fmt = v => '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('pc-total-revenue').textContent = fmt(totRev);
  document.getElementById('pc-total-presa').textContent   = fmt(totA);
  document.getElementById('pc-total-presb').textContent   = fmt(totB);
  const sumaTotEl = document.getElementById('pc-total-suma');
  if(sumaTotEl) sumaTotEl.textContent = fmt(totSuma);
  pcRenderResumenAreas();
}

function pcRenderResumenAreas() {
  const tb = document.getElementById('pc-resumen-areas-tb');
  if(!tb) return;
  const fmt = v => '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2});
  const cols = ['est_material_mecanico','est_material_electrico','est_major_items','est_ing_mecanica','est_ing_electrica','est_ensamble'];
  const totals = {est_material_mecanico:0, est_material_electrico:0, est_major_items:0, est_ing_mecanica:0, est_ing_electrica:0, est_ensamble:0};

  const rowsHtml = pcJobRows.map((j,idx) => {
    const row = document.querySelector(`#pc-row-${idx}`);
    const f = field => parseFloat(row?.querySelector(`[data-field="${field}"]`)?.value)||0;
    const vals = {};
    cols.forEach(c => { vals[c] = f(c); totals[c] += vals[c]; });
    return `<tr>
      <td style="font-weight:600">${esc(j.job_number)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(vals.est_material_mecanico)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(vals.est_material_electrico)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(vals.est_major_items)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(vals.est_ing_mecanica)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(vals.est_ing_electrica)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(vals.est_ensamble)}</td>
    </tr>`;
  }).join('');

  const totalRow = `<tr style="background:rgba(0,0,0,.055);font-weight:700">
    <td>Presupuesto Proyecto</td>
    <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fmt(totals.est_material_mecanico)}</td>
    <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fmt(totals.est_material_electrico)}</td>
    <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fmt(totals.est_major_items)}</td>
    <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fmt(totals.est_ing_mecanica)}</td>
    <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fmt(totals.est_ing_electrica)}</td>
    <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fmt(totals.est_ensamble)}</td>
  </tr>`;

  tb.innerHTML = rowsHtml + totalRow;
}

async function pcSave() {
  if(!pcCurrentPTSV) return;
  const jobsData = pcJobRows.map((j,idx) => {
    const row = document.querySelector(`#pc-row-${idx}`);
    if(!row) return null;
    const f = field => row.querySelector(`[data-field="${field}"]`)?.value || '';
    const fn = field => parseFloat(f(field))||0;
    const revenue     = parseFloat(j.revenue)||0;
    const markupPct   = fn('markup_pct');
    const ahorroPct   = fn('ahorro_pct');
    const montoMarkup = revenue - (revenue / (1 + markupPct/100));
    const presOperativo  = revenue - montoMarkup;
    const presDisponible = presOperativo - (presOperativo * ahorroPct / 100);
    const estIngMec  = fn('est_ing_mecanica');
    const estIngElec = fn('est_ing_electrica');
    const estMajor   = fn('est_major_items');
    const estMatMec  = fn('est_material_mecanico');
    const estMatElec = fn('est_material_electrico');
    const estServExt = fn('est_servicios_externos');
    const estEns     = fn('est_ensamble');
    const sumaEst    = estIngMec + estIngElec + estMajor + estMatMec + estMatElec + estServExt + estEns;
    // TARGET DE COMPRAS = Major Items + Material Eléctrico + Material Mecánico + Servicios Externos
    // TARGET MANO DE OBRA = Ing. Mecánica + Ing. Eléctrica + Ensamble
    const targetCompras = estMajor + estMatElec + estMatMec + estServExt;
    const targetMO       = estIngMec + estIngElec + estEns;
    return {
      job_number:             j.job_number,
      customer:               j.customer||'',
      revenue,
      fecha_inicio:           f('fecha_inicio'),
      runoff_interno:         f('runoff_interno'),
      runoff_cliente:         f('runoff_cliente'),
      fecha_envio:            f('fecha_envio'),
      markup_pct:             markupPct,
      monto_markup:           montoMarkup,
      presupuesto_operativo:  presOperativo,
      ahorro_pct:             ahorroPct,
      presupuesto_disponible: presDisponible,
      est_ing_mecanica:       estIngMec,
      est_ing_electrica:      estIngElec,
      est_major_items:        estMajor,
      est_material_mecanico:  estMatMec,
      est_material_electrico: estMatElec,
      est_servicios_externos: estServExt,
      est_ensamble:           estEns,
      suma_estimados:         sumaEst,
      delta_vs_disponible:    presDisponible - sumaEst,
      // Campos heredados — se conservan para que Job Cost Report siga funcionando
      margen_pct:             markupPct,
      presupuesto_a:          presOperativo,
      target_compras:         targetCompras,
      target_mo:              targetMO,
    };
  }).filter(Boolean);

  // Collect timing activities
  const timingData = pcGetTimingData();
  const puntosData  = pcGetPuntosData();
  const cambiosData = pcGetCambiosData();
  const planPersonalData = pcGetPlanPersonalData();

  const btn = document.getElementById('btn-pc-save');
  btn.disabled=true; btn.textContent='Guardando…';
  try {
    const d = await fetch('/api/projconfig',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ptsv: pcCurrentPTSV, jobs: jobsData, timing: timingData,
        puntos_abiertos: puntosData, control_cambios: cambiosData, plan_personal: planPersonalData})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    toast(`Configuración ${pcCurrentPTSV} guardada ✓`,'ok',4000);
    await pcLoadSavedList();
  } catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='💾 Guardar Configuración';}
}

async function pcLoadSavedList() {
  try {
    const d = await fetch('/api/projconfig').then(r=>r.json());
    const records = d.records||[];
    const el = document.getElementById('pc-saved-list');
    if(!records.length){el.textContent='—';return;}
    el.innerHTML = records.map(r=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid var(--border);cursor:pointer"
        onmouseenter="this.style.background='rgba(0,0,0,.045)'" onmouseleave="this.style.background=''">
        <div onclick="pcLoadConfig('${esc(r.ptsv)}')" style="flex:1">
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--gold)">${esc(r.ptsv)}</div>
          <div style="font-size:10px;color:var(--muted)">${(r.jobs||[]).length} jobs · ${(r.created_at||'').slice(0,10)}</div>
        </div>
        <button onclick="pcDeleteConfig('${esc(r.id)}')" class="fi-del" style="font-size:10px">✕</button>
      </div>`).join('');
  }catch(e){}
}

async function pcLoadConfig(ptsv) {
  document.getElementById('pc-ptsv-search').value = ptsv;
  pcSearch(ptsv);
}

async function pcDeleteConfig(id) {
  if(!confirm('¿Eliminar esta configuración?')) return;
  const d = await fetch(`/api/projconfig/${id}`,{method:'DELETE'}).then(r=>r.json());
  if(d.error){toast(d.error,'er');return;}
  toast('Configuración eliminada','ok');
  await pcLoadSavedList();
}

// Load saved configs when entering module
document.addEventListener('DOMContentLoaded', () => { pcLoadSavedList(); });

// ════════════════════════════════════════════════════════
//  INGRESO DE MATERIAL
// ════════════════════════════════════════════════════════
let ingresoData = [], imRowCount = 0, ipoCurrentPO = null;

async function loadIngreso() {
  try {
    const d = await fetch('/api/ingreso').then(r=>r.json());
    ingresoData = d.records || [];
    document.getElementById('ing-dot').className='conn-dot ok';
    document.getElementById('ing-lbl').textContent=`${ingresoData.length} registros`;
    ingresoRender();
  } catch(e) { toast('Error cargando ingresos','er'); }
}

function ingresoRender() {
  const gs   = (document.getElementById('ing-gs')?.value||'').toLowerCase();
  const tipo = document.getElementById('ing-filter-tipo')?.value||'';
  let rows = ingresoData;
  if(tipo) rows = rows.filter(r=>r.tipo===tipo);
  if(gs)   rows = rows.filter(r=>
    (r.id||'').toLowerCase().includes(gs) ||
    (r.po_number||'').toLowerCase().includes(gs) ||
    (r.recibe||'').toLowerCase().includes(gs) ||
    (r.items||[]).some(i=>
      (i.part_number||'').toLowerCase().includes(gs)||
      (i.description||'').toLowerCase().includes(gs)||
      (i.job||'').toLowerCase().includes(gs)));

  const isAdm = USER_PERMS && USER_PERMS.is_admin;
  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const tipoBadge = t => t==='gpo'
    ? '<span style="font-size:9px;background:rgba(200,16,46,.2);color:var(--red);padding:2px 6px;border-radius:4px">OC</span>'
    : '<span style="font-size:9px;background:rgba(0,0,0,.075);color:var(--muted2);padding:2px 6px;border-radius:4px">Manual</span>';

  document.getElementById('ing-tb').innerHTML = rows.flatMap(r =>
    (r.items||[]).map((it,idx)=>`
    <tr class="tr-hover">
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:10px;font-family:'DM Mono',monospace;font-size:11px;color:var(--gold);font-weight:700">${esc(r.id||'—')}</td>`:''}
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:10px;color:var(--muted2);font-size:11px">${r.fecha||''}</td>`:''}
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:10px">${tipoBadge(r.tipo)}</td>`:''}
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:10px;font-family:'DM Mono',monospace;font-size:11px;color:var(--gold)">${esc(r.po_number||'—')}</td>`:''}
      <td style="font-family:'DM Mono',monospace;font-size:11px;white-space:nowrap">${esc(it.part_number||'—')}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted2)" title="${esc(it.description||'')}">${esc(it.description||'—')}</td>
      <td style="text-align:right">${it.quantity_ordered||'—'}</td>
      <td style="text-align:right;color:var(--green);font-weight:600">${it.quantity_delivered||0}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(it.unit_cost)}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(it.job||'—')}</td>
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:10px;color:var(--muted2);font-size:11px">${esc(r.recibe||'—')}</td>`:''}
      <td style="font-size:10px">${it.quantity_delivered>=it.quantity_ordered?
        '<span style="color:var(--green)">✓ Completo</span>':
        `<span style="color:var(--amber)">Parcial</span>`}</td>
      ${idx===0&&isAdm?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:8px">
        <button onclick="deleteIngreso('${esc(r.id)}')" class="fi-del" style="font-size:11px" title="Eliminar ingreso">✕</button>
      </td>`:(idx===0&&!isAdm?'<td></td>':'')}
    </tr>`)
  ).join('');
  document.getElementById('ing-count').textContent=`${rows.length} órdenes · ${rows.reduce((s,r)=>s+(r.items||[]).length,0)} items`;
}

// ── ENTRADA MANUAL
function ingresoOpenManual() {
  imRowCount = 0;
  document.getElementById('im-po-num').value='';
  const nameEl = document.getElementById('im-recibe-name');
  if(nameEl) nameEl.textContent = USER_PERMS?.user || '—';
  document.getElementById('im-items-tb').innerHTML='';
  document.getElementById('im-total').textContent='$0.00';
  imAddRow();
  document.getElementById('mo-ing-manual').classList.add('on');
}

async function imLoadFromPDF(inp) {
  const file = inp?.files?.[0];
  if(!file) return;
  const statusEl = document.getElementById('im-pdf-status');
  statusEl.style.color='var(--muted2)'; statusEl.textContent='⏳ Leyendo PDF…';

  try {
    const fd = new FormData(); fd.append('file', file);
    const resp = await fetch('/api/util/pdf-to-po-json',{method:'POST',body:fd});
    let d;
    try { d = await resp.json(); }
    catch(e) { throw new Error(`Error del servidor (HTTP ${resp.status})`); }
    if(d.error) throw new Error(d.error);

    const tb = document.getElementById('im-items-tb');
    if(tb.querySelectorAll('tr').length > 0 &&
       !confirm(`Ya hay ${tb.querySelectorAll('tr').length} item(s) en la tabla.\n¿Reemplazarlos con los del PDF?`)) {
      // keep + append
    } else {
      tb.innerHTML = ''; imRowCount = 0;
    }

    const inpS = 'background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px';
    const jobOpts = '<option value="">— Job —</option>'
      + '<option value="Shopfloor">Shopfloor</option>'
      + '<option value="Fix Asset">Fix Asset</option>'
      + (jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)}</option>`).join('');

    for(const row of (d.items||[])) {
      const job    = String(row.job||'').trim().toUpperCase();
      const jobSel = jobOpts.replace(`value="${esc(job)}"`,`value="${esc(job)}" selected`);
      const idx    = imRowCount++;
      const tr     = document.createElement('tr');
      tr.id = `im-row-${idx}`;
      tr.innerHTML = `
        <td><input type="text" value="${esc(row.part_number||'')}" oninput="imCalcTotal()" style="${inpS};width:130px;text-transform:uppercase;font-family:'DM Mono',monospace"></td>
        <td><input type="text" value="${esc(row.description||'')}" style="${inpS};width:200px"></td>
        <td><input type="text" value="${esc(row.brand||'')}" style="${inpS};width:100px;text-transform:uppercase"></td>
        <td><input type="number" min="0" step="1" value="${row.quantity||0}" oninput="imCalcTotal()" style="${inpS};width:65px;text-align:right"></td>
        <td><input type="number" min="0" step="0.01" value="${row.unit_cost||0}" oninput="imCalcTotal()" style="${inpS};width:90px;text-align:right;color:var(--gold);font-family:'DM Mono',monospace"></td>
        <td><select style="${inpS};width:110px;color:var(--gold);font-family:'DM Mono',monospace">${jobSel}</select></td>
        <td><input type="text" placeholder="Notas" style="${inpS};width:120px;color:var(--muted2)"></td>
        <td><button onclick="this.closest('tr').remove();imCalcTotal()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">✕</button></td>`;
      tb.appendChild(tr);
    }

    imCalcTotal();
    statusEl.style.color='var(--green)';
    statusEl.textContent=`✓ ${d.total} items cargados · OC ${d.oc_num} · Job ${d.job||'—'}`;
    inp.value='';
  } catch(e) {
    statusEl.style.color='var(--red)'; statusEl.textContent='Error: '+e.message;
  }
}

async function imImportXL(inp) {
  const file = inp.files?.[0];
  if(!file) return;
  const statusEl = document.getElementById('im-xl-status');
  statusEl.style.color='var(--muted2)'; statusEl.textContent='Leyendo archivo…';

  try {
    const buf  = await file.arrayBuffer();
    const data = new Uint8Array(buf);

    // Use server-side parsing to avoid client-side lib dependency
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/util/parse-xl-po', {method:'POST', body:fd});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = await res.json();
    if(parsed.error) throw new Error(parsed.error);

    const dataRows = parsed.rows || [];
    if(!dataRows.length){ statusEl.style.color='var(--red)'; statusEl.textContent='Sin datos en el archivo.'; return; }

    const tb = document.getElementById('im-items-tb');
    if(tb.querySelectorAll('tr').length > 0 &&
       !confirm(`Ya hay ${tb.querySelectorAll('tr').length} item(s) en la tabla.\n¿Reemplazarlos con el Excel?`)) {
      // keep existing, just append
    } else {
      tb.innerHTML = ''; imRowCount = 0;
    }

    const jobOpts = '<option value="">— Job —</option>'
      + '<option value="Shopfloor">Shopfloor</option>'
      + '<option value="Fix Asset">Fix Asset</option>'
      + (jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)}</option>`).join('');

    const inpS = 'background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px';
    let added = 0;
    for(const row of dataRows) {
      const job = String(row.job||'').trim().toUpperCase();
      const jobSel = jobOpts.replace(`value="${esc(job)}"`, `value="${esc(job)}" selected`);
      const idx = imRowCount++;
      const tr  = document.createElement('tr');
      tr.id = `im-row-${idx}`;
      tr.innerHTML=`
        <td><input type="text" value="${esc(row.part_number||'')}" oninput="imCalcTotal()" style="${inpS};width:120px;text-transform:uppercase;font-family:'DM Mono',monospace"></td>
        <td><input type="text" value="${esc(row.description||'')}" style="${inpS};width:180px"></td>
        <td><input type="text" value="${esc(row.brand||'')}" oninput="imCalcTotal()" style="${inpS};width:90px;text-transform:uppercase"></td>
        <td><input type="number" min="0" step="1" value="${row.quantity||0}" oninput="imCalcTotal()" style="${inpS};width:65px;text-align:right"></td>
        <td><input type="number" min="0" step="0.01" value="${row.unit_cost||0}" oninput="imCalcTotal()" style="${inpS};width:90px;text-align:right;color:var(--gold);font-family:'DM Mono',monospace"></td>
        <td><select style="${inpS};width:110px;color:var(--gold);font-family:'DM Mono',monospace">${jobSel}</select></td>
        <td><input type="text" placeholder="Notas" style="${inpS};width:120px;color:var(--muted2)"></td>
        <td><button onclick="this.closest('tr').remove();imCalcTotal()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">✕</button></td>`;
      tb.appendChild(tr);
      added++;
    }

    imCalcTotal();
    statusEl.style.color='var(--green)'; statusEl.textContent=`✓ ${added} item(s) importados`;
    inp.value='';
  } catch(e) {
    statusEl.style.color='var(--red)'; statusEl.textContent='Error: '+e.message;
  }
}

function imAddRow() {
  const idx = imRowCount++;
  const jobOpts = '<option value="">— Job —</option>'
    + '<option value="Shopfloor">Shopfloor</option>'
    + '<option value="Fix Asset">Fix Asset</option>'
    + (jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)}</option>`).join('');
  const row = document.createElement('tr');
  row.id = `im-row-${idx}`;
  row.innerHTML=`
    <td><input type="text" placeholder="No. Parte" oninput="imCalcTotal()"
      style="width:120px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px;text-transform:uppercase;font-family:'DM Mono',monospace"></td>
    <td><input type="text" placeholder="Descripción"
      style="width:180px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px"></td>
    <td><input type="text" placeholder="Marca" oninput="imCalcTotal()"
      style="width:90px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px;text-transform:uppercase"></td>
    <td><input type="number" min="0" step="1" value="1" oninput="imCalcTotal()"
      style="width:65px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px;text-align:right"></td>
    <td><input type="number" min="0" step="0.01" value="0" oninput="imCalcTotal()"
      style="width:90px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--gold);padding:5px 7px;font-size:11px;text-align:right;font-family:'DM Mono',monospace"></td>
    <td><select style="width:110px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--gold);padding:5px 7px;font-size:11px;font-family:'DM Mono',monospace">${jobOpts}</select></td>
    <td><input type="text" placeholder="Notas"
      style="width:120px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--muted2);padding:5px 7px;font-size:11px"></td>
    <td><button onclick="this.closest('tr').remove();imCalcTotal()"
      style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">✕</button></td>`;
  document.getElementById('im-items-tb').appendChild(row);
}

function imCalcTotal() {
  let total = 0;
  document.querySelectorAll('#im-items-tb tr').forEach(row=>{
    const inputs = row.querySelectorAll('input');
    const qty = parseFloat(inputs[3]?.value)||0;
    const uc  = parseFloat(inputs[4]?.value)||0;
    total += qty*uc;
  });
  document.getElementById('im-total').textContent = '$'+total.toLocaleString('en-US',{minimumFractionDigits:2});
}

async function imProcesar() {
  const poNum  = document.getElementById('im-po-num').value.trim().toUpperCase();
  const recibe = USER_PERMS?.user || '';
  if(!recibe){ toast('Indica quién recibe el material','er'); return; }
  const rows = document.querySelectorAll('#im-items-tb tr');
  if(!rows.length){ toast('Agrega al menos un item','er'); return; }
  const items = [];
  rows.forEach(row=>{
    const inputs = row.querySelectorAll('input');
    const sel    = row.querySelector('select');
    const pnum   = inputs[0]?.value.trim().toUpperCase();
    if(!pnum) return;
    const qty = parseFloat(inputs[3]?.value)||0;
    items.push({
      part_number:        pnum,
      description:        inputs[1]?.value.trim()||'',
      brand:              inputs[2]?.value.trim().toUpperCase()||'',
      quantity_ordered:   qty,
      quantity_delivered: qty,
      unit_cost:          parseFloat(inputs[4]?.value)||0,
      job:                sel?.value||'',
      notes:              inputs[5]?.value.trim()||'',
    });
  });
  if(!items.length){ toast('Al menos un item debe tener No. Parte','er'); return; }
  const btn = document.getElementById('btn-im-save');
  btn.disabled=true; btn.textContent='Procesando…';
  try {
    const d = await fetch('/api/ingreso',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tipo:'manual', po_number:poNum, recibe, items})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-ing-manual');
    toast(`✓ Ingreso procesado — ${d.apartados_created} item(s) en Apartados`,'ok',5000);
    await loadIngreso();
  } catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='✅ Procesar Ingreso';}
}

// ── ENTRADA POR OC
function ingresoOpenPO() {
  ipoCurrentPO = null;
  // Reset search to default prefix
  const searchEl = document.getElementById('ipo-search');
  if(searchEl){ searchEl.value='PO-'; setTimeout(()=>searchEl.setSelectionRange(3,3),50); }
  // Show logged user (read-only)
  const userDisplay = document.getElementById('ipo-recibe-display');
  if(userDisplay) userDisplay.textContent = (USER_PERMS?.user) || session_user || '—';
  document.getElementById('ipo-po-content').style.display='none';
  document.getElementById('ipo-po-empty').innerHTML='Ingresa o escanea el número de OC para ver sus items';
  document.getElementById('ipo-po-empty').style.display='';
  document.getElementById('btn-ipo-save').disabled=true;
  document.getElementById('mo-ing-po').classList.add('on');
}

async function ipoBuscarPO(val, force=false) {
  const q = val.trim().toUpperCase();
  if(!q || q.length < 4) return;
  // Small delay to allow barcode scanner to complete
  if(!force) {
    clearTimeout(window._ipoTimer);
    window._ipoTimer = setTimeout(()=>ipoBuscarPO(q, true), 400);
    return;
  }
  try {
    const d = await fetch('/api/gpo').then(r=>r.json());
    const po = (d.records||[]).find(r=>
      r.po_number?.toUpperCase()===q ||
      r.po_number?.split('-').pop()===q.replace(/^0+/,''));
    if(!po){
      document.getElementById('ipo-po-content').style.display='none';
      document.getElementById('ipo-po-empty').innerHTML='<span style="color:var(--red)">⚠ OC no encontrada: '+esc(q)+'</span>';
      document.getElementById('ipo-po-empty').style.display='';
      return;
    }
    ipoCurrentPO = po;
    ipoRenderPO(po);
  } catch(e){ toast('Error buscando OC','er'); }
}

function ipoRenderPO(po) {
  const sup = po.supplier||{};
  document.getElementById('ipo-po-header').innerHTML=`
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Orden</div>
      <div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--gold);font-size:14px">${esc(po.po_number)}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Proveedor</div>
      <div style="font-weight:600;color:var(--text)">${esc(sup.nombre||po.supplier_name||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Estatus OC</div>
      <div style="font-weight:700;color:${po.status==='Entregada'?'var(--green)':po.status==='Parcial'?'var(--amber)':'var(--muted)'}">${esc(po.status||'Emitida')}</div></div>`;

  const jobOpts = '<option value="">— Job —</option>'
    + '<option value="Shopfloor">Shopfloor</option>'
    + (jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)}</option>`).join('');

  document.getElementById('ipo-items-tb').innerHTML = (po.items||[]).map((it,i)=>{
    const qOrd = parseFloat(it.quantity)||1;
    const qDel = parseFloat(it.quantity_delivered||0);
    const qPend = Math.max(0, qOrd - qDel);
    return `<tr>
      <td style="color:var(--muted)">${it.line||i+1}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--gold)">${esc(it.cat_code||'—')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${esc(it.part_number||'—')}</td>
      <td>${esc(it.brand||'—')}</td>
      <td style="color:var(--muted2);max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(it.description||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(it.job||'—')}</td>
      <td style="text-align:right">${qOrd}</td>
      <td style="text-align:right;color:${qDel>=qOrd?'var(--green)':'var(--muted)'}">${qDel}</td>
      <td style="text-align:right">
        <input type="number" min="0" max="${qPend}" step="1" value="0"
          id="ipo-qty-${i}" oninput="ipoUpdateEstatus()"
          style="width:70px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--gold);padding:4px 7px;font-size:12px;text-align:right;font-family:'DM Mono',monospace;font-weight:700">
      </td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${'$'+Number(it.unit_price||0).toFixed(2)}</td>
    </tr>`;
  }).join('');

  document.getElementById('ipo-po-empty').style.display='none';
  document.getElementById('ipo-po-content').style.display='';
  document.getElementById('btn-ipo-save').disabled=false;
  ipoUpdateEstatus();
}

function ipoUpdateEstatus() {
  if(!ipoCurrentPO) return;
  const items = ipoCurrentPO.items||[];
  let allFull=true, anyPos=false;
  items.forEach((it,i)=>{
    const qOrd = parseFloat(it.quantity)||1;
    const qPrev = parseFloat(it.quantity_delivered||0);
    const qNew  = parseFloat(document.getElementById(`ipo-qty-${i}`)?.value||0);
    const total  = qPrev + qNew;
    if(total < qOrd) allFull=false;
    if(qNew > 0) anyPos=true;
  });
  const el = document.getElementById('ipo-estatus-preview');
  if(allFull){
    el.style.background='rgba(72,199,142,.15)'; el.style.color='var(--green)';
    el.textContent='✓ Todos los items quedarán como ENTREGADOS — la OC se cerrará.';
  } else if(anyPos){
    el.style.background='rgba(255,193,7,.1)'; el.style.color='var(--amber)';
    el.textContent='⚠ Entrega PARCIAL — quedan items pendientes.';
  } else {
    el.style.background='rgba(0,0,0,.045)'; el.style.color='var(--muted)';
    el.textContent='Ingresa las cantidades a entregar en cada item.';
  }
}

async function ipoProcesar() {
  if(!ipoCurrentPO){ toast('Busca una OC primero','er'); return; }
  const recibe = (USER_PERMS?.user) || session_user || 'Sistema';
  const items = (ipoCurrentPO.items||[]).map((it,i)=>{
    const qNew = parseFloat(document.getElementById(`ipo-qty-${i}`)?.value||0);
    return {
      part_number:        it.part_number||'',
      brand:              it.brand||'',
      description:        it.description||'',
      cat_code:           it.cat_code||'',
      label_code:         it.label_code||'',
      quantity_ordered:   parseFloat(it.quantity)||1,
      quantity_delivered: qNew,
      unit_cost:          parseFloat(it.unit_price||0),
      job:                it.job||'',
      notes:              '',
    };
  }).filter(it=>it.quantity_delivered>0);
  if(!items.length){ toast('Ingresa al menos una cantidad > 0','er'); return; }
  const btn=document.getElementById('btn-ipo-save');
  btn.disabled=true; btn.textContent='Procesando…';
  try {
    const d = await fetch('/api/ingreso',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tipo:'gpo', po_number:ipoCurrentPO.po_number, recibe, items})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-ing-po');
    toast(`✓ Ingreso procesado — ${d.apartados_created} item(s) en Apartados`,'ok',5000);
    await loadIngreso();
  } catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='✅ Procesar Ingreso';}
}

async function deleteIngreso(id) {
  if(!confirm('¿Eliminar este registro de ingreso?\nSe eliminarán los Apartados asociados.')) return;
  try {
    const d = await fetch(`/api/ingreso/${id}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    toast('Ingreso eliminado','ok');
    await loadIngreso();
  } catch(e){toast('Error: '+e.message,'er');}
}

function ingresoExport() {
  const rows = [['Fecha','Tipo','No.OC','No.Parte','Descripción','Cant.Pedida','Cant.Entregada','Costo Unit.','Job','Recibe']];
  ingresoData.forEach(r=>(r.items||[]).forEach(it=>{
    rows.push([r.fecha||'',r.tipo||'',r.po_number||'',it.part_number||'',
      it.description||'',it.quantity_ordered||'',it.quantity_delivered||'',
      it.unit_cost||'',it.job||'',r.recibe||'']);
  }));
  const csv = rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='ingresos.csv'; a.click();
}

document.addEventListener('DOMContentLoaded', ()=>{ loadIngreso(); });

// ════════════════════════════════════════════════════════
//  APARTADOS
// ════════════════════════════════════════════════════════
let apartadosData = [];

async function loadApartados() {
  try {
    const d = await fetch('/api/apartados').then(r=>r.json());
    apartadosData = d.records || [];
    document.getElementById('apt-dot').className='conn-dot ok';
    document.getElementById('apt-lbl').textContent=`${apartadosData.length} partes`;

    // Populate job filter
    const allJobs = new Set();
    apartadosData.forEach(r=>(r.jobs||[]).forEach(j=>{ if(j.job) allJobs.add(j.job); }));
    const sel = document.getElementById('apt-filter-job');
    sel.innerHTML='<option value="">Todos los Jobs</option>'
      + [...allJobs].sort().map(j=>`<option value="${esc(j)}">${esc(j)}</option>`).join('');

    apartadosRender();
  } catch(e) { toast('Error cargando apartados','er'); }
}

function apartadosRender() {
  const gs  = (document.getElementById('apt-gs')?.value||'').toLowerCase();
  const job = document.getElementById('apt-filter-job')?.value||'';

  let rows = apartadosData;
  if(gs) rows = rows.filter(r=>
    (r.part_number||'').toLowerCase().includes(gs)||
    (r.brand||'').toLowerCase().includes(gs)||
    (r.description||'').toLowerCase().includes(gs)||
    (r.cat_code||'').toLowerCase().includes(gs)||
    (r.label_code||'').toLowerCase().includes(gs)||
    (r.jobs||[]).some(j=>(j.job||'').toLowerCase().includes(gs)));
  if(job) rows = rows.filter(r=>(r.jobs||[]).some(j=>j.job===job));

  const totalUnits = rows.reduce((s,r)=>s+(r.total_quantity||0),0);
  document.getElementById('apt-count-parts').textContent = rows.length;
  document.getElementById('apt-count-units').textContent = totalUnits.toLocaleString();
  document.getElementById('apt-status').textContent = `${rows.length} partes · ${totalUnits} unidades totales`;

  const isAdm = USER_PERMS?.is_admin;

  document.getElementById('apt-tb').innerHTML = rows.map(r => {
    const jobJobs = (r.jobs||[]).filter(j=>!job || j.job===job);
    const totalFiltered = jobJobs.reduce((s,j)=>s+(j.quantity||0),0);
    const jobBadges = jobJobs.map(j=>
      `<span style="font-family:'DM Mono',monospace;font-size:10px;background:rgba(255,193,7,.12);color:var(--gold);padding:2px 7px;border-radius:4px;margin-right:4px">${esc(j.job||'—')} <b>${j.quantity||0}</b></span>`
    ).join('');
    const rowId    = `apt-row-${r.part_number.replace(/[^a-zA-Z0-9]/g,'_')}`;
    const detailId = `apt-detail-${r.part_number.replace(/[^a-zA-Z0-9]/g,'_')}`;
    const pnum     = encodeURIComponent(r.part_number);
    return `
    <tr id="${rowId}" class="tr-hover" onclick="aptToggle('${detailId}')" style="cursor:pointer">
      <td style="text-align:center;color:var(--muted);font-size:11px" id="${detailId}-icon">▶</td>
      <td style="font-weight:600;color:var(--text)">${esc(r.brand||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-weight:700">${esc(r.part_number)}</td>
      <td style="color:var(--muted2);max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(r.description||'—')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted2)">${esc(r.cat_code||'—')}</td>
      <td style="text-align:right;font-weight:700;font-size:15px;color:${totalFiltered>0?'var(--green)':'var(--red)'}">${totalFiltered}</td>
      <td>${jobBadges}</td>
      <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
        ${isAdm?`<button onclick="aptDeletePart('${esc(r.part_number)}')" class="fi-del" title="Eliminar No. Parte completo" style="font-size:11px">✕ Parte</button>`:''}
      </td>
    </tr>
    <tr id="${detailId}" style="display:none;background:rgba(0,0,0,.03)">
      <td colspan="8" style="padding:0">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:rgba(31,56,100,.4)">
            <th style="padding:6px 32px;text-align:left;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Job</th>
            <th style="padding:6px 16px;text-align:right;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Cantidad</th>
            <th style="padding:6px 16px;text-align:right;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Costo Unit.</th>
            <th style="padding:6px 16px;text-align:right;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Valor Total</th>
            <th style="padding:6px 16px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Ingresos</th>
            ${isAdm?'<th style="padding:6px 16px;width:80px"></th>':''}
          </tr></thead>
          <tbody>
            ${(r.jobs||[]).filter(j=>!job||j.job===job).map(j=>`
            <tr style="border-bottom:1px solid rgba(0,0,0,.045)">
              <td style="padding:7px 32px;font-family:'DM Mono',monospace;color:var(--gold)">${esc(j.job||'—')}</td>
              <td style="padding:7px 16px;text-align:right;font-weight:700;color:var(--green)">${j.quantity||0}</td>
              <td style="padding:7px 16px;text-align:right;font-family:'DM Mono',monospace;color:var(--text)">$${Number(j.unit_cost||0).toFixed(2)}</td>
              <td style="padding:7px 16px;text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">$${Number((j.quantity||0)*(j.unit_cost||0)).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
              <td style="padding:7px 16px;font-size:10px;color:var(--muted)">${(j.ingresos||[]).length} ingreso(s)</td>
              ${isAdm?`<td style="padding:7px 16px;text-align:right;white-space:nowrap">
                <button onclick="aptEditQty('${esc(r.part_number)}','${esc(j.job||'')}',${j.quantity||0},${j.unit_cost||0})"
                  class="btn-reload" style="font-size:10px;padding:2px 8px;margin-right:4px" title="Corregir cantidad">✏ Qty</button>
                <button onclick="aptDeleteJob('${esc(r.part_number)}','${esc(j.job||'')}')" class="fi-del" title="Eliminar este Job del apartado" style="font-size:10px;padding:2px 7px">✕ Job</button>
              </td>`:''}
            </tr>`).join('')}
          </tbody>
        </table>
      </td>
    </tr>`;
  }).join('');
}

function aptToggle(detailId) {
  const detail = document.getElementById(detailId);
  const icon   = document.getElementById(detailId+'-icon');
  if(!detail) return;
  const open = detail.style.display !== 'none';
  detail.style.display = open ? 'none' : '';
  if(icon) icon.textContent = open ? '▶' : '▼';
}

function aptEditQty(partNumber, job, currentQty, unitCost) {
  document.getElementById('apt-edit-pnum').value    = partNumber;
  document.getElementById('apt-edit-job').value     = job;
  document.getElementById('apt-edit-qty').value     = currentQty;
  document.getElementById('apt-edit-unit').value    = unitCost;
  document.getElementById('apt-edit-info').innerHTML =
    `<b style="color:var(--gold)">${esc(partNumber)}</b> &nbsp;·&nbsp; Job <b style="color:var(--gold)">${esc(job)}</b>
     &nbsp;·&nbsp; Cantidad actual: <b style="color:var(--green)">${currentQty}</b>`;
  document.getElementById('apt-edit-status').textContent = '';
  document.getElementById('mo-apt-edit').classList.add('on');
  setTimeout(()=>document.getElementById('apt-edit-qty').select(), 80);
}

async function aptSaveQty() {
  const partNumber = document.getElementById('apt-edit-pnum').value;
  const job        = document.getElementById('apt-edit-job').value;
  const newQty     = parseFloat(document.getElementById('apt-edit-qty').value);
  const unitCost   = parseFloat(document.getElementById('apt-edit-unit').value||0);
  const statusEl   = document.getElementById('apt-edit-status');

  if(isNaN(newQty) || newQty < 0) {
    statusEl.style.color='var(--red)'; statusEl.textContent='Cantidad inválida'; return;
  }
  const btn = document.getElementById('btn-apt-save-qty');
  btn.disabled=true; btn.textContent='Guardando…';
  try {
    const d = await fetch('/api/apartados/edit-qty', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ part_number: partNumber, job, quantity: newQty, unit_cost: unitCost })
    }).then(r=>r.json());
    if(d.error){ statusEl.style.color='var(--red)'; statusEl.textContent='Error: '+d.error; return; }
    closeMo('mo-apt-edit');
    toast(`✓ Cantidad corregida: ${partNumber} / ${job} → ${newQty}`, 'ok', 4000);
    await loadApartados();
  } catch(e){ statusEl.style.color='var(--red)'; statusEl.textContent='Error: '+e.message; }
  finally { btn.disabled=false; btn.textContent='💾 Guardar'; }
}

async function aptDeletePart(partNumber) {
  if(!confirm(`¿Eliminar TODOS los apartados del No. Parte:\n${partNumber}?\n\nEsta acción no se puede deshacer.`)) return;
  try {
    const d = await fetch(`/api/apartados/${encodeURIComponent(partNumber)}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    toast(`Apartado ${partNumber} eliminado`,'ok');
    await loadApartados();
  } catch(e){toast('Error: '+e.message,'er');}
}

async function aptDeleteJob(partNumber, job) {
  if(!confirm(`¿Eliminar el Job "${job}" del apartado:\n${partNumber}?\n\nEsta acción no se puede deshacer.`)) return;
  try {
    const d = await fetch(`/api/apartados/${encodeURIComponent(partNumber)}?job=${encodeURIComponent(job)}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    toast(`Job ${job} eliminado del apartado ${partNumber}`,'ok');
    await loadApartados();
  } catch(e){toast('Error: '+e.message,'er');}
}

document.addEventListener('DOMContentLoaded', ()=>{ loadApartados(); });

// ════════════════════════════════════════════════════════
//  SALIDA DE MATERIAL
// ════════════════════════════════════════════════════════
let salidaData = [], salidaAptItems = [];

async function loadSalida() {
  try {
    const d = await fetch('/api/salida').then(r=>r.json());
    salidaData = d.records || [];
    document.getElementById('sal-dot').className='conn-dot ok';
    document.getElementById('sal-lbl').textContent=`${salidaData.length} registros`;
    salidaRender();
  } catch(e) { toast('Error cargando salidas','er'); }
}

function salidaRender() {
  const gs     = (document.getElementById('sal-gs')?.value||'').toLowerCase();
  const status = document.getElementById('sal-filter-status')?.value||'';
  const isAdm  = USER_PERMS?.is_admin;
  let rows = salidaData;
  if(status) rows = rows.filter(r=>r.status===status);
  if(gs)     rows = rows.filter(r=>
    (r.id||'').toLowerCase().includes(gs)||
    (r.job||'').toLowerCase().includes(gs)||
    (r.solicitante||'').toLowerCase().includes(gs)||
    (r.items||[]).some(i=>
      (i.part_number||'').toLowerCase().includes(gs)||
      (i.brand||'').toLowerCase().includes(gs)||
      (i.description||'').toLowerCase().includes(gs)));

  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const statusBadge = s => s==='Surtida'
    ? '<span style="font-size:10px;background:rgba(72,199,142,.15);color:var(--green);padding:2px 8px;border-radius:4px;font-weight:600">✓ Surtida</span>'
    : '<span style="font-size:10px;background:rgba(255,193,7,.12);color:var(--amber);padding:2px 8px;border-radius:4px;font-weight:600">⏳ Pendiente</span>';

  document.getElementById('sal-tb').innerHTML = rows.flatMap(r=>
    (r.items||[]).map((it,idx)=>`
    <tr>
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:10px;color:var(--muted2);font-size:11px">${r.fecha||''}</td>`:''}
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:8px">
        <div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--gold);font-size:12px">${esc(r.job||'—')}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--red);margin-top:2px;letter-spacing:.5px">${esc(r.id||'')}</div>
      </td>`:''}
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:10px;color:var(--muted2);font-size:11px">${esc(r.solicitante||'—')}</td>`:''}
      <td style="font-family:'DM Mono',monospace;font-size:11px;white-space:nowrap">${esc(it.part_number||'—')}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted2)" title="${esc(it.description||'')}">${esc(it.description||'—')}</td>
      <td style="text-align:right;font-weight:700;color:var(--red)">${it.quantity||0}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(it.unit_cost)}</td>
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:8px">${statusBadge(r.status)}</td>`:''}
      ${idx===0?`<td rowspan="${r.items.length}" style="vertical-align:top;padding-top:4px;white-space:nowrap">
        ${r.status==='Pendiente'?`<button onclick="salidaSurtir('${esc(r.id)}')" class="btn-reload" style="font-size:10px;padding:4px 10px;background:rgba(72,199,142,.15);color:var(--green);border:1px solid var(--green)">⚡ Surtir</button> `:''}
        <button onclick="window.open('/api/salida/${esc(r.id)}/pdf','_blank')" class="btn-reload" style="font-size:10px;padding:4px 10px">🖨 PDF</button>
        ${isAdm?`<button onclick="salidaEliminar('${esc(r.id)}')" class="fi-del" style="font-size:11px;margin-left:2px">✕</button>`:''}
      </td>`:''}
    </tr>`)
  ).join('');
  document.getElementById('sal-count').textContent=`${rows.length} salidas`;
}

// ── Modal: Gestionar Salida
async function salidaOpenModal() {
  salidaAptItems = [];
  document.getElementById('sal-apt-empty').style.display='';
  document.getElementById('sal-apt-content').style.display='none';
  document.getElementById('btn-sal-save').disabled=true;
  document.getElementById('sal-apt-filter').value='';
  // Show logged user
  const disp = document.getElementById('sal-solicitante-display');
  if(disp) disp.textContent = USER_PERMS?.user || '—';
  // Populate job dropdown
  const sel = document.getElementById('sal-job');
  sel.innerHTML = '<option value="">— Seleccionar Job —</option>'
    + '<option value="SHOPFLOOR">Shopfloor</option>'
    + (jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)} — ${esc(j.customer||'')}</option>`).join('');
  document.getElementById('mo-salida').classList.add('on');
}

async function salidaCargarApartados() {
  const job = document.getElementById('sal-job').value;
  if(!job){
    document.getElementById('sal-apt-content').style.display='none';
    document.getElementById('sal-apt-empty').textContent='Selecciona un Job para ver los materiales disponibles';
    document.getElementById('sal-apt-empty').style.display='';
    return;
  }
  try {
    // DISPONIBLES = INGRESOS - (WO_PENDIENTES + SURTIDOS)
    const [dDisp, dSal] = await Promise.all([
      fetch(`/api/disponibilidad?job=${encodeURIComponent(job)}`).then(r=>r.json()),
      fetch('/api/salida').then(r=>r.json()),
    ]);

    if(dDisp.error){ toast('Error: '+dDisp.error,'er'); return; }

    // Items with disponible > 0
    salidaAptItems = (dDisp.records||[])
      .filter(r => r.disponible > 0)
      .map(r => ({
        part_number: r.part_number, brand: r.brand||'',
        description: r.description||'', cat_code: r.cat_code||'',
        label_code: r.label_code||'', available: r.disponible,
        unit_cost: r.unit_cost||0,
        _ingresos: r.ingresos, _salidas: r.salidas,
      }));

    const jobUp = job.toUpperCase().trim();
    const pendingWOs = (dSal.records||[]).filter(r=>
      r.status === 'Pendiente' && (r.job||'').toUpperCase().trim() === jobUp);

    if(!salidaAptItems.length && !pendingWOs.length){
      document.getElementById('sal-apt-empty').textContent=`No hay materiales disponibles para el Job ${job}`;
      document.getElementById('sal-apt-empty').style.display='';
      document.getElementById('sal-apt-content').style.display='none';
      return;
    }
    document.getElementById('sal-apt-empty').style.display='none';
    document.getElementById('sal-apt-content').style.display='';
    salidaRenderItems(salidaAptItems, pendingWOs);
  } catch(e){ toast('Error cargando disponibilidad','er'); console.error(e); }
}

function salidaRenderItems(items, pendingWOs=[]) {
  const fmt = v=>'$'+Number(v||0).toFixed(2);
  document.getElementById('sal-apt-tb').innerHTML = items.map((it,i)=>`
    <tr id="sal-item-row-${i}">
      <td style="text-align:center">
        <input type="checkbox" class="sal-chk" data-idx="${i}"
          onchange="salidaUpdateCount()"
          style="accent-color:var(--red);width:15px;height:15px;cursor:pointer">
      </td>
      <td style="font-weight:600">${esc(it.brand||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(it.part_number)}</td>
      <td style="color:var(--muted2);max-width:180px;overflow:hidden;text-overflow:ellipsis">${esc(it.description||'—')}</td>
      <td style="font-size:10px;color:var(--muted2)">${esc(it.cat_code||'—')}</td>
      <td style="text-align:right;font-weight:700;color:var(--green)" title="Ingresos: ${it._ingresos||0} · Salidas: ${it._salidas||0}">${it.available}</td>
      <td style="text-align:right">
        <input type="number" min="0" max="${it.available}" step="1" value="0"
          id="sal-qty-${i}"
          style="width:65px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--gold);padding:4px 7px;font-size:12px;text-align:right;font-family:'DM Mono',monospace;font-weight:700">
      </td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:11px">${fmt(it.unit_cost)}</td>
    </tr>`).join('');
  salidaUpdateCount();

  // ── Pending WOs section — always show when sal-apt-content is visible
  const wo_wrap = document.getElementById('sal-pending-wo-wrap');
  if(!wo_wrap) return;
  wo_wrap.style.display = '';
  document.getElementById('sal-pending-wo-count').textContent = pendingWOs.length;

  if(!pendingWOs.length){
    document.getElementById('sal-pending-wo-tb').innerHTML =
      `<tr><td colspan="5" style="padding:10px;text-align:center;color:var(--muted);font-size:11px">Sin salidas pendientes para este Job</td></tr>`;
    return;
  }

  const rows = pendingWOs.flatMap(wo=>
    (wo.items||[]).map(it=>`
      <tr style="border-bottom:1px solid rgba(0,0,0,.045)">
        <td style="padding:5px 10px;font-family:'DM Mono',monospace;font-size:10px;color:var(--red);font-weight:700">${esc(wo.id||'')}</td>
        <td style="padding:5px 10px;font-family:'DM Mono',monospace;font-size:11px;color:var(--gold)">${esc(it.part_number||'—')}</td>
        <td style="padding:5px 10px;font-size:11px;color:var(--muted2);max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(it.description||'—')}</td>
        <td style="padding:5px 10px;text-align:right;font-weight:700;color:var(--amber)">${it.quantity||0}</td>
        <td style="padding:5px 10px;font-size:10px;color:var(--muted);white-space:nowrap">${(wo.fecha||'').slice(0,10)}</td>
      </tr>`)
  ).join('');
  document.getElementById('sal-pending-wo-tb').innerHTML = rows;
}

function salidaFiltrarItems() {
  const q = (document.getElementById('sal-apt-filter')?.value||'').toLowerCase();
  document.querySelectorAll('#sal-apt-tb tr').forEach((row,i)=>{
    if(!q){ row.style.display=''; return; }
    const it = salidaAptItems[i];
    if(!it){ row.style.display=''; return; }
    const match = (it.part_number||'').toLowerCase().includes(q)||
                  (it.brand||'').toLowerCase().includes(q)||
                  (it.description||'').toLowerCase().includes(q);
    row.style.display = match ? '' : 'none';
  });
}

function salidaSelectAll(checked) {
  document.querySelectorAll('.sal-chk').forEach(chk=>{
    const row = chk.closest('tr');
    if(row && row.style.display!=='none') chk.checked=checked;
  });
  const masterChk = document.getElementById('sal-chk-all');
  if(masterChk) masterChk.checked=checked;
  salidaUpdateCount();
}

function salidaUpdateCount() {
  const checked = document.querySelectorAll('.sal-chk:checked').length;
  document.getElementById('sal-selected-count').textContent=`${checked} item(s) seleccionado(s)`;
  document.getElementById('btn-sal-save').disabled = checked===0;
}

async function salidaGuardar() {
  const job = document.getElementById('sal-job').value;
  if(!job){ toast('Selecciona un Job','er'); return; }
  const solicitante = USER_PERMS?.user || '—';
  const items = [];
  document.querySelectorAll('.sal-chk:checked').forEach(chk=>{
    const i  = parseInt(chk.dataset.idx);
    const it = salidaAptItems[i];
    if(!it) return;
    const qty = parseFloat(document.getElementById(`sal-qty-${i}`)?.value||0);
    if(qty<=0) return;
    items.push({ ...it, quantity: Math.min(qty, it.available) });
  });
  if(!items.length){ toast('Selecciona al menos un item con cantidad > 0','er'); return; }
  const btn=document.getElementById('btn-sal-save');
  btn.disabled=true; btn.textContent='Guardando…';
  try {
    const d = await fetch('/api/salida',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({job, solicitante, items})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-salida');
    toast(`✓ Salida registrada — ${items.length} item(s) pendientes de surtir`,'ok',5000);
    await loadSalida();
  } catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='📤 Registrar Salida';}
}

async function salidaSurtir(id) {
  if(!confirm('¿Confirmar SURTIR esta salida?\nSe descontará el material de Apartados.')) return;
  try {
    const d = await fetch(`/api/salida/${id}/surtir`,{method:'POST'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    toast('✓ Material surtido — Apartados actualizados','ok',4000);
    await loadSalida();
    await loadApartados();
  } catch(e){toast('Error: '+e.message,'er');}
}

async function salidaEliminar(id) {
  if(!confirm('¿Eliminar este registro de salida?')) return;
  try {
    const d = await fetch(`/api/salida/${id}`,{method:'DELETE'}).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    toast('Salida eliminada','ok');
    await loadSalida();
  } catch(e){toast('Error: '+e.message,'er');}
}

document.addEventListener('DOMContentLoaded', ()=>{ loadSalida(); });

// ════════════════════════════════════════════════════════
//  MOVIMIENTO APARTADOS → STOCK
// ════════════════════════════════════════════════════════
let movAptItems = [];

async function movStockOpenModal() {
  movAptItems = [];
  document.getElementById('mov-apt-empty').textContent='Selecciona un Job para ver los materiales apartados disponibles';
  document.getElementById('mov-apt-empty').style.display='';
  document.getElementById('mov-apt-content').style.display='none';
  document.getElementById('btn-mov-save').disabled=true;
  document.getElementById('mov-apt-filter').value='';
  // Show logged user
  const disp = document.getElementById('mov-solicitante-display');
  if(disp) disp.textContent = USER_PERMS?.user || '—';
  // Populate job dropdown
  const sel = document.getElementById('mov-job');
  sel.innerHTML = '<option value="">— Seleccionar Job —</option>'
    + '<option value="SHOPFLOOR">Shopfloor</option>'
    + (jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)} — ${esc(j.customer||'')}</option>`).join('');
  document.getElementById('mo-mov-stock').classList.add('on');
}

async function movStockCargarApartados() {
  const job = document.getElementById('mov-job').value;
  if(!job){
    document.getElementById('mov-apt-content').style.display='none';
    document.getElementById('mov-apt-empty').textContent='Selecciona un Job para ver los materiales disponibles';
    document.getElementById('mov-apt-empty').style.display='';
    return;
  }
  try {
    const d = await fetch(`/api/apartados?job=${encodeURIComponent(job)}`).then(r=>r.json());
    movAptItems = [];
    (d.records||[]).forEach(r=>{
      const jobEntry = (r.jobs||[]).find(j=>j.job.toUpperCase()===job.toUpperCase());
      if(jobEntry && jobEntry.quantity>0){
        movAptItems.push({
          part_number: r.part_number,
          brand:       r.brand||'',
          description: r.description||'',
          cat_code:    r.cat_code||'',
          label_code:  r.label_code||'',
          available:   jobEntry.quantity,
          unit_cost:   jobEntry.unit_cost||0,
        });
      }
    });
    if(!movAptItems.length){
      document.getElementById('mov-apt-empty').textContent=`No hay materiales apartados para el Job ${job}`;
      document.getElementById('mov-apt-empty').style.display='';
      document.getElementById('mov-apt-content').style.display='none';
      return;
    }
    document.getElementById('mov-apt-empty').style.display='none';
    document.getElementById('mov-apt-content').style.display='';
    movStockRenderItems();
  } catch(e){ toast('Error cargando apartados','er'); }
}

function movStockRenderItems() {
  const fmt = v=>'$'+Number(v||0).toFixed(2);
  document.getElementById('mov-apt-tb').innerHTML = movAptItems.map((it,i)=>`
    <tr id="mov-item-row-${i}">
      <td style="text-align:center">
        <input type="checkbox" class="mov-chk" data-idx="${i}"
          onchange="movStockUpdateCount()"
          style="accent-color:var(--amber);width:15px;height:15px;cursor:pointer">
      </td>
      <td style="font-weight:600">${esc(it.brand||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(it.part_number)}</td>
      <td style="color:var(--muted2);max-width:180px;overflow:hidden;text-overflow:ellipsis">${esc(it.description||'—')}</td>
      <td style="font-size:10px;color:var(--muted2)">${esc(it.cat_code||'—')}</td>
      <td style="text-align:right;font-weight:700;color:var(--green)">${it.available}</td>
      <td style="text-align:right">
        <input type="number" min="0" max="${it.available}" step="1" value="0"
          id="mov-qty-${i}" oninput="movStockUpdateCount()"
          style="width:65px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--amber);padding:4px 7px;font-size:12px;text-align:right;font-family:'DM Mono',monospace;font-weight:700">
      </td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:11px">${fmt(it.unit_cost)}</td>
    </tr>`).join('');
  movStockUpdateCount();
}

function movStockFiltrarItems() {
  const q = (document.getElementById('mov-apt-filter')?.value||'').toLowerCase();
  document.querySelectorAll('#mov-apt-tb tr').forEach((row,i)=>{
    if(!q){ row.style.display=''; return; }
    const it = movAptItems[i];
    const match = it &&
      ((it.part_number||'').toLowerCase().includes(q)||
       (it.brand||'').toLowerCase().includes(q)||
       (it.description||'').toLowerCase().includes(q));
    row.style.display = match ? '' : 'none';
  });
}

function movStockSelectAll(checked) {
  document.querySelectorAll('.mov-chk').forEach(chk=>{
    const row = chk.closest('tr');
    if(row && row.style.display!=='none') chk.checked=checked;
  });
  const masterChk = document.getElementById('mov-chk-all');
  if(masterChk) masterChk.checked=checked;
  movStockUpdateCount();
}

function movStockUpdateCount() {
  const checked = document.querySelectorAll('.mov-chk:checked').length;
  document.getElementById('mov-selected-count').textContent=`${checked} item(s) seleccionado(s)`;
  document.getElementById('btn-mov-save').disabled = checked===0;
}

async function movStockEjecutar() {
  const job = document.getElementById('mov-job').value;
  if(!job){ toast('Selecciona un Job','er'); return; }
  const solicitante = USER_PERMS?.user || '—';
  const items = [];
  document.querySelectorAll('.mov-chk:checked').forEach(chk=>{
    const i  = parseInt(chk.dataset.idx);
    const it = movAptItems[i];
    if(!it) return;
    const qty = parseFloat(document.getElementById(`mov-qty-${i}`)?.value||0);
    if(qty<=0) return;
    items.push({...it, quantity: Math.min(qty, it.available)});
  });
  if(!items.length){ toast('Selecciona al menos un item con cantidad > 0','er'); return; }
  if(!confirm(`¿Mover ${items.length} item(s) de Apartados a Stock?\nEsta acción es inmediata.`)) return;
  const btn=document.getElementById('btn-mov-save');
  btn.disabled=true; btn.textContent='Moviendo…';
  try {
    const d = await fetch('/api/movimiento-stock',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({job, solicitante, items})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-mov-stock');
    toast(`✓ ${d.items_moved} item(s) movidos a Stock`,'ok',4000);
    // Open PDF
    setTimeout(()=>window.open(`/api/movimiento-stock/${d.record.id}/pdf`,'_blank'),500);
    // Refresh stock and apartados
    await Promise.all([loadStock(), loadApartados()]);
  } catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false;btn.textContent='📦 Mover a Stock';}
}

// ════════════════════════════════════════════════════════
//  HISTORIAL DE MOVIMIENTOS A STOCK (drawer)
// ════════════════════════════════════════════════════════
let movHistorialOpen = false;

async function movHistorialToggle() {
  movHistorialOpen = !movHistorialOpen;
  const drawer = document.getElementById('mov-historial-drawer');
  const btn    = document.getElementById('btn-mov-hist');
  if(movHistorialOpen) {
    drawer.style.right = '0';
    btn.style.background='rgba(245,166,35,.15)';
    await movHistorialLoad();
  } else {
    drawer.style.right = '-360px';
    btn.style.background='';
  }
}

async function movHistorialLoad() {
  const list = document.getElementById('mov-historial-list');
  list.innerHTML='<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">Cargando…</div>';
  try {
    const d = await fetch('/api/movimiento-stock-list').then(r=>r.json());
    const records = (d.records||[]).slice().reverse(); // newest first
    if(!records.length){
      list.innerHTML='<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">Sin movimientos registrados</div>';
      return;
    }
    list.innerHTML = records.map(r=>`
      <div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:8px;background:rgba(0,0,0,.035)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--amber);font-weight:700">${esc(r.id)}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${r.fecha||''}</div>
          </div>
          <a href="/api/movimiento-stock/${esc(r.id)}/pdf" target="_blank"
            style="font-size:10px;padding:4px 10px;background:rgba(245,166,35,.15);color:var(--amber);border:1px solid var(--amber);border-radius:4px;text-decoration:none;white-space:nowrap">
            🖨 PDF
          </a>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          <span style="font-size:10px;background:rgba(255,193,7,.12);color:var(--gold);padding:2px 8px;border-radius:4px;font-family:'DM Mono',monospace;font-weight:700">
            Job: ${esc(r.job||'—')}
          </span>
          <span style="font-size:10px;background:rgba(0,0,0,.055);color:var(--muted2);padding:2px 8px;border-radius:4px">
            ${(r.items||[]).length} item(s)
          </span>
        </div>
        <div style="font-size:10px;color:var(--muted2)">👤 ${esc(r.solicitante||'—')}</div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.055)">
          ${(r.items||[]).map(it=>`
            <div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0">
              <span style="font-family:'DM Mono',monospace;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">${esc(it.part_number||'—')}</span>
              <span style="color:var(--green);font-weight:600;white-space:nowrap;margin-left:8px">${it.quantity||0} u.</span>
            </div>`).join('')}
        </div>
      </div>`).join('');
  } catch(e) {
    list.innerHTML='<div style="text-align:center;padding:24px;color:var(--red);font-size:12px">Error cargando historial</div>';
  }
}

// ════════════════════════════════════════════════════════
//  TIMING — Configuración Operativa del Proyecto
// ════════════════════════════════════════════════════════

const PC_DEFAULT_ACTIVITIES = [
  'Recepción de PO','Kickoff','Diseño Mecánico','Diseño Eléctrico',
  'Fabricación','Compra de Mercancías','Ensamble','Construcción de Gabinetes',
  'Integración (MEC + Elect)','Programación Offline','Puesta en Marcha',
  'Run Off Interno','Run Off con Cliente','Envío','Instalación en Sitio','Aprobación Final'
];

let _pcTimingRowCounter = 0;

function pcRenderTiming(savedRows) {
  const tb = document.getElementById('pc-timing-body');
  if(!tb) { console.error('pc-timing-body NOT FOUND in DOM'); return; }
  tb.innerHTML = '';
  _pcTimingRowCounter = 0;

  // Ya no se agregan actividades por defecto: el usuario elige de la lista
  // (datalist con sugerencias) o escribe la actividad que necesite.
  (savedRows||[]).forEach(r => { if(r.actividad) pcAddTimingRow(r); });

  pcUpdateTimingCalcs();
}

function pcAddTimingRow(data={}) {
  const tb = document.getElementById('pc-timing-body');
  if(!tb) return;

  const tr = document.createElement('tr');
  const inpS = 'background:var(--inp);border:1px solid rgba(255,193,7,.3);border-radius:4px;color:var(--amber);padding:5px 7px;font-size:11px';
  tr.innerHTML = `
    <td><input data-field="actividad" list="pc-act-list" value="${esc(data.actividad||data.name||'')}"
      oninput="pcUpdateTimingCalcs()" style="${inpS};width:100%"></td>
    <td><input data-field="actividad_previa" list="pc-act-list" value="${esc(data.actividad_previa||data.prev||'')}"
      oninput="pcUpdateTimingCalcs()" style="${inpS};width:100%;color:var(--muted2)"></td>
    <td><input data-field="fecha_inicial" type="date" value="${data.fecha_inicial||data.fecha_ini||''}"
      oninput="pcUpdateTimingCalcs()" style="${inpS};color:var(--text);width:100%"></td>
    <td><input data-field="dias_estimados" type="number" min="0" value="${data.dias_estimados||data.dias||0}"
      oninput="pcUpdateTimingCalcs()" style="${inpS};width:60px;text-align:right"></td>
    <td class="pc-t-cond" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted2);text-align:center">—</td>
    <td class="pc-t-obj"  style="font-family:'DM Mono',monospace;font-size:10px;color:var(--gold);text-align:center;font-weight:600">—</td>
    <td><input data-field="fecha_real_finalizacion" type="date" value="${data.fecha_real_finalizacion||''}"
      onchange="pcUpdateTimingCalcs()" style="${inpS};color:var(--text);width:100%"></td>
    <td style="text-align:center">
      <input data-field="cumplido" type="checkbox" ${data.cumplido?'checked':''}
        onchange="pcUpdateTimingCalcs()"
        style="accent-color:var(--green);width:16px;height:16px;cursor:pointer">
    </td>
    <td class="pc-t-status" style="text-align:center;font-size:10px">—</td>
    <td style="text-align:center">
      <input data-field="milestone" type="checkbox" ${(data.milestone_facturacion||data.milestone)?'checked':''}
        onchange="pcUpdateTimingCalcs()"
        style="accent-color:var(--gold);width:16px;height:16px;cursor:pointer">
    </td>
    <td><input data-field="pct_facturacion" type="number" min="0" max="100" step="1"
      value="${data.pct_facturacion||data.pct_fact||''}" placeholder="%"
      style="${inpS};width:55px;text-align:right;color:var(--gold)"></td>
    <td><button onclick="this.closest('tr').remove();pcUpdateTimingCalcs()"
      style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px">✕</button></td>`;
  tb.appendChild(tr);
}

function _pcF(tr,field){
  const el=tr.querySelector(`[data-field="${field}"]`);
  if(!el) return '';
  return el.type==='checkbox'?el.checked:(el.value||'');
}

function pcUpdateTimingCalcs() {
  const tb = document.getElementById('pc-timing-body');
  if(!tb) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const endDateMap = {};
  [...tb.rows].forEach(tr => {
    const activ = _pcF(tr,'actividad');
    const prev  = _pcF(tr,'actividad_previa');
    const fIni  = _pcF(tr,'fecha_inicial');
    const dias  = parseInt(_pcF(tr,'dias_estimados'))||0;
    const cumpl = _pcF(tr,'cumplido');
    const fReal = _pcF(tr,'fecha_real_finalizacion');
    let fCond = fIni ? new Date(fIni+'T00:00:00') : null;
    if(!fCond && prev && endDateMap[prev]) {
      fCond = new Date(endDateMap[prev]); fCond.setDate(fCond.getDate()+1);
    }
    const condEl=tr.querySelector('.pc-t-cond'), objEl=tr.querySelector('.pc-t-obj'), statEl=tr.querySelector('.pc-t-status');
    if(fCond) {
      const fmt = d=>d.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
      if(condEl) condEl.textContent=fmt(fCond);
      const fObj=new Date(fCond); fObj.setDate(fObj.getDate()+dias);
      if(objEl) objEl.textContent=fmt(fObj);
      if(activ) endDateMap[activ]=fObj;
      if(statEl){
        if(fReal) {
          const fRealDate = new Date(fReal+'T00:00:00');
          const diffDays = Math.round((fRealDate - fObj) / 86400000);
          if(diffDays > 0)      statEl.innerHTML = `<span style="color:var(--red);font-weight:700">⚠ RETRASO +${diffDays}d</span>`;
          else if(diffDays < 0) statEl.innerHTML = `<span style="color:var(--green);font-weight:700">✓ ADELANTO ${diffDays}d</span>`;
          else                  statEl.innerHTML = '<span style="color:var(--green);font-weight:700">✓ EN TIEMPO</span>';
        }
        else if(cumpl)       statEl.innerHTML='<span style="color:var(--green);font-weight:700">✓ CUMPLIDO</span>';
        else if(fCond>today) statEl.innerHTML='<span style="color:var(--muted)">EN ESPERA</span>';
        else if(fObj>=today) statEl.innerHTML='<span style="color:var(--amber);font-weight:600">EN TIEMPO</span>';
        else                 statEl.innerHTML='<span style="color:var(--red);font-weight:700">⚠ RETRASO</span>';
      }
    } else {
      if(condEl) condEl.textContent='—';
      if(objEl)  objEl.textContent='—';
      if(statEl) statEl.textContent='—';
    }
  });
  pcRenderGantt([...tb.rows], endDateMap);
}

function pcGetTimingData() {
  const tb = document.getElementById('pc-timing-body');
  if(!tb) return [];
  return [...tb.rows].map(tr => ({
    actividad:             _pcF(tr,'actividad'),
    actividad_previa:      _pcF(tr,'actividad_previa'),
    fecha_inicial:         _pcF(tr,'fecha_inicial'),
    dias_estimados:        parseInt(_pcF(tr,'dias_estimados'))||0,
    fecha_condicionada:    tr.querySelector('.pc-t-cond')?.textContent||'',
    fecha_objetivo:        tr.querySelector('.pc-t-obj')?.textContent||'',
    fecha_real_finalizacion: _pcF(tr,'fecha_real_finalizacion'),
    cumplido:              _pcF(tr,'cumplido'),
    milestone_facturacion: _pcF(tr,'milestone'),
    pct_facturacion:       parseFloat(_pcF(tr,'pct_facturacion'))||null,
  })).filter(r=>r.actividad);
}

function pcRenderGantt(rows, endDateMap) {
  const wrap  = document.getElementById('pc-gantt-wrap');
  const gantt = document.getElementById('pc-gantt');
  if(!wrap || !gantt) return;

  const entries = [];
  rows.forEach((tr) => {
    const act  = _pcF(tr,'actividad');
    const prev = _pcF(tr,'actividad_previa');
    const fIni = _pcF(tr,'fecha_inicial');
    const dias = parseInt(_pcF(tr,'dias_estimados'))||0;
    const cumpl= _pcF(tr,'cumplido');
    const mile = _pcF(tr,'milestone');
    const fRealStr = _pcF(tr,'fecha_real_finalizacion');
    if(!act) return;

    // Determine start: explicit fecha_inicial, or end of prev activity +1 day
    let start = fIni ? new Date(fIni+'T00:00:00') : null;
    if(!start && prev && endDateMap[prev]) {
      start = new Date(endDateMap[prev]);
      start.setDate(start.getDate()+1);
    }
    if(!start) return; // no date info — skip

    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(dias, 1));
    const fReal = fRealStr ? new Date(fRealStr+'T00:00:00') : null;
    entries.push({act, start, end, dias, cumpl, mile, fReal});
  });

  if(!entries.length){ wrap.style.display='none'; return; }
  wrap.style.display='';

  const today   = new Date(); today.setHours(0,0,0,0);
  const allDates = entries.flatMap(e => e.fReal ? [e.start, e.end, e.fReal] : [e.start, e.end]);
  const minD    = new Date(Math.min(...allDates));
  const maxD    = new Date(Math.max(...allDates));
  const totalMs = Math.max(1, maxD - minD);
  const W = 700, ROW = 22, PAD = 4, LABEL = 170;

  const pct = d => ((d - minD) / totalMs * W).toFixed(1);
  const todayX = parseFloat(pct(today));

  let svgRows = entries.map((e,i) => {
    const x = parseFloat(pct(e.start));
    const w = Math.max(4, parseFloat(pct(e.end)) - x);
    const y = PAD + i*(ROW+2);
    const color = e.cumpl ? '#1f8a4c' : (e.end < today ? '#c8102e' : '#a8650a');
    const mileIcon = e.mile ? ' ★' : '';
    const label = e.act.length > 24 ? e.act.slice(0,23)+'…' : e.act;
    let extra = '';
    if(e.fReal) {
      const xr = parseFloat(pct(e.fReal));
      const diffDays = Math.round((e.fReal - e.end) / 86400000);
      const markerColor = diffDays > 0 ? '#c8102e' : (diffDays < 0 ? '#1f8a4c' : '#1f3864');
      // Marcador (rombo) en la fecha real de finalización
      extra += `<rect x="${LABEL+xr-3.5}" y="${y+ROW/2-3.5}" width="7" height="7" fill="${markerColor}" stroke="#fff" stroke-width="0.6" transform="rotate(45 ${LABEL+xr} ${y+ROW/2})"/>`;
      // Línea/bracket entre lo planeado y lo real si difieren
      if(diffDays !== 0) {
        const xEnd = LABEL + parseFloat(pct(e.end));
        const xReal = LABEL + xr;
        const x1 = Math.min(xEnd, xReal), x2 = Math.max(xEnd, xReal);
        extra += `<line x1="${x1}" y1="${y+ROW/2}" x2="${x2}" y2="${y+ROW/2}" stroke="${markerColor}" stroke-width="1.2" stroke-dasharray="2,2"/>
        <text x="${x2+4}" y="${y+ROW/2+3}" font-size="8" fill="${markerColor}" font-family="Arial" font-weight="700">${diffDays>0?'+':''}${diffDays}d</text>`;
      }
    }
    return `
    <rect x="${LABEL+x}" y="${y+3}" width="${w}" height="${ROW-6}" rx="3" fill="${color}" opacity=".85"/>
    <text x="${LABEL+x+4}" y="${y+ROW-8}" font-size="9" fill="white" font-family="Arial">${e.dias>0?e.dias+'d':''}</text>
    <text x="${LABEL-4}" y="${y+ROW-8}" font-size="10" fill="#555" text-anchor="end" font-family="Arial">${label}${mileIcon}</text>
    ${extra}`;
  }).join('');

  if(todayX >= 0 && todayX <= W) {
    svgRows += `<line x1="${LABEL+todayX}" y1="0" x2="${LABEL+todayX}" y2="${PAD+entries.length*(ROW+2)}" stroke="#c8102e" stroke-width="1.5" stroke-dasharray="4,2"/>
    <text x="${LABEL+todayX+3}" y="10" font-size="8" fill="#c8102e" font-family="Arial">Hoy</text>`;
  }

  const svgH = PAD + entries.length*(ROW+2) + 10;
  gantt.innerHTML = `<svg width="${LABEL+W+50}" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="background:rgba(0,0,0,.03);border-radius:6px">
    ${svgRows}
  </svg>`;
}

// ════════════════════════════════════════════════════════
//  CONFIGURAR PROYECTO — PUNTOS ABIERTOS
// ════════════════════════════════════════════════════════
function pcRenderPuntos(savedRows) {
  const tb = document.getElementById('pc-abiertos-body');
  if(!tb) return;
  tb.innerHTML = '';
  (savedRows||[]).forEach(r => pcAddPuntoRow(r));
  if(!(savedRows||[]).length) pcUpdatePuntosSummary();
}

function pcAddPuntoRow(data={}) {
  const tb = document.getElementById('pc-abiertos-body');
  if(!tb) return;
  const inpS = 'background:var(--inp);border:1px solid rgba(255,193,7,.3);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px';
  const estatus = (data.estatus || 'OPEN').toUpperCase();
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="pc-punto-item" style="text-align:center;font-weight:700;color:var(--muted)">—</td>
    <td><input data-field="fecha_apertura" type="date" value="${data.fecha_apertura||''}"
      onchange="pcUpdatePuntosSummary()" style="${inpS};width:100%"></td>
    <td><input data-field="tool_frame" value="${esc(data.tool_frame||'')}"
      style="${inpS};width:100%"></td>
    <td><input data-field="descripcion" value="${esc(data.descripcion||'')}"
      style="${inpS};width:100%"></td>
    <td><input data-field="notas" value="${esc(data.notas||'')}"
      style="${inpS};width:100%;color:var(--muted2)"></td>
    <td><input data-field="responsable" value="${esc(data.responsable||'')}"
      style="${inpS};width:100%"></td>
    <td><input data-field="fecha_compromiso" type="date" value="${data.fecha_compromiso||''}"
      style="${inpS};width:100%"></td>
    <td><input data-field="fecha_finalizacion" type="date" value="${data.fecha_finalizacion||''}"
      onchange="pcUpdatePuntosSummary()" style="${inpS};width:100%"></td>
    <td>
      <select data-field="estatus" onchange="pcUpdatePuntosSummary()"
        style="${inpS};width:100%;font-weight:700;color:${estatus==='CLOSE'?'var(--green)':'var(--amber)'}">
        <option value="OPEN" ${estatus==='OPEN'?'selected':''}>OPEN</option>
        <option value="CLOSE" ${estatus==='CLOSE'?'selected':''}>CLOSE</option>
      </select>
    </td>
    <td><button onclick="this.closest('tr').remove();pcUpdatePuntosSummary()"
      style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px">✕</button></td>`;
  tb.appendChild(tr);
  pcUpdatePuntosSummary();
}

function pcUpdatePuntosSummary() {
  const tb = document.getElementById('pc-abiertos-body');
  if(!tb) return;
  let open=0, close=0;
  [...tb.rows].forEach((tr,i) => {
    const itemEl = tr.querySelector('.pc-punto-item');
    if(itemEl) itemEl.textContent = i+1;
    const est = tr.querySelector('[data-field="estatus"]')?.value || 'OPEN';
    if(est==='CLOSE') close++; else open++;
    const sel = tr.querySelector('[data-field="estatus"]');
    if(sel) sel.style.color = est==='CLOSE' ? 'var(--green)' : 'var(--amber)';
  });
  const summ = document.getElementById('pc-abiertos-summary');
  if(summ) summ.textContent = `${tb.rows.length} puntos · ${open} abiertos · ${close} cerrados`;
}

function pcGetPuntosData() {
  const tb = document.getElementById('pc-abiertos-body');
  if(!tb) return [];
  return [...tb.rows].map((tr,i) => ({
    item:                i+1,
    fecha_apertura:      tr.querySelector('[data-field="fecha_apertura"]')?.value||'',
    tool_frame:          tr.querySelector('[data-field="tool_frame"]')?.value||'',
    descripcion:         tr.querySelector('[data-field="descripcion"]')?.value||'',
    notas:               tr.querySelector('[data-field="notas"]')?.value||'',
    responsable:         tr.querySelector('[data-field="responsable"]')?.value||'',
    fecha_compromiso:    tr.querySelector('[data-field="fecha_compromiso"]')?.value||'',
    fecha_finalizacion:  tr.querySelector('[data-field="fecha_finalizacion"]')?.value||'',
    estatus:             tr.querySelector('[data-field="estatus"]')?.value||'OPEN',
  })).filter(r=>r.descripcion || r.tool_frame || r.responsable);
}

// ════════════════════════════════════════════════════════
//  CONFIGURAR PROYECTO — CONTROL DE CAMBIOS
// ════════════════════════════════════════════════════════
function pcRenderCambios(savedRows) {
  const tb = document.getElementById('pc-cambios-body');
  if(!tb) return;
  tb.innerHTML = '';
  (savedRows||[]).forEach(r => pcAddCambioRow(r));
}

function pcCambioEstatusColor(est) {
  return est==='AUTORIZADO' ? 'var(--green)' : est==='CANCELADO' ? 'var(--red)' : 'var(--amber)';
}

function pcAddCambioRow(data={}) {
  const tb = document.getElementById('pc-cambios-body');
  if(!tb) return;
  const inpS = 'background:var(--inp);border:1px solid rgba(255,193,7,.3);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px';
  const estatus = (data.estatus || 'EN ESPERA').toUpperCase();
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input data-field="fecha" type="date" value="${data.fecha||''}" style="${inpS};width:100%"></td>
    <td><input data-field="descripcion" value="${esc(data.descripcion||'')}" style="${inpS};width:100%"></td>
    <td><input data-field="impacto" value="${esc(data.impacto||'')}" style="${inpS};width:100%;color:var(--muted2)"></td>
    <td><input data-field="quien_solicita" value="${esc(data.quien_solicita||'')}" style="${inpS};width:100%"></td>
    <td><input data-field="quien_autoriza" value="${esc(data.quien_autoriza||'')}" style="${inpS};width:100%"></td>
    <td>
      <select data-field="estatus" onchange="this.style.color=pcCambioEstatusColor(this.value)"
        style="${inpS};width:100%;font-weight:700;color:${pcCambioEstatusColor(estatus)}">
        <option value="EN ESPERA" ${estatus==='EN ESPERA'?'selected':''}>EN ESPERA</option>
        <option value="AUTORIZADO" ${estatus==='AUTORIZADO'?'selected':''}>AUTORIZADO</option>
        <option value="CANCELADO" ${estatus==='CANCELADO'?'selected':''}>CANCELADO</option>
      </select>
    </td>
    <td><button onclick="this.closest('tr').remove()"
      style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px">✕</button></td>`;
  tb.appendChild(tr);
}

function pcGetCambiosData() {
  const tb = document.getElementById('pc-cambios-body');
  if(!tb) return [];
  return [...tb.rows].map(tr => ({
    fecha:           tr.querySelector('[data-field="fecha"]')?.value||'',
    descripcion:     tr.querySelector('[data-field="descripcion"]')?.value||'',
    impacto:         tr.querySelector('[data-field="impacto"]')?.value||'',
    quien_solicita:  tr.querySelector('[data-field="quien_solicita"]')?.value||'',
    quien_autoriza:  tr.querySelector('[data-field="quien_autoriza"]')?.value||'',
    estatus:         tr.querySelector('[data-field="estatus"]')?.value||'EN ESPERA',
  })).filter(r=>r.descripcion);
}

// ════════════════════════════════════════════════════════
//  CONFIGURAR PROYECTO — PLAN DE PERSONAL
// ════════════════════════════════════════════════════════
let pcPersonalDayKeys = [];
const PC_PERSONAL_AREAS = ['INGENIERIA MECANICA', 'INGENIERIA ELECTRICA', 'PISO DE ENSAMBLE'];
const PC_AREA_LABELS = {
  'INGENIERIA MECANICA':  'Ing. Mecánica',
  'INGENIERIA ELECTRICA': 'Ing. Eléctrica',
  'PISO DE ENSAMBLE':     'Piso de Ensamble',
};
function pcAreaLabel(a) { return PC_AREA_LABELS[a] || a; }

function pcGetTimingDateRange() {
  const tb = document.getElementById('pc-timing-body');
  if(!tb || !tb.rows.length) return null;
  const endDateMap = {};
  let minStart = null, maxEnd = null, runoffEnd = null;
  [...tb.rows].forEach(tr => {
    const activ = _pcF(tr,'actividad');
    const prev  = _pcF(tr,'actividad_previa');
    const fIni  = _pcF(tr,'fecha_inicial');
    const dias  = parseInt(_pcF(tr,'dias_estimados'))||0;
    if(!activ) return;
    let fCond = fIni ? new Date(fIni+'T00:00:00') : null;
    if(!fCond && prev && endDateMap[prev]) {
      fCond = new Date(endDateMap[prev]); fCond.setDate(fCond.getDate()+1);
    }
    if(!fCond) return;
    const fObj = new Date(fCond); fObj.setDate(fObj.getDate()+dias);
    endDateMap[activ] = fObj;
    if(!minStart || fCond < minStart) minStart = fCond;
    if(!maxEnd || fObj > maxEnd) maxEnd = fObj;
    if(activ.toLowerCase().includes('run off interno')) runoffEnd = fObj;
  });
  if(!minStart || !maxEnd) return null;
  return { start: minStart, end: (runoffEnd && runoffEnd > minStart) ? runoffEnd : maxEnd };
}

async function pcRefreshPersonalTab() {
  pcPersonalRange = pcGetTimingDateRange();
  const emptyEl = document.getElementById('pc-personal-empty');
  const wrapEl  = document.getElementById('pc-personal-wrap');
  const rangoEl = document.getElementById('pc-personal-rango');
  if(!pcPersonalRange) {
    emptyEl.style.display = '';
    wrapEl.style.display = 'none';
    return;
  }
  const totalDays = Math.round((pcPersonalRange.end - pcPersonalRange.start)/86400000)+1;
  if(totalDays > 400) {
    emptyEl.style.display = '';
    emptyEl.innerHTML = `⚠ El rango calculado desde Timing es de ${totalDays} días — revisa las fechas de las actividades antes de continuar.`;
    wrapEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  wrapEl.style.display = '';
  const fmtD = d => d.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
  rangoEl.textContent = `${fmtD(pcPersonalRange.start)} → ${fmtD(pcPersonalRange.end)} (${totalDays} días) — tomado de la pestaña Timing`;

  // Cargar catálogo de tarifas (Hourly Rate Register) del año de la fecha de inicio
  const year = pcPersonalRange.start.getFullYear();
  try {
    const d = await fetch(`/api/rates?year=${year}`).then(r=>r.json());
    pcPersonalRatesMap = {};
    (d.records||[]).forEach(r => { if(r.employee) pcPersonalRatesMap[r.employee] = parseFloat(r.rate)||0; });
  } catch(e) { pcPersonalRatesMap = {}; }

  pcRenderPersonalTable();
}

function pcRenderPersonalTable() {
  if(!pcPersonalRange) return;
  const fxBody = document.getElementById('pc-personal-frozen-body');
  const scBody = document.getElementById('pc-personal-scroll-body');
  const scHead = document.getElementById('pc-personal-scroll-thead');
  if(!fxBody || !scBody || !scHead) return;

  // Preservar lo ya capturado en pantalla (si lo hay) antes de reconstruir columnas
  const rowsSource = fxBody.children.length ? pcGetPlanPersonalData() : (pcPersonalSaved||[]);

  const days = [];
  let d = new Date(pcPersonalRange.start);
  while(d <= pcPersonalRange.end) { days.push(new Date(d)); d.setDate(d.getDate()+1); }
  pcPersonalDayKeys = days.map(dt => dt.toISOString().slice(0,10));

  scHead.innerHTML = days.map(dt =>
    `<div style="flex:0 0 44px;text-align:center;font-size:9px;font-weight:600;text-transform:uppercase;color:${[0,6].includes(dt.getDay())?'var(--muted)':'var(--muted2)'}">${dt.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'})}</div>`
  ).join('');

  fxBody.innerHTML = '';
  scBody.innerHTML = '';
  rowsSource.forEach(r => pcAddPersonaRow(r));
  pcUpdatePersonalTotals();
}

function pcAddPersonaRow(data={}) {
  const fxBody = document.getElementById('pc-personal-frozen-body');
  const scBody = document.getElementById('pc-personal-scroll-body');
  if(!fxBody || !scBody || !pcPersonalRange) return;
  const rowId = `pc-pers-${_pcPersonalRowSeq++}`;

  const employees = Object.keys(pcPersonalRatesMap).sort();
  const selected = data.employee || '';
  let options = ['<option value="">Selecciona…</option>']
    .concat(employees.map(e => `<option value="${esc(e)}" ${e===selected?'selected':''}>${esc(e)}</option>`));
  if(selected && !employees.includes(selected)) {
    options.push(`<option value="${esc(selected)}" selected>${esc(selected)} ⚠ (sin tarifa)</option>`);
  }

  const selectedArea = (data.area || '').toUpperCase();
  const areaOptions = ['<option value="">—</option>']
    .concat(PC_PERSONAL_AREAS.map(a => `<option value="${a}" ${a===selectedArea?'selected':''}>${pcAreaLabel(a)}</option>`));
  if(selectedArea && !PC_PERSONAL_AREAS.includes(selectedArea)) {
    areaOptions.push(`<option value="${esc(selectedArea)}" selected>${esc(selectedArea)}</option>`);
  }

  const selStyle = 'width:100%;height:32px;box-sizing:border-box;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:0 6px;font-size:11px';

  const fxRow = document.createElement('div');
  fxRow.id = `fx-${rowId}`;
  fxRow.style.cssText = 'display:flex;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)';
  fxRow.innerHTML = `
    <div style="flex:0 0 220px;padding:0 14px;box-sizing:border-box">
      <select data-field="employee" onchange="pcPersonaRowRecalc('${rowId}')" style="${selStyle}">${options.join('')}</select>
    </div>
    <div style="flex:0 0 190px;padding:0 14px;box-sizing:border-box">
      <select data-field="area" onchange="pcUpdatePersonalTotals()" style="${selStyle};color:var(--amber)">${areaOptions.join('')}</select>
    </div>
    <div style="flex:0 0 80px;padding:0 14px;box-sizing:border-box;text-align:right;font-family:'DM Mono',monospace" id="${rowId}-rate">—</div>
    <div style="flex:0 0 90px;padding:0 14px;box-sizing:border-box;text-align:right;font-family:'DM Mono',monospace;font-weight:700" id="${rowId}-hours">0</div>
    <div style="flex:0 0 100px;padding:0 14px;box-sizing:border-box;text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:var(--gold);border-right:2px solid var(--border)" id="${rowId}-amount">$0.00</div>
    <div style="flex:0 0 32px;text-align:center"><button onclick="pcRemovePersonaRow('${rowId}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px">✕</button></div>
  `;
  fxBody.appendChild(fxRow);

  const daysVal = data.days || {};
  const scRow = document.createElement('div');
  scRow.id = `sc-${rowId}`;
  scRow.style.cssText = 'display:flex;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)';
  scRow.innerHTML = pcPersonalDayKeys.map(key =>
    `<div style="flex:0 0 44px;text-align:center;padding:0 2px;box-sizing:border-box">
      <input data-day="${key}" type="number" min="0" step="0.5" value="${daysVal[key]||''}" oninput="pcPersonaRowRecalc('${rowId}')"
        style="width:38px;height:32px;box-sizing:border-box;background:var(--inp);border:1px solid var(--border);border-radius:3px;color:var(--text);padding:0 3px;font-size:10px;text-align:center">
    </div>`
  ).join('');
  scBody.appendChild(scRow);

  pcPersonaRowRecalc(rowId);
}

function pcRemovePersonaRow(rowId) {
  document.getElementById(`fx-${rowId}`)?.remove();
  document.getElementById(`sc-${rowId}`)?.remove();
  pcUpdatePersonalTotals();
}

function pcPersonaRowRecalc(rowId) {
  const fxRow = document.getElementById(`fx-${rowId}`);
  const scRow = document.getElementById(`sc-${rowId}`);
  if(!fxRow || !scRow) return;
  const emp  = fxRow.querySelector('[data-field="employee"]')?.value || '';
  const rate = Object.prototype.hasOwnProperty.call(pcPersonalRatesMap, emp) ? pcPersonalRatesMap[emp] : null;
  const hours = [...scRow.querySelectorAll('[data-day]')].reduce((s,inp)=>s+(parseFloat(inp.value)||0),0);
  const amount = (rate||0) * hours;
  const rateEl = document.getElementById(`${rowId}-rate`);
  if(rateEl) rateEl.innerHTML = rate!=null
    ? `$${rate.toLocaleString('en-US',{minimumFractionDigits:2})}`
    : (emp ? '<span style="color:var(--red)" title="Sin tarifa registrada en Hourly Rate Register">⚠ N/D</span>' : '—');
  const hoursEl = document.getElementById(`${rowId}-hours`);
  const amountEl = document.getElementById(`${rowId}-amount`);
  if(hoursEl) hoursEl.textContent = hours.toLocaleString('en-US',{maximumFractionDigits:1});
  if(amountEl) amountEl.textContent = '$'+amount.toLocaleString('en-US',{minimumFractionDigits:2});
  pcUpdatePersonalTotals();
}

function pcUpdatePersonalTotals() {
  const fxBody = document.getElementById('pc-personal-frozen-body');
  if(!fxBody) return;
  let totHours=0, totAmount=0;
  const byArea = {}; // {AREA: {hours, amount}}
  PC_PERSONAL_AREAS.forEach(a => byArea[a] = {hours:0, amount:0});

  [...fxBody.children].forEach(fxRow => {
    const rowId = fxRow.id.replace(/^fx-/, '');
    const scRow = document.getElementById(`sc-${rowId}`);
    const emp = fxRow.querySelector('[data-field="employee"]')?.value || '';
    const area = (fxRow.querySelector('[data-field="area"]')?.value || '').toUpperCase();
    const rate = pcPersonalRatesMap[emp] ?? 0;
    const hours = scRow ? [...scRow.querySelectorAll('[data-day]')].reduce((s,inp)=>s+(parseFloat(inp.value)||0),0) : 0;
    const amount = rate*hours;
    totHours += hours; totAmount += amount;
    if(byArea[area]) { byArea[area].hours += hours; byArea[area].amount += amount; }
  });

  const hEl = document.getElementById('pc-personal-tot-horas');
  const aEl = document.getElementById('pc-personal-tot-monto');
  if(hEl) hEl.textContent = totHours.toLocaleString('en-US',{maximumFractionDigits:1});
  if(aEl) aEl.textContent = '$'+totAmount.toLocaleString('en-US',{minimumFractionDigits:2});

  const areaTb = document.getElementById('pc-personal-area-tb');
  if(areaTb) {
    areaTb.innerHTML = PC_PERSONAL_AREAS.map(a => `
      <tr>
        <td style="font-weight:600">${pcAreaLabel(a)}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace">${byArea[a].hours.toLocaleString('en-US',{maximumFractionDigits:1})}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">$${byArea[a].amount.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
      </tr>`).join('');
  }
}

function pcGetPlanPersonalData() {
  const fxBody = document.getElementById('pc-personal-frozen-body');
  if(!fxBody) return [];
  return [...fxBody.children].map(fxRow => {
    const rowId = fxRow.id.replace(/^fx-/, '');
    const scRow = document.getElementById(`sc-${rowId}`);
    const employee = fxRow.querySelector('[data-field="employee"]')?.value || '';
    const area = fxRow.querySelector('[data-field="area"]')?.value || '';
    const days = {};
    if(scRow) scRow.querySelectorAll('[data-day]').forEach(inp => {
      const v = parseFloat(inp.value)||0;
      if(v>0) days[inp.dataset.day] = v;
    });
    return {employee, area, days};
  }).filter(r=>r.employee);
}

async function pcImportPersonalExcel(file) {
  if(!file) return;
  if(!pcPersonalRange) { toast('Configura primero las fechas en la pestaña Timing', 'er'); return; }
  try {
    const fd = new FormData();
    fd.append('file', file);
    const d = await fetch('/api/projconfig/plan-personal/import', { method:'POST', body: fd }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    pcApplyImportedPersonal(d.records || []);
  } catch(e) { toast('Error leyendo el archivo: '+e.message, 'er'); }
  finally { document.getElementById('pc-personal-import-file').value = ''; }
}

function pcApplyImportedPersonal(records) {
  const fxBody = document.getElementById('pc-personal-frozen-body');
  if(!fxBody) return;
  const validKeys = new Set(pcPersonalDayKeys);
  let applied = 0, skipped = 0, personasNuevas = 0;

  records.forEach(rec => {
    const daysInRange = {};
    Object.entries(rec.days||{}).forEach(([k,v]) => {
      if(validKeys.has(k)) { daysInRange[k] = v; applied++; }
      else skipped++;
    });

    let existingFxRow = [...fxBody.children].find(row => row.querySelector('[data-field="employee"]')?.value === rec.employee);
    if(!existingFxRow) {
      pcAddPersonaRow({employee: rec.employee, area: rec.area||'', days: daysInRange});
      personasNuevas++;
    } else {
      const rowId = existingFxRow.id.replace(/^fx-/, '');
      if(rec.area) {
        const areaSel = existingFxRow.querySelector('[data-field="area"]');
        if(areaSel) {
          const opt = [...areaSel.options].find(o=>o.value===rec.area.toUpperCase());
          if(opt) areaSel.value = rec.area.toUpperCase();
        }
      }
      const scRow = document.getElementById(`sc-${rowId}`);
      if(scRow) Object.entries(daysInRange).forEach(([date,hours]) => {
        const inp = scRow.querySelector(`[data-day="${date}"]`);
        if(inp) inp.value = hours;
      });
      pcPersonaRowRecalc(rowId);
    }
  });

  pcUpdatePersonalTotals();
  const skippedMsg = skipped ? ` — ⚠ ${skipped} valor(es) fuera del rango de Timing se omitieron` : '';
  toast(`✓ Importado: ${records.length} persona(s), ${personasNuevas} nueva(s)${skippedMsg}`, skipped ? 'if' : 'ok', 6000);
}

// Datalist for autocomplete
document.addEventListener('DOMContentLoaded', ()=>{
  const dl = document.createElement('datalist');
  dl.id = 'pc-act-list';
  PC_DEFAULT_ACTIVITIES.forEach(a=>{ const opt=document.createElement('option'); opt.value=a; dl.appendChild(opt); });
  document.body.appendChild(dl);
});

// ════════════════════════════════════════════════════════
//  SERVICIO — VIÁTICOS
// ════════════════════════════════════════════════════════
let viaData = [];

async function loadViaticos() {
  const d = await fetch('/api/viaticos').then(r=>r.json());
  viaData = d.records||[];
  // Populate job filter
  const jobs_via = [...new Set(viaData.map(r=>r.job).filter(Boolean))].sort();
  const sel = document.getElementById('via-job-flt');
  if(sel) sel.innerHTML='<option value="">Todos los Jobs</option>'+jobs_via.map(j=>`<option>${esc(j)}</option>`).join('');
  viaRender();
}

function viaRender() {
  const gs  = (document.getElementById('via-gs')?.value||'').toLowerCase();
  const job = document.getElementById('via-job-flt')?.value||'';
  let rows = viaData;
  if(gs)  rows = rows.filter(r=>(r.tipo_movimiento||'').toLowerCase().includes(gs)||(r.job||'').toLowerCase().includes(gs)||(r.fecha||'').includes(gs));
  if(job) rows = rows.filter(r=>r.job===job);
  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const totalUSD = rows.reduce((s,r)=>s+(r.valor_usd||0),0);
  const badge = document.getElementById('via-total-badge');
  if(badge) badge.textContent = `Total: ${fmt(totalUSD)} USD`;
  const isAdm = USER_PERMS?.is_admin;
  document.getElementById('via-tb').innerHTML = rows.map(r=>`
    <tr>
      <td style="color:var(--muted2)">${r.fecha||'—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">${esc(r.id_externo||'—')}</td>
      <td>${esc(r.tipo_movimiento||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(r.monto)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:10px;color:var(--muted2)">${(r.tipo_cambio||0).toFixed(4)}</td>
      <td style="text-align:right;font-weight:700;color:var(--gold);font-family:'DM Mono',monospace">${fmt(r.valor_usd)}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(r.job||'—')}</td>
      <td style="color:var(--muted2);font-size:11px">${esc(r.notas||'')}</td>
      <td>${isAdm?`<button onclick="viaDelete('${esc(r.id)}')" class="fi-del" style="font-size:11px">✕</button>`:''}</td>
    </tr>`).join('');
  const cnt = document.getElementById('via-count');
  if(cnt) cnt.textContent = `${rows.length} registros · ${fmt(totalUSD)} USD`;
}

function viaOpenNew() {
  document.getElementById('via-n-fecha').value='';
  document.getElementById('via-n-id').value='';
  document.getElementById('via-n-tipo').value='';
  document.getElementById('via-n-monto').value='';
  document.getElementById('via-n-tc').value='';
  document.getElementById('via-n-usd').textContent='$0.00';
  document.getElementById('via-n-notas').value='';
  const sel = document.getElementById('via-n-job');
  sel.innerHTML='<option value="">— Job —</option>'+(jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)}</option>`).join('');
  document.getElementById('mo-via-new').classList.add('on');
}

async function viaLoadFX() {
  const fecha = document.getElementById('via-n-fecha').value;
  if(!fecha) return;
  try {
    const d = await fetch(`/api/fx/lookup?date=${fecha}`).then(r=>r.json());
    if(d.rate) { document.getElementById('via-n-tc').value=d.rate.toFixed(4); viaCalcUSD(); }
  } catch(e){}
}

function viaCalcUSD() {
  const monto = parseFloat(document.getElementById('via-n-monto').value)||0;
  const tc    = parseFloat(document.getElementById('via-n-tc').value)||1;
  const usd   = tc > 0 ? monto/tc : monto;
  document.getElementById('via-n-usd').textContent='$'+usd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
}

async function viaSave() {
  const fecha = document.getElementById('via-n-fecha').value;
  const tipo  = document.getElementById('via-n-tipo').value.trim();
  const monto = parseFloat(document.getElementById('via-n-monto').value)||0;
  const job   = document.getElementById('via-n-job').value;
  if(!fecha||!tipo||!monto||!job){ toast('Fecha, Tipo, Monto y Job son requeridos','er'); return; }
  const tc  = parseFloat(document.getElementById('via-n-tc').value)||0;
  const btn = document.querySelector('#mo-via-new .btn-p');
  if(btn){ btn.disabled=true; btn.textContent='Guardando…'; }
  try {
    const d = await fetch('/api/viaticos',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fecha,
        id_externo:   document.getElementById('via-n-id').value.trim(),
        tipo_movimiento: tipo, monto, tipo_cambio: tc, job,
        notas: document.getElementById('via-n-notas').value.trim()})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-via-new');
    toast('Viático guardado ✓','ok');
    await loadViaticos();
  } catch(e){toast('Error: '+e.message,'er');}
  finally{ if(btn){btn.disabled=false;btn.textContent='💾 Guardar';} }
}

async function viaDelete(id) {
  if(!confirm('¿Eliminar este viático?')) return;
  const d = await fetch(`/api/viaticos/${id}`,{method:'DELETE'}).then(r=>r.json());
  if(d.error){toast(d.error,'er');return;}
  toast('Eliminado','ok'); await loadViaticos();
}

function viaOpenImport() {
  document.getElementById('via-imp-result').textContent='';
  document.getElementById('mo-via-imp').classList.add('on');
}
function viaDropFile(e){ e.preventDefault(); viaImportFile(e.dataTransfer.files[0]); }
async function viaImport(inp){ await viaImportFile(inp.files[0]); }
async function viaImportFile(file) {
  if(!file) return;
  const fd = new FormData(); fd.append('file', file);
  const d = await fetch('/api/viaticos/import',{method:'POST',body:fd}).then(r=>r.json());
  const res = document.getElementById('via-imp-result');
  if(d.error){ res.style.color='var(--red)'; res.textContent='Error: '+d.error; return; }
  res.style.color='var(--green)'; res.textContent=`✓ ${d.added} registros importados`;
  await loadViaticos();
}

function gvOpenImport() {
  document.getElementById('gv-imp-result').textContent='';
  document.getElementById('mo-gv-imp').classList.add('on');
}
function gvDropFile(e){ e.preventDefault(); gvImportFile(e.dataTransfer.files[0]); }
async function gvImport(inp){ await gvImportFile(inp.files[0]); }
async function gvImportFile(file) {
  if(!file) return;
  const fd = new FormData(); fd.append('file', file);
  const d = await fetch('/api/gastos-viaje/import',{method:'POST',body:fd}).then(r=>r.json());
  const res = document.getElementById('gv-imp-result');
  if(d.error){ res.style.color='var(--red)'; res.textContent='Error: '+d.error; return; }
  res.style.color='var(--green)'; res.textContent=`✓ ${d.added} registros importados`;
  await loadGastos();
}

// ════════════════════════════════════════════════════════
//  SERVICIO — GASTOS DE VIAJE
// ════════════════════════════════════════════════════════
let gvData = [];

async function loadGastos() {
  const d = await fetch('/api/gastos-viaje').then(r=>r.json());
  gvData = d.records||[];
  const jobsGv = [...new Set(gvData.map(r=>r.job).filter(Boolean))].sort();
  const sel = document.getElementById('gv-job-flt');
  if(sel) sel.innerHTML='<option value="">Todos</option>'+jobsGv.map(j=>`<option>${esc(j)}</option>`).join('');
  gvRender();
}

function gvRender() {
  const gs  = (document.getElementById('gv-gs')?.value||'').toLowerCase();
  const job = document.getElementById('gv-job-flt')?.value||'';
  let rows = gvData;
  if(gs)  rows = rows.filter(r=>(r.tipo_gasto||'').toLowerCase().includes(gs)||(r.job||'').toLowerCase().includes(gs));
  if(job) rows = rows.filter(r=>r.job===job);
  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const totalUSD = rows.reduce((s,r)=>s+(r.valor_usd||0),0);
  const badge = document.getElementById('gv-total-badge');
  if(badge) badge.textContent=`Total: ${fmt(totalUSD)} USD`;
  const isAdm = USER_PERMS?.is_admin;
  document.getElementById('gv-tb').innerHTML = rows.map(r=>`
    <tr>
      <td style="color:var(--muted2)">${r.fecha||'—'}</td>
      <td><span style="font-size:10px;background:rgba(0,0,0,.065);padding:2px 8px;border-radius:4px">${esc(r.tipo_gasto||'—')}</span></td>
      <td style="font-size:11px;color:var(--muted2)">${r.moneda||'USD'}</td>
      <td style="text-align:right;font-size:10px;font-family:'DM Mono',monospace;color:var(--muted2)">${(r.tipo_cambio||1).toFixed(4)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(r.costo)}</td>
      <td style="text-align:right;font-weight:700;color:var(--gold);font-family:'DM Mono',monospace">${fmt(r.valor_usd)}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(r.job||'—')}</td>
      <td style="color:var(--muted2);font-size:11px">${esc(r.notas||'')}</td>
      <td>${isAdm?`<button onclick="gvDelete('${esc(r.id)}')" class="fi-del" style="font-size:11px">✕</button>`:''}</td>
    </tr>`).join('');
  const cnt = document.getElementById('gv-count');
  if(cnt) cnt.textContent=`${rows.length} registros · ${fmt(totalUSD)} USD`;
}

function gvOpenNew() {
  ['gv-n-fecha','gv-n-costo','gv-n-tc','gv-n-notas'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('gv-n-usd').textContent='$0.00';
  document.getElementById('gv-n-moneda').value='USD';
  document.getElementById('gv-n-tc').value='1';
  const sel=document.getElementById('gv-n-job');
  sel.innerHTML='<option value="">— Job —</option>'+(jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)}</option>`).join('');
  document.getElementById('mo-gv-new').classList.add('on');
}

let _gvCurrentTC = 1;

async function gvLoadFX() {
  const fecha  = document.getElementById('gv-n-fecha').value;
  const moneda = document.getElementById('gv-n-moneda').value;
  if(moneda==='USD'){ _gvCurrentTC=1; gvCalcUSD(); return; }
  if(!fecha) return;
  try {
    const d = await fetch(`/api/fx/lookup?date=${fecha}`).then(r=>r.json());
    if(d.rate){ _gvCurrentTC=d.rate; gvCalcUSD(); }
  } catch(e){}
}

function gvCalcUSD() {
  const costo  = parseFloat(document.getElementById('gv-n-costo').value)||0;
  const moneda = document.getElementById('gv-n-moneda').value;
  const usd    = moneda==='MXN' ? costo/_gvCurrentTC : costo;
  document.getElementById('gv-n-usd').textContent='$'+usd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
}

async function gvSave() {
  const fecha  = document.getElementById('gv-n-fecha').value;
  const tipo   = document.getElementById('gv-n-tipo').value;
  const costo  = parseFloat(document.getElementById('gv-n-costo').value)||0;
  const job    = document.getElementById('gv-n-job').value;
  if(!fecha||!costo||!job){ toast('Fecha, Costo y Job son requeridos','er'); return; }
  const moneda = document.getElementById('gv-n-moneda').value;
  const btn = document.querySelector('#mo-gv-new .btn-p');
  if(btn){ btn.disabled=true; btn.textContent='Guardando…'; }
  try {
    const d = await fetch('/api/gastos-viaje',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tipo_gasto:tipo,fecha,moneda,tipo_cambio:_gvCurrentTC,costo,job,
        notas:document.getElementById('gv-n-notas').value.trim()})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-gv-new'); toast('Gasto guardado ✓','ok'); await loadGastos();
  } catch(e){toast('Error: '+e.message,'er');}
  finally{ if(btn){btn.disabled=false;btn.textContent='💾 Guardar';} }
}

async function gvDelete(id) {
  if(!confirm('¿Eliminar?')) return;
  await fetch(`/api/gastos-viaje/${id}`,{method:'DELETE'});
  toast('Eliminado','ok'); await loadGastos();
}

// ════════════════════════════════════════════════════════
//  SERVICIO — ENVÍOS DE MENSAJERÍA
// ════════════════════════════════════════════════════════
let envData = [], envPodFile = null;

async function loadEnvios() {
  const d = await fetch('/api/envios').then(r=>r.json());
  envData = d.records||[];
  const jobsEnv = [...new Set(envData.map(r=>r.job).filter(Boolean))].sort();
  const sel = document.getElementById('env-job-flt');
  if(sel) sel.innerHTML='<option value="">Todos</option>'+jobsEnv.map(j=>`<option>${esc(j)}</option>`).join('');
  envRender();
}

function envRender() {
  const gs  = (document.getElementById('env-gs')?.value||'').toLowerCase();
  const job = document.getElementById('env-job-flt')?.value||'';
  let rows = envData;
  if(gs)  rows = rows.filter(r=>(r.tracking||'').toLowerCase().includes(gs)||(r.job||'').toLowerCase().includes(gs));
  if(job) rows = rows.filter(r=>r.job===job);
  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const totalUSD = rows.reduce((s,r)=>s+(r.valor_usd||0),0);
  const badge = document.getElementById('env-total-badge');
  if(badge) badge.textContent=`Total: ${fmt(totalUSD)} USD`;
  const isAdm = USER_PERMS?.is_admin;
  document.getElementById('env-tb').innerHTML = rows.map(r=>`
    <tr>
      <td style="color:var(--muted2)">${r.fecha||'—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text)">${esc(r.tracking||'—')}</td>
      <td style="font-size:11px;color:var(--muted2)">${r.moneda||'USD'}</td>
      <td style="text-align:right;font-size:10px;font-family:'DM Mono',monospace;color:var(--muted2)">${(r.tipo_cambio||1).toFixed(4)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(r.costo)}</td>
      <td style="text-align:right;font-weight:700;color:var(--gold);font-family:'DM Mono',monospace">${fmt(r.valor_usd)}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(r.job||'—')}</td>
      <td style="color:var(--muted2);font-size:11px">${esc(r.notas||'')}</td>
      <td>${r.pod_file
        ?`<a href="/api/envios/${esc(r.id)}/pod/view" target="_blank" class="btn-reload" style="font-size:10px;padding:3px 8px">📎 POD</a>`
        :`<label style="font-size:10px;color:var(--muted);cursor:pointer">
            Sin POD
            <input type="file" accept="image/*,.pdf" style="display:none"
              onchange="envUploadPod('${esc(r.id)}',this)">
          </label>`}</td>
      <td>${isAdm?`<button onclick="envDelete('${esc(r.id)}')" class="fi-del" style="font-size:11px">✕</button>`:''}</td>
    </tr>`).join('');
  const cnt = document.getElementById('env-count');
  if(cnt) cnt.textContent=`${rows.length} envíos · ${fmt(totalUSD)} USD`;
}

function envOpenNew() {
  envPodFile = null;
  ['env-n-fecha','env-n-tracking','env-n-costo','env-n-tc','env-n-notas'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('env-n-usd').textContent='$0.00';
  document.getElementById('env-n-moneda').value='USD';
  document.getElementById('env-n-tc').value='1';
  document.getElementById('env-pod-preview').textContent='';
  document.getElementById('env-pod-drop').style.borderColor='var(--border)';
  const sel=document.getElementById('env-n-job');
  sel.innerHTML='<option value="">— Job —</option>'+(jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)}</option>`).join('');
  document.getElementById('mo-env-new').classList.add('on');
}

let _envCurrentTC = 1;

async function envLoadFX() {
  const fecha  = document.getElementById('env-n-fecha').value;
  const moneda = document.getElementById('env-n-moneda').value;
  if(moneda==='USD'){ _envCurrentTC=1; envCalcUSD(); return; }
  if(!fecha) return;
  try {
    const d = await fetch(`/api/fx/lookup?date=${fecha}`).then(r=>r.json());
    if(d.rate){ _envCurrentTC=d.rate; envCalcUSD(); }
  } catch(e){}
}

function envCalcUSD() {
  const costo  = parseFloat(document.getElementById('env-n-costo').value)||0;
  const moneda = document.getElementById('env-n-moneda').value;
  const usd    = moneda==='MXN' ? costo/_envCurrentTC : costo;
  document.getElementById('env-n-usd').textContent='$'+usd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
}

function envPodPreview(inp) {
  envPodFile = inp.files[0];
  const prev = document.getElementById('env-pod-preview');
  if(envPodFile){ prev.textContent='📎 '+envPodFile.name; document.getElementById('env-pod-drop').style.borderColor='var(--green)'; }
}
function envPodDrop(e){ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){ document.getElementById('env-pod-file').files=e.dataTransfer.files; envPodPreview({files:[f]}); } }

async function envSave() {
  const fecha    = document.getElementById('env-n-fecha').value;
  const tracking = document.getElementById('env-n-tracking').value.trim().toUpperCase();
  const costo    = parseFloat(document.getElementById('env-n-costo').value)||0;
  const job      = document.getElementById('env-n-job').value;
  if(!fecha||!costo||!job){ toast('Fecha, Costo y Job son requeridos','er'); return; }
  const moneda = document.getElementById('env-n-moneda').value;
  const btn = document.querySelector('#mo-env-new .btn-p');
  if(btn){ btn.disabled=true; btn.textContent='Guardando…'; }
  try {
    const d = await fetch('/api/envios',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fecha,tracking,moneda,tipo_cambio:_envCurrentTC,costo,job,
        notas:document.getElementById('env-n-notas').value.trim()})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    if(envPodFile && d.record?.id) {
      const fd=new FormData(); fd.append('file',envPodFile);
      await fetch(`/api/envios/${d.record.id}/pod`,{method:'POST',body:fd});
    }
    closeMo('mo-env-new'); toast('Envío guardado ✓','ok'); await loadEnvios();
  } catch(e){toast('Error: '+e.message,'er');}
  finally{ if(btn){btn.disabled=false;btn.textContent='💾 Guardar';} }
}

async function envUploadPod(id, inp) {
  const f = inp.files[0]; if(!f) return;
  const fd=new FormData(); fd.append('file',f);
  const d=await fetch(`/api/envios/${id}/pod`,{method:'POST',body:fd}).then(r=>r.json());
  if(d.error){toast(d.error,'er');return;}
  toast('POD subido ✓','ok'); await loadEnvios();
}

async function envDelete(id) {
  if(!confirm('¿Eliminar?')) return;
  await fetch(`/api/envios/${id}`,{method:'DELETE'});
  toast('Eliminado','ok'); await loadEnvios();
}

// ── Load all servicio modules on DOMContentLoaded
document.addEventListener('DOMContentLoaded', ()=>{
  loadViaticos(); loadGastos(); loadEnvios();
});

// ════════════════════════════════════════════════════════
//  GPO — MODIFICAR ORDEN EXISTENTE
// ════════════════════════════════════════════════════════
let gpoModRec = null, gpoModTipo = null;

function gpoModOpenModal() {
  gpoModRec = null; gpoModTipo = null;
  document.getElementById('gpo-mod-num').value = '';
  document.getElementById('gpo-mod-err').style.display = 'none';
  document.getElementById('gpo-mod-content').style.display = 'none';
  document.getElementById('btn-gpo-mod-save').style.display = 'none';
  document.getElementById('mo-gpo-mod').classList.add('on');
  setTimeout(()=>document.getElementById('gpo-mod-num').focus(), 100);
}

async function gpoModBuscar() {
  const num = document.getElementById('gpo-mod-num').value.trim().replace(/^PO-/i,'');
  if(!num){ gpoModShowErr('Ingresa el número de orden'); return; }
  const poNum = 'PO-' + num.replace(/\D/g,'').padStart(9,'0');
  const errEl = document.getElementById('gpo-mod-err');
  errEl.style.display = 'none';
  try {
    const d = await fetch(`/api/gpo/${encodeURIComponent(poNum)}/lookup`).then(r=>r.json());
    if(d.error){ gpoModShowErr(d.error); return; }
    gpoModRec = d.record;
    gpoModShowPO(gpoModRec);
  } catch(e){ gpoModShowErr('Error conectando al servidor'); }
}

function gpoModShowErr(msg) {
  const el = document.getElementById('gpo-mod-err');
  el.textContent = msg; el.style.display = '';
}

function gpoModShowPO(rec) {
  document.getElementById('gpo-mod-content').style.display = '';
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const status = rec.status || 'Emitida';
  const moneda = rec.moneda || 'USD';
  const version = rec.version ? ` · v${rec.version}` : '';
  const modBadge = rec.modificacion_tipo
    ? `<span style="font-size:10px;background:rgba(255,193,7,.15);color:var(--amber);padding:2px 8px;border-radius:4px;margin-left:8px">${esc(rec.modificacion_tipo)}</span>` : '';

  document.getElementById('gpo-mod-header').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:16px;font-weight:700;font-family:'DM Mono',monospace;color:var(--gold)">${esc(rec.po_number||'')}${version}${modBadge}</div>
        <div style="font-size:12px;color:var(--muted2);margin-top:2px">${esc(rec.supplier_name||'—')} · ${esc(rec.job||rec.job_type||'—')} · ${rec.created_at?.slice(0,10)||''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:var(--muted)">TOTAL ${moneda}</div>
        <div style="font-size:18px;font-weight:700;font-family:'DM Mono',monospace">${fmt(rec.total||0)}</div>
        <div style="font-size:10px;margin-top:2px">${gpoModStatusBadge(status)}</div>
      </div>
    </div>
    <div style="margin-top:10px;overflow-x:auto">
      <table style="font-size:11px;width:100%;border-collapse:collapse">
        <thead><tr style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:1px">
          <th style="text-align:left;padding:4px 6px">Descripción</th>
          <th style="text-align:left;padding:4px 6px">No. Parte</th>
          <th style="text-align:right;padding:4px 6px">Cant.</th>
          <th style="text-align:right;padding:4px 6px">Precio Unit.</th>
          <th style="text-align:right;padding:4px 6px">Total</th>
        </tr></thead>
        <tbody>${(rec.items||[]).map(it=>`
          <tr style="border-top:1px solid rgba(0,0,0,.05)">
            <td style="padding:4px 6px;color:var(--text)">${esc(it.description||it.desc||'—')}</td>
            <td style="padding:4px 6px;font-family:'DM Mono',monospace;color:var(--muted2);font-size:10px">${esc(it.part_number||it.pnum||'—')}</td>
            <td style="padding:4px 6px;text-align:right">${it.quantity||0}</td>
            <td style="padding:4px 6px;text-align:right;font-family:'DM Mono',monospace">${fmt(it.unit_price||it.price||0)}</td>
            <td style="padding:4px 6px;text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fmt(it.total||0)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  const blocked = document.getElementById('gpo-mod-blocked');
  const options = document.getElementById('gpo-mod-options');
  const action  = document.getElementById('gpo-mod-action');
  action.style.display = 'none';
  document.getElementById('btn-gpo-mod-save').style.display = 'none';

  if(status === 'Entregada') {
    blocked.textContent = '⛔ Esta orden ya está ENTREGADA y no puede modificarse.';
    blocked.style.display = '';
    options.style.display = 'none';
    return;
  }
  if(status === 'Cancelada') {
    blocked.textContent = '⛔ Esta orden ya está CANCELADA.';
    blocked.style.display = '';
    options.style.display = 'none';
    return;
  }
  if(rec.modificacion_tipo === 'Cierre Anticipado') {
    blocked.textContent = '⛔ Esta orden ya tiene un Cierre Anticipado aplicado.';
    blocked.style.display = '';
    options.style.display = 'none';
    return;
  }
  blocked.style.display = 'none';
  options.style.display = '';

  // Determine available options
  const btns = document.getElementById('gpo-mod-option-btns');
  if(status === 'Parcial') {
    const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
    const delivered = rec._delivered_total || 0;
    const pending   = rec._pending_total   || 0;
    btns.innerHTML = `
      <button onclick="gpoModSelectTipo('cierre_anticipado')" class="btn"
        style="background:rgba(255,193,7,.15);border:1px solid var(--amber);color:var(--amber);font-size:12px;padding:10px 20px;text-align:left">
        ⏸ Cierre Anticipado<br>
        <span style="font-size:10px;opacity:.8">Ya entregado: <b>${fmt(delivered)}</b> · Pendiente a cancelar: <b>${fmt(pending)}</b></span>
      </button>`;
  } else {
    // Emitida — cancelar or nueva version
    btns.innerHTML = `
      <button onclick="gpoModCancelarDirecto()" class="btn" style="background:rgba(200,16,46,.12);border:1px solid var(--red);color:var(--red);font-size:12px;padding:10px 20px">
        🚫 Cancelar Orden<br><span style="font-size:10px;opacity:.7">Establece todos los items en $0.00</span>
      </button>
      <button onclick="gpoModSelectTipo('nueva_version')" class="btn" style="background:rgba(255,193,7,.12);border:1px solid var(--gold);color:var(--gold);font-size:12px;padding:10px 20px">
        🔄 Nueva Versión<br><span style="font-size:10px;opacity:.7">Modificar items, precios o cantidades</span>
      </button>`;
  }
}

function gpoModStatusBadge(s) {
  const map = {
    'Emitida':    ['rgba(255,193,7,.15)','var(--amber)'],
    'Parcial':    ['rgba(33,150,243,.15)','#64b5f6'],
    'Entregada':  ['rgba(72,199,142,.15)','var(--green)'],
    'Cancelada':  ['rgba(200,16,46,.15)','var(--red)'],
    'Cierre Anticipado': ['rgba(255,152,0,.15)','#ffa726'],
  };
  const [bg, color] = map[s] || ['rgba(0,0,0,.055)','var(--muted)'];
  return `<span style="font-size:10px;font-weight:700;background:${bg};color:${color};padding:2px 8px;border-radius:4px">${s}</span>`;
}

function gpoModCalcRecibido(rec) {
  // Sum effective total from existing value if set, else use total_usd
  return rec.effective_total ?? rec.total_usd ?? rec.total ?? 0;
}

async function gpoModCancelarDirecto() {
  if(!gpoModRec) return;
  const po = gpoModRec.po_number;
  const totalFmt = '$'+Number(gpoModRec.total||0).toLocaleString('en-US',{minimumFractionDigits:2});
  if(!confirm(`¿Confirmar CANCELACIÓN de la orden ${po}?\n\nEl valor actual (${totalFmt}) se establecerá en $0.00.\nEl registro se conserva con estatus CANCELADA.\n\nEsta acción no se puede deshacer.`)) return;

  const btn = document.getElementById('btn-gpo-mod-save');
  if(btn){ btn.disabled=true; btn.textContent='Cancelando…'; btn.style.display=''; }
  try {
    const d = await fetch(`/api/gpo/${encodeURIComponent(po)}/modificar`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({tipo:'cancelar', nota:'Cancelación directa'})
    }).then(r=>r.json());
    if(d.error){ toast(d.error,'er'); return; }
    closeMo('mo-gpo-mod');
    toast(`✓ Orden ${po} cancelada — valor efectivo $0.00`, 'ok', 5000);
    await loadPO();
  } catch(e){ toast('Error: '+e.message,'er'); }
  finally{ if(btn){ btn.disabled=false; btn.textContent='✅ Confirmar Modificación'; } }
}

function gpoModSelectTipo(tipo) {
  gpoModTipo = tipo;
  // Hide all action panels
  ['cierre','nueva-version'].forEach(t => {
    const el = document.getElementById(`gpo-action-${t}`);
    if(el) el.style.display = 'none';
  });
  document.getElementById('gpo-mod-action').style.display = '';
  document.getElementById('btn-gpo-mod-save').style.display = '';

  if(tipo === 'cierre_anticipado') {
    const el = document.getElementById('gpo-action-cierre');
    el.style.display = '';
    const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
    const items = gpoModRec.items || [];
    // Build item-level breakdown
    const rows = items.map(it => {
      const qty    = parseFloat(it.quantity||0);
      const qtyDel = parseFloat(it.quantity_delivered||0);
      const qtyPen = qty - qtyDel;
      const up     = parseFloat(it.unit_price||0);
      const valDel = qtyDel * up;
      const valPen = qtyPen * up;
      return `<tr>
        <td style="padding:5px 8px;font-size:11px">${esc(it.description||'—')}</td>
        <td style="padding:5px 8px;font-family:'DM Mono',monospace;font-size:10px;color:var(--muted2)">${esc(it.part_number||'')}</td>
        <td style="padding:5px 8px;text-align:right;font-size:11px">${qty}</td>
        <td style="padding:5px 8px;text-align:right;color:var(--green);font-weight:600;font-size:11px">${qtyDel}</td>
        <td style="padding:5px 8px;text-align:right;color:var(--red);font-size:11px">${qtyPen}</td>
        <td style="padding:5px 8px;text-align:right;font-family:'DM Mono',monospace;color:var(--green);font-weight:700;font-size:11px">${fmt(valDel)}</td>
        <td style="padding:5px 8px;text-align:right;font-family:'DM Mono',monospace;color:var(--muted);font-size:10px;text-decoration:line-through">${fmt(valPen)}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--amber);margin-bottom:8px">⏸ Cierre Anticipado</div>
      <p style="font-size:12px;color:var(--muted2);margin-bottom:12px">
        El valor de la orden se ajusta al monto ya entregado. Los items pendientes se cancelan.
      </p>
      <div style="overflow-x:auto;margin-bottom:12px">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="font-size:9px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border)">
            <th style="padding:4px 8px;text-align:left">Descripción</th>
            <th style="padding:4px 8px;text-align:left">No. Parte</th>
            <th style="padding:4px 8px;text-align:right">Pedido</th>
            <th style="padding:4px 8px;text-align:right;color:var(--green)">Entregado</th>
            <th style="padding:4px 8px;text-align:right;color:var(--red)">Pendiente</th>
            <th style="padding:4px 8px;text-align:right;color:var(--green)">Valor Entregado</th>
            <th style="padding:4px 8px;text-align:right">Valor Cancelado</th>
          </tr></thead>
          <tbody>${rows||'<tr><td colspan="7" style="padding:12px;text-align:center;color:var(--muted)">Sin detalle de items</td></tr>'}</tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#1f3864;border-radius:6px;font-size:13px;font-weight:700;color:#fff;margin-bottom:12px">
        <span>VALOR EFECTIVO (entregado)</span>
        <span style="color:var(--green);font-family:'DM Mono',monospace">${fmt(gpoModRec._delivered_total||0)}</span>
      </div>`;
  } else if(tipo === 'nueva_version') {
    document.getElementById('gpo-action-nueva-version').style.display = '';
    document.getElementById('gpo-mod-nota-nv').value = '';
    gpoModPopulateItems(gpoModRec.items || []);
  }
}

function gpoModPopulateItems(items) {
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const inpS = `background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px;width:100%;outline:none`;
  document.getElementById('gpo-mod-items-body').innerHTML = items.map((it,i)=>`
    <tr id="gpo-mod-row-${i}">
      <td><input type="text" value="${esc(it.description||it.desc||'')}" style="${inpS}"></td>
      <td><input type="text" value="${esc(it.part_number||it.pnum||'')}" style="${inpS};font-family:'DM Mono',monospace"></td>
      <td><input type="text" value="${esc(it.brand||it.manufacturer||'')}" style="${inpS}"></td>
      <td><input type="number" min="0" step="1" value="${it.quantity||0}" oninput="gpoModRecalc()"
        style="${inpS};text-align:right;color:var(--amber)"></td>
      <td><input type="number" min="0" step="0.01" value="${it.unit_price||it.price||0}" oninput="gpoModRecalc()"
        style="${inpS};text-align:right;color:var(--gold)"></td>
      <td class="gpo-mod-row-total" style="text-align:right;font-family:'DM Mono',monospace;font-size:11px;color:var(--gold)">
        ${fmt((it.quantity||0)*(it.unit_price||it.price||0))}
      </td>
      <td><button onclick="this.closest('tr').remove();gpoModRecalc()"
        style="background:none;border:none;color:var(--muted);cursor:pointer">✕</button></td>
    </tr>`).join('');
  gpoModRecalc();
}

function gpoModAddItem() {
  const tbody = document.getElementById('gpo-mod-items-body');
  const i = tbody.rows.length;
  const inpS = `background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 7px;font-size:11px;width:100%;outline:none`;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" placeholder="Descripción" style="${inpS}"></td>
    <td><input type="text" placeholder="No. Parte" style="${inpS};font-family:'DM Mono',monospace"></td>
    <td><input type="text" placeholder="Marca" style="${inpS}"></td>
    <td><input type="number" min="0" step="1" value="1" oninput="gpoModRecalc()" style="${inpS};text-align:right;color:var(--amber)"></td>
    <td><input type="number" min="0" step="0.01" value="0" oninput="gpoModRecalc()" style="${inpS};text-align:right;color:var(--gold)"></td>
    <td class="gpo-mod-row-total" style="text-align:right;font-family:'DM Mono',monospace;font-size:11px;color:var(--gold)">$0.00</td>
    <td><button onclick="this.closest('tr').remove();gpoModRecalc()" style="background:none;border:none;color:var(--muted);cursor:pointer">✕</button></td>`;
  tbody.appendChild(tr);
}

function gpoModRecalc() {
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  let total = 0;
  document.querySelectorAll('#gpo-mod-items-body tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input');
    const qty   = parseFloat(inputs[3]?.value||0)||0;
    const price = parseFloat(inputs[4]?.value||0)||0;
    const row   = qty * price;
    total += row;
    const totEl = tr.querySelector('.gpo-mod-row-total');
    if(totEl) totEl.textContent = fmt(row);
  });
  document.getElementById('gpo-mod-new-total').textContent = fmt(total);
}

async function gpoModGuardar() {
  if(!gpoModRec || !gpoModTipo) return;
  const btn = document.getElementById('btn-gpo-mod-save');
  btn.disabled=true; btn.textContent='Guardando…';
  try {
    let body = { tipo: gpoModTipo };

    if(gpoModTipo === 'cancelar') {
      body.nota = document.getElementById('gpo-mod-nota')?.value?.trim() || '';
    } else if(gpoModTipo === 'cierre_anticipado') {
      body.nota = '';  // backend calculates value from quantity_delivered
    } else if(gpoModTipo === 'nueva_version') {
      const items = [];
      document.querySelectorAll('#gpo-mod-items-body tr').forEach((tr, idx) => {
        const inputs = tr.querySelectorAll('input');
        const desc  = inputs[0]?.value?.trim()||'';
        const pnum  = inputs[1]?.value?.trim()||'';
        const brand = inputs[2]?.value?.trim()||'';
        const qty   = parseFloat(inputs[3]?.value||0)||0;
        const price = parseFloat(inputs[4]?.value||0)||0;
        // Preserve job from original item if available
        const origItem = (gpoModRec.items||[])[idx] || {};
        if(qty > 0 || desc) items.push({
          line:        idx+1,
          description: desc,
          part_number: pnum,
          brand,
          quantity:    qty,
          unit_price:  price,
          total:       round2(qty*price),
          job:         origItem.job || gpoModRec.job || '',
          cat_type:    origItem.cat_type || '',
          cat_code:    origItem.cat_code || '',
          label_code:  origItem.label_code || '',
        });
      });
      if(!items.length){ toast('Agrega al menos un item','er'); return; }
      body.items = items;
      body.nota  = document.getElementById('gpo-mod-nota-nv')?.value?.trim()||'';
    }

    const poNum = encodeURIComponent(gpoModRec.po_number);
    const d = await fetch(`/api/gpo/${poNum}/modificar`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    }).then(r=>r.json());

    if(d.error){ toast(d.error,'er'); return; }
    closeMo('mo-gpo-mod');
    toast(`✓ Orden ${gpoModRec.po_number} — ${gpoModTipo.replace('_',' ')} aplicado`, 'ok', 5000);
    // Reload the PO list to reflect changes
    await loadPO();
  } catch(e){ toast('Error: '+e.message,'er'); }
  finally{ btn.disabled=false; btn.textContent='✅ Confirmar Modificación'; }
}

function round2(v){ return Math.round(v*100)/100; }

// ════════════════════════════════════════════════════════
//  REPORTE EJECUTIVO PDF
// ════════════════════════════════════════════════════════
function rptExecPDF() {
  if(!rptCurrentJob) { toast('Genera el reporte primero','er'); return; }
  const rateY = document.getElementById('rpt-rate-year')?.value || new Date().getFullYear();
  const whY   = document.getElementById('rpt-wh-year')?.value  || new Date().getFullYear();
  const poY   = document.getElementById('rpt-po-year')?.value  || new Date().getFullYear();
  const url = `/api/report/executive-pdf?job=${encodeURIComponent(rptCurrentJob)}&rate_year=${rateY}&wh_year=${whY}&po_year=${poY}`;
  window.open(url, '_blank');
}

// ════════════════════════════════════════════════════════
//  PO — EDICIÓN MANUAL DE REGISTRO
// ════════════════════════════════════════════════════════
let poEditRecord = null;

function poOpenEdit(rowIdx) {
  const rows = poFiltered();
  const r = rows[rowIdx];
  if(!r) return;
  poEditRecord = r;

  const inpS = 'width:100%;background:var(--inp);border:1px solid var(--border);border-radius:var(--r);color:var(--text);padding:8px 10px;font-size:12px;outline:none;margin-top:6px';

  document.getElementById('po-edit-clave').textContent     = r.gpo_number || r.clave || '—';
  document.getElementById('po-edit-nombre').value          = r.nombre||'';
  document.getElementById('po-edit-job').value             = r.entregar_a||'';
  document.getElementById('po-edit-fecha-doc').value       = (r.fecha_doc||'').slice(0,10);
  document.getElementById('po-edit-subtotal').value        = r.subtotal||0;
  document.getElementById('po-edit-moneda').value          = r.moneda||'MXN';
  document.getElementById('po-edit-tc').value              = r.tipo_cambio||r.fx_rate_used||1;
  document.getElementById('po-edit-estatus').value         = r.estatus||'Emitida';
  document.getElementById('po-edit-fecha-rec').value       = (r.fecha_recepcion||'').slice(0,10);
  document.getElementById('po-edit-description').value     = r.description||'';
  document.getElementById('po-edit-part-number').value     = r.part_number||'';
  document.getElementById('po-edit-quantity').value        = r.quantity||'';
  document.getElementById('po-edit-unit-price').value      = r.unit_price||'';
  document.getElementById('mo-po-edit').classList.add('on');
}

async function poSaveEdit() {
  if(!poEditRecord) return;
  const btn = document.getElementById('btn-po-edit-save');
  btn.disabled=true; btn.textContent='Guardando…';
  try {
    const payload = {
      nombre:          document.getElementById('po-edit-nombre').value.trim(),
      entregar_a:      document.getElementById('po-edit-job').value.trim().toUpperCase(),
      fecha_doc:       document.getElementById('po-edit-fecha-doc').value,
      subtotal:        parseFloat(document.getElementById('po-edit-subtotal').value)||0,
      moneda:          document.getElementById('po-edit-moneda').value,
      tipo_cambio:     parseFloat(document.getElementById('po-edit-tc').value)||1,
      estatus:         document.getElementById('po-edit-estatus').value,
      fecha_recepcion: document.getElementById('po-edit-fecha-rec').value,
      description:     document.getElementById('po-edit-description').value.trim(),
      part_number:     document.getElementById('po-edit-part-number').value.trim().toUpperCase(),
      quantity:        parseFloat(document.getElementById('po-edit-quantity').value)||null,
      unit_price:      parseFloat(document.getElementById('po-edit-unit-price').value)||null,
    };
    // Recalculate subtotal_usd
    if(payload.moneda==='USD') payload.subtotal_usd = payload.subtotal;
    else payload.subtotal_usd = payload.tipo_cambio>0 ? round2(payload.subtotal/payload.tipo_cambio) : payload.subtotal;

    const clave = poEditRecord.gpo_number||poEditRecord.clave;
    const d = await fetch(`/api/po/${poActiveYear}/edit`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({clave, record_id: poEditRecord._id||null, ...payload})
    }).then(r=>r.json());
    if(d.error){toast(d.error,'er');return;}
    closeMo('mo-po-edit');
    toast('Registro actualizado ✓','ok');
    await loadPO();
  } catch(e){toast('Error: '+e.message,'er');}
  finally{btn.disabled=false; btn.textContent='💾 Guardar Cambios';}
}

function round2(v){ return Math.round(v*100)/100; }

// ════════════════════════════════════════════════════════
//  ADMIN — RESPALDO CON EMAIL
// ════════════════════════════════════════════════════════
async function backupLoadConfig() {
  try {
    const d = await fetch('/api/admin/backup-config').then(r=>r.json());
    backupRenderRecipients(d.recipients||[]);
  } catch(e){}
}

function backupRenderRecipients(list) {
  const el = document.getElementById('backup-recipients-list');
  if(!el) return;
  el.innerHTML = list.map((email,i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(0,0,0,.045);border:1px solid var(--border);border-radius:6px">
      <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--text)">${esc(email)}</span>
      <button onclick="backupRemoveEmail(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px">✕</button>
    </div>`).join('');
}

async function backupAddEmail() {
  const inp = document.getElementById('backup-new-email');
  const email = inp?.value?.trim().toLowerCase();
  if(!email || !email.includes('@')){ toast('Ingresa un correo válido','er'); return; }
  const d = await fetch('/api/admin/backup-config').then(r=>r.json());
  const list = d.recipients||[];
  if(list.includes(email)){ toast('Este correo ya está en la lista','er'); return; }
  list.push(email);
  await fetch('/api/admin/backup-config',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({recipients:list})});
  inp.value='';
  backupRenderRecipients(list);
  toast(`✓ ${email} agregado`,'ok');
}

async function backupRemoveEmail(idx) {
  const d = await fetch('/api/admin/backup-config').then(r=>r.json());
  const list = d.recipients||[];
  const removed = list.splice(idx,1)[0];
  await fetch('/api/admin/backup-config',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({recipients:list})});
  backupRenderRecipients(list);
  toast(`${removed} eliminado`,'ok');
}

async function backupNow() {
  const statusEl = document.getElementById('backup-status');
  const btn = document.querySelector('button[onclick="backupNow()"]');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Generando respaldo…'; }
  if(statusEl){ statusEl.style.color='var(--muted)'; statusEl.textContent='Generando ZIP con todas las bases de datos…'; }
  try {
    const d = await fetch('/api/admin/backup',{method:'POST'}).then(r=>r.json());
    if(d.error){ if(statusEl){statusEl.style.color='var(--red)';statusEl.textContent='Error: '+d.error;} toast(d.error,'er'); return; }
    const bytes = Uint8Array.from(atob(d.zip_b64), c=>c.charCodeAt(0));
    const blob  = new Blob([bytes],{type:'application/zip'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = d.filename; a.click();
    if(statusEl){ statusEl.style.color='var(--green)'; statusEl.textContent=`✓ ${d.filename} descargado`; }
    toast('Respaldo descargado ✓','ok',4000);
  } catch(e){
    if(statusEl){ statusEl.style.color='var(--red)'; statusEl.textContent='Error: '+e.message; }
    toast('Error: '+e.message,'er');
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='📦 Generar y Descargar Respaldo'; }
  }
}

// Load backup config when entering admin module
document.addEventListener('DOMContentLoaded', ()=>{
  if(document.getElementById('backup-recipients-list')) backupLoadConfig();
});

// ════════════════════════════════════════════════════════
//  REPORTE MÚLTIPLE — EXPORTAR PDF
// ════════════════════════════════════════════════════════
function mrptExportPDF() {
  if(!mrptData) return;
  const d    = mrptData;
  const t    = d.totals || {};
  const label= d.label || 'Reporte Múltiple';
  const tab  = mrptCurrentTab || 'fin';
  const fmt  = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const fmth = v => Number(v||0).toLocaleString('en-US',{maximumFractionDigits:1})+'h';
  const now  = new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});

  // ── Determine which columns to show based on active tab
  const isOp = (tab === 'op');

  // Compute per-row totals for Operativo
  let presMap = {};
  try {
    const presList = d.presupuestos || [];
    presList.forEach(p => { presMap[p.job_number?.toUpperCase()] = p.presupuesto_disponible||0; });
  } catch(e){}

  const rows = (d.jobs||[]).map(r => {
    const svc    = r.svc_total||0;
    const reas   = r.reassign_total||0;
    const recov  = r.recovery_total||0;
    const key    = (r.job_number||'').toUpperCase();
    const base   = isOp ? (presMap[key]||r.revenue||0) : r.revenue||0;
    const gm     = isOp
      ? base - (r.amount_wh||0) - (r.purchasing_total||0) - svc - reas + recov
      : r.gross_margin||0;
    const gmPct  = base > 0 ? (gm/base*100).toFixed(1) : '0.0';
    return {
      job:      r.job_number||'',
      customer: r.customer||'',
      desc:     r.description||'',
      base, hrs: r.accum_hours||0,
      wh: r.amount_wh||0, pur: r.purchasing_total||0,
      svc, reas, recov, gm, gmPct,
      gmColor: gm >= 0 ? '#48c78e' : '#c8102e',
    };
  });

  const totGM = isOp
    ? (t.revenue||0) - (t.amount_wh||0) - (t.purchasing_total||0) - (t.svc_total||0) - (t.reassign_total||0) + (t.recovery_total||0)
    : t.gross_margin||0;
  const totGMpct = (t.revenue||0) > 0 ? (totGM/(t.revenue||1)*100).toFixed(1) : '0.0';
  const hasSvc  = (t.svc_total||0) > 0;
  const hasReas = (t.reassign_total||0) > 0;
  const hasRecov= (t.recovery_total||0) > 0;

  const thStyle = 'padding:5px 7px;text-align:right;font-size:9px;text-transform:uppercase;letter-spacing:.7px;border-bottom:2px solid #c8102e';
  const tdStyle = 'padding:5px 7px;text-align:right;font-family:monospace;font-size:10px;border-bottom:1px solid #eee';
  const mono    = 'font-family:monospace;font-size:10px';

  // Build thead
  let thead = `<th style="${thStyle};text-align:left">Job</th>
    <th style="${thStyle};text-align:left">Cliente</th>
    <th style="${thStyle};text-align:right">${isOp?'Presup. Disp.':'Revenue'}</th>
    <th style="${thStyle}">Hrs</th>
    <th style="${thStyle}">WH Cost</th>
    <th style="${thStyle}">Purchasings</th>`;
  if(hasSvc)  thead += `<th style="${thStyle};color:#f5a623">Servicios</th>`;
  if(hasReas) thead += `<th style="${thStyle};color:#c8102e">Reasign.</th>`;
  if(hasRecov)thead += `<th style="${thStyle};color:#48c78e">Recuper.</th>`;
  thead += `<th style="${thStyle};min-width:90px">Gross Margin</th>
    <th style="${thStyle}">GM%</th>`;

  // Build tbody
  const trows = rows.map((r,i) => {
    let cells = `<td style="${tdStyle};text-align:left;font-weight:700;color:#c8102e;${mono}">${r.job}</td>
      <td style="${tdStyle};text-align:left;font-size:10px;max-width:130px;overflow:hidden;text-overflow:ellipsis">${r.customer}</td>
      <td style="${tdStyle}">${fmt(r.base)}</td>
      <td style="${tdStyle}">${fmth(r.hrs)}</td>
      <td style="${tdStyle}">${fmt(r.wh)}</td>
      <td style="${tdStyle}">${fmt(r.pur)}</td>`;
    if(hasSvc)  cells += `<td style="${tdStyle};color:#f5a623">${r.svc>0?fmt(r.svc):'—'}</td>`;
    if(hasReas) cells += `<td style="${tdStyle};color:#c8102e">${r.reas>0?fmt(r.reas):'—'}</td>`;
    if(hasRecov)cells += `<td style="${tdStyle};color:#48c78e">${r.recov>0?fmt(r.recov):'—'}</td>`;
    cells += `<td style="${tdStyle};font-weight:700;color:${r.gmColor}">${fmt(r.gm)}</td>
      <td style="${tdStyle};color:${r.gmColor}">${r.gmPct}%</td>`;
    const bg = i%2===0?'#fff':'#f9f9f9';
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('');

  // Build tfoot
  const ftd = `padding:7px;text-align:right;font-weight:700;font-family:monospace;font-size:11px;border-top:2px solid #c8102e;background:#1f3864;color:#fff`;
  let tfoot = `<td style="${ftd};text-align:left" colspan="2">TOTAL</td>
    <td style="${ftd}">${fmt(isOp?t.revenue||0:t.revenue||0)}</td>
    <td style="${ftd}">${fmth(t.accum_hours||0)}</td>
    <td style="${ftd}">${fmt(t.amount_wh||0)}</td>
    <td style="${ftd}">${fmt(t.purchasing_total||0)}</td>`;
  if(hasSvc)  tfoot += `<td style="${ftd};color:#f5a623">${fmt(t.svc_total||0)}</td>`;
  if(hasReas) tfoot += `<td style="${ftd};color:#f87171">${fmt(t.reassign_total||0)}</td>`;
  if(hasRecov)tfoot += `<td style="${ftd};color:#6ee7b7">${fmt(t.recovery_total||0)}</td>`;
  const gmCol = totGM>=0?'#6ee7b7':'#f87171';
  tfoot += `<td style="${ftd};color:${gmCol}">${fmt(totGM)}</td>
    <td style="${ftd};color:${gmCol}">${totGMpct}%</td>`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${label}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px 24px}
h1{font-size:16px;font-weight:900;color:#c8102e;margin-bottom:2px}
.sub{font-size:10px;color:#888;margin-bottom:14px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.card{padding:10px 14px;border-radius:6px;border:1px solid #e0e0e0}
.card.blue{background:#1f3864;color:#fff;border-color:#1f3864}
.card.gn{background:rgba(72,199,142,.08);border-color:rgba(72,199,142,.4)}
.card.rd{background:rgba(200,16,46,.06);border-color:rgba(200,16,46,.3)}
.cl{font-size:8px;text-transform:uppercase;letter-spacing:1px;opacity:.7;margin-bottom:3px}
.cv{font-family:monospace;font-size:14px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:10px}
.footer{margin-top:14px;border-top:1px solid #ddd;padding-top:8px;font-size:8px;color:#aaa;display:flex;justify-content:space-between}
@media print{body{padding:10px 12px}}
</style></head><body>
<div style="display:flex;justify-content:space-between;border-bottom:3px solid #c8102e;padding-bottom:10px;margin-bottom:14px">
  <div>
    <h1>${label}</h1>
    <div class="sub">${isOp?'Resultado Operativo':'Resultado Financiero'} · ${rows.length} Job(s) · ${now}</div>
  </div>
  <div style="text-align:right;font-size:10px;color:#888">Persico Suite<br>Reporte Múltiple</div>
</div>
<div class="cards">
  <div class="card blue"><div class="cl">${isOp?'Presup. Total':'Revenue Total'}</div><div class="cv">${fmt(t.revenue||0)}</div></div>
  <div class="card"><div class="cl">Work Hours</div><div class="cv">${fmt(t.amount_wh||0)}</div><div style="font-size:9px;opacity:.7">${fmth(t.accum_hours||0)}</div></div>
  <div class="card"><div class="cl">Purchasings${hasSvc?' + Svc':''}</div><div class="cv">${fmt((t.purchasing_total||0)+(t.svc_total||0))}</div></div>
  <div class="card ${totGM>=0?'gn':'rd'}"><div class="cl">Gross Margin</div><div class="cv" style="color:${totGM>=0?'#2d9e6b':'#c8102e'}">${fmt(totGM)}</div><div style="font-size:9px;color:${totGM>=0?'#2d9e6b':'#c8102e'}">${totGM>=0?'▲':'▼'} ${totGMpct}%</div></div>
</div>
<table>
  <thead><tr>${thead}</tr></thead>
  <tbody>${trows}</tbody>
  <tfoot><tr>${tfoot}</tr></tfoot>
</table>
<div class="footer">
  <span>Persico Suite · Reporte Múltiple · ${now}</span>
  <span>${label} · ${rows.length} Jobs</span>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;

  const win = window.open('','_blank');
  win.document.write(html);
  win.document.close();
}

// ════════════════════════════════════════════════════════
//  GPO — DIVIDIR PO SAE
// ════════════════════════════════════════════════════════
let gpoSplitRec = null;

function gpoSplitMonedaChange() {
  const moneda = document.getElementById('gpo-split-moneda')?.value;
  const tcWrap = document.getElementById('gpo-split-tc-wrap');
  const usdTh  = document.getElementById('gpo-split-th-usd');
  const usdFt  = document.getElementById('gpo-split-total-usd');
  const isMXN  = moneda === 'MXN';
  tcWrap.style.display = isMXN ? 'flex' : 'none';
  if(usdTh) usdTh.style.display = isMXN ? '' : 'none';
  if(usdFt) usdFt.style.display = isMXN ? '' : 'none';
  if(isMXN) gpoSplitFetchTC();
  else gpoSplitRecalcUSD();
}

async function gpoSplitFetchTC() {
  const infoEl = document.getElementById('gpo-split-tc-info');
  try {
    const d = await fetch(`/api/fx/lookup?date=${new Date().toISOString().slice(0,10)}`).then(r=>r.json());
    if(d.rate) {
      document.getElementById('gpo-split-tc').value = d.rate.toFixed(4);
      if(infoEl){ infoEl.style.display=''; infoEl.textContent=`T.C. del día: ${d.rate.toFixed(4)}`; }
      gpoSplitRecalcUSD();
    }
  } catch(e) {}
}

function gpoSplitRecalcUSD() {
  const tc     = parseFloat(document.getElementById('gpo-split-tc')?.value||0) || 1;
  const moneda = document.getElementById('gpo-split-moneda')?.value || 'USD';
  const fmt    = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const isMXN  = moneda === 'MXN';
  let totalOrig = 0, totalUSD = 0;

  document.querySelectorAll('#gpo-split-tb tr').forEach((tr, i) => {
    const cells = tr.querySelectorAll('td');
    const qty   = parseFloat(cells[3]?.textContent?.replace(/[$,]/g,''))||0;
    const price = parseFloat(cells[4]?.textContent?.replace(/[$,]/g,''))||0;
    const orig  = qty * price;
    const usd   = isMXN ? orig / tc : orig;
    totalOrig += orig; totalUSD += usd;

    // Show/hide USD column per row
    let usdCell = tr.querySelector('.split-usd-cell');
    if(isMXN) {
      if(!usdCell) {
        usdCell = document.createElement('td');
        usdCell.className = 'split-usd-cell';
        usdCell.style.cssText = 'text-align:right;font-family:"DM Mono",monospace;font-size:11px;color:var(--green)';
        // Insert before last cell (JOB select)
        const lastCell = tr.lastElementChild;
        tr.insertBefore(usdCell, lastCell);
      }
      usdCell.textContent = fmt(usd);
    } else if(usdCell) {
      usdCell.remove();
    }
  });

  document.getElementById('gpo-split-total').textContent = fmt(totalOrig);
  const usdFt = document.getElementById('gpo-split-total-usd');
  if(usdFt) usdFt.textContent = isMXN ? fmt(totalUSD) : '';
}

function gpoSplitOpenModal() {
  gpoSplitRec = null;
  document.getElementById('gpo-split-num').value = '';
  document.getElementById('gpo-split-err').style.display = 'none';
  document.getElementById('gpo-split-header').style.display = 'none';
  document.getElementById('gpo-split-pdf-wrap').style.display = 'none';
  document.getElementById('gpo-split-items-wrap').style.display = 'none';
  document.getElementById('btn-gpo-split-apply').style.display = 'none';
  document.getElementById('gpo-split-tb').innerHTML = '';
  const monedaSel = document.getElementById('gpo-split-moneda');
  if(monedaSel) monedaSel.value = 'USD';
  gpoSplitMonedaChange();
  document.getElementById('mo-gpo-split').classList.add('on');
  setTimeout(() => document.getElementById('gpo-split-num').focus(), 100);
}

async function gpoSplitBuscar() {
  const raw = document.getElementById('gpo-split-num').value.trim().replace(/^PO-?/i,'');
  if(!raw) { gpoSplitShowErr('Ingresa el número de orden'); return; }
  document.getElementById('gpo-split-err').style.display = 'none';
  try {
    // Try exact padded format first, then fallback to suffix search
    const padded = 'PO-' + raw.replace(/\D/g,'').padStart(10,'0');
    let d = await fetch(`/api/gpo/${encodeURIComponent(padded)}/lookup`).then(r=>r.json());
    if(d.error) {
      // Fallback: search by number ending
      d = await fetch(`/api/gpo/search?q=${encodeURIComponent(raw)}`).then(r=>r.json());
      if(d.error || !d.record) { gpoSplitShowErr(`No se encontró la orden ${raw}`); return; }
    }
    gpoSplitRec = d.record;
    gpoSplitShowInfo(gpoSplitRec);
  } catch(e) { gpoSplitShowErr('Error conectando al servidor'); }
}

function gpoSplitShowErr(msg) {
  const el = document.getElementById('gpo-split-err');
  el.textContent = msg; el.style.display = '';
}

function gpoSplitShowInfo(rec) {
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('gpo-split-header').style.display = '';
  document.getElementById('gpo-split-header').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:15px;font-weight:700;font-family:'DM Mono',monospace;color:var(--gold)">${esc(rec.po_number||'')}</div>
        <div style="font-size:12px;color:var(--muted2);margin-top:2px">${esc(rec.supplier_name||'—')} · ${esc(rec.job||rec.job_type||'—')} · ${(rec.created_at||'').slice(0,10)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:var(--muted)">TOTAL ${rec.moneda||'USD'}</div>
        <div style="font-size:18px;font-weight:700;font-family:'DM Mono',monospace">${fmt(rec.total||0)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">${(rec.items||[]).length} item(s) registrado(s)</div>
      </div>
    </div>`;
  document.getElementById('gpo-split-orig-num').textContent = rec.po_number;
  document.getElementById('gpo-split-pdf-wrap').style.display = 'flex';

  // If GPO already has items, populate them directly
  if((rec.items||[]).length > 0) {
    gpoSplitPopulateItems(rec.items.map(it => ({
      part_number: it.part_number || it.pnum || '',
      description: it.description || it.desc || '',
      quantity:    it.quantity || 0,
      unit_cost:   it.unit_price || it.unit_cost || 0,
      job:         it.job || rec.job || '',
    })));
  }
}

async function gpoSplitLoadPDF(inp) {
  const file = inp?.files?.[0];
  if(!file) return;
  const statusEl = document.getElementById('gpo-split-pdf-status');
  statusEl.style.color='var(--muted2)'; statusEl.textContent='⏳ Leyendo PDF…';
  try {
    const fd = new FormData(); fd.append('file', file);
    const resp = await fetch('/api/util/pdf-to-po-json',{method:'POST',body:fd});
    let d;
    try { d = await resp.json(); } catch(e) { throw new Error(`Error del servidor (HTTP ${resp.status})`); }
    if(d.error) throw new Error(d.error);
    gpoSplitPopulateItems(d.items || []);
    statusEl.style.color='var(--green)';
    statusEl.textContent=`✓ ${d.total} item(s) cargados del PDF`;
    inp.value='';
  } catch(e) {
    statusEl.style.color='var(--red)'; statusEl.textContent='Error: '+e.message;
  }
}

function gpoSplitPopulateItems(items) {
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const inpS = 'background:var(--inp);border:1px solid rgba(255,193,7,.4);border-radius:4px;color:var(--gold);padding:5px 8px;font-size:11px;width:100%;font-family:"DM Mono",monospace;font-weight:600;outline:none;text-transform:uppercase';
  const jobOpts = '<option value="">— Job —</option>'
    + (jobs||[]).map(j=>`<option value="${esc(j.job_number)}">${esc(j.job_number)}</option>`).join('');

  document.getElementById('gpo-split-tb').innerHTML = items.map((it,i) => {
    const qty   = parseFloat(it.quantity||0);
    const price = parseFloat(it.unit_cost||it.unit_price||0);
    const total = qty * price;
    const job   = String(it.job||'').trim().toUpperCase();
    const sel   = jobOpts.replace(`value="${esc(job)}"`, `value="${esc(job)}" selected`);
    return `<tr>
      <td style="text-align:center;color:var(--muted);font-size:10px">${i+1}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text)">${esc(it.part_number||'—')}</td>
      <td style="font-size:11px;color:var(--muted2);max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(it.description||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${qty}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(price)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:var(--gold)">${fmt(total)}</td>
      <td><select class="gpo-split-job-sel" style="${inpS}">${sel}</select></td>
    </tr>`;
  }).join('');

  // Update total and count
  const total = items.reduce((s,it) => s+(parseFloat(it.quantity||0)*parseFloat(it.unit_cost||it.unit_price||0)), 0);
  document.getElementById('gpo-split-total').textContent = '$'+total.toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('gpo-split-count').textContent = items.length;

  document.getElementById('gpo-split-items-wrap').style.display = '';
  document.getElementById('btn-gpo-split-apply').style.display = '';
  gpoSplitRecalcUSD();
}

async function gpoSplitAplicar() {
  if(!gpoSplitRec) return;

  const moneda = document.getElementById('gpo-split-moneda')?.value || 'USD';
  const tc     = parseFloat(document.getElementById('gpo-split-tc')?.value||1) || 1;

  // Collect items from table
  const rows = document.querySelectorAll('#gpo-split-tb tr');
  const items = [];
  let missingJob = false;

  rows.forEach((tr, i) => {
    const cells = tr.querySelectorAll('td');
    const pnum  = cells[1]?.textContent?.trim() || '';
    const desc  = cells[2]?.textContent?.trim() || '';
    const qty   = parseFloat(cells[3]?.textContent?.replace(/[$,]/g,'')) || 0;
    const price = parseFloat(cells[4]?.textContent?.replace(/[$,]/g,'')) || 0;
    const job   = tr.querySelector('select')?.value?.trim() || '';
    if(!job) missingJob = true;
    items.push({ part_number: pnum, description: desc, quantity: qty, unit_cost: price, job });
  });

  if(missingJob) { toast('Asigna un JOB a todos los items','er'); return; }
  if(!items.length) { toast('No hay items para dividir','er'); return; }

  if(!confirm(`¿Confirmar división de ${gpoSplitRec.po_number}?\n\n• Se crearán ${items.length} registros nuevos\n• El valor original de la PO se igualará a $0.00\n\nEsta acción no se puede deshacer.`)) return;

  const btn = document.getElementById('btn-gpo-split-apply');
  btn.disabled=true; btn.textContent='Aplicando…';
  try {
    const d = await fetch(`/api/gpo/${encodeURIComponent(gpoSplitRec.po_number)}/split`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({items, moneda, tipo_cambio: tc})
    }).then(r=>r.json());
    if(d.error){ toast(d.error,'er'); return; }
    closeMo('mo-gpo-split');
    toast(`✓ PO ${d.po_number} dividida en ${d.created} registros`, 'ok', 6000);
    await loadPO();
  } catch(e){ toast('Error: '+e.message,'er'); }
  finally{ btn.disabled=false; btn.textContent='✂ Aplicar División'; }
}

// ════════════════════════════════════════════════════════
//  INGRESO CON SAE — Entrada por número SAE simple
// ════════════════════════════════════════════════════════
let saeCurrentPO = null;   // { clave, nombre, items:[{part_number,description,quantity,unit_price,job,quantity_delivered}], year }

function saeFiltrarItems() {
  const q = (document.getElementById('sae-items-filter')?.value||'').toLowerCase();
  document.querySelectorAll('#sae-items-tb tr').forEach((row, i) => {
    if(!q){ row.style.display=''; return; }
    const it = saeCurrentPO?.items?.[i];
    if(!it){ row.style.display='none'; return; }
    const match = (it.part_number||'').toLowerCase().includes(q) ||
                  (it.description||'').toLowerCase().includes(q);
    row.style.display = match ? '' : 'none';
  });
}

function saeIngresoOpen() {
  saeCurrentPO = null;
  document.getElementById('sae-po-search').value = '';
  document.getElementById('sae-recibe-display').textContent = USER_PERMS?.user || '—';
  document.getElementById('sae-po-content').style.display = 'none';
  document.getElementById('sae-po-empty').style.display = '';
  document.getElementById('sae-po-empty').textContent = 'Ingresa el número de OC SAE para ver sus items';
  document.getElementById('btn-sae-save').disabled = true;
  document.getElementById('mo-ing-sae').classList.add('on');
  setTimeout(()=>document.getElementById('sae-po-search').focus(), 100);
}

async function saeBuscarPO(val, force=false) {
  const q = val.trim().replace(/\D/g,'');   // digits only
  if(!q || q.length < 3) return;
  if(!force) {
    clearTimeout(window._saeTimer);
    window._saeTimer = setTimeout(()=>saeBuscarPO(q, true), 400);
    return;
  }
  try {
    // Search IPO records across years
    const d = await fetch(`/api/gpo/search?q=${encodeURIComponent(q)}`).then(r=>r.json());
    if(d.error) {
      document.getElementById('sae-po-empty').innerHTML = `<span style="color:var(--red)">⚠ OC no encontrada: ${esc(q)}</span>`;
      document.getElementById('sae-po-content').style.display = 'none';
      document.getElementById('sae-po-empty').style.display = '';
      return;
    }
    const rec = d.record;
    // If it came from IPO, build items from individual IPO rows
    const year = rec._ipo_year || new Date().getFullYear();
    const ipoResp = await fetch(`/api/po/usd-view?year=${year}`).then(r=>r.json());
    const clave = rec.po_number || q;
    const ipoRows = (ipoResp.records||[]).filter(r => {
      const c = String(r.clave||'');
      return c.replace(/^PO-0*/i,'') === q || c === clave || c.replace(/\D/g,'').replace(/^0+/,'') === q;
    });

    // Build items from IPO rows — include quantity_delivered from stored field
    const items = ipoRows.map(r => ({
      part_number:       r.part_number || '—',
      description:       r.description || r.nombre || '—',
      quantity:          parseFloat(r.quantity || r.quantity_ordered || 1),
      unit_price:        parseFloat(r.unit_price || r.subtotal || 0),
      job:               r.entregar_a || '',
      quantity_delivered:parseFloat(r.quantity_delivered || 0),
      _ipo_row:          r,
    }));

    saeCurrentPO = { clave, nombre: rec.supplier_name||rec.nombre||'', items, year, moneda: rec.moneda||'USD' };
    saeRenderPO(saeCurrentPO);
  } catch(e) { toast('Error buscando OC SAE: '+e.message,'er'); }
}

function saeRenderPO(po) {
  document.getElementById('sae-po-header').innerHTML = `
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">OC SAE</div>
      <div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--gold);font-size:14px">${esc(po.clave)}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Proveedor</div>
      <div style="font-weight:600;color:var(--text)">${esc(po.nombre||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Items</div>
      <div style="font-weight:600;color:var(--text)">${po.items.length} partida(s)</div></div>`;

  document.getElementById('sae-items-tb').innerHTML = po.items.map((it,i) => {
    const qOrd  = parseFloat(it.quantity)||1;
    const qDel  = parseFloat(it.quantity_delivered||0);
    const qPend = Math.max(0, qOrd - qDel);
    return `<tr>
      <td style="color:var(--muted);text-align:center">${i+1}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text)">${esc(it.part_number)}</td>
      <td style="color:var(--muted2);max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${esc(it.description)}">${esc(it.description)}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(it.job||'—')}</td>
      <td style="text-align:right">${qOrd}</td>
      <td style="text-align:right;color:${qDel>=qOrd?'var(--green)':'var(--muted)'}">${qDel}</td>
      <td style="text-align:right">
        <input type="number" min="0" max="${qPend}" step="1" value="0"
          id="sae-qty-${i}" oninput="saeUpdateEstatus()"
          style="width:75px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--gold);padding:4px 7px;font-size:12px;text-align:right;font-family:'DM Mono',monospace;font-weight:700">
      </td>
      <td style="text-align:right;font-family:'DM Mono',monospace">$${Number(it.unit_price||0).toFixed(2)}</td>
    </tr>`;
  }).join('');

  document.getElementById('sae-po-empty').style.display = 'none';
  document.getElementById('sae-po-content').style.display = '';
  document.getElementById('btn-sae-save').disabled = false;
  saeUpdateEstatus();
}

function saeUpdateEstatus() {
  if(!saeCurrentPO) return;
  let allFull=true, anyPos=false;
  saeCurrentPO.items.forEach((it,i) => {
    const qOrd  = parseFloat(it.quantity)||1;
    const qPrev = parseFloat(it.quantity_delivered||0);
    const qNew  = parseFloat(document.getElementById(`sae-qty-${i}`)?.value||0);
    if(qPrev + qNew < qOrd) allFull = false;
    if(qNew > 0) anyPos = true;
  });
  const el = document.getElementById('sae-estatus-preview');
  if(allFull) {
    el.style.background='rgba(72,199,142,.15)'; el.style.color='var(--green)';
    el.textContent='✓ Todos los items quedarán como ENTREGADOS.';
  } else if(anyPos) {
    el.style.background='rgba(255,193,7,.1)'; el.style.color='var(--amber)';
    el.textContent='⚠ Entrega PARCIAL — quedan items pendientes.';
  } else {
    el.style.background='rgba(0,0,0,.045)'; el.style.color='var(--muted)';
    el.textContent='Ingresa las piezas recibidas en cada item.';
  }
}

async function saeProcesar() {
  if(!saeCurrentPO) { toast('Busca una OC primero','er'); return; }
  const recibe = USER_PERMS?.user || '—';

  const ingItems = saeCurrentPO.items.map((it,i) => ({
    part_number:       it.part_number,
    brand:             '',
    description:       it.description,
    cat_code:          '',
    label_code:        '',
    quantity_ordered:  parseFloat(it.quantity)||1,
    quantity_delivered:parseFloat(document.getElementById(`sae-qty-${i}`)?.value||0),
    unit_cost:         parseFloat(it.unit_price||0),
    job:               it.job||'',
    notes:             '',
  })).filter(it => it.quantity_delivered > 0);

  if(!ingItems.length) { toast('Ingresa al menos una pieza recibida','er'); return; }

  const btn = document.getElementById('btn-sae-save');
  btn.disabled=true; btn.textContent='Procesando…';
  try {
    const d = await fetch('/api/ingreso', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        tipo:      'sae',
        po_number: saeCurrentPO.clave,
        recibe,
        items:     ingItems,
      })
    }).then(r=>r.json());
    if(d.error){ toast(d.error,'er'); return; }
    closeMo('mo-ing-sae');
    toast(`✓ Ingreso SAE ${d.record?.id||''} procesado — ${ingItems.length} item(s) en Apartados`, 'ok', 5000);
    await loadIngreso();
  } catch(e){ toast('Error: '+e.message,'er'); }
  finally{ btn.disabled=false; btn.textContent='✅ Procesar Ingreso'; }
}

// ════════════════════════════════════════════════════════
//  FINANZAS — RECEPCIONES
// ════════════════════════════════════════════════════════
let recData = [];
let recCurrentPO = null;      // GPO record actual (flujo con OC)
let recCurrentCFDI = null;    // CFDI parseado (opcional) para esta recepción
let recCompraDirecta = false;
let recTipoRecepcion = '';    // 'completa' | 'parcial'
let recDirectaSupplier = null;
let recDirectaItems = [];     // filas manuales (compra directa)
let recManualRowSeq = 0;

async function loadRecepciones() {
  try {
    const d = await fetch('/api/recepciones').then(r=>r.json());
    recData = d.records || [];
    document.getElementById('rec-dot').className = 'conn-dot ok';
    document.getElementById('rec-lbl').textContent = `${recData.length} registros`;
    recRender();
  } catch(e) {
    document.getElementById('rec-dot').className = 'conn-dot er';
    document.getElementById('rec-lbl').textContent = 'Error';
  }
}

function recRender() {
  const q = (document.getElementById('rec-gs')?.value || '').toLowerCase();
  let rows = recData;
  if(q) rows = rows.filter(r =>
    (r.rec_number||'').toLowerCase().includes(q) ||
    (r.po_number||'').toLowerCase().includes(q) ||
    (r.job||'').toLowerCase().includes(q) ||
    (r.cpo||'').toLowerCase().includes(q) ||
    (r.factura||'').toLowerCase().includes(q) ||
    ((r.cfdi||{}).uuid||'').toLowerCase().includes(q) ||
    (r.supplier_name||'').toLowerCase().includes(q));
  document.getElementById('rec-tb').innerHTML = rows.map(r => `
    <tr>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-weight:700">${esc(r.rec_number)}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.po_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--amber)">${esc(r.job||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.cpo||'—')}</td>
      <td>${esc(r.factura||'—')}</td>
      <td>${esc(r.fecha||'—')}</td>
      <td><button class="fi-del" style="font-size:13px" title="Ver PDF" onclick="window.open('/api/recepciones/${encodeURIComponent(r.rec_number)}/pdf','_blank')">📄</button></td>
      <td><button class="fi-del" style="font-size:13px" title="Editar" onclick="recOpenEdit('${esc(r.rec_number)}')">✎</button></td>
      <td>${(r.cfdi&&r.cfdi.uuid)
        ? `<button class="fi-del" style="font-size:13px" title="Ver XML del CFDI (UUID ${esc(r.cfdi.uuid)})" onclick="window.open('/api/procesar-compra/cfdi/${encodeURIComponent(r.cfdi.uuid)}/xml','_blank')">🧾</button>`
        : '<span style="color:var(--muted);font-size:10px">—</span>'}</td>
    </tr>`).join('');
  document.getElementById('rec-count').textContent = `${rows.length} de ${recData.length} registros`;
}

// ── Abrir wizard ──────────────────────────────────────────
function recOpenWizard() {
  recCurrentPO = null; recCompraDirecta = false; recTipoRecepcion = '';
  recDirectaSupplier = null; recDirectaItems = []; recCurrentCFDI = null;
  document.getElementById('rec-user-display').textContent = (USER_PERMS?.user) || session_user || '—';
  document.getElementById('rec-po-num').value = 'PO-';
  document.getElementById('rec-compra-directa').checked = false;
  document.getElementById('rec-tipo-completa').checked = false;
  document.getElementById('rec-tipo-parcial').checked = false;
  document.getElementById('rec-factura').value = '';
  document.getElementById('rec-items-filter').value = '';
  document.getElementById('rec-directa-job').value = '';
  document.getElementById('rec-directa-cpo').value = '';
  document.getElementById('rec-cfdi-file').value = '';
  document.getElementById('rec-cfdi-status').textContent = '';
  document.getElementById('rec-cfdi-content').style.display = 'none';
  document.getElementById('rec-total-preview-wrap').style.display = 'none';
  ['rec-step-proveedor','rec-step-directa','rec-step-po-content','rec-step-items','rec-step-add-manual','rec-step-factura']
    .forEach(id => document.getElementById(id).style.display='none');
  document.getElementById('btn-rec-registrar').style.display = 'none';
  document.getElementById('btn-rec-siguiente').disabled = true;
  document.getElementById('mo-rec-wizard').classList.add('on');
}

function recToggleDirecta() {
  recCompraDirecta = document.getElementById('rec-compra-directa').checked;
  const poInput = document.getElementById('rec-po-num');
  if(recCompraDirecta) {
    poInput.disabled = true;
    document.getElementById('rec-step-proveedor').style.display = 'none';
    document.getElementById('rec-step-po-content').style.display = 'none';
    document.getElementById('rec-step-directa').style.display = '';
    document.getElementById('rec-step-add-manual').style.display = '';
    recDirectaItems = [];
    recManualRowSeq = 0;
    recRenderItemsTable();
    document.getElementById('rec-step-items').style.display = '';
    document.getElementById('rec-step-factura').style.display = '';
    document.getElementById('btn-rec-registrar').style.display = '';
  } else {
    poInput.disabled = false;
    document.getElementById('rec-step-directa').style.display = 'none';
    document.getElementById('rec-step-add-manual').style.display = 'none';
    document.getElementById('rec-step-items').style.display = 'none';
    document.getElementById('rec-step-factura').style.display = 'none';
    document.getElementById('btn-rec-registrar').style.display = 'none';
  }
}

// ── Paso: buscar / validar OC ────────────────────────────
async function recBuscarPO(val) {
  if(recCompraDirecta) return;
  const q = (val||'').trim().toUpperCase();
  if(!q || q === 'PO-' || q.length < 4) return;
  try {
    const d = await fetch(`/api/recepciones/oc/${encodeURIComponent(q)}`).then(r=>r.json());
    if(d.error) {
      toast(d.error, 'er');
      document.getElementById('rec-step-proveedor').style.display = 'none';
      document.getElementById('rec-step-po-content').style.display = 'none';
      return;
    }
    recCurrentPO = d.record;
    recRenderProveedor(recCurrentPO.supplier || {});
  } catch(e) { toast('Error buscando OC', 'er'); }
}

function recRenderProveedor(sup) {
  document.getElementById('rec-prov-grid').innerHTML = `
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Nombre</div><div style="font-weight:600">${esc(sup.nombre||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">RFC</div><div>${esc(sup.rfc||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Teléfono</div><div>${esc(sup.telefono||'—')}</div></div>`;
  document.getElementById('rec-step-proveedor').style.display = '';
  document.getElementById('rec-step-po-content').style.display = 'none';
  document.getElementById('rec-step-items').style.display = 'none';
  document.getElementById('rec-step-factura').style.display = 'none';
  document.getElementById('btn-rec-registrar').style.display = 'none';
}

// ── Paso: confirmar proveedor → mostrar contenido de la OC ──
function recConfirmProveedor() {
  if(!recCurrentPO) return;
  const po = recCurrentPO;
  document.getElementById('rec-po-header').innerHTML = `
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Orden</div>
      <div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--gold);font-size:14px">${esc(po.po_number)}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Proveedor</div>
      <div style="font-weight:600">${esc(po.supplier_name||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Estatus Físico (Almacén)</div>
      <div style="font-weight:700;color:${po.status==='Entregada'?'var(--green)':po.status==='Parcial'?'var(--amber)':'var(--muted)'}" title="Referencia del ingreso físico a almacén — no afecta ni depende de esta recepción fiscal">${esc(po.status||'Emitida')}</div></div>`;
  document.getElementById('rec-tipo-completa').checked = false;
  document.getElementById('rec-tipo-parcial').checked = false;
  recTipoRecepcion = '';
  document.getElementById('btn-rec-siguiente').disabled = true;
  document.getElementById('rec-step-po-content').style.display = '';
  document.getElementById('rec-step-items').style.display = 'none';
  document.getElementById('rec-step-factura').style.display = 'none';
  document.getElementById('btn-rec-registrar').style.display = 'none';

  const pendientes = (po.ingresos || []).filter(i => !i.fiscalizado);
  if(!(po.ingresos || []).length) {
    document.getElementById('rec-step-po-content').innerHTML += '';
    toast('Esta OC aún no tiene ingresos físicos registrados en Almacenes', 'if', 4500);
  } else if(!pendientes.length) {
    toast('Todos los ingresos físicos de esta OC ya fueron fiscalizados', 'if', 4500);
  }
}

function recSetTipo(tipo) {
  // Checkboxes mutuamente excluyentes (comportamiento de radio)
  document.getElementById('rec-tipo-completa').checked = (tipo === 'completa');
  document.getElementById('rec-tipo-parcial').checked  = (tipo === 'parcial');
  recTipoRecepcion = tipo;
  document.getElementById('btn-rec-siguiente').disabled = false;
}

// ── Paso: mostrar ingresos físicos de la OC (filtrables) ──
function recIrAItems() {
  if(!recCurrentPO || !recTipoRecepcion) return;
  document.getElementById('rec-items-filter').value = '';
  recRenderItemsTable();
  document.getElementById('rec-step-items').style.display = '';
  document.getElementById('rec-step-factura').style.display = 'none';
  document.getElementById('btn-rec-registrar').style.display = 'none';
}

function recRenderItemsTable() {
  const tb = document.getElementById('rec-items-tb');
  const thead = document.getElementById('rec-items-thead');
  const title = document.getElementById('rec-items-title');

  if(recCompraDirecta) {
    title.textContent = 'Items a Recepcionar (Compra Directa)';
    thead.innerHTML = `<th style="width:26px"></th><th>No. Parte</th><th>Descripción</th><th>Job</th>
      <th style="text-align:right">Cant.</th><th style="text-align:right">Costo Unit.</th>`;
    tb.innerHTML = recDirectaItems.map((it, i) => `
      <tr>
        <td></td>
        <td><input type="text" value="${esc(it.part_number)}" oninput="recManualUpdate(${i},'part_number',this.value)"
          style="width:100%;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:4px 7px;font-size:11px"></td>
        <td><input type="text" value="${esc(it.description)}" oninput="recManualUpdate(${i},'description',this.value)"
          style="width:100%;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:4px 7px;font-size:11px"></td>
        <td><input type="text" value="${esc(it.job)}" oninput="recManualUpdate(${i},'job',this.value)"
          style="width:90px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--gold);padding:4px 7px;font-size:11px;text-transform:uppercase"></td>
        <td style="text-align:right"><input type="number" min="0" step="1" value="${it.quantity_received}"
          oninput="recManualUpdate(${i},'quantity_received',this.value); recUpdateProcesarBtnState()"
          style="width:70px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--gold);padding:4px 7px;font-size:12px;text-align:right;font-weight:700"></td>
        <td style="text-align:right"><input type="number" min="0" step="0.01" value="${it.unit_cost}"
          oninput="recManualUpdate(${i},'unit_cost',this.value)"
          style="width:80px;background:var(--inp);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:4px 7px;font-size:11px;text-align:right"></td>
      </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">Agrega items con el botón "+ Agregar Item"</td></tr>`;
    recUpdateProcesarBtnState();
    return;
  }

  title.textContent = 'Ingresos de Almacén a Fiscalizar';
  thead.innerHTML = `<th style="width:26px"></th><th>Ingreso</th><th>Fecha</th><th>Recibe</th>
    <th>Items (No. Parte × Cant. · Job)</th><th style="text-align:right">Total</th><th>Estado</th>`;

  const filter = (document.getElementById('rec-items-filter')?.value || '').toLowerCase();
  const ingresos = (recCurrentPO?.ingresos || []);
  const completa = recTipoRecepcion === 'completa';
  let visibleCount = 0, pendingCount = 0;

  tb.innerHTML = ingresos.map((ing, i) => {
    const items = ing.items || [];
    if(filter && !items.some(it => (it.part_number||'').toLowerCase().includes(filter) || (it.description||'').toLowerCase().includes(filter))) return '';
    visibleCount++;
    const total = items.reduce((s,it)=>s+((it.quantity_delivered||0)*(it.unit_cost||0)),0);
    const itemsResumen = items.map(it => `${esc(it.part_number)} × ${it.quantity_delivered||0}${it.job?` <span style="color:var(--gold)">(${esc(it.job)})</span>`:''}`).join('<br>');
    const yaFiscal = !!ing.fiscalizado;
    if(!yaFiscal) pendingCount++;
    const checked = (completa && !yaFiscal);
    return `<tr data-idx="${i}" style="${yaFiscal?'opacity:.5':''}">
      <td><input type="checkbox" class="rec-item-chk" data-idx="${i}" ${checked?'checked':''} ${yaFiscal?'disabled':''}
        onchange="recUpdateProcesarBtnState()" style="width:15px;height:15px"></td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-size:11px">${esc(ing.id)}</td>
      <td style="color:var(--muted2)">${esc(ing.fecha||'—')}</td>
      <td style="color:var(--muted2)">${esc(ing.recibe||'—')}</td>
      <td style="font-size:10px;line-height:1.5">${itemsResumen || '—'}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">$${total.toFixed(2)}</td>
      <td style="font-size:10px">${yaFiscal
        ? `<span style="color:var(--green)">✓ Facturado en ${esc(ing.fiscalizado_en)}</span>`
        : '<span style="color:var(--amber)">Pendiente</span>'}</td>
    </tr>`;
  }).join('');

  if(ingresos.length && pendingCount === 0) {
    tb.innerHTML += `<tr><td colspan="7" style="text-align:center;color:var(--amber);padding:10px;font-size:11px">
      ⚠ Todos los ingresos físicos de esta OC ya fueron fiscalizados — no queda pendiente por facturar.</td></tr>`;
  } else if(!ingresos.length) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:16px">
      Esta OC aún no tiene ingresos físicos registrados en Almacenes (Ingreso de Material).</td></tr>`;
  } else if(filter && visibleCount === 0) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:16px">Sin resultados para ese filtro</td></tr>`;
  }
  recUpdateProcesarBtnState();
}

function recUpdateProcesarBtnState() {
  const btn = document.getElementById('btn-rec-procesar');
  if(!btn) return;
  const items = recRecolectarItems();
  const ok = recCompraDirecta
    ? items.reduce((s,it)=>s+(parseFloat(it.quantity_received)||0),0) > 0
    : recSeleccionarIngresoIds().length > 0;
  btn.disabled = !ok;
  btn.title = ok ? '' : (recCompraDirecta
    ? 'Ingresa al menos una cantidad mayor a 0 para continuar'
    : 'Selecciona al menos un ingreso de almacén a fiscalizar');
  recUpdateTotalPreview();
}

function recCalcularSubtotalSeleccionado() {
  if(recCompraDirecta) {
    return recDirectaItems.filter(it=>it.quantity_received>0)
      .reduce((s,it)=>s+(it.quantity_received*it.unit_cost),0);
  }
  return (recCurrentPO?.ingresos||[]).reduce((s,ing,i)=>{
    const chk = document.querySelector(`.rec-item-chk[data-idx="${i}"]`);
    if(!chk || !chk.checked) return s;
    return s + (ing.items||[]).reduce((s2,it)=>s2+((it.quantity_delivered||0)*(it.unit_cost||0)),0);
  },0);
}

function recCalcularTotalConEsquema(subtotal, esquema) {
  if(!esquema) return subtotal;
  const ivaAmt  = subtotal * (parseFloat(esquema.iva_trasladado)||0) / 100;
  const isrAmt  = subtotal * (parseFloat(esquema.isr_retenido)||0) / 100;
  const ivaRAmt = subtotal * (parseFloat(esquema.iva_retenido)||0) / 100;
  const iepsAmt = subtotal * (parseFloat(esquema.ieps)||0) / 100;
  return subtotal + ivaAmt - isrAmt - ivaRAmt + iepsAmt;
}

function recUpdateTotalPreview() {
  const wrap = document.getElementById('rec-total-preview-wrap');
  if(!wrap) return;
  const subtotal = recCalcularSubtotalSeleccionado();
  if(subtotal <= 0) { wrap.style.display = 'none'; return; }

  const esquema = recCompraDirecta ? null : (recCurrentPO?.esquema_tributario || null);
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('rec-tp-subtotal').textContent = fmt(subtotal);

  const bd = document.getElementById('rec-tp-breakdown');
  const esquemaEl = document.getElementById('rec-tp-esquema');
  if(esquema) {
    const ivaAmt  = subtotal * (parseFloat(esquema.iva_trasladado)||0) / 100;
    const isrAmt  = subtotal * (parseFloat(esquema.isr_retenido)||0) / 100;
    const ivaRAmt = subtotal * (parseFloat(esquema.iva_retenido)||0) / 100;
    const iepsAmt = subtotal * (parseFloat(esquema.ieps)||0) / 100;
    bd.innerHTML = `
      ${ivaAmt?`<div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.7)"><span>IVA TRASLADADO (${esquema.iva_trasladado}%)</span><span>${fmt(ivaAmt)}</span></div>`:''}
      ${isrAmt?`<div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.7)"><span>ISR RETENIDO (${esquema.isr_retenido}%)</span><span>-${fmt(isrAmt)}</span></div>`:''}
      ${ivaRAmt?`<div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.7)"><span>IVA RETENIDO (${esquema.iva_retenido}%)</span><span>-${fmt(ivaRAmt)}</span></div>`:''}
      ${iepsAmt?`<div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.7)"><span>IEPS (${esquema.ieps}%)</span><span>${fmt(iepsAmt)}</span></div>`:''}`;
    esquemaEl.textContent = `Esquema Tributario: ${esquema.folio} — ${esquema.nombre}`;
  } else {
    bd.innerHTML = '';
    esquemaEl.textContent = recCompraDirecta ? '' : 'Esta OC no tiene Esquema Tributario asignado — Total = Subtotal';
  }
  document.getElementById('rec-tp-total').textContent = fmt(recCalcularTotalConEsquema(subtotal, esquema));
  wrap.style.display = 'flex';
}

function recFiltrarItems() { recRenderItemsTable(); }

function recSeleccionarIngresoIds() {
  const ingresos = (recCurrentPO?.ingresos || []);
  const ids = [];
  ingresos.forEach((ing, i) => {
    const chk = document.querySelector(`.rec-item-chk[data-idx="${i}"]`);
    if(chk && chk.checked) ids.push(ing.id);
  });
  return ids;
}

// ── Compra directa: buscar proveedor y agregar items manuales ──
async function recBuscarProveedorDirecta(val) {
  const q = (val||'').trim();
  const box = document.getElementById('rec-directa-prov-results');
  if(!q) { box.innerHTML=''; return; }
  try {
    const d = await fetch(`/api/proveedores?q=${encodeURIComponent(q)}`).then(r=>r.json());
    box.innerHTML = (d.records||[]).slice(0,8).map(p => `
      <div onclick='recSelProveedorDirecta(${JSON.stringify(p).replace(/'/g,"&apos;")})'
        style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:4px;cursor:pointer;font-size:11px"
        onmouseenter="this.style.background='rgba(0,0,0,.045)'" onmouseleave="this.style.background=''">
        <b>${esc(p.nombre)}</b> · ${esc(p.rfc||'—')}
      </div>`).join('') || '<div style="font-size:11px;color:var(--muted)">Sin resultados</div>';
  } catch(e) { /* silencioso */ }
}

function recSelProveedorDirecta(p) {
  recDirectaSupplier = p;
  document.getElementById('rec-directa-prov-sel').innerHTML = `<b>${esc(p.nombre)}</b> · ${esc(p.rfc||'—')}`;
  document.getElementById('rec-directa-prov-results').innerHTML = '';
  document.getElementById('rec-directa-prov-search').value = '';
}

function recAddManualRow() {
  recDirectaItems.push({ _id: ++recManualRowSeq, part_number:'', description:'', job:'', quantity_received:1, unit_cost:0 });
  recRenderItemsTable();
}

function recManualUpdate(i, field, val) {
  if(!recDirectaItems[i]) return;
  recDirectaItems[i][field] = (field==='quantity_received'||field==='unit_cost') ? parseFloat(val||0) : val;
}

// ── Paso final: procesar → pedir factura → registrar ─────
function recProcesarRecepcion() {
  const ok = recCompraDirecta
    ? recRecolectarItems().length > 0
    : recSeleccionarIngresoIds().length > 0;
  if(!ok) { toast(recCompraDirecta ? 'Captura al menos un item con cantidad > 0' : 'Selecciona al menos un ingreso a fiscalizar', 'er'); return; }
  document.getElementById('rec-step-factura').style.display = '';
  document.getElementById('btn-rec-registrar').style.display = '';
  document.getElementById('rec-factura').focus();
}

function recRecolectarItems() {
  // Sólo usado para Compra Directa (captura manual). El flujo con OC construye
  // los items en el backend a partir de los ingresos físicos seleccionados.
  if(!recCompraDirecta) return [];
  return recDirectaItems.filter(it => it.quantity_received > 0).map(it => ({
    part_number: it.part_number, description: it.description, brand: '',
    job: it.job, quantity_received: it.quantity_received, unit_cost: it.unit_cost
  }));
}

// ── Carga y validación del CFDI (XML) ────────────────────
async function recCargarCFDI(file) {
  recCurrentCFDI = null;
  document.getElementById('rec-cfdi-content').style.display = 'none';
  const statusEl = document.getElementById('rec-cfdi-status');
  if(!file) { statusEl.textContent = ''; return; }
  statusEl.textContent = 'Leyendo CFDI…';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const d = await fetch('/api/recepciones/parse-cfdi', { method:'POST', body: fd }).then(r=>r.json());
    if(d.error) {
      statusEl.innerHTML = `<span style="color:var(--red)">⚠ ${esc(d.error)}</span>`;
      return;
    }
    recCurrentCFDI = d.record;
    recRenderCFDI(recCurrentCFDI);
  } catch(e) {
    statusEl.innerHTML = `<span style="color:var(--red)">⚠ Error leyendo el archivo</span>`;
  }
}

function recRenderCFDI(cfdi) {
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('rec-cfdi-grid').innerHTML = `
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">UUID</div><div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--gold)">${esc(cfdi.uuid||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">RFC Emisor</div><div style="font-family:'DM Mono',monospace">${esc(cfdi.rfc_emisor||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Emisor</div><div>${esc(cfdi.nombre_emisor||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Folio / Serie</div><div>${esc(cfdi.serie||'')}${esc(cfdi.folio||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Fecha CFDI</div><div>${esc((cfdi.fecha||'').replace('T',' '))}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Total CFDI</div><div style="font-weight:700;color:var(--gold)">${fmt(cfdi.total)}</div></div>`;
  document.getElementById('rec-cfdi-content').style.display = '';

  document.getElementById('rec-cfdi-status').textContent = '';
  const matchEl = document.getElementById('rec-cfdi-match');
  const msgs = [];

  if(cfdi._ya_procesado) {
    matchEl.innerHTML = `<span style="color:var(--red)">⚠ Este CFDI ya fue registrado en ${esc(cfdi._folio_previo)} — no se puede volver a usar.</span>`;
  } else {
    // Auto-rellenar el No. de Factura con Serie+Folio (o UUID si el CFDI no trae folio)
    const facturaEl = document.getElementById('rec-factura');
    if(facturaEl && !facturaEl.value.trim()) {
      facturaEl.value = (cfdi.serie || cfdi.folio) ? `${cfdi.serie||''}${cfdi.folio||''}` : cfdi.uuid;
    }
    // Validar RFC del proveedor contra la OC / proveedor seleccionado
    const rfcEsperado = recCompraDirecta ? (recDirectaSupplier?.rfc||'') : (recCurrentPO?.supplier?.rfc||'');
    if(rfcEsperado && cfdi.rfc_emisor && rfcEsperado.toUpperCase() !== cfdi.rfc_emisor.toUpperCase()) {
      msgs.push(`<span style="color:var(--amber)">⚠ El RFC del CFDI (${esc(cfdi.rfc_emisor)}) no coincide con el del proveedor (${esc(rfcEsperado)})</span>`);
    } else if(rfcEsperado) {
      msgs.push(`<span style="color:var(--green)">✓ El RFC del emisor coincide con el proveedor</span>`);
    }
    // Comparar el total del CFDI contra el TOTAL (con esquema tributario aplicado) de lo seleccionado
    const subtotalSel = recCalcularSubtotalSeleccionado();
    const esquemaSel  = recCompraDirecta ? null : (recCurrentPO?.esquema_tributario || null);
    const totalRec    = recCalcularTotalConEsquema(subtotalSel, esquemaSel);
    if(totalRec > 0) {
      const diff = Math.abs((parseFloat(cfdi.total)||0) - totalRec);
      if(diff < 0.01) msgs.push(`<span style="color:var(--green)">✓ El total del CFDI coincide con lo seleccionado</span>`);
      else msgs.push(`<span style="color:var(--amber)">⚠ El total del CFDI (${fmt(cfdi.total)}) no coincide con lo seleccionado (${fmt(totalRec)})</span>`);
    }
  }
  matchEl.innerHTML = msgs.join('<br>');
}

async function recRegistrar() {
  const factura = document.getElementById('rec-factura').value.trim();
  if(!factura) { toast('Captura el número de factura o folio', 'er'); return; }
  if(recCurrentCFDI && recCurrentCFDI._ya_procesado) { toast('Este CFDI ya fue registrado antes', 'er'); return; }

  const cfdiPayload = recCurrentCFDI ? {
    uuid: recCurrentCFDI.uuid, rfc_emisor: recCurrentCFDI.rfc_emisor,
    nombre_emisor: recCurrentCFDI.nombre_emisor, folio: recCurrentCFDI.folio,
    serie: recCurrentCFDI.serie, fecha: recCurrentCFDI.fecha,
    subtotal: recCurrentCFDI.subtotal, total: recCurrentCFDI.total,
    impuestos_trasladados: recCurrentCFDI.impuestos_trasladados,
    impuestos_retenidos: recCurrentCFDI.impuestos_retenidos,
  } : null;

  let body;
  if(recCompraDirecta) {
    const items = recRecolectarItems();
    if(!items.length) { toast('No hay items capturados', 'er'); return; }
    const job = document.getElementById('rec-directa-job')?.value.trim().toUpperCase() || '';
    const cpo = document.getElementById('rec-directa-cpo')?.value.trim().toUpperCase() || '';
    body = { compra_directa: true, supplier: recDirectaSupplier || {}, factura, items, job, cpo, cfdi: cfdiPayload };
  } else {
    const ingreso_ids = recSeleccionarIngresoIds();
    if(!ingreso_ids.length) { toast('Selecciona al menos un ingreso a fiscalizar', 'er'); return; }
    body = { po_number: recCurrentPO?.po_number || '', compra_directa: false, ingreso_ids, factura, cfdi: cfdiPayload };
  }

  const btn = document.getElementById('btn-rec-registrar');
  btn.disabled = true; btn.textContent = 'Registrando…';
  try {
    const d = await fetch('/api/recepciones', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    toast(`✓ Recepción ${d.record.rec_number} registrada`, 'ok', 5000);
    closeMo('mo-rec-wizard');
    await loadRecepciones();
    window.open(`/api/recepciones/${encodeURIComponent(d.record.rec_number)}/pdf`, '_blank');
  } catch(e) { toast('Error: '+e.message, 'er'); }
  finally { btn.disabled = false; btn.textContent = '📝 Registrar Recepción'; }
}

// ── Editar (factura / notas) ──────────────────────────────
function recOpenEdit(recNumber) {
  const rec = recData.find(r => r.rec_number === recNumber);
  if(!rec) return;
  document.getElementById('rec-edit-number').value = rec.rec_number;
  document.getElementById('rec-edit-factura').value = rec.factura || '';
  document.getElementById('rec-edit-notes').value = rec.notes || '';
  document.getElementById('mo-rec-edit').classList.add('on');
}

async function recGuardarEdit() {
  const recNumber = document.getElementById('rec-edit-number').value;
  const factura = document.getElementById('rec-edit-factura').value.trim();
  const notes = document.getElementById('rec-edit-notes').value.trim();
  if(!factura) { toast('El número de factura no puede quedar vacío', 'er'); return; }
  try {
    const d = await fetch(`/api/recepciones/${encodeURIComponent(recNumber)}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({factura, notes})
    }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    toast('✓ Recepción actualizada', 'ok');
    closeMo('mo-rec-edit');
    await loadRecepciones();
  } catch(e) { toast('Error: '+e.message, 'er'); }
}

document.addEventListener('DOMContentLoaded', () => {
  const origSwitch = window.switchMenu;
  if(typeof origSwitch === 'function' && !window._recHooked) {
    window._recHooked = true;
    window.switchMenu = function(mod, groupId) {
      origSwitch(mod, groupId);
      if(mod === 'fin-recepciones') loadRecepciones();
    };
  }
});

// ════════════════════════════════════════════════════════
//  FINANZAS — PROCESAR COMPRA (+ CPP)
// ════════════════════════════════════════════════════════
let purData = [];
let purCurrentRec = null;
let purCurrentCFDI = null;

async function loadProcesarCompra() {
  try {
    const d = await fetch('/api/procesar-compra').then(r=>r.json());
    purData = d.records || [];
    document.getElementById('pur-dot').className = 'conn-dot ok';
    document.getElementById('pur-lbl').textContent = `${purData.length} registros`;
    purRender();
  } catch(e) {
    document.getElementById('pur-dot').className = 'conn-dot er';
    document.getElementById('pur-lbl').textContent = 'Error';
  }
}

function purRender() {
  const q = (document.getElementById('pur-gs')?.value || '').toLowerCase();
  let rows = purData;
  if(q) rows = rows.filter(r =>
    (r.pur_number||'').toLowerCase().includes(q) ||
    (r.rec_number||'').toLowerCase().includes(q) ||
    (r.po_number||'').toLowerCase().includes(q) ||
    (r.job||'').toLowerCase().includes(q) ||
    (r.cpo||'').toLowerCase().includes(q) ||
    (r.factura||'').toLowerCase().includes(q) ||
    ((r.cfdi||{}).uuid||'').toLowerCase().includes(q) ||
    (r.usuario||'').toLowerCase().includes(q));
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('pur-tb').innerHTML = rows.map(r => `
    <tr>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-weight:700">${esc(r.pur_number)}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.rec_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.po_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--amber)">${esc(r.job||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.cpo||'—')}</td>
      <td>${esc(r.factura||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${fmt(r.monto)}</td>
      <td>${esc(r.fecha||'—')}</td>
      <td style="color:var(--muted2)">${esc(r.usuario||'—')}</td>
      <td><button class="fi-del" style="font-size:13px" title="Ver PDF" onclick="window.open('/api/procesar-compra/${encodeURIComponent(r.pur_number)}/pdf','_blank')">📄</button></td>
      <td>${(r.cfdi&&r.cfdi.uuid)
        ? `<button class="fi-del" style="font-size:13px" title="Ver XML del CFDI (UUID ${esc(r.cfdi.uuid)})" onclick="window.open('/api/procesar-compra/cfdi/${encodeURIComponent(r.cfdi.uuid)}/xml','_blank')">🧾</button>`
        : '<span style="color:var(--muted);font-size:10px">—</span>'}</td>
    </tr>`).join('');
  document.getElementById('pur-count').textContent = `${rows.length} de ${purData.length} registros`;
}

function purOpenWizard() {
  purCurrentRec = null;
  purCurrentCFDI = null;
  document.getElementById('pur-search').value = '';
  document.getElementById('pur-cfdi-file').value = '';
  document.getElementById('pur-cfdi-status').textContent = '';
  document.getElementById('pur-cfdi-content').style.display = 'none';
  document.getElementById('pur-cfdi-inherited').style.display = 'none';
  document.getElementById('pur-cfdi-upload-wrap').style.display = '';
  document.getElementById('pur-rec-content').style.display = 'none';
  document.getElementById('pur-rec-empty').style.display = '';
  document.getElementById('pur-rec-empty').textContent = 'Ingresa la factura o el folio de Recepción para continuar';
  document.getElementById('btn-pur-registrar').style.display = 'none';
  document.getElementById('mo-pur-wizard').classList.add('on');
  setTimeout(()=>document.getElementById('pur-search').focus(), 50);
}

async function purBuscarRec(val) {
  const q = (val||'').trim();
  if(!q) return;
  try {
    const d = await fetch(`/api/procesar-compra/buscar/${encodeURIComponent(q)}`).then(r=>r.json());
    if(d.error) {
      toast(d.error, 'er');
      document.getElementById('pur-rec-content').style.display = 'none';
      document.getElementById('pur-rec-empty').style.display = '';
      document.getElementById('pur-rec-empty').innerHTML = `<span style="color:var(--red)">⚠ ${esc(d.error)}</span>`;
      document.getElementById('btn-pur-registrar').style.display = 'none';
      return;
    }
    purCurrentRec = d.record;
    purRenderRec(purCurrentRec);
  } catch(e) { toast('Error buscando la Recepción', 'er'); }
}

function purRenderRec(rec) {
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('pur-rec-grid').innerHTML = `
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Rec Number</div><div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--gold)">${esc(rec.rec_number)}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">PO Number</div><div style="font-family:'DM Mono',monospace">${esc(rec.po_number||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Job</div><div style="font-family:'DM Mono',monospace;color:var(--amber)">${esc(rec.job||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">CPO</div><div style="font-family:'DM Mono',monospace">${esc(rec.cpo||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">No. Factura</div><div>${esc(rec.factura||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Proveedor</div><div>${esc(rec.supplier_name||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Fecha</div><div>${esc(rec.fecha||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Monto</div><div style="font-weight:700;color:var(--gold)">${fmt(rec.total)}</div></div>`;

  document.getElementById('pur-rec-empty').style.display = 'none';
  document.getElementById('pur-rec-content').style.display = '';
  const warn = document.getElementById('pur-rec-warning');
  if(rec._ya_procesada) {
    warn.style.display = '';
    warn.textContent = `⚠ Esta Recepción ya fue procesada como compra en ${rec._pur_number}`;
    document.getElementById('btn-pur-registrar').style.display = 'none';
  } else {
    warn.style.display = 'none';
    document.getElementById('btn-pur-registrar').style.display = '';
  }

  // Si la Recepción ya trae un CFDI cargado (desde Recepciones), no pedirlo de nuevo
  const inheritedEl = document.getElementById('pur-cfdi-inherited');
  const uploadWrap  = document.getElementById('pur-cfdi-upload-wrap');
  if(rec.cfdi && rec.cfdi.uuid) {
    purCurrentCFDI = null;
    inheritedEl.style.display = '';
    inheritedEl.innerHTML = `✓ Esta Recepción ya trae un CFDI adjunto — UUID <b>${esc(rec.cfdi.uuid)}</b> (${esc(rec.cfdi.rfc_emisor||'')}). Se usará automáticamente al registrar.`;
    uploadWrap.style.display = 'none';
  } else {
    inheritedEl.style.display = 'none';
    uploadWrap.style.display = '';
  }
}

// ── Carga y validación del CFDI (XML) ────────────────────
async function purCargarCFDI(file) {
  purCurrentCFDI = null;
  document.getElementById('pur-cfdi-content').style.display = 'none';
  const statusEl = document.getElementById('pur-cfdi-status');
  if(!file) { statusEl.textContent = ''; return; }
  statusEl.textContent = 'Leyendo CFDI…';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const d = await fetch('/api/procesar-compra/parse-cfdi', { method:'POST', body: fd }).then(r=>r.json());
    if(d.error) {
      statusEl.innerHTML = `<span style="color:var(--red)">⚠ ${esc(d.error)}</span>`;
      document.getElementById('btn-pur-registrar').style.display = 'none';
      return;
    }
    purCurrentCFDI = d.record;
    purRenderCFDI(purCurrentCFDI);
  } catch(e) {
    statusEl.innerHTML = `<span style="color:var(--red)">⚠ Error leyendo el archivo</span>`;
  }
}

function purRenderCFDI(cfdi) {
  const fmt = v => '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('pur-cfdi-grid').innerHTML = `
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">UUID</div><div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--gold)">${esc(cfdi.uuid||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">RFC Emisor</div><div style="font-family:'DM Mono',monospace">${esc(cfdi.rfc_emisor||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Emisor</div><div>${esc(cfdi.nombre_emisor||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Folio / Serie</div><div>${esc(cfdi.serie||'')}${esc(cfdi.folio||'—')}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Fecha CFDI</div><div>${esc((cfdi.fecha||'').replace('T',' '))}</div></div>
    <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Total CFDI</div><div style="font-weight:700;color:var(--gold)">${fmt(cfdi.total)}</div></div>`;
  document.getElementById('pur-cfdi-content').style.display = '';

  const statusEl = document.getElementById('pur-cfdi-status');
  const matchEl  = document.getElementById('pur-cfdi-match');
  statusEl.textContent = '';

  if(cfdi._ya_procesado) {
    matchEl.innerHTML = `<span style="color:var(--red)">⚠ Este CFDI ya fue procesado en ${esc(cfdi._pur_number)} — no se puede volver a registrar.</span>`;
    document.getElementById('btn-pur-registrar').style.display = 'none';
    return;
  }

  if(purCurrentRec) {
    const diff = Math.abs((parseFloat(cfdi.total)||0) - (parseFloat(purCurrentRec.total)||0));
    if(diff < 0.01) {
      matchEl.innerHTML = `<span style="color:var(--green)">✓ El total del CFDI coincide con el de la Recepción</span>`;
    } else {
      matchEl.innerHTML = `<span style="color:var(--amber)">⚠ El total del CFDI (${fmt(cfdi.total)}) no coincide con el de la Recepción (${fmt(purCurrentRec.total)}) — verifica antes de registrar</span>`;
    }
    if(!purCurrentRec._ya_procesada) document.getElementById('btn-pur-registrar').style.display = '';
  }
}

async function purRegistrar() {
  if(!purCurrentRec || purCurrentRec._ya_procesada) return;
  if(purCurrentCFDI && purCurrentCFDI._ya_procesado) { toast('Este CFDI ya fue procesado antes', 'er'); return; }
  const btn = document.getElementById('btn-pur-registrar');
  btn.disabled = true; btn.textContent = 'Registrando…';
  try {
    const body = { rec_number: purCurrentRec.rec_number };
    if(purCurrentCFDI) {
      body.cfdi = {
        uuid: purCurrentCFDI.uuid, rfc_emisor: purCurrentCFDI.rfc_emisor,
        nombre_emisor: purCurrentCFDI.nombre_emisor, folio: purCurrentCFDI.folio,
        serie: purCurrentCFDI.serie, fecha: purCurrentCFDI.fecha,
        subtotal: purCurrentCFDI.subtotal, total: purCurrentCFDI.total,
        impuestos_trasladados: purCurrentCFDI.impuestos_trasladados,
        impuestos_retenidos: purCurrentCFDI.impuestos_retenidos,
      };
    }
    const d = await fetch('/api/procesar-compra', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    toast(`✓ Compra ${d.record.pur_number} registrada — CPP ${d.cpp_record.cpp_number} generado`, 'ok', 5000);
    closeMo('mo-pur-wizard');
    await loadProcesarCompra();
    window.open(`/api/procesar-compra/${encodeURIComponent(d.record.pur_number)}/pdf`, '_blank');
  } catch(e) { toast('Error: '+e.message, 'er'); }
  finally { btn.disabled = false; btn.textContent = '📝 Registrar Compra'; }
}

document.addEventListener('DOMContentLoaded', () => {
  const origSwitch2 = window.switchMenu;
  if(typeof origSwitch2 === 'function' && !window._purHooked) {
    window._purHooked = true;
    window.switchMenu = function(mod, groupId) {
      origSwitch2(mod, groupId);
      if(mod === 'fin-procesarcompra') loadProcesarCompra();
    };
  }
});

// ════════════════════════════════════════════════════════
//  FINANZAS — CPP (Cuentas por Pagar)
// ════════════════════════════════════════════════════════
let cppData = [];

async function loadCPP() {
  try {
    const d = await fetch('/api/cpp').then(r=>r.json());
    cppData = d.records || [];
    document.getElementById('cpp-dot').className = 'conn-dot ok';
    document.getElementById('cpp-lbl').textContent = `${cppData.length} registros`;
    cppRender();
  } catch(e) {
    document.getElementById('cpp-dot').className = 'conn-dot er';
    document.getElementById('cpp-lbl').textContent = 'Error';
  }
}

function cppRender() {
  const q = (document.getElementById('cpp-gs')?.value || '').toLowerCase();
  let rows = cppData;
  if(q) rows = rows.filter(r =>
    (r.cpp_number||'').toLowerCase().includes(q) ||
    (r.pur_number||'').toLowerCase().includes(q) ||
    (r.rec_number||'').toLowerCase().includes(q) ||
    (r.po_number||'').toLowerCase().includes(q) ||
    (r.job||'').toLowerCase().includes(q) ||
    (r.cpo||'').toLowerCase().includes(q) ||
    (r.factura||'').toLowerCase().includes(q) ||
    (r.supplier_name||'').toLowerCase().includes(q));
  const fmt = v => (v<0?'-':'') + '$'+Math.abs(Number(v||0)).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('cpp-tb').innerHTML = rows.map(r => {
    const pagado = (r.estatus||'Pendiente') === 'Pagado';
    return `<tr style="${pagado?'opacity:.6':''}">
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-weight:700">${esc(r.cpp_number)}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.pur_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.rec_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.po_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--amber)">${esc(r.job||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.cpo||'—')}</td>
      <td>${esc(r.factura||'—')}</td>
      <td style="color:var(--muted2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.supplier_name||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:${r.monto<0?'var(--red)':'var(--green)'}">${fmt(r.monto)}</td>
      <td>${esc(r.fecha||'—')}</td>
      <td style="color:var(--muted2)">${esc(r.usuario||'—')}</td>
      <td>${pagado
        ? '<span style="font-size:10px;color:var(--green);font-weight:700">✓ Pagado</span>'
        : '<span style="font-size:10px;color:var(--amber)">Pendiente</span>'}</td>
      <td><button class="fi-del" style="font-size:13px" title="Ver PDF" onclick="window.open('/api/cpp/${encodeURIComponent(r.cpp_number)}/pdf','_blank')">📄</button></td>
    </tr>`;
  }).join('');
  document.getElementById('cpp-count').textContent = `${rows.length} de ${cppData.length} registros`;
  // El Saldo Total excluye las CPP ya pagadas
  const pendientes = rows.filter(r => (r.estatus||'Pendiente') !== 'Pagado');
  const total = pendientes.reduce((s,r)=>s+(parseFloat(r.monto)||0),0);
  const totalEl = document.getElementById('cpp-total');
  totalEl.textContent = (total<0?'-':'') + '$'+Math.abs(total).toLocaleString('en-US',{minimumFractionDigits:2});
  totalEl.style.color = total<0 ? 'var(--red)' : 'var(--green)';
}

document.addEventListener('DOMContentLoaded', () => {
  const origSwitch3 = window.switchMenu;
  if(typeof origSwitch3 === 'function' && !window._cppHooked) {
    window._cppHooked = true;
    window.switchMenu = function(mod, groupId) {
      origSwitch3(mod, groupId);
      if(mod === 'fin-cpp') loadCPP();
    };
  }
});

// ════════════════════════════════════════════════════════
//  CPP — PROCESAR PAGO (wizard)
// ════════════════════════════════════════════════════════
let pagoModo = '';           // 'cpp' | 'proveedor'
let pagoCppActual = null;    // registro CPP (modo individual)
let pagoProvPendientes = []; // lista de CPP pendientes (modo proveedor)

function cppOpenPagoWizard() {
  pagoModo = '';
  pagoCppActual = null;
  pagoProvPendientes = [];
  document.getElementById('pago-cpp-search').value = '';
  document.getElementById('pago-prov-search').value = '';
  document.getElementById('pago-cpp-content').style.display = 'none';
  document.getElementById('pago-prov-tb').innerHTML = '';
  document.getElementById('pago-step-cpp').style.display = 'none';
  document.getElementById('pago-step-prov').style.display = 'none';
  document.getElementById('pago-step-modo').style.display = 'flex';
  document.getElementById('btn-pago-procesar').style.display = 'none';
  document.getElementById('mo-cpp-pago').classList.add('on');
}

function pagoSetModo(modo) {
  pagoModo = modo;
  document.getElementById('pago-step-cpp').style.display = (modo==='cpp') ? '' : 'none';
  document.getElementById('pago-step-prov').style.display = (modo==='proveedor') ? '' : 'none';
  document.getElementById('btn-pago-procesar').style.display = 'none';
  if(modo === 'cpp') {
    setTimeout(()=>document.getElementById('pago-cpp-search').focus(), 50);
  } else {
    pagoBuscarProveedor(''); // muestra todo el saldo pendiente por default
    setTimeout(()=>document.getElementById('pago-prov-search').focus(), 50);
  }
}

// ── Modo: Buscar CPP individual ──────────────────────────
async function pagoBuscarCPP(val) {
  const q = (val||'').trim();
  if(!q) return;
  try {
    const d = await fetch(`/api/cpp/${encodeURIComponent(q)}/lookup`).then(r=>r.json());
    if(d.error) {
      toast(d.error, 'er');
      document.getElementById('pago-cpp-content').style.display = 'none';
      document.getElementById('btn-pago-procesar').style.display = 'none';
      return;
    }
    pagoCppActual = d.record;
    const fmt = v => '$'+Number(Math.abs(v)||0).toLocaleString('en-US',{minimumFractionDigits:2});
    const pagado = (pagoCppActual.estatus||'Pendiente') === 'Pagado';
    document.getElementById('pago-cpp-grid').innerHTML = `
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">CPP Number</div><div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--gold)">${esc(pagoCppActual.cpp_number)}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Proveedor</div><div>${esc(pagoCppActual.supplier_name||'—')}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">PO Number</div><div style="font-family:'DM Mono',monospace">${esc(pagoCppActual.po_number||'—')}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Job</div><div style="font-family:'DM Mono',monospace;color:var(--amber)">${esc(pagoCppActual.job||'—')}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">CPO</div><div style="font-family:'DM Mono',monospace">${esc(pagoCppActual.cpo||'—')}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">No. Factura</div><div>${esc(pagoCppActual.factura||'—')}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Monto</div><div style="font-weight:700;color:var(--red)">${fmt(pagoCppActual.monto)}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Estatus</div><div style="font-weight:700;color:${pagado?'var(--green)':'var(--amber)'}">${pagado?'✓ Pagado':'Pendiente'}</div></div>`;
    document.getElementById('pago-cpp-content').style.display = '';
    document.getElementById('btn-pago-procesar').style.display = pagado ? 'none' : '';
    if(pagado) toast('Esta CPP ya tiene un pago registrado', 'if', 4000);
  } catch(e) { toast('Error buscando la CPP', 'er'); }
}

// ── Modo: Buscar Saldo de Proveedor ──────────────────────
async function pagoBuscarProveedor(val) {
  const q = (val||'').trim();
  try {
    const d = await fetch(`/api/cpp/pendientes?proveedor=${encodeURIComponent(q)}`).then(r=>r.json());
    pagoProvPendientes = d.records || [];
    pagoRenderProvTabla();
  } catch(e) { toast('Error buscando el saldo del proveedor', 'er'); }
}

function pagoRenderProvTabla() {
  const fmt = v => '$'+Number(Math.abs(v)||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const tb = document.getElementById('pago-prov-tb');
  tb.innerHTML = pagoProvPendientes.map((c,i) => `
    <tr>
      <td><input type="checkbox" class="pago-prov-chk" data-idx="${i}" onchange="pagoUpdateBtnState()" style="width:15px;height:15px"></td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold)">${esc(c.cpp_number)}</td>
      <td style="color:var(--muted2)">${esc(c.supplier_name||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(c.po_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--amber)">${esc(c.job||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(c.cpo||'—')}</td>
      <td>${esc(c.factura||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--red)">${fmt(c.monto)}</td>
      <td style="color:var(--muted2)">${esc(c.fecha||'—')}</td>
    </tr>`).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:16px">No hay CPP pendientes de pago${val?' para ese proveedor':''}</td></tr>`;
  pagoUpdateBtnState();
}

function pagoUpdateBtnState() {
  const btn = document.getElementById('btn-pago-procesar');
  if(pagoModo !== 'proveedor') return;
  const seleccion = document.querySelectorAll('.pago-prov-chk:checked');
  btn.style.display = seleccion.length > 0 ? '' : 'none';
}

// ── Registrar el/los pagos ────────────────────────────────
async function pagoProcesar() {
  let cpp_numbers = [];
  if(pagoModo === 'cpp') {
    if(!pagoCppActual) return;
    cpp_numbers = [pagoCppActual.cpp_number];
  } else {
    document.querySelectorAll('.pago-prov-chk:checked').forEach(chk => {
      const i = parseInt(chk.dataset.idx);
      if(pagoProvPendientes[i]) cpp_numbers.push(pagoProvPendientes[i].cpp_number);
    });
  }
  if(!cpp_numbers.length) { toast('Selecciona al menos una CPP a pagar', 'er'); return; }

  const btn = document.getElementById('btn-pago-procesar');
  btn.disabled = true; btn.textContent = 'Procesando…';
  try {
    const d = await fetch('/api/pagos', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ cpp_numbers })
    }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    toast(`✓ ${d.records.length} pago(s) registrado(s)`, 'ok', 5000);
    closeMo('mo-cpp-pago');
    await loadCPP();
    await loadPagos();
  } catch(e) { toast('Error: '+e.message, 'er'); }
  finally { btn.disabled = false; btn.textContent = '✅ Procesar Pago'; }
}

// ════════════════════════════════════════════════════════
//  FINANZAS — PAGOS (lista + confirmación)
// ════════════════════════════════════════════════════════
let pagosData = [];

async function loadPagos() {
  try {
    const d = await fetch('/api/pagos').then(r=>r.json());
    pagosData = d.records || [];
    document.getElementById('pag-dot').className = 'conn-dot ok';
    document.getElementById('pag-lbl').textContent = `${pagosData.length} registros`;
    pagosRender();
  } catch(e) {
    document.getElementById('pag-dot').className = 'conn-dot er';
    document.getElementById('pag-lbl').textContent = 'Error';
  }
}

function pagosRender() {
  const q = (document.getElementById('pag-gs')?.value || '').toLowerCase();
  let rows = pagosData;
  if(q) rows = rows.filter(r =>
    (r.pago_number||'').toLowerCase().includes(q) ||
    (r.cpp_number||'').toLowerCase().includes(q) ||
    (r.pur_number||'').toLowerCase().includes(q) ||
    (r.rec_number||'').toLowerCase().includes(q) ||
    (r.po_number||'').toLowerCase().includes(q) ||
    (r.job||'').toLowerCase().includes(q) ||
    (r.cpo||'').toLowerCase().includes(q) ||
    (r.factura||'').toLowerCase().includes(q) ||
    (r.supplier_name||'').toLowerCase().includes(q));
  const fmt = v => '$'+Number(Math.abs(v)||0).toLocaleString('en-US',{minimumFractionDigits:2});
  document.getElementById('pag-tb').innerHTML = rows.map(r => `
    <tr>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-weight:700">${esc(r.pago_number)}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.cpp_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.pur_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.rec_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.po_number||'—')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--amber)">${esc(r.job||'—')}</td>
      <td style="font-family:'DM Mono',monospace">${esc(r.cpo||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--red)">${fmt(r.monto)}</td>
      <td style="color:var(--muted2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.supplier_name||'—')}</td>
      <td>${esc(r.fecha||'—')}</td>
      <td style="color:var(--muted2)">${esc(r.usuario||'—')}</td>
      <td>${r.confirmado
        ? '<span style="font-size:10px;color:var(--green);font-weight:700">✓ Confirmado</span>'
        : `<button class="btn btn-s" style="font-size:10px;padding:5px 10px" onclick="pagoConfirmar('${esc(r.pago_number)}')">Confirmar Pago</button>`}</td>
      <td><button class="fi-del" style="font-size:13px" title="Ver PDF" onclick="window.open('/api/pagos/${encodeURIComponent(r.pago_number)}/pdf','_blank')">📄</button></td>
    </tr>`).join('');
  document.getElementById('pag-count').textContent = `${rows.length} de ${pagosData.length} registros`;
}

async function pagoConfirmar(pagoNumber) {
  try {
    const d = await fetch(`/api/pagos/${encodeURIComponent(pagoNumber)}/confirmar`, { method:'POST' }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    toast(`✓ Pago ${pagoNumber} confirmado`, 'ok');
    await loadPagos();
  } catch(e) { toast('Error: '+e.message, 'er'); }
}

document.addEventListener('DOMContentLoaded', () => {
  const origSwitch4 = window.switchMenu;
  if(typeof origSwitch4 === 'function' && !window._pagosHooked) {
    window._pagosHooked = true;
    window.switchMenu = function(mod, groupId) {
      origSwitch4(mod, groupId);
      if(mod === 'fin-pagos') loadPagos();
    };
  }
});

// ════════════════════════════════════════════════════════
//  ADMIN — Contadores de Folios
// ════════════════════════════════════════════════════════
async function loadDocCounters() {
  const box = document.getElementById('counters-list');
  if(!box) return;
  try {
    const d = await fetch('/api/admin/doc-counters').then(r=>r.json());
    if(d.error) { box.textContent = d.error; return; }
    const counters = d.counters || {};
    const keys = Object.keys(counters).sort();
    box.innerHTML = keys.length
      ? keys.map(k => `<span style="background:rgba(0,0,0,.045);border:1px solid var(--border);border-radius:6px;padding:4px 10px">${esc(k)}: <b style="color:var(--gold)">${counters[k]}</b></span>`).join('')
      : '<span style="color:var(--muted)">Sin folios generados todavía</span>';
  } catch(e) { box.textContent = 'Error cargando contadores'; }
}

async function resetDocCounter() {
  const prefix = document.getElementById('counter-prefix').value.trim().toUpperCase();
  const statusEl = document.getElementById('counter-status');
  if(!prefix) { toast('Indica el prefijo a reiniciar (ej. CPO)', 'er'); return; }
  if(!confirm(`¿Reiniciar a 0 el contador de "${prefix}"?\nEl próximo folio de ese tipo será ${prefix}-0000000001.`)) return;
  try {
    const d = await fetch(`/api/admin/doc-counters/${encodeURIComponent(prefix)}/reset`, { method:'POST' }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    statusEl.textContent = `✓ Contador de ${prefix} reiniciado — el próximo folio será ${prefix}-0000000001`;
    statusEl.style.color = 'var(--green)';
    document.getElementById('counter-prefix').value = '';
    await loadDocCounters();
  } catch(e) { toast('Error: '+e.message, 'er'); }
}

// ════════════════════════════════════════════════════════
//  FINANZAS — ESQUEMAS TRIBUTARIOS
// ════════════════════════════════════════════════════════
let esqData = [];

async function loadEsquemas() {
  try {
    const d = await fetch('/api/esquemas-tributarios').then(r=>r.json());
    esqData = d.records || [];
    document.getElementById('esq-dot').className = 'conn-dot ok';
    document.getElementById('esq-lbl').textContent = `${esqData.length} registros`;
    esqRender();
  } catch(e) {
    document.getElementById('esq-dot').className = 'conn-dot er';
    document.getElementById('esq-lbl').textContent = 'Error';
  }
}

function esqRender() {
  const q = (document.getElementById('esq-gs')?.value || '').toLowerCase();
  let rows = esqData;
  if(q) rows = rows.filter(r =>
    (r.folio||'').toLowerCase().includes(q) ||
    (r.nombre||'').toLowerCase().includes(q));
  const pct = v => (v===null||v===undefined||v==='') ? '—' : `${Number(v).toLocaleString('en-US',{maximumFractionDigits:4})}%`;
  document.getElementById('esq-tb').innerHTML = rows.map(r => `
    <tr>
      <td style="font-family:'DM Mono',monospace;color:var(--gold);font-weight:700">${esc(r.folio)}</td>
      <td style="font-weight:500">${esc(r.nombre||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${pct(r.iva_trasladado)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${pct(r.isr_retenido)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${pct(r.iva_retenido)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace">${pct(r.ieps)}</td>
      <td><button class="fi-del" style="font-size:13px" title="Editar" onclick="esqOpenEdit('${esc(r.folio)}')">✎</button></td>
    </tr>`).join('');
  document.getElementById('esq-count').textContent = `${rows.length} de ${esqData.length} registros`;
}

function esqOpenNew() {
  document.getElementById('esq-modal-title').textContent = '➕ Agregar Esquema';
  document.getElementById('esq-folio').value = '';
  document.getElementById('esq-nombre').value = '';
  document.getElementById('esq-iva-trasladado').value = '';
  document.getElementById('esq-isr-retenido').value = '';
  document.getElementById('esq-iva-retenido').value = '';
  document.getElementById('esq-ieps').value = '';
  document.getElementById('mo-esq').classList.add('on');
  setTimeout(()=>document.getElementById('esq-nombre').focus(), 50);
}

function esqOpenEdit(folio) {
  const r = esqData.find(x => x.folio === folio);
  if(!r) return;
  document.getElementById('esq-modal-title').textContent = `✎ Editar ${r.folio}`;
  document.getElementById('esq-folio').value = r.folio;
  document.getElementById('esq-nombre').value = r.nombre || '';
  document.getElementById('esq-iva-trasladado').value = r.iva_trasladado ?? '';
  document.getElementById('esq-isr-retenido').value = r.isr_retenido ?? '';
  document.getElementById('esq-iva-retenido').value = r.iva_retenido ?? '';
  document.getElementById('esq-ieps').value = r.ieps ?? '';
  document.getElementById('mo-esq').classList.add('on');
}

async function esqImportarExcel(file) {
  if(!file) return;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const d = await fetch('/api/esquemas-tributarios/import', { method:'POST', body: fd }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    toast(`✓ ${d.imported} esquema(s) importado(s)`, 'ok', 4000);
    document.getElementById('esq-import-file').value = '';
    await loadEsquemas();
  } catch(e) { toast('Error: '+e.message, 'er'); }
}

async function esqGuardar() {
  const folio  = document.getElementById('esq-folio').value.trim();
  const nombre = document.getElementById('esq-nombre').value.trim();
  if(!nombre) { toast('El nombre del esquema es obligatorio', 'er'); return; }

  const body = {
    nombre,
    iva_trasladado: parseFloat(document.getElementById('esq-iva-trasladado').value || 0),
    isr_retenido:   parseFloat(document.getElementById('esq-isr-retenido').value || 0),
    iva_retenido:   parseFloat(document.getElementById('esq-iva-retenido').value || 0),
    ieps:           parseFloat(document.getElementById('esq-ieps').value || 0),
  };

  const btn = document.getElementById('btn-esq-guardar');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    const url    = folio ? `/api/esquemas-tributarios/${encodeURIComponent(folio)}` : '/api/esquemas-tributarios';
    const method = folio ? 'PUT' : 'POST';
    const d = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r=>r.json());
    if(d.error) { toast(d.error, 'er'); return; }
    toast(folio ? `✓ ${d.record.folio} actualizado` : `✓ Esquema ${d.record.folio} creado`, 'ok');
    closeMo('mo-esq');
    await loadEsquemas();
  } catch(e) { toast('Error: '+e.message, 'er'); }
  finally { btn.disabled = false; btn.textContent = 'Guardar'; }
}

document.addEventListener('DOMContentLoaded', () => {
  const origSwitch5 = window.switchMenu;
  if(typeof origSwitch5 === 'function' && !window._esqHooked) {
    window._esqHooked = true;
    window.switchMenu = function(mod, groupId) {
      origSwitch5(mod, groupId);
      if(mod === 'fin-esquemas') loadEsquemas();
    };
  }
});
