const nodemailer = require('nodemailer');

async function sendMailForgotPassword(url, user) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: true, // true for 465, false for other ports
      // requireTLS: true, //if using gmail(587)
      auth: {
        user: process.env.MAIL_USERNAME, // generated ethereal user
        pass: process.env.MAIL_PASSWORD, // generated ethereal password
      },
    });
    const info = await transporter.sendMail({
      from: `"Credit Transfer System" <${process.env.MAIL_USERNAME}>`,
      to: `${user.email}`,
      subject: 'Password reset request', // Subject line
      html: `
      Hi ${user.name || 'there'},<br><br>
      We received a request to reset your password for the Credit Transfer System.<br>
      Click this link to reset your password:<br><br>
      <a href="${url}">Reset Password</a><br><br>
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${url}">${url}</a><br><br>
      If you didn't request this, you can safely ignore this email.<br><br>
      Regards,<br>
      Credit Transfer System`, // html body
    });
    console.log('Message sent: %s', info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.log('fail to send email', error);
  }
}
// Route Open
module.exports = sendMailForgotPassword;
