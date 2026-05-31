(function () {
  const STYLE =
    '.admin-account-bar{position:fixed;top:1rem;right:1rem;z-index:10050;display:flex;align-items:center;gap:.65rem;padding:.45rem .55rem .45rem .85rem;background:rgba(255,255,255,.92);border:1px solid rgba(0,0,0,.08);border-radius:999px;box-shadow:0 4px 20px rgba(0,0,0,.08);font-family:"Outfit",system-ui,sans-serif;font-size:.8rem;backdrop-filter:blur(8px)}' +
    '.admin-account-bar[hidden]{display:none!important}' +
    '.admin-account-email{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#3f3f46}' +
    '.admin-account-logout{border:none;background:#18181b;color:#fff;padding:.45rem .85rem;border-radius:999px;font:inherit;font-size:.78rem;font-weight:500;cursor:pointer}' +
    '.admin-account-logout:hover{background:#27272a}' +
    '.nav-container{flex-wrap:wrap;justify-content:center;gap:.25rem}' +
    '@media(max-width:720px){.admin-account-bar{top:auto;bottom:1rem;right:50%;transform:translateX(50%)}}';

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  const bar = document.createElement('div');
  bar.className = 'admin-account-bar';
  bar.hidden = true;
  bar.innerHTML =
    '<span class="admin-account-email" id="admin-account-email"></span>' +
    '<button type="button" class="admin-account-logout" id="admin-account-logout">Log out</button>';
  document.body.appendChild(bar);

  const emailEl = document.getElementById('admin-account-email');
  const logoutBtn = document.getElementById('admin-account-logout');

  function showAccount(user) {
    const email =
      (user && (user.email || (user.user_metadata && user.user_metadata.email))) || 'Signed in';
    emailEl.textContent = email;
    bar.hidden = false;
  }

  function hideAccount() {
    bar.hidden = true;
  }

  logoutBtn.addEventListener('click', function () {
    if (window.netlifyIdentity) window.netlifyIdentity.logout();
  });

  window.addEventListener('admin-auth-ready', function () {
    const user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
    if (user) showAccount(user);
  });

  window.addEventListener('admin-auth-locked', hideAccount);

  if (window.netlifyIdentity) {
    window.netlifyIdentity.on('login', function (user) {
      showAccount(user);
    });
    window.netlifyIdentity.on('logout', hideAccount);
  }
})();
