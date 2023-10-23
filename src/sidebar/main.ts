import {initializeLocalStorage} from './data';
import * as html from './html';
import * as operations from './operations';
import {registerHandlers} from './handlers';

/**
 * Loading script for sidebar
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeLocalStorage();
  await html.buildSidebar('style');
  await html.buildSidebar('script');
  await html.setVersion();
  await registerHandlers();
  await operations.sendIt('style', html.rebuildStyle('style'));
  await operations.sendIt('script', html.rebuildStyle('script'));
});
