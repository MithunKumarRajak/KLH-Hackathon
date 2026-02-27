import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { Leaf, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { authAPI } from '../services/api'
import './Auth.css'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef(null)
  const imageRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(imageRef.current,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power4.inOut' }
    )
    .fromTo(formRef.current?.querySelectorAll('.auth-animate') || [],
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' },
      '-=0.5'
    )
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.login({ username: form.username, password: form.password })
      localStorage.setItem('satvika_token', res.data.token)
      localStorage.setItem('satvika_user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-image" ref={imageRef}>
        <img
          src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&h=1600&fit=crop&q=80"
          alt="Traditional Indian spices in brass bowls"
        />
        <div className="auth-image-overlay">
          <Link to="/" className="auth-logo">
            <Leaf size={20} strokeWidth={1.5} />
            <span>SATVIKA</span>
          </Link>
          <div className="auth-image-text">
            <h2>Welcome Back</h2>
            <p>Sign in to continue creating compliant nutrition labels for your products.</p>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container" ref={formRef}>
          <div className="auth-animate auth-mobile-logo">
            <Link to="/">
              <Leaf size={24} strokeWidth={1.5} />
              <span>SATVIKA</span>
            </Link>
          </div>

          <div className="auth-animate">
            <h1 className="auth-title">Sign In</h1>
            <p className="auth-subtitle">Enter your credentials to access the platform</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error auth-animate">{error}</div>}

            <div className="form-group auth-animate">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group auth-animate">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-animate">
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Signing in...' : <>Sign In <ArrowRight size={16} /></>}
              </button>
            </div>

            <p className="auth-switch auth-animate">
              Don't have an account? <Link to="/register">Create Account</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
