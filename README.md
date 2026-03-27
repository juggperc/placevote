<div align="center">
  <img src="public/favicon.svg" alt="Placevote Logo" width="120" height="120" />
  <h1>🏛️ Placevote</h1>
  <p><strong>Next-Generation Civic Intelligence & Geospatial Analytics</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
    <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </p>
</div>

<br />

Placevote is a comprehensive, data-driven civic intelligence platform designed to empower local governments and council planners. By combining **Deep-Learning-based Friction Analysis**, **Automated Executive Reporting**, and **Geospatial Insights**, Placevote synthesizes fragmented civic data (demographics, budgeting, planning objections) into a unified, actionable intelligence interface.

---

## ✨ Features

- **🌐 Interactive Geospatial Mapping**: Heatmaps of community friction scores natively overlaid on live Leaflet map tile components using OpenStreetMap and Victoria SA2 data.
- **🤖 Actionable AI Intelligence**: Powered by **Grok 4.1 Fast** via OpenRouter. Generate interactive visual charts, deep queries, and instantly export styled PDF Executive Action Briefs natively in the UI.
- **🔗 Knowledge Graph Extraction**: Automatically unpack underlying semantic relationships across raw council budgets, planning proposals, and community complaints (Shapefiles, CSV, PDF) directly into structured Postgres Ontology edges.
- **⚡ Background Event Pipeline**: Robust background task ingestion powered by **Inngest** handling dead-letter fallback queues.
- **🛡️ Enterprise-Grade Security**: Global API Rate Limits leveraging Upstash Redis and inline Zod validation paired with granular Clerk authentication scoping rules.

---

## 🛠️ Technology Stack

- **Frontend Core:** React, Vite, TailwindCSS, Shadcn, Zustand, React Leaflet (Geospatial), @react-pdf/renderer
- **Backend Edge Operations:** Vercel Edge Serverless Functions, AI SDK Web Streams
- **Infrastructure & Queueing:** Vercel Blob (Storage), Inngest (Event Pipelines)
- **Database & Architecture:** Neon (Serverless Postgres), Drizzle ORM
- **Intelligence Model:** OpenRouter (x-ai/grok-4.1-fast)
- **Security & Delivery:** Clerk (Authentication), Upstash Redis (Sliding-Window Rate Limits)

---

## 🚀 Running Locally

Follow these steps to configure the application environment for local development:

### 1. Prerequisite Installations

Ensure you have [Node.js](https://nodejs.org/) (v18+) and `npm` installed.

```bash
git clone https://github.com/juggperc/placevote.git
cd placevote
npm install --legacy-peer-deps
```

### 2. Environment Variables Integration

Duplicate the local configuration templates:

```bash
cp .env.example .env.local
```

You will need to procure keys for each service integrated within the stack:

1. **Clerk**: Create an application at [Clerk.com](https://clerk.com). Extract standard Publishable and Secret parameters. Add a database Webhook to natively sync `user.created` / `user.deleted` actions mirroring down to your database.
2. **Neon Database**: Boot up a free-tier [Neon Postgres](https://neon.tech/) instance.
3. **OpenRouter**: Fetch an API gateway key directly from [OpenRouter](https://openrouter.ai/). 
4. **Vercel Blob**: Inside your Vercel Project Dashboard → Storage, provision a Blob Store to grant read/write access.
5. **Inngest Event Pipeline**: Procure your Event Key and Signing Secret by syncing your local environment onto the [Inngest Cloud Dashboard](https://www.inngest.com/).
6. **Upstash Redis**: Navigate to [Upstash](https://upstash.com/), create a Serverless Redis instance, and copy your REST connection structures.

### 3. Database Migration Engine

Push your core Schema logic securely into your active Postgres database:

```bash
npx drizzle-kit push
```

### 4. Background Servicer Boot-up

Inngest requires a locally mirroring dev-server to correctly intercept backend triggers emitted natively during local app development. Open a separate terminal and run:

```bash
npx inngest-cli@latest dev -u http://localhost:3001/api/inngest
```

### 5. Launch the Client

Spin up the localized Vercel-like routing architecture running tightly over Vite:

```bash
npm run dev
```

Visit `http://localhost:3001`!

---

## 🌩️ Production Vercel Deployment

Deploying Placevote into a hardened, highly available Edge environment only takes moments via Vercel:

1. **Connect Repository on Vercel**
   Create a new project on your Vercel dashboard and connect the relevant GitHub repository targeting the `main` branch.

2. **Configure Environment Keys**
   Under Settings > Environment Variables, securely map **ALL** of the keys found within your local `.env.local` directly into the Vercel Production Environment pipeline. Ensure `VITE_API_BASE_URL` mirrors your live application domain *(e.g. `https://placevote.vercel.app/api`)*.

3. **Install Core Vercel Integrations (Optional but Recommended)**
   Use Vercel dashboard native integrations to bind Clerk, Upstash and Blob organically.

4. **Inngest Sync Configuration**
   Remember to head to the Inngest Cloud Dashboard configuration and ensure the **Endpoint URL** correctly points back to your live Vercel deploy:
   `https://[YOUR_VERCEL_DOMAIN]/api/inngest`

5. **Deploy!**
   Click Deploy! The `vercel.json` already contains localized configurations maximizing region stability (`syd1`) alongside dynamic 30s Serverless duration scaling rules explicitly configured.

---

<div align="center">
  <p>Built for Civic Intelligence by Placevote.</p>
</div>
