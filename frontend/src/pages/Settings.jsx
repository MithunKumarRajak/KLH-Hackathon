import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import {
  User, Mail, Lock, Building2, FileText, Save,
  Shield, Bell, Eye, EyeOff, Check, AlertCircle, Settings as SettingsIcon, Info
} from 'lucide-react'
import { settingsAPI } from '../services/api'
import './Settings.css'

export default function Settings() {
  const [profile, setProfile] = useState({ username: '', email: '', first_name: '', last_name: '', date_joined: '' })
  const [defaults, setDefaults] = useState({
    default_brand_name: '', default_manufacturer: '', default_fssai_license: '',
    default_serving_size: 100, default_serving_unit: 'g', default_servings_per_pack: 1,
  })
  const [stats, setStats] = useState({ total_recipes: 0, total_labels: 0 })
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activeTab, setActiveTab] = useState('profile')
  const pageRef = useRef(null)

  useEffect(() => {
    settingsAPI.get()
      .then(res => {
        setProfile(res.data.profile || {})
        setDefaults(res.data.defaults || {})
        setStats(res.data.stats || {})
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load settings' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && pageRef.current) {
      gsap.from(pageRef.current.querySelectorAll('.settings-card'), {
        y: 20, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'power3.out'
      })
    }
  }, [loading, activeTab])

  const flash = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 4000)
  }

  const handleProfileSave = async () => {
    setSaving(true)
    try {
      await settingsAPI.update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
      })
      // Update localStorage
      const u = JSON.parse(localStorage.getItem('satvika_user') || '{}')
      u.first_name = profile.first_name
      u.last_name = profile.last_name
      u.email = profile.email
      localStorage.setItem('satvika_user', JSON.stringify(u))
      flash('success', 'Profile updated successfully')
    } catch (err) {
      flash('error', err.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      flash('error', 'New passwords do not match')
      return
    }
    if (passwords.new_password.length < 8) {
      flash('error', 'Password must be at least 8 characters')
      return
    }
    setSavingPw(true)
    try {
      await settingsAPI.update({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      })
      setPasswords({ current_password: '', new_password: '', confirm_password: '' })
      flash('success', 'Password changed successfully')
    } catch (err) {
      flash('error', err.response?.data?.error || 'Failed to change password')
    } finally {
      setSavingPw(false)
    }
  }

  const handleDefaultsSave = async () => {
    setSaving(true)
    try {
      await settingsAPI.update({ defaults })
      localStorage.setItem('satvika_defaults', JSON.stringify(defaults))
      flash('success', 'Recipe defaults saved')
    } catch (err) {
      flash('error', err.response?.data?.error || 'Failed to save defaults')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'defaults', label: 'Recipe Defaults', icon: FileText },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-header">
          <div className="container">
            <p className="settings-label">Account</p>
            <h1 className="settings-title">Settings</h1>
          </div>
        </div>
        <div className="container" style={{ textAlign: 'center', padding: '80px 0', opacity: 0.5 }}>
          Loading settings...
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page" ref={pageRef}>
      <div className="settings-header">
        <div className="container">
          <p className="settings-label">Account</p>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your profile, recipe defaults, and preferences</p>
        </div>
      </div>

      <section className="section" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="container">
          {message.text && (
            <div className={`settings-toast ${message.type}`}>
              {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="settings-layout">
            {/* Sidebar */}
            <aside className="settings-sidebar">
              <div className="settings-avatar">
                <span className="avatar-letter">{(profile.first_name || profile.username || 'U')[0].toUpperCase()}</span>
              </div>
              <p className="sidebar-name">{profile.first_name ? `${profile.first_name} ${profile.last_name}` : profile.username}</p>
              <p className="sidebar-email">{profile.email}</p>
              <div className="sidebar-stats">
                <div className="sidebar-stat">
                  <span className="stat-num">{stats.total_recipes}</span>
                  <span className="stat-lbl">Recipes</span>
                </div>
                <div className="sidebar-stat">
                  <span className="stat-num">{stats.total_labels}</span>
                  <span className="stat-lbl">Labels</span>
                </div>
              </div>
              <nav className="settings-nav">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    className={`settings-nav-btn ${activeTab === t.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(t.id)}
                  >
                    <t.icon size={16} /> {t.label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <main className="settings-content">
              {activeTab === 'profile' && (
                <div className="settings-card">
                  <div className="card-header-row">
                    <User size={20} />
                    <div>
                      <h2 className="card-title">Profile Information</h2>
                      <p className="card-desc">Update your personal details</p>
                    </div>
                  </div>
                  <div className="settings-form">
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input className="form-input" value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} placeholder="First name" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input className="form-input" value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} placeholder="Last name" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input className="form-input" value={profile.username} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                      <span className="form-hint">Username cannot be changed</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <div className="input-icon-wrap">
                        <Mail size={16} className="input-icon" />
                        <input className="form-input input-with-icon" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} placeholder="your@email.com" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Member Since</label>
                      <input className="form-input" value={profile.date_joined ? new Date(profile.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                    </div>
                    <div className="form-actions-row">
                      <button className="btn btn-primary" onClick={handleProfileSave} disabled={saving}>
                        <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'defaults' && (
                <div className="settings-card">
                  <div className="card-header-row">
                    <FileText size={20} />
                    <div>
                      <h2 className="card-title">Recipe Defaults</h2>
                      <p className="card-desc">Pre-fill these values when creating new recipes</p>
                    </div>
                  </div>
                  <div className="settings-form">
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label">Default Brand Name</label>
                        <div className="input-icon-wrap">
                          <Building2 size={16} className="input-icon" />
                          <input className="form-input input-with-icon" value={defaults.default_brand_name} onChange={e => setDefaults({...defaults, default_brand_name: e.target.value})} placeholder="Your brand name" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Default Manufacturer</label>
                        <div className="input-icon-wrap">
                          <Building2 size={16} className="input-icon" />
                          <input className="form-input input-with-icon" value={defaults.default_manufacturer} onChange={e => setDefaults({...defaults, default_manufacturer: e.target.value})} placeholder="Manufacturer name" />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Default FSSAI License</label>
                      <div className="input-icon-wrap">
                        <Shield size={16} className="input-icon" />
                        <input className="form-input input-with-icon" value={defaults.default_fssai_license} onChange={e => setDefaults({...defaults, default_fssai_license: e.target.value})} placeholder="14-digit FSSAI license number" />
                      </div>
                    </div>
                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label">Serving Size</label>
                        <input type="number" className="form-input" value={defaults.default_serving_size} onChange={e => setDefaults({...defaults, default_serving_size: parseFloat(e.target.value) || 100})} min="0.1" step="0.1" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Serving Unit</label>
                        <select className="form-input" value={defaults.default_serving_unit} onChange={e => setDefaults({...defaults, default_serving_unit: e.target.value})}>
                          <option value="g">Grams (g)</option>
                          <option value="ml">Milliliters (ml)</option>
                          <option value="piece">Piece(s)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Servings/Pack</label>
                        <input type="number" className="form-input" value={defaults.default_servings_per_pack} onChange={e => setDefaults({...defaults, default_servings_per_pack: parseFloat(e.target.value) || 1})} min="0.1" step="0.1" />
                      </div>
                    </div>
                    <div className="defaults-info">
                      <Info size={16} />
                      <span>These values will be automatically filled in when you create a new recipe.</span>
                    </div>
                    <div className="form-actions-row">
                      <button className="btn btn-primary" onClick={handleDefaultsSave}>
                        <Save size={16} /> Save Defaults
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="settings-card">
                  <div className="card-header-row">
                    <Lock size={20} />
                    <div>
                      <h2 className="card-title">Change Password</h2>
                      <p className="card-desc">Update your account password</p>
                    </div>
                  </div>
                  <div className="settings-form">
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <div className="input-icon-wrap">
                        <Lock size={16} className="input-icon" />
                        <input type={showPw.current ? 'text' : 'password'} className="form-input input-with-icon" value={passwords.current_password} onChange={e => setPasswords({...passwords, current_password: e.target.value})} placeholder="Enter current password" />
                        <button type="button" className="pw-toggle" onClick={() => setShowPw({...showPw, current: !showPw.current})}>
                          {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label">New Password</label>
                        <div className="input-icon-wrap">
                          <Lock size={16} className="input-icon" />
                          <input type={showPw.new ? 'text' : 'password'} className="form-input input-with-icon" value={passwords.new_password} onChange={e => setPasswords({...passwords, new_password: e.target.value})} placeholder="Min 8 characters" />
                          <button type="button" className="pw-toggle" onClick={() => setShowPw({...showPw, new: !showPw.new})}>
                            {showPw.new ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <div className="input-icon-wrap">
                          <Lock size={16} className="input-icon" />
                          <input type={showPw.confirm ? 'text' : 'password'} className="form-input input-with-icon" value={passwords.confirm_password} onChange={e => setPasswords({...passwords, confirm_password: e.target.value})} placeholder="Repeat new password" />
                          <button type="button" className="pw-toggle" onClick={() => setShowPw({...showPw, confirm: !showPw.confirm})}>
                            {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    {passwords.new_password && (
                      <div className="pw-strength">
                        <div className="pw-bar">
                          <div className="pw-bar-fill" style={{
                            width: passwords.new_password.length >= 12 ? '100%' : passwords.new_password.length >= 8 ? '66%' : '33%',
                            background: passwords.new_password.length >= 12 ? '#16a34a' : passwords.new_password.length >= 8 ? '#d97706' : '#dc2626'
                          }} />
                        </div>
                        <span className="pw-strength-label">
                          {passwords.new_password.length >= 12 ? 'Strong' : passwords.new_password.length >= 8 ? 'Good' : 'Weak'}
                        </span>
                      </div>
                    )}
                    <div className="form-actions-row">
                      <button className="btn btn-primary" onClick={handlePasswordChange} disabled={savingPw || !passwords.current_password || !passwords.new_password}>
                        <Lock size={16} /> {savingPw ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="settings-card">
                  <div className="card-header-row">
                    <Bell size={20} />
                    <div>
                      <h2 className="card-title">Notification Preferences</h2>
                      <p className="card-desc">Control what alerts and updates you receive</p>
                    </div>
                  </div>
                  <div className="settings-form">
                    <NotifToggle storageKey="regulatory" label="Regulatory Alert Updates" desc="Get notified when new FSSAI regulations are published" defaultOn />
                    <NotifToggle storageKey="compliance" label="Compliance Warnings" desc="Receive alerts when your recipes may violate new regulations" defaultOn />
                    <NotifToggle storageKey="expiry" label="Label Expiry Reminders" desc="Get reminded before your generated labels need renewal" defaultOn={false} />
                    <NotifToggle storageKey="weekly" label="Weekly Compliance Report" desc="Receive a weekly summary of your compliance status" defaultOn={false} />
                    <NotifToggle storageKey="recall" label="Product Recall Notices" desc="Get notified about relevant FSSAI product recall notices" defaultOn />
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  )
}

function NotifToggle({ label, desc, storageKey, defaultOn = true }) {
  const [on, setOn] = useState(() => {
    const stored = localStorage.getItem(`satvika_notif_${storageKey}`)
    return stored !== null ? stored === 'true' : defaultOn
  })
  const toggle = () => {
    const next = !on
    setOn(next)
    localStorage.setItem(`satvika_notif_${storageKey}`, String(next))
  }
  return (
    <div className="notif-row" onClick={toggle}>
      <div className="notif-text">
        <p className="notif-label">{label}</p>
        <p className="notif-desc">{desc}</p>
      </div>
      <div className={`notif-switch ${on ? 'on' : ''}`}>
        <div className="notif-thumb" />
      </div>
    </div>
  )
}
