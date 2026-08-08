const DEFAULT_URL =
  "http://103.165.93.31:8095/starJalsha/tracks-v1a1/mono.m3u8";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);
    const targetUrl =
      requestUrl.searchParams.get("url") || DEFAULT_URL;

    const response = await fetch(targetUrl);

    if (!response.ok) {
      return new Response(
        `Upstream error: ${response.status}`,
        {
          status: response.status,
          headers: corsHeaders,
        }
      );
    }

    let body = await response.text();

    // Rewrite HLS playlist URLs
    if (
      targetUrl.includes(".m3u8") ||
      response.headers
        .get("content-type")
        ?.includes("mpegurl")
    ) {
      const baseUrl = new URL(targetUrl);

      body = body
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();

          if (!trimmed || trimmed.startsWith("#")) {
            return line;
          }

          try {
            const absoluteUrl = new URL(
              trimmed,
              baseUrl
            ).href;

            return `${requestUrl.origin}${requestUrl.pathname}?url=${encodeURIComponent(
              absoluteUrl
            )}`;
          } catch {
            return line;
          }
        })
        .join("\n");
    }

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type":
          response.headers.get("content-type") ||
          "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return new Response(
      `Proxy error: ${error instanceof Error ? error.message : String(error)}`,
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
