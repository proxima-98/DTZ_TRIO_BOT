require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getSystemPrompt } = require("./prompts");
const { logConversation, getConversationHistory, clearHistory } = require("./memory");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Gemini model with search grounding (real-time internet) ──────────────────
function getModel() {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",  // Free tier model
    systemInstruction: getSystemPrompt(),
    tools: [{ googleSearch: {} }], // Real-time Google Search grounding
  });
}

// ─── Safe send with Markdown fallback ────────────────────────────────────────
async function safeSend(chatId, text, extra = {}) {
  // Convert Gemini markdown to Telegram markdown
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, "*$1*")   // **bold** → *bold*
    .replace(/#{1,3} (.*)/g, "*$1*")      // ## Heading → *Heading*
    .replace(/\n---+/g, "\n━━━━━━━━━━━━");

  try {
    return await bot.sendMessage(chatId, formatted, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      ...extra,
    });
  } catch {
    return await bot.sendMessage(chatId, text.replace(/[*_`\[\]#]/g, ""), {
      disable_web_page_preview: true,
      ...extra,
    });
  }
}

// ─── Split long messages ──────────────────────────────────────────────────────
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
  safeSend(chatId, `
🎓 *Welcome to DTZ-Bot!*
_Your AI-Powered Assistant — FUTMinna & Beyond_

Hello *${name}*! 👋 I'm DTZ-Bot — an intelligent assistant that searches the internet in real-time to answer *anything* you ask.

━━━━━━━━━━━━━━━━━━━━
🏫 *FUTMinna Students & Staff:*
  • Course registration, CGPA, results
  • School fees, portals & payment
  • Admission (UTME/DE/Postgrad)
  • All Schools & Departments
  • Hostels, SIWES, Clearance, NYSC

🇳🇬 *Nigerian Education:*
  • JAMB, WAEC, NECO, NYSC
  • All Nigerian universities
  • Scholarships & student loans

🌍 *Worldwide Knowledge:*
  • Physics, Maths, Chemistry, Biology
  • International scholarships
  • Any question in the world!

━━━━━━━━━━━━━━━━━━━━
🔍 *Powered by Google Search — always up to date!*

/help — Examples  |  /clear — Reset  |  /about — Info

_Built by *DTZ TRIO* 👨‍💻_
`);
});

// ─── /help ────────────────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  safeSend(msg.chat.id, `
📋 *DTZ-Bot Help*

Just type your question! Examples:

*🏫 FUTMinna:*
  • "How do I register courses?"
  • "What is first class CGPA in FUTMinna?"
  • "How do I pay school fees?"
  • "SIWES requirements for engineering"

*🇳🇬 Nigeria:*
  • "JAMB cutoff for UNILAG Medicine"
  • "How to register for WAEC 2025"
  • "NYSC registration steps"
  • "Nigerian government scholarships"

*🌍 World:*
  • "Explain Newton's second law"
  • "Scholarships for Nigerian students in UK"
  • "How to apply to Canadian universities"
  • "Best programming languages to learn"

/clear — Clear memory  |  /about — About bot
`);
});

// ─── /about ───────────────────────────────────────────────────────────────────
bot.onText(/\/about/, (msg) => {
  safeSend(msg.chat.id, `
ℹ️ *About DTZ-Bot*

DTZ-Bot is an AI assistant for FUTMinna and beyond — with real-time internet search built in.

🤖 *AI Engine:* Google Gemini
🔍 *Search:* Google Search (real-time)
🏫 *Focus:* FUTMinna + All of Nigeria + World
📍 *University:* futminna.edu.ng

👨‍💻 *Developed by:* DTZ TRIO

✅ Searches internet like Google
✅ Reasons like ChatGPT/Gemini
✅ Deep FUTMinna knowledge
✅ All Nigerian universities
✅ Any academic question
✅ 24/7, always free
✅ Understands Nigerian Pidgin

_"Technology for Service"_ 🔵⚪
_Built with ❤️ by DTZ TRIO_
`);
});

// ─── /clear ───────────────────────────────────────────────────────────────────
bot.onText(/\/clear/, (msg) => {
  clearHistory(msg.chat.id);
  bot.sendMessage(msg.chat.id, "🗑️ Memory cleared! Fresh start. What would you like to know?");
});

// ─── Main message handler ─────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith("/")) return;

  const userName = msg.from.first_name || "User";

  // Persistent typing indicator
  bot.sendChatAction(chatId, "typing");
  const typingInterval = setInterval(() => {
    bot.sendChatAction(chatId, "typing").catch(() => {});
  }, 4000);

  try {
    const history = getConversationHistory(chatId);
    const model = getModel();

    // Build chat with history
    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });

    // Add user identity context
    const messageWithContext = `[User: ${userName}]\n${text}`;
    const result = await chat.sendMessage(messageWithContext);
    const reply = result.response.text();

    // Save to memory
    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: reply });
    logConversation(chatId, history);

    // Send reply (split if long)
    const parts = splitMessage(reply);
    for (const part of parts) {
      await safeSend(chatId, part);
    }
  } catch (err) {
    console.error("Error:", err.message);
    await bot.sendMessage(
      chatId,
      `⚠️ Error: ${err.message}\n\nPlease try again or type /start to restart.`
    );
  } finally {
    clearInterval(typingInterval);
  }
});

// ─── Polling error ────────────────────────────────────────────────────────────
bot.on("polling_error", (err) => console.error("Polling:", err.code));

console.log("🤖 DTZ-Bot (Gemini + Google Search) is running...");
