"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useClerk,
  useUser,
} from "@clerk/nextjs";
import { CalendarHeart, CalendarPlus, Globe2Icon, Menu } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@soonlist/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@soonlist/ui/navigation-menu";
import { ScrollArea } from "@soonlist/ui/scroll-area";
import { Separator } from "@soonlist/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@soonlist/ui/sheet";

import { cn } from "~/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./DropdownMenu";
import { Logo } from "./Logo";
import { TimezoneSelect } from "./TimezoneSelect";
import { UserProfileFlair } from "./UserProfileFlair";

const excludedMenuRoutes = ["/install"];

export function Header() {
  const { user } = useUser();
  const pathname = usePathname();
  const hideMenu = excludedMenuRoutes.includes(pathname);

  if (hideMenu) {
    return (
      <div className="sticky top-0 z-50 bg-interactive-3">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between pb-4 pl-2 pt-3 sm:px-4 sm:pb-7 sm:pt-5">
          <div className="flex items-center sm:grow sm:gap-0">
            <NavigationMenu>
              <Link href="/" className="relative flex items-center">
                <Logo variant="hidePreview" className="block sm:hidden" />
                <Logo variant="hidePreview" className="hidden sm:block" />
              </Link>
            </NavigationMenu>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 bg-interactive-3">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between pb-4 pl-2 pt-3 sm:px-4 sm:pb-7 sm:pt-5">
        <div className="flex items-center sm:grow sm:gap-0">
          <NavigationMenu>
            <SignedIn>
              <Link
                href={`/${user?.username}/upcoming`}
                className="relative flex items-center"
              >
                <Logo variant="hidePreview" className="block sm:hidden" />
                <Logo variant="hidePreview" className="hidden sm:block" />
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/" className="relative flex items-center">
                <Logo variant="hidePreview" className="block sm:hidden" />
                <Logo variant="hidePreview" className="hidden sm:block" />
              </Link>
            </SignedOut>
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
  const pathname = usePathname();
  const isJoinPage = pathname === "/join";

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex gap-3">
        <SignedIn>
          <NavigationMenuItem className="hidden lg:block">
            <Link href={`/${user?.username}/upcoming`} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                <CalendarHeart className="mr-2 size-4" />
                My Feed
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </SignedIn>
        <SignedIn>
          <NavigationMenuItem className="hidden lg:block">
            <Link href={`/explore`} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                <Globe2Icon className="mr-2 size-4" />
                Discover
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </SignedIn>
        <SignedOut>
          <NavigationMenuItem className="hidden lg:block">
            <Link href="/sign-in" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Log in
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </SignedOut>
        <NavigationMenuItem>
          <SignedIn>
            <Link href="/new" legacyBehavior passHref scroll={false}>
              <NavigationMenuLink
                className={buttonVariants({ variant: "default" })}
              >
                <CalendarPlus className="mr-2 size-4"></CalendarPlus>
                Add<span className="inline">&nbsp;event</span>
              </NavigationMenuLink>
            </Link>
          </SignedIn>
          <SignedOut>
            {!isJoinPage && (
              <Button asChild>
                <Link href="https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216">
                  Get the app
                </Link>
              </Button>
            )}
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
          href={href || "#"}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className,
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
  const { isLoaded, user } = useUser();
  const { signOut, openUserProfile } = useClerk();

  if (!isLoaded || !user?.id) {
    return (
      <div className="size-8 animate-pulse rounded-full bg-gray-100 p-1"></div>
    );
  }

  const plan = user.publicMetadata.plan as
    | { name?: string; status?: string }
    | undefined;
  const planName = plan?.name;
  const planStatus = plan?.status;
  const active = planStatus === "active" || planStatus === "trialing";
  const paid = planName !== "free";
  const activePaid = active && paid;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="hidden py-2 lg:block">
        <UserProfileFlair username={user.username ?? ""}>
          <Image
            alt={"User"}
            src={user.imageUrl}
            width={36}
            height={36}
            className="size-9 rounded-full border border-gray-200 object-cover object-center drop-shadow-sm"
          />
        </UserProfileFlair>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-1">
        <TimezoneSelect />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => openUserProfile()}
        >
          <UserProfileFlair username={user.username ?? ""}>
            <Image
              alt={"User"}
              src={user.imageUrl}
              width={32}
              height={32}
              className="size-8 rounded-full object-cover object-center"
            />
          </UserProfileFlair>
          <div className="text-lg font-medium text-neutral-2">
            @{user.username}
          </div>
        </DropdownMenuItem>
        <div className="ml-2 flex flex-col space-y-3 text-neutral-2">
          {activePaid && (
            <MobileLink href={"/account/plans"}>Manage Plan</MobileLink>
          )}
          {!activePaid && (
            <MobileLink
              href={"https://apps.apple.com/us/app/soonlist/id6670222216"}
              target="_blank"
            >
              Download iOS app
            </MobileLink>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="p-1"></div>
        {sideNav().map((item, index) => (
          <div
            key={`user-nav-${index}`}
            className="ml-2 flex flex-col space-y-3"
          >
            {item.items.length &&
              item.items.map((item) => (
                <React.Fragment key={`user-nav-${index}-${item.href}`}>
                  {item.href ? (
                    <MobileLink href={item.href}>{item.title}</MobileLink>
                  ) : (
                    item.title
                  )}
                </React.Fragment>
              ))}
          </div>
        ))}
        <div className="p-1"></div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const sideNav = () => [
  {
    items: [
      {
        title: "About",
        href: `/about`,
        signedInOnly: false,
      },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();

  const plan = user?.publicMetadata.plan as { name?: string } | undefined;
  const planName = plan?.name;

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
          <div className="px-1 pt-2">
            <TimezoneSelect />
          </div>
          <SignedIn>
            <Separator className="my-3" />
            <button
              className="flex items-center gap-2"
              onClick={() => openUserProfile()}
            >
              {user?.imageUrl ? (
                <UserProfileFlair username={user.username ?? ""}>
                  <Image
                    alt={"User"}
                    src={user.imageUrl}
                    width={32}
                    height={32}
                    className="size-8 rounded-full object-cover object-center"
                  />
                </UserProfileFlair>
              ) : (
                <div className="size-8 rounded-full bg-gray-100"></div>
              )}
              <div className="text-lg font-medium text-neutral-2">
                @{user?.username}
              </div>
            </button>
            <div className="pt-3">
              {planName ? (
                <MobileLink
                  key={"user-nav-plans"}
                  href="/account/plans"
                  onOpenChange={setOpen}
                  className="w-full justify-start py-0 pl-0 text-neutral-2"
                >
                  Founding Member
                </MobileLink>
              ) : (
                <MobileLink
                  key={"user-nav-upgrade"}
                  href="https://apps.apple.com/us/app/soonlist/id6670222216"
                  onOpenChange={setOpen}
                  className="w-full justify-start py-0 pl-0 text-neutral-2"
                  target="_blank"
                >
                  Download iOS app
                </MobileLink>
              )}
            </div>
          </SignedIn>
          <Separator className="my-3" />
          <div className="flex flex-col space-y-3">
            <MobileLink
              key="user-nav-my-feed"
              href={`/${user?.username}/upcoming`}
              onOpenChange={setOpen}
              signedInOnly
              className="flex items-center gap-2 text-interactive-1"
            >
              <CalendarHeart className="size-4" />
              My Feed
            </MobileLink>
            <MobileLink
              key={"user-nav-explore"}
              href={"/explore"}
              onOpenChange={setOpen}
              signedInOnly
              className="flex items-center gap-2 text-interactive-1"
            >
              <Globe2Icon className="size-4" />
              Discover
            </MobileLink>
          </div>
          <SignedIn>
            <div className="p-1.5"></div>
            <div className="flex flex-col space-y-2">
              {sideNav().map((item, index) => (
                <div key={index} className="flex flex-col space-y-3">
                  {item.items.length &&
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
          </SignedIn>
          <SignedOut>
            {/* <Separator className="my-3" /> */}
            {/* <SignUpButton>
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Sign Up
              </Button>
            </SignUpButton>
            <div className="my-3"></div> */}
            <SignInButton>
              <Button
                variant={"secondary"}
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
            <Separator className="my-3" />
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
              Log out
            </Button>
          </SignedIn>
          <div className="pb-16"></div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface MobileLinkProps {
  href: string;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  signedInOnly?: boolean;
  signedOutOnly?: boolean;
  target?: string;
}

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
            "text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
            "text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
        "text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

// function MobileButton({
//   onOpenChange,
//   className,
//   children,
//   onClick,
//   ...props
// }: MobileLinkProps & { onClick: () => void }) {
//   return (
//     <Button
//       onClick={() => {
//         onClick();
//         onOpenChange?.(false);
//       }}
//       variant={"ghost"}
//       className={cn(className, "text-lg font-medium text-neutral-1")}
//       {...props}
//     >
//       {children}
//     </Button>
//   );
// }
