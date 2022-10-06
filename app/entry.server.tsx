import { RemixServer } from "@remix-run/react";

import createEmotionServer from "@emotion/server/create-instance";
import { CacheProvider } from "@emotion/react";

import { renderToString } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import { Response } from "@remix-run/node";
import type { EntryContext, Headers } from "@remix-run/node";
import isbot from "isbot";
import { PassThrough } from "stream";
import createEmotionCache from "./createEmotionCache";
import { ServerStyleContext } from "./context";

const ABORT_DELAY = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const cache = createEmotionCache();
  const { extractCriticalToChunks } = createEmotionServer(cache);

  const callbackName = isbot(request.headers.get("user-agent"))
    ? "onAllReady"
    : "onShellReady";

  const html = renderToString(
    <ServerStyleContext.Provider value={null}>
      <CacheProvider value={cache}>
        <RemixServer context={remixContext} url={request.url} />
      </CacheProvider>
    </ServerStyleContext.Provider>
  );

  const chunks = extractCriticalToChunks(html);

  let didMarkupError = false;

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerStyleContext.Provider value={chunks.styles}>
        <CacheProvider value={cache}>
          <RemixServer context={remixContext} url={request.url} />
        </CacheProvider>
      </ServerStyleContext.Provider>,
      {
        [callbackName]() {
          let body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(body, {
              status: didMarkupError ? 500 : responseStatusCode,
              headers: responseHeaders,
            })
          );
          pipe(body);
        },
        onShellError(err: unknown) {
          reject(err);
        },
        onError(error: unknown) {
          didMarkupError = true;
          console.error(error);
        },
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
