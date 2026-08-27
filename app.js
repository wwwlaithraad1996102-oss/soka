(() => {
  "use strict";

  console.log("SOKA FULL APP START");

  // =========================================================
  // CONFIG
  // =========================================================

  const cfg = window.SOKA_CONFIG || {};

  let supabaseClient = null;
  let currentUser = null;
  let isAdmin = false;

  // =========================================================
  // SUPABASE
  // =========================================================

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
      console.error("Supabase config missing");
    }
  } catch (error) {
    console.error("Supabase initialization error:", error);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showMessage(message, type = "info") {
    let box = $("sokaMessage");

    if (!box) {
      box = document.createElement("div");
      box.id = "sokaMessage";

      box.style.position = "fixed";
      box.style.top = "20px";
      box.style.left = "20px";
      box.style.right = "20px";
      box.style.zIndex = "999999";
      box.style.padding = "16px";
      box.style.borderRadius = "14px";
      box.style.fontSize = "16px";
      box.style.fontWeight = "700";
      box.style.textAlign = "center";
      box.style.boxShadow = "0 10px 30px rgba(0,0,0,.4)";

      document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "success") {
      box.style.background = "#16803c";
    } else if (type === "error") {
      box.style.background = "#a51d2d";
    } else {
      box.style.background = "#252530";
    }

    box.style.color = "#fff";
    box.style.display = "block";

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      box.style.display = "none";
    }, 5000);
  }

  function loadingHTML(text = "جاري التحميل...") {
    return `
      <div style="
        padding:25px;
        text-align:center;
        color:#ccc;
        font-size:18px;
      ">
        ${escapeHTML(text)}
      </div>
    `;
  }

  // =========================================================
  // SECTIONS
  // =========================================================

  function hideAllSections() {
    document
      .querySelectorAll("main > section")
      .forEach(section => {
        section.style.display = "none";
      });
  }

  function showHome() {
    hideAllSections();

    const home = $("home");

    if (home) {
      home.style.display = "block";
    }

    updateUserInterface();

    loadHomeContent();
  }

  function showLogin() {
    hideAllSections();

    const login = $("login");

    if (login) {
      login.style.display = "block";
    }

    updateUserInterface();
  }

  // =========================================================
  // USER UI
  // =========================================================

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
        authNav.textContent = "تسجيل الدخول";
        authNav.href = "#login";
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

  // =========================================================
  // CHECK ADMIN
  // =========================================================

  async function checkAdmin(user) {
    isAdmin = false;

    if (!user || !supabaseClient) {
      updateUserInterface();
      return false;
    }

    try {
      const result = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      console.log("Admin check:", result);

      if (
        !result.error &&
        result.data &&
        result.data.role === "admin"
      ) {
        isAdmin = true;
      }

    } catch (error) {
      console.error("Admin check error:", error);
    }

    updateUserInterface();

    return isAdmin;
  }

  // =========================================================
  // SESSION
  // =========================================================

  async function checkSession() {
    if (!supabaseClient) {
      showMessage(
        "تعذر الاتصال بـ Supabase. تحقق من config.js",
        "error"
      );
      return;
    }

    try {
      const result =
        await supabaseClient.auth.getSession();

      if (result.data && result.data.session) {

        currentUser =
          result.data.session.user;

        await checkAdmin(currentUser);

      } else {

        currentUser = null;
        isAdmin = false;

        updateUserInterface();
      }

    } catch (error) {
      console.error("Session error:", error);

      showMessage(
        "حدث خطأ أثناء فحص الجلسة.",
        "error"
      );
    }
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async function login(event) {
    event.preventDefault();

    if (!supabaseClient) {
      showMessage("Supabase غير متصل.", "error");
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
          email,
          password
        });

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
          ? "تم تسجيل الدخول — أنت المدير ✅"
          : "تم تسجيل الدخول بنجاح ✅",
        "success"
      );

      location.hash = "#home";

      showHome();

    } catch (error) {

      console.error(error);

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

  // =========================================================
  // SIGNUP
  // =========================================================

  async function signup(event) {
    event.preventDefault();

    if (!supabaseClient) {
      showMessage("Supabase غير متصل.", "error");
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

    try {

      const result =
        await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });

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
          "تم إنشاء الحساب وتسجيل الدخول بنجاح ✅",
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

      console.error(error);

      showMessage(
        "حدث خطأ أثناء إنشاء الحساب.",
        "error"
      );
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logout() {
    if (!supabaseClient) return;

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

      console.error(error);

      showMessage(
        "تعذر تسجيل الخروج.",
        "error"
      );
    }
  }

  // =========================================================
  // MOVIE CARD
  // =========================================================

  function movieCard(movie) {
    const poster =
      movie.poster_url ||
      "https://via.placeholder.com/500x750?text=SOKA";

    return `
      <article class="card" style="
        overflow:hidden;
        border-radius:18px;
        background:#111118;
        border:1px solid #252530;
      ">

        <img
          src="${escapeHTML(poster)}"
          alt="${escapeHTML(movie.title)}"
          loading="lazy"
          style="
            width:100%;
            aspect-ratio:2/3;
            object-fit:cover;
            display:block;
          "
          onerror="this.src='https://via.placeholder.com/500x750?text=SOKA'"
        >

        <div style="padding:16px">

          <h3>
            ${escapeHTML(movie.title)}
          </h3>

          ${
            movie.year
              ? `<p>📅 ${movie.year}</p>`
              : ""
          }

          ${
            movie.genre
              ? `<p>🎭 ${escapeHTML(movie.genre)}</p>`
              : ""
          }

          <button
            class="btn"
            onclick="window.SOKA_showMovie('${movie.id}')"
          >
            عرض الفيلم
          </button>

        </div>
      </article>
    `;
  }

  // =========================================================
  // SERIES CARD
  // =========================================================

  function seriesCard(series) {
    const poster =
      series.poster_url ||
      "https://via.placeholder.com/500x750?text=SOKA";

    return `
      <article class="card" style="
        overflow:hidden;
        border-radius:18px;
        background:#111118;
        border:1px solid #252530;
      ">

        <img
          src="${escapeHTML(poster)}"
          alt="${escapeHTML(series.title)}"
          loading="lazy"
          style="
            width:100%;
            aspect-ratio:2/3;
            object-fit:cover;
            display:block;
          "
          onerror="this.src='https://via.placeholder.com/500x750?text=SOKA'"
        >

        <div style="padding:16px">

          <h3>
            ${escapeHTML(series.title)}
          </h3>

          ${
            series.year
              ? `<p>📅 ${series.year}</p>`
              : ""
          }

          ${
            series.genre
              ? `<p>🎭 ${escapeHTML(series.genre)}</p>`
              : ""
          }

          <button
            class="btn"
            onclick="window.SOKA_showSeries('${series.id}')"
          >
            عرض المسلسل
          </button>

        </div>
      </article>
    `;
  }

  // =========================================================
  // HOME CONTENT
  // =========================================================

  async function loadHomeContent() {
    if (!supabaseClient) return;

    const movieGrid = $("movieGrid");
    const seriesGrid = $("seriesGrid");

    if (movieGrid) {
      movieGrid.innerHTML =
        loadingHTML("جاري تحميل الأفلام...");
    }

    if (seriesGrid) {
      seriesGrid.innerHTML =
        loadingHTML("جاري تحميل المسلسلات...");
    }

    // MOVIES

    try {

      const movies =
        await supabaseClient
          .from("movies")
          .select("*")
          .eq("is_published", true)
          .order("created_at", {
            ascending: false
          })
          .limit(20);

      if (movies.error) {
        console.error(
          "Movies error:",
          movies.error
        );

        if (movieGrid) {
          movieGrid.innerHTML =
            `<p>تعذر تحميل الأفلام.</p>`;
        }

      } else {

        if (movieGrid) {

          if (!movies.data?.length) {

            movieGrid.innerHTML =
              `<p>لا توجد أفلام منشورة حاليًا.</p>`;

          } else {

            movieGrid.innerHTML =
              movies.data
                .map(movieCard)
                .join("");
          }
        }
      }

    } catch (error) {
      console.error(error);
    }

    // SERIES

    try {

      const series =
        await supabaseClient
          .from("series")
          .select("*")
          .eq("is_published", true)
          .order("created_at", {
            ascending: false
          })
          .limit(20);

      if (series.error) {

        console.error(
          "Series error:",
          series.error
        );

        if (seriesGrid) {
          seriesGrid.innerHTML =
            `<p>تعذر تحميل المسلسلات.</p>`;
        }

      } else {

        if (seriesGrid) {

          if (!series.data?.length) {

            seriesGrid.innerHTML =
              `<p>لا توجد مسلسلات منشورة حاليًا.</p>`;

          } else {

            seriesGrid.innerHTML =
              series.data
                .map(seriesCard)
                .join("");
          }
        }
      }

    } catch (error) {
      console.error(error);
    }
  }

  // =========================================================
  // SERIES PAGE
  // =========================================================

  async function showSeriesPage() {
    hideAllSections();

    const section = $("series");

    if (!section) return;

    section.style.display = "block";

    const grid = $("seriesGrid");

    if (!grid) return;

    grid.innerHTML =
      loadingHTML("جاري تحميل المسلسلات...");

    const result =
      await supabaseClient
        .from("series")
        .select("*")
        .eq("is_published", true)
        .order("created_at", {
          ascending: false
        });

    if (result.error) {

      console.error(result.error);

      grid.innerHTML =
        `<p>حدث خطأ في تحميل المسلسلات.</p>`;

      return;
    }

    if (!result.data?.length) {

      grid.innerHTML =
        `<p>لا توجد مسلسلات.</p>`;

      return;
    }

    grid.innerHTML =
      result.data
        .map(seriesCard)
        .join("");
  }

  // =========================================================
  // MOVIES PAGE
  // =========================================================

  async function showMoviesPage() {
    hideAllSections();

    const section = $("movies");

    if (!section) return;

    section.style.display = "block";

    const grid = $("movieGrid");

    if (!grid) return;

    grid.innerHTML =
      loadingHTML("جاري تحميل الأفلام...");

    const result =
      await supabaseClient
        .from("movies")
        .select("*")
        .eq("is_published", true)
        .order("created_at", {
          ascending: false
        });

    if (result.error) {

      console.error(result.error);

      grid.innerHTML =
        `<p>حدث خطأ في تحميل الأفلام.</p>`;

      return;
    }

    if (!result.data?.length) {

      grid.innerHTML =
        `<p>لا توجد أفلام.</p>`;

      return;
    }

    grid.innerHTML =
      result.data
        .map(movieCard)
        .join("");
  }

  // =========================================================
  // SHOW SERIES
  // =========================================================

  async function showSeries(id) {
    hideAllSections();

    const detail = $("detail");

    if (!detail) return;

    detail.style.display = "block";

    const content =
      $("detailContent");

    if (!content) return;

    content.innerHTML =
      loadingHTML("جاري تحميل المسلسل...");

    const result =
      await supabaseClient
        .from("series")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (result.error || !result.data) {

      content.innerHTML =
        `<p>تعذر العثور على المسلسل.</p>`;

      return;
    }

    const series = result.data;

    const seasons =
      await supabaseClient
        .from("seasons")
        .select("*")
        .eq("series_id", id)
        .order("season_number", {
          ascending: true
        });

    let seasonsHTML = "";

    if (!seasons.error && seasons.data?.length) {

      for (const season of seasons.data) {

        const episodes =
          await supabaseClient
            .from("episodes")
            .select("*")
            .eq("season_id", season.id)
            .eq("is_published", true)
            .order("episode_number", {
              ascending: true
            });

        seasonsHTML += `
          <div style="
            margin-top:25px;
            padding:20px;
            background:#111118;
            border-radius:15px;
          ">

            <h3>
              📺 ${escapeHTML(
                season.title ||
                `الموسم ${season.season_number}`
              )}
            </h3>

            ${
              episodes.data?.length
                ? episodes.data.map(ep => `
                  <div style="
                    padding:12px;
                    margin:8px 0;
                    border-bottom:1px solid #292932;
                  ">
                    <strong>
                      الحلقة ${ep.episode_number}
                    </strong>

                    <div>
                      ${escapeHTML(ep.title)}
                    </div>

                    ${
                      ep.video_url
                        ? `
                          <button
                            class="btn"
                            onclick="window.SOKA_watchEpisode('${ep.id}')"
                          >
                            ▶️ مشاهدة
                          </button>
                        `
                        : `
                          <small>
                            الفيديو غير مضاف بعد
                          </small>
                        `
                    }
                  </div>
                `).join("")
                : `<p>لا توجد حلقات منشورة.</p>`
            }

          </div>
        `;
      }

    } else {

      seasonsHTML =
        `<p>لا توجد مواسم.</p>`;
    }

    content.innerHTML = `

      <div style="
        max-width:900px;
        margin:auto;
      ">

        <img
          src="${escapeHTML(
            series.backdrop_url ||
            series.poster_url ||
            ""
          )}"
          style="
            width:100%;
            max-height:450px;
            object-fit:cover;
            border-radius:20px;
          "
          onerror="this.style.display='none'"
        >

        <h1>
          📺 ${escapeHTML(series.title)}
        </h1>

        ${
          series.description
            ? `<p>${escapeHTML(series.description)}</p>`
            : ""
        }

        ${
          series.year
            ? `<p>📅 ${series.year}</p>`
            : ""
        }

        ${
          series.genre
            ? `<p>🎭 ${escapeHTML(series.genre)}</p>`
            : ""
        }

        <hr>

        <h2>المواسم والحلقات</h2>

        ${seasonsHTML}

      </div>
    `;
  }

  // =========================================================
  // SHOW MOVIE
  // =========================================================

  async function showMovie(id) {
    hideAllSections();

    const detail = $("detail");

    if (!detail) return;

    detail.style.display = "block";

    const content =
      $("detailContent");

    if (!content) return;

    content.innerHTML =
      loadingHTML("جاري تحميل الفيلم...");

    const result =
      await supabaseClient
        .from("movies")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (result.error || !result.data) {

      content.innerHTML =
        `<p>تعذر العثور على الفيلم.</p>`;

      return;
    }

    const movie = result.data;

    content.innerHTML = `

      <div style="
        max-width:900px;
        margin:auto;
      ">

        <img
          src="${escapeHTML(
            movie.backdrop_url ||
            movie.poster_url ||
            ""
          )}"
          style="
            width:100%;
            max-height:450px;
            object-fit:cover;
            border-radius:20px;
          "
        >

        <h1>
          🎬 ${escapeHTML(movie.title)}
        </h1>

        ${
          movie.description
            ? `<p>${escapeHTML(movie.description)}</p>`
            : ""
        }

        ${
          movie.year
            ? `<p>📅 ${movie.year}</p>`
            : ""
        }

        ${
          movie.genre
            ? `<p>🎭 ${escapeHTML(movie.genre)}</p>`
            : ""
        }

        ${
          movie.video_url
            ? `
              <video
                controls
                playsinline
                style="
                  width:100%;
                  margin-top:20px;
                  border-radius:15px;
                "
                src="${escapeHTML(movie.video_url)}"
              ></video>
            `
            : `
              <p>
                رابط الفيديو غير مضاف بعد.
              </p>
            `
        }

      </div>
    `;
  }

  // =========================================================
  // WATCH EPISODE
  // =========================================================

  async function watchEpisode(id) {
    hideAllSections();

    const watch = $("watch");

    if (!watch) return;

    watch.style.display = "block";

    const content =
      $("watchContent");

    if (!content) return;

    content.innerHTML =
      loadingHTML("جاري تحميل الحلقة...");

    const result =
      await supabaseClient
        .from("episodes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (result.error || !result.data) {

      content.innerHTML =
        `<p>تعذر العثور على الحلقة.</p>`;

      return;
    }

    const episode = result.data;

    content.innerHTML = `

      <div style="
        max-width:900px;
        margin:auto;
      ">

        <h1>
          الحلقة ${episode.episode_number}:
          ${escapeHTML(episode.title)}
        </h1>

        ${
          episode.description
            ? `<p>${escapeHTML(episode.description)}</p>`
            : ""
        }

        ${
          episode.video_url
            ? `
              <video
                controls
                playsinline
                autoplay
                style="
                  width:100%;
                  border-radius:18px;
                  background:#000;
                "
                src="${escapeHTML(episode.video_url)}"
              ></video>
            `
            : `
              <div style="
                padding:30px;
                background:#15151d;
                border-radius:15px;
                text-align:center;
              ">
                🎬 رابط الفيديو غير مضاف بعد.
              </div>
            `
        }

      </div>
    `;
  }

  // =========================================================
  // ADMIN PAGE
  // =========================================================

  async function showAdmin() {
    hideAllSections();

    const admin =
      $("admin");

    if (!admin) {
      showMessage(
        "قسم لوحة التحكم غير موجود في index.html.",
        "error"
      );
      return;
    }

    admin.style.display = "block";

    renderAdmin();

    await loadAdminStats();
  }

  // =========================================================
  // ADMIN UI
  // =========================================================

  function renderAdmin() {
    const old =
      $("sokaAdminContent");

    if (old) {
      old.remove();
    }

    const admin =
      $("admin");

    const box =
      document.createElement("div");

    box.id =
      "sokaAdminContent";

    box.style.padding = "20px";

    box.innerHTML = `

      <div style="
        background:#111118;
        border-radius:18px;
        padding:20px;
      ">

        <h2>
          ⚙️ لوحة تحكم SOKA
        </h2>

        <p>
          المدير:
          <strong>
            ${escapeHTML(
              currentUser?.email || ""
            )}
          </strong>
        </p>

        <p>
          الصلاحية:
          <strong style="color:#39d353">
            ADMIN ✅
          </strong>
        </p>

        <hr>

        <h2>📥 استيراد TVmaze</h2>

        <p>
          أدخل اسم المسلسل أو رقم TVmaze وسيتم استيراد
          المسلسل والمواسم والحلقات إلى جداول SOKA.
        </p>

        <div style="
          display:flex;
          flex-direction:column;
          gap:12px;
        ">

          <input
            id="tvmazeSearch"
            type="text"
            placeholder="مثال: Güller ve Günahlar"
            style="
              padding:15px;
              border-radius:10px;
              border:1px solid #333;
              background:#191920;
              color:#fff;
              font-size:16px;
            "
          >

          <button
            id="tvmazeImportBtn"
            class="btn"
            type="button"
          >
            📥 استيراد من TVmaze
          </button>

        </div>

        <div
          id="tvmazeResult"
          style="margin-top:20px"
        ></div>

        <hr>

        <h2>🎬 الأفلام</h2>

        <button
          id="refreshMoviesAdmin"
          class="btn"
          type="button"
        >
          إدارة الأفلام
        </button>

        <div id="adminMoviesList"></div>

        <hr>

        <h2>📺 المسلسلات</h2>

        <button
          id="refreshSeriesAdmin"
          class="btn"
          type="button"
        >
          إدارة المسلسلات
        </button>

        <div id="adminSeriesList"></div>

      </div>
    `;

    admin.appendChild(box);

    $("tvmazeImportBtn")
      ?.addEventListener(
        "click",
        importTVmaze
      );

    $("refreshMoviesAdmin")
      ?.addEventListener(
        "click",
        loadAdminMovies
      );

    $("refreshSeriesAdmin")
      ?.addEventListener(
        "click",
        loadAdminSeries
      );

    loadAdminMovies();
    loadAdminSeries();
  }

  // =========================================================
  // ADMIN STATS
  // =========================================================

  async function loadAdminStats() {
    if (!isAdmin) return;

    const stats =
      $("stats");

    if (!stats) return;

    try {

      const movies =
        await supabaseClient
          .from("movies")
          .select("id", {
            count: "exact",
            head: true
          });

      const series =
        await supabaseClient
          .from("series")
          .select("id", {
            count: "exact",
            head: true
          });

      const seasons =
        await supabaseClient
          .from("seasons")
          .select("id", {
            count: "exact",
            head: true
          });

      const episodes =
        await supabaseClient
          .from("episodes")
          .select("id", {
            count: "exact",
            head: true
          });

      stats.innerHTML = `

        <div style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
          gap:12px;
        ">

          <div style="padding:20px;background:#15151c;border-radius:15px">
            🎬<br>
            الأفلام<br>
            <strong>${movies.count ?? 0}</strong>
          </div>

          <div style="padding:20px;background:#15151c;border-radius:15px">
            📺<br>
            المسلسلات<br>
            <strong>${series.count ?? 0}</strong>
          </div>

          <div style="padding:20px;background:#15151c;border-radius:15px">
            📚<br>
            المواسم<br>
            <strong>${seasons.count ?? 0}</strong>
          </div>

          <div style="padding:20px;background:#15151c;border-radius:15px">
            🎞️<br>
            الحلقات<br>
            <strong>${episodes.count ?? 0}</strong>
          </div>

        </div>
      `;

    } catch (error) {
      console.error(error);
    }
  }

  // =========================================================
  // TVMAZE SEARCH
  // =========================================================

  async function searchTVmaze(query) {

    const url =
      "https://api.tvmaze.com/singlesearch/shows" +
      "?q=" +
      encodeURIComponent(query) +
      "&embed[]=episodes" +
      "&embed[]=seasons";

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        "TVmaze HTTP " + response.status
      );
    }

    return await response.json();
  }

  // =========================================================
  // TVMAZE IMPORT
  // =========================================================

  async function importTVmaze() {

    if (!isAdmin) {
      showMessage(
        "يجب أن تكون مديرًا لاستيراد المسلسلات.",
        "error"
      );
      return;
    }

    const input =
      $("tvmazeSearch");

    const resultBox =
      $("tvmazeResult");

    if (!input || !resultBox) return;

    const query =
      input.value.trim();

    if (!query) {
      showMessage(
        "أدخل اسم المسلسل أولًا.",
        "error"
      );
      return;
    }

    const button =
      $("tvmazeImportBtn");

    if (button) {
      button.disabled = true;
      button.textContent =
        "⏳ جاري الاستيراد...";
    }

    resultBox.innerHTML = loadingHTML(
      "جاري الاتصال بـ TVmaze..."
    );

    try {

      // -----------------------------------------------------
      // 1. TVMAZE
      // -----------------------------------------------------

      const show =
        await searchTVmaze(query);

      if (!show || !show.id) {
        throw new Error(
          "لم يتم العثور على المسلسل."
        );
      }

      console.log(
        "TVmaze show:",
        show
      );

      resultBox.innerHTML =
        loadingHTML(
          `تم العثور على: ${show.name}<br>جاري إضافة البيانات...`
        );

      // -----------------------------------------------------
      // 2. PREVENT DUPLICATE SERIES
      // -----------------------------------------------------

      let seriesId = null;

      const existing =
        await supabaseClient
          .from("series")
          .select("*")
          .eq("tvmaze_id", show.id)
          .maybeSingle();

      if (existing.error) {
        console.warn(
          "Existing series check:",
          existing.error
        );
      }

      // -----------------------------------------------------
      // 3. SERIES
      // -----------------------------------------------------

      const image =
        show.image || {};

      const poster =
        image.original ||
        image.medium ||
        null;

      const backdrop =
        image.original ||
        image.medium ||
        null;

      const premiered =
        show.premiered
          ? parseInt(
              show.premiered.substring(0, 4)
            )
          : null;

      const genres =
        Array.isArray(show.genres)
          ? show.genres.join(", ")
          : null;

      let seriesData = {
        title: show.name || "بدون عنوان",

        description:
          show.summary
            ? stripHTML(show.summary)
            : null,

        poster_url: poster,

        backdrop_url: backdrop,

        year: premiered,

        genre: genres,

        country:
          show.network?.country?.name ||
          show.webChannel?.country?.name ||
          null,

        tvmaze_id: show.id,

        tvmaze_url:
          `https://www.tvmaze.com/shows/${show.id}`,

        is_featured: false,

        is_published: true
      };

      if (existing.data) {

        seriesId =
          existing.data.id;

        const update =
          await supabaseClient
            .from("series")
            .update(seriesData)
            .eq("id", seriesId);

        if (update.error) {
          throw new Error(
            "فشل تحديث المسلسل: " +
            update.error.message
          );
        }

      } else {

        const insert =
          await supabaseClient
            .from("series")
            .insert(seriesData)
            .select("id")
            .single();

        if (insert.error) {
          throw new Error(
            "فشل إضافة المسلسل: " +
            insert.error.message
          );
        }

        seriesId =
          insert.data.id;
      }

      // -----------------------------------------------------
      // 4. SEASONS
      // -----------------------------------------------------

      const seasons =
        Array.isArray(show._embedded?.seasons)
          ? show._embedded.seasons
          : [];

      let importedSeasons = 0;
      let importedEpisodes = 0;

      for (const tvSeason of seasons) {

        // Check season

        let seasonRow =
          await supabaseClient
            .from("seasons")
            .select("*")
            .eq("series_id", seriesId)
            .eq(
              "season_number",
              tvSeason.number
            )
            .maybeSingle();

        let seasonId = null;

        if (seasonRow.data) {

          seasonId =
            seasonRow.data.id;

        } else {

          const seasonInsert =
            await supabaseClient
              .from("seasons")
              .insert({
                series_id: seriesId,

                season_number:
                  tvSeason.number,

                title:
                  `الموسم ${tvSeason.number}`,

                tvmaze_id:
                  tvSeason.id
              })
              .select("id")
              .single();

          if (seasonInsert.error) {
            throw new Error(
              `فشل إضافة الموسم ${tvSeason.number}: ` +
              seasonInsert.error.message
            );
          }

          seasonId =
            seasonInsert.data.id;

          importedSeasons++;
        }

        // ---------------------------------------------------
        // 5. EPISODES
        // ---------------------------------------------------

        const episodes =
          (show._embedded?.episodes || [])
            .filter(ep =>
              ep.season === tvSeason.number
            );

        for (const ep of episodes) {

          // Search existing episode
          const existingEpisode =
            await supabaseClient
              .from("episodes")
              .select("id")
              .eq("season_id", seasonId)
              .eq(
                "episode_number",
                ep.number
              )
              .maybeSingle();

          if (existingEpisode.data) {
            continue;
          }

          const episodeInsert =
            await supabaseClient
              .from("episodes")
              .insert({

                series_id:
                  seriesId,

                season_id:
                  seasonId,

                episode_number:
                  ep.number,

                title:
                  ep.name ||
                  `الحلقة ${ep.number}`,

                description:
                  ep.summary
                    ? stripHTML(ep.summary)
                    : null,

                thumbnail_url:
                  ep.image?.original ||
                  ep.image?.medium ||
                  null,

                video_url:
                  null,

                duration_minutes:
                  ep.runtime ||
                  null,

                quality:
                  null,

                tvmaze_id:
                  ep.id,

                tvmaze_url:
                  `https://www.tvmaze.com/episodes/${ep.id}`,

                airdate:
                  ep.airdate ||
                  null,

                is_published:
                  true
              });

          if (episodeInsert.error) {

            console.error(
              "Episode insert error:",
              episodeInsert.error
            );

            throw new Error(
              `فشل إضافة الحلقة ${ep.number} من الموسم ${tvSeason.number}: ` +
              episodeInsert.error.message
            );
          }

          importedEpisodes++;
        }
      }

      // -----------------------------------------------------
      // DONE
      // -----------------------------------------------------

      resultBox.innerHTML = `

        <div style="
          padding:20px;
          background:#123d27;
          border-radius:15px;
        ">

          <h2>
            ✅ تم الاستيراد بنجاح
          </h2>

          <p>
            📺 المسلسل:
            <strong>
              ${escapeHTML(show.name)}
            </strong>
          </p>

          <p>
            📚 المواسم الجديدة:
            <strong>
              ${importedSeasons}
            </strong>
          </p>

          <p>
            🎞️ الحلقات الجديدة:
            <strong>
              ${importedEpisodes}
            </strong>
          </p>

          <button
            class="btn"
            onclick="location.hash='#series'"
          >
            📺 عرض المسلسل
          </button>

        </div>
      `;

      showMessage(
        `تم استيراد ${show.name} بنجاح ✅`,
        "success"
      );

      await loadAdminStats();

      await loadAdminSeries();

      // Refresh home data
      await loadHomeContent();

    } catch (error) {

      console.error(
        "TVmaze import error:",
        error
      );

      resultBox.innerHTML = `

        <div style="
          padding:20px;
          background:#481a20;
          border-radius:15px;
        ">

          <h3>
            ❌ فشل الاستيراد
          </h3>

          <p>
            ${escapeHTML(
              error.message ||
              "حدث خطأ غير معروف."
            )}
          </p>

          <p style="color:#bbb">
            افتح Console إذا أردت معرفة التفاصيل التقنية.
          </p>

        </div>
      `;

      showMessage(
        error.message ||
        "فشل استيراد TVmaze.",
        "error"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent =
          "📥 استيراد من TVmaze";
      }
    }
  }

  // =========================================================
  // REMOVE HTML FROM TVMAZE SUMMARY
  // =========================================================

  function stripHTML(html) {

    if (!html) return "";

    const div =
      document.createElement("div");

    div.innerHTML = html;

    return (
      div.textContent ||
      div.innerText ||
      ""
    ).trim();
  }

  // =========================================================
  // ADMIN MOVIES
  // =========================================================

  async function loadAdminMovies() {

    const box =
      $("adminMoviesList");

    if (!box) return;

    box.innerHTML =
      loadingHTML("جاري تحميل الأفلام...");

    const result =
      await supabaseClient
        .from("movies")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (result.error) {

      box.innerHTML =
        `<p>خطأ: ${escapeHTML(
          result.error.message
        )}</p>`;

      return;
    }

    if (!result.data?.length) {

      box.innerHTML =
        `<p>لا توجد أفلام.</p>`;

      return;
    }

    box.innerHTML =
      result.data.map(movie => `

        <div style="
          margin-top:12px;
          padding:15px;
          background:#181820;
          border-radius:12px;
        ">

          <strong>
            ${escapeHTML(movie.title)}
          </strong>

          <br>

          <small>
            ${movie.is_published
              ? "🟢 منشور"
              : "🔴 غير منشور"}
          </small>

        </div>

      `).join("");
  }

  // =========================================================
  // ADMIN SERIES
  // =========================================================

  async function loadAdminSeries() {

    const box =
      $("adminSeriesList");

    if (!box) return;

    box.innerHTML =
      loadingHTML("جاري تحميل المسلسلات...");

    const result =
      await supabaseClient
        .from("series")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (result.error) {

      box.innerHTML =
        `<p>خطأ: ${escapeHTML(
          result.error.message
        )}</p>`;

      return;
    }

    if (!result.data?.length) {

      box.innerHTML =
        `<p>لا توجد مسلسلات.</p>`;

      return;
    }

    box.innerHTML =
      result.data.map(series => `

        <div style="
          margin-top:12px;
          padding:15px;
          background:#181820;
          border-radius:12px;
        ">

          <strong>
            📺 ${escapeHTML(series.title)}
          </strong>

          <br>

          ${
            series.tvmaze_id
              ? `
                <small>
                  TVmaze ID:
                  ${series.tvmaze_id}
                </small>
              `
              : ""
          }

          <br>

          <small>
            ${
              series.is_published
                ? "🟢 منشور"
                : "🔴 غير منشور"
            }
          </small>

          <br>

          <button
            class="btn"
            onclick="window.SOKA_showSeries('${series.id}')"
          >
            عرض
          </button>

        </div>

      `).join("");
  }

  // =========================================================
  // SEARCH
  // =========================================================

  async function searchContent(value) {

    const grid =
      $("searchGrid");

    if (!grid) return;

    const query =
      value.trim();

    if (!query) {

      grid.innerHTML = "";

      return;
    }

    grid.innerHTML =
      loadingHTML("جاري البحث...");

    try {

      const movies =
        await supabaseClient
          .from("movies")
          .select("*")
          .eq("is_published", true)
          .ilike(
            "title",
            `%${query}%`
          )
          .limit(20);

      const series =
        await supabaseClient
          .from("series")
          .select("*")
          .eq("is_published", true)
          .ilike(
            "title",
            `%${query}%`
          )
          .limit(20);

      let html = "";

      if (movies.data?.length) {

        html += `
          <h3>🎬 الأفلام</h3>
          <div class="grid">
            ${movies.data.map(movieCard).join("")}
          </div>
        `;
      }

      if (series.data?.length) {

        html += `
          <h3>📺 المسلسلات</h3>
          <div class="grid">
            ${series.data.map(seriesCard).join("")}
          </div>
        `;
      }

      if (!html) {

        html =
          `<p>لم يتم العثور على نتائج.</p>`;
      }

      grid.innerHTML = html;

    } catch (error) {

      console.error(error);

      grid.innerHTML =
        `<p>حدث خطأ أثناء البحث.</p>`;
    }
  }

  // =========================================================
  // ROUTER
  // =========================================================

  function route() {

    const hash =
      location.hash || "#home";

    console.log(
      "SOKA ROUTE:",
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

        location.hash =
          "#login";

        return;
      }

      if (!isAdmin) {

        showMessage(
          "هذه الصفحة للمدير فقط.",
          "error"
        );

        location.hash =
          "#home";

        return;
      }

      showAdmin();

      return;
    }

    if (hash === "#movies") {

      showMoviesPage();

      return;
    }

    if (hash === "#series") {

      showSeriesPage();

      return;
    }

    if (hash === "#search") {

      hideAllSections();

      const search =
        $("search");

      if (search) {
        search.style.display =
          "block";
      }

      return;
    }

    showHome();
  }

  // =========================================================
  // EVENTS
  // =========================================================

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

    $("searchInput")
      ?.addEventListener(
        "input",
        event =>
          searchContent(
            event.target.value
          )
      );

    window.addEventListener(
      "hashchange",
      route
    );

    // Supabase auth changes

    if (supabaseClient) {

      supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

          console.log(
            "AUTH EVENT:",
            event
          );

          currentUser =
            session?.user || null;

          if (currentUser) {
            await checkAdmin(
              currentUser
            );
          } else {
            isAdmin = false;
          }

          updateUserInterface();
        }
      );
    }
  }

  // =========================================================
  // GLOBAL FUNCTIONS
  // =========================================================

  window.SOKA_showSeries =
    showSeries;

  window.SOKA_showMovie =
    showMovie;

  window.SOKA_watchEpisode =
    watchEpisode;

  window.SOKA_importTVmaze =
    importTVmaze;

  // =========================================================
  // START
  // =========================================================

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

  // =========================================================
  // ERROR PROTECTION
  // =========================================================

  window.addEventListener(
    "error",
    event => {

      console.error(
        "SOKA ERROR:",
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
        "SOKA PROMISE ERROR:",
        event.reason
      );

      showMessage(
        event.reason?.message ||
        "حدث خطأ أثناء تنفيذ العملية.",
        "error"
      );
    }
  );

  start();

})();
