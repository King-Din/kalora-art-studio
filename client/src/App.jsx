import React, { useState } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireRole, useAuth } from "./auth.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminPaintings from "./pages/AdminPaintings.jsx";
import AdminQueue from "./pages/AdminQueue.jsx";
import BookWall from "./pages/BookWall.jsx";
import Gallery from "./pages/Gallery.jsx";
import { Login, Signup } from "./pages/AuthPages.jsx";
import MyActivity from "./pages/MyActivity.jsx";
import PaintingDetail from "./pages/PaintingDetail.jsx";
import RequestPottery from "./pages/RequestPottery.jsx";

class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="alert" style={{ maxWidth: "600px", margin: "4rem auto" }}>
        <h2>The atelier encountered an unexpected condition.</h2>
        <p>Your session and data are secure. Please return to the gallery or refresh the page.</p>
        <button onClick={() => window.location.assign("/")}>Return to Gallery</button>
      </div>
    );
  }
}

function Nav() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link to="/" className="brand-link" onClick={() => setMenuOpen(false)}>
          <img
            src="/images/logo-emblem-transparent.png"
            alt="KĀLORA Logo Emblem"
            className="brand-emblem"
          />
          <div className="brand-identity">
            <span className="brand-name">KĀLORA</span>
            <span className="brand-tagline">Art for Your Spaces</span>
          </div>
        </Link>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        {/* Navigation & User Controls */}
        <div className={`nav-desktop ${menuOpen ? "is-open" : ""}`}>
          <nav className="nav-links" aria-label="Main navigation">
            {user?.role === "customer" && (
              <>
                <NavLink to="/" onClick={() => setMenuOpen(false)}>Gallery</NavLink>
                <NavLink to="/book" onClick={() => setMenuOpen(false)}>Wall Murals</NavLink>
                <NavLink to="/pottery" onClick={() => setMenuOpen(false)}>Pottery Studio</NavLink>
                <NavLink to="/activity" onClick={() => setMenuOpen(false)}>My Activity</NavLink>
              </>
            )}
            {user?.role === "studio" && (
              <>
                <NavLink to="/" onClick={() => setMenuOpen(false)}>Gallery</NavLink>
                <NavLink to="/admin" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
                <NavLink to="/admin/paintings" onClick={() => setMenuOpen(false)}>Paintings</NavLink>
                <NavLink to="/admin/orders" onClick={() => setMenuOpen(false)}>Orders</NavLink>
                <NavLink to="/admin/bookings" onClick={() => setMenuOpen(false)}>Bookings</NavLink>
                <NavLink to="/admin/pottery" onClick={() => setMenuOpen(false)}>Pottery</NavLink>
              </>
            )}
          </nav>

          <div className="user-controls">
            {user ? (
              <>
                <div className="user-pill">
                  <span>{user.name}</span>
                  <span className="user-role-badge">{user.role}</span>
                </div>
                <button
                  type="button"
                  className="btn-nav-logout"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="auth-nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/signup"
                  className="auth-nav-link btn-cta"
                  onClick={() => setMenuOpen(false)}
                >
                  Join KĀLORA
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h3 className="footer-brand-title">KĀLORA</h3>
          <p className="footer-desc">
            A contemporary Indian art and design house celebrating handcrafted original paintings,
            bespoke wall murals, and artisanal pottery.
          </p>
          <div className="footer-badges-row">
            <span className="footer-pill-tag">✦ Original Art</span>
            <span className="footer-pill-tag">✦ Natural Pigments</span>
            <span className="footer-pill-tag">✦ Lead-Free Ceramics</span>
          </div>
        </div>

        <div className="footer-col">
          <h4>Studio Offerings</h4>
          <ul>
            <li><Link to="/">Original Paintings</Link></li>
            <li><Link to="/book">Wall Mural Commissions</Link></li>
            <li><Link to="/pottery">Handcrafted Ceramics</Link></li>
            <li><Link to="/activity">Customer Portals</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Our Ateliers</h4>
          <p className="footer-atelier-info">
            <strong>Jaipur Studio:</strong><br />
            Civil Lines, Jaipur 302006<br />
            Rajasthan, India
          </p>
          <p className="footer-atelier-info" style={{ marginTop: "0.5rem" }}>
            <strong>Hours:</strong> Mon – Sat, 10:00 – 19:00 IST
          </p>
        </div>

        <div className="footer-col">
          <h4>Handcrafted Integrity</h4>
          <p className="footer-atelier-info">
            Every piece is created by skilled traditional and modern artisans across India. We preserve heritage techniques through contemporary architectural expressions.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <div>© {new Date().getFullYear()} KĀLORA Art Studio. All rights reserved.</div>
        <div>Contemporary Indian Artistry · Handcrafted in Rajasthan</div>
      </div>
    </footer>
  );
}

const NotFoundPage = () => (
  <div className="card narrow" style={{ textAlign: "center" }}>
    <h2>Piece Not Found</h2>
    <p className="muted">The canvas or studio service you were looking for does not exist or has been archived.</p>
    <Link to="/" className="btn" style={{ marginTop: "1rem" }}>Return to Gallery</Link>
  </div>
);

export default function App() {
  const customer = (el) => <RequireRole role="customer">{el}</RequireRole>;
  const studio = (el) => <RequireRole role="studio">{el}</RequireRole>;

  return (
    <AuthProvider>
      <div className="app-wrapper">
        <a href="#main" className="skip">Skip to content</a>
        <Nav />
        <main id="main">
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<RequireRole><Gallery /></RequireRole>} />
              <Route path="/paintings/:id" element={<RequireRole><PaintingDetail /></RequireRole>} />
              <Route path="/book" element={customer(<BookWall />)} />
              <Route path="/pottery" element={customer(<RequestPottery />)} />
              <Route path="/activity" element={customer(<MyActivity />)} />
              <Route path="/admin" element={studio(<AdminDashboard />)} />
              <Route path="/admin/paintings" element={studio(<AdminPaintings />)} />
              <Route path="/admin/orders" element={studio(<AdminQueue kind="orders" />)} />
              <Route path="/admin/bookings" element={studio(<AdminQueue kind="bookings" />)} />
              <Route path="/admin/pottery" element={studio(<AdminQueue kind="pottery" />)} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
