# Phi Access and Visibility Contract

This document is the normative target v1 contract for viewer access and responsive visibility in
`@phis/ui`. `phi-server/AUTHORIZATION.md` owns role and group-claim persistence and server-side
authorization; `phi-server/GROUPS_AND_STORAGE.md` owns general group membership and Media Space
semantics; `phi-server/DIRECTORY_PROVIDERS.md` owns provider authority, Directory bindings, and external
membership provenance. Shared UI must consume those contracts rather than inventing Page-, Widget-,
Navigation-, Collection-, or Module-specific access paths.

The migration is an ABI break. Old role fields, special guards, and responsive-only CMS flags must not
remain as compatibility fallbacks.

## 1. Viewer role and group claims

The runtime carries compact provider-scoped claims:

```ts
type PhiRoleProviderId = `@${string}/${string}`;

type PhiViewerRoleClaim = {
  providerId: PhiRoleProviderId;
  flags: number;
};

type PhiGroupProviderId = `@${string}/${string}`;

type PhiViewerGroupClaim = {
  providerId: PhiGroupProviderId;
  groupKeys: readonly string[];
};

type PhiRuntimeViewer = {
  access: "public" | "authenticated";
  roleClaims: readonly PhiViewerRoleClaim[];
  groupClaims: readonly PhiViewerGroupClaim[];
  resolvedArea: PhiCmsAreaKey | null;
  authorizationRevision: number;
};
```

The Core claim provider is `@phis/phi-server/core`. Role bit spaces are isolated by provider id.
`resolvedArea` selects a landing destination only; it is not an authorization boundary.

The runtime does not transport expanded permission lists, role catalogs, group labels, member lists, or
domain group metadata. Group keys are stable provider-local audience identities, not roles.

## 2. Viewer access policy

Every access-controlled contribution uses one policy:

```ts
type PhiViewerAccessPolicy =
  | { access: "anyone" }
  | { access: "anonymous" }
  | { access: "authenticated" }
  | {
      access: "roles";
      providerId: PhiRoleProviderId;
      allowedRoleFlags: number;
    }
  | {
      access: "groups";
      providerId: PhiGroupProviderId;
      allowedGroupKeys: readonly string[];
    };
```

`allowedRoleFlags` is always an OR mask. `allowedGroupKeys` is also OR and contains at least one stable
key. A matching viewer needs at least one listed role or group for the selected policy variant. There are
no `allFlags`, deny flags, arbitrary boolean policy trees, or feature-permission arrays in v1.

The public helpers are conceptually:

```ts
getPhiViewerRoleFlags(viewer, providerId)
hasProviderRole(viewer, providerId, roleFlag)
hasPhiBaseRole(viewer, coreRoleFlag)
hasProviderGroup(viewer, providerId, groupKey)
canPhiViewerAccess(viewer, policy)
canPhiViewerAccessOwnedPolicy(viewer, policy, ownerProviderId)
```

`hasProviderRole` and `hasPhiBaseRole` report factual role assignment. They do not apply inheritance or
the Admin override. `hasProviderGroup` follows the same factual-helper rule.

`canPhiViewerAccess` implements the normative policy:

- `anyone`: true;
- `anonymous`: true only when not authenticated;
- `authenticated`: true when authenticated;
- `roles`: Core Admin first grants Site-superuser access, otherwise at least one allowed provider role
  must match;
- `groups`: Core Admin first grants Site-superuser access, otherwise at least one allowed provider group
  must match.

Core Admin does not override `anonymous`, Server capability state, Add-on enablement, external-provider
authorization, operator authority, or cross-Site boundaries.

## 3. Core access matrices

Frequently reused Core matrices are exported centrally:

```text
Site administration  = Admin only
Developer tools      = Developer
Structure authoring  = Developer | Builder
Content editing      = Developer | Author | Publisher
Publishing           = Developer | Publisher
Support              = Developer | Supporter
Accounting           = Developer | Accountant
```

Admin is omitted from ordinary masks because `canPhiViewerAccess` applies the explicit Site-superuser
rule. An Admin-exclusive contribution uses the Core Admin role itself.

Helpers should be named by meaning. `hasPhiBaseRole(viewer, Author)` checks a role;
`canPhiViewerAccess(viewer, ContentEditingPolicy)` checks effective access. There is no synthetic
`Editor` role.

## 4. Module and provider boundaries

Server capability binding and viewer access are independent gates:

```text
Module selected
AND Area eligible
AND Server binding available
AND viewer access policy satisfied
= contribution active
```

Every Module may reference Core roles and Core groups, regardless of its bound Add-on. A Module may also
reference roles or groups belonging to its own `serverBinding.providerId`. It must not reference claims
of another third-party provider.

`createPhiRuntimeModuleCatalog(...)` enforces this ownership for Module policies, Widget/Layout
artifact minima, Route and Navigation descriptors, and Area-owned Navigation surfaces. Runtime
evaluation fails closed for a persisted policy whose provider is neither Core nor the owning
artifact's bound provider.

This lets an Add-on-backed Module inject an Admin page using Core Admin roles, a Dev page using Core
Developer roles, and provider-specific content using its own roles.

## 5. Policy placement and inheritance

The same access policy applies to:

- Area definitions;
- Route/Page descriptors and persisted Pages;
- Navigation injections, manual links, containers, and separators;
- Module Widget/Layout minimum access;
- persisted Widget/Layout instances;
- Regions and other renderable contributions;
- Toolbar actions and API operations.

A Navigation item targeting a Route inherits the Route policy unless it explicitly restricts access
further. Manual or external items declare their own policy or inherit their Navigation surface.

Artifact access is the intersection of every containing layer:

```text
Area
AND Page
AND artifact-type minimum
AND concrete instance
```

A child or instance may restrict inherited access but may never widen it.

Server resolution filters unauthorized routes, navigation, and renderable artifacts before they cross
the Client boundary. Client evaluation uses the same policy only for presentation and interaction.
Renderable filtering also precedes demand-controller materialization, so a denied Widget/Layout cannot
mount a controller or pass sibling Draft data to a renderer. Command Toolbar button policies are
filtered from the server-rendered config before the Client toolbar receives it.

The `admin` Area is the shared Site control-plane host. It is not synonymous with the Core `Admin`
role:

- the Area policy allows Core `Developer`; the Core Admin override also grants access;
- Core `Developer` resolves to `/admin` as its landing Area;
- changing users, roles, accounting, and Site administration remains Core-Admin-only; where a
  Developer may inspect such a surface, entry and capability are split as in section 6;
- logs, observability, and developer tooling use the Core Developer policy;
- third-party contributions use Core roles or roles from their own bound provider.

There is no separate `dev` Area, route host, visibility bit, base module, or compatibility alias in v1.

## 6. Capability inside an authorized surface

Access decides entry. It does not decide what an admitted viewer may do. Where one surface is
reachable by roles with different capabilities, the owning controller resolves the difference once and
publishes it as a permission the surface consumes declaratively:

```text
Controller  projects permissions.<name> from canPhiViewerAccess(viewer, <policy>)
            and refuses the same operations itself
Surface     binds disabledWhen conditions to permissions.<name>
```

The controller is the only place that evaluates the policy. A Widget receives a boolean, never a role.
That is what keeps scattered role-specific rendering branches (section 10) removed: a Widget asking
for a role reimplements an authorization decision it does not own, in a place the server cannot
mirror.

Projections state a policy, not a role. `!canPhiViewerAccess(viewer, PHI_VIEWER_ACCESS_SITE_ADMIN)`
and `!hasPhiBaseRole(viewer, Admin)` answer identically today, but only the first keeps answering
correctly if the matrix widens.

A projection is presentation. The server stays authoritative and enforces the same split on its own
routes; a disabled control is a courtesy, never the boundary.

User management is the worked example. `/users` carries the Developer-tools policy, so a Developer
enters and reads. The controller projects `permissions.readOnly`, and the page binds cell editing, the
create toolbar action, and the edit and delete row actions to it. `phi-server` mirrors the split per
method: GET behind the Developer guard, every mutating method behind the Admin-only one.

## 7. Viewport visibility matrix

Viewport visibility is a separate presentation dimension on every renderable block:

```ts
const PhiViewport = {
  Compact: 1 << 0,
  Medium: 1 << 1,
  Wide: 1 << 2,
} as const;

type PhiRenderableBlockBase = {
  // other common render-block properties
  viewportFlags?: number;
};
```

The value is common render-block configuration, not Widget-, Layout-, Surface-, or Region-specific
configuration. It is parsed, serialized, inherited, and rendered centrally for every renderable block.
Pages and Navigation are not renderable blocks; when they need responsive presentation they reuse a
separate shared visibility fragment rather than pretending to be renderable blocks.

Suggested initial ranges are:

```text
Compact: below 768 px
Medium:  768 through 1199 px
Wide:    1200 px and above
```

UI labels may call these Mobile, Tablet, and Desktop/Workstation, but the contract describes available
presentation width, not device identity.

The canonical declared values are:

```text
0 = unrestricted; visible at every size
1 = Compact
2 = Medium
3 = Compact + Medium
4 = Wide
5 = Compact + Wide
6 = Medium + Wide
```

`7` is not a canonical persisted value because it duplicates `0`. Selecting every size in authoring
persists `0`. This also makes an unset value automatically include future size classes.

Before inheritance, each declared `0` is normalized to the current `All` mask. Resolved masks are then
intersected. A resolved result of `0` means invisible at every size and must not be normalized back to
All.

Example:

```text
Page declares Compact
Widget declares Wide
Resolved result is 0: nowhere visible
```

Authoring must diagnose such empty intersections.

## 8. Container-query rendering

Responsive visibility uses a named Site/Canvas container rather than user-agent detection or only the
outer browser viewport. Therefore a narrow Builder Canvas behaves as Compact even inside a Wide
desktop browser.

CSS Container Queries own the final show/hide behavior. Viewport visibility:

- is not an authorization boundary;
- does not permit or prohibit APIs;
- may leave hidden markup or Client code in the delivered document;
- is simulated by Canvas size in authoring and preview;
- is not overridden by Core Admin.

Admin has universal Site authorization, not forced visibility on every presentation size. Builder
debug tooling must expose hidden artifacts through size simulation or diagnostics.

## 9. Persistence contract

Viewport persistence uses the common render-block configuration with one canonical `viewportFlags`
integer in the range `0` through `6`, not `MobileOnly`/`DesktopOnly` booleans or parallel per-artifact
columns. Missing and `0` both mean unrestricted; serializers omit the field for the canonical
unrestricted representation.

Audience persistence stores the discriminated policy and its provider/role mask without separate
Base/Custom role fields. Exact SQL ownership belongs to `phi-server`; shared parsers and serializers
must preserve one canonical representation.

For Regions, Layouts, Surfaces, and Widgets the concrete instance policy is the common
`PhiRenderableBlockBase.accessPolicy`. The canonical unrestricted policy is omitted by the shared
serializer. A malformed explicitly persisted policy is denied rather than interpreted as `anyone`.
Module artifact definitions expose their minimum as `accessPolicy`; concrete instances may only
restrict the inherited Area/Page/artifact result.

## 10. Removed target-v1 contracts

The completed migration removes:

- `viewer.roleFlags`;
- the public-runtime distinction between `baseRoleFlags` and `customRoleFlags`;
- `requiredBaseRoleFlags` and `requiredCustomRoleFlags`;
- direct Area compatibility checks based on one `resolvedArea`;
- scattered role-specific rendering branches;
- independent role allowlists inside API guards;
- `MobileOnly` and `DesktopOnly` special flags;
- JavaScript or user-agent device classification for visibility.
- the `dev` Area and `/dev` route host.

No compatibility alias or fallback may keep these paths authoritative in parallel.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
