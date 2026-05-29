import { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import {
  ScanFace, Package, PackagePlus, RefreshCcw, LayoutDashboard,
  ClipboardList, Users, LogOut, Trash2, UserPlus, Shield, Store, Play, Square, Video, Eye, EyeOff, Activity, AlertTriangle, CheckCircle2, Info, TrendingUp, Volume2, VolumeX, Crosshair, DollarSign, Download, Plus, Minus, MessageSquare, Send, FileText
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import './App.css'

const API_BASE = '/proxy/backend/api/products'
const API_USERS = '/proxy/backend/api/users'
const API_SESSIONS = '/proxy/backend/api/sessions'
const API_MESSAGES = '/proxy/backend/api/messages'
const API_IA = '/proxy/ia/detect_all'
const SOUND_IN = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
const SOUND_OUT = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'

// ── TYPES ─────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  aisle: string;
  quantity: number;
  price: number;
}

export interface User {
  id: string | number;
  name: string;
  username: string;
  role: string;
  supermercado: string;
  createdAt?: string;
  password?: string;
}

export interface LogEvent {
  id: number;
  msg: string;
  type: 'in' | 'out';
  time: string;
}

export interface Session {
  id?: string;
  sessionId: number;
  startTime: string;
  endTime: string | null;
  events: LogEvent[];
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp?: string;
}

export interface RoleDef {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

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

function getSession(): User | null { 
  const raw = sessionStorage.getItem('ucc_session')
  return raw ? JSON.parse(raw) : null 
}
function saveSession(user: User) { sessionStorage.setItem('ucc_session', JSON.stringify(user)) }
function clearSession() { sessionStorage.removeItem('ucc_session') }

// ═══════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════
function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
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
        <div className="flex justify-center mb-4">
          <img src="/logo_circular.png" alt="Vision Pro Logo" style={{ width: '64px', height: '64px', borderRadius: '50%', boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)' }} />
        </div>
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
function Dashboard({ currentUser, onLogout }: { currentUser: User, onLogout: () => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingIA, setLoadingIA] = useState(false)
  const [shelfState, setShelfState] = useState<Record<string, number>>({})
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  
  const [isAiActive, setIsAiActive] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const currentSession = useRef<Session | null>(null)

  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', aisle: '', quantity: 10, price: 0 })

  const [showAddUser, setShowAddUser] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'user', supermercado: currentUser.supermercado || 'Sede Principal' })

  const [chatTarget, setChatTarget] = useState('general')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isProcessing = useRef(false)
  const lastActionTime = useRef<Record<string, number>>({})
  const role = currentUser.role || 'cajero'

  // ── Permisos por rol ──────────────────────────────────
  const ROLES: Record<string, RoleDef> = {
    admin:      { label: 'Administrador', color: '#b026ff', bg: 'rgba(176,38,255,0.15)', border: 'rgba(176,38,255,0.35)', icon: '🛡️' },
    supervisor: { label: 'Supervisor',    color: '#00f0ff', bg: 'rgba(0,240,255,0.1)',   border: 'rgba(0,240,255,0.3)',   icon: '👁️' },
    inventario: { label: 'Inventario',    color: '#00ff88', bg: 'rgba(0,255,136,0.1)',   border: 'rgba(0,255,136,0.3)',   icon: '📦' },
    cajero:     { label: 'Cajero',        color: '#ffaa00', bg: 'rgba(255,170,0,0.1)',   border: 'rgba(255,170,0,0.3)',   icon: '🧾' },
  }
  const can = (permission: string) => {
    const perms: Record<string, string[]> = {
      see_camera:     ['admin', 'supervisor', 'cajero'],
      see_inventory:  ['admin', 'supervisor', 'inventario'],
      edit_inventory: ['admin', 'inventario'],
      see_reports:    ['admin', 'supervisor', 'inventario'],
      see_users:      ['admin'],
      delete_product: ['admin'],
    }
    return (perms[permission] || []).includes(role)
  }
  const isAdmin = role === 'admin'

  const fetchProducts = useCallback(async () => {
    try { const res = await axios.get(API_BASE); setProducts(res.data) } catch (err) { console.error("DB Error") }
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await axios.get(API_BASE)
      setProducts(res.data)
      toast.success(`Base de datos sincronizada — ${res.data.length} productos`)
    } catch (err) {
      toast.error('Error al sincronizar con la BD')
    } finally {
      setIsSyncing(false)
    }
  }

  const fetchUsers = useCallback(async () => {
    try { const res = await axios.get(API_USERS); setUsers(res.data) } catch (err) { console.error("Error fetching users") }
  }, [])

  const fetchSessions = useCallback(async () => {
    if (!can('see_reports')) return
    try { const res = await axios.get(API_SESSIONS); setSessions(res.data) } catch (err) { console.error("Error fetching sessions") }
  }, [role])

  const fetchMessages = useCallback(async () => {
    if (!currentUser) return;
    try {
      let res;
      if (chatTarget === 'general') {
        res = await axios.get(`${API_MESSAGES}/general`);
      } else {
        res = await axios.get(`${API_MESSAGES}/dm/${currentUser.id}/${chatTarget}`);
      }
      setMessages(res.data);
    } catch (err) { console.error('Error fetching messages', err) }
  }, [chatTarget, currentUser])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { if (activeTab === 'camera') setupCamera() }, [activeTab])
  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { if (activeTab === 'reports') fetchSessions() }, [activeTab, fetchSessions])
  useEffect(() => { if (activeTab === 'chat') fetchMessages() }, [activeTab, chatTarget, fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Background Auto-Sync to keep multiple devices updated in real-time
  useEffect(() => {
    const syncInterval = setInterval(() => {
      fetchProducts()
      if (activeTab === 'reports') fetchSessions()
      if (activeTab === 'chat') fetchMessages()
    }, 2500)
    return () => clearInterval(syncInterval)
  }, [fetchProducts, fetchSessions, fetchMessages, activeTab])

  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) { console.error("Camera error") }
  }

  const playSound = (url: string) => { if (!soundEnabled) return; const a = new Audio(url); a.volume = 0.3; a.play().catch(() => {}) }
  const addLog = (msg: string, type: 'in' | 'out') => {
    const newLog: LogEvent = { id: Date.now(), msg, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setLogs(prev => [newLog, ...prev].slice(0, 10))
    playSound(type === 'in' ? SOUND_IN : SOUND_OUT)
    if (currentSession.current) currentSession.current.events.push(newLog)
  }

  const processShelfChanges = async (detectedList: string[]) => {
    const currentCount: Record<string, number> = {}
    detectedList.forEach(item => { const m = (SMART_MAPPING as any)[item] || { name: item }; currentCount[m.name] = (currentCount[m.name] || 0) + 1 })
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
      const blob = await new Promise<Blob>((r) => c.toBlob(b => r(b as Blob), 'image/jpeg', 0.6))
      const fd = new FormData(); fd.append('image', blob, 'shelf.jpg')
      const res = await fetch(API_IA, { method: 'POST', body: fd }); const data = await res.json()
      if (data.products) await processShelfChanges(data.products)
    } catch (e) { console.error("Error", e); setIsAiActive(false); } 
    finally { setLoadingIA(false); isProcessing.current = false }
  }

  useEffect(() => { 
      let i; if (isAiActive) i = setInterval(captureAndDetect, 400); 
      return () => clearInterval(i) 
  }, [isAiActive, products, shelfState, activeTab])

  const toggleAI = async () => {
      if (!isAiActive) {
          currentSession.current = { sessionId: Date.now(), startTime: new Date().toLocaleString(), events: [], endTime: null }
          toast.success("Enlace Neuronal Establecido")
      } else {
          if (currentSession.current) {
              currentSession.current.endTime = new Date().toLocaleString()
              try {
                await axios.post(API_SESSIONS, currentSession.current)
                if (activeTab === 'reports') fetchSessions()
              } catch (e) {
                console.error("No se pudo guardar la sesión en la nube", e)
              }
              currentSession.current = null
          }
          toast.success("Enlace Neuronal Desconectado")
      }
      setIsAiActive(!isAiActive)
  }

  const alerts = products.filter(p => p.quantity <= 2)
  const totalStock = products.reduce((s, p) => s + (p.quantity || 0), 0)
  const healthyCount = products.filter(p => p.quantity > 2).length
  const totalValue = products.reduce((s, p) => s + ((p.quantity || 0) * (p.price || 0)), 0)
  const formatCOP = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.aisle) return toast.error('Faltan campos')
    try { await axios.post(API_BASE, newProduct); setNewProduct({ name: '', aisle: '', quantity: 10, price: 0 }); setShowAddProduct(false); toast.success('Producto agregado'); fetchProducts() } catch(err) { toast.error('Error al agregar') }
  }
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Eliminar producto?')) return
    try { await axios.delete(`${API_BASE}/${id}`); toast.success('Eliminado'); fetchProducts() } catch (e) { toast.error('Error') }
  }

  const updateQuantity = async (id: string, newQty: number) => {
    if (newQty < 0) return
    try { await axios.put(`${API_BASE}/${id}/stock`, null, { params: { quantity: newQty } }); fetchProducts() }
    catch (e) { toast.error('Error al actualizar stock') }
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Título
    doc.setFontSize(16)
    doc.text("Reporte de Inventario - VISION PRO", 14, 15)
    doc.setFontSize(10)
    doc.text(`Fecha de exportación: ${new Date().toLocaleString('es-CO')}`, 14, 22)
    doc.text(`Total en inventario: ${formatCOP(totalValue)}`, 14, 28)
    
    // Preparar columnas y filas
    const columns = ["ID", "Producto", "Sector", "Precio", "Cantidad", "Valor Total"]
    const rows = products.map(p => [
      p.id.slice(-6).toUpperCase(),
      p.name,
      p.aisle || 'General',
      formatCOP(p.price || 0),
      (p.quantity || 0).toString(),
      formatCOP((p.quantity || 0) * (p.price || 0))
    ])

    // Dibujar tabla
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [0, 240, 255], textColor: [0, 0, 0] },
      styles: { fontSize: 9 }
    })

    // Descargar
    doc.save(`inventario-${new Date().toISOString().slice(0,10)}.pdf`)
    toast.success('PDF generado correctamente')
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    try {
      const msg = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: chatTarget,
        content: chatInput
      }
      await axios.post(API_MESSAGES, msg)
      setChatInput('')
      fetchMessages()
    } catch (err) {
      toast.error('Error al enviar el mensaje')
    }
  }

  const navItems = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Resumen' },
    ...(can('see_camera')    ? [{ id: 'camera',    icon: Crosshair,  label: 'Cámara IA'  }] : []),
    ...(can('see_inventory') ? [{ id: 'inventory', icon: Package,    label: 'Inventario' }] : []),
    { id: 'chat', icon: MessageSquare, label: 'Comunicaciones' },
    ...(can('see_reports')   ? [{ id: 'reports',   icon: Activity,   label: 'Reportes'    }] : []),
    ...(can('see_users')     ? [{ id: 'users',     icon: Shield,     label: 'Usuarios'       }] : []),
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
            <span className="nav-label">{soundEnabled ? 'Silenciar Sistema' : 'Activar Audio'}</span>
          </div>
          <div className="nav-item" onClick={onLogout}>
            <LogOut size={20} />
            <span className="nav-label">Desconectar</span>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="page-header">
          <div className="mobile-top-logo">
            <ScanFace size={24} color="var(--accent-cyan)" />
            <span className="logo-text" style={{ fontSize: '1.2rem' }}>VISION <span className="text-gradient">PRO</span></span>
          </div>
          <div className="header-title-container">
            <h1>{navItems.find(i => i.id === activeTab)?.label}</h1>
            <p className="subtitle hide-mobile">Nodo del Sistema // {currentUser.supermercado || 'Sede Principal'}</p>
          </div>
          <div className="header-actions">
            <div className="user-badge" style={{ borderColor: (ROLES[role] || ROLES.cajero).border }}>
              <span className="status-dot" style={{ background: (ROLES[role] || ROLES.cajero).color, boxShadow: `0 0 8px ${(ROLES[role] || ROLES.cajero).color}` }}></span>
              <span>{currentUser.name}</span>
              <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, background: (ROLES[role] || ROLES.cajero).bg, color: (ROLES[role] || ROLES.cajero).color, border: `1px solid ${(ROLES[role] || ROLES.cajero).border}` }}>{(ROLES[role] || ROLES.cajero).label.toUpperCase()}</span>
            </div>
            <button className="btn" onClick={fetchProducts}><RefreshCcw size={16} /><span>Sincronizar</span></button>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (<>
          <div className="stats-row">
            <div className="stat-card cyber-card"><div className="stat-header"><div className="stat-icon-wrap primary"><Package size={22}/></div></div><div className="stat-value text-gradient">{products.length}</div><div className="stat-label">Total de Artículos</div></div>
            <div className="stat-card cyber-card"><div className="stat-header"><div className="stat-icon-wrap success"><TrendingUp size={22}/></div></div><div className="stat-value">{totalStock}</div><div className="stat-label">Stock Global</div></div>
            <div className="stat-card cyber-card"><div className="stat-header"><div className="stat-icon-wrap" style={{ color: '#00f0ff', background: 'rgba(0,240,255,0.1)' }}><DollarSign size={22}/></div></div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCOP(totalValue)}</div><div className="stat-label">Valor del Inventario</div></div>
            <div className="stat-card cyber-card"><div className="stat-header"><div className="stat-icon-wrap danger"><AlertTriangle size={22}/></div></div><div className="stat-value">{alerts.length}</div><div className="stat-label">Stock Crítico</div></div>
          </div>
          
          <div className="dashboard-grid">
            {/* ANALYTICS CHART */}
            <div className="cyber-card">
              <div className="card-header"><span className="card-title"><Activity size={16}/><span>Análisis de Stock</span></span></div>
              <div className="card-body" style={{ height: '300px', paddingTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={products} margin={{ top: 25, right: 20, left: -20, bottom: 65 }}>
                    <defs>
                      <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.9}/><stop offset="95%" stopColor="#b026ff" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,240,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(10,10,15,0.95)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', color: '#fff', boxShadow: '0 0 15px rgba(0,240,255,0.1)' }} />
                    <Bar dataKey="quantity" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {products.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="url(#colorBrand)" />
                      ))}
                      <LabelList dataKey="quantity" position="top" fill="#ffffff" fontSize={11} fontWeight={600} style={{ textShadow: '0 0 5px rgba(0,0,0,0.5)' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* NEURAL LOGS */}
            <div className="cyber-card">
              <div className="card-header"><span className="card-title"><Activity size={16}/><span>Registros Neuronales</span></span><span style={{color:'var(--accent-cyan)'}}>{logs.length} Eventos</span></div>
              <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {logs.length === 0 ? <div className="empty-state"><Activity size={32} className="empty-icon"/><p>Esperando señales neuronales...</p></div> : 
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
              <span className="card-title"><Crosshair size={18} color="var(--accent-cyan)" /><span>Matriz de Visión Neuronal</span></span>
              <button onClick={toggleAI} className={`btn ${isAiActive ? 'btn-danger' : 'btn-primary'}`}>
                {isAiActive ? <><Square size={16}/><span>DESCONECTAR</span></> : <><Play size={16}/><span>INICIALIZAR IA</span></>}
              </button>
            </div>
            
            <div className="card-body camera-hud">
              <div className="video-wrapper hud-corners">
                <video ref={videoRef} autoPlay playsInline muted />
                <div className={`laser-beam${isAiActive ? '' : ' laser-hidden'}`} />
                <div className={`live-badge ${isAiActive ? 'processing' : 'idle'}`}>
                  <span className="dot" /><span>{isAiActive ? 'ANALIZANDO EN VIVO' : 'MODO DE ESPERA'}</span>
                </div>
              </div>
              
              <div className="detection-list">
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={16} /><span>Objetivos Detectados</span>
                </h4>

                {/* Estado 1: IA apagada — siempre en DOM, visible/oculto por CSS */}
                <div className="empty-state" style={{ display: !isAiActive ? 'flex' : 'none' }}>
                  <EyeOff size={40} className="empty-icon" />
                  <p>Sistema de visión apagado.<br/>Inicializar para escanear el área.</p>
                </div>

                {/* Estado 2: IA activa, escaneando — siempre en DOM, visible/oculto por CSS */}
                <div className="empty-state" style={{ display: (isAiActive && Object.keys(shelfState).length === 0) ? 'flex' : 'none' }}>
                  <div className="spinner-cyber"></div>
                  <p>Escaneando sectores...</p>
                </div>

                {/* Estado 3: Productos detectados — siempre en DOM, visible/oculto por CSS */}
                <div style={{ display: (isAiActive && Object.keys(shelfState).length > 0) ? 'flex' : 'none', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(shelfState).map(([name, count], idx) => (
                    <div key={name} className="detected-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="detected-img-wrap">
                          <img src={(SMART_MAPPING as any)[name]?.img || '/products/atun.png'} alt={name} />
                        </div>
                        <span className="detected-name">{name}</span>
                      </div>
                      <span className="detected-qty">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {activeTab === 'inventory' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }}>
              <button className="btn" onClick={exportToPDF}><FileText size={16}/><span>Descargar PDF</span></button>
              {can('edit_inventory') && <button className="btn btn-primary" onClick={() => setShowAddProduct(!showAddProduct)}><PackagePlus size={16}/><span>{showAddProduct ? 'Cancelar' : 'Agregar Artículo'}</span></button>}
            </div>

            {showAddProduct && (
              <div className="cyber-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header"><span className="card-title text-gradient">Registrar Nuevo Producto</span></div>
                <div className="card-body">
                  <form className="product-form-grid" onSubmit={handleAddProduct}>
                    <div><label className="form-label">Nombre</label><input className="form-input" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required/></div>
                    <div><label className="form-label">Sector</label><input className="form-input" value={newProduct.aisle} onChange={e => setNewProduct({...newProduct, aisle: e.target.value})} required/></div>
                    <div><label className="form-label">Precio (COP)</label><input className="form-input" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)||0})} required/></div>
                    <div><label className="form-label">Cantidad Inicial</label><input className="form-input" type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: parseInt(e.target.value)||0})} required/></div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>GUARDAR</button>
                  </form>
                </div>
              </div>
            )}

            <div className="cyber-card">
              <div className="card-header"><span className="card-title">Base de Datos Central</span></div>
              <div className="card-body">
                <div className={`table-header ${can('delete_product') ? 'with-delete' : ''}`}><span>Producto</span><span className="hide-mobile">Sector</span><span>Precio</span><span>Cantidad</span><span className="hide-mobile">Estado</span>{can('delete_product') && <span>Acciones</span>}</div>
                <div className="inventory-grid">
                  {products.map((p, i) => (
                    <div key={p.id} className={`product-row ${can('delete_product') ? 'with-delete' : ''} ${p.quantity <= 2 ? 'low-stock' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="product-info"><img src={(SMART_MAPPING as any)[p.name]?.img || '/products/atun.png'} className="product-img" /><div><div className="product-name">{p.name}</div><div className="product-category">ID: {p.id.slice(-6).toUpperCase()}</div></div></div>
                      <div className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{p.aisle || 'General'}</div>
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{formatCOP(p.price || 0)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {can('edit_inventory') && <button className="btn" style={{ padding: '4px', minWidth: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => updateQuantity(p.id, p.quantity - 1)}><Minus size={14}/></button>}
                        <div className="product-qty" style={{ width: '40px', justifyContent: 'center' }}>{p.quantity}</div>
                        {can('edit_inventory') && <button className="btn" style={{ padding: '4px', minWidth: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => updateQuantity(p.id, p.quantity + 1)}><Plus size={14}/></button>}
                      </div>
                      <div className="hide-mobile"><span className={`status-badge ${p.quantity > 2 ? 'healthy' : 'low'}`}><span className="status-dot"></span><span>{p.quantity > 2 ? 'OPTIMAL' : 'CRITICAL'}</span></span></div>
                      {can('delete_product') && <div><button onClick={() => handleDeleteProduct(p.id)} className="btn" style={{ padding: '6px', color:'#ff0055', borderColor:'rgba(255,0,85,0.3)' }}><Trash2 size={16} /></button></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS — Historial de Sesiones */}
        {activeTab === 'reports' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="cyber-card">
              <div className="card-header">
                <span className="card-title"><Activity size={16}/><span>Historial de Sesiones</span></span>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{sessions.length} sesiones</span>
              </div>
              <div className="card-body">
                {sessions.length === 0 ? (
                  <div className="empty-state">
                    <ClipboardList size={48} className="empty-icon" />
                    <p style={{ marginBottom: '0.5rem' }}>No hay sesiones registradas.</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Inicia el análisis IA desde la pestaña de Cámara para registrar una sesión.</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {sessions.map((s, i) => (
                      <div key={s.id} className="cyber-card" style={{ padding: '1.5rem', animationDelay: `${i * 0.1}s` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Sesión #{String(s.sessionId).slice(-4)}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.events ? s.events.length : 0} eventos detectados</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--success)' }}>Inicio: {s.startTime}</div>
                            <div style={{ fontSize: '0.82rem', color: s.endTime ? 'var(--danger)' : 'var(--accent-cyan)', marginTop: '2px' }}>Fin: {s.endTime || 'En progreso...'}</div>
                          </div>
                        </div>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gap: '0.4rem' }}>
                          {(s.events || []).slice(0, 5).map(ev => (
                            <div key={ev.id} style={{ display: 'flex', gap: '10px', fontSize: '0.84rem', color: 'var(--text-secondary)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `2px solid ${ev.type === 'in' ? 'var(--success)' : 'var(--danger)'}` }}>
                              <span style={{ color: 'var(--text-muted)', minWidth: '40px' }}>{ev.time}</span>
                              <span>{ev.msg}</span>
                            </div>
                          ))}
                          {(s.events || []).length > 5 && <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', padding: '4px 10px' }}>+ {s.events.length - 5} eventos más...</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* USERS — Solo admin */}
        {activeTab === 'users' && isAdmin && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{users.length} usuarios en {currentUser.supermercado || 'Sede Principal'}</span>
              <button className="btn btn-primary" onClick={() => setShowAddUser(!showAddUser)}><UserPlus size={16}/><span>{showAddUser ? 'Cancelar' : 'Agregar Usuario'}</span></button>
            </div>

            {showAddUser && (
              <div className="cyber-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header"><span className="card-title text-gradient">Nuevo Usuario</span></div>
                <div className="card-body">
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    if (!newUser.name || !newUser.username || !newUser.password || !newUser.supermercado) { toast.error('Completa todos los campos'); return }
                    try { await axios.post(API_USERS, newUser); setNewUser({ name: '', username: '', password: '', role: 'cajero', supermercado: currentUser.supermercado || 'Sede Principal' }); setShowAddUser(false); toast.success('Usuario creado'); fetchUsers() } catch(err) { toast.error('Error: el usuario ya existe') }
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div><label className="form-label">Nombre completo</label><input className="form-input" placeholder="Ej: Juan Pérez" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required /></div>
                      <div><label className="form-label">Usuario</label><input className="form-input" placeholder="Ej: juanp" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required /></div>
                      <div><label className="form-label">Contraseña</label><input className="form-input" type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required /></div>
                      <div><label className="form-label">Supermercado</label><input className="form-input" value={newUser.supermercado} onChange={e => setNewUser({...newUser, supermercado: e.target.value})} required /></div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Rol del Usuario</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                          {Object.entries(ROLES).map(([key, r]) => (
                            <div key={key} onClick={() => setNewUser({...newUser, role: key})}
                              style={{ padding: '0.85rem 1rem', borderRadius: '12px', border: `2px solid ${newUser.role === key ? r.color : 'rgba(255,255,255,0.06)'}`, background: newUser.role === key ? r.bg : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.4rem' }}>{r.icon}</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: newUser.role === key ? r.color : '#fff' }}>{r.label}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {key === 'admin'      && 'Acceso total al sistema'}
                                  {key === 'supervisor' && 'Ve cámara, inventario y reportes'}
                                  {key === 'inventario' && 'Gestiona productos y reportes'}
                                  {key === 'cajero'     && 'Solo dashboard y cámara IA'}
                                </div>
                              </div>
                              {newUser.role === key && <span style={{ marginLeft: 'auto', color: r.color, fontSize: '1.1rem' }}>✓</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary"><UserPlus size={16}/><span>Crear Usuario</span></button>
                  </form>
                </div>
              </div>
            )}

            <div className="cyber-card">
              <div className="card-header"><span className="card-title">Usuarios del Sistema</span></div>
              <div className="card-body">
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {users.map((u, i) => (
                    <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', alignItems: 'center', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid transparent', transition: 'all 0.2s', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', background: (ROLES[u.role] || ROLES.cajero).bg, border: `2px solid ${(ROLES[u.role] || ROLES.cajero).border}`, color: (ROLES[u.role] || ROLES.cajero).color }}>{u.name.charAt(0)}</div>
                        <div><div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{u.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div></div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><Store size={12} style={{marginRight:'4px', verticalAlign:'middle'}}/>{u.supermercado || 'Sede Principal'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CO') : '—'}</div>
                      <div><span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: (ROLES[u.role] || ROLES.cajero).bg, color: (ROLES[u.role] || ROLES.cajero).color, border: `1px solid ${(ROLES[u.role] || ROLES.cajero).border}` }}><span>{(ROLES[u.role] || ROLES.cajero).icon}</span><span>{(ROLES[u.role] || ROLES.cajero).label}</span></span></div>
                      <div>{u.role !== 'admin' && <button onClick={async () => { if (!window.confirm('¿Eliminar?')) return; try { await axios.delete(`${API_USERS}/${u.id}`); toast.success('Eliminado'); fetchUsers() } catch(e){ toast.error('Error') }}} style={{ background: 'rgba(255,0,85,0.1)', color: '#ff0055', border: '1px solid rgba(255,0,85,0.3)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={14}/></button>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHAT */}
        {activeTab === 'chat' && (
          <div className="chat-container" style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="chat-sidebar">
              <h3 style={{ padding: '10px', color: '#fff', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>Contactos</h3>
              <div className={`chat-contact ${chatTarget === 'general' ? 'active' : ''}`} onClick={() => setChatTarget('general')}>
                <MessageSquare size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }}/>
                Canal General
              </div>
              <div style={{ marginTop: '10px', padding: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>USUARIOS</div>
              {users.filter(u => u.id !== currentUser.id).map(u => (
                <div key={u.id} className={`chat-contact ${chatTarget === u.id ? 'active' : ''}`} onClick={() => setChatTarget(String(u.id))}>
                  <Users size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }}/>
                  {u.name}
                </div>
              ))}
            </div>
            
            <div className="chat-main">
              <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold', color: '#fff' }}>
                {chatTarget === 'general' ? 'Canal General' : users.find(u => String(u.id) === chatTarget)?.name || 'Cargando...'}
              </div>
              
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty-state" style={{ margin: 'auto' }}>
                    <MessageSquare size={32} className="empty-icon"/>
                    <p>No hay mensajes en este chat.</p>
                  </div>
                ) : (
                  messages.map(m => {
                    const isMine = m.senderId === String(currentUser.id);
                    return (
                      <div key={m.id} className={`chat-bubble ${isMine ? 'sent' : 'received'}`}>
                        {!isMine && chatTarget === 'general' && <div className="chat-bubble-name">{m.senderName}</div>}
                        <div style={{ wordBreak: 'break-word' }}>{m.content}</div>
                        <div className="chat-bubble-time">{m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="Escribe un mensaje neurálgico..." 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 15px', borderRadius: '50%' }}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}


      </main>
    </div>
  )
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getSession())
  if (!currentUser) return <LoginScreen onLogin={u => setCurrentUser(u)} />
  return <Dashboard currentUser={currentUser} onLogout={() => { clearSession(); setCurrentUser(null); toast.success('Desconectado') }} />
}
