(function () {
  let authResolved = false;

  function resolveReady(user) {
    if (authResolved) return;
    authResolved = true;
    if (document.body) {
      document.body.classList.remove('admin-auth-pending');
    }
    const gate = document.querySelector('.admin-auth-gate');
    if (gate) gate.remove();
    if (window.__adminAuthReadyResolve) {
      window.__adminAuthReadyResolve(user || null);
    }
    window.dispatchEvent(new CustomEvent('admin-auth-ready', { detail: { user: user || null } }));
  }

  function setup() {
    if (document.body) {
      document.body.classList.remove('admin-auth-pending');
    }

    if (!window.__adminAuthReadyPromise) {
      window.__adminAuthReadyPromise = new Promise(function (resolve) {
        window.__adminAuthReadyResolve = resolve;
      });
    }

    const identity = window.netlifyIdentity;
    if (!identity || typeof identity.on !== 'function') {
      resolveReady(null);
      return;
    }

    identity.on('login', function (user) {
      resolveReady(user);
    });
    identity.on('logout', function () {
      resolveReady(null);
    });
    identity.on('init', function (user) {
      if (user && (user.id || user.email || user.jwt || user.token || user.access_token)) {
        resolveReady(user);
      } else if (!authResolved) {
        window.setTimeout(function () {
          const fallbackUser = identity.currentUser ? identity.currentUser() : null;
          if (fallbackUser && (fallbackUser.id || fallbackUser.email || fallbackUser.jwt || fallbackUser.token || fallbackUser.access_token)) {
            resolveReady(fallbackUser);
          }
        }, 800);
      }
    });

    try {
      identity.init();
      const current = identity.currentUser ? identity.currentUser() : null;
      if (current && (current.id || current.email || current.jwt || current.token || current.access_token)) {
        resolveReady(current);
      } else {
        window.setTimeout(function () {
          if (!authResolved) {
            const fallbackUser = identity.currentUser ? identity.currentUser() : null;
            if (fallbackUser && (fallbackUser.id || fallbackUser.email || fallbackUser.jwt || fallbackUser.token || fallbackUser.access_token)) {
              resolveReady(fallbackUser);
            } else {
              resolveReady(null);
            }
          }
        }, 3000);
      }
    } catch (error) {
      console.warn('Netlify Identity init failed:', error);
      resolveReady(null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
