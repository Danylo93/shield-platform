ALTER TABLE public.components ADD COLUMN rifc text DEFAULT '' NOT NULL;

-- Allow delete for creator or devops
CREATE POLICY "Users can delete own or devops can delete"
ON public.components
FOR DELETE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'devops'::app_role));