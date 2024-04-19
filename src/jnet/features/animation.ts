export interface Animation<T> {
  type: string;
  target: Element;
  duration: string;
  style?: string;
  source: AnimationLocation;
  destination: AnimationLocation;
  metadata: T;
}

export interface AnimationLocation {
  element: Element;
  offsetX?: number;
  offsetY?: number;
}

export function createGhostContainer() {
  if (!document.querySelector('#ghosts')) {
    const container = document.createElement('div');
    container.id = 'ghosts';
    container.setAttribute('style', 'position: absolute; top: 0; left: 0; overflow: visible; width: 1em; height: 1em;');
    document.body.appendChild(container);
  }
}
