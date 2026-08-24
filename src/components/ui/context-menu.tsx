'use client';

/**
 * Menú contextual, al estilo shadcn/ui: un wrapper finito sobre la primitiva de
 * Radix. Radix nos da el clic derecho, el *long-press* en touch, la navegación
 * con teclado, el portal y la detección de colisiones con los bordes.
 *
 * Está escrito a mano en vez de correr `npx shadcn add` para no pisar los
 * tokens de `globals.css`. Los nombres de los tokens son los de shadcn, así que
 * el día que quieras traer más componentes van a entrar sin retoques.
 */

import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import type { ComponentProps } from 'react';

import { cx } from '../../lib/theme';

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cx(
          'z-50 min-w-52 overflow-hidden rounded-lg border p-1 shadow-2xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          className,
        )}
        style={{
          background: 'var(--popover)',
          borderColor: 'var(--border)',
          color: 'var(--popover-foreground)',
        }}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Item>) {
  return (
    <ContextMenuPrimitive.Item
      className={cx(
        'relative flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none select-none',
        'focus:bg-black/5 dark:focus:bg-white/10',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className,
      )}
      {...props}
    />
  );
}

export function ContextMenuLabel({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return (
    <ContextMenuPrimitive.Label
      className={cx(
        'px-2 py-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400',
        className,
      )}
      {...props}
    />
  );
}

export function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cx('-mx-1 my-1 h-px', className)}
      style={{ background: 'var(--border)' }}
      {...props}
    />
  );
}
