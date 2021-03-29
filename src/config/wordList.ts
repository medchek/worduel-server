import { randomNumber } from "../core/utils";
// DEVONLY - To be replaced with a real database
export const wordList = [
  // easy
  [
    "window",
    "house",
    "accept",
    "address",
    "affect",
    "year",
    "whatever",
    "trouble",
    "truth",
    "support",
    "summer",
    "station",
    "speech",
    "spend",
    "somebody",
    "soldier",
    "simple",
    "several",
    "question",
    "something",
    "purpose",
    "phone",
    "people",
    "peace",
    "party",
    "message",
    "member",
    "letter",
    "building",
    "bank",
    "abort",
    "above",
    "affix",
    "agree",
    "ahead",
    "airplane",
    "cover",
  ],
  // medium
  [
    "responsibility",
    "sometimes",
    "treatment",
    "understand",
    "technology",
    "relationship",
    "professional",
    "situation",
    "performance",
    "organization",
    "newspaper",
    "management",
    "machine",
    "knowledge",
    "international",
    "information",
    "identify",
    "generation",
    "environment",
    "education",
    "economic",
    "direction",
    "business",
    "behavior",
    "abnormal",
    "category",
    "irrelevant",
    "investment",
    "commitment",
    "academically",
    "abyssal",
    "acceleration",
    "abdomen",
    "ability",
    "aggressive",
    "alcohol",
    "ambiance",
    "coworker",
  ],
  // hard
  [
    "alphabetical",
    "affiliation",
    "investment",
    "government",
    "development",
    "conference",
    "community",
    "commercial",
    "campaign",
    "available",
    "administration",
    "establishment",
    "burnout",
    "analytic",
    "authoritative",
    "constitution",
    "dissimilarity",
    "environmental",
    "formulate",
    "identification",
    "methodological",
    "insignificance",
    "misinterpretation",
    "unapproachable",
    "hypothetical",
    "hypnotize",
    "multidimensional",
    "craftsmanship",
  ],
];

/**
 * Returns a random words from the wordList depending on the difficultyId
 * @param difficultyId the difficulty id (1 = easy, 2 = medium, 3 = hard, 4 = mixed)
 */
export function getRandomWord(difficultyId: number): string {
  if (difficultyId < 1 || difficultyId > 4)
    throw new Error("getRandomWord() => invalid difficultyId");
  if (difficultyId === 4) {
    difficultyId = randomNumber(1, 3);
  }
  const words = wordList[difficultyId - 1]; // id - 1 = index
  return words[randomNumber(words.length - 1)];
}
/**
 * Returns an array containing 3 random words based on the difficultyId
 * @param difficultyId the difficulty id (1 = easy, 2 = medium, 3 = hard, 4 = mixed)
 * @returns an array of string contain 3 random words from the wordList
 */
export function getRandomWordSelection(difficultyId: number): string[] {
  const words = [];
  for (let n = 0; n < 3; n++) {
    words.push(getRandomWord(difficultyId));
  }
  return words;
}
