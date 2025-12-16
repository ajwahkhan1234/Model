const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

// Cloud Function to Send Email via SMTP
// This function receives SMTP credentials and Email Content from the frontend
exports.sendEmail = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
         return res.status(405).send('Method Not Allowed');
      }

      // 1. Extract data from the request
      const { smtp, mail } = req.body.data || req.body;

      if (!smtp || !mail) {
        return res.status(400).json({ data: { success: false, error: "Missing smtp or mail config" } });
      }

      // 2. Create Transporter
      const transporter = nodemailer.createTransport({
        host: smtp.host || "smtp.hostinger.com",
        port: parseInt(smtp.port) || 465,
        secure: (parseInt(smtp.port) === 465), // true for 465, false for 587
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
        tls: {
            rejectUnauthorized: false // Helps with some shared hosting certificates
        }
      });

      // 3. Send Email
      const info = await transporter.sendMail({
        from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html, 
      });

      // 4. Return Success
      return res.status(200).json({ data: { success: true, messageId: info.messageId } });

    } catch (error) {
      console.error("SMTP Error:", error);
      return res.status(500).json({ 
        data: { 
          success: false, 
          error: error.message || "Internal Server Error" 
        } 
      });
    }
  });
});