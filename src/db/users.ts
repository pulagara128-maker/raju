import { asc, count, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

function parseEmailEnv(varName: string): string[] {
  const raw = process.env[varName] || '';
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isConfiguredAdminEmail(email: string): boolean {
  return parseEmailEnv('ADMIN_EMAILS').includes(email.trim().toLowerCase());
}

function isConfiguredStaffEmail(email: string): boolean {
  return parseEmailEnv('STAFF_EMAILS').includes(email.trim().toLowerCase());
}

export async function getOrCreateUser(uid: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const existingByUid = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existingByUid.length > 0) {
      const user = existingByUid[0];
      if (isConfiguredAdminEmail(normalizedEmail) && user.role !== 'admin') {
        const [updated] = await db
          .update(users)
          .set({ email: normalizedEmail, role: 'admin' })
          .where(eq(users.uid, uid))
          .returning();
        return updated;
      }
      if (
        isConfiguredStaffEmail(normalizedEmail) &&
        user.role !== 'admin' &&
        user.role !== 'staff'
      ) {
        const [updated] = await db
          .update(users)
          .set({ email: normalizedEmail, role: 'staff' })
          .where(eq(users.uid, uid))
          .returning();
        return updated;
      }
      if (user.email.toLowerCase() !== normalizedEmail) {
        const [updated] = await db
          .update(users)
          .set({ email: normalizedEmail })
          .where(eq(users.uid, uid))
          .returning();
        return updated;
      }
      return user;
    }

    // Check if an admin pre-invited this email (placeholder uid starting with "invite:")
    const existingByEmail = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (existingByEmail.length > 0) {
      const invited = existingByEmail[0];
      const nextRole = isConfiguredAdminEmail(normalizedEmail)
        ? 'admin'
        : isConfiguredStaffEmail(normalizedEmail) && invited.role === 'pending'
        ? 'staff'
        : invited.role;

      const [bound] = await db
        .update(users)
        .set({ uid, email: normalizedEmail, role: nextRole })
        .where(eq(users.id, invited.id))
        .returning();
      return bound;
    }

    // Bootstrap first admin if no admin exists yet
    const adminCheck = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    const hasAdmin = Number(adminCheck[0]?.value ?? 0) > 0;

    let role: string = 'pending';
    if (!hasAdmin || isConfiguredAdminEmail(normalizedEmail)) {
      role = 'admin';
    } else if (isConfiguredStaffEmail(normalizedEmail)) {
      role = 'staff';
    }

    const [created] = await db
      .insert(users)
      .values({ uid, email: normalizedEmail, role })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: normalizedEmail },
      })
      .returning();

    return created;
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function listTeamUsers() {
  return await db.select().from(users).orderBy(asc(users.id));
}
