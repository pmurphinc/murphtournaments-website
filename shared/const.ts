export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * How many people one TCR staff invite link may admit. Shared so the picker
 * in the Control Room and the server's validation cannot drift apart.
 *
 * No unlimited option on purpose: accepting makes someone a collaborator on
 * the board, so a link that never fills up is a standing invitation to
 * whoever it gets forwarded to.
 */
export const STAFF_INVITE_SEAT_OPTIONS = [1, 5, 10, 25] as const;
