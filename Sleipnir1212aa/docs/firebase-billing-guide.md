# Firebase Billing Guide — Sleipnir MC Website

Last updated: 2026-03-13

## TL;DR

Your website uses Firebase's **Blaze (pay-as-you-go) plan**. For a small club website with ~50-100 registered users and light daily traffic, you will likely stay within or very close to the **free tier** and pay $0-2/month. The biggest cost risk is not normal users — it's **bots** or **base64 images stored in Firestore**.

---

## What Firebase Services You Use

| Service | What it does on your site | Free tier (monthly) |
|---------|--------------------------|---------------------|
| **Firebase Hosting** | Serves your HTML/CSS/JS/images | 10 GB storage, 360 MB/day transfer |
| **Firebase Auth** | User accounts, login, Google OAuth | 50,000 monthly active users |
| **Firestore** | Database (users, products, orders, members, logs, contact messages) | 50,000 reads, 20,000 writes, 20,000 deletes per day. 1 GiB storage |
| **Cloud Functions** | Sends contact form emails | 2M invocations/month, 400K GB-seconds |

---

## How Each Service Bills You

### 1. Firebase Hosting

**What you pay for**: Storing your static files (HTML, CSS, JS, images) and bandwidth when users load pages.

| Metric | Free | After free tier |
|--------|------|-----------------|
| Storage | 10 GB | $0.026/GB/month |
| Data transfer | 360 MB/day (~10.8 GB/month) | $0.15/GB |

**Your site**: The `Sleipnir1212aa/` directory is maybe 5-10 MB total. Even with 1,000 visitors/day loading the full site, you'd use ~50-100 MB/day of bandwidth. **You will never pay for hosting** at your scale.

### 2. Firebase Auth

**What you pay for**: Monthly active users (users who sign in at least once that month).

| Metric | Free | After free tier |
|--------|------|-----------------|
| Email/password users | 50,000 MAU | $0.0055/MAU |
| Google OAuth users | 50,000 MAU | $0.0055/MAU |
| Verification emails | ~300/day | Uses your own email, not billed |

**Your site**: Even with 200 registered members, you're at 0.4% of the free tier. **Auth will cost you $0 forever** at club scale.

### 3. Firestore (This Is Where Costs Can Add Up)

This is the most important section. Firestore charges for three things:

#### A. Document Reads

| Free | After free tier |
|------|-----------------|
| 50,000 reads/day | $0.06 per 100,000 reads |

**What counts as a read:**
- Loading the product list = 1 read per product (if you have 15 products, that's 15 reads)
- Loading the admin dashboard = reads for users + orders + members (could be 50-200 reads)
- A user signing in = 1-3 reads (user doc, possibly displayMembers check)
- Loading the about/members page = 1 read per display member

**Your site today**: If 20 people visit per day, each views shop + 1-2 pages:
- ~20 visitors x 15 product reads = 300 reads
- ~5 logins x 3 reads = 15 reads
- ~1 admin session x 150 reads = 150 reads
- Total: ~465 reads/day — **0.9% of free tier**

#### B. Document Writes

| Free | After free tier |
|------|-----------------|
| 20,000 writes/day | $0.18 per 100,000 writes |

**What counts as a write:**
- User signs up = 1-2 writes (user doc, email log)
- Contact form submission = 1 write (contactMessages doc)
- Admin updates a product = 1 write
- Admin toggles member = 1 write
- Each login updates lastLogin = 1 write

**Your site today**: Maybe 5-10 writes/day. **Essentially zero cost.**

#### C. Storage

| Free | After free tier |
|------|-----------------|
| 1 GiB total | $0.18/GiB/month |

**THIS IS YOUR BIGGEST HIDDEN COST.** Your product images are stored as **base64 data URLs directly inside Firestore documents**. A single product photo encoded as base64 is typically 200 KB - 2 MB. This means:

- 15 products with 1 image each = 3-30 MB stored in Firestore
- 15 products with 3 images each = 9-90 MB stored in Firestore

This is fine within 1 GiB, but it also means **every time someone loads the product list, they download all that image data**. A 2 MB product document read 50 times/day = 100 MB/day of Firestore egress (bandwidth).

#### D. Firestore Network Egress

| Free | After free tier |
|------|-----------------|
| 10 GiB/month | $0.12/GiB |

If your products collection totals 30 MB and 50 people load the shop per day:
- 30 MB x 50 = 1.5 GB/day = **45 GB/month**
- That's 35 GB over the free tier = **$4.20/month**

This is likely your only real cost right now, and it scales linearly with traffic.

### 4. Cloud Functions

| Metric | Free | After free tier |
|--------|------|-----------------|
| Invocations | 2M/month | $0.40/million |
| Compute | 400K GB-seconds | $0.0000025/GB-second |

**Your site**: The contact form function runs maybe 1-5 times per week. **$0 forever.**

---

## Realistic Scenarios

### Scenario 1: Current State (~20 daily visitors, ~80 registered users)

| Service | Usage | Cost |
|---------|-------|------|
| Hosting | ~2 MB served/day | $0 |
| Auth | ~80 MAU | $0 |
| Firestore reads | ~500/day | $0 |
| Firestore writes | ~10/day | $0 |
| Firestore storage | ~50 MB | $0 |
| Firestore egress | ~1.5 GB/month | $0 |
| Functions | ~10/month | $0 |
| **Total** | | **$0/month** |

You're comfortably within free tier on everything.

### Scenario 2: Moderate Growth (~100 daily visitors, ~300 registered users)

| Service | Usage | Cost |
|---------|-------|------|
| Hosting | ~20 MB served/day | $0 |
| Auth | ~150 MAU | $0 |
| Firestore reads | ~2,500/day | $0 |
| Firestore writes | ~30/day | $0 |
| Firestore storage | ~100 MB (products + users) | $0 |
| Firestore egress | ~4.5 GB/month | $0 |
| Functions | ~30/month | $0 |
| **Total** | | **$0/month** |

Still free. The base64 images start to matter for egress but likely still under 10 GiB.

### Scenario 3: Viral Moment (~1,000 daily visitors for a month, ~500 registered users)

| Service | Usage | Cost |
|---------|-------|------|
| Hosting | 200 MB/day | $0 |
| Auth | ~300 MAU | $0 |
| Firestore reads | ~20,000/day | $0 |
| Firestore writes | ~100/day | $0 |
| Firestore storage | ~150 MB | $0 |
| Firestore egress | ~45 GB/month | **~$4.20** |
| Functions | ~100/month | $0 |
| **Total** | | **~$4/month** |

The base64 product images drive the cost. 1,000 people loading 30 MB of product data daily adds up.

### Scenario 4: Large Scale (~100,000 registered users, ~5,000 daily visitors)

This is the hypothetical "what if Sleipnir went worldwide" scenario.

| Service | Usage | Cost |
|---------|-------|------|
| Hosting | 1 GB/day | $0 (under 360 MB/day? No → ~$4.50) |
| Auth | ~20,000 MAU | $0 |
| Firestore reads | ~100,000/day | ~$3.60/month |
| Firestore writes | ~1,000/day | $0 |
| Firestore storage | 2 GiB (100K user docs + products) | ~$0.18 |
| Firestore egress | ~225 GB/month | **~$25.80** |
| Functions | ~500/month | $0 |
| **Total** | | **~$34/month** |

Again, egress from base64 images dominates. The actual database operations are cheap.

### Scenario 5: Bot Attack (1,000 fake signups + spam writes in one day)

| Service | What happens | Cost |
|---------|-------------|------|
| Auth | 1,000 new accounts created | $0 (under 50K MAU) |
| Firestore writes | 1,000 user docs + 1,000 email_logs + 1,000 contactMessages = 3,000 writes | $0 (under 20K/day) |
| Firestore storage | 3,000 docs x ~1 KB = 3 MB | $0 |
| Cloud Functions | 1,000 contact emails triggered | $0 (but Gmail might block you) |
| **Real damage** | Your inbox gets 1,000 spam emails. contactMessages fills up. | **$0 in Firebase cost** |

A single-day bot attack won't cost you money at this scale. But a **sustained** attack (weeks of 10,000+ writes/day) could:
- Push past free write limits: 10K excess writes/day x 30 days = $0.54/month
- Fill storage with junk: 300K docs = ~300 MB = $0 (still under 1 GiB)
- The bigger risk: **you can't easily delete** thousands of junk documents without a script or Cloud Function

### Scenario 6: Worst Case Bot Attack (Targeting your base64 image vulnerability)

If someone figured out your product create endpoint (admin-only, so unlikely unless an admin account is compromised):
- 1,000 products with 2 MB base64 images each = **2 GB storage**
- 2 GB - 1 GB free = $0.18/month in storage
- But every shop page load now downloads 2 GB = catastrophic egress costs
- 100 visitors/day x 2 GB = **200 GB/day = 6 TB/month = ~$720/month**

This is extremely unlikely (requires admin access) but illustrates why base64 images in Firestore are a cost risk.

---

## Does reCAPTCHA Cost Money?

**Short answer: No, not for your scale.**

| Version | Cost | What it does |
|---------|------|-------------|
| **reCAPTCHA v3** (invisible) | **Free** up to 1M assessments/month | Scores each request 0.0-1.0, no user interaction |
| **reCAPTCHA Enterprise** | **Free** up to 10,000 assessments/month, then $1/1,000 | Required for Firebase App Check |

For Firebase App Check (the recommended bot protection):
- You need **reCAPTCHA Enterprise**
- Free tier: 10,000 assessments/month
- Your site at 100 visitors/day = ~3,000 assessments/month → **$0**
- At 1,000 visitors/day = ~30,000/month → 20K over free tier → **$20/month**

For just protecting your contact form and signup:
- Use **reCAPTCHA v3** (completely free) — verify the token server-side in a Cloud Function
- This costs $0 regardless of traffic volume

**Recommendation**: Use free reCAPTCHA v3 on your contact form and signup form. Only upgrade to App Check + reCAPTCHA Enterprise if you actually experience bot attacks.

---

## Where Your Money Actually Goes (Summary)

| Risk Level | Cost Source | Likelihood | Fix |
|------------|-----------|------------|-----|
| **Highest** | Firestore egress from base64 product images | Scales with traffic | Move images to Firebase Storage or external host |
| **Medium** | Sustained bot writes to contactMessages/email_logs | Only if targeted | Add reCAPTCHA v3 to contact form |
| **Low** | Firestore reads exceeding 50K/day | Need 1000+ daily visitors | Won't happen at club scale |
| **Very Low** | Auth MAU exceeding 50K | Need 50,000 members | Won't happen |
| **Zero** | Hosting, Cloud Functions | Under free tier permanently | No action needed |

---

## Actionable Recommendations (Priority Order)

1. **Set billing alerts** in Google Cloud Console at $5, $10, $25. Takes 2 minutes. Prevents surprise bills.

2. **Move product images out of Firestore** to either:
   - Firebase Storage (5 GB free, $0.026/GB after) — better egress pricing
   - An external image host (Cloudinary free tier: 25 GB storage + 25 GB bandwidth)
   - This is your single biggest cost optimization

3. **Add reCAPTCHA v3** to the contact form (free, prevents spam and function invocations)

4. **Consider document limits** in Firestore rules — cap the number of contactMessages a user can create per day

5. **Scheduled cleanup function** — auto-delete unverified auth accounts after 48 hours to keep things tidy

---

## Firebase Free Tier Quick Reference

| Service | Daily Free | Monthly Free |
|---------|-----------|--------------|
| Firestore reads | 50,000 | ~1,500,000 |
| Firestore writes | 20,000 | ~600,000 |
| Firestore deletes | 20,000 | ~600,000 |
| Firestore storage | — | 1 GiB |
| Firestore egress | — | 10 GiB |
| Auth MAU | — | 50,000 |
| Hosting storage | — | 10 GB |
| Hosting transfer | 360 MB | ~10.8 GB |
| Functions invocations | — | 2,000,000 |
| Functions compute | — | 400K GB-sec |
