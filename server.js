const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS to allow your frontend to talk to this server
app.use(cors());
app.use(express.json());

console.log("==================================================");
console.log(`   MailBlast AI - Free Local Relay`);
console.log(`   Running on http://localhost:${PORT}`);
console.log("==================================================");

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Relay server is running' });
});

// Email Sending Endpoint
app.post('/api/send', async (req, res) => {
    // We expect { smtp, mail } directly in body
    const { smtp, mail } = req.body;

    if (!smtp || !mail) {
        console.log("[ERROR] Missing config data in request");
        return res.status(400).json({ success: false, error: "Missing configuration data" });
    }

    // 1. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
        host: smtp.host || "smtp.hostinger.com",
        port: smtp.port || 465,
        secure: (parseInt(smtp.port) === 465), // True for 465, false for 587
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // 2. Send the email
        const info = await transporter.sendMail({
            from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
            to: mail.to,
            subject: mail.subject,
            text: mail.text,
            html: mail.html // Optional HTML content
        });

        console.log(`[SUCCESS] Sent to: ${mail.to}`);
        res.json({ success: true, messageId: info.messageId });

    } catch (error) {
        console.error(`[ERROR] Failed to send to ${mail.to}:`, error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n>>> Relay Server ready! Waiting for requests from the app...`);
});