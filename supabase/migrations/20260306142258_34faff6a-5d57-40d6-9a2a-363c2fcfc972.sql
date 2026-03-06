
CREATE TABLE public.playbook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_name text NOT NULL,
  target_hosts text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  logs text DEFAULT '',
  started_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE public.playbook_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DevOps can manage playbook runs"
ON public.playbook_runs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'devops'))
WITH CHECK (public.has_role(auth.uid(), 'devops'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.playbook_runs;
