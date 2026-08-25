(() => {

  'use strict';

  console.log('================================');
  console.log('SOKA AUTH START');
  console.log('================================');


  // =====================================================
  // CONFIG
  // =====================================================

  const config =
    window.SOKA_CONFIG || {};

  console.log(
    'SOKA CONFIG:',
    config
  );


  if (
    !config.supabaseUrl ||
    !config.supabaseAnonKey
  ) {

    console.error(
      'SOKA ERROR: Supabase config missing'
    );

    showMessage(
      'إعدادات Supabase غير موجودة.',
      true
    );

    return;
  }


  // =====================================================
  // SUPABASE
  // =====================================================

  if (
    !window.supabase
  ) {

    console.error(
      'SOKA ERROR: Supabase library not loaded'
    );

    showMessage(
      'تعذر تحميل مكتبة Supabase.',
      true
    );

    return;
  }


  const supabase =
    window.supabase.createClient(
      config.supabaseUrl,
      config.supabaseAnonKey
    );


  console.log(
    'SOKA: Supabase client created'
  );


  // =====================================================
  // ELEMENTS
  // =====================================================

  const loginTab =
    document.getElementById(
      'loginTab'
    );

  const signupTab =
    document.getElementById(
      'signupTab'
    );

  const loginForm =
    document.getElementById(
      'loginForm'
    );

  const signupForm =
    document.getElementById(
      'signupForm'
    );

  const loginButton =
    document.getElementById(
      'loginButton'
    );

  const signupButton =
    document.getElementById(
      'signupButton'
    );

  const logoutButton =
    document.getElementById(
      'logoutButton'
    );

  const authBox =
    document.getElementById(
      'authBox'
    );

  const accountBox =
    document.getElementById(
      'accountBox'
    );

  const accountEmail =
    document.getElementById(
      'accountEmail'
    );


  // =====================================================
  // MESSAGE
  // =====================================================

  function showMessage(
    text,
    error = false,
    success = false
  ) {

    const element =
      document.getElementById(
        'message'
      );

    if (!element) {
      console.log(text);
      return;
    }

    element.textContent =
      text;

    element.className =
      'message show';

    if (error) {
      element.classList.add(
        'error'
      );
    }

    if (success) {
      element.classList.add(
        'success'
      );
    }
  }


  function showAccountMessage(
    text,
    error = false,
    success = false
  ) {

    const element =
      document.getElementById(
        'accountMessage'
      );

    if (!element) return;

    element.textContent =
      text;

    element.className =
      'message show';

    if (error) {
      element.classList.add(
        'error'
      );
    }

    if (success) {
      element.classList.add(
        'success'
      );
    }
  }


  function clearMessage() {

    const element =
      document.getElementById(
        'message'
      );

    if (!element) return;

    element.textContent = '';

    element.className =
      'message';
  }


  // =====================================================
  // TABS
  // =====================================================

  loginTab?.addEventListener(
    'click',
    () => {

      loginTab.classList.add(
        'active'
      );

      signupTab.classList.remove(
        'active'
      );

      loginForm.classList.add(
        'active'
      );

      signupForm.classList.remove(
        'active'
      );

      clearMessage();

    }
  );


  signupTab?.addEventListener(
    'click',
    () => {

      signupTab.classList.add(
        'active'
      );

      loginTab.classList.remove(
        'active'
      );

      signupForm.classList.add(
        'active'
      );

      loginForm.classList.remove(
        'active'
      );

      clearMessage();

    }
  );


  // =====================================================
  // SHOW ACCOUNT
  // =====================================================

  function showAccount(
    user
  ) {

    if (!user) return;

    authBox.style.display =
      'none';

    accountBox.classList.add(
      'show'
    );

    accountEmail.textContent =
      user.email || '';

    console.log(
      'SOKA USER:',
      user
    );
  }


  // =====================================================
  // SHOW AUTH
  // =====================================================

  function showAuth() {

    authBox.style.display =
      'block';

    accountBox.classList.remove(
      'show'
    );

    accountEmail.textContent =
      '';

  }


  // =====================================================
  // LOGIN
  // =====================================================

  loginForm?.addEventListener(
    'submit',
    async event => {

      event.preventDefault();

      console.log(
        'SOKA LOGIN: button clicked'
      );

      clearMessage();

      const email =
        document
          .getElementById(
            'loginEmail'
          )
          .value
          .trim();

      const password =
        document
          .getElementById(
            'loginPassword'
          )
          .value;


      if (!email || !password) {

        showMessage(
          'أدخل البريد الإلكتروني وكلمة المرور.',
          true
        );

        return;
      }


      loginButton.disabled =
        true;

      loginButton.textContent =
        'جاري تسجيل الدخول...';


      try {

        console.log(
          'SOKA LOGIN: contacting Supabase...'
        );


        const {
          data,
          error
        } =
          await supabase.auth
            .signInWithPassword({
              email,
              password
            });


        console.log(
          'SOKA LOGIN RESULT:',
          {
            data,
            error
          }
        );


        if (error) {

          showMessage(
            'خطأ تسجيل الدخول: ' +
            error.message,
            true
          );

          return;
        }


        if (!data?.user) {

          showMessage(
            'لم يتم العثور على بيانات المستخدم.',
            true
          );

          return;
        }


        showMessage(
          'تم تسجيل الدخول بنجاح ✅',
          false,
          true
        );


        setTimeout(() => {

          showAccount(
            data.user
          );

        }, 500);


      } catch (error) {

        console.error(
          'SOKA LOGIN ERROR:',
          error
        );

        showMessage(
          'حدث خطأ: ' +
          (
            error?.message ||
            error
          ),
          true
        );

      } finally {

        loginButton.disabled =
          false;

        loginButton.textContent =
          'تسجيل الدخول';

      }

    }
  );


  // =====================================================
  // SIGNUP
  // =====================================================

  signupForm?.addEventListener(
    'submit',
    async event => {

      event.preventDefault();

      console.log(
        'SOKA SIGNUP: button clicked'
      );

      clearMessage();


      const name =
        document
          .getElementById(
            'signupName'
          )
          .value
          .trim();

      const email =
        document
          .getElementById(
            'signupEmail'
          )
          .value
          .trim();

      const password =
        document
          .getElementById(
            'signupPassword'
          )
          .value;


      if (
        !name ||
        !email ||
        !password
      ) {

        showMessage(
          'املأ جميع الحقول.',
          true
        );

        return;
      }


      if (
        password.length < 6
      ) {

        showMessage(
          'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
          true
        );

        return;
      }


      signupButton.disabled =
        true;

      signupButton.textContent =
        'جاري إنشاء الحساب...';


      try {

        console.log(
          'SOKA SIGNUP: contacting Supabase...'
        );


        const {
          data,
          error
        } =
          await supabase.auth
            .signUp({

              email,

              password,

              options: {

                data: {

                  full_name:
                    name

                }

              }

            });


        console.log(
          'SOKA SIGNUP RESULT:',
          {
            data,
            error
          }
        );


        if (error) {

          showMessage(
            'خطأ إنشاء الحساب: ' +
            error.message,
            true
          );

          return;
        }


        if (
          data?.session &&
          data?.user
        ) {

          showMessage(
            'تم إنشاء الحساب وتسجيل الدخول بنجاح ✅',
            false,
            true
          );

          setTimeout(() => {

            showAccount(
              data.user
            );

          }, 500);

          return;
        }


        showMessage(
          'تم إنشاء الحساب ✅\nإذا كان تأكيد البريد الإلكتروني مفعّلًا في Supabase، افتح بريدك وأكد الحساب ثم سجّل الدخول.',
          false,
          true
        );


      } catch (error) {

        console.error(
          'SOKA SIGNUP ERROR:',
          error
        );

        showMessage(
          'حدث خطأ: ' +
          (
            error?.message ||
            error
          ),
          true
        );

      } finally {

        signupButton.disabled =
          false;

        signupButton.textContent =
          'إنشاء الحساب';

      }

    }
  );


  // =====================================================
  // LOGOUT
  // =====================================================

  logoutButton?.addEventListener(
    'click',
    async () => {

      console.log(
        'SOKA LOGOUT: clicked'
      );


      logoutButton.disabled =
        true;

      try {

        const {
          error
        } =
          await supabase.auth
            .signOut();


        if (error) {

          console.error(
            'SOKA LOGOUT ERROR:',
            error
          );

          showAccountMessage(
            error.message,
            true
          );

          return;
        }


        showAuth();

        showMessage(
          'تم تسجيل الخروج بنجاح.',
          false,
          true
        );


      } catch (error) {

        console.error(
          error
        );

        showAccountMessage(
          'حدث خطأ أثناء تسجيل الخروج.',
          true
        );

      } finally {

        logoutButton.disabled =
          false;

      }

    }
  );


  // =====================================================
  // CHECK CURRENT SESSION
  // =====================================================

  async function checkSession() {

    console.log(
      'SOKA SESSION: checking...'
    );


    try {

      const {
        data,
        error
      } =
        await supabase.auth
          .getSession();


      console.log(
        'SOKA SESSION RESULT:',
        {
          data,
          error
        }
      );


      if (error) {

        showMessage(
          'خطأ في الجلسة: ' +
          error.message,
          true
        );

        return;
      }


      const user =
        data?.session?.user;


      if (user) {

        showAccount(
          user
        );

      } else {

        showAuth();

      }


    } catch (error) {

      console.error(
        'SOKA SESSION ERROR:',
        error
      );

      showMessage(
        'خطأ في الاتصال بـ Supabase: ' +
        (
          error?.message ||
          error
        ),
        true
      );

    }

  }


  // =====================================================
  // AUTH STATE
  // =====================================================

  supabase.auth.onAuthStateChange(
    (
      event,
      session
    ) => {

      console.log(
        'SOKA AUTH EVENT:',
        event
      );

      if (
        session?.user
      ) {

        showAccount(
          session.user
        );

      } else {

        showAuth();

      }

    }
  );


  // =====================================================
  // START
  // =====================================================

  console.log(
    'SOKA: starting authentication test...'
  );


  checkSession();


})();
