# ExpenseIQ – Full-Stack Expense Tracker

A production-ready, cloud-synchronized expense tracker built with **React + Firebase**. Features Google authentication, real-time data sync, rich analytics, budget planning, and a modern responsive UI.

---

## ✨ Features

- 🔐 **Google Sign-In** with Firebase Authentication
- ☁️ **Real-time cloud sync** via Firestore `onSnapshot`
- 💰 **Full CRUD** – add, edit, delete, view expenses
- 📊 **Analytics Dashboard** – pie, bar, and area charts
- 🏷️ **Categories** – default + custom with icons & colors
- 🎯 **Budget Planner** – monthly limits per category with progress bars & alerts
- 🔍 **Search & Filters** – by title, category, date range
- 📤 **CSV Export** – download filtered expenses
- 🌙 **Dark / Light mode** toggle (persisted)
- 📱 **Responsive design** – mobile + desktop sidebar
- ⚡ **Performance** – lazy-loaded pages, debounced search, memoized computations
- 🛡️ **Security** – Firestore rules enforce per-user data isolation

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd expenses-tracker
npm install
```

### 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication → Google Sign-In**
4. Create a **Firestore Database** (start in production mode)
5. Go to **Project Settings → Your Apps → Web** and grab the config

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, use firestore.rules
firebase deploy --only firestore:rules
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
src/
├── firebase/
│   └── config.js               # Firebase initialization
├── context/
│   ├── AuthContext.jsx          # Auth state + Google login
│   ├── ExpenseContext.jsx       # Expenses state + CRUD
│   ├── CategoryContext.jsx      # Categories state + CRUD
│   ├── BudgetContext.jsx        # Budget state
│   └── ThemeContext.jsx         # Dark/Light mode
├── services/
│   ├── expenseService.js        # Firestore expense CRUD
│   ├── categoryService.js       # Firestore category CRUD + defaults
│   ├── budgetService.js         # Firestore budget CRUD
│   └── profileService.js       # Firestore user profile
├── hooks/
│   └── useDebounce.js           # Debounce hook
├── utils/
│   ├── formatters.js            # Currency, date, grouping helpers
│   └── csvExport.js             # CSV download utility
├── components/
│   ├── Layout.jsx               # App shell (sidebar + main)
│   ├── Sidebar.jsx              # Navigation sidebar
│   ├── Navbar.jsx               # Top header bar
│   ├── ExpenseModal.jsx         # Add/Edit expense form
│   └── ui/
│       ├── StatsCard.jsx        # Dashboard stat card
│       ├── LoadingSpinner.jsx   # Loading indicator
│       ├── ConfirmDialog.jsx    # Confirmation modal
│       └── Toast.jsx            # Toast notification system
├── pages/
│   ├── Login.jsx                # Google login page
│   ├── Dashboard.jsx            # Analytics overview
│   ├── Expenses.jsx             # Expense list + CRUD
│   ├── Categories.jsx           # Category management
│   ├── Budget.jsx               # Budget planner
│   └── Profile.jsx              # User settings
├── routes/
│   └── PrivateRoute.jsx         # Auth guard
├── App.jsx                      # Router + Provider tree
└── main.jsx                     # Entry point
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Styling | TailwindCSS 3 |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Firebase Firestore |
| Auth | Firebase Authentication (Google) |
| Dates | Native JS + date-fns |

---

## 🛡️ Firestore Security Rules

Each user's data is strictly isolated:

```
/users/{uid}/expenses/{expenseId}  → only {uid} can read/write
/users/{uid}/categories/{id}       → only {uid} can read/write
/users/{uid}/budgets/{id}          → only {uid} can read/write
/users/{uid}/profile/info          → only {uid} can read/write
```

---

## 🌍 Deployment

### Firebase Hosting

```bash
npm run build
firebase init hosting   # dist folder, SPA rewrite
firebase deploy
```

### Vercel

```bash
npm run build
vercel --prod
```

---

## 🧪 Manual Test Checklist

- [ ] Google Login / Logout works
- [ ] Expenses persist after page refresh
- [ ] CRUD: Add, edit, delete expense
- [ ] Real-time: open two tabs, changes reflect instantly
- [ ] Filters: category, date range, search work together
- [ ] Dashboard charts update after adding expenses
- [ ] Budget: set limit → add expenses → see progress bar
- [ ] Categories: add custom → appears in expense form
- [ ] Export CSV downloads correct data
- [ ] Dark mode persists on reload
- [ ] Mobile responsive sidebar toggle
- [ ] Second Google account cannot access first user's data (security rules)
