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

  if (!AZURE_DEVOPS_ORG || !AZURE_DEVOPS_PAT) {
    return new Response(JSON.stringify({ error: 'Azure DevOps credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = `Basic ${btoa(`:${AZURE_DEVOPS_PAT}`)}`;
  const baseUrl = `https://dev.azure.com/${AZURE_DEVOPS_ORG}`;

  async function azureFetch(endpoint: string) {
    const res = await fetch(endpoint, { headers: { 'Authorization': authHeader } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Azure API [${res.status}]: ${text}`);
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
      return new Response(JSON.stringify(await azureFetch(endpoint)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'templates') {
      const project = url.searchParams.get('project') || 'Devops';
      const repo = url.searchParams.get('repo') || 'argo-code';
      const basePath = url.searchParams.get('path') || '/base-argoit';

      // Use repo ID for reliability
      const repoInfo = await azureFetch(
        `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}?api-version=7.1`
      );
      const repoId = repoInfo.id;

      // Get items - try multiple path formats
      let items: any[] = [];
      const pathsToTry = [basePath, basePath.replace(/^\//, '')];
      
      for (const tryPath of pathsToTry) {
        try {
          const endpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items?scopePath=${encodeURIComponent(tryPath)}&recursionLevel=Full&api-version=7.1`;
          console.log('Trying items endpoint:', endpoint);
          const data = await azureFetch(endpoint);
          
          if (Array.isArray(data)) {
            items = data;
          } else if (data.value && data.value.length > 0) {
            items = data.value;
          } else if (data.count > 0) {
            items = data.value || [];
          }
          
          if (items.length > 0) {
            console.log(`Found ${items.length} items with path: ${tryPath}`);
            break;
          }
        } catch (e) {
          console.log(`Path "${tryPath}" failed:`, (e as Error).message);
        }
      }

      // If items API didn't work, try getting root items and filtering
      if (items.length === 0) {
        console.log('Trying root items...');
        try {
          const rootEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items?recursionLevel=OneLevel&api-version=7.1`;
          const rootData = await azureFetch(rootEndpoint);
          const rootItems = rootData.value || [];
          console.log('Root items:', rootItems.map((i: any) => i.path));
          
          // Find the base-argoit folder
          const baseFolder = rootItems.find((i: any) => 
            i.path === basePath || i.path === basePath.replace(/^\//, '') || 
            i.path === '/base-argoit' || i.path === 'base-argoit'
          );
          
          if (baseFolder) {
            console.log('Found base folder:', baseFolder.path);
            const subEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items?scopePath=${encodeURIComponent(baseFolder.path)}&recursionLevel=Full&api-version=7.1`;
            const subData = await azureFetch(subEndpoint);
            items = subData.value || [];
            console.log(`Found ${items.length} items under ${baseFolder.path}`);
          } else {
            console.log('base-argoit not found in root. Available:', rootItems.map((i: any) => i.path));
          }
        } catch (e) {
          console.error('Root items failed:', (e as Error).message);
        }
      }

      // Parse templates from items
      const langNames = ['dotnet', 'java', 'python'];
      const templates: any[] = [];
      const normalizedBase = basePath.startsWith('/') ? basePath : '/' + basePath;

      for (const item of items) {
        const p = item.path?.startsWith('/') ? item.path : '/' + (item.path || '');
        if (p === normalizedBase) continue;
        if (!p.startsWith(normalizedBase + '/')) continue;

        const rel = p.substring(normalizedBase.length + 1);
        const parts = rel.split('/');
        const isFolder = item.gitObjectType === 'tree' || item.isFolder === true;

        if (parts.length === 2 && langNames.includes(parts[0]) && isFolder) {
          templates.push({
            id: item.objectId || `${parts[0]}-${parts[1]}`,
            name: parts[1],
            language: parts[0],
            path: p,
            repoName: repo,
            project: project,
          });
        }
      }

      // Fallback: language folders
      if (templates.length === 0) {
        for (const item of items) {
          const p = item.path?.startsWith('/') ? item.path : '/' + (item.path || '');
          if (!p.startsWith(normalizedBase + '/')) continue;
          const rel = p.substring(normalizedBase.length + 1);
          if (!rel.includes('/') && langNames.includes(rel)) {
            templates.push({
              id: item.objectId || rel,
              name: `Base ${rel.charAt(0).toUpperCase() + rel.slice(1)}`,
              language: rel,
              path: p,
              repoName: repo,
              project: project,
            });
          }
        }
      }

      return new Response(JSON.stringify({ 
        value: templates,
        _debug: { itemCount: items.length, sampleItems: items.slice(0, 8).map((i: any) => ({ path: i.path, type: i.gitObjectType, isFolder: i.isFolder })) }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
