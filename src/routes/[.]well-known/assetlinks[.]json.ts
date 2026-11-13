import { createFileRoute } from "@tanstack/react-router";

// Android Digital Asset Links: verifies the BitePay Play Store app so it opens full screen.
const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "tz.co.kgsons.bitepay.www.twa",
      sha256_cert_fingerprints: [
        "AD:68:1C:32:50:98:52:E5:C6:4E:A3:86:0D:F5:5A:58:10:1D:ED:CD:1E:D7:1B:B6:5F:24:72:9F:E2:A3:3D:E9",
      ],
    },
  },
];

export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(ASSET_LINKS, {
          headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
        }),
    },
  },
});
