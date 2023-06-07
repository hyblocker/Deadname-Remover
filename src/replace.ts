import { names, deadnames } from './names';
import { flatten } from './helpers';

/*
This function doesn't provide an exact case match, which is by design.
It will either match all uppercase, all lowercase, or
default to capitalizing the first letter, i.e Ari

An exact case match could cause problems depending on the length of your name.
For example, with the proper name Aaron and deadname Isabella, this would be an exact match:
Isabella --> Aaron
isaBella --> aarOn
isabeLLA --> aaron (because Aaron is a shorter name, i.e. doesn't have 6th character to capitalize)
*/
function matchCase(original: string, replacement: string): string {
  switch (original) {
    case original.toUpperCase():
      return replacement.toUpperCase();
    case original.toLowerCase():
      return replacement.toLowerCase();
    default:
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
}

const excludeFromBackground = ['title', 'input'];

/* eslint-disable-next-line import/prefer-default-export */
export function handleNode(textNode: Node) {
  if (!textNode.parentElement?.innerHTML) throw Error(`${textNode.parentElement.nodeName}`);
  if (textNode.parentElement.nodeName === 'FORM') {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < (textNode.parentElement as HTMLFormElement).length; i++) {
      textNode.parentElement[i].innerHTML = textNode.parentElement[i].innerHTML.replace(deadnames, (match: string) => { // eslint-disable-line no-param-reassign, max-len
        const properName = flatten(names)[match.toLowerCase()];
        const matchedCase = matchCase(match, properName);
        return matchedCase;
      });
    }
  }

  textNode.parentElement.innerHTML = textNode.parentElement.innerHTML.replace(deadnames,   (match: string) => { // eslint-disable-line no-param-reassign, max-len
    const properName = flatten(names)[match.toLowerCase()];
    const matchedCase = matchCase(match, properName);
    if (excludeFromBackground.includes(textNode.parentElement.nodeName.toLowerCase())) {
      return matchedCase;
    }
    return `<mark deadname>${matchedCase}</mark>`;
  });
}
