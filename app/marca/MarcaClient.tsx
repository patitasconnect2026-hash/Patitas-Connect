'use client'

import { ChasquiBust, ChasquiHead, DogPawArm } from '@/components/ui/Chasqui'
import { NOMBRE_APP } from '@/lib/config'
import { Logo, LogoMark } from '@/components/ui/Logo'

/** Hoja de marca: logo, mascota y variantes. Sirve para revisar el diseño y exportar capturas. */
export function MarcaClient() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8">
      <h1 className="font-display text-4xl font-bold">Marca {NOMBRE_APP}</h1>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="grid h-48 place-items-center rounded-3xl bg-canvas ring-1 ring-ink/10">
          <LogoMark size={110} />
        </div>
        <div className="grid h-48 place-items-center rounded-3xl bg-brand-600">
          <LogoMark size={110} tone="cream" />
        </div>
        <div className="grid h-48 place-items-center rounded-3xl bg-ink">
          <LogoMark size={110} tone="cream" />
        </div>
        <div className="grid h-48 place-items-center rounded-3xl bg-paper ring-1 ring-ink/10">
          <div className="flex items-end gap-3">
            <LogoMark size={16} />
            <LogoMark size={24} />
            <LogoMark size={40} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="grid h-32 place-items-center rounded-3xl bg-canvas ring-1 ring-ink/10">
          <Logo size={56} />
        </div>
        <div className="grid h-32 place-items-center rounded-3xl bg-brand-600">
          <Logo size={56} tone="cream" />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="grid h-72 place-items-center rounded-3xl bg-brand-600">
          <ChasquiHead className="h-56 w-56" />
        </div>
        <div className="grid h-72 place-items-center rounded-3xl bg-canvas ring-1 ring-ink/10">
          <ChasquiHead hat={false} className="h-56 w-56" />
        </div>
        <div className="relative h-72 overflow-hidden rounded-3xl bg-brand-600">
          <ChasquiBust className="absolute bottom-0 left-4 h-64 w-56" />
          <div className="absolute bottom-[-20px] left-[108px] h-[190px] w-[110px] origin-bottom rotate-[30deg]">
            <DogPawArm className="h-full w-full" />
          </div>
        </div>
      </section>
    </main>
  )
}
