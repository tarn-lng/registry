# tarn-sqlite

Official SQLite driver and safe C FFI bindings for [Tarn](https://github.com/tarn-lng/tarn).

Provides an idiomatic, memory-safe interface to SQLite databases (`:memory:` or on-disk `.db` files) via Tarn's native C FFI (`import "ffi"` and `--link sqlite3`).

## Features

- **Safe High-Level API**: Applications never see raw pointers or `unsafe` blocks.
- **Embedded & In-Memory**: Open persistent local files (`"app.db"`) or ephemeral test databases (`":memory:"`).
- **Flexible Execution**:
  - `open(path)` / `connect(path)`: open database connections.
  - `db.exec(sql)`: execute DDL/DML statements.
  - `db.execute(sql)`: execute DDL/DML and return number of rows changed.
  - `db.query(sql)`: high-level query execution returning `QueryResult` with column names and rows.
  - `db.prepare(sql)`: prepared statements with parameterized bindings (`?1`, `?2`).
- **Parameterized Bindings**:
  - `bind_text(index, value)`
  - `bind_i64(index, value)`
  - `bind_f64(index, value)`
  - `bind_null(index)`
- **Metadata & Inspection**:
  - `last_insert_id()`: retrieve `sqlite3_last_insert_rowid`.
  - `changes()`: retrieve rows affected by the last write.
  - `column_name(index)` and `column_count()`.
  - Type-safe column extraction (`column_text`, `column_i64`, `column_f64`, `column_is_null`).
- **Memory Safety & Resource Management**:
  - Statements and connections are owned, non-`Copy` resources.
  - Uses `sqlite3_close_v2` to prevent dangling references.

## Installation

Add to your `tarn.toml`:

```toml
[dependencies]
sqlite = "0.1.0"
```

Or install via CLI:

```bash
tarn add sqlite --registry https://tarn-lng.github.io/registry/
```

*Note: Linking requires `libsqlite3` present on your system (`--link sqlite3`). On Debian/Ubuntu systems, ensure `libsqlite3-dev` or `libsqlite3.so` is installed.*

## Usage Example

```tarn
import "sqlite"

fn main() {
    var db = try sqlite.open(":memory:")

    // 1. Create table
    try db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, score REAL)")

    // 2. Insert with prepared statement
    var stmt = try db.prepare("INSERT INTO users (name, score) VALUES (?1, ?2)")
    try stmt.bind_text(1, "Alice")
    try stmt.bind_f64(2, 95.5)
    try stmt.run()
    try stmt.finalize()

    print("Last insert ID: " + db.last_insert_id().to_string())

    // 3. Query results
    res := try db.query("SELECT id, name, score FROM users")
    for r in res.rows.as_slice() {
        print(r.get_or(0, "") + " | " + r.get_or(1, "") + " | " + r.get_or(2, ""))
    }

    try db.close()
}
```

## Running

```bash
tarn run main.tarn --link sqlite3
```

## License

MIT / Apache-2.0
