const axios = require("axios");
const qs = require("qs");
const tmdb = require("../tmdb");
const Source = require("./Source");

class OsTeusFilmesTuga extends Source {
  constructor(providers) {
    super("Os Teus Filmes Tuga", "https://osteusfilmestuga.online");
    this.providers = providers;
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

      return (
        await Promise.all(
          this.providers.map((provider) =>
            provider.extractStreamDetails(streamProviderUrl)
          )
        )
      ).find((stream) => stream);
    } catch (error) {
      console.error("Error fetching stream URL:", error);
      return null;
    }
  }
}

module.exports = OsTeusFilmesTuga;
