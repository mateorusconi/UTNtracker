'use client';

/**
 * Tema claro/oscuro. **Dark mode first**: el `<html>` arranca con `class="dark"`
 * desde el layout, así que no hay parpadeo en el export estático.
 *
 * La persistencia en localStorage llega en la Fase 4, junto con el atajo
 * `Ctrl/⌘ + .`.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Tema = 'claro' | 'oscuro';

interface ValorTema {
  tema: Tema;
  alternar: () => void;
}

const ContextoTema = createContext<ValorTema | null>(null);

export function ProveedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>('oscuro');

  const alternar = useCallback(() => {
    setTema((actual) => {
      const siguiente: Tema = actual === 'oscuro' ? 'claro' : 'oscuro';
      document.documentElement.classList.toggle('dark', siguiente === 'oscuro');
      return siguiente;
    });
  }, []);

  const valor = useMemo<ValorTema>(() => ({ tema, alternar }), [tema, alternar]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema(): ValorTema {
  const valor = useContext(ContextoTema);
  if (valor === null) throw new Error('useTema() se usó fuera del <ProveedorTema>');
  return valor;
}
