(() => {
  'use strict';
  const cfg = window.SOKA_CONFIG || {};
  const validConfig = cfg.supabaseUrl && !cfg.supabaseUrl.includes('YOUR-') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes('YOUR_');
  const client = validConfig ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  let currentUser = null;
  let isAdmin = false;
  let movies = [];
  let series = [];
  let seasons = [];
  let episodes = [];

  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const toast = (msg, error=false) => { const el=$('#toast'); el.textContent=msg; el.className='toast show '+(error?'error':''); setTimeout(()=>el.className='toast',3000); };
  const fmt = (d) => d ? new Date(d).toLocaleDateString('ar-IQ') : '';

  function card(item, type) {
    const title = esc(item.title);
    const poster = item.poster_url || 'https://placehold.co/600x900/111116/eeeeee?text=SOKA';
    return `<article class="card" onclick="location.hash='${type}:${item.id}'">
      <img loading="lazy" src="${esc(poster)}" alt="${title}">
      <div class="card-body"><h3>${title}</h3><p>${esc(item.year || '')} ${item.genre ? '• '+esc(item.genre) : ''}</p></div>
    </article>`;
  }

  async function loadContent() {
    if (!client) return;
    const [m,s] = await Promise.all([
      client.from('movies').select('*').eq('is_published', true).order('created_at',{ascending:false}),
      client.from('series').select('*').eq('is_published', true).order('created_at',{ascending:false})
    ]);
    if (m.error || s.error) { toast('تعذر تحميل المحتوى. تحقق من إعدادات Supabase وRLS.', true); return; }
    movies=m.data||[]; series=s.data||[];
    $('#movieGrid').innerHTML = movies.length ? movies.map(x=>card(x,'movie')).join('') : '<div class="empty">لا توجد أفلام منشورة بعد.</div>';
    $('#seriesGrid').innerHTML = series.length ? series.map(x=>card(x,'series')).join('') : '<div class="empty">لا توجد مسلسلات منشورة بعد.</div>';
  }

  async function checkSession() {
    if (!client) return;
    const {data:{session}} = await client.auth.getSession();
    await setUser(session?.user || null);
    client.auth.onAuthStateChange(async (_event, session) => setUser(session?.user || null));
  }

  async function setUser(user) {
    currentUser=user; isAdmin=false;
    const authNav=$('#authNav'), logout=$('#logoutBtn'), adminNav=$('#adminNav'), admin=$('#admin');
    if (!user) { authNav.classList.remove('hidden'); logout.classList.add('hidden'); adminNav.classList.add('hidden'); admin.classList.add('hidden'); return; }
    authNav.textContent='حسابي'; authNav.href='#login'; logout.classList.remove('hidden');
    const {data, error}=await client.from('profiles').select('role').eq('id',user.id).maybeSingle();
    if (!error && data?.role==='admin') { isAdmin=true; adminNav.classList.remove('hidden'); }
    if (location.hash==='#admin' && isAdmin) renderAdmin();
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); if(!client) return configError();
    const email=$('#email').value.trim(), password=$('#password').value;
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error) toast(error.message,true); else { toast('تم تسجيل الدخول'); location.hash='#home'; }
  });

  $('#signupForm').addEventListener('submit', async e => {
    e.preventDefault(); if(!client) return configError();
    const full_name=$('#signupName').value.trim(), email=$('#signupEmail').value.trim(), password=$('#signupPassword').value;
    const {error}=await client.auth.signUp({email,password,options:{data:{full_name}}});
    if(error) toast(error.message,true); else toast('تم إنشاء الحساب. قد تحتاج لتأكيد البريد الإلكتروني.');
  });

  $('#logoutBtn').addEventListener('click', async()=>{ if(client) await client.auth.signOut(); location.hash='#home'; toast('تم تسجيل الخروج'); });
  $('#searchInput').addEventListener('input', async e => {
    const q=e.target.value.trim().toLowerCase(); if(!q){$('#searchGrid').innerHTML='';return;}
    const all=[...movies.map(x=>({...x,_type:'movie'})),...series.map(x=>({...x,_type:'series'}))];
    const result=all.filter(x=>x.title.toLowerCase().includes(q));
    $('#searchGrid').innerHTML=result.length?result.map(x=>card(x,x._type)).join(''):'<div class="empty">لا توجد نتائج.</div>';
  });

  async function renderDetail(type,id) {
    if(!client) return configError();
    const table=type==='movie'?'movies':'series';
    const {data:item,error}=await client.from(table).select('*').eq('id',id).single();
    if(error){toast(error.message,true);return;}
    const poster=item.poster_url || 'https://placehold.co/600x900/111116/eeeeee?text=SOKA';
    if(type==='movie') {
      $('#detailContent').innerHTML=`<div class="detail-card"><img src="${esc(poster)}"><div><span class="badge">فيلم</span><h1>${esc(item.title)}</h1><p>${esc(item.description||'لا يوجد وصف.')}</p><p>${esc(item.year||'')} ${item.country?'• '+esc(item.country):''} ${item.genre?'• '+esc(item.genre):''}</p><button class="btn" onclick="location.hash='watch:movie:${item.id}'">▶ مشاهدة</button></div></div>`;
    } else {
      const {data: ss}=await client.from('seasons').select('*').eq('series_id',id).order('season_number');
      $('#detailContent').innerHTML=`<div class="detail-card"><img src="${esc(poster)}"><div><span class="badge">مسلسل</span><h1>${esc(item.title)}</h1><p>${esc(item.description||'لا يوجد وصف.')}</p><p>${esc(item.year||'')} ${item.country?'• '+esc(item.country):''}</p></div></div><div class="season-list">${(ss||[]).map(s=>`<div class="season"><h3>الموسم ${s.season_number}</h3><div id="season-${s.id}" class="episode-list">جاري التحميل…</div></div>`).join('')||'<div class="empty">لا توجد مواسم منشورة بعد.</div>'}</div>`;
      for(const s of (ss||[])) {
        const {data:eps}=await client.from('episodes').select('*').eq('season_id',s.id).eq('is_published',true).order('episode_number');
        const el=$('#season-'+s.id); el.innerHTML=(eps||[]).map(ep=>`<button class="episode" onclick="location.hash='watch:episode:${ep.id}'">الحلقة ${ep.episode_number} — ${esc(ep.title)}</button>`).join('')||'<div class="muted">لا توجد حلقات منشورة.</div>';
      }
    }
  }

  async function renderWatch(kind,id) {
    if(!client) return configError();
    let item, title, video;
    if(kind==='movie') { const r=await client.from('movies').select('*').eq('id',id).single(); item=r.data; title=item?.title; video=item?.video_url; }
    else { const r=await client.from('episodes').select('*,series(title)').eq('id',id).single(); item=r.data; title=item?.title; video=item?.video_url; }
    if(!item){toast('المحتوى غير موجود',true);return;}
    const player=video ? `<video controls playsinline preload="metadata" src="${esc(video)}"></video>` : `<div class="player-empty">لا يوجد رابط فيديو منشور لهذه المادة.</div>`;
    $('#watchContent').innerHTML=`<div class="watch-box"><h1>${esc(title||'المشاهدة')}</h1>${player}<p class="muted">استخدم روابط فيديو تملك حقوق بثها أو ترخيصًا لاستخدامها.</p></div>`;
  }

  async function renderAdmin() {
    if(!isAdmin){toast('هذه الصفحة للمدير فقط.',true); location.hash='#home'; return;}
    $('#admin').classList.remove('hidden');
    const counts=await Promise.all(['movies','series','seasons','episodes'].map(t=>client.from(t).select('*',{count:'exact',head:true})));
    $('#stats').innerHTML=['الأفلام','المسلسلات','المواسم','الحلقات'].map((x,i)=>`<div class="stat"><strong>${counts[i].count??0}</strong><span>${x}</span></div>`).join('');
    renderMoviesAdmin(); renderSeriesAdmin(); renderSeasonsAdmin(); renderEpisodesAdmin();
  }

  function renderMoviesAdmin(){
    $('#moviesAdmin').innerHTML=`<div class="panel"><h3>إضافة فيلم</h3><form id="movieForm" class="admin-form">
      <input name="title" required placeholder="اسم الفيلم"><textarea name="description" placeholder="الوصف"></textarea>
      <input name="poster_url" placeholder="رابط البوستر"><input name="backdrop_url" placeholder="رابط الخلفية"><input name="video_url" placeholder="رابط الفيديو المرخص">
      <div class="two"><input name="year" type="number" placeholder="السنة"><input name="genre" placeholder="النوع"></div>
      <input name="country" placeholder="الدولة"><input name="duration_minutes" type="number" placeholder="المدة بالدقائق">
      <label><input name="is_featured" type="checkbox"> مميز</label><label><input name="is_published" type="checkbox" checked> منشور</label>
      <button class="btn">إضافة الفيلم</button></form></div><div class="panel"><h3>الأفلام الحالية</h3><div class="admin-list">${movies.map(m=>`<div><b>${esc(m.title)}</b><button class="danger" onclick="deleteMovie('${m.id}')">حذف</button></div>`).join('')||'<span class="muted">لا توجد أفلام.</span>'}</div></div>`;
    $('#movieForm').addEventListener('submit',async e=>{e.preventDefault(); const f=new FormData(e.target); const o=Object.fromEntries(f.entries()); o.year=o.year?Number(o.year):null;o.duration_minutes=o.duration_minutes?Number(o.duration_minutes):null;o.is_featured=f.has('is_featured');o.is_published=f.has('is_published');const {error}=await client.from('movies').insert(o);if(error)toast(error.message,true);else{toast('تمت إضافة الفيلم');await loadContent();renderAdmin();}});
  }
  window.deleteMovie=async id=>{if(!confirm('حذف الفيلم؟'))return;const {error}=await client.from('movies').delete().eq('id',id);if(error)toast(error.message,true);else{toast('تم الحذف');await loadContent();renderAdmin();}};

  function renderSeriesAdmin(){
    $('#seriesAdmin').innerHTML=`<div class="panel"><h3>إضافة مسلسل</h3><form id="seriesForm" class="admin-form">
      <input name="title" required placeholder="اسم المسلسل"><textarea name="description" placeholder="الوصف"></textarea>
      <input name="poster_url" placeholder="رابط البوستر"><input name="backdrop_url" placeholder="رابط الخلفية"><div class="two"><input name="year" type="number" placeholder="السنة"><input name="genre" placeholder="النوع"></div><input name="country" placeholder="الدولة"><label><input name="is_featured" type="checkbox"> مميز</label><label><input name="is_published" type="checkbox" checked> منشور</label><button class="btn">إضافة المسلسل</button></form></div><div class="panel"><h3>المسلسلات الحالية</h3><div class="admin-list">${series.map(s=>`<div><b>${esc(s.title)}</b><button class="danger" onclick="deleteSeries('${s.id}')">حذف</button></div>`).join('')||'<span class="muted">لا توجد مسلسلات.</span>'}</div></div>`;
    $('#seriesForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),o=Object.fromEntries(f.entries());o.year=o.year?Number(o.year):null;o.is_featured=f.has('is_featured');o.is_published=f.has('is_published');const {error}=await client.from('series').insert(o);if(error)toast(error.message,true);else{toast('تمت إضافة المسلسل');await loadContent();renderAdmin();}});
  }
  window.deleteSeries=async id=>{if(!confirm('حذف المسلسل؟ ستُحذف مواسمه وحلقاته المرتبطة.'))return;const {error}=await client.from('series').delete().eq('id',id);if(error)toast(error.message,true);else{toast('تم الحذف');await loadContent();renderAdmin();}};

  async function renderSeasonsAdmin(){
    const {data:ss}=await client.from('seasons').select('*,series(title)').order('created_at',{ascending:false}); seasons=ss||[];
    $('#seasonsAdmin').innerHTML=`<div class="panel"><h3>إضافة موسم</h3><form id="seasonForm" class="admin-form"><select name="series_id" required>${series.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join('')}</select><input name="season_number" type="number" min="1" required placeholder="رقم الموسم"><input name="title" placeholder="اسم اختياري"><button class="btn">إضافة الموسم</button></form></div><div class="panel"><h3>المواسم الحالية</h3><div class="admin-list">${seasons.map(s=>`<div><b>${esc(s.series?.title||'')}</b> — الموسم ${s.season_number}<button class="danger" onclick="deleteSeason('${s.id}')">حذف</button></div>`).join('')||'<span class="muted">لا توجد مواسم.</span>'}</div></div>`;
    $('#seasonForm').addEventListener('submit',async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target).entries());o.season_number=Number(o.season_number);const {error}=await client.from('seasons').insert(o);if(error)toast(error.message,true);else{toast('تمت إضافة الموسم');renderAdmin();}});
  }
  window.deleteSeason=async id=>{if(!confirm('حذف الموسم؟ ستُحذف حلقاته.'))return;const {error}=await client.from('seasons').delete().eq('id',id);if(error)toast(error.message,true);else{toast('تم الحذف');renderAdmin();}};

  async function renderEpisodesAdmin(){
    const {data:ss}=await client.from('seasons').select('*,series(title)').order('series_id'); seasons=ss||[];
    const {data:eps}=await client.from('episodes').select('*,series(title),seasons(season_number)').order('created_at',{ascending:false}); episodes=eps||[];
    $('#episodesAdmin').innerHTML=`<div class="panel"><h3>إضافة حلقة</h3><form id="episodeForm" class="admin-form"><select name="series_id" id="epSeries" required>${series.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join('')}</select><select name="season_id" id="epSeason" required></select><input name="episode_number" type="number" min="1" required placeholder="رقم الحلقة"><input name="title" required placeholder="عنوان الحلقة"><textarea name="description" placeholder="الوصف"></textarea><input name="thumbnail_url" placeholder="رابط صورة الحلقة"><input name="video_url" placeholder="رابط الفيديو المرخص"><div class="two"><input name="duration_minutes" type="number" placeholder="المدة بالدقائق"><input name="quality" value="1080p" placeholder="الجودة"></div><label><input name="is_published" type="checkbox" checked> منشورة</label><button class="btn">إضافة الحلقة</button></form></div><div class="panel"><h3>الحلقات الحالية</h3><div class="admin-list">${episodes.map(e=>`<div><b>${esc(e.series?.title||'')}</b> — م${e.seasons?.season_number||''} ح${e.episode_number}: ${esc(e.title)}<button class="danger" onclick="deleteEpisode('${e.id}')">حذف</button></div>`).join('')||'<span class="muted">لا توجد حلقات.</span>'}</div></div>`;
    const updateSeasons=()=>{const sid=$('#epSeries').value;$('#epSeason').innerHTML=seasons.filter(s=>s.series_id===sid).map(s=>`<option value="${s.id}">الموسم ${s.season_number}</option>`).join('');};
    $('#epSeries').addEventListener('change',updateSeasons); updateSeasons();
    $('#episodeForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),o=Object.fromEntries(f.entries());o.episode_number=Number(o.episode_number);o.duration_minutes=o.duration_minutes?Number(o.duration_minutes):null;o.is_published=f.has('is_published');const {error}=await client.from('episodes').insert(o);if(error)toast(error.message,true);else{toast('تمت إضافة الحلقة');renderAdmin();}});
  }
  window.deleteEpisode=async id=>{if(!confirm('حذف الحلقة؟'))return;const {error}=await client.from('episodes').delete().eq('id',id);if(error)toast(error.message,true);else{toast('تم الحذف');renderAdmin();}};

  document.querySelectorAll('.admin-tabs button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.admin-tabs button').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.admin-panel').forEach(p=>p.classList.add('hidden'));btn.classList.add('active');$('#'+btn.dataset.tab).classList.remove('hidden');}));

  function configError(){toast('لم يتم إعداد Supabase بعد. عدّل config.js وأضف Project URL وPublishable/Anon Key.',true);}

  async function route(){
    const hash=location.hash||'#home';
    document.querySelectorAll('main > section').forEach(s=>{ if(s.id==='admin') return; });
    if(hash==='#admin'){ if(!isAdmin){toast('سجّل دخولك بحساب المدير أولًا.',true); location.hash='#login'; return;} renderAdmin(); return; }
    const p=hash.slice(1).split(':');
    if(p[0]==='movie'&&p[1]) { await renderDetail('movie',p[1]); return; }
    if(p[0]==='series'&&p[1]) { await renderDetail('series',p[1]); return; }
    if(p[0]==='watch'&&p[1]) { await renderWatch(p[1],p[2]); return; }
  }

  window.addEventListener('hashchange', route);
  (async()=>{ if(!client){ toast('SOKA v2 يحتاج إعداد config.js قبل الاتصال بقاعدة البيانات.',true); return; } await checkSession(); await loadContent(); await route(); })();
})();
