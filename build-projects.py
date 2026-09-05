#!/usr/bin/env python3
"""
Régénère assets/projects.json à partir du contenu de assets/stills/.

Comment ça marche :
- Chaque projet = un dossier dans assets/stills/<slug-du-projet>/
- Ce dossier doit contenir :
    - un fichier info.json (titre, type, rôle, crédit, prod, diffusion, ordre)
      -> "role" est optionnel : c'est votre poste sur CE projet précis
         (ex: "Directeur de la photographie", "Réalisateur & DP"...).
         Laissez-le vide ou absent si vous ne voulez rien préciser.
    - les photos du projet, numérotées dans l'ordre voulu (01.jpg, 02.jpg, ...)
      -> peu importe l'extension : .jpg, .jpeg, .png et .webp sont acceptés,
         et vous pouvez même mélanger les formats dans un même dossier.

Photos plusieurs tailles (optionnel, mais fortement conseillé) :
    Si vous générez des variantes 480/960/1600px (voir la boucle ffmpeg
    fournie), nommez-les "01-480.jpg", "01-960.jpg", "01-1600.jpg" à côté de
    l'original "01.jpg". Ce script les détecte automatiquement, calcule les
    dimensions réelles (si Pillow est installé : `pip install Pillow`) et
    ajoute un srcset dans le JSON — le navigateur choisit alors la taille
    adaptée à l'écran au lieu de toujours télécharger la pleine résolution.
    Sans Pillow ni variantes, le script fonctionne quand même normalement.

- Ce script scanne tous les dossiers, lit chaque info.json, liste les photos
  présentes, et écrit le résultat dans assets/projects.json — le fichier que
  le site charge réellement au chargement de la page.

Utilisation :
    python3 build-projects.py

À relancer à chaque fois que vous ajoutez, retirez ou modifiez un projet.
"""

import json
import os
import re
import sys

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

ROOT = os.path.dirname(os.path.abspath(__file__))
STILLS_DIR = os.path.join(ROOT, "assets", "stills")
OUTPUT_FILE = os.path.join(ROOT, "assets", "projects.json")
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")
SIZE_VARIANTS = (480, 960, 1600)
VARIANT_SUFFIX_RE = re.compile(r"-(\d+)$")


def is_variant_file(stem):
    """'01-960' est une variante de taille de '01' ; '01-bts' ne l'est pas."""
    m = VARIANT_SUFFIX_RE.search(stem)
    return bool(m and int(m.group(1)) in SIZE_VARIANTS)


def build_still_entry(folder, filename):
    stem, ext = os.path.splitext(filename)
    entry = {"file": filename}

    if HAS_PIL:
        try:
            with Image.open(os.path.join(folder, filename)) as img:
                entry["width"], entry["height"] = img.size
        except Exception:
            pass

    variants = []
    for w in SIZE_VARIANTS:
        candidate = f"{stem}-{w}{ext}"
        if os.path.isfile(os.path.join(folder, candidate)):
            variants.append(f"{candidate} {w}w")
    if variants:
        entry["srcset"] = ", ".join(variants)

    return entry


def main():
    if not os.path.isdir(STILLS_DIR):
        print(f"❌ Dossier introuvable : {STILLS_DIR}")
        sys.exit(1)

    if not HAS_PIL:
        print("ℹ️  Pillow n'est pas installé (pip install Pillow) : les photos n'auront "
              "pas de width/height, mais tout le reste fonctionne normalement.\n")

    projects = []
    warnings = []

    for slug in sorted(os.listdir(STILLS_DIR)):
        folder = os.path.join(STILLS_DIR, slug)
        if not os.path.isdir(folder):
            continue

        info_path = os.path.join(folder, "info.json")
        if not os.path.isfile(info_path):
            warnings.append(f"'{slug}' ignoré : pas de fichier info.json dans ce dossier.")
            continue

        try:
            with open(info_path, encoding="utf-8") as f:
                info = json.load(f)
        except json.JSONDecodeError as e:
            warnings.append(f"'{slug}' ignoré : info.json contient une erreur ({e}).")
            continue

        all_images = sorted(
            f for f in os.listdir(folder)
            if f.lower().endswith(IMAGE_EXTENSIONS)
        )
        still_files = [
            f for f in all_images
            if not is_variant_file(os.path.splitext(f)[0])
        ]
        if not still_files:
            warnings.append(f"'{slug}' ignoré : aucune photo trouvée dans ce dossier.")
            continue

        if "title" not in info:
            warnings.append(f"'{slug}' : pas de 'title' dans info.json, le slug sera utilisé comme titre.")

        stills = [build_still_entry(folder, f) for f in still_files]

        projects.append({
            "slug": slug,
            "order": info.get("order", 999),
            "title": info.get("title", slug),
            "type": info.get("type", ""),
            "role": info.get("role", ""),
            "credit": info.get("credit", ""),
            "prod": info.get("prod", ""),
            "diffusion": info.get("diffusion", ""),
            "stills": stills,
        })

    projects.sort(key=lambda p: p["order"])

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"✅ {len(projects)} projet(s) écrit(s) dans assets/projects.json")
    for p in projects:
        with_srcset = sum(1 for s in p["stills"] if "srcset" in s)
        note = f", {with_srcset} avec srcset" if with_srcset else ""
        print(f"   - {p['title']}  ({len(p['stills'])} photos{note})")

    if warnings:
        print("\n⚠️  Avertissements :")
        for w in warnings:
            print(f"   - {w}")


if __name__ == "__main__":
    main()
