# Bloom

A self-care app for routines, habits, mood and health. Built with Next.js 15 (App Router), React 19, TypeScript and MongoDB (Mongoose). Everything is free — there are no premium features or paywalls.

## What's inside

- **Accounts and sync** — email and password sign-in. Your data is stored in MongoDB, so it syncs across devices.
- **Onboarding** — pick goals, how you recharge and who you want to become. You get suggested routines.
- **Today** — habits grouped into morning, afternoon, evening and anytime. Check-offs, count goals (like 8 glasses), streaks and points.
- **From and to times** — every habit and to-do has a from time and a to time. The schedule shows them as time blocks.
- **Schedule and week** — a day timeline with overlapping blocks and a to-do list, plus a week view.
- **Habits** — icons, colors, categories, and repeat settings (every day, some days, or X times a week). Also daily goals, reminders, and a 16-week heatmap with current and best streaks.
- **Templates** — 10 ready-made routines, all with times.
- **Mood** — a 5-point check-in with emotions, triggers and a note. Also a journal with prompts, three good things, and a mood calendar with stats.
- **Progress** — daily completion charts, mood trend, and mood-versus-habit insights. Points, 10 levels and 12 badges.
- **Challenges** — 7-day and 21-day challenges.
- **Health** — water, sleep (bedtime to wake time), steps and weight. Also a breathing timer (3 patterns), a Pomodoro focus timer and 4 guided workouts.
- **Profile** — 4 theme colors, dark mode, reminder settings, daily goals and CSV export.

## Run it locally

You need Node.js 18.18 or newer, and a MongoDB database (local or MongoDB Atlas).

```bash
npm install
cp .env.example .env.local     # on Windows: copy .env.example .env.local
```

Open `.env.local` and fill in both values:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/bloom?retryWrites=true&w=majority
JWT_SECRET=paste-a-long-random-string-here
```

To create a random secret, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Then start the app:

```bash
npm run dev
```

Open http://localhost:3000 and create an account.

**Using Atlas?** In Atlas, go to Network Access and add your IP address (or 0.0.0.0/0 while testing). Put the database name (`bloom`) in the URI before the `?`. If your password has special characters, URL-encode them.

For a production build: `npm run build && npm start`.

## Notes

- **Reminders** run in the browser. They fire while Bloom is open in a tab. They show as system notifications if you allow them in Profile; otherwise they appear as a banner in the app. Reminders when the app is fully closed would need Web Push (a service worker plus a push server). That can be added later.
- **Dates** are the user's local calendar days, sent from the browser as `YYYY-MM-DD`. Times are `HH:mm`.
- Collections are created on first use: `users`, `habits`, `habitlogs`, `todos`, `moods`, `journals`, `userchallenges`, `healths` and `sessions`.

## Project layout

```
app/
  (app)/            signed-in screens: today, schedule, week, templates, habits, mood,
                    progress, achievements, challenges, health, profile
  api/              route handlers (REST, JSON)
  login, register, onboarding
components/         UI building blocks, app shell, reminders, forms
lib/                dates, habit rules (streaks and schedules), catalog content, auth, db
models/             Mongoose schemas
middleware.ts       sends signed-out visitors to /login
```

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /api/auth/register, /api/auth/login, /api/auth/logout | Sign up, sign in, sign out |
| GET, PATCH | /api/me | Profile and settings |
| POST | /api/onboarding | Save quiz answers and add starter routines |
| GET, POST | /api/habits?today= | List habits with streaks, or create one |
| GET, PATCH, DELETE | /api/habits/:id | Habit detail, edit, delete |
| POST | /api/habits/:id/log | Set `{date, count}` or `{date, delta}` |
| GET | /api/today?date= | Habits due that day, to-dos, mood, points |
| GET, POST | /api/todos?from=&to= | List or create to-dos (with start and end times) |
| PATCH, DELETE | /api/todos/:id | Edit or delete a to-do |
| GET | /api/week?start=&today= | Week overview |
| GET, POST | /api/mood?date= or ?month= | Mood check-ins |
| GET, POST | /api/journal | Journal entries |
| GET, POST | /api/challenges?today= | Challenge catalog, or join one |
| PATCH, DELETE | /api/challenges/:id | Mark a day, or leave |
| GET, POST | /api/health?date= | Water, sleep, steps, weight |
| POST | /api/sessions | Log a breathing, focus or workout session |
| GET | /api/stats?today=&range=week or month | Charts, insights, points, badges |
| POST | /api/templates/apply | Add a template's habits |
| GET | /api/export?kind= | CSV download |
