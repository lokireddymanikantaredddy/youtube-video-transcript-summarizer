

const CONFIG = {
  buttonContainerSelectors: [
    '#actions-inner',
    '#top-level-buttons-computed',
    '#top-level-buttons',
    '#menu-container',
    '.ytd-watch-metadata',
    '.ytd-video-primary-info-renderer',
    '#above-the-fold'
  ],
  transcriptButtonSelectors: [
    'button[aria-label="Show transcript"]',
    'yt-button-shape button:has(> yt-formatted-string:contains("Show transcript"))',
    'ytd-transcript-button-renderer button',
    '#primary-button > ytd-button-renderer button'
  ],
  defaultPrompt: 'Summarize this YouTube video transcript in 3-5 key points:\n\n[transcript]'
};

// Main initialization
async function initializeExtension() {
  if (!isYouTubeWatchPage()) return;
  
  removeExistingButtons();
  await createControlButtons();
  setupMutationObserver();
  
  // Check for first run
  const { firstRun } = await chrome.storage.local.get(['firstRun']);
  if (firstRun === undefined) {
    chrome.storage.local.set({ 
      firstRun: false,
      platform: 'chatgpt',
      prompt: CONFIG.defaultPrompt
    });
    chrome.runtime.sendMessage({ action: 'openOptions' });
  }
}

function isYouTubeWatchPage() {
  return window.location.href.includes('/watch');
}

function removeExistingButtons() {
  document.getElementById('summarize-btn')?.remove();
  document.getElementById('transcript-btn')?.remove();
  document.querySelector('.yt-transcript-btn-wrapper')?.remove();
}

async function createControlButtons() {
  const container = findButtonContainer();
  if (!container) {
    console.debug('Could not find button container');
    return;
  }

  const buttonWrapper = document.createElement('div');
  buttonWrapper.className = 'yt-transcript-btn-wrapper';
  buttonWrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    min-width: 150px;
    width: 100%;
  `;

  buttonWrapper.appendChild(
    createButton('summarize', 'Summarize', handleSummarizeClick)
  );
  buttonWrapper.appendChild(
    createButton('transcript', 'Transcript', handleTranscriptClick)
  );

  container.insertAdjacentElement('afterend', buttonWrapper);
}

function findButtonContainer() {
  for (const selector of CONFIG.buttonContainerSelectors) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  return null;
}

function createButton(type, text, onClick) {
  const button = document.createElement('button');
  button.id = `${type}-btn`;
  button.textContent = text;
  button.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    border: none;
    border-radius: 18px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    width: 100%;
    min-width: 120px;
    white-space: nowrap;
    background: ${type === 'summarize' ? '#065fd4' : '#606060'};
    color: white;
    transition: opacity 0.2s;
  `;

  button.addEventListener('mouseenter', () => button.style.opacity = '0.9');
  button.addEventListener('mouseleave', () => button.style.opacity = '1');
  button.addEventListener('click', onClick);
  
  return button;
}

async function handleSummarizeClick() {
  const transcript = extractTranscript();
  if (!transcript) {
    showAlert('Transcript not available for this video');
    return;
  }

  const { platform, prompt } = await chrome.storage.local.get(['platform', 'prompt']);
  const processedPrompt = (prompt || CONFIG.defaultPrompt).replace('[transcript]', transcript);
  
  switch(platform || 'chatgpt') {
    case 'chatgpt':
      // ChatGPT - direct URL parameter
      window.open(`https://chat.openai.com/?q=${encodeURIComponent(processedPrompt)}`, '_blank');
      break;
      
    case 'gemini':
      navigator.clipboard.writeText(processedPrompt).then(() => {
        window.open("https://gemini.google.com/app", "_blank");
        alert("Prompt copied to clipboard! Paste it into Gemini.");
      });
      break;

    case 'claude':
      navigator.clipboard.writeText(processedPrompt).then(() => {
        window.open("https://claude.ai/chats", "_blank");
        alert("Prompt copied to clipboard! Paste it into Claude.");
      });
      break;



    default:
      showAlert('Unknown AI platform selected');
      return;
  }
  
  createSidebar(transcript);
}


function handleTranscriptClick() {
  const nativeBtn = findNativeTranscriptButton();
  if (nativeBtn) {
    nativeBtn.click();
    return;
  }
  showNativeTranscriptThroughMenu();
}

function findNativeTranscriptButton() {
  for (const selector of CONFIG.transcriptButtonSelectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }
  return null;
}

function showNativeTranscriptThroughMenu() {
  const menuBtn = document.querySelector('button[aria-label="More actions"], button[aria-label="More options"]');
  if (!menuBtn) {
    showAlert('Could not find transcript options');
    return;
  }

  menuBtn.click();
  
  setTimeout(() => {
    const items = [...document.querySelectorAll('ytd-menu-service-item-renderer')];
    const transcriptItem = items.find(item => 
      item.innerText.toLowerCase().includes('transcript') ||
      item.innerText.toLowerCase().includes('open transcript')
    );
    
    if (transcriptItem) {
      transcriptItem.click();
    } else {
      showAlert('Transcript option not found');
    }
  }, 300);
}

function extractTranscript() {
  const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
  if (segments.length > 0) {
    return Array.from(segments).map(s => s.innerText.trim()).join('\n\n');
  }
  
  const captions = document.querySelectorAll('.caption-window .caption-visual-line');
  if (captions.length > 0) {
    return Array.from(captions).map(el => el.innerText.trim()).join('\n\n');
  }
  
  return null;
}

function createSidebar(transcriptText) {
  removeExistingSidebar();
  
  const isDark = detectDarkMode();
  const sidebar = buildSidebarElement(isDark, transcriptText);
  
  document.body.appendChild(sidebar);
  setupSidebarInteractions(sidebar, transcriptText);
}

function removeExistingSidebar() {
  document.getElementById('yt-transcript-sidebar')?.remove();
}

function buildSidebarElement(isDark, transcriptText) {
  const sidebar = document.createElement('div');
  sidebar.id = 'yt-transcript-sidebar';
  
  sidebar.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 380px;
    height: 70vh;
    background: ${isDark ? '#1e1e1e' : '#fff'};
    color: ${isDark ? '#f1f1f1' : '#333'};
    border: 1px solid ${isDark ? '#444' : '#ddd'};
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: 'Roboto', Arial, sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    background: ${isDark ? '#252525' : '#f8f8f8'};
    border-bottom: 1px solid ${isDark ? '#444' : '#eee'};
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
  `;
  header.innerHTML = `
    <span>YouTube Transcript Summary</span>
    <button id="sidebar-close" style="background:none;border:none;color:${isDark ? '#f1f1f1' : '#333'};font-size:20px;cursor:pointer;">×</button>
  `;
  sidebar.appendChild(header);

  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  `;

  const transcript = document.createElement('div');
  transcript.id = 'transcript-content';
  transcript.textContent = transcriptText;
  transcript.style.cssText = `
    white-space: pre-wrap;
    background: ${isDark ? '#252525' : '#f8f8f8'};
    padding: 12px;
    border-radius: 8px;
    line-height: 1.5;
    max-height: 60vh;
    overflow-y: auto;
  `;
  content.appendChild(transcript);

  const actionButtons = document.createElement('div');
  actionButtons.style.cssText = `
    display: flex;
    gap: 8px;
    margin-top: 12px;
  `;

  const copyBtn = document.createElement('button');
  copyBtn.id = 'transcript-copy';
  copyBtn.textContent = 'Copy Transcript';
  copyBtn.style.cssText = `
    padding: 10px;
    background: #065fd4;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    flex: 1;
  `;

  const summarizeBtn = document.createElement('button');
  summarizeBtn.textContent = 'Summarize Again';
  summarizeBtn.style.cssText = `
    padding: 10px;
    background: #606060;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    flex: 1;
  `;
  summarizeBtn.addEventListener('click', () => handleSummarizeClick());

  actionButtons.appendChild(copyBtn);
  actionButtons.appendChild(summarizeBtn);
  content.appendChild(actionButtons);

  sidebar.appendChild(content);
  return sidebar;
}

function setupSidebarInteractions(sidebar, transcriptText) {
  sidebar.querySelector('#sidebar-close').addEventListener('click', () => {
    sidebar.remove();
  });

  sidebar.querySelector('#transcript-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(transcriptText)
      .then(() => {
        const btn = sidebar.querySelector('#transcript-copy');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy Transcript', 2000);
      })
      .catch(err => {
        console.error('Copy failed:', err);
        showAlert('Failed to copy transcript');
      });
  });

  setupDraggableSidebar(sidebar);
}

function setupDraggableSidebar(sidebar) {
  const header = sidebar.querySelector('div');
  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener('mousedown', (e) => {
    if (e.target.id === 'sidebar-close') return;
    
    isDragging = true;
    const rect = sidebar.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    sidebar.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    sidebar.style.left = `${e.clientX - offsetX}px`;
    sidebar.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    sidebar.style.cursor = 'default';
  });
}

function detectDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function showAlert(message) {
  const alert = document.createElement('div');
  alert.textContent = message;
  alert.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 16px;
    background: #ff4444;
    color: white;
    border-radius: 4px;
    z-index: 10000;
    animation: fadeIn 0.3s;
  `;
  
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 3000);
}

function setupMutationObserver() {
  const observer = new MutationObserver(() => {
    if (!isYouTubeWatchPage()) return;
    
    if (!document.getElementById('summarize-btn') || !document.getElementById('transcript-btn')) {
      removeExistingButtons();
      createControlButtons();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}