# Flame 🔥

**Flame** is a fast, lightweight and expressive web framework for the [Tarn](https://github.com/tarn-lng/tarn) programming language, inspired by **Fiber** (Go) and **Express** (Node.js).

Designed for modern microservices and high-throughput HTTP APIs, Flame provides first-class developer ergonomics without sacrificing Tarn's zero-overhead memory safety and predictable native performance.

---

## Features

- **🚀 Ergonomic Routing:** Expressive route registration (`get`, `post`, `put`, `delete`, `patch`, `options`, `head`).
- **🎯 Dynamic Path Parameters:** Extract URL parameters (`/users/:id`, `/posts/:category/:slug`).
- **🌐 Wildcard & Catch-All Routes:** Support for file serving or catch-all patterns (`/static/*filepath`).
- **🔍 Query Parameter Parsing:** Automatic query string extraction (`/search?q=tarn&page=1` via `c.query("q")`).
- **📦 Route Groups:** Nest and organize routes cleanly (`api := flame.group("/api/v1")` and `app.mount(api)`).
- **🛡️ Middleware Pipeline:** Global middleware chaining (`app.use(...)`) with built-in `flame.logger` and `flame.cors`.
- **🔒 Route Guards:** Decorate individual routes with targeted middlewares using `flame.guard(auth_mw, handler)`.
- **⚡ Native Performance:** Powered by Tarn's standard library non-blocking HTTP engine with zero garbage collector pauses.

---

## Installation

Add `flame` to your `tarn.toml`:

```toml
[dependencies]
flame = "0.1.0"
```

Or install using the Tarn CLI:

```bash
tarn add flame
```

---

## Quickstart

```tarn
import "flame"
import "io"

fn main() Result<void, io.Error> {
    var app := flame.new()

    // 1. Global Middlewares
    app.use(flame.logger)
    app.use(flame.cors)

    // 2. Simple Routes
    app.get("/", fn(c &mut flame.Ctx) Result<void, flame.Error> {
        return c.text(200, &"🔥 Welcome to Flame on Tarn!")
    })

    // 3. Dynamic Path Parameters
    app.get("/users/:id", fn(c &mut flame.Ctx) Result<void, flame.Error> {
        id := c.param(&"id")
        return c.json(200, "{\"id\": " + id + ", \"name\": \"Cesar\"}")
    })

    // 4. Query Parameters
    app.get("/search", fn(c &mut flame.Ctx) Result<void, flame.Error> {
        q := c.query(&"q")
        page := c.query(&"page")
        return c.json(200, "{\"query\": \"" + q + "\", \"page\": \"" + page + "\"}")
    })

    // 5. POST with Request Body
    app.post("/echo", fn(c &mut flame.Ctx) Result<void, flame.Error> {
        body := c.body_string()
        return c.text(200, &body)
    })

    // 6. Route Groups
    var api := flame.group("/api/v1")
    api.get("/health", fn(c &mut flame.Ctx) Result<void, flame.Error> {
        return c.json(200, "{\"status\": \"healthy\"}")
    })
    app.mount(api)

    // 7. Start Server
    addr := "127.0.0.1:3000"
    print("🔥 Flame running at http://" + addr + "\n")
    return app.listen(&addr)
}
```

---

## Route Groups

Organize complex APIs modularly with Route Groups:

```tarn
var api := flame.group("/api/v1")

var users := flame.group("/users")
users.get("/:id", get_user)
users.post("/", create_user)

api.mount(users)
app.mount(api)
```

---

## Middleware & Route Guards

### Global Middlewares

Middlewares receive `&mut flame.Ctx` and return a `bool`. Returning `false` short-circuits the request pipeline immediately.

```tarn
fn custom_header_mw(c &mut flame.Ctx) bool {
    c.set_header("x-powered-by", "Tarn Flame")
    return true
}

app.use(custom_header_mw)
```

### Route Guards

Wrap sensitive routes with targeted guards:

```tarn
fn require_auth(c &mut flame.Ctx) bool {
    match c.header(&"authorization") {
        Some(token) => {
            if token == "Bearer secret-token" {
                return true
            }
        }
        None => {}
    }
    match c.json(401, "{\"error\": \"Unauthorized\"}") {
        Ok(v) => {}
        Err(e) => {}
    }
    return false
}

app.get("/admin/dashboard", flame.guard(require_auth, fn(c &mut flame.Ctx) Result<void, flame.Error> {
    return c.json(200, "{\"admin\": true}")
}))
```

---

## Context (`flame.Ctx`) API

| Method | Description |
|---|---|
| `c.method()` | Returns the HTTP method (`GET`, `POST`, etc.) |
| `c.path()` | Returns the requested URL path |
| `c.param(&"id")` | Retrieves a matched path parameter |
| `c.query(&"page")` | Retrieves a query string parameter |
| `c.header(&"user-agent")` | Retrieves an incoming HTTP header |
| `c.body()` | Returns the raw request body as `&[]u8` |
| `c.body_string()` | Returns the request body decoded as UTF-8 string |
| `c.status(200)` | Sets the HTTP response status code |
| `c.set_header("name", "val")` | Adds a response header |
| `c.text(200, &"msg")` | Sends a plain text response (`text/plain; charset=utf-8`) |
| `c.json(200, "{}")` | Sends a JSON response (`application/json`) |
| `c.html(200, &"<h1>...</h1>")` | Sends an HTML response (`text/html; charset=utf-8`) |
| `c.bytes(200, "mime", data)` | Sends an arbitrary byte response |
| `c.send_status(204)` | Sends an empty body with status code |
| `c.redirect(302, &"/login")` | Sends an HTTP redirect |

---

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
