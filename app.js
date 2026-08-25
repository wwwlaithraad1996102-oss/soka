(() => {
  'use strict';

  // =========================================================
  // SOKA
  // Supabase + Login + Signup + Admin Dashboard
  // =========================================================

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

  // =========================================================
  // Helpers
  // =========================================================

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
      'toast show ' +
      (error ? 'error' : '');

    setTimeout(() => {
      el.className = 'toast';
    }, 3500);
  }

  function showSections() {
    document
      .querySelectorAll('main > section')
      .forEach(section => {
        section.classList.remove('hidden');
      });
  }

  function showOnly(id) {
    document
      .querySelectorAll('main > section')
      .forEach(section => {
        if (section.id === id) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      });
  }

  // =========================================================
  // AUTH
  // =========================================================

  async function checkSession() {

    if (!client) {
      console.error(
        'SOKA: Supabase client غير موجود'
      );

      toast(
        'خطأ في إعداد Supabase.',
        true
      );

      return;
    }

    try {

      const result =
        await client.auth.getSession();

      console.log(
        'SOKA SESSION:',
        result
      );

      if (result.error) {
        console.error(
          'Session error:',
          result.error
        );

        return;
      }

      await setUser(
        result.data?.session?.user || null
      );

      client.auth.onAuthStateChange(
        async (_event, session) => {

          console.log(
            'AUTH EVENT:',
            _event,
            session
          );

          await setUser(
            session?.user || null
          );
        }
      );

    } catch (error) {

      console.error(
        'checkSession error:',
        error
      );

      toast(
        'تعذر التحقق من تسجيل الدخول.',
        true
      );
    }
  }

  // =========================================================
  // SET USER
  // =========================================================

  async function setUser(user) {

    currentUser = user;
    isAdmin = false;

    const authNav =
      $('#authNav');

    const logoutBtn =
      $('#logoutBtn');

    const adminNav =
      $('#adminNav');

    const admin =
      $('#admin');

    // -----------------------------------------
    // لا يوجد مستخدم
    // -----------------------------------------

    if (!user) {

      console.log(
        'SOKA: لا يوجد مستخدم مسجل'
      );

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

      admin?.classList.add(
        'hidden'
      );

      return;
    }

    // -----------------------------------------
    // المستخدم موجود
    // -----------------------------------------

    console.log(
      'SOKA USER:',
      user
    );

    if (authNav) {

      authNav.textContent =
        'حسابي';

      authNav.href =
        '#home';
    }

    logoutBtn?.classList.remove(
      'hidden'
    );

    // -----------------------------------------
    // قراءة profile
    // -----------------------------------------

    try {

      const result =
        await client
          .from('profiles')
          .select('id,role,email')
          .eq('id', user.id)
          .maybeSingle();

      console.log(
        'SOKA PROFILE RESULT:',
        result
      );

      if (result.error) {

        console.error(
          'PROFILE ERROR:',
          result.error
        );

        toast(
          'تم تسجيل الدخول، لكن تعذر قراءة صلاحية المدير. تحقق من RLS في profiles.',
          true
        );

      } else if (result.data) {

        console.log(
          'SOKA PROFILE:',
          result.data
        );

        if (
          String(result.data.role)
            .toLowerCase()
            .trim() === 'admin'
        ) {

          isAdmin = true;

          console.log(
            'SOKA: ADMIN DETECTED'
          );

          adminNav?.classList.remove(
            'hidden'
          );

          admin?.classList.remove(
            'hidden'
          );

          toast(
            'تم تسجيل الدخول كمدير. لوحة التحكم متاحة الآن.'
          );

        } else {

          console.log(
            'SOKA: USER ROLE =',
            result.data.role
          );

          adminNav?.classList.add(
            'hidden'
          );
        }

      } else {

        console.warn(
          'SOKA: لا يوجد profile لهذا المستخدم'
        );

        toast(
          'الحساب موجود لكن لا يوجد له سجل في profiles.',
          true
        );
      }

    } catch (error) {

      console.error(
        'setUser profile error:',
        error
      );

      toast(
        'حدث خطأ أثناء التحقق من صلاحية المدير.',
        true
      );
    }
  }

  // =========================================================
  // LOGIN
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

    const button =
      event.submitter;

    if (button) {
      button.disabled = true;
      button.textContent =
        'جاري الدخول...';
    }

    try {

      console.log(
        'SOKA: محاولة تسجيل الدخول'
      );

      const result =
        await client.auth.signInWithPassword({
          email,
          password
        });

      console.log(
        'LOGIN RESULT:',
        result
      );

      if (result.error) {

        console.error(
          'LOGIN ERROR:',
          result.error
        );

        toast(
          result.error.message,
          true
        );

        return;
      }

      await setUser(
        result.data?.user || null
      );

      toast(
        'تم تسجيل الدخول بنجاح.'
      );

      location.hash =
        '#home';

      // محاولة إظهار لوحة التحكم إذا كان Admin
      setTimeout(() => {

        if (isAdmin) {
          const nav =
            $('#adminNav');

          nav?.classList.remove(
            'hidden'
          );
        }

      }, 300);

    } catch (error) {

      console.error(
        'LOGIN EXCEPTION:',
        error
      );

      toast(
        error.message ||
        'حدث خطأ أثناء تسجيل الدخول.',
        true
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent =
          'دخول';
      }
    }
  }

  // =========================================================
  // SIGNUP
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

      console.log(
        'SIGNUP RESULT:',
        result
      );

      if (result.error) {

        toast(
          result.error.message,
          true
        );

        return;
      }

      if (result.data?.session) {

        await setUser(
          result.data.user
        );

        toast(
          'تم إنشاء الحساب بنجاح.'
        );

        location.hash =
          '#home';

      } else {

        toast(
          'تم إنشاء الحساب. تحقق من البريد الإلكتروني إذا كان التحقق مفعّلًا.'
        );
      }

    } catch (error) {

      console.error(
        'SIGNUP ERROR:',
        error
      );

      toast(
        error.message ||
        'حدث خطأ أثناء إنشاء الحساب.',
        true
      );
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logoutUser() {

    if (!client) return;

    const result =
      await client.auth.signOut();

    console.log(
      'LOGOUT:',
      result
    );

    currentUser = null;
    isAdmin = false;

    $('#adminNav')
      ?.classList.add('hidden');

    $('#logoutBtn')
      ?.classList.add('hidden');

    location.hash =
      '#home';

    toast(
      'تم تسجيل الخروج.'
    );
  }

  // =========================================================
  // ADMIN
  // =========================================================

  async function renderAdmin() {

    if (!currentUser) {

      toast(
        'يجب تسجيل الدخول أولًا.',
        true
      );

      location.hash =
        '#login';

      return;
    }

    if (!isAdmin) {

      toast(
        'هذا الحساب ليس Admin.',
        true
      );

      location.hash =
        '#home';

      return;
    }

    showOnly('admin');

    const admin =
      $('#admin');

    admin?.classList.remove(
      'hidden'
    );

    const stats =
      $('#stats');

    if (stats) {

      stats.innerHTML = `
        <div class="stat">
          <strong>✓</strong>
          <span>مدير SOKA</span>
        </div>

        <div class="stat">
          <strong>🎬</strong>
          <span>الأفلام</span>
        </div>

        <div class="stat">
          <strong>📺</strong>
          <span>المسلسلات</span>
        </div>

        <div class="stat">
          <strong>📥</strong>
          <span>TVmaze</span>
        </div>
      `;
    }

    const movies =
      $('#moviesAdmin');

    if (movies) {

      movies.innerHTML = `
        <div class="panel">
          <h3>🎬 إدارة الأفلام</h3>

          <p>
            تم تسجيل الدخول بصلاحية المدير بنجاح.
          </p>

          <p class="muted">
            سنضيف هنا إضافة وتعديل وحذف الأفلام.
          </p>
        </div>
      `;
    }

    const series =
      $('#seriesAdmin');

    if (series) {

      series.innerHTML = `
        <div class="panel">
          <h3>📺 إدارة المسلسلات</h3>

          <p>
            لوحة المسلسلات جاهزة.
          </p>

          <p class="muted">
            سيتم إضافة TVmaze في الخطوة التالية.
          </p>
        </div>
      `;
    }

    const seasons =
      $('#seasonsAdmin');

    if (seasons) {

      seasons.innerHTML = `
        <div class="panel">
          <h3>📚 المواسم</h3>
          <p>إدارة مواسم المسلسلات.</p>
        </div>
      `;
    }

    const episodes =
      $('#episodesAdmin');

    if (episodes) {

      episodes.innerHTML = `
        <div class="panel">
          <h3>🎞️ الحلقات</h3>
          <p>إدارة حلقات المسلسلات.</p>
        </div>
      `;
    }

    console.log(
      'SOKA ADMIN DASHBOARD OPENED'
    );
  }

  // =========================================================
  // ROUTER
  // =========================================================

  async function route() {

    const hash =
      location.hash ||
      '#home';

    console.log(
      'SOKA ROUTE:',
      hash,
      'ADMIN:',
      isAdmin
    );

    if (hash === '#admin') {

      await renderAdmin();

      return;
    }

    showSections();

    if (
      hash === '#login'
    ) {

      showOnly('login');

      return;
    }

    if (
      hash === '#home'
    ) {

      showSections();

      return;
    }
  }

  // =========================================================
  // EVENTS
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
  }

  // =========================================================
  // START
  // =========================================================

  async function start() {

    console.log(
      '================================'
    );

    console.log(
      'SOKA STARTING...'
    );

    console.log(
      'CONFIG:',
      cfg
    );

    console.log(
      'SUPABASE:',
      !!client
    );

    console.log(
      '================================'
    );

    setupEvents();

    if (!client) {

      toast(
        'فشل الاتصال بـ Supabase.',
        true
      );

      return;
    }

    await checkSession();

    await route();
  }

  start();

})();
