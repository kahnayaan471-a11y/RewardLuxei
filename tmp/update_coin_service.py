import re

with open('src/services/coinService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"  // 3\. Auto-populate demo users if non-verified & active[\s\S]*?console\.warn\('Could not auto-add demo users to giveaway entries:', err\);\n  \}"

replacement = """  // 3. Auto-populate demo users if non-verified & active with completely RANDOM positions (different from Leaderboard)
  try {
    const config = await fetchGiveawayConfig();
    const isNonVerified = config.targetAudience !== 'verified_only';

    if (isNonVerified && config.active) {
      const existingUids = new Set(entries.map(e => e.userId));

      // Deterministic pseudo-random hash generator based on string
      const pseudoHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
        }
        return hash;
      };

      // Randomize the order of demo users so their positions in Giveaway are completely random and do NOT match Leaderboard
      const randomizedDemoUsers = [...DEMO_LEADERBOARD_USERS].sort((a, b) => {
        const hashA = pseudoHash(`${a.uid}_gw_pos_${giveawayId}`);
        const hashB = pseudoHash(`${b.uid}_gw_pos_${giveawayId}`);
        return hashA - hashB;
      });

      const now = Date.now();
      const baseSpanMs = 72 * 3600 * 1000; // 72 hours span
      const stepMs = Math.floor(baseSpanMs / (randomizedDemoUsers.length + 5));

      randomizedDemoUsers.forEach((demoUser, idx) => {
        if (!existingUids.has(demoUser.uid)) {
          const jitter = (pseudoHash(`${demoUser.uid}_jitter`) % 1800000) - 900000;
          const enteredAt = Math.max(now - ((idx + 1) * stepMs + jitter), now - 5 * 24 * 3600 * 1000);
          entries.push({
            id: `${giveawayId}_${demoUser.uid}`,
            giveawayId,
            userId: demoUser.uid,
            userName: demoUser.displayName,
            userEmail: demoUser.email,
            userPhoto: demoUser.photoURL,
            isVerified: false,
            entryFeeCoins: config.entryFeeCoins || 0,
            enteredAt
          });
        }
      });
    }
  } catch (err) {
    console.warn('Could not auto-add demo users to giveaway entries:', err);
  }"""

new_content, count = re.subn(pattern, replacement, content, count=1)
if count != 1:
    raise Exception(f"Failed to match pattern, count was {count}")

with open('src/services/coinService.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully replaced giveaway demo user logic with randomized positions!")
