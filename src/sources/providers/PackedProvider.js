const axios = require("axios");
const unpacker = require("unpacker");
const Provider = require("./Provider");

class PackedProvider extends Provider {
  providers = [
    "ryderjet",
    "vidhidehub",
    "hlswish",
    "ghbrisk",
    "smoothpre",
    "playerwish",
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

module.exports = PackedProvider;
