import { EventDispatcher } from "./EventDispatcher";
import { RateLimiterMemory } from "rate-limiter-flexible";
export abstract class Kernel {
  protected eventDispatcher: EventDispatcher = new EventDispatcher();
  /**
   * 60 points available in a 60 sec (1min) window
   */
  protected wsGlobalRateLimit: RateLimiterMemory = new RateLimiterMemory({
    points: 60, // max requests
    duration: 60, // window in seconds
    blockDuration: 60 * 60, // block period in seconds
  });
}
