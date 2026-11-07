// Step 8: reject credentials, IP hosts, and trailing-dot hosts.
import { pass, reject, type StepResult } from "../step-result";
import type { ParsedUrl } from "../url-state";

const IPV4 = /^[0-9]{1,3}(?:\.[0-9]{1,3}){3}$/;

export function checkAuthority(parsed: ParsedUrl): StepResult<void> {
  const { username, password, hostname } = parsed.url;
  if (username !== "" || password !== "") return reject("credentials_present");
  if (hostname.startsWith("[") || IPV4.test(hostname)) return reject("ip_host", hostname);
  if (hostname.endsWith(".")) return reject("trailing_dot_host", hostname);
  return pass(undefined);
}
