/**
 * DSH Plugin Hub — 应用逻辑
 * 功能：GitHub API 数据获取、缓存、分类、搜索过滤排序、详情弹窗
 */
(function () {
  'use strict';

  // ===== 配置 =====
  const CONFIG = {
    API_BASE: 'https://api.github.com',
    TOPIC: 'dsh-plugin',
    PER_PAGE: 100,
    MAX_PAGES: 10,
    CACHE_KEY: 'dsh_plugins_cache',
    CACHE_AGE_MS: 30 * 60 * 1000, // 30 分钟缓存
    REFRESH_KEY: 'dsh_ph_refresh',
    THEME_KEY: 'dsh_ph_theme',
    CAT_KEYS: new Set(['ui', 'agent', 'memory', 'vision', 'dev', 'data', 'integration', 'productivity', 'fun', 'security']),
  };

  // ===== 分类定义 =====
  const CATEGORIES = [
    { id: 'ui', label: 'UI 与界面增强', emoji: '🎨', color: '#6366f1', desc: 'Web UI、侧边栏、终端、皮肤主题、面板增强',
      kw: ['web-ui','webui','sidebar','tui','skin','theme','panel','widget','dashboard','interface','desktop','tab','界面','皮肤','主题','侧边栏','面板','看板','桌面'] },
    { id: 'agent', label: 'Agent 编排与协作', emoji: '🤖', color: '#8b5cf6', desc: '多 Agent 团队、子代理、工作流编排、任务协作',
      kw: ['multi-agent','multiagent','subagent','sub-agent','agent-team','agent-teams','orchestrat','workflow','swarm','crew','collaborat','team','团队','协作','编排','多智能体'] },
    { id: 'memory', label: '记忆与知识', emoji: '🧠', color: '#ec4899', desc: '跨会话记忆、长期记忆、知识库、上下文管理',
      kw: ['memory','context','knowledge','remember','recall','archive','obsidian','notebook','记忆','上下文','知识','笔记'] },
    { id: 'vision', label: '视觉与多模态', emoji: '👁️', color: '#14b8a6', desc: '图像理解、OCR、视觉模型、多模态',
      kw: ['vision','ocr','image','screenshot','multimodal','vlm','visual','picture','photo','视觉','图像','图片','截图','看图'] },
    { id: 'dev', label: '开发与工具链', emoji: '🛠️', color: '#f59e0b', desc: '代码编辑、Git、终端、调试、SDK、CLI',
      kw: ['git','code','editor','sdk','cli','terminal','shell','debug','lint','testing','build','browser','npm','eslint','typescript','代码','调试','终端','开发'] },
    { id: 'data', label: '数据与搜索', emoji: '📊', color: '#22c55e', desc: '数据研究、搜索、数据库、爬虫、API 接入',
      kw: ['data','search','database','scrape','crawl','api','research','query','sql','crawler','数据','搜索','数据库','检索','爬虫'] },
    { id: 'integration', label: '集成与迁移', emoji: '🔌', color: '#0ea5e9', desc: '第三方服务接入、Claude/其他平台迁移桥接',
      kw: ['bridge','migrate','import','export','connector','integrat','claude','cursor','notion','github','slack','wechat','feishu','telegram','discord','迁移','桥接','接入','导入','导出','集成'] },
    { id: 'productivity', label: '效率与协作', emoji: '⚡', color: '#ef4444', desc: '任务管理、快捷键、效率工具、协作办公',
      kw: ['todo','task','productivity','shortcut','efficien','share','效率','任务','分享','快捷键'] },
    { id: 'fun', label: '娱乐与彩蛋', emoji: '🎮', color: '#f97316', desc: '小游戏、电子宠物、趣味彩蛋、整活插件',
      kw: ['game','pet','whale','fun','play','manner','manners','meme','troll','ads','minigame','mascot','游戏','宠物','彩蛋','娱乐','鲸鱼'] },
    { id: 'security', label: '安全与治理', emoji: '🔐', color: '#64748b', desc: '权限、沙箱、安全审计、合规',
      kw: ['security','sandbox','permission','auth','audit','safe','guard','安全','沙箱','权限','审计'] },
  ];

  // ===== 状态 =====
  const state = {
    data: null,
    category: 'all',
    sort: 'stars',
    order: 'desc',
    search: '',
    filter: null,
    visibleCount: 60,
  };

  const catMap = {};
  CATEGORIES.forEach(c => catMap[c.id] = c);

  // ===== DOM 引用 =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ===== 工具函数 =====
  function fmt(n) {
    if (!n) return '0';
    if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + ' 万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return m <= 0 ? '刚刚' : m + ' 分钟前';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' 小时前';
    const d = Math.floor(h / 24);
    if (d < 30) return d + ' 天前';
    const mo = Math.floor(d / 30);
    if (mo < 12) return mo + ' 个月前';
    return Math.floor(mo / 12) + ' 年前';
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const LANG_COLORS = {
    TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Go: '#00ADD8', Rust: '#dea584',
    Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600', Shell: '#89e051', HTML: '#e34c26',
    CSS: '#563d7c', Vue: '#41b883', Ruby: '#701516', Kotlin: '#A97BFF', Swift: '#F05138',
  };

  function isEnglish(text) {
    if (!text || !text.trim()) return false;
    const ch = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    return ch / text.length < 0.1 && /[a-zA-Z]/.test(text);
  }

  function classify(repo) {
    const haystack = [repo.name, repo.full_name, repo.description, (repo.topics || []).join(' ')].join(' ').toLowerCase();
    let best = 'other', bestScore = 0;
    for (const cat of CATEGORIES) {
      let score = 0;
      for (const k of cat.kw) {
        if (/[一-龥]/.test(k)) {
          if (haystack.includes(k)) score += 2;
        } else {
          const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)', 'i').test(haystack)) score += 2;
        }
      }
      if (score > bestScore) { bestScore = score; best = cat.id; }
    }
    return best;
  }

  // ===== 数据获取 =====
  async function fetchPluginsFromGitHub(page = 1) {
    const url = `${CONFIG.API_BASE}/search/repositories?q=topic:${CONFIG.TOPIC}&sort=stars&order=desc&per_page=${CONFIG.PER_PAGE}&page=${page}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-plugin-hub' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function loadOrFetchData() {
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CONFIG.CACHE_AGE_MS) {
        console.log('Using cached data');
        return parsed;
      }
    }

    // Fetch from GitHub
    console.log('Fetching from GitHub API...');
    const first = await fetchPluginsFromGitHub(1);
    const total = first.total_count || 0;
    console.log(`Total repos: ${total}, fetching top ${Math.min(total, CONFIG.MAX_PAGES * CONFIG.PER_PAGE)}`);

    let allItems = [...(first.items || [])];
    for (let p = 2; p <= Math.min(Math.ceil(total / CONFIG.PER_PAGE), CONFIG.MAX_PAGES); p++) {
      await new Promise(r => setTimeout(r, 600)); // Rate limiting
      const page = await fetchPluginsFromGitHub(p);
      allItems.push(...(page.items || []));
    }

    // Process and deduplicate
    const seen = new Set();
    const plugins = allItems
      .filter(r => {
        if (!r.full_name || seen.has(r.full_name)) return false;
        seen.add(r.full_name);
        return true;
      })
      .map(r => ({
        name: r.name,
        full_name: r.full_name,
        owner: r.owner?.login || '',
        avatar: r.owner?.avatar_url || '',
        html_url: r.html_url,
        homepage: r.homepage || '',
        description: r.description || '',
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        language: r.language || '',
        topics: r.topics || [],
        license: r.license?.spdx_id || '',
        created_at: r.created_at,
        updated_at: r.updated_at,
        pushed_at: r.pushed_at,
        archived: !!r.archived,
        fork: !!r.fork,
        category: classify(r),
      }))
      .filter(p => p.name !== 'deepseek-harness'); // Exclude main repo

    const payload = {
      generated_at: new Date().toISOString(),
      total_count: total,
      fetched: plugins.length,
      categories: CATEGORIES.map(({ id, label, emoji, color, desc }) => ({ id, label, emoji, color, desc })),
      plugins,
    };

    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ ...payload, timestamp: Date.now() }));
    return payload;
  }

  async function liveRefreshStars() {
    try {
      const cached = JSON.parse(localStorage.getItem(CONFIG.REFRESH_KEY) || 'null');
      if (cached && Date.now() - cached.t < 30 * 60 * 1000) return;

      const res = await fetch(`${CONFIG.API_BASE}/search/repositories?q=topic:${CONFIG.TOPIC}&sort=stars&order=desc&per_page=100`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return;
      const j = await res.json();

      const map = {};
      (j.items || []).forEach(r => { map[r.full_name] = { stars: r.stargazers_count, forks: r.forks_count, pushed_at: r.pushed_at }; });

      let changed = 0;
      state.data.plugins.forEach(p => {
        const fresh = map[p.full_name];
        if (fresh && fresh.stars !== p.stars) {
          p.stars = fresh.stars;
          p.forks = fresh.forks;
          p.pushed_at = fresh.pushed_at || p.pushed_at;
          changed++;
        }
      });

      localStorage.setItem(CONFIG.REFRESH_KEY, JSON.stringify({ t: Date.now() }));
      if (changed > 0) {
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ ...state.data, timestamp: Date.now() }));
        toast(`✨ 已刷新 ${changed} 个插件的星标数据`);
        renderAll();
      }
    } catch (e) { /* 静默降级 */ }
  }

  // ===== 渲染 =====
  function renderAll() {
    renderStats();
    renderCategories();
    renderRank();
    renderGrid();
  }

  function renderStats() {
    const sum = state.data.plugins.reduce((a, p) => a + (p.stars || 0), 0);
    $('#statPlugins').textContent = state.data.fetched;
    $('#statStars').textContent = fmt(sum);
    $('#statCats').textContent = state.data.categories.length;
    $('#statUpdated').textContent = timeAgo(state.data.generated_at);
    $('#totalPlugins').textContent = state.data.fetched;
    $('#heroBadgeText').textContent = `已连接插件市场 · 收录 ${state.data.fetched} 个插件`;
  }

  function renderCategories() {
    const bar = $('#catBar');
    const chips = state.data.categories.map(c => {
      const n = state.data.plugins.filter(p => p.category === c.id).length;
      return `<button class="cat-chip" data-cat="${c.id}" style="--cat:${c.color}"><span class="cat-emoji">${c.emoji}</span>${esc(c.label)}<span class="cat-count">${n}</span></button>`;
    }).join('');
    const total = state.data.plugins.length;
    bar.innerHTML = `<button class="cat-chip active" data-cat="all"><span class="cat-emoji">✨</span>全部<span class="cat-count">${total}</span></button>` + chips;
    bar.querySelectorAll('.cat-chip').forEach(el => {
      el.addEventListener('click', () => {
        state.category = el.dataset.cat;
        state.visibleCount = 60;
        bar.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        renderGrid();
      });
    });
  }

  function getSortedPlugins() {
    const arr = state.data.plugins.slice();
    const key = state.sort;
    arr.sort((a, b) => {
      let va, vb;
      if (key === 'stars') { va = a.stars || 0; vb = b.stars || 0; }
      else if (key === 'forks') { va = a.forks || 0; vb = b.forks || 0; }
      else {
        const ad = new Date(a[key === 'created' ? 'created_at' : 'pushed_at'] || 0).getTime();
        const bd = new Date(b[key === 'created' ? 'created_at' : 'pushed_at'] || 0).getTime();
        va = ad; vb = bd;
      }
      return state.order === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }

  function applyFilters(list) {
    return list.filter(p => {
      if (state.category !== 'all' && p.category !== state.category) return false;
      if (state.search) {
        const q = state.search.toLowerCase();
        const hay = (p.name + ' ' + p.full_name + ' ' + p.description + ' ' + (p.topics || []).join(' ')).toLowerCase();
        if (!q.split(/\s+/).every(t => hay.includes(t))) return false;
      }
      if (state.filter === 'hot' && (p.stars || 0) < 100) return false;
      if (state.filter === 'new') {
        const days = (Date.now() - new Date(p.created_at || 0).getTime()) / 86400000;
        if (days > 7) return false;
      }
      if (state.filter === 'active') {
        const days = (Date.now() - new Date(p.pushed_at || 0).getTime()) / 86400000;
        if (days > 30) return false;
      }
      if (state.filter === 'cn' && !/[一-龥]/.test(p.description || '')) return false;
      return true;
    });
  }

  function cardHTML(p, i) {
    const cat = catMap[p.category] || { emoji: '📦', color: '#64748b', label: '其他' };
    const langColor = LANG_COLORS[p.language] || '#94a3b8';
    const rank = state.sort === 'stars' && state.order === 'desc' && state.category === 'all' && !state.search && !state.filter && i < 3;
    return `
      <article class="plugin-card" data-full="${esc(p.full_name)}" style="animation-delay:${Math.min(i % 12, 11) * 30}ms">
        ${rank ? `<span class="rank-badge">TOP ${i + 1}</span>` : ''}
        <span class="cat-badge" style="background:${cat.color}">${cat.emoji} ${esc(cat.label)}</span>
        <div class="top">
          <div class="plugin-avatar"><img src="${esc(p.avatar)}" alt="" loading="lazy" onerror="this.style.display='none'" /></div>
          <div>
            <div class="plugin-name">${esc(p.name)}</div>
            <div class="plugin-owner">${esc(p.owner)}</div>
          </div>
        </div>
        <div class="plugin-desc">${esc(p.description) || '暂无描述'}</div>
        <div class="plugin-meta">
          <span class="meta-item meta-stars">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
            ${fmt(p.stars)}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0Z"/></svg>
            ${fmt(p.forks)}
          </span>
          <span class="meta-item"><span class="lang-dot" style="background:${langColor}"></span>${esc(p.language) || '—'}</span>
          <span class="meta-item" style="margin-left:auto">${timeAgo(p.pushed_at)}</span>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = applyFilters(getSortedPlugins());
    const grid = $('#pluginGrid');
    $('#resultCount').textContent = `共 ${list.length} 个插件 · 数据实时同步`;
    $('#resultSummary').textContent = `显示 ${Math.min(state.visibleCount, list.length)} / ${list.length} 个`;

    const visible = list.slice(0, state.visibleCount);
    grid.innerHTML = visible.map((p, i) => cardHTML(p, i)).join('') ||
      '<div class="empty"><div class="big">🔍</div>没有找到匹配的插件，换个关键词试试吧</div>';

    grid.querySelectorAll('.plugin-card').forEach(el => {
      el.addEventListener('click', () => openModal(el.dataset.full));
    });

    const btn = $('#loadMore');
    const wrap = $('#loadMoreWrap');
    if (list.length > state.visibleCount) {
      wrap.style.display = 'block';
    } else {
      wrap.style.display = 'none';
    }
  }

  function renderRank() {
    const top = state.data.plugins.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 10);
    $('#rankList').innerHTML = top.map((p, i) => {
      const cat = catMap[p.category] || { emoji: '📦', color: '#64748b', label: '其他' };
      return `
        <div class="rank-item ${i < 3 ? 'top' + (i + 1) : ''}" data-full="${esc(p.full_name)}">
          <div class="rank-no">${i + 1}</div>
          <div class="rank-info">
            <div class="rank-name">${esc(p.name)}</div>
            <div class="rank-desc">${esc(p.description) || ''}</div>
          </div>
          <span class="rank-cat" style="background:${cat.color}">${cat.emoji} ${esc(cat.label)}</span>
          <div class="rank-stars">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
            ${fmt(p.stars)}
          </div>
        </div>`;
    }).join('');
    $('#rankList').querySelectorAll('.rank-item').forEach(el => {
      el.addEventListener('click', () => openModal(el.dataset.full));
    });
  }

  // ===== 详情弹窗 =====
  function openModal(fullName) {
    const p = state.data.plugins.find(x => x.full_name === fullName);
    if (!p) return;
    const cat = catMap[p.category] || { emoji: '📦', color: '#64748b', label: '其他' };
    const topics = (p.topics || []).slice(0, 8).map(t => `<span class="topic-tag">#${esc(t)}</span>`).join('');
    const installCmd = `dsh plugin --profile web add github:${p.owner}/${p.name}`;
    const showTranslate = isEnglish(p.description);

    $('#modal').innerHTML = `
      <button class="modal-close" id="modalClose">✕</button>
      <div class="modal-head">
        <div class="modal-head-left">
          <div class="modal-avatar"><img src="${esc(p.avatar)}" alt="" /></div>
          <div>
            <div class="modal-title">${esc(p.name)}</div>
            <div class="modal-owner">${esc(p.full_name)} · ${cat.emoji} ${esc(cat.label)}</div>
          </div>
        </div>
        ${showTranslate ? '<button class="btn btn-ghost" id="translateBtn" style="flex:none;padding:8px 14px;font-size:13px">🌐 翻译</button>' : ''}
      </div>
      <div class="modal-desc" id="modalDesc">${esc(p.description) || '暂无描述'}</div>
      <div class="modal-translated" id="modalTranslated" style="display:none"></div>
      <div class="modal-stats">
        <div class="modal-stat"><div class="num" style="color:var(--star)">⭐ ${fmt(p.stars)}</div><div class="lbl">Stars</div></div>
        <div class="modal-stat"><div class="num">${fmt(p.forks)}</div><div class="lbl">Forks</div></div>
        <div class="modal-stat"><div class="num">${esc(p.language) || '—'}</div><div class="lbl">语言</div></div>
        <div class="modal-stat"><div class="num">${esc(p.license) || '—'}</div><div class="lbl">协议</div></div>
        <div class="modal-stat"><div class="num">${timeAgo(p.updated_at)}</div><div class="lbl">更新</div></div>
      </div>
      ${topics ? `<div class="modal-topics">${topics}</div>` : ''}
      <div class="code-block install-cmd" id="installCmd" style="position:relative">
        <span class="code-prompt">$</span> ${esc(installCmd)}
        <button class="copy-btn" id="copyBtn">复制</button>
      </div>
      <div class="modal-actions">
        <a class="btn btn-primary" href="${esc(p.html_url)}" target="_blank" rel="noopener">GitHub 主页 ↗</a>
        ${p.homepage ? `<a class="btn btn-ghost" href="${esc(p.homepage)}" target="_blank" rel="noopener">项目主页</a>` : ''}
      </div>`;

    $('#modalOverlay').classList.add('open');

    // 关闭
    $('#modalClose').addEventListener('click', () => $('#modalOverlay').classList.remove('open'));
    $('#modalOverlay').addEventListener('click', e => { if (e.target === $('#modalOverlay')) $('#modalOverlay').classList.remove('open'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#modalOverlay').classList.remove('open'); });

    // 复制
    $('#copyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(installCmd).then(() => {
        const btn = $('#copyBtn');
        btn.textContent = '已复制!';
        setTimeout(() => btn.textContent = '复制', 1500);
        toast('✅ 安装命令已复制');
      });
    });

    // 翻译
    if (showTranslate) {
      $('#translateBtn').addEventListener('click', async () => {
        const target = $('#modalTranslated');
        if (target.style.display !== 'none') {
          target.style.display = 'none';
          $('#translateBtn').textContent = '🌐 翻译';
          return;
        }
        try {
          const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(p.description)}&langpair=en|zh-CN`);
          const data = await res.json();
          const translated = data.responseData?.translatedText;
          if (translated && translated !== p.description) {
            target.innerHTML = `<div class="translated-label">🌐 中文翻译</div><div class="translated-text">${esc(translated)}</div>`;
            target.style.display = 'block';
            $('#translateBtn').textContent = '🌐 隐藏';
          } else {
            $('#translateBtn').textContent = '😅 翻译失败';
            setTimeout(() => $('#translateBtn').textContent = '🌐 翻译', 1800);
          }
        } catch (e) {
          $('#translateBtn').textContent = '😅 翻译失败';
          setTimeout(() => $('#translateBtn').textContent = '🌐 翻译', 1800);
        }
      });
    }
  }

  // ===== 事件绑定 =====
  function bindEvents() {
    // 排序
    $('#sortSeg').addEventListener('click', e => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      state.sort = btn.dataset.sort;
      state.visibleCount = 60;
      $$('#sortSeg .seg-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      renderGrid();
    });

    $('#sortOrder').addEventListener('click', () => {
      state.order = state.order === 'desc' ? 'asc' : 'desc';
      $('#sortOrder').classList.toggle('desc', state.order === 'desc');
      renderGrid();
    });

    // 过滤
    $('#filterChips').addEventListener('click', e => {
      const chip = e.target.closest('.fchip');
      if (!chip) return;
      state.filter = state.filter === chip.dataset.f ? null : chip.dataset.f;
      state.visibleCount = 60;
      $$('#filterChips .fchip').forEach(x => x.classList.remove('active'));
      if (state.filter) chip.classList.add('active');
      renderGrid();
    });

    // 搜索
    let debounce;
    $('#heroSearch').addEventListener('input', e => {
      state.search = e.target.value.trim();
      state.visibleCount = 60;
      clearTimeout(debounce);
      debounce = setTimeout(renderGrid, 180);
    });

    // 快捷搜索
    $('#heroQuick').addEventListener('click', e => {
      const chip = e.target.closest('.quick-chip');
      if (!chip) return;
      $('#heroSearch').value = chip.dataset.q;
      state.search = chip.dataset.q;
      state.visibleCount = 60;
      renderGrid();
      document.getElementById('browse').scrollIntoView({ behavior: 'smooth' });
    });

    // 加载更多
    $('#loadMore').addEventListener('click', () => { state.visibleCount += 60; renderGrid(); });

    // 刷新
    const refreshClicks = [];
    $('#refreshBtn').addEventListener('click', async () => {
      const now = Date.now();
      while (refreshClicks.length && now - refreshClicks[0] >= 5000) refreshClicks.shift();
      if (refreshClicks.length >= 3) { toast('请稍后再试'); $('#refreshBtn').classList.add('is-rate-limited'); setTimeout(() => $('#refreshBtn').classList.remove('is-rate-limited'), 400); return; }
      refreshClicks.push(now);
      $('#refreshBtn').disabled = true;
      $('#refreshBtn').classList.add('spinning');
      try {
        const data = await loadOrFetchData();
        state.data = data;
        state.visibleCount = 60;
        renderAll();
        toast(`✨ 已刷新到最新数据 · 共 ${data.fetched} 个插件`);
      } catch (e) {
        toast('刷新失败，请稍后重试');
        console.error(e);
      } finally {
        $('#refreshBtn').classList.remove('spinning');
        $('#refreshBtn').disabled = false;
      }
    });

    // 主题切换
    const root = document.documentElement;
    const savedTheme = localStorage.getItem(CONFIG.THEME_KEY);
    if (savedTheme) root.dataset.theme = savedTheme;
    $('#themeToggle').addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      localStorage.setItem(CONFIG.THEME_KEY, next);
    });

    // ⌘K / Ctrl+K
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('#heroSearch').focus();
      }
    });
  }

  // ===== Toast =====
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ===== 启动 =====
  async function init() {
    try {
      state.data = await loadOrFetchData();
      renderAll();
      setTimeout(() => liveRefreshStars(), 5000);
    } catch (e) {
      $('#heroBadgeText').textContent = '⚠️ 数据加载失败，请稍后重试';
      console.error('Init failed:', e);
    }
    bindEvents();
  }

  init();
})();
