import * as crypto from 'crypto';

/**
 * Validates eBay's challenge code by hashing it with the verification token and endpoint URL
 * This is required for the initial endpoint verification handshake with eBay
 */
export function validateChallenge(
  challengeCode: string,
  verificationToken: string,
  endpointUrl: string
): string {
  // Hash the challenge code, verification token, and endpoint URL in that exact order
  const hash = crypto
    .createHash('sha256')
    .update(challengeCode + verificationToken + endpointUrl)
    .digest('hex');

  return hash;
}

/**
 * Processes an account deletion notification from eBay
 * Logs the notification data for compliance and auditing
 */
export function handleAccountDeletionNotification(
  notificationData: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();

  console.log(
    `[${timestamp}] eBay Account Deletion Notification Received:`,
    JSON.stringify(notificationData, null, 2)
  );

  // Extract key fields if present
  const userId = (notificationData as any)?.userId;
  const accountClosureReason = (notificationData as any)?.accountClosureReason;

  if (userId) {
    console.log(`[${timestamp}] Account Deletion - User ID: ${userId}`);
  }
  if (accountClosureReason) {
    console.log(`[${timestamp}] Closure Reason: ${accountClosureReason}`);
  }
}

/**
 * Generates a random verification token
 * Must be 32-80 characters of alphanumeric, underscore, or hyphen
 */
export function generateVerificationToken(): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
}
