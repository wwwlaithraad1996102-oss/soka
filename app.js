(() => {

  "use strict";

  console.log("SOKA v3 starting...");


  /* =====================================================
     CONFIG
  ===================================================== */

  const cfg = window.SOKA_CONFIG || {};

  let supabaseClient = null;

  let currentUser = null;

  let isAdmin = false;


  /* =====================================================
     INIT SUPABASE
  ===================================================== */

  try {

    if (
      cfg.supabaseUrl &&
      cfg.supabaseAnonKey &&
      window.supabase
    ) {

      supabaseClient =
        window.supabase.createClient(
          cfg.supabaseUrl,
          cfg.supabaseAnonKey
        );

    } else {

      console.error(
        "SOKA: Supabase config missing"
      );

    }

  } catch (error) {

    console.error(
      "Supabase initialization error:",
      error
    );

  }


  /* =====================================================
     HELPERS
  ===================================================== */

  const $ = id =>
    document.getElementById(id);


  function escapeHtml(value) {

    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function showMessage(
    message,
    type = "info"
  ) {

    let box = $("message");

    if (!box) {

      box =
        document.createElement("div");

      box.id = "message";

      Object.assign(
        box.style,
        {
          position: "fixed",
          top: "20px",
          left: "20px",
          right: "20px",
          zIndex: "999999",
          padding: "15px",
          borderRadius: "12px",
          fontSize: "16px",
          textAlign: "center",
          background: "#15151c",
          color: "#fff"
        }
      );

      document.body.appendChild(box);

    }


    box.textContent = message;

    box.style.display = "block";


    if (type === "error") {

      box.style.background = "#8b1e1e";

    } else if (type === "success") {

      box.style.background = "#176b3a";

    } else {

      box.style.background = "#15151c";

    }


    clearTimeout(box._timer);

    box._timer =
      setTimeout(() => {

        box.style.display = "none";

      }, 5000);

  }


  function formatDate(value) {

    if (!value) {
      return "";
    }

    try {

      return new Date(value)
        .toLocaleDateString("ar-IQ");

    } catch {

      return value;

    }

  }


  function imageOrPlaceholder(url) {

    return url ||
      "https://via.placeholder.com/300x450?text=SOKA";

  }


  /* =====================================================
     SECTIONS / ROUTER
  ===================================================== */

  function hideAllSections() {

    document
      .querySelectorAll("main > section")
      .forEach(section => {

        section.classList.add("hidden");

        section.style.display = "none";

      });

  }


  function showSection(id) {

    hideAllSections();

    const section = $(id);

    if (!section) {
      return;
    }

    section.classList.remove("hidden");

    section.style.display = "block";

  }


  /* =====================================================
     USER UI
  ===================================================== */

  function updateUserInterface() {

    const authNav =
      $("authNav");

    const logoutBtn =
      $("logoutBtn");

    const adminNav =
      $("adminNav");

    if (currentUser) {

      if (authNav) {

        authNav.textContent =
          currentUser.email ||
          "حسابي";

        authNav.href =
          "#home";

      }


      if (logoutBtn) {

        logoutBtn.classList.remove("hidden");

        logoutBtn.style.display =
          "inline-block";

      }


      if (adminNav) {

        if (isAdmin) {

          adminNav.classList.remove("hidden");

          adminNav.style.display =
            "inline-block";

        } else {

          adminNav.classList.add("hidden");

          adminNav.style.display =
            "none";

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

        logoutBtn.style.display =
          "none";

      }


      if (adminNav) {

        adminNav.classList.add("hidden");

        adminNav.style.display =
          "none";

      }

    }


    const info =
      $("adminUserInfo");

    if (info && currentUser) {

      info.innerHTML = `

        <div style="
          padding:15px;
          background:#181820;
          border-radius:12px;
          margin:15px 0;
        ">

          <strong>
            👤 المدير:
          </strong>

          ${escapeHtml(currentUser.email)}

          <br><br>

          <strong>
            الصلاحية:
          </strong>

          ${
            isAdmin
              ? "ADMIN ✅"
              : "غير متاحة ❌"
          }

        </div>

      `;

    }

  }


  /* =====================================================
     CHECK ADMIN
  ===================================================== */

  async function checkAdmin(user) {

    isAdmin = false;

    if (!user || !supabaseClient) {

      updateUserInterface();

      return false;

    }


    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();


      console.log(
        "Admin profile:",
        data,
        error
      );


      if (error) {

        console.error(
          "Admin profile error:",
          error
        );

        showMessage(
          "تم تسجيل الدخول، لكن تعذر قراءة صلاحية المدير.",
          "error"
        );

        isAdmin = false;

      } else if (
        data &&
        data.role === "admin"
      ) {

        isAdmin = true;

      }


    } catch (error) {

      console.error(
        "Admin check failed:",
        error
      );

      isAdmin = false;

    }


    updateUserInterface();

    return isAdmin;

  }


  /* =====================================================
     SESSION
  ===================================================== */

  async function checkSession() {

    if (!supabaseClient) {

      showMessage(
        "تعذر الاتصال بـ Supabase. تحقق من config.js.",
        "error"
      );

      return;

    }


    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .auth
          .getSession();


      if (error) {

        console.error(
          error
        );

        return;

      }


      if (
        data &&
        data.session
      ) {

        currentUser =
          data.session.user;

        await checkAdmin(
          currentUser
        );

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

    }

  }


  /* =====================================================
     AUTH LISTENER
  ===================================================== */

  function setupAuthListener() {

    if (!supabaseClient) {
      return;
    }


    supabaseClient
      .auth
      .onAuthStateChange(
        async (event, session) => {

          console.log(
            "Auth event:",
            event
          );


          if (session) {

            currentUser =
              session.user;

            await checkAdmin(
              currentUser
            );

          } else {

            currentUser = null;

            isAdmin = false;

            updateUserInterface();

          }

        }
      );

  }


  /* =====================================================
     LOGIN
  ===================================================== */

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
        "أدخل البريد وكلمة المرور.",
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
        "جاري الدخول...";

    }


    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .auth
          .signInWithPassword({
            email,
            password
          });


      if (error) {

        console.error(error);

        showMessage(
          error.message,
          "error"
        );

        return;

      }


      currentUser =
        data.user;


      await checkAdmin(
        currentUser
      );


      showMessage(
        isAdmin
          ? "تم تسجيل الدخول — أنت المدير ✅"
          : "تم تسجيل الدخول بنجاح.",
        "success"
      );


      location.hash =
        isAdmin
          ? "#admin"
          : "#home";


    } catch (error) {

      console.error(
        error
      );

      showMessage(
        "حدث خطأ أثناء تسجيل الدخول.",
        "error"
      );


    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          "دخول";

      }

    }

  }


  /* =====================================================
     SIGNUP
  ===================================================== */

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


    if (
      !name ||
      !email ||
      !password
    ) {

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

      button.disabled =
        true;

      button.textContent =
        "جاري إنشاء الحساب...";

    }


    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .auth
          .signUp({

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

        showMessage(
          error.message,
          "error"
        );

        return;

      }


      if (data.session) {

        currentUser =
          data.user;

        await checkAdmin(
          currentUser
        );


        /*
          نحاول إنشاء profile
          إذا لم يكن موجودًا.
        */

        try {

          await supabaseClient
            .from("profiles")
            .upsert({

              id: currentUser.id,

              full_name: name,

              role: "user"

            }, {

              onConflict: "id"

            });

        } catch (profileError) {

          console.warn(
            "Profile creation:",
            profileError
          );

        }


        showMessage(
          "تم إنشاء الحساب بنجاح.",
          "success"
        );


        location.hash =
          "#home";


      } else {

        showMessage(
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب.",
          "success"
        );

      }


    } catch (error) {

      console.error(
        error
      );

      showMessage(
        "حدث خطأ أثناء إنشاء الحساب.",
        "error"
      );


    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          "إنشاء حساب";

      }

    }

  }


  /* =====================================================
     LOGOUT
  ===================================================== */

  async function logout() {

    if (!supabaseClient) {
      return;
    }


    try {

      await supabaseClient
        .auth
        .signOut();


      currentUser = null;

      isAdmin = false;

      updateUserInterface();


      location.hash =
        "#home";


      showMessage(
        "تم تسجيل الخروج.",
        "success"
      );


    } catch (error) {

      console.error(
        error
      );

    }

  }


  /* =====================================================
     LOAD MOVIES
  ===================================================== */

  async function loadMovies() {

    const grid =
      $("movieGrid");

    if (!grid) {
      return;
    }


    grid.innerHTML =
      `<div class="loading">جاري تحميل الأفلام…</div>`;


    const {
      data,
      error
    } =
      await supabaseClient
        .from("movies")
        .select("*")
        .eq("is_published", true)
        .order("created_at", {
          ascending: false
        });


    if (error) {

      console.error(error);

      grid.innerHTML =
        `<div class="error-box">
          تعذر تحميل الأفلام.
        </div>`;

      return;

    }


    if (!data || !data.length) {

      grid.innerHTML =
        `<div class="empty">
          لا توجد أفلام منشورة حاليًا.
        </div>`;

      return;

    }


    grid.innerHTML =
      data.map(movie => `

        <article class="content-card">

          <img
            src="${escapeHtml(
              imageOrPlaceholder(
                movie.poster_url
              )
            )}"
            alt="${escapeHtml(movie.title)}"
            loading="lazy"
          >

          <div class="content-info">

            <h3>
              ${escapeHtml(movie.title)}
            </h3>

            ${
              movie.year
                ? `<p>📅 ${movie.year}</p>`
                : ""
            }

            ${
              movie.genre
                ? `<p>🎭 ${escapeHtml(movie.genre)}</p>`
                : ""
            }

            <button
              class="btn"
              type="button"
              onclick="SOKA.showMovie('${movie.id}')">

              مشاهدة التفاصيل

            </button>

          </div>

        </article>

      `).join("");

  }


  /* =====================================================
     LOAD SERIES
  ===================================================== */

  async function loadSeries() {

    const grid =
      $("seriesGrid");

    if (!grid) {
      return;
    }


    grid.innerHTML =
      `<div class="loading">جاري تحميل المسلسلات…</div>`;


    const {
      data,
      error
    } =
      await supabaseClient
        .from("series")
        .select("*")
        .eq("is_published", true)
        .order("created_at", {
          ascending: false
        });


    if (error) {

      console.error(error);

      grid.innerHTML =
        `<div class="error-box">
          تعذر تحميل المسلسلات.
        </div>`;

      return;

    }


    if (!data || !data.length) {

      grid.innerHTML =
        `<div class="empty">
          لا توجد مسلسلات منشورة حاليًا.
        </div>`;

      return;

    }


    grid.innerHTML =
      data.map(series => `

        <article class="content-card">

          <img
            src="${escapeHtml(
              imageOrPlaceholder(
                series.poster_url
              )
            )}"
            alt="${escapeHtml(series.title)}"
            loading="lazy"
          >

          <div class="content-info">

            <h3>
              ${escapeHtml(series.title)}
            </h3>

            ${
              series.year
                ? `<p>📅 ${series.year}</p>`
                : ""
            }

            ${
              series.genre
                ? `<p>🎭 ${escapeHtml(series.genre)}</p>`
                : ""
            }

            <button
              class="btn"
              type="button"
              onclick="SOKA.showSeries('${series.id}')">

              عرض المسلسل

            </button>

          </div>

        </article>

      `).join("");

  }


  /* =====================================================
     SEARCH
  ===================================================== */

  async function searchContent() {

    const input =
      $("searchInput");

    const grid =
      $("searchGrid");

    if (!input || !grid) {
      return;
    }


    const q =
      input.value.trim();


    if (!q) {

      grid.innerHTML = "";

      return;

    }


    const [
      moviesResult,
      seriesResult
    ] =
      await Promise.all([

        supabaseClient
          .from("movies")
          .select("*")
          .eq("is_published", true)
          .ilike("title", `%${q}%`),

        supabaseClient
          .from("series")
          .select("*")
          .eq("is_published", true)
          .ilike("title", `%${q}%`)

      ]);


    const movies =
      moviesResult.data || [];

    const series =
      seriesResult.data || [];


    if (
      !movies.length &&
      !series.length
    ) {

      grid.innerHTML =
        `<div class="empty">
          لا توجد نتائج.
        </div>`;

      return;

    }


    grid.innerHTML = [

      ...movies.map(movie => `

        <article class="content-card">

          <img
            src="${escapeHtml(
              imageOrPlaceholder(
                movie.poster_url
              )
            )}"
            alt="${escapeHtml(movie.title)}">

          <div class="content-info">

            <h3>
              ${escapeHtml(movie.title)}
            </h3>

            <p>
              🎬 فيلم
            </p>

            <button
              class="btn"
              onclick="SOKA.showMovie('${movie.id}')">

              التفاصيل

            </button>

          </div>

        </article>

      `),

      ...series.map(series => `

        <article class="content-card">

          <img
            src="${escapeHtml(
              imageOrPlaceholder(
                series.poster_url
              )
            )}"
            alt="${escapeHtml(series.title)}">

          <div class="content-info">

            <h3>
              ${escapeHtml(series.title)}
            </h3>

            <p>
              📺 مسلسل
            </p>

            <button
              class="btn"
              onclick="SOKA.showSeries('${series.id}')">

              التفاصيل

            </button>

          </div>

        </article>

      `)

    ].join("");

  }


  /* =====================================================
     MOVIE DETAIL
  ===================================================== */

  async function showMovie(id) {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("movies")
        .select("*")
        .eq("id", id)
        .maybeSingle();


    if (error || !data) {

      showMessage(
        "تعذر تحميل الفيلم.",
        "error"
      );

      return;

    }


    showSection("detail");


    $("detailContent").innerHTML = `

      <div class="admin-wrapper">

        <h1>
          ${escapeHtml(data.title)}
        </h1>

        <img
          src="${escapeHtml(
            imageOrPlaceholder(
              data.poster_url
            )
          )}"
          style="
            width:220px;
            max-width:100%;
            border-radius:12px;
          ">

        ${
          data.description
            ? `<p>${escapeHtml(data.description)}</p>`
            : ""
        }

        ${
          data.video_url
            ? `
              <div style="margin-top:20px">

                <a
                  class="btn"
                  href="${escapeHtml(data.video_url)}"
                  target="_blank"
                  rel="noopener">

                  ▶️ مشاهدة الفيلم

                </a>

              </div>
            `
            : ""
        }

      </div>

    `;


    location.hash =
      "#detail";

  }


  /* =====================================================
     SERIES DETAIL
  ===================================================== */

  async function showSeries(id) {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("series")
        .select("*")
        .eq("id", id)
        .maybeSingle();


    if (error || !data) {

      showMessage(
        "تعذر تحميل المسلسل.",
        "error"
      );

      return;

    }


    const seasonsResult =
      await supabaseClient
        .from("seasons")
        .select("*")
        .eq("series_id", id)
        .order("season_number");


    const seasons =
      seasonsResult.data || [];


    showSection("detail");


    $("detailContent").innerHTML = `

      <div class="admin-wrapper">

        <h1>
          ${escapeHtml(data.title)}
        </h1>

        <img
          src="${escapeHtml(
            imageOrPlaceholder(
              data.poster_url
            )
          )}"
          style="
            width:220px;
            max-width:100%;
            border-radius:12px;
          ">


        ${
          data.description
            ? `<p>${escapeHtml(data.description)}</p>`
            : ""
        }


        <h2>
          📚 المواسم
        </h2>


        <div>

          ${
            seasons.length
              ? seasons.map(season => `

                <div style="
                  background:#181820;
                  padding:15px;
                  border-radius:10px;
                  margin:10px 0;
                ">

                  <h3>
                    ${escapeHtml(
                      season.title ||
                      `الموسم ${season.season_number}`
                    )}
                  </h3>

                  <button
                    class="btn"
                    onclick="SOKA.loadPublicEpisodes('${season.id}')">

                    مشاهدة الحلقات

                  </button>

                  <div
                    id="publicEpisodes-${season.id}">
                  </div>

                </div>

              `).join("")
              : `
                <div class="empty">
                  لا توجد مواسم.
                </div>
              `
          }

        </div>

      </div>

    `;


    location.hash =
      "#detail";

  }


  /* =====================================================
     PUBLIC EPISODES
  ===================================================== */

  async function loadPublicEpisodes(
    seasonId
  ) {

    const box =
      $(`publicEpisodes-${seasonId}`);


    if (!box) {
      return;
    }


    const {
      data,
      error
    } =
      await supabaseClient
        .from("episodes")
        .select("*")
        .eq("season_id", seasonId)
        .eq("is_published", true)
        .order("episode_number");


    if (error) {

      box.innerHTML =
        `<p>تعذر تحميل الحلقات.</p>`;

      return;

    }


    if (!data.length) {

      box.innerHTML =
        `<p>لا توجد حلقات منشورة.</p>`;

      return;

    }


    box.innerHTML =
      data.map(ep => `

        <div style="
          padding:10px;
          border-top:1px solid #333;
        ">

          <strong>
            الحلقة ${ep.episode_number}
          </strong>

          —
          ${escapeHtml(ep.title)}

          ${
            ep.video_url
              ? `
                <br><br>

                <a
                  class="btn"
                  href="${escapeHtml(ep.video_url)}"
                  target="_blank"
                  rel="noopener">

                  ▶️ مشاهدة

                </a>
              `
              : ""
          }

        </div>

      `).join("");

  }


  /* =====================================================
     ADMIN ACCESS
  ===================================================== */

  async function requireAdmin() {

    if (!currentUser) {

      showMessage(
        "يجب تسجيل الدخول أولًا.",
        "error"
      );

      location.hash =
        "#login";

      return false;

    }


    if (!isAdmin) {

      await checkAdmin(
        currentUser
      );

    }


    if (!isAdmin) {

      showMessage(
        "ليس لديك صلاحية المدير.",
        "error"
      );

      location.hash =
        "#home";

      return false;

    }


    return true;

  }


  /* =====================================================
     ADMIN PANEL
  ===================================================== */

  async function showAdmin() {

    const allowed =
      await requireAdmin();

    if (!allowed) {
      return;
    }


    showSection("admin");

    updateUserInterface();


    await Promise.all([

      loadStats(),

      loadAdminMovies(),

      loadAdminSeries(),

      loadSeriesSelects()

    ]);

  }


  /* =====================================================
     STATS
  ===================================================== */

  async function loadStats() {

    const stats =
      $("stats");

    if (!stats) {
      return;
    }


    const [
      movies,
      series,
      seasons,
      episodes
    ] =
      await Promise.all([

        supabaseClient
          .from("movies")
          .select("id", {
            count: "exact",
            head: true
          }),

        supabaseClient
          .from("series")
          .select("id", {
            count: "exact",
            head: true
          }),

        supabaseClient
          .from("seasons")
          .select("id", {
            count: "exact",
            head: true
          }),

        supabaseClient
          .from("episodes")
          .select("id", {
            count: "exact",
            head: true
          })

      ]);


    stats.innerHTML = `

      <div class="stat-card">

        🎬 الأفلام

        <strong>
          ${movies.count || 0}
        </strong>

      </div>


      <div class="stat-card">

        📺 المسلسلات

        <strong>
          ${series.count || 0}
        </strong>

      </div>


      <div class="stat-card">

        📚 المواسم

        <strong>
          ${seasons.count || 0}
        </strong>

      </div>


      <div class="stat-card">

        🎞️ الحلقات

        <strong>
          ${episodes.count || 0}
        </strong>

      </div>

    `;

  }


  /* =====================================================
     MOVIE FORM
  ===================================================== */

  async function saveMovie(event) {

    event.preventDefault();


    if (!(await requireAdmin())) {
      return;
    }


    const id =
      $("movieId").value;


    const payload = {

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
        $("movieYear").value
          ? Number($("movieYear").value)
          : null,

      genre:
        $("movieGenre").value.trim() || null,

      country:
        $("movieCountry").value.trim() || null,

      duration_minutes:
        $("movieDuration").value
          ? Number($("movieDuration").value)
          : null,

      is_featured:
        $("movieFeatured").checked,

      is_published:
        $("moviePublished").checked

    };


    let result;


    if (id) {

      result =
        await supabaseClient
          .from("movies")
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabaseClient
          .from("movies")
          .insert(payload);

    }


    if (result.error) {

      console.error(
        result.error
      );

      showMessage(
        result.error.message,
        "error"
      );

      return;

    }


    showMessage(
      id
        ? "تم تعديل الفيلم ✅"
        : "تمت إضافة الفيلم ✅",
      "success"
    );


    resetMovieForm();

    await loadAdminMovies();

    await loadStats();

    await loadMovies();

  }


  function resetMovieForm() {

    $("movieForm").reset();

    $("movieId").value = "";

    $("moviePublished").checked =
      true;

  }


  async function loadAdminMovies() {

    const box =
      $("moviesAdminList");

    if (!box) {
      return;
    }


    const {
      data,
      error
    } =
      await supabaseClient
        .from("movies")
        .select("*")
        .order("created_at", {
          ascending: false
        });


    if (error) {

      box.innerHTML =
        `<div class="error-box">
          ${escapeHtml(error.message)}
        </div>`;

      return;

    }


    if (!data.length) {

      box.innerHTML =
        `<div class="empty">
          لا توجد أفلام.
        </div>`;

      return;

    }


    box.innerHTML = `

      <div class="admin-table-wrapper">

        <table class="admin-table">

          <thead>

            <tr>

              <th>الصورة</th>

              <th>الفيلم</th>

              <th>السنة</th>

              <th>النشر</th>

              <th>الإجراءات</th>

            </tr>

          </thead>


          <tbody>

            ${data.map(movie => `

              <tr>

                <td>

                  <img
                    src="${escapeHtml(
                      imageOrPlaceholder(
                        movie.poster_url
                      )
                    )}">

                </td>


                <td>
                  ${escapeHtml(movie.title)}
                </td>


                <td>
                  ${movie.year || "-"}
                </td>


                <td>
                  ${
                    movie.is_published
                      ? "✅"
                      : "❌"
                  }
                </td>


                <td>

                  <button
                    class="btn"
                    onclick="SOKA.editMovie('${movie.id}')">

                    تعديل

                  </button>


                  <button
                    class="btn btn-danger"
                    onclick="SOKA.deleteMovie('${movie.id}')">

                    حذف

                  </button>

                </td>

              </tr>

            `).join("")}

          </tbody>

        </table>

      </div>

    `;

  }


  async function editMovie(id) {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("movies")
        .select("*")
        .eq("id", id)
        .single();


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    $("movieId").value =
      data.id;

    $("movieTitle").value =
      data.title || "";

    $("movieDescription").value =
      data.description || "";

    $("moviePoster").value =
      data.poster_url || "";

    $("movieBackdrop").value =
      data.backdrop_url || "";

    $("movieVideo").value =
      data.video_url || "";

    $("movieYear").value =
      data.year || "";

    $("movieGenre").value =
      data.genre || "";

    $("movieCountry").value =
      data.country || "";

    $("movieDuration").value =
      data.duration_minutes || "";

    $("movieFeatured").checked =
      !!data.is_featured;

    $("moviePublished").checked =
      !!data.is_published;


    showAdminTab(
      "moviesAdmin"
    );


    $("movieForm")
      .scrollIntoView({
        behavior: "smooth"
      });

  }


  async function deleteMovie(id) {

    if (!confirm(
      "هل تريد حذف هذا الفيلم؟"
    )) {
      return;
    }


    const {
      error
    } =
      await supabaseClient
        .from("movies")
        .delete()
        .eq("id", id);


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    showMessage(
      "تم حذف الفيلم.",
      "success"
    );


    await loadAdminMovies();

    await loadStats();

    await loadMovies();

  }


  /* =====================================================
     SERIES
  ===================================================== */

  async function saveSeries(event) {

    event.preventDefault();


    if (!(await requireAdmin())) {
      return;
    }


    const id =
      $("seriesId").value;


    const payload = {

      title:
        $("seriesTitle").value.trim(),

      description:
        $("seriesDescription").value.trim() || null,

      poster_url:
        $("seriesPoster").value.trim() || null,

      backdrop_url:
        $("seriesBackdrop").value.trim() || null,

      year:
        $("seriesYear").value
          ? Number($("seriesYear").value)
          : null,

      genre:
        $("seriesGenre").value.trim() || null,

      country:
        $("seriesCountry").value.trim() || null,

      tvmaze_id:
        $("seriesTvmazeId").value
          ? Number($("seriesTvmazeId").value)
          : null,

      tvmaze_url:
        $("seriesTvmazeUrl").value.trim() || null,

      is_featured:
        $("seriesFeatured").checked,

      is_published:
        $("seriesPublished").checked

    };


    let result;


    if (id) {

      result =
        await supabaseClient
          .from("series")
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabaseClient
          .from("series")
          .insert(payload);

    }


    if (result.error) {

      showMessage(
        result.error.message,
        "error"
      );

      return;

    }


    showMessage(
      id
        ? "تم تعديل المسلسل ✅"
        : "تمت إضافة المسلسل ✅",
      "success"
    );


    resetSeriesForm();

    await loadAdminSeries();

    await loadSeriesSelects();

    await loadStats();

    await loadSeries();

  }


  function resetSeriesForm() {

    $("seriesForm").reset();

    $("seriesId").value = "";

    $("seriesPublished").checked =
      true;

  }


  async function loadAdminSeries() {

    const box =
      $("seriesAdminList");

    if (!box) {
      return;
    }


    const {
      data,
      error
    } =
      await supabaseClient
        .from("series")
        .select("*")
        .order("created_at", {
          ascending: false
        });


    if (error) {

      box.innerHTML =
        `<div class="error-box">
          ${escapeHtml(error.message)}
        </div>`;

      return;

    }


    if (!data.length) {

      box.innerHTML =
        `<div class="empty">
          لا توجد مسلسلات.
        </div>`;

      return;

    }


    box.innerHTML = `

      <div class="admin-table-wrapper">

        <table class="admin-table">

          <thead>

            <tr>

              <th>الصورة</th>

              <th>المسلسل</th>

              <th>السنة</th>

              <th>TVmaze</th>

              <th>النشر</th>

              <th>الإجراءات</th>

            </tr>

          </thead>


          <tbody>

            ${data.map(item => `

              <tr>

                <td>

                  <img
                    src="${escapeHtml(
                      imageOrPlaceholder(
                        item.poster_url
                      )
                    )}">

                </td>


                <td>
                  ${escapeHtml(item.title)}
                </td>


                <td>
                  ${item.year || "-"}
                </td>


                <td>
                  ${item.tvmaze_id || "-"}
                </td>


                <td>
                  ${
                    item.is_published
                      ? "✅"
                      : "❌"
                  }
                </td>


                <td>

                  <button
                    class="btn"
                    onclick="SOKA.editSeries('${item.id}')">

                    تعديل

                  </button>


                  <button
                    class="btn btn-danger"
                    onclick="SOKA.deleteSeries('${item.id}')">

                    حذف

                  </button>

                </td>

              </tr>

            `).join("")}

          </tbody>

        </table>

      </div>

    `;

  }


  async function editSeries(id) {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("series")
        .select("*")
        .eq("id", id)
        .single();


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    $("seriesId").value =
      data.id;

    $("seriesTitle").value =
      data.title || "";

    $("seriesDescription").value =
      data.description || "";

    $("seriesPoster").value =
      data.poster_url || "";

    $("seriesBackdrop").value =
      data.backdrop_url || "";

    $("seriesYear").value =
      data.year || "";

    $("seriesGenre").value =
      data.genre || "";

    $("seriesCountry").value =
      data.country || "";

    $("seriesTvmazeId").value =
      data.tvmaze_id || "";

    $("seriesTvmazeUrl").value =
      data.tvmaze_url || "";

    $("seriesFeatured").checked =
      !!data.is_featured;

    $("seriesPublished").checked =
      !!data.is_published;


    showAdminTab(
      "seriesAdmin"
    );


    $("seriesForm")
      .scrollIntoView({
        behavior: "smooth"
      });

  }


  async function deleteSeries(id) {

    if (!confirm(
      "سيتم حذف المسلسل ومواسمه وحلقاته. هل أنت متأكد؟"
    )) {
      return;
    }


    /*
      نحذف الحلقات أولًا
    */

    const seasonsResult =
      await supabaseClient
        .from("seasons")
        .select("id")
        .eq("series_id", id);


    if (seasonsResult.error) {

      showMessage(
        seasonsResult.error.message,
        "error"
      );

      return;

    }


    const seasonIds =
      (seasonsResult.data || [])
        .map(s => s.id);


    if (seasonIds.length) {

      const {
        error: episodesError
      } =
        await supabaseClient
          .from("episodes")
          .delete()
          .in(
            "season_id",
            seasonIds
          );


      if (episodesError) {

        showMessage(
          episodesError.message,
          "error"
        );

        return;

      }

    }


    const {
      error: seasonsError
    } =
      await supabaseClient
        .from("seasons")
        .delete()
        .eq("series_id", id);


    if (seasonsError) {

      showMessage(
        seasonsError.message,
        "error"
      );

      return;

    }


    const {
      error
    } =
      await supabaseClient
        .from("series")
        .delete()
        .eq("id", id);


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    showMessage(
      "تم حذف المسلسل.",
      "success"
    );


    await loadAdminSeries();

    await loadSeriesSelects();

    await loadStats();

    await loadSeries();

  }


  /* =====================================================
     LOAD SERIES SELECTS
  ===================================================== */

  async function loadSeriesSelects() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("series")
        .select("id,title")
        .order("title");


    if (error) {

      console.error(
        error
      );

      return;

    }


    const selects = [

      $("seasonSeriesSelect"),

      $("episodeSeriesSelect")

    ];


    selects.forEach(select => {

      if (!select) {
        return;
      }


      select.innerHTML =
        `<option value="">
          اختر المسلسل
        </option>`;


      (data || []).forEach(item => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          item.id;

        option.textContent =
          item.title;

        select.appendChild(
          option
        );

      });

    });

  }


  /* =====================================================
     SEASONS
  ===================================================== */

  async function loadSeasons() {

    const seriesId =
      $("seasonSeriesSelect").value;

    const box =
      $("seasonsAdminList");


    if (!seriesId) {

      box.innerHTML =
        `<div class="empty">
          اختر مسلسلًا لعرض المواسم.
        </div>`;

      return;

    }


    const {
      data,
      error
    } =
      await supabaseClient
        .from("seasons")
        .select("*")
        .eq("series_id", seriesId)
        .order("season_number");


    if (error) {

      box.innerHTML =
        `<div class="error-box">
          ${escapeHtml(error.message)}
        </div>`;

      return;

    }


    if (!data.length) {

      box.innerHTML =
        `<div class="empty">
          لا توجد مواسم لهذا المسلسل.
        </div>`;

      return;

    }


    box.innerHTML = `

      <div class="admin-table-wrapper">

        <table class="admin-table">

          <thead>

            <tr>

              <th>الموسم</th>

              <th>العنوان</th>

              <th>TVmaze ID</th>

              <th>الإجراءات</th>

            </tr>

          </thead>


          <tbody>

            ${data.map(item => `

              <tr>

                <td>
                  ${item.season_number}
                </td>

                <td>
                  ${escapeHtml(item.title || "")}
                </td>

                <td>
                  ${item.tvmaze_id || "-"}
                </td>

                <td>

                  <button
                    class="btn"
                    onclick="SOKA.editSeason('${item.id}')">

                    تعديل

                  </button>


                  <button
                    class="btn btn-danger"
                    onclick="SOKA.deleteSeason('${item.id}')">

                    حذف

                  </button>

                </td>

              </tr>

            `).join("")}

          </tbody>

        </table>

      </div>

    `;

  }


  async function saveSeason(event) {

    event.preventDefault();


    if (!(await requireAdmin())) {
      return;
    }


    const seriesId =
      $("seasonSeriesSelect").value;


    if (!seriesId) {

      showMessage(
        "اختر المسلسل أولًا.",
        "error"
      );

      return;

    }


    const id =
      $("seasonId").value;


    const payload = {

      series_id:
        seriesId,

      season_number:
        Number(
          $("seasonNumber").value
        ),

      title:
        $("seasonTitle").value.trim() || null,

      tvmaze_id:
        $("seasonTvmazeId").value
          ? Number($("seasonTvmazeId").value)
          : null

    };


    let result;


    if (id) {

      result =
        await supabaseClient
          .from("seasons")
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabaseClient
          .from("seasons")
          .insert(payload);

    }


    if (result.error) {

      showMessage(
        result.error.message,
        "error"
      );

      return;

    }


    showMessage(
      "تم حفظ الموسم ✅",
      "success"
    );


    resetSeasonForm();

    await loadSeasons();

    await loadStats();

  }


  function resetSeasonForm() {

    $("seasonForm").reset();

    $("seasonId").value = "";

  }


  async function editSeason(id) {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("seasons")
        .select("*")
        .eq("id", id)
        .single();


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    $("seasonId").value =
      data.id;

    $("seasonSeriesSelect").value =
      data.series_id;

    $("seasonNumber").value =
      data.season_number;

    $("seasonTitle").value =
      data.title || "";

    $("seasonTvmazeId").value =
      data.tvmaze_id || "";


    $("seasonForm")
      .scrollIntoView({
        behavior: "smooth"
      });

  }


  async function deleteSeason(id) {

    if (!confirm(
      "سيتم حذف حلقات هذا الموسم أيضًا. هل أنت متأكد؟"
    )) {
      return;
    }


    const {
      error: episodesError
    } =
      await supabaseClient
        .from("episodes")
        .delete()
        .eq("season_id", id);


    if (episodesError) {

      showMessage(
        episodesError.message,
        "error"
      );

      return;

    }


    const {
      error
    } =
      await supabaseClient
        .from("seasons")
        .delete()
        .eq("id", id);


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    showMessage(
      "تم حذف الموسم.",
      "success"
    );


    await loadSeasons();

    await loadStats();

  }


  /* =====================================================
     EPISODE SERIES -> SEASONS
  ===================================================== */

  async function loadEpisodeSeasons() {

    const seriesId =
      $("episodeSeriesSelect").value;

    const select =
      $("episodeSeasonSelect");


    select.innerHTML =
      `<option value="">
        اختر الموسم
      </option>`;


    if (!seriesId) {
      return;
    }


    const {
      data,
      error
    } =
      await supabaseClient
        .from("seasons")
        .select("*")
        .eq("series_id", seriesId)
        .order("season_number");


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    (data || []).forEach(season => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        season.id;

      option.textContent =
        season.title ||
        `الموسم ${season.season_number}`;

      select.appendChild(
        option
      );

    });


    $("episodesAdminList").innerHTML =
      "";

  }


  async function loadEpisodes() {

    const seasonId =
      $("episodeSeasonSelect").value;

    const box =
      $("episodesAdminList");


    if (!seasonId) {

      box.innerHTML =
        `<div class="empty">
          اختر الموسم لعرض الحلقات.
        </div>`;

      return;

    }


    const {
      data,
      error
    } =
      await supabaseClient
        .from("episodes")
        .select("*")
        .eq("season_id", seasonId)
        .order("episode_number");


    if (error) {

      box.innerHTML =
        `<div class="error-box">
          ${escapeHtml(error.message)}
        </div>`;

      return;

    }


    if (!data.length) {

      box.innerHTML =
        `<div class="empty">
          لا توجد حلقات.
        </div>`;

      return;

    }


    box.innerHTML = `

      <div class="admin-table-wrapper">

        <table class="admin-table">

          <thead>

            <tr>

              <th>الصورة</th>

              <th>الحلقة</th>

              <th>العنوان</th>

              <th>الجودة</th>

              <th>النشر</th>

              <th>الإجراءات</th>

            </tr>

          </thead>


          <tbody>

            ${data.map(ep => `

              <tr>

                <td>

                  <img
                    src="${escapeHtml(
                      imageOrPlaceholder(
                        ep.thumbnail_url
                      )
                    )}">

                </td>


                <td>
                  ${ep.episode_number}
                </td>


                <td>
                  ${escapeHtml(ep.title)}
                </td>


                <td>
                  ${escapeHtml(ep.quality || "-")}
                </td>


                <td>
                  ${
                    ep.is_published
                      ? "✅"
                      : "❌"
                  }
                </td>


                <td>

                  <button
                    class="btn"
                    onclick="SOKA.editEpisode('${ep.id}')">

                    تعديل

                  </button>


                  <button
                    class="btn btn-danger"
                    onclick="SOKA.deleteEpisode('${ep.id}')">

                    حذف

                  </button>

                </td>

              </tr>

            `).join("")}

          </tbody>

        </table>

      </div>

    `;

  }


  /* =====================================================
     SAVE EPISODE
  ===================================================== */

  async function saveEpisode(event) {

    event.preventDefault();


    if (!(await requireAdmin())) {
      return;
    }


    const seriesId =
      $("episodeSeriesSelect").value;

    const seasonId =
      $("episodeSeasonSelect").value;


    if (!seriesId || !seasonId) {

      showMessage(
        "اختر المسلسل والموسم.",
        "error"
      );

      return;

    }


    const id =
      $("episodeId").value;


    const payload = {

      series_id:
        seriesId,

      season_id:
        seasonId,

      episode_number:
        Number(
          $("episodeNumber").value
        ),

      title:
        $("episodeTitle").value.trim(),

      description:
        $("episodeDescription").value.trim() || null,

      thumbnail_url:
        $("episodeThumbnail").value.trim() || null,

      video_url:
        $("episodeVideo").value.trim() || null,

      duration_minutes:
        $("episodeDuration").value
          ? Number($("episodeDuration").value)
          : null,

      quality:
        $("episodeQuality").value.trim() || null,

      tvmaze_id:
        $("episodeTvmazeId").value
          ? Number($("episodeTvmazeId").value)
          : null,

      tvmaze_url:
        $("episodeTvmazeUrl").value.trim() || null,

      airdate:
        $("episodeAirdate").value || null,

      is_published:
        $("episodePublished").checked

    };


    let result;


    if (id) {

      result =
        await supabaseClient
          .from("episodes")
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabaseClient
          .from("episodes")
          .insert(payload);

    }


    if (result.error) {

      showMessage(
        result.error.message,
        "error"
      );

      return;

    }


    showMessage(
      "تم حفظ الحلقة ✅",
      "success"
    );


    resetEpisodeForm();

    await loadEpisodes();

    await loadStats();

  }


  function resetEpisodeForm() {

    $("episodeForm").reset();

    $("episodeId").value = "";

    $("episodePublished").checked =
      true;

  }


  async function editEpisode(id) {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("episodes")
        .select("*")
        .eq("id", id)
        .single();


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    $("episodeId").value =
      data.id;

    $("episodeSeriesSelect").value =
      data.series_id;


    await loadEpisodeSeasons();


    $("episodeSeasonSelect").value =
      data.season_id;


    $("episodeNumber").value =
      data.episode_number;

    $("episodeTitle").value =
      data.title || "";

    $("episodeDescription").value =
      data.description || "";

    $("episodeThumbnail").value =
      data.thumbnail_url || "";

    $("episodeVideo").value =
      data.video_url || "";

    $("episodeDuration").value =
      data.duration_minutes || "";

    $("episodeQuality").value =
      data.quality || "";

    $("episodeTvmazeId").value =
      data.tvmaze_id || "";

    $("episodeTvmazeUrl").value =
      data.tvmaze_url || "";

    $("episodeAirdate").value =
      data.airdate || "";

    $("episodePublished").checked =
      !!data.is_published;


    $("episodeForm")
      .scrollIntoView({
        behavior: "smooth"
      });

  }


  async function deleteEpisode(id) {

    if (!confirm(
      "هل تريد حذف الحلقة؟"
    )) {
      return;
    }


    const {
      error
    } =
      await supabaseClient
        .from("episodes")
        .delete()
        .eq("id", id);


    if (error) {

      showMessage(
        error.message,
        "error"
      );

      return;

    }


    showMessage(
      "تم حذف الحلقة.",
      "success"
    );


    await loadEpisodes();

    await loadStats();

  }


  /* =====================================================
     TVMAZE SEARCH
  ===================================================== */

  async function searchTVmaze() {

    const input =
      $("tvmazeSearchInput");

    const results =
      $("tvmazeResults");


    const query =
      input.value.trim();


    if (!query) {

      showMessage(
        "اكتب اسم المسلسل أولًا.",
        "error"
      );

      return;

    }


    results.innerHTML =
      `<div class="loading">
        جاري البحث في TVmaze…
      </div>`;


    try {

      const response =
        await fetch(
          `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`
        );


      if (!response.ok) {
        throw new Error(
          "تعذر الاتصال بـ TVmaze"
        );
      }


      const data =
        await response.json();


      if (!data.length) {

        results.innerHTML =
          `<div class="empty">
            لم يتم العثور على مسلسل.
          </div>`;

        return;

      }


      results.innerHTML =
        data.map(item => {

          const show =
            item.show;


          return `

            <div class="tvmaze-result">

              <img
                src="${escapeHtml(
                  show.image?.medium ||
                  show.image?.original ||
                  "https://via.placeholder.com/90x130?text=TVmaze"
                )}">


              <div>

                <h3>
                  ${escapeHtml(show.name)}
                </h3>


                <p>
                  ${
                    show.premiered
                      ? `📅 ${show.premiered}`
                      : ""
                  }
                </p>


                <p>
                  ${
                    show.genres?.join(" • ") ||
                    ""
                  }
                </p>


                <button
                  class="btn"
                  onclick="SOKA.importTVmazeShow(${show.id})">

                  📥 استيراد هذا المسلسل

                </button>

              </div>

            </div>

          `;

        }).join("");


    } catch (error) {

      console.error(
        error
      );

      results.innerHTML =
        `<div class="error-box">
          ${escapeHtml(error.message)}
        </div>`;

    }

  }


  /* =====================================================
     TVMAZE IMPORT
  ===================================================== */

  async function importTVmazeShow(
    showId
  ) {

    if (!(await requireAdmin())) {
      return;
    }


    try {

      showMessage(
        "جاري استيراد المسلسل والمواسم والحلقات…",
        "info"
      );


      /* ---------------------------------
         show
      --------------------------------- */

      const showResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${showId}`
        );


      if (!showResponse.ok) {

        throw new Error(
          "تعذر تحميل بيانات المسلسل من TVmaze."
        );

      }


      const show =
        await showResponse.json();


      /* ---------------------------------
         series
      --------------------------------- */

      const seriesPayload = {

        title:
          show.name,

        description:
          cleanHtml(
            show.summary || ""
          ),

        poster_url:
          show.image?.original ||
          show.image?.medium ||
          null,

        backdrop_url:
          null,

        year:
          show.premiered
            ? Number(
                String(show.premiered)
                  .slice(0,4)
              )
            : null,

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

          null,

        is_featured:
          false,

        is_published:
          true

      };


      let series;


      const existingSeries =
        await supabaseClient
          .from("series")
          .select("*")
          .eq("tvmaze_id", show.id)
          .maybeSingle();


      if (
        existingSeries.data
      ) {

        const updateResult =
          await supabaseClient
            .from("series")
            .update(seriesPayload)
            .eq(
              "id",
              existingSeries.data.id
            )
            .select()
            .single();


        if (updateResult.error) {
          throw updateResult.error;
        }


        series =
          updateResult.data;

      } else {

        const insertResult =
          await supabaseClient
            .from("series")
            .insert(seriesPayload)
            .select()
            .single();


        if (insertResult.error) {
          throw insertResult.error;
        }


        series =
          insertResult.data;

      }


      /* ---------------------------------
         seasons
      --------------------------------- */

      const seasonsResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${show.id}/seasons`
        );


      if (!seasonsResponse.ok) {

        throw new Error(
          "تعذر تحميل مواسم المسلسل."
        );

      }


      const tvSeasons =
        await seasonsResponse.json();


      /* ---------------------------------
         episodes
      --------------------------------- */

      const episodesResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${show.id}/episodes?specials=0`
        );


      if (!episodesResponse.ok) {

        throw new Error(
          "تعذر تحميل حلقات المسلسل."
        );

      }


      const tvEpisodes =
        await episodesResponse.json();


      /* ---------------------------------
         import seasons
      --------------------------------- */

      const seasonMap =
        new Map();


      for (
        const tvSeason of tvSeasons
      ) {

        const seasonPayload = {

          series_id:
            series.id,

          season_number:
            tvSeason.number,

          title:
            `الموسم ${tvSeason.number}`,

          tvmaze_id:
            tvSeason.id

        };


        const existing =
          await supabaseClient
            .from("seasons")
            .select("*")
            .eq(
              "series_id",
              series.id
            )
            .eq(
              "season_number",
              tvSeason.number
            )
            .maybeSingle();


        let season;


        if (existing.data) {

          const updated =
            await supabaseClient
              .from("seasons")
              .update(
                seasonPayload
              )
              .eq(
                "id",
                existing.data.id
              )
              .select()
              .single();


          if (updated.error) {
            throw updated.error;
          }


          season =
            updated.data;

        } else {

          const inserted =
            await supabaseClient
              .from("seasons")
              .insert(
                seasonPayload
              )
              .select()
              .single();


          if (inserted.error) {
            throw inserted.error;
          }


          season =
            inserted.data;

        }


        seasonMap.set(
          tvSeason.number,
          season
        );

      }


      /* ---------------------------------
         import episodes
      --------------------------------- */

      for (
        const tvEpisode of tvEpisodes
      ) {

        const season =
          seasonMap.get(
            tvEpisode.season
          );


        if (!season) {
          continue;
        }


        const episodePayload = {

          series_id:
            series.id,

          season_id:
            season.id,

          episode_number:
            tvEpisode.number,

          title:
            tvEpisode.name ||
            `الحلقة ${tvEpisode.number}`,

          description:
            cleanHtml(
              tvEpisode.summary || ""
            ),

          thumbnail_url:
            tvEpisode.image?.original ||
            tvEpisode.image?.medium ||
            null,

          video_url:
            null,

          duration_minutes:
            tvEpisode.runtime ||
            tvEpisode.averageRuntime ||
            null,

          quality:
            null,

          tvmaze_id:
            tvEpisode.id,

          tvmaze_url:
            tvEpisode.url ||
            null,

          airdate:
            tvEpisode.airdate ||
            null,

          is_published:
            true

        };


        const existing =
          await supabaseClient
            .from("episodes")
            .select("id")
            .eq(
              "tvmaze_id",
              tvEpisode.id
            )
            .maybeSingle();


        if (existing.data) {

          const result =
            await supabaseClient
              .from("episodes")
              .update(
                episodePayload
              )
              .eq(
                "id",
                existing.data.id
              );


          if (result.error) {
            throw result.error;
          }

        } else {

          const result =
            await supabaseClient
              .from("episodes")
              .insert(
                episodePayload
              );


          if (result.error) {
            throw result.error;
          }

        }

      }


      showMessage(
        `تم استيراد "${show.name}" بنجاح مع ${tvSeasons.length} موسم و ${tvEpisodes.length} حلقة ✅`,
        "success"
      );


      /* تحديث البيانات */

      await loadAdminSeries();

      await loadSeriesSelects();

      await loadStats();

      await loadSeries();


    } catch (error) {

      console.error(
        "TVmaze import error:",
        error
      );


      showMessage(
        "فشل الاستيراد: " +
        (
          error.message ||
          "خطأ غير معروف"
        ),
        "error"
      );

    }

  }


  function cleanHtml(html) {

    if (!html) {
      return "";
    }


    const div =
      document.createElement(
        "div"
      );


    div.innerHTML =
      html;


    return div.textContent ||
      div.innerText ||
      "";

  }


  /* =====================================================
     ADMIN TABS
  ===================================================== */

  function showAdminTab(id) {

    document
      .querySelectorAll(
        ".admin-panel"
      )
      .forEach(panel => {

        panel.classList.add(
          "hidden"
        );

      });


    const target =
      $(id);


    if (target) {

      target.classList.remove(
        "hidden"
      );

    }


    document
      .querySelectorAll(
        ".admin-tabs button"
      )
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.tab === id
        );

      });


    if (id === "moviesAdmin") {

      loadAdminMovies();

    }


    if (id === "seriesAdmin") {

      loadAdminSeries();

    }


    if (id === "seasonsAdmin") {

      loadSeriesSelects();

      loadSeasons();

    }


    if (id === "episodesAdmin") {

      loadSeriesSelects();

    }

  }


  /* =====================================================
     ROUTER
  ===================================================== */

  async function route() {

    const hash =
      location.hash || "#home";


    console.log(
      "SOKA route:",
      hash
    );


    if (
      hash === "#login"
    ) {

      showSection("login");

      return;

    }


    if (
      hash === "#admin"
    ) {

      await showAdmin();

      return;

    }


    if (
      hash === "#movies"
    ) {

      showSection("movies");

      await loadMovies();

      return;

    }


    if (
      hash === "#series"
    ) {

      showSection("series");

      await loadSeries();

      return;

    }


    if (
      hash === "#search"
    ) {

      showSection("search");

      return;

    }


    if (
      hash === "#detail"
    ) {

      return;

    }


    showSection("home");

    updateUserInterface();

    loadMovies();

    loadSeries();

  }


  /* =====================================================
     EVENTS
  ===================================================== */

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


    $("movieForm")
      ?.addEventListener(
        "submit",
        saveMovie
      );


    $("seriesForm")
      ?.addEventListener(
        "submit",
        saveSeries
      );


    $("seasonForm")
      ?.addEventListener(
        "submit",
        saveSeason
      );


    $("episodeForm")
      ?.addEventListener(
        "submit",
        saveEpisode
      );


    $("cancelMovieEdit")
      ?.addEventListener(
        "click",
        resetMovieForm
      );


    $("cancelSeriesEdit")
      ?.addEventListener(
        "click",
        resetSeriesForm
      );


    $("cancelSeasonEdit")
      ?.addEventListener(
        "click",
        resetSeasonForm
      );


    $("cancelEpisodeEdit")
      ?.addEventListener(
        "click",
        resetEpisodeForm
      );


    $("seasonSeriesSelect")
      ?.addEventListener(
        "change",
        loadSeasons
      );


    $("episodeSeriesSelect")
      ?.addEventListener(
        "change",
        loadEpisodeSeasons
      );


    $("episodeSeasonSelect")
      ?.addEventListener(
        "change",
        loadEpisodes
      );


    $("searchInput")
      ?.addEventListener(
        "input",
        searchContent
      );


    $("tvmazeSearchBtn")
      ?.addEventListener(
        "click",
        searchTVmaze
      );


    document
      .querySelectorAll(
        ".admin-tabs button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            showAdminTab(
              button.dataset.tab
            );

          }
        );

      });


    window.addEventListener(
      "hashchange",
      route
    );

  }


  /* =====================================================
     GLOBAL API
  ===================================================== */

  window.SOKA = {

    showMovie,

    showSeries,

    loadPublicEpisodes,

    editMovie,

    deleteMovie,

    editSeries,

    deleteSeries,

    editSeason,

    deleteSeason,

    editEpisode,

    deleteEpisode,

    importTVmazeShow,

    showAdminTab

  };


  /* =====================================================
     ERROR PROTECTION
  ===================================================== */

  window.addEventListener(
    "error",
    event => {

      console.error(
        "SOKA JS ERROR:",
        event.error
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

    }
  );


  /* =====================================================
     START
  ===================================================== */

  async function start() {

    console.log(
      "SOKA starting..."
    );


    setupEvents();

    setupAuthListener();

    await checkSession();

    await route();


    console.log(
      "SOKA ready."
    );

  }


  start();

})();
