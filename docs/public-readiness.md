# Public metadata and release gates

## Implemented

- All 31 public routes have distinct descriptions and titles, stored in `js/content/seo-data.js` and editable through the SEO content model. This includes the local Mesh Explorer, the local identity account check, and the explicitly fictional treasury/deposit previews.
- The metadata route inventory matches the live page catalog, including operator pages and all lifecycle stages.
- Successful browser navigation updates the description, Open Graph title/description/type, and Twitter card/title/description.
- Explicit image and canonical overrides are applied only when they resolve to an absolute HTTP(S) URL. Navigating to a route without an override removes the previous route's image, URL, and canonical link. A missing image uses a summary card rather than an empty large-image card.
- The static HTML supplies the approved home title, description, and text-only social tags before JavaScript runs.
- No production origin, canonical address, social image, or live-performance claim has been invented.

## Not yet a complete public indexing solution

The app currently uses hash routes. A fragment such as `#/lifecycle/receipt` is interpreted by the browser, not sent as a separate page request to the server. Updating tags after JavaScript navigation does not provide distinct server-rendered previews to crawlers that only fetch HTML.

The existing sitemap generator produces path URLs such as `/lifecycle/receipt`. Route-inventory parity verifies completeness of the list, not that the host serves those URLs. Keep `site.baseUrl` blank until the deployment strategy is verified; no sitemap is generated while it is blank.

## Required before release

1. Confirm the production origin and hosting target.
2. Choose either a single-document launch with explicitly limited route indexing, or public path routes backed by static/prerendered page HTML. Merely rewriting every request to the same shell does not produce distinct no-JavaScript social previews.
3. For public path routes, verify direct entry and refresh, route-specific HTML titles/descriptions, canonical URLs, and crawler-visible content for every route.
4. Select and verify public social-image assets before configuring image overrides.
5. Generate sitemap and robots output only after the served URLs match the chosen strategy; verify their URLs against the production host.

## Verification

Run `node tests/seo-content.cjs`, `node tests/page-router.cjs`, and `node tests/routes-live.cjs`.

These cover metadata completeness/uniqueness, static home parity, route inventory, override behavior, removal of stale optional tags, fallback-description isolation, and mounting all 31 routes. They do not prove production hosting or crawler behavior.
