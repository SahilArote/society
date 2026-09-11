# GreenGate Resident PWA

A modern, production-grade Progressive Web App (PWA) for residential society management, visitor approvals, household members, and gate security.

Designed and engineered to deliver an authentic **100% Native Mobile App Experience** when installed on Android or iOS devices.

---

## 📖 Complete Documentation

For detailed architectural breakdown, screen catalog, PWA install mechanics, and test matrix:
👉 **[View Full PWA Documentation (PWA_DOCUMENTATION.md)](./PWA_DOCUMENTATION.md)**

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build & Test PWA Service Worker
```bash
npm run build
npm run preview
```
Open `http://localhost:4173` to test PWA Service Worker caching, offline capabilities, and native install prompts.

---

## 🌟 Key Highlights

- **Native App Feel:** Rigid 100dvh layout, momentum scrolling, zero browser bounce, and safe-area insets (`env(safe-area-inset-*)`).
- **PWA Installation System:** Custom install manager with `beforeinstallprompt` interception, 1-tap Android installation, and iOS Safari step-by-step guidance bottom sheet.
- **Service Worker (`sw.js`):** Offline caching with stale-while-revalidate for assets and network-first for SPA navigation.
- **Instant Gate Approvals:** Real-time bottom sheet notification allowing residents to allow or deny visitor entries in 1 tap without leaving the screen.
- **Visitor Passes:** Shareable digital gate passes with QR codes for guests and deliveries.
- **Household & Vehicles:** Multi-member role management, vehicle registration, and parking slot allocations.

---

## 📱 Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS (Custom mobile tokens & safe areas)
- **Icons:** Lucide React
- **Routing:** React Router 7
