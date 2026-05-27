module.exports = function(eleventyConfig) {

  // Passthrough copies
  eleventyConfig.addPassthroughCopy({ "public": "." });
  eleventyConfig.addPassthroughCopy({ "field-assessment": "field-assessment" });
  eleventyConfig.addPassthroughCopy("_redirects");
  eleventyConfig.addPassthroughCopy("posts.json");
  eleventyConfig.addPassthroughCopy({ "netlify": "netlify" });
    eleventyConfig.addPassthroughCopy("admin");

  // Sort essays collection by date descending
  eleventyConfig.addCollection("essays", function(collectionApi) {
    return collectionApi.getFilteredByTag("essays").sort((a, b) => {
      return b.date - a.date;
    });
  });

  // Date display filter: "May 2026"
  eleventyConfig.addFilter("dateDisplay", function(date) {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  });

  // ISO date filter for sitemap
  eleventyConfig.addFilter("isoDate", function(date) {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    }
  };
};
