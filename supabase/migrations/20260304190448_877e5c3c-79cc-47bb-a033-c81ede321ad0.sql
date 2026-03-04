-- Allow devops to read all profiles for approval context
CREATE POLICY "DevOps can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'devops'::app_role));