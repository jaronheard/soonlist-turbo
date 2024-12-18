const dataFor2024 = {
  // -- Basic counts (total events and users)
  // SELECT
  //     (SELECT COUNT(DISTINCT id) FROM events WHERE YEAR(created_at) = 2024) as total_events,
  //     (SELECT COUNT(DISTINCT userId) FROM events WHERE YEAR(created_at) = 2024) as total_users;

  totalEvents: 536,
  totalUsers: 33,

  // -- Top event types
  // SELECT
  //     JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type')) as event_type,
  //     COUNT(*) as count
  // FROM events
  // WHERE
  //     YEAR(created_at) = 2024
  //     AND JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type')) IS NOT NULL
  //     AND JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type')) != ''
  // GROUP BY JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type'))
  // ORDER BY count DESC
  // LIMIT 5;

  topEventTypes: [
    { type: "concert", count: 84 },
    { type: "party", count: 64 },
    { type: "performance", count: 63 },
    { type: "festival", count: 33 },
    { type: "meeting", count: 25 },
  ],

  // -- Top categories
  // SELECT
  //     JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.category')) as category,
  //     COUNT(*) as count
  // FROM events
  // WHERE
  //     YEAR(created_at) = 2024
  //     AND JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.category')) IS NOT NULL
  //     AND JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.category')) != ''
  // GROUP BY JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.category'))
  // ORDER BY count DESC
  // LIMIT 5;

  topCategories: [
    { category: "music", count: 155 },
    { category: "community", count: 82 },
    { category: "arts", count: 80 },
    { category: "entertainment", count: 54 },
    { category: "literature", count: 15 },
  ],

  // -- Weekday distribution
  // SELECT
  //     DAYNAME(startDateTime) as day_of_week,
  //     COUNT(*) as event_count
  // FROM events
  // WHERE YEAR(startDateTime) = 2024
  // GROUP BY DAYNAME(startDateTime), DAYOFWEEK(startDateTime)
  // ORDER BY DAYOFWEEK(startDateTime);

  weekdayDistribution: [
    { day_of_week: "Sun", event_count: 136 },
    { day_of_week: "Mon", event_count: 53 },
    { day_of_week: "Tue", event_count: 26 },
    { day_of_week: "Wed", event_count: 40 },
    { day_of_week: "Thu", event_count: 46 },
    { day_of_week: "Fri", event_count: 83 },
    { day_of_week: "Sat", event_count: 149 },
  ],
  // -- Most followed events
  // SELECT
  //     e.id,
  //     JSON_UNQUOTE(JSON_EXTRACT(e.event, '$.name')) as event_name,
  //     JSON_UNQUOTE(JSON_EXTRACT(e.eventMetadata, '$.type')) as event_type,
  //     COUNT(ef.userId) as follow_count,
  //     u.username as creator_username
  // FROM events e
  // LEFT JOIN eventfollows ef ON e.id = ef.eventId
  // LEFT JOIN users u ON e.userId = u.id
  // WHERE YEAR(e.startDateTime) = 2024
  // GROUP BY
  //     e.id,
  //     e.event,
  //     e.eventMetadata,
  //     u.username
  // ORDER BY follow_count DESC
  // LIMIT 5;

  topFollowedEvents: [
    {
      id: "8o5aw11du3a2",
      event_name: "/move-ment/ Hot Fall Bangers (Yams)",
      event_type: "party",
      follow_count: "8",
      creator_username: "jennybatch",
      images: [
        "https://upcdn.io/12a1yek/raw/uploads/2024/11/18/4kBwZYEj4D-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/11/18/4kBwZYEj4D-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/11/18/4kBwZYEj4D-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/11/18/4kBwZYEj4D-file.jpeg",
      ],
    },
    {
      id: "3kz5jlidqw2l",
      event_name: "show + tell",
      event_type: "meeting",
      follow_count: "4",
      creator_username: "jennybatch",
      images: [
        "https://upcdn.io/12a1yek/raw/uploads/2024/10/23/4kFNaYJXEm-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/10/23/4kFNaYJXEm-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/10/23/4kFNaYJXEm-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/10/23/4kFNaYJXEm-file.jpeg",
      ],
    },
    {
      id: "6mxv7zfmetv2",
      event_name: "Theo Parrish Open to Close Set",
      event_type: "performance",
      follow_count: "4",
      creator_username: "joshcarr",
      images: [
        "https://upcdn.io/12a1yek/raw/uploads/2024/11/15/4kCFwtbPAE-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/11/15/4kCFwtbPAE-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/11/15/4kCFwtbPAE-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/11/15/4kCFwtbPAE-file.jpeg",
      ],
    },
    {
      id: "ce59to0ylcvu",
      event_name: "KOYAANISQATSI Soundbath w/ Chumki Chakraborty",
      event_type: "performance",
      follow_count: "3",
      creator_username: "joshcarr",
      images: [
        "https://upcdn.io/12a1yek/raw/uploads/2024/10/21/4kFdUswjHh-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/10/21/4kFdUswjHh-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/10/21/4kFdUswjHh-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/10/21/4kFdUswjHh-file.jpeg",
      ],
    },
    {
      id: "4cnf0zm09rs3",
      event_name: "SPARK: PDX | Outsmart Burnout and Cultivate Creativity",
      event_type: "seminar",
      follow_count: "3",
      creator_username: "delladella",
      images: [
        "https://upcdn.io/12a1yek/raw/uploads/2024/12/03/4k9zirgZDe-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/12/03/4k9zirgZDe-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/12/03/4k9zirgZDe-file.jpeg",
        "https://upcdn.io/12a1yek/raw/uploads/2024/12/03/4k9zirgZDe-file.jpeg",
      ],
    },
  ],

  // -- Top creators (super capturers)
  // WITH UserEventCounts AS (
  //     -- First get total events per user
  //     SELECT
  //         u.username,
  //         u.id as userId,
  //         COUNT(*) as total_events
  //     FROM events e
  //     JOIN users u ON e.userId = u.id
  //     WHERE YEAR(e.created_at) = 2024
  //     GROUP BY u.username, u.id
  // ),
  // UserEventTypes AS (
  //     -- Then get their most common valid type
  //     SELECT
  //         u.id as userId,
  //         JSON_UNQUOTE(JSON_EXTRACT(e.eventMetadata, '$.type')) as event_type,
  //         COUNT(*) as type_count,
  //         ROW_NUMBER() OVER (
  //             PARTITION BY u.id
  //             ORDER BY COUNT(*) DESC
  //         ) as type_rank
  //     FROM events e
  //     JOIN users u ON e.userId = u.id
  //     WHERE
  //         YEAR(e.created_at) = 2024
  //         AND JSON_UNQUOTE(JSON_EXTRACT(e.eventMetadata, '$.type')) IS NOT NULL
  //         AND JSON_UNQUOTE(JSON_EXTRACT(e.eventMetadata, '$.type')) != ''
  //         AND JSON_UNQUOTE(JSON_EXTRACT(e.eventMetadata, '$.type')) != 'unknown'
  //         AND TRIM(JSON_UNQUOTE(JSON_EXTRACT(e.eventMetadata, '$.type'))) != ''
  //     GROUP BY
  //         u.id,
  //         JSON_UNQUOTE(JSON_EXTRACT(e.eventMetadata, '$.type'))
  // )
  // SELECT
  //     uec.username,
  //     uec.total_events,
  //     uet.event_type as most_common_type,
  //     uet.type_count
  // FROM UserEventCounts uec
  // JOIN UserEventTypes uet ON uec.userId = uet.userId
  // WHERE uet.type_rank = 1
  // ORDER BY uec.total_events DESC
  // LIMIT 5;

  topCreators: [
    {
      username: "jaronheard",
      emoji: "💖",
      userImage:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzJaRmFCY2VkQ2RrZ1VUM3BUWFJmU2tLM3B2eCJ9",
      total_events: "252",
      most_common_type: "party",
      type_count: "34",
    },
    {
      username: "joshcarr",
      emoji: "🙏",
      userImage:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzJlSzFiTDhITEhJZmFzQnRsVlBaMUk5UmdjbSJ9",
      total_events: "126",
      most_common_type: "concert",
      type_count: "45",
    },
    {
      username: "delladella",
      emoji: "🌀",
      userImage:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yaEtlMGdrZVhSWm5KNEVheVBLZlpGdUxkSDIifQ",
      total_events: "38",
      most_common_type: "party",
      type_count: "9",
    },
    {
      username: "jennybatch",
      emoji: "🎈",
      userImage:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzJjQUNWUDZhWVVpUUV6Q1NFaXlucHRDb2txOSJ9",
      total_events: "17",
      most_common_type: "party",
      type_count: "3",
    },
    {
      username: "thepianofarm",
      emoji: "🚣🏽",
      userImage:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yaDJHMG1lMmpnaFNzSnVudklRaE5Xblc2RzMifQ",
      total_events: "10",
      most_common_type: "festival",
      type_count: "2",
    },
  ],

  // -- Longest streak of consecutive days with events
  // WITH RECURSIVE DateSequence AS (
  //     SELECT
  //         DATE(startDateTime) as date,
  //         DATE(startDateTime) as group_start
  //     FROM events
  //     WHERE YEAR(startDateTime) = 2024
  //     GROUP BY DATE(startDateTime)
  //
  //     UNION ALL
  //
  //     SELECT
  //         DATE_ADD(d.date, INTERVAL 1 DAY),
  //         CASE
  //             WHEN e.start_date IS NULL THEN NULL
  //             ELSE d.group_start
  //         END
  //     FROM DateSequence d
  //     LEFT JOIN (
  //         SELECT DATE(startDateTime) as start_date
  //         FROM events
  //         WHERE YEAR(startDateTime) = 2024
  //         GROUP BY DATE(startDateTime)
  //     ) e ON DATE_ADD(d.date, INTERVAL 1 DAY) = e.start_date
  //     WHERE d.date <= (
  //         SELECT MAX(DATE(startDateTime))
  //         FROM events
  //         WHERE YEAR(startDateTime) = 2024
  //     )
  // )
  // SELECT
  //     group_start as streak_start,
  //     MAX(date) as streak_end,
  //     DATEDIFF(MAX(date), group_start) + 1 as streak_length
  // FROM DateSequence
  // WHERE group_start IS NOT NULL
  // GROUP BY group_start
  // ORDER BY streak_length DESC
  // LIMIT 1;

  longestStreak: {
    streak_start: "2024-12-06",
    streak_end: "2024-12-16",
    streak_length: "11",
  },

  // -- Top 5 days with most events
  // SELECT
  //     DATE(startDateTime) as event_date,
  //     COUNT(*) as event_count
  // FROM events
  // WHERE YEAR(startDateTime) = 2024
  // GROUP BY DATE(startDateTime)
  // ORDER BY event_count DESC
  // LIMIT 5;

  top5DaysWithMostEvents: [
    {
      eventDate: "2024-03-09",
      dayOfWeek: "Saturday",
      eventCount: "7",
      eventTypes: "performance",
    },
    {
      eventDate: "2024-06-01",
      dayOfWeek: "Saturday",
      eventCount: "7",
      eventTypes: "concert, exhibition, festival, party, workshop",
    },
    {
      eventDate: "2024-09-08",
      dayOfWeek: "Sunday",
      eventCount: "7",
      eventTypes: "party, performance, reading",
    },
    {
      eventDate: "2024-09-28",
      dayOfWeek: "Saturday",
      eventCount: "7",
      eventTypes:
        "exhibition, gathering, marketplace, meeting, party, performance, workshop",
    },
    {
      eventDate: "2024-10-04",
      dayOfWeek: "Friday",
      eventCount: "7",
      eventTypes: "concert, exhibition, meeting, seminar, show",
    },
    {
      eventDate: "2024-10-19",
      dayOfWeek: "Saturday",
      eventCount: "7",
      eventTypes: "concert, lecture, panel, party, performance, show, workshop",
    },
    {
      eventDate: "2024-12-08",
      dayOfWeek: "Sunday",
      eventCount: "7",
      eventTypes: "concert, exhibition, party, performance, social",
    },
  ],

  // -- Category champions (top capturer for each type)
  // WITH TypeLeaders AS (
  //     SELECT
  //         JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type')) as event_type,
  //         userId,
  //         COUNT(*) as type_count,
  //         ROW_NUMBER() OVER (
  //             PARTITION BY JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type'))
  //             ORDER BY COUNT(*) DESC
  //         ) as rn
  //     FROM events
  //     WHERE
  //         YEAR(created_at) = 2024
  //         AND JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type')) IS NOT NULL
  //         AND JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type')) != ''
  //     GROUP BY
  //         JSON_UNQUOTE(JSON_EXTRACT(eventMetadata, '$.type')),
  //         userId
  // )
  // SELECT
  //     tl.event_type,
  //     u.username,
  //     tl.type_count
  // FROM TypeLeaders tl
  // JOIN users u ON tl.userId = u.id
  // WHERE
  //     tl.rn = 1
  //     AND tl.event_type IN (
  //         SELECT event_type
  //         FROM TypeLeaders
  //         GROUP BY event_type
  //         ORDER BY SUM(type_count) DESC
  //         LIMIT 5
  //     )
  // ORDER BY tl.type_count DESC;

  categoryChampions: [
    { event_type: "concert", username: "joshcarr", type_count: "45" },
    { event_type: "party", username: "jaronheard", type_count: "34" },
    { event_type: "performance", username: "jaronheard", type_count: "32" },
    { event_type: "festival", username: "jaronheard", type_count: "16" },
    { event_type: "meeting", username: "jaronheard", type_count: "15" },
  ],

  topVenues: [
    { venue: "Holocene", count: 15 },
    { venue: "School of Art & Time", count: 8 },
    { venue: "PAM CUT Tomorrow Theater", count: 15 },
    { venue: "Clinton Street Theater", count: 8 },
    { venue: "Hollywood Theater", count: 9 },
    { venue: "PICA", count: 9 },
  ],
  emojis: [
    "🤙",
    "🤸",
    "🚣🏽",
    "🌀",
    "🪰",
    "🪐",
    "🍿",
    "👻",
    "🍪",
    "👹",
    "✨",
    "🥜",
    "🤌",
    "🧦",
    "🐢",
    "🥑",
    "🐯",
    "🧜",
    "🐞",
    "💐",
    "🦋",
    "🌋",
    "🌚",
    "🎈",
    "🧩",
    "💖",
    "😎",
    "🙏",
    "⏳",
    "🔜",
  ],
};

export default dataFor2024;
