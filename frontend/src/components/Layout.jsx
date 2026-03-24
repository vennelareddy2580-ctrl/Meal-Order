import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout, walletBalance } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const navStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 'var(--rs)',
    marginBottom: 3, textDecoration: 'none', fontSize: 14,
    transition: 'var(--tr)',
    color:      isActive ? 'var(--accent)' : 'var(--text2)',
    background: isActive ? 'var(--adim)'   : 'transparent',
    fontWeight: isActive ? 600 : 400,
  })

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        flexShrink: 0,
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, background:'var(--accent)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>
              🍽️
            </div>
            <div>
              <div style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:15, letterSpacing:'-0.3px', lineHeight:1.2 }}>
                Meal Ordering
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.3 }}>
                Food &amp; Catering Platform
              </div>
            </div>
          </div>
        </div>

        <div style={{ height:1, background:'var(--border)', margin:'0 16px 10px' }} />

        {/* Nav links */}
        <nav style={{ padding:'0 10px', flex:1 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', letterSpacing:'0.06em', textTransform:'uppercase', padding:'6px 14px 4px' }}>Menu</div>
          <NavLink to="/menu"   style={navStyle}><span>🍽️</span> Browse Menu</NavLink>
          <NavLink to="/orders" style={navStyle}><span>📋</span> My Orders</NavLink>
          <NavLink to="/wallet" style={navStyle}><span>💳</span> Wallet</NavLink>
        </nav>

        {/* Wallet balance pill */}
        {walletBalance !== null && (
          <div style={{ margin:'0 12px 12px', background:'linear-gradient(135deg,var(--accent),var(--accent2))', borderRadius:'var(--rs)', padding:'14px 16px', color:'#fff' }}>
            <div style={{ fontSize:11, opacity:0.75, marginBottom:4 }}>Wallet Balance</div>
            <div style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:22, letterSpacing:'-0.5px' }}>
              Rs.{walletBalance.toFixed(2)}
            </div>
          </div>
        )}

        {/* User footer */}
        <div style={{ padding:'12px 16px 20px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:34, height:34, background:'var(--adim)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--fd)', fontWeight:700, fontSize:14, color:'var(--accent)', flexShrink:0 }}>
              {(user?.name || user?.phone || '?')[0].toUpperCase()}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {user?.phone}
              </div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width:'100%', padding:'8px', background:'var(--rdim)', color:'var(--red)', borderRadius:'var(--rs)', fontSize:13, fontWeight:500, border:'1px solid transparent', transition:'var(--tr)', textAlign:'center' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, overflow:'auto', minHeight:'100vh', background:'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
