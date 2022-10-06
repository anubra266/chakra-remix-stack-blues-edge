import { FormStrategy } from "remix-auth-form";
import invariant from "tiny-invariant";
import { createUser, getUserIp, verifyLogin } from "~/models/user.server";
import { AuthAction } from "~/utils/constant";

export const formStrategy = new FormStrategy(async ({ form }) => {
  let _action = form.get("_action");

  let email = form.get("email") as string;
  let password = form.get("password") as string;
  let userAgent = form.get("userAgent") as any;
  let ip_address = await getUserIp();

  const data = { ip_address, ...JSON.parse(userAgent) };
  let user;

  if (_action === AuthAction.LOGIN) {
    user = await verifyLogin(email, password);
    invariant(!!user, "User not found");
  } else if (_action === AuthAction.JOIN) {
    user = await createUser(email, password);
  }

  return {
    userId: user?.id!,
    data,
  };
});
