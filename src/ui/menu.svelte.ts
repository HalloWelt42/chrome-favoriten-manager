/** Kontextmenü: genau eines zur Zeit, an einer Bildschirmposition. */

export interface MenuItem {
  label: string;
  icon: string;
  run?: () => unknown;
  danger?: boolean;
  submenu?: MenuItem[];
  separatorBefore?: boolean;
  title?: string;
}

export interface OpenMenu {
  x: number;
  y: number;
  items: MenuItem[];
}

class MenuStore {
  current = $state<OpenMenu | null>(null);

  open(event: MouseEvent, items: MenuItem[]): void {
    event.preventDefault();
    event.stopPropagation();
    this.current = { x: event.clientX, y: event.clientY, items };
  }

  close(): void {
    this.current = null;
  }
}

export const menu = new MenuStore();
