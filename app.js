(() => {
  'use strict';

  const cfg = window.SOKA_CONFIG || {};

  const client =
    window.supabase &&
    cfg.supabaseUrl &&
    cfg.supabaseAnonKey
      ? window.supabase.createClient(
          cfg.supabaseUrl,
          cfg.supabaseAnonKey
        )
      : null;

  let currentUser = null;
  let isAdmin = false;

  let movies = [];
  let series = [];

  const $ = selector =>
    document.querySelector(selector);

  function toast(message, error = false) {

    const el = $('#toast');

    if (!el) {
      alert(message);
      return;
    }

    el.textContent = message;

    el.className =
      'toast show' +
      (error ? ' error' : '');

    setTimeout(() => {
      el.className = 'toast';
    }, 4000);
  }

  function esc(value = '') {

    return String(value)
      .replace(/[&<>'"]/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[char]));
  }


  // =====================================================
  // ROUTING
  // =====================================================

  function showSection(id) {

    document
      .querySelectorAll('main > section')
      .forEach(section => {

        section.classList.add('hidden');

      });

    const section =
      document.getElementById(id);

    if (section) {
      section.classList.remove('hidden');
    }
  }


  function route() {

    const hash =
      location.hash || '#home';

    const id =
      hash.substring(1);

    if (id === 'admin') {

      if (!currentUser) {

        toast(
          'يجب تسجيل الدخول أولًا.',
          true
        );

        location.hash = '#login';

        return;
      }

      if (!isAdmin) {

        toast(
          'هذا الحساب ليس مديرًا.',
          true
        );

        location.hash = '#home';

        return;
      }

      showSection('admin');

      loadAdmin();

      return;
    }

    if (
      id === 'login'
    ) {

      showSection('login');

      return;
    }

    if (
      id === 'movies'
    ) {

      showSection('movies');

      return;
    }

    if (
      id === 'series'
    ) {

      showSection('series');

      return;
    }

    showSection('home');
  }


  // =====================================================
  // AUTH
  // =====================================================

  async function checkSession() {

    if (!client) {

      toast(
        'Supabase غير متصل.',
        true
      );

      return;
    }

    const result =
      await client.auth.getSession();

    if (result.error) {

      console.error(
        result.error
      );

      return;
    }

    await handleUser(
      result.data.session?.user || null
    );

    client.auth.onAuthStateChange(
      async (_event, session) => {

        await handleUser(
          session?.user || null
        );

        route();

      }
    );
  }


  async function handleUser(user) {

    currentUser = user;
    isAdmin = false;

    const adminNav =
      $('#adminNav');

    const authNav =
      $('#authNav');

    const logoutBtn =
      $('#logoutBtn');

    if (!user) {

      adminNav?.classList.add(
        'hidden'
      );

      logoutBtn?.classList.add(
        'hidden'
      );

      if (authNav) {

        authNav.textContent =
          'تسجيل الدخول';

        authNav.href =
          '#login';

      }

      return;
    }


    if (authNav) {

      authNav.textContent =
        'حسابي';

      authNav.href =
        '#home';

    }

    logoutBtn?.classList.remove(
      'hidden'
    );


    // ================================================
    // التحقق من profiles
    // ================================================

    const result =
      await client
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();


    console.log(
      'SOKA PROFILE:',
      result.data
    );

    console.log(
      'SOKA PROFILE ERROR:',
      result.error
    );


    if (result.error) {

      console.error(
        'Profile error:',
        result.error
      );

      toast(
        'تم تسجيل الدخول، لكن تعذر قراءة صلاحيات الحساب.',
        true
      );

      return;
    }


    if (
      result.data &&
      result.data.role === 'admin'
    ) {

      isAdmin = true;

      adminNav?.classList.remove(
        'hidden'
      );

      console.log(
        'SOKA ADMIN: نعم'
      );

      toast(
        'مرحبًا بك أيها المدير 👑'
      );

    } else {

      console.log(
        'SOKA ADMIN: لا'
      );

    }


    const adminUser =
      $('#adminUser');

    if (adminUser) {

      adminUser.innerHTML = `
        <strong>
          👤 ${esc(user.email)}
        </strong>

        <br>

        الصلاحية:
        <strong>
          ${isAdmin ? 'ADMIN 👑' : 'USER'}
        </strong>
      `;

    }
  }


  // =====================================================
  // LOGIN
  // =====================================================

  async function login(event) {

    event.preventDefault();

    const email =
      $('#email')?.value.trim();

    const password =
      $('#password')?.value;

    if (!email || !password) {

      toast(
        'أدخل البريد وكلمة المرور.',
        true
      );

      return;
    }


    const button =
      event.submitter;

    if (button) {
      button.disabled = true;
      button.textContent =
        'جاري الدخول…';
    }


    try {

      const result =
        await client.auth.signInWithPassword({
          email,
          password
        });


      if (result.error) {

        console.error(
          result.error
        );

        toast(
          result.error.message,
          true
        );

        return;
      }


      await handleUser(
        result.data.user
      );


      toast(
        'تم تسجيل الدخول بنجاح.'
      );


      if (isAdmin) {

        location.hash =
          '#admin';

      } else {

        location.hash =
          '#home';

      }


    } catch (error) {

      console.error(error);

      toast(
        'حدث خطأ أثناء تسجيل الدخول.',
        true
      );

    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          'تسجيل الدخول';

      }

    }
  }


  // =====================================================
  // SIGNUP
  // =====================================================

  async function signup(event) {

    event.preventDefault();

    const name =
      $('#signupName')?.value.trim();

    const email =
      $('#signupEmail')?.value.trim();

    const password =
      $('#signupPassword')?.value;


    if (!name || !email || !password) {

      toast(
        'املأ جميع الحقول.',
        true
      );

      return;
    }


    try {

      const result =
        await client.auth.signUp({

          email,

          password,

          options: {
            data: {
              full_name: name
            }
          }

        });


      if (result.error) {

        console.error(
          result.error
        );

        toast(
          result.error.message,
          true
        );

        return;
      }


      if (result.data.session) {

        await handleUser(
          result.data.user
        );

        toast(
          'تم إنشاء الحساب بنجاح.'
        );

        location.hash =
          '#home';

      } else {

        toast(
          'تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا كان تأكيد البريد مفعّلًا.'
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


  // =====================================================
  // LOGOUT
  // =====================================================

  async function logout() {

    const result =
      await client.auth.signOut();

    if (result.error) {

      toast(
        result.error.message,
        true
      );

      return;
    }

    currentUser = null;
    isAdmin = false;

    $('#adminNav')?.classList.add(
      'hidden'
    );

    $('#logoutBtn')?.classList.add(
      'hidden'
    );

    toast(
      'تم تسجيل الخروج.'
    );

    location.hash =
      '#home';
  }


  // =====================================================
  // MOVIES
  // =====================================================

  async function loadMovies() {

    const result =
      await client
        .from('movies')
        .select('*')
        .eq('is_published', true)
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

      return;
    }


    movies =
      result.data || [];


    const grid =
      $('#movieGrid');

    if (!grid) return;


    if (!movies.length) {

      grid.innerHTML = `
        <div class="empty">
          لا توجد أفلام منشورة حاليًا.
        </div>
      `;

      return;
    }


    grid.innerHTML =
      movies
        .map(movie => {

          const poster =
            movie.poster_url ||
            'https://placehold.co/600x900/111116/ffffff?text=SOKA';

          return `
            <article class="card">

              <img
                src="${esc(poster)}"
                alt="${esc(movie.title)}"
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

        })
        .join('');
  }


  // =====================================================
  // SERIES
  // =====================================================

  async function loadSeries() {

    const result =
      await client
        .from('series')
        .select('*')
        .eq('is_published', true)
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

      return;
    }


    series =
      result.data || [];


    const grid =
      $('#seriesGrid');

    if (!grid) return;


    if (!series.length) {

      grid.innerHTML = `
        <div class="empty">
          لا توجد مسلسلات منشورة حاليًا.
        </div>
      `;

      return;
    }


    grid.innerHTML =
      series
        .map(show => {

          const poster =
            show.poster_url ||
            'https://placehold.co/600x900/111116/ffffff?text=SOKA';

          return `
            <article class="card">

              <img
                src="${esc(poster)}"
                alt="${esc(show.title)}"
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

        })
        .join('');
  }


  // =====================================================
  // ADMIN
  // =====================================================

  async function loadAdmin() {

    if (!isAdmin) {

      toast(
        'ليس لديك صلاحية المدير.',
        true
      );

      return;
    }


    await loadAdminStats();

    await loadAdminMovies();

    await loadAdminSeries();

  }


  async function loadAdminStats() {

    const movieCount =
      await client
        .from('movies')
        .select('*', {
          count: 'exact',
          head: true
        });


    const seriesCount =
      await client
        .from('series')
        .select('*', {
          count: 'exact',
          head: true
        });


    const stats =
      $('#stats');

    if (!stats) return;


    stats.innerHTML = `

      <div class="stat">

        <strong>
          ${movieCount.count || 0}
        </strong>

        <span>
          الأفلام
        </span>

      </div>

      <div class="stat">

        <strong>
          ${seriesCount.count || 0}
        </strong>

        <span>
          المسلسلات
        </span>

      </div>

    `;
  }


  // =====================================================
  // ADD MOVIE
  // =====================================================

  async function addMovie(event) {

    event.preventDefault();


    if (!isAdmin) {

      toast(
        'غير مصرح.',
        true
      );

      return;
    }


    const form =
      event.target;

    const fd =
      new FormData(form);


    const data = {

      title:
        fd.get('title'),

      description:
        fd.get('description') || null,

      poster_url:
        fd.get('poster_url') || null,

      backdrop_url:
        fd.get('backdrop_url') || null,

      video_url:
        fd.get('video_url') || null,

      year:
        fd.get('year')
          ? Number(fd.get('year'))
          : null,

      genre:
        fd.get('genre') || null,

      country:
        fd.get('country') || null,

      is_published:
        fd.has('is_published')

    };


    const result =
      await client
        .from('movies')
        .insert(data);


    if (result.error) {

      console.error(
        result.error
      );

      toast(
        result.error.message,
        true
      );

      return;
    }


    toast(
      '✅ تمت إضافة الفيلم.'
    );


    form.reset();


    await loadMovies();

    await loadAdmin();

  }


  // =====================================================
  // ADD SERIES
  // =====================================================

  async function addSeries(event) {

    event.preventDefault();


    if (!isAdmin) {

      toast(
        'غير مصرح.',
        true
      );

      return;
    }


    const form =
      event.target;

    const fd =
      new FormData(form);


    const data = {

      title:
        fd.get('title'),

      description:
        fd.get('description') || null,

      poster_url:
        fd.get('poster_url') || null,

      backdrop_url:
        fd.get('backdrop_url') || null,

      year:
        fd.get('year')
          ? Number(fd.get('year'))
          : null,

      genre:
        fd.get('genre') || null,

      country:
        fd.get('country') || null,

      is_published:
        fd.has('is_published')

    };


    const result =
      await client
        .from('series')
        .insert(data);


    if (result.error) {

      console.error(
        result.error
      );

      toast(
        result.error.message,
        true
      );

      return;
    }


    toast(
      '✅ تمت إضافة المسلسل.'
    );


    form.reset();


    await loadSeries();

    await loadAdmin();

  }


  // =====================================================
  // ADMIN MOVIES LIST
  // =====================================================

  async function loadAdminMovies() {

    const result =
      await client
        .from('movies')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        );


    const box =
      $('#adminMovies');

    if (!box) return;


    if (result.error) {

      box.innerHTML = `
        <div class="empty">
          ${esc(
            result.error.message
          )}
        </div>
      `;

      return;
    }


    const data =
      result.data || [];


    if (!data.length) {

      box.innerHTML = `
        <div class="empty">
          لا توجد أفلام.
        </div>
      `;

      return;
    }


    box.innerHTML =
      data
        .map(movie => `

          <div class="admin-item">

            <div>

              <strong>
                ${esc(movie.title)}
              </strong>

              <br>

              <small>
                ${
                  movie.is_published
                    ? '🟢 منشور'
                    : '🔴 مخفي'
                }
              </small>

            </div>

            <button
              class="danger"
              onclick="window.deleteMovie('${movie.id}')"
            >
              حذف
            </button>

          </div>

        `)
        .join('');
  }


  // =====================================================
  // DELETE MOVIE
  // =====================================================

  window.deleteMovie =
    async function(id) {

      if (!isAdmin) {

        toast(
          'غير مصرح.',
          true
        );

        return;
      }


      if (
        !confirm(
          'هل تريد حذف هذا الفيلم؟'
        )
      ) {
        return;
      }


      const result =
        await client
          .from('movies')
          .delete()
          .eq('id', id);


      if (result.error) {

        toast(
          result.error.message,
          true
        );

        return;
      }


      toast(
        'تم حذف الفيلم.'
      );


      await loadMovies();

      await loadAdmin();

    };


  // =====================================================
  // ADMIN SERIES LIST
  // =====================================================

  async function loadAdminSeries() {

    const result =
      await client
        .from('series')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        );


    const box =
      $('#adminSeries');

    if (!box) return;


    if (result.error) {

      box.innerHTML = `
        <div class="empty">
          ${esc(
            result.error.message
          )}
        </div>
      `;

      return;
    }


    const data =
      result.data || [];


    if (!data.length) {

      box.innerHTML = `
        <div class="empty">
          لا توجد مسلسلات.
        </div>
      `;

      return;
    }


    box.innerHTML =
      data
        .map(show => `

          <div class="admin-item">

            <div>

              <strong>
                ${esc(show.title)}
              </strong>

              <br>

              <small>
                ${
                  show.is_published
                    ? '🟢 منشور'
                    : '🔴 مخفي'
                }
              </small>

            </div>

            <button
              class="danger"
              onclick="window.deleteSeries('${show.id}')"
            >
              حذف
            </button>

          </div>

        `)
        .join('');
  }


  // =====================================================
  // DELETE SERIES
  // =====================================================

  window.deleteSeries =
    async function(id) {

      if (!isAdmin) {

        toast(
          'غير مصرح.',
          true
        );

        return;
      }


      if (
        !confirm(
          'هل تريد حذف هذا المسلسل؟'
        )
      ) {
        return;
      }


      const result =
        await client
          .from('series')
          .delete()
          .eq('id', id);


      if (result.error) {

        toast(
          result.error.message,
          true
        );

        return;
      }


      toast(
        'تم حذف المسلسل.'
      );


      await loadSeries();

      await loadAdmin();

    };


  // =====================================================
  // EVENTS
  // =====================================================

  function setupEvents() {

    $('#loginForm')
      ?.addEventListener(
        'submit',
        login
      );


    $('#signupForm')
      ?.addEventListener(
        'submit',
        signup
      );


    $('#logoutBtn')
      ?.addEventListener(
        'click',
        logout
      );


    $('#movieForm')
      ?.addEventListener(
        'submit',
        addMovie
      );


    $('#seriesForm')
      ?.addEventListener(
        'submit',
        addSeries
      );


    window.addEventListener(
      'hashchange',
      route
    );

  }


  // =====================================================
  // START
  // =====================================================

  async function start() {

    console.log(
      'SOKA START'
    );


    if (!client) {

      toast(
        'خطأ: Supabase غير مهيأ.',
        true
      );

      return;
    }


    setupEvents();


    await checkSession();


    await loadMovies();

    await loadSeries();


    route();

  }


  start();

})();
