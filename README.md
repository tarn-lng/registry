# Tarn registry

Experimental static source registry for Tarn, independent of the compiler.
Origin: https://tarn-lng.github.io/registry/ (once Pages is deployed).

## Consume

```sh
tarn init application
cd application
tarn add dbus --registry https://tarn-lng.github.io/registry/
tarn build --link dbus-1
```

Import `dbus`, not a versioned path. Commit tarn.toml and tarn.lock. Use `tarn
fetch` on another machine. Builds stay offline and do not rewrite locks.
The initial dbus 0.1.0 release is experimental; native libdbus-1 linking remains
an explicit consumer grant. Registry inclusion does not imply code is safe.

## Publish through a reviewed pull request

1. Create a library with tarn init NAME --lib; set a new SemVer version.
2. Run the compiler and the library's own tests locally.
3. Run tarn publish --registry /tmp/my-registry to generate release bytes.
4. Fork this repository and copy the generated NAME directory into site/.
   For an existing package, preserve all older versions and extend index.json.
5. Propose ownership/repository metadata in owners.json for a new name.
6. Open a PR explaining provenance, source commit, validation and native links.

Only maintainers approve ownership and publication. Owning a GitHub fork or
passing CI does not establish package ownership. Ownership transfers and changes
to workflows/validator/owners require explicit human review. Do not replace,
delete or edit an existing release. Publish a new version for corrections.
CLI authenticated network publication, signatures, yanking and accounts are not
implemented. This repository is a reviewed bootstrap, not an open upload API.

## Validation/deployment

The tools/registry.tarn program validates identities, inventories, duplicate JSON
keys, per-file SHA-256 and Tarn source hashes. It also rejects changes to release
bytes tracked by a supplied Git base commit. SHA-256 uses the system sha256sum
tool with explicit argument separation; validation never uses Python.

Run TARN=/absolute/path/to/tarn tools/test.sh. CI builds a pinned compiler revision,
then compiles the Tarn validator, runs tampering/duplicate-key/symlink/immutable
release tests and generates build/catalog.json. Deployment places that generated
catalog at site/catalog.json. Generated metadata is not publisher provenance. CI never compiles, imports or executes package source/hooks.
PR jobs have read-only permissions and no deployment secrets. Deployment runs
only from main and publishes site/ as static bytes. Protect main and require
review of CI changes; the workflow cannot substitute for that policy.

GitHub Pages is the initial free host so no new cloud account is necessary. The
same site/ tree can later move to Cloudflare/Firebase. Existing locks bind their
origin; a hosting migration requires explicit updates or preserving the URL.
There is no default registry change in the compiler in this project.

Advisories and signed provenance are currently unknown: do not add an empty
advisory list to pretend that security review succeeded.

## Language website and package metadata

The registry landing page now includes the language guide and package search.
The independent official website is https://tarn-lng.github.io/website/.
Canonical language documentation stays in tarn-lng/tarn.

Add package descriptions and explicit native-link requirements to
catalog-metadata.json. The generator emits catalog entries only for validated
release records. It does not run package programs or manufacture safety badges.

Bootstrap dependencies are a pinned Tarn compiler source revision, Rust/C build
tools, Git, find and sha256sum. The package registry protocol and immutable
release files are unchanged.
