/* Converts the curated company/well dataset into idempotent SQL Server seed SQL. */
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../frontend/src/data/authCompanies.ts', import.meta.url), 'utf8');
const companyBlock = /  '((?:[^'\\]|\\.)+)': \[([\s\S]*?)\n  \],/g;
const sql = [
  '-- Generated from frontend/src/data/authCompanies.ts. Do not hand-edit.',
  'SET XACT_ABORT ON;',
  'BEGIN TRANSACTION;',
];

for (const match of source.matchAll(companyBlock)) {
  const company = match[1].replaceAll("'", "''");
  sql.push(`IF NOT EXISTS (SELECT 1 FROM dbo.companies WHERE name = N'${company}') INSERT INTO dbo.companies (name) VALUES (N'${company}');`);
  for (const wellMatch of match[2].matchAll(/    '((?:[^'\\]|\\.)+)',/g)) {
    const well = wellMatch[1].replaceAll("'", "''");
    sql.push(`INSERT INTO dbo.wells (company_id, name) SELECT c.id, N'${well}' FROM dbo.companies c WHERE c.name = N'${company}' AND NOT EXISTS (SELECT 1 FROM dbo.wells w WHERE w.company_id = c.id AND w.name = N'${well}');`);
  }
}

sql.push('COMMIT TRANSACTION;');
process.stdout.write(`${sql.join('\n')}\n`);
