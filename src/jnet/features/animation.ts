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
