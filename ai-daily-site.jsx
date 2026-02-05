import { useState, useEffect, useCallback } from "react";

// ─── DATA (Categories remain static) ─────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "全部", icon: "🌐" },
  { id: "news", label: "行业动态", icon: "📰" },
  { id: "tools", label: "AI 工具", icon: "🛠️" },
  { id: "research", label: "研究前沿", icon: "🔬" },
  { id: "industry", label: "商业应用", icon: "💼" },
  { id: "safety", label: "安全与伦理", icon: "🛡️" },
];

// ─── COMPONENT ───────────────────────────────────────────────────────
export default function AIDailyHub() {
  // 数据状态管理
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeCategory, setActiveCategory] = useState("all");
  const [showXHS, setShowXHS] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(() => new Date());
  const [searchQ, setSearchQ] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [animatedCards, setAnimatedCards] = useState(new Set());

  // 从 JSON 文件加载数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/news_data.json');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 验证数据格式
        if (!Array.isArray(data)) {
          throw new Error('数据格式错误：期望是一个数组');
        }
        
        setNewsData(data);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        console.error('加载数据失败:', err);
        setError(err.message);
        // 可以设置默认数据作为后备
        setNewsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // 可选：设置定时刷新（每5分钟）
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 生成小红书笔记（现在依赖 newsData）
  const xhsNote = generateXHSNote(newsData);

  // 卡片动画效果
  useEffect(() => {
    if (newsData.length === 0) return;
    
    const timer = setTimeout(() => {
      newsData.forEach((_, i) => {
        setTimeout(() => setAnimatedCards((prev) => new Set([...prev, i])), i * 80);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [activeCategory, newsData]);

  // 过滤数据
  const filtered = newsData.filter((item) => {
    const matchCat = activeCategory === "all" || item.category === activeCategory;
    const matchSearch =
      searchQ === "" ||
      item.title.includes(searchQ) ||
      item.summary.includes(searchQ) ||
      item.tags.some((t) => t.includes(searchQ));
    return matchCat && matchSearch;
  });

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(xhsNote).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [xhsNote]);

  const stats = {
    total: newsData.length,
    tools: newsData.filter((i) => i.category === "tools").length,
    hot: newsData.filter((i) => i.hot).length,
  };

  // 加载中状态
  if (loading) {
    return (
      <div style={styles.root}>
        <div style={styles.grain} />
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}>◆</div>
          <p style={styles.loadingText}>正在加载最新资讯...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div style={styles.root}>
        <div style={styles.grain} />
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>⚠️ 数据加载失败</p>
          <p style={styles.errorDetail}>{error}</p>
          <button 
            style={styles.retryBtn} 
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* ── Ambient bg grain ── */}
      <div style={styles.grain} />

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>◆</span>
            <div>
              <h1 style={styles.logoTitle}>AI DAILY</h1>
              <p style={styles.logoSub}>每日 AI 世界动态汇总</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.statsRow}>
              <Stat label="资讯数" value={stats.total} />
              <Stat label="工具数" value={stats.tools} />
              <Stat label="热点数" value={stats.hot} />
            </div>
            <div style={styles.updateBadge}>
              <span style={styles.updateDot} />
              <span style={styles.updateText}>
                已更新 {lastUpdate.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Search + Category Bar ── */}
      <div style={styles.controlBar}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            style={styles.searchInput}
            placeholder="搜索资讯、工具、标签…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <div style={styles.catRow}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              style={{
                ...styles.catBtn,
                ...(activeCategory === cat.id ? styles.catBtnActive : {}),
              }}
              onClick={() => {
                setActiveCategory(cat.id);
                setAnimatedCards(new Set());
              }}
            >
              <span style={styles.catIcon}>{cat.icon}</span>
              <span>{cat.label}</span>
              <span style={styles.catCount}>
                {cat.id === "all" ? newsData.length : newsData.filter((i) => i.category === cat.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main style={styles.main}>
        {/* News Grid */}
        <section style={styles.gridSection}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.titleAccent}>—</span> 今日汇总
            </h2>
            <span style={styles.itemCount}>{filtered.length} 项</span>
          </div>
          
          {filtered.length === 0 ? (
            <div style={styles.emptyState}>
              <p>暂无相关资讯</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {filtered.map((item, idx) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  idx={idx}
                  expanded={expandedId === item.id}
                  onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  animated={animatedCards.has(idx)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sidebar / XHS */}
        <aside style={styles.sidebar}>
          {/* Hot list mini */}
          <div style={styles.sideCard}>
            <h3 style={styles.sideTitle}>
              <span style={{ color: "#ff6b6b" }}>🔥</span> 今日 TOP 热点
            </h3>
            <div style={styles.hotList}>
              {newsData
                .filter((i) => i.hot)
                .slice(0, 5)
                .map((item, i) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" style={styles.hotItem}>
                    <span style={styles.hotRank}>{i + 1}</span>
                    <span style={styles.hotTitle}>{item.title}</span>
                  </a>
                ))}
            </div>
          </div>

          {/* XHS Note Generator */}
          <div style={styles.sideCard}>
            <div style={styles.xhsHeader}>
              <h3 style={styles.sideTitle}>
                <span>📝</span> 小红书笔记生成
              </h3>
              <button
                style={{ ...styles.xhsToggle, ...(showXHS ? styles.xhsToggleOn : {}) }}
                onClick={() => setShowXHS(!showXHS)}
              >
                {showXHS ? "收起" : "展开"}
              </button>
            </div>
            <p style={styles.xhsDesc}>
              每日自动根据汇总内容生成小红书笔记，一键复制即可发布。
            </p>
            {showXHS && (
              <div style={styles.xhsBox}>
                <pre style={styles.xhsPre}>{xhsNote}</pre>
                <div style={styles.xhsActions}>
                  <button style={styles.copyBtn} onClick={handleCopy}>
                    {copied ? "✓ 已复制！" : "📋 复制笔记"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tags cloud */}
          <div style={styles.sideCard}>
            <h3 style={styles.sideTitle}>
              <span>🏷️</span> 热门标签
            </h3>
            <div style={styles.tagCloud}>
              {[...new Set(newsData.flatMap((i) => i.tags))].map((tag) => (
                <span
                  key={tag}
                  style={styles.tag}
                  onClick={() => setSearchQ(tag)}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          AI DAILY · 数据来源：TechCrunch / MIT Technology Review / IBM Think / Crescendo AI 等 ·
          每日自动更新 · 内容仅供参考
        </p>
      </footer>
    </div>
  );
}

// ─── XIAOHONGSHU NOTE GENERATOR ──────────────────────────────────────
function generateXHSNote(newsData) {
  if (!newsData || newsData.length === 0) {
    return "暂无数据，请稍后重试...";
  }
  
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hotItems = newsData.filter((i) => i.hot).slice(0, 5);
  const toolItems = newsData.filter((i) => i.category === "tools").slice(0, 3);
  const researchItems = newsData.filter((i) => i.category === "research").slice(0, 2);

  let note = `🤖 AI日报 | ${today}\n`;
  note += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  note += `✨ 今日必看 TOP热点\n\n`;

  hotItems.forEach((item, i) => {
    note += `${["🥇", "🥈", "🥉", "④", "⑤"][i]} ${item.title}\n`;
    note += `→ ${item.summary}\n\n`;
  });

  note += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  note += `🛠️ 今日工具推荐\n\n`;
  toolItems.forEach((item) => {
    note += `💎 ${item.title}\n`;
    note += `${item.summary}\n\n`;
  });

  note += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  note += `🔬 前沿研究一瞥\n\n`;
  researchItems.forEach((item) => {
    note += `📌 ${item.title}\n`;
    note += `${item.summary}\n\n`;
  });

  note += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  note += `💡 今日 AI 金句\n`;
  note += `"2026 不是 AI 的终结，而是它从炒作走向务实的起点。"\n\n`;
  note += `🔗 更多详情请访问：AI Daily 汇总站\n`;
  note += `#AI日报 #人工智能 #AI工具 #科技资讯 #小红书`;

  return note;
}

// ── Sub-components ────────────────────────────────────────────────────
function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

function NewsCard({ item, idx, expanded, onExpand, animated }) {
  const catColor = {
    news: "#7dd3fc",
    tools: "#86efac",
    research: "#c4b5fd",
    industry: "#fcd34d",
    safety: "#fca5a5",
  };
  const color = catColor[item.category] || "#fff";

  return (
    <div
      style={{
        ...styles.card,
        opacity: animated ? 1 : 0,
        transform: animated ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.45s cubic-bezier(.22,.68,0,1.2) ${idx * 0.07}s, transform 0.45s cubic-bezier(.22,.68,0,1.2) ${idx * 0.07}s`,
      }}
    >
      {/* Hot badge */}
      {item.hot && <span style={styles.hotBadge}>🔥 热点</span>}

      {/* Category stripe */}
      <div style={{ ...styles.catStripe, background: color }} />

      {/* Cat label */}
      <div style={styles.cardCatRow}>
        <span style={{ ...styles.cardCatLabel, color }}>{CATEGORIES.find((c) => c.id === item.category)?.label}</span>
        <span style={styles.cardDate}>{item.date}</span>
      </div>

      <h3 style={styles.cardTitle}>{item.title}</h3>
      <p style={styles.cardSummary}>{item.summary}</p>

      {/* Tags */}
      <div style={styles.cardTags}>
        {item.tags.map((t) => (
          <span key={t} style={styles.cardTag}>{t}</span>
        ))}
      </div>

      {/* Footer actions */}
      <div style={styles.cardFooter}>
        <span style={styles.cardSource}>来源：{item.source}</span>
        <a href={item.url} target="_blank" rel="noreferrer" style={styles.readLink}>
          查看原文 →
        </a>
      </div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const styles = {
  root: {
    fontFamily: "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif",
    background: "#0c0e14",
    color: "#e2e4ea",
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
  },
  grain: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg '%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
    pointerEvents: "none",
    zIndex: 0,
  },
  // Loading & Error states
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    gap: 16,
  },
  loadingSpinner: {
    fontSize: 48,
    color: "#7dd3fc",
    animation: "spin 1.5s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7a99",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    color: "#ff6b6b",
    fontWeight: 600,
  },
  errorDetail: {
    fontSize: 13,
    color: "#6b7a99",
  },
  retryBtn: {
    marginTop: 16,
    background: "rgba(125,211,252,0.12)",
    border: "1px solid rgba(125,211,252,0.3)",
    borderRadius: 8,
    color: "#7dd3fc",
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: 13,
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#6b7a99",
    fontSize: 14,
  },
  // Header styles
  header: {
    position: "relative",
    zIndex: 1,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "linear-gradient(180deg, rgba(18,20,30,0.95) 0%, rgba(12,14,20,0.8) 100%)",
    padding: "24px 32px 20px",
  },
  headerInner: {
    maxWidth: 1280,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logoIcon: {
    fontSize: 34,
    color: "#7dd3fc",
    filter: "drop-shadow(0 0 12px rgba(125,211,252,0.5))",
  },
  logoTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "0.25em",
    color: "#fff",
  },
  logoSub: {
    margin: "2px 0 0",
    fontSize: 12,
    color: "#6b7a99",
    letterSpacing: "0.15em",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
  },
  statsRow: {
    display: "flex",
    gap: 20,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#7dd3fc",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7a99",
    letterSpacing: "0.05em",
  },
  updateBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(125,211,252,0.08)",
    border: "1px solid rgba(125,211,252,0.2)",
    borderRadius: 20,
    padding: "4px 12px",
  },
  updateDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 6px #4ade80",
    animation: "pulse 2s infinite",
  },
  updateText: {
    fontSize: 12,
    color: "#7dd3fc",
  },
  controlBar: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1280,
    margin: "0 auto",
    padding: "18px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "0 14px",
    maxWidth: 440,
  },
  searchIcon: {
    fontSize: 18,
    color: "#6b7a99",
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e2e4ea",
    fontSize: 14,
    padding: "10px 0",
  },
  catRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  catBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: "6px 14px",
    color: "#9aa5b8",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  catBtnActive: {
    background: "rgba(125,211,252,0.12)",
    borderColor: "rgba(125,211,252,0.35)",
    color: "#7dd3fc",
  },
  catIcon: {
    fontSize: 15,
  },
  catCount: {
    fontSize: 11,
    color: "#6b7a99",
    background: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "1px 7px",
  },
  main: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px 40px",
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 28,
    alignItems: "start",
  },
  gridSection: {},
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  titleAccent: {
    color: "#7dd3fc",
    fontSize: 20,
    fontWeight: 700,
  },
  itemCount: {
    fontSize: 12,
    color: "#6b7a99",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "20px 18px 16px",
    position: "relative",
    overflow: "hidden",
    transition: "border-color 0.25s, box-shadow 0.25s",
  },
  hotBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    fontSize: 11,
    fontWeight: 600,
    color: "#ff6b6b",
    background: "rgba(255,107,107,0.12)",
    borderRadius: 12,
    padding: "2px 8px",
  },
  catStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 3,
    height: "100%",
    opacity: 0.6,
  },
  cardCatRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardCatLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
  },
  cardDate: {
    fontSize: 11,
    color: "#6b7a99",
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1.35,
  },
  cardSummary: {
    margin: "0 0 12px",
    fontSize: 13,
    color: "#9aa5b8",
    lineHeight: 1.5,
  },
  cardTags: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  cardTag: {
    fontSize: 11,
    color: "#6b7a99",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 4,
    padding: "2px 8px",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    paddingTop: 10,
  },
  cardSource: {
    fontSize: 11,
    color: "#5a6578",
  },
  readLink: {
    fontSize: 12,
    color: "#7dd3fc",
    textDecoration: "none",
    fontWeight: 500,
  },
  // ── Sidebar ──
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  sideCard: {
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 18,
  },
  sideTitle: {
    margin: "0 0 12px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  // Hot list
  hotList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  hotItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    padding: "5px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  hotRank: {
    fontSize: 13,
    fontWeight: 700,
    color: "#7dd3fc",
    width: 18,
    textAlign: "center",
  },
  hotTitle: {
    fontSize: 13,
    color: "#c8cdd8",
    lineHeight: 1.35,
  },
  // XHS
  xhsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xhsDesc: {
    margin: "0 0 12px",
    fontSize: 12,
    color: "#6b7a99",
    lineHeight: 1.45,
  },
  xhsToggle: {
    fontSize: 12,
    color: "#7dd3fc",
    background: "rgba(125,211,252,0.1)",
    border: "1px solid rgba(125,211,252,0.25)",
    borderRadius: 14,
    padding: "3px 12px",
    cursor: "pointer",
  },
  xhsToggleOn: {
    background: "rgba(125,211,252,0.18)",
  },
  xhsBox: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    overflow: "hidden",
  },
  xhsPre: {
    margin: 0,
    padding: "14px 16px",
    fontSize: 13,
    color: "#b8bec9",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: 380,
    overflowY: "auto",
  },
  xhsActions: {
    padding: "10px 16px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    justifyContent: "center",
  },
  copyBtn: {
    background: "linear-gradient(135deg, #7dd3fc, #60a5fa)",
    border: "none",
    borderRadius: 8,
    color: "#0c0e14",
    fontWeight: 700,
    fontSize: 13,
    padding: "8px 24px",
    cursor: "pointer",
    letterSpacing: "0.04em",
  },
  // Tags cloud
  tagCloud: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    fontSize: 12,
    color: "#7dd3fc",
    background: "rgba(125,211,252,0.08)",
    border: "1px solid rgba(125,211,252,0.15)",
    borderRadius: 14,
    padding: "3px 10px",
    cursor: "pointer",
  },
  // Footer
  footer: {
    position: "relative",
    zIndex: 1,
    borderTop: "1px solid rgba(255,255,255,0.05)",
    padding: "18px 32px",
    textAlign: "center",
  },
  footerText: {
    margin: 0,
    fontSize: 11,
    color: "#4a5568",
  },
};

// ── CSS injection for animations ──
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  input::placeholder { color: #5a6578 !important; }
  a:hover { opacity: 0.75 !important; }
  button:hover { filter: brightness(1.15); }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
`;
document.head.appendChild(style);
