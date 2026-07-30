import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Solo el superadministrador puede crear cuentas nuevas (admin, editor o
// viewer). El rol "superadmin" no se puede crear desde aquí a propósito.
const ALLOWED_ROLES = ["admin", "editor", "viewer"];
const EMAIL_DOMAIN = "gymtech.local";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
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
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single();

  if (callerProfile?.role !== "superadmin") {
    return new Response(JSON.stringify({ error: "Solo el superadministrador puede crear cuentas" }), {
      status: 403,
    });
  }

  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "");

    if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
      return new Response(JSON.stringify({ error: "Usuario inválido (3-32 caracteres, sin espacios)" }), {
        status: 400,
      });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres" }), {
        status: 400,
      });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "Rol inválido" }), { status: 400 });
    }

    const email = `${username}@${EMAIL_DOMAIN}`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "No se pudo crear el usuario" }), {
        status: 400,
      });
    }

    const { error: profileErr } = await admin.from("profiles").insert({
      id: created.user.id,
      username,
      role,
      created_by: callerData.user.id,
    });
    if (profileErr) {
      // Revertir la creación del usuario de auth si falla el perfil, para no
      // dejar cuentas huérfanas sin rol.
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: profileErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ id: created.user.id, username, role }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400 });
  }
});
