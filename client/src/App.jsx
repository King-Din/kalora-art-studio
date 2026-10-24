import React from "react";
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
      <div role="alert" className="alert">
        <h2>Something broke on this page.</h2>
        <button onClick={() => window.location.assign("/")}>Back to the gallery</button>
      </div>
    );
  }
}

function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <Link to="/" className="brand">Art Studio</Link>
      <nav aria-label="Main">
        {user?.role === "customer" && (
          <>
            <NavLink to="/">Gallery</NavLink>
            <NavLink to="/book">Book a wall</NavLink>
            <NavLink to="/pottery">Pottery</NavLink>
            <NavLink to="/activity">My activity</NavLink>
          </>
        )}
        {user?.role === "studio" && (
          <>
            <NavLink to="/">Gallery</NavLink>
            <NavLink to="/admin">Dashboard</NavLink>
            <NavLink to="/admin/paintings">Paintings</NavLink>
            <NavLink to="/admin/orders">Orders</NavLink>
            <NavLink to="/admin/bookings">Bookings</NavLink>
            <NavLink to="/admin/pottery">Pottery</NavLink>
          </>
        )}
      </nav>
      <div className="who">
        {user ? (
          <>
            <span>{user.name} ({user.role})</span>
            <button className="secondary" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/signup">Sign up</NavLink>
          </>
        )}
      </div>
    </header>
  );
}

const NotFoundPage = () => (
  <div>
    <h2>Page not found</h2>
    <p><Link to="/">Go to the gallery</Link></p>
  </div>
);

export default function App() {
  const customer = (el) => <RequireRole role="customer">{el}</RequireRole>;
  const studio = (el) => <RequireRole role="studio">{el}</RequireRole>;
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
