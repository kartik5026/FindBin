import { Link, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../App.css'

export function AppLayout() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="app forestShell">
      <div className="forestBackdrop" aria-hidden="true" />

      <header className="topbar topbarForest">
        <div className="brand">
          <Link to="/" className="brandLink">
            <div className="brandTitle">FindBin</div>
            <div className="brandSub">Himachal • cleaner trails, greener towns</div>
          </Link>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {!isAdmin ? (
            <Link className="adminIconBtn" to="/admin" aria-label="Admin">
              <span className="adminIconDot" aria-hidden="true" />
              <span className="adminIconGlyph" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M19.4 15a8.4 8.4 0 0 0 .1-2 8.4 8.4 0 0 0-.1-2l2-1.6-2-3.4-2.4 1a8.3 8.3 0 0 0-3.4-2l-.4-2.6H11l-.4 2.6a8.3 8.3 0 0 0-3.4 2l-2.4-1-2 3.4 2 1.6a8.4 8.4 0 0 0-.1 2c0 .7 0 1.3.1 2l-2 1.6 2 3.4 2.4-1a8.3 8.3 0 0 0 3.4 2l.4 2.6h4l.4-2.6a8.3 8.3 0 0 0 3.4-2l2.4 1 2-3.4-2-1.6Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          ) : (
            <Link className="adminIconBtn" to="/" aria-label="Back to user">
              <span className="adminIconDot" aria-hidden="true" />
              <span className="adminIconGlyph" aria-hidden="true">
                ←
              </span>
            </Link>
          )}
        </div>
      </header>

      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Outlet />
      </motion.div>
    </div>
  )
}


