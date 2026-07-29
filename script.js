// ─── State ───────────────────────────────────────────────────────────────────────────────────────
let fieldData = {};
let alertQueue = [];
let isPlaying = false;
let hideTimer = null;
let _fallbackTimer = null;
let isLoading = true;
let _hideEndListener = null;

const seenEventIds = new Set();
const SEEN_MAX = 200;

// ─── Map statique type → clés fieldData ─────────────────────────────────────────────────────────
const TYPE_FIELD_KEYS = {
  follow:    { template: 'msgFollow',    sound: 'soundFollow',    volume: 'soundVolumeFollow'    },
  sub:       { template: 'msgSub',       sound: 'soundSub',       volume: 'soundVolumeSub'       },
  resub:     { template: 'msgResub',     sound: 'soundResub',     volume: 'soundVolumeResub'     },
  giftsub:   { template: 'msgGiftSub',   sound: 'soundGiftSub',   volume: 'soundVolumeGiftSub'   },
  donation:  { template: 'msgDonation',  sound: 'soundDonation',  volume: 'soundVolumeDonation'  },
  raid:      { template: 'msgRaid',      sound: 'soundRaid',      volume: 'soundVolumeRaid'      },
  cheer:     { template: 'msgCheer',     sound: 'soundCheer',     volume: 'soundVolumeCheer'     },
  hypetrain: { template: 'msgHypeTrain', sound: 'soundHypeTrain', volume: 'soundVolumeHypeTrain' }
};

// ─── Map statique type → icône + label ──────────────────────────────────────────────────────────
const ALERT_TYPES_META = {
  follow:    { iconKey: 'iconFollow',    textKey: 'textFollow',    iconDefault: '❤️', textDefault: 'NOUVEAU FOLLOW'      },
  sub:       { iconKey: 'iconSub',       textKey: 'textSub',       iconDefault: '⭐',  textDefault: 'NOUVELLE SUB'        },
  resub:     { iconKey: 'iconResub',     textKey: 'textResub',     iconDefault: '🔥', textDefault: 'RESUBSCRIPTION'      },
  giftsub:   { iconKey: 'iconGiftSub',   textKey: 'textGiftSub',   iconDefault: '🎁', textDefault: 'GIFT SUB'            },
  donation:  { iconKey: 'iconDonation',  textKey: 'textDonation',  iconDefault: '💎', textDefault: 'DONATION'            },
  raid:      { iconKey: 'iconRaid',      textKey: 'textRaid',      iconDefault: '⚔️', textDefault: 'RAID INCOMING'       },
  cheer:     { iconKey: 'iconCheer',     textKey: 'textCheer',     iconDefault: '🎉', textDefault: 'BITS'                },
  hypetrain: { iconKey: 'iconHypeTrain', textKey: 'textHypeTrain', iconDefault: '🚂', textDefault: 'HYPE TRAIN 🔥'       }
};

// ─── Types prioritaires (raid/hypetrain passent devant les follows) ──────────────────────────────
const HIGH_PRIORITY_TYPES = new Set(['raid', 'hypetrain']);

// ─── DOM refs ────────────────────────────────────────────────────────────────────────────────────
const alertEl       = document.getElementById('alert');
const iconEl        = document.getElementById('icon');
const typeEl        = document.getElementById('type');
const usernameEl    = document.getElementById('username');
const templateMsgEl = document.getElementById('templateMsg');
const messageEl     = document.getElementById('message');
const progressEl    = document.getElementById('progressBar');

// ─── Debug log (activé uniquement si debugMode est true dans fieldData) ─────────────────────────
function dbg(...args) {
  if (parseBool(fieldData.debugMode)) console.log('[widget-glass]', ...args);
}

// ─── Template msg ────────────────────────────────────────────────────────────────────────────────
function setTemplateMsg(text) {
  if (!templateMsgEl) return;
  templateMsgEl.textContent = text || '';
}

// ─── Bulle message viewer ────────────────────────────────────────────────────────────────────────
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

// ─── onWidgetLoad ────────────────────────────────────────────────────────────────────────────────
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

// ─── applySettings ───────────────────────────────────────────────────────────────────────────────
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

// ─── hexToRgba ───────────────────────────────────────────────────────────────────────────────────
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

// ─── Position ────────────────────────────────────────────────────────────────────────────────────
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

// ─── Presets de thème ────────────────────────────────────────────────────────────────────────────
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
  if (glowBgEnabled !== false)
    root.style.setProperty('--primary-color-soft', hexToRgba(theme.primary, 0.25));
  root.style.setProperty('--type-color',     theme.typeColor);
  root.style.setProperty('--username-color', theme.usernameColor);
}

// ─── Animations ──────────────────────────────────────────────────────────────────────────────────
function getAnimInClass()  { return 'anim-in-'  + (fieldData.animIn  || 'popIn');  }
function getAnimOutClass() { return 'anim-out-' + (fieldData.animOut || 'popOut'); }

// ─── Particules ──────────────────────────────────────────────────────────────────────────────────
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

function createParticles(alertType, container) {
  container.innerHTML = '';
  if (!parseBool(fieldData.showParticles)) return;
  const count  = parseInt(fieldData.particleCount, 10) || 55;
  const colors = PARTICLE_COLORS[alertType] || [fieldData.primaryColor || '#00f5ff', fieldData.primaryColor || '#00f5ff'];
  for (let i = 0; i < count; i++) {
    const p       = document.createElement('div');
    const size    = (Math.random() * 5 + 3) + 'px';
    const travelY = 200 + Math.floor(Math.random() * 160);
    const delay   = (Math.random() * 2).toFixed(2) + 's';
    const opacity = (Math.random() * 0.65 + 0.35).toFixed(2);
    p.style.cssText = [
      'position:absolute',
      `width:${size}`,
      `height:${size}`,
      `background:${i % 2 === 0 ? colors[0] : colors[1]}`,
      'border-radius:50%',
      `left:${Math.random() * 100}%`,
      `bottom:${Math.random() * 80}%`,
      `--particle-opacity:${opacity}`,
      `--travel-y:-${travelY}px`,
      `animation:floatParticle ${2.5 + Math.random() * 4}s ${delay} linear infinite`
    ].join(';');
    container.appendChild(p);
  }
}

// ─── Sons ────────────────────────────────────────────────────────────────────────────────────────
// FIX #3 : validation du format audio avant de créer l'objet Audio
function playSound(type) {
  const keys = TYPE_FIELD_KEYS[type];
  const url  = keys ? (fieldData[keys.sound] || '').trim() : '';
  if (!url) return;
  // Accepte uniquement les extensions audio connues ou les URLs de données
  if (!/\.(mp3|ogg|wav|aac|m4a|flac|webm)(\?.*)?$/i.test(url) && !/^data:audio\//i.test(url)) {
    dbg(`Son "${type}" : format non supporté ou URL invalide (${url})`);
    return;
  }
  const audio  = new Audio(url);
  const rawVol = keys && fieldData[keys.volume] !== undefined
    ? parseFloat(fieldData[keys.volume])
    : 0.7;
  audio.volume = Number.isFinite(rawVol)
    ? Math.min(1, Math.max(0, rawVol > 1 ? rawVol / 100 : rawVol))
    : 0.7;
  audio.play().catch(err =>
    dbg(`Son "${type}" inaccessible (${url}):`, err.message)
  );
}

// ─── Barre de progression ────────────────────────────────────────────────────────────────────────
// FIX #5 : utiliser removeProperty au lieu de style.display = 'none'
// pour éviter le conflit entre style inline et la classe CSS .active
function startProgressBar(duration) {
  if (!progressEl) return;
  if (!parseBool(fieldData.showProgressBar)) {
    progressEl.classList.remove('active');
    progressEl.style.removeProperty('display');
    return;
  }
  // Retirer le style inline avant de jouer sur les classes
  progressEl.style.removeProperty('display');
  progressEl.classList.remove('active');
  void progressEl.offsetWidth; // force reflow pour relancer l'animation
  document.documentElement.style.setProperty('--duration', duration + 'ms');
  progressEl.classList.add('active');
}

function stopProgressBar() {
  if (!progressEl) return;
  progressEl.classList.remove('active');
  // FIX #5 suite : on retire le style inline pour laisser le CSS gérer display
  progressEl.style.removeProperty('display');
}

// ─── Emotes ──────────────────────────────────────────────────────────────────────────────────────
// \b remplacé par split sur espaces pour matcher les emotes avec tirets/caractères spéciaux
function renderEmotes(text, emotes) {
  if (!emotes || !emotes.length || !text) return null;
  const dict = {};
  emotes.forEach(e => {
    if (e.name && e.urls) dict[e.name] = e.urls['x2'] || e.urls['x1'] || Object.values(e.urls)[0];
  });
  if (!Object.keys(dict).length) return null;
  const words = text.split(/(\s+)/);
  let hasEmote = false;
  const parts = words.map(word => {
    if (dict[word]) {
      hasEmote = true;
      const safe    = word.replace(/"/g, '&quot;').replace(/>/g, '&gt;');
      const imgSrc  = dict[word].replace(/"/g, '&quot;');
      // FIX #2 : onerror sur chaque image d'emote → fallback texte brut
      return `<img src="${imgSrc}" alt="${safe}" title="${safe}" style="height:1.2em;vertical-align:middle;display:inline;" loading="lazy" onerror="this.replaceWith(document.createTextNode('${safe}'))">`;
    }
    return word.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  });
  return hasEmote ? parts.join('') : null;
}

// ─── Templates ───────────────────────────────────────────────────────────────────────────────────
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

// ─── parseBool ───────────────────────────────────────────────────────────────────────────────────
function parseBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    return v !== 'false' && v !== '0' && v !== '';
  }
  return !!val;
}

const VIEWER_MSG_TYPES = ['sub', 'resub', 'donation', 'cheer'];

// ─── File d'attente avec priorité ────────────────────────────────────────────────────────────────
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

// ─── Scale icône ─────────────────────────────────────────────────────────────────────────────────
function setIconScale(scale) {
  if (iconEl) iconEl.style.transform = `scale(${scale})`;
}
function resetIconScale() {
  if (iconEl) iconEl.style.transform = '';
}

// ─── Lecture d'une alerte ────────────────────────────────────────────────────────────────────────
function _playAlert(type, username, message, amount, emotes) {
  // FIX #1 : stopper proprement la barre de progression d'une éventuelle
  // alerte précédente avant d'en démarrer une nouvelle (ex: skipAlert rapide)
  stopProgressBar();

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

  alertEl.className = alertEl.className
    .split(' ')
    .filter(c => !c.startsWith('anim-in-') && !c.startsWith('anim-out-'))
    .join(' ');
  void alertEl.offsetWidth;

  // FIX #4 : réinitialiser le scale AVANT d'appliquer setIconScale
  // pour éviter qu'un scale résiduel reste si l'animation précédente
  // ne s'est pas terminée normalement (ex: prefers-reduced-motion)
  resetIconScale();
  setIconScale(1.15);

  alertEl.classList.add(getAnimInClass());

  const particlesContainer = document.getElementById('particles');
  createParticles(type, particlesContainer);
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

    alertEl.classList.remove(getAnimInClass());
    void alertEl.offsetWidth;
    alertEl.classList.add(getAnimOutClass());

    if (particlesContainer) particlesContainer.innerHTML = '';

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

// ─── API publique ────────────────────────────────────────────────────────────────────────────────
function showAlert(type, username, message, amount, emotes) {
  enqueueAlert(type, username, message || '', amount || '', emotes || []);
}

// ─── Détection gift sub ──────────────────────────────────────────────────────────────────────────
function isGiftSub(data) {
  return !!(data.isCommunityGift || data.gifted || data.isGift || data.sender || data.gifter);
}

// ─── StreamElements Events ───────────────────────────────────────────────────────────────────────
window.addEventListener('onEventReceived', function (obj) {
  if (!obj.detail || !obj.detail.event) return;
  if (isLoading) return;

  const listener = obj.detail.listener;
  const data     = obj.detail.event;
  const emotes   = data.emotes || [];

  dbg('event =>', listener, JSON.stringify(data).slice(0, 300));

  const eventId = `${listener}_${data.name}_${data._id || data.createdAt || data.amount || ''}`;
  if (seenEventIds.has(eventId)) return;

  if (seenEventIds.size >= SEEN_MAX) {
    seenEventIds.delete(seenEventIds.values().next().value);
  }
  seenEventIds.add(eventId);
  setTimeout(() => seenEventIds.delete(eventId), 30000);

  if (listener === 'follower-latest' && parseBool(fieldData.showFollow))
    showAlert('follow', data.name, data.message || '', '', emotes);

  // Resub mois-1 : vérifie isResub ou cumulativeMonths en plus de amount > 1
  if (listener === 'subscriber-latest' && !isGiftSub(data)) {
    const months  = parseInt(data.amount, 10) || parseInt(data.months, 10) || 0;
    const isResub = !!(data.isResub || data.streak || months > 1 || (months === 1 && data.cumulativeMonths > 1));
    if (isResub && parseBool(fieldData.showResub))
      showAlert('resub', data.name, data.message || '', `${months || data.cumulativeMonths || 1}`, emotes);
    else if (!isResub && parseBool(fieldData.showSub))
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

// ─── Fonctions de test console ───────────────────────────────────────────────────────────────────
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
  const particlesContainer = document.getElementById('particles');
  if (particlesContainer) particlesContainer.innerHTML = '';
  alertEl.className = alertEl.className
    .split(' ')
    .filter(c => !c.startsWith('anim-in-') && !c.startsWith('anim-out-'))
    .join(' ');
  resetIconScale();
  isPlaying = false;
  processQueue();
  dbg('Alerte sautée.');
};

window.clearQueue = function() {
  alertQueue.length = 0;
  dbg('File vidée.');
};
