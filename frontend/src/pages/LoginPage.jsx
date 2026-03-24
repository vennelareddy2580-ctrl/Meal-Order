import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, verifyOTP } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [step, setStep]           = useState('phone')
  const [phone, setPhone]         = useState('')
  const [otp, setOtp]             = useState(['','','','','',''])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [devOtp, setDevOtp]       = useState('')
  const [countdown, setCountdown] = useState(0)
  const refs  = useRef([])
  const { login } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleSend = async (e) => {
    e?.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await sendOTP(phone)
      if (res.data.otp) setDevOtp(res.data.otp)
      setStep('otp')
      setCountdown(res.data.expires_in_seconds || 300)
      setTimeout(() => refs.current[0]?.focus(), 80)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Check the number and try again.')
    } finally { setLoading(false) }
  }

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
    if (next.every(d => d)) handleVerify(next.join(''))
  }

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setOtp(p.split('')); setTimeout(() => handleVerify(p), 60) }
  }

  const handleVerify = async (code) => {
    setError(''); setLoading(true)
    try {
      const res = await verifyOTP(phone, code)
      login(res.data.access_token, res.data.user)
      nav('/menu', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.')
      setOtp(['','','','','',''])
      setTimeout(() => refs.current[0]?.focus(), 50)
    } finally { setLoading(false) }
  }

  const mins = Math.floor(countdown / 60)
  const secs = String(countdown % 60).padStart(2, '0')

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--bg)', overflow:'hidden' }}>

      {/* Left decorative panel */}
      <div style={{ flex:1, minWidth:0, background:'linear-gradient(135deg,#2563eb 0%,#1e40af 55%,#1e1b4b 100%)', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:48, color:'#fff' }}>
        <div style={{ maxWidth:340 }}>
          <div style={{ width:56, height:56, background:'rgba(255,255,255,0.15)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:24, backdropFilter:'blur(8px)' }}>🍽️</div>
          <h1 style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:34, letterSpacing:'-1px', marginBottom:14, lineHeight:1.1 }}>
            Meal Ordering Platform
          </h1>
          <p style={{ fontSize:15, opacity:0.8, lineHeight:1.75, marginBottom:28 }}>
            Order meals from your institution's cafeteria. Manage your wallet, track orders — all in one place.
          </p>
          {[
            '🏢 Corporate cafeterias',
            '🏫 School & college canteens',
            '🏥 Hospital & office catering',
            '🌐 Multi-institution support',
          ].map(f => (
            <div key={f} style={{ fontSize:14, opacity:0.85, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ width:440, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', padding:'36px 40px', background:'#fff', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:360 }}>

          <div style={{ marginBottom:28 }}>
            <h2 style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:24, letterSpacing:'-0.5px', marginBottom:4 }}>
              {step === 'phone' ? 'Sign In' : 'Enter OTP'}
            </h2>
            <p style={{ color:'var(--text2)', fontSize:14 }}>
              {step === 'phone'
                ? 'Enter your mobile number to continue'
                : `OTP sent to ${phone}`}
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSend}>
              <label style={lbl}>Mobile Number</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={inp}
                autoFocus required
              />
              {error && <div style={err}>{error}</div>}
              <button type="submit" disabled={loading || !phone} style={btn(!phone || loading)}>
                {loading ? 'Sending...' : 'Send OTP →'}
              </button>
              <p style={{ textAlign:'center', fontSize:12, color:'var(--text3)', marginTop:10 }}>
                Include country code — e.g. +919876543210
              </p>
            </form>
          ) : (
            <form onSubmit={e => { e.preventDefault(); handleVerify(otp.join('')) }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <label style={lbl}>6-Digit OTP</label>
                <button type="button"
                  onClick={() => { setStep('phone'); setError(''); setOtp(['','','','','','']) }}
                  style={{ fontSize:13, color:'var(--accent)', fontWeight:500, background:'none', border:'none', cursor:'pointer' }}>
                  Change number
                </button>
              </div>

              {/* OTP boxes — grid so they never overflow screen */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:18 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => refs.current[i] = el}
                    type="text" inputMode="numeric"
                    maxLength={1} value={digit}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKey(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    disabled={loading}
                    style={{
                      width:'100%', aspectRatio:'1', maxHeight:54,
                      textAlign:'center', fontSize:20, fontWeight:700,
                      fontFamily:'var(--fd)',
                      background: digit ? '#eff6ff' : 'var(--bg3)',
                      border: `2px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius:'var(--rs)', color:'var(--text)',
                      transition:'var(--tr)', padding:0,
                    }}
                  />
                ))}
              </div>

              {/* Dev OTP banner */}
              {devOtp && (
                <div style={{ background:'#fffbeb', border:'1px solid #f59e0b', borderRadius:'var(--rs)', padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>🔑</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:2, letterSpacing:'0.05em' }}>DEV MODE — YOUR OTP</div>
                    <div style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:24, letterSpacing:'0.2em', color:'#92400e' }}>{devOtp}</div>
                  </div>
                </div>
              )}

              {error && <div style={err}>{error}</div>}

              <button type="submit" disabled={loading || otp.join('').length < 6} style={btn(loading || otp.join('').length < 6)}>
                {loading ? 'Verifying...' : 'Verify & Sign In →'}
              </button>

              <div style={{ textAlign:'center', marginTop:12, fontSize:13, color:'var(--text3)' }}>
                {countdown > 0
                  ? `OTP expires in ${mins}:${secs}`
                  : <button type="button" onClick={handleSend} style={{ color:'var(--accent)', fontWeight:600, cursor:'pointer', background:'none', border:'none', fontSize:13 }}>Resend OTP</button>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const lbl = { display:'block', fontSize:13, fontWeight:500, color:'var(--text2)', marginBottom:8 }
const inp = { width:'100%', background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:'var(--rs)', color:'var(--text)', fontSize:15, padding:'12px 14px', marginBottom:14, transition:'var(--tr)' }
const err = { background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:'var(--rs)', padding:'10px 14px', fontSize:13, marginBottom:14 }
const btn = (dis) => ({ width:'100%', padding:13, background: dis?'var(--border)':'var(--accent)', color: dis?'var(--text3)':'#fff', fontFamily:'var(--fd)', fontWeight:700, fontSize:15, borderRadius:'var(--rs)', border:'none', cursor: dis?'not-allowed':'pointer', transition:'var(--tr)' })
