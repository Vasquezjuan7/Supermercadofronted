import { useEffect, useState } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { LayoutDashboard, ShoppingBasket, ScanFace, Trash2, MapPin } from 'lucide-react'

function App() {
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [aisle, setAisle] = useState('Aisle 1')
  const [loadingIA, setLoadingIA] = useState(false)
  const [aisleFilter, setAisleFilter] = useState('All')

  // --- URLS ACTUALIZADAS ---
  const API_JAVA = 'https://supermercadobackendd-production.up.railway.app/api/products'
  const API_IA_PYTHON = 'https://supermercado-ia-f7bm.onrender.com/detectar' 

  const fetchProducts = () => {
    axios.get(API_JAVA)
      .then(res => setProducts(res.data))
      .catch(err => toast.error("Error connecting to database"))
  }

  useEffect(() => { fetchProducts() }, [])

  const detectWithIA = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)
    
    setLoadingIA(true)
    const loadToast = toast.loading("Analyzing image...")
    
    try {
      const resIA = await axios.post(API_IA_PYTHON, formData)
      // La IA devuelve "producto" en el JSON, lo pasamos a nuestro estado "name"
      const productFound = resIA.data.producto 
      
      if (productFound && productFound !== "unknown") {
        setName(productFound)
        toast.success(`Detected: ${productFound}`, { id: loadToast })
      } else {
        toast.error("Object not recognized", { id: loadToast })
      }
    } catch (err) {
      toast.error("IA Server is starting. Try again in 20s.", { id: loadToast })
    } finally {
      setLoadingIA(false)
    }
  }

  const saveProduct = (e) => {
    e.preventDefault()
    if (!name || !aisle) return toast.error("Please fill all fields")
    
    // IMPORTANTE: Los nombres 'name' y 'aisle' deben coincidir con tu clase Product.java
    axios.post(API_JAVA, { name, aisle })
      .then(() => {
        setName(''); 
        fetchProducts()
        toast.success("Product saved successfully")
      })
      .catch(() => toast.error("Error saving to cloud"))
  }

  const deleteProduct = (id) => {
    axios.delete(`${API_JAVA}/${id}`)
      .then(() => {
        fetchProducts()
        toast.success("Product removed")
      })
      .catch(() => toast.error("Delete failed"))
  }

  const filteredItems = aisleFilter === 'All' 
    ? products 
    : products.filter(p => p.aisle === aisleFilter)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Toaster position="top-right" />
      
      {/* SIDEBAR */}
      <nav style={{ width: '280px', backgroundColor: '#0f172a', color: 'white', padding: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981', marginBottom: '32px' }}>
          <ShoppingBasket size={28} /> UCC Market AI
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setAisleFilter('All')} style={navBtnStyle}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setAisleFilter('Aisle 1')} style={navBtnStyle}>
            <MapPin size={20} /> Aisle 1 (Dairy)
          </button>
          <button onClick={() => setAisleFilter('Aisle 2')} style={navBtnStyle}>
            <MapPin size={20} /> Aisle 2 (Grains)
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Inventory Management</h1>
          <div style={{ display: 'flex', gap: '16px' }}>
             <div style={cardStat}><strong>{products.length}</strong> <span>Total Items</span></div>
          </div>
        </div>

        {/* AI SCANNER */}
        <section style={glassCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ScanFace color="#10b981"/> AI Smart Scan</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Upload a photo to detect products automatically</p>
            </div>
            <input type="file" accept="image/*" onChange={detectWithIA} id="ia-upload" style={{ display: 'none' }} />
            <label htmlFor="ia-upload" style={primaryBtn}>Start Scanning</label>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* FORM */}
          <div style={whiteCard}>
            <h4 style={{ marginBottom: '20px' }}>Add New Product</h4>
            <form onSubmit={saveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                placeholder="Product Name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                style={inputStyle} 
              />
              <select value={aisle} onChange={e => setAisle(e.target.value)} style={inputStyle}>
                <option>Aisle 1</option>
                <option>Aisle 2</option>
                <option>Aisle 3</option>
              </select>
              <button type="submit" style={successBtn}>Add to Stock</button>
            </form>
          </div>

          {/* TABLE */}
          <div style={whiteCard}>
            <h4 style={{ marginBottom: '20px' }}>Current Inventory: {aisleFilter}</h4>
            {filteredItems.map(p => (
              <div key={p.id} style={itemRow}>
                <div>
                  <div style={{ fontWeight: '600' }}>{p.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.aisle}</div>
                </div>
                <button onClick={() => deleteProduct(p.id)} style={deleteBtn}><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// ESTILOS
const navBtnStyle = { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', transition: '0.2s', textAlign: 'left' }
const cardStat = { backgroundColor: 'white', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }
const glassCard = { background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }
const whiteCard = { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }
const primaryBtn = { padding: '12px 24px', backgroundColor: '#0f172a', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }
const successBtn = { padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
const itemRow = { display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #f1f5f9' }
const deleteBtn = { color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }

export default App
