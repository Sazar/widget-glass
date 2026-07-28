# 🪟 Widget Glass — Alertes Twitch Style iOS Glass

Un widget d'alertes Twitch avec un effet **glassmorphism** inspiré d'Apple iOS, conçu pour StreamElements. Affiche les follows, subs, resubs, donations et raids avec un rendu élégant, animé et entièrement personnalisable.

---

## ✨ Aperçu

- Effet **glass** avec `backdrop-filter: blur()` et dégradés lumineux
- Animations **popIn**, particules flottantes, reflet animé
- Support des 5 types d'alertes Twitch
- Configuration 100% via le panneau **StreamElements Fields** (aucun code à modifier)

---

## 📁 Structure des fichiers

```
widget-glass/
├── structure.html   # Structure HTML du widget
├── style.css        # Styles glassmorphism + animations
├── script.js        # Logique des alertes + intégration StreamElements
└── field.json       # Champs de configuration StreamElements
```

---

## 🚀 Installation sur StreamElements

1. Aller dans **StreamElements → My Overlays → Add Widget → Custom Widget**
2. Copier-coller le contenu de chaque fichier dans l'onglet correspondant :
   - `structure.html` → onglet **HTML**
   - `style.css` → onglet **CSS**
   - `script.js` → onglet **JS**
   - `field.json` → onglet **Fields**
3. **Sauvegarder** et ajouter l'overlay à OBS/Streamlabs

---

## ⚙️ Options de configuration

| Champ | Type | Description | Valeur par défaut |
|---|---|---|---|
| `duration` | number | Durée d'affichage (ms) | 7000 |
| `widgetWidth` | number | Largeur du widget (px) | 660 |
| `borderRadius` | number | Arrondi des coins (px) | 28 |
| `blurIntensity` | number | Intensité du flou glass (px) | 28 |
| `glassOpacity` | slider | Opacité du fond glass | 0.45 |
| `primaryColor` | colorpicker | Couleur principale | `#00f5ff` (cyan) |
| `accentColor` | colorpicker | Couleur d'accent | `#ff2ec4` (rose) |
| `iconSize` | number | Taille des icônes (px) | 56 |
| `typeSize` | number | Taille du label type (px) | 15.5 |
| `usernameSize` | number | Taille du pseudo (px) | 49 |
| `messageSize` | number | Taille du message (px) | 23 |
| `amountSize` | number | Taille du montant (px) | 35 |
| `showParticles` | checkbox | Activer les particules | ✅ |
| `particleCount` | number | Nombre de particules | 55 |
| `showFollow` / `showSub` / ... | checkbox | Activer chaque type d'alerte | ✅ |
| `iconFollow` / `iconSub` / ... | text | Emoji par type d'alerte | ❤️ ⭐ 🔥 💎 ⚔️ |
| `textFollow` / `textSub` / ... | text | Label par type d'alerte | NOUVEAU FOLLOW... |

---

## 🧪 Test en prévisualisation

Dans la console du navigateur (F12) sur la page d'overlay StreamElements :

```js
// Tester un follow
testAlert('follow', 'NomDuTesteur');

// Tester une donation
testAlert('donation', 'NomDuTesteur');

// Types disponibles : follow | sub | resub | donation | raid
```

---

## 🐛 Bugs connus & corrections recommandées

### 1. `hexToRgba` plante si `primaryColor` n'est pas un hex valide
Si l'utilisateur entre une couleur CSS (ex: `rgb(...)` ou un nom), `parseInt(hex.slice(1,3), 16)` retourne `NaN`.  
**Fix :** Ajouter une validation avant le parsing.

### 2. File d'attente des alertes absente
Si deux alertes arrivent en même temps, la seconde efface la première immédiatement.  
**Fix :** Implémenter une `alertQueue` (tableau FIFO) pour jouer les alertes séquentiellement.

### 3. Pas d'animation de sortie
L'alerte disparaît brutalement avec `classList.remove('show')` (display: none).  
**Fix :** Ajouter une keyframe `popOut` avec `opacity: 0 + scale(0.9)` avant de masquer.

### 4. Particules non nettoyées si l'alerte est interrompue
Si une alerte est annulée avant la fin, les particules restent dans le DOM.  
**Fix :** Nettoyer `container.innerHTML` dans la logique de reset.

### 5. `duration` non converti en nombre
`fieldData.duration` peut être une string selon StreamElements. `setTimeout` avec une string fonctionne par coercition mais peut causer des bugs subtils.  
**Fix :** `parseInt(fieldData.duration, 10) || 7000`

---

## 💡 Améliorations possibles

- **File d'attente (queue)** : afficher les alertes une par une
- **Animation de sortie** : transition `popOut` au lieu d'un `display: none` brutal  
- **Sons par type d'alerte** : champ audio URL dans `field.json`
- **Thème clair / preset** : champ select avec des palettes prédéfinies (Neon, Gold, Minimal…)
- **Cheer / Bits** : support du listener `cheer-latest`
- **Avatar utilisateur** : afficher la photo de profil Twitch via l'API
- **Responsive position** : champs pour choisir la position (top-left, center, etc.)

---

## 🛠️ Technologies

- HTML5 / CSS3 (`backdrop-filter`, `@keyframes`, CSS Variables)
- JavaScript vanilla (ES6+)
- API StreamElements (`onWidgetLoad`, `onEventReceived`)
- Google Fonts : [Inter](https://fonts.google.com/specimen/Inter) + [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)

---

## 📄 Licence

MIT — libre d'utilisation, de modification et de distribution.
