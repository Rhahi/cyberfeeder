const regex = /\(\d+\/(\d+)\)/;

interface Hand {
  container: Element;
  indicator: Element;
}

export function enable() {
  console.log('enable handsize reminder');
  const hands = getHands();
  if (hands.length !== 2) {
    console.warn('Something went wrong while trying to find player hands');
    return;
  }
  for (const hand of hands) {
    updateHandsize(hand);
    hand.indicator.setAttribute('cyberfeeder', 'on');
    const handSizeObserver = new MutationObserver(() => {
      updateHandsize(hand);
    });
    const toggleFeatureObserver = new MutationObserver(() => {
      if (hand.indicator.getAttribute('cyberfeeder') === 'off') {
        handSizeObserver.disconnect();
        toggleFeatureObserver.disconnect();
        hand.indicator.removeAttribute('cyberfeeder');
        hand.container.removeAttribute('handsize');
      }
    });
    handSizeObserver.observe(hand.indicator, {childList: true, subtree: true, characterData: true});
    toggleFeatureObserver.observe(hand.indicator, {attributes: true});
  }
}

export function disable() {
  console.log('disable handsize reminder');
  for (const hand of getHands()) {
    hand.indicator.setAttribute('cyberfeeder', 'off');
  }
}

function updateHandsize(hand: Hand) {
  const handsize = getHandsizeNumber(hand.indicator.textContent);
  if (handsize < 5 && handsize >= 0) {
    hand.container.setAttribute('handsize', handsize.toString());
  } else {
    hand.container.removeAttribute('handsize');
  }
}

function getHandsizeNumber(text: string | null) {
  if (text) {
    const result = text.match(regex);
    if (result && result.length === 2) {
      try {
        return parseInt(result[1]);
      } catch {
        // do nothing
      }
    }
  }
  console.warn('Failed to parse hand size, no reminder will be showed');
  return 5;
}

function getHands() {
  const hands: Hand[] = [];
  const containers = document.querySelectorAll('.hand-container .panel.hand');
  containers.forEach(container => {
    const indicator = container.querySelector(':scope > .header');
    if (indicator) {
      hands.push({container, indicator});
    }
  });
  return hands;
}
