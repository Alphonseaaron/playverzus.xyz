import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      username: string;
      fullName?: string;
      dateOfBirth?: string;
      phone?: string;
      countryCode?: string;
    }
  ) {
    return this.authService.register(body);
  }

  @Post('confirm')
  async confirm(@Body() body: { email: string }) {
    return this.authService.confirmEmail(body.email);
  }

  @Post('resolve-username')
  async resolveUsername(@Body() body: { username: string }) {
    return this.authService.resolveUsername(body.username);
  }

  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  async logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '') || '';
    return this.authService.logout(token);
  }
}
