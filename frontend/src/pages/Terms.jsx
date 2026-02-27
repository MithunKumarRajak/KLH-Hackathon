import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Terms() {
  return (
    <>
      <Navbar variant="light" />
      <main style={{ paddingTop: 'var(--header-height)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 3, color: '#6b7280', marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 48 }}>Last updated: February 2026</p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>1. Acceptance of Terms</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            By accessing or using Satvika, you agree to be bound by these Terms of Service and all 
            applicable laws and regulations. If you do not agree with any of these terms, you are 
            prohibited from using the platform. These terms apply to all users, including those who 
            browse, register an account, or submit recipes.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>2. Description of Service</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Satvika is a nutrition label generation and FSSAI compliance checking platform designed 
            for food manufacturers, nutritionists, and product developers in India. The platform 
            provides AI-assisted analysis, label generation, and regulatory guidance based on 
            publicly available FSSAI standards.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            The compliance information provided is for guidance purposes only and does not constitute 
            legal or regulatory advice. Always verify compliance requirements with a qualified 
            regulatory consultant or directly with FSSAI before commercialising a product.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>3. User Accounts</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            You are responsible for maintaining the confidentiality of your account credentials 
            and for all activities that occur under your account. You must immediately notify us 
            of any unauthorised use of your account. Satvika is not liable for any loss or damage 
            arising from your failure to keep your credentials secure.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            You must be at least 18 years of age to create an account. By registering, you 
            represent that all information you provide is accurate and complete.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>4. Acceptable Use</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            You agree not to use Satvika to upload false or misleading nutritional data, 
            infringe on intellectual property rights, attempt to gain unauthorised access to 
            other accounts or systems, or engage in any activity that disrupts or interferes 
            with the service.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            You may not use automated tools, bots, or scrapers to extract data from the platform 
            without prior written permission from Satvika.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>5. Intellectual Property</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            The Satvika platform, including its design, code, and AI models, is owned by Satvika 
            and protected by applicable intellectual property laws. You retain ownership of any 
            recipe and nutritional data you submit to the platform.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            By submitting data, you grant Satvika a limited, non-exclusive licence to process 
            and store that data solely for the purpose of providing the service to you.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>6. Disclaimer of Warranties</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Satvika is provided on an "as is" and "as available" basis without warranties of any kind, 
            either express or implied. We do not warrant that the service will be uninterrupted, 
            error-free, or completely accurate. Nutrition calculations are based on standard reference 
            databases and Atwater factors; actual nutritional content of physical products may vary.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>7. Limitation of Liability</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            In no event shall Satvika be liable for any indirect, incidental, special, or consequential 
            damages arising out of or in connection with your use of the platform. Our maximum 
            liability to you for any claim shall not exceed the amount you paid to us in the 
            twelve months preceding the claim.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>8. Termination</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            We reserve the right to suspend or terminate your account at any time if you violate 
            these terms or engage in conduct that we determine is harmful to other users or the 
            platform. You may also delete your account at any time through the Settings page.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>9. Governing Law</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            These Terms shall be governed by and construed in accordance with the laws of India. 
            Any disputes shall be subject to the exclusive jurisdiction of the courts in Bhopal, 
            Madhya Pradesh.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>10. Contact</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', marginBottom: 16 }}>
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:satvikaindiaco@gmail.com" style={{ color: '#16a34a', textDecoration: 'underline' }}>
              satvikaindiaco@gmail.com
            </a>.
          </p>

          <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 24 }}>
            <Link to="/privacy" style={{ color: '#16a34a', fontSize: 14 }}>Privacy Policy</Link>
            <Link to="/cookies" style={{ color: '#16a34a', fontSize: 14 }}>Cookie Policy</Link>
            <Link to="/" style={{ color: '#6b7280', fontSize: 14 }}>Back to Home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
