"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface WeeklyDistributionProps {
  weekdayDistribution: object[];
}

export default function WeeklyDistribution({
  weekdayDistribution,
}: WeeklyDistributionProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weekdayDistribution}>
          <XAxis dataKey="day_of_week" />
          <YAxis domain={[0, 150]} ticks={[0, 50, 100, 150]} />
          <Tooltip
            contentStyle={{
              border: "none",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="event_count" fill="#60A5FA" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
