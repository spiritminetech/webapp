import nodemailer from "nodemailer";

const sendEmailAlert = async ({ to, subject, text, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"Fleet Management" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || "You have a new notification",
      html
    });
  } catch (error) {
    console.error("Email send failed", error);
  }
};
