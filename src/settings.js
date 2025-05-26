let settings = {};
let primaryPicker, secondaryPicker;

if (BROWSER === 'firefox') {
  const Picker = require('vanilla-picker');

  primaryPicker = new Picker({
    popup: 'bottom',
    color: '#ffffff',
    alpha: false,
    editor: false
  });

  secondaryPicker = new Picker({
    popup: 'top',
    color: '#ffffff',
    alpha: false,
    editor: false
  });
}

const port = chrome.runtime.connect({ name: 'settings' });
port.onMessage.addListener((msg) => {
  settings = msg.settings || settings;
  renderActiveSettings();

  primaryPicker?.setColor(settings.primaryTextColor || "#ffffff", true);
  secondaryPicker?.setColor(settings.secondaryTextColor || "#ffffff", true);
  console.log('Settings received:', settings);
});

// -----------------------------------------------------------------------------

const minimumFontScale = 0.3;
const maximumFontScale = 2.5;

const layoutPresets = [
  { // compact
    upperBaselinePos: 0.20,
    lowerBaselinePos: 0.80,
  },
  { // moderate (default)
    upperBaselinePos: 0.15,
    lowerBaselinePos: 0.85,
  },
  { // ease
    upperBaselinePos: 0.10,
    lowerBaselinePos: 0.90,
  },
];

const secondaryLanguagePresets = [
  {
    secondaryLanguageMode: 'disabled',
  },
  {
    secondaryLanguageMode: 'audio',
  },
  {
    secondaryLanguageMode: 'last',
  }
];


function uploadSettings() {
  port.postMessage({ settings: settings });
}

function resetSettings() {
  port.postMessage({ settings: null });
}

function renderActiveSettings() {
  if (document.readyState !== 'complete') return;

  // clear all
  [].forEach.call(document.querySelectorAll('.active'), elem => {
    elem.classList.remove('active');
  });

  let elem;

  // layout
  const layoutId = layoutPresets.findIndex(k => (k.lowerBaselinePos === settings.lowerBaselinePos));
  if (layoutId !== -1) {
    elem = document.querySelector(`.settings-layout > div[data-id="${layoutId}"]`);
    elem && elem.classList.add('active');
  }
  // primary font size
  document.getElementById('primary-font-indicator').style.scale = settings.primaryTextScale * 0.8;
  
  // primary font color
  document.getElementById('primary-color').value = settings.primaryTextColor || "#ffffff";

  // secondary font size
  document.getElementById('secondary-font-indicator').style.scale = settings.secondaryTextScale * 0.8;

  // secondary font color
  document.getElementById('secondary-color').value = settings.secondaryTextColor || "#ffffff";

  // secondary language
  const secondaryLanguageId = secondaryLanguagePresets.findIndex(k => (k.secondaryLanguageMode === settings.secondaryLanguageMode));
  if (secondaryLanguageId !== -1) {
    elem = document.querySelector(`.settings-secondary-lang > div[data-id="${secondaryLanguageId}"]`);
    elem && elem.classList.add('active');

    if(settings.secondaryLanguageLastUsed)
      document.getElementById('langcode').innerHTML = settings.secondaryLanguageLastUsed.split('-')[0] // only display language code, not script tag (eg: zh not zh-Hans)
  }
}

function updateLayout(layoutId) {
  if (layoutId < 0 || layoutId >= layoutPresets.length) return;

  settings = Object.assign(settings, layoutPresets[layoutId]);
  uploadSettings();
  renderActiveSettings();
}

function updatePrimaryFontSize(action) {
  if (action === "+") {
    settings.primaryTextScale = Math.min(maximumFontScale, settings.primaryTextScale + 0.1);
  } else if (action === "-"){
    settings.primaryTextScale = Math.max(minimumFontScale, settings.primaryTextScale - 0.1);
  } else return;

  settings.primaryImageScale = 0.6 * settings.primaryTextScale;
  uploadSettings();
  renderActiveSettings();
}

function updateSecondaryFontSize(action) {
  if (action === "+") {
    settings.secondaryTextScale = Math.min(maximumFontScale, settings.secondaryTextScale + 0.1);
  } else if (action === "-"){
    settings.secondaryTextScale = Math.max(minimumFontScale, settings.secondaryTextScale - 0.1);
  } else return;

  settings.secondaryImageScale = 0.6 * settings.secondaryTextScale;

  uploadSettings();
  renderActiveSettings();
}

function updatePrimaryColor(color) {
  settings = Object.assign(settings, {primaryTextColor: color});
  uploadSettings();
  renderActiveSettings();
}

function updateSecondaryColor(color) {
  settings = Object.assign(settings, {secondaryTextColor: color});
  uploadSettings();
  renderActiveSettings();
}

function updateSecondaryLanguage(secondaryLanguage){
  if (secondaryLanguage < 0 || secondaryLanguage >= secondaryLanguagePresets.length) return;

  settings = Object.assign(settings, secondaryLanguagePresets[secondaryLanguage]);
  uploadSettings();
  renderActiveSettings();
}


function renderVersion() {
  let elem = document.querySelector('#version');
  if (elem) {
    elem.textContent = VERSION;
  }
}


window.addEventListener('load', evt => {
  renderVersion();
  renderActiveSettings();
  console.log('Settings page loaded');

  // handle click events
  // ---------------------------------------------------------------------------
  const layouts = document.querySelectorAll('.settings-layout > div');
  [].forEach.call(layouts, div => {
    const layoutId = parseInt(div.getAttribute('data-id'));
    div.addEventListener('click', evt => updateLayout(layoutId), false);
  });

  document.getElementById("primary-plus").addEventListener('click', () => updatePrimaryFontSize("+"));
  document.getElementById("primary-minus").addEventListener('click', () => updatePrimaryFontSize("-"));

  document.getElementById("secondary-plus").addEventListener('click', () => updateSecondaryFontSize("+"));
  document.getElementById("secondary-minus").addEventListener('click', () => updateSecondaryFontSize("-"));

  const primaryColorField = document.getElementById('primary-color');
  primaryColorField.onchange = evt => {
    updatePrimaryColor(evt.target.value);
  }

  primaryPicker?.setOptions({
    parent: document.getElementById('primary-color-ff'),
    onChange: color => {
      updatePrimaryColor(color.hex.slice(0, 7));
    }
  });

  const secondaryColorField = document.getElementById('secondary-color');
  secondaryColorField.onchange = evt => {
    updateSecondaryColor(evt.target.value);
  }

  secondaryPicker?.setOptions({
    parent: document.getElementById('secondary-color-ff'),
    onChange: color => {
      updateSecondaryColor(color.hex.slice(0, 7));
    }
  });

  const secondaryLanguage = document.querySelectorAll('.settings-secondary-lang > div');
  [].forEach.call(secondaryLanguage, div => {
    const languageId = parseInt(div.getAttribute('data-id'));
    div.addEventListener('click', evt => updateSecondaryLanguage(languageId), false);
  });

  const btnReset = document.getElementById('btnReset');
  btnReset.addEventListener('click', evt => {
    resetSettings();
  }, false);
});
