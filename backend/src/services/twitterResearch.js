const { twitterApiGet } = require('./twitterApi');

const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_TOP_LIMIT = 12;

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during',
  'each',
  'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just',
  'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too',
  'under', 'until', 'up',
  'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'rt', 'im', 'amp', 'via', 'https', 'http', 'co', 'u', 'us',
]);

const CRYPTO_TOPIC_RULES = [
  {
    name: 'Ethereum protocol updates',
    keywords: [
      'ethereum',
      'eth',
      'protocol',
      'upgrade',
      'upgrades',
      'eip',
      'fork',
      'forks',
      'pectra',
      'dencun',
      'cancun',
      'deneb',
      'verkle',
      'proto-danksharding',
      'danksharding',
      'blob',
      'blobs',
      'EOF',
    ],
  },
  {
    name: 'Staking and validators',
    keywords: [
      'staking',
      'stake',
      'validator',
      'validators',
      'restaking',
      'slashing',
      'attestation',
      'attestations',
      'solo staking',
      'home staking',
      'lido',
      'rocketpool',
      'eigenlayer',
    ],
  },
  {
    name: 'Decentralization',
    keywords: [
      'decentralization',
      'decentralized',
      'censorship resistance',
      'censorship-resistance',
      'client diversity',
      'liveness',
      'neutrality',
      'permissionless',
      'self-custody',
      'self custody',
      'distributed',
      'solo stakers',
    ],
  },
  {
    name: 'Institutional ETH adoption',
    keywords: [
      'institutional',
      'institutions',
      'adoption',
      'etf',
      'spot etf',
      'blackrock',
      'fidelity',
      'treasury',
      'corporate treasury',
      'balance sheet',
      'fund',
      'funds',
      'allocations',
      'etp',
    ],
  },
  {
    name: 'Layer 2 ecosystem',
    keywords: [
      'layer 2',
      'layer2',
      'l2',
      'rollup',
      'rollups',
      'base',
      'arbitrum',
      'optimism',
      'zksync',
      'starknet',
      'scroll',
      'linea',
      'manta',
      'op stack',
      'superchain',
    ],
  },
  {
    name: 'Cybersecurity and blockchain infrastructure',
    keywords: [
      'cybersecurity',
      'security',
      'hack',
      'hacked',
      'exploit',
      'exploit',
      'audit',
      'audits',
      'bug bounty',
      'bridge',
      'bridges',
      'infrastructure',
      'infra',
      'node',
      'nodes',
      'rpc',
      'client',
      'clients',
      'relayer',
      'sequencer',
    ],
  },
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeListId(input) {
  return String(input || '').trim();
}

function extractTweets(payload) {
  if (!payload) {
    return [];
  }

  const candidates = [
    payload.tweets,
    payload.data?.tweets,
    payload.data,
    payload.result?.tweets,
    payload.result,
    payload.items,
    payload,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function parseTweetDate(rawTweet) {
  const rawDate = rawTweet.created_at || rawTweet.createdAt || rawTweet.tweet_created_at || rawTweet.time;
  if (!rawDate) {
    return null;
  }
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractTweetText(rawTweet) {
  return String(rawTweet.full_text || rawTweet.text || rawTweet.note_tweet?.text || '').trim();
}

function extractEngagement(rawTweet) {
  const metrics = rawTweet.public_metrics || rawTweet.metrics || rawTweet.legacy || {};
  const likes = toNumber(metrics.like_count || rawTweet.like_count || rawTweet.likeCount || rawTweet.favorite_count, 0);
  const replies = toNumber(metrics.reply_count || rawTweet.reply_count || rawTweet.replyCount, 0);
  const retweets = toNumber(metrics.retweet_count || rawTweet.retweet_count || rawTweet.retweetCount, 0);
  const quotes = toNumber(metrics.quote_count || rawTweet.quote_count || rawTweet.quoteCount, 0);
  const bookmarks = toNumber(metrics.bookmark_count || rawTweet.bookmark_count || rawTweet.bookmarkCount, 0);
  const impressions = toNumber(
    metrics.impression_count || metrics.view_count || rawTweet.impression_count || rawTweet.view_count || rawTweet.viewCount,
    0
  );

  return {
    likes,
    replies,
    retweets,
    quotes,
    bookmarks,
    impressions,
    score: likes + replies * 2 + retweets * 2 + quotes * 2 + bookmarks,
  };
}

function extractHashtags(text) {
  const matches = text.match(/#[a-z0-9_]+/gi) || [];
  return matches.map((tag) => tag.slice(1).toLowerCase()).filter(Boolean);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#][a-z0-9_]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function incrementCount(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function pickTop(map, limit) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function classifyTopics(tokens, hashtags, textLower) {
  const tokenSet = new Set(tokens);
  const hashtagSet = new Set(hashtags);
  const topics = [];

  for (const rule of CRYPTO_TOPIC_RULES) {
    const matched = rule.keywords.some((keyword) => {
      const normalized = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        tokenSet.has(normalized) ||
        hashtagSet.has(normalized) ||
        textLower.includes(` ${keyword.toLowerCase()} `) ||
        textLower.startsWith(`${keyword.toLowerCase()} `) ||
        textLower.endsWith(` ${keyword.toLowerCase()}`)
      );
    });

    if (matched) {
      topics.push(rule.name);
    }
  }

  return topics;
}

async function fetchResearchListTweets(listIdInput) {
  const listId = normalizeListId(listIdInput);
  if (!listId) {
    throw new Error('Missing list ID. Provide TWITTER_RESEARCH_LIST_ID or pass listId in request query.');
  }

  const queries = [
    { listId },
    { list_id: listId },
    { id: listId },
  ];

  const attempts = [];

  for (const query of queries) {
    try {
      const payload = await twitterApiGet('/twitter/list/tweets_timeline', query);
      const tweets = extractTweets(payload);
      if (tweets.length > 0) {
        return { tweets, queryUsed: query };
      }
      attempts.push({ query, message: 'Response returned zero tweets' });
    } catch (error) {
      attempts.push({ query, message: error.message, upstream: error.upstream || null });
    }
  }

  const error = new Error(`Unable to fetch tweets_timeline for list ID "${listId}"`);
  error.attempts = attempts;
  throw error;
}

function analyzeTweetsForCryptoTrends(rawTweets, { windowDays = DEFAULT_WINDOW_DAYS, topLimit = DEFAULT_TOP_LIMIT } = {}) {
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - windowDays);

  const hashtagCounts = new Map();
  const keywordCounts = new Map();
  const topicCounts = new Map();
  const topicEngagement = new Map();

  const analyzedTweets = [];

  for (const rawTweet of rawTweets) {
    const publishedAt = parseTweetDate(rawTweet);
    if (!publishedAt || publishedAt < from || publishedAt > now) {
      continue;
    }

    const text = extractTweetText(rawTweet);
    if (!text) {
      continue;
    }

    const textLower = ` ${text.toLowerCase()} `;
    const hashtags = extractHashtags(text);
    const tokens = tokenize(text);
    const engagement = extractEngagement(rawTweet);
    const topics = classifyTopics(tokens, hashtags, textLower);

    hashtags.forEach((tag) => incrementCount(hashtagCounts, tag));
    tokens.forEach((token) => incrementCount(keywordCounts, token));

    topics.forEach((topic) => {
      incrementCount(topicCounts, topic);
      incrementCount(topicEngagement, topic, engagement.score);
    });

    analyzedTweets.push({
      id: String(rawTweet.id_str || rawTweet.id || rawTweet.tweet_id || rawTweet.rest_id || ''),
      text,
      author: rawTweet.user?.screen_name || rawTweet.user?.username || rawTweet.author?.username || null,
      publishedAt,
      hashtags,
      topics,
      engagement,
    });
  }

  const topHashtags = pickTop(hashtagCounts, topLimit).map((entry) => ({
    hashtag: entry.name,
    count: entry.count,
  }));

  const topKeywords = pickTop(keywordCounts, topLimit).map((entry) => ({
    keyword: entry.name,
    count: entry.count,
  }));

  const topicBreakdown = pickTop(topicCounts, topLimit).map((entry) => {
    const engagementScore = topicEngagement.get(entry.name) || 0;
    const avgEngagementScore = entry.count > 0 ? Number((engagementScore / entry.count).toFixed(2)) : 0;
    return {
      topic: entry.name,
      mentionCount: entry.count,
      avgEngagementScore,
      trendScore: Number((entry.count * (1 + avgEngagementScore / 100)).toFixed(2)),
    };
  });

  const mostEngagedTweets = analyzedTweets
    .slice()
    .sort((a, b) => b.engagement.score - a.engagement.score)
    .slice(0, 8)
    .map((tweet) => ({
      id: tweet.id,
      author: tweet.author,
      publishedAt: tweet.publishedAt,
      text: tweet.text,
      topics: tweet.topics,
      hashtags: tweet.hashtags,
      engagement: tweet.engagement,
    }));

  const dailyVolumeMap = new Map();
  analyzedTweets.forEach((tweet) => {
    const dayKey = tweet.publishedAt.toISOString().slice(0, 10);
    incrementCount(dailyVolumeMap, dayKey, 1);
  });

  const dailyVolume = Array.from(dailyVolumeMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, tweetCount]) => ({ day, tweetCount }));

  return {
    window: {
      days: windowDays,
      from,
      to: now,
    },
    fetchedTweets: rawTweets.length,
    analyzedTweets: analyzedTweets.length,
    topHashtags,
    topKeywords,
    topicBreakdown,
    dailyVolume,
    mostEngagedTweets,
  };
}

async function getCryptoTrendAnalysis({ listId, windowDays = DEFAULT_WINDOW_DAYS, topLimit = DEFAULT_TOP_LIMIT } = {}) {
  const resolvedListId = normalizeListId(listId || process.env.TWITTER_RESEARCH_LIST_ID);
  const { tweets, queryUsed } = await fetchResearchListTweets(resolvedListId);
  const analysis = analyzeTweetsForCryptoTrends(tweets, {
    windowDays: Number(windowDays) > 0 ? Number(windowDays) : DEFAULT_WINDOW_DAYS,
    topLimit: Number(topLimit) > 0 ? Number(topLimit) : DEFAULT_TOP_LIMIT,
  });

  return {
    listId: resolvedListId,
    queryUsed,
    ...analysis,
  };
}

module.exports = {
  analyzeTweetsForCryptoTrends,
  fetchResearchListTweets,
  getCryptoTrendAnalysis,
};
