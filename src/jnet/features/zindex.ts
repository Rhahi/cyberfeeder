import * as css from '../css';

const id = 'cyberfeeder-override-zindex';
const style = '.server .deck-container, .server .discard-container, .server .identity {z-index: unset !important;}';

const keyDownWatcher = (ev: KeyboardEvent) => {
  if (ev.key === 'Control') {
    overrideZIndex();
  }
};

const keyUpWatcher = (ev: KeyboardEvent) => {
  if (ev.key === 'Control') {
    restoreZIndex();
  }
};

export function enable() {
  document.addEventListener('keydown', keyDownWatcher);
  document.addEventListener('keyup', keyUpWatcher);
}

export function disable() {
  document.removeEventListener('keydown', keyDownWatcher);
  document.removeEventListener('keyup', keyUpWatcher);
}

function overrideZIndex() {
  css.applyStyle(id, style);
}

function restoreZIndex() {
  css.applyStyle(id, '');
}
