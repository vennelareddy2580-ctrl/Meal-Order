import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe, getWallet } from '../services/api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null }
    catch { return null }
  })
  const [loading, setLoading]         = useState(true)
  const [walletBalance, setWalletBal] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    getMe()
      .then(r => {
        setUser(r.data)
        localStorage.setItem('user', JSON.stringify(r.data))
        return getWallet()
      })
      .then(r => setWalletBal(r.data.balance))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    getWallet().then(r => setWalletBal(r.data.balance)).catch(() => {})
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setWalletBal(null)
  }, [])

  // Call from anywhere to refresh the balance shown in sidebar
  const refreshWallet = useCallback(() => {
    getWallet().then(r => setWalletBal(r.data.balance)).catch(() => {})
  }, [])

  return (
    <Ctx.Provider value={{ user, loading, login, logout, setUser, walletBalance, refreshWallet }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be inside AuthProvider')
  return c
}
