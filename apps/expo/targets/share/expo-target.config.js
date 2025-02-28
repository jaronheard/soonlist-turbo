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
};
