import bcrypt from "bcryptjs";
import type { Password, User } from "dbschema/edgeql-js";

import { client, e } from "~/db";

const userQueryOpts = {
  ...e.User["*"],
  memberships: () => ({
    ...e.Membership["*"],
    organization: {
      ...e.Organization["*"],
    },
  }),
};

export async function getUserById(id: User["id"]) {
  const query = e.select(e.User, (user) => ({
    ...userQueryOpts,
    filter: e.op(user.id, "=", e.uuid(id)),
  }));

  const user = await query.run(client);
  return user;
}

export async function getUserByEmail(email: User["email"]) {
  const query = e.select(e.User, (user) => ({
    ...userQueryOpts,
    filter: e.op(user.email, "=", email),
  }));

  return await query.run(client);
}

export async function createUser(email: User["email"], password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const userMutation = e.insert(e.User, {
    email,
  });

  const passwordMutation = e.insert(e.Password, {
    hash: hashedPassword,
    user: userMutation,
  });

  const createdUser = await e
    .select(passwordMutation, () => ({
      id: true,
      user: { ...e.User["*"] },
    }))
    .run(client);

  const organizationMutation = e.insert(e.Organization, {
    name: "Default Organization",
  });

  const membershipMutation = e.insert(e.Membership, {
    role: e.MembershipRole.ADMIN,
    organization: organizationMutation,
    user: e.select(e.User, (user) => ({
      filter: e.op(user.id, "=", e.uuid(createdUser.user.id)),
    })),
  });

  await membershipMutation.run(client);

  return createdUser.user;
}

export async function deleteUserByEmail(email: User["email"]) {
  const deleteMutation = e.delete(e.User, (user) => ({
    filter: e.op(user.email, "=", email),
  }));

  return await deleteMutation.run(client);
}

export async function getUserIp() {
  const geolocate = await fetch("http://ip-api.com/json").then((res) =>
    res.json()
  );
  const ip_address = geolocate.query;
  return ip_address;
}

export async function createLoginAttempt(
  login_successful: boolean,
  email: string
) {
  const ip_address = await getUserIp();

  const mutation = e.insert(e.LoginAttempt, {
    login_successful,
    ip_address,
    attempted_at: new Date(),
    user: e.select(e.User, (user) => ({
      filter: e.op(user.email, "=", email),
    })),
  });

  return mutation.run(client);
}

export async function verifyLogin(
  email: User["email"],
  password: Password["hash"]
) {
  const query = e.select(e.User, (user) => ({
    ...e.User["*"],
    password: {
      hash: true,
    },
    filter: e.op(user.email, "=", email),
  }));

  const userWithPassword = await query.run(client);

  if (!userWithPassword?.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    //failed login attempt
    await createLoginAttempt(false, email);
    return null;
  }

  await createLoginAttempt(true, email);
  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
