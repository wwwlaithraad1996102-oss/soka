(() => {
  "use strict";

  console.log("SOKA app.js started");

  // =====================================================
  // إعداد Supabase
  // =====================================================

  const cfg = window.SOKA_CONFIG || {};

  let supabaseClient = null;
  let currentUser = null;
  let isAdmin = false;

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

      console.log("Supabase connected");
    } else {
      console.error("Supabase configuration missing");
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

      Object.assign(box.style, {
        position: "fixed",
        top: "20px",
        left: "20px",
        right: "20px",
        zIndex: "999999",
        padding: "15px",
        borderRadius: "12px",
        fontSize: "16px",
        textAlign: "center",
        color: "#fff",
        fontWeight: "600",
        boxShadow: "0 10px 30px rgba(0,0,0,.4)"
      });

      document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "error") {
      box.style.background = "#a51d2d";
    } else if (type === "success") {
      box.style.background = "#18794e";
    } else {
      box.style.background = "#24242d";
    }

    box.style.display = "block";

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      box.style.display = "none";
    }, 5000);
  }

  // =====================================================
  // إظهار عنصر مخفي
  // =====================================================

  function showElement(element, display = "") {
    if (!element) return;

    element.classList.remove("hidden");

    element.removeAttribute("hidden");

    element.style.removeProperty("display");

    if (display) {
      element.style.setProperty("display", display, "important");
    }
  }

  // =====================================================
  // إخفاء عنصر
  // =====================================================

  function hideElement(element) {
    if (!element) return;

    element.classList.add("hidden");

    element.style.setProperty(
      "display",
      "none",
      "important"
    );
  }

  // =====================================================
  // إخفاء الأقسام
  // =====================================================

  function hideAllSections() {
    document
      .querySelectorAll("main > section")
      .forEach(section => {
        hideElement(section);
      });
  }

  // =====================================================
  // تحديث واجهة المستخدم
  // =====================================================

  function updateUserInterface() {
    const authNav = $("authNav");
    const logoutBtn = $("logoutBtn");
    const adminNav = $("adminNav");

    console.log("Updating UI:", {
      user: currentUser?.email,
      admin: isAdmin
    });

    // ---------------------------------------------
    // المستخدم مسجل الدخول
    // ---------------------------------------------

    if (currentUser) {

      if (authNav) {
        authNav.textContent =
          currentUser.email || "حسابي";

        authNav.href = "#home";
      }

      // إظهار زر تسجيل الخروج
      if (logoutBtn) {
        showElement(logoutBtn, "inline-block");
      }

      // إظهار لوحة التحكم للمدير
      if (adminNav) {

        if (isAdmin) {
          showElement(adminNav, "inline-block");

          console.log(
            "Admin navigation shown"
          );
        } else {
          hideElement(adminNav);
        }
      }

    } else {

      // ---------------------------------------------
      // لا يوجد مستخدم
      // ---------------------------------------------

      if (authNav) {
        authNav.textContent = "تسجيل الدخول";
        authNav.href = "#login";
      }

      if (logoutBtn) {
        hideElement(logoutBtn);
      }

      if (adminNav) {
        hideElement(adminNav);
      }
    }
  }

  // =====================================================
  // فحص صلاحية المدير
  // =====================================================

  async function checkAdmin(user) {

    isAdmin = false;

    if (!user || !supabaseClient) {
      updateUserInterface();
      return false;
    }

    console.log(
      "Checking admin profile:",
      user.id
    );

    try {

      const { data, error } =
        await supabaseClient
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();

      console.log("Admin profile:", {
        data,
        error
      });

      if (error) {

        console.error(
          "Profile error:",
          error
        );

        /*
          لا نستخدم profiles.email
          ولا updated_at.
        */

        isAdmin = false;

      } else if (
        data &&
        data.role === "admin"
      ) {

        isAdmin = true;

        console.log(
          "SOKA ADMIN = TRUE"
        );

      } else {

        isAdmin = false;

        console.log(
          "User is not admin"
        );
      }

    } catch (error) {

      console.error(
        "checkAdmin exception:",
        error
      );

      isAdmin = false;
    }

    updateUserInterface();

    return isAdmin;
  }

  // =====================================================
  // فحص الجلسة
  // =====================================================

  async function checkSession() {

    if (!supabaseClient) {

      showMessage(
        "تعذر الاتصال بـ Supabase. تحقق من config.js",
        "error"
      );

      return;
    }

    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth.getSession();

      console.log(
        "Current session:",
        data
      );

      if (error) {

        console.error(
          "getSession error:",
          error
        );

        return;
      }

      if (
        data &&
        data.session &&
        data.session.user
      ) {

        currentUser =
          data.session.user;

        await checkAdmin(currentUser);

      } else {

        currentUser = null;
        isAdmin = false;

        updateUserInterface();
      }

    } catch (error) {

      console.error(
        "Session exception:",
        error
      );

      showMessage(
        "حدث خطأ أثناء فحص جلسة الدخول.",
        "error"
      );
    }
  }

  // =====================================================
  // الصفحة الرئيسية
  // =====================================================

  function showHome() {

    hideAllSections();

    const home = $("home");

    if (home) {
      showElement(home, "block");
    }

    updateUserInterface();

    console.log("Home displayed");
  }

  // =====================================================
  // تسجيل الدخول
  // =====================================================

  async function login(event) {

    event.preventDefault();

    console.log("Login started");

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

      const {
        data,
        error
      } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      console.log(
        "Login response:",
        {
          data,
          error
        }
      );

      if (error) {

        console.error(
          "Login error:",
          error
        );

        showMessage(
          error.message ||
          "فشل تسجيل الدخول.",
          "error"
        );

        return;
      }

      if (!data || !data.user) {

        showMessage(
          "تم الدخول لكن لم يتم العثور على المستخدم.",
          "error"
        );

        return;
      }

      currentUser = data.user;

      // فحص المدير
      await checkAdmin(currentUser);

      // تحديث الواجهة
      updateUserInterface();

      if (isAdmin) {

        showMessage(
          "تم تسجيل الدخول بنجاح — أنت المدير ✅",
          "success"
        );

      } else {

        showMessage(
          "تم تسجيل الدخول بنجاح.",
          "success"
        );
      }

      location.hash = "#home";

      showHome();

    } catch (error) {

      console.error(
        "Login exception:",
        error
      );

      showMessage(
        error.message ||
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

    console.log("Signup started");

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
      button.textContent =
        "جاري إنشاء الحساب...";
    }

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

      console.log(
        "Signup response:",
        {
          data,
          error
        }
      );

      if (error) {

        showMessage(
          error.message ||
          "فشل إنشاء الحساب.",
          "error"
        );

        return;
      }

      if (
        data &&
        data.session &&
        data.user
      ) {

        currentUser =
          data.user;

        await checkAdmin(currentUser);

        updateUserInterface();

        location.hash = "#home";

        showHome();

        showMessage(
          "تم إنشاء الحساب وتسجيل الدخول بنجاح ✅",
          "success"
        );

      } else {

        showMessage(
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب.",
          "success"
        );
      }

    } catch (error) {

      console.error(
        "Signup exception:",
        error
      );

      showMessage(
        error.message ||
        "حدث خطأ أثناء إنشاء الحساب.",
        "error"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent =
          "إنشاء حساب";
      }
    }
  }

  // =====================================================
  // تسجيل الخروج
  // =====================================================

  async function logout() {

    console.log("Logout started");

    if (!supabaseClient) {
      return;
    }

    try {

      const {
        error
      } =
        await supabaseClient.auth.signOut();

      if (error) {
        throw error;
      }

      currentUser = null;
      isAdmin = false;

      updateUserInterface();

      location.hash = "#home";

      showHome();

      showMessage(
        "تم تسجيل الخروج بنجاح.",
        "success"
      );

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

      showMessage(
        error.message ||
        "تعذر تسجيل الخروج.",
        "error"
      );
    }
  }

  // =====================================================
  // لوحة التحكم
  // =====================================================

  function showAdmin() {

    console.log(
      "Opening admin panel"
    );

    hideAllSections();

    const admin =
      $("admin");

    if (!admin) {

      showMessage(
        "قسم لوحة التحكم غير موجود في index.html",
        "error"
      );

      return;
    }

    // إزالة hidden بشكل إجباري
    showElement(admin, "block");

    updateUserInterface();

    renderAdmin();

    console.log(
      "Admin panel displayed"
    );
  }

  // =====================================================
  // محتوى لوحة التحكم
  // =====================================================

  function renderAdmin() {

    const admin =
      $("admin");

    if (!admin) return;

    let box =
      $("adminContent");

    if (!box) {

      box =
        admin.querySelector(
          ".soka-admin-box"
        );

      if (!box) {

        box =
          document.createElement("div");

        box.className =
          "soka-admin-box";

        admin.appendChild(box);
      }
    }

    box.style.padding = "20px";
    box.style.marginTop = "20px";
    box.style.background = "#111118";
    box.style.borderRadius = "15px";
    box.style.color = "#fff";

    box.innerHTML = `

      <h2>⚙️ لوحة تحكم SOKA</h2>

      <p>
        أهلاً بك في لوحة تحكم SOKA.
      </p>

      <p>
        المدير:
        <strong>
          ${currentUser?.email || ""}
        </strong>
      </p>

      <p>
        الصلاحية:
        <strong>
          ${
            isAdmin
              ? "✅ ADMIN"
              : "❌ غير متاحة"
          }
        </strong>
      </p>

      <hr>

      <h3>🎬 الأفلام</h3>

      <p>
        إدارة الأفلام جاهزة للربط مع جدول movies.
      </p>

      <div id="adminMoviesBox"></div>

      <hr>

      <h3>📺 المسلسلات</h3>

      <p>
        إدارة المسلسلات جاهزة للربط مع جدول series.
      </p>

      <div id="adminSeriesBox"></div>

      <hr>

      <h3>📥 استيراد TVmaze</h3>

      <p>
        سيتم إضافة مستورد TVmaze في الخطوة التالية.
      </p>

      <button
        id="tvmazeImportBtn"
        class="btn"
        type="button"
      >
        📥 استيراد TVmaze
      </button>

    `;

    const tvmazeButton =
      $("tvmazeImportBtn");

    if (tvmazeButton) {

      tvmazeButton.addEventListener(
        "click",
        () => {

          showMessage(
            "مستورد TVmaze سيتم تفعيله في الخطوة التالية.",
            "info"
          );

        }
      );
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

      showLoginPage();

      return;
    }

    if (hash === "#admin") {

      if (!currentUser) {

        showMessage(
          "يجب تسجيل الدخول أولاً.",
          "error"
        );

        location.hash = "#login";

        return;
      }

      if (!isAdmin) {

        showMessage(
          "هذا الحساب ليس لديه صلاحية المدير.",
          "error"
        );

        location.hash = "#home";

        showHome();

        return;
      }

      showAdmin();

      return;
    }

    showHome();
  }

  // =====================================================
  // صفحة تسجيل الدخول
  // =====================================================

  function showLoginPage() {

    hideAllSections();

    const login =
      $("login");

    if (login) {
      showElement(login, "block");
    }

    updateUserInterface();
  }

  // =====================================================
  // أحداث المصادقة
  // =====================================================

  function setupEvents() {

    const loginForm =
      $("loginForm");

    if (loginForm) {

      loginForm.addEventListener(
        "submit",
        login
      );

      console.log(
        "Login form connected"
      );
    }

    const signupForm =
      $("signupForm");

    if (signupForm) {

      signupForm.addEventListener(
        "submit",
        signup
      );

      console.log(
        "Signup form connected"
      );
    }

    const logoutBtn =
      $("logoutBtn");

    if (logoutBtn) {

      logoutBtn.addEventListener(
        "click",
        logout
      );

      console.log(
        "Logout button connected"
      );
    }

    window.addEventListener(
      "hashchange",
      route
    );

    // مراقبة تغيّر حالة Supabase
    if (supabaseClient) {

      supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

          console.log(
            "Auth event:",
            event
          );

          if (session?.user) {

            currentUser =
              session.user;

            /*
              لا نحتاج فحص admin في كل event
              بشكل متكرر، لكن نفحصه عند تسجيل الدخول.
            */

            if (
              event === "SIGNED_IN" ||
              event === "INITIAL_SESSION"
            ) {

              await checkAdmin(
                currentUser
              );

            } else {

              updateUserInterface();
            }

          } else {

            currentUser = null;
            isAdmin = false;

            updateUserInterface();
          }
        }
      );
    }
  }

  // =====================================================
  // حماية الأخطاء
  // =====================================================

  window.addEventListener(
    "error",
    event => {

      console.error(
        "SOKA JS Error:",
        event.error
      );

      showMessage(
        "حدث خطأ في الموقع. راجع Console.",
        "error"
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    event => {

      console.error(
        "SOKA Promise Error:",
        event.reason
      );

      showMessage(
        "حدث خطأ أثناء تنفيذ العملية.",
        "error"
      );
    }
  );

  // =====================================================
  // بدء التطبيق
  // =====================================================

  async function start() {

    console.log(
      "Starting SOKA..."
    );

    setupEvents();

    await checkSession();

    updateUserInterface();

    route();

    console.log(
      "SOKA started successfully"
    );
  }

  start();

})();
