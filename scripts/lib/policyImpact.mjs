/**
 * Classification « impact réel » des policies RLS live.
 * @see docs/engineering/REGISTRE_POLICIES_RLS.md
 */

/** Tables dont le seul accès code est via Edge Functions (service_role → bypass RLS). */
const EDGE_ONLY_TABLES = new Set([
  'market_price_cache',
  'market_price_snapshots',
  'market_trend_cache',
  'market_demand_signals',
  'tac_cache',
  'imei_certif_records',
  'imei_premium_calls',
  'troc_certificates',
]);

/** RPC SECURITY DEFINER qui contournent la RLS pour certaines commandes. */
const RPC_BYPASS = {
  orders: {
    INSERT: ['create_order_atomic'],
    UPDATE: ['complete_pos_sale_atomic'],
  },
  products: {
    INSERT: ['complete_pos_sale_atomic', 'complete_troc_with_sale_atomic'],
    UPDATE: ['complete_pos_sale_atomic', 'complete_troc_with_sale_atomic'],
  },
};

const IMPACT_LABELS = {
  active: 'Active — contrôle un flux client réel',
  inactive_rls_off: 'Inactive — RLS désactivée sur la table',
  bypass_service_role: 'Contournée — accès edge en service_role (RLS bypass)',
  redundant_duplicate: 'Redondante — doublon strict (même table/cmd/rôles/qual)',
  redundant_shadowed: 'Redondante — couverte par une policy `{public}` équivalente',
  legacy_no_caller: 'Orpheline — aucun appelant dans le code',
  bypass_rpc: 'Contournée — flux principal via RPC SECURITY DEFINER',
  active_rare: 'Active rare — insert/update direct legacy (hors RPC principal)',
};

/**
 * Contrôle d'écriture EFFECTIF de la policy.
 *
 * Postgres : quand `WITH CHECK` est omis sur une policy qui possède un `USING`,
 * c'est l'expression `USING` qui sert aussi de contrôle à l'écriture. Donc
 * `with_check = null` + `USING (true)` équivaut EXACTEMENT à `WITH CHECK (true)`.
 *
 * Sans cette normalisation, deux policies strictement identiques pour le moteur
 * (ex. « Staff Full Access Orders » et « Staff full access orders ») étaient vues
 * comme distinctes et échappaient à la détection de doublon.
 *
 * Sans effet de bord : pour SELECT et DELETE, `with_check` est toujours null et
 * ignoré par le moteur — les deux policies comparées retombent alors sur `qual`.
 * Pour INSERT, il n'y a pas de `USING` et `with_check` est déjà renseigné.
 */
function effectiveCheck(row) {
  return row.with_check ?? row.qual ?? '';
}

function policySignature(row) {
  return `${row.table}|${row.cmd}|${row.roles}|${row.qual ?? ''}|${effectiveCheck(row)}`;
}

function parseRoles(rolesText) {
  return rolesText.replace(/[{}]/g, '').split(',').filter(Boolean);
}

function isPublicRole(rolesText) {
  return parseRoles(rolesText).includes('public');
}

function isAnonAuthOnly(rolesText) {
  const roles = parseRoles(rolesText);
  return roles.length > 0 && roles.every((r) => r === 'anon' || r === 'authenticated');
}

function isEdgeOnlyCallers(callers) {
  if (!callers?.length) return true;
  return callers.every(
    (c) => c.includes('supabase/functions') || c.includes('supabase\\functions'),
  );
}

function pickCanonicalDuplicate(names) {
  const preferred = names.find((n) => /^[a-z][a-z0-9_]*$/.test(n.replace(/ /g, '_')));
  if (preferred) return preferred;
  const snake = names.find((n) => n.includes('_') && n === n.toLowerCase());
  if (snake) return snake;
  return [...names].sort((a, b) => a.localeCompare(b))[0];
}

/**
 * @param {Array<object>} policies
 * @param {string[]} tablesWithoutRls
 * @param {Record<string, string[]>} tableRefs
 */
export function classifyPolicies(policies, tablesWithoutRls, tableRefs) {
  const noRlsSet = new Set(tablesWithoutRls);

  const duplicateGroups = Object.entries(
    policies.reduce((acc, row) => {
      const key = policySignature(row);
      acc[key] = acc[key] || [];
      acc[key].push(row.policy);
      return acc;
    }, {}),
  ).filter(([, names]) => names.length > 1);

  const duplicateCanonical = new Map();
  const duplicateMembers = new Set();
  for (const [, names] of duplicateGroups) {
    const keeper = pickCanonicalDuplicate(names);
    for (const n of names) {
      duplicateCanonical.set(n, keeper);
      if (n !== keeper) duplicateMembers.add(n);
    }
  }

  const byTableCmd = policies.reduce((acc, row) => {
    const k = `${row.table}|${row.cmd}`;
    acc[k] = acc[k] || [];
    acc[k].push(row);
    return acc;
  }, {});

  function findPublicShadow(row) {
    const peers = byTableCmd[`${row.table}|${row.cmd}`] ?? [];
    return peers.find(
      (p) =>
        p.policy !== row.policy &&
        isPublicRole(p.roles) &&
        (p.qual ?? '') === (row.qual ?? '') &&
        effectiveCheck(p) === effectiveCheck(row),
    );
  }

  const classified = policies.map((row) => {
    const callers = tableRefs[row.table] ?? [];
    let impact = 'active';
    let impact_note = IMPACT_LABELS.active;

    if (noRlsSet.has(row.table)) {
      impact = 'inactive_rls_off';
      impact_note = 'RLS désactivée : policy ignorée par Postgres.';
    } else if (!callers.length && row.table === 'argus') {
      impact = 'legacy_no_caller';
      impact_note = 'Table `argus` sans référence code — policy probablement morte.';
    } else if (EDGE_ONLY_TABLES.has(row.table) && isEdgeOnlyCallers(callers)) {
      impact = 'bypass_service_role';
      impact_note =
        'Seules les Edge Functions touchent cette table, en service_role (bypass RLS).';
    } else if (duplicateMembers.has(row.policy)) {
      impact = 'redundant_duplicate';
      impact_note = `Doublon strict — garder \`${duplicateCanonical.get(row.policy)}\`.`;
    } else if (isAnonAuthOnly(row.roles) && findPublicShadow(row)) {
      impact = 'redundant_shadowed';
      impact_note = `Couvert par \`${findPublicShadow(row).policy}\` ({public} inclut anon + authenticated).`;
    } else if (RPC_BYPASS[row.table]?.[row.cmd]) {
      const rpcs = RPC_BYPASS[row.table][row.cmd].join(', ');
      const legacyDirect =
        row.table === 'orders' &&
        row.cmd === 'INSERT' &&
        callers.some((c) => c.includes('AdminPanel.tsx'));
      if (legacyDirect) {
        impact = 'active_rare';
        impact_note = `Checkout via RPC (${rpcs}) ; insert direct encore dans legacy AdminPanel.`;
      } else if (row.cmd === 'INSERT') {
        impact = 'bypass_rpc';
        impact_note = `Flux principal via RPC SECURITY DEFINER (${rpcs}).`;
      }
    }

    // Information SECONDAIRE, indépendante de `impact`.
    //
    // Une classification prioritaire (`inactive_rls_off` sur products, par exemple)
    // écrasait le fait qu'une policy soit aussi un doublon strict — précisément sur
    // la table où l'on prévoit d'activer la RLS.
    //
    // ⚠️ Ce n'est PAS une invitation à supprimer : des policies permissives identiques
    // sont OR-ées par Postgres, donc sans effet fonctionnel ni risque. L'enjeu est
    // ailleurs : le jour où l'on RESTREINT une policy, son doublon resté permissif
    // annule la restriction en silence. Il faut alors les traiter ensemble.
    const isDuplicate = duplicateMembers.has(row.policy) || duplicateCanonical.has(row.policy);

    return {
      ...row,
      impact,
      impact_label: IMPACT_LABELS[impact] ?? impact,
      impact_note,
      also_duplicate: isDuplicate,
      duplicate_canonical: isDuplicate ? duplicateCanonical.get(row.policy) ?? null : null,
    };
  });

  const impact_summary = classified.reduce((acc, row) => {
    acc[row.impact] = (acc[row.impact] || 0) + 1;
    return acc;
  }, {});

  return {
    policies: classified,
    duplicate_groups: duplicateGroups.map(([signature, names]) => ({
      signature,
      policies: names,
      canonical: pickCanonicalDuplicate(names),
    })),
    impact_summary,
    impact_labels: IMPACT_LABELS,
  };
}

export { IMPACT_LABELS, RPC_BYPASS, EDGE_ONLY_TABLES };
