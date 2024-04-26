"use client";

import {
  SignInButton,
  SignedIn,
  SignedOut,
  useClerk,
  useUser,
} from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { CalendarPlus, Menu, Star } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Logo } from "./Logo";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
  NavigationMenuContent,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import { Separator } from "./ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./DropdownMenu";
import { TimezoneSelect } from "./TimezoneSelect";
import { Button, buttonVariants } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

const newEvent: { title: string; href: string; description: string }[] = [
  {
    title: "New Event",
    href: "/new",
    description: "Add a new event",
  },
];
const userEvents: { title: string; href: string; description: string }[] = [
  {
    title: "My Events",
    href: "/events",
    description: "All events you have added or saved",
  },
  {
    title: "Following",
    href: "/following",
    description: "All events from lists you are following",
  },
];

const allEvents: { title: string; href: string; description: string }[] = [
  {
    title: "Discover",
    href: "/explore",
    description: "Discover events from all users",
  },
];
const userFollowing: { title: string; href: string; description: string }[] = [
  {
    title: "Following",
    href: "/following/users",
    description: "Users you are following",
  },
];
const allUsers: { title: string; href: string; description: string }[] = [
  {
    title: "Explore",
    href: "/users",
    description: "Explore all users",
  },
];

export function Header() {
  return (
    <div className="sticky top-0 z-50 bg-interactive-3">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between pb-4 pl-2 pt-3 sm:px-4 sm:pb-7 sm:pt-5">
        <div className="flex items-center sm:grow sm:gap-0">
          <NavigationMenu>
            <Link href="/" className="relative flex items-center">
              <Logo variant="hidePreview" className="block sm:hidden" />
              <Logo className="hidden sm:block" />
            </Link>
          </NavigationMenu>
        </div>
        <div className="flex shrink-0 sm:gap-5">
          <Nav />
          <NavigationMenu>
            <SignedIn>
              <UserMenu />
            </SignedIn>
            <MobileNav />
          </NavigationMenu>
        </div>
      </header>
    </div>
  );
}

export function Nav() {
  const { user } = useUser();

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex gap-3">
        <SignedIn>
          <NavigationMenuItem className="hidden lg:block">
            <NavigationMenuTrigger>Events</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[300px] gap-3 p-4 sm:w-[400px]">
                {newEvent.map((component) => (
                  <ListItem
                    key={component.title}
                    title={component.title}
                    href={component.href}
                  >
                    {component.description}
                  </ListItem>
                ))}
                <Separator />
                <SignedIn>
                  {userEvents.map((component) => (
                    <ListItem
                      key={component.title}
                      title={component.title}
                      href={`/${user?.username}${component.href}`}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </SignedIn>
                {allEvents.map((component) => (
                  <ListItem
                    key={component.title}
                    title={component.title}
                    href={component.href}
                  >
                    {component.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </SignedIn>
        <SignedIn>
          <NavigationMenuItem className="hidden lg:block">
            <NavigationMenuTrigger>Users</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[300px] gap-3 p-4 sm:w-[400px]">
                <SignedIn>
                  {userFollowing.map((component) => (
                    <ListItem
                      key={component.title}
                      title={component.title}
                      href={`/${user?.username}${component.href}`}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </SignedIn>
                {allUsers.map((component) => (
                  <ListItem
                    key={component.title}
                    title={component.title}
                    href={component.href}
                  >
                    {component.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </SignedIn>
        <NavigationMenuItem className="hidden lg:block">
          <Link href="/onboarding" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              About
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <SignedOut>
          <NavigationMenuItem className="hidden lg:block">
            <SignInButton
              afterSignUpUrl={`${process.env.NEXT_PUBLIC_URL}/get-started`}
            >
              <Button variant="secondary">Log In</Button>
            </SignInButton>
          </NavigationMenuItem>
        </SignedOut>
        <NavigationMenuItem>
          <SignedIn>
            <Link href="/new" legacyBehavior passHref>
              <NavigationMenuLink
                className={buttonVariants({ variant: "default" })}
              >
                <CalendarPlus className="mr-2 size-4"></CalendarPlus>
                Add<span className="inline">&nbsp;Event</span>
              </NavigationMenuLink>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/early-access" legacyBehavior passHref>
              <NavigationMenuLink
                className={buttonVariants({ variant: "default" })}
              >
                <Star className="mr-2 hidden size-4 sm:block"></Star>
                Early Access
              </NavigationMenuLink>
            </Link>
          </SignedOut>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItemSimple = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title }, ref) => {
  return (
    <NavigationMenuItem>
      <Link href="href" legacyBehavior passHref className={className} ref={ref}>
        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
          {title}
        </NavigationMenuLink>
      </Link>
    </NavigationMenuItem>
  );
});
ListItemSimple.displayName = "ListItemSimple";

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, href, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          href={href!}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-lg font-medium leading-none text-foreground">
            {title}
          </div>
          <p className="line-clamp-3 text-lg leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

const UserMenu = () => {
  // Grab the `isLoaded` and `user` from useUser()
  const { isLoaded, user } = useUser();
  // Grab the signOut and openUserProfile methods
  const { signOut, openUserProfile } = useClerk();

  // if not loaded return a 32x32 grey circle pulsing
  if (!isLoaded || !user?.id) {
    return (
      <div className="size-8 animate-pulse rounded-full bg-gray-100 p-1"></div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hidden py-2 lg:block">
        <Image
          alt={"User"}
          src={user?.imageUrl}
          width={32}
          height={32}
          className="rounded-full border border-gray-200 drop-shadow-sm"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-1">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => openUserProfile()}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Timezone</DropdownMenuLabel>
        <TimezoneSelect />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const mainNav = [
  {
    title: "About",
    href: "/onboarding",
  },
];

const sideNav = (username?: string | null) => [
  {
    title: "Events",
    items: [
      {
        title: "My Events",
        href: `/${username!}/events`,
        signedInOnly: true,
      },
      {
        title: "Following",
        href: `/${username!}/following`,
        signedInOnly: true,
      },
      {
        title: "Discover",
        href: "/explore",
      },
      // { title: "All", href: "/events", signedInOnly: true },
      {
        title: "Add",
        href: "/new",
      },
    ],
  },
  {
    title: "Users",
    items: [
      {
        title: "Following",
        href: `${username!}/following/users`,
        signedInOnly: true,
      },
      // {
      //   title: "All",
      //   href: "/users",
      //   signedInOnly: true,
      // },
      {
        title: "Explore",
        href: "/users",
        signedOutOnly: true,
      },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="block lg:hidden">
          <Menu className="size-6 text-interactive-1" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        size="xl"
        position="right"
        className="bg-interactive-3 pl-0 pt-2"
      >
        <MobileLink href="/" className="" onOpenChange={setOpen}>
          <Logo className="scale-75" variant="hidePreview" />
        </MobileLink>
        <ScrollArea className="h-full pl-6">
          <div className="pt-2">
            <TimezoneSelect />
          </div>
          <SignedIn>
            <Separator className="my-3" />
            <div className="flex items-center gap-2">
              {user?.imageUrl ? (
                <Image
                  alt={"User"}
                  src={user?.imageUrl}
                  width={32}
                  height={32}
                  className="size-8 rounded-full"
                />
              ) : (
                <div className="size-8 rounded-full bg-gray-100"></div>
              )}
              <div className="text-lg font-medium text-neutral-2">
                @{user?.username}
              </div>
            </div>
            <div className="pt-3">
              <MobileButton
                href="/profile"
                onOpenChange={setOpen}
                onClick={() => openUserProfile()}
                className="w-full justify-start py-0 pl-0"
              >
                Profile
              </MobileButton>
            </div>
          </SignedIn>
          <Separator className="my-3" />
          <div className="flex flex-col space-y-3">
            {mainNav?.map(
              (item) =>
                item.href && (
                  <MobileLink
                    key={item.href}
                    href={item.href}
                    onOpenChange={setOpen}
                  >
                    {item.title}
                  </MobileLink>
                )
            )}
          </div>
          <div className="flex flex-col space-y-2">
            {sideNav(user?.username).map((item, index) => (
              <div key={index} className="flex flex-col space-y-3 pt-6">
                <div className="text-lg font-medium text-neutral-2">
                  {item.title}
                </div>
                {item?.items?.length &&
                  item.items.map((item) => (
                    <React.Fragment key={item.href}>
                      {item.href ? (
                        <MobileLink href={item.href} onOpenChange={setOpen}>
                          {item.title}
                        </MobileLink>
                      ) : (
                        item.title
                      )}
                    </React.Fragment>
                  ))}
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <SignedOut>
            <SignInButton
              afterSignUpUrl={`${process.env.NEXT_PUBLIC_URL}/get-started`}
            >
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Log In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setOpen(false);
                return signOut().then(() => {
                  toast("Logged out");
                });
              }}
            >
              Log Out
            </Button>
          </SignedIn>
          <div className="pb-16"></div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

type MobileLinkProps = {
  href: string;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  signedInOnly?: boolean;
  signedOutOnly?: boolean;
};

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  signedInOnly,
  signedOutOnly,
  ...props
}: MobileLinkProps) {
  if (signedOutOnly) {
    return (
      <SignedOut>
        <Link
          href={href}
          onClick={() => {
            onOpenChange?.(false);
          }}
          className={cn(
            className,
            "text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          )}
          {...props}
        >
          {children}
        </Link>
      </SignedOut>
    );
  }
  if (signedInOnly) {
    return (
      <SignedIn>
        <Link
          href={href}
          onClick={() => {
            onOpenChange?.(false);
          }}
          className={cn(
            className,
            "text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          )}
          {...props}
        >
          {children}
        </Link>
      </SignedIn>
    );
  }
  return (
    <Link
      href={href}
      onClick={() => {
        onOpenChange?.(false);
      }}
      className={cn(
        className,
        "text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

function MobileButton({
  onOpenChange,
  className,
  children,
  onClick,
  ...props
}: MobileLinkProps & { onClick: () => void }) {
  return (
    <Button
      onClick={() => {
        onClick();
        onOpenChange?.(false);
      }}
      variant={"ghost"}
      className={cn(className, "text-lg font-medium text-neutral-1")}
      {...props}
    >
      {children}
    </Button>
  );
}
