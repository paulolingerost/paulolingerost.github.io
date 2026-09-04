#!/usr/bin/env python3
"""
Régénère assets/photos.json à partir du contenu de assets/photos/.

Comment ça marche :
- Déposez vos photos "en vrac" (page Photos du site) dans assets/photos/.
  N'importe quel nom de fichier convient — pas besoin de les renommer ni de
  les numéroter. .jpg, .jpeg, .png et .webp sont acceptés, vous pouvez même
  mélanger les formats dans le dossier.
- Ce script liste les photos présentes (ordre alphabétique), calcule leurs
  dimensions si Pillow est installé (pip install Pillow), détecte les
  variantes de taille -480/-960/-1600 si vous en avez généré (voir la
  boucle ffmpeg fournie), et écrit tout ça dans assets/photos.json — le
  fichier que le site charge réellement pour la page Photos.

Utilisation :
    python3 build-photos.py

À relancer à chaque fois que vous ajoutez ou retirez une photo.
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
PHOTOS_DIR = os.path.join(ROOT, "assets", "photos")
OUTPUT_FILE = os.path.join(ROOT, "assets", "photos.json")
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")
SIZE_VARIANTS = (480, 960, 1600)
VARIANT_SUFFIX_RE = re.compile(r"-(\d+)$")


def is_variant_file(stem):
    """'ma-photo-960' est une variante de taille de 'ma-photo' ; à exclure
    de la liste principale pour ne pas la compter comme une photo à part."""
    m = VARIANT_SUFFIX_RE.search(stem)
    return bool(m and int(m.group(1)) in SIZE_VARIANTS)


def build_photo_entry(filename):
    stem, ext = os.path.splitext(filename)
    entry = {"file": filename}

    if HAS_PIL:
        try:
            with Image.open(os.path.join(PHOTOS_DIR, filename)) as img:
                entry["width"], entry["height"] = img.size
        except Exception:
            pass

    variants = []
    for w in SIZE_VARIANTS:
        candidate = f"{stem}-{w}{ext}"
        if os.path.isfile(os.path.join(PHOTOS_DIR, candidate)):
            variants.append(f"{candidate} {w}w")
    if variants:
        entry["srcset"] = ", ".join(variants)

    return entry


def main():
    if not os.path.isdir(PHOTOS_DIR):
        print(f"❌ Dossier introuvable : {PHOTOS_DIR}")
        sys.exit(1)

    if not HAS_PIL:
        print("ℹ️  Pillow n'est pas installé (pip install Pillow) : les photos n'auront "
              "pas de width/height, mais tout le reste fonctionne normalement.\n")

    all_images = sorted(
        f for f in os.listdir(PHOTOS_DIR)
        if f.lower().endswith(IMAGE_EXTENSIONS)
    )
    photo_files = [f for f in all_images if not is_variant_file(os.path.splitext(f)[0])]

    if not photo_files:
        print(f"⚠️  Aucune photo trouvée dans {PHOTOS_DIR} — la page Photos affichera les cases vides.")

    photos = [build_photo_entry(f) for f in photo_files]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(photos, f, ensure_ascii=False, indent=2)
        f.write("\n")

    with_srcset = sum(1 for p in photos if "srcset" in p)
    note = f" ({with_srcset} avec srcset)" if with_srcset else ""
    print(f"✅ {len(photos)} photo(s) écrite(s) dans assets/photos.json{note}")


if __name__ == "__main__":
    main()
