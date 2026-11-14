# Supabase MVP

`schema.sql` contains the initial database structure for this project. Apply it
once in the SQL Editor of a new Supabase project; it is not an incremental
migration for an existing database.

If `auto_ct_supabase_mvp.sql` from Downloads was already applied to this same
Supabase project, do not run this copy again. It contains the same schema and is
kept here so the project has its database definition under version control.

## First administrator

1. In Supabase Authentication, create the administrator account and confirm its
   email address.
2. In the SQL Editor, promote that confirmed account by email:

```sql
update public.perfis
set tipo = 'admin'
where id = (
  select id
  from auth.users
  where email = lower('seu-email@exemplo.com')
    and email_confirmed_at is not null
);
```

The login screen accepts existing accounts only. New accounts and role changes
are managed in Supabase; the browser cannot promote itself to administrator.

The app uses `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Auth. Keep `SUPABASE_SECRET_KEY`
server-only. The public app uses the publishable key for catalog and availability
reads; its server route uses the secret key for guest bookings and token-checked
history lookups.

## Public app bookings

The `/aplicativo` screens read active services and available times from Supabase.
Creating a booking calls `criar_agendamento_sem_conta` from a server route; the
secret key is never sent to the browser. The guest history is available on the
same device while its local booking token remains saved and valid.

Local development permits bookings without Turnstile when neither Turnstile key
is set. Before enabling public bookings in production, create a Cloudflare
Turnstile widget and configure both values in the deployment environment:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-public-site-key
TURNSTILE_SECRET_KEY=your-server-secret-key
```

The server validates the challenge token with Cloudflare before creating a
booking. The current rate limiter is in process memory, so deployments with
multiple server instances should move that limit to a shared store.
