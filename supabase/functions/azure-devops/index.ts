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
    console.log('Fetching:', endpoint);
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

    if (action === 'tree') {
      // Debug: return raw tree of a repo path
      const project = url.searchParams.get('project') || 'Devops';
      const repo = url.searchParams.get('repo') || 'argo-code';
      const path = url.searchParams.get('path') || '/base-argoit';
      
      const itemsEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items?scopePath=${encodeURIComponent(path)}&recursionLevel=Full&includeContentMetadata=true&api-version=7.1`;
      const data = await azureFetch(itemsEndpoint);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'templates') {
      const project = url.searchParams.get('project') || 'Devops';
      const repo = url.searchParams.get('repo') || 'argo-code';
      const path = url.searchParams.get('path') || '/base-argoit';

      // Get full tree to discover all templates
      const itemsEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items?scopePath=${encodeURIComponent(path)}&recursionLevel=Full&includeContentMetadata=true&api-version=7.1`;
      const data = await azureFetch(itemsEndpoint);
      
      const items = data.value || [];
      console.log(`Found ${items.length} items in tree`);
      
      // Find language folders (direct children of base-argoit that are dotnet/java/python)
      const langNames = ['dotnet', 'java', 'python'];
      const templates: any[] = [];
      
      // Group items by their parent language folder
      for (const item of items) {
        const relativePath = item.path.replace(path + '/', '');
        const parts = relativePath.split('/');
        
        // We want items that are: langFolder/templateName (exactly 2 levels deep)
        // OR langFolder itself if it has files directly
        if (parts.length === 2 && langNames.includes(parts[0]) && item.gitObjectType === 'tree') {
          templates.push({
            id: item.objectId || `${parts[0]}-${parts[1]}`,
            name: parts[1],
            language: parts[0],
            path: item.path,
            repoName: repo,
            project: project,
          });
        }
      }
      
      // If no sub-templates found, treat each language folder itself as a template
      if (templates.length === 0) {
        for (const item of items) {
          const relativePath = item.path.replace(path + '/', '');
          const parts = relativePath.split('/');
          
          if (parts.length === 1 && langNames.includes(parts[0]) && (item.gitObjectType === 'tree' || item.isFolder)) {
            templates.push({
              id: item.objectId || parts[0],
              name: parts[0],
              language: parts[0],
              path: item.path,
              repoName: repo,
              project: project,
            });
          }
        }
      }

      console.log(`Returning ${templates.length} templates`);
      return new Response(JSON.stringify({ value: templates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: projects, repos, templates, tree' }), {
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
