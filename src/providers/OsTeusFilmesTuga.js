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
    console.log("movieSlug", movieSlug);

    const { postId, streamsCount } = await this.#getSiteData(movieSlug);
    if (!postId || streamsCount === 0) return [];

    const streamUrls = await Promise.all(
      Array.from({ length: streamsCount }, (_, idx) =>
        this.getStreamUrl(postId, idx + 1)
      )
    );

    return streamUrls
      .filter((url) => url)
      .map((url) => ({
        movieTitle: movie.title,
        url,
      }));
  }

  async getStreamUrl(postId, streamIdx = 1) {
    try {
      const { data } = await axios.post(
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

      if (data?.type == false) return null;

      const embedHtml = data?.embed_url || "";
      const streamProviderUrlMatch = embedHtml.match(/SRC="([^"]+)"/i);
      const streamProviderUrl = streamProviderUrlMatch
        ? streamProviderUrlMatch[1]
        : null;
      if (!streamProviderUrl || streamProviderUrl.includes("osteusfilmestuga"))
        return null; // TODO: handle their player

      const { data: streamProviderData } = await axios.get(streamProviderUrl);
      const unpacked = unpacker.unpack(streamProviderData);
      const streamUrlMatch = unpacked.match(/file:"([^"]+)"/i);
      const streamUrl = streamUrlMatch ? streamUrlMatch[1] : null;

      return streamUrl;
    } catch (error) {
      console.error("Error fetching stream URL:", error);
      return null;
    }
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
}

module.exports = OsTeusFilmesTuga;
