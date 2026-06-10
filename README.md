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
- **Backend**: Firebase (Authentication, Firestore, Storage, Hosting)
- **State Management**: Zustand
- **UI Components**: React Native Paper
- **Navigation**: React Navigation / Expo Router
- **Hosting**: Firebase Hosting

## Project Status
Belay is preparing for beta testing with real climbers on mobile web. Current engineering focus is release readiness: security rules, account data controls, abuse reporting/moderation, production web deployment, and mobile-first UI polish.

## Security and Privacy Baseline
- Firebase/Google Cloud provide HTTPS encryption in transit and default server-side encryption at rest for Firestore/Storage. This app does not add custom app-level field encryption for the beta release.
- Data classification for release:
  - Account/private: Auth email, email verification state, login metadata, notification preferences, export/delete requests.
  - Social profile: display name, profile photo, bio, climbing experience, preferred styles, home gym, city, broad location, schedule availability, achievements, and public aggregate stats.
  - User-owned activity: sessions, climbs, notes, photos, and location names. These remain owner-readable unless a specific feature intentionally shares derived public stats.
  - Conversation data: participant IDs, message text/image URLs, read receipts, reports, and moderation audit data. Access is limited to participants or moderators by Firestore/Storage rules.
- App-level field encryption is not required for the current personal/social climbing feature set because the app needs server-side search, matching, moderation, notifications, export, and deletion. Revisit encryption before collecting regulated data such as payment details, government IDs, precise live location history, medical data, or private journal-style records.

## License
MIT License - see LICENSE file for details
