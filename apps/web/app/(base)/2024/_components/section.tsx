// Section component that has a good amount of vertical padding and a 4 px wide bottom border that is puurple
const Section = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mb-12 border-b-8 border-purple-100 pb-12">{children}</div>
  );
};

export default Section;
