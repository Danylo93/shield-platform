
-- Create the devops admin user
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert into auth.users using Supabase's built-in function
  new_user_id := (
    SELECT id FROM auth.users WHERE email = 'devops@useargo.com'
  );
  
  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'devops@useargo.com',
      crypt('Argo@04032026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DevOps Admin"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    )
    RETURNING id INTO new_user_id;

    -- The trigger will create profile + dev role automatically
    -- Now add devops role
    INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'devops');
  ELSE
    -- User exists, just ensure devops role
    INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'devops')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
