-- File: supabase/migrations/20260210160000_fix_profiles_rls_and_auth_bootstrap.sql
-- Idempotent RLS hardening for profiles/user_roles to ensure auth flows can read/write own account.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';

    -- Fix/ensure owner policies are based on profiles.user_id (not profiles.id)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles';

    EXECUTE $pol$
      CREATE POLICY "Users can view their own profile"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "Users can update their own profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
  ) THEN
    EXECUTE 'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles';

    EXECUTE $pol$
      CREATE POLICY "Users can read own roles"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid())
    $pol$;
  END IF;
END $$;
