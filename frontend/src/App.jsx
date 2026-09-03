import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // =========================================================
  // CATEGORY
  // =========================================================

  const getCategoryInfo = (category) => {
    switch (category) {
      case "Recyclable":
        return {
          title: "Recyclable",
          icon: "♻",
          className: "recyclable",
          description: "Can enter a recycling stream.",
        };

      case "Organic":
        return {
          title: "Organic",
          icon: "✿",
          className: "organic",
          description: "Suitable for organic waste handling.",
        };

      case "Hazardous":
        return {
          title: "Hazardous",
          icon: "!",
          className: "hazardous",
          description: "Needs safe specialized disposal.",
        };

      default:
        return {
          title: category || "Unknown",
          icon: "•",
          className: "neutral",
          description: "Waste classification result.",
        };
    }
  };

  // =========================================================
  // FILE SELECT
  // =========================================================

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const newPreview = URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setPreview(newPreview);
    setResult(null);
    setError("");
    setFeedbackSent(false);
  };

  // =========================================================
  // CAMERA
  // =========================================================

  const startCamera = async () => {
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera is not supported by this browser."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      setCameraOpen(true);

      setTimeout(async () => {
        if (!videoRef.current) {
          setError("Camera preview could not be initialized.");
          return;
        }

        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
          setCameraReady(true);
        } catch (err) {
          console.error(err);
          setError("Could not start camera preview.");
        }
      }, 200);
    } catch (err) {
      console.error(err);

      setCameraOpen(false);
      setCameraReady(false);

      setError(
        err.message ||
          "Camera access failed. Please allow camera permission."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setError("Camera is not ready.");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setError("Camera preview is not ready yet.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Could not create image canvas.");
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture image.");
          return;
        }

        const capturedFile = new File(
          [blob],
          `camera-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        if (preview) {
          URL.revokeObjectURL(preview);
        }

        setFile(capturedFile);
        setPreview(URL.createObjectURL(blob));
        setResult(null);
        setError("");
        setFeedbackSent(false);

        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  // =========================================================
  // HISTORY
  // =========================================================

  const loadHistory = async () => {
    try {
      const response = await fetch(
        `${API_URL}/history?limit=8`
      );

      if (!response.ok) {
        throw new Error("History request failed.");
      }

      const data = await response.json();

      setHistory(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================================================
  // STATS
  // =========================================================

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);

      if (!response.ok) {
        throw new Error("Stats request failed.");
      }

      const data = await response.json();

      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadHistory();
    loadStats();

    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  // =========================================================
  // PREDICT
  // =========================================================

  const classifyWaste = async () => {
    if (!file) {
      setError("Please upload or capture a waste image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setFeedbackSent(false);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/predict`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Prediction request failed."
        );
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      await Promise.all([
        loadHistory(),
        loadStats(),
      ]);

      setTimeout(() => {
        document
          .getElementById("result")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 120);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Could not connect to the AI backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FEEDBACK
  // =========================================================

  const submitFeedback = async (isCorrect) => {
    if (!result?.prediction_id) return;

    try {
      const params = new URLSearchParams();

      params.set(
        "prediction_id",
        result.prediction_id
      );

      params.set(
        "is_correct",
        String(isCorrect)
      );

      const response = await fetch(
        `${API_URL}/feedback?${params.toString()}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Feedback request failed.");
      }

      setFeedbackSent(true);
    } catch (err) {
      console.error(err);

      setError("Could not save feedback.");
    }
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetAll = () => {
    stopCamera();

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    setFeedbackSent(false);
  };

  const resultInfo = result
    ? getCategoryInfo(result.category)
    : null;

  return (
    <div className="app">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="navbar">

        <div className="nav-inner">

          <div className="brand">

            <div className="brand-logo">
              ♻
            </div>

            <div>
              <h1>Smart Waste Classifier</h1>
              <p>AI-powered waste identification</p>
            </div>

          </div>

          <nav className="nav-links">

            <a href="#classifier">
              Classify
            </a>

            <a href="#stats">
              Insights
            </a>

            <a href="#history">
              History
            </a>

          </nav>

          <div className="ai-status">
            <span></span>
            AI ONLINE
          </div>

        </div>

      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="main">

        {/* ===================================================
            HERO
        ==================================================== */}

        <section className="hero">

          <div className="hero-left">

            <div className="hero-tag">
              SMART WASTE MANAGEMENT
            </div>

            <h2>
              Know your waste.
              <br />
              <em>Sort it right.</em>
            </h2>

            <p>
              Upload a waste image or use your camera.
              Smart Waste Classifier uses AI to identify
              the waste stream and recommend the right
              disposal action.
            </p>

            <div className="hero-actions">

              <a
                href="#classifier"
                className="hero-primary"
              >
                Start Classifying
                <span>→</span>
              </a>

              <a
                href="#stats"
                className="hero-secondary"
              >
                View insights
              </a>

            </div>

          </div>


          <div className="hero-right">

            <div className="hero-orb"></div>

            <div className="hero-center">
              ♻
            </div>

            <div className="floating-card floating-one">

              <span className="floating-icon recyclable-bg">
                ♻
              </span>

              <div>
                <strong>Recyclable</strong>
                <small>Paper · Plastic · Metal</small>
              </div>

            </div>


            <div className="floating-card floating-two">

              <span className="floating-icon organic-bg">
                ✿
              </span>

              <div>
                <strong>Organic</strong>
                <small>Food · Plant waste</small>
              </div>

            </div>


            <div className="floating-card floating-three">

              <span className="floating-icon hazardous-bg">
                !
              </span>

              <div>
                <strong>Hazardous</strong>
                <small>Batteries · E-waste</small>
              </div>

            </div>

          </div>

        </section>


        {/* ===================================================
            CATEGORY CARDS
        ==================================================== */}

        <section className="category-overview">

          <div className="overview-title">
            <span>
              THREE WASTE STREAMS
            </span>

            <h3>
              One simple decision
            </h3>
          </div>


          <div className="category-grid">

            <div className="category-card recyclable-card">

              <div className="category-icon">
                ♻
              </div>

              <div>
                <strong>Recyclable</strong>

                <p>
                  Paper, plastic, metal and recyclable materials.
                </p>
              </div>

            </div>


            <div className="category-card organic-card">

              <div className="category-icon">
                ✿
              </div>

              <div>
                <strong>Organic</strong>

                <p>
                  Food scraps and biodegradable waste.
                </p>
              </div>

            </div>


            <div className="category-card hazardous-card">

              <div className="category-icon">
                !
              </div>

              <div>
                <strong>Hazardous</strong>

                <p>
                  Batteries and waste requiring special handling.
                </p>
              </div>

            </div>

          </div>

        </section>


        {/* ===================================================
            CLASSIFIER
        ==================================================== */}

        <section
          id="classifier"
          className="classifier"
        >

          <div className="classifier-heading">

            <div>

              <span className="section-number">
                01
              </span>

              <span className="section-label">
                CLASSIFY WASTE
              </span>

              <h2>
                Upload an image
              </h2>

              <p>
                Give the AI a clear photo of the waste item.
              </p>

            </div>

            <div className="classifier-tip">
              <span>TIP</span>
              Use a clear, well-lit image.
            </div>

          </div>


          {/* Upload */}

          <label className="upload-zone">

            {preview ? (

              <div className="preview">

                <img
                  src={preview}
                  alt="Selected waste"
                />

                <div className="preview-status">
                  <span>✓</span>
                  Image ready for analysis
                </div>

              </div>

            ) : (

              <div className="upload-empty">

                <div className="upload-icon">
                  ↑
                </div>

                <h3>
                  Drop your waste image here
                </h3>

                <p>
                  or choose an image from your device
                </p>

                <span>
                  JPG · JPEG · PNG · Max 5 MB
                </span>

              </div>

            )}

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
            />

          </label>


          {/* Upload controls */}

          <div className="source-buttons">

            <label className="source-button">

              <span>▣</span>
              Upload image

              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
              />

            </label>

            <button
              type="button"
              className="source-button"
              onClick={startCamera}
            >
              <span>◉</span>
              Use camera
            </button>

          </div>


          {file && (

            <div className="selected-file">

              <div className="file-info">

                <div className="file-check">
                  ✓
                </div>

                <div>
                  <small>SELECTED FILE</small>
                  <strong>{file.name}</strong>
                </div>

              </div>

              <button
                type="button"
                onClick={resetAll}
              >
                Remove
              </button>

            </div>

          )}


          {/* Analyze */}

          <div className="analyze-row">

            <div className="step-copy">

              <span className="section-number">
                02
              </span>

              <div>
                <span className="section-label">
                  AI ANALYSIS
                </span>

                <h3>
                  Let AI classify the item
                </h3>
              </div>

            </div>


            <button
              type="button"
              className="analyze-button"
              onClick={classifyWaste}
              disabled={!file || loading}
            >

              {loading ? (
                <>
                  <span className="loader"></span>
                  Analyzing image...
                </>
              ) : (
                <>
                  ✦ Analyze with AI
                  <span>→</span>
                </>
              )}

            </button>

          </div>


          {error && (
            <div className="error">
              <span>!</span>
              {error}
            </div>
          )}

        </section>


        {/* ===================================================
            RESULT
        ==================================================== */}

        {result && resultInfo && (

          <section
            id="result"
            className={`result ${resultInfo.className}`}
          >

            <div className="result-header">

              <div>

                <span className="section-label">
                  AI ANALYSIS COMPLETE
                </span>

                <h2>
                  Classification Result
                </h2>

                <p>
                  Here's what our model found.
                </p>

              </div>

              <div className="result-check">
                ✓
              </div>

            </div>


            {/* Main result */}

            <div className="result-highlight">

              <div className="result-icon">
                {resultInfo.icon}
              </div>

              <div className="result-name">

                <span>
                  DETECTED ITEM
                </span>

                <h3>
                  {result.detected_item || result.category}
                </h3>

                <div className="result-stream">
                  {resultInfo.icon}
                  {resultInfo.title}
                </div>

              </div>


              <div className="confidence-box">

                <span>
                  CONFIDENCE
                </span>

                <strong>
                  {result.confidence}%
                </strong>

                <small>
                  {result.confidence_level}
                </small>

              </div>

            </div>


            {/* Confidence */}

            <div className="confidence-section">

              <div className="confidence-head">

                <span>
                  AI confidence score
                </span>

                <strong>
                  {result.confidence}%
                </strong>

              </div>

              <div className="confidence-bar">

                <div
                  style={{
                    width: `${Math.min(
                      result.confidence,
                      100
                    )}%`,
                  }}
                ></div>

              </div>

            </div>


            {/* Alternatives */}

            {result.top_predictions?.length > 0 && (

              <div className="alternatives">

                <div className="subheading">

                  <div>
                    <strong>
                      What the AI considered
                    </strong>

                    <span>
                      Top prediction alternatives
                    </span>
                  </div>

                </div>


                <div className="alternative-list">

                  {result.top_predictions.map(
                    (item, index) => (

                      <div
                        className={
                          index === 0
                            ? "alt-item top"
                            : "alt-item"
                        }
                        key={`${item.detected_item}-${index}`}
                      >

                        <div className="alt-left">

                          <span className="alt-rank">
                            {index + 1}
                          </span>

                          <div>
                            <strong>
                              {item.detected_item}
                            </strong>

                            <small>
                              {item.category}
                            </small>
                          </div>

                        </div>

                        <div className="alt-right">

                          <strong>
                            {item.confidence}%
                          </strong>

                          <div className="alt-bar">
                            <div
                              style={{
                                width: `${Math.min(
                                  item.confidence,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}


            {/* Guidance */}

            <div className="guidance">

              <div className="guidance-header">

                <div className="guidance-icon">
                  ✓
                </div>

                <div>
                  <span>
                    RECOMMENDED ACTION
                  </span>

                  <h3>
                    What should you do?
                  </h3>

                  <p>
                    {result.guidance}
                  </p>
                </div>

              </div>


              <div className="do-grid">

                <div className="do-box">

                  <strong>
                    ✓ DO
                  </strong>

                  {result.disposal?.do?.map(
                    (item, index) => (
                      <p key={index}>
                        {item}
                      </p>
                    )
                  )}

                </div>


                <div className="dont-box">

                  <strong>
                    × DON'T
                  </strong>

                  {result.disposal?.dont?.map(
                    (item, index) => (
                      <p key={index}>
                        {item}
                      </p>
                    )
                  )}

                </div>

              </div>

            </div>


            {/* Feedback */}

            <div className="feedback">

              <div>
                <strong>
                  Was this prediction correct?
                </strong>

                <span>
                  Help improve prediction quality.
                </span>
              </div>

              {feedbackSent ? (

                <div className="feedback-success">
                  ✓ Feedback saved
                </div>

              ) : (

                <div className="feedback-buttons">

                  <button
                    type="button"
                    onClick={() => submitFeedback(true)}
                  >
                    👍 Correct
                  </button>

                  <button
                    type="button"
                    onClick={() => submitFeedback(false)}
                  >
                    👎 Incorrect
                  </button>

                </div>

              )}

            </div>


            <div className="result-meta">

              <span>
                ID {result.prediction_id}
              </span>

              <span>
                {result.processing_time_ms} ms
              </span>

              <span>
                {result.model_version}
              </span>

            </div>


            <button
              type="button"
              className="again-button"
              onClick={resetAll}
            >
              ↻ Analyze another item
            </button>

          </section>

        )}


        {/* ===================================================
            INSIGHTS
        ==================================================== */}

        <section
          id="stats"
          className="dashboard"
        >

          <div className="dashboard-heading">

            <div>
              <span className="section-label">
                INSIGHTS
              </span>

              <h2>
                Waste classification overview
              </h2>

              <p>
                A live summary of your AI classifications.
              </p>
            </div>

            <button
              type="button"
              className="refresh"
              onClick={() => {
                loadHistory();
                loadStats();
              }}
            >
              ↻ Refresh
            </button>

          </div>


          <div className="stats-grid">

            <div className="stat">
              <span className="stat-symbol">
                ◉
              </span>

              <div>
                <small>
                  TOTAL SCANS
                </small>

                <strong>
                  {stats?.total_predictions ?? 0}
                </strong>
              </div>
            </div>


            <div className="stat">
              <span className="stat-symbol recyclable-symbol">
                ♻
              </span>

              <div>
                <small>
                  RECYCLABLE
                </small>

                <strong>
                  {stats?.recyclable ?? 0}
                </strong>
              </div>
            </div>


            <div className="stat">
              <span className="stat-symbol organic-symbol">
                ✿
              </span>

              <div>
                <small>
                  ORGANIC
                </small>

                <strong>
                  {stats?.organic ?? 0}
                </strong>
              </div>
            </div>


            <div className="stat">
              <span className="stat-symbol hazardous-symbol">
                !
              </span>

              <div>
                <small>
                  HAZARDOUS
                </small>

                <strong>
                  {stats?.hazardous ?? 0}
                </strong>
              </div>
            </div>

          </div>

        </section>


        {/* ===================================================
            HISTORY
        ==================================================== */}

        <section
          id="history"
          className="dashboard history-section"
        >

          <div className="dashboard-heading">

            <div>
              <span className="section-label">
                RECENT ACTIVITY
              </span>

              <h2>
                Classification history
              </h2>

              <p>
                Your latest AI-powered waste scans.
              </p>
            </div>

          </div>


          <div className="history-list">

            {history.length === 0 ? (

              <div className="empty-history">

                <div className="empty-icon">
                  ♻
                </div>

                <strong>
                  No classifications yet
                </strong>

                <span>
                  Analyze your first waste image to see it here.
                </span>

              </div>

            ) : (

              history.map((item) => {

                const info = getCategoryInfo(
                  item.category
                );

                return (
                  <div
                    className="history-row"
                    key={item.prediction_id}
                  >

                    <div
                      className={`history-icon ${info.className}`}
                    >
                      {info.icon}
                    </div>

                    <div className="history-item">

                      <strong>
                        {item.detected_item}
                      </strong>

                      <span>
                        {item.category}
                      </span>

                    </div>

                    <div className="history-confidence">

                      <strong>
                        {item.confidence}%
                      </strong>

                      <div className="tiny-bar">
                        <div
                          style={{
                            width: `${Math.min(
                              item.confidence,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>

                    </div>

                    <div className="history-date">
                      {new Date(
                        item.created_at
                      ).toLocaleDateString()}
                    </div>

                  </div>
                );
              })

            )}

          </div>

        </section>

      </main>


      {/* =====================================================
          CAMERA MODAL
      ====================================================== */}

      {cameraOpen && (

        <div className="camera-overlay">

          <div className="camera-modal">

            <div className="camera-header">

              <div>

                <span className="section-label">
                  LIVE CAMERA
                </span>

                <h2>
                  Capture waste image
                </h2>

                <p>
                  Position the item clearly inside the frame.
                </p>

              </div>

              <button
                type="button"
                className="camera-close"
                onClick={stopCamera}
              >
                ×
              </button>

            </div>


            <div className="camera-frame">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
              ></video>

              {!cameraReady && (

                <div className="camera-loading">

                  <span className="loader"></span>

                  Starting camera...

                </div>

              )}

              <div className="camera-guide"></div>

            </div>


            <div className="camera-actions">

              <button
                type="button"
                className="capture-button"
                onClick={capturePhoto}
                disabled={!cameraReady}
              >
                <span></span>
                Capture photo
              </button>

              <button
                type="button"
                className="camera-cancel"
                onClick={stopCamera}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}


      <canvas
        ref={canvasRef}
        className="hidden"
      ></canvas>


      {/* FOOTER */}

      <footer className="footer">

        <strong>
          SMART WASTE CLASSIFIER
        </strong>

        <span>
          AI-assisted waste identification for smarter disposal
        </span>

      </footer>

    </div>
  );
}

export default App;