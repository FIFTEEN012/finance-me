This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Data backends

The server-side backend selector is legacy-safe:

- If `DATA_BACKEND` is missing, blank/whitespace-only, or unknown, the existing `legacy` backend remains selected.
- Only an explicit `DATA_BACKEND=postgres` selects the local PostgreSQL backend.
- The local PostgreSQL environment example is [`docs/local-postgres.env.example`](docs/local-postgres.env.example). Copy it to the untracked `.env.local` and replace its placeholders locally; do not commit credentials or tokens.

Selecting PostgreSQL does not silently change the frontend or authentication. Replacing frontend cloud sync, replacing authentication, and importing old data are future, approval-gated phases.

## Gemini quick add

The quick-add dialog can turn short text such as `กาแฟ 85 บาทเมื่อวาน` into editable transaction rows. Create an API key in [Google AI Studio](https://aistudio.google.com/app/apikey), then set `GEMINI_API_KEY` in `.env.local` for local use and in the Vercel project's server-side environment variables for deployment. Restart the development server after setting the key. Do not prefix the variable with `NEXT_PUBLIC_`.

The feature uses `gemini-3.5-flash-lite` and sends the text entered in its AI box, the current date, category names/IDs, and existing tag names to Google. It suggests existing or new tags for each row; tags are added only when selected. It never saves Gemini's suggestions automatically; review the rows and press Save. Google's [unpaid API terms](https://ai.google.dev/gemini-api/terms) advise against submitting sensitive or personal information on the free tier.

## Import portfolio holdings from a screenshot

On the Investments page, **นำเข้าจากภาพ** accepts one PNG, JPEG, or WebP screenshot up to 8 MB. Large images are compressed in the browser to fit Vercel's Function request limit. The image is sent to Gemini for extraction but is not stored in the portfolio. Review, correct, or skip each detected holding before saving. Existing matching holdings are updated to the quantities and prices shown in the image; missing values must be entered manually. This imports a snapshot of holdings and does not create purchase orders or financial transactions.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
