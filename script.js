let fieldData = {};

const alertEl = document.getElementById('alert');
const iconEl = document.getElementById('icon');
const typeEl = document.getElementById('type');
const usernameEl = document.getElementById('username');
const messageEl = document.getElementById('message');
const amountEl = document.getElementById('amount');

window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  applySettings();
});

function applySettings() {
  document.documentElement.style.setProperty('--widget-width', fieldData.widgetWidth + 'px');
  document.documentElement.style.setProperty('--border-radius', fieldData.borderRadius + 'px');
  document.documentElement.style.setProperty('--blur-intensity', fieldData.blurIntensity + 'px');
  document.documentElement.style.setProperty('--glass-opacity', fieldData.glassOpacity);
  document.documentElement.style.setProperty('--primary-color', fieldData.primaryColor);
  document.documentElement.style.setProperty('--accent-color', fieldData.accentColor);
  document.documentElement.style.setProperty('--icon-size', fieldData.iconSize + 'px');
  document.documentElement.style.setProperty('--type-size', fieldData.typeSize + 'px');
  document.documentElement.style.setProperty('--username-size', fieldData.usernameSize + 'px');
  document.documentElement.style.setProperty('--message-size', fieldData.messageSize + 'px');
  document.documentElement.style.setProperty('--amount-size', fieldData.amountSize + 'px');

  // Soft versions for gradients
  document.documentElement.style.setProperty('--primary-color-soft', hexToRgba(fieldData.primaryColor, 0.25));
  document.documentElement.style.setProperty('--accent-color-soft', hexToRgba(fieldData.accentColor, 0.18));
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createParticles() {
  if (!fieldData.showParticles) return;

  const container = document.getElementById('particles');
  container.innerHTML = '';
  const count = fieldData.particleCount || 55;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.style.position = 'absolute';
    p.style.width = Math.random() * 5 + 3 + 'px';
    p.style.height = p.style.width;
    p.style.background = i % 3 === 0 ? fieldData.accentColor : fieldData.primaryColor;
    p.style.borderRadius = '50%';
    p.style.left = Math.random() * 100 + '%';
    p.style.bottom = Math.random() * 80 + '%';
    p.style.opacity = Math.random() * 0.65 + 0.35;
    p.style.animation = `floatParticle ${2.5 + Math.random() * 4}s linear forwards`;
    container.appendChild(p);
  }
}

function showAlert(type, username, message = "", amount = "") {
  const types = {
    follow:   { icon: fieldData.iconFollow || "❤️", text: fieldData.textFollow || "NOUVEAU FOLLOW" },
    sub:      { icon: fieldData.iconSub || "⭐", text: fieldData.textSub || "NOUVELLE SUB" },
    resub:    { icon: fieldData.iconResub || "🔥", text: fieldData.textResub || "RESUBSCRIPTION" },
    donation: { icon: fieldData.iconDonation || "💎", text: fieldData.textDonation || "DONATION" },
    raid:     { icon: fieldData.iconRaid || "⚔️", text: fieldData.textRaid || "RAID INCOMING" }
  };

  const t = types[type] || types.follow;

  iconEl.textContent = t.icon;
  typeEl.textContent = t.text;
  usernameEl.textContent = username;
  messageEl.textContent = message;
  amountEl.textContent = amount;

  alertEl.classList.add('show');
  createParticles();

  setTimeout(() => {
    alertEl.classList.remove('show');
  }, fieldData.duration || 7000);
}

// StreamElements Events
window.addEventListener('onEventReceived', function (obj) {
  if (!obj.detail.event) return;

  const listener = obj.detail.listener;
  const data = obj.detail.event;

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
});

// Test function
window.testAlert = function(type = 'follow', name = 'TestUser') {
  showAlert(type, name, 'Message de test', type === 'donation' ? '25 €' : '');
};
