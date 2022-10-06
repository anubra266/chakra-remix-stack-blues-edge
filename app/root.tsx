import type { LinksFunction, LoaderArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import React, { useContext, useEffect } from "react";
import { withEmotionCache } from "@emotion/react";
import {
  ChakraProvider,
  cookieStorageManagerSSR,
  localStorageManager,
} from "@chakra-ui/react";

import { getActiveMembership } from "~/models/membership.server";
import { getUser } from "./services/session.server";
import theme from "./theme";
import { ClientStyleContext, ServerStyleContext } from "./context";

interface DocumentProps {
  children: React.ReactNode;
}

export const links: LinksFunction = () => {
  return [];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Remix Notes",
  viewport: "width=device-width,initial-scale=1",
});

export const loader = async ({ request }: LoaderArgs) => {
  const user = await getUser(request);
  const activeMembership = await getActiveMembership(user?.id);
  return json({
    user,
    activeMembership,
    cookie: request.headers.get("cookie"),
  });
};

export default function App() {
  const { cookie } = useLoaderData<typeof loader>();

  const colorModeManager =
    typeof cookie === "string"
      ? cookieStorageManagerSSR(cookie)
      : localStorageManager;

  return (
    <Document>
      <ChakraProvider theme={theme} colorModeManager={colorModeManager}>
        <Outlet />
      </ChakraProvider>
    </Document>
  );
}

const Document = withEmotionCache(
  ({ children }: DocumentProps, emotionCache) => {
    const serverStyleData = useContext(ServerStyleContext);
    const clientStyleData = useContext(ClientStyleContext);

    // Only executed on client
    useEffect(() => {
      // re-link sheet container
      emotionCache.sheet.container = document.head;
      // re-inject tags
      const tags = emotionCache.sheet.tags;
      emotionCache.sheet.flush();
      tags.forEach((tag) => {
        (emotionCache.sheet as any)._insertTag(tag);
      });
      // reset cache to reapply global styles
      clientStyleData?.reset();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstaticom" />
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap"
            rel="stylesheet"
          />
          <Meta />
          <Links />
          {serverStyleData?.map(({ key, ids, css }) => (
            <style
              key={key}
              data-emotion={`${key} ${ids.join(" ")}`}
              dangerouslySetInnerHTML={{ __html: css }}
            />
          ))}
        </head>
        <body>
          {children}
          <ScrollRestoration />
          <Scripts />
          {process.env.NODE_ENV === "development" ? <LiveReload /> : null}
        </body>
      </html>
    );
  }
);
