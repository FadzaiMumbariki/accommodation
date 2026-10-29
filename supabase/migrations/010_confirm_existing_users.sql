-- Auto-confirm any existing unconfirmed auth users so they can sign in immediately
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;
