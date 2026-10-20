/** Was gerade gezogen wird; dragover kennt die Nutzdaten nicht, daher hier gemerkt. */

export const DRAG_FAVORITE = 'application/x-favgrid-favorite';
export const DRAG_GROUP = 'application/x-favgrid-group';

class DragState {
  favoriteId = $state<string | null>(null);
  groupId = $state<string | null>(null);

  reset(): void {
    this.favoriteId = null;
    this.groupId = null;
  }
}

export const dragState = new DragState();
