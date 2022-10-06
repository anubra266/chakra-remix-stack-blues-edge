import { json } from "@remix-run/server-runtime";
import { AuthorizationError } from "remix-auth";
import { getUserByEmail } from "~/models/user.server";
import { authenticator } from "~/services/session.server";
import { validateEmail } from "~/utils/data";
import { inputFromForm } from "~/utils/input-resolvers";

export async function join(request: Request) {
  const { email, password, redirectTo } = await inputFromForm(request);

  if (!validateEmail(email)) {
    return json(
      { errors: { email: "Email is invalid", password: null } },
      { status: 400 }
    );
  }

  if (typeof password !== "string") {
    return json(
      { errors: { email: null, password: "Password is required" } },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return json(
      { errors: { email: null, password: "Password is too short" } },
      { status: 400 }
    );
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return json(
      {
        errors: {
          email: "A user already exists with this email",
          password: null,
        },
      },
      { status: 400 }
    );
  }

  try {
    const redirectUri =
      typeof redirectTo === "string" && redirectTo.length > 0
        ? redirectTo
        : "/";
    return await authenticator.authenticate("form", request, {
      successRedirect: redirectUri,
    });
  } catch (error) {
    console.log("errorup", error);
    // if (error instanceof Response) return error;
    if (error instanceof AuthorizationError) {
      return json(
        { errors: { email: "An error occured", password: null } },
        { status: 400 }
      );
    }
    return null;
  }
}
