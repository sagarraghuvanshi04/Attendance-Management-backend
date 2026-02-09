const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Yahan humne 'text' ki jagah 'html' property use ki hai
  await transporter.sendMail({
    from: `"Success Point Library" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlContent,
  });
};

module.exports = sendEmail;