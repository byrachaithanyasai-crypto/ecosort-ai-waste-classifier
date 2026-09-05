import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "scan", label: "Scan Waste", icon: "scan" },
  { id: "history", label: "History", icon: "clock" },
  { id: "review", label: "Review Queue", icon: "shield" },
  { id: "insights", label: "Insights", icon: "chart" },
];

const FALLBACK_CATEGORIES = [
  {
    name: "Recyclable",
    description:
      "Paper, plastic, metal and glass materials entering appropriate recycling streams.",
    icon: "recycle",
  },
  {
    name: "Organic",
    description:
      "Biodegradable materials that can be handled through organic processing.",
    icon: "leaf",
  },
  {
    name: "Hazardous",
    description:
      "Items requiring safer specialist handling and responsible disposal.",
    icon: "shield",
  },
];

function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    scan: (
      <>
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
        <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        <path d="M7 12h10" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l7 3v5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V6l7-3z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
    camera: (
      <>
        <path d="M4 7h4l1.5-2h5L16 7h4v12H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14-5L4 8" />
        <path d="M4 4v4h4" />
        <path d="M4 13a8 8 0 0 0 14 5l2-2" />
        <path d="M20 20v-4h-4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4C10 4 5 8 5 15c0 2.8 2.2 5 5 5 7 0 11-5 10-16z" />
        <path d="M4 20c3-4 6-6 11-8" />
      </>
    ),
    recycle: (
      <>
        <path d="m9 5 2-3 3 5" />
        <path d="M11 2h3l2 3" />
        <path d="M16 5h3l2 4-3 1" />
        <path d="m21 9-3 1-2-3" />
        <path d="m18 13 2 3-3 5h-5l1.5-3" />
        <path d="M17 21h-5l-2-3" />
        <path d="m10 18-2 3H4l-2-4 3-3" />
        <path d="m2 17 3-3 3 1" />
        <path d="m7 15 2-3" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </>
    ),
    external: (
      <>
        <path d="M14 5h5v5" />
        <path d="m19 5-8 8" />
        <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.info}</svg>;
}

function App() {
  const [page, setPage] = useState("overview");
  const [history, setHistory] = useState([]);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [selectedResult, setSelectedResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try {
      return localStorage.getItem("ecosort_onboarding_complete") !== "true";
    } catch {
      return true;
    }
  });

  const finishOnboarding = useCallback(() => {
    try {
      localStorage.setItem("ecosort_onboarding_complete", "true");
    } catch {
      // Ignore storage restrictions; onboarding can still be dismissed.
    }
    setOnboardingOpen(false);
  }, []);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const api = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || `Request failed (${response.status})`
      );
    }

    return data;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      api("/health"),
      api("/history?limit=100"),
      api("/review-queue?limit=100"),
      api("/stats"),
      api("/categories"),
    ]);

    const [healthResult, historyResult, queueResult, statsResult, categoriesResult] =
      results;

    if (healthResult.status === "fulfilled") {
      setHealth(healthResult.value);
    } else {
      setHealth(null);
    }

    if (historyResult.status === "fulfilled") {
      setHistory(
        Array.isArray(historyResult.value)
          ? historyResult.value
          : historyResult.value.items || []
      );
    }

    if (queueResult.status === "fulfilled") {
      setQueue(
        Array.isArray(queueResult.value)
          ? queueResult.value
          : queueResult.value.items || []
      );
    }

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    }

    if (categoriesResult.status === "fulfilled") {
      const incoming = Array.isArray(categoriesResult.value)
        ? categoriesResult.value
        : categoriesResult.value.categories;

      if (Array.isArray(incoming) && incoming.length) {
        setCategories(
          incoming.map((item) =>
            typeof item === "string"
              ? { name: item, description: "", icon: "recycle" }
              : item
          )
        );
      }
    }

    setLoading(false);
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigate = (nextPage) => {
    setPage(nextPage);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openResult = (result) => {
    setSelectedResult(result);
    setPage("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <div className="app-shell">
      <AmbientBackground />
      <ProductLayoutFixes />

      <Header
        page={page}
        navigate={navigate}
        health={health}
        mobileMenu={mobileMenu}
        setMobileMenu={setMobileMenu}
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={setNotificationsOpen}
        queueCount={queue.length}
      />

      <main className="app-main">
        {page === "overview" && (
          <OverviewPage
            stats={stats}
            history={history}
            queue={queue}
            health={health}
            loading={loading}
            categories={categories}
            navigate={navigate}
            openResult={openResult}
          />
        )}

        {page === "scan" && (
          <ScanPage
            api={api}
            navigate={navigate}
            openResult={openResult}
            showToast={showToast}
            reloadData={loadData}
          />
        )}

        {page === "result" && selectedResult && (
          <ResultPage
            result={selectedResult}
            api={api}
            navigate={navigate}
            showToast={showToast}
            reloadData={loadData}
          />
        )}

        {page === "history" && (
          <HistoryPage
            history={history}
            loading={loading}
            openResult={openResult}
            navigate={navigate}
            onClearHistory={clearHistory}
          />
        )}

        {page === "review" && (
          <ReviewPage
            queue={queue}
            loading={loading}
            api={api}
            showToast={showToast}
            reloadData={loadData}
            openResult={openResult}
          />
        )}

        {page === "insights" && (
          <InsightsPage
            stats={stats}
            history={history}
            categories={categories}
            loading={loading}
          />
        )}

        {!selectedResult && page === "result" && (
          <EmptyState
            icon="scan"
            title="No scan selected"
            description="Run a new scan to see the classification result."
            action="Scan waste"
            onAction={() => navigate("scan")}
          />
        )}
      </main>

      <MobileBottomNav page={page} navigate={navigate} />

      {onboardingOpen && (
        <OnboardingOverlay
          onComplete={finishOnboarding}
          onScan={() => {
            finishOnboarding();
            navigate("scan");
          }}
        />
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
}

function OnboardingOverlay({ onComplete, onScan }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      number: "01",
      eyebrow: "SEE",
      title: "Start with the waste.",
      text: "Upload an image or capture the item directly with your device camera.",
      icon: "scan",
    },
    {
      number: "02",
      eyebrow: "UNDERSTAND",
      title: "Let EcoSort read it.",
      text: "The vision model identifies the likely material and measures how confident the prediction is.",
      icon: "chart",
    },
    {
      number: "03",
      eyebrow: "ACT",
      title: "Make the right decision.",
      text: "Follow disposal guidance and verify the result when the confidence signal says a second look matters.",
      icon: "recycle",
    },
  ];
  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-label="EcoSort introduction">
      <div className="onboarding-card">
        <div className="onboarding-brand">
          <span className="brand-mark"><Icon name="recycle" size={18} /></span>
          <span><strong>EcoSort</strong><small>AI WASTE INTELLIGENCE</small></span>
        </div>

        <div className="onboarding-progress">
          {steps.map((item, index) => (
            <span key={item.number} className={index <= step ? "active" : ""} />
          ))}
        </div>

        <div className="onboarding-content">
          <div className="onboarding-visual">
            <span className="onboarding-number">{current.number}</span>
            <div className="onboarding-icon"><Icon name={current.icon} size={34} /></div>
            <span className="small-eyebrow">{current.eyebrow}</span>
          </div>

          <div className="onboarding-copy">
            <span className="small-eyebrow">WELCOME TO ECOSORT</span>
            <h1>{current.title}</h1>
            <p>{current.text}</p>
          </div>
        </div>

        <div className="onboarding-footer">
          <button className="onboarding-skip" onClick={onComplete}>Skip</button>
          <div className="onboarding-actions">
            <span>{step + 1} / {steps.length}</span>
            <button
              className="primary-button"
              onClick={() => (last ? onScan() : setStep((value) => value + 1))}
            >
              {last ? "Start scanning" : "Next"}
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductLayoutFixes() {
  return (
    <style>{`
      .section-heading.centered,
      .section-heading.centered > *,
      .section-heading.centered h2,
      .section-heading.centered p { text-align: center; }
      .section-heading.centered { width: 100%; margin-left: auto; margin-right: auto; }
      .section-heading.centered p { margin-left: auto; margin-right: auto; }

      .method-grid { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 16px !important; align-items: stretch; }
      .method-card { min-width: 0; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
      .method-card p { max-width: 260px; }

      .waste-streams-grid { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 18px !important; align-items: stretch; }
      .waste-stream-card { min-width: 0; text-align: center; }
      .stream-top, .stream-footer { justify-content: center; }

      .quality-overview { width: 100%; }
      .quality-score { display: grid !important; grid-template-columns: 210px minmax(0, 1fr) !important; align-items: center !important; gap: 28px !important; }
      .quality-ring { position: relative !important; width: 120px !important; height: 120px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; margin: 0 auto !important; }
      .quality-ring strong, .quality-ring small { position: static !important; left: auto !important; transform: none !important; width: auto !important; text-align: center !important; }
      .quality-ring strong { line-height: 1 !important; }
      .quality-ring small { margin-top: 4px !important; line-height: 1 !important; }
      .workflow-line { display: grid !important; grid-template-columns: 26px minmax(0, 1fr) !important; align-items: center !important; gap: 10px !important; }
      .workflow-line small { display: none !important; }

      .nav-item { display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 9px !important; white-space: nowrap !important; }
      .nav-count { flex: 0 0 22px !important; width: 22px !important; height: 22px !important; min-width: 22px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; margin: 0 0 0 2px !important; line-height: 1 !important; }

      .insight-hero-grid { display: grid !important; grid-template-columns: minmax(0, 1.25fr) minmax(360px, .85fr) !important; gap: 18px !important; align-items: stretch !important; }
      .distribution-chart { display: grid !important; grid-template-columns: minmax(220px, .85fr) minmax(260px, 1.15fr) !important; align-items: center !important; gap: 34px !important; padding: 34px !important; }
      .distribution-donut { margin: 0 auto !important; }
      .distribution-legend { min-width: 0; }
      .legend-label { display: grid !important; grid-template-columns: 12px minmax(0,1fr) auto !important; align-items: center !important; gap: 9px !important; }

      .page-intro { width: 100%; }

      .onboarding-backdrop { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(7, 24, 18, .34); backdrop-filter: blur(12px); }
      .onboarding-card { width: min(760px, 100%); background: #fff; border: 1px solid rgba(27, 74, 58, .12); border-radius: 28px; box-shadow: 0 28px 80px rgba(16, 49, 38, .18); padding: 26px; }
      .onboarding-brand { display: flex; align-items: center; gap: 11px; }
      .onboarding-brand > span:last-child { display: flex; flex-direction: column; }
      .onboarding-brand strong { font-size: 17px; line-height: 1; }
      .onboarding-brand small { margin-top: 4px; font-size: 9px; letter-spacing: .16em; color: #81928b; }
      .onboarding-progress { display: flex; gap: 7px; margin: 25px 0 28px; }
      .onboarding-progress span { height: 3px; flex: 1; border-radius: 999px; background: #e7eeeb; }
      .onboarding-progress span.active { background: #176b53; }
      .onboarding-content { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 42px; align-items: center; min-height: 300px; }
      .onboarding-visual { height: 280px; border-radius: 22px; background: linear-gradient(145deg, #edf6f1, #f8fbf9); border: 1px solid #dce9e3; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
      .onboarding-number { font-size: 58px; font-weight: 700; line-height: 1; color: #1f7b60; }
      .onboarding-icon { width: 88px; height: 88px; border: 1px solid #c9ded4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 18px 0; color: #176b53; background: rgba(255,255,255,.72); }
      .onboarding-copy h1 { margin: 12px 0 14px; font-size: clamp(34px, 5vw, 54px); line-height: .98; letter-spacing: -.045em; }
      .onboarding-copy p { max-width: 470px; color: #687a73; font-size: 16px; line-height: 1.7; margin: 0; }
      .onboarding-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 26px; padding-top: 20px; border-top: 1px solid #e4ece8; }
      .onboarding-skip { border: 0; background: transparent; color: #708079; font: inherit; cursor: pointer; padding: 8px 0; }
      .onboarding-actions { display: flex; align-items: center; gap: 15px; }
      .onboarding-actions > span { color: #87958f; font-size: 13px; }

      @media (max-width: 900px) {
        .method-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        .waste-streams-grid { grid-template-columns: 1fr !important; }
        .insight-hero-grid { grid-template-columns: 1fr !important; }
        .distribution-chart { grid-template-columns: 1fr !important; }
        .quality-score { grid-template-columns: 1fr !important; text-align: center; }
        .quality-score > div:last-child { text-align: center; }
        .onboarding-content { grid-template-columns: 1fr; gap: 24px; min-height: auto; }
        .onboarding-visual { height: 180px; }
        .onboarding-number { font-size: 42px; }
        .onboarding-icon { width: 64px; height: 64px; margin: 10px 0; }
      }

      @media (max-width: 600px) {
        .onboarding-backdrop { padding: 12px; }
        .onboarding-card { border-radius: 22px; padding: 20px; }
        .onboarding-copy h1 { font-size: 34px; }
        .onboarding-copy p { font-size: 14px; }
        .method-grid { grid-template-columns: 1fr !important; }
        .distribution-chart { padding: 22px !important; }
      }
    `}</style>
  );
}

function AmbientBackground() {
  return (
    <div className="ambient-layer" aria-hidden="true">
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="ambient-grid" />
    </div>
  );
}

function Header({
  page,
  navigate,
  health,
  mobileMenu,
  setMobileMenu,
  notificationsOpen,
  setNotificationsOpen,
  queueCount,
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="EcoSort home"
        >
          <span className="brand-mark">
            <Icon name="recycle" size={20} strokeWidth={1.7} />
          </span>

          <span className="brand-copy">
            <strong>EcoSort</strong>
            <span>AI waste intelligence</span>
          </span>
        </button>

        <nav className={`desktop-nav ${mobileMenu ? "is-open" : ""}`}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.id === "review" && queueCount > 0 && (
                <span className="nav-count">{queueCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <div className="system-status">
            <span
              className={`status-dot ${
                health?.status === "healthy" ? "online" : ""
              }`}
            />
            <span>{health?.status === "healthy" ? "Operational" : "Offline"}</span>
          </div>

          <div className="notification-wrap">
            <button
              className="icon-button"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label="Notifications"
            >
              <Icon name="bell" size={19} />
              {queueCount > 0 && <span className="notification-dot" />}
            </button>

            {notificationsOpen && (
              <div className="notification-popover">
                <div className="popover-title">
                  <strong>Notifications</strong>
                  <span>Live</span>
                </div>

                <div className="notification-item">
                  <span className="notification-icon">
                    <Icon name="shield" size={16} />
                  </span>
                  <div>
                    <strong>
                      {queueCount
                        ? `${queueCount} scan${
                            queueCount > 1 ? "s" : ""
                          } need review`
                        : "No reviews pending"}
                    </strong>
                    <p>
                      {queueCount
                        ? "Open the review queue to validate uncertain results."
                        : "Everything is clear right now."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu((value) => !value)}
            aria-label="Menu"
          >
            <Icon name={mobileMenu ? "close" : "menu"} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}

function OverviewPage({
  stats,
  history,
  queue,
  health,
  loading,
  categories,
  navigate,
  openResult,
}) {
  const total = Number(stats?.total_predictions ?? history.length ?? 0);
  const averageConfidence = Number(
    stats?.average_confidence ??
      stats?.avg_confidence ??
      average(history.map((item) => item.confidence))
  );

  const categoryCounts = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      count: history.filter(
        (item) =>
          String(item.category || "").toLowerCase() ===
          String(category.name || "").toLowerCase()
      ).length,
    }));
  }, [categories, history]);

  return (
    <div className="page-container">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            ECO SORT / CONTROL CENTER
          </div>

          <h1>
            Turn every scan into
            <span> the right action.</span>
          </h1>

          <p>
            A production-ready waste intelligence workspace that combines
            computer vision, confidence measurement and responsible disposal
            guidance.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button large"
              onClick={() => navigate("scan")}
            >
              <Icon name="scan" size={18} />
              Scan waste
              <Icon name="arrow" size={17} />
            </button>

            <button
              className="text-button"
              onClick={() => navigate("history")}
            >
              View scan history
              <Icon name="arrow" size={16} />
            </button>
          </div>

          <div className="hero-trust">
            <span className="live-pill">
              <span className="pulse-dot" />
              AI engine ready
            </span>

            <span className="hero-trust-copy">
              {health?.model_loaded
                ? `Model ${health.model_version || "active"}`
                : "Connect backend to activate AI"}
            </span>
          </div>
        </div>

        <div className="hero-product-visual">
          <div className="visual-window">
            <div className="visual-window-top">
              <div className="window-dots">
                <span />
                <span />
                <span />
              </div>
              <span>LIVE ANALYSIS</span>
            </div>

            <div className="visual-scan-area">
              <div className="visual-object">
                <div className="object-ring">
                  <Icon name="recycle" size={54} strokeWidth={1.25} />
                </div>

                <div className="object-label">
                  <span>Detected object</span>
                  <strong>Waste item</strong>
                </div>
              </div>

              <div className="visual-confidence">
                <span>CONFIDENCE</span>
                <strong>{averageConfidence ? `${averageConfidence.toFixed(1)}%` : "—"}</strong>
                <div className="mini-progress">
                  <span style={{ width: `${Math.min(100, averageConfidence)}%` }} />
                </div>
              </div>

              <div className="visual-corner top-left" />
              <div className="visual-corner top-right" />
              <div className="visual-corner bottom-left" />
              <div className="visual-corner bottom-right" />
              <div className="visual-scan-line" />
            </div>
          </div>

          <div className="floating-product-card">
            <div className="floating-icon">
              <Icon name="check" size={16} />
            </div>
            <div>
              <span>Next action</span>
              <strong>Dispose responsibly</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="Total scans"
          value={loading ? "—" : formatNumber(total)}
          detail="Across this workspace"
          icon="scan"
        />

        <MetricCard
          label="Average confidence"
          value={
            loading || !averageConfidence
              ? "—"
              : `${averageConfidence.toFixed(1)}%`
          }
          detail="Model confidence"
          icon="chart"
        />

        <MetricCard
          label="Needs review"
          value={loading ? "—" : formatNumber(queue.length)}
          detail="Human validation queue"
          icon="shield"
          emphasis={queue.length > 0}
        />

        <MetricCard
          label="System state"
          value={health?.status === "healthy" ? "Ready" : "Offline"}
          detail={health?.model_version || "API unavailable"}
          icon="leaf"
          success={health?.status === "healthy"}
        />
      </section>

      <section className="section-block">
        <SectionHeading
          eyebrow="THE ECOSORT METHOD"
          title="From image to responsible action."
          description="Every scan follows the same transparent path — identify the object, measure confidence, then recommend what happens next."
          centered
        />

        <div className="method-grid">
          <MethodCard
            number="01"
            eyebrow="STEP 01"
            title="See"
            description="Upload a waste image or capture one directly through your device camera."
          />
          <MethodCard
            number="02"
            eyebrow="STEP 02"
            title="Understand"
            description="The computer-vision model evaluates the object and ranks its likely material."
          />
          <MethodCard
            number="03"
            eyebrow="STEP 03"
            title="Measure"
            description="Confidence and image quality make uncertainty visible instead of hiding it."
          />
          <MethodCard
            number="04"
            eyebrow="STEP 04"
            title="Act"
            description="Get disposal guidance and route uncertain decisions to human validation."
          />
        </div>
      </section>

      <section className="section-block">
        <SectionHeading
          eyebrow="WASTE STREAMS"
          title="Built around the disposal decision."
          description="EcoSort translates model-level material predictions into practical disposal categories."
          centered
        />

        <div className="waste-streams-grid">
          {categoryCounts.map((category) => (
            <WasteStreamCard
              key={category.name}
              category={category}
            />
          ))}
        </div>
      </section>

      <section className="workspace-grid">
        <div className="panel activity-panel">
          <PanelHeader
            eyebrow="RECENT ACTIVITY"
            title="Latest scans"
            action="View all"
            onAction={() => navigate("history")}
          />

          {loading ? (
            <SkeletonRows count={4} />
          ) : history.length ? (
            <div className="activity-list">
              {history.slice(0, 5).map((item) => (
                <ActivityRow
                  key={item.prediction_id || item.id}
                  item={item}
                  onClick={() => openResult(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon="clock"
              title="No scans yet"
              description="Your recent activity will appear here."
              action="Run first scan"
              onAction={() => navigate("scan")}
            />
          )}
        </div>

        <div className="panel mission-panel">
          <PanelHeader eyebrow="WORKFLOW" title="Decision quality" />

          <div className="quality-overview">
            <div className="quality-score">
              <span className="quality-ring">
                <strong>
                  {averageConfidence
                    ? Math.round(averageConfidence)
                    : "—"}
                </strong>
                <small>%</small>
              </span>

              <div>
                <strong>Confidence matters.</strong>
                <p>
                  EcoSort exposes uncertainty so low-confidence predictions
                  can be reviewed instead of silently trusted.
                </p>
              </div>
            </div>

            <div className="workflow-mini">
              <WorkflowLine label="Identify" active />
              <WorkflowLine label="Measure confidence" active />
              <WorkflowLine label="Recommend action" active />
              <WorkflowLine
                label="Human validation"
                active={queue.length > 0}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, icon, emphasis, success }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${success ? "success" : ""}`}>
        <Icon name={icon} size={18} />
      </div>

      <div className="metric-content">
        <span>{label}</span>
        <strong className={emphasis ? "emphasis" : ""}>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function MethodCard({ number, eyebrow, title, description }) {
  return (
    <article className="method-card">
      <span className="method-number">{number}</span>
      <span className="small-eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

function WasteStreamCard({ category }) {
  const icon =
    category.icon ||
    ({
      Recyclable: "recycle",
      Organic: "leaf",
      Hazardous: "shield",
    }[category.name] || "recycle");

  return (
    <article className="waste-stream-card">
      <div className="stream-top">
        <span className="stream-icon">
          <Icon name={icon} size={20} />
        </span>
        <span className="stream-label">DISPOSAL STREAM</span>
      </div>

      <h3>{category.name}</h3>

      <p>
        {category.description ||
          "Responsible disposal guidance based on the detected material."}
      </p>

      <div className="stream-footer">
        <span className="stream-status">
          <span />
          AI supported
        </span>
      </div>
    </article>
  );
}

function PanelHeader({ eyebrow, title, action, onAction }) {
  return (
    <div className="panel-header">
      <div>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
      </div>

      {action && (
        <button className="panel-action" onClick={onAction}>
          {action}
          <Icon name="arrow" size={15} />
        </button>
      )}
    </div>
  );
}

function ActivityRow({ item, onClick }) {
  const category = item.category || "Unknown";
  const confidence = Number(item.confidence || 0);

  return (
    <button className="activity-row" onClick={onClick}>
      <span className={`activity-icon ${category.toLowerCase()}`}>
        <Icon
          name={
            category === "Organic"
              ? "leaf"
              : category === "Hazardous"
              ? "shield"
              : "recycle"
          }
          size={17}
        />
      </span>

      <span className="activity-main">
        <strong>{item.detected_item || "Waste item"}</strong>
        <small>
          {category} · {formatDate(item.created_at)}
        </small>
      </span>

      <span className="activity-confidence">
        <strong>{confidence.toFixed(1)}%</strong>
        <small>confidence</small>
      </span>

      <Icon name="arrow" size={16} />
    </button>
  );
}

function WorkflowLine({ label, active }) {
  return (
    <div className={`workflow-line ${active ? "active" : ""}`}>
      <span className="workflow-dot">
        {active && <Icon name="check" size={11} />}
      </span>
      <span>{label}</span>
    </div>
  );
}

function ScanPage({ api, navigate, openResult, showToast, reloadData }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [quality, setQuality] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const selectFile = useCallback((selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      showToast("Please select a valid image file.", "error");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      showToast("Image must be smaller than 5 MB.", "error");
      return;
    }

    setFile(selectedFile);

    const url = URL.createObjectURL(selectedFile);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });

    setQuality(null);
  }, [showToast]);

  const analyzeImage = useCallback(async () => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await api("/analyze-image", {
        method: "POST",
        body: formData,
      });

      setQuality(result);
    } catch (error) {
      setQuality({
        quality_status: "Unknown",
        score: null,
        warning: error.message,
      });
    }
  }, [api, file]);

  useEffect(() => {
    if (file) analyzeImage();
  }, [file, analyzeImage]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }, []);

  const closeCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setCameraError("");
  }, [stopCamera]);

  const openCamera = async () => {
    setCameraError("");
    setCameraReady(false);
    setCameraOpen(true);
  };

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access is not supported by this browser."
          );
        }

        let stream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (error) {
        if (cancelled) return;

        if (error.name === "NotAllowedError") {
          setCameraError(
            "Camera permission was blocked. Allow camera access in your browser settings and try again."
          );
        } else if (error.name === "NotFoundError") {
          setCameraError("No camera was found on this device.");
        } else if (error.name === "NotReadableError") {
          setCameraError(
            "The camera is already being used by another application."
          );
        } else {
          setCameraError(
            error.message || "Unable to start the camera."
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview, stopCamera]);

  const capturePhoto = async () => {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext("2d");

    if (!context) {
      showToast("Camera capture failed.", "error");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showToast("Unable to capture image.", "error");
          return;
        }

        const capturedFile = new File(
          [blob],
          `ecosort-camera-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );

        selectFile(capturedFile);
        closeCamera();
        showToast("Photo captured. Ready to scan.");
      },
      "image/jpeg",
      0.92
    );
  };

  const runPrediction = async () => {
    if (!file || scanning) return;

    setScanning(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await api("/predict", {
        method: "POST",
        body: formData,
      });

      await reloadData();

      openResult(result);
      showToast("Waste classified successfully.");
    } catch (error) {
      showToast(error.message || "Prediction failed.", "error");
    } finally {
      setScanning(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setQuality(null);

    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return "";
    });
  };

  return (
    <div className="page-container">
      <PageIntro
        eyebrow="SCAN WORKSPACE"
        title="Classify waste with confidence."
        description="Capture or upload an item. EcoSort checks image quality, runs the vision model, measures confidence and returns the recommended disposal action."
      />

      <div className="scan-layout">
        <section className="scan-workspace-card">
          {!file ? (
            <div
              className={`drop-zone ${dragActive ? "drag-active" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                selectFile(event.dataTransfer.files?.[0]);
              }}
            >
              <div className="drop-icon">
                <Icon name="scan" size={28} strokeWidth={1.4} />
              </div>

              <h2>Start with an image</h2>

              <p>
                Drop a waste photo here, upload from your device, or use your
                camera.
              </p>

              <div className="scan-action-row">
                <label className="primary-button">
                  <Icon name="upload" size={17} />
                  Upload image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    hidden
                    onChange={(event) =>
                      selectFile(event.target.files?.[0])
                    }
                  />
                </label>

                <button
                  className="secondary-button"
                  onClick={openCamera}
                >
                  <Icon name="camera" size={17} />
                  Use camera
                </button>
              </div>

              <div className="drop-meta">
                <span>JPG / PNG</span>
                <span>Up to 5 MB</span>
                <span>AI analysis</span>
              </div>
            </div>
          ) : (
            <div className="selected-image-layout">
              <div className="image-preview">
                <img src={preview} alt="Selected waste" />

                <div className="preview-overlay">
                  <span>
                    <Icon name="check" size={14} />
                    Image loaded
                  </span>

                  <button
                    className="preview-remove"
                    onClick={clearSelection}
                    aria-label="Remove image"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              </div>

              <div className="scan-details">
                <div>
                  <span className="small-eyebrow">READY TO ANALYZE</span>
                  <h2>{file.name}</h2>
                  <p>{formatBytes(file.size)}</p>
                </div>

                <div className="quality-card">
                  <div className="quality-card-icon">
                    <Icon
                      name={
                        quality?.quality_status === "good"
                          ? "check"
                          : "info"
                      }
                      size={17}
                    />
                  </div>

                  <div>
                    <span>IMAGE QUALITY</span>
                    <strong>
                      {quality?.quality_status || "Analyzing"}
                    </strong>

                    {quality?.score != null && (
                      <small>
                        Score {Math.round(Number(quality.score))}/100
                      </small>
                    )}
                  </div>
                </div>

                <button
                  className="primary-button scan-now-button"
                  onClick={runPrediction}
                  disabled={scanning}
                >
                  {scanning ? (
                    <>
                      <span className="button-spinner" />
                      Analyzing image…
                    </>
                  ) : (
                    <>
                      <Icon name="scan" size={17} />
                      Run AI classification
                      <Icon name="arrow" size={16} />
                    </>
                  )}
                </button>

                <button
                  className="secondary-button full-width"
                  onClick={clearSelection}
                  disabled={scanning}
                >
                  Choose another image
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="scan-side-panel">
          <div className="side-card">
            <span className="small-eyebrow">HOW IT WORKS</span>

            <div className="scan-steps">
              <ScanStep number="01" title="Image quality" active />
              <ScanStep number="02" title="Material detection" />
              <ScanStep number="03" title="Confidence score" />
              <ScanStep number="04" title="Disposal guidance" />
            </div>
          </div>

          <div className="side-card subtle">
            <div className="side-card-icon">
              <Icon name="shield" size={18} />
            </div>

            <strong>Built for uncertainty.</strong>
            <p>
              Low-confidence decisions can be routed to manual validation
              instead of being presented as certain.
            </p>
          </div>
        </aside>
      </div>

      {scanning && (
        <div className="scan-processing-card">
          <div className="processing-animation">
            <span />
            <span />
            <span />
          </div>

          <div>
            <strong>EcoSort is analyzing the image</strong>
            <p>
              Inspecting visual features, ranking materials and preparing
              disposal guidance.
            </p>
          </div>

          <span className="processing-live">LIVE</span>
        </div>
      )}

      {cameraOpen && (
        <div className="camera-modal-backdrop">
          <div className="camera-modal">
            <div className="camera-modal-header">
              <div>
                <span className="small-eyebrow">CAMERA CAPTURE</span>
                <h2>Frame the waste item.</h2>
              </div>

              <button
                className="icon-button"
                onClick={closeCamera}
                aria-label="Close camera"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="camera-stage">
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                muted
                playsInline
              />

              {!cameraReady && !cameraError && (
                <div className="camera-overlay-message">
                  <span className="camera-loader" />
                  <strong>Starting camera…</strong>
                  <p>Waiting for browser camera permission.</p>
                </div>
              )}

              {cameraError && (
                <div className="camera-overlay-message error">
                  <div className="camera-error-icon">
                    <Icon name="info" size={20} />
                  </div>
                  <strong>Camera unavailable</strong>
                  <p>{cameraError}</p>

                  <button
                    className="secondary-button"
                    onClick={() => {
                      setCameraError("");
                      setCameraReady(false);
                      setCameraOpen(false);
                      window.setTimeout(() => setCameraOpen(true), 80);
                    }}
                  >
                    <Icon name="refresh" size={16} />
                    Try again
                  </button>
                </div>
              )}

              {cameraReady && (
                <>
                  <div className="camera-corner top-left" />
                  <div className="camera-corner top-right" />
                  <div className="camera-corner bottom-left" />
                  <div className="camera-corner bottom-right" />
                  <div className="camera-scan-line" />

                  <div className="camera-ready-badge">
                    <span />
                    Camera ready
                  </div>
                </>
              )}
            </div>

            <div className="camera-modal-footer">
              <div>
                <span className="camera-tip">
                  <Icon name="info" size={14} />
                  Keep the item centered and well lit.
                </span>
              </div>

              <button
                className="primary-button"
                onClick={capturePhoto}
                disabled={!cameraReady}
              >
                <Icon name="camera" size={18} />
                Capture photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScanStep({ number, title, active }) {
  return (
    <div className={`scan-step ${active ? "active" : ""}`}>
      <span>{number}</span>
      <strong>{title}</strong>
      {active && <Icon name="check" size={14} />}
    </div>
  );
}

function ResultPage({
  result,
  api,
  navigate,
  showToast,
  reloadData,
}) {
  const confidence = Number(result.confidence || 0);
  const needsReview =
    result.verification_required ||
    result.review_status === "review_recommended" ||
    confidence < 75;

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [correctedCategory, setCorrectedCategory] = useState("");

  const submitFeedback = async (isCorrect) => {
    try {
      const query = new URLSearchParams({
        is_correct: String(isCorrect),
      });

      if (!isCorrect && correctedCategory) {
        query.set("corrected_category", correctedCategory);
      }

      await api(
        `/feedback?prediction_id=${encodeURIComponent(
          result.prediction_id
        )}&${query.toString()}`,
        { method: "POST" }
      );

      setFeedbackSent(true);
      setCorrect(isCorrect);
      showToast(
        isCorrect
          ? "Thanks — prediction confirmed."
          : "Thanks — correction recorded."
      );
      await reloadData();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  return (
    <div className="page-container">
      <div className="result-topbar">
        <button className="back-button" onClick={() => navigate("scan")}>
          <Icon name="arrow" size={16} />
          Back to scanner
        </button>

        <span className="result-id">
          Prediction {result.prediction_id || "—"}
        </span>
      </div>

      <section className="result-layout">
        <div className="result-main-card">
          <div className="result-header">
            <div>
              <span className="small-eyebrow">AI CLASSIFICATION</span>
              <h1>{result.detected_item || "Waste item"}</h1>
              <p>
                Classified as{" "}
                <strong>{result.category || "Unknown"}</strong>
              </p>
            </div>

            <ResultStatus
              confidence={confidence}
              reviewStatus={result.review_status}
            />
          </div>

          <div className="confidence-section">
            <div className="confidence-ring-large">
              <svg viewBox="0 0 120 120">
                <circle
                  className="ring-track"
                  cx="60"
                  cy="60"
                  r="50"
                />
                <circle
                  className="ring-value"
                  cx="60"
                  cy="60"
                  r="50"
                  strokeDasharray={`${Math.min(
                    314,
                    confidence * 3.14
                  )} 314`}
                />
              </svg>

              <div className="confidence-center">
                <strong>{confidence.toFixed(1)}%</strong>
                <span>confidence</span>
              </div>
            </div>

            <div className="confidence-copy">
              <span className="small-eyebrow">MEASURED CONFIDENCE</span>
              <h2>
                {confidence >= 90
                  ? "High confidence."
                  : confidence >= 75
                  ? "Review recommended."
                  : "Human validation recommended."}
              </h2>

              <p>
                {result.confidence_message ||
                  "EcoSort exposes the model's confidence so you can make a better-informed disposal decision."}
              </p>

              {needsReview && (
                <div className="review-warning">
                  <Icon name="shield" size={17} />
                  <div>
                    <strong>Validation recommended</strong>
                    <p>
                      This prediction is below EcoSort's high-confidence
                      threshold. Consider manual verification before disposal.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="result-divider" />

          <div className="guidance-section">
            <div className="guidance-heading">
              <div>
                <span className="small-eyebrow">NEXT ACTION</span>
                <h2>Dispose responsibly.</h2>
              </div>

              <span className="guidance-icon">
                <Icon name="recycle" size={21} />
              </span>
            </div>

            <div className="guidance-box">
              <p>
                {result.guidance ||
                  result.disposal_guidance ||
                  "Follow your local waste management guidance for this material."}
              </p>
            </div>
          </div>

          <div className="feedback-section">
            <div>
              <span className="small-eyebrow">VALIDATE THE MODEL</span>
              <h3>Was this prediction correct?</h3>
            </div>

            {!feedbackSent ? (
              <div className="feedback-actions">
                <button
                  className="feedback-button"
                  onClick={() => submitFeedback(true)}
                >
                  <Icon name="check" size={17} />
                  Yes, correct
                </button>

                <button
                  className="feedback-button"
                  onClick={() => setCorrect(false)}
                >
                  <Icon name="close" size={17} />
                  No, correct it
                </button>
              </div>
            ) : (
              <div className="feedback-confirmed">
                <Icon name="check" size={16} />
                {correct ? "Prediction confirmed." : "Correction recorded."}
              </div>
            )}

            {correct === false && !feedbackSent && (
              <div className="correction-form">
                <select
                  value={correctedCategory}
                  onChange={(event) =>
                    setCorrectedCategory(event.target.value)
                  }
                >
                  <option value="">Select correct category</option>
                  <option value="Recyclable">Recyclable</option>
                  <option value="Organic">Organic</option>
                  <option value="Hazardous">Hazardous</option>
                </select>

                <button
                  className="primary-button"
                  disabled={!correctedCategory}
                  onClick={() => submitFeedback(false)}
                >
                  Submit correction
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="result-sidebar">
          <div className="panel result-panel">
            <PanelHeader eyebrow="MODEL RANKING" title="Top predictions" />

            <div className="prediction-list">
              {(result.top_predictions || result.top_3 || []).map(
                (prediction, index) => {
                  const name =
                    prediction.class ||
                    prediction.label ||
                    prediction.category ||
                    prediction.name ||
                    "Unknown";

                  const probability = Number(
                    prediction.confidence ??
                      prediction.probability ??
                      prediction.score ??
                      0
                  );

                  return (
                    <div className="prediction-item" key={`${name}-${index}`}>
                      <div className="prediction-meta">
                        <span className="prediction-rank">
                          0{index + 1}
                        </span>
                        <strong>{name}</strong>
                        <span>{probability.toFixed(1)}%</span>
                      </div>

                      <div className="prediction-bar">
                        <span
                          style={{
                            width: `${Math.min(100, probability)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="panel result-panel">
            <PanelHeader eyebrow="IMAGE QUALITY" title="Capture health" />

            <QualityRow
              label="Status"
              value={
                result.image_quality?.quality_status ||
                result.quality_status ||
                "—"
              }
            />

            <QualityRow
              label="Score"
              value={
                result.image_quality?.score != null
                  ? `${Math.round(result.image_quality.score)}/100`
                  : "—"
              }
            />

            <QualityRow
              label="Processing"
              value={
                result.processing_time_ms != null
                  ? `${Math.round(result.processing_time_ms)} ms`
                  : "—"
              }
            />

            <QualityRow
              label="Model"
              value={result.model_version || "—"}
            />
          </div>

          <button
            className="primary-button full-width"
            onClick={() => navigate("scan")}
          >
            <Icon name="scan" size={17} />
            Scan another item
          </button>
        </aside>
      </section>
    </div>
  );
}

function ResultStatus({ confidence, reviewStatus }) {
  let label = "High confidence";
  let className = "high";

  if (reviewStatus === "verified") {
    label = "Verified";
    className = "verified";
  } else if (confidence < 75) {
    label = "Review needed";
    className = "review";
  } else if (confidence < 90) {
    label = "Review recommended";
    className = "review";
  }

  return (
    <span className={`result-status ${className}`}>
      <span />
      {label}
    </span>
  );
}

function QualityRow({ label, value }) {
  return (
    <div className="quality-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HistoryPage({ history, loading, openResult, navigate, onClearHistory }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !search ||
        `${item.detected_item || ""} ${item.category || ""} ${
          item.prediction_id || ""
        }`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || item.category === filter;

      return matchesSearch && matchesFilter;
    });
  }, [history, search, filter]);

  return (
    <div className="page-container">
      <PageIntro
        eyebrow="SCAN HISTORY"
        title="A record of every decision."
        description="Review past predictions, confidence levels, validation status and the decisions EcoSort helped you make."
        action={
          <div className="history-intro-actions">
            <button
              className="secondary-button"
              onClick={() => {
                if (!history.length) return;
                const confirmed = window.confirm(
                  "Clear the current history view? Saved records will remain in the backend."
                );
                if (confirmed) {
                  onClearHistory();
                }
              }}
            >
              Clear history
            </button>

            <button
              className="primary-button"
              onClick={() => navigate("scan")}
            >
              <Icon name="plus" size={17} />
              New scan
            </button>
          </div>
        }
      />

      <div className="history-toolbar">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scans..."
          />
        </div>

        <div className="filter-group">
          {["All", "Recyclable", "Organic", "Hazardous"].map(
            (option) => (
              <button
                key={option}
                className={filter === option ? "active" : ""}
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            )
          )}
        </div>
      </div>

      <section className="panel history-panel">
        <div className="history-header">
          <div>
            <span className="small-eyebrow">ACTIVITY LOG</span>
            <h2>{filtered.length} scans</h2>
          </div>

          <span className="history-sort">
            <Icon name="clock" size={15} />
            Newest first
          </span>
        </div>

        {loading ? (
          <SkeletonRows count={7} />
        ) : filtered.length ? (
          <div className="history-table">
            <div className="history-table-head">
              <span>Prediction</span>
              <span>Category</span>
              <span>Confidence</span>
              <span>Status</span>
              <span>Time</span>
              <span />
            </div>

            {filtered.map((item) => (
              <button
                className="history-table-row"
                key={item.prediction_id || item.id}
                onClick={() => openResult(item)}
              >
                <div>
                  <strong>{item.detected_item || "Waste item"}</strong>
                  <small>{item.prediction_id || "—"}</small>
                </div>

                <span
                  className={`category-chip ${String(
                    item.category || ""
                  ).toLowerCase()}`}
                >
                  {item.category || "Unknown"}
                </span>

                <strong>
                  {Number(item.confidence || 0).toFixed(1)}%
                </strong>

                <span
                  className={`validation-chip ${
                    item.review_status === "verified"
                      ? "verified"
                      : item.review_status === "review_recommended"
                      ? "review"
                      : "normal"
                  }`}
                >
                  {item.review_status === "verified"
                    ? "Verified"
                    : item.review_status === "review_recommended"
                    ? "Review"
                    : "AI result"}
                </span>

                <small>{formatDate(item.created_at)}</small>

                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="clock"
            title="Nothing found"
            description={
              search
                ? "Try another search term."
                : "Run your first waste scan to build your activity history."
            }
            action="Start scanning"
            onAction={() => navigate("scan")}
          />
        )}
      </section>
    </div>
  );
}

function ReviewPage({
  queue,
  loading,
  api,
  showToast,
  reloadData,
  openResult,
}) {
  const [selected, setSelected] = useState(null);
  const [finalCategory, setFinalCategory] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const verify = async () => {
    if (!selected || !finalCategory || submitting) return;

    setSubmitting(true);

    try {
      const query = new URLSearchParams({
        final_category: finalCategory,
        reviewer_note: note || "Manually verified by reviewer.",
      });

      await api(
        `/verify/${encodeURIComponent(
          selected.prediction_id
        )}?${query.toString()}`,
        { method: "POST" }
      );

      showToast("Prediction manually verified.");
      setSelected(null);
      setFinalCategory("");
      setNote("");
      await reloadData();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <PageIntro
        eyebrow="HUMAN VALIDATION"
        title="Review the uncertain decisions."
        description="This queue keeps model uncertainty visible. Validate predictions that need a second look and turn them into trusted outcomes."
      />

      <div className="review-summary-grid">
        <MetricCard
          label="Awaiting review"
          value={queue.length}
          detail="Current queue"
          icon="shield"
          emphasis={queue.length > 0}
        />

        <MetricCard
          label="Workflow"
          value="Human + AI"
          detail="Decision quality"
          icon="check"
        />

        <MetricCard
          label="Trigger"
          value="< 75%"
          detail="Recommended threshold"
          icon="chart"
        />
      </div>

      <section className="panel review-panel">
        <PanelHeader
          eyebrow="REVIEW QUEUE"
          title="Predictions awaiting validation"
        />

        {loading ? (
          <SkeletonRows count={5} />
        ) : queue.length ? (
          <div className="review-list">
            {queue.map((item) => (
              <div
                className="review-row"
                key={item.prediction_id || item.id}
              >
                <div className="review-object">
                  <div className="review-object-icon">
                    <Icon name="scan" size={19} />
                  </div>

                  <div>
                    <strong>{item.detected_item || "Waste item"}</strong>
                    <span>{item.prediction_id}</span>
                  </div>
                </div>

                <div className="review-confidence">
                  <span>Confidence</span>
                  <strong>
                    {Number(item.confidence || 0).toFixed(1)}%
                  </strong>
                </div>

                <div>
                  <span
                    className={`category-chip ${String(
                      item.category || ""
                    ).toLowerCase()}`}
                  >
                    {item.category || "Unknown"}
                  </span>
                </div>

                <button
                  className="primary-button compact"
                  onClick={() => {
                    setSelected(item);
                    setFinalCategory(item.category || "");
                  }}
                >
                  Review
                  <Icon name="arrow" size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="check"
            title="Review queue is clear."
            description="No predictions currently require manual validation."
          />
        )}
      </section>

      {selected && (
        <div className="modal-backdrop">
          <div className="verification-modal">
            <div className="modal-header">
              <div>
                <span className="small-eyebrow">MANUAL VERIFICATION</span>
                <h2>Validate this prediction.</h2>
              </div>

              <button
                className="icon-button"
                onClick={() => setSelected(null)}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="verification-summary">
              <div className="verification-icon">
                <Icon name="scan" size={24} />
              </div>

              <div>
                <strong>{selected.detected_item || "Waste item"}</strong>
                <span>
                  AI prediction: {selected.category || "Unknown"} ·{" "}
                  {Number(selected.confidence || 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="form-field">
              <label>Final category</label>
              <select
                value={finalCategory}
                onChange={(event) =>
                  setFinalCategory(event.target.value)
                }
              >
                <option value="">Select final category</option>
                <option value="Recyclable">Recyclable</option>
                <option value="Organic">Organic</option>
                <option value="Hazardous">Hazardous</option>
              </select>
            </div>

            <div className="form-field">
              <label>Reviewer note</label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional context for this verification..."
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                disabled={!finalCategory || submitting}
                onClick={verify}
              >
                {submitting ? "Saving…" : "Confirm verification"}
                {!submitting && <Icon name="check" size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightsPage({ stats, history, categories, loading }) {
  const counts = categories.map((category) => ({
    ...category,
    count: history.filter(
      (item) => item.category === category.name
    ).length,
  }));

  const total = history.length || 0;

  return (
    <div className="page-container">
      <PageIntro
        eyebrow="INSIGHTS"
        title="Understand your waste stream."
        description="A practical view of scan activity, material distribution and model performance using the data EcoSort has actually recorded."
      />

      <section className="insight-hero-grid">
        <div className="panel insight-chart-panel">
          <PanelHeader
            eyebrow="CATEGORY DISTRIBUTION"
            title="Where your scans go"
          />

          {loading ? (
            <div className="chart-placeholder" />
          ) : total ? (
            <div className="distribution-chart">
              <div className="distribution-donut">
                <div>
                  <strong>{total}</strong>
                  <span>total scans</span>
                </div>
              </div>

              <div className="distribution-legend">
                {counts.map((item) => {
                  const percentage =
                    total > 0 ? (item.count / total) * 100 : 0;

                  return (
                    <div className="legend-row" key={item.name}>
                      <div className="legend-label">
                        <span
                          className={`legend-dot ${String(
                            item.name
                          ).toLowerCase()}`}
                        />
                        <strong>{item.name}</strong>
                        <span>{item.count}</span>
                      </div>

                      <div className="legend-bar">
                        <span
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              icon="chart"
              title="Not enough data yet"
              description="Insights will become useful after a few scans."
            />
          )}
        </div>

        <div className="panel insight-performance-panel">
          <PanelHeader
            eyebrow="MODEL PERFORMANCE"
            title="Operational signals"
          />

          <InsightMetric
            label="Average confidence"
            value={
              stats?.average_confidence != null
                ? `${Number(stats.average_confidence).toFixed(1)}%`
                : `${average(
                    history.map((item) => item.confidence)
                  ).toFixed(1)}%`
            }
            icon="chart"
          />

          <InsightMetric
            label="Total predictions"
            value={
              stats?.total_predictions != null
                ? formatNumber(stats.total_predictions)
                : formatNumber(history.length)
            }
            icon="scan"
          />

          <InsightMetric
            label="Verified outcomes"
            value={
              stats?.verified_predictions != null
                ? formatNumber(stats.verified_predictions)
                : formatNumber(
                    history.filter(
                      (item) => item.review_status === "verified"
                    ).length
                  )
            }
            icon="shield"
          />

          <InsightMetric
            label="Review rate"
            value={
              total
                ? `${(
                    (history.filter(
                      (item) =>
                        item.review_status === "review_recommended"
                    ).length /
                      total) *
                    100
                  ).toFixed(1)}%`
                : "0%"
            }
            icon="check"
          />
        </div>
      </section>

      <section className="section-block compact-section">
        <SectionHeading
          eyebrow="PRODUCT PRINCIPLE"
          title="AI should explain uncertainty."
          description="A good waste classifier is not only accurate. It should communicate confidence, make correction easy and keep humans in the loop when the decision matters."
          centered
        />
      </section>
    </div>
  );
}

function InsightMetric({ label, value, icon }) {
  return (
    <div className="insight-metric">
      <span className="metric-icon">
        <Icon name={icon} size={17} />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action, className = "" }) {
  return (
    <div className={`page-intro ${className}`}>
      <div>
        <div className="eyebrow">
          <span className="eyebrow-line" />
          {eyebrow}
        </div>

        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {action && <div className="page-intro-action">{action}</div>}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}) {
  return (
    <div className={`section-heading ${centered ? "centered" : ""}`}>
      <span className="small-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
  compact = false,
}) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <div className="empty-icon">
        <Icon name={icon} size={22} />
      </div>

      <strong>{title}</strong>
      <p>{description}</p>

      {action && (
        <button className="secondary-button" onClick={onAction}>
          {action}
          <Icon name="arrow" size={15} />
        </button>
      )}
    </div>
  );
}

function SkeletonRows({ count = 5 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          <span />
          <div>
            <span />
            <span />
          </div>
          <span />
        </div>
      ))}
    </div>
  );
}

function Toast({ message, type }) {
  return (
    <div className={`toast ${type}`}>
      <span className="toast-icon">
        <Icon name={type === "error" ? "info" : "check"} size={15} />
      </span>
      <span>{message}</span>
    </div>
  );
}

function MobileBottomNav({ page, navigate }) {
  return (
    <nav className="mobile-bottom-nav">
      {[
        { id: "overview", label: "Home", icon: "grid" },
        { id: "scan", label: "Scan", icon: "scan" },
        { id: "history", label: "History", icon: "clock" },
        { id: "insights", label: "Insights", icon: "chart" },
      ].map((item) => (
        <button
          key={item.id}
          className={page === item.id ? "active" : ""}
          onClick={() => navigate(item.id)}
        >
          <Icon name={item.icon} size={19} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function average(values) {
  const valid = values
    .map(Number)
    .filter((value) => Number.isFinite(value));

  if (!valid.length) return 0;

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(date) {
  if (!date) return "Unknown time";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return String(date);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export default App;