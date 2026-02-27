import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import RecipeCreate from './pages/RecipeCreate'
import RecipeAnalyze from './pages/RecipeAnalyze'
import ComplianceReview from './pages/ComplianceReview'
import LabelPreview from './pages/LabelPreview'
import ExportLabel from './pages/ExportLabel'
import About from './pages/About'
import RecipeList from './pages/RecipeList'
import IngredientList from './pages/IngredientList'
import BatchUpload from './pages/BatchUpload'
import RegulatoryAlerts from './pages/RegulatoryAlerts'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import FSSAIGuidelines from './pages/FSSAIGuidelines'
import LabelingStandards from './pages/LabelingStandards'
import FOPRequirements from './pages/FOPRequirements'
import Documentation from './pages/Documentation'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Cookies from './pages/Cookies'

function RequireAuth({ children }) {
  const token = localStorage.getItem('satvika_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RedirectIfAuth({ children }) {
  const token = localStorage.getItem('satvika_token')
  if (token) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RedirectIfAuth><Landing /></RedirectIfAuth>} />
      <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
      <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/compliance/fssai" element={<FSSAIGuidelines />} />
      <Route path="/compliance/labeling" element={<LabelingStandards />} />
      <Route path="/compliance/fop" element={<FOPRequirements />} />
      <Route path="/compliance/docs" element={<Documentation />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/recipes" element={<RecipeList />} />
        <Route path="/recipes/create" element={<RecipeCreate />} />
        <Route path="/recipes/:id/analyze" element={<RecipeAnalyze />} />
        <Route path="/recipes/:id/compliance" element={<ComplianceReview />} />
        <Route path="/recipes/:id/label" element={<LabelPreview />} />
        <Route path="/recipes/:id/export" element={<ExportLabel />} />
        <Route path="/ingredients" element={<IngredientList />} />
        <Route path="/batch-upload" element={<BatchUpload />} />
        <Route path="/regulatory-alerts" element={<RegulatoryAlerts />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={
        <div style={{ textAlign: 'center', padding: '120px 20px' }}>
          <h1 style={{ fontSize: 72, marginBottom: 16 }}>404</h1>
          <p style={{ fontSize: 18, opacity: 0.6 }}>Page not found</p>
          <a href="/" style={{ marginTop: 24, display: 'inline-block' }}>Go Home</a>
        </div>
      } />
    </Routes>
  )
}
