'use strict';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'cpus', label: 'CPUs', href: '/#cpus' },
  { key: 'compare', label: 'Comparar', href: '/comparar' },
  { key: 'articles', label: 'Artigos', href: '/analises' },
  { key: 'forum', label: 'Fórum', href: '/forum' },
  { key: 'community', label: 'Comunidade', href: '/comunidade' },
  { key: 'tools', label: 'Ferramentas', href: '/ferramentas' }
];

function navLinks(activeKey) {
  return NAV_ITEMS.map(item => `<a href="${item.href}" class="nav-link${item.key === activeKey ? ' active' : ''}">${item.label}</a>`).join('\n');
}

function replacePrimaryNav(html, activeKey, options = {}) {
  const links = navLinks(activeKey);
  const userSlot = options.userSlot || '';
  const inner = options.linksBox ? `<div class="nav-links-box">${links}</div>${userSlot}` : `${links}${userSlot}`;
  const nav = `<nav class="portal-nav" aria-label="Navegação principal"><div class="nav-container">${inner}</div></nav>`;

  if (/<nav\s+class="portal-nav"[\s\S]*?<\/nav>/i.test(html)) {
    return html.replace(/<nav\s+class="portal-nav"[\s\S]*?<\/nav>/i, nav);
  }
  if (/<nav>[\s\S]*?<\/nav>/i.test(html)) {
    return html.replace(/<nav>[\s\S]*?<\/nav>/i, nav);
  }
  return html.replace(/<body([^>]*)>/i, `<body$1>\n${nav}`);
}

module.exports = { NAV_ITEMS, navLinks, replacePrimaryNav };
