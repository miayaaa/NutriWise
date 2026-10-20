/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // OAuth consent page must never be framed (clickjacking the Allow button).
        source: "/oauth/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ]
  },
}

module.exports = nextConfig
