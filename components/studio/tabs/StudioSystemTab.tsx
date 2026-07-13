import React from 'react';
import { CheckCircle2, XCircle, Terminal } from 'lucide-react';
import { hasDeepSeekApiKey } from '../../../services/deepseekClient';
import { getSuperAdminEmails } from '../../../utils/superAdmin';

const StudioSystemTab: React.FC = () => {
  const checks = [
    {
      label: 'Supabase URL',
      ok: Boolean(import.meta.env.VITE_SUPABASE_URL),
      detail: import.meta.env.VITE_SUPABASE_URL ? 'Configuré' : 'VITE_SUPABASE_URL manquant',
    },
    {
      label: 'DeepSeek (enrichissement)',
      ok: hasDeepSeekApiKey(),
      detail: hasDeepSeekApiKey() ? 'VITE_DEEPSEEK_API_KEY OK' : 'Clé absente dans .env',
    },
    {
      label: 'Super admin emails',
      ok: getSuperAdminEmails().length > 0,
      detail:
        getSuperAdminEmails().length > 0
          ? `${getSuperAdminEmails().length} email(s) dans VITE_SUPER_ADMIN_EMAILS`
          : 'Ajoute ton email dans .env',
    },
    {
      label: 'Troc IA',
      ok: Boolean(import.meta.env.VITE_ENABLE_TROC_AI),
      detail: import.meta.env.VITE_ENABLE_TROC_AI ? 'Activé' : 'Désactivé',
    },
  ];

  const cliCommands = [
    'npm run ingest:products',
    'node scripts/batch-enrich-product-specs.mjs --descriptions-only --apply',
    'node scripts/product-ingestion-funnel.mjs --file=data/mfoundi-mall-catalog.json',
    'node scripts/audit-product-specs.mjs',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-tech uppercase text-white flex items-center gap-2">
          <Terminal className="w-6 h-6 text-violet-400" />
          Système
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          État des services et commandes CLI (terminal local).
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 divide-y divide-white/5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-bold text-white">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.detail}</p>
            </div>
            {c.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
        <h3 className="text-xs font-tech uppercase tracking-widest text-violet-300 mb-3">
          Scripts utiles (xeption237/)
        </h3>
        <ul className="space-y-2 font-mono text-xs text-gray-300">
          {cliCommands.map((cmd) => (
            <li key={cmd} className="bg-black/50 border border-white/10 rounded px-3 py-2">
              {cmd}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-gray-500 mt-3">
          Logs : <code className="text-gray-400">data/product-ingestion-log.json</code>,
          <code className="text-gray-400"> data/batch-enrich-specs-log.json</code>
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-gray-400">
        <p className="font-bold text-white mb-2">Accès Studio</p>
        <p>
          URL : <code className="text-violet-300">/studio</code> — réservée aux emails listés dans{' '}
          <code className="text-gray-300">VITE_SUPER_ADMIN_EMAILS</code> ou au rôle staff{' '}
          <code className="text-gray-300">Super admin (Studio)</code>.
        </p>
        <p className="mt-2">
          L’ERP (<code className="text-gray-300">/admin</code>) reste pour le boss et l’équipe :
          caisse, commandes, SAV, clients.
        </p>
      </div>
    </div>
  );
};

export default StudioSystemTab;
