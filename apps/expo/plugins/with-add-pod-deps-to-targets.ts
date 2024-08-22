import fs from "node:fs";
import path from "node:path";
import type { ConfigPlugin } from "@expo/config-plugins";
import { withDangerousMod } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";

const SRC_TO_ADD_TO_PODFILE = `
target 'ShareExtension' do
  pod 'Alamofire', '~> 5.9.1'
  pod 'Sentry', :git => 'https://github.com/getsentry/sentry-cocoa.git', :tag => '8.21.0'
end

use_frameworks! # This is important for Sentry
`;

export const withAddPodDepsToTargets: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, "Podfile");
      const contents = await fs.promises.readFile(file, "utf8");
      await fs.promises.writeFile(file, addPodDepsToTargets(contents), "utf8");
      return config;
    },
  ]);
};

function addPodDepsToTargets(src: string) {
  return mergeContents({
    tag: `with-add-pod-deps-to-targets`,
    src,
    newSrc: SRC_TO_ADD_TO_PODFILE.trim(),
    anchor: /target ['"]([^'"]*)['"] do/,
    offset: 0,
    comment: "#",
  }).contents;
}
