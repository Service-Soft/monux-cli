import { InMemoryRateLimiterStore, Ms, RateLimiter, TokenBucketRateLimiter, TokenBucketState } from 'zibri';

/**
 * How often a client may send logs: 60 a minute, refilled over that minute.
 * The route is open to everyone, as errors happen before a login too, so this is what keeps it from being flooded.
 */
@RateLimiter()
export class LogRateLimiter extends TokenBucketRateLimiter {
    constructor() {
        super(Ms.MINUTE, {
            name: 'LogRateLimiter',
            // per instance of the api. A RepositoryRateLimiterStore shares the limit across several
            store: new InMemoryRateLimiterStore<TokenBucketState>(),
            capacity: 60,
            maxReservationWaitInMs: undefined
        });
    }
}
