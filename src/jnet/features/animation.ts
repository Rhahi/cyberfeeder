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
    const cssBackup = 'width: 100vw; height: 100vh; ';
    const cssMain = 'position: absolute; top: 0; left: 0; overflow: clip; width: 100svw; height: 100svh;';
    container.setAttribute('style', cssBackup + cssMain);
    document.body.appendChild(container);
  }
}
