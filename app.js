(() => {

  'use strict';


  // =========================================================
  // SOKA
  // Authentication + Admin + Movies + Series
  // =========================================================


  const cfg =
    window.SOKA_CONFIG || {};


  // =========================================================
  // Supabase
  // =========================================================

  const validConfig =
    cfg.supabaseUrl &&
    cfg.supabaseAnonKey;


  const client =
    validConfig &&
    window.supabase
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


  // =========================================================
  // Helpers
  // =========================================================

  const $ = selector =>
    document.querySelector(selector);


  const $$ = selector =>
    Array.from(
      document.querySelectorAll(selector)
    );


  function esc(value = '') {

    return String(value)
      .replace(
        /[&<>'"]/g,
        char => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[char])
      );

  }


  function toast(
    message,
    error = false
  ) {

    const el =
      $('#toast');

    if (!el) {

      alert(message);

      return;

    }


    el.textContent =
      message;


    el.className =
      'toast show ' +
      (
        error
          ? 'error'
          : ''
      );


    setTimeout(() => {

      el.className =
        'toast';

    }, 4000);

  }


  // =========================================================
  // Show / Hide Sections
  // =========================================================

  function showSection(id) {

    $$('main > section')
      .forEach(section => {

        section.classList.add(
          'hidden'
        );

      });


    const target =
      $('#' + id);


    target?.classList.remove(
      'hidden'
    );

  }


  function showHome() {

    showSection('home');

    $('#movies')
      ?.classList.remove('hidden');

    $('#series')
      ?.classList.remove('hidden');

  }


  // =========================================================
  // Authentication
  // =========================================================

  async function checkSession() {

    if (!client) {

      toast(
        'خطأ في إعداد Supabase.',
        true
      );

      return;

    }


    try {

      const {
        data,
        error
      } =
        await client.auth.getSession();


      if (error) {

        console.error(
          error
        );

        toast(
          'تعذر قراءة جلسة الدخول.',
          true
        );

        return;

      }


      await setUser(
        data?.session?.user ||
        null
      );


      client.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {

          console.log(
            'Auth event:',
            event
          );


          await setUser(
            session?.user ||
            null
          );

        }
      );


    } catch (error) {

      console.error(
        error
      );

    }

  }


  // =========================================================
  // Set User
  // =========================================================

  async function setUser(user) {

    currentUser =
      user;


    isAdmin =
      false;


    const authNav =
      $('#authNav');


    const logoutBtn =
      $('#logoutBtn');


    const adminNav =
      $('#adminNav');


    if (!user) {

      authNav?.classList.remove(
        'hidden'
      );


      if (authNav) {

        authNav.textContent =
          'تسجيل الدخول';

        authNav.href =
          '#login';

      }


      logoutBtn?.classList.add(
        'hidden'
      );


      adminNav?.classList.add(
        'hidden'
      );


      return;

    }


    // المستخدم مسجل الدخول

    if (authNav) {

      authNav.textContent =
        user.email ||
        'حسابي';

      authNav.href =
        '#home';

    }


    logoutBtn?.classList.remove(
      'hidden'
    );


    // =====================================================
    // Check Admin
    // =====================================================

    try {

      const {
        data,
        error
      } =
        await client
          .from('profiles')
          .select('role')
          .eq(
            'id',
            user.id
          )
          .maybeSingle();


      console.log(
        'Profile:',
        data,
        error
      );


      if (
        !error &&
        data?.role === 'admin'
      ) {

        isAdmin =
          true;


        adminNav?.classList.remove(
          'hidden'
        );


        console.log(
          'SOKA ADMIN: true'
        );

      } else {

        adminNav?.classList.add(
          'hidden'
        );

        console.log(
          'SOKA ADMIN: false'
        );

      }


    } catch (error) {

      console.error(
        'Admin check error:',
        error
      );

    }

  }


  // =========================================================
  // Login
  // =========================================================

  async function loginUser(event) {

    event.preventDefault();


    if (!client) {

      toast(
        'Supabase غير متصل.',
        true
      );

      return;

    }


    const email =
      $('#email')
        ?.value
        .trim();


    const password =
      $('#password')
        ?.value;


    if (!email || !password) {

      toast(
        'أدخل البريد وكلمة المرور.',
        true
      );

      return;

    }


    const button =
      event.target.querySelector(
        'button[type="submit"]'
      );


    if (button) {

      button.disabled =
        true;

      button.textContent =
        'جاري الدخول…';

    }


    try {

      const {
        data,
        error
      } =
        await client.auth
          .signInWithPassword({
            email,
            password
          });


      if (error) {

        console.error(
          'LOGIN ERROR:',
          error
        );


        toast(
          error.message ||
          'فشل تسجيل الدخول.',
          true
        );


        return;

      }


      await setUser(
        data?.user ||
        null
      );


      toast(
        'تم تسجيل الدخول بنجاح.'
      );


      location.hash =
        '#home';


      // إذا كان Admin

      if (isAdmin) {

        setTimeout(() => {

          toast(
            'مرحبًا بك يا مدير SOKA.'
          );

        }, 500);

      }


    } catch (error) {

      console.error(
        error
      );


      toast(
        error.message ||
        'حدث خطأ أثناء تسجيل الدخول.',
        true
      );


    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          'دخول';

      }

    }

  }


  // =========================================================
  // Signup
  // =========================================================

  async function signupUser(event) {

    event.preventDefault();


    if (!client) {

      toast(
        'Supabase غير متصل.',
        true
      );

      return;

    }


    const name =
      $('#signupName')
        ?.value
        .trim();


    const email =
      $('#signupEmail')
        ?.value
        .trim();


    const password =
      $('#signupPassword')
        ?.value;


    if (
      !name ||
      !email ||
      !password
    ) {

      toast(
        'املأ جميع الحقول.',
        true
      );

      return;

    }


    const button =
      event.target.querySelector(
        'button[type="submit"]'
      );


    if (button) {

      button.disabled =
        true;

      button.textContent =
        'جاري إنشاء الحساب…';

    }


    try {

      const {
        data,
        error
      } =
        await client.auth.signUp({

          email,

          password,

          options: {

            data: {
              full_name:
                name
            }

          }

        });


      if (error) {

        console.error(
          'SIGNUP ERROR:',
          error
        );


        toast(
          error.message ||
          'فشل إنشاء الحساب.',
          true
        );


        return;

      }


      if (data?.session) {

        await setUser(
          data.user
        );


        toast(
          'تم إنشاء الحساب وتسجيل الدخول.'
        );


        location.hash =
          '#home';


      } else {

        toast(
          'تم إنشاء الحساب. إذا كان تأكيد البريد مفعلًا، افتح بريدك الإلكتروني للتأكيد.'
        );

      }


    } catch (error) {

      console.error(
        error
      );


      toast(
        error.message ||
        'حدث خطأ أثناء إنشاء الحساب.',
        true
      );


    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          'إنشاء حساب';

      }

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
      } =
        await client.auth.signOut();


      if (error) {

        toast(
          error.message,
          true
        );

        return;

      }


      currentUser =
        null;

      isAdmin =
        false;


      $('#adminNav')
        ?.classList.add(
          'hidden'
        );


      $('#logoutBtn')
        ?.classList.add(
          'hidden'
        );


      toast(
        'تم تسجيل الخروج.'
      );


      location.hash =
        '#home';


    } catch (error) {

      console.error(
        error
      );


      toast(
        'حدث خطأ أثناء تسجيل الخروج.',
        true
      );

    }

  }


  // =========================================================
  // Load Movies
  // =========================================================

  async function loadMovies() {

    if (!client) return;


    try {

      const {
        data,
        error
      } =
        await client
          .from('movies')
          .select('*')
          .order(
            'created_at',
            {
              ascending: false
            }
          );


      if (error) {

        console.error(
          'Movies error:',
          error
        );


        toast(
          'تعذر تحميل الأفلام: ' +
          error.message,
          true
        );


        return;

      }


      movies =
        data || [];


      renderMovies();


    } catch (error) {

      console.error(
        error
      );

    }

  }


  // =========================================================
  // Load Series
  // =========================================================

  async function loadSeries() {

    if (!client) return;


    try {

      const {
        data,
        error
      } =
        await client
          .from('series')
          .select('*')
          .order(
            'created_at',
            {
              ascending: false
            }
          );


      if (error) {

        console.error(
          'Series error:',
          error
        );


        toast(
          'تعذر تحميل المسلسلات: ' +
          error.message,
          true
        );


        return;

      }


      series =
        data || [];


      renderSeries();


    } catch (error) {

      console.error(
        error
      );

    }

  }


  // =========================================================
  // Movie Card
  // =========================================================

  function movieCard(movie) {

    const poster =
      movie.poster_url ||
      'https://placehold.co/600x900/111116/eeeeee?text=SOKA';


    return `

      <article
        class="card"
        data-title="${esc(movie.title)}"
        onclick="openMovie('${movie.id}')"
      >

        <img
          loading="lazy"
          src="${esc(poster)}"
          alt="${esc(movie.title)}"
          onerror="this.src='https://placehold.co/600x900/111116/eeeeee?text=SOKA'"
        >

        <div class="card-body">

          <h3>
            ${esc(movie.title)}
          </h3>

          <p>
            ${esc(movie.year || '')}

            ${
              movie.genre
                ? ' • ' +
                  esc(movie.genre)
                : ''
            }
          </p>

        </div>

      </article>

    `;

  }


  // =========================================================
  // Series Card
  // =========================================================

  function seriesCard(show) {

    const poster =
      show.poster_url ||
      'https://placehold.co/600x900/111116/eeeeee?text=SOKA';


    return `

      <article
        class="card"
        data-title="${esc(show.title)}"
        onclick="openSeries('${show.id}')"
      >

        <img
          loading="lazy"
          src="${esc(poster)}"
          alt="${esc(show.title)}"
          onerror="this.src='https://placehold.co/600x900/111116/eeeeee?text=SOKA'"
        >

        <div class="card-body">

          <h3>
            ${esc(show.title)}
          </h3>

          <p>
            ${esc(show.year || '')}

            ${
              show.genre
                ? ' • ' +
                  esc(show.genre)
                : ''
            }
          </p>

        </div>

      </article>

    `;

  }


  // =========================================================
  // Render Movies
  // =========================================================

  function renderMovies() {

    const grid =
      $('#movieGrid');


    if (!grid) return;


    const published =
      movies.filter(
        movie =>
          movie.is_published !== false
      );


    grid.innerHTML =
      published.length
        ? published
            .map(movieCard)
            .join('')
        : `
          <div class="empty">
            لا توجد أفلام حاليًا.
          </div>
        `;

  }


  // =========================================================
  // Render Series
  // =========================================================

  function renderSeries() {

    const grid =
      $('#seriesGrid');


    if (!grid) return;


    const published =
      series.filter(
        show =>
          show.is_published !== false
      );


    grid.innerHTML =
      published.length
        ? published
            .map(seriesCard)
            .join('')
        : `
          <div class="empty">
            لا توجد مسلسلات حاليًا.
          </div>
        `;

  }


  // =========================================================
  // Movie Details
  // =========================================================

  window.openMovie =
    async function(id) {

      const movie =
        movies.find(
          item =>
            String(item.id) ===
            String(id)
        );


      if (!movie) {

        toast(
          'الفيلم غير موجود.',
          true
        );

        return;

      }


      showSection(
        'detail'
      );


      const poster =
        movie.poster_url ||
        'https://placehold.co/600x900/111116/eeeeee?text=SOKA';


      $('#detailContent').innerHTML = `

        <div class="detail-card">

          <img
            src="${esc(poster)}"
            alt="${esc(movie.title)}"
          >

          <div>

            <span class="badge">
              فيلم
            </span>

            <h1>
              ${esc(movie.title)}
            </h1>

            <p class="muted">
              ${esc(movie.description || 'لا يوجد وصف.')}
            </p>

            <p>
              ${esc(movie.year || '')}

              ${
                movie.genre
                  ? ' • ' +
                    esc(movie.genre)
                  : ''
              }

              ${
                movie.country
                  ? ' • ' +
                    esc(movie.country)
                  : ''
              }
            </p>

            ${
              movie.video_url
                ? `
                  <a
                    class="btn"
                    href="${esc(movie.video_url)}"
                    target="_blank"
                    rel="noopener"
                  >
                    ▶ مشاهدة
                  </a>
                `
                : ''
            }

          </div>

        </div>

      `;


      location.hash =
        'movie:' + id;

    };


  // =========================================================
  // Series Details
  // =========================================================

  window.openSeries =
    async function(id) {

      const show =
        series.find(
          item =>
            String(item.id) ===
            String(id)
        );


      if (!show) {

        toast(
          'المسلسل غير موجود.',
          true
        );

        return;

      }


      showSection(
        'detail'
      );


      const poster =
        show.poster_url ||
        'https://placehold.co/600x900/111116/eeeeee?text=SOKA';


      $('#detailContent').innerHTML = `

        <div class="detail-card">

          <img
            src="${esc(poster)}"
            alt="${esc(show.title)}"
          >

          <div>

            <span class="badge">
              مسلسل
            </span>

            <h1>
              ${esc(show.title)}
            </h1>

            <p class="muted">
              ${esc(show.description || 'لا يوجد وصف.')}
            </p>

            <p>
              ${esc(show.year || '')}

              ${
                show.genre
                  ? ' • ' +
                    esc(show.genre)
                  : ''
              }

              ${
                show.country
                  ? ' • ' +
                    esc(show.country)
                  : ''
              }
            </p>

          </div>

        </div>

      `;


      location.hash =
        'series:' + id;

    };


  // =========================================================
  // Admin Check
  // =========================================================

  function requireAdmin() {

    if (!currentUser) {

      toast(
        'يجب تسجيل الدخول أولًا.',
        true
      );

      location.hash =
        '#login';

      return false;

    }


    if (!isAdmin) {

      toast(
        'ليس لديك صلاحية المدير.',
        true
      );

      location.hash =
        '#home';

      return false;

    }


    return true;

  }


  // =========================================================
  // Admin Dashboard
  // =========================================================

  async function renderAdmin() {

    if (!requireAdmin()) {
      return;
    }


    showSection(
      'admin'
    );


    $('#adminNav')
      ?.classList.remove(
        'hidden'
      );


    await updateStats();

    renderMoviesAdmin();

    renderSeriesAdmin();

  }


  // =========================================================
  // Statistics
  // =========================================================

  async function updateStats() {

    const stats =
      $('#stats');


    if (!stats) return;


    stats.innerHTML = `

      <div class="stat">

        <strong>
          ${movies.length}
        </strong>

        <span>
          الأفلام
        </span>

      </div>


      <div class="stat">

        <strong>
          ${series.length}
        </strong>

        <span>
          المسلسلات
        </span>

      </div>

    `;

  }


  // =========================================================
  // Admin Movies
  // =========================================================

  function renderMoviesAdmin() {

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
            placeholder="وصف الفيلم"
          ></textarea>

          <input
            name="poster_url"
            placeholder="رابط صورة البوستر"
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
            placeholder="مدة الفيلم بالدقائق"
          >

          <label class="check">

            <input
              name="is_featured"
              type="checkbox"
            >

            فيلم مميز

          </label>


          <label class="check">

            <input
              name="is_published"
              type="checkbox"
              checked
            >

            نشر الفيلم

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
          🎬 الأفلام الموجودة
        </h3>

        <div class="admin-list">

          ${
            movies.length
              ? movies
                  .map(movie => `

                    <div class="admin-item">

                      <div class="admin-item-info">

                        <strong>
                          ${esc(movie.title)}
                        </strong>

                        <span class="muted">
                          ${esc(movie.year || '')}
                          ${
                            movie.is_published
                              ? ' • منشور'
                              : ' • مخفي'
                          }
                        </span>

                      </div>

                      <div class="admin-actions">

                        <button
                          class="small-btn danger"
                          onclick="deleteMovie('${movie.id}')"
                        >
                          حذف
                        </button>

                      </div>

                    </div>

                  `)
                  .join('')
              : `
                <div class="empty">
                  لا توجد أفلام.
                </div>
              `
          }

        </div>

      </div>

    `;


    $('#movieForm')
      ?.addEventListener(
        'submit',
        addMovie
      );

  }


  // =========================================================
  // Add Movie
  // =========================================================

  async function addMovie(event) {

    event.preventDefault();


    if (!requireAdmin()) {
      return;
    }


    const form =
      event.target;


    const fd =
      new FormData(form);


    const movie = {

      title:
        fd.get('title'),

      description:
        fd.get('description') ||
        null,

      poster_url:
        fd.get('poster_url') ||
        null,

      backdrop_url:
        fd.get('backdrop_url') ||
        null,

      video_url:
        fd.get('video_url') ||
        null,

      year:
        fd.get('year')
          ? Number(fd.get('year'))
          : null,

      genre:
        fd.get('genre') ||
        null,

      country:
        fd.get('country') ||
        null,

      duration_minutes:
        fd.get('duration_minutes')
          ? Number(
              fd.get(
                'duration_minutes'
              )
            )
          : null,

      is_featured:
        fd.has(
          'is_featured'
        ),

      is_published:
        fd.has(
          'is_published'
        )

    };


    const button =
      form.querySelector(
        'button[type="submit"]'
      );


    if (button) {

      button.disabled =
        true;

      button.textContent =
        'جاري الإضافة…';

    }


    try {

      const {
        error
      } =
        await client
          .from('movies')
          .insert(movie);


      if (error) {

        console.error(
          error
        );


        toast(
          'فشل إضافة الفيلم: ' +
          error.message,
          true
        );


        return;

      }


      toast(
        'تمت إضافة الفيلم بنجاح 🎬'
      );


      form.reset();


      await loadMovies();


      await renderAdmin();


    } catch (error) {

      console.error(
        error
      );


      toast(
        error.message ||
        'حدث خطأ.',
        true
      );


    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          'إضافة الفيلم';

      }

    }

  }


  // =========================================================
  // Delete Movie
  // =========================================================

  window.deleteMovie =
    async function(id) {

      if (!requireAdmin()) {
        return;
      }


      if (
        !confirm(
          'هل تريد حذف هذا الفيلم؟'
        )
      ) {
        return;
      }


      try {

        const {
          error
        } =
          await client
            .from('movies')
            .delete()
            .eq(
              'id',
              id
            );


        if (error) {

          toast(
            'فشل حذف الفيلم: ' +
            error.message,
            true
          );

          return;

        }


        toast(
          'تم حذف الفيلم.'
        );


        await loadMovies();

        await renderAdmin();


      } catch (error) {

        console.error(
          error
        );

        toast(
          'حدث خطأ أثناء الحذف.',
          true
        );

      }

    };


  // =========================================================
  // Admin Series
  // =========================================================

  function renderSeriesAdmin() {

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
            placeholder="وصف المسلسل"
          ></textarea>

          <input
            name="poster_url"
            placeholder="رابط صورة البوستر"
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


          <label class="check">

            <input
              name="is_featured"
              type="checkbox"
            >

            مسلسل مميز

          </label>


          <label class="check">

            <input
              name="is_published"
              type="checkbox"
              checked
            >

            نشر المسلسل

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
          📺 المسلسلات الموجودة
        </h3>

        <div class="admin-list">

          ${
            series.length
              ? series
                  .map(show => `

                    <div class="admin-item">

                      <div class="admin-item-info">

                        <strong>
                          ${esc(show.title)}
                        </strong>

                        <span class="muted">

                          ${esc(show.year || '')}

                          ${
                            show.is_published
                              ? ' • منشور'
                              : ' • مخفي'
                          }

                        </span>

                      </div>

                      <div class="admin-actions">

                        <button
                          class="small-btn danger"
                          onclick="deleteSeries('${show.id}')"
                        >
                          حذف
                        </button>

                      </div>

                    </div>

                  `)
                  .join('')
              : `
                <div class="empty">
                  لا توجد مسلسلات.
                </div>
              `
          }

        </div>

      </div>

    `;


    $('#seriesForm')
      ?.addEventListener(
        'submit',
        addSeries
      );

  }


  // =========================================================
  // Add Series
  // =========================================================

  async function addSeries(event) {

    event.preventDefault();


    if (!requireAdmin()) {
      return;
    }


    const fd =
      new FormData(
        event.target
      );


    const show = {

      title:
        fd.get('title'),

      description:
        fd.get('description') ||
        null,

      poster_url:
        fd.get('poster_url') ||
        null,

      backdrop_url:
        fd.get('backdrop_url') ||
        null,

      year:
        fd.get('year')
          ? Number(fd.get('year'))
          : null,

      genre:
        fd.get('genre') ||
        null,

      country:
        fd.get('country') ||
        null,

      is_featured:
        fd.has(
          'is_featured'
        ),

      is_published:
        fd.has(
          'is_published'
        )

    };


    const button =
      event.target.querySelector(
        'button[type="submit"]'
      );


    if (button) {

      button.disabled =
        true;

      button.textContent =
        'جاري الإضافة…';

    }


    try {

      const {
        error
      } =
        await client
          .from('series')
          .insert(show);


      if (error) {

        console.error(
          error
        );


        toast(
          'فشل إضافة المسلسل: ' +
          error.message,
          true
        );


        return;

      }


      toast(
        'تمت إضافة المسلسل بنجاح 📺'
      );


      event.target.reset();


      await loadSeries();


      await renderAdmin();


    } catch (error) {

      console.error(
        error
      );


      toast(
        error.message ||
        'حدث خطأ.',
        true
      );


    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          'إضافة المسلسل';

      }

    }

  }


  // =========================================================
  // Delete Series
  // =========================================================

  window.deleteSeries =
    async function(id) {

      if (!requireAdmin()) {
        return;
      }


      if (
        !confirm(
          'هل تريد حذف هذا المسلسل؟'
        )
      ) {
        return;
      }


      try {

        const {
          error
        } =
          await client
            .from('series')
            .delete()
            .eq(
              'id',
              id
            );


        if (error) {

          toast(
            'فشل حذف المسلسل: ' +
            error.message,
            true
          );

          return;

        }


        toast(
          'تم حذف المسلسل.'
        );


        await loadSeries();


        await renderAdmin();


      } catch (error) {

        console.error(
          error
        );


        toast(
          'حدث خطأ أثناء الحذف.',
          true
        );

      }

    };


  // =========================================================
  // Search
  // =========================================================

  function setupSearch() {

    const input =
      $('#searchInput');


    if (!input) return;


    input.addEventListener(
      'input',
      () => {

        const q =
          input.value
            .trim()
            .toLowerCase();


        const grid =
          $('#searchGrid');


        if (!grid) return;


        if (!q) {

          grid.innerHTML =
            '';

          return;

        }


        const movieResults =
          movies
            .filter(
              movie =>
                String(
                  movie.title || ''
                )
                  .toLowerCase()
                  .includes(q)
            )
            .map(movieCard);


        const seriesResults =
          series
            .filter(
              show =>
                String(
                  show.title || ''
                )
                  .toLowerCase()
                  .includes(q)
            )
            .map(seriesCard);


        const results =
          [
            ...movieResults,
            ...seriesResults
          ];


        grid.innerHTML =
          results.length
            ? results.join('')
            : `
              <div class="empty">
                لا توجد نتائج.
              </div>
            `;

      }
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

          }
        );

      });

  }


  // =========================================================
  // Routing
  // =========================================================

  async function route() {

    const hash =
      location.hash ||
      '#home';


    if (
      hash === '#home'
    ) {

      showHome();

      return;

    }


    if (
      hash === '#movies'
    ) {

      showSection(
        'movies'
      );

      return;

    }


    if (
      hash === '#series'
    ) {

      showSection(
        'series'
      );

      return;

    }


    if (
      hash === '#search'
    ) {

      showSection(
        'search'
      );

      return;

    }


    if (
      hash === '#login'
    ) {

      showSection(
        'login'
      );

      return;

    }


    if (
      hash === '#admin'
    ) {

      await renderAdmin();

      return;

    }


    if (
      hash.startsWith(
        '#movie:'
      )
    ) {

      const id =
        hash.split(':')[1];

      await window.openMovie(
        id
      );

      return;

    }


    if (
      hash.startsWith(
        '#series:'
      )
    ) {

      const id =
        hash.split(':')[1];

      await window.openSeries(
        id
      );

      return;

    }


    showHome();

  }


  // =========================================================
  // Events
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


    window.addEventListener(
      'hashchange',
      route
    );


    setupSearch();

    setupAdminTabs();

  }


  // =========================================================
  // Start
  // =========================================================

  async function start() {

    console.log(
      'SOKA starting...'
    );


    setupEvents();


    if (!client) {

      toast(
        'لم يتم الاتصال بـ Supabase. تحقق من config.js.',
        true
      );


      console.error(
        'SOKA_CONFIG:',
        cfg
      );


      return;

    }


    await checkSession();


    await Promise.all([
      loadMovies(),
      loadSeries()
    ]);


    await route();


    console.log(
      'SOKA ready.'
    );

  }


  start();


})();
