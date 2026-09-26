import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { ALL_DEMO_USERS } from '../src/data/demoUsers';
import firebaseConfigJson from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: "AIzaSyAjTZ3wxBZ_RTp5rhI-nYl7DmRawYi53z0",
  authDomain: "rewardluxe-4c773.firebaseapp.com",
  projectId: "rewardluxe-4c773",
  storageBucket: "rewardluxe-4c773.firebasestorage.app",
  messagingSenderId: "916163780121",
  appId: "1:916163780121:web:5b2b797c4b27d23aa81488",
  ...firebaseConfigJson
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log(`Starting to seed all ${ALL_DEMO_USERS.length} demo users to Firestore...`);
  
  let count = 0;

  for (const user of ALL_DEMO_USERS) {
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        ...user,
        updatedAt: Date.now()
      }, { merge: true });
      count++;
      process.stdout.write(`.` );
    } catch (err) {
      console.error(`\nFailed to seed user ${user.uid}:`, err);
    }
  }

  console.log(`\nSuccessfully seeded ${count} demo users into Firestore collection 'users'!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});
