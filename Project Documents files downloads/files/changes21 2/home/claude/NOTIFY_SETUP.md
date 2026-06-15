# Round Notification Setup

## 1. Deploy the Edge Function

In your terminal from the project root:

```bash
npx supabase functions deploy notify-round --project-ref nlmyllxhruguifhdondi
```

## 2. Set Environment Variables in Supabase Dashboard

Go to: https://supabase.com/dashboard/project/nlmyllxhruguifhdondi/settings/functions

Add these secrets:
- `RESEND_API_KEY` = your Resend API key
- `NOTIFY_EMAIL` = timlootens@gmail.com (or whatever email you want)

## 3. The app handles the rest

- Round started → fires when first player name is entered (round code generated)
- Round completed → fires when hole 18 is saved

No Supabase webhook needed — the app calls the Edge Function directly.

## Email format

Started:
  Subject: 🏌️ Round 4202 started
  Body: Code, Course, Players list

Completed:
  Subject: ✅ Round 4202 complete  
  Body: Code, Course, Players, Leaderboard with net $ per player
