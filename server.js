Bun.serve({
  port: 4000,
  development: true,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/public/out.js") {
      return new Response(Bun.file("./public/out.js"));
    }

    return new Response(Bun.file("./public/index.html"));
  },
});

console.log("Server running on http://localhost:4000");
