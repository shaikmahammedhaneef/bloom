# Bloom

A self-care app for routines, habits, mood and health. Built with Next.js 16 (App Router), React 19, TypeScript and MongoDB (Mongoose). Everything is free — there are no premium features or paywalls.

## What's inside

- **Accounts and sync** — email and password sign-in. Your data is stored in MongoDB, so it syncs across devices.
- **Onboarding** — pick goals, how you recharge and who you want to become. You get suggested routines.
- **Today** — habits grouped into morning, afternoon, evening and anytime. Check-offs, count goals (like 8 glasses), streaks and points.
- **From and to times** — every habit and to-do has a from time and a to time. The schedule shows them as time blocks.
- **Schedule and week** — a full-day timeline (12 AM to 12 AM) that lays overlapping blocks out side by side, with tap-for-details, a to-do list, and a week view.
- **Habits** — icons, colors, categories, and repeat settings (every day, some days, or X times a week). Also daily goals, reminders, and a 16-week heatmap with current and best streaks.
- **Templates** — 10 ready-made routines, all with times.
- **Mood** — a 5-point check-in with emotions, triggers and a note. Check in as often as you like; the calendar, trends and insights use each day's best mood. Also a journal with prompts, three good things, and a mood calendar with stats.
- **Progress** — daily completion charts, mood trend, and mood-versus-habit insights. Points, 10 levels and 12 badges.
- **Challenges** — 7-day and 21-day challenges.
- **Health** — water, sleep (bedtime to wake time), steps and weight, plus a Health stats page (7 days, 30 days, 90 days or a year) with averages, goal days, usual bedtime and wake-up, and charts for each. Also a breathing timer (3 patterns), a Pomodoro focus timer and 4 guided workouts.
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

## Password reset

- **Change password**: Profile → Password. Works out of the box.
- **Forgot password?** (on the sign-in page) emails a reset link that works once, for 60 minutes. It needs an email service; Bloom uses [Resend](https://resend.com):
  1. Create a Resend account. Under **Domains**, add your domain and add the DNS records it shows. Without a domain, you can only send to your own Resend email address, which is fine for testing.
  2. Under **API Keys**, create a key.
  3. Set `RESEND_API_KEY`, `EMAIL_FROM` (for example `Bloom <hello@yourdomain.com>`) and, if needed, `APP_URL` (your site's address, used in the link). On Vercel, `APP_URL` defaults to your production domain.

Until those are set, "Forgot password?" says reset by email isn't set up yet.

## Reminders while Bloom is closed (Web Push)

This is optional. Without it, reminders still work whenever Bloom is open.

1. Generate keys: `npx web-push generate-vapid-keys`. Put them in `.env.local` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, and set `VAPID_SUBJECT` to `mailto:` plus your email.
2. Something must check for due reminders every minute. Choose one:
   - **Long-running server** (`npm start` on a VPS, Render, Railway and so on): set `REMINDER_WORKER=1`. Bloom checks every minute by itself.
   - **Serverless hosting** (Vercel and similar): set `CRON_SECRET` to a long random string. Then have a cron service (for example cron-job.org, which is free) call `https://your-site/api/cron/reminders?secret=YOUR_CRON_SECRET` every minute. Vercel's own cron can't run every minute on the free plan.
3. Restart Bloom. In Profile, allow notifications. The Reminders section then says "Reminders reach this device even when Bloom is closed."

Each browser that allows notifications gets its own push subscription, which is removed on sign-out. Reminders use that device's time zone. Push needs HTTPS (or `localhost`). On iPhone, push only works after adding Bloom to the Home Screen (iOS 16.4 or later).

## Notes

- **Install as an app** — Bloom is a Progressive Web App. In Chrome or Edge, use Profile → App → Install app (or the install icon in the address bar). On Android, Chrome offers "Install app" from its menu. On iPhone, use Safari's Share → Add to Home Screen. Installing needs HTTPS (or `localhost`).
- **Reminders** fire while Bloom is open, in a tab or as an installed app, and pop up as system notifications (through the service worker in `public/sw.js`) once you allow them in Profile. Otherwise they appear as a banner in the app. With push set up (below), they also arrive while Bloom is closed.
- **To-dos** go on any date, can run over several days (Date → Until), and can repeat every day or on chosen weekdays (optionally until a date). Swipe a to-do left (or tap ⋯) to edit or delete it; swipe a habit on Today to view, edit or delete it. For a repeating to-do, you choose "Only this day" or "All scheduled".
- **Dates** are the user's local calendar days, sent from the browser as `YYYY-MM-DD`. Times are `HH:mm`.
- Collections are created on first use: `users`, `habits`, `habitlogs`, `todos`, `moods`, `journals`, `userchallenges`, `healths`, `sessions`, `pushsubs` and `remindersents`.

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
proxy.ts            sends signed-out visitors to /login
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
| PATCH, DELETE | /api/todos/:id | Edit or delete a to-do. For a repeating one, pass `on` (the day) and `scope` (`one` or `all`) |
| GET, POST, DELETE | /api/push | Push key, and save or remove this browser's push subscription |
| GET | /api/cron/reminders | Sends due push reminders; call every minute with the `CRON_SECRET` |
| GET | /api/week?start=&today= | Week overview |
| GET, POST | /api/mood?date= or ?month= | List or add mood check-ins (several per day) |
| GET | /api/health/stats?to=&days= | Daily sleep, water, steps and weight for 7, 30, 90 or 365 days |
| POST | /api/auth/forgot, /api/auth/reset, /api/auth/password | Email a reset link, set a new password from it, or change the password while signed in |
| PATCH, DELETE | /api/mood/:id | Edit or delete a check-in |
| GET, POST | /api/journal | Journal entries |
| GET, POST | /api/challenges?today= | Challenge catalog, or join one |
| PATCH, DELETE | /api/challenges/:id | Mark a day, or leave |
| GET, POST | /api/health?date= | Water, sleep, steps, weight |
| POST | /api/sessions | Log a breathing, focus or workout session |
| GET | /api/stats?today=&range=week or month | Charts, insights, points, badges |
| POST | /api/templates/apply | Add a template's habits |
| GET | /api/export?kind= | CSV download |
