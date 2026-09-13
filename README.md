# LifeGPT — Personal Behavioural Analytics & AI Digital Twin

A full-stack personal analytics app: log daily habits, get predictions of your own future behaviour, and compare "AI vs Reality" — built and deployed as a real product, not a notebook.

**Live:** [life-gpt-six.vercel.app](https://life-gpt-six.vercel.app)

## What it does

- Self-logged daily habit and behaviour tracking
- Predictive modelling of upcoming daily habits from historical logs
- An LLM layer (Gemini) for natural-language insight generation — explicitly guardrailed to reason only over data actually logged, so it cannot invent statistics
- "AI vs Reality" comparison views showing predicted vs. actual behaviour
- Installable as a Progressive Web App (manifest, icons, service worker), including LAN access so it can be used from a phone during development

## Stack

- **Frontend:** TypeScript / Next.js
- **Backend:** Python (FastAPI)
- **Database:** PostgreSQL
- **Deployment:** Vercel (frontend), Render (backend + database)
- **Auth:** shared-passphrase authentication

## Why it's here

Most of my other repos are analysis notebooks for coursework. This one is a deployed, end-to-end product — API, database, auth, PWA, and a live URL — built and iterated on outside of an academic brief.
