import axios from 'axios'

// Determine API base URL based on environment
const getBaseURL = () => {
    // Use VITE_API_URL if provided (for production)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL
    }
    // Use relative path in development (proxy handles it)
    return '/api'
}

const api = axios.create({
    baseURL: getBaseURL(),
    headers: { 'Content-Type': 'application/json' },
})

// Add JWT Bearer token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('satvika_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Auto-logout on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const path = window.location.pathname
            if (path !== '/login' && path !== '/register') {
                localStorage.removeItem('satvika_token')
                localStorage.removeItem('satvika_user')
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

// Auth
export const authAPI = {
    login: (credentials) => api.post('/auth/login/', credentials),
    register: (data) => api.post('/auth/register/', data),
    logout: () => api.post('/auth/logout/'),
    refresh: () => api.post('/auth/refresh/'),
    getProfile: () => api.get('/auth/profile/'),
}

// Recipes
export const recipeAPI = {
    list: (params) => api.get('/recipes/', { params }),
    get: (id) => api.get(`/recipes/${id}/`),
    create: (data) => api.post('/recipes/create/', data),
    update: (id, data) => api.patch(`/recipes/${id}/update/`, data),
    delete: (id) => api.delete(`/recipes/${id}/delete/`),
    parse: (text) => api.post('/recipes/parse/', { recipe_text: text }),
    analyze: (id) => api.get(`/recipes/${id}/analyze/`),
    compliance: (id) => api.get(`/recipes/${id}/compliance/`),
    labelPreview: (id) => api.get(`/recipes/${id}/label/`),
    exportLabel: (id, format) => api.post(`/recipes/${id}/export/`, { format }),
    downloadLabel: (id, format, labelId) =>
        api.get(`/recipes/${id}/export/download/`, {
            params: { format, label_id: labelId },
            responseType: 'blob',
        }),
    batchUpload: (formData) => api.post('/recipes/batch-upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// Ingredients
export const ingredientAPI = {
    list: (params) => api.get('/ingredients/', { params }),
    get: (id) => api.get(`/ingredients/${id}/`),
    search: (q) => api.get('/ingredients/search/v2/', { params: { q } }),
}

// Allergen Detection
export const allergenAPI = {
    detect: (data) => api.post('/allergens/detect/', data),
}

// Regulatory Alerts
export const regulatoryAPI = {
    getAlerts: () => api.get('/regulatory-alerts/'),
}

// User Settings
export const settingsAPI = {
    get: () => api.get('/settings/'),
    update: (data) => api.patch('/settings/', data),
}

// Dashboard
export const dashboardAPI = {
    stats: () => api.get('/dashboard/'),
}

// AI (Mistral)
export const aiAPI = {
    analyze: (data) => api.post('/ai/analyze/', data),
    translate: (data) => api.post('/translate/', data),
    reformulate: (data) => api.post('/reformulate/', data),
    suggestRecipeName: (data) => api.post('/suggest-recipe-name/', data),
    suggestIngredients: (data) => api.post('/suggest-ingredients/', data),
}

// Share
export const shareAPI = {
    share: (data) => api.post('/share/', data),
}

// Batch Processing
export const batchAPI = {
    process: (data) => api.post('/batch-process/', data),
}

export default api