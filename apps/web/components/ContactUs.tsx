interface ContactUsProps {
  children: React.ReactNode;
  email?: string;
  title?: string;
}

export const ContactUs = ({
  children,
  email = "jaron@soonlist.com",
  title = "Soonlist ideas",
}: ContactUsProps) => {
  return (
    <a
      href={`mailto:${email}?subject=${title}`}
      className="text-interactive-1 inline underline"
    >
      {children}
    </a>
  );
};
