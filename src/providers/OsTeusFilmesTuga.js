const axios = require("axios");
const qs = require("qs");
const tmdb = require("../tmdb");
const Provider = require("./Provider");

class OsTeusFilmesTuga extends Provider {
  constructor() {
    super("Os Teus Filmes Tuga", "https://osteusfilmestuga.online");
  }

  async getStreamsUrls(id) {
    const movie = await tmdb.getPortugueseTitle(id);
    if (!movie) return { streams: [] };
    const movieSlug = tmdb.getMovieSlug(movie.title);
    console.log("movieSlug", movieSlug);

    const postId = await this.#getMoviePostId(movieSlug);
    if (!postId) return [];

    const streamUrl = await this.getStreamUrl(postId); // TODO: get other streams
    return streamUrl ? [{ movieTitle: movie.title, url: streamUrl }] : [];
  }

  async getStreamUrl(postId) {
    try {
      const { data } = await axios.post(
        `${this.siteUrl}/wp-admin/admin-ajax.php`,
        qs.stringify({
          action: "doo_player_ajax",
          post: postId,
          nume: 1,
          type: "movie",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const embedHtml = data?.embed_url || "";
      const match = embedHtml.match(/SRC="([^"]+)"/i);
      return match ? match[1] : null;
    } catch (error) {
      console.error("Error fetching stream URL:", error);
      return null;
    }
  }

  async #getMoviePostId(movieSlug) {
    try {
      const { data } = await axios.get(`${this.siteUrl}/filmes/${movieSlug}`);

      const match = data.match(
        /<link rel=['"]shortlink['"] href=['"][^=]+=(\d+)['"]/i
      );
      return match ? match[1] : null;
    } catch (error) {
      console.error("Error fetching movie post ID:", error);
      return null;
    }
  }
}

module.exports = OsTeusFilmesTuga;
