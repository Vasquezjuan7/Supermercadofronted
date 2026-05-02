import { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import {
  ShoppingBasket, ScanFace, Package,
  Loader2, RefreshCcw, LayoutDashboard,
  ClipboardList, Bell, Settings, BarChart3,
  CheckCircle2, AlertCircle, Info, Download,
  Volume2, VolumeX, Printer, Image as ImageIcon, Zap
} from 'lucide-react'

const API_BASE = 'https://supermercadobackendd-production-17e4.up.railway.app/api/products'
const API_IA = 'http://127.0.0.1:8080/detect_all' // <-- AHORA USA TU IA LOCAL ENTRENADA

// Sonidos (URLs de confianza)
const SOUND_IN = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'; // Beep
const SOUND_OUT = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'; // Soft alert

const SMART_MAPPING = {
  "Atun": { name: "Atun", img: "https://images.unsplash.com/photo-1621360841013-c7683c659ec6?w=100&h=100&fit=crop" },
  "Deo Pies": { name: "Deo Pies", img: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=100&h=100&fit=crop" },
  "Maiz en lata": { name: "Maiz en lata", img: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=100&h=100&fit=crop" }
}

export default function App() {
  const [products, setProducts] = useState([])
  const [loadingIA, setLoadingIA] = useState(false)
  const [shelfState, setShelfState] = useState({})
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [soundEnabled, setSoundEnabled] = useState(true)

  const videoRef = useRef(null)
  const isProcessing = useRef(false)
  const lastActionTime = useRef({})

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get(API_BASE);
      setProducts(res.data);
    } catch (err) { console.error("DB Error"); }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    if (activeTab === 'dashboard') setupCamera();
  }, [activeTab])

  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) { console.error("Camera error") }
  }

  const playSound = (url) => {
    if (!soundEnabled) return;
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play().catch(() => { });
  }

  const addLog = (msg, type) => {
    const icons = { in: <CheckCircle2 className="text-emerald-400" size={14} />, out: <AlertCircle className="text-rose-400" size={14} />, info: <Info className="text-amber-400" size={14} /> };
    const newLog = { id: Date.now(), msg, type, icon: icons[type], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setLogs(prev => [newLog, ...prev].slice(0, 10));
    playSound(type === 'in' ? SOUND_IN : SOUND_OUT);
  }

  const processShelfChanges = async (detectedList) => {
    const currentCount = {};
    detectedList.forEach(item => {
      const mapping = SMART_MAPPING[item] || { name: item };
      currentCount[mapping.name] = (currentCount[mapping.name] || 0) + 1;
    });

    const allProductKeys = new Set([...Object.keys(shelfState), ...Object.keys(currentCount)]);
    for (const name of allProductKeys) {
      const prev = shelfState[name] || 0;
      const curr = currentCount[name] || 0;
      const diff = curr - prev;

      if (diff !== 0) {
        const now = Date.now();
        // Reducido a 1 segundo para sensación de tiempo real inmediato
        if (lastActionTime.current[name] && (now - lastActionTime.current[name] < 1000)) continue;
        lastActionTime.current[name] = now;

        // 1. SIEMPRE registrar en el historial y hacer sonido (Feedback inmediato)
        addLog(`AI: ${diff > 0 ? 'Detectó' : 'Dejó de ver'} ${name} (${diff > 0 ? '+' : ''}${diff})`, diff > 0 ? 'info' : 'out');

        // 2. Intentar actualizar la base de datos
        const productInDb = products.find(p => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase()));

        if (productInDb) {
          const newQty = Math.max(0, productInDb.quantity + diff);
          try {
            await axios.put(`${API_BASE}/${productInDb.id}/stock`, null, { params: { quantity: newQty } });
            addLog(`Base de Datos: Stock de ${name} actualizado a ${newQty}`, 'in');
          } catch (error) {
            console.error("Error actualizando DB:", error);
            toast.error(`No se pudo guardar el stock de ${name} en la nube.`);
          }
        } else {
          toast.error(`${name} no existe en tu base de datos.`);
        }
      }
    }
    setShelfState(currentCount);
    fetchProducts();
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || isProcessing.current || activeTab !== 'dashboard') return;
    isProcessing.current = true; setLoadingIA(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480; canvas.height = 360;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0, 480, 360);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.6));
      const formData = new FormData();
      formData.append('image', blob, 'shelf.jpg');
      const response = await fetch(API_IA, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.products) await processShelfChanges(data.products);
    } catch (err) { } finally { setLoadingIA(false); isProcessing.current = false; }
  };

  useEffect(() => {
    // 🚀 MODO FULL TIEMPO REAL: Escanea cada 800ms
    const interval = setInterval(captureAndDetect, 800)
    return () => clearInterval(interval)
  }, [captureAndDetect, products, shelfState, activeTab])

  const alerts = products.filter(p => p.quantity <= 2);

  const printReport = () => { window.print(); }

  return (
    <div className="pro-container">
      <Toaster position="top-right" />

      <style>{`
        body { background: #0b0f1a; margin: 0; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; }
        .pro-container { display: flex; min-height: 100vh; }
        .sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: 80px; background: #131b2e; display: flex; flex-direction: column; align-items: center; padding: 2rem 0; gap: 2rem; z-index: 100; }
        .main-content { flex: 1; padding: 2rem; margin-left: 80px; width: calc(100% - 80px); }
        .card { background: rgba(23, 30, 48, 0.6); border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.05); }
        
        .bar-container { height: 150px; display: flex; align-items: flex-end; gap: 1rem; padding: 1rem; }
        .bar { width: 40px; background: #6366f1; border-radius: 8px 8px 0 0; position: relative; transition: height 0.5s ease; }
        .bar:hover { background: #818cf8; }
        .bar-label { position: absolute; bottom: -25px; left: 0; font-size: 10px; width: 100%; text-align: center; color: #64748b; }

        @media print { .sidebar, .top-actions, .no-print { display: none !important; } .main-content { margin: 0; width: 100%; } .card { border: 1px solid #ddd; background: #fff !important; color: #000 !important; } }
        @media (max-width: 768px) { .sidebar { width: 100%; height: 70px; top: auto; flex-direction: row; } .main-content { margin-left: 0; width: 100%; padding-bottom: 90px; } }
      `}</style>

      {/* Sidebar */}
      <div className="sidebar no-print">
        <div style={{ background: '#6366f1', padding: '10px', borderRadius: '12px', marginBottom: '1rem' }}><ShoppingBasket size={24} color="white" /></div>
        <LayoutDashboard onClick={() => setActiveTab('dashboard')} color={activeTab === 'dashboard' ? '#6366f1' : '#475569'} style={{ cursor: 'pointer' }} size={24} />
        <ClipboardList onClick={() => setActiveTab('inventory')} color={activeTab === 'inventory' ? '#6366f1' : '#475569'} style={{ cursor: 'pointer' }} size={24} />
        <BarChart3 onClick={() => setActiveTab('analytics')} color={activeTab === 'analytics' ? '#6366f1' : '#475569'} style={{ cursor: 'pointer' }} size={24} />
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          {soundEnabled ? <Volume2 onClick={() => setSoundEnabled(false)} color="#475569" style={{ cursor: 'pointer' }} size={20} /> : <VolumeX onClick={() => setSoundEnabled(true)} color="#ef4444" style={{ cursor: 'pointer' }} size={20} />}
          <Settings onClick={() => setActiveTab('settings')} color={activeTab === 'settings' ? '#6366f1' : '#475569'} style={{ cursor: 'pointer' }} size={24} />
        </div>
      </div>

      {/* Main Area */}
      <div className="main-content">
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, textTransform: 'capitalize' }}>{activeTab}</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>UCC Vision Pro • Intelligent Inventory</p>
          </div>
          <div className="top-actions" style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={printReport} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.6rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Printer size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* VISTA: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div className="card" style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold', fontSize: '0.8rem', color: '#94a3b8' }}>LIVE STREAM</div>
              <div style={{ flex: 1, margin: '1rem', borderRadius: '1rem', background: '#000', overflow: 'hidden', position: 'relative' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 0, width: '100%', height: '2px', background: '#6366f1', boxShadow: '0 0 15px #6366f1', animation: 'scan 4s linear infinite' }}></div>
              </div>
            </div>
            <div className="card" style={{ flex: '1 1 300px', padding: '1rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>RECENT ACTIVITY</div>
              {logs.map(log => (
                <div key={log.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                  {log.icon} <span>{log.msg}</span> <span style={{ marginLeft: 'auto', opacity: 0.3, fontSize: '0.7rem' }}>{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA: INVENTORY (CON IMÁGENES) */}
        {activeTab === 'inventory' && (
          <div className="card" style={{ padding: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.8rem', borderBottom: '1px solid #334155' }}><th style={{ padding: '1rem' }}>PRODUCT</th><th style={{ padding: '1rem' }}>LOCATION</th><th style={{ padding: '1rem' }}>QUANTITY</th><th style={{ padding: '1rem' }}>STATUS</th></tr></thead>
              <tbody>{products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={SMART_MAPPING[p.name]?.img || "https://via.placeholder.com/40"} style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'crop' }} />
                    <b>{p.name}</b>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{p.aisle}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{p.quantity} units</td>
                  <td style={{ padding: '1rem' }}><span style={{ background: p.quantity > 2 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: p.quantity > 2 ? '#10b981' : '#ef4444', padding: '0.3rem 0.8rem', borderRadius: '10px', fontSize: '0.7rem' }}>{p.quantity > 2 ? 'HEALTHY' : 'LOW STOCK'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* VISTA: ANALYTICS (NUEVA) */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Stock Distribution</h3>
              <div className="bar-container">
                {products.map(p => (
                  <div key={p.id} className="bar" style={{ height: `${(p.quantity / 20) * 100}%` }}>
                    <div className="bar-label">{p.name.slice(0, 4)}</div>
                    <div style={{ position: 'absolute', top: -20, width: '100%', textAlign: 'center', fontSize: '10px' }}>{p.quantity}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2rem' }}>Real-time units comparison per category.</p>
            </div>
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <Zap size={48} color="#6366f1" />
              <h2 style={{ margin: '1rem 0 0.5rem 0' }}>{products.length}</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Products Monitored</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}