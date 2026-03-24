import { useState, useEffect } from 'react'
import { getMenu, getInstitutions, createOrder } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { addDays, format } from 'date-fns'

const DIETARY = {
  veg:     { label:'Veg',     dot:'#16a34a', bg:'#f0fdf4', border:'#86efac' },
  non_veg: { label:'Non-Veg', dot:'#dc2626', bg:'#fef2f2', border:'#fca5a5' },
  vegan:   { label:'Vegan',   dot:'#7c3aed', bg:'#f5f3ff', border:'#c4b5fd' },
  jain:    { label:'Jain',    dot:'#ea580c', bg:'#fff7ed', border:'#fdba74' },
}
const MEALS      = ['breakfast','lunch','snack','dinner']
const MEAL_ICONS = { breakfast:'☀️', lunch:'🍽️', snack:'🥪', dinner:'🌙' }

function Stepper({ qty, onAdd, onRemove, small = false }) {
  const sz = small ? 24 : 28
  return (
    <div style={{ display:'flex', alignItems:'center', gap: small?5:7, background:'var(--bg)', borderRadius:8, padding: small?'3px 5px':'4px 7px', border:'1.5px solid var(--accent)' }}>
      <button onClick={e => { e.stopPropagation(); onRemove() }}
        style={{ width:sz, height:sz, borderRadius:6, background:'var(--rdim)', color:'var(--red)', fontWeight:700, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--red)', flexShrink:0, cursor:'pointer' }}>−</button>
      <span style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize: small?13:15, minWidth:18, textAlign:'center' }}>{qty}</span>
      <button onClick={e => { e.stopPropagation(); onAdd() }}
        style={{ width:sz, height:sz, borderRadius:6, background:'var(--gdim)', color:'var(--green)', fontWeight:700, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--green)', flexShrink:0, cursor:'pointer' }}>+</button>
    </div>
  )
}

export default function MenuPage() {
  const { walletBalance, refreshWallet } = useAuth()
  const [institutions, setInstitutions]  = useState([])
  const [selInst, setSelInst]            = useState('')
  const [selDate, setSelDate]            = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selMeal, setSelMeal]            = useState('lunch')
  const [menu, setMenu]                  = useState([])
  const [cart, setCart]                  = useState({})   // { id: { item, qty } }
  const [cartOpen, setCartOpen]          = useState(false)
  const [loading, setLoading]            = useState(false)
  const [placing, setPlacing]            = useState(false)
  const [error, setError]                = useState('')
  const [success, setSuccess]            = useState('')

  // Load institutions once
  useEffect(() => {
    getInstitutions()
      .then(r => { setInstitutions(r.data); if (r.data.length) setSelInst(r.data[0].id) })
      .catch(() => {})
  }, [])

  // Reload menu when filters change
  useEffect(() => {
    if (!selInst) return
    setLoading(true); setMenu([]); setError('')
    getMenu(selInst, selDate, { meal_time: selMeal })
      .then(r => setMenu(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load menu'))
      .finally(() => setLoading(false))
  }, [selInst, selDate, selMeal])

  // Cart helpers
  const cartItems = Object.values(cart).filter(c => c.qty > 0)
  const cartTotal = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0)
  const cartCount = cartItems.reduce((s, c) => s + c.qty, 0)

  const addItem = (item) => {
    if (item.is_sold_out || !item.is_available) return
    setCart(p => ({ ...p, [item.id]: { item, qty: (p[item.id]?.qty || 0) + 1 } }))
  }

  const removeItem = (item) => {
    setCart(p => {
      const cur = p[item.id]?.qty || 0
      if (cur <= 1) { const n = { ...p }; delete n[item.id]; return n }
      return { ...p, [item.id]: { item, qty: cur - 1 } }
    })
  }

  const clearCart = () => setCart({})

  const placeOrder = async () => {
    setPlacing(true); setError(''); setSuccess('')
    try {
      const items = cartItems.map(c => ({ menu_item_id: c.item.id, quantity: c.qty }))
      await createOrder({ institution_id: selInst, order_date: selDate, meal_time: selMeal, items })
      setSuccess(`Order placed! Rs.${cartTotal.toFixed(2)} debited from wallet.`)
      clearCart(); setCartOpen(false)
      refreshWallet()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to place order. Please try again.')
    } finally { setPlacing(false) }
  }

  // Date dropdown — today + 7 days
  const dateOpts = Array.from({ length: 8 }, (_, i) => {
    const d = addDays(new Date(), i)
    const v = format(d, 'yyyy-MM-dd')
    const l = i === 0 ? `Today (${format(d,'MMM d')})` : i === 1 ? `Tomorrow (${format(d,'MMM d')})` : format(d,'EEE, MMM d')
    return { v, l }
  })

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* ── Menu area ── */}
      <div style={{ flex:1, overflowY:'auto', padding:28 }}>

        {/* Header row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <h1 style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:26, letterSpacing:'-0.5px' }}>Menu</h1>
            <p style={{ color:'var(--text2)', fontSize:14, marginTop:2 }}>Add items to your cart and place an order</p>
          </div>
          {/* Cart button */}
          <button onClick={() => setCartOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'var(--accent)', color:'#fff', borderRadius:'var(--rs)', fontFamily:'var(--fd)', fontWeight:700, fontSize:14, border:'none', cursor:'pointer', transition:'var(--tr)', boxShadow:'0 2px 8px rgba(37,99,235,0.25)' }}>
            🛒 Cart
            {cartCount > 0 && (
              <>
                <span style={{ background:'#fff', color:'var(--accent)', fontFamily:'var(--fd)', fontWeight:800, fontSize:12, borderRadius:20, padding:'2px 7px', minWidth:22, textAlign:'center' }}>{cartCount}</span>
                <span style={{ fontSize:13, opacity:0.9 }}>· Rs.{cartTotal.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>

        {/* Filters */}
        <div style={{ background:'var(--bg2)', borderRadius:'var(--r)', padding:'16px 20px', marginBottom:20, border:'1px solid var(--border)', boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div>
              <label style={lbl}>Institution</label>
              <select value={selInst} onChange={e => setSelInst(e.target.value)} style={sel}>
                {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Date</label>
              <select value={selDate} onChange={e => setSelDate(e.target.value)} style={sel}>
                {dateOpts.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Meal Time</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {MEALS.map(m => (
                  <button key={m} onClick={() => setSelMeal(m)}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:'var(--rs)', fontSize:13, border:`1.5px solid ${m===selMeal?'var(--accent)':'var(--border)'}`, background: m===selMeal?'var(--accent)':'var(--bg2)', color: m===selMeal?'#fff':'var(--text2)', fontWeight: m===selMeal?600:400, cursor:'pointer', transition:'var(--tr)', whiteSpace:'nowrap' }}>
                    <span>{MEAL_ICONS[m]}</span>{m.charAt(0).toUpperCase()+m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {success && <div style={alert('green')}>✅ {success}</div>}
        {error   && <div style={alert('red')}>⚠️ {error}</div>}

        {/* Menu grid */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'var(--text3)' }}>
            <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 14px' }} />
            Loading menu...
          </div>
        ) : menu.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', background:'var(--bg2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🍽️</div>
            <p style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:18, marginBottom:6 }}>No menu available</p>
            <p style={{ color:'var(--text3)', fontSize:14 }}>Try a different date or meal time</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:14 }}>
            {menu.map(item => {
              const qty     = cart[item.id]?.qty || 0
              const unavail = item.is_sold_out || !item.is_available
              const d       = DIETARY[item.dietary_type] || DIETARY.veg
              return (
                <div key={item.id} style={{
                  background: 'var(--bg2)',
                  border: `1.5px solid ${qty > 0 ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--r)', overflow:'hidden',
                  opacity: unavail ? 0.55 : 1,
                  transition: 'var(--tr)',
                  boxShadow: qty > 0 ? '0 0 0 3px rgba(37,99,235,0.1)' : 'var(--shadow)',
                  animation: 'fadeUp 0.2s ease',
                }}>
                  <div style={{ padding:'16px 16px 0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:d.bg, border:`1px solid ${d.border}`, color:d.dot }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:d.dot, flexShrink:0, display:'inline-block' }} />
                        {d.label}
                      </span>
                      {item.is_sold_out && (
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:'var(--rdim)', color:'var(--red)', border:'1px solid var(--red)' }}>Sold Out</span>
                      )}
                    </div>
                    <h3 style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:14, marginBottom:5, lineHeight:1.3 }}>{item.name}</h3>
                    {item.description && (
                      <p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5, marginBottom:10 }}>{item.description}</p>
                    )}
                  </div>
                  <div style={{ padding:'12px 16px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', background: qty > 0 ? 'var(--adim2)' : 'transparent', marginTop:8 }}>
                    <div style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:17, color:'var(--accent)' }}>
                      Rs.{item.price.toFixed(2)}
                    </div>
                    {!unavail && (
                      qty === 0 ? (
                        <button onClick={() => addItem(item)}
                          style={{ padding:'7px 16px', background:'var(--accent)', color:'#fff', fontFamily:'var(--fd)', fontWeight:700, fontSize:13, borderRadius:'var(--rs)', border:'none', cursor:'pointer', transition:'var(--tr)' }}>
                          + Add
                        </button>
                      ) : (
                        <Stepper qty={qty} onAdd={() => addItem(item)} onRemove={() => removeItem(item)} />
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Cart sidebar ── */}
      <div style={{
        width: cartOpen ? 360 : 0, minWidth: cartOpen ? 360 : 0,
        background: 'var(--bg2)', borderLeft: cartOpen ? '1px solid var(--border)' : 'none',
        transition: 'all 0.22s ease', overflow:'hidden',
        display:'flex', flexDirection:'column',
        boxShadow: cartOpen ? '-4px 0 20px rgba(0,0,0,0.07)' : 'none',
      }}>
        {cartOpen && (
          <>
            {/* Cart header */}
            <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <h2 style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:18 }}>Your Cart</h2>
                <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setCartOpen(false)}
                style={{ width:30, height:30, borderRadius:'50%', background:'var(--bg3)', color:'var(--text2)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', cursor:'pointer' }}>
                ×
              </button>
            </div>

            {/* Order-for banner */}
            <div style={{ padding:'10px 20px', background:'var(--adim)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              <div style={{ fontSize:11, color:'var(--accent)', fontWeight:600, marginBottom:2 }}>Ordering for</div>
              <div style={{ fontSize:13, fontWeight:500 }}>
                {MEAL_ICONS[selMeal]} {selMeal.charAt(0).toUpperCase()+selMeal.slice(1)} · {selDate === format(new Date(),'yyyy-MM-dd') ? 'Today' : selDate}
              </div>
            </div>

            {/* Cart items */}
            <div style={{ flex:1, overflowY:'auto', padding:'10px 20px' }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🛒</div>
                  <p style={{ fontSize:14 }}>Cart is empty</p>
                  <p style={{ fontSize:12, marginTop:4 }}>Add items from the menu</p>
                </div>
              ) : (
                cartItems.map(({ item, qty }) => (
                  <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                      <div style={{ fontSize:13, color:'var(--accent)', fontFamily:'var(--fd)', fontWeight:700 }}>
                        Rs.{(item.price * qty).toFixed(2)}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>Rs.{item.price.toFixed(2)} each</div>
                    </div>
                    <Stepper qty={qty} onAdd={() => addItem(item)} onRemove={() => removeItem(item)} small />
                  </div>
                ))
              )}
            </div>

            {/* Cart footer */}
            {cartItems.length > 0 && (
              <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
                {/* Summary */}
                <div style={{ background:'var(--bg3)', borderRadius:'var(--rs)', padding:'12px 14px', marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text2)', marginBottom:4 }}>
                    <span>Subtotal ({cartCount} items)</span>
                    <span>Rs.{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, paddingBottom:8, marginBottom:8, borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text2)' }}>Wallet balance</span>
                    <span style={{ fontWeight:600, color: walletBalance >= cartTotal ? 'var(--green)' : 'var(--red)' }}>
                      Rs.{(walletBalance || 0).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--fd)', fontWeight:800, fontSize:16 }}>
                    <span>Total</span>
                    <span style={{ color:'var(--accent)' }}>Rs.{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {walletBalance !== null && walletBalance < cartTotal && (
                  <div style={{ background:'var(--rdim)', border:'1px solid var(--red)', color:'var(--red)', borderRadius:'var(--rs)', padding:'8px 12px', fontSize:12, marginBottom:10, textAlign:'center' }}>
                    Insufficient wallet balance. Please recharge.
                  </div>
                )}

                {error && <div style={{ ...alert('red'), marginBottom:10 }}>{error}</div>}

                <button onClick={placeOrder}
                  disabled={placing || (walletBalance !== null && walletBalance < cartTotal)}
                  style={{ width:'100%', padding:13, background: placing || (walletBalance !== null && walletBalance < cartTotal) ? 'var(--border)' : 'var(--accent)', color: placing || (walletBalance !== null && walletBalance < cartTotal) ? 'var(--text3)' : '#fff', fontFamily:'var(--fd)', fontWeight:700, fontSize:15, borderRadius:'var(--rs)', border:'none', cursor: placing ? 'not-allowed' : 'pointer', transition:'var(--tr)', marginBottom:8 }}>
                  {placing ? 'Placing Order...' : 'Place Order →'}
                </button>
                <button onClick={clearCart}
                  style={{ width:'100%', padding:'8px', background:'transparent', color:'var(--text3)', fontSize:13, border:'none', cursor:'pointer' }}>
                  Clear Cart
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const lbl   = { display:'block', fontSize:12, fontWeight:500, color:'var(--text2)', marginBottom:6 }
const sel   = { background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:'var(--rs)', color:'var(--text)', fontSize:14, padding:'8px 12px' }
const alert = (t) => ({ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:'var(--rs)', fontSize:14, marginBottom:16, background: t==='red'?'var(--rdim)':'var(--gdim)', border:`1px solid ${t==='red'?'var(--red)':'var(--green)'}`, color: t==='red'?'var(--red)':'var(--green)' })
