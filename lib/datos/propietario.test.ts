/**
 * Lo guardado en el teléfono queda atado a la cuenta con sesión (solo con servidor). Todo con una sesión SIMULADA y un
 * almacenamiento en memoria: no hay red, no hay claves y no se crea ninguna cuenta.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY, type Persisted } from '../store'
import { EMPTY_APP, type WalkerApplication } from '../walkerStore'
import { propietarioDeLaSesion, resolverSesion } from '../servidor/sesion'
import type { ClienteAcceso, PerfilServidor } from '../servidor/tipos'
import { adaptadorMemoria, CLAVES, guardarCuenta, guardarPostulacion, leerCuenta, leerPostulacion } from './index'
import { valorCompartido } from './compartido'
import { activarPorCuenta, adaptadorPorCuenta, borrarLoDeLaCuenta, claveDeLaCuenta, CLAVES_DE_CUENTA, fijarPropietario, propietarioActual, reiniciarPropietario } from './propietario'
import type { Pago } from '../pagos'

afterEach(() => reiniciarPropietario())

const PERFILES: Record<string, PerfilServidor> = {
  valeria: { rol: 'familia', nombre_pila: 'Valeria' },
  rosa: { rol: 'familia', nombre_pila: 'Rosa' },
  lucia: { rol: 'paseador', nombre_pila: 'Lucía' },
  mateo: { rol: 'paseador', nombre_pila: 'Mateo' },
}

/** Un cliente de mentira: solo sabe decir quién es cada cuenta. */
const cliente = {
  datos: {
    async leerPerfil(uid: string) {
      return { perfil: PERFILES[uid] ?? null, error: null }
    },
  },
  auth: { async signOut() {} },
} as unknown as ClienteAcceso

/** Lo mismo que hace `useSesion` al leer la sesión: de la sesión sale de quién son los datos. */
async function entrarComo(uid: string | null): Promise<void> {
  const estado = await resolverSesion(cliente, uid ? { user: { id: uid, email: `${uid}@prueba.local` } } : null)
  const dueno = propietarioDeLaSesion(estado)
  if (dueno !== undefined) fijarPropietario(dueno)
}

const cuentaConCasaYPerro = (nombre: string, perro: string): Persisted => ({
  ...EMPTY,
  account: {
    firstName: nombre,
    lastName: 'Prueba',
    phone: '987 654 321',
    district: 'San Isidro',
    street: 'Calle Los Cedros 245',
    unit: '',
    casa: [-12.0955, -77.0365],
    birth: '1994-03-12',
    termsVersion: '2026-10-v1',
    termsAt: '2026-10-13',
    doorman: false,
    doormanName: '',
    source: '',
    referral: '',
    createdAt: '2026-10-13',
  },
  dogs: [
    {
      id: `perro-${perro.toLowerCase()}`,
      name: perro,
      breed: 'Mestizo',
      ageYears: 3,
      sex: 'M',
      size: 'medium',
      weightKg: 15,
      fur: 'cafe',
      shape: 'floppy',
      temperament: [],
      sociable: true,
      vaccinated: true,
      sterilized: true,
      rpp: false,
      notes: '',
      medical: '',
      vet: '',
    },
  ],
})

const postulacion = (nombre: string, status: WalkerApplication['status'] = 'borrador'): WalkerApplication => ({
  ...EMPTY_APP,
  status,
  code: 'PAT-' + nombre.toUpperCase(),
  phone: '987 654 321',
  person: { ...EMPTY_APP.person, firstName: nombre, lastName: 'Prueba' },
})

describe('sin servidor (modo local y demostración): las claves son las de siempre', () => {
  it('lo personal va a las mismas claves y entrar o salir de una cuenta no cambia nada', async () => {
    const base = adaptadorMemoria()
    const a = adaptadorPorCuenta(base)
    guardarCuenta(a, cuentaConCasaYPerro('Valeria', 'Max'))
    guardarPostulacion(a, postulacion('Lucía', 'enviada'))
    await entrarComo('valeria')
    expect([...base.datos.keys()].sort()).toEqual([CLAVES.cuenta, CLAVES.postulacion].sort())
    expect(leerCuenta(a).dogs[0]?.name).toBe('Max')
    expect(leerPostulacion(a)?.status).toBe('enviada')
    expect(propietarioActual()).toBeNull()
    expect(claveDeLaCuenta(CLAVES.cuenta)).toBe('patitas:v2')
  })
})

describe('con servidor, antes de saber la sesión', () => {
  it('no se lee ni se escribe lo personal (no se mezcla lo suelto con lo de una cuenta)', () => {
    const base = adaptadorMemoria({ [CLAVES.cuenta]: cuentaConCasaYPerro('Vieja', 'Rex') })
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()
    expect(leerCuenta(a)).toEqual(EMPTY)
    guardarCuenta(a, cuentaConCasaYPerro('Nueva', 'Luna'))
    expect((base.datos.get(CLAVES.cuenta) ?? '').includes('Vieja')).toBe(true)
    expect([...base.datos.keys()]).toEqual([CLAVES.cuenta])
  })
  it('lo que no es de la cuenta (el chat, los paseos) pasa igual', () => {
    const base = adaptadorMemoria()
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()
    a.guardar(CLAVES.chat, [{ id: 'm1' }])
    expect(a.leer(CLAVES.chat, [])).toEqual([{ id: 'm1' }])
    expect(base.datos.has(CLAVES.chat)).toBe(true)
  })
  it('«todavía no se sabe» (leyendo la sesión o sin poder conectar) no cambia de quién son los datos', async () => {
    activarPorCuenta()
    expect(propietarioDeLaSesion({ estado: 'cargando' })).toBeUndefined()
    expect(propietarioDeLaSesion({ estado: 'local' })).toBeUndefined()
    expect(claveDeLaCuenta(CLAVES.cuenta)).toBeNull()
  })
})

describe('con servidor: dos cuentas en el mismo navegador', () => {
  it('una familia y otra no comparten casa ni perro, y cada una recupera lo suyo al volver', async () => {
    const base = adaptadorMemoria()
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()

    await entrarComo('valeria')
    guardarCuenta(a, cuentaConCasaYPerro('Valeria', 'Max'))
    expect(leerCuenta(a).dogs.map((d) => d.name)).toEqual(['Max'])

    await entrarComo('rosa')
    // Rosa es una cuenta nueva: no hereda la casa ni el perro de Valeria.
    expect(leerCuenta(a)).toEqual(EMPTY)
    expect(leerCuenta(a).account).toBeNull()
    expect(leerCuenta(a).dogs).toEqual([])
    guardarCuenta(a, cuentaConCasaYPerro('Rosa', 'Luna'))
    expect(leerCuenta(a).dogs.map((d) => d.name)).toEqual(['Luna'])
    expect(leerCuenta(a).account?.firstName).toBe('Rosa')

    await entrarComo('valeria')
    expect(leerCuenta(a).dogs.map((d) => d.name)).toEqual(['Max'])
    expect(leerCuenta(a).account?.firstName).toBe('Valeria')

    // Cada una en su clave; ninguna en la clave suelta.
    expect([...base.datos.keys()].sort()).toEqual([`${CLAVES.cuenta}@rosa`, `${CLAVES.cuenta}@valeria`])
  })

  it('un paseador y otro no comparten la postulación; una cuenta nueva NO tiene postulación', async () => {
    const base = adaptadorMemoria()
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()

    await entrarComo('lucia')
    expect(leerPostulacion(a)).toBeNull()
    guardarPostulacion(a, postulacion('Lucía', 'enviada'))
    expect(leerPostulacion(a)?.status).toBe('enviada')

    await entrarComo('mateo')
    expect(leerPostulacion(a)).toBeNull()
    guardarPostulacion(a, postulacion('Mateo', 'borrador'))
    expect(leerPostulacion(a)?.person.firstName).toBe('Mateo')
    expect(leerPostulacion(a)?.status).toBe('borrador')

    await entrarComo('lucia')
    expect(leerPostulacion(a)?.person.firstName).toBe('Lucía')
    expect(leerPostulacion(a)?.status).toBe('enviada')
  })

  it('borrar la postulación o la cuenta de una no toca la de la otra', async () => {
    const base = adaptadorMemoria()
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()
    await entrarComo('lucia')
    guardarPostulacion(a, postulacion('Lucía', 'enviada'))
    await entrarComo('mateo')
    guardarPostulacion(a, postulacion('Mateo'))
    guardarPostulacion(a, null)
    expect(leerPostulacion(a)).toBeNull()
    await entrarComo('lucia')
    expect(leerPostulacion(a)?.person.firstName).toBe('Lucía')
  })

  it('el libro de pagos tampoco se mezcla (una familia no ve lo que debe otra)', async () => {
    const a = adaptadorPorCuenta(adaptadorMemoria())
    activarPorCuenta()
    const libro = valorCompartido<Pago[]>(a, CLAVES.pagos, [])
    const aviso = vi.fn()
    const baja = libro.suscribir(aviso)

    await entrarComo('valeria')
    libro.poner([{ id: 'p-valeria' } as unknown as Pago])
    expect(libro.leer().map((p) => p.id)).toEqual(['p-valeria'])

    await entrarComo('rosa')
    expect(aviso).toHaveBeenCalled()
    expect(libro.leer()).toEqual([])

    await entrarComo('valeria')
    expect(libro.leer().map((p) => p.id)).toEqual(['p-valeria'])
    baja()
  })

  it('las pantallas que escuchan se enteran cuando cambia la cuenta (y dejan de enterarse al irse)', async () => {
    const a = adaptadorPorCuenta(adaptadorMemoria())
    activarPorCuenta()
    const aviso = vi.fn()
    const baja = a.suscribir(CLAVES.postulacion, aviso)
    await entrarComo('lucia')
    expect(aviso).toHaveBeenCalledTimes(1)
    await entrarComo('lucia')
    expect(aviso).toHaveBeenCalledTimes(1)
    await entrarComo('mateo')
    expect(aviso).toHaveBeenCalledTimes(2)
    baja()
    await entrarComo('lucia')
    expect(aviso).toHaveBeenCalledTimes(2)
  })
})

describe('con servidor: lo anterior que no tiene dueño', () => {
  const vieja = cuentaConCasaYPerro('Anterior', 'Rex')

  it('no se le asigna a ninguna cuenta nueva ni se borra', async () => {
    const base = adaptadorMemoria({ [CLAVES.cuenta]: vieja, [CLAVES.postulacion]: postulacion('Anterior', 'enviada') })
    const antes = JSON.stringify([...base.datos.entries()].sort())
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()

    await entrarComo('rosa')
    expect(leerCuenta(a)).toEqual(EMPTY)
    expect(leerPostulacion(a)).toBeNull()
    guardarCuenta(a, cuentaConCasaYPerro('Rosa', 'Luna'))
    guardarPostulacion(a, postulacion('Rosa'))

    // Lo suelto sigue exactamente igual.
    expect(base.datos.get(CLAVES.cuenta)).toBe(JSON.stringify(vieja))
    expect(base.datos.get(CLAVES.postulacion)).toBe(JSON.stringify(postulacion('Anterior', 'enviada')))
    expect(JSON.stringify([...base.datos.entries()].filter(([k]) => !k.includes('@')).sort())).toBe(antes)
  })

  it('sin sesión (la portada y la demostración) sigue usando lo de siempre', async () => {
    const base = adaptadorMemoria({ [CLAVES.cuenta]: vieja })
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()
    await entrarComo('rosa')
    expect(leerCuenta(a)).toEqual(EMPTY)
    await entrarComo(null)
    expect(leerCuenta(a).dogs[0]?.name).toBe('Rex')
    guardarCuenta(a, { ...vieja, applied: true })
    expect(JSON.parse(base.datos.get(CLAVES.cuenta) ?? '{}').applied).toBe(true)
    // …y al volver a entrar, la cuenta con sesión no ve nada de eso.
    await entrarComo('rosa')
    expect(leerCuenta(a)).toEqual(EMPTY)
  })
})

describe('qué claves son de la cuenta', () => {
  it('la cuenta, la postulación, los pagos, la marca de demostración y «mostrar ejemplos»', () => {
    expect([...CLAVES_DE_CUENTA].sort()).toEqual([CLAVES.cuenta, CLAVES.demo, CLAVES.ejemplos, CLAVES.pagos, CLAVES.postulacion].sort())
  })
  it('una marca de demostración vieja no vuelve demostración a una cuenta con sesión', async () => {
    const base = adaptadorMemoria({ [CLAVES.demo]: 1 })
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()
    await entrarComo('lucia')
    expect(a.leer<number>(CLAVES.demo, 0)).toBe(0)
    await entrarComo(null)
    expect(a.leer<number>(CLAVES.demo, 0)).toBe(1)
  })
})

describe('qué sesión es de quién', () => {
  it('con sesión, el id de la cuenta; sin sesión, nadie; si no se sabe, nada', () => {
    expect(propietarioDeLaSesion({ estado: 'con_sesion', usuario: { id: 'u-1' }, perfil: null, perfilNoLeido: true })).toBe('u-1')
    expect(propietarioDeLaSesion({ estado: 'sin_sesion' })).toBeNull()
    expect(propietarioDeLaSesion({ estado: 'cargando' })).toBeUndefined()
    expect(propietarioDeLaSesion({ estado: 'local' })).toBeUndefined()
  })
})

describe('borrar lo de una cuenta en este teléfono (después de borrarla en el servidor)', () => {
  it('quita lo de esa cuenta y no toca lo de otra ni lo suelto del modo local', async () => {
    const base = adaptadorMemoria({ [CLAVES.cuenta]: cuentaConCasaYPerro('Suelta', 'Rex') })
    const a = adaptadorPorCuenta(base)
    activarPorCuenta()
    await entrarComo('valeria')
    guardarCuenta(a, cuentaConCasaYPerro('Valeria', 'Max'))
    const claveDeValeria = claveDeLaCuenta(CLAVES.cuenta)
    await entrarComo('rosa')
    guardarCuenta(a, cuentaConCasaYPerro('Rosa', 'Luna'))
    guardarPostulacion(a, postulacion('Rosa'))
    const claveDeRosa = claveDeLaCuenta(CLAVES.cuenta)
    expect(base.datos.has(claveDeValeria as string)).toBe(true)

    borrarLoDeLaCuenta(base, 'valeria')

    expect(base.datos.has(claveDeValeria as string)).toBe(false)
    expect(base.datos.has(claveDeRosa as string)).toBe(true)
    expect(base.datos.has(CLAVES.cuenta)).toBe(true)
    expect(leerCuenta(a).dogs[0]?.name).toBe('Luna')
  })

  it('borra todas las claves que son de una cuenta (cuenta, postulación, pagos, demostración y ejemplos)', () => {
    const base = adaptadorMemoria(Object.fromEntries(CLAVES_DE_CUENTA.map((k) => [`${k}@valeria`, { x: 1 }])))
    expect(base.datos.size).toBe(CLAVES_DE_CUENTA.length)
    borrarLoDeLaCuenta(base, 'valeria')
    expect(base.datos.size).toBe(0)
  })
})
