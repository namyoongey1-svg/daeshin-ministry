/**
 * 로블록스 게임 "마나 수집 시뮬레이터" 홍보 글 묶음.
 *
 * 묶음이 둘이다. 보는 사람이 달라서 글도 달라야 한다.
 *
 *   ko  — 기존 전도사 계정. 주일학교 교사·부교역자·학부모가 본다.
 *         이분들은 게임을 "쓸" 사람이라, 기능 자랑보다 "어디에 쓸 수 있는가"를 말한다.
 *   en  — 게임용 새 계정(토큰 생기면). 해외 로블록스 유저가 본다.
 *
 * 하루에 하나씩 차례로 올라가고, 끝까지 가면 처음으로 돌아온다.
 * 순서는 섞지 않는다 — 성격이 번갈아 나오도록 일부러 배치했다.
 *
 * 글자 수는 500자를 넘기면 안 된다(스레드 한도).
 * `npm run manna-threads -- --all` 로 검사한다.
 *
 * 글을 고치거나 더할 때:
 *   - 링크는 끝에 한 줄로 둔다. 가운데 끼면 읽는 흐름이 끊긴다.
 *   - 물음표로 끝나는 글을 서넛에 하나씩 섞는다. 답글이 붙어야 도달이 는다.
 *   - **겪지 않은 일을 쓰지 않는다.** 아직 아이들 반응을 받아 본 적이 없으므로
 *     "아이들이 좋아했다" 같은 문장은 넣지 않았다. 사실만 쓴다.
 */

export const GAME_URL = "https://www.roblox.com/games/108564661539682/Manna-Collect-Simulator";

export type Post = {
  /** 글 성격. 어떤 종류가 반응이 좋은지 나중에 가르려고 남긴다. */
  kind: "feature" | "bible" | "devlog" | "ask" | "teacher";
  text: string;
};

const L = `\n\n${GAME_URL}`;

// ---------------------------------------------------------------------------
// 한국어 — 주일학교 교사·부교역자·학부모
// ---------------------------------------------------------------------------

export const POSTS_KO: Post[] = [
  {
    kind: "teacher",
    text:
      "성경학교 때 쓸 게임이 마땅치 않아서 직접 만들었습니다.\n\n" +
      "로블록스에 올려 둔 만나 수집 게임입니다. 광야에서 만나를 주워 달란트를 모으고, 그 달란트로 자기 섬에 성막을 짓습니다. 성막 다음은 성전, 그다음은 골고다입니다.\n\n" +
      "무료입니다. 결제도 광고도 없습니다." + L,
  },
  {
    kind: "bible",
    text:
      "한 달란트는 데나리온 6,000개입니다.\n\n" +
      "데나리온 하나가 하루 품삯이었으니, 한 달란트는 스무 해 치 품삯입니다.\n\n" +
      "일만 달란트 빚진 종 이야기(마 18:24)가 왜 그렇게 큰 이야기인지는 이 숫자를 알아야 보입니다.\n\n" +
      "게임 화폐를 달란트로 둔 이유입니다. 아이들이 먼저 묻습니다." + L,
  },
  {
    kind: "feature",
    text:
      "게임 안에 성경 퀴즈를 넣었습니다.\n\n" +
      "맞히면 75초 동안 손길이 넓어져서, 가만히 서 있어도 만나가 모여듭니다. 아이들에게는 이게 꽤 큰 보상입니다.\n\n" +
      "문제는 열두 개인데 전부 게임 안에서 실제로 보는 것들입니다. 만나, 광야, 희년, 겨자씨, 달란트. 놀다가 본 단어가 문제로 나오면 훨씬 오래 남습니다." + L,
  },
  {
    kind: "bible",
    text:
      "만나는 흰색이었습니다.\n\n" +
      "출애굽기 16:31 — \"깟씨 같이 희고 맛은 꿀 섞은 과자 같았더라\"\n\n" +
      "그래서 게임 속 광야의 만나도 금색이 아니라 흰색입니다. 작은 것이지만, 나중에 아이가 출애굽기 16장을 읽을 때 이미 본 적이 있는 장면이 됩니다." + L,
  },
  {
    kind: "feature",
    text:
      "이 게임의 중심은 자기 섬입니다.\n\n" +
      "1장 성막 — 뜰의 휘장, 번제단, 물두멍, 성소 천막, 금 등잔대, 진설병 상, 언약궤\n" +
      "2장 성전 — 기초, 야긴과 보아스, 놋바다, 성소, 지성소\n" +
      "3장 골고다 — 언덕, 십자가, 돌무덤, 굴려진 돌\n\n" +
      "순서대로 하나씩 세웁니다. 다 세우면 게임이 끝납니다." + L,
  },
  {
    kind: "ask",
    text:
      "주일학교에서 게임을 써 보신 분 계실까요?\n\n" +
      "아이들이 로블록스에 있는 시간이 교회에 있는 시간보다 긴 건 확실한데, 그 안에 쓸 만한 게 거의 없더군요.\n\n" +
      "그래서 하나 만들어 올려 두긴 했는데, 실제 현장에서 어떻게 쓰이는지는 아직 모르겠습니다." + L,
  },
  {
    kind: "bible",
    text:
      "희년은 오십 년마다 왔습니다.\n\n" +
      "빚이 없어지고, 판 땅이 본래 주인에게 돌아가고, 종으로 팔린 사람이 집으로 갔습니다. 레위기 25장.\n\n" +
      "초기화 버튼이 들어 있는 경제입니다.\n\n" +
      "게임의 리버스를 희년이라고 부른 이유입니다. 달란트는 0이 되지만 복은 남습니다." + L,
  },
  {
    kind: "feature",
    text:
      "동무(펫)를 성경 인물로 했습니다. 열다섯 명입니다.\n\n" +
      "모세, 아브라함, 요셉, 룻, 여호수아, 다윗, 이사야, 예레미야, 다니엘, 마태, 요한, 베드로, 바울, 바나바, 디모데.\n\n" +
      "예수님과 하나님은 넣지 않았습니다. 뽑아서 부리는 대상이 될 수 없다고 봤습니다. 히브리서 11장이 믿음의 본으로 드는 분들만 모았습니다." + L,
  },
  {
    kind: "feature",
    text:
      "동무를 같은 계열로 맞추면 보너스가 붙습니다.\n\n" +
      "모세오경 · 역사서 · 선지서 · 복음서 · 서신서\n\n" +
      "셋을 같은 계열로 채우면 +75%입니다. 그러다 보면 아이가 \"다니엘은 무슨 서야?\" 를 먼저 묻습니다. 성경의 구조를 외우게 하려고 넣은 장치입니다." + L,
  },
  {
    kind: "devlog",
    text:
      "떨어져 죽는 화면을 없앴습니다.\n\n" +
      "난간을 넘어가면 아래에서 받아서 처음 자리로 돌려보냅니다. 그때 뜨는 문장은 이렇습니다.\n\n" +
      "\"그래도 하나님은 당신을 끝까지 사랑하십니다\"\n\n" +
      "어차피 죽는 장면은 비는 시간입니다. 2초면 지나가는데 그 2초에 한 문장은 넣을 수 있습니다." + L,
  },
  {
    kind: "bible",
    text:
      "과부가 헌금함에 넣은 두 렙돈은 신약에서 가장 작은 동전이었습니다. 마가복음 12:42.\n\n" +
      "게임 안에 화폐 배움터 간판을 세워 두었습니다. 렙돈 → 데나리온 → 세겔 → 미나 → 달란트 순서로 얼마나 차이가 나는지 적혀 있습니다.\n\n" +
      "숫자가 그냥 숫자가 아니게 되는 지점입니다." + L,
  },
  {
    kind: "feature",
    text:
      "다른 사람에게 달란트를 나눠 줄 수 있습니다.\n\n" +
      "구제함 발판을 밟으면 가까이 있는 사람들에게 내 달란트의 10%가 나뉩니다. 나눈 사람에게는 40초 동안 손길이 열립니다.\n\n" +
      "손해가 되면 아무도 안 누릅니다. 주는 것이 받는 것보다 복이 있다(행 20:35)를 숫자로 옮기면 이렇게 됩니다." + L,
  },
  {
    kind: "bible",
    text:
      "겨자씨는 모든 씨보다 작습니다. 마태복음 13:31-32에서 그 작음이 비유의 핵심입니다.\n\n" +
      "그래서 게임에서 제일 싼 알이 겨자씨입니다. 350달란트. 새로 들어온 아이가 처음으로 살 수 있는 것이고, 첫 동무가 거기서 나옵니다." + L,
  },
  {
    kind: "teacher",
    text:
      "교사용으로 쓰신다면 이런 순서가 될 것 같습니다.\n\n" +
      "1. 10분 — 자유롭게 만나 줍기\n" +
      "2. 5분 — 화폐 배움터 간판 같이 읽기 (렙돈~달란트)\n" +
      "3. 10분 — 성경 퀴즈 패드에서 각자 풀기\n" +
      "4. 나머지 — 자기 섬에 성막 짓기\n\n" +
      "성막 기물 이름이 그대로 나오니 그걸로 이야기를 이어가시면 됩니다." + L,
  },
  {
    kind: "feature",
    text:
      "땅이 다섯 개입니다.\n\n" +
      "에덴 동산 → 광야 → 약속의 땅 → 성전 → 새 예루살렘\n\n" +
      "뒤로 갈수록 만나의 가치가 열 배씩 뜁니다. 더 좋은 숫자를 쫓아가다 보면 성경의 지리를 한 바퀴 걷게 되는 구조로 짰습니다." + L,
  },
  {
    kind: "devlog",
    text:
      "제일 많이 쓰이던 기능을 지웠습니다.\n\n" +
      "원래는 바구니를 채우고 곳간까지 걸어가 파는 방식이었습니다. 이 장르의 기본 구조입니다.\n\n" +
      "그런데 옆에서 보니 아이가 하는 일의 대부분이 걷기였습니다. 지금은 만나를 밟는 즉시 달란트가 됩니다.\n\n" +
      "소득이 50배쯤 뛰어서 하루 종일 밸런스를 다시 잡았습니다." + L,
  },
  {
    kind: "bible",
    text:
      "성막에서 하나님은 휘장 뒤에 계셨습니다.\n성전에서는 더 두꺼운 휘장 뒤에 계셨습니다.\n십자가에서 그 휘장이 위에서 아래로 찢어졌습니다.\n\n" +
      "게임 속 섬이 이 순서입니다. 세 장이고, 뒤로 갈수록 가까워지고, 마지막 장이 여는 장입니다.\n\n" +
      "다 지으면 글이 하나 흐르고 끝납니다." + L,
  },
  {
    kind: "ask",
    text:
      "아이들이 제일 어려워하는 성경 단어가 뭘까요?\n\n" +
      "저는 달란트, 희년, 지성소 셋을 꼽고 게임 안에 넣었습니다. 설명을 읽는 게 아니라 쓰면서 익히게 하려고요.\n\n" +
      "현장에 계신 분들 보시기에 더 급한 단어가 있으면 알려주시면 넣겠습니다." + L,
  },
  {
    kind: "feature",
    text:
      "쓸모없어진 동무는 합칠 수 있습니다.\n\n" +
      "같은 등급 셋을 모으면 한 단계 위로 올라갑니다. 지금 데리고 다니는 셋은 건드리지 않으니 실수로 좋은 걸 날릴 일이 없습니다.\n\n" +
      "창을 따로 열지 않고 발판만 밟으면 됩니다. 아이들이 쓰는 게임에서는 메뉴 하나가 곧 이탈입니다." + L,
  },
  {
    kind: "devlog",
    text:
      "변수 이름을 한글로 썼다가 게임이 통째로 멈췄습니다.\n\n" +
      "로블록스가 쓰는 Luau는 변수 이름에 영문만 허용합니다. 한 줄 때문에 서버 스크립트 전체가 컴파일되지 않았고, 맵이 생성되지 않아 캐릭터가 하늘에서 끝없이 떨어졌습니다.\n\n" +
      "에러 창도 안 뜹니다. 그냥 빈 하늘입니다. 검사기를 하나 만들어 붙였습니다." + L,
  },
  {
    kind: "feature",
    text:
      "접속하는 나라에 따라 언어가 자동으로 바뀝니다.\n\n" +
      "한국에서 들어오면 한국어, 그 밖에는 영어입니다. 화면의 글자, 간판, 알림, 퀴즈까지 전부 바뀝니다.\n\n" +
      "휴대폰에서도 됩니다. 아이들 대부분이 휴대폰으로 들어옵니다." + L,
  },
  {
    kind: "bible",
    text:
      "약속의 땅은 젖과 꿀이 흐르는 땅이라고 불렸습니다. 출애굽기 3:8.\n\n" +
      "그래서 게임 속 세 번째 땅은 꿀빛입니다. 거기 만나는 에덴보다 140배 값이 나갑니다.\n\n" +
      "아이들은 숫자보다 색을 먼저 알아봅니다. 대개 그렇습니다." + L,
  },
  {
    kind: "teacher",
    text:
      "들어가는 법만 적어 둡니다.\n\n" +
      "로블록스 앱이나 PC에서 \"Manna Collect Simulator\" 로 검색하시거나, 아래 링크를 누르시면 됩니다. 계정은 아이들이 대부분 이미 갖고 있습니다.\n\n" +
      "무료이고 결제 항목이 없습니다. 교사가 미리 한 번 들어가 보시는 걸 권합니다." + L,
  },
  {
    kind: "devlog",
    text:
      "3장 골고다에는 언덕과 십자가 셋, 돌무덤과 굴려진 돌이 있습니다.\n\n" +
      "마지막 돌을 굴리면 화면이 어두워지고 열세 줄짜리 글이 흐릅니다. 버튼은 없고 그냥 읽습니다.\n\n" +
      "어릴 때 마인크래프트 엔딩을 보고 한참 앉아 있었던 기억이 있습니다. 그걸 넘겨주고 싶었습니다." + L,
  },
];

// ---------------------------------------------------------------------------
// 영어 — 해외 로블록스 유저 (토큰이 생기면 켜진다)
// ---------------------------------------------------------------------------

export const POSTS_EN: Post[] = [
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

// ---------------------------------------------------------------------------
// 묶음 설정
// ---------------------------------------------------------------------------

export type PackName = "ko" | "en";

export type Pack = {
  posts: Post[];
  /** 스레드 주제 태그. 1~50자, 마침표와 & 는 쓸 수 없다. */
  topic: string;
  /** Supabase app_secrets 에 적힌 토큰 이름. */
  tokenSecret: string;
  /** 처음 넣을 때 쓰는 환경변수 이름. */
  tokenEnv: string;
  /**
   * 이 묶음이 토큰을 연장해도 되는가.
   *
   * ko 는 청빙공고 글과 **같은 계정**을 쓴다. 그쪽 scripts/threads.ts 가
   * 이미 날마다 연장하고 있으므로 여기서 또 연장하면 둘이 엇갈린다.
   * 읽기만 한다.
   */
  refreshToken: boolean;
  /** 기념 글. 사람이 보는 말이라 묶음마다 다르다. */
  milestone: (visits: number) => string;
  /** Supabase 에 남기는 표시들. 묶음끼리 겹치면 안 된다. */
  keys: { lastDay: string; cursor: string; milestone: string };
};

export const PACKS: Record<PackName, Pack> = {
  ko: {
    posts: POSTS_KO,
    topic: "주일학교",
    tokenSecret: "threads_token",
    tokenEnv: "THREADS_ACCESS_TOKEN",
    refreshToken: false,
    milestone: (visits) =>
      `만나 수집 게임 방문이 ${visits.toLocaleString("ko-KR")}회를 넘었습니다.\n\n` +
      "들어와 주신 분들, 아이들에게 틀어 주신 분들 고맙습니다.\n\n" +
      "여전히 무료이고, 결제 항목은 앞으로도 넣지 않습니다." +
      `\n\n${GAME_URL}`,
    keys: {
      lastDay: "manna_ko_last_day",
      cursor: "manna_ko_cursor",
      milestone: "manna_ko_milestone",
    },
  },
  en: {
    posts: POSTS_EN,
    topic: "Roblox",
    tokenSecret: "manna_threads_token",
    tokenEnv: "MANNA_THREADS_ACCESS_TOKEN",
    refreshToken: true,
    milestone: (visits) =>
      `${visits.toLocaleString("en-US")} visits.\n\n` +
      "Thank you to everyone who opened a land, raised a companion, or laid a stone on their island.\n\n" +
      "Still free, still no purchases, still has an ending." +
      `\n\n${GAME_URL}`,
    keys: {
      lastDay: "manna_threads_last_day",
      cursor: "manna_threads_cursor",
      milestone: "manna_threads_milestone",
    },
  },
};

/** 오늘 올릴 글을 고른다. 끝까지 가면 처음으로 돌아온다. */
export function pickPost(posts: Post[], cursor: number): { post: Post; next: number } {
  const index = ((cursor % posts.length) + posts.length) % posts.length;
  return { post: posts[index], next: (index + 1) % posts.length };
}
