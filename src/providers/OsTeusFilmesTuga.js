const axios = require("axios");
const qs = require("qs");
const tmdb = require("../tmdb");
const Provider = require("./Provider");
const unpacker = require("unpacker");

class OsTeusFilmesTuga extends Provider {
  constructor() {
    super("Os Teus Filmes Tuga", "https://osteusfilmestuga.online");
  }

  async getStreamsUrls(id) {
    const movie = await tmdb.getPortugueseTitle(id);
    if (!movie) return [];
    const movieSlug = tmdb.getMovieSlug(movie.title);

    const { postId, streamsCount } = await this.#getSiteData(movieSlug);
    if (!postId || streamsCount === 0) return [];

    const streams = await Promise.all(
      Array.from({ length: streamsCount }, (_, idx) =>
        this.#getStreamDetails(postId, idx + 1)
      )
    );

    return streams
      .filter((stream) => stream)
      .map((stream) => ({
        movieTitle: movie.title,
        ...stream,
      }))
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));
  }

  async #getSiteData(movieSlug) {
    try {
      const { data } = await axios.get(`${this.siteUrl}/filmes/${movieSlug}`);

      const postIdMatch = data.match(
        /<link rel=['"]shortlink['"] href=['"][^=]+=(\d+)['"]/i
      );
      const postId = postIdMatch ? postIdMatch[1] : null;

      const streamsCountMatch = data.match(/data-nume='(\d+)'/g);
      const streamsCount = streamsCountMatch ? streamsCountMatch.length : 0;

      return { postId, streamsCount };
    } catch (error) {
      console.error("Error fetching site data:", error);
      return null;
    }
  }

  async #getStreamDetails(postId, streamIdx = 1) {
    try {
      const { data, status } = await axios.post(
        `${this.siteUrl}/wp-admin/admin-ajax.php`,
        qs.stringify({
          action: "doo_player_ajax",
          post: postId,
          nume: streamIdx,
          type: "movie",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (status != 200 || data?.type == false) return null;
      const embedHtml = data?.embed_url || "";

      const streamProviderUrlMatch = embedHtml.match(/SRC="([^"]+)"/i);
      const streamProviderUrl = streamProviderUrlMatch
        ? streamProviderUrlMatch[1]
        : null;

      return await this.#getStreamDetailsFromProvider(streamProviderUrl);
    } catch (error) {
      console.error("Error fetching stream URL:", error);
      return null;
    }
  }

  async #getStreamDetailsFromProvider(streamProviderUrl) {
    try {
      if (
        !streamProviderUrl ||
        !streamProviderUrl.includes(
          "ryderjet",
          "vidhidehub",
          "hlswish",
          "ghbrisk"
        )
      )
        return null; // TODO: handle other providers

      const { data } = await axios.get(streamProviderUrl);

      const fileNameMatch = data.match(
        /<meta name=['"]description['"] content=['"]([^']+?)['"]/i
      );
      const fileName = fileNameMatch ? fileNameMatch[1] : null;

      const unpackedPlayerCode = unpacker.unpack(data);

      const streamUrlMatch = unpackedPlayerCode.match(/file:"([^"]+)"/i);
      const streamUrl = streamUrlMatch ? streamUrlMatch[1] : null;

      const qualityLabelsMatch = unpackedPlayerCode.match(
        /qualityLabels[^{]+({[^}]+})/i
      );
      const qualityLabels = qualityLabelsMatch
        ? JSON.parse(qualityLabelsMatch[1])
        : null;

      const firstQuality = qualityLabels
        ? Object.values(qualityLabels)[0]
        : null;

      return {
        url: streamUrl,
        fileName: fileName,
        quality: firstQuality || "SD",
      };
    } catch (error) {
      console.error("Error fetching stream URL:", error);
      return null;
    }
  }
}

module.exports = OsTeusFilmesTuga;
