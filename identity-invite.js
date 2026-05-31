/**
 * Netlify Identity invite links use #invite_token= in the URL.
 * Capture it immediately (hash or query) and restore it if the browser drops the hash.
 */
(function () {
  const ADMIN_URL = '/admin-bbpews098ge8ht4ez4xdeg/';
  const INVITE_PAGE = '/invite.html';
  const STORAGE_INVITE = 'netlify_invite_token';

  function parseToken(name) {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const re = new RegExp('[#?&]' + name + '=([^&]+)');
    const fromHash = hash.match(re);
    if (fromHash && fromHash[1]) return decodeURIComponent(fromHash[1]);
    const fromSearch = search.match(re);
    if (fromSearch && fromSearch[1]) return decodeURIComponent(fromSearch[1]);
    return null;
  }

  window.captureNetlifyIdentityTokens = function () {
    const invite = parseToken('invite_token');
    const recovery = parseToken('recovery_token');

    if (invite) {
      try {
        sessionStorage.setItem(STORAGE_INVITE, invite);
      } catch (e) { /* ignore */ }
    }

    const hash = window.location.hash || '';
    const saved = (function () {
      try {
        return sessionStorage.getItem(STORAGE_INVITE);
      } catch (e) {
        return null;
      }
    })();

    if (saved && !hash.includes('invite_token')) {
      const target = window.location.pathname + window.location.search + '#invite_token=' + encodeURIComponent(saved);
      window.location.replace(target);
      return true;
    }

    if (recovery) {
      try {
        sessionStorage.setItem('netlify_recovery_token', recovery);
      } catch (e) { /* ignore */ }
    }

    return false;
  };

  function getHash() {
    return window.location.hash || '';
  }

  window.identityHashType = function () {
    const h = getHash();
    if (h.includes('invite_token')) return 'invite';
    if (h.includes('recovery_token')) return 'recovery';
    if (h.includes('confirmation_token')) return 'confirm';
    try {
      if (sessionStorage.getItem(STORAGE_INVITE)) return 'invite';
    } catch (e) { /* ignore */ }
    return null;
  };

  window.openNetlifyIdentityModal = function () {
    const id = window.netlifyIdentity;
    if (!id) return;
    const type = window.identityHashType();
    if (type === 'invite') {
      const saved = sessionStorage.getItem(STORAGE_INVITE);
      if (saved && !getHash().includes('invite_token')) {
        window.location.hash = 'invite_token=' + encodeURIComponent(saved);
      }
      id.open('signup');
    } else if (type === 'recovery') {
      id.open('login');
    } else {
      id.open('login');
    }
  };

  window.clearNetlifyInviteStorage = function () {
    try {
      sessionStorage.removeItem(STORAGE_INVITE);
      sessionStorage.removeItem('netlify_recovery_token');
    } catch (e) { /* ignore */ }
  };

  window.setupNetlifyIdentity = function (options) {
    options = options || {};
    const identity = window.netlifyIdentity;
    if (!identity) return false;

    identity.on('init', function (user) {
      if (user) {
        window.clearNetlifyInviteStorage();
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
      window.clearNetlifyInviteStorage();
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

  window.redirectToInvitePageIfNeeded = function () {
    const onHome = window.location.pathname === '/' ||
      window.location.pathname.endsWith('/index.html') ||
      window.location.pathname.endsWith('/');
    const hasInviteInUrl = getHash().includes('invite_token') || parseToken('invite_token');
    let hasSaved = false;
    try {
      hasSaved = !!sessionStorage.getItem(STORAGE_INVITE);
    } catch (e) { /* ignore */ }

    if (onHome && (hasInviteInUrl || hasSaved) && !window.location.pathname.includes('invite.html')) {
      const suffix = getHash().includes('invite_token')
        ? getHash()
        : (hasSaved ? '#invite_token=' + encodeURIComponent(sessionStorage.getItem(STORAGE_INVITE)) : '');
      window.location.replace(INVITE_PAGE + suffix);
      return true;
    }
    return false;
  };

  if (window.captureNetlifyIdentityTokens()) {
    return;
  }
  window.redirectToInvitePageIfNeeded();
})();
