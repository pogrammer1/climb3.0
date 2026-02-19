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

describe('Security rules', () => {
  let testEnv;
  const authedContext = (uid) => testEnv.authenticatedContext(uid);

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

      const seededImageRef = adminStorage.ref('chat-images/conv_u1_u2/seed.png');
      await seededImageRef.putString(PNG_DATA_URL, 'data_url');
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test('climbs: only session owner can read/write climbs', async () => {
    const u1Db = testEnv.authenticatedContext('u1').firestore();
    const u2Db = testEnv.authenticatedContext('u2').firestore();

    await assertSucceeds(getDoc(doc(u1Db, 'climbs', 'climb_for_u1_session')));
    await assertFails(getDoc(doc(u2Db, 'climbs', 'climb_for_u1_session')));

    await assertSucceeds(
      setDoc(doc(u1Db, 'climbs', 'new_climb_by_u1'), {
        sessionId: 'session_owned_by_u1',
        name: 'Project',
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

    await assertSucceeds(getDoc(doc(u1Db, 'potentialMatches', 'pm_u1')));
    await assertFails(getDoc(doc(u2Db, 'potentialMatches', 'pm_u1')));

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
  });

  test('messages: participant can update readBy but cannot modify message content/sender', async () => {
    const u2Db = authedContext('u2').firestore();

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
  });
});
