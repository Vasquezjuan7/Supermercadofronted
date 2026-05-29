const fs = require('fs');

let css = fs.readFileSync('src/App.css', 'utf8');
css = css.replace('--sidebar-width: 78px;', '--sidebar-width: 240px;');

const sidebarCss = /* ── Sidebar ───────────────────────────────────────── */
.sidebar {
  position: fixed;
  left: 0; top: 0; bottom: 0;
  width: var(--sidebar-width);
  background: linear-gradient(180deg, #0d1425 0%, #0a0f1a 100%);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  gap: 0.5rem;
  z-index: 100;
  backdrop-filter: blur(20px);
}

.sidebar-logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 2rem;
  padding: 0 0.5rem;
}

.sidebar-logo {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
  transition: var(--transition-smooth);
}
.sidebar-logo:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 30px rgba(99, 102, 241, 0.5);
}

.logo-text {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-item {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 1.2rem;
  gap: 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-fast);
  position: relative;
  color: var(--text-muted);
}
.nav-item:hover {
  background: rgba(99, 102, 241, 0.08);
  color: var(--accent-light);
  transform: translateX(4px);
}
.nav-item.active {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%);
  color: var(--accent);
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10%;
  width: 4px;
  height: 80%;
  background: var(--accent);
  border-radius: 0 4px 4px 0;
  box-shadow: 0 0 10px var(--accent-glow);
}

.nav-label {
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.sidebar-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
};

css = css.replace(/\/\* ── Sidebar[\s\S]*?\.sidebar-bottom \{[\s\S]*?\}/, sidebarCss);
fs.writeFileSync('src/App.css', css);

let jsx = fs.readFileSync('src/App.jsx', 'utf8');
const sidebarJsx = {/* SIDEBAR */}
      <nav className="sidebar no-print">
        <div className="sidebar-logo-container">
          <div className="sidebar-logo"><ScanFace size={22} color="white" /></div>
          <span className="logo-text">Vision Pro</span>
        </div>
        {navItems.map(item => (
          <div key={item.id} className={\
av-item \\} onClick={() => setActiveTab(item.id)} title={item.label}>
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
      </nav>;

jsx = jsx.replace(/\{\/\* SIDEBAR \*\/\}[\s\S]*?<\/nav>/, sidebarJsx);
fs.writeFileSync('src/App.jsx', jsx);
console.log('Done');
