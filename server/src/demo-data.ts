import { PrismaClient, User, Post, Product } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Demo / test data management.
 *
 * All demo accounts are created with an email ending in DEMO_EMAIL_DOMAIN so
 * they can be identified and removed safely without ever touching admin
 * accounts or real users. LEGACY_FAKE_EMAILS covers fake users created by the
 * old seed script (see purge-fake-data.ts).
 */

export const DEMO_EMAIL_DOMAIN = "@demo.kliq.app";

const LEGACY_FAKE_EMAILS = [
  "alex@kliq.app",
  "mia@kliq.app",
  "dj@kliq.app",
  "kai@kliq.app",
  "sarah@kliq.app",
  "fit@kliq.app",
];

export type DemoSummary = Record<string, number>;

// ── Clear ──────────────────────────────────────────────────────────────────

export async function clearDemoData(prisma: PrismaClient): Promise<DemoSummary> {
  const demoUsers = await prisma.user.findMany({
    where: {
      isAdmin: false, // never remove admin accounts, no matter what
      OR: [
        { email: { endsWith: DEMO_EMAIL_DOMAIN } },
        { email: { in: LEGACY_FAKE_EMAILS } },
      ],
    },
    select: { id: true },
  });
  const ids = demoUsers.map(u => u.id);

  const summary: DemoSummary = {
    users: 0, posts: 0, comments: 0, products: 0,
    communities: 0, streamTitles: 0, sessions: 0, reports: 0,
  };
  if (ids.length === 0) return summary;

  const demoPosts = await prisma.post.findMany({
    where: { authorId: { in: ids } },
    select: { id: true },
  });
  const postIds = demoPosts.map(p => p.id);

  // Counts for the summary (these rows are removed below, directly or via cascade)
  summary.posts = postIds.length;
  summary.comments = await prisma.comment.count({
    where: { OR: [{ authorId: { in: ids } }, { postId: { in: postIds } }] },
  });
  summary.products = await prisma.product.count({ where: { sellerId: { in: ids } } });

  // ── Rows that would block user deletion (relations without ON DELETE CASCADE)
  summary.reports = (await prisma.report.deleteMany({
    where: { OR: [{ postId: { in: postIds } }, { reporterId: { in: ids } }] },
  })).count;
  await prisma.userReport.deleteMany({
    where: { OR: [{ reporterId: { in: ids } }, { targetId: { in: ids } }] },
  });
  await prisma.bookmark.deleteMany({
    where: { OR: [{ postId: { in: postIds } }, { userId: { in: ids } }] },
  });
  await prisma.postHashtag.deleteMany({ where: { postId: { in: postIds } } });

  // Polls on demo posts + demo users' votes
  await prisma.pollVote.deleteMany({ where: { userId: { in: ids } } });
  const demoPolls = await prisma.poll.findMany({
    where: { postId: { in: postIds } },
    select: { id: true },
  });
  if (demoPolls.length > 0) {
    const pollIds = demoPolls.map(p => p.id);
    await prisma.pollVote.deleteMany({ where: { pollId: { in: pollIds } } });
    await prisma.pollOption.deleteMany({ where: { pollId: { in: pollIds } } });
    await prisma.poll.deleteMany({ where: { id: { in: pollIds } } });
  }

  // Sounds created by demo users / attached to demo posts
  await prisma.postSound.deleteMany({
    where: { OR: [{ postId: { in: postIds } }, { sound: { authorId: { in: ids } } }] },
  });
  await prisma.sound.deleteMany({ where: { authorId: { in: ids } } });

  // Likes are plain rows without FK relations
  await prisma.like.deleteMany({
    where: { OR: [{ userId: { in: ids } }, { targetId: { in: postIds } }] },
  });

  summary.sessions = (await prisma.userSession.deleteMany({ where: { userId: { in: ids } } })).count;
  await prisma.liveStream.deleteMany({ where: { userId: { in: ids } } });
  await prisma.liveGift.deleteMany({ where: { senderId: { in: ids } } });
  await prisma.block.deleteMany({
    where: { OR: [{ blockerId: { in: ids } }, { blockedId: { in: ids } }] },
  });
  await prisma.mute.deleteMany({
    where: { OR: [{ muterId: { in: ids } }, { mutedId: { in: ids } }] },
  });
  await prisma.watchProgress.deleteMany({ where: { userId: { in: ids } } });

  const playlists = await prisma.kliqPlaylist.findMany({
    where: { userId: { in: ids } },
    select: { id: true },
  });
  if (playlists.length > 0) {
    const playlistIds = playlists.map(p => p.id);
    await prisma.kliqPlaylistItem.deleteMany({ where: { playlistId: { in: playlistIds } } });
    await prisma.kliqPlaylist.deleteMany({ where: { id: { in: playlistIds } } });
  }

  await prisma.badgeRequest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userInterest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.creatorSubscription.deleteMany({
    where: { OR: [{ subscriberId: { in: ids } }, { creatorId: { in: ids } }] },
  });

  // KliqStream titles authored by demo users (episodes -> seasons -> titles)
  const titles = await prisma.kliqStreamTitle.findMany({
    where: { authorId: { in: ids } },
    select: { id: true },
  });
  if (titles.length > 0) {
    const titleIds = titles.map(t => t.id);
    const seasons = await prisma.kliqSeason.findMany({
      where: { titleId: { in: titleIds } },
      select: { id: true },
    });
    if (seasons.length > 0) {
      const seasonIds = seasons.map(s => s.id);
      await prisma.kliqEpisode.deleteMany({ where: { seasonId: { in: seasonIds } } });
      await prisma.kliqSeason.deleteMany({ where: { id: { in: seasonIds } } });
    }
    summary.streamTitles = (await prisma.kliqStreamTitle.deleteMany({ where: { id: { in: titleIds } } })).count;
  }

  // Group chats created by demo users, plus demo users' membership rows
  await prisma.groupMessage.deleteMany({
    where: { OR: [{ senderId: { in: ids } }, { group: { createdBy: { in: ids } } }] },
  });
  await prisma.groupChatMember.deleteMany({
    where: { OR: [{ userId: { in: ids } }, { group: { createdBy: { in: ids } } }] },
  });
  await prisma.groupChat.deleteMany({ where: { createdBy: { in: ids } } });

  // Communities created by demo users
  const communities = await prisma.community.findMany({
    where: { creatorId: { in: ids } },
    select: { id: true },
  });
  if (communities.length > 0) {
    const communityIds = communities.map(c => c.id);
    await prisma.communityMessage.deleteMany({ where: { communityId: { in: communityIds } } });
    await prisma.communityMember.deleteMany({ where: { communityId: { in: communityIds } } });
    summary.communities = (await prisma.community.deleteMany({ where: { id: { in: communityIds } } })).count;
  }

  // Direct-message threads that involve demo users (messages/participants cascade)
  const participantRows = await prisma.threadParticipant.findMany({
    where: { userId: { in: ids } },
    select: { threadId: true },
  });
  const threadIds = [...new Set(participantRows.map(p => p.threadId))];
  if (threadIds.length > 0) {
    await prisma.thread.deleteMany({ where: { id: { in: threadIds } } });
  }

  // Finally the users themselves — posts, comments, follows, notifications,
  // wallets, campaigns, stories, products, orders etc. cascade from here.
  summary.users = (await prisma.user.deleteMany({
    where: { id: { in: ids }, isAdmin: false },
  })).count;

  return summary;
}

// ── Load ───────────────────────────────────────────────────────────────────

const PROFILES = [
  { username: "demo_amara",  displayName: "Amara Okafor",  bio: "Lifestyle creator · sunsets & city life",  tier: "pro",  verified: true  },
  { username: "demo_tendai", displayName: "Tendai Moyo",   bio: "Filmmaker. Stories from Harare.",          tier: "plus", verified: true  },
  { username: "demo_naledi", displayName: "Naledi Arts",   bio: "Digital artist & illustrator",             tier: "free", verified: false },
  { username: "demo_kwame",  displayName: "Kwame Beats",   bio: "Producer · Afrobeats & amapiano",          tier: "plus", verified: false },
  { username: "demo_zola",   displayName: "Zola Fit",      bio: "Fitness coach — no excuses",               tier: "free", verified: false },
  { username: "demo_lerato", displayName: "Lerato Cooks",  bio: "Home chef sharing family recipes",         tier: "free", verified: false },
  { username: "demo_sipho",  displayName: "Sipho Tech",    bio: "Gadget reviews & tech talk",               tier: "pro",  verified: true  },
  { username: "demo_aisha",  displayName: "Aisha Styles",  bio: "Fashion & thrift finds",                   tier: "plus", verified: false },
];

const POST_BODIES = [
  "Golden hour hits different in Windhoek 🌅 #sunset #citylife",
  "New project dropping this weekend. Stay tuned 👀",
  "Work in progress — what do you think of the colours? #art",
  "This beat has been stuck in my head all week 🎧 #amapiano",
  "Day 30 of the challenge. Consistency beats motivation. #fitness",
  "Grandma's stew recipe, finally written down ❤️ #cooking",
  "Unboxing the new flagship — full review coming soon #tech",
  "Thrift haul of the month. Total spend: less than you think 🛍️",
  "Behind the scenes from yesterday's shoot 🎬",
  "POV: your weekend plans just got better",
  "Little details make the biggest difference ✨",
  "Tell me your favourite in the comments 👇",
];

const POST_TYPES = ["post", "post", "reel", "tube", "post", "reel", "marketplace", "post"];

const SAMPLE_VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
];

const COMMENT_BODIES = [
  "This is amazing! 🔥",
  "Love this so much",
  "Where was this taken?",
  "Been waiting for this one",
  "Tutorial please! 🙏",
  "Instant classic",
];

export async function loadDemoData(prisma: PrismaClient): Promise<DemoSummary> {
  // Start from a clean slate so calling this twice never duplicates data.
  await clearDemoData(prisma);

  const password = await bcrypt.hash("Demo1234!", 10);
  const nowMs = Date.now();
  const daysAgo = (d: number, hours = 0) => new Date(nowMs - d * 86_400_000 - hours * 3_600_000);
  // Deterministic pseudo-random so repeated loads produce the same shape
  const prand = (seed: number, min: number, max: number) =>
    min + ((seed * 2654435761) % 2 ** 16) % (max - min + 1);

  const POSTS_PER_USER = 4;
  const summary: DemoSummary = {};

  // ── Users ──
  const users: User[] = [];
  for (let i = 0; i < PROFILES.length; i++) {
    const p = PROFILES[i];
    users.push(await prisma.user.create({
      data: {
        email:          `${p.username.replace("demo_", "")}${DEMO_EMAIL_DOMAIN}`,
        password,
        username:       p.username,
        displayName:    p.displayName,
        bio:            p.bio,
        avatarUrl:      `https://i.pravatar.cc/150?img=${11 + i}`,
        tier:           p.tier,
        isVerified:     p.verified,
        status:         "active",
        isOnboarded:    true,
        emailVerified:  true,
        postCount:      POSTS_PER_USER,
        followerCount:  4,
        followingCount: 4,
        createdAt:      daysAgo(i % 7, i),
      },
    }));
  }
  summary.users = users.length;

  // ── Follows (each user follows the next 4, so everyone also has 4 followers) ──
  const followRows: { followerId: string; followingId: string }[] = [];
  users.forEach((u, i) => {
    for (let k = 1; k <= 4; k++) {
      followRows.push({ followerId: u.id, followingId: users[(i + k) % users.length].id });
    }
  });
  summary.follows = (await prisma.follow.createMany({ data: followRows, skipDuplicates: true })).count;

  // ── Posts + comments ──
  let postCount = 0;
  let commentCount = 0;
  const createdPosts: Post[] = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < POSTS_PER_USER; j++) {
      const seed = i * POSTS_PER_USER + j;
      const postType = POST_TYPES[(i + j) % POST_TYPES.length];
      const isVideo = postType === "reel" || postType === "tube";
      const likeCount = prand(seed + 1, 5, 260);

      const post = await prisma.post.create({
        data: {
          authorId:      users[i].id,
          body:          POST_BODIES[seed % POST_BODIES.length],
          postType,
          mediaUrl:      isVideo ? SAMPLE_VIDEOS[seed % SAMPLE_VIDEOS.length] : `https://picsum.photos/seed/kliq${seed}/800/600`,
          mediaType:     isVideo ? "video" : "image",
          thumbUrl:      isVideo ? `https://picsum.photos/seed/kliqthumb${seed}/640/360` : null,
          title:         postType === "tube" ? `${users[i].displayName} — Episode ${j + 1}` : null,
          videoDuration: isVideo ? prand(seed + 2, 30, 600) : null,
          likeCount,
          commentCount:  2,
          shareCount:    prand(seed + 3, 0, 30),
          viewCount:     likeCount * 7 + prand(seed + 4, 10, 400),
          createdAt:     daysAgo((i + j) % 7, j * 3 + i),
        },
      });
      createdPosts.push(post);
      postCount++;

      for (let c = 0; c < 2; c++) {
        await prisma.comment.create({
          data: {
            authorId:  users[(i + c + 1) % users.length].id,
            postId:    post.id,
            body:      COMMENT_BODIES[(seed + c) % COMMENT_BODIES.length],
            likeCount: prand(seed + c + 5, 0, 25),
            createdAt: daysAgo((i + j) % 7, j * 3 + i - 1),
          },
        });
        commentCount++;
      }
    }
  }
  summary.posts = postCount;
  summary.comments = commentCount;

  // ── Notifications ──
  const notifRows = users.flatMap((u, i) => {
    const actor = users[(i + 1) % users.length];
    const actor2 = users[(i + 2) % users.length];
    return [
      { userId: u.id, type: "like",    actorName: actor.displayName,  actorUsername: actor.username,  actorAvatar: actor.avatarUrl,  message: `${actor.displayName} liked your post` },
      { userId: u.id, type: "follow",  actorName: actor2.displayName, actorUsername: actor2.username, actorAvatar: actor2.avatarUrl, message: `${actor2.displayName} started following you` },
      { userId: u.id, type: "comment", actorName: actor.displayName,  actorUsername: actor.username,  actorAvatar: actor.avatarUrl,  message: `${actor.displayName} commented on your post` },
    ];
  });
  summary.notifications = (await prisma.notification.createMany({ data: notifRows })).count;

  // ── Stories ──
  let storyCount = 0;
  for (let i = 0; i < 4; i++) {
    await prisma.story.create({
      data: {
        userId:    users[i].id,
        mediaUrl:  `https://picsum.photos/seed/kliqstory${i}/720/1280`,
        mediaType: "image",
        body:      i % 2 === 0 ? "Today's vibe ✨" : null,
        viewCount: prand(i + 40, 3, 90),
        expiresAt: new Date(nowMs + 20 * 3_600_000),
      },
    });
    storyCount++;
  }
  summary.stories = storyCount;

  // ── Wallets + transactions ──
  let txCount = 0;
  for (let i = 0; i < users.length; i++) {
    const wallet = await prisma.wallet.create({
      data: { userId: users[i].id, balance: 0, tokens: 150 + i * 230 },
    });
    await prisma.walletTransaction.create({
      data: { walletId: wallet.id, type: "topup", title: "Token top-up", amount: String((i + 1) * 5) },
    });
    txCount++;
    if (i % 3 === 0) {
      await prisma.walletTransaction.create({
        data: { walletId: wallet.id, type: "transfer_out", title: "Gift sent", amount: String((i + 1) * 2) },
      });
      txCount++;
    }
  }
  summary.wallets = users.length;
  summary.walletTransactions = txCount;

  // ── Amplify campaigns ──
  await prisma.campaign.create({
    data: { userId: users[1].id, postId: createdPosts[1 * POSTS_PER_USER].id, goal: "reach", budget: 250, duration: 7, reach: 1800 },
  });
  await prisma.campaign.create({
    data: { userId: users[6].id, postId: createdPosts[6 * POSTS_PER_USER].id, goal: "engagement", budget: 400, duration: 14, reach: 3200 },
  });
  summary.campaigns = 2;

  // ── Marketplace products + orders ──
  const productSpecs = [
    { seller: 2, title: "Original digital print — 'Kalahari Dusk'", price: 120, category: "Art",         isDigital: true,  stock: null as number | null },
    { seller: 3, title: "Amapiano sample pack Vol. 3",              price: 80,  category: "Music",       isDigital: true,  stock: null },
    { seller: 4, title: "8-week home workout plan (PDF)",           price: 60,  category: "Fitness",     isDigital: true,  stock: null },
    { seller: 5, title: "Handwritten family recipe zine",           price: 45,  category: "Food",        isDigital: false, stock: 25 },
    { seller: 7, title: "Vintage denim jacket — size M",            price: 200, category: "Fashion",     isDigital: false, stock: 1 },
    { seller: 6, title: "Ring light + phone mount bundle",          price: 350, category: "Electronics", isDigital: false, stock: 8 },
  ];
  const products: Product[] = [];
  for (let i = 0; i < productSpecs.length; i++) {
    const s = productSpecs[i];
    products.push(await prisma.product.create({
      data: {
        sellerId:    users[s.seller].id,
        title:       s.title,
        description: `Demo listing — ${s.title}`,
        price:       s.price,
        mediaUrl:    `https://picsum.photos/seed/kliqproduct${i}/800/800`,
        thumbUrl:    `https://picsum.photos/seed/kliqproduct${i}/400/400`,
        isDigital:   s.isDigital,
        stock:       s.stock,
        category:    s.category,
        condition:   s.isDigital ? null : "good",
        location:    s.isDigital ? null : "Windhoek",
      },
    }));
  }
  summary.products = products.length;

  let orderCount = 0;
  for (let i = 0; i < 3; i++) {
    await prisma.order.create({
      data: {
        buyerId:    users[(i + 1) % users.length].id,
        productId:  products[i].id,
        quantity:   1,
        totalPrice: productSpecs[i].price,
        status:     "paid",
      },
    });
    orderCount++;
  }
  summary.orders = orderCount;

  // ── Communities ──
  const communitySpecs = [
    { creator: 0, name: "Creators Hub",  description: "Tips, collabs and feedback for KLIQ creators" },
    { creator: 4, name: "Fitness Kliq",  description: "Daily accountability and workout check-ins" },
  ];
  let communityMessageCount = 0;
  for (let c = 0; c < communitySpecs.length; c++) {
    const spec = communitySpecs[c];
    const memberIdxs = [spec.creator, (spec.creator + 1) % 8, (spec.creator + 2) % 8, (spec.creator + 3) % 8, (spec.creator + 5) % 8];
    const community = await prisma.community.create({
      data: {
        name:        spec.name,
        description: spec.description,
        avatarUrl:   `https://picsum.photos/seed/kliqcomm${c}/200/200`,
        creatorId:   users[spec.creator].id,
        memberCount: memberIdxs.length,
        members: {
          create: memberIdxs.map((idx, mi) => ({
            userId: users[idx].id,
            role:   mi === 0 ? "admin" : "member",
          })),
        },
      },
    });
    for (let m = 0; m < 5; m++) {
      await prisma.communityMessage.create({
        data: {
          communityId: community.id,
          userId:      users[memberIdxs[m % memberIdxs.length]].id,
          body:        ["Welcome everyone! 👋", "What is everyone working on this week?", "Dropping something new on Friday", "Love the energy in here", "Anyone up for a collab?"][m],
          createdAt:   daysAgo(c + 1, 5 - m),
        },
      });
      communityMessageCount++;
    }
  }
  summary.communities = communitySpecs.length;
  summary.communityMessages = communityMessageCount;

  // ── KliqStream titles ──
  const streamSpecs = [
    { author: 1, type: "movie",  title: "Dust & Gold",        genre: "Drama",       status: "approved", synopsis: "Two brothers chase a rumour of fortune across the Namib." },
    { author: 1, type: "series", title: "Harare Nights",      genre: "Thriller",    status: "pending",  synopsis: "A late-night radio host starts receiving calls about crimes that haven't happened yet." },
    { author: 6, type: "movie",  title: "Signal Lost",        genre: "Sci-Fi",      status: "approved", synopsis: "A township inventor builds a device that picks up broadcasts from tomorrow." },
  ];
  for (let i = 0; i < streamSpecs.length; i++) {
    const s = streamSpecs[i];
    await prisma.kliqStreamTitle.create({
      data: {
        type:      s.type,
        title:     s.title,
        synopsis:  s.synopsis,
        genre:     s.genre,
        ageRating: "PG",
        posterUrl: `https://picsum.photos/seed/kliqposter${i}/400/600`,
        mediaUrl:  SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
        duration:  prand(i + 60, 60, 130),
        authorId:  users[s.author].id,
        status:    s.status,
      },
    });
  }
  summary.streamTitles = streamSpecs.length;

  // ── User sessions (feeds session analytics) ──
  const sessionRows = [];
  for (let i = 0; i < users.length; i++) {
    for (let k = 0; k < 4; k++) {
      const durationS = 300 + prand(i * 7 + k, 0, 2400);
      const startedAt = daysAgo(k * 2, i + 2);
      sessionRows.push({
        userId:   users[i].id,
        startedAt,
        endedAt:  new Date(startedAt.getTime() + durationS * 1000),
        durationS,
        platform: i % 2 === 0 ? "web" : "mobile",
      });
    }
  }
  summary.sessions = (await prisma.userSession.createMany({ data: sessionRows })).count;

  // ── Reports (feeds moderation queue) ──
  await prisma.report.create({
    data: { postId: createdPosts[5 * POSTS_PER_USER].id, reporterId: users[2].id, reason: "Spam" },
  });
  await prisma.report.create({
    data: { postId: createdPosts[7 * POSTS_PER_USER + 1].id, reporterId: users[0].id, reason: "Inappropriate content" },
  });
  summary.reports = 2;

  await prisma.userReport.create({
    data: { reporterId: users[3].id, targetId: users[6].id, reason: "Impersonation" },
  });
  summary.userReports = 1;

  // ── Badge requests ──
  await prisma.badgeRequest.create({
    data: { userId: users[3].id, reason: "Verified producer on other platforms, 50k+ followers" },
  });
  await prisma.badgeRequest.create({
    data: { userId: users[4].id, reason: "Certified fitness coach, growing community" },
  });
  summary.badgeRequests = 2;

  // ── Direct messages ──
  const threadSpecs = [
    { a: 0, b: 1, messages: ["Hey! Loved your latest short film", "Thank you! Yours inspired the colour grade honestly", "We should collab on something", "Deal. Call this week?"] },
    { a: 2, b: 3, messages: ["That sample pack is 🔥", "Glad you like it! New volume soon", "Save me a copy"] },
  ];
  let messageCount = 0;
  for (const t of threadSpecs) {
    const thread = await prisma.thread.create({
      data: {
        participants: { create: [{ userId: users[t.a].id }, { userId: users[t.b].id }] },
      },
    });
    for (let m = 0; m < t.messages.length; m++) {
      await prisma.message.create({
        data: {
          threadId:  thread.id,
          senderId:  users[m % 2 === 0 ? t.a : t.b].id,
          body:      t.messages[m],
          createdAt: daysAgo(1, t.messages.length - m),
        },
      });
      messageCount++;
    }
  }
  summary.threads = threadSpecs.length;
  summary.messages = messageCount;

  return summary;
}
