import type { Note, User } from "dbschema/edgeql-js";
import { client, e } from "~/db";

export function getNote({
  id,
  userId,
}: {
  id: Note["id"];
  userId: User["id"];
}) {
  return e
    .select(e.Note, (note) => ({
      ...e.Note["*"],
      filter: e.op(
        e.op(note.user.id, "=", e.uuid(userId)),
        "and",
        e.op(note.id, "=", e.uuid(id))
      ),
    }))
    .assert_single()
    .run(client);
}

export function getNoteListItems({ userId }: { userId: User["id"] }) {
  return e
    .select(e.Note, (note) => ({
      id: true,
      title: true,
      filter: e.op(note.user.id, "=", e.uuid(userId)),
      order_by: note.updated_at,
    }))
    .run(client);
}

export function createNote({
  body,
  title,
  userId,
}: {
  body: Note["body"];
  title: Note["title"];
  userId: User["id"];
}) {
  return e
    .insert(e.Note, {
      title,
      body,
      user: e.select(e.User, (user) => ({
        filter: e.op(user.id, "=", e.uuid(userId)),
      })),
    })
    .run(client);
}

export function deleteNote({
  id,
  userId,
}: {
  id: Note["id"];
  userId: User["id"];
}) {
  return e
    .delete(e.Note, (note) => ({
      filter: e.op(
        e.op(note.user.id, "=", e.uuid(userId)),
        "and",
        e.op(note.id, "=", e.uuid(id))
      ),
    }))
    .run(client);
}
