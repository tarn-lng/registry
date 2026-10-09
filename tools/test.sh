#!/bin/sh
set -eu
ROOT=$(pwd)
: "${TARN:=tarn}"
mkdir -p build
"$TARN" build tools/registry.tarn -o build/registry
./build/registry "${BASE:-}"
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
cp -R site "$TEST_DIR/site"
cp owners.json catalog-metadata.json "$TEST_DIR/"
mkdir "$TEST_DIR/build"
(cd "$TEST_DIR"; "$ROOT/build/registry")
printf '\n// tampered\n' >> "$TEST_DIR/site/dbus/0.1.0/files/src/dbus.tarn"
if (cd "$TEST_DIR"; "$ROOT/build/registry" > build/failure.log 2>&1); then
    echo 'FAIL: modified source accepted' >&2
    exit 1
fi
rg 'Source hash mismatch' "$TEST_DIR/build/failure.log"
cp site/dbus/0.1.0/files/src/dbus.tarn "$TEST_DIR/site/dbus/0.1.0/files/src/dbus.tarn"
printf '{"dbus":{},"dbus":{}}\n' > "$TEST_DIR/owners.json"
if (cd "$TEST_DIR"; "$ROOT/build/registry" > build/failure.log 2>&1); then
    echo 'FAIL: duplicate JSON key accepted' >&2
    exit 1
fi
rg 'Duplicate JSON key' "$TEST_DIR/build/failure.log"
echo 'PASS: Tarn validator positive and negative contracts'
cp owners.json "$TEST_DIR/owners.json"
ln -s /etc/hosts "$TEST_DIR/site/dbus/0.1.0/files/forbidden"
if (cd "$TEST_DIR"; "$ROOT/build/registry" > build/failure.log 2>&1); then
    echo 'FAIL: symlink accepted' >&2
    exit 1
fi
rg 'Registry symlinks forbidden' "$TEST_DIR/build/failure.log"
rm "$TEST_DIR/site/dbus/0.1.0/files/forbidden"
(cd "$TEST_DIR"; git init -q; git add site; git -c user.name=Test -c user.email=test@example.invalid commit -qm baseline)
sed -i 's/"published": [0-9]*/"published": 1/' "$TEST_DIR/site/dbus/0.1.0/release.json"
if (cd "$TEST_DIR"; "$ROOT/build/registry" HEAD > build/failure.log 2>&1); then
    echo 'FAIL: published metadata replacement accepted' >&2
    exit 1
fi
rg 'Published bytes changed' "$TEST_DIR/build/failure.log"
echo 'PASS: symlinks and release replacement rejected'
