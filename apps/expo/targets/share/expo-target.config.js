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
    "keychain-access-groups": [
      `${process.env.APP_VARIANT === "development" ? "$(AppIdentifierPrefix)group.com.soonlist.dev" : "$(AppIdentifierPrefix)group.com.soonlist"}`,
    ],
  },
  infoPlist: {
    ConvexHttpBaseURL: "https://convex-http.soonlist.com",
    ConvexHttpBaseURLDev: "https://lovable-camel-478.convex.site",
  },
};
