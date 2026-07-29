// ─── State ───────────────────────────────────────────────────────────────────────────────────
let fieldData = {};
let alertQueue = [];
let isPlaying = false;
let hideTimer = null;
let _fallbackTimer = null;
let isLoading = true;
let _hideEndListener = null;

const seenEventIds = new Set();
const SEEN_MAX = 200;

// ─── Map statique type → clés fieldData ──────────────────────────────────────────────────────
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

// ─── Map statique type → icône + label (évite recréation à chaque alerte) ────────────────────
const ALERT_TYPES_META = {
  follow:    { iconKey: 'iconFollow',    textKey: 'textFollow',    iconDefault: '\u2764\ufe0f', textDefault: 'NOUVEAU FOLLOW'       },
  sub:       { iconKey: 'iconSub',       textKey: 'textSub',       iconDefault: '\u2b50',       textDefault: 'NOUVELLE SUB'         },
  resub:     { iconKey: 'iconResub',     textKey: 'textResub',     iconDefault: '\ud83d\udd25', textDefault: 'RESUBSCRIPTION'       },
  giftsub:   { iconKey: 'iconGiftSub',   textKey: 'textGiftSub',   iconDefault: '\ud83c\udf81', textDefault: 'GIFT SUB'             },
  donation:  { iconKey: 'iconDonation',  textKey: 'textDonation',  iconDefault: '\ud83d\udc8e', textDefault: 'DONATION'             },
  raid:      { iconKey: 'iconRaid',      textKey: 'textRaid',      iconDefault: '\u2694\ufe0f', textDefault: 'RAID INCOMING'        },
  cheer:     { iconKey: 'iconCheer',     textKey: 'textCheer',     iconDefault: '\ud83c\udf89', textDefault: 'BITS'                 },
  hypetrain: { iconKey: 'iconHypeTrain', textKey: 'textHypeTrain', iconDefault: '\ud83d\ude82', textDefault: 'HYPE TRAIN \ud83d\udd25' }
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────────────────────
const alertEl       = document.getElementById('alert');
const iconEl        = document.getElementById('icon');
const typeEl        = document.getElementById('type');
const usernameEl    = document.getElementById('username');
const templateMsgEl = document.getElementById('templateMsg');
const messageEl     = document.getElementById('message');
const progressEl    = document.getElementById('progressBar');

// ─── Helpers template ─────────────────────────────────────────────────────────────────────────
function setTemplateMsg(text) {
  if (!templateMsgEl) return;
  templateMsgEl.textContent = text || '';
}

// ─── Helpers bulle message viewer ────────────────────────────────────────────────────────────
function showBubble(html, isHtml) {
  if (!messageEl) return;
  // Nettoyer l'éventuel listener 'hiding' en attente avant de réafficher
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
  // FIX: retirer l'ancien listener avant d'en ajouter un nouveau → évite l'accumulation
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

// ─── StreamElements load ──────────────────────────────────────────────────────────────────────
window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  applySettings();
  setTimeout(() => { isLoading = false; }, 500);
});

// ─── Apply CSS variables from fields ─────────────────────────────────────────────────────────
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

  // ── Glow icône + texte (✨ Activer le glow) ──────────────────────────────────────────
  const glowEnabled = parseBool(fieldData.enableGlow !== undefined ? fieldData.enableGlow : true);
  const glowValue   = glowEnabled ? (parseInt(fieldData.glowIntensity, 10) || 20) : 0;
  root.style.setProperty('--glow-intensity', glowValue + 'px');

  // ── Fond coloré animé (🌟 Effet de fond coloré animé) ──────────────────────────────
  const glowBgEnabled = parseBool(fieldData.enableGlowBg !== undefined ? fieldData.enableGlowBg : true);
  if (glowBgEnabled) {
    root.style.setProperty('--primary-color-soft', hexToRgba(fieldData.primaryColor || '#00f5ff', 0.25));
    root.style.setProperty('--accent-color-soft',  'rgba(255,0,204,0.18)');
  } else {
    root.style.setProperty('--primary-color-soft', 'transparent');
    root.style.setProperty('--accent-color-soft',  'transparent');
  }

  const dur = Math.min(60000, Math.max(1000, parseInt(fieldData.duration, 10) || 7000));
  root.style.setProperty('--duration', dur + 'ms');
  root.style.setProperty('--anim-duration-in',  (parseInt(fieldData.animDurationIn,  10) || 600)  + 'ms');
  root.style.setProperty('--anim-duration-out', (parseInt(fieldData.animDurationOut, 10) || 500)  + 'ms');
  root.style.setProperty('--progress-color-1',   fieldData.progressBarColor1 || fieldData.primaryColor || '#00f5ff');
  root.style.setProperty('--progress-color-2',   fieldData.progressBarColor2 || fieldData.primaryColor || '#00f5ff');
  applyPosition(fieldData.widgetPosition || 'center');
  applyThemePreset(fieldData.themePreset || 'custom', glowBgEnabled);
}

// ─── hexToRgba robuste ────────────────────────────────────────────────────────────────────────
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

// ─── Position du widget ──────────────────────────────────────────────────────────────────────
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

// ─── Presets de thème ────────────────────────────────────────────────────────────────────────
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
  if (glowBgEnabled !== false) {
    root.style.setProperty('--primary-color-soft', hexToRgba(theme.primary, 0.25));
  }
  root.style.setProperty('--type-color',     theme.typeColor);
  root.style.setProperty('--username-color', theme.usernameColor);
}

// ─── Animations entrée / sortie ──────────────────────────────────────────────────────────────
function getAnimInClass()  { return 'anim-in-'  + (fieldData.animIn  || 'popIn');  }
function getAnimOutClass() { return 'anim-out-' + (fieldData.animOut || 'popOut'); }

// ─── Couleur de particule selon le type d'alerte ─────────────────────────────────────────────
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

// ─── Particules ───────────────────────────────────────────────────────────────────────────────
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

// ─── Sons ─────────────────────────────────────────────────────────────────────────────────────
function playSound(type) {
  const keys = TYPE_FIELD_KEYS[type];
  const url  = keys ? fieldData[keys.sound] : '';
  if (!url || url.trim() === '') return;
  const audio = new Audio(url);
  const rawVol = parseFloat(fieldData.soundVolume);
  const vol    = Number.isFinite(rawVol)
    ? Math.min(1, Math.max(0, rawVol > 1 ? rawVol / 100 : rawVol))
    : 0.7;
  audio.volume = vol;
  audio.play().catch(err => {
    console.warn(`[widget-glass] Son "${type}" inaccessible (${url}):`, err.message);
  });
}

// ─── Barre de progression ────────────────────────────────────────────────────────────────────
function startProgressBar(duration) {
  if (!progressEl) return;
  if (!parseBool(fieldData.showProgressBar)) { progressEl.classList.remove('active'); return; }
  progressEl.style.display = 'block';
  progressEl.classList.remove('active');
  void progressEl.offsetWidth;
  document.documentElement.style.setProperty('--duration', duration + 'ms');
  progressEl.classList.add('active');
}

// ─── Emotes Twitch ────────────────────────────────────────────────────────────────────────────
function renderEmotes(text, emotes) {
  if (!emotes || !emotes.length || !text) return null;
  const dict = {};
  emotes.forEach(e => {
    if (e.name && e.urls) dict[e.name] = e.urls['x2'] || e.urls['x1'] || Object.values(e.urls)[0];
  });
  if (!Object.keys(dict).length) return null;
  const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // FIX: échapper les noms d'emotes dans alt/title pour éviter XSS
  return safe.replace(/\b(\S+)\b/g, match => {
    if (!dict[match]) return match;
    const escapedName = match.replace(/"/g, '&quot;').replace(/>/g, '&gt;');
    return `<img src="${dict[match]}" alt="${escapedName}" title="${escapedName}" style="height:1.2em;vertical-align:middle;display:inline;" loading="lazy">`;
  });
}

// ─── Résolution des templates ─────────────────────────────────────────────────────────────────
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

// ─── Parse booléen robuste ────────────────────────────────────────────────────────────────────
// FIX: "0" est désormais traité comme false (cohérent avec les valeurs falsy)
function parseBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    return v !== 'false' && v !== '0' && v !== '';
  }
  return !!val;
}

const VIEWER_MSG_TYPES = ['sub', 'resub', 'donation', 'cheer'];

// ─── File d'attente ───────────────────────────────────────────────────────────────────────────
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

// ─── Lecture d'une alerte ─────────────────────────────────────────────────────────────────────
function _playAlert(type, username, message, amount, emotes) {
  setTemplateMsg('');
  if (messageEl) {
    // Nettoyer le listener hiding éventuel avant de réinitialiser
    if (messageEl._hideListener) {
      messageEl.removeEventListener('animationend', messageEl._hideListener);
      messageEl._hideListener = null;
    }
    messageEl.classList.remove('visible', 'hiding');
    messageEl.textContent = '';
    messageEl.innerHTML   = '';
  }

  // Utilisation de ALERT_TYPES_META (constante globale) au lieu de recréer l'objet à chaque appel
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
    const templateWithoutUsername = template.replace(/\{username\}\s*/gi, '').trim();
    const resolved = resolveTemplate(templateWithoutUsername, vars).trim();
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

  alertEl.classList.add(getAnimInClass());

  // Utilise le container DOM déjà présent (évite un getElementById de plus)
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
    if (progressEl) progressEl.classList.remove('active');
    alertEl.classList.remove(getAnimInClass());
    void alertEl.offsetWidth;
    alertEl.classList.add(getAnimOutClass());

    if (particlesContainer) particlesContainer.innerHTML = '';

    const animOutDur = parseInt(fieldData.animDurationOut, 10) || 500;

    // FIX: le fallback ne déclenche processQueue() que si animationend n'a pas encore tiré
    _fallbackTimer = setTimeout(() => {
      if (_hideEndListener) {
        // animationend n'a pas encore tiré → on prend le relais
        alertEl.removeEventListener('animationend', _hideEndListener);
        _hideEndListener = null;
        alertEl.classList.remove(getAnimOutClass());
        processQueue();
      }
      // Sinon animationend a déjà appelé processQueue() → rien à faire
    }, animOutDur + 200);

    _hideEndListener = function onHideEnd() {
      // FIX: annuler le fallback dès que l'animationend tire
      clearTimeout(_fallbackTimer);
      _fallbackTimer = null;
      _hideEndListener = null;
      alertEl.classList.remove(getAnimOutClass());
      processQueue();
    };
    alertEl.addEventListener('animationend', _hideEndListener, { once: true });
  }, duration);
}

// ─── API publique ─────────────────────────────────────────────────────────────────────────────
function showAlert(type, username, message, amount, emotes) {
  enqueueAlert(type, username, message || '', amount || '', emotes || []);
}

// ─── Détection gift sub ───────────────────────────────────────────────────────────────────────
function isGiftSub(data) {
  return !!(
    data.isCommunityGift ||
    data.gifted          ||
    data.isGift          ||
    data.sender          ||
    data.gifter
  );
}

// ─── StreamElements Events ────────────────────────────────────────────────────────────────────
window.addEventListener('onEventReceived', function (obj) {
  if (!obj.detail || !obj.detail.event) return;
  if (isLoading) return;

  const listener = obj.detail.listener;
  const data     = obj.detail.event;
  const emotes   = data.emotes || [];

  console.log('[widget-glass] event =>', listener, JSON.stringify(data).slice(0, 300));

  // FIX: ne pas utiliser Date.now() comme clé (non-déterministe → dédupe inefficace)
  // On utilise une combinaison stable : listener + name + _id ou createdAt ou amount
  const eventId = `${listener}_${data.name}_${data._id || data.createdAt || data.amount || ''}`;
  if (seenEventIds.has(eventId)) return;

  if (seenEventIds.size >= SEEN_MAX) {
    const oldest = seenEventIds.values().next().value;
    seenEventIds.delete(oldest);
  }
  seenEventIds.add(eventId);
  setTimeout(() => seenEventIds.delete(eventId), 10000);

  if (listener === 'follower-latest' && parseBool(fieldData.showFollow)) {
    showAlert('follow', data.name, data.message || '', '', emotes);
  }

  if (listener === 'subscriber-latest' && !isGiftSub(data)) {
    if (data.amount > 1 && parseBool(fieldData.showResub)) {
      showAlert('resub', data.name, data.message || '', `${data.amount}`, emotes);
    } else if (parseBool(fieldData.showSub)) {
      showAlert('sub', data.name, data.message || '', '', emotes);
    }
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
    const gifter    = data.name || data.sender   || data.gifter  || 'Anonyme';
    showAlert('giftsub', gifter, recipient, String(qty), []);
  }

  if (listener === 'tip-latest' && parseBool(fieldData.showDonation)) {
    // FIX: utilise la devise retournée par StreamElements si disponible (évite d'hardcoder €)
    const currency = data.currency || fieldData.donationCurrency || '\u20ac';
    showAlert('donation', data.name, data.message || '', `${data.amount} ${currency}`, emotes);
  }

  if (listener === 'raid-latest' && parseBool(fieldData.showRaid)) {
    showAlert('raid', data.name, data.message || '', String(data.amount || ''), []);
  }

  if (listener === 'cheer-latest' && parseBool(fieldData.showCheer)) {
    showAlert('cheer', data.name, data.message || '', String(data.amount || ''), emotes);
  }

  if ((listener === 'hype-train-start' || listener === 'hype-train-end') && parseBool(fieldData.showHypeTrain)) {
    const level  = data.level || data.current || '';
    const suffix = listener === 'hype-train-end' ? 'TERMIN\u00c9 !' : `Niveau ${level}`;
    showAlert('hypetrain', 'HYPE TRAIN', suffix, String(level), []);
  }
});

// ─── Fonctions de test console ────────────────────────────────────────────────────────────────
window.testAlert = function(type = 'follow', name = 'TestUser') {
  const testData = {
    follow:    { msg: '',                         amount: '' },
    sub:       { msg: 'Super stream !',           amount: '' },
    resub:     { msg: 'Fid\u00e8le depuis le d\u00e9but !', amount: '3' },
    giftsub:   { msg: 'DestUser',                 amount: '5' },
    donation:  { msg: 'Merci !',                  amount: '10 \u20ac' },
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
