import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./Mainlayout.css";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="ml-app">
      {/* Overlay oscuro — solo visible en móvil cuando sidebar está abierto */}
      <div
        className={`ml-overlay ${sidebarOpen ? "ml-overlay--active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="ml-main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="ml-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
