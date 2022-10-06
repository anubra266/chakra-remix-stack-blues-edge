import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useTransition,
} from "@remix-run/react";

import {
  Button,
  Divider,
  Flex,
  Heading,
  List,
  ListItem,
  Stack,
  chakra,
} from "@chakra-ui/react";
import { requireUserId } from "~/services/session.server";
import { useActiveMembership, useUser } from "~/utils/data";
import { getNoteListItems } from "~/models/note.server";
import { ChakraRemixLink } from "~/components/factory";
import { inputFromForm } from "~/utils/input-resolvers";
import { switchMembership } from "~/models/membership.server";

export const action = async ({ request }: ActionArgs) => {
  const { membershipId } = await inputFromForm(request);

  //* When you have a list of organizations, use this to switch organization in session
  return await switchMembership(request, membershipId as string | undefined);
};

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await requireUserId(request);
  const noteListItems = await getNoteListItems({ userId });
  return json({ noteListItems });
};

export default function NotesPage() {
  const data = useLoaderData<typeof loader>();
  const user = useUser();
  const activeMembership = useActiveMembership();
  const transition = useTransition();
  const loggingOut =
    transition.submission &&
    transition.submission.formData.get("_action") === "logout";

  return (
    <Flex h="full" minH="screenY" direction="column">
      <Flex
        as="header"
        align="center"
        justify="space-between"
        bg="slategrey"
        color="white"
        p="2"
      >
        <Heading fontSize="3xl">
          <Link to=".">Notes</Link>
        </Heading>
        <p>{user.email}</p>
        <Flex gap="2" align="center">
          <chakra.span fontWeight="bold">
            {activeMembership?.organization.name}
          </chakra.span>
          <Button as={Link} to="/sessions" colorScheme="green" size="sm">
            Sessions
          </Button>
          <Form action="/logout" method="post">
            <Button
              colorScheme="red"
              size="sm"
              type="submit"
              name="_action"
              value="logout"
              isLoading={loggingOut}
            >
              Logout
            </Button>
          </Form>
        </Flex>
      </Flex>

      <Flex as="main" h="full" bg="white">
        <Stack
          h="full"
          w="80"
          borderRightWidth="1px"
          bg="gray.50"
          spacing="0"
          divider={<Divider />}
        >
          <ChakraRemixLink to="new" p="4" fontSize="xl" color="blue.500">
            + New Note
          </ChakraRemixLink>

          {data.noteListItems.length === 0 ? (
            <chakra.p p="4">No notes yet</chakra.p>
          ) : (
            <List>
              {data.noteListItems.map((note) => (
                <NavLink to={note.id} key={note.id}>
                  {({ isActive }) => (
                    <ListItem
                      p="4"
                      bg={isActive ? "white" : ""}
                      borderBottomWidth="1px"
                      fontSize="xl"
                    >
                      📝 {note.title}
                    </ListItem>
                  )}
                </NavLink>
              ))}
            </List>
          )}
        </Stack>

        <chakra.div flex="1" p="6">
          <Outlet />
        </chakra.div>
      </Flex>
    </Flex>
  );
}
