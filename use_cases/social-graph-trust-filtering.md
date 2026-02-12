# Trust-filtered reviews: only from people connected to you

## The problem

The current review model treats all reviewers as equal. A review from your best friend and a review from a bot farm in another country carry the same weight. This is insane.

When you look at Google Maps reviews, Yelp, Amazon -- you're seeing an undifferentiated mass of opinions from strangers. You have no idea:

- Are these people real?
- Do they have similar tastes or standards to you?
- Were they paid or incentivized?
- Do they even live in your city, your country?
- Would anyone you know vouch for them?

Meanwhile, the signal you actually want -- what do people *I trust* think? -- is locked in text messages, scattered across group chats, mentioned in passing conversations you've already forgotten.

## Why existing "social" features fail

Some platforms have tried lightweight versions of this:

- **Google Maps** shows "Your friends reviewed this" if a Google contact left a review. But it requires them to use their real identity (see: anonymity problem), it only shows direct contacts (not extended network), and almost no one has their Google contacts meaningfully populated.
- **Yelp** had a social graph but it was platform-specific and shallow. You had to be "friends" on Yelp specifically.
- **Facebook recommendations** exist but are tied to the Facebook identity and only surface to direct friends. The platform's incentives don't align with honest reviews.

All of these fail because they require:
1. People to use their real, identifiable accounts (conflicting with anonymity)
2. A platform-specific social graph (fragmented, incomplete)
3. Public reviewing behavior (most people lurk)

## What "degrees of connection" actually means for trust

There's a natural trust gradient in social networks:

- **1st degree (your direct contacts)**: You know them personally. You know their taste, their standards, their quirks. A review from them is almost as good as asking them directly.
- **2nd degree (their contacts)**: You don't know them, but someone you trust does. That's meaningful. If your friend's friend says a restaurant is great, there's an implicit vetting -- your friend chose to connect with this person.
- **3rd degree**: Weaker signal, but still within a social fabric that has some accountability. Someone in this network could theoretically trace back to you. That creates a baseline of good behavior.
- **4th degree and beyond**: Signal gets noisy. But in some contexts (niche communities, specific interests) it can still be valuable.

The key insight: **you don't need to know who the reviewer is to benefit from the trust gradient.** You just need to know that they're within N hops of you in a verified social graph. That alone filters out bots, fake accounts, and paid reviewers with remarkable effectiveness.

## The follow graph as a trust network

Traditional social graphs (phone contacts, Facebook friends) are bidirectional and identity-revealing. A follow graph (like Nostr, or the way Twitter used to work) is different:

- **Directional**: You follow people whose judgment you trust. They don't have to follow you back.
- **Curated**: People are more intentional about who they follow than who they add as a "friend."
- **Public but pseudonymous**: The graph structure is visible (needed for verification) but identities can be pseudonymous.
- **Portable**: Not locked into one platform's database.

When someone you follow follows someone who follows someone... and that person reviewed a restaurant -- you now have a trust-filtered review without anyone revealing their real name.

## What this looks like in practice

You're visiting a new city. You open the app and search for coffee shops nearby. Instead of seeing 4.2 stars from 847 strangers, you see:

- **"3 people in your network reviewed Blue Bottle on 5th"** -- one first-degree, two third-degree connections.
- The first-degree connection (someone you follow) gave it a strong positive. You can see their review.
- The two third-degree connections are split. You can see their reviews but not their identities. You can see the trust path: you follow Alice, who follows Bob, who follows this reviewer.
- A competing shop has 4.8 stars from the general public but zero reviews from anyone in your network. That tells you something too.

Now you're making decisions based on a curated, trusted, human signal instead of a number that might be 30% fabricated.

## The network effects

This model gets more valuable as it grows, but in a *different* way than traditional platforms:

- **It doesn't need everyone**: You don't need millions of users to be useful. If 50 people in your extended network are active reviewers, that covers a surprising amount of your daily decisions.
- **Quality over quantity**: One review from someone in your trust network is worth more than 1,000 from strangers. The threshold for usefulness is much lower.
- **Clusters of value**: The system naturally becomes most useful within communities -- a neighborhood, a professional circle, an interest group. It doesn't need to be globally comprehensive to be locally indispensable.
- **Anti-spam by default**: Fake reviewers would need to infiltrate real social graphs to have their reviews seen. This is orders of magnitude harder than creating a fake Google account.

## Who this serves

- Anyone who has felt overwhelmed by the volume and unreliability of online reviews
- People who already rely on word-of-mouth but wish it were more systematic
- Travelers who want trusted recommendations in new places (friend-of-a-friend who lives there)
- Niche communities (dietary restrictions, accessibility needs, specific interests) where mainstream reviews don't cover what matters to them
- People who have realized that a 4.5-star rating on Google tells you almost nothing
