# Nighfall Init Services

This folder contains service files that can be used for nightfall

## Systemd

The **systemd** service file is `nightfall.service`

### Notes

* To install the service, copy the service file to: `/etc/systemd/system` and run: `systemctl daemon-reload`
* The service is run by the **nightfall** user, which can be added by running: `useradd -d / -s /usr/bin/nologin nightfall`
* The service expects the **nightfall.js** script to be installed to: `/usr/bin/nightfall`
