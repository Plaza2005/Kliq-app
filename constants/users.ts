export type MockUser = {
  username: string;
  displayName: string;
  bio: string;
  followers: string;
  following: string;
  postCount: number;
  tier: 1 | 2 | 3;
  color: string;
  isVerified: boolean;
  posts: { id: string; color: string; isVideo: boolean; views: string }[];
};

export const MOCK_USERS: Record<string, MockUser> = {
  creator_1: {
    username: 'creator_1', displayName: 'Kofi Acheampong', bio: 'Building Africa\'s tech future, one post at a time. Based in Accra. Founder @techghana',
    followers: '24.8K', following: '412', postCount: 48,
    tier: 2, color: '#00CFFF', isVerified: true,
    posts: [
      { id: 'p1', color: '#0A0A1E', isVideo: true,  views: '8.4K' },
      { id: 'p2', color: '#0A101E', isVideo: true,  views: '14K'  },
      { id: 'p3', color: '#0C0A20', isVideo: false, views: '2.1K' },
      { id: 'p4', color: '#0A0E1E', isVideo: true,  views: '31K'  },
      { id: 'p5', color: '#080A1C', isVideo: false, views: '980'  },
      { id: 'p6', color: '#0A0C1E', isVideo: true,  views: '5.7K' },
    ],
  },
  naija_vibes: {
    username: 'naija_vibes', displayName: 'Temi Adeyemi', bio: 'Lagos born. Afrobeats life. I make the continent move. Music producer & DJ',
    followers: '212K', following: '1.8K', postCount: 184,
    tier: 3, color: '#FF2D78', isVerified: true,
    posts: [
      { id: 'q1', color: '#1A0A12', isVideo: true,  views: '212K' },
      { id: 'q2', color: '#180A10', isVideo: true,  views: '89K'  },
      { id: 'q3', color: '#1C0A14', isVideo: false, views: '14K'  },
      { id: 'q4', color: '#1A0810', isVideo: true,  views: '340K' },
      { id: 'q5', color: '#180A12', isVideo: true,  views: '55K'  },
      { id: 'q6', color: '#1E0A16', isVideo: false, views: '8.1K' },
    ],
  },
  crypto_africa: {
    username: 'crypto_africa', displayName: 'Kwame Mensah', bio: 'Crypto educator from Accra. Helping Africans build generational wealth through DeFi & blockchain',
    followers: '54.7K', following: '290', postCount: 76,
    tier: 2, color: '#8B5CF6', isVerified: false,
    posts: [
      { id: 'r1', color: '#0A0A20', isVideo: true,  views: '54K'  },
      { id: 'r2', color: '#0A0820', isVideo: false, views: '9.2K' },
      { id: 'r3', color: '#0C0A22', isVideo: true,  views: '27K'  },
      { id: 'r4', color: '#0A0A1E', isVideo: false, views: '4.8K' },
      { id: 'r5', color: '#08081E', isVideo: true,  views: '88K'  },
      { id: 'r6', color: '#0A0C20', isVideo: true,  views: '12K'  },
    ],
  },
  chef_ama: {
    username: 'chef_ama', displayName: 'Ama Owusu', bio: 'Chef & food content creator from Kumasi. Bringing West African cuisine to the world. Cookbook coming 2026',
    followers: '310K', following: '2.1K', postCount: 241,
    tier: 3, color: '#00E5A0', isVerified: true,
    posts: [
      { id: 's1', color: '#0A1210', isVideo: true,  views: '310K' },
      { id: 's2', color: '#0A1410', isVideo: false, views: '41K'  },
      { id: 's3', color: '#0C1210', isVideo: true,  views: '78K'  },
      { id: 's4', color: '#0A1012', isVideo: false, views: '22K'  },
      { id: 's5', color: '#081210', isVideo: true,  views: '195K' },
      { id: 's6', color: '#0A1410', isVideo: true,  views: '56K'  },
    ],
  },
  fashion_ke: {
    username: 'fashion_ke', displayName: 'Wanjiru Kamau', bio: 'Nairobi style. Pan-African fashion advocate. Sustainable fashion is the future. @fashion_ke brand dropping soon',
    followers: '67.3K', following: '920', postCount: 129,
    tier: 2, color: '#00CFFF', isVerified: false,
    posts: [
      { id: 't1', color: '#0A0E1A', isVideo: true,  views: '67K'  },
      { id: 't2', color: '#0A0C1A', isVideo: false, views: '11K'  },
      { id: 't3', color: '#0C0E1A', isVideo: true,  views: '29K'  },
      { id: 't4', color: '#0A0E18', isVideo: false, views: '5.4K' },
      { id: 't5', color: '#08101A', isVideo: true,  views: '44K'  },
      { id: 't6', color: '#0A0C18', isVideo: true,  views: '18K'  },
    ],
  },
  code_africa: {
    username: 'code_africa', displayName: 'Emeka Okafor', bio: 'Teaching 10,000 Africans to code. Software engineer turned educator. Free resources at codeafrica.dev',
    followers: '98.1K', following: '550', postCount: 93,
    tier: 2, color: '#8B5CF6', isVerified: true,
    posts: [
      { id: 'u1', color: '#0C0A20', isVideo: true,  views: '98K'  },
      { id: 'u2', color: '#0A0820', isVideo: false, views: '16K'  },
      { id: 'u3', color: '#0E0A22', isVideo: true,  views: '42K'  },
      { id: 'u4', color: '#0C0A1E', isVideo: false, views: '7.9K' },
      { id: 'u5', color: '#0A0820', isVideo: true,  views: '120K' },
      { id: 'u6', color: '#0C0C20', isVideo: true,  views: '33K'  },
    ],
  },
  artist_ola: {
    username: 'artist_ola', displayName: 'Ola Adunola', bio: 'Visual artist from Lagos. Afrofuturism & digital art. NFTs. Commissions open. Pan-African art movement',
    followers: '43.2K', following: '1.2K', postCount: 67,
    tier: 2, color: '#FF2D78', isVerified: false,
    posts: [
      { id: 'v1', color: '#1A0A10', isVideo: false, views: '43K'  },
      { id: 'v2', color: '#180A0E', isVideo: true,  views: '8.7K' },
      { id: 'v3', color: '#1C0A12', isVideo: false, views: '21K'  },
      { id: 'v4', color: '#1A0810', isVideo: false, views: '14K'  },
      { id: 'v5', color: '#180A0E', isVideo: true,  views: '32K'  },
      { id: 'v6', color: '#1E0A12', isVideo: false, views: '9.1K' },
    ],
  },
  kemi_talks: {
    username: 'kemi_talks', displayName: 'Kemi Adesanya', bio: 'Finance & wealth building for young Africans. Economist. Published author. Building a wealthy continent',
    followers: '156K', following: '780', postCount: 112,
    tier: 3, color: '#00E5A0', isVerified: true,
    posts: [
      { id: 'w1', color: '#0A1410', isVideo: true,  views: '156K' },
      { id: 'w2', color: '#0A1210', isVideo: false, views: '24K'  },
      { id: 'w3', color: '#0C1412', isVideo: true,  views: '88K'  },
      { id: 'w4', color: '#0A1212', isVideo: false, views: '11K'  },
      { id: 'w5', color: '#081410', isVideo: true,  views: '210K' },
      { id: 'w6', color: '#0A1010', isVideo: true,  views: '67K'  },
    ],
  },
  dance_ke: {
    username: 'dance_ke', displayName: 'Jabari Kimani', bio: 'Gengetone. Dance. Nairobi. Africa\'s most viral dance creator. Choreo workshops every Saturday in Westlands',
    followers: '421K', following: '3.4K', postCount: 308,
    tier: 3, color: '#FF7A00', isVerified: true,
    posts: [
      { id: 'x1', color: '#1A0E0A', isVideo: true,  views: '421K' },
      { id: 'x2', color: '#180C0A', isVideo: true,  views: '189K' },
      { id: 'x3', color: '#1C100A', isVideo: false, views: '34K'  },
      { id: 'x4', color: '#1A0E08', isVideo: true,  views: '890K' },
      { id: 'x5', color: '#180E0A', isVideo: true,  views: '240K' },
      { id: 'x6', color: '#1E100C', isVideo: false, views: '18K'  },
    ],
  },
  fitness_sa: {
    username: 'fitness_sa', displayName: 'Thabo Nkosi', bio: 'Cape Town fitness coach. African body, African mindset. Personal training & nutrition. DM for bookings',
    followers: '28.6K', following: '1.1K', postCount: 54,
    tier: 1, color: '#00CFFF', isVerified: false,
    posts: [
      { id: 'y1', color: '#0A101C', isVideo: true,  views: '28K'  },
      { id: 'y2', color: '#0A0E1C', isVideo: false, views: '4.2K' },
      { id: 'y3', color: '#0C101C', isVideo: true,  views: '12K'  },
      { id: 'y4', color: '#0A0E1A', isVideo: false, views: '1.8K' },
      { id: 'y5', color: '#08101C', isVideo: true,  views: '9.4K' },
      { id: 'y6', color: '#0A101A', isVideo: false, views: '660'  },
    ],
  },
  seller_5: {
    username: 'seller_5', displayName: 'Aisha Mohammed', bio: 'Handmade African textiles & accessories. Shipping across the continent. DM to order. Quality guaranteed',
    followers: '4.1K', following: '890', postCount: 32,
    tier: 1, color: '#FF2D78', isVerified: false,
    posts: [
      { id: 'z1', color: '#1A0A14', isVideo: false, views: '4K'   },
      { id: 'z2', color: '#180A12', isVideo: false, views: '2.1K' },
      { id: 'z3', color: '#1C0A16', isVideo: true,  views: '890'  },
      { id: 'z4', color: '#1A0A14', isVideo: false, views: '1.4K' },
    ],
  },
};
