# Belay 
A cross-platform (iOS, Android, Web) application for rock climbers to log sessions, connect with other climbers, and plan climbing trips together.

## Features
- **User Authentication**: Secure login/signup with Firebase Auth
- **Climbing Session Logger**: Track your climbing sessions, grades, and progress
- **Climber Profiles and Notification system**: Create detailed profiles with climbing preferences and experience. Emails for msgs and connection requests
- **Climber Discovery and Interaction**: Discover and connect with climbers near you. Messaging and scheduling system. 
- **Achievement system**: Achievements for certain milestones 

## Upcoming Features
- Mobile app (just browser right now on web/mobile)

## Tech Stack
- **Frontend**: React Native with Expo (Web + Mobile from single codebase)
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **State Management**: Zustand
- **UI Components**: React Native Paper
- **Navigation**: React Navigation / Expo Router
- **Hosting**: Firebase Hosting

## Release Environment
- Copy `.env.example` to `.env` for local Expo/web development. Values prefixed with `EXPO_PUBLIC_` are bundled into the client and must be treated as public; restrict browser API keys by domain/API in their provider consoles.
- Copy `functions/.env.example` to `functions/.env` for local Functions emulator work. Do not commit real SMTP credentials.
- Production email notifications read `SMTP_PASS` from Firebase Secret Manager. Set or rotate it with `firebase functions:secrets:set SMTP_PASS` before deploying Functions.
- To clean legacy profile PII before release, run `npm run cleanup:profile-pii:dry-run` from `functions/`, then `npm run cleanup:profile-pii -- --execute` after confirming the count.
- Web App Check uses Firebase reCAPTCHA v3. For production web builds, set `EXPO_PUBLIC_FIREBASE_APPCHECK_WEB_RECAPTCHA_SITE_KEY` and `EXPO_PUBLIC_FIREBASE_APPCHECK_REQUIRED=true`; keep `EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` unset outside local development. Enable App Check enforcement in Firebase only after token metrics look healthy.
- Native Expo builds still need a native App Check provider integration before enforcing App Check for iOS/Android.

## License
MIT License - see LICENSE file for details
