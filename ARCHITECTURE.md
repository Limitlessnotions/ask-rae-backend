# Ask Rae Backend Architecture

Version: 2.0

---

# Vision

Ask Rae is an AI-powered personal assistant that helps users create, schedule, and publish content across multiple social media platforms.

The backend is designed to be scalable, modular, and provider-agnostic.

Every social platform should plug into the backend without requiring architectural changes.

---

# Core Principles

1. Single Responsibility Principle
2. Separation of Concerns
3. Provider-based Architecture
4. Reusable OAuth Engine
5. Reusable Publishing Engine
6. Provider Independence
7. Test before adding features

---

# Project Structure

src/

config/

controllers/

middleware/

routes/

services/

firebase/

utils/

---

# Core Systems

The backend consists of six major systems.

1. Authentication Engine
2. OAuth Engine
3. Provider Engine
4. Publishing Engine
5. AI Engine
6. Scheduling Engine

---

# Controller Responsibilities

Controllers should:

- Validate requests
- Call services
- Return responses

Controllers should NOT:

- Talk directly to Facebook
- Talk directly to TikTok
- Generate OAuth state
- Generate PKCE
- Save Firestore documents

Controllers should remain extremely small.

---

# OAuth Engine

Responsible for:

- Generate OAuth State
- Generate PKCE
- Store OAuth Sessions
- Validate OAuth Callback
- Load OAuth Sessions
- Delete OAuth Sessions

The OAuth Engine never communicates directly with social APIs.

It delegates provider-specific work to Provider Adapters.

---

# Provider Engine

Every provider exposes the exact same interface.

Required methods:

- buildAuthorizationUrl()
- exchangeAuthorizationCode()
- getProfile()
- publish()
- refreshToken()
- disconnect()
- revoke()

---

# Publishing Engine

The Publishing Engine never knows anything about Facebook, TikTok, LinkedIn, or any provider.

It only:

1. Finds the provider.
2. Calls provider.publish()

---

# Provider Registry

All providers register themselves here.

Example:

Facebook

TikTok

Instagram

LinkedIn

X

Pinterest

YouTube

---

# Firestore

users

    uid

        profile

        settings

        subscription

        socialAccounts

            facebook

            instagram

            linkedin

            tiktok

            youtube

            x

        drafts

        scheduledPosts

        publishedPosts

        analytics

---

system

    oauth

        sessions

            state

---

# Security

OAuth State

- Random
- One-time use
- Stored temporarily
- Deleted after callback

PKCE

- Used when provider requires it.
- Never sent to client after generation.
- Stored only until callback.

---

# Provider Responsibilities

A provider knows:

- OAuth URLs
- Token exchange
- Refresh tokens
- Profile endpoints
- Publish endpoints

A provider does NOT:

- Generate OAuth state
- Generate PKCE
- Store Firestore sessions

---

# Goal

Adding a new provider should require:

1. Creating a new provider folder.
2. Registering it.
3. Updating provider configuration.

Nothing else.