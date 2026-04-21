# Factions — Play Console Data Safety answers

Copy-paste-ready answers for the Play Console → **App content** → **Data safety** form. Google uses these to populate the "Data safety" card on the app's Play Store listing.

When filling the form, work top to bottom; Google's wording shifts slightly every few months but the yes/no answers below remain correct.

---

## Section 1 — Data collection & security

**Does your app collect or share any of the required user data types?**  
→ **Yes**

**Is all user data collected by your app encrypted in transit?**  
→ **Yes** (AdMob, Play Games Services, Play Billing, and our own analytics all use HTTPS. WebRTC multiplayer uses DTLS-encrypted WebRTC data channels.)

**Do you provide a way for users to request that their data is deleted?**  
→ **Yes** (uninstalling the app deletes all locally-stored game state; for Google-account-linked data such as Play Games progress, users can delete through Google's standard tools at myaccount.google.com)

---

## Section 2 — Data types

Below are the only data-type categories to enable. Every OTHER category stays on its default "not collected / not shared."

### Personal info

- **Name**: ❌ Not collected.  
  *(Play Games display name isn't your legal name — it's a Google-managed pseudonym that Google considers "User IDs" not "Personal info > Name" for Data Safety purposes.)*
- **Email address**: ❌ Not collected.
- **User IDs**: ✅ **COLLECTED** and ✅ **SHARED**
  - Collected: yes
  - Optional: yes (only if user signs into Play Games Services)
  - Purpose: **App functionality** (displays player identity in-game), **Analytics** (we record faction choice paired with an anonymous player ID for session continuity)
  - Processed ephemerally: no
  - Reason shared: the Play Games player ID is visible to Google; the AdMob advertising ID is visible to Google.

### Financial info

- **Purchase history**: ✅ **COLLECTED** (not shared)
  - Collected: yes
  - Optional: yes (only if user makes an IAP)
  - Purpose: **App functionality** (unlocks purchased content), **Account management** (restore purchases)
  - Processed ephemerally: no
  - *(Payment credentials themselves are handled by Google Play Billing, not us — we don't see credit cards / billing addresses.)*

### Location

- **Approximate location**: ✅ **COLLECTED** and ✅ **SHARED**
  - Collected: yes (indirectly — AdMob infers approximate location from IP address for ad targeting)
  - Optional: no (comes with serving ads; users who buy ads-off don't see this collection)
  - Purpose: **Advertising or marketing** (Google AdMob ad targeting)
  - Processed ephemerally: no
  - Shared: yes — shared with Google AdMob (third-party service provider)

### App activity

- **App interactions**: ✅ **COLLECTED** (not shared)
  - Collected: yes
  - Optional: no (part of normal gameplay telemetry, though users can opt out)
  - Purpose: **Analytics** (understand which game modes and features are used), **App functionality** (save game progress locally)
  - Processed ephemerally: no
- **In-app search history**: ❌ Not collected
- **Installed apps**: ❌ Not collected
- **Other user-generated content**: ❌ Not collected
- **Other actions**: ❌ Not collected

### App info and performance

- **Crash logs**: ❌ Not collected *(we don't currently have a crash reporting SDK wired; AdMob may report its own internal crashes to Google but that's AdMob's SDK, not us)*
- **Diagnostics**: ❌ Not collected
- **Other app performance data**: ❌ Not collected

### Device or other IDs

- **Device or other IDs**: ✅ **COLLECTED** and ✅ **SHARED**
  - Collected: yes (Android advertising ID — used by AdMob; Play Games Services player ID)
  - Optional: no for advertising ID (comes with serving ads); yes for Play Games ID (requires sign-in)
  - Purpose: **Advertising or marketing** (AdMob), **App functionality** (Play Games profile)
  - Processed ephemerally: no
  - Shared: yes — with Google (AdMob + Play Games Services)

### Everything else (explicitly NOT collected)

All other categories stay on the default "not collected":
- Financial info (other than purchase history) — ❌
- Health & fitness — ❌
- Messages — ❌
- Photos & videos — ❌
- Audio files — ❌
- Files & docs — ❌
- Calendar — ❌
- Contacts — ❌
- Web browsing history — ❌

---

## Section 3 — Security practices

Google will ask a short checklist. Answers:

- **Is data encrypted in transit?** → **Yes**
- **Do you follow Google Play Families policies?** → Not applicable — Factions is 13+, so these don't apply.
- **Are you committed to Google's Data safety declaration?** → **Yes**
- **Can users request data deletion?** → **Yes** (as above)

---

## Section 4 — Independently verified?

For a first internal-testing release, skip third-party audit. You can add one later (MASA, App Defense Alliance) if you want a "Security reviewed" badge.

→ **No**

---

## Quick summary of what gets disclosed on the listing

The Play Store "Data safety" card after submission will say:

> **This app may share these data types with third parties**
> Location, Personal info (User IDs), Device or other IDs
>
> **This app may collect these data types**
> Financial info (Purchase history), Location, Personal info (User IDs),
> App activity (App interactions), Device or other IDs
>
> **Data is encrypted in transit**
> **You can request that data be deleted**

That framing is accurate to our implementation and aligns with the Privacy Policy.
