import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
} from "@chakra-ui/react";
import {
  Form,
  useActionData,
  useOutletContext,
  useTransition,
} from "@remix-run/react";
import type { ActionArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import React from "react";
import { logoutOtherSessions, verifyPassword } from "~/services/session.server";
import { inputFromForm } from "~/utils/input-resolvers";

export const action = async ({ request }: ActionArgs) => {
  const { password } = await inputFromForm(request);
  const passwordIsValid = await verifyPassword(request, password as string);
  if (passwordIsValid) {
    await logoutOtherSessions(request);
    return redirect("/sessions");
  }
  return json({ errors: { password: "Wrong password" } }, { status: 400 });
};

export default function LogoutAll() {
  const { onClose } = useOutletContext<{ onClose: () => void }>();
  const actionData = useActionData<typeof action>();
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const transition = useTransition();
  const isLoading = !!transition.submission;

  React.useEffect(() => {
    if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <Form method="post">
      <FormControl isInvalid={actionData?.errors?.password ? true : undefined}>
        <FormLabel>Verify password</FormLabel>
        <Input type="password" name="password" ref={passwordRef} />
        <FormErrorMessage>{actionData?.errors?.password}</FormErrorMessage>
      </FormControl>
      <Flex mt="4" gap="2">
        <Button
          colorScheme="red"
          type="submit"
          isLoading={isLoading}
          loadingText="wait..."
        >
          Logout
        </Button>
        <Button onClick={onClose} type="submit">
          Cancel
        </Button>
      </Flex>
    </Form>
  );
}
