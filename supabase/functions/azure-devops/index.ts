import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const AZURE_DEVOPS_ORG = Deno.env.get('AZURE_DEVOPS_ORG');
  const AZURE_DEVOPS_PAT = Deno.env.get('AZURE_DEVOPS_PAT');

  if (!AZURE_DEVOPS_ORG) {
    return new Response(JSON.stringify({ error: 'AZURE_DEVOPS_ORG not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!AZURE_DEVOPS_PAT) {
    return new Response(JSON.stringify({ error: 'AZURE_DEVOPS_PAT not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = `Basic ${btoa(`:${AZURE_DEVOPS_PAT}`)}`;
  const baseUrl = `https://dev.azure.com/${AZURE_DEVOPS_ORG}`;

  async function azureFetch(endpoint: string) {
    const res = await fetch(endpoint, {
      headers: { 'Authorization': authHeader },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Azure DevOps API error [${res.status}]: ${text}`);
    }
    return res.json();
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'projects';

    if (action === 'projects') {
      const data = await azureFetch(`${baseUrl}/_apis/projects?api-version=7.1&$top=100`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'repos') {
      const projectName = url.searchParams.get('project');
      const endpoint = projectName
        ? `${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories?api-version=7.1`
        : `${baseUrl}/_apis/git/repositories?api-version=7.1`;
      const data = await azureFetch(endpoint);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'templates') {
      const project = url.searchParams.get('project') || 'Devops';
      const repo = url.searchParams.get('repo') || 'argo-code';
      const path = url.searchParams.get('path') || '/base-argoit';
      const branch = url.searchParams.get('branch') || 'main';

      // Get items (folders) in the path
      const itemsEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items?scopePath=${encodeURIComponent(path)}&recursionLevel=OneLevel&api-version=7.1`;
      const data = await azureFetch(itemsEndpoint);
      
      // For each language folder, get sub-items (template folders)
      const items = data.value || [];
      const languageFolders = items.filter((item: any) => item.isFolder && item.path !== path);
      
      const templates: any[] = [];
      
      for (const langFolder of languageFolders) {
        const langName = langFolder.path.split('/').pop();
        // Skip non-language folders like 'templates', 'tools', 'examples', 'variables'
        if (!['dotnet', 'java', 'python'].includes(langName)) continue;
        
        // Get sub-templates inside each language folder
        const subEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items?scopePath=${encodeURIComponent(langFolder.path)}&recursionLevel=OneLevel&api-version=7.1`;
        const subData = await azureFetch(subEndpoint);
        const subItems = subData.value || [];
        
        for (const item of subItems) {
          if (item.isFolder && item.path !== langFolder.path) {
            const templateName = item.path.split('/').pop();
            templates.push({
              id: item.objectId || `${langName}-${templateName}`,
              name: templateName,
              language: langName,
              path: item.path,
              repoName: repo,
              project: project,
            });
          }
        }
      }

      return new Response(JSON.stringify({ value: templates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: projects, repos, templates' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Azure DevOps error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
