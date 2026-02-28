<![CDATA[# � Satvika — AI-Powered Nutrition Label Generator

> From ancient Satvik wisdom to scientific compliance — Satvika transforms how food brands create, validate, and export nutrition labels with FSSAI-ready precision.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge)](https://klh-hackathon.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Render-blue?style=for-the-badge)](https://klh-backend.onrender.com)

---

## 🎯 Problem Statement

Indian food brands struggle with **FSSAI nutrition labeling compliance** — a manual, error-prone process requiring nutritional calculations, mandatory nutrient declarations, Front-of-Pack (FOP) indicators, and allergen detection across hundreds of ingredients.

## 💡 Solution

**Satvika** automates the entire pipeline: paste a recipe → get a compliant nutrition label in seconds, powered by AI analysis and a 500+ ingredient nutritional database.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧮 **Smart Nutrition Calculator** | Deterministic per-serving & per-100g computation from ingredient weights |
| 📋 **FSSAI Compliance Checker** | Auto-validates mandatory nutrients, FOP indicators, allergen declarations |
| 🤖 **AI Recipe Parser** | Paste raw recipe text → Mistral AI extracts ingredients & quantities |
| 🏷️ **Label Generator** | Export nutrition labels as PDF, JSON, CSV, or HTML |
| 🔍 **Allergen Detection** | Auto-detect 14 major allergen categories from ingredients |
| 📊 **FOP Indicators** | Traffic-light system for sugar, sodium, saturated fat per FSSAI guidelines |
| 🌐 **Multi-language Labels** | AI-powered Hindi translation for bilingual compliance |
| 🔄 **Smart Reformulation** | AI suggests healthier ingredient swaps while maintaining compliance |
| 📦 **Batch Processing** | Upload CSV of recipes for bulk label generation |
| 📈 **Compliance Dashboard** | Track compliance status across all recipes at a glance |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 · Vite · Recharts · GSAP · Lucide Icons |
| **Backend** | Django 5.2 · Django REST · JWT Auth |
| **Database** | PostgreSQL (production) · SQLite (development) |
| **AI** | Mistral AI API — recipe parsing, compliance insights, reformulation |
| **Deployment** | Vercel (frontend) · Render (backend + PostgreSQL) |

---

## 🏗️ Architecture

```
┌──────────────────┐     HTTPS/JSON      ┌──────────────────┐
│                  │ ◄─────────────────► │                  │
│   React SPA      │                     │   Django API     │
│   (Vercel)       │                     │   (Render)       │
│                  │                     │                  │
│  • Dashboard     │                     │  • JWT Auth      │
│  • Recipe CRUD   │                     │  • Nutrition Calc│
│  • Label Preview │                     │  • FSSAI Check   │
│  • Export/PDF    │                     │  • AI Integration│
│                  │                     │        │         │
└──────────────────┘                     └────────┼─────────┘
                                                  │
                                    ┌─────────────┼──────────────┐
                                    │             │              │
                              ┌─────▼─────┐ ┌────▼────┐  ┌──────▼──────┐
                              │ PostgreSQL │ │ Mistral │  │ IFCT/USDA   │
                              │ Database   │ │ AI API  │  │ Nutrition DB│
                              └───────────┘ └─────────┘  └─────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
cd klh && python manage.py migrate

# Load ingredient database
python manage.py loaddata dataset/seed.json  # if available

# Start server
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 📁 Project Structure

```
├── klh/                        # Django project root
│   ├── labels/                 # Main app
│   │   ├── api_views.py        # REST API endpoints (30+ endpoints)
│   │   ├── models.py           # Recipe, Ingredient, Nutrient models
│   │   ├── fssai_compliance.py # FSSAI validation engine
│   │   ├── label_generator.py  # PDF/HTML label generation
│   │   ├── allergen_detector.py# Allergen detection system
│   │   ├── ai_utils.py         # Mistral AI integration
│   │   └── parser.py           # Recipe text parser
│   └── nutrition_label_generator/
│       ├── settings.py         # Django settings (env-based config)
│       └── urls.py             # URL routing
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── pages/              # 18 page components
│   │   ├── components/         # Reusable UI components
│   │   ├── services/api.js     # Axios API client
│   │   └── hooks/              # Custom React hooks
│   └── vercel.json             # Vercel deployment config
├── requirements.txt            # Python dependencies
└── render.yaml                 # Render deployment config
```

---

## � API Highlights

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register/` | POST | User registration |
| `/api/auth/login/` | POST | JWT authentication |
| `/api/recipes/create/` | POST | Create recipe with ingredients |
| `/api/recipes/<id>/analyze/` | GET | Full nutrition analysis |
| `/api/recipes/<id>/compliance/` | GET | FSSAI compliance check + AI recommendations |
| `/api/recipes/<id>/export/` | POST | Generate label (PDF/JSON/CSV/HTML) |
| `/api/ai/analyze/` | POST | AI-powered nutritional insights |
| `/api/allergens/detect/` | POST | Allergen detection from ingredient list |
| `/api/suggest-ingredients/` | POST | Smart ingredient suggestions |

---

## 👥 Team

**KLH Hackathon 2026**

---

## 📄 License

Built for KLH Hackathon 2026. All rights reserved.
]]>
