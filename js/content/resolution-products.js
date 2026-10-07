/* =====================================================================
   RESOLUTION PRODUCTS: what exists, and what each audience could get next
   ---------------------------------------------------------------------
   `products` is the shelf of things DEFXN has today. `ready` means it can
   be used now; `building` means it exists in source or as a preview but is
   not released (see docs/status.md). Each resolution names who it is for,
   the problem they actually have, which products already help, and three
   proposed product ideas built on those products. Ideas are proposals:
   the inner page labels them that way and never as shipped.
   ===================================================================== */
var ArkResolutionProducts = (function () {
  'use strict';

  var products = {
    names: { name: '.fxn names', status: 'ready', page: 'account/domains', line: 'A signed name like studio.fxn that points at your site, app or identity.' },
    gateway: { name: 'Site gateway', status: 'ready', page: null, line: 'Opens any .fxn site at label.defxn.com after checking its owner’s signature.' },
    code: { name: 'Code manager', status: 'ready', page: null, line: 'Edit a deployed site’s code and content; access comes from the signed owner record.' },
    packages: { name: 'Mesh packages', status: 'ready', page: null, line: 'Publish and install signed packages from the mesh instead of one registry.' },
    deployer: { name: 'Bundle Deployer', status: 'building', page: 'bundledeployer', line: 'Review a site or app locally, then publish it as one signed bundle.' },
    authkit: { name: 'Auth Kit', status: 'ready', page: 'account', line: 'Your keys and recovery phrase, held by you. No password on a server.' },
    broker: { name: 'Identity broker', status: 'ready', page: null, line: 'Unlock once; every defxn site can ask that one identity to sign.' },
    wallet: { name: 'FXN and credits', status: 'building', page: 'account', line: 'Signed value transfers and usage credits. Balances start at genesis.' },
    agreements: { name: 'Agreement fabric', status: 'ready', page: 'lifecycle', line: 'Partners agree terms, the work runs, both keep a signed receipt.' },
    resolvers: { name: 'Resolvers', status: 'ready', page: 'resolver', line: 'Publish logic at an address so anyone can run it and get the same claim.' },
    explorer: { name: 'Mesh Explorer', status: 'ready', page: 'explorer', line: 'Read any public record on the mesh and check who signed it.' },
    networks: { name: 'Named networks', status: 'ready', page: 'deploy', line: 'Create or join a network by name; it grows as nodes join.' },
    dao: { name: 'Network DAO', status: 'building', page: 'dao', line: 'A roster, a threshold and signed decisions for one network.' },
    monitor: { name: 'Mesh monitor', status: 'ready', page: 'monitor', line: 'Live health, latency and throughput of the nodes you rely on.' },
    treasury: { name: 'Treasury', status: 'building', page: 'treasury', line: 'Shared funds that move only under the group’s agreed rules.' }
  };

  function idea(name, audience, problem, product, builds) {
    return { name: name, audience: audience, problem: problem, product: product, builds: builds };
  }

  var resolutions = {
    WEBSITE: {
      audience: 'Indie makers, small businesses and creators who need a site that does not lapse.',
      problem: 'Hosting bills, yearly renewals and a domain someone else can take away.',
      ready: ['names', 'gateway', 'code', 'packages', 'deployer'],
      ideas: [
        idea('Shopfront.fxn', 'Small shops selling a handful of products', 'Store builders charge monthly and take a cut of every sale.', 'A one-page store under a .fxn name. Checkout is an FXN transfer agreement, so buyer and seller each keep a signed receipt.', ['names', 'gateway', 'agreements', 'wallet']),
        idea('Forever portfolio', 'Designers, photographers and students', 'The portfolio disappears the month the plan is not renewed.', 'Drop a folder in, get a signed site at your name. Each update is a new version; older versions still resolve for anyone who linked them.', ['deployer', 'names', 'gateway']),
        idea('Client preview links', 'Freelancers and small agencies', 'Staging servers and shared passwords for every client review.', 'Every change in the code manager publishes a signed preview at its own name. The client approves by signing, and the approval is on record.', ['code', 'gateway', 'broker'])
      ]
    },
    CONTENT: {
      audience: 'Writers, journalists, newsletter authors and podcasters.',
      problem: 'A platform changes its rules, links break and the archive or audience is gone.',
      ready: ['code', 'gateway', 'names', 'explorer'],
      ideas: [
        idea('Signed newsletter', 'Independent writers', 'The email provider owns the list and can suspend it overnight.', 'Posts publish to the mesh under your name; readers follow your identity, not a provider. Paid issues unlock with an FXN transfer.', ['names', 'gateway', 'authkit', 'wallet']),
        idea('Provenance badge', 'Journalists and researchers', 'Readers cannot tell who wrote a piece or what changed after publication.', 'Each article carries a signed publication record. One click shows the author’s key and every revision since.', ['explorer', 'authkit', 'code']),
        idea('Unpullable podcast feed', 'Podcasters', 'A host deletion or policy strike takes the whole back catalogue offline.', 'The feed resolves from a .fxn name and episodes are addressed files, so any participating node can serve them.', ['names', 'gateway', 'deployer'])
      ]
    },
    FILES: {
      audience: 'Freelancers, families and small teams who share sensitive files.',
      problem: 'Files live in somebody else’s account, and share links leak or expire.',
      ready: ['authkit', 'broker', 'explorer'],
      ideas: [
        idea('Client drop box', 'Accountants, lawyers and consultants', 'Clients email tax returns and contracts as plain attachments.', 'A drop page where files are encrypted to your key before they leave the client’s browser. Both sides get a signed receipt of what was sent.', ['authkit', 'broker', 'agreements']),
        idea('Family vault', 'Households', 'Passports, wills and deeds sit in one person’s cloud folder.', 'Encrypted documents that any two of three family members can open together, so one lost phone does not lose the vault.', ['authkit', 'dao']),
        idea('Big file handoff', 'Video editors and studios', 'Transfer services cap size, expire links and charge per gigabyte.', 'Send a name, not a link. The file arrives in addressed pieces from nearby peers and the receiver verifies every piece.', ['names', 'gateway', 'explorer'])
      ]
    },
    DEPLOYMENTS: {
      audience: 'Developers and small teams shipping web apps and services.',
      problem: 'Release servers, registry accounts and artifacts nobody can verify after the fact.',
      ready: ['deployer', 'packages', 'code', 'resolvers', 'monitor'],
      ideas: [
        idea('Signed release channels', 'Open-source maintainers', 'Users cannot tell whether a download is the build the maintainer made.', 'Stable and beta are names pointing at signed bundles. Installers check the signature before anything runs.', ['packages', 'names', 'authkit']),
        idea('Rollback by name', 'Small product teams', 'A bad deploy means rebuilding the previous version under pressure.', 'Every deploy stays addressable. Rolling back is one signature that points the name at the last good bundle.', ['deployer', 'names', 'gateway']),
        idea('Two-key production', 'Teams with compliance needs', 'Anyone with the deploy token can ship to production alone.', 'Production deploys need two of three maintainer signatures, and the approvals are kept with the release.', ['dao', 'agreements', 'deployer'])
      ]
    },
    PAYMENTS: {
      audience: 'Freelancers, creators and small merchants paid by partners.',
      problem: 'Processor fees, held funds, chargebacks and slow cross-border transfers.',
      ready: ['agreements', 'wallet', 'authkit'],
      ideas: [
        idea('Milestone invoices', 'Freelancers', 'Clients pay late, or dispute work that was already approved.', 'The invoice is an agreement with milestones. Each signed approval releases that part of the payment and leaves a receipt.', ['agreements', 'wallet']),
        idea('Pay per read', 'Writers and API owners', 'Card minimums make small payments impossible, so everything becomes a subscription.', 'Readers spend credits per article or call. No account, no minimum, settled between the two keys.', ['wallet', 'resolvers', 'gateway']),
        idea('Split payouts', 'Bands, collectives and co-authors', 'One person receives the money and has to divide it by hand.', 'Shares are agreed once. Each incoming payment splits by those shares and every payout is on record.', ['agreements', 'wallet', 'explorer'])
      ]
    },
    FINANCE: {
      audience: 'Individuals and households keeping track of their own money.',
      problem: 'Books scattered across apps, exported spreadsheets and nothing that proves a number.',
      ready: ['authkit', 'wallet', 'explorer'],
      ideas: [
        idea('Receipt book', 'Households', 'Tax time means digging through emails and screenshots.', 'Every payment leaves a signed receipt. Your ledger is built from those receipts and exports in one step.', ['wallet', 'agreements', 'authkit']),
        idea('Shared household budget', 'Couples and housemates', 'Shared costs live in one person’s spreadsheet and turn into arguments.', 'Shared expenses are agreed as they happen and settled monthly, with both keys on every entry.', ['agreements', 'wallet']),
        idea('Proof of income', 'Gig workers renting or borrowing', 'Proving income means handing over every bank statement.', 'Share one checked claim, such as earned above a set amount over six months, without exposing each transaction.', ['resolvers', 'explorer', 'authkit'])
      ]
    },
    COMMUNITY: {
      audience: 'Organisers, clubs, fan groups and member organisations.',
      problem: 'The platform owns the member list, rents back the reach and moderates in private.',
      ready: ['authkit', 'broker', 'explorer', 'networks'],
      ideas: [
        idea('Member pass', 'Clubs and associations', 'Membership lives in a database the club pays for and can lose.', 'Membership is a signed record the member holds. Any member site checks it through the broker in one step.', ['authkit', 'broker', 'explorer']),
        idea('Portable following', 'Creators with an audience', 'Moving platforms means starting again from zero followers.', 'Follows are records on the mesh, so the community comes with you to whatever tool you use next.', ['explorer', 'names']),
        idea('Open moderation log', 'Forum and group moderators', 'Bans look arbitrary because nobody can see the rule behind them.', 'Each removal is recorded with the rule it applied, and members can dispute it.', ['dao', 'resolvers', 'explorer'])
      ]
    },
    COMMUNICATIONS: {
      audience: 'Small teams, journalists and families who need private conversations.',
      problem: 'The provider reads the metadata and one account lock-out cuts you off.',
      ready: ['authkit', 'broker', 'names'],
      ideas: [
        idea('Contact by name', 'Anyone', 'Reaching someone privately means swapping phone numbers.', 'Message alex.fxn. The message is encrypted to the keys that name publishes, and nobody in between can read it.', ['names', 'authkit']),
        idea('Source line', 'Newsrooms', 'Tip forms run on servers that log who sent what.', 'A tip page encrypts straight to the newsroom’s key. The source keeps a code to read replies without an account.', ['authkit', 'gateway']),
        idea('Device-linked inbox', 'Small teams', 'A lost laptop keeps access until IT notices.', 'You choose which devices can read the inbox, and revoke one with a single signature from another.', ['authkit', 'explorer'])
      ]
    },
    COLLABORATIONS: {
      audience: 'Agencies and clients, co-founders and open-source contributors.',
      problem: 'Seat licences, one vendor holding the work and arguments over who did what.',
      ready: ['code', 'agreements', 'authkit', 'explorer'],
      ideas: [
        idea('Signed briefs', 'Agencies and their clients', 'Scope creeps because nobody can point to what was agreed.', 'The brief is signed by both sides. Change requests are signed amendments, and delivery ends in a receipt.', ['agreements', 'code']),
        idea('Contribution ledger', 'Co-creators and open-source teams', 'Credit and revenue shares are decided from memory.', 'Every contribution is signed by its author, and shares are calculated from that record.', ['code', 'agreements', 'wallet']),
        idea('Co-edited site', 'Sites with several authors', 'Everyone shares one admin password.', 'Grant each author edit rights to their own section. Every change carries its author’s signature.', ['code', 'authkit', 'broker'])
      ]
    },
    GOVERNANCE: {
      audience: 'Co-ops, associations, DAOs and project steering groups.',
      problem: 'Decisions happen in chat threads and nobody can say who approved what.',
      ready: ['dao', 'agreements', 'explorer', 'authkit'],
      ideas: [
        idea('Proposal kit', 'Co-ops and associations', 'Votes are counted by hand and the outcome is hard to check later.', 'Write the rule, set the threshold, collect signatures. The decision page keeps approvals and activation evidence together.', ['dao', 'explorer']),
        idea('Spending approvals', 'Groups that hold shared funds', 'One treasurer can move the money alone.', 'Spending above a limit needs the agreed number of signatures before the treasury will release it.', ['dao', 'treasury', 'wallet']),
        idea('Bylaws that check themselves', 'Associations with formal rules', 'Invalid proposals reach a vote and get challenged afterwards.', 'The bylaws run as a resolver, so a proposal is checked against them before voting opens.', ['resolvers', 'dao'])
      ]
    },
    INTELLIGENCE: {
      audience: 'Analysts, AI builders and businesses with sensitive data.',
      problem: 'Private data gets sent to remote models and the answers cannot be checked.',
      ready: ['resolvers', 'agreements', 'explorer'],
      ideas: [
        idea('Answers with receipts', 'Analysts and researchers', 'A model answer gives no way to see what it was based on.', 'Each answer cites the signed records it used, so anyone can re-run the check.', ['resolvers', 'explorer']),
        idea('Model beside the data', 'Clinics and law firms', 'Using AI means copying confidential files to a vendor.', 'Agreed logic runs on nodes next to the encrypted records. Only the result leaves, with its evidence.', ['resolvers', 'agreements', 'networks']),
        idea('Paid inference', 'Independent AI builders', 'Selling a model means running billing, keys and accounts.', 'Callers agree terms and pay in credits per verified result. No customer accounts to run.', ['agreements', 'wallet', 'resolvers'])
      ]
    },
    DATA: {
      audience: 'App developers, researchers and public-data publishers.',
      problem: 'Running database servers and sync jobs, with no record of where a value came from.',
      ready: ['explorer', 'resolvers', 'networks', 'monitor'],
      ideas: [
        idea('Backend-less app data', 'Indie app developers', 'A small app still needs a database server and an admin.', 'The app writes signed records and reads them back from the mesh. There is no database to host.', ['explorer', 'authkit', 'broker']),
        idea('Versioned open datasets', 'Researchers and public bodies', 'Datasets change quietly and citations stop matching.', 'Every version has its own address and signature, so a citation always points at the exact data used.', ['explorer', 'names', 'packages']),
        idea('Shared record sync', 'Small businesses with several tools', 'Nightly spreadsheet exports keep tools roughly in sync.', 'Tools read one shared signed record instead of copying data between each other.', ['explorer', 'agreements'])
      ]
    },
    ALGORITHMS: {
      audience: 'Algorithm authors, scientists and API vendors.',
      problem: 'Opaque APIs change silently and results cannot be reproduced.',
      ready: ['resolvers', 'packages', 'explorer'],
      ideas: [
        idea('Resolver marketplace', 'Algorithm authors', 'Selling an algorithm means running an API business.', 'Publish it as a resolver and earn credits per call. Callers pin the exact version they trust.', ['resolvers', 'wallet', 'agreements']),
        idea('Reproducible results', 'Scientists', 'Reviewers cannot rerun the analysis behind a paper.', 'The paper cites the resolver address and input. Anyone reruns it and gets the same claim.', ['resolvers', 'explorer']),
        idea('Open pricing rules', 'Online sellers', 'Platform fee calculations are a black box.', 'Fees run as a named resolver that seller and platform both run and both get the same number.', ['resolvers', 'agreements'])
      ]
    },
    INFORMATION: {
      audience: 'Documentation teams, wikis, fact-checkers and support desks.',
      problem: 'Links break, sources go missing and nobody can see what changed.',
      ready: ['names', 'gateway', 'code', 'explorer'],
      ideas: [
        idea('Docs with history', 'Product and support teams', 'Customers follow an old answer that changed without notice.', 'Docs live at a name; each revision is signed and anyone can compare versions.', ['code', 'gateway', 'names']),
        idea('Source trail', 'Fact-checkers', 'A claim gets repeated until nobody knows where it started.', 'Each claim links to signed statements about its source, back to the original.', ['explorer', 'authkit']),
        idea('Permanent citations', 'Students, lawyers and librarians', 'Cited web pages vanish within a few years.', 'Cite a mesh address instead. It keeps resolving to the exact page that was cited.', ['names', 'gateway'])
      ]
    },
    RULES: {
      audience: 'Compliance teams, marketplace operators and competition organisers.',
      problem: 'The same rule is read differently by each person who applies it.',
      ready: ['resolvers', 'agreements', 'dao'],
      ideas: [
        idea('Eligibility checker', 'Grant and benefit programmes', 'Applicants spend hours on forms they were never eligible for.', 'The criteria run as a resolver. Applicants see pass or fail, and why, before applying.', ['resolvers', 'gateway']),
        idea('Marketplace policy', 'Marketplace operators', 'Sellers argue that listing rules are applied unevenly.', 'Listing rules are applied the same way on every node, and disputes name the exact rule version.', ['resolvers', 'dao', 'explorer']),
        idea('Match rules', 'Tournament and league organisers', 'Results are disputed and settled by whoever runs the event.', 'Published rules check each result, and both teams sign the outcome.', ['resolvers', 'agreements'])
      ]
    },
    NETWORK: {
      audience: 'Communities and companies that want their own network, and the people who run nodes.',
      problem: 'Cloud accounts, fixed clusters and capacity planning before anyone joins.',
      ready: ['networks', 'monitor', 'explorer'],
      ideas: [
        idea('Network in a box', 'Local co-ops and communities', 'Running shared infrastructure needs an IT person.', 'Name a network and invite members’ machines with a link. Capacity grows as they join.', ['networks', 'monitor']),
        idea('Operator earnings', 'Node operators', 'Operators cannot see what their machine contributed or earned.', 'Uptime, load served and payouts, read straight from mesh records.', ['monitor', 'explorer', 'wallet']),
        idea('Event mesh', 'Conferences and festivals', 'Event apps fall over when the venue Wi-Fi does.', 'A temporary network the attendees’ devices form, which closes cleanly when the event ends.', ['networks', 'authkit'])
      ]
    },
    ENCRYPTIONS: {
      audience: 'Professionals handling private information, and anyone who wants their own keys.',
      problem: 'The provider holds the keys, so privacy depends on its policy.',
      ready: ['authkit', 'broker'],
      ideas: [
        idea('Recovery circle', 'Individuals', 'Losing the only copy of a key means losing everything.', 'Recovery is split between people you trust; any three of five can restore your key together.', ['authkit', 'dao']),
        idea('Time-boxed sharing', 'Doctors, lawyers and accountants', 'Shared files stay readable long after the job is done.', 'Encrypt to a recipient for a set window. Access ends with the agreement, and the access is on record.', ['authkit', 'agreements']),
        idea('Access report', 'Small clinics and practices', 'Audits ask who could read what, and nobody can prove it.', 'A checked report of which keys could open which records, and when.', ['authkit', 'explorer', 'resolvers'])
      ]
    },
    AUTOMATION: {
      audience: 'Small businesses and ops teams automating routine work.',
      problem: 'Webhook glue and bots that hold far more access than they need.',
      ready: ['agreements', 'resolvers', 'monitor'],
      ideas: [
        idea('Paid, then delivered', 'Sellers of digital goods', 'Delivery depends on a webhook that sometimes fails.', 'When the payment’s receipt is signed, the download or licence releases on its own.', ['agreements', 'wallet', 'gateway']),
        idea('Scoped bots', 'Teams using bots', 'A bot token can usually do anything its owner can.', 'Each bot key may write to one place only, and one signature revokes it.', ['authkit', 'explorer']),
        idea('Deploy on approval', 'Product teams', 'Someone has to remember to deploy after sign-off.', 'Once the required approvals are signed, the site’s name points at the approved bundle.', ['deployer', 'dao', 'names'])
      ]
    },
    PRODUCTIVITY: {
      audience: 'Freelancers and small teams paying for a stack of tools.',
      problem: 'Per-seat plans, an account per app and work trapped in each one.',
      ready: ['code', 'authkit', 'broker', 'gateway'],
      ideas: [
        idea('One sign-in', 'Small teams', 'Every tool needs its own account and password reset.', 'One identity signs into every mesh tool through the broker. No per-app accounts.', ['broker', 'authkit']),
        idea('Shared task board', 'Freelancers and their clients', 'Status lives in whichever tool the client happens to prefer.', 'Each task is a signed record both sides see, and done means both signed it.', ['agreements', 'explorer']),
        idea('Forms to your records', 'Small businesses', 'Form builders hold your customers’ answers on their servers.', 'A form published at your name; every answer is encrypted to your key.', ['gateway', 'names', 'authkit'])
      ]
    },
    LOGISTICS: {
      audience: 'Small shippers, couriers, importers and makers with suppliers.',
      problem: 'Separate trackers, reconciled spreadsheets and arguments about who had the parcel.',
      ready: ['agreements', 'explorer', 'authkit'],
      ideas: [
        idea('Signed handoffs', 'Couriers and small carriers', 'Lost parcels turn into a dispute about who last had them.', 'Each handoff is signed by both people, so custody has a trail.', ['agreements', 'authkit']),
        idea('Proof of origin', 'Coffee, wine and craft producers', 'Origin claims on the label cannot be checked.', 'A batch record from farm to shelf, readable by scanning the label.', ['explorer', 'gateway', 'names']),
        idea('Pay on delivery', 'Importers and suppliers', 'Either the buyer pays upfront or the supplier waits on trust.', 'Payment releases when the receiver signs the delivery.', ['agreements', 'wallet'])
      ]
    }
  };

  function product(key) {
    var found = products[key];
    return found ? { key: key, name: found.name, status: found.status, page: found.page, line: found.line } : null;
  }
  function forResolution(key) {
    var entry = resolutions[key];
    if (!entry) return null;
    return {
      audience: entry.audience, problem: entry.problem,
      ready: entry.ready.map(product).filter(Boolean),
      ideas: entry.ideas.map(function (item) {
        return { name: item.name, audience: item.audience, problem: item.problem, product: item.product, builds: item.builds.map(product).filter(Boolean) };
      })
    };
  }

  return { products: products, resolutions: resolutions, product: product, forResolution: forResolution };
})();
