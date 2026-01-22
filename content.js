/**
 * Converts a DOM element to basic Markdown to preserve formatting.
 */
function htmlToMarkdown(element) {
  let markdown = "";
  const root = element.cloneNode(true);
  
  // Clean UI noise
  root.querySelectorAll('button, mat-icon, .action-buttons, .pre-footer, script, style, .sr-only').forEach(el => el.remove());

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    let content = "";
    node.childNodes.forEach(child => { content += processNode(child); });

    switch (tag) {
      case 'h1': return `\n# ${content.trim()}\n`;
      case 'h2': return `\n## ${content.trim()}\n`;
      case 'h3': return `\n### ${content.trim()}\n`;
      case 'strong': case 'b': return `**${content}**`;
      case 'em': case 'i': return `*${content}*`;
      case 'p': return `\n${content}\n`;
      case 'br': return `\n`;
      case 'li': return `\n- ${content.trim()}`;
      case 'ul': case 'ol': return `\n${content}\n`;
      case 'code': return node.parentNode.tagName === 'PRE' ? content : `\`${content}\``;
      case 'pre': return `\n\`\`\`\n${content.trim()}\n\`\`\`\n`;
      default: return content;
    }
  }

  return processNode(root).replace(/\n{3,}/g, '\n\n').trim();
}

function extractChat() {
  const conversation = [];
  const isChatGPT = window.location.hostname.includes("chatgpt.com");

  if (isChatGPT) {
    // ChatGPT Selectors
    const chatTurns = document.querySelectorAll('article, [data-testid^="conversation-turn-"]');
    
    chatTurns.forEach(turn => {
      // Improved Role Detection for ChatGPT
      const userMessageEl = turn.querySelector('[data-message-author-role="user"]');
      const assistantMessageEl = turn.querySelector('[data-message-author-role="assistant"]');
      
      let role = "assistant"; // Default
      let contentEl = null;

      if (userMessageEl) {
        role = "user";
        contentEl = userMessageEl;
      } else if (assistantMessageEl) {
        role = "assistant";
        contentEl = assistantMessageEl.querySelector('.prose') || assistantMessageEl;
      } else {
        // Fallback: Check if the turn specifically contains the "You" header vs AI response
        const text = turn.innerText;
        if (text.startsWith("You\n") || turn.querySelector('[data-testid="user-message"]')) {
          role = "user";
        }
        contentEl = turn.querySelector('.prose') || turn;
      }
      
      const md = htmlToMarkdown(contentEl);
      if (md) conversation.push({ role, text: md });
    });
  } else {
    // Gemini Selectors
    const turns = document.querySelectorAll('user-query, model-response, .user-query, .model-response');
    turns.forEach(turn => {
      const role = (turn.tagName.toLowerCase() === 'user-query' || turn.classList.contains('user-query')) ? "user" : "gemini";
      const container = turn.querySelector('.message-content, .query-content, .response-container, .markdown') || turn;
      const md = htmlToMarkdown(container);
      if (md) conversation.push({ role, text: md });
    });
  }

  if (conversation.length === 0) return null;

  return conversation.map(entry => {
    const isUser = entry.role === 'user';
    const type = isUser ? 'user' : 'gemini';
    
    // Determine Display Title
    let title = "Gemini";
    if (isUser) {
      title = "User";
    } else if (isChatGPT) {
      title = "ChatGPT";
    }

    const body = entry.text.split('\n').map(line => `> ${line}`).join('\n');
    return `> [!${type}] ${title}\n${body}\n`;
  }).join('\n\n');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_chat") {
    const data = extractChat();
    if (data) {
      sendResponse({ status: "success", data: data });
    } else {
      sendResponse({ status: "error", message: "No chat detected. Ensure the page is fully loaded." });
    }
  }
  return true;
});