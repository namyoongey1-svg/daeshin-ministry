/**
 * 마나 수집 시뮬레이터(로블록스) 홍보 글 묶음.
 *
 * 하루에 하나씩 차례로 올라간다. 끝까지 가면 처음으로 돌아온다.
 * 순서는 섞지 않는다 — 기능 소개와 성경 이야기가 번갈아 나오도록
 * 일부러 배치했다. 같은 성격의 글이 연달아 나오면 계정이 단조로워 보인다.
 *
 * 글자 수는 500자를 넘기면 안 된다(스레드 한도). manna-threads.ts 가
 * 올리기 전에 검사하고, 넘으면 그 글을 건너뛴다.
 *
 * 글을 고치거나 더할 때:
 *   - 링크는 끝에 한 줄로 둔다. 가운데 끼면 읽는 흐름이 끊긴다.
 *   - 물음표로 끝나는 글을 서넛에 하나씩 섞는다. 답글이 붙어야 도달이 는다.
 *   - 과장하지 않는다. 작은 게임이다. 작지만 분명한 것을 말하는 쪽이 낫다.
 */

export const GAME_URL = "https://www.roblox.com/games/108564661539682/Manna-Collect-Simulator";

export type Post = {
  /** 글 성격. 통계를 볼 때 어떤 종류가 반응이 좋은지 가르기 위해 남긴다. */
  kind: "feature" | "bible" | "devlog" | "ask";
  text: string;
};

const L = `\n\n${GAME_URL}`;

export const POSTS: Post[] = [
  {
    kind: "feature",
    text:
      "I built a Roblox simulator where you gather manna in the wilderness.\n\n" +
      "But the part people stay for is the island. Everyone gets a private one, and you spend what you gather building the Tabernacle, then the Temple, then Golgotha.\n\n" +
      "Finish all three and the game actually ends." + L,
  },
  {
    kind: "bible",
    text:
      "One talent was about 6,000 denarii.\n\n" +
      "A denarius was a day's wage. So one talent is roughly twenty years of work.\n\n" +
      "When Jesus told the parable of the servant who owed ten thousand talents, he was describing a debt nobody could ever repay. That is the point of the number.\n\n" +
      "My game uses talents as currency. Kids ask what they are. Then they find out." + L,
  },
  {
    kind: "devlog",
    text:
      "I deleted the best-performing mechanic in my simulator.\n\n" +
      "You used to fill a basket, walk back to the storehouse, sell, walk out again. Standard loop for the genre.\n\n" +
      "I watched someone play and the walking was all they did. So manna now becomes currency the instant you touch it.\n\n" +
      "Income went up about 50x. I spent a whole day rebalancing. Worth it." + L,
  },
  {
    kind: "feature",
    text:
      "Pet systems in simulators are usually just a number going up.\n\n" +
      "Mine are 15 people from the Bible, sorted into the groups they come from - Pentateuch, History, Prophets, Gospels, Epistles.\n\n" +
      "Equip three from the same group and you get up to +75%. So you start collecting by book, not by rarity." + L,
  },
  {
    kind: "bible",
    text: "Manna was white.\n\nExodus 16:31 - \"it was like coriander seed, white, and the taste of it was like wafers made with honey.\"\n\nSo in my game the wilderness manna is white, not gold. Small thing. But if a kid ever reads Exodus 16 they will already know what it looked like." + L,
  },
  {
    kind: "ask",
    text:
      "Question for people who played incremental games as a kid:\n\n" +
      "Did you ever finish one? Like an actual ending, not just a prestige loop?\n\n" +
      "I gave mine an ending because I never got one. Builds the Tabernacle, then the Temple, then the cross and the empty tomb. Then it tells you there is nothing left to build." + L,
  },
  {
    kind: "feature",
    text:
      "Answer a Bible question correctly in my game and your collection radius opens wide for 75 seconds.\n\n" +
      "You stand still and the manna comes to you.\n\n" +
      "12 questions so far, all about things you actually see while playing - manna, the wilderness, Jubilee, the mustard seed, the talent. The answers are in the world around you." + L,
  },
  {
    kind: "bible",
    text:
      "Jubilee came every 50 years. Debts cleared. Land returned to the family that lost it. People who sold themselves into service went home.\n\n" +
      "Leviticus 25. An entire economy with a reset button built into it.\n\n" +
      "That is the rebirth mechanic in my game. It felt too fitting not to use." + L,
  },
  {
    kind: "devlog",
    text:
      "Shipped a rebalance today.\n\n" +
      "I wrote a simulator for my simulator - a script that plays the game second by second and reports when a greedy player hits each milestone.\n\n" +
      "Before: whole game finished in 2 hours. After: Tabernacle at 54 minutes, ending at 20 hours.\n\n" +
      "Guessing at numbers does not work. Measure it." + L,
  },
  {
    kind: "feature",
    text:
      "Five lands in my manna game, and each one is roughly 10x the last.\n\n" +
      "Eden. The Wilderness. The Promised Land. The Temple. New Jerusalem.\n\n" +
      "You walk the whole story just by chasing better numbers. That was the design goal - progression that happens to be a map of scripture." + L,
  },
  {
    kind: "bible",
    text:
      "The smallest coin in the New Testament was the lepton.\n\n" +
      "Two of them is what the widow put in the treasury. Mark 12:42. Jesus said she gave more than everyone else.\n\n" +
      "My game has a board that lays out the whole ladder - lepton, denarius, shekel, mina, talent - so the currency means something besides a number." + L,
  },
  {
    kind: "feature",
    text:
      "Simulators give you a pile of junk pets you never use.\n\n" +
      "In mine you can fuse three spares of the same rank into one of the next rank up. It never touches the three you have equipped, so you cannot wreck your setup by accident.\n\n" +
      "No inventory screen. You walk onto a pad and it happens." + L,
  },
  {
    kind: "ask",
    text:
      "Honest question for Roblox devs:\n\n" +
      "How did you get your first 100 players?\n\n" +
      "I have 14 visits. The game is finished and I think it is good. I am clearly bad at the part that comes after shipping." + L,
  },
  {
    kind: "devlog",
    text:
      "A one-line bug in my game made players fall through the world forever.\n\n" +
      "I had named a debug function in Korean. Luau only allows ASCII in identifiers, so the entire server script failed to compile - no map, nothing to stand on.\n\n" +
      "No error popup. Just an empty sky.\n\n" +
      "I added a linter for it. Never again." + L,
  },
  {
    kind: "feature",
    text:
      "You can give your talents away in my game.\n\n" +
      "Stand near other players, step on the alms pad, and 10% of what you have is split between them.\n\n" +
      "The giver gets 40 seconds of wide reach. Giving had to pay you back somehow or nobody would ever press it. Acts 20:35, basically." + L,
  },
  {
    kind: "bible",
    text:
      "The mustard seed was the smallest seed they planted. That was the whole point of the comparison - Matthew 13:31.\n\n" +
      "So in my game the cheap egg is a Mustard Seed. 350 talents. It is the first thing a new player can afford, and the first companion they get comes out of it." + L,
  },
  {
    kind: "feature",
    text:
      "The rebirth in my game wipes your currency and all your upgrades.\n\n" +
      "It does not touch your island.\n\n" +
      "That was deliberate. Incremental games get hollow when every reset erases everything. The Tabernacle you built stays built. It is the only progress that is truly yours." + L,
  },
  {
    kind: "devlog",
    text:
      "Chapter one of the island is the Tabernacle - seven pieces, built in order.\n\n" +
      "Courtyard curtains. Bronze altar. Basin. The tent. The golden lampstand with seven flames. The table of bread. The ark.\n\n" +
      "Every piece is placed from a spec in a config file, so I can rebalance the whole thing without touching a single part by hand." + L,
  },
  {
    kind: "ask",
    text:
      "If you made a game for kids about the Bible, what is the one thing you would refuse to do?\n\n" +
      "Mine was: no Jesus as a collectable pet. The companions are 15 people from Hebrews 11 - Moses, Ruth, Daniel, Peter, Paul. Witnesses you walk with, not creatures you own." + L,
  },
  {
    kind: "feature",
    text:
      "Three upgrade paths in my manna game and they do genuinely different things.\n\n" +
      "Basket multiplies what each manna is worth.\nFeet make you faster, so you cover more ground.\nReach pulls manna in without touching it.\n\n" +
      "Reach is the strongest, so it is the most expensive. Everything else follows from that." + L,
  },
  {
    kind: "bible",
    text:
      "Canaan was called a land flowing with milk and honey. Exodus 3:8.\n\n" +
      "So the third land in my game is honey-coloured, and the manna there is worth 140x what you pick up in Eden.\n\n" +
      "Players notice the colour before they notice the number. That is usually how it works." + L,
  },
  {
    kind: "devlog",
    text:
      "Fall off a ledge in my game and it does not kill you.\n\n" +
      "There is a plane far below that catches you and puts you back at spawn. The message that comes up says: \"Even so, God loves you to the very end.\"\n\n" +
      "Death screens in kids games are just dead time. This one costs two seconds and says something." + L,
  },
  {
    kind: "feature",
    text:
      "Chapter two of the island is Solomon's Temple.\n\n" +
      "Foundation, the Beautiful Gate, the two pillars Jachin and Boaz, the bronze sea, the Holy Place, and the Most Holy Place behind a torn-coloured veil.\n\n" +
      "It costs about 3 billion talents. It is meant to take a while." + L,
  },
  {
    kind: "ask",
    text:
      "Does anyone else build games nobody plays yet and keep going anyway?\n\n" +
      "14 visits. Three content chapters. An ending with a 13-line poem that almost nobody will reach.\n\n" +
      "I keep adding to it. Not sure that is rational but here we are." + L,
  },
  {
    kind: "feature",
    text:
      "My game speaks your language automatically.\n\n" +
      "The client reads your Roblox locale and swaps every string - HUD, signs, quiz, notifications. Korean in Korea, English everywhere else, and no server round trip.\n\n" +
      "It is one config module that each player holds their own copy of. Simplest thing that worked." + L,
  },
  {
    kind: "bible",
    text:
      "In the Tabernacle God was behind a curtain.\nIn the Temple he was behind a thicker one.\nAt the cross that curtain tore from top to bottom.\n\n" +
      "That is the shape of the island in my game. Three chapters, each one closer, and the last one is the one that opens.\n\n" +
      "The ending just says: there is nothing left to build." + L,
  },
  {
    kind: "devlog",
    text:
      "Chapter three is Golgotha. The hill, three crosses, the tomb, and the stone rolled away.\n\n" +
      "When the stone goes down the screen fades and a poem runs - thirteen lines, no buttons, you just read it.\n\n" +
      "Minecraft did this to me when I was younger and I never forgot it. Felt right to pass it on." + L,
  },
  {
    kind: "feature",
    text:
      "Free, works on phone, no purchases, nothing gated behind Robux.\n\n" +
      "Five lands, 15 companions, a Bible quiz, a private island with three building chapters, and a real ending.\n\n" +
      "Built it for a church summer programme. Leaving it up for anyone." + L,
  },
];

/** 오늘 올릴 글을 고른다. 끝까지 가면 처음으로 돌아온다. */
export function pickPost(cursor: number): { post: Post; next: number } {
  const index = ((cursor % POSTS.length) + POSTS.length) % POSTS.length;
  return { post: POSTS[index], next: (index + 1) % POSTS.length };
}
