import { Button } from "@/components/ui/button";

/* eslint-disable react/no-unescaped-entities */
export const metadata = {
  title: "Early Access | Soonlist",
  openGraph: {
    title: "Early Access | Soonlist",
  },
};

export default function Page() {
  return (
    <div className="prose mx-auto px-8 py-12 sm:prose-lg lg:prose-xl xl:prose-2xl 2xl:prose-2xl">
      <h1 className="font-heading">Seeking Portland Event List Makers</h1>
      <h2 className="font-heading">Events For Everybody</h2>
      <p>
        Be a part of the first cohort of event list makers on{" "}
        <a href="https://www.soonlist.com/">Soonlist</a>, a new community
        platform to gather and share events that matter to you and your
        communities.
      </p>
      <h3 className="font-heading">This Is For You If You:</h3>
      <ul>
        <li>Know about events that are happening</li>
        <li>Want to contribute to more connection & community</li>
        <li>Like to express yourself and try new things</li>
      </ul>
      <Button asChild>
        <a
          href="https://airtable.com/appCo9aIJEtkq3Rkt/pagyD7sToPLxCviUx/form"
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline"
        >
          I want to make an event list!
        </a>
      </Button>
      <p>
        {" "}
        <span role="img" aria-label="pray">
          🙏
        </span>{" "}
        <strong>
          Please share this with a friend who might be interested!
        </strong>{" "}
        <span role="img" aria-label="pray">
          🙏
        </span>
      </p>
      {/* New content starts here */}
      <div className="mt-12">
        <h2 id="more-info" className="font-heading">
          More Info
        </h2>
        <p>
          Hi! I’m <a href="https://www.jaronheard.com/">Jaron</a>, founder of{" "}
          <a href="https://www.soonlist.com/">Soonlist</a>, event lists for
          everybody.
        </p>
        {/* youtube embed */}
        <p className="aspect-video">
          <iframe
            src="https://www.youtube.com/embed/TVLFPATSrok"
            title="YouTube video player"
            frameBorder={0}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </p>
        <p>
          I want to make it easy for anyone to make and share lists of events!
          I’m inspired by Portland’s community calendars like{" "}
          <span role="img" aria-label="bike">
            🚲
          </span>
          <a href="https://www.shift2bikes.org/calendar/" className="underline">
            Pedalpalooza
          </a>
          <span role="img" aria-label="bike">
            🚲
          </span>
          ,{" "}
          <span role="img" aria-label="computer">
            💻
          </span>
          <a href="https://calagator.org/" className="underline">
            Calagator
          </a>
          <span role="img" aria-label="computer">
            💻
          </span>
          , and{" "}
          <span role="img" aria-label="dance">
            💃
          </span>
          <a href="https://www.portlanddancing.com/" className="underline">
            PortlandDancing
          </a>
          <span role="img" aria-label="dance">
            💃
          </span>
          ! Over the last 3 months, I’ve been building a platform to make it
          possible, and now I’m ready to share and test the platform with the
          first cohort of list makers!
        </p>
        <h3 className="font-heading">What You’ll Do</h3>
        <ul>
          <li>
            Make an event list on{" "}
            <a href="https://www.soonlist.com/">Soonlist</a>
          </li>
          <li>Add events as you learn about them</li>
          <li>Share the events with your friends (social, text, however)</li>
          <li>Offer any feedback, ideas, or issues</li>
        </ul>
        <h3 className="font-heading">What you'll get</h3>
        <ul className="list-none">
          <li>
            <span role="img" className="-ml-6 mr-2 sm:-ml-9" aria-label="new">
              🆕
            </span>{" "}
            Be a part of shaping something new
          </li>
          <li>
            <span role="img" className="-ml-6 mr-2 sm:-ml-9" aria-label="heart">
              💖
            </span>{" "}
            Build community through sharing events
          </li>
          <li>
            <span
              role="img"
              className="-ml-6 mr-2 sm:-ml-9"
              aria-label="rainbow"
            >
              🌈
            </span>{" "}
            Visibility to other users and curators
          </li>
          <li>
            <span role="img" className="-ml-6 mr-2 sm:-ml-9" aria-label="medal">
              🏅
            </span>{" "}
            Supporter badge
          </li>
          <li>
            <span role="img" className="-ml-6 mr-2 sm:-ml-9" aria-label="party">
              🎉
            </span>{" "}
            Launch party! Meet other event list makers
          </li>
        </ul>
        <h3 className="font-heading">Event List Ideas</h3>
        <p>
          I'd love to see event lists in these areas, or your own special blend!
        </p>
        <p>
          Activism 🕊️, Adventure 🧗🏽, Art 🎨, Community 👥, Culture 🌍, Cycling
          🚴🏻, Dance 💃🏿, Dating ❤️, Design 🖌, DIY 🔨, Education 📚, Fashion 👗,
          Festivals 🎪, Fitness 🏋🏽, Food 🍲, Freelance 💼, Friends 👫🏾, Gaming
          🎮, Gardening 🌱, History ⏳, Innovation 💡, Kids 👶🏼, Languages 🌐,
          Literature 📖, Markets 🛒, Music 🎵, Networking 🤝🏽, Outdoors 🌳,
          Photography 📷, Poetry ✍🏽, Queer 🏳️‍🌈, Science 🔬, Spirituality 🕉,
          Sustainability ♻️, Tech 💻, Theater 🎭, Travel ✈️, Volunteer 👐🏼,
          Wellness 🧘🏽, Workshops 🛠, but especially your own special blend 🦄!
        </p>
      </div>
      <Button asChild>
        <a
          href="https://airtable.com/appCo9aIJEtkq3Rkt/pagyD7sToPLxCviUx/form"
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline"
        >
          I want to make an event list!
        </a>
      </Button>
      <p>
        {" "}
        <span role="img" aria-label="pray">
          🙏
        </span>{" "}
        <strong>
          Please share this with a friend who might be interested!
        </strong>{" "}
        <span role="img" aria-label="pray">
          🙏
        </span>
      </p>
    </div>
  );
}
