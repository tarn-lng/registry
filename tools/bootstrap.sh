#!/bin/sh
set -eu
# Trusted compiler revision, never selected by package metadata.
REVISION=9fecc88df07b198e8caf735c1b6d0f20f981bd23
mkdir -p build
if [ ! -d build/compiler/.git ]; then
    git init build/compiler
    git -C build/compiler remote add origin https://github.com/tarn-lng/tarn.git
fi
git -C build/compiler fetch --depth 1 origin "$REVISION"
git -C build/compiler checkout --detach FETCH_HEAD
cargo build --locked --release -p tarn --manifest-path build/compiler/Cargo.toml
