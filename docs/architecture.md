# Architecture

Dependency direction (no cycles):

types <- policy <- url <- (links, html, markdown) <- pipeline <- stream <- index

audit, actions, defang sit on the side. csp depends only on policy.

Rules:
1. One job per file.
2. Orchestrators (evaluate-url, sanitize-*, stream-sanitizer, generate-csp) contain no logic.
3. Data files contain no logic.
