import { useState, useEffect } from 'react'
import { getOrders, cancelOrder } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format, parseISO } from 'date-fns'

const STATUS = {
  confirmed: { label:'Confirmed', color:'#16a34a', bg:'#f0fdf4', border:'#86efac' },
  cancelled: { label:'Cancelled', color:'#dc2626', bg:'#fef2f2', border:'#fca5a5' },
  delivered: { label:'Delivered', color:'#2563eb', bg:'#eff6ff', border:'#93c5fd' },
}
const MEAL_ICONS   = { breakfast:'☀️', lunch:'🍽️', snack:'🥪', dinner:'🌙' }
const FILTER_TABS  = [['all','All'],['confirmed','Upcoming'],['cancelled','Cancelled'],['delivered','Delivered']]

export default function OrdersPage() {
  const { refreshWallet }             = useAuth()
  const [orders, setOrders]           = useState([])
  const [filter, setFilter]           = useState('all')
  const [loading, setLoading]         = useState(true)
  const [cancelling, setCancelling]   = useState(null)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  const load = () => {
    setLoading(true)
    getOrders(filter !== 'all' ? filter : undefined)
      .then(r => setOrders(r.data))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this order? You will receive a full refund.')) return
    setCancelling(id); setError(''); setSuccess('')
    try {
      const r = await cancelOrder(id)
      setSuccess(r.data.message)
      load(); refreshWallet()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to cancel order')
    } finally { setCancelling(null) }
  }

  return (
    <div style={{ padding:28, maxWidth:900, margin:'0 auto' }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:26, letterSpacing:'-0.5px' }}>My Orders</h1>
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:2 }}>Track and manage your meal orders</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {FILTER_TABS.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding:'8px 18px', borderRadius:20, fontSize:13, cursor:'pointer', transition:'var(--tr)', border:`1.5px solid ${v===filter?'var(--accent)':'var(--border)'}`, background: v===filter?'var(--accent)':'var(--bg2)', color: v===filter?'#fff':'var(--text2)', fontWeight: v===filter?600:400 }}>
            {l}
          </button>
        ))}
      </div>

      {error   && <div style={alertSt('red')}>{error}</div>}
      {success && <div style={alertSt('green')}>{success}</div>}

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
          <div style={{ width:34, height:34, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0', background:'var(--bg2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:52, marginBottom:16 }}>📋</div>
          <p style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:18, marginBottom:6 }}>No orders found</p>
          <p style={{ color:'var(--text3)', fontSize:14 }}>Head to Menu to place your first order</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {orders.map(order => {
            const st = STATUS[order.status] || STATUS.confirmed
            return (
              <div key={order.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--shadow)', animation:'fadeUp 0.2s ease' }}>

                {/* Order header */}
                <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:46, height:46, background:'var(--bg3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, border:'1px solid var(--border)' }}>
                      {MEAL_ICONS[order.meal_time] || '🍽️'}
                    </div>
                    <div>
                      <div style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:16 }}>
                        {order.meal_time.charAt(0).toUpperCase()+order.meal_time.slice(1)}
                        <span style={{ color:'var(--text3)', fontWeight:400, fontSize:14, marginLeft:8 }}>{order.order_date}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                        #{order.id.slice(0,8).toUpperCase()} · {format(parseISO(order.created_at),'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:st.bg, border:`1px solid ${st.border}`, color:st.color }}>{st.label}</span>
                    <div style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:18, color:'var(--accent)' }}>Rs.{order.total_amount.toFixed(2)}</div>
                  </div>
                </div>

                {/* Items list */}
                <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', background:'var(--bg3)' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8 }}>Items ordered</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {order.items.map(item => (
                      <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:22, height:22, background:'var(--adim)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--accent)', flexShrink:0 }}>
                            {item.quantity}×
                          </span>
                          <span style={{ fontSize:14 }}>{item.menu_item_name}</span>
                        </div>
                        <span style={{ fontSize:13, color:'var(--text3)', fontWeight:500 }}>Rs.{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cancel button */}
                {order.status === 'confirmed' && (
                  <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={() => handleCancel(order.id)} disabled={cancelling === order.id}
                      style={{ padding:'8px 18px', background:'var(--rdim)', color:'var(--red)', border:'1.5px solid var(--red)', borderRadius:'var(--rs)', fontSize:13, fontWeight:600, cursor: cancelling===order.id?'not-allowed':'pointer', opacity: cancelling===order.id?0.6:1, transition:'var(--tr)' }}>
                      {cancelling === order.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                    <span style={{ fontSize:12, color:'var(--text3)' }}>Full refund to wallet</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const alertSt = (t) => ({ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:'var(--rs)', fontSize:14, marginBottom:16, background: t==='red'?'var(--rdim)':'var(--gdim)', border:`1px solid ${t==='red'?'var(--red)':'var(--green)'}`, color: t==='red'?'var(--red)':'var(--green)' })
