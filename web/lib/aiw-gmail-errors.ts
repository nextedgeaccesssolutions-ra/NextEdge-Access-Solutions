/** Turn Google's error reason into an instruction an administrator can act on. */
export function explainGmailFailure(status: number, reason: string): { message: string; code: string } | null {
  const r = reason.toLowerCase();
  if (r === "accessnotconfigured" || r === "service_disabled" || r === "servicedisabled") {
    return { message: "The Gmail API is not enabled for the NEAS Google Cloud project. Enable \"Gmail API\" in Google Cloud Console (APIs & Services → Library) for the project that owns the OAuth client, wait a few minutes, then load the inbox again.", code: "gmail_api_disabled" };
  }
  if (r === "insufficientpermissions" || r === "access_token_scope_insufficient") {
    return { message: "Google says this mailbox did not grant the Gmail permission needed for this action. Reconnect the mailbox and tick every Gmail permission on the Google consent screen.", code: "gmail_scope_insufficient" };
  }
  if (r === "ratelimitexceeded" || r === "userratelimitexceeded" || r === "resource_exhausted" || status === 429) {
    return { message: "Google is rate-limiting this mailbox. Wait a minute and try again.", code: "gmail_rate_limited" };
  }
  if (r === "failedprecondition" || r === "failed_precondition") {
    return { message: "Gmail is not available for this Google account (the mailbox may be disabled or not a Gmail account).", code: "gmail_unavailable" };
  }
  if (r === "permission_denied" || r === "permissiondenied" || r === "forbidden") {
    return { message: "Google refused the Gmail request with PERMISSION_DENIED. This is almost always one of two things, and reconnecting the mailbox fixes neither: (1) the Gmail API is not enabled for the Google Cloud project that owns the OAuth client — enable it under APIs & Services → Library; or (2) the signed-in account is not an approved test user on the OAuth consent screen. Check both before reconnecting.", code: "gmail_permission_denied" };
  }
  if (status === 401) {
    return { message: "Google no longer accepts this mailbox's saved authorization. Reconnect it with Google.", code: "gmail_reauth_required" };
  }
  if (status === 403) {
    return { message: "Google refused this request (" + (reason || "403") + "). Check first that the Gmail API is enabled for the Google Cloud project that owns the OAuth client, and that this account is an approved test user on the OAuth consent screen. Only reconnect the mailbox if both are already correct.", code: "gmail_authorization_failed" };
  }
  return null;
}
