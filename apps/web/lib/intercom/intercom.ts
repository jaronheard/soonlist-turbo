// copied this script and it isn't typed, so we have to disable a bunch of rules
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-var */

// @ts-nocheck
import { env } from "~/env";

export const APP_ID = env.NEXT_PUBLIC_INTERCOM_APP_ID;

// Loads Intercom with the snippet
// This must be run before boot, it initializes window.Intercom

export const load = () => {
  (function () {
    var w = window;
    var ic = w.Intercom;
    if (typeof ic === "function") {
      ic("reattach_activator");
      ic("update", w.intercomSettings);
    } else {
      var d = document;
      var i = function () {
        i.c(arguments);
      };
      i.q = [];
      i.c = function (args) {
        i.q.push(args);
      };
      w.Intercom = i;
      var l = function () {
        var s = d.createElement("script");
        s.type = "text/javascript";
        s.async = true;
        s.src = "https://widget.intercom.io/widget/ravmo56d";
        var x = d.getElementsByTagName("script")[0];
        x.parentNode.insertBefore(s, x);
      };
      if (document.readyState === "complete") {
        l();
      } else if (w.attachEvent) {
        w.attachEvent("onload", l);
      } else {
        w.addEventListener("load", l, false);
      }
    }
  })();
};

// Initializes Intercom
export const boot = (options: Intercom_.IntercomSettings) => {
  window &&
    window.Intercom &&
    window.Intercom("boot", {
      api_base: "https://api-iam.intercom.io",
      app_id: APP_ID,
      ...options,
    });
};

export const update = () => {
  window && window.Intercom && window.Intercom("update");
};

export const newMessage = (text?: string) => {
  window && window.Intercom && window.Intercom("showNewMessage", text);
};

export const feedback = (subject: string) => {
  const newMessageText = `Feedback: ${subject}\n\n`;
  newMessage(newMessageText);
};
