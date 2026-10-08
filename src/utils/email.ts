import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "your-email@gmail.com",
    pass: process.env.SMTP_PASS || "your-email-password",
  },
});

export const sendOtpEmail = async (to: string, otp: string) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"EduVision" <no-reply@eduvision.com>',
    to,
    subject: "Your Login OTP",
    text: `Your OTP for login is: ${otp}. It is valid for 5 minutes.`,
    html: `<b>Your OTP for login is: ${otp}</b><br>It is valid for 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // In production, you might want to throw an error here,
    // but we can just log it for now to avoid breaking the flow if credentials aren't set
  }
};
