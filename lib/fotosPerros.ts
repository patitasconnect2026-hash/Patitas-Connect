/** Fotos de perros de la portada de entrada. Son de Unsplash (licencia libre, uso comercial permitido):
 *  no son perros ni paseos de la app, solo decoran la entrada. Los créditos van también en public/fotos/perros/CREDITOS.md. */
export const FOTOS_PERROS = {
  lab: { src: '/fotos/perros/lab.jpg', autor: 'Richard Brutyo', url: 'https://unsplash.com/photos/Sg3XwuEpybU' },
  playa: { src: '/fotos/perros/playa.jpg', autor: 'Oscar Sutton', url: 'https://unsplash.com/photos/yihlaRCCvd4' },
  pelusa: { src: '/fotos/perros/pelusa.jpg', autor: 'Joe Caione', url: 'https://unsplash.com/photos/qO-PIF84Vxg' },
  beagle: { src: '/fotos/perros/beagle.jpg', autor: 'Milli', url: 'https://unsplash.com/photos/2l0CWTpcChI' },
  corriendo: { src: '/fotos/perros/corriendo.jpg', autor: 'Alvan Nee', url: 'https://unsplash.com/photos/T-0EW-SEbsE' },
  cachorro: { src: '/fotos/perros/cachorro.jpg', autor: 'Alvan Nee', url: 'https://unsplash.com/photos/eoqnr8ikwFE' },
  orejas: { src: '/fotos/perros/orejas.jpg', autor: 'Pauline Loroy', url: 'https://unsplash.com/photos/U3aF7hgUSrk' },
} as const

export type FotoPerro = keyof typeof FOTOS_PERROS
