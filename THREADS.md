# Conversation Surfaces

This document defines the conversation surfaces in `@phis/ui` and what a Module contributes to them. It
applies to the `threads` Runtime Module, to the group and Support Modules that reuse its composer, and
to any third party that shows a conversation.

**The data model is not here.** Threads, messages, participants, the visibility predicate, message
confidentiality and attachment custody are Core's, and they are written down in
[phis-server design/THREADS.md](../phis-server/design/THREADS.md). That document is cited by section
number from elsewhere in this package; this one never restates it, because a second description of a
schema is the copy that eventually disagrees.

## 1. What this Module owns

**Conversations live in Core and are reachable without this Module.** A Site that installs nothing can
still hold threads: the rows, who may read one, and what happens when a message is written are all Core
decisions, answered at `/api/site/threads` and guarded by the Site session.

What `@phis/ui/modules/threads` owns is the **surfaces** -- how a person sees a conversation, chooses
one, and writes into it. It is thin on purpose, like the groups Module: the Module is what a Site
switches on to *show* conversations, not what makes conversations exist.

`eligibleAreas` is `["app"]` and nothing else. The page is `/conversations`, the preset key is
`app-threads-page`, and everything below is about that Area.

## 2. Three surfaces, and why they are three

A conversations Page is a listing, a reader and a writer, each in its own slot of the base page
scaffold:

```text
inbox          a generic Table over the thread library Provider
conversation   thread-conversation, reading one thread
composer       thread-composer, writing into it
```

**The inbox is not a Widget of this Module.** It is Core's Table Widget bound to a Provider this Module
offers, which makes it three replaceable things instead of one: a Site may restyle the Table, swap the
Provider behind it, or place a second listing with a different filter, and none of that touches the
reader or the writer. A bespoke inbox Widget would have made all three one decision.

The resource is `inbox` (`rowIdentityPath: "id"`), and it declares `rowActivation: true`, which is what
lets a click on the row open the conversation rather than only the control beside it
([TABLES.md](./TABLES.md)).

## 3. Who translates between them

The three surfaces speak different vocabularies and none of them may learn another's. A Table reports
`{ selectedRowIdentities }` -- a list of row keys, true of every Table on every Site and saying nothing
about conversations. The reader and the writer read `{ threadId }`, because that is what they are
about.

The Conversations Controller is the translation, and it is the only code allowed to know that a row key
in *this* listing is a conversation id. Labelling one as the other would satisfy every check on the
route and hand the receiver a payload it cannot read ([SIGNALS.md](./SIGNALS.md)).

Everything else it does is choreography no single Widget can perform: the toolbar's `+` opens the
dialog, the dialog's footer buttons submit or cancel the Form inside it, an accepted submit closes the
dialog, asks the listing to read itself again and announces the conversation that was just opened.

**It addresses nobody by Widget id.** The Page writes the Controller's routes in `controllerSettings`,
beside the routes it already writes for every Widget on it, and the Controller emits through its
declared capabilities. It held a preset id map until that was possible, which worked only while one
piece of code owned both ends.

## 4. Kinds, and whose they are

A thread's kind is fixed when it is opened, and a Site offers a kind only while one of its active
Modules declares it.

| kind | declared by |
| --- | --- |
| `direct` | this Module |
| `group`, `cross-group` | the groups Module |
| `support` | `@phis/support` |

The split is not about where the code is easiest to put. Group conversations exist because a Site runs
groups, and Support conversations because a Site runs Support -- each is a Site deciding to operate
that thing, not a Site deciding to show conversations. A Module that declared a kind it does not
operate would be offering something it cannot answer for.

## 5. Attachments

Custody follows the uploader: a person writes into their own User Space, never the Site Space. The rule
and what it does not change are Core's, in
[phis-server design/THREADS.md](../phis-server/design/THREADS.md) section 5.

What this Module declares is the need -- `mediaSpaces.user.kinds` -- and the list is its own module
because both halves of the offer read it from opposite sides of the Server/Client seam: the Module
definition declares the Space on the Server, and the composer offers the file dialog in a browser. A
Client Widget reaching into the definition to find out what it may accept would pull the Module's
Providers, Forms and label sets into the browser bundle.

`binary` is absent, for the reason the groups Module leaves it out: distributing executables is a Site
decision, taken in the Site Space.

## 6. The composer is shared

The composer is the one place a message is written and a file is hung on it. The group and Support
Modules reuse it rather than each growing their own.

That is a promise to two other Modules, and it constrains this one: a change to the composer that
assumes a direct conversation breaks Support, and a Site that has this Module switched off still has a
composer wherever those Modules put one.

## 7. What the Module contributes

| contribution | what it is |
| --- | --- |
| Widgets | `thread-conversation`, `thread-composer` |
| Data Provider | the thread library Table Provider, resource `inbox` |
| Options Provider | conversation candidates -- who this viewer may write to |
| Form | the new-conversation Form and its handler |
| Route preset | `app-threads-page` at `/conversations`, plus its sidebar entry |
| Controller | the translation above, mounted on demand |
| Media Space | the User Space kinds in section 5 |
| Dashboard card | unread conversations, on the App Dashboard |

**Foundation names, and the Module's own alias.** The listing's Provider key is a Foundation contract,
so anybody outside this Module cites that name; the Module keeps an alias so it need not spell its own
namespace back to itself. The two are the same string and look different in source, which is worth
knowing before writing a check that compares them as text.

## 8. What the Dashboard card counts

The card on the App Dashboard counts **conversations with unread messages, not unread messages**, and
its title says so.

Core marks a thread unread by comparing its last message against what this reader has read, so three
new messages in one conversation and one in each of three are the same number to it. There is no
message-level count to read. A card headed "New messages" showing that figure would be wrong in the one
direction nobody checks -- downward, quietly, whenever a conversation runs on.

It is also the first card about the viewer rather than about the installation, which is why
`PhiDashboardCardContext` carries the request's cookies: Core answers "my conversations" from the
session and refuses without one ([DASHBOARD.md](./DASHBOARD.md)).

## 9. The language a message is written in

**Nobody is asked.** Nothing on these surfaces offers a language picker, and no message carries a
language a person chose -- because a translator determines the source language itself, and asking would
have been a field somebody has to fill in for an answer that is already available for nothing.

### Why nothing is asked

The obvious design -- the writer declares it -- was built and taken out again, and the reason is worth
keeping: the field would have decided *whether there is anything to translate at all*, which only pays
where translating happens by itself. It never does here. A translation is one press of one button by one
person who does not understand one message, and that person is a better filter than any stored value:
they do not press on the messages they can read.

What a declared language would have bought is therefore a control that hides itself -- against a field
in every composer and every conversation form, filled in by everyone, for the sake of the few who ever
translate.

**The source language is still known afterwards.** A provider reports what it detected, so a translation
can say which language it came out of. It is a result rather than a precondition, which is all this
surface needs.

### The one place a language is stored

`thread_messages.source_lang` exists and stays, and **only an integration writes it**
([phis-server design/THREADS.md §14](../phis-server/design/THREADS.md)). An Add-on delivering messages
usually knows the language for nothing -- a mail header, the locale of the page a form was submitted
from, the browser language a chat widget saw -- and that is a fact which is lost if there is nowhere to
put it. It is also the only kind of value a *filter* can use: routing Portuguese enquiries to the people
who speak Portuguese needs a stored column, because nothing that comes into being while somebody reads
can appear in a `WHERE` clause.

Since no surface writes it, the column reads cleanly: a value present means an integration said so, and
null means nobody did. These surfaces only ever read it, and today not even that.

### The ad-hoc translation

**The original always remains.** A translation is a *view* of a message, never a version of it. Nothing
is persisted: not the text, not a record that it was shown.

- **The thread shows originals.** Translating is never automatic and never a consequence of two
  languages differing.
- **One message, one control, one round trip.** Not a thread at a time. A mixed thread translated in one
  batch asks the provider for German into German for every message that is already German, and a batch
  could skip those only if it knew their languages -- which it does not, because nothing declares them.
  A person does know, and skips them by not pressing.

  Two measurements against the DeepL Free API sharpen this and correct one thing it would have been easy
  to assume. Billing is by **source** text, and a German sentence asked for German is charged in full
  like any other, so the waste is real. But the text comes back **byte-identical**, twice measured, with
  and without an explicit source language -- so a batch would not have corrupted originals at DeepL, and
  this section does not claim it would. What has no such assurance is a Provider behind the `add-on`
  mode, which may be a model that rewrites; the risk is a Provider's, not a fact about translation.

  The deciding reason is the second measurement: texts in one batch **share no context with each other**,
  so the coherence a batch seemed to offer does not exist -- while `context` applies to the whole request
  and is not billed. One message per request is therefore the only shape in which `context` can carry
  *that* message's neighbours instead of one compromise for all of them. Batching would have cost money
  and bought nothing.
- **The inbox is not translated.** A thread list is many short subjects in mixed languages with nobody
  pressing per row, so it is the one place where the batch problem above has no human to solve it --
  and short text is what detection is least reliable on. If it ever happens, it happens for a listing
  whose rows come from integrations, whose languages are therefore stored and can be skipped.
- **Neighbouring messages travel as `context`, not as more texts to translate.** That is what the field
  is for -- "the subject matter, the surrounding sentence, the register to keep" -- so the surrounding
  conversation informs the translation without being translated with it, and without being charged for:
  measured, `context` adds nothing to the bill, while the same words sent as a text to translate would
  be billed in full. It is how one message at a time gets coherence a batch could not have given it.
- **Core decides and calls**, because the message body lives there and `Confidential` means it may not
  leave Core -- a Site fetching the body and posting it onwards would have moved it out already, and the
  rule would be circumvented rather than kept.
- **The target** is the Site's locales intersected with what this installation's translation unit can
  do, preselected from `viewer.preferredLocale` and falling back to `site.defaultLocale`.
- **It toggles back.** "Show the original" is the same control, not a second feature.
- **It is marked as machine-made**, and says which language it came out of where the provider reported
  one. Unmarked, it reads as what the person wrote, and a machine translation carries a tone nobody
  chose.
- **`Edited` is never set.** That flag means a person changed the message. A translation changes
  nothing.
- **A reply quotes the original**, as do search, notification bodies and export -- because the original
  is the only thing that exists.

**The cache is memory, and the Area ends it.** A translation may be kept for as long as the surface is
mounted, so pressing twice does not ask twice. An Area change is a hard navigation
([SHELL.md](./SHELL.md)), so client memory ends with it on its own; `sessionStorage` would survive the
boundary and would then need the clearing that memory gets for nothing.

### What the Core half needs

In order:

1. ~~**A provider-neutral translation unit.**~~ Done. `translation.mode` is
   `deepl | cdn+deepl | add-on | none`, and the unit that answers it lives apart from the label
   machinery -- no translation context, no persisted cache key, no marker accounting. Those belong to UI
   copy, and message bodies must never enter that pipeline ([TRANSLATIONS.md](./TRANSLATIONS.md)).
   `add-on` hands the work to a Provider implementing the `translation` service kind, which the operator
   selects; DeepL is therefore the default and not a dependency.
2. **The `add-on` call itself.** The service kind, its interface and the operator's selection are in
   place; resolving the selected Provider and calling it is not, so `add-on` currently answers
   `unconfigured`.
3. **A capability answer**, carried in `serverCapabilities`: whether this installation can translate.
   Never the key. Without it a Site renders a control that cannot work.
4. **The offered target list**, as the intersection above. DeepL answers by API, and a Provider answers
   through `probeCapabilities`, which is asked once when it is configured rather than per translation --
   a list fetched at the moment of use is one that decides whether a control may be drawn after it has
   been drawn.
5. **The route**: `(messageId, target locale)` -- may this viewer read the message, is it
   `Confidential`, can this installation translate; then call, return, store nothing. It passes the
   message's `source_lang` where an integration recorded one and `null` otherwise, which is the
   contract's own way of saying "you decide" and needs no branch on either side.

The body sent is `body_markdown ?? body_text`. Markdown passes through as text and the control codes
survive, so the richer body is the one to send, and the answer is rendered the way the original is.

## 10. Open

- **Virtualisation.** A conversation read upwards rather than a page at a time is the case
  [TODOS.md](./TODOS.md) names for it. Even there the first answer is loading on scroll by cursor;
  virtualisation only pays once thousands of rows stay mounted, and this surface has to make that case
  with its own numbers.
- **The row is not reachable by keyboard.** Clicking a row opens the conversation; the selection column
  is the keyboard path and is unchanged, so nothing was lost -- but the mouse has a way the keyboard
  does not, and making table rows focusable is its own piece of work.
- **Rate limiting the translation control.** A button that calls a paid third party once per press, per
  person, per message. Nobody has seen a bill yet.
- **Whether this Module becomes its own package**, on the terms [TODOS.md](./TODOS.md) states for the
  groups Module.
