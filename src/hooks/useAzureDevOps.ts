import { useQuery } from "@tanstack/react-query";

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

export interface AzureTemplate {
  id: string;
  name: string;
  language: "java" | "python" | "dotnet";
  path: string;
  repoName: string;
  project: string;
}

async function fetchFromAzure(action: string, params?: Record<string, string>) {
  const queryParams = new URLSearchParams({ action, ...params });
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

export function useAzureTemplates() {
  return useQuery({
    queryKey: ["azure-templates"],
    queryFn: async () => {
      const data = await fetchFromAzure("templates");
      console.log("Templates response:", data);
      return data.value as AzureTemplate[];
    },
    staleTime: 30 * 1000, // 30 seconds for debugging
  });
}
