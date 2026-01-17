const nodemailer = require("nodemailer");
const logger = require("../config/logger");
const AuditLog = require("../models/AuditLog");

class EmailService {
  constructor() {
    this.transporter = null;
    this.enabled = process.env.EMAIL_ENABLED === "true";
  }

  getTransporter() {
    if (!this.enabled) {
      return null;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }

    return this.transporter;
  }

  async sendEmail(to, subject, htmlContent, auditInfo = null) {
    if (!this.enabled) {
      logger.info("Email service is disabled. Skipping email send.");
      return { success: false, message: "Email service is disabled" };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      logger.error("Email transporter not configured");
      return { success: false, message: "Email transporter not configured" };
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || "Finny Portfolio Manager"}" <${
          process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
        }>`,
        to,
        subject,
        html: htmlContent,
      };

      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${info.messageId}`);

      // Create audit log if audit info provided
      if (auditInfo && auditInfo.userId && auditInfo.username) {
        try {
          AuditLog.create({
            user_id: auditInfo.userId,
            username: auditInfo.username,
            action_type: "email_sent",
            table_name: "email",
            new_values: {
              action: auditInfo.trigger || "portfolio_summary_sent",
              email: to,
              subject: subject,
            },
          });
        } catch (auditError) {
          logger.error(
            `Failed to create audit log for email: ${auditError.message}`,
          );
          // Don't fail the email send if audit log fails
        }
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Error sending email to ${to}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async verifyConnection() {
    if (!this.enabled) {
      return false;
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      return false;
    }

    try {
      await transporter.verify();
      return true;
    } catch (error) {
      logger.error(`Email server connection failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = new EmailService();
