import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { Leaf, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { authAPI } from '../services/api'
import './Auth.css'

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', username: '', password: '', confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef(null)
  const imageRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(imageRef.current,
      { clipPath: 'inset(0 0 0 100%)' },
      { clipPath: 'inset(0 0 0 0%)', duration: 1.2, ease: 'power4.inOut' }
    )
    .fromTo(formRef.current?.querySelectorAll('.auth-animate') || [],
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' },
      '-=0.5'
    )
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const res = await authAPI.register({
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
      })
      localStorage.setItem('satvika_token', res.data.token)
      localStorage.setItem('satvika_user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="auth-form-side">
        <div className="auth-form-container" ref={formRef} style={{ maxWidth: 480 }}>
          <div className="auth-animate auth-mobile-logo">
            <Link to="/">
              <Leaf size={24} strokeWidth={1.5} />
              <span>SATVIKA</span>
            </Link>
          </div>

          <div className="auth-animate">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join Satvika and start creating compliant nutrition labels</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error auth-animate">{error}</div>}

            <div className="auth-row auth-animate">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group auth-animate">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group auth-animate">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Choose a username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="auth-row auth-animate">
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Create password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="auth-animate">
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Creating account...' : <>Create Account <ArrowRight size={16} /></>}
              </button>
            </div>

            <p className="auth-switch auth-animate">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </form>
        </div>
      </div>

      <div className="auth-image" ref={imageRef}>
        <img
          src="https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=1200&h=1600&fit=crop&q=80"
          alt="Colorful Indian spices and herbs in traditional bowls"
        />
        <div className="auth-image-overlay">
          <Link to="/" className="auth-logo">
            <Leaf size={20} strokeWidth={1.5} />
            <span>SATVIKA</span>
          </Link>
          <div className="auth-image-text">
            <h2>Join the Platform</h2>
            <p>Start your journey towards compliant, transparent food labeling powered by AI and ancient wisdom.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
