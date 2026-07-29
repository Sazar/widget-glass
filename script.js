// ─── State ───────────────────────────────────────────────────────────────────
let fieldData = {};
let alertQueue = [];
let isPlaying = false;
let hideTimer = null;
let _fallbackTimer = null;
let isLoading = true;
let _hideEndListener = null;

const seenEventIds = new Set();
const SEEN_MAX = 200;

// ─── Map type → clés fieldData ───────────────────────────────────────────────
const TYPE_FIELD_KEYS = {
  follow:    { template: 'msgFollow',    sound: 'soundFollow'    },
  sub:       { template: 'msgSub',       sound: 'soundSub'       },
  resub:     { template: 'msgResub',     sound: 'soundResub'     },
  giftsub:   { template: 'msgGiftSub',   sound: 'soundGiftSub'   },
  donation:  { template: 'msgDonation',  sound: 'soundDonation'  },
  raid:      { template: 'msgRaid',      sound: 'soundRaid'      },
  cheer:     { template: 'msgCheer',     sound: 'soundCheer'     },
  hypetrain: { template: 'msgHypeTrain', sound: 'soundHypeTrain' }
};

// ─── Map type → icône + label ─────────────────────────────────────────────────
const ALERT_TYPES_META = {
  follow:    { iconKey: 'iconFollow',    textKey: 'textFollow',    iconDefault: '❤️', textDefault: 'NOUVEAU FOLLOW'   },
  sub:       { iconKey: 'iconSub',       textKey: 'textSub',       iconDefault: '⭐',  textDefault: 'NOUVELLE SUB'     },
  resub:     { iconKey: 'iconResub',     textKey: 'textResub',     iconDefault: '🔥', textDefault: 'RESUBSCRIPTION'   },
  giftsub:   { iconKey: 'iconGiftSub',   textKey: 'textGiftSub',   iconDefault: '🎁', textDefault: 'GIFT SUB'         },
  donation:  { iconKey: 'iconDonation',  textKey: 'textDonation',  iconDefault: '💎', textDefault: 'DONATION'         },
  raid:      { iconKey: 'iconRaid',      textKey: 'textRaid',      iconDefault: '⚔️', textDefault: 'RAID INCOMING'    },
  cheer:     { iconKey: 'iconCheer',     textKey: 'textCheer',     iconDefault: '🎉', textDefault: 'BITS'             },
  hypetrain: { iconKey: 'iconHypeTrain', textKey: 'textHypeTrain', iconDefault: '🚂', textDefault: 'HYPE TRAIN 🔥'   }
};

// ─── Types prioritaires ───────────────────────────────────────────────────────
const HIGH_PRIORITY_TYPES = new Set(['raid', 'hypetrain']);

// ─── Types qui déclenchent confetti burst ────────────────────────────────────
const CONFETTI_TYPES = new Set(['sub', 'resub', 'giftsub', 'donation', 'raid', 'hypetrain']);

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const alertEl          = document.getElementById('alert');
const iconEl           = document.getElementById('icon');
const typeEl           = document.getElementById('type');
const usernameEl       = document.getElementById('username');
const templateMsgEl    = document.getElementById('templateMsg');
const messageEl        = document.getElementById('message');
const progressEl       = document.getElementById('progressBar');
const particlesEl      = document.getElementById('particles');
const scanlineEl       = document.getElementById('scanlines');
const confettiEl       = document.getElementById('confetti');
const pulseRingsEl     = document.getElementById('pulseRings');
const shockwaveEl      = document.getElementById('shockwave');

// ─── Template msg ─────────────────────────────────────────────────────────────
function setTemplateMsg(text) {
  if (!templateMsgEl) return;
  templateMsgEl.textContent = text || '';
}

// ─── Bulle message viewer ─────────────────────────────────────────────────────
function showBubble(html, isHtml) {
  if (!messageEl) return;
  if (messageEl._hideListener) {
    messageEl.removeEventListener('animationend', messageEl._hideListener);
    messageEl._hideListener = null;
  }
  messageEl.classList.remove('hiding');
  if (isHtml) messageEl.innerHTML   = html;
  else        messageEl.textContent = html;
  messageEl.classList.add('visible');
}

function hideBubble() {
  if (!messageEl) return;
  if (!messageEl.classList.contains('visible')) return;
  if (messageEl._hideListener) {
    messageEl.removeEventListener('animationend', messageEl._hideListener);
    messageEl._hideListener = null;
  }
  messageEl.classList.add('hiding');
  messageEl._hideListener = function onBubbleHideEnd() {
    messageEl.classList.remove('visible', 'hiding');
    messageEl.textContent = '';
    messageEl.innerHTML   = '';
    messageEl._hideListener = null;
  };
  messageEl.addEventListener('animationend', messageEl._hideListener, { once: true });
}

// ─── onWidgetLoad ─────────────────────────────────────────────────────────────
window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  applySettings();
  setTimeout(() => {
    isLoading = false;
    const urlParams   = new URLSearchParams(window.location.search);
    const previewType = urlParams.get('preview');
    if (previewType && ALERT_TYPES_META[previewType]) {
      const previewData = {
        follow:    { msg: '',                         amount: ''     },
        sub:       { msg: 'Super stream !',           amount: ''     },
        resub:     { msg: 'Fidèle depuis le début !', amount: '6'    },
        giftsub:   { msg: 'DestUser',                 amount: '5'    },
        donation:  { msg: 'Continue comme ça !',      amount: '10 €' },
        raid:      { msg: '',                         amount: '87'   },
        cheer:     { msg: 'HYPE !',                   amount: '1000' },
        hypetrain: { msg: 'Niveau 3',                 amount: '3'    }
      };
      const d = previewData[previewType] || previewData.follow;
      showAlert(previewType, 'PreviewUser', d.msg, d.amount);
    }
  }, 500);
});

window.addEventListener('onSessionUpdate', function (obj) {
  if (obj && obj.detail && obj.detail.session && obj.detail.session.fieldData) {
    fieldData = { ...fieldData, ...obj.detail.session.fieldData };
    applySettings();
  }
});

// ─── applySettings ────────────────────────────────────────────────────────────
function applySettings() {
  const root = document.documentElement;
  root.style.setProperty('--widget-width',      (fieldData.widgetWidth   || 660)  + 'px');
  root.style.setProperty('--border-radius',     (fieldData.borderRadius  || 28)   + 'px');
  root.style.setProperty('--blur-intensity',    (fieldData.blurIntensity || 0)    + 'px');
  const opacity = parseFloat(fieldData.glassOpacity) || 0.45;
  root.style.setProperty('--glass-bg', `rgba(20,20,35,${opacity})`);
  root.style.setProperty('--primary-color',      fieldData.primaryColor  || '#00f5ff');
  root.style.setProperty('--icon-size',         (fieldData.iconSize      || 56)   + 'px');
  root.style.setProperty('--type-size',         (fieldData.typeSize      || 15.5) + 'px');
  root.style.setProperty('--type-color',         fieldData.typeColor     || fieldData.primaryColor || '#00f5ff');
  root.style.setProperty('--username-size',     (fieldData.usernameSize  || 49)   + 'px');
  root.style.setProperty('--username-color',     fieldData.usernameColor || '#ffffff');

  // Dérive --primary-rgb pour les effets CSS qui ont besoin de rgba()
  const primaryRgb = hexToRgbComponents(fieldData.primaryColor || '#00f5ff');
  root.style.setProperty('--primary-rgb', primaryRgb);

  const glowEnabled = parseBool(fieldData.enableGlow !== undefined ? fieldData.enableGlow : true);
  const glowValue   = glowEnabled ? (parseInt(fieldData.glowIntensity, 10) || 20) : 0;
  root.style.setProperty('--glow-intensity', glowValue + 'px');

  const glowBgEnabled = parseBool(fieldData.enableGlowBg !== undefined ? fieldData.enableGlowBg : true);
  if (glowBgEnabled) {
    root.style.setProperty('--primary-color-soft', hexToRgba(fieldData.primaryColor || '#00f5ff', 0.25));
    root.style.setProperty('--accent-color-soft',  'rgba(255,0,204,0.18)');
  } else {
    root.style.setProperty('--primary-color-soft', 'transparent');
    root.style.setProperty('--accent-color-soft',  'transparent');
  }

  const dur = Math.min(60000, Math.max(1000, parseInt(fieldData.duration, 10) || 7000));
  root.style.setProperty('--duration',           dur + 'ms');
  root.style.setProperty('--anim-duration-in',  (parseInt(fieldData.animDurationIn,  10) || 600)  + 'ms');
  root.style.setProperty('--anim-duration-out', (parseInt(fieldData.animDurationOut, 10) || 500)  + 'ms');
  root.style.setProperty('--progress-color-1',   fieldData.progressBarColor1 || fieldData.primaryColor || '#00f5ff');
  root.style.setProperty('--progress-color-2',   fieldData.progressBarColor2 || fieldData.primaryColor || '#00f5ff');
  applyPosition(fieldData.widgetPosition || 'center');
  applyThemePreset(fieldData.themePreset || 'custom', glowBgEnabled);
}

// ─── Utilitaires couleur ──────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(0,245,255,${alpha})`;
  hex = hex.trim();
  const rgbMatch = hex.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${alpha})`;
  if (/^#[0-9a-fA-F]{3}$/.test(hex))
    hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(0,245,255,${alpha})`;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Retourne "r,g,b" pour usage dans var(--primary-rgb) dans CSS
function hexToRgbComponents(hex) {
  if (!hex || typeof hex !== 'string') return '0,245,255';
  hex = hex.trim();
  const m = hex.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return `${m[1]},${m[2]},${m[3]}`;
  if (/^#[0-9a-fA-F]{3}$/.test(hex))
    hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '0,245,255';
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

// ─── Position ─────────────────────────────────────────────────────────────────
function applyPosition(pos) {
  const map = {
    'top-left':      ['flex-start', 'flex-start'],
    'top-center':    ['flex-start', 'center'],
    'top-right':     ['flex-start', 'flex-end'],
    'center':        ['center',     'center'],
    'bottom-left':   ['flex-end',   'flex-start'],
    'bottom-center': ['flex-end',   'center'],
    'bottom-right':  ['flex-end',   'flex-end']
  };
  const [align, justify] = map[pos] || ['center', 'center'];
  document.body.style.alignItems     = align;
  document.body.style.justifyContent = justify;
}

// ─── Presets de thème ─────────────────────────────────────────────────────────
const THEME_PRESETS = {
  'neon-cyan':     { primary: '#00f5ff', typeColor: '#00f5ff', usernameColor: '#ffffff' },
  'gold':          { primary: '#ffd700', typeColor: '#ffd700', usernameColor: '#fff8dc' },
  'purple-storm':  { primary: '#b44fff', typeColor: '#b44fff', usernameColor: '#f0e0ff' },
  'minimal-white': { primary: '#ffffff', typeColor: '#cccccc', usernameColor: '#ffffff' },
  'green-matrix':  { primary: '#00ff88', typeColor: '#00ff88', usernameColor: '#ccffe8' },
  'custom': null
};

function applyThemePreset(preset, glowBgEnabled) {
  const theme = THEME_PRESETS[preset];
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty('--primary-color', theme.primary);
  root.style.setProperty('--primary-rgb', hexToRgbComponents(theme.primary));
  if (glowBgEnabled !== false)
    root.style.setProperty('--primary-color-soft', hexToRgba(theme.primary, 0.25));
  root.style.setProperty('--type-color',     theme.typeColor);
  root.style.setProperty('--username-color', theme.usernameColor);
}

// ─── Animations entrée / sortie ───────────────────────────────────────────────
function getAnimInClass()  { return 'anim-in-'  + (fieldData.animIn  || 'popIn');  }
function getAnimOutClass() { return 'anim-out-' + (fieldData.animOut || 'popOut'); }

// ══════════════════════════════════════════════════════════════════════════════
// EFFETS VISUELS
// ══════════════════════════════════════════════════════════════════════════════

// ─── Effet 1 : Particules ─────────────────────────────────────────────────────
const PARTICLE_COLORS = {
  follow:    ['#ff6b8a', '#ff2ec4'],
  sub:       ['#ffd700', '#ffaa00'],
  resub:     ['#ff6600', '#ff2200'],
  giftsub:   ['#00ff88', '#00f5ff'],
  donation:  ['#00f5ff', '#b44fff'],
  raid:      ['#ff4444', '#ff8800'],
  cheer:     ['#9B59B6', '#00f5ff'],
  hypetrain: ['#ffd700', '#ff6600']
};

function createParticles(alertType) {
  particlesEl.innerHTML = '';
  if (!parseBool(fieldData.showParticles)) return;
  const count  = parseInt(fieldData.particleCount, 10) || 55;
  const colors = PARTICLE_COLORS[alertType] || [fieldData.primaryColor || '#00f5ff', fieldData.primaryColor || '#00f5ff'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const size    = (Math.random() * 5 + 3) + 'px';
    const travelY = 200 + Math.floor(Math.random() * 160);
    const delay   = (Math.random() * 2).toFixed(2) + 's';
    const opacity = (Math.random() * 0.65 + 0.35).toFixed(2);
    p.style.cssText = [
      'position:absolute',
      `width:${size}`, `height:${size}`,
      `background:${i % 2 === 0 ? colors[0] : colors[1]}`,
      'border-radius:50%',
      `left:${Math.random() * 100}%`,
      `bottom:${Math.random() * 80}%`,
      `--particle-opacity:${opacity}`,
      `--travel-y:-${travelY}px`,
      `animation:floatParticle ${2.5 + Math.random() * 4}s ${delay} linear infinite`
    ].join(';');
    particlesEl.appendChild(p);
  }
}

// ─── Effet 2 : Shockwave ──────────────────────────────────────────────────────
// 3 ondes concentriques lancées en décalé à l'entrée de l'alerte
function triggerShockwave() {
  if (!shockwaveEl || !parseBool(fieldData.showShockwave !== undefined ? fieldData.showShockwave : true)) return;

  // Crée 3 anneaux indépendants dans le conteneur shockwave
  shockwaveEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    ring.style.cssText = [
      'position:absolute',
      'top:50%', 'left:50%',
      'width:60px', 'height:60px',
      'border-radius:50%',
      `border:${3 - i}px solid var(--primary-color, #00f5ff)`,
      `box-shadow:0 0 ${8 + i * 4}px var(--primary-color, #00f5ff)`,
      'transform:translate(-50%,-50%) scale(0)',
      'opacity:0',
      `animation:kf-shockwave 0.75s var(--ease-out-expo) ${i * 0.15}s forwards`
    ].join(';');
    shockwaveEl.appendChild(ring);
  }
  // Nettoyage auto après la dernière onde
  setTimeout(() => { if (shockwaveEl) shockwaveEl.innerHTML = ''; }, 1200);
}

// ─── Effet 3 : Scanlines ──────────────────────────────────────────────────────
// Lignes CRT + sweep lumineux qui balaient le widget à l'entrée
function triggerScanlines() {
  if (!scanlineEl || !parseBool(fieldData.showScanlines !== undefined ? fieldData.showScanlines : true)) return;
  scanlineEl.classList.remove('active');
  void scanlineEl.offsetWidth;
  scanlineEl.classList.add('active');
  setTimeout(() => scanlineEl.classList.remove('active'), 2000);
}

// ─── Effet 4 : Confetti burst ─────────────────────────────────────────────────
// Confettis multi-formes tombant depuis le haut — uniquement pour events importants
const CONFETTI_SHAPES = ['■', '▲', '●', '◆', '★'];
const CONFETTI_PALETTES = {
  sub:       ['#ffd700','#ffaa00','#fff','#ffe066'],
  resub:     ['#ff6600','#ff2200','#ffcc00','#fff'],
  giftsub:   ['#00ff88','#00f5ff','#fff','#b44fff'],
  donation:  ['#00f5ff','#b44fff','#ff2ec4','#fff'],
  raid:      ['#ff4444','#ff8800','#ffd700','#fff'],
  hypetrain: ['#ffd700','#ff6600','#ff2ec4','#fff','#00f5ff']
};

function createConfetti(alertType) {
  confettiEl.innerHTML = '';
  if (!CONFETTI_TYPES.has(alertType)) return;
  if (!parseBool(fieldData.showConfetti !== undefined ? fieldData.showConfetti : true)) return;

  const palette = CONFETTI_PALETTES[alertType] || ['#ffd700','#fff','#00f5ff'];
  const count   = parseInt(fieldData.confettiCount, 10) || 40;

  for (let i = 0; i < count; i++) {
    const el    = document.createElement('span');
    const color = palette[Math.floor(Math.random() * palette.length)];
    const shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
    const size  = (Math.random() * 10 + 8) + 'px';
    const startX = Math.random() * 100;
    const drift  = (Math.random() - 0.5) * 80;
    const rotStart = Math.floor(Math.random() * 360);
    const rotEnd   = rotStart + (Math.random() > 0.5 ? 1 : -1) * (180 + Math.floor(Math.random() * 360));
    const delay  = (Math.random() * 0.6).toFixed(2);
    const dur    = (0.9 + Math.random() * 0.8).toFixed(2);
    const endY   = 80 + Math.floor(Math.random() * 60);

    el.textContent = shape;
    el.style.cssText = [
      'position:absolute',
      `left:${startX}%`,
      'top:0',
      `font-size:${size}`,
      `color:${color}`,
      'line-height:1',
      'display:block',
      `--cf-start-y:-${Math.floor(Math.random() * 20 + 5)}px`,
      `--cf-end-y:${endY}%`,
      `--cf-drift:${drift}px`,
      `--cf-rot-start:${rotStart}deg`,
      `--cf-rot-end:${rotEnd}deg`,
      `animation:kf-confetti-fall ${dur}s ${delay}s ease-in forwards`
    ].join(';');
    confettiEl.appendChild(el);
  }
  // Nettoyage
  setTimeout(() => { if (confettiEl) confettiEl.innerHTML = ''; }, 2500);
}

// ─── Effet 5 : Pulse rings ────────────────────────────────────────────────────
// Anneaux qui irradient depuis la position de l'icône
function triggerPulseRings(alertType) {
  if (!pulseRingsEl || !parseBool(fieldData.showPulseRings !== undefined ? fieldData.showPulseRings : true)) return;

  pulseRingsEl.innerHTML = '';
  const colors = PARTICLE_COLORS[alertType] || [fieldData.primaryColor || '#00f5ff'];
  const ringCount = 3;

  for (let i = 0; i < ringCount; i++) {
    const ring = document.createElement('div');
    const color = colors[i % colors.length];
    const maxOpacity = (0.7 - i * 0.15).toFixed(2);
    const scale = 3.5 + i * 1.2;
    const delay = i * 0.18;
    const size  = 50 + parseInt(fieldData.iconSize, 10) || 106;
    ring.style.cssText = [
      'position:absolute',
      `width:${size}px`, `height:${size}px`,
      `border:2px solid ${color}`,
      `box-shadow:0 0 10px ${color}`,
      'border-radius:50%',
      `--ring-max-opacity:${maxOpacity}`,
      `--ring-scale:${scale}`,
      `animation:kf-pulse-ring ${0.8 + i * 0.1}s ${delay}s var(--ease-out-expo) forwards`
    ].join(';');
    pulseRingsEl.appendChild(ring);
  }
  setTimeout(() => { if (pulseRingsEl) pulseRingsEl.innerHTML = ''; }, 1400);
}

// ─── Stoppe tous les effets ───────────────────────────────────────────────────
function stopAllEffects() {
  if (particlesEl)  particlesEl.innerHTML  = '';
  if (confettiEl)   confettiEl.innerHTML   = '';
  if (pulseRingsEl) pulseRingsEl.innerHTML = '';
  if (shockwaveEl)  shockwaveEl.innerHTML  = '';
  if (scanlineEl)   scanlineEl.classList.remove('active');
}

// ─── Sons ─────────────────────────────────────────────────────────────────────
function playSound(type) {
  const keys = TYPE_FIELD_KEYS[type];
  const url  = keys ? fieldData[keys.sound] : '';
  if (!url || url.trim() === '') return;
  const audio  = new Audio(url);
  const rawVol = parseFloat(fieldData.soundVolume);
  audio.volume = Number.isFinite(rawVol)
    ? Math.min(1, Math.max(0, rawVol > 1 ? rawVol / 100 : rawVol))
    : 0.7;
  audio.play().catch(err =>
    console.warn(`[widget-glass] Son "${type}" inaccessible (${url}):`, err.message)
  );
}

// ─── Barre de progression ─────────────────────────────────────────────────────
function startProgressBar(duration) {
  if (!progressEl) return;
  if (!parseBool(fieldData.showProgressBar)) { progressEl.classList.remove('active'); return; }
  progressEl.style.display = 'block';
  progressEl.classList.remove('active');
  void progressEl.offsetWidth;
  document.documentElement.style.setProperty('--duration', duration + 'ms');
  progressEl.classList.add('active');
}

function stopProgressBar() {
  if (!progressEl) return;
  progressEl.classList.remove('active');
  progressEl.style.display = 'none';
}

// ─── Emotes ───────────────────────────────────────────────────────────────────
function renderEmotes(text, emotes) {
  if (!emotes || !emotes.length || !text) return null;
  const dict = {};
  emotes.forEach(e => {
    if (e.name && e.urls) dict[e.name] = e.urls['x2'] || e.urls['x1'] || Object.values(e.urls)[0];
  });
  if (!Object.keys(dict).length) return null;
  const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return safe.replace(/\b(\S+)\b/g, match => {
    if (!dict[match]) return match;
    const n = match.replace(/"/g, '&quot;').replace(/>/g, '&gt;');
    return `<img src="${dict[match]}" alt="${n}" title="${n}" style="height:1.2em;vertical-align:middle;display:inline;" loading="lazy">`;
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────
function resolveTemplate(template, vars) {
  if (!template) return '';
  return template
    .replace(/\{username\}/gi,  vars.username  || '')
    .replace(/\{amount\}/gi,    vars.amount    || '')
    .replace(/\{message\}/gi,   vars.message   || '')
    .replace(/\{months\}/gi,    vars.months    || '')
    .replace(/\{count\}/gi,     vars.count     || '')
    .replace(/\{recipient\}/gi, vars.recipient || '');
}

// ─── parseBool ────────────────────────────────────────────────────────────────
function parseBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    return v !== 'false' && v !== '0' && v !== '';
  }
  return !!val;
}

const VIEWER_MSG_TYPES = ['sub', 'resub', 'donation', 'cheer'];

// ─── File d'attente avec priorité ─────────────────────────────────────────────
function enqueueAlert(type, username, message, amount, emotes) {
  const item = { type, username, message, amount, emotes: emotes || [] };
  if (HIGH_PRIORITY_TYPES.has(type)) {
    const insertAt = alertQueue.findIndex(i => !HIGH_PRIORITY_TYPES.has(i.type));
    if (insertAt === -1) alertQueue.push(item);
    else alertQueue.splice(insertAt, 0, item);
  } else {
    alertQueue.push(item);
  }
  if (!isPlaying) processQueue();
}

function processQueue() {
  if (alertQueue.length === 0) { isPlaying = false; return; }
  isPlaying = true;
  const item = alertQueue.shift();
  _playAlert(item.type, item.username, item.message, item.amount, item.emotes || []);
}

// ─── Scale icône ──────────────────────────────────────────────────────────────
// Règle : icône à scale(1.15) dès l'entrée, reset APRÈS disparition complète
function setIconScale(scale) {
  if (iconEl) iconEl.style.transform = `scale(${scale})`;
}
function resetIconScale() {
  if (iconEl) iconEl.style.transform = '';
}

// ─── Lecture d'une alerte ─────────────────────────────────────────────────────
function _playAlert(type, username, message, amount, emotes) {
  setTemplateMsg('');
  if (messageEl) {
    if (messageEl._hideListener) {
      messageEl.removeEventListener('animationend', messageEl._hideListener);
      messageEl._hideListener = null;
    }
    messageEl.classList.remove('visible', 'hiding');
    messageEl.textContent = '';
    messageEl.innerHTML   = '';
  }

  const meta = ALERT_TYPES_META[type] || ALERT_TYPES_META.follow;
  iconEl.textContent     = fieldData[meta.iconKey] || meta.iconDefault;
  typeEl.textContent     = fieldData[meta.textKey] || meta.textDefault;
  usernameEl.textContent = username;
  usernameEl.title       = username || '';

  const keys     = TYPE_FIELD_KEYS[type] || {};
  const template = fieldData[keys.template] || '';

  const showViewerMsg = VIEWER_MSG_TYPES.includes(type) && parseBool(fieldData.showViewerMessage);
  const viewerMessage = (message || '').trim();

  const vars = {
    username:  username     || '',
    amount:    amount       || '',
    message:   type === 'giftsub' ? '' : viewerMessage,
    months:    type === 'resub'   ? (amount || '') : '',
    count:     amount       || '',
    recipient: type === 'giftsub' ? viewerMessage : ''
  };

  if (template.trim() !== '') {
    const tpl      = template.replace(/\{username\}\s*/gi, '').trim();
    const resolved = resolveTemplate(tpl, vars).trim();
    if (resolved) setTemplateMsg(resolved);
  }

  if (showViewerMsg && viewerMessage && type !== 'giftsub') {
    const emoteHtml = renderEmotes(viewerMessage, emotes);
    if (emoteHtml !== null) showBubble(emoteHtml, true);
    else                    showBubble(viewerMessage, false);
  }

  // Nettoie les classes d'animation précédentes
  alertEl.className = alertEl.className
    .split(' ')
    .filter(c => !c.startsWith('anim-in-') && !c.startsWith('anim-out-'))
    .join(' ');
  void alertEl.offsetWidth;

  // Icône agrandie — restera jusqu'à disparition complète
  setIconScale(1.15);
  alertEl.classList.add(getAnimInClass());

  // ── Lance tous les effets visuels ──────────────────────────────────────────
  createParticles(type);
  triggerShockwave();
  triggerScanlines();
  createConfetti(type);
  // Pulse rings lancés avec un léger décalage pour apparaître après le shockwave
  setTimeout(() => triggerPulseRings(type), 80);

  playSound(type);

  const duration = Math.min(60000, Math.max(1000, parseInt(fieldData.duration, 10) || 7000));
  startProgressBar(duration);

  if (_hideEndListener) {
    alertEl.removeEventListener('animationend', _hideEndListener);
    _hideEndListener = null;
  }
  if (hideTimer)      clearTimeout(hideTimer);
  if (_fallbackTimer) clearTimeout(_fallbackTimer);

  hideTimer = setTimeout(() => {
    hideBubble();
    stopProgressBar();
    stopAllEffects();

    // Icône reste à scale(1.15) — pas de reset ici
    alertEl.classList.remove(getAnimInClass());
    void alertEl.offsetWidth;
    alertEl.classList.add(getAnimOutClass());

    const animOutDur = parseInt(fieldData.animDurationOut, 10) || 500;

    _fallbackTimer = setTimeout(() => {
      if (_hideEndListener) {
        alertEl.removeEventListener('animationend', _hideEndListener);
        _hideEndListener = null;
        alertEl.classList.remove(getAnimOutClass());
        resetIconScale();
        processQueue();
      }
    }, animOutDur + 200);

    _hideEndListener = function onHideEnd() {
      clearTimeout(_fallbackTimer);
      _fallbackTimer   = null;
      _hideEndListener = null;
      alertEl.classList.remove(getAnimOutClass());
      resetIconScale();
      processQueue();
    };
    alertEl.addEventListener('animationend', _hideEndListener, { once: true });
  }, duration);
}

// ─── API publique ─────────────────────────────────────────────────────────────
function showAlert(type, username, message, amount, emotes) {
  enqueueAlert(type, username, message || '', amount || '', emotes || []);
}

// ─── Détection gift sub ───────────────────────────────────────────────────────
function isGiftSub(data) {
  return !!(data.isCommunityGift || data.gifted || data.isGift || data.sender || data.gifter);
}

// ─── StreamElements Events ────────────────────────────────────────────────────
window.addEventListener('onEventReceived', function (obj) {
  if (!obj.detail || !obj.detail.event) return;
  if (isLoading) return;

  const listener = obj.detail.listener;
  const data     = obj.detail.event;
  const emotes   = data.emotes || [];

  console.log('[widget-glass] event =>', listener, JSON.stringify(data).slice(0, 300));

  const eventId = `${listener}_${data.name}_${data._id || data.createdAt || data.amount || ''}`;
  if (seenEventIds.has(eventId)) return;
  if (seenEventIds.size >= SEEN_MAX)
    seenEventIds.delete(seenEventIds.values().next().value);
  seenEventIds.add(eventId);
  setTimeout(() => seenEventIds.delete(eventId), 10000);

  if (listener === 'follower-latest' && parseBool(fieldData.showFollow))
    showAlert('follow', data.name, data.message || '', '', emotes);

  if (listener === 'subscriber-latest' && !isGiftSub(data)) {
    if (data.amount > 1 && parseBool(fieldData.showResub))
      showAlert('resub', data.name, data.message || '', `${data.amount}`, emotes);
    else if (parseBool(fieldData.showSub))
      showAlert('sub', data.name, data.message || '', '', emotes);
  }

  if (
    (listener === 'subscriber-gifted-latest' ||
     listener === 'community-gift-purchase-latest' ||
     (listener === 'subscriber-latest' && isGiftSub(data)))
    && parseBool(fieldData.showGiftSub)
  ) {
    const qty       = data.amount || data.quantity || data.count || 1;
    const giftedStr = typeof data.gifted === 'string' ? data.gifted : '';
    const recipient = data.recipientDisplayName || data.recipient || giftedStr || '';
    const gifter    = data.name || data.sender || data.gifter || 'Anonyme';
    showAlert('giftsub', gifter, recipient, String(qty), []);
  }

  if (listener === 'tip-latest' && parseBool(fieldData.showDonation)) {
    const currency = data.currency || fieldData.donationCurrency || '€';
    showAlert('donation', data.name, data.message || '', `${data.amount} ${currency}`, emotes);
  }

  if (listener === 'raid-latest' && parseBool(fieldData.showRaid))
    showAlert('raid', data.name, data.message || '', String(data.amount || ''), []);

  if (listener === 'cheer-latest' && parseBool(fieldData.showCheer))
    showAlert('cheer', data.name, data.message || '', String(data.amount || ''), emotes);

  if ((listener === 'hype-train-start' || listener === 'hype-train-end') && parseBool(fieldData.showHypeTrain)) {
    const level  = data.level || data.current || '';
    const suffix = listener === 'hype-train-end' ? 'TERMINÉ !' : `Niveau ${level}`;
    showAlert('hypetrain', 'HYPE TRAIN', suffix, String(level), []);
  }
});

// ─── Fonctions de test console ────────────────────────────────────────────────
window.testAlert = function(type = 'follow', name = 'TestUser') {
  const testData = {
    follow:    { msg: '',                         amount: ''     },
    sub:       { msg: 'Super stream !',           amount: ''     },
    resub:     { msg: 'Fidèle depuis le début !', amount: '3'    },
    giftsub:   { msg: 'DestUser',                 amount: '5'    },
    donation:  { msg: 'Merci !',                  amount: '10 €' },
    raid:      { msg: '',                         amount: '42'   },
    cheer:     { msg: 'Hype !',                   amount: '500'  },
    hypetrain: { msg: 'Niveau 2',                 amount: '2'    }
  };
  const d = testData[type] || testData.follow;
  showAlert(type, name, d.msg, d.amount);
};

window.testQueue = function() {
  ['follow', 'sub', 'giftsub', 'donation', 'raid', 'cheer', 'hypetrain'].forEach((t, i) => {
    setTimeout(() => window.testAlert(t, 'User_' + t), i * 200);
  });
};

window.skipAlert = function() {
  if (!isPlaying) return;
  if (hideTimer)      { clearTimeout(hideTimer);      hideTimer      = null; }
  if (_fallbackTimer) { clearTimeout(_fallbackTimer); _fallbackTimer = null; }
  if (_hideEndListener) {
    alertEl.removeEventListener('animationend', _hideEndListener);
    _hideEndListener = null;
  }
  hideBubble();
  stopProgressBar();
  stopAllEffects();
  alertEl.className = alertEl.className
    .split(' ')
    .filter(c => !c.startsWith('anim-in-') && !c.startsWith('anim-out-'))
    .join(' ');
  resetIconScale();
  isPlaying = false;
  processQueue();
  console.log('[widget-glass] Alerte sautée.');
};

window.clearQueue = function() {
  alertQueue.length = 0;
  console.log('[widget-glass] File vidée.');
};
