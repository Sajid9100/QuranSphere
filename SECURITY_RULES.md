# LearnFurqan Security Rules

## API Keys Rules
- ALL secret keys must be in .env.local only
- NEVER hardcode any API key in source code
- NEVER commit .env.local to GitHub
- Only NEXT_PUBLIC_ variables are allowed on frontend
- All server secrets accessed via process.env on server-side only

## Environment Variables
### Frontend Safe (NEXT_PUBLIC_):
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_TURNSTILE_SITE_KEY

### Server Only (Never expose to frontend):
- CLERK_SECRET_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ZOOM_ACCOUNT_ID
- ZOOM_CLIENT_ID
- ZOOM_CLIENT_SECRET
- RESEND_API_KEY
- ADMIN_PASSWORD
- TURNSTILE_SECRET_KEY

## Git Rules
- .env.local is gitignored — never force add it
- Run git status before every commit to verify no .env files staged
- Never use git add . without checking output first
- If secret accidentally committed: rotate the key immediately

## Vercel Deployment
- All environment variables added manually in Vercel dashboard
- Never pass secrets via CLI arguments
- Check Vercel environment variables match .env.local

## Supabase RLS Rules
- Row Level Security (RLS) must be enabled on ALL tables
- anon key is public — RLS is what keeps data safe
- Never use service_role key on frontend

## Code Rules
- No hardcoded passwords, tokens, or secrets anywhere in code
- All API routes must verify authentication before returning data
- Admin routes check admin cookie on every request
