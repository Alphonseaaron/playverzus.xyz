import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrevoService } from '../src/mail/brevo.service';
import { MailController } from '../src/mail/mail.controller';
import { BadRequestException } from '@nestjs/common';

describe('Brevo Transactional Mail Integration Suite', () => {
  let brevoService: BrevoService;
  let mailController: MailController;

  beforeEach(() => {
    vi.restoreAllMocks();
    brevoService = new BrevoService();
    mailController = new MailController(brevoService);
  });

  describe('Configuration & Service Info', () => {
    it('returns service metadata with authoritative support email and domain', () => {
      const info = mailController.getInfo();
      expect(info.supportEmail).toBe('support@playverzus.xyz');
      expect(info.domain).toBe('https://playverzus.xyz');
      expect(typeof info.configured).toBe('boolean');
    });

    it('simulates dispatch safely without throwing when BREVO_API_KEY is not configured', async () => {
      const result = await brevoService.sendEmail({
        to: [{ email: 'player@example.com', name: 'ProGamer' }],
        subject: 'Match Room Invitation',
        htmlContent: '<p>You have been challenged</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock-brevo');
    });
  });

  describe('Support Ticket Ingestion', () => {
    it('rejects incomplete support ticket payloads with user-friendly error', async () => {
      await expect(
        mailController.submitSupportInquiry({
          name: 'Player',
          email: '',
          subject: 'Match dispute',
          message: 'My score was wrong',
        })
      ).rejects.toThrowError(BadRequestException);

      await expect(
        mailController.submitSupportInquiry({
          name: 'Player',
          email: 'player@test.com',
          subject: '',
          message: 'My score was wrong',
        })
      ).rejects.toThrowError(BadRequestException);
    });

    it('processes valid support inquiry and generates ticket reference', async () => {
      const result = await mailController.submitSupportInquiry({
        name: 'Alex Gamer',
        email: 'alex@gamer.com',
        subject: 'Dispute match room #1234',
        message: 'The match concluded but score was not auto-approved.',
        category: 'Dispute',
        matchId: 'm-1234',
      });

      expect(result.success).toBe(true);
      expect(result.ticketId).toMatch(/^PVZ-[A-Z0-9]+$/);
    });
  });

  describe('Welcome Email Generation', () => {
    it('generates welcome email to recipient with playverzus.xyz branding', async () => {
      const spy = vi.spyOn(brevoService, 'sendEmail');
      await mailController.sendTestEmail({ to: 'newplayer@playverzus.xyz', name: 'Striker' });

      expect(spy).toHaveBeenCalledTimes(1);
      const callArg = spy.mock.calls[0]![0];
      expect(callArg.to[0]?.email).toBe('newplayer@playverzus.xyz');
      expect(callArg.subject).toContain('Welcome to PlayVerzus');
      expect(callArg.htmlContent).toContain('support@playverzus.xyz');
      expect(callArg.htmlContent).toContain('playverzus.xyz');
    });
  });
});
