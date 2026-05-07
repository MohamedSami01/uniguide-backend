// Google OAuth strategy — placeholder until GOOGLE_CLIENT_ID / SECRET are configured.
// Uncomment and install passport-google-oauth20 when ready.

// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy, VerifyCallback } from 'passport-google-oauth20';
// import { ConfigService } from '@nestjs/config';
//
// @Injectable()
// export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
//   constructor(configService: ConfigService) {
//     super({
//       clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
//       clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
//       callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
//       scope: ['email', 'profile'],
//     });
//   }
//
//   async validate(
//     accessToken: string,
//     refreshToken: string,
//     profile: any,
//     done: VerifyCallback,
//   ): Promise<any> {
//     const { name, emails, id } = profile;
//     const user = {
//       googleId: id,
//       email: emails[0].value,
//       name: `${name.givenName} ${name.familyName}`,
//     };
//     done(null, user);
//   }
// }
