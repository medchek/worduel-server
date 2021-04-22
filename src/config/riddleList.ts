import { randomNumber } from "../core/utils";
// DEVONLY: To be replaced with a proper database

interface Riddle {
  riddle: string;
  answer: string | string[];
  canBePrefixed?: boolean;
  canBePlural?: boolean;
}
export const riddleList: Riddle[] = [
  {
    riddle:
      "a home of wood in a wooded place, but built not by hand. High above the earthen ground, it holds its pale blue gems. What is it?",
    answer: ["nest", "a nest"],
  },

  {
    riddle:
      "guided, I am scraping along, leaving behind my snow-white dust against that which I am scraping, for when I am scraping, I must.",
    answer: "chalk",
  },

  {
    riddle: "what word of five letters has only one left when two letters are removed?",
    answer: ["stone", "a stone"],
  },
  {
    riddle: "what's red and bad for your teeth?",
    answer: ["brick", "a brick"],
  },
  {
    riddle: "what kind of cup doesn't hold water?",
    answer: "cupcake",
  },
  {
    riddle: "tear one off and scratch my head, what once was red is black instead!",
    answer: "match",
  },
  {
    riddle: "precious stones in a pack of cards.",
    answer: "diamonds",
  },
  {
    riddle:
      "take away my first letter and I remain the same. Take away my last letter and I remain unchanged. Remove all my letters and I’m still me. What am I?",
    answer: ["mailman", "postman"],
  },
  {
    riddle:
      "he has one and a person has two, a citizen has three and a human being has four, a personality has five and an inhabitant of earth has six. What am I?",
    answer: ["syllable", "syllables"],
  },
  {
    riddle: "what is it that leaps and runs and yet, has no feet?",
    answer: "ball",
  },
  {
    riddle:
      "at the sound of me, men may dream or stamp their feet. At the sound of me, women may laugh or sometimes weep.",
    answer: "music",
  },
  {
    riddle: "large as a mountain, small as a pea, endlessly swimming in a waterless sea.",
    answer: "asteroids",
  },
  {
    riddle:
      "there is a clerk at the butcher shop, he is five feet ten inches tall, and he wears size 13 sneakers. What does he weigh?",
    answer: "meat",
  },
  {
    riddle: "what starts with a P, ends with an E and has a million letters in it?",
    answer: ["postoffice", "post-office", "post office"],
  },
  {
    riddle: "I have no wings but I fly, I have no teeth but I bite. What am I?",
    answer: ["bullet", "a bullet"],
  },
  {
    riddle:
      "A blue house has blue bricks; a yellow house has a yellow bricks. What is a green house made of?",
    answer: ["glass", "plastic"],
  },
  {
    riddle: "If I have it, I don’t share it. If I share it, I don’t have it. What is it?",
    answer: ["secret", "a secret"],
  },
  {
    riddle:
      "More precious than gold, but cannot be bought, Can never be sold, only earned if it’s sought, If it is broken it can still be mended, At birth it can’t start nor death is it ended.",
    answer: ["friendship", "freindship"],
  },
  {
    riddle:
      "I have a thousand wheels, but move I do not. Call me what I am, call me a lot.",
    answer: ["parking", "parking lot", "parking-lot"],
  },
  {
    riddle:
      "Some are quick to take it. Others must be coaxed. Those who choose to take it gain and lose the most.",
    answer: ["risk", "risks"],
  },
  {
    riddle: "What is put on a table, cut, but never eaten?",
    answer: ["cards", "deck of cards"],
  },
  {
    riddle:
      "What English word retains the same pronunciation, even after you take away four of its five letters?",
    answer: "queue",
  },
  {
    riddle: "People buy me to eat, but never eat me. What am I?",
    answer: ["plate", "a plate"],
  },
  {
    riddle:
      "I cannot be other than what I am, Until the man who made me dies, Power and glory will fall to me finally, Only when he last closes his eyes",
    answer: ["prince", "a prince"],
  },
  {
    riddle: "What always goes to bed with its shoes on?",
    answer: ["horse", "a horse"],
  },
  {
    riddle:
      "Lovely and round, I shine with pale light, Grown in the darkness, a lady’s delight.",
    answer: "pearl",
  },
  {
    riddle:
      "I can be as thin as a picture frame but my insides have many things you can see.",
    answer: "television",
  },
  {
    riddle:
      "Round as an apple, deep as a cup, and all the kings’ horses can't fill it up. What is it?",
    answer: "well",
  },
  {
    riddle:
      "I have hands that wave you, though I never say goodbye. It's cool for you to be with me, especially when I say HI. What am I?",
    answer: "fan",
  },
  {
    riddle: "I have a pet, his body is full of coins",
    answer: "piggy bank",
  },
  {
    riddle: "Everyone has me but nobody can lose me. What am I?",
    answer: "shadow",
  },
  {
    riddle:
      "A mile from end to end, yet as close to as a friend. A precious commodity, freely given. Found on the rich, poor, short and tall, but shared among children most of all. What is it?",
    answer: ["smile", "a smile"],
  },
  {
    riddle: "I have Eighty-eight keys but cannot open a single door? What am I?",
    answer: ["piano", "a piano"],
  },
  {
    riddle:
      "What makes a loud noise when changing its jacket, becomes larger but weighs less?",
    answer: "popcorn",
  },
  {
    riddle: "If you eat me, my sender will eat you. What am I?",
    answer: ["fishhook", "a fishhook"],
  },
  {
    riddle: "What grows in winter, dies in summer, and grows roots upward?",
    answer: ["icicle", "icicles", "an icicle"],
  },
  {
    riddle: "A hill full, a hole full; yet you cannot catch a bowl full. What is it?",
    answer: ["mist", "a mist"],
  },
  {
    riddle:
      "I’m not the sort that’s eaten, I’m not the sort you bake, Don’t put me in an oven; I don’t taste that great, But when applied correctly, around me you will find Problems are so simple when my digits come to mind.",
    answer: ["Pi", "3.14"],
  },
  {
    riddle: "A father's child, a mother's child, yet no one's son.",
    answer: "daughter",
  },
  {
    riddle: "What jumps when it walks and sits when it stands?",
    answer: ["a kangaroo", "kangaroo"],
  },
  {
    riddle:
      "Never ahead, ever behind, Yet flying swiftly past; For a child I last forever, For adults I'm gone too fast.",
    answer: "childhood",
  },
  {
    riddle: "What do people want the least on their hands?",
    answer: "handcuffs",
  },
  {
    riddle: "What English word has three consecutive double letters?",
    answer: "bookkeeper",
  },
  {
    riddle:
      "A three-letter word I’m sure you know, I can be on a boat or a sleigh in the snow, I’m pals with the rain and honor a king, But my favorite use is attached to a string. What am I?",
    answer: ["bow", "a bow"],
  },
  {
    riddle: "What type of house weighs the least?",
    answer: ["lighthouse", "a lighthouse"],
  },
  {
    riddle:
      "Though I should be unique, you've made most of us the same. I would be stronger, if my characters were stranger.",
    answer: ["password", "a password"],
  },
  {
    riddle: "I ate one and threw away two.",
    answer: "oyster",
  },
  {
    riddle: "How many months have 28 days?",
    answer: ["twelve", "12", "all"],
  },
  {
    riddle: "I am not alive but I grow. I don't have lungs but I need air. What am i?",
    answer: ["fire", "flames"],
  },
  {
    riddle: "Blend a teapot shot so the pearlies won’t rot!",
    answer: "toothpaste",
  },
  {
    riddle:
      "You use a knife to slice my head and weep beside me when I am dead. What am I?",
    answer: ["onion", "onions", "an onion"],
  },
  // stopped at 161
  {
    riddle:
      "Looks like water, but it's heat. Sits on sand, lays on concrete. People have been known, To follow it everywhere. But it gets them no place, And all they can do stare.",
    answer: ["mirage", "a mirage"],
  },
  {
    riddle:
      "Everyone has it. Those who have it least don’t know that they have it. Those who have it most wish they had less of it, But not too little or none at all.",
    answer: "age",
  },
  {
    riddle:
      "On the wall, in the air, You just want me out of your hair, Try to catch me, but you cannot, For my vision is thousand fold. What am I?",
    answer: ["fly", "a fly"],
  },
  {
    riddle: "What goes through a door but never goes in and never comes out?",
    answer: ["keyhole", "a keyhole"],
  },
  {
    riddle: "Iron roof, glass walls, burns and burns and never falls.",
    answer: ["lantern", "a lantern"],
  },
  {
    riddle:
      "We hurt without moving. We poison without touching. We bear the truth and the lies. We are not to be judged by our size. What are we?",
    answer: ["words", "word"],
  },
  {
    riddle:
      "I can bring tears to your eyes; resurrect the dead, make you smile, and reverse time. I form in an instant but I last a lifetime. What am I?",
    answer: ["memory", "a memory", "memories"],
  },
  {
    riddle: "Slayer of regrets, old and new, sought by many, found by few.",
    answer: "redemption",
  },
  {
    riddle:
      "Thousands lay up gold within this house, But no man made it. Spears past counting guard this house, But no man wards it.",
    answer: "beehive",
  },
  {
    riddle: "When it was young, it had a tail. When it grew up, it had knees.",
    answer: ["frog", "a frog", "frogs"],
  },
  {
    riddle: "Kills the bad ones and the sad ones. Tightens to fit, so one size fits.",
    answer: ["noose", "a noose"],
  },
  {
    riddle: "What can you throw but not catch?",
    answer: ["party", "a party"],
  },
  {
    riddle: "What's as small as a mouse but guards a house like a lion?",
    answer: ["lock", "a lock"],
  },
  {
    riddle:
      "I am a seed, three letters in the name, Take away two and I sound quite the same. What am I?",
    answer: "pea",
  },
  {
    riddle:
      "Thirty white horses on a red hill, First they champ, Then they stamp, Then they stand still.",
    answer: "teeth",
  },
  {
    riddle:
      "I am born in fear, raised in truth, And I come to my own in deed. When comes a time that I’m called forth, I come to serve the cause of need.",
    answer: "courage",
  },
  {
    riddle:
      "With pointed fangs it sits in wait, With piercing force it doles out fate, Over bloodless victims proclaiming its might, Eternally joining in a single bite What is it?",
    answer: ["stapler", "a stapler"],
  },
  {
    riddle:
      "I saw a man in white, he looked quite a sight. He was not old, but he stood in the cold. And when he felt the sun, he started to run. Who could he be?",
    answer: ["snowman", "a snowman"],
  },
  {
    riddle: "I have no life, but I can die, what am I?",
    answer: ["battery", "a battery"],
  },
  {
    riddle: "Born of sorrow, grows with age, You need a lot to be a sage. What is it?",
    answer: "wisedom",
  },
  {
    riddle:
      "As beautiful as the setting sun, As delicate as the morning dew; An angel’s dusting from the stars, That can turn the Earth into a frosted moon. What am I?",
    answer: "snow",
  },
  {
    riddle:
      "There is a word in the English language in which the first two letters signify a male, the first three letters signify a female, the first four signify a great man, and the whole word, a great woman. What is the word?",
    answer: "heroine",
  },
  {
    riddle:
      "The sun bakes them, the hand breaks them, the foot treads on them, and the mouth tastes them.",
    answer: "grapes",
  },
  {
    riddle:
      "I can sizzle like bacon, I am made with an egg, I have plenty of backbone, but lack a good leg. I peel layers like onions, but still remain whole. I can be long like a flagpole, yet fit in a hole. What am I?",
    answer: ["snake", "a snake"],
  },
  {
    riddle:
      "Until I am measured, I am not known. Yet how you miss me when I have flown. What am I?",
    answer: "time",
  },
  {
    riddle:
      "What has a coat? Hugs you not in sympathy? Whose smile you'd rather not see? Whose stance is a terrible thing to see? Who is it that brave men run away from? Whose fingers are clawed? Whose sleep lasts for months? And who's company we shunt?",
    answer: ["bear", "a bear"],
  },
  {
    riddle:
      "I cut through evil Like a double edged sword, And chaos flees at my approach. Balance I single-handedly upraise, Through battles fought with heart and mind, Instead of with my gaze. What am I?",
    answer: "justice",
  },
  {
    riddle: "What can travel around the world while staying in a corner?",
    answer: ["stamp", "a stamp"],
  },
  {
    riddle:
      "I have a leg but I do not move, A face but no expression, Be it wind or rain I stay outside. What am I?",
    answer: ["scarecrow", "a scarecrow"],
  },
  {
    riddle:
      "I have a hundred legs but cannot stand, a long neck but no head; I eat the maid's life. What am I?",
    answer: ["broom", "a broom"],
  },
  {
    riddle:
      "I look flat, but I am deep, Hidden realms I shelter. Lives I take, but food I offer. At times I am beautiful. I can be calm, angry and turbulent. I have no heart, but offer pleasure as well as death. No man can own me, yet I encompass what all men must have.",
    answer: ["ocean", "the ocean"],
  },
  {
    riddle: "I bind it and it walks. I loose it and it stops.",
    answer: ["sandal", "a sandal"],
  },
  {
    riddle:
      "It has a long neck, A name of a bird, Feeds on cargo of ships, It’s not alive,",
    answer: ["crane", "a crane"],
  },
  {
    riddle: "What loses its head every morning only to get it back every night?",
    answer: ["pillow", "a pillow"],
  },
  {
    riddle:
      "I fall with the waves, rise with the tide, and drift with the current alongside. What am I?",
    answer: ["plankton", "a plankton"],
  },
  {
    riddle:
      "The strangest creature you'll ever find: Two eyes in front and many many more behind.",
    answer: ["peacock", "a peacock", "peafowl"],
  },
  {
    riddle: "What has to be broken before you can use it?",
    answer: ["egg", "an egg", "eggs"],
  },
  {
    riddle:
      "I have four wings, but cannot fly, I never laugh and never cry; on the same spot I'm always found, toiling away with little sound. What am I?",
    answer: ["windmill", "a windmill"],
  },
  {
    riddle:
      "In spring I look jolly, Covered in a green array, The warmer it gets the more clothing I wear, As the cold grows, I throw away my clothes.",
    answer: ["tree", "a tree"],
  },
  {
    riddle:
      "I can run but never walk. Wherever I go, thoughts are close behind me. What am I?",
    answer: "nose",
  },

  {
    riddle:
      "I'm light as a feather, yet the strongest man can't hold me for more than 5 minutes. What am I?",
    answer: "breath",
  },
  {
    riddle:
      "My thunder comes before my lightning. My lightning comes before my rain. And my rain dries all the ground it touches. What am I?",
    answer: ["volcano", "a volcano"],
  },
  {
    riddle: "What gets wetter and wetter the more it dries?",
    answer: ["towel", "a towel"],
  },
  {
    riddle: "What has 4 fingers and a thumb, but is not living?",
    answer: ["glove", "a glove"],
  },
  {
    riddle:
      "What has black spots and a white face, is fat not thin, and helps you to win, but tumbles all over the place?",
    answer: ["dice", "a dice"],
  },
  {
    riddle:
      "What five-letter word, no matter how you pronounce it, is always pronounced wrong?",
    answer: "wrong",
  },
  {
    riddle:
      "Two legs I have, and this will confound, only at rest do they touch the ground. What am I?",
    answer: ["wheelbarrow", "a wheelbarrow"],
  },
  {
    riddle: "What is given but kept by the giver?",
    answer: "birth",
  },
  {
    riddle: "What is so delicate that saying its name breaks it?",
    answer: "silence",
  },
  // stopped at 312
  // {
  //   riddle: "",
  //   answer: "",
  // },
];

export const getRandomRiddle = (): Riddle => {
  return riddleList[randomNumber(riddleList.length - 1)];
};
