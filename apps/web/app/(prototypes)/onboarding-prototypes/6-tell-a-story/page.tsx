import {
  FlowRow,
  Headline,
  NotificationPermission,
  PhoneFrame,
  PrimaryButton,
  PurpleScreen,
  QuestionOption,
  StoryIllustration,
  Subtitle,
  VideoPlaceholder,
} from "../components";
import {
  CombinedAgeSurveyScreen,
  PaywallScreen,
  SignInScreen,
} from "../shared-screens";

export default function TellAStory() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Direction 6: Tell a Story
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Narrative-driven with character Maya. 9 illustrated chapters + paywall +
        sign-in. 11 screens.
      </p>

      <FlowRow>
        {/* Ch1: The Flyer */}
        <PhoneFrame screenId="6-ch1" label="Ch1. The Flyer">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 1
              </div>
              <Headline>
                Maya spotted a poster for a jazz night on her walk home.
              </Headline>
              <Subtitle>
                She thought, &quot;I&apos;ll remember that.&quot; She did not
                remember that.
              </Subtitle>
            </div>
            <div className="mt-8">
              <StoryIllustration
                scene="🚶‍♀️📋"
                description="Maya walking past a flyer on a telephone pole"
              />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="What happened next" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch2: Screenshot Graveyard + Survey */}
        <PhoneFrame screenId="6-ch2" label="Ch2. Screenshot Graveyard">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 2
              </div>
              <Headline>
                By Friday, Maya had 6 event screenshots buried in her camera
                roll.
              </Headline>
              <Subtitle>
                An Instagram story about a rooftop party. A friend&apos;s text
                about a comedy show. A newsletter with three weekend picks. All
                saved. None organized.
              </Subtitle>
            </div>
            <div className="mt-6">
              <StoryIllustration
                scene="📱📸📸📸"
                description="Messy camera roll with event screenshots"
              />
            </div>
            <div className="mt-6 text-sm font-semibold text-white/80">
              Sound familiar? Do you screenshot events too?
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <QuestionOption label="All the time" selected />
              <QuestionOption label="Not yet" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch3: Saturday Morning + Discovery Survey */}
        <PhoneFrame screenId="6-ch3" label="Ch3. Saturday Morning">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 3
              </div>
              <Headline>
                Saturday morning. Maya scrolled trying to find that one event.
              </Headline>
              <Subtitle>
                Was it on Instagram? In that group text? That newsletter she
                skimmed at lunch?
              </Subtitle>
            </div>
            <div className="mt-6">
              <StoryIllustration
                scene="🤔💭📱"
                description="Maya on couch, confused, floating app icons"
              />
            </div>
            <div className="mt-4 text-sm font-semibold text-white/80">
              Where do you usually spot events?
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "Instagram",
                "TikTok",
                "Friends",
                "Newsletters",
                "Walking around",
                "Facebook",
              ].map((opt, i) => (
                <span
                  key={i}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    i === 0
                      ? "bg-white text-interactive-1"
                      : "bg-white/15 text-white"
                  }`}
                >
                  {opt}
                </span>
              ))}
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch4: Found Soonlist */}
        <PhoneFrame screenId="6-ch4" label="Ch4. Found Soonlist">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 4
              </div>
              <Headline>Then Maya found Soonlist.</Headline>
              <Subtitle>
                One app to save events from anywhere. Screenshots, texts, flyers
                — captured in seconds, organized by AI.
              </Subtitle>
            </div>
            <div className="mt-8">
              <StoryIllustration
                scene="😊📱✨"
                description="Maya smiling, phone glowing with Soonlist logo"
              />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Show me how" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch5: The Capture (interactive demo) */}
        <PhoneFrame screenId="6-ch5-capture" label="Ch5. The Capture">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 5
              </div>
              <Headline>
                Maya screenshotted that rooftop party from Instagram.
              </Headline>
              <Subtitle>
                Tap &quot;Capture&quot; to see what happened next.
              </Subtitle>
            </div>
            <div className="mx-auto mt-6 flex w-full max-w-[300px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex h-[160px] items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 text-center text-sm text-neutral-2">
                <div>
                  <div className="text-2xl">🎶</div>
                  <div className="mt-2 font-semibold text-neutral-1">
                    Rooftop Sunset DJ Set
                  </div>
                  <div className="text-xs">Sat, Mar 22 · 6:00 PM</div>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Capture this event" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch5 result */}
        <PhoneFrame screenId="6-ch5-result" label="Ch5. Result">
          <PurpleScreen>
            <div className="mt-8">
              <Headline>That&apos;s it.</Headline>
              <Subtitle>
                Screenshots become organized events, automatically.
              </Subtitle>
            </div>
            <div className="mx-auto mt-6 w-full max-w-[300px] rounded-2xl border-2 border-white/30 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-interactive-1">
                Sat, Mar 22 · 6:00 PM
              </div>
              <div className="mt-1 text-lg font-bold text-neutral-1">
                Rooftop Sunset DJ Set
              </div>
              <div className="mt-0.5 text-sm text-neutral-2">
                Skyline Terrace, Downtown
              </div>
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue Maya's story" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch6: The Shortcut */}
        <PhoneFrame screenId="6-ch6" label="Ch6. The Shortcut">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 6
              </div>
              <Headline>Maya didn&apos;t even have to open the app.</Headline>
              <Subtitle>
                She shared straight from Instagram. From Safari. From her group
                text. One tap, done.
              </Subtitle>
            </div>
            <div className="mt-6 flex-1">
              <VideoPlaceholder label="Share Extension Demo" />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch7: The Reminder */}
        <PhoneFrame screenId="6-ch7" label="Ch7. The Reminder">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 7
              </div>
              <Headline>Friday afternoon. Maya got a nudge.</Headline>
              <Subtitle>
                &quot;Rooftop Sunset DJ Set starts in 2 hours.&quot; She almost
                forgot. Again. But this time, Soonlist had her back.
              </Subtitle>
            </div>
            <div className="mt-6">
              <NotificationPermission
                title="Get reminders before your events"
                body="Soonlist reminds you before events so you never forget to go"
              />
            </div>
            <div className="mt-auto text-center text-xs text-white/60">
              You can always change this in Settings
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch8: She Actually Went + Goals */}
        <PhoneFrame screenId="6-ch8" label="Ch8. She Went + Goals">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 8
              </div>
              <Headline>
                Maya went to the rooftop jazz night. And the comedy show. And
                the art walk.
              </Headline>
              <Subtitle>
                For the first time in months, she didn&apos;t miss the things
                she actually wanted to do.
              </Subtitle>
            </div>
            <div className="mt-4 flex justify-center gap-2 text-2xl">
              <span>🎺</span>
              <span>😂</span>
              <span>🎨</span>
            </div>
            <div className="mt-4 text-sm font-semibold text-white/80">
              What matters most to you?
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {[
                "Organize all my events in one place",
                "Turn my screenshots into saved plans",
                "Discover fun events near me",
                "Share plans with friends",
                "Just exploring for now",
              ].map((opt, i) => (
                <QuestionOption
                  key={i}
                  label={opt}
                  selected={i === 0 || i === 2}
                />
              ))}
            </div>
            <div className="mt-auto pt-3">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Epilogue: Your Turn */}
        <PhoneFrame screenId="6-epilogue" label="Epilogue: Your Turn">
          <CombinedAgeSurveyScreen
            step={9}
            total={10}
            headline="That's Maya's story. Now let's start yours."
          />
        </PhoneFrame>

        {/* Paywall */}
        <PhoneFrame screenId="6-paywall" label="Paywall">
          <PaywallScreen
            headline="Soonlist is free. Every feature. No limits."
            subtitle="We're community-supported. If Maya's story resonated, you can help us keep building it for everyone."
          />
        </PhoneFrame>

        {/* Sign In */}
        <PhoneFrame screenId="6-signin" label="Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
