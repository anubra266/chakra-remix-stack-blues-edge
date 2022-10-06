import { createSessionStorage, redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import bcrypt from "bcryptjs";
import { Authenticator } from "remix-auth";
import assert from "assert";

import type { DBKey } from "~/db";
import { client, e } from "~/db";
import { getUserById } from "~/models/user.server";
import { getActiveMembershipId } from "~/models/membership.server";
import type { User } from "dbschema/edgeql-js";
import { formStrategy } from "~/services/auth/strategies/form.server";

invariant(process.env.SESSION_SECRET, "SESSION_SECRET must be set");

const deleteSession = e.params(
  {
    id: e.uuid,
  },
  (params) => {
    return e.delete(e.Session, (session) => ({
      filter: e.op(session.id, "=", params.id),
    }));
  }
);

export const sessionStorage = createDBSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

export type SessionData = {
  userId: User["id"];
  data: Record<string, any>;
};

export let authenticator = new Authenticator<SessionData>(sessionStorage, {
  throwOnError: true,
  sessionKey: "session",
});

authenticator.use(formStrategy, "form");

function createDBSessionStorage<T extends Record<string, any>>({
  cookie,
}: {
  cookie: T;
}) {
  return createSessionStorage({
    cookie,

    async createData(sessionData) {
      const { userId, data } = sessionData.session;
      const userQuery = e.select(e.User, (user) => ({
        filter: e.op(user.id, "=", e.uuid(userId)),
      }));

      const activeMembershipId = await getActiveMembershipId(userId);
      assert(activeMembershipId, "User has no organizations");

      const membershipQuery = e.select(e.Membership, (membership) => ({
        filter: e.op(membership.id, "=", e.uuid(activeMembershipId)),
      }));

      const sessionMutation = e.insert(e.Session, {
        data: e.json(data),
        user: userQuery,
        membership: membershipQuery,
      });

      const session = await sessionMutation.run(client);
      return session.id;
    },

    async readData(id) {
      const sessionQuery = e
        .select(e.Session, (session) => ({
          ...e.Session["*"],
          membership: {
            ...e.Membership["*"],
          },
          filter: e.op(session.id, "=", e.uuid(id)),
        }))
        .assert_single();
      const session = await sessionQuery.run(client);
      return { ...session, session: session?.id };
    },

    async updateData(id, payload) {
      const { membershipId, membership: prevMembership } = payload;

      const membershipQuery = e.select(e.Membership, (membership) => ({
        filter: e.op(
          membership.id,
          "=",
          e.uuid(membershipId || prevMembership.id)
        ),
      }));
      const sessionMutation = e.update(e.Session, (session) => ({
        filter: e.op(session.id, "=", e.uuid(id)),
        set: {
          membership: membershipQuery,
          last_active: payload.last_active,
        },
      }));
      await sessionMutation.run(client);
    },
    async deleteData(id) {
      await deleteSession.run(client, { id });
    },
  });
}

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  const activeSession = await sessionStorage.getSession(cookie);
  const sessionId = activeSession.get("id");
  if (sessionId) {
    activeSession.set("last_active", new Date());
    await sessionStorage.commitSession(activeSession);
  }

  return activeSession;
}

export async function setSession(request: Request, key: string, value: any) {
  const session = await getSession(request);
  session.set(key, value);
  await sessionStorage.commitSession(session);
}

export async function getUserSessions({
  userId,
  request,
}: {
  userId: DBKey<typeof e.User.id>;
  request: Request;
}) {
  const activeSession = await getSession(request);

  const sessionsQuery = e.select(e.User, (user) => ({
    sessions: (session) => ({
      ...e.Session["*"],
      order_by: {
        expression: session.last_active,
        direction: e.DESC,
      },
    }),
    filter: e.op(user.id, "=", e.uuid(userId)),
  }));
  const sessions = await sessionsQuery.run(client);
  return sessions?.sessions.map((session) => ({
    ...session,
    is_current_device: session.id === activeSession.id,
  }));
}

export async function getLastActiveSession({
  userId,
}: {
  userId: DBKey<typeof e.User.id>;
}) {
  const sessionsQuery = e.select(e.User, (user) => ({
    sessions: (session) => ({
      ...e.Session["*"],
      membership: {
        id: true,
      },
      order_by: {
        expression: session.last_active,
        direction: e.DESC,
      },
      limit: 1,
    }),
    filter: e.op(user.id, "=", e.uuid(userId)),
  }));
  const userWithSessions = await sessionsQuery.run(client);
  return userWithSessions?.sessions[0];
}

export async function getUserId(request: Request): Promise<string | undefined> {
  const sessionCookie = await getSession(request);

  if (!sessionCookie.id) return;

  const sessionQuery = e.select(e.Session, (ses) => ({
    ...e.Session["*"],
    user: {
      ...e.User["*"],
    },
    filter: e.op(ses.id, "=", e.uuid(sessionCookie.id)),
  }));
  const session = await sessionQuery.run(client);
  if (!session) {
    throw await logout(request);
  }
  return session?.user.id;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (userId === undefined) return null;

  const user = await getUserById(userId);
  if (user) return user;

  throw await logout(request);
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request) {
  const userId = await requireUserId(request);

  const user = await getUserById(userId);
  if (user) return user;

  throw await logout(request);
}

export async function logout(request: Request) {
  await authenticator.logout(request, { redirectTo: "/" });
}

export async function logoutSession(id: string) {
  return await deleteSession.run(client, { id });
}

export async function logoutOtherSessions(request: Request) {
  const activeSession = await getSession(request);
  const sessionQuery = e.delete(e.Session, (session) => ({
    filter: e.op(session.id, "!=", e.uuid(activeSession.id)),
  }));
  return await sessionQuery.run(client);
}

export async function verifyPassword(
  request: Request,
  password: DBKey<typeof e.Password.hash>
) {
  const userId = await requireUserId(request);
  const query = e.select(e.User, (user) => ({
    password: {
      hash: true,
    },
    filter: e.op(user.id, "=", e.uuid(userId)),
  }));
  const user = await query.run(client);
  if (!user?.password) {
    return null;
  }
  const isValid = await bcrypt.compare(password, user.password.hash);

  return isValid;
}
