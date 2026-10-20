# tarn-protobuf

Protocol Buffers wire format for [Tarn](https://github.com/tarn-lng/tarn),
written in pure Tarn with no schema compiler and no native code.

```tarn
import "protobuf"

fn encode() Vec<u8> {
    var w = protobuf.Writer.new()
    w.string(1, &"call-123")
    w.bytes(2, &[3]u8{255, 127, 255})
    return w.finish()
}

fn decode(data &[]u8) Result<void, protobuf.Error> {
    var cursor = usize(0)
    for {
        match try protobuf.next(data, &mut cursor) {
            Some(field) => {
                if field.number == 1 { print(try field.string(data)) }
                // Unknown fields are skipped, as proto3 requires.
            }
            None => { return Ok(()) }
        }
    }
}
```

- `Writer`: `uint64`, `uint32`, `int64`, `int32` (negatives as 10-byte
  varints), `sint64` (zigzag), `bool`, `fixed32`, `fixed64`, `bytes`,
  `string`, `message` (nested Writer).
- `next(data, &mut cursor)` returns a Copy `Field` (number, wire type, scalar
  value or payload range); accessors check the wire type and `bytes`/`string`
  slice the payload from the input you pass. Nothing stores a borrowed slice.
- Errors: `Truncated`, `VarintOverflow`, `InvalidWireType` (groups are not
  supported), `InvalidFieldNumber`, `InvalidUtf8`, `WrongWireType`.

`tarn test` runs the vectors from the official encoding guide plus malformed
input cases.
