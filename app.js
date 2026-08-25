(() => {
  "use strict";

  console.log("SOKA app.js started");

  const cfg = window.SOKA_CONFIG || {};

  let supabaseClient = null;
  let currentUser = null;
  let isAdmin = false;

  // =====================================================
  // إنشاء اتصال Supabase
  // =====================================================

  try {
    if (
      cfg.supabaseUrl &&
      cfg.supabaseAnonKey &&
      window.supabase
    ) {
      supabaseClient = window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabaseAnonKey
      );
    }
  } catch (error) {
    console.error("Supabase initialization error:", error);
  }

  // =====================================================
  // أدوات
  // =====================================================

  function $(id) {
    return document.getElementById(id);
  }

  function showMessage(message, type = "info") {
    let box = $("message");

    if (!box) {
      box = document.createElement("div");
      box.id = "message";

      box.style.position = "fixed";
      box.style.top = "20px";
      box.style.left = "20px";
      box.style.right = "20px";
      box.style.zIndex = "99999";
      box.style.padding = "15px";
      box.style.borderRadius = "10px";
      box.style.fontSize = "16px";
      box.style.textAlign = "center";
      box.style.background = "#15151c";
      box.style.color = "#fff";

      document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "error") {
      box.style.background = "#8b1e1e";
    } else if (type === "success") {
      box.style.background = "#176b3a";
    } else {
      box.style.background = "#15151c";
    }

    box.style.display = "block";

    setTimeout(() => {
      if (box) {
        box.style.display = "none";
      }
    }, 5000);
  }

  // =====================================================
  // إخفاء كل الصفحات
  // =====================================================

  function hideAllSections() {
    document
      .querySelectorAll("main > section")
      .forEach(section => {
        section.style.display = "none";
      });
  }

  // =====================================================
  // الصفحة الرئيسية
  // =====================================================

  function showHome() {
    hideAllSections();

    const home = $("home");

    if (home) {
      home.style.display = "block";
    }

    updateUserInterface();
  }

  // =====================================================
  // صفحة تسجيل الدخول
  // =====================================================

  function showLogin() {
    hideAllSections();

    const login = $("login");

    if (login) {
      login.style.display = "block";
    }
  }

  // =====================================================
  // لوحة التحكم
  // =====================================================

  function showAdmin() {
    hideAllSections();

    const admin = $("admin");

    if (!admin) {
      showMessage(
        "لم يتم العثور على قسم لوحة التحكم داخل index.html",
        "error"
      );
      return;
    }

    admin.style.display = "block";

    updateUserInterface();

    loadAdmin();
  }

  // =====================================================
  // واجهة المستخدم
  // =====================================================

  function updateUserInterface() {

    const authNav = $("authNav");
    const logoutBtn = $("logoutBtn");
    const adminNav = $("adminNav");

    if (currentUser) {

      if (authNav) {
        authNav.textContent =
          currentUser.email || "حسابي";

        authNav.href = "#home";
      }

      if (logoutBtn) {
        logoutBtn.style.display = "inline-block";
      }

      if (adminNav) {
        if (isAdmin) {
          adminNav.style.display = "inline-block";
        } else {
          adminNav.style.display = "none";
        }
      }

    } else {

      if (authNav) {
        authNav.textContent = "تسجيل الدخول";
        authNav.href = "#login";
      }

      if (logoutBtn) {
        logoutBtn.style.display = "none";
      }

      if (adminNav) {
        adminNav.style.display = "none";
      }
    }
  }

  // =====================================================
  // التحقق من المدير
  // =====================================================

  async function checkAdmin(user) {

    isAdmin = false;

    if (!user || !supabaseClient) {
      updateUserInterface();
      return;
    }

    try {

      console.log("Checking admin:", user.id);

      const result =
        await supabaseClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      console.log("Profile result:", result);

      if (result.error) {

        console.error(
          "Profile/RLS error:",
          result.error
        );

        /*
         لا نوقف الموقع هنا.
         حتى لو كان هناك خطأ RLS سيبقى الموقع يعمل.
        */

        isAdmin = false;

      } else if (
        result.data &&
        result.data.role === "admin"
      ) {

        isAdmin = true;

        console.log(
          "SOKA ADMIN: YES"
        );

      } else {

        isAdmin = false;

      }

    } catch (error) {

      console.error(
        "Admin check failed:",
        error
      );

      isAdmin = false;
    }

    updateUserInterface();
  }

  // =====================================================
  // فحص جلسة المستخدم
  // =====================================================

  async function checkSession() {

    if (!supabaseClient) {

      console.error(
        "Supabase client not available"
      );

      showMessage(
        "تعذر الاتصال بـ Supabase. تحقق من config.js",
        "error"
      );

      return;
    }

    try {

      const result =
        await supabaseClient.auth.getSession();

      console.log(
        "Session:",
        result
      );

      if (
        result.data &&
        result.data.session
      ) {

        currentUser =
          result.data.session.user;

        await checkAdmin(currentUser);

      } else {

        currentUser = null;
        isAdmin = false;

        updateUserInterface();
      }

    } catch (error) {

      console.error(
        "Session error:",
        error
      );

      showMessage(
        "حدث خطأ أثناء فحص تسجيل الدخول.",
        "error"
      );
    }
  }

  // =====================================================
  // تسجيل الدخول
  // =====================================================

  async function login(event) {

    event.preventDefault();

    if (!supabaseClient) {

      showMessage(
        "Supabase غير متصل.",
        "error"
      );

      return;
    }

    const email =
      $("email")?.value.trim();

    const password =
      $("password")?.value;

    if (!email || !password) {

      showMessage(
        "أدخل البريد الإلكتروني وكلمة المرور.",
        "error"
      );

      return;
    }

    const button =
      event.target.querySelector(
        'button[type="submit"]'
      );

    if (button) {
      button.disabled = true;
      button.textContent = "جاري الدخول...";
    }

    try {

      const result =
        await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

      console.log(
        "Login result:",
        result
      );

      if (result.error) {

        showMessage(
          result.error.message,
          "error"
        );

        return;
      }

      currentUser =
        result.data.user;

      await checkAdmin(currentUser);

      showMessage(
        isAdmin
          ? "تم تسجيل الدخول بنجاح — أنت المدير."
          : "تم تسجيل الدخول بنجاح.",
        "success"
      );

      location.hash = "#home";

      showHome();

    } catch (error) {

      console.error(
        "Login exception:",
        error
      );

      showMessage(
        "حدث خطأ أثناء تسجيل الدخول.",
        "error"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent = "دخول";
      }
    }
  }

  // =====================================================
  // إنشاء حساب
  // =====================================================

  async function signup(event) {

    event.preventDefault();

    if (!supabaseClient) {

      showMessage(
        "Supabase غير متصل.",
        "error"
      );

      return;
    }

    const name =
      $("signupName")?.value.trim();

    const email =
      $("signupEmail")?.value.trim();

    const password =
      $("signupPassword")?.value;

    if (!name || !email || !password) {

      showMessage(
        "املأ جميع الحقول.",
        "error"
      );

      return;
    }

    if (password.length < 6) {

      showMessage(
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
        "error"
      );

      return;
    }

    const button =
      event.target.querySelector(
        'button[type="submit"]'
      );

    if (button) {
      button.disabled = true;
      button.textContent = "جاري إنشاء الحساب...";
    }

    try {

      const result =
        await supabaseClient.auth.signUp({

          email: email,

          password: password,

          options: {
            data: {
              full_name: name
            }
          }

        });

      console.log(
        "Signup result:",
        result
      );

      if (result.error) {

        showMessage(
          result.error.message,
          "error"
        );

        return;
      }

      if (result.data.session) {

        currentUser =
          result.data.user;

        await checkAdmin(currentUser);

        showMessage(
          "تم إنشاء الحساب وتسجيل الدخول بنجاح.",
          "success"
        );

        location.hash = "#home";

        showHome();

      } else {

        showMessage(
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا كان تأكيد البريد مفعّلًا.",
          "success"
        );
      }

    } catch (error) {

      console.error(
        "Signup exception:",
        error
      );

      showMessage(
        "حدث خطأ أثناء إنشاء الحساب.",
        "error"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent = "إنشاء حساب";
      }
    }
  }

  // =====================================================
  // تسجيل الخروج
  // =====================================================

  async function logout() {

    if (!supabaseClient) {
      return;
    }

    try {

      await supabaseClient.auth.signOut();

      currentUser = null;
      isAdmin = false;

      updateUserInterface();

      location.hash = "#home";

      showHome();

      showMessage(
        "تم تسجيل الخروج.",
        "success"
      );

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );
    }
  }

  // =====================================================
  // تحميل لوحة التحكم
  // =====================================================

  async function loadAdmin() {

    const adminContent =
      $("adminContent");

    if (adminContent) {

      adminContent.innerHTML = `
        <div style="
          padding:20px;
          background:#111118;
          border-radius:15px;
          margin-top:20px;
        ">
          <h2>⚙️ لوحة تحكم SOKA</h2>

          <p>
            مرحبًا بك يا مدير SOKA
          </p>

          <p>
            البريد:
            ${
              currentUser
                ? currentUser.email
                : ""
            }
          </p>

          <p>
            صلاحية المدير:
            ${
              isAdmin
                ? "✅ Admin"
                : "❌ غير متاحة"
            }
          </p>

          <hr>

          <h3>🎬 الأفلام</h3>

          <p>
            سيتم إضافة إدارة الأفلام هنا في الخطوة التالية.
          </p>

          <h3>📺 المسلسلات</h3>

          <p>
            سيتم إضافة إدارة المسلسلات هنا في الخطوة التالية.
          </p>

          <h3>📥 TVmaze</h3>

          <p>
            سيتم إضافة مستورد TVmaze هنا في الخطوة التالية.
          </p>
        </div>
      `;

      return;
    }

    /*
      إذا لم يكن adminContent موجودًا
      نستخدم قسم admin نفسه.
    */

    const admin =
      $("admin");

    if (admin) {

      let box =
        admin.querySelector(
          ".soka-admin-box"
        );

      if (!box) {

        box =
          document.createElement(
            "div"
          );

        box.className =
          "soka-admin-box";

        box.style.padding =
          "20px";

        box.style.marginTop =
          "20px";

        box.style.background =
          "#111118";

        box.style.borderRadius =
          "15px";

        admin.appendChild(box);
      }

      box.innerHTML = `

        <h2>
          ⚙️ لوحة تحكم SOKA
        </h2>

        <p>
          أهلاً بك في لوحة التحكم.
        </p>

        <p>
          المدير:
          ${
            currentUser?.email || ""
          }
        </p>

        <p>
          الصلاحية:
          ${
            isAdmin
              ? "✅ Admin"
              : "⚠️ لم يتم تأكيد صلاحية المدير"
          }
        </p>

        <hr>

        <h3>🎬 الأفلام</h3>
        <p>إدارة الأفلام ستكون هنا.</p>

        <h3>📺 المسلسلات</h3>
        <p>إدارة المسلسلات ستكون هنا.</p>

        <h3>📥 TVmaze</h3>
        <p>استيراد المسلسلات سيكون هنا.</p>
      `;
    }
  }

  // =====================================================
  // Router
  // =====================================================

  function route() {

    const hash =
      location.hash || "#home";

    console.log(
      "SOKA route:",
      hash
    );

    if (hash === "#login") {

      showLogin();
      return;
    }

    if (hash === "#admin") {

      if (!currentUser) {

        showMessage(
          "يجب تسجيل الدخول أولًا.",
          "error"
        );

        location.hash = "#login";
        return;
      }

      if (!isAdmin) {

        showMessage(
          "الحساب مسجل الدخول، لكن صلاحية المدير غير متاحة.",
          "error"
        );

        showHome();
        return;
      }

      showAdmin();
      return;
    }

    showHome();
  }

  // =====================================================
  // الأحداث
  // =====================================================

  function setupEvents() {

    $("loginForm")?.addEventListener(
      "submit",
      login
    );

    $("signupForm")?.addEventListener(
      "submit",
      signup
    );

    $("logoutBtn")?.addEventListener(
      "click",
      logout
    );

    window.addEventListener(
      "hashchange",
      route
    );
  }

  // =====================================================
  // تشغيل SOKA
  // =====================================================

  async function start() {

    console.log(
      "Starting SOKA..."
    );

    setupEvents();

    await checkSession();

    route();

    console.log(
      "SOKA started successfully"
    );
  }

  // =====================================================
  // حماية من الشاشة البيضاء
  // =====================================================

  window.addEventListener(
    "error",
    event => {

      console.error(
        "SOKA JavaScript error:",
        event.error
      );

      showMessage(
        "حدث خطأ في الموقع. افتح Console لمعرفة التفاصيل.",
        "error"
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    event => {

      console.error(
        "SOKA Promise error:",
        event.reason
      );

      showMessage(
        "حدث خطأ أثناء تنفيذ العملية.",
        "error"
      );
    }
  );

  start();

})();
