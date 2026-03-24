import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage  from './pages/LoginPage'
import MenuPage   from './pages/MenuPage'
import OrdersPage from './pages/OrdersPage'
import WalletPage from './pages/WalletPage'
import Layout     from './components/Layout'

function Loading() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )
}

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user)   return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/menu" replace /> : <LoginPage />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index        element={<Navigate to="/menu" replace />} />
        <Route path="menu"   element={<MenuPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="wallet" element={<WalletPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
