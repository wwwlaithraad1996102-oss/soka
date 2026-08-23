-- SOKA v2: run this ONCE in Supabase SQL Editor after the base schema.
-- It allows only users whose profiles.role = 'admin' to create/update/delete content.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Movies
create policy "Admins can insert movies"
on public.movies for insert to authenticated
with check (public.is_admin());

create policy "Admins can update movies"
on public.movies for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete movies"
on public.movies for delete to authenticated
using (public.is_admin());

-- Series
create policy "Admins can insert series"
on public.series for insert to authenticated
with check (public.is_admin());

create policy "Admins can update series"
on public.series for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete series"
on public.series for delete to authenticated
using (public.is_admin());

-- Seasons
create policy "Admins can insert seasons"
on public.seasons for insert to authenticated
with check (public.is_admin());

create policy "Admins can update seasons"
on public.seasons for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete seasons"
on public.seasons for delete to authenticated
using (public.is_admin());

-- Episodes
create policy "Admins can insert episodes"
on public.episodes for insert to authenticated
with check (public.is_admin());

create policy "Admins can update episodes"
on public.episodes for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete episodes"
on public.episodes for delete to authenticated
using (public.is_admin());
