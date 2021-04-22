export interface RoomSettings {
  timePerRound: number;
  roundCount: number;
  difficulty: number;
}

export const defaultRoomSettings: RoomSettings = {
  timePerRound: 60,
  difficulty: 2,
  roundCount: 6,
};

export const gameSettings = [
  { id: 1, value: "shuffler", available: true },
  { id: 2, value: "guess", available: false },
  { id: 3, value: "riddles", available: true },
  // to be added
];

/**
 * Settings id 1
 *
 * value correspodns to difficulty name
 */
export const difficultySettings = [
  { id: 1, value: "easy" },
  { id: 2, value: "normal" },
  { id: 3, value: "hard" },
  { id: 4, value: "mixed" },
];
/**
 * Settings id 2
 *
 * Value corresponds to n of rounds
 */
export const roundCountSettings = [
  // setting id 2
  { id: 1, value: 2 },
  { id: 2, value: 4 },
  { id: 3, value: 6 },
  { id: 4, value: 8 },
  { id: 5, value: 10 },
];
/**
 * Setting Id 3
 *
 * Value corresponds to time in seconds
 */
export const timePerRoundSettings = [
  { id: 1, value: 30 },
  { id: 2, value: 60 },
  { id: 3, value: 90 },
  { id: 4, value: 120 },
  { id: 5, value: 150 },
];
