/**
 * Netlify Identity invite / recovery links put tokens in the URL hash (#invite_token=...).
 * The widget must be on that page and open "signup" (set password), not normal login.
 */
(function () {
  const ADMIN_URL = '/admin-bbpews098ge8ht4ez4xdeg/';

  function getHash() {
    return window.location.hash || '';
  }

  window.identityHashType = function () {
    const h = getHash();
    if (h.includes('invite_token')) return 'invite';
    if (h.includes('recovery_token')) return 'recovery';
    if (h.includes('confirmation_token')) return 'confirm';
    return null;
  };

  window.openNetlifyIdentityModal = function () {
    const id = window.netlifyIdentity;
    if (!id) return;
    const type = window.identityHashType();
    if (type === 'invite') id.open('signup');
    else if (type === 'recovery') id.open('login');
    else id.open('login');
  };

  /**
   * @param {{ onLoggedIn?: function, onReadyLoggedOut?: function }} options
   */
  window.setupNetlifyIdentity = function (options) {
    options = options || {};
    const identity = window.netlifyIdentity;
    if (!identity) return false;

    identity.on('init', function (user) {
      if (user) {
        if (options.onLoggedIn) options.onLoggedIn(user);
        return;
      }
      const type = window.identityHashType();
      if (type === 'invite') {
        identity.open('signup');
      } else if (type === 'recovery') {
        identity.open('login');
      } else if (options.onReadyLoggedOut) {
        options.onReadyLoggedOut(identity);
      }
    });

    identity.on('login', function () {
      const h = getHash();
      if (h.includes('invite_token') || h.includes('recovery_token') || h.includes('confirmation_token')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      if (options.onLoggedIn) options.onLoggedIn();
    });

    identity.init();
    return true;
  };

  window.goToAdminAfterLogin = function () {
    if (!window.location.pathname.includes('admin-bbpews')) {
      window.location.href = ADMIN_URL;
    }
  };
})();
