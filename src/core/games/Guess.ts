import { getRandomWordSelection } from "../../config/wordList";
import { Room } from "../Room";

export class Guess extends Room {
  public _hasTurns = true;
  onBeforeTurnStart(): string[] {
    return getRandomWordSelection(this._settings.difficulty);
  }
  // not needed for this game, onBeforeTurnStart is used instead
  async onBeforeRoundStart(): Promise<string> {
    return "";
  }
}
