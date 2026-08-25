(() => {
  'use strict';

  console.log('SOKA app.js بدأ التشغيل');

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

  const $ = (selector) =>
    document.querySelector(selector);

  function toast(message, error = false) {
    const el = $('#toast');

    if (el) {
      el.textContent = message;
      el.className =
        'toast show ' +
        (error ? 'error' : '');

      setTimeout(() => {
        el.className = 'toast';
      }, 5000);
    }

    console.log(
      error ? 'SOKA ERROR:' : 'SOKA:',
      message
    );
  }

  // ---------------------------------------------
  // فحص Supabase
  // ---------------------------------------------

  if (!cfg.supabaseUrl) {
    toast(
      'خطأ: supabaseUrl غير موجود في config.js',
      true
    );
    return;
  }

  if (!cfg.supabaseAnonKey) {
    toast(
      'خطأ: supabaseAnonKey غير موجود في config.js',
      true
    );
    return;
  }

  if (!window.supabase) {
    toast(
      'خطأ: مكتبة Supabase لم يتم تحميلها.',
      true
    );
    return;
  }

  if (!client) {
    toast(
      'تعذر إنشاء اتصال Supabase.',
      true
    );
    return;
  }

  console.log('SOKA: Supabase متصل');

  // ---------------------------------------------
  // تسجيل الدخول
  // ---------------------------------------------

  async function loginUser(event) {
    event.preventDefault();

    console.log('SOKA: محاولة تسجيل الدخول');

    const email =
      $('#email')?.value.trim();

    const password =
      $('#password')?.value;

    if (!email) {
      toast(
        'أدخل البريد الإلكتروني.',
        true
      );
      return;
    }

    if (!password) {
      toast(
        'أدخل كلمة المرور.',
        true
      );
      return;
    }

    toast('جاري تسجيل الدخول...');

    try {
      const {
        data,
        error
      } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      console.log(
        'Login result:',
        data,
        error
      );

      if (error) {
        toast(
          'فشل تسجيل الدخول: ' +
          error.message,
          true
        );
        return;
      }

      if (!data?.user) {
        toast(
          'لم يتم العثور على المستخدم.',
          true
        );
        return;
      }

      toast(
        'تم تسجيل الدخول بنجاح.'
      );

      await checkAdmin(
        data.user
      );

      setTimeout(() => {
        location.hash = '#home';
      }, 500);

    } catch (error) {
      console.error(error);

      toast(
        'حدث خطأ أثناء تسجيل الدخول: ' +
        (error.message || error),
        true
      );
    }
  }

  // ---------------------------------------------
  // فحص المدير
  // ---------------------------------------------

  async function checkAdmin(user) {

    console.log(
      'SOKA: فحص صلاحية المستخدم',
      user.id
    );

    try {

      const {
        data,
        error
      } =
        await client
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

      console.log(
        'Profile:',
        data,
        error
      );

      if (error) {
        toast(
          'تم تسجيل الدخول لكن تعذر قراءة صلاحية المدير: ' +
          error.message,
          true
        );
        return;
      }

      if (data?.role === 'admin') {

        console.log(
          'SOKA: المستخدم Admin'
        );

        $('#adminNav')
          ?.classList.remove(
            'hidden'
          );

        toast(
          'تم التعرف على حساب المدير 👑'
        );

      } else {

        console.log(
          'SOKA: المستخدم ليس Admin',
          data
        );

        $('#adminNav')
          ?.classList.add(
            'hidden'
          );
      }

    } catch (error) {

      console.error(
        'Admin check error:',
        error
      );

      toast(
        'خطأ في فحص صلاحية المدير.',
        true
      );
    }
  }

  // ---------------------------------------------
  // جلسة المستخدم الحالية
  // ---------------------------------------------

  async function checkSession() {

    console.log(
      'SOKA: فحص الجلسة'
    );

    try {

      const {
        data,
        error
      } =
        await client.auth.getSession();

      console.log(
        'Session:',
        data,
        error
      );

      if (error) {
        toast(
          'خطأ في الجلسة: ' +
          error.message,
          true
        );
        return;
      }

      if (data?.session?.user) {

        console.log(
          'SOKA: المستخدم مسجل',
          data.session.user
        );

        $('#authNav').textContent =
          'حسابي';

        $('#logoutBtn')
          ?.classList.remove(
            'hidden'
          );

        await checkAdmin(
          data.session.user
        );

      } else {

        console.log(
          'SOKA: لا توجد جلسة'
        );
      }

      client.auth.onAuthStateChange(
        async (_event, session) => {

          console.log(
            'Auth event:',
            _event,
            session
          );

          if (session?.user) {

            $('#logoutBtn')
              ?.classList.remove(
                'hidden'
              );

            await checkAdmin(
              session.user
            );

          } else {

            $('#logoutBtn')
              ?.classList.add(
                'hidden'
              );

            $('#adminNav')
              ?.classList.add(
                'hidden'
              );
          }
        }
      );

    } catch (error) {

      console.error(error);

      toast(
        'تعذر فحص تسجيل الدخول.',
        true
      );
    }
  }

  // ---------------------------------------------
  // تسجيل الخروج
  // ---------------------------------------------

  async function logoutUser() {

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

      toast(
        'تم تسجيل الخروج.'
      );

      $('#logoutBtn')
        ?.classList.add(
          'hidden'
        );

      $('#adminNav')
        ?.classList.add(
          'hidden'
        );

    } catch (error) {

      toast(
        error.message ||
        'حدث خطأ.',
        true
      );
    }
  }

  // ---------------------------------------------
  // الأحداث
  // ---------------------------------------------

  const loginForm =
    $('#loginForm');

  if (!loginForm) {

    toast(
      'خطأ: loginForm غير موجود في index.html',
      true
    );

  } else {

    loginForm.addEventListener(
      'submit',
      loginUser
    );

    console.log(
      'SOKA: loginForm جاهز'
    );
  }

  $('#logoutBtn')
    ?.addEventListener(
      'click',
      logoutUser
    );

  // ---------------------------------------------
  // بدء التطبيق
  // ---------------------------------------------

  checkSession();

  console.log(
    'SOKA: تم تشغيل التطبيق بنجاح'
  );

})();