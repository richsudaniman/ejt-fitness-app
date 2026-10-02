# EJT Fitness

The platform EJT Fitness uses to run their agency - currently 2 trainers and 32 clients on it in production.

Trainers assign workout plans and keep an eye on their clients, clients log workouts, meals and progress, and admins manage who's assigned to who.

## what it does

**Clients**
- follow the workout plans their trainer assigns
- log meals by photo, image upload, or barcode - calories and macros are tracked automatically
- track weight, body composition and lifts over time
- articles and videos from the coaching team
- chat with their trainer

**Trainers**
- client roster, drill into each client
- assign and monitor workout plans
- message clients, share exercise videos
- manage their profile

**Admins**
- usage + progress analytics
- invite users, manage trainer-client assignments
- announcements, educational content, videos

## how it's built

React 18 + Vite, TanStack Query, Tailwind/shadcn, Recharts. Base44 for auth, database, hosting and serverless functions.

**Why Base44:** EJT is a small agency. They needed real auth, a database and hosting fast, without anyone maintaining servers. The trade-off is less control over things like the built-in user roles, which bit me (see below).

- 16 entities in `base44/entities/` covering people/assignments, training (plans, logs, sessions, videos, trainer notes), nutrition, progress (metrics, photos, goals) and communication (chat, announcements, daily motivation)
- 9 Deno serverless functions for anything that touches other users' records - assigning clients, inviting users, announcements, updating calorie goals, looking up a client's trainer. trainers can only assign clients to themselves, only admins can reassign between trainers
- food photos: `UploadFile` -> `InvokeLLM` with a JSON schema -> `{ name, calories, protein, carbs, fats }` -> saved as a `CalorieLog`. the schema means it comes back as typed data I can write straight to the DB instead of text I'd have to parse
- one camera button: it checks the frame for a barcode first, and if there isn't one it treats it as a food photo, so users don't have to pick a mode

## things that broke

**Trainer-client assignments drifting out of sync.** The relationship lived in two places: `TrainerClientAssignment` records and an `assigned_trainer_id` field on `User` (for quick "who's my trainer" lookups). When they disagreed, clients couldn't see their trainer and trainers saw the wrong roster. What I did:
- `assignClientToTrainer` now updates both in one server-side operation (deactivates old assignments, updates the user, then reactivates or creates the assignment)
- `syncTrainerAssignments` and `fixTrainerAssignments` are admin-only jobs to backfill existing data
- built an internal diagnostic page - look up a client by email, compare both sources, see mismatches, one-click fix

**Trainers not being recognized as trainers.** The platform's built-in `role` field couldn't reliably tell trainers from clients, so trainer-only screens and permissions broke. Added a custom `user_type` field, and permission checks accept either `user_type` or `role`.

**Camera on mobile.** The live camera uses `getUserMedia` with the rear camera. On iOS it needed `playsInline` and `muted` to play inline, and I had to explicitly stop the tracks on close/unmount or the camera would stay on after leaving the screen.

## running it

Needs Node 18+ and a Base44 account/app.

```bash
git clone https://github.com/richsudaniman/ejt-fitness-app.git
cd ejt-fitness-app
npm install
npm run dev
```

Also `npm run build`, `npm run preview`, `npm run lint`, `npm run typecheck`.
