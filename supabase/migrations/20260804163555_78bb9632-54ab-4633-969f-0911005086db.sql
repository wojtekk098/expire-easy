REVOKE ALL ON public.app_user_connections FROM anon;
REVOKE ALL ON public.app_user_connections FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;

ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to connector credentials" ON public.app_user_connections;
CREATE POLICY "No client access to connector credentials"
ON public.app_user_connections
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.app_user_connections IS
  'Server-only: encrypted App User Connector keys. Access exclusively via service role in server functions. Client roles are denied by RLS and by grants.';
