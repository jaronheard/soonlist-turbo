type ContactUsProps = {
  children: React.ReactNode;
  email?: string;
  title?: string;
};

export const ContactUs = ({
  children,
  email = "jaron@soonlist.com",
  title = "Soonlist ideas",
}: ContactUsProps) => {
  return (
    <a
      href={`mailto:${email}?subject=${title}`}
      className="inline text-interactive-1 underline"
    >
      {children}
    </a>
  );
};
