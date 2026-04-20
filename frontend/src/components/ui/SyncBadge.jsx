// src/components/ui/SyncBadge.jsx
import { useEffect, useState } from 'react';
import { db } from '../../db/localDB';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { sincronizarTodo } from '../../services/syncService';

export default function SyncBadge() {
  const online              = useOnlineStatus();
  const [pendientes, setPendientes] = useState(0);
  const [syncing,    setSyncing]    = useState(false);
  const [lastSync,   setLastSync]   = useState(null);

  // Contar pendientes cada vez que cambia online o cada 10s
  useEffect(() => {
    const contar = async () => {
      const n = await db.salidas_pendientes
        .where('syncStatus').equals('pending').count();
      const r = await db.recojos_pendientes
        .where('syncStatus').equals('pending').count();
      setPendientes(n + r);
    };
    contar();
    const interval = setInterval(contar, 10_000);
    return () => clearInterval(interval);
  }, [online]);

  // Auto-sync cuando vuelve internet
  useEffect(() => {
    if (online && pendientes > 0) {
      handleSync();
    }
  }, [online]);

  const handleSync = async () => {
    if (syncing || !online) return;
    setSyncing(true);
    const result = await sincronizarTodo();
    setSyncing(false);
    setLastSync(result);
    // Recontar
    const n = await db.salidas_pendientes
      .where('syncStatus').equals('pending').count();
    const r = await db.recojos_pendientes
      .where('syncStatus').equals('pending').count();
    setPendientes(n + r);
    setTimeout(() => setLastSync(null), 4000);
  };

  // No mostrar nada si está online y no hay pendientes
  if (online && pendientes === 0 && !syncing && !lastSync) return null;

  return (
    <div style={styles.wrap}>
      {/* Sin internet */}
      {!online && (
        <div style={{ ...styles.badge, background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
          <span style={styles.dot('#F59E0B')} />
          Sin internet {pendientes > 0 ? `· ${pendientes} pendiente${pendientes > 1 ? 's' : ''}` : ''}
        </div>
      )}

      {/* Online con pendientes */}
      {online && pendientes > 0 && !syncing && (
        <button onClick={handleSync} style={{ ...styles.badge, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', cursor: 'pointer' }}>
          <span style={styles.dot('#3B82F6')} />
          {pendientes} por subir — Sincronizar
        </button>
      )}

      {/* Sincronizando */}
      {syncing && (
        <div style={{ ...styles.badge, background: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC' }}>
          <span style={{ ...styles.dot('#22C55E'), animation: 'pulse 1s infinite' }} />
          Sincronizando...
        </div>
      )}

      {/* Éxito */}
      {lastSync && !syncing && (
        <div style={{ ...styles.badge, background: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC' }}>
          ✓ {lastSync.sincronizados} sincronizado{lastSync.sincronizados !== 1 ? 's' : ''}
          {lastSync.errores > 0 ? ` · ${lastSync.errores} error` : ''}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap:  { display: 'flex', alignItems: 'center' },
  badge: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap', background: 'none', border: 'none',
  },
  dot: (color) => ({
    width: 7, height: 7, borderRadius: '50%',
    background: color, flexShrink: 0, display: 'inline-block',
  }),
};