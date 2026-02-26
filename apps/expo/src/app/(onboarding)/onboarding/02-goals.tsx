import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const goals = [
  "Organize all my events in one place",
  "Turn my screenshots into saved plans",
  "Discover fun events near me",
  "Share plans with friends",
  "Just exploring for now",
] as const;

export default function GoalsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { saveStep } = useOnboarding();
  const { onboardingData } = useAppStore();
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    onboardingData.goals || [],
  );

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) {
        return prev.filter((g) => g !== goal);
      }
      return [...prev, goal];
    });
  };

  const handleContinue = () => {
    if (selectedGoals.length === 0) {
      toast.error("Please select at least one goal");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      saveStep(
        "goals",
        { goals: selectedGoals },
        "/(onboarding)/onboarding/03-screenshot-habit",
      );
    } catch (error) {
      logError("Failed to save goals", error);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <QuestionContainer
      question="What do you want to use Soonlist for?"
      subtitle="Pick as many as you like"
      currentStep={3}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1">
        <View className="flex-1">
          {goals.map((goal) => (
            <QuestionOption
              key={goal}
              label={goal}
              onPress={() => toggleGoal(goal)}
              isSelected={selectedGoals.includes(goal)}
              disabled={isLoading}
              rightIcon={selectedGoals.includes(goal) ? "✓" : undefined}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedGoals.includes(goal) }}
              accessibilityLabel={`${goal}. ${selectedGoals.includes(goal) ? "Selected" : "Not selected"}. Double tap to ${selectedGoals.includes(goal) ? "deselect" : "select"}.`}
            />
          ))}
        </View>

        <Pressable
          onPress={handleContinue}
          disabled={isLoading || selectedGoals.length === 0}
          className={`rounded-full py-4 ${
            selectedGoals.length > 0 ? "bg-white" : "bg-white/30"
          }`}
        >
          <Text
            className={`text-center text-lg font-semibold ${
              selectedGoals.length > 0 ? "text-interactive-1" : "text-white/50"
            }`}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}
