// Data: hosts that must never be allowlisted as a whole (anyone can register a subdomain).
export const SHARED_HOSTING_SUFFIXES: readonly string[] = [
  "github.io",
  "githubusercontent.com",
  "herokuapp.com",
  "amazonaws.com",
  "cloudfront.net",
  "blob.core.windows.net",
  "azurewebsites.net",
  "appspot.com",
  "web.app",
  "firebaseapp.com",
  "pages.dev",
  "workers.dev",
  "netlify.app",
  "vercel.app",
  "gitlab.io",
  "glitch.me",
  "repl.co",
  "ngrok.io",
  "ngrok-free.app",
  "trycloudflare.com"
];
