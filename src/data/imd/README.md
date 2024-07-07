# IMD Parser

Since we only use the data from IMD's `cityweather_loc` API endpoint, the data is static and is updated only once in a day so we are going to run a cron via GitHub actions, download and commit the latest JSON to repo and redeploy.