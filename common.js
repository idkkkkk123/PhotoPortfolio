// =====================================================
// COMMON.JS — Static photography showcase (no backend)
// =====================================================

const STORAGE_KEYS = {
  tutorialDone: 'portfolioTutorialDone'
};

function setActiveNav() {
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-btn[href]').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    link.classList.toggle('active', href === current);
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Sort photo-like items by name (static site has no dates/sizes from server)
function sortPhotos(items, sortType) {
  const sorted = [...items];
  switch (sortType) {
    case 'nameAsc':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'nameDesc':
      return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    case 'newest':
    case 'oldest':
    default:
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
}
