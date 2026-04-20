// src/services/syncService.js
import { db } from '../db/localDB';
import tecnicoService from './tecnicoService';

// Convierte base64 a Blob para armar el FormData
function base64ToBlob(base64, mime = 'image/jpeg') {
  const bytes = atob(base64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function sincronizarTodo() {
  if (!navigator.onLine) return { sincronizados: 0, errores: 0 };

  let sincronizados = 0;
  let errores       = 0;

  // ── 1. Salidas (averías y activaciones) ──────────────────────────────
  const salidas = await db.salidas_pendientes
    .where('syncStatus').equals('pending')
    .toArray();

  for (const salida of salidas) {
    try {
      const fd = new FormData();

      // Reconstruir los campos del payload
      const { fotos: _omit, ...campos } = salida.payload;
      Object.entries(campos).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
        }
      });

      // Adjuntar fotos guardadas como base64
      const fotos = await db.fotos_pendientes
        .where('salidaLocalId').equals(salida.id)
        .toArray();

      for (const foto of fotos) {
        const blob = base64ToBlob(foto.base64, foto.mime || 'image/jpeg');
        fd.append('fotos', blob, foto.filename);
      }

      // Llamar al endpoint correcto
      if (salida.tipo === 'averia') {
        await tecnicoService.registrarSalidaMultiple(fd);
      } else {
        await tecnicoService.registrarActivacion(fd);
      }

      // Marcar como sincronizado y limpiar fotos
      await db.salidas_pendientes.update(salida.id, { syncStatus: 'synced' });
      await db.fotos_pendientes
        .where('salidaLocalId').equals(salida.id)
        .delete();

      sincronizados++;
    } catch (e) {
      await db.salidas_pendientes.update(salida.id, {
        syncStatus: 'error',
        errorMsg:   e.message,
      });
      errores++;
    }
  }

  // ── 2. Recojos pendientes ─────────────────────────────────────────────
  const recojosPend = await db.recojos_pendientes
    .where('syncStatus').equals('pending')
    .toArray();

  for (const recojo of recojosPend) {
    try {
      const fd = new FormData();
      const { fotos: _omit, ...campos } = recojo.payload;
      Object.entries(campos).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
        }
      });

      const fotos = await db.fotos_pendientes
        .where('salidaLocalId').equals(recojo.id)
        .toArray();

      for (const foto of fotos) {
        const blob = base64ToBlob(foto.base64, foto.mime || 'image/jpeg');
        fd.append('fotos', blob, foto.filename);
      }

      await tecnicoService.confirmarRecojo(recojo.primerItemId, fd);

      await db.recojos_pendientes.update(recojo.id, { syncStatus: 'synced' });
      await db.fotos_pendientes
        .where('salidaLocalId').equals(recojo.id)
        .delete();

      sincronizados++;
    } catch (e) {
      await db.recojos_pendientes.update(recojo.id, {
        syncStatus: 'error',
        errorMsg:   e.message,
      });
      errores++;
    }
  }

  // ── 3. Refrescar cache del servidor si hay conexión ───────────────────
  try {
    const invFresh = await tecnicoService.getMiInventario();
    await db.inventario.clear();
    await db.inventario.bulkAdd(invFresh);
  } catch (_) { /* si falla el refresco no es crítico */ }

  return { sincronizados, errores };
}

// Helper para guardar un File como base64 en IndexedDB
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Se dispara automático cuando vuelve internet
window.addEventListener('online', () => sincronizarTodo());