# About Laravel Biosphere
**Laravel Biosphere** is a third-party package for realtime bi-directional communication
between a server and a client.

## Why not Laravel Reverb
[**Laravel Reverb**](https://reverb.laravel.com) is a nice package, however it is not truly
bi-directional out of the box. Server can send messages to clients, clients can 'whisper' messages to other clients,
however you cannot send a message from a client to a server without some ugly workarounds, such as
using an underlying Echo backend, which can (and will) eventually break on backend change.

On the other hand, Biosphere is a true WebSocket solution, supporting sending messages both from a client, and from a server.

