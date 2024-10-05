import React from "react";

import { CTAButton } from "~/components/CallToActions";

export const metadata = {
  title: "About | Soonlist",
  openGraph: {
    title: "About | Soonlist",
  },
};

export default function Page() {
  return (
    <div>
      <div className="prose mx-auto sm:prose-lg lg:prose-xl xl:prose-2xl 2xl:prose-2xl">
        <h1 className="font-heading">About Soonlist</h1>
        <h2 className="font-heading">Our vision</h2>
        <p className="">
          We want to connect people more to what they care about, and reclaim
          our collective attention. Soonlist aims to make saving, organizing,
          and sharing events as easy and fun as making playlists or sharing a
          photo album.
        </p>
        <p>We imagine a world where:</p>
        <ul>
          <li>People are better connected to what they care about 💖</li>
          <li>Social media isn't required to know what's going on 🙅‍♀️</li>
          <li>
            People are saving, sharing, and attending events that inspire them
            🌟
          </li>
          <li>
            Anyone can create curated lists of events they're interested in 🎨
          </li>
          <li>
            Communities grow because it’s easy to see what events are happening
            🙌
          </li>
          <li>
            There's more cross-pollination across circles, communities, and
            cultures 🌍
          </li>
          <li>We have more time to be together 👥</li>
        </ul>
        <div className="">
          <h2 className="font-heading">Our story</h2>
          <p className="">
            Soonlist was founded by{" "}
            <a href="https://www.jaronheard.com">Jaron Heard</a> and{" "}
            <a href="https://www.joshcarr.com">Josh Carr</a>
            inspired by a coalescing of community needs, ideas, and technology
            developments. Community organizations like{" "}
            <a href="https://www.makingearthcool.com">Making Earth Cool</a> were
            facing the reality of how difficult it was to save and gather
            events. Some communities made their own calendars, but it required
            lots of manual work or special skills. At the same time, new
            advances in technology made it possible to extract event information
            from text, images, and websites more effectively than ever before.
          </p>
          <p>
            Since then, Jaron, Josh and friends have been exploring we can use
            this new technology to help organize and expand possibilities.
            Soonlist is both already a useful product … and it’s still super
            early in its development! We're about to start raising a friends and
            family round of investment to support further development.
            <a href="mailto:jaron@soonlist.com">Email us</a> if you have a
            connection!
          </p>
        </div>
      </div>
      <div className="mx-auto flex max-w-min gap-6">
        <CTAButton />
      </div>
    </div>
  );
}
