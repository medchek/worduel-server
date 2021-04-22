import { getRandomRiddle } from "../../config/riddleList";
import { Player } from "../Player";
import { Riddle, Room, RoomOptions } from "./../Room";

//
export class Riddles extends Room {
  _hasTurns = false;

  constructor(options: RoomOptions) {
    super(options);
  }

  protected onBeforeRoundStart(): Promise<string | Riddle> {
    return new Promise((resolve) => {
      // get a random word based on the difficulty id
      const riddle = getRandomRiddle();
      console.log("Generated riddle answer =>", riddle.answer);
      // set the riddle that helps guess the word
      this.setHint(riddle.riddle);
      // set it a the word to be guessed
      this.setWordToGuess(riddle.answer);
      const answerLen =
        typeof riddle.answer === "string"
          ? riddle.answer.length
          : riddle.answer[0].length;
      // must resolve to be able to move to the next lifecycle
      resolve({ riddle: riddle.riddle, answerLen });
    });
  }

  // override the parent method for extra checks
  public checkAnswer(player: Player, answer: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // if the word to guess is not set yet
      if (!this.wordToGuess) return reject("Error: wordToGuess is not set");
      // if the player has already found the answer and sends more messages while the round is still ongoing
      if (player.hasAnswered) return resolve(2);
      // this is where the differences come to play
      // the riddle answer can also be a string containing all the possible answers
      // if the word to guess length is not similar to the client answer
      if (Array.isArray(this._wordToGuess)) {
        //
        if (this._wordToGuess.includes(answer)) {
          // player has found the correct answer
          resolve(1);
        } else {
          resolve(0);
        }
      } else {
        if (this.wordToGuess.length === answer.length) {
          // if the answer is correct
          if (this.wordToGuess == answer) {
            // set the player as having found the correct answer
            resolve(1);
          } else resolve(0); // incorrect answer/ regular chat message
        } else {
          // player answer is incorrect
          resolve(0);
        }
      }
    });
    //
  }

  // not needed in this game, but required by the parent class
  onBeforeTurnStart(): string[] {
    return [];
  }
}
