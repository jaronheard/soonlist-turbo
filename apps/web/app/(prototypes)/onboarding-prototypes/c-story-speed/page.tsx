import {
  FeatureGatePaywall,
  FlowRow,
  Headline,
  PhoneFrame,
  PrimaryButton,
  PurpleScreen,
  QuestionOption,
  StoryIllustration,
  Subtitle,
} from "../components";
import {
  CombinedAgeSurveyScreen,
  DiscoveryChannelsScreen,
  NotificationsScreen,
  SignInScreen,
  TryItParsing,
  TryItScreenshot,
} from "../shared-screens";

export default function StorySpeed() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Variation C: Story + Speed
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Emotion-optimized. Tell a Story emotional arc + demo by screen 4 instead
        of screen 5. ~12 screens.
      </p>

      <FlowRow>
        {/* Ch1: The Flyer */}
        <PhoneFrame screenId="c-ch1" label="Ch1. The Flyer">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 1
              </div>
              <Headline>
                She spotted a poster for a jazz night on her walk home.
              </Headline>
              <Subtitle>
                She thought, &quot;I&apos;ll remember that.&quot; She did not
                remember that.
              </Subtitle>
            </div>
            <div className="mt-8">
              <StoryIllustration
                scene="🚶‍♀️📋"
                description="Walking past a flyer on a telephone pole"
              />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="What happened next" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch2: Screenshot Graveyard (collects screenshot habit) */}
        <PhoneFrame screenId="c-ch2" label="Ch2. Screenshot Graveyard">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 2
              </div>
              <Headline>
                By Friday, she had 6 event screenshots buried in her camera
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

        {/* Ch3: Found Soonlist (pivot) */}
        <PhoneFrame screenId="c-ch3" label="Ch3. Found Soonlist">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 3
              </div>
              <Headline>Then she found Soonlist.</Headline>
              <Subtitle>
                One app to save events from anywhere. Screenshots, texts,
                flyers — captured in seconds, organized by AI.
              </Subtitle>
            </div>
            <div className="mt-8">
              <StoryIllustration
                scene="😊📱✨"
                description="Phone glowing with Soonlist logo"
              />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Try it yourself" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 4: Demo Tap */}
        <PhoneFrame screenId="c-demo-tap" label="4. Demo Tap">
          <TryItScreenshot
            step={4}
            total={11}
            headline="Here's that rooftop party from Instagram."
            subtitle="Tap to capture it — just like she did."
          />
        </PhoneFrame>

        {/* Screen 5: Demo Parse */}
        <PhoneFrame screenId="c-demo-parse" label="5. Demo Parse">
          <TryItParsing step={5} total={11} />
        </PhoneFrame>

        {/* Screen 6: Demo Result (conditional copy) */}
        <PhoneFrame screenId="c-demo-result" label="6. Demo Result">
          <PurpleScreen>
            <div className="mt-8">
              <Headline>That&apos;s it. One screenshot, one tap.</Headline>
              <Subtitle>
                She never lost an event again. And neither will you.
              </Subtitle>
            </div>
            <div className="mt-6 mx-auto w-full max-w-[300px] rounded-2xl border-2 border-white/30 bg-white p-5 shadow-sm">
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
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Ch4: She Went (collects goals) */}
        <PhoneFrame screenId="c-ch4" label="Ch4. She Went">
          <PurpleScreen>
            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Chapter 4
              </div>
              <Headline>
                She went to the rooftop jazz night. And the comedy show. And
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
                "Actually go to events I hear about",
                "Stop losing events in my camera roll",
                "Find out what's happening near me",
                "Share plans with friends",
                "Just exploring for now",
              ].map((opt, i) => (
                <QuestionOption
                  key={i}
                  label={opt}
                  selected={i === 0 || i === 1}
                />
              ))}
            </div>
            <div className="mt-auto pt-3">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 8: Discovery Channels */}
        <PhoneFrame screenId="c-discovery" label="8. Discovery">
          <DiscoveryChannelsScreen
            step={8}
            total={11}
            headline="Where do you spot the most events?"
            subtitle="We'll personalize your experience."
          />
        </PhoneFrame>

        {/* Screen 9: Age + Source */}
        <PhoneFrame screenId="c-age-source" label="9. Age + Source">
          <CombinedAgeSurveyScreen
            step={9}
            total={11}
            headline="That's her story. Now let's start yours."
          />
        </PhoneFrame>

        {/* Screen 10: Notifications */}
        <PhoneFrame screenId="c-notif" label="10. Notifications">
          <NotificationsScreen
            step={10}
            total={11}
            headline="Never forget an event you saved."
            subtitle="We'll remind you before events happen so you actually go."
            dialogTitle="Get reminders before your events"
            dialogBody="Soonlist reminds you before events so you never forget to go"
          />
        </PhoneFrame>

        {/* Screen 11: Paywall (community-framed + soft gate) */}
        <PhoneFrame screenId="c-paywall" label="11. Paywall">
          <FeatureGatePaywall
            headline="Soonlist is community-supported"
            subtitle="Free members get 3 captures/month. Your support keeps Soonlist free for everyone — and unlocks unlimited captures for you."
          />
        </PhoneFrame>

        {/* Screen 12: Sign In */}
        <PhoneFrame screenId="c-signin" label="12. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
