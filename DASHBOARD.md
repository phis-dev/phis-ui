# Dashboard: Design

**Status: the contribution, the fan-in and the two phases are built; the clock and the Site's decisions
are not.** What exists is sections 1 to 3, 5, 6 and 8: a Module contributes card descriptors
(`types/dashboard-cards.ts`, `dashboardCards` on the catalog entry), the Site answers the list and each
payload at `/api/site/dashboard-cards` (`gateway/dashboard-cards-route.ts`), the `dashboard` Module fans
them in through one Collection provider, and its card View resolves each payload on its own
(`plugins/runtime-modules/dashboard/`). The Admin Dashboard is the first page drawn this way, with cards
from `core`, `user-management` and `localization`.

What is **not** built is section 4 -- the Controller as a clock, and with it `staleness`, the floor,
staggering, pausing and backoff -- and section 7, the Site's own decisions about order, hiding and
renaming. Until the clock exists, a card is asked once, when it mounts, and the descriptor carries no
staleness to declare: a field nothing reads is worse than a field that is not there yet. Ordering is the
card id, which is to say the owning Module, and section 9's first question is still open.

The card Widget itself decides none of that. It is given a value, whether the value is still coming and
whether it failed, and draws them; what asks, and when, is the Dashboard's card View for now. That is
what makes the clock a move rather than a rewrite, and it is `design/STATE_MACHINES.md`'s rule that a
Widget presents a state it was given rather than holding one.

Only the `stat` form is offered, and it now draws: Core's card takes a `body`, and the `stat` body is
`PhiStatisticControl` -- the same Control the Theme inspector uses, so the house keeps one statistic
rather than two. Before that the figure was written into the card's title slot, which left the eyebrow
as the only word saying what had been counted. `list` and a series card wait for the case that needs
them, on the terms section 9 states.

Decisions taken while writing this are stated where they apply, including the ones that rejected an
earlier answer, because the rejected ones are the ones that come back.

## 1. A Dashboard is a Widget

A Dashboard is a Collection Widget whose items are cards. It is not an Area, not a region, and not a
page that Core owns.

That is the whole shape, and everything below follows from it. A Collection already organizes items,
orders them, lays them out in a grid, carries a toolbar with reload, offers search, filters and
pagination, and has an action vocabulary with `resource`, `item` and `selection` scopes -- which is
where dismissing a card lives. It also already knows what a card is: `PhiCmsCollectionCardPresentation`
maps fields of an item onto eyebrow, title, description, meta, a cover, a mark, a link. None of that
has to be invented for a Dashboard, and inventing it again is the main thing this design avoids.

Because it is a Widget, it can be placed anywhere. A Dashboard filtered to one Module's cards beside
that Module's own surface is the same Widget with different config, not a second feature.

The `dashboard` Module then brings three things and owns none of the vocabulary: the Controller, a
route at `/dashboard`, and a page carrying the Widget. Kill the Module and the Widget still exists for
anyone else to place; a third party can ship its own Dashboard Module reading the same contributions.
That is why the Module stays a Module rather than folding into Core.

### What was rejected, and why it comes back

**A Core-owned `/dashboard` page.** It answers automatic contribution, and it loses switching the
Dashboard off and replacing it. The two looked exclusive for a long while and are not: what Core owns
is the contribution kind, not the page.

**Injection into a page.** A Module contributing a Widget into another Module's page tree is the one
thing the nine Area contribution kinds deliberately do not allow, and a Dashboard is a poor reason to
be the first. A Collection is the same idea with the arrow reversed -- and the reversal matters: in a
Collection, items do not address the collection, the collection queries. A card describes itself and
the Widget's config says what to show, which is what makes the filtered Dashboard free.

**A region like `admin:sidebar`.** A region is structure and appears on every page. A Dashboard is one
surface, and placing it is a decision per page.

## 2. What a Module contributes

A **descriptor**, not content:

```text
identity        which contribution this is, stable across restarts
card kind       which of Core's card forms it takes
title, mark     what the card says and shows before its payload arrives
target          where the card leads, as the Module's own route preset
relevance       which Dashboards it belongs on
staleness       how long its payload stays true
visibility      whether this viewer may see it at all
```

The descriptor is cheap by construction: a Site with twelve Modules can assemble the list without
asking any of them to do work.

**A card is data in one of Core's forms, not a component.** The form names a renderer; the payload
fills it. `itemRendererKey` on a collection resource is that field already, and the Media library is
the precedent for a domain that outgrew the generic card and shipped its own view. So the two tiers
exist before this document: the cheap shared card that nearly everything uses, and an own view for the
rare case that has earned one. A Module reaching for the second tier is a thing to notice, not a thing
to forbid.

**A card shows little and leads out.** It names its target as its own route preset, so the Dashboard
never learns another Module's paths. Cards that try to be a page are how Dashboards become unusable,
and the size of the card is the only thing stopping them.

## 3. Two phases: the list, then each payload

The list arrives in one answer. **Each card then resolves its own payload.**

This is deliberately unlike the Media collection, which returns rows and images and shows one
collection-wide skeleton while its single query is in flight. That is right for Media: its rows come
from one query over one table, and making each row fetch itself would be N+1 for nothing. A
Dashboard's rows come from N Modules that each do real work, so the cost profile is inverted and the
contract is too.

What the split buys:

- **No slowest contributor.** Twelve cards resolve in parallel; the page is as slow as the slowest
  *one*, not as the sum.
- **A failure is one card.** A payload that throws leaves an error in its own card instead of an empty
  Dashboard.
- **The waiting state is legible.** Because the descriptor already carries title, mark and target, a
  card that has not resolved reads as *Support -- loading*, not as a grey box.
- **A rule dissolved.** An earlier draft required contributions to be cheap. They no longer have to be,
  which is better: a mechanism that makes a rule unnecessary beats the rule.

**One request per card, and no chains.** What a card needs, its endpoint assembles server-side, where
the data is and a join costs nothing. A card that fetches, learns what to fetch next, and fetches
again turns its own depth into wall-clock that cannot be parallelized away -- invisible with three
cards on a local database, and the slowest thing on the Site with twelve Modules. An image loading
after the payload is not a chain, and neither is paging inside a card somebody has clicked into: the
rule covers the path to a readable card.

This one stays a rule rather than becoming a mechanism, and the reason is worth keeping: enforcing it
would mean Core orchestrating each card's fetching, and for that it would have to know what each card
needs -- the coupling this whole design exists to avoid.

## 4. The clock

The Controller is the clock, not the fetcher. It says *your turn*; the card fetches itself, because
only the card knows what its payload is.

**A Module declares staleness, not a frequency.** Not *refresh me every minute* but *my figure is old
after about a minute*. That is a statement about its own data rather than a request for service, which
is what makes the Controller's decision obviously the Controller's: the Module describes the world,
the Controller makes policy. It is the same division the upload acceptance draws when it calls itself
the courtesy half while the server is what actually refuses.

What the Controller decides, and only it can, because only it sees all twelve cards:

- a floor, under which nothing is asked however it was declared;
- a budget, so twelve cards stretch rather than twelve honest local opinions summing into something
  nobody owns;
- staggering, so they do not all strike together;
- pausing while nobody is looking -- the cheapest large saving, and only available in one place;
- backing off after a failure, instead of a broken card knocking at its declared rate.

**A card has no timer of its own.** It fetches when asked and never on a schedule it keeps itself.
That is the half of this that can actually be checked: a card renderer holding an interval is a
finding, not a matter of taste.

A card may be honest about the consequence. *3 minutes ago* is true, and a card whose payload is older
than its own staleness may say so, which is better than every card pretending to be live.

## 5. Marks and pictures

A Module contributes **no images at all**. Two different things look like one question here:

**The mark** -- the small sign beside the title -- follows MODULES.md: an icon a preset names is
already resolved when it names it. The bundled `antd:` set qualifies, and so does a mark the Module
ships in its own source, inline and in `currentColor`. What does not qualify is a lookup: `iconify:`
fetches from a third party in the visitor's browser, `asset:` names a file a fresh Site does not have.
A card contribution is exactly the case that rule was written for -- it ships with the Module, and
nobody along the way chose it.

**The picture in the content** -- a thumbnail, an avatar -- is not contributed. It is part of the
payload the card resolved, and it lives wherever that data lives. The card presentation already says
so: a path to something already servable.

A third party that wants a real picture of its own has a Space for it. Custody follows the uploader
(THREADS.md section 5): a person writes into their own User Space, an Add-on into its own Add-on
Space. Not the Site Space, but not nothing either -- and once it is a delivery path, it is a picture
in the content and needs no rule of its own.

## 6. Who sees a card

**The provider answers, and Core does not guess.** Whether somebody may see the Support card is
Support's question.

A card the viewer may not see does not appear -- it is not an empty card, because an empty card
reports that the thing exists. That is why visibility belongs in the descriptor rather than in the
payload: a card that may not be seen should never reach the loading state.

## 7. What the Site owns

The Module offers; the Site decides. So the page holds the Site's **decisions** -- order, hidden,
renamed -- and the Modules supply the **candidates**.

Rendering is the difference of the two sets. A candidate with no decision is new and appears; a
decision whose candidate is gone is dropped silently. A freshly activated Module therefore shows up by
itself, and a card somebody dismissed stays dismissed -- with no *already seeded* marker to keep in
sync, because there is nothing to remember.

This is also the answer to who a card belongs to, a question that took three attempts. An offer means
the Site owns what it accepts.

## 8. The one new joint

A Collection reads **one** provider: `source` is a single `providerKey` plus a single `resourceKey`. N
Modules mean N contributions, so something has to fan them in.

**The fan-in lives in one provider, owned by the Dashboard Module.** It collects what the active
Modules declare and answers as one resource. The Collection Widget does not change -- one provider,
one resource key, exactly as Media uses it -- and Media is untouched. Pagination and totals keep
working because descriptors are cheap and countable.

What Core owns is only the contribution kind, so a third party's own Dashboard Module can collect the
same declarations.

**Making `source` plural was rejected.** It would force ordering, pagination and totals to be answered
across sources for every Collection in the house, including the ones that will never have more than
one.

## 9. Open

- **Ordering across contributions.** The Collection sorts; by what, for cards that have no natural
  order, is not settled. It is not a Module's decision -- a Module that could state its position would
  turn the Dashboard into a contest.
- **Where the Site's decisions are stored.** Controller state or the page tree; both are plausible and
  the choice has consequences for what survives a preset change.
- **Whether a series card is needed.** `stat` and `list` carry the cases in sight. A chart is a Core
  control when somebody actually has a series, and every form Core offers is a promise it then keeps.

## 10. Order

1. The contribution descriptor, and the fan-in provider in the `dashboard` Module.
2. The card forms -- `stat` and `list` -- against the existing card presentation.
3. The Controller as a clock: staleness, floor, stagger, visibility, backoff.
4. The Site's decisions: candidates minus decisions, dismissing through the item action.
5. The first two real contributions, from `@phis/ui/threads` and `@phis/support`.

Step 5 is last on purpose. Until two Modules that know nothing of each other have both put a card on
the same Dashboard, every decision above is a guess about how it will be used -- and the two questions
in section 9 that are worth deciding late are exactly the ones those two contributions will answer.
