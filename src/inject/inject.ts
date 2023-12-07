import { UserSettings, DEFAULT_SETTINGS, Name } from '../types';
import domAction from './dom';

const cachedWords = new Map<string, string>();
let observer: MutationObserver = null;
let aliveName: Name = null;
let deadName: Name[] = null;
let newWords: string[] = [];
let oldWords: string[] = [];
let revert = false;
let highlight: boolean;

function initalizeWords() {
  newWords = [];
  oldWords = [];
  const isAliveNameFirst = !!aliveName.first;
  const isAliveNameMiddle = !!aliveName.middle;
  const isAliveNameLast = !!aliveName.last;
  for (let x = 0, len = deadName.length; x < len; x += 1) {
    const isDeadNameFirst = !!deadName[x].first;
    const isDeadNameMiddle = !!deadName[x].middle;
    const isDeadNameLast = !!deadName[x].last;
    if (
      isAliveNameFirst && isDeadNameFirst
            && isAliveNameMiddle && isDeadNameMiddle
            && isAliveNameLast && isDeadNameLast
    ) {
      const fullAlive = `${aliveName.first} ${aliveName.middle} ${aliveName.last}`;
      const fullDead = `${deadName[x].first} ${deadName[x].middle} ${deadName[x].last}`;
      newWords.push(fullAlive);
      oldWords.push(fullDead);
    }

    if (isAliveNameFirst && isDeadNameFirst) {
      newWords.push(aliveName.first);
      oldWords.push(deadName[x].first);
    }

    if (isDeadNameMiddle) {
      newWords.push(isAliveNameMiddle ? aliveName.middle : '');
      oldWords.push(deadName[x].middle);
    }

    if (isAliveNameLast && isDeadNameLast) {
      newWords.push(aliveName.last);
      oldWords.push(deadName[x].last);
    }

    if (
      isAliveNameFirst && isDeadNameFirst
            && isAliveNameLast && isDeadNameLast
    ) {
      newWords.push(aliveName.first + aliveName.last);
      oldWords.push(deadName[x].first + deadName[x].last);
    }
  }
}

const acceptableCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';

function replaceText(text: string, isTitle?: boolean) {
  let currentIndex = 0;
  let index: number; let
    end: number;

  // eslint-disable-next-line max-len, no-return-assign
  const getIndex = (searchString: string, position?: number) => index = text.toLowerCase().indexOf(searchString, position);

  const getNextIndex = (position: number) => {
    index = getIndex(oldWords[currentIndex], position);
    while (index === -1) {
      if (currentIndex + 1 === oldWords.length) {
        return false;
      }
      currentIndex += 1;
      index = getIndex(oldWords[currentIndex]);
    }
    return true;
  };
  oldWords = oldWords.map((oldText) => oldText.toLowerCase());
  if (highlight && !isTitle) {
    if (revert) {
      oldWords = oldWords.map((txt) => `<mark replaced="">${txt}</mark>`);
    } else {
      newWords = newWords.map((txt) => (text.includes('replaced') ? txt : `<mark replaced="">${txt}</mark>`));
    }
  }

  let finalText = text;
  const oldTextsLen = oldWords.map((word) => word.length);
  while (getNextIndex(end)) {
    end = index + oldTextsLen[currentIndex];
    if (acceptableCharacters.indexOf(text[end]) === -1
    && acceptableCharacters.indexOf(text[index - 1]) === -1) {
      finalText = text.substring(0, index) + newWords[currentIndex] + text.substring(end);
    }
  }
  return finalText;
}

function checkNodeForReplacement(node: Node) {
  if (!node || (!revert && (node as any).replaced)) {
    return;
  }
  if (revert) {
    if (highlight) {
      const cachedText = cachedWords.get((node as HTMLElement).innerHTML);
      if (cachedText) {
        // eslint-disable-next-line no-param-reassign
        (node as HTMLElement).innerHTML = cachedText.toString();
      }
    } else {
      const cachedText = cachedWords.get(node.nodeValue);
      if (cachedText) {
        if (node.parentElement != null && node.parentElement !== undefined) {
          node.parentElement.replaceChild(document.createTextNode(cachedText.toString()), node);
        }
      }
    }
    return;
  }
  if (node.nodeType === 3) {
    const oldText = node.nodeValue;
    let newText = node.nodeValue;
    newText = replaceText(newText, false);
    if (newText !== oldText) {
      cachedWords.set(newText, oldText);
      if (node.parentElement) {
        // eslint-disable-next-line no-param-reassign
        node.parentElement.innerHTML = newText;
      }
    }
  } else if (node.hasChildNodes()) {
    for (let i = 0, len = node.childNodes.length; i < len; i += 1) {
      checkNodeForReplacement(node.childNodes[i]);
    }
  }
}

function setupListener() {
  observer = new MutationObserver((mutations: Array<MutationRecord>) => {
    for (let i = 0, len = mutations.length; i < len; i += 1) {
      const mutation: MutationRecord = mutations[i];
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node: Node) => {
          checkNodeForReplacement(node);
        });
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}

function checkElementForTextNodes() {
  if (revert && highlight) {
    const elements = document.body.querySelectorAll('mark[replaced]');
    for (let i = 0, len = elements.length; i < len; i += 1) {
      checkNodeForReplacement(elements[i].parentElement);
    }
  }
  const iterator = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT);
  let currentTextNode: Node;
  // eslint-disable-next-line no-cond-assign
  while ((currentTextNode = iterator.nextNode())) {
    checkNodeForReplacement(currentTextNode);
  }
  return !revert && setupListener();
}

function replaceDOMWithNewWords() {
  document.title = replaceText(document.title, true);
  domAction(() => checkElementForTextNodes());
}

function cleanUp() {
  if (newWords.length === 0 || oldWords.length === 0) {
    return;
  }
  if (observer != null && observer !== undefined) {
    observer.disconnect();
  }
  revert = true;
  [newWords, oldWords] = [oldWords, newWords];
  replaceDOMWithNewWords();
  [newWords, oldWords] = [oldWords, newWords];
  revert = false;
  cachedWords.clear();
}

function start(settings: UserSettings = DEFAULT_SETTINGS) {
  cleanUp();
  if (!settings.enabled) {
    return;
  }
  highlight = settings.highlight;
  aliveName = settings.name;
  deadName = settings.deadname;
  initalizeWords();
  replaceDOMWithNewWords();
}

export default start;
