/* ============================================================
   Paul Olinger Ost — Portfolio
   Script principal : vidéo d'accueil, bande démo, carrousels,
   lightbox et fenêtres (filmographie, photos, bio).

   Le contenu (projets, filmographie, bio) est écrit directement
   dans index.html — ce fichier ne gère plus que l'interactivité.
   ============================================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   Fenêtres superposées (modales) — gestion commune et accessible
   - le focus entre dans la fenêtre à l'ouverture et revient sur le
     bouton d'origine à la fermeture ;
   - Tab reste piégé dans la fenêtre ; Échap la ferme ;
   - le reste de la page devient inerte (ni cliquable, ni lu) ;
   - #filmographie, #photos et #bio dans l'URL ouvrent la bonne fenêtre.
   ============================================================ */
const pageRegions = [...document.querySelectorAll('body > header, body > section, body > main, body > footer, .skip-link')];
const modalStack = [];

function focusablesIn(el){
  return [...el.querySelectorAll('a[href], button:not([disabled]), iframe, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(n => n.offsetParent !== null || n === document.activeElement);
}

function setPageInert(on){
  pageRegions.forEach(r => { r.inert = on; });
  document.body.style.overflow = on ? 'hidden' : '';
}

function openModal(modal, {trigger = document.activeElement, focus} = {}){
  if(modalStack.some(m => m.modal === modal)) return;
  // une fenêtre ouverte par-dessus une autre rend celle du dessous inerte
  modalStack.forEach(m => { m.modal.inert = true; });
  modalStack.push({modal, trigger});
  setPageInert(true);
  modal.classList.add('open');
  const ctl = document.querySelector(`[aria-controls="${modal.id}"][aria-expanded]`);
  if(ctl) ctl.setAttribute('aria-expanded', 'true');
  if(modal.dataset.hash && location.hash !== '#' + modal.dataset.hash){
    history.replaceState(null, '', '#' + modal.dataset.hash);
  }
  const target = focus || modal.querySelector('[tabindex="-1"]') || modal.querySelector('.modal-close, .lb-close');
  requestAnimationFrame(() => target && target.focus({preventScroll:true}));
  modal.dispatchEvent(new CustomEvent('modal:open'));
}

function closeModal(modal){
  const i = modalStack.findIndex(m => m.modal === modal);
  if(i === -1) return;
  const {trigger} = modalStack.splice(i, 1)[0];
  modal.classList.remove('open');
  const ctl = document.querySelector(`[aria-controls="${modal.id}"][aria-expanded]`);
  if(ctl) ctl.setAttribute('aria-expanded', 'false');
  if(modal.dataset.hash && location.hash === '#' + modal.dataset.hash){
    history.replaceState(null, '', location.pathname + location.search);
  }
  const top = modalStack[modalStack.length - 1];
  if(top){ top.modal.inert = false; } else { setPageInert(false); }
  modal.dispatchEvent(new CustomEvent('modal:close'));
  if(trigger && document.contains(trigger)) trigger.focus({preventScroll:true});
}

document.addEventListener('keydown', e => {
  const top = modalStack[modalStack.length - 1];
  if(!top) return;
  if(e.key === 'Escape'){ e.preventDefault(); closeModal(top.modal); return; }
  if(e.key !== 'Tab') return;
  const f = focusablesIn(top.modal);
  if(!f.length){ e.preventDefault(); return; }
  const first = f[0], last = f[f.length - 1];
  if(e.shiftKey && (document.activeElement === first || !top.modal.contains(document.activeElement))){
    e.preventDefault(); last.focus();
  } else if(!e.shiftKey && document.activeElement === last){
    e.preventDefault(); first.focus();
  }
});

// Fermeture au clic sur le fond + bouton ✕
function wireModal(modal, closeBtn){
  closeBtn.addEventListener('click', () => closeModal(modal));
  modal.addEventListener('click', e => { if(e.target === modal) closeModal(modal); });
}

/* ---------- vidéo d'accueil ---------- */
// Charge la version paysage ou portrait selon l'écran. Si le visiteur a
// activé « réduire les animations », rien n'est lancé : le poster reste.
// Le bouton « Pause » permet à tout le monde d'arrêter la vidéo.
const heroVideo = document.getElementById('heroVideo');
const heroPause = document.getElementById('heroPause');
let heroUserPaused = prefersReducedMotion;

(function initHeroVideo(){
  if(!heroVideo) return;
  const isSmallScreen = window.matchMedia('(max-width: 48em)').matches;
  if(isSmallScreen && heroVideo.dataset.posterMobile) heroVideo.poster = heroVideo.dataset.posterMobile;
  heroVideo.src = isSmallScreen ? heroVideo.dataset.srcMobile : heroVideo.dataset.srcDesktop;
  heroVideo.preload = prefersReducedMotion ? 'none' : 'auto';
  if(!prefersReducedMotion){ heroVideo.play().catch(() => {}); }
  updatePauseButton();
})();

function updatePauseButton(){
  if(!heroPause) return;
  const paused = heroUserPaused;
  heroPause.textContent = paused ? 'Lecture' : 'Pause';
  heroPause.setAttribute('aria-pressed', String(paused));
  heroPause.setAttribute('aria-label', paused ? 'Lancer la vidéo d’arrière-plan' : 'Mettre en pause la vidéo d’arrière-plan');
}

if(heroPause){
  heroPause.addEventListener('click', () => {
    heroUserPaused = !heroUserPaused;
    if(heroUserPaused){ heroVideo.pause(); } else { heroVideo.play().catch(() => {}); }
    updatePauseButton();
  });
}

/* ---------- bande démo (Vimeo, pour garder la pleine qualité) ---------- */
// Chaque bouton .hero-play porte son propre identifiant Vimeo (data-vimeo)
// et son titre (data-reel-title). Une seule démo pour l'instant ; pour passer
// à deux démos (Fiction / Publicité), voir le bloc commenté dans index.html.
const VIMEO_ID = '1224259824'; // démo actuelle, utilisée si data-vimeo est absent

(function initReelModal(){
  const reelButtons = document.querySelectorAll('.hero-play');
  const videoModal = document.getElementById('videoModal');
  const videoEmbed = document.getElementById('videoEmbed');
  const closeBtn = document.getElementById('videoModalClose');
  if(!reelButtons.length || !videoModal) return;

  reelButtons.forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.vimeo || VIMEO_ID;
    const title = btn.dataset.reelTitle || 'Bande démo de Paul Olinger Ost';
    videoEmbed.innerHTML = `
      <iframe src="https://player.vimeo.com/video/${id}?autoplay=1&title=0&byline=0&portrait=0&dnt=1"
              title="${title}"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen></iframe>`;
    heroVideo && heroVideo.pause();
    openModal(videoModal, {trigger: btn, focus: closeBtn});
  }));
  videoModal.addEventListener('modal:close', () => {
    videoEmbed.innerHTML = ''; // retire l'iframe : coupe net la lecture
    if(heroVideo && !heroUserPaused) heroVideo.play().catch(() => {});
  });
  wireModal(videoModal, closeBtn);
})();

/* ---------- projets ---------- */
// La liste est déjà écrite dans index.html par build-projects.py.
// assets/projects.json sert à la lightbox (et de secours si la liste
// n'a pas été générée).
const projectList = document.getElementById('projectList');
let projects = [];

async function loadProjects(){
  try{
    const res = await fetch('assets/projects.json');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    projects = raw.map(p => ({
      ...p,
      stills: p.stills.map((s, idx) => {
        const isObj = typeof s === 'object' && s !== null;
        const file = isObj ? s.file : s;
        const base = `assets/stills/${p.slug}/`;
        return {
          src: base + file,
          width: isObj ? s.width : null,
          height: isObj ? s.height : null,
          alt: (isObj && s.alt ? `${s.alt} — ${p.title}` : `Photogramme ${idx+1} de ${p.title} (${p.type}${p.credit ? ', ' + p.credit : ''})`),
          srcset: isObj && s.srcset
            ? s.srcset.split(', ').map(part => {
                const [fname, w] = part.split(' ');
                return `${base}${fname} ${w}`;
              }).join(', ')
            : null
        };
      })
    }));
  }catch(err){
    console.error("Impossible de charger assets/projects.json :", err);
    projects = [];
  }
  if(!projectList.querySelector('.project-row')) renderProjects();
}

// Secours uniquement : même rendu que build_site.py
function renderProjects(){
  projectList.innerHTML = projects.map((p, i) => {
    if(p.featured === false) return ''; // hors vitrine (garde sa page projet)
    const arrows = p.stills.length >= 3;
    return `
    <article class="project-row">
      <div class="project-block">
        <div class="project-meta">
          <h3 class="display"><a class="project-link" href="projets/${p.slug}/">${p.title}</a></h3>
          ${p.role ? `<p class="role">${p.role}</p>` : ''}
          <p class="type">${p.type}</p>
          <p class="credit">${p.credit}</p>
          <p class="credit prod">${p.prod}</p>
          ${p.diffusion ? `<p class="diffusion">${p.diffusion}</p>` : ''}
        </div>
        <div class="stills-wrap">
          ${arrows ? `<button type="button" class="stills-arrow stills-prev" data-shift="-1" data-shift-project="${i}" aria-label="Photos précédentes de ${p.title}">‹</button>` : ''}
          <div class="stills" data-project-stills="${i}">
            ${p.stills.map((s, idx) => `
              <button type="button" data-project="${i}" data-index="${idx}" aria-label="Agrandir : ${s.alt}">
                <img src="${s.src}"
                     ${s.srcset ? `srcset="${s.srcset}" sizes="(max-width: 480px) 55vw, (max-width: 820px) 46vw, 26vw"` : ''}
                     ${s.width ? `width="${s.width}" height="${s.height}"` : ''}
                     loading="lazy" alt="${s.alt}">
              </button>`).join('')}
          </div>
          ${arrows ? `<button type="button" class="stills-arrow stills-next" data-shift="1" data-shift-project="${i}" aria-label="Photos suivantes de ${p.title}">›</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
}

// Les flèches font défiler la ligne d'une vignette (scroll natif).
function scrollStillsBy(i, dir){
  const container = projectList.querySelector(`.stills[data-project-stills="${i}"]`);
  const item = container && container.querySelector('button');
  if(!container || !item) return;
  const gap = 6; // doit correspondre au gap CSS de .stills
  const step = item.getBoundingClientRect().width + gap;
  container.scrollBy({ left: dir * step, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

projectList.addEventListener('click', e => {
  const arrow = e.target.closest('button[data-shift-project]');
  if(arrow){
    scrollStillsBy(parseInt(arrow.dataset.shiftProject), parseInt(arrow.dataset.shift));
    return;
  }
  const btn = e.target.closest('button[data-project]');
  if(!btn) return;
  openLightbox(parseInt(btn.dataset.project), parseInt(btn.dataset.index), btn);
});

/* ---------- lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbCaption = document.getElementById('lbCaption');
let currentProject = 0, currentIndex = 0;
let lightboxMode = 'project'; // 'project' ou 'pics'

function openLightbox(pIdx, sIdx, trigger){
  if(!projects[pIdx]) return;
  lightboxMode = 'project';
  currentProject = pIdx; currentIndex = sIdx;
  renderLightbox();
  openModal(lightbox, {trigger, focus: document.getElementById('lbNext')});
}
function openPicsLightbox(idx, trigger){
  lightboxMode = 'pics';
  currentIndex = idx;
  renderLightbox();
  openModal(lightbox, {trigger, focus: document.getElementById('lbNext')});
}
function renderLightbox(){
  if(lightboxMode === 'pics'){
    const ph = picsPhotos[currentIndex];
    lbImg.src = ph.src;
    lbImg.hidden = false;
    lbImg.alt = ph.alt;
    lbCaption.textContent = `${currentIndex + 1} / ${picsPhotos.length}`;
    return;
  }
  const p = projects[currentProject];
  const s = p.stills[currentIndex];
  lbImg.src = s.src;
  lbImg.hidden = false;
  lbImg.alt = s.alt;
  lbCaption.innerHTML = `<strong>${p.title}</strong> — ${p.credit} <span class="lb-count">${currentIndex + 1} / ${p.stills.length}</span>`;
}
lightbox.addEventListener('modal:close', () => { lbImg.hidden = true; lbImg.src = ''; });

function stepStill(dir){
  const len = lightboxMode === 'pics' ? picsPhotos.length : projects[currentProject].stills.length;
  currentIndex = (currentIndex + dir + len) % len;
  renderLightbox();
}
document.getElementById('lbNext').addEventListener('click', () => stepStill(1));
document.getElementById('lbPrev').addEventListener('click', () => stepStill(-1));
wireModal(lightbox, document.getElementById('lbClose'));
document.addEventListener('keydown', e => {
  if(!lightbox.classList.contains('open')) return;
  if(e.key === 'ArrowRight') stepStill(1);
  if(e.key === 'ArrowLeft') stepStill(-1);
});

/* ---------- filmographie ---------- */
const filmoModal = document.getElementById('filmoModal');
if(!prefersReducedMotion){
  [...filmoModal.querySelectorAll('h3, li')].forEach((el, i) => {
    el.style.animationDelay = `${Math.min(i * 35, 500)}ms`;
  });
}
document.getElementById('navFilmo').addEventListener('click', e => openModal(filmoModal, {trigger: e.currentTarget}));
wireModal(filmoModal, document.getElementById('filmoClose'));

/* ---------- photos ---------- */
const picsModal = document.getElementById('picsModal');
const picsGrid = document.getElementById('picsGrid');
let picsPhotos = [];
let picsLoaded = false;

async function loadPics(){
  try{
    const res = await fetch('assets/photos.json');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const base = 'assets/photos/';
    picsPhotos = raw.map((p, idx) => {
      const isObj = typeof p === 'object' && p !== null;
      const file = isObj ? p.file : p;
      return {
        src: base + file,
        width: isObj ? p.width : null,
        height: isObj ? p.height : null,
        alt: (isObj && p.alt) ? p.alt : `Photographie ${idx + 1} sur ${raw.length}, par Paul Olinger Ost`,
        srcset: isObj && p.srcset
          ? p.srcset.split(', ').map(part => {
              const [fname, w] = part.split(' ');
              return `${base}${fname} ${w}`;
            }).join(', ')
          : null
      };
    });
  }catch(err){
    console.error("Impossible de charger assets/photos.json :", err);
    picsPhotos = [];
  }
  renderPics();
}

function renderPics(){
  if(picsPhotos.length === 0){
    picsGrid.innerHTML = '<p class="pics-empty">Photos bientôt disponibles.</p>';
    return;
  }
  picsGrid.innerHTML = picsPhotos.map((ph, idx) => `
    <button type="button" class="pics-tile" data-pic-index="${idx}" aria-label="Agrandir : ${ph.alt}">
      <img src="${ph.src}"
           ${ph.srcset ? `srcset="${ph.srcset}" sizes="(max-width: 480px) 55vw, (max-width: 820px) 46vw, 26vw"` : ''}
           ${ph.width ? `width="${ph.width}" height="${ph.height}"` : ''}
           loading="lazy" alt="${ph.alt}">
    </button>
  `).join('');
}

picsGrid.addEventListener('click', e => {
  const tile = e.target.closest('button[data-pic-index]');
  if(!tile) return;
  openPicsLightbox(parseInt(tile.dataset.picIndex), tile);
});

picsModal.addEventListener('modal:open', () => {
  if(!picsLoaded){ picsLoaded = true; loadPics(); }
});
document.getElementById('navPics').addEventListener('click', e => openModal(picsModal, {trigger: e.currentTarget}));
wireModal(picsModal, document.getElementById('picsClose'));

/* ---------- bio ---------- */
const bioModal = document.getElementById('bioModal');
if(!prefersReducedMotion){
  [...bioModal.querySelectorAll('.modal-body p')].forEach((el, i) => {
    el.style.animationDelay = `${i * 70}ms`;
  });
}
document.getElementById('navBio').addEventListener('click', e => openModal(bioModal, {trigger: e.currentTarget}));
wireModal(bioModal, document.getElementById('bioClose'));

// Lien « English version below » : défile dans la fenêtre sans fermer
bioModal.querySelector('.bio-lang-note a').addEventListener('click', e => {
  e.preventDefault();
  const target = document.getElementById('bioEnglish');
  target.scrollIntoView({behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start'});
});

/* ---------- ouverture par l'URL (#filmographie, #photos, #bio) ---------- */
const modalsByHash = {filmographie: filmoModal, photos: picsModal, bio: bioModal};
function openFromHash(){
  const m = modalsByHash[location.hash.slice(1)];
  if(m && !m.classList.contains('open')){
    const nav = document.querySelector(`[aria-controls="${m.id}"]`);
    openModal(m, {trigger: nav});
  }
}
window.addEventListener('hashchange', openFromHash);

/* ---------- go ---------- */
loadProjects();
openFromHash();
