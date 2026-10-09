#!/usr/bin/env python3
"""Validate registry bytes; never import or execute package code."""
import argparse
import hashlib
import json
import re
import struct
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SITE=ROOT/'site'
NAME=re.compile(r'[a-z][a-z0-9_]{0,63}\Z')
VERSION=re.compile(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\Z')
def require(condition,message):
    if not condition:raise ValueError(message)
def load(path):
    require(path.stat().st_size<=4*1024*1024,f'too large: {path}')
    def pairs(items):
        result={}
        for k,v in items:
            require(k not in result,f'duplicate JSON key {k}')
            result[k]=v
        return result
    return json.loads(path.read_text(),object_pairs_hook=pairs)
def validate(base=None):
    require(not any(p.is_symlink() for p in SITE.rglob('*')),'symlinks forbidden')
    owners=load(ROOT/'owners.json')
    for directory in SITE.iterdir():
        if not directory.is_dir():continue
        name=directory.name
        require(NAME.fullmatch(name),f'invalid package {name}')
        require(name in owners and owners[name]['maintainers'],f'missing ownership: {name}')
        index=load(directory/'index.json')
        require(isinstance(index,list) and len(index)<=512 and len(index)==len(set(index)),f'invalid index {name}')
        require(set(index)=={p.name for p in directory.iterdir() if p.is_dir()},f'index inventory mismatch {name}')
        for version in index:
            require(VERSION.fullmatch(version),f'invalid version {version}')
            release_dir=directory/version
            record=load(release_dir/'release.json')
            require(set(record)=={'schema','name','version','hash','entry','published','dependencies','files'},'unknown release fields')
            require(record['schema']==1 and record['name']==name and record['version']==version,'release identity mismatch')
            require(type(record['published']) is int and record['published']>=0,'invalid timestamp')
            require(isinstance(record['dependencies'],dict),'invalid dependencies')
            files=record['files'];require(isinstance(files,dict) and 0<len(files)<=1024,'invalid file count')
            require(record['entry'] in files and 'tarn.toml' in files,'entry/manifest missing')
            actual={p.relative_to(release_dir/'files').as_posix() for p in (release_dir/'files').rglob('*') if p.is_file()}
            require(actual==set(files),'source inventory mismatch')
            aggregate=hashlib.sha256(b'Tarn package source v1\0');total=0
            for relative in sorted(files):
                path=Path(relative)
                require(not path.is_absolute() and all(x not in ('..','.') and not x.startswith('.') for x in path.parts),'unsafe source path')
                require(len(path.parts)<=32,'path too deep')
                data=(release_dir/'files'/path).read_bytes();data.decode('utf-8');total+=len(data)
                require(len(data)<=4*1024*1024 and total<=32*1024*1024,'source size limit')
                require(hashlib.sha256(data).hexdigest()==files[relative],f'file hash mismatch {relative}')
                encoded=relative.encode();aggregate.update(struct.pack('<Q',len(encoded)));aggregate.update(encoded)
                aggregate.update(struct.pack('<Q',len(data)));aggregate.update(data)
            require(aggregate.hexdigest()==record['hash'],'aggregate hash mismatch')
    if base:
        tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',base,'--','site'],cwd=ROOT,text=True).splitlines()
        for name in tracked:
            if '/files/' in name or name.endswith('/release.json'):
                previous=subprocess.check_output(['git','show',f'{base}:{name}'],cwd=ROOT)
                require((ROOT/name).is_file() and (ROOT/name).read_bytes()==previous,f'published bytes changed: {name}')
            elif name.endswith('/index.json'):
                old=json.loads(subprocess.check_output(['git','show',f'{base}:{name}'],cwd=ROOT))
                require(set(old)<=set(load(ROOT/name)),f'published version removed: {name}')
    print('PASS: registry identities, inventory, hashes and release immutability')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--base');args=parser.parse_args();validate(args.base)
