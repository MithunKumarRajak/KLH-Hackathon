import React from 'react'
import { Link } from 'react-router-dom'
import { Leaf, ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <Leaf size={20} strokeWidth={1.5} />
              <span>SATVIKA</span>
            </div>
            <p className="footer-tagline">
              Ancient purity meets modern intelligence for healthier, compliant food products.
            </p>
          </div>

          <div className="footer-col">
            <h4>Platform</h4>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/recipes/create">Create Recipe</Link>
            <Link to="/ingredients">Ingredients</Link>
            <Link to="/about">About</Link>
          </div>

          <div className="footer-col">
            <h4>Compliance</h4>
            <Link to="/compliance/fssai">FSSAI Guidelines</Link>
            <Link to="/compliance/labeling">Labeling Standards</Link>
            <Link to="/compliance/fop">FOP Requirements</Link>
            <Link to="/compliance/docs">Documentation</Link>
          </div>

          <div className="footer-col">
            <h4>Contact</h4>
            <a href="mailto:satvikaindiaco@gmail.com"><Mail size={14} /> satvikaindiaco@gmail.com</a>
            <a href="#"><MapPin size={14} /> Bhopal, India</a>
            <a href="tel:+918269750934"><Phone size={14} /> +91 8269750934</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 Satvika. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
