const axios = require("axios");
const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function getPortugueseTitle(imdbId) {
  try {
    const { data } = await axios.get(
      `https://api.themoviedb.org/3/find/${imdbId}`,
      {
        params: {
          language: "pt-PT",
          external_source: "imdb_id",
        },
        headers: {
          Authorization: `Bearer ${TMDB_API_KEY}`,
        },
      }
    );

    return data.movie_results[0] || null;
  } catch (error) {
    console.error("Error fetching Portuguese title:", error);
    return null;
  }
}

function getMovieSlug(title) {
  return title
    ?.toLowerCase()
    .normalize("NFD") // Decomposes characters into base + diacritics
    .replace(/[\u0300-\u036f]/g, "") // Removes diacritics
    .replace(/ /g, "-");
}

module.exports = { getPortugueseTitle, getMovieSlug };
