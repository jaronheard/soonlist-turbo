/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "share",
  name: "ShareExtension",
  icon: "../../assets/icon.png",
  deploymentTarget: "15.1",
  entitlements: {
    "com.apple.security.application-groups": [
      process.env.APP_VARIANT === "development"
        ? "group.com.soonlist.dev"
        : "group.com.soonlist",
    ],
  },
  infoPlist: {
    // Allow configuring Convex base URL if not set via App Group
    ConvexHttpBaseURL:
      process.env.APP_VARIANT === "development"
        ? "https://YOUR-DEV-CONVEX.convex.site/"
        : "https://YOUR-PROD-CONVEX.convex.site/",
    ConvexHttpBaseURLDev: "https://YOUR-DEV-CONVEX.convex.site/",
  },
};
