document.getElementById('exportBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = "Extracting formatting...";
  statusDiv.className = "";
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes("gemini.google.com")) {
    statusDiv.textContent = "Please use on gemini.google.com";
    statusDiv.className = "error";
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    chrome.tabs.sendMessage(tab.id, { action: "get_chat" }, async (response) => {
      if (response && response.status === "success") {
        const success = await copyToClipboard(response.data);
        if (success) {
          statusDiv.textContent = "Copied with formatting!";
          statusDiv.className = "success";
        } else {
          statusDiv.textContent = "Clipboard write failed.";
          statusDiv.className = "error";
        }
      } else {
        statusDiv.textContent = response?.message || "Export failed.";
        statusDiv.className = "error";
      }
    });
  } catch (err) {
    statusDiv.textContent = "Error: Check extension logs.";
    statusDiv.className = "error";
  }
});

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  }
}