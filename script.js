// ─── State ───────────────────────────────────────────────────────────────────
let fieldData  = {};
let alertQueue = [];
let isPlaying  = false;
let hideTimer  = null;

// Déduplication via _id SE natif.
// PAS de flag isLoading — il bloquerait tout si onWidgetLoad
// ne se déclenche pas (mode éditeur / preview SE).
const seenEventIds = new Set();

// ─── DOM refs ────────────────────────────────────────────────────────────────
const alertEl    = document.getElementById('alert');
const iconEl     = document.getElementById('icon');
const typeEl     = document.getElementById('type');
const usernameEl = document.getElementById('username');
const messageEl  = document.getElementById('message');
const amountEl   = document.getElementById('amount');
const avatarEl   = document.getElementById('avatar');

// ─── StreamElements load ─────────────────────────────────────────────────────
window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  applySettings();

  // SE rejoue le dernier event quelques ms après onWidgetLoad.
  // On pré-enregistre les _id des recentEvents pour les neutraliser.
  var recent = obj.detail && obj.detail.channel && obj.detail.channel.recentEvents;
  if (Array.isArray(recent)) {
    recent.forEach(function(ev) {
      if (ev && ev._id) seenEventIds.add(ev._id);
    });
  }
});

// ─── Apply CSS variables from fields ─────────────────────────────────────────
function applySettings() {
  var root = document.documentElement;
  root.style.setProperty('--widget-width',   fieldData.widgetWidth   + 'px');
  root.style.setProperty('--border-radius',  fieldData.borderRadius  + 'px');
  root.style.setProperty('--blur-intensity', fieldData.blurIntensity + 'px');
  root.style.setProperty('--glass-opacity',  fieldData.glassOpacity);
  root.style.setProperty('--primary-color',  fieldData.primaryColor);
  root.style.setProperty('--accent-color',   fieldData.accentColor);
  root.style.setProperty('--icon-size',      fieldData.iconSize      + 'px');
  root.style.setProperty('--type-size',      fieldData.typeSize      + 'px');
  root.style.setProperty('--username-size',  fieldData.usernameSize  + 'px');
  root.style.setProperty('--message-size',   fieldData.messageSize   + 'px');
  root.style.setProperty('--amount-size',    fieldData.amountSize    + 'px');
  root.style.setProperty('--glow-intensity', (fieldData.glowIntensity || 20) + 'px');

  root.style.setProperty('--primary-color-soft', hexToRgba(fieldData.primaryColor, 0.25));
  root.style.setProperty('--accent-color-soft',  hexToRgba(fieldData.accentColor,  0.18));

  applyPosition(fieldData.widgetPosition || 'center');
  applyThemePreset(fieldData.themePreset || 'custom');
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

// ─── Presets de thème ─────────────────────────────────────────────────────────
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
    sub:      { icon: fieldData.iconSub      || '⭐', text: fieldData.textSub      || 'NOUVELLE SUB'   },
    resub:    { icon: fieldData.iconResub    || '🔥', text: fieldData.textResub    || 'RESUBSCRIPTION' },
    donation: { icon: fieldData.iconDonation || '💎', text: fieldData.textDonation || 'DONATION'       },
    raid:     { icon: fieldData.iconRaid     || '⚔️', text: fieldData.textRaid     || 'RAID INCOMING'  },
    cheer:    { icon: fieldData.iconCheer    || '🎉', text: fieldData.textCheer    || 'BITS'           }
  };
  var t = types[type] || types.follow;

  iconEl.textContent     = t.icon;
  typeEl.textContent     = t.text;
  usernameEl.textContent = username;
  messageEl.textContent  = message || '';
  amountEl.textContent   = amount  || '';

  loadAvatar(username);

  alertEl.classList.remove('show', 'hide');
  void alertEl.offsetWidth;
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

  // Déduplication par _id SE natif.
  // Les events sans _id (tests console) passent toujours.
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

// ─── Fonctions de test ────────────────────────────────────────────────────────
window.testAlert = function(type, name) {
  type = type || 'follow';
  name = name || 'TestUser';
  var amount = type === 'donation' ? '25 €' : type === 'cheer' ? '500 bits' : '';
  showAlert(type, name, 'Message de test', amount);
};

window.testQueue = function() {
  var types = ['follow', 'sub', 'donation', 'raid', 'cheer'];
  types.forEach(function(t, i) {
    setTimeout(function() {
      showAlert(t, 'User_' + t, 'Test queue', t === 'donation' ? '10 €' : '');
    }, i * 200);
  });
};
