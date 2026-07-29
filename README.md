# 🪟 Widget Glass — Alertes Twitch Style Glassmorphism

Un widget d'alertes Twitch premium avec effet **glassmorphism** inspiré d'Apple iOS, conçu pour **StreamElements**. Affiche 8 types d'événements Twitch (follows, subs, resubs, gift subs, donations, raids, cheers, hype train) avec des animations fluides, des particules et une personnalisation complète via le panneau Fields.

---

## ✨ Fonctionnalités

- Effet **glass** avec `backdrop-filter: blur()`, dégradés lumineux et reflet animé
- **8 types d'alertes** : Follow · Sub · Resub · Gift Sub · Donation · Raid · Cheer · Hype Train
- **5 thèmes prédéfinis** : Neon Cyan · Gold · Purple Storm · Minimal White · Green Matrix + mode Custom
- **File d'attente intelligente** avec priorité (Raid / Hype Train passent devant)
- **Animations d'entrée/sortie** au choix : Pop In, Slide Down, Slide Up, Fade, Bounce, Flip, Zoom, Shake, Roll
- **Particules flottantes** colorées par type d'alerte
- **Barre de progression** avec couleurs personnalisables
- **Messages viewer** avec rendu des emotes Twitch (images inline)
- **Templates de message** par type avec variables `{username}`, `{amount}`, `{months}`, `{message}`, `{recipient}`
- **Sons** par type d'alerte (URL mp3/ogg/wav)
- **7 positions** configurables (top-left, top-center, top-right, center, bottom-left, bottom-center, bottom-right)
- **Anti-doublon** : chaque événement SE est dédupliqué sur 30 secondes
- Configuration **100% via le panneau Fields** — aucun code à modifier

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
3. **Sauvegarder** puis ajouter l'overlay à OBS / Streamlabs OBS

> **Note OBS** : `backdrop-filter: blur()` nécessite OBS 27+ (Chromium 103+). La propriété `color-mix()` requiert OBS 29+ (Chromium 111+). Sur une version antérieure, l'effet glass reste visible mais le fond sera uni.

---

## ⚙️ Référence complète des champs

### 🎨 Apparence générale

| Champ | Type | Description | Défaut |
|---|---|---|---|
| `themePreset` | select | Thème prédéfini (`neon-cyan`, `gold`, `purple-storm`, `minimal-white`, `green-matrix`, `custom`) | `neon-cyan` |
| `primaryColor` | colorpicker | Couleur principale (glow, icône, barre) | `#00f5ff` |
| `widgetWidth` | number | Largeur du widget (px) | `660` |
| `borderRadius` | number | Arrondi des coins (px) | `28` |
| `blurIntensity` | number | Intensité du flou glass (px) | `0` |
| `glassOpacity` | slider | Opacité du fond glass (0–1) | `0.45` |
| `widgetPosition` | select | Position dans l'overlay | `center` |

### 💡 Effets lumineux

| Champ | Type | Description | Défaut |
|---|---|---|---|
| `enableGlow` | checkbox | Activer le glow sur l'icône | ✅ |
| `glowIntensity` | number | Intensité du glow (px) | `20` |
| `enableGlowBg` | checkbox | Activer le halo de fond | ✅ |

### 🔡 Typographie

| Champ | Type | Description | Défaut |
|---|---|---|---|
| `typeSize` | number | Taille du label type (px) | `15.5` |
| `typeColor` | colorpicker | Couleur du label type | `#00f5ff` |
| `usernameSize` | number | Taille du pseudo (px) | `49` |
| `usernameColor` | colorpicker | Couleur du pseudo | `#ffffff` |
| `iconSize` | number | Taille de l'icône (px) | `56` |

### ⏱️ Timing & Animations

| Champ | Type | Description | Défaut |
|---|---|---|---|
| `duration` | number | Durée d'affichage (ms) | `7000` |
| `animIn` | select | Animation d'entrée | `popIn` |
| `animOut` | select | Animation de sortie | `popOut` |
| `animDurationIn` | number | Durée animation entrée (ms) | `600` |
| `animDurationOut` | number | Durée animation sortie (ms) | `500` |

### 🌟 Particules

| Champ | Type | Description | Défaut |
|---|---|---|---|
| `showParticles` | checkbox | Activer les particules | ✅ |
| `particleCount` | number | Nombre de particules | `55` |

### 📊 Barre de progression

| Champ | Type | Description | Défaut |
|---|---|---|---|
| `showProgressBar` | checkbox | Afficher la barre de progression | ✅ |
| `progressBarColor1` | colorpicker | Couleur de départ du dégradé | `#00f5ff` |
| `progressBarColor2` | colorpicker | Couleur de fin du dégradé | `#00f5ff` |

### 🔔 Activation par type d'alerte

| Champ | Description |
|---|---|
| `showFollow` | Activer les alertes de follow |
| `showSub` | Activer les nouvelles subscriptions |
| `showResub` | Activer les resubscriptions |
| `showGiftSub` | Activer les gift subs |
| `showDonation` | Activer les donations (tips) |
| `showRaid` | Activer les raids |
| `showCheer` | Activer les cheers (bits) |
| `showHypeTrain` | Activer le Hype Train |

### 🎭 Icônes & Labels par type

Chaque type dispose d'un emoji et d'un label personnalisable :

| Type | Icône (champ) | Label (champ) | Défaut icône | Défaut label |
|---|---|---|---|---|
| Follow | `iconFollow` | `textFollow` | ❤️ | NOUVEAU FOLLOW |
| Sub | `iconSub` | `textSub` | ⭐ | NOUVELLE SUB |
| Resub | `iconResub` | `textResub` | 🔥 | RESUBSCRIPTION |
| Gift Sub | `iconGiftSub` | `textGiftSub` | 🎁 | GIFT SUB |
| Donation | `iconDonation` | `textDonation` | 💎 | DONATION |
| Raid | `iconRaid` | `textRaid` | ⚔️ | RAID INCOMING |
| Cheer | `iconCheer` | `textCheer` | 🎉 | BITS |
| Hype Train | `iconHypeTrain` | `textHypeTrain` | 🚂 | HYPE TRAIN 🔥 |

### 💬 Messages & Templates

| Champ | Description |
|---|---|
| `showSubMessage` | Afficher le message du viewer pour les subs |
| `showResubMessage` | Afficher le message du viewer pour les resubs |
| `showDonationMessage` | Afficher le message du viewer pour les donations |
| `showCheerMessage` | Afficher le message du viewer pour les cheers |
| `msgFollow` | Template de message follow |
| `msgSub` | Template de message sub |
| `msgResub` | Template de message resub |
| `msgGiftSub` | Template de message gift sub |
| `msgDonation` | Template de message donation |
| `msgRaid` | Template de message raid |
| `msgCheer` | Template de message cheer |
| `msgHypeTrain` | Template de message hype train |

**Variables disponibles dans les templates :**

| Variable | Description |
|---|---|
| `{username}` | Pseudo du viewer |
| `{amount}` | Montant (€, bits, nombre de raiders…) |
| `{months}` | Nombre de mois (resub) |
| `{message}` | Message écrit par le viewer |
| `{recipient}` | Destinataire (gift sub) |
| `{count}` | Nombre de gifts |

**Exemple :** `{username} est fidèle depuis {months} mois ! 🔥`

### 🔊 Sons par type d'alerte

| Champ | Description |
|---|---|
| `soundFollow` | URL du son de follow (mp3/ogg/wav) |
| `soundSub` | URL du son de sub |
| `soundResub` | URL du son de resub |
| `soundGiftSub` | URL du son de gift sub |
| `soundDonation` | URL du son de donation |
| `soundRaid` | URL du son de raid |
| `soundCheer` | URL du son de cheer |
| `soundHypeTrain` | URL du son de hype train |
| `soundVolumeFollow` | Volume du son follow (0–1) |
| `soundVolumeSub` | Volume du son sub (0–1) |
| *(idem pour chaque type)* | |

### 💱 Divers

| Champ | Description | Défaut |
|---|---|---|
| `donationCurrency` | Symbole de devise pour les donations | `€` |
| `debugMode` | Activer les logs console (F12) | ❌ |

---

## 🧪 Tester le widget

### Via l'URL de prévisualisation

Ajouter `?preview=<type>` à l'URL StreamElements :

```
https://streamelements.com/overlay/XXXX/YYYY?preview=follow
https://streamelements.com/overlay/XXXX/YYYY?preview=sub
https://streamelements.com/overlay/XXXX/YYYY?preview=donation
```

Types disponibles : `follow` · `sub` · `resub` · `giftsub` · `donation` · `raid` · `cheer` · `hypetrain`

### Via la console navigateur (F12)

```js
// Tester un type précis
testAlert('follow', 'NomDuViewer');
testAlert('donation', 'NomDuViewer');
testAlert('raid', 'NomDuClan');

// Tester toute la queue d'un coup
testQueue();

// Sauter l'alerte en cours
skipAlert();

// Vider la file d'attente
clearQueue();
```

---

## 🛠️ Technologies

- HTML5 / CSS3 (`backdrop-filter`, `@keyframes`, CSS Custom Properties, `color-mix()`)
- JavaScript vanilla ES6+ (`'use strict'`, `Set`, `CustomEvent`, `Audio API`)
- API StreamElements (`onWidgetLoad`, `onSessionUpdate`, `onEventReceived`)
- Google Fonts : [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) + [Orbitron](https://fonts.google.com/specimen/Orbitron)

---

## 📄 Licence

Usage personnel et commercial autorisé. Redistribution et revente interdites.
