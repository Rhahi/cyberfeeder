import {initializeLocalStorage} from './data';
import {buildSidebarStyles, buildSidebarScripts, rebuildStyle} from './html';
import {sendIt} from './operations';
import {registerHandlers} from './handlers';

/**
 * Loading script for sidebar
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeLocalStorage();
  await buildSidebarStyles();
  await registerHandlers();
  await sendIt(rebuildStyle());
});
