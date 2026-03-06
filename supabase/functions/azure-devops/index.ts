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
      const { componentId, projectName, repoName, language, runtimeVersion } = body;

      if (!componentId || !projectName || !repoName) {
        return new Response(JSON.stringify({ error: 'Missing componentId, projectName or repoName' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseAdmin = getSupabaseAdmin();
      const creationDetails: Record<string, any> = {};

      // Helper to update creation step
      async function updateStep(step: string) {
        await supabaseAdmin.from('components').update({
          approval_status: 'creating',
          creation_step: step,
          creation_details: creationDetails,
        }).eq('id', componentId);
      }

      try {
        // Step 1: Creating repository
        await updateStep('creating_repo');
        const projectData = await azureFetch(`${baseUrl}/_apis/projects/${encodeURIComponent(projectName)}?api-version=7.1`);
        const projectId = projectData.id;

        // Check if repo already exists
        let repoData: any;
        let repoCreated = false;
        try {
          repoData = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${encodeURIComponent(repoName)}?api-version=7.1`);
          repoCreated = false;
          console.log(`Repo '${repoName}' already exists`);
        } catch {
          // Repo doesn't exist, create it
          repoData = await azureFetch(`${baseUrl}/_apis/git/repositories?api-version=7.1`, {
            method: 'POST',
            body: JSON.stringify({
              name: repoName,
              project: { id: projectId },
            }),
          });
          repoCreated = true;
          console.log(`Repo '${repoName}' created`);
        }

        creationDetails.repo = { status: repoCreated ? 'criado' : 'existente', name: repoName };

        const repoUrl = repoData.webUrl || repoData.remoteUrl;
        const repoId = repoData.id;

        // Step 2: Pushing initial commit
        await updateStep('pushing_code');

        const encoder = new TextEncoder();
        const encode64 = (str: string) => {
          const bytes = encoder.encode(str);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary);
        };

        const readmeContent = `# ${repoName}\n\nRepositório criado automaticamente pelo IDP ArgoIT.\n\n## Branches\n- \`main\` - Branch principal\n- \`develop\` - Branch de desenvolvimento (padrão)\n- \`feature/teste\` - Branch de feature\n- \`release/v1.0\` - Branch de release`;

        const lang = (language || "java").toLowerCase();
        const templateId = body.templateId || "";
        const requestedRuntimeVersion = String(runtimeVersion || "").trim();

        const sanitizeMajor = (value: string) => value.replace(/[^\d]/g, "");

        const dotnetVersionMap: Record<string, { sdk: string; tfm: string; baseTag: string }> = {
          "6": { sdk: "6.0.428", tfm: "net6.0", baseTag: "base-dotnet6" },
          "8": { sdk: "8.0.407", tfm: "net8.0", baseTag: "base-dotnet8" },
          "9": { sdk: "9.0.203", tfm: "net9.0", baseTag: "base-dotnet9" },
          "10": { sdk: "10.0.100", tfm: "net10.0", baseTag: "base-dotnet10" },
        };
        const supportedJavaVersions = new Set(["8", "11", "17", "21", "25"]);
        const supportedPythonVersions = new Set(["3.11", "3.12", "3.13", "3.14"]);

        let dotnetVer = "8";
        const dotnetMatch = templateId.match(/dotnet(\d+)/i);
        if (requestedRuntimeVersion) {
          const requestedMajor = sanitizeMajor(requestedRuntimeVersion);
          if (dotnetVersionMap[requestedMajor]) dotnetVer = requestedMajor;
        } else if (dotnetMatch && dotnetVersionMap[dotnetMatch[1]]) {
          dotnetVer = dotnetMatch[1];
        }
        const dv = dotnetVersionMap[dotnetVer] || dotnetVersionMap["8"];

        let javaVer = "17";
        const javaMatch = templateId.match(/java(\d+)/i);
        if (requestedRuntimeVersion && supportedJavaVersions.has(requestedRuntimeVersion)) {
          javaVer = requestedRuntimeVersion;
        } else if (javaMatch && supportedJavaVersions.has(javaMatch[1])) {
          javaVer = javaMatch[1];
        }

        const springBootByJava: Record<string, string> = {
          "8": "2.7.18",
          "11": "2.7.18",
          "17": "3.2.0",
          "21": "3.2.0",
          "25": "3.2.0",
        };
        const springBootVersion = springBootByJava[javaVer] || "3.2.0";

        let pythonVer = "3.13";
        const pythonMatch = templateId.match(/python(\d+(?:\.\d+)?)/i);
        if (requestedRuntimeVersion && supportedPythonVersions.has(requestedRuntimeVersion)) {
          pythonVer = requestedRuntimeVersion;
        } else if (pythonMatch && supportedPythonVersions.has(pythonMatch[1])) {
          pythonVer = pythonMatch[1];
        }

        creationDetails.runtime = { language: lang, version: lang === "dotnet" ? dotnetVer : lang === "java" ? javaVer : pythonVer };

        const langFiles: Record<string, { dockerfile: string; deepsource: string; pipeline: string; srcFiles: { path: string; content: string }[] }> = {
          java: {
            dockerfile: `# Multi-stage build para microserviços Java\nFROM maven:3.9-eclipse-temurin-${javaVer} AS build\nWORKDIR /src\n\n# Copiar arquivos de dependências primeiro para melhor uso de cache\nCOPY pom.xml .\nRUN mvn -B -q -DskipTests dependency:go-offline\n\n# Copiar código fonte e compilar\n# Gerar uber-jar para que o JAR tenha Main-Class no manifest e seja executável\nCOPY src ./src\nRUN mvn -B -DskipTests clean package -Dquarkus.package.type=uber-jar\n\n# Stage 2: Imagem de runtime usando a base customizada\nFROM acrwakandause2hubiszw.azurecr.io/base-java:latest\n\n# Copiar o JAR da etapa de build\nCOPY --from=build /src/target/*.jar /app/app.jar\n\n# Configurar a variável de ambiente para o JAR\nENV JAVA_JAR=app.jar`,
            deepsource: `version = 1\n\n[[analyzers]]\nname = "java"\n\n  [analyzers.meta]\n  runtime_version = "${javaVer}"`,
            pipeline: "trigger:\n  branches:\n    include:\n       - main\n       - develop\n       - feature/*\n       - release/*\n\nresources:\n  repositories:\n    - repository: argo-code\n      type: git\n      name: Devops/argo-code\n      ref: refs/heads/main\n\nvariables:\n  - template: base-argoit/variables/global.yml@argo-code\n\nstages:\n  - template: base-argoit/java/template.yml@argo-code\n    parameters:\n      environment: ${{ variables.environment }}",
            srcFiles: [
              { path: "/pom.xml", content: `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0"\n         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">\n    <modelVersion>4.0.0</modelVersion>\n    <parent>\n        <groupId>org.springframework.boot</groupId>\n        <artifactId>spring-boot-starter-parent</artifactId>\n        <version>${springBootVersion}</version>\n        <relativePath/>\n    </parent>\n    <groupId>com.argoit</groupId>\n    <artifactId>${repoName}</artifactId>\n    <version>0.0.1-SNAPSHOT</version>\n    <name>${repoName}</name>\n    <description>Projeto criado pelo IDP ArgoIT</description>\n    <properties>\n        <java.version>${javaVer}</java.version>\n    </properties>\n    <dependencies>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-web</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-actuator</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-test</artifactId>\n            <scope>test</scope>\n        </dependency>\n    </dependencies>\n    <build>\n        <plugins>\n            <plugin>\n                <groupId>org.springframework.boot</groupId>\n                <artifactId>spring-boot-maven-plugin</artifactId>\n            </plugin>\n        </plugins>\n    </build>\n</project>` },
              { path: "/src/main/java/com/argoit/Application.java", content: `package com.argoit;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n@SpringBootApplication\npublic class Application {\n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n}` },
              { path: "/src/main/java/com/argoit/controller/HealthController.java", content: `package com.argoit.controller;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\nimport java.util.Map;\n\n@RestController\npublic class HealthController {\n\n    @GetMapping("/health")\n    public Map<String, String> health() {\n        return Map.of("status", "UP", "service", "${repoName}");\n    }\n}` },
              { path: "/src/main/resources/application.yml", content: `server:\n  port: 8080\n\nspring:\n  application:\n    name: ${repoName}\n\nmanagement:\n  endpoints:\n    web:\n      exposure:\n        include: health,info` },
              { path: "/src/test/java/com/argoit/ApplicationTests.java", content: `package com.argoit;\n\nimport org.junit.jupiter.api.Test;\nimport org.springframework.boot.test.context.SpringBootTest;\n\n@SpringBootTest\nclass ApplicationTests {\n    @Test\n    void contextLoads() {\n    }\n}` },
              { path: "/.gitignore", content: `target/\n*.class\n*.jar\n*.war\n*.ear\n.idea/\n*.iml\n.DS_Store\n*.log` },
            ],
          },
          python: {
            dockerfile: `FROM python:${pythonVer}-slim\nWORKDIR /app\nMAINTAINER Argo DevSecOps <devopsacesso@useargo.com>\n\nENV TZ=America/Sao_Paulo\nENV PYTHONUNBUFFERED=1\n\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\n\nCOPY src/ ./src/\n\nEXPOSE 8080\n\nCMD ["python", "src/main.py"]`,
            deepsource: `version = 1\n\n[[analyzers]]\nname = "python"\n\n  [analyzers.meta]\n  runtime_version = "${pythonVer}"`,
            pipeline: "trigger:\n  branches:\n    include:\n       - main\n       - develop\n       - feature/*\n       - release/*\n\nresources:\n  repositories:\n    - repository: argo-code\n      type: git\n      name: Devops/argo-code\n      ref: refs/heads/main\n\nvariables:\n  - template: base-argoit/variables/global.yml@argo-code\n\nstages:\n  - template: base-argoit/python/template.yml@argo-code\n    parameters:\n      environment: ${{ variables.environment }}",
            srcFiles: [
              { path: "/requirements.txt", content: `fastapi==0.115.12\nuvicorn==0.34.0\npydantic==2.11.0\npytest==8.3.5` },
              { path: "/src/__init__.py", content: `` },
              { path: "/src/main.py", content: `from fastapi import FastAPI\nimport uvicorn\n\napp = FastAPI(title="${repoName}", version="0.1.0")\n\n\n@app.get("/health")\ndef health():\n    return {"status": "UP", "service": "${repoName}"}\n\n\n@app.get("/")\ndef root():\n    return {"message": "Bem-vindo ao ${repoName}"}\n\n\nif __name__ == "__main__":\n    uvicorn.run(app, host="0.0.0.0", port=8080)` },
              { path: "/src/config.py", content: `import os\n\n\nclass Settings:\n    APP_NAME: str = "${repoName}"\n    APP_PORT: int = int(os.getenv("APP_PORT", "8080"))\n    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "dev")\n\n\nsettings = Settings()` },
              { path: "/tests/__init__.py", content: `` },
              { path: "/tests/test_main.py", content: `from fastapi.testclient import TestClient\nfrom src.main import app\n\nclient = TestClient(app)\n\n\ndef test_health():\n    response = client.get("/health")\n    assert response.status_code == 200\n    assert response.json()["status"] == "UP"` },
              { path: "/.gitignore", content: `__pycache__/\n*.py[cod]\n*.egg-info/\ndist/\nbuild/\n.env\n.venv/\nvenv/\n*.log\n.DS_Store` },
            ],
          },
          dotnet: {
            dockerfile: `FROM acrwakandause2hubiszw.azurecr.io/${dv.baseTag}:latest\n\nCOPY ./publish .\n\nENV DOTNET_DLL=${repoName}.dll`,
            deepsource: `version = 1\n\n[[analyzers]]\nname = "csharp"`,
            pipeline: `trigger:\n  branches:\n    include:\n       - main\n       - develop\n       - feature/*\n       - release/*\n\nresources:\n  repositories:\n    - repository: code\n      type: git\n      name: Devops/argo-code\n      ref: refs/heads/main\n\nstages:\n  - template: base-argoit/dotnet/template.yml@code\n    parameters:\n      dotNetVersion: '${dv.sdk}'`,
            srcFiles: [
              { path: `/src/${repoName}.csproj`, content: `<Project Sdk="Microsoft.NET.Sdk.Web">\n  <PropertyGroup>\n    <TargetFramework>${dv.tfm}</TargetFramework>\n    <Nullable>enable</Nullable>\n    <ImplicitUsings>enable</ImplicitUsings>\n  </PropertyGroup>\n</Project>` },
              { path: "/src/Program.cs", content: `var builder = WebApplication.CreateBuilder(args);\n\nbuilder.Services.AddEndpointsApiExplorer();\nbuilder.Services.AddSwaggerGen();\n\nvar app = builder.Build();\n\nif (app.Environment.IsDevelopment())\n{\n    app.UseSwagger();\n    app.UseSwaggerUI();\n}\n\napp.MapGet("/health", () => new { status = "UP", service = "${repoName}" });\n\napp.MapGet("/", () => new { message = "Bem-vindo ao ${repoName}" });\n\napp.Run();` },
              { path: "/src/appsettings.json", content: `{\n  "Logging": {\n    "LogLevel": {\n      "Default": "Information",\n      "Microsoft.AspNetCore": "Warning"\n    }\n  },\n  "AllowedHosts": "*"\n}` },
              { path: "/.gitignore", content: `bin/\nobj/\npublish/\n*.user\n*.suo\n.vs/\n*.log\n.DS_Store` },
            ],
          },
        };

        const langConfig = langFiles[lang] || langFiles.java;

        const changes: any[] = [
          {
            changeType: "add",
            item: { path: "/README.md" },
            newContent: { content: encode64(readmeContent), contentType: "base64encoded" },
          },
          {
            changeType: "add",
            item: { path: "/Dockerfile" },
            newContent: { content: encode64(langConfig.dockerfile), contentType: "base64encoded" },
          },
          {
            changeType: "add",
            item: { path: "/.deepsource.toml" },
            newContent: { content: encode64(langConfig.deepsource), contentType: "base64encoded" },
          },
          {
            changeType: "add",
            item: { path: "/azure-pipelines.yml" },
            newContent: { content: encode64(langConfig.pipeline), contentType: "base64encoded" },
          },
        ];

        for (const srcFile of langConfig.srcFiles) {
          changes.push({
            changeType: "add",
            item: { path: srcFile.path },
            newContent: { content: encode64(srcFile.content), contentType: "base64encoded" },
          });
        }
        
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

          // Step 3: Creating branches
          await updateStep('creating_branches');
          const refsData = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${repoId}/refs?filter=heads/&api-version=7.1`);
          const existingBranches = (refsData.value || []).map((r: any) => r.name);
          const mainRef = refsData.value?.find((r: any) => r.name === 'refs/heads/main');
          
          const branchDetails: Record<string, string> = {};
          branchDetails['main'] = existingBranches.includes('refs/heads/main') ? 'existente' : 'criada';

          if (mainRef) {
            const mainObjectId = mainRef.objectId;
            const branchesToCreate = [
              "refs/heads/develop",
              "refs/heads/feature/teste",
              "refs/heads/release/v1.0",
            ];

            const refUpdates: any[] = [];
            for (const name of branchesToCreate) {
              const shortName = name.replace('refs/heads/', '');
              if (existingBranches.includes(name)) {
                branchDetails[shortName] = 'existente';
              } else {
                refUpdates.push({
                  name,
                  oldObjectId: "0000000000000000000000000000000000000000",
                  newObjectId: mainObjectId,
                });
                branchDetails[shortName] = 'criada';
              }
            }

            if (refUpdates.length > 0) {
              await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${repoId}/refs?api-version=7.1`, {
                method: 'POST',
                body: JSON.stringify(refUpdates),
              });
            }

            creationDetails.branches = branchDetails;
            await updateStep('creating_branches');

            // Step 4: Set develop as default branch
            await updateStep('setting_default_branch');
            await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${repoId}?api-version=7.1`, {
              method: 'PATCH',
              body: JSON.stringify({
                defaultBranch: 'refs/heads/develop',
              }),
            });
          }

          // Step 5: Create environments if they don't exist
          await updateStep('creating_environments');
          const envDetails: Record<string, string> = {};
          try {
            const envNames = ['dev', 'stg', 'rc', 'prd'];
            const existingEnvs = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines/environments?api-version=7.1`);
            const existingEnvNames = (existingEnvs.value || []).map((e: any) => e.name.toLowerCase());
            
            for (const envName of envNames) {
              if (!existingEnvNames.includes(envName)) {
                await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines/environments?api-version=7.1`, {
                  method: 'POST',
                  body: JSON.stringify({ name: envName, description: `Ambiente ${envName.toUpperCase()} - criado pelo S.H.I.E.L.D Platform` }),
                });
                envDetails[envName] = 'criado';
              } else {
                envDetails[envName] = 'existente';
              }
            }
          } catch (envError) {
            console.error('Environment creation warning:', envError);
          }
          creationDetails.environments = envDetails;
          await updateStep('creating_environments');

          // Step 6: Create pipeline definition
          await updateStep('creating_pipeline');
          let pipelineCreated = false;
          let pipelineId: number | null = null;
          try {
            // Check if pipeline already exists
            const existingPipelines = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines?api-version=7.1`);
            const existingPipeline = (existingPipelines.value || []).find((p: any) => p.name.toLowerCase() === repoName.toLowerCase());
            
            if (existingPipeline) {
              pipelineId = existingPipeline.id;
              pipelineCreated = false;
              console.log('Pipeline already exists:', pipelineId);
            } else {
              const pipelineData = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines?api-version=7.1`, {
                method: 'POST',
                body: JSON.stringify({
                  name: repoName,
                  folder: '\\',
                  configuration: {
                    type: 'yaml',
                    path: '/azure-pipelines.yml',
                    repository: {
                      id: repoId,
                      type: 'azureReposGit',
                    },
                  },
                }),
              });
              pipelineId = pipelineData.id;
              pipelineCreated = true;
              console.log('Pipeline created:', pipelineId);
            }
            
            creationDetails.pipeline = { status: pipelineCreated ? 'criado' : 'existente', id: pipelineId };
            await updateStep('creating_pipeline');

            // Step 7: Run pipeline on develop
            await updateStep('running_pipeline');
            const runData = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines/${pipelineId}/runs?api-version=7.1`, {
              method: 'POST',
              body: JSON.stringify({
                resources: {
                  repositories: {
                    self: {
                      refName: 'refs/heads/develop',
                    },
                  },
                },
              }),
            });

            creationDetails.pipelineRun = {
              id: runData.id,
              state: runData.state,
              url: runData._links?.web?.href || null,
            };
            console.log('Pipeline run triggered on develop');
          } catch (pipelineError) {
            creationDetails.pipeline = { ...(creationDetails.pipeline || {}), error: (pipelineError as Error).message };
            console.error('Pipeline creation/run warning:', pipelineError);
          }
          
        } catch (branchError) {
          console.error('Branch/pipeline warning:', branchError);
        }

        // Final: Update component with repo URL and status "created"
        await supabaseAdmin.from('components').update({
          approval_status: 'created',
          repo_url: repoUrl,
          creation_step: 'done',
          creation_details: creationDetails,
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

    if (action === 'delete-repo') {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'POST required' }), {
          status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { componentId, projectName, repoName } = body;

      if (!componentId || !projectName || !repoName) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseAdmin = getSupabaseAdmin();

      try {
        // Get repo ID
        const repoInfo = await azureFetch(
          `${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${encodeURIComponent(repoName)}?api-version=7.1`
        );

        // Delete the repo
        const res = await fetch(
          `${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${repoInfo.id}?api-version=7.1`,
          { method: 'DELETE', headers: { 'Authorization': authHeader } }
        );

        if (!res.ok && res.status !== 404) {
          const text = await res.text();
          throw new Error(`Failed to delete repo: ${text}`);
        }
      } catch (e) {
        console.error('Repo deletion warning:', (e as Error).message);
        // Continue to delete the component record even if Azure deletion fails
      }

      // Delete component record
      await supabaseAdmin.from('components').delete().eq('id', componentId);

      return new Response(JSON.stringify({ success: true, message: 'Repositório excluído' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // List pipelines for a project
    if (action === 'pipelines') {
      const projectName = url.searchParams.get('project');
      if (!projectName) {
        return new Response(JSON.stringify({ error: 'project is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines?api-version=7.1`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List branches for a repo
    if (action === 'branches') {
      const projectName = url.searchParams.get('project');
      const repoNameParam = url.searchParams.get('repo');
      if (!projectName || !repoNameParam) {
        return new Response(JSON.stringify({ error: 'project and repo are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/git/repositories/${encodeURIComponent(repoNameParam)}/refs?filter=heads/&api-version=7.1`);
      const branches = (data.value || []).map((ref: any) => ({
        name: ref.name.replace('refs/heads/', ''),
        objectId: ref.objectId,
      }));
      return new Response(JSON.stringify({ value: branches }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List pipeline runs
    if (action === 'pipeline-runs') {
      const projectName = url.searchParams.get('project');
      const pipelineId = url.searchParams.get('pipelineId');
      if (!projectName || !pipelineId) {
        return new Response(JSON.stringify({ error: 'project and pipelineId are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines/${pipelineId}/runs?api-version=7.1`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deploy stats - count pipeline runs across all projects in the last 30 days
    if (action === 'deploy-stats') {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 30);
      const minTime = minDate.toISOString();

      // Get all projects
      const projectsData = await azureFetch(`${baseUrl}/_apis/projects?api-version=7.1&$top=100`);
      const projects = projectsData.value || [];

      let totalRuns = 0;
      for (const project of projects) {
        try {
          // Use the builds API which supports minTime filter
          const buildsData = await azureFetch(
            `${baseUrl}/${encodeURIComponent(project.name)}/_apis/build/builds?api-version=7.1&minTime=${encodeURIComponent(minTime)}&$top=1000&queryOrder=startTimeDescending`
          );
          totalRuns += (buildsData.value || []).length;
        } catch {
          // Skip projects with no pipelines
        }
      }

      return new Response(JSON.stringify({ total: totalRuns }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    if (action === 'run-pipeline') {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'POST required' }), {
          status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const body = await req.json();
      const { projectName, pipelineId, branch } = body;
      if (!projectName || !pipelineId || !branch) {
        return new Response(JSON.stringify({ error: 'Missing projectName, pipelineId or branch' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Ensure environments exist before running
      try {
        const envNames = ['dev', 'stg', 'rc', 'prd'];
        const existingEnvs = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines/environments?api-version=7.1`);
        const existingNames = (existingEnvs.value || []).map((e: any) => e.name.toLowerCase());
        for (const envName of envNames) {
          if (!existingNames.includes(envName)) {
            await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines/environments?api-version=7.1`, {
              method: 'POST',
              body: JSON.stringify({ name: envName, description: `Ambiente ${envName.toUpperCase()} - criado pelo IDP ArgoIT` }),
            });
            console.log(`Environment '${envName}' created before pipeline run`);
          }
        }
      } catch (envErr) {
        console.error('Environment pre-check warning:', envErr);
      }

      const data = await azureFetch(`${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines/${pipelineId}/runs?api-version=7.1`, {
        method: 'POST',
        body: JSON.stringify({
          resources: {
            repositories: {
              self: {
                refName: `refs/heads/${branch}`,
              },
            },
          },
        }),
      });
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List pending pipeline approvals across all projects
    if (action === 'pending-approvals') {
      const projectsData = await azureFetch(`${baseUrl}/_apis/projects?api-version=7.1&$top=100`);
      const projects = projectsData.value || [];
      const allApprovals: any[] = [];

      for (const project of projects) {
        try {
          const approvalsData = await azureFetch(
            `${baseUrl}/${encodeURIComponent(project.name)}/_apis/pipelines/approvals?api-version=7.1-preview`
          );
          const approvals = approvalsData.value || [];
          for (const a of approvals) {
            allApprovals.push({ ...a, projectName: project.name });
          }
        } catch {
          // Project may not have approvals configured
        }
      }

      return new Response(JSON.stringify({ value: allApprovals, count: allApprovals.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Approve or reject a pipeline approval
    if (action === 'update-approval') {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'POST required' }), {
          status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const body = await req.json();
      const { projectName, approvalId, status, comment } = body;
      if (!projectName || !approvalId || !status) {
        return new Response(JSON.stringify({ error: 'Missing projectName, approvalId or status' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await azureFetch(
        `${baseUrl}/${encodeURIComponent(projectName)}/_apis/pipelines/approvals/${approvalId}?api-version=7.1-preview`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: status, // 'approved' or 'rejected'
            comment: comment || '',
          }),
        }
      );

      return new Response(JSON.stringify(data), {
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
