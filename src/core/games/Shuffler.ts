import { getRandomWord } from "../../config/wordList";
import { Room, RoomOptions } from "./../Room";
import arrayShuffle from "array-shuffle";

//
export class Shuffler extends Room {
  private _shuffledWord: string | undefined;
  _hasTurns = false;

  constructor(options: RoomOptions) {
    super(options);
  }

  protected onBeforeRoundStart(): Promise<string> {
    return new Promise((resolve) => {
      // get a random word based on the difficulty id
      const wordToGuess = getRandomWord(this._settings.difficulty);
      console.log("Generated word =>", wordToGuess);
      // set it a the word to be guessed
      this.setWordToGuess(wordToGuess);
      // shuffle the word
      this._shuffledWord = this.shuffleWord(wordToGuess);
      this.setHint(this._shuffledWord);
      // must resolve to be able to move to the next lifecycle
      resolve(this._shuffledWord);
    });
  }

  shuffleWord(word: string): string {
    return arrayShuffle(word.split("")).join("");
  }
  // not needed in this game, but required by the parent class
  onBeforeTurnStart(): string[] {
    return [];
  }
}
