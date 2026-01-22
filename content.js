/**
 * Converts a DOM element to basic Markdown to preserve formatting.
 */
function htmlToMarkdown(element) {
  let markdown = "";

  // Clone to safely remove noise without affecting live page
  const root = element.cloneNode(true);
  root.querySelectorAll('button, mat-icon, .action-buttons, .pre-footer, script, style').forEach(el => el.remove());

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

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
      case 'code': 
        // Inline vs Block code check
        return node.parentNode.tagName === 'PRE' ? content : `\`${content}\``;
      case 'pre': return `\n\`\`\`\n${content.trim()}\n\`\`\`\n`;
      case 'blockquote': return `\n> ${content.replace(/\n/g, '\n> ')}\n`;
      default: return content;
    }
  }

  return processNode(root).replace(/\n{3,}/g, '\n\n').trim();
}

function extractGeminiChat() {
  const conversation = [];
  const turns = document.querySelectorAll('user-query, model-response, .user-query, .model-response');

  turns.forEach((turn) => {
    let role = (turn.tagName.toLowerCase() === 'user-query' || turn.classList.contains('user-query')) ? "user" : "gemini";

    // Locate the core container that holds the actual text/HTML
    const container = turn.querySelector('.message-content, .query-content, .response-container, .markdown') || turn;
    
    const formattedMarkdown = htmlToMarkdown(container);

    if (formattedMarkdown) {
      conversation.push({ role, text: formattedMarkdown });
    }
  });

  if (conversation.length === 0) return null;

  return conversation.map(entry => {
    const type = entry.role === 'user' ? 'user' : 'gemini';
    const title = entry.role === 'user' ? 'User' : 'Gemini';
    // Wrap in Obsidian Callouts and ensure every line is prefixed with >
    const body = entry.text.split('\n').map(line => `> ${line}`).join('\n');
    return `> [!${type}] ${title}\n${body}\n`;
  }).join('\n\n');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_chat") {
    const data = extractGeminiChat();
    if (data) {
      sendResponse({ status: "success", data: data });
    } else {
      sendResponse({ status: "error", message: "No content found. Ensure you are on a chat page." });
    }
  }
  return true;
});