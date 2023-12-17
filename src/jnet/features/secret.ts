import {ChannelState, SimpleChannel} from 'channel-ts';
import {chat, command, ril} from '../watchers';
import * as annotateChat from './annotateChat';
import {isFullyDown} from './newMessageIndicator';
import * as util from './util';

type MatchType = string | RegExp;
const eventName = 'secret-command-panel';

enum Secret {
  invalid,
  access,
  bottom,
  order,
  look,
}

const chatPatterns: ChatPattern[] = [
  {
    type: Secret.access,
    patterns: [/unseen card from (?<location>R&D)/],
    dispatch: () => useCurrentPanel(panelPatterns[0]),
  },
  {
    type: Secret.bottom,
    patterns: [
      /looks at the top 2 cards of the stack and adds one to the bottom of the (?<location>stack)./, // Blueberry Diesel
    ],
    dispatch: age => watchPanelClick(3, Secret.bottom, age, 2),
  },
  {
    type: Secret.bottom,
    patterns: [
      /adds? .* card drawn to the bottom of (?:the )?(?<location>R&D|stack)/, // DBS
      /add the .* card on the top of the (?<location>stack) to the bottom/,
    ],
    dispatch: age => watchAsideClick(Secret.bottom, age, 2),
  },
  {
    type: Secret.bottom,
    patterns: [
      /adds? the top card of (?:the )?(?<source>stack) to the bottom/, // Paragon
    ],
    dispatch: age => watchPanel(1, Secret.bottom, age),
  },
  {
    type: Secret.bottom,
    patterns: [
      /adds?(?: \d+)? cards? from (?<source>HQ) to the bottom of (?<location>R&D)/, // Reeducation
    ],
    dispatch: age => watchPanel(1, Secret.order, age),
  },
  {
    type: Secret.bottom,
    patterns: [
      // click on play area to bottom selected cards
      'adds one to the bottom of the stack',
    ],
    dispatch: age => watchPanel(3, Secret.bottom, age),
  },
  {
    type: Secret.order,
    patterns: [
      /rearranges? the top(?: \d+)? cards? of (?:the )?(?<location>R&D)/, // Anansi, Sadaka, Federal fundraising
    ],
    dispatch: () => watchStartOver(Secret.order),
  },
  {
    type: Secret.order,
    patterns: [
      /looks? at the top(?: \d+)? cards? of/,
      // /^(?!.*install it).*\b(?:uses? .* to reveal|reveals|then reveals?).*(HQ|R&D|Archives|Server|stack|Stack)\b/,
    ],
    dispatch: (age: number) => watchPanel(1, Secret.order, age, 3),
  },
  {
    type: Secret.look,
    patterns: [
      /look at the top(?: \d+)? cards? of (?:the )?(?<location>R&D|stack|Stack)/, // Architect deployment test
    ],
    dispatch: age => watchPanel(1, Secret.order, age, 1),
  },
];

const panelPatterns: PanelPattern[] = [
  {
    type: Secret.access,
    patterns: [/^You accessed (?<card>.*)\.(?:$| Pay| Trash| Shuffle| Add| Spend)/],
  },
  {
    type: Secret.bottom,
    patterns: [/^Add (?<card>.*) to bottom of (?:the )?(?<location>stack)\?$/],
  },
  {
    type: Secret.order,
    patterns: [/(?:top|bottom) (?<number>\d )?cards? of (?:the )?(?<location>stack|R&D) (?:is|are|will be) (?<card>.*)$/],
  },
  {
    type: Secret.look,
    patterns: [/(?:top|bottom) (?<number>\d )?cards? of (?:the )?(?<location>stack|R&D) (?:is|are|will be) (?<card>.*)$/],
  },
];

// leave last secret to single item for now.
let lastSecret: PanelSecret = {category: Secret.invalid, age: -1, text: ''};
const secretPanelClicks: PanelClick[] = [];

interface ChatSecret {
  target: util.Location; // which location the information belongs to
  age: number;
  text: string; // the secret text that will be shown to the user
}

interface PanelSecretEvent extends PanelSecret {
  type: 'secret-command-panel';
}

interface PanelSecret {
  category: Secret; // identified secret category
  age: number; // length of chat at the time of the panel's appearance
  text: string; // h4 text contained in the panel
}

interface PanelClick {
  age: number;
  text: string;
}

interface ChatPattern {
  type: Secret;
  patterns: MatchType[];
  dispatch: (age: number) => SimpleChannel<PanelSecret>;
}

interface PanelPattern {
  type: Secret;
  patterns: MatchType[];
}

/** Watch chat, find messages that should contain secret, to look further into it. */
const secretHandler = async (e: Event) => {
  const event = e as CustomEvent<chat.ChatMessage>;
  if (!event.detail || event.detail.type !== chat.eventName) return;
  if (!event.detail.system) return;

  for (const s of chatPatterns) {
    for (const pattern of s.patterns) {
      const match = event.detail.text.match(pattern);
      if (!match) continue;
      const chan = s.dispatch(event.detail.age);
      try {
        const secret = await chan.receive();
        let location: util.Location = 'unknown';
        if (match.groups) location = util.toLocation(match.groups['location']);
        annotate(event.detail.element, {target: location, age: event.detail.age, text: secret.text});
      } catch {
        // do nothing
      } finally {
        chan.close();
      }
      break;
    }
  }
};

/** Watch panel content events and store if they contain secrets. */
const secretPanelWatcher = (e: Event) => {
  const event = e as CustomEvent<command.CommandPanelContent>;
  if (!event.detail || event.detail.type !== command.contentEvent) return;
  if (!event.detail.text) return; // no text, no secret

  for (const pattern of panelPatterns) {
    for (const regex of pattern.patterns) {
      const match = event.detail.text.match(regex);
      if (match) {
        const age = util.getChatAge();
        const data = {category: pattern.type, age, text: event.detail.text};
        const secret = new CustomEvent<PanelSecretEvent>(eventName, {detail: {type: eventName, ...data}});
        lastSecret = data;
        document.dispatchEvent(secret);
        return;
      }
    }
  }
};

/** Watch panel click events and store recent clicks */
const secretPanelClickWatcher = (e: Event) => {
  const event = e as CustomEvent<command.CommandPanelClick>;
  if (!event.detail || event.detail.type !== command.clickEvent) return;

  const age = util.getChatAge();
  while (secretPanelClicks.length > 7) secretPanelClicks.shift();
  const click: PanelClick = {age, text: event.detail.text};
  secretPanelClicks.push(click);
};

export function enable() {
  document.addEventListener(chat.eventName, secretHandler);
  document.addEventListener(command.contentEvent, secretPanelWatcher);
  document.addEventListener(command.clickEvent, secretPanelClickWatcher);
}

export function disable() {
  document.removeEventListener(chat.eventName, secretHandler);
  document.removeEventListener(command.contentEvent, secretPanelWatcher);
  document.removeEventListener(command.clickEvent, secretPanelClickWatcher);
}

function annotate(element: Element, result: ChatSecret) {
  if (element.hasAttribute('secret')) return;

  const shouldScroll = element.parentElement ? isFullyDown(element.parentElement) : false;
  element.setAttribute('secret', result.text);
  element.classList.add('secret');
  annotateChat.addIcons(element, {hasIcon: true, secret: annotateChat.createIcon('secret')});
  const age = element.getAttribute('age');
  element.setAttribute('age', `${age}+${result.age}`);
  if (result.target !== 'unknown') element.classList.add(result.target);
  if (shouldScroll && element.parentElement) {
    element.parentElement.scrollTop = element.parentElement.scrollHeight;
  }
}

function withinAgeRange(panelAge: number, chatAge: number, threshold: number, direction?: 'future' | 'past') {
  const inRange = Math.abs(chatAge - panelAge) <= threshold;
  if (direction === 'future') return panelAge >= chatAge && inRange;
  if (direction === 'past') return panelAge <= chatAge && inRange;
  return inRange;
}

function useCurrentPanel(pat: PanelPattern) {
  const chan = new SimpleChannel<PanelSecret>();
  const panel = command.getPanel();
  if (panel.text) {
    for (const p of pat.patterns) {
      const match = panel.text.match(p);
      if (match) {
        chan.send({age: util.getChatAge(), category: pat.type, text: panel.text});
        return chan;
      }
    }
  }
  chan.close();
  return chan;
}

/** Process X more panel messages to appear and resolve the secret or exit. */
function watchPanel(
  //
  maxCount: number,
  category: Secret,
  chatAge: number,
  ageThreshold?: number,
  validate?: (x: PanelSecret) => boolean
) {
  const chan = new SimpleChannel<PanelSecret>();
  validateSend(chan, lastSecret, category, chatAge, ageThreshold, validate);

  let count = 0;
  const handler = (e: Event) => {
    const event = e as CustomEvent<PanelSecretEvent>;
    if (!event.detail || event.detail.type !== eventName) return;

    if (count >= maxCount) {
      document.removeEventListener(eventName, handler);
      chan.close();
    } else {
      count++;
      validateSend(chan, event.detail, category, chatAge, ageThreshold, validate);
    }
  };
  document.addEventListener(eventName, handler);
  return chan;
}

function watchStartOver(category: Secret) {
  const chan = new SimpleChannel<PanelSecret>();
  const clicks = new SimpleChannel<command.CommandPanelClick>();

  const clickHandler = (e: Event) => {
    const event = e as CustomEvent<command.CommandPanelClick>;
    if (!event.detail || event.detail.type !== command.clickEvent) return;
    clicks.send(event.detail);
  };
  // when receiving a secret, wait for user to click "Done".
  // If they click "start over", keep watching.
  // otherwise, stop listening at all.
  const handler = async (e: Event) => {
    const event = e as CustomEvent<PanelSecretEvent>;
    if (!event.detail || event.detail.type !== eventName) return;
    if (event.detail.category !== category) return;

    while (clicks.state !== ChannelState.close) {
      const buttonClick = await clicks.receive();
      const buttonText = buttonClick.text.toLowerCase();
      if (buttonText === 'done') {
        chan.send({category, age: event.detail.age, text: event.detail.text});
        chan.close();
        document.removeEventListener(command.clickEvent, clickHandler);
        document.removeEventListener(eventName, handler);
        break;
      }
      // on start over, the current panel will be destroyed, so we should go to the next handler instance.
      if (buttonText === 'start over') break;
    }
  };
  document.addEventListener(command.clickEvent, clickHandler);
  document.addEventListener(eventName, handler);
  return chan;
}

function watchPanelClick(num: number, category: Secret, chatAge: number, ageThreshold: number) {
  const chan = new SimpleChannel<PanelSecret>();
  let count = 0;

  const click = command.lastClicks.length > 0 ? command.lastClicks[command.lastClicks.length - 1] : undefined;
  if (click && withinAgeRange(click.age, chatAge, ageThreshold)) {
    const data = {category, age: chatAge, text: `Choice: ${click.text}`};
    chan.send(data);
    return chan;
  }

  const handler = (e: Event) => {
    const event = e as CustomEvent<command.CommandPanelClick>;
    if (!event.detail || event.detail.type !== command.clickEvent) return;

    count++;
    if (withinAgeRange(event.detail.age, chatAge, ageThreshold)) {
      const data: PanelSecret = {category, age: chatAge, text: `Choice: ${event.detail.text}`};
      chan.send(data);
    }
    if (count >= num) {
      document.removeEventListener(command.clickEvent, handler);
      chan.close();
    }
  };
  document.addEventListener(command.clickEvent, handler);
  return chan;
}

function watchAsideClick(category: Secret, age: number, ageLimit: number): SimpleChannel<PanelSecret> {
  const chan = new SimpleChannel<PanelSecret>();
  if (ril.lastAside.length > 0) {
    const aside = ril.lastAside[ril.lastAside.length - 1];
    if (withinAgeRange(aside.age, age, ageLimit)) {
      const data: PanelSecret = {category, age, text: `Choice: ${aside.card}`};
      chan.send(data);
    }
  }
  chan.close();
  return chan;
}

function validateSend(
  //
  chan: SimpleChannel<PanelSecret>,
  x: PanelSecret,
  category: Secret,
  chatAge: number,
  ageThreshold?: number,
  validate?: (x: PanelSecret) => boolean
) {
  if (ageThreshold && !withinAgeRange(x.age, chatAge, ageThreshold)) return `out of threshold ${x.age}, ${chatAge}`;
  if (x.category !== category) return 'wrong category';
  if (validate && !validate(x)) return 'validate reject';
  chan.send(lastSecret);
  return;
}
