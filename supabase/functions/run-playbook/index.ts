import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is devops
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasRole } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "devops",
    });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { playbook_name, target_hosts } = await req.json();

    // Create the run record
    const { data: run, error: insertErr } = await supabase
      .from("playbook_runs")
      .insert({
        playbook_name,
        target_hosts,
        started_by: user.id,
        status: "running",
        logs: `[${new Date().toISOString()}] 🚀 Iniciando playbook "${playbook_name}"...\n`,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Simulate async playbook execution
    (async () => {
      let logs = run.logs;
      for (const host of target_hosts) {
        await new Promise((r) => setTimeout(r, 1500));
        logs += `[${new Date().toISOString()}] 📡 Conectando a ${host}...\n`;
        await supabase.from("playbook_runs").update({ logs }).eq("id", run.id);

        await new Promise((r) => setTimeout(r, 1000));
        logs += `[${new Date().toISOString()}] ✅ TASK [Hello World] => ${host}\n`;
        logs += `  msg: "Hello World from S.H.I.E.L.D Platform!"\n`;
        await supabase.from("playbook_runs").update({ logs }).eq("id", run.id);

        await new Promise((r) => setTimeout(r, 800));
        logs += `[${new Date().toISOString()}] ✅ TASK [Obter IP] => ${host}\n`;
        logs += `  ansible_default_ipv4.address: "${host}"\n\n`;
        await supabase.from("playbook_runs").update({ logs }).eq("id", run.id);
      }

      logs += `[${new Date().toISOString()}] 🎯 Playbook finalizado com sucesso!\n`;
      logs += `\nPLAY RECAP ****\n`;
      for (const host of target_hosts) {
        logs += `${host.padEnd(20)} : ok=2    changed=0    unreachable=0    failed=0\n`;
      }

      await supabase
        .from("playbook_runs")
        .update({ logs, status: "completed", finished_at: new Date().toISOString() })
        .eq("id", run.id);
    })();

    return new Response(JSON.stringify({ id: run.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
