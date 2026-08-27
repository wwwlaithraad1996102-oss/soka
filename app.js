(() => {
  "use strict";

  console.log("🚀 SOKA app.js started");

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

      console.log("✅ Supabase connected");
    } else {
      console.error("❌ Supabase config missing");
    }
  } catch (error) {
    console.error("❌ Supabase initialization error:", error);
  }

  // =====================================================
  // اختصار العناصر
  // =====================================================

  function $(id) {
    return document.getElementById(id);
  }

  // =====================================================
  // الرسائل
  // =====================================================

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
        display: "none",
        boxShadow: "0 10px 30px rgba(0,0,0,.4)"
      });

      document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "success") {
      box.style.background = "#176b3a";
    } else if (type === "error") {
      box.style.background = "#8b1e1e";
    } else {
      box.style.background = "#15151c";
    }

    box.style.display = "block";

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      box.style.display = "none";
    }, 4500);
  }

  // =====================================================
  // حماية HTML
  // =====================================================

  function escapeHTML(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =====================================================
  // إخفاء الصفحات فقط
  // =====================================================

  function hideAllSections() {
    document
      .querySelectorAll("main > section")
      .forEach(section => {
        section.style.display = "none";
      });
  }

  // =====================================================
  // إظهار الصفحة الرئيسية
  //
  // مهم:
  // لا نخفي movies و series بعد إظهار home
  // =====================================================

  async function showHome() {
    hideAllSections();

    const home = $("home");
    const movies = $("movies");
    const series = $("series");

    if (home) {
      home.style.display = "block";
    }

    if (movies) {
      movies.style.display = "block";
    }

    if (series) {
      series.style.display = "block";
    }

    updateUserInterface();

    // تحميل المحتوى مباشرة
    await Promise.all([
      loadMovies(),
      loadSeries()
    ]);
  }

  // =====================================================
  // صفحة الأفلام
  // =====================================================

  async function showMovies() {
    hideAllSections();

    const movies = $("movies");

    if (movies) {
      movies.style.display = "block";
    }

    await loadMovies();
  }

  // =====================================================
  // صفحة المسلسلات
  // =====================================================

  async function showSeries() {
    hideAllSections();

    const series = $("series");

    if (series) {
      series.style.display = "block";
    }

    await loadSeries();
  }

  // =====================================================
  // تسجيل الدخول
  // =====================================================

  function showLogin() {
    hideAllSections();

    const login = $("login");

    if (login) {
      login.style.display = "block";
    }
  }

  // =====================================================
  // تحديث واجهة المستخدم
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
        logoutBtn.classList.remove("hidden");
      }

      if (adminNav) {
        if (isAdmin) {
          adminNav.style.display = "inline-block";
          adminNav.classList.remove("hidden");
        } else {
          adminNav.style.display = "none";
          adminNav.classList.add("hidden");
        }
      }
    } else {
      if (authNav) {
        authNav.textContent = "تسجيل الدخول";
        authNav.href = "#login";
      }

      if (logoutBtn) {
        logoutBtn.style.display = "none";
        logoutBtn.classList.add("hidden");
      }

      if (adminNav) {
        adminNav.style.display = "none";
        adminNav.classList.add("hidden");
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
      return;
    }

    try {
      console.log("🔐 Checking admin:", user.id);

      const { data, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("❌ Admin profile error:", error);
        isAdmin = false;
      } else if (data && data.role === "admin") {
        isAdmin = true;
        console.log("✅ ADMIN confirmed");
      } else {
        isAdmin = false;
      }
    } catch (error) {
      console.error("❌ Admin check exception:", error);
      isAdmin = false;
    }

    updateUserInterface();
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
      const { data, error } =
        await supabaseClient.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        return;
      }

      if (data && data.session) {
        currentUser = data.session.user;

        await checkAdmin(currentUser);
      } else {
        currentUser = null;
        isAdmin = false;

        updateUserInterface();
      }
    } catch (error) {
      console.error("Session exception:", error);
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

    const email = $("email")?.value.trim();
    const password = $("password")?.value;

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
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        console.error("Login error:", error);

        showMessage(
          error.message,
          "error"
        );

        return;
      }

      currentUser = data.user;

      await checkAdmin(currentUser);

      showMessage(
        isAdmin
          ? "تم تسجيل الدخول بنجاح — أنت المدير ✅"
          : "تم تسجيل الدخول بنجاح ✅",
        "success"
      );

      location.hash = "#home";

      await showHome();

    } catch (error) {
      console.error("Login exception:", error);

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
      const { data, error } =
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
        console.error("Signup error:", error);

        showMessage(
          error.message,
          "error"
        );

        return;
      }

      if (data.session && data.user) {
        currentUser = data.user;

        await checkAdmin(currentUser);

        showMessage(
          "تم إنشاء الحساب وتسجيل الدخول بنجاح ✅",
          "success"
        );

        location.hash = "#home";

        await showHome();

      } else {
        showMessage(
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب.",
          "success"
        );
      }

    } catch (error) {
      console.error("Signup exception:", error);

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
      const { error } =
        await supabaseClient.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        return;
      }

      currentUser = null;
      isAdmin = false;

      updateUserInterface();

      location.hash = "#home";

      await showHome();

      showMessage(
        "تم تسجيل الخروج.",
        "success"
      );

    } catch (error) {
      console.error("Logout exception:", error);
    }
  }

  // =====================================================
  // بطاقة المسلسل
  // =====================================================

  function createSeriesCard(item) {
    const poster =
      item.poster_url ||
      item.backdrop_url ||
      "https://via.placeholder.com/500x750?text=SOKA";

    const title =
      item.title || "بدون عنوان";

    const year =
      item.year || "";

    const genre =
      item.genre || "";

    const id =
      item.id;

    return `
      <article class="card soka-card">

        <div class="card-image-wrapper">

          <img
            class="card-image"
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(title)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='https://via.placeholder.com/500x750?text=SOKA';"
          >

        </div>

        <div class="card-body">

          <h3>
            ${escapeHTML(title)}
          </h3>

          ${
            year
              ? `<p class="meta">📅 ${escapeHTML(year)}</p>`
              : ""
          }

          ${
            genre
              ? `<p class="meta">🎭 ${escapeHTML(genre)}</p>`
              : ""
          }

          <button
            class="btn"
            onclick="window.SOKA.openSeries('${id}')"
          >
            عرض المسلسل
          </button>

        </div>

      </article>
    `;
  }

  // =====================================================
  // بطاقة الفيلم
  // =====================================================

  function createMovieCard(item) {
    const poster =
      item.poster_url ||
      item.backdrop_url ||
      "https://via.placeholder.com/500x750?text=SOKA";

    const title =
      item.title || "بدون عنوان";

    const year =
      item.year || "";

    const genre =
      item.genre || "";

    const id =
      item.id;

    return `
      <article class="card soka-card">

        <div class="card-image-wrapper">

          <img
            class="card-image"
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(title)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='https://via.placeholder.com/500x750?text=SOKA';"
          >

        </div>

        <div class="card-body">

          <h3>
            ${escapeHTML(title)}
          </h3>

          ${
            year
              ? `<p class="meta">📅 ${escapeHTML(year)}</p>`
              : ""
          }

          ${
            genre
              ? `<p class="meta">🎭 ${escapeHTML(genre)}</p>`
              : ""
          }

          <button
            class="btn"
            onclick="window.SOKA.openMovie('${id}')"
          >
            مشاهدة الفيلم
          </button>

        </div>

      </article>
    `;
  }

  // =====================================================
  // تحميل الأفلام من Supabase
  // =====================================================

  async function loadMovies() {
    const grid = $("movieGrid");

    if (!grid) {
      console.warn(
        "⚠️ movieGrid not found in index.html"
      );
      return;
    }

    grid.innerHTML =
      `<div class="loading">جاري تحميل الأفلام…</div>`;

    if (!supabaseClient) {
      grid.innerHTML =
        `<div class="loading">Supabase غير متصل.</div>`;
      return;
    }

    try {
      const { data, error } =
        await supabaseClient
          .from("movies")
          .select(`
            id,
            title,
            description,
            poster_url,
            backdrop_url,
            video_url,
            year,
            genre,
            country,
            duration_minutes,
            is_featured,
            is_published,
            created_at
          `)
          .eq("is_published", true)
          .order("created_at", {
            ascending: false
          });

      if (error) {
        console.error(
          "❌ Movies loading error:",
          error
        );

        grid.innerHTML = `
          <div class="loading">
            تعذر تحميل الأفلام.
          </div>
        `;

        return;
      }

      if (!data || data.length === 0) {
        grid.innerHTML = `
          <div class="loading">
            لا توجد أفلام منشورة حاليًا.
          </div>
        `;

        return;
      }

      grid.innerHTML =
        data.map(createMovieCard).join("");

    } catch (error) {
      console.error(
        "❌ Movies exception:",
        error
      );

      grid.innerHTML = `
        <div class="loading">
          حدث خطأ أثناء تحميل الأفلام.
        </div>
      `;
    }
  }

  // =====================================================
  // تحميل المسلسلات من Supabase
  //
  // هذه الدالة ستجلب Güller ve Günahlar
  // مباشرة من جدول series
  // =====================================================

  async function loadSeries() {
    const grid = $("seriesGrid");

    if (!grid) {
      console.warn(
        "⚠️ seriesGrid not found in index.html"
      );
      return;
    }

    grid.innerHTML =
      `<div class="loading">جاري تحميل المسلسلات…</div>`;

    if (!supabaseClient) {
      grid.innerHTML =
        `<div class="loading">Supabase غير متصل.</div>`;
      return;
    }

    try {
      console.log(
        "📺 Loading published series..."
      );

      const { data, error } =
        await supabaseClient
          .from("series")
          .select(`
            id,
            title,
            description,
            poster_url,
            backdrop_url,
            year,
            genre,
            country,
            tvmaze_id,
            tvmaze_url,
            is_featured,
            is_published,
            created_at
          `)
          .eq("is_published", true)
          .order("created_at", {
            ascending: false
          });

      if (error) {
        console.error(
          "❌ Series loading error:",
          error
        );

        grid.innerHTML = `
          <div class="loading">
            تعذر تحميل المسلسلات.
            <br>
            ${escapeHTML(error.message)}
          </div>
        `;

        return;
      }

      console.log(
        "📺 Series loaded:",
        data
      );

      if (!data || data.length === 0) {
        grid.innerHTML = `
          <div class="loading">
            لا توجد مسلسلات منشورة حاليًا.
          </div>
        `;

        return;
      }

      grid.innerHTML =
        data.map(createSeriesCard).join("");

    } catch (error) {
      console.error(
        "❌ Series exception:",
        error
      );

      grid.innerHTML = `
        <div class="loading">
          حدث خطأ أثناء تحميل المسلسلات.
        </div>
      `;
    }
  }

  // =====================================================
  // فتح تفاصيل المسلسل
  // =====================================================

  async function openSeries(seriesId) {
    hideAllSections();

    const detail = $("detail");

    if (!detail) {
      location.hash = "#series";
      return;
    }

    detail.style.display = "block";

    const content =
      $("detailContent") || detail;

    content.innerHTML =
      `<div class="loading">جاري تحميل المسلسل…</div>`;

    if (!supabaseClient) {
      content.innerHTML =
        `<div class="loading">Supabase غير متصل.</div>`;
      return;
    }

    try {
      const { data: series, error } =
        await supabaseClient
          .from("series")
          .select(`
            id,
            title,
            description,
            poster_url,
            backdrop_url,
            year,
            genre,
            country,
            tvmaze_id,
            tvmaze_url
          `)
          .eq("id", seriesId)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!series) {
        content.innerHTML =
          `<div class="loading">المسلسل غير موجود.</div>`;
        return;
      }

      const poster =
        series.poster_url ||
        series.backdrop_url ||
        "https://via.placeholder.com/500x750?text=SOKA";

      content.innerHTML = `
        <div class="detail-card">

          <img
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(series.title)}"
            style="
              width:100%;
              max-width:450px;
              display:block;
              margin:0 auto 25px;
              border-radius:18px;
            "
          >

          <h1>
            📺 ${escapeHTML(series.title)}
          </h1>

          ${
            series.year
              ? `<p>📅 ${escapeHTML(series.year)}</p>`
              : ""
          }

          ${
            series.genre
              ? `<p>🎭 ${escapeHTML(series.genre)}</p>`
              : ""
          }

          ${
            series.country
              ? `<p>🌍 ${escapeHTML(series.country)}</p>`
              : ""
          }

          ${
            series.description
              ? `
                <p>
                  ${escapeHTML(series.description)}
                </p>
              `
              : ""
          }

          <hr>

          <h2>المواسم</h2>

          <div id="seasonList">
            جاري تحميل المواسم…
          </div>

        </div>
      `;

      await loadSeasons(series.id);

    } catch (error) {
      console.error(
        "❌ Open series error:",
        error
      );

      content.innerHTML = `
        <div class="loading">
          حدث خطأ أثناء فتح المسلسل.
        </div>
      `;
    }
  }

  // =====================================================
  // تحميل المواسم
  // =====================================================

  async function loadSeasons(seriesId) {
    const box = $("seasonList");

    if (!box) {
      return;
    }

    try {
      const { data, error } =
        await supabaseClient
          .from("seasons")
          .select(`
            id,
            series_id,
            season_number,
            title,
            tvmaze_id,
            created_at
          `)
          .eq("series_id", seriesId)
          .order("season_number", {
            ascending: true
          });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        box.innerHTML =
          `<p>لا توجد مواسم مضافة حاليًا.</p>`;
        return;
      }

      box.innerHTML = data.map(season => `
        <div
          style="
            padding:15px;
            margin:10px 0;
            background:#15151c;
            border-radius:12px;
          "
        >
          <strong>
            الموسم ${escapeHTML(season.season_number)}
          </strong>

          ${
            season.title
              ? `<div>${escapeHTML(season.title)}</div>`
              : ""
          }

          <button
            class="btn"
            style="margin-top:10px"
            onclick="window.SOKA.openSeason('${season.id}')"
          >
            عرض الحلقات
          </button>
        </div>
      `).join("");

    } catch (error) {
      console.error(
        "❌ Seasons loading error:",
        error
      );

      box.innerHTML =
        `<p>تعذر تحميل المواسم.</p>`;
    }
  }

  // =====================================================
  // فتح الموسم والحلقات
  // =====================================================

  async function openSeason(seasonId) {
    const watch = $("watch");

    hideAllSections();

    if (!watch) {
      return;
    }

    watch.style.display = "block";

    const content =
      $("watchContent") || watch;

    content.innerHTML =
      `<div class="loading">جاري تحميل الحلقات…</div>`;

    try {
      const { data, error } =
        await supabaseClient
          .from("episodes")
          .select(`
            id,
            series_id,
            season_id,
            episode_number,
            title,
            description,
            thumbnail_url,
            video_url,
            duration_minutes,
            quality,
            tvmaze_id,
            tvmaze_url,
            airdate,
            is_published
          `)
          .eq("season_id", seasonId)
          .eq("is_published", true)
          .order("episode_number", {
            ascending: true
          });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        content.innerHTML = `
          <div class="loading">
            لا توجد حلقات منشورة لهذا الموسم.
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div class="detail-card">

          <h1>🎬 الحلقات</h1>

          <div class="episodes-list">

            ${data.map(ep => {

              const thumbnail =
                ep.thumbnail_url ||
                "https://via.placeholder.com/640x360?text=SOKA";

              return `
                <article
                  style="
                    background:#15151c;
                    padding:15px;
                    margin:15px 0;
                    border-radius:15px;
                  "
                >

                  <img
                    src="${escapeHTML(thumbnail)}"
                    alt="${escapeHTML(ep.title || "الحلقة")}"
                    style="
                      width:100%;
                      max-width:650px;
                      border-radius:12px;
                      display:block;
                      margin:auto;
                    "
                  >

                  <h3>
                    الحلقة
                    ${escapeHTML(ep.episode_number)}
                    ${
                      ep.title
                        ? ` — ${escapeHTML(ep.title)}`
                        : ""
                    }
                  </h3>

                  ${
                    ep.description
                      ? `
                        <p>
                          ${escapeHTML(ep.description)}
                        </p>
                      `
                      : ""
                  }

                  ${
                    ep.airdate
                      ? `<p>📅 ${escapeHTML(ep.airdate)}</p>`
                      : ""
                  }

                  ${
                    ep.video_url
                      ? `
                        <button
                          class="btn"
                          onclick="window.SOKA.watchEpisode('${ep.id}')"
                        >
                          ▶️ مشاهدة الحلقة
                        </button>
                      `
                      : `
                        <p>
                          الفيديو غير متوفر حاليًا.
                        </p>
                      `
                  }

                </article>
              `;

            }).join("")}

          </div>

        </div>
      `;

    } catch (error) {
      console.error(
        "❌ Episodes loading error:",
        error
      );

      content.innerHTML = `
        <div class="loading">
          حدث خطأ أثناء تحميل الحلقات.
        </div>
      `;
    }
  }

  // =====================================================
  // مشاهدة الحلقة
  // =====================================================

  async function watchEpisode(episodeId) {
    if (!supabaseClient) {
      return;
    }

    const watch = $("watch");

    if (!watch) {
      return;
    }

    hideAllSections();

    watch.style.display = "block";

    const content =
      $("watchContent") || watch;

    try {
      const { data, error } =
        await supabaseClient
          .from("episodes")
          .select(`
            id,
            title,
            episode_number,
            description,
            video_url,
            thumbnail_url,
            duration_minutes,
            quality
          `)
          .eq("id", episodeId)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        content.innerHTML =
          `<div class="loading">الحلقة غير موجودة.</div>`;
        return;
      }

      if (!data.video_url) {
        content.innerHTML = `
          <div class="loading">
            لا يوجد رابط فيديو لهذه الحلقة حاليًا.
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div class="detail-card">

          <h1>
            ▶️ الحلقة
            ${escapeHTML(data.episode_number)}
            ${data.title
              ? ` — ${escapeHTML(data.title)}`
              : ""}
          </h1>

          <video
            controls
            playsinline
            preload="metadata"
            poster="${escapeHTML(
              data.thumbnail_url || ""
            )}"
            style="
              width:100%;
              max-width:1000px;
              display:block;
              margin:20px auto;
              border-radius:15px;
              background:#000;
            "
          >
            <source
              src="${escapeHTML(data.video_url)}"
              type="video/mp4"
            >

            متصفحك لا يدعم تشغيل الفيديو.
          </video>

          ${
            data.description
              ? `
                <p>
                  ${escapeHTML(data.description)}
                </p>
              `
              : ""
          }

          ${
            data.quality
              ? `<p>🎞️ الجودة: ${escapeHTML(data.quality)}</p>`
              : ""
          }

        </div>
      `;

    } catch (error) {
      console.error(
        "❌ Watch episode error:",
        error
      );

      content.innerHTML =
        `<div class="loading">تعذر تشغيل الحلقة.</div>`;
    }
  }

  // =====================================================
  // فتح الفيلم
  // =====================================================

  async function openMovie(movieId) {
    hideAllSections();

    const detail = $("detail");

    if (!detail) {
      return;
    }

    detail.style.display = "block";

    const content =
      $("detailContent") || detail;

    content.innerHTML =
      `<div class="loading">جاري تحميل الفيلم…</div>`;

    try {
      const { data, error } =
        await supabaseClient
          .from("movies")
          .select(`
            id,
            title,
            description,
            poster_url,
            backdrop_url,
            video_url,
            year,
            genre,
            country,
            duration_minutes
          `)
          .eq("id", movieId)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        content.innerHTML =
          `<div class="loading">الفيلم غير موجود.</div>`;
        return;
      }

      const poster =
        data.poster_url ||
        data.backdrop_url ||
        "https://via.placeholder.com/500x750?text=SOKA";

      content.innerHTML = `
        <div class="detail-card">

          <img
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(data.title)}"
            style="
              width:100%;
              max-width:450px;
              display:block;
              margin:auto;
              border-radius:18px;
            "
          >

          <h1>
            🎬 ${escapeHTML(data.title)}
          </h1>

          ${
            data.year
              ? `<p>📅 ${escapeHTML(data.year)}</p>`
              : ""
          }

          ${
            data.genre
              ? `<p>🎭 ${escapeHTML(data.genre)}</p>`
              : ""
          }

          ${
            data.country
              ? `<p>🌍 ${escapeHTML(data.country)}</p>`
              : ""
          }

          ${
            data.description
              ? `
                <p>
                  ${escapeHTML(data.description)}
                </p>
              `
              : ""
          }

          ${
            data.video_url
              ? `
                <video
                  controls
                  playsinline
                  style="
                    width:100%;
                    margin-top:20px;
                    border-radius:15px;
                    background:#000;
                  "
                >
                  <source
                    src="${escapeHTML(data.video_url)}"
                    type="video/mp4"
                  >
                </video>
              `
              : `
                <p>
                  الفيديو غير متوفر حاليًا.
                </p>
              `
          }

        </div>
      `;

    } catch (error) {
      console.error(
        "❌ Open movie error:",
        error
      );

      content.innerHTML =
        `<div class="loading">تعذر فتح الفيلم.</div>`;
    }
  }

  // =====================================================
  // البحث
  // =====================================================

  async function performSearch(value) {
    const grid = $("searchGrid");

    if (!grid) {
      return;
    }

    const query =
      String(value || "").trim();

    if (!query) {
      grid.innerHTML = "";
      return;
    }

    grid.innerHTML =
      `<div class="loading">جاري البحث…</div>`;

    try {
      const [
        moviesResult,
        seriesResult
      ] = await Promise.all([

        supabaseClient
          .from("movies")
          .select("*")
          .eq("is_published", true)
          .ilike("title", `%${query}%`),

        supabaseClient
          .from("series")
          .select("*")
          .eq("is_published", true)
          .ilike("title", `%${query}%`)
      ]);

      if (moviesResult.error) {
        throw moviesResult.error;
      }

      if (seriesResult.error) {
        throw seriesResult.error;
      }

      const movies =
        moviesResult.data || [];

      const series =
        seriesResult.data || [];

      if (
        movies.length === 0 &&
        series.length === 0
      ) {
        grid.innerHTML = `
          <div class="loading">
            لا توجد نتائج للبحث عن:
            ${escapeHTML(query)}
          </div>
        `;
        return;
      }

      grid.innerHTML = `
        ${movies.map(createMovieCard).join("")}
        ${series.map(createSeriesCard).join("")}
      `;

    } catch (error) {
      console.error(
        "❌ Search error:",
        error
      );

      grid.innerHTML =
        `<div class="loading">حدث خطأ أثناء البحث.</div>`;
    }
  }

  // =====================================================
  // لوحة التحكم
  // =====================================================

  async function showAdmin() {
    hideAllSections();

    const admin = $("admin");

    if (!admin) {
      showMessage(
        "قسم لوحة التحكم غير موجود في index.html.",
        "error"
      );
      return;
    }

    admin.style.display = "block";

    updateUserInterface();

    renderAdminPanel();
  }

  // =====================================================
  // محتوى لوحة التحكم
  // =====================================================

  function renderAdminPanel() {
    const admin = $("admin");

    if (!admin) {
      return;
    }

    let box =
      $("adminContent");

    if (!box) {
      box =
        admin.querySelector(".soka-admin-box");
    }

    if (!box) {
      box =
        document.createElement("div");

      box.id =
        "adminContent";

      box.className =
        "soka-admin-box";

      box.style.padding = "20px";
      box.style.marginTop = "20px";
      box.style.background = "#111118";
      box.style.borderRadius = "15px";

      admin.appendChild(box);
    }

    box.innerHTML = `

      <h2>⚙️ لوحة تحكم SOKA</h2>

      <p>
        المدير:
        <strong>
          ${escapeHTML(currentUser?.email || "")}
        </strong>
      </p>

      <p>
        الصلاحية:
        <strong>
          ${isAdmin ? "ADMIN ✅" : "غير متاحة ❌"}
        </strong>
      </p>

      <hr>

      <h3>🎬 الأفلام</h3>

      <button
        class="btn"
        onclick="window.SOKA.adminLoadMovies()"
      >
        إدارة الأفلام
      </button>

      <div id="adminMoviesList"></div>

      <hr>

      <h3>📺 المسلسلات</h3>

      <button
        class="btn"
        onclick="window.SOKA.adminLoadSeries()"
      >
        إدارة المسلسلات
      </button>

      <div id="adminSeriesList"></div>

      <hr>

      <h3>📥 استيراد TVmaze</h3>

      <p>
        سيتم ربط مستورد TVmaze الموجود لديك
        في الخطوة التالية.
      </p>

    `;
  }

  // =====================================================
  // إدارة الأفلام - عرض الموجود
  // =====================================================

  async function adminLoadMovies() {
    const box =
      $("adminMoviesList");

    if (!box) {
      return;
    }

    box.innerHTML =
      `<p>جاري التحميل…</p>`;

    const { data, error } =
      await supabaseClient
        .from("movies")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (error) {
      box.innerHTML =
        `<p>خطأ: ${escapeHTML(error.message)}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      box.innerHTML =
        `<p>لا توجد أفلام.</p>`;
      return;
    }

    box.innerHTML =
      data.map(movie => `
        <div
          style="
            padding:12px;
            margin:10px 0;
            background:#181820;
            border-radius:10px;
          "
        >
          🎬
          ${escapeHTML(movie.title)}

          ${
            movie.is_published
              ? " ✅ منشور"
              : " ⏳ غير منشور"
          }
        </div>
      `).join("");
  }

  // =====================================================
  // إدارة المسلسلات - عرض الموجود
  // =====================================================

  async function adminLoadSeries() {
    const box =
      $("adminSeriesList");

    if (!box) {
      return;
    }

    box.innerHTML =
      `<p>جاري التحميل…</p>`;

    const { data, error } =
      await supabaseClient
        .from("series")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (error) {
      box.innerHTML =
        `<p>خطأ: ${escapeHTML(error.message)}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      box.innerHTML =
        `<p>لا توجد مسلسلات.</p>`;
      return;
    }

    box.innerHTML =
      data.map(series => `
        <div
          style="
            padding:12px;
            margin:10px 0;
            background:#181820;
            border-radius:10px;
          "
        >
          📺
          ${escapeHTML(series.title)}

          ${
            series.is_published
              ? " ✅ منشور"
              : " ⏳ غير منشور"
          }

          ${
            series.tvmaze_id
              ? `<br>TVmaze ID: ${escapeHTML(series.tvmaze_id)}`
              : ""
          }
        </div>
      `).join("");
  }

  // =====================================================
  // Router
  // =====================================================

  async function route() {
    const hash =
      location.hash || "#home";

    console.log(
      "🧭 SOKA route:",
      hash
    );

    if (hash === "#login") {
      showLogin();
      return;
    }

    if (hash === "#movies") {
      await showMovies();
      return;
    }

    if (hash === "#series") {
      await showSeries();
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
          "هذا الحساب ليس لديه صلاحية المدير.",
          "error"
        );

        location.hash = "#home";
        return;
      }

      await showAdmin();
      return;
    }

    if (hash === "#search") {
      hideAllSections();

      const search =
        $("search");

      if (search) {
        search.style.display = "block";
      }

      return;
    }

    // الصفحة الرئيسية
    await showHome();
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

    $("searchInput")?.addEventListener(
      "input",
      event => {
        performSearch(event.target.value);
      }
    );

    window.addEventListener(
      "hashchange",
      route
    );

    // مراقبة تغيير حالة تسجيل الدخول
    if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
          console.log(
            "🔑 Auth event:",
            event
          );

          currentUser =
            session?.user || null;

          if (currentUser) {
            await checkAdmin(currentUser);
          } else {
            isAdmin = false;
          }

          updateUserInterface();
        }
      );
    }
  }

  // =====================================================
  // تشغيل الموقع
  // =====================================================

  async function start() {
    console.log(
      "🚀 Starting SOKA..."
    );

    setupEvents();

    await checkSession();

    await route();

    console.log(
      "✅ SOKA started successfully"
    );
  }

  // =====================================================
  // API عامة
  // =====================================================

  window.SOKA = {
    openSeries,
    openMovie,
    openSeason,
    watchEpisode,
    adminLoadMovies,
    adminLoadSeries,
    loadMovies,
    loadSeries,
    showHome
  };

  // =====================================================
  // منع الشاشة البيضاء بسبب أخطاء JS
  // =====================================================

  window.addEventListener(
    "error",
    event => {
      console.error(
        "❌ SOKA JavaScript error:",
        event.error
      );

      showMessage(
        "حدث خطأ في الموقع. تحقق من Console.",
        "error"
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    event => {
      console.error(
        "❌ SOKA Promise error:",
        event.reason
      );
    }
  );

  // =====================================================
  // تشغيل
  // =====================================================

  start();

})();
