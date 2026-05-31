(function () {
  const STYLE = `
    .admin-auth-gate {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(244, 244, 245, 0.96);
      font-family: "Outfit", system-ui, sans-serif;
      padding: 2rem;
    }
    .admin-auth-gate[hidden] { display: none !important; }
    .admin-auth-card {
      max-width: 420px; width: 100%; background: #fff;
      border-radius: 16px; padding: 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08); text-align: center;
    }
    .admin-auth-card h1 { margin: 0 0 0.75rem; font-size: 1.35rem; }
    .admin-auth-card p { margin: 0 0 1rem; color: #52525b; line-height: 1.5; font-size: 0.95rem; }
    .admin-auth-btn {
      width: 100%; padding: 0.85rem; border: none; border-radius: 10px;
      background: #18181b; color: #fff; font-size: 1rem; cursor: pointer;
    }
    .admin-auth-btn:hover { background: #27272a; }
    .admin-auth-error { color: #b91c1c; font-size: 0.875rem; margin-top: 1rem; }
    body.admin-auth-pending > *:not(.admin-auth-gate) { visibility: hidden; }
  `;

  const gate = document.createElement('div');
  gate.className = 'admin-auth-gate admin-auth-pending';
  gate.innerHTML =
    '<div class="admin-auth-card">' +
    '<h1>Admin sign in</h1>' +
    '<p id="admin-auth-msg">Checking login…</p>' +
    '<button type="button" class="admin-auth-btn" id="admin-auth-login" hidden>Log in</button>' +
    '<p class="admin-auth-error" id="admin-auth-error" hidden></p>' +
    '</div>';
  document.body.classList.add('admin-auth-pending');
  document.body.prepend(gate);

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  const msgEl = document.getElementById('admin-auth-msg');
  const loginBtn = document.getElementById('admin-auth-login');
  const errorEl = document.getElementById('admin-auth-error');

  function showError(text) {
    errorEl.hidden = false;
    errorEl.textContent = text;
    loginBtn.hidden = false;
    msgEl.textContent = 'Sign in to manage photos.';
  }

  function unlock() {
    gate.hidden = true;
    document.body.classList.remove('admin-auth-pending');
    window.dispatchEvent(new CustomEvent('admin-auth-ready'));
  }

  function setup() {
    const identity = window.netlifyIdentity;
    if (!identity) {
      showError('Netlify Identity is not loaded. Enable Identity on your Netlify site.');
      return;
    }

    identity.on('init', function (user) {
      if (user) {
        unlock();
        return;
      }
      if (window.identityHashType && window.identityHashType() === 'invite') {
        msgEl.textContent = 'Set your password in the popup to finish your invite.';
        identity.open('signup');
        return;
      }
      msgEl.textContent = 'Log in with the email and password from your invite.';
      loginBtn.hidden = false;
    });

    identity.on('login', unlock);
    identity.on('logout', function () {
      window.location.reload();
    });

    loginBtn.addEventListener('click', function () {
      if (window.openNetlifyIdentityModal) window.openNetlifyIdentityModal();
      else identity.open('login');
    });

    identity.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
