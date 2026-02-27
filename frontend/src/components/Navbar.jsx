import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Leaf, LogOut, User, Upload, Bell, Settings } from 'lucide-react'
import { gsap } from 'gsap'
import './Navbar.css'

export default function Navbar({ variant = 'dark' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const token = localStorage.getItem('satvika_token')
  const isAuth = !!token

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    gsap.fromTo(navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.2 }
    )
  }, [])

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    localStorage.removeItem('satvika_token')
    localStorage.removeItem('satvika_user')
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <nav
      ref={navRef}
      className={`navbar ${variant} ${scrolled ? 'scrolled' : ''}`}
    >
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <Leaf size={24} strokeWidth={1.5} />
          <span className="brand-text">SATVIKA</span>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/about" className={isActive('/about') ? 'active' : ''} onClick={() => setMenuOpen(false)}>About</Link>
          {isAuth && (
            <>
              <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/recipes" className={isActive('/recipes') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Recipes</Link>
              <Link to="/ingredients" className={isActive('/ingredients') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Ingredients</Link>
              <Link to="/batch-upload" className={isActive('/batch-upload') ? 'active' : ''} onClick={() => setMenuOpen(false)}>
                <Upload size={14} style={{ marginRight: 4 }} />Batch Upload
              </Link>
              <Link to="/regulatory-alerts" className={isActive('/regulatory-alerts') ? 'active' : ''} onClick={() => setMenuOpen(false)}>
                <Bell size={14} style={{ marginRight: 4 }} />Alerts
              </Link>
              <Link to="/settings" className={isActive('/settings') ? 'active' : ''} onClick={() => setMenuOpen(false)}>
                <Settings size={14} style={{ marginRight: 4 }} />Settings
              </Link>
            </>
          )}
          {isAuth ? (
            <button className="btn btn-sm btn-secondary nav-cta" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <LogOut size={14} /> Sign Out
            </button>
          ) : (
            <Link to="/login" className="btn btn-sm btn-secondary nav-cta" onClick={() => setMenuOpen(false)}>Sign In</Link>
          )}
        </div>

        <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  )
}
