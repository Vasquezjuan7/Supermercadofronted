import { useEffect, useState } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { LayoutDashboard, ShoppingBasket, ScanFace, Trash2, MapPin, Package } from 'lucide-react'

function App() {
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [aisle, setAisle] = useState('Aisle 1')
  const [loadingIA, setLoadingIA] = useState(false)
  const [aisleFilter, setAisleFilter] = useState('All')

  // --- URLS ACTUALIZADAS (Asegúrate de que sean las tuyas) ---
  const API_JAVA = 'https://supermercadobackendd-production.up.railway.app/api/products'
  const API_IA_PYTHON = 'https://supermercado-ia-f7bm.onrender.com/detect' 

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
    const loadToast = toast.loading("Analyzing image with YOLOv8...")
    
    try {
      const resIA = await axios.post(API_IA_PYTHON, formData)
      
      // CAMBIO CLAVE: Ahora leemos "product" en lugar de "producto"
      const productFound = resIA.data.product 
      
      if (productFound && productFound !== "unknown") {
        setName(productFound)
        toast.success(`Detected: ${productFound}`, { id: loadToast })
      } else {
        toast.error("Object not recognized", { id: loadToast })
      }
    } catch (err) {
      toast.error("IA Server is waking up. Please try again.", { id: loadToast })
    } finally {
      setLoadingIA(false)
    }
  }

  const saveProduct = (e) => {
    e.preventDefault()
    if (!name || !aisle) return toast.error("Please fill all fields")
    
    axios.post(API_JAVA, { name, aisle })
      .then(() => {
        setName(''); 
        fetchProducts()
        toast.success("Product saved to MongoDB Atlas")
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
          <button onClick={() => setAisleFilter('All')} style={{...navBtnStyle, backgroundColor: aisleFilter==='All' ? '#1e293b' : 'transparent'}}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setAisleFilter('Aisle 1')} style={{...navBtnStyle, backgroundColor: aisleFilter==='Aisle 1' ? '#1e293b' : 'transparent'}}>
            <MapPin size={20} /> Aisle 1 (Dairy)
          </button>
          <button onClick={() => setAisleFilter('Aisle 2')} style={{...navBtnStyle, backgroundColor: aisleFilter==='Aisle 2' ? '#1e293b' : 'transparent'}}>
            <MapPin size={20} /> Aisle 2 (Grains)
          </button>
          <button onClick={() => setAisleFilter('Aisle 3')} style={{...navBtnStyle, backgroundColor: aisleFilter==='Aisle 3' ? '#1e293b' : 'transparent'}}>
            <Package size={20} /> Aisle 3 (Cleaning)
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Inventory Management</h1>
          <div style={{ display: 'flex', gap: '16px' }}>
             <div style={cardStat}>
                <span style={{color: '#64748b', fontSize: '0.8rem', fontWeight: '600'}}>TOTAL STOCK</span>
                <strong style={{fontSize: '1.5rem'}}>{products.length}</strong>
             </div>
          </div>
        </div>

        {/* AI SCANNER */}
        <section style={glassCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><ScanFace color="#10b981"/> AI Smart Scan</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Upload a photo to detect products automatically</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                {loadingIA && <div className="spinner"></div>}
                <input type="file" accept="image/*" onChange={detectWithIA} id="ia-upload" style={{ display: 'none' }} />
                <label htmlFor="ia-upload" style={primaryBtn}>Start Scanning</label>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* FORM */}
          <div style={whiteCard}>
            <h4 style={{ marginBottom: '20px' }}>Register Product</h4>
            <form onSubmit={saveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                <label style={{fontSize: '0.8rem', fontWeight: '600', color: '#64748b'}}>NAME</label>
                <input placeholder="Ex: Milk, Soda..." value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                <label style={{fontSize: '0.8rem', fontWeight: '600', color: '#64748b'}}>LOCATION</label>
                <select value={aisle} onChange={e => setAisle(e.target.value)} style={inputStyle}>
                    <option>Aisle 1</option>
                    <option>Aisle 2</option>
                    <option>Aisle 3</option>
                </select>
              </div>
              <button type="submit" style={successBtn}>Confirm & Save</button>
            </form>
          </div>

          {/* TABLE */}
          <div style={whiteCard}>
            <h4 style={{ marginBottom: '20px' }}>Inventory List: <span style={{color: '#10b981'}}>{aisleFilter}</span></h4>
            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                {filteredItems.length > 0 ? filteredItems.map(p => (
                <div key={p.id} style={itemRow}>
                    <div>
                    <div style={{ fontWeight: '600' }}>{p.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.aisle}</div>
                    </div>
                    <button onClick={() => deleteProduct(p.id)} style={deleteBtn}><Trash2 size={18}/></button>
                </div>
                )) : <p style={{textAlign: 'center', color: '#94a3b8', marginTop: '20px'}}>No products found in this aisle.</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ESTILOS (Mejorados)
const navBtnStyle = { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '8px', transition: '0.2s', textAlign: 'left' }
const cardStat = { backgroundColor: 'white', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minWidth: '150px' }
const glassCard = { background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }
const whiteCard = { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }
const primaryBtn = { padding: '12px 24px', backgroundColor: '#0f172a', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: '0.3s' }
const successBtn = { padding: '14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }
const itemRow = { display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }
const deleteBtn = { color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', transition: '0.2s' }

export default App
