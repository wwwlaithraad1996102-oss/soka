(() => {
  'use strict';

  // =========================================================
  // SOKA v2
  // Movies / Series / Seasons / Episodes
  // + TVmaze Automatic Import
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
  // STATE
  // =========================================================

  let currentUser = null;
  let isAdmin = false;

  let movies = [];
  let series = [];
  let seasons = [];
  let episodes = [];

  // =========================================================
  // HELPERS
  // =========================================================

  const $ = (selector) =>
    document.querySelector(selector);

  const esc = (value = '') =>
    String(value).replace(
      /[&<>'"]/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[char])
    );

  const toast = (message, error = false) => {
    const el = $('#toast');

    if (!el) return;

    el.textContent = message;
    el.className =
      'toast show ' + (error ? 'error' : '');

    setTimeout(() => {
      el.className = 'toast';
    }, 4000);
  };

  const fmt = (date) =>
    date
      ? new Date(date).toLocaleDateString('ar-IQ')
      : '';

  function configError() {
    toast(
      'لم يتم إعداد Supabase بشكل صحيح. تحقق من config.js.',
      true
    );
  }

  // =========================================================
  // CARD
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
  // LOAD CONTENT
  // =========================================================

  async function loadContent() {
    if (!client) return;

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
        ? movies
            .map((movie) =>
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
            .map((show) =>
              card(show, 'series')
            )
            .join('')
        : `
          <div class="empty">
            لا توجد مسلسلات منشورة بعد.
          </div>
        `;
    }
  }

  // =========================================================
  // AUTH SESSION
  // =========================================================

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

  // =========================================================
  // USER
  // =========================================================

  async function setUser(user) {
    currentUser = user;
    isAdmin = false;

    const authNav = $('#authNav');
    const logout = $('#logoutBtn');
    const adminNav = $('#adminNav');
    const admin = $('#admin');

    if (!user) {
      if (authNav) {
        authNav.textContent =
          'تسجيل الدخول';

        authNav.href = '#login';
      }

      logout?.classList.add('hidden');
      adminNav?.classList.add('hidden');
      admin?.classList.add('hidden');

      return;
    }

    if (authNav) {
      authNav.textContent =
        'حسابي';

      authNav.href =
        '#login';
    }

    logout?.classList.remove('hidden');

    // Check admin role
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
      data?.role === 'admin'
    ) {
      isAdmin = true;
      adminNav?.classList.remove(
        'hidden'
      );
    } else {
      adminNav?.classList.add(
        'hidden'
      );
    }

    if (
      location.hash === '#admin' &&
      isAdmin
    ) {
      await renderAdmin();
    }
  }

  // =========================================================
  // LOGIN
  // =========================================================

  $('#loginForm')?.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      if (!client) {
        configError();
        return;
      }

      const email =
        $('#email')
          .value
          .trim();

      const password =
        $('#password').value;

      const {
        error
      } =
        await client.auth.signInWithPassword({
          email,
          password
        });

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

      location.hash =
        '#home';
    }
  );

  // =========================================================
  // SIGN UP
  // =========================================================

  $('#signupForm')?.addEventListener(
    'submit',
    async (event) => {
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

  // =========================================================
  // LOGOUT
  // =========================================================

  $('#logoutBtn')?.addEventListener(
    'click',
    async () => {
      if (client) {
        await client.auth.signOut();
      }

      location.hash =
        '#home';

      toast(
        'تم تسجيل الخروج.'
      );
    }
  );

  // =========================================================
  // SEARCH
  // =========================================================

  $('#searchInput')?.addEventListener(
    'input',
    (event) => {
      const q =
        event.target.value
          .trim()
          .toLowerCase();

      const searchGrid =
        $('#searchGrid');

      if (!searchGrid) return;

      if (!q) {
        searchGrid.innerHTML =
          '';

        return;
      }

      const all = [
        ...movies.map(
          (movie) => ({
            ...movie,
            _type: 'movie'
          })
        ),

        ...series.map(
          (show) => ({
            ...show,
            _type: 'series'
          })
        )
      ];

      const result =
        all.filter(
          (item) =>
            String(
              item.title || ''
            )
              .toLowerCase()
              .includes(q)
        );

      searchGrid.innerHTML =
        result.length
          ? result
              .map((item) =>
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

  // =========================================================
  // DETAIL
  // =========================================================

  async function renderDetail(
    type,
    id
  ) {
    if (!client) {
      configError();
      return;
    }

    const table =
      type === 'movie'
        ? 'movies'
        : 'series';

    const {
      data: item,
      error
    } =
      await client
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

    if (error || !item) {
      toast(
        error?.message ||
          'المحتوى غير موجود.',
        true
      );

      return;
    }

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
              ${esc(
                item.year || ''
              )}

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
      data: ss
    } =
      await client
        .from('seasons')
        .select('*')
        .eq('series_id', id)
        .order(
          'season_number'
        );

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
            ${esc(
              item.year || ''
            )}

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
                    جاري التحميل…
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

    for (
      const season of
      ss || []
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
        (eps || [])
          .map(
            (episode) => `
              <button
                class="episode"
                onclick="location.hash='watch:episode:${episode.id}'"
              >
                الحلقة
                ${episode.episode_number}
                —
                ${esc(
                  episode.title
                )}
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
  // WATCH
  // =========================================================

  async function renderWatch(
    kind,
    id
  ) {
    if (!client) {
      configError();
      return;
    }

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
      title = item?.title;
      video = item?.video_url;
    } else {
      const {
        data
      } =
        await client
          .from('episodes')
          .select(
            '*,series(title)'
          )
          .eq('id', id)
          .single();

      item = data;
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
            title ||
              'المشاهدة'
          )}
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

      location.hash =
        '#home';

      return;
    }

    $('#admin')
      ?.classList
      .remove('hidden');

    // -------------------------------------------------------
    // COUNTS
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

    $('#stats').innerHTML = [
      'الأفلام',
      'المسلسلات',
      'المواسم',
      'الحلقات'
    ]
      .map(
        (name, index) => `
          <div class="stat">
            <strong>
              ${counts[index].count ?? 0}
            </strong>

            <span>
              ${name}
            </span>
          </div>
        `
      )
      .join('');

    // -------------------------------------------------------
    // TVMAZE BUTTON
    // -------------------------------------------------------

    addTVmazeButton();

    // -------------------------------------------------------
    // ADMIN SECTIONS
    // -------------------------------------------------------

    await renderMoviesAdmin();
    await renderSeriesAdmin();
    await renderSeasonsAdmin();
    await renderEpisodesAdmin();
  }

  // =========================================================
  // TVMAZE IMPORT BUTTON
  // =========================================================

  function addTVmazeButton() {
    const admin =
      $('#admin');

    if (!admin) return;

    // Don't duplicate button
    if (
      $('#tvmazeImportPanel')
    ) {
      return;
    }

    const stats =
      $('#stats');

    const panel =
      document.createElement(
        'div'
      );

    panel.id =
      'tvmazeImportPanel';

    panel.className =
      'panel';

    panel.style.margin =
      '20px 0';

    panel.innerHTML = `
      <h3>
        📺 الاستيراد التلقائي من TVmaze
      </h3>

      <p class="muted">
        استيراد بيانات المسلسلات والمواسم والحلقات
        تلقائيًا إلى SOKA.
      </p>

      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        "
      >

        <input
          id="tvmazeQuery"
          type="text"
          placeholder="اسم مسلسل محدد (اختياري)"
          style="
            flex:1;
            min-width:220px;
          "
        >

        <input
          id="tvmazeLimit"
          type="number"
          min="1"
          max="50"
          value="10"
          placeholder="عدد النتائج"
          style="
            width:130px;
          "
        >

        <button
          id="tvmazeImportBtn"
          class="btn"
          type="button"
        >
          📥 استيراد تلقائي
        </button>

      </div>

      <div
        id="tvmazeImportStatus"
        class="muted"
        style="margin-top:12px;"
      ></div>
    `;

    if (stats) {
      stats.after(panel);
    } else {
      admin.prepend(panel);
    }

    $('#tvmazeImportBtn')
      ?.addEventListener(
        'click',
        importFromTVmaze
      );
  }

  // =========================================================
  // CALL TVMAZE EDGE FUNCTION
  // =========================================================

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

    const status =
      $('#tvmazeImportStatus');

    const query =
      $('#tvmazeQuery')
        ?.value
        ?.trim() || '';

    let limit =
      Number(
        $('#tvmazeLimit')
          ?.value || 10
      );

    if (
      Number.isNaN(limit) ||
      limit < 1
    ) {
      limit = 10;
    }

    if (limit > 50) {
      limit = 50;
    }

    button.disabled = true;

    button.textContent =
      '⏳ جاري الاستيراد…';

    if (status) {
      status.textContent =
        'جاري الاتصال بـ TVmaze واستيراد البيانات…';
    }

    try {
      /*
       * مهم:
       * لا نضع SUPABASE_SERVICE_ROLE_KEY هنا.
       *
       * Supabase يقوم بإرسال جلسة المستخدم
       * إلى Edge Function تلقائيًا.
       */

      const {
        data,
        error
      } =
        await client.functions.invoke(
          'tvmaze-import',
          {
            body: {
              query: query || null,
              limit: limit
            }
          }
        );

      if (error) {
        console.error(
          'TVmaze import error:',
          error
        );

        throw error;
      }

      console.log(
        'TVmaze response:',
        data
      );

      const imported =
        data?.imported ??
        data?.count ??
        data?.total ??
        0;

      const message =
        data?.message ||
        `تم الاستيراد بنجاح. العناصر المستوردة: ${imported}`;

      if (status) {
        status.textContent =
          message;
      }

      toast(
        message
      );

      // Refresh content
      await loadContent();

      // Refresh admin counts/lists
      await renderAdmin();

    } catch (error) {
      console.error(
        error
      );

      let message =
        error?.message ||
        'حدث خطأ أثناء الاستيراد.';

      /*
       * بعض أخطاء Edge Functions تظهر
       * بشكل غير واضح، لذلك نحاول عرض
       * التفاصيل إن وجدت.
       */

      if (
        error?.context
      ) {
        try {
          const text =
            await error.context.text();

          if (text) {
            message =
              text;
          }
        } catch (_) {}
      }

      if (status) {
        status.textContent =
          'فشل الاستيراد: ' +
          message;
      }

      toast(
        'فشل الاستيراد: ' +
          message,
        true
      );

    } finally {
      const btn =
        $('#tvmazeImportBtn');

      if (btn) {
        btn.disabled = false;

        btn.textContent =
          '📥 استيراد تلقائي';
      }
    }
  }

  // =========================================================
  // MOVIES ADMIN
  // =========================================================

  async function renderMoviesAdmin() {
    $('#moviesAdmin').innerHTML = `
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
              .map(
                (movie) => `
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

    $('#movieForm')
      ?.addEventListener(
        'submit',
        async (event) => {
          event.preventDefault();

          const form =
            new FormData(
              event.target
            );

          const object =
            Object.fromEntries(
              form.entries()
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
            form.has(
              'is_featured'
            );

          object.is_published =
            form.has(
              'is_published'
            );

          const {
            error
          } =
            await client
              .from('movies')
              .insert(
                object
              );

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
  // DELETE MOVIE
  // =========================================================

  window.deleteMovie =
    async (id) => {
      if (
        !confirm(
          'حذف الفيلم؟'
        )
      ) {
        return;
      }

      const {
        error
      } =
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
  // SERIES ADMIN
  // =========================================================

  async function renderSeriesAdmin() {
    $('#seriesAdmin').innerHTML = `
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
           