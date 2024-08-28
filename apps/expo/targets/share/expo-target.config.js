/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "share",
  name: "ShareExtension",
  icon: "../../assets/icon.png",
  deploymentTarget: "15.0",
  entitlements: {
    "com.apple.security.application-groups": [
      process.env.APP_ENV === "development"
        ? "group.com.soonlist.dev"
        : "group.com.soonlist",
    ],
  },
};
