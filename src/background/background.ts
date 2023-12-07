import { DEFAULT_SETTINGS, UserSettings } from '../types';

let settings: UserSettings = null;

function enableStealth() {
  if (!chrome.browserAction.setIcon) {
    return;
  }
  chrome.browserAction.setIcon({ path: 'icons/stealth.svg' });
  chrome.browserAction.setPopup({ popup: 'popup/stealth-popup.html' });
  chrome.browserAction.setTitle({ title: 'An experimental adblocker' });
}

function disableStealth() {
  if (!chrome.browserAction.setIcon) {
    return;
  }
  chrome.browserAction.setIcon({ path: 'icons/icon19.png' });
  chrome.browserAction.setPopup({ popup: 'popup/popup.html' });
  chrome.browserAction.setTitle({ title: 'Deadname Remover Options' });
}

interface PortInfo {
  url: string;
  port: chrome.runtime.Port;
}

const ports: Map<number, Map<number, PortInfo>> = new Map();

function getAllTabs(query: chrome.tabs.QueryInfo) {
  return new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query(query, (tabs) => resolve(tabs));
  });
}

async function sendMessage(getMessage: (url: string, frameUrl: string) => any) {
  (await getAllTabs({}))
    .filter((tab) => ports.has(tab.id))
    .forEach((tab) => {
      const framesPorts = ports.get(tab.id);
      framesPorts.forEach(({ url, port }, frameId: number) => {
        const message = getMessage(tab.url, frameId === 0 ? null : url);
        if (tab.active && frameId === 0) {
          port.postMessage(message);
        } else {
          setTimeout(() => port.postMessage(message));
        }
      });
    });
}

function saveSettings($settings: Partial<UserSettings>) {
  settings = { ...settings, ...$settings };
  return new Promise<void>((resolve, reject) => {
    chrome.storage.sync.set($settings, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

function getSettings(_url: string = null, _frameURL: string = null) {
  if (_url == null || _frameURL == null) {
    return settings;
  }
  return settings;
}

// TODO: Add a implementation to get a `site-list` behavior.
const getTabMessage = (url: string, frameURL: string) => getSettings(url, frameURL);

function changeSettings($settings: Partial<UserSettings>) {
  if ($settings.stealthMode !== settings.stealthMode) {
    if ($settings.stealthMode) {
      enableStealth();
    } else {
      disableStealth();
    }
    // $settings.stealthMode ? enableStealth() : disableStealth();
  }
  saveSettings($settings);
  sendMessage(getTabMessage);
}

function onUIMessage(port: chrome.runtime.Port, { type, data, id }) {
  switch (type) {
    case 'get-data': {
      const currentSettings = getSettings();
      port.postMessage({ id, currentSettings });
      break;
    }
    case 'save-data': {
      changeSettings(data);
      break;
    }
    case 'enable-stealth-mode': {
      enableStealth();
      break;
    }
    case 'disable-stealth-mode': {
      disableStealth();
      break;
    }
    default:
      break;
  }
}

function loadSettings() {
  return new Promise<UserSettings>((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (newSettings: UserSettings) => {
      if (!Array.isArray(newSettings.deadname)) {
        settings.deadname = [newSettings.deadname];
        saveSettings(settings);
      }
      resolve(newSettings);
    });
  });
}

loadSettings().then(($setting) => {
  settings = $setting;
  if ($setting.stealthMode) {
    enableStealth();
  }
});

chrome.runtime.onInstalled.addListener((e) => {
  if (e.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'tab') {
    const reply = () => {
      const message = getSettings();
      if (message instanceof Promise) {
        message.then((asyncMessage) => asyncMessage && port.postMessage(asyncMessage));
      } else if (message) {
        port.postMessage(message);
      }
    };
    const tabId = port.sender.tab.id;
    const { frameId } = port.sender;
    const senderURL = port.sender.url;

    let framesPorts: Map<number, PortInfo>;
    if (ports.has(tabId)) {
      framesPorts = ports.get(tabId);
    } else {
      framesPorts = new Map();
      ports.set(tabId, framesPorts);
    }
    framesPorts.set(frameId, { url: senderURL, port });
    port.onDisconnect.addListener(() => {
      framesPorts.delete(frameId);
      if (framesPorts.size === 0) {
        ports.delete(tabId);
      }
    });

    reply();
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onMessage.addListener((message) => onUIMessage(port, message));
  }
});

export default ports;
