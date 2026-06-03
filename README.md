# 🤖 DTZ-Bot v2.0 — FUTMinna AI Assistant

> **The internet-powered AI chatbot for FUTMinna students, staff, and the world.**  
> Built by **DTZ TRIO** — combining Claude AI + real-time web search.

---

## 👨‍💻 Developed by DTZ TRIO

---

## ⚡ What's New in v2.0

| Feature | v1.0 | v2.0 |
|--------|------|------|
| FUTMinna knowledge | ✅ | ✅ Enhanced |
| Real-time internet search | ❌ | ✅ **Always live** |
| Nigerian universities | Basic | ✅ Deep |
| World knowledge | Limited | ✅ Full |
| Pidgin language | ✅ | ✅ Enhanced |
| Auto-updating info | ❌ | ✅ Via web search |
| Long message handling | ❌ | ✅ Auto-split |
| Typing indicator | Basic | ✅ Persistent |

---

## 🌟 Capabilities

### 🏫 FUTMinna (Built-in + Live Search)
- All 8 schools and 40+ departments
- Course registration, CGPA, grading system
- School fees, payment procedures
- Admission (UTME, DE, Postgraduate)
- SIWES, clearance, NYSC mobilisation
- Staff info, promotions, TETFund
- Hostels, campus life, clubs
- Latest news and announcements

### 🇳🇬 Nigerian Education
- JAMB, WAEC, NECO, NABTEB
- All federal and state universities
- NYSC registration and process
- NELFUND student loans
- Nigerian scholarships and bursaries

### 🌍 World Knowledge (via live search)
- Physics, Chemistry, Biology, Mathematics
- Computer Science, Engineering
- International universities (Oxford, Harvard, MIT, etc.)
- Global scholarships and study abroad
- Career guidance and professional development
- Any question anywhere in the world

---

## 🚀 Setup

### Prerequisites
- Node.js v18+
- Telegram Bot Token → [@BotFather](https://t.me/BotFather)
- Gemini API Key → [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/proxima-98/DTZ_TRIO_BOT.git
cd DTZ_TRIO_BOT

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

### Step 3: Add Your API Keys

**Open `.env` in your editor and add your actual tokens:**

```
# .env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here
```

**How to get your keys:**
- **TELEGRAM_BOT_TOKEN**: Message [@BotFather](https://t.me/BotFather) on Telegram and create a new bot
- **GEMINI_API_KEY**: Go to [aistudio.google.com](https://aistudio.google.com/app/apikey), sign in, and click "Get API Key" (free forever)

### Continue Setup

```bash
# 4. Start the bot
npm start

# Development (auto-restart with nodemon)
npm run dev
```

---

## 📁 File Structure

```
dtz-bot/
├── bot.js          → Main bot logic, commands, message handling
├── prompts.js      → AI system prompt + FUTMinna knowledge base
├── memory.js       → Per-user conversation history
├── package.json    → Dependencies
├── .env.example    → Environment template (commit this)
├── .env            → Your local keys (DO NOT commit - in .gitignore)
└── README.md       → This file
```

**⚠️ Important:** Never commit `.env` to Git! It's already in `.gitignore`.

---

## 💬 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Help with examples |
| `/about` | About DTZ-Bot & DTZ TRIO |
| `/clear` | Clear conversation memory |
| `/search [query]` | Force a live web search |

---

## 🌐 Deployment

### Option A — Render (Free)
1. Push to GitHub
2. New Web Service on [render.com](https://render.com)
3. Add environment variables in Render dashboard
4. Deploy

### Option B — Railway
1. Push to GitHub
2. New project on [railway.app](https://railway.app)
3. Add environment variables in Railway dashboard
4. Deploy

### Option C — VPS (Ubuntu)
```bash
# Install PM2 for process management
npm install -g pm2
pm2 start bot.js --name dtz-bot
pm2 save
pm2 startup
```

---

## 🏫 About FUTMinna

**Federal University of Technology, Minna**  
Gidan Kwano Campus, Minna, Niger State, Nigeria  
🌐 [futminna.edu.ng](https://futminna.edu.ng)  
_"Technology for Service"_

---

## 📄 License

MIT © **DTZ TRIO**
