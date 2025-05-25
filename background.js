chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showTranscript') {
    chrome.windows.create({
      url: chrome.runtime.getURL('sidebar/sidebar.html'),
      type: 'popup',
      width: 400,
      height: 600
    }, (win) => {
      setTimeout(() => {
        chrome.tabs.sendMessage(win.tabs[0].id, {
          action: 'setTranscript',
          transcript: request.transcript
        });
      }, 500);
    });
  }
  else if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
  return true;
});