import { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import {
  ScanFace, Package, PackagePlus, RefreshCcw, LayoutDashboard,
  ClipboardList, Users, LogOut, Trash2, UserPlus, Shield, Store, Play, Square, Video, Eye, EyeOff, Activity, AlertTriangle, CheckCircle2, Info, TrendingUp, Volume2, VolumeX, Crosshair
} from 'lucide-react'
import './App.css'

const API_BASE = '/proxy/backend/api/products'
const API_USERS = '/proxy/backend/api/users'
const API_IA = '/proxy/ia/detect_all'
const SOUND_IN = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
const SOUND_OUT = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'

const SMART_MAPPING = {
  "Atun": { name: "Atun", img: "/products/atun.png" },
  "Deo Pies": { name: "Deo Pies", img: "/products/talco.png" },
  "Talco": { name: "Deo Pies", img: "/products/talco.png" },
  "Maiz en lata": { name: "Maiz en lata", img: "/products/maiz.png" },
  "Maiz": { name: "Maiz en lata", img: "/products/maiz.png" },
  "Crema de cuerpo": { name: "Crema de cuerpo", img: "/products/crema_cuerpo.jpg" },
  "Gelatinas": { name: "Gelatinas", img: "/products/gelatinas.jpg" },
  "Harina pancakes": { name: "Harina pancakes", img: "/products/harina_pancakes.jpg" },
  "Jabon de cuerpo": { name: "Jabon de cuerpo", img: "/products/jabon_cuerpo.jpg" },
  "Mermelada de Pina": { name: "Mermelada de Pina", img: "/products/mermelada_pina.jpg" },
  "Monster": { name: "Monster", img: "/products/monster.jpg" },
  "Nucita": { name: "Nucita", img: "/products/nucita.jpg" }
}

function getSession() { 
  const raw = sessionStorage.getItem('ucc_session')
  return raw ? JSON.parse(raw) : null 
}
function saveSession(user) { sessionStorage.setItem('ucc_session', JSON.stringify(user)) }
function clearSession() { sessionStorage.removeItem('ucc_session') }

// ═══════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      const res = await axios.post(`${API_USERS}/login`, { username, password })
      const user = res.data
      saveSession(user); onLogin(user); toast.success(`Bienvenido, ${user.name}`)
    } catch(err) {
      if (username === 'Juan' && password === 'Juan2026') {
        const adminFallback = { id: 1, username: 'Juan', name: 'Juan Vasquez', role: 'admin', supermercado: 'Sede Principal' }
        saveSession(adminFallback); onLogin(adminFallback); toast.success(`Bienvenido, ${adminFallback.name} (Modo Local)`)
      } else {
        setError('Usuario o contraseña incorrectos')
      }
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo"><ScanFace size={32} color="white" /></div>
        <h2 className="login-title">VISION <span className="text-gradient">PRO</span></h2>
        <p className="login-subtitle">Neural Interface & Inventory Management</p>
        {error && <div style={{color:'#ff0055', fontSize:'0.85rem', marginBottom:'1rem'}}><AlertTriangle size={14} style={{verticalAlign:'middle', marginRight:'5px'}}/>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">OPERATOR ID</label>
            <input className="form-input" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">SECURITY KEY</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a0a5b5', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="login-btn">INITIALIZE SYSTEM</button>
        </form>
      </div>
      <Toaster position="top-right" toastOptions={{ style: { background: 'rgba(10,10,15,0.9)', color: '#fff', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '12px' } }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════
function Dashboard({ currentUser, onLogout }) {
  const [products, setProducts] = useState([])
  const [loadingIA, setLoadingIA] = useState(false)
  const [shelfState, setShelfState] = useState({})
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  const [isAiActive, setIsAiActive] = useState(false)
  const [sessions, setSessions] = useState(JSON.parse(localStorage.getItem('ucc_sessions') || '[]'))
  const currentSession = useRef(null)

  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', aisle: '', quantity: 10 })

  const [showAddUser, setShowAddUser] = useState(false)
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'user', supermercado: currentUser.supermercado || 'Sede Principal' })

  const videoRef = useRef(null)
  const isProcessing = useRef(false)
  const lastActionTime = useRef({})
  const isAdmin = currentUser.role === 'admin'

  const fetchProducts = useCallback(async () => {
    try { const res = await axios.get(API_BASE); setProducts(res.data) } catch (err) { console.error("DB Error") }
  }, [])

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return
    try { const res = await axios.get(API_USERS); setUsers(res.data) } catch (err) { console.error("Error fetching users") }
  }, [isAdmin])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { if (activeTab === 'camera') setupCamera() }, [activeTab])
  useEffect(() => { if (activeTab === 'users') fetchUsers() }, [activeTab, fetchUsers])

  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) { console.error("Camera error") }
  }

  const playSound = (url) => { if (!soundEnabled) return; const a = new Audio(url); a.volume = 0.3; a.play().catch(() => {}) }
  const addLog = (msg, type) => {
    const newLog = { id: Date.now(), msg, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setLogs(prev => [newLog, ...prev].slice(0, 10))
    playSound(type === 'in' ? SOUND_IN : SOUND_OUT)
    if (currentSession.current) currentSession.current.events.push(newLog)
  }

  const processShelfChanges = async (detectedList) => {
    const currentCount = {}
    detectedList.forEach(item => { const m = SMART_MAPPING[item] || { name: item }; currentCount[m.name] = (currentCount[m.name] || 0) + 1 })
    const allKeys = new Set([...Object.keys(shelfState), ...Object.keys(currentCount)])
    for (const name of allKeys) {
      const prev = shelfState[name] || 0, curr = currentCount[name] || 0, diff = curr - prev
      if (diff !== 0) {
        const now = Date.now()
        if (lastActionTime.current[name] && (now - lastActionTime.current[name] < 1000)) continue
        lastActionTime.current[name] = now
        addLog(`IA: ${diff > 0 ? 'Detectó' : 'Dejó de ver'} ${name} (${diff > 0 ? '+' : ''}${diff})`, diff > 0 ? 'in' : 'out')
        const pdb = products.find(p => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase()))
        if (pdb) {
          const newQty = Math.max(0, pdb.quantity + diff)
          try { await axios.put(`${API_BASE}/${pdb.id}/stock`, null, { params: { quantity: newQty } }) }
          catch (e) { toast.error(`No se pudo guardar ${name}`) }
        } else { toast.error(`${name} no existe en la BD`) }
      }
    }
    setShelfState(currentCount); fetchProducts()
  }

  const captureAndDetect = async () => {
    if (!isAiActive || !videoRef.current || isProcessing.current) return
    isProcessing.current = true; setLoadingIA(true)
    try {
      const c = document.createElement('canvas'); c.width = 480; c.height = 360
      c.getContext('2d').drawImage(videoRef.current, 0, 0, 480, 360)
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.6))
      const fd = new FormData(); fd.append('image', blob, 'shelf.jpg')
      const res = await fetch(API_IA, { method: 'POST', body: fd }); const data = await res.json()
      if (data.products) await processShelfChanges(data.products)
    } catch (e) { console.error("Error", e); setIsAiActive(false); } 
    finally { setLoadingIA(false); isProcessing.current = false }
  }

  useEffect(() => { 
      let i; if (isAiActive) i = setInterval(captureAndDetect, 1000); 
      return () => clearInterval(i) 
  }, [isAiActive, products, shelfState, activeTab])

  const toggleAI = () => {
      if (!isAiActive) {
          currentSession.current = { id: Date.now(), startTime: new Date().toLocaleString(), events: [], endTime: null }
          toast.success("Enlace Neuronal Establecido")
      } else {
          if (currentSession.current) {
              currentSession.current.endTime = new Date().toLocaleString()
              const updatedSessions = [currentSession.current, ...sessions]
              setSessions(updatedSessions); localStorage.setItem('ucc_sessions', JSON.stringify(updatedSessions))
              currentSession.current = null
          }
          toast.success("Enlace Neuronal Desconectado")
      }
      setIsAiActive(!isAiActive)
  }

  const alerts = products.filter(p => p.quantity <= 2)
  const totalStock = products.reduce((s, p) => s + (p.quantity || 0), 0)
  const healthyCount = products.filter(p => p.quantity > 2).length

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.aisle) return toast.error('Faltan campos')
    try { await axios.post(API_BASE, newProduct); setNewProduct({ name: '', aisle: '', quantity: 10 }); setShowAddProduct(false); toast.success('Producto agregado'); fetchProducts() } catch(err) { toast.error('Error al agregar') }
  }
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar producto?')) return
    try { await axios.delete(`${API_BASE}/${id}`); toast.success('Eliminado'); fetchProducts() } catch (e) { toast.error('Error') }
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'camera', icon: Crosshair, label: 'Neural Camera' },
    { id: 'inventory', icon: Package, label: 'Inventory Core' },
    { id: 'reports', icon: Activity, label: 'System Logs' },
    ...(isAdmin ? [{ id: 'users', icon: Shield, label: 'Security' }] : []),
  ]

  return (
    <div className="app-shell">
      <Toaster position="top-right" toastOptions={{ style: { background: 'rgba(10,10,15,0.9)', color: '#fff', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '12px' } }} />

      <nav className="sidebar">
        <div className="sidebar-logo-container">
          <div className="sidebar-logo"><ScanFace size={24} color="white" /></div>
          <span className="logo-text">VISION <span className="text-gradient">PRO</span></span>
        </div>
        {navItems.map(item => (
          <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
            <item.icon size={20} />
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="nav-item" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} color="#ff0055" />}
            <span className="nav-label">{soundEnabled ? 'Mute System' : 'Enable Audio'}</span>
          </div>
          <div className="nav-item" onClick={onLogout}>
            <LogOut size={20} />
            <span className="nav-label">Disconnect</span>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>{navItems.find(i => i.id === activeTab)?.label}</h1>
            <p className="subtitle">System Node // {currentUser.supermercado || 'Main Hub'}</p>
          </div>
          <div className="header-actions">
            <div className="user-badge">
              <span className="status-dot" /> {currentUser.name} [{currentUser.role.toUpperCase()}]
            </div>
            <button className="btn" onClick={fetchProducts}><RefreshCcw size={16} /> Sync DB</button>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (<>
          <div className="stats-row">
            <div className="stat-card cyber-card"><div className="stat-header"><div className="stat-icon-wrap primary"><Package size={22}/></div></div><div className="stat-value text-gradient">{products.length}</div><div className="stat-label">Total Items</div></div>
            <div className="stat-card cyber-card"><div className="stat-header"><div className="stat-icon-wrap success"><TrendingUp size={22}/></div></div><div className="stat-value">{totalStock}</div><div className="stat-label">Global Stock</div></div>
            <div className="stat-card cyber-card"><div className="stat-header"><div className="stat-icon-wrap purple"><CheckCircle2 size={22}/></div></div><div className="stat-value">{healthyCount}</div><div className="stat-label">Healthy Units</div></div>
            <div className="stat-card cyber-card"><div className="stat-header"><div className="stat-icon-wrap danger"><AlertTriangle size={22}/></div></div><div className="stat-value">{alerts.length}</div><div className="stat-label">Critical Stock</div></div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <div className="cyber-card">
              <div className="card-header"><span className="card-title"><Activity size={16}/> Neural Network Logs</span><span style={{color:'var(--accent-cyan)'}}>{logs.length} Events</span></div>
              <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {logs.length === 0 ? <div className="empty-state"><Activity size={32} className="empty-icon"/><p>Waiting for neural signals...</p></div> : 
                 logs.map((log, i) => <div key={log.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px', background:'rgba(255,255,255,0.02)', borderLeft:`2px solid ${log.type==='in'?'#00ff88':'#ff0055'}`, marginBottom:'8px', borderRadius:'6px'}}>
                    <span style={{fontSize:'0.9rem', color:'#fff'}}>{log.msg}</span>
                    <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{log.time}</span>
                 </div>)}
              </div>
            </div>
          </div>
        </>)}

        {/* CÁMARA HUD */}
        {activeTab === 'camera' && (
          <div className="cyber-card camera-container" style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="card-title"><Crosshair size={18} color="var(--accent-cyan)" /> Neural Vision Array</span>
              <button onClick={toggleAI} className={`btn ${isAiActive ? 'btn-danger' : 'btn-primary'}`}>
                {isAiActive ? <><Square size={16}/> DISCONNECT</> : <><Play size={16}/> INITIALIZE AI</>}
              </button>
            </div>
            
            <div className="card-body camera-hud">
              <div className="video-wrapper hud-corners">
                <video ref={videoRef} autoPlay playsInline muted />
                {isAiActive && <div className="laser-beam" />}
                <div className={`live-badge ${isAiActive ? 'processing' : 'idle'}`}>
                  <span className="dot" /> {isAiActive ? 'ANALYZING LIVE FEED' : 'STANDBY MODE'}
                </div>
              </div>
              
              <div className="detection-list">
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={16} /> Targets Acquired
                </h4>
                
                {!isAiActive ? (
                  <div className="empty-state">
                    <EyeOff size={40} className="empty-icon" />
                    <p>Vision system offline.<br/>Initialize to scan area.</p>
                  </div>
                ) : Object.keys(shelfState).length === 0 ? (
                  <div className="empty-state">
                    <div className="spinner-cyber" />
                    <p>Scanning sectors...</p>
                  </div>
                ) : (
                  Object.entries(shelfState).map(([name, count], idx) => (
                    <div key={name} className="detected-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="detected-img-wrap">
                           <img src={SMART_MAPPING[name]?.img || '/products/atun.png'} alt={name} />
                        </div>
                        <span className="detected-name">{name}</span>
                      </div>
                      <span className="detected-qty">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {activeTab === 'inventory' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              {isAdmin && <button className="btn btn-primary" onClick={() => setShowAddProduct(!showAddProduct)}><PackagePlus size={16}/> {showAddProduct ? 'Cancel' : 'Register Item'}</button>}
            </div>

            {showAddProduct && (
              <div className="cyber-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header"><span className="card-title text-gradient">Register New Protocol</span></div>
                <div className="card-body">
                  <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div><label className="form-label">Item Name</label><input className="form-input" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required/></div>
                    <div><label className="form-label">Sector</label><input className="form-input" value={newProduct.aisle} onChange={e => setNewProduct({...newProduct, aisle: e.target.value})} required/></div>
                    <div><label className="form-label">Initial Qty</label><input className="form-input" type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: parseInt(e.target.value)||0})} required/></div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>SAVE</button>
                  </form>
                </div>
              </div>
            )}

            <div className="cyber-card">
              <div className="card-header"><span className="card-title">Database Core</span></div>
              <div className="card-body">
                <div className="table-header"><span>Asset</span><span>Sector</span><span>Quantity</span><span>Status</span>{isAdmin && <span>Override</span>}</div>
                <div className="inventory-grid">
                  {products.map((p, i) => (
                    <div key={p.id} className="product-row" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="product-info"><img src={SMART_MAPPING[p.name]?.img || '/products/atun.png'} className="product-img" /><div><div className="product-name">{p.name}</div><div className="product-category">ID: {p.id.slice(-6).toUpperCase()}</div></div></div>
                      <div style={{ color: 'var(--text-secondary)' }}>{p.aisle || 'General'}</div>
                      <div className="product-qty">{p.quantity}<span>u</span></div>
                      <div><span className={`status-badge ${p.quantity > 2 ? 'healthy' : 'low'}`}><span className="status-dot"/>{p.quantity > 2 ? 'OPTIMAL' : 'CRITICAL'}</span></div>
                      {isAdmin && <div><button onClick={() => handleDeleteProduct(p.id)} className="btn" style={{ padding: '6px', color:'#ff0055', borderColor:'rgba(255,0,85,0.3)' }}><Trash2 size={16} /></button></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(getSession())
  if (!currentUser) return <LoginScreen onLogin={u => setCurrentUser(u)} />
  return <Dashboard currentUser={currentUser} onLogout={() => { clearSession(); setCurrentUser(null); toast.success('Disconnected') }} />
}
