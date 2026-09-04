/* ============================================================
   Paul Olinger Ost — Portfolio
   Script principal (données des projets, filmographie, bio,
   lightbox, modales)
   ============================================================ */

/* ---------- chargement des projets ---------- */
// La liste des projets ne vit plus ici en dur : elle est lue depuis
// assets/projects.json, qui est lui-même généré automatiquement par
// build-projects.py à partir du contenu de assets/stills/.
// Voir COMMENT_AJOUTER_LES_MEDIAS.md pour la marche à suivre complète.
//
// IMPORTANT : fetch() ne fonctionne pas si vous ouvrez index.html en
// double-cliquant dessus (protocole file://). Pour tester en local,
// lancez un petit serveur (ex : `python3 -m http.server` dans ce dossier
// puis ouvrez http://localhost:8000). Une fois le site mis en ligne sur
// un vrai hébergement, cette limitation disparaît.
let projects = [];

async function loadProjects(){
  try{
    const res = await fetch('assets/projects.json');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    projects = raw.map(p => ({
      ...p,
      stills: p.stills.map(filename => `assets/stills/${p.slug}/${filename}`)
    }));
  }catch(err){
    console.error("Impossible de charger assets/projects.json :", err);
    projects = [];
  }
  renderProjects();
}

/* ---------- liste des projets (page d'accueil) ---------- */
const projectList = document.getElementById('projectList');

function stillsMarkup(p, i){
  // Toutes les stills du projet sont rendues : la ligne défile librement,
  // il n'y a plus de fenêtre de 3 ni de pagination. Chaque image garde son
  // ratio d'origine (voir .stills img en CSS : height fixe, width auto).
  return p.stills.map((src, idx) => `
    <button data-project="${i}" data-index="${idx}">
      <img src="${src}" loading="lazy" alt="${p.title} — still ${idx+1}">
    </button>
  `).join('');
}

function renderStills(i){
  const p = projects[i];
  const container = projectList.querySelector(`.stills[data-project-stills="${i}"]`);
  container.innerHTML = stillsMarkup(p, i);
}

// Les flèches font simplement défiler la ligne d'une vignette, en s'appuyant
// sur le scroll natif du navigateur (pas de saut ni de fenêtre fixe).
function scrollStillsBy(i, dir){
  const container = projectList.querySelector(`.stills[data-project-stills="${i}"]`);
  const item = container && container.querySelector('button');
  if(!container || !item) return;
  const gap = 8; // doit correspondre au gap CSS de .stills
  const step = item.getBoundingClientRect().width + gap;
  container.scrollBy({ left: dir * step, behavior:'smooth' });
}

function renderProjects(){
  projectList.innerHTML = '';
  projects.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'project-row';
    const showArrows = p.stills.length >= 3;
    row.innerHTML = `
      <div class="project-block">
        <div class="project-meta">
          <span class="project-index">${String(i+1).padStart(2,'0')}</span>
          <h2 class="display">${p.title}</h2>
          ${p.role ? `<p class="role">${p.role}</p>` : ''}
          <p class="type">${p.type}</p>
          <p class="credit">${p.credit}</p>
          <p class="credit prod">${p.prod}</p>
          ${p.diffusion ? `<p class="diffusion">${p.diffusion}</p>` : ''}
        </div>
        <div class="stills-wrap">
          ${showArrows ? `<button class="stills-arrow stills-prev" data-shift="-1" data-shift-project="${i}" aria-label="Photos précédentes">‹</button>` : ''}
          <div class="stills" data-project-stills="${i}"></div>
          ${showArrows ? `<button class="stills-arrow stills-next" data-shift="1" data-shift-project="${i}" aria-label="Photos suivantes">›</button>` : ''}
        </div>
      </div>
    `;
    projectList.appendChild(row);
    renderStills(i);
  });
}

projectList.addEventListener('click', e => {
  const arrow = e.target.closest('button[data-shift-project]');
  if(arrow){
    scrollStillsBy(parseInt(arrow.dataset.shiftProject), parseInt(arrow.dataset.shift));
    return;
  }
  const btn = e.target.closest('button[data-project]');
  if(!btn) return;
  openLightbox(parseInt(btn.dataset.project), parseInt(btn.dataset.index));
});

/* ---------- lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbCaption = document.getElementById('lbCaption');
let currentProject = 0, currentIndex = 0;

/* Empêche le fond de scroller en même temps qu'une fenêtre superposée */
function lockPageScroll(){ document.body.style.overflow = 'hidden'; }
function unlockPageScroll(){ document.body.style.overflow = ''; }

function openLightbox(pIdx, sIdx){
  currentProject = pIdx; currentIndex = sIdx;
  renderLightbox();
  lightbox.classList.add('open');
  lockPageScroll();
}
function renderLightbox(){
  const p = projects[currentProject];
  const src = p.stills[currentIndex];
  lbImg.src = src;
  lbImg.alt = `${p.title} — still ${currentIndex+1}`;
  lbCaption.innerHTML = `<strong>${p.title}</strong> — ${p.credit}`;
}
function closeLightbox(){ lightbox.classList.remove('open'); unlockPageScroll(); }
function nextStill(){ currentIndex = (currentIndex+1) % projects[currentProject].stills.length; renderLightbox(); }
function prevStill(){ currentIndex = (currentIndex-1+projects[currentProject].stills.length) % projects[currentProject].stills.length; renderLightbox(); }

document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lbNext').addEventListener('click', nextStill);
document.getElementById('lbPrev').addEventListener('click', prevStill);
lightbox.addEventListener('click', e => { if(e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => {
  if(lightbox.classList.contains('open')){
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowRight') nextStill();
    if(e.key === 'ArrowLeft') prevStill();
  } else if(filmoModal.classList.contains('open') && e.key === 'Escape'){
    closeFilmo();
  } else if(picsModal.classList.contains('open') && e.key === 'Escape'){
    closePics();
  } else if(bioModal.classList.contains('open') && e.key === 'Escape'){
    closeBio();
  }
});

/* ---------- filmographie modal ---------- */
const filmoModal = document.getElementById('filmoModal');
const filmoBody = document.getElementById('filmoBody');

filmoBody.innerHTML = `
  <h3>Réalisation</h3>
  <ul>
    <li><strong>GISELLE(S)</strong> | Marie-Claude Pietragalla &amp; Julien Derouault | MARTHA PRODUCTIONS
      <span>Captation live multi-caméras du ballet (en post-production) — Diffusion TV Olympia TV (Canal+)</span>
    </li>
  </ul>

  <h3>Longs-métrages (dir. photo)</h3>
  <ul>
    <li><strong>SUR LE SENTIER</strong> | Gérard Jumel | JOUR J. PRODUCTIONS
      <span>Sortie en salle le 8 avril 2026 — Alexa XT + Zeiss 35mm GO T1.3</span>
    </li>
    <li><strong>IL ÉTAIT UNE FOIS MICHEL LEGRAND</strong> | David Hertzog Dessites | MACT PRODUCTIONS
      <span>Dir. photo 2nd équipe — Sortie en salle 04 décembre 2024 — Sélection officielle Festival de Cannes, Cannes Classics 2024</span>
    </li>
    <li><strong>DES VACANCES À TOUT PRIX</strong> | Stevan Lee Mraovitch | CHARLOTTE RUSSE FILMS
      <span>Sony F65 + Panavision Primo-S Lens — Sortie US uniquement</span>
    </li>
    <li><strong>FARIO</strong> | Gérard Jumel | JOUR J. PRODUCTIONS
      <span>Alexa Plus + Cooke Panchro — Sortie salle arts &amp; essais</span>
    </li>
  </ul>

  <h3>Courts-métrages (dir. photo)</h3>
  <ul>
    <li><strong>TERMINUS</strong> | Alexis Thorez | OMEN FILMS
      <span>En post-production</span>
    </li>
    <li><strong>L'ODEUR DE L'ÉTÉ</strong> | Bastien Louessard | ASMAR PRODUCTIONS x OMEN FILMS
      <span>Alexa Mini + Cooke S4 Mini — En post-production</span>
    </li>
    <li><strong>MOI ET (EST) L'AUTRE</strong> | Région Île-de-France x ARS x Culture &amp; Santé x POC Alfortville
      <span>Projet artistique de danse en collaboration avec les usagers des hôpitaux Saint-Maurice et les élèves du Théâtre du Corps Pietragalla - Derouault, chorégraphié par Nam Kyung Kim</span>
    </li>
    <li><strong>PIETRAGALLA DANSE BARBARA</strong>
      <span>Teaser promotionnel</span>
    </li>
    <li><strong>OSEF LE PARADIS</strong> | Quentin Dufournet | PIMIENTO FILMS x CNC x Arté
      <span>Alexa Mini LF + Technovision Classic 1,5x Anamorphique FF — Diffusion Arté</span>
    </li>
    <li><strong>ROSE D'HIVER</strong> | Alexis Rousseau | OMEN FILMS
      <span>Alexa Mini + Cooke Anamorphic S6</span>
    </li>
    <li><strong>LA ZINGARA ET LES JEUNES GENS</strong> | Julie Ducrocq | CINÉSPIC PRODUCTIONS
      <span>Alexa XT Plus + Kowa Anamorphic</span>
    </li>
    <li><strong>LA MORT ET LES MUSICIENS</strong> | Julie Ducrocq | CINÉSPIC PRODUCTIONS
      <span>Alexa Plus + Cooke S4 Mini</span>
    </li>
    <li><strong>N O X</strong> | Louisa Pili | SUZANNE x PANORAMA PRODUCTIONS
      <span>Alexa Mini + Cooke S4</span>
    </li>
    <li><strong>PROCESSUS</strong> | Fany Gardes
      <span>Sony F55 + Panavision Primo-S Lens</span>
    </li>
    <li><strong>CRU, SALÉ, FICELÉ</strong> | Emma Outrebon | 400 TITRES
      <span>Alexa Mini + Kinoptiks</span>
    </li>
    <li><strong>VTC</strong> (web-série 2x6) | Louis Klein &amp; Alexis Thorez | 161 PRODUCTIONS
      <span>Alexa Mini + Cooke S4 Mini</span>
    </li>
    <li><strong>JE T'AIME</strong> | Dorine Pujol &amp; Gabriel Maz
      <span>Red Epic Dragon + Zeiss CP2</span>
    </li>
  </ul>

  <h3>Documentaires (dir. photo)</h3>
  <ul>
    <li><strong>SUPERS-VILAINS : L'ENQUÊTE</strong> | Xavier Fournier &amp; Fred Ralière | COMMUN-ID
      <span>Turner Broadcasting &amp; Warner Discovery</span>
    </li>
  </ul>

  <h3>Publicités (dir. photo)</h3>
  <ul>
    <li><strong>GIVENCHY</strong> | 1001 FILMS PRODUCTIONS</li>
    <li><strong>SÉLÉNA GOMEZ x RARE BEAUTY</strong> | Sephora | 1001 FILMS PRODUCTIONS
      <span>w/ Corentin Huard, Alexinho Mougeolle &amp; Rey Nguyen</span>
    </li>
    <li><strong>CALL ME NINA</strong> (fashion week) | VICTOR WEINSANTO
      <span>BlackMagic Pocket 6K + Atlas Orion Anamorphic</span>
    </li>
    <li><strong>BOLLINGER</strong> (shooting) | AGENCE MARIANNE
      <span>Sony A7SII + Sigma Art</span>
    </li>
    <li><strong>SAUVEZ UN GAMER — SHADOW</strong> | Léo Wolfenstein | CLÉO PRODUCTION
      <span>Alexa Mini + Kinoptiks</span>
    </li>
    <li><strong>HIVE — SHADOW</strong> | Léo Wolfenstein | CLÉO PRODUCTION
      <span>Alexa Mini + Cooke S4</span>
    </li>
    <li><strong>SHADOWEEN — SHADOW</strong> | Léo Wolfenstein
      <span>Alexa Mini + Canon CN-E18-80mm</span>
    </li>
    <li><strong>NO RULES — SHADOW</strong> | Léo Wolfenstein | CLÉO PRODUCTION
      <span>Alexa Mini + Leica Summilux-C</span>
    </li>
    <li><strong>SHADOW — IN THE CLOUD</strong> | Léo Wolfenstein | CLÉO PRODUCTION
      <span>Red Epic Dragon + Cooke S4 Mini</span>
    </li>
    <li><strong>FAR CRY 5 — SHADOW</strong> | Léo Wolfenstein
      <span>Alexa Mini + Cooke Anamorphic</span>
    </li>
  </ul>
`;

[...filmoBody.querySelectorAll('h3, li')].forEach((el, i) => {
  el.style.animationDelay = `${Math.min(i * 35, 500)}ms`;
});

function openFilmo(){ filmoModal.classList.add('open'); lockPageScroll(); }
function closeFilmo(){ filmoModal.classList.remove('open'); unlockPageScroll(); }
document.getElementById('navFilmo').addEventListener('click', openFilmo);
document.getElementById('filmoClose').addEventListener('click', closeFilmo);
filmoModal.addEventListener('click', e => { if(e.target === filmoModal) closeFilmo(); });

/* ---------- pics modal ---------- */
const picsModal = document.getElementById('picsModal');
const picsGrid = document.getElementById('picsGrid');

// Ajoutez vos photos ici une fois prêtes, ex:
// { src: "assets/pics/photo-01.webp", alt: "Sur le tournage de ..." }
const picsPhotos = [];

function renderPics(){
  if(picsPhotos.length === 0){
    picsGrid.innerHTML = Array.from({length: 9}).map(() => `
      <div class="pics-placeholder">+</div>
    `).join('');
    return;
  }
  picsGrid.innerHTML = picsPhotos.map(ph => `
    <div class="pics-tile">
      <img src="${ph.src}" loading="lazy" alt="${ph.alt || ''}">
    </div>
  `).join('');
}
renderPics();

function openPics(){ picsModal.classList.add('open'); lockPageScroll(); }
function closePics(){ picsModal.classList.remove('open'); unlockPageScroll(); }
document.getElementById('navPics').addEventListener('click', openPics);
document.getElementById('picsClose').addEventListener('click', closePics);
picsModal.addEventListener('click', e => { if(e.target === picsModal) closePics(); });

/* ---------- bio modal ---------- */
const bioModal = document.getElementById('bioModal');
const bioBody = document.getElementById('bioBody');

bioBody.innerHTML = `
  <p class="bio-lang-note"><a href="#bioEnglish">English version below ↓</a></p>
  <p>Originaire de Cornas, en Ardèche, j'ai manifesté très tôt un besoin d'expression artistique, passant du théâtre au conservatoire de musique où j'ai étudié le saxophone et le piano. Dès l'âge de 14 ans, je me suis tourné vers le cinéma en fondant une « Junior Association ». Véritable école de la débrouille, cette structure me permettait de financer mes propres courts-métrages grâce à des captations d'événements réalisées dans la région.</p>
  <p>Mon parcours scolaire a été plus atypique. Trois mois avant le bac, ma proviseure m'a convoqué pour me suggérer de redoubler mon année de terminale ou de me déscolariser afin de ne pas nuire aux statistiques de réussite, me lançant : « De toute façon, vous n'aurez jamais votre bac ». J'ai pris ma décision instantanément : j'ai quitté le lycée et je suis monté à Paris pour me consacrer entièrement à ma vocation. Ce fut le grand saut. Issu d'une famille étrangère au milieu artistique, je débarquais sans réseau, mais avec la certitude que ma place était là. C'est durant ces années que le métier de directeur de la photographie s'est définitivement imposé à moi.</p>
  <p>Mon expérience s'est forgée sur le tas. J'ai commencé par multiplier les films étudiants et les projets bénévoles, tout en travaillant parfois de nuit en mise en rayon pour tenir le coup financièrement. Petit à petit, ces expériences m'ont ouvert les portes de mes premiers tournages rémunérés : institutionnel, corporate et petites publicités. En parallèle, je continuais de signer l'image de fictions bénévoles pour construire ma première bande-démo, étape cruciale qui m'a permis de franchir un cap professionnel.</p>
  <p>En 2019, j'ai signé l'image de mon premier long-métrage, Fario, réalisé par Gérard Jumel, avec qui j'ai collaboré à nouveau en 2024 sur Sur le Sentier. Mon travail s'est depuis diversifié, allant de la comédie (Des Vacances à Tout Prix) au documentaire d'expédition dans la jungle camerounaise, en passant par la publicité pour de grandes maisons comme L'Oréal, Porsche ou Moët &amp; Chandon.</p>
  <p>L'année 2024 a été marquée par ma rencontre avec Marie-Claude Pietragalla et Julien Derouault. Cette collaboration artistique m'a conduit à la réalisation de la captation du ballet Giselle(s) pour Olympia TV (Canal+). Aujourd'hui, je continue d'explorer le lien entre image et mouvement en animant des masterclass au sein de leur compagnie, « Le Théâtre du Corps ».</p>
  <p>Animé par le défi technique et l'alchimie humaine, je considère mon métier comme un apprentissage permanent qui ne permet aucun repos sur ses acquis. Malgré un contexte économique difficile pour la culture, je reste un fervent défenseur d'un cinéma indépendant et inventif. Je suis convaincu que la solidarité artistique et le fait de se mettre corps et âme au service d'un projet sont les meilleures réponses pour surmonter les crises actuelles.</p>

  <hr class="bio-divider" id="bioEnglish">
  <h3>English</h3>
  <p>Born in Cornas, in the Ardèche region, I felt the pull toward artistic expression early on, moving from theatre to the music conservatory, where I studied saxophone and piano. At 14, I turned to filmmaking and founded a "Junior Association." A real school of resourcefulness, it let me fund my own short films by shooting local events.</p>
  <p>My schooling took a more unusual path. Three months before my final exams, my headmistress called me in to suggest I repeat the year or leave school altogether, so as not to hurt the school's pass-rate statistics, telling me: "You'll never get your diploma anyway." I made up my mind on the spot: I left school and moved to Paris to devote myself entirely to my calling. It was a leap into the unknown. Coming from a family with no ties to the arts, I arrived with no network, but with the certainty that this was where I belonged. It was during these years that cinematography established itself, once and for all, as my path.</p>
  <p>My experience was forged on set. I started out on countless student films and volunteer projects, sometimes working night shifts stocking shelves to make ends meet. Little by little, these experiences opened the door to my first paid jobs: institutional films, corporate work, and small commercials. At the same time, I kept shooting volunteer fiction projects to build my first showreel, a crucial step that let me turn professional.</p>
  <p>In 2019, I shot my first feature film, Fario, directed by Gérard Jumel, with whom I worked again in 2024 on Sur le Sentier. My work has since branched out: from comedy (Des Vacances à Tout Prix) to an expedition documentary in the Cameroonian jungle, as well as advertising for major houses such as L'Oréal, Porsche and Moët &amp; Chandon.</p>
  <p>2024 was marked by meeting Marie-Claude Pietragalla and Julien Derouault. That artistic collaboration led me to direct the filming of the ballet Giselle(s) for Olympia TV (Canal+). Today, I keep exploring the relationship between image and movement, teaching masterclasses within their company, "Le Théâtre du Corps."</p>
  <p>Driven by technical challenge and human chemistry, I see my craft as a constant learning process that never allows for resting on past achievements. Despite a difficult economic climate for culture, I remain a committed advocate for independent, inventive cinema. I'm convinced that artistic solidarity, throwing yourself body and soul into a project, is the best way through today's crises.</p>

  <div class="bio-photo-wrap">
    <img class="bio-photo" src="assets/bio/portrait.jpg" alt="Paul Olinger Ost">
  </div>
`;

[...bioBody.querySelectorAll('p')].forEach((el, i) => {
  el.style.animationDelay = `${i * 70}ms`;
});

function openBio(){ bioModal.classList.add('open'); lockPageScroll(); }
function closeBio(){ bioModal.classList.remove('open'); unlockPageScroll(); }
document.getElementById('navBio').addEventListener('click', openBio);
document.getElementById('bioClose').addEventListener('click', closeBio);
bioModal.addEventListener('click', e => { if(e.target === bioModal) closeBio(); });

/* ---------- go ---------- */
loadProjects();
