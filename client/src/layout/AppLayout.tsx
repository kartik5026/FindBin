import { Link, NavLink, Outlet } from 'react-router-dom'
import '../App.css'

export function AppLayout() {
  return (
    <div className="app">
      <header className="topbar topbarForest">
        <div className="brand">
          <Link to="/" className="brandLink">
            <div className="brandTitle">FindBin</div>
            <div className="brandSub">Himachal • cleaner trails, greener towns</div>
          </Link>
        </div>
        <nav className="tabs">
          <NavLink to="/" className={({ isActive }) => `tabBtn smallBtn ${isActive ? 'tabBtnActive' : 'ghostBtn'}`}>
            User
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => `tabBtn smallBtn ${isActive ? 'tabBtnActive' : 'ghostBtn'}`}>
            Admin
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}


