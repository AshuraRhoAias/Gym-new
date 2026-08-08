import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Solo el superadministrador puede editar cuentas existentes (admin, editor
// o viewer). No se puede editar una cuenta de superadministrador desde aquí,
// para evitar que se cambie/pierda el único rol con acceso total por error.
const ALLOWED_ROLES = ["admin", "editor", "viewer"];
const EMAIL_DOMAIN = "gymtech.local";

// Ver crypto-vault/index.ts: CORS abierto porque se llama desde distintos
// orígenes (web, previews, Tauri); la autorización real la hace el chequeo
// de rol superadmin de abajo, no el navegador.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData?.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single();

  if (callerProfile?.role !== "superadmin") {
    return new Response(JSON.stringify({ error: "Solo el superadministrador puede editar cuentas" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    const usernameRaw = body.username === undefined ? undefined : String(body.username ?? "").trim().toLowerCase();
    const password = body.password === undefined || body.password === "" ? undefined : String(body.password);
    const role = body.role === undefined ? undefined : String(body.role);

    if (!id) {
      return new Response(JSON.stringify({ error: "Falta el id de la cuenta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (usernameRaw !== undefined && !/^[a-z0-9._-]{3,32}$/.test(usernameRaw)) {
      return new Response(JSON.stringify({ error: "Usuario inválido (3-32 caracteres, sin espacios)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password !== undefined && password.length < 8) {
      return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "Rol inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile, error: targetErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    if (targetErr || !targetProfile) {
      return new Response(JSON.stringify({ error: "La cuenta no existe" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (targetProfile.role === "superadmin") {
      return new Response(JSON.stringify({ error: "No se puede editar la cuenta de superadministrador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUpdate: { email?: string; password?: string } = {};
    if (usernameRaw !== undefined) authUpdate.email = `${usernameRaw}@${EMAIL_DOMAIN}`;
    if (password !== undefined) authUpdate.password = password;

    if (Object.keys(authUpdate).length > 0) {
      const { error: authErr } = await admin.auth.admin.updateUserById(id, authUpdate);
      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const profileUpdate: { username?: string; role?: string } = {};
    if (usernameRaw !== undefined) profileUpdate.username = usernameRaw;
    if (role !== undefined) profileUpdate.role = role;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileErr } = await admin.from("profiles").update(profileUpdate).eq("id", id);
      if (profileErr) {
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ id, username: usernameRaw, role }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
