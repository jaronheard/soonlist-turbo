// for iOS deeplink redirect to this unmatched page
// catched link: exposhareintentexample:///dataUrl=exposhareintentexampleShareKey

import LoadingSpinner from "~/components/LoadingSpinner";

export default function Unmatched() {
  // just show a loading spinner for now
  return <LoadingSpinner />;
}
