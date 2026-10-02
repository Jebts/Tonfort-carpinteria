import { VisoresLandingEditor } from "@/components/tonfort/staff/visores-landing-editor"

export const metadata = {
  title: "Visores de la landing",
}

export default function VisoresLandingPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl">Visores de la landing</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Los dos visores 3D que aparecen en la página de inicio, en las secciones 2 y 5.
        </p>
      </header>
      <VisoresLandingEditor />
    </div>
  )
}
