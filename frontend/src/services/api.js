import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

// Attach JWT to every request
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const sendOTP       = (phone)      => api.post('/auth/send-otp',    { phone })
export const verifyOTP     = (phone, otp) => api.post('/auth/verify-otp',  { phone, otp })
export const getMe         = ()           => api.get('/auth/me')
export const updateProfile = (data)       => api.patch('/auth/me', data)

// ── Institutions ──────────────────────────────────────────────────────────────
export const getInstitutions = () => api.get('/institutions/')

// ── Menu ──────────────────────────────────────────────────────────────────────
export const getMenu = (institutionId, date, params = {}) =>
  api.get('/menu/', { params: { institution_id: institutionId, date, ...params } })

// ── Orders ────────────────────────────────────────────────────────────────────
export const createOrder = (data) => api.post('/orders/', data)
export const getOrders   = (status) => api.get('/orders/', { params: status ? { status } : {} })
export const cancelOrder = (id)    => api.delete(`/orders/${id}`)

// ── Wallet ────────────────────────────────────────────────────────────────────
export const getWallet       = ()       => api.get('/wallet/')
export const rechargeWallet  = (amount) => api.post('/wallet/recharge', { amount })
export const getTransactions = (p = {}) => api.get('/wallet/transactions', { params: p })

export default api
