import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
