interface Card {
  div: Element;
  name: string;
}

/** Turn on archive sorting
 *
 * This needs to be triggered again if layout changes (i.e., changing observer view)
 */
export function enable() {
  const divs = getDiscardPopups();
  divs.forEach(popup => {
    // mark enabled
    popup.setAttribute('cyberfeeder', 'on');

    // initial setup
    assignOrders(popup);
    setPopupFlex(popup);

    // watch for content change
    const cardObserver = new MutationObserver(() => {
      assignOrders(popup);
    });

    // watch for archive popup content change
    const popUpObserver = new MutationObserver(() => {
      setPopupFlex(popup);
      if (popup.getAttribute('cyberfeeder') === 'off') {
        popup.removeAttribute('cyberfeeder');
        popUpObserver.disconnect();
        cardObserver.disconnect();
        unsetPopupFlex(popup);
      }
    });

    // start the observers
    cardObserver.observe(popup, {childList: true, subtree: true});
    popUpObserver.observe(popup, {attributes: true});
  });
}

/** Turn off archive sorting */
export function disable() {
  const divs = getDiscardPopups();
  divs.forEach(popup => {
    if (popup.getAttribute('cyberfeeder') === 'on') {
      popup.setAttribute('cyberfeeder', 'off');
    }
  });
}

function getDiscardPopups() {
  return document.querySelectorAll('.discard-container .panel.popup');
}

function assignOrders(container: Element) {
  const cards: Card[] = [];
  container.childNodes.forEach((childNode, i) => {
    if (i === 0) {
      // first item is a UI element, do not assign order to this one.
      return;
    }
    if (childNode && childNode.nodeType === Node.ELEMENT_NODE) {
      const div = childNode as Element;
      const span = div.querySelector(':scope .card > span.cardname');
      const cardName = span?.textContent;
      const card = cardName ? {div: div, name: cardName} : {div: div, name: ''};
      cards.push(card);
    }
  });
  cards.sort((a, b) => {
    if (a.name === '' && b.name === '') return 0;
    if (a.name === '') return 1;
    if (b.name === '') return -1;
    return a.name.localeCompare(b.name);
  });
  for (const [index, card] of cards.entries()) {
    card.div.setAttribute('style', `order: ${index + 1}`);
  }
}

/** Jnet assigns block when discard popup is activated. Set it to flex. */
function setPopupFlex(container: Element) {
  const oldStyle = container.getAttribute('style');
  if (oldStyle === 'display: block;') {
    container.setAttribute('style', 'display: flex;');
  }
}

function unsetPopupFlex(container: Element) {
  const oldStyle = container.getAttribute('style');
  if (oldStyle?.includes('display: flex;')) {
    console.log('unset');
    container.setAttribute('style', 'display: block;');
  }
}
