import { useEffect, useState } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { LayoutDashboard, ShoppingBasket, ScanFace, Trash2, Package, MapPin } from 'lucide-react'

function App() {
  const [productos, setProductos] = useState([])
  const [nombre, setNombre] = useState('')
  const [pasillo, setPasillo] = useState('Pasillo 1')
  const [cargandoIA, setCargandoIA] = useState(false)
  const [filtroPasillo, setFiltroPasillo] = useState('Todos')

  const API_JAVA = 'https://supermercadobackendd-production.up.railway.app/api/productos'
  const API_IA_PYTHON = 'https://supermercado-ia-f7bm.onrender.com/detectar' 

  const obtenerProductos = () => {
    axios.get(API_JAVA)
      .then(res => setProductos(res.data))
      .catch(err => toast.error("Error al conectar con la base de datos"))
  }

  useEffect(() => { obtenerProductos() }, [])

  const detectarConIA = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)
    
    setCargandoIA(true)
    const loadToast = toast.loading("Analizando con YOLOv8...")
    
    try {
      const resIA = await axios.post(API_IA_PYTHON, formData)
      const productoIA = resIA.data.producto
      
      if (productoIA !== "unknown") {
        setNombre(productoIA)
        toast.success(`¡Detectado: ${productoIA}!`, { id: loadToast })
      } else {
        toast.error("Objeto no reconocido", { id: loadToast })
      }
    } catch (err) {
      toast.error("La IA tardó en responder. Intenta de nuevo.", { id: loadToast })
    } finally {
      setCargandoIA(false)
    }
  }

  const guardarProducto = (e) => {
    e.preventDefault()
    if (!nombre || !pasillo) return toast.error("Completa los campos")
    
    axios.post(API_JAVA, { nombre, pasillo })
      .then(() => {
        setNombre(''); 
        obtenerProductos()
        toast.success("Producto guardado en la nube")
      })
      .catch(() => toast.error("Error al guardar"))
  }

  const eliminarProducto = (id) => {
    axios.delete(`${API_JAVA}/${id}`)
      .then(() => {
        obtenerProductos()
        toast.success("Producto eliminado")
      })
      .catch(() => toast.error("No se pudo eliminar"))
  }

  const productosFiltrados = filtroPasillo === 'Todos' 
    ? productos 
    : productos.filter(p => p.pasillo === filtroPasillo)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f7f6', color: '#333', fontFamily: 'Segoe UI, sans-serif' }}>
      <Toaster position="top-right" />
      
      {/* --- SIDEBAR --- */}
      <nav style={{ width: '260px', backgroundColor: '#1a1a2e', color: 'white', padding: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2em', color: '#4CAF50' }}>
          <ShoppingBasket /> UCC Market
        </h2>
        <hr style={{ opacity: 0.1, margin: '20px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button onClick={() => setFiltroPasillo('Todos')} style={navBtnStyle}><LayoutDashboard size={18} /> General</button>
          <button onClick={() => setFiltroPasillo('Pasillo 1')} style={navBtnStyle}><MapPin size={18} /> Pasillo 1 (Lácteos)</button>
          <button onClick={() => setFiltroPasillo('Pasillo 2')} style={navBtnStyle}><MapPin size={18} /> Pasillo 2 (Granos)</button>
          <button onClick={() => setFiltroPasillo('Pasillo 3')} style={navBtnStyle}><MapPin size={18} /> Pasillo 3 (Aseo)</button>
        </div>
      </nav>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <h1>Dashboard de Inventario</h1>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={statCardStyle}><strong>{productos.length}</strong> <p>Productos</p></div>
            <div style={{ ...statCardStyle, borderLeftColor: '#4CAF50' }}><strong>{filtroPasillo}</strong> <p>Filtro Actual</p></div>
          </div>
        </header>

        {/* SECCIÓN IA */}
        <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ScanFace color="#4CAF50" /> Escaneo de Gondola Inteligente
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <input type="file" accept="image/*" onChange={detectarConIA} id="fileIA" style={{ display: 'none' }} />
             <label htmlFor="fileIA" style={uploadBtnStyle}>Subir Foto para Analizar</label>
             {cargandoIA && <span className="loader"></span>}
          </div>
        </section>

        {/* FORMULARIO Y TABLA */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          <div style={cardStyle}>
            <h4>Registrar Producto</h4>
            <form onSubmit={guardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
              <select value={pasillo} onChange={e => setPasillo(e.target.value)} style={inputStyle}>
                <option>Pasillo 1</option>
                <option>Pasillo 2</option>
                <option>Pasillo 3</option>
              </select>
              <button type="submit" style={saveBtnStyle}>Confirmar Stock</button>
            </form>
          </div>

          <div style={cardStyle}>
            <h4>Listado en Tiempo Real ({filtroPasillo})</h4>
            <div style={{ marginTop: '15px' }}>
              {productosFiltrados.map(p => (
                <div key={p.id} style={itemStyle}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{p.nombre}</span>
                    <p style={{ fontSize: '0.8em', color: '#888' }}>{p.pasillo}</p>
                  </div>
                  <button onClick={() => eliminarProducto(p.id)} style={delBtnStyle}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// --- ESTILOS ---
const navBtnStyle = { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', backgroundColor: 'transparent', border: 'none', color: '#aab', cursor: 'pointer', textAlign: 'left', borderRadius: '8px', transition: '0.3s' }
const statCardStyle = { backgroundColor: 'white', padding: '15px 25px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #1a1a2e' }
const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }
const inputStyle = { padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }
const saveBtnStyle = { padding: '12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
const uploadBtnStyle = { padding: '10px 20px', backgroundColor: '#1a1a2e', color: 'white', borderRadius: '6px', cursor: 'pointer' }
const itemStyle = { display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee' }
const delBtnStyle = { color: '#ff4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }

export default App
