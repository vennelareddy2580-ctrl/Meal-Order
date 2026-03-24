import { useState, useEffect } from 'react'
import { getWallet, rechargeWallet, getTransactions } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format, parseISO } from 'date-fns'

const TX_STYLE = {
  recharge: { icon:'↑', color:'var(--green)',  bg:'var(--gdim)', sign:'+' },
  debit:    { icon:'↓', color:'var(--red)',    bg:'var(--rdim)', sign:'-' },
  refund:   { icon:'↩', color:'var(--accent)', bg:'var(--adim)', sign:'+' },
}
const QUICK = [100, 250, 500, 1000]

export default function WalletPage() {
  const { refreshWallet }             = useAuth()
  const [wallet, setWallet]           = useState(null)
  const [txs, setTxs]                 = useState([])
  const [amount, setAmount]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [recharging, setRecharging]   = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  const fetchAll = async () => {
    try {
      const [w, t] = await Promise.all([getWallet(), getTransactions({ limit: 30 })])
      setWallet(w.data); setTxs(t.data)
    } catch { setError('Failed to load wallet') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleRecharge = async (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setRecharging(true); setError(''); setSuccess('')
    try {
      await rechargeWallet(amt)
      setSuccess(`Rs.${amt.toFixed(2)} added to your wallet!`)
      setAmount('')
      await fetchAll()
      refreshWallet()
    } catch (e) {
      setError(e.response?.data?.detail || 'Recharge failed. Try again.')
    } finally { setRecharging(false) }
  }

  const recharged = txs.filter(t => t.transaction_type === 'recharge').reduce((s, t) => s + t.amount, 0)
  const spent     = txs.filter(t => t.transaction_type === 'debit').reduce((s, t) => s + t.amount, 0)
  const refunded  = txs.filter(t => t.transaction_type === 'refund').reduce((s, t) => s + t.amount, 0)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding:28, maxWidth:1000, margin:'0 auto' }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:26, letterSpacing:'-0.5px' }}>Wallet</h1>
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:2 }}>Manage balance and view transactions</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>

        {/* Balance card */}
        <div style={{ background:'linear-gradient(135deg,#2563eb 0%,#1e40af 55%,#1e1b4b 100%)', borderRadius:'var(--r)', padding:28, color:'#fff', boxShadow:'0 4px 20px rgba(37,99,235,0.25)' }}>
          <div style={{ fontSize:13, opacity:0.75, marginBottom:8 }}>Current Balance</div>
          <div style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:46, letterSpacing:'-2px', lineHeight:1, marginBottom:6 }}>
            Rs.{wallet?.balance.toFixed(2) ?? '0.00'}
          </div>
          <div style={{ fontSize:12, opacity:0.65 }}>
            {wallet ? `Updated ${format(parseISO(wallet.updated_at), 'MMM d, h:mm a')}` : ''}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:20, paddingTop:18, borderTop:'1px solid rgba(255,255,255,0.18)' }}>
            {[['Recharged', recharged, '↑'], ['Spent', spent, '↓'], ['Refunded', refunded, '↩']].map(([l, v, ic]) => (
              <div key={l} style={{ flex:1 }}>
                <div style={{ fontSize:11, opacity:0.65, marginBottom:3 }}>{ic} {l}</div>
                <div style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:15 }}>Rs.{v.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recharge card */}
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:28, boxShadow:'var(--shadow)' }}>
          <div style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:18, marginBottom:18 }}>Add Money</div>
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {QUICK.map(a => (
              <button key={a} onClick={() => setAmount(String(a))}
                style={{ padding:'8px 15px', borderRadius:'var(--rs)', fontSize:14, cursor:'pointer', border:`1.5px solid ${amount===String(a)?'var(--accent)':'var(--border)'}`, background: amount===String(a)?'var(--adim)':'var(--bg3)', color: amount===String(a)?'var(--accent)':'var(--text2)', fontWeight: amount===String(a)?600:400, transition:'var(--tr)' }}>
                Rs.{a}
              </button>
            ))}
          </div>
          <form onSubmit={handleRecharge}>
            <label style={lbl}>Custom Amount</label>
            <div style={{ position:'relative', marginBottom:14 }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:13, fontWeight:600 }}>Rs.</span>
              <input type="number" min="1" max="50000" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                style={{ width:'100%', background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:'var(--rs)', color:'var(--text)', fontSize:15, padding:'11px 14px 11px 42px' }} />
            </div>
            {error   && <div style={alertSt('red')}>{error}</div>}
            {success && <div style={alertSt('green')}>{success}</div>}
            <button type="submit"
              disabled={recharging || !amount || parseFloat(amount) <= 0}
              style={{ width:'100%', padding:13, background: recharging||!amount||parseFloat(amount)<=0?'var(--border)':'var(--accent)', color: recharging||!amount||parseFloat(amount)<=0?'var(--text3)':'#fff', fontFamily:'var(--fd)', fontWeight:700, fontSize:15, borderRadius:'var(--rs)', border:'none', cursor: recharging||!amount?'not-allowed':'pointer', transition:'var(--tr)' }}>
              {recharging ? 'Processing...' : `Add Rs.${amount || '0'} →`}
            </button>
          </form>
        </div>
      </div>

      {/* Transactions */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:17 }}>Transaction History</div>
          <div style={{ fontSize:13, color:'var(--text3)' }}>{txs.length} transactions</div>
        </div>
        {txs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text3)' }}>No transactions yet</div>
        ) : (
          txs.map((tx, idx) => {
            const s = TX_STYLE[tx.transaction_type] || TX_STYLE.debit
            const isCredit = tx.transaction_type !== 'debit'
            return (
              <div key={tx.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 24px', borderBottom: idx < txs.length-1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:s.bg, color:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0 }}>{s.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>{tx.description || tx.transaction_type}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                    {format(parseISO(tx.created_at), 'MMM d, yyyy · h:mm a')}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:16, color: isCredit?'var(--green)':'var(--red)' }}>
                    {s.sign}Rs.{tx.amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                    Balance: Rs.{tx.balance_after.toFixed(2)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const lbl     = { display:'block', fontSize:13, fontWeight:500, color:'var(--text2)', marginBottom:8 }
const alertSt = (t) => ({ padding:'10px 14px', borderRadius:'var(--rs)', fontSize:13, marginBottom:12, background: t==='red'?'var(--rdim)':'var(--gdim)', border:`1px solid ${t==='red'?'var(--red)':'var(--green)'}`, color: t==='red'?'var(--red)':'var(--green)' })
