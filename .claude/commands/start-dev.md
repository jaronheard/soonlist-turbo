---
name: start-dev
allowed-tools: Bash
description: Start Expo Metro + the rest in the background
---

```bash
WT=$(basename "$PWD")
nohup pnpm dev:expo    > /tmp/${WT}-expo.log 2>&1 &
nohup pnpm dev:no-expo > /tmp/${WT}-web.log  2>&1 &
echo "logs: /tmp/${WT}-{expo,web}.log"
```

Run twice → you get duplicates. `pkill -f "expo start"; pkill -f "turbo dev"` to stop.
