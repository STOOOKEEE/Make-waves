# Visuels de la page tombola

## `airpods-max.glb` — le modèle 3D

**Source** : [Airpods MAX par Empty](https://sketchfab.com/3d-models/airpods-max-0bd3445ae09e4d2fa6cd66ab5309a360)
sur Sketchfab.
**Licence** : [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) — **l'attribution est
obligatoire**. Elle est affichée dans le règlement de la page (clé i18n `rulesModel`), et un test
vérifie sa présence. Ne pas la retirer.

### Optimisation

Le fichier d'origine faisait 3,53 Mo, ce qui est trop pour une page de campagne qu'on veut ouvrable
en 4G. Ramené à **1,25 Mo** avec [glTF-Transform](https://gltf-transform.dev) :

```bash
npx @gltf-transform/cli prune   airpods_max.glb s1.glb   # accessoires inutilisés (2 accesseurs)
npx @gltf-transform/cli dedup   s1.glb          s2.glb
npx @gltf-transform/cli resize  --width 1024 --height 1024 s2.glb s3.glb
npx @gltf-transform/cli webp    --quality 84    s3.glb    s4.glb   # 3 PNG → WebP
npx @gltf-transform/cli quantize s4.glb         airpods-max.glb    # KHR_mesh_quantization
```

Le résultat déclare deux extensions **requises**, `EXT_texture_webp` et `KHR_mesh_quantization`,
toutes deux prises en charge nativement par le `GLTFLoader` de three.js. Un autre visualiseur peut
donc refuser ce fichier : c'est assumé, il n'est lu que par `ProductViewer.vue`.

Géométrie : 25 827 sommets, 46 640 triangles, un seul matériau baké. Rien à simplifier de ce côté.

## `airpods-max-hero.webp` — l'image de repli

Affichée tant que la 3D n'est pas prête, et **à sa place** si WebGL est indisponible (navigateur
ancien, accélération matérielle coupée, rendu de miniature). La page ne doit jamais montrer un trou.

**Source** : [photo de Zam8TvEgN5o](https://unsplash.com/photos/pink-and-white-wireless-headphones-Zam8TvEgN5o)
sur Unsplash. La [licence Unsplash](https://unsplash.com/license) autorise l'usage commercial et
n'exige aucune attribution ; on la note quand même pour la traçabilité.

### Recette

La photo d'origine est un dégradé rose/orangé. Plutôt qu'une rotation de teinte (qui fait dériver le
dégradé vers le violet en passant par le rouge), on **écrase la teinte sur une constante** : le fond
devient un dégradé clair vers `--blue` `#4F6AFF`, et la luminance d'origine conserve le modelé du
produit.

```python
from PIL import Image
src = Image.open("Zam8TvEgN5o.jpg").convert("HSV")
h, s, v = src.split()
hero = Image.merge("HSV", (
    h.point(lambda x: 163),                             # 163/255 ≈ teinte de #4F6AFF
    s.point(lambda x: min(255, int(x * 1.25))),
    v,
)).convert("RGB")
hero.thumbnail((1600, 1600), Image.LANCZOS)
hero.save("airpods-max-hero.webp", "WEBP", quality=82, method=6)
```

Vérification : en bas du dégradé le fond ressort à `rgb(93, 120, 253)`, à comparer aux
`rgb(79, 106, 255)` du token `--blue`.

## Marques

Apple et AirPods Max sont des marques d'Apple Inc. Apple n'est ni organisateur ni sponsor de
l'opération, et ces visuels ne doivent jamais être présentés d'une façon qui le laisserait croire.
La mention est affichée dans le règlement de la page et verrouillée par un test.
