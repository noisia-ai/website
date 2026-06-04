# Studio sprint backlog

Last updated: 2026-06-02

## Progress

- In progress: 02 Topic / industry studies without a brand.
- Done in 01 so far:
  - Organizations can be created, edited, and deleted when empty.
  - Organization delete now reports blockers for users, pending invitations, brands, and themes.
  - Brands can be moved between organizations from the Brand OS edit form.
  - Brand OS edit can create a missing destination organization inline and select it immediately.
  - Moving a brand syncs client brand access for the old/new organization.
  - Brands with corpora are archived instead of hard-deleted; empty brands can be hard-deleted.
  - Archived brands can be viewed from Brands and permanently deleted.
  - Permanent brand deletion removes related corpora, mentions, analyses, outputs, access, competitors, memory, and KB rows.
  - Corpora can be archived from the brand detail page.
  - Themes now explain their purpose in the UI and can be archived/deleted from the theme detail page.
  - Archived themes can be permanently deleted through the theme detail action.
  - Sephora duplicate organizations were merged into a single `sephora` organization with 1 brand and 3 corpora.
- Still open in 01:
  - Optional self-serve organization merge UI for future duplicate workspaces.
- Done in 02 so far:
  - New Study wizard can choose between a brand study and an industry/theme study.
  - Industry/theme studies can use an existing Theme or create a new Theme inline.
  - Corpus creation now persists exactly one subject: `brand_id` or `theme_id`.
  - Study brief KB rows support topic studies without a brand.
  - Theme-based corpora resolve their organization metadata when available.
  - Engine upload treats Theme studies as an industry/category corpus: the required primary CSV is `industry`, not `brand`.
  - Reusable peer set added at corpus level: entities can be created/edited/archived, with aliases, handles, query seeds, notes, and category baseline support.
  - CSV uploads can now be attached to a specific corpus entity and keep historical batch attribution.
  - Query composition and query adjustment read active corpus peer entities as competitor seeds.
  - Brand studies can link to an existing industry/theme corpus as a reusable baseline via `base_corpus_id`.
  - Baseline corpora are not copied into brand corpora; Signal corpus browsing and comparative outputs consult both when linked.
  - Query composition can reuse active peer seeds from the linked baseline corpus.
  - T&B comparative dashboard added to Signal outputs with benchmark summary, ownership rankings, and entity/finding matrix.
  - Generic comparative output blocks added for upcoming methodologies: VPM, JFM, Cultural Codes, Influence Architecture, and Decision Velocity.
  - `0019_corpus_entities` and `0020_corpus_reuse_baseline` were applied to the Studio database on 2026-06-02.
- Still open in 02:
  - Manual QA behind Kinde login.
  - Methodology-specific engines still need to populate the generic comparative blocks with richer source data.
  - Drizzle migration ledger still needs a historical cleanup because the database ledger stops at `0003` while later schema changes exist.

## Backlog

01. As an admin, I need to delete organizations, corpora, brands, and related Studio entities.
    - Includes CRUD for brands, organizations, corpora, and similar admin-owned records.
    - Current examples: remove duplicate Sephora-related organizations; move the Novibet study/brand to a different organization.
02. As an admin, I want to create studies from Noisia around a topic without having to associate the study to a brand.
03. As an admin, I want to select an existing corpus and run another study against it.
    - There are more methodologies in the KB that are not implemented yet.
04. `/studio` needs a redesign.
    - It currently only shows recent corpora and should surface more admin/client value.
05. As an admin, I do not understand what the Themes functionality does.
06. As an admin, I want to edit a study brief and rerun the full study.
07. As an admin, I want a redesigned study wizard.
08. As an admin, I want Workspace settings.
09. As a client admin, I want a home designed around the reports I can access.
