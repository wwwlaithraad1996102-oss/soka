(() => {
  'use strict';

  // =====================================================
  // SOKA - Stable App
  // Login + Signup + Admin Dashboard
  // Movies + Series
  // =====================================================

  const CONFIG = window.SOKA_CONFIG || {};

  let supabaseClient = null;
  let currentUser = null;
  let isAdmin = false;

  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------

  const $ = (selector) => document.querySelector(selector);

  const escapeHTML = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  function showMessage(message, type = 'info') {
    let box = $('#sokaMessage');

    if (!box) {
      box = document.createElement('div');
      box.id = 'sokaMessage';

      box.style.cssText = `
        position:fixed;
        top:20px;
        left:50%;
        transform:translateX(-50%);
        z-index:99999;
        max-width:90%;
        padding:14px 20px;
        border-radius:12px;
        background:#17171d;
        color:#fff;
        font-size:15px;
        text-align:center;
        box-shadow:0 10px 30px rgba(0,0,0,.4);
      `;

      document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === 'error') {
      box.style.background = '#8b1e2d';
    } else if (type === 'success') {
      box.style.background = '#176b45';
    } else {
      box.style.background = '#17171d';
    }

    box.style.display = 'block';

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      box.style.display = 'none';
    }, 5000);
  }

  function showLoading(message = 'جاري التحميل...') {
    let loading = $('#sokaLoading');

    if (!loading) {
      loading = document.createElement('div');
      loading.id = 'sokaLoading';

      loading.style.cssText = `
        position:fixed;
        inset:0;
        z-index:99998;
        background:#08080b;
        color:white;
        display:flex;
        align-items:center;
        justify-content:center;
        flex-direction:column;
        gap:15px;
        font-size:18px;
      `;

      document.body.appendChild(loading);
    }

    loading.innerHTML = `
      <div style="
        width:40px;
        height:40px;
        border:4px solid #333;
        border-top-color:#fff;
        border-radius:50%;
        animation:sokaSpin 1s linear infinite;
      "></div>

      <div>${escapeHTML(message)}</div>
    `;

    if (!document.getElementById('sokaSpinStyle')) {
      const style = document.createElement('style');

      style.id = 'sokaSpinStyle';

      style.textContent = `
        @keyframes sokaSpin {
          to {
            transform:rotate(360deg);
          }
        }
      `;

      document.head.appendChild(style);
    }
  }

  function hideLoading() {
    $('#sokaLoading')?.remove();
  }

  // -----------------------------------------------------
  // Create Supabase
  // -----------------------------------------------------

  function initSupabase() {

    if (!CONFIG.supabaseUrl) {
      showMessage(
        'خطأ: supabaseUrl غير موجود في config.js',
        'error'
      );
      return false;
    }

    if (!CONFIG.supabaseAnonKey) {
      showMessage(
        'خطأ: supabaseAnonKey غير موجود في config.js',
        'error'
      );
      return false;
    }

    if (!window.supabase) {
      showMessage(
        'خطأ: مكتبة Supabase لم يتم تحميلها.',
        'error'
      );
      return false;
    }

    try {

      supabaseClient =
        window.supabase.createClient(
          CONFIG.supabaseUrl,
          CONFIG.supabaseAnonKey
        );

      return true;

    } catch (error) {

      console.error(
        'Supabase initialization error:',
        error
      );

      showMessage(
        'تعذر تشغيل Supabase.',
        'error'
      );

      return false;
    }
  }

  // -----------------------------------------------------
  // Get Admin Role
  // -----------------------------------------------------

  async function checkAdmin(user) {

    if (!user) {
      isAdmin = false;
      return false;
    }

    try {

      const result =
        await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

      console.log(
        'PROFILE RESULT:',
        result
      );

      if (result.error) {

        console.error(
          'Profile error:',
          result.error
        );

        isAdmin = false;

        return false;
      }

      isAdmin =
        result.data?.role === 'admin';

      return isAdmin;

    } catch (error) {

      console.error(
        'Admin check error:',
        error
      );

      isAdmin = false;

      return false;
    }
  }

  // -----------------------------------------------------
  // Session
  // -----------------------------------------------------

  async function loadSession() {

    if (!supabaseClient) {
      return;
    }

    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth.getSession();

      if (error) {
        console.error(
          'Session error:',
          error
        );
        return;
      }

      currentUser =
        data?.session?.user || null;

      if (currentUser) {

        await checkAdmin(
          currentUser
        );

      } else {

        isAdmin = false;
      }

      updateInterface();

    } catch (error) {

      console.error(
        'Load session error:',
        error
      );
    }
  }

  // -----------------------------------------------------
  // Interface
  // -----------------------------------------------------

  function updateInterface() {

    const adminNav =
      $('#adminNav');

    const authNav =
      $('#authNav');

    const logoutBtn =
      $('#logoutBtn');

    if (currentUser) {

      if (authNav) {
        authNav.textContent =
          isAdmin
            ? 'حساب المدير'
            : 'حسابي';

        authNav.href =
          '#account';
      }

      logoutBtn?.classList.remove(
        'hidden'
      );

      if (adminNav) {

        if (isAdmin) {
          adminNav.classList.remove(
            'hidden'
          );
        } else {
          adminNav.classList.add(
            'hidden'
          );
        }
      }

    } else {

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
    }
  }

  // -----------------------------------------------------
  // Login
  // -----------------------------------------------------

  async function login(event) {

    event.preventDefault();

    if (!supabaseClient) {
      showMessage(
        'Supabase غير جاهز.',
        'error'
      );
      return;
    }

    const email =
      $('#email')?.value.trim();

    const password =
      $('#password')?.value;

    if (!email || !password) {

      showMessage(
        'أدخل البريد الإلكتروني وكلمة المرور.',
        'error'
      );

      return;
    }

    showLoading(
      'جاري تسجيل الدخول...'
    );

    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {

        hideLoading();

        console.error(
          'LOGIN ERROR:',
          error
        );

        showMessage(
          error.message,
          'error'
        );

        return;
      }

      currentUser =
        data.user;

      await checkAdmin(
        currentUser
      );

      hideLoading();

      updateInterface();

      if (isAdmin) {

        showMessage(
          'تم تسجيل الدخول بنجاح — أنت المدير.',
          'success'
        );

        location.hash =
          '#admin';

      } else {

        showMessage(
          'تم تسجيل الدخول بنجاح.',
          'success'
        );

        location.hash =
          '#account';
      }

    } catch (error) {

      hideLoading();

      console.error(
        'LOGIN EXCEPTION:',
        error
      );

      showMessage(
        'حدث خطأ غير متوقع أثناء تسجيل الدخول.',
        'error'
      );
    }
  }

  // -----------------------------------------------------
  // Signup
  // -----------------------------------------------------

  async function signup(event) {

    event.preventDefault();

    if (!supabaseClient) {
      showMessage(
        'Supabase غير جاهز.',
        'error'
      );
      return;
    }

    const name =
      $('#signupName')?.value.trim();

    const email =
      $('#signupEmail')?.value.trim();

    const password =
      $('#signupPassword')?.value;

    if (!name || !email || !password) {

      showMessage(
        'املأ جميع الحقول.',
        'error'
      );

      return;
    }

    if (password.length < 6) {

      showMessage(
        'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
        'error'
      );

      return;
    }

    showLoading(
      'جاري إنشاء الحساب...'
    );

    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth.signUp({

          email,

          password,

          options: {
            data: {
              full_name: name
            }
          }

        });

      if (error) {

        hideLoading();

        console.error(
          'SIGNUP ERROR:',
          error
        );

        showMessage(
          error.message,
          'error'
        );

        return;
      }

      hideLoading();

      if (data?.session) {

        currentUser =
          data.user;

        await checkAdmin(
          currentUser
        );

        updateInterface();

        showMessage(
          'تم إنشاء الحساب وتسجيل الدخول.',
          'success'
        );

        location.hash =
          isAdmin
            ? '#admin'
            : '#account';

      } else {

        showMessage(
          'تم إنشاء الحساب. تحقق من البريد الإلكتروني إذا كان تأكيد البريد مفعّلًا.',
          'success'
        );
      }

    } catch (error) {

      hideLoading();

      console.error(
        'SIGNUP EXCEPTION:',
        error
      );

      showMessage(
        'حدث خطأ أثناء إنشاء الحساب.',
        'error'
      );
    }
  }

  // -----------------------------------------------------
  // Logout
  // -----------------------------------------------------

  async function logout() {

    if (!supabaseClient) {
      return;
    }

    try {

      const {
        error
      } =
        await supabaseClient.auth.signOut();

      if (error) {

        console.error(
          error
        );

        showMessage(
          error.message,
          'error'
        );

        return;
      }

      currentUser = null;
      isAdmin = false;

      updateInterface();

      location.hash =
        '#login';

      showMessage(
        'تم تسجيل الخروج.',
        'success'
      );

    } catch (error) {

      console.error(
        error
      );

      showMessage(
        'حدث خطأ أثناء تسجيل الخروج.',
        'error'
      );
    }
  }

  // -----------------------------------------------------
  // Admin Dashboard
  // -----------------------------------------------------

  async function loadAdmin() {

    if (!currentUser) {

      showMessage(
        'يجب تسجيل الدخول أولًا.',
        'error'
      );

      location.hash =
        '#login';

      return;
    }

    if (!isAdmin) {

      await checkAdmin(
        currentUser
      );

      if (!isAdmin) {

        showMessage(
          'حسابك ليس مديرًا.',
          'error'
        );

        location.hash =
          '#account';

        return;
      }
    }

    const admin =
      $('#admin');

    if (!admin) {

      showMessage(
        'خطأ: قسم لوحة التحكم غير موجود في index.html.',
        'error'
      );

      return;
    }

    document
      .querySelectorAll(
        'main > section'
      )
      .forEach(section => {

        section.classList.add(
          'hidden'
        );
      });

    admin.classList.remove(
      'hidden'
    );

    await loadStats();

    await loadMoviesAdmin();

    await loadSeriesAdmin();

  }

  // -----------------------------------------------------
  // Stats
  // -----------------------------------------------------

  async function loadStats() {

    const stats =
      $('#stats');

    if (!stats) {
      return;
    }

    stats.innerHTML =
      '<div>جاري تحميل الإحصائيات...</div>';

    try {

      const tables = [
        'movies',
        'series',
        'seasons',
        'episodes'
      ];

      const labels = [
        'الأفلام',
        'المسلسلات',
        'المواسم',
        'الحلقات'
      ];

      const results =
        await Promise.all(
          tables.map(table =>
            supabaseClient
              .from(table)
              .select(
                'id',
                {
                  count: 'exact',
                  head: true
                }
              )
          )
        );

      stats.innerHTML =
        results
          .map(
            (result, index) => {

              if (result.error) {

                console.error(
                  tables[index],
                  result.error
                );

                return `
                  <div class="stat">
                    <strong>!</strong>
                    <span>${labels[index]}</span>
                  </div>
                `;
              }

              return `
                <div class="stat">
                  <strong>
                    ${result.count ?? 0}
                  </strong>

                  <span>
                    ${labels[index]}
                  </span>
                </div>
              `;
            }
          )
          .join('');

    } catch (error) {

      console.error(
        'Stats error:',
        error
      );

      stats.innerHTML =
        '<div>تعذر تحميل الإحصائيات.</div>';
    }
  }

  // -----------------------------------------------------
  // Movies Admin
  // -----------------------------------------------------

  async function loadMoviesAdmin() {

    const container =
      $('#moviesAdmin');

    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="panel">
        <h3>➕ إضافة فيلم</h3>

        <form id="movieForm">

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
            placeholder="رابط صورة الفيلم"
          >

          <input
            name="video_url"
            placeholder="رابط الفيديو"
          >

          <input
            name="year"
            type="number"
            placeholder="السنة"
          >

          <input
            name="genre"
            placeholder="النوع"
          >

          <input
            name="country"
            placeholder="الدولة"
          >

          <label>
            <input
              type="checkbox"
              name="is_published"
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

        <h3>🎬 الأفلام الموجودة</h3>

        <div id="moviesList">
          جاري التحميل...
        </div>

      </div>
    `;

    await refreshMoviesList();

    $('#movieForm')
      ?.addEventListener(
        'submit',
        addMovie
      );
  }

  async function refreshMoviesList() {

    const list =
      $('#moviesList');

    if (!list) {
      return;
    }

    const {
      data,
      error
    } =
      await supabaseClient
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
        error
      );

      list.innerHTML =
        `<p>خطأ: ${escapeHTML(error.message)}</p>`;

      return;
    }

    if (!data?.length) {

      list.innerHTML =
        '<p>لا توجد أفلام حتى الآن.</p>';

      return;
    }

    list.innerHTML =
      data
        .map(movie => `
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            padding:12px;
            margin:8px 0;
            background:#111116;
            border-radius:10px;
          ">

            <strong>
              ${escapeHTML(movie.title)}
            </strong>

            <button
              class="danger"
              data-id="${movie.id}"
            >
              حذف
            </button>

          </div>
        `)
        .join('');

    list
      .querySelectorAll(
        '.danger'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          async () => {

            if (
              !confirm(
                'هل تريد حذف الفيلم؟'
              )
            ) {
              return;
            }

            await deleteMovie(
              button.dataset.id
            );
          }
        );
      });
  }

  async function addMovie(event) {

    event.preventDefault();

    const form =
      event.target;

    const formData =
      new FormData(form);

    const movie = {

      title:
        formData.get('title'),

      description:
        formData.get('description') || null,

      poster_url:
        formData.get('poster_url') || null,

      video_url:
        formData.get('video_url') || null,

      year:
        formData.get('year')
          ? Number(
              formData.get('year')
            )
          : null,

      genre:
        formData.get('genre') || null,

      country:
        formData.get('country') || null,

      is_published:
        formData.has(
          'is_published'
        )
    };

    const {
      error
    } =
      await supabaseClient
        .from('movies')
        .insert(movie);

    if (error) {

      console.error(
        error
      );

      showMessage(
        error.message,
        'error'
      );

      return;
    }

    form.reset();

    showMessage(
      'تمت إضافة الفيلم بنجاح.',
      'success'
    );

    await loadStats();

    await refreshMoviesList();
  }

  async function deleteMovie(id) {

    const {
      error
    } =
      await supabaseClient
        .from('movies')
        .delete()
        .eq(
          'id',
          id
        );

    if (error) {

      console.error(
        error
      );

      showMessage(
        error.message,
        'error'
      );

      return;
    }

    showMessage(
      'تم حذف الفيلم.',
      'success'
    );

    await loadStats();

    await refreshMoviesList();
  }

  // -----------------------------------------------------
  // Series Admin
  // -----------------------------------------------------

  async function loadSeriesAdmin() {

    const container =
      $('#seriesAdmin');

    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="panel">

        <h3>➕ إضافة مسلسل</h3>

        <form id="seriesForm">

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
            placeholder="رابط صورة المسلسل"
          >

          <input
            name="year"
            type="number"
            placeholder="السنة"
          >

          <input
            name="genre"
            placeholder="النوع"
          >

          <input
            name="country"
            placeholder="الدولة"
          >

          <label>
            <input
              type="checkbox"
              name="is_published"
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

        <h3>📺 المسلسلات الموجودة</h3>

        <div id="seriesList">
          جاري التحميل...
        </div>

      </div>
    `;

    await refreshSeriesList();

    $('#seriesForm')
      ?.addEventListener(
        'submit',
        addSeries
      );
  }

  async function refreshSeriesList() {

    const list =
      $('#seriesList');

    if (!list) {
      return;
    }

    const {
      data,
      error
    } =
      await supabaseClient
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
        error
      );

      list.innerHTML =
        `<p>خطأ: ${escapeHTML(error.message)}</p>`;

      return;
    }

    if (!data?.length) {

      list.innerHTML =
        '<p>لا توجد مسلسلات حتى الآن.</p>';

      return;
    }

    list.innerHTML =
      data
        .map(show => `
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            padding:12px;
            margin:8px 0;
            background:#111116;
            border-radius:10px;
          ">

            <strong>
              ${escapeHTML(show.title)}
            </strong>

            <button
              class="danger"
              data-id="${show.id}"
            >
              حذف
            </button>

          </div>
        `)
        .join('');

    list
      .querySelectorAll(
        '.danger'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          async () => {

            if (
              !confirm(
                'هل تريد حذف المسلسل؟'
              )
            ) {
              return;
            }

            await deleteSeries(
              button.dataset.id
            );
          }
        );
      });
  }

  async function addSeries(event) {

    event.preventDefault();

    const form =
      event.target;

    const formData =
      new FormData(form);

    const series = {

      title:
        formData.get('title'),

      description:
        formData.get('description') || null,

      poster_url:
        formData.get('poster_url') || null,

      year:
        formData.get('year')
          ? Number(
              formData.get('year')
            )
          : null,

      genre:
        formData.get('genre') || null,

      country:
        formData.get('country') || null,

      is_published:
        formData.has(
          'is_published'
        )
    };

    const {
      error
    } =
      await supabaseClient
        .from('series')
        .insert(series);

    if (error) {

      console.error(
        error
      );

      showMessage(
        error.message,
        'error'
      );

      return;
    }

    form.reset();

    showMessage(
      'تمت إضافة المسلسل بنجاح.',
      'success'
    );

    await loadStats();

    await refreshSeriesList();
  }

  async function deleteSeries(id) {

    const {
      error
    } =
      await supabaseClient
        .from('series')
        .delete()
        .eq(
          'id',
          id
        );

    if (error) {

      console.error(
        error
      );

      showMessage(
        error.message,
        'error'
      );

      return;
    }

    showMessage(
      'تم حذف المسلسل.',
      'success'
    );

    await loadStats();

    await refreshSeriesList();
  }

  // -----------------------------------------------------
  // Account
  // -----------------------------------------------------

  function showAccount() {

    if (!currentUser) {

      location.hash =
        '#login';

      return;
    }

    document
      .querySelectorAll(
        'main > section'
      )
      .forEach(section => {

        section.classList.add(
          'hidden'
        );
      });

    let section =
      $('#account');

    if (!section) {

      section =
        document.createElement(
          'section'
        );

      section.id
