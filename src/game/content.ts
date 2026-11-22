// The day: four chapters, three buzzes each. Every choice changes a tally;
// tallies become the same six metrics the real app uses (src/engine).

export interface Tally {
  videoMin: number; // short video minutes  -> thumb mileage, couch potato
  chatMin: number; // other phone time (reading chats, scrolling back)
  steps: number; // -> couch potato
  links: number; // links shared without opening -> newspapers
  forwards: number; // forwarded messages -> seeds next door
  laughs: number; // 😂 sent
  msgs: number; // messages sent
  unread: number; // unread on the busiest chat -> letterbox
}

export type Delta = Partial<Tally> & { setUnread?: number };

export interface Choice {
  label: string; // button text, short
  delta: Delta;
  minutes: number; // how long it takes on the clock
  outcome: string; // what happens, shown after the tap
  phone: boolean; // true = the "phone" answer (loud white button)
}

export interface Buzz {
  id: string;
  app: string; // who is buzzing
  from?: string; // sender line
  text: string; // the message
  forwarded?: boolean; // shows the "Forwarded many times" label
  choices: [Choice, Choice]; // [phone answer, life answer]
}

export interface Chapter {
  id: string;
  title: string; // whispered title card
  start: number; // minutes after midnight
  sub: string;
  light: 'dawn' | 'day' | 'dusk' | 'night';
  buzzes: Buzz[];
}

export const START_TALLY: Tally = {
  videoMin: 0,
  chatMin: 0,
  steps: 4000, // you'll walk around a bit whatever happens
  links: 0,
  forwards: 0,
  laughs: 0,
  msgs: 10, // messages you'd send anyway
  unread: 8,
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'morning',
    title: 'Morning',
    start: 7 * 60,
    sub: 'Your alarm goes off',
    light: 'dawn',
    buzzes: [
      {
        id: 'alarm',
        app: 'Alarm',
        text: 'Good morning. Your phone is right there, next to your face.',
        choices: [
          { label: 'Check it in bed', phone: true, delta: { videoMin: 15 }, minutes: 25, outcome: '“Just checking the time.” Twenty-five minutes later, you know the time.' },
          { label: 'Get up', phone: false, delta: { steps: 800 }, minutes: 5, outcome: 'You get up. The phone stays on the bed, looking a bit lonely.' },
        ],
      },
      {
        id: 'news-toast',
        app: 'News',
        from: 'Shared in the group chat',
        text: 'BREAKING: Scientists say toast is now officially a vegetable 🍞🥦',
        choices: [
          { label: 'Share it now', phone: true, delta: { links: 1, msgs: 1 }, minutes: 1, outcome: 'Shared without opening. A newspaper lands on your lawn.' },
          { label: 'Open it first', phone: false, delta: {}, minutes: 2, outcome: 'You open it. A bakery named a sandwich “The Vegetable”. That’s the whole story.' },
        ],
      },
      {
        id: 'video-1',
        app: 'Short videos',
        text: 'A dog on a skateboard. It’s only 15 seconds long.',
        choices: [
          { label: 'Just one more', phone: true, delta: { videoMin: 20 }, minutes: 20, outcome: 'One more became 80 more. Your thumb ran a little marathon.' },
          { label: 'Put it down', phone: false, delta: {}, minutes: 1, outcome: 'Good dog. You put the phone in your pocket.' },
        ],
      },
    ],
  },
  {
    id: 'midday',
    title: 'Midday',
    start: 12 * 60,
    sub: 'Lunch break',
    light: 'day',
    buzzes: [
      {
        id: 'meme',
        app: 'The group chat',
        from: 'Sam',
        text: 'a picture of a pigeon wearing a tiny hat',
        choices: [
          { label: 'React 😂😂😂', phone: true, delta: { laughs: 3, msgs: 1 }, minutes: 2, outcome: '😂😂😂. A kookaburra lands on your fence and starts laughing too.' },
          { label: 'Reply with words', phone: false, delta: { msgs: 2 }, minutes: 2, outcome: '“Where does a pigeon even buy a hat?” Sam is still thinking about it.' },
        ],
      },
      {
        id: 'chain-potato',
        app: 'Family chat',
        from: 'Auntie',
        forwarded: true,
        text: 'Send this to 10 chats or your phone will turn into a potato at midnight 🥔',
        choices: [
          { label: 'Forward to every chat', phone: true, delta: { forwards: 3, msgs: 3 }, minutes: 3, outcome: 'Forwarded. Seeds blow over the fence into the neighbours’ yards.' },
          { label: 'Don’t forward', phone: false, delta: {}, minutes: 1, outcome: 'You don’t forward it. Your phone stays a phone. So far.' },
        ],
      },
      {
        id: 'walk',
        app: 'Messages',
        from: 'Jordan',
        text: 'walk to the shop to get lunch?',
        choices: [
          { label: 'Stay and scroll', phone: true, delta: { videoMin: 25 }, minutes: 30, outcome: 'You stay. A potato appears in your garden bed. Then another.' },
          { label: 'Go for a walk', phone: false, delta: { steps: 3000 }, minutes: 30, outcome: '3,000 steps and a sandwich. The garden bed grows flowers.' },
        ],
      },
    ],
  },
  {
    id: 'afternoon',
    title: 'Afternoon',
    start: 16 * 60,
    sub: 'Home time',
    light: 'dusk',
    buzzes: [
      {
        id: 'family-unread',
        app: 'Family chat',
        text: '48 unread messages. Someone posted a photo of a big cloud.',
        choices: [
          { label: 'Leave it on read', phone: true, delta: { unread: 48 }, minutes: 0, outcome: '48 messages go straight into your letterbox. It’s getting full.' },
          { label: 'Reply “catching up 👋”', phone: false, delta: { setUnread: 2, msgs: 1 }, minutes: 3, outcome: 'One quick wave and the letterbox empties. The cloud was very big.' },
        ],
      },
      {
        id: 'news-pigeon',
        app: 'News',
        from: 'Shared 9,000 times',
        text: 'You won’t BELIEVE what this pigeon did next 😱',
        choices: [
          { label: 'Share it now', phone: true, delta: { links: 1, msgs: 1 }, minutes: 1, outcome: 'Shared without opening. Another newspaper on the lawn.' },
          { label: 'Open it first', phone: false, delta: {}, minutes: 2, outcome: 'It sat on a bench. For four minutes. You believe it.' },
        ],
      },
      {
        id: 'autoplay',
        app: 'Short videos',
        text: 'Autoplay has already started the next video for you.',
        choices: [
          { label: 'Keep watching', phone: true, delta: { videoMin: 30 }, minutes: 35, outcome: 'Thirty-five minutes gone. The grass grew while you weren’t looking.' },
          { label: 'Go outside', phone: false, delta: { steps: 2500 }, minutes: 30, outcome: 'You kick a ball around. 2,500 steps. Nobody filmed it.' },
        ],
      },
    ],
  },
  {
    id: 'night',
    title: 'Night',
    start: 21 * 60,
    sub: 'Nearly bedtime',
    light: 'night',
    buzzes: [
      {
        id: 'chain-oil',
        app: 'The group chat',
        from: 'Uncle',
        forwarded: true,
        text: 'Doctors HATE this: olive oil makes you 3 cm taller every night!!! Pass it on',
        choices: [
          { label: 'Pass it on', phone: true, delta: { forwards: 3, msgs: 3 }, minutes: 2, outcome: 'Passed on. More seeds float next door. Weeds start sprouting there.' },
          { label: 'Check where it’s from', phone: false, delta: {}, minutes: 3, outcome: 'It came from a chat called “Uncle’s jokes 2014”. You let it rest.' },
        ],
      },
      {
        id: 'night-unread',
        app: 'The group chat',
        text: '99+ new messages. They’re arguing about whether a hot dog is a sandwich.',
        choices: [
          { label: 'Leave it for later', phone: true, delta: { unread: 99 }, minutes: 15, outcome: 'Later never comes. The letterbox overflows onto the path.' },
          { label: 'Say “night all 👋”', phone: false, delta: { setUnread: 0, msgs: 1, laughs: 0 }, minutes: 2, outcome: 'You wave goodnight and mute the chat. The hot dog question lives on.' },
        ],
      },
      {
        id: 'bedtime',
        app: 'Short videos',
        text: 'It’s late. Just one more video before sleep?',
        choices: [
          { label: 'Just one more', phone: true, delta: { videoMin: 45, laughs: 2, msgs: 1 }, minutes: 170, outcome: 'One more. And one more. You send 😂😂 to a video of a goat. It’s past midnight.' },
          { label: 'Goodnight', phone: false, delta: {}, minutes: 5, outcome: 'Phone face-down. Lights out. Your garden is thinking about your day.' },
        ],
      },
    ],
  },
];

export const ALL_BUZZES = CHAPTERS.flatMap((c) => c.buzzes);

/** Practice card for How to play. */
export const PRACTICE: Buzz = {
  id: 'practice',
  app: 'News',
  from: 'Shared in the group chat',
  text: 'BREAKING: Cats can now legally drive on Tuesdays 🐈🚗',
  choices: [
    { label: 'Share it now', phone: true, delta: { links: 1, msgs: 1 }, minutes: 1, outcome: 'See the newspapers on your lawn? They grew from one link you shared without opening.' },
    { label: 'Open it first', phone: false, delta: {}, minutes: 2, outcome: 'It was about a toy car for cats. Nothing lands on your lawn.' },
  ],
};
