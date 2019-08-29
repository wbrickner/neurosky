# Work in Progress

A NeuroSky headset API written in modern JavaScript.

This lib probably works out of the box.  I don't own the hardware (yet?).
I wrote this in a night and I don't think I'll use it, so I'll give it away.

# API

```javascript
const NeuroSky = require("neurosky")

main()

function main() {
    const neurosky = new NeuroSky({
        host: "...",
        port: 13854,

        appName: "...",
        appKey: "..."
    })

    neurosky.on("eeg", console.info)
    NeuroSky.connect()
}
```

Check the source for more events, it supports quite a few (everything documented by the manufacturer).