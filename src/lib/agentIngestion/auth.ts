import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isAuthorizedBearerToken(
  authorizationHeader: string | null,
  expectedToken: string | undefined,
) {
  if (!expectedToken || !expectedToken.trim() || /\s/.test(expectedToken)) {
    return false;
  }

  const match = authorizationHeader?.match(/^Bearer ([^\s]+)$/);
  if (!match) return false;

  return timingSafeEqual(sha256(match[1]), sha256(expectedToken));
}
