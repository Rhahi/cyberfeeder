interface StyleData {
  version: string;
  style: Style[];
}

interface Style {
  category: string;
  series: string;
  default: boolean;
  name: string;
  css: string;
  description: string;
}

interface IdStyle extends Style {
  id: string;
}

interface CollectedStyle {
  [category: string]: Category;
}

interface Category {
  standalone: Style[];
  series: {[series: string]: Style[]};
}

async function getJson(name: string): Promise<StyleData> {
  const jsonUrl = browser.runtime.getURL(`data/${name}.json`);
  return fetch(jsonUrl)
    .then(async response => {
      if (!response.ok) {
        throw new Error('Failed to load JSON' + response.statusText);
      }
      return response.json();
    })
    .catch(error => {
      console.error(error.message);
      return {
        style: [],
      };
    });
}

/**
 * There are 4 storage keys:
 *
 * - version = simple version string
 * - toggles = save toggle status per style ID
 * - styles = styles packaged with the app, not controlled by user
 * - userstyles = styles that the user has modified or created. untouched by updates.
 */
async function initializeLocalStorage() {
  const jsonData = await getJson('style');
  const prevVersion = await browser.storage.local
    .get('version')
    .then(item => item.version);
  if (
    prevVersion &&
    jsonData.version === prevVersion &&
    jsonData.version !== 'override'
  ) {
    console.info('No stoarge update needed');
    return;
  }
  await initializeStyles(jsonData);
}

async function initializeStyles(jsonData: StyleData) {
  const packagedStyles = [];
  for (const style of jsonData.style) {
    const data: IdStyle = {
      id: `${style.category}-${style.name}`.replace(' ', '-').trim(),
      ...style,
    };
    packagedStyles.push(data);
  }
  if (jsonData.version === 'override') {
    await browser.storage.local.set({
      version: jsonData.version,
      styles: packagedStyles,
      userstyles: [],
    });
  } else {
    await browser.storage.local.set({
      version: jsonData.version,
      styles: packagedStyles,
      userstyles: [],
    });
  }
}

/**
 * Loading script for sidebar
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeLocalStorage();
});
