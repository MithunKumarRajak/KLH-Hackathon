import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Cookies() {
  return (
    <>
      <Navbar variant="light" />
      <main style={{ paddingTop: 'var(--header-height)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 3, color: '#6b7280', marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Cookie Policy</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 48 }}>Last updated: February 2026</p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>1. What Are Cookies</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Cookies are small text files placed on your device by websites you visit. They are widely 
            used to make websites work efficiently and to provide information to the site owners. 
            Satvika uses cookies and similar technologies such as localStorage to keep the platform 
            functioning correctly.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>2. Cookies We Use</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 8 }}>
            Satvika uses the following types of cookies and browser storage:
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 8, paddingLeft: 20 }}>
            <strong>Authentication tokens</strong> — We store a JWT (JSON Web Token) in your browser's 
            localStorage under the key <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, fontSize: 13 }}>satvika_token</code> to keep you logged in between sessions. 
            This token expires after a set period and is never shared with third parties.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 8, paddingLeft: 20 }}>
            <strong>User preferences</strong> — We store your settings (such as default serving size, 
            preferred language, and display preferences) in localStorage so they persist across 
            sessions without requiring a server round-trip.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16, paddingLeft: 20 }}>
            <strong>Session data</strong> — Standard session cookies used by the web server to 
            maintain server-side state for form submissions and CSRF protection.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>3. Third-Party Cookies</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Satvika does not currently use any third-party advertising or analytics cookies. 
            We do not embed social media trackers or advertising pixels. The only external 
            requests made are to the Mistral AI API for AI-powered features, which is invoked 
            server-side and does not set cookies on your device.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>4. How Long Cookies Last</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Authentication tokens stored in localStorage remain until you log out or 
            until the token expires (typically 24 hours for access tokens and 7 days for 
            refresh tokens). Session cookies are deleted when you close your browser. 
            Preference data in localStorage persists indefinitely until you clear your 
            browser's storage or delete your account.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>5. Managing Cookies</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            You can control and delete cookies through your browser settings. Most browsers 
            allow you to refuse or delete cookies entirely. However, disabling cookies and 
            localStorage will prevent you from logging in and using most features of Satvika, 
            as authentication requires token storage in your browser.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            To clear Satvika's stored data, you can log out (which removes the authentication token), 
            or clear your browser's localStorage for this domain directly in your browser's 
            developer tools.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>6. Changes to This Policy</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            If we significantly change how we use cookies or introduce third-party tracking, 
            we will update this policy and notify users via the platform. The "Last updated" 
            date at the top of this page reflects the most recent revision.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>7. Contact</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Questions about our use of cookies? Contact us at{' '}
            <a href="mailto:satvikaindiaco@gmail.com" style={{ color: '#16a34a', textDecoration: 'underline' }}>
              satvikaindiaco@gmail.com
            </a>.
          </p>

          <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 24 }}>
            <Link to="/privacy" style={{ color: '#16a34a', fontSize: 14 }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: '#16a34a', fontSize: 14 }}>Terms of Service</Link>
            <Link to="/" style={{ color: '#6b7280', fontSize: 14 }}>Back to Home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
