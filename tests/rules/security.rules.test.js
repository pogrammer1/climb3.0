const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');

const PROJECT_ID = 'belay-rules-test';
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9U6dQAAAAASUVORK5CYII=';
const TEXT_DATA_URL = 'data:text/plain;base64,bm90LWFuLWltYWdl';
const longText = (length) => 'x'.repeat(length);

describe('Security rules', () => {
  let testEnv;
  const authedContext = (uid, verified = true) =>
    testEnv.authenticatedContext(uid, { email_verified: verified });
  const moderatorContext = (uid) =>
    testEnv.authenticatedContext(uid, { email_verified: true, moderator: true });

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      },
      storage: {
        rules: fs.readFileSync(path.resolve(__dirname, '../../storage.rules'), 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    if (typeof testEnv.clearStorage === 'function') {
      await testEnv.clearStorage();
    }

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      const adminStorage = context.storage();

      await setDoc(doc(adminDb, 'sessions', 'session_owned_by_u1'), {
        userId: 'u1',
        location: 'Gym',
      });

      await setDoc(doc(adminDb, 'climbs', 'climb_for_u1_session'), {
        sessionId: 'session_owned_by_u1',
        name: 'Warmup',
      });

      await setDoc(doc(adminDb, 'potentialMatches', 'pm_u1'), {
        userId: 'u1',
        score: 90,
      });

      await setDoc(doc(adminDb, 'users', 'u1'), {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'U1',
        photoURL: null,
        emailVerified: true,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      });

      await setDoc(doc(adminDb, 'profiles', 'u1'), {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'U1',
        photoURL: null,
        bio: 'Climber',
        experienceLevel: 'Beginner',
        climbingTypes: ['Bouldering'],
        highestGradeYDS: null,
        highestGradeBouldering: null,
        preferredClimbingStyle: '',
        partnerPreferences: [],
        availableDays: [],
        availableTimes: [],
        homeGym: null,
        city: 'Austin',
        favoriteOutdoorAreas: [],
        yearsClimbing: 1,
        certifications: [],
        isProfileComplete: true,
        isSearchable: true,
        emailNotifications: true,
        emailNotificationTypes: ['messages'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(adminDb, 'conversations', 'conv_u1_u2'), {
        participantIds: ['u1', 'u2'],
        participants: {
          u1: { displayName: 'U1', photoURL: null, unreadCount: 0 },
          u2: { displayName: 'U2', photoURL: null, unreadCount: 0 },
        },
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(adminDb, 'conversations', 'conv_u1_u2', 'messages', 'msg1'), {
        conversationId: 'conv_u1_u2',
        senderId: 'u1',
        text: 'hello',
        imageUrl: null,
        readBy: ['u1'],
        createdAt: new Date(),
      });

      await setDoc(doc(adminDb, 'matches', 'match_u1_u2'), {
        userId: 'u1',
        matchedUserId: 'u2',
        status: 'pending',
        initiatedBy: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(adminDb, 'gyms', 'gym_owned_by_u1'), {
        id: 'gym_owned_by_u1',
        name: 'Belay Test Gym',
        address: '123 Test St',
        city: 'Austin',
        state: 'TX',
        country: 'US',
        type: 'indoor',
        category: 'gym',
        verified: false,
        addedBy: 'u1',
        sessionCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const seededImageRef = adminStorage.ref('chat-images/conv_u1_u2/seed.png');
      await seededImageRef.putString(PNG_DATA_URL, 'data_url');
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  test('climbs: only session owner can read/write climbs', async () => {
    const u1Db = authedContext('u1').firestore();
    const u2Db = authedContext('u2').firestore();

    await assertSucceeds(getDoc(doc(u1Db, 'climbs', 'climb_for_u1_session')));
    await assertFails(getDoc(doc(u2Db, 'climbs', 'climb_for_u1_session')));

    await assertSucceeds(
      setDoc(doc(u1Db, 'climbs', 'new_climb_by_u1'), {
        sessionId: 'session_owned_by_u1',
        name: 'Project',
        grade: 'V3',
        gradeSystem: 'v-scale',
        climbingType: 'Bouldering',
        result: 'Sent',
        attempts: 2,
        notes: '',
        rating: 4,
        photos: [],
        createdAt: new Date(),
      })
    );

    await assertFails(
      setDoc(doc(u2Db, 'climbs', 'forged_climb'), {
        sessionId: 'session_owned_by_u1',
        name: 'Spoof',
      })
    );
  });

  test('potentialMatches: only owner can read/write own document', async () => {
    const u1Db = authedContext('u1').firestore();
    const u2Db = authedContext('u2').firestore();
    const unverifiedU1Db = authedContext('u1', false).firestore();

    await assertSucceeds(getDoc(doc(u1Db, 'potentialMatches', 'pm_u1')));
    await assertFails(getDoc(doc(u2Db, 'potentialMatches', 'pm_u1')));
    await assertFails(getDoc(doc(unverifiedU1Db, 'potentialMatches', 'pm_u1')));

    await assertSucceeds(
      setDoc(doc(u2Db, 'potentialMatches', 'pm_u2'), {
        userId: 'u2',
        score: 75,
      })
    );

    await assertFails(
      setDoc(doc(u2Db, 'potentialMatches', 'pm_spoof'), {
        userId: 'u1',
        score: 100,
      })
    );

    await assertFails(
      updateDoc(doc(u2Db, 'potentialMatches', 'pm_u1'), {
        score: 10,
      })
    );
  });

  test.skip('chat-images: only conversation participants can read/write images', async () => {
    const u1Storage = testEnv.authenticatedContext('u1').storage();
    const u2Storage = testEnv.authenticatedContext('u2').storage();
    const u3Storage = testEnv.authenticatedContext('u3').storage();

    const ownProfileRef = u1Storage.ref('profile-photos/u1/own_profile.png');
    await assertSucceeds(ownProfileRef.putString(PNG_DATA_URL, 'data_url'));

    const participantUploadRef = u1Storage.ref('chat-images/conv_u1_u2/u1_upload.png');
    await assertSucceeds(
      participantUploadRef.putString(PNG_DATA_URL, 'data_url')
    );

    const nonParticipantUploadRef = u3Storage.ref('chat-images/conv_u1_u2/u3_upload.png');
    await assertFails(
      nonParticipantUploadRef.putString(PNG_DATA_URL, 'data_url')
    );

    const badTypeUploadRef = u1Storage.ref('chat-images/conv_u1_u2/bad_type.txt');
    await assertFails(
      badTypeUploadRef.putString(TEXT_DATA_URL, 'data_url')
    );

    const participantReadRef = u2Storage.ref('chat-images/conv_u1_u2/seed.png');
    await assertSucceeds(participantReadRef.getDownloadURL());

    const nonParticipantReadRef = u3Storage.ref('chat-images/conv_u1_u2/seed.png');
    await assertFails(nonParticipantReadRef.getDownloadURL());
  });

  test('matches: immutable ownership fields cannot be changed', async () => {
    const u1Db = authedContext('u1').firestore();
    const unverifiedU1Db = authedContext('u1', false).firestore();

    await assertSucceeds(
      updateDoc(doc(u1Db, 'matches', 'match_u1_u2'), {
        status: 'accepted',
      })
    );

    await assertFails(
      updateDoc(doc(u1Db, 'matches', 'match_u1_u2'), {
        matchedUserId: 'u3',
      })
    );

    await assertFails(getDoc(doc(unverifiedU1Db, 'matches', 'match_u1_u2')));
  });

  test('users and profiles: owner writes are field-limited and validated', async () => {
    const u1Db = authedContext('u1').firestore();

    await assertSucceeds(
      updateDoc(doc(u1Db, 'users', 'u1'), {
        displayName: 'Updated U1',
        updatedAt: new Date(),
      })
    );

    await assertFails(
      updateDoc(doc(u1Db, 'users', 'u1'), {
        uid: 'u2',
      })
    );

    await assertFails(
      updateDoc(doc(u1Db, 'profiles', 'u1'), {
        bio: longText(1001),
      })
    );

    await assertFails(
      updateDoc(doc(u1Db, 'profiles', 'u1'), {
        role: 'admin',
      })
    );

    await assertFails(
      updateDoc(doc(u1Db, 'profiles', 'u1'), {
        email: 'u1@example.com',
      })
    );
  });

  test('sessions and climbs: reject unknown fields, owner spoofing, and oversized notes', async () => {
    const u1Db = authedContext('u1').firestore();

    await assertSucceeds(
      setDoc(doc(u1Db, 'sessions', 'valid_session_by_u1'), {
        userId: 'u1',
        date: new Date(),
        location: 'Gym',
        locationType: 'indoor',
        duration: 90,
        notes: 'Good session',
        photos: [],
        climbs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertFails(
      setDoc(doc(u1Db, 'sessions', 'spoofed_session'), {
        userId: 'u2',
        date: new Date(),
        location: 'Gym',
        locationType: 'indoor',
        duration: 90,
        notes: '',
        photos: [],
        climbs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertFails(
      setDoc(doc(u1Db, 'sessions', 'oversized_session'), {
        userId: 'u1',
        date: new Date(),
        location: 'Gym',
        locationType: 'indoor',
        duration: 90,
        notes: longText(2001),
        photos: [],
        climbs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertFails(
      setDoc(doc(u1Db, 'climbs', 'climb_with_extra_field'), {
        sessionId: 'session_owned_by_u1',
        name: 'Project',
        grade: 'V3',
        gradeSystem: 'v-scale',
        climbingType: 'Bouldering',
        result: 'Sent',
        attempts: 2,
        notes: '',
        rating: 4,
        photos: [],
        createdAt: new Date(),
        adminOnly: true,
      })
    );
  });

  test('messages: participant can update readBy but cannot modify message content/sender', async () => {
    const u2Db = authedContext('u2').firestore();
    const unverifiedU2Db = authedContext('u2', false).firestore();

    await assertSucceeds(
      updateDoc(doc(u2Db, 'conversations', 'conv_u1_u2', 'messages', 'msg1'), {
        readBy: ['u1', 'u2'],
      })
    );

    await assertFails(
      updateDoc(doc(u2Db, 'conversations', 'conv_u1_u2', 'messages', 'msg1'), {
        text: 'tampered',
      })
    );

    await assertFails(
      updateDoc(doc(u2Db, 'conversations', 'conv_u1_u2', 'messages', 'msg1'), {
        senderId: 'u2',
      })
    );

    await assertFails(getDoc(doc(unverifiedU2Db, 'conversations', 'conv_u1_u2', 'messages', 'msg1')));

    await assertFails(
      setDoc(doc(authedContext('u1').firestore(), 'conversations', 'conv_u1_u2', 'messages', 'oversized'), {
        conversationId: 'conv_u1_u2',
        senderId: 'u1',
        text: longText(2001),
        imageUrl: null,
        readBy: ['u1'],
        createdAt: new Date(),
      })
    );
  });

  test('reports: verified users can create constrained reports and only read their own', async () => {
    const u1Db = authedContext('u1').firestore();
    const u2Db = authedContext('u2').firestore();
    const u3Db = authedContext('u3').firestore();
    const unverifiedU1Db = authedContext('u1', false).firestore();
    const moderatorDb = moderatorContext('mod1').firestore();

    const userReport = {
      reporterId: 'u1',
      targetType: 'user',
      reason: 'harassment',
      details: 'Unsafe behavior.',
      status: 'pending',
      reportedUserId: 'u2',
      conversationId: null,
      messageId: null,
      messagePreview: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await assertSucceeds(setDoc(doc(u1Db, 'reports', 'report_user'), userReport));
    await assertSucceeds(getDoc(doc(u1Db, 'reports', 'report_user')));
    await assertFails(getDoc(doc(u2Db, 'reports', 'report_user')));

    await assertFails(
      setDoc(doc(unverifiedU1Db, 'reports', 'unverified_report'), userReport)
    );

    await assertFails(
      setDoc(doc(u1Db, 'reports', 'spoofed_reporter'), {
        ...userReport,
        reporterId: 'u2',
      })
    );

    await assertFails(
      setDoc(doc(u1Db, 'reports', 'self_report'), {
        ...userReport,
        reportedUserId: 'u1',
      })
    );

    await assertSucceeds(
      setDoc(doc(u2Db, 'reports', 'report_message'), {
        reporterId: 'u2',
        targetType: 'message',
        reason: 'hate_speech',
        details: '',
        status: 'pending',
        reportedUserId: 'u1',
        conversationId: 'conv_u1_u2',
        messageId: 'msg1',
        messagePreview: 'hello',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertFails(
      setDoc(doc(u3Db, 'reports', 'nonparticipant_message_report'), {
        reporterId: 'u3',
        targetType: 'message',
        reason: 'hate_speech',
        details: '',
        status: 'pending',
        reportedUserId: 'u1',
        conversationId: 'conv_u1_u2',
        messageId: 'msg1',
        messagePreview: 'hello',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertFails(
      updateDoc(doc(u1Db, 'reports', 'report_user'), {
        status: 'reviewed',
      })
    );

    await assertSucceeds(getDoc(doc(moderatorDb, 'reports', 'report_user')));

    await assertSucceeds(
      updateDoc(doc(moderatorDb, 'reports', 'report_user'), {
        status: 'reviewed',
        reviewedAt: new Date(),
        reviewedBy: 'mod1',
        moderatorNotes: 'Reviewed for release test.',
        updatedAt: new Date(),
      })
    );

    await assertFails(
      updateDoc(doc(moderatorDb, 'reports', 'report_user'), {
        reporterId: 'mod1',
      })
    );
  });

  test('schedules: owner writes are constrained to their own schedule shape', async () => {
    const u1Db = authedContext('u1').firestore();

    await assertSucceeds(
      setDoc(doc(u1Db, 'schedules', 'u1'), {
        userId: 'u1',
        schedule: [],
        preferredGyms: [],
        notes: 'Weekends',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertFails(
      setDoc(doc(u1Db, 'schedules', 'u1_spoof'), {
        userId: 'u2',
        schedule: [],
        preferredGyms: [],
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertFails(
      setDoc(doc(u1Db, 'schedules', 'u1_bad_field'), {
        userId: 'u1',
        schedule: [],
        preferredGyms: [],
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        privateAdminNote: 'nope',
      })
    );
  });

  test('gyms: verified users can add gyms and only constrained updates are allowed', async () => {
    const u1Db = authedContext('u1').firestore();
    const u2Db = authedContext('u2').firestore();
    const unverifiedU1Db = authedContext('u1', false).firestore();

    await assertSucceeds(getDoc(doc(unverifiedU1Db, 'gyms', 'gym_owned_by_u1')));

    await assertSucceeds(
      setDoc(doc(u1Db, 'gyms', 'new_gym_by_u1'), {
        id: 'new_gym_by_u1',
        name: 'New Gym',
        address: '456 Test St',
        city: 'Austin',
        state: 'TX',
        country: 'US',
        type: 'indoor',
        category: 'gym',
        verified: false,
        addedBy: 'u1',
        sessionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertFails(
      setDoc(doc(unverifiedU1Db, 'gyms', 'new_gym_unverified'), {
        id: 'new_gym_unverified',
        name: 'Nope',
        address: '456 Test St',
        city: 'Austin',
        state: 'TX',
        country: 'US',
        type: 'indoor',
        category: 'gym',
        verified: false,
        addedBy: 'u1',
        sessionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertSucceeds(
      updateDoc(doc(u2Db, 'gyms', 'gym_owned_by_u1'), {
        sessionCount: 3,
        updatedAt: new Date(),
      })
    );

    await assertFails(
      updateDoc(doc(u2Db, 'gyms', 'gym_owned_by_u1'), {
        name: 'Hijacked Gym',
      })
    );

    await assertFails(
      updateDoc(doc(u1Db, 'gyms', 'gym_owned_by_u1'), {
        verified: true,
      })
    );
  });
});
