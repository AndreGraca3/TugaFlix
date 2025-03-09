const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
require("dotenv").config();
const OsTeusFilmesTuga = require("./src/providers/OsTeusFilmesTuga");

const manifest = {
  id: "community.tugaflix",
  version: "1.0.0",
  name: "TugaFlix",
  description: "Streaming de filmes em Português de Portugal",
  logo: "https://i.imgur.com/p9B7h1l.png",
  types: ["movie"],
  idPrefixes: ["tt"],
  resources: ["stream"],
  catalogs: [],
};

const builder = new addonBuilder(manifest);

const providers = [new OsTeusFilmesTuga()];

builder.defineStreamHandler(async ({ type, id }) => {
  if (type !== "movie") return { streams: [] };

  const streams = await Promise.all(
    providers.map((provider) =>
      provider.getStreamsUrls(id).then((streams) => {
        return streams.flatMap((stream) => {
          return {
            title: `🎬 ${stream.movieTitle}\n🌍 ${provider.siteUrl}\n ✨ ${stream.quality}`,
            name: `[TugaFlix]\n${stream.quality}`,
            url: stream.url,
            behaviorHints: {
              notWebReady: true,
            },
          };
        });
      })
    )
  );

  return {
    streams: streams,
  };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT });
