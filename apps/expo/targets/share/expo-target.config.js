/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "share",
  name: "ShareExtension",
  icon: "../../assets/icon.png",
  deploymentTarget: "15.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.soonlist"],
  },
};
