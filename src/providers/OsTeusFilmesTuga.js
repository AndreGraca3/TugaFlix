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

    const streams = await Promise.all(
      Array.from({ length: streamsCount }, (_, idx) =>
        this.#getStreamDetails(postId, idx + 1)
      )
    );

    return streams
      .filter((stream) => stream)
      .map((stream) => ({
        movieTitle: movie.title,
        url: stream.url,
        quality: stream.quality,
      }))
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));
  }

  async #getStreamDetails(postId, streamIdx = 1) {
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
      const unpackedPlayerCode = unpacker.unpack(streamProviderData);

      const streamUrlMatch = unpackedPlayerCode.match(/file:"([^"]+)"/i);
      const streamUrl = streamUrlMatch ? streamUrlMatch[1] : null;

      // .jpg",kind:"thumbnails"}],captions:{userFontScale:1,color:\'#FFFFFF\',backgroundColor:\'transparent\',fontFamily:"Tahoma",backgroundOpacity:0,fontOpacity:\'100\',},"advertising":{"client":"vast","vpaidmode":"insecure"},\'qualityLabels\':{"919":"480p"},

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
        quality: firstQuality || "unknown",
      };
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
