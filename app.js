(() => {
  "use strict";

  console.log("SOKA FULL APP START");

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
  } catch (e) {
    console.error("Supabase initialization error:", e);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  const $ = id => document.getElementById(id);

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

      Object.assign(box.style, {
        position: "fixed",
        top: "20px",
        left: "20px",
        right: "20px",
        zIndex: "999999",
        padding: "16px",
        borderRadius: "14px",
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "600",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,.4)"
      });

      document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "success") {
      box.style.background = "#087f45";
    } else if (type === "error") {
      box.style.background = "#a51d2d";
    } else {
      box.style.background = "#272733";
    }

    box.style.display = "block";

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      box.style.display = "none";
    }, 5000);
  }

  function hideSections() {
    document.querySelectorAll("main > section").forEach(section => {
      section.style.display = "none";
    });
  }

  function showSection(id) {
    hideSections();

    const section = $(id);

    if (section) {
      section.style.display = "block";
    }
  }

  // =========================================================
  // UI
  // =========================================================

  function updateUI() {
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
  // ADMIN CHECK
  // =========================================================

  async function checkAdmin(user) {
    isAdmin = false;

    if (!user || !supabaseClient) {
      updateUI();
      return false;
    }

    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      console.log("ADMIN CHECK:", data, error);

      if (error) {
        console.error("Profile error:", error);

        showMessage(
          "تم تسجيل الدخول، لكن تعذر قراءة صلاحية المدير من profiles.",
          "error"
        );

        updateUI();
        return false;
      }

      if (data && data.role === "admin") {
        isAdmin = true;
        console.log("ADMIN = TRUE");
      }

      updateUI();

      return isAdmin;

    } catch (error) {
      console.error("Admin exception:", error);

      showMessage(
        "حدث خطأ أثناء التحقق من صلاحية المدير.",
        "error"
      );

      return false;
    }
  }

  // =========================================================
  // SESSION
  // =========================================================

  async function checkSession() {
    if (!supabaseClient) {
      showMessage(
        "Supabase غير متصل. تحقق من config.js.",
        "error"
      );
      return;
    }

    try {
      const { data, error } =
        await supabaseClient.auth.getSession();

      if (error) {
        console.error(error);

        showMessage(
          error.message,
          "error"
        );

        return;
      }

      if (data && data.session) {
        currentUser = data.session.user;

        await checkAdmin(currentUser);
      } else {
        currentUser = null;
        isAdmin = false;

        updateUI();
      }

    } catch (error) {
      console.error("Session error:", error);
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
      event.target.querySelector("button[type='submit']");

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
        console.error("LOGIN ERROR:", error);

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
          : "تم تسجيل الدخول بنجاح.",
        "success"
      );

      location.hash = "#home";

      await loadHome();

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

    const name = $("signupName")?.value.trim();
    const email = $("signupEmail")?.value.trim();
    const password = $("signupPassword")?.value;

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
      event.target.querySelector("button[type='submit']");

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
        console.error("SIGNUP ERROR:", error);

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
          "تم إنشاء الحساب وتسجيل الدخول بنجاح.",
          "success"
        );

        location.hash = "#home";

        await loadHome();

      } else {
        showMessage(
          "تم إنشاء الحساب. تحقق من البريد الإلكتروني لتفعيل الحساب إذا كان تأكيد البريد مفعّلًا.",
          "success"
        );
      }

    } catch (error) {
      console.error(error);

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

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logout() {
    if (!supabaseClient) return;

    try {
      const { error } =
        await supabaseClient.auth.signOut();

      if (error) {
        showMessage(
          error.message,
          "error"
        );
        return;
      }

      currentUser = null;
      isAdmin = false;

      updateUI();

      location.hash = "#home";

      showMessage(
        "تم تسجيل الخروج.",
        "success"
      );

      await loadHome();

    } catch (error) {
      console.error(error);
    }
  }

  // =========================================================
  // MOVIES
  // =========================================================

  async function loadMovies() {
    const grid = $("movieGrid");

    if (!grid || !supabaseClient) return;

    grid.innerHTML =
      `<div class="loading">جاري تحميل الأفلام...</div>`;

    try {
      const { data, error } =
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
          `<div class="loading">تعذر تحميل الأفلام.</div>`;

        return;
      }

      if (!data || data.length === 0) {
        grid.innerHTML =
          `<div class="loading">لا توجد أفلام حاليًا.</div>`;

        return;
      }

      grid.innerHTML = data.map(movie => `
        <article class="card">
          ${
            movie.poster_url
              ? `<img src="${escapeHTML(movie.poster_url)}"
                      alt="${escapeHTML(movie.title)}"
                      loading="lazy">`
              : `<div class="no-image">🎬</div>`
          }

          <div class="card-body">
            <h3>${escapeHTML(movie.title)}</h3>

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
              onclick="window.SOKAWatchMovie('${movie.id}')">
              ▶ مشاهدة
            </button>
          </div>
        </article>
      `).join("");

    } catch (error) {
      console.error(error);

      grid.innerHTML =
        `<div class="loading">حدث خطأ أثناء تحميل الأفلام.</div>`;
    }
  }

  async function loadAllMoviesAdmin() {
    const panel = $("moviesAdmin");

    if (!panel) return;

    if (!isAdmin) {
      panel.innerHTML =
        `<p>ليس لديك صلاحية المدير.</p>`;
      return;
    }

    panel.innerHTML = `
      <div class="admin-box">

        <h3>🎬 إضافة فيلم</h3>

        <form id="movieForm">

          <input id="movieTitle"
                 required
                 placeholder="اسم الفيلم">

          <textarea id="movieDescription"
                    placeholder="وصف الفيلم"></textarea>

          <input id="moviePoster"
                 placeholder="رابط صورة الفيلم">

          <input id="movieBackdrop"
                 placeholder="رابط صورة الخلفية">

          <input id="movieVideo"
                 placeholder="رابط الفيديو">

          <input id="movieYear"
                 type="number"
                 placeholder="السنة">

          <input id="movieGenre"
                 placeholder="التصنيف">

          <input id="movieCountry"
                 placeholder="الدولة">

          <input id="movieDuration"
                 type="number"
                 placeholder="المدة بالدقائق">

          <label>
            <input id="movieFeatured"
                   type="checkbox">
            فيلم مميز
          </label>

          <label>
            <input id="moviePublished"
                   type="checkbox"
                   checked>
            منشور
          </label>

          <button class="btn" type="submit">
            ➕ إضافة الفيلم
          </button>

        </form>

        <hr>

        <h3>الأفلام الموجودة</h3>

        <div id="adminMoviesList">
          جاري التحميل...
        </div>

      </div>
    `;

    $("movieForm")
      ?.addEventListener("submit", addMovie);

    await renderAdminMovies();
  }

  async function addMovie(event) {
    event.preventDefault();

    if (!isAdmin) {
      showMessage(
        "ليس لديك صلاحية المدير.",
        "error"
      );
      return;
    }

    try {
      const movie = {
        title: $("movieTitle").value.trim(),
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
          $("movieFeatured").checked,
        is_published:
          $("moviePublished").checked
      };

      if (!movie.title) {
        showMessage(
          "أدخل اسم الفيلم.",
          "error"
        );
        return;
      }

      const { error } =
        await supabaseClient
          .from("movies")
          .insert(movie);

      if (error) {
        console.error(error);

        showMessage(
          "فشل إضافة الفيلم: " + error.message,
          "error"
        );

        return;
      }

      showMessage(
        "تمت إضافة الفيلم بنجاح 🎬",
        "success"
      );

      event.target.reset();

      $("moviePublished").checked = true;

      await renderAdminMovies();
      await loadMovies();

    } catch (error) {
      console.error(error);

      showMessage(
        "حدث خطأ أثناء إضافة الفيلم.",
        "error"
      );
    }
  }

  async function renderAdminMovies() {
    const box = $("adminMoviesList");

    if (!box) return;

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

    box.innerHTML = data.map(movie => `
      <div class="admin-item">

        ${
          movie.poster_url
            ? `<img src="${escapeHTML(movie.poster_url)}"
                    style="width:80px;height:110px;object-fit:cover;border-radius:10px">`
            : ""
        }

        <div style="flex:1">
          <strong>${escapeHTML(movie.title)}</strong>

          <div>
            ${movie.year || ""}
          </div>

          <div>
            ${
              movie.is_published
                ? "🟢 منشور"
                : "🔴 مخفي"
            }
          </div>
        </div>

        <button
          class="danger-btn"
          onclick="window.SOKADeleteMovie('${movie.id}')">
          🗑 حذف
        </button>

      </div>
    `).join("");
  }

  window.SOKADeleteMovie = async function(id) {
    if (!isAdmin) return;

    if (!confirm("هل تريد حذف هذا الفيلم؟")) {
      return;
    }

    const { error } =
      await supabaseClient
        .from("movies")
        .delete()
        .eq("id", id);

    if (error) {
      showMessage(
        "فشل الحذف: " + error.message,
        "error"
      );
      return;
    }

    showMessage(
      "تم حذف الفيلم.",
      "success"
    );

    await renderAdminMovies();
    await loadMovies();
  };

  // =========================================================
  // SERIES
  // =========================================================

  async function loadSeries() {
    const grid = $("seriesGrid");

    if (!grid || !supabaseClient) return;

    grid.innerHTML =
      `<div class="loading">جاري تحميل المسلسلات...</div>`;

    try {
      const { data, error } =
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
          `<div class="loading">تعذر تحميل المسلسلات.</div>`;

        return;
      }

      if (!data || data.length === 0) {
        grid.innerHTML =
          `<div class="loading">لا توجد مسلسلات حاليًا.</div>`;

        return;
      }

      grid.innerHTML = data.map(series => `
        <article class="card">

          ${
            series.poster_url
              ? `<img src="${escapeHTML(series.poster_url)}"
                      alt="${escapeHTML(series.title)}"
                      loading="lazy">`
              : `<div class="no-image">📺</div>`
          }

          <div class="card-body">

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
              onclick="window.SOKAShowSeries('${series.id}')">
              عرض المسلسل
            </button>

          </div>

        </article>
      `).join("");

    } catch (error) {
      console.error(error);

      grid.innerHTML =
        `<div class="loading">حدث خطأ.</div>`;
    }
  }

  async function loadAllSeriesAdmin() {
    const panel = $("seriesAdmin");

    if (!panel) return;

    panel.innerHTML = `
      <div class="admin-box">

        <h3>📺 إضافة مسلسل</h3>

        <form id="seriesForm">

          <input id="seriesTitle"
                 required
                 placeholder="اسم المسلسل">

          <textarea id="seriesDescription"
                    placeholder="وصف المسلسل"></textarea>

          <input id="seriesPoster"
                 placeholder="رابط صورة المسلسل">

          <input id="seriesBackdrop"
                 placeholder="رابط الخلفية">

          <input id="seriesYear"
                 type="number"
                 placeholder="السنة">

          <input id="seriesGenre"
                 placeholder="التصنيف">

          <input id="seriesCountry"
                 placeholder="الدولة">

          <input id="seriesTvmazeId"
                 type="number"
                 placeholder="TVmaze ID - اختياري">

          <input id="seriesTvmazeUrl"
                 placeholder="رابط TVmaze - اختياري">

          <label>
            <input id="seriesFeatured"
                   type="checkbox">
            مسلسل مميز
          </label>

          <label>
            <input id="seriesPublished"
                   type="checkbox"
                   checked>
            منشور
          </label>

          <button class="btn" type="submit">
            ➕ إضافة المسلسل
          </button>

        </form>

        <hr>

        <h3>المسلسلات الموجودة</h3>

        <div id="adminSeriesList">
          جاري التحميل...
        </div>

      </div>
    `;

    $("seriesForm")
      ?.addEventListener("submit", addSeries);

    await renderAdminSeries();
  }

  async function addSeries(event) {
    event.preventDefault();

    if (!isAdmin) {
      showMessage(
        "ليس لديك صلاحية المدير.",
        "error"
      );
      return;
    }

    const title =
      $("seriesTitle").value.trim();

    if (!title) {
      showMessage(
        "أدخل اسم المسلسل.",
        "error"
      );
      return;
    }

    const payload = {
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
      await supabaseClient
        .from("series")
        .insert(payload);

    if (error) {
      showMessage(
        "فشل إضافة المسلسل: " + error.message,
        "error"
      );
      return;
    }

    showMessage(
      "تمت إضافة المسلسل بنجاح 📺",
      "success"
    );

    event.target.reset();

    $("seriesPublished").checked = true;

    await renderAdminSeries();
    await loadSeries();
  }

  async function renderAdminSeries() {
    const box = $("adminSeriesList");

    if (!box) return;

    const { data, error } =
      await supabaseClient
        .from("series")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (error) {
      box.innerHTML =
        `<p>${escapeHTML(error.message)}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      box.innerHTML =
        `<p>لا توجد مسلسلات.</p>`;
      return;
    }

    box.innerHTML = data.map(item => `
      <div class="admin-item">

        ${
          item.poster_url
            ? `<img src="${escapeHTML(item.poster_url)}"
                    style="width:80px;height:110px;object-fit:cover;border-radius:10px">`
            : ""
        }

        <div style="flex:1">

          <strong>
            ${escapeHTML(item.title)}
          </strong>

          <div>
            ${item.year || ""}
          </div>

          <div>
            ${
              item.is_published
                ? "🟢 منشور"
                : "🔴 مخفي"
            }
          </div>

        </div>

        <button
          class="danger-btn"
          onclick="window.SOKADeleteSeries('${item.id}')">
          🗑 حذف
        </button>

      </div>
    `).join("");
  }

  window.SOKADeleteSeries = async function(id) {
    if (!isAdmin) return;

    if (!confirm(
      "حذف المسلسل قد يفشل إذا كانت له مواسم أو حلقات مرتبطة به. هل تريد المتابعة؟"
    )) {
      return;
    }

    const { error } =
      await supabaseClient
        .from("series")
        .delete()
        .eq("id", id);

    if (error) {
      showMessage(
        "فشل الحذف: " + error.message,
        "error"
      );
      return;
    }

    showMessage(
      "تم حذف المسلسل.",
      "success"
    );

    await renderAdminSeries();
    await loadSeries();
  };

  // =========================================================
  // SEASONS
  // =========================================================

  async function loadSeasonsAdmin() {
    const panel = $("seasonsAdmin");

    if (!panel) return;

    const { data: series, error } =
      await supabaseClient
        .from("series")
        .select("id,title")
        .order("title");

    if (error) {
      panel.innerHTML =
        `<p>${escapeHTML(error.message)}</p>`;
      return;
    }

    panel.innerHTML = `
      <div class="admin-box">

        <h3>🎞️ إضافة موسم</h3>

        <form id="seasonForm">

          <select id="seasonSeries" required>
            <option value="">اختر المسلسل</option>

            ${
              (series || []).map(item => `
                <option value="${item.id}">
                  ${escapeHTML(item.title)}
                </option>
              `).join("")
            }

          </select>

          <input
            id="seasonNumber"
            type="number"
            min="1"
            required
            placeholder="رقم الموسم">

          <input
            id="seasonTitle"
            placeholder="اسم الموسم">

          <input
            id="seasonTvmazeId"
            type="number"
            placeholder="TVmaze Season ID - اختياري">

          <button class="btn" type="submit">
            ➕ إضافة الموسم
          </button>

        </form>

        <hr>

        <div id="adminSeasonsList">
          جاري التحميل...
        </div>

      </div>
    `;

    $("seasonForm")
      ?.addEventListener(
        "submit",
        addSeason
      );

    await renderAdminSeasons();
  }

  async function addSeason(event) {
    event.preventDefault();

    const series_id =
      $("seasonSeries").value;

    const season_number =
      Number($("seasonNumber").value);

    if (!series_id || !season_number) {
      showMessage(
        "اختر المسلسل ورقم الموسم.",
        "error"
      );
      return;
    }

    const { error } =
      await supabaseClient
        .from("seasons")
        .insert({
          series_id,
          season_number,
          title:
            $("seasonTitle").value.trim() || null,
          tvmaze_id:
            Number($("seasonTvmazeId").value) || null
        });

    if (error) {
      showMessage(
        "فشل إضافة الموسم: " + error.message,
        "error"
      );
      return;
    }

    showMessage(
      "تمت إضافة الموسم 🎞️",
      "success"
    );

    event.target.reset();

    await renderAdminSeasons();
  }

  async function renderAdminSeasons() {
    const box = $("adminSeasonsList");

    if (!box) return;

    const { data, error } =
      await supabaseClient
        .from("seasons")
        .select(`
          *,
          series (
            title
          )
        `)
        .order("created_at", {
          ascending: false
        });

    if (error) {
      box.innerHTML =
        `<p>${escapeHTML(error.message)}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      box.innerHTML =
        `<p>لا توجد مواسم.</p>`;
      return;
    }

    box.innerHTML = data.map(item => `
      <div class="admin-item">

        <div style="flex:1">

          <strong>
            ${escapeHTML(item.series?.title || "")}
          </strong>

          <div>
            الموسم ${item.season_number}
          </div>

          ${
            item.title
              ? `<div>${escapeHTML(item.title)}</div>`
              : ""
          }

        </div>

        <button
          class="danger-btn"
          onclick="window.SOKADeleteSeason('${item.id}')">
          🗑 حذف
        </button>

      </div>
    `).join("");
  }

  window.SOKADeleteSeason = async function(id) {
    if (!confirm("هل تريد حذف الموسم؟")) return;

    const { error } =
      await supabaseClient
        .from("seasons")
        .delete()
        .eq("id", id);

    if (error) {
      showMessage(
        "فشل حذف الموسم: " + error.message,
        "error"
      );
      return;
    }

    showMessage(
      "تم حذف الموسم.",
      "success"
    );

    await renderAdminSeasons();
  };

  // =========================================================
  // EPISODES
  // =========================================================

  async function loadEpisodesAdmin() {
    const panel = $("episodesAdmin");

    if (!panel) return;

    const { data: series, error } =
      await supabaseClient
        .from("series")
        .select("id,title")
        .order("title");

    if (error) {
      panel.innerHTML =
        `<p>${escapeHTML(error.message)}</p>`;
      return;
    }

    panel.innerHTML = `
      <div class="admin-box">

        <h3>▶️ إضافة حلقة</h3>

        <form id="episodeForm">

          <select id="episodeSeries" required>
            <option value="">اختر المسلسل</option>

            ${
              (series || []).map(item => `
                <option value="${item.id}">
                  ${escapeHTML(item.title)}
                </option>
              `).join("")
            }

          </select>

          <select id="episodeSeason" required>
            <option value="">
              اختر الموسم
            </option>
          </select>

          <input
            id="episodeNumber"
            type="number"
            min="1"
            required
            placeholder="رقم الحلقة">

          <input
            id="episodeTitle"
            required
            placeholder="اسم الحلقة">

          <textarea
            id="episodeDescription"
            placeholder="وصف الحلقة"></textarea>

          <input
            id="episodeThumbnail"
            placeholder="رابط صورة الحلقة">

          <input
            id="episodeVideo"
            placeholder="رابط الفيديو">

          <input
            id="episodeDuration"
            type="number"
            placeholder="المدة بالدقائق">

          <input
            id="episodeQuality"
            placeholder="الجودة مثل 1080p">

          <input
            id="episodeTvmazeId"
            type="number"
            placeholder="TVmaze Episode ID">

          <input
            id="episodeTvmazeUrl"
            placeholder="TVmaze Episode URL">

          <input
            id="episodeAirdate"
            type="date">

          <label>
            <input
              id="episodePublished"
              type="checkbox"
              checked>
            الحلقة منشورة
          </label>

          <button class="btn" type="submit">
            ➕ إضافة الحلقة
          </button>

        </form>

        <hr>

        <div id="adminEpisodesList">
          جاري التحميل...
        </div>

      </div>
    `;

    $("episodeSeries")
      ?.addEventListener(
        "change",
        loadEpisodeSeasons
      );

    $("episodeForm")
      ?.addEventListener(
        "submit",
        addEpisode
      );

    await renderAdminEpisodes();
  }

  async function loadEpisodeSeasons() {
    const seriesId =
      $("episodeSeries").value;

    const select =
      $("episodeSeason");

    if (!select) return;

    select.innerHTML =
      `<option value="">جاري التحميل...</option>`;

    if (!seriesId) {
      select.innerHTML =
        `<option value="">اختر الموسم</option>`;
      return;
    }

    const { data, error } =
      await supabaseClient
        .from("seasons")
        .select("id,season_number,title")
        .eq("series_id", seriesId)
        .order("season_number");

    if (error) {
      select.innerHTML =
        `<option value="">خطأ</option>`;
      return;
    }

    select.innerHTML =
      `<option value="">اختر الموسم</option>`;

    (data || []).forEach(season => {
      const option =
        document.createElement("option");

      option.value = season.id;

      option.textContent =
        `الموسم ${season.season_number}` +
        (
          season.title
            ? ` - ${season.title}`
            : ""
        );

      select.appendChild(option);
    });
  }

  async function addEpisode(event) {
    event.preventDefault();

    const season_id =
      $("episodeSeason").value;

    if (!season_id) {
      showMessage(
        "اختر الموسم.",
        "error"
      );
      return;
    }

    const { data: season } =
      await supabaseClient
        .from("seasons")
        .select("series_id")
        .eq("id", season_id)
        .single();

    if (!season) {
      showMessage(
        "تعذر العثور على الموسم.",
        "error"
      );
      return;
    }

    const payload = {
      series_id: season.series_id,
      season_id,

      episode_number:
        Number($("episodeNumber").value),

      title:
        $("episodeTitle").value.trim(),

      description:
        $("episodeDescription").value.trim() || null,

      thumbnail_url:
        $("episodeThumbnail").value.trim() || null,

      video_url:
        $("episodeVideo").value.trim() || null,

      duration_minutes:
        Number($("episodeDuration").value) || null,

      quality:
        $("episodeQuality").value.trim() || null,

      tvmaze_id:
        Number($("episodeTvmazeId").value) || null,

      tvmaze_url:
        $("episodeTvmazeUrl").value.trim() || null,

      airdate:
        $("episodeAirdate").value || null,

      is_published:
        $("episodePublished").checked
    };

    const { error } =
      await supabaseClient
        .from("episodes")
        .insert(payload);

    if (error) {
      showMessage(
        "فشل إضافة الحلقة: " + error.message,
        "error"
      );
      return;
    }

    showMessage(
      "تمت إضافة الحلقة ▶️",
      "success"
    );

    event.target.reset();

    $("episodeSeason").innerHTML =
      `<option value="">اختر الموسم</option>`;

    $("episodePublished").checked = true;

    await renderAdminEpisodes();
  }

  async function renderAdminEpisodes() {
    const box = $("adminEpisodesList");

    if (!box) return;

    const { data, error } =
      await supabaseClient
        .from("episodes")
        .select(`
          *,
          series (
            title
          ),
          seasons (
            season_number
          )
        `)
        .order("created_at", {
          ascending: false
        })
        .limit(100);

    if (error) {
      box.innerHTML =
        `<p>${escapeHTML(error.message)}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      box.innerHTML =
        `<p>لا توجد حلقات.</p>`;
      return;
    }

    box.innerHTML = data.map(ep => `
      <div class="admin-item">

        <div style="flex:1">

          <strong>
            ${escapeHTML(ep.series?.title || "")}
          </strong>

          <div>
            الموسم
            ${ep.seasons?.season_number || ""}
            —
            الحلقة
            ${ep.episode_number}
          </div>

          <div>
            ${escapeHTML(ep.title)}
          </div>

          <div>
            ${
              ep.is_published
                ? "🟢 منشورة"
                : "🔴 مخفية"
            }
          </div>

        </div>

        <button
          class="danger-btn"
          onclick="window.SOKADeleteEpisode('${ep.id}')">
          🗑 حذف
        </button>

      </div>
    `).join("");
  }

  window.SOKADeleteEpisode = async function(id) {
    if (!confirm("هل تريد حذف الحلقة؟")) return;

    const { error } =
      await supabaseClient
        .from("episodes")
        .delete()
        .eq("id", id);

    if (error) {
      showMessage(
        "فشل حذف الحلقة: " + error.message,
        "error"
      );
      return;
    }

    showMessage(
      "تم حذف الحلقة.",
      "success"
    );

    await renderAdminEpisodes();
  };

  // =========================================================
  // TVMAZE
  // =========================================================

  async function importTVmaze() {
    if (!isAdmin) {
      showMessage(
        "هذه العملية متاحة للمدير فقط.",
        "error"
      );
      return;
    }

    const input =
      prompt(
        "أدخل TVmaze ID للمسلسل:\nمثال: 1"
      );

    if (!input) return;

    const tvmazeId =
      Number(input);

    if (!tvmazeId) {
      showMessage(
        "TVmaze ID غير صحيح.",
        "error"
      );
      return;
    }

    showMessage(
      "جاري جلب بيانات TVmaze...",
      "info"
    );

    try {
      const showResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${tvmazeId}`
        );

      if (!showResponse.ok) {
        throw new Error(
          "لم يتم العثور على المسلسل في TVmaze."
        );
      }

      const show =
        await showResponse.json();

      const episodesResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${tvmazeId}/episodes`
        );

      const seasonsResponse =
        await fetch(
          `https://api.tvmaze.com/shows/${tvmazeId}/seasons`
        );

      const episodes =
        episodesResponse.ok
          ? await episodesResponse.json()
          : [];

      const seasons =
        seasonsResponse.ok
          ? await seasonsResponse.json()
          : [];

      // ---------------------------------------------
      // SERIES
      // ---------------------------------------------

      let existingSeries = null;

      const existingResult =
        await supabaseClient
          .from("series")
          .select("*")
          .eq("tvmaze_id", tvmazeId)
          .maybeSingle();

      if (existingResult.data) {
        existingSeries =
          existingResult.data;
      }

      let seriesId;

      const seriesPayload = {
        title:
          show.name || "بدون اسم",

        description:
          cleanTVmazeSummary(show.summary),

        poster_url:
          show.image?.original ||
          show.image?.medium ||
          null,

        backdrop_url:
          show.image?.original ||
          show.image?.medium ||
          null,

        year:
          show.premiered
            ? Number(show.premiered.substring(0, 4))
            : null,

        genre:
          Array.isArray(show.genres)
            ? show.genres.join(", ")
            : null,

        country:
          show.network?.country?.name ||
          show.webChannel?.country?.name ||
          null,

        tvmaze_id:
          show.id,

        tvmaze_url:
          show.url || null,

        is_featured:
          existingSeries?.is_featured || false,

        is_published:
          true
      };

      if (existingSeries) {
        const { error } =
          await supabaseClient
            .from("series")
            .update(seriesPayload)
            .eq("id", existingSeries.id);

        if (error) throw error;

        seriesId =
          existingSeries.id;

      } else {
        const { data, error } =
          await supabaseClient
            .from("series")
            .insert(seriesPayload)
            .select()
            .single();

        if (error) throw error;

        seriesId =
          data.id;
      }

      // ---------------------------------------------
      // SEASONS
      // ---------------------------------------------

      const seasonMap = {};

      for (const season of seasons) {

        let existingSeason = null;

        const result =
          await supabaseClient
            .from("seasons")
            .select("*")
            .eq("series_id", seriesId)
            .eq("season_number", season.number)
            .maybeSingle();

        if (result.data) {
          existingSeason =
            result.data;
        }

        const seasonPayload = {
          series_id:
            seriesId,

          season_number:
            season.number,

          title:
            `الموسم ${season.number}`,

          tvmaze_id:
            season.id
        };

        if (existingSeason) {

          await supabaseClient
            .from("seasons")
            .update(seasonPayload)
            .eq("id", existingSeason.id);

          seasonMap[season.number] =
            existingSeason.id;

        } else {

          const { data, error } =
            await supabaseClient
              .from("seasons")
              .insert(seasonPayload)
              .select()
              .single();

          if (error) throw error;

          seasonMap[season.number] =
            data.id;
        }
      }

      // ---------------------------------------------
      // EPISODES
      // ---------------------------------------------

      let importedEpisodes = 0;

      for (const ep of episodes) {

        const seasonId =
          seasonMap[ep.season];

        if (!seasonId) {
          continue;
        }

        const episodePayload = {
          series_id:
            seriesId,

          season_id:
            seasonId,

          episode_number:
            ep.number,

          title:
            ep.name || `الحلقة ${ep.number}`,

          description:
            cleanTVmazeSummary(ep.summary),

          thumbnail_url:
            ep.image?.original ||
            ep.image?.medium ||
            null,

          video_url:
            null,

          duration_minutes:
            ep.runtime || null,

          quality:
            null,

          tvmaze_id:
            ep.id,

          tvmaze_url:
            ep.url || null,

          airdate:
            ep.airdate || null,

          is_published:
            false
        };

        const existingEpisode =
          await supabaseClient
            .from("episodes")
            .select("id")
            .eq("tvmaze_id", ep.id)
            .maybeSingle();

        if (existingEpisode.data) {

          const { error } =
            await supabaseClient
              .from("episodes")
              .update(episodePayload)
              .eq(
                "id",
                existingEpisode.data.id
              );

          if (error) throw error;

        } else {

          const { error } =
            await supabaseClient
              .from("episodes")
              .insert(episodePayload);

          if (error) throw error;
        }

        importedEpisodes++;
      }

      showMessage(
        `تم استيراد ${show.name} بنجاح ✅ — المواسم: ${seasons.length} — الحلقات: ${importedEpisodes}`,
        "success"
      );

      await loadSeries();

      if (location.hash === "#admin") {
        await loadAdmin();
      }

    } catch (error) {
      console.error(
        "TVMAZE IMPORT ERROR:",
        error
      );

      showMessage(
        "فشل استيراد TVmaze: " +
        (error.message || error),
        "error"
      );
    }
  }

  function cleanTVmazeSummary(summary) {
    if (!summary) return null;

    const div =
      document.createElement("div");

    div.innerHTML = summary;

    return div.textContent.trim() || null;
  }

  // =========================================================
  // SERIES DETAILS
  // =========================================================

  window.SOKAShowSeries = async function(id) {
    try {
      const { data: series, error } =
        await supabaseClient
          .from("series")
          .select("*")
          .eq("id", id)
          .single();

      if (error) throw error;

      const { data: seasons } =
        await supabaseClient
          .from("seasons")
          .select("*")
          .eq("series_id", id)
          .order("season_number");

      const detail =
        $("detailContent");

      if (!detail) return;

      hideSections();

      $("detail").style.display = "block";

      detail.innerHTML = `
        <div class="detail-card">

          ${
            series.poster_url
              ? `<img src="${escapeHTML(series.poster_url)}"
                      style="width:220px;max-width:100%;border-radius:15px">`
              : ""
          }

          <h1>
            ${escapeHTML(series.title)}
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

          <h2>🎞️ المواسم</h2>

          <div>
            ${
              (seasons || []).map(season => `
                <button
                  class="btn secondary"
                  onclick="window.SOKAShowSeason('${season.id}')">
                  الموسم ${season.season_number}
                </button>
              `).join("")
            }
          </div>

        </div>
      `;

      location.hash = "#detail";

    } catch (error) {
      console.error(error);

      showMessage(
        "تعذر تحميل المسلسل.",
        "error"
      );
    }
  };

  window.SOKAShowSeason = async function(seasonId) {
    try {
      const { data: season } =
        await supabaseClient
          .from("seasons")
          .select(`
            *,
            series (
              title
            )
          `)
          .eq("id", seasonId)
          .single();

      const { data: episodes, error } =
        await supabaseClient
          .from("episodes")
          .select("*")
          .eq("season_id", seasonId)
          .eq("is_published", true)
          .order("episode_number");

      if (error) throw error;

      const detail =
        $("detailContent");

      hideSections();

      $("detail").style.display = "block";

      detail.innerHTML = `

        <div class="detail-card">

          <h1>
            📺 ${escapeHTML(
              season.series?.title || ""
            )}
          </h1>

          <h2>
            الموسم ${season.season_number}
          </h2>

          <div class="episode-grid">

            ${
              (episodes || []).map(ep => `

                <div class="card">

                  ${
                    ep.thumbnail_url
                      ? `<img src="${escapeHTML(ep.thumbnail_url)}"
                              alt="${escapeHTML(ep.title)}">`
                      : `<div class="no-image">▶️</div>`
                  }

                  <div class="card-body">

                    <h3>
                      الحلقة ${ep.episode_number}
                    </h3>

                    <p>
                      ${escapeHTML(ep.title)}
                    </p>

                    <button
                      class="btn"
                      onclick="window.SOKAWatchEpisode('${ep.id}')">
                      ▶ مشاهدة
                    </button>

                  </div>

                </div>

              `).join("")
            }

          </div>

        </div>
      `;

      location.hash = "#detail";

    } catch (error) {
      console.error(error);

      showMessage(
        "تعذر تحميل الحلقات.",
        "error"
      );
    }
  };

  window.SOKAWatchEpisode = async function(id) {
    const { data, error } =
      await supabaseClient
        .from("episodes")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
      showMessage(
        "تعذر تحميل الحلقة.",
        "error"
      );
      return;
    }

    hideSections();

    $("watch").style.display = "block";

    const box =
      $("watchContent");

    if (!data.video_url) {
      box.innerHTML = `
        <div class="detail-card">

          <h2>
            الحلقة ${data.episode_number}
          </h2>

          <p>
            ${escapeHTML(data.title)}
          </p>

          <div class="loading">
            رابط الفيديو غير متوفر حاليًا.
          </div>

        </div>
      `;

      location.hash = "#watch";

      return;
    }

    box.innerHTML = `

      <div class="detail-card">

        <h1>
          ${escapeHTML(data.title)}
        </h1>

        <video
          controls
          playsinline
          style="
            width:100%;
            max-height:70vh;
            border-radius:15px;
            background:#000;
          "
          src="${escapeHTML(data.video_url)}">
        </video>

      </div>

    `;

    location.hash = "#watch";
  };

  window.SOKAWatchMovie = async function(id) {
    const { data, error } =
      await supabaseClient
        .from("movies")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
      showMessage(
        "تعذر تحميل الفيلم.",
        "error"
      );
      return;
    }

    hideSections();

    $("watch").style.display = "block";

    const box =
      $("watchContent");

    if (!data.video_url) {
      box.innerHTML = `
        <div class="detail-card">

          <h1>
            ${escapeHTML(data.title)}
          </h1>

          <p>
            رابط الفيديو غير متوفر حاليًا.
          </p>

        </div>
      `;

      location.hash = "#watch";

      return;
    }

    box.innerHTML = `
      <div class="detail-card">

        <h1>
          ${escapeHTML(data.title)}
        </h1>

        <video
          controls
          playsinline
          style="
            width:100%;
            max-height:70vh;
            border-radius:15px;
            background:#000;
          "
          src="${escapeHTML(data.video_url)}">
        </video>

      </div>
    `;

    location.hash = "#watch";
  };

  // =========================================================
  // SEARCH
  // =========================================================

  async function searchContent() {
    const input =
      $("searchInput");

    const grid =
      $("searchGrid");

    if (!input || !grid) return;

    const query =
      input.value.trim();

    if (!query) {
      grid.innerHTML = "";
      return;
    }

    const [moviesResult, seriesResult] =
      await Promise.all([
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

    const movies =
      moviesResult.data || [];

    const series =
      seriesResult.data || [];

    const results = [
      ...movies.map(x => ({
        ...x,
        type: "movie"
      })),

      ...series.map(x => ({
        ...x,
        type: "series"
      }))
    ];

    if (results.length === 0) {
      grid.innerHTML =
        `<div class="loading">لا توجد نتائج.</div>`;
      return;
    }

    grid.innerHTML =
      results.map(item => `

        <article class="card">

          ${
            item.poster_url
              ? `<img src="${escapeHTML(item.poster_url)}"
                      alt="${escapeHTML(item.title)}">`
              : `<div class="no-image">🎬</div>`
          }

          <div class="card-body">

            <h3>
              ${escapeHTML(item.title)}
            </h3>

            <p>
              ${
                item.type === "movie"
                  ? "🎬 فيلم"
                  : "📺 مسلسل"
              }
            </p>

            ${
              item.type === "movie"
                ? `
                  <button
                    class="btn"
                    onclick="window.SOKAWatchMovie('${item.id}')">
                    عرض الفيلم
                  </button>
                `
                : `
                  <button
                    class="btn"
                    onclick="window.SOKAShowSeries('${item.id}')">
                    عرض المسلسل
                  </button>
                `
            }

          </div>

        </article>

      `).join("");
  }

  // =========================================================
  // ADMIN DASHBOARD
  // =========================================================

  async function loadAdmin() {
    if (!isAdmin) {
      showMessage(
        "لا تملك صلاحية المدير.",
        "error"
      );
      return;
    }

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

    const stats =
      $("stats");

    if (stats) {
      const [
        movies,
        series,
        seasons,
        episodes
      ] = await Promise.all([

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
        <div>🎬 الأفلام: <strong>${movies.count || 0}</strong></div>
        <div>📺 المسلسلات: <strong>${series.count || 0}</strong></div>
        <div>🎞️ المواسم: <strong>${seasons.count || 0}</strong></div>
        <div>▶️ الحلقات: <strong>${episodes.count || 0}</strong></div>
      `;
    }

    await loadAllMoviesAdmin();
    await loadAllSeriesAdmin();
    await loadSeasonsAdmin();
    await loadEpisodesAdmin();

    addTVmazePanel();
  }

  // =========================================================
  // TVMAZE PANEL
  // =========================================================

  function addTVmazePanel() {
    const admin =
      $("admin");

    if (!admin) return;

    let panel =
      $("tvmazeAdminPanel");

    if (!panel) {

      panel =
        document.createElement("div");

      panel.id =
        "tvmazeAdminPanel";

      panel.className =
        "admin-box";

      admin.appendChild(panel);
    }

    panel.innerHTML = `

      <h2>📥 استيراد TVmaze</h2>

      <p>
        استيراد مسلسل كامل مع المواسم والحلقات.
      </p>

      <button
        id="tvmazeImportButton"
        class="btn">
        📥 استيراد مسلسل من TVmaze
      </button>

    `;

    $("tvmazeImportButton")
      ?.addEventListener(
        "click",
        importTVmaze
      );
  }

  // =========================================================
  // ADMIN TABS
  // =========================================================

  function setupAdminTabs() {
    document
      .querySelectorAll(".admin-tabs button")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            document
              .querySelectorAll(
                ".admin-tabs button"
              )
              .forEach(btn =>
                btn.classList.remove("active")
              );

            button.classList.add("active");

            document
              .querySelectorAll(".admin-panel")
              .forEach(panel =>
                panel.classList.add("hidden")
              );

            const target =
              $(button.dataset.tab);

            if (target) {
              target.classList.remove("hidden");
            }

            if (
              button.dataset.tab ===
              "moviesAdmin"
            ) {
              await loadAllMoviesAdmin();
            }

            if (
              button.dataset.tab ===
              "seriesAdmin"
            ) {
              await loadAllSeriesAdmin();
            }

            if (
              button.dataset.tab ===
              "seasonsAdmin"
            ) {
              await loadSeasonsAdmin();
            }

            if (
              button.dataset.tab ===
              "episodesAdmin"
            ) {
              await loadEpisodesAdmin();
            }

          }
        );

      });
  }

  // =========================================================
  // HOME
  // =========================================================

  async function loadHome() {
    showSection("home");

    updateUI();

    await Promise.all([
      loadMovies(),
      loadSeries()
    ]);
  }

  // =========================================================
  // ROUTER
  // =========================================================

  async function route() {
    const hash =
      location.hash || "#home";

    console.log(
      "SOKA ROUTE:",
      hash
    );

    if (hash === "#login") {
      showSection("login");
      return;
    }

    if (hash === "#movies") {
      showSection("movies");
      await loadMovies();
      return;
    }

    if (hash === "#series") {
      showSection("series");
      await loadSeries();
      return;
    }

    if (hash === "#search") {
      showSection("search");
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
          "هذا الحساب ليس مديرًا.",
          "error"
        );

        location.hash = "#home";
        return;
      }

      showSection("admin");

      await loadAdmin();

      return;
    }

    if (hash === "#detail") {
      showSection("detail");
      return;
    }

    if (hash === "#watch") {
      showSection("watch");
      return;
    }

    await loadHome();
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
        searchContent
      );

    window.addEventListener(
      "hashchange",
      route
    );

    setupAdminTabs();

    supabaseClient?.auth.onAuthStateChange(
      async (_event, session) => {

        console.log(
          "AUTH EVENT:",
          _event
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

          updateUI();
        }

      }
    );
  }

  // =========================================================
  // GLOBAL ERROR HANDLING
  // =========================================================

  window.addEventListener(
    "error",
    event => {

      console.error(
        "SOKA ERROR:",
        event.error
      );

      showMessage(
        "حدث خطأ في SOKA. تحقق من Console.",
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
        "حدث خطأ أثناء تنفيذ العملية.",
        "error"
      );
    }
  );

  // =========================================================
  // START
  // =========================================================

  async function start() {

    console.log(
      "Starting SOKA FULL..."
    );

    setupEvents();

    await checkSession();

    await route();

    console.log(
      "SOKA FULL READY"
    );
  }

  start();

})();
