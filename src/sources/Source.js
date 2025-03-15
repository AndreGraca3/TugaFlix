class Source {
  constructor(name, siteUrl) {
    this.name = name;
    this.siteUrl = siteUrl;
  }

  async getStreamsUrls(id) {
    return [];
  }
}

module.exports = Source;
