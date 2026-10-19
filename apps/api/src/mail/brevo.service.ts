import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: SendEmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: SendEmailRecipient;
}

export interface SupportTicketDto {
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string;
  matchId?: string;
}

/**
 * Brevo (formerly Sendinblue) Transactional Mail Integration.
 * Configured with authoritative sender: support@playverzus.xyz
 * Domain: https://playverzus.xyz
 */
@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiKey = process.env.BREVO_API_KEY;
  private readonly senderEmail = process.env.BREVO_SENDER_EMAIL || 'support@playverzus.xyz';
  private readonly senderName = process.env.BREVO_SENDER_NAME || 'Playverzus.xyz';
  private readonly appUrl = process.env.WEB_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://playverzus.xyz';

  /**
   * Generic sender via Brevo v3 SMTP REST API.
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    if (!this.apiKey) {
      this.logger.warn(
        `[Brevo Service] BREVO_API_KEY not configured in environment. ` +
        `Simulating email dispatch to ${options.to.map((t) => t.email).join(', ')} with subject: "${options.subject}".`
      );
      return { success: true, messageId: `mock-brevo-${Date.now()}` };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: options.to,
          replyTo: options.replyTo || {
            email: 'support@playverzus.xyz',
            name: 'Playverzus.xyz Support',
          },
          subject: options.subject,
          htmlContent: options.htmlContent,
          textContent: options.textContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`[Brevo API Error] ${response.status}: ${errorText}`);
        return { success: false };
      }

      const data = (await response.json()) as { messageId?: string };
      this.logger.log(`[Brevo Success] Dispatched message ${data.messageId} to ${options.to[0]?.email}`);
      return { success: true, messageId: data.messageId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Brevo Network Exception] ${msg}`);
      return { success: false };
    }
  }

  /**
   * Sends a welcome email upon user registration on Playverzus.xyz.
   */
  async sendWelcomeEmail(toEmail: string, username: string) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0e14; color: #f1f5f9; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #121824; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }
          .logo { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #38bdf8; text-transform: uppercase; margin-bottom: 24px; }
          h1 { font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 0; }
          p { color: #94a3b8; line-height: 1.6; font-size: 14px; }
          .btn { display: inline-block; background: #0284c7; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 20px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Playverzus.xyz</div>
          <h1>Welcome to Playverzus.xyz, ${username}!</h1>
          <p>Your competitive esports account is ready. You now have access to verified 1v1 challenges, championship cups, and automated score settlements.</p>
          <p>We've credited your account with <strong>1,000 Practice Points</strong> to start competing immediately with zero fiat risk.</p>
          <a href="${this.appUrl}/dashboard" class="btn">Enter Playverzus.xyz</a>
          <div class="footer">
            <p>Need assistance or have match inquiries? Contact our team at <a href="mailto:support@playverzus.xyz" style="color: #38bdf8;">support@playverzus.xyz</a>.</p>
            <p>© 2026 Playverzus.xyz. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: [{ email: toEmail, name: username }],
      subject: 'Welcome to Playverzus.xyz — Your Account is Ready',
      htmlContent,
      textContent: `Welcome to Playverzus.xyz, ${username}! Access your dashboard at ${this.appUrl}. Support: support@playverzus.xyz`,
    });
  }

  /**
   * Sends an automated support confirmation to the user and notifies staff.
   */
  async handleSupportInquiry(dto: SupportTicketDto) {
    const ticketId = `PVZ-${Date.now().toString(36).toUpperCase()}`;

    // 1. Send confirmation to user
    const userHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0b0e14; color: #f1f5f9; padding: 24px;">
        <div style="max-width: 580px; margin: 0 auto; background: #121824; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
          <h2 style="color: #38bdf8; margin-top: 0;">Playverzus.xyz Support Center</h2>
          <p style="color: #94a3b8; font-size: 14px;">Hello ${dto.name},</p>
          <p style="color: #94a3b8; font-size: 14px;">We received your inquiry regarding <strong>"${dto.subject}"</strong>. Our team is reviewing it under ticket reference <strong>#${ticketId}</strong>.</p>
          <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #cbd5e1;">
            <strong>Your Message:</strong><br />
            ${dto.message.replace(/\n/g, '<br />')}
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Our compliance and support agents typically respond within 15 to 30 minutes for active match disputes, and within 24 hours for general account inquiries.</p>
          <div style="margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; font-size: 12px; color: #64748b;">
            Playverzus.xyz Support Team &bull; <a href="mailto:support@playverzus.xyz" style="color: #38bdf8;">support@playverzus.xyz</a> &bull; <a href="${this.appUrl}" style="color: #38bdf8;">playverzus.xyz</a>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: [{ email: dto.email, name: dto.name }],
      subject: `[Ticket #${ticketId}] We received your inquiry: ${dto.subject}`,
      htmlContent: userHtml,
    });

    // 2. Dispatch notice to internal support inbox
    const staffHtml = `
      <h3>New Player Support Ticket #${ticketId}</h3>
      <p><strong>From:</strong> ${dto.name} (${dto.email})</p>
      <p><strong>Subject:</strong> ${dto.subject}</p>
      <p><strong>Category:</strong> ${dto.category || 'General'}</p>
      ${dto.matchId ? `<p><strong>Match ID:</strong> ${dto.matchId}</p>` : ''}
      <hr />
      <p><strong>Message:</strong></p>
      <pre style="white-space: pre-wrap; font-family: monospace;">${dto.message}</pre>
    `;

    await this.sendEmail({
      to: [{ email: 'support@playverzus.xyz', name: 'Playverzus.xyz Support Desk' }],
      replyTo: { email: dto.email, name: dto.name },
      subject: `[Support Desk #${ticketId}] ${dto.subject} from ${dto.name}`,
      htmlContent: staffHtml,
    });

    return { success: true, ticketId };
  }
}
