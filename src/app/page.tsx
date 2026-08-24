'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

import { InfoDialog } from '../components/layout/info-dialog';
import { Rail } from '../components/layout/rail';
import { Topbar } from '../components/layout/topbar';
import { Canvas } from '../components/mapa/canvas';
import { DialogoElectivas } from '../components/paneles/electivas';
import { PanelLateral } from '../components/paneles/panel-lateral';
import { ProveedorTema, useTema } from '../components/tema';
import { usarMapa } from '../store/usar-mapa';
import { useHidratarProgreso } from '../store/usar-progreso';

export default function Page() {
  const [info, setInfo] = useState(false);

  // Levanta el avance del localStorage recién después de montar, para no
  // romper la hidratación del HTML prerenderizado.
  useHidratarProgreso();

  // Esc limpia la selección (§4.6). El resto de los atajos son de la Fase 4.
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') usarMapa.getState().seleccionar(null);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, []);

  return (
    <ProveedorTema>
      <div className="flex h-screen flex-col">
        <Topbar alAbrirInfo={() => setInfo(true)} />

        <div className="flex min-h-0 flex-1">
          <Rail />
          <main className="relative min-w-0 flex-1">
            <Canvas />
            <PanelLateral />
          </main>
        </div>
      </div>

      <InfoDialog abierto={info} alCerrar={() => setInfo(false)} />
      <DialogoElectivas />
      <Avisos />
    </ProveedorTema>
  );
}

/** Toasts de sonner, con el tema en sincronía (§4.7). */
function Avisos() {
  const { tema } = useTema();
  return (
    <Toaster
      theme={tema === 'oscuro' ? 'dark' : 'light'}
      position="bottom-center"
      closeButton
      toastOptions={{ duration: 6000 }}
    />
  );
}
