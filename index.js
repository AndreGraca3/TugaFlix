const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
require("dotenv").config();
const OsTeusFilmesTuga = require("./src/sources/OsTeusFilmesTuga");
const PackedProvider = require("./src/sources/providers/PackedProvider");

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

const packedProvider = new PackedProvider();
const sources = [new OsTeusFilmesTuga([packedProvider])];

builder.defineStreamHandler(async ({ type, id }) => {
  if (type !== "movie") return { streams: [] };
  console.log("Hit: ", id);

  const streams = (
    await Promise.all(
      sources.map((source) =>
        source.getStreamsUrls(id).then((streams) => {
          return streams.map((stream) => {
            return {
              title: `🎬 ${stream.movieTitle}\n📂 ${stream.fileName}\n🌍 ${source.siteUrl}\n✨ ${stream.quality}`,
              name: `[TugaFlix]\n${stream.quality}`,
              externalUrl: stream.url,
              // url: stream.url,
              behaviorHints: {
                notWebReady: true,
              },
            };
          });
        })
      )
    )
  ).flat();

  console.log("Streams:", streams);
  return { streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT });
