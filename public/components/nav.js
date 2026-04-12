// ShopGraph Documentation — Sidebar Navigation
(function () {
  const VERSION = '1.0.1';
  const GITHUB_URL = 'https://github.com/laundromatic/shopgraph';

  const sections = [
    {
      title: null,
      items: [
        { label: 'Overview', href: '/' },
        { label: 'Install', href: '/install' },
      ],
    },
    {
      title: 'Features',
      items: [
        { label: 'Confidence Scoring', href: '/features/confidence' },
        { label: 'UCP Output', href: '/features/ucp' },
        { label: 'AgentReady Scoring', href: '/features/agentready' },
        { label: 'Leaderboard', href: '/leaderboard' },
        { label: 'Self-Healing', href: '/features/self-healing' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { label: 'MCP', href: '/tools/mcp' },
        { label: 'REST API', href: '/tools/api' },
        { label: 'Nodes', href: '/tools/nodes' },
      ],
    },
    {
      title: 'Resources',
      items: [
        { label: 'Changelog', href: '/changelog' },
        { label: 'Methodology', href: '/methodology' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Blog', href: '/blog' },
        { label: 'FAQ', href: '/faq' },
      ],
    },
  ];

  // Determine current path
  let currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (currentPath !== '/' && currentPath.endsWith('/')) currentPath = currentPath.slice(0, -1);
  if (currentPath === '') currentPath = '/';

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function buildSubnav(parentLi) {
    var h2s = document.querySelectorAll('.content-inner h2');
    if (h2s.length < 2) return; // Don't show subnav for pages with 0-1 sections

    var subUl = document.createElement('ul');
    subUl.className = 'nav-subitems';

    h2s.forEach(function (h2) {
      // Ensure h2 has an id for anchor linking
      if (!h2.id) {
        h2.id = slugify(h2.textContent);
      }

      var subLi = document.createElement('li');
      subLi.className = 'nav-subitem';
      var subA = document.createElement('a');
      subA.href = '#' + h2.id;
      subA.textContent = h2.textContent;
      subA.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById(h2.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', '#' + h2.id);
        }
      });
      subLi.appendChild(subA);
      subUl.appendChild(subLi);
    });

    parentLi.appendChild(subUl);

    // Scroll spy: highlight active section
    var subLinks = subUl.querySelectorAll('.nav-subitem a');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          subLinks.forEach(function (link) {
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { rootMargin: '-60px 0px -70% 0px', threshold: 0 });

    h2s.forEach(function (h2) {
      observer.observe(h2);
    });
  }

  function buildSidebar() {
    // Create mobile toggle
    const toggle = document.createElement('button');
    toggle.className = 'mobile-toggle';
    toggle.setAttribute('aria-label', 'Toggle navigation');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    document.body.appendChild(toggle);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);

    // Create sidebar
    const sidebar = document.createElement('nav');
    sidebar.className = 'sidebar';

    const nav = document.createElement('div');
    nav.className = 'sidebar-nav';

    sections.forEach(function (section) {
      const sec = document.createElement('div');
      sec.className = 'nav-section';

      if (section.title) {
        const title = document.createElement('div');
        title.className = 'nav-section-title';
        title.textContent = section.title;
        sec.appendChild(title);
      }

      const ul = document.createElement('ul');
      ul.className = 'nav-items';

      section.items.forEach(function (item) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        if (item.href === currentPath) {
          a.className = 'active';
          // Build subnav for the active page after DOM is ready
          setTimeout(function () { buildSubnav(li); }, 0);
        }
        li.appendChild(a);
        ul.appendChild(li);
      });

      sec.appendChild(ul);
      nav.appendChild(sec);
    });

    sidebar.appendChild(nav);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    footer.innerHTML = 'v' + VERSION + ' &middot; <a href="' + GITHUB_URL + '" target="_blank" rel="noopener">GitHub</a>';
    sidebar.appendChild(footer);

    document.body.appendChild(sidebar);

    // Page footer (privacy, tos, github)
    var contentInner = document.querySelector('.content-inner');
    if (contentInner) {
      var pageFooter = document.createElement('footer');
      pageFooter.style.cssText = 'max-width:var(--content-max);margin:0 auto;padding:1rem 1.5rem 3rem;border-top:1px solid rgba(0,0,0,0.06);font-size:0.75rem;color:rgba(0,0,0,0.4);display:flex;gap:1rem;align-items:center';
      pageFooter.innerHTML = '<a href="/privacy" style="color:rgba(0,0,0,0.4);text-decoration:none">Privacy</a><a href="/tos" style="color:rgba(0,0,0,0.4);text-decoration:none">Terms</a><a href="' + GITHUB_URL + '" target="_blank" rel="noopener" style="color:rgba(0,0,0,0.4);text-decoration:none">GitHub</a>';
      contentInner.parentElement.appendChild(pageFooter);
    }

    // Mobile toggle behavior
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });

    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // Wrap existing body content in layout structure
  function wrapContent() {
    const existingContent = document.querySelector('.content-inner');
    if (!existingContent) return;

    buildSidebar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wrapContent);
  } else {
    wrapContent();
  }
})();
