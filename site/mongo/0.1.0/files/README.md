# tarn-mongo

A native, zero-dependency MongoDB client driver written 100% in [Tarn](https://github.com/tarn-lng/tarn).

Implements the MongoDB Wire Protocol (OP_MSG opcode `2013`) and Binary JSON (BSON) serialization directly over native TCP sockets (`stdlib/net`). Does not require libmongoc, C compilers, or native library linking.

## Features

- **100% Pure Tarn**: Implemented purely in safe Tarn systems code over `net.TcpStream`.
- **Zero C Dependencies**: No `libmongoc`, `libbson`, or `--link` required.
- **Full Wire Protocol**:
  - `OP_MSG` (opcode 2013) packet formatting and section parsing.
  - Complete BSON encoder and decoder: Double (`f64`), String (`utf-8`), Embedded Document (`BsonDoc`), Array (`Vec<BsonValue>`), Binary/ObjectId (hex formatted), Boolean, Int32, Int64, and Null.
  - Seamless JSON representation via `doc.to_json()`.
- **Type-Safe High-Level API**:
  - `Config.new(...)` / `Config.default()`
  - `Client.connect(cfg) -> Result<Client, Error>`
  - `Client.ping() -> Result<bool, Error>`
  - `Client.insert_one(&collection, doc) -> Result<void, Error>`
  - `Client.find(&collection, filter) -> Result<Vec<BsonDoc>, Error>`
  - `Client.count_documents(&collection, filter) -> Result<i64, Error>`
  - `Client.delete_many(&collection, filter) -> Result<i64, Error>`
  - `Client.run_command(&cmd) -> Result<BsonDoc, Error>`
  - `Client.drop_collection(&collection) -> Result<void, Error>`
  - `Client.close() -> Result<void, Error>`

## Quick Start

### 1. Run MongoDB in Docker

```bash
docker run -d --name tarn-mongo -p 27017:27017 mongo:7
```

### 2. Code Example

```tarn
import "mongo"

fn main() {
    cfg := mongo.Config.default() // 127.0.0.1:27017, testdb
    var client = try mongo.Client.connect(cfg)

    // Insert a document
    var doc = mongo.BsonDoc.new()
    doc.set_string("name", "Ada Lovelace")
    doc.set_i32("year", 1815)
    doc.set_bool("pioneer", true)
    try client.insert_one(&"scientists", doc)

    // Find documents
    var filter = mongo.BsonDoc.new()
    filter.set_bool("pioneer", true)
    results := try client.find(&"scientists", filter)

    for item in results.as_slice() {
        print(item.to_json())
    }

    try client.close()
}
```

### 3. Installation

Add to your `tarn.toml`:

```toml
[dependencies]
mongo = "0.1.0"
```

Or install via CLI:

```bash
tarn add mongo --registry https://tarn-lng.github.io/registry/
```

## Running the Tests

```bash
tarn run main.tarn
```

## License

MIT / Apache-2.0
