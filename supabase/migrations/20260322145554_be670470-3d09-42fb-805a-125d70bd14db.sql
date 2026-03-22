-- Live blog publishing for Blog Studio without GitHub dependencies
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  lang text not null,
  title text not null default '',
  excerpt text not null default '',
  slug text not null default '',
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  meta_title text not null default '',
  meta_description text not null default '',
  keywords text[] not null default '{}',
  og_image text not null default '',
  cover_image text not null default '',
  tags text[] not null default '{}',
  featured boolean not null default false,
  status text not null default 'draft',
  publishable_language boolean not null default false,
  author_name text,
  created_by uuid,
  updated_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_group_lang_unique unique (group_id, lang),
  constraint blog_posts_slug_lang_unique unique (slug, lang),
  constraint blog_posts_status_check check (status in ('draft','published'))
);

create index if not exists idx_blog_posts_lang_status_published_at
  on public.blog_posts (lang, status, published_at desc nulls last);
create index if not exists idx_blog_posts_group_id
  on public.blog_posts (group_id);
create index if not exists idx_blog_posts_tags_gin
  on public.blog_posts using gin (tags);
create index if not exists idx_blog_posts_keywords_gin
  on public.blog_posts using gin (keywords);

alter table public.blog_posts enable row level security;

create policy "Published blog posts are publicly readable"
on public.blog_posts
for select
using (status = 'published');

create policy "Super admins can read all blog posts"
on public.blog_posts
for select
to authenticated
using (public.has_role(auth.uid(), 'super_admin'));

create policy "Super admins can insert blog posts"
on public.blog_posts
for insert
to authenticated
with check (public.has_role(auth.uid(), 'super_admin'));

create policy "Super admins can update blog posts"
on public.blog_posts
for update
to authenticated
using (public.has_role(auth.uid(), 'super_admin'))
with check (public.has_role(auth.uid(), 'super_admin'));

create policy "Super admins can delete blog posts"
on public.blog_posts
for delete
to authenticated
using (public.has_role(auth.uid(), 'super_admin'));

create or replace function public.update_blog_posts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_blog_posts_updated_at
before update on public.blog_posts
for each row
execute function public.update_blog_posts_updated_at();