import Bowser from "bowser";

export function getUserAgent() {
  if (typeof window !== "undefined") {
    return Bowser.parse(window.navigator.userAgent);
  }
}
