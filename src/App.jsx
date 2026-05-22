import { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import {
  ShoppingBasket, ScanFace, Package, Loader2, RefreshCcw, LayoutDashboard,
  ClipboardList, Bell, Settings, BarChart3, CheckCircle2, AlertCircle, Info,
  Volume2, VolumeX, Printer, Zap, TrendingUp, AlertTriangle, Activity, Eye,
  Users, LogOut, Trash2, UserPlus, Shield, Lock
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
  "Maiz en lata": { name: "Maiz en lata", img: "/products/maiz.png" },
  "Maiz": { name: "Maiz en lata", img: "/products/maiz.png" },
  "Talco": { name: "Deo Pies", img: "/products/talco.png" }
}

// ── Auth helpers (sessionStorage) ──
function getSession() { 
  const raw = sessionStorage.getItem('ucc_session')
  return raw ? JSON.parse(raw) : null 
}
function saveSession(user) { sessionStorage.setItem('ucc_session', JSON.stringify(user)) }
function clearSession() { sessionStorage.removeItem('ucc_session') }

// ══════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      const res = await axios.post(`${API_USERS}/login`, { username, password })
      const user = res.data
      saveSession(user); onLogin(user); toast.success(`Bienvenido, ${user.name}`)
    } catch(err) {
      setError('Usuario o contraseña incorrectos')
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo"><ShoppingBasket size={28} color="white" /></div>
        <h2 className="login-title">UCC Vision Pro</h2>
        <p className="login-subtitle">Ingresa tus credenciales para continuar</p>
        {error && <div className="login-error"><AlertCircle size={14} />{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input className="form-input" placeholder="Ingresa tu usuario" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="login-btn"><Lock size={16} />Iniciar Sesión</button>
        </form>

      </div>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.85rem' } }} />
    </div>
  )
}

// ══════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════
function Dashboard({ currentUser, onLogout }) {
  const [products, setProducts] = useState([])
  const [loadingIA, setLoadingIA] = useState(false)
  const [shelfState, setShelfState] = useState({})
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'user' })

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
  useEffect(() => { if (activeTab === 'dashboard') setupCamera() }, [activeTab])
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
        addLog(`AI: ${diff > 0 ? 'Detectó' : 'Dejó de ver'} ${name} (${diff > 0 ? '+' : ''}${diff})`, diff > 0 ? 'info' : 'out')
        const pdb = products.find(p => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase()))
        if (pdb) {
          const newQty = Math.max(0, pdb.quantity + diff)
          try { await axios.put(`${API_BASE}/${pdb.id}/stock`, null, { params: { quantity: newQty } }); addLog(`DB: Stock de ${name} → ${newQty}`, 'in') }
          catch (e) { toast.error(`No se pudo guardar ${name}`) }
        } else { toast.error(`${name} no existe en la DB`) }
      }
    }
    setShelfState(currentCount); fetchProducts()
  }

  const captureAndDetect = async () => {
    if (!videoRef.current || isProcessing.current || activeTab !== 'dashboard') return
    isProcessing.current = true; setLoadingIA(true)
    try {
      const c = document.createElement('canvas'); c.width = 480; c.height = 360
      c.getContext('2d').drawImage(videoRef.current, 0, 0, 480, 360)
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.6))
      const fd = new FormData(); fd.append('image', blob, 'shelf.jpg')
      const res = await fetch(API_IA, { method: 'POST', body: fd }); const data = await res.json()
      if (data.products) await processShelfChanges(data.products)
    } catch (e) { console.error("Error conectando con la IA:", e); toast.error("Error de conexión IA"); } finally { setLoadingIA(false); isProcessing.current = false }
  }

  useEffect(() => { const i = setInterval(captureAndDetect, 800); return () => clearInterval(i) }, [captureAndDetect, products, shelfState, activeTab])

  const alerts = products.filter(p => p.quantity <= 2)
  const totalStock = products.reduce((s, p) => s + (p.quantity || 0), 0)
  const healthyCount = products.filter(p => p.quantity > 2).length
  const getLogIcon = (t) => t === 'in' ? <CheckCircle2 size={14} color="#10b981" /> : t === 'out' ? <AlertCircle size={14} color="#ef4444" /> : <Info size={14} color="#f59e0b" />

  // ── User management ──
  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUser.name || !newUser.username || !newUser.password) { toast.error('Completa todos los campos'); return }
    try {
      await axios.post(API_USERS, newUser)
      setNewUser({ name: '', username: '', password: '', role: 'user' }); setShowAddUser(false)
      toast.success(`Usuario creado`)
      fetchUsers()
    } catch(err) {
      toast.error('Error: el usuario ya existe')
    }
  }

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return
    try {
      await axios.delete(`${API_USERS}/${id}`)
      toast.success('Usuario eliminado')
      fetchUsers()
    } catch(err) {
      toast.error('Error al eliminar usuario')
    }
  }

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return
    try {
      await axios.delete(`${API_BASE.replace('/api/products', '/api/products')}/${id}`)
      toast.success('Producto eliminado')
      fetchProducts()
    } catch (e) { toast.error('Error al eliminar producto') }
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory', icon: ClipboardList, label: 'Inventory' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    ...(isAdmin ? [{ id: 'users', icon: Users, label: 'Users' }] : []),
  ]

  return (
    <div className="app-shell">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.85rem' } }} />

      {/* SIDEBAR */}
      <nav className="sidebar no-print">
        <div className="sidebar-logo"><ShoppingBasket size={22} color="white" /></div>
        {navItems.map(item => (
          <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)} title={item.label}>
            <item.icon size={20} />
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="nav-item" onClick={() => setSoundEnabled(!soundEnabled)} title="Sound">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} color="#ef4444" />}
          </div>
          <div className="nav-item" onClick={onLogout} title="Cerrar Sesión"><LogOut size={18} /></div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>{activeTab === 'users' ? 'Gestión de Usuarios' : activeTab}</h1>
            <p className="subtitle">UCC Vision Pro • Intelligent Inventory System</p>
          </div>
          <div className="header-actions no-print">
            <div className="user-logged-info"><span className="user-dot" />{currentUser.name} ({currentUser.role})</div>
            <button className="btn" onClick={fetchProducts}><RefreshCcw size={14} /> Sync</button>
            <button className="logout-btn" onClick={onLogout}><LogOut size={14} /> Salir</button>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (<>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-icon purple"><Package size={20} /></div><div className="stat-value">{products.length}</div><div className="stat-label">Total Products</div></div>
            <div className="stat-card"><div className="stat-icon green"><TrendingUp size={20} /></div><div className="stat-value">{totalStock}</div><div className="stat-label">Total Stock</div></div>
            <div className="stat-card"><div className="stat-icon amber"><Eye size={20} /></div><div className="stat-value">{healthyCount}</div><div className="stat-label">Healthy Items</div></div>
            <div className="stat-card"><div className="stat-icon red"><AlertTriangle size={20} /></div><div className="stat-value">{alerts.length}</div><div className="stat-label">Low Stock</div></div>
          </div>
          <div className="dashboard-grid">
            <div className="glass-card">
              <div className="card-header"><span className="card-title">Live Camera Feed</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} color={loadingIA ? '#10b981' : '#475569'} /><span style={{ fontSize: '0.7rem', color: loadingIA ? '#10b981' : '#475569' }}>{loadingIA ? 'Analyzing...' : 'Standby'}</span></div>
              </div>
              <div className="card-body"><div className="stream-container"><video ref={videoRef} autoPlay playsInline muted /><div className="scan-line" /><div className="stream-overlay" /><div className={`stream-badge ${loadingIA ? 'ai-active' : ''}`}><span className="dot" />LIVE</div><div className="ai-status"><ScanFace size={14} />AI Vision</div></div></div>
            </div>
            <div className="glass-card">
              <div className="card-header"><span className="card-title">Recent Activity</span><span style={{ fontSize: '0.68rem', color: '#475569' }}>{logs.length} events</span></div>
              <div className="card-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {logs.length === 0 ? <div className="log-empty"><Activity size={32} color="#1e293b" style={{ marginBottom: '0.75rem' }} /><p>No activity yet</p></div>
                : logs.map((log, i) => <div key={log.id} className="log-item" style={{ animationDelay: `${i * 0.05}s` }}>{getLogIcon(log.type)}<span>{log.msg}</span><span className="log-time">{log.time}</span></div>)}
              </div>
            </div>
          </div>
        </>)}

        {/* INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="glass-card" style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="card-header"><span className="card-title">Product Inventory</span><span style={{ fontSize: '0.72rem', color: '#475569' }}>{products.length} items</span></div>
            <div className="card-body">
              <div className="table-header"><span>Product</span><span>Location</span><span>Quantity</span><span>Status</span>{isAdmin && <span>Acciones</span>}</div>
              <div className="inventory-grid">
                {products.map((p, i) => (
                  <div key={p.id} className="product-row" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="product-info"><img src={SMART_MAPPING[p.name]?.img || '/products/atun.png'} alt={p.name} className="product-img" /><div><div className="product-name">{p.name}</div><div className="product-category">SKU-{String(p.id).slice(-4).padStart(4, '0')}</div></div></div>
                    <div className="product-location">{p.aisle || 'General'}</div>
                    <div className="product-qty">{p.quantity}<span>units</span></div>
                    <div><span className={`status-badge ${p.quantity > 2 ? 'healthy' : 'low'}`}><span className="status-dot" />{p.quantity > 2 ? 'Healthy' : 'Low Stock'}</span></div>
                    {isAdmin && (
                      <div className="product-actions">
                        <button className="delete-btn-table" onClick={() => handleDeleteProduct(p.id)} title="Eliminar Producto">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="analytics-grid" style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="glass-card">
              <div className="card-header"><span className="card-title">Stock Distribution</span></div>
              <div className="card-body">
                <div className="chart-bars">
                  {products.map((p, i) => { const mx = Math.max(...products.map(x => x.quantity), 1); return (
                    <div key={p.id} className="chart-bar"><div className="chart-bar-value">{p.quantity}</div><div className="chart-bar-fill" style={{ height: `${(p.quantity / mx) * 100}%`, animationDelay: `${i * 0.15}s`, background: p.quantity <= 2 ? 'linear-gradient(180deg, #ef4444, rgba(239,68,68,0.4))' : 'linear-gradient(180deg, #6366f1, rgba(99,102,241,0.4))' }} /><div className="chart-bar-label">{p.name}</div></div>
                  )})}
                </div>
              </div>
            </div>
            <div className="glass-card">
              <div className="card-body big-metric">
                <div className="big-metric-icon"><Zap size={28} color="#6366f1" /></div>
                <div className="big-metric-value">{products.length}</div>
                <div className="big-metric-label">Products Monitored</div>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{healthyCount}</div><div style={{ fontSize: '0.68rem', color: '#475569' }}>Healthy</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{alerts.length}</div><div style={{ fontSize: '0.68rem', color: '#475569' }}>Critical</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366f1' }}>{totalStock}</div><div style={{ fontSize: '0.68rem', color: '#475569' }}>Total</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT (solo admin) */}
        {activeTab === 'users' && isAdmin && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="users-header">
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{users.length} usuarios registrados</span>
              <button className="btn btn-primary" onClick={() => setShowAddUser(!showAddUser)}><UserPlus size={16} />{showAddUser ? 'Cancelar' : 'Agregar Usuario'}</button>
            </div>

            {showAddUser && (
              <div className="add-user-form">
                <h3><UserPlus size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Nuevo Usuario</h3>
                <form onSubmit={handleAddUser}>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Nombre completo</label><input className="form-input" placeholder="Ej: Juan Pérez" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Usuario</label><input className="form-input" placeholder="Ej: juanp" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Contraseña</label><input className="form-input" type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Rol</label>
                      <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                        <option value="user">Usuario</option><option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="login-btn" style={{ marginTop: '0.5rem' }}><UserPlus size={16} />Crear Usuario</button>
                </form>
              </div>
            )}

            <div className="glass-card">
              <div className="card-header"><span className="card-title">Usuarios del Sistema</span></div>
              <div className="card-body">
                <div className="user-table-header"><span>Usuario</span><span>Fecha de Creación</span><span>Rol</span><span></span></div>
                <div className="inventory-grid">
                  {users.map((u, i) => (
                    <div key={u.id} className="user-row" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="user-info">
                        <div className={`user-avatar ${u.role === 'admin' ? 'admin-avatar' : 'user-avatar-style'}`}>{u.name.charAt(0)}</div>
                        <div><div className="user-name">{u.name}</div><div className="user-username">@{u.username}</div></div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{new Date(u.createdAt).toLocaleDateString('es-CO')}</div>
                      <div><span className={`role-badge ${u.role}`}><Shield size={10} />{u.role === 'admin' ? 'Admin' : 'Usuario'}</span></div>
                      <div>{u.role !== 'admin' && <button className="delete-btn" onClick={() => handleDeleteUser(u.id)} title="Eliminar"><Trash2 size={14} /></button>}</div>
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

// ══════════════════════════════════════
// APP ROOT (Auth Router)
// ══════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(getSession()) // Recuperar sesión si existe

  const handleLogin = (user) => setCurrentUser(user)
  const handleLogout = () => { clearSession(); setCurrentUser(null); toast.success('Sesión cerrada') }

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />
  return <Dashboard currentUser={currentUser} onLogout={handleLogout} />
}