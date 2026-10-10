# tarn-redis

A native, zero-dependency Redis client driver written 100% in [Tarn](https://github.com/tarn-lng/tarn).

Implements the REdis Serialization Protocol (RESP) directly over native TCP sockets (`stdlib/net`). Zero C dependencies, no libhiredis, and no external linking required.

## Features

- **100% Pure Tarn**: Implemented purely in safe Tarn systems code over `net.TcpStream`.
- **Zero C Dependencies**: No `libhiredis`, no `--link`.
- **Buffered RESP Parser**: High-performance buffered reader supporting:
  - Simple Strings (`+`)
  - Errors (`-`)
  - Integers (`:`)
  - Bulk Strings (`$`) with NULL support (`$-1`)
  - Arrays (`*`) with recursive element parsing
- **Data Structures Supported**:
  - **Connection**: `ping()`, `echo()`, `close()`
  - **Strings / KV**: `set()`, `set_ex()`, `get()`, `del()`, `exists()`, `incr()`, `decr()`, `incr_by()`
  - **Hashes**: `hset()`, `hget()`, `hdel()`, `hlen()`
  - **Lists**: `lpush()`, `rpush()`, `lpop()`, `rpop()`, `llen()`, `lrange()`
  - **Sets**: `sadd()`, `srem()`, `sismember()`, `scard()`, `smembers()`

## Quick Start

### 1. Run Redis in Docker

```bash
docker run -d --name tarn-redis -p 6379:6379 redis:7-alpine
```

### 2. Code Example

```tarn
import "redis"

fn main() {
    cfg := redis.Config.default() // 127.0.0.1:6379
    var client = try redis.Client.connect(cfg)

    // Key-Value operations
    try client.set(&"greeting", &"Hello Tarn Redis!")
    match try client.get(&"greeting") {
        Some(msg) => { print(msg) }
        None => {}
    }

    // Atomic Counters
    counter := try client.incr(&"hits")
    print("Hits: " + string.from_i64(counter))

    // Lists (Queue / Stack)
    try client.rpush(&"queue", &"job-1")
    try client.rpush(&"queue", &"job-2")
    job := try client.lpop(&"queue")

    // Sets
    try client.sadd(&"tags", &"systems")
    try client.sadd(&"tags", &"fast")
    is_fast := try client.sismember(&"tags", &"fast")

    try client.close()
}
```

### 3. Installation

Add to your `tarn.toml`:

```toml
[dependencies]
redis = "0.1.0"
```

Or install via CLI:

```bash
tarn add redis --registry https://tarn-lng.github.io/registry/
```

## Running the Tests

```bash
tarn run main.tarn
```

## License

MIT / Apache-2.0
