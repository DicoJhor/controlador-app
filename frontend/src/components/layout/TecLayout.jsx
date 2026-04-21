import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { useOnlineStatus } from "../../hooks/useOnlineStatus"
import { useEffect, useState } from "react"
import { db } from "../../db/localDB"
import { sincronizarTodo } from "../../services/syncService"
import "./TecLayout.css"

function Icon({ d, size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const IC = {
  package:  "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  wrench:   "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  recycle:  "M4 2v6h6 M20 22v-6h-6 M20 11A8 8 0 004.93 7.1 M4 13a8 8 0 0015.07 3.9",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
}

const pageTitles = {
  "/tecnico/dashboard":        "Mi Inventario",
  "/tecnico/registrar-salida": "Registrar salida",
  "/tecnico/recojos":          "Recojos",
  "/tecnico/historial":        "Mi Historial",
}

const tabs = [
  { to: "/tecnico/dashboard",        label: "Inventario", icon: IC.package  },
  { to: "/tecnico/registrar-salida", label: "Registrar",  icon: IC.wrench   },
  { to: "/tecnico/recojos",          label: "Recojos",    icon: IC.recycle  },
  { to: "/tecnico/historial",        label: "Historial",  icon: IC.activity },
]

export default function TecLayout() {
  const { user, logout } = useAuth()
  const online           = useOnlineStatus()
  const navigate         = useNavigate()
  const { pathname }     = useLocation()
  const [pendientes, setPendientes] = useState(0)
  const [syncing,    setSyncing]    = useState(false)

  useEffect(() => {
    const contar = async () => {
      const n = await db.salidas_pendientes.where("syncStatus").equals("pending").count()
      const r = await db.recojos_pendientes.where("syncStatus").equals("pending").count()
      setPendientes(n + r)
    }
    contar()
    const interval = setInterval(contar, 10_000)
    return () => clearInterval(interval)
  }, [online])

  useEffect(() => {
    if (online && pendientes > 0) handleSync()
  }, [online])

  const handleSync = async () => {
    if (syncing || !online) return
    setSyncing(true)
    await sincronizarTodo()
    setSyncing(false)
    const n = await db.salidas_pendientes.where("syncStatus").equals("pending").count()
    const r = await db.recojos_pendientes.where("syncStatus").equals("pending").count()
    setPendientes(n + r)
  }

  const handleLogout = async () => {
    await logout()
    navigate("/login", { replace: true })
  }

  const title = pageTitles[pathname] ?? "Enet Fiber Perú"

  const showSyncBar = !online || pendientes > 0 || syncing

  return (
    <div className="tec-app">

      {/* Header */}
      <header className="tec-header">
        <div className="tec-header-left">
          <span className="tec-header-sede">Enet Fiber Perú</span>
          <span className="tec-header-title">{title}</span>
        </div>
        <div className="tec-header-right">
          <button
            onClick={handleLogout}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,.5)", padding: 6, borderRadius: 6,
              display: "flex", alignItems: "center",
            }}
            title="Cerrar sesión"
          >
            <Icon d={IC.logout} size={18} />
          </button>
          <div className="tec-avatar">
            {user?.nombre?.charAt(0).toUpperCase() ?? "?"}
          </div>
        </div>
      </header>

      {/* Barra de sync */}
      {showSyncBar && (
        <div
          className={`tec-sync-bar ${!online ? "offline" : "pending"}`}
          onClick={online && pendientes > 0 && !syncing ? handleSync : undefined}
          style={{ cursor: online && pendientes > 0 && !syncing ? "pointer" : "default" }}
        >
          <div
            className="tec-sync-dot"
            style={{ background: !online ? "#F59E0B" : syncing ? "#22C55E" : "#3B82F6" }}
          />
          {!online && `Sin internet${pendientes > 0 ? ` · ${pendientes} pendiente${pendientes > 1 ? "s" : ""}` : ""}`}
          {online && syncing && "Sincronizando..."}
          {online && !syncing && pendientes > 0 && `${pendientes} por subir — Toca para sincronizar`}
        </div>
      )}

      {/* Contenido */}
      <main className="tec-content">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="tec-bottom-bar">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tec-tab${isActive ? " active" : ""}`}
          >
            {({ isActive }) => (
              <>
                <Icon d={tab.icon} size={20} color={isActive ? "var(--primary)" : "var(--text-muted)"} />
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}