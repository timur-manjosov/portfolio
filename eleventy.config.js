// 11ty is an authoring-time build step ONLY: it composes HTML from
// layouts/includes so header/footer/nav/tokens aren't hand-copied into
// every future page. It never runs in the browser and the deployed
// output is still plain static files behind Caddy — see CLAUDE.md.
module.exports = function (eleventyConfig) {
  // Passthrough-copied verbatim: styles/scripts stay hand-written vanilla
  // CSS/ES5, untouched by any bundler or transpiler.
  eleventyConfig.addPassthroughCopy("styles");
  eleventyConfig.addPassthroughCopy("scripts");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("robots.txt");

  eleventyConfig.addCollection("sitemap", function (collectionApi) {
    return collectionApi.getFilteredByTag("sitemap");
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
  };
};
