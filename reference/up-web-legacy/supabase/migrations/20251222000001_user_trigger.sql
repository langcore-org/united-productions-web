-- =============================================
-- User Creation Trigger
-- =============================================
-- Automatically creates a public.users record when auth.users is created

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'::public.auth_provider_enum
      WHEN NEW.raw_app_meta_data->>'provider' = 'azure' THEN 'azure'::public.auth_provider_enum
      ELSE 'email'::public.auth_provider_enum
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
