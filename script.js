// ─── State ───────────────────────────────────────────────────────────────────
let fieldData = {};
let alertQueue = [];
let isPlaying = false;
let hideTimer = null;

let isLoading = true;
const seenEventIds = new Set();

// ─── DOM refs ────────────────────────────────────────────────────────────────
const alertEl    = document.getElementById('alert');
const iconEl     = document.getElementById('icon');
const typeEl     = document.getElementById('type');
const usernameEl = document.getElementById('username');
const messageEl  = document.getElementById('message');
const amountEl   = document.getElementById('amount');
const progressEl = document.getElementById('progressBar');

// ─── StreamElements load ─────────────────────────────────────────────────────
window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  applySettings();
  setTimeout(() => { isLoading = false; }, 500);
});

// ─── Apply CSS variables from fields ─────────────────────────────────────────
function applySettings() {
  const root = document.documentElement;
  root.style.setProperty('--widget-width',       fieldData.widgetWidth   + 'px');
  root.style.setProperty('--border-radius',      fieldData.borderRadius  + 'px');
  root.style.setProperty('--blur-intensity',     fieldData.blurIntensity + 'px');
  root.style.setProperty('--glass-opacity',      fieldData.glassOpacity);
  root.style.setProperty('--primary-color',      fieldData.primaryColor);
  root.style.setProperty('--accent-color',       fieldData.accentColor);
  root.style.setProperty('--icon-size',          fieldData.iconSize      + 'px');
  root.style.setProperty('--type-size',          fieldData.typeSize      + 'px');
  root.style.setProperty('--username-size',      fieldData.usernameSize  + 'px');
  root.style.setProperty('--message-size',       fieldData.messageSize   + 'px');
  root.style.setProperty('--amount-size',        fieldData.amountSize    + 'px');
  root.style.setProperty('--glow-intensity',     (fieldData.glowIntensity || 20) + 'px');
  root.style.setProperty('--duration',           (parseInt(fieldData.duration, 10) || 7000) + 'ms');
  root.style.setProperty('--anim-duration-in',   (parseInt(fieldData.animDurationIn,  10) || 600)  + 'ms');
  root.style.setProperty('--anim-duration-out',  (parseInt(fieldData.animDurationOut, 10) || 500)  + 'ms');
  root.style.setProperty('--primary-color-soft', hexToRgba(fieldData.primaryColor, 0.25));
  root.style.setProperty('--accent-color-soft',  hexToRgba(fieldData.accentColor,  0.18));
  applyPosition(fieldData.widgetPosition || 'center');
  applyThemePreset(fieldData.themePreset || 'custom');
}

// ─── hexToRgba robuste ────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(0,245,255,${alpha})`;
  hex = hex.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex))
    hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(0,245,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Position du widget ───────────────────────────────────────────────────────
function applyPosition(pos) {
  const body = document.body;
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
  body.style.alignItems     = align;
  body.style.justifyContent = justify;
}

// ─── Presets de thème ─────────────────────────────────────────────────────────
const THEME_PRESETS = {
  'neon-cyan':     { primary: '#00f5ff', accent: '#ff2ec4' },
  'gold':          { primary: '#ffd700', accent: '#ff8c00' },
  'purple-storm':  { primary: '#b44fff', accent: '#ff4fa3' },
  'minimal-white': { primary: '#ffffff', accent: '#cccccc' },
  'green-matrix':  { primary: '#00ff88', accent: '#00ccff' },
  'custom': null
};

function applyThemePreset(preset) {
  const theme = THEME_PRESETS[preset];
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty('--primary-color',      theme.primary);
  root.style.setProperty('--accent-color',       theme.accent);
  root.style.setProperty('--primary-color-soft', hexToRgba(theme.primary, 0.25));
  root.style.setProperty('--accent-color-soft',  hexToRgba(theme.accent,  0.18));
}

// ─── Animations entrée / sortie ───────────────────────────────────────────────
// Les classes CSS sont définies dans style.css sous forme :
// .anim-in-popIn    { animation: popIn    var(--anim-duration-in)  ... }
// .anim-out-popOut  { animation: popOut   var(--anim-duration-out) ... }
function getAnimInClass()  { return 'anim-in-'  + (fieldData.animIn  || 'popIn');  }
function getAnimOutClass() { return 'anim-out-' + (fieldData.animOut || 'popOut'); }

// ─── Particules ───────────────────────────────────────────────────────────────
function createParticles() {
  const container = document.getElementById('particles');
  container.innerHTML = '';
  if (!fieldData.showParticles) return;
  const count = parseInt(fieldData.particleCount, 10) || 55;
  for (let i = 0; i < count; i++) {
    const p    = document.createElement('div');
    const size = Math.random() * 5 + 3 + 'px';
    p.style.cssText = [
      'position:absolute',
      `width:${size}`,
      `height:${size}`,
      `background:${i % 3 === 0 ? fieldData.accentColor : fieldData.primaryColor}`,
      'border-radius:50%',
      `left:${Math.random() * 100}%`,
      `bottom:${Math.random() * 80}%`,
      `opacity:${Math.random() * 0.65 + 0.35}`,
      `animation:floatParticle ${2.5 + Math.random() * 4}s linear forwards`
    ].join(';');
    container.appendChild(p);
  }
}

// ─── Sons ─────────────────────────────────────────────────────────────────────
function playSound(type) {
  const key = 'sound' + type.charAt(0).toUpperCase() + type.slice(1);
  const url = fieldData[key];
  if (!url || url.trim() === '') return;
  const audio = new Audio(url);
  audio.volume = Math.min(1, Math.max(0, parseFloat(fieldData.soundVolume) || 0.7));
  audio.play().catch(() => {});
}

// ─── Barre de progression ─────────────────────────────────────────────────────
function startProgressBar(duration) {
  if (!progressEl) return;
  if (!fieldData.showProgressBar) { progressEl.classList.remove('active'); return; }
  progressEl.classList.remove('active');
  void progressEl.offsetWidth;
  document.documentElement.style.setProperty('--duration', duration + 'ms');
  progressEl.classList.add('active');
}

// ─── Feature — Emotes Twitch dans le message ─────────────────────────────────
function renderEmotes(text, emotes) {
  if (!emotes || !emotes.length || !text) return null;
  const dict = {};
  emotes.forEach(e => {
    if (e.name && e.urls) dict[e.name] = e.urls['x2'] || e.urls['x1'] || Object.values(e.urls)[0];
  });
  if (!Object.keys(dict).length) return null;
  const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const html = safe.replace(/\b(\S+)\b/g, (match) => {
    if (dict[match]) {
      return `<img src="${dict[match]}" alt="${match}" title="${match}" style="height:1.2em;vertical-align:middle;display:inline;" loading="lazy">`;
    }
    return match;
  });
  return html;
}

// ─── File d'attente ───────────────────────────────────────────────────────────
function enqueueAlert(type, username, message, amount, emotes) {
  alertQueue.push({ type, username, message, amount, emotes: emotes || [] });
  if (!isPlaying) processQueue();
}

function processQueue() {
  if (alertQueue.length === 0) { isPlaying = false; return; }
  isPlaying = true;
  const item = alertQueue.shift();
  _playAlert(item.type, item.username, item.message, item.amount, item.emotes);
}

// ─── Lecture d'une alerte ─────────────────────────────────────────────────────
function _playAlert(type, username, message, amount, emotes) {
  const types = {
    follow:    { icon: fieldData.iconFollow    || '❤️', text: fieldData.textFollow    || 'NOUVEAU FOLLOW'  },
    sub:       { icon: fieldData.iconSub       || '⭐', text: fieldData.textSub       || 'NOUVELLE SUB'    },
    resub:     { icon: fieldData.iconResub     || '🔥', text: fieldData.textResub     || 'RESUBSCRIPTION'  },
    donation:  { icon: fieldData.iconDonation  || '💎', text: fieldData.textDonation  || 'DONATION'        },
    raid:      { icon: fieldData.iconRaid      || '⚔️', text: fieldData.textRaid      || 'RAID INCOMING'   },
    cheer:     { icon: fieldData.iconCheer     || '🎉', text: fieldData.textCheer     || 'BITS'            },
    hypetrain: { icon: fieldData.iconHypeTrain || '🚂', text: fieldData.textHypeTrain || 'HYPE TRAIN 🔥'  }
  };

  const t = types[type] || types.follow;
  iconEl.textContent     = t.icon;
  typeEl.textContent     = t.text;
  usernameEl.textContent = username;
  amountEl.textContent   = amount || '';

  const emoteHtml = renderEmotes(message, emotes);
  if (emoteHtml !== null) {
    messageEl.innerHTML = emoteHtml;
  } else {
    messageEl.textContent = message || '';
  }

  // Retirer toutes les classes d'animation précédentes
  alertEl.className = alertEl.className
    .split(' ')
    .filter(c => !c.startsWith('anim-in-') && !c.startsWith('anim-out-') && c !== 'show' && c !== 'hide')
    .join(' ');
  void alertEl.offsetWidth;

  // Appliquer l'animation d'entrée
  alertEl.classList.add(getAnimInClass());
  createParticles();
  playSound(type);

  const duration = parseInt(fieldData.duration, 10) || 7000;
  startProgressBar(duration);

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    progressEl && progressEl.classList.remove('active');

    // Retirer l'animation d'entrée, appliquer celle de sortie
    alertEl.classList.remove(getAnimInClass());
    void alertEl.offsetWidth;
    alertEl.classList.add(getAnimOutClass());

    function onHideEnd() {
      alertEl.removeEventListener('animationend', onHideEnd);
      alertEl.classList.remove(getAnimOutClass());
      processQueue();
    }
    alertEl.addEventListener('animationend', onHideEnd);
  }, duration);
}

// ─── API publique ─────────────────────────────────────────────────────────────
function showAlert(type, username, message = '', amount = '', emotes = []) {
  enqueueAlert(type, username, message, amount, emotes);
}

// ─── StreamElements Events ────────────────────────────────────────────────────
window.addEventListener('onEventReceived', function (obj) {
  if (!obj.detail || !obj.detail.event) return;
  if (isLoading) return;

  const listener = obj.detail.listener;
  const data     = obj.detail.event;
  const emotes   = data.emotes || [];

  const eventId = `${listener}_${data.name}_${data._id || data.createdAt || Date.now()}`;
  if (seenEventIds.has(eventId)) return;
  seenEventIds.add(eventId);
  setTimeout(() => seenEventIds.delete(eventId), 10000);

  if (listener === 'follower-latest' && fieldData.showFollow) {
    showAlert('follow', data.name, data.message || '', '', emotes);
  }

  if (listener === 'subscriber-latest') {
    if (data.amount > 1 && fieldData.showResub) {
      showAlert('resub', data.name, `x${data.amount} mois`, '', emotes);
    } else if (fieldData.showSub) {
      showAlert('sub', data.name, data.message || '', '', emotes);
    }
  }

  if (listener === 'tip-latest' && fieldData.showDonation) {
    showAlert('donation', data.name, data.message || '', data.amount + ' €', emotes);
  }

  if (listener === 'raid-latest' && fieldData.showRaid) {
    showAlert('raid', data.name, `avec ${data.amount} viewers !`, '', []);
  }

  if (listener === 'cheer-latest' && fieldData.showCheer) {
    showAlert('cheer', data.name, data.message || '', data.amount + ' bits', emotes);
  }

  if ((listener === 'hype-train-start' || listener === 'hype-train-end') && fieldData.showHypeTrain) {
    const level  = data.level || data.current || '';
    const suffix = listener === 'hype-train-end' ? 'TERMINÉ !' : `Niveau ${level}`;
    showAlert('hypetrain', 'HYPE TRAIN', suffix, '', []);
  }
});

// ─── Fonctions de test console ────────────────────────────────────────────────
window.testAlert = function(type = 'follow', name = 'TestUser') {
  showAlert(type, name, 'Message de test', type === 'donation' ? '25 €' : type === 'cheer' ? '500 bits' : '');
};

window.testQueue = function() {
  ['follow', 'sub', 'donation', 'raid', 'cheer', 'hypetrain'].forEach((t, i) => {
    setTimeout(() => showAlert(t, 'User_' + t, 'Test queue', t === 'donation' ? '10 €' : ''), i * 200);
  });
};
