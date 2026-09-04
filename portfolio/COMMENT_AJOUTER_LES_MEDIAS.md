# Où mettre les photos et vidéos

Le site charge maintenant tous les médias depuis le dossier `assets/`, en local — plus besoin d'aller les chercher sur l'ancien site Wix.

## 1. Vidéo du hero (en haut de la page)

Placez le fichier vidéo ici, avec exactement ce nom :

```
assets/hero-video.mp4
```

## 2. Photo de la bio

Placez le portrait ici, avec exactement ce nom :

```
assets/paul-portrait.webp
```

(un `.jpg` ou `.png` fonctionne aussi, mais il faut alors changer l'extension dans `script.js`, ligne où figure `paul-portrait.webp`)

## 3. Photos de chaque projet ("stills")

Chaque projet a son propre dossier dans `assets/stills/`. Il suffit d'y déposer les photos en les numérotant dans l'ordre où elles doivent apparaître, au format `01.jpg`, `02.jpg`, etc.

| Projet | Dossier | Nombre de photos attendues |
|---|---|---|
| L'Odeur de l'Été | `assets/stills/l-odeur-de-l-ete/` | 9 (01.jpg → 09.jpg) |
| Bvlgari | `assets/stills/bvlgari/` | 9 (01.jpg → 09.jpg) |
| Rose d'Hiver | `assets/stills/rose-d-hiver/` | 6 (01.jpg → 06.jpg) |
| Sur Le Sentier | `assets/stills/sur-le-sentier/` | 6 (01.jpg → 06.jpg) |
| Pietragalla Danse Barbara | `assets/stills/pietragalla-danse-barbara/` | 6 (01.jpg → 06.jpg) |
| OSEF Le Paradis | `assets/stills/osef-le-paradis/` | 6 (01.jpg → 06.jpg) |
| Des Vacances à Tout Prix | `assets/stills/des-vacances-a-tout-prix/` | 6 (01.jpg → 06.jpg) |
| Fario | `assets/stills/fario/` | 6 (01.jpg → 06.jpg) |
| Far Cry 5 — Shadow | `assets/stills/far-cry-5-shadow/` | 6 (01.jpg → 06.jpg) |
| Call Me Nina | `assets/stills/call-me-nina/` | 6 (01.jpg → 06.jpg) |

Si vous préférez utiliser `.png` ou `.webp` plutôt que `.jpg`, il faut changer l'extension dans le tableau `projects` au début de `script.js` (cherchez `"stills/..."`) pour qu'elle corresponde à vos fichiers.

Si un projet a plus ou moins de photos que prévu, ajustez simplement le nombre de lignes `"stills/<dossier>/NN.jpg"` dans `script.js` pour ce projet.

## 4. Page "Pics"

La grille de la page "Pics" est vide par défaut (elle affiche des cases "+"). Pour l'activer :

1. Déposez vos photos dans `assets/pics/` (ex : `photo-01.webp`, `photo-02.webp`...).
2. Dans `script.js`, cherchez la ligne :
   ```js
   const picsPhotos = [];
   ```
   et remplissez le tableau, par exemple :
   ```js
   const picsPhotos = [
     { src: "assets/pics/photo-01.webp", alt: "Sur le tournage de ..." },
     { src: "assets/pics/photo-02.webp", alt: "..." },
   ];
   ```

## Optimisation (recommandé)

Contrairement à l'ancien site (Wix), il n'y a plus de redimensionnement automatique des images. Pensez à exporter vos photos déjà compressées et à une taille raisonnable (environ 1600–2000 px de large maximum) avant de les déposer dans `assets/`, pour que le site reste rapide à charger.
