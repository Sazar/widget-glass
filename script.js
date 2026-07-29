// ─── State ────────────────────────────────────────────────────────────────────────────────────────
let fieldData = {};
let alertQueue = [];
let isPlaying = false;
let hideTimer = null;
let _fallbackTimer = null;
let isLoading = true;
let _hideEndListener = null;

// Set borné (max 200 entrées) pour éviter la fuite mémoire sur stream long
const seenEventIds = new Set();
const SEEN_MAX = 200;

// ─── Map statique type → clés fieldData ───────────────────────────────────────────────────────────────────
// Évite les bugs de casse dynamique (ex: 'giftsub' → 'msgGiftsub' au lieu de 'msgGiftSub')
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

// ─── DOM refs ────────────────────────────────────────────────────────────────────────────────────
const alertEl    = document.getElementById('alert');
const iconEl     = document.getElementById('icon');
const typeEl     = document.getElementById('type');
const usernameEl = document.getElementById('username');
const messageEl  = document.getElementById('message');
const progressEl = document.getElementById('progressBar');

// ─── StreamElements load ───────────────────────────────────────────────────────────────────────
window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  applySettings();
  setTimeout(() => { isLoading = false; }, 500);
});

// ─── Apply CSS variables from fields ──────────────────────────────────────────────────────
function applySettings() {
  const root = document.documentElement;
  root.style.setProperty('--widget-width',      (fieldData.widgetWidth   || 660)  + 'px');
  root.style.setProperty('--border-radius',     (fieldData.borderRadius  || 28)   + 'px');
  root.style.setProperty('--blur-intensity',    (fieldData.blurIntensity || 28)   + 'px');
  const opacity = parseFloat(fieldData.glassOpacity) || 0.45;
  root.style.setProperty('--glass-bg', `rgba(20,20,35,${opacity})`);
  root.style.setProperty('--primary-color',      fieldData.primaryColor  || '#00f5ff');
  root.style.setProperty('--icon-size',         (fieldData.iconSize      || 56)   + 'px');
  root.style.setProperty('--type-size',         (fieldData.typeSize      || 15.5) + 'px');
  root.style.setProperty('--type-color',         fieldData.typeColor     || fieldData.primaryColor || '#00f5ff');
  root.style.setProperty('--username-size',     (fieldData.usernameSize  || 49)   + 'px');
  root.style.setProperty('--username-color',     fieldData.usernameColor || '#ffffff');
  root.style.setProperty('--glow-intensity',    (fieldData.glowIntensity || 20)   + 'px');
  const dur = Math.min(60000, Math.max(1000, parseInt(fieldData.duration, 10) || 7000));
  root.style.setProperty('--duration', dur + 'ms');
  root.style.setProperty('--anim-duration-in',  (parseInt(fieldData.animDurationIn,  10) || 600)  + 'ms');
  root.style.setProperty('--anim-duration-out', (parseInt(fieldData.animDurationOut, 10) || 500)  + 'ms');
  root.style.setProperty('--primary-color-soft', hexToRgba(fieldData.primaryColor || '#00f5ff', 0.25));
  root.style.setProperty('--progress-color-1',   fieldData.progressBarColor1 || fieldData.primaryColor || '#00f5ff');
  root.style.setProperty('--progress-color-2',   fieldData.progressBarColor2 || fieldData.primaryColor || '#00f5ff');
  applyPosition(fieldData.widgetPosition || 'center');
  applyThemePreset(fieldData.themePreset || 'custom');
}

// ─── hexToRgba robuste ──────────────────────────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(0,245,255,${alpha})`;
  hex = hex.trim();
  const rgbMatch = hex.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${alpha})`;
  if (/^#[0-9a-fA-F]{3}$/.test(hex))
    hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(0,245,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Position du widget ───────────────────────────────────────────────────────────────────────────────────
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

// ─── Presets de thème ─────────────────────────────────────────────────────────────────────────────────────
const THEME_PRESETS = {
  'neon-cyan':     { primary: '#00f5ff', typeColor: '#00f5ff', usernameColor: '#ffffff' },
  'gold':          { primary: '#ffd700', typeColor: '#ffd700', usernameColor: '#fff8dc' },
  'purple-storm':  { primary: '#b44fff', typeColor: '#b44fff', usernameColor: '#f0e0ff' },
  'minimal-white': { primary: '#ffffff', typeColor: '#cccccc', usernameColor: '#ffffff' },
  'green-matrix':  { primary: '#00ff88', typeColor: '#00ff88', usernameColor: '#ccffe8' },
  'custom': null
};

function applyThemePreset(preset) {
  const theme = THEME_PRESETS[preset];
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty('--primary-color',      theme.primary);
  root.style.setProperty('--primary-color-soft', hexToRgba(theme.primary, 0.25));
  root.style.setProperty('--type-color',     theme.typeColor);
  root.style.setProperty('--username-color', theme.usernameColor);
}

// ─── Animations entrée / sortie ──────────────────────────────────────────────────────────────────────────────────
function getAnimInClass()  { return 'anim-in-'  + (fieldData.animIn  || 'popIn');  }
function getAnimOutClass() { return 'anim-out-' + (fieldData.animOut || 'popOut'); }

// ─── Couleur de particule selon le type d'alerte ────────────────────────────────────────────────
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

// ─── Particules ────────────────────────────────────────────────────────────────────────────────────────────
function createParticles(alertType) {
  const container = document.getElementById('particles');
  container.innerHTML = '';
  if (!fieldData.showParticles) return;
  const count  = parseInt(fieldData.particleCount, 10) || 55;
  const colors = PARTICLE_COLORS[alertType] || [fieldData.primaryColor || '#00f5ff', fieldData.primaryColor || '#00f5ff'];
  for (let i = 0; i < count; i++) {
    const p    = document.createElement('div');
    const size = (Math.random() * 5 + 3) + 'px';
    const travelY = 200 + Math.floor(Math.random() * 160);
    p.style.cssText = [
      'position:absolute',
      `width:${size}`,
      `height:${size}`,
      `background:${i % 2 === 0 ? colors[0] : colors[1]}`,
      'border-radius:50%',
      `left:${Math.random() * 100}%`,
      `bottom:${Math.random() * 80}%`,
      `opacity:${Math.random() * 0.65 + 0.35}`,
      `--travel-y:-${travelY}px`,
      `animation:floatParticle ${2.5 + Math.random() * 4}s linear forwards`
    ].join(';');
    container.appendChild(p);
  }
}

// ─── Sons ──────────────────────────────────────────────────────────────────────────────────────────────────
function playSound(type) {
  const keys = TYPE_FIELD_KEYS[type];
  const url  = keys ? fieldData[keys.sound] : '';
  if (!url || url.trim() === '') return;
  const audio = new Audio(url);
  audio.volume = Math.min(1, Math.max(0, parseFloat(fieldData.soundVolume) || 0.7));
  audio.play().catch(err => {
    console.warn(`[widget-glass] Son "${type}" inaccessible (${url}):`, err.message);
  });
}

// ─── Barre de progression ───────────────────────────────────────────────────────────────────────────
function startProgressBar(duration) {
  if (!progressEl) return;
  if (!fieldData.showProgressBar) { progressEl.classList.remove('active'); return; }
  progressEl.style.display = 'block';
  progressEl.classList.remove('active');
  void progressEl.offsetWidth;
  document.documentElement.style.setProperty('--duration', duration + 'ms');
  progressEl.classList.add('active');
}

// ─── Emotes Twitch dans le message ─────────────────────────────────────────────────────────────────────
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

// ─── Résolution des templates de messages ───────────────────────────────────────────────────────────────────
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

// ─── Masquage conditionnel du message viewer ────────────────────────────────────────────────────────────
function shouldShowViewerMessage(type) {
  const concerned = ['sub', 'resub', 'donation', 'cheer'];
  if (concerned.includes(type)) return fieldData.showViewerMessage !== false;
  return true;
}

// ─── File d'attente ─────────────────────────────────────────────────────────────────────────────────────────────────
function enqueueAlert(type, username, message, amount, emotes) {
  alertQueue.push({ type, username, message, amount, emotes: emotes || [] });
  if (!isPlaying) processQueue();
}

function processQueue() {
  if (alertQueue.length === 0) { isPlaying = false; return; }
  isPlaying = true;
  const item = alertQueue.shift();
  _playAlert(item.type, item.username, item.message, item.amount, item.emotes || []);
}

// ─── Lecture d'une alerte ──────────────────────────────────────────────────────────────────────────────────────────
function _playAlert(type, username, message, amount, emotes) {
  messageEl.textContent   = '';
  messageEl.innerHTML     = '';
  messageEl.style.display = '';

  const types = {
    follow:    { icon: fieldData.iconFollow    || '\u2764\ufe0f',  text: fieldData.textFollow    || 'NOUVEAU FOLLOW'  },
    sub:       { icon: fieldData.iconSub       || '\u2b50',        text: fieldData.textSub       || 'NOUVELLE SUB'    },
    resub:     { icon: fieldData.iconResub     || '\ud83d\udd25',  text: fieldData.textResub     || 'RESUBSCRIPTION'  },
    giftsub:   { icon: fieldData.iconGiftSub   || '\ud83c\udf81',  text: fieldData.textGiftSub   || 'GIFT SUB'        },
    donation:  { icon: fieldData.iconDonation  || '\ud83d\udc8e',  text: fieldData.textDonation  || 'DONATION'        },
    raid:      { icon: fieldData.iconRaid      || '\u2694\ufe0f',  text: fieldData.textRaid      || 'RAID INCOMING'   },
    cheer:     { icon: fieldData.iconCheer     || '\ud83c\udf89',  text: fieldData.textCheer     || 'BITS'            },
    hypetrain: { icon: fieldData.iconHypeTrain || '\ud83d\ude82',  text: fieldData.textHypeTrain || 'HYPE TRAIN \ud83d\udd25' }
  };

  const t = types[type] || types.follow;
  iconEl.textContent     = t.icon;
  typeEl.textContent     = t.text;
  usernameEl.textContent = username;
  usernameEl.title       = username || '';

  const keys        = TYPE_FIELD_KEYS[type] || {};
  const template    = fieldData[keys.template] || '';
  const hasTemplate = template.trim() !== '';

  const vars = {
    username:  username || '',
    amount:    amount   || '',
    message:   type === 'giftsub' ? '' : (message || ''),
    months:    type === 'resub'   ? (amount || '') : '',
    count:     amount   || '',
    recipient: type === 'giftsub' ? (message || '') : ''
  };

  if (hasTemplate) {
    const resolved = resolveTemplate(template, vars);
    if (resolved.trim()) {
      messageEl.textContent = resolved;
    } else {
      messageEl.style.display = 'none';
    }
  } else if (type === 'giftsub') {
    const recipient = message || '';
    if (recipient) {
      messageEl.textContent = recipient;
    } else {
      messageEl.style.display = 'none';
    }
  } else if (shouldShowViewerMessage(type)) {
    const emoteHtml = renderEmotes(message, emotes);
    if (emoteHtml !== null) messageEl.innerHTML  = emoteHtml;
    else                    messageEl.textContent = message || '';
    if (!messageEl.textContent.trim() && !messageEl.querySelector('img')) {
      messageEl.style.display = 'none';
    }
  } else {
    messageEl.style.display = 'none';
  }

  alertEl.className = alertEl.className
    .split(' ')
    .filter(c => !c.startsWith('anim-in-') && !c.startsWith('anim-out-'))
    .join(' ');
  void alertEl.offsetWidth;

  alertEl.classList.add(getAnimInClass());
  createParticles(type);
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
    if (progressEl) progressEl.classList.remove('active');
    alertEl.classList.remove(getAnimInClass());
    void alertEl.offsetWidth;
    alertEl.classList.add(getAnimOutClass());

    const animOutDur = parseInt(fieldData.animDurationOut, 10) || 500;

    _fallbackTimer = setTimeout(() => {
      if (_hideEndListener) {
        alertEl.removeEventListener('animationend', _hideEndListener);
        _hideEndListener = null;
      }
      alertEl.classList.remove(getAnimOutClass());
      processQueue();
    }, animOutDur + 200);

    _hideEndListener = function onHideEnd() {
      clearTimeout(_fallbackTimer);
      _fallbackTimer = null;
      _hideEndListener = null;
      alertEl.classList.remove(getAnimOutClass());
      processQueue();
    };
    alertEl.addEventListener('animationend', _hideEndListener, { once: true });
  }, duration);
}

// ─── API publique ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function showAlert(type, username, message, amount, emotes) {
  enqueueAlert(type, username, message || '', amount || '', emotes || []);
}

// ─── Détection gift sub ──────────────────────────────────────────────────────────────────────────────────────────────
function isGiftSub(data) {
  return !!(
    data.isCommunityGift ||
    data.gifted          ||
    data.isGift          ||
    data.sender          ||
    data.gifter
  );
}

// ─── StreamElements Events ───────────────────────────────────────────────────────────────────────────────────
window.addEventListener('onEventReceived', function (obj) {
  if (!obj.detail || !obj.detail.event) return;
  if (isLoading) return;

  const listener = obj.detail.listener;
  const data     = obj.detail.event;
  const emotes   = data.emotes || [];

  console.log('[widget-glass] event =>', listener, JSON.stringify(data).slice(0, 300));

  const eventId = `${listener}_${data.name}_${data._id || data.createdAt || Date.now()}`;
  if (seenEventIds.has(eventId)) return;

  if (seenEventIds.size >= SEEN_MAX) {
    const oldest = seenEventIds.values().next().value;
    seenEventIds.delete(oldest);
  }
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
    const giftedStr = typeof data.gifted === 'string' ? data.gifted : '';
    const recipient = data.recipientDisplayName || data.recipient || giftedStr || '';
    const gifter    = data.name || data.sender   || data.gifter  || 'Anonyme';
    showAlert('giftsub', gifter, recipient, String(qty), []);
  }

  if (listener === 'tip-latest' && fieldData.showDonation) {
    showAlert('donation', data.name, data.message || '', data.amount + ' €', emotes);
  }

  if (listener === 'raid-latest' && fieldData.showRaid) {
    showAlert('raid', data.name, data.message || '', String(data.amount || ''), []);
  }

  if (listener === 'cheer-latest' && fieldData.showCheer) {
    // amount = le nombre brut (ex: 500) — le mot "bits" est dans le template : {username} envoie {amount} bits !
    // Ne pas concaténer ' bits' ici sinon doublon avec le template
    showAlert('cheer', data.name, data.message || '', String(data.amount || ''), emotes);
  }

  if ((listener === 'hype-train-start' || listener === 'hype-train-end') && fieldData.showHypeTrain) {
    const level  = data.level || data.current || '';
    const suffix = listener === 'hype-train-end' ? 'TERMINÉ !' : `Niveau ${level}`;
    showAlert('hypetrain', 'HYPE TRAIN', suffix, String(level), []);
  }
});

// ─── Fonctions de test console ────────────────────────────────────────────────────────────────────────────────────────
window.testAlert = function(type = 'follow', name = 'TestUser') {
  const testData = {
    follow:    { msg: '',                         amount: '' },
    sub:       { msg: 'Super stream !',           amount: '' },
    resub:     { msg: 'Fidèle depuis le début !', amount: '3' },
    giftsub:   { msg: 'DestUser',                 amount: '5' },
    donation:  { msg: 'Merci !',                  amount: '10 €' },
    raid:      { msg: '',                         amount: '42' },
    cheer:     { msg: 'Hype !',                   amount: '500' },
    hypetrain: { msg: 'Niveau 2',                 amount: '2' }
  };
  const d = testData[type] || testData.follow;
  showAlert(type, name, d.msg, d.amount);
};

window.testQueue = function() {
  ['follow', 'sub', 'giftsub', 'donation', 'raid', 'cheer', 'hypetrain'].forEach((t, i) => {
    setTimeout(() => window.testAlert(t, 'User_' + t), i * 200);
  });
};
