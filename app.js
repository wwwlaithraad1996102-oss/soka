(() => {
  'use strict';

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

  let currentUser = null;
  let isAdmin = false;

  let movies = [];
  let series = [];
  let seasons = [];
  let episodes = [];

  const $ = (selector) =>
    document.querySelector(selector);

  const esc = (value = '') =>
    String(value).replace(
      /[&<>'"]/g,
      c =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[c]
    );

  function toast(message, error = false) {
    const el = $('#toast');

    if (!el) return;

    el.textContent = message;
    el.className =
      'toast show ' + (error ? 'error' : '');

    setTimeout(() => {
      el.className = 'toast';
    }, 3500);
  }

  function configError() {
    toast(
      'لم يتم إعداد Supabase. تحقق من config.js.',
      true
    );
  }

  /* =========================
     التنقل بين الصفحات
  ========================= */

  function showSection(id) {
    document
      .querySelectorAll('main > section')
      .forEach(section => {
        section.classList.add('hidden');
      });

    const section = document.getElementById(id);

    if (section) {
      section.classList.remove('hidden');
    }
  }

  /* =========================
     بطاقات المحتوى
  ========================= */

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

  /* =========================
     تحميل الأفلام والمسلسلات
  ========================= */

  async function loadContent() {
    if (!client) {
      configError();
      return;
    }

    const [
      moviesResponse,
      seriesResponse
    ] = await Promise.all([
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
      moviesResponse.error ||
      seriesResponse.error
    ) {
      console.error(
        moviesResponse.error,
        seriesResponse.error
      );

      toast(
        'تعذر تحميل المحتوى. تحقق من Supabase وRLS.',
        true
      );

      return;
    }

    movies = moviesResponse.data || [];
    series = seriesResponse.data || [];

    const movieGrid = $('#movieGrid');
    const seriesGrid = $('#seriesGrid');

    if (movieGrid) {
      movieGrid.innerHTML = movies.length
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
      seriesGrid.innerHTML = series.length
        ? series
            .map(item =>
              card(item, 'series')
            )
            .join('')
        : `
          <div class="empty">
            لا توجد مسلسلات منشورة بعد.
          </div>
        `;
    }
  }

  /* =========================
     تسجيل الدخول
  ========================= */

  async function checkSession() {
    if (!client) return;

    const {
      data: { session }
    } = await client.auth.getSession();

    await setUser(
      session?.user || null
    );

    client.auth.onAuthStateChange(
      async (_event, session) => {
        await setUser(
          session?.user || null
        );
      }
    );
  }

  async function setUser(user) {
    currentUser = user;
    isAdmin = false;

    const authNav = $('#authNav');
    const logoutBtn = $('#logoutBtn');
    const adminNav = $('#adminNav');

    if (!user) {
      if (authNav) {
        authNav.textContent =
          'تسجيل الدخول';

        authNav.href = '#login';
      }

      if (logoutBtn) {
        logoutBtn.classList.add('hidden');
      }

      if (adminNav) {
        adminNav.classList.add('hidden');
      }

      return;
    }

    if (authNav) {
      authNav.textContent = 'حسابي';
      authNav.href = '#login';
    }

    if (logoutBtn) {
      logoutBtn.classList.remove('hidden');
    }

    const {
      data,
      error
    } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (
      !error &&
      data &&
      data.role === 'admin'
    ) {
      isAdmin = true;

      if (adminNav) {
        adminNav.classList.remove(
          'hidden'
        );
      }
    } else {
      if (adminNav) {
        adminNav.classList.add(
          'hidden'
        );
      }
    }
  }

  /* =========================
     Login
  ========================= */

  const loginForm = $('#loginForm');

  if (loginForm) {
    loginForm.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        if (!client) {
          configError();
          return;
        }

        const email =
          $('#email').value.trim();

        const password =
          $('#password').value;

        const {
          error
        } =
          await client.auth.signInWithPassword(
            {
              email,
              password
            }
          );

        if (error) {
          toast(
            error.message,
            true
          );

          return;
        }

        toast(
          'تم تسجيل الدخول بنجاح.'
        );

        location.hash = '#home';
      }
    );
  }

  /* =========================
     Signup
  ========================= */

  const signupForm =
    $('#signupForm');

  if (signupForm) {
    signupForm.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        if (!client) {
          configError();
          return;
        }

        const full_name =
          $('#signupName')
            .value
            .trim();

        const email =
          $('#signupEmail')
            .value
            .trim();

        const password =
          $('#signupPassword')
            .value;

        const {
          error
        } =
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
          toast(
            error.message,
            true
          );

          return;
        }

        toast(
          'تم إنشاء الحساب. قد تحتاج إلى تأكيد البريد الإلكتروني.'
        );
      }
    );
  }

  /* =========================
     Logout
  ========================= */

  const logoutBtn =
    $('#logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener(
      'click',
      async () => {
        if (client) {
          await client.auth.signOut();
        }

        currentUser = null;
        isAdmin = false;

        location.hash =
          '#home';

        toast(
          'تم تسجيل الخروج.'
        );
      }
    );
  }

  /* =========================
     البحث
  ========================= */

  const searchInput =
    $('#searchInput');

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      event => {
        const q =
          event.target.value
            .trim()
            .toLowerCase();

        const searchGrid =
          $('#searchGrid');

        if (!searchGrid) return;

        if (!q) {
          searchGrid.innerHTML = '';
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
            String(
              item.title || ''
            )
              .toLowerCase()
              .includes(q)
          );

        searchGrid.innerHTML =
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

  /* =========================
     تفاصيل الفيلم
  ========================= */

  async function renderMovieDetail(id) {
    const {
      data: item,
      error
    } =
      await client
        .from('movies')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !item) {
      toast(
        'الفيلم غير موجود.',
        true
      );

      return;
    }

    const poster =
      item.poster_url ||
      'https://placehold.co/600x900/111116/eeeeee?text=SOKA';

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
  }

  /* =========================
     تفاصيل المسلسل
  ========================= */

  async function renderSeriesDetail(id) {
    const {
      data: item,
      error
    } =
      await client
        .from('series')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !item) {
      toast(
        'المسلسل غير موجود.',
        true
      );

      return;
    }

    const {
      data: ss
    } =
      await client
        .from('seasons')
        .select('*')
        .eq(
          'series_id',
          id
        )
        .order(
          'season_number'
        );

    const poster =
      item.poster_url ||
      'https://placehold.co/600x900/111116/eeeeee?text=SOKA';

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
          ss && ss.length
            ? ss
                .map(
                  season => `
                    <div class="season">

                      <h3>
                        الموسم
                        ${season.season_number}
                      </h3>

                      <div
                        id="season-${season.id}"
                        class="episode-list"
                      >
                        جاري التحميل…
                      </div>

                    </div>
                  `
                )
                .join('')
            : `
              <div class="empty">
                لا توجد مواسم.
              </div>
            `
        }

      </div>
    `;

    for (
      const season of ss || []
    ) {
      const {
        data: eps
      } =
        await client
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

      const el =
        $(
          '#season-' +
            season.id
        );

      if (!el) continue;

      el.innerHTML =
        eps && eps.length
          ? eps
              .map(
                ep => `
                  <button
                    class="episode"
                    onclick="location.hash='watch:episode:${ep.id}'"
                  >
                    الحلقة
                    ${ep.episode_number}
                    —
                    ${esc(
                      ep.title
                    )}
                  </button>
                `
              )
              .join('')
          : `
            <div class="muted">
              لا توجد حلقات منشورة.
            </div>
          `;
    }
  }

  /* =========================
     التفاصيل
  ========================= */

  async function renderDetail(
    type,
    id
  ) {
    if (!client) {
      configError();
      return;
    }

    showSection('detail');

    if (type === 'movie') {
      await renderMovieDetail(
        id
      );
    } else {
      await renderSeriesDetail(
        id
      );
    }
  }

  /* =========================
     المشاهدة
  ========================= */

  async function renderWatch(
    kind,
    id
  ) {
    if (!client) {
      configError();
      return;
    }

    showSection('watch');

    let item = null;
    let title = '';
    let video = '';

    if (kind === 'movie') {
      const {
        data
      } =
        await client
          .from('movies')
          .select('*')
          .eq('id', id)
          .single();

      item = data;

      title =
        item?.title || '';

      video =
        item?.video_url || '';
    } else {
      const {
        data
      } =
        await client
          .from('episodes')
          .select(
            '*, series(title)'
          )
          .eq('id', id)
          .single();

      item = data;

      title =
        item?.title || '';

      video =
        item?.video_url || '';
    }

    if (!item) {
      toast(
        'المحتوى غير موجود.',
        true
      );

      return;
    }

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
          لا يوجد رابط فيديو منشور.
        </div>
      `;

    $('#watchContent').innerHTML = `
      <div class="watch-box">

        <h1>
          ${esc(title)}
        </h1>

        ${player}

        <p class="muted">
          استخدم فقط روابط فيديو تملك
          حقوق بثها أو ترخيصًا لاستخدامها.
        </p>

      </div>
    `;
  }

  /* =====================================================
     لوحة التحكم
  ===================================================== */

  async function renderAdmin() {
    if (!isAdmin) {
      toast(
        'هذه الصفحة للمدير فقط.',
        true
      );

      location.hash =
        '#login';

      return;
    }

    showSection('admin');

    const {
      data: movieCount
    } =
      await client
        .from('movies')
        .select('*', {
          count: 'exact',
          head: true
        });

    const {
      data: seriesCount
    } =
      await client
        .from('series')
        .select('*', {
          count: 'exact',
          head: true
        });

    const {
      count: seasonsCount
    } =
      await client
        .from('seasons')
        .select('*', {
          count: 'exact',
          head: true
        });

    const {
      count: episodesCount
    } =
      await client
        .from('episodes')
        .select('*', {
          count: 'exact',
          head: true
        });

    const stats =
      $('#stats');

    if (stats) {
      stats.innerHTML = `
        <div class="stat">
          <strong>
            ${movieCount?.length || 0}
          </strong>
          <span>الأفلام</span>
        </div>

        <div class="stat">
          <strong>
            ${seriesCount?.length || 0}
          </strong>
          <span>المسلسلات</span>
        </div>

        <div class="stat">
          <strong>
            ${seasonsCount || 0}
          </strong>
          <span>المواسم</span>
        </div>

        <div class="stat">
          <strong>
            ${episodesCount || 0}
          </strong>
          <span>الحلقات</span>
        </div>
      `;
    }

    await renderMoviesAdmin();
    await renderSeriesAdmin();
    await renderSeasonsAdmin();
    await renderEpisodesAdmin();
  }

  /* =====================================================
     زر استيراد TVmaze
  ===================================================== */

  async function importFromTVmaze() {
    if (!client) {
      configError();
      return;
    }

    if (!isAdmin) {
      toast(
        'يجب أن تكون مديرًا.',
        true
      );

      return;
    }

    const button =
      $('#tvmazeImportBtn');

    const query =
      $('#tvmazeSearch')
        ?.value
        .trim();

    if (!query) {
      toast(
        'اكتب اسم مسلسل للبحث.',
        true
      );

      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent =
        '⏳ جاري الاستيراد...';
    }

    try {
      const {
        data,
        error
      } =
        await client.functions.invoke(
          'tvmaze-import',
          {
            body: {
              query
            }
          }
        );

      if (error) {
        console.error(error);

        throw error;
      }

      console.log(
        'TVmaze response:',
        data
      );

      toast(
        'تم استيراد المسلسل بنجاح.'
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
          'حدث خطأ أثناء الاستيراد.',
        true
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent =
          '⬇ استيراد من TVmaze';
      }
    }
  }

  window.importFromTVmaze =
    importFromTVmaze;

  /* =====================================================
     إدارة الأفلام
  ===================================================== */

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
          🤖 استيراد مسلسل تلقائيًا
        </h3>

        <p class="muted">
          ابحث عن مسلسل في TVmaze
          لإضافته إلى SOKA.
        </p>

        <input
          id="tvmazeSearch"
          placeholder="مثال: Breaking Bad"
        >

        <button
          id="tvmazeImportBtn"
          class="btn"
          type="button"
          onclick="importFromTVmaze()"
        >
          ⬇ استيراد من TVmaze
        </button>

      </div>

      <div class="panel">

        <h3>
          🎬 الأفلام الحالية
        </h3>

        <div class="admin-list">

          ${
            movies.length
              ? movies
                  .map(
                    movie => `
                      <div>

                        <b>
                          ${esc(
                            movie.title
                          )}
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
                  .join('')
              : `
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

    if (form) {
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
              :