## Project: Full-Stack Expense Tracker (React + Google Login + Cloud Sync)


## 🎯 Objective

Build a **fully functional Expense Tracker Web App** using **React (frontend)** and **Firebase (backend)** where:

* Users authenticate using **Google Login**
* Each user’s expense data is stored securely in the cloud
* Users can access their expenses from any device
* Data persists in real time
* App includes full CRUD functionality
* Dashboard shows analytics and summaries

The AI agent must implement a production-ready, secure, scalable application.

---

# 🏗️ Tech Stack

### Frontend

* React (with Vite or Create React App)
* React Router
* Context API or Redux Toolkit
* Chart.js or Recharts
* TailwindCSS or Material UI

### Backend (BaaS)

* Firebase Authentication (Google Sign-In)
* Firebase Firestore (Database)
* Firebase Hosting (Optional deployment)

---

# 🔐 Authentication Requirements

## 1️⃣ Google Login

* Use Firebase Authentication
* Only Google Sign-In method enabled
* Implement:

  * Login
  * Logout
  * Auth state persistence
  * Auto-login if session exists

## 2️⃣ User Data Isolation

* Each user's expenses must be stored under their UID
* Structure:

```
users/
   {uid}/
       profile
       expenses/
           expenseId
```

## 3️⃣ Firestore Security Rules

Ensure:

* Users can only read/write their own data
* No public access

Example rule structure:

```
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

# 📊 Core Features

---

## 1️⃣ Expense CRUD

Each expense must include:

* id
* title
* amount
* category
* date
* notes (optional)
* createdAt
* updatedAt

### Required Operations:

* Add expense
* Edit expense
* Delete expense
* View expense list
* Filter expenses
* Sort expenses

---

## 2️⃣ Categories

Default categories:

* Food
* Travel
* Shopping
* Bills
* Health
* Entertainment
* Others

Features:

* User can create custom categories
* User can edit/delete custom categories

---

## 3️⃣ Dashboard & Analytics

Include:

* Total expense (this month)
* Total expense (this year)
* Category-wise breakdown
* Monthly comparison
* Recent transactions

Charts:

* Pie chart (category distribution)
* Bar chart (monthly expenses)
* Line chart (spending trend)

---

## 4️⃣ Filters & Search

Implement:

* Filter by date range
* Filter by category
* Search by title
* Sort by:

  * Date
  * Amount
  * Category

---

## 5️⃣ Budget Feature (Optional but Recommended)

Allow users to:

* Set monthly category budget
* Get warning if exceeding budget
* Display progress bar per category

---

# 📁 Folder Structure

```
src/
 ├── components/
 ├── pages/
 ├── context/
 ├── hooks/
 ├── services/
 ├── utils/
 ├── firebase/
 ├── routes/
 └── App.jsx
```

---

# 🧠 State Management

Must manage:

* Auth state
* User profile
* Expenses
* Categories
* Filters

Use:

* Context API (small-medium app)
  OR
* Redux Toolkit (recommended for scalability)

---

# 🔄 Real-Time Sync

* Use Firestore real-time listeners (`onSnapshot`)
* Updates reflect instantly across devices
* No manual refresh required

---

# 📱 UI Requirements

* Modern Premium UI responsive design (mobile + desktop)
* Clean dashboard layout
* Sidebar navigation
* Loading states
* Empty states
* Error handling messages
* Confirmation dialogs before deletion

---

# 🚀 Performance Optimization

* Use memoization where needed
* Lazy load pages
* Pagination for large expense lists
* Debounce search input

---

# 🛡️ Validation & Error Handling

Validate:

* Amount must be positive number
* Title required
* Date required
* Prevent duplicate submission

Handle:

* Network errors
* Firebase errors
* Auth errors
* Unauthorized access

---

# 🧾 Additional Features (Advanced)

Implement if possible:

* Export to CSV
* Dark/Light mode toggle
* Profile page
* Income tracking
* Balance calculation
* PWA support
* Offline caching
* Multi-currency support

---

# 🔧 Environment Configuration

Use `.env` file:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Never expose secrets directly in code.

---

# 🧪 Testing Requirements

* Unit tests for:

  * Expense calculations
  * Utility functions
* Integration test for:

  * Auth flow
  * CRUD operations
* Manual test cases for:

  * Multi-device sync
  * Data isolation

---

# 🌍 Deployment

* Deploy to Firebase Hosting OR Vercel
* Enable HTTPS
* Configure domain properly
* Ensure Firestore rules are deployed

---

# ✅ Acceptance Criteria

The implementation is complete only if:

* Google Login works
* Data persists per user
* CRUD works perfectly
* Real-time sync works
* Dashboard shows correct analytics
* Security rules prevent cross-user access
* App is responsive
* No console errors
* Proper error handling implemented

---

# 📦 Final Deliverables

The AI agent must generate:

* Fully functional React project
* Firebase configuration
* Clean reusable components
* Firestore security rules
* README.md with setup instructions
* Deployed production-ready build

---

# ⚠️ Important Implementation Rules

* Use functional components only
* Use modern React Hooks
* No class components
* Clean, maintainable, scalable code
* Follow best practices
* Use async/await properly
* Avoid hardcoding values
* Write modular reusable components

---

# 🎯 End Goal

A secure, cloud-based, multi-device synchronized, production-ready expense tracker with Google authentication and analytics dashboard.
