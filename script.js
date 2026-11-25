// ===== 1. Langit berbintang + bintang jatuh =====
(function () {
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W, H, dpr, stars = [], shooters = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((W * H) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * Math.PI * 2,
      s: Math.random() * 0.02 + 0.005,
    }));
  }
  window.addEventListener("resize", resize);
  resize();

  function spawnShooter() {
    shooters.push({
      x: Math.random() * W * 0.95,
      y: -20 + Math.random() * H * 0.45,
      len: 140 + Math.random() * 160,
      v: 9 + Math.random() * 8,
      w: 1.6 + Math.random() * 1.6,
      life: 0,
    });
  }
  // meteor jatuh lebih sering: maksimal 5 sekaligus
  setInterval(() => { if (!document.hidden && shooters.length < 5) spawnShooter(); }, 1100);
  setTimeout(spawnShooter, 400);

  function frame() {
    ctx.clearRect(0, 0, W, H);

    for (const s of stars) {
      s.a += s.s;
      const alpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(s.a));
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    shooters = shooters.filter((m) => m.x - m.len < W && m.y - m.len < H && m.life < 140);
    for (const m of shooters) {
      m.life++;
      m.x += m.v;
      m.y += m.v;
      const fade = Math.min(1, m.life / 10) * Math.max(0, 1 - m.life / 140);
      const g = ctx.createLinearGradient(m.x, m.y, m.x - m.len, m.y - m.len);
      g.addColorStop(0, `rgba(210,228,255,${fade})`);
      g.addColorStop(0.3, `rgba(140,175,255,${0.55 * fade})`);
      g.addColorStop(1, "rgba(140,175,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = m.w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.len, m.y - m.len);
      ctx.stroke();
      // kepala meteor bercahaya
      ctx.save();
      ctx.shadowColor = "rgba(150,190,255,0.95)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = `rgba(255,255,255,${fade})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.w * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!reduce) requestAnimationFrame(frame);
  }
  frame();
})();

// ===== 2. Efek mengetik =====
(function () {
  const el = document.getElementById("typed");
  const roles = ["Web Developer Pemula", "C++ & Qt Learner", "Linux Server Enthusiast", "Mahasiswa Polije"];
  let ri = 0, ci = 0, deleting = false;

  function tick() {
    const word = roles[ri];
    el.textContent = word.slice(0, ci);
    if (!deleting && ci < word.length) ci++;
    else if (!deleting) { deleting = true; return setTimeout(tick, 1400); }
    else if (ci > 0) ci--;
    else { deleting = false; ri = (ri + 1) % roles.length; }
    setTimeout(tick, deleting ? 40 : 85);
  }
  tick();
})();

// ===== 3. Navbar: link aktif mengikuti scroll =====
(function () {
  const links = document.querySelectorAll(".nav a[data-spy]");
  const sections = [...links].map((a) => document.getElementById(a.dataset.spy));
  function spy() {
    const y = window.scrollY + window.innerHeight * 0.35;
    let current = 0;
    sections.forEach((s, i) => { if (s && s.offsetTop <= y) current = i; });
    links.forEach((a, i) => a.classList.toggle("active", i === current));
  }
  window.addEventListener("scroll", spy, { passive: true });
  spy();
})();

// ===== 4. Tombol suara (bunyi klik kecil, default mati) =====
(function () {
  const btn = document.getElementById("sound");
  let on = false, ac = null;
  btn.classList.add("off");

  function blip(freq = 660, dur = 0.07) {
    if (!on) return;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  }

  btn.addEventListener("click", () => {
    on = !on;
    btn.classList.toggle("off", !on);
    btn.setAttribute("aria-label", on ? "Matikan suara" : "Nyalakan suara");
    blip(880, 0.1);
  });
  document.querySelectorAll(".nav a, .btn, .icon").forEach((el) =>
    el.addEventListener("click", () => blip())
  );
})();

// ===== 5. Scroll reveal + animasi angka =====
(function () {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("show");
        e.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(e.target);
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el, i) => {
    // beri jeda bertahap untuk elemen di hero
    if (el.closest(".hero")) el.style.transitionDelay = `${(i % 6) * 0.1}s`;
    io.observe(el);
  });

  function countUp(el) {
    const target = +el.dataset.count;
    let n = 0;
    const t = setInterval(() => {
      el.textContent = ++n;
      if (n >= target) clearInterval(t);
    }, 320);
  }
})();

// ===== 6. Efek tilt 3D pada kartu projek =====
document.querySelectorAll(".tilt").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(8px)`;
  });
  card.addEventListener("mouseleave", () => { card.style.transform = ""; });
});

// ===== 7. Tahun di footer =====
document.getElementById("year").textContent = new Date().getFullYear();

// ===== 8. Tab portfolio =====
(function () {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.toggle("active", x === t));
      document.querySelectorAll(".tabpanel").forEach((p) => {
        p.hidden = p.id !== "tab-" + t.dataset.tab;
      });
    })
  );
})();

// ===== 9. Klik map -> buka tab portfolio yang sesuai =====
const FRONT = "M0,.095 Q0,0 .055,0 L.37,0 C.43,0 .44,.164 .5,.164 L.945,.164 Q1,.164 1,.26 L1,.905 Q1,1 .945,1 L.055,1 Q0,1 0,.905 Z";
const BACK = "M0,.176 Q0,.12 .045,.12 L.4,.12 C.49,.12 .5,0 .6,0 L.955,0 Q1,0 1,.056 L1,.944 Q1,1 .955,1 L.045,1 Q0,1 0,.944 Z";
document.querySelectorAll(".folder").forEach((f) => {
  // garis tepi tipis mengikuti bentuk map
  [[".f-back", BACK], [".f-front", FRONT]].forEach(([sel, d]) => {
    const host = f.querySelector(sel);
    if (!host) return;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "f-edge");
    svg.setAttribute("viewBox", "0 0 1 1");
    svg.setAttribute("preserveAspectRatio", "none");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
    host.appendChild(svg);
  });
  // titik tiga: menu kecil "Open folder" + "Explore All ..."
  const badge = f.querySelector(".f-badge");
  const label = (f.querySelector("h5") || {}).textContent || "";
  const closeMenus = () => document.querySelectorAll(".f-menu.show").forEach((m) => m.classList.remove("show"));
  const setOpen = (on) => {
    document.querySelectorAll(".folder.open").forEach((o) => { if (o !== f) o.classList.remove("open"); });
    f.classList.toggle("open", on);
  };
  const menu = document.createElement("div");
  menu.className = "f-menu";
  menu.innerHTML = '<button type="button" data-a="open">Open folder</button><button type="button" data-a="go">Explore All ' + label + "</button>";
  f.appendChild(menu);
  const openBtn = menu.querySelector('[data-a="open"]');
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
    const a = e.target.closest("button");
    if (!a) return;
    if (a.dataset.a === "open") {
      setOpen(!f.classList.contains("open"));
    } else {
      const t = document.querySelector('.tab[data-tab="' + f.dataset.tab + '"]');
      if (t) t.click();
      document.getElementById("portfolio").scrollIntoView({ behavior: "smooth" });
    }
    closeMenus();
  });
  if (badge) {
    badge.setAttribute("role", "button");
    badge.setAttribute("tabindex", "0");
    badge.setAttribute("aria-label", "Menu map");
    const showMenu = (e) => {
      e.stopPropagation();
      const was = menu.classList.contains("show");
      closeMenus();
      openBtn.textContent = f.classList.contains("open") ? "Close folder" : "Open folder";
      if (!was) menu.classList.add("show");
    };
    badge.addEventListener("click", showMenu);
    badge.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showMenu(e); } });
  }
  // klik badan map: dokumen keluar / masuk lagi
  f.addEventListener("click", () => { closeMenus(); setOpen(!f.classList.contains("open")); });
});
document.addEventListener("click", (e) => { if (!e.target.closest(".f-menu")) document.querySelectorAll(".f-menu.show").forEach((m) => m.classList.remove("show")); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".f-menu.show").forEach((m) => m.classList.remove("show")); });

// ===== 10. Klik gambar sertifikat/prestasi -> tampil besar =====
(function () {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = "<img alt='' />";
  document.body.appendChild(box);
  const big = box.querySelector("img");
  const close = () => box.classList.remove("open");
  box.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.querySelectorAll(".pthumb img, .cert img").forEach((img) =>
    img.addEventListener("click", () => {
      big.src = img.src;
      big.alt = img.alt;
      box.classList.add("open");
    })
  );
})();

// ===== 11. Muat gambar: coba .jpg, .jpeg, .png, .webp otomatis =====
(function () {
  const ext = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG"];
  document.querySelectorAll("img[data-img]").forEach((img) => {
    let i = 0;
    const next = () => {
      if (i >= ext.length) {
        const p = img.parentElement;
        if (p && p.classList.contains("f-paper")) p.remove(); // kertas tanpa gambar dibuang
        else img.remove();
        return;
      }
      img.src = img.dataset.img + "." + ext[i++];
    };
    img.addEventListener("load", () => img.parentElement.classList.add("has-img"));
    img.addEventListener("error", next);
    next();
  });
})();

// ===== 12. Efek senter di foto About: lingkaran lembut mengikuti kursor =====
document.querySelectorAll(".photo-swap").forEach((w) => {
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, inside = false;
  const loop = () => {
    // bergerak halus mengejar kursor
    x += (tx - x) * 0.4;
    y += (ty - y) * 0.4;
    w.style.setProperty("--mx", x + "px");
    w.style.setProperty("--my", y + "px");
    raf = inside || Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  w.addEventListener("pointerenter", (e) => {
    const r = w.getBoundingClientRect();
    tx = x = e.clientX - r.left;
    ty = y = e.clientY - r.top;
    inside = true;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  w.addEventListener("pointermove", (e) => {
    const r = w.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
  });
  w.addEventListener("pointerleave", () => { inside = false; });
});

// ===== 13. Intro foto About: Benedetta tampil dulu, lalu berubah ke fotomu =====
(function () {
  const w = document.querySelector(".photo-swap");
  if (!w || !w.querySelector(".photo-alt")) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      w.classList.add("intro");
      setTimeout(() => { w.classList.remove("intro"); w.classList.add("intro-out"); }, 1500);
      setTimeout(() => w.classList.remove("intro-out"), 2500);
    },
    { threshold: 0.35 }
  );
  io.observe(w);
})();