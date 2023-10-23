interface RunnerStats {
  clicks: number;
  credits: number;
  badPub: number;
  unusedMU: number;
  maxMU: number;
  links: number;
  tags: number;
  coreDamage: number;
}

interface CorpStats {
  clicks: number;
  credits: number;
  badPub: number;
}

const ENABLED = false;

export function onLoad() {
  if (!ENABLED) {
    return;
  }
  document.querySelectorAll('.left-inner-leftpane .panel.stats .stats-area').forEach(target => {
    const parent = target.parentElement;
    if (!parent) {
      console.error('Could not find parent element of .stats-area, aborting Tokenization');
      return;
    }
    devOverride(parent);
    if (!isTokenized(parent)) {
      let tokens: HTMLDivElement;
      if (isRunner(target)) {
        const stats = parseRunnerStats(target);
        tokens = createRunnerTokenContainer(stats);
      } else {
        const stats = parseCorpStats(target);
        tokens = createCorpTokenContainer(stats);
      }
      // target.classList.add('hidden');
      // target.setAttribute('style', 'display: none'); // remove this later
      insertElement(parent, target, tokens);
    }
    // add watch
  });
}

function devOverride(parent: Element) {
  const tokenContainer = parent.querySelector(':scope > .cyberfeeder');
  if (tokenContainer) {
    parent.removeChild(tokenContainer);
  }
}

function isTokenized(parent: Element) {
  const tokenContainer = parent.querySelector(':scope > .cyberfeeder');
  if (tokenContainer) {
    return true;
  }
  return false;
}

function isRunner(target: Element) {
  const children = target.children;
  return children.length === 3;
}

function parseRunnerStats(container: Element): RunnerStats {
  const clicks = container.querySelector('.icon-grid > div:nth-child(1)');
  const credits = container.querySelector('.icon-grid > div:nth-child(2)');
  const mu = container.querySelector('.icon-grid > div:nth-child(3)');
  const links = container.querySelector('.icon-grid > div:nth-child(4)');
  const tags = container.querySelector(':scope > div:nth-child(2)');
  const coreDamage = container.querySelector(':scope > div:nth-child(3)');

  const stats: RunnerStats = {
    clicks: NaN,
    badPub: NaN,
    credits: NaN,
    unusedMU: NaN,
    maxMU: NaN,
    links: NaN,
    tags: NaN,
    coreDamage: NaN,
  };

  if (clicks?.textContent) {
    stats.clicks = parseInt(clicks.textContent);
  }
  if (credits?.textContent) {
    const splitCredit = credits.textContent.split('+');
    if (splitCredit.length > 0) {
      stats.credits = parseInt(splitCredit[0]);
    }
    if (splitCredit.length > 1) {
      stats.badPub = parseInt(splitCredit[1]);
    }
  }
  if (mu?.textContent) {
    const splitMU = mu.textContent.split('/');
    if (splitMU.length === 2) {
      stats.unusedMU = parseInt(splitMU[0]);
      stats.maxMU = parseInt(splitMU[1]);
    }
  }
  if (links?.textContent) {
    stats.links = parseInt(links.textContent);
  }
  if (tags?.textContent) {
    stats.tags = parseInt(tags.textContent);
  }
  if (coreDamage?.textContent) {
    stats.coreDamage = parseInt(coreDamage.textContent);
  }
  return stats;
}

function parseCorpStats(container: Element): CorpStats {
  const clicks = container.querySelector('.icon-grid > div:nth-child(1)');
  const credits = container.querySelector('.icon-grid > div:nth-child(2)');
  const badPub = container.querySelector(':scope > div:nth-child(1)');

  const stats = {
    clicks: NaN,
    credits: NaN,
    badPub: NaN,
  };

  if (clicks?.textContent) {
    stats.clicks = parseInt(clicks.textContent);
  }
  if (credits?.textContent) {
    stats.credits = parseInt(credits.textContent);
  }
  if (badPub?.textContent) {
    stats.badPub = parseInt(badPub.textContent);
  }
  return stats;
}

function createRunnerTokenContainer(init: RunnerStats) {
  const div = document.createElement('div');
  const credits = document.createElement('div');
  const clicks = document.createElement('div');
  const tags = document.createElement('div');
  const coreDamage = document.createElement('div');
  const memory = document.createElement('div');

  div.className = 'cyberfeeder tokenbox runner';
  div.id = 'tokenbox-runner';
  credits.className = 'credits';
  clicks.className = 'clicks';
  tags.className = 'tags';
  coreDamage.className = 'core-damages';
  memory.className = 'memory';

  setCredits(credits, init.credits);

  div.appendChild(credits);
  div.appendChild(clicks);
  div.appendChild(tags);
  div.appendChild(coreDamage);
  div.appendChild(memory);
  return div;
}

function createCorpTokenContainer(stats: CorpStats) {
  const div = document.createElement('div');
  const credits = document.createElement('div');
  const clicks = document.createElement('div');
  const badPub = document.createElement('div');

  div.className = 'cyberfeeder tokenbox corp';
  div.id = 'tokenbox-corp';
  credits.className = 'credits';
  clicks.className = 'clicks';
  badPub.className = 'bad-pubs';

  setCredits(credits, stats.credits);

  div.appendChild(credits);
  div.appendChild(clicks);
  div.appendChild(badPub);
  return div;
}

function insertElement(parent: Element, target: Element, payload: Element) {
  if (target.nextSibling) {
    parent.insertBefore(payload, target.nextSibling);
  } else {
    parent.appendChild(payload);
  }
}

function setCredits(target: Element, amount: number) {
  let remainingCredits = amount;
  const five = document.createElement('img');
  const one = document.createElement('img');
  five.setAttribute('alt', '(5)');
  one.setAttribute('alt', '(1)');

  while (remainingCredits > 0) {
    if (remainingCredits >= 5) {
      target.appendChild(five);
      remainingCredits -= 5;
    } else {
      target.appendChild(one);
      remainingCredits -= 1;
    }
  }
}
