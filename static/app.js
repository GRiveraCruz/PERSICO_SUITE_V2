
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
function switchModule(mod,btn){
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.module').forEach(m=>m.classList.remove('on'));
  document.getElementById('mod-'+mod).classList.add('on');
  closePanel();
  if(mod==='admin') setTimeout(loadAdminUsers,100);
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
  if(!rows.length){tb.innerHTML='<tr><td colspan="9"><div class="es"><span class="ei">📋</span><br>Sin resultados</div></td></tr>';return;}
  tb.innerHTML=rows.map(j=>{
    const noMeta=!j.created_at&&!j.customer;
    const sel=jobCurrentJob?.job_number===j.job_number?' sel':'';
    return`<tr class="${noMeta?'no-meta':''}${sel}" onclick="jobOpen('${j.job_number}')">
      <td><span class="tjob">${j.job_number}</span></td>
      <td style="font-weight:600;color:#fff">${esc(j.customer||'—')}</td>
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

async function jobOpenNew(){
  const r=await apiCall('GET','/next-index');
  jobNextMain=r.next;
  document.getElementById('jn-main').value=jobNextMain;
  document.getElementById('jn-sub').value='';
  document.getElementById('jn-num').textContent=jobNextMain+'-??';
  document.getElementById('jn-lbl').textContent='Ingresa un subíndice';
  document.getElementById('jn-hint').textContent='';
  ['jn-cust','jn-desc','jn-psg','jn-rev','jn-cost','jn-po','jn-ship'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('jn-pm').value='';document.getElementById('jn-pg').value='';
  document.getElementById('mo-jnew').classList.add('on');
}

function jobUpdatePreview(){
  const raw=document.getElementById('jn-sub').value.trim();
  const hint=document.getElementById('jn-hint');
  if(!raw){document.getElementById('jn-num').textContent=jobNextMain+'-??';document.getElementById('jn-lbl').textContent='Ingresa un subíndice';hint.textContent='';hint.className='hint';return;}
  const n=parseInt(raw);const pad=String(n).padStart(2,'0');
  const valid=(n===0||n===1||(n>=2&&n<=50)||(n>=51&&n<=60)||(n>=61&&n<=97)||n===99);
  document.getElementById('jn-num').textContent=jobNextMain+'-'+pad;
  document.getElementById('jn-lbl').textContent=valid?jSubLabel(pad):'No válido';
  hint.textContent=valid?'✓ Subíndice válido':'✗ Valores válidos: 00, 01, 02–50, 51–60, 61–97, 99';
  hint.className='hint '+(valid?'ok':'bad');
}

async function jobCreate(){
  const raw=document.getElementById('jn-sub').value.trim();
  if(!raw){toast('Ingresa un subíndice','er');return;}
  const btn=document.getElementById('btn-jcreate');btn.disabled=true;btn.textContent='Creando…';
  try{
    const data={
      subindex:String(parseInt(raw)).padStart(2,'0'),
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
      '<div class="stat" style="background:rgba(39,174,96,.1);border-color:rgba(39,174,96,.3)"><div class="n" style="color:#58d68d">'+s.created+'</div><div class="l">Creados</div></div>'+
      '<div class="stat" style="background:rgba(255,255,255,.04)"><div class="n" style="color:var(--muted)">'+s.skipped+'</div><div class="l">Omitidos</div></div>'+
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
      <td style="font-weight:500;color:#fff">${esc(r.employee)}</td>
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
      '<div class="r-chip" style="background:rgba(255,255,255,.04);border:1px solid var(--border)"><div class="n" style="color:'+(d.errors?.length?'#eb5757':'var(--muted)')+'">'+( d.errors?.length||0)+'</div><div class="l">Errores</div></div>';
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
  if(!data.length){tb.innerHTML='<tr><td colspan="10"><div class="es"><span class="ei">🔍</span><br>Sin resultados</div></td></tr>';return;}
  tb.innerHTML=data.map(r=>{
    const s=qStatus(r);const sc=s==='awarded'?'q-aw':s==='client'?'q-sc':s==='mgmt'?'q-sm':'';
    return`<tr class="${sc}${r.row===quoteCurrentRow?' sel':''}${r.refused?' refused-row':''}" onclick="quoteOpen(${r.row})">
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red)">${r.qnum||'—'}</td>
      <td style="font-weight:600;color:#fff">${esc(r.customer)}</td>
      <td style="max-width:210px;overflow:hidden;text-overflow:ellipsis;color:var(--muted2)">${esc(r.desc||'—')}</td>
      <td style="font-size:11px">${qTypeLbl(r)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${esc(r.rfq||'—')}</td>
      <td>${qFmtD(r.received)}</td>
      <td>${r.done?'<span class="badge b-done">Done ✓</span>':'<span class="badge b-toappr">Pendiente</span>'}</td>
      <td>${r.sentMgmt?qFmtD(r.sentMgmt):'<span style="color:var(--muted)">—</span>'}</td>
      <td>${r.sentClient?qFmtD(r.sentClient):'<span style="color:var(--muted)">—</span>'}</td>
      <td>${r.refused
        ? '<span class="badge b-done" style="background:rgba(200,16,46,.3);color:#ff6b6b">✕ Refused</span>'
        : r.awarded && r.cpo_registered
          ? '<span class="badge b-yes" style="background:rgba(39,174,96,.25);color:#6fcf97">✓ Venta Reg.</span>'
          : r.awarded
            ? '<span class="badge b-yes">Awarded</span>'
            : '—'
      }</td>
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
  document.getElementById('qe-mc').value=r.machine||'';
  document.getElementById('qe-tl').value=r.tool||'';
  document.getElementById('qe-mt').value=r.machTool||'';
  document.getElementById('qe-rb').value=r.robotic||'';
  document.getElementById('qe-sv').value=r.service||'';
  document.getElementById('qe-dn').checked=!!r.done;
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
    machine:document.getElementById('qe-mc').value||null,tool:document.getElementById('qe-tl').value||null,
    machTool:document.getElementById('qe-mt').value||null,robotic:document.getElementById('qe-rb').value||null,
    service:document.getElementById('qe-sv').value||null,done:document.getElementById('qe-dn').checked,
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

// ════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const mods=['mo-jnew','mo-jimp','mo-rnew','mo-rimp','mo-rcopy','mo-qnew','mo-qimp','mo-pt-new','mo-pt-confirm','mo-sv-new','mo-cpo-new','mo-cpo-imp','mo-po-imp','mo-wh-imp','mo-ivp-imp','mo-fx-imp','mo-refuse','mo-award'];
    const open=mods.find(m=>document.getElementById(m).classList.contains('on'));
    if(open)closeMo(open); else if(_currentPanel)closePanel();
  }
});

// ════════════════════════════════════════════════════════
//  PURCHASE ORDERS
// ════════════════════════════════════════════════════════
let poRecords=[], poActiveYear=new Date().getFullYear(), poAvailYears=[], poImpFile=null;

const PO_EST_STYLE={
  'Recepcionada':'background:rgba(39,174,96,.15);color:#58d68d;border:1px solid rgba(39,174,96,.25)',
  'Emitida':     'background:rgba(41,128,185,.15);color:#5dade2;border:1px solid rgba(41,128,185,.25)',
  'Cancelada':   'background:rgba(200,16,46,.12);color:#e8566a;border:1px solid rgba(200,16,46,.25)',
  'Rec.Parc.':   'background:rgba(243,156,18,.12);color:#f39c12;border:1px solid rgba(243,156,18,.25)',
  'Comprada':    'background:rgba(142,68,173,.12);color:#c39bd3;border:1px solid rgba(142,68,173,.25)',
};

function poFmtDate(s){ if(!s)return'—'; try{const d=new Date(s+'T00:00:00');return d.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});}catch{return s;} }
function poFmtNum(n,dec=2){ return n==null||n===''?'—':Number(n).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}); }

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
    if(gs && !((r.clave||'')+(r.nombre||'')+(r.entregar_a||'')+(r.estatus||'')).toString().toLowerCase().includes(gs)) return false;
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
  // Totals in USD
  const totalUSD=rows.reduce((s,r)=>s+(r.subtotal_usd||r.subtotal||0),0);
  document.getElementById('po-total-mxn').textContent='$'+poFmtNum(totalUSD,2)+' USD';

  if(!rows.length){
    tb.innerHTML='<tr><td colspan="9"><div class="es"><span class="ei">🛒</span><br>Sin registros</div></td></tr>';
    return;
  }
  tb.innerHTML=rows.map(r=>{
    const isUSD=r.moneda==='USD';
    const hasFX=!isUSD && r.fx_rate_used;
    const estStyle=PO_EST_STYLE[r.estatus]||'background:rgba(255,255,255,.06);color:var(--muted)';
    const usdVal = r.subtotal_usd != null ? r.subtotal_usd : r.subtotal;
    return`<tr>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--red);font-weight:600">${r.clave}</td>
      <td style="color:var(--muted2)">${poFmtDate(r.fecha_doc)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--amber)">${esc(r.entregar_a||'—')}</td>
      <td style="max-width:230px;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:#fff" title="${esc(r.nombre)}">${esc(r.nombre||'—')}</td>
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
      '<div class="r-chip" style="background:rgba(255,255,255,.04);border:1px solid var(--border)"><div class="n" style="color:'+(d.errors?.length?'#eb5757':'var(--muted)')+'">'+( d.errors?.length||0)+'</div><div class="l">Errores</div></div>';
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
    return`<tr style="${i%2===0?'':'background:rgba(255,255,255,.018)'}">
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">${r.id||''}</td>
      <td style="font-weight:500;color:#fff;max-width:190px;overflow:hidden;text-overflow:ellipsis">${esc(r.employee)}</td>
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
      '<div class="r-chip" style="background:rgba(255,255,255,.04);border:1px solid var(--border)"><div class="n" style="color:var(--muted)">'+d.skipped+'</div><div class="l">Omitidos</div></div>'+
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
  'Emitida': 'background:rgba(41,128,185,.15);color:#5dade2;border:1px solid rgba(41,128,185,.25)',
  'Devuelta':'background:rgba(200,16,46,.12);color:#e8566a;border:1px solid rgba(200,16,46,.25)',
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
    const estStyle=IVP_EST_STYLE[r.estatus]||'background:rgba(255,255,255,.06);color:var(--muted)';
    return`<tr>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--red);font-weight:600">${r.clave}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--amber)">${esc(r.entregar_a||'—')}</td>
      <td style="max-width:230px;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:#fff" title="${esc(r.nombre)}">${esc(r.nombre||'—')}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:12px">$${(r.subtotal||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td><span class="badge" style="${isUSD?'background:rgba(41,128,185,.15);color:#5dade2;border:1px solid rgba(41,128,185,.25)':'background:rgba(39,174,96,.12);color:#58d68d;border:1px solid rgba(39,174,96,.25)'}">
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
      '<div class="r-chip" style="background:rgba(255,255,255,.04);border:1px solid var(--border)"><div class="n" style="color:'+(d.errors?.length?'#eb5757':'var(--muted)')+'">'+( d.errors?.length||0)+'</div><div class="l">Errores</div></div>';
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
    const mods=['mo-jnew','mo-jimp','mo-rnew','mo-rimp','mo-rcopy','mo-qnew','mo-qimp','mo-pt-new','mo-pt-confirm','mo-sv-new','mo-cpo-new','mo-cpo-imp','mo-po-imp','mo-wh-imp','mo-ivp-imp','mo-fx-imp','mo-refuse','mo-award'];
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
.rpt-card{border-radius:8px;padding:16px 18px;border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:4px}
.rpt-card .rc-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.55)}
.rpt-card .rc-val{font-family:'DM Mono',monospace;font-size:22px;font-weight:600;color:#fff;line-height:1}
.rpt-card .rc-sub{font-size:10px;color:rgba(255,255,255,.45);margin-top:2px}
.rpt-card-blue{background:rgba(41,128,185,.18);border-color:rgba(41,128,185,.3)}
.rpt-card-dark{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1)}
.rpt-card-gm.pos{background:rgba(39,174,96,.16);border-color:rgba(39,174,96,.35)}
.rpt-card-gm.neg{background:rgba(200,16,46,.14);border-color:rgba(200,16,46,.3)}
.rpt-td{padding:7px 10px;font-size:12px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle}
.rpt-tr:hover td{background:rgba(200,16,46,.07)!important}
.rpt-foot td{padding:8px 10px;font-size:12px;font-weight:700;background:#111;border-top:2px solid var(--red);color:#fff}
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
      j ? `<span style="color:#fff;font-weight:600">${esc(j.customer||'—')}</span><span style="color:var(--muted);font-size:10px;margin-left:8px">${esc(j.status||'')}</span>` : '<span style="color:var(--muted)">Cliente: —</span>';
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
      ? `<span style="color:#fff;font-weight:600">${esc(j.customer||'—')}</span><span style="color:var(--muted);font-size:10px;margin-left:8px">${esc(j.status||'')}</span>`
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
    document.getElementById('rpt-dot').className = 'conn-dot ok';
    document.getElementById('rpt-status').textContent = `Job ${jn} · ${new Date().toLocaleTimeString('es-MX')}`;
  }catch(e){ toast('Error al generar reporte: '+e,'er'); }
  finally{ btn.disabled = false; btn.textContent = '⚙ Generar Reporte'; }
}

function rptRender(d){
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
      <tr class="rpt-tr" style="${i%2?'background:rgba(255,255,255,.02)':''}">
        <td class="rpt-td" style="color:#fff;font-size:11px">${esc(w.employee)}</td>
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
      return `<tr class="rpt-tr" style="${i%2?'background:rgba(255,255,255,.02)':''}">
        <td class="rpt-td" style="font-family:'DM Mono',monospace;color:var(--red);font-size:11px">${p.clave}</td>
        <td class="rpt-td" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;color:#fff;font-size:11px" title="${esc(p.nombre)}">${esc(p.nombre)}</td>
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
    return`<tr style="${isWknd?'opacity:.5':''}${i%2?'background:rgba(255,255,255,.022)':''}">
      <td style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:${isWknd?'var(--muted)':'#fff'}">${r.date}</td>
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
      '<div class="r-chip" style="background:rgba(255,255,255,.04);border:1px solid var(--border)"><div class="n" style="color:var(--muted)">'+d.skipped+'</div><div class="l">N/E omitidos</div></div>'+
      '<div class="r-chip" style="background:rgba(41,128,185,.1);border:1px solid rgba(41,128,185,.25)"><div class="n" style="color:#5dade2">'+d.total_saved+'</div><div class="l" style="color:#5dade2">Total guardado</div></div>';
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
      '<div class="r-chip" style="background:rgba(255,255,255,.04);border:1px solid var(--border)"><div class="n" style="color:'+(d.errors?.length?'#eb5757':'var(--muted)')+'">'+(d.errors?.length||0)+'</div><div class="l">Omitidos</div></div>';
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
    const txt = `${r.po_number||''} ${r.job||''} ${r.customer||''} ${r.customer_supplier||''} ${r.pm||''}`.toLowerCase();
    return txt.includes(gs) && (r.job||'').toLowerCase().includes(jf);
  });
  const fmt = v => v!=null ? '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  const total = rows.reduce((s,r)=>s+(parseFloat(r.value)||0),0);
  document.getElementById('cpo-tb').innerHTML = rows.map(r=>`
    <tr class="tr-hover" onclick="cpoOpenEdit('${r.id}')">
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
      '<div class="r-chip" style="background:rgba(255,255,255,.04);border:1px solid var(--border)"><div class="n">'+d.total+'</div><div class="l">Total</div></div>';
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
    mrptRender(d);
  }catch(e){toast('Error: '+e.message,'er');}
}

function mrptRender(d){
  const fmt = v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const t   = d.totals;
  document.getElementById('mrpt-title').textContent = d.label || 'Multi-Job Report';
  // Cards
  document.getElementById('mrpt-card-rev').innerHTML =
    `<div class="rc-label">REVENUE TOTAL</div><div class="rc-val">${fmt(t.revenue)}</div><div class="rc-sub">${d.jobs.length} job(s)</div>`;
  document.getElementById('mrpt-card-wh').innerHTML =
    `<div class="rc-label">WORK HOURS COST</div><div class="rc-val">${fmt(t.amount_wh)}</div><div class="rc-sub">${Number(t.accum_hours||0).toLocaleString('en-US',{maximumFractionDigits:1})}h acumuladas</div>`;
  document.getElementById('mrpt-card-pur').innerHTML =
    `<div class="rc-label">PURCHASINGS TOTAL</div><div class="rc-val">${fmt(t.purchasing_total)}</div>`;
  const gmColor = t.gross_margin>=0?'var(--green)':'var(--red)';
  const gmPct   = t.gm_pct||0;
  document.getElementById('mrpt-card-gm').innerHTML =
    `<div class="rc-label">GROSS MARGIN</div><div class="rc-val" style="color:${gmColor}">${fmt(t.gross_margin)}</div><div class="rc-sub" style="color:${gmColor}">▲ ${gmPct}% · Cost: ${fmt(t.cost)}</div>`;
  // Table rows
  document.getElementById('mrpt-tb').innerHTML = d.jobs.map((r,i)=>`
    <tr style="background:${i%2===0?'rgba(255,255,255,.02)':'transparent'}">
      <td style="padding:8px 10px;font-family:'DM Mono',monospace;font-weight:600;color:var(--gold)">${esc(r.job_number)}</td>
      <td style="padding:8px 10px;font-size:12px">${esc(r.customer||'')}</td>
      <td style="padding:8px 10px;font-size:11px;color:var(--muted2)">${esc(r.description||'')}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:600">${fmt(r.revenue)}<br><span style="font-size:9px;color:var(--muted)">${r.revenue_source==='CPO'?'📌 CPO':''}</span></td>
      <td style="padding:8px 10px;text-align:right;color:var(--muted)">${Number(r.accum_hours||0).toLocaleString('en-US',{maximumFractionDigits:1})}h</td>
      <td style="padding:8px 10px;text-align:right">${fmt(r.amount_wh)}</td>
      <td style="padding:8px 10px;text-align:right">${fmt(r.purchasing_total)}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:600;color:${r.gross_margin>=0?'var(--green)':'var(--red)'}">${fmt(r.gross_margin)}</td>
      <td style="padding:8px 10px;text-align:right;color:${r.gm_pct>=0?'var(--green)':'var(--red)'}">${r.gm_pct}%</td>
    </tr>`).join('');
  // Footer totals
  document.getElementById('mrpt-tfoot').innerHTML = `
    <tr style="border-top:2px solid var(--red);font-weight:700">
      <td colspan="3" style="padding:10px;font-size:12px;color:var(--muted)">TOTALES</td>
      <td style="padding:10px;text-align:right">${fmt(t.revenue)}</td>
      <td style="padding:10px;text-align:right;color:var(--muted)">${Number(t.accum_hours||0).toLocaleString('en-US',{maximumFractionDigits:1})}h</td>
      <td style="padding:10px;text-align:right">${fmt(t.amount_wh)}</td>
      <td style="padding:10px;text-align:right">${fmt(t.purchasing_total)}</td>
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
      <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.03);border-radius:6px;cursor:pointer">
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
      <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.03);border-radius:6px;cursor:pointer">
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
    lbl_date_from:    "Initial Date",
    lbl_date_to:      "Final Date",
    lbl_date_recv:    "Reception Date",
    lbl_search_date:  "Search Date",
    lbl_system_status:"System Status",
    ph_search_customer:"Search customer…",
    ph_name:          "Name…",
    ph_name_id:       "Name or ID…",
    pt_confirm_title: "Confirm PT Jobs",
    pt_confirm_gen:   "Generate Report →",
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
  }
};

let LANG = 'es';

function t(key) {
  return (TRANSLATIONS[LANG] && TRANSLATIONS[LANG][key]) || TRANSLATIONS['es'][key] || key;
}

// Mapa de elementos del DOM con su clave de traducción
const LANG_MAP = [
  // Nav tabs
  { sel: 'button.nav-tab[onclick*="\'jobs\'"]',     text: 'nav_jobs',     prefix: '🗂 ' },
  { sel: 'button.nav-tab[onclick*="\'rates\'"]',    text: 'nav_rates',    prefix: '💰 ' },
  { sel: 'button.nav-tab[onclick*="\'quotes\'"]',   text: 'nav_quotes',   prefix: '📋 ' },
  { sel: 'button.nav-tab[onclick*="\'pt\'"]',       text: 'nav_pt',       prefix: '🗂 ' },
  { sel: 'button.nav-tab[onclick*="\'cpo\'"]',      text: 'nav_cpo',      prefix: '💼 ' },
  { sel: 'button.nav-tab[onclick*="\'po\'"]',       text: 'nav_po',       prefix: '🛒 ' },
  { sel: 'button.nav-tab[onclick*="\'wh\'"]',       text: 'nav_wh',       prefix: '⏱ ' },
  { sel: 'button.nav-tab[onclick*="\'ivp\'"]',      text: 'nav_ivp',      prefix: '🧾 ' },
  { sel: 'button.nav-tab[onclick*="\'report\'"]',   text: 'nav_report',   prefix: '📊 ' },
  { sel: 'button.nav-tab[onclick*="\'multirpt\'"]', text: 'nav_multirpt', prefix: '📈 ' },
  { sel: 'button.nav-tab[onclick*="\'fx\'"]',       text: 'nav_fx',       prefix: '💱 ' },
  // Module titles
  { id: 'jobs_mod_title',   text: 'jobs_title' },
  { id: 'jobs_mod_sub',     text: 'jobs_sub' },
  { id: 'pt_mod_title',     text: 'pt_title' },
  { id: 'pt_mod_sub',       text: 'pt_sub' },
  { id: 'cpo_mod_title',    text: 'cpo_title' },
  { id: 'mrpt_mod_title',   text: 'mrpt_title' },
  { id: 'fx_mod_title',     text: 'fx_title' },
];

function applyLang() {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const match = LANG_MAP.find(m => m.sel && btn.matches(m.sel));
    if (match) {
      const span = btn.querySelector('.ni');
      const icon = span ? span.textContent : '';
      btn.innerHTML = `<span class="ni">${icon}</span> ${t(match.text)}`;
    }
  });
  // Sidebar titles / subtitles usando data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // Botones por data-i18n-btn
  document.querySelectorAll('[data-i18n-btn]').forEach(el => {
    el.textContent = t(el.dataset.i18nBtn);
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  // Multi-report labels
  const mrLabel = document.querySelector('label[for-i18n="mrpt_label"]');

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
  jobs:'Job Register', rates:'Hourly Rates', quotes:'Quote Register',
  pt:'PT Numbers', cpo:'Customer POs', po:'Purchase Orders',
  wh:'Work Hours', ivp:'Invoiced POs', report:'Job Report',
  multirpt:'Multi-Job Report', fx:'Exchange Rate'
};
const ACTION_LABELS = {
  view:'Ver', create:'Crear', edit:'Editar', delete:'Eliminar', import:'Importar'
};

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
  // Ocultar tabs de módulos sin permiso view
  const tabMap = {
    jobs:'jobs', rates:'rates', quotes:'quotes', pt:'pt', cpo:'cpo',
    po:'po', wh:'wh', ivp:'ivp', report:'report', multirpt:'multirpt', fx:'fx'
  };
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const match = btn.getAttribute('onclick') || '';
    for (const [mod, key] of Object.entries(tabMap)) {
      if (match.includes(`'${mod}'`)) {
        const canView = perms[mod]?.view !== false;
        btn.style.display = canView ? '' : 'none';
      }
    }
  });
}

async function loadAdminUsers() {
  try {
    const d = await fetch('/api/admin/users').then(r=>r.json());
    if (d.error) { toast(d.error,'er'); return; }
    adminData = d;
    renderAdminUsers(d);
    mergeJobsInit();
  } catch(e) { toast('Error cargando usuarios','er'); }
}

function renderAdminUsers(d) {
  const modules = d.modules || [];
  const actions = d.actions || [];
  const users   = d.users   || {};

  const html = Object.entries(users).map(([uname, info]) => {
    const role    = info.role || 'viewer';
    const isAdmin = role === 'admin';
    const isCurrent = uname === d.current_user;
    const perms   = info.permissions || {};

    // Permission checkboxes grid
    const rows = modules.map(mod => {
      const cols = actions.map(act => {
        const checked = isAdmin ? true : (perms[mod]?.[act] ?? false);
        const disabled = isAdmin ? 'disabled' : '';
        return `<td style="text-align:center;padding:4px 6px">
          <input type="checkbox" ${checked?'checked':''} ${disabled}
            data-user="${uname}" data-mod="${mod}" data-act="${act}"
            onchange="adminTogglePerm(this)"
            style="accent-color:var(--red);width:14px;height:14px;cursor:${isAdmin?'not-allowed':'pointer'}">
        </td>`;
      }).join('');
      return `<tr style="border-bottom:1px solid rgba(255,255,255,.04)">
        <td style="padding:5px 10px;font-size:11px;color:var(--muted2);white-space:nowrap">${MODULE_LABELS[mod]||mod}</td>
        ${cols}
      </tr>`;
    }).join('');

    const actionHeaders = actions.map(a =>
      `<th style="padding:4px 6px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted);text-align:center">${ACTION_LABELS[a]||a}</th>`
    ).join('');

    return `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div style="width:36px;height:36px;border-radius:50%;background:${isAdmin?'rgba(200,16,46,.2)':'rgba(255,255,255,.08)'};display:flex;align-items:center;justify-content:center;font-size:16px">${isAdmin?'👑':'👤'}</div>
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--text)">${esc(uname)}${isCurrent?' <span style="font-size:10px;color:var(--green)">(tú)</span>':''}</div>
          <div style="font-size:11px;color:var(--muted)">${isAdmin?'Administrador':'Consulta'}</div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <label style="font-size:11px;color:var(--muted)">Rol:</label>
          <select onchange="adminChangeRole('${uname}',this.value)"
            style="background:var(--inp);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:5px 10px;font-size:12px;outline:none"
            ${uname===d.admin_user?'disabled title="Super admin no puede cambiar su propio rol"':''}>
            <option value="viewer" ${role==='viewer'?'selected':''}>Consulta</option>
            <option value="admin"  ${role==='admin' ?'selected':''}>Administrador</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="padding:4px 10px;text-align:left;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">Módulo</th>
            ${actionHeaders}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  document.getElementById('admin-users-grid').innerHTML = html || '<div style="color:var(--muted);text-align:center;padding:40px">No se encontraron usuarios</div>';
}

async function adminTogglePerm(cb) {
  const uname = cb.dataset.user;
  const mod   = cb.dataset.mod;
  const act   = cb.dataset.act;
  const val   = cb.checked;
  if (!adminData) return;
  const user  = adminData.users[uname];
  if (!user) return;
  if (!user.permissions[mod]) user.permissions[mod] = {};
  user.permissions[mod][act] = val;
  try {
    const d = await fetch(`/api/admin/users/${uname}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({role: user.role, permissions: user.permissions})
    }).then(r=>r.json());
    if (d.error) { toast(d.error,'er'); cb.checked = !val; return; }
    toast(`${uname}: ${MODULE_LABELS[mod]} → ${ACTION_LABELS[act]} ${val?'✓':'✕'}`,'ok',2000);
  } catch(e) { toast('Error guardando permiso','er'); cb.checked = !val; }
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
  return `<div id="award-job-${idx}" style="background:rgba(255,255,255,.04);border-radius:8px;padding:12px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">JOB ${idx+1}</span>
      ${idx>0?`<button onclick="document.getElementById('award-job-${idx}').remove()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">✕</button>`:''}
    </div>
    <div class="fr">
      <div class="fi"><label>Subíndice</label><input type="text" class="aj-sub" value="00" placeholder="00" style="font-family:'DM Mono',monospace;color:var(--gold)"></div>
      <div class="fi" style="flex:2"><label>Descripción</label><input type="text" class="aj-desc" value="${esc(desc)}" placeholder="Descripción del job"></div>
    </div>
    <div class="fr">
      <div class="fi"><label>PM</label><input type="text" class="aj-pm" placeholder="PM del job"></div>
      <div class="fi"><label>Notas</label><input type="text" class="aj-notes" placeholder="Opcional"></div>
    </div>
  </div>`;
}

function awardAddJob() {
  const list = document.getElementById('award-jobs-list');
  const idx  = list.children.length;
  const q    = flowQuote || {};
  list.insertAdjacentHTML('beforeend', awardJobRow(idx, q.customer||'', q.desc||''));
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
    const jobs = jobDivs.map(d => ({
      subindex:    d.querySelector('.aj-sub')?.value.trim()||'00',
      description: d.querySelector('.aj-desc')?.value.trim()||'',
      pm:          d.querySelector('.aj-pm')?.value.trim()||'',
      notes:       d.querySelector('.aj-notes')?.value.trim()||'',
      customer:    flowQuote?.customer||'',
    }));
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
