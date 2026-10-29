"""
Génération des parties statiques du site, appelée par build-projects.py.
(Inutile de lancer ce fichier directement.)

Ce qu'il fait :
  1. écrit la liste des projets dans index.html, entre les repères
     <!-- PROJETS:DEBUT --> et <!-- PROJETS:FIN --> ;
  2. génère une page par projet : projets/<slug>/index.html ;
  3. met à jour sitemap.xml.

Pourquoi : quand le contenu n'existe qu'en JavaScript, Google le lit mal
et les autres robots (aperçus WhatsApp/LinkedIn, moteurs IA…) ne le voient
pas du tout. Ici, tout est déjà dans le HTML ; script.js ne fait plus que
l'interactivité (carrousels, lightbox, modales).
"""

import datetime
import hashlib
import html
import json
import os
import re

SITE = "https://paulolingerost.com"
NAME = "Paul Olinger Ost"
START = "<!-- PROJETS:DEBUT — bloc généré par build-projects.py, ne pas modifier à la main -->"
END = "<!-- PROJETS:FIN -->"


def esc(s):
    return html.escape(s or "", quote=True)


def still_alt(p, s, idx):
    if s.get("alt"):
        return f"{s['alt']} — {p['title']}"
    who = f", {p['credit']}" if p.get("credit") else ""
    return f"Photogramme {idx + 1} de {p['title']} ({p['type']}{who})"


def img_attrs(base, s, sizes):
    out = [f'src="{base}{esc(s["file"])}"']
    if s.get("srcset"):
        parts = []
        for part in s["srcset"].split(", "):
            fname, w = part.split(" ")
            parts.append(f"{base}{fname} {w}")
        out.append(f'srcset="{esc(", ".join(parts))}" sizes="{sizes}"')
    if s.get("width"):
        out.append(f'width="{s["width"]}" height="{s["height"]}"')
    return " ".join(out)


# ---------------------------------------------------------------- accueil

def project_row(p, i):
    base = f"assets/stills/{p['slug']}/"
    stills = "\n".join(
        f'          <button type="button" data-project="{i}" data-index="{idx}" '
        f'aria-label="Agrandir : {esc(still_alt(p, s, idx))}">'
        f'<img {img_attrs(base, s, "(max-width: 480px) 55vw, (max-width: 820px) 46vw, 26vw")} '
        f'loading="lazy" alt="{esc(still_alt(p, s, idx))}"></button>'
        for idx, s in enumerate(p["stills"])
    )
    arrows = len(p["stills"]) >= 3
    prev_btn = (f'<button type="button" class="stills-arrow stills-prev" data-shift="-1" '
                f'data-shift-project="{i}" aria-label="Photos précédentes de {esc(p["title"])}">‹</button>') if arrows else ""
    next_btn = (f'<button type="button" class="stills-arrow stills-next" data-shift="1" '
                f'data-shift-project="{i}" aria-label="Photos suivantes de {esc(p["title"])}">›</button>') if arrows else ""
    role = f'\n          <p class="role">{esc(p["role"])}</p>' if p.get("role") else ""
    diffusion = f'\n          <p class="diffusion">{esc(p["diffusion"])}</p>' if p.get("diffusion") else ""
    return f"""    <article class="project-row">
      <div class="project-block">
        <div class="project-meta">
          <h3 class="display"><a class="project-link" href="projets/{p['slug']}/">{esc(p['title'])}</a></h3>{role}
          <p class="type">{esc(p['type'])}</p>
          <p class="credit">{esc(p['credit'])}</p>
          <p class="credit prod">{esc(p['prod'])}</p>{diffusion}
        </div>
        <div class="stills-wrap">
          {prev_btn}
          <div class="stills" data-project-stills="{i}">
{stills}
          </div>
          {next_btn}
        </div>
      </div>
    </article>"""


def inject_index(root, projects):
    path = os.path.join(root, "index.html")
    with open(path, encoding="utf-8") as f:
        src = f.read()
    if START not in src or END not in src:
        print("⚠️  Repères PROJETS:DEBUT / PROJETS:FIN introuvables dans index.html : liste non écrite.")
        return
    # i = position dans projects.json (sert à la lightbox) : on la garde
    # même quand des projets hors vitrine sont sautés.
    block = "\n".join(project_row(p, i) for i, p in enumerate(projects)
                      if p.get("featured", True))
    pattern = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)
    src = pattern.sub(lambda m: f"{START}\n{block}\n{END}", src)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("✅ Liste des projets écrite dans index.html")


# ---------------------------------------------------------- pages projet

def video_embed(url, title):
    if not url:
        return ""
    m = re.search(r"vimeo\.com/(?:video/)?(\d+)", url)
    if m:
        src = f"https://player.vimeo.com/video/{m.group(1)}?title=0&byline=0&portrait=0&dnt=1"
    else:
        m = re.search(r"(?:youtu\.be/|v=|embed/)([\w-]{11})", url)
        if not m:
            return ""
        src = f"https://www.youtube-nocookie.com/embed/{m.group(1)}"
    return (f'<div class="project-video"><iframe src="{src}" title="Bande-annonce — {esc(title)}" '
            f'loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>')


def project_page(p, prev_p, next_p):
    url = f"{SITE}/projets/{p['slug']}/"
    base = f"/assets/stills/{p['slug']}/"
    first = p["stills"][0]
    # Image de partage : la plus grande variante disponible (1600 px),
    # sinon l'original.
    og_file, og_w = first["file"], first.get("width")
    for part in (first.get("srcset") or "").split(", "):
        if part.endswith(" 1600w"):
            og_file, og_w = part.split(" ")[0], 1600
    image = f"{SITE}{base}{og_file}"
    og_h = round(og_w * first["height"] / first["width"]) if og_w and first.get("width") else None
    og_dims = (f'<meta property="og:image:width" content="{og_w}">\n'
               f'<meta property="og:image:height" content="{og_h}">\n') if og_h else ""
    type_ = p.get("type", "")
    # Titre court (Google coupe vers 60 caractères)
    title_tag = f"{p['title']} ({type_}) — {NAME}, chef opérateur"
    description = f"{p['title']}, {type_} {p.get('credit', '')}".strip().rstrip(".") + \
        f". Image : {NAME}, directeur de la photographie à Paris."
    if p.get("diffusion"):
        description += f" {p['diffusion'].rstrip('.')}."
    if len(description) > 160:
        description = description[:157].rsplit(" ", 1)[0] + "…"

    is_film = any(k in type_.lower() for k in ("métrage", "documentaire"))
    ld = {
        "@context": "https://schema.org",
        "@type": "Movie" if is_film else "CreativeWork",
        "name": p["title"],
        "url": url,
        "image": image,
        "genre": type_,
        "contributor": {"@type": "Person", "@id": f"{SITE}/#paul", "name": NAME,
                        "jobTitle": "Directeur de la photographie", "url": f"{SITE}/"},
    }
    m = re.search(r"réalisé par (.+)$", p.get("credit", ""))
    if m and is_film:
        ld["director"] = [{"@type": "Person", "name": n.strip()}
                          for n in re.split(r"\s*(?:&| et )\s*", m.group(1)) if n.strip()]
    if p.get("synopsis"):
        ld["abstract"] = p["synopsis"]

    still_tags = []
    for idx, s in enumerate(p["stills"]):
        lazy = "" if idx == 0 else 'loading="lazy" '
        still_tags.append(
            f'      <figure class="project-still"><img {img_attrs(base, s, "(max-width: 820px) 100vw, 80vw")} '
            f'{lazy}alt="{esc(still_alt(p, s, idx))}"></figure>')
    stills = "\n".join(still_tags)

    def fiche(label, value):
        return f"<div><dt>{label}</dt><dd>{esc(value)}</dd></div>" if value else ""

    fiche_html = "".join([
        fiche("Réalisation", re.sub(r"^(écrit et )?(réalisé|mis en scène) par ", "", p.get("credit", ""))),
        fiche("Production", re.sub(r"^Produit par ", "", p.get("prod", ""))),
        fiche("Caméra / optiques", p.get("camera", "")),
        fiche("Diffusion", p.get("diffusion", "")),
        fiche("Image", p.get("role") or "Directeur de la photographie — Paul Olinger Ost"),
    ])
    synopsis = f'<p class="project-synopsis">{esc(p["synopsis"])}</p>' if p.get("synopsis") else ""

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title_tag)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0B0B0B">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="article">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="{NAME}">
<meta property="og:title" content="{esc(p['title'])} — image {NAME}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:image" content="{image}">
{og_dims}<meta property="og:image:alt" content="{esc(still_alt(p, first, 0))}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=2)}
</script>
<link rel="preconnect" href="https://api.fontshare.com">
<link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css?v={asset_version('style.css')}">
</head>
<body class="project-page">

<a class="skip-link" href="#main">Aller au contenu</a>

<header class="site-header site-header--solid">
  <a class="site-name" href="/">{NAME}</a>
  <nav aria-label="Navigation principale">
    <a href="/#filmographie">Filmographie</a>
    <a href="/#photos">Photos</a>
    <a href="/#bio">Bio</a>
  </nav>
</header>

<main id="main" class="project-main" tabindex="-1">
  <nav class="breadcrumb" aria-label="Fil d'Ariane"><a href="/">Accueil</a> <span aria-hidden="true">/</span> <span aria-current="page">{esc(p['title'])}</span></nav>
  <div class="project-head">
    <h1 class="display">{esc(p['title'])}</h1>
    <p class="type">{esc(type_)}</p>
    {synopsis}
    <dl class="project-fiche">{fiche_html}</dl>
  </div>
  {video_embed(p.get('video'), p['title'])}
  <div class="project-stills">
{stills}
  </div>
  <nav class="project-pager" aria-label="Autres projets">
    <a href="/projets/{prev_p['slug']}/"><span>Projet précédent</span>{esc(prev_p['title'])}</a>
    <a href="/projets/{next_p['slug']}/"><span>Projet suivant</span>{esc(next_p['title'])}</a>
  </nav>
</main>

<footer id="contact">
  <div class="col">
    <h2 class="footer-title">Contact</h2>
    <p><a href="mailto:contact@paulolingerost.com">contact@paulolingerost.com</a></p>
    <p><a href="tel:+33659862680">+33 6 59 86 26 80</a></p>
    <p>Paris, France</p>
  </div>
  <div class="col">
    <h2 class="footer-title">Suivre</h2>
    <p><a href="https://www.instagram.com/paulolingerost/" target="_blank" rel="noopener me">Instagram<span class="visually-hidden"> (nouvel onglet)</span></a></p>
    <p><a href="https://www.imdb.com/name/nm7436555/" target="_blank" rel="noopener me">IMDb<span class="visually-hidden"> (nouvel onglet)</span></a></p>
  </div>
  <div class="col">
    <p>© {NAME}</p>
  </div>
</footer>

</body>
</html>
"""


def write_project_pages(root, projects):
    out_dir = os.path.join(root, "projets")
    os.makedirs(out_dir, exist_ok=True)
    keep = set()
    n = len(projects)
    for i, p in enumerate(projects):
        d = os.path.join(out_dir, p["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(project_page(p, projects[(i - 1) % n], projects[(i + 1) % n]))
        keep.add(p["slug"])
    # Supprime les pages de projets retirés du site
    for slug in os.listdir(out_dir):
        page = os.path.join(out_dir, slug, "index.html")
        if slug not in keep and os.path.isfile(page):
            os.remove(page)
            try:
                os.rmdir(os.path.join(out_dir, slug))
            except OSError:
                pass
    print(f"✅ {n} page(s) projet générée(s) dans projets/")


def write_sitemap(root, projects):
    today = datetime.date.today().isoformat()
    urls = [f"{SITE}/"] + [f"{SITE}/projets/{p['slug']}/" for p in projects]
    body = "\n".join(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>" for u in urls)
    with open(os.path.join(root, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                f"{body}\n</urlset>\n")
    print("✅ sitemap.xml mis à jour")


# ------------------------------------------------------------- anti-cache
# Ajoute ?v=<empreinte> aux liens vers style.css et script.js : dès que l'un
# des deux change, les navigateurs téléchargent la nouvelle version au lieu
# de garder l'ancienne en cache (sinon : page nouvelle + style ancien = tout
# se décale).
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


def asset_version(name):
    with open(os.path.join(ROOT_DIR, name), "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


def bust_cache(root):
    for page in ("index.html", "404.html"):
        path = os.path.join(root, page)
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as f:
            src = f.read()
        for name in ("style.css", "script.js"):
            src = re.sub(r'(href|src)="(/?)' + re.escape(name) + r'(\?v=[0-9a-f]+)?"',
                         lambda m, n=name: f'{m.group(1)}="{m.group(2)}{n}?v={asset_version(n)}"', src)
        with open(path, "w", encoding="utf-8") as f:
            f.write(src)


def render(root, projects):
    bust_cache(root)
    inject_index(root, projects)
    write_project_pages(root, projects)
    write_sitemap(root, projects)
