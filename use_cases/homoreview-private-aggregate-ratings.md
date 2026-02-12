# Private aggregate ratings: computing averages without seeing individual scores

## The problem

When customers submit ratings to a service, the service sees every individual score. This creates problems:

- **Retaliation against low raters**: Even if the reviewer is "anonymous," the service knows "someone rated me 1 star at 3:47 PM" and can correlate this to recent interactions.
- **Rating manipulation**: A service that sees individual ratings can selectively suppress or highlight them.
- **Customer profiling**: A service that knows your rating pattern across multiple interactions can build a profile of your preferences and satisfaction patterns.

Current anonymous review systems hide the reviewer's identity but still reveal the individual rating to the service or aggregator. The service knows "someone gave 2 stars" -- it just doesn't know who.

The fundamental gap: there is no way to compute aggregate statistics (average rating, total count) without anyone -- not even the service provider -- seeing individual ratings.

## How it works (conceptually, not technically)

1. Each reviewer encrypts their rating using the service's public key, using a special type of encryption that allows math to be done on encrypted values.
2. The reviewer also generates a proof that their encrypted rating is valid (between 1 and 5 stars).
3. The service collects all encrypted ratings. It can add them together while they're still encrypted -- the sum of encrypted values equals the encryption of the sum.
4. The service decrypts only the total sum and divides by the number of reviews to get the average. Individual ratings are never decrypted.

The result: "47 reviews, average 4.1 stars" -- with every individual rating remaining private.

## Why this changes the game

- Service providers get useful aggregate feedback without seeing individual scores.
- Reviewers can rate honestly knowing their specific score is mathematically hidden, even from the service.
- Eliminates the most subtle form of review manipulation: selectively weighting or filtering individual ratings.

## Use case scenarios

### Honest DVM quality tracking
A service tracks its aggregate rating over time for quality improvement, without being able to identify or suppress individual low ratings.

### Trustworthy public ratings
Published aggregate ratings are based on computations the service literally could not manipulate at the individual level, because it never saw individual values.

### Sensitive service feedback
Healthcare, legal, or financial services receive aggregate satisfaction metrics without ever seeing how any specific client rated them.

### Competitive benchmarking
Services publish aggregate ratings where the integrity is mathematically guaranteed -- reviewers know their individual scores can't be cherry-picked.

## What this doesn't solve (and that's okay)

- The service still controls whether to publish the aggregate. It could suppress unfavorable aggregates.
- The encryption means individual reviews can't include text explanations -- only numerical ratings.
- The service holds the decryption key. A more trustless version would require threshold decryption across multiple parties.
- Reviewers can't verify their specific rating was included in the aggregate without additional machinery.

## Who this serves

- Services that want credible aggregate ratings without the temptation of individual score manipulation
- Reviewers who want to rate honestly without even numerical scores being visible
- Ecosystems that need aggregate quality metrics with mathematical integrity guarantees
