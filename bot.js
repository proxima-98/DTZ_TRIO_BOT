require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Anthropic = require("@anthropic-ai/sdk");
const { getSystemPrompt } = require("./prompts");
const { logConversation, getConversationHistory, clearHistory } = require("./memory");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Utility: safe Markdown send with fallback to plain text ──────────────────
async function safeSend(chatId, text, extra = {}) {
  try {
    return await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      ...extra,
    });
  } catch {
    // Strip markdown and retry as plain text
    const plain = text.replace(/[*_`\[\]]/g, "");
    return await bot.sendMessage(chatId, plain, { disable_web_page_preview: true, ...extra });
  }
}

// ─── Utility: split long messages for Telegram (4096 char limit) ──────────────
function splitMessage(text, limit = 4000) {
  if (text.length <= limit) return [text];
  const parts = [];
  while (text.length > 0) {
    let chunk = text.slice(0, limit);
    const lastNewline = chunk.lastIndexOf("\n");
    if (lastNewline > limit * 0.7) chunk = text.slice(0, lastNewline);
    parts.push(chunk);
    text = text.slice(chunk.length).trimStart();
  }
  return parts;
}

// ─── /start ───────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "there";
  const welcome = `
🎓 *Welcome to DTZ-Bot!*
_Your AI-Powered Assistant — FUTMinna & Beyond_

Hello *${name}*! 👋 I'm DTZ-Bot, an intelligent assistant that works like Google + ChatGPT combined. I search the internet in real-time to give you accurate, up-to-date answers on *anything*.

━━━━━━━━━━━━━━━━━━━━
🏫 *FUTMinna — I Know It All:*
  • Course registration, CGPA, results
  • School fees, portals & payment
  • Admission (UTME/DE/Postgrad)
  • All Schools, Departments & Staff
  • Hostels, SIWES, Clearance, NYSC
  • Campus news & announcements

🇳🇬 *Nigerian Education:*
  • All federal & state universities
  • JAMB, WAEC, NECO, NABTEB
  • NYSC, scholarships & bursaries
  • Student loans & grants

🌍 *Worldwide Knowledge:*
  • Physics, Maths, Chemistry, Biology
  • International scholarships
  • Global universities & rankings
  • Any question under the sun!

━━━━━━━━━━━━━━━━━━━━
🔍 *I search the internet live — my knowledge is always fresh!*

_Commands:_
/start — Restart
/help — Help & examples
/clear — Clear chat memory
/about — About DTZ-Bot
/search [query] — Force web search

_Built by *DTZ TRIO* 👨‍💻 | Powered by DTZ system🤖_
`;
  safeSend(chatId, welcome);
});

// ─── /help ────────────────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  safeSend(chatId, `
📋 *DTZ-Bot Help Menu*

Just type your question naturally! I understand English, Pidgin, and more.

*🏫 FUTMinna Examples:*
  • "How do I register my courses?"
  • "What is the CGPA for first class?"
  • "Who is the HOD of Computer Science?"
  • "How do I pay my school fees?"
  • "When is second semester exam?"
  • "How does SIWES work?"
  • "What are postgraduate requirements?"

*🇳🇬 Nigerian Uni Examples:*
  • "JAMB cutoff for University of Lagos?"
  • "Which Nigerian uni is best for Medicine?"
  • "How do I apply for WAEC?"
  • "NYSC registration steps?"

*🌍 World Knowledge Examples:*
  • "Explain Newton's laws of motion"
  • "Top scholarships for Nigerian students abroad"
  • "How do I apply to Oxford University?"
  • "What is quantum mechanics?"
  • "Best paying jobs for Computer Science graduates"

*⚡ Special Commands:*
/search [topic] — Directly search the web
/clear — Reset conversation memory
/about — About this bot

_I search the internet in real-time so my answers are always current!_ 🔍
`);
});

// ─── /about ───────────────────────────────────────────────────────────────────
bot.onText(/\/about/, (msg) => {
  const chatId = msg.chat.id;
  safeSend(chatId, `
ℹ️ *About DTZ-Bot*

DTZ-Bot is a next-generation AI assistant built for the FUTMinna community and beyond — combining the power of real-time internet search with advanced AI reasoning.

🤖 *AI Engine:* Claude (Anthropic) + Live Web Search
🔍 *Search:* Real-time internet — always up to date
🏫 *Primary Focus:* FUTMinna Students & Staff
🌍 *Coverage:* Nigeria + Worldwide
📍 *University:* futminna.edu.ng — Minna, Niger State

👨‍💻 *Developed by:* DTZ TRIO

*What makes DTZ-Bot different:*
  ✅ Searches the internet like Google
  ✅ Reasons like ChatGPT/Gemini
  ✅ Deep FUTMinna knowledge built-in
  ✅ Covers all Nigerian universities
  ✅ Answers any academic question
  ✅ Available 24/7, completely free
  ✅ Understands Nigerian Pidgin

_"Technology for Service"_ 🔵⚪
_Built with ❤️ by DTZ TRIO_
`);
});

// ─── /clear ───────────────────────────────────────────────────────────────────
bot.onText(/\/clear/, (msg) => {
  const chatId = msg.chat.id;
  clearHistory(chatId);
  bot.sendMessage(chatId, "🗑️ Memory cleared! Fresh start. What would you like to know?");
});

// ─── /search [query] — force a web search ─────────────────────────────────────
bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  const userName = msg.from.first_name || "User";

  bot.sendChatAction(chatId, "typing");
  await safeSend(chatId, `🔍 Searching the web for: *${query}*...`);

  await handleAIQuery(chatId, userName, `Search the internet and give me detailed, up-to-date information about: ${query}`, true);
});

// ─── Core AI query handler with web search ────────────────────────────────────
async function handleAIQuery(chatId, userName, userMessage, forceSearch = false) {
  try {
    const history = getConversationHistory(chatId);
    history.push({ role: "user", content: userMessage });

    // Always enable web search tool — Claude decides when to use it
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: getSystemPrompt(userName),
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        },
      ],
      messages: history,
    });

    // Extract full text from all content blocks (including after tool use)
    let reply = "";

    if (response.stop_reason === "tool_use") {
      // Claude used web search — get the final answer via a follow-up
      const toolResultMessages = buildToolResultMessages(history, userMessage, response);
      const finalResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: getSystemPrompt(userName),
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          },
        ],
        messages: toolResultMessages,
      });
      reply = extractText(finalResponse);
    } else {
      reply = extractText(response);
    }

    if (!reply) reply = "⚠️ I could not generate a response. Please try again.";

    // Save to memory
    history.push({ role: "assistant", content: reply });
    logConversation(chatId, history);

    // Send (split if needed)
    const parts = splitMessage(reply);
    for (const part of parts) {
      await safeSend(chatId, part);
    }
  } catch (err) {
    console.error("AI Error:", err.message);
    await bot.sendMessage(
      chatId,
      `⚠️ Something went wrong: ${err.message}\n\nPlease try again or type /start to restart.`
    );
  }
}

// ─── Build tool result messages for multi-turn tool use ──────────────────────
function buildToolResultMessages(history, userMessage, response) {
  const messages = [
    ...history.slice(0, -1), // all history except the last user message we just added
    { role: "user", content: userMessage },
    { role: "assistant", content: response.content },
  ];

  // Attach tool results
  const toolResults = response.content
    .filter((b) => b.type === "tool_use")
    .map((b) => ({
      type: "tool_result",
      tool_use_id: b.id,
      content: b.input ? JSON.stringify(b.input) : "Search completed",
    }));

  if (toolResults.length > 0) {
    messages.push({ role: "user", content: toolResults });
  }

  return messages;
}

// ─── Extract text from Claude response ───────────────────────────────────────
function extractText(response) {
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// ─── Main message handler ─────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  const userName = msg.from.first_name || "User";

  bot.sendChatAction(chatId, "typing");

  // Keep typing indicator alive for longer queries
  const typingInterval = setInterval(() => {
    bot.sendChatAction(chatId, "typing").catch(() => {});
  }, 4000);

  try {
    await handleAIQuery(chatId, userName, text);
  } finally {
    clearInterval(typingInterval);
  }
});

// ─── Polling error handler ────────────────────────────────────────────────────
bot.on("polling_error", (err) => {
  console.error("Polling error:", err.code, err.message);
});

console.log("🤖 DTZ-Bot v2.0 (Internet-Powered FUTMinna AI) is running...");
