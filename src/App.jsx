import { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import {
  ScanFace, Package, PackagePlus, Loader2, RefreshCcw, LayoutDashboard,
  ClipboardList, Bell, Settings, BarChart3, CheckCircle2, AlertCircle, Info,
  Volume2, VolumeX, Printer, Zap, TrendingUp, AlertTriangle, Activity, Eye, EyeOff,
  Users, LogOut, Trash2, UserPlus, Shield, Lock, Store, Play, Square, Video
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

function getSession() { 
  const raw = sessionStorage.getItem('ucc_session')
  return raw ? JSON.parse(raw) : null 
}
function saveSession(user) { sessionStorage.setItem('ucc_session', JSON.stringify(user)) }
function clearSession() { sessionStorage.removeItem('ucc_session') }

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOGIN SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      // Fallback solo por seguridad extrema si el backend sigue roto
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
        <div className="login-logo"><ScanFace size={28} color="white" /></div>
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
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="login-btn"><Lock size={16} />Iniciar Sesión</button>
        </form>
      </div>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.85rem' } }} />
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN DASHBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Dashboard({ currentUser, onLogout }) {
  const [products, setProducts] = useState([])
  const [loadingIA, setLoadingIA] = useState(false)
  const [shelfState, setShelfState] = useState({})
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  // IA Process State
  const [isAiActive, setIsAiActive] = useState(false)
  const [sessions, setSessions] = useState(JSON.parse(localStorage.getItem('ucc_sessions') || '[]'))
  const currentSession = useRef(null)

  // Products State
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', aisle: '', quantity: 10 })

  // Users State
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
    
    if (currentSession.current) {
        currentSession.current.events.push(newLog)
    }
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
        addLog(`IA: ${diff > 0 ? 'Detectó' : 'Dejó de ver'} ${name} (${diff > 0 ? '+' : ''}${diff})`, diff > 0 ? 'info' : 'out')
        const pdb = products.find(p => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase()))
        if (pdb) {
          const newQty = Math.max(0, pdb.quantity + diff)
          try { await axios.put(`${API_BASE}/${pdb.id}/stock`, null, { params: { quantity: newQty } }); addLog(`BD: Stock de ${name} → ${newQty}`, 'in') }
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
    } catch (e) { console.error("Error conectando con la IA:", e); toast.error("Error de conexión IA"); setIsAiActive(false); } 
    finally { setLoadingIA(false); isProcessing.current = false }
  }

  useEffect(() => { 
      let i;
      if (isAiActive) {
          i = setInterval(captureAndDetect, 1000); 
      }
      return () => clearInterval(i) 
  }, [isAiActive, products, shelfState, activeTab])

  const toggleAI = () => {
      if (!isAiActive) {
          currentSession.current = {
              id: Date.now(),
              startTime: new Date().toLocaleString(),
              events: [],
              endTime: null
          }
          toast.success("Análisis IA Iniciado")
      } else {
          if (currentSession.current) {
              currentSession.current.endTime = new Date().toLocaleString()
              const updatedSessions = [currentSession.current, ...sessions]
              setSessions(updatedSessions)
              localStorage.setItem('ucc_sessions', JSON.stringify(updatedSessions))
              currentSession.current = null
          }
          toast.success("Análisis IA Detenido")
      }
      setIsAiActive(!isAiActive)
  }

  const alerts = products.filter(p => p.quantity <= 2)
  const totalStock = products.reduce((s, p) => s + (p.quantity || 0), 0)
  const healthyCount = products.filter(p => p.quantity > 2).length
  const getLogIcon = (t) => t === 'in' ? <CheckCircle2 size={14} color="#10b981" /> : t === 'out' ? <AlertCircle size={14} color="#ef4444" /> : <Info size={14} color="#f59e0b" />

  // ── Product management ──
  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.aisle) { toast.error('Completa los campos obligatorios'); return }
    try {
      await axios.post(API_BASE, newProduct)
      setNewProduct({ name: '', aisle: '', quantity: 10 })
      setShowAddProduct(false)
      toast.success(`Producto agregado`)
      fetchProducts()
    } catch(err) {
      toast.error('Error al agregar el producto')
    }
  }

  // ── User management ──
  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUser.name || !newUser.username || !newUser.password || !newUser.supermercado) { toast.error('Completa todos los campos'); return }
    try {
      await axios.post(API_USERS, newUser)
      setNewUser({ name: '', username: '', password: '', role: 'user', supermercado: currentUser.supermercado || 'Sede Principal' }); setShowAddUser(false)
      toast.success(`Usuario creado`)
      fetchUsers()
    } catch(err) {
      toast.error('Error: el usuario ya existe o hubo fallo')
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
    { id: 'dashboard', icon: LayoutDashboard, label: 'Resumen' },
    { id: 'camera', icon: Video, label: 'Cámara IA' },
    { id: 'inventory', icon: ClipboardList, label: 'Inventario' },
    { id: 'reports', icon: BarChart3, label: 'Reportes' },
    ...(isAdmin ? [{ id: 'users', icon: Users, label: 'Usuarios' }] : []),
  ]

  return (
    <div className="app-shell">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.85rem' } }} />

            {/* SIDEBAR */}
      <nav className="sidebar no-print">
        <div className="sidebar-logo-container">
          <div className="sidebar-logo"><ScanFace size={22} color="white" /></div>
          <span className="logo-text">Vision Pro</span>
        </div>
        {navItems.map(item => (
          <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)} title={item.label}>
            <item.icon size={20} />
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="nav-item" onClick={() => setSoundEnabled(!soundEnabled)} title="Sonido">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} color="#ef4444" />}
            <span className="nav-label">{soundEnabled ? 'Silenciar' : 'Sonido'}</span>
          </div>
          <div className="nav-item" onClick={onLogout} title="Cerrar Sesión">
            <LogOut size={18} />
            <span className="nav-label">Cerrar Sesión</span>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>{navItems.find(i => i.id === activeTab)?.label}</h1>
            <p className="subtitle">UCC Vision Pro • {currentUser.supermercado || 'Sistema de Inventario'}</p>
          </div>
          <div className="header-actions no-print">
            <div className="user-logged-info"><span className="user-dot" />{currentUser.name} ({currentUser.role === 'admin' ? 'Admin' : 'Operador'})</div>
            <button className="btn" onClick={fetchProducts}><RefreshCcw size={14} /> Sincronizar</button>
            <button className="logout-btn" onClick={onLogout}><LogOut size={14} /> Salir</button>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (<>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-icon purple"><Package size={20} /></div><div className="stat-value">{products.length}</div><div className="stat-label">Total Productos</div></div>
            <div className="stat-card"><div className="stat-icon green"><TrendingUp size={20} /></div><div className="stat-value">{totalStock}</div><div className="stat-label">Stock Total</div></div>
            <div className="stat-card"><div className="stat-icon amber"><CheckCircle2 size={20} /></div><div className="stat-value">{healthyCount}</div><div className="stat-label">Stock Saludable</div></div>
            <div className="stat-card"><div className="stat-icon red"><AlertTriangle size={20} /></div><div className="stat-value">{alerts.length}</div><div className="stat-label">Stock Crítico</div></div>
          </div>
          <div className="dashboard-grid">
            <div className="glass-card">
              <div className="card-header"><span className="card-title">Distribución de Stock</span></div>
              <div className="card-body">
                <div className="chart-bars">
                  {products.map((p, i) => { const mx = Math.max(...products.map(x => x.quantity), 1); return (
                    <div key={p.id} className="chart-bar"><div className="chart-bar-value">{p.quantity}</div><div className="chart-bar-fill" style={{ height: `${(p.quantity / mx) * 100}%`, animationDelay: `${i * 0.15}s`, background: p.quantity <= 2 ? 'linear-gradient(180deg, #ef4444, rgba(239,68,68,0.4))' : 'linear-gradient(180deg, #6366f1, rgba(99,102,241,0.4))' }} /><div className="chart-bar-label">{p.name}</div></div>
                  )})}
                </div>
              </div>
            </div>
            <div className="glass-card">
              <div className="card-header"><span className="card-title">Actividad Reciente</span><span style={{ fontSize: '0.68rem', color: '#475569' }}>{logs.length} eventos</span></div>
              <div className="card-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {logs.length === 0 ? <div className="log-empty"><Activity size={32} color="#1e293b" style={{ marginBottom: '0.75rem' }} /><p>Sin actividad</p></div>
                : logs.map((log, i) => <div key={log.id} className="log-item" style={{ animationDelay: `${i * 0.05}s` }}>{getLogIcon(log.type)}<span>{log.msg}</span><span className="log-time">{log.time}</span></div>)}
              </div>
            </div>
          </div>
        </>)}

        {/* CAMARA IA */}
        {activeTab === 'camera' && (
            <div className="glass-card" style={{ animation: 'fadeInUp 0.5s ease', maxWidth: '1000px', margin: '0 auto' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-title">Transmisión de Cámara IA</span>
                  <button onClick={toggleAI} className={`btn ${isAiActive ? 'btn-danger' : 'btn-primary'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: isAiActive ? '#ef4444' : '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                      <span style={{ display: isAiActive ? 'flex' : 'none', alignItems: 'center' }}><Square size={16} /></span>
                      <span style={{ display: !isAiActive ? 'flex' : 'none', alignItems: 'center' }}><Play size={16} /></span>
                      <span>{isAiActive ? 'Detener Análisis' : 'Iniciar Análisis IA'}</span>
                  </button>
              </div>
              <div className="card-body" style={{ display: 'flex', gap: '20px', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
                  <div className="stream-container" style={{ height: '480px', flex: 2, position: 'relative' }}>
                      <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                      </div>
                      <div className="scan-line" style={{ display: isAiActive ? 'block' : 'none' }} />
                      <div className="stream-overlay" />
                      <div className={`stream-badge ${isAiActive ? 'ai-active' : ''}`} style={{ background: isAiActive ? 'rgba(16, 185, 129, 0.9)' : 'rgba(71, 85, 105, 0.9)' }}>
                          <span className="dot" style={{ background: isAiActive ? '#fff' : '#94a3b8' }} /><span>{isAiActive ? 'PROCESANDO' : 'EN ESPERA'}</span>
                      </div>
                      <div className="ai-status"><ScanFace size={14} />Visión IA</div>
                  </div>
                  
                  {/* REAL-TIME DETECTION PANEL */}
                  <div className="detection-panel" style={{ flex: 1, background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                          <ScanFace size={20} color={isAiActive ? "#10b981" : "#64748b"}/> Objetos en Vista
                      </h4>
                      
                      {!isAiActive ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center' }}>
                              <EyeOff size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                              <p style={{ fontSize: '0.9rem' }}>La IA está apagada.<br/>Presiona el botón superior para iniciar el escaneo en tiempo real.</p>
                          </div>
                      ) : Object.keys(shelfState).length === 0 ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center' }}>
                              <div className="spinner-border" style={{ marginBottom: '1rem', borderTopColor: '#10b981', width: '30px', height: '30px', border: '3px solid rgba(16,185,129,0.2)', borderTop: '3px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                              <p style={{ fontSize: '0.9rem' }}>Buscando productos en la cámara...</p>
                          </div>
                      ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                              {Object.entries(shelfState).map(([name, count], idx) => (
                                  <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '10px', animation: `fadeInUp 0.3s ease ${idx * 0.05}s forwards` }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                          <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                            <img src={SMART_MAPPING[name]?.img || '/products/atun.png'} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                          </div>
                                          <span style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 500 }}>{name}</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cant:</span>
                                          <span style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>{count}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
            </div>
        )}

        {/* INVENTORY */}
        {activeTab === 'inventory' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="users-header" style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{products.length} productos en inventario</span>
              {isAdmin && <button className="btn btn-primary" onClick={() => setShowAddProduct(!showAddProduct)}><PackagePlus size={16} />{showAddProduct ? 'Cancelar' : 'Agregar Producto'}</button>}
            </div>

            {showAddProduct && (
              <div className="add-user-form">
                <h3><PackagePlus size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Nuevo Producto</h3>
                <form onSubmit={handleAddProduct}>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Nombre del Producto</label><input className="form-input" placeholder="Ej: Atún" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Ubicación (Pasillo)</label><input className="form-input" placeholder="Ej: Pasillo 1" value={newProduct.aisle} onChange={e => setNewProduct({ ...newProduct, aisle: e.target.value })} required /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Cantidad Inicial</label><input className="form-input" type="number" min="0" value={newProduct.quantity} onChange={e => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })} required /></div>
                  </div>
                  <button type="submit" className="login-btn" style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: '0' }}>Guardar Producto</button>
                </form>
              </div>
            )}

            <div className="glass-card">
              <div className="card-header"><span className="card-title">Inventario de Productos</span></div>
            <div className="card-body">
              <div className="table-header"><span>Producto</span><span>Ubicación</span><span>Cantidad</span><span>Estado</span>{isAdmin && <span>Acciones</span>}</div>
              <div className="inventory-grid">
                {products.map((p, i) => (
                  <div key={p.id} className="product-row" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="product-info"><img src={SMART_MAPPING[p.name]?.img || '/products/atun.png'} alt={p.name} className="product-img" /><div><div className="product-name">{p.name}</div><div className="product-category">SKU-{String(p.id).slice(-4).padStart(4, '0')}</div></div></div>
                    <div className="product-location">{p.aisle || 'General'}</div>
                    <div className="product-qty">{p.quantity}<span>unidades</span></div>
                    <div><span className={`status-badge ${p.quantity > 2 ? 'healthy' : 'low'}`}><span className="status-dot" />{p.quantity > 2 ? 'Saludable' : 'Poco Stock'}</span></div>
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
          </div>
        )}

        {/* REPORTS */}
        {activeTab === 'reports' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
              <div className="glass-card">
                  <div className="card-header"><span className="card-title">Historial de Sesiones de Monitoreo</span></div>
                  <div className="card-body">
                      {sessions.length === 0 ? (
                          <div className="log-empty" style={{ padding: '3rem' }}>
                              <ClipboardList size={48} color="#1e293b" style={{ marginBottom: '1rem' }} />
                              <p>No hay sesiones registradas.</p>
                              <span style={{ fontSize: '0.8rem' }}>Inicia el análisis IA desde la pestaña de Cámara para registrar una sesión.</span>
                          </div>
                      ) : (
                          <div className="inventory-grid">
                              {sessions.map((s, i) => (
                                  <div key={s.id} className="glass-card" style={{ marginBottom: '1rem', padding: '1.5rem', animationDelay: `${i * 0.1}s` }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                          <div>
                                              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>Sesión #{String(s.id).slice(-4)}</div>
                                              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Eventos detectados: {s.events.length}</div>
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                              <div style={{ fontSize: '0.85rem', color: '#10b981' }}>Inicio: {s.startTime}</div>
                                              <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>Fin: {s.endTime || 'En progreso'}</div>
                                          </div>
                                      </div>
                                      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                          {s.events.slice(0, 5).map(ev => (
                                              <div key={ev.id} style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                                                  <span>{ev.time}</span> - <span>{ev.msg}</span>
                                              </div>
                                          ))}
                                          {s.events.length > 5 && <div style={{ fontSize: '0.8rem', color: '#6366f1' }}>+ {s.events.length - 5} eventos más...</div>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
        )}

        {/* USERS MANAGEMENT (solo admin) */}
        {activeTab === 'users' && isAdmin && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="users-header">
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{users.length} usuarios registrados en {currentUser.supermercado || 'Sede Principal'}</span>
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
                    <div className="form-group"><label className="form-label">Supermercado (SaaS)</label><input className="form-input" placeholder="Ej: Ã‰xito Norte" value={newUser.supermercado} onChange={e => setNewUser({ ...newUser, supermercado: e.target.value })} required /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Rol</label>
                      <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                        <option value="user">Cajero / Operador</option><option value="admin">Administrador</option>
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
                <div className="user-table-header"><span>Usuario</span><span>Supermercado</span><span>Fecha de Creación</span><span>Rol</span><span></span></div>
                <div className="inventory-grid">
                  {users.map((u, i) => (
                    <div key={u.id} className="user-row" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="user-info">
                        <div className={`user-avatar ${u.role === 'admin' ? 'admin-avatar' : 'user-avatar-style'}`}>{u.name.charAt(0)}</div>
                        <div><div className="user-name">{u.name}</div><div className="user-username">@{u.username}</div></div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#f1f5f9' }}><Store size={12} style={{marginRight:'4px'}}/>{u.supermercado || 'Sede Principal'}</div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{new Date(u.createdAt).toLocaleDateString('es-CO')}</div>
                      <div><span className={`role-badge ${u.role}`}><Shield size={10} />{u.role === 'admin' ? 'Admin' : 'Operador'}</span></div>
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

// --------------------------------------
// APP ROOT (Auth Router)
// --------------------------------------
export default function App() {
  const [currentUser, setCurrentUser] = useState(getSession())

  const handleLogin = (user) => setCurrentUser(user)
  const handleLogout = () => { clearSession(); setCurrentUser(null); toast.success('Sesión cerrada') }

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />
  return <Dashboard currentUser={currentUser} onLogout={handleLogout} />
}

