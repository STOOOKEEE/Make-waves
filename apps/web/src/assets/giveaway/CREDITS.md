# Visuels de la page tombola

Les deux images viennent d'**Unsplash**. La [licence Unsplash](https://unsplash.com/license)
autorise l'usage commercial et n'exige aucune attribution ; on la note quand même ici pour que la
provenance reste traçable et que les assets soient reproductibles.

| Fichier | Source | Traitement |
|---|---|---|
| `airpods-max-hero.webp` | https://unsplash.com/photos/pink-and-white-wireless-headphones-Zam8TvEgN5o | Teinte rabattue sur le bleu de marque, saturation ×1,25, 1600 px, WebP q82 |
| `airpods-max-prize.webp` | https://unsplash.com/photos/a-pair-of-headphones-on-a-white-surface-r2uugFQvAZ0 | Redimensionnement seul, 1200 px, WebP q82 |

## Recette du héros

La photo d'origine est un dégradé rose/orangé. Plutôt qu'une rotation de teinte (qui fait dériver le
dégradé vers le violet en passant par le rouge), on **écrase la teinte sur une constante** : le fond
devient un dégradé clair → `--blue` `#4F6AFF`, et la luminance d'origine conserve le modelé du
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
