/**
 * Email Notification Cloud Functions for Belay App
 *
 * These functions trigger on Firestore document changes and send
 * email notifications to users for:
 * - New messages
 * - Connection requests
 * - Connection accepted
 */

import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
  FirestoreEvent,
  QueryDocumentSnapshot,
  Change,
} from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for all functions
// Force redeploy: 2026-01-20
setGlobalOptions({maxInstances: 10});

// Firestore reference
const db = admin.firestore();

// Email configuration from environment variables
// Using Gmail SMTP with a dedicated app account
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "";

/**
 * Create nodemailer transporter
 */
function createTransporter(): nodemailer.Transporter | null {
  if (!SMTP_USER || !SMTP_PASS) {
    logger.warn("SMTP credentials not set. Skipping email send.");
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Get user email from Firebase Auth
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const user = await admin.auth().getUser(userId);
    return user.email || null;
  } catch (error) {
    logger.error(`Error getting user email for ${userId}:`, error);
    return null;
  }
}

interface UserProfile {
  displayName: string;
  emailNotifications?: boolean;
  emailNotificationTypes?: string[];
}

/**
 * Get user profile from Firestore
 */
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const profileDoc = await db.collection("profiles").doc(userId).get();
    if (profileDoc.exists) {
      const data = profileDoc.data();
      return {
        displayName: data?.displayName || "A climber",
        emailNotifications: data?.emailNotifications ?? true,
        emailNotificationTypes: data?.emailNotificationTypes ||
          ["messages", "connections", "reminders"],
      };
    }
    return null;
  } catch (error) {
    logger.error(`Error getting profile for ${userId}:`, error);
    return null;
  }
}

/**
 * Check if user wants notifications for a specific type
 */
function wantsNotificationType(profile: UserProfile, type: string): boolean {
  if (!profile.emailNotifications) return false;
  if (!profile.emailNotificationTypes) return true;
  return profile.emailNotificationTypes.includes(type);
}

/**
 * Send email notification using Gmail SMTP
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  replyTo?: string
): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    return false;
  }

  try {
    const mailOptions: nodemailer.SendMailOptions = {
      from: FROM_EMAIL,
      to,
      subject,
      html: htmlContent,
    };

    if (replyTo) mailOptions.replyTo = replyTo;

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, error);
    return false;
  }
}

/**
 * Email template for new message notification
 */
function newMessageEmailTemplate(
  senderName: string,
  messagePreview: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .message-box {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #6366f1;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
        .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧗 Belay</h1>
          <p>New Message</p>
        </div>
        <div class="content">
          <h2>Hey there!</h2>
          <p>You have a new message from <strong>${senderName}</strong>:</p>
          <div class="message-box">
            <p>${messagePreview}</p>
          </div>
          <a href="https://belay-91a94.web.app" class="button">Open Belay</a>
        </div>
        <div class="footer">
          <p>You're receiving this because you have email notifications enabled.</p>
          <p>To unsubscribe, update your notification preferences in the app.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Email template for new connection request
 */
function connectionRequestEmailTemplate(requesterName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          background: #06b6d4;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
        .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧗 Belay</h1>
          <p>New Connection Request</p>
        </div>
        <div class="content">
          <h2>Someone wants to climb with you!</h2>
          <div class="highlight">
            <p style="font-size: 18px;">
              <strong>${requesterName}</strong> wants to connect with you.
            </p>
            <p>Check out their profile and decide if you want to climb together!</p>
          </div>
          <a href="https://belay-91a94.web.app" class="button">View Request</a>
        </div>
        <div class="footer">
          <p>You're receiving this because you have email notifications enabled.</p>
          <p>To unsubscribe, update your notification preferences in the app.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Email template for connection accepted
 */
function connectionAcceptedEmailTemplate(accepterName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          background: #22c55e;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
        .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧗 Belay</h1>
          <p>Connection Accepted! 🎉</p>
        </div>
        <div class="content">
          <h2>Great news!</h2>
          <div class="highlight">
            <p style="font-size: 18px;">
              <strong>${accepterName}</strong> accepted your connection request!
            </p>
            <p>You can now message each other and plan your climbing sessions.</p>
          </div>
          <a href="https://belay-91a94.web.app" class="button">Start Chatting</a>
        </div>
        <div class="footer">
          <p>You're receiving this because you have email notifications enabled.</p>
          <p>To unsubscribe, update your notification preferences in the app.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Type for message data
interface MessageData {
  senderId: string;
  text?: string;
}

// Type for match data
interface MatchData {
  userId: string;
  matchedUserId: string;
  status: string;
}

/**
 * Trigger: New message created in a conversation
 */
export const onNewMessage = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, {
    conversationId: string;
    messageId: string;
  }>) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("No data in message snapshot");
      return;
    }

    const messageData = snapshot.data() as MessageData;
    const {senderId, text} = messageData;
    const conversationId = event.params.conversationId;

    logger.info(`New message in conversation ${conversationId} from ${senderId}`);

    // Get conversation to find recipient
    const conversationDoc = await db
      .collection("conversations")
      .doc(conversationId)
      .get();

    if (!conversationDoc.exists) {
      logger.warn(`Conversation ${conversationId} not found`);
      return;
    }

    const conversationData = conversationDoc.data();
    const participantIds: string[] = conversationData?.participantIds || [];

    // Find recipient (not the sender)
    const recipientId = participantIds.find((id) => id !== senderId);
    if (!recipientId) {
      logger.warn("Could not find recipient");
      return;
    }

    // Check if recipient has email notifications enabled for messages
    const recipientProfile = await getUserProfile(recipientId);
    if (!recipientProfile || !wantsNotificationType(recipientProfile, "messages")) {
      logger.info(`User ${recipientId} has message notifications disabled`);
      return;
    }

    // Get recipient email
    const recipientEmail = await getUserEmail(recipientId);
    if (!recipientEmail) {
      logger.warn(`No email found for user ${recipientId}`);
      return;
    }

    // Get sender name and email
    const senderProfile = await getUserProfile(senderId);
    const senderName = senderProfile?.displayName || "A climber";
    const senderEmail = await getUserEmail(senderId);

    // Send email (set reply-to to the sender so replies go to them)
    const messagePreview = text?.substring(0, 200) || "Sent you a message";
    await sendEmail(
      recipientEmail,
      `New message from ${senderName}`,
      newMessageEmailTemplate(senderName, messagePreview),
      senderEmail || undefined
    );
  }
);

/**
 * Trigger: New match/connection request created
 */
export const onNewConnectionRequest = onDocumentCreated(
  "matches/{matchId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, {
    matchId: string;
  }>) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("No data in match snapshot");
      return;
    }

    const matchData = snapshot.data() as MatchData;
    const {userId, matchedUserId, status} = matchData;

    // Only send notification for pending requests
    if (status !== "pending") {
      return;
    }

    logger.info(`New connection request from ${userId} to ${matchedUserId}`);

    // Check if recipient has connection notifications enabled
    const recipientProfile = await getUserProfile(matchedUserId);
    if (!recipientProfile || !wantsNotificationType(recipientProfile, "connections")) {
      logger.info(`User ${matchedUserId} has connection notifications disabled`);
      return;
    }

    // Get recipient email
    const recipientEmail = await getUserEmail(matchedUserId);
    if (!recipientEmail) {
      logger.warn(`No email found for user ${matchedUserId}`);
      return;
    }

    // Get requester name and email
    const requesterProfile = await getUserProfile(userId);
    const requesterName = requesterProfile?.displayName || "A climber";
    const requesterEmail = await getUserEmail(userId);

    // Send email (reply-to set to requester)
    await sendEmail(
      recipientEmail,
      `${requesterName} wants to connect with you on Belay`,
      connectionRequestEmailTemplate(requesterName),
      requesterEmail || undefined
    );
  }
);

/**
 * Trigger: Match status updated to accepted
 */
export const onConnectionAccepted = onDocumentUpdated(
  "matches/{matchId}",
  async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, {
    matchId: string;
  }>) => {
    if (!event.data) {
      return;
    }

    const beforeData = event.data.before.data() as MatchData;
    const afterData = event.data.after.data() as MatchData;

    // Check if status changed to accepted
    if (beforeData.status !== "accepted" && afterData.status === "accepted") {
      const {userId, matchedUserId} = afterData;

      logger.info(`Connection accepted: ${userId} <-> ${matchedUserId}`);

      // The userId is the original requester, notify them
      const requesterProfile = await getUserProfile(userId);
      if (!requesterProfile || !wantsNotificationType(requesterProfile, "connections")) {
        logger.info(`User ${userId} has connection notifications disabled`);
        return;
      }

      const requesterEmail = await getUserEmail(userId);
      if (!requesterEmail) {
        logger.warn(`No email found for user ${userId}`);
        return;
      }

      // Get accepter name and email
      const accepterProfile = await getUserProfile(matchedUserId);
      const accepterName = accepterProfile?.displayName || "A climber";
      const accepterEmail = await getUserEmail(matchedUserId);

      // Send email (reply-to set to accepter)
      await sendEmail(
        requesterEmail,
        `${accepterName} accepted your connection request!`,
        connectionAcceptedEmailTemplate(accepterName),
        accepterEmail || undefined
      );
    }
  }
);

/**
 * Helper: increment/decrement public stats on the user's profile
 */
async function incrementPublicStats(userId: string, fields: Record<string, any>) {
  try {
    const profileRef = db.collection("profiles").doc(userId);
    // Build update payload using FieldValue.increment when numeric deltas are provided
    const updatePayload: Record<string, any> = {};
    for (const key of Object.keys(fields)) {
      const value = fields[key];
      if (typeof value === "number") {
        updatePayload[`publicStats.${key}`] = admin.firestore.FieldValue.increment(value as number);
      } else {
        updatePayload[`publicStats.${key}`] = value;
      }
    }

    await profileRef.set(updatePayload, { merge: true });
  } catch (err) {
    logger.error("Error incrementing public stats for", userId, err);
  }
}

/**
 * Helper: set highest numeric V grade if higher than existing
 */
async function setHighestVGradeIfHigher(userId: string, newGrade: number) {
  try {
    const profileRef = db.collection("profiles").doc(userId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(profileRef);
      const current = doc.data()?.publicStats?.highestVGrade || 0;
      if (newGrade > current) {
        tx.update(profileRef, { "publicStats.highestVGrade": newGrade });
      }
    });
  } catch (err) {
    logger.error("Error setting highest V grade for", userId, err);
  }
}

/**
 * Sessions aggregation: create
 */
export const onSessionCreatedAgg = onDocumentCreated(
  "sessions/{sessionId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { sessionId: string }>) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const userId = data?.userId;
    const duration = data?.duration || 0;
    const hours = (duration || 0) / 60;
    if (!userId) return;
    await incrementPublicStats(userId, { totalSessions: 1, totalHoursClimbed: hours });
  }
);

/**
 * Sessions aggregation: update
 */
export const onSessionUpdatedAgg = onDocumentUpdated(
  "sessions/{sessionId}",
  async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { sessionId: string }>) => {
    if (!event.data) return;
    const before = event.data.before?.data();
    const after = event.data.after?.data();
    if (!before || !after) return;

    const beforeUser = before.userId;
    const afterUser = after.userId;
    const beforeHours = (before.duration || 0) / 60;
    const afterHours = (after.duration || 0) / 60;

    // If user changed, decrement old and increment new
    if (beforeUser && afterUser && beforeUser !== afterUser) {
      await incrementPublicStats(beforeUser, { totalSessions: -1, totalHoursClimbed: -beforeHours });
      await incrementPublicStats(afterUser, { totalSessions: 1, totalHoursClimbed: afterHours });
      return;
    }

    // Same user: adjust hours by delta
    if (afterUser) {
      const deltaHours = afterHours - beforeHours;
      if (Math.abs(deltaHours) > 0) {
        await incrementPublicStats(afterUser, { totalHoursClimbed: deltaHours });
      }
    }
  }
);

/**
 * Sessions aggregation: delete
 */
export const onSessionDeletedAgg = onDocumentDeleted(
  "sessions/{sessionId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { sessionId: string }>) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const userId = data?.userId;
    const duration = data?.duration || 0;
    const hours = duration / 60;
    if (!userId) return;
    await incrementPublicStats(userId, { totalSessions: -1, totalHoursClimbed: -hours });
  }
);

/**
 * Matches aggregation: handle accepted connections count for both users
 */
export const onMatchCreatedAgg = onDocumentCreated(
  "matches/{matchId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { matchId: string }>) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const { userId, matchedUserId, status } = data || {};
    if (status === "accepted") {
      if (userId) await incrementPublicStats(userId, { totalConnections: 1 });
      if (matchedUserId) await incrementPublicStats(matchedUserId, { totalConnections: 1 });
    }
  }
);

export const onMatchUpdatedAgg = onDocumentUpdated(
  "matches/{matchId}",
  async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { matchId: string }>) => {
    if (!event.data) return;
    const before = event.data.before?.data();
    const after = event.data.after?.data();
    if (!before || !after) return;

    const beforeAccepted = before.status === "accepted";
    const afterAccepted = after.status === "accepted";
    const userId = after.userId;
    const matchedUserId = after.matchedUserId;

    if (!beforeAccepted && afterAccepted) {
      if (userId) await incrementPublicStats(userId, { totalConnections: 1 });
      if (matchedUserId) await incrementPublicStats(matchedUserId, { totalConnections: 1 });
    } else if (beforeAccepted && !afterAccepted) {
      if (userId) await incrementPublicStats(userId, { totalConnections: -1 });
      if (matchedUserId) await incrementPublicStats(matchedUserId, { totalConnections: -1 });
    }
  }
);

export const onMatchDeletedAgg = onDocumentDeleted(
  "matches/{matchId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { matchId: string }>) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const { userId, matchedUserId, status } = data || {};
    if (status === "accepted") {
      if (userId) await incrementPublicStats(userId, { totalConnections: -1 });
      if (matchedUserId) await incrementPublicStats(matchedUserId, { totalConnections: -1 });
    }
  }
);

/**
 * Messages aggregation: increment sender's message count
 */
// Enhance existing onNewMessage by incrementing the sender's publicStats.totalMessagesSent
// Note: this runs alongside the email notification logic above
// (we intentionally don't export a second onNewMessage handler to avoid conflicts)
// Instead add an additional exported trigger bound to the same path.
export const onNewMessageAgg = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { conversationId: string; messageId: string }>) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as Record<string, unknown>;
    const senderId = data?.senderId as string | undefined;
    if (!senderId) return;
    await incrementPublicStats(senderId, { totalMessagesSent: 1 });
  }
);

/**
 * Profile write: update derived public stats (createdAt, highest grades, years)
 * 
 * IMPORTANT: This function only runs when relevant profile fields change,
 * NOT when publicStats changes. This prevents infinite loops.
 */
export const onProfileWriteAgg = onDocumentUpdated(
  "profiles/{userId}",
  async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { userId: string }>) => {
    if (!event.data) return;
    const before = event.data.before?.data();
    const after = event.data.after?.data();
    if (!after) return;
    const userId = event.params.userId;

    // CRITICAL: Check if only publicStats changed - if so, skip to prevent infinite loop
    const beforeWithoutStats = { ...before };
    const afterWithoutStats = { ...after };
    delete beforeWithoutStats?.publicStats;
    delete afterWithoutStats?.publicStats;
    
    // If no relevant fields changed (only publicStats), skip
    const relevantFieldsChanged = 
      before?.createdAt !== after.createdAt ||
      before?.yearsClimbing !== after.yearsClimbing ||
      before?.highestGradeBouldering !== after.highestGradeBouldering ||
      before?.highestGradeYDS !== after.highestGradeYDS;
    
    if (!relevantFieldsChanged) {
      logger.info(`Skipping onProfileWriteAgg for ${userId} - no relevant fields changed`);
      return;
    }

    logger.info(`Processing profile update for ${userId}`);

    // createdAt -> store if present and changed
    if (after.createdAt && before?.createdAt !== after.createdAt) {
      await incrementPublicStats(userId, { createdAt: after.createdAt });
    }

    // yearsClimbing - only if changed
    if (after.yearsClimbing !== undefined && before?.yearsClimbing !== after.yearsClimbing) {
      await incrementPublicStats(userId, { yearsClimbing: after.yearsClimbing });
    }

    // highestGradeBouldering - only if changed
    if (after.highestGradeBouldering && before?.highestGradeBouldering !== after.highestGradeBouldering) {
      const vGradeStr = after.highestGradeBouldering;
      if (typeof vGradeStr === "string" && vGradeStr.startsWith("V") && vGradeStr !== "VB") {
        const num = parseInt(vGradeStr.substring(1)) || 0;
        if (num > 0) await setHighestVGradeIfHigher(userId, num);
      }
    }

    // highestGradeYDS - only if changed
    if (after.highestGradeYDS && before?.highestGradeYDS !== after.highestGradeYDS) {
      await incrementPublicStats(userId, { highestYDSGrade: after.highestGradeYDS });
    }
  }
);

/**
 * One-time backfill HTTP function to populate publicStats for all profiles.
 * Call via: https://<region>-<project>.cloudfunctions.net/backfillPublicStats
 * or: firebase functions:call backfillPublicStats
 */
export const backfillPublicStats = onRequest(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (req, res) => {
    logger.info("Starting backfillPublicStats...");

    const profilesSnap = await db.collection("profiles").get();
    let updated = 0;
    let skipped = 0;

    for (const profileDoc of profilesSnap.docs) {
      const userId = profileDoc.id;
      const profileData = profileDoc.data();

      // Skip if publicStats already present
      if (profileData.publicStats) {
        skipped++;
        continue;
      }

      // Compute stats from sessions
      const sessionsSnap = await db
        .collection("sessions")
        .where("userId", "==", userId)
        .get();
      let totalHoursClimbed = 0;
      const totalSessions = sessionsSnap.size;
      sessionsSnap.forEach((s) => {
        totalHoursClimbed += ((s.data().duration as number) || 0) / 60;
      });

      // Compute connections (accepted matches where user is either side)
      const matchesSnap1 = await db
        .collection("matches")
        .where("userId", "==", visibleUserId(userId))
        .where("status", "==", "accepted")
        .get();
      const matchesSnap2 = await db
        .collection("matches")
        .where("matchedUserId", "==", visibleUserId(userId))
        .where("status", "==", "accepted")
        .get();
      const totalConnections = matchesSnap1.size + matchesSnap2.size;

      // Messages sent
      const statsDoc = await db
        .collection("profiles")
        .doc(userId)
        .collection("stats")
        .doc("messaging")
        .get();
      const totalMessagesSent = (statsDoc.data()?.messagesSent as number) || 0;

      // Derived from profile
      const createdAt = profileData.createdAt || null;
      const yearsClimbing = profileData.yearsClimbing || 0;
      const highestYDSGrade = profileData.highestGradeYDS || "";

      let highestVGrade = 0;
      const vGradeStr = profileData.highestGradeBouldering;
      if (
        typeof vGradeStr === "string" &&
        vGradeStr.startsWith("V") &&
        vGradeStr !== "VB"
      ) {
        highestVGrade = parseInt(vGradeStr.substring(1)) || 0;
      }

      await db
        .collection("profiles")
        .doc(userId)
        .set(
          {
            publicStats: {
              totalHoursClimbed: Math.round(totalHoursClimbed * 10) / 10,
              totalSessions,
              totalConnections,
              totalMessagesSent,
              highestVGrade,
              highestYDSGrade,
              yearsClimbing,
              createdAt,
            },
          },
          { merge: true }
        );

      updated++;
      logger.info(`Backfilled publicStats for ${userId}`);
    }

    const msg = `Backfill complete. Updated: ${updated}, Skipped (already had publicStats): ${skipped}`;
    logger.info(msg);
    res.status(200).send(msg);
  }
);

// Helper to return userId (no-op, but keeps query type correct)
function visibleUserId(uid: string): string {
  return uid;
}

