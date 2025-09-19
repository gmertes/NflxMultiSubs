const kDefaultSettings = require('./default-settings');

// return true if valid; otherwise return false
function validateSettings(settings) {
  const keys = Object.keys(kDefaultSettings);
  return keys.every(key => (key in settings));
}

const loadSettings = async () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['settings'], function (result) {
      console.log('Loaded: settings=', result.settings);
      if (result.settings && validateSettings(result.settings)) {
        resolve(result.settings)
      }
      else {
        saveSettings(kDefaultSettings);
        resolve(kDefaultSettings);
      }
    });
  });
};

function saveSettings(settings) {
  // hack to update opacity for existing users
  settings.primaryImageOpacity = 1
  settings.primaryTextOpacity = 1
  settings.secondaryImageOpacity = 1
  settings.secondaryTextOpacity = 1
  chrome.storage.local.set({ settings: settings }, () => {
    console.log('Settings: saved into local storage', settings);
  });
}

// TODO: revisit this logic. 
// The port is ephemeral in manifest v3, so keeping a map of ports is probably not useful.
let gExtPorts = {}; // tabId -> msgPort; for config dispatching
function dispatchSettings(settings) {
  try {
    const keys = Object.keys(gExtPorts);
    keys.map(k => gExtPorts[k]).forEach(port => {
      try {
        port.postMessage({ settings: settings });
      }
      catch (err) {
        console.error('Error: cannot dispatch settings,', err);
      }
    });
  } catch (err) { }
}

function saturateActionIconForTab(tabId) {
  try {
    // v2
    chrome.browserAction.setIcon({
      tabId: tabId,
      path: {
        '16': 'icon16.png',
        '32': 'icon32.png',
      },
    });
  } catch (err) {
    // v3
    chrome.action.setIcon({
      path: {
        '16': 'icon16.png',
        '32': 'icon32.png',
      },
    });
  }
}

function desaturateActionIconForTab(tabId) {
  try {
    // v2
    chrome.browserAction.setIcon({
      tabId: tabId,
      path: {
        '16': 'icon16-gray.png',
        '32': 'icon32-gray.png',
      },
    });
  } catch (err) {
    // v3
    chrome.action.setIcon({
      path: {
        '16': 'icon16-gray.png',
        '32': 'icon32-gray.png',
      },
    });
  }
}

// connected from target website (our injected agent)
async function handleExternalConnection(port) {
  const tabId = port.sender && port.sender.tab && port.sender.tab.id;
  if (!tabId) return;

  gExtPorts[tabId] = port;
  console.log(`Connected: ${tabId} (tab)`);

  var gSettings = await loadSettings();
  port.postMessage({ settings: gSettings });

  port.onMessage.addListener(msg => {
    if (msg.settings) {
      console.log('Received from injected agent: settings=', msg.settings);
      let settings = Object.assign({}, gSettings);
      settings = Object.assign(settings, msg.settings);
      if (!validateSettings(settings)) {
        gSettings = Object.assign({}, kDefaultSettings);
        port.postMessage({ settings: gSettings });
      }
      else {
        gSettings = settings;
      }
      saveSettings(gSettings);
      dispatchSettings(gSettings);
    }
    else if (msg.startPlayback) {
      console.log('Saturate icon')
      saturateActionIconForTab(tabId);
    }
    else if (msg.stopPlayback) {
      console.log('Desaturate icon')
      desaturateActionIconForTab(tabId);
    }
    else {

    }
  });

  port.onDisconnect.addListener(() => {
    delete gExtPorts[tabId];
    console.log(`Disconnected: ${tabId} (tab)`);
  });
}

// connected from our pop-up page
async function handleInternalConnection(port) {
  const portName = port.name;
  console.log(`Connected: ${portName} (internal)`);

  port.onDisconnect.addListener(() => {
    console.log(`Disconnected: ${portName} (internal)`);
  });

  if (portName !== 'settings') return;

  var gSettings = await loadSettings();
  console.log('Dispatching settings to pop-up', gSettings);
  port.postMessage({ settings: gSettings });

  port.onMessage.addListener(msg => {
    // this logic is a mess, a leftover from when gSettings was a global variable
    // TODO: could use a refactor
    if (!msg.settings) {
      gSettings = Object.assign({}, kDefaultSettings);
      port.postMessage({ settings: gSettings });
    }
    else {
      console.log('Received: settings=', msg.settings);
      let settings = Object.assign({}, gSettings);
      settings = Object.assign(settings, msg.settings);
      if (!validateSettings(settings)) {
        gSettings = Object.assign({}, kDefaultSettings);
        port.postMessage({ settings: gSettings });
      }
      else {
        gSettings = settings;
      }
    }
    saveSettings(gSettings);
    dispatchSettings(gSettings);
  });
}

// handle connections from target website and our pop-up
if (BROWSER !== 'firefox') {
  chrome.runtime.onConnectExternal.addListener(
    port => handleExternalConnection(port));

  chrome.runtime.onConnect.addListener(
    port => handleInternalConnection(port));
}
else {
  // Firefox: either from website (injected agent) or pop-up are all "internal"
  chrome.runtime.onConnect.addListener(port => {
    if (port.sender && port.sender.tab) {
      handleExternalConnection(port);
    }
    else {
      handleInternalConnection(port);
    }
  });
}
