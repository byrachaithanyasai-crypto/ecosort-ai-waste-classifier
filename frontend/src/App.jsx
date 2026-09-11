import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://ecosort-ai-waste-classifier-1.onrender.com";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "scan", label: "Scan Waste", icon: "scan" },
  { id: "history", label: "History", icon: "clock" },
  { id: "review", label: "Review Queue", icon: "shield", adminOnly: true },
  { id: "insights", label: "Insights", icon: "chart" },
  { id: "gamification", label: "GreenPoints", icon: "trophy" },
];


const AWARD_DEPARTMENTS = [
  { label: "Computer Science & Engineering", value: "CSE" },
  { label: "Electronics & Communication Engineering", value: "ECE" },
  { label: "Electrical & Electronics Engineering", value: "EEE" },
  { label: "Mechanical Engineering", value: "MECH" },
  { label: "Civil Engineering", value: "CIVIL" },
  { label: "Artificial Intelligence & Data Science", value: "AI & DS" },
];

const AWARD_HOSTELS = [
  { label: "Ramanujan Bhavan", value: "Ramanujan Bhavan" },
  { label: "Bhaskara Bhavan", value: "Bhaskara Bhavan" },
  { label: "Ratan Tata Bhavan", value: "Ratan Tata Bhavan" },
  { label: "Bill Gates Bhavan", value: "Bill Gates Bhavan" },
  { label: "Hostel Block A", value: "Hostel Block A" },
  { label: "Hostel Block B", value: "Hostel Block B" },
  { label: "Hostel Block C", value: "Hostel Block C" },
  { label: "Hostel Block D", value: "Hostel Block D" },
  { label: "Hostel Block E", value: "Hostel Block E" },
];

const AWARD_UNITS = [
  ...AWARD_DEPARTMENTS,
  ...AWARD_HOSTELS,
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
    trophy: (
      <>
        <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" />
        <path d="M6 5H4v2a4 4 0 0 0 4 4" />
        <path d="M18 5h2v2a4 4 0 0 1-4 4" />
        <path d="M12 13v4" />
        <path d="M8 20h8" />
        <path d="M9.5 17h5" />
      </>
    ),
    bin: (
      <>
        <path d="M6 7h12" />
        <path d="M9 7V4h6v3" />
        <path d="M8 10v8" />
        <path d="M12 10v8" />
        <path d="M16 10v8" />
        <path d="M5 7l1 13h12l1-13" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.info}</svg>;
}

function App() {
  const [page, setPage] = useState("overview");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [history, setHistory] = useState([]);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [gamification, setGamification] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
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
    const token = localStorage.getItem("ecosort_auth_token");

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data.detail === "object"
          ? data.detail?.message
          : data.detail || data.message;

      if (response.status === 401) {
        localStorage.removeItem("ecosort_auth_token");
        setCurrentUser(null);
      }

      throw new Error(message || `Request failed (${response.status})`);
    }

    return data;
  }, []);

  const handleAuthSuccess = useCallback((data) => {
    if (data?.token) localStorage.setItem("ecosort_auth_token", data.token);
    if (data?.user) setCurrentUser(data.user);
    setAuthMode("login");
    setPage("overview");
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("ecosort_auth_token");
    setCurrentUser(null);
    setSelectedResult(null);
    setMobileMenu(false);
    setNotificationsOpen(false);
    setAuthMode("login");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      const token = localStorage.getItem("ecosort_auth_token");
      if (!token) {
        if (!cancelled) setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.user) throw new Error("Session expired");
        if (!cancelled) setCurrentUser(data.user);
      } catch {
        localStorage.removeItem("ecosort_auth_token");
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    initializeAuth();
    return () => { cancelled = true; };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      api("/health"),
      api("/history?limit=100"),
      api("/review-queue?limit=100"),
      api("/stats"),
      api("/categories"),
      api("/gamification/me"),
      api("/gamification/leaderboard?limit=10"),
    ]);

    const [
      healthResult,
      historyResult,
      queueResult,
      statsResult,
      categoriesResult,
      gamificationResult,
      leaderboardResult,
    ] = results;

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

    if (gamificationResult.status === "fulfilled") {
      setGamification(gamificationResult.value);
    }

    if (leaderboardResult.status === "fulfilled") {
      const incomingLeaderboard = Array.isArray(leaderboardResult.value)
        ? leaderboardResult.value
        : leaderboardResult.value.items || [];
      setLeaderboard(incomingLeaderboard);
    }

    setLoading(false);
  }, [api]);

  useEffect(() => {
    if (!authLoading && currentUser) loadData();
  }, [authLoading, currentUser, loadData]);

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

  if (authLoading) return <AuthLoadingScreen />;

  if (!currentUser) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        api={api}
        onSuccess={handleAuthSuccess}
        showToast={showToast}
      />
    );
  }

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
        currentUser={currentUser}
        onLogout={handleLogout}
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
            gamification={gamification}
            leaderboard={leaderboard}
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

        {page === "review" && currentUser?.role === "admin" && (
  <ReviewPage
    queue={queue}
    loading={loading}
    api={api}
    showToast={showToast}
    reloadData={loadData}
    openResult={openResult}
  />
)}

{page === "review" && currentUser?.role !== "admin" && (
  <OverviewPage
    stats={stats}
    history={history}
    queue={[]}
    health={health}
    loading={loading}
    categories={categories}
    navigate={navigate}
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

        {page === "gamification" && (
          <GamificationPage
            gamification={gamification}
            leaderboard={leaderboard}
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

function AuthLoadingScreen() {
  return (
    <div className="auth-loading-screen">
      <div className="auth-loading-card">
        <div className="brand-mark"><Icon name="recycle" size={22} /></div>
        <strong>Loading EcoSort</strong>
        <span>Securing your workspace…</span>
      </div>
    </div>
  );
}

function AuthScreen({ mode, setMode, api, onSuccess, showToast }) {
  const isSignup = mode === "signup";
  const [form, setForm] = useState({ full_name: "", email: "", password: "", organization_unit: "General" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (isSignup && form.full_name.trim().length < 2) return setError("Please enter your full name.");
    if (!form.email.trim()) return setError("Please enter your email address.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");

    setSubmitting(true);
    setError("");
    try {
      const data = await api(isSignup ? "/auth/signup" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(
          isSignup
            ? { full_name: form.full_name.trim(), email: form.email.trim(), password: form.password }
            : { email: form.email.trim(), password: form.password }
        ),
      });
      onSuccess(data);
      showToast(isSignup ? "Account created successfully." : "Welcome back to EcoSort.");
    } catch (err) {
      setError(err.message || "Unable to continue right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <AmbientBackground />
      <div className="auth-shell">
        <div className="auth-brand">
          <span className="brand-mark"><Icon name="recycle" size={21} /></span>
          <span><strong>EcoSort</strong><small>AI WASTE INTELLIGENCE</small></span>
        </div>
        <section className="auth-card">
          <div className="auth-card-copy">
            <span className="small-eyebrow">{isSignup ? "CREATE ACCOUNT" : "WELCOME BACK"}</span>
            <h1>{isSignup ? "Start sorting smarter." : "Sign in to EcoSort."}</h1>
            <p>{isSignup ? "Create your workspace account and keep every waste decision in one place." : "Access your waste intelligence workspace, scan history and trusted decisions."}</p>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <label><span>Full name</span><input value={form.full_name} onChange={(event) => update("full_name", event.target.value)} placeholder="Your name" autoComplete="name" /></label>
            )}
            {isSignup && (
              <label><span>Department / Hostel block</span><input value={form.organization_unit} onChange={(event) => update("organization_unit", event.target.value)} placeholder="e.g. CSE / Block A" /></label>
            )}
            <label><span>Email</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
            <label><span>Password</span><input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Minimum 8 characters" autoComplete={isSignup ? "new-password" : "current-password"} /></label>
            {error && <div className="auth-error">{error}</div>}
            <button className="primary-button auth-submit" disabled={submitting}>{submitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}{!submitting && <Icon name="arrow" size={16} />}</button>
          </form>
          <div className="auth-switch">
            <span>{isSignup ? "Already have an account?" : "New to EcoSort?"}</span>
            <button type="button" onClick={() => { setMode(isSignup ? "login" : "signup"); setError(""); }}>{isSignup ? "Sign in" : "Create an account"}</button>
          </div>
          <div className="auth-note"><Icon name="shield" size={15} /><span>Your password is protected and never shown in the dashboard.</span></div>
        </section>
      </div>
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
      .page-intro.centered { text-align: center; justify-content: center; }
      .page-intro.centered > div { width: 100%; display: flex; flex-direction: column; align-items: center; }
      .page-intro.centered .eyebrow { justify-content: flex-start; align-self: flex-start; }
      .page-intro.centered h1 { max-width: 980px; margin-left: auto; margin-right: auto; }
      .page-intro.centered p { max-width: 900px; margin-left: auto; margin-right: auto; }

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

      .auth-screen { min-height: 100vh; position: relative; display: flex; align-items: center; justify-content: center; padding: 32px; overflow: hidden; }
      .auth-shell { width: min(520px, 100%); position: relative; z-index: 2; }
      .auth-brand { display: flex; align-items: center; gap: 11px; justify-content: center; margin: 0 auto 22px; }
      .auth-brand > span:last-child { display: flex; flex-direction: column; }
      .auth-brand strong { font-size: 19px; line-height: 1; }
      .auth-brand small { margin-top: 5px; font-size: 9px; letter-spacing: .16em; color: #81928b; }
      .auth-card { background: rgba(255,255,255,.93); border: 1px solid rgba(27,74,58,.12); border-radius: 28px; padding: 34px; box-shadow: 0 24px 80px rgba(16,49,38,.12); backdrop-filter: blur(14px); }
      .auth-card-copy { text-align: center; }
      .auth-card-copy h1 { margin: 12px 0; font-size: clamp(34px, 6vw, 50px); line-height: .98; letter-spacing: -.045em; }
      .auth-card-copy p { margin: 0 auto; max-width: 420px; color: #6e7e77; line-height: 1.65; }
      .auth-form { display: grid; gap: 16px; margin-top: 28px; }
      .auth-form label { display: grid; gap: 8px; color: #30463d; font-size: 13px; font-weight: 600; }
      .auth-form input { width: 100%; box-sizing: border-box; border: 1px solid #dbe7e1; border-radius: 13px; padding: 14px 15px; background: #fbfdfc; color: #13251f; font: inherit; outline: none; }
      .auth-form input:focus { border-color: #6ea98f; box-shadow: 0 0 0 4px rgba(75,146,108,.08); }
      .auth-submit { width: 100%; justify-content: center; margin-top: 4px; }
      .auth-error { border: 1px solid #f1d3ca; background: #fff4f0; color: #9b5948; border-radius: 12px; padding: 11px 13px; font-size: 13px; line-height: 1.45; }
      .auth-switch { display: flex; justify-content: center; align-items: center; gap: 7px; margin-top: 20px; color: #708079; font-size: 13px; }
      .auth-switch button { border: 0; background: transparent; color: #176b53; font: inherit; font-weight: 700; cursor: pointer; padding: 0; }
      .auth-note { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 18px; color: #8a9791; font-size: 11px; text-align: center; }
      .auth-loading-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f4f8f5; }
      .auth-loading-card { display: flex; flex-direction: column; align-items: center; gap: 10px; color: #315149; }
      .auth-loading-card span { color: #82918b; font-size: 13px; }
      .user-menu { display: flex; align-items: center; gap: 9px; margin-left: 4px; }
      .user-avatar { width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #eaf5ef; color: #176b53; font-size: 12px; font-weight: 800; }
      .user-menu-copy { display: flex; flex-direction: column; min-width: 0; }
      .user-menu-copy strong { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: #213831; }
      .user-menu-copy span { font-size: 9px; color: #84938d; text-transform: uppercase; letter-spacing: .08em; }
      .logout-button { border: 1px solid #dbe7e1; background: rgba(255,255,255,.72); border-radius: 10px; padding: 7px 9px; color: #566861; font: inherit; font-size: 11px; cursor: pointer; }
      .logout-button:hover { border-color: #bcd5ca; color: #176b53; }


      .dual-scan-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-top:18px; align-items:stretch; }
      .dual-scan-card { padding:24px; min-width:0; }
      .dual-scan-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:18px; }
      .dual-scan-header h2 { margin:7px 0 7px; font-size:24px; letter-spacing:-.03em; }
      .dual-scan-header p { margin:0; color:#72827b; font-size:13px; line-height:1.55; max-width:440px; }
      .dual-scan-badge { display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; padding:8px 10px; border:1px solid #dbe8e1; border-radius:999px; background:#f7fbf9; color:#1d6b53; font-size:10px; font-weight:800; white-space:nowrap; }
      .dual-drop-zone { min-height:285px; border:1px dashed #cbdcd4; border-radius:18px; padding:24px; background:linear-gradient(180deg,#fbfdfc,#f4f9f6); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; transition:.18s ease; }
      .dual-drop-zone.drag-active { border-color:#176b53; background:#eef8f2; transform:translateY(-1px); }
      .dual-drop-icon { width:58px; height:58px; border-radius:18px; display:flex; align-items:center; justify-content:center; background:#e7f2ec; color:#176b53; border:1px solid #d3e5dc; margin-bottom:14px; }
      .dual-drop-zone strong { font-size:16px; color:#213831; }
      .dual-drop-zone > span { margin-top:6px; color:#83928c; font-size:11px; line-height:1.5; max-width:320px; }
      .dual-scan-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:18px; }
      .dual-selected-area { display:flex; flex-direction:column; gap:12px; }
      .dual-preview-wrap { position:relative; border-radius:17px; overflow:hidden; border:1px solid #dbe7e1; background:#eef4f1; aspect-ratio:16/10; }
      .dual-preview-image { width:100%; height:100%; display:block; object-fit:cover; }
      .dual-remove-button { position:absolute; right:10px; top:10px; width:32px; height:32px; border:0; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(16,49,38,.78); color:#fff; cursor:pointer; }
      .dual-file-meta { display:flex; justify-content:space-between; gap:12px; align-items:center; }
      .dual-file-meta strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#253d34; font-size:12px; }
      .dual-file-meta span { flex:0 0 auto; color:#89968f; font-size:10px; }
      .dual-quality-line { display:flex; justify-content:space-between; gap:10px; padding:10px 12px; border:1px solid #e0ebe5; border-radius:12px; background:#f8fbf9; color:#74837d; font-size:11px; }
      .dual-quality-line strong { color:#1d6b53; text-transform:capitalize; }
      .bin-result-card { padding:15px; border:1px solid #d5e5dc; border-radius:15px; background:#f4faf7; }
      .bin-result-top { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
      .bin-result-top span:first-child { display:block; color:#7f8f88; font-size:9px; letter-spacing:.11em; font-weight:800; }
      .bin-result-top strong { display:block; margin-top:3px; font-size:32px; letter-spacing:-.04em; color:#17392d; }
      .bin-fill-status { padding:7px 9px; border-radius:999px; background:#e8f4ed; color:#176b53; font-size:10px; font-weight:800; }
      .bin-fill-bar { height:10px; margin:12px 0 10px; background:#e2ece7; border-radius:999px; overflow:hidden; }
      .bin-fill-bar span { display:block; height:100%; background:#2f8a68; border-radius:999px; }
      .bin-result-card p { margin:0; color:#586b63; font-size:12px; line-height:1.5; }
      .bin-result-card small { display:block; margin-top:7px; color:#8a9892; font-size:10px; }
      .bin-ready-note { display:flex; gap:8px; align-items:flex-start; padding:12px; border-radius:12px; background:#f8fbf9; color:#7c8983; font-size:11px; line-height:1.5; border:1px solid #e2ebe6; }
      .scan-confidence-strip { margin-top:18px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
      .scan-confidence-strip > div { display:flex; align-items:center; gap:10px; padding:14px 16px; border:1px solid #dde9e3; border-radius:14px; background:rgba(255,255,255,.72); }
      .scan-confidence-strip > div > svg { flex:0 0 auto; color:#176b53; }
      .scan-confidence-strip strong { color:#243a32; font-size:11px; }
      .scan-confidence-strip span { color:#7b8a84; font-size:10px; }
      @media (max-width: 900px) { .dual-scan-grid,.scan-confidence-strip { grid-template-columns:1fr !important; } .dual-scan-card { padding:20px; } }

      .round2-overview-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18px; margin-top: 18px; }
      .round2-feature-card { display: grid; grid-template-columns: 46px minmax(0,1fr); gap: 16px; padding: 24px; align-items: start; }
      .round2-feature-icon { width: 46px; height: 46px; border-radius: 14px; display:flex; align-items:center; justify-content:center; background:#eaf5ef; color:#176b53; border:1px solid #d7e8df; }
      .round2-feature-card h3 { margin: 8px 0 8px; font-size: 22px; letter-spacing: -.02em; }
      .round2-feature-card p { margin: 0 0 15px; color:#6d7f77; line-height:1.6; }
      .round2-mini-leaderboard { margin-top: 18px; padding: 24px; }
      .round2-leaderboard-list { display:grid; gap:8px; }
      .round2-rank-row { display:grid; grid-template-columns: 34px minmax(0,1fr) auto; gap:12px; align-items:center; padding:12px 0; border-top:1px solid #e6eee9; }
      .round2-rank-badge { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:9px; background:#f1f6f3; color:#176b53; font-size:12px; font-weight:800; }
      .round2-rank-row > span:last-child { color:#176b53; font-weight:800; font-size:13px; }
      .round2-bin-action-card { margin-top: 6px; padding: 15px; border:1px solid #dbe7e1; border-radius:14px; background:#f7fbf9; }
      .round2-bin-action-card strong { display:block; margin-top:4px; font-size:14px; color:#20352d; }
      .round2-bin-action-card p { margin:6px 0 11px; color:#74827d; font-size:12px; line-height:1.55; }
      .round2-fill-result { margin-top: 12px; padding:16px; border:1px solid #d5e5dc; border-radius:15px; background:#f4faf7; }
      .round2-fill-result-top { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
      .round2-fill-result-top span:first-child { display:block; color:#7f8f88; font-size:9px; letter-spacing:.11em; font-weight:800; }
      .round2-fill-result-top strong { display:block; margin-top:3px; font-size:30px; letter-spacing:-.04em; color:#17392d; }
      .round2-fill-status { padding:6px 9px; border-radius:999px; background:#e8f4ed; color:#176b53; font-size:11px; font-weight:800; }
      .round2-fill-bar { height:10px; margin:12px 0 10px; background:#e2ece7; border-radius:999px; overflow:hidden; }
      .round2-fill-bar span { display:block; height:100%; background:#2f8a68; border-radius:999px; }
      .round2-fill-result p { margin:0; color:#586b63; font-size:12px; line-height:1.5; }
      .round2-fill-result small { display:block; margin-top:7px; color:#8a9892; font-size:10px; }
      .round2-reward-card { margin-top: 18px; padding: 16px; border:1px solid #d8e7df; border-radius:16px; background:linear-gradient(135deg,#f5fbf7,#eef8f2); display:flex; justify-content:space-between; align-items:center; gap:18px; }
      .round2-reward-copy { display:flex; align-items:center; gap:12px; min-width:0; }
      .round2-reward-icon { width:36px; height:36px; flex:0 0 36px; border-radius:11px; background:#dff1e7; color:#176b53; display:flex; align-items:center; justify-content:center; }
      .round2-reward-copy strong { display:block; margin-top:4px; color:#1e352c; }
      .round2-reward-copy p { margin:5px 0 0; color:#72827b; font-size:11px; line-height:1.45; }



      /* Center only the two requested page introductions. Keep every other page left-aligned. */
      .page-intro.centered {
        text-align: center;
      }
      .page-intro.centered > div {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .page-intro.centered .eyebrow {
        justify-content: center;
      }
      .page-intro.centered h1,
      .page-intro.centered p {
        margin-left: auto;
        margin-right: auto;
      }
      .page-intro.centered h1 {
        max-width: 980px;
      }
      .page-intro.centered p {
        max-width: 900px;
      }

      /* Product polish: keep page introductions aligned with the core product layout. */
      .page-intro { 
        width: 100%;
        text-align: left;
      }
      .page-intro > div {
        width: min(900px, 100%);
      }
      .page-intro .eyebrow {
        justify-content: flex-start;
      }
      .page-intro h1 {
        max-width: 900px;
        margin-left: 0;
        margin-right: 0;
      }
      .page-intro p {
        max-width: 780px;
        margin-left: 0;
        margin-right: 0;
      }

      /* Keep the scan workspace visually balanced while preserving the two-input UX. */
      .dual-scan-card {
        overflow: hidden;
      }
      .dual-scan-header > div p {
        max-width: 520px;
      }

      /* Stronger visual hierarchy for the GreenPoints workspace. */
      .gp-command-grid .panel {
        min-height: 100%;
      }
      .gp-section-head > div:first-child {
        min-width: 0;
      }
      .gp-section-head h3 {
        max-width: 700px;
      }

      @media (max-width: 900px) {
        .page-intro > div,
        .page-intro h1,
        .page-intro p {
          max-width: 100%;
        }
      }


      .gp-control-banner {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0,1.1fr) minmax(360px,.9fr);
        gap: 20px;
        align-items: center;
        margin-top: 18px;
        padding: 24px 26px;
        border: 1px solid #d9e9df;
        border-radius: 20px;
        background: linear-gradient(125deg,#f2faf6,#ffffff 72%);
        box-shadow: 0 14px 34px rgba(28,70,54,.05);
      }
      .gp-control-copy h2 { margin:7px 0 6px; font-size:25px; line-height:1.05; letter-spacing:-.035em; color:#17392d; }
      .gp-control-copy p { margin:0; max-width:620px; color:#73837c; font-size:11px; line-height:1.6; }
      .gp-award-controls { display:grid; gap:9px; }
      .gp-destination-chip { grid-column:1 / -1; display:flex; justify-content:space-between; align-items:center; gap:14px; padding-top:13px; border-top:1px solid #dfeae4; }
      .gp-destination-chip span { color:#8a9791; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; }
      .gp-destination-chip strong { color:#176b53; font-size:12px; }
      .gp-award-preview { display:flex; align-items:center; gap:10px; margin-top:16px; padding:12px 13px; border-radius:13px; background:#f3f9f6; border:1px solid #dceae3; }
      .gp-award-star { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:9px; background:#e5f3eb; color:#176b53; font-size:17px; }
      .gp-award-preview strong { display:block; color:#263e35; font-size:11px; }
      .gp-award-preview p { margin:3px 0 0; color:#7a8982; font-size:10px; }
      .gp-award-preview b { color:#176b53; }
      .gp-unit-summary-large { margin-top:14px; }

      @media (max-width: 900px) {
        .gp-control-banner { grid-template-columns:1fr !important; }
        .gp-destination-chip { grid-column:auto; }
      }



      /* Centered page intro: only Scan Workspace and GreenPoints. */
      .page-intro.centered {
        text-align: center;
        justify-content: center;
      }
      .page-intro.centered > div {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .page-intro.centered .eyebrow {
        justify-content: center;
      }
      .page-intro.centered h1 {
        max-width: 1000px;
        margin-left: auto;
        margin-right: auto;
      }
      .page-intro.centered p {
        max-width: 900px;
        margin-left: auto;
        margin-right: auto;
      }

      .scan-award-destination {
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(420px,.9fr);
        gap:24px;
        align-items:center;
        margin:18px 0;
        padding:20px 22px;
        border:1px solid #dceae3;
        border-radius:20px;
        background:linear-gradient(135deg,#f2faf6,#ffffff 75%);
        box-shadow:0 12px 30px rgba(22,74,56,.05);
      }
      .scan-award-copy h2 {
        margin:7px 0 6px;
        font-size:24px;
        line-height:1.05;
        letter-spacing:-.035em;
        color:#17392d;
      }
      .scan-award-copy p {
        margin:0;
        max-width:680px;
        color:#75867f;
        font-size:11px;
        line-height:1.6;
      }
      .scan-award-controls { display:grid; gap:10px; }
      .scan-award-live {
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        column-gap:10px;
        row-gap:2px;
        padding:10px 12px;
        border:1px solid #dceae3;
        border-radius:12px;
        background:#f7fbf9;
      }
      .scan-award-live span {
        color:#8b9892;
        font-size:8px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.1em;
      }
      .scan-award-live strong {
        color:#176b53;
        font-size:11px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .scan-award-live em {
        grid-column:1 / -1;
        color:#7e8d86;
        font-size:9px;
        font-style:normal;
      }
      .scan-selected-target {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding:10px 12px;
        margin:4px 0 2px;
        border:1px solid #dceae3;
        border-radius:12px;
        background:#f7fbf9;
      }
      .scan-selected-target span {
        color:#8a9791;
        font-size:8px;
        letter-spacing:.1em;
        font-weight:800;
      }
      .scan-selected-target strong {
        color:#176b53;
        font-size:11px;
      }
      .round2-reward-target {
        display:inline-flex;
        flex-direction:column;
        justify-content:center;
        min-width:132px;
        padding:8px 10px;
        margin-right:2px;
        border:1px solid #d7e8df;
        border-radius:11px;
        background:#f6fbf8;
        color:#82918b;
        font-size:8px;
        text-transform:uppercase;
        letter-spacing:.08em;
        font-weight:800;
      }
      .round2-reward-target strong {
        margin-top:3px;
        color:#176b53;
        font-size:10px;
        text-transform:none;
        letter-spacing:0;
      }
      @media (max-width:900px) {
        .scan-award-destination { grid-template-columns:1fr !important; }
        .scan-award-copy h2 { font-size:21px; }
      }

      .gp-command-grid { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(420px,.95fr); gap:18px; margin-top:18px; }
      .gp-score-hero { padding:28px; background:linear-gradient(145deg,#eef8f3,#ffffff 68%); }
      .gp-score-topline { display:flex; justify-content:space-between; align-items:center; gap:12px; }
      .gp-live-badge, .gp-live-pill { display:inline-flex; align-items:center; gap:7px; padding:7px 10px; border-radius:999px; background:#edf7f1; color:#4c7866; border:1px solid #d8e9df; font-size:10px; font-weight:800; }
      .gp-score-body { display:grid; grid-template-columns:176px minmax(0,1fr); gap:26px; align-items:center; margin-top:22px; }
      .gp-score-ring { width:176px; height:176px; border-radius:50%; background:conic-gradient(#176b53 0 78%, #dceae2 78% 100%); padding:9px; box-sizing:border-box; box-shadow:0 15px 40px rgba(23,107,83,.12); }
      .gp-score-ring-inner { width:100%; height:100%; border-radius:50%; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid #e0ebe5; }
      .gp-score-ring-inner strong { font-size:52px; line-height:1; color:#176b53; letter-spacing:-.055em; }
      .gp-score-ring-inner span { margin-top:7px; color:#84938c; font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
      .gp-tier-label { display:inline-flex; padding:6px 9px; border-radius:999px; background:#e7f4ed; color:#176b53; font-size:10px; font-weight:800; }
      .gp-score-copy h2 { margin:11px 0 8px; font-size:30px; line-height:1.02; letter-spacing:-.04em; color:#17392d; }
      .gp-score-copy p { margin:0; color:#6f8179; line-height:1.6; font-size:13px; max-width:500px; }
      .gp-progress-row { display:flex; justify-content:space-between; gap:12px; margin-top:18px; color:#7c8b84; font-size:10px; }
      .gp-progress-row strong { color:#176b53; }
      .gp-progress-track { height:8px; margin-top:8px; border-radius:999px; background:#dfeae4; overflow:hidden; }
      .gp-progress-track span { display:block; height:100%; border-radius:999px; background:#176b53; }
      .gp-metric-strip { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:22px; padding-top:18px; border-top:1px solid #dce9e2; }
      .gp-metric-strip > div { padding:12px 13px; border:1px solid #dde9e3; background:rgba(255,255,255,.76); border-radius:13px; }
      .gp-metric-strip span, .gp-unit-summary span, .gp-row-points span { display:block; color:#8a9791; font-size:8px; letter-spacing:.12em; font-weight:800; }
      .gp-metric-strip strong { display:block; margin-top:4px; color:#203a30; font-size:14px; }
      .gp-unit-card { padding:26px; }
      .gp-unit-head { display:flex; align-items:center; gap:12px; }
      .gp-icon-box { width:44px; height:44px; border-radius:13px; display:flex; align-items:center; justify-content:center; background:#e9f5ee; color:#176b53; border:1px solid #d7e8df; }
      .gp-unit-head h3 { margin:5px 0 0; font-size:22px; letter-spacing:-.025em; }
      .gp-unit-card > p { margin:16px 0 18px; color:#71817b; line-height:1.6; font-size:12px; }
      .gp-type-toggle { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:5px; border:1px solid #dfe9e4; border-radius:14px; background:#f5f9f7; }
      .gp-type-toggle button { border:0; border-radius:10px; padding:10px 12px; background:transparent; color:#718079; font:inherit; font-size:11px; font-weight:800; cursor:pointer; }
      .gp-type-toggle button.active { background:#fff; color:#176b53; box-shadow:0 4px 16px rgba(25,70,54,.08); }
      .gp-select-field { display:grid; gap:7px; margin-top:16px; }
      .gp-select-field > span { color:#586a62; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
      .gp-select-field select { width:100%; box-sizing:border-box; border:1px solid #dbe7e1; border-radius:12px; padding:12px 13px; background:#fbfdfc; color:#17392d; font:inherit; outline:none; }
      .gp-save-button { width:100%; justify-content:center; margin-top:13px; }
      .gp-unit-summary { display:grid; grid-template-columns:1.2fr .8fr; gap:10px; margin-top:13px; }
      .gp-unit-summary > div { padding:12px 13px; border:1px solid #e0ebe5; border-radius:13px; background:#f7fbf9; }
      .gp-unit-summary strong { display:block; margin-top:4px; color:#20392f; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .gp-leaderboard-card { margin-top:18px; padding:26px; }
      .gp-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; padding-bottom:18px; border-bottom:1px solid #e2ebe6; }
      .gp-section-head h3 { margin:6px 0 5px; font-size:22px; letter-spacing:-.025em; }
      .gp-section-head p { margin:0; color:#7a8983; font-size:11px; line-height:1.5; }
      .gp-section-head.compact { border-bottom:0; padding-bottom:0; }
      .gp-podium { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; align-items:stretch; padding:20px 0 6px; }
      .gp-podium-card { position:relative; min-height:135px; padding:18px; border:1px solid #dde9e3; border-radius:17px; background:linear-gradient(180deg,#fbfdfc,#f4f9f6); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
      .gp-podium-card.rank-1 { min-height:160px; transform:translateY(-7px); background:linear-gradient(180deg,#eef8f3,#fbfdfc); border-color:#cfe3d8; box-shadow:0 14px 32px rgba(23,107,83,.08); }
      .gp-podium-card strong { margin-top:7px; color:#20392f; font-size:14px; }
      .gp-podium-card span { margin-top:3px; color:#176b53; font-size:17px; font-weight:900; }
      .gp-podium-card small { margin-top:4px; color:#87948e; font-size:9px; }
      .gp-podium-card > svg { position:absolute; top:12px; right:12px; color:#176b53; }
      .gp-podium-medal { padding:5px 8px; border-radius:999px; background:#e7f3ec; color:#176b53; font-size:9px; font-weight:900; text-transform:uppercase; }
      .gp-full-table { margin-top:12px; }
      .gp-rank-name { min-width:0; }
      .gp-rank-name strong { display:block; color:#213a30; font-size:12px; }
      .gp-rank-name small { display:block; margin-top:3px; color:#87958f; font-size:9px; }
      .gp-row-points { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
      .gp-row-points strong { color:#176b53; font-size:13px; }
      .gp-bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:18px; }
      .gp-how-card, .gp-rewards-card { padding:24px; }
      .gp-step-list { margin-top:8px; display:grid; gap:10px; }
      .gp-step { display:grid; grid-template-columns:34px minmax(0,1fr); gap:11px; align-items:start; padding:11px 0; border-top:1px solid #e7eee9; }
      .gp-step > span { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:9px; background:#edf6f1; color:#176b53; font-size:9px; font-weight:900; }
      .gp-step strong { color:#263e35; font-size:12px; }
      .gp-step p { margin:4px 0 0; color:#788781; font-size:10px; line-height:1.5; }
      .gp-rewards-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
      .gp-rewards-header h3 { margin:6px 0 0; font-size:20px; letter-spacing:-.02em; }
      .gp-reward-count { min-width:30px; height:30px; padding:0 9px; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#eaf5ef; color:#176b53; font-size:11px; font-weight:800; }
      .gp-reward-list { margin-top:12px; }
      @media (max-width: 900px) {
        .gp-command-grid, .gp-bottom-grid { grid-template-columns:1fr !important; }
        .gp-score-body { grid-template-columns:1fr !important; text-align:center; }
        .gp-score-ring { margin:0 auto; }
        .gp-progress-row { text-align:left; }
        .gp-podium { grid-template-columns:1fr !important; }
        .gp-podium-card.rank-1 { transform:none; }
        .gp-section-head { flex-direction:column; }
      }

      .gamification-hero-grid { display:grid; grid-template-columns: minmax(0, .9fr) minmax(0,1.1fr); gap:18px; margin-top:18px; }
      .gamification-score-card { padding:28px; background:linear-gradient(145deg,#eff8f3,#fbfdfc); }
      .gamification-score-number { font-size:64px; line-height:1; letter-spacing:-.06em; font-weight:800; color:#176b53; margin:12px 0 10px; }
      .gamification-score-meta { display:flex; gap:10px; flex-wrap:wrap; }
      .gamification-score-meta span { padding:7px 10px; border-radius:999px; background:#fff; border:1px solid #dceae2; color:#61746c; font-size:11px; font-weight:700; }
      .gamification-profile-card { padding:24px; }
      .gamification-profile-card p { color:#71817b; line-height:1.6; margin:0 0 14px; }
      .gamification-profile-form { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; }
      .gamification-profile-form input { width:100%; box-sizing:border-box; border:1px solid #dbe7e1; border-radius:12px; padding:12px 13px; background:#fbfdfc; color:#17392d; font:inherit; outline:none; }
      .gamification-leaderboard-card, .gamification-recent-card { margin-top:18px; padding:24px; }
      .gamification-table { display:grid; }
      .gamification-table-row { display:grid; grid-template-columns:56px minmax(0,1fr) auto; gap:12px; align-items:center; padding:15px 0; border-top:1px solid #e6eee9; }
      .gamification-table-row.current { background:#f4faf7; margin:0 -12px; padding-left:12px; padding-right:12px; border-radius:12px; }
      .gamification-rank { color:#176b53; font-weight:800; font-size:13px; }
      .gamification-table-row small { display:block; color:#84928c; font-size:10px; margin-top:3px; }
      .gamification-table-row > strong:last-child { color:#176b53; }
      .gamification-reward-row { display:grid; grid-template-columns:36px minmax(0,1fr) auto; gap:12px; align-items:center; padding:10px 0; border-top:1px solid #e6eee9; }
      .gamification-reward-row small { display:block; color:#84928c; margin-top:3px; font-size:10px; }

      @media (max-width: 900px) {
        .user-menu-copy,
        .logout-button { display: none; }
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

      @media (max-width: 900px) {
        .round2-overview-grid, .gamification-hero-grid { grid-template-columns: 1fr !important; }
        .round2-reward-card { flex-direction:column; align-items:stretch; }
        .gamification-profile-form { grid-template-columns: 1fr; }
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
  currentUser,
  onLogout,
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
          {NAV_ITEMS.filter((item) => !item.adminOnly || currentUser?.role === "admin").map((item) => (
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

          <div className="user-menu">
            <div className="user-avatar">
              {(currentUser?.full_name || "U").trim().charAt(0).toUpperCase()}
            </div>
            <div className="user-menu-copy">
              <strong>{currentUser?.full_name || "User"}</strong>
              <span>{currentUser?.role === "admin" ? "Administrator" : "User"}</span>
            </div>
            <button className="logout-button" onClick={onLogout}>Sign out</button>
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
  gamification,
  leaderboard,
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

      <section className="round2-overview-grid">
        <div className="panel round2-feature-card">
          <div className="round2-feature-icon"><Icon name="trophy" size={20} /></div>
          <div>
            <span className="small-eyebrow">GREENPOINTS</span>
            <h3>Make correct disposal rewarding.</h3>
            <p>Earn points from verified disposal actions and compete as a department or hostel block.</p>
            <button className="primary-button" onClick={() => navigate("gamification")}>View leaderboard <Icon name="arrow" size={15} /></button>
          </div>
        </div>

        <div className="panel round2-feature-card">
          <div className="round2-feature-icon"><Icon name="bin" size={20} /></div>
          <div>
            <span className="small-eyebrow">SMART BIN</span>
            <h3>Estimate fill before collection.</h3>
            <p>Use a bin image to estimate fill level and surface a collection recommendation.</p>
            <button className="secondary-button" onClick={() => navigate("scan")}>Analyze a bin image <Icon name="arrow" size={15} /></button>
          </div>
        </div>
      </section>

      {Array.isArray(leaderboard) && leaderboard.length > 0 && (
        <section className="panel round2-mini-leaderboard">
          <div className="panel-header">
            <div><span>LIVE COMMUNITY SIGNAL</span><h3>Department leaderboard</h3></div>
            <button className="panel-action" onClick={() => navigate("gamification")}>Open GreenPoints <Icon name="arrow" size={15} /></button>
          </div>
          <div className="round2-leaderboard-list">
            {leaderboard.slice(0, 5).map((item) => (
              <div className="round2-rank-row" key={`${item.rank}-${item.organization_unit}`}>
                <span className="round2-rank-badge">{item.rank}</span>
                <strong>{item.organization_unit || "General"}</strong>
                <span>{formatNumber(item.points)} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}
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
  const [wasteFile, setWasteFile] = useState(null);
  const [wastePreview, setWastePreview] = useState("");
  const [wasteQuality, setWasteQuality] = useState(null);
  const [scanning, setScanning] = useState(false);

  const [binFile, setBinFile] = useState(null);
  const [binPreview, setBinPreview] = useState("");
  const [fillEstimate, setFillEstimate] = useState(null);
  const [estimatingFill, setEstimatingFill] = useState(false);

  const [awardType, setAwardType] = useState("hostel");
  const [awardUnit, setAwardUnit] = useState(() => {
    try {
      return localStorage.getItem("ecosort_next_award_unit") || "Ramanujan Bhavan";
    } catch {
      return "Ramanujan Bhavan";
    }
  });

  const [dragTarget, setDragTarget] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const awardOptions =
    awardType === "department" ? AWARD_DEPARTMENTS : AWARD_HOSTELS;

  useEffect(() => {
    const valid = awardOptions.some(
      (item) => item.value.toLowerCase() === String(awardUnit).toLowerCase()
    );

    if (!valid && awardOptions[0]) {
      setAwardUnit(awardOptions[0].value);
    }
  }, [awardType]);

  const acceptImage = useCallback(
    (selectedFile) => {
      if (!selectedFile) return false;
      if (!selectedFile.type.startsWith("image/")) {
        showToast("Please select a valid image file.", "error");
        return false;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        showToast("Image must be smaller than 5 MB.", "error");
        return false;
      }
      return true;
    },
    [showToast]
  );

  const selectWasteFile = useCallback(
    (selectedFile) => {
      if (!acceptImage(selectedFile)) return;
      setWasteFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setWastePreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
      setWasteQuality(null);
    },
    [acceptImage]
  );

  const selectBinFile = useCallback(
    (selectedFile) => {
      if (!acceptImage(selectedFile)) return;
      setBinFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setBinPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
      setFillEstimate(null);
    },
    [acceptImage]
  );

  const analyzeWasteImage = useCallback(async () => {
    if (!wasteFile) return;

    try {
      const formData = new FormData();
      formData.append("file", wasteFile);

      const result = await api("/analyze-image", {
        method: "POST",
        body: formData,
      });

      setWasteQuality(result);
    } catch (error) {
      setWasteQuality({
        quality_status: "Unknown",
        score: null,
        warning: error.message,
      });
    }
  }, [api, wasteFile]);

  useEffect(() => {
    if (wasteFile) analyzeWasteImage();
  }, [wasteFile, analyzeWasteImage]);

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
    setCameraTarget(null);
    setCameraError("");
  }, [stopCamera]);

  const openCameraFor = (target) => {
    setCameraError("");
    setCameraReady(false);
    setCameraTarget(target);
  };

  useEffect(() => {
    if (!cameraTarget) return;

    let cancelled = false;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not supported by this browser.");
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
            "Camera permission was blocked. Allow camera access and try again."
          );
        } else if (error.name === "NotFoundError") {
          setCameraError("No camera was found on this device.");
        } else if (error.name === "NotReadableError") {
          setCameraError(
            "The camera is already being used by another application."
          );
        } else {
          setCameraError(error.message || "Unable to start the camera.");
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraTarget, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();

      if (wastePreview) URL.revokeObjectURL(wastePreview);
      if (binPreview) URL.revokeObjectURL(binPreview);
    };
  }, [stopCamera, wastePreview, binPreview]);

  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady || !cameraTarget) return;

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
          `ecosort-${cameraTarget}-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );

        if (cameraTarget === "waste") {
          selectWasteFile(capturedFile);
        } else {
          selectBinFile(capturedFile);
        }

        closeCamera();

        showToast(
          cameraTarget === "waste"
            ? "Waste photo captured."
            : "Bin photo captured."
        );
      },
      "image/jpeg",
      0.92
    );
  };

  const handleAwardUnitChange = (value) => {
    setAwardUnit(value);

    try {
      localStorage.setItem("ecosort_next_award_unit", value);
    } catch {
      // Ignore local-storage restrictions.
    }
  };

  const runPrediction = async () => {
    if (!wasteFile || scanning) return;

    const selectedAwardUnit =
      String(awardUnit || awardOptions[0]?.value || "").trim();

    if (!selectedAwardUnit) {
      showToast("Choose a reward destination before scanning.", "error");
      return;
    }

    setScanning(true);

    try {
      const formData = new FormData();
      formData.append("file", wasteFile);
      // Critical: the destination is submitted WITH this prediction.
      // This freezes the target for this individual scan.
      formData.append("organization_unit", selectedAwardUnit);

      const result = await api("/predict", {
        method: "POST",
        body: formData,
      });

      const resultWithAwardUnit = {
        ...result,
        award_unit: result.organization_unit || selectedAwardUnit,
      };

      await reloadData();
      openResult(resultWithAwardUnit);

      showToast(
        `Waste classified. This scan is assigned to ${resultWithAwardUnit.award_unit}.`
      );
    } catch (error) {
      showToast(error.message || "Prediction failed.", "error");
    } finally {
      setScanning(false);
    }
  };

  const estimateBinFill = async () => {
    if (!binFile || estimatingFill) return;

    setEstimatingFill(true);
    setFillEstimate(null);

    try {
      const formData = new FormData();
      formData.append("file", binFile);

      const result = await api("/bin/fill-estimate", {
        method: "POST",
        body: formData,
      });

      setFillEstimate(result);
      showToast("Bin fill level estimated successfully.");
    } catch (error) {
      showToast(error.message || "Unable to estimate bin fill.", "error");
    } finally {
      setEstimatingFill(false);
    }
  };

  const clearWaste = () => {
    setWasteFile(null);
    setWasteQuality(null);

    if (wastePreview) URL.revokeObjectURL(wastePreview);
    setWastePreview("");
  };

  const clearBin = () => {
    setBinFile(null);
    setFillEstimate(null);

    if (binPreview) URL.revokeObjectURL(binPreview);
    setBinPreview("");
  };

  const wasteDropProps = {
    onDragOver: (event) => {
      event.preventDefault();
      setDragTarget("waste");
    },
    onDragLeave: () => setDragTarget(null),
    onDrop: (event) => {
      event.preventDefault();
      setDragTarget(null);
      selectWasteFile(event.dataTransfer.files?.[0]);
    },
  };

  const binDropProps = {
    onDragOver: (event) => {
      event.preventDefault();
      setDragTarget("bin");
    },
    onDragLeave: () => setDragTarget(null),
    onDrop: (event) => {
      event.preventDefault();
      setDragTarget(null);
      selectBinFile(event.dataTransfer.files?.[0]);
    },
  };

  return (
    <div className="page-container">
      <PageIntro
        eyebrow="SCAN WORKSPACE"
        title="Understand waste and keep collection moving."
        description="Use the waste scan to identify an item and the bin check to estimate how full a collection bin is. Both inputs can stay on screen together."
        className="centered"
      />

      <section className="scan-award-destination">
        <div className="scan-award-copy">
          <span className="small-eyebrow">REWARD DESTINATION</span>
          <h2>Choose where this scan's points should go.</h2>
          <p>
            This selection applies only to the waste scan you are about to
            perform. Changing it later will not move points from earlier scans.
          </p>
        </div>

        <div className="scan-award-controls">
          <div className="gp-type-toggle">
            <button
              type="button"
              className={awardType === "department" ? "active" : ""}
              onClick={() => setAwardType("department")}
            >
              Department
            </button>
            <button
              type="button"
              className={awardType === "hostel" ? "active" : ""}
              onClick={() => setAwardType("hostel")}
            >
              Hostel block
            </button>
          </div>

          <label className="gp-select-field">
            <span>Award points to</span>
            <select
              value={awardUnit}
              onChange={(event) => handleAwardUnitChange(event.target.value)}
            >
              {awardOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="scan-award-live">
            <span>Current scan target</span>
            <strong>{awardUnit}</strong>
            <em>+10 points after disposal confirmation</em>
          </div>
        </div>
      </section>

      <div className="dual-scan-grid">
        <section className="panel dual-scan-card waste-scan-card">
          <div className="dual-scan-header">
            <div>
              <span className="small-eyebrow">WASTE ITEM</span>
              <h2>Classify a waste item</h2>
              <p>Upload or capture the item you want EcoSort to identify.</p>
            </div>
            <span className="dual-scan-badge">
              <Icon name="scan" size={15} /> AI classification
            </span>
          </div>

          {!wasteFile ? (
            <div
              className={`dual-drop-zone ${
                dragTarget === "waste" ? "drag-active" : ""
              }`}
              {...wasteDropProps}
            >
              <div className="dual-drop-icon">
                <Icon name="upload" size={26} />
              </div>
              <strong>Drop a waste image here</strong>
              <span>JPG, JPEG or PNG · Up to 5 MB</span>

              <div className="dual-scan-actions">
                <label className="primary-button">
                  <Icon name="upload" size={16} /> Upload waste image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    hidden
                    onChange={(event) =>
                      selectWasteFile(event.target.files?.[0])
                    }
                  />
                </label>

                <button
                  className="secondary-button"
                  onClick={() => openCameraFor("waste")}
                >
                  <Icon name="camera" size={16} /> Camera
                </button>
              </div>
            </div>
          ) : (
            <div className="dual-selected-area">
              <div className="dual-preview-wrap">
                <img
                  src={wastePreview}
                  alt="Selected waste"
                  className="dual-preview-image"
                />
                <button
                  className="dual-remove-button"
                  onClick={clearWaste}
                  aria-label="Remove waste image"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>

              <div className="dual-file-meta">
                <strong>{wasteFile.name}</strong>
                <span>{formatBytes(wasteFile.size)}</span>
              </div>

              <div className="dual-quality-line">
                <span>Image quality</span>
                <strong>{wasteQuality?.quality_status || "Analyzing…"}</strong>
              </div>

              <div className="scan-selected-target">
                <span>THIS SCAN AWARDS TO</span>
                <strong>{awardUnit}</strong>
              </div>

              <button
                className="primary-button full-width"
                onClick={runPrediction}
                disabled={scanning}
              >
                {scanning ? "Analyzing…" : "Classify waste"}
                {!scanning && <Icon name="arrow" size={15} />}
              </button>

              <button
                className="secondary-button full-width"
                onClick={clearWaste}
                disabled={scanning}
              >
                Choose another waste image
              </button>
            </div>
          )}
        </section>

        <section className="panel dual-scan-card bin-scan-card">
          <div className="dual-scan-header">
            <div>
              <span className="small-eyebrow">BIN STATUS</span>
              <h2>Check collection capacity</h2>
              <p>
                Upload or capture a clear photo of the bin to estimate its fill
                level.
              </p>
            </div>
            <span className="dual-scan-badge">
              <Icon name="bin" size={15} /> Fill estimate
            </span>
          </div>

          {!binFile ? (
            <div
              className={`dual-drop-zone ${
                dragTarget === "bin" ? "drag-active" : ""
              }`}
              {...binDropProps}
            >
              <div className="dual-drop-icon">
                <Icon name="bin" size={26} />
              </div>
              <strong>Drop a bin image here</strong>
              <span>
                Keep the bin visible from top to bottom for a better estimate.
              </span>

              <div className="dual-scan-actions">
                <label className="primary-button">
                  <Icon name="upload" size={16} /> Upload bin image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    hidden
                    onChange={(event) =>
                      selectBinFile(event.target.files?.[0])
                    }
                  />
                </label>

                <button
                  className="secondary-button"
                  onClick={() => openCameraFor("bin")}
                >
                  <Icon name="camera" size={16} /> Camera
                </button>
              </div>
            </div>
          ) : (
            <div className="dual-selected-area">
              <div className="dual-preview-wrap">
                <img
                  src={binPreview}
                  alt="Selected bin"
                  className="dual-preview-image"
                />
                <button
                  className="dual-remove-button"
                  onClick={clearBin}
                  aria-label="Remove bin image"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>

              <div className="dual-file-meta">
                <strong>{binFile.name}</strong>
                <span>{formatBytes(binFile.size)}</span>
              </div>

              <button
                className="secondary-button full-width"
                onClick={estimateBinFill}
                disabled={estimatingFill}
              >
                {estimatingFill ? "Estimating fill…" : "Estimate fill level"}
                <Icon name="bin" size={15} />
              </button>

              {fillEstimate ? (
                <div className="bin-result-card">
                  <div className="bin-result-top">
                    <div>
                      <span>ESTIMATED FILL LEVEL</span>
                      <strong>
                        {Number(fillEstimate.fill_level ?? 0).toFixed(0)}%
                      </strong>
                    </div>

                    <span
                      className={`bin-fill-status ${String(
                        fillEstimate.status || ""
                      )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {fillEstimate.status}
                    </span>
                  </div>

                  <div className="bin-fill-bar">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, Number(fillEstimate.fill_level ?? 0))
                        )}%`,
                      }}
                    />
                  </div>

                  <p>{fillEstimate.recommendation}</p>

                  <small>
                    Estimate confidence:{" "}
                    {Number(fillEstimate.confidence ?? 0).toFixed(0)}%
                  </small>
                </div>
              ) : (
                <div className="bin-ready-note">
                  <Icon name="info" size={15} />
                  <span>
                    Use a clear bin photo with the container edges visible for
                    the most useful estimate.
                  </span>
                </div>
              )}

              <button
                className="secondary-button full-width"
                onClick={clearBin}
                disabled={estimatingFill}
              >
                Choose another bin image
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="scan-confidence-strip">
        <div>
          <Icon name="shield" size={18} />
          <strong>Confidence-aware decisions</strong>
          <span>
            Low-confidence waste classifications can still be routed to human
            review.
          </span>
        </div>

        <div>
          <Icon name="chart" size={18} />
          <strong>Collection visibility</strong>
          <span>
            Fill estimates help teams decide when a bin needs attention.
          </span>
        </div>
      </section>

      {scanning && (
        <div className="scan-processing-card">
          <div className="processing-animation">
            <span />
            <span />
            <span />
          </div>

          <div>
            <strong>EcoSort is analyzing the waste image</strong>
            <p>
              Inspecting visual features, ranking materials and preparing
              disposal guidance.
            </p>
          </div>

          <span className="processing-live">LIVE</span>
        </div>
      )}

      {cameraTarget && (
        <div className="camera-modal-backdrop">
          <div className="camera-modal">
            <div className="camera-modal-header">
              <div>
                <span className="small-eyebrow">CAMERA CAPTURE</span>
                <h2>
                  {cameraTarget === "waste"
                    ? "Frame the waste item."
                    : "Frame the whole bin."}
                </h2>
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
                  <p>Waiting for camera permission.</p>
                </div>
              )}

              {cameraError && (
                <div className="camera-overlay-message error">
                  <strong>{cameraError}</strong>
                  <p>Choose upload instead if camera access is unavailable.</p>
                </div>
              )}
            </div>

            <div className="camera-modal-actions">
              <button className="secondary-button" onClick={closeCamera}>
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={capturePhoto}
                disabled={!cameraReady}
              >
                <Icon name="camera" size={17} /> Capture photo
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
  const [rewarding, setRewarding] = useState(false);
  const [rewarded, setRewarded] = useState(false);

  const awardPoints = async () => {
    if (!result?.prediction_id || rewarding || rewarded) return;

    const awardUnit = String(result.award_unit || "").trim();

    if (!awardUnit) {
      showToast(
        "This prediction has no saved reward destination. Please create a new scan.",
        "error"
      );
      return;
    }

    setRewarding(true);

    try {
      // The backend reads the frozen target stored on the prediction.
      const response = await api("/gamification/award", {
        method: "POST",
        body: JSON.stringify({
          prediction_id: result.prediction_id,
        }),
      });

      if (response.awarded) {
        setRewarded(true);
        showToast(
          `+${response.points_awarded || 10} GreenPoints awarded to ${response.organization_unit || awardUnit}.`
        );
        await reloadData();
      } else if (response.duplicate) {
        setRewarded(true);
        showToast(
          `This disposal action was already rewarded to ${response.organization_unit || awardUnit}.`
        );
        await reloadData();
      } else {
        showToast("The reward was not awarded.", "error");
      }
    } catch (error) {
      showToast(error.message || "Unable to process GreenPoints.", "error");
    } finally {
      setRewarding(false);
    }
  };

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

            <div className="round2-reward-card">
              <div className="round2-reward-copy">
                <span className="round2-reward-target">
                  Award target
                  <strong>{result.award_unit || "General"}</strong>
                </span>
                <span className="round2-reward-icon"><Icon name="trophy" size={18} /></span>
                <div>
                  <span className="small-eyebrow">GREENPOINTS</span>
                  <strong>Dispose correctly and earn +10 points</strong>
                  <p>Your disposal action is linked to this prediction to prevent duplicate rewards.</p>
                </div>
              </div>
              <button className="primary-button" onClick={awardPoints} disabled={rewarding || rewarded}>
                {rewarding ? "Saving…" : rewarded ? "Points awarded" : "Dispose correctly +10"}
              </button>
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
                  prediction.detected_item ||
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


function GamificationPage({ gamification, leaderboard }) {
  const points = Number(gamification?.points || 0);
  const rank = gamification?.rank || null;
  const currentUnit = gamification?.organization_unit || "General";
  const recentRewards = gamification?.recent_rewards || [];

  const tier =
    points >= 200
      ? { name: "Eco Champion", next: null }
      : points >= 100
      ? { name: "Green Leader", next: 200 }
      : points >= 50
      ? { name: "Eco Explorer", next: 100 }
      : { name: "Getting Started", next: 50 };

  const progressTarget = tier.next || 200;
  const progress = Math.min(
    100,
    Math.round((points / progressTarget) * 100)
  );

  const topThree = (leaderboard || []).slice(0, 3);
  const totalCommunityPoints = (leaderboard || []).reduce(
    (sum, item) => sum + Number(item.points || 0),
    0
  );
  const totalCommunityActions = (leaderboard || []).reduce(
    (sum, item) => sum + Number(item.disposal_actions || 0),
    0
  );

  return (
    <div className="page-container">
      <PageIntro
        eyebrow="GREENPOINTS"
        title="Make correct disposal worth celebrating."
        description="GreenPoints turns responsible disposal into a measurable habit, with individual progress and department or hostel-block competition."
        className="centered"
      />

      <section className="gp-command-grid">
        <div className="panel gp-score-hero">
          <div className="gp-score-topline">
            <span className="small-eyebrow">YOUR IMPACT</span>
            <span className="gp-live-badge">
              <span className="pulse-dot" /> Live
            </span>
          </div>

          <div className="gp-score-body">
            <div className="gp-score-ring">
              <div className="gp-score-ring-inner">
                <strong>{formatNumber(points)}</strong>
                <span>points</span>
              </div>
            </div>

            <div className="gp-score-copy">
              <span className="gp-tier-label">{tier.name}</span>
              <h2>Every correct action adds up.</h2>
              <p>
                Your reward is assigned per scan to the unit selected on the
                scanner. Previous rewards remain with their original unit.
              </p>

              <div className="gp-progress-row">
                <span>Progress to next level</span>
                <strong>
                  {tier.next ? `${points}/${tier.next}` : "Top level"}
                </strong>
              </div>

              <div className="gp-progress-track">
                <span
                  style={{
                    width: `${tier.next ? progress : 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="gp-metric-strip">
            <div>
              <span>YOUR RANK</span>
              <strong>{rank ? `#${rank}` : "—"}</strong>
            </div>
            <div>
              <span>YOUR CURRENT UNIT</span>
              <strong>{currentUnit}</strong>
            </div>
            <div>
              <span>POINTS PER ACTION</span>
              <strong>+10</strong>
            </div>
          </div>
        </div>

        <div className="panel gp-unit-card">
          <div className="gp-unit-head">
            <div className="gp-icon-box">
              <Icon name="trophy" size={19} />
            </div>
            <div>
              <span className="small-eyebrow">HOW AWARDS WORK</span>
              <h3>One scan. One destination.</h3>
            </div>
          </div>

          <p>
            Choose the department or hostel block on the Scan Waste page before
            you classify an item. Only that scan's reward goes to the selected
            destination.
          </p>

          <div className="gp-award-preview">
            <span className="gp-award-star">✦</span>
            <div>
              <strong>Per-scan targeting</strong>
              <p>
                Select target → scan waste → confirm disposal → <b>+10</b> to
                that unit
              </p>
            </div>
          </div>

          <div className="gp-unit-summary gp-unit-summary-large">
            <div>
              <span>COMMUNITY POINTS</span>
              <strong>{formatNumber(totalCommunityPoints)} pts</strong>
            </div>
            <div>
              <span>DISPOSAL ACTIONS</span>
              <strong>{formatNumber(totalCommunityActions)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel gp-leaderboard-card">
        <div className="gp-section-head">
          <div>
            <span className="small-eyebrow">LIVE RANKING</span>
            <h3>Community leaderboard</h3>
            <p>
              Every reward stays attached to the unit selected for that
              individual scan.
            </p>
          </div>

          <div className="gp-live-pill">
            <span className="pulse-dot" /> Live leaderboard
          </div>
        </div>

        {leaderboard?.length ? (
          <>
            <div className="gp-podium">
              {[topThree[1], topThree[0], topThree[2]]
                .filter(Boolean)
                .map((item, index) => {
                  const actualRank = Number(item.rank || index + 1);
                  return (
                    <div
                      key={`${actualRank}-${item.organization_unit}`}
                      className={`gp-podium-card rank-${actualRank}`}
                    >
                      <div className="gp-podium-medal">
                        {actualRank === 1
                          ? "1st"
                          : actualRank === 2
                          ? "2nd"
                          : "3rd"}
                      </div>

                      <strong>
                        {item.organization_unit || "General"}
                      </strong>

                      <span>{formatNumber(item.points)} pts</span>

                      <small>
                        {formatNumber(item.disposal_actions || 0)} disposal
                        actions
                      </small>

                      {actualRank === 1 && (
                        <Icon name="trophy" size={18} />
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="gamification-table gp-full-table">
              {leaderboard.map((item) => {
                const isCurrent =
                  String(item.organization_unit || "")
                    .trim()
                    .toLowerCase() ===
                  String(currentUnit).trim().toLowerCase();

                return (
                  <div
                    className={`gamification-table-row ${
                      isCurrent ? "current" : ""
                    }`}
                    key={`${item.rank}-${item.organization_unit}`}
                  >
                    <span className="gamification-rank">#{item.rank}</span>

                    <div className="gp-rank-name">
                      <strong>
                        {item.organization_unit || "General"}
                      </strong>
                      <small>
                        {formatNumber(item.disposal_actions || 0)} disposal
                        actions
                      </small>
                    </div>

                    <div className="gp-row-points">
                      <strong>
                        {formatNumber(item.points)} pts
                      </strong>
                      {isCurrent && <span>Your unit</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            compact
            icon="trophy"
            title="Leaderboard is ready."
            description="Complete a correct disposal action to start the ranking."
          />
        )}
      </section>

      <section className="gp-bottom-grid">
        <div className="panel gp-how-card">
          <div className="gp-section-head compact">
            <div>
              <span className="small-eyebrow">WORKFLOW</span>
              <h3>Simple and fair.</h3>
            </div>
          </div>

          <div className="gp-step-list">
            <div className="gp-step">
              <span>01</span>
              <div>
                <strong>Select destination</strong>
                <p>
                  Choose a department or hostel block for the scan on the
                  scanner page.
                </p>
              </div>
            </div>

            <div className="gp-step">
              <span>02</span>
              <div>
                <strong>Classify the item</strong>
                <p>
                  EcoSort analyzes the waste image and returns the disposal
                  guidance.
                </p>
              </div>
            </div>

            <div className="gp-step">
              <span>03</span>
              <div>
                <strong>Confirm the action</strong>
                <p>
                  The +10 reward is stored against that scan and that exact
                  destination.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel gp-rewards-card">
          <div className="gp-rewards-header">
            <div>
              <span className="small-eyebrow">YOUR ACTIVITY</span>
              <h3>Recent rewards</h3>
            </div>

            <div className="gp-reward-count">
              {formatNumber(recentRewards.length)}
            </div>
          </div>

          {recentRewards.length ? (
            <div className="gp-reward-list">
              {recentRewards.map((reward) => (
                <div
                  className="gamification-reward-row"
                  key={`${reward.prediction_id}-${reward.created_at}`}
                >
                  <span className="round2-reward-icon">
                    <Icon name="check" size={16} />
                  </span>

                  <div>
                    <strong>Correct disposal</strong>
                    <small>
                      {reward.organization_unit
                        ? `${reward.organization_unit} · `
                        : ""}
                      {reward.prediction_id} ·{" "}
                      {formatDate(reward.created_at)}
                    </small>
                  </div>

                  <strong>+{reward.points}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon="clock"
              title="No rewards yet"
              description="Your scan-based GreenPoints activity will appear here."
            />
          )}
        </div>
      </section>
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
  { id: "gamification", label: "GreenPoints", icon: "trophy" },
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