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
      throw new Error(`Azure DevOps API [${res.status}]: ${text}`);
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
      const basePath = url.searchParams.get('path') || '/base-argoit';

      // Step 1: Get repo info (including default branch)
      const repoInfo = await azureFetch(
        `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}?api-version=7.1`
      );
      const repoId = repoInfo.id;
      const branch = (repoInfo.defaultBranch || 'refs/heads/main').replace('refs/heads/', '');
      console.log(`Repo: ${repo}, id: ${repoId}, branch: ${branch}`);

      // Step 2: Get the latest commit on the branch
      const commitsData = await azureFetch(
        `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/commits?searchCriteria.itemVersion.version=${encodeURIComponent(branch)}&$top=1&api-version=7.1`
      );
      
      if (!commitsData.value || commitsData.value.length === 0) {
        throw new Error('No commits found in repo');
      }
      const latestCommitId = commitsData.value[0].commitId;
      console.log(`Latest commit: ${latestCommitId}`);

      // Step 3: Get the tree for that commit (full recursive tree)
      const treeData = await azureFetch(
        `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/trees/${latestCommitId}?recursive=true&api-version=7.1`
      );

      // Wait - trees endpoint needs a treeId, not commitId
      // Let's use Items API with the repo ID instead of name
      // Try: get items listing with the full tree
      const itemsUrl = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items?scopePath=${encodeURIComponent(basePath)}&recursionLevel=Full&api-version=7.1`;
      console.log('Items URL:', itemsUrl);
      
      let data;
      try {
        data = await azureFetch(itemsUrl);
      } catch (itemsError) {
        console.error('Items API failed:', itemsError);
        // Try without leading slash
        const altPath = basePath.startsWith('/') ? basePath.substring(1) : basePath;
        const altUrl = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items?scopePath=${encodeURIComponent(altPath)}&recursionLevel=Full&api-version=7.1`;
        console.log('Trying alt URL:', altUrl);
        data = await azureFetch(altUrl);
      }

      // Handle both array and object responses
      let items: any[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data.value) {
        items = data.value;
      } else if (data.treeEntries) {
        items = data.treeEntries;
      }
      
      console.log(`Got ${items.length} items. First 5:`, JSON.stringify(items.slice(0, 5)));

      const langNames = ['dotnet', 'java', 'python'];
      const templates: any[] = [];
      const seenPaths = new Set<string>();

      for (const item of items) {
        const itemPath = item.path || item.relativePath || '';
        if (itemPath === basePath || itemPath === basePath.substring(1)) continue;
        
        // Normalize path
        const normalizedBase = basePath.startsWith('/') ? basePath : '/' + basePath;
        const normalizedPath = itemPath.startsWith('/') ? itemPath : '/' + itemPath;
        
        if (!normalizedPath.startsWith(normalizedBase + '/')) continue;
        
        const relativePath = normalizedPath.substring(normalizedBase.length + 1);
        const parts = relativePath.split('/');

        const isFolder = item.gitObjectType === 'tree' || item.isFolder === true || 
          item.folder === true || (item.size === undefined && !relativePath.includes('.'));

        // 2-level: language/template-name
        if (parts.length === 2 && langNames.includes(parts[0]) && isFolder && !seenPaths.has(normalizedPath)) {
          seenPaths.add(normalizedPath);
          templates.push({
            id: item.objectId || `${parts[0]}-${parts[1]}`,
            name: parts[1],
            language: parts[0],
            path: normalizedPath,
            repoName: repo,
            project: project,
          });
        }
      }

      // Fallback: language folders themselves
      if (templates.length === 0) {
        for (const item of items) {
          const itemPath = item.path || item.relativePath || '';
          const normalizedBase = basePath.startsWith('/') ? basePath : '/' + basePath;
          const normalizedPath = itemPath.startsWith('/') ? itemPath : '/' + itemPath;
          
          if (!normalizedPath.startsWith(normalizedBase + '/')) continue;
          
          const relativePath = normalizedPath.substring(normalizedBase.length + 1);
          const parts = relativePath.split('/');
          
          if (parts.length === 1 && langNames.includes(parts[0])) {
            templates.push({
              id: item.objectId || parts[0],
              name: `Base ${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}`,
              language: parts[0],
              path: normalizedPath,
              repoName: repo,
              project: project,
            });
          }
        }
      }

      console.log(`Returning ${templates.length} templates`);
      return new Response(JSON.stringify({ 
        value: templates,
        _meta: { totalItems: items.length, branch, repoId }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
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
