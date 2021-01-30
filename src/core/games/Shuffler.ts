import { Player } from "./../Player";
import { getRandomWord } from "../../config/wordList";
import { Room, RoomOptions } from "./../Room";
import arrayShuffle from "array-shuffle";

//
export class Shuffler extends Room {
  private shuffledWord: string | undefined;

  constructor(options: RoomOptions) {
    super(options);
  }

  protected onBeforeRoundStart(): Promise<string> {
    return new Promise((resolve) => {
      // get a random word based on the difficulty id
      const wordToGuess = getRandomWord(this._settings.difficulty);
      // set it a the word to be guessed
      this.setWordToGuess(wordToGuess);
      // shuffle the word
      this.shuffledWord = this.shuffleWord(wordToGuess);
      // must resolve to be able to move to the next lifecycle
      resolve(this.shuffledWord);
    });
  }
  protected onRoundStart(): void {
    //
  }

  /**
   * Check the answer of the player.
   * @resolve Resolves to a number.
   * - 0 = player input is acceptable but uncorrect (should be terated as a regular chat message).
   * - 1 = player input is acceptable and is correct.
   * - 2 = player has already find the answer and keeps sending more messages
   * @reject The promise rejects when the user input in unacceptable/unexpected
   */
  public checkAnswer(player: Player, answer: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // if the word to guess is not set yet
      if (!this.wordToGuess) return reject;
      // if the player has already found the answer and sends more messages while the round is still ongoing
      if (player.hasAnswered) return resolve(2);
      // if the word to guess lenght is not similar to the client answer
      if (this.wordToGuess.length === answer.length) {
        // if the answer is correct
        if (this.wordToGuess == answer.toLocaleLowerCase()) {
          // set the player as having found the correct anser
          // TODO reset playerHasFoundAnswer on round end
          resolve(1);
        } else resolve(0); // incorrect answer/ regular chat message
      } else {
        // player answer is incorrect
        resolve(0);
      }
    });
    //
  }

  shuffleWord(word: string): string {
    return arrayShuffle(word.split("")).join("");
  }
}
