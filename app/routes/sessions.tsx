import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import {
  Form,
  Link,
  Outlet,
  useFetcher,
  useNavigate,
  useOutlet,
  useTransition,
} from "@remix-run/react";

import {
  Button,
  Flex,
  Heading,
  ListItem,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  UnorderedList,
  chakra,
} from "@chakra-ui/react";
import {
  getUserSessions,
  logoutSession,
  requireUserId,
} from "~/services/session.server";
import { useUser } from "~/utils/data";
import { inputFromForm } from "~/utils/input-resolvers";
import { superjson, useSuperLoaderData } from "~/utils/remix";

export const action: ActionFunction = async ({ request }) => {
  const { _action, sessionId } = await inputFromForm(request);
  if (_action === "single_session") {
    return await logoutSession(sessionId as string);
  }
};

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await requireUserId(request);
  const sessions = await getUserSessions({ userId, request });
  return superjson({ sessions }, { headers: { "x-superjson": "true" } });
};

export default function NotesPage() {
  const data = useSuperLoaderData<typeof loader>();
  const user = useUser();
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
        <chakra.div flex="1" p="6">
          <UnorderedList spacing="4">
            {data.sessions?.map((session, i) => (
              <SessionItem
                session={session}
                canLogoutAll={!!data.sessions && data.sessions.length > 1}
                key={i}
              />
            ))}
          </UnorderedList>
        </chakra.div>
      </Flex>
    </Flex>
  );
}

const SessionItem = ({
  session,
  canLogoutAll,
}: {
  session: NonNullable<Awaited<ReturnType<typeof getUserSessions>>>[number];
  canLogoutAll: boolean;
}) => {
  const sessionData = session.data as Record<string, any>;

  const singleSessionFetcher = useFetcher();
  const isDeletingSingleSession =
    singleSessionFetcher.submission?.formData.get("sessionId") === session.id;

  return (
    <ListItem
      key={session.id}
      //* Optimistic UI
      hidden={isDeletingSingleSession || !session.is_current_device}
    >
      <div>
        <b>IP:</b> {sessionData.ip_address}
        {session.is_current_device && (
          <>
            - <b> Active now</b>
          </>
        )}
      </div>
      <div>
        <b>Browser:</b> {sessionData.browser.name} - v
        {sessionData.browser.version}{" "}
      </div>
      <div>
        <b>Device: </b>
        {sessionData.platform.vendor}, {sessionData.platform.type} -{" "}
        {sessionData.os.name}{" "}
        {sessionData.os.versionName || `v` + sessionData.os.version}
      </div>
      <div>
        <b>Last active:</b>{" "}
        {new Intl.DateTimeFormat("en-GB", {
          dateStyle: "full",
          timeStyle: "long",
        }).format(session.last_active)}
      </div>
      <Flex gap="2">
        {session.is_current_device ? (
          <>{canLogoutAll && <LogoutAllSessions />}</>
        ) : (
          <singleSessionFetcher.Form method="post">
            <input type="hidden" name="sessionId" value={session.id} />
            <Button
              colorScheme="orange"
              size="xs"
              type="submit"
              name="_action"
              value="single_session"
            >
              Logout
            </Button>
          </singleSessionFetcher.Form>
        )}
      </Flex>
    </ListItem>
  );
};

export const LogoutAllSessions = () => {
  const inOutlet = !!useOutlet();
  const navigate = useNavigate();

  const onClose = () => {
    navigate("/sessions");
  };

  return (
    <>
      <Button as={Link} to="logout-all" colorScheme="red" size="xs">
        Logout other sessions
      </Button>
      <Modal
        isOpen={inOutlet}
        onClose={onClose}
        size="sm"
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <Outlet context={{ onClose }} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
