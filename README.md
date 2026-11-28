# 🥬 FreshSave – Smart Food Expiry & Waste Predictor

**Track Your Food. Beat Expiry. Save Money. Reduce Waste.**

FreshSave is a futuristic, browser-based food management and waste-prevention platform designed to help users manage groceries, monitor food expiry dates, reduce household food waste, and save money.

It brings grocery inventory management, expiry tracking, food consumption monitoring, financial analytics, personalized recommendations, and an admin dashboard together in one place.

Built with a cyberpunk-inspired interface and a browser-local architecture, FreshSave works without API keys, external AI services, or backend dependencies in the current demo version.

---

## 🌟 Why FreshSave?

Food waste often begins with something simple: forgetting what's inside the refrigerator.

People purchase groceries but sometimes forget about them, overlook expiry dates, buy duplicate items, or fail to consume food before it spoils.

Traditional grocery lists help people remember what to buy, but they don't necessarily help them manage what they already own.

**FreshSave aims to solve this problem.**

Instead of simply storing grocery information, FreshSave transforms it into useful insights that help users make smarter decisions about their food.

> Make food waste visible, make food management smarter, and make responsible consumption easier.

---

## ✨ Key Features

### 1. 🚀 Futuristic Cyberpunk Interface

- Animated cyberpunk boot-up introduction
- Holographic rings, neon scanlines, and loading animations
- Skip and replay intro functionality
- Dark-themed neon dashboard
- Responsive desktop sidebar and mobile navigation
- Smooth transitions and interactive UI elements

### 2. 🛒 Smart Grocery Inventory Management

- Add, edit, and delete grocery items
- Starts with a completely empty inventory
- Store grocery name, category, quantity, unit, and purchase date
- Optional expiry dates
- Search, filter, and sort groceries
- Undo deletion functionality
- Browser-based data persistence

### 3. ⏳ Intelligent Expiry Date Tracking

FreshSave monitors grocery expiry dates and calculates the remaining shelf-life days.

It also provides category-based estimated expiry suggestions when users don't provide an expiry date.

| Food Category | Estimated Default |
|---|---:|
| Produce | 5 days |
| Dairy & Eggs | 5 days |
| Meat & Seafood | 2 days |
| Bakery | 3 days |
| Leftovers | 3 days |
| Pantry | Unscheduled |
| Beverages | Unscheduled |

Users can manually override or remove estimated expiry dates.

**Color-coded expiry statuses:**

- 🟢 Emerald – Fresh
- 🟡 Amber – Expiring Soon
- 🔴 Crimson – Expired
- 🟣 Fuchsia – Unscheduled

*Category-based dates are reminders, not guaranteed food-safety or manufacturer-confirmed expiry dates.*

### 4. 📊 Smart Food Dashboard

- Total grocery count
- Fresh and unscheduled items
- Expiring soon alerts
- Expired item alerts
- Live expiry breakdown donut chart
- Category distribution chart
- Quick list of groceries requiring attention

### 5. 💰 Grocery Purchase Price Tracking

- Optionally record grocery purchase prices in INR (₹)
- Track purchase quantities and total costs
- Calculate price per unit
- Estimate the remaining monetary value of inventory
- Handle groceries without recorded prices

### 6. ♻️ Food Consumption & Waste Tracking

Track what happens to groceries after purchasing them.

**Consumption Tracking:**

- Mark groceries as consumed
- Record full or partial quantities
- Calculate estimated consumption value
- Maintain consumption history

**Food Waste Tracking:**

- Mark groceries as wasted
- Record partial or full wasted quantities
- Select reasons such as expired, spoiled, forgotten, or over-purchased
- Calculate estimated financial losses
- Maintain a separate waste history

Expired groceries are not automatically classified as wasted. Users explicitly record actual food waste.

### 7. 📈 Food Waste & Money Saved Analytics

Understand the financial and environmental impact of grocery habits.

**Financial Analytics:**

- Total Money Saved
- Food Wasted
- Food Waste Prevented
- Total Food Consumed
- Total grocery spending
- Estimated financial losses
- Current inventory value
- Upcoming expiry value at risk

**Interactive Visualizations:**

- Food waste breakdown donut chart
- Monthly waste trends
- Spending versus waste comparison
- Waste by food category

**Additional Insights:**

- Weekly and monthly reports
- Date-based analytics filters
- CSV export and printable reports
- Environmental impact estimates
- Estimated CO₂-equivalent emissions avoided
- Rule-based personalized waste insights
- Waste-reduction goals
- Achievement badges and streaks

### 8. 🧠 Rule-Based Smart Recommendations

FreshSave uses local JavaScript rules to generate useful food-management recommendations.

- Identify groceries that should be consumed first
- Prioritize items approaching expiry
- Warn users about expired groceries
- Provide food-specific storage recommendations
- Highlight opportunities to prevent food waste

No external AI service is required.

### 9. 🍳 Local Recipe Finder

- Built-in recipe database
- Match recipes against available grocery ingredients
- Identify recipes using ingredients approaching expiry
- Help users discover meals using groceries they already own

### 10. 🧊 Food Storage Guide

- Food-specific storage recommendations
- Refrigerator storage guidance
- Freezing recommendations
- Food date-label information
- Practical tips to help extend food shelf life

### 11. 🛠️ Admin Dashboard

FreshSave includes an Admin Dashboard designed to provide an overview of available application data.

- View grocery inventory statistics
- Monitor consumption and food waste data where available
- View savings-related statistics where tracked
- Review category breakdowns and activity
- Refresh dashboard data
- Reads data from the same browser's LocalStorage in the current demo

The current dashboard is a working local prototype. Centralized collection and cross-user analytics are planned future improvements.

---

## ⚙️ Technology & Architecture

FreshSave currently uses a lightweight, browser-local architecture.

| Technology / Component | Purpose |
|---|---|
| HTML | Application structure |
| CSS | Styling and responsive design |
| JavaScript | Application logic and interactions |
| Browser LocalStorage | Local data persistence |
| JavaScript Date API | Expiry-date calculations |
| JavaScript rule logic | Recommendations and recipe matching |
| Charting components | Dashboard and analytics visualizations, where used |

### 🔒 Privacy-First & Browser-Local

The current demo is local-first:

- No backend server required
- No API keys required
- No external AI dependencies
- Grocery information is stored in browser LocalStorage
- Core features operate without external services
- No mandatory account registration
- Admin Dashboard reads the browser's locally stored FreshSave data

**The current Admin Dashboard does not display global user data.** It can only read data available in the same browser's storage.

LocalStorage is tied to the browser and device. Clearing browser data can remove saved information. Data is not automatically shared between different browsers, devices, or users.

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser
- A code editor such as Visual Studio Code
- The project source code

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/FreshSave.git
   ```

2. Navigate into the project directory:

   ```bash
   cd FreshSave
   ```

3. Open the project in your preferred code editor.

4. Run the application using the development or preview method configured by your project.

   - If it is a standalone HTML application, open its `index.html` file in a browser.
   - If it uses a development framework, follow the commands specified in its `package.json`.

5. Start adding groceries and explore FreshSave.

6. Open the Admin Dashboard from the website or visit `/admin` on the same site to view locally stored demo data.

### 🌐 Live Demo

[https://freshsave-ten.vercel.app/](https://freshsave-ten.vercel.app/)

---

## 🧮 How FreshSave Works

The application follows a simple food-management workflow:

1. **Add:** Enter groceries into your personal inventory.
2. **Track:** Monitor expiry dates and remaining shelf life.
3. **Prioritize:** Identify groceries that need attention.
4. **Discover:** Find recipes and storage recommendations.
5. **Record:** Track consumed and wasted food.
6. **Analyze:** Understand financial losses, savings, and food-waste patterns.
7. **Improve:** Make smarter grocery purchasing and consumption decisions.
8. **Review:** Use the demo Admin Dashboard to inspect data available in the same browser.

---

## 🔮 Future Improvements

FreshSave has the potential to evolve into a more advanced food intelligence ecosystem.

Potential future enhancements include:

- **Barcode Scanning:** Scan grocery products to simplify inventory entry.
- **AI Food Recognition:** Identify food items through camera-based image recognition.
- **Smart Meal Planner:** Generate personalized meal plans using available ingredients.
- **Smart Fridge Visualization:** Interactive refrigerator compartments for organizing groceries.
- **Advanced Waste Prediction:** Analyze historical consumption patterns to identify frequently wasted foods.
- **Cloud Synchronization:** Optional household inventory sharing across devices.
- **Centralized Admin Analytics:** Collect application data through a backend/API and provide aggregated statistics across users.
- **Community Food Sharing:** Help users discover opportunities to responsibly redistribute surplus food.

---

## 🎯 Project Vision

FreshSave is built around the belief that reducing food waste starts with better everyday decisions.

By combining grocery management, expiry awareness, consumption tracking, and financial insights, we aim to make responsible food management accessible and practical for everyone.

We don't just want people to know what food they have.

We want to help them understand what to do with it before it goes to waste.

**Less Waste. More Savings. Smarter Living.**

---

## 👨‍💻 Project Information

| | |
|---|---|
| **Project Name** | FreshSave |
| **Project Category** | Sustainability / Food Technology / Productivity |
| **Architecture** | Browser-local web application |
| **Data Storage** | Browser LocalStorage |
| **Admin Dashboard** | Local demo dashboard reading browser data |
| **Backend / API** | Not used in the current demo version |
| **Built for** | PROMPTWARS × AI VIBEATHON 2026 |

---

<p align="center">

### 🥬 Less Waste. More Savings. Smarter Living.

</p>
