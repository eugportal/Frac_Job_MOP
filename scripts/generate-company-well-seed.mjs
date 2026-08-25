/* Converts the curated company/well dataset into idempotent PostgreSQL seed SQL. */
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../frontend/src/data/authCompanies.ts', import.meta.url), 'utf8');
const companyBlock = /  '((?:[^'\\]|\\.)+)': \[([\s\S]*?)\n  \],/g;
const sql = [
  '-- Generated from frontend/src/data/authCompanies.ts. Do not hand-edit.',
  'begin;',
];

for (const match of source.matchAll(companyBlock)) {
  const company = match[1].replaceAll("'", "''");
  sql.push(`insert into public.companies (name) values ('${company}') on conflict (name) do nothing;`);
  for (const wellMatch of match[2].matchAll(/    '((?:[^'\\]|\\.)+)',/g)) {
    const well = wellMatch[1].replaceAll("'", "''");
    sql.push(`insert into public.wells (company_id, name) select id, '${well}' from public.companies where name = '${company}' on conflict (company_id, name) do nothing;`);
  }
}

sql.push('commit;');
process.stdout.write(`${sql.join('\n')}\n`);
