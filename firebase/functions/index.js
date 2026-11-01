/**
 * Firebase Cloud Functions for SufiSnapShare
 * Handles Firestore triggers for photo uploads and sends automated Telegram notifications.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Read Telegram Bot secrets from Firebase environment configuration
// Set via: firebase functions:config:set telegram.bot_token="8791640895:AAEgYDc4ZlEsAqUdE5vqKohYq0rnj4-BHqU" telegram.chat_id="8851455020"
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || functions.config().telegram?.bot_token || '8791640895:AAEgYDc4ZlEsAqUdE5vqKohYq0rnj4-BHqU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || functions.config().telegram?.chat_id || '8851455020';

/**
 * Triggered automatically whenever a new photo document is created in Firestore 'photos/{photoId}'
 */
exports.onPhotoCreated = functions.firestore
  .document('photos/{photoId}')
  .onCreate(async (snap, context) => {
    const photoData = snap.data();
    const photoId = context.params.photoId;

    if (!photoData || photoData.telegramSent) {
      console.log(`Skipping photo ${photoId} (already sent or missing data)`);
      return null;
    }

    const imageUrl = photoData.imageUrl;
    const appUrl = process.env.APP_URL || 'https://online-image-sharing.com';
    const shortLink = `${appUrl}/s/${photoId}`;
    const timestamp = photoData.createdAt || new Date().toISOString();

    try {
      // 1. Send the original photo to Telegram
      const photoPayload = {
        chat_id: TELEGRAM_CHAT_ID,
        photo: imageUrl,
        caption: `📸 SufiSnapShare Upload\n🆔 Photo ID: ${photoId}\n⏱ Uploaded: ${timestamp}`
      };

      const photoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photoPayload)
      });
      const photoResult = await photoRes.json();

      if (!photoRes.ok || !photoResult.ok) {
        throw new Error(photoResult.description || `Telegram sendPhoto failed with status ${photoRes.status}`);
      }

      // 2. Send separate text message containing the short share link
      const textMsg = `📸 New SufiSnapShare Photo\n\n🆔 Photo ID: ${photoId}\n\n🔗 Short Link:\n${shortLink}\n\nUpload successful!`;
      
      const msgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: textMsg,
          disable_web_page_preview: false
        })
      });
      const msgResult = await msgRes.json();

      // Mark as sent in Firestore to prevent duplicate notifications
      await snap.ref.update({
        telegramSent: true,
        telegramTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        telegramMessageId: msgResult.result?.message_id || null
      });

      console.log(`Successfully sent Telegram notifications for photo ${photoId}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to notify Telegram for photo ${photoId}:`, error);
      await snap.ref.update({
        telegramSent: false,
        telegramError: error.message || 'Notification error'
      });
      return { success: false, error: error.message };
    }
  });
