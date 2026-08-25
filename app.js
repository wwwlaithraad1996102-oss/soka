(() => {
  "use strict";

  console.log("=================================");
  console.log("SOKA v3 starting...");
  console.log("=================================");

  const cfg = window.SOKA_CONFIG || {};

  let db = null;
  let currentUser = null;
  let isAdmin = false;

  // =====================================================
  // SUPABASE
  // =====================================================

  try {
    if (
      cfg.supabaseUrl &&
      cfg.supabaseAnonKey &&
      window.supabase
    ) {
      db = window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabaseAnonKey
      );

      console.log("Supabase connected.");
    } else {
      console.error("Supabase configuration missing.");
    }
  } catch (error) {
    console.error("Supabase initialization error:", error);
  }

  // =====================================================
  // HELPERS
  // =====================================================

  const $ = id => document.getElementById(id);

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function message(text, type = "info") {
    let box = $("sokaMessage");

    if (!box) {
      box = document.createElement("div");
      box.id = "sokaMessage";

      Object.assign(box.style, {
        position: "fixed",
        top: "20px",
        left: "20px",
        right: "20px",
        zIndex: "999999",
        padding: "15px",
        borderRadius: "12px",
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "600",
        color: "#fff"
      });

      document.body.appendChild(box);
    }

    box.textContent = text;

    if (type === "error") {
      box.style.background = "#a61b1b";
    } else if (type === "success") {
      box.style.background = "#168044";
    } else {
      box.style.background = "#292933";
    }

    box.style.display = "block";

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      box.style.display = "none";
    }, 5000);
  }

  function hideSections() {
    document
      .querySelectorAll("main > section")
      .forEach(section => {
        section.style.display = "none";
      });
  }

  // =====================================================
  // SESSION
  // =====================================================

  async function loadSession() {
    if (!db) {
      message(
        "Supabase غير متصل. تحقق من config.js",
        "error"
      );
      return;
    }

    try {
      const { data, error } =
        await db.auth.getSession();

      if (error) {
        console.error(error);
        return;
      }

      currentUser =
        data?.session?.user || null;

      console.log(
        "Current user:",
        currentUser
      );

      if (currentUser) {
        await checkAdmin();
      } else {
        isAdmin = false;
      }

      updateNav();

    } catch (error) {
      console.error(
        "loadSession error:",
        error
      );
    }
  }

  // =====================================================
  // ADMIN
  // =====================================================

  async function checkAdmin() {
    isAdmin = false;

    if (!currentUser || !db) {
      updateNav();
      return;
    }

    try {
      const { data, error } =
        await db
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .maybeSingle();

      console.log(
        "Admin profile:",
        data,
        error
      );

      if (
        !error &&
        data &&
        data.role === "admin"
      ) {
        isAdmin = true;
      }

    } catch (error) {
      console.error(
        "Admin check error:",
        error
      );
    }

    updateNav();
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  function updateNav() {
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
        logoutBtn.classList.remove("hidden");
        logoutBtn.style.display = "inline-block";
      }

      if (adminNav) {
        if (isAdmin) {
          adminNav.classList.remove("hidden");
          adminNav.style.display = "inline-block";
        } else {
          adminNav.classList.add("hidden");
          adminNav.style.display = "none";
        }
      }

    } else {

      if (authNav) {
        authNav.textContent =
          "تسجيل الدخول";

        authNav.href =
          "#login";
      }

      if (logoutBtn) {
        logoutBtn.classList.add("hidden");
        logoutBtn.style.display = "none";
      }

      if (adminNav) {
        adminNav.classList.add("hidden");
        adminNav.style.display = "none";
      }
    }
  }

  // =====================================================
  // HOME
  // =====================================================

  async function showHome() {
    hideSections();

    const home = $("home");

    if (home) {
      home.style.display = "block";
    }

    updateNav();

    await loadMovies();
    await loadSeries();
  }

  // =====================================================
  // LOGIN
  // =====================================================

  async function login(event) {
    event.preventDefault();

    if (!db) {
      message(
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
      message(
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
      button.textContent =
        "جاري تسجيل الدخول...";
    }

    try {

      const { data, error } =
        await db.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        console.error(error);

        message(
          error.message,
          "error"
        );

        return;
      }

      currentUser =
        data.user;

      await checkAdmin();

      message(
        isAdmin
          ? "تم تسجيل الدخول بنجاح — أنت المدير ✅"
          : "تم تسجيل الدخول بنجاح.",
        "success"
      );

      location.hash = "#home";

      await showHome();

    } catch (error) {

      console.error(error);

      message(
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
  // SIGNUP
  // =====================================================

  async function signup(event) {
    event.preventDefault();

    if (!db) {
      message(
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
      message(
        "املأ جميع الحقول.",
        "error"
      );
      return;
    }

    if (password.length < 6) {
      message(
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

      const { data, error } =
        await db.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });

      if (error) {
        console.error(error);

        message(
          error.message,
          "error"
        );

        return;
      }

      if (data.session) {

        currentUser =
          data.user;

        await checkAdmin();

        message(
          "تم إنشاء الحساب بنجاح.",
          "success"
        );

        location.hash = "#home";

        await showHome();

      } else {

        message(
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب.",
          "success"
        );
      }

    } catch (error) {

      console.error(error);

      message(
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
  // LOGOUT
  // =====================================================

  async function logout() {

    if (!db) return;

    try {

      const { error } =
        await db.auth.signOut();

      if (error) {
        throw error;
      }

      currentUser = null;
      isAdmin = false;

      updateNav();

      location.hash = "#home";

      await showHome();

      message(
        "تم تسجيل الخروج.",
        "success"
      );

    } catch (error) {

      console.error(error);

      message(
        "تعذر تسجيل الخروج.",
        "error"
      );
    }
  }

  // =====================================================
  // LOGIN PAGE
  // =====================================================

  function showLogin() {

    hideSections();

    const login =
      $("login");

    if (login) {
      login.style.display = "block";
    }
  }

  // =====================================================
  // LOAD MOVIES
  // =====================================================

  async function loadMovies() {

    const grid =
      $("movieGrid");

    if (!grid || !db) return;

    grid.innerHTML =
      '<div class="loading">جاري تحميل الأفلام…</div>';

    try {

      const { data, error } =
        await db
          .from("movies")
          .select("*")
          .order(
            "created_at",
            { ascending: false }
          );

      if (error) {
        console.error(error);

        grid.innerHTML =
          "<p>تعذر تحميل الأفلام.</p>";

        return;
      }

      if (!data || !data.length) {

        grid.innerHTML =
          "<p>لا توجد أفلام حاليًا.</p>";

        return;
      }

      grid.innerHTML =
        data.map(movie => {

          const poster =
            movie.poster_url ||
            "https://via.placeholder.com/300x450?text=SOKA";

          return `
            <article class="card">
              <img
                src="${escapeHtml(poster)}"
                alt="${escapeHtml(movie.title)}"
                loading="lazy"
              >

              <h3>
                ${escapeHtml(movie.title)}
              </h3>

              ${
                movie.year
                  ? `<p>${movie.year}</p>`
                  : ""
              }
            </article>
          `;

        }).join("");

    } catch (error) {

      console.error(error);

      grid.innerHTML =
        "<p>حدث خطأ أثناء تحميل الأفلام.</p>";
    }
  }

  // =====================================================
  // LOAD SERIES
  // =====================================================

  async function loadSeries() {

    const grid =
      $("seriesGrid");

    if (!grid || !db) return;

    grid.innerHTML =
      '<div class="loading">جاري تحميل المسلسلات…</div>';

    try {

      const { data, error } =
        await db
          .from("series")
          .select("*")
          .order(
            "created_at",
            { ascending: false }
          );

      if (error) {

        console.error(error);

        grid.innerHTML =
          "<p>تعذر تحميل المسلسلات.</p>";

        return;
      }

      if (!data || !data.length) {

        grid.innerHTML =
          "<p>لا توجد مسلسلات حاليًا.</p>";

        return;
      }

      grid.innerHTML =
        data.map(show => {

          const poster =
            show.poster_url ||
            "https://via.placeholder.com/300x450?text=SOKA";

          return `
            <article class="card">
              <img
                src="${escapeHtml(poster)}"
                alt="${escapeHtml(show.title)}"
                loading="lazy"
              >

              <h3>
                ${escapeHtml(show.title)}
              </h3>

              ${
                show.year
                  ? `<p>${show.year}</p>`
                  : ""
              }
            </article>
          `;

        }).join("");

    } catch (error) {

      console.error(error);

      grid.innerHTML =
        "<p>حدث خطأ أثناء تحميل المسلسلات.</p>";
    }
  }

  // =====================================================
  // ADMIN PAGE
  // =====================================================

  async function showAdmin() {

    hideSections();

    const admin =
      $("admin");

    if (!admin) {
      message(
        "قسم لوحة التحكم غير موجود في index.html.",
        "error"
      );
      return;
    }

    admin.style.display = "block";

    if (!currentUser) {
      location.hash = "#login";
      return;
    }

    await checkAdmin();

    if (!isAdmin) {

      message(
        "ليس لديك صلاحية المدير.",
        "error"
      );

      location.hash = "#home";

      return;
    }

    renderAdmin();

    await refreshAdminData();
  }

  // =====================================================
  // ADMIN UI
  // =====================================================

  function renderAdmin() {

    const admin =
      $("admin");

    if (!admin) return;

    admin.innerHTML = `

      <div class="soka-admin-box"
        style="
          padding:22px;
          background:#111118;
          border-radius:18px;
          margin-top:20px;
        ">

        <h2>
          ⚙️ لوحة تحكم SOKA
        </h2>

        <p>
          المدير:
          <strong>
            ${escapeHtml(
              currentUser?.email || ""
            )}
          </strong>
        </p>

        <p>
          الصلاحية:
          <strong>
            ADMIN ✅
          </strong>
        </p>

        <hr>

        <div style="
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          margin:20px 0;
        ">

          <button
            id="openMoviesAdmin"
            class="btn">
            🎬 الأفلام
          </button>

          <button
            id="openSeriesAdmin"
            class="btn">
            📺 المسلسلات
          </button>

          <button
            id="openTvmazeAdmin"
            class="btn">
            📥 استيراد TVmaze
          </button>

        </div>

        <div id="adminContent"></div>

      </div>
    `;

    $("openMoviesAdmin")
      ?.addEventListener(
        "click",
        renderMoviesManager
      );

    $("openSeriesAdmin")
      ?.addEventListener(
        "click",
        renderSeriesManager
      );

    $("openTvmazeAdmin")
      ?.addEventListener(
        "click",
        renderTVmazeImporter
      );

    renderTVmazeImporter();
  }

  // =====================================================
  // ADMIN DATA
  // =====================================================

  async function refreshAdminData() {

    try {

      const [
        movies,
        series,
        seasons,
        episodes
      ] = await Promise.all([

        db
          .from("movies")
          .select("id"),

        db
          .from("series")
          .select("id"),

        db
          .from("seasons")
          .select("id"),

        db
          .from("episodes")
          .select("id")

      ]);

      console.log(
        "Admin stats:",
        {
          movies: movies.data?.length || 0,
          series: series.data?.length || 0,
          seasons: seasons.data?.length || 0,
          episodes: episodes.data?.length || 0
        }
      );

    } catch (error) {
      console.error(error);
    }
  }

  // =====================================================
  // MOVIES MANAGER
  // =====================================================

  function renderMoviesManager() {

    const box =
      $("adminContent");

    if (!box) return;

    box.innerHTML = `

      <h2>🎬 إدارة الأفلام</h2>

      <form id="movieForm">

        <input
          id="movieTitle"
          required
          placeholder="اسم الفيلم">

        <textarea
          id="movieDescription"
          placeholder="الوصف"></textarea>

        <input
          id="moviePoster"
          placeholder="رابط صورة الفيلم">

        <input
          id="movieBackdrop"
          placeholder="رابط الخلفية">

        <input
          id="movieVideo"
          placeholder="رابط الفيديو">

        <input
          id="movieYear"
          type="number"
          placeholder="السنة">

        <input
          id="movieGenre"
          placeholder="النوع">

        <input
          id="movieCountry"
          placeholder="الدولة">

        <input
          id="movieDuration"
          type="number"
          placeholder="مدة الفيلم بالدقائق">

        <label>
          <input
            id="moviePublished"
            type="checkbox"
            checked>
          منشور
        </label>

        <button
          class="btn"
          type="submit">
          ➕ إضافة الفيلم
        </button>

      </form>

      <hr>

      <div id="adminMoviesList">
        جاري التحميل...
      </div>
    `;

    $("movieForm")
      ?.addEventListener(
        "submit",
        addMovie
      );

    loadAdminMovies();
  }

  async function addMovie(event) {

    event.preventDefault();

    try {

      const movie = {

        title:
          $("movieTitle").value.trim(),

        description:
          $("movieDescription").value.trim() || null,

        poster_url:
          $("moviePoster").value.trim() || null,

        backdrop_url:
          $("movieBackdrop").value.trim() || null,

        video_url:
          $("movieVideo").value.trim() || null,

        year:
          Number($("movieYear").value) || null,

        genre:
          $("movieGenre").value.trim() || null,

        country:
          $("movieCountry").value.trim() || null,

        duration_minutes:
          Number($("movieDuration").value) || null,

        is_featured:
          false,

        is_published:
          $("moviePublished").checked
      };

      const { error } =
        await db
          .from("movies")
          .insert(movie);

      if (error) {
        console.error(error);

        message(
          error.message,
          "error"
        );

        return;
      }

      message(
        "تمت إضافة الفيلم بنجاح ✅",
        "success"
      );

      $("movieForm").reset();

      await loadAdminMovies();
      await loadMovies();

    } catch (error) {

      console.error(error);

      message(
        "حدث خطأ أثناء إضافة الفيلم.",
        "error"
      );
    }
  }

  async function loadAdminMovies() {

    const box =
      $("adminMoviesList");

    if (!box || !db) return;

    const { data, error } =
      await db
        .from("movies")
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        );

    if (error) {
      box.innerHTML =
        `<p>${escapeHtml(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      box.innerHTML =
        "<p>لا توجد أفلام.</p>";
      return;
    }

    box.innerHTML =
      data.map(movie => `

        <div style="
          padding:12px;
          margin:10px 0;
          background:#1b1b24;
          border-radius:10px;
        ">

          <strong>
            ${escapeHtml(movie.title)}
          </strong>

          ${
            movie.year
              ? ` — ${movie.year}`
              : ""
          }

        </div>

      `).join("");
  }

  // =====================================================
  // SERIES MANAGER
  // =====================================================

  function renderSeriesManager() {

    const box =
      $("adminContent");

    if (!box) return;

    box.innerHTML = `

      <h2>📺 إدارة المسلسلات</h2>

      <form id="seriesForm">

        <input
          id="seriesTitle"
          required
          placeholder="اسم المسلسل">

        <textarea
          id="seriesDescription"
          placeholder="الوصف"></textarea>

        <input
          id="seriesPoster"
          placeholder="رابط الصورة">

        <input
          id="seriesBackdrop"
          placeholder="رابط الخلفية">

        <input
          id="seriesYear"
          type="number"
          placeholder="السنة">

        <input
          id="seriesGenre"
          placeholder="النوع">

        <input
          id="seriesCountry"
          placeholder="الدولة">

        <input
          id="seriesTvmazeId"
          type="number"
          placeholder="TVmaze ID اختياري">

        <input
          id="seriesTvmazeUrl"
          placeholder="TVmaze URL اختياري">

        <label>
          <input
            id="seriesFeatured"
            type="checkbox">
          مميز
        </label>

        <label>
          <input
            id="seriesPublished"
            type="checkbox"
            checked>
          منشور
        </label>

        <button
          class="btn"
          type="submit">
          ➕ إضافة مسلسل
        </button>

      </form>

      <hr>

      <div id="adminSeriesList">
        جاري التحميل...
      </div>
    `;

    $("seriesForm")
      ?.addEventListener(
        "submit",
        addSeries
      );

    loadAdminSeries();
  }

  async function addSeries(event) {

    event.preventDefault();

    const title =
      $("seriesTitle").value.trim();

    if (!title) {
      message(
        "أدخل اسم المسلسل.",
        "error"
      );
      return;
    }

    try {

      const item = {

        title,

        description:
          $("seriesDescription").value.trim() || null,

        poster_url:
          $("seriesPoster").value.trim() || null,

        backdrop_url:
          $("seriesBackdrop").value.trim() || null,

        year:
          Number($("seriesYear").value) || null,

        genre:
          $("seriesGenre").value.trim() || null,

        country:
          $("seriesCountry").value.trim() || null,

        tvmaze_id:
          Number($("seriesTvmazeId").value) || null,

        tvmaze_url:
          $("seriesTvmazeUrl").value.trim() || null,

        is_featured:
          $("seriesFeatured").checked,

        is_published:
          $("seriesPublished").checked
      };

      const { error } =
        await db
          .from("series")
          .insert(item);

      if (error) {
        console.error(error);

        message(
          error.message,
          "error"
        );

        return;
      }

      message(
        "تمت إضافة المسلسل بنجاح ✅",
        "success"
      );

      $("seriesForm").reset();

      await loadAdminSeries();
      await loadSeries();

    } catch (error) {

      console.error(error);

      message(
        "حدث خطأ أثناء إضافة المسلسل.",
        "error"
      );
    }
  }

  async function loadAdminSeries() {

    const box =
      $("adminSeriesList");

    if (!box || !db) return;

    const { data, error } =
      await db
        .from("series")
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        );

    if (error) {
      box.innerHTML =
        `<p>${escapeHtml(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      box.innerHTML =
        "<p>لا توجد مسلسلات.</p>";
      return;
    }

    box.innerHTML =
      data.map(show => `

        <div style="
          padding:12px;
          margin:10px 0;
          background:#1b1b24;
          border-radius:10px;
        ">

          <strong>
            ${escapeHtml(show.title)}
          </strong>

          ${
            show.year
              ? ` — ${show.year}`
              : ""
          }

          ${
            show.tvmaze_id
              ? ` — TVmaze #${show.tvmaze_id}`
              : ""
          }

        </div>

      `).join("");
  }

  // =====================================================
  // TVMAZE IMPORTER
  // =====================================================

  function renderTVmazeImporter() {

    const box =
      $("adminContent");

    if (!box) return;

    box.innerHTML = `

      <h2>📥 استيراد TVmaze</h2>

      <p>
        ابحث عن مسلسل في TVmaze ثم اختره لاستيراد
        بيانات المسلسل والمواسم والحلقات.
      </p>

      <form id="tvmazeSearchForm">

        <input
          id="tvmazeSearchInput"
          required
          placeholder="مثال: Güller ve Günahlar">

        <button
          class="btn"
          type="submit">
          🔎 بحث في TVmaze
        </button>

      </form>

      <div
        id="tvmazeResults"
        style="margin-top:20px;">
      </div>

      <div
        id="tvmazeImportProgress"
        style="margin-top:20px;">
      </div>
    `;

    $("tvmazeSearchForm")
      ?.addEventListener(
        "submit",
        searchTVmaze
      );
  }

  // =====================================================
  // TVMAZE SEARCH
  // =====================================================

  async function searchTVmaze(event) {

    event.preventDefault();

    const input =
      $("tvmazeSearchInput");

    const results =
      $("tvmazeResults");

    if (!input || !results) return;

    const query =
      input.value.trim();

    if (!query) return;

    results.innerHTML =
      "<p>🔎 جاري البحث في TVmaze...</p>";

    try {

      const url =
        "https://api.tvmaze.com/search/shows?q=" +
        encodeURIComponent(query);

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          "TVmaze HTTP " +
          response.status
        );
      }

      const data =
        await response.json();

      if (!data.length) {

        results.innerHTML =
          "<p>لم يتم العثور على نتائج.</p>";

        return;
      }

      results.innerHTML =
        data.map(item => {

          const show =
            item.show;

          const image =
            show.image?.medium ||
            show.image?.original ||
            "https://via.placeholder.com/210x295?text=TVmaze";

          return `

            <div style="
              display:flex;
              gap:15px;
              align-items:center;
              padding:15px;
              margin:12px 0;
              background:#1b1b24;
              border-radius:14px;
            ">

              <img
                src="${escapeHtml(image)}"
                style="
                  width:80px;
                  height:110px;
                  object-fit:cover;
                  border-radius:8px;
                "
              >

              <div style="flex:1">

                <h3>
                  ${escapeHtml(
                    show.name
                  )}
                </h3>

                <p>
                  ${
                    show.premiered
                      ? escapeHtml(
                          show.premiered
                        )
                      : ""
                  }
                </p>

                <p>
                  ${
                    show.genres?.join(
                      "، "
                    ) || ""
                  }
                </p>

                <button
                  class="btn"
                  data-tvmaze-id="${show.id}">
                  📥 استيراد هذا المسلسل
                </button>

              </div>

            </div>
          `;

        }).join("");

      results
        .querySelectorAll(
          "[data-tvmaze-id]"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              const id =
                Number(
                  button.dataset.tvmazeId
                );

              importTVmazeShow(id);
            }
          );

        });

    } catch (error) {

      console.error(
        "TVmaze search error:",
        error
      );

      results.innerHTML = `
        <p>
          ❌ تعذر الاتصال بـ TVmaze.
        </p>
      `;
    }
  }

  // =====================================================
  // IMPORT TVMAZE SHOW
  // =====================================================

  async function importTVmazeShow(tvmazeId) {

    const progress =
      $("tvmazeImportProgress");

    if (!progress) return;

    progress.innerHTML =
      "<p>⏳ جاري جلب بيانات المسلسل...</p>";

    try {

      // -------------------------------------------------
      // GET SHOW
      // -------------------------------------------------

      const showResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${tvmazeId}`
        );

      if (!showResponse.ok) {
        throw new Error(
          "تعذر جلب بيانات المسلسل."
        );
      }

      const show =
        await showResponse.json();

      // -------------------------------------------------
      // GET SEASONS
      // -------------------------------------------------

      progress.innerHTML =
        "<p>⏳ جاري جلب المواسم...</p>";

      const seasonsResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${tvmazeId}/seasons`
        );

      const seasons =
        seasonsResponse.ok
          ? await seasonsResponse.json()
          : [];

      // -------------------------------------------------
      // GET EPISODES
      // -------------------------------------------------

      progress.innerHTML =
        "<p>⏳ جاري جلب الحلقات...</p>";

      const episodesResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${tvmazeId}/episodes`
        );

      const episodes =
        episodesResponse.ok
          ? await episodesResponse.json()
          : [];

      // -------------------------------------------------
      // SERIES
      // -------------------------------------------------

      progress.innerHTML =
        "<p>💾 جاري حفظ بيانات المسلسل...</p>";

      const seriesPayload = {

        title:
          show.name || "بدون اسم",

        description:
          cleanDescription(
            show.summary
          ),

        poster_url:
          show.image?.original ||
          show.image?.medium ||
          null,

        backdrop_url:
          show.image?.original ||
          show.image?.medium ||
          null,

        year:
          getYear(
            show.premiered
          ),

        genre:
          show.genres?.join(", ") ||
          null,

        country:
          show.network?.country?.name ||
          show.webChannel?.country?.name ||
          null,

        tvmaze_id:
          show.id,

        tvmaze_url:
          show.url ||
          `https://www.tvmaze.com/shows/${show.id}`,

        is_featured:
          false,

        is_published:
          false
      };

      // -------------------------------------------------
      // CHECK EXISTING SERIES
      // -------------------------------------------------

      let seriesRow = null;

      const existingSeries =
        await db
          .from("series")
          .select("*")
          .eq(
            "tvmaze_id",
            show.id
          )
          .maybeSingle();

      if (existingSeries.error) {
        throw existingSeries.error;
      }

      if (existingSeries.data) {

        const update =
          await db
            .from("series")
            .update(seriesPayload)
            .eq(
              "id",
              existingSeries.data.id
            )
            .select()
            .single();

        if (update.error) {
          throw update.error;
        }

        seriesRow =
          update.data;

      } else {

        const insert =
          await db
            .from("series")
            .insert(seriesPayload)
            .select()
            .single();

        if (insert.error) {
          throw insert.error;
        }

        seriesRow =
          insert.data;
      }

      // -------------------------------------------------
      // SEASONS
      // -------------------------------------------------

      let seasonCount = 0;
      let episodeCount = 0;

      for (const season of seasons) {

        progress.innerHTML = `
          <p>
            💾 حفظ الموسم
            ${season.number}
            من
            ${seasons.length}
          </p>
        `;

        const seasonPayload = {

          series_id:
            seriesRow.id,

          season_number:
            season.number,

          title:
            season.name ||
            `الموسم ${season.number}`,

          tvmaze_id:
            season.id
        };

        let seasonRow = null;

        const existingSeason =
          await db
            .from("seasons")
            .select("*")
            .eq(
              "tvmaze_id",
              season.id
            )
            .maybeSingle();

        if (existingSeason.error) {
          throw existingSeason.error;
        }

        if (existingSeason.data) {

          const update =
            await db
              .from("seasons")
              .update(seasonPayload)
              .eq(
                "id",
                existingSeason.data.id
              )
              .select()
              .single();

          if (update.error) {
            throw update.error;
          }

          seasonRow =
            update.data;

        } else {

          const insert =
            await db
              .from("seasons")
              .insert(seasonPayload)
              .select()
              .single();

          if (insert.error) {
            throw insert.error;
          }

          seasonRow =
            insert.data;
        }

        seasonCount++;

        // -------------------------------------------------
        // EPISODES OF THIS SEASON
        // -------------------------------------------------

        const seasonEpisodes =
          episodes.filter(
            episode =>
              Number(
                episode.season
              ) === Number(
                season.number
              )
          );

        for (
          const episode
          of seasonEpisodes
        ) {

          const episodePayload = {

            series_id:
              seriesRow.id,

            season_id:
              seasonRow.id,

            episode_number:
              episode.number || 0,

            title:
              episode.name ||
              `الحلقة ${episode.number}`,

            description:
              cleanDescription(
                episode.summary
              ),

            thumbnail_url:
              episode.image?.original ||
              episode.image?.medium ||
              null,

            video_url:
              null,

            duration_minutes:
              episode.runtime ||
              null,

            quality:
              null,

            tvmaze_id:
              episode.id,

            tvmaze_url:
              episode.url ||
              null,

            airdate:
              episode.airdate ||
              null,

            is_published:
              false
          };

          const existingEpisode =
            await db
              .from("episodes")
              .select("id")
              .eq(
                "tvmaze_id",
                episode.id
              )
              .maybeSingle();

          if (existingEpisode.error) {
            throw existingEpisode.error;
          }

          if (existingEpisode.data) {

            const update =
              await db
                .from("episodes")
                .update(
                  episodePayload
                )
                .eq(
                  "id",
                  existingEpisode.data.id
                );

            if (update.error) {
              throw update.error;
            }

          } else {

            const insert =
              await db
                .from("episodes")
                .insert(
                  episodePayload
                );

            if (insert.error) {
              throw insert.error;
            }
          }

          episodeCount++;
        }
      }

      // -------------------------------------------------
      // DONE
      // -------------------------------------------------

      progress.innerHTML = `

        <div style="
          padding:18px;
          background:#176b3a;
          border-radius:14px;
        ">

          <h3>
            ✅ تم الاستيراد بنجاح
          </h3>

          <p>
            المسلسل:
            <strong>
              ${escapeHtml(show.name)}
            </strong>
          </p>

          <p>
            المواسم:
            ${seasonCount}
          </p>

          <p>
            الحلقات:
            ${episodeCount}
          </p>

          <p>
            ⚠️ تم حفظ الحلقات كـ "غير منشورة"
            حتى تضيف روابط الفيديو بنفسك.
          </p>

        </div>
      `;

      await loadSeries();

      message(
        `تم استيراد ${show.name} بنجاح ✅`,
        "success"
      );

    } catch (error) {

      console.error(
        "TVmaze import error:",
        error
      );

      progress.innerHTML = `

        <div style="
          padding:18px;
          background:#8b1e1e;
          border-radius:14px;
        ">

          <h3>
            ❌ فشل الاستيراد
          </h3>

          <p>
            ${escapeHtml(
              error.message ||
              String(error)
            )}
          </p>

        </div>
      `;

      message(
        "فشل استيراد TVmaze. افتح Console لمعرفة التفاصيل.",
        "error"
      );
    }
  }

  // =====================================================
  // HELPERS TVMAZE
  // =====================================================

  function cleanDescription(html) {

    if (!html) return null;

    const div =
      document.createElement("div");

    div.innerHTML = html;

    return (
      div.textContent ||
      div.innerText ||
      ""
    ).trim();
  }

  function getYear(date) {

    if (!date) return null;

    const year =
      parseInt(
        String(date).substring(0, 4),
        10
      );

    return Number.isNaN(year)
      ? null
      : year;
  }

  // =====================================================
  // ROUTER
  // =====================================================

  async function route() {

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

    if (
      hash === "#admin" ||
      hash === "#admir"
    ) {

      if (!currentUser) {

        message(
          "يجب تسجيل الدخول أولًا.",
          "error"
        );

        location.hash =
          "#login";

        return;
      }

      await checkAdmin();

      if (!isAdmin) {

        message(
          "الحساب ليس مديرًا.",
          "error"
        );

        location.hash =
          "#home";

        return;
      }

      await showAdmin();

      return;
    }

    await showHome();
  }

  // =====================================================
  // EVENTS
  // =====================================================

  function setupEvents() {

    $("loginForm")
      ?.addEventListener(
        "submit",
        login
      );

    $("signupForm")
      ?.addEventListener(
        "submit",
        signup
      );

    $("logoutBtn")
      ?.addEventListener(
        "click",
        logout
      );

    window.addEventListener(
      "hashchange",
      route
    );

    if (db) {

      db.auth.onAuthStateChange(
        async (event, session) => {

          console.log(
            "Auth event:",
            event
          );

          currentUser =
            session?.user || null;

          if (currentUser) {
            await checkAdmin();
          } else {
            isAdmin = false;
          }

          updateNav();
        }
      );
    }
  }

  // =====================================================
  // START
  // =====================================================

  async function start() {

    console.log(
      "Starting SOKA..."
    );

    setupEvents();

    await loadSession();

    await route();

    console.log(
      "SOKA is ready."
    );
  }

  // =====================================================
  // ERROR PROTECTION
  // =====================================================

  window.addEventListener(
    "error",
    event => {

      console.error(
        "SOKA JS error:",
        event.error
      );

      message(
        "حدث خطأ في الموقع. تحقق من Console.",
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

      message(
        "حدث خطأ أثناء تنفيذ العملية.",
        "error"
      );
    }
  );

  start();

})();
