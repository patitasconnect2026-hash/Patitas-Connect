// Simulación de capacidad de Patitas Connect.
// Ejecuta:  node docs/simulacion-capacidad.mjs
//
// Simula un mes completo de paseos (minuto a minuto) para distintos números de clientes
// y compara el uso contra los límites del plan gratuito de Supabase (verificados en oct. 2026):
//   200 conexiones Realtime simultáneas · 100 mensajes/segundo · 2 millones de mensajes/mes
//   1 GB de archivos (fotos) · 5 GB de salida de datos/mes · 500 MB de base de datos
//
// Todos los supuestos están en PARAMS: cámbialos y vuelve a correr.

// ---------- números repetibles ----------
let seed = 20261006
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const poisson = (lambda) => {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rnd()
  } while (p > L)
  return k - 1
}

// ---------- supuestos ----------
const PARAMS = {
  walksPerClientPerWeek: 2.5, // paseos por cliente y semana (plan: 2–3)
  weekdayShare: 0.88, // la mayoría de paseos ocurren de lunes a viernes
  dogsPerGroup: 2.2, // perros (= reservas) por paseo grupal; máximo 2–3
  walkMinutes: 60,
  // Distribución de la hora de inicio (peso por hora, 6–21 h): picos de mañana y de tarde
  hourWeights: { 6: 3, 7: 9, 8: 10, 9: 7, 10: 5, 11: 4, 12: 4, 13: 4, 14: 3, 15: 4, 16: 6, 17: 9, 18: 10, 19: 6, 20: 2 },
  gpsEverySec: 30, // el paseador envía su ubicación cada 30 s
  ownersWithLiveOpen: 0.6, // % de dueños con la pantalla "En vivo" abierta (conectados a Realtime)
  chatAndEventMsgs: 25, // mensajes de chat + avisos por paseo
  photosPerWalk: 4, // 2 obligatorias + 2 extra
  photoKB: 60, // foto reducida a ~640 px
  photoViewsPerOwner: 2, // veces que el dueño descarga cada foto
  photoRetentionDays: 30, // se borran de Storage a los 30 días (clave para no llenar 1 GB)
  dbKBPerWalk: 14, // reservas + eventos + chat + 1 punto GPS por minuto
  apiKBPerWalk: 120, // JSON y tráfico de la app por paseo (todos los participantes)
}

const LIMITS = { connections: 200, msgsPerSec: 100, msgsPerMonth: 2_000_000, storageMB: 1000, egressGBMonth: 5, dbMB: 500 }

function simulate(clients) {
  const P = PARAMS
  const weights = Object.entries(P.hourWeights).map(([h, w]) => [Number(h), w])
  const wTotal = weights.reduce((s, [, w]) => s + w, 0)
  const pickHour = () => {
    let r = rnd() * wTotal
    for (const [h, w] of weights) if ((r -= w) <= 0) return h
    return 8
  }

  const walksPerWeek = clients * P.walksPerClientPerWeek // reservas (perros) por semana
  const groupsPerWeek = walksPerWeek / P.dogsPerGroup // salidas grupales por semana
  const weekdayGroups = (groupsPerWeek * P.weekdayShare) / 5
  const weekendGroups = (groupsPerWeek * (1 - P.weekdayShare)) / 2

  let msgsMonth = 0
  let peakConn = 0
  let peakMsgPerSec = 0
  let photosMB = 0 // acumulado en Storage con retención
  let egressMB = 0
  let dbMB = 0
  let walksMonth = 0
  let bookingsMonth = 0
  const storageByDay = []

  for (let day = 0; day < 30; day++) {
    const isWeekend = day % 7 >= 5
    const groups = poisson(isWeekend ? weekendGroups : weekdayGroups)
    const connByMin = new Float64Array(24 * 60)
    const msgByMin = new Float64Array(24 * 60)
    let photosToday = 0

    for (let g = 0; g < groups; g++) {
      const dogs = Math.max(1, Math.min(3, Math.round(P.dogsPerGroup + (rnd() - 0.5) * 1.6)))
      const owners = Array.from({ length: dogs }, () => rnd() < P.ownersWithLiveOpen).filter(Boolean).length
      const start = pickHour() * 60 + Math.floor(rnd() * 30)
      const pings = Math.round((P.walkMinutes * 60) / P.gpsEverySec)
      const msgs = pings * (1 + owners) + P.chatAndEventMsgs * (1 + owners) // enviados + entregados
      msgsMonth += msgs
      walksMonth++
      bookingsMonth += dogs
      for (let m = start; m < Math.min(24 * 60, start + P.walkMinutes); m++) {
        connByMin[m] += 1 + owners
        msgByMin[m] += msgs / P.walkMinutes
      }
      photosToday += P.photosPerWalk
      egressMB += (P.photosPerWalk * P.photoKB * P.photoViewsPerOwner * dogs + P.apiKBPerWalk) / 1024
      dbMB += (P.dbKBPerWalk * dogs) / 1024
    }
    for (let m = 0; m < 24 * 60; m++) {
      peakConn = Math.max(peakConn, connByMin[m])
      peakMsgPerSec = Math.max(peakMsgPerSec, msgByMin[m] / 60)
    }
    storageByDay.push((photosToday * P.photoKB) / 1024)
  }
  // Storage: fotos de los últimos N días
  const window = Math.min(P.photoRetentionDays, storageByDay.length)
  photosMB = storageByDay.slice(-window).reduce((s, v) => s + v, 0)

  return {
    clients,
    walksMonth,
    bookingsMonth,
    peakConn: Math.round(peakConn),
    peakMsgPerSec: +peakMsgPerSec.toFixed(1),
    msgsMonthM: +(msgsMonth / 1e6).toFixed(2),
    storageMB: Math.round(photosMB),
    egressGB: +(egressMB / 1024).toFixed(2),
    dbMBYear: Math.round(dbMB * 12),
  }
}

function verdict(r) {
  const over = []
  if (r.peakConn > LIMITS.connections) over.push('conexiones')
  if (r.peakMsgPerSec > LIMITS.msgsPerSec) over.push('mensajes/seg')
  if (r.msgsMonthM * 1e6 > LIMITS.msgsPerMonth) over.push('mensajes/mes')
  if (r.storageMB > LIMITS.storageMB) over.push('fotos')
  if (r.egressGB > LIMITS.egressGBMonth) over.push('salida de datos')
  if (r.dbMBYear > LIMITS.dbMB) over.push('base de datos')
  return over
}

const sizes = [25, 50, 100, 150, 200, 300, 400, 600, 800, 1200]
const rows = sizes.map((n) => {
  // promedio de 5 meses simulados para suavizar el azar
  const runs = Array.from({ length: 5 }, () => simulate(n))
  const avg = (k) => runs.reduce((s, r) => s + r[k], 0) / runs.length
  const peak = (k) => Math.max(...runs.map((r) => r[k]))
  return {
    clients: n,
    walksMonth: Math.round(avg('walksMonth')),
    peakConn: peak('peakConn'),
    peakMsgPerSec: +peak('peakMsgPerSec').toFixed(1),
    msgsMonthM: +avg('msgsMonthM').toFixed(2),
    storageMB: Math.round(avg('storageMB')),
    egressGB: +avg('egressGB').toFixed(2),
    dbMBYear: Math.round(avg('dbMBYear')),
  }
})

console.log('\nSIMULACIÓN DE CAPACIDAD · plan gratuito de Supabase')
console.log('Supuestos:', JSON.stringify({ ...PARAMS, hourWeights: '(picos 7–9 h y 17–19 h)' }))
console.log('\nclientes | paseos/mes | conex. pico | msg/s pico | mensajes/mes | fotos MB | salida GB | BD MB/año | se pasa en')
for (const r of rows) {
  const over = verdict(r)
  console.log(
    [r.clients, r.walksMonth, r.peakConn, r.peakMsgPerSec, `${r.msgsMonthM} M`, r.storageMB, r.egressGB, r.dbMBYear, over.length ? over.join(', ') : '— (cabe)']
      .map(String)
      .join(' | '),
  )
}
const maxFit = [...rows].reverse().find((r) => verdict(r).length === 0)
console.log(`\nMayor tamaño simulado que cabe en el plan gratuito: ${maxFit ? maxFit.clients + ' clientes recurrentes' : 'ninguno'}`)
console.log('Límites usados:', JSON.stringify(LIMITS))
