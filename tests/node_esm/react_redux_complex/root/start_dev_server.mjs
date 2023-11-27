import { startServer, fetchFileSystem } from "@jsenv/server";

await startServer({
  port: 5697,
  requestToResponse: (request) => {
    return fetchFileSystem(
      new URL(request.ressource.slice(1), new URL("./", import.meta.url)),
      {
        headers: request.headers,
        canReadDirectory: true,
        rootDirectoryUrl: new URL("./", import.meta.url),
      },
    );
  },
});
