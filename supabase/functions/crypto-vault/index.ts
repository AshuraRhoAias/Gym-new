import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Cifrado de campo a nivel de aplicación (AES-256-GCM).
//
// - La clave maestra nunca se configura a mano: se deriva vía HKDF-SHA256 del
//   SUPABASE_SERVICE_ROLE_KEY que Supabase inyecta automáticamente en cada
//   Edge Function y que nunca llega al cliente.
// - Cada operación de cifrado genera su propio salt (16 bytes) e IV (12
//   bytes) aleatorios; el salt deriva una subclave por-valor vía PBKDF2, así
//   que ningún valor cifrado comparte clave efectiva con otro.
// - Se exige explícitamente un usuario autenticado real (no solo un JWT
//   válido: la propia publishable key es un JWT válido y por sí sola NO basta
//   para autorizar, ya que va embebida en el frontend público). Se valida
//   llamando a auth.getUser() con el JWT recibido antes de cifrar/descifrar.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromB64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function masterKeyMaterial(): Promise<CryptoKey> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no disponible");
  return crypto.subtle.importKey("raw", encoder.encode(serviceRoleKey), "HKDF", false, ["deriveKey"]);
}

async function deriveFieldKey(salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await masterKeyMaterial();
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode("gymtech-field-encryption-v1") },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

interface CipherPayload {
  c: string; // ciphertext, base64
  iv: string; // 12 bytes, base64
  s: string; // salt, base64
}

async function encryptBytes(plainBytes: Uint8Array): Promise<CipherPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveFieldKey(salt);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);
  return { c: toB64(new Uint8Array(cipherBuf)), iv: toB64(iv), s: toB64(salt) };
}

async function decryptBytes(payload: CipherPayload): Promise<Uint8Array> {
  const key = await deriveFieldKey(fromB64(payload.s));
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(payload.iv) },
    key,
    fromB64(payload.c),
  );
  return new Uint8Array(plainBuf);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "encrypt") {
      const payload = await encryptBytes(encoder.encode(String(body.plaintext ?? "")));
      return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });
    }

    if (action === "decrypt") {
      const bytes = await decryptBytes(body.payload as CipherPayload);
      return new Response(
        JSON.stringify({ plaintext: decoder.decode(bytes) }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    if (action === "encrypt-bytes") {
      const payload = await encryptBytes(fromB64(String(body.data ?? "")));
      return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });
    }

    if (action === "decrypt-bytes") {
      const bytes = await decryptBytes(body.payload as CipherPayload);
      return new Response(
        JSON.stringify({ data: toB64(bytes) }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Acción desconocida" }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400 });
  }
});
