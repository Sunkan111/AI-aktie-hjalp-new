// api/notify.js
// Send notifications via SendGrid (email) and Web Push

import sgMail from '@sendgrid/mail';
import webpush from 'web-push';

// Initialize SendGrid if API key is available
let sendGridConfigured = false;
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sendGridConfigured = true;
} else {
  console.warn('⚠️  SendGrid API key not configured');
}

// Initialize Web Push if VAPID keys are available
let webPushConfigured = false;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  webPushConfigured = true;
} else {
  console.warn('⚠️  Web Push VAPID keys not configured');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { type, payload } = req.body || {};

  if (!type || !payload) {
    return res.status(400).json({ error: 'Type and payload are required' });
  }

  const results = {
    email: null,
    webPush: null
  };

  try {
    // Handle email notifications
    if (type === 'email' || type === 'all') {
      if (!sendGridConfigured) {
        results.email = { 
          success: false, 
          error: 'SendGrid not configured' 
        };
      } else {
        try {
          results.email = await sendEmail(payload);
        } catch (error) {
          results.email = { 
            success: false, 
            error: error.message 
          };
        }
      }
    }

    // Handle web push notifications
    if (type === 'webpush' || type === 'all') {
      if (!webPushConfigured) {
        results.webPush = { 
          success: false, 
          error: 'Web Push not configured' 
        };
      } else {
        try {
          results.webPush = await sendWebPush(payload);
        } catch (error) {
          results.webPush = { 
            success: false, 
            error: error.message 
          };
        }
      }
    }

    // Determine overall status
    const anySuccess = Object.values(results).some(r => r && r.success);
    const statusCode = anySuccess ? 200 : 500;

    return res.status(statusCode).json({
      success: anySuccess,
      results,
      configured: {
        sendGrid: sendGridConfigured,
        webPush: webPushConfigured
      }
    });

  } catch (error) {
    console.error('Error in notify endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to send notification',
      message: error.message 
    });
  }
}

async function sendEmail(payload) {
  const { to, subject, text, html } = payload;

  if (!to) {
    throw new Error('Email recipient (to) is required');
  }

  if (!subject) {
    throw new Error('Email subject is required');
  }

  if (!text && !html) {
    throw new Error('Email content (text or html) is required');
  }

  const msg = {
    to,
    from: payload.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
    subject,
    text: text || '',
    html: html || text || ''
  };

  try {
    const response = await sgMail.send(msg);
    return {
      success: true,
      statusCode: response[0].statusCode,
      messageId: response[0].headers['x-message-id']
    };
  } catch (error) {
    console.error('SendGrid error:', error);
    if (error.response) {
      throw new Error(`SendGrid API error: ${error.response.body.errors[0].message}`);
    }
    throw error;
  }
}

async function sendWebPush(payload) {
  const { subscription, notification } = payload;

  if (!subscription) {
    throw new Error('Push subscription is required');
  }

  if (!notification) {
    throw new Error('Notification content is required');
  }

  // Validate subscription format
  if (!subscription.endpoint || !subscription.keys) {
    throw new Error('Invalid subscription format. Must include endpoint and keys.');
  }

  try {
    const response = await webpush.sendNotification(
      subscription,
      JSON.stringify(notification)
    );

    return {
      success: true,
      statusCode: response.statusCode
    };
  } catch (error) {
    console.error('Web Push error:', error);
    if (error.statusCode === 410) {
      throw new Error('Push subscription has expired or is invalid');
    }
    throw new Error(`Web Push error: ${error.message}`);
  }
}
