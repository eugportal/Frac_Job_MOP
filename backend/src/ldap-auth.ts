import { Client } from 'ldapts';
import { config } from './config.js';

export type LdapUser = { username: string; email: string };

const escapeFilterValue = (value: string) => value.replace(/[\\*()\0]/g, (character) => {
  const escapes: Record<string, string> = { '\\': '\\5c', '*': '\\2a', '(': '\\28', ')': '\\29', '\0': '\\00' };
  return escapes[character];
});

export async function authenticateWithLdap(username: string, password: string): Promise<LdapUser | null> {
  const { LDAP_URL, LDAP_BIND_DN, LDAP_BIND_PASSWORD, LDAP_BASE_DN } = config;
  if (!LDAP_URL || !LDAP_BIND_DN || !LDAP_BIND_PASSWORD || !LDAP_BASE_DN) {
    throw new Error('LDAP authentication is not configured.');
  }
  const serviceClient = new Client({ url: LDAP_URL });

  try {
    await serviceClient.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD);
    const filter = `(${config.LDAP_USERNAME_ATTRIBUTE}=${escapeFilterValue(username)})`;
    const { searchEntries } = await serviceClient.search(LDAP_BASE_DN, {
      scope: 'sub',
      filter,
      attributes: [config.LDAP_USERNAME_ATTRIBUTE, config.LDAP_EMAIL_ATTRIBUTE],
    });

    if (searchEntries.length !== 1) return null;

    const entry = searchEntries[0];
    const email = entry[config.LDAP_EMAIL_ATTRIBUTE];
    if (typeof email !== 'string' || !email) return null;

    const userClient = new Client({ url: LDAP_URL });
    try {
      await userClient.bind(entry.dn, password);
    } catch {
      return null;
    } finally {
      await userClient.unbind().catch(() => undefined);
    }

    return { username, email: email.toLowerCase() };
  } finally {
    await serviceClient.unbind().catch(() => undefined);
  }
}
