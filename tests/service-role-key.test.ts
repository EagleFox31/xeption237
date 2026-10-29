import { describe, expect, it, vi } from "vitest";
// @ts-expect-error module JS des scripts Node
import { pickServiceKey, projectRefFromUrl, resolveServiceRoleKey } from "../scripts/lib/serviceRoleKey.mjs";

const REF = "abcdefghijklmnopqrst";
const URL = `https://${REF}.supabase.co`;

describe("serviceRoleKey", () => {
  it("priorité à la variable d'environnement, sans appeler la CLI", () => {
    const run = vi.fn();
    expect(resolveServiceRoleKey({ env: { SUPABASE_SERVICE_ROLE_KEY: " env-key " }, run })).toBe("env-key");
    expect(run).not.toHaveBeenCalled();
  });

  it("sinon interroge la CLI avec le project ref tiré de VITE_SUPABASE_URL", () => {
    const run = vi.fn(() => JSON.stringify([{ name: "anon", api_key: "a" }, { name: "service_role", api_key: "svc" }]));
    expect(resolveServiceRoleKey({ env: { VITE_SUPABASE_URL: URL }, run })).toBe("svc");
    expect(run).toHaveBeenCalledWith(REF);
  });

  it("se rabat sur une clé de type secret sans legacy service_role", () => {
    expect(pickServiceKey(JSON.stringify([{ name: "default", type: "secret", api_key: "sb_secret_x" }]))).toBe("sb_secret_x");
  });

  it("refuse un project ref invalide (pas d'injection dans la commande)", () => {
    const run = vi.fn();
    expect(() => resolveServiceRoleKey({ env: { VITE_SUPABASE_URL: "https://a;rm.supabase.co" }, run })).toThrow(/project ref/);
    expect(run).not.toHaveBeenCalled();
  });

  it("une erreur de la CLI ne recopie jamais sa sortie standard", () => {
    const run = () => { throw Object.assign(new Error("boom"), { stdout: "service_role eyJSECRET", stderr: "not logged in" }); };
    expect(() => resolveServiceRoleKey({ env: { VITE_SUPABASE_URL: URL }, run })).toThrow(/not logged in/);
    try { resolveServiceRoleKey({ env: { VITE_SUPABASE_URL: URL }, run }); } catch (e) {
      expect(String((e as Error).message)).not.toContain("eyJSECRET");
    }
  });

  it("erreurs explicites : JSON illisible, aucune clé", () => {
    expect(() => pickServiceKey("pas du json")).toThrow(/illisible/);
    expect(() => pickServiceKey("[]")).toThrow(/Aucune clé/);
    expect(projectRefFromUrl(undefined)).toBeNull();
  });
});
