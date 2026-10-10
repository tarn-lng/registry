# tarn-mysql

A native, zero-dependency MySQL and MariaDB client driver written 100% in [Tarn](https://github.com/tarn-lng/tarn).

Implements the MySQL Client/Server Wire Protocol directly over native TCP sockets (`stdlib/net`). Does not require `libmysqlclient`, C compilers, or native library linking.

## Features

- **100% Pure Tarn**: Implemented purely in safe Tarn systems code over `net.TcpStream`.
- **Zero C Dependencies**: No `libmysqlclient-dev`, `mariadb-client`, or `--link` required.
- **Wire Protocol Implementation**:
  - HandshakeV10 packet parsing and capability negotiation.
  - Native SHA-1 implementation with `mysql_native_password` authentication scrambling.
  - `COM_QUERY` command execution.
  - Full Resultset decoding: column definitions, metadata, text row values, and NULL handling.
  - Session termination via `COM_QUIT`.
- **Type-Safe API**:
  - `Config.new(...)` / `Config.default()`
  - `Client.connect(Config) -> Result<Client, Error>`
  - `Client.execute(&string) -> Result<string, Error>` for DDL / DML commands (`CREATE`, `INSERT`, `UPDATE`, `DELETE`).
  - `Client.query(&string) -> Result<QueryResult, Error>` for row data and column metadata.
  - `Client.close() -> Result<void, Error>` for clean session termination.

## Quick Start

### 1. Run MariaDB or MySQL in Docker

```bash
docker run -d --name tarn-mysql -p 3306:3306 \
  -e MARIADB_ROOT_PASSWORD=testpass \
  -e MARIADB_DATABASE=testdb \
  mariadb:11
```

### 2. Code Example

```tarn
import "lib"

fn main() {
    cfg := lib.Config.default() // 127.0.0.1:3306, user: root, password: testpass, db: testdb
    var client = try lib.Client.connect(cfg)

    // Execute DDL
    try client.execute(&"CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100));")

    // Insert data
    try client.execute(&"INSERT INTO users (name) VALUES ('Ada Lovelace'), ('Alan Turing');")

    // Query rows
    res := try client.query(&"SELECT id, name FROM users ORDER BY id;")
    for r in res.rows.as_slice() {
        print(r.get_or(usize(0), "?") + " - " + r.get_or(usize(1), "?"))
    }

    try client.close()
}
```

### 3. Run the Demo

```bash
tarn run main.tarn
```

## License

MIT / Apache 2.0.
