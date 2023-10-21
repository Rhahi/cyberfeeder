import {initializeLocalStorage} from './data';
import {buildSidebar, rebuildStyle} from './html';
import {sendIt} from './operations';
import {registerHandlers} from './handlers';

/**
 * Loading script for sidebar
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeLocalStorage();
  await buildSidebar();
  await registerHandlers();
  await sendIt(rebuildStyle());
});
