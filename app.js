(() => {
  'use strict';

  // =========================================================
  // SOKA v2 — app.js
  // Supabase + Auth + Admin + Movies + Series + Episodes
  // + TVmaze Importer
  // =========================================================

  const cfg = window.SOKA_CONFIG || {};

  const validConfig =
    cfg.supabaseUrl &&
    !cfg.supabaseUrl.includes('YOUR-') &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseAnonKey.includes('YOUR_');

  const client =
    validConfig && window.supabase
      ? window.supabase.createClient(
          cfg.supabaseUrl,
          cfg.supabaseAnonKey
        )
      : null;

  let currentUser = null;
  let isAdmin = false;

  let movies = [];
  let series = [];
  let seasons = [];
  let episodes = [];

  // =========================================================
  // Helpers
  // =========================================================

  const $ = selector => document.querySelector(selector);

  const $$ = selector =>
    Array.from(document.querySelectorAll(selector));

  const esc = (value = '') =>
    String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));

  function toast(message, error = false) {
    const el = $('#toast');

    if (!el) {
      alert(message);
      return;
    }

    el.textContent = message;
    el.className = 'toast show ' + (error ? 'error' : '');

    setTimeout(() => {
      el.className = 'toast';
    }, 3000);
  }

  function configError() {
    toast(
      'لم يتم إعداد Supabase بعد. تحقق من config.js وأضف Project URL و Publishable/Anon Key.',
      true
    );
  }

  function showOnlySection(id) {
    $$('main > section').forEach(section => {
      if (section.id === 'admin') {
        section.classList.add('hidden');
        return;
      }

      if (section.id === id) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    });
  }

  function showNormalSections() {
    $$('main > section').forEach(section => {
      if (section.id !== 'admin') {
        section.classList.remove('hidden');
      }
    });
  }

  // =========================================================
  // Content Cards
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
            ${
              item.genre
                ? ' • ' + esc(item.genre)
                : ''
            }
          </p>
        </div>
      </article>
    `;
  }

  // =========================================================
  // Load Movies / Series
  // =========================================================

  async function loadContent() {
    if (!client) {
      configError();
      return;
    }

    try {
      const [moviesResult, seriesResult] =
        await Promise.all([
          client
            .from('movies')
            .select('*')
            .eq('is_published', true)
            .order('created_at', {
              ascending: false
            }),

          client
            .from('series')
            .select('*')
            .eq('is_published', true)
            .order('created_at', {
              ascending: false
            })
        ]);

      if (
        moviesResult.error ||
        seriesResult.error
      ) {
        console.error(
          moviesResult.error,
          seriesResult.error
        );

        toast(
          'تعذر تحميل المحتوى. تحقق من Supabase و RLS.',
          true
        );

        return;
      }

      movies = moviesResult.data || [];
      series = seriesResult.data || [];

      const movieGrid = $('#movieGrid');
      const seriesGrid = $('#seriesGrid');

      if (movieGrid) {
        movieGrid.innerHTML =
          movies.length
            ? movies
                .map(movie =>
                  card(movie, 'movie')
                )
                .join('')
            : `
              <div class="empty">
                لا توجد أفلام منشورة بعد.
              </div>
            `;
      }

      if (seriesGrid) {
        seriesGrid.innerHTML =
          series.length
            ? series
                .map(show =>
                  card(show, 'series')
                )
                .join('')
            : `
              <div class="empty">
                لا توجد مسلسلات منشورة بعد.
              </div>
            `;
      }

    } catch (error) {
      console.error(error);

      toast(
        'حدث خطأ أثناء تحميل المحتوى.',
        true
      );
    }
  }

  // =========================================================
  // Authentication
  // =========================================================

  async function checkSession() {
    if (!client) {
      configError();
      return;
    }

    try {
      const {
        data,
        error
      } = await client.auth.getSession();

      if (error) {
        console.error(error);
        return;
      }

      await setUser(
        data?.session?.user || null
      );

      client.auth.onAuthStateChange(
        async (_event, session) => {
          await setUser(
            session?.user || null
          );
        }
      );

    } catch (error) {
      console.error(error);
    }
  }

  async function setUser(user) {
    currentUser = user;
    isAdmin = false;

    const authNav = $('#authNav');
    const logoutBtn = $('#logoutBtn');
    const adminNav = $('#adminNav');
    const admin = $('#admin');

    if (!user) {
      authNav?.classList.remove('hidden');
      logoutBtn?.classList.add('hidden');
      adminNav?.classList.add('hidden');
      admin?.classList.add('hidden');

      return;
    }

    if (authNav) {
      authNav.textContent = 'حسابي';
      authNav.href = '#login';
    }

    logoutBtn?.classList.remove('hidden');

    try {
      const {
        data,
        error
      } = await client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error(
          'Profile error:',
          error
        );
      }

      if (data?.role === 'admin') {
        isAdmin = true;
        adminNav?.classList.remove('hidden');
      }

    } catch (error) {
      console.error(error);
    }
  }

  // =========================================================
  // Login
  // =========================================================

  async function loginUser(event) {
    event.preventDefault();

    if (!client) {
      configError();
      return;
    }

    const email =
      $('#email')?.value.trim();

    const password =
      $('#password')?.value;

    if (!email || !password) {
      toast(
        'أدخل البريد الإلكتروني وكلمة المرور.',
        true
      );

      return;
    }

    try {
      const {
        data,
        error
      } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error(error);
        toast(
          error.message,
          true
        );

        return;
      }

      await setUser(
        data?.user || null
      );

      toast(
        'تم تسجيل الدخول بنجاح.'
      );

      location.hash = '#home';

    } catch (error) {
      console.error(error);

      toast(
        'حدث خطأ أثناء تسجيل الدخول.',
        true
      );
    }
  }

  // =========================================================
  // Signup
  // =========================================================

  async function signupUser(event) {
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
        'املأ جميع الحقول.',
        true
      );

      return;
    }

    try {
      const {
        data,
        error
      } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name
          }
        }
      });

      if (error) {
        console.error(error);

        toast(
          error.message,
          true
        );

        return;
      }

      if (data?.session) {
        await setUser(
          data.user
        );

        toast(
          'تم إنشاء الحساب بنجاح.'
        );

        location.hash = '#home';

      } else {
        toast(
          'تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا طلب منك ذلك.'
        );
      }

    } catch (error) {
      console.error(error);

      toast(
        'حدث خطأ أثناء إنشاء الحساب.',
        true
      );
    }
  }

  // =========================================================
  // Logout
  // =========================================================

  async function logoutUser() {
    if (!client) return;

    try {
      const {
        error
      } = await client.auth.signOut();

      if (error) {
        toast(
          error.message,
          true
        );

        return;
      }

      currentUser = null;
      isAdmin = false;

      location.hash = '#home';

      toast(
        'تم تسجيل الخروج.'
      );

    } catch (error) {
      console.error(error);

      toast(
        'حدث خطأ أثناء تسجيل الخروج.',
        true
      );
    }
  }

  // =========================================================
  // Search
  // =========================================================

  function setupSearch() {
    const input =
      $('#searchInput');

    if (!input) return;

    input.addEventListener(
      'input',
      event => {
        const q =
          event.target.value
            .trim()
            .toLowerCase();

        const grid =
          $('#searchGrid');

        if (!grid) return;

        if (!q) {
          grid.innerHTML = '';
          return;
        }

        const all = [
          ...movies.map(item => ({
            ...item,
            _type: 'movie'
          })),

          ...series.map(item => ({
            ...item,
            _type: 'series'
          }))
        ];

        const results =
          all.filter(item =>
            String(item.title || '')
              .toLowerCase()
              .includes(q)
          );

        grid.innerHTML =
          results.length
            ? results
                .map(item =>
                  card(
                    item,
                    item._type
                  )
                )
                .join('')
            : `
              <div class="empty">
                لا توجد نتائج.
              </div>
            `;
      }
    );
  }

  // =========================================================
  // Movie / Series Detail
  // =========================================================

  async function renderDetail(type, id) {
    if (!client) {
      configError();
      return;
    }

    try {
      const table =
        type === 'movie'
          ? 'movies'
          : 'series';

      const {
        data: item,
        error
      } = await client
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !item) {
        toast(
          'المحتوى غير موجود.',
          true
        );

        return;
      }

      showOnlySection('detail');

      const poster =
        item.poster_url ||
        'https://placehold.co/600x900/111116/eeeeee?text=SOKA';

      if (type === 'movie') {

        $('#detailContent').innerHTML = `
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

      const {
        data: ss,
        error: seasonError
      } = await client
        .from('seasons')
        .select('*')
        .eq('series_id', id)
        .order('season_number');

      if (seasonError) {
        console.error(seasonError);
      }

      $('#detailContent').innerHTML = `
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
              .map(season => `
                <div class="season">

                  <h3>
                    الموسم
                    ${esc(
                      season.season_number
                    )}
                  </h3>

                  <div
                    id="season-${season.id}"
                    class="episode-list"
                  >
                    جاري التحميل…
                  </div>

                </div>
              `)
              .join('')
              ||
              `
                <div class="empty">
                  لا توجد مواسم منشورة بعد.
                </div>
              `
          }

        </div>
      `;

      for (const season of ss || []) {

        const {
          data: eps,
          error: episodeError
        } = await client
          .from('episodes')
          .select('*')
          .eq(
            'season_id',
            season.id
          )
          .eq(
            'is_published',
            true
          )
          .order(
            'episode_number'
          );

        if (episodeError) {
          console.error(
            episodeError
          );
        }

        const el =
          $('#season-' + season.id);

        if (!el) continue;

        el.innerHTML =
          (eps || [])
            .map(ep => `
              <button
                class="episode"
                onclick="location.hash='watch:episode:${ep.id}'"
              >
                الحلقة
                ${esc(
                  ep.episode_number
                )}
                —
                ${esc(ep.title)}
              </button>
            `)
            .join('')
            ||
            `
              <div class="muted">
                لا توجد حلقات منشورة.
              </div>
            `;
      }

    } catch (error) {
      console.error(error);

      toast(
        'حدث خطأ أثناء فتح المحتوى.',
        true
      );
    }
  }

  // =========================================================
  // Watch
  // =========================================================

  async function renderWatch(
    kind,
    id
  ) {
    if (!client) {
      configError();
      return;
    }

    try {
      let result;

      if (kind === 'movie') {

        result =
          await client
            .from('movies')
            .select('*')
            .eq('id', id)
            .eq(
              'is_published',
              true
            )
            .single();

      } else {

        result =
          await client
            .from('episodes')
            .select('*')
            .eq('id', id)
            .eq(
              'is_published',
              true
            )
            .single();
      }

      const item =
        result.data;

      if (
        result.error ||
        !item
      ) {
        toast(
          'المحتوى غير موجود أو غير منشور.',
          true
        );

        return;
      }

      showOnlySection('watch');

      const video =
        item.video_url || '';

      const player =
        video
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

      $('#watchContent').innerHTML = `
        <div class="watch-box">

          <h1>
            ${esc(
              item.title ||
              'المشاهدة'
            )}
          </h1>

          ${player}

          <p class="muted">
            استخدم فقط روابط فيديو تملك حقوق بثها
            أو ترخيصًا لاستخدامها.
          </p>

        </div>
      `;

    } catch (error) {
      console.error(error);

      toast(
        'حدث خطأ أثناء تشغيل المحتوى.',
        true
      );
    }
  }

  // =========================================================
  // Admin
  // =========================================================

  async function renderAdmin() {
    if (!isAdmin) {
      toast(
        'هذه الصفحة للمدير فقط.',
        true
      );

      location.hash = '#login';

      return;
    }

    showOnlySection('admin');

    $('#admin')?.classList.remove(
      'hidden'
    );

    try {

      const tables = [
        'movies',
        'series',
        'seasons',
        'episodes'
      ];

      const counts =
        await Promise.all(
          tables.map(table =>
            client
              .from(table)
              .select(
                '*',
                {
                  count: 'exact',
                  head: true
                }
              )
          )
        );

      const labels = [
        'الأفلام',
        'المسلسلات',
        'المواسم',
        'الحلقات'
      ];

      const stats =
        $('#stats');

      if (stats) {
        stats.innerHTML =
          labels
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

      addTVmazePanel();

    } catch (error) {
      console.error(error);

      toast(
        'تعذر تحميل لوحة التحكم.',
        true
      );
    }
  }

  // =========================================================
  // Admin — Movies
  // =========================================================

  async function renderMoviesAdmin() {

    const container =
      $('#moviesAdmin');

    if (!container) return;

    container.innerHTML = `
      <div class="panel">

        <h3>
          إضافة فيلم
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
          الأفلام الحالية
        </h3>

        <div class="admin-list">

          ${
            movies
              .map(movie => `
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
              `)
              .join('')
              ||
              `
                <span class="muted">
                  لا توجد أفلام.
                </span>
              `
          }

        </div>

      </div>
    `;

    const form =
      $('#movieForm');

    if (!form) return;

    form.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        const formData =
          new FormData(
            event.target
          );

        const data =
          Object.fromEntries(
            formData.entries()
          );

        data.year =
          data.year
            ? Number(data.year)
            : null;

        data.duration_minutes =
          data.duration_minutes
            ? Number(
                data.duration_minutes
              )
            : null;

        data.is_featured =
          formData.has(
            'is_featured'
          );

        data.is_published =
          formData.has(
            'is_published'
          );

        try {

          const {
            error
          } = await client
            .from('movies')
            .insert(data);

          if (error) {
            toast(
              error.message,
              true
            );

            return;
          }

          toast(
            'تمت إضافة الفيلم بنجاح.'
          );

          await loadContent();
          await renderAdmin();

        } catch (error) {
          console.error(error);

          toast(
            'حدث خطأ أثناء إضافة الفيلم.',
            true
          );
        }
      }
    );
  }

  // =========================================================
  // Delete Movie
  // =========================================================

  window.deleteMovie =
    async function(id) {

      if (!isAdmin || !client) {
        return;
      }

      if (!confirm('حذف الفيلم؟')) {
        return;
      }

      const {
        error
      } = await client
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
  // Admin — Series
  // =========================================================

  async function renderSeriesAdmin() {

    const container =
      $('#seriesAdmin');

    if (!container) return;

    container.innerHTML = `
      <div class="panel">

        <h3>
          إضافة مسلسل
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
          المسلسلات الحالية
        </h3>

        <div class="admin-list">

          ${
            series
              .map(show => `
                <div>

                  <b>
                    ${esc(show.title)}
                  </b>

                  <button
                    class="danger"
                    onclick="deleteSeries('${show.id}')"
                  >
                    حذف
                  </button>

                </div>
              `)
              .join('')
              ||
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
      async event => {

        event.preventDefault();

        const formData =
          new FormData(
            event.target
          );

        const data =
          Object.fromEntries(
            formData.entries()
          );

        data.year =
          data.year
            ? Number(data.year)
            : null;

        data.is_featured =
          formData.has(
            'is_featured'
          );

        data.is_published =
          formData.has(
            'is_published'
          );

        const {
          error
        } = await client
          .from('series')
          .insert(data);

        if (error) {
          toast(
            error.message,
            true
          );

          return;
        }

        toast(
          'تمت إضافة المسلسل بنجاح.'
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
    async function(id) {

      if (!isAdmin || !client) {
        return;
      }

      if (
        !confirm(
          'حذف المسلسل؟ ستُحذف مواسمه وحلقاته إذا كانت العلاقات في قاعدة البيانات تسمح بذلك.'
        )
      ) {
        return;
      }

      const {
        error
      } = await client
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
  // Admin — Seasons
  // =========================================================

  async function renderSeasonsAdmin() {

    const result =
      await client
        .from('seasons')
        .select(
          '*,series(title)'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );

    if (result.error) {
      console.error(
        result.error
      );

      seasons = [];

    } else {
      seasons =
        result.data || [];
    }

    const container =
      $('#seasonsAdmin');

    if (!container) return;

    container.innerHTML = `
      <div class="panel">

        <h3>
          إضافة موسم
        </h3>

        <form
          id="seasonForm"
          class="admin-form"
        >

          <select
            name="series_id"
            required
          >

            <option value="">
              اختر المسلسل
            </option>

            ${
              series
                .map(show => `
                  <option value="${show.id}">
                    ${esc(show.title)}
                  </option>
                `)
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

        <div class="admin-list">

          ${
            seasons
              .map(season => `
                <div>

                  <b>
                    ${esc(
                      season.series?.title ||
                      ''
                    )}
                  </b>

                  —
                  الموسم
                  ${esc(
                    season.season_number
                  )}

                  <button
                    class="danger"
                    onclick="deleteSeason('${season.id}')"
                  >
                    حذف
                  </button>

                </div>
              `)
              .join('')
              ||
              `
                <span class="muted">
                  لا توجد مواسم.
                </span>
              `
          }

        </div>

      </div>
    `;

    $('#seasonForm')?.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        const data =
          Object.fromEntries(
            new FormData(
              event.target
            ).entries()
          );

        data.season_number =
          Number(
            data.season_number
          );

        const {
          error
        } = await client
          .from('seasons')
          .insert(data);

        if (error) {
          toast(
            error.message,
            true
          );

          return;
        }

        toast(
          'تمت إضافة الموسم.'
        );

        await renderAdmin();
      }
    );
  }

  // =========================================================
  // Delete Season
  // =========================================================

  window.deleteSeason =
    async function(id) {

      if (!isAdmin || !client) {
        return;
      }

      if (!confirm('حذف الموسم؟')) {
        return;
      }

      const {
        error
      } = await client
        .from('seasons')
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
        'تم حذف الموسم.'
      );

      await renderAdmin();
    };

  // =========================================================
  // Admin — Episodes
  // =========================================================

  async function renderEpisodesAdmin() {

    const seasonsResult =
      await client
        .from('seasons')
        .select(
          '*,series(title)'
        )
        .order(
          'series_id'
        );

    seasons =
      seasonsResult.error
        ? []
        : (
            seasonsResult.data ||
            []
          );

    const episodesResult =
      await client
        .from('episodes')
        .select(
          '*,series(title),seasons(season_number)'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );

    episodes =
      episodesResult.error
        ? []
        : (
            episodesResult.data ||
            []
          );

    const container =
      $('#episodesAdmin');

    if (!container) return;

    container.innerHTML = `
      <div class="panel">

        <h3>
          إضافة حلقة
        </h3>

        <form
          id="episodeForm"
          class="admin-form"
        >

          <select
            name="series_id"
            id="epSeries"
            required
          >

            <option value="">
              اختر المسلسل
            </option>

            ${
              series
                .map(show => `
                  <option value="${show.id}">
                    ${esc(show.title)}
                  </option>
                `)
                .join('')
            }

          </select>

          <select
            name="season_id"
            id="epSeason"
            required
          >

            <option value="">
              اختر الموسم
            </option>

          </select>

          <input
            name="episode_number"
            type="number"
            min="1"
            required
            placeholder="رقم الحلقة"
          >

          <input
            name="title"
            required
            placeholder="عنوان الحلقة"
          >

          <textarea
            name="description"
            placeholder="الوصف"
          ></textarea>

          <input
            name="thumbnail_url"
            placeholder="رابط صورة الحلقة"
          >

          <input
            name="video_url"
            placeholder="رابط الفيديو المرخص"
          >

          <div class="two">

            <input
              name="duration_minutes"
              type="number"
              placeholder="المدة بالدقائق"
            >

            <input
              name="quality"
              value="1080p"
              placeholder="الجودة"
            >

          </div>

          <label>
            <input
              name="is_published"
              type="checkbox"
              checked
            >
            منشورة
          </label>

          <button
            class="btn"
            type="submit"
          >
            إضافة الحلقة
          </button>

        </form>

      </div>

      <div class="panel">

        <h3>
          الحلقات الحالية
        </h3>

        <div class="admin-list">

          ${
            episodes
              .map(ep => `
                <div>

                  <b>
                    ${esc(
                      ep.series?.title ||
                      ''
                    )}
                  </b>

                  —
                  م${esc(
                    ep.seasons?.season_number ||
                    ''
                  )}

                  ح${esc(
                    ep.episode_number
                  )}

                  :
                  ${esc(ep.title)}

                  <button
                    class="danger"
                    onclick="deleteEpisode('${ep.id}')"
                  >
                    حذف
                  </button>

                </div>
              `)
              .join('')
              ||
              `
                <span class="muted">
                  لا توجد حلقات.
                </span>
              `
          }

        </div>

      </div>
    `;

    const seriesSelect =
      $('#epSeries');

    const seasonSelect =
      $('#epSeason');

    function updateSeasons() {

      if (!seriesSelect ||
          !seasonSelect) {
        return;
      }

      const seriesId =
        seriesSelect.value;

      const filtered =
        seasons.filter(
          season =>
            String(
              season.series_id
            ) === String(
              seriesId
            )
        );

      seasonSelect.innerHTML =
        filtered.length
          ? filtered
              .map(season => `
                <option value="${season.id}">
                  الموسم
                  ${esc(
                    season.season_number
                  )}
                </option>
              `)
              .join('')
          : `
              <option value="">
                لا توجد مواسم لهذا المسلسل
              </option>
            `;
    }

    seriesSelect?.addEventListener(
      'change',
      updateSeasons
    );

    updateSeasons();

    $('#episodeForm')?.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        const formData =
          new FormData(
            event.target
          );

        const data =
          Object.fromEntries(
            formData.entries()
          );

        data.episode_number =
          Number(
            data.episode_number
          );

        data.duration_minutes =
          data.duration_minutes
            ? Number(
                data.duration_minutes
              )
            : null;

        data.is_published =
          formData.has(
            'is_published'
          );

        const {
          error
        } = await client
          .from('episodes')
          .insert(data);

        if (error) {
          toast(
            error.message,
            true
          );

          return;
        }

        toast(
          'تمت إضافة الحلقة.'
        );

        await renderAdmin();
      }
    );
  }

  // =========================================================
  // Delete Episode
  // =========================================================

  window.deleteEpisode =
    async function(id) {

      if (!isAdmin || !client) {
        return;
      }

      if (!confirm('حذف الحلقة؟')) {
        return;
      }

      const {
        error
      } = await client
        .from('episodes')
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
        'تم حذف الحلقة.'
      );

      await renderAdmin();
    };

  // =========================================================
  // TVmaze Import
  // =========================================================

  async function importTVmaze() {

    if (!client) {
      configError();
      return;
    }

    if (!isAdmin) {
      toast(
        'يجب تسجيل الدخول بحساب المدير.',
        true
      );

      return;
    }

    const input =
      $('#tvmazeQuery');

    const button =
      $('#tvmazeImportBtn');

    const query =
      input?.value.trim();

    if (!query) {
      toast(
        'اكتب اسم المسلسل أولًا.',
        true
      );

      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent =
        'جاري الاستيراد…';
    }

    try {

      const {
        data,
        error
      } = await client.functions.invoke(
        'tvmaze-import',
        {
          body: {
            query
          }
        }
      );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(
          data.error
        );
      }

      toast(
        data?.message ||
        'تم الاستيراد بنجاح.'
      );

      await loadContent();
      await renderAdmin();

    } catch (error) {

      console.error(
        'TVmaze import error:',
        error
      );

      toast(
        error?.message ||
        'فشل الاستيراد من TVmaze.',
        true
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent =
          '📥 استيراد من TVmaze';
      }
    }
  }

  // =========================================================
  // TVmaze Panel
  // =========================================================

  function addTVmazePanel() {

    const container =
      $('#seriesAdmin');

    if (!container) {
      return;
    }

    if ($('#tvmazePanel')) {
      return;
    }

    const panel =
      document.createElement(
        'div'
      );

    panel.id =
      'tvmazePanel';

    panel.className =
      'panel';

    panel.innerHTML = `
      <h3>
        📥 استيراد مسلسل تلقائيًا من TVmaze
      </h3>

      <p class="muted">
        اكتب اسم المسلسل ثم اضغط استيراد.
      </p>

      <div class="two">

        <input
          id="tvmazeQuery"
          type="text"
          placeholder="مثال: Breaking Bad"
        >

        <button
          id="tvmazeImportBtn"
          class="btn"
          type="button"
        >
          📥 استيراد من TVmaze
        </button>

      </div>
    `;

    container.prepend(
      panel
    );

    $('#tvmazeImportBtn')
      ?.addEventListener(
        'click',
        importTVmaze
      );
  }

  // =========================================================
  // Admin Tabs
  // =========================================================

  function setupAdminTabs() {

    $$('.admin-tabs button')
      .forEach(button => {

        button.addEventListener(
          'click',
          () => {

            $$('.admin-tabs button')
              .forEach(btn =>
                btn.classList.remove(
                  'active'
                )
              );

            $$('.admin-panel')
              .forEach(panel =>
                panel.classList.add(
                  'hidden'
                )
              );

            button.classList.add(
              'active'
            );

            const target =
              $('#' +
                button.dataset.tab);

            target?.classList.remove(
              'hidden'
            );

            if (
              button.dataset.tab ===
              'seriesAdmin'
            ) {
              addTVmazePanel();
            }
          }
        );
      });
  }

  // =========================================================
  // Route
  // =========================================================

  async function route() {

    const hash =
      location.hash ||
      '#home';

    if (
      hash === '#home' ||
      hash === '#movies' ||
      hash === '#series' ||
      hash === '#search' ||
      hash === '#login'
    ) {
      showNormalSections();
      return;
    }

    if (hash === '#admin') {

      if (!isAdmin) {

        toast(
          'سجّل دخولك بحساب المدير أولًا.',
          true
        );

        location.hash =
          '#login';

        return;
      }

      await renderAdmin();

      return;
    }

    const parts =
      hash
        .slice(1)
        .split(':');

    const type =
      parts[0];

    const id =
      parts[1];

    if (
      type === 'movie' &&
      id
    ) {

      await renderDetail(
        'movie',
        id
      );

      return;
    }

    if (
      type === 'series' &&
      id
    ) {

      await renderDetail(
        'series',
        id
      );

      return;
    }

    if (
      type === 'watch' &&
      parts[1] &&
      parts[2]
    ) {

      await renderWatch(
        parts[1],
        parts[2]
      );

      return;
    }

    showNormalSections();
  }

  // =========================================================
  // Event Listeners
  // =========================================================

  function setupEvents() {

    $('#loginForm')
      ?.addEventListener(
        'submit',
        loginUser
      );

    $('#signupForm')
      ?.addEventListener(
        'submit',
        signupUser
      );

    $('#logoutBtn')
      ?.addEventListener(
        'click',
        logoutUser
      );

    setupSearch();
    setupAdminTabs();

    window.addEventListener(
      'hashchange',
      route
    );
  }

  // =========================================================
  // Start SOKA
  // =========================================================

  async function start() {

    setupEvents();

    if (!client) {
      configError();
      return;
    }

    await checkSession();

    await loadContent();

    await route();
  }

  start();

})();