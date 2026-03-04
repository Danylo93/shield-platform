import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

  async function azureFetch(endpoint: string, options?: RequestInit) {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Azure API [${res.status}]: ${text}`);
    }
    return res.json();
  }

  // Helper to get supabase admin client
  function getSupabaseAdmin() {
    return createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
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

    if (action === 'create-repo') {
      // POST request with component details
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'POST required' }), {
          status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { componentId, projectName, repoName } = body;

      if (!componentId || !projectName || !repoName) {
        return new Response(JSON.stringify({ error: 'Missing componentId, projectName or repoName' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseAdmin = getSupabaseAdmin();

      // Update status to "creating"
      await supabaseAdmin.from('components').update({
        approval_status: 'creating',
      }).eq('id', componentId);

      try {
        // 1. Get the project ID
        const projectData = await azureFetch(`${baseUrl}/_apis/projects/${encodeURIComponent(projectName)}?api-version=7.1`);
        const projectId = projectData.id;

        // 2. Create the repository
        const repoData = await azureFetch(`${baseUrl}/_apis/git/repositories?api-version=7.1`, {
          method: 'POST',
          body: JSON.stringify({
            name: repoName,
            project: { id: projectId },
          }),
        });

        const repoUrl = repoData.webUrl || repoData.remoteUrl;
        const repoId = repoData.id;

        // 3. Create initial commit with all template files
        const encoder = new TextEncoder();
        const encode64 = (str: string) => {
          const bytes = encoder.encode(str);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary);
        };

        const readmeContent = `# ${repoName}\n\nRepositório criado automaticamente pelo IDP ArgoIT.\n\n## Branches\n- \`main\` - Branch principal\n- \`develop\` - Branch de desenvolvimento (padrão)\n- \`feature/teste\` - Branch de feature\n- \`release/v1.0\` - Branch de release`;

        const dockerfileContent = `# Final runtime image\nFROM eclipse-temurin:17-jre-jammy AS runtime\nWORKDIR /app\nMAINTAINER Argo DevSecOps <devopsacesso@useargo.com>\nARG JAVA_JAR\nENV JAVA_JAR=\${JAVA_JAR}\n\nENV JAVA_OPTS=""\nENV TZ=America/Sao_Paulo\n\nENV APP_PORT=8080\n\nEXPOSE 8080\n\n# Command to run the application with dynamic JAR name\nENTRYPOINT ["sh", "-c", "java \${JAVA_OPTS} -jar \${JAVA_JAR}"]`;

        const deepsourceContent = `version = 1\n\n[[analyzers]]\nname = "java"\n\n  [analyzers.meta]\n  runtime_version = "17"`;

        const azurePipelinesContent = `resources:\n  repositories:\n    - repository: argo-code\n      type: git\n      name: Devops/argo-code\n      ref: refs/heads/main\n\n\nextends:\n  template: base-argoit/java/template.yml@argo-code`;

        const changes = [
          {
            changeType: "add",
            item: { path: "/README.md" },
            newContent: { content: encode64(readmeContent), contentType: "base64encoded" },
          },
          {
            changeType: "add",
            item: { path: "/Dockerfile" },
            newContent: { content: encode64(dockerfileContent), contentType: "base64encoded" },
          },
          {
            changeType: "add",
            item: { path: "/.deepsource.toml" },
            newContent: { content: encode64(deepsourceContent), contentType: "base64encoded" },
          },
          {
            changeType: "add",
            item: { path: "/azure-pipelines.yml" },
            newContent: { content: encode64(azurePipelinesContent), contentType: "base64encoded" },
          },
        ];
        
        try {
          await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${repoId}/pushes?api-version=7.1`, {
            method: 'POST',
            body: JSON.stringify({
              refUpdates: [{ name: "refs/heads/main", oldObjectId: "0000000000000000000000000000000000000000" }],
              commits: [{
                comment: "Initial commit - IDP ArgoIT",
                changes,
              }],
            }),
          });

          // 4. Create branches: develop, feature/teste, release/v1.0
          // Get main branch ref
          const refsData = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${repoId}/refs?filter=heads/main&api-version=7.1`);
          const mainRef = refsData.value?.[0];
          
          if (mainRef) {
            const mainObjectId = mainRef.objectId;
            const branchesToCreate = [
              "refs/heads/develop",
              "refs/heads/feature/teste",
              "refs/heads/release/v1.0",
            ];

            const refUpdates = branchesToCreate.map(name => ({
              name,
              oldObjectId: "0000000000000000000000000000000000000000",
              newObjectId: mainObjectId,
            }));

            await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${repoId}/refs?api-version=7.1`, {
              method: 'POST',
              body: JSON.stringify(refUpdates),
            });
          }
        } catch (branchError) {
          console.error('Branch creation warning:', branchError);
          // Repo was created, branches may have partially failed
        }

        // 5. Update component with repo URL and status "created"
        await supabaseAdmin.from('components').update({
          approval_status: 'created',
          repo_url: repoUrl,
        }).eq('id', componentId);

        return new Response(JSON.stringify({ 
          success: true, 
          repoUrl,
          repoId: repoData.id,
          message: 'Repositório criado com sucesso' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (createError) {
        // Update component with error status
        await supabaseAdmin.from('components').update({
          approval_status: 'error',
          rejection_reason: `Erro ao criar repo: ${(createError as Error).message}`,
        }).eq('id', componentId);

        throw createError;
      }
    }

    if (action === 'templates') {
      const project = url.searchParams.get('project') || 'Devops';
      const repo = url.searchParams.get('repo') || 'argo-code';
      const basePath = url.searchParams.get('path') || '/base-argoit';

      const repoInfo = await azureFetch(
        `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}?api-version=7.1`
      );
      const repoId = repoInfo.id;

      let items: any[] = [];
      const pathsToTry = [basePath, basePath.replace(/^\//, '')];
      
      for (const tryPath of pathsToTry) {
        try {
          const endpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items?scopePath=${encodeURIComponent(tryPath)}&recursionLevel=Full&api-version=7.1`;
          console.log('Trying items endpoint:', endpoint);
          const data = await azureFetch(endpoint);
          
          if (Array.isArray(data)) items = data;
          else if (data.value && data.value.length > 0) items = data.value;
          else if (data.count > 0) items = data.value || [];
          
          if (items.length > 0) {
            console.log(`Found ${items.length} items with path: ${tryPath}`);
            break;
          }
        } catch (e) {
          console.log(`Path "${tryPath}" failed:`, (e as Error).message);
        }
      }

      if (items.length === 0) {
        try {
          const rootEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items?recursionLevel=OneLevel&api-version=7.1`;
          const rootData = await azureFetch(rootEndpoint);
          const rootItems = rootData.value || [];
          const baseFolder = rootItems.find((i: any) => 
            i.path === basePath || i.path === basePath.replace(/^\//, '') || 
            i.path === '/base-argoit' || i.path === 'base-argoit'
          );
          if (baseFolder) {
            const subEndpoint = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items?scopePath=${encodeURIComponent(baseFolder.path)}&recursionLevel=Full&api-version=7.1`;
            const subData = await azureFetch(subEndpoint);
            items = subData.value || [];
          }
        } catch (e) {
          console.error('Root items failed:', (e as Error).message);
        }
      }

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
