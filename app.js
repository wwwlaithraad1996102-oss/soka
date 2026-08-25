(() => {
  'use strict';

  // =========================================================
  // SOKA - Main App
  // Supabase + TVmaze Import
  // =========================================================

  const cfg = window.SOKA_CONFIG || {};

  const validConfig =
    cfg.supabaseUrl &&
    !cfg.supabaseUrl.includes('YOUR-') &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseAnonKey.includes('YOUR_');

  const client = validConfig
    ? window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabaseAnonKey
      )
    : null;

  // =========================================================
  // State
  // =========================================================

  let currentUser = null;
  let isAdmin = false;

  let movies = [];
  let series = [];
  let seasons = [];
  let episodes = [];

  // =========================================================
  // Helpers
  // =========================================================

  const $ = (selector) => document.querySelector(selector);

  const esc = (value = '') =>
    String(value).replace(
      /[&<>'"]/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[c]
    );

  const toast = (message, error = false) => {
    const el = $('#toast');

    if (!el) return;

    el.textContent = message;
    el.className = 'toast show ' + (error ? 'error' : '');

    setTimeout(() => {
      el.className = 'toast';
    }, 3500);
  };

  const fmt = (date) => {
    if (!date) return '';

    try {
      return new Date(date).toLocaleDateString('ar-IQ');
    } catch {
      return '';
    }
  };

  function configError() {
    toast(
      'لم يتم إعداد Supabase. تحقق من config.js.',
      true
    );
  }

  // =========================================================
  // Card
  // =========================================================

  function card(item, type) {
    const title = esc(item.title);

    const poster =
      item.poster_url ||
      'https://placehold.co/600x900/111116/eeeeee?text=SOKA';

    return `
      <article
        class="card"
        onclick="location.hash='${type}:${item.id}'"
      >
        <img
          loading="lazy"
          src="${esc(poster)}"
          alt="${title}"
        >

        <div class="card-body">
          <h3>${title}</h3>

          <p>
            ${esc(item.year || '')}
            ${item.genre ? ' • ' + esc(item.genre) : ''}
          </p>
        </div>
      </article>
    `;
  }

  // =========================================================
  // Load public content
  // =========================================================

  async function loadContent() {
    if (!client) return;

    const [moviesResult, seriesResult] = await Promise.all([
      client
        .from('movies')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false }),

      client
        .from('series')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
    ]);

    if (moviesResult.error || seriesResult.error) {
      console.error(
        moviesResult.error,
        seriesResult.error
      );

      toast(
        'تعذر تحميل المحتوى. تحقق من Supabase وRLS.',
        true
      );

      return;
    }

    movies = moviesResult.data || [];
    series = seriesResult.data || [];

    const movieGrid = $('#movieGrid');
    const seriesGrid = $('#seriesGrid');

    if (movieGrid) {
      movieGrid.innerHTML = movies.length
        ? movies.map((movie) => card(movie, 'movie')).join('')
        : '<div class="empty">لا توجد أفلام منشورة بعد.</div>';
    }

    if (seriesGrid) {
      seriesGrid.innerHTML = series.length
        ? series.map((item) => card(item, 'series')).join('')
        : '<div class="empty">لا توجد مسلسلات منشورة بعد.</div>';
    }
  }

  // =========================================================
  // Authentication
  // =========================================================

  async function checkSession() {
    if (!client) return;

    const {
      data: { session }
    } = await client.auth.getSession();

    await setUser(session?.user || null);

    client.auth.onAuthStateChange(
      async (_event, session) => {
        await setUser(session?.user || null);
      }
    );
  }

  async function setUser(user) {
    currentUser = user;
    isAdmin = false;

    const authNav = $('#authNav');
    const logout = $('#logoutBtn');
    const adminNav = $('#adminNav');
    const admin = $('#admin');

    if (!user) {
      if (authNav) {
        authNav.classList.remove('hidden');
        authNav.textContent = 'تسجيل الدخول';
        authNav.href = '#login';
      }

      if (logout) {
        logout.classList.add('hidden');
      }

      if (adminNav) {
        adminNav.classList.add('hidden');
      }

      if (admin) {
        admin.classList.add('hidden');
      }

      return;
    }

    if (authNav) {
      authNav.textContent = 'حسابي';
      authNav.href = '#login';
    }

    if (logout) {
      logout.classList.remove('hidden');
    }

    // -------------------------------------------------------
    // Check admin role
    // -------------------------------------------------------

    const { data, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data?.role === 'admin') {
      isAdmin = true;

      if (adminNav) {
        adminNav.classList.remove('hidden');
      }
    } else {
      if (adminNav) {
        adminNav.classList.add('hidden');
      }
    }

    if (location.hash === '#admin' && isAdmin) {
      await renderAdmin();
    }
  }

  // =========================================================
  // Login
  // =========================================================

  const loginForm = $('#loginForm');

  if (loginForm) {
    loginForm.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        if (!client) {
          configError();
          return;
        }

        const email = $('#email')?.value.trim();
        const password = $('#password')?.value;

        if (!email || !password) {
          toast(
            'أدخل البريد الإلكتروني وكلمة المرور.',
            true
          );
          return;
        }

        const { error } =
          await client.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          toast(error.message, true);
          return;
        }

        toast('تم تسجيل الدخول بنجاح.');

        location.hash = '#home';
      }
    );
  }

  // =========================================================
  // Signup
  // =========================================================

  const signupForm = $('#signupForm');

  if (signupForm) {
    signupForm.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        if (!client) {
          configError();
          return;
        }

        const full_name =
          $('#signupName')?.value.trim();

        const email =
          $('#signupEmail')?.value.trim();

        const password =
          $('#signupPassword')?.value;

        if (!full_name || !email || !password) {
          toast(
            'أكمل جميع بيانات التسجيل.',
            true
          );
          return;
        }

        const { error } =
          await client.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name
              }
            }
          });

        if (error) {
          toast(error.message, true);
          return;
        }

        toast(
          'تم إنشاء الحساب. قد تحتاج إلى تأكيد البريد الإلكتروني.'
        );
      }
    );
  }

  // =========================================================
  // Logout
  // =========================================================

  const logoutBtn = $('#logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener(
      'click',
      async () => {
        if (client) {
          await client.auth.signOut();
        }

        location.hash = '#home';

        toast('تم تسجيل الخروج.');
      }
    );
  }

  // =========================================================
  // Search
  // =========================================================

  const searchInput = $('#searchInput');

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      async (event) => {
        const q =
          event.target.value
            .trim()
            .toLowerCase();

        const searchGrid = $('#searchGrid');

        if (!searchGrid) return;

        if (!q) {
          searchGrid.innerHTML = '';
          return;
        }

        const all = [
          ...movies.map((item) => ({
            ...item,
            _type: 'movie'
          })),

          ...series.map((item) => ({
            ...item,
            _type: 'series'
          }))
        ];

        const result = all.filter((item) =>
          String(item.title || '')
            .toLowerCase()
            .includes(q)
        );

        searchGrid.innerHTML = result.length
          ? result
              .map((item) =>
                card(item, item._type)
              )
              .join('')
          : '<div class="empty">لا توجد نتائج.</div>';
      }
    );
  }

  // =========================================================
  // Movie / Series Details
  // =========================================================

  async function renderDetail(type, id) {
    if (!client) {
      configError();
      return;
    }

    const table =
      type === 'movie'
        ? 'movies'
        : 'series';

    const { data: item, error } =
      await client
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

    if (error || !item) {
      toast(
        'تعذر العثور على المحتوى.',
        true
      );
      return;
    }

    const poster =
      item.poster_url ||
      'https://placehold.co/600x900/111116/eeeeee?text=SOKA';

    const detailContent =
      $('#detailContent');

    if (!detailContent) return;

    // -------------------------------------------------------
    // Movie
    // -------------------------------------------------------

    if (type === 'movie') {
      detailContent.innerHTML = `
        <div class="detail-card">

          <img
            src="${esc(poster)}"
            alt="${esc(item.title)}"
          >

          <div>
            <span class="badge">
              فيلم
            </span>

            <h1>
              ${esc(item.title)}
            </h1>

            <p>
              ${esc(
                item.description ||
                'لا يوجد وصف.'
              )}
            </p>

            <p>
              ${esc(item.year || '')}

              ${
                item.country
                  ? ' • ' +
                    esc(item.country)
                  : ''
              }

              ${
                item.genre
                  ? ' • ' +
                    esc(item.genre)
                  : ''
              }
            </p>

            <button
              class="btn"
              onclick="location.hash='watch:movie:${item.id}'"
            >
              ▶ مشاهدة
            </button>
          </div>

        </div>
      `;

      return;
    }

    // -------------------------------------------------------
    // Series
    // -------------------------------------------------------

    const { data: ss } =
      await client
        .from('seasons')
        .select('*')
        .eq('series_id', id)
        .order('season_number');

    detailContent.innerHTML = `
      <div class="detail-card">

        <img
          src="${esc(poster)}"
          alt="${esc(item.title)}"
        >

        <div>

          <span class="badge">
            مسلسل
          </span>

          <h1>
            ${esc(item.title)}
          </h1>

          <p>
            ${esc(
              item.description ||
              'لا يوجد وصف.'
            )}
          </p>

          <p>
            ${esc(item.year || '')}

            ${
              item.country
                ? ' • ' +
                  esc(item.country)
                : ''
            }
          </p>

        </div>

      </div>

      <div class="season-list">

        ${
          (ss || [])
            .map(
              (season) => `
                <div class="season">

                  <h3>
                    الموسم
                    ${season.season_number}
                  </h3>

                  <div
                    id="season-${season.id}"
                    class="episode-list"
                  >
                    جاري تحميل الحلقات…
                  </div>

                </div>
              `
            )
            .join('') ||
          `
            <div class="empty">
              لا توجد مواسم منشورة بعد.
            </div>
          `
        }

      </div>
    `;

    // -------------------------------------------------------
    // Load episodes
    // -------------------------------------------------------

    for (const season of ss || []) {
      const { data: eps } =
        await client
          .from('episodes')
          .select('*')
          .eq('season_id', season.id)
          .eq('is_published', true)
          .order('episode_number');

      const el =
        $(`#season-${season.id}`);

      if (!el) continue;

      el.innerHTML =
        (eps || [])
          .map(
            (ep) => `
              <button
                class="episode"
                onclick="location.hash='watch:episode:${ep.id}'"
              >
                الحلقة
                ${ep.episode_number}
                —
                ${esc(ep.title)}
              </button>
            `
          )
          .join('') ||
        `
          <div class="muted">
            لا توجد حلقات منشورة.
          </div>
        `;
    }
  }

  // =========================================================
  // Watch
  // =========================================================

  async function renderWatch(kind, id) {
    if (!client) {
      configError();
      return;
    }

    let item = null;
    let title = '';
    let video = '';

    if (kind === 'movie') {
      const result =
        await client
          .from('movies')
          .select('*')
          .eq('id', id)
          .single();

      item = result.data;
      title = item?.title;
      video = item?.video_url;
    } else {
      const result =
        await client
          .from('episodes')
          .select(
            '*,series(title)'
          )
          .eq('id', id)
          .single();

      item = result.data;
      title = item?.title;
      video = item?.video_url;
    }

    if (!item) {
      toast(
        'المحتوى غير موجود.',
        true
      );
      return;
    }

    const watchContent =
      $('#watchContent');

    if (!watchContent) return;

    const player = video
      ? `
        <video
          controls
          playsinline
          preload="metadata"
          src="${esc(video)}"
        ></video>
      `
      : `
        <div class="player-empty">
          لا يوجد رابط فيديو منشور لهذه المادة.
        </div>
      `;

    watchContent.innerHTML = `
      <div class="watch-box">

        <h1>
          ${esc(title || 'المشاهدة')}
        </h1>

        ${player}

        <p class="muted">
          استخدم روابط فيديو تملك حقوق بثها
          أو ترخيصًا لاستخدامها.
        </p>

      </div>
    `;
  }

  // =========================================================
  // ADMIN
  // =========================================================

  async function renderAdmin() {
    if (!isAdmin) {
      toast(
        'هذه الصفحة للمدير فقط.',
        true
      );

      location.hash = '#home';
      return;
    }

    const admin = $('#admin');

    if (admin) {
      admin.classList.remove('hidden');
    }

    // -------------------------------------------------------
    // Statistics
    // -------------------------------------------------------

    const counts =
      await Promise.all(
        [
          'movies',
          'series',
          'seasons',
          'episodes'
        ].map((table) =>
          client
            .from(table)
            .select('*', {
              count: 'exact',
              head: true
            })
        )
      );

    const stats = $('#stats');

    if (stats) {
      stats.innerHTML =
        [
          'الأفلام',
          'المسلسلات',
          'المواسم',
          'الحلقات'
        ]
          .map(
            (label, index) => `
              <div class="stat">

                <strong>
                  ${counts[index].count ?? 0}
                </strong>

                <span>
                  ${label}
                </span>

              </div>
            `
          )
          .join('');
    }

    await renderMoviesAdmin();
    await renderSeriesAdmin();
    await renderSeasonsAdmin();
    await renderEpisodesAdmin();

    // إضافة قسم TVmaze
    renderTVmazeImport();
  }

  // =========================================================
  // TVmaze Import UI
  // =========================================================

  function renderTVmazeImport() {
    const container =
      $('#moviesAdmin');

    if (!container) return;

    // لا نكرر القسم إذا كان موجودًا
    if ($('#tvmazeImportPanel')) return;

    const panel =
      document.createElement('div');

    panel.id = 'tvmazeImportPanel';
    panel.className = 'panel';

    panel.innerHTML = `
      <h3>
        🤖 استيراد مسلسل تلقائيًا من TVmaze
      </h3>

      <p class="muted">
        اكتب اسم المسلسل، وسيتم إرسال الطلب
        إلى دالة tvmaze-import في Supabase.
      </p>

      <form
        id="tvmazeImportForm"
        class="admin-form"
      >

        <input
          id="tvmazeQuery"
          name="query"
          type="text"
          required
          placeholder="مثال: Breaking Bad"
        >

        <button
          id="tvmazeImportButton"
          class="btn"
          type="submit"
        >
          📥 استيراد المسلسل
        </button>

      </form>

      <div
        id="tvmazeResult"
        class="muted"
        style="margin-top:12px"
      ></div>
    `;

    container.prepend(panel);

    const form =
      $('#tvmazeImportForm');

    if (!form) return;

    form.addEventListener(
      'submit',
      handleTVmazeImport
    );
  }

  // =========================================================
  // Call Supabase Edge Function
  // =========================================================

  async function handleTVmazeImport(event) {
    event.preventDefault();

    if (!client) {
      configError();
      return;
    }

    if (!currentUser) {
      toast(
        'يجب تسجيل الدخول أولًا.',
        true
      );
      return;
    }

    if (!isAdmin) {
      toast(
        'ليس لديك صلاحية المدير.',
        true
      );
      return;
    }

    const input =
      $('#tvmazeQuery');

    const button =
      $('#tvmazeImportButton');

    const result =
      $('#tvmazeResult');

    const query =
      input?.value.trim();

    if (!query) {
      toast(
        'اكتب اسم المسلسل أولًا.',
        true
      );
      return;
    }

    // -------------------------------------------------------
    // Loading
    // -------------------------------------------------------

    if (button) {
      button.disabled = true;
      button.textContent =
        '⏳ جاري الاستيراد…';
    }

    if (result) {
      result.textContent =
        'جاري البحث في TVmaze وإضافة البيانات…';
    }

    try {
      // -----------------------------------------------------
      // Call Edge Function
      // -----------------------------------------------------

      const { data, error } =
        await client.functions.invoke(
          'tvmaze-import',
          {
            body: {
              query: query
            }
          }
        );

      if (error) {
        console.error(
          'TVmaze import error:',
          error
        );

        throw new Error(
          error.message ||
          'فشل الاتصال بدالة TVmaze.'
        );
      }

      console.log(
        'TVmaze response:',
        data
      );

      // -----------------------------------------------------
      // Success
      // -----------------------------------------------------

      let message =
        'تم الاستيراد بنجاح.';

      if (data?.message) {
        message = data.message;
      }

      if (data?.title) {
        message =
          `تم استيراد "${data.title}" بنجاح.`;
      }

      if (data?.series?.title) {
        message =
          `تم استيراد "${data.series.title}" بنجاح.`;
      }

      toast(message);

      if (result) {
        result.innerHTML = `
          <div>
            ✅ ${esc(message)}
          </div>

          ${
            data?.episodes
              ? `
                <div>
                  عدد الحلقات:
                  ${esc(data.episodes)}
                </div>
              `
              : ''
          }
        `;
      }

      // إعادة تحميل المحتوى
      await loadContent();

      // إعادة بناء لوحة التحكم
      await renderAdmin();

      // إعادة التركيز على حقل البحث
      setTimeout(() => {
        const inputAgain =
          $('#tvmazeQuery');

        if (inputAgain) {
          inputAgain.value = '';
        }
      }, 100);

    } catch (error) {
      console.error(error);

      const message =
        error?.message ||
        'حدث خطأ أثناء الاستيراد.';

      toast(message, true);

      if (result) {
        result.innerHTML = `
          <div>
            ❌ ${esc(message)}
          </div>
        `;
      }

    } finally {
      if (button) {
        button.disabled = false;
        button.textContent =
          '📥 استيراد المسلسل';
      }
    }
  }

  // =========================================================
  // Movies Admin
  // =========================================================

  async function renderMoviesAdmin() {
    const container =
      $('#moviesAdmin');

    if (!container) return;

    container.innerHTML = `
      <div class="panel">

        <h3>
          ➕ إضافة فيلم
        </h3>

        <form
          id="movieForm"
          class="admin-form"
        >

          <input
            name="title"
            required
            placeholder="اسم الفيلم"
          >

          <textarea
            name="description"
            placeholder="الوصف"
          ></textarea>

          <input
            name="poster_url"
            placeholder="رابط البوستر"
          >

          <input
            name="backdrop_url"
            placeholder="رابط الخلفية"
          >

          <input
            name="video_url"
            placeholder="رابط الفيديو المرخص"
          >

          <div class="two">

            <input
              name="year"
              type="number"
              placeholder="السنة"
            >

            <input
              name="genre"
              placeholder="النوع"
            >

          </div>

          <input
            name="country"
            placeholder="الدولة"
          >

          <input
            name="duration_minutes"
            type="number"
            placeholder="المدة بالدقائق"
          >

          <label>
            <input
              name="is_featured"
              type="checkbox"
            >
            مميز
          </label>

          <label>
            <input
              name="is_published"
              type="checkbox"
              checked
            >
            منشور
          </label>

          <button
            class="btn"
            type="submit"
          >
            إضافة الفيلم
          </button>

        </form>

      </div>

      <div class="panel">

        <h3>
          🎬 الأفلام الحالية
        </h3>

        <div class="admin-list">

          ${
            movies
              .map(
                (movie) => `
                  <div>

                    <b>
                      ${esc(movie.title)}
                    </b>

                    <button
                      class="danger"
                      onclick="deleteMovie('${movie.id}')"
                    >
                      حذف
                    </button>

                  </div>
                `
              )
              .join('') ||
            `
              <span class="muted">
                لا توجد أفلام.
              </span>
            `
          }

        </div>

      </div>
    `;

    // -------------------------------------------------------
    // TVmaze import panel
    // -------------------------------------------------------

    renderTVmazeImport();

    const form =
      $('#movieForm');

    if (!form) return;

    form.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const formData =
          new FormData(event.target);

        const object =
          Object.fromEntries(
            formData.entries()
          );

        object.year =
          object.year
            ? Number(object.year)
            : null;

        object.duration_minutes =
          object.duration_minutes
            ? Number(
                object.duration_minutes
              )
            : null;

        object.is_featured =
          formData.has(
            'is_featured'
          );

        object.is_published =
          formData.has(
            'is_published'
          );

        const { error } =
          await client
            .from('movies')
            .insert(object);

        if (error) {
          toast(
            error.message,
            true
          );

          return;
        }

        toast(
          'تمت إضافة الفيلم.'
        );

        await loadContent();
        await renderAdmin();
      }
    );
  }

  // =========================================================
  // Delete Movie
  // =========================================================

  window.deleteMovie =
    async function (id) {
      if (
        !confirm(
          'هل تريد حذف الفيلم؟'
        )
      ) {
        return;
      }

      const { error } =
        await client
          .from('movies')
          .delete()
          .eq('id', id);

      if (error) {
        toast(
          error.message,
          true
        );
        return;
      }

      toast(
        'تم حذف الفيلم.'
      );

      await loadContent();
      await renderAdmin();
    };

  // =========================================================
  // Series Admin
  // =========================================================

  async function renderSeriesAdmin() {
    const container =
      $('#seriesAdmin');

    if (!container) return;

    container.innerHTML = `
      <div class="panel">

        <h3>
          ➕ إضافة مسلسل
        </h3>

        <form
          id="seriesForm"
          class="admin-form"
        >

          <input
            name="title"
            required
            placeholder="اسم المسلسل"
          >

          <textarea
            name="description"
            placeholder="الوصف"
          ></textarea>

          <input
            name="poster_url"
            placeholder="رابط البوستر"
          >

          <input
            name="backdrop_url"
            placeholder="رابط الخلفية"
          >

          <div class="two">

            <input
              name="year"
              type="number"
              placeholder="السنة"
            >

            <input
              name="genre"
              placeholder="النوع"
            >

          </div>

          <input
            name="country"
            placeholder="الدولة"
          >

          <label>
            <input
              name="is_featured"
              type="checkbox"
            >
            مميز
          </label>

          <label>
            <input
              name="is_published"
              type="checkbox"
              checked
            >
            منشور
          </label>

          <button
            class="btn"
            type="submit"
          >
            إضافة المسلسل
          </button>

        </form>

      </div>

      <div class="panel">

        <h3>
          📺 المسلسلات الحالية
        </h3>

        <div class="admin-list">

          ${
            series
              .map(
                (item) => `
                  <div>

                    <b>
                      ${esc(item.title)}
                    </b>

                    <button
                      class="danger"
                      onclick="deleteSeries('${item.id}')"
                    >
                      حذف
                    </button>

                  </div>
                `
              )
              .join('') ||
            `
              <span class="muted">
                لا توجد مسلسلات.
              </span>
            `
          }

        </div>

      </div>
    `;

    const form =
      $('#seriesForm');

    if (!form) return;

    form.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const formData =
          new FormData(event.target);

        const object =
          Object.fromEntries(
            formData.entries()
          );

        object.year =
          object.year
            ? Number(object.year)
            : null;

        object.is_featured =
          formData.has(
            'is_featured'
          );

        object.is_published =
          formData.has(
            'is_published'
          );

        const { error } =
          await client
            .from('series')
            .insert(object);

        if (error) {
          toast(
            error.message,
            true
          );
          return;
        }

        toast(
          'تمت إضافة المسلسل.'
        );

        await loadContent();
        await renderAdmin();
      }
    );
  }

  // =========================================================
  // Delete Series
  // =========================================================

  window.deleteSeries =
    async function (id) {
      if (
        !confirm(
          'حذف المسلسل؟ ستُحذف مواسمه وحلقاته المرتبطة إذا كانت العلاقات في قاعدة البيانات مضبوطة للحذف المتسلسل.'
        )
      ) {
        return;
      }

      const { error } =
        await client
          .from('series')
          .delete()
          .eq('id', id);

      if (error) {
        toast(
          error.message,
          true
        );
        return;
      }

      toast(
        'تم حذف المسلسل.'
      );

      await loadContent();
      await renderAdmin();
    };

  // =========================================================
  // Seasons Admin
  // =========================================================

  async function renderSeasonsAdmin() {
    const container =
      $('#seasonsAdmin');

    if (!container) return;

    const { data, error } =
      await client
        .from('seasons')
        .select(
          '*,series(title)'
        )
        .order(
          'created_at',
          { ascending: false }
        );

    if (error) {
      toast(
        error.message,
        true
      );
      return;
    }

    seasons = data || [];

    container.innerHTML = `
      <div class="panel">

        <h3>
          ➕ إضافة موسم
        </h3>

        <form
          id="seasonForm"
          class="admin-form"
        >

          <select
            name="series_id"
            required
          >

            ${
              series
                .map(
                  (item) => `
                    <option
                      value="${item.id}"
                    >
                      ${esc(item.title)}
                    </option>
                  `
                )
                .join('')
            }

          </select>

          <input
            name="season_number"
            type="number"
            min="1"
            required
            placeholder="رقم الموسم"
          >

          <input
            name="title"
            placeholder="اسم اختياري"
          >

          <button
            class="btn"
            type="submit"
          >
            إضافة الموسم
          </button>

        </form>

      </div>

      <div class="panel">

        <h3>
          المواسم الحالية
        </h3>

        <div class="admin