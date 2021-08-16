### Preamble

Personally I find the instructions in Caddy's [official Getting Started](https://caddyserver.com/docs/getting-started) guide to be... terrible. They overcomplicate a rather easy process and I just can't figure out why. This guide is my much easier instructions that I suggest any Caddy beginner or anyone looking for a simple configuration to use.

This guide will configure Caddy to: automatically register and renew HTTPS certificates for your domain; redirect HTTP requests to HTTPS; and redirect `www.` to non-`www.`.

### Requirements

- A Debian/Ubuntu-based Linux server
- An existing Express.js app
- `root` command line access (and a basic understanding of using a terminal)
- A domain name with A and AAAA records pointing towards your server

### Step 1 - Remove or disable existing webservers

If you want to remove any existing webservers, run the following command:

```bash
$ sudo apt remove apache2 nginx nginx-common lighttpd
```

This will remove Apache, Nginx, and lighttpd.

Instead, if you just want to disable these, run these commands:

```bash
$ sudo systemctl stop apache2 nginx lighttpd
$ sudo systemctl disable apache2 nginx lighttpd
```

This will stop any running webservers and disable them from running on startup.

### Step 2 - Install Caddy

Run these commands to install Caddy:

```bash
$ sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
$ curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo apt-key add -
$ curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee -a /etc/apt/sources.list.d/caddy-stable.list
$ sudo apt update
$ sudo apt install caddy
```

Confirm that Caddy was installed by running this command:

```bash
$ systemctl status caddy
```

The status does not matter, just make sure it is able show any status for Caddy. If it doesn't detect any Caddy service, re-do Step 2.

### Step 3 - Ignore the official guide

The official Getting Started guide tells us:

> If you installed Caddy from a package manager, Caddy might already be running as a service. If so, please stop the service before doing this tutorial.

But why? The existing service file has a good set of defaults and uses the easy to locate `/etc/caddy/Caddyfile` as the config. The official guide makes Caddy's installation and configuration more complex than it needs to be.

With that out of the way, we will move on to configuring Caddy as a reverse proxy.

### Step 4 - Configure Caddy as a reverse proxy

First off, make sure your Express app is running and make a note of the port it is listening on.

Run these commands to start with a fresh Caddyfile (you may use any preferred editor in place of Nano):

```bash
$ sudo mv /etc/caddy/Caddyfile /etc/caddy/Caddyfile.default
$ sudo nano /etc/caddy/Caddyfile
```

While there is a [large number of options for the Caddyfile](https://caddyserver.com/docs/caddyfile), the sample config I'll provide is the most basic config to get a reverse proxy for Express. You may add any other options or modify this config if you need to.

Make sure to replace `example.com` with your actual domain and replace `3000` with your Express app's port.

```
# Config for example.com
example.com {
    reverse_proxy localhost:3000
}
www.example.com {
    redir https://example.com{uri}
}
```

What do these lines actually do?

- `# Config for example.com` is a comment. Comments in Caddy start with `#` and can be on their own line or the end of a config line.
- `example.com {` and `www.example.com {` tell Caddy to listen for requests with under those domains. By ommitting a port such as `80` or `443`, Caddy automatically configures that domain to use HTTPS and redirect HTTP to HTTPS.
- `reverse_proxy localhost:3000` will forward any requests to the service running on `localhost:3000`.
- `redir https://example.com{uri}` will redirect `www.` requests to non-`www.`. This is purely up to your personal preference; if you want to use `www.`, use the aforementioned `reverse_proxy ...` rule instead of `redir`.

### Step 5 - Restart Caddy

**Wait!** Normally when you edit the config, you will use the following command:

```bash
$ sudo systemctl reload caddy
```

This will reload the Caddyfile with zero downtime. However, as of right now Caddy may not be running so there may not be anything to reload! For now, run this command:

```bash
$ sudo systemctl restart caddy
```

Lastly, **wait** about a minute or two for Caddy to acquire HTTPS certificates. Then go to your domain in your browser and if all went to plan, you should see your Express app.

# Conclusion

Hopefully this guide helped you set up Caddy as an easy reverse proxy for Express! Now make sure to hit that like button and subscri- uh I mean...