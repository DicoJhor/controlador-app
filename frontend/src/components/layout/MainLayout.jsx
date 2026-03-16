import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout() {
  return (
    <div style={styles.app}>
      <Sidebar />
      <div style={styles.main}>
        <Topbar />
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
  },
  main: {
    marginLeft: "var(--sidebar-w)",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    minWidth: 0,
  },
  content: {
    flex: 1,
    padding: 28,
  },
};