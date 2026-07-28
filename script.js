// ─── Defaults ─────────────────────────────────────────────────────────────────
var DEFAULTS = {
  widgetWidth:    660,
  borderRadius:   28,
  blurIntensity:  28,
  glassOpacity:   0.45,
  primaryColor:   '#00f5ff',
  accentColor:    '#ff2ec4',
  iconSize:       56,
  typeSize:       15.5,
  usernameSize:   49,
  messageSize:    23,
  amountSize:     35,
  glowIntensity:  20,
  widgetPosition: 'center',
  themePreset:    'custom',
  duration:       7000,
  showParticles:  true,
  particleCount:  55,
  showAvatar:     false,
  showFollow:     true,
  showSub:        true,
  showResub:      true,
  showDonation:   true,
  showRaid:       true,
  showCheer:      true,
  iconFollow:     '❤️',
  iconSub:        '⭐',
  iconResub:      '🔥',
  iconDonation:   '💎',
  iconRaid:       '⚔️',
  iconCheer:      '🎉',
  textFollow:     'NOUVEAU FOLLOW',
  textSub:        'NOUVELLE SUB',
  textResub:      'RESUBSCRIPTION',
  textDonation:   'DONATION',
  textRaid:       'RAID INCOMING',
  textCheer:      'BITS',
  soundVolume:    0.7
};

// ─── State ───────────────────────────────────────────────────────────────────
var fieldData    = {};
var alertQueue   = [];
var isPlaying    = false;
var hideTimer    = null;
var seenEventIds = new Set();

// ─── DOM refs ────────────────────────────────────────────────────────────────
var alertEl    = document.getElementById('alert');
var iconEl     = document.getElementById('icon');
var typeEl     = document.getElementById('type');
var usernameEl = document.getElementById('username');
var messageEl  = document.getElementById('message');
var amountEl   = document.getElementById('amount');
var avatarEl   = document.getElementById('avatar');

// ─── Init immédiat — appel direct, sans DOMContentLoaded ───────────────────────
// SE injecte le JS dans une iframe dont le DOM est DEJA pret.
// DOMContentLoaded ne se declenche jamais -> appel direct obligatoire.
fieldData = Object.assign({}, DEFAULTS);
applySettings();

// ─── StreamElements load ─────────────────────────────────────────────────────
window.addEventListener('onWidgetLoad', function(obj) {
  // Fusionner defaults + valeurs utilisateur
  fieldData = Object.assign({}, DEFAULTS, obj.detail.fieldData);
  applySettings();

  // Pre-enregistrer les recentEvents pour eviter le replay SE au demarrage
  var recent = obj.detail && obj.detail.channel && obj.detail.channel.recentEvents;
  if (Array.isArray(recent)) {
    recent.forEach(function(ev) {
      if (ev && ev._id) seenEventIds.add(ev._id);
    });
  }
});

// ─── Apply CSS variables ────────────────────────────────────────────────────
function applySettings() {
  var root = document.documentElement;
  root.style.setProperty('--widget-width',        fieldData.widgetWidth   + 'px');
  root.style.setProperty('--border-radius',       fieldData.borderRadius  + 'px');
  root.style.setProperty('--blur-intensity',      fieldData.blurIntensity + 'px');
  root.style.setProperty('--glass-opacity',       fieldData.glassOpacity);
  root.style.setProperty('--primary-color',       fieldData.primaryColor);
  root.style.setProperty('--accent-color',        fieldData.accentColor);
  root.style.setProperty('--icon-size',           fieldData.iconSize      + 'px');
  root.style.setProperty('--type-size',           fieldData.typeSize      + 'px');
  root.style.setProperty('--username-size',       fieldData.usernameSize  + 'px');
  root.style.setProperty('--message-size',        fieldData.messageSize   + 'px');
  root.style.setProperty('--amount-size',         fieldData.amountSize    + 'px');
  root.style.setProperty('--glow-intensity',      fieldData.glowIntensity + 'px');
  root.style.setProperty('--primary-color-soft',  hexToRgba(fieldData.primaryColor, 0.25));
  root.style.setProperty('--accent-color-soft',   hexToRgba(fieldData.accentColor,  0.18));
  applyPosition(fieldData.widgetPosition || 'center');
  applyThemePreset(fieldData.themePreset  || 'custom');
}

// ─── hexToRgba robuste ────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return 'rgba(0,245,255,' + alpha + ')';
  hex = hex.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex))
    hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return 'rgba(0,245,255,' + alpha + ')';
  return 'rgba(' + parseInt(hex.slice(1,3),16) + ',' + parseInt(hex.slice(3,5),16) + ',' + parseInt(hex.slice(5,7),16) + ',' + alpha + ')';
}

// ─── Position du widget ───────────────────────────────────────────────────────
function applyPosition(pos) {
  var map = {
    'top-left':      ['flex-start', 'flex-start'],
    'top-center':    ['flex-start', 'center'],
    'top-right':     ['flex-start', 'flex-end'],
    'center':        ['center',     'center'],
    'bottom-left':   ['flex-end',   'flex-start'],
    'bottom-center': ['flex-end',   'center'],
    'bottom-right':  ['flex-end',   'flex-end']
  };
  var coords = map[pos] || ['center', 'center'];
  document.body.style.alignItems     = coords[0];
  document.body.style.justifyContent = coords[1];
}

// ─── Presets de theme ─────────────────────────────────────────────────────────
var THEME_PRESETS = {
  'neon-cyan':     { primary: '#00f5ff', accent: '#ff2ec4' },
  'gold':          { primary: '#ffd700', accent: '#ff8c00' },
  'purple-storm':  { primary: '#b44fff', accent: '#ff4fa3' },
  'minimal-white': { primary: '#ffffff', accent: '#cccccc' },
  'green-matrix':  { primary: '#00ff88', accent: '#00ccff' },
  'custom': null
};

function applyThemePreset(preset) {
  var theme = THEME_PRESETS[preset];
  if (!theme) return;
  var root = document.documentElement;
  root.style.setProperty('--primary-color',      theme.primary);
  root.style.setProperty('--accent-color',       theme.accent);
  root.style.setProperty('--primary-color-soft', hexToRgba(theme.primary, 0.25));
  root.style.setProperty('--accent-color-soft',  hexToRgba(theme.accent,  0.18));
}

// ─── Particules ───────────────────────────────────────────────────────────────
function createParticles() {
  var container = document.getElementById('particles');
  container.innerHTML = '';
  if (!fieldData.showParticles) return;
  var count = parseInt(fieldData.particleCount, 10) || 55;
  for (var i = 0; i < count; i++) {
    var p    = document.createElement('div');
    var size = (Math.random() * 5 + 3) + 'px';
    p.style.cssText = [
      'position:absolute',
      'width:'  + size,
      'height:' + size,
      'background:' + (i % 3 === 0 ? fieldData.accentColor : fieldData.primaryColor),
      'border-radius:50%',
      'left:'   + (Math.random() * 100) + '%',
      'bottom:' + (Math.random() * 80)  + '%',
      'opacity:'+ (Math.random() * 0.65 + 0.35),
      'animation:floatParticle ' + (2.5 + Math.random() * 4) + 's linear forwards'
    ].join(';');
    container.appendChild(p);
  }
}

// ─── Sons ─────────────────────────────────────────────────────────────────────
function playSound(type) {
  var url = fieldData['sound' + type.charAt(0).toUpperCase() + type.slice(1)];
  if (!url || !url.trim()) return;
  var a = new Audio(url);
  a.volume = Math.min(1, Math.max(0, parseFloat(fieldData.soundVolume) || 0.7));
  a.play().catch(function() {});
}

// ─── Avatar Twitch ────────────────────────────────────────────────────────────
function loadAvatar(username) {
  if (!avatarEl) return;
  if (!fieldData.showAvatar) { avatarEl.style.display = 'none'; return; }
  avatarEl.style.display = 'block';
  avatarEl.src     = 'https://decapi.me/twitch/avatar/' + encodeURIComponent(username);
  avatarEl.onerror = function() { avatarEl.style.display = 'none'; };
}

// ─── File d'attente ───────────────────────────────────────────────────────────
function enqueueAlert(type, username, message, amount) {
  alertQueue.push({ type: type, username: username, message: message, amount: amount });
  if (!isPlaying) processQueue();
}

function processQueue() {
  if (alertQueue.length === 0) { isPlaying = false; return; }
  isPlaying = true;
  var item = alertQueue.shift();
  _playAlert(item.type, item.username, item.message, item.amount);
}

// ─── Lecture d'une alerte ─────────────────────────────────────────────────────
function _playAlert(type, username, message, amount) {
  var types = {
    follow:   { icon: fieldData.iconFollow   || '❤️', text: fieldData.textFollow   || 'NOUVEAU FOLLOW' },
    sub:      { icon: fieldData.iconSub      || '⭐',     text: fieldData.textSub      || 'NOUVELLE SUB'   },
    resub:    { icon: fieldData.iconResub    || '🔥',     text: fieldData.textResub    || 'RESUBSCRIPTION' },
    donation: { icon: fieldData.iconDonation || '💎',     text: fieldData.textDonation || 'DONATION'       },
    raid:     { icon: fieldData.iconRaid     || '⚔️',     text: fieldData.textRaid     || 'RAID INCOMING'  },
    cheer:    { icon: fieldData.iconCheer    || '🎉',     text: fieldData.textCheer    || 'BITS'           }
  };
  var t = types[type] || types.follow;

  iconEl.textContent     = t.icon;
  typeEl.textContent     = t.text;
  usernameEl.textContent = username;
  messageEl.textContent  = message || '';
  amountEl.textContent   = amount  || '';

  loadAvatar(username);

  alertEl.classList.remove('show', 'hide');
  void alertEl.offsetWidth; // force reflow pour relancer l'animation
  alertEl.classList.add('show');
  createParticles();
  playSound(type);

  var duration = parseInt(fieldData.duration, 10) || 7000;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(function() {
    alertEl.classList.remove('show');
    alertEl.classList.add('hide');
    setTimeout(function() {
      alertEl.classList.remove('hide');
      processQueue();
    }, 500);
  }, duration);
}

// ─── API publique ─────────────────────────────────────────────────────────────
function showAlert(type, username, message, amount) {
  enqueueAlert(type, username, message || '', amount || '');
}

// ─── StreamElements Events ────────────────────────────────────────────────────
window.addEventListener('onEventReceived', function(obj) {
  if (!obj.detail || !obj.detail.event) return;

  var listener = obj.detail.listener;
  var data     = obj.detail.event;

  // Deduplication par _id SE natif
  var rawId = data._id || data.activityId;
  if (rawId) {
    if (seenEventIds.has(rawId)) return;
    seenEventIds.add(rawId);
    setTimeout(function() { seenEventIds.delete(rawId); }, 30000);
  }

  if (listener === 'follower-latest' && fieldData.showFollow) {
    showAlert('follow', data.name, data.message || '');
  }
  if (listener === 'subscriber-latest') {
    if (data.amount > 1 && fieldData.showResub) {
      showAlert('resub', data.name, 'x' + data.amount + ' mois');
    } else if (fieldData.showSub) {
      showAlert('sub', data.name, data.message || '');
    }
  }
  if (listener === 'tip-latest' && fieldData.showDonation) {
    showAlert('donation', data.name, data.message || '', data.amount + ' €');
  }
  if (listener === 'raid-latest' && fieldData.showRaid) {
    showAlert('raid', data.name, 'avec ' + data.amount + ' viewers !');
  }
  if (listener === 'cheer-latest' && fieldData.showCheer) {
    showAlert('cheer', data.name, data.message || '', data.amount + ' bits');
  }
});

// ─── Fonctions de test (console SE) ────────────────────────────────────────────
window.testAlert = function(type, name) {
  type = type || 'follow';
  name = name || 'TestUser';
  var amount = type === 'donation' ? '25 €' : type === 'cheer' ? '500 bits' : '';
  showAlert(type, name, 'Message de test', amount);
};

window.testQueue = function() {
  ['follow', 'sub', 'donation', 'raid', 'cheer'].forEach(function(t, i) {
    setTimeout(function() {
      showAlert(t, 'User_' + t, 'Test queue', t === 'donation' ? '10 €' : '');
    }, i * 200);
  });
};
