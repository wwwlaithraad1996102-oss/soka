(() => {
  'use strict';

  const cfg = window.SOKA_CONFIG || {};

  const show = (message, type = '') => {
    const box = document.getElementById('message');
    if (!box) {
      alert(message);
      return;
    }

    box.textContent = message;
    box.className = 'message ' + type;
  };

  // فحص الإعدادات
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    show(
      'خطأ: لم يتم العثور على إعدادات Supabase في config.js',
      'error'
    );
    return;
  }

  // فحص مكتبة Supabase
  if (!window.supabase) {
    show(
      'خطأ: مكتبة Supabase لم يتم تحميلها.',
      'error'
    );
    return;
  }

  const supabase = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey
  );

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const userInfo = document.getElementById('userInfo');

  function updateUI(user) {
    if (user) {
      if (userInfo) {
        userInfo.innerHTML =
          '✅ تم تسجيل الدخول<br>' +
          'البريد: ' +
          user.email;
      }

      if (loginForm) {
        loginForm.classList.add('hidden');
      }

      if (signupForm) {
        signupForm.classList.add('hidden');
      }

      if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
      }

      return;
    }

    if (userInfo) {
      userInfo.textContent = 'لم يتم تسجيل الدخول';
    }

    if (loginForm) {
      loginForm.classList.remove('hidden');
    }

    if (signupForm) {
      signupForm.classList.remove('hidden');
    }

    if (logoutBtn) {
      logoutBtn.classList.add('hidden');
    }
  }

  // التحقق من الجلسة الحالية
  async function checkSession() {
    try {
      const {
        data,
        error
      } = await supabase.auth.getSession();

      if (error) {
        console.error(error);
        show(
          'خطأ في قراءة الجلسة: ' + error.message,
          'error'
        );
        return;
      }

      updateUI(data.session?.user || null);

    } catch (error) {
      console.error(error);

      show(
        'خطأ غير متوقع: ' + error.message,
        'error'
      );
    }
  }

  // تسجيل الدخول
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    show('جاري تسجيل الدخول…');

    const email =
      document.getElementById('email')?.value.trim();

    const password =
      document.getElementById('password')?.value;

    if (!email || !password) {
      show(
        'أدخل البريد الإلكتروني وكلمة المرور.',
        'error'
      );
      return;
    }

    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('LOGIN RESULT:', data, error);

      if (error) {
        show(
          '❌ فشل تسجيل الدخول: ' +
          error.message,
          'error'
        );
        return;
      }

      if (!data.user) {
        show(
          '❌ لم يتم العثور على المستخدم بعد تسجيل الدخول.',
          'error'
        );
        return;
      }

      updateUI(data.user);

      show(
        '✅ تم تسجيل الدخول بنجاح.',
        'success'
      );

    } catch (error) {
      console.error(error);

      show(
        '❌ خطأ: ' + error.message,
        'error'
      );
    }
  });

  // إنشاء حساب
  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    show('جاري إنشاء الحساب…');

    const name =
      document.getElementById('signupName')?.value.trim();

    const email =
      document.getElementById('signupEmail')?.value.trim();

    const password =
      document.getElementById('signupPassword')?.value;

    if (!name || !email || !password) {
      show(
        'املأ جميع الحقول.',
        'error'
      );
      return;
    }

    if (password.length < 6) {
      show(
        'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
        'error'
      );
      return;
    }

    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      console.log('SIGNUP RESULT:', data, error);

      if (error) {
        show(
          '❌ فشل إنشاء الحساب: ' +
          error.message,
          'error'
        );
        return;
      }

      if (data.session) {
        updateUI(data.user);

        show(
          '✅ تم إنشاء الحساب وتسجيل الدخول.',
          'success'
        );
      } else {
        show(
          '✅ تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.',
          'success'
        );
      }

    } catch (error) {
      console.error(error);

      show(
        '❌ خطأ: ' + error.message,
        'error'
      );
    }
  });

  // تسجيل الخروج
  logoutBtn?.addEventListener('click', async () => {
    try {
      const {
        error
      } = await supabase.auth.signOut();

      if (error) {
        show(
          '❌ فشل تسجيل الخروج: ' +
          error.message,
          'error'
        );
        return;
      }

      updateUI(null);

      show(
        'تم تسجيل الخروج.',
        'success'
      );

    } catch (error) {
      show(
        '❌ خطأ: ' + error.message,
        'error'
      );
    }
  });

  // مراقبة تغير الجلسة
  supabase.auth.onAuthStateChange(
    (_event, session) => {
      console.log(
        'AUTH EVENT:',
        _event,
        session
      );

      updateUI(
        session?.user || null
      );
    }
  );

  checkSession();

})();
