# Constitution

## Non-Negotiables
- Mobile-first responsive design — the app must work smoothly on modern mobile browsers and remain usable on desktop
- Simple & fast user experience — logging a workout must be quick and frictionless; UI must remain clean and distraction-free
- Secure authentication — user accounts must support secure login, protected sessions, and safe password handling
- Persistent, reliable data storage — workout history, exercises, sets, reps, and progress data must be stored safely

## Explicit Non-Goals
- No AI-powered workout recommendations
- No social or community features (no feed, friends, or challenges)
- No wearable or third-party health app integrations
- No nutrition or calorie tracking
- No paid subscription model at launch
- No in-app advertisements
- No trainer marketplace or coaching platform
- No advanced body metrics (body fat %, biometrics, medical-grade tracking)
- No complex gamification (leaderboards, competitive rankings)
- No video streaming or exercise tutorials
- No desktop-first features (mobile UX is the priority)
- No highly customizable dashboards or complex configuration

## Technical Constraints
- Mobile-first responsive web architecture (works on phones, tablets, browsers)
- Avoid unnecessary vendor lock-in — prefer portable data structures and standard APIs
- Performance-focused — opening the app, logging a workout, and saving a session must feel fast on mobile
- Keep codebase structured so future features (analytics, templates, integrations) can be added incrementally
- **Deferred to v1.1**: GDPR compliance (user consent, data deletion, data export)

## Timeline & Resources
- Timeline: 1 week
- Team: Solo developer
- Suggested stack: React (frontend), Node.js (backend), PostgreSQL (database), VPS hosting
