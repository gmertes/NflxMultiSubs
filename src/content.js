const console = require('./console');


window.addEventListener('load', () => {
  let scriptElem = document.createElement('script');
  scriptElem.setAttribute('type', 'text/javascript');
  scriptElem.textContent = `(() => {
      window.__nflxMultiSubsExtId = ${JSON.stringify(chrome.runtime.id)};
    })();`;
  document.body.appendChild(scriptElem);

  const scriptsToInject = ['nflxmultisubs.min.js'];
  scriptsToInject.forEach(scriptName => {
    const scriptElem = document.createElement('script');
    scriptElem.setAttribute('type', 'text/javascript');
    scriptElem.setAttribute('src', chrome.extension.getURL(scriptName));
    document.head.appendChild(scriptElem);
    console.log(`Injected: ${scriptName}`);
  });
});


////////////////////////////////////////////////////////////////////////////////


// Firefox: the target website (our injected agent) cannot connect to extensions
// directly, thus we need to relay the connection in this content script.
let gMsgPort;
window.addEventListener('message', evt => {
  if (!evt.data || evt.data.namespace !== 'nflxmultisubs') return;

  if (evt.data.action === 'connect') {
    if (!gMsgPort) {
      gMsgPort = browser.runtime.connect(browser.runtime.id);
      gMsgPort.onMessage.addListener(msg => {
        if (msg.settings) {
          window.postMessage({
            namespace: 'nflxmultisubs',
            action: 'apply-settings',
            settings: msg.settings,
          }, '*');
        }
      });
    }
  }
  else if (evt.data.action === 'disconnect') {
    if (gMsgPort) {
      gMsgPort.disconnect();
      gMsgPort = null;
      gMsgPort.disconnect();
    }
  }
  else if (evt.data.action === 'update-settings') {
    if (gMsgPort) {
      if (evt.data.settings) {
        gMsgPort.postMessage({settings: evt.data.settings});
      }
    }
  }
  else if (evt.data.action === 'startPlayback') {
    if (gMsgPort) {
        gMsgPort.postMessage({ startPlayback: 1 });
    }
  }
  else if (evt.data.action === 'stopPlayback') {
    if (gMsgPort) {
        gMsgPort.postMessage({ stopPlayback: 1 });
    }
  }
}, false);
