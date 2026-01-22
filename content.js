// This script runs on the page to scrape the content

function extractGeminiChat() {
  // Select all conversation turns.
  // Note: Gemini class names change frequently. We look for the main containers
  // that typically hold the user and model turns.
  // A robust heuristic is looking for the containers that hold the text.
  
  const conversation = [];
  
  // Strategy: Find the common container for chat history.
  // As of late 2024/2025, turns are usually in distinct blocks.
  // We look for elements that might be message containers. 
  // We filter by checking if they contain specific distinctive elements (like the edit icon for users, or the star icon for Gemini).

  // Attempt to select the specific message blocks (this selector targets the angular component often used)
  // If this fails due to updates, we fall back to a broader search.
  const turnElements = document.querySelectorAll('message-content, .message-content, [data-message-id]');

  if (turnElements.length === 0) {
    // Fallback: Try to find the scrolling container and get direct children
    const scroller = document.querySelector('infinite-scroller, .infinite-scroller');
    if (scroller) {
       // logic to extract from scroller if specific tags fail
    }
  }

  turnElements.forEach((turn) => {
    let role = "unknown";
    let text = "";

    // 1. Identify Role
    // User messages usually have an "Edit text" button or are on the right/have specific styling.
    // Gemini messages have the sparkle icon, "Show drafts", or "Rate" buttons.
    
    // Check for User: Look for the edit pencil or profile image
    if (turn.querySelector('mat-icon[data-mat-icon-name="edit"]') || turn.closest('.user-query')) {
        role = "user";
    } 
    // Check for Gemini: Look for the logo, copy button, or drafts
    else if (turn.querySelector('img[src*="sparkle"]') || turn.querySelector('.logo-link') || turn.closest('.model-response')) {
        role = "gemini";
    } 
    // Fallback based on visual checking or class lists if defined
    else {
        // Simple heuristic: Does it look like a user query?
        if (turn.classList.contains('user-query-content')) role = "user";
        else role = "gemini"; // Default to gemini if unsure, usually safe
    }

    // 2. Extract Text
    // We try to preserve code blocks.
    // clone the node to manipulate it without affecting the page
    const clone = turn.cloneNode(true);
    
    // Convert code blocks (pre/code) to markdown format manually if needed
    // or just rely on innerText which usually handles indentation reasonably well.
    // To improve code blocks, we could prefix lines, but innerText is usually sufficient for simple copy.
    
    // Basic text cleanup
    text = clone.innerText.trim();

    if (text.length > 0) {
      conversation.push({ role, text });
    }
  });

  // If the specific selector failed, let's try a broader scraping of the visible text
  // This is a "Last Resort" that assumes visual order = DOM order
  if (conversation.length === 0) {
      // Find all text blocks that look like paragraphs
      const allText = document.body.innerText; 
      return "Could not detect chat structure. Gemini UI may have updated.";
  }

  // 3. Format to Obsidian Callouts
  let markdown = "";
  
  conversation.forEach(entry => {
    if (entry.role === 'user') {
      markdown += `> [!user] User\n`;
    } else {
      markdown += `> [!gemini] Gemini\n`;
    }
    
    // Add the "> " prefix to every line of the text to make it part of the callout
    const quotedText = entry.text.split('\n').map(line => `> ${line}`).join('\n');
    markdown += quotedText + "\n\n";
  });

  return markdown;
}

// Listen for the message from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_chat") {
    try {
      const markdown = extractGeminiChat();
      
      // Copy to clipboard
    //   navigator.clipboard.writeText(markdown).then(() => {
    //     sendResponse({ status: "success", count: markdown.length });
    //   }, (err) => {
    //     sendResponse({ status: "error", message: "Clipboard permission failed." });
    //   });
    sendResponse({ status: "success", data: markdown });
      
    } catch (e) {
      sendResponse({ status: "error", message: e.toString() });
    }
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});