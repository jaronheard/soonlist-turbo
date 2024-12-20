interface CalendarDayCardProps {
  date: Date; // Accept Date object
}

const CalendarDayCard: React.FC<CalendarDayCardProps> = ({ date }) => {
  const dayType = date
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const dayNumber = date.getDate().toString();
  const month = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();

  return (
    <div className="flex w-32 flex-col items-center justify-center rounded-lg border bg-white/10 p-4 shadow-md backdrop-blur-sm">
      {" "}
      {/* Fixed width */}
      <div className="text-center">
        <p className="text-sm font-bold text-gray-500">{dayType}</p>
        <p className="font-heading text-5xl font-bold">{dayNumber}</p>{" "}
        {/* Use font-heading class */}
      </div>
      <p className="text-xl font-bold ">{month}</p> {/* Month at the bottom */}
    </div>
  );
};

export default CalendarDayCard;
