const axios = require("axios");
const unpacker = require("unpacker");
const Provider = require("./Provider");

class PackedProvider extends Provider {
  // TODO: make a try mechanism to try Packed Provider and move on to the next instead of having all providers hardcoded and failing if not found
  providers = [
    "ryderjet",
    "vidhidehub",
    "hlswish",
    "ghbrisk",
    "smoothpre",
    "playerwish",
    "streamwish"
  ];

  async extractStreamDetails(streamProviderUrl) {
    try {
      if (
        !streamProviderUrl ||
        !this.providers.some((provider) =>
          streamProviderUrl.toLowerCase().includes(provider)
        )
      ) {
        console.log("Invalid stream provider URL:", streamProviderUrl);
        return null;
      }

      const { data } = await axios.get(streamProviderUrl);

      const fileNameMatch = data.match(
        /<meta name=['"]description['"] content=['"]([^']+?)['"]/i
      );
      const fileName = fileNameMatch ? fileNameMatch[1] : null;

      const unpackedPlayerCode = unpacker.unpack(data);

      const m3uLink = this.extractM3UUrl(unpackedPlayerCode);

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
        url: m3uLink,
        fileName: fileName,
        quality: firstQuality || "SD",
      };
    } catch (error) {
      console.error("Error fetching stream URL:", error);
      return null;
    }
  }

  extractM3UUrl(unpackedCode) {
    const urlRegex = /https?:\/\/[^"']+\.m3u8[^\s"']*/g;
    const match = unpackedCode.match(urlRegex);
    return match ? match[0] : null;
  }
}

module.exports = PackedProvider;
