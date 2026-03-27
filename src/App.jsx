import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
  const [productos, setProductos] = useState([])
  const [nombre, setNombre] = useState('')
  const [pasillo, setPasillo] = useState('')
  const [cargandoIA, setCargandoIA] = useState(false)

  // --- CONFIGURACIÓN DE LINKS ---
  // Backend de Java en Railway (MongoDB)
  const API_JAVA = 'https://supermercadobackendd-production.up.railway.app/api/productos'
  
  // URL de tu Inteligencia Artificial en RENDER 🚀
  const API_IA_PYTHON = 'https://supermercado-ia-f7bm.onrender.com/detectar' 

  // 1. Leer productos (Desde Java -> Atlas)
  const obtenerProductos = () => {
    axios.get(API_JAVA)
      .then(res => setProductos(res.data))
      .catch(err => console.error("Error al obtener de la nube:", err))
  }

  useEffect(() => { obtenerProductos() }, [])

  // 2. Detectar con YOLOv8 (Desde Render Cloud)
  const detectarConIA = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)
    
    setCargandoIA(true)
    try {
      const resIA = await axios.post(API_IA_PYTHON, formData)
      const productoIA = resIA.data.producto
      
      if (productoIA !== "unknown") {
        setNombre(productoIA) 
        setPasillo("Por clasificar")
      } else {
        alert("La IA no reconoció el objeto")
      }
    } catch (err) {
      console.error("Error con la IA:", err)
      alert("La IA está despertando o hubo un error. Por favor, intenta de nuevo en 30 segundos.")
    } finally {
      setCargandoIA(false)
    }
  }

  // 3. Crear producto (POST a Java en Railway)
  const guardarProducto = (e) => {
    e.preventDefault()
    if (!nombre || !pasillo) return alert("Por favor llena ambos campos")
    
    axios.post(API_JAVA, { nombre, pasillo })
      .then(() => {
        setNombre(''); setPasillo('')
        obtenerProductos() // Refresca la lista automáticamente
      })
      .catch(err => console.error("Error al guardar en la nube:", err))
  }

  // 4. Eliminar producto (DELETE a Java en Railway)
  const eliminarProducto = (id) => {
    if (window.confirm("¿Estás seguro de eliminar este producto de la nube?")) {
      axios.delete(`${API_JAVA}/${id}`)
        .then(() => obtenerProductos())
        .catch(err => console.error("Error al eliminar:", err))
    }
  }

  return (
    <div style={{ padding: '20px', color: 'white', backgroundColor: '#242424', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#4CAF50' }}>🛒 Supermercado Cloud + IA 🤖</h1>
        <p>Panel de Administración UCC (Vercel + Railway + Render)</p>
      </header>
      
      {/* SECCIÓN DE IA */}
      <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #4CAF50', maxWidth: '600px', margin: '0 auto 20px auto' }}>
        <h3>Escanear Estante con YOLOv8</h3>
        <p style={{ fontSize: '0.8em', color: '#aaa' }}>La imagen se procesará en la nube de Render</p>
        <input type="file" accept="image/*" onChange={detectarConIA} />
        {cargandoIA && <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>Analizando imagen con Inteligencia Artificial...</p>}
      </div>

      {/* FORMULARIO DE GUARDADO */}
      <form onSubmit={guardarProducto} style={{ marginBottom: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <input 
          placeholder="Nombre detectado" 
          value={nombre} 
          onChange={e => setNombre(e.target.value)} 
          style={{ padding: '12px', borderRadius: '4px', border: 'none', width: '200px' }}
        />
        <input 
          placeholder="Asignar Pasillo" 
          value={pasillo} 
          onChange={e => setPasillo(e.target.value)} 
          style={{ padding: '12px', borderRadius: '4px', border: 'none', width: '150px' }}
        />
        <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Confirmar y Guardar
        </button>
      </form>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2>📦 Inventario en Nube (Atlas)</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {productos.length === 0 && <p>Cargando productos o inventario vacío...</p>}
          {productos.map(p => (
            <li key={p.id} style={{ backgroundColor: '#333', margin: '10px 0', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '5px solid #4CAF50' }}>
              <span>
                <strong style={{ color: '#4CAF50', fontSize: '1.2em' }}>{p.nombre}</strong> 
                <br />
                <span style={{ color: '#ccc', fontSize: '0.9em' }}>📍 Pasillo: {p.pasillo}</span>
              </span>
              <button onClick={() => eliminarProducto(p.id)} style={{ backgroundColor: '#ff4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}>Eliminar</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App
