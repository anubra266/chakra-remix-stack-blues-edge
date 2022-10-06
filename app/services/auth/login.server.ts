import { json, redirect } from "@remix-run/server-runtime";
import { AuthorizationError } from "remix-auth";
import {
  authenticator,
  getSession,
  sessionStorage,
} from "~/services/session.server";
import { validateEmail } from "~/utils/data";
import { inputFromForm } from "~/utils/input-resolvers";

export async function login(request: Request) {
  const { email, password, redirectTo, remember } = await inputFromForm(
    request
  );

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

  try {
    const sess = await authenticator.authenticate("form", request, {});
    // manually get the session
    let session = await getSession(request);
    // and store the user data
    session.set(authenticator.sessionKey, sess);
    // commit the session
    let headers = new Headers({
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 7 // 7 days
          : undefined,
      }),
    });

    const redirectUri =
      typeof redirectTo === "string" && redirectTo.length > 0
        ? redirectTo
        : "/";
    return redirect(redirectUri, {
      headers,
    });
  } catch (error) {
    console.log("errorin", error);
    // if (error instanceof Response) return error;
    if (error instanceof AuthorizationError) {
      return json(
        { errors: { email: "Invalid email or password", password: null } },
        { status: 400 }
      );
    }
  }
}
