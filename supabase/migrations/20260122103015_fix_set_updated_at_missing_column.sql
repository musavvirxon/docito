begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  
  new := jsonb_populate_record(new, jsonb_build_object('updated_at', now()));
  return new;
end;
$$;

commit;
