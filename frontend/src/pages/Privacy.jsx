import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Privacy() {
  return (
    <>
      <Navbar variant="light" />
      <main style={{ paddingTop: 'var(--header-height)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 3, color: '#6b7280', marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 48 }}>Last updated: February 2026</p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>1. Information We Collect</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            We collect information you provide directly to us, such as when you create an account, 
            submit a recipe, or contact us for support. This includes your name, email address, 
            and any food product or recipe data you enter into the platform.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            We also automatically collect certain technical information when you use Satvika, 
            including your IP address, browser type, pages visited, and timestamps of your 
            interactions with the service.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>2. How We Use Your Information</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            We use the information we collect to provide, maintain, and improve the Satvika platform, 
            including generating nutrition labels, checking FSSAI compliance, and personalising your 
            experience. We may also use your email address to send service notifications and updates.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            We do not sell, rent, or share your personal information with third parties for their 
            marketing purposes. Recipe and nutrition data you upload remains your property.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>3. Data Storage and Security</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Your data is stored securely on servers located in India. We employ industry-standard 
            security measures including encrypted connections (HTTPS), hashed passwords, and 
            access controls to protect your information from unauthorised access or disclosure.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            While we take reasonable precautions, no system is completely secure. You are 
            responsible for keeping your account credentials confidential.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>4. Data Retention</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            We retain your account information and recipe data for as long as your account is active. 
            If you delete your account, your personal information and recipes will be permanently 
            removed from our servers within 30 days.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>5. Cookies</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Satvika uses cookies and similar technologies to maintain your login session and 
            remember your preferences. See our <Link to="/cookies" style={{ color: '#16a34a', textDecoration: 'underline' }}>Cookie Policy</Link> for full details.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>6. Your Rights</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            You have the right to access, correct, or delete your personal data at any time. 
            To exercise these rights, contact us at{' '}
            <a href="mailto:satvikaindiaco@gmail.com" style={{ color: '#16a34a', textDecoration: 'underline' }}>
              satvikaindiaco@gmail.com
            </a>.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>7. Changes to This Policy</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            We may update this Privacy Policy from time to time. We will notify you of significant 
            changes by posting a notice on the platform or sending an email to your registered 
            address. Continued use of Satvika after changes constitutes acceptance of the updated policy.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>8. Contact</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            For any privacy-related questions or concerns, please contact us at{' '}
            <a href="mailto:satvikaindiaco@gmail.com" style={{ color: '#16a34a', textDecoration: 'underline' }}>
              satvikaindiaco@gmail.com
            </a>{' '}
            or write to us at Bhopal, India.
          </p>

          <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 24 }}>
            <Link to="/terms" style={{ color: '#16a34a', fontSize: 14 }}>Terms of Service</Link>
            <Link to="/cookies" style={{ color: '#16a34a', fontSize: 14 }}>Cookie Policy</Link>
            <Link to="/" style={{ color: '#6b7280', fontSize: 14 }}>Back to Home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
