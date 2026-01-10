1/6/26 
- starting over cuz last one shit itself, need to keep work linear and context-aware

1/10/26
- beware of firebase configs accidently pushed onto non gitignore file, change configs later when repo public
- server startup fixed but server not working in some aspects, need to test and fix features



troubleshooting
1/6/26
1. internal error when npm start: npm install --save-dev down babel-plugin-module-resolver
2. no favicon images?? required for expo web builds i guess

1/10/26
1. server starts fine but nothing display on local host





## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Input, Card, etc.)
│   ├── auth/           # Authentication-related components
│   ├── profile/        # Profile components
│   ├── sessions/       # Climbing session components
│   ├── matching/       # Climber matching components
│   └── messaging/      # Chat/messaging components
├── screens/            # Screen components
├── services/           # API and Firebase services
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # App constants and theme
└── config/             # Configuration files
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- git
- npm or yarn
- Expo CLI
- Firebase account

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd climb-app
```

2. Install dependencies
```bash
npm install
npm install -g firebase-tools
```

3. Configure Firebase
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password, Google)
   - Create a Firestore database
   - Copy your config to `src/config/firebase.ts`

4. Start the development server
```bash
npm start
```

5. Run on your preferred platform
```bash
npm run web      # Web browser
npm run ios      # iOS simulator
npm run android  # Android emulator
```

## 🔥 Firebase Setup

1. Create a new Firebase project
2. Enable the following services:
   - **Authentication**: Email/Password, Google Sign-In
   - **Firestore Database**: Start in production mode
   - **Storage**: For profile images
   - **Hosting**: For web deployment

3. Update `src/config/firebase.ts` with your Firebase config

4. Deploy Firestore security rules:
```bash
firebase deploy --only firestore:rules
```

## 📱 Deployment

### Web (Firebase Hosting)
```bash
npm run build:web
firebase deploy --only hosting
```

### Mobile (EAS Build)
```bash
npx eas build --platform android
npx eas build --platform ios
```

## 🧪 Testing

```bash
npm test           # Run tests
npm run lint       # Lint code
npm run type-check # TypeScript check
```

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request