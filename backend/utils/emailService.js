const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Use SendGrid SMTP - works reliably on Render
    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey', // Literally the word 'apikey'
        pass: process.env.SENDGRID_API_KEY // Your SendGrid API key
      },
      // Optimized timeouts for Render
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Send new article notification to all subscribers
  async sendNewArticleNotification(article, subscribers) {
    try {
      const subject = `🏆 New Article: ${article.title}`;
      const html = this.generateArticleEmailTemplate(article);
      
      console.log(`📧 Preparing to send article notification to ${subscribers.length} subscribers`);
      
      // Send to all subscribers
      for (const subscriber of subscribers) {
        await this.sendEmail(subscriber.email, subject, html);
      }
      
      console.log(`✅ Sent new article notification to ${subscribers.length} subscribers`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send article notifications:', error);
      return false;
    }
  }

  // Send new comment notification to admin
  async sendNewCommentNotification(comment, article) {
    try {
      const subject = `💬 New Comment on: ${article.title}`;
      const html = this.generateCommentEmailTemplate(comment, article);
      
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) {
        console.warn('⚠️ ADMIN_EMAIL not set in environment variables');
        return false;
      }
      
      await this.sendEmail(adminEmail, subject, html);
      console.log('✅ Sent new comment notification to admin');
      return true;
    } catch (error) {
      console.error('❌ Failed to send comment notification:', error);
      return false;
    }
  }

  // Send contact form submission to admin
  async sendContactFormNotification(contactData) {
    try {
      const subject = `📞 New Contact Form Submission from ${contactData.name}`;
      const html = this.generateContactEmailTemplate(contactData);
      
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) {
        console.warn('⚠️ ADMIN_EMAIL not set in environment variables');
        return false;
      }
      
      await this.sendEmail(adminEmail, subject, html);
      console.log('✅ Sent contact form notification to admin');
      return true;
    } catch (error) {
      console.error('❌ Failed to send contact notification:', error);
      return false;
    }
  }

  // Send welcome email to new subscriber
  async sendWelcomeEmail(email) {
    try {
      const subject = '🎉 Welcome to Sport Buzz Newsletter!';
      const html = this.generateWelcomeEmailTemplate();
      
      await this.sendEmail(email, subject, html);
      console.log(`✅ Sent welcome email to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }

  // Email templates (keep your existing templates - they're great!)
  generateArticleEmailTemplate(article) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://sportsbuzz-pnpa.onrender.com';
    const articleUrl = `${frontendUrl}/article.html?id=${article._id}`;
    const imageUrl = article.image ? `${frontendUrl}${article.image}` : 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f8f9fa; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #ED2939, #0085C7); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .article-image { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }
              .category { display: inline-block; background: #F4C300; color: #000; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; margin-bottom: 15px; }
              .btn { display: inline-block; background: #F4C300; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f1f1f1; }
              .excerpt { line-height: 1.6; margin: 15px 0; color: #555; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1 style="margin: 0; font-size: 2rem;">Sport Buzz</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Ultimate Sports News Destination</p>
              </div>
              <div class="content">
                  <div class="category">${article.category.charAt(0).toUpperCase() + article.category.slice(1)}</div>
                  <h2 style="margin: 10px 0 20px 0; color: #202124;">${article.title}</h2>
                  
                  <img src="${imageUrl}" alt="${article.title}" class="article-image">
                  
                  <p class="excerpt">${article.excerpt || article.content.substring(0, 200)}...</p>
                  
                  <div style="text-align: center;">
                      <a href="${articleUrl}" class="btn">Read Full Article</a>
                  </div>
                  
                  <p style="text-align: center; color: #666; font-style: italic;">
                      Published: ${new Date(article.createdAt).toLocaleDateString()}
                  </p>
              </div>
              <div class="footer">
                  <p>You received this email because you subscribed to Sport Buzz newsletter.</p>
                  <p><a href="${frontendUrl}/unsubscribe" style="color: #666; text-decoration: none;">Unsubscribe</a></p>
                  <p>&copy; 2024 Sport Buzz. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  generateCommentEmailTemplate(comment, article) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://sportsbuzz-pnpa.onrender.com';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; background: #f8f9fa; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
              .header { background: #F4C300; color: #000; padding: 25px; text-align: center; }
              .content { padding: 30px; }
              .comment-box { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0085C7; }
              .btn { display: inline-block; background: #0085C7; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; }
              .meta { color: #666; font-size: 0.9rem; margin: 5px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h2 style="margin: 0;">💬 New Comment Received</h2>
              </div>
              <div class="content">
                  <h3 style="color: #202124; margin-bottom: 10px;">Article: ${article.title}</h3>
                  
                  <div class="comment-box">
                      <p class="meta"><strong>From:</strong> ${comment.user} (${comment.email})</p>
                      <p class="meta"><strong>Date:</strong> ${new Date(comment.createdAt).toLocaleString()}</p>
                      <p class="meta"><strong>IP:</strong> ${comment.ipAddress || 'Unknown'}</p>
                      
                      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ccc;">
                          <strong style="color: #333;">Comment:</strong>
                          <p style="margin: 10px 0 0 0; line-height: 1.5; color: #333;">${comment.text}</p>
                      </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 25px;">
                      <a href="${frontendUrl}/admin.html" class="btn">Manage Comments in Admin Panel</a>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  generateContactEmailTemplate(contactData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; background: #f8f9fa; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
              .header { background: #009F3D; color: white; padding: 25px; text-align: center; }
              .content { padding: 30px; }
              .message-box { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #009F3D; }
              .info-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h2 style="margin: 0;">📞 New Contact Form Submission</h2>
              </div>
              <div class="content">
                  <h3 style="color: #202124; margin-bottom: 20px;">Contact Details</h3>
                  
                  <div class="info-item">
                      <strong>Name:</strong> ${contactData.name}
                  </div>
                  <div class="info-item">
                      <strong>Email:</strong> ${contactData.email}
                  </div>
                  <div class="info-item">
                      <strong>Subject:</strong> ${contactData.subject}
                  </div>
                  <div class="info-item">
                      <strong>Date:</strong> ${new Date(contactData.createdAt).toLocaleString()}
                  </div>
                  <div class="info-item">
                      <strong>IP Address:</strong> ${contactData.ipAddress || 'Unknown'}
                  </div>
                  
                  <div class="message-box">
                      <h4 style="margin: 0 0 15px 0; color: #009F3D;">Message:</h4>
                      <p style="margin: 0; line-height: 1.6; color: #333;">${contactData.message}</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  generateWelcomeEmailTemplate() {
    const frontendUrl = process.env.FRONTEND_URL || 'https://sportsbuzz-pnpa.onrender.com';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f8f9fa; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #ED2939, #0085C7); color: white; padding: 40px; text-align: center; }
              .content { padding: 40px; text-align: center; }
              .features { text-align: left; margin: 30px 0; background: #f8f9fa; padding: 25px; border-radius: 8px; }
              .feature-item { margin: 12px 0; padding-left: 10px; }
              .btn { display: inline-block; background: #F4C300; color: #000; padding: 15px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 25px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f1f1f1; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1 style="margin: 0; font-size: 2.5rem;">🎉 Welcome to Sport Buzz!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 1.1rem;">Your journey to sports excellence starts here</p>
              </div>
              <div class="content">
                  <h2 style="color: #202124;">Thank you for subscribing!</h2>
                  <p style="font-size: 1.1rem; line-height: 1.6; color: #555;">
                      You'll now receive the latest sports news, exclusive insights, and breaking updates directly in your inbox.
                  </p>
                  
                  <div class="features">
                      <h3 style="color: #202124; margin-top: 0;">What you'll get:</h3>
                      <div class="feature-item">✅ Breaking sports news and updates</div>
                      <div class="feature-item">✅ In-depth analysis and expert opinions</div>
                      <div class="feature-item">✅ Exclusive interviews and features</div>
                      <div class="feature-item">✅ Match previews and results</div>
                      <div class="feature-item">✅ Behind-the-scenes content</div>
                  </div>
                  
                  <a href="${frontendUrl}" class="btn">Explore Latest Articles</a>
                  
                  <p style="color: #666; font-size: 0.9rem;">
                      If you did not subscribe to our newsletter, please ignore this email.
                  </p>
              </div>
              <div class="footer">
                  <p>&copy; 2024 Sport Buzz. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  // Core email sending function
  async sendEmail(to, subject, html) {
    try {
      // Check if SendGrid API key is set
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('⚠️ SendGrid API key missing. Emails will not be sent.');
        console.log('📧 Would have sent email to:', to);
        console.log('📧 Subject:', subject);
        return false;
      }

      const mailOptions = {
        from: `"Sport Buzz" <${process.env.EMAIL_FROM || 'sportsbuzzs9@gmail.com'}>`,
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to: ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  // Test email configuration
  async testEmailConfig() {
    try {
      await this.transporter.verify();
      console.log('✅ SendGrid email server is ready to send messages');
      return true;
    } catch (error) {
      console.error('❌ SendGrid email configuration error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();