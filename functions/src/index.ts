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
  FirestoreEvent,
  QueryDocumentSnapshot,
  Change,
} from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for all functions
setGlobalOptions({maxInstances: 10});

// Firestore reference
const db = admin.firestore();

// Email configuration from environment variables
// Set these in .env.local or via Firebase Console
function getEmailConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    from: process.env.FROM_EMAIL || "noreply@belay-app.com",
  };
}

/**
 * Create email transporter
 */
function createTransporter(): nodemailer.Transporter | null {
  const config = getEmailConfig();

  if (!config.host || !config.user || !config.pass) {
    logger.warn("Email configuration not set. Skipping email send.", {
      host: !!config.host,
      user: !!config.user,
      pass: !!config.pass,
    });
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
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
 * Send email notification
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    return false;
  }

  const config = getEmailConfig();

  try {
    await transporter.sendMail({
      from: `"Belay App" <${config.from}>`,
      to,
      subject,
      html: htmlContent,
    });
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

    // Get sender name
    const senderProfile = await getUserProfile(senderId);
    const senderName = senderProfile?.displayName || "A climber";

    // Send email
    const messagePreview = text?.substring(0, 200) || "Sent you a message";
    await sendEmail(
      recipientEmail,
      `New message from ${senderName}`,
      newMessageEmailTemplate(senderName, messagePreview)
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

    // Get requester name
    const requesterProfile = await getUserProfile(userId);
    const requesterName = requesterProfile?.displayName || "A climber";

    // Send email
    await sendEmail(
      recipientEmail,
      `${requesterName} wants to connect with you on Belay`,
      connectionRequestEmailTemplate(requesterName)
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

      // Get accepter name
      const accepterProfile = await getUserProfile(matchedUserId);
      const accepterName = accepterProfile?.displayName || "A climber";

      // Send email
      await sendEmail(
        requesterEmail,
        `${accepterName} accepted your connection request!`,
        connectionAcceptedEmailTemplate(accepterName)
      );
    }
  }
);

