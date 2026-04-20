// src/db/localDB.js
import Dexie from 'dexie';

export const db = new Dexie('TecnicoOfflineDB');

db.version(1).stores({
  // Cache de datos que vienen del servidor
  inventario:  '++id, producto_id, tecnico_id',
  historial:   '++id, fecha',
  recojos:     '++id, grupo_orden, estado',

  // Registros creados offline
  salidas_pendientes: '++id, tipo, syncStatus, creadoEn',
  // tipo: "averia" | "activacion"
  // syncStatus: "pending" | "synced" | "error"

  recojos_pendientes: '++id, grupo_orden, syncStatus, creadoEn',

  // Fotos separadas para no saturar una sola entrada
  fotos_pendientes: '++id, salidaLocalId, base64, filename',
});