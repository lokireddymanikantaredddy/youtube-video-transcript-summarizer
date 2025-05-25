document.addEventListener('DOMContentLoaded', () => {
  const platformEl = document.getElementById('platform');
  const promptEl = document.getElementById('prompt');
  const saveBtn = document.getElementById('save');

  // Load saved settings
  chrome.storage.local.get(['platform', 'prompt'], (data) => {
    platformEl.value = data.platform || 'chatgpt';
    promptEl.value = data.prompt || 'Summarize this YouTube video transcript in 3-5 key points:\n\n[transcript]';
  });

  saveBtn.addEventListener('click', () => {
    if (!promptEl.value.includes('[transcript]')) {
      showStatus('Error: Prompt must include [transcript] placeholder', 'error');
      return;
    }

    chrome.storage.local.set({
      platform: platformEl.value,
      prompt: promptEl.value.trim()
    }, () => {
      showStatus('Settings saved!', 'success');
      setTimeout(() => window.close(), 1000);
    });
  });

  function showStatus(message, type) {
    const statusEl = document.createElement('div');
    statusEl.textContent = message;
    statusEl.className = `status-${type}`;
    statusEl.style.cssText = `
      margin: 10px 0;
      padding: 10px;
      border-radius: 4px;
      font-size: 14px;
      background-color: ${type === 'success' ? '#e6ffed' : '#fff3bf'};
      color: ${type === 'success' ? '#0c6b3d' : '#5e4b00'};
    `;
    
    const form = document.querySelector('body');
    form.insertBefore(statusEl, form.firstChild);
    
    setTimeout(() => statusEl.remove(), 3000);
  }
});