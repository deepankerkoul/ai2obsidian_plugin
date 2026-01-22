document.getElementById('exportBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = "Scanning chat...";
    statusDiv.className = "";
  
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    if (!tab.url.includes("google.com")) {
      statusDiv.textContent = "Error: Use this on a Gemini page.";
      statusDiv.className = "error";
      return;
    }
  
    // Inject the content script safely
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      // Once injected, send the message to start extraction
      chrome.tabs.sendMessage(tab.id, { action: "get_chat" }, (response) => {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = "Error: Could not connect to page.";
          statusDiv.className = "error";
          console.error(chrome.runtime.lastError);
        } else if (response && response.status === "success") {
          statusDiv.textContent = "Copied to clipboard!";
          statusDiv.className = "success";
          
          // Reset after 2 seconds
          setTimeout(() => {
            statusDiv.textContent = "";
            statusDiv.className = "";
          }, 2000);
        } else {
          statusDiv.textContent = response ? response.message : "Unknown error.";
          statusDiv.className = "error";
        }
      });
    });
  });