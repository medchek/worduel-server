import { EventDispatcher } from "./EventDispatcher";
import { RateLimiterMemory } from "rate-limiter-flexible";
export abstract class Kernel {
  protected eventDispatcher: EventDispatcher = new EventDispatcher();
  protected wsGlobalRateLimit: RateLimiterMemory = new RateLimiterMemory({
    points: 10, // max requests
    duration: 10, // window in seconds
    blockDuration: 60 * 60, // block period in seconds
  });
}
