import Dexie from 'dexie';

const DB_NAME = 'TecnicoOfflineDB';

export const db = new Dexie(DB_NAME);

db.version(2).stores({
  inventario:          'id, producto_id, tecnico_id',
  historial:           '++id, fecha',
  recojos:             '++id, grupo_orden, estado',
  recuperados:         'id',
  catalogo_productos:  'id',
  salidas_pendientes:  '++id, tipo, syncStatus, creadoEn',
  recojos_pendientes:  '++id, grupo_orden, syncStatus, creadoEn',
  fotos_pendientes:    '++id, salidaLocalId, base64, filename',
  ordenes_pendientes:  '++id, nro_orden, estado_app',
  mis_onus:            'id, producto_id',
  catalogo_onus:       '++id',
});

db.version(3).stores({
  inventario:          'id, producto_id, tecnico_id',
  historial:           '++id, fecha',
  recojos:             '++id, grupo_orden, estado',
  recuperados:         'id',
  catalogo_productos:  'id',
  salidas_pendientes:  '++id, tipo, syncStatus, creadoEn',
  recojos_pendientes:  '++id, grupo_orden, syncStatus, creadoEn',
  fotos_pendientes:    '++id, salidaLocalId, base64, filename',
  ordenes_pendientes:  '++id, nro_orden, estado_app',
  mis_onus:            'id, producto_id',
  catalogo_onus:       '++id',
  duo_estado:          'clave',
});