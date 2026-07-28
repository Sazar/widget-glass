// ─── State ────────────────────────────────────────────────────────────────────
let fieldData = {};
let alertQueue = [];
let isPlaying = false;
let hideTimer = null;
let isLoading = true;
const seenEventIds = new Set();

// ─── DOM refs ──────────────────────────────────────────────────────────────────
const alertEl    = document.getElementById('alert');
const iconEl     = document.getElementById('icon');
const typeEl     = document.getElementById('type');
const usernameEl = document.getElementById('username');
const messageEl  = document.getElementById('message');
const amountEl   = document.getElementById('amount');
const progressEl = document.getElementById('progressBar');

// ─── StreamElements load ───────────────────────────────────────────────────────
window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  applySettings();
  setTimeout(() => { isLoading = false; }, 500);
});

// ─── Apply CSS variables from fields ──────────────────────────────────────────
function applySettings() {
  const root = document.documentElement;
  root.style.setProperty('--widget-width',      (fieldData.widgetWidth   || 660)  + 'px');
  root.style.setProperty('--border-radius',     (fieldData.borderRadius  || 28)   + 'px');
  root.style.setProperty('--blur-intensity',    (fieldData.blurIntensity || 28)   + 'px');
  root.style.setProperty('--glass-opacity',      fieldData.glassOpacity  || 0.45);
  root.style.setProperty('--primary-color',      fieldData.primaryColor  || '#00f5ff');
  root.style.setProperty('--accent-color',       fieldData.accentColor   || '#ff2ec4');
  root.style.setProperty('--icon-size',         (fieldData.iconSize      || 56)   + 'px');
  root.style.setProperty('--type-size',         (fieldData.typeSize      || 15.5) + 'px');
  root.style.setProperty('--type-color',         fieldData.typeColor     || fieldData.primaryColor || '#00f5ff');
  root.style.setProperty('--username-size',     (fieldData.usernameSize  || 49)   + 'px');
  root.style.setProperty('--username-color',     fieldData.usernameColor || '#ffffff');
  root.style.setProperty('--message-size',      (fieldData.messageSize   || 23)   + 'px');
  root.style.setProperty('--amount-size',       (fieldData.amountSize    || 35)   + 'px');
  root.style.setProperty('--glow-intensity',    (fieldData.glowIntensity || 20)   + 'px');
  root.style.setProperty('--duration',          (parseInt(fieldData.duration, 10) || 7000) + 'ms');
  root.style.setProperty('--anim-duration-in',  (parseInt(fieldData.animDurationIn,  10)   || 600)  + 'ms');
  root.style.setProperty('--anim-duration-out', (parseInt(fieldData.animDurationOut, 10)   || 500)  + 'ms');
  root.style.setProperty('--primary-color-soft', hexToRgba(fieldData.primaryColor || '#00f5ff', 0.25));
  root.style.setProperty('--accent-color-soft',  hexToRgba(fieldData.accentColor  || '#ff2ec4', 0.18));
  root.style.setProperty('--progress-color-1',   fieldData.progressBarColor1 || fieldData.primaryColor || '#00f5ff');
  root.style.setProperty('--progress-color-2',   fieldData.progressBarColor2 || fieldData.accentColor  || '#ff2ec4');
  applyPosition(fieldData.widgetPosition || 'center');
  // applyThemePreset EN DERNIER : ses couleurs écrasent typeColor/usernameColor si preset actif
  applyThemePreset(fieldData.themePreset || 'custom');
}

// ─── hexToRgba robuste ─────────────────────────────────────────────────────────
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

// ─── Position du widget ────────────────────────────────────────────────────────
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

// ─── Presets de thème ──────────────────────────────────────────────────────────
// Chaque preset définit primary, accent, typeColor ET usernameColor.
// Quand un preset est actif, ces 4 valeurs écrasent les colorpickers manuels.
// En mode 'custom', rien n'est écrasé : les colorpickers s'appliquent librement.
const THEME_PRESETS = {
  'neon-cyan':     { primary: '#00f5ff', accent: '#ff2ec4', typeColor: '#00f5ff', usernameColor: '#ffffff' },
  'gold':          { primary: '#ffd700', accent: '#ff8c00', typeColor: '#ffd700', usernameColor: '#fff8dc' },
  'purple-storm':  { primary: '#b44fff', accent: '#ff4fa3', typeColor: '#b44fff', usernameColor: '#f0e0ff' },
  'minimal-white': { primary: '#ffffff', accent: '#cccccc', typeColor: '#cccccc', usernameColor: '#ffffff' },
  'green-matrix':  { primary: '#00ff88', accent: '#00ccff', typeColor: '#00ff88', usernameColor: '#ccffe8' },
  'custom': null
};

function applyThemePreset(preset) {
  const theme = THEME_PRESETS[preset];
  // 'custom' ou preset inconnu → on ne touche à rien, les colorpickers restent actifs
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty('--primary-color',      theme.primary);
  root.style.setProperty('--accent-color',       theme.accent);
  root.style.setProperty('--primary-color-soft', hexToRgba(theme.primary, 0.25));
  root.style.setProperty('--accent-color-soft',  hexToRgba(theme.accent,  0.18));
  // Écrase typeColor et usernameColor des colorpickers manuels
  root.style.setProperty('--type-color',     theme.typeColor);
  root.style.setProperty('--username-color', theme.usernameColor);
}

// ─── Animations entrée / sortie ───────────────────────────────────────────────
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
    const size = (Math.random() * 5 + 3) + 'px';
    p.style.cssText = [
      'position:absolute',
      `width:${size}`,
      `height:${size}`,
      `background:${i % 3 === 0 ? (fieldData.accentColor || '#ff2ec4') : (fieldData.primaryColor || '#00f5ff')}`,
      'border-radius:50%',
      `left:${Math.random() * 100}%`,
      `bottom:${Math.random() * 80}%`,
      `opacity:${Math.random() * 0.65 + 0.35}`,
      `animation:floatParticle ${2.5 + Math.random() * 4}s linear forwards`
    ].join(';');
    container.appendChild(p);
  }
}

// ─── Sons ──────────────────────────────────────────────────────────────────────
function playSound(type) {
  const key = 'sound' + type.charAt(0).toUpperCase() + type.slice(1);
  const url = fieldData[key];
  if (!url || url.trim() === '') return;
  const audio = new Audio(url);
  audio.volume = Math.min(1, Math.max(0, parseFloat(fieldData.soundVolume) || 0.7));
  audio.play().catch(() => {});
}

// ─── Barre de progression ──────────────────────────────────────────────────────
function startProgressBar(duration) {
  if (!progressEl) return;
  if (!fieldData.showProgressBar) { progressEl.classList.remove('active'); return; }
  progressEl.classList.remove('active');
  void progressEl.offsetWidth;
  document.documentElement.style.setProperty('--duration', duration + 'ms');
  progressEl.classList.add('active');
}

// ─── Emotes Twitch dans le message ────────────────────────────────────────────
function renderEmotes(text, emotes) {
  if (!emotes || !emotes.length || !text) return null;
  const dict = {};
  emotes.forEach(e => {
    if (e.name && e.urls) dict[e.name] = e.urls['x2'] || e.urls['x1'] || Object.values(e.urls)[0];
  });
  if (!Object.keys(dict).length) return null;
  const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return safe.replace(/\b(\S+)\b/g, match =>
    dict[match]
      ? `<img src="${dict[match]}" alt="${match}" title="${match}" style="height:1.2em;vertical-align:middle;display:inline;" loading="lazy">`
      : match
  );
}

// ─── Résolution des templates de messages ─────────────────────────────────────
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
    follow:    { icon: fieldData.iconFollow    || '❤️',  text: fieldData.textFollow    || 'NOUVEAU FOLLOW'  },
    sub:       { icon: fieldData.iconSub       || '⭐',  text: fieldData.textSub       || 'NOUVELLE SUB'    },
    resub:     { icon: fieldData.iconResub     || '🔥', text: fieldData.textResub     || 'RESUBSCRIPTION'  },
    giftsub:   { icon: fieldData.iconGiftSub   || '🎁', text: fieldData.textGiftSub   || 'GIFT SUB'        },
    donation:  { icon: fieldData.iconDonation  || '💎', text: fieldData.textDonation  || 'DONATION'        },
    raid:      { icon: fieldData.iconRaid      || '⚔️',  text: fieldData.textRaid      || 'RAID INCOMING'   },
    cheer:     { icon: fieldData.iconCheer     || '🎉', text: fieldData.textCheer     || 'BITS'            },
    hypetrain: { icon: fieldData.iconHypeTrain || '🚂', text: fieldData.textHypeTrain || 'HYPE TRAIN 🔥'  }
  };

  const t = types[type] || types.follow;
  iconEl.textContent     = t.icon;
  typeEl.textContent     = t.text;
  usernameEl.textContent = username;
  amountEl.textContent   = amount || '';

  const templateKey = 'msg' + type.charAt(0).toUpperCase() + type.slice(1);
  const template    = fieldData[templateKey];

  const vars = {
    username:  username || '',
    amount:    amount   || '',
    message:   message  || '',
    months:    message  || '',
    count:     amount   || '',
    recipient: ''
  };

  if (type === 'giftsub' && message) {
    const recipientMatch = message.match(/à\s+(\S+)/);
    if (recipientMatch) vars.recipient = recipientMatch[1];
    vars.count = message.match(/(\d+)/)?.[1] || '1';
  }

  if (type === 'resub' && message) {
    vars.months = message.match(/(\d+)/)?.[1] || '';
  }

  if (template && template.trim() !== '') {
    messageEl.textContent = resolveTemplate(template, vars);
  } else {
    const emoteHtml = renderEmotes(message, emotes);
    if (emoteHtml !== null) messageEl.innerHTML  = emoteHtml;
    else                    messageEl.textContent = message || '';
  }

  alertEl.className = alertEl.className
    .split(' ')
    .filter(c => !c.startsWith('anim-in-') && !c.startsWith('anim-out-'))
    .join(' ');
  void alertEl.offsetWidth;

  alertEl.classList.add(getAnimInClass());
  createParticles();
  playSound(type);

  const duration = parseInt(fieldData.duration, 10) || 7000;
  startProgressBar(duration);

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (progressEl) progressEl.classList.remove('active');
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

// ─── API publique ──────────────────────────────────────────────────────────────
function showAlert(type, username, message = '', amount = '', emotes = []) {
  enqueueAlert(type, username, message, amount, emotes);
}

// ─── Détection gift sub ───────────────────────────────────────────────────────
function isGiftSub(data) {
  return !!(
    data.isCommunityGift ||
    data.gifted          ||
    data.isGift          ||
    data.sender          ||
    data.gifter
  );
}

// ─── StreamElements Events ────────────────────────────────────────────────────
window.addEventListener('onEventReceived', function (obj) {
  if (!obj.detail || !obj.detail.event) return;
  if (isLoading) return;

  const listener = obj.detail.listener;
  const data     = obj.detail.event;
  const emotes   = data.emotes || [];

  console.log('[widget-glass] event =>', listener, JSON.stringify(data).slice(0, 300));

  const eventId = `${listener}_${data.name}_${data._id || data.createdAt || Date.now()}`;
  if (seenEventIds.has(eventId)) return;
  seenEventIds.add(eventId);
  setTimeout(() => seenEventIds.delete(eventId), 10000);

  if (listener === 'follower-latest' && fieldData.showFollow) {
    showAlert('follow', data.name, data.message || '', '', emotes);
  }

  if (listener === 'subscriber-latest' && !isGiftSub(data)) {
    if (data.amount > 1 && fieldData.showResub) {
      showAlert('resub', data.name, `x${data.amount} mois`, `${data.amount}`, emotes);
    } else if (fieldData.showSub) {
      showAlert('sub', data.name, data.message || '', '', emotes);
    }
  }

  if (
    (listener === 'subscriber-gifted-latest' ||
     listener === 'community-gift-purchase-latest' ||
     (listener === 'subscriber-latest' && isGiftSub(data)))
    && fieldData.showGiftSub
  ) {
    const qty       = data.amount || data.quantity || data.count || 1;
    const recipient = data.recipientDisplayName || data.recipient || data.gifted || '';
    const gifter    = data.name || data.sender   || data.gifter  || 'Anonyme';
    const msg       = qty > 1
      ? `offre ${qty} subs !`
      : recipient ? `offre 1 sub à ${recipient} !` : 'offre un sub !';
    showAlert('giftsub', gifter, recipient, String(qty), []);
  }

  if (listener === 'tip-latest' && fieldData.showDonation) {
    showAlert('donation', data.name, data.message || '', data.amount + ' €', emotes);
  }

  if (listener === 'raid-latest' && fieldData.showRaid) {
    showAlert('raid', data.name, data.message || '', String(data.amount || ''), []);
  }

  if (listener === 'cheer-latest' && fieldData.showCheer) {
    showAlert('cheer', data.name, data.message || '', data.amount + ' bits', emotes);
  }

  if ((listener === 'hype-train-start' || listener === 'hype-train-end') && fieldData.showHypeTrain) {
    const level  = data.level || data.current || '';
    const suffix = listener === 'hype-train-end' ? 'TERMINÉ !' : `Niveau ${level}`;
    showAlert('hypetrain', 'HYPE TRAIN', suffix, String(level), []);
  }
});

// ─── Fonctions de test console ────────────────────────────────────────────────
window.testAlert = function(type = 'follow', name = 'TestUser') {
  const testData = {
    follow:    { msg: '',               amount: '' },
    sub:       { msg: 'Super stream !', amount: '' },
    resub:     { msg: 'x3 mois',        amount: '3' },
    giftsub:   { msg: 'DestUser',       amount: '5' },
    donation:  { msg: 'Merci !',        amount: '10 €' },
    raid:      { msg: '',               amount: '42' },
    cheer:     { msg: 'Hype !',         amount: '500 bits' },
    hypetrain: { msg: 'Niveau 2',       amount: '2' }
  };
  const d = testData[type] || testData.follow;
  showAlert(type, name, d.msg, d.amount);
};

window.testQueue = function() {
  ['follow', 'sub', 'giftsub', 'donation', 'raid', 'cheer', 'hypetrain'].forEach((t, i) => {
    setTimeout(() => window.testAlert(t, 'User_' + t), i * 200);
  });
};
