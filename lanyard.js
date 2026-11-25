// =====================================================================
//  Kartu ID 3D berfisika (tali + kartu bisa ditarik dengan mouse)
//  Diadaptasi dari proyek 3D_CARD (React Three Fiber + Rapier) menjadi
//  JavaScript biasa, jadi tidak perlu React / Next.js / npm.
//
//  PENTING: buka lewat Live Server di VS Code (http://127.0.0.1:5500),
//  bukan dengan klik dua kali index.html, karena browser memblokir
//  pemuatan file model .glb dari file:// .
// =====================================================================

(function () {
"use strict";

let dead = false;
const host = document.getElementById("lanyard");

const GLB = "assets/kartu.glb";
const IMG_FRONT = "assets/1.png";
const IMG_BACK = "assets/2.png";
const IMG_BAND = "assets/band.png";
const RAPIER_URLS = [
  "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js",
  "https://unpkg.com/@dimforge/rapier3d-compat@0.12.0/rapier.es.js",
];

// Lebar tali (satuan dunia 3D). Panjang satu ulangan teks mengikuti rasio gambar band.png,
// jadi tulisan di tali tidak melar atau terpotong.
const BAND_WIDTH = 0.24;

// Ukuran kartu di desktop: tinggi kartu = CARD_VH x tinggi layar (diukur dari situs referensi,
// kartu ~400 px lebar x 560 px tinggi di layar setinggi 1070 px). Ubah angka ini untuk
// memperbesar / memperkecil. Posisi: bagian atas kartu berada CARD_TOP_AT dari atas layar.
const CARD_VH = 0.52;
const CARD_TOP_AT = 0.29;

init().catch(showFailure);

// Jika gagal: tampilkan kartu cadangan + alasannya di layar (tanpa perlu buka F12)
function showFailure(err) {
  dead = true;
  console.error("[lanyard] gagal memuat kartu 3D:", err);
  host.classList.remove("ready");
  host.classList.add("failed");
  const note = document.getElementById("lanyard-note");
  if (!note) return;
  const why =
    location.protocol === "file:"
      ? "Halaman dibuka langsung dari file. Jalankan lewat Live Server di VS Code."
      : "Detail: " + (err && err.message ? err.message : err);
  note.textContent = "Kartu 3D belum bisa dimuat. " + why;
}

// Coba beberapa alamat CDN sampai ada yang berhasil
async function importFirst(urls) {
  let last;
  for (const u of urls) {
    try {
      return await import(u);
    } catch (e) {
      console.warn("[lanyard] gagal memuat", u, e);
      last = e;
    }
  }
  throw last;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar: " + src));
    img.src = src;
  });
}

async function init() {
  const [THREE, { GLTFLoader }, rapierModule] = await Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
    importFirst(RAPIER_URLS),
  ]);
  const RAPIER = rapierModule.default ?? rapierModule;
  await RAPIER.init();

  // ---------- Renderer, kamera, cahaya ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight(0xffffff, Math.PI));

  // Pantulan cahaya (setara <Lightformer> di versi React)
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x000000);
  const lightformer = (intensity, pos, rot, scale) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), side: THREE.DoubleSide });
    mat.toneMapped = false;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scale);
    envScene.add(m);
  };
  lightformer(2, [0, -1, 5], [0, 0, Math.PI / 3], [100, 0.1, 1]);
  lightformer(3, [-1, -1, 1], [0, 0, Math.PI / 3], [100, 0.1, 1]);
  lightformer(3, [1, 1, 1], [0, 0, Math.PI / 3], [100, 0.1, 1]);
  lightformer(10, [-10, 0, 14], [0, Math.PI / 2, Math.PI / 3], [100, 10, 1]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;

  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());

  // ---------- Muat model + gambar ----------
  const [gltf, front, back, bandImg] = await Promise.all([
    new GLTFLoader().loadAsync(GLB),
    loadImage(IMG_FRONT),
    loadImage(IMG_BACK),
    loadImage(IMG_BAND),
  ]);

  // Gabungkan gambar depan & belakang ke satu tekstur sesuai peta UV model:
  // sisi depan = setengah kiri, sisi belakang = setengah kanan.
  const S = 2048;
  const tex = document.createElement("canvas");
  tex.width = tex.height = S;
  const g = tex.getContext("2d");
  g.fillStyle = "#050a1f";
  g.fillRect(0, 0, S, S);
  g.drawImage(front, 0.001 * S, 0.004 * S, 0.498 * S, 0.751 * S);
  g.drawImage(back, 0.501 * S, 0.002 * S, 0.499 * S, 0.755 * S);

  const cardMap = new THREE.CanvasTexture(tex);
  cardMap.colorSpace = THREE.SRGBColorSpace;
  cardMap.flipY = false; // aturan UV glTF
  cardMap.anisotropy = maxAniso;

  const bandTex = new THREE.Texture(bandImg);
  bandTex.colorSpace = THREE.SRGBColorSpace;
  bandTex.wrapS = THREE.RepeatWrapping;
  bandTex.anisotropy = maxAniso;
  bandTex.needsUpdate = true;
  const bandTile = BAND_WIDTH * (bandImg.naturalWidth / bandImg.naturalHeight);
  // Sisi belakang tali memakai tekstur yang dibalik agar tulisannya tetap terbaca, bukan terbalik cermin
  const bandTexBack = bandTex.clone();
  bandTexBack.wrapT = THREE.RepeatWrapping;
  bandTexBack.repeat.set(1, -1);
  bandTexBack.offset.set(0, 1);
  bandTexBack.needsUpdate = true;

  const geo = (name) => gltf.scene.getObjectByName(name).geometry;
  const metal = gltf.scene.getObjectByName("clip").material;
  metal.roughness = 0.3;

  // ---------- Objek visual kartu ----------
  const cardGroup = new THREE.Group(); // mengikuti benda fisika
  const visual = new THREE.Group();   // offset & skala dari model asli
  visual.scale.setScalar(2.25);
  visual.position.set(0, -1.2, -0.05);
  cardGroup.add(visual);

  visual.add(
    new THREE.Mesh(
      geo("card"),
      new THREE.MeshPhysicalMaterial({ map: cardMap, clearcoat: 1, clearcoatRoughness: 0.15, roughness: 0.3, metalness: 0.5 })
    ),
    new THREE.Mesh(geo("clip"), metal),
    new THREE.Mesh(geo("clamp"), metal)
  );
  scene.add(cardGroup);

  // ---------- Tali (pita mengikuti kurva) ----------
  const N = 32;
  const bandPos = new Float32Array((N + 1) * 2 * 3);
  const bandUV = new Float32Array((N + 1) * 2 * 2);
  const arc = new Float32Array(N + 1); // panjang tali dari titik gantung
  const bandIdx = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    bandIdx.push(a, b, c, b, d, c);
  }
  const bandGeo = new THREE.BufferGeometry();
  bandGeo.setAttribute("position", new THREE.BufferAttribute(bandPos, 3));
  bandGeo.setAttribute("uv", new THREE.BufferAttribute(bandUV, 2));
  bandGeo.setIndex(bandIdx);
  // Dua lapis pada geometri yang sama: sisi depan dan sisi belakang pita
  for (const [map, side] of [[bandTex, THREE.FrontSide], [bandTexBack, THREE.BackSide]]) {
    const m = new THREE.Mesh(bandGeo, new THREE.MeshBasicMaterial({ map, side, depthTest: false, depthWrite: false }));
    m.frustumCulled = false;
    m.renderOrder = -1; // digambar lebih dulu, kartu menutupi ujungnya
    scene.add(m);
  }

  // ---------- Fisika (Rapier) ----------
  const world = new RAPIER.World({ x: 0, y: -40, z: 0 });
  const makeBody = (x, fixed = false) =>
    world.createRigidBody(
      (fixed ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
        .setTranslation(x, 4, 0)
        .setLinearDamping(4)
        .setAngularDamping(4)
        .setCanSleep(true)
    );

  const fixed = makeBody(0, true);
  const j1 = makeBody(0.5);
  const j2 = makeBody(1);
  const j3 = makeBody(1.5);
  const card = makeBody(2);

  [j1, j2, j3].forEach((b) => world.createCollider(RAPIER.ColliderDesc.ball(0.1), b));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.8, 1.125, 0.01), card);

  const O = { x: 0, y: 0, z: 0 };
  world.createImpulseJoint(RAPIER.JointData.rope(1, O, O), fixed, j1, true);
  world.createImpulseJoint(RAPIER.JointData.rope(1, O, O), j1, j2, true);
  world.createImpulseJoint(RAPIER.JointData.rope(1, O, O), j2, j3, true);
  world.createImpulseJoint(RAPIER.JointData.spherical(O, { x: 0, y: 1.45, z: 0 }), j3, card, true);

  // ---------- Interaksi: tarik kartu ----------
  // Pointer didengarkan di window (bukan di canvas) supaya kanvas boleh seluas seluruh
  // hero tanpa menutupi teks dan tombol, dan kartu tidak terpotong saat digeser.
  const stage = host.parentElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const vec = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let dragged = null;
  let hovered = false;
  let running = false;
  let down = null; // posisi & waktu saat tombol ditekan (untuk membedakan klik dan tarik)
  let flips = 0; // berapa kali kartu diklik (genap = menghadap depan, ganjil = belakang)

  const setPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const hitCard = () => {
    if (Math.abs(pointer.x) > 1 || Math.abs(pointer.y) > 1) return undefined; // di luar hero
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(visual, true)[0];
  };
  const onUI = (e) => !!(e.target.closest && e.target.closest("a, button, input, textarea, .nav"));
  const setCursor = (c) => { stage.style.cursor = c; };

  window.addEventListener("pointermove", (e) => {
    setPointer(e);
    if (dragged) return;
    const was = hovered;
    hovered = running && !onUI(e) && !!hitCard();
    if (hovered !== was) setCursor(hovered ? "grab" : "");
  });
  window.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !running || onUI(e)) return;
    setPointer(e);
    const hit = hitCard();
    if (!hit) return;
    const t = card.translation();
    dragged = { x: hit.point.x - t.x, y: hit.point.y - t.y, z: hit.point.z - t.z };
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    card.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    setCursor("grabbing");
    document.body.style.userSelect = "none"; // jangan menyorot teks saat menarik
  });
  const release = (e) => {
    if (!dragged) return;
    // klik = dilepas di tempat yang hampir sama dan cepat (bukan ditarik)
    const isClick = !!(e && e.type === "pointerup" && down &&
      Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 450);
    dragged = null;
    card.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    setCursor(hovered ? "grab" : "");
    document.body.style.userSelect = "";
    if (isClick) flip();
  };
  // Balik kartu: depan <-> belakang. Putarannya bolak-balik (bukan terus searah) supaya
  // tali tidak makin terpuntir; dorongan awal membuat putarannya terasa hidup.
  function flip() {
    flips += 1;
    const av = card.angvel();
    card.setAngvel({ x: av.x, y: flips % 2 ? 12 : -12, z: av.z }, true);
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", release);

  // ---------- Ukuran ----------
  const stacked = window.matchMedia("(max-width: 960px)"); // HP: kartu di bawah teks
  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan((12.5 * Math.PI) / 180); // setengah sudut pandang vertikal (fov 25)
    let z, cx = 0, cy = 0;
    if (stacked.matches) {
      // HP: area sempit, mundurkan kamera secukupnya agar kartu muat
      z = Math.max(9, 5.6 / camera.aspect);
    } else {
      // Desktop: kanvas seluas hero (bisa lebih tinggi dari layar), jadi ukuran kartu
      // dihitung dari tinggi LAYAR, bukan tinggi kanvas. s = piksel per satuan dunia.
      const m = Math.min(h, window.innerHeight);
      const s = (CARD_VH * m) / 2.25; // tinggi kartu di dunia 3D = 2.25
      z = h / (2 * tan * s);
      cy = 0.65 - (h / 2 - CARD_TOP_AT * m) / s; // 0.65 = sisi atas kartu saat menggantung
      cx = -0.45 * z * tan * camera.aspect; // gantungan di sekitar 72% lebar layar
    }
    camera.position.set(cx, cy, z);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(host);
  resize();

  // ---------- Loop animasi ----------
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  curve.curveType = "chordal";
  const toVec = (t) => new THREE.Vector3(t.x, t.y, t.z);
  const lerped = { j1: toVec(j1.translation()), j2: toVec(j2.translation()) };
  const tmp = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const minSpeed = 10, maxSpeed = 50;
  const clock = new THREE.Clock();
  let yawAcc = 0, lastYaw = 0; // sudut putar kartu (terakumulasi, tidak melompat di 180°)
  let firstFrame = true;

  function smooth(body, l, delta) {
    const t = body.translation();
    tmp.set(t.x, t.y, t.z);
    const dist = Math.max(0.1, Math.min(1, l.distanceTo(tmp)));
    l.lerp(tmp, Math.min(1, delta * (minSpeed + dist * (maxSpeed - minSpeed))));
  }

  function step() {
    const delta = Math.min(Math.max(clock.getDelta(), 1 / 240), 1 / 30);

    if (dragged) {
      vec.set(pointer.x, pointer.y, 0.5).unproject(camera);
      dir.copy(vec).sub(camera.position).normalize();
      vec.add(dir.multiplyScalar(camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((b) => b.wakeUp());
      card.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }

    world.timestep = delta;
    world.step();

    smooth(j1, lerped.j1, delta);
    smooth(j2, lerped.j2, delta);

    // kurva tali: kartu -> j2 -> j1 -> titik tetap
    curve.points[0].copy(toVec(j3.translation()));
    curve.points[1].copy(lerped.j2);
    curve.points[2].copy(lerped.j1);
    curve.points[3].copy(toVec(fixed.translation()));
    const pts = curve.getPoints(N);

    arc[N] = 0;
    for (let i = N - 1; i >= 0; i--) arc[i] = arc[i + 1] + pts[i].distanceTo(pts[i + 1]);

    for (let i = 0; i <= N; i++) {
      const p = pts[i];
      tan.copy(pts[Math.min(i + 1, N)]).sub(pts[Math.max(i - 1, 0)]);
      const len = Math.hypot(tan.x, tan.y) || 1;
      // Pita memuntir: 0 di titik gantung (atas), sebesar putaran kartu di ujung bawah
      const twist = arc[0] > 0 ? yawAcc * (arc[i] / arc[0]) : 0;
      const hw = BAND_WIDTH / 2;
      const ox = (-tan.y / len) * hw * Math.cos(twist); // lebar pita di bidang layar
      const oy = (tan.x / len) * hw * Math.cos(twist);
      const oz = hw * Math.sin(twist);                   // sisanya menuju / menjauhi kamera
      const u = arc[i] / bandTile; // teks terbaca dari atas ke bawah, menempel di titik gantung
      bandPos.set([p.x + ox, p.y + oy, p.z + oz, p.x - ox, p.y - oy, p.z - oz], i * 6);
      bandUV.set([u, 0, u, 1], i * 4);
    }
    bandGeo.attributes.position.needsUpdate = true;
    bandGeo.attributes.uv.needsUpdate = true;

    // arahkan putaran kartu ke sisi yang diinginkan (depan/belakang); redaman fisika
    // menghentikannya di sana. Dengan flips = 0 ini sama dengan meredam putaran biasa.
    const av = card.angvel();
    const rot = card.rotation();
    const yaw = Math.atan2(2 * (rot.w * rot.y + rot.x * rot.z), 1 - 2 * (rot.x * rot.x + rot.y * rot.y));
    let dy = yaw - lastYaw;
    if (dy > Math.PI) dy -= 2 * Math.PI;
    else if (dy < -Math.PI) dy += 2 * Math.PI;
    yawAcc += dy;
    lastYaw = yaw;
    card.setAngvel({ x: av.x, y: av.y + ((flips % 2) * Math.PI - yawAcc) * 0.22, z: av.z }, true);

    // salin posisi benda fisika ke objek visual
    const t = card.translation();
    cardGroup.position.set(t.x, t.y, t.z);
    cardGroup.quaternion.set(rot.x, rot.y, rot.z, rot.w);

    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      host.classList.add("ready");
    }
  }

  // Satu frame; kalau ada error, hentikan loop dan tampilkan kartu cadangan
  function frame() {
    try {
      step();
    } catch (err) {
      renderer.setAnimationLoop(null);
      showFailure(err);
    }
  }

  // Jalankan hanya saat bagian hero terlihat (hemat baterai)
  const setRunning = (on) => {
    if (on === running || dead) return;
    running = on;
    if (on) {
      clock.getDelta();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  };
  new IntersectionObserver((entries) => setRunning(entries[0].isIntersecting)).observe(host);
}
})();