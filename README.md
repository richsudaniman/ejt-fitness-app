<div align="center">

# 🏋️ EJT Fitness

**An agency platform EJT Fitness uses to manage its trainers and clients.**

![Status](https://img.shields.io/badge/status-in%20production-brightgreen)
![Trainers](https://img.shields.io/badge/trainers-2-orange)
![Clients](https://img.shields.io/badge/active%20clients-32-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)
![Base44](https://img.shields.io/badge/Built_with-Base44-000000)

</div>

---

A fitness agency platform in production use by EJT Fitness to manage
**2 trainers and 32 clients**.

## 📑 Table of Contents

- [My Role](#my-role)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)

## My Role

I designed and built this app for EJT Fitness using Base44, an AI-powered
app platform that provides authentication, database, hosting, and AI-assisted
code generation. I used Base44 to move fast on scaffolding and standard UI,
and hand-built the parts that needed custom logic:

- **Passio API integration:** built the full integration with Passio's food
  recognition API myself, powering meal identification from photos, image
  uploads, and barcode entry
- **AI calorie reader:** hand-coded the calorie reading flow using Base44's
  InvokeLLM, turning food images into structured calorie and macro data
- **Progress analytics:** hand-coded the analytics that turn client data
  (weight, body composition, lifts, goals) into trends trainers and clients
  can act on
- **Trainer–client assignment debugging:** diagnosed and fixed issues in how
  clients were assigned to trainers, making sure each trainer saw the right
  clients and each client got the right plans
- **Client delivery:** worked with EJT Fitness to gather requirements, roll
  the app out to their 32 clients, and iterate based on feedback

## ✨ Features

The app supports three roles, each with its own dashboard.

### 👤 Clients
- **Workouts:** view and follow trainer-assigned fitness plans
- **Nutrition:** log meals by photo, image upload, or barcode, with automatic calorie and macro tracking
- **Progress:** track weight, body composition, and lifts over time with charts
- **Learn:** educational articles and videos from the coaching team
- **Messages:** chat directly with their trainer

### 🧑‍🏫 Trainers
- **Client roster:** see assigned clients and drill into each client's details
- **Plan assignment:** assign and monitor workout plans
- **Messaging and videos:** communicate with clients and share exercise videos
- **Trainer profile:** manage their public profile

### 🛠️ Admins
- **Analytics dashboard:** platform-wide usage and progress insights
- **User and trainer management:** invite users and manage trainer–client assignments
- **Content management:** publish announcements, educational content, and videos

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router |
| **Styling / UI** | Tailwind CSS, Radix UI, shadcn/ui, Framer Motion, Lucide icons |
| **Data & State** | TanStack Query, React Hook Form, Zod |
| **Charts** | Recharts |
| **Backend / Platform** | Base44 (auth, database, hosting, serverless functions) |
| **AI & APIs** | Passio food recognition API, Base44 InvokeLLM |
| **Tooling** | ESLint, TypeScript type-checking, PostCSS |

## 📁 Project Structure

```
ejt-fitness-app/
├── base44/
│   ├── entities/        # Data models
│   ├── functions/       # Serverless backend functions
│   └── config.jsonc
├── src/
│   ├── api/             # Base44 client and API integrations
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Shared utilities
│   ├── pages/           # Client, Trainer, and Admin pages
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm
- A Base44 account and app (for auth, database, and functions)

### Installation

```bash
git clone https://github.com/richsudaniman/ejt-fitness-app.git
cd ejt-fitness-app
npm install
npm run dev
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type-checking |

## 📬 Contact

Built by **Jalal Abdelrahim** · [GitHub](https://github.com/richsudaniman)
