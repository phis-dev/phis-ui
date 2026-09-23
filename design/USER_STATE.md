# User state design

This is a design, not a contract: none of it is built. There is no declared key family for user state and
no route behind it.

A Module-owned table for one boolean per visitor, a cookie invented for the purpose, or a `localStorage`
key standing in for an account-bound fact is not an allowed substitute for this design.

## What exists today

Nothing a Module may write, and that is worth stating plainly: this is a missing capability rather than a
mess to clean up.

- `phis.user_accounts` holds `preferred_locale` and `flags`, and its contract says it carries nothing
  else. `phis.user_profiles` is a fixed set of name and address columns. `phis.user_site_memberships`
  holds `user_site_flags`, `authorization_revision` and `last_login_at`.
- Account-bound decisions are therefore bit flags today: the Theme halves are `1 << 2` and `1 << 3` in
  `user_accounts.flags`, newsletter consent is a bit in `user_site_flags`. That is right and stays right
  for what Core itself owns.
- It does not extend to Modules. A bit is a centrally allocated, closed resource; there is no way to hand
  bits to an unknown number of Modules with an unknown number of cards. That boundary is where this
  design starts, and where it also ends.
- Two places in `@phis/ui` reach for browser storage and neither is this: the Form runtime keeps an unsent
  draft in `sessionStorage`, and the brand controls keep an editing preference. Both are per-device
  conveniences that may be lost.
- Nothing dismisses, marks read, or remembers a per-account choice anywhere, because there is nowhere to
  put it.

## Core model

The row this belongs on already exists. `phis.user_site_memberships` is unique on `(user_id, site_id)`
and its contract already calls it "the Site membership and Site-state source" -- which is exactly the
scope a Module's user state needs, because a Module exists inside one Site and a card dismissed on one
Site is not dismissed on another.

So this is a declared JSONB column on that row, not a new store:

```text
Module declares its keys, their shape and their default
        |
        v
user_site_memberships.module_state -> "<package>/<key>"
        |
        +--> read: with the membership row, already loaded while the session resolves
        |
        +--> write: through the relay, one sub-key at a time
```

`user_accounts` is deliberately not the anchor. It is global, and global is the wrong scope for anything a
Module owns. Where something really is global -- the Theme halves are -- it is already a flag on the
account and stays one.

A JSONB column with namespaced sub-keys is an established pattern in this database rather than a new idea:
`media_assets.meta` carries `meta.image.focus`, `meta.font` and `meta.source` side by side, and its
contract says later metadata reuses the same field "under their own namespaced keys".

It gets a column of its own rather than a shared `meta`, and there is nothing to share with in any case --
`user_site_memberships` has no `meta` today, so either way a column is added. Three things separate the
two contents. Core would write its own metadata through migrations and its own code while Modules write
theirs through a validating route, and separate columns make a stray write across that line impossible
instead of merely forbidden. The size policy differs, because a Module namespace is paid for on every
request that resolves a session while Core metadata is not. And `meta` on a row means facts about that
row -- an Asset's focus point, a font's metrics -- whereas this is foreign data that lives here because
the scope fits, which is a different kind of content and should not borrow that name.

Because the contract declares the keys, their owner and their shape, the physical location stays
exchangeable. If the size question becomes real, the column becomes a
`(user_id, site_id, module_id, key, value)` table with selective loading and no Module notices. That is
the reason to take the simpler one now: one column, one read, no join.

## Ownership and naming

- A key is `<moduleId>/<key>` -- the Module's own id in front, the way a Widget type already carries it
  (`@phis/example/modules/site/widgets/note`). Two Modules writing `dismissed` would otherwise be the
  first collision, and it would be silent.
- **The prefix is the authorization.** A Site's active Module ids are already published, so the server
  needs nothing else to answer whether a key may be written: does it begin with the id of a Module this
  Site has switched on, and is the person the session's own. Activation is stored per Area while this
  state is per Site, so the union across the Areas is what counts -- a Module active in App may write
  from anywhere, because a decision does not stop at an Area boundary.
- A Module declares its keys in its Module descriptor, with the value shape. That declaration is contract
  discipline rather than authorization: it lets the browser refuse a malformed write before sending, and
  it makes what a Module stores readable from its own code. It does not travel to the server, because
  the server does not need it.
- A Module reads and writes only keys it owns. A fact meant to be shared is published the way a Module
  publishes anything else, not by letting everybody read the row.
- Deactivating a Module hides its keys and does not delete them; switched on again, it finds what its
  users chose.

## Shapes, and the one that scales

The shape set is closed, and the closure is the point: an open value invites a list that grows forever.

- `flag` -- one bit under one key. A dismissed card, a hint someone turned off.
- `marker` -- one monotonically increasing value, usually a timestamp or sequence number. "Read up to
  here." This is the shape that makes a feed affordable, because one value answers a question a set
  answers only by growing.
- `value` -- one JSON document under a declared value schema. A state machine's persisted position is this
  shape: state key plus definition version.
- `set` -- a bounded collection with a declared limit and an eviction rule, for the case a marker
  genuinely cannot express.

A `set` is the shape that needs a reason. "Which news were read" is a marker, not a set: a reader who has
seen everything up to Tuesday has read everything before it, and a decade of ids carried on the membership
row is the cost of not noticing that. Where order really is arbitrary -- a handful of dismissed cards,
each independent -- the limit and the eviction rule are what keep it a handful.

## When it is read

Reading during the server render is what makes a dismissed card never appear. Reading it in the browser
makes it appear and then vanish, which is the worse result for the more complicated path.

It is a read of its own, not a field that comes along. Session resolution does join the membership row,
but it takes one integer out of it, and hanging a JSONB object there would charge every request that
resolves a session -- including every API call and every render that wants none of this. The renders
that want it ask for it.

On Public it is forbidden, and [STATIC_RENDERING.md](../STATIC_RENDERING.md) says why in its first rule: a
Public page is rendered once for every anonymous visitor, `cookies()` there returns empty values without
an error, and the document names "last seen" among the things that must be loaded in the browser
afterwards. A Widget that wants an account-bound fact on a Public page loads it after the page arrived and
is built to look right before the answer comes, or it does not belong on a Public page.

A key that was never written is absent, not a default value in the row. What absence means belongs to the
declaring Module: an undismissed card is shown, an unread feed is entirely unread.

## Writing

- A write goes through the Site relay with CSRF, on the same terms as a Form handler submit. Browser code
  never reaches Core directly and never carries the internal token ([FORMS.md](../FORMS.md)).
- **A write touches one sub-key.** Reading the whole column, changing it and writing it back would let two
  Modules writing at the same moment overwrite each other -- and on one shared row that is not a rare
  case. The write names its key and Core sets that path, leaving every other namespace untouched.
- **The server's check is the one that counts.** `@phis/ui` and phis ship separately and may carry
  different versions of the shared contract, so the browser checking before it sends is a saved round
  trip, not a substitute. A shape the server does not know is refused with an error rather than stored
  and read back as something else -- which keeps a newer Module against an older server a clear failure
  instead of a quiet corruption. The route stays additive: a later shape takes nothing away from an
  earlier one.
- The write names its shape and the route checks the value against it, along with that shape's promises:
  a marker may not move backwards, a set stays under its limit, a namespace stays under its size. The
  shape is not a security question -- a Module that calls the same key a flag today and a marker tomorrow
  damages only its own data, which is a bug in that Module and not an attack -- so the route takes the
  shape from the write rather than needing the declaration on this side.
- A write is an action, not a render. A Controller writes because something happened; a Widget reports
  what the visitor did and does not write while presenting.
- The last write wins. No merge, no vector clock, no offline queue: two tabs of one account are the
  realistic conflict, and losing the older answer is correct there.
- A write answers, so the caller learns whether it was stored. A card that quietly failed to dismiss is
  the bug this prevents.

## Deletion and personal data

User state is personal data, and anchoring it on the membership row is what makes that cheap: the row
already cascades from `user_accounts` and from `sites`.

- Deleting an account deletes its memberships and with them every Site's user state.
- Deleting a Site deletes them from the other side.
- Removing one membership deletes that Site's state for that user; the account and its other Sites are
  untouched.
- An export of a person's data reads the same rows.

What does not come for free is uninstalling a Module for good: its namespace then sits in many rows and
has to be removed from each. That is a Site operation with an explicit answer, not a silent orphan.

## Anonymous visitors

Out of scope, on the same grounds [TOURS.md](./TOURS.md) puts anonymous progress out of scope: without a
membership row there is nothing to write on, and the alternatives are a cookie or browser storage, which
are per-device facts and not this. A Module wanting a per-device convenience uses browser storage
deliberately and says so; it does not get a fake account-bound key that silently forgets.

## Relation to state machines

[STATE_MACHINES.md](./STATE_MACHINES.md) declares a `persistence` target. `profile` becomes available once
this exists, and a machine then keeps its position here as a `value`.

The direction matters: this is not part of the machine, the machine is one of its callers. A dismissed
card and a read feed are not state machines -- a card has two states and no course of events, and a set of
read ids is not a state set at all. Modelling them as machines would produce a definition per card that
explains nothing, which is what happens when the only way to persist something is to call it a machine.

## Non-goals

- Not a session, and never a permission. Authentication state lives in Core's session and is never
  mirrored here. A signed-in person can write whatever they like into their own namespace -- these are
  their own preferences, and nothing may ever read one as a grant. The activation check keeps the row
  clean, not the Site safe: no state from Modules this Site does not have.
- Not a replacement for flags. What Core owns and knows in advance stays a bit in `flags` or
  `user_site_flags`; this is for keys Modules declare.
- Not global. `user_accounts` is not the anchor, and a person on two Sites has two answers.
- Not a cache. Nothing here is derived from something else and refreshable; every value is a decision
  somebody made.
- Not domain data. What a Module needs in order to work -- an order, a booking, a submitted form --
  belongs in that Module's own storage. The rule of thumb: if losing it would be a support case rather
  than a small annoyance, it is not user state.

## Candidates

| Candidate | Shape | Area |
| --- | --- | --- |
| A dismissed Dashboard card | `flag` per card, or one bounded `set` | App |
| A read feed or news list | `marker` | App; on Public only after the page arrived |
| Guided Tour progress | `value` (state key plus definition version) | any |
| A state machine's persisted position | `value` | any |
| A collapsed panel that should outlast the device | `flag` | authenticated Areas |

The first two are what make this worth building; the rest is what it then also carries.

## Open questions

1. **Server-side writes.** A Module that marks something read as the side effect of a server action has no
   browser write to make. Letting Core write on a Module's behalf needs a narrower rule than "a Module
   owns its keys".
2. **Eviction for `set`.** Whether the limit is declared per key or fixed by the contract, and whether
   eviction is oldest-first or the Module's choice.
3. **Size.** The row travels with session resolution, so a large namespace is paid for on every request.
   Whether the contract caps the serialized size per Module, and what happens at the cap.
