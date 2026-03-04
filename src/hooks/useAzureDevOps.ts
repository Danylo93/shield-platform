import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AzureProject {
  id: string;
  name: string;
  description: string;
  state: string;
  abbreviation?: string;
}

export interface AzureRepo {
  id: string;
  name: string;
  project: {
    id: string;
    name: string;
  };
  defaultBranch?: string;
  size: number;
  remoteUrl: string;
  webUrl: string;
}

async function fetchFromAzure(action: string, params?: Record<string, string>) {
  const queryParams = new URLSearchParams({ action, ...params });
  const { data, error } = await supabase.functions.invoke("azure-devops", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    body: undefined,
  });

  // supabase.functions.invoke doesn't support query params easily, so use fetch directly
  const projectId = (await supabase.auth.getSession()).data.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `${supabaseUrl}/functions/v1/azure-devops?${queryParams.toString()}`,
    {
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export function useAzureProjects() {
  return useQuery({
    queryKey: ["azure-projects"],
    queryFn: async () => {
      const data = await fetchFromAzure("projects");
      return (data.value as AzureProject[]).map((p) => ({
        ...p,
        abbreviation: p.name.slice(0, 2).toUpperCase(),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAzureRepos(projectName?: string) {
  return useQuery({
    queryKey: ["azure-repos", projectName],
    queryFn: async () => {
      const params = projectName ? { project: projectName } : {};
      const data = await fetchFromAzure("repos", params);
      return data.value as AzureRepo[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
