# ✈️ Trip-Chakrata-Tracker

> Real-time trip expense splitter for friend groups — built with Firebase.

## 🌟 Features

- **Real-time sync** — all 7 friends see updates instantly via Firebase Realtime DB
- **Day/Category tagging** — Pre-Trip, Day 1–5, Hotel, or custom days
- **Multi-payer support** — multiple people can split a single payment
- **Smart settlement** — minimizes the number of transactions needed
- **Per-person breakdown** — see exactly what each person paid and owes
- **Copy & Share** — share the final settlement via text or clipboard

## 👥 Members

Saloni · Dewaang · Chehak · Khushi · Priyam · Devansh · Bharat

## 🚀 Deploy on Netlify

1. Fork / clone this repo
2. Connect to Netlify → **New Site from Git**
3. Build settings:
   - **Publish directory:** `.` (root)
   - No build command needed (static site)
4. Click **Deploy**

Or drag-and-drop the folder at [app.netlify.com/drop](https://app.netlify.com/drop).

## 🔥 Firebase Setup

The app uses Firebase Realtime Database.

**Database URL:** `https://trip-helper-10270-default-rtdb.firebaseio.com`

**Rules** (set in Firebase Console → Realtime Database → Rules):
```json
{
  "rules": {
    ".read": "now < 1792953000000",
    ".write": "now < 1792953000000"
  }
}
```

## 📁 Project Structure

```
Trip-Chakrata-Tracker/
├── index.html          # Main app
├── css/
│   └── style.css       # Dark theme design system
├── js/
│   └── app.js          # Firebase + settlement logic
├── netlify.toml        # Netlify config + CSP headers
└── README.md
```

## 🧮 Settlement Algorithm

Uses a greedy debt minimization algorithm:
1. Compute net balance per person (paid − share)
2. Match largest debtors against largest creditors
3. Produces the minimum number of transactions

## 🛠️ Tech Stack

- Vanilla JS + HTML + CSS (zero build step)
- Firebase Realtime Database (for live sync)
- Google Fonts (Inter + Space Grotesk)
- Deployed via Netlify

---

Made with ❤️ for the Trip 2026 crew 🌄
