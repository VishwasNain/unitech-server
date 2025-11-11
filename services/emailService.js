const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });
  }

  // Send email verification
  async sendEmailVerification(user, verificationUrl) {
    const mailOptions = {
      from: `"Unitech Computers" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email - Unitech Computers',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Unitech Computers!</h1>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.name},</h2>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Thank you for signing up with Unitech Computers! To complete your registration and start shopping with us, please verify your email address.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                        display: inline-block;
                        font-size: 16px;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, you can also copy and paste the following link into your browser:
            </p>

            <p style="word-break: break-all; color: #667eea; font-size: 14px; margin-bottom: 30px;">
              ${verificationUrl}
            </p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 12px; line-height: 1.4;">
              This verification link will expire in 10 minutes for security reasons.<br>
              If you didn't create an account with Unitech Computers, please ignore this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email verification sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw new Error('Failed to send verification email');
    }
  }

  // Send password reset email
  async sendPasswordReset(user, resetUrl) {
    const mailOptions = {
      from: `"Unitech Computers" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request - Unitech Computers',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.name},</h2>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password for your Unitech Computers account. If you made this request, click the button below to reset your password.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                        display: inline-block;
                        font-size: 16px;">
                Reset Password
              </a>
            </div>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, you can also copy and paste the following link into your browser:
            </p>

            <p style="word-break: break-all; color: #667eea; font-size: 14px; margin-bottom: 30px;">
              ${resetUrl}
            </p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <p style="color: #dc3545; font-size: 14px; margin: 0; font-weight: bold;">
                Security Notice:
              </p>
              <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">
                This link will expire in 10 minutes. If you didn't request a password reset, please ignore this email.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 12px; line-height: 1.4;">
              If you continue to have problems, please contact our support team.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send newsletter email
  async sendNewsletter(newsletterData) {
    const { subscribers, subject, content, previewText } = newsletterData;

    const mailOptions = {
      from: `"Unitech Computers" <${process.env.EMAIL_USER}>`,
      bcc: subscribers.map(sub => sub.email),
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${previewText ? `<div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${previewText}</div>` : ''}

          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <img src="https://via.placeholder.com/200x50/ffffff/667eea?text=Unitech+Computers" alt="Unitech Computers" style="max-width: 200px;">
          </div>

          <div style="background: #ffffff; padding: 30px;">
            ${content}
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              You're receiving this because you're subscribed to our newsletter.
            </p>
            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
              <a href="{{unsubscribe_url}}" style="color: #667eea;">Unsubscribe</a> |
              <a href="{{preferences_url}}" style="color: #667eea;">Update Preferences</a>
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Newsletter sent to ${subscribers.length} subscribers`);
      return { success: true, recipients: subscribers.length };
    } catch (error) {
      console.error('Error sending newsletter:', error);
      throw new Error('Failed to send newsletter');
    }
  }

  // Send order confirmation email
  async sendOrderConfirmation(order, user) {
    const mailOptions = {
      from: `"Unitech Computers" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed!</h1>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.name},</h2>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Thank you for your order! We've received your order and are preparing it for shipment.
            </p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Details</h3>
              <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${order.total.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/orders/${order._id}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                        display: inline-block;
                        font-size: 16px;">
                View Order Details
              </a>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              We'll send you another email once your order ships. If you have any questions about your order, please contact our customer support.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${user.email} for order ${order.orderNumber}`);
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      throw new Error('Failed to send order confirmation email');
    }
  }
}

module.exports = new EmailService();
