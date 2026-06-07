"use strict";

const admin = require("firebase-admin");

const BATCH_SIZE = 450;

function getArgValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function printHelp() {
  console.log(`
Remove legacy profile PII fields.

Usage:
  npm run cleanup:profile-pii:dry-run
  npm run cleanup:profile-pii -- --execute
  npm run cleanup:profile-pii:dry-run -- --project-id=your-project-id

Options:
  --execute             Delete the legacy profiles.email field.
  --project-id=<id>     Optional Firebase project id override.
  --help                Show this help text.

Authentication:
  Uses Firebase Admin application default credentials. Run from an
  authenticated Firebase/Google environment, or set GOOGLE_APPLICATION_CREDENTIALS.
`);
}

function initializeAdmin() {
  const projectId = getArgValue("--project-id");
  const options = projectId ? {projectId} : undefined;

  if (!admin.apps.length) {
    admin.initializeApp(options);
  }
}

async function scanProfiles({execute}) {
  const db = admin.firestore();
  const deleteEmail = admin.firestore.FieldValue.delete();
  let lastDoc = null;
  let scanned = 0;
  let matched = 0;
  let updated = 0;

  while (true) {
    let query = db
      .collection("profiles")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    let batchUpdates = 0;

    snapshot.docs.forEach((docSnap) => {
      scanned += 1;
      const data = docSnap.data();

      if (Object.prototype.hasOwnProperty.call(data, "email")) {
        matched += 1;

        if (execute) {
          batch.update(docSnap.ref, {email: deleteEmail});
          batchUpdates += 1;
        }
      }
    });

    if (execute && batchUpdates > 0) {
      await batch.commit();
      updated += batchUpdates;
      console.log(`Removed legacy profile email field from ${updated} docs...`);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  return {scanned, matched, updated};
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const execute = process.argv.includes("--execute");
  initializeAdmin();

  console.log(
    execute ?
      "Executing cleanup for legacy profiles.email fields." :
      "Dry run only. Add --execute to delete legacy profiles.email fields."
  );

  const result = await scanProfiles({execute});

  console.log(
    [
      `Profiles scanned: ${result.scanned}`,
      `Profiles with legacy email field: ${result.matched}`,
      `Profiles updated: ${result.updated}`,
    ].join("\n")
  );
}

main().catch((error) => {
  const safeDetails = {
    code: error && typeof error.code === "string" ? error.code : undefined,
    name: error && typeof error.name === "string" ? error.name : undefined,
    message: error && typeof error.message === "string" ? error.message : undefined,
  };

  console.error("Profile PII cleanup failed.", safeDetails);
  process.exitCode = 1;
});
