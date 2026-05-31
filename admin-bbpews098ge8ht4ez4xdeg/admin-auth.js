(function () {
  const STYLE = `
    .admin-auth-gate {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      background: #f4f4f5;
      font-family: "Outfit", system-ui, sans-serif;
      padding: 2rem;
    }
    .admin-auth-gate[hidden] { display: none !important; }
    .admin-auth-card {
      max-width: 420px; width: 100%; background: #fff;
      border-radius: 16px; padding: 2rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); text-align: center;
    }
    .admin-auth-card h1 {
      margin: 0 0 0.75rem; font-size: 1.5rem; font-weight: 600;
      font-family: "Cormorant Garamond", Georgia, serif;
    }
    .admin-auth-card p {
      margin: 0 0 1.25rem; color: #52525b; line-height: 1.5; font-size: 0.95rem;
    }
    .admin-auth-btn {
      display: inline-block; width: 100%;
      padding: 0.85rem 1.25rem; border: none; border-radius: 10px;
      background: #18181b; color: #fff; font-size: 1rem; font-weight: 500; cursor: pointer;
    }
    .admin-auth-btn:hover { background: #27272a; }
    .admin-auth-loading { color: #71717a; font-size: 0.875rem; margin-top: 0.5rem; }
    .admin-auth-error { color: #b91c1c; font-size: 0.875rem; margin-top: 1rem; line-height: 1.4; }
    body.admin-auth-pending > *:not(.admin-auth-gate) { visibility: hidden; }
  `;

  const gate = document.createElement('div');
  gate.className = 'admin-auth-gate';
  gate.innerHTML =
    '<div class="admin-auth-card">' +
    '<h1>Visual Stories Admin</h1>' +
    '<p>Log in with your Netlify invite to manage gallery, albums, and uploads. Changes are saved for every visitor.</p>' +
    '<p class="admin-auth-loading" id="admin-auth-msg">Checking login…</p>' +
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
    msgEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = text;
    loginBtn.hidden = false;
  }

  function showLoginButton() {
    msgEl.textContent = 'Editor ready. Log in to continue.';
    msgEl.hidden = false;
    loginBtn.hidden = false;
  }

  function lock() {
    gate.hidden = false;
    document.body.classList.add('admin-auth-pending');
    window.dispatchEvent(new CustomEvent('admin-auth-locked'));
  }

  function unlock() {
    gate.hidden = true;
    document.body.classList.remove('admin-auth-pending');
    window.dispatchEvent(new CustomEvent('admin-auth-ready'));
  }

  function setup() {
    const identity = window.netlifyIdentity;
    if (!identity) {
      showError(
        'Netlify Identity is not enabled. In Netlify: Site configuration → Identity → Enable Identity.'
      );
      return;
    }

    const inviteHint = document.createElement('p');
    inviteHint.className = 'admin-auth-loading';
    inviteHint.hidden = true;
    inviteHint.textContent =
      'Invite link detected — set your new password in the popup (you choose it; none is emailed).';
    document.querySelector('.admin-auth-card').appendChild(inviteHint);

    identity.on('init', function (user) {
      if (user) {
        unlock();
        return;
      }
      if (window.identityHashType && window.identityHashType() === 'invite') {
        inviteHint.hidden = false;
        msgEl.hidden = true;
        identity.open('signup');
        return;
      }
      showLoginButton();
    });

    identity.on('login', unlock);
    identity.on('logout', function () {
      lock();
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
