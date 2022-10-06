import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Textarea,
} from "@chakra-ui/react";
import type { ActionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import * as React from "react";

import { createNote } from "~/models/note.server";
import { requireUserId } from "~/services/session.server";
import { inputFromForm } from "~/utils/input-resolvers";

export const action = async ({ request }: ActionArgs) => {
  const userId = await requireUserId(request);

  const { title, body } = await inputFromForm(request);

  if (typeof title !== "string" || title.length === 0) {
    return json(
      { errors: { title: "Title is required", body: null } },
      { status: 400 }
    );
  }

  if (typeof body !== "string" || body.length === 0) {
    return json(
      { errors: { title: null, body: "Body is required" } },
      { status: 400 }
    );
  }

  const note = await createNote({ title, body, userId });

  return redirect(`/notes/${note.id}`);
};

export default function NewNotePage() {
  const actionData = useActionData<typeof action>();
  const titleRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const transition = useTransition();
  const isSubmitting = !!transition.submission;

  React.useEffect(() => {
    if (actionData?.errors?.title) {
      titleRef.current?.focus();
    } else if (actionData?.errors?.body) {
      bodyRef.current?.focus();
    }
  }, [actionData]);

  return (
    <Form
      method="post"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      <FormControl isInvalid={actionData?.errors?.title ? true : undefined}>
        <FormLabel>
          <span>Title: </span>
        </FormLabel>
        <Input ref={titleRef} name="title" />
        <FormErrorMessage>{actionData?.errors?.title}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={actionData?.errors?.body ? true : undefined}>
        <FormLabel>Body</FormLabel>
        <Textarea ref={bodyRef} name="body" rows={8} />
        <FormErrorMessage>{actionData?.errors?.body}</FormErrorMessage>
      </FormControl>

      <Button
        ml="auto"
        colorScheme="blue"
        type="submit"
        isLoading={isSubmitting}
      >
        Save
      </Button>
    </Form>
  );
}
