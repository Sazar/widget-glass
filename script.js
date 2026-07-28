// ─── State ───────────────────────────────────────────────────────────────────
let fieldData = {};
let alertQueue = [];
let isPlaying = false;
let hideTimer = null;

// FIX double-event — garde de déduplication
let isLoading = true;           // true pendant le onWidgetLoad initial
const seenEventIds = new Set(); // stocke les IDs déjà traités

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
  // SE rejoue le dernier event juste après onWidgetLoad — on ignore tout
  // ce qui arrive dans les 500ms suivant le chargement
  setTimeout(() => { isLoading = false; }, 500);
});

// ─── Apply CSS variables from fields ─────────────────────────────────────────
function applySettings() {
  const root = document.documentElement;
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
  if (!hex || typeof hex !== 'string') return `rgba(0,245,255,${alpha})`;
  hex = hex.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  }
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

// ─── Avatar Twitch ────────────────────────────────────────────────────────────
function loadAvatar(username) {
  if (!avatarEl) return;
  if (!fieldData.showAvatar) { avatarEl.style.display = 'none'; return; }
  avatarEl.style.display = 'block';
  avatarEl.src = `https://decapi.me/twitch/avatar/${encodeURIComponent(username)}`;
  avatarEl.onerror = () => { avatarEl.style.display = 'none'; };
}

// ─── File d'attente ───────────────────────────────────────────────────────────
function enqueueAlert(type, username, message, amount) {
  alertQueue.push({ type, username, message, amount });
  if (!isPlaying) processQueue();
}

function processQueue() {
  if (alertQueue.length === 0) { isPlaying = false; return; }
  isPlaying = true;
  const item = alertQueue.shift();
  _playAlert(item.type, item.username, item.message, item.amount);
}

// ─── Lecture d'une alerte ─────────────────────────────────────────────────────
function _playAlert(type, username, message, amount) {
  const types = {
    follow:   { icon: fieldData.iconFollow   || '❤️',  text: fieldData.textFollow   || 'NOUVEAU FOLLOW' },
    sub:      { icon: fieldData.iconSub      || '⭐',  text: fieldData.textSub      || 'NOUVELLE SUB'   },
    resub:    { icon: fieldData.iconResub    || '🔥',  text: fieldData.textResub    || 'RESUBSCRIPTION' },
    donation: { icon: fieldData.iconDonation || '💎',  text: fieldData.textDonation || 'DONATION'       },
    raid:     { icon: fieldData.iconRaid     || '⚔️',  text: fieldData.textRaid     || 'RAID INCOMING'  },
    cheer:    { icon: fieldData.iconCheer    || '🎉',  text: fieldData.textCheer    || 'BITS'           }
  };

  const t = types[type] || types.follow;
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

  const duration = parseInt(fieldData.duration, 10) || 7000;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    alertEl.classList.remove('show');
    alertEl.classList.add('hide');
    setTimeout(() => {
      alertEl.classList.remove('hide');
      processQueue();
    }, 500);
  }, duration);
}

// ─── API publique ─────────────────────────────────────────────────────────────
function showAlert(type, username, message = '', amount = '') {
  enqueueAlert(type, username, message, amount);
}

// ─── StreamElements Events ────────────────────────────────────────────────────
window.addEventListener('onEventReceived', function (obj) {
  if (!obj.detail || !obj.detail.event) return;

  // FIX double-event — bloquer le replay initial de SE au chargement
  if (isLoading) return;

  const listener = obj.detail.listener;
  const data     = obj.detail.event;

  // FIX double-event — déduplication par identifiant unique
  // SE peut émettre le même event deux fois (bulk update + individual)
  const eventId = `${listener}_${data.name}_${data._id || data.createdAt || Date.now()}`;
  if (seenEventIds.has(eventId)) return;
  seenEventIds.add(eventId);
  // Nettoyer le Set après 10s pour ne pas grossir indéfiniment
  setTimeout(() => seenEventIds.delete(eventId), 10000);

  if (listener === 'follower-latest' && fieldData.showFollow) {
    showAlert('follow', data.name, data.message || '');
  }

  if (listener === 'subscriber-latest') {
    if (data.amount > 1 && fieldData.showResub) {
      showAlert('resub', data.name, `x${data.amount} mois`);
    } else if (fieldData.showSub) {
      showAlert('sub', data.name, data.message || '');
    }
  }

  if (listener === 'tip-latest' && fieldData.showDonation) {
    showAlert('donation', data.name, data.message || '', data.amount + ' €');
  }

  if (listener === 'raid-latest' && fieldData.showRaid) {
    showAlert('raid', data.name, `avec ${data.amount} viewers !`);
  }

  if (listener === 'cheer-latest' && fieldData.showCheer) {
    showAlert('cheer', data.name, data.message || '', data.amount + ' bits');
  }
});

// ─── Fonctions de test ────────────────────────────────────────────────────────
window.testAlert = function(type = 'follow', name = 'TestUser') {
  showAlert(type, name, 'Message de test', type === 'donation' ? '25 €' : type === 'cheer' ? '500 bits' : '');
};

window.testQueue = function() {
  ['follow', 'sub', 'donation', 'raid', 'cheer'].forEach((t, i) => {
    setTimeout(() => showAlert(t, 'User_' + t, 'Test queue', t === 'donation' ? '10 €' : ''), i * 200);
  });
};
