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
      const basePath = url.searchParams.get('path') || '/base-argoit';

      // First, get the repo default branch to use in items call
      const repoEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}?api-version=7.1`;
      const repoData = await azureFetch(repoEndpoint);
      const defaultBranch = repoData.defaultBranch || 'refs/heads/main';
      console.log('Repo default branch:', defaultBranch);

      // Get full tree with recursion, specifying version
      const branchName = defaultBranch.replace('refs/heads/', '');
      const itemsEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items?scopePath=${encodeURIComponent(basePath)}&recursionLevel=Full&includeContentMetadata=true&versionDescriptor.version=${encodeURIComponent(branchName)}&versionDescriptor.versionType=branch&api-version=7.1`;
      const data = await azureFetch(itemsEndpoint);
      
      const items = data.value || [];
      console.log(`Total items from Azure: ${items.length}`);
      if (items.length > 0) {
        console.log('Sample item:', JSON.stringify(items[0]));
        console.log('Sample item keys:', Object.keys(items[0]));
      }

      const langNames = ['dotnet', 'java', 'python'];
      const templates: any[] = [];
      const seenPaths = new Set<string>();

      for (const item of items) {
        // Skip root
        if (item.path === basePath) continue;
        
        const relativePath = item.path.substring(basePath.length + 1);
        const parts = relativePath.split('/');

        // Check if this is a folder (gitObjectType === 'tree' OR isFolder === true OR no content metadata)
        const isFolder = item.gitObjectType === 'tree' || item.isFolder === true || 
          (item.contentMetadata === undefined && !item.path.includes('.'));

        // Template = 2-level deep folder under a language folder: e.g. dotnet/api-template
        if (parts.length === 2 && langNames.includes(parts[0]) && isFolder && !seenPaths.has(item.path)) {
          seenPaths.add(item.path);
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

      // Fallback: if no 2-level templates, treat language folders as templates
      if (templates.length === 0) {
        console.log('No sub-templates found, using language folders as templates');
        for (const item of items) {
          if (item.path === basePath) continue;
          const relativePath = item.path.substring(basePath.length + 1);
          const parts = relativePath.split('/');
          
          if (parts.length === 1 && langNames.includes(parts[0])) {
            templates.push({
              id: item.objectId || parts[0],
              name: `Base ${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}`,
              language: parts[0],
              path: item.path,
              repoName: repo,
              project: project,
            });
          }
        }
      }

      console.log(`Returning ${templates.length} templates`);
      return new Response(JSON.stringify({ value: templates, _debug: { totalItems: items.length, samplePaths: items.slice(0, 10).map((i: any) => ({ path: i.path, gitObjectType: i.gitObjectType, isFolder: i.isFolder })) } }), {
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
