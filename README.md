Nightfall
=========

cjdns inet auto-peering tracker

While hyperboria was originally designed as friend2friend network, we've decided to allow anonymous peering with the network, too.

It's now possible to have zero-conf hyperboria access even if you don't have peers for ethernet auto-peering near you. To do this, you're connecting to one of the known trackers and ask them for open routers. The tracker will give you some routers near you (if there are any) and some random routers. That's it, you're done.

If you want to help users connect to the network you can announce yourself as open router and people will receive your connection details from the tracker. You don't need a static IP, but you need to be able to receive inbound connections.

The client site implementation is available in [yrd](https://github.com/kpcyrd/yrd)

Trackers
--------

```
http://nf.rxv.cc:7473/promisc/seek/         # maintained by kpcyrd
http://darkcloud.ca:7473/promisc/seek/      # maintained by prurigro
```

Random Trivia
-------------

On hyperboria it's common knowledge only to peer with trusted friends. The name nightfall is a reference to one night stands, a trust relationship between people hardly knowing each other for the sole purpose of not being alone.

The port number 7473 is RISE typed into a cellphone.

License
-------

GPLv3

