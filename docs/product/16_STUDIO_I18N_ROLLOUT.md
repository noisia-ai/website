# Studio i18n rollout

## Decision

Studio uses `next-intl` without URL locale prefixes. This keeps private routes stable:

- `/studio`
- `/studio/brands`
- `/signal/[outputId]`

Marketing can use SEO-oriented locale routes later if needed, but Studio should not expose
`/es/studio` or `/en/studio` unless there is a hard product reason.

## Locale Resolution

Resolution order:

1. `users.preferences.locale`
2. `noisia_locale` cookie
3. `Accept-Language`
4. `es-MX`

The request provider can read cookie/browser language immediately. User preference is synced
into the cookie during `/auth/continue` and every time the user changes language in the profile
surface.

## Supported Locales

- `es-MX` default
- `en-US`

Keep Mexican Spanish as the product voice for internal Noisia operations. English should be
clean, direct, and product-grade, not literal.

## UX Rules

- The language switcher lives in the user/session surface.
- The unauthenticated access screen may also expose language before Kinde in a future pass.
- Interface language is not the same as report language.
- Signal outputs should eventually store `payload.locale` or `manifest.output_language`.
- Study Brief should eventually include `output_language` for Claude-generated deliverables.

## Implementation Notes

Core files:

- `apps/studio/src/i18n/locales.ts`
- `apps/studio/src/i18n/request.ts`
- `apps/studio/messages/es-MX.json`
- `apps/studio/messages/en-US.json`
- `apps/studio/src/app/actions/locale.ts`
- `apps/studio/src/components/i18n/LocaleSwitcher.tsx`

Rollout order:

1. Auth/access screens and shell navigation.
2. Studio home, Brands, Themes, New Brand, New Study.
3. Engine Wizard, CSV import, corpus review, mentions browser.
4. T&B analysis review and Signal composer.
5. Signal client report UI.
6. Claude prompt inputs and published output language metadata.

## Product Guardrail

Never translate stored evidence automatically. Verbatims, citations, CSV source labels, and raw
mention text must remain in the source language unless a future explicit translation layer stores
both original and translated text side by side.
